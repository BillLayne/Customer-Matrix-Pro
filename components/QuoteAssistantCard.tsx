
import React, { useState } from 'react';
import { GoogleGenAI, Type } from "@google/genai";

interface QuoteAssistantCardProps {
    addToast: (message: string, type?: 'success' | 'warning' | 'danger' | 'info') => void;
}

const QuoteAssistantCard: React.FC<QuoteAssistantCardProps> = ({ addToast }) => {
    const [quoteNotes, setQuoteNotes] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [htmlBody, setHtmlBody] = useState('');
    const [emailSubject, setEmailSubject] = useState('');

    const handleGenerate = async () => {
        if (!quoteNotes.trim()) {
            addToast('Please enter the client\'s quoting information.', 'warning');
            return;
        }

        setIsProcessing(true);
        setHtmlBody('');
        setEmailSubject('');

        try {
            const prompt = `
You are an expert insurance quoting specialist and sales analyst for Bill Layne Insurance Agency. Your primary goal is to take unstructured, free-form client notes and transform them into a comprehensive, persuasive quote proposal. This proposal will be used internally by our agents to finalize the quote and MUST be formatted for printing on standard letterhead paper.

**User's Raw Notes:**
---
${quoteNotes}
---

**Your Task:**
1.  **Parse & Organize:** Meticulously read the user's raw notes and extract all key information (e.g., client name(s), DOB, address, contact info, vehicle details, driver information, current coverages, etc.). Organize this extracted data into a clean, easy-to-read summary at the top of the proposal.
2.  **Identify Upsell Opportunities & Coverage Gaps:** This is the most critical step. Analyze the client's information to find areas where their coverage is lacking or could be improved. You MUST identify at least two potential upsells or recommendations. Common examples include:
    *   Liability limits are below our agency standard of 100/300/100.
    *   Missing Rental Reimbursement or Towing coverage.
    *   No or low Uninsured/Underinsured Motorist (UM/UIM) coverage.
    *   High deductibles that could be risky for the client.
    *   No mention of an umbrella policy, which could be a great value.
    *   Missing special endorsements (e.g., custom equipment coverage).
3.  **Create Actionable Recommendations:** For each identified gap or upsell opportunity, create a section titled "Recommended Coverage Enhancements". Clearly explain the *benefit* of each recommendation in simple, client-friendly terms. For example: "Add Rental Reimbursement: This ensures you won't be without a car while yours is being repaired after an accident."
4.  **Generate a Styled HTML Proposal:** Format the entire output as a single, beautifully designed, mobile-optimized, and Gmail-compatible HTML email.

**Output:** You MUST return a single JSON object with two keys:
1. "subject": A clear and concise subject line for the proposal (e.g., "Quote Proposal for John Doe - Auto").
2. "htmlBody": The full, self-contained HTML code for the proposal.

**HTML Requirements (CRITICAL):**

*   **Structure:**
    *   **Header:** IMPORTANT! Do NOT include a header with the agency logo or name. This document will be printed on company letterhead. Start the content directly with a clear title like "Internal Quote Proposal".
    *   **Client Summary:** A section with the organized client data you extracted.
    *   **Recommended Enhancements:** The section with your upsell analysis and explanations.
    *   **Next Steps:** A brief note for the agent (e.g., "Proceed with quoting these carriers...").
    *   **Footer:** Agency branding and contact information. This is acceptable at the bottom of the last page.
*   **Print Optimization:**
    *   To ensure the document prints correctly on letterhead, include this exact style block inside the HTML's \`<head>\`: \`<style type="text/css" media="print"> @page { size: letter; margin: 1in; } body { -webkit-print-color-adjust: exact; color-adjust: exact; } .no-break { page-break-inside: avoid !important; } </style>\`.
    *   Wrap each major section (e.g., the entire "Client Summary" table, each item in "Recommended Coverage Enhancements") in a container (like a \`<tr>\` or a wrapper table) with \`class="no-break"\` to prevent them from being split across pages during printing.
*   **Styling:** Follow the exact branding and technical guidelines provided below. Use a clean, professional style suitable for a printed document.
*   **Gmail & Mobile First:** While this is for print, it should still be based on a table-layout and inline CSS for robustness.
*   **Agency Logo:** Do NOT use the agency logo.
*   **Primary Color (Deep Blue):** \`#003366\`
*   **Accent Color (Golden Yellow):** \`#FFC300\`
*   **Carrier Logos (Use these Imgur URLs when referencing a specific carrier):**
    *   **Alamance:** \`https://i.imgur.com/GZPTa01.png\`
    *   **Dairyland:** \`https://i.imgur.com/Ery1d4W.png\`
    *   **Foremost:** \`https://i.imgur.com/1BneP2S.png\`
    *   **Hagerty:** \`https://i.imgur.com/kS5W3aY.png\`
    *   **JSA:** \`https://i.imgur.com/gKSlO1K.png\`
    *   **NC Grange:** \`https://i.imgur.com/dO2gT8E.png\`
    *   **National General:** \`https://i.imgur.com/V7YqM3P.png\`
    *   **Nationwide:** \`https://i.imgur.com/K3337EV.png\`
    *   **Progressive:** \`https://i.imgur.com/pYf1LcF.png\`
    *   **Travelers:** \`https://i.imgur.com/B9421yZ.png\`
    *   **NCJUA:** \`https://i.imgur.com/9C3VwYp.png\`

Now, analyze the user's notes and generate the JSON output.
`;
            
            const API_KEY = process.env.API_KEY;
            if (!API_KEY) throw new Error("API key not found.");
            const ai = new GoogleGenAI({ apiKey: API_KEY });
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            subject: { type: Type.STRING },
                            htmlBody: { type: Type.STRING }
                        },
                        required: ['subject', 'htmlBody']
                    }
                }
            });

            if (!response.text) {
                 throw new Error("Content generation failed: Empty response from AI.");
            }

            const parsedResult = JSON.parse(response.text);

            if (!parsedResult.subject || !parsedResult.htmlBody) {
                throw new Error('AI response did not match the required format.');
            }
        
            setHtmlBody(parsedResult.htmlBody);
            setEmailSubject(parsedResult.subject);
            addToast('Quote proposal generated successfully!', 'success');

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            addToast(`Processing failed: ${errorMessage}`, 'danger');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleClear = () => {
        setHtmlBody('');
        setEmailSubject('');
        setQuoteNotes('');
        addToast('Quote Assistant cleared.', 'info');
    };

    const handleDownload = () => {
        if (!htmlBody) return;
        const blob = new Blob([htmlBody], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${emailSubject.replace(/ /g, '_').replace(/[^a-z0-9_]/gi, '') || 'quote_proposal'}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handlePrint = () => {
        if (!htmlBody) return;
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(htmlBody);
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();
        } else {
            addToast('Could not open print window.', 'warning');
        }
    };

    const handleEmail = async () => {
        if (!htmlBody) return;

        let contentToCopy = htmlBody;
        const bodyContentMatch = htmlBody.match(/<body[^>]*>([\s\S]*)<\/body>/i);
        if (bodyContentMatch && bodyContentMatch[1]) {
            contentToCopy = bodyContentMatch[1];
        }

        try {
            const blob = new Blob([contentToCopy], { type: 'text/html' });
            // @ts-ignore
            const clipboardItem = new ClipboardItem({ 'text/html': blob });
            // @ts-ignore
            await navigator.clipboard.write([clipboardItem]);
            addToast('Proposal copied! Paste it into the Gmail window.', 'success');
        } catch (error) {
            console.error('Failed to copy styled HTML to clipboard:', error);
            try {
                await navigator.clipboard.writeText(htmlBody);
                addToast('Copied proposal as HTML code.', 'info');
            } catch (copyError) {
                addToast('Could not copy proposal automatically.', 'danger');
                return;
            }
        }
    
        const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(emailSubject)}`;
        window.open(gmailUrl, '_blank');
    };

    return (
        <div className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl shadow-md p-5">
            <h3 className="text-base font-bold flex items-center justify-between mb-4">
                <span>
                    <i className="fa-solid fa-file-invoice-dollar text-primary dark:text-accent mr-2"></i>
                    Live Quote Assistant
                </span>
                <span className="text-xs font-bold uppercase bg-gradient-to-r from-primary to-secondary text-white px-2 py-0.5 rounded-full">AI Pro</span>
            </h3>
            
            <div className="space-y-3">
                 <div>
                    <label className="text-xs font-semibold text-text-secondary-light dark:text-text-secondary-dark">ENTER QUOTE NOTES</label>
                    <textarea
                        value={quoteNotes}
                        onChange={(e) => setQuoteNotes(e.target.value)}
                        placeholder="Type or paste all customer and vehicle info here. For example: John Smith, 123 Main St, 2022 Honda CRV, currently has 50/100/50 liability..."
                        className="w-full h-32 p-2 mt-1 bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark rounded-md text-sm"
                    />
                </div>
                <button 
                    onClick={handleGenerate} 
                    disabled={isProcessing} 
                    className="w-full bg-gradient-to-r from-primary to-secondary text-white font-bold py-2.5 rounded-lg shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                    {isProcessing ? <><i className="fa-solid fa-spinner fa-spin"></i> Analyzing & Building...</> : <><i className="fa-solid fa-wand-magic-sparkles"></i> Generate Quote Proposal</>}
                </button>
            </div>
            
            {(isProcessing || htmlBody) && (
                <div className="mt-4 border-t border-border-light dark:border-border-dark pt-4">
                    <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
                        <h4 className="text-sm font-semibold">Generated Proposal Preview</h4>
                        {htmlBody && !isProcessing && (
                            <div className="flex items-center gap-1.5 sm:gap-2">
                                <button onClick={handleDownload} title="Download HTML" className="px-2 py-1.5 sm:px-3 text-xs bg-card-light dark:bg-card-dark rounded border border-border-light dark:border-border-dark hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center gap-1.5">
                                   <i className="fa-solid fa-download"></i> <span className="hidden md:inline">Download</span>
                                </button>
                                <button onClick={handlePrint} title="Print" className="px-2 py-1.5 sm:px-3 text-xs bg-card-light dark:bg-card-dark rounded border border-border-light dark:border-border-dark hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center gap-1.5">
                                   <i className="fa-solid fa-print"></i> <span className="hidden md:inline">Print</span>
                                </button>
                                <button onClick={handleEmail} title="Email" className="px-2 py-1.5 sm:px-3 text-xs bg-card-light dark:bg-card-dark rounded border border-border-light dark:border-border-dark hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center gap-1.5">
                                   <i className="fa-solid fa-envelope"></i> <span className="hidden md:inline">Email</span>
                                </button>
                                <button onClick={handleClear} title="Clear Preview" className="px-2 py-1.5 sm:px-3 text-xs bg-red-500 text-white rounded hover:bg-red-600 flex items-center gap-1.5">
                                    <i className="fa-solid fa-xmark"></i> <span className="hidden md:inline">Clear</span>
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="w-full h-96 bg-white dark:bg-bg-dark border border-border-light dark:border-border-dark rounded-md overflow-hidden">
                        {isProcessing ? (
                            <div className="flex flex-col items-center justify-center h-full text-text-secondary-light dark:text-text-secondary-dark">
                                <i className="fa-solid fa-spinner fa-spin text-3xl mb-4"></i>
                                <p className="font-semibold">AI is building your proposal...</p>
                                <p className="text-xs mt-1">Identifying upsell opportunities.</p>
                            </div>
                        ) : (
                            <iframe
                                srcDoc={htmlBody}
                                title="Generated Quote Proposal"
                                className="w-full h-full border-0"
                                sandbox="allow-same-origin"
                            />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuoteAssistantCard;