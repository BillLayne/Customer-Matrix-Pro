# Agency Command Center

Bill Layne Insurance's agent dashboard: Unified Search, 45 agency tools, shared contact numbers, Audit Memo, property helpers, and the full BLI image library.

- Live: https://customer-matrix-pro.pages.dev/
- GitHub: https://github.com/BillLayne/Customer-Matrix-Pro
- Local: `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro`
- Staff companion: https://agency-staff-dashboard.pages.dev/

Read `CUSTOMER_MATRIX_PRO_AI_HANDOFF.md` before editing. It documents source ownership, launcher versioning, protected APIs, shared D1 contacts, image hosting, and deployment safeguards. `RELEASE_2026_09_07.md` records the latest review and verification.

## Development

Requires Node.js 22.18+ for the synthetic TypeScript/SQLite tests.

```powershell
npm ci
npm run lint
npm test
npm run build
```

The full app runs through Cloudflare Pages Functions. Configure ignored `.dev.vars` with private `SITE_PASSWORD`, `SESSION_SECRET`, and `GEMINI_API_KEY`. Never place secrets in frontend build variables. Initialize local contacts and start the built app:

```powershell
npx wrangler d1 execute agency-shared-contacts --local --file migrations/0001_shared_contacts.sql
npx wrangler pages dev dist --port 8788
```

For hot-reload UI development, `npm run dev` proxies API/sign-in requests to port 8788. Vite alone does not test the production password gate.

## Publishing

Only deploy with Bill's explicit approval. Review existing edits, run checks, commit and push approved files, then:

```powershell
npx wrangler pages deploy dist --project-name customer-matrix-pro --branch main
```

Preview deployments use a separate contact database. Production and staff share `agency-shared-contacts`; do not seed it with synthetic test records. Both dashboards require private signed sessions. Backup files and credentials stay outside the public repositories.

The old Gemini key was invalid during the September 7 review. Backend migration and recovery are implemented, but a current key is required before live AI generation can be marked verified. Gmail Engineering remains deliberately dormant.
