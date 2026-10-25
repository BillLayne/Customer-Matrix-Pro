# Agency Command Center

Bill Layne Insurance's agent dashboard: Unified Search, 45 agency tools, shared contact numbers, Audit Memo, property helpers, and the full BLI image library.

- Live: https://customer-matrix-pro.pages.dev/
- GitHub: https://github.com/BillLayne/Customer-Matrix-Pro
- Local: `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro`
- Staff companion: https://agency-staff-dashboard.pages.dev/

Read `CUSTOMER_MATRIX_PRO_AI_HANDOFF.md` before editing. It documents source ownership, launcher versioning, protected APIs, shared D1 contacts, image hosting, and deployment safeguards. `RELEASE_2026_09_07.md` records the latest review and verification.

## Development

Requires Node.js 22.18+ for the synthetic TypeScript/SQLite tests. Enable the tracked pre-commit secret scan once per clone.

```powershell
npm ci
git config core.hooksPath .githooks
npm run check
```

`npm run check` is lint (`tsc --noEmit`, strict), the Node test suite and the production build.

The full app runs through Cloudflare Pages Functions. Configure ignored `.dev.vars` with private `SITE_PASSWORD`, `SESSION_SECRET`, and `GEMINI_API_KEY`. Never place secrets in frontend build variables. Initialize local contacts and start the built app:

```powershell
npx wrangler d1 execute agency-shared-contacts --local --file migrations/0001_shared_contacts.sql
npx wrangler d1 execute agency-shared-contacts --local --file migrations/0002_login_attempts.sql
npx wrangler pages dev dist --port 8788
```

For hot-reload UI development, `npm run dev` proxies API/sign-in requests to port 8788. Vite alone does not test the production password gate.

## Publishing

Only deploy with Bill's explicit approval. Review existing edits, commit and push approved files, then:

```powershell
npm run deploy
```

That runs the checks first and deploys `dist` with the repo's pinned wrangler. New D1 migrations are applied separately: `npx wrangler d1 migrations apply agency-shared-contacts --remote` (and `agency-shared-contacts-preview`).

Preview deployments use a separate contact database. Production and staff share `agency-shared-contacts`; do not seed it with synthetic test records. Both dashboards require private signed sessions. Backup files and credentials stay outside the public repositories.

The old Gemini key was invalid during the September 7 review. Backend migration and recovery are implemented, but a current key is required before live AI generation can be marked verified. Gmail Engineering was removed from the tree on 2026-10-25 (tag `pre-cleanup-2026-10-25` keeps it).
