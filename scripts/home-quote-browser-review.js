async (page) => {
  const check = (value, message) => { if (!value) throw new Error(message); };
  const results = [];
  const dialog = () => page.getByRole('dialog', { name: 'Home Quote Information', exact: true });
  const view = name => dialog().getByRole('group', { name: 'Quote workspace view' }).getByRole('button', { name, exact: true }).click();
  const section = async (index, name) => {
    if (await page.getByLabel('Interview section', { exact: true }).isVisible()) await page.getByLabel('Interview section', { exact: true }).selectOption(String(index));
    else await page.getByRole('button', { name: `${index + 1}. ${name}`, exact: true }).click();
  };
  const fit = async name => {
    const layout = await dialog().evaluate(node => {
      const scroll = node.querySelector('.modal-content');
      return { width: innerWidth, pageOverflow: document.documentElement.scrollWidth > innerWidth + 1, modalOverflow: scroll.scrollWidth > scroll.clientWidth + 1,
        smallTargets: [...node.querySelectorAll('button, select, input:not([type=checkbox]):not([type=file])')].filter(element => element.getClientRects().length && element.getBoundingClientRect().height < 43).map(element => element.textContent || element.id) };
    });
    check(!layout.pageOverflow && !layout.modalOverflow, name + ': horizontal overflow');
    check(!layout.smallTargets.length, name + ': small controls ' + layout.smallTargets);
    results.push({ name, ...layout });
  };
  await page.setViewportSize({ width: 1440, height: 1000 });
  if (!(await dialog().count())) {
    await page.getByRole('button', { name: 'Real Estate', exact: true }).click();
    await page.getByRole('searchbox', { name: 'Property address', exact: true }).fill('800 Creekwood Rd, Sanford, NC 27330');
    await page.getByRole('button', { name: 'Quote Information', exact: true }).click();
  }
  await page.unroute('**/api/home-quote');
  await view('Property');
  const cancelResearch = page.getByRole('button', { name: 'Cancel', exact: true });
  if (await cancelResearch.isVisible()) await cancelResearch.click();
  await page.getByRole('button', { name: 'Retry research', exact: true }).click();
  await page.getByLabel('I checked the address and parcel; this is the correct home.').waitFor();
  await view('Interview');
  await section(0, 'Applicant');
  await page.getByLabel('Homeowner / named insured').fill('SYNTHETIC TEST - NOT A CUSTOMER');
  await page.getByLabel('Date of birth', { exact: false }).first().fill('1980-02-20');
  await page.getByLabel('Email', { exact: true }).fill('synthetic@example.com');
  await page.getByLabel('I checked the address and parcel; this is the correct home.').check();
  await section(1, 'Home');
  await page.getByLabel('Year built (prospect confirmation)').fill('1999');
  await page.getByLabel('How is the home used?').selectOption('Primary residence');
  await section(3, 'Current Policy');
  await page.getByLabel('Current insurance status').selectOption('No current policy');
  await view('Report');
  check(await page.frameLocator('iframe[title="Home quote intake report preview"]').locator('body').innerText().then(text => text.includes('Not applicable - prospect reports no current policy')), 'No-current-policy state failed');
  await view('Interview');
  await section(4, 'Claims & Risk');
  await page.getByLabel('Any prior claims or losses?').selectOption('Yes');
  await page.getByLabel('Additional prospect answers / follow-up').fill('<script>alert("never run")</script> Synthetic note only.');
  await view('Report');
  const report = page.frameLocator('iframe[title="Home quote intake report preview"]');
  check(await report.locator('body').innerText().then(text => text.includes('public record 2002; prospect 1999')), 'Missing discrepancy');
  check(await report.locator('body').innerText().then(text => text.includes('Claim details')), 'Missing claims follow-up');
  check(await report.locator('script').count() === 0, 'Report allowed an injected script');
  const htmlDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download report', exact: true }).click();
  const html = await htmlDownload;
  check(html.suggestedFilename() === 'index.html', 'Wrong report filename');
  await html.saveAs('output/playwright/home-quote-index.html');
  const draftDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await (await draftDownload).saveAs('output/playwright/home-quote-draft.json');
  results.push({ name: 'HTML and editable JSON downloads, escaped report, missing data and conflicting facts', passed: true });
  await view('Interview');
  await section(0, 'Applicant');
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: width < 500 ? 844 : 1000 });
    await dialog().locator('.modal-content').evaluate(node => { node.scrollTop = 0; });
    await fit('Interview ' + width);
    await page.screenshot({ path: `output/playwright/home-quote-interview-${width}.png` });
    await view('Property');
    await fit('Property ' + width);
    await page.screenshot({ path: `output/playwright/home-quote-property-${width}.png` });
    await view('Report');
    await fit('Report ' + width);
    await page.screenshot({ path: `output/playwright/home-quote-report-${width}.png` });
    await view('Interview');
  }
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.screenshot({ path: 'output/playwright/home-quote-dark.png' });
  await page.evaluate(() => document.documentElement.classList.remove('dark'));
  for (let i = 0; i < 25; i++) await page.keyboard.press('Tab');
  check(await dialog().evaluate(node => node.contains(document.activeElement)), 'Dialog focus escaped');
  await page.keyboard.press('Escape');
  check(await page.getByRole('button', { name: 'Quote Information', exact: true }).evaluate(node => node === document.activeElement), 'Focus did not return to quote action');
  await page.getByRole('searchbox', { name: 'Property address', exact: true }).fill('456 Other Example St, Elkin, NC 28621');
  await page.getByRole('button', { name: 'Quote Information', exact: true }).click();
  check(await page.getByText('A draft for', { exact: false }).isVisible(), 'New address replaced existing interview without confirmation');
  await page.getByRole('button', { name: 'Continue this draft', exact: true }).click();
  check(await page.getByLabel('Homeowner / named insured').inputValue() === 'SYNTHETIC TEST - NOT A CUSTOMER', 'Interview answers lost');

  // Simulated service failure must not destroy user-entered answers.
  await page.route('**/api/home-quote', route => route.fulfill({ status: 502, contentType: 'application/json', body: JSON.stringify({ error: 'Synthetic lookup failure. Please retry.' }) }));
  await page.getByRole('button', { name: 'Retry research', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'Synthetic lookup failure' }).waitFor();
  check(await page.getByLabel('Homeowner / named insured').inputValue() === 'SYNTHETIC TEST - NOT A CUSTOMER', 'Failure lost interview');
  await page.unroute('**/api/home-quote');

  // Restore the exported draft and verify that a property match must be re-confirmed.
  await page.getByLabel('Open home quote draft file', { exact: true }).setInputFiles('output/playwright/home-quote-draft.json');
  await page.getByRole('button', { name: 'Open saved quote', exact: true }).click();
  check(!(await page.getByLabel('I checked the address and parcel; this is the correct home.').isChecked()), 'Imported match trusted automatically');
  check(await page.getByLabel('Homeowner / named insured').inputValue() === 'SYNTHETIC TEST - NOT A CUSTOMER', 'Import lost prospect');
  results.push({ name: 'Keyboard containment, address isolation, failed research, JSON restore', passed: true });

  // Check slow research and multi-candidate handling with synthetic county records.
  const bodies = [];
  await page.route('**/api/home-quote', async route => {
    const body = route.request().postDataJSON(); bodies.push(body);
    await page.waitForTimeout(1200);
    const property = { officialAddress: 'TEST ADDRESS ONLY', recordAddressDiffers: true, hasCountyRecord: true, matchMethod: 'address', facts: { county: 'Synthetic', parcelId: 'TEST-A', yearBuilt: '2000' }, links: {} };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ address: body.address, formattedAddress: body.address, retrievedAt: new Date().toISOString(), note: 'Synthetic QA response', results: [{ ...property, id: 'test-a' }, { ...property, id: 'test-b', facts: { ...property.facts, parcelId: 'TEST-B' } }] }) });
  });
  await page.getByRole('button', { name: 'Retry research', exact: true }).click();
  await page.getByLabel('Phone', { exact: true }).fill('336-555-0100');
  await page.getByLabel('Property / parcel match', { exact: true }).waitFor();
  check(await page.getByLabel('Phone', { exact: true }).inputValue() === '336-555-0100', 'Slow response overwrote interview edits');
  await page.getByLabel('I checked the address and parcel; this is the correct home.').check();
  await page.getByLabel('Property / parcel match', { exact: true }).selectOption('test-b');
  check(!(await page.getByLabel('I checked the address and parcel; this is the correct home.').isChecked()), 'Changing parcel retained prior confirmation');
  check(bodies.every(body => Object.keys(body).join(',') === 'address'), 'Interview information sent to public research');
  await page.unroute('**/api/home-quote');
  results.push({ name: 'Slow lookup, multiple parcels, address-only network boundary', passed: true });
  page.once('dialog', message => message.accept());
  await page.reload();
  await page.getByRole('button', { name: 'Real Estate', exact: true }).click();
  check(await page.getByRole('searchbox', { name: 'Property address', exact: true }).inputValue() === '', 'Expected fresh search field');
  await page.getByRole('button', { name: 'Quote Information', exact: true }).click();
  check(await page.getByLabel('Homeowner / named insured').inputValue() === 'SYNTHETIC TEST - NOT A CUSTOMER', 'Reload lost saved tab draft');
  check(await page.getByLabel('Phone', { exact: true }).inputValue() === '336-555-0100', 'Reload lost newest answer');
  results.push({ name: 'Reload and resume with empty search field', passed: true });
  await page.getByRole('button', { name: 'Clear quote draft', exact: true }).click();
  await page.getByRole('button', { name: 'Clear draft', exact: true }).click();
  check(await page.evaluate(() => sessionStorage.getItem('matrix-home-quote-session-v1')) === null, 'Clear did not remove private draft');
  await page.getByRole('searchbox', { name: 'Property address', exact: true }).fill('');
  return results;
}
