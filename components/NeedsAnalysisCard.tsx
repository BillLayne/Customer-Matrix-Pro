import React, { useState } from 'react';
import Modal from './Modal';
import { GoogleGenAI, Type } from "@google/genai";

interface NeedsAnalysisCardProps {
    addToast: (message: string, type?: 'success' | 'warning' | 'danger' | 'info') => void;
}

const insuranceTypes = [
    { id: 'auto', name: 'Auto', icon: 'fa-car' },
    { id: 'home', name: 'Home', icon: 'fa-home' },
    { id: 'life', name: 'Life', icon: 'fa-heart-pulse' },
    { id: 'commercial', name: 'Commercial', icon: 'fa-briefcase' },
];

const NeedsAnalysisCard: React.FC<NeedsAnalysisCardProps> = ({ addToast }) => {
    const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
    const [clientNotes, setClientNotes] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [analysisHtml, setAnalysisHtml] = useState('');
    const [analysisSubject, setAnalysisSubject] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);

    const toggleType = (id: string) => {
        setSelectedTypes(prev =>
            prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
        );
    };

    const handleGenerate = async () => {
        if (selectedTypes.length === 0) {
            addToast('Please select at least one insurance type.', 'warning');
            return;
        }
        setIsLoading(true);
        setAnalysisHtml('');
        setAnalysisSubject('');
        setIsModalOpen(true);
        
        const prompt = `
You are an expert insurance agent at Bill Layne Insurance Agency. Your task is to generate a friendly, engaging, and comprehensive questionnaire for a potential new client. The output MUST be a beautifully designed, mobile-optimized, and Gmail-compatible HTML email.

The client is interested in the following types of insurance: ${selectedTypes.join(', ')}.

Here are some initial notes about the client:
---
${clientNotes || 'No initial notes provided.'}
---

**Your Goal:**
Create a questionnaire that is welcoming and easy for a client to complete. It should gather all the critical information needed to provide an accurate quote.

**Content & Tone Requirements:**
*   **Engaging Language:** Use a friendly, conversational tone. Use emojis strategically to break up text and make the form feel less intimidating (e.g., 🚗 for Auto, 🏠 for Home, ❤️ for Life, 🏢 for Commercial).
*   **Clear Sections:** Group questions by insurance type with clear, friendly headings.
*   **Comprehensive Questions:**
    *   **Auto 🚗:** Ask for all drivers (name, DOB, license #), all vehicles (year, make, model, VIN), driving history (accidents/violations in past 5 years), and current insurance.
    *   **Home 🏠:** Ask about property address, year built, construction, square footage, roof age, security systems, pets (especially dog breeds), and any valuable personal property.
    *   **Life ❤️:** Ask about DOB, gender, height/weight, health status (including smoking), occupation, income, and dependents.
    *   **Commercial 🏢:** Ask about business name, address, type, number of employees, annual revenue, and specific risks.
*   **Introduction & Conclusion:** Start with a warm welcome and end with a "Thank you" and "Next Steps" section.

**Output:** You MUST return a single JSON object with two keys:
1. "subject": A friendly and clear email subject line (e.g., "A Few Quick Questions for Your Insurance Quote!").
2. "htmlBody": The full, self-contained HTML code for the email body.

**HTML Requirements (CRITICAL):**
*   Follow all branding and technical guidelines (table-based layout, inline CSS, responsive design, primary color #003366, accent color #FFC300).
*   **Agency Logos:**
    *   **For light backgrounds:** \`https://i.imgur.com/O25RJzu.png\`
    *   **For dark backgrounds:** \`https://i.imgur.com/qoWnvrv.png\` (white text version)
*   Include the appropriate agency logo at the top, depending on your header design's background color.
*   Include the full agency contact information in the footer: Bill Layne Insurance Agency, 1283 N Bridge ST, Elkin NC 28621, Phone: 336-835-1993, Email: save@billlayneinsurance.com, Website: BillLayneInsurance.com.
*   Make input fields visually clear, even though they won't be functional in an email. Use styled divs or tables to look like a form.

Now, create the questionnaire based on the client's needs and generate the JSON output.
        `;

        try {
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
        
            setAnalysisHtml(parsedResult.htmlBody);
            setAnalysisSubject(parsedResult.subject);
            addToast('Questionnaire generated successfully!', 'success');

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            addToast(`Generation failed: ${errorMessage}`, 'danger');
            setIsModalOpen(false);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleCopy = async () => {
        if (!analysisHtml) {
            addToast('Nothing to copy.', 'warning');
            return;
        }
        try {
            let contentToCopy = analysisHtml;
            const bodyContentMatch = analysisHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i);
            if (bodyContentMatch && bodyContentMatch[1]) {
                contentToCopy = bodyContentMatch[1];
            }
            const blob = new Blob([contentToCopy], { type: 'text/html' });
            // @ts-ignore
            const clipboardItem = new ClipboardItem({ 'text/html': blob });
            // @ts-ignore
            await navigator.clipboard.write([clipboardItem]);
            addToast('Questionnaire copied to clipboard!', 'success');
        } catch (error) {
            addToast('Could not copy automatically.', 'danger');
        }
    };
    
    const handlePrint = () => {
        if (!analysisHtml) return;
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(analysisHtml);
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();
        } else {
            addToast('Could not open print window.', 'warning');
        }
    };

    const handleEmail = async () => {
        if (!analysisHtml) return;
        await handleCopy();
        const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(analysisSubject)}`;
        window.open(gmailUrl, '_blank');
    };

    return (
        <>
            <div className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl shadow-md p-5">
                <h3 className="text-base font-bold flex items-center justify-between mb-4">
                    <span>
                        <i className="fa-solid fa-clipboard-question text-primary dark:text-accent mr-2"></i>
                        Client Needs Analysis
                    </span>
                    <span className="text-xs font-bold uppercase bg-gradient-to-r from-primary to-secondary text-white px-2 py-0.5 rounded-full">AI Tool</span>
                </h3>
                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-semibold text-text-secondary-light dark:text-text-secondary-dark">1. SELECT INSURANCE TYPE(S)</label>
                        <div className="grid grid-cols-2 gap-2 mt-1">
                            {insuranceTypes.map(type => (
                                <button
                                    key={type.id}
                                    onClick={() => toggleType(type.id)}
                                    className={`px-3 py-2.5 rounded-md text-sm font-semibold text-left transition-colors flex items-center gap-2 ${
                                        selectedTypes.includes(type.id)
                                            ? 'bg-primary text-white'
                                            : 'bg-bg-light dark:bg-bg-dark hover:bg-primary/10 dark:hover:bg-accent/10'
                                    }`}
                                >
                                    <i className={`fa-solid ${type.icon}`}></i>
                                    {type.name}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-text-secondary-light dark:text-text-secondary-dark">2. ADD OPTIONAL NOTES</label>
                        <textarea
                            value={clientNotes}
                            onChange={(e) => setClientNotes(e.target.value)}
                            placeholder="e.g., New homeowner, two cars, needs full coverage..."
                            className="w-full h-20 p-2 mt-1 bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark rounded-md text-sm"
                        />
                    </div>
                    <button
                        onClick={handleGenerate}
                        disabled={isLoading}
                        className="w-full bg-gradient-to-r from-primary to-secondary text-white font-bold py-2.5 rounded-lg shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <><i className="fa-solid fa-spinner fa-spin"></i> Generating...</>
                        ) : (
                            <><i className="fa-solid fa-wand-magic-sparkles"></i> Generate Questionnaire</>
                        )}
                    </button>
                </div>
            </div>
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={analysisSubject || "Generated Client Questionnaire"}>
                {isLoading && !analysisHtml ? (
                     <div className="flex flex-col items-center justify-center h-96 text-text-secondary-light dark:text-text-secondary-dark">
                        <i className="fa-solid fa-spinner fa-spin text-3xl mb-4"></i>
                        <p className="font-semibold">Generating your questionnaire...</p>
                        <p className="text-xs mt-1">This may take a moment.</p>
                    </div>
                ) : (
                    <div>
                        <div className="w-full h-96 bg-white dark:bg-bg-dark border border-border-light dark:border-border-dark rounded-md overflow-hidden mb-4">
                            <iframe
                                srcDoc={analysisHtml}
                                title="Generated Client Questionnaire"
                                className="w-full h-full border-0"
                                sandbox="allow-same-origin"
                            />
                        </div>
                        <div className="flex items-center justify-end gap-2">
                             <button onClick={handleCopy} title="Copy HTML" className="px-3 py-1.5 text-xs bg-card-light dark:bg-card-dark rounded border border-border-light dark:border-border-dark hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center gap-1.5">
                               <i className="fa-solid fa-copy"></i> <span className="hidden sm:inline">Copy</span>
                            </button>
                            <button onClick={handlePrint} title="Print" className="px-3 py-1.5 text-xs bg-card-light dark:bg-card-dark rounded border border-border-light dark:border-border-dark hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center gap-1.5">
                               <i className="fa-solid fa-print"></i> <span className="hidden sm:inline">Print</span>
                            </button>
                            <button onClick={handleEmail} title="Email" className="px-3 py-1.5 text-xs bg-card-light dark:bg-card-dark rounded border border-border-light dark:border-border-dark hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center gap-1.5">
                               <i className="fa-solid fa-envelope"></i> <span className="hidden sm:inline">Email</span>
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </>
    );
};

export default NeedsAnalysisCard;