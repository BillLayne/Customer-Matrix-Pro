import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { authenticationMiddleware, createSession, verifySession, cookieName, requireSession, resetLoginMemory, LOGIN_MAX_PER_ADDRESS } from '../server/auth.ts';
import { contactsHandler, validateContacts } from '../server/contacts.ts';
import { aiHandler, validateAiInput, buildAiPrompt } from '../server/ai.ts';

const env = { SITE_PASSWORD: 'synthetic-test-password-only', SESSION_SECRET: 'synthetic-session-secret-with-32-characters', APP_ID: 'customer-matrix-pro' };
const origin = 'https://dashboard.test';
const next = async () => new Response('App content', { status: 200, headers: { 'content-type': 'text/html' } });

async function request(path, body, method = body ? 'PUT' : 'GET', extra = {}) {
  return new Request(origin + path, { method, headers: { cookie: `${cookieName(env)}=${await createSession(env)}`, origin, 'content-type': 'application/json', ...extra }, ...(body ? { body: JSON.stringify(body) } : {}) });
}

function database() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(readFileSync(new URL('../migrations/0001_shared_contacts.sql', import.meta.url), 'utf8'));
  sqlite.exec(readFileSync(new URL('../migrations/0002_login_attempts.sql', import.meta.url), 'utf8'));
  const db = { prepare(sql) {
    let params = [];
    const statement = {
      bind(...values) { params = values; return statement; },
      async first() { return sqlite.prepare(sql).get(...params) || null; },
      async run() { return sqlite.prepare(sql).run(...params); },
    };
    return statement;
  } };
  return { db, sqlite };
}

const entry = { id: 'test-contact', company: 'Synthetic Test Carrier', kind: 'phone', label: 'Service', value: '1-800-555-0123', createdAt: 1 };

test('signed sessions reject old fixed cookie, tampering, expiry, wrong app and rotated passwords', async () => {
  const now = Date.now();
  const token = await createSession(env, now);
  assert.equal(await verifySession(token, env, now), true);
  assert.equal(await verifySession('approved', env, now), false);
  assert.equal(await verifySession(`x${token}`, env, now), false);
  assert.equal(await verifySession(token, { ...env, APP_ID: 'agency-staff-dashboard' }, now), false);
  assert.equal(await verifySession(token, { ...env, SITE_PASSWORD: 'changed' }, now), false);
  assert.equal(await verifySession(token, env, now + 86400000), false);
  assert.equal(await verifySession(token, { ...env, SESSION_VERSION: '2' }, now), false);
  assert.equal(await verifySession(token, { SITE_PASSWORD: 'only-a-password' }, now), false);
});

test('middleware fails closed and returns JSON for expired API sessions', async () => {
  const missing = await authenticationMiddleware({ request: new Request(origin), env: {}, next });
  assert.equal(missing.status, 503);
  const unauthorized = await authenticationMiddleware({ request: new Request(origin + '/api/contacts', { headers: { cookie: 'customer_matrix_pro_auth=approved' } }), env, next });
  assert.equal(unauthorized.status, 401);
  assert.equal((await unauthorized.json()).code, 'SESSION_EXPIRED');
  const authorized = await authenticationMiddleware({ request: await request('/'), env, next });
  assert.equal(await authorized.text(), 'App content');
  assert.equal(authorized.headers.get('cache-control'), 'no-store');
});

test('login issues protected expiring cookie; cross-origin login and writes fail', async () => {
  const login = new Request(origin + '/login', { method: 'POST', headers: { origin, 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ password: env.SITE_PASSWORD }) });
  const response = await authenticationMiddleware({ request: login, env, next });
  assert.equal(response.status, 303);
  assert.match(response.headers.get('set-cookie'), /^__Host-customer_matrix_pro_session=.+; Path=\/; HttpOnly; Secure; SameSite=Lax; Max-Age=86400$/);
  const rejected = await requireSession(await request('/api/contacts', { entries: [], revision: 0 }, 'PUT', { origin: 'https://elsewhere.test' }), env);
  assert.equal(rejected.status, 403);
});

test('shared contacts use atomic revisions and retain previous versions', async () => {
  const { db, sqlite } = database();
  const context = { env: { ...env, CONTACTS_DB: db }, next };
  const saved = await contactsHandler({ ...context, request: await request('/api/contacts', { entries: [entry], revision: 0 }) });
  assert.equal(saved.status, 200);
  assert.equal((await saved.json()).revision, 1);
  const stale = await contactsHandler({ ...context, request: await request('/api/contacts', { entries: [], revision: 0 }) });
  assert.equal(stale.status, 409);
  assert.deepEqual((await stale.json()).entries, [entry]);
  const removal = await contactsHandler({ ...context, request: await request('/api/contacts', { entries: [], revision: 1 }) });
  assert.equal(removal.status, 200);
  const backup = sqlite.prepare('SELECT entries FROM contact_versions WHERE revision = 1').get();
  assert.deepEqual(JSON.parse(backup.entries), [entry]);
  const fromStaff = await contactsHandler({ ...context, request: await request('/api/contacts') });
  assert.deepEqual((await fromStaff.json()).entries, []);
  sqlite.close();
});

test('contact validation rejects duplicate ids and malformed corrections', () => {
  assert.equal(validateContacts([entry]), true);
  assert.equal(validateContacts([entry, entry]), false);
  assert.equal(validateContacts([{ ...entry, replacesDetail: { kind: 'phone' } }]), false);
  assert.equal(validateContacts([{ ...entry, kind: 'email', value: 'invalid' }]), false);
  assert.equal(validateContacts([{ ...entry, kind: 'website', value: 'javascript:alert(1)' }]), false);
});

test('AI input validates task, attachment format and required data', () => {
  assert.equal(validateAiInput({ task: 'organize-notes', text: 'Synthetic call notes' }), true);
  assert.equal(validateAiInput({ task: 'organize-notes', text: '' }), false);
  assert.equal(validateAiInput({ task: 'extract-notes', text: '' }), false);
  assert.equal(validateAiInput({ task: 'extract-notes', text: '', attachment: { mimeType: 'image/svg+xml', data: 'dGVzdA==' } }), false);
  assert.equal(validateAiInput({ task: 'extract-notes', text: '', attachment: { mimeType: 'application/pdf', data: 'dGVzdA==' } }), true);
  assert.match(buildAiPrompt({ task: 'organize-notes', text: 'The agent will follow up.' }), /pending, not completed/);
});

test('AI calls only the server-configured model and never returns the key', async () => {
  const previous = globalThis.fetch;
  let called;
  globalThis.fetch = async (url, options) => { called = { url, options }; return Response.json({ candidates: [{ content: { parts: [{ text: 'STATUS: Pending follow-up.' }] }, finishReason: 'STOP' }] }); };
  try {
    const response = await aiHandler({ env: { ...env, GEMINI_API_KEY: 'synthetic-private-key', GEMINI_MODEL: 'gemini-2.5-flash' }, request: await request('/api/ai', { task: 'organize-notes', text: 'Synthetic test notes.' }, 'POST'), next });
    assert.equal(response.status, 200);
    assert.match(called.url, /^https:\/\/generativelanguage\.googleapis\.com\/v1beta\/models\/gemini-2\.5-flash:generateContent$/);
    assert.equal(called.options.headers['x-goog-api-key'], 'synthetic-private-key');
    const text = await response.text();
    assert.doesNotMatch(text, /synthetic-private-key/);
    assert.match(text, /Pending follow-up/);
  } finally { globalThis.fetch = previous; }
});

test('AI authentication errors are actionable without provider details', async () => {
  const previous = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ error: { message: 'secret provider diagnostics' } }, { status: 400 });
  try {
    const response = await aiHandler({ env: { ...env, GEMINI_API_KEY: 'synthetic-private-key' }, request: await request('/api/ai', { task: 'organize-notes', text: 'Synthetic notes' }, 'POST'), next });
    assert.equal(response.status, 502);
    const body = await response.json();
    assert.equal(body.code, 'AI_CREDENTIAL_ERROR');
    assert.doesNotMatch(JSON.stringify(body), /secret provider/);
  } finally { globalThis.fetch = previous; }
});

const loginAttempt = (password, ip = '203.0.113.9') => new Request(origin + '/login', { method: 'POST', headers: { origin, 'cf-connecting-ip': ip, 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ password }) });

test('wrong passwords are refused, counted per address and locked out after the limit', async () => {
  resetLoginMemory();
  const { db, sqlite } = database();
  const context = { env: { ...env, CONTACTS_DB: db }, next };
  for (let attempt = 0; attempt < LOGIN_MAX_PER_ADDRESS; attempt++) {
    const refused = await authenticationMiddleware({ ...context, request: loginAttempt('not-the-password') });
    assert.equal(refused.status, 401);
    assert.equal(refused.headers.get('set-cookie'), null);
  }
  const locked = await authenticationMiddleware({ ...context, request: loginAttempt(env.SITE_PASSWORD) });
  assert.equal(locked.status, 429);
  assert.match(await locked.text(), /Too many sign-in attempts/);
  // Another address is unaffected and a good password clears its own counter.
  const other = await authenticationMiddleware({ ...context, request: loginAttempt(env.SITE_PASSWORD, '198.51.100.4') });
  assert.equal(other.status, 303);
  assert.equal(sqlite.prepare("SELECT count FROM login_attempts WHERE key = 'ip:203.0.113.9'").get().count, LOGIN_MAX_PER_ADDRESS);
  assert.equal(sqlite.prepare("SELECT count FROM login_attempts WHERE key = 'ip:198.51.100.4'").get(), undefined);
  sqlite.close();
});

test('login limiter still works from memory when the database is missing', async () => {
  resetLoginMemory();
  for (let attempt = 0; attempt < LOGIN_MAX_PER_ADDRESS; attempt++) await authenticationMiddleware({ env, next, request: loginAttempt('wrong', '192.0.2.1') });
  const locked = await authenticationMiddleware({ env, next, request: loginAttempt(env.SITE_PASSWORD, '192.0.2.1') });
  assert.equal(locked.status, 429);
  resetLoginMemory();
});

test('logout clears the cookie, only same-origin, only GET or POST', async () => {
  const out = await authenticationMiddleware({ env, next, request: await request('/logout') });
  assert.equal(out.status, 303);
  assert.match(out.headers.get('set-cookie'), /^__Host-customer_matrix_pro_session=; Path=\/; HttpOnly; Secure; SameSite=Lax; Max-Age=0$/);
  const crossSite = await authenticationMiddleware({ env, next, request: new Request(origin + '/logout', { headers: { origin: 'https://elsewhere.test' } }) });
  assert.equal(crossSite.status, 403);
  const wrongMethod = await authenticationMiddleware({ env, next, request: await request('/logout', null, 'DELETE') });
  assert.equal(wrongMethod.status, 405);
});

test('AI reports truncation before emptiness and returns partial memo text marked truncated', async () => {
  const previous = globalThis.fetch;
  try {
    globalThis.fetch = async () => Response.json({ candidates: [{ content: { parts: [] }, finishReason: 'MAX_TOKENS' }] });
    let response = await aiHandler({ env: { ...env, GEMINI_API_KEY: 'synthetic-private-key' }, request: await request('/api/ai', { task: 'organize-notes', text: 'Synthetic notes' }, 'POST'), next });
    assert.equal(response.status, 422);
    assert.equal((await response.json()).code, 'AI_TRUNCATED');
    globalThis.fetch = async (url, options) => {
      const sent = JSON.parse(options.body);
      assert.equal(sent.generationConfig.thinkingConfig.thinkingBudget, 0);
      return Response.json({ candidates: [{ content: { parts: [{ text: 'REQUEST SUMMARY: partial' }] }, finishReason: 'MAX_TOKENS' }] });
    };
    response = await aiHandler({ env: { ...env, GEMINI_API_KEY: 'synthetic-private-key' }, request: await request('/api/ai', { task: 'organize-notes', text: 'Synthetic notes' }, 'POST'), next });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { text: 'REQUEST SUMMARY: partial', truncated: true });
    globalThis.fetch = async () => Response.json({ candidates: [{ content: { parts: [] }, finishReason: 'SAFETY' }] });
    response = await aiHandler({ env: { ...env, GEMINI_API_KEY: 'synthetic-private-key' }, request: await request('/api/ai', { task: 'organize-notes', text: 'Synthetic notes' }, 'POST'), next });
    assert.equal((await response.json()).code, 'AI_BLOCKED');
  } finally { globalThis.fetch = previous; }
});
