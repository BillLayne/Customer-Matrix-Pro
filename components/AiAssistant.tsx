
import React, { useState, useRef, useEffect } from 'react';
import { 
    CARRIER_LOGOS, 
    CARRIER_UI_COLORS,
    PROMPT_TEMPLATES, 
} from '../constants';
import {
    canonicalCarrierLogoFor,
    downloadAsHtmlFile,
    handOffToGmail,
    normalizeGeneratedEmailHtml,
    printHtml,
    validateGmailHtml,
    type ValidationResult,
} from '../services/emailEngine';
import {
    extractPoiEmailData,
    generateEmailTemplate,
    refineEmailTemplate,
} from '../services/geminiService';
import { generatePoiEmail, type PoiData } from '../services/poiTemplate';

interface AiAssistantProps {
    addToast: (message: string, type?: 'success' | 'warning' | 'danger' | 'info') => void;
    layoutMode?: 'split' | 'search' | 'gmail';
}

interface FileData {
    base64: string;
    mimeType: string;
    name: string;
}

const getErrorMessage = (error: unknown) => {
    if (error instanceof Error && error.message) return error.message;
    if (typeof error === 'string') return error;
    return 'Unknown Gemini error';
};

const isMissingValue = (value?: string) => {
    if (!value) return true;
    const normalized = value.trim().toLowerCase();
    return !normalized || normalized === '[missing]' || normalized === 'missing' || normalized === 'n/a' || normalized === 'unknown';
};

const resolveCarrierLogo = (carrierName?: string, extractedLogoUrl?: string, selectedCarrier?: string) => {
    const carrierAliases: Record<string, string> = {
        'nc grange': 'NC Grange Mutual',
        'alamance': 'Alamance Farmers',
    };

    if (!isMissingValue(extractedLogoUrl)) {
        return extractedLogoUrl!.trim();
    }

    const exactCarrierMatch = carrierName && CARRIER_LOGOS[carrierName];
    if (exactCarrierMatch) {
        return exactCarrierMatch;
    }

    const normalizedCarrier = carrierName?.trim().toLowerCase();
    if (normalizedCarrier) {
        const aliasMatch = carrierAliases[normalizedCarrier];
        if (aliasMatch && CARRIER_LOGOS[aliasMatch]) {
            return CARRIER_LOGOS[aliasMatch];
        }

        const fuzzyCarrierMatch = Object.entries(CARRIER_LOGOS).find(([name]) => name.toLowerCase() === normalizedCarrier);
        if (fuzzyCarrierMatch) {
            return fuzzyCarrierMatch[1];
        }
    }

    if (selectedCarrier && CARRIER_LOGOS[selectedCarrier]) {
        return CARRIER_LOGOS[selectedCarrier];
    }

    return '';
};

const inferCarrierNameFromText = (...sources: Array<string | undefined>) => {
    const carrierAliases: Array<[string, string]> = [
        ['nc grange', 'NC Grange Mutual'],
        ['nc grange mutual', 'NC Grange Mutual'],
        ['alamance farmers', 'Alamance Farmers'],
        ['alamance', 'Alamance Farmers'],
        ['national general', 'National General'],
        ['nationwide', 'Nationwide'],
        ['progressive', 'Progressive'],
        ['travelers', 'Travelers'],
        ['hagerty', 'Hagerty'],
        ['dairyland', 'Dairyland'],
        ['ncjua', 'NCJUA'],
        ['foremost', 'Foremost'],
    ];

    const haystack = sources
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

    if (!haystack) return '';

    for (const [needle, carrierName] of carrierAliases) {
        if (haystack.includes(needle)) {
            return carrierName;
        }
    }

    return '';
};

const AiAssistant: React.FC<AiAssistantProps> = ({ addToast, layoutMode = 'split' }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [isOverlayOpen, setIsOverlayOpen] = useState(false);
    const [isRefining, setIsRefining, ] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsOverlayOpen(false);
            }
        };
        if (isOverlayOpen) {
            window.addEventListener('keydown', handleKeyDown);
        }
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOverlayOpen]);

    const [previewHtml, setPreviewHtml] = useState<string | null>(null);
    const [innerAiHtml, setInnerAiHtml] = useState<string>(''); // Stores raw AI content before wrapping
    const [generatedSubject, setGeneratedSubject] = useState<string>(''); // Stores AI generated subject
    const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
    const [activeCarrierName, setActiveCarrierName] = useState<string>('');
    const [activeCarrierLogoUrl, setActiveCarrierLogoUrl] = useState<string>('');
    const [attachedFile, setAttachedFile] = useState<FileData | null>(null);
    const [selectedCarrier, setSelectedCarrier] = useState<string>("");
    
    // Custom Branding State
    const [customBrandName, setCustomBrandName] = useState('');
    const [customLogoUrl, setCustomLogoUrl] = useState('');
    
    const [promptDraft, setPromptDraft] = useState('');
    const [templateSearch, setTemplateSearch] = useState('');
    const [previewDevice, setPreviewDevice] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
    const [recipientEmail, setRecipientEmail] = useState('');
    const [refinementInstruction, setRefinementInstruction] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const CARRIER_COLORS: Record<string, string> = {
        'Nationwide': '#005596',
        'National General': '#002D72',
        'Progressive': '#00A1E0',
        'Foremost': '#F58220',
        'Alamance Farmers': '#4CAF50',
        'NC Grange Mutual': '#2E7D32',
        'Travelers': '#E31B23',
        'Hagerty': '#E31837',
        'NCJUA': '#003366',
        'Dairyland': '#005596'
    };

    const buildStudioContext = () => {
        const context: string[] = [];
        const finalCarrierName = customBrandName.trim() || selectedCarrier;

        if (finalCarrierName) {
            context.push(`Preferred carrier or brand: ${finalCarrierName}.`);
        }

        if (!customLogoUrl.trim() && selectedCarrier) {
            context.push(`Use this carrier logo when appropriate: ${CARRIER_LOGOS[selectedCarrier]}.`);
        }

        if (customLogoUrl.trim()) {
            context.push(`Custom visual URL to use when appropriate: ${customLogoUrl.trim()}.`);
        }

        return context.join('\n\n');
    };

    const reportValidation = (validation: ValidationResult, successMessage: string) => {
        setValidationResult(validation);

        if (!validation.passed) {
            addToast(`Generated with ${validation.errorCount} error(s). Check console.`, 'danger');
            console.warn('[emailEngine] validation issues:', validation.issues);
            return;
        }

        if (validation.warningCount > 0) {
            addToast(`Generated with ${validation.warningCount} warning(s). Check console.`, 'warning');
            console.warn('[emailEngine] validation warnings:', validation.issues);
            return;
        }

        addToast(successMessage, 'success');
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const base64 = (ev.target?.result as string).split(",")[1];
            setAttachedFile({ base64, mimeType: file.type, name: file.name });
            addToast(`File ${file.name} staged for analysis.`, 'info');
        };
        reader.readAsDataURL(file);
    };

    const handleGenerate = async () => {
        if (!promptDraft.trim() && !attachedFile) {
            addToast('Please enter instructions or attach a file.', 'warning');
            return;
        }

        setIsOverlayOpen(true);
        setIsLoading(true);
        setPreviewHtml(null);
        setGeneratedSubject('');
        setValidationResult(null);

        try {
            const isPoi = promptDraft.toLowerCase().includes('proof of insurance') || promptDraft.toLowerCase().includes('verification of insurance');
            const fileData = attachedFile
                ? { mimeType: attachedFile.mimeType, data: attachedFile.base64 }
                : undefined;
            let finalHtml = '';
            let subject = '';
            let resolvedCarrierName = '';
            let resolvedCarrierLogoUrl = '';

            if (isPoi) {
                const parsed = await extractPoiEmailData({
                    instructions: promptDraft,
                    file: fileData,
                });

                parsed.CARRIER_LOGO_URL = resolveCarrierLogo(
                    parsed.CARRIER,
                    parsed.CARRIER_LOGO_URL,
                    selectedCarrier,
                );
                resolvedCarrierName = parsed.CARRIER || selectedCarrier || inferCarrierNameFromText(promptDraft);
                // Canonical lookup wins over whatever Gemini extracted — guarantees the
                // engine receives the known-good Imgur URL for any recognized carrier.
                resolvedCarrierLogoUrl =
                    canonicalCarrierLogoFor(resolvedCarrierName) ||
                    parsed.CARRIER_LOGO_URL ||
                    resolveCarrierLogo(resolvedCarrierName, customLogoUrl.trim(), selectedCarrier);
                
                const poiData: PoiData = {
                    INSURED_NAME: parsed.INSURED_NAME || '[Missing]',
                    FIRST_NAME: parsed.FIRST_NAME || parsed.INSURED_NAME?.trim().split(/\s+/)[0] || 'there',
                    POLICY_NUMBER: parsed.POLICY_NUMBER || '[Missing]',
                    EFFECTIVE_DATE_LONG: parsed.EFFECTIVE_DATE_LONG || parsed.EFFECTIVE_SHORT || '[Missing]',
                    EXPIRY_DATE_LONG: parsed.EXPIRY_DATE_LONG || parsed.EXPIRY_SHORT || '[Missing]',
                    EFFECTIVE_SHORT: parsed.EFFECTIVE_SHORT || '[Missing]',
                    EXPIRY_SHORT: parsed.EXPIRY_SHORT || '[Missing]',
                    YEAR: parsed.YEAR || String(new Date().getFullYear()),
                    CARRIER: resolvedCarrierName || 'Your Carrier',
                    CARRIER_LOGO_URL: resolvedCarrierLogoUrl || '',
                    ISSUING_COMPANY_NAME: parsed.ISSUING_COMPANY_NAME || parsed.CARRIER || selectedCarrier || 'Your Carrier',
                    CARRIER_BADGE_TEXT: parsed.CARRIER_BADGE_TEXT || 'Proof Available',
                    VEHICLE_YEAR: parsed.VEHICLE_YEAR || '[Missing]',
                    VEHICLE_MAKE: parsed.VEHICLE_MAKE || '[Missing]',
                    VEHICLE_MODEL: parsed.VEHICLE_MODEL || '[Missing]',
                    VIN: parsed.VIN || '[Missing]',
                    COVERAGES: parsed.COVERAGES || [],
                };

                subject = parsed.subject || "Your Proof of Insurance";
                finalHtml = generatePoiEmail(poiData);
            } else {
                const activeTemplate = Object.values(PROMPT_TEMPLATES).find((template) => template.prompt === promptDraft);
                const result = await generateEmailTemplate({
                    templateTitle: activeTemplate?.title,
                    templateInstructions: activeTemplate?.prompt,
                    userData: promptDraft || "Summarize the attached document and provide a clear overview of coverage.",
                    file: fileData,
                    supplementalInstructions: buildStudioContext() || undefined,
                });

                subject = result.subject || "Insurance Update - Bill Layne Agency";
                resolvedCarrierName = selectedCarrier || inferCarrierNameFromText(promptDraft, result.subject, result.htmlBody, activeTemplate?.title);
                resolvedCarrierLogoUrl =
                    canonicalCarrierLogoFor(resolvedCarrierName) ||
                    resolveCarrierLogo(
                        resolvedCarrierName,
                        customLogoUrl.trim(),
                        selectedCarrier,
                    );
                finalHtml = normalizeGeneratedEmailHtml(result.htmlBody || '', {
                    preheader: result.preheader || '',
                    carrierName: resolvedCarrierName,
                    carrierLogoUrl: resolvedCarrierLogoUrl,
                });
            }

            if (isPoi) {
                finalHtml = normalizeGeneratedEmailHtml(finalHtml, {
                    carrierName: resolvedCarrierName,
                    carrierLogoUrl: resolvedCarrierLogoUrl,
                });
            }

            setInnerAiHtml(finalHtml);
            setGeneratedSubject(subject);
            setPreviewHtml(finalHtml);
            setActiveCarrierName(resolvedCarrierName);
            setActiveCarrierLogoUrl(resolvedCarrierLogoUrl);
            reportValidation(validateGmailHtml(finalHtml), 'Bulletproof Email Engineered!');

        } catch (error) {
            console.error(error);
            addToast(`Generation failed: ${getErrorMessage(error)}`, 'danger');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRefine = async () => {
        if (!refinementInstruction.trim() || !previewHtml) return;
        
        setIsRefining(true);
        try {
            const refined = await refineEmailTemplate({
                existingHtml: previewHtml,
                instruction: refinementInstruction,
                currentSubject: generatedSubject,
            });

            const refinedHtml = refined.htmlBody || '';
            const refinedSubject = refined.subject || generatedSubject;
            const refinedCarrierName = activeCarrierName || selectedCarrier || inferCarrierNameFromText(refinedSubject, refinedHtml, promptDraft);
            const refinedCarrierLogoUrl =
                activeCarrierLogoUrl ||
                canonicalCarrierLogoFor(refinedCarrierName) ||
                resolveCarrierLogo(refinedCarrierName, customLogoUrl.trim(), selectedCarrier);
            const normalizedHtml = normalizeGeneratedEmailHtml(refinedHtml, {
                preheader: refined.preheader || '',
                carrierName: refinedCarrierName,
                carrierLogoUrl: refinedCarrierLogoUrl,
            });

            setInnerAiHtml(normalizedHtml);
            setGeneratedSubject(refinedSubject);
            setPreviewHtml(normalizedHtml);
            setActiveCarrierName(refinedCarrierName);
            setActiveCarrierLogoUrl(refinedCarrierLogoUrl);
            setRefinementInstruction('');
            reportValidation(validateGmailHtml(normalizedHtml), 'Email refined successfully!');
        } catch (error) {
            console.error(error);
            addToast(`Refinement failed: ${getErrorMessage(error)}`, 'danger');
        } finally {
            setIsRefining(false);
        }
    };

    const handleDownloadHtml = () => {
        if (!previewHtml) return;
        downloadAsHtmlFile(normalizeGeneratedEmailHtml(previewHtml, {
            carrierName: activeCarrierName,
            carrierLogoUrl: activeCarrierLogoUrl,
        }), generatedSubject || 'email_template');
        addToast('Template downloaded.', 'success');
    };

    const handleSyncToGmail = async () => {
        if (!previewHtml) return;
        const normalizedHtml = normalizeGeneratedEmailHtml(previewHtml, {
            carrierName: activeCarrierName,
            carrierLogoUrl: activeCarrierLogoUrl,
        });
        const result = await handOffToGmail({
            subject: generatedSubject || "Insurance Update - Bill Layne Agency",
            htmlBody: normalizedHtml,
            to: recipientEmail.trim() || undefined,
        });

        setPreviewHtml(normalizedHtml);
        setValidationResult(result.validation);

        if (result.validation.errorCount > 0 || result.validation.warningCount > 0) {
            console.warn('[emailEngine] Gmail handoff validation:', result.validation.issues);
        }

        if (!result.copied) {
            addToast('Could not copy document to clipboard. Please copy manually.', 'danger');
            return;
        }

        if (result.opened) {
            addToast('Styled document copied. Paste into the Gmail compose window.', 'success');
            return;
        }

        addToast('Copied, but the Gmail popup was blocked. Please allow popups for this page.', 'warning');
    };

    const handleClear = () => {
        setPreviewHtml(null);
        setInnerAiHtml('');
        setGeneratedSubject('');
        setValidationResult(null);
        setActiveCarrierName('');
        setActiveCarrierLogoUrl('');
        setPromptDraft('');
        setAttachedFile(null);
        setSelectedCarrier('');
        setCustomBrandName('');
        setCustomLogoUrl('');
        setRecipientEmail('');
        setRefinementInstruction('');
        if (fileInputRef.current) fileInputRef.current.value = '';
        addToast('Studio cleared.', 'info');
    };

    const renderOverlay = () => {
        if (!isOverlayOpen) return null;

        return (
            <div 
                className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 md:p-6 animate-fade-in"
                onClick={() => setIsOverlayOpen(false)}
            >
                <div 
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-7xl flex flex-col overflow-hidden max-h-[90vh] animate-slide-up"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Modal Header */}
                    <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 shrink-0">
                        <div>
                            <h3 className="font-outfit text-base md:text-lg font-black tracking-tight text-slate-900 dark:text-white uppercase flex items-center gap-2">
                                <i className="fa-solid fa-envelope-open-text text-primary dark:text-cyan-400"></i>
                                Engineered Email Workspace
                            </h3>
                            {generatedSubject && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-bold">
                                    Subject: <span className="text-primary dark:text-cyan-300 font-medium">{generatedSubject}</span>
                                </p>
                            )}
                        </div>
                        <div className="flex items-center gap-3">
                            <button 
                                onClick={() => setIsOverlayOpen(false)}
                                className="h-10 w-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-350 hover:scale-105 active:scale-95 transition-all flex items-center justify-center shadow-sm"
                                title="Close Overlay (Esc)"
                            >
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>
                    </div>

                    {/* Modal Body */}
                    <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-500 animate-fade-in">
                                <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-6"></div>
                                <h4 className="font-outfit text-base font-black uppercase text-slate-700 dark:text-slate-300 tracking-wider">Engineering Luxury Template...</h4>
                                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Applying E&O protection guidelines and styling systems.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                                {/* Left Side: Preview Pane */}
                                <div className="lg:col-span-7 flex flex-col items-center w-full">
                                    {/* Device Toggle Selector */}
                                    <div className="flex gap-1 mb-4 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => setPreviewDevice('mobile')}
                                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${previewDevice === 'mobile' ? 'bg-white dark:bg-slate-900 text-primary' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}
                                        >
                                            <i className="fa-solid fa-mobile-screen-button text-xs"></i> Mobile
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setPreviewDevice('tablet')}
                                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${previewDevice === 'tablet' ? 'bg-white dark:bg-slate-900 text-primary' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}
                                        >
                                            <i className="fa-solid fa-tablet-screen-button text-xs"></i> Tablet
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setPreviewDevice('desktop')}
                                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${previewDevice === 'desktop' ? 'bg-white dark:bg-slate-900 text-primary' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}
                                        >
                                            <i className="fa-solid fa-laptop text-xs"></i> Desktop
                                        </button>
                                    </div>

                                    {/* Preview iFrame */}
                                    <div 
                                        className="bg-white shadow-lg overflow-hidden rounded-xl border border-slate-100 transition-all duration-300 w-full relative"
                                        style={{
                                            height: '560px',
                                            width: previewDevice === 'mobile' ? '360px' : previewDevice === 'tablet' ? '480px' : '100%',
                                            maxWidth: '100%'
                                        }}
                                    >
                                        <iframe
                                            srcDoc={previewHtml || ''}
                                            title="Engineering Preview"
                                            className="w-full h-full border-0"
                                            sandbox="allow-same-origin"
                                        />
                                    </div>
                                </div>

                                {/* Right Side: Actions and Controls */}
                                <div className="lg:col-span-5 space-y-5">
                                    {/* Action Deck */}
                                    <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 space-y-3">
                                        <h5 className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                                            Actions
                                        </h5>
                                        <div className="grid grid-cols-1 gap-3">
                                            <button 
                                                onClick={handleSyncToGmail}
                                                className="w-full bg-button-gradient text-white font-black py-4 rounded-2xl shadow-button-glow hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 text-sm uppercase tracking-[2px] group"
                                            >
                                                <i className="fa-brands fa-google text-lg text-white group-hover:scale-110 transition-transform"></i>
                                                Sync to Gmail
                                            </button>
                                            <div className="grid grid-cols-2 gap-3">
                                                <button 
                                                    onClick={handleDownloadHtml} 
                                                    className="px-4 py-3 rounded-2xl bg-white hover:bg-slate-50 text-slate-600 text-[10px] font-black uppercase tracking-[2px] transition-all flex items-center justify-center gap-2 border border-slate-200 shadow-sm dark:bg-slate-950 dark:border-slate-800 dark:text-slate-350"
                                                    title="Download HTML File"
                                                >
                                                    <i className="fa-solid fa-download"></i> Save HTML
                                                </button>
                                                <button 
                                                    onClick={() => {
                                                        handleClear();
                                                        setIsOverlayOpen(false);
                                                    }} 
                                                    className="px-4 py-3 rounded-2xl bg-red-500/10 text-red-500 text-[10px] font-black uppercase tracking-[2px] hover:bg-red-500/20 transition-all border border-red-500/20"
                                                >
                                                    Clear Workspace
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* AI Refinement Deck */}
                                    {previewHtml && (
                                        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 space-y-3">
                                            <h5 className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                                                Refine with AI
                                            </h5>
                                            <div className="flex gap-2 bg-white dark:bg-slate-950 rounded-2xl p-1.5 items-center border border-slate-255 dark:border-slate-800 shadow-sm">
                                                <div className="relative flex-1">
                                                    <i className="fa-solid fa-wand-magic-sparkles absolute left-4 top-1/2 -translate-y-1/2 text-primary/50 dark:text-cyan-400/50"></i>
                                                    <input 
                                                        type="text"
                                                        value={refinementInstruction}
                                                        onChange={(e) => setRefinementInstruction(e.target.value)}
                                                        onKeyDown={(e) => e.key === 'Enter' && handleRefine()}
                                                        placeholder="Edit: 'Make tone urgent'..."
                                                        className="w-full p-2 pl-11 bg-transparent border-none text-xs font-semibold outline-none placeholder:text-slate-400 text-slate-800 dark:text-slate-200"
                                                    />
                                                </div>
                                                <button 
                                                    onClick={handleRefine}
                                                    disabled={isRefining || !refinementInstruction.trim()}
                                                    className="px-4 py-2 bg-button-gradient text-white text-[9px] font-black uppercase tracking-[2px] rounded-xl hover:scale-105 transition-all disabled:opacity-50 shadow-button-glow shrink-0"
                                                >
                                                    {isRefining ? <i className="fa-solid fa-circle-notch fa-spin"></i> : 'Apply'}
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Validation Deck */}
                                    {validationResult && (
                                        <div
                                            className="p-4 rounded-xl border"
                                            style={{
                                                background: validationResult.passed
                                                    ? (validationResult.warningCount > 0 ? '#fff7ed' : '#f0fdf4')
                                                    : '#fef2f2',
                                                borderColor: validationResult.passed
                                                    ? (validationResult.warningCount > 0 ? '#fdba74' : '#86efac')
                                                    : '#fca5a5'
                                            }}
                                        >
                                            <div className="flex flex-col gap-3">
                                                <div>
                                                    <h5
                                                        className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em]"
                                                        style={{
                                                            color: validationResult.passed
                                                                ? (validationResult.warningCount > 0 ? '#c2410c' : '#166534')
                                                                : '#b91c1c'
                                                        }}
                                                    >
                                                        <i
                                                            className={`fa-solid ${
                                                                validationResult.passed
                                                                    ? (validationResult.warningCount > 0 ? 'fa-triangle-exclamation' : 'fa-circle-check')
                                                                    : 'fa-circle-xmark'
                                                            }`}
                                                        ></i>
                                                        Email Safety Check
                                                    </h5>
                                                    <p className="mt-1.5 text-xs font-semibold text-slate-850 leading-normal">
                                                        {validationResult.passed
                                                            ? (validationResult.warningCount > 0
                                                                ? 'Usable, but has minor warnings.'
                                                                : '100% spam-safe & mobile friendly.')
                                                            : 'Has issues to fix before sending.'}
                                                    </p>
                                                </div>
                                                <div className="flex gap-2 text-[9px] font-black uppercase tracking-[0.18em]">
                                                    <span className="rounded-full px-2 py-0.5 bg-white text-slate-800 border border-slate-200">
                                                        {validationResult.errorCount} errors
                                                    </span>
                                                    <span className="rounded-full px-2 py-0.5 bg-white text-slate-800 border border-slate-200">
                                                        {validationResult.warningCount} warnings
                                                    </span>
                                                </div>
                                            </div>

                                            {validationResult.issues.length > 0 && (
                                                <div className="mt-3 max-h-[160px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                                                    {validationResult.issues.map((issue, index) => (
                                                        <div
                                                            key={`${issue.rule}-${index}`}
                                                            className="rounded-lg bg-white/90 p-2.5 border border-slate-200/50 text-[11px] leading-relaxed text-slate-700"
                                                        >
                                                            <span
                                                                className="text-[9px] font-black uppercase tracking-wider block mb-0.5"
                                                                style={{
                                                                    color: issue.severity === 'error' ? '#b91c1c' : '#c2410c'
                                                                }}
                                                            >
                                                                {issue.severity} · {issue.rule}
                                                            </span>
                                                            {issue.message}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };;

    const filteredOtherTemplates = Object.entries(PROMPT_TEMPLATES)
        .filter(([key]) => key !== 'poi' && key !== 'receipt')
        .filter(([, tmpl]) => {
            const normalizedQuery = templateSearch.trim().toLowerCase();
            if (!normalizedQuery) return true;
            return `${tmpl.title} ${tmpl.prompt}`.toLowerCase().includes(normalizedQuery);
        })
        .sort((a, b) => a[1].title.localeCompare(b[1].title));

    const renderPromptDraftPanel = (compact = false) => (
        <div
            style={{
                background: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: compact ? '14px' : '16px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
            }}
        >
            <label
                className={`${compact ? 'mb-3' : 'mb-4'} block text-slate-800`}
                style={{
                    borderLeft: '4px solid #003f87',
                    paddingLeft: '12px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    fontSize: compact ? '12px' : '14px',
                    letterSpacing: compact ? '0.08em' : undefined
                }}
            >
                {compact ? 'Prompt Draft' : '4. Prompt Draft'}
            </label>
            <textarea
                value={promptDraft}
                onChange={(e) => setPromptDraft(e.target.value)}
                placeholder="Describe the goal of this email (e.g. 'Generate a Quote Proposal for John Smith, Progressive auto policy')..."
                className={`w-full ${compact ? 'h-40' : 'h-28'} text-sm font-medium outline-none transition-all resize-none placeholder:text-slate-400 text-slate-800 ${compact ? 'mb-3' : 'mb-3'}`}
                style={{
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    padding: '10px',
                    background: 'white'
                }}
            />

            <div className={`grid grid-cols-1 ${previewHtml ? 'md:grid-cols-2' : ''} gap-3`}>
                <button
                    onClick={handleGenerate}
                    disabled={isLoading}
                    className={`w-full bg-button-gradient text-white font-black ${compact ? 'py-4 rounded-2xl text-xs' : 'py-5 rounded-3xl text-sm'} shadow-button-glow hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 uppercase tracking-[2px]`}
                >
                    {isLoading ? <i className="fa-solid fa-spinner fa-spin text-lg"></i> : <i className="fa-solid fa-wand-magic-sparkles text-lg text-amber-300"></i>}
                    {isLoading ? 'Engineering...' : 'Generate Luxury Email'}
                </button>
                {previewHtml && (
                    <button
                        onClick={handleSyncToGmail}
                        className={`w-full bg-slate-50 text-primary border border-slate-200 font-black ${compact ? 'py-4 rounded-2xl text-xs' : 'py-5 rounded-3xl text-sm'} shadow-sm hover:bg-slate-100 transition-all flex items-center justify-center gap-3 uppercase tracking-[2px] group`}
                    >
                        <i className="fa-brands fa-google text-lg text-slate-400 group-hover:text-red-500 transition-colors"></i> Sync to Gmail
                    </button>
                )}
            </div>
        </div>
    );

    const renderStickyGmailActions = () => {
        if (layoutMode !== 'gmail') return null;

        return (
            <div className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-18px_45px_-32px_rgba(15,23,42,0.7)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/95">
                <div className="mx-auto flex max-w-7xl items-center gap-3">
                    <div className="hidden min-w-0 flex-1 sm:block">
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-primary dark:text-cyan-300">
                            Gmail Engineering
                        </p>
                        <p className="truncate text-xs font-semibold text-slate-500 dark:text-slate-300">
                            Prompt ready: {promptDraft.trim() ? 'yes' : 'add instructions or choose a template'}
                        </p>
                    </div>
                    <button
                        onClick={handleGenerate}
                        disabled={isLoading}
                        className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-button-gradient px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-white shadow-button-glow transition hover:scale-[1.01] active:scale-95 disabled:opacity-60 sm:flex-none sm:min-w-[240px]"
                    >
                        {isLoading ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-wand-magic-sparkles text-amber-300"></i>}
                        {isLoading ? 'Engineering...' : 'Generate Email'}
                    </button>
                    {previewHtml && (
                        <button
                            onClick={handleSyncToGmail}
                            className="hidden items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-primary shadow-sm transition hover:bg-slate-50 sm:flex dark:border-white/10 dark:bg-white/5 dark:text-cyan-300"
                        >
                            <i className="fa-brands fa-google"></i>
                            Sync
                        </button>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div 
            className={layoutMode === 'gmail' ? 'animate-fade-in space-y-4' : 'animate-fade-in space-y-6'}
            style={{
                background: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: layoutMode === 'gmail' ? '22px' : '24px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.08)'
            }}
        >
            {/* Main Header Card */}
            <div 
                className="flex items-center justify-between gap-4 p-4 md:p-5"
                style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}
            >
                <div>
                    <h3 className="text-lg md:text-2xl font-black flex items-center gap-3 text-slate-900 tracking-tight font-outfit uppercase">
                        <span className="w-11 h-11 rounded-2xl bg-button-gradient flex items-center justify-center text-white shadow-button-glow">
                            <i className="fa-solid fa-envelope-open-text text-xl"></i>
                        </span>
                        Gmail Engineering Studio
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-1 font-bold uppercase tracking-widest pl-1 md:pl-14">Create bulletproof, spam-safe HTML emails.</p>
                </div>
                <div className="flex gap-2">
                    <span className="text-[10px] font-black uppercase bg-white text-primary px-4 py-2 rounded-xl border border-[#e2e8f0] tracking-[2px] shadow-sm">
                        <i className="fa-brands fa-google mr-2"></i>Gmail V4.2 (Gemini 3 Flash)
                    </span>
                </div>
            </div>

            {/* Gmail mode uses two roomy work lanes so the template and prompt panels stay usable. */}
            <div className={layoutMode === 'gmail' ? "grid grid-cols-1 gap-4 xl:grid-cols-[minmax(320px,0.82fr)_minmax(680px,1.55fr)] xl:items-start" : "space-y-6"}>
                {/* Column 1: Brand Identity System */}
                <div className={layoutMode === 'gmail' ? "order-2 space-y-4 xl:col-start-1 xl:row-start-1" : "order-2 space-y-6 lg:order-1"}>

                    {/* 1. Brand Identity System */}
            <div 
                style={{
                    background: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '16px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                }}
            >
                <label 
                    className="mb-4 block text-slate-800"
                    style={{
                        borderLeft: '4px solid #003f87',
                        paddingLeft: '12px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        fontSize: '14px'
                    }}
                >
                    {layoutMode === 'gmail' ? 'Brand Identity System' : '1. Brand Identity System'}
                </label>
                <div className={layoutMode === 'gmail' ? "grid grid-cols-2 gap-2 mb-3" : "grid grid-cols-2 sm:grid-cols-5 gap-2 mb-3"}>
                    {Object.keys(CARRIER_LOGOS)
                        .sort((a, b) => a.localeCompare(b))
                        .map((name) => (
                        <button
                            key={name}
                            onClick={() => {
                                if (selectedCarrier === name) {
                                    setSelectedCarrier("");
                                } else {
                                    setSelectedCarrier(name);
                                    setCustomBrandName('');
                                    setCustomLogoUrl('');
                                }
                            }}
                            className={`transition-all flex items-center justify-center ${layoutMode === 'gmail' ? 'h-10' : 'h-12'} group relative overflow-hidden ${
                                selectedCarrier === name
                                    ? "scale-[1.03] shadow-md border-2"
                                    : "hover:shadow-sm"
                            }`}
                            style={{
                                border: selectedCarrier === name ? `2px solid ${CARRIER_COLORS[name] || '#003f87'}` : '1px solid #e2e8f0',
                                borderRadius: '8px',
                                padding: '8px',
                                background: CARRIER_UI_COLORS[name] || 'white',
                                boxShadow: selectedCarrier === name ? `0 0 12px ${(CARRIER_COLORS[name] || '#003f87')}55` : undefined
                            }}
                            title={name}
                        >
                            {selectedCarrier === name && (
                                <div 
                                    className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px] z-20 text-white shadow-sm animate-fade-in"
                                    style={{ backgroundColor: CARRIER_COLORS[name] || '#10b981' }}
                                >
                                    <i className="fa-solid fa-check"></i>
                                </div>
                            )}
                            <div 
                                className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300"
                                style={{ backgroundColor: CARRIER_COLORS[name] || '#2080a0' }}
                            ></div>
                            <img 
                                src={CARRIER_LOGOS[name]} 
                                alt={name} 
                                className={`${layoutMode === 'gmail' ? 'h-5 max-w-[84px]' : 'h-6'} object-contain transition-all relative z-10 ${
                                    selectedCarrier === name 
                                        ? 'grayscale-0 opacity-100' 
                                        : 'grayscale group-hover:grayscale-0 opacity-70 group-hover:opacity-100'
                                }`} 
                                referrerPolicy="no-referrer"
                            />
                        </button>
                    ))}
                </div>
                
                {/* Custom Branding Fields */}
                <div className="flex flex-col gap-2">
                    <div className="relative group">
                        <i className="fa-solid fa-building absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors"></i>
                        <input 
                            type="text" 
                            placeholder="Or Custom Company Name" 
                            value={customBrandName}
                            onChange={(e) => {
                                setCustomBrandName(e.target.value);
                                if(e.target.value) setSelectedCarrier(''); 
                            }}
                            className="w-full pl-12 text-xs font-bold outline-none placeholder:font-normal text-slate-800"
                            style={{
                                border: '1px solid #d1d5db',
                                borderRadius: '8px',
                                padding: '8px',
                                background: 'white'
                            }}
                        />
                    </div>
                    <div className="relative group">
                        <i className="fa-solid fa-image absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors"></i>
                        <input 
                            type="text" 
                            placeholder="Custom Hero Image URL (Overrides Logo)" 
                            value={customLogoUrl}
                            onChange={(e) => {
                                setCustomLogoUrl(e.target.value);
                                if(e.target.value) setSelectedCarrier(''); 
                            }}
                            className="w-full pl-12 text-xs font-bold outline-none placeholder:font-normal text-slate-800"
                            style={{
                                border: '1px solid #d1d5db',
                                borderRadius: '8px',
                                padding: '8px',
                                background: 'white'
                            }}
                        />
                    </div>
                </div>
            </div>

                </div> {/* Closes Column 1 wrapper */}

            {/* Column 2: Intelligence Feed & Options */}
            <div className={layoutMode === 'gmail' ? "order-3 space-y-4 xl:col-start-1 xl:row-start-2" : "order-3 space-y-6 lg:order-2"}>
                {/* 2. Intelligence Feed */}
                <div 
                    style={{
                        background: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        padding: '16px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                    }}
                >
                    <label 
                        className="mb-4 block text-slate-800"
                        style={{
                            borderLeft: '4px solid #003f87',
                            paddingLeft: '12px',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            fontSize: '14px'
                        }}
                    >
                        {layoutMode === 'gmail' ? 'Intelligence Feed' : '2. Intelligence Feed'}
                    </label>
                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        className={`flex flex-col items-center justify-center gap-2 cursor-pointer transition-all group`}
                        style={{
                            border: '2px dashed #94a3b8',
                            borderRadius: '12px',
                            background: '#f8fafc',
                            padding: '16px',
                            minHeight: '80px'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.borderColor = '#003f87'}
                        onMouseOut={(e) => e.currentTarget.style.borderColor = '#94a3b8'}
                    >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${attachedFile ? 'bg-button-gradient text-white shadow-button-glow' : 'bg-slate-200 text-slate-500 group-hover:scale-110'}`}>
                            <i className={`fa-solid ${attachedFile ? 'fa-check' : 'fa-cloud-arrow-up'} text-sm`}></i>
                        </div>
                        <div className="text-center">
                            <span className="text-xs font-black uppercase text-slate-700 tracking-wide block">
                                {attachedFile ? attachedFile.name : "Upload Quote / Policy PDF"}
                            </span>
                            {!attachedFile && <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1 block">AI will parse & summarize</span>}
                        </div>
                        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                    </div>

                    {/* Recipient Email Input */}
                    <div className="relative group mt-3">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <i className="fa-solid fa-at text-slate-400 group-focus-within:text-primary transition-colors text-xs"></i>
                        </div>
                        <input 
                            type="email"
                            value={recipientEmail}
                            onChange={(e) => setRecipientEmail(e.target.value)}
                            placeholder="Recipient Email (Optional)..."
                            className="w-full pl-10 text-xs font-bold outline-none placeholder:font-normal text-slate-800"
                            style={{
                                border: '1px solid #d1d5db',
                                borderRadius: '8px',
                                padding: '10px',
                                background: 'white'
                            }}
                        />
                    </div>
                </div>
            </div> {/* Closes Column 2 wrapper */}

            {/* Column 3: Template Builder */}
            <div className={layoutMode === 'gmail' ? "order-4 space-y-4 xl:col-start-2 xl:row-start-2" : "order-4 space-y-6 lg:order-3"}>

            {/* 3. Template Builder */}
            <div 
                style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '12px'
                }}
            >
                <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                        <label 
                            className="block text-slate-800"
                            style={{
                                borderLeft: '4px solid #003f87',
                                paddingLeft: '10px',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                fontSize: '12px',
                                letterSpacing: '0.08em'
                            }}
                        >
                            {layoutMode === 'gmail' ? 'Template Builder' : '3. Template Builder'}
                        </label>
                        <p className="mt-2 text-[11px] font-medium text-slate-500">
                            Tap a template to load it into the prompt draft.
                        </p>
                    </div>
                    <div
                        className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-black uppercase text-slate-500"
                        style={{ letterSpacing: '0.08em' }}
                    >
                        {Object.keys(PROMPT_TEMPLATES).length} templates
                    </div>
                </div>
                {/* Favorites Grid */}
                <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                        <i className="fa-solid fa-star text-amber-500 text-xs"></i>
                        <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                            Frequently Used (Favorites)
                        </span>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {/* POI Template */}
                        {(() => {
                            const tmpl = PROMPT_TEMPLATES.poi;
                            const isSelected = promptDraft === tmpl.prompt;
                            return (
                                <button
                                    onClick={() => setPromptDraft(tmpl.prompt)}
                                    className="w-full text-left transition-all hover:scale-[1.01]"
                                    style={{
                                        background: isSelected ? '#ecfdf5' : '#f0fdf4',
                                        border: isSelected ? '2px solid #10b981' : '1px solid #d1fae5',
                                        borderRadius: '10px',
                                        padding: '10px',
                                        color: '#065f46',
                                        minHeight: '64px',
                                        boxShadow: isSelected ? '0 0 8px rgba(16, 185, 129, 0.2)' : 'none',
                                    }}
                                >
                                    <div className="flex items-start gap-3">
                                        <div
                                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                                            style={{
                                                background: '#10b981',
                                                color: '#ffffff'
                                            }}
                                        >
                                            <i className="fa-solid fa-id-card text-sm"></i>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div
                                                className="text-[11px] font-black uppercase truncate"
                                                style={{
                                                    color: '#065f46',
                                                    letterSpacing: '0.06em',
                                                    lineHeight: '1.2'
                                                }}
                                                title="Verification of Insurance"
                                            >
                                                Verification of Insurance
                                            </div>
                                            <div className="mt-1 flex items-center justify-between gap-2">
                                                <span
                                                    className="text-[9px] font-semibold uppercase text-emerald-600/70"
                                                    style={{ letterSpacing: '0.08em' }}
                                                >
                                                    {isSelected ? 'Selected' : 'Load Template'}
                                                </span>
                                                <span
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigator.clipboard.writeText(tmpl.prompt);
                                                        addToast('Copied "Verification of Insurance" template prompt.', 'success');
                                                    }}
                                                    className="p-1 text-emerald-600 hover:text-emerald-900 hover:bg-emerald-100/50 rounded cursor-pointer transition-colors flex items-center justify-center shrink-0"
                                                    title="Copy template prompt text"
                                                >
                                                    <i className="fa-solid fa-copy text-[10px]"></i>
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            );
                        })()}

                        {/* Payment Receipt Template */}
                        {(() => {
                            const tmpl = PROMPT_TEMPLATES.receipt;
                            const isSelected = promptDraft === tmpl.prompt;
                            return (
                                <button
                                    onClick={() => setPromptDraft(tmpl.prompt)}
                                    className="w-full text-left transition-all hover:scale-[1.01]"
                                    style={{
                                        background: isSelected ? '#fffbeb' : '#fffdf0',
                                        border: isSelected ? '2px solid #eab308' : '1px solid #fef3c7',
                                        borderRadius: '10px',
                                        padding: '10px',
                                        color: '#78350f',
                                        minHeight: '64px',
                                        boxShadow: isSelected ? '0 0 8px rgba(234, 179, 8, 0.2)' : 'none',
                                    }}
                                >
                                    <div className="flex items-start gap-3">
                                        <div
                                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                                            style={{
                                                background: '#eab308',
                                                color: '#ffffff'
                                            }}
                                        >
                                            <i className="fa-solid fa-receipt text-sm"></i>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div
                                                className="text-[11px] font-black uppercase truncate"
                                                style={{
                                                    color: '#78350f',
                                                    letterSpacing: '0.06em',
                                                    lineHeight: '1.2'
                                                }}
                                                title="Payment Receipt"
                                            >
                                                Payment Receipt
                                            </div>
                                            <div className="mt-1 flex items-center justify-between gap-2">
                                                <span
                                                    className="text-[9px] font-semibold uppercase text-amber-700/70"
                                                    style={{ letterSpacing: '0.08em' }}
                                                >
                                                    {isSelected ? 'Selected' : 'Load Template'}
                                                </span>
                                                <span
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigator.clipboard.writeText(tmpl.prompt);
                                                        addToast('Copied "Payment Receipt" template prompt.', 'success');
                                                    }}
                                                    className="p-1 text-amber-700 hover:text-amber-900 hover:bg-amber-100/50 rounded cursor-pointer transition-colors flex items-center justify-center shrink-0"
                                                    title="Copy template prompt text"
                                                >
                                                    <i className="fa-solid fa-copy text-[10px]"></i>
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            );
                        })()}
                    </div>
                </div>

                <div className="border-t border-slate-100 my-3"></div>

                <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                        Other Templates
                    </span>
                    <span className="shrink-0 text-[9px] font-bold text-slate-400">
                        {filteredOtherTemplates.length} shown
                    </span>
                </div>

                <div className="relative mb-2">
                    <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400"></i>
                    <input
                        type="search"
                        value={templateSearch}
                        onChange={(e) => setTemplateSearch(e.target.value)}
                        placeholder="Filter templates..."
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs font-bold text-slate-800 outline-none transition focus:border-primary focus:bg-white"
                    />
                </div>

                <div
                    className="grid grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2 2xl:grid-cols-3"
                    style={{
                        maxHeight: '200px'
                    }}
                >
                    {filteredOtherTemplates.length > 0 ? (
                        filteredOtherTemplates.map(([key, tmpl]) => (
                            <button
                                key={key}
                                onClick={() => setPromptDraft(tmpl.prompt)}
                                className="w-full text-left transition-all"
                                style={{
                                    background: promptDraft === tmpl.prompt ? '#eaf2ff' : '#f8fafc',
                                    border: promptDraft === tmpl.prompt ? '1px solid #003f87' : '1px solid #e2e8f0',
                                    borderRadius: '10px',
                                    padding: '10px',
                                    color: '#0f172a',
                                    minHeight: '60px',
                                }}
                            >
                                <div className="flex items-start gap-3">
                                    <div
                                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                                        style={{
                                            background: promptDraft === tmpl.prompt ? '#003f87' : (tmpl.bgColor || '#e2e8f0'),
                                            color: promptDraft === tmpl.prompt ? '#ffffff' : '#003f87'
                                        }}
                                    >
                                        <i className={`fa-solid ${tmpl.icon} text-sm`}></i>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div
                                            className="text-[11px] font-black uppercase truncate"
                                            style={{
                                                color: promptDraft === tmpl.prompt ? '#003f87' : '#0f172a',
                                                letterSpacing: '0.06em',
                                                lineHeight: '1.2'
                                            }}
                                            title={tmpl.title}
                                        >
                                            {tmpl.title}
                                        </div>
                                        <div className="mt-1 flex items-center justify-between gap-2">
                                            <span
                                                className="text-[10px] font-semibold uppercase text-slate-400"
                                                style={{ letterSpacing: '0.08em' }}
                                            >
                                                {promptDraft === tmpl.prompt ? 'Selected' : 'Load Template'}
                                            </span>
                                            <span
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigator.clipboard.writeText(tmpl.prompt);
                                                    addToast(`Copied "${tmpl.title}" template prompt.`, 'success');
                                                }}
                                                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-white/10 rounded cursor-pointer transition-colors flex items-center justify-center shrink-0"
                                                title="Copy template prompt text"
                                            >
                                                <i className="fa-solid fa-copy text-[10px]"></i>
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </button>
                        ))
                    ) : (
                        <div className="col-span-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                            No matching templates
                        </div>
                    )}
                </div>
            </div>

                </div> {/* Closes Column 3 wrapper */}

                {layoutMode === 'gmail' && (
                    <div className="order-1 xl:col-start-2 xl:row-start-1">
                        {renderPromptDraftPanel(true)}
                    </div>
                )}
            </div> {/* Closes Grid Layout Container */}

            {/* 4. Prompt Draft */}
            {layoutMode !== 'gmail' && renderPromptDraftPanel(false)}

            {renderStickyGmailActions()}
            {renderOverlay()}
        </div>
    );
};

export default AiAssistant;
