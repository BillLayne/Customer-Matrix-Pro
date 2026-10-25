export interface AuthEnv {
  SITE_PASSWORD?: string;
  SESSION_SECRET?: string;
  /** Bump this var in the Pages dashboard to sign every device out at once. */
  SESSION_VERSION?: string;
  APP_ID?: string;
  APP_NAME?: string;
  /** D1 binding shared with contacts; used here only for the login attempt counter. */
  CONTACTS_DB?: LoginAttemptDatabase;
}

export interface LoginAttemptStatement {
  bind(...values: unknown[]): LoginAttemptStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  run(): Promise<unknown>;
}
export interface LoginAttemptDatabase { prepare(sql: string): LoginAttemptStatement }

export interface PagesContext<E = AuthEnv> {
  request: Request;
  env: E;
  next: () => Promise<Response>;
}

export const SESSION_SECONDS = 24 * 60 * 60;
const encoder = new TextEncoder();
const encode = (value: Uint8Array) => btoa(String.fromCharCode(...value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const decode = (value: string) => Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), char => char.charCodeAt(0));
export const appId = (env: AuthEnv) => env.APP_ID || 'customer-matrix-pro';
// __Host- cookies are locked to this origin, Secure and Path=/ by the browser itself.
export const cookieName = (env: AuthEnv) => appId(env) === 'agency-staff-dashboard' ? '__Host-agency_staff_session' : '__Host-customer_matrix_pro_session';
export const authConfigured = (env: AuthEnv) => Boolean(env.SITE_PASSWORD && env.SESSION_SECRET && env.SESSION_SECRET.length >= 32);

async function signingKey(env: AuthEnv) {
  if (!authConfigured(env)) throw new Error('Authentication is not configured.');
  // Rotating either server credential invalidates existing sessions.
  return crypto.subtle.importKey('raw', encoder.encode(`${env.SESSION_SECRET}:${env.SITE_PASSWORD}:${env.SESSION_VERSION || '1'}`), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function passwordMatches(input: string, expected: string) {
  const [left, right] = await Promise.all([input, expected].map(async value => new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value)))));
  return left.reduce((difference, byte, index) => difference | (byte ^ right[index]), 0) === 0;
}

export async function createSession(env: AuthEnv, now = Date.now()) {
  const issued = Math.floor(now / 1000);
  const payload = encode(encoder.encode(JSON.stringify({ aud: appId(env), iat: issued, exp: issued + SESSION_SECONDS, nonce: crypto.randomUUID() })));
  const signature = await crypto.subtle.sign('HMAC', await signingKey(env), encoder.encode(payload));
  return `${payload}.${encode(new Uint8Array(signature))}`;
}

export async function verifySession(token: string | undefined, env: AuthEnv, now = Date.now()) {
  if (!token || token.length > 2048 || !authConfigured(env)) return false;
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return false;
    const valid = await crypto.subtle.verify('HMAC', await signingKey(env), decode(parts[1]), encoder.encode(parts[0]));
    if (!valid) return false;
    const claims = JSON.parse(new TextDecoder().decode(decode(parts[0])));
    const current = Math.floor(now / 1000);
    return claims.aud === appId(env) && Number.isInteger(claims.iat) && Number.isInteger(claims.exp)
      && claims.iat <= current + 60 && claims.exp > current && claims.exp - claims.iat === SESSION_SECONDS;
  } catch { return false; }
}

export function readSession(request: Request, env: AuthEnv) {
  return request.headers.get('cookie')?.split(';').map(part => part.trim()).find(part => part.startsWith(`${cookieName(env)}=`))?.slice(cookieName(env).length + 1);
}

export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return false;
  return request.headers.get('sec-fetch-site') !== 'cross-site';
}

// ---------------------------------------------------------------------------
// Login attempt limiter. One shared password means guessing speed is the whole
// game, so failures are counted per client address and overall. Counts live in
// D1 (table login_attempts, migration 0002) so every isolate sees them; if the
// binding or table is missing the counter falls back to this isolate's memory,
// which still slows a single-isolate attacker and never blocks sign-in outright.
export const LOGIN_WINDOW_SECONDS = 15 * 60;
export const LOGIN_MAX_PER_ADDRESS = 10;
export const LOGIN_MAX_OVERALL = 100;
const memoryAttempts = new Map<string, { count: number; windowStart: number }>();

const clientKeys = (request: Request) => ['all', `ip:${request.headers.get('cf-connecting-ip') || 'unknown'}`];

async function readAttempts(env: AuthEnv, key: string, now: number) {
  const since = now - LOGIN_WINDOW_SECONDS * 1000;
  if (env.CONTACTS_DB) {
    try {
      const row = await env.CONTACTS_DB.prepare('SELECT count, window_start FROM login_attempts WHERE key = ?1').bind(key).first<{ count: number; window_start: number }>();
      return row && row.window_start >= since ? { count: Number(row.count), windowStart: Number(row.window_start) } : null;
    } catch { /* table not migrated yet: use memory */ }
  }
  const row = memoryAttempts.get(key);
  return row && row.windowStart >= since ? row : null;
}

/** Seconds the caller must wait before another sign-in attempt, or 0. */
export async function loginRetryAfter(env: AuthEnv, request: Request, now = Date.now()) {
  const [overall, address] = await Promise.all(clientKeys(request).map(key => readAttempts(env, key, now)));
  const blocked = [[overall, LOGIN_MAX_OVERALL], [address, LOGIN_MAX_PER_ADDRESS]] as const;
  let wait = 0;
  for (const [row, max] of blocked) {
    if (row && row.count >= max) wait = Math.max(wait, Math.ceil((row.windowStart + LOGIN_WINDOW_SECONDS * 1000 - now) / 1000));
  }
  return wait;
}

export async function recordLoginFailure(env: AuthEnv, request: Request, now = Date.now()) {
  const since = now - LOGIN_WINDOW_SECONDS * 1000;
  for (const key of clientKeys(request)) {
    if (env.CONTACTS_DB) {
      try {
        await env.CONTACTS_DB.prepare(
          'INSERT INTO login_attempts (key, count, window_start) VALUES (?1, 1, ?2) ON CONFLICT(key) DO UPDATE SET count = CASE WHEN window_start < ?3 THEN 1 ELSE count + 1 END, window_start = CASE WHEN window_start < ?3 THEN ?2 ELSE window_start END'
        ).bind(key, now, since).run();
        continue;
      } catch { /* fall back to memory */ }
    }
    const row = memoryAttempts.get(key);
    memoryAttempts.set(key, row && row.windowStart >= since ? { count: row.count + 1, windowStart: row.windowStart } : { count: 1, windowStart: now });
  }
}

export async function clearLoginFailures(env: AuthEnv, request: Request) {
  const [, address] = clientKeys(request);
  memoryAttempts.delete(address);
  if (env.CONTACTS_DB) {
    try { await env.CONTACTS_DB.prepare('DELETE FROM login_attempts WHERE key = ?1').bind(address).run(); } catch { /* best effort */ }
  }
}

/** Test hook: forget in-memory counts. */
export function resetLoginMemory() { memoryAttempts.clear(); }

export function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } });
}

export async function requireSession(request: Request, env: AuthEnv): Promise<Response | null> {
  if (!authConfigured(env)) return json({ error: 'Sign-in is temporarily unavailable. Please contact the agency administrator.', code: 'AUTH_NOT_CONFIGURED' }, 503);
  if (!(await verifySession(readSession(request, env), env))) return json({ error: 'Your session expired. Sign in again; your unsaved work stays on this device.', code: 'SESSION_EXPIRED', loginUrl: '/login' }, 401);
  if (!['GET', 'HEAD'].includes(request.method) && !sameOrigin(request)) return json({ error: 'This request must come from the dashboard.' }, 403);
  return null;
}

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));

export function loginPage(env: AuthEnv, message = '', status = 401) {
  const title = escapeHtml(env.APP_NAME || 'Agency Command Center');
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Sign in | ${title}</title><link rel="icon" href="data:,"><style>
  *{box-sizing:border-box}body{margin:0;background:#f3f4f6;color:#17212d;font-family:system-ui,sans-serif;min-height:100dvh;display:grid;place-items:center;padding:20px}main{width:min(420px,100%);border:1px solid #d6dbe2;border-radius:8px;background:white;padding:28px}h1{font-size:24px;line-height:1.2;margin:8px 0 24px}p{color:#526070;font-size:14px;line-height:1.5}label{display:block;font-size:14px;font-weight:600;margin-bottom:8px}input,button{width:100%;min-height:48px;border-radius:6px;font:inherit;padding:12px}input{border:1px solid #aab5c3;margin-bottom:16px}button{background:#003f87;color:white;border:0;font-weight:600;cursor:pointer}input:focus-visible,button:focus-visible{outline:3px solid #77b8eb;outline-offset:3px}.error{padding:12px;background:#fff1f2;color:#9f1239;border:1px solid #fecdd3;border-radius:6px}.brand{color:#003f87;font-weight:700}</style></head><body><main><p class="brand">Bill Layne Insurance</p><h1>${title}</h1>${message ? `<p class="error" role="alert">${escapeHtml(message)}</p>` : ''}<form method="post" action="/login"><label for="password">Agency access password</label><input id="password" name="password" type="password" autocomplete="current-password" required autofocus maxlength="256"><button type="submit">Sign in</button></form></main></body></html>`, { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; img-src data:; form-action 'self'; frame-ancestors 'none'; base-uri 'none'" } });
}

export async function authenticationMiddleware(context: PagesContext) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const isApi = url.pathname.startsWith('/api/');
  if (!authConfigured(env)) return isApi ? json({ error: 'Sign-in is temporarily unavailable.', code: 'AUTH_NOT_CONFIGURED' }, 503) : loginPage(env, 'Sign-in is temporarily unavailable. Please contact the agency administrator.', 503);
  if (url.pathname === '/logout') {
    if (!['GET', 'POST'].includes(request.method)) return json({ error: 'Use GET or POST to sign out.' }, 405);
    if (!sameOrigin(request)) return json({ error: 'This request must come from the dashboard.' }, 403);
    return new Response(null, { status: 303, headers: { location: '/login', 'cache-control': 'no-store', 'set-cookie': `${cookieName(env)}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0` } });
  }
  if (url.pathname === '/login' && request.method === 'POST') {
    if (!sameOrigin(request)) return loginPage(env, 'Please sign in from this dashboard.', 403);
    if (Number(request.headers.get('content-length') || 0) > 4096) return loginPage(env, 'Please enter a valid password.', 413);
    const wait = await loginRetryAfter(env, request);
    if (wait > 0) return loginPage(env, `Too many sign-in attempts. Try again in ${Math.max(1, Math.ceil(wait / 60))} minute${wait > 60 ? 's' : ''}.`, 429);
    let password = '';
    try { password = String((await request.formData()).get('password') || ''); } catch { return loginPage(env, 'Please enter your password.', 400); }
    if (password.length > 256 || !(await passwordMatches(password, env.SITE_PASSWORD!))) {
      await recordLoginFailure(env, request);
      // A fixed pause makes rapid guessing slower without hurting a person who mistyped.
      await new Promise(resolve => setTimeout(resolve, 300));
      return loginPage(env, 'That password was not accepted. Try again.');
    }
    await clearLoginFailures(env, request);
    const token = await createSession(env);
    return new Response(null, { status: 303, headers: { location: '/', 'cache-control': 'no-store', 'set-cookie': `${cookieName(env)}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_SECONDS}` } });
  }
  const authorized = await verifySession(readSession(request, env), env);
  if (!authorized) return isApi ? json({ error: 'Your session expired. Sign in again; your unsaved work stays on this device.', code: 'SESSION_EXPIRED', loginUrl: '/login' }, 401) : loginPage(env);
  if (url.pathname === '/login') return new Response(null, { status: 303, headers: { location: '/', 'cache-control': 'no-store' } });
  if (!['GET', 'HEAD'].includes(request.method) && !sameOrigin(request)) return json({ error: 'This request must come from the dashboard.' }, 403);
  const upstream = await next();
  const headers = new Headers(upstream.headers);
  headers.set('x-content-type-options', 'nosniff');
  headers.set('referrer-policy', 'strict-origin-when-cross-origin');
  headers.set('x-frame-options', 'SAMEORIGIN');
  if (!url.pathname.startsWith('/assets/')) headers.set('cache-control', 'no-store');
  return new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers });
}
