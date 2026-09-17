async (page) => {
  if (!page.url().startsWith('http://127.0.0.1:8788/')) throw new Error('Run only against the isolated local quote preview.');
  if (await page.evaluate(() => sessionStorage.getItem('matrix-home-quote-session-v1'))) throw new Error('Use a test tab with no existing quote draft.');
  const check = (value, message) => { if (!value) throw new Error(message); };
  const results = [];
  const dialog = () => page.getByRole('dialog', { name: 'Home Quote Information', exact: true });
  const view = name => dialog().getByRole('group', { name: 'Quote workspace view' }).getByRole('button', { name, exact: true }).click();
  const section = async (index, name) => {
    const select = dialog().getByLabel('Interview section', { exact: true });
    if (await select.isVisible()) await select.selectOption(String(index));
    else await dialog().getByRole('button', { name: `${index + 1}. ${name}`, exact: true }).click();
  };
  const download = async (name, path) => {
    const pending = page.waitForEvent('download');
    await dialog().getByRole('button', { name, exact: true }).click();
    const file = await pending;
    await file.saveAs(path);
    return file.suggestedFilename();
  };
  let lookupStarted;
  const pendingLookup = new Promise(resolve => { lookupStarted = resolve; });
  await page.route('**/api/home-quote', route => { lookupStarted(route); });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole('button', { name: 'Real Estate', exact: true }).click();
  const address = '123 Example St, Elkin, NC 28621';
  await page.getByRole('searchbox', { name: 'Property address', exact: true }).fill(address);
  await page.getByRole('button', { name: 'Quote Information', exact: true }).click();
  const route = await pendingLookup;
  check(JSON.stringify(route.request().postDataJSON()) === JSON.stringify({ address }), 'Research must remain address-only');

  // Every question stays blank, including dwelling coverage and renewal.
  for (const [index, name] of ['Applicant', 'Home', 'Roof & Systems', 'Current Policy', 'Claims & Risk'].entries()) {
    await dialog().getByRole('heading', { name, exact: true }).waitFor();
    check(await dialog().locator('.quote-fields [required], .quote-fields [aria-required="true"], .quote-critical').count() === 0, 'Question marked required');
    check(await dialog().locator('.quote-fields input, .quote-fields textarea, .quote-fields select').evaluateAll(fields => fields.every(field => field.value === '' && field.checkValidity())), 'Blank answers are invalid');
    check(await dialog().getByText('All questions optional', { exact: true }).isVisible(), 'Optional status missing');
    await dialog().getByRole('button', { name: index === 4 ? 'Review report' : 'Next section', exact: true }).click();
  }
  const report = page.frameLocator('iframe[title="Home quote intake report preview"]');
  await report.locator('#home').waitFor();
  check(await download('Download report', 'output/playwright/home-quote-blank.html') === 'index.html', 'Blank report download failed');
  await download('Save draft', 'output/playwright/home-quote-blank.json');
  check(await dialog().getByRole('button', { name: 'Print / PDF', exact: true }).isEnabled(), 'Blank print action blocked');
  check(await report.locator('#home').innerText().then(text => text.includes('Not shown')), 'Blank answers must remain missing');
  results.push('All five blank sections, report and draft downloads remain available while research is pending');

  const property = { id: 'synthetic-parcel', officialAddress: address, recordAddressDiffers: false, hasCountyRecord: true, matchMethod: 'address',
    facts: { county: 'Synthetic', parcelId: 'TEST-ONLY', yearBuilt: '1998', heatedArea: '1840', exteriorWall: 'Brick veneer', foundation: 'Crawlspace', stories: '1', bedrooms: '3', fullBaths: '2', halfBaths: '0', roofCover: 'Shingle', roofStructure: 'Gable', heatingType: 'Heat pump' }, links: {} };
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ address, formattedAddress: address, retrievedAt: new Date().toISOString(), note: 'Synthetic QA only', results: [property] }) });
  await report.locator('#home').getByText('1998', { exact: true }).waitFor();
  const home = await report.locator('#home').innerText();
  const systems = await report.locator('#systems').innerText();
  for (const value of ['1998', '1840', 'Brick veneer', 'Crawlspace', 'Half baths: 0', 'property match unconfirmed']) check(home.includes(value), 'Missing integrated Home fact: ' + value);
  for (const value of ['Shingle', 'Gable', 'Heat pump']) check(systems.includes(value), 'Missing integrated Roof fact: ' + value);
  const saved = await page.evaluate(() => JSON.parse(sessionStorage.getItem('matrix-home-quote-session-v1')));
  check(Object.keys(saved.answers).length === 0, 'Public research silently filled prospect answers');
  results.push('Research updates an already-open report, with source labels and no fabricated prospect answers');

  await view('Interview');
  await section(0, 'Applicant');
  check(await dialog().getByLabel('Additional named insured and DOB', { exact: true }).count() === 1, 'Additional insured duplicated');
  await dialog().getByLabel('Additional named insured and DOB', { exact: true }).fill('SYNTHETIC ADDITIONAL INSURED');
  await section(1, 'Home');
  await dialog().getByLabel('Year built (prospect confirmation)', { exact: true }).fill('2001');
  await section(3, 'Current Policy');
  await dialog().getByLabel('Current insurance status', { exact: true }).selectOption('Currently insured');
  for (const label of ['Current dwelling coverage (Coverage A)', 'Renewal / expiration date']) check(await dialog().getByLabel(label, { exact: true }).inputValue() === '', label + ' should still be blank');
  await dialog().getByRole('button', { name: 'Next section', exact: true }).click();
  await dialog().getByRole('button', { name: 'Review report', exact: true }).click();
  const combinedHome = await report.locator('#home').innerText();
  check(combinedHome.includes('2001') && combinedHome.includes('1998') && combinedHome.includes('Prospect / staff entry'), 'Report lost either source');
  check(await report.locator('#review').innerText().then(text => text.includes('public record 1998; prospect 2001')), 'Conflict warning lost');
  check(await report.locator('#applicant').innerText().then(text => text.includes('SYNTHETIC ADDITIONAL INSURED')), 'Additional insured missing');
  await download('Download report', 'output/playwright/home-quote-integrated.html');
  await download('Save draft', 'output/playwright/home-quote-integrated.json');
  results.push('Current policy may omit dwelling/renewal; existing Additional Insured and conflicting answers survive report export');

  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    check(await dialog().evaluate(node => {
      const content = node.querySelector('.modal-content');
      return document.documentElement.scrollWidth <= innerWidth + 1 && content.scrollWidth <= content.clientWidth + 1;
    }), 'Modal overflow at ' + width);
    check(await report.locator('html').evaluate(node => node.scrollWidth <= node.clientWidth + 1), 'Report overflow at ' + width);
    await report.locator('#home').evaluate(node => node.scrollIntoView());
    await dialog().locator('iframe').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `output/playwright/home-quote-integrated-${width}.png` });
    await view('Interview');
    await section(3, 'Current Policy');
    await dialog().getByText('All questions optional', { exact: true }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: `output/playwright/home-quote-optional-${width}.png` });
    await dialog().getByRole('button', { name: 'Next section', exact: true }).click();
    await dialog().getByRole('button', { name: 'Review report', exact: true }).click();
  }
  results.push('Report and optional interview verified at 320/390/768/1440 widths without horizontal overflow');
  await dialog().getByLabel('Open home quote draft file', { exact: true }).setInputFiles('output/playwright/home-quote-integrated.json');
  await page.getByRole('button', { name: 'Open saved quote', exact: true }).click();
  check(await dialog().getByLabel('Additional named insured and DOB', { exact: true }).inputValue() === 'SYNTHETIC ADDITIONAL INSURED', 'Draft lost additional insured');
  await view('Report');
  check(await report.locator('#home').innerText().then(text => text.includes('1840') && text.includes('2001') && text.includes('1998')), 'Restored report lost research or answers');
  await dialog().getByLabel('Open home quote draft file', { exact: true }).setInputFiles('output/playwright/home-quote-blank.json');
  await page.getByRole('button', { name: 'Open saved quote', exact: true }).click();
  check(await dialog().locator('.quote-fields input').evaluateAll(fields => fields.every(field => field.value === '')), 'Blank draft import failed');
  results.push('Blank and partial draft imports preserve their answers and report research');
  await dialog().getByRole('button', { name: 'Clear quote draft', exact: true }).click();
  await page.getByRole('button', { name: 'Clear draft', exact: true }).click();
  await page.unroute('**/api/home-quote');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole('searchbox', { name: 'Property address', exact: true }).fill('');
  return results;
}
