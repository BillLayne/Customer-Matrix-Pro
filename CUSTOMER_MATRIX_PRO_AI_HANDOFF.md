# Agency Command Center — Live Handoff

**Last verified against the code: August 16, 2026** (HEAD `7cd468d`).

This describes the dashboard **as it actually exists right now**. If anything here disagrees with the code, the code wins — re-verify and fix this file in the same commit.

> **Bill works with more than one AI assistant on this repo (Claude and ChatGPT).** If that's you, read **§0** before touching anything. It exists because a real coordination accident already happened here.

---

## 0. Working alongside another AI assistant

Two assistants editing one repo is fine, but this project has three sharp edges that punish it. All three are real, not hypothetical.

### The big one: a deploy ships the *working folder*, not the last commit

```
npx wrangler pages deploy dist --project-name customer-matrix-pro
```

`dist` is whatever `npm run build` just produced from the files **currently on disk** — committed or not. So if Assistant A leaves half-finished edits uncommitted and Assistant B deploys an unrelated fix, **A's unfinished work goes live too**.

This exact thing happened on 2026-08-11: a session found ~300 uncommitted lines of image-library work sitting in the tree while trying to ship a one-line launcher addition.

**Protocol — every assistant, every time:**

1. `git status --short` **before** you edit anything. If it's dirty and the changes aren't yours, **stop and ask Bill** what that work is and whether it should ship. Do not assume it's abandoned; do not `git checkout` over it.
2. `git status --short` **before** you deploy. Deploy only from a clean tree, or with Bill's explicit OK to include what's there.
3. **Commit your own work before you hand the conversation back.** Uncommitted work is invisible to the next assistant and is the thing that gets shipped by accident.

### Second: `LAUNCHER_VERSION` collisions

Adding a tool requires bumping `LAUNCHER_VERSION` (§7). If two assistants each bump "4 → 5" independently, one set of `NEW_IN_VERSION` ids is silently lost and that tool never surfaces for Bill.

**Always read the current value in `components/ProgramLauncher.tsx` immediately before you bump it.** Never bump from memory or from this document — this doc can lag.

### Third: this file goes stale and then actively misleads

Before this rewrite, §13 still instructed maintainers to update a "Quick Links chip row" that had been deleted a week earlier. An assistant following it would have rebuilt a thing we deliberately removed.

**If you change structure, update this file in the same commit.** A wrong handoff is worse than no handoff.

### Handoff etiquette

- Say plainly which files you touched and whether you committed and/or deployed.
- Prefer small, focused commits — they're far easier for the next assistant to read than one giant one.
- If Bill is pasting code to you rather than giving you file access: ask for the **whole** file you're changing, and hand back the whole file or an exact find/replace. Partial context is how this repo's markup gets clobbered.
- Don't refactor shared files (`ProgramLauncher.tsx`, `App.tsx`, `constants.ts`) as a side quest. Everyone touches those.

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

**Current state:** HEAD `7cd468d` (2026-08-11), pushed and deployed. Last release added the Ctrl+K command palette, the single-favorites cleanup, PDF Studio, BLI Auto Rater, and full image-library search.

---

## 2. What the app is

A single-page internal dashboard Bill opens every day. Two jobs dominate:

1. **Search Agency Matrix** for a customer by name or address — the first action of most tasks.
2. **Launch one of 42 agency tools** without hunting through bookmarks.

**The governing UX rule: Unified Search stays at the top and must be usable without scrolling.** Never push content above it.

### Page structure (top to bottom, `App.tsx`)

1. **Sticky header** — logo, in-page nav (Search / Tools / Images), "Search or Launch" palette button (Ctrl+K), shortcuts modal, light/dark toggle
2. **Unified Search** (`components/SearchCard.tsx`) — search modes, action row (incl. the Matrix Home / New Prospect / Reports strip), collapsible Carrier Portals drawer
3. **Program Launcher** (`components/ProgramLauncher.tsx`)
4. **Quick Image Links** (`components/QuickImageLinksCard.tsx`)

Plus the **Command Palette** overlay (§6).

There are **no tabs** — that system and its `matrix-pro-layout-mode` key were removed in `9b1a351`. There is **no Quick Links chip row** — removed 2026-08-11 (§6).

### Gmail Engineering is gone from the UI

Removed in `9b1a351` because it was broken; Bill plans to rebuild it. **The files are deliberately still in the repo — do not delete them:** `components/AiAssistant.tsx`, `services/geminiService.ts`, `services/emailEngine.ts`, `services/emailDesignSystemV2.ts`, `services/poiTemplate.ts`, and `PROMPT_TEMPLATES` / `TEMPLATE_KEYS` / `TemplateContract` in `constants.ts`. `GMAIL_ENGINEERING_STUDIO_HANDOFF.md` is an archive of how that system worked.

`AiAssistant.tsx` is imported nowhere, but `tsc --noEmit` still type-checks it, so it must keep compiling.

---

## 3. Build, verify, deploy

From the repo root:

```bash
npm run lint && npm run build
```

`lint` is `tsc --noEmit` (there is no ESLint). Then:

```bash
npx wrangler pages deploy dist --project-name customer-matrix-pro
```

**Four gotchas — each has burned a previous session:**

- **No CI.** GitHub never builds this. **A push is not a deploy.**
- **A deploy ships the working folder, not the last commit.** See §0.
- **`curl` returns 401 + the access-gate login page, not the app.** That's the auth middleware working correctly. Never conclude "the deploy failed" from a curl result — check in an authenticated browser.
- **Propagation + browser cache.** The origin can serve the previous `index.html` for ~5–15s, and a browser will serve a cached copy far longer. Verify with `fetch(url, {cache:'no-store'})` and retry before believing a stale result. Bill usually needs Ctrl+Shift+R.

**Local dev:** `npm run dev` (Vite, port 3000). There's a preview entry named `matrix-pro` on port 8797 in the LIVE repo's `.claude/launch.json`. Note: screenshot tooling reliably times out on this app — verify via DOM evaluation or a real browser.

---

## 4. Stack & infrastructure

- React 19 + TypeScript + Vite 6 → Cloudflare Pages static assets
- **Tailwind compiles at build time** (`tailwind.config.js` + `postcss.config.js` + `index.css`). The `cdn.tailwindcss.com` runtime script was removed 2026-07-14. New utility classes work via JIT; if a class silently does nothing, check the `content` globs.
- Font Awesome 6 + Google Fonts (Inter, Outfit) still load from CDN in `index.html`
- `@google/genai` powers the AI features inside Search
- `marked` — dependency of the dormant Gmail code
- **No database.** All state is `localStorage` (§9), so nothing syncs between Bill's computers.

### Access gate — `functions/_middleware.ts`

A Cloudflare Pages Function password-gates the whole site.

- Cookie `customer_matrix_pro_auth=approved`, one week, HttpOnly + Secure
- Routes: `POST /login`, `/logout`
- Password comes from the `SITE_PASSWORD` env var on the Pages project
- **Security note:** the middleware falls back to a hardcoded password literal when `SITE_PASSWORD` is unset, and that literal is committed. Should fail closed instead (§12).

---

## 5. Unified Search — `components/SearchCard.tsx`

The highest-traffic component in the app. Treat it carefully.

**Six modes** (`MODE_META` in `constants.ts`):

| Mode | Opens | Shortcut |
|---|---|---|
| Agency Matrix | `agents.agencymatrix.com` customer search | Ctrl + M |
| Web Search | Google | Alt + W |
| Real Estate | NC Insurance Tools property lookup, `?address=` prefilled | Alt + H |
| People | TruePeopleSearch | Alt + P |
| Client Folder | Google Drive search | Alt + F |
| Contact Numbers | Local carrier contact directory, live matching | Alt + C |

Agency Matrix mode picks `selection=Address` when the query contains a digit, else `selection=Name`. **The command palette repeats this rule — keep the two in sync.**

**Other features:**

- `/` focuses the search input from anywhere (unless already typing)
- Recent searches (last 6) as chips — `matrix-pro-search-history`
- Action row: Search · Cloud Folder · Audit Memo · **NC Tools** (Real Estate mode only) · divider · **Matrix Home · New Prospect · Reports**
- **Audit Memo studio** (Alt+N or Ctrl+Shift+M) — E&O compliance memo builder. Paste notes or attach a PDF/image; Gemini formats an audit-ready CRM memo; "Execute Sync & Matrix" copies it and opens the customer in Agency Matrix.
- **Real Estate → NC Tools handoff** — Enter, the arrow button, or the NC Tools button opens NC Insurance Tools with `?address=…`, which auto-runs the lookup in its `PropertyTab.tsx`.
- **Contact Numbers** — results appear as Bill types, in a contained scrolling panel. `tel:` links; copy buttons on phone/fax/email/website. 17 companies built in.
- **Manual contact editor** — "Add Contact" for a new company; the **+** on a company card opens a manager prefilled. Built-in details can be corrected without editing `data/carrierContacts.ts`; removing a saved correction restores the original.
- **Carrier Portals** — collapsible drawer (`matrix-pro-show-carrier-gateway`). Six daily portals from `DEFAULT_INSURANCE_PORTALS`, plus a **More Carriers** panel of ten from `MORE_CARRIER_PORTALS` (both in `constants.ts`).
- Search counter resets per calendar day (`matrix-pro-search-log`)

**Two things not to undo:**

- **Dark-mode logo plate.** Carrier logos are dark-ink artwork on a 10%-opacity brand tint, so in dark mode they vanish without a light plate. Each logo is wrapped in a `dark:bg-white/95` plate that drops away on hover (where the tile fills with the carrier color). Keep the wrapper if you touch portal markup.
- **The More Carriers panel expands inline, below the tile row — not as a floating dropdown.** A popover was tried and rejected: the search card clips overflow, so an upward-anchored menu slid under the sticky header.

**Data source of truth:** add carrier phone/fax/email/website/alias records to `data/carrierContacts.ts`; add portals to `constants.ts`. Never hardcode them into components.

---

## 6. Command Palette — `components/CommandPalette.tsx`

**Ctrl+K** (or the header's "Search or Launch" button) opens one overlay that reaches everything. Ctrl+M is kept as an in-page alias, though on Bill's PC a **global AutoHotkey Ctrl+M** usually swallows that key first (that's a separate OS-level helper, not this repo).

- **Tools** — filters all `PROGRAMS` (word-match on title/description/category/note; title hits ranked first). Opens via the exported `resolveProgramDestination()` so behavior matches the launcher exactly, and updates `matrix-pro-recent-programs`.
- **Client search** — a "Search Agency Matrix for …" row is always present on a non-empty query, and is the *first* row when nothing else matched. So `cert ⏎` opens Certificates; `john smith ⏎` searches Matrix.
- **Carrier numbers** — matches built-in `COMPANY_CONTACTS` (phone/fax); Enter or click copies the number, with a toast that shows the number itself if the clipboard write fails. Browser-saved *manual* contacts are **not** searched here — those live only in Contact Numbers mode.
- Empty query lists recent-then-pinned tools (max 8). ↑↓ + Enter, Esc closes, mouse works throughout.

`QuickSearchPopup.tsx` was replaced by the palette and is now dormant.

### The Quick Links chip row is GONE — do not rebuild it

It had grown to 16 chips duplicating the launcher's Pinned row: two hand-maintained favorites lists, two places to edit for every new tool. Removed 2026-08-11. The three genuinely Matrix-owned links moved into the Search card's action row; **everything else lives in Pinned only.** If Bill wants a shortcut promoted, **pin it** — don't add a second list.

### Toast policy

Opening tools, running searches, and switching modes **do not toast** — the new tab or visible state change is the feedback. Toasts are reserved for **outcomes**: copies, saves, errors, popup-blocked, GIS/report results. Don't reintroduce "Opening X…" chatter.

---

## 7. Program Launcher — `components/ProgramLauncher.tsx`

**The `PROGRAMS` array here is the single source of truth for every launcher target.** Wrong link? Fix it here.

**42 tools in 4 categories:** Operations (11) · Documents & Forms (15) · AI (12) · Property & Coverage (4). Sorted alphabetically within each section.

**How Bill finds things:**

- **Filter box** — matches title/description/category/note; `/` focuses it; **Enter opens the first match**; Escape clears
- **Category pills** — All / Operations / Documents & Forms / AI / Property & Coverage with counts; selection persists in `matrix-pro-launcher-category`
- **Pinned** — star any tile to keep it on top (`matrix-pro-pinned-programs`)
- **Recent** — last 6 opened, as chips (`matrix-pro-recent-programs`)

**Exports the palette depends on — keep them:** `PROGRAMS`, `ProgramEntry`, `ProgramCategory`, `CATEGORY_STYLES`, `RECENT_PROGRAMS_KEY`, `PINNED_PROGRAMS_KEY`, `resolveProgramDestination()`.

### ⚠️ Adding a new tool — the version-stamp protocol

`DEFAULT_PINNED` **only applies to a browser that has never opened the dashboard.** Bill's browser already has a saved pin list, so a newly added tool would otherwise **never appear for him**. To add a tool:

1. Append the entry to `PROGRAMS`
2. **Read the current `LAUNCHER_VERSION` in the file** and bump it by one
3. **List the new id(s) under that new version number in `NEW_IN_VERSION`**
4. Optionally add the id to `DEFAULT_PINNED` for fresh browsers

On next load those ids are pinned once and badged **NEW**; unpinning afterwards still sticks, because the version was already recorded.

**Currently `LAUNCHER_VERSION = 4`** — v2: task board, mail gateway, Claude Quotes/Gmail · v3: `pdf-studio` · v4: `bli-auto-rater`. *(Verify in the file before bumping — see §0.)*

**How to test it properly:** in the browser console, set `matrix-pro-launcher-version` to the *previous* version and remove the new id from `matrix-pro-pinned-programs`, then reload. The tile should auto-pin and show a NEW badge.

### Local vs hosted targets

Entries may carry both a Windows `target` and a `hostedTarget`. On the deployed site the hosted URL wins; locally, `targetType: 'local'` opens a `file:///` URL. A local-only tool with no `hostedTarget` shows a warning toast on the live site instead of a broken link.

Tools hosted inside this repo's `public/`: `/html-studio.html`, `/nc-grange-down-payment-calculator.html`, `/photo-guide-composer.html`, `/dl123-generator/index.html`. **Real deployed utilities, not examples** — edit them here.

---

## 8. Quick Image Links — `QuickImageLinksCard.tsx` + `services/imageHostService.ts`

Migrated off Imgur 2026-07-23. Uploads go to **BLI Image Host** at `https://img.billlayneinsurance.com`. The Imgur service and Client-ID were deleted from this repo.

- **Access code** entered once per device → `localStorage` `bliImgAccessCode`, verified via `GET /api/check` with an `x-access-code` header
- **Format presets, chosen before upload** (persisted in `quick-image-preset`, default **Gmail**):

| Preset | Output | Why |
|---|---|---|
| **Gmail** (default) | JPEG, max 1200px, q0.80 | Bill mostly uploads for Gmail templates, and email clients can't render WebP |
| Logo | PNG | keeps transparency and sharp edges |
| Web | WebP, max 1600px, q0.82 | smallest files for web pages and quotes |
| GIF / Original | untouched | animation and vectors survive |

- Optimization is **client-side** (canvas) before the POST. GIF/SVG always pass through. JPEG flattens transparency onto white. If re-encoding wouldn't shrink the file, the original uploads instead.
- Upload: `POST /api/upload?filename=…` with the blob as the body; the returned URL auto-copies.
- **Recent Uploads** = browser-local convenience history only (last 25, `quicklink-upload-history`).
- **Image Library search** = the permanent host, via authenticated paginated `GET /api/list`. `listAllHostedImages()` follows every cursor, dedupes by key, sorts newest-first. Matches each typed word against filename, host label, object key, and URL. This is how Bill reaches images uploaded from a *different* computer.

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
| `matrix-pro-launcher-category` | last selected category pill |
| `matrix-pro-manual-company-contacts` | browser-saved contact additions/corrections |
| `quick-image-preset` | selected image format preset |
| `quicklink-upload-history` | recent image uploads |
| `bliImgAccessCode` | BLI Image Host access code |

A `local-storage-error` event surfaces quota failures as a toast. **Nothing here syncs between devices** — there's no database.

---

## 10. Environment & secrets

Never put real secret values in this file, in code, in chat, or in screenshots.

- **`.env.local`** (gitignored) — `GEMINI_API_KEY`
- **`.dev.vars`** (gitignored) — `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `SITE_PASSWORD`
- **Cloudflare Pages project settings** — `SITE_PASSWORD` for the live gate

`vite.config.ts` resolves the Gemini key in order: `env.GEMINI_API_KEY` → `process.env.GEMINI_API_KEY` → `process.env.GOOGLE_API_KEY` → `process.env.API_KEY`, then defines both `process.env.API_KEY` and `process.env.GEMINI_API_KEY`.

**Two consequences:**

1. **The Gemini key is baked into the built frontend bundle.** Anyone past the password gate can read it. Rotate if the site password is ever shared.
2. **A Windows user-level `GEMINI_API_KEY` can override what you intended.** If the live site acts like it's using an old key, check `.env.local`, process env, and the Windows user-level variable, then rebuild and redeploy. A successful secret upload does not prove the built bundle uses it.

Gemini model fallback chain: `gemini-3-flash-preview` → `gemini-3.5-flash` → `gemini-3.1-flash-lite`, retried on 429/503/quota.

---

## 11. Repo map

**Live application files:**

```
App.tsx                       page shell, header, shortcuts modal, palette wiring
index.tsx / index.html / index.css
constants.ts                  portals, mode meta, county GIS, carrier data, (dormant) email templates
types.ts
vite.config.ts / tailwind.config.js / postcss.config.js
components/SearchCard.tsx           Unified Search  ← highest-traffic component
components/ContactLookup.tsx        live company-contact result panel
components/ProgramLauncher.tsx      launcher; PROGRAMS is the source of truth
components/CommandPalette.tsx       Ctrl+K palette: tools + client search + carrier numbers
components/QuickImageLinksCard.tsx  image uploader + library search
components/Modal.tsx / Toast.tsx
services/imageHostService.ts        BLI Image Host client + presets
data/carrierContacts.ts             editable carrier phone/fax/email directory
hooks/useLocalStorage.tsx
functions/_middleware.ts            password gate
public/                             hosted tools + carrier logo images
```

**Dormant — kept intentionally, not imported:** `AiAssistant.tsx`, `QuickSearchPopup.tsx`, `Favorites.tsx`, `Header.tsx`, `PortalsCard.tsx`, `QuickActions.tsx`, `NeedsAnalysisCard.tsx`, `PdfParserCard.tsx`, `QuoteAssistantCard.tsx`, `TaskMatrixCard.tsx`; `emailEngine.ts`, `emailDesignSystemV2.ts`, `poiTemplate.ts`. (`geminiService.ts` is still used by SearchCard.)

---

## 12. Known issues / open items

- **Older modals are off-brand.** The Audit Memo studio, GIS popup, and Risk Intel viewer still carry the *previous* design: a teal `#2080a0` accent used nowhere else, black pill buttons, heavy uppercase labels ("Retina Audit Active", "Parse DNA"). They work, but look like a different app. A contained restyle into the navy/slate system is the one paint job worth doing.
- **Carrier logos still load from Imgur.** `DEFAULT_INSURANCE_PORTALS` (and `AGENCY_LOGO`, `CARRIER_LOGOS`) point at `i.imgur.com` even though matching PNGs sit in `public/` and the agency runs its own image host. The newer `MORE_CARRIER_PORTALS` already use local paths.
- **`SITE_PASSWORD` has a committed fallback literal** in `functions/_middleware.ts`. Should fail closed.
- **`agency-password-vault` is categorized `AI`** in `PROGRAMS`; it's a password vault and probably belongs in Operations.
- **`README.md` is still the stock AI Studio scaffold** and doesn't describe this project.
- Bundle is ~604 kB (~148 kB gzipped) in one chunk — fine for an internal tool, but that's the chunk-size warning on every build.
- The dormant Gmail/Task/Quote components still type-check on every lint, so a breaking change to `constants.ts` or the services can fail the build from code nothing renders.

---

## 13. Rules for anyone working on this

1. **Read §0 first if another assistant is also working on this repo.**
2. **Unified Search stays first and visible without scrolling.**
3. **`PROGRAMS` in `ProgramLauncher.tsx` is the launcher source of truth.**
4. **Adding a launcher tool = append to `PROGRAMS` + bump `LAUNCHER_VERSION` + list ids in `NEW_IN_VERSION`** (§7), reading the current version from the file first. Otherwise Bill never sees it.
5. **Favorites live in Pinned only.** Don't create a second shortcut list.
6. **Don't reintroduce "Opening X…" toasts.** Outcomes only (§6).
7. **Don't delete the dormant Gmail files.** They're staged for a rebuild.
8. **Push ≠ deploy**, and a deploy ships the working folder (§0, §3). 401-from-curl is normal.
9. Run `npm run lint` and `npm run build` before deploying.
10. Verify desktop **and** dark mode; keep the carrier-logo light plate (§5).
11. Add carrier contact details to `data/carrierContacts.ts`, portals to `constants.ts` — keep the UI data-driven.
12. Never expose secrets in code, docs, screenshots, or chat.
13. If a change affects shared launcher targets, check the staff dashboard too.
14. **Update this file in the same commit as any structural change.**

---

## 14. Copy/paste brief for a fresh assistant

> This is Bill Layne Insurance's personal **Agency Command Center** dashboard.
> Repo: `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro` · GitHub `BillLayne/Customer-Matrix-Pro` · live (password-gated) at https://customer-matrix-pro.pages.dev/ · Cloudflare Pages project `customer-matrix-pro`.
>
> **Stack:** React 19 + TypeScript + Vite 6, Tailwind compiled at build time, no database (state is localStorage), Cloudflare Pages Function password gate.
>
> **Layout — one scrolling page, no tabs:** Unified Search (must stay visible without scrolling) → Program Launcher → Quick Image Links, plus a Ctrl+K command palette overlay.
>
> **Critical rules:**
> 1. Another AI may be working in this repo — run `git status --short` before editing AND before deploying; if it's dirty and not yours, ask Bill. Commit your work before handing back.
> 2. `npm run lint && npm run build`, then `npx wrangler pages deploy dist --project-name customer-matrix-pro`. **A push is NOT a deploy**, and a deploy ships the working folder, not the last commit.
> 3. `curl` on the live site returns **401 + a login page** — that's the gate working, not a failed deploy.
> 4. Adding a launcher tool: append to `PROGRAMS` in `components/ProgramLauncher.tsx`, then bump `LAUNCHER_VERSION` (read its current value first) and list the new id in `NEW_IN_VERSION` — otherwise it never appears for Bill, because his browser has a saved pin list.
> 5. Favorites live in the launcher's Pinned row only. Don't add a second shortcut list — the old Quick Links chip row was deliberately deleted.
> 6. Don't add "Opening X…" toasts; toasts are for outcomes only.
> 7. Don't delete the dormant Gmail Engineering files — they're staged for a rebuild.
> 8. Keep the `dark:bg-white/95` plate behind carrier logos or they vanish in dark mode.
>
> Full detail is in `CUSTOMER_MATRIX_PRO_AI_HANDOFF.md` in the repo root — read it before structural changes, and update it in the same commit if you change structure.

---

## 15. Commit history (newest first)

```
7cd468d  2026-08-11  Add BLI Auto Rater to the launcher (v4)
df6d4cf  2026-08-11  Handoff: document palette, single-favorites cleanup, quieter toasts
3e17c40  2026-08-11  Add Ctrl+K command palette: clients, tools, and carrier numbers
d9305ea  2026-08-11  One favorites system, quieter toasts, sticky category, slim dropzone
9f37a90  2026-08-11  Quick Image Links: search the full BLI Image Host library
9814ae5  2026-08-11  Add PDF Studio to the launcher and Quick Links
4ab7ff5  2026-07-29  Add editable carrier contact details
61d28f7  2026-07-29  Add searchable carrier contact directory
bc3e03b  2026-07-27  Carrier portals: add six more to the More Carriers panel
923910a  2026-07-23  Carrier portals: promote NC Grange, add More Carriers panel
e3a0368  2026-07-23  Route real estate search to NC Insurance Tools
9a10f64  2026-07-23  Quick Image Links: format picker (Gmail / Logo / Web / GIF)
0d3e131  2026-07-23  Quick Image Links: swap Imgur for BLI Image Host
9b1a351  2026-06-10  Redesign command center: search-first single page, remove Gmail UI
```
