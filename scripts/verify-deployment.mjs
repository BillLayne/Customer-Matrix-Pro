import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [base, target = 'agent'] = process.argv.slice(2);
if (!base || !['agent', 'staff'].includes(target)) throw new Error('Provide the deployment URL and agent or staff.');
const folder = target === 'staff' ? path.resolve(root, '../Agency-Staff-Dashboard') : root;
const config = Object.fromEntries(readFileSync(path.join(folder, '.dev.vars'), 'utf8').split(/\r?\n/).filter(line => /^[A-Z_][A-Z0-9_]*=/.test(line)).map(line => {
  const index = line.indexOf('='); const raw = line.slice(index + 1).trim();
  return [line.slice(0, index), raw.startsWith('"') ? JSON.parse(raw) : raw.replace(/^'(.*)'$/, '$1')];
}));
const url = new URL(base);
assert.ok(url.hostname.endsWith('.pages.dev') || url.hostname === '127.0.0.1');
const anonymous = await fetch(new URL('/api/contacts', url));
assert.equal(anonymous.status, 401, 'Anonymous contact access must fail');
const forged = await fetch(new URL('/api/contacts', url), { headers: { cookie: 'customer_matrix_pro_auth=approved; agency_staff_session=approved' } });
assert.equal(forged.status, 401, 'Old and forged cookies must fail');
const login = await fetch(new URL('/login', url), { method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/x-www-form-urlencoded', origin: url.origin }, body: new URLSearchParams({ password: config.SITE_PASSWORD }) });
assert.equal(login.status, 303, 'Login must succeed');
const rawCookie = login.headers.get('set-cookie');
assert.match(rawCookie, /HttpOnly; Secure; SameSite=Lax/);
const cookie = rawCookie.split(';')[0];
const [name, value] = cookie.split('=');
const headers = { cookie };
const contacts = await fetch(new URL('/api/contacts', url), { headers });
assert.equal(contacts.status, 200, 'Shared contacts must load');
const document = await contacts.json();
assert.ok(Array.isArray(document.entries));
const csrf = await fetch(new URL('/api/contacts', url), { method: 'PUT', headers: { ...headers, origin: 'https://example.com', 'content-type': 'application/json' }, body: '{}' });
assert.equal(csrf.status, 403, 'Cross-origin changes must fail');
const home = await fetch(url, { headers });
assert.equal(home.status, 200);
const html = await home.text();
const asset = html.match(/src="(\/assets\/[^" ]+\.js)"/)?.[1];
assert.ok(asset, 'Production JavaScript asset must exist');
const bundle = await fetch(new URL(asset, url), { headers }).then(response => response.text());
assert.doesNotMatch(bundle, /AIza[\w-]{30,}/, 'Bundle must contain no Gemini keys');
for (const key of ['SITE_PASSWORD', 'SESSION_SECRET', 'GEMINI_API_KEY']) {
  if (config[key]) assert.ok(!bundle.includes(config[key]), `${key} must stay server-side`);
}
const output = path.join(root, 'output/qa'); mkdirSync(output, { recursive: true });
writeFileSync(path.join(output, `${target}-auth.json`), JSON.stringify({ cookies: [{ name, value, domain: url.hostname, path: '/', expires: Math.floor(Date.now() / 1000) + 86400, httpOnly: true, secure: true, sameSite: 'Lax' }], origins: [] }), { mode: 0o600 });
console.log(JSON.stringify({ target, url: url.origin, securityChecks: 'passed', contacts: document.entries.length, revision: document.revision, bundle: asset, privateBrowserStateSaved: true }));
