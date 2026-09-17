---
name: bli-home-quote-research
description: Prepare an address-first homeowners insurance quote intake for Bill Layne Insurance. Use when Bill or staff supplies a home address and wants Find My Home property research, a prospect interview checklist, or a combined indexed index.html report for quoting. Keep public records separate from prospect answers. For extraction from an existing policy or carrier portal, use home-policy-quote-intake instead.
---

# BLI Home Quote Research

## Scope and Safety

This is an internal quote-preparation workflow, not a quote, binder, eligibility decision, replacement-cost estimate, or application submission. Never invent an applicant, DOB, ownership, claims history, roof age, policy limits or renovation dates. Blank means **Not shown**. Conflicting or uncertain facts mean **Needs verification**.

Keep existing applications, search actions, records and private data unchanged. Do not submit forms, send messages, run credit/claims reports, or alter carrier records. Do not publish reports containing personal information. Ask only for missing necessary information. Never collect SSNs for this worksheet.

## Start

1. Confirm the full street address, city, state and ZIP. Current automatic county research is North Carolina only.
2. Read the current cross-project handoff at `C:/Users/bill/OneDrive/Documents/Playground/nc-insurance-tools/NC_TOOLS_FIND_MY_HOME_HANDOFF.md` before changing or troubleshooting county behavior.
3. Inspect the agent integration at `C:/Users/bill/OneDrive/Documents/Playground/Customer-Matrix-Pro/shared/homeQuote.ts`. Its `QUOTE_SECTIONS` defines the interview, `PROPERTY_FIELDS` defines public facts, and `buildHomeQuoteReport` renders the deterministic report. Reuse this structure; do not create conflicting fact models.
4. In the Command Center, select **Real Estate**, enter the address, then **Quote Information**. The web action runs the authenticated `POST /api/home-quote` workflow directly; it does not invoke a local Codex skill or create a Codex task.

## Research

- Use `https://find-my-home-information.pages.dev/?address=<encoded-address>`.
- Structured lookup: `POST https://find-my-home-information.pages.dev/api/property` with JSON containing **only** `address`. Never send DOB, names, claims, contact details or interview notes to this public endpoint.
- Preserve entered address, formatted address, returned record address, county, parcel/PIN, retrieval time, warnings and source URLs.
- If there are multiple candidates, require staff/user confirmation of the correct property. An address mismatch, geocode-only response, unsupported county or empty result is not verified research.
- Collect published year built, effective year, heated area, stories, baths, construction, foundation, roof covering/shape, heating, acreage, values, deed and sales information where available.
- Tax values and sales prices are not replacement cost or Coverage A. Effective year built is not roof age.
- For deeper research, open official tax/property cards and GIS first. Verify the parcel and street before extracting additional facts. HTTP 200, a generic map, or a link returned by an API is not proof of a matched card.
- If downloading a property card, verify actual PDF signature/content and address/parcel, not only the extension. Preserve source attribution and separate unresolved links.
- Listings and aerial imagery are secondary evidence; do not infer unshown construction, roof age, condition, fire protection class or flood determination.
- The public API intentionally omits ownership/private details. Ask the prospect for insured names and DOB; do not expand the consumer API to expose private fields.

## Prospect Interview

Collect in parallel while research runs, using the web interview or a supplied editable draft:
- Named insured(s), DOB, phone/email, mailing address, purchase/closing and requested effective dates.
- Primary/secondary/rental/vacant use, home type, year built/area confirmation, construction/foundation, garage, finishes, detached structures.
- Roof age/replacement year, material, condition, full/partial replacement and proof.
- Heating/fuel/supplemental heat; electrical, plumbing, HVAC and water-heater updates; damage and renovations.
- Current carrier or uninsured status, Coverage A, renewal, premium/term, deductibles, requested optional coverage, mortgage/escrow, lapse/nonrenewal details.
- Claims/loss dates, cause, amount and repairs using the carrier-required lookback.
- Business/rental/farm exposures, animals, pool/trampoline, fire protection, safety devices, hazards, requested documents and follow-up.

Never silently overwrite public facts with interview answers. Keep both and flag discrepancies.

## Output and Verification

Create `index.html` in the user-approved private working/output folder using the repository report renderer when available. Include an index, follow-up checklist, property research, applicant, home, systems, policy, claims/risk, source links and verification notes. Label incomplete work as working intake; no coverage bound.

Keep outputs internal. The web tool retains a draft in sessionStorage for the current tab, offers explicit editable JSON export/import, and downloads the report locally. It does not back up to D1, Drive or agency cloud storage. Do not claim otherwise. Clear sensitive browser drafts after filing them appropriately.

Inspect the generated report on desktop and narrow phone widths, check text/print fit and all supplied facts, and test downloads. Report what was confirmed, which sources failed, and remaining questions. Never claim all home information was gathered when only partial county fields were available.

Changes to the agent web app remain local until Bill explicitly says push live. Preserve the staff app, shared contact storage, Gmail and existing search integrations unless separately authorized.
