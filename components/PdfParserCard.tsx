
import React, { useState } from 'react';
import { GoogleGenAI, Type } from "@google/genai";

interface PdfParserCardProps {
    addToast: (message: string, type?: 'success' | 'warning' | 'danger' | 'info') => void;
}

const FileInput: React.FC<{
    file: File | null;
    id: string;
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onClear: () => void;
}> = ({ file, id, onFileChange, onClear }) => (
    <div className="bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark rounded-lg p-3">
        <div className="flex items-center gap-2">
            <label htmlFor={id} className="flex-1 cursor-pointer w-full bg-card-light dark:bg-card-dark border-2 border-dashed border-border-light dark:border-border-dark font-semibold py-2 px-3 rounded-lg hover:border-primary dark:hover:border-accent transition-colors flex items-center justify-center gap-2 text-sm text-text-secondary-light dark:text-text-secondary-dark">
                <i className="fa-solid fa-upload"></i>
                <span>{file ? 'Change PDF' : 'Select PDF'}</span>
            </label>
            <input id={id} type="file" accept=".pdf" onChange={onFileChange} className="hidden" />
            {file && (
                <button onClick={onClear} title="Clear selection" className="px-3 py-2 text-red-500 rounded-lg hover:bg-red-500/10">
                    <i className="fa-solid fa-times"></i>
                </button>
            )}
        </div>
        {file && (
            <div className="text-xs text-text-secondary-light dark:text-text-secondary-dark mt-2 px-1 flex items-center gap-2">
                <i className="fa-solid fa-file-invoice flex-shrink-0"></i>
                <span className="truncate" title={file.name}>{file.name}</span>
            </div>
        )}
    </div>
);


const PdfParserCard: React.FC<PdfParserCardProps> = ({ addToast }) => {
    const [pdfFile1, setPdfFile1] = useState<File | null>(null);
    const [pdfFile2, setPdfFile2] = useState<File | null>(null);
    const [instructions, setInstructions] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [htmlBody, setHtmlBody] = useState('');
    const [emailSubject, setEmailSubject] = useState('');

    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                const result = reader.result as string;
                const base64 = result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = (error) => reject(error);
        });
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, fileNumber: 1 | 2) => {
        const file = event.target.files?.[0];
        if (file) {
            if (file.type !== 'application/pdf') {
                addToast('Please select a PDF file.', 'warning');
                return;
            }
            if (fileNumber === 1) setPdfFile1(file);
            if (fileNumber === 2) setPdfFile2(file);
            setHtmlBody('');
            setEmailSubject('');
        }
    };

    const clearPdfFile = (fileNumber: 1 | 2) => {
        const setter = fileNumber === 1 ? setPdfFile1 : setPdfFile2;
        setter(null);
        const fileInput = document.getElementById(`pdf-upload-${fileNumber}`) as HTMLInputElement;
        if (fileInput) fileInput.value = '';
    };

    const handleClearPreview = () => {
        setHtmlBody('');
        setEmailSubject('');
        clearPdfFile(1);
        clearPdfFile(2);
        setInstructions('');
        addToast('Preview cleared.', 'info');
    };

    const handleProcessRequest = async () => {
        if (!pdfFile1) {
            addToast('Please select at least one PDF file.', 'warning');
            return;
        }

        setIsProcessing(true);
        setHtmlBody('');
        setEmailSubject('');

        try {
            const isComparison = pdfFile1 && pdfFile2;
            const base64Data1 = await fileToBase64(pdfFile1);
            const base64Data2 = isComparison ? await fileToBase64(pdfFile2!) : null;

            const stylingPrompt = `
You are an expert insurance marketing designer and document processor for Bill Layne Insurance Agency. Your task is to transform the attached PDF document into a beautifully designed, mobile-optimized, and Gmail-compatible HTML email. You will also generate a compelling subject line.

**Your Goal:** Create an engaging, professional email that is easy for a client to read and understand.
`;

            const comparisonPrompt = `
You are an expert insurance analyst and marketing designer for Bill Layne Insurance Agency. Your task is to analyze and compare the two attached PDF documents (e.g., quotes, renewals) and present your findings in a beautifully designed, mobile-optimized, and Gmail-compatible HTML email. You will also generate a compelling subject line.

**Your Goal:** Create a clear, side-by-side comparison that helps a client easily understand the differences, pros, and cons of their options.

**Analysis Steps:**
1.  Extract key information from BOTH documents: Carrier, policy type, client name, total premium (annual/monthly), effective dates.
2.  Identify and list all coverages and their limits/deductibles from each document.
3.  Directly compare the key metrics in a structured table format.
4.  Write a summary highlighting the most significant differences (e.g., "Option 2 offers higher liability coverage for a slightly lower premium.").
5.  Conclude with a professional recommendation or a clear call to action for the client to discuss the options.
`;
            const userInstructionsPrompt = instructions.trim()
                ? `
**User's Instructions:**
---
${instructions.trim()}
---
You MUST prioritize and follow these instructions when processing the document(s). For example, if the user asks to combine two quotes, you must create a single, unified document reflecting that combination.
`
                : '';

            const commonPromptFooter = `
${userInstructionsPrompt}
**Output:** You MUST return a single JSON object with two keys:
1. "subject": A compelling and relevant email subject line.
2. "htmlBody": The full, self-contained HTML code for the email body.

**HTML Requirements (CRITICAL):**

1.  **Gmail & Mobile First:**
    *   Use a table-based layout (\`<table>\`, \`<tr>\`, \`<td>\`) for maximum compatibility.
    *   All CSS MUST be inlined (\`style="..."\`).
    *   Ensure the design is responsive and looks great on mobile devices, with a main content wrapper of \`max-width: 600px;\`.

2.  **Branding & Style:**
    *   **Agency:** Bill Layne Insurance Agency Inc.
    *   **Agency Logo:** Use this URL: \`https://i.imgur.com/O25RJzu.png\` (This is our agency's logo, not a carrier logo).
    *   **Primary Color (Deep Blue):** \`#003366\`
    *   **Accent Color (Golden Yellow):** \`#FFC300\`
    *   **Font:** Use a web-safe font stack like \`'Segoe UI', Inter, Arial, sans-serif\`.
    *   **Visuals:** Use emojis strategically (e.g., 🏡, 🛡️, ⭐, 📋).

3.  **Carrier Logos (Use these Imgur URLs when referencing a specific carrier):**
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

4.  **Print Optimization & Content Structure:**
    *   Include print styles: \`<style type="text/css" media="print"> @page { margin: 1in; } .no-break { page-break-inside: avoid; } </style>\`.
    *   Structure the content logically with a Hero Section, Details, a clear Call to Action, and a branded Footer with agency contact info. For comparisons, use a two-column table.

Now, analyze the attached PDF(s) and generate the JSON output.
`;
            
            const API_KEY = process.env.API_KEY;
            if (!API_KEY) throw new Error("API key not found.");
            const ai = new GoogleGenAI({ apiKey: API_KEY });

            // FIX: Explicitly type `parts` to allow both text and inlineData objects. This resolves the TypeScript error where the array type was inferred too narrowly.
            const parts: ({ text: string; } | { inlineData: { mimeType: string; data: string; }; })[] = [{ text: (isComparison ? comparisonPrompt : stylingPrompt) + commonPromptFooter }];
            parts.push({ inlineData: { mimeType: pdfFile1.type, data: base64Data1 } });
            if (isComparison && base64Data2) {
                parts.push({ inlineData: { mimeType: pdfFile2!.type, data: base64Data2 } });
            }

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: { parts },
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
            addToast('Document processed successfully!', 'success');

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            addToast(`Processing failed: ${errorMessage}`, 'danger');
        } finally {
            setIsProcessing(false);
        }
    };
    
    const handleDownload = () => {
        if (!htmlBody) return;
        const blob = new Blob([htmlBody], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const fileName = (pdfFile1 && pdfFile2) 
            ? 'document_comparison' 
            : pdfFile1?.name.replace('.pdf', '') || 'document';
        a.download = `${fileName}.html`;
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
            addToast('Could not open print window. Please check your browser settings.', 'warning');
        }
    };

    const handleEmail = async () => {
        if (!htmlBody) return;

        // Extract content within <body> tag to prevent issues with pasting full HTML documents.
        // This is a common source of problems when pasting into rich text editors like Gmail.
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
            addToast('Styled document copied! Paste it into the Gmail window.', 'success');
        } catch (error) {
            console.error('Failed to copy styled HTML to clipboard:', error);
            // Fallback for browsers that don't support rich text copy.
            // This copies the raw HTML source code.
            try {
                await navigator.clipboard.writeText(htmlBody);
                addToast('Copied document as HTML code. Paste it into the Gmail window.', 'info');
            } catch (copyError) {
                addToast('Could not copy document automatically. Please copy manually.', 'danger');
                return; // If both copy methods fail, don't open gmail.
            }
        }
    
        // Open Gmail with the subject pre-filled. Remove empty body to keep URL clean.
        const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(emailSubject)}`;
        
        window.open(gmailUrl, '_blank');
    };

    const buttonText = !pdfFile1 && !pdfFile2 
        ? 'Select PDF(s)' 
        : pdfFile2 
            ? 'Compare PDFs with AI' 
            : 'Style PDF with AI';

    return (
        <div className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl shadow-md p-5">
            <h3 className="text-base font-bold flex items-center justify-between mb-4">
                <span>
                    <i className="fa-solid fa-file-pdf text-primary dark:text-accent mr-2"></i>
                    PDF Document Styler & Comparer
                </span>
                <span className="text-xs font-bold uppercase bg-gradient-to-r from-primary to-secondary text-white px-2 py-0.5 rounded-full">Gemini</span>
            </h3>
            
            <div className="space-y-3">
                <FileInput 
                    file={pdfFile1}
                    id="pdf-upload-1"
                    onFileChange={(e) => handleFileChange(e, 1)}
                    onClear={() => clearPdfFile(1)}
                />
                <FileInput 
                    file={pdfFile2}
                    id="pdf-upload-2"
                    onFileChange={(e) => handleFileChange(e, 2)}
                    onClear={() => clearPdfFile(2)}
                />
                <div>
                    <label className="text-xs font-semibold text-text-secondary-light dark:text-text-secondary-dark">OPTIONAL INSTRUCTIONS</label>
                    <textarea
                        value={instructions}
                        onChange={(e) => setInstructions(e.target.value)}
                        placeholder="e.g., Combine these into a single auto/home bundle quote. Highlight the multi-policy discount."
                        className="w-full h-20 p-2 mt-1 bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark rounded-md text-sm"
                    />
                </div>
                <button 
                    onClick={handleProcessRequest} 
                    disabled={isProcessing || !pdfFile1} 
                    className="w-full bg-gradient-to-r from-green-600 to-green-500 text-white font-bold py-2.5 rounded-lg shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                    {isProcessing ? <><i className="fa-solid fa-spinner fa-spin"></i> Processing...</> : <><i className="fa-solid fa-palette"></i> {buttonText}</>}
                </button>
            </div>
            
            {(isProcessing || htmlBody) && (
                <div className="mt-4 border-t border-border-light dark:border-border-dark pt-4">
                    <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
                        <h4 className="text-sm font-semibold">Styled Document Preview</h4>
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
                                <button onClick={handleClearPreview} title="Clear Preview" className="px-2 py-1.5 sm:px-3 text-xs bg-red-500 text-white rounded hover:bg-red-600 flex items-center gap-1.5">
                                    <i className="fa-solid fa-xmark"></i> <span className="hidden md:inline">Clear</span>
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="w-full h-96 bg-white dark:bg-bg-dark border border-border-light dark:border-border-dark rounded-md overflow-hidden">
                        {isProcessing ? (
                            <div className="flex flex-col items-center justify-center h-full text-text-secondary-light dark:text-text-secondary-dark">
                                <i className="fa-solid fa-spinner fa-spin text-3xl mb-4"></i>
                                <p className="font-semibold">AI is designing your document...</p>
                                <p className="text-xs mt-1">This may take a moment.</p>
                            </div>
                        ) : (
                            <iframe
                                srcDoc={htmlBody}
                                title="Processed PDF Content"
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

export default PdfParserCard;
