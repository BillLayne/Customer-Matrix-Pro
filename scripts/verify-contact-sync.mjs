import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const targets = ['agent', 'staff'].map(target => {
  const { cookies: [cookie] } = JSON.parse(readFileSync(`output/qa/${target}-auth.json`, 'utf8'));
  if (cookie.domain.split('.').length !== 4 || !cookie.domain.endsWith('.pages.dev')) throw new Error('Contact mutation test is restricted to preview deployments.');
  return { origin: `https://${cookie.domain}`, cookie: `${cookie.name}=${cookie.value}` };
});
const request = async (target, method = 'GET', body) => fetch(`${target.origin}/api/contacts`, {
  method, headers: { cookie: target.cookie, origin: target.origin, 'content-type': 'application/json' },
  body: body && JSON.stringify(body),
});
const initial = await request(targets[0]).then(response => response.json());
const entry = { id: 'qa-sync-' + crypto.randomUUID(), company: 'Synthetic QA Company', kind: 'phone', label: 'Test only', value: '202-555-0100', createdAt: Date.now() };
let created = false;
try {
  const response = await request(targets[0], 'PUT', { revision: initial.revision, entries: [...initial.entries, entry] });
  assert.equal(response.status, 200); created = true;
  const fromStaff = await request(targets[1]).then(response => response.json());
  assert.ok(fromStaff.entries.some(item => item.id === entry.id), 'Staff must receive agent addition');
  const stale = await request(targets[1], 'PUT', initial);
  assert.equal(stale.status, 409, 'Stale staff update must not overwrite the addition');
  const edit = await request(targets[1], 'PUT', { revision: fromStaff.revision, entries: fromStaff.entries.map(item => item.id === entry.id ? { ...item, value: '202-555-0101' } : item) });
  assert.equal(edit.status, 200);
  const fromAgent = await request(targets[0]).then(response => response.json());
  assert.equal(fromAgent.entries.find(item => item.id === entry.id).value, '202-555-0101', 'Agent must receive staff edit');
  console.log('Preview bidirectional synchronization and atomic stale-write protection passed.');
} finally {
  if (created) {
    const latest = await request(targets[0]).then(response => response.json());
    const cleanup = await request(targets[0], 'PUT', { revision: latest.revision, entries: latest.entries.filter(item => item.id !== entry.id) });
    assert.equal(cleanup.status, 200, 'Synthetic test cleanup must succeed');
    console.log('Synthetic contact removed from preview; production contacts were not modified.');
  }
}
