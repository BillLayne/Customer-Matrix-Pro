
import React, { useState, useRef, useEffect } from 'react';
import type { SearchMode } from '../types';
import { MODE_META, NC_COUNTY_GIS_DATA } from '../constants';
import Modal from './Modal';
import { GoogleGenAI } from "@google/genai";

interface SearchCardProps {
  addToast: (message: string, type?: 'success' | 'warning' | 'danger' | 'info') => void;
  searchCount: number;
  onSearch: () => void;
}

const StatCard: React.FC<{ value: string | number; label: string }> = ({ value, label }) => (
    <div className="bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark rounded-lg p-3 text-center">
        <div className="text-2xl font-bold text-primary dark:text-accent">{value}</div>
        <div className="text-xs text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-wider font-semibold">{label}</div>
    </div>
);

const SearchCard: React.FC<SearchCardProps> = ({ addToast, searchCount, onSearch }) => {
  const [mode, setMode] = useState<SearchMode>('agency');
  const [query, setQuery] = useState('');
  const [lastSync, setLastSync] = useState('--');
  const [isGisModalOpen, setIsGisModalOpen] = useState(false);
  const [gisInfo, setGisInfo] = useState<{ county: string; url: string; note?: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportHtml, setReportHtml] = useState('');
  const [reportSubject, setReportSubject] = useState('');

  const GOOGLE_DRIVE_CONSTANTS = {
      agencyEmail: 'docs@billlayneinsurance.com',
      clientsFolderId: '11O0Cm9gOdgXp_j8OXMO4Pm5tqh18uXd5'
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
     const updateSyncTime = () => {
        const syncDate = new Date();
        localStorage.setItem("lastSync", syncDate.toISOString());
        setLastSync("Now");
      };
      updateSyncTime();
      const interval = setInterval(updateSyncTime, 300000); // 5 minutes
      return () => clearInterval(interval);
  }, []);

  const handleSearch = () => {
    if (!query.trim()) {
      addToast('Please enter a search term', 'warning');
      inputRef.current?.focus();
      return;
    }
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
        url = `https://www.zillow.com/homes/${encodeURIComponent(query)}_rb/`;
        break;
      case 'people':
        url = `https://www.truepeoplesearch.com/results?name=${encodeURIComponent(query)}`;
        break;
      case 'onedrive': {
        const clientName = query.trim();
        const searchQuery = `parent:${GOOGLE_DRIVE_CONSTANTS.clientsFolderId} title:(${clientName})`;
        url = `https://drive.google.com/drive/search?q=${encodeURIComponent(searchQuery)}&authuser=${GOOGLE_DRIVE_CONSTANTS.agencyEmail}`;
        break;
      }
    }
    window.open(url, '_blank');
    addToast(`Searching ${mode}...`, 'info');
    setQuery('');
  };

  const getCountyFromAddress = (address: string): string | null => {
    const lowerAddress = address.toLowerCase();
    for (const countyKey in NC_COUNTY_GIS_DATA) {
      if (lowerAddress.includes(countyKey)) {
        return countyKey;
      }
    }
    return null;
  };

  const handleGisSearch = () => {
    if (!query.trim()) {
      addToast('Please enter an address for GIS search.', 'warning');
      inputRef.current?.focus();
      return;
    }

    const countyKey = getCountyFromAddress(query);

    if (countyKey && NC_COUNTY_GIS_DATA[countyKey]) {
      const countyData = NC_COUNTY_GIS_DATA[countyKey];
      const searchUrl = countyData.url.replace('{query}', encodeURIComponent(query));
      setGisInfo({ county: countyData.name, url: searchUrl, note: countyData.note });
      setIsGisModalOpen(true);
    } else {
      addToast('Could not determine county from address. Please include county name (e.g., "Surry").', 'danger');
    }
  };
  
  const handleGenerateReport = async () => {
    if (!query.trim()) {
        addToast('Please enter an address to generate a report.', 'warning');
        return;
    }
    setIsGeneratingReport(true);
    setIsReportModalOpen(true);
    setReportHtml('');
    setReportSubject('');

    try {
        const prompt = `
You are an expert real estate data analyst for Bill Layne Insurance Agency. Your goal is to use a web search to gather comprehensive property details for the address provided by the user, and then format this information into a professional, beautifully designed, mobile-optimized, and Gmail-compatible HTML email.

**Address to Research:**
---
${query.trim()}
---

**Your Task:**
1.  **Search & Extract:** Conduct a thorough web search for the property. Extract the following key details. If a detail cannot be found, explicitly state "Not Found" in the report.
    *   **Property Overview:** Full Address, County, Property Type (e.g., Single-Family).
    *   **Key Facts:** Year Built, Living Area (Sq. Ft.), Lot Size, Bedrooms, Bathrooms, Number of Stories.
    *   **Construction Details:** Foundation, Exterior Walls, Roof Material & Type, Garage description.
    *   **Features & Systems:** Heating/Cooling systems, Fireplace(s).
    *   **Valuation:** Estimated Value, Last Sale Date & Price.
    *   **Location Risk Factors:** Note any available information on flood zones or proximity to a fire station/hydrant.
2.  **Generate a Styled HTML Email:** Format the entire output as a single, beautifully designed HTML document.

**Output:** Your response MUST be a single, raw JSON object (no markdown, no surrounding text) with two keys:
1. "subject": A clear and concise subject line for the email (e.g., "Property Report for 123 Main St, Elkin NC").
2. "htmlBody": The full, self-contained HTML code for the email body.

**HTML Requirements (CRITICAL):**

1.  **Gmail & Mobile First:**
    *   Use a table-based layout (\`<table>\`, \`<tr>\`, \`<td>\`) for maximum compatibility.
    *   All CSS MUST be inlined (\`style="..."\`).
    *   Ensure the design is responsive and looks great on mobile devices, with a main content wrapper of \`max-width: 600px;\`.

2.  **Branding & Style:**
    *   **Agency:** Bill Layne Insurance Agency
    *   **Agency Logos:**
        *   **For light backgrounds:** \`https://i.imgur.com/O25RJzu.png\`
        *   **For dark backgrounds:** \`https://i.imgur.com/qoWnvrv.png\` (white text version)
    *   **Primary Color (Deep Blue):** \`#003366\`
    *   **Accent Color (Golden Yellow):** \`#FFC300\`
    *   **Font:** Use a web-safe font stack like \`'Segoe UI', Inter, Arial, sans-serif\`.
    *   **Visuals:** Use emojis strategically (e.g., 🏡, 🏗️, 💰).

3.  **Content Structure:**
    *   **Header:** Agency logo centered at the top. Use the appropriate logo based on the header's background color.
    *   **Title:** A clear, bold title like "Homeowner's Insurance Property Report".
    *   **Clear Sections:** Use styled headings to organize the data (e.g., "Property Overview", "Construction Details"). Use tables for structured data to make it easy to read.
    *   **Footer:** A branded footer with this exact agency contact information: Bill Layne Insurance Agency, 1283 N Bridge ST, Elkin NC 28621, Phone: 336-835-1993, Email: save@billlayneinsurance.com, Website: BillLayneInsurance.com.

4.  **Print Optimization:**
    *   Include a \`<style type="text/css" media="print">\` block with rules like \`@page { margin: 1in; }\` and \`.no-break { page-break-inside: avoid; }\`.
    *   Apply the \`no-break\` class to important elements like data tables.
`;
        const API_KEY = process.env.API_KEY;
        if (!API_KEY) throw new Error("API key not found.");
        const ai = new GoogleGenAI({ apiKey: API_KEY });
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                tools: [{googleSearch: {}}],
            }
        });

        if (!response.text) {
             throw new Error("Content generation failed: Empty response from AI.");
        }

        let jsonString = response.text
            .trim()
            .replace(/^```json\s*/, '')
            .replace(/\s*```$/, '');

        const parsedResult = JSON.parse(jsonString);

        if (!parsedResult.subject || !parsedResult.htmlBody) {
            throw new Error('AI response did not match the required format.');
        }
    
        let finalHtml = parsedResult.htmlBody;
        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;

        if (groundingChunks && groundingChunks.length > 0) {
            let sourcesHtml = '<div style="margin-top: 20px; padding-top: 10px; border-top: 1px solid #eeeeee; text-align: left; font-size: 10px; color: #777777;"><strong>Sources:</strong><ul>';
            groundingChunks.forEach((chunk: any) => {
                if (chunk.web) {
                    sourcesHtml += `<li><a href="${chunk.web.uri}" target="_blank" style="color: #003366;">${chunk.web.title || chunk.web.uri}</a></li>`;
                }
            });
            sourcesHtml += '</ul></div>';

            // Inject sources before the closing body tag
            if (finalHtml.includes('</body>')) {
              finalHtml = finalHtml.replace('</body>', `${sourcesHtml}</body>`);
            } else {
              finalHtml += sourcesHtml;
            }
        }
    
        setReportHtml(finalHtml);
        setReportSubject(parsedResult.subject);
        addToast('Property report generated successfully!', 'success');

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        addToast(`Report generation failed: ${errorMessage}`, 'danger');
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
      } else {
          addToast('Could not open print window. Please check your browser settings.', 'warning');
      }
  };

  const handleReportEmail = async () => {
      if (!reportHtml) return;
      let contentToCopy = reportHtml;
      const bodyContentMatch = reportHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i);
      if (bodyContentMatch && bodyContentMatch[1]) {
          contentToCopy = bodyContentMatch[1];
      }
      try {
          const blob = new Blob([contentToCopy], { type: 'text/html' });
          // @ts-ignore
          const clipboardItem = new ClipboardItem({ 'text/html': blob });
          // @ts-ignore
          await navigator.clipboard.write([clipboardItem]);
          addToast('Report copied! Paste it into the Gmail window.', 'success');
      } catch (error) {
          try {
              await navigator.clipboard.writeText(reportHtml);
              addToast('Copied report as HTML code.', 'info');
          } catch (copyError) {
              addToast('Could not copy report automatically.', 'danger');
              return;
          }
      }
      const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(reportSubject)}`;
      window.open(gmailUrl, '_blank');
  };

  const handleNewFolder = () => {
    const url = `https://drive.google.com/drive/folders/${GOOGLE_DRIVE_CONSTANTS.clientsFolderId}?authuser=${GOOGLE_DRIVE_CONSTANTS.agencyEmail}`;
    window.open(url, '_blank');
    addToast('Opening Client folder directory...', 'info');
  };

  const modeButtons: { mode: SearchMode, icon: string, label: string }[] = [
    { mode: 'agency', icon: 'fa-shield-halved', label: 'Agency Matrix' },
    { mode: 'web', icon: 'fa-brands fa-google', label: 'Web Search' },
    { mode: 'realestate', icon: 'fa-solid fa-house', label: 'Real Estate' },
    { mode: 'people', icon: 'fa-solid fa-user', label: 'People' },
    { mode: 'onedrive', icon: 'fa-brands fa-google-drive', label: 'Client Folder' },
  ];

  return (
    <>
      <div className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl shadow-lg p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-secondary to-accent"></div>
        
        <div className="mb-5">
          <h2 className="text-xl font-bold flex items-center gap-3">
            <i className="fa-solid fa-magnifying-glass-dollar text-primary dark:text-accent"></i>
            Unified Customer Search
            <span className="text-xs font-bold uppercase bg-gradient-to-r from-primary to-secondary text-white px-2.5 py-1 rounded-full">Pro</span>
          </h2>
          <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mt-1">Quickly find customers, properties, and information.</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 mb-5">
          {modeButtons.map(btn => (
            <button 
              key={btn.mode}
              onClick={() => setMode(btn.mode)}
              className={`px-4 py-3 rounded-lg font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 border-2 ${
                mode === btn.mode 
                  ? 'bg-gradient-to-r from-primary to-secondary text-white border-transparent shadow-md' 
                  : 'bg-card-light dark:bg-card-dark text-text-secondary-light dark:text-text-secondary-dark border-border-light dark:border-border-dark hover:border-secondary dark:hover:border-accent hover:shadow-md'
              }`}
            >
              <i className={`fa-solid ${btn.icon}`}></i>
              <span className='hidden md:inline'>{btn.label}</span>
            </button>
          ))}
        </div>

        <div className="relative mb-4">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder={MODE_META[mode].placeholder}
            className="w-full bg-bg-light dark:bg-bg-dark border-2 border-border-light dark:border-border-dark rounded-lg py-3 pl-4 pr-12 text-base focus:border-primary dark:focus:border-accent focus:ring-2 focus:ring-primary/20 dark:focus:ring-accent/20 outline-none transition"
          />
          <i className="fa-solid fa-magnifying-glass absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary-light dark:text-text-secondary-dark"></i>
        </div>
        
        <div className={`grid grid-cols-2 md:grid-cols-3 ${mode === 'realestate' ? 'lg:grid-cols-6' : 'lg:grid-cols-5'} gap-3`}>
          <button onClick={handleSearch} className="col-span-2 md:col-span-3 lg:col-span-1 w-full bg-gradient-to-r from-primary to-secondary text-white font-bold py-3 rounded-lg shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2">
              <i className="fa-solid fa-magnifying-glass"></i> Search
          </button>
          <button onClick={() => window.open("https://agents.agencymatrix.com/#/", "_blank")} className="bg-bg-light dark:bg-card-dark border-2 border-border-light dark:border-border-dark font-semibold py-3 rounded-lg hover:border-secondary dark:hover:border-accent hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2">
              <i className="fa-solid fa-external-link-alt"></i> Open Matrix
          </button>
          <button onClick={() => window.open("https://agents.agencymatrix.com/customerEdit.php?id=0", "_blank")} className="bg-accent text-white font-bold py-3 rounded-lg shadow-md shadow-accent/30 hover:shadow-lg hover:shadow-accent/40 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2">
              <i className="fa-solid fa-user-plus"></i> Add Customer
          </button>
          <button onClick={handleNewFolder} className="bg-sky-500 text-white font-bold py-3 rounded-lg shadow-md shadow-sky-500/30 hover:shadow-lg hover:shadow-sky-500/40 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2">
              <i className="fa-solid fa-folder-plus"></i> New Folder
          </button>
          {mode === 'realestate' && (
              <>
                <button onClick={handleGisSearch} className="bg-gradient-to-br from-green-600 to-green-500 text-white font-bold py-3 rounded-lg shadow-md shadow-green-600/30 hover:shadow-lg hover:shadow-green-600/40 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2">
                    <i className="fa-solid fa-map-location-dot"></i> Tax GIS
                </button>
                <button onClick={handleGenerateReport} disabled={isGeneratingReport || !query.trim()} className="bg-gradient-to-br from-purple-600 to-indigo-500 text-white font-bold py-3 rounded-lg shadow-md shadow-purple-600/30 hover:shadow-lg hover:shadow-purple-600/40 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                    {isGeneratingReport ? <><i className="fa-solid fa-spinner fa-spin"></i> Generating...</> : <><i className="fa-solid fa-wand-magic-sparkles"></i> AI Report</>}
                </button>
              </>
          )}
        </div>

        <div className="mt-5 pt-5 border-t border-border-light dark:border-border-dark grid grid-cols-3 gap-3">
          <StatCard value={searchCount} label="Searches Today" />
          <StatCard value="7" label="Active Portals" />
          <StatCard value={lastSync} label="Last Sync" />
        </div>
      </div>

      <Modal isOpen={isGisModalOpen} onClose={() => setIsGisModalOpen(false)} title="County GIS Information">
          {gisInfo ? (
              <div className="text-center">
                  <p className="mb-4">
                      Found GIS data for <span className="font-bold">{gisInfo.county}</span>. Click the button below to open the county's parcel information site in a new tab.
                  </p>
                  {gisInfo.note && (
                      <p className="text-sm bg-yellow-100 dark:bg-yellow-900/50 border border-yellow-300 dark:border-yellow-700 rounded-md p-3 mb-4">
                          <i className="fa-solid fa-triangle-exclamation mr-2"></i>
                          {gisInfo.note}
                      </p>
                  )}
                  <a
                      href={gisInfo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setIsGisModalOpen(false)}
                      className="inline-block w-full bg-primary text-white font-bold py-3 px-6 rounded-lg shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
                  >
                      <i className="fa-solid fa-external-link-alt mr-2"></i>
                      Open {gisInfo.county} GIS
                  </a>
              </div>
          ) : (
              <p>Loading GIS information...</p>
          )}
      </Modal>

      <Modal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} title={reportSubject || 'Generating Property Report...'}>
        {isGeneratingReport && !reportHtml ? (
            <div className="flex flex-col items-center justify-center h-96 text-text-secondary-light dark:text-text-secondary-dark">
                <i className="fa-solid fa-spinner fa-spin text-3xl mb-4"></i>
                <p className="font-semibold">AI is researching the property...</p>
                <p className="text-xs mt-1">This may take a moment.</p>
            </div>
        ) : (
            <div>
                <div className="w-full h-96 bg-white dark:bg-bg-dark border border-border-light dark:border-border-dark rounded-md overflow-hidden mb-4">
                    <iframe
                        srcDoc={reportHtml}
                        title="AI Property Report"
                        className="w-full h-full border-0"
                        sandbox="allow-same-origin"
                    />
                </div>
                <div className="flex items-center justify-end gap-2">
                    <button onClick={handleReportDownload} title="Download HTML" className="px-3 py-1.5 text-xs bg-card-light dark:bg-card-dark rounded border border-border-light dark:border-border-dark hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center gap-1.5">
                       <i className="fa-solid fa-download"></i> <span className="hidden sm:inline">Download</span>
                    </button>
                    <button onClick={handleReportPrint} title="Print" className="px-3 py-1.5 text-xs bg-card-light dark:bg-card-dark rounded border border-border-light dark:border-border-dark hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center gap-1.5">
                       <i className="fa-solid fa-print"></i> <span className="hidden sm:inline">Print</span>
                    </button>
                    <button onClick={handleReportEmail} title="Email" className="px-3 py-1.5 text-xs bg-card-light dark:bg-card-dark rounded border border-border-light dark:border-border-dark hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center gap-1.5">
                       <i className="fa-solid fa-envelope"></i> <span className="hidden sm:inline">Email</span>
                    </button>
                </div>
            </div>
        )}
      </Modal>
    </>
  );
};

export default SearchCard;