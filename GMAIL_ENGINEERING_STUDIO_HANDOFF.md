# Gmail Engineering Studio Handoff

This file explains which parts of **Customer Matrix Pro** control the Gmail Engineering Studio, where the local repo lives, and which files another Gmail expert should review first.

## Main Repo Locations

- Local working repository:
  `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro`
- GitHub backup repository:
  `https://github.com/BillLayne/Customer-Matrix-Pro`

## Best Files To Review First

### 1. Master Gmail Prompt / Structure Rules

File:
`C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\services\geminiService.ts`

What it controls:
- The master Gmail engineering instruction set
- Template structure rules
- Gmail-safe HTML requirements
- Header, hero, footer, CTA, and mobile rules
- Template-type decision tree
- Auto quote module and review module
- The AI generation and refinement flow

Important sections:
- `const EMAIL_DESIGN_SYSTEM_V2`
- `generateEmailTemplate()`
- `refineEmailTemplate()`

This is the single most important file for Gmail output quality.

### 2. Validation / Clipboard / Gmail Handoff Logic

File:
`C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\services\emailEngine.ts`

What it controls:
- Gmail HTML validation rules
- Gmail spacer detection
- Cloudflare obfuscation checks
- Deprecated pattern checks
- Clipboard copy logic for rich HTML
- Gmail compose handoff behavior

Important sections:
- `validateGmailHtml()`
- `handOffToGmail()`
- local wrapper and compose helpers

This is the file that decides what the studio warns about.

### 3. Gmail Engineering Studio Front-End UI

File:
`C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\components\AiAssistant.tsx`

What it controls:
- The Gmail Engineering Studio screen
- Template picker
- Prompt draft box
- Carrier/logo context
- Generate / refine flow
- Validation display
- Gmail sync button

Important sections:
- calls to `generateEmailTemplate()`
- calls to `refineEmailTemplate()`
- calls to `validateGmailHtml()`
- calls to `handOffToGmail()`

This is the best file for understanding how the user interacts with the Gmail studio.

### 4. Template Catalog / Prompt Picker

File:
`C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\constants.ts`

What it controls:
- `PROMPT_TEMPLATES`
- Gmail template tile names shown in the UI
- supporting constants used by the studio

Notes:
- The `Life Insurance Quote` template was removed because Bill Layne Insurance does not sell life insurance.

## Architecture Summary

The Gmail Engineering Studio works in three layers:

1. `AiAssistant.tsx`
   The front-end studio interface where the user chooses a template, uploads a file, writes instructions, previews output, refines, validates, and opens Gmail.

2. `geminiService.ts`
   The AI instruction layer. This file tells Gemini how to build Gmail-safe HTML, how each template should be structured, and what rules are non-negotiable.

3. `emailEngine.ts`
   The enforcement layer. This checks the generated HTML for known Gmail issues and manages the copy-to-Gmail workflow.

## Current Gmail Rule Source Of Truth

Current master rule block:
- `EMAIL_DESIGN_SYSTEM_V2` in
  `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\services\geminiService.ts`

This is where the strongest Gmail structure guidance now lives.

It currently includes:
- agency identity
- approved carrier logo URLs
- Gmail-safe document shell
- Outlook/MSO rules
- 600px anti-fit spacer requirement
- mobile media query requirements
- footer lock sequence
- no circle avatars
- no agent chip
- no box-shadow rule
- template decision tree
- auto quote module
- review module
- reply-bait guidance
- JSON-LD guidance

## Current Validation Source Of Truth

Current validation rules live in:
- `validateGmailHtml()` in
  `C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\services\emailEngine.ts`

It currently checks for items like:
- empty HTML
- circle avatar patterns
- Cloudflare email obfuscation
- Gmail clipping size threshold
- missing `Save@BillLayneInsurance.com`
- missing Inter import
- missing Gmail spacer
- missing Outlook MSO comments
- flexbox / grid usage
- box-shadow usage
- deprecated brand colors
- missing mobile media query
- missing JSON-LD
- missing Apple reformatting meta
- missing presentation tables

## Current Local and Backup Paths

### Local folder on Bill's computer

`C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro`

### Services folder

`C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\services`

### UI components folder

`C:\Users\bill\OneDrive\Documents\Playground\Customer-Matrix-Pro\components`

### GitHub backup

`https://github.com/BillLayne/Customer-Matrix-Pro`

## Recommended Review Order For Another Gmail Expert

1. Review `services/geminiService.ts`
2. Review `services/emailEngine.ts`
3. Review `components/AiAssistant.tsx`
4. Review `constants.ts`

## Short Brief To Paste To Another Expert

Use this:

> Please review the Gmail Engineering Studio in my Customer Matrix Pro repository. The key files are:
> 
> - `services/geminiService.ts` for the master Gmail structure and template instructions
> - `services/emailEngine.ts` for validation and Gmail handoff rules
> - `components/AiAssistant.tsx` for the Gmail studio UI and preview flow
> - `constants.ts` for the template picker catalog
> 
> The current master prompt block is `EMAIL_DESIGN_SYSTEM_V2` in `services/geminiService.ts`.
> Please evaluate whether the Gmail HTML rules, responsive structure, footer/header system, deliverability rules, and validator logic are strong enough for Gmail mobile, Gmail web, Outlook, and polished insurance quote emails.

