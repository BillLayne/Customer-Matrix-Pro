# Gmail Engineering Studio Handoff

Last updated: June 3, 2026

This handoff is only for the Gmail Engineering section of Customer Matrix Pro. It is intended for a Gmail/email-template expert who needs to repair template correctness without breaking the surrounding dashboard, launcher links, password gate, or Gemini API plumbing.

## Current Problem

Bill reports that Gmail Engineering templates are not creating the correct templates.

The user interface was recently condensed and is easier to reach, but the semantic output of the templates is still not reliable. The highest-priority repair is not visual styling. The priority is making sure each selected template type produces the correct kind of Gmail-safe insurance email.

Important current concern:

- Template identity is inferred from the exact text in `promptDraft`.
- If Bill selects a template and then edits the prompt, the app can lose the selected template identity.
- POI routing is triggered by text matching words like `proof of insurance`, not by a stable selected template key.
- The AI service decides the template module from `templateTitle`, but `templateTitle` can become undefined when prompt equality fails.

## Project Identity

- App name: Agency Command Matrix / Customer Matrix Pro
- Section: Gmail Engineering Studio
- Owner: Bill Layne
- Business: Bill Layne Insurance Agency
- Local repo: `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro`
- GitHub repo: `https://github.com/BillLayne/Customer-Matrix-Pro`
- Live protected site: `https://customer-matrix-pro.pages.dev/`
- Cloudflare Pages project: `customer-matrix-pro`

The live dashboard is password protected. Direct unauthenticated checks may return `401 Unauthorized`; that is expected and does not prove the app is broken.

## Current UI State

Main UI file:

`C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\components\AiAssistant.tsx`

Recent Gmail UI changes:

- Gmail Engineering is now compacted for daily use.
- Prompt Draft and Generate Email are high on the screen.
- Brand setup is in a `Setup & Brand` drawer.
- Template selection is primarily a `Template Picker` dropdown.
- A secondary `Browse template list` drawer still exists.
- Quick template chips exist for common templates such as Proof of Insurance, Payment Receipt, and Auto Insurance Quote.

Recent relevant commits:

- `8b89e8a` - `Condense Gmail engineering workspace`
- `79ccac6` - `Refine command center layout`

The UI layout is not the main suspected cause of the wrong-template output. The main suspected cause is that template routing is too dependent on mutable prompt text.

## Best File Review Order

1. `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\components\AiAssistant.tsx`
2. `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\constants.ts`
3. `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\services\geminiService.ts`
4. `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\services\emailEngine.ts`
5. `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\services\poiTemplate.ts`

## File Responsibilities

### `components/AiAssistant.tsx`

This is the Gmail Engineering front-end controller.

It controls:

- carrier/logo selection
- custom brand name and logo URL
- uploaded quote/policy PDF
- recipient email
- prompt draft
- template picker UI
- Generate Email button
- refinement flow
- preview state
- Gmail validation result
- Gmail handoff button

Critical current state variables:

- `selectedCarrier`
- `customBrandName`
- `customLogoUrl`
- `promptDraft`
- `templateSearch`
- `recipientEmail`
- `attachedFile`
- `previewHtml`
- `innerAiHtml`
- `generatedSubject`
- `validationResult`

Current generation flow starts in `handleGenerate()`.

Important current behavior:

```ts
const isPoi = promptDraft.toLowerCase().includes('proof of insurance') ||
  promptDraft.toLowerCase().includes('verification of insurance');
```

If `isPoi` is true, the app uses the dedicated POI flow.

If `isPoi` is false, the app tries to find the selected template this way:

```ts
const activeTemplate = Object.values(PROMPT_TEMPLATES)
  .find((template) => template.prompt === promptDraft);
```

That means template identity depends on the prompt being exactly equal to the original canned prompt. Any user edit can make `activeTemplate` undefined.

### `constants.ts`

This is the current template catalog.

Main export:

```ts
export const PROMPT_TEMPLATES = {
  auto_quote: ...,
  coi: ...,
  claims: ...,
  commercial_quote: ...,
  comparison: ...,
  google_review: ...,
  home_quote: ...,
  marketing: ...,
  motorcycle_quote: ...,
  needs_analysis: ...,
  receipt: ...,
  renters_quote: ...,
  welcome: ...,
  review: ...,
  poi: ...,
  referral: ...,
  renewal: ...,
  sr22_quote: ...,
  underwriting: ...
};
```

Current template objects are simple:

- `title`
- `icon`
- `prompt`
- `bgColor`

The current prompts are very generic. Example:

```text
Generate a polished Gmail-safe auto insurance quote email using the full 2026 Bill Layne design system.
```

These prompts are not strong enough by themselves to guarantee correct sections, data fields, exclusions, or calls to action for each template.

### `services/geminiService.ts`

This is the main AI generation service.

Important sections:

- `EMAIL_DESIGN_SYSTEM_V2`
- `EmailGenerationOptions`
- `detectTemplateType()`
- `generateEmailTemplate()`
- `refineEmailTemplate()`
- `extractPoiEmailData()`

Current important comment in the file:

```ts
// EMAIL DESIGN SYSTEM V2 - 2026 BILL LAYNE GMAIL STANDARDS
// AUTHORITATIVE system prompt injected on all email generation calls.
// Changes here propagate to ALL template types automatically.
```

`generateEmailTemplate()` currently detects type like this:

```ts
const templateHint = detectTemplateType(options.templateTitle);
```

Then the request includes:

```text
TASK: {templateTitle}
TEMPLATE TYPE: {templateHint}
LEGACY TEMPLATE GUIDE:
{templateInstructions}
USER INSTRUCTIONS:
{instructions}
```

This means output quality depends heavily on `templateTitle` and `templateInstructions` being passed correctly from `AiAssistant.tsx`.

If `activeTemplate` is undefined in `AiAssistant.tsx`, then `templateTitle` and `templateInstructions` can be missing. In that situation, `detectTemplateType()` returns `general`, and the model may produce a generic email instead of the selected template.

### `services/emailEngine.ts`

This file handles the final HTML wrapper, normalization, validation, and Gmail handoff.

Important functions:

- `buildEmailWrapper()`
- `normalizeGeneratedEmailHtml()`
- `validateGmailHtml()`
- `handOffToGmail()`

Important warning:

A prior receipt bug duplicated the agency/carrier header and hero. That bug was in the normalization/repair layer, not only in model output.

Do not assume every wrong-template bug is purely a prompt problem. Review both:

- what Gemini returns
- what `normalizeGeneratedEmailHtml()` changes after Gemini returns HTML

### `services/poiTemplate.ts`

This is the dedicated Proof of Insurance renderer.

Important function:

```ts
generatePoiEmail(data: PoiData)
```

Current note:

- `constants.ts` names the visible template `Proof of Insurance`.
- `poiTemplate.ts` still contains the schema description `Proof of Insurance / ID Card`.

That may be harmless, but the expert should review wording consistency because the dashboard has intentionally moved toward `Proof of Insurance`.

## Current End-to-End Generation Pipeline

1. Bill opens Gmail Engineering.
2. Bill chooses a template from the dropdown, quick chip, or browse drawer.
3. The UI sets only `promptDraft` to the selected template prompt.
4. Bill may edit the prompt draft.
5. Bill clicks Generate Email.
6. `handleGenerate()` checks whether the prompt text contains POI keywords.
7. If POI keywords are found:
   - `extractPoiEmailData()` parses the input or PDF.
   - `generatePoiEmail()` builds dedicated POI HTML.
   - `normalizeGeneratedEmailHtml()` runs after generation.
8. If POI keywords are not found:
   - the UI tries to rediscover the active template by exact prompt text equality.
   - `generateEmailTemplate()` receives `templateTitle` and `templateInstructions` only if exact equality succeeds.
   - `detectTemplateType()` maps `templateTitle` to a generation module.
   - Gemini returns JSON with `subject` and `htmlBody`.
   - `normalizeGeneratedEmailHtml()` runs after generation.
9. `validateGmailHtml()` checks the final HTML.
10. The user previews, copies, downloads, refines, or hands off to Gmail.

## Most Likely Causes Of Wrong Templates

### 1. No stable selected template key

The UI should keep a stable selected template key such as:

```ts
const [selectedTemplateKey, setSelectedTemplateKey] = useState<keyof typeof PROMPT_TEMPLATES | ''>('');
```

Selecting a template should set both:

- `selectedTemplateKey`
- `promptDraft`

Editing the prompt should not erase the selected template key.

### 2. Exact prompt equality is brittle

This logic is fragile:

```ts
template.prompt === promptDraft
```

It breaks when Bill edits the draft, adds client details, pastes quote data, or changes wording.

### 3. POI routing uses text detection instead of the selected template

This logic is fragile:

```ts
promptDraft.toLowerCase().includes('proof of insurance')
```

POI should be routed by explicit template key:

```ts
selectedTemplateKey === 'poi'
```

Text detection can remain only as a fallback when no template was selected.

### 4. Template metadata is too thin

Each template needs stronger structured metadata than just title and prompt.

Recommended fields:

- `key`
- `title`
- `templateType`
- `intent`
- `requiredSections`
- `forbiddenSections`
- `requiredDataFields`
- `optionalDataFields`
- `ctaRules`
- `toneRules`
- `complianceNotes`
- `fallbackBehavior`

### 5. `detectTemplateType()` depends on optional title text

The service currently infers type from `templateTitle`.

Better approach:

- pass an explicit `templateKey` or `templateType`
- make `detectTemplateType()` accept that explicit field first
- use title matching only as fallback

### 6. Normalization can change final output

`normalizeGeneratedEmailHtml()` is powerful and can repair or rewrite parts of the email shell. For template correctness, the expert should compare:

- raw Gemini `result.htmlBody`
- final normalized HTML

This will show whether the wrong template starts in generation or is introduced during normalization.

## Recommended Repair Plan

### Phase 1: Preserve selected template identity

In `components/AiAssistant.tsx`:

- Add `selectedTemplateKey` state.
- Update every template selection button/dropdown/chip to set `selectedTemplateKey`.
- Keep `selectedTemplateKey` when the prompt draft changes.
- Clear `selectedTemplateKey` only when the user explicitly resets the studio.

### Phase 2: Pass explicit template metadata to Gemini

Update `EmailGenerationOptions` in `services/geminiService.ts` to support:

```ts
templateKey?: string;
templateType?: string;
```

Then call:

```ts
generateEmailTemplate({
  templateKey: selectedTemplateKey,
  templateType: activeTemplate.templateType,
  templateTitle: activeTemplate.title,
  templateInstructions: activeTemplate.prompt,
  userData: promptDraft,
  ...
})
```

### Phase 3: Route POI by key

Change the POI decision from prompt substring matching to explicit key matching:

```ts
const isPoi = selectedTemplateKey === 'poi' || fallbackPoiTextMatch;
```

The fallback should only exist for manual prompts where no template is selected.

### Phase 4: Strengthen template definitions

Expand `PROMPT_TEMPLATES` so each template has a real contract.

Example shape:

```ts
auto_quote: {
  title: 'Auto Insurance Quote',
  templateType: 'auto-quote',
  prompt: '...',
  requiredSections: [
    'Client greeting',
    'Quote summary',
    'Coverage breakdown',
    'Premium/payment options',
    'Important assumptions',
    'Next steps'
  ],
  forbiddenSections: [
    'Proof of insurance language',
    'Receipt confirmation language',
    'Certificate holder language'
  ]
}
```

### Phase 5: Add a template smoke test harness

Create a small local test or script that loops through every template key and verifies basic semantic expectations.

Minimum assertions:

- `auto_quote` output contains quote/proposal language and does not contain receipt or POI language.
- `receipt` output contains payment confirmation language and does not contain quote/proposal language.
- `poi` uses the dedicated POI route.
- `coi` references certificate/certificate holder language.
- `renewal` references renewal action and does not act like a quote.
- all generated HTML passes `validateGmailHtml()`.

This does not need to be perfect unit testing at first. Even a deterministic smoke harness will catch the current class of template-routing failures.

## Things Not To Break

Do not break these working surrounding systems:

- Gemini API environment variable loading
- `GEMINI_API_KEY` / `API_KEY` build behavior
- Gmail rich HTML copy
- Gmail compose handoff
- carrier logo normalization
- Gmail HTML validation
- POI attachment/data extraction path
- dashboard password middleware
- static tools under `public`
- Program Launcher links
- Unified Search layout and behavior

## Environment Variables

Do not commit or paste real secret values.

Local env files:

- `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\.env.local`
- `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\.dev.vars`

Important variables:

- `GEMINI_API_KEY`
- `GOOGLE_API_KEY` as a historical fallback pattern
- `API_KEY` as the runtime name used by the app service
- `SITE_PASSWORD`
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Important prior discovery:

Windows user-level environment variables can override expected local values during build/deploy. If the API appears wrong after a deploy, check both:

- `.env.local`
- Windows user-level `GEMINI_API_KEY`

## Build And Deploy

Run from:

`C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro`

Local checks:

```powershell
npm run lint
npm run build
```

Typical deploy pattern:

```powershell
$env:GEMINI_API_KEY=[Environment]::GetEnvironmentVariable('GEMINI_API_KEY','User')
$vars = Get-Content '.dev.vars' | Where-Object { $_ -match '^[A-Z0-9_]+=' }
foreach ($line in $vars) {
  $name, $value = $line -split '=', 2
  [Environment]::SetEnvironmentVariable($name, $value, 'Process')
}
npx wrangler pages deploy dist --project-name customer-matrix-pro
```

Because the live site is protected, unauthenticated terminal checks to `https://customer-matrix-pro.pages.dev/` may return `401 Unauthorized`.

## Suggested Expert Debug Checklist

1. Add logging or temporary console output showing:
   - selected template key
   - template title
   - detected template type
   - whether POI route was used
2. Select each template from the dropdown.
3. Generate without editing the prompt.
4. Generate again after adding client details to the prompt.
5. Confirm the same template type is still used after prompt edits.
6. Compare raw Gemini HTML to normalized final HTML.
7. Confirm `validateGmailHtml()` still passes.
8. Test Gmail copy/handoff after the fix.

## Copy/Paste Brief For Gmail Expert

```text
This is the Gmail Engineering section of Bill Layne's Customer Matrix Pro dashboard.

Repo:
C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro

Live protected site:
https://customer-matrix-pro.pages.dev/

GitHub:
https://github.com/BillLayne/Customer-Matrix-Pro

Primary files:
1. components/AiAssistant.tsx
2. constants.ts
3. services/geminiService.ts
4. services/emailEngine.ts
5. services/poiTemplate.ts

Current bug:
Selected Gmail templates are not reliably generating the correct semantic email template.

Likely root cause:
AiAssistant.tsx stores only promptDraft when a template is selected. It later tries to rediscover the template by exact prompt equality. If the user edits the prompt, activeTemplate becomes undefined, templateTitle/templateInstructions are not passed to Gemini, detectTemplateType() falls back to general, and the output can become the wrong template. POI routing is also currently based on prompt text matching instead of a selected template key.

Recommended fix:
Add stable selectedTemplateKey state, route POI by key, pass templateKey/templateType/templateTitle/templateInstructions into generateEmailTemplate(), expand PROMPT_TEMPLATES with stronger per-template contracts, and add smoke tests for each template key.

Do not break:
Gmail rich HTML copy, Gmail handoff, carrier logo normalization, validation, API env behavior, the password gate, Unified Search, or launcher links.
```

## Current Status

- Gmail Engineering UI has been compacted and is live.
- The API key issue was previously handled separately, but secret values must never be pasted into docs.
- The current unresolved issue is template correctness.
- Best next repair is a routing/data-contract fix, not another visual redesign.
