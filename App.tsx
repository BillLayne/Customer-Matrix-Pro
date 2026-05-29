import React, { useCallback, useEffect, useRef, useState } from 'react';
import AiAssistant from './components/AiAssistant';
import SearchCard from './components/SearchCard';
import QuickSearchPopup from './components/QuickSearchPopup';
import ProgramLauncher from './components/ProgramLauncher';
import QuickImageLinksCard from './components/QuickImageLinksCard';
import Toast from './components/Toast';
import Modal from './components/Modal';
import { useLocalStorage } from './hooks/useLocalStorage';
import type { ToastMessage } from './types';

const quickActions = [
  {
    label: 'Agency Matrix Home',
    description: 'Open the main agent portal.',
    href: 'https://agents.agencymatrix.com/#/',
    icon: 'fa-solid fa-house-chimney-window',
  },
  {
    label: 'New Prospect',
    description: 'Jump straight into a new customer record.',
    href: 'https://agents.agencymatrix.com/customerEdit.php?id=0',
    icon: 'fa-solid fa-user-plus',
  },
  {
    label: 'Reports',
    description: 'Open the Matrix reports page.',
    href: 'https://agents.agencymatrix.com/#/reports',
    icon: 'fa-solid fa-chart-column',
  },
];

type WorkspaceTab = 'search' | 'gmail' | 'tools';
type SectionPanelKey = 'email' | 'images';

const workspaceTabs: Array<{
  id: WorkspaceTab;
  label: string;
  description: string;
  icon: string;
}> = [
  {
    id: 'search',
    label: 'Unified Search',
    description: 'Matrix lookup and customer search',
    icon: 'fa-solid fa-magnifying-glass',
  },
  {
    id: 'gmail',
    label: 'Gmail Engineering',
    description: 'Generate and refine emails',
    icon: 'fa-solid fa-envelope-open-text',
  },
  {
    id: 'tools',
    label: 'Tools',
    description: 'Launchers, image links, forms',
    icon: 'fa-solid fa-table-cells-large',
  },
];

const quickStartCards = [
  {
    id: 'send-docs',
    eyebrow: 'Start Here',
    title: 'Send customer documents',
    description: 'Jump straight into the Send Bill Docs portal when someone needs to upload or receive files.',
    icon: 'fa-solid fa-file-arrow-up',
    accent: 'from-sky-700 via-cyan-600 to-teal-500',
    type: 'link' as const,
    href: 'https://www.sendbilldocs.com/agent.html',
  },
  {
    id: 'sms',
    eyebrow: 'Fastest Reply',
    title: 'Open SMS Command Center',
    description: 'Use your shared text line for quick customer replies, documents, cards, and attachments.',
    icon: 'fa-solid fa-comments',
    accent: 'from-emerald-800 via-teal-700 to-cyan-500',
    type: 'link' as const,
    href: 'https://agency-sms-command-center.bill-7e3.workers.dev',
  },
  {
    id: 'gmail',
    eyebrow: 'Email Help',
    title: 'Jump to Gmail Engineering',
    description: 'Scroll to the email studio when you need to build or refine a customer-facing insurance email.',
    icon: 'fa-solid fa-envelope-open-text',
    accent: 'from-slate-900 via-[#003f87] to-[#0076d3]',
    type: 'section' as const,
    panel: 'email' as const,
  },
  {
    id: 'certificates',
    eyebrow: 'Most Used Forms',
    title: 'Open Certificates',
    description: 'Go directly to the live certificate platform for COIs and certificate requests.',
    icon: 'fa-solid fa-certificate',
    accent: 'from-teal-800 via-emerald-700 to-green-500',
    type: 'link' as const,
    href: 'https://coi-certificates-certguard-ai.pages.dev/',
  },
  {
    id: 'poi',
    eyebrow: 'Proof Tools',
    title: 'Open POI Generator',
    description: 'Build proof-of-insurance documents and polished proof emails from the dedicated generator.',
    icon: 'fa-solid fa-file-pdf',
    accent: 'from-blue-900 via-sky-700 to-cyan-500',
    type: 'link' as const,
    href: 'https://bill-layne-insurance-poi-generator.pages.dev',
  },
  {
    id: 'property',
    eyebrow: 'Property Lookup',
    title: 'Open NC Property Tools',
    description: 'Go right into property lookup and risk intel when a coverage question starts with an address.',
    icon: 'fa-solid fa-map-location-dot',
    accent: 'from-emerald-900 via-teal-700 to-cyan-500',
    type: 'link' as const,
    href: 'https://nc-insurance-tools-gemini.pages.dev/',
  },
];

const workflowGuides = [
  {
    id: 'communicate',
    eyebrow: 'Communicate',
    title: 'Reply, send, and follow up',
    description: 'Use this lane when the job is getting something out to a customer quickly.',
    icon: 'fa-solid fa-paper-plane',
    accent: 'from-sky-700 via-blue-700 to-indigo-600',
    actions: [
      { label: 'Send Docs', type: 'link' as const, href: 'https://www.sendbilldocs.com/agent.html' },
      { label: 'SMS Center', type: 'link' as const, href: 'https://agency-sms-command-center.bill-7e3.workers.dev' },
      { label: 'Gmail Studio', type: 'section' as const, panel: 'email' as const },
    ],
  },
  {
    id: 'documents',
    eyebrow: 'Create Documents',
    title: 'Issue the right form fast',
    description: 'Use this lane when you need certificates, proof, ID cards, quotes, or other customer forms.',
    icon: 'fa-solid fa-folder-open',
    accent: 'from-teal-800 via-emerald-700 to-green-500',
    actions: [
      { label: 'Certificates', type: 'link' as const, href: 'https://coi-certificates-certguard-ai.pages.dev/' },
      { label: 'POI Generator', type: 'link' as const, href: 'https://bill-layne-insurance-poi-generator.pages.dev' },
      { label: 'Insurance Cards', type: 'link' as const, href: 'https://insurance-card-generator-2026-color-edition.pages.dev/' },
    ],
  },
  {
    id: 'property',
    eyebrow: 'Coverage & Property',
    title: 'Start with the address',
    description: 'Use these tools when a customer needs property data, rebuild help, or coverage estimates.',
    icon: 'fa-solid fa-house-circle-check',
    accent: 'from-amber-700 via-orange-600 to-yellow-500',
    actions: [
      { label: 'NC Property Tools', type: 'link' as const, href: 'https://nc-insurance-tools-gemini.pages.dev/' },
      { label: 'Rebuild Estimator', type: 'link' as const, href: 'https://home-rebuild-estimator.pages.dev' },
      { label: 'Condo Calculator', type: 'link' as const, href: 'https://condo-coverage-calculator.pages.dev' },
    ],
  },
  {
    id: 'content',
    eyebrow: 'Image & Content',
    title: 'Build what you need to send',
    description: 'Use these tools when the customer needs a polished image, HTML, quote visual, or photo guide.',
    icon: 'fa-solid fa-wand-magic-sparkles',
    accent: 'from-fuchsia-700 via-violet-700 to-indigo-600',
    actions: [
      { label: 'Quick Image Links', type: 'section' as const, panel: 'images' as const },
      { label: 'HTML Studio', type: 'link' as const, href: '/html-studio.html' },
      { label: 'PDF Quote Creator', type: 'link' as const, href: 'https://insurance-quote-image-creator.bill-7e3.workers.dev/' },
    ],
  },
];

export default function App() {
  const [theme, setTheme] = useLocalStorage<'light' | 'dark'>('theme', 'light');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [searchCount, setSearchCount] = useLocalStorage<number>('searchesToday', 0);
  const [showQuickSearch, setShowQuickSearch] = useState(false);
  const [showShortcutModal, setShowShortcutModal] = useState(false);
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useLocalStorage<WorkspaceTab | 'split'>('matrix-pro-layout-mode', 'search');
  const currentTab: WorkspaceTab = activeWorkspaceTab === 'split' ? 'search' : activeWorkspaceTab;
  const emailSectionRef = useRef<HTMLElement | null>(null);
  const imagesSectionRef = useRef<HTMLElement | null>(null);
  const launcherSectionRef = useRef<HTMLElement | null>(null);
  const toolsSectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const addToast = useCallback((message: string, type: ToastMessage['type'] = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3000);
  }, []);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  const handleSearchIncrement = () => {
    setSearchCount((prev) => prev + 1);
  };

  const switchWorkspaceTab = useCallback(
    (tab: WorkspaceTab, label?: string) => {
      setActiveWorkspaceTab(tab);
      addToast(`Switched to ${label || workspaceTabs.find((item) => item.id === tab)?.label || 'workspace'}...`, 'info');
    },
    [addToast, setActiveWorkspaceTab]
  );

  const openExternalLink = useCallback(
    (label: string, href: string) => {
      window.open(href, '_blank');
      addToast(`Opening ${label}...`, 'info');
    },
    [addToast]
  );

  const revealSection = useCallback(
    (panel: SectionPanelKey | null, targetRef: React.RefObject<HTMLElement | null>, label: string) => {
      if (panel === 'email') {
        setActiveWorkspaceTab('gmail');
      }
      if (panel === 'images') {
        setActiveWorkspaceTab('tools');
      }
      window.setTimeout(() => {
        targetRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 120);
      addToast(`Jumping to ${label}...`, 'info');
    },
    [addToast, setActiveWorkspaceTab]
  );

  const handleQuickSearch = useCallback(
    (query: string) => {
      const selection = /\d+/.test(query) ? 'Address' : 'Name';
      const url = `https://agents.agencymatrix.com/#/customer/search?selection=${selection}&query=${encodeURIComponent(query)}`;
      window.open(url, '_blank');
      handleSearchIncrement();
      addToast('Searching Agency Matrix...', 'info');
    },
    [addToast]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        setShowQuickSearch(true);
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        toggleTheme();
      }

      if (e.key === 'Escape') {
        setShowQuickSearch(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [theme]);

  useEffect(() => {
    const handleStorageError = (e: Event) => {
      const customEvent = e as CustomEvent;
      const error = customEvent.detail?.error;
      if (error && (error.name === 'QuotaExceededError' || error.code === 22)) {
        addToast('Storage Full! Tasks or notes may not save until older items are removed.', 'danger');
      } else {
        addToast(`Storage warning for ${customEvent.detail?.key || 'local data'}.`, 'warning');
      }
    };

    window.addEventListener('local-storage-error', handleStorageError);
    return () => window.removeEventListener('local-storage-error', handleStorageError);
  }, [addToast]);

  return (
    <div className="min-h-screen bg-[#f3f7fb] text-slate-900 transition-colors duration-500 dark:bg-[#07111f] dark:text-slate-100">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(circle_at_top,rgba(0,118,211,0.14),transparent_58%)]"></div>
        <div className="absolute -left-24 top-40 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl dark:bg-cyan-400/15"></div>
        <div className="absolute right-0 top-24 h-96 w-96 rounded-full bg-blue-700/10 blur-3xl dark:bg-blue-500/15"></div>
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-amber-300/10 blur-3xl dark:bg-amber-300/10"></div>
      </div>

      <div className="relative z-10">
        <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/70 backdrop-blur-xl dark:border-white/10 dark:bg-[#07111f]/70">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:gap-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem] bg-gradient-to-br from-slate-950 via-[#003f87] to-[#0076d3] text-white shadow-xl shadow-blue-900/20 sm:h-11 sm:w-11 sm:rounded-[1.1rem]">
                <i className="fa-solid fa-table-columns text-base"></i>
              </div>
              <div className="min-w-0">
                <p className="truncate text-[10px] font-black uppercase tracking-[0.26em] text-[#0076d3] dark:text-cyan-300 sm:text-[11px] sm:tracking-[0.35em]">
                  Bill Layne Insurance
                </p>
                <h1 className="truncate font-outfit text-lg font-black tracking-tight text-slate-900 dark:text-white sm:text-xl">
                  Agency Command Center
                </h1>
                <p className="hidden text-xs text-slate-500 dark:text-slate-300 sm:block">
                  Unified Agency Matrix search first, local launch boxes underneath.
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <div className="hidden lg:flex items-center gap-1 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-2xl border border-slate-200 dark:border-white/10 mr-1">
                {workspaceTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => switchWorkspaceTab(tab.id, tab.label)}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition flex items-center gap-1 ${
                      currentTab === tab.id
                        ? 'bg-white dark:bg-slate-900 shadow-sm text-primary dark:text-accent'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                    }`}
                    title={tab.description}
                  >
                    <i className={`${tab.icon} text-[10px]`}></i> {tab.id === 'search' ? 'Search' : tab.id === 'gmail' ? 'Gmail' : 'Tools'}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setShowQuickSearch(true)}
                className="hidden rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.18em] text-slate-600 shadow-sm transition hover:border-[#0076d3]/40 hover:text-[#003f87] sm:flex dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
              >
                <i className="fa-solid fa-bolt mr-2"></i>
                Quick Search
              </button>
              <button
                onClick={() => setShowShortcutModal(true)}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-[#0076d3]/40 hover:text-[#003f87] dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                title="Keyboard Shortcuts Help"
              >
                <i className="fa-solid fa-circle-question"></i>
              </button>
              <button
                onClick={toggleTheme}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-[#0076d3]/40 hover:text-[#003f87] dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                <i className={`fa-solid ${theme === 'dark' ? 'fa-sun' : 'fa-moon'}`}></i>
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 pb-24 pt-4 sm:px-6 sm:pb-10 sm:pt-5 lg:px-8">
          <nav className="sticky top-[68px] z-40 mb-4 rounded-[1.25rem] border border-slate-200/80 bg-white/85 p-2 shadow-[0_18px_50px_-38px_rgba(15,23,42,0.55)] backdrop-blur-xl dark:border-white/10 dark:bg-[#07111f]/85 sm:top-[77px]">
            <div className="grid grid-cols-3 gap-2">
              {workspaceTabs.map((tab) => {
                const isActive = currentTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => switchWorkspaceTab(tab.id, tab.label)}
                    className={`flex min-h-[3.75rem] items-center justify-center gap-2 rounded-[1rem] px-2 py-3 text-center transition sm:min-h-[4.25rem] sm:justify-start sm:gap-3 sm:px-4 sm:text-left ${
                      isActive
                        ? 'bg-slate-950 text-white shadow-xl shadow-blue-950/20 dark:bg-white dark:text-slate-950'
                        : 'bg-slate-50 text-slate-600 hover:bg-white hover:text-[#003f87] dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white'
                    }`}
                    aria-pressed={isActive}
                  >
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isActive ? 'bg-[#0076d3] text-white' : 'bg-white text-slate-400 shadow-sm dark:bg-white/10 dark:text-slate-300'}`}>
                      <i className={`${tab.icon} text-sm`}></i>
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[10px] font-black uppercase tracking-[0.12em] sm:text-xs sm:tracking-[0.16em]">
                        <span className="sm:hidden">{tab.id === 'search' ? 'Search' : tab.id === 'gmail' ? 'Gmail' : 'Tools'}</span>
                        <span className="hidden sm:inline">{tab.label}</span>
                      </span>
                      <span className={`mt-1 hidden truncate text-[11px] font-semibold md:block ${isActive ? 'text-white/70 dark:text-slate-500' : 'text-slate-400 dark:text-slate-500'}`}>
                        {tab.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </nav>

          {currentTab === 'search' && (
            <div className="space-y-4 animate-fade-in">
              <section>
                <SearchCard addToast={addToast} searchCount={searchCount} onSearch={handleSearchIncrement} />
              </section>

              <section className="overflow-hidden rounded-[1.45rem] border border-slate-200/70 bg-white/80 p-4 shadow-[0_20px_50px_-38px_rgba(15,23,42,0.45)] backdrop-blur-xl dark:border-white/10 dark:bg-white/5 sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#0076d3] dark:text-cyan-300">
                      Search Workspace
                    </p>
                    <h2 className="mt-1 font-outfit text-xl font-black tracking-tight text-slate-900 dark:text-white sm:text-2xl">
                      Agency Matrix dashboard
                    </h2>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[520px]">
                    {quickActions.map((action) => (
                      <button
                        key={action.label}
                        onClick={() => openExternalLink(action.label, action.href)}
                        className="flex items-center gap-3 rounded-[1rem] border border-slate-200/80 bg-slate-50/80 px-3 py-3 text-left transition hover:border-[#0076d3]/40 hover:bg-white hover:shadow-lg dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-[#0076d3]">
                          <i className={action.icon}></i>
                        </span>
                        <span className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-700 dark:text-slate-100">
                          {action.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </section>
            </div>
          )}

          {currentTab === 'gmail' && (
            <section ref={emailSectionRef} className="animate-fade-in">
              <AiAssistant addToast={addToast} layoutMode="gmail" />
            </section>
          )}

          {currentTab === 'tools' && (
            <div ref={toolsSectionRef} className="space-y-5 animate-fade-in">
              <section>
                <div className="overflow-hidden rounded-[1.45rem] border border-slate-200/70 bg-white/80 p-4 shadow-[0_20px_50px_-38px_rgba(15,23,42,0.45)] backdrop-blur-xl dark:border-white/10 dark:bg-white/5 sm:p-5">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#0076d3] dark:text-cyan-300">
                        Workflow Lanes
                      </p>
                      <h2 className="mt-1 font-outfit text-xl font-black tracking-tight text-slate-900 dark:text-white sm:text-2xl">
                        Launch the next step without crowding Search
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => switchWorkspaceTab('search', 'Unified Search')}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-slate-600 transition hover:border-[#0076d3]/40 hover:text-[#003f87] dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                    >
                      <i className="fa-solid fa-magnifying-glass"></i>
                      Back to Search
                    </button>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {quickStartCards.map((card) => (
                      <button
                        key={card.id}
                        onClick={() =>
                          card.type === 'link'
                            ? openExternalLink(card.title, card.href)
                            : revealSection(
                                card.panel,
                                card.panel === 'email' ? emailSectionRef : imagesSectionRef,
                                card.title
                              )
                        }
                        className="group overflow-hidden rounded-[1.15rem] border border-slate-200/80 bg-white/90 text-left shadow-[0_18px_50px_-42px_rgba(15,23,42,0.8)] transition hover:-translate-y-1 hover:border-[#0076d3]/40 hover:shadow-xl dark:border-white/10 dark:bg-[#0b1727]/80"
                      >
                        <div className={`h-1.5 bg-gradient-to-r ${card.accent}`}></div>
                        <div className="p-4">
                          <div className="mb-3 flex items-start justify-between gap-3">
                            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.9rem] bg-gradient-to-br ${card.accent} text-white shadow-lg`}>
                              <i className={`${card.icon} text-sm`}></i>
                            </div>
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500 dark:bg-white/10 dark:text-slate-300">
                              {card.eyebrow}
                            </span>
                          </div>
                          <h3 className="font-outfit text-base font-black tracking-tight text-slate-900 dark:text-white">
                            {card.title}
                          </h3>
                          <p className="mt-2 text-[13px] leading-5 text-slate-500 dark:text-slate-300">
                            {card.description}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="mt-4 grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
                    {workflowGuides.map((guide) => (
                      <article
                        key={guide.id}
                        className="overflow-hidden rounded-[1.15rem] border border-slate-200/80 bg-slate-50/80 shadow-[0_18px_40px_-36px_rgba(15,23,42,0.6)] dark:border-white/10 dark:bg-white/5"
                      >
                        <div className={`h-1.5 bg-gradient-to-r ${guide.accent}`}></div>
                        <div className="p-4">
                          <div className="mb-3 flex items-center gap-3">
                            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.95rem] bg-gradient-to-br ${guide.accent} text-white shadow-lg`}>
                              <i className={`${guide.icon} text-sm`}></i>
                            </div>
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-400">
                                {guide.eyebrow}
                              </p>
                              <h3 className="font-outfit text-base font-black tracking-tight text-slate-900 dark:text-white">
                                {guide.title}
                              </h3>
                            </div>
                          </div>
                          <p className="text-[13px] leading-5 text-slate-500 dark:text-slate-300">
                            {guide.description}
                          </p>
                          <div className="mt-4 flex flex-wrap gap-2">
                            {guide.actions.map((action) => (
                              <button
                                key={action.label}
                                onClick={() =>
                                  action.type === 'link'
                                    ? openExternalLink(action.label, action.href)
                                    : revealSection(
                                        action.panel,
                                        action.panel === 'email' ? emailSectionRef : imagesSectionRef,
                                        action.label
                                      )
                                }
                                className="rounded-full border border-slate-200 bg-white px-3 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-slate-600 transition hover:border-[#0076d3]/40 hover:text-[#003f87] dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                              >
                                {action.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              </section>

              <section ref={imagesSectionRef}>
                <QuickImageLinksCard addToast={addToast} />
              </section>

              <section ref={launcherSectionRef}>
                <ProgramLauncher addToast={addToast} />
              </section>
            </div>
          )}
        </main>

        <QuickSearchPopup
          isOpen={showQuickSearch}
          onClose={() => setShowQuickSearch(false)}
          onSearch={handleQuickSearch}
          addToast={addToast}
        />

        <Modal
          isOpen={showShortcutModal}
          onClose={() => setShowShortcutModal(false)}
          title="Keyboard Shortcuts Cheat Sheet"
          maxWidthClass="max-w-lg"
        >
          <div className="space-y-4 text-slate-800 dark:text-slate-200">
            <p className="text-xs font-black uppercase tracking-widest text-[#0076d3] dark:text-cyan-300">
              Agency Command Matrix Shortcuts
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase text-slate-400 dark:text-slate-500">General Actions</h4>
                <div className="flex items-center justify-between text-xs border-b border-slate-100 dark:border-white/10 pb-1">
                  <span>Focus Search Bar</span>
                  <kbd className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold text-[10px]">/</kbd>
                </div>
                <div className="flex items-center justify-between text-xs border-b border-slate-100 dark:border-white/10 pb-1">
                  <span>Quick Search Popup</span>
                  <kbd className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold text-[10px]">Ctrl + M</kbd>
                </div>
                <div className="flex items-center justify-between text-xs border-b border-slate-100 dark:border-white/10 pb-1">
                  <span>Toggle Dark Mode</span>
                  <kbd className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold text-[10px]">Ctrl + D</kbd>
                </div>
                <div className="flex items-center justify-between text-xs border-b border-slate-100 dark:border-white/10 pb-1">
                  <span>Close Modal</span>
                  <kbd className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold text-[10px]">Esc</kbd>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase text-slate-400 dark:text-slate-500">Search Modes</h4>
                <div className="flex items-center justify-between text-xs border-b border-slate-100 dark:border-white/10 pb-1">
                  <span>Web Search</span>
                  <kbd className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold text-[10px]">Alt + W</kbd>
                </div>
                <div className="flex items-center justify-between text-xs border-b border-slate-100 dark:border-white/10 pb-1">
                  <span>Real Estate</span>
                  <kbd className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold text-[10px]">Alt + H</kbd>
                </div>
                <div className="flex items-center justify-between text-xs border-b border-slate-100 dark:border-white/10 pb-1">
                  <span>People Search</span>
                  <kbd className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold text-[10px]">Alt + P</kbd>
                </div>
                <div className="flex items-center justify-between text-xs border-b border-slate-100 dark:border-white/10 pb-1">
                  <span>Client Folder</span>
                  <kbd className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold text-[10px]">Alt + F</kbd>
                </div>
              </div>
            </div>
            
            <div className="pt-2">
              <h4 className="text-xs font-black uppercase text-slate-400 dark:text-slate-500 mb-1">Compliance Studio</h4>
              <div className="flex items-center justify-between text-xs border-b border-slate-100 dark:border-white/10 pb-1">
                <span>Open Audit Memo Studio</span>
                <kbd className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold text-[10px]">Alt + N or Ctrl + Shift + M</kbd>
              </div>
            </div>
            
            <div className="mt-4 pt-3 text-[11px] text-slate-400 dark:text-slate-500 text-center font-medium border-t border-slate-100 dark:border-white/10">
              Press key combinations anywhere outside text input fields to trigger shortcuts instantly.
            </div>
          </div>
        </Modal>

        <div className="fixed bottom-6 right-6 z-[110] flex flex-col gap-3">
          {toasts.map((toast) => (
            <Toast key={toast.id} message={toast.message} type={toast.type} />
          ))}
        </div>
      </div>
    </div>
  );
}
