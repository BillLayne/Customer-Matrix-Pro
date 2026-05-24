# Agency Command Matrix Complete Handoff

Last updated: May 24, 2026

## 1. Project Identity

- Working name: `Agency Command Matrix`
- Repo name: `Customer-Matrix-Pro`
- Owner: Bill Layne
- Business: Bill Layne Insurance Agency
- Purpose: Bill's personal internal command-center dashboard
- Local repo: `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro`
- GitHub repo: `https://github.com/BillLayne/Customer-Matrix-Pro`
- Live site: `https://customer-matrix-pro.pages.dev/`

This is Bill's personal dashboard, not the separate staff dashboard.

Related staff dashboard:

- Local repo: `C:\Users\bill\OneDrive\Documents\Playground\Agency-Staff-Dashboard`
- GitHub: `https://github.com/BillLayne/agency-staff-dashboard`
- Live site: `https://agency-staff-dashboard.pages.dev/`

## 2. What This Dashboard Is For

Agency Command Matrix is Bill's all-in-one browser dashboard for daily insurance agency work. It is designed to keep the most-used workflow first and everything else one click away.

Main jobs:

- search Agency Matrix by name or address
- launch external agency tools from one place
- generate Gmail-safe insurance emails with Gemini
- upload images and instantly copy hosted Imgur links
- open document tools like POI, certificates, insurance cards, quote tools, photo guides, DL123, and cancellation forms
- open property and coverage tools like rebuild, condo, home inventory, and NC property lookup

## 3. Current Front-End Strategy

The front end was recently reorganized to be easier for anyone to use.

### Core principle

Search Matrix stays the main focus.

That means:

- Agency Matrix search remains the most important section on the page
- the rest of the dashboard is organized around what someone usually does next

### Current homepage structure

1. Sticky branded header
2. Quick action buttons for Agency Matrix Home / New Prospect / Reports
3. Search workspace
4. Guided "Search First / Start Here" section
5. Gmail Engineering Studio
6. Quick Image Links
7. Program Launcher

### New guidance layer added on the homepage

The page now includes:

- quick-start cards
- workflow lanes
- featured launcher collections
- recent tools

This was done to make the dashboard easier to understand for someone who did not build it.

## 4. Most Important Files

If another AI takes over this repo, these are the first files to read:

1. `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\CUSTOMER_MATRIX_PRO_AI_HANDOFF.md`
2. `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\App.tsx`
3. `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\components\SearchCard.tsx`
4. `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\components\ProgramLauncher.tsx`
5. `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\components\AiAssistant.tsx`
6. `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\services\geminiService.ts`
7. `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\services\emailEngine.ts`
8. `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\functions\_middleware.ts`
9. `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\constants.ts`

Important companion document:

- `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\GMAIL_ENGINEERING_STUDIO_HANDOFF.md`

## 5. Primary Files By Purpose

### Main app shell

- `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\App.tsx`

Controls:

- page structure
- sticky header
- quick actions
- guided quick-start section
- mobile collapsible sections
- toast system

### Search workspace

- `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\components\SearchCard.tsx`

Purpose:

- search Agency Matrix
- web search
- people search
- client folder search
- real-estate / property lookup support
- GIS lookup support
- memo / notes flow

### Gmail Engineering Studio

- `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\components\AiAssistant.tsx`
- `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\services\geminiService.ts`
- `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\services\emailEngine.ts`
- `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\services\poiTemplate.ts`

Purpose:

- template builder
- carrier-aware branding
- proof-of-insurance email generation
- email refinement
- Gmail validation
- download / handoff / print HTML

### Program launcher

- `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\components\ProgramLauncher.tsx`

Purpose:

- render the full launcher wall
- show featured collections
- show recent tools
- open local / hosted tools

### Image uploader

- `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\components\QuickImageLinksCard.tsx`
- `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\services\imgurService.ts`

Purpose:

- upload JPG / PNG / WEBP to Imgur
- auto-copy the hosted link
- keep a recent image list in browser storage

### Access gate

- `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\functions\_middleware.ts`

Purpose:

- password-protect the live Cloudflare Pages dashboard

## 6. Current User Experience Structure

### Search is the hero

The user should always be able to do this fast:

- type a customer name
- type an address
- jump into Agency Matrix

That is why Search remains above the heavier tools.

### Guided quick-start section

Current quick-start cards in `App.tsx`:

- Send customer documents
- Open SMS Command Center
- Jump to Gmail Engineering
- Open Certificates
- Open POI Generator
- Open NC Property Tools

### Workflow guides

Current workflow lanes in `App.tsx`:

- Communicate
- Create Documents
- Coverage & Property
- Image & Content

### Program launcher enhancements

Current launcher also includes:

- featured "Most Used" collection
- featured "Coverage Lane" collection
- recent tools memory using local storage
- categorized launcher wall underneath

## 7. Current Program Launcher Inventory

This reflects the active launcher setup in `components/ProgramLauncher.tsx`.

### Operations

1. Send Documents
   - `https://www.sendbilldocs.com/agent.html`

2. Quote Drip Follow Up
   - `https://quote-follow-up-manager-cloudflare.pages.dev/`

3. AI Task Manager
   - `https://ai-task-manager.bill-7e3.workers.dev`

4. SMS Command Center
   - `https://agency-sms-command-center.bill-7e3.workers.dev`

5. HTML Studio
   - hosted in dashboard at `/html-studio.html`

6. Agency Website
   - live: `https://www.billlayneinsurance.com`
   - local source: `C:\Users\bill\OneDrive\Documents\Playground\Bill-Layne-Insurance-Agency\index.html`

### Documents & Forms

1. Insurance Card Generator
   - live: `https://insurance-card-generator-2026.pages.dev`
   - local source: `C:\Users\bill\OneDrive\Documents\Playground\insurance-card-generator-2026\index.html`

2. POI Generator
   - live: `https://bill-layne-insurance-poi-generator.pages.dev`
   - local source: `C:\Users\bill\OneDrive\Documents\Playground\bill-layne-insurance-poi-generator\index.html`

3. Certificates
   - live: `https://coi-certificates-certguard-ai.pages.dev/`

4. Envelope Maker
   - live: `https://envelope-maker-cte.pages.dev`
   - local source: `C:\Users\bill\OneDrive\Documents\Envelope-Maker\index.html`

5. Receipt Maker
   - live: `https://billlayne.github.io/Receipt-Maker/index.html`

6. NC Grange Down Payment
   - hosted in dashboard at `/nc-grange-down-payment-calculator.html`

7. Quote Template Studio
   - live: `https://quote-template-studio.pages.dev/`

8. PDF Quote Creator
   - live: `https://insurance-quote-image-creator.bill-7e3.workers.dev/`

9. Photo Guide Creator
   - hosted in dashboard at `/photo-guide-composer.html`

10. DL123 Generator
    - hosted in dashboard at `/dl123-generator/index.html`

11. Cancellation Link Generator
    - live: `https://thecancellationform.com/link-generator.html`

12. No Loss Form Generator
    - live: `https://mynolossform.com/agent-portal.html`

### Property & Coverage

1. Home Inventory
   - live: `https://billlayne.github.io/HOME-INVENTORY/`
   - local source: `C:\Users\bill\OneDrive\Documents\Playground\HOME-INVENTORY\index.html`

2. Home Rebuild Estimator
   - live: `https://home-rebuild-estimator.pages.dev`
   - local source: `C:\Users\bill\OneDrive\Documents\Playground\HOME-REBUILD-ESTIMATOR\public\index.html`

3. Condo Coverage Calculator
   - live: `https://condo-coverage-calculator.pages.dev`
   - local source: `C:\Users\bill\OneDrive\Documents\Playground\CONDO-COVERAGE-CALCULATOR\public\index.html`

4. NC Tools Property Lookup
   - live: `https://nc-insurance-tools-gemini.pages.dev/`

## 8. Static Tools Hosted Inside This Repo

These tools are inside `public` and are deployed with the dashboard:

- `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\public\html-studio.html`
- `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\public\nc-grange-down-payment-calculator.html`
- `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\public\photo-guide-composer.html`
- `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\public\dl123-generator\index.html`

These are direct static Pages assets, not React routes.

## 9. Gmail Engineering Notes

The Gmail Engineering Studio is a critical subsystem.

Important files:

- `components/AiAssistant.tsx`
- `services/geminiService.ts`
- `services/emailEngine.ts`
- `constants.ts`

Important facts:

- the template builder now shows `Proof of Insurance` instead of `Proof of Insurance / ID Card`
- the Gmail system contains Bill Layne-specific design rules, carrier branding, validation, and template logic
- `geminiService.ts` and `emailEngine.ts` were previously rewritten by another expert and should be treated as high-risk files
- small wording or logic changes there can affect many templates at once

Separate Gmail handoff exists here:

- `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\GMAIL_ENGINEERING_STUDIO_HANDOFF.md`

## 10. Technology Stack

- React 19
- TypeScript
- Vite
- Cloudflare Pages
- Cloudflare Pages Functions
- Gemini via `@google/genai`
- localStorage for some recent / history behavior

This repo does not have a traditional backend database.

Most behavior is:

- frontend rendering
- browser local storage
- outbound links to companion tools
- Gemini calls
- Cloudflare Pages Functions for password protection

## 11. Folder Structure

Important folders:

- `components`
  - React UI sections
- `services`
  - Gemini, Gmail, Imgur, and POI helpers
- `public`
  - hosted HTML utilities
- `functions`
  - Cloudflare Pages middleware
- `hooks`
  - custom hooks like local storage helper
- `dist`
  - built output
- `.wrangler`
  - local Wrangler state

Important root files:

- `App.tsx`
- `index.tsx`
- `constants.ts`
- `types.ts`
- `vite.config.ts`
- `package.json`
- `.env.local`
- `.dev.vars`

## 12. Environment Variables

Do not store actual secret values in handoff docs.

### `.env.local`

Local file:

- `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\.env.local`

Primary variable:

- `GEMINI_API_KEY`

Other possible fallbacks in code:

- `GOOGLE_API_KEY`
- `API_KEY`

### `.dev.vars`

Local file:

- `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\.dev.vars`

Used for direct Cloudflare deployment:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `SITE_PASSWORD`

### Important env behavior discovered during support

For this repo, Windows user-level environment variables can override what Vite ends up using during builds.

Specifically:

- a stale Windows user-level `GEMINI_API_KEY` previously overrode the local file expectation during deployment troubleshooting

If the live dashboard still acts like it is using an old Gemini key:

1. check `.env.local`
2. check Windows user-level `GEMINI_API_KEY`
3. rebuild with the intended key explicitly loaded
4. redeploy the Pages project

This is important enough to remember.

## 13. Access Protection

Primary file:

- `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\functions\_middleware.ts`

Important details:

- cookie name: `customer_matrix_pro_auth`
- approved cookie value: `approved`
- login route: `/login`
- logout route: `/logout`
- env variable: `SITE_PASSWORD`
- cookie lifetime: one week

Important note:

- terminal or unauthenticated fetches to the live site may return `401 Unauthorized`
- this is expected when not authenticated

## 14. Build and Deploy Workflow

### Local commands

Run from:

- `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro`

Commands:

```powershell
npm run build
npm run lint
```

### Direct Cloudflare Pages deploy

```powershell
$env:GEMINI_API_KEY=[Environment]::GetEnvironmentVariable('GEMINI_API_KEY','User')
$vars = Get-Content '.dev.vars' | Where-Object { $_ -match '^[A-Z0-9_]+=' }
foreach ($line in $vars) {
  $name, $value = $line -split '=', 2
  [Environment]::SetEnvironmentVariable($name, $value, 'Process')
}
npx wrangler pages deploy dist --project-name customer-matrix-pro
```

Pages project name:

- `customer-matrix-pro`

## 15. Backup and Source of Truth

Primary backup and source layers:

1. Local repo
2. GitHub repo
3. Cloudflare Pages deployment

Main sources:

- local repo: `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro`
- GitHub: `https://github.com/BillLayne/Customer-Matrix-Pro`
- live site: `https://customer-matrix-pro.pages.dev/`

Related backup inventory files in Playground:

- `C:\Users\bill\OneDrive\Documents\Playground\PROGRAM_BACKUP_RESOURCE_LIST.md`
- `C:\Users\bill\OneDrive\Documents\Playground\program-backup-index.html`

## 16. Companion Apps Commonly Tied To This Dashboard

- SMS Command Center
  - `https://agency-sms-command-center.bill-7e3.workers.dev`

- Send Bill Docs
  - `https://www.sendbilldocs.com/agent.html`

- AI Task Manager
  - `https://ai-task-manager.bill-7e3.workers.dev`

- Quote Drip Follow Up
  - `https://quote-follow-up-manager-cloudflare.pages.dev/`

- Certificates / CertGuard
  - `https://coi-certificates-certguard-ai.pages.dev/`

- POI Generator
  - `https://bill-layne-insurance-poi-generator.pages.dev`

- Insurance Card Generator
  - `https://insurance-card-generator-2026.pages.dev`

- Quote Template Studio
  - `https://quote-template-studio.pages.dev/`

- PDF Quote Creator
  - `https://insurance-quote-image-creator.bill-7e3.workers.dev/`

- Envelope Maker
  - `https://envelope-maker-cte.pages.dev`

- Receipt Maker
  - `https://billlayne.github.io/Receipt-Maker/index.html`

- NC Tools Property Lookup
  - `https://nc-insurance-tools-gemini.pages.dev/`

## 17. Operating Rules For New AI Agents

1. Keep Search Matrix as the main focus.
2. Treat `ProgramLauncher.tsx` as the live launcher source of truth.
3. Treat `geminiService.ts` and `emailEngine.ts` as high-risk system files.
4. Remember that the live site is password protected.
5. If a change affects a linked tool used by both Bill and staff, confirm whether the staff dashboard also needs the same update.
6. If a hosted static tool lives in `public`, update it in this repo directly.
7. Do not expose secret values in docs, code, or chat.
8. When troubleshooting Gemini key issues, check both `.env.local` and Windows user-level environment variables.

## 18. Recommended First-Read Order For Another AI

1. `CUSTOMER_MATRIX_PRO_AI_HANDOFF.md`
2. `GMAIL_ENGINEERING_STUDIO_HANDOFF.md`
3. `App.tsx`
4. `components/SearchCard.tsx`
5. `components/ProgramLauncher.tsx`
6. `components/AiAssistant.tsx`
7. `services/geminiService.ts`
8. `services/emailEngine.ts`
9. `functions/_middleware.ts`
10. `constants.ts`

## 19. Copy/Paste Brief For Another AI

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
9. functions/_middleware.ts

Important:
- Search Matrix is the main focus of the dashboard and should stay first.
- ProgramLauncher.tsx is the source of truth for launcher containers and tool links.
- The live site is password protected, so terminal fetches may return 401.
- Gmail Engineering logic is concentrated in geminiService.ts and emailEngine.ts.
- Some tools are hosted directly inside /public and deploy as static Pages files.
- Gemini key troubleshooting must consider both .env.local and Windows user-level env vars.
- Use .dev.vars for Cloudflare deployment.
```

## 20. Status

This document is intended to be the current complete handoff for Bill Layne's Agency Command Matrix dashboard as of May 24, 2026.
