
import React, { useState, useRef } from 'react';
import { 
    CARRIER_LOGOS, 
    CARRIER_UI_COLORS,
    PROMPT_TEMPLATES, 
} from '../constants';
import {
    downloadAsHtmlFile,
    handOffToGmail,
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
    if (!isMissingValue(extractedLogoUrl)) {
        return extractedLogoUrl!.trim();
    }

    const exactCarrierMatch = carrierName && CARRIER_LOGOS[carrierName];
    if (exactCarrierMatch) {
        return exactCarrierMatch;
    }

    const normalizedCarrier = carrierName?.trim().toLowerCase();
    if (normalizedCarrier) {
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

const AiAssistant: React.FC<AiAssistantProps> = ({ addToast }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [isRefining, setIsRefining] = useState(false);
    const [previewHtml, setPreviewHtml] = useState<string | null>(null);
    const [innerAiHtml, setInnerAiHtml] = useState<string>(''); // Stores raw AI content before wrapping
    const [generatedSubject, setGeneratedSubject] = useState<string>(''); // Stores AI generated subject
    const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
    const [attachedFile, setAttachedFile] = useState<FileData | null>(null);
    const [selectedCarrier, setSelectedCarrier] = useState<string>("");
    
    // Custom Branding State
    const [customBrandName, setCustomBrandName] = useState('');
    const [customLogoUrl, setCustomLogoUrl] = useState('');
    
    const [promptDraft, setPromptDraft] = useState('');
    const [recipientEmail, setRecipientEmail] = useState('');
    const [refinementInstruction, setRefinementInstruction] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const CARRIER_COLORS: Record<string, string> = {
        'Nationwide': '#005596',
        'National General': '#002D72',
        'Progressive': '#00A1E0',
        'Foremost': '#F58220',
        'Alamance Farmers': '#4CAF50',
        'NC Grange': '#2E7D32',
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

        setIsLoading(true);
        setPreviewHtml(null);
        setGeneratedSubject('');
        setValidationResult(null);

        try {
            const isPoi = promptDraft.includes('Proof of Insurance');
            const fileData = attachedFile
                ? { mimeType: attachedFile.mimeType, data: attachedFile.base64 }
                : undefined;
            let finalHtml = '';
            let subject = '';

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
                
                const poiData: PoiData = {
                    INSURED_NAME: parsed.INSURED_NAME || '[Missing]',
                    FIRST_NAME: parsed.FIRST_NAME || parsed.INSURED_NAME?.trim().split(/\s+/)[0] || 'there',
                    POLICY_NUMBER: parsed.POLICY_NUMBER || '[Missing]',
                    EFFECTIVE_DATE_LONG: parsed.EFFECTIVE_DATE_LONG || parsed.EFFECTIVE_SHORT || '[Missing]',
                    EXPIRY_DATE_LONG: parsed.EXPIRY_DATE_LONG || parsed.EXPIRY_SHORT || '[Missing]',
                    EFFECTIVE_SHORT: parsed.EFFECTIVE_SHORT || '[Missing]',
                    EXPIRY_SHORT: parsed.EXPIRY_SHORT || '[Missing]',
                    YEAR: parsed.YEAR || String(new Date().getFullYear()),
                    CARRIER: parsed.CARRIER || selectedCarrier || 'Your Carrier',
                    CARRIER_LOGO_URL: parsed.CARRIER_LOGO_URL || '',
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
                finalHtml = result.htmlBody || '';
            }

            setInnerAiHtml(finalHtml);
            setGeneratedSubject(subject);
            setPreviewHtml(finalHtml);
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

            setInnerAiHtml(refinedHtml);
            setGeneratedSubject(refinedSubject);
            setPreviewHtml(refinedHtml);
            setRefinementInstruction('');
            reportValidation(validateGmailHtml(refinedHtml), 'Email refined successfully!');
        } catch (error) {
            console.error(error);
            addToast(`Refinement failed: ${getErrorMessage(error)}`, 'danger');
        } finally {
            setIsRefining(false);
        }
    };

    const handleDownloadHtml = () => {
        if (!previewHtml) return;
        downloadAsHtmlFile(previewHtml, generatedSubject || 'email_template');
        addToast('Template downloaded.', 'success');
    };

    const handleSyncToGmail = async () => {
        if (!previewHtml) return;
        const result = await handOffToGmail({
            subject: generatedSubject || "Insurance Update - Bill Layne Agency",
            htmlBody: previewHtml,
            to: recipientEmail.trim() || undefined,
        });

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

    return (
        <div 
            className="animate-fade-in space-y-8"
            style={{
                background: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '24px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.08)'
            }}
        >
            {/* Main Header Card */}
            <div 
                className="flex items-center justify-between p-6"
                style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}
            >
                <div>
                    <h3 className="text-xl md:text-2xl font-black flex items-center gap-4 text-slate-900 tracking-tight font-outfit uppercase">
                        <span className="w-12 h-12 rounded-2xl bg-button-gradient flex items-center justify-center text-white shadow-button-glow">
                            <i className="fa-solid fa-envelope-open-text text-xl"></i>
                        </span>
                        Gmail Engineering Studio
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 font-bold uppercase tracking-widest pl-2">Create bulletproof, spam-safe HTML emails.</p>
                </div>
                <div className="flex gap-2">
                    <span className="text-[10px] font-black uppercase bg-white text-primary px-4 py-2 rounded-xl border border-[#e2e8f0] tracking-[2px] shadow-sm">
                        <i className="fa-brands fa-google mr-2"></i>Gmail V4.2 (Gemini 3 Flash)
                    </span>
                </div>
            </div>

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
                    1. Brand Identity System
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
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
                            className={`transition-all flex items-center justify-center h-16 group relative overflow-hidden ${
                                selectedCarrier === name
                                    ? "scale-105 shadow-md"
                                    : "hover:shadow-sm"
                            }`}
                            style={{
                                border: selectedCarrier === name ? `2px solid ${CARRIER_COLORS[name] || '#003f87'}` : '1px solid #e2e8f0',
                                borderRadius: '8px',
                                padding: '8px',
                                background: CARRIER_UI_COLORS[name] || 'white'
                            }}
                            title={name}
                        >
                            <div 
                                className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300"
                                style={{ backgroundColor: CARRIER_COLORS[name] || '#2080a0' }}
                            ></div>
                            <img 
                                src={CARRIER_LOGOS[name]} 
                                alt={name} 
                                className="h-8 object-contain grayscale group-hover:grayscale-0 transition-all opacity-70 group-hover:opacity-100 relative z-10" 
                                referrerPolicy="no-referrer"
                            />
                        </button>
                    ))}
                </div>
                
                {/* Custom Branding Fields */}
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative group">
                        <i className="fa-solid fa-building absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors"></i>
                        <input 
                            type="text" 
                            placeholder="Or Custom Company Name" 
                            value={customBrandName}
                            onChange={(e) => {
                                setCustomBrandName(e.target.value);
                                if(e.target.value) setSelectedCarrier(''); 
                            }}
                            className="w-full pl-12 text-sm font-bold outline-none placeholder:font-normal text-slate-800"
                            style={{
                                border: '1px solid #d1d5db',
                                borderRadius: '8px',
                                padding: '12px',
                                background: 'white'
                            }}
                        />
                    </div>
                    <div className="flex-[2] relative group">
                        <i className="fa-solid fa-image absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors"></i>
                        <input 
                            type="text" 
                            placeholder="Custom Hero Image URL (Overrides Logo)" 
                            value={customLogoUrl}
                            onChange={(e) => {
                                setCustomLogoUrl(e.target.value);
                                if(e.target.value) setSelectedCarrier(''); 
                            }}
                            className="w-full pl-12 text-sm font-bold outline-none placeholder:font-normal text-slate-800"
                            style={{
                                border: '1px solid #d1d5db',
                                borderRadius: '8px',
                                padding: '12px',
                                background: 'white'
                            }}
                        />
                    </div>
                </div>
            </div>

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
                    2. Intelligence Feed
                </label>
                <div 
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex flex-col items-center justify-center gap-3 cursor-pointer transition-all group`}
                    style={{
                        border: '2px dashed #94a3b8',
                        borderRadius: '12px',
                        background: '#f8fafc',
                        padding: '24px',
                        minHeight: '100px'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.borderColor = '#003f87'}
                    onMouseOut={(e) => e.currentTarget.style.borderColor = '#94a3b8'}
                >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${attachedFile ? 'bg-button-gradient text-white shadow-button-glow' : 'bg-slate-200 text-slate-500 group-hover:scale-110'}`}>
                        <i className={`fa-solid ${attachedFile ? 'fa-check' : 'fa-cloud-arrow-up'} text-lg`}></i>
                    </div>
                    <div className="text-center">
                        <span className="text-xs font-black uppercase text-slate-700 tracking-wide block">
                            {attachedFile ? attachedFile.name : "Upload Quote / Policy PDF"}
                        </span>
                        {!attachedFile && <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1 block">AI will parse & summarize</span>}
                    </div>
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                </div>
            </div>

            {/* 3. Template Builder */}
            <div 
                style={{
                    background: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '14px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                }}
            >
                <label 
                    className="mb-3 block text-slate-800"
                    style={{
                        borderLeft: '4px solid #003f87',
                        paddingLeft: '10px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        fontSize: '13px'
                    }}
                >
                    3. Template Builder
                </label>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4">
                    {Object.entries(PROMPT_TEMPLATES)
                        .sort((a, b) => a[1].title.localeCompare(b[1].title))
                        .map(([key, tmpl]) => (
                            <button
                                key={key}
                                onClick={() => setPromptDraft(tmpl.prompt)}
                                className="w-full transition-all text-[10px] font-black uppercase"
                                style={{
                                    background: promptDraft === tmpl.prompt ? '#eff6ff' : (tmpl.bgColor || 'white'),
                                    border: promptDraft === tmpl.prompt ? '1px solid #003f87' : '1px solid #d1d5db',
                                    borderRadius: '8px',
                                    padding: '8px 10px',
                                    boxShadow: promptDraft === tmpl.prompt ? '0 0 0 1px rgba(0,63,135,0.08)' : '0 1px 2px rgba(0,0,0,0.05)',
                                    color: promptDraft === tmpl.prompt ? '#003f87' : '#64748b',
                                    minHeight: '42px',
                                    lineHeight: '1.2',
                                }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.borderColor = '#003f87';
                                    e.currentTarget.style.color = '#003f87';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.borderColor = '#d1d5db';
                                    e.currentTarget.style.color = '#64748b';
                                }}
                            >
                                {tmpl.title}
                            </button>
                        ))}
                </div>
            </div>

            {/* 4. Prompt Draft */}
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
                    4. Prompt Draft
                </label>
                <textarea
                    value={promptDraft}
                    onChange={(e) => setPromptDraft(e.target.value)}
                    placeholder="Describe the goal of this email (e.g. 'Generate a Quote Proposal for John Smith, Progressive auto policy')..."
                    className="w-full h-40 text-base font-medium outline-none transition-all resize-none placeholder:text-slate-400 text-slate-800 mb-4"
                    style={{
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        padding: '12px',
                        background: 'white'
                    }}
                />
                <div className="relative group mb-4">
                    <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                        <i className="fa-solid fa-at text-slate-400 group-focus-within:text-primary transition-colors text-sm"></i>
                    </div>
                    <input 
                        type="email"
                        value={recipientEmail}
                        onChange={(e) => setRecipientEmail(e.target.value)}
                        placeholder="Recipient Email (Optional)..."
                        className="w-full pl-12 text-sm font-bold outline-none placeholder:text-slate-400 text-slate-800"
                        style={{
                            border: '1px solid #d1d5db',
                            borderRadius: '8px',
                            padding: '12px',
                            background: 'white'
                        }}
                    />
                </div>

                {/* Generation Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button 
                        onClick={handleGenerate} 
                        disabled={isLoading}
                        className="w-full bg-button-gradient text-white font-black py-5 rounded-3xl shadow-button-glow hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 text-sm uppercase tracking-[2px]"
                    >
                        {isLoading ? <i className="fa-solid fa-spinner fa-spin text-lg"></i> : <i className="fa-solid fa-wand-magic-sparkles text-lg text-amber-300"></i>}
                        {isLoading ? 'Engineering...' : 'Generate Luxury Email'}
                    </button>
                    {previewHtml && (
                        <button 
                            onClick={handleSyncToGmail}
                            className="w-full bg-slate-50 text-primary border border-slate-200 font-black py-5 rounded-3xl shadow-sm hover:bg-slate-100 transition-all flex items-center justify-center gap-3 text-sm uppercase tracking-[2px] group"
                        >
                            <i className="fa-brands fa-google text-lg text-slate-400 group-hover:text-red-500 transition-colors"></i> Sync to Gmail
                        </button>
                    )}
                </div>
            </div>
            
            {(isLoading || previewHtml) && (
                <div className="mt-6 space-y-6 animate-fade-in">
                    <div 
                        style={{
                            background: 'white',
                            border: '1px solid #e2e8f0',
                            borderRadius: '12px',
                            padding: '16px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                        }}
                    >
                        <div className="mb-5 flex justify-between items-center">
                            <div>
                                <h4 
                                    className="flex items-center gap-3 text-slate-800"
                                    style={{
                                        borderLeft: '4px solid #003f87',
                                        paddingLeft: '12px',
                                        fontWeight: 700,
                                        textTransform: 'uppercase',
                                        fontSize: '14px'
                                    }}
                                >
                                    <i className="fa-brands fa-gmail text-red-500 text-xl"></i>
                                    6. Retina Preview
                                </h4>
                                {generatedSubject && <p className="mt-2 text-sm font-bold text-slate-900 pl-8">Subject: <span className="text-primary font-normal">{generatedSubject}</span></p>}
                            </div>
                            <div className="flex gap-2">
                                {previewHtml && (
                                    <button 
                                        onClick={handleDownloadHtml} 
                                        className="px-4 py-2 rounded-xl bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-[2px] hover:bg-slate-100 transition-colors flex items-center gap-2 border border-slate-200"
                                        title="Download HTML File"
                                    >
                                        <i className="fa-solid fa-download"></i> Save
                                    </button>
                                )}
                                <button onClick={handleClear} className="px-4 py-2 rounded-xl bg-red-500/10 text-red-500 text-[10px] font-black uppercase tracking-[2px] hover:bg-red-500/20 transition-colors border border-red-500/20">Clear Project</button>
                            </div>
                        </div>

                        {/* Refinement Section */}
                        {previewHtml && !isLoading && (
                            <div 
                                className="mb-5 bg-slate-50 animate-slide-down"
                                style={{
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '12px',
                                    padding: '16px',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                                }}
                            >
                                <div className="flex gap-2 bg-white rounded-2xl p-2 items-center border border-slate-200">
                                    <div className="relative flex-1">
                                        <i className="fa-solid fa-wand-magic-sparkles absolute left-4 top-1/2 -translate-y-1/2 text-primary/50"></i>
                                        <input 
                                            type="text"
                                            value={refinementInstruction}
                                            onChange={(e) => setRefinementInstruction(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleRefine()}
                                            placeholder="AI Edit: 'Make the tone more urgent', 'Add a note about renewal'..."
                                            className="w-full p-3 pl-11 bg-transparent border-none text-sm font-medium outline-none placeholder:text-slate-400 text-slate-800"
                                        />
                                    </div>
                                    <button 
                                        onClick={handleRefine}
                                        disabled={isRefining || !refinementInstruction.trim()}
                                        className="px-6 py-3 bg-button-gradient text-white text-[10px] font-black uppercase tracking-[2px] rounded-2xl hover:scale-105 transition-all disabled:opacity-50 shadow-button-glow"
                                    >
                                        {isRefining ? <i className="fa-solid fa-circle-notch fa-spin"></i> : 'Apply'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {validationResult && !isLoading && (
                            <div
                                className="mb-5 animate-slide-down"
                                style={{
                                    background: validationResult.passed
                                        ? (validationResult.warningCount > 0 ? '#fff7ed' : '#f0fdf4')
                                        : '#fef2f2',
                                    border: `1px solid ${
                                        validationResult.passed
                                            ? (validationResult.warningCount > 0 ? '#fdba74' : '#86efac')
                                            : '#fca5a5'
                                    }`,
                                    borderRadius: '12px',
                                    padding: '16px',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                                }}
                            >
                                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                    <div>
                                        <h5
                                            className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em]"
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
                                            Email Check
                                        </h5>
                                        <p className="mt-2 text-sm font-semibold text-slate-900">
                                            {validationResult.passed
                                                ? (validationResult.warningCount > 0
                                                    ? 'Generated email is usable, but there are a few mobile or Gmail warnings to review.'
                                                    : 'Generated email passed the Gmail and mobile safety checks.')
                                                : 'Generated email has blocking issues that should be corrected before sending.'}
                                        </p>
                                    </div>
                                    <div className="flex gap-2 text-[10px] font-black uppercase tracking-[0.18em]">
                                        <span
                                            className="rounded-full px-3 py-1"
                                            style={{ background: '#ffffff', border: '1px solid #e2e8f0', color: '#0f172a' }}
                                        >
                                            {validationResult.errorCount} errors
                                        </span>
                                        <span
                                            className="rounded-full px-3 py-1"
                                            style={{ background: '#ffffff', border: '1px solid #e2e8f0', color: '#0f172a' }}
                                        >
                                            {validationResult.warningCount} warnings
                                        </span>
                                    </div>
                                </div>

                                {validationResult.issues.length > 0 && (
                                    <div className="mt-4 grid gap-2">
                                        {validationResult.issues.map((issue, index) => (
                                            <div
                                                key={`${issue.rule}-${index}`}
                                                className="rounded-xl bg-white px-4 py-3"
                                                style={{ border: '1px solid #e2e8f0' }}
                                            >
                                                <p
                                                    className="text-[10px] font-black uppercase tracking-[0.18em]"
                                                    style={{
                                                        color:
                                                            issue.severity === 'error'
                                                                ? '#b91c1c'
                                                                : issue.severity === 'warning'
                                                                    ? '#c2410c'
                                                                    : '#0369a1'
                                                    }}
                                                >
                                                    {issue.severity} · {issue.rule}
                                                </p>
                                                <p className="mt-1 text-sm leading-6 text-slate-700">
                                                    {issue.message}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        <div 
                            className="w-full h-[700px] overflow-hidden relative flex justify-center"
                            style={{
                                background: 'white',
                                border: '1px solid #e2e8f0',
                                borderRadius: '12px',
                                padding: '20px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                            }}
                        >
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center h-full text-slate-500">
                                    <div className="w-20 h-20 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-6"></div>
                                    <p className="premium-label">Processing Document Twin...</p>
                                </div>
                            ) : (
                                <div className="w-[600px] h-full bg-white shadow-2xl overflow-auto rounded-md custom-scrollbar">
                                    <iframe
                                        srcDoc={previewHtml || ''}
                                        title="Engineering Preview"
                                        className="w-full h-full border-0"
                                        sandbox="allow-same-origin"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AiAssistant;
