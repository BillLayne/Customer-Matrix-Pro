import React, { useCallback, useEffect, useState } from 'react';
import AiAssistant from './components/AiAssistant';
import SearchCard from './components/SearchCard';
import QuickSearchPopup from './components/QuickSearchPopup';
import ProgramLauncher from './components/ProgramLauncher';
import QuickImageLinksCard from './components/QuickImageLinksCard';
import Toast from './components/Toast';
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

type MobilePanelKey = 'workspace' | 'email' | 'images';

const mobilePanelMeta: Record<MobilePanelKey, { eyebrow: string; title: string; description: string; icon: string }> = {
  workspace: {
    eyebrow: 'Quick Access',
    title: 'Agent Workspace',
    description: 'Open Matrix home, new prospect, and reports only when you need them.',
    icon: 'fa-solid fa-layer-group',
  },
  email: {
    eyebrow: 'Email Studio',
    title: 'Gmail Engineering',
    description: 'Expand the luxury email studio when you are ready to build or refine a message.',
    icon: 'fa-solid fa-envelope-open-text',
  },
  images: {
    eyebrow: 'Image Links',
    title: 'Quick Image Links',
    description: 'Upload and copy hosted image links without keeping the full tool open all day.',
    icon: 'fa-solid fa-cloud-arrow-up',
  },
};

export default function App() {
  const [theme, setTheme] = useLocalStorage<'light' | 'dark'>('theme', 'light');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [searchCount, setSearchCount] = useLocalStorage<number>('searchesToday', 0);
  const [showQuickSearch, setShowQuickSearch] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const [mobilePanels, setMobilePanels] = useState<Record<MobilePanelKey, boolean>>({
    workspace: false,
    email: false,
    images: false,
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const updateMobileState = (event?: MediaQueryListEvent) => {
      const matches = event?.matches ?? mediaQuery.matches;
      setIsMobileView(matches);
    };

    updateMobileState();
    mediaQuery.addEventListener('change', updateMobileState);
    return () => mediaQuery.removeEventListener('change', updateMobileState);
  }, []);

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

  const toggleMobilePanel = (panel: MobilePanelKey) => {
    setMobilePanels((prev) => ({ ...prev, [panel]: !prev[panel] }));
  };

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

  const renderMobileSection = (panel: MobilePanelKey, child: React.ReactNode) => {
    if (!isMobileView) {
      return <section className="mt-5">{child}</section>;
    }

    const meta = mobilePanelMeta[panel];
    const isOpen = mobilePanels[panel];

    return (
      <section className="mt-4 sm:mt-5">
        <div className="overflow-hidden rounded-[1.6rem] border border-slate-200/80 bg-white/85 shadow-[0_22px_50px_-42px_rgba(15,23,42,0.48)] backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
          <button
            type="button"
            onClick={() => isMobileView && toggleMobilePanel(panel)}
            className={`w-full text-left ${isMobileView ? 'cursor-pointer' : 'cursor-default'}`}
          >
            <div className="flex items-center gap-3 px-4 py-4 sm:px-5 sm:py-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.1rem] bg-gradient-to-br from-slate-950 via-[#003f87] to-[#0076d3] text-white shadow-lg shadow-blue-900/20">
                <i className={`${meta.icon} text-lg`}></i>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#0076d3] dark:text-cyan-300">
                  {meta.eyebrow}
                </p>
                <h2 className="mt-1 font-outfit text-lg font-black tracking-tight text-slate-900 dark:text-white sm:text-xl">
                  {meta.title}
                </h2>
                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-300 sm:text-sm">
                  {meta.description}
                </p>
              </div>
              {isMobileView && (
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
                  <i className={`fa-solid ${isOpen ? 'fa-chevron-up' : 'fa-chevron-down'} text-sm`}></i>
                </div>
              )}
            </div>
          </button>

          {isOpen && <div className="border-t border-slate-200/70 p-3 sm:p-4 dark:border-white/10">{child}</div>}
        </div>
      </section>
    );
  };

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
              <button
                onClick={() => setShowQuickSearch(true)}
                className="hidden rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.18em] text-slate-600 shadow-sm transition hover:border-[#0076d3]/40 hover:text-[#003f87] sm:flex dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
              >
                <i className="fa-solid fa-bolt mr-2"></i>
                Quick Search
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
          {isMobileView ? (
            renderMobileSection(
              'workspace',
              <div className="grid gap-2">
                {quickActions.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => {
                      window.open(action.href, '_blank');
                      addToast(`Opening ${action.label}...`, 'info');
                    }}
                    className="rounded-[1.15rem] border border-slate-200/80 bg-slate-50/80 px-4 py-4 text-left transition hover:-translate-y-1 hover:border-[#0076d3]/40 hover:bg-white hover:shadow-xl dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem] bg-slate-900 text-white dark:bg-[#0076d3]">
                        <i className={action.icon}></i>
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-700 dark:text-slate-100">
                          {action.label}
                        </h3>
                        <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-300">
                          {action.description}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )
          ) : (
            <section className="overflow-hidden rounded-[1.75rem] border border-slate-200/70 bg-white/80 p-5 shadow-[0_24px_60px_-38px_rgba(15,23,42,0.45)] backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.35em] text-[#0076d3] dark:text-cyan-300">
                    Agent Workspace
                  </p>
                  <h2 className="mt-1 font-outfit text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                    Agency Matrix dashboard
                  </h2>
                </div>

                <div className="grid gap-2 sm:grid-cols-3">
                  {quickActions.map((action) => (
                    <button
                      key={action.label}
                      onClick={() => {
                        window.open(action.href, '_blank');
                        addToast(`Opening ${action.label}...`, 'info');
                      }}
                      className="rounded-[1.15rem] border border-slate-200/80 bg-slate-50/80 px-3 py-3 text-left transition hover:-translate-y-1 hover:border-[#0076d3]/40 hover:bg-white hover:shadow-xl dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                    >
                      <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-[#0076d3]">
                        <i className={action.icon}></i>
                      </div>
                      <h3 className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-700 dark:text-slate-100">
                        {action.label}
                      </h3>
                    </button>
                  ))}
                </div>
              </div>
            </section>
          )}

          <section className="mt-5">
            <SearchCard addToast={addToast} searchCount={searchCount} onSearch={handleSearchIncrement} />
          </section>

          {renderMobileSection('email', <AiAssistant addToast={addToast} />)}
          {renderMobileSection('images', <QuickImageLinksCard addToast={addToast} />)}

          <section className="mt-5">
            <ProgramLauncher addToast={addToast} />
          </section>
        </main>

        <QuickSearchPopup
          isOpen={showQuickSearch}
          onClose={() => setShowQuickSearch(false)}
          onSearch={handleQuickSearch}
          addToast={addToast}
        />

        <div className="fixed bottom-6 right-6 z-[110] flex flex-col gap-3">
          {toasts.map((toast) => (
            <Toast key={toast.id} message={toast.message} type={toast.type} />
          ))}
        </div>
      </div>
    </div>
  );
}
