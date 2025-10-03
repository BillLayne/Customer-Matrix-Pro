
import React, { useState, useRef } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { PROMPT_TEMPLATES, CARRIER_CONTEXTS } from '../constants';
import { useLocalStorage } from '../hooks/useLocalStorage';
import type { CustomContext } from '../types';
import Modal from './Modal';

interface AiAssistantProps {
    addToast: (message: string, type?: 'success' | 'warning' | 'danger' | 'info') => void;
}

const AiAssistant: React.FC<AiAssistantProps> = ({ addToast }) => {
    const [prompt, setPrompt] = useState('');
    const [activeTemplate, setActiveTemplate] = useState<string | null>(null);
    const [activeContexts, setActiveContexts] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [htmlBody, setHtmlBody] = useState('');
    const [emailSubject, setEmailSubject] = useState('');
    
    const [customContexts, setCustomContexts] = useLocalStorage<CustomContext[]>('aiCustomContexts', []);
    const [activeCustomContexts, setActiveCustomContexts] = useState<string[]>([]);
    const [isContextModalOpen, setIsContextModalOpen] = useState(false);
    const [newContext, setNewContext] = useState({ name: '', text: '' });

    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (file.type !== 'application/pdf') {
                addToast('Please select a PDF file.', 'warning');
                return;
            }
            setPdfFile(file);
        }
    };

    const clearPdfFile = () => {
        setPdfFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleTemplateClick = (key: string) => {
        clearPdfFile();
        if (activeTemplate === key) {
            // Deselect if clicking the active template
            setActiveTemplate(null);
            addToast(`Template deselected. Now in custom prompt mode.`, 'info');
        } else {
            // Select the new template
            setActiveTemplate(key);
            setPrompt(''); // Clear the prompt for user input
            setHtmlBody('');
            setEmailSubject('');
            addToast(`Selected: ${PROMPT_TEMPLATES[key].title}. Paste your data below.`, 'info');
        }
    };

    const handleContextClick = (key: string) => {
        const context = CARRIER_CONTEXTS[key];
        let newPrompt = prompt;
        let newActiveContexts = [...activeContexts];

        if (activeContexts.includes(key)) {
            newPrompt = newPrompt.replace(context, '');
            newActiveContexts = newActiveContexts.filter(c => c !== key);
        } else {
            newPrompt += context;
            newActiveContexts.push(key);
        }
        setPrompt(newPrompt);
        setActiveContexts(newActiveContexts);
    };

    const handleCustomContextClick = (context: CustomContext) => {
        let newPrompt = prompt;
        let newActiveCustomContexts = [...activeCustomContexts];
        const contextTextWithHeader = `\n\nContext: ${context.name}\n${context.text}`;

        if (activeCustomContexts.includes(context.id)) {
            newPrompt = newPrompt.replace(contextTextWithHeader, '');
            newActiveCustomContexts = newActiveCustomContexts.filter(id => id !== context.id);
        } else {
            newPrompt += contextTextWithHeader;
            newActiveCustomContexts.push(context.id);
        }
        setPrompt(newPrompt);
        setActiveCustomContexts(newActiveCustomContexts);
    };

    const handleSaveContext = () => {
        if (!newContext.name.trim() || !newContext.text.trim()) {
            addToast('Context name and text are required.', 'warning');
            return;
        }
        const contextToAdd: CustomContext = {
            id: String(Date.now()),
            name: newContext.name.trim(),
            text: newContext.text.trim()
        };
        setCustomContexts(prev => [...prev, contextToAdd]);
        addToast('Custom context saved!', 'success');
        setIsContextModalOpen(false);
        setNewContext({ name: '', text: '' });
    };

    const handleRemoveContext = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        
        const contextToRemove = customContexts.find(c => c.id === id);
        if (contextToRemove && activeCustomContexts.includes(id)) {
            const contextTextWithHeader = `\n\nContext: ${contextToRemove.name}\n${contextToRemove.text}`;
            setPrompt(p => p.replace(contextTextWithHeader, ''));
            setActiveCustomContexts(ids => ids.filter(activeId => activeId !== id));
        }
        
        setCustomContexts(prev => prev.filter(c => c.id !== id));
        addToast('Context removed.', 'success');
    };

    const handleGenerate = async () => {
        if (!prompt.trim() && !pdfFile) {
            addToast('Please enter data or upload a PDF.', 'warning');
            return;
        }
        setIsLoading(true);
        setHtmlBody('');
        setEmailSubject('');
        try {
            let finalUserRequest = prompt;
            if (activeTemplate && PROMPT_TEMPLATES[activeTemplate]) {
                const templateTitle = PROMPT_TEMPLATES[activeTemplate].title;
                const templateInstructions = PROMPT_TEMPLATES[activeTemplate].prompt;
    
                finalUserRequest = `
Please perform the following task: "${templateTitle}"

Here is a general template/guide for the task:
---
${templateInstructions}
---

Use the following data provided by me to populate the template and generate the final document. You need to extract the necessary information from this data block:
---
${prompt}
---
`;
            }

            const generationPrompt = `
You are an expert insurance marketing designer and communications specialist for Bill Layne Insurance Agency. Your task is to take the user's request below and generate a beautifully designed, mobile-optimized, and Gmail-compatible HTML email. You will also generate a compelling subject line.

**User's Request:**
---
${finalUserRequest}
---

**Your Goal:** Fulfill the user's request and present the information as an engaging, professional email that is easy for a client to read and understand.

**Output:** You MUST return a single JSON object with two keys:
1. "subject": A compelling and relevant email subject line based on the user's request.
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

4.  **Print Optimization:**
    *   Include a \`<style type="text/css" media="print">\` block with rules like \`@page { margin: 1in; }\` and \`.no-break { page-break-inside: avoid; }\`.
    *   Apply the \`no-break\` class to important elements like coverage sections.

5.  **Content Structure (Adapt based on the request):**
    *   **Hero Section:** Highlight the most important information.
    *   **Detailed Sections:** Clearly labeled sections for coverages, comparisons, etc.
    *   **Trust Builders:** Include sections about our agency.
    *   **Call to Action (CTA):** A clear "Next Steps" section if applicable.
    *   **Footer:** Agency contact information and a disclaimer.

**Inspiration - Use this as your primary style guide for quotes/proposals:**
<!DOCTYPE html>
<html>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Segoe UI', Inter, Arial, sans-serif;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
            <td style="padding: 16px;">
                <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">
                    <tr><td align="center" style="padding: 20px 0;"><img src="https://i.imgur.com/O25RJzu.png" alt="Logo" width="200"></td></tr>
                    <tr><td bgcolor="#ffffff" style="padding: 32px; border-top: 8px solid #FFC300; border-radius: 8px; text-align: center;"><p style="font-size: 22px; color: #003366; font-weight: 700;">Hi [Client Name], your document is ready! 📄</p><p style="font-size: 72px; font-weight: 900; color: #FFC300; line-height: 1;">$1,072<span style="font-size: 24px;">/yr</span></p></td></tr>
                    <tr><td height="40"></td></tr>
                    <tr><td bgcolor="#003366" style="padding: 32px; border-radius: 8px; text-align: center;"><h2 style="font-size: 30px; font-weight: 700; color: #ffffff;">Ready to Proceed?</h2><table align="center"><tr><td align="center" style="border-radius: 8px; background-color: #FFC300;"><a href="mailto:bill@billlayneinsurance.com" target="_blank" style="font-size: 18px; font-weight: 700; color: #003366; text-decoration: none; padding: 14px 28px; display: inline-block;">CONTACT US</a></td></tr></table></td></tr>
                    <tr><td height="40"></td></tr>
                    <tr><td bgcolor="#1f2937" style="padding: 24px; text-align: center; color: #ffffff; border-radius: 8px;"><h3 style="font-size: 20px;">Your Agent: Bill Layne</h3><p>Bill Layne Insurance Agency Inc.</p><p style="color: #d1d5db;">1283 N Bridge Street, Elkin NC 28621</p><p style="color: #d1d5db;">Phone: (336) 835-1993 | Email: bill@billlayneinsurance.com</p></td></tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>

Now, fulfill the user's request and generate the JSON output.
`;
            
            const fileInstruction = pdfFile ? `

**Attached Document:** An insurance document (PDF) is attached. You MUST use the information from this document as the primary source to fulfill the user's request. Extract all relevant details (client name, policy numbers, dates, costs, coverage details, etc.) directly from it. If the user has also provided text input, use that text as additional context or instructions for how to handle the PDF data.` : '';

            const finalGenerationPrompt = `${generationPrompt}${fileInstruction}`;

            const API_KEY = process.env.API_KEY;
            if (!API_KEY) throw new Error("API key not found.");
            const ai = new GoogleGenAI({ apiKey: API_KEY });

            let fileData = null;
            if (pdfFile) {
                const base64 = await fileToBase64(pdfFile);
                fileData = {
                    mimeType: pdfFile.type,
                    data: base64
                };
            }

            const contents = fileData
              ? { parts: [{ text: finalGenerationPrompt }, { inlineData: fileData }] }
              : finalGenerationPrompt;


            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: contents,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            subject: { 
                                type: Type.STRING,
                                description: "A compelling email subject line based on the document content (e.g., 'Your Homeowners Quote is Ready' or 'Important Update on Your Auto Policy')." 
                            },
                            htmlBody: { 
                                type: Type.STRING,
                                description: "The complete, self-contained HTML code for the email body, styled for Gmail and mobile." 
                            }
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
            addToast('Document styled successfully!', 'success');

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            addToast(errorMessage, 'danger');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownload = () => {
        if (!htmlBody) return;
        const blob = new Blob([htmlBody], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${emailSubject.replace(/ /g, '_').replace(/[^a-z0-9_]/gi, '') || 'document'}.html`;
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
    
    const handleClearPreview = () => {
        setHtmlBody('');
        setEmailSubject('');
        setPrompt('');
        setActiveTemplate(null);
        if (pdfFile) {
            clearPdfFile();
        }
        addToast('Preview and inputs cleared.', 'info');
    };
    
    return (
        <div className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl shadow-md p-5">
            <h3 className="text-base font-bold flex items-center justify-between mb-4">
                <span>
                    <i className="fa-solid fa-robot text-primary dark:text-accent mr-2"></i>
                    Gemini AI Insurance Assistant
                </span>
                <span className="text-xs font-bold uppercase bg-gradient-to-r from-primary to-secondary text-white px-2 py-0.5 rounded-full">Pro</span>
            </h3>
            
            <div className="space-y-4">
                <div>
                    <label className="text-xs font-semibold text-text-secondary-light dark:text-text-secondary-dark">QUICK TEMPLATES</label>
                    <div className="grid grid-cols-3 gap-2 mt-1">
                        {Object.entries(PROMPT_TEMPLATES).map(([key, { title }]) => (
                            <button key={key} onClick={() => handleTemplateClick(key)} className={`px-3 py-2 rounded-md text-xs font-semibold text-left transition-colors ${activeTemplate === key ? 'bg-primary text-white' : 'bg-bg-light dark:bg-bg-dark hover:bg-primary/10 dark:hover:bg-accent/10'}`}>
                                {title}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="text-xs font-semibold text-text-secondary-light dark:text-text-secondary-dark">CARRIER CONTEXT</label>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                        {Object.entries(CARRIER_CONTEXTS).map(([key]) => (
                             <button key={key} onClick={() => handleContextClick(key)} className={`px-3 py-2 rounded-md text-xs font-semibold text-left capitalize transition-colors ${activeContexts.includes(key) ? 'bg-secondary text-white' : 'bg-bg-light dark:bg-bg-dark hover:bg-secondary/10 dark:hover:bg-accent/10'}`}>
                                {key}
                            </button>
                        ))}
                    </div>
                </div>
                
                <div>
                    <label className="text-xs font-semibold text-text-secondary-light dark:text-text-secondary-dark flex justify-between items-center">
                        <span>CUSTOM CONTEXTS</span>
                        <button 
                            onClick={() => setIsContextModalOpen(true)}
                            className="px-2 py-0.5 rounded text-xs bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark hover:bg-primary/10"
                            title="Add new context"
                        >
                            <i className="fa-solid fa-plus"></i> Add
                        </button>
                    </label>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                        {customContexts.map((context) => (
                            <button 
                                key={context.id} 
                                onClick={() => handleCustomContextClick(context)} 
                                className={`group relative px-3 py-2 rounded-md text-xs font-semibold text-left capitalize transition-colors ${activeCustomContexts.includes(context.id) ? 'bg-accent text-white' : 'bg-bg-light dark:bg-bg-dark hover:bg-accent/10'}`}
                            >
                                {context.name}
                                <span 
                                    onClick={(e) => handleRemoveContext(context.id, e)}
                                    className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[10px]"
                                    title="Remove context"
                                >
                                    <i className="fa-solid fa-times"></i>
                                </span>
                            </button>
                        ))}
                        {customContexts.length === 0 && (
                            <p className="col-span-2 text-center text-xs text-text-secondary-light dark:text-text-secondary-dark py-2">
                                No custom contexts. Click 'Add' to create one.
                            </p>
                        )}
                    </div>
                </div>

                <div>
                    <label className="text-xs font-semibold text-text-secondary-light dark:text-text-secondary-dark">ATTACH PDF (OPTIONAL)</label>
                    <div className="mt-1 bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark rounded-lg p-3">
                        <div className="flex items-center gap-2">
                            <label htmlFor="ai-pdf-upload" className="flex-1 cursor-pointer w-full bg-card-light dark:bg-card-dark border-2 border-dashed border-border-light dark:border-border-dark font-semibold py-2 px-3 rounded-lg hover:border-primary dark:hover:border-accent transition-colors flex items-center justify-center gap-2 text-sm text-text-secondary-light dark:text-text-secondary-dark">
                                <i className="fa-solid fa-upload"></i>
                                <span>{pdfFile ? 'Change PDF' : 'Select PDF'}</span>
                            </label>
                            <input id="ai-pdf-upload" type="file" accept=".pdf" onChange={handleFileChange} ref={fileInputRef} className="hidden" />
                            {pdfFile && (
                                <button onClick={clearPdfFile} title="Clear selection" className="px-3 py-2 text-red-500 rounded-lg hover:bg-red-500/10">
                                    <i className="fa-solid fa-times"></i>
                                </button>
                            )}
                        </div>
                        {pdfFile && (
                            <div className="text-xs text-text-secondary-light dark:text-text-secondary-dark mt-2 px-1 flex items-center gap-2">
                                <i className="fa-solid fa-file-invoice flex-shrink-0"></i>
                                <span className="truncate" title={pdfFile.name}>{pdfFile.name}</span>
                            </div>
                        )}
                    </div>
                </div>


                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={activeTemplate ? `Paste data for: ${PROMPT_TEMPLATES[activeTemplate].title}` : "Type your custom prompt or select a template..."}
                    className="w-full h-32 p-2 bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark rounded-md text-sm"
                />

                <button onClick={handleGenerate} disabled={isLoading} className="w-full bg-gradient-to-r from-primary to-secondary text-white font-bold py-2.5 rounded-lg shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2">
                    {isLoading ? <><i className="fa-solid fa-spinner fa-spin"></i> Generating...</> : <><i className="fa-solid fa-wand-magic-sparkles"></i> Generate with Gemini</>}
                </button>
            </div>
            
            {(isLoading || htmlBody) && (
                <div className="mt-4 border-t border-border-light dark:border-border-dark pt-4">
                    <div className="flex justify-between items-center mb-2">
                        <h4 className="text-sm font-semibold">Generated Document Preview</h4>
                        {htmlBody && !isLoading && (
                            <div className="flex items-center gap-2">
                                <button onClick={handleDownload} title="Download HTML" className="px-3 py-1.5 text-xs bg-card-light dark:bg-card-dark rounded border border-border-light dark:border-border-dark hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center gap-1.5">
                                   <i className="fa-solid fa-download"></i> <span className="hidden sm:inline">Download</span>
                                </button>
                                <button onClick={handlePrint} title="Print" className="px-3 py-1.5 text-xs bg-card-light dark:bg-card-dark rounded border border-border-light dark:border-border-dark hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center gap-1.5">
                                   <i className="fa-solid fa-print"></i> <span className="hidden sm:inline">Print</span>
                                </button>
                                <button onClick={handleEmail} title="Email" className="px-3 py-1.5 text-xs bg-card-light dark:bg-card-dark rounded border border-border-light dark:border-border-dark hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center gap-1.5">
                                   <i className="fa-solid fa-envelope"></i> <span className="hidden sm:inline">Email</span>
                                </button>
                                <button onClick={handleClearPreview} title="Clear Preview" className="px-3 py-1.5 text-xs bg-red-500 text-white rounded hover:bg-red-600 flex items-center gap-1.5">
                                    <i className="fa-solid fa-xmark"></i> <span className="hidden sm:inline">Clear</span>
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="w-full h-96 bg-white dark:bg-bg-dark border border-border-light dark:border-border-dark rounded-md overflow-hidden">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center h-full text-text-secondary-light dark:text-text-secondary-dark">
                                <i className="fa-solid fa-spinner fa-spin text-3xl mb-4"></i>
                                <p className="font-semibold">AI is designing your document...</p>
                                <p className="text-xs mt-1">This may take a moment.</p>
                            </div>
                        ) : (
                            <iframe
                                srcDoc={htmlBody}
                                title="Generated AI Content"
                                className="w-full h-full border-0"
                                sandbox="allow-same-origin"
                            />
                        )}
                    </div>
                </div>
            )}

            <Modal isOpen={isContextModalOpen} onClose={() => setIsContextModalOpen(false)} title="Add Custom Context">
                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-medium">Context Name</label>
                        <input 
                            type="text" 
                            value={newContext.name} 
                            onChange={e => setNewContext({...newContext, name: e.target.value})} 
                            placeholder="e.g., Young Family Persona"
                            className="w-full mt-1 p-2 bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark rounded-md"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium">Context Text</label>
                        <textarea 
                            value={newContext.text} 
                            onChange={e => setNewContext({...newContext, text: e.target.value})} 
                            placeholder="e.g., Customer is a young family with two children..."
                            className="w-full mt-1 p-2 h-24 bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark rounded-md"
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button onClick={() => setIsContextModalOpen(false)} className="px-4 py-2 rounded-md border border-border-light dark:border-border-dark font-semibold">Cancel</button>
                        <button onClick={handleSaveContext} className="px-4 py-2 rounded-md bg-primary text-white font-semibold">Save Context</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default AiAssistant;
