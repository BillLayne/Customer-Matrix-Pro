
import React, { useState, useRef, useEffect } from 'react';
import type { Portal, SearchMode } from '../types';
import { MODE_META, NC_COUNTY_GIS_DATA, DEFAULT_INSURANCE_PORTALS, MORE_CARRIER_PORTALS } from '../constants';
import Modal from './Modal';
import { generateContent } from '../services/geminiService';
import { GoogleGenAI } from "@google/genai";
import { useLocalStorage } from '../hooks/useLocalStorage';
import ContactLookup from './ContactLookup';

interface SearchCardProps {
  addToast: (message: string, type?: 'success' | 'warning' | 'danger' | 'info') => void;
  searchCount: number;
  onSearch: () => void;
}

const SEARCH_MODELS = ['gemini-3-flash-preview', 'gemini-3.5-flash', 'gemini-3.1-flash-lite'] as const;
const NC_INSURANCE_TOOLS_AGENCY_URL = 'https://26d5834f.nc-insurance-tools-gemini.pages.dev/';

const buildNcInsuranceToolsUrl = (address: string) =>
  `${NC_INSURANCE_TOOLS_AGENCY_URL}?address=${encodeURIComponent(address.trim())}`;

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
  for (const model of SEARCH_MODELS) {
    try {
      return await ai.models.generateContent({ ...request, model });
    } catch (error) {
      lastError = error;
      if (!shouldRetryOnFallback(error) || model === SEARCH_MODELS[SEARCH_MODELS.length - 1]) {
        throw error;
      }
    }
  }
  throw lastError;
};

const parseJsonFromText = <T,>(text: string): T => {
  const trimmed = text.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fencedMatch?.[1]?.trim() || trimmed;
  const firstBrace = candidate.indexOf('{');
  const lastBrace = candidate.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error('AI did not return valid JSON.');
  }
  return JSON.parse(candidate.slice(firstBrace, lastBrace + 1)) as T;
};

const SearchCard: React.FC<SearchCardProps> = ({ addToast, searchCount, onSearch }) => {
  const [mode, setMode] = useState<SearchMode>('agency');
  const [query, setQuery] = useState('');
  const [searchHistory, setSearchHistory] = useLocalStorage<string[]>('matrix-pro-search-history', []);
  const [showCarrierGateway, setShowCarrierGateway] = useLocalStorage<boolean>('matrix-pro-show-carrier-gateway', false);
  const [showMoreCarriers, setShowMoreCarriers] = useState(false);
  const [isGisModalOpen, setIsGisModalOpen] = useState(false);
  const [gisInfo, setGisInfo] = useState<{ county: string; url: string; note?: string } | null>(null);
  const [isGisSearching, setIsGisSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportHtml, setReportHtml] = useState('');
  const [reportSubject, setReportSubject] = useState('');
  
  // Real Estate Files State
  const [propertyFiles, setPropertyFiles] = useState<File[]>([]);
  const propertyFileInputRef = useRef<HTMLInputElement>(null);

  // Notes Modal State
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [isNotesMinimized, setIsNotesMinimized] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [isOrganizingNotes, setIsOrganizingNotes] = useState(false);
  
  // Notes File Staging State
  const [isProcessingNotesFile, setIsProcessingNotesFile] = useState(false);
  const [stagedNotesFile, setStagedNotesFile] = useState<{ data: string, mimeType: string, name: string } | null>(null);
  const notesFileInputRef = useRef<HTMLInputElement>(null);

  const handleHistoryClick = (historicQuery: string) => {
    setQuery(historicQuery);
    setTimeout(() => {
      onSearch();
      let url = '';
      switch (mode) {
        case 'agency': {
          const selection = /\d+/.test(historicQuery) ? "Address" : "Name";
          url = `https://agents.agencymatrix.com/#/customer/search?selection=${selection}&query=${encodeURIComponent(historicQuery)}`;
          break;
        }
        case 'web':
          url = `https://www.google.com/search?q=${encodeURIComponent(historicQuery)}`;
          break;
        case 'realestate':
          url = buildNcInsuranceToolsUrl(historicQuery);
          break;
        case 'people':
          url = `https://www.truepeoplesearch.com/results?name=${encodeURIComponent(historicQuery)}`;
          break;
        case 'onedrive': {
          url = `https://drive.google.com/drive/u/1/search?q=${encodeURIComponent(historicQuery.trim())}`;
          break;
        }
        case 'contacts':
          addToast('Saved company contacts are shown below.', 'info');
          return;
      }
      window.open(url, '_blank');
    }, 50);
  };

  const GOOGLE_DRIVE_CONSTANTS = {
      agencyEmail: 'docs@billlayneinsurance.com',
      clientsFolderId: '11O0Cm9gOdgXp_j8OXMO4Pm5tqh18uXd5'
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isTyping = ['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName);
      if (e.key === '/' && !isTyping) {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
        return;
      }
      
      // Audit Memo Shortcuts: 
      // 1. Alt + N (Legacy)
      // 2. Ctrl + Shift + M (Memo/Compliance Studio) - Matches Ctrl+M pattern
      if ((e.altKey && e.key.toLowerCase() === 'n') || ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'm')) {
          e.preventDefault();
          if (query.trim()) {
            setCustomerName(query.trim());
          }
          setIsNotesModalOpen(true);
          setIsNotesMinimized(false);
          return;
      }

      if (e.altKey) {
          const key = e.key.toLowerCase();
          let newMode: SearchMode | null = null;
          switch(key) {
              case 'w': newMode = 'web'; break;
              case 'h': newMode = 'realestate'; break;
              case 'p': newMode = 'people'; break;
              case 'f': newMode = 'onedrive'; break;
              case 'c': newMode = 'contacts'; break;
          }
          if (newMode) {
              e.preventDefault();
              setMode(newMode);
              inputRef.current?.focus();
          }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [addToast, query]);

  // Escape closes the "More Carriers" panel.
  useEffect(() => {
    if (!showMoreCarriers) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowMoreCarriers(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showMoreCarriers]);

  const handleSearch = () => {
    if (!query.trim()) {
      addToast('Please enter a search term', 'warning');
      inputRef.current?.focus();
      return;
    }
    const trimmedQuery = query.trim();
    if (mode === 'contacts') {
      onSearch();
      addToast('Saved company contact matches are shown below.', 'info');
      return;
    }

    setSearchHistory((prev) => {
      const filtered = prev.filter((q) => q.toLowerCase() !== trimmedQuery.toLowerCase());
      return [trimmedQuery, ...filtered].slice(0, 6);
    });
    onSearch();
    let url = '';
    switch (mode) {
      case 'agency':
        const selection = /\d+/.test(query) ? "Address" : "Name";
        url = `https://agents.agencymatrix.com/#/customer/search?selection=${selection}&query=${encodeURIComponent(query)}`;
        break;
      case 'web':
        url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
        break;
      case 'realestate':
        url = buildNcInsuranceToolsUrl(query);
        break;
      case 'people':
        url = `https://www.truepeoplesearch.com/results?name=${encodeURIComponent(query)}`;
        break;
      case 'onedrive': {
        const clientName = query.trim();
        url = `https://drive.google.com/drive/u/1/search?q=${encodeURIComponent(clientName)}`;
        break;
      }
      case 'contacts':
        return;
    }
    window.open(url, '_blank');
    setQuery('');
  };

  const handleNcInsuranceToolsOpen = () => {
    if (!query.trim()) {
      addToast('Please enter a property address for NC Insurance Tools.', 'warning');
      inputRef.current?.focus();
      return;
    }

    const trimmedQuery = query.trim();
    setSearchHistory((prev) => {
      const filtered = prev.filter((q) => q.toLowerCase() !== trimmedQuery.toLowerCase());
      return [trimmedQuery, ...filtered].slice(0, 6);
    });
    onSearch();
    window.open(buildNcInsuranceToolsUrl(trimmedQuery), '_blank');
    addToast('Opening NC Insurance Tools with this address...', 'info');
  };

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

  const handlePropertyFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
          const newFiles = Array.from(e.target.files);
          setPropertyFiles(prev => [...prev, ...newFiles]);
          addToast(`${newFiles.length} file(s) attached for analysis.`, 'info');
      }
  };

  const removePropertyFile = (index: number) => {
      setPropertyFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getCountyFromAddress = (address: string): string | null => {
    const lowerAddress = address.toLowerCase();
    for (const countyKey in NC_COUNTY_GIS_DATA) {
      if (lowerAddress.includes(countyKey)) return countyKey;
    }
    return null;
  };

  const handleGisSearch = async () => {
    if (!query.trim()) {
      addToast('Please enter an address for GIS search.', 'warning');
      inputRef.current?.focus();
      return;
    }
    setIsGisSearching(true);
    try {
        const API_KEY = process.env.API_KEY;
        if (!API_KEY) throw new Error("API key not found.");
        const ai = new GoogleGenAI({ apiKey: API_KEY });
        const prompt = `Analyze this North Carolina property address: "${query}".
Find the official county GIS or county tax parcel viewer for this address.
Return ONLY a JSON object in this shape and no extra text:
{"county":"...","url":"...","note":"..."}
If you are uncertain, still provide the most likely official county source and explain briefly in note.`;
        const response = await generateWithFallback(ai, {
            contents: prompt,
            config: { tools: [{googleSearch: {}}] }
        });
        if (!response.text) throw new Error("AI returned empty response.");
        const data = parseJsonFromText<{ county?: string; url: string; note?: string }>(response.text);
        setGisInfo({ county: data.county || 'Unknown County', url: data.url, note: data.note });
        setIsGisModalOpen(true);
        addToast(`Found GIS for ${data.county}`, 'success');
    } catch (error) {
        const countyKey = getCountyFromAddress(query);
        if (countyKey && NC_COUNTY_GIS_DATA[countyKey]) {
            const countyData = NC_COUNTY_GIS_DATA[countyKey];
            setGisInfo({ county: countyData.name, url: countyData.url.replace('{query}', encodeURIComponent(query)), note: countyData.note });
            setIsGisModalOpen(true);
            addToast('Using local database.', 'info');
        } else {
            addToast(`GIS Search failed: ${getErrorMessage(error)}`, 'danger');
        }
    } finally {
        setIsGisSearching(false);
    }
  };
  
  const handleGenerateReport = async () => {
    if (!query.trim()) {
        addToast('Please enter an address.', 'warning');
        return;
    }
    setIsGeneratingReport(true);
    setIsReportModalOpen(true);
    setReportHtml('');
    setReportSubject('');

    try {
        const API_KEY = process.env.API_KEY;
        if (!API_KEY) throw new Error("API key not found.");
        const ai = new GoogleGenAI({ apiKey: API_KEY });
        
        const researchPrompt = `
You are a Senior Property Risk Underwriter & Agent Strategist at Bill Layne Insurance Agency.
Research this property using search and attached evidence:
"${query.trim()}"

Return concise factual research notes only. Include:
1. Year built, square footage, lot size, property type, likely construction.
2. Roof, plumbing, HVAC, basement/crawlspace, and any visible underwriting concerns.
3. Estimated replacement cost range using rough NC rebuild assumptions.
4. Flood information, protection class clues, hydrant/station proximity if available.
5. Carrier fit notes for NC Grange, Alamance, Nationwide, Travelers, Progressive, National General, and Foremost.
6. 3 short client talking points.
7. Direct links for Zillow, Realtor, and the official county GIS/tax viewer.

Keep it factual and compact. No HTML.`;

        const parts: any[] = [{ text: researchPrompt }];
        for (const file of propertyFiles) {
            const base64 = await fileToBase64(file);
            parts.push({ inlineData: { mimeType: file.type, data: base64 } });
        }

        const researchResponse = await generateWithFallback(ai, {
            contents: { parts },
            config: {
                tools: [{googleSearch: {}}],
            }
        });

        if (!researchResponse.text) throw new Error("Property research failed.");

        const reportPrompt = `
You are building a polished HTML property intelligence report for Bill Layne Insurance Agency.

PROPERTY ADDRESS:
${query.trim()}

RESEARCH NOTES:
${researchResponse.text}

Create a compact HTML report with:
- subject
- htmlBody

Report requirements:
- Use clean table-based HTML only.
- Black or dark navy header with Bill Layne logo: https://i.imgur.com/lxu9nfT.png
- Alternating row colors (#F9FAFB and #FFFFFF)
- Include sections for Master Specifications, Replacement Cost Estimate, Systems & Risk Exposure, Carrier Appetite Scoring, Environmental & FEMA, Client Talking Points, and Quick Links.
- Quick Links must include Zillow, Realtor, and County GIS as clickable links/buttons.
- Keep it dense, readable, and useful for an agent talking to a client.

Return ONLY a JSON object in this exact shape:
{"subject":"...","htmlBody":"..."}
`;

        const response = await generateWithFallback(ai, {
            contents: reportPrompt,
        });

        if (!response.text) throw new Error("Content generation failed.");
        const data = parseJsonFromText<{ subject: string; htmlBody: string }>(response.text);
        setReportHtml(data.htmlBody);
        setReportSubject(data.subject);
        addToast('High-Intelligence Report Generated!', 'success');
    } catch (error) {
        console.error(error);
        addToast(`Report generation failed: ${getErrorMessage(error)}`, 'danger');
        setIsReportModalOpen(false);
    } finally {
        setIsGeneratingReport(false);
    }
  };

  const handleReportDownload = () => {
    if (!reportHtml) return;
    const blob = new Blob([reportHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportSubject.replace(/ /g, '_').replace(/[^a-z0-9_]/gi, '') || 'property_report'}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleReportPrint = () => {
      if (!reportHtml) return;
      const printWindow = window.open('', '_blank');
      if (printWindow) {
          printWindow.document.write(reportHtml);
          printWindow.document.close();
          printWindow.focus();
          printWindow.print();
      }
  };

  const handleReportEmail = async () => {
      if (!reportHtml) return;
      let contentToCopy = reportHtml;
      const bodyContentMatch = reportHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i);
      if (bodyContentMatch && bodyContentMatch[1]) contentToCopy = bodyContentMatch[1];
      try {
          const blob = new Blob([contentToCopy], { type: 'text/html' });
          // @ts-ignore
          const clipboardItem = new ClipboardItem({ 'text/html': blob });
          // @ts-ignore
          await navigator.clipboard.write([clipboardItem]);
          addToast('Ready for Gmail! Paste now.', 'success');
      } catch (error) {
          addToast('Direct copy failed. Code copied to clipboard.', 'info');
          await navigator.clipboard.writeText(reportHtml);
      }
      window.open(`https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(reportSubject)}`, '_blank');
  };

  const handleNewFolder = () => {
    if (query.trim()) {
        const clientName = query.trim();
        window.open(`https://drive.google.com/drive/u/1/search?q=${encodeURIComponent(clientName)}`, '_blank');
    } else {
        window.open(`https://drive.google.com/drive/u/1/folders/1lqq_4WpQgydfChWVKZRB-PBNWTZy8ulz`, '_blank');
    }
  };

  const handleNotesOpen = () => {
    if (query.trim()) setCustomerName(query.trim());
    setIsNotesModalOpen(true);
    setIsNotesMinimized(false);
  };

  const handleOrganizeNotes = async () => {
    if (!customerNotes.trim()) return;
    setIsOrganizingNotes(true);
    try {
        const estTime = new Date().toLocaleString("en-US", { timeZone: "America/New_York" });
        const prompt = `
        Act as a Senior E&O (Errors & Omissions) Risk Compliance Officer for Bill Layne Insurance Agency. 
        Your task is to transform the following raw agent notes and pasted email content into a professional, high-density, audit-proof CRM memo.

        **MISSION:** 
        Protect the agency by meticulously documenting what was requested and exactly what was done.

        **CURRENT AGENT FULFILLMENT TIME (EST):** ${estTime}

        **INPUT TEXT:**
        ---
        ${customerNotes}
        ---

        **STRICT AUDIT FORMAT:**
        1. **REQUEST SUMMARY:** Clearly state what the client requested by parsing any pasted email headers or thread content. Identify WHO requested WHAT and WHEN (from the email metadata).
        2. **ACTION TAKEN:** Precisely document the agent's performance based on the manual remarks provided. If the agent says "I sent it" or "I processed it", use the **CURRENT AGENT FULFILLMENT TIME** provided above to document the exact timestamp of fulfillment.
        3. **CHRONOLOGY:** Create a clear timeline: [Request Received Timestamp] -> [Agent Action Timestamp].
        4. **STATUS:** (e.g., COMPLETED, PENDING UW, VOIDED).
        
        Keep it concise, professional, and clear of jargon. Return ONLY the bulleted memo text.
        `;
        const organizedText = await generateContent(prompt);
        if (organizedText) setCustomerNotes(organizedText);
        addToast('E&O Smart Memo Generated!', 'success');
    } catch (error) {
        console.error('Failed to build E&O memo:', error);
        addToast(`Failed to build memo: ${getErrorMessage(error)}`, 'danger');
    } finally {
        setIsOrganizingNotes(false);
    }
  };

  const handleNotesFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      try {
          const base64 = await fileToBase64(file);
          setStagedNotesFile({ data: base64, mimeType: file.type, name: file.name });
          addToast(`Document "${file.name}" staged. Add your context and process.`, 'info');
      } catch (error) {
          addToast('Failed to stage file.', 'danger');
      } finally {
          if (e.target) e.target.value = '';
      }
  };

  const handleProcessNotesAi = async () => {
      if (!stagedNotesFile) return;
      
      setIsProcessingNotesFile(true);
      try {
          const estTime = new Date().toLocaleString("en-US", { timeZone: "America/New_York" });
          const API_KEY = process.env.API_KEY;
          if (!API_KEY) throw new Error("API key not found.");
          const ai = new GoogleGenAI({ apiKey: API_KEY });

          const prompt = `
            Act as a Senior E&O (Errors & Omissions) Compliance Expert at Bill Layne Insurance Agency.
            
            **CURRENT FULFILLMENT TIMESTAMP (EST):** ${estTime}

            **SOURCE:**
            The agent has provided these manual remarks/context:
            ---
            ${customerNotes || 'No manual remarks provided.'}
            ---

            **YOUR TASK:**
            1. Parse the attached document (PDF or Image) for specific change requests, dates of loss, or carrier confirmations.
            2. Merge this with the agent's remarks above.
            3. Generate an "Audit-Ready CRM Memo" that protects the agent and agency.
            
            **MEMO REQUIREMENTS:**
            - **REQUEST:** Summarize the client/third-party request found in the doc or notes.
            - **ACTION:** Summarize the agent's work. If the agent indicates they fulfilled the request "now" or "today", use the **CURRENT FULFILLMENT TIMESTAMP** (${estTime}) for the log.
            - **TIMESTAMPS:** Extract any specific dates/times found in the communication history.
            - **DETAILS:** Carrier, Policy #, and specific endorsement/change details.
            
            Return ONLY a concise bulleted summary suitable for a CRM memo field.
          `;

          const response = await generateWithFallback(ai, {
              contents: {
                  parts: [
                      { text: prompt },
                      { inlineData: { mimeType: stagedNotesFile.mimeType, data: stagedNotesFile.data } }
                  ]
              }
          });

          if (!response.text) throw new Error("AI returned empty response.");
          
          const summary = response.text.trim();
          setCustomerNotes(prev => prev ? `${prev}\n\n--- AUDIT MEMO (${stagedNotesFile.name}) ---\n${summary}` : summary);
          setStagedNotesFile(null);
          addToast('Document audit completed!', 'success');

      } catch (error) {
          const msg = error instanceof Error ? error.message : "Unknown error";
          addToast(`Audit failed: ${msg}`, 'danger');
      } finally {
          setIsProcessingNotesFile(false);
      }
  };

  const handleNotesSave = async () => {
      if (!customerName.trim() || !customerNotes.trim()) return;
      const estTs = new Date().toLocaleString("en-US", { timeZone: "America/New_York" });
      const timestampedNotes = `[CRM MEMO LOGGED: ${estTs}]\n${customerNotes}`;
      try { await navigator.clipboard.writeText(timestampedNotes); } catch (e) {}
      window.open(`https://agents.agencymatrix.com/#/customer/search?selection=${/\d+/.test(customerName) ? "Address" : "Name"}&query=${encodeURIComponent(customerName)}`, '_blank');
      handleNotesClose();
  };

  const handleNotesClose = () => {
    setIsNotesModalOpen(false);
    setIsNotesMinimized(false);
    setCustomerName('');
    setCustomerNotes('');
    setStagedNotesFile(null);
  };

  // Shared by the main portal row and the "More Carriers" panel so both stay identical.
  const renderPortalTile = (portal: Portal) => (
    <a
      key={portal.id}
      href={portal.url}
      target="_blank"
      rel="noopener noreferrer"
      title={portal.description}
      className="group/portal relative flex min-h-20 flex-col items-center justify-center overflow-hidden rounded-xl border border-transparent bg-white/5 p-3 text-center backdrop-blur-md transition-all duration-300 hover:shadow-glow"
      style={{
        backgroundColor: portal.color ? `${portal.color}1A` : undefined,
        borderColor: portal.color ? `${portal.color}33` : undefined,
      }}
    >
      <div
        className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover/portal:opacity-100"
        style={{ backgroundColor: portal.color }}
      ></div>
      <div className="relative z-10 mb-2 flex h-10 w-full items-center justify-center transition-transform duration-300 group-hover/portal:scale-110">
        {/* Dark mode: carrier artwork is dark ink, so it needs a light plate to stay legible.
            The plate drops away on hover, where the tile fills with the carrier colour. */}
        <span className="flex h-full max-w-full items-center justify-center rounded-lg px-1.5 transition-colors duration-300 dark:bg-white/95 dark:group-hover/portal:bg-transparent">
          {portal.image ? (
            <img
              src={portal.image}
              alt={portal.name}
              className="h-full w-auto object-contain transition-all duration-300 group-hover/portal:brightness-0 group-hover/portal:invert"
            />
          ) : (
            <i
              className={`${portal.icon} text-xl text-[var(--portal-color)] transition-colors duration-300 group-hover/portal:text-white`}
              style={{ '--portal-color': portal.color || '#94a3b8' } as React.CSSProperties}
            ></i>
          )}
        </span>
      </div>
      <span className="relative z-10 text-[9px] font-black uppercase leading-tight tracking-widest text-slate-600 transition-colors duration-300 group-hover/portal:text-white dark:text-slate-400">
        {portal.name}
      </span>
    </a>
  );

  const modeButtons: { mode: SearchMode, icon: string, label: string, shortcut: string }[] = [
    { mode: 'agency', icon: 'fa-shield-halved', label: 'Agency Matrix', shortcut: 'Ctrl + M' },
    { mode: 'web', icon: 'fa-brands fa-google', label: 'Web Search', shortcut: 'Alt + W' },
    { mode: 'realestate', icon: 'fa-solid fa-house', label: 'Real Estate', shortcut: 'Alt + H' },
    { mode: 'people', icon: 'fa-solid fa-user', label: 'People', shortcut: 'Alt + P' },
    { mode: 'onedrive', icon: 'fa-brands fa-google-drive', label: 'Client Folder', shortcut: 'Alt + F' },
    { mode: 'contacts', icon: 'fa-solid fa-address-book', label: 'Contact Numbers', shortcut: 'Alt + C' },
  ];

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-300 dark:border-white/10 dark:bg-white/5 sm:p-5">
        
        {/* Dynamic Background Mesh */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#003f87] via-[#0076d3] to-[#35a7ff]"></div>
        
        <div className="relative z-10 mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between md:gap-4">
            <div>
                <h2 className="flex items-center gap-2.5 font-outfit text-lg font-bold tracking-tight text-slate-900 dark:text-white sm:text-xl">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#003f87] text-white shadow-sm">
                        <i className="fa-solid fa-magnifying-glass text-sm"></i>
                    </span>
                    Unified Search
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Find customers in Agency Matrix by name or address — or switch modes below.
                </p>
            </div>
            <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 md:flex dark:border-white/10 dark:bg-white/5">
                <span className="h-2 w-2 animate-pulse rounded-full bg-green-500"></span>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-300">{searchCount} searches today</span>
            </div>
        </div>

        <div className="relative z-10 mb-4">
          <div className="relative group/input">
              <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                <i className={`fa-solid fa-magnifying-glass text-lg transition-colors duration-300 ${query ? 'text-primary dark:text-accent' : 'text-slate-300 dark:text-slate-600'}`}></i>
              </div>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder={MODE_META[mode].placeholder}
                className="w-full rounded-xl border-2 border-slate-200 bg-white py-3.5 pl-11 pr-28 text-base font-semibold text-slate-800 shadow-inner outline-none transition-all placeholder:font-normal placeholder:text-slate-400 focus:border-primary/60 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-accent/50 sm:text-lg"
              />
              <div className="absolute inset-y-0 right-2 flex items-center">
                  <button
                    type="button"
                    onClick={handleSearch}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-gradient-to-br from-primary to-primary-light px-4 text-sm font-bold text-white shadow-sm transition-all hover:shadow-primary/30 active:scale-95"
                  >
                      <i className="fa-solid fa-magnifying-glass text-xs"></i>
                      {mode === 'contacts' ? 'Find' : 'Search'}
                  </button>
              </div>
          </div>


          {/* REAL ESTATE MODE: Additional File Upload UI */}
          {mode === 'realestate' && (
              <div className="mt-4 animate-slide-down">
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 p-3 shadow-sm dark:border-blue-400/30 dark:bg-blue-500/10">
                      <div>
                          <p className="text-sm font-semibold text-[#003f87] dark:text-blue-200">
                            NC Insurance Tools property lookup
                          </p>
                          <p className="text-xs text-slate-600 dark:text-slate-300">
                            Type a home address, then open the agency property workspace with that address preloaded.
                          </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleNcInsuranceToolsOpen}
                        disabled={!query.trim()}
                        className="inline-flex items-center gap-2 rounded-lg bg-[#003f87] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#0076d3] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
                      >
                          <i className="fa-solid fa-house-circle-check text-xs"></i>
                          Open NC Tools
                      </button>
                  </div>
              </div>
          )}
          
          {/* The scrollbar is hidden, so a fade on the right edge is the only cue that
              more modes exist off-screen. It disappears at sm, where the row wraps. */}
          <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-white to-transparent dark:from-slate-900 sm:hidden"></div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:flex-wrap sm:overflow-visible [&::-webkit-scrollbar]:hidden">
             {modeButtons.map(btn => (
                <button
                  key={btn.mode}
                  onClick={() => {
                    setMode(btn.mode);
                    if (btn.mode === 'contacts') {
                      requestAnimationFrame(() => {
                        inputRef.current?.focus();
                        inputRef.current?.select();
                      });
                    }
                  }}
                  className={`group relative flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border px-3.5 py-2 text-sm font-semibold transition-all duration-200 ${
                    mode === btn.mode
                      ? 'border-[#003f87] bg-[#003f87] text-white shadow-sm'
                      : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-[#003f87] dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10 dark:hover:text-white'
                  }`}
                >
                  <i className={`fa-solid ${btn.icon} text-xs ${mode === btn.mode ? '' : 'text-slate-400 transition-colors group-hover:text-[#003f87] dark:group-hover:text-white'}`}></i>
                  {btn.label}
                  <kbd className={`hidden rounded px-1.5 py-0.5 font-mono text-[10px] font-bold md:inline-block ${
                    mode === btn.mode
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
                  }`}>
                    {btn.shortcut.replace('Alt + ', '⌥').replace('Ctrl + ', '⌃')}
                  </kbd>
                </button>
              ))}
          </div>
          </div>

          {mode === 'contacts' && <ContactLookup query={query} onQueryChange={setQuery} addToast={addToast} />}

          {/* Recent Searches History */}
          {mode !== 'contacts' && searchHistory.length > 0 && (
            <div className="mt-2.5 flex flex-wrap items-center gap-2 animate-fade-in pl-1">
              <span className="mr-1 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Recent</span>
              {searchHistory.map((historicQuery, idx) => (
                <button
                  key={`${historicQuery}-${idx}`}
                  onClick={() => handleHistoryClick(historicQuery)}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-all hover:border-primary/50 hover:bg-white hover:shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-accent/50 dark:hover:bg-white/10"
                >
                  {historicQuery}
                </button>
              ))}
              <button
                onClick={() => setSearchHistory([])}
                className="pl-1 text-xs font-semibold text-rose-500/80 transition-colors hover:text-rose-600"
              >
                Clear
              </button>
            </div>
          )}
        </div>
        
        <div className="relative z-10 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50/70 p-2 dark:border-white/10 dark:bg-white/[0.035]">
          <span className="hidden px-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 lg:inline-flex dark:text-slate-500">
            Workspace
          </span>
          <button onClick={handleNewFolder} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-600 transition-all hover:border-[#0076d3]/50 hover:text-[#003f87] hover:shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:text-white">
              <i className="fa-brands fa-google-drive text-xs text-slate-400"></i>
              Cloud Folder
          </button>

          <button onClick={handleNotesOpen} className="inline-flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3.5 py-2.5 text-sm font-semibold text-orange-700 transition-all hover:border-orange-300 hover:bg-white hover:shadow-sm dark:border-orange-400/30 dark:bg-orange-500/10 dark:text-orange-300">
              <i className="fa-solid fa-note-sticky text-xs"></i>
              Audit Memo
          </button>

          {mode === 'realestate' && (
              <button onClick={handleNcInsuranceToolsOpen} disabled={!query.trim()} className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-2.5 text-sm font-semibold text-[#003f87] transition-all hover:border-blue-300 hover:bg-white hover:shadow-sm disabled:opacity-60 dark:border-blue-400/30 dark:bg-blue-500/10 dark:text-blue-200">
                  <i className="fa-solid fa-house-circle-check text-xs"></i>
                  NC Tools
              </button>
          )}

          {/* Agency Matrix destinations — absorbed from the old Quick Links section so
              favorites live in ONE place (the launcher's Pinned row). */}
          <span className="mx-1 hidden h-6 w-px bg-slate-200 dark:bg-white/10 sm:block"></span>
          <span className="hidden px-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 lg:inline-flex dark:text-slate-500">
            Agency Matrix
          </span>
          {[
            { label: 'Matrix Home', href: 'https://agents.agencymatrix.com/#/', icon: 'fa-solid fa-house-chimney-window' },
            { label: 'New Prospect', href: 'https://agents.agencymatrix.com/customerEdit.php?id=0', icon: 'fa-solid fa-user-plus' },
            { label: 'Reports', href: 'https://agents.agencymatrix.com/#/reports', icon: 'fa-solid fa-chart-column' },
          ].map((link) => (
            <button
              key={link.label}
              onClick={() => window.open(link.href, '_blank')}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-600 transition-all hover:border-[#0076d3]/50 hover:text-[#003f87] hover:shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:text-white"
            >
              <i className={`${link.icon} text-xs text-slate-400`}></i>
              {link.label}
            </button>
          ))}
        </div>


        <div className="mt-4 border-t border-slate-100 pt-3 dark:border-white/10">
            <button
                type="button"
                onClick={() => {
                    setShowMoreCarriers(false);
                    setShowCarrierGateway((prev) => !prev);
                }}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-left transition hover:border-primary/40 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
            >
                <span className="flex items-center gap-3">
                    <i className="fa-solid fa-building-shield text-sm text-slate-400"></i>
                    <span>
                        <span className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                            Carrier Portals
                        </span>
                        <span className="block text-xs text-slate-500 dark:text-slate-400">
                            {showCarrierGateway ? 'Carrier shortcuts are open.' : 'Nationwide, Progressive, NC Grange, and more.'}
                        </span>
                    </span>
                </span>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm dark:bg-white/10 dark:text-slate-200">
                    <i className={`fa-solid ${showCarrierGateway ? 'fa-chevron-up' : 'fa-chevron-down'} text-sm`}></i>
                </span>
            </button>

            {showCarrierGateway && (
                <>
                    <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-7">
                        {DEFAULT_INSURANCE_PORTALS.map(renderPortalTile)}

                        {/* The rest of the carriers open in the panel below, so the daily row stays short. */}
                        <button
                            type="button"
                            onClick={() => setShowMoreCarriers((prev) => !prev)}
                            aria-expanded={showMoreCarriers}
                            aria-controls="more-carriers-panel"
                            className={`flex min-h-20 flex-col items-center justify-center rounded-xl border border-dashed p-3 text-center transition-all duration-300 ${
                                showMoreCarriers
                                    ? 'border-primary/50 bg-white shadow-sm dark:border-accent/50 dark:bg-white/10'
                                    : 'border-slate-300 bg-slate-50 hover:border-primary/40 hover:bg-white dark:border-white/20 dark:bg-white/5 dark:hover:bg-white/10'
                            }`}
                        >
                            <span className="mb-2 flex h-10 w-full items-center justify-center">
                                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-200/70 text-slate-600 dark:bg-white/10 dark:text-slate-200">
                                    <i className={`fa-solid ${showMoreCarriers ? 'fa-chevron-up' : 'fa-ellipsis'} text-sm`}></i>
                                </span>
                            </span>
                            <span className="text-[9px] font-black uppercase leading-tight tracking-widest text-slate-600 dark:text-slate-400">
                                More Carriers
                            </span>
                        </button>
                    </div>

                    {showMoreCarriers && (
                        <div
                            id="more-carriers-panel"
                            className="mt-2 rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-3 animate-slide-down dark:border-white/15 dark:bg-white/5"
                        >
                            <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                                Also Represented
                            </p>
                            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                                {MORE_CARRIER_PORTALS.map(renderPortalTile)}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
      </div>

      <Modal isOpen={isGisModalOpen} onClose={() => setIsGisModalOpen(false)} title="County Property Map">
          {gisInfo && (
              <div className="space-y-5">
                  <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5 text-center dark:border-blue-400/20 dark:bg-blue-500/10">
                      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#003f87] text-white shadow-sm">
                          <i className="fa-solid fa-map-location-dot"></i>
                      </span>
                      <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">Official mapping source identified for</p>
                      <p className="mt-1 font-outfit text-xl font-bold text-slate-900 dark:text-white">{gisInfo.county}</p>
                      {gisInfo.note && <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{gisInfo.note}</p>}
                  </div>
                  <a href={gisInfo.url} target="_blank" rel="noopener noreferrer" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#003f87] px-5 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#0076d3]">
                      Open Official County Map <i className="fa-solid fa-arrow-up-right-from-square text-xs"></i>
                  </a>
              </div>
          )}
      </Modal>

      <Modal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} title={reportSubject || 'Property Risk Report'} maxWidthClass="max-w-5xl">
        {isGeneratingReport && !reportHtml ? (
            <div className="flex h-80 flex-col items-center justify-center text-center">
                <div className="relative mb-6 h-20 w-20">
                    <div className="absolute inset-0 rounded-full border-4 border-slate-100 dark:border-white/10"></div>
                    <div className="absolute inset-0 animate-spin rounded-full border-4 border-[#0076d3] border-t-transparent"></div>
                    <i className="fa-solid fa-house-circle-check absolute inset-0 flex items-center justify-center text-2xl text-[#003f87] dark:text-sky-300"></i>
                </div>
                <p className="font-outfit text-2xl font-bold text-slate-900 dark:text-white">Building the property report…</p>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Reviewing property, GIS, flood, and carrier information.</p>
            </div>
        ) : (
            <div>
                <div className="mb-5 h-[min(62vh,650px)] w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-inner dark:border-white/10">
                    <iframe srcDoc={reportHtml} title="AI Property Report" className="w-full h-full border-0" sandbox="allow-same-origin" />
                </div>
                <div className="flex flex-wrap items-center justify-end gap-3">
                    <button onClick={handleReportDownload} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-[#0076d3]/50 hover:text-[#003f87] dark:border-white/10 dark:bg-white/5 dark:text-slate-200"><i className="fa-solid fa-download text-xs"></i> Save HTML</button>
                    <button onClick={handleReportPrint} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-[#0076d3]/50 hover:text-[#003f87] dark:border-white/10 dark:bg-white/5 dark:text-slate-200"><i className="fa-solid fa-print text-xs"></i> Print</button>
                    <button onClick={handleReportEmail} className="inline-flex items-center gap-2 rounded-xl bg-[#003f87] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#0076d3]"><i className="fa-solid fa-paper-plane text-xs"></i> Prepare Gmail Draft</button>
                </div>
            </div>
        )}
      </Modal>

      {isNotesModalOpen && !isNotesMinimized && (
        <Modal isOpen={true} onClose={handleNotesClose} title="Audit-Safe Compliance Memo" maxWidthClass="max-w-2xl">
            <div className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-slate-500 dark:text-slate-400">Turn raw notes, emails, PDFs, or images into a clear Matrix memo.</p>
                    <button onClick={() => setIsNotesMinimized(true)} className="inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-[#003f87] dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"><i className="fa-solid fa-window-minimize"></i> Minimize</button>
                </div>
                <div>
                    <label className="mb-2 flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
                        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-50 text-[10px] text-[#003f87] dark:bg-blue-500/15 dark:text-sky-300">1</span>
                        Customer name
                    </label>
                    <div className="relative">
                        <i className="fa-solid fa-user absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400"></i>
                        <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Enter the customer name" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm font-semibold text-slate-800 outline-none transition focus:border-[#0076d3] focus:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:bg-white/10" />
                    </div>
                </div>
                <div>
                    <div className="mb-3 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
                            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-50 text-[10px] text-[#003f87] dark:bg-blue-500/15 dark:text-sky-300">2</span>
                            Interaction notes or email thread
                        </label>
                        <div className="flex w-full gap-2 sm:w-auto">
                            <button 
                                onClick={() => notesFileInputRef.current?.click()} 
                                className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition sm:flex-none ${stagedNotesFile ? 'border-[#0076d3] bg-blue-50 text-[#003f87] dark:bg-blue-500/15 dark:text-sky-200' : 'border-slate-200 bg-white text-slate-600 hover:border-[#0076d3]/50 hover:text-[#003f87] dark:border-white/10 dark:bg-white/5 dark:text-slate-200'}`}
                                title="Attach a PDF or image"
                            >
                                <i className={`fa-solid ${stagedNotesFile ? 'fa-file-circle-check' : 'fa-paperclip'}`}></i>
                                {stagedNotesFile ? 'File ready' : 'Attach file'}
                            </button>
                            <input type="file" ref={notesFileInputRef} onChange={handleNotesFileChange} accept=".pdf,image/*" className="hidden" />
                            
                            <button onClick={handleOrganizeNotes} disabled={isOrganizingNotes} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#003f87] px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#0076d3] disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none">
                                {isOrganizingNotes ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-wand-magic-sparkles"></i>}
                                Organize notes
                            </button>
                        </div>
                    </div>
                    
                    {stagedNotesFile && (
                        <div className="mb-4 flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 p-3 animate-fade-in dark:border-blue-400/20 dark:bg-blue-500/10">
                            <div className="flex items-center gap-3">
                                <i className="fa-solid fa-file-invoice text-lg text-[#003f87] dark:text-sky-300"></i>
                                <span className="max-w-[220px] truncate text-xs font-semibold text-slate-700 dark:text-slate-200">{stagedNotesFile.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={handleProcessNotesAi} 
                                    disabled={isProcessingNotesFile}
                                    className="inline-flex items-center gap-2 rounded-lg bg-[#003f87] px-3 py-1.5 text-xs font-bold text-white transition hover:bg-[#0076d3] disabled:opacity-60"
                                >
                                    {isProcessingNotesFile ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-shield-halved"></i>}
                                    Extract notes
                                </button>
                                <button onClick={() => setStagedNotesFile(null)} aria-label="Remove attached file" className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white hover:text-rose-500 dark:hover:bg-white/10"><i className="fa-solid fa-times"></i></button>
                            </div>
                        </div>
                    )}

                    <textarea 
                        value={customerNotes} 
                        onChange={(e) => setCustomerNotes(e.target.value)} 
                        placeholder="Paste the email thread, call notes, or action details here…"
                        rows={8}
                        className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium leading-relaxed text-slate-800 outline-none transition focus:border-[#0076d3] focus:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:bg-white/10 custom-scrollbar"
                    />
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.035]">
                    <div className="mb-3 flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
                        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-50 text-[10px] text-[#003f87] dark:bg-blue-500/15 dark:text-sky-300">3</span>
                        Save the memo to your workflow
                    </div>
                    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <button onClick={handleNotesClose} className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10">Cancel</button>
                    <button onClick={handleNotesSave} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#003f87] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#0076d3]">
                        <i className="fa-solid fa-share-from-square"></i>
                        Copy Memo & Open Matrix
                    </button>
                    </div>
                </div>
            </div>
        </Modal>
      )}
    </>
  );
};

export default SearchCard;
