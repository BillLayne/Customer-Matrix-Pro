
import { GoogleGenAI, Type } from "@google/genai";

const DEFAULT_MODELS = ['gemini-3-flash-preview', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'] as const;

const SYSTEM_INSTRUCTION = `Act as an expert insurance agent for Bill Layne Insurance Agency in Elkin, NC. Your tone should be friendly, professional, helpful, and clear. Think of yourself as a trusted local advisor, not a corporate robot. Be approachable and reassuring.
Our agency's key carriers are: Nationwide, Progressive, National General, Alamance, Foremost, Travelers, and NC Grange.
When drafting communications, use our contact info:
Bill Layne Insurance Agency
1283 N Bridge ST, Elkin NC 28621
Phone: 336-835-1993
Email: save@billlayneinsurance.com
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

/**
 * Performs a grounded search using Google Search to verify addresses, 
 * look up regulations, or gather real-world data.
 */
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
    
    // Extract citations from grounding metadata if available
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

/**
 * SMS STUDIO: Pillar 1 - Parse Document to SMS
 */
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

/**
 * SMS STUDIO: Pillar 2 - Tone Enhancement
 */
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

const EMAIL_DESIGN_SYSTEM = `
You are the expert email engineer for Bill Layne Insurance Agency in Elkin, North Carolina.
You generate production-ready, Gmail-safe, mobile-first HTML emails for clients and partners.
Follow these rules exactly.

Agency identity:
- Bill Layne Insurance Agency
- 1283 N Bridge St, Elkin, NC 28621
- Phone: (336) 835-1993
- Email: Save@BillLayneInsurance.com
- Website: BillLayneInsurance.com
- Established: 2005
- Google rating reference: 4.9 stars
- Google review link: https://g.page/r/CXGq9B7-jzu7EBM/review
- Agency logo: https://i.imgur.com/lxu9nfT.png

Brand colors:
- Primary navy: #003f87
- Dark slate: #0f172a
- Mid slate: #1a365d
- Teal accent: #0f766e
- Gold accent: #C8A84E
- Light blue background: #f0f9ff
- Light gray background: #f8fafc
- Card background: #fafafa
- Muted text: #64748b
- Border: #e2e8f0
- Never use deprecated #003366 or #FFC300.

Authoritative carrier logo URLs:
- Progressive: https://i.imgur.com/7N1vfo0.png
- Nationwide: https://i.imgur.com/Mv5V7tV.png
- National General: https://i.imgur.com/9ZWQsAS.png
- Travelers: https://i.imgur.com/m6wsO1p.png
- NC Grange Mutual: https://i.imgur.com/Fesnkng.png
- Alamance Farmers: https://i.imgur.com/S8BVnvs.png
- Foremost: https://i.imgur.com/rHIo4r5.jpg
- Hagerty: https://i.imgur.com/0UyINHi.png
- NCJUA: https://i.imgur.com/oSJj6ZW.png
- Dairyland: https://i.imgur.com/1VkIvxv.png
- Steadily (Fortegra): https://i.imgur.com/xzB0zD5.png

Gmail hard rules:
1. Tables only for layout. No flexbox. No grid. No positioned layout.
2. Inline CSS on elements. A single style block is allowed for Inter import and media queries.
3. No JavaScript. No external stylesheets besides Inter import.
4. No box-shadow. Use borders for depth.
5. Never use border-radius: 50 percent.
6. Never use circle avatars or initials avatars for drivers or insureds.
7. Use clean stacked person rows with a left-aligned name/sub-label and a right-aligned role pill.
8. Keep total HTML under 102000 bytes.
9. Use card backgrounds with bgcolor="#fafafa", except logo wrapper cells which should use white.
10. Include a clean literal mailto:Save@BillLayneInsurance.com in the footer.
11. Include the Inter font import in head.
12. Include Outlook MSO conditional comments in head.
13. Include a 600px spacer div as the first child of body. Use repeated non-breaking spaces, not unusual symbols:
    <div style="display:none;white-space:nowrap;font:15px courier;color:#ffffff;line-height:0;width:600px!important;min-width:600px!important;max-width:600px!important;">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div>
14. Main content wrapper MUST follow the full-width to 600px container pattern:
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="width:100%; background-color:#f8fafc;">
      <tr>
        <td align="center" valign="top" style="padding:20px 10px;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" class="container-600" style="width:600px; max-width:600px; margin:0 auto;">
            ... all email content rows ...
          </table>
        </td>
      </tr>
    </table>
    Every table must include BOTH the HTML width attribute AND the inline width style.
15. MOBILE RESPONSIVE MEDIA BLOCK is required in every template. Put it in head and actually use these classes:
    <style type="text/css">
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
      body, table, td, p, a { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
      table, td { mso-table-lspace:0pt; mso-table-rspace:0pt; border-collapse:collapse !important; }
      img { border:0; height:auto; line-height:100%; outline:none; text-decoration:none; -ms-interpolation-mode:bicubic; }
      body { margin:0 !important; padding:0 !important; width:100% !important; }
      p { margin:0; mso-line-height-rule:exactly; }
      @media screen and (max-width: 600px) {
        .container-600   { width:100% !important; max-width:100% !important; }
        .mobile-pad-20   { padding-left:16px !important; padding-right:16px !important; }
        .mobile-pad-hero { padding:32px 16px !important; }
        .mobile-pad-card { padding:20px !important; }
        .stack           { display:block !important; width:100% !important; max-width:100% !important; box-sizing:border-box !important; }
        .stack-right     { text-align:left !important; padding-top:14px !important; }
        .hero-h1         { font-size:22px !important; line-height:28px !important; }
        .amount-xl       { font-size:28px !important; line-height:32px !important; }
        .label-sm        { font-size:12px !important; }
        .value-md        { font-size:15px !important; }
        .logo-mobile img { width:160px !important; height:auto !important; }
        .nowrap-guard    { word-break:break-word !important; overflow-wrap:break-word !important; }
      }
    </style>
16. Two-column rows must stack on mobile. Any side-by-side td pair must use .stack on both columns and .stack-right on the right column so mobile view becomes single-column and left-aligned.
17. Every p, span, or td containing user data such as names, addresses, carrier names, URLs, or policy numbers must include word-break:break-word and overflow-wrap:break-word, either inline or via .nowrap-guard.
18. Every p and h1 must include mso-line-height-rule:exactly. Hero headings should be 26px desktop and 22px mobile via .hero-h1. Large premium amounts should be 32px desktop and 28px mobile via .amount-xl. Desktop padding at 20px or more must shrink on mobile using the mobile pad classes.

GLOBAL TEMPLATE INHERITANCE RULE:
- Every template type inherits the full Gmail-safe, mobile-safe structure above.
- The wrapper pattern, media query block, stacking classes, word-break protection, Outlook fixes, footer sequence, and core brand system apply to ALL templates, including receipts, renewals, welcomes, claims, proof-of-insurance emails, and quotes.
- Template modules only change content blocks, hero tone, CTA wording, and section order where explicitly allowed. They do not replace the shared responsive shell.

Hero guidance:
- Sales, quote, welcome, and renewal emails can use a dark slate to teal gradient hero.
- Informational, proof, receipt, and B2B emails can use a solid blue, green, amber, or red hero as appropriate.
- Use first-person CTA copy like "Get My Quote".

Footer sequence:
1. Gold accent line
2. Agency logo in a white wrapper
3. Address, phone, email, website, and est. 2005
4. Plain text social links separated by pipes
5. Google rating badge line
6. Facebook follow line
7. Messenger line for non-B2B emails
8. Unsubscribe line
- Whenever an email includes a Google review CTA, review request button, or "leave a review" action, the href must be exactly:
  https://g.page/r/CXGq9B7-jzu7EBM/review
- Never use a placeholder, homepage, search result, or "#" for a Google review request button.

========================================================================
EMOJI USAGE (REQUIRED ON ALL CLIENT-FACING TEMPLATES)
========================================================================
Use emojis strategically as visual anchors for section headers and inline
value props. Never decorative, always functional. Target: 10 to 25 emojis
per email. Use these specific emojis by context:

  Auto quote hero        -> 🚗
  Home quote hero        -> 🏡
  Welcome / new policy   -> 🎉 or 👋
  Payment / receipt      -> 💳
  Claims                 -> 🛡️ or 📋
  Renewal                -> 🔁
  Cancellation           -> ⚠️ or ❌
  Shopping / rate comp   -> ⭐
  Discounts              -> 🎁
  Coverage / protection  -> 🛡️
  Driver                 -> 👤
  Vehicle                -> 🚙 🚛 🏍️ 🚐
  Property               -> 🏠
  Bodily injury          -> 🧍
  Comprehensive          -> 🌧️
  Collision              -> 💥
  Rental / roadside      -> 🚛
  Quote reference        -> 📑
  Payment plan           -> 💳
  Understanding coverage -> 📋
  Google stars           -> ⭐
  Messenger              -> 💬
  Date / term            -> 📅

========================================================================
TEMPLATE TYPE -> AUTO QUOTE MODULE (trigger when templateTitle contains
"auto quote", "car quote", "vehicle quote", "auto proposal")
========================================================================

REQUIRED SECTIONS IN THIS EXACT ORDER:

1. DUAL-LOGO HEADER
   - White background, with a 4px gold/navy gradient accent bar on top:
     linear-gradient(90deg,#003f87,#C8A84E)
   - Two 50/50 columns: agency logo left, carrier logo right.
   - Both logos wrapped in bgcolor="#ffffff" cells.
   - 1px #e2e8f0 vertical divider between them, hidden on mobile via .mobile-hide.
   - Each logo has a sub-label underneath:
     Agency -> "Your Independent Agency"
     Carrier -> "Your Quoted Carrier"
   - Both columns collapse to full-width on mobile via .stack.

2. HERO WITH MONTHLY-AS-BIG-NUMBER
   - Gradient must be:
     linear-gradient(135deg,#0f172a 0%,#1a365d 50%,#0f766e 100%)
     with bgcolor="#0f172a" fallback. Never use a 2-stop gradient.
   - Tiny gold label row on top: "🚗 AUTO QUOTE PREPARED FOR" in gold #C8A84E.
   - Client name as the hero h1.
   - Thank-you greeting line with 👋 and a short intro.
   - Premium box with gold uppercase label "EST. MONTHLY PAYMENT".
   - The largest hero number must be the monthly amount.
     Formula priority:
       1. If a monthly amount is provided, use it.
       2. Else if total and down payment are provided, use (total - down_payment) / (term_months - 1).
       3. Else use total / term_months.
     Down payment can appear as a supporting line, but never replaces the main monthly figure.
   - Supporting line format should read like:
     "$TOTAL • 6-month term • $DOWN down"
   - Hero meta chips row under the premium box:
     maximum 4 chips for facts like term, BI limit, deductible, and coverage type.
   - Primary CTA below chips:
     gold background #C8A84E, dark slate text, first-person copy only.
     Good examples:
       "Bind My Policy →"
       "Lock In My Rate →"
       "Claim This Quote →"
     Never use "Get Your Quote", "View Quote", or "Click Here".

3. "WE SHOPPED YOUR RATE" CARD
   - White card, 2px solid #C8A84E gold border, border-radius 6px.
   - Gold uppercase label: "⭐ WE SHOPPED YOUR RATE"
   - 2 to 3 sentence value statement explaining that the agency compared carriers.
   - Recommended carrier name should be bold and navy #003f87.

4. QUOTED VEHICLE CARD
   - White card, 1px #e2e8f0 border, border-radius 6px.
   - Uppercase label with emoji: "🚙 QUOTED VEHICLE"
   - Vehicle line should be year + make + model + trim in bold.
   - VIN sub-line should include word-break protection.

5. COVERAGE HIGHLIGHTS CARD
   - White card with border and radius.
   - Uppercase label with emoji: "🛡️ COVERAGE HIGHLIGHTS"
   - Two-column table, each row = coverage name left + limit/deductible right.
   - Each row should include an inline emoji before the coverage name and a 12px description sub-line.
   - Limits should be navy, bold, and right-aligned.
   - Included items get a green pill badge.
   - Below the table, include a discounts callout:
     label "🎁 DISCOUNTS APPLIED" and a pipe-separated list of discounts.

6. RATED DRIVER(S) CARD
   - Uppercase label with emoji: "👤 RATED DRIVER" or "👤 RATED DRIVERS"
   - Use the clean stacked row pattern, never circle avatars.
   - Primary driver badge text must be "PRIMARY".
   - Other allowed badge texts: SPOUSE, TEEN, ADDED, EXCLUDED.
   - Never use generic text like "Rated Driver".

7. UNDERSTANDING YOUR COVERAGE (INFOGRAPHIC)
   - Section header with emoji: "📋 UNDERSTANDING YOUR COVERAGE"
   - Always embed this infographic on auto quote emails:
     https://i.imgur.com/U5xlArp.jpeg
   - Image width 536, width 100 percent, max-width 536px, height auto.
   - 1px #e2e8f0 border and 6px radius.

8. QUOTE REFERENCE + PAYMENT PLAN ROW
   - Two-column stacking row using .stack and .stack-right.
   - Left side: "📑 QUOTE REFERENCE"
   - Right side: "💳 PAYMENT PLAN"
   - Below that, add the italic underwriting disclaimer in muted text.

9. MESSENGER CHAT BUTTON
   - Outlined navy button with white background.
   - Copy must be:
     "💬 Have a Question? Message Us"
   - Link to https://m.me/dollarbillagency
   - Include an hours line beneath the button.
   - Messenger is not optional for consumer-facing auto quote emails.

10. FULL FOOTER
    - The full 8-step footer sequence is mandatory on every auto quote.
    - Every social or footer link must be a real href, never "#".

========================================================================
AUTO QUOTE COPY RULES
========================================================================
Subject lines for auto quotes should stay lowercase, under 45 characters,
and ideally include the carrier name or monthly number.
Preheaders should include the client first name, monthly figure, and carrier.
Hero greeting line should sound warm and specific, like:
  "Hi [FirstName] 👋 — thanks for giving us a shot. Here's your personalized quote."

========================================================================
TEMPLATE TYPE -> GOOGLE REVIEW REQUEST MODULE (trigger when templateTitle contains
"google review", "review request", "leave us a review")
========================================================================
1. Use the shared Gmail-safe and mobile-safe shell above.
2. Thank the client warmly for trusting the agency.
3. Explain briefly that their feedback helps local families choose coverage confidently.
4. Include one clear primary review action button.
5. The review button href must be exactly:
   https://g.page/r/CXGq9B7-jzu7EBM/review
6. Good CTA copy examples:
   "Leave My Review ->"
   "Share My Feedback ->"
   "Review Bill Layne Insurance ->"
7. Include the Google rating reference line in the footer.
8. Do not invent alternate review URLs.

Do not include any prose outside the requested JSON response.
The htmlBody must be a complete standalone HTML document from doctype through closing html.
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
  if ((/\b(auto|car|vehicle)\b/.test(normalized) && /\bquote\b/.test(normalized)) || /\bauto proposal\b/.test(normalized)) {
    return 'auto-quote';
  }
  if (/\bhome\b.*\bquote\b/.test(normalized) || /\b(ho-?3|dp-?[23]|dwelling)\b/.test(normalized)) {
    return 'home-quote';
  }
  if (/\bwelcome\b|\bnew business\b/.test(normalized)) {
    return 'welcome';
  }
  if (/\bgoogle\b.*\breview\b/.test(normalized) || /\breview request\b/.test(normalized) || /\bleave us a review\b/.test(normalized)) {
    return 'google-review';
  }
  if (/\breceipt\b|\bpayment\b/.test(normalized)) {
    return 'payment-receipt';
  }
  if (/\brenewal\b/.test(normalized)) {
    return 'renewal';
  }
  if (/\bcancel/.test(normalized)) {
    return 'cancellation';
  }
  if (/\bproof\b|\bcertificate\b/.test(normalized)) {
    return 'proof-of-insurance';
  }
  if (/\bclaim/.test(normalized)) {
    return 'claim';
  }
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

When TEMPLATE TYPE is "auto-quote", follow the "TEMPLATE TYPE -> AUTO QUOTE MODULE"
section of the design system exactly. All 10 required sections must appear in order.
When TEMPLATE TYPE is "google-review", follow the "TEMPLATE TYPE -> GOOGLE REVIEW REQUEST MODULE"
section exactly, especially the required review button href.
Do not substitute sections from the legacy template guide if they conflict with the module.
The module is authoritative.

LEGACY TEMPLATE GUIDE (for reference only, may be outdated):
---
${options.templateInstructions ?? ''}
---

${options.supplementalInstructions ? `STUDIO CONTEXT:
---
${options.supplementalInstructions}
---
` : ''}

CLIENT DATA (extract everything you need from this block):
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
    ? '\nATTACHED FILE: Use the attached file as the primary source for names, dates, policy numbers, premiums, and coverage details.'
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
      systemInstruction: EMAIL_DESIGN_SYSTEM,
      responseMimeType: 'application/json',
      responseSchema: EMAIL_RESPONSE_SCHEMA,
    },
  });

  if (!response.text) {
    throw new Error('Email generation failed: empty response from Gemini.');
  }

  const parsed = JSON.parse(response.text) as GeneratedEmailPayload;
  if (!parsed.subject || !parsed.htmlBody) {
    throw new Error('Gemini response did not match the required email schema.');
  }

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
Refine the existing Bill Layne Insurance email below using the same 2026 design system.

CURRENT SUBJECT:
${options.currentSubject || ''}

REFINEMENT INSTRUCTION:
${options.instruction}

EXISTING HTML:
${options.existingHtml}

Return only JSON with subject, preheader, and htmlBody.
`;

  const response = await generateWithFallback(ai, {
    contents: prompt,
    config: {
      systemInstruction: EMAIL_DESIGN_SYSTEM,
      responseMimeType: 'application/json',
      responseSchema: EMAIL_RESPONSE_SCHEMA,
    },
  });

  if (!response.text) {
    throw new Error('Email refinement failed: empty response from Gemini.');
  }

  const parsed = JSON.parse(response.text) as GeneratedEmailPayload;
  if (!parsed.subject || !parsed.htmlBody) {
    throw new Error('Gemini response did not match the required refined email schema.');
  }

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
          {
            text: `Extract the following information from the attached document or instructions to generate a Proof of Insurance / ID Card email.\nInstructions: ${options.instructions}\nIf information is missing, use placeholders like "[Missing]".`,
          },
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

  if (!response.text) {
    throw new Error('POI extraction failed: empty response from Gemini.');
  }

  return JSON.parse(response.text) as PoiExtractionPayload;
};
