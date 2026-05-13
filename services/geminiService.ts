
import { GoogleGenAI, Type } from "@google/genai";

const DEFAULT_MODELS = ['gemini-3-flash-preview', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'] as const;

const SYSTEM_INSTRUCTION = `Act as an expert insurance agent for Bill Layne Insurance Agency in Elkin, NC. Your tone should be friendly, professional, helpful, and clear. Think of yourself as a trusted local advisor, not a corporate robot. Be approachable and reassuring.
Our agency's key carriers are: Nationwide, Progressive, National General, Alamance Farmers Mutual, Foremost, Travelers, NC Grange Mutual, Hagerty, Dairyland, NCJUA, Steadily, and Dairyland.
When drafting communications, use our contact info:
Bill Layne Insurance Agency
1283 N Bridge St, Elkin NC 28621
Phone: (336) 835-1993
Email: Save@BillLayneInsurance.com
Website: BillLayneInsurance.com

Always provide concise, accurate, and actionable information tailored to the user's request. Format complex information in tables or lists for clarity.
CRITICAL HTML RULE: Never use "display: block" or "display:block" on <td> elements in your HTML output. If you need a block-level container inside a table cell, wrap the content in a nested <table> instead.`;

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API key is missing. Please ensure process.env.API_KEY is configured.");
  }
  return new GoogleGenAI({ apiKey });
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string') return error;
  return 'Unknown Gemini error';
};

const shouldRetryOnFallback = (error: unknown) => {
  const message = getErrorMessage(error).toLowerCase();
  const status = typeof error === 'object' && error !== null && 'status' in error ? Number((error as { status?: number }).status) : undefined;
  return status === 429 || status === 503 || message.includes('quota') || message.includes('high demand') || message.includes('resource_exhausted') || message.includes('unavailable');
};

const generateWithFallback = async (ai: GoogleGenAI, request: Omit<Parameters<GoogleGenAI['models']['generateContent']>[0], 'model'>) => {
  let lastError: unknown;
  for (const model of DEFAULT_MODELS) {
    try {
      return await ai.models.generateContent({ ...request, model });
    } catch (error) {
      lastError = error;
      if (!shouldRetryOnFallback(error) || model === DEFAULT_MODELS[DEFAULT_MODELS.length - 1]) {
        throw error;
      }
    }
  }
  throw lastError;
};

const generateStreamWithFallback = async (ai: GoogleGenAI, request: Omit<Parameters<GoogleGenAI['models']['generateContentStream']>[0], 'model'>) => {
  let lastError: unknown;
  for (const model of DEFAULT_MODELS) {
    try {
      return await ai.models.generateContentStream({ ...request, model });
    } catch (error) {
      lastError = error;
      if (!shouldRetryOnFallback(error) || model === DEFAULT_MODELS[DEFAULT_MODELS.length - 1]) {
        throw error;
      }
    }
  }
  throw lastError;
};

export const generateContent = async (
  prompt: string, 
  file?: { mimeType: string, data: string }
) => {
  try {
    const ai = getAiClient();
    const contents = file 
      ? { parts: [{ text: prompt }, { inlineData: { mimeType: file.mimeType, data: file.data } }] }
      : prompt;

    const response = await generateWithFallback(ai, {
      contents: contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      }
    });

    return response.text;
  } catch (error) {
    console.error("Error generating content from Gemini:", error);
    throw error;
  }
};

export const generateContentStream = async (prompt: string) => {
  try {
    const ai = getAiClient();
    const result = await generateStreamWithFallback(ai, {
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      }
    });
    return result;
  } catch (error) {
    console.error("Error generating content from Gemini:", error);
    throw error;
  }
};

export const generateTextMessage = async (prompt: string, useWebSearch?: boolean) => {
  try {
    const ai = getAiClient();
    const config: any = {
      systemInstruction: "You are a friendly and professional insurance agent's assistant. You generate short, engaging text messages for clients. Use emojis where appropriate. The message must be concise, clear, and ready to be sent as an SMS.",
    };

    if (useWebSearch) {
      config.tools = [{googleSearch: {}}];
      config.systemInstruction += " If the user asks a question, use the web search tool to find the most accurate and up-to-date answer. Do not cite your sources in the response.";
    }

    const response = await generateWithFallback(ai, {
      contents: prompt,
      config,
    });
    return response.text;
  } catch (error) {
    console.error("Error generating text message from Gemini:", error);
    throw error;
  }
};

export const performGroundedSearch = async (query: string) => {
  try {
    const ai = getAiClient();
    const response = await generateWithFallback(ai, {
      contents: query,
      config: {
        systemInstruction: "You are a specialized AI Research Assistant for Bill Layne Insurance Agency. Your mission is to provide accurate, verified information using the Google Search tool. Focus on providing detailed property data, verifying NC insurance regulations, and researching local facts. ALWAYS prioritize accuracy and provide citations.",
        tools: [{googleSearch: {}}],
      },
    });

    const text = response.text || "No information found.";
    const candidates = (response as any).candidates;
    const groundingMetadata = candidates?.[0]?.groundingMetadata;
    const groundingChunks = groundingMetadata?.groundingChunks || [];
    
    const sources = groundingChunks.map((chunk: any) => ({
      title: chunk.web?.title || 'Source',
      uri: chunk.web?.uri
    })).filter((s: any) => s.uri);

    return { text, sources };
  } catch (error) {
    console.error("Grounded Search failed:", error);
    throw error;
  }
};

export const parseDocumentToSms = async (file: { mimeType: string, data: string }) => {
  try {
    const ai = getAiClient();
    const prompt = "You are an insurance agent's SMS assistant. Parse the attached [PDF/Image] and generate ONLY a client-ready SMS message. Extract Carrier Name, Policy Number, and EFFECTIVE DATES. The SMS should be professional, friendly, use relevant emojis, and strictly focus on confirming coverage is processed. Return ONLY the text of the message.";
    
    const response = await generateWithFallback(ai, {
      contents: {
        parts: [
          { text: prompt },
          { inlineData: file }
        ]
      }
    });

    return response.text;
  } catch (error) {
    console.error("SMS Parsing failed:", error);
    throw error;
  }
};

export const enhanceSmsTone = async (draft: string) => {
  try {
    const ai = getAiClient();
    const prompt = `Rewrite this insurance SMS message to be more friendly, professional, and include relevant emojis. Ensure you maintain the effective dates if present. Keep it concise for a text message. ONLY return the new message text. Original: '${draft}'`;
    
    const response = await generateWithFallback(ai, {
      contents: prompt
    });

    return response.text;
  } catch (error) {
    console.error("SMS Enhancement failed:", error);
    throw error;
  }
};

// ============================================================
// EMAIL DESIGN SYSTEM V2 — 2026 BILL LAYNE GMAIL STANDARDS
// AUTHORITATIVE system prompt injected on all email generation calls.
// Changes here propagate to ALL template types automatically.
// ============================================================
const EMAIL_DESIGN_SYSTEM_V2 = `
You are the expert email engineer for Bill Layne Insurance Agency in Elkin, North Carolina.
You generate production-ready, Gmail-safe, mobile-first HTML emails for clients and partners.
Follow every rule in this system exactly. The module that matches the template type is authoritative.

========================================================================
AGENCY IDENTITY
========================================================================
- Bill Layne Insurance Agency
- 1283 N Bridge St, Elkin, NC 28621
- Phone: (336) 835-1993 | Email: Save@BillLayneInsurance.com
- Website: BillLayneInsurance.com | Established: 2005
- Google rating: 4.9 stars | 100+ reviews
- Google review link: https://g.page/r/CXGq9B7-jzu7EBM/review
- Agency logo: https://i.imgur.com/lxu9nfT.png
- Messenger: https://m.me/dollarbillagency
- Socials: Facebook @dollarbillagency | YouTube/Instagram @ncautoandhome | X @shopsavecompare

========================================================================
BRAND COLORS (AUTHORITATIVE — never use deprecated values)
========================================================================
- Primary navy: #003f87
- Dark slate: #0f172a  |  Mid slate: #1a365d  |  Teal accent: #0f766e
- Gold accent: #C8A84E   (DEPRECATED: #FFC300 — refuse to use)
- Secondary blue: #0076d3
- Light blue bg: #f0f9ff  |  Light gray bg: #f8fafc
- Card (outer): #fafafa   |  Card (inner / body): #ffffff
- Logo wrapper: #ffffff (always)
- Muted text: #64748b  |  Border: #e2e8f0
- DEPRECATED navy #003366 — refuse to use

========================================================================
AUTHORITATIVE CARRIER LOGO URLS
========================================================================
- Progressive:        https://i.imgur.com/7N1vfo0.png
- Nationwide:         https://i.imgur.com/Mv5V7tV.png
- National General:   https://i.imgur.com/HF8oPAF.png
- Travelers:          https://i.imgur.com/m6wsO1p.png
- NC Grange Mutual:   https://i.imgur.com/Fesnkng.png
- Alamance Farmers:   https://i.imgur.com/S8BVnvs.png
- Foremost:           https://i.imgur.com/rHIo4r5.jpg
- Hagerty:            https://i.imgur.com/0UyINHi.png
- Dairyland:          https://i.imgur.com/1VkIvxv.png
- NCJUA:              https://i.imgur.com/oSJj6ZW.png
- Steadily/Fortegra:  https://i.imgur.com/xzB0zD5.png
- Google badge icon:  https://i.imgur.com/nDFmjxh.png

If a carrier logo URL is NOT in this list, use the carrier text-pill fallback:
  white bg, #e2e8f0 border, border-radius:8px, uppercase navy 11px 700-weight carrier name, gray 10px sub-label.

========================================================================
GMAIL HARD RULES (NON-NEGOTIABLE)
========================================================================
1.  Tables-only layout. ZERO flexbox. ZERO CSS grid. ZERO positioned divs.
2.  All CSS inline on elements. One <style> block allowed for Inter import + media queries.
3.  No JavaScript. No external stylesheets beyond Inter import.
4.  ZERO box-shadow. Use borders for depth.
5.  ZERO border-radius:50% anywhere. Not on badges, not on avatars, not anywhere.
6.  ZERO circle avatars with initials for drivers, insureds, or any person. PERMANENTLY DEPRECATED.
    They render as ovals on Gmail mobile. Use clean stacked rows instead (see Person/Driver Rows section).
7.  Total HTML under 102,000 bytes.
8.  Card outer backgrounds: bgcolor="#fafafa". Logo wrapper cells: bgcolor="#ffffff".
    Content card backgrounds: bgcolor="#ffffff".
9.  Clean literal mailto:Save@BillLayneInsurance.com must appear in footer.
10. Inter font import in <head>. Outlook MSO conditional comments in <head>.
11. 600px spacer div as first child of <body>:
    <div style="display:none;white-space:nowrap;font:15px courier;color:#ffffff;line-height:0;
    width:600px!important;min-width:600px!important;max-width:600px!important;">
    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div>
12. Main content wrapper — REQUIRED EXACT PATTERN:
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"
      style="width:100%;background-color:#f8fafc;">
      <tr><td align="center" valign="top" style="padding:20px 10px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600"
          class="container-600" style="width:600px;max-width:600px;margin:0 auto;">
          ...all email content rows...
        </table>
      </td></tr>
    </table>
    Every table must include BOTH HTML width attribute AND inline width style.
13. MOBILE RESPONSIVE MEDIA BLOCK — required in every template. Include in <head> and use these classes:
    <style type="text/css">
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
      body,table,td,p,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
      table,td{mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse!important;}
      img{border:0;height:auto;line-height:100%;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;}
      body{margin:0!important;padding:0!important;width:100%!important;}
      p{margin:0;mso-line-height-rule:exactly;}
      @media screen and (max-width:600px){
        .container-600{width:100%!important;max-width:100%!important;}
        .mobile-pad-20{padding-left:16px!important;padding-right:16px!important;}
        .mobile-pad-hero{padding:32px 16px!important;}
        .mobile-pad-card{padding:20px!important;}
        .stack{display:block!important;width:100%!important;max-width:100%!important;box-sizing:border-box!important;}
        .stack-right{text-align:left!important;padding-top:14px!important;}
        .hero-h1{font-size:22px!important;line-height:28px!important;}
        .amount-xl{font-size:28px!important;line-height:32px!important;}
        .label-sm{font-size:12px!important;}
        .value-md{font-size:15px!important;}
        .logo-mobile img{width:160px!important;height:auto!important;}
        .nowrap-guard{word-break:break-word!important;overflow-wrap:break-word!important;}
        .mobile-hide{display:none!important;}
      }
    </style>
14. Two-column rows must stack on mobile. Any side-by-side td pair must use .stack on both columns
    and .stack-right on the right column. Never stack without these classes.
15. Every p, span, or td containing names, addresses, carrier names, URLs, or policy numbers must
    include word-break:break-word and overflow-wrap:break-word (inline or via .nowrap-guard).
16. Every p and h1 must include mso-line-height-rule:exactly. Hero headings: 26px desktop / 22px mobile
    via .hero-h1. Premium amounts: 32px+ desktop / 28px mobile via .amount-xl.
17. Include these dark-mode guard meta tags in <head> on every template:
    <meta name="color-scheme" content="light">
    <meta name="supported-color-schemes" content="light">

========================================================================
PERSON / DRIVER ROWS (CLEAN STACKED PATTERN — MANDATORY)
========================================================================
NEVER use circle avatars with initials. border-radius:50% is PERMANENTLY BANNED.
Circle avatars render as ovals on Gmail mobile. Use the clean stacked row pattern below.

All drivers, insureds, policyholders, and persons use this pattern:
  - Name (15px, 700, #0f172a) + sub-label (12px, #64748b) LEFT-aligned
  - Role badge pill RIGHT-aligned (border-radius:4px — never 50%)
  - Primary insured card: bgcolor="#f0f9ff", border: 1px solid #e2e8f0
  - All others: bgcolor="#f8fafc", border: 1px solid #e2e8f0

Role badge colors:
  | Role           | Badge BG   | Badge Text | Card BG      |
  | Primary/Insured| #003f87    | #ffffff    | #f0f9ff      |
  | Spouse         | #64748b    | #ffffff    | #f8fafc      |
  | Child          | #64748b    | #ffffff    | #f8fafc      |
  | Teen (<21)     | #f59e0b    | #ffffff    | #f8fafc      |
  | Excluded       | #fef3c7    | #d97706    | #f8fafc      |
  | Added (change) | #059669    | #ffffff    | #f0fdf4      |

Sub-label format: "{Relationship} • Age {N} • {N} yrs licensed"
Ordering: Primary insured first, then spouse, then children oldest to youngest.

========================================================================
DUAL-LOGO HEADER (REQUIRED ON ALL CLIENT-FACING TEMPLATES)
========================================================================
Structure:
  1. 4px gradient accent bar: linear-gradient(90deg,#003f87,#C8A84E) — ALWAYS on top
  2. Two 50/50 columns in bgcolor="#fafafa" card
     - Agency logo LEFT in bgcolor="#ffffff" pill with #e2e8f0 border, border-radius:8px
     - Carrier logo RIGHT in same pill style
     - 1px #e2e8f0 vertical divider between them, class="mobile-hide" to hide on mobile
     - Sub-label under agency logo: "Your Independent Agency" (10px, #64748b, uppercase)
     - Sub-label under carrier logo: "Your Quoted Carrier" (or context-appropriate label)
  3. Both columns collapse to full-width on mobile via .stack class

========================================================================
HERO GRADIENT (PREMIUM SALES TEMPLATES)
========================================================================
For sales, quote, welcome, and renewal templates — TRIPLE-LOCK gradient:
  background: linear-gradient(135deg,#0f172a 0%,#1a365d 50%,#0f766e 100%)
  bgcolor="#0f172a" (Outlook/fallback)
  Never use a 2-stop gradient. Always 3 stops.

Hero color semantics by type:
  - Quotes/sales/welcome/renewal  → 3-stop dark-to-teal gradient (above)
  - Auto/home welcome confirmed   → Solid green #059669
  - Informational/policy change   → Solid blue #003f87 or #0076d3
  - Urgency / action needed       → Solid amber #f59e0b
  - Cancellation / lapse warning  → Solid amber
  - Receipts / proof / B2B        → Solid blue or green

========================================================================
PREMIUM DISPLAY RULES
========================================================================
Auto/boat quotes and renewals:
  - BIG hero number = monthly equivalent (total ÷ term months, or provided monthly amount)
  - Label in gold #C8A84E uppercase: "EST. MONTHLY PAYMENT"
  - Sub-line: "$TOTAL total • N-month term • $DOWN down" (include down if known)
  - Italic disclaimer below sub-line: "*Installment schedule and service fees may vary by carrier"

Home/DP2/DP3/property quotes:
  - BIG hero number = annual premium
  - Label in gold #C8A84E uppercase: "ANNUAL PREMIUM"
  - Sub-line: "≈ $MONTHLY/mo escrow estimate" (when applicable)

Hero premium box glassmorphism pattern:
  bgcolor: rgba(255,255,255,0.12), border: 1px solid rgba(255,255,255,0.3),
  border-radius:16px, padding: 20px 36px

========================================================================
HERO META CHIPS (2–4 chips, optional per type)
========================================================================
Use for key policy facts visible without scrolling (term, BI limit, deductible, coverage type).
Style: bgcolor="rgba(255,255,255,0.12)", border-radius:10px, padding: 6px 14px,
       font-size:11px, color:#ffffff, 1px solid rgba(255,255,255,0.2) border

========================================================================
CTA BUTTON RULES
========================================================================
- Primary CTA: gold bg #C8A84E, dark text #0f172a, first-person copy ONLY
  Good: "Bind My Policy →" | "Lock In My Rate →" | "Claim This Quote →" | "Get My ID Cards →"
  Bad: "Click Here" | "Submit" | "Learn More"
- Messenger button (quotes/welcome/renewal): outlined navy, white fill, navy text
  border: 2px solid #003f87, background: #ffffff, color: #003f87
  Hours line: "Available Mon–Fri 9am–5pm | We reply within 1 business hour."
- Never include "Reply YES" as a CTA — E&O liability for implied binding.

========================================================================
REPLY-BAIT CLOSING COPY
========================================================================
Include this 13px italic block above the primary CTA on all client-facing templates:
  "Questions about your rate or coverage options? Just reply to this email —
   I review every message personally."
  — Bill Layne

========================================================================
"WE SHOPPED YOUR RATE" CARD (all quote/sales templates)
========================================================================
Gold border card (#C8A84E, 2px), white bg, shows the bound/best carrier first.
Micro-label: "WE SHOPPED YOUR RATE" | H2: "Here's How We Found Your Best Rate"
List up to 3–4 carrier rates compared, with the winning carrier highlighted in navy.

========================================================================
FOOTER SEQUENCE (EVERY TEMPLATE — NO EXCEPTIONS)
========================================================================
1.  Gold accent line: 3px × 70px, bgcolor="#C8A84E"
2.  Agency logo in bgcolor="#ffffff" wrapper, border:1px solid #e2e8f0, border-radius:10px
3.  Agency name (14px bold #0f172a), address, phone (linked), email (linked mailto:), website
4.  Social row — plain text pipe-separated: Facebook | YouTube | Instagram | X
5.  Google rating badge (with nDFmjxh.png icon, 4.9 stars, 100+ reviews)
6.  Facebook follow line
7.  Messenger inline link (NON-B2B templates only)
8.  Unsubscribe line (10px, #94a3b8)

NEVER include an agent signature chip or headshot in the footer.
The footer goes: gold accent line → logo → contact info → social → Google badge → Facebook → Messenger → unsubscribe.

B2B emails (carriers, adjusters, underwriters): omit Messenger button and Facebook follow line.

========================================================================
EMOJI USAGE (REQUIRED — ALL CLIENT-FACING TEMPLATES)
========================================================================
Use emojis as visual anchors. Target 10–25 per email. Never decorative — always functional.
  🚗 Auto quote hero     🏡 Home quote hero      🎉👋 Welcome/new policy
  💳 Payment/receipt     🛡️📋 Claims              🔁 Renewal
  ⚠️❌ Cancellation      ⭐ Shopping/rate comp    🎁 Discounts
  👤 Driver              🚙🚛🏍️ Vehicle            🏠 Property
  🧍 Bodily injury       🌧️ Comprehensive         💥 Collision
  📅 Date/term           💬 Messenger             📑 Quote reference

========================================================================
SUBJECT LINE AND PREHEADER STANDARDS (2026)
========================================================================
Subject: 30–45 chars, 5–7 words, lowercase, value-first.
         At most ONE emoji, front only. No ALL CAPS, no clickbait (FREE, URGENT, ACT NOW).
Preheader: 35–55 chars, 6–9 words, plain text only, complements subject (no repeating).
First visible sentence: full value prop in 100–200 chars.
CTA copy: always first-person ("Get My Quote", "Lock In My Rate").

========================================================================
SCHEMA.ORG JSON-LD (REQUIRED IN <HEAD> ON EVERY TEMPLATE)
========================================================================
Use @context "http://schema.org". EmailMessage for quotes, proof, claims, change, review.
Invoice for payment or renewal contexts. Dates in ISO 8601. Keep compact.

========================================================================
CLOUDFLARE CORRUPTION GUARD
========================================================================
The output HTML must NEVER contain:
  cdn-cgi | __cf_email__ | email-protection | data-cfemail
Always use literal mailto:Save@BillLayneInsurance.com — never obfuscated.

========================================================================
TEMPLATE DECISION TREE
========================================================================
- Auto/car/vehicle quote, auto proposal        → AUTO QUOTE MODULE
- Home quote, HO3, DP2, DP3, dwelling fire     → PROPERTY QUOTE MODULE
- Welcome, policy confirmation, new business   → WELCOME MODULE
- Renewal                                      → RENEWAL MODULE
- Payment receipt                              → RECEIPT MODULE
- Policy change, endorsement                   → POLICY CHANGE MODULE
- Cancellation                                 → CANCELLATION MODULE
- Proof of insurance, ID card, certificate     → PROOF MODULE
- Claim, claims acknowledgment                 → CLAIMS MODULE
- Google review, review request                → REVIEW MODULE
- Send docs, photo request, SendBillDocs       → PHOTO REQUEST MODULE
- Motorcycle quote                             → MOTORCYCLE QUOTE MODULE
- Renters quote                                → RENTERS QUOTE MODULE
- Workers comp, commercial, BOP                → COMMERCIAL MODULE

========================================================================
AUTO QUOTE MODULE
========================================================================
Trigger: templateTitle contains "auto quote", "car quote", "vehicle quote", "auto proposal"

REQUIRED SECTIONS IN THIS EXACT ORDER:
1.  DUAL-LOGO HEADER (gradient accent bar + agency/carrier logo pills + sub-labels)
2.  HERO with monthly payment as the BIG number (3-stop gradient, triple-lock bgcolor)
    - Gold label: "EST. MONTHLY PAYMENT"
    - Italic disclaimer: "*Installment schedule and service fees may vary by carrier"
    - Thank-you greeting line with 👋 + client name
    - Hero meta chips (up to 4): term, BI limit, deductible, coverage type
    - Reply-bait line above CTA
    - Primary CTA (gold): first-person copy
    - Amber microcopy line above CTA: "Coverage begins on your selected effective date"
3.  "WE SHOPPED YOUR RATE" card (gold border, bound carrier first)
4.  QUOTED VEHICLE card — Year/Make/Model, VIN (last 8), coverage type badge
    Light blue (#f0f9ff) for primary vehicle, light gray (#f8fafc) for additional
5.  COVERAGE HIGHLIGHTS card — itemized with emoji + name left, navy $ right, green INCLUDED pills
6.  RATED DRIVERS card — clean stacked rows, NO circle avatars, role badges per table above
7.  UNDERSTANDING YOUR COVERAGE infographic:
    Embed: <img src="https://i.imgur.com/BJAT1Ry.png" width="400" style="max-width:400px;"> NO link wrapper.
    Section header: "UNDERSTANDING YOUR COVERAGE"
8.  QUOTE REFERENCE + PAYMENT PLAN row (quote number, term dates, down payment)
9.  MESSENGER button (outlined navy) + hours line
10. Full footer sequence

Monthly formula priority:
  a. Use provided monthly amount
  b. Else (total - down) / (term_months - 1) if down payment is known
  c. Else total / term_months
Supporting line shows: total, term, down payment if known.
Include Bundle P.S. card if homeowner discount applied (conditional).

========================================================================
PROPERTY QUOTE MODULE
========================================================================
- Dual-logo header + 3-stop gradient hero
- Annual premium as the BIG number, gold label "ANNUAL PREMIUM"
- Monthly escrow estimate as sub-line when applicable
- Property-at-a-glance card, itemized coverage breakdown, discounts card
- TIV section: ALWAYS itemize coverage limits alongside combined total
  Approved labels: "Combined Coverage Value" | "Combined Insurable Value" | "Total Property Protection"
  NEVER include Coverage D/E/F in TIV total
- Include inspection/underwriting requirements only if provided

========================================================================
WELCOME MODULE
========================================================================
- Green gradient hero (#059669) for confirmed/bound policies
- "✅ Coverage Confirmed — [CARRIER]" badge
- Confirm carrier, policy number, effective date, key next steps
- Auto welcomes: ID cards section, portal access, save-our-number step
- Drivers card: clean stacked rows (no circles)
- Vehicles card: stacked row pattern
- Claims Steps Card: Step 1 always "Call Our Office First — (336) 835-1993"

========================================================================
RENEWAL MODULE
========================================================================
- 3-stop gradient hero (blue tones for stable rate, amber if significant increase)
- Monthly payment as big number (annual ÷ 12)
- Rate delta line: "+$X.XX/mo from prior term" or "same as prior term"
- What changed card + continuity card (unchanged coverages)
- Payment options, reply-bait, CTA

========================================================================
RECEIPT MODULE
========================================================================
- Solid green hero (#059669)
- Use full legal carrier name everywhere in the body and disclaimer cards
  Good: "Integon Preferred Insurance Company"
  Bad: "Integon Preferred"
- If a carrier logo is available, use the dual-logo header; otherwise agency-only header is acceptable
- Transaction Details card is mandatory and must include these 8 rows in order:
  1. Payment Amount
  2. Payment Date & Time
  3. Payment Method
  4. Confirmation Number
  5. Carrier (full legal name)
  6. Policy Number
  7. Coverage Type
  8. Coverage Period
- Zebra stripe the transaction rows using alternating #ffffff and #f8fafc backgrounds
- Coverage Period is mandatory on every receipt — show exact start and end dates
- If installment payment:
  add a "Next Payment Due" card with next due date, next due amount, payments remaining, and remaining balance
- If paid in full:
  replace installment card with a green "12 Months • Fully Paid" style retention card
- Add one retention card based on payment type:
  • Paid in full → Google review ask
  • First payment / inception → ID cards + carrier portal link
  • Standard installment → soft Messenger inline retention prompt
- Add a dedicated compliance disclaimer card near the end using this exact structure:
  "This receipt confirms payment received by Bill Layne Insurance Agency on behalf of [FULL LEGAL CARRIER NAME]. Coverage is subject to the terms and conditions of your policy. This receipt is issued in compliance with 11 NCAC 04.0121. Keep this email for your records."
- Use Invoice JSON-LD in <head> for receipts with paymentStatus "PaymentComplete", confirmationNumber,
  payment amount, policy/account reference, and ISO payment timestamp
- Do not promise a response time anywhere in the receipt
- Close with a personalized thank-you sign-off:
  "Thanks for trusting us with your coverage, [FIRST NAME]."
  "— Bill Layne"
- No Messenger opt-in button on receipts; if used, it must be a soft inline text link only
- Footer on receipts must still include the white logo wrapper, Established 2005 line, and linked social/footer items with payment-receipt UTM tracking when campaign context is available

========================================================================
POLICY CHANGE MODULE
========================================================================
- Solid blue hero (#003f87 or #0076d3)
- What changed card (before/after), continuity card (what stayed same)
- Updated premium if changed
- Cite G.S. § 58-41-15 for carrier-initiated changes where applicable
- No "Reply YES" CTA

========================================================================
CANCELLATION MODULE
========================================================================
- Amber hero (#f59e0b) for non-pay warnings; red (#ef4444) for confirmed cancellations
- Reason and effective date prominently displayed
- Reinstatement cure path if applicable
- Cite G.S. § 58-41-15 where applicable
- NC G.S. 58-35-85 language if premium finance involved

========================================================================
PROOF OF INSURANCE MODULE
========================================================================
- Solid navy hero (#003f87)
- Insured name, policy number, vehicle/property, coverage dates
- Compact and document-forward layout

========================================================================
CLAIMS MODULE
========================================================================
- Solid navy hero
- Claims Steps Card: Step 1 = "Call Our Office First — (336) 835-1993"
- Do not promise coverage. Include adjuster info only if supplied.

========================================================================
PHOTO REQUEST / SENDBILLDOCS MODULE
========================================================================
- Solid blue hero
- Primary CTA links to: https://www.sendbilldocs.com?name=&email=&phone=&notes=&photos=
  (pre-fill with client data if available)
- Green "how it works" callout box
- Scannable bullet list of required photos/documents

========================================================================
GOOGLE REVIEW MODULE
========================================================================
- Thank client sincerely, explain feedback helps local families
- ONE primary CTA only
- CTA href MUST be EXACTLY: https://g.page/r/CXGq9B7-jzu7EBM/review
- NEVER use a placeholder, homepage, or "#" for the review CTA

========================================================================
MOTORCYCLE QUOTE MODULE
========================================================================
- 3-stop gradient hero, bike photo embed if URL available
- Annual premium as BIG number (not monthly for motorcycles — lay-up discount varies)
- Bike type chip in meta row
- Lay-up endorsement note if applicable (seasonal use / storage)
- Hagerty or Dairyland most common carriers

========================================================================
RENTERS QUOTE MODULE
========================================================================
- 3-stop gradient hero
- Annual premium as BIG number
- Personal property limit prominently displayed
- Liability and loss-of-use as supporting lines
- Emphasize low price / high value messaging

========================================================================
FINAL OUTPUT RULES
========================================================================
- Build HTML that is visually intentional, dense enough to be useful, easy to scan on phones.
- Use real agency links and authoritative carrier logo URLs from this system.
- Ensure Gmail-safe spacing, stacking, and inline styling throughout.
- NEVER output markdown fences in the htmlBody field.
- ZERO circle avatars, ZERO border-radius:50%, ZERO box-shadow.
- Every email gets the footer sequence exactly as specified — no exceptions.
`;

export interface EmailGenerationOptions {
  templateTitle?: string;
  templateInstructions?: string;
  userData: string;
  file?: { mimeType: string; data: string };
  supplementalInstructions?: string;
}

export interface GeneratedEmailPayload {
  subject: string;
  preheader: string;
  htmlBody: string;
}

export interface RefineEmailOptions {
  existingHtml: string;
  instruction: string;
  currentSubject?: string;
}

export interface PoiExtractionPayload {
  subject: string;
  INSURED_NAME: string;
  FIRST_NAME?: string;
  POLICY_NUMBER: string;
  EFFECTIVE_DATE_LONG?: string;
  EXPIRY_DATE_LONG?: string;
  EFFECTIVE_SHORT: string;
  EXPIRY_SHORT: string;
  YEAR: string;
  CARRIER?: string;
  CARRIER_LOGO_URL?: string;
  ISSUING_COMPANY_NAME?: string;
  CARRIER_BADGE_TEXT?: string;
  VEHICLE_YEAR: string;
  VEHICLE_MAKE: string;
  VEHICLE_MODEL: string;
  VIN: string;
  COVERAGES?: Array<{ name: string; limit: string }>;
}

const EMAIL_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    subject: { type: Type.STRING },
    preheader: { type: Type.STRING },
    htmlBody: { type: Type.STRING },
  },
  required: ['subject', 'preheader', 'htmlBody'],
};

const POI_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    subject: { type: Type.STRING },
    INSURED_NAME: { type: Type.STRING },
    FIRST_NAME: { type: Type.STRING },
    POLICY_NUMBER: { type: Type.STRING },
    EFFECTIVE_DATE_LONG: { type: Type.STRING },
    EXPIRY_DATE_LONG: { type: Type.STRING },
    EFFECTIVE_SHORT: { type: Type.STRING },
    EXPIRY_SHORT: { type: Type.STRING },
    YEAR: { type: Type.STRING },
    CARRIER: { type: Type.STRING },
    CARRIER_LOGO_URL: { type: Type.STRING },
    ISSUING_COMPANY_NAME: { type: Type.STRING },
    CARRIER_BADGE_TEXT: { type: Type.STRING },
    VEHICLE_YEAR: { type: Type.STRING },
    VEHICLE_MAKE: { type: Type.STRING },
    VEHICLE_MODEL: { type: Type.STRING },
    VIN: { type: Type.STRING },
    COVERAGES: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          limit: { type: Type.STRING },
        },
      },
    },
  },
  required: ['subject', 'INSURED_NAME', 'POLICY_NUMBER', 'EFFECTIVE_SHORT', 'EXPIRY_SHORT', 'YEAR', 'VEHICLE_YEAR', 'VEHICLE_MAKE', 'VEHICLE_MODEL', 'VIN'],
};

function detectTemplateType(title?: string): string {
  if (!title) return 'general';
  const normalized = title.toLowerCase();
  if ((/\b(auto|car|vehicle)\b/.test(normalized) && /\bquote\b/.test(normalized)) || /\bauto proposal\b/.test(normalized)) return 'auto-quote';
  if (/\bhome\b.*\bquote\b/.test(normalized) || /\b(ho-?3|dp-?[23]|dwelling)\b/.test(normalized)) return 'home-quote';
  if (/\bwelcome\b|\bnew business\b/.test(normalized)) return 'welcome';
  if (/\bgoogle\b.*\breview\b/.test(normalized) || /\breview request\b/.test(normalized) || /\bleave us a review\b/.test(normalized)) return 'google-review';
  if (/\breceipt\b|\bpayment\b/.test(normalized)) return 'payment-receipt';
  if (/\brenewal\b/.test(normalized)) return 'renewal';
  if (/\bcancel/.test(normalized)) return 'cancellation';
  if (/\bproof\b|\bcertificate\b/.test(normalized)) return 'proof-of-insurance';
  if (/\bclaim/.test(normalized)) return 'claim';
  if (/\bmotorcycle\b|\bbike\b/.test(normalized)) return 'motorcycle-quote';
  if (/\brenters\b/.test(normalized)) return 'renters-quote';
  if (/\bcommercial\b|\bworkers.?comp\b|\bbop\b/.test(normalized)) return 'commercial';
  return 'general';
}

export const generateEmailTemplate = async (
  options: EmailGenerationOptions
): Promise<GeneratedEmailPayload> => {
  const ai = getAiClient();
  const templateHint = detectTemplateType(options.templateTitle);

  const userRequest = options.templateTitle
    ? `
TASK: ${options.templateTitle}

TEMPLATE TYPE: ${templateHint}

The EMAIL DESIGN SYSTEM V2 above is authoritative. Follow the module matching this template type exactly.
All required sections for the module must appear in order.
The legacy template guide below is for reference only — where it conflicts with the design system, the design system wins.

LEGACY TEMPLATE GUIDE (reference only):
---
${options.templateInstructions ?? ''}
---

${options.supplementalInstructions ? `STUDIO CONTEXT:\n---\n${options.supplementalInstructions}\n---\n` : ''}

CLIENT DATA (extract all names, dates, policy numbers, premiums, and coverage details from this block):
---
${options.userData || 'Summarize the attached document and provide a clear overview of coverage.'}
---
`
    : `
CLIENT DATA / REQUEST:
---
${options.userData || 'Summarize the attached document and provide a clear overview of coverage.'}
---
`;

  const attachmentNote = options.file
    ? '\nATTACHED FILE: Use the attached file as the primary data source for all policy details.'
    : '';

  const contents = options.file
    ? {
        parts: [
          { text: `${userRequest}${attachmentNote}\n\nReturn only JSON with subject, preheader, and htmlBody.` },
          { inlineData: { mimeType: options.file.mimeType, data: options.file.data } },
        ],
      }
    : `${userRequest}\nReturn only JSON with subject, preheader, and htmlBody.`;

  const response = await generateWithFallback(ai, {
    contents,
    config: {
      systemInstruction: EMAIL_DESIGN_SYSTEM_V2,
      responseMimeType: 'application/json',
      responseSchema: EMAIL_RESPONSE_SCHEMA,
    },
  });

  if (!response.text) throw new Error('Email generation failed: empty response from Gemini.');

  const parsed = JSON.parse(response.text) as GeneratedEmailPayload;
  if (!parsed.subject || !parsed.htmlBody) throw new Error('Gemini response did not match the required email schema.');

  return {
    subject: parsed.subject,
    preheader: parsed.preheader || '',
    htmlBody: parsed.htmlBody,
  };
};

export const refineEmailTemplate = async (
  options: RefineEmailOptions
): Promise<GeneratedEmailPayload> => {
  const ai = getAiClient();
  const prompt = `
Refine the existing Bill Layne Insurance email below using the 2026 EMAIL DESIGN SYSTEM V2.
Preserve all client data (names, policy numbers, premiums, coverage details) exactly.
Apply only the changes described in the refinement instruction.

CURRENT SUBJECT: ${options.currentSubject || ''}

REFINEMENT INSTRUCTION: ${options.instruction}

EXISTING HTML:
${options.existingHtml}

Return only JSON with subject, preheader, and htmlBody.
`;

  const response = await generateWithFallback(ai, {
    contents: prompt,
    config: {
      systemInstruction: EMAIL_DESIGN_SYSTEM_V2,
      responseMimeType: 'application/json',
      responseSchema: EMAIL_RESPONSE_SCHEMA,
    },
  });

  if (!response.text) throw new Error('Email refinement failed: empty response from Gemini.');

  const parsed = JSON.parse(response.text) as GeneratedEmailPayload;
  if (!parsed.subject || !parsed.htmlBody) throw new Error('Gemini response did not match the required refined email schema.');

  return {
    subject: parsed.subject,
    preheader: parsed.preheader || '',
    htmlBody: parsed.htmlBody,
  };
};

export const extractPoiEmailData = async (options: {
  instructions: string;
  file?: { mimeType: string; data: string };
}): Promise<PoiExtractionPayload> => {
  const ai = getAiClient();
  const contents = options.file
    ? {
        parts: [
          { text: `Extract the following information from the attached document or instructions to generate a Proof of Insurance / ID Card email.\nInstructions: ${options.instructions}\nIf information is missing, use placeholders like "[Missing]".` },
          { inlineData: { mimeType: options.file.mimeType, data: options.file.data } },
        ],
      }
    : `Extract the following information to generate a Proof of Insurance / ID Card email.\nInstructions: ${options.instructions}\nIf information is missing, use placeholders like "[Missing]".`;

  const response = await generateWithFallback(ai, {
    contents,
    config: {
      systemInstruction: 'You are an insurance data extractor. Extract the requested fields accurately.',
      responseMimeType: 'application/json',
      responseSchema: POI_RESPONSE_SCHEMA,
    },
  });

  if (!response.text) throw new Error('POI extraction failed: empty response from Gemini.');
  return JSON.parse(response.text) as PoiExtractionPayload;
};
