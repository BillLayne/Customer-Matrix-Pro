# Agency Command Center Matrix Dashboard Handoff

Last updated: May 21, 2026

## 1. Identity

- Internal name: `Agency Command Center`
- Repo name: `Customer-Matrix-Pro`
- Owner / primary user: Bill Layne
- Business: Bill Layne Insurance Agency
- Purpose: Bill's personal all-in-one agency operations dashboard
- Live site: `https://customer-matrix-pro.pages.dev/`
- GitHub repo: `https://github.com/BillLayne/Customer-Matrix-Pro`
- Local repo folder: `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro`

This is Bill's personal command-center dashboard. It is separate from the staff-facing dashboard repo:

- Staff dashboard live site: `https://agency-staff-dashboard.pages.dev/`
- Staff dashboard repo: `https://github.com/BillLayne/agency-staff-dashboard`

## 2. What This Dashboard Does

Customer Matrix Pro is Bill's internal browser-based workspace for:

- searching Agency Matrix faster
- launching linked agency tools from one dashboard
- building Gmail-safe insurance emails with Gemini
- generating proof-of-insurance and document-delivery emails
- uploading images to Imgur and copying hosted links
- opening operational tools like SMS Command Center, task manager, Send Docs, COIs, POI, calculators, and quote helpers
- hosting a few embedded HTML utilities directly inside the dashboard

It is a React + Vite frontend hosted on Cloudflare Pages with a password gate.

## 3. High-Level App Layout

Primary root file:

- `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\App.tsx`

Main visible areas:

1. Header / top bar
2. Quick action buttons
3. Unified Agency Matrix search area
4. Gmail Engineering Studio
5. Quick Image Links
6. Program Launcher

On mobile, major sections collapse into cards to save space.

## 4. Primary Files To Read First

If a new AI agent takes over this repo, these are the first files to inspect:

- `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\App.tsx`
- `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\components\SearchCard.tsx`
- `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\components\AiAssistant.tsx`
- `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\components\ProgramLauncher.tsx`
- `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\components\QuickImageLinksCard.tsx`
- `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\constants.ts`
- `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\services\geminiService.ts`
- `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\services\emailEngine.ts`
- `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\services\poiTemplate.ts`
- `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\services\imgurService.ts`
- `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\functions\_middleware.ts`

Important companion handoff:

- `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\GMAIL_ENGINEERING_STUDIO_HANDOFF.md`

## 5. Core Components

### Search / Agency Matrix Workspace

Primary file:

- `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\components\SearchCard.tsx`

Purpose:

- unified search into Agency Matrix
- search by name or address
- assist with real-estate/property workflows
- provide memo / notes organization

Header quick actions open:

- Agency Matrix Home
- New Prospect
- Reports

### Gmail Engineering Studio

Primary files:

- `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\components\AiAssistant.tsx`
- `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\services\geminiService.ts`
- `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\services\emailEngine.ts`
- `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\services\poiTemplate.ts`

Purpose:

- generate Gmail-safe insurance emails
- analyze uploaded PDFs
- build and refine templates
- validate Gmail HTML structure
- assist with proof-of-insurance email creation

Important note:

- the Gmail system has already been heavily customized with Bill Layne-specific design rules, logo mappings, carrier modules, validation, mobile behavior, and receipt / proof / renewal / quote standards
- another expert already rewrote `geminiService.ts` and `emailEngine.ts`, so those files are considered high-value source-of-truth files

### Quick Image Links

Primary files:

- `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\components\QuickImageLinksCard.tsx`
- `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\services\imgurService.ts`

Purpose:

- upload images to Imgur
- instantly copy hosted image URLs
- keep recent image history in browser storage

### Program Launcher

Primary file:

- `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\components\ProgramLauncher.tsx`

Purpose:

- render the dashboard's tool containers
- launch external live apps
- launch hosted HTML utilities embedded inside this dashboard
- support local Windows file paths when running locally

This file is the main source of truth for:

- tool titles
- button targets
- hosted URLs
- local backup/source paths
- category grouping

## 6. Current Program Launcher Inventory

This section reflects the current launcher inventory in `ProgramLauncher.tsx`.

### Operations

1. Send Documents
   - Live: `https://www.sendbilldocs.com/agent.html`

2. Quote Drip Follow Up
   - Live: `https://quote-follow-up-manager-cloudflare.pages.dev/`

3. AI Task Manager
   - Live: `https://ai-task-manager.bill-7e3.workers.dev`

4. SMS Command Center
   - Live: `https://agency-sms-command-center.bill-7e3.workers.dev`

5. HTML Studio
   - Hosted in dashboard: `/html-studio.html`

6. Agency Website
   - Hosted target: `https://www.billlayneinsurance.com`
   - Local source path: `C:\Users\bill\OneDrive\Documents\Playground\Bill-Layne-Insurance-Agency\index.html`

### Documents & Forms

1. Insurance Card Generator
   - Hosted: `https://insurance-card-generator-2026.pages.dev`
   - Local source path: `C:\Users\bill\OneDrive\Documents\Playground\insurance-card-generator-2026\index.html`

2. POI Generator
   - Hosted: `https://bill-layne-insurance-poi-generator.pages.dev`
   - Local source path: `C:\Users\bill\OneDrive\Documents\Playground\bill-layne-insurance-poi-generator\index.html`

3. Certificates
   - Hosted: `https://coi-certificates-certguard-ai.pages.dev/`

4. Envelope Maker
   - Hosted: `https://envelope-maker-cte.pages.dev`
   - Local source path: `C:\Users\bill\OneDrive\Documents\Envelope-Maker\index.html`

5. Receipt Maker
   - Hosted: `https://billlayne.github.io/Receipt-Maker/index.html`

6. NC Grange Down Payment
   - Hosted in dashboard: `/nc-grange-down-payment-calculator.html`

7. Quote Template Studio
   - Hosted: `https://quote-template-studio.pages.dev/`

8. PDF Quote Creator
   - Hosted: `https://insurance-quote-image-creator.bill-7e3.workers.dev/`

9. Photo Guide Creator
   - Hosted in dashboard: `/photo-guide-composer.html`

10. DL123 Generator
    - Hosted in dashboard: `/dl123-generator/index.html`

11. Cancellation Link Generator
    - Hosted: `https://thecancellationform.com/link-generator.html`

12. No Loss Form Generator
    - Hosted: `https://mynolossform.com/agent-portal.html`

### Property & Coverage

1. Home Inventory
   - Hosted: `https://billlayne.github.io/HOME-INVENTORY/`
   - Local source path: `C:\Users\bill\OneDrive\Documents\Playground\HOME-INVENTORY\index.html`

2. Home Rebuild Estimator
   - Hosted: `https://home-rebuild-estimator.pages.dev`
   - Local source path: `C:\Users\bill\OneDrive\Documents\Playground\HOME-REBUILD-ESTIMATOR\public\index.html`

3. Condo Coverage Calculator
   - Hosted: `https://condo-coverage-calculator.pages.dev`
   - Local source path: `C:\Users\bill\OneDrive\Documents\Playground\CONDO-COVERAGE-CALCULATOR\public\index.html`

4. NC Tools Property Lookup
   - Hosted: `https://nc-insurance-tools-gemini.pages.dev/`

## 7. HTML Utilities Hosted Inside This Repo

These tools are stored in the `public` folder and deployed as part of this dashboard:

- `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\public\html-studio.html`
- `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\public\nc-grange-down-payment-calculator.html`
- `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\public\photo-guide-composer.html`
- `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\public\dl123-generator\index.html`

These are not separate React routes. They are static files served by Cloudflare Pages from this repo.

## 8. Current Folder Structure

Top-level folders and what they do:

- `components`
  - React UI sections
- `services`
  - Gemini, Gmail, Imgur, and POI logic
- `public`
  - hosted HTML tools and static assets
- `functions`
  - Cloudflare Pages Functions middleware
- `hooks`
  - custom browser hooks such as local storage helpers
- `dist`
  - Vite production build output
- `.wrangler`
  - local Wrangler/Pages state

Important top-level files:

- `App.tsx`
- `constants.ts`
- `index.tsx`
- `vite.config.ts`
- `package.json`
- `.dev.vars`
- `.env.local`

## 9. Technology Stack

- React 19
- TypeScript
- Vite
- Cloudflare Pages
- Cloudflare Pages Functions
- Gemini via `@google/genai`
- browser local storage for some persistence

There is no database in this repo. Most workflows are:

- frontend only
- local browser state
- outbound links into other hosted tools
- AI calls through Gemini

## 10. Environment Variables

Do not store the actual secret values in handoff notes. Only store the variable names and where they are expected.

### `.dev.vars`

Used for direct Cloudflare Pages deployment:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `SITE_PASSWORD`

Local file:

- `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\.dev.vars`

### `.env.local`

Used for Gemini key access in local development:

- `GEMINI_API_KEY`
- possibly `GOOGLE_API_KEY`
- possibly `API_KEY`

Local file:

- `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\.env.local`

## 11. Access Protection / Password Gate

Primary file:

- `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\functions\_middleware.ts`

Important details:

- cookie name: `customer_matrix_pro_auth`
- cookie value after auth: `approved`
- cookie duration: one week
- login route: `/login`
- logout route: `/logout`
- environment variable used: `SITE_PASSWORD`
- code fallback password currently exists if env var is missing

Important operational note:

- direct HTTP fetches to the live site often return `401 Unauthorized` unless authenticated
- this is expected behavior, not necessarily a broken deployment
- future AI agents should remember this when checking live pages from terminal tools

## 12. Build and Deploy Workflow

### Local build

From:

- `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro`

Commands:

```powershell
npm run build
npm run lint
```

### Deploy to Cloudflare Pages

Load `.dev.vars` into the current shell, then deploy:

```powershell
$vars = Get-Content '.dev.vars' | Where-Object { $_ -match '^[A-Z0-9_]+=' }
foreach ($line in $vars) {
  $name, $value = $line -split '=', 2
  [Environment]::SetEnvironmentVariable($name, $value, 'Process')
}
npx wrangler pages deploy dist --project-name customer-matrix-pro
```

Known project name:

- `customer-matrix-pro`

## 13. Backup / Source-of-Truth Notes

For this dashboard, the main source-of-truth layers are:

1. Local repo folder
2. GitHub repo backup
3. Cloudflare Pages live deployment

Primary backup locations:

- Local repo: `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro`
- GitHub: `https://github.com/BillLayne/Customer-Matrix-Pro`
- Live Pages site: `https://customer-matrix-pro.pages.dev/`

Additional inventory files already created in the broader Playground workspace:

- `C:\Users\bill\OneDrive\Documents\Playground\PROGRAM_BACKUP_RESOURCE_LIST.md`
- `C:\Users\bill\OneDrive\Documents\Playground\program-backup-index.html`

Those files are useful for tracing companion apps, local source folders, GitHub repos, and live links.

## 14. Current Known Companion Apps

These are external to this repo but heavily tied into it:

- SMS Command Center
  - `https://agency-sms-command-center.bill-7e3.workers.dev`

- AI Task Manager
  - `https://ai-task-manager.bill-7e3.workers.dev`

- Send Bill Docs agent portal
  - `https://www.sendbilldocs.com/agent.html`

- Quote Follow Up Manager
  - `https://quote-follow-up-manager-cloudflare.pages.dev/`

- Insurance Card Generator
  - `https://insurance-card-generator-2026.pages.dev`

- POI Generator
  - `https://bill-layne-insurance-poi-generator.pages.dev`

- Certificates / CertGuard
  - `https://coi-certificates-certguard-ai.pages.dev/`

- Envelope Maker
  - `https://envelope-maker-cte.pages.dev`

- Receipt Maker
  - `https://billlayne.github.io/Receipt-Maker/index.html`

- Home Inventory
  - `https://billlayne.github.io/HOME-INVENTORY/`

- Home Rebuild Estimator
  - `https://home-rebuild-estimator.pages.dev`

- Condo Coverage Calculator
  - `https://condo-coverage-calculator.pages.dev`

- NC Tools Property Lookup
  - `https://nc-insurance-tools-gemini.pages.dev/`

- Quote Template Studio
  - `https://quote-template-studio.pages.dev/`

- PDF Quote Creator
  - `https://insurance-quote-image-creator.bill-7e3.workers.dev/`

- Cancellation Link Generator
  - `https://thecancellationform.com/link-generator.html`

- No Loss Form Generator
  - `https://mynolossform.com/agent-portal.html`

## 15. Repo-Specific Operating Rules For New AI Agents

1. Treat `ProgramLauncher.tsx` as the live launcher source of truth.
2. Treat `geminiService.ts` and `emailEngine.ts` as high-risk files.
   Changes there affect many Gmail templates at once.
3. Do not assume live anonymous HTTP checks will work because the site is password protected.
4. When changing container links, rebuild and redeploy the Pages site.
5. Hosted HTML tools in `public` should be changed in this repo directly, not only in some outside local folder.
6. Avoid exposing any secret values in docs, commits, or chat.
7. If a tool exists in both Bill's personal dashboard and the staff dashboard, confirm whether both repos need the same update.

## 16. Suggested First-Read Order For A New AI Agent

If a new AI should get productive fast, the recommended reading order is:

1. `CUSTOMER_MATRIX_PRO_AI_HANDOFF.md`
2. `GMAIL_ENGINEERING_STUDIO_HANDOFF.md`
3. `App.tsx`
4. `components/ProgramLauncher.tsx`
5. `components/AiAssistant.tsx`
6. `services/geminiService.ts`
7. `services/emailEngine.ts`
8. `components/SearchCard.tsx`
9. `components/QuickImageLinksCard.tsx`
10. `functions/_middleware.ts`

## 17. Copy/Paste Brief For Another AI

Use this exact briefing if handing the project to another AI:

```text
This project is Bill Layne Insurance's personal Agency Command Center dashboard.

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
4. components/ProgramLauncher.tsx
5. components/AiAssistant.tsx
6. services/geminiService.ts
7. services/emailEngine.ts
8. functions/_middleware.ts

Important:
- ProgramLauncher.tsx controls the launcher containers and tool links.
- The site is password protected by Cloudflare Pages Functions, so unauthenticated HTTP checks may return 401.
- Gmail Engineering logic is concentrated in geminiService.ts and emailEngine.ts.
- Some tools are hosted inside /public and are deployed as static Pages files.
- Use .dev.vars for Cloudflare Pages deploys.
- Be careful not to expose secret values.
```

## 18. Status

This handoff is intended to be the current complete handoff for the Agency Command Center / Customer Matrix Pro dashboard as of May 21, 2026.
