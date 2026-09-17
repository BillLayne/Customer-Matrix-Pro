# Home Quote Information Handoff

Date: September 17, 2026. Status: implemented and tested locally; NOT deployed.
Local implementation branch: `codex/home-quote-information` (not pushed).

## Purpose

Address-first homeowners quote preparation in Bill's agent Command Center. Staff can interview a prospect while the existing property service returns available county facts, then produce an indexed internal worksheet. This is not a rater, binder, application submission, replacement-cost calculation or claims/credit report.

Agent repository: `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro`
GitHub: https://github.com/BillLayne/Customer-Matrix-Pro
Current production: https://customer-matrix-pro.pages.dev/
Local preview: http://127.0.0.1:8788/

The staff dashboard, Gmail, contacts D1, launcher inventory, image library and original Real Estate actions are unchanged. Do not imply this feature is installed in the separate staff dashboard.

## User Flow

1. Unified Search > Real Estate. Enter a full North Carolina address, then Quote Information.
2. The interview opens immediately while research runs. Sections: Applicant, Home, Roof & Systems, Current Policy, Claims & Risk.
3. Review the property record. Select the correct candidate if there is more than one. Staff must confirm the address/parcel; selecting another candidate or importing a draft resets confirmation.
4. Prospect answers remain separate from public facts. Conflicting year-built/area answers and missing quote-critical answers are flagged.
5. Report shows the combined indexed worksheet. Download report creates `index.html`; Print / PDF invokes the browser print flow. Incomplete reports remain working intake with follow-up items.
6. Save draft downloads editable `home-quote-draft.json`. Open draft restores it after an explicit replace confirmation. The current tab retains sessionStorage; refresh can resume even with an empty search field. Clear requires confirmation.

## Architecture and File Map

- `components/SearchCard.tsx`: only imports/mounts the workspace, tracks open/draft state and adds the new button.
- `components/HomeQuoteWorkspace.tsx`: asynchronous research, editable interview, candidate confirmation, tab-scoped recovery, import/export and report preview.
- `shared/homeQuote.ts`: interview schema, public property allowlist, safe links, draft validation, follow-up/conflict rules and escaped HTML renderer.
- `server/homeQuote.ts`: signed-session and same-origin checks, address-only input validation, 22-second server timeout, redacted errors, fixed upstream URL and no-store response.
- `functions/api/home-quote.ts`: Cloudflare Pages function wrapper.
- `index.css`: scoped `quote-*` styles; neutral surfaces, blue actions, green research accent, amber verification warnings, existing dark theme.
- `tests/home-quote.test.mjs`: 10 focused synthetic tests alongside existing suites.
- `scripts/home-quote-browser-review.js`: Playwright CLI UI regression exercise; run in a dedicated, authenticated local browser with no real draft. Opens the Lee fixture below. Outputs ignored `output/playwright` screenshots and synthetic report/draft files.
- `scripts/preview-home-quote.mjs`: loopback-only Node preview fallback. Loads ignored private local auth configuration, runs real auth and quote handlers, serves built assets, blocks all other API workflows. Writes ignored browser auth state to `output/qa/home-quote-local-auth.json`; never print or commit that file.
- `skills/bli-home-quote-research/SKILL.md`: canonical repo skill copy. Installed same content in `C:\Users\bill\.codex\skills\bli-home-quote-research\SKILL.md`. Validated with the skill creator's quick validator. A later Codex session may be needed for discovery.

## Research Dependency

The new authenticated POST endpoint proxies ONLY `{ "address": "..." }` to:

`https://find-my-home-information.pages.dev/api/property`

Find My Home owns the public-safe response; NC Insurance Tools owns the county adapters. Do not duplicate adapters or expand the public endpoint to include private owner/applicant fields.

Read the cross-project source of truth first:

`C:\Users\bill\OneDrive\Documents\Playground\nc-insurance-tools\NC_TOOLS_FIND_MY_HOME_HANDOFF.md`

No changes or deployments are needed in Find My Home or NC Tools for this feature. Supported counties and completeness vary. The September 15 upstream handoff records an outstanding Buncombe property-card 404; do not advertise every source link as working or directly matched.

Live lookup verified September 17: `800 Creekwood Rd, Sanford, NC 27330` returned Lee parcel `9612-95-5442-00`, year built 2002, heated area 3644 and official source links through the new local authenticated handler. Synthetic prospect answers used for all browser tests; no real applicant data was entered.

## Data and Privacy

- Browser sessionStorage key: `matrix-home-quote-session-v1`.
- Only the address is submitted for research. Applicant name, DOB, phone/email, claims and policy answers stay in the tab or explicitly downloaded files.
- No cloud, D1, Drive, Matrix or customer-record writes. JSON and HTML exports are private plaintext documents, not encrypted backups. Use approved client storage and explicitly clear browser drafts when finished. Browser session restoration behavior varies.
- Changing an address cannot silently reuse another prospect's draft. Research retries preserve answers; late responses from cancelled requests are ignored.
- Public record missing fields remain Not shown. Unknown is not No or zero. Roof age is not inferred from year built; tax value is not Coverage A; map links do not establish a flood determination or protection class.
- Property card, deed, listing and flood links are provided but their page contents are not automatically parsed or independently verified. Use the installed skill for deeper source inspection, or staff review and interview notes.
- A signed-in user may save an incomplete report. It explicitly remains an intake worksheet, not a verified quote-ready application. Carrier-specific supplements still apply.

## Verification and Preview

Passed `npm test` (19 top-level tests, plus 15 internal checks in the existing contact suite), `npm run lint`, and `npm run build`.

Browser: 320, 390, 768 and 1440 widths; all three views fit without document/modal horizontal overflow. Core inputs/buttons meet 44px targets. Inspected desktop, narrow phone and dark-theme screenshots. Checked keyboard containment/return focus, HTML escaping, report/download filenames, private draft JSON roundtrip, reload/resume, clear, slow research while typing, multiple-candidate confirmation reset, address isolation and simulated 502 recovery.
Also checked the explicit No current policy state so an uninsured prospect is not incorrectly required to supply current Coverage A or renewal dates. Exported HTML was opened independently at phone width and inspected with print CSS; this is not proof of a physical printer or native print dialog.

Windows workerd could not spawn with Wrangler 4.129.1 or 4.133.0 (`spawn UNKNOWN`). Both function compilations succeeded, but Cloudflare runtime execution is unverified. Local preview uses the same Request/Response handlers via Node:

```powershell
npm run build
node --experimental-strip-types scripts/preview-home-quote.mjs
```

Preview starts only on loopback port 8788. The running preview started for this task has process ID 52308; check actual process/port before stopping anything. Other API 503s in preview are intentional; production contacts remain intact. The quote UI tests also deliberately trigger a synthetic 502. No unexpected frontend runtime exceptions were observed.

Remaining manual checks: real phone keyboard behavior, native print/PDF dialog, and deployed Cloudflare function. No new production verification claimed.

## Release When Bill Says Push Live

1. Inspect git status and preserve unrelated work. Read the main handoff release protocol.
2. Re-run tests, lint, build and staged secret scan. No new API key, database, migration or secret is required.
3. Commit/push only this approved feature and deploy Customer-Matrix-Pro Pages with its existing signed-session configuration. Do not deploy staff, Find My Home or NC Tools incidentally.
4. Confirm the production bundle changed and the Quote Information button appears. Verify unauthorized requests fail, a signed address-only lookup returns the expected parcel, and a synthetic interview/export works without sending messages or storing customer records. Confirm existing links, contacts and other workspaces remain intact.
5. Record exact commit, deployment ID, bundle and verified results in both handoffs. Do not call the missing-key Gmail AI verified; this feature is independent of it.
