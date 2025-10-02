
import React, { useState } from 'react';
import Modal from './Modal';
import { generateContentStream } from '../services/geminiService';

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
    const [questionnaire, setQuestionnaire] = useState('');
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
        setQuestionnaire('');
        
        const prompt = `
You are an expert insurance agent at Bill Layne Insurance Agency. Your task is to generate a friendly and comprehensive questionnaire for a potential new client to gather the necessary information for an insurance quote.

The client is interested in the following types of insurance: ${selectedTypes.join(', ')}.

Here are some initial notes about the client:
${clientNotes || 'No initial notes provided.'}

Please create a questionnaire that is easy for a client to understand and fill out. Group questions by insurance type. For each type, ask for all the critical information needed to provide an accurate quote.

For Auto insurance, ask about all drivers (name, DOB, license #), all vehicles (year, make, model, VIN), driving history (accidents, violations in past 5 years), and current insurance carrier if any.
For Home insurance, ask about the property address, year built, construction type (brick, frame), square footage, roof age, security systems, any pets (breed), and any valuable personal property.
For Life insurance, ask about the client's date of birth, gender, height, weight, health status (including smoking history), occupation, income, and any dependents.
For Commercial insurance, ask about the business name, address, type of business, number of employees, annual revenue, and any specific risks associated with the business operations.

Start with a friendly introduction ("Hello! To help us find the best insurance coverage for your needs...") and end with a concluding remark ("Thank you for providing this information! We'll be in touch shortly with your personalized quotes."). Format the output clearly with headings and lists.
        `;

        try {
            const stream = await generateContentStream(prompt);
            setIsModalOpen(true);
            for await (const chunk of stream) {
                setQuestionnaire(prev => prev + chunk.text);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            addToast(errorMessage, 'danger');
            setIsModalOpen(false);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopy = () => {
        if (!questionnaire) {
            addToast('Nothing to copy.', 'warning');
            return;
        }
        navigator.clipboard.writeText(questionnaire);
        addToast('Questionnaire copied to clipboard!', 'success');
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
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Generated Client Questionnaire">
                {questionnaire ? (
                    <div>
                        <div className="bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark rounded-md p-4 max-h-96 overflow-y-auto mb-4">
                           <pre className="text-sm text-text-light dark:text-text-dark font-sans whitespace-pre-wrap break-words">
                                {questionnaire}
                            </pre>
                        </div>
                        <button
                            onClick={handleCopy}
                            className="w-full bg-primary text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                        >
                            <i className="fa-solid fa-copy"></i> Copy to Clipboard
                        </button>
                    </div>
                ) : (
                     <div className="flex flex-col items-center justify-center h-48 text-text-secondary-light dark:text-text-secondary-dark">
                        <i className="fa-solid fa-spinner fa-spin text-3xl mb-4"></i>
                        <p className="font-semibold">Generating your questionnaire...</p>
                        <p className="text-xs mt-1">This may take a moment.</p>
                    </div>
                )}
            </Modal>
        </>
    );
};

export default NeedsAnalysisCard;
