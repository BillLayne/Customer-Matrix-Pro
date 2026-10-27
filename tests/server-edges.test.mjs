// Edge-path coverage for the Pages functions: upstream failure mapping, size and
// content-type gates, and the fail-closed branches that server.test.mjs leaves
// alone. Synthetic values only; globalThis.fetch is always restored in finally.
import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { authenticationMiddleware, createSession, cookieName, sameOrigin, requireSession } from '../server/auth.ts';
import { contactsHandler } from '../server/contacts.ts';
import { aiHandler } from '../server/ai.ts';
import { docLinksHandler, DEFAULT_DOC_LINK_API_BASE } from '../server/docLinks.ts';
import { homeQuoteHandler } from '../server/homeQuote.ts';

const env = { SITE_PASSWORD: 'synthetic-test-password-only', SESSION_SECRET: 'synthetic-session-secret-with-32-characters', APP_ID: 'customer-matrix-pro' };
const aiEnv = { ...env, GEMINI_API_KEY: 'synthetic-private-key' };
const DOC_TOKEN = 'synthetic-doc-link-token-for-tests-only-0123456789abcdef';
const docEnv = { ...env, DOC_LINK_TOKEN: DOC_TOKEN };
const origin = 'https://dashboard.test';
const next = async () => new Response('App content');
const AI_MODEL_URL = (model) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
const aiOk = (text = 'STATUS: Pending follow-up.') => Response.json({ candidates: [{ content: { parts: [{ text }] }, finishReason: 'STOP' }] });
const aiError = (status) => Response.json({ error: { message: 'synthetic upstream diagnostics', status: String(status) } }, { status });

/** A signed, same-origin request. `body` is sent as-is (string/FormData) unless `json` is given. */
async function signed(path, { method = 'GET', headers = {}, body, json, e = env, signal } = {}) {
  const init = { method, headers: { cookie: `${cookieName(e)}=${await createSession(e)}`, origin, ...headers }, ...(signal ? { signal } : {}) };
  if (json !== undefined) { init.headers['content-type'] = init.headers['content-type'] || 'application/json'; init.body = JSON.stringify(json); }
  else if (body !== undefined) init.body = body;
  return new Request(origin + path, init);
}

/** Swap globalThis.fetch for the duration of `run`, recording every call. */
async function withFetch(reply, run) {
  const previous = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => { calls.push({ url, options }); return typeof reply === 'function' ? reply(url, options, calls.length) : reply; };
  try { return await run(calls); } finally { globalThis.fetch = previous; }
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

const aiNotes = { task: 'organize-notes', text: 'Synthetic test notes.' };
const aiCall = async (e, json = aiNotes, extra = {}) => aiHandler({ env: e, request: await signed('/api/ai', { method: 'POST', json, ...extra }), next });

// ----------------------------------------------------------------- server/ai.ts

test('AI: a custom model that 404s falls back to gemini-3.5-flash on the second call', async () => {
  await withFetch((url, options, n) => n === 1 ? aiError(404) : aiOk(), async (calls) => {
    const response = await aiCall({ ...aiEnv, GEMINI_MODEL: 'gemini-custom-preview' });
    assert.equal(response.status, 200);
    assert.equal(calls.length, 2);
    assert.equal(calls[0].url, AI_MODEL_URL('gemini-custom-preview'));
    assert.equal(calls[1].url, AI_MODEL_URL('gemini-3.5-flash'));
    // Both attempts send the identical request body; only the model changes.
    assert.equal(calls[0].options.body, calls[1].options.body);
    assert.match(await response.text(), /Pending follow-up/);
  });
});

test('AI: 429 on the only model is AI_BUSY 429; 503 is AI_UNAVAILABLE 502; no second model is tried', async () => {
  await withFetch(() => aiError(429), async (calls) => {
    const response = await aiCall({ ...aiEnv, GEMINI_MODEL: 'gemini-3.5-flash' });
    assert.equal(response.status, 429);
    assert.equal((await response.json()).code, 'AI_BUSY');
    assert.equal(calls.length, 1, 'configured model == fallback model, so nothing to fall back to');
  });
  await withFetch(() => aiError(503), async (calls) => {
    const response = await aiCall({ ...aiEnv, GEMINI_MODEL: 'gemini-3.5-flash' }); // same as the fallback, so only one model is tried
    assert.equal(response.status, 502);
    const body = await response.json();
    assert.equal(body.code, 'AI_UNAVAILABLE');
    assert.doesNotMatch(JSON.stringify(body), /synthetic upstream/);
    assert.equal(calls.length, 1);
  });
});

test('AI: a non-JSON upstream body never throws; it becomes a JSON AI_UNAVAILABLE error', async () => {
  for (const status of [200, 500]) {
    await withFetch(() => new Response('<html>upstream maintenance page</html>', { status, headers: { 'content-type': 'text/html' } }), async () => {
      const response = await aiCall(aiEnv);
      assert.equal(response.status, 502);
      assert.match(response.headers.get('content-type'), /application\/json/);
      const body = await response.json();
      assert.equal(body.code, 'AI_UNAVAILABLE');
      assert.doesNotMatch(JSON.stringify(body), /maintenance/);
    });
  }
});

test('AI: the client aborting its request maps to 504 AI_TIMEOUT; a bare AbortError from fetch is 502 AI_UNAVAILABLE', async () => {
  // The browser goes away mid-call: request.signal fires, the handler aborts its own controller.
  const client = new AbortController();
  await withFetch((url, options) => new Promise((resolve, reject) => {
    options.signal.addEventListener('abort', () => reject(new DOMException('The operation was aborted.', 'AbortError')), { once: true });
    client.abort();
  }), async () => {
    const response = await aiCall(aiEnv, aiNotes, { signal: client.signal });
    assert.equal(response.status, 504);
    assert.equal((await response.json()).code, 'AI_TIMEOUT');
  });
  // fetch rejects with AbortError on its own (nobody aborted the handler's controller): reported as a connection problem.
  await withFetch(() => Promise.reject(new DOMException('The operation was aborted.', 'AbortError')), async () => {
    const response = await aiCall(aiEnv);
    assert.equal(response.status, 502);
    assert.equal((await response.json()).code, 'AI_UNAVAILABLE');
  });
});

test('AI: research tasks get a bounded thinking budget and Google Search; memo tasks get neither', async () => {
  await withFetch(() => aiOk('{"subject":"Property report","htmlBody":"<p>x</p>"}'), async (calls) => {
    const response = await aiCall(aiEnv, { task: 'property-report', text: '', address: '123 Example St, Elkin, NC 28621' });
    assert.equal(response.status, 200);
    const sent = JSON.parse(calls[0].options.body);
    assert.equal(sent.generationConfig.thinkingConfig.thinkingBudget, 2048);
    assert.equal(sent.generationConfig.maxOutputTokens, 10000);
    assert.deepEqual(sent.tools, [{ googleSearch: {} }]);
  });
  await withFetch(() => aiOk(), async (calls) => {
    await aiCall(aiEnv);
    const sent = JSON.parse(calls[0].options.body);
    assert.equal(sent.generationConfig.thinkingConfig.thinkingBudget, 0);
    assert.equal(sent.generationConfig.maxOutputTokens, 5000);
    assert.equal(sent.tools, undefined);
  });
});

test('AI: oversized bodies (header or raw), wrong content-type and a missing key are refused before any upstream call', async () => {
  await withFetch(() => aiOk(), async (calls) => {
    const MAX_BODY = 15_000_000;
    const byHeader = await aiCall(aiEnv, aiNotes, { headers: { 'content-length': String(MAX_BODY + 1) } });
    assert.equal(byHeader.status, 413);
    // No content-length header: the raw text is measured after reading.
    const byRaw = await aiHandler({ env: aiEnv, request: await signed('/api/ai', { method: 'POST', headers: { 'content-type': 'application/json' }, body: 'x'.repeat(MAX_BODY + 1) }), next });
    assert.equal(byRaw.status, 413);
    const wrongType = await aiHandler({ env: aiEnv, request: await signed('/api/ai', { method: 'POST', headers: { 'content-type': 'text/plain' }, body: JSON.stringify(aiNotes) }), next });
    assert.equal(wrongType.status, 415);
    const noKey = await aiCall({ ...env });
    assert.equal(noKey.status, 503);
    assert.equal((await noKey.json()).code, 'AI_NOT_CONFIGURED');
    assert.equal(calls.length, 0);
  });
});

// --------------------------------------------------------------- server/auth.ts

test('sameOrigin: no origin and no sec-fetch-site is treated as same-origin; cross-site is refused', () => {
  // Documented behaviour: a request carrying neither header (same-origin GET from an old
  // browser, curl, or a server-side caller) passes. Writes are still gated by the session cookie.
  assert.equal(sameOrigin(new Request(origin + '/api/contacts')), true);
  assert.equal(sameOrigin(new Request(origin + '/api/contacts', { headers: { 'sec-fetch-site': 'cross-site' } })), false);
  assert.equal(sameOrigin(new Request(origin + '/api/contacts', { headers: { origin, 'sec-fetch-site': 'cross-site' } })), false, 'a matching origin does not override cross-site');
  assert.equal(sameOrigin(new Request(origin + '/api/contacts', { headers: { 'sec-fetch-site': 'same-origin' } })), true);
  assert.equal(sameOrigin(new Request(origin + '/api/contacts', { headers: { origin: 'https://elsewhere.test' } })), false);
});

test('auth: signed-in GET /login bounces to /, API 401s carry loginUrl, POST /logout signs out, oversized login is 413', async () => {
  const bounced = await authenticationMiddleware({ env, next, request: await signed('/login') });
  assert.equal(bounced.status, 303);
  assert.equal(bounced.headers.get('location'), '/');
  assert.equal(bounced.headers.get('cache-control'), 'no-store');

  const api = await authenticationMiddleware({ env, next, request: new Request(origin + '/api/contacts') });
  assert.equal(api.status, 401);
  assert.deepEqual(await api.json(), { error: 'Your session expired. Sign in again; your unsaved work stays on this device.', code: 'SESSION_EXPIRED', loginUrl: '/login' });
  const direct = await requireSession(new Request(origin + '/api/contacts'), env);
  assert.equal((await direct.json()).loginUrl, '/login');

  const out = await authenticationMiddleware({ env, next, request: await signed('/logout', { method: 'POST' }) });
  assert.equal(out.status, 303);
  assert.equal(out.headers.get('location'), '/login');
  assert.match(out.headers.get('set-cookie'), /Max-Age=0$/);

  const big = new Request(origin + '/login', { method: 'POST', headers: { origin, 'content-type': 'application/x-www-form-urlencoded', 'content-length': '4097' }, body: new URLSearchParams({ password: env.SITE_PASSWORD }) });
  const refused = await authenticationMiddleware({ env, next, request: big });
  assert.equal(refused.status, 413);
  assert.equal(refused.headers.get('set-cookie'), null);
  assert.match(await refused.text(), /valid password/);
});

// ----------------------------------------------------------- server/contacts.ts

test('contacts: missing binding is 503; size, content-type and JSON gates run before the database', async () => {
  const noDb = await contactsHandler({ env, next, request: await signed('/api/contacts') });
  assert.equal(noDb.status, 503);
  assert.match((await noDb.json()).error, /local contacts are still available/);

  let touched = 0;
  const spy = { prepare() { touched++; throw new Error('must not be reached'); } };
  const ctx = { env: { ...env, CONTACTS_DB: spy }, next };
  const tooBig = await contactsHandler({ ...ctx, request: await signed('/api/contacts', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: 'x'.repeat(2_000_001) }) });
  assert.equal(tooBig.status, 413);
  const wrongType = await contactsHandler({ ...ctx, request: await signed('/api/contacts', { method: 'PUT', headers: { 'content-type': 'text/plain' }, body: '{"entries":[],"revision":0}' }) });
  assert.equal(wrongType.status, 415);
  const malformed = await contactsHandler({ ...ctx, request: await signed('/api/contacts', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: '{"entries": [' }) });
  assert.equal(malformed.status, 400);
  assert.match((await malformed.json()).error, /not valid JSON/);
  assert.equal(touched, 0);
});

test('contacts: a database that throws on prepare() is reported as 503 without leaking the error', async () => {
  const broken = { prepare() { throw new Error('D1_ERROR: synthetic internals'); } };
  for (const request of [await signed('/api/contacts'), await signed('/api/contacts', { method: 'PUT', json: { entries: [], revision: 0 } })]) {
    const response = await contactsHandler({ env: { ...env, CONTACTS_DB: broken }, next, request });
    assert.equal(response.status, 503);
    const text = await response.text();
    assert.doesNotMatch(text, /synthetic internals/);
    assert.match(text, /pending changes are kept on this device/);
  }
});

test('contacts: GET with a live database returns the seeded entries and revision', async () => {
  const { db, sqlite } = database();
  try {
    const response = await contactsHandler({ env: { ...env, CONTACTS_DB: db }, next, request: await signed('/api/contacts') });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const body = await response.json();
    assert.deepEqual(Object.keys(body).sort(), ['entries', 'revision']);
    assert.ok(Array.isArray(body.entries));
    assert.equal(body.revision, sqlite.prepare('SELECT revision FROM contact_directory WHERE id = 1').get().revision);
  } finally { sqlite.close(); }
});

// ----------------------------------------------------------- server/docLinks.ts

const docItem = { shortId: 'abcdef012345', url: 'https://docs.billlayneinsurance.com/d/abcdef012345', fileName: 'scan.pdf', contentType: 'application/pdf', createdAt: '2026-10-01T12:00:00.000Z', source: 'command-center', size: 2048 };
const jsonResponse = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } });
function recorder(reply) {
  const calls = [];
  return { calls, fetcher: async (url, init = {}) => { calls.push({ url, init }); return typeof reply === 'function' ? reply(url, init) : reply; } };
}
function pdfForm(extra = {}) {
  const form = new FormData();
  form.append('file', new File([new Uint8Array(2048)], 'scan.pdf', { type: 'application/pdf' }));
  for (const [key, value] of Object.entries(extra)) form.append(key, value);
  return form;
}
const docCtx = async (init = {}, e = docEnv) => ({ env: e, next, request: await signed('/api/doc-links', { ...init, e }) });

test('doc links: upload gates -- non-multipart is 415, declared length over the cap is 413, nothing reaches the Worker', async () => {
  const { calls, fetcher } = recorder(jsonResponse(docItem, 201));
  const wrongType = await docLinksHandler(await docCtx({ method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ file: 'x' }) }), fetcher);
  assert.equal(wrongType.status, 415);
  assert.match((await wrongType.json()).error, /file upload/);
  // The multipart form's own content-type is overridden by the explicit header, as a browser would never do; the length check comes first anyway.
  const tooBig = await docLinksHandler(await docCtx({ method: 'POST', headers: { 'content-length': String(15 * 1024 * 1024 + 256 * 1024 + 1) }, body: pdfForm() }), fetcher);
  assert.equal(tooBig.status, 413);
  assert.match((await tooBig.json()).error, /up to 15 MB/);
  assert.equal(calls.length, 0);
});

test('doc links: a customer field sent as a File is ignored, so only file and source are forwarded', async () => {
  const { calls, fetcher } = recorder(jsonResponse(docItem, 201));
  const form = pdfForm();
  form.append('customer', new File(['Roy Meyreles'], 'customer.txt', { type: 'text/plain' }));
  const response = await docLinksHandler(await docCtx({ method: 'POST', body: form }), fetcher);
  assert.equal(response.status, 201);
  const sent = calls[0].init.body;
  assert.ok(sent instanceof FormData);
  assert.deepEqual([...sent.keys()].sort(), ['file', 'source']);
  assert.equal(sent.get('customer'), null, 'the label is empty, so it is not appended at all');
});

test('doc links: a successful upload forwards exactly file + customer + server-chosen source, with the token', async () => {
  const { calls, fetcher } = recorder(jsonResponse(docItem, 201));
  const response = await docLinksHandler(await docCtx({ method: 'POST', body: pdfForm({ customer: 'Roy  Meyreles', source: 'staff-dashboard', token: 'smuggled', note: 'dropped' }) }), fetcher);
  assert.equal(response.status, 201);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, `${DEFAULT_DOC_LINK_API_BASE}/api/doc-links`);
  assert.equal(calls[0].init.method, 'POST');
  assert.equal(calls[0].init.headers.authorization, `Bearer ${DOC_TOKEN}`);
  assert.ok(calls[0].init.signal instanceof AbortSignal, 'the upstream call carries the timeout signal');
  const sent = calls[0].init.body;
  assert.deepEqual([...sent.keys()].sort(), ['customer', 'file', 'source']);
  assert.equal(sent.getAll('source').length, 1);
  assert.equal(sent.get('source'), 'command-center');
  assert.equal(sent.get('customer'), 'Roy Meyreles', 'whitespace collapsed');
  assert.equal(sent.get('file').name, 'scan.pdf');
  assert.doesNotMatch(await response.text(), new RegExp(DOC_TOKEN));
});

test('doc links: list handler maps an upstream 401 to 502 DOC_LINKS_AUTH', async () => {
  for (const status of [401, 403]) {
    const { calls, fetcher } = recorder(new Response('Unauthorized: synthetic worker detail', { status }));
    const response = await docLinksHandler(await docCtx(), fetcher);
    assert.equal(response.status, 502);
    const body = await response.json();
    assert.equal(body.code, 'DOC_LINKS_AUTH');
    assert.doesNotMatch(JSON.stringify(body), /synthetic worker/);
    assert.equal(calls[0].url, `${DEFAULT_DOC_LINK_API_BASE}/api/doc-links`);
  }
});

// ---------------------------------------------------------- server/homeQuote.ts

const address = '123 Example St, Elkin, NC 28621';
const homeCtx = async () => ({ env, next, request: await signed('/api/home-quote', { method: 'POST', json: { address } }) });

test('home quote: an upstream that never answers is cut off by the 22 s timer and reported as a timeout, not thrown', async (t) => {
  // The handler owns its timeout (no injection), so the clock is faked: tick past 22 s and
  // the fetcher, which only settles on abort, rejects the way undici would.
  const context = await homeCtx();
  let started;
  const fetcherCalled = new Promise(resolve => { started = resolve; });
  const fetcher = (url, init) => new Promise((resolve, reject) => {
    init.signal.addEventListener('abort', () => reject(new DOMException('The operation was aborted.', 'AbortError')), { once: true });
    started();
  });
  t.mock.timers.enable({ apis: ['setTimeout'] });
  try {
    const pending = homeQuoteHandler(context, fetcher);
    await fetcherCalled;
    t.mock.timers.tick(21_999);
    assert.equal(await Promise.race([pending, Promise.resolve('still waiting')]), 'still waiting');
    t.mock.timers.tick(1);
    const response = await pending;
    assert.equal(response.status, 502);
    assert.match((await response.json()).error, /timed out/);
  } finally { t.mock.timers.reset(); }
});

test('home quote: a non-JSON upstream body becomes a clean 502 and never throws', async () => {
  for (const status of [200, 503]) {
    const response = await homeQuoteHandler(await homeCtx(), async () => new Response('<html>synthetic gateway page</html>', { status, headers: { 'content-type': 'text/html' } }));
    assert.equal(response.status, 502);
    assert.match(response.headers.get('content-type'), /application\/json/);
    const body = await response.json();
    assert.match(body.error, /Your interview is unchanged/);
    assert.doesNotMatch(JSON.stringify(body), /synthetic gateway/);
  }
});
