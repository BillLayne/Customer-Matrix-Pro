# Home Quote Information Handoff

Date: September 17, 2026. Status: LIVE, authorized by Bill's "push live" request.
Implementation commit: `c176396`, fast-forwarded from `codex/optional-quote-questions` to GitHub `main`.
Production deployment: `e4e1bc07-e01d-4d4e-8f37-d0f3f2419d51`, Cloudflare status success, branch main.
Deployment URL: https://e4e1bc07.customer-matrix-pro.pages.dev/
Verified production JS: `/assets/index-dDbyBRGM.js`; CSS: `/assets/index--RRS5zI5.css`.

## September 17 Follow-Up - Live

Bill explicitly authorized publishing these fixes. Branch `codex/optional-quote-questions` was fast-forwarded into GitHub `main`; production identifiers above describe this follow-up release.

- Removed the quote-critical stars and required-looking legend. Every interview question is optional, including Coverage A, renewal, DOB and applicant information. Blank answers, missing research and unconfirmed property matches do not prevent moving between sections, saving a draft or exporting a report. Existing format warnings and property-match safeguards remain advisory.
- Renamed the visible report checklist to Follow-Up Notes. Internal `critical` metadata is retained only to select advisory reminders, not to enforce required fields. The Additional named insured field has not been duplicated or changed.
- Fixed research integration in the indexed report. Home rows now include available year built, heated area, exterior wall, foundation, stories, bedrooms and baths. Roof & Systems includes available roof covering, roof structure and heating type. Partial public facts retain their precise labels; roof covering does not imply condition or age, and foundation does not invent basement details.
- Each researched value identifies its public-record source and checked/unconfirmed property-match state. Where staff supplies an answer, the report shows that answer and the public value separately. The interview model is not auto-filled and conflicts stay flagged. Switching the selected parcel changes the public values in the report; JSON import still resets property confirmation.
- No schema migration, API, credentials or backend dependency changes. Old JSON drafts still load; old exported HTML is static and needs to be downloaded again after the update.
- Passed: all 23 top-level tests (plus 15 existing internal contact checks), `npm run lint`, `npm run build`, and both browser scripts below. The full browser review used the real upstream Lee fixture via the local adapter and confirmed year 2002 / heated area 3644 are integrated beside synthetic prospect answers in Home. Test drafts were cleared.
- `scripts/home-quote-optional-review.js`: local-preview-only Playwright CLI regression. Verifies all five sections entirely blank; draft/report download before research finishes; automatic research integration into an already-open report; insured prospect without coverage/renewal; preservation of the one Additional named insured field; conflicting sources; blank and partial JSON imports; and report/interview layouts at 320/390/768/1440 widths. All upstream responses in this focused script are synthetic.
- `scripts/home-quote-browser-review.js`: existing full regression now also checks that the actual research appears in the Home report rows. It still covers dark mode, focus, simulated failures, multiple parcels, address privacy, refresh/recovery and exports.
- Preview remains http://127.0.0.1:8788/ . Contacts/images/AI requests are intentionally isolated by the preview adapter. No production writes, customer messages or real applicant data used. Native print dialogs and physical-device keyboard behavior remain unverified.

## Follow-Up Production Verification

- Re-ran all 23 top-level tests (and 15 internal contact checks), TypeScript and build before pushing `c176396`. Deployed from a clean main worktree to only `customer-matrix-pro`.
- `verify-deployment.mjs` and `verify-home-quote-deployment.mjs` both passed on the canonical live URL. Verified the exact tested bundle, signed login, anonymous/forged-cookie rejection, contact reads, origin protection, quote endpoint 401/403/400/405 checks, and the real Lee lookup with no-store.
- Live browser walkthrough skipped every question in all five sections, downloaded `index.html`, and verified year 2002 / heated area 3644 are present in Home with public-record source labels despite blank interview answers. Also passed Currently insured with blank Coverage A and renewal.
- Live report screenshots reviewed at 320/390/1440 widths; no horizontal overflow or JavaScript runtime errors. Native print dialog was not exercised, though its action remained enabled with blank answers. Local pre-release testing also covered 768 widths, complete synthetic Home/Roof facts, conflicts, imports and draft recovery.
- Shared contacts remained at 20 entries and revision 7 before and after this release's browser checks. Intercepted contact writes in the dedicated QA browser to prevent first-run migration writes. No real customer data entered, messages sent, records changed, secrets rotated or DB migrations run. Test quote draft cleared at completion.
- Staff dashboard, Find My Home, NC Tools and Gmail were not changed or deployed. Old downloaded HTML reports remain static and need regeneration to receive the integrated layout.

## Initial Release Verification

Initial release: `e73bf90`, deployment `c0edddad-2915-49ce-9f9e-c6fdc043c428`, now superseded by the follow-up above.

- Re-ran all 19 top-level tests, TypeScript and Vite build before publishing. Renamed the ignored Wrangler multipart artifact `output/qa/home-quote-worker.js` to `.multipart` because it is not JavaScript source and was mistakenly included by the TypeScript file glob.
- `node scripts/verify-deployment.mjs https://customer-matrix-pro.pages.dev agent` passed signed login, anonymous/forged-cookie rejection, contact access, cross-origin protection, bundle availability and private-config absence checks.
- `node scripts/verify-home-quote-deployment.mjs https://customer-matrix-pro.pages.dev` passed the deployed quote endpoint's 401 anonymous, 403 cross-origin, 400 unexpected private-field and 405 wrong-method cases; the real address-only lookup returned Lee parcel `9612-95-5442-00`, year built 2002 and heated area 3644. The live HTML references the exact locally tested bundle.
- Production Playwright review passed interview/property/report views at 320/390/768/1440 widths, dark mode, focus containment/return, editable synthetic answers during research, candidate changes, address isolation, simulated lookup failure, HTML escaping, No current policy handling, JSON export/import, refresh/resume, clear and `index.html` download. Test drafts were cleared after verification.
- Tools and Images views still open; existing No Loss and PDF Studio destinations were inspected. Shared contacts returned 20 entries before and after. The fresh test browser's pre-existing first-run contact migration performed its normal confirmation PUT, advancing revision 6 to 7; no manual contact edit controls were used.
- Only the agent Command Center was pushed/deployed. No messages sent, carrier forms submitted, secret changes or DB migrations. Staff, Find My Home and NC Tools were not deployed.
- The Cloudflare runtime limitation from local preview is now resolved for this release by successful production checks. Physical-device keyboards and native print/PDF dialogs remain unverified. Source-link/deeper research limitations below still apply.

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
4. All interview answers are optional. The report integrates public facts into the corresponding Home and Roof rows with separate source labels, keeping prospect answers distinct. Conflicts and missing details are advisory follow-up notes.
5. Report shows the combined indexed worksheet. Download report creates `index.html`; Print / PDF invokes the browser print flow. Incomplete reports remain working intake with follow-up items.
6. Save draft downloads editable `home-quote-draft.json`. Open draft restores it after an explicit replace confirmation. The current tab retains sessionStorage; refresh can resume even with an empty search field. Clear requires confirmation.

## Architecture and File Map

- `components/SearchCard.tsx`: only imports/mounts the workspace, tracks open/draft state and adds the new button.
- `components/HomeQuoteWorkspace.tsx`: asynchronous research, editable interview, candidate confirmation, tab-scoped recovery, import/export and report preview.
- `shared/homeQuote.ts`: interview schema, public property allowlist, safe links, draft validation, follow-up/conflict rules and escaped HTML renderer.
- `server/homeQuote.ts`: signed-session and same-origin checks, address-only input validation, 22-second server timeout, redacted errors, fixed upstream URL and no-store response.
- `functions/api/home-quote.ts`: Cloudflare Pages function wrapper.
- `index.css`: scoped `quote-*` styles; neutral surfaces, blue actions, green research accent, amber verification warnings, existing dark theme.
- `tests/home-quote.test.mjs`: 14 focused synthetic tests alongside existing suites.
- `scripts/home-quote-browser-review.js`: Playwright CLI UI regression exercise; run in a dedicated, authenticated local browser with no real draft. Opens the Lee fixture below. Outputs ignored `output/playwright` screenshots and synthetic report/draft files.
- `scripts/verify-home-quote-deployment.mjs`: repeatable address-only live smoke test using the ignored auth state produced by `verify-deployment.mjs`; verifies exact bundle and authorization/input boundaries without sending interview answers upstream.
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

Windows workerd could not spawn with Wrangler 4.129.1 or 4.133.0 (`spawn UNKNOWN`). Both function compilations succeeded. Cloudflare production runtime execution was subsequently verified successfully after deployment. Local preview uses the same Request/Response handlers via Node:

```powershell
npm run build
node --experimental-strip-types scripts/preview-home-quote.mjs
```

Preview starts only on loopback port 8788. The running preview started for this task has process ID 52308; check actual process/port before stopping anything. Other API 503s in preview are intentional; production contacts remain intact. The quote UI tests also deliberately trigger a synthetic 502. No unexpected frontend runtime exceptions were observed.

Remaining manual checks: real phone keyboard behavior and native print/PDF dialog. Production evidence is recorded above.

## Future Release Procedure

1. Inspect git status and preserve unrelated work. Read the main handoff release protocol.
2. Re-run tests, lint, build and staged secret scan. No new API key, database, migration or secret is required.
3. Commit/push only this approved feature and deploy Customer-Matrix-Pro Pages with its existing signed-session configuration. Do not deploy staff, Find My Home or NC Tools incidentally.
4. Confirm the production bundle changed and the Quote Information button appears. Verify unauthorized requests fail, a signed address-only lookup returns the expected parcel, and a synthetic interview/export works without sending messages or storing customer records. Confirm existing links, contacts and other workspaces remain intact.
5. Record exact commit, deployment ID, bundle and verified results in both handoffs. Do not call the missing-key Gmail AI verified; this feature is independent of it.
