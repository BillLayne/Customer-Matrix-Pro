import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  // In a real app, you might want to handle this more gracefully.
  // For this context, we assume the API_KEY is provided.
  console.error("Gemini API key not found in environment variables.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

const SYSTEM_INSTRUCTION = `Act as an expert insurance agent for Bill Layne Insurance Agency in Elkin, NC. Your tone should be professional, helpful, and clear. 
Our agency's key carriers are: Nationwide, Progressive, National General, Alamance, Foremost, Travelers, and NC Grange.
When drafting communications, use our contact info:
Bill Layne Insurance Agency
1283 N Bridge St, Elkin NC 28621
Phone: 336-835-1993
Email: Save@BillLayneInsurance.com

Always provide concise, accurate, and actionable information tailored to the user's request. Format complex information in tables or lists for clarity.`;

export const generateContent = async (
  prompt: string, 
  file?: { mimeType: string, data: string }
) => {
  try {
    const contents = file 
      ? { parts: [{ text: prompt }, { inlineData: { mimeType: file.mimeType, data: file.data } }] }
      : prompt;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      }
    });

    return response.text;
  } catch (error) {
    console.error("Error generating content from Gemini:", error);
    throw new Error("Failed to get response from AI assistant.");
  }
};

export const generateContentStream = async (prompt: string) => {
  try {
    const result = await ai.models.generateContentStream({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      }
    });
    return result;
  } catch (error) {
    console.error("Error generating content from Gemini:", error);
    throw new Error("Failed to get response from AI assistant.");
  }
};