import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { Portal, SearchMode } from '../types';
import { MODE_META, NC_COUNTY_GIS_DATA, DEFAULT_INSURANCE_PORTALS, MORE_CARRIER_PORTALS } from '../constants';
import Modal from './Modal';
import { requestAi } from '../services/aiClient';
import type { AiTask, AiAttachment } from '../services/aiClient';
import { useLocalStorage } from '../hooks/useLocalStorage';
import ContactLookup from './ContactLookup';
import DOMPurify from 'dompurify';

interface SearchCardProps {
  addToast: (message: string, type?: 'success' | 'warning' | 'danger' | 'info') => void;
  searchCount: number;
  onSearch: () => void;
  active?: boolean;
}
const NC_INSURANCE_TOOLS_AGENCY_URL = 'https://26d5834f.nc-insurance-tools-gemini.pages.dev/';
const buildNcInsuranceToolsUrl = (address: string) =>
  NC_INSURANCE_TOOLS_AGENCY_URL + '?address=' + encodeURIComponent(address.trim());
const BLI_CLIENTS_DRIVE_ID = '0AHhWG49MZdQjUk9PVA';
const DRIVE_ACCOUNT_EMAIL = 'Bill@billlayneinsurance.com';
const withAuthUser = (url: string) =>
  url + (url.includes('?') ? '&' : '?') + 'authuser=' + encodeURIComponent(DRIVE_ACCOUNT_EMAIL);
const clientFoldersRootUrl = () => withAuthUser('https://drive.google.com/drive/folders/' + BLI_CLIENTS_DRIVE_ID);
const clientFolderSearchUrl = (name: string) =>
  withAuthUser('https://drive.google.com/drive/search?q=' + encodeURIComponent('title:' + name.trim()));
const matrixUrl = (name: string) => 'https://agents.agencymatrix.com/#/customer/search?selection=' +
  (/\d+/.test(name) ? 'Address' : 'Name') + '&query=' + encodeURIComponent(name);
const getErrorMessage = (error: unknown) => error instanceof Error ? error.message : 'Something went wrong. Please retry.';
const isCancelled = (error: unknown) => error instanceof Error && error.name === 'AbortError';
const DRAFT_KEY = 'matrix-pro-memo-draft';
const MAX_AI_FILE_BYTES = 10 * 1024 * 1024;
const MAX_AI_BASE64_BYTES = 14 * 1024 * 1024;
const AI_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const LOCAL_LOGOS: Record<string, string> = {
  nationwide: '/nationwide.png', 'national-general': '/national_general.png',
  progressive: '/progressive.png', foremost: '/foremost.jpg', 'nc-grange': '/nc_grange.png', ncjua: '/ncjua.png',
};
interface MemoDraft { customerName: string; text: string; originalText: string | null }
const emptyDraft = (): MemoDraft => ({ customerName: '', text: '', originalText: null });
const readDraft = (): MemoDraft => {
  try {
    const value = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
    if (value && typeof value.customerName === 'string' && typeof value.text === 'string') {
      return { customerName: value.customerName, text: value.text,
        originalText: typeof value.originalText === 'string' ? value.originalText : null };
    }
  } catch { /* Blocked storage must not prevent editing. */ }
  return emptyDraft();
};
const writeDraft = (draft: MemoDraft) => {
  if (!draft.customerName && !draft.text && draft.originalText === null) localStorage.removeItem(DRAFT_KEY);
  else localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
};
const validateAiFiles = (files: File[]) => {
  if (files.some(file => !AI_FILE_TYPES.includes(file.type) || !file.size)) throw new Error('Attach a nonempty PDF, JPG, PNG, WebP, or GIF.');
  if (files.reduce((sum, file) => sum + file.size, 0) > MAX_AI_FILE_BYTES) throw new Error('Attachments exceed the 10 MiB total limit.');
};
const readAttachment = (file: File, signal: AbortSignal): Promise<AiAttachment> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  const cancel = () => reader.abort();
  const cleanup = () => signal.removeEventListener('abort', cancel);
  reader.onload = () => {
    cleanup();
    if (signal.aborted) return reject(new DOMException('Request cancelled.', 'AbortError'));
    resolve({ mimeType: file.type, data: String(reader.result).split(',')[1], name: file.name });
  };
  reader.onerror = () => { cleanup(); reject(new Error('Could not read ' + file.name + '. Please attach it again.')); };
  reader.onabort = () => { cleanup(); reject(new DOMException('Request cancelled.', 'AbortError')); };
  if (signal.aborted) return reject(new DOMException('Request cancelled.', 'AbortError'));
  signal.addEventListener('abort', cancel, { once: true });
  reader.readAsDataURL(file);
});
const parseJsonFromText = <T,>(text: string): T => JSON.parse(text) as T;
const safeWebUrl = (value: string) => {
  const url = new URL(value);
  if (!['https:', 'http:'].includes(url.protocol)) throw new Error('The response included an invalid web link. Please retry.');
  return url.href;
};
// AI markup remains untrusted when copied, downloaded, or printed.
const safeReportHtml = (html: string) => {
  const clean = DOMPurify.sanitize(html, {
    WHOLE_DOCUMENT: true,
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['iframe', 'object', 'embed', 'form', 'input', 'button', 'textarea', 'select', 'meta', 'base', 'link'],
    FORBID_ATTR: ['srcdoc', 'formaction', 'action', 'srcset'],
  });
  const doc = new DOMParser().parseFromString(clean, 'text/html');
  doc.querySelectorAll('*').forEach(node => {
    for (const attr of Array.from(node.attributes)) {
      if (/^on/i.test(attr.name) || ['srcdoc', 'formaction', 'action', 'srcset'].includes(attr.name)) node.removeAttribute(attr.name);
      if (['href', 'src', 'xlink:href'].includes(attr.name)) {
        try { node.setAttribute(attr.name, safeWebUrl(attr.value)); } catch { node.removeAttribute(attr.name); }
      }
    }
    if (node.tagName === 'A') { node.setAttribute('target', '_blank'); node.setAttribute('rel', 'noopener noreferrer'); }
  });
  return '<!doctype html>\n' + doc.documentElement.outerHTML;
};
type SearchEntry = string | { query: string; mode: SearchMode };

const SearchCard: React.FC<SearchCardProps> = ({ addToast, searchCount, onSearch, active = true }) => {
  const [mode, setMode] = useState<SearchMode>('agency');
  const [query, setQuery] = useState('');
  const [searchHistory, setSearchHistory] = useLocalStorage<SearchEntry[]>('matrix-pro-search-history', []);
  const [showCarrierGateway, setShowCarrierGateway] = useLocalStorage<boolean>('matrix-pro-show-carrier-gateway', false);
  const [showMoreCarriers, setShowMoreCarriers] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isGisModalOpen, setIsGisModalOpen] = useState(false);
  const [gisInfo, setGisInfo] = useState<{ county: string; url: string; note?: string } | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportHtml, setReportHtml] = useState('');
  const [reportSubject, setReportSubject] = useState('');
  const [propertyFiles, setPropertyFiles] = useState<File[]>([]);
  const propertyFileInputRef = useRef<HTMLInputElement>(null);
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [isNotesMinimized, setIsNotesMinimized] = useState(false);
  const [draft, setDraft] = useState<MemoDraft>(readDraft);
  const { customerName, text: customerNotes } = draft;
  const setCustomerName = (value: string) => setDraft(prev => ({ ...prev, customerName: value }));
  const setCustomerNotes = (value: string) => setDraft(prev => ({ ...prev, text: value }));
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const [draftStatus, setDraftStatus] = useState(() => draft.text || draft.customerName ? 'Restored draft on this device' : '');
  const [storageError, setStorageError] = useState('');
  const [stagedNotesFile, setStagedNotesFile] = useState<File | null>(null);
  const notesFileInputRef = useRef<HTMLInputElement>(null);
  const [busyTask, setBusyTask] = useState<AiTask | null>(null);
  const [isCopying, setIsCopying] = useState(false);
  const [notesError, setNotesError] = useState('');
  const [notesNotice, setNotesNotice] = useState('');
  const [propertyError, setPropertyError] = useState('');
  const [searchError, setSearchError] = useState('');
  const [lastNotesTask, setLastNotesTask] = useState<AiTask | null>(null);
  const [lastPropertyTask, setLastPropertyTask] = useState<AiTask | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const popupRef = useRef<Window | null>(null);
  const mountedRef = useRef(true);
  const notesBusy = busyTask === 'organize-notes' || busyTask === 'extract-notes';
  const isGeneratingReport = busyTask === 'property-report';
  const isGisSearching = busyTask === 'county-map';
  const isOrganizingNotes = busyTask === 'organize-notes';
  const isProcessingNotesFile = busyTask === 'extract-notes';
  const hasDraft = Boolean(customerName || customerNotes || stagedNotesFile || draft.originalText !== null);
  const persistDraft = useCallback(() => {
    try {
      writeDraft(draftRef.current);
      if (mountedRef.current) {
        setStorageError('');
        setDraftStatus(draftRef.current.text || draftRef.current.customerName ? 'Draft saved on this device' : '');
      }
    } catch {
      if (mountedRef.current) setStorageError('Draft could not be saved on this device. Keep this page open or copy the text before leaving.');
    }
  }, []);
  useEffect(() => {
    setDraftStatus(draft.text || draft.customerName ? 'Saving draft...' : '');
    const timer = window.setTimeout(persistDraft, 450);
    return () => clearTimeout(timer);
  }, [draft, persistDraft]);
  useEffect(() => {
    mountedRef.current = true;
    const flush = () => persistDraft();
    window.addEventListener('pagehide', flush);
    const hidden = () => { if (document.visibilityState === 'hidden') flush(); };
    document.addEventListener('visibilitychange', hidden);
    return () => {
      mountedRef.current = false;
      requestRef.current?.abort();
      popupRef.current?.close();
      persistDraft();
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', hidden);
    };
  }, [persistDraft]);
  const cancelRequest = useCallback(() => {
    requestRef.current?.abort(); requestRef.current = null; setBusyTask(null);
  }, []);
  useEffect(() => {
    if (!active) {
      cancelRequest(); setIsGisModalOpen(false); setIsReportModalOpen(false);
      setIsNotesModalOpen(false); setIsNotesMinimized(true); persistDraft();
    }
  }, [active, cancelRequest, persistDraft]);
  const handleNotesOpen = () => {
    if (!hasDraft && query.trim()) setCustomerName(query.trim());
    setIsNotesModalOpen(true); setIsNotesMinimized(false);
  };
  const handleNotesClose = () => {
    if (notesBusy) cancelRequest();
    persistDraft(); setIsNotesModalOpen(false); setIsNotesMinimized(true);
  };
  useEffect(() => {
    if (!active) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target instanceof HTMLElement ? event.target : null;
      const inEditor = target?.isContentEditable || target?.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"])');
      if (event.defaultPrevented || event.isComposing || document.querySelector('[role="dialog"],dialog[open]') || inEditor) return;
      if (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault(); inputRef.current?.focus(); inputRef.current?.select(); return;
      }
      if ((event.altKey && event.key.toLowerCase() === 'n') ||
          ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'm')) {
        event.preventDefault(); handleNotesOpen(); return;
      }
      const shortcuts: Record<string, SearchMode> = { w: 'web', h: 'realestate', p: 'people', f: 'onedrive', c: 'contacts' };
      const next = event.altKey ? shortcuts[event.key.toLowerCase()] :
        (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'm' ? 'agency' : undefined;
      if (next) { event.preventDefault(); setMode(next); inputRef.current?.focus(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [active, query, hasDraft]);
  useEffect(() => {
    if (!showMoreCarriers || !active) return;
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setShowMoreCarriers(false); };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [showMoreCarriers, active]);

  const historyEntries = (Array.isArray(searchHistory) ? searchHistory : []).flatMap(entry => {
    if (typeof entry === 'string') return [{ query: entry, mode: null as SearchMode | null }];
    return entry && typeof entry.query === 'string' && Object.prototype.hasOwnProperty.call(MODE_META, entry.mode) ? [entry] : [];
  }).slice(0, 6);
  const runSearch = (value = query, selectedMode = mode) => {
    if (!value.trim()) { setSearchError('Enter a search term.'); inputRef.current?.focus(); return; }
    setSearchError(''); setQuery(value); setMode(selectedMode);
    setSearchHistory(prev => [{ query: value.trim(), mode: selectedMode }, ...(Array.isArray(prev) ? prev : []).filter(entry => {
      const text = typeof entry === 'string' ? entry : entry?.query;
      return typeof text === 'string' && !(text.toLowerCase() === value.trim().toLowerCase() && (typeof entry === 'string' || entry.mode === selectedMode));
    })].slice(0, 6));
    onSearch();
    let url = '';
    switch (selectedMode) {
      case 'agency': url = matrixUrl(value); break;
      case 'web': url = 'https://www.google.com/search?q=' + encodeURIComponent(value); break;
      case 'realestate': url = buildNcInsuranceToolsUrl(value); break;
      case 'people': url = 'https://www.truepeoplesearch.com/results?name=' + encodeURIComponent(value); break;
      case 'onedrive': url = clientFolderSearchUrl(value); break;
      case 'contacts': return;
    }
    const opened = window.open(url, '_blank');
    if (opened) opened.opener = null;
    else setSearchError('The search window was blocked. Allow pop-ups and retry.');
  };
  const handleSearch = () => runSearch();
  const handleNcInsuranceToolsOpen = () => runSearch(query, 'realestate');
  const handleNewFolder = () => {
    const opened = window.open(query.trim() ? clientFolderSearchUrl(query) : clientFoldersRootUrl(), '_blank');
    if (opened) opened.opener = null;
    else setSearchError('The folder window was blocked. Allow pop-ups and retry.');
  };
  const handlePropertyFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = [...propertyFiles, ...Array.from(event.target.files || [])];
    event.target.value = '';
    try { validateAiFiles(files); setPropertyFiles(files); setPropertyError(''); }
    catch (error) { setPropertyError(getErrorMessage(error)); }
  };
  const removePropertyFile = (index: number) => setPropertyFiles(prev => prev.filter((_, i) => i !== index));
  const handleNotesFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    try { validateAiFiles([file]); setStagedNotesFile(file); setNotesError(''); }
    catch (error) { setNotesError(getErrorMessage(error)); }
  };
  const runAiTask = async (task: AiTask) => {
    if (requestRef.current || isCopying) return;
    const forNotes = task === 'organize-notes' || task === 'extract-notes';
    if (task === 'organize-notes' && !customerNotes.trim()) return;
    if (task === 'extract-notes' && !stagedNotesFile) return;
    if (!forNotes && !query.trim()) { setPropertyError('Enter a property address.'); return; }
    const controller = new AbortController();
    requestRef.current = controller; setBusyTask(task);
    if (forNotes) { setNotesError(''); setNotesNotice(''); setLastNotesTask(task); }
    else { setPropertyError(''); setLastPropertyTask(task); }
    if (task === 'property-report') { setIsReportModalOpen(true); setReportHtml(''); setReportSubject(''); }
    if (task === 'county-map') { setGisInfo(null); setIsGisModalOpen(true); }
    try {
      const files = task === 'extract-notes' ? [stagedNotesFile!] : task === 'property-report' ? propertyFiles : [];
      validateAiFiles(files);
      const attachments: AiAttachment[] = [];
      for (const file of files) attachments.push(await readAttachment(file, controller.signal));
      if (attachments.reduce((sum, attachment) => sum + attachment.data.length, 0) > MAX_AI_BASE64_BYTES) throw new Error('Encoded attachments exceed 14 MiB. Remove a file and retry.');
      const text = await requestAi({
        task, text: forNotes ? customerNotes : query,
        ...(forNotes ? { customerName } : { address: query.trim() }),
        ...(task === 'extract-notes' ? { attachment: attachments[0] } : attachments.length ? { attachments } : {}),
      }, { signal: controller.signal });
      if (!mountedRef.current || controller.signal.aborted || requestRef.current !== controller) return;
      if (forNotes) {
        // Preserve exact pre-rewrite text, including original timestamps.
        setDraft(prev => ({ ...prev, originalText: prev.text, text }));
        setNotesNotice('AI draft ready for review. Verify dates and actions before pasting into Matrix.');
      } else if (task === 'property-report') {
        const data = parseJsonFromText<{ subject: string; htmlBody: string }>(text);
        if (typeof data.subject !== 'string' || typeof data.htmlBody !== 'string' || !data.htmlBody.trim()) throw new Error('The report response was incomplete. Please retry.');
        setReportHtml(safeReportHtml(data.htmlBody)); setReportSubject(data.subject);
      } else {
        const data = parseJsonFromText<{ county: string; url: string; note?: string }>(text);
        if (typeof data.county !== 'string' || typeof data.url !== 'string') throw new Error('The county response was incomplete. Please retry.');
        setGisInfo({ county: data.county, url: safeWebUrl(data.url), note: typeof data.note === 'string' ? data.note : undefined });
      }
    } catch (error) {
      if (!mountedRef.current || controller.signal.aborted || requestRef.current !== controller || isCancelled(error)) return;
      if (forNotes) setNotesError(getErrorMessage(error));
      else {
        setPropertyError(getErrorMessage(error));
        if (task === 'county-map') {
          const county = Object.keys(NC_COUNTY_GIS_DATA).find(key => query.toLowerCase().includes(key));
          if (county) {
            const data = NC_COUNTY_GIS_DATA[county];
            setGisInfo({ county: data.name, url: data.url.replace('{query}', encodeURIComponent(query)), note: 'Local directory fallback. ' + (data.note || '') });
          }
        }
      }
    } finally {
      if (requestRef.current === controller) { requestRef.current = null; if (mountedRef.current) setBusyTask(null); }
    }
  };
  const handleOrganizeNotes = () => void runAiTask('organize-notes');
  const handleProcessNotesAi = () => void runAiTask('extract-notes');
  const handleGenerateReport = () => void runAiTask('property-report');
  const handleGisSearch = () => void runAiTask('county-map');
  const handleNotesSave = async () => {
    if (!customerName.trim() || !customerNotes.trim() || busyTask || isCopying) return;
    setNotesError(''); setNotesNotice(''); setLastNotesTask(null); persistDraft();
    // Reserve the popup during the click, before the asynchronous clipboard operation.
    const popup = window.open('about:blank', '_blank');
    if (popup) popup.opener = null;
    popupRef.current = popup; setIsCopying(true);
    try {
      await navigator.clipboard.writeText(customerNotes);
      if (!mountedRef.current) return;
      if (popup && !popup.closed) popup.location.replace(matrixUrl(customerName));
      setNotesNotice(popup && !popup.closed
        ? 'Draft copied. Paste it into Matrix; nothing has been logged automatically.'
        : 'Draft copied. The Matrix window was blocked or closed; use Open Matrix below.');
      addToast('Memo draft copied. Paste into Matrix to save it.', 'success');
    } catch {
      popup?.close();
      if (mountedRef.current) setNotesError('Clipboard access failed. Your draft is unchanged. Retry copying, or select and copy the notes manually.');
    } finally {
      popupRef.current = null;
      if (mountedRef.current) setIsCopying(false);
    }
  };
  const discardDraft = () => {
    if (!window.confirm('Discard this memo draft and its original text?')) return;
    cancelRequest();
    const cleared = emptyDraft(); draftRef.current = cleared;
    setDraft(cleared); setStagedNotesFile(null); setNotesError(''); setNotesNotice(''); setLastNotesTask(null);
    persistDraft(); setIsNotesModalOpen(false); setIsNotesMinimized(false);
  };
  const handleReportDownload = () => {
    if (!reportHtml) return;
    const url = URL.createObjectURL(new Blob([reportHtml], { type: 'text/html' }));
    const link = document.createElement('a'); link.href = url;
    link.download = (reportSubject.replace(/[^a-z0-9_-]/gi, '_') || 'property_report') + '.html';
    link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const handleReportPrint = () => {
    if (!reportHtml) return;
    const popup = window.open('', '_blank');
    if (!popup) { setPropertyError('The print window was blocked. Allow pop-ups and retry.'); return; }
    popup.opener = null; popup.document.write(reportHtml); popup.document.close(); popup.focus(); popup.print();
  };
  const handleReportEmail = async () => {
    if (!reportHtml || isCopying) return;
    const popup = window.open('about:blank', '_blank');
    if (popup) popup.opener = null;
    popupRef.current = popup; setIsCopying(true); setPropertyError('');
    try {
      const content = new DOMParser().parseFromString(reportHtml, 'text/html').body;
      await navigator.clipboard.write([new ClipboardItem({
        'text/html': new Blob([content.innerHTML], { type: 'text/html' }),
        'text/plain': new Blob([content.textContent || ''], { type: 'text/plain' }),
      })]);
      if (!mountedRef.current) return;
      if (!popup || popup.closed) throw new Error('Report copied, but Gmail was blocked. Open Gmail and paste the report.');
      popup.location.replace('https://mail.google.com/mail/?view=cm&fs=1&su=' + encodeURIComponent(reportSubject));
      addToast('Report copied. Paste into the Gmail compose window.', 'success');
    } catch (error) {
      popup?.close();
      if (mountedRef.current) setPropertyError(getErrorMessage(error) + ' The report is preserved.');
    } finally {
      popupRef.current = null;
      if (mountedRef.current) setIsCopying(false);
    }
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
          {(LOCAL_LOGOS[portal.id] || portal.image) ? (
            <img
              src={LOCAL_LOGOS[portal.id] || portal.image}
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

  const buttonClass = 'inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/10';
  const primaryClass = buttonClass + ' bg-[#003f87] !text-white hover:!bg-[#0076d3] dark:hover:!bg-[#0076d3]';
  const fieldClass = 'w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-60 dark:border-white/20 dark:bg-white/5 dark:text-white';
  const signInLink = <a href="/login" target="_blank" rel="noopener noreferrer" className={buttonClass + ' mt-2'}><i className="fa-solid fa-right-to-bracket" aria-hidden="true" />Sign In Again</a>;
  const propertyFeedback = propertyError && <div role="alert" className="my-3 text-sm text-rose-700 dark:text-rose-300">
    <p>{propertyError}</p>
    {/session|sign.in|access.*denied/i.test(propertyError) && signInLink}
    {lastPropertyTask && <button className={buttonClass + ' mt-2'} disabled={Boolean(busyTask) || !query.trim()} onClick={() => void runAiTask(lastPropertyTask)}><i className="fa-solid fa-rotate-right" aria-hidden="true" /> Retry</button>}
  </div>;
  return (
    <>
      <section aria-label="Unified Search" className="min-w-0 border-b border-slate-200 bg-white px-4 py-4 dark:border-white/10 dark:bg-white/5 sm:px-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-outfit text-lg font-bold text-slate-900 dark:text-white">
            <i className="fa-solid fa-magnifying-glass text-[#0076d3]" aria-hidden="true" />Unified Search
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">{searchCount} searches today</span>
        </div>
        <div className="mb-3 sm:hidden">
          <label htmlFor="search-mode" className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">Search in</label>
          <select id="search-mode" value={mode} onChange={event => setMode(event.target.value as SearchMode)} className={fieldClass}>
            {modeButtons.map(button => <option key={button.mode} value={button.mode}>{button.label}</option>)}
          </select>
        </div>
        <div className="mb-3 hidden flex-wrap gap-1.5 sm:flex" role="group" aria-label="Search mode">
          {modeButtons.map(button => <button key={button.mode} type="button" aria-pressed={mode === button.mode}
            title={button.label + ' (' + button.shortcut + ')'} onClick={() => { setMode(button.mode); inputRef.current?.focus(); }}
            className={mode === button.mode ? primaryClass : buttonClass}>
            <i className={'fa-solid ' + button.icon} aria-hidden="true" />{button.label}
          </button>)}
        </div>
        <label htmlFor="unified-search-query" className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">
          {mode === 'realestate' ? 'Property address' : mode === 'contacts' ? 'Company name' : mode === 'onedrive' ? 'Client name' : 'Name, address, or search term'}
        </label>
        <form onSubmit={event => { event.preventDefault(); handleSearch(); }} className="flex min-w-0 gap-2">
          <input ref={inputRef} id="unified-search-query" type="search" value={query}
            onChange={event => { setQuery(event.target.value); setSearchError(''); }}
            placeholder={MODE_META[mode].placeholder} className={fieldClass + ' flex-1'}
            aria-invalid={Boolean(searchError)} aria-describedby={searchError ? 'search-error' : undefined} />
          <button type="submit" aria-label={mode === 'contacts' ? 'Find company contacts' : 'Search ' + modeButtons.find(button => button.mode === mode)?.label} className={primaryClass + ' shrink-0'} disabled={!query.trim()}>
            <i className="fa-solid fa-magnifying-glass" aria-hidden="true" /><span className="hidden min-[380px]:inline">{mode === 'contacts' ? 'Find' : 'Search'}</span>
          </button>
        </form>
        {searchError && <p id="search-error" role="alert" className="mt-2 text-sm text-rose-700 dark:text-rose-300">{searchError}</p>}
        {mode === 'contacts' && <ContactLookup query={query} onQueryChange={setQuery} addToast={addToast} />}
        {historyEntries.length > 0 && <div className="mt-3 flex min-w-0 flex-wrap items-center gap-1.5" aria-label="Recent searches">
          <span className="text-xs text-slate-500">Recent</span>
          {historyEntries.map((entry, index) => <button key={index} onClick={() => runSearch(entry.query, entry.mode || mode)}
            title={(modeButtons.find(button => button.mode === (entry.mode || mode))?.label || '') + ': ' + entry.query}
            className={buttonClass + ' max-w-full !py-1'}>
            <span className="max-w-44 truncate">{entry.query}</span>
            {entry.mode && <i className={'fa-solid ' + modeButtons.find(button => button.mode === entry.mode)?.icon} aria-hidden="true" />}
          </button>)}
          <button className={buttonClass} title="Clear search history" aria-label="Clear search history" onClick={() => setSearchHistory([])}><i className="fa-solid fa-xmark" aria-hidden="true" /></button>
        </div>}
        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-slate-100 pt-3 dark:border-white/10">
          <button onClick={handleNewFolder} className={buttonClass}><i className="fa-brands fa-google-drive" aria-hidden="true" />Cloud Folder</button>
          <button onClick={handleNotesOpen} className={buttonClass}><i className="fa-solid fa-note-sticky" aria-hidden="true" />{hasDraft ? 'Resume Memo' : 'Audit Memo'}</button>
          {[
            { label: 'Matrix Home', href: 'https://agents.agencymatrix.com/#/', icon: 'fa-house-chimney-window' },
            { label: 'New Prospect', href: 'https://agents.agencymatrix.com/customerEdit.php?id=0', icon: 'fa-user-plus' },
            { label: 'Reports', href: 'https://agents.agencymatrix.com/#/reports', icon: 'fa-chart-column' },
          ].map(link => <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer" className={buttonClass}><i className={'fa-solid ' + link.icon} aria-hidden="true" />{link.label}</a>)}
        </div>
        {hasDraft && (!isNotesModalOpen || isNotesMinimized) && <p className="mt-2 break-words text-xs text-slate-500 dark:text-slate-400" role="status">Memo draft retained{customerName ? ': ' + customerName : ''}.</p>}
        {storageError && <p role="alert" className="mt-2 text-sm text-rose-700 dark:text-rose-300">{storageError}</p>}

        {mode === 'realestate' && <div className="mt-3 border-t border-slate-100 pt-3 dark:border-white/10">
          <div className="flex flex-wrap gap-2">
            <button className={buttonClass} onClick={handleNcInsuranceToolsOpen} disabled={!query.trim()}><i className="fa-solid fa-house" aria-hidden="true" />Open NC Tools</button>
            <button className={buttonClass} onClick={handleGenerateReport} disabled={!query.trim() || Boolean(busyTask)}><i className="fa-solid fa-file-lines" aria-hidden="true" />Property Report</button>
            <button className={buttonClass} onClick={handleGisSearch} disabled={!query.trim() || Boolean(busyTask)}><i className="fa-solid fa-map" aria-hidden="true" />County Map</button>
            <button className={buttonClass} onClick={() => propertyFileInputRef.current?.click()} disabled={Boolean(busyTask)} title="Attach property evidence (10 MiB total)"><i className="fa-solid fa-paperclip" aria-hidden="true" />Attach</button>
            <input ref={propertyFileInputRef} type="file" multiple className="hidden" aria-label="Property evidence" accept=".pdf,.jpg,.jpeg,.png,.webp,.gif" onChange={handlePropertyFileChange} />
          </div>
          {propertyFiles.length > 0 && <ul className="mt-2 space-y-1">
            {propertyFiles.map((file, index) => <li key={index} className="flex min-w-0 items-center gap-2 text-xs text-slate-600 dark:text-slate-300"><span className="min-w-0 flex-1 truncate">{file.name}</span><button className={buttonClass} disabled={Boolean(busyTask)} aria-label={'Remove ' + file.name} onClick={() => removePropertyFile(index)}><i className="fa-solid fa-xmark" aria-hidden="true" /></button></li>)}
          </ul>}
          {!isReportModalOpen && !isGisModalOpen && propertyFeedback}
        </div>}
        <div className="mt-3 border-t border-slate-100 pt-3 dark:border-white/10">
          <button type="button" onClick={() => { setShowMoreCarriers(false); setShowCarrierGateway(prev => !prev); }}
            className={buttonClass + ' w-full !justify-between'} aria-label="Carrier Portals" aria-expanded={showCarrierGateway} aria-controls="carrier-portals">
            <span><i className="fa-solid fa-building-shield mr-2" aria-hidden="true" />Carrier Portals</span><i className={'fa-solid ' + (showCarrierGateway ? 'fa-chevron-up' : 'fa-chevron-down')} aria-hidden="true" />
          </button>
          {showCarrierGateway && <div id="carrier-portals">
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
              {DEFAULT_INSURANCE_PORTALS.map(renderPortalTile)}
              <button className={buttonClass} onClick={() => setShowMoreCarriers(prev => !prev)} aria-expanded={showMoreCarriers} aria-controls="more-carriers-panel"><i className="fa-solid fa-ellipsis" aria-hidden="true" />More Carriers</button>
            </div>
            {showMoreCarriers && <div id="more-carriers-panel" className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">{MORE_CARRIER_PORTALS.map(renderPortalTile)}</div>}
          </div>}
        </div>
      </section>

      <Modal isOpen={active && isGisModalOpen} onClose={() => { cancelRequest(); setIsGisModalOpen(false); }} title="County Property Map">
        {isGisSearching && <div role="status" className="flex flex-wrap items-center gap-3 text-sm"><i className="fa-solid fa-spinner fa-spin" aria-hidden="true" />Finding county map...<button className={buttonClass} onClick={() => { cancelRequest(); setPropertyError('County search cancelled.'); }}>Cancel</button></div>}
        {propertyFeedback}
        {gisInfo && <div className="space-y-3">
          <h4 className="font-semibold text-slate-900 dark:text-white">{gisInfo.county}</h4>
          {gisInfo.note && <p className="text-sm text-slate-600 dark:text-slate-300">{gisInfo.note}</p>}
          <a href={gisInfo.url} target="_blank" rel="noopener noreferrer" className={primaryClass}>Open County Map<i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" /></a>
        </div>}
      </Modal>
      <Modal isOpen={active && isReportModalOpen} onClose={() => { cancelRequest(); setIsReportModalOpen(false); }} title={reportSubject || 'Property Risk Report'} maxWidthClass="max-w-5xl">
        {isGeneratingReport && <div role="status" className="flex flex-wrap items-center gap-3 text-sm"><i className="fa-solid fa-spinner fa-spin" aria-hidden="true" />Building property report...<button className={buttonClass} onClick={() => { cancelRequest(); setPropertyError('Report cancelled.'); }}>Cancel</button></div>}
        {propertyFeedback}
        {reportHtml && <>
          <iframe srcDoc={reportHtml} title="AI Property Report" className="mb-3 h-[min(62vh,650px)] w-full border border-slate-200 bg-white" sandbox="allow-popups allow-popups-to-escape-sandbox" />
          <div className="flex flex-wrap justify-end gap-2">
            <button onClick={handleReportDownload} className={buttonClass}><i className="fa-solid fa-download" aria-hidden="true" />Save HTML</button>
            <button onClick={handleReportPrint} className={buttonClass}><i className="fa-solid fa-print" aria-hidden="true" />Print</button>
            <button onClick={handleReportEmail} disabled={isCopying} className={primaryClass}><i className="fa-solid fa-envelope" aria-hidden="true" />Copy & Open Gmail</button>
          </div>
        </>}
      </Modal>

      <Modal isOpen={active && isNotesModalOpen && !isNotesMinimized} onClose={handleNotesClose} title="Audit Memo Draft" maxWidthClass="max-w-2xl">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400" role="status">{draftStatus}</span>
            <button onClick={handleNotesClose} className={buttonClass} title="Minimize memo" aria-label="Minimize memo"><i className="fa-solid fa-window-minimize" aria-hidden="true" /></button>
          </div>
          {storageError && <div role="alert" className="text-sm text-rose-700 dark:text-rose-300">{storageError}<button onClick={persistDraft} className={buttonClass + ' ml-2'}>Retry Save</button></div>}
          <div>
            <label htmlFor="memo-customer" className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Customer name</label>
            <input id="memo-customer" type="text" value={customerName} disabled={notesBusy || isCopying} onChange={event => setCustomerName(event.target.value)} className={fieldClass} />
          </div>
          <div>
            <label htmlFor="memo-notes" className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Interaction notes or email thread</label>
            <textarea id="memo-notes" value={customerNotes} disabled={notesBusy || isCopying} onChange={event => setCustomerNotes(event.target.value)}
              rows={8} className={fieldClass + ' resize-y leading-relaxed'} />
          </div>
          <div className="flex flex-wrap gap-2">
            <button className={buttonClass} disabled={Boolean(busyTask) || isCopying} onClick={() => notesFileInputRef.current?.click()} title="Attach PDF or image (10 MiB total)"><i className="fa-solid fa-paperclip" aria-hidden="true" />Attach file</button>
            <input type="file" ref={notesFileInputRef} onChange={handleNotesFileChange} accept=".pdf,.jpg,.jpeg,.png,.webp,.gif" className="hidden" aria-label="Memo attachment" />
            <button className={primaryClass} onClick={handleOrganizeNotes} disabled={!customerNotes.trim() || Boolean(busyTask) || isCopying}><i className={'fa-solid ' + (isOrganizingNotes ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles')} aria-hidden="true" />Organize notes</button>
            <button className={buttonClass} disabled={draft.originalText === null || Boolean(busyTask) || isCopying}
              onClick={() => { setDraft(prev => ({ ...prev, text: prev.originalText ?? prev.text, originalText: null })); setNotesNotice('Original notes restored.'); }}
              title="Undo AI rewrite" aria-label="Undo AI rewrite"><i className="fa-solid fa-rotate-left" aria-hidden="true" />Undo</button>
            {notesBusy && <button className={buttonClass} onClick={() => { cancelRequest(); setNotesNotice('AI cancelled. Your original notes are unchanged.'); }}><i className="fa-solid fa-stop" aria-hidden="true" />Cancel AI</button>}
          </div>
          {stagedNotesFile && <div className="flex min-w-0 flex-wrap items-center gap-2 border-y border-slate-200 py-2 dark:border-white/10">
            <span className="min-w-0 flex-1 basis-32 truncate text-xs text-slate-600 dark:text-slate-300" title={stagedNotesFile.name}>{stagedNotesFile.name}</span>
            <button className={buttonClass} onClick={handleProcessNotesAi} disabled={Boolean(busyTask) || isCopying}><i className={'fa-solid ' + (isProcessingNotesFile ? 'fa-spinner fa-spin' : 'fa-file-lines')} aria-hidden="true" />Extract notes</button>
            <button className={buttonClass} disabled={Boolean(busyTask) || isCopying} onClick={() => setStagedNotesFile(null)} title="Remove attachment" aria-label="Remove attachment"><i className="fa-solid fa-xmark" aria-hidden="true" /></button>
            <p className="w-full text-xs text-slate-500">Attachment kept only while this page is open.</p>
          </div>}
          {notesError && <div role="alert" className="text-sm text-rose-700 dark:text-rose-300"><p>{notesError}</p>
            {/session|sign.in|access.*denied/i.test(notesError) && signInLink}
            {lastNotesTask && <button className={buttonClass + ' mt-2'} disabled={Boolean(busyTask) || isCopying || (lastNotesTask === 'extract-notes' ? !stagedNotesFile : !customerNotes.trim())} onClick={() => void runAiTask(lastNotesTask)}><i className="fa-solid fa-rotate-right" aria-hidden="true" />Retry AI</button>}
          </div>}
          {notesNotice && <p role="status" className="text-sm text-emerald-700 dark:text-emerald-300">{notesNotice}</p>}
          <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-3 dark:border-white/10">
            <button onClick={handleNotesSave} disabled={!customerName.trim() || !customerNotes.trim() || Boolean(busyTask) || isCopying} className={primaryClass}><i className={'fa-solid ' + (isCopying ? 'fa-spinner fa-spin' : 'fa-copy')} aria-hidden="true" />Copy Memo & Open Matrix</button>
            {customerName.trim() && <a href={matrixUrl(customerName)} target="_blank" rel="noopener noreferrer" className={buttonClass}>Open Matrix<i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" /></a>}
            <button onClick={handleNotesClose} className={buttonClass}>Keep Draft & Close</button>
            <button onClick={discardDraft} disabled={isCopying || !hasDraft} className={buttonClass + ' !text-rose-600'}><i className="fa-solid fa-trash-can" aria-hidden="true" />Discard Draft</button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default SearchCard;
