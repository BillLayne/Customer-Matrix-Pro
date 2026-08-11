# Agency Command Center — Live Handoff

**Last verified against the code: August 5, 2026.**

This document describes the dashboard **as it actually exists right now**. It replaces the June 10, 2026 handoff, which described a tabbed layout and a Gmail Engineering workspace that no longer exist in the UI.

If anything here disagrees with the code, the code wins — re-verify and update this file.

---

## 1. Identity & URLs

| | |
|---|---|
| Working name | Agency Command Center |
| Repo name | `Customer-Matrix-Pro` |
| Local repo | `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro` |
| GitHub | https://github.com/BillLayne/Customer-Matrix-Pro |
| Live site | https://customer-matrix-pro.pages.dev/ |
| Cloudflare Pages project | `customer-matrix-pro` |
| Owner | Bill Layne — this is his **personal** command center |

Separate, do not confuse: the staff dashboard at `Playground\Agency-Staff-Dashboard` → https://agency-staff-dashboard.pages.dev/. If a launcher target changes for both people, check whether the staff dashboard needs the same edit.

### Live state right now

- Latest production release: **August 5, 2026** (image-library search, PDF Studio tile, single-favorites cleanup, Ctrl+K command palette).
- Earlier July 29 release added Contact Numbers lookup with the per-company add/edit/restore manager.
- GitHub still does not auto-deploy this project. Pushing does nothing to the live site; someone must run the deploy command in §3.

---

## 2. What the app is

A single-page internal dashboard Bill opens every day. Two jobs dominate:

1. **Search Agency Matrix** for a customer by name or address — the first action of most tasks.
2. **Launch one of ~40 agency tools** without hunting through bookmarks.

**The governing UX rule: Unified Search stays at the top and must be usable without scrolling.** Do not push content above it.

### Page structure (top to bottom, `App.tsx`)

1. **Sticky header** — logo, in-page nav (Search / Tools / Images), "Search or Launch" palette button (Ctrl+K), shortcuts modal, light/dark toggle
2. **Unified Search** (`components/SearchCard.tsx`) — action row includes the Matrix Home / New Prospect / Reports strip; collapsible Carrier Portals drawer
3. **Program Launcher** (`components/ProgramLauncher.tsx`)
4. **Quick Image Links** (`components/QuickImageLinksCard.tsx`)

Plus the **Command Palette** overlay (§6). The old Quick Links chip row was removed 2026-08-05.

There are **no tabs**. The Search/Gmail/Tools tab system and the `matrix-pro-layout-mode` key were removed in `9b1a351`.

### Gmail Engineering is gone from the UI

Removed in `9b1a351` because it was broken and Bill plans to rebuild it. **The files are deliberately still in the repo — do not delete them:** `components/AiAssistant.tsx`, `services/geminiService.ts`, `services/emailEngine.ts`, `services/emailDesignSystemV2.ts`, `services/poiTemplate.ts`, and `PROMPT_TEMPLATES` / `TEMPLATE_KEYS` / `TemplateContract` in `constants.ts`. `GMAIL_ENGINEERING_STUDIO_HANDOFF.md` is retained as an archive of how that system worked.

Note: `AiAssistant.tsx` is no longer imported anywhere, but `tsc --noEmit` still type-checks it, so it must keep compiling.

---

## 3. Build, verify, deploy

Run everything from the repo root.

```bash
npm run lint && npm run build
```

`lint` is `tsc --noEmit` (no ESLint). Then deploy:

```bash
npx wrangler pages deploy dist --project-name customer-matrix-pro
```

**Deploy gotchas — all three have burned previous sessions:**

- **No CI.** GitHub never builds this. A push is not a deploy.
- **`curl` returns 401 + the access-gate login HTML, not the app.** That is the auth middleware working correctly. Never conclude "the deploy failed" from a curl result — check in an authenticated browser.
- **Propagation + browser cache.** The origin can serve the previous `index.html` for ~5–15 seconds after deploying, and a browser will happily serve a cached copy long after that. Verify with `fetch(url, {cache:'no-store'})` and retry a couple of times before believing a stale result. Bill may need Ctrl+Shift+R.

Local dev: `npm run dev` (Vite, port 3000 by default). There is a preview entry named `matrix-pro` on port 8797 in the LIVE repo's `.claude/launch.json`. Note that `preview_screenshot` reliably times out on this app — use `preview_eval` / `preview_snapshot`, or drive a real browser, to verify visually.

---

## 4. Stack & infrastructure

- React 19 + TypeScript + Vite 6, deployed to Cloudflare Pages as static assets
- **Tailwind is compiled at build time** — `tailwind.config.js` + `postcss.config.js` + `index.css`. The `cdn.tailwindcss.com` runtime script was removed on 2026-07-14. New utility classes work automatically via JIT; if a class silently does nothing, check the `content` globs in `tailwind.config.js`.
- Font Awesome 6 and Google Fonts (Inter + Outfit) still load from CDN in `index.html`
- `@google/genai` for the AI features inside Search
- `marked` (dependency of the dormant Gmail code)
- No database. State lives in `localStorage`.

### Access gate — `functions/_middleware.ts`

A Cloudflare Pages Function password-gates the whole site.

- Cookie `customer_matrix_pro_auth=approved`, one week, HttpOnly + Secure
- Routes: `POST /login`, `/logout`
- Password comes from the `SITE_PASSWORD` environment variable in the Cloudflare Pages project
- **Security note:** the middleware falls back to a hardcoded password literal when `SITE_PASSWORD` is unset. That literal is committed to the repo. Worth removing (fail closed instead) — see §9.

---

## 5. Unified Search — `components/SearchCard.tsx`

The most-used component in the app. Treat it carefully.

**Six search modes** (`MODE_META` in `constants.ts`):

| Mode | Opens | Shortcut |
|---|---|---|
| Agency Matrix | `agents.agencymatrix.com` customer search | Ctrl + M |
| Web Search | Google | Alt + W |
| Real Estate | NC Insurance Tools agency property lookup (`26d5834f` deployment, with `?address=` prefilled) | Alt + H |
| People | TruePeopleSearch | Alt + P |
| Client Folder | Google Drive search | Alt + F |
| Contact Numbers | Local insurance company contact directory with live matching | Alt + C |

Agency Matrix mode auto-picks `selection=Address` when the query contains a digit, otherwise `selection=Name`.

**Other features:**

- `/` focuses the search input from anywhere (unless you are already typing)
- Recent searches (last 6) as clickable chips — `matrix-pro-search-history`
- Buttons: Search, Cloud Folder, Audit Memo — plus **NC Tools** which appears only in Real Estate mode
- **Audit Memo studio** (Alt + N or Ctrl + Shift + M) — an E&O compliance memo builder. Paste notes or attach a PDF/image, Gemini formats an audit-ready CRM memo, then "Execute Sync & Matrix" copies it and opens the customer in Agency Matrix.
- **Real Estate / NC Tools handoff** — typing an address and pressing Enter, the arrow button, or the **NC Tools** button opens `https://26d5834f.nc-insurance-tools-gemini.pages.dev/?address=...`. The NC Insurance Tools app reads `address` / `q` from the URL and auto-runs the lookup inside `PropertyTab.tsx`.
- **Contact Numbers** — selecting the mode focuses the main input. Results appear while Bill types a company name, inside a contained scrolling panel. Phone numbers use `tel:` links; phone, fax, email, and website rows each have a copy button. The built-in directory has 17 companies.
- **Manual contact editor** — **Add Contact** opens a compact modal for a new company, while the **+** icon on each company card opens a manager with that company prefilled. The manager lists current details with pencil controls. A built-in detail can be corrected without changing `data/carrierContacts.ts`; removing that saved correction restores the original built-in value. Newly added details remain editable and removable.
- **Manual contact storage** — `matrix-pro-manual-company-contacts` in `localStorage`. Added details and built-in overrides persist only in that browser on that computer; they do not sync across devices because this app has no database.
- **Contact directory source of truth** — `data/carrierContacts.ts`. Add future phone, fax, email, website, alias, or address records there; do not hardcode them in `SearchCard.tsx` or `ContactLookup.tsx`.
- **Workers compensation source** — all 11 entries were transcribed and visually checked against `C:\Users\bill\My Drive (docs@billlayneinsurance.com)\2025 SOCIAL MEDIA CENTER\Bill layne insurance\Client Folders\Workers Compensation Contact\workers compensation company contacts.pdf` (NCRB WC Assigned Risk Carrier Contact List, revised 08/26/2024). The remaining six entries came from the dashboard's existing carrier resources, with Nationwide customer service set to `1-800-243-2642` and claims set to `1-800-421-3535` per Bill.
- **Carrier Portals** — collapsible drawer, state in `matrix-pro-show-carrier-gateway`, list is `DEFAULT_INSURANCE_PORTALS` in `constants.ts`
- Search counter resets per calendar day (`matrix-pro-search-log` stores `{day, count}`)

**Dark-mode gotcha (do not undo):** carrier logos are dark-ink artwork sitting on a 10%-opacity brand tint, so in dark mode they disappear without a light plate behind them. `SearchCard.tsx` wraps each logo in a `dark:bg-white/95` plate that drops away on hover, where the tile fills with the carrier's color. Keep that wrapper if you touch the portal markup.

---

## 6. Command Palette — `components/CommandPalette.tsx` (2026-08-05)

**Ctrl+K** (or the header's "Search or Launch" button; Ctrl+M is kept as an alias, though the global AutoHotkey Ctrl+M usually swallows that key on Bill's PC) opens one overlay that reaches everything:

- **Tools** — filters all `PROGRAMS` (word-match on title/description/category/note, title hits ranked first). Opens through the same exported `resolveProgramDestination()` the launcher uses, and updates `matrix-pro-recent-programs`.
- **Client search** — a "Search Agency Matrix for …" row is always present on a non-empty query (first row when no tool matched), using the same digit→Address rule. So `cert ⏎` opens Certificates and `john smith ⏎` searches Matrix.
- **Carrier numbers** — matches the built-in `COMPANY_CONTACTS` (phone/fax rows); Enter/click copies the number, with a toast that shows the number itself if the clipboard write fails. Browser-saved manual contacts are NOT searched here — those live only in Contact Numbers mode.
- Empty query shows recent-then-pinned tools (max 8). ↑↓ + Enter, Esc closes, mouse works.

`QuickSearchPopup.tsx` was replaced by the palette and is now dormant in the repo (like `AiAssistant.tsx`).

### The old Quick Links chip row is GONE (2026-08-05)

It had grown to 16 chips duplicating the launcher's Pinned section — two hand-maintained favorites lists. The three genuinely Matrix-owned links (**Matrix Home · New Prospect · Reports**) moved into the Search card's action row behind a divider; every other shortcut lives in **Pinned only**. Do not reintroduce a second chip list; pin instead.

**Toast policy (2026-08-05):** opening tools, running searches, and switching modes no longer toast — the new tab or visible state change is the feedback. Toasts are reserved for outcomes: copies, saves, errors, popup-blocked, GIS/report results.

---

## 7. Program Launcher — `components/ProgramLauncher.tsx`

**The `PROGRAMS` array in this file is the single source of truth for every launcher target.** If a link is wrong, fix it here first.

**40 tools in 4 categories:** Operations (10) · Documents & Forms (14) · AI (12) · Property & Coverage (4). Within every section tools are sorted alphabetically by title.

**How you find things:**

- **Filter box** — type to search title/description/category/note; `/` focuses it
- **Category pills** — All / Operations / Documents & Forms / AI / Property & Coverage, with counts; the selection persists per browser in `matrix-pro-launcher-category`
- **Pinned** — star any tile to keep it at the top (`matrix-pro-pinned-programs`)
- **Recent** — last 6 opened, as chips (`matrix-pro-recent-programs`)
- **Enter in the filter box opens the first match**; Escape clears it
- The module now **exports** `PROGRAMS`, `ProgramEntry`, `CATEGORY_STYLES`, the two storage keys, and `resolveProgramDestination()` for the command palette — keep those exports intact

### ⚠️ Adding a new tool — the version-stamp protocol

`DEFAULT_PINNED` **only applies to a browser that has never opened the dashboard.** Bill's browser already has a saved pin list, so a newly added tool would never surface for him. To make a new tool appear:

1. Append the entry to `PROGRAMS`
2. **Bump `LAUNCHER_VERSION`**
3. **Add the new ids under that version number in `NEW_IN_VERSION`**

On next load those ids get pinned once and badged **NEW**. Unpinning still sticks afterwards, because the version has already been recorded. Currently `LAUNCHER_VERSION = 4` (v2: task board, mail gateway, Claude Quotes/Gmail · v3: `pdf-studio` · v4: `bli-auto-rater`).

(The old "also add a Quick Links chip" step is gone — the chip row was removed 2026-08-05. Pinning via the version stamp is the only placement step now.)

### Local vs hosted targets

Entries may carry both a Windows `target` and a `hostedTarget`. On the deployed site (`isHostedDashboard`) the hosted URL wins; running locally, `targetType: 'local'` opens a `file:///` URL. A local-only tool with no `hostedTarget` shows a warning toast on the live site instead of a broken link.

Tools hosted inside this repo's `public/` folder: `/html-studio.html`, `/nc-grange-down-payment-calculator.html`, `/photo-guide-composer.html`, `/dl123-generator/index.html`. These are **real deployed utilities, not examples** — edit them here.

---

## 8. Quick Image Links — `components/QuickImageLinksCard.tsx` + `services/imageHostService.ts`

Migrated off Imgur on 2026-07-23 (`0d3e131`, `9a10f64`). Uploads now go to **BLI Image Host** at `https://img.billlayneinsurance.com`. The Imgur service and its Client-ID were deleted from this repo.

- **Access code** entered once per device, stored in `localStorage` as `bliImgAccessCode`, verified via `GET /api/check` with an `x-access-code` header
- **Format presets, chosen before upload** (persisted in `quick-image-preset`, default **Gmail**):

| Preset | Output | Why |
|---|---|---|
| **Gmail** (default) | JPEG, max 1200px, q0.80 | Bill mostly uploads for Gmail templates, and email clients cannot render WebP |
| Logo | PNG | keeps transparency and sharp edges |
| Web | WebP, max 1600px, q0.82 | smallest files for web pages and quotes |
| GIF / Original | untouched | animation and vectors survive |

- Images are optimized **client-side** (canvas) before the POST. GIF and SVG always pass through. JPEG flattens transparency onto white. If the re-encode would not shrink the file, the original is uploaded instead.
- Upload is `POST /api/upload?filename=…` with the blob as the body; the returned URL is copied to the clipboard automatically
- **Recent Uploads** is browser-local convenience history only. It keeps the last 25 links in `quicklink-upload-history` and remains independently scrollable.
- **Image Library search** queries the permanent BLI Image Host through authenticated, paginated `GET /api/list` requests. `listAllHostedImages()` follows every returned cursor, de-duplicates objects by key, and sorts them newest-first.
- Full-library search matches every typed word against the original filename, optional host label, stored object key, and hosted URL. Results have thumbnails plus open and copy-link actions. Clearing the search returns to Recent Uploads.
- The full-library search uses the same device-level `bliImgAccessCode`; no second credential is stored and no image-host secret is committed to this repo.

---

## 9. localStorage keys

| Key | Holds |
|---|---|
| `theme` | light / dark |
| `matrix-pro-search-log` | `{day, count}` — daily search counter |
| `matrix-pro-search-history` | last 6 search queries |
| `matrix-pro-show-carrier-gateway` | Carrier Portals drawer open/closed |
| `matrix-pro-pinned-programs` | pinned launcher tool ids |
| `matrix-pro-recent-programs` | recently opened tool ids (launcher + palette) |
| `matrix-pro-launcher-version` | last launcher version this browser saw |
| `matrix-pro-launcher-category` | last selected launcher category pill |
| `matrix-pro-manual-company-contacts` | browser-saved contact additions/corrections |
| `quick-image-preset` | selected image format preset |
| `quicklink-upload-history` | recent image uploads |
| `bliImgAccessCode` | BLI Image Host access code |

A `local-storage-error` event surfaces quota failures as a toast.

---

## 10. Environment & secrets

Never put real secret values in this file, in code, in chat, or in screenshots.

- **`.env.local`** (gitignored via `*.local`) — `GEMINI_API_KEY`
- **`.dev.vars`** (gitignored) — `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `SITE_PASSWORD`
- **Cloudflare Pages project settings** — `SITE_PASSWORD` for the live gate

`vite.config.ts` resolves the Gemini key in this order: `env.GEMINI_API_KEY` → `process.env.GEMINI_API_KEY` → `process.env.GOOGLE_API_KEY` → `process.env.API_KEY`, then defines both `process.env.API_KEY` and `process.env.GEMINI_API_KEY`.

**Two consequences that matter:**

1. **The Gemini key is baked into the built frontend bundle.** Anyone who gets past the password gate can read it. Rotate it if the site password is ever shared.
2. **A Windows user-level `GEMINI_API_KEY` can override what you intended.** If the live site behaves like it is using an old key, check `.env.local`, the process env, and the Windows user-level variable, then rebuild and redeploy. Uploading a secret successfully does not prove the built bundle uses it.

Gemini model fallback chain (`services/geminiService.ts` and `SearchCard.tsx`): `gemini-3-flash-preview` → `gemini-3.5-flash` → `gemini-3.1-flash-lite`, retried on 429/503/quota errors.

---

## 11. Repo map

**Live application files:**

```
App.tsx                       page shell, quickActions, header, shortcuts modal
index.tsx / index.html / index.css
constants.ts                  portals, mode meta, county GIS, carrier data, (dormant) email templates
types.ts
vite.config.ts / tailwind.config.js / postcss.config.js
components/SearchCard.tsx           Unified Search  ← highest-traffic component
components/ContactLookup.tsx        live company-contact result panel
components/ProgramLauncher.tsx      launcher; PROGRAMS is the source of truth
components/QuickImageLinksCard.tsx  image uploader
components/CommandPalette.tsx       Ctrl+K palette: tools + client search + carrier numbers
components/Modal.tsx / Toast.tsx
services/imageHostService.ts        BLI Image Host client + presets
data/carrierContacts.ts             editable carrier phone/fax/email directory
hooks/useLocalStorage.tsx
functions/_middleware.ts            password gate
public/                             hosted tools + carrier logo images
```

**Dormant — kept intentionally, not imported by the app:** `components/AiAssistant.tsx`, `QuickSearchPopup.tsx` (replaced by the palette 2026-08-05), `Favorites.tsx`, `Header.tsx`, `PortalsCard.tsx`, `QuickActions.tsx`, `NeedsAnalysisCard.tsx`, `PdfParserCard.tsx`, `QuoteAssistantCard.tsx`, `TaskMatrixCard.tsx`; `services/geminiService.ts` (still used by SearchCard), `emailEngine.ts`, `emailDesignSystemV2.ts`, `poiTemplate.ts`.

---

## 12. Known issues / open items

- **Carrier logos still load from Imgur.** `DEFAULT_INSURANCE_PORTALS` in `constants.ts` (and `AGENCY_LOGO`, `CARRIER_LOGOS`) point at `i.imgur.com`, even though matching PNGs already sit in `public/` (`nationwide.png`, `progressive.png`, `nc_grange.png`, …) and the agency now runs its own image host. Worth switching to local paths so the drawer does not depend on Imgur.
- **`SITE_PASSWORD` has a committed fallback literal** in `functions/_middleware.ts`. Should fail closed when the variable is missing.
- **`agency-password-vault` is categorized as `AI`** in `PROGRAMS`. It is a password vault; it probably belongs under Operations.
- **`README.md` is still the stock AI Studio scaffold text** and does not describe this project.
- Bundle is ~560 kB (~138 kB gzipped) in one chunk — fine for an internal tool, but that is why the build prints a chunk-size warning.
- The dormant Gmail/Task/Quote components still compile on every `npm run lint`, so a breaking change to `constants.ts` or the services can fail the build from code nothing renders.

---

## 13. Rules for anyone working on this

1. **Unified Search stays first and visible without scrolling.** Never push content above it.
2. **`PROGRAMS` in `ProgramLauncher.tsx` is the launcher source of truth.** Fix links there.
3. **Adding a launcher tool requires bumping `LAUNCHER_VERSION` + listing ids in `NEW_IN_VERSION`**, or Bill will never see it (§7).
4. **Quick Links chips in `App.tsx` are a separate hardcoded list** and must be updated by hand.
5. **Do not delete the Gmail Engineering files.** They are staged for a rebuild.
6. **Push ≠ deploy.** Always run the wrangler command, and remember 401-from-curl is normal (§3).
7. Run `npm run lint` and `npm run build` before deploying.
8. Verify desktop **and** dark mode; keep the carrier-logo light plate (§5).
9. Never expose secrets in code, docs, screenshots, or chat.
10. If a change affects shared launcher targets, check the staff dashboard too.
11. Add or correct company contact details in `data/carrierContacts.ts`; keep the Contact Numbers UI data-driven.

---

## 14. Commit history since the redesign

```
e3a0368  Route real estate search to NC Insurance Tools                ← deployed 2026-07-23
9a10f64  Quick Image Links: format picker (Gmail / Logo / Web / GIF)   ← deployed 2026-07-23
0d3e131  Quick Image Links: swap Imgur for BLI Image Host
495defb  Switch Gemini models to gemini-3-flash-preview
979e704  Fix dark-mode carrier logos, daily search counter, launcher a11y
77518e4  Add Claude Quotes, Claude Gmail, Task Board, Mail Gateway tiles
708962c  Fix NC Grange 12-pay calculation
9f01bed  Add AI launcher section
4794539  Alphabetize Command Center launcher sections
a5f615b  Add Command Center shortcut containers
1c48336  Use hosted DL123 command center route
125a8ca  Add DL123 maker shortcut
9b1a351  Redesign command center: search-first single page, remove Gmail UI
```
