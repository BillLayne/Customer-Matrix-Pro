# Agency Command Center Handoff

Last updated: June 10, 2026

This is the complete current handoff for Bill Layne's personal Agency Command Center / Customer Matrix Pro dashboard.

## REDESIGN UPDATE — June 10, 2026 (read this first)

The dashboard was redesigned. Anything below that describes tabs or Gmail Engineering UI is now historical.

- **Gmail Engineering was removed from the UI.** `App.tsx` no longer imports `AiAssistant`. All Gmail files (`components/AiAssistant.tsx`, `constants.ts` templates, `services/emailDesignSystemV2.ts`, `geminiService.ts`, `emailEngine.ts`, `poiTemplate.ts`) are intact in the repo for a future rebuild — do not delete them.
- **The Search/Gmail/Tools tab system is gone.** The app is now one scrolling page: Unified Search → Quick Links row → Program Launcher → Quick Image Links. The `matrix-pro-layout-mode` localStorage key is no longer used.
- **Program Launcher was rebuilt** (`components/ProgramLauncher.tsx`, still the launcher source of truth): type-to-filter input, category pills (Operations / Documents & Forms / Property & Coverage), a **Pinned** section controlled by star toggles (localStorage `matrix-pro-pinned-programs`, seeded with Bill's most-used tools), and Recent chips (`matrix-pro-recent-programs` unchanged). Quick-start cards, workflow lanes, and featured collections were removed as redundant — every tool appears exactly once plus optional pin.
- **Styling normalized:** normal-case semibold type instead of black-weight uppercase micro-text, single brand accent (#003f87/#0076d3), compact tiles, color-coded category icons (blue/emerald/amber). Dark mode preserved.
- SearchCard kept ALL functionality (modes, GIS, Risk Intel, Audit Memo, carrier gateway) with restyled UI; Matrix Home/New Prospect moved out of SearchCard into the Quick Links row.
- Verified: `npm run lint`, `npm run build`, desktop + dark mode + 375px mobile (no horizontal overflow).

## 1. Project Identity

- Working name: `Agency Command Center`
- Previous/common name: `Agency Command Matrix`
- Repo name: `Customer-Matrix-Pro`
- Owner: Bill Layne
- Business: Bill Layne Insurance Agency
- Purpose: Bill's personal internal browser dashboard and agency command center
- Local repo: `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro`
- GitHub repo: `https://github.com/BillLayne/Customer-Matrix-Pro`
- Live protected site: `https://customer-matrix-pro.pages.dev/`
- Cloudflare Pages project: `customer-matrix-pro`

This dashboard is Bill's personal command center. It is separate from the staff-facing dashboard:

- Staff local repo: `C:\Users\bill\OneDrive\Documents\Playground\Agency-Staff-Dashboard`
- Staff GitHub repo: `https://github.com/BillLayne/agency-staff-dashboard`
- Staff live site: `https://agency-staff-dashboard.pages.dev/`

## 2. Product Purpose

Agency Command Center is Bill's all-in-one browser dashboard for daily agency work.

The app is designed to make these jobs fast:

- search Agency Matrix by customer name or address
- open customer/prospect search paths quickly
- launch the most-used agency tools from one page
- generate and refine Gmail-safe insurance emails
- manage proof, certificate, card, quote, renewal, receipt, image, and no-loss workflows
- open property, rebuild, condo, and coverage tools without hunting through bookmarks

The main UX principle is still:

**Unified Search / Agency Matrix search must stay the primary focus.**

Search is the first daily action. Gmail Engineering is the second major workflow. Tools and launchers support those jobs without taking over the page.

## 3. Current UX Structure

The homepage is now a tabbed workspace instead of one long scrolling wall.

Primary tabs in `App.tsx`:

- `Unified Search`
- `Gmail Engineering`
- `Tools`

Important current behavior:

- The active tab is stored in localStorage under `matrix-pro-layout-mode`.
- Default workspace behavior keeps Search first.
- Search stays visible without having to scroll.
- Gmail Engineering is reachable from the top tab row and from quick-start/workflow actions.
- Tools view contains workflow lanes, Quick Image Links, and Program Launcher.

Current visual structure:

1. Sticky branded top header
2. Desktop tab control and mobile tab bar
3. Search workspace with Agency Matrix search first
4. Gmail Engineering compact workspace
5. Tools workspace with quick-start cards, workflow lanes, quick image links, and guided Program Launcher
6. Quick Search popup
7. Help/shortcut modal
8. Toast notifications

## 4. First-Read Files

Read these before changing behavior:

1. `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\CUSTOMER_MATRIX_PRO_AI_HANDOFF.md`
2. `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\GMAIL_ENGINEERING_STUDIO_HANDOFF.md`
3. `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\App.tsx`
4. `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\components\SearchCard.tsx`
5. `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\components\ProgramLauncher.tsx`
6. `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\components\AiAssistant.tsx`
7. `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\constants.ts`
8. `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\services\emailDesignSystemV2.ts`
9. `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\services\geminiService.ts`
10. `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\services\emailEngine.ts`
11. `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\services\poiTemplate.ts`
12. `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\functions\_middleware.ts`

## 5. Primary Files By Purpose

### App Shell

File:

`C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\App.tsx`

Controls:

- overall page layout
- Search/Gmail/Tools tabs
- top header
- quick action buttons
- quick-start cards
- workflow lanes
- section switching
- Quick Search popup
- help modal
- theme toggle
- toast messaging

Current important app-level data:

- `quickActions`
- `workspaceTabs`
- `quickStartCards`
- `workflowGuides`
- `activeWorkspaceTab`
- `searchCount`
- `showQuickSearch`

Current quick actions in `App.tsx` include:

- Agency Matrix Home
- New Prospect
- Reports
- Carrier Contacts
- Customer Reference
- Renewal Gmail
- No Loss Forms

### Search Workspace

File:

`C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\components\SearchCard.tsx`

Purpose:

- Agency Matrix customer search
- name/address search
- web search
- real estate / property lookup helpers
- people search
- client folder / OneDrive helper behavior
- carrier gateway / supporting shortcuts

Do not bury this component. It is the center of Bill's dashboard.

### Gmail Engineering Studio

Primary files:

- `components\AiAssistant.tsx`
- `constants.ts`
- `services\emailDesignSystemV2.ts`
- `services\geminiService.ts`
- `services\emailEngine.ts`
- `services\poiTemplate.ts`
- `GMAIL_ENGINEERING_STUDIO_HANDOFF.md`

Purpose:

- generate Gmail-safe insurance HTML emails
- generate dedicated Proof of Insurance emails
- parse attached quote/policy PDFs
- refine generated templates
- validate Gmail HTML
- preview email output
- copy/download/print email output
- sync rich HTML to Gmail compose
- normalize carrier logos and email shell

Treat these as high-risk shared system files. Small changes can affect all template types.

### Program Launcher

File:

`C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\components\ProgramLauncher.tsx`

This is the launcher source of truth.

It controls:

- launcher inventory
- categories
- featured collections
- recent tools
- local-vs-hosted routing
- popup-open behavior
- localStorage key `matrix-pro-recent-programs`

If a launcher link is wrong, inspect this file first.

### Quick Image Links

Files:

- `components\QuickImageLinksCard.tsx`
- `services\imgurService.ts`

Purpose:

- upload JPG, PNG, and WEBP images to Imgur
- copy hosted links automatically
- keep recent uploaded image links in localStorage
- recent upload list is scrollable with `max-h-[26rem]`, `overflow-y-auto`, and `data-testid="quick-image-recent-uploads-scroll"`

### Static Public Tools

Folder:

`C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\public`

These are real deployed utility files, not examples:

- `public\html-studio.html`
- `public\nc-grange-down-payment-calculator.html`
- `public\photo-guide-composer.html`
- `public\receipt-maker.html`
- `public\dl123-generator\index.html`
- `public\dl123-generator\css\styles.css`
- `public\dl123-generator\js\scripts.js`

Carrier/static assets also live under `public`.

### Access Gate

File:

`C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\functions\_middleware.ts`

Purpose:

- protects the live dashboard with Cloudflare Pages middleware
- renders login page
- handles `/login`
- handles `/logout`

Important details:

- cookie name: `customer_matrix_pro_auth`
- approved cookie value: `approved`
- login route: `/login`
- logout route: `/logout`
- env variable: `SITE_PASSWORD`
- cookie lifetime: one week
- unauthenticated live checks return `401 Unauthorized`; that is expected

## 6. Gmail Engineering Current State

Gmail Engineering was recently repaired and compacted.

Recent commits:

- `691a148` - `Repair Gmail template routing`
- `7cb6748` - `Compact Gmail engineering workspace`

Current Gmail UI in `components\AiAssistant.tsx`:

- no large Gmail title band in Gmail tab mode
- compact `Setup & Brand` dropdown moved into the work container
- single `Template` dropdown in the compact top strip
- prompt draft and Generate Email button are high in the workspace
- Sync to Gmail appears inside the prompt/preview workflow, not as a bottom sticky bar
- quick favorite/prefill template buttons were removed
- browse-template drawer was removed in Gmail mode

Current Gmail routing fix:

- `selectedTemplateKey` is stored separately from `promptDraft`
- selecting a template sets both stable template key and editable prompt text
- editing the prompt no longer loses template identity
- POI routes by `selectedTemplateKey === 'poi'`
- text-based POI detection remains only as fallback when no template was selected
- generic email generation passes:
  - `templateKey`
  - `templateType`
  - `templateTitle`
  - `templateInstructions`
  - full `contract`

Current Gmail design/prompt architecture:

- `constants.ts` defines `TemplateType`, `TemplateContract`, `PROMPT_TEMPLATES`, `TEMPLATE_KEYS`, and `getTemplate()`
- `services\emailDesignSystemV2.ts` is the active authoritative Gmail design-system prompt
- `services\geminiService.ts` imports `EMAIL_DESIGN_SYSTEM_V2`
- `generateEmailTemplate()` formats the selected template contract into the Gemini request
- `detectTemplateType()` prefers explicit `templateType` and `templateKey` before title fallback

Important Gmail templates/contracts currently include:

- Auto Insurance Quote
- Home Insurance Quote
- Renters Insurance Quote
- Motorcycle Insurance Quote
- SR-22 Auto Quote
- Commercial Insurance Quote
- Rate Comparison
- Welcome / New Business
- Policy Renewal
- Payment Receipt
- Policy Change Confirmation
- Proof of Insurance
- Certificate of Insurance
- Cancellation Notice
- Claims Notice / Acknowledgement
- B2B Underwriter Correspondence
- Insurance Needs Analysis
- Marketing / Newsletter
- Referral Request / Thank-You
- Google Review Request

Dedicated POI path:

- `extractPoiEmailData()` in `services\geminiService.ts`
- `generatePoiEmail()` in `services\poiTemplate.ts`
- `normalizeGeneratedEmailHtml()` in `services\emailEngine.ts`

Important Gmail warning:

Do not assume a wrong template is only a prompt problem. Prior bugs came from the repair/normalization layer too, especially duplicate header/hero behavior. Always inspect:

- `components\AiAssistant.tsx`
- `constants.ts`
- `services\geminiService.ts`
- `services\emailEngine.ts`
- `services\poiTemplate.ts`

## 7. Launcher Inventory

This reflects the active definitions in `components\ProgramLauncher.tsx`.

### Operations

| Tool | Target |
| --- | --- |
| Send Documents | `https://www.sendbilldocs.com/agent.html` |
| Quote Drip Follow Up | `https://quote-follow-up-manager-cloudflare.pages.dev/` |
| AI Task Manager | `https://ai-task-manager.bill-7e3.workers.dev` |
| SMS Command Center | `https://agency-sms-command-center.bill-7e3.workers.dev` |
| Renewal Gmail Program | `https://renewal-gmail-program.pages.dev/` |
| HTML Studio | `/html-studio.html` |
| Agency Website | `https://www.billlayneinsurance.com` |

Agency Website local source:

`C:\Users\bill\OneDrive\Documents\Playground\Bill-Layne-Insurance-Agency\index.html`

### Documents & Forms

| Tool | Target |
| --- | --- |
| Insurance Card Generator | `https://insurance-card-generator-2026-color-edition.pages.dev/` |
| Carrier & Agency Contacts | `https://insurance-card-generator-2026-color-edition.pages.dev/contact-page-index` |
| Customer Reference Card | `https://insurance-card-generator-2026-color-edition.pages.dev/?builder=policy-reference&agency=1` |
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

### Property & Coverage

| Tool | Target |
| --- | --- |
| Home Inventory | `https://billlayne.github.io/HOME-INVENTORY/` |
| Home Rebuild Estimator | `https://home-rebuild-estimator.pages.dev` |
| Condo Coverage Calculator | `https://condo-coverage-calculator.pages.dev` |
| NC Tools Property Lookup | `https://nc-insurance-tools-gemini.pages.dev/` |

Important local sources:

- Home Inventory: `C:\Users\bill\OneDrive\Documents\Playground\HOME-INVENTORY\index.html`
- Home Rebuild Estimator: `C:\Users\bill\OneDrive\Documents\Playground\HOME-REBUILD-ESTIMATOR\public\index.html`
- Condo Coverage Calculator: `C:\Users\bill\OneDrive\Documents\Playground\CONDO-COVERAGE-CALCULATOR\public\index.html`

### Featured Launcher Collections

Current featured collections:

- `Most Used`
  - send docs
  - SMS command center
  - certificates
  - POI generator
  - insurance cards
  - PDF quote creator
  - no-loss

- `Coverage Lane`
  - NC property tools
  - home rebuild
  - condo coverage
  - home inventory
  - NC Grange down payment

- `Customer Shortcuts`
  - carrier contact pages
  - customer reference card
  - no-loss
  - renewal Gmail program

## 8. App Shell Shortcuts And Workflow Lanes

Quick actions in `App.tsx` include:

- Agency Matrix Home
- New Prospect
- Reports
- Carrier Contacts
- Customer Reference
- Renewal Gmail
- No Loss Forms

Quick-start cards include:

- Send documents
- Open SMS Command Center
- Jump to Gmail Engineering
- Start Proof/Certificates
- Launch Property Tools
- Open Image Tools

Workflow lane groups:

- Communicate
- Create Documents
- Coverage & Property
- Image & Content

Communicate lane includes:

- Send Docs
- SMS Center
- Gmail Studio
- Renewal Gmail

Create Documents lane includes:

- Certificates
- POI Generator
- Insurance Cards
- Carrier Contacts
- Reference Card

Image & Content lane includes:

- Quick Image Links
- HTML Studio
- PDF Quote Creator

## 9. Technology Stack

- React 19
- TypeScript
- Vite
- Cloudflare Pages
- Cloudflare Pages Functions
- `@google/genai`
- `marked`
- localStorage for recent/history behavior

There is no traditional database.

The app is mostly:

- frontend rendering
- launcher routing
- Gemini-powered Gmail generation
- POI extraction/rendering
- Imgur upload helper
- static utility hosting
- Cloudflare middleware protection

## 10. Repository Structure

Important folders:

- `components` - UI sections and cards
- `services` - Gemini, Gmail, Imgur, POI, and email helpers
- `public` - hosted static HTML tools and assets
- `functions` - Cloudflare Pages middleware
- `hooks` - shared hooks such as localStorage
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
- `CUSTOMER_MATRIX_PRO_AI_HANDOFF.md`
- `GMAIL_ENGINEERING_STUDIO_HANDOFF.md`

## 11. Environment Variables

Do not put real secret values into handoff docs, code, or chat.

`.env.local`:

- path: `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\.env.local`
- primary variable: `GEMINI_API_KEY`

Fallback patterns used in config:

- `GEMINI_API_KEY`
- `GOOGLE_API_KEY`
- `API_KEY`

`vite.config.ts` loads env in this order:

1. `env.GEMINI_API_KEY`
2. `process.env.GEMINI_API_KEY`
3. `process.env.GOOGLE_API_KEY`
4. `process.env.API_KEY`

It defines:

- `process.env.API_KEY`
- `process.env.GEMINI_API_KEY`

`.dev.vars`:

- path: `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\.dev.vars`
- used for Cloudflare deployment / local process env
- expected variables include:
  - `CLOUDFLARE_API_TOKEN`
  - `CLOUDFLARE_ACCOUNT_ID`
  - `SITE_PASSWORD`

Important env behavior:

Windows user-level environment variables can override what gets used during builds. If the live site behaves as if it is using an old Gemini key:

1. check `.env.local`
2. check Windows user-level `GEMINI_API_KEY`
3. rebuild with the intended key explicitly loaded
4. redeploy Pages

## 12. Build, Verify, Deploy

Run from:

`C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro`

Local checks:

```powershell
npm run lint
npm run build
```

Typical direct Cloudflare Pages deploy:

```powershell
$env:GEMINI_API_KEY=[Environment]::GetEnvironmentVariable('GEMINI_API_KEY','User')
if (Test-Path '.dev.vars') {
  $vars = Get-Content '.dev.vars' | Where-Object { $_ -match '^[A-Z0-9_]+=' }
  foreach ($line in $vars) {
    $name, $value = $line -split '=', 2
    [Environment]::SetEnvironmentVariable($name, $value, 'Process')
  }
}
npm run build
npx wrangler pages deploy dist --project-name customer-matrix-pro
```

Recent successful deployment facts:

- `npx wrangler --version` was `4.97.0`
- latest style/layout deploy preview was `https://09933da4.customer-matrix-pro.pages.dev`
- stable live URL remains `https://customer-matrix-pro.pages.dev/`
- protected live and preview URLs can return `401 Unauthorized` without the auth cookie

## 13. Git / Recent Commits

Recent important commits:

- `7cb6748` - `Compact Gmail engineering workspace`
- `691a148` - `Repair Gmail template routing`
- `8b89e8a` - `Condense Gmail engineering workspace`
- `79ccac6` - `Refine command center layout`
- `3c1b255` - `Improve Gmail engineering layout`
- `79baacc` - `Promote no loss form shortcut`
- `ed78048` - `Add customer shortcut links`
- `3e03034` - `Improve Matrix Pro workspace UX`

Current branch convention:

- main working branch is `main`
- remote is `origin`
- GitHub repo is `https://github.com/BillLayne/Customer-Matrix-Pro`

## 14. Operational Rules For New Agents

1. Keep Unified Search / Agency Matrix search as the main focus.
2. Keep Gmail Engineering compact and easy to generate from without scrolling.
3. Treat `components\ProgramLauncher.tsx` as launcher source of truth.
4. Treat Gmail Engineering files as high-risk shared system files.
5. Do not expose secrets in docs, code, screenshots, browser output, or chat.
6. Remember the live site is password protected; unauthenticated checks returning `401` are expected.
7. If a launcher change affects both Bill and staff, check whether `Agency-Staff-Dashboard` also needs the update.
8. If a hosted utility lives in `public`, update it in this repo directly.
9. For targeted production fixes, consider a clean temporary clone if the main worktree has unrelated edits.
10. For Gmail template bugs, inspect both model prompt/routing and `emailEngine.ts` normalization.
11. Before pushing live, run `npm run lint` and `npm run build`.
12. For UI changes, verify desktop and mobile layout where practical.

## 15. Current Known High-Risk Areas

### Gmail Engineering

High risk because:

- one shared prompt/design system affects many email types
- `normalizeGeneratedEmailHtml()` can change final HTML after Gemini returns output
- POI uses a dedicated path
- template selection relies on stable `selectedTemplateKey`
- carrier logo normalization is shared across templates

### Environment / Gemini Key

High risk because:

- Vite bakes the Gemini key into the built frontend bundle
- `.env.local`, process env, Windows user-level env, and fallback names can differ
- a successful secret upload does not prove the live built bundle is using the intended key

### Launcher Links

High risk because:

- many links are external live tools
- some local tools have hosted fallbacks
- Bill uses these links daily
- staff dashboard may need a matching update for shared launcher targets

## 16. Copy/Paste Brief For Another AI

```text
This project is Bill Layne Insurance's personal Agency Command Center / Customer Matrix Pro dashboard.

Repo:
C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro

GitHub:
https://github.com/BillLayne/Customer-Matrix-Pro

Live protected site:
https://customer-matrix-pro.pages.dev/

Cloudflare Pages project:
customer-matrix-pro

Read these first:
1. CUSTOMER_MATRIX_PRO_AI_HANDOFF.md
2. GMAIL_ENGINEERING_STUDIO_HANDOFF.md
3. App.tsx
4. components/SearchCard.tsx
5. components/ProgramLauncher.tsx
6. components/AiAssistant.tsx
7. constants.ts
8. services/emailDesignSystemV2.ts
9. services/geminiService.ts
10. services/emailEngine.ts
11. services/poiTemplate.ts
12. functions/_middleware.ts

Important:
- Unified Search / Agency Matrix search stays the main focus and must be visible without scrolling.
- The app uses Search/Gmail/Tools tabs stored in localStorage under matrix-pro-layout-mode.
- ProgramLauncher.tsx is the launcher source of truth.
- Gmail Engineering now uses stable selectedTemplateKey routing and full TemplateContract metadata.
- services/emailDesignSystemV2.ts is the active Gmail design-system prompt.
- constants.ts contains PROMPT_TEMPLATES and template contracts.
- POI routes by selectedTemplateKey === 'poi' and uses poiTemplate.ts.
- The Gmail UI is intentionally compact: Setup & Brand plus Template dropdown in the top work strip, Prompt Draft and Generate Email in the main container.
- Quick favorite/prefill chips and browse-template drawer were removed from Gmail mode.
- The live site is password protected, so unauthenticated requests may return 401.
- Static tools in /public are deployed utilities, not examples.
- Gemini key troubleshooting must consider .env.local, process env, and Windows user-level GEMINI_API_KEY.
- For small urgent production fixes, a clean temporary clone can be safer if the main worktree is dirty.
```

## 17. Current Status

As of June 10, 2026:

- Search-first tabbed layout is the current UX direction.
- Gmail Engineering is compact and uses stable template routing.
- Customer shortcut links are present:
  - Carrier & Agency Contacts
  - Customer Reference Card
  - Renewal Gmail Program
  - DL123 Maker
  - No Loss Form Generator
- Program Launcher includes No Loss in Most Used and Customer Shortcuts.
- Quick Image Links recent uploads area is scrollable.
- Latest production UI deploy was successful.
- Live site remains password protected.
