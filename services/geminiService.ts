
import { GoogleGenAI, Type } from "@google/genai";
import { PROMPT_TEMPLATES, type TemplateContract } from "../constants";
import { EMAIL_DESIGN_SYSTEM_V2 } from "./emailDesignSystemV2";

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
CRITICAL HTML RULE: Never place inline style "display:block" directly on <td> elements. Use approved responsive utility classes from the Bill Layne Gmail system instead. If you need a block-level container inside a table cell, wrap the content in a nested <table> instead.`;

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
export interface EmailGenerationOptions {
  templateKey?: string;
  templateType?: string;
  templateTitle?: string;
  templateInstructions?: string;
  contract?: TemplateContract;
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

function detectTemplateType(options: {
  templateType?: string;
  templateKey?: string;
  templateTitle?: string;
}): string {
  if (options.templateType && options.templateType !== 'general') return options.templateType;
  if (options.templateKey && PROMPT_TEMPLATES[options.templateKey]) {
    return PROMPT_TEMPLATES[options.templateKey].templateType;
  }

  const normalized = (options.templateTitle ?? '').toLowerCase();
  if (!normalized) return 'general';
  if ((/\b(auto|car|vehicle)\b/.test(normalized) && /\bquote\b/.test(normalized)) || /\bauto proposal\b/.test(normalized)) return 'auto-quote';
  if (/\bhome\b.*\bquote\b/.test(normalized) || /\b(ho-?3|dp-?[23]|dwelling)\b/.test(normalized)) return 'home-quote';
  if (/\bwelcome\b|\bnew business\b/.test(normalized)) return 'welcome';
  if (/\bgoogle\b.*\breview\b/.test(normalized) || /\breview request\b/.test(normalized) || /\bleave us a review\b/.test(normalized)) return 'google-review';
  if (/\breceipt\b|\bpayment\b/.test(normalized)) return 'receipt';
  if (/\brenewal\b/.test(normalized)) return 'renewal';
  if (/\bcancel/.test(normalized)) return 'cancellation';
  if (/\bproof\b/.test(normalized)) return 'poi';
  if (/\bcertificate\b/.test(normalized)) return 'coi';
  if (/\bclaim/.test(normalized)) return 'claims';
  if (/\bmotorcycle\b|\bbike\b/.test(normalized)) return 'motorcycle-quote';
  if (/\brenters\b/.test(normalized)) return 'renters-quote';
  if (/\bcommercial\b|\bworkers.?comp\b|\bbop\b/.test(normalized)) return 'commercial-quote';
  return 'general';
}

const formatTemplateContract = (contract?: TemplateContract) => {
  if (!contract) return '';

  return `
THIS TEMPLATE'S CONTRACT (follow exactly):
KEY: ${contract.key}
INTENT: ${contract.intent}
HERO: ${contract.heroStyle} - ${contract.heroNumberRule}
REQUIRED SECTIONS: ${contract.requiredSections.join('; ')}
FORBIDDEN SECTIONS (must NOT appear): ${contract.forbiddenSections.join('; ')}
REQUIRED DATA FIELDS: ${contract.requiredDataFields.join(', ')}
${contract.optionalDataFields?.length ? `OPTIONAL DATA FIELDS: ${contract.optionalDataFields.join(', ')}` : ''}
CTA: ${contract.ctaRules}
${contract.complianceNotes ? `COMPLIANCE: ${contract.complianceNotes}` : ''}
SALES TEMPLATE: ${contract.isSales ? 'yes - use sales/welcome rules' : 'no - use transactional/documenting rules'}
${contract.isB2B ? 'B2B: yes - no Messenger card, no Facebook-follow line, no social buttons.' : ''}
`;
};

export const generateEmailTemplate = async (
  options: EmailGenerationOptions
): Promise<GeneratedEmailPayload> => {
  const ai = getAiClient();
  const resolvedContract =
    options.contract ||
    (options.templateKey ? PROMPT_TEMPLATES[options.templateKey] : undefined);
  const templateHint = detectTemplateType({
    templateType: options.templateType || resolvedContract?.templateType,
    templateKey: options.templateKey || resolvedContract?.key,
    templateTitle: options.templateTitle || resolvedContract?.title,
  });
  const templateTitle = options.templateTitle || resolvedContract?.title || templateHint;
  const templateInstructions = options.templateInstructions || resolvedContract?.prompt || '';

  const userRequest = templateTitle && templateHint !== 'general'
    ? `
TASK: ${templateTitle}

TEMPLATE TYPE: ${templateHint}

The EMAIL DESIGN SYSTEM V2 above is authoritative. Follow the module matching this template type exactly.
All required sections for the module must appear in order.
The selected template contract below is authoritative. Where general user instructions conflict with this contract, the template contract wins.

${formatTemplateContract(resolvedContract)}
The legacy template guide below is for reference only — where it conflicts with the design system, the design system wins.

LEGACY TEMPLATE GUIDE (reference only):
---
${templateInstructions}
---

${options.supplementalInstructions ? `STUDIO CONTEXT:\n---\n${options.supplementalInstructions}\n---\n` : ''}

USER INSTRUCTIONS / CLIENT DATA (extract all names, dates, policy numbers, premiums, and coverage details from this block):
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
          { text: `Extract the following information from the attached document or instructions to generate a Proof of Insurance email.\nInstructions: ${options.instructions}\nIf information is missing, use placeholders like "[Missing]".` },
          { inlineData: { mimeType: options.file.mimeType, data: options.file.data } },
        ],
      }
    : `Extract the following information to generate a Proof of Insurance email.\nInstructions: ${options.instructions}\nIf information is missing, use placeholders like "[Missing]".`;

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
