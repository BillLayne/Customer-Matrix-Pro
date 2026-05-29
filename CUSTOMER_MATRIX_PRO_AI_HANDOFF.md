# Agency Command Matrix Handoff

Last updated: May 29, 2026

## Project Identity

- Working name: `Agency Command Matrix`
- Repo name: `Customer-Matrix-Pro`
- Owner: Bill Layne
- Business: Bill Layne Insurance Agency
- Purpose: Bill's personal internal dashboard and agency command center
- Local repo: `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro`
- GitHub repo: `https://github.com/BillLayne/Customer-Matrix-Pro`
- Live site: `https://customer-matrix-pro.pages.dev/`
- Cloudflare Pages project: `customer-matrix-pro`

This is Bill's personal dashboard. It is separate from the staff-facing dashboard:

- Local repo: `C:\Users\bill\OneDrive\Documents\Playground\Agency-Staff-Dashboard`
- GitHub repo: `https://github.com/BillLayne/agency-staff-dashboard`
- Live site: `https://agency-staff-dashboard.pages.dev/`

## Product Purpose

Agency Command Matrix is Bill's all-in-one browser dashboard for day-to-day agency work.

The dashboard should make it fast to:

- search Agency Matrix by customer name or address
- launch the most-used agency tools from one page
- generate Gmail-safe insurance emails
- manage customer document workflows
- open property, quote, proof, certificate, image, and texting tools

Search Matrix is the center of the product. Most work starts with a customer name, property address, or Agency Matrix lookup, then moves into communication, documents, or property tools.

## First-Read Files

Read these before changing behavior:

1. `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\CUSTOMER_MATRIX_PRO_AI_HANDOFF.md`
2. `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\GMAIL_ENGINEERING_STUDIO_HANDOFF.md`
3. `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\App.tsx`
4. `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\components\SearchCard.tsx`
5. `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\components\ProgramLauncher.tsx`
6. `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\components\AiAssistant.tsx`
7. `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\services\geminiService.ts`
8. `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\services\emailEngine.ts`
9. `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\services\poiTemplate.ts`
10. `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\functions\_middleware.ts`
11. `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\constants.ts`

## Current UX Strategy

Core rule: keep Search Matrix high, obvious, and visually important.

The current homepage structure is:

1. Sticky branded top header
2. Quick action row
3. Search workspace
4. Guided workflow lane cards
5. Gmail Engineering Studio
6. Quick image tools
7. Program launcher

The app has intentionally moved away from a pure tool wall. It now uses quick-start cards, workflow lanes, featured launchers, and recent-tool memory so the dashboard is still power-user friendly but easier for another person to understand.

Current workflow lane groups in `App.tsx`:

- Communicate
- Create Documents
- Coverage & Property
- Image & Content

Current high-level quick actions in `App.tsx`:

- Send Docs
- SMS Center
- Gmail Studio
- Certificates
- POI Generator
- Insurance Cards
- NC Property Tools
- Rebuild Estimator
- Condo Calculator

## Primary Files By Purpose

### App Shell

`App.tsx`

Controls the overall page layout, quick action cards, workflow sections, modal/open state, and toast messaging.

### Search Workspace

`components\SearchCard.tsx`

Handles Agency Matrix search, people/address searches, property lookup helpers, web search support, and OneDrive/client-folder search support.

Keep this section visually prominent. It is the core interaction.

### Program Launcher

`components\ProgramLauncher.tsx`

This is the launcher source of truth. Inspect it first when a tool label, URL, category, featured launcher, most-used item, recent-tool behavior, or local-vs-hosted route is wrong.

### Gmail Engineering Studio

Key files:

- `components\AiAssistant.tsx`
- `services\geminiService.ts`
- `services\emailEngine.ts`
- `services\poiTemplate.ts`
- `constants.ts`

Purpose:

- Gmail-safe template generation
- Proof of Insurance email generation
- template refinement
- preview and download
- Gmail validation and handoff
- carrier logo normalization

Treat these files as high-risk shared system files. Small changes can affect many template types at once.

Current Gmail facts:

- the visible template builder now uses `Proof of Insurance` instead of `Proof of Insurance / ID Card`
- the Gmail rules are Bill Layne-specific and Gmail-safe
- prompt rules, wrapper logic, validation, and carrier branding interact across files
- the related handoff is `GMAIL_ENGINEERING_STUDIO_HANDOFF.md`

Recent Gmail fix:

- a receipt-template bug duplicated the agency and carrier header/hero sequence
- the root cause was in the normalization/repair layer, not only the AI draft
- the affected files were `services\emailEngine.ts`, `services\geminiService.ts`, and `constants.ts`
- if the main worktree has unrelated edits, use a clean temporary clone for targeted Gmail production fixes

### Image Upload And Quick Links

Key files:

- `components\QuickImageLinksCard.tsx`
- `services\imgurService.ts`

Purpose:

- upload images to Imgur
- copy hosted image links quickly
- keep recent upload references

### Access Gate

`functions\_middleware.ts`

Protects the live dashboard with Cloudflare Pages password middleware.

Important middleware details:

- cookie name: `customer_matrix_pro_auth`
- approved cookie value: `approved`
- login route: `/login`
- logout route: `/logout`
- env variable: `SITE_PASSWORD`
- cookie lifetime: one week
- unauthenticated terminal requests to the live site can return `401 Unauthorized`; this is expected

## Launcher Inventory

This section reflects the active launcher definitions in `components\ProgramLauncher.tsx`.

### Operations

| Tool | URL or route |
| --- | --- |
| Send Documents | `https://www.sendbilldocs.com/agent.html` |
| Quote Drip Follow Up | `https://quote-follow-up-manager-cloudflare.pages.dev/` |
| AI Task Manager | `https://ai-task-manager.bill-7e3.workers.dev` |
| SMS Command Center | `https://agency-sms-command-center.bill-7e3.workers.dev` |
| HTML Studio | `/html-studio.html` |
| Agency Website | `https://www.billlayneinsurance.com` |

Agency Website local source:

- `C:\Users\bill\OneDrive\Documents\Playground\Bill-Layne-Insurance-Agency\index.html`

### Documents And Forms

| Tool | URL or route |
| --- | --- |
| Insurance Card Generator | `https://insurance-card-generator-2026-color-edition.pages.dev/` |
| POI Generator | `https://bill-layne-insurance-poi-generator.pages.dev` |
| Certificates | `https://coi-certificates-certguard-ai.pages.dev/` |
| Envelope Maker | `https://envelope-maker-cte.pages.dev` |
| Receipt Maker | `https://billlayne.github.io/Receipt-Maker/index.html` |
| NC Grange Down Payment | `/nc-grange-down-payment-calculator.html` |
| Quote Template Studio | `https://quote-template-studio.pages.dev/` |
| PDF Quote Creator | `https://insurance-quote-image-creator.bill-7e3.workers.dev/` |
| Photo Guide Creator | `/photo-guide-composer.html` |
| DL123 Generator | `/dl123-generator/index.html` |
| Cancellation Link Generator | `https://thecancellationform.com/link-generator.html` |
| No Loss Form Generator | `https://mynolossform.com/agent-portal.html` |

Important local sources:

- Insurance Card Generator: `C:\Users\bill\OneDrive\Documents\Playground\insurance-card-generator-2026-color-edition\index.html`
- POI Generator: `C:\Users\bill\OneDrive\Documents\Playground\bill-layne-insurance-poi-generator\index.html`
- Envelope Maker: `C:\Users\bill\OneDrive\Documents\Envelope-Maker\index.html`

### Property And Coverage

| Tool | URL |
| --- | --- |
| Home Inventory | `https://billlayne.github.io/HOME-INVENTORY/` |
| Home Rebuild Estimator | `https://home-rebuild-estimator.pages.dev` |
| Condo Coverage Calculator | `https://condo-coverage-calculator.pages.dev` |
| NC Tools Property Lookup | `https://nc-insurance-tools-gemini.pages.dev/` |

Important local sources:

- Home Inventory: `C:\Users\bill\OneDrive\Documents\Playground\HOME-INVENTORY\index.html`
- Home Rebuild Estimator: `C:\Users\bill\OneDrive\Documents\Playground\HOME-REBUILD-ESTIMATOR\public\index.html`
- Condo Coverage Calculator: `C:\Users\bill\OneDrive\Documents\Playground\CONDO-COVERAGE-CALCULATOR\public\index.html`

## Static Tools Hosted In This Repo

These files are deployed as static Cloudflare Pages assets, not React routes:

- `public\html-studio.html`
- `public\nc-grange-down-payment-calculator.html`
- `public\photo-guide-composer.html`
- `public\dl123-generator\index.html`

If one of these tools needs a change, update it directly in this repo.

## Tech Stack

- React 19
- TypeScript
- Vite
- Cloudflare Pages
- Cloudflare Pages Functions
- `@google/genai`
- localStorage for recent/history behavior

There is no traditional database. The app is mainly frontend rendering, launcher routing, Gemini-powered generation, static utility hosting, and Cloudflare middleware protection.

## Repository Structure

Important folders:

- `components` - major UI sections
- `services` - Gmail, Gemini, Imgur, POI, and helper logic
- `public` - hosted static HTML tools and assets
- `functions` - Cloudflare Pages middleware
- `hooks` - local storage and shared hooks
- `dist` - built output
- `.wrangler` - local Wrangler state

Important root files:

- `App.tsx`
- `index.tsx`
- `constants.ts`
- `types.ts`
- `vite.config.ts`
- `package.json`
- `.env.local`
- `.dev.vars`

## Environment Variables

Do not put real secret values into handoff docs, code, or chat.

`.env.local`:

- local path: `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\.env.local`
- primary variable: `GEMINI_API_KEY`
- fallback patterns seen in code/troubleshooting: `GOOGLE_API_KEY`, `API_KEY`

`.dev.vars`:

- local path: `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\.dev.vars`
- used for Cloudflare deployment and local process env
- expected variables: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `SITE_PASSWORD`

Important env behavior:

Windows user-level environment variables can override what ends up getting used during builds. If the live site acts like it is using an old Gemini key:

1. check `.env.local`
2. check Windows user-level `GEMINI_API_KEY`
3. rebuild with the intended key explicitly loaded
4. redeploy Pages

This has already caused production trouble before.

## Build And Deploy

Run from:

`C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro`

Local validation:

```powershell
npm run lint
npm run build
```

Direct Cloudflare Pages deploy:

```powershell
$env:GEMINI_API_KEY=[Environment]::GetEnvironmentVariable('GEMINI_API_KEY','User')
$vars = Get-Content '.dev.vars' | Where-Object { $_ -match '^[A-Z0-9_]+=' }
foreach ($line in $vars) {
  $name, $value = $line -split '=', 2
  [Environment]::SetEnvironmentVariable($name, $value, 'Process')
}
npx wrangler pages deploy dist --project-name customer-matrix-pro
```

Deployment note:

This repo is often dirty with legitimate in-progress work. For small targeted production fixes, especially in Gmail Engineering, a clean temporary clone can be safer than deploying from the live working tree.

## Backup And Source Of Truth

Primary backup layers:

1. local repo
2. GitHub repo
3. Cloudflare Pages deployment

Main sources:

- local repo: `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro`
- GitHub: `https://github.com/BillLayne/Customer-Matrix-Pro`
- live site: `https://customer-matrix-pro.pages.dev/`

Related backup/reference files:

- `C:\Users\bill\OneDrive\Documents\Playground\PROGRAM_BACKUP_RESOURCE_LIST.md`
- `C:\Users\bill\OneDrive\Documents\Playground\program-backup-index.html`

## Operational Rules For New Agents

1. Keep Search Matrix as the main focus.
2. Treat `components\ProgramLauncher.tsx` as the launcher source of truth.
3. Treat Gmail Engineering files as high-risk shared system files.
4. Remember the live site is password protected.
5. If a launcher change affects both Bill and staff, check whether `Agency-Staff-Dashboard` also needs the update.
6. If a hosted utility lives in `public`, update it in this repo directly.
7. Do not expose secrets in docs, code, browser output, or chat.
8. For targeted production fixes, consider a clean temporary clone if the main worktree is busy with unrelated edits.

## Copy/Paste Brief

```text
This project is Bill Layne Insurance's personal Agency Command Matrix dashboard.

Repo:
C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro

GitHub:
https://github.com/BillLayne/Customer-Matrix-Pro

Live site:
https://customer-matrix-pro.pages.dev/

Read these first:
1. CUSTOMER_MATRIX_PRO_AI_HANDOFF.md
2. GMAIL_ENGINEERING_STUDIO_HANDOFF.md
3. App.tsx
4. components/SearchCard.tsx
5. components/ProgramLauncher.tsx
6. components/AiAssistant.tsx
7. services/geminiService.ts
8. services/emailEngine.ts
9. services/poiTemplate.ts
10. functions/_middleware.ts
11. constants.ts

Important:
- Search Matrix stays the main focus.
- ProgramLauncher.tsx is the launcher source of truth.
- The Auto ID Card / Insurance Card launcher points to the color edition:
  https://insurance-card-generator-2026-color-edition.pages.dev/
- The live site is password protected, so unauthenticated requests may return 401.
- Gmail Engineering is centered in geminiService.ts and emailEngine.ts and is high-risk.
- Static tools in /public are real deployed utilities, not examples.
- Gemini key troubleshooting must consider both .env.local and Windows user-level environment variables.
- For small urgent fixes, a clean temporary deploy clone can be the safest path.
```

## Current Status

This is the current complete handoff for Bill Layne's Agency Command Matrix dashboard as of May 29, 2026.

It replaces the older May 24, 2026 version and records:

- the current launcher inventory
- the Insurance Card generator color-edition live link
- the Gmail Engineering duplicate-header fix notes
- the deployment guidance for dirty-worktree situations
