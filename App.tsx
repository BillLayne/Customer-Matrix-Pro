import React, { useCallback, useEffect, useRef, useState } from 'react';
import SearchCard from './components/SearchCard';
import CommandPalette from './components/CommandPalette';
import ProgramLauncher from './components/ProgramLauncher';
import QuickImageLinksCard from './components/QuickImageLinksCard';
import Toast from './components/Toast';
import Modal from './components/Modal';
import { useLocalStorage } from './hooks/useLocalStorage';
import type { ToastMessage } from './types';

/** Local calendar day, e.g. "2026-07-14". Used to reset the daily search counter. */
const todayKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

interface SearchLog {
  day: string;
  count: number;
}

export default function App() {
  const [theme, setTheme] = useLocalStorage<'light' | 'dark'>('theme', 'light');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [searchLog, setSearchLog] = useLocalStorage<SearchLog>('matrix-pro-search-log', { day: todayKey(), count: 0 });
  const [showPalette, setShowPalette] = useState(false);
  const [showShortcutModal, setShowShortcutModal] = useState(false);
  const launcherSectionRef = useRef<HTMLElement | null>(null);
  const imagesSectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // A monotonic counter, not Date.now(): two toasts raised in the same millisecond
  // would otherwise share an id and collide as React keys.
  const toastIdRef = useRef(0);

  const addToast = useCallback((message: string, type: ToastMessage['type'] = 'success') => {
    const id = (toastIdRef.current += 1);
    setToasts((prev) => [...prev, { id, message, type }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3000);
  }, []);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  // Reads as 0 again once the date rolls over, without needing the tab to be reloaded.
  const searchCount = searchLog.day === todayKey() ? searchLog.count : 0;

  const handleSearchIncrement = () => {
    setSearchLog((prev) => {
      const today = todayKey();
      return prev.day === today ? { day: today, count: prev.count + 1 } : { day: today, count: 1 };
    });
  };

  const scrollToSection = useCallback((targetRef: React.RefObject<HTMLElement | null>) => {
    targetRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const handleQuickSearch = useCallback(
    (query: string) => {
      const selection = /\d+/.test(query) ? 'Address' : 'Name';
      const url = `https://agents.agencymatrix.com/#/customer/search?selection=${selection}&query=${encodeURIComponent(query)}`;
      window.open(url, '_blank');
      handleSearchIncrement();
    },
    []
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K is the palette's home; Ctrl+M stays as an alias for muscle memory
      // (on Bill's PC the global AutoHotkey Ctrl+M usually swallows it first).
      const key = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (key === 'k' || key === 'm')) {
        e.preventDefault();
        setShowPalette(true);
      }

      if ((e.ctrlKey || e.metaKey) && key === 'd') {
        e.preventDefault();
        toggleTheme();
      }

      if (e.key === 'Escape') {
        setShowPalette(false);
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
    <div className="app-shell min-h-screen text-slate-900 transition-colors duration-300 dark:text-slate-100">
      <header className="sticky top-0 z-50 border-b border-slate-200/90 bg-white/95 shadow-[0_8px_24px_-22px_rgba(15,23,42,0.8)] backdrop-blur-xl dark:border-white/10 dark:bg-[#0b1220]/95">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#003f87] text-white shadow-sm">
              <i className="fa-solid fa-shield-halved text-base"></i>
            </div>
            <div className="min-w-0">
              <h1 className="truncate font-outfit text-base font-bold tracking-tight text-slate-900 dark:text-white sm:text-lg">
                Agency Command Center
              </h1>
              <p className="hidden truncate text-xs text-slate-500 dark:text-slate-400 sm:block">
                Bill Layne Insurance
              </p>
            </div>
          </div>

          <nav className="hidden items-center gap-1 md:flex">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-[#003f87] dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
            >
              <i className="fa-solid fa-magnifying-glass mr-1.5 text-xs"></i>
              Search
            </button>
            <button
              onClick={() => scrollToSection(launcherSectionRef)}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-[#003f87] dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
            >
              <i className="fa-solid fa-table-cells-large mr-1.5 text-xs"></i>
              Tools
            </button>
            <button
              onClick={() => scrollToSection(imagesSectionRef)}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-[#003f87] dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
            >
              <i className="fa-solid fa-image mr-1.5 text-xs"></i>
              Images
            </button>
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => setShowPalette(true)}
              className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-[#0076d3]/50 hover:text-[#003f87] sm:flex dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:text-white"
            >
              <i className="fa-solid fa-bolt text-xs"></i>
              Search or Launch
              <kbd className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-400 dark:bg-white/10 dark:text-slate-400">
                Ctrl K
              </kbd>
            </button>
            <button
              onClick={() => setShowShortcutModal(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-[#0076d3]/50 hover:text-[#003f87] dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:text-white"
              title="Keyboard shortcuts"
            >
              <i className="fa-solid fa-circle-question"></i>
            </button>
            <button
              onClick={toggleTheme}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-[#0076d3]/50 hover:text-[#003f87] dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:text-white"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              <i className={`fa-solid ${theme === 'dark' ? 'fa-sun' : 'fa-moon'}`}></i>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] space-y-4 px-4 pb-16 pt-4 sm:px-6">
        <section>
          <SearchCard addToast={addToast} searchCount={searchCount} onSearch={handleSearchIncrement} />
        </section>

        <section ref={launcherSectionRef} className="scroll-mt-20">
          <ProgramLauncher addToast={addToast} />
        </section>

        <section ref={imagesSectionRef} className="scroll-mt-20">
          <QuickImageLinksCard addToast={addToast} />
        </section>
      </main>

      <CommandPalette
        isOpen={showPalette}
        onClose={() => setShowPalette(false)}
        onClientSearch={handleQuickSearch}
        addToast={addToast}
      />

      <Modal
        isOpen={showShortcutModal}
        onClose={() => setShowShortcutModal(false)}
        title="Keyboard Shortcuts"
        maxWidthClass="max-w-lg"
      >
        <div className="space-y-4 text-slate-800 dark:text-slate-200">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                General
              </h4>
              <div className="flex items-center justify-between border-b border-slate-100 pb-1 text-xs dark:border-white/10">
                <span>Focus Search Bar</span>
                <kbd className="rounded border border-slate-200 bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold dark:border-slate-700 dark:bg-slate-800">/</kbd>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-1 text-xs dark:border-white/10">
                <span>Command Palette</span>
                <kbd className="rounded border border-slate-200 bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold dark:border-slate-700 dark:bg-slate-800">Ctrl + K</kbd>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-1 text-xs dark:border-white/10">
                <span>Toggle Dark Mode</span>
                <kbd className="rounded border border-slate-200 bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold dark:border-slate-700 dark:bg-slate-800">Ctrl + D</kbd>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-1 text-xs dark:border-white/10">
                <span>Close Modal</span>
                <kbd className="rounded border border-slate-200 bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold dark:border-slate-700 dark:bg-slate-800">Esc</kbd>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Search Modes
              </h4>
              <div className="flex items-center justify-between border-b border-slate-100 pb-1 text-xs dark:border-white/10">
                <span>Web Search</span>
                <kbd className="rounded border border-slate-200 bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold dark:border-slate-700 dark:bg-slate-800">Alt + W</kbd>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-1 text-xs dark:border-white/10">
                <span>Real Estate</span>
                <kbd className="rounded border border-slate-200 bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold dark:border-slate-700 dark:bg-slate-800">Alt + H</kbd>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-1 text-xs dark:border-white/10">
                <span>People Search</span>
                <kbd className="rounded border border-slate-200 bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold dark:border-slate-700 dark:bg-slate-800">Alt + P</kbd>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-1 text-xs dark:border-white/10">
                <span>Client Folder</span>
                <kbd className="rounded border border-slate-200 bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold dark:border-slate-700 dark:bg-slate-800">Alt + F</kbd>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Audit Memo
            </h4>
            <div className="flex items-center justify-between border-b border-slate-100 pb-1 text-xs dark:border-white/10">
              <span>Open Audit Memo Studio</span>
              <kbd className="rounded border border-slate-200 bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold dark:border-slate-700 dark:bg-slate-800">Alt + N or Ctrl + Shift + M</kbd>
            </div>
          </div>

          <div className="mt-4 border-t border-slate-100 pt-3 text-center text-[11px] font-medium text-slate-400 dark:border-white/10 dark:text-slate-500">
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
  );
}
