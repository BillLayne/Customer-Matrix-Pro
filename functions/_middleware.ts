const COOKIE_NAME = 'customer_matrix_pro_auth';
const ONE_WEEK = 60 * 60 * 24 * 7;

type PagesFunction<Env = Record<string, unknown>> = (context: {
  request: Request;
  env: Env;
  next: () => Promise<Response>;
}) => Response | Promise<Response>;

const renderLoginPage = (message = '') => `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Customer Matrix Pro Access</title>
    <style>
      :root {
        color-scheme: light;
        --ink: #081225;
        --brand: #003f87;
        --brand-2: #0076d3;
        --paper: #f4f8fc;
        --card: rgba(255,255,255,0.92);
        --line: rgba(8, 18, 37, 0.12);
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        font-family: Inter, system-ui, sans-serif;
        background:
          radial-gradient(circle at top, rgba(0,118,211,0.18), transparent 42%),
          linear-gradient(145deg, #eaf2fb 0%, #f8fbfe 45%, #eef4fb 100%);
        color: var(--ink);
        display: grid;
        place-items: center;
        padding: 24px;
      }
      .card {
        width: min(460px, 100%);
        background: var(--card);
        border: 1px solid var(--line);
        border-radius: 28px;
        box-shadow: 0 30px 80px -40px rgba(8, 18, 37, 0.45);
        padding: 32px;
        backdrop-filter: blur(16px);
      }
      .badge {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        padding: 12px 14px;
        border-radius: 18px;
        background: linear-gradient(135deg, var(--brand), var(--brand-2));
        color: #fff;
        font-size: 12px;
        font-weight: 800;
        letter-spacing: 0.18em;
        text-transform: uppercase;
      }
      h1 {
        margin: 22px 0 8px;
        font-size: clamp(2rem, 5vw, 2.7rem);
        line-height: 0.98;
        letter-spacing: -0.04em;
      }
      p {
        margin: 0;
        color: #526173;
        line-height: 1.6;
      }
      form {
        margin-top: 24px;
      }
      input {
        width: 100%;
        border: 1px solid var(--line);
        border-radius: 18px;
        padding: 16px 18px;
        font-size: 16px;
        outline: none;
      }
      input:focus {
        border-color: var(--brand-2);
        box-shadow: 0 0 0 4px rgba(0,118,211,0.12);
      }
      button {
        width: 100%;
        margin-top: 14px;
        border: 0;
        border-radius: 18px;
        padding: 16px 18px;
        font-size: 13px;
        font-weight: 900;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        cursor: pointer;
        color: #fff;
        background: linear-gradient(135deg, var(--brand), var(--brand-2));
      }
      .message {
        margin-top: 16px;
        padding: 12px 14px;
        border-radius: 14px;
        background: rgba(179, 29, 29, 0.08);
        color: #8f1f1f;
        font-size: 14px;
        ${message ? '' : 'display:none;'}
      }
      .hint {
        margin-top: 18px;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.14em;
        color: #708195;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="badge">Bill Layne Insurance</div>
      <h1>Customer Matrix Pro</h1>
      <p>Enter the access password to open the hosted dashboard.</p>
      <form method="POST" action="/login">
        <input
          type="password"
          name="password"
          placeholder="Password"
          autocomplete="current-password"
          autofocus
        />
        <button type="submit">Unlock Dashboard</button>
      </form>
      <div class="message">${message}</div>
      <div class="hint">Protected internal workspace</div>
    </div>
  </body>
</html>`;

const unauthorized = (message = '') =>
  new Response(renderLoginPage(message), {
    status: 401,
    headers: {
      'content-type': 'text/html; charset=UTF-8',
      'cache-control': 'no-store',
    },
  });

const getCookieValue = (cookieHeader: string | null, name: string) => {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
};

export const onRequest: PagesFunction<{ SITE_PASSWORD?: string }> = async (context) => {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const sitePassword = env.SITE_PASSWORD || '1993';
  const cookie = getCookieValue(request.headers.get('cookie'), COOKIE_NAME);

  if (url.pathname === '/logout') {
    return new Response(null, {
      status: 302,
      headers: {
        location: '/',
        'set-cookie': `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
      },
    });
  }

  if (url.pathname === '/login' && request.method === 'POST') {
    const form = await request.formData();
    const submittedPassword = String(form.get('password') || '');

    if (submittedPassword === sitePassword) {
      return new Response(null, {
        status: 302,
        headers: {
          location: '/',
          'set-cookie': `${COOKIE_NAME}=approved; Path=/; HttpOnly; SameSite=Lax; Max-Age=${ONE_WEEK}; Secure`,
        },
      });
    }

    return unauthorized('That password was not accepted. Try again.');
  }

  if (cookie === 'approved') {
    return next();
  }

  return unauthorized();
};
