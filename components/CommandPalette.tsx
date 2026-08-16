import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CATEGORY_STYLES,
  DEFAULT_PINNED,
  PINNED_PROGRAMS_KEY,
  PROGRAMS,
  RECENT_PROGRAMS_KEY,
  resolveProgramDestination,
} from './ProgramLauncher';
import type { ProgramEntry } from './ProgramLauncher';
import { COMPANY_CONTACTS } from '../data/carrierContacts';
import type { CompanyContact, ContactDetail } from '../data/carrierContacts';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  /** Runs the Agency Matrix client search (also increments the daily counter). */
  onClientSearch: (query: string) => void;
  addToast: (message: string, type?: 'success' | 'warning' | 'danger' | 'info') => void;
}

type PaletteRow =
  | { kind: 'tool'; program: ProgramEntry }
  | { kind: 'client'; query: string }
  | { kind: 'contact'; company: CompanyContact; detail: ContactDetail };

const rowKey = (row: PaletteRow) =>
  row.kind === 'tool'
    ? `tool-${row.program.id}`
    : row.kind === 'client'
      ? 'client-search'
      : `contact-${row.company.id}-${row.detail.label}`;

const readStoredIds = (key: string, fallback: string[] = []): string[] => {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
};

/** Every typed word must appear somewhere in the program's text. */
const programMatches = (program: ProgramEntry, terms: string[]) => {
  const haystack = [program.title, program.description, program.category, program.note]
    .join(' ')
    .toLowerCase();
  return terms.every((term) => haystack.includes(term));
};

const contactMatches = (contact: CompanyContact, terms: string[]) => {
  const haystack = [contact.company, ...contact.aliases].join(' ').toLowerCase();
  return terms.every((term) => haystack.includes(term));
};

const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, onClientSearch, addToast }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      window.setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const rows = useMemo<PaletteRow[]>(() => {
    const trimmed = query.trim();

    // Empty query: recent tools first, then pinned, deduped — the things Bill
    // reaches for anyway, now zero scrolling away.
    if (!trimmed) {
      const programById = Object.fromEntries(PROGRAMS.map((p) => [p.id, p]));
      const ids = [
        ...readStoredIds(RECENT_PROGRAMS_KEY),
        ...readStoredIds(PINNED_PROGRAMS_KEY, DEFAULT_PINNED),
      ];
      const seen = new Set<string>();
      const suggestions: PaletteRow[] = [];
      for (const id of ids) {
        const program = programById[id];
        if (!program || seen.has(id)) continue;
        seen.add(id);
        suggestions.push({ kind: 'tool', program });
        if (suggestions.length >= 8) break;
      }
      return suggestions;
    }

    const terms = trimmed.toLowerCase().split(/\s+/).filter(Boolean);

    // Tools: exact-ish title hits first so "cert" puts Certificates on top.
    const matched = PROGRAMS.filter((p) => programMatches(p, terms));
    const first = terms[0];
    const rank = (p: ProgramEntry) => {
      const title = p.title.toLowerCase();
      if (title.startsWith(first)) return 0;
      if (title.includes(first)) return 1;
      return 2;
    };
    const tools: PaletteRow[] = matched
      .sort((a, b) => rank(a) - rank(b) || a.title.localeCompare(b.title))
      .slice(0, 6)
      .map((program) => ({ kind: 'tool', program }));

    // Contacts: one row per matching company's phone-ish details (max 2 companies).
    const contacts: PaletteRow[] = COMPANY_CONTACTS.filter((c) => contactMatches(c, terms))
      .slice(0, 2)
      .flatMap((company) =>
        company.details
          .filter((detail) => detail.kind === 'phone' || detail.kind === 'fax')
          .slice(0, 3)
          .map((detail): PaletteRow => ({ kind: 'contact', company, detail }))
      );

    // The client search is always reachable: first when nothing else matched,
    // otherwise right after the tool hits.
    const client: PaletteRow = { kind: 'client', query: trimmed };
    return tools.length === 0 && contacts.length === 0
      ? [client]
      : [...tools, client, ...contacts];
  }, [isOpen, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const executeRow = (row: PaletteRow) => {
    if (row.kind === 'tool') {
      const destination = resolveProgramDestination(row.program);
      if (!destination) {
        addToast(`${row.program.title} is a local-only tool. Open it from the local dashboard on this computer.`, 'warning');
        return;
      }
      window.open(destination, '_blank', 'noopener,noreferrer');
      // Keep the launcher's Recent row truthful on next load.
      try {
        const recents = [row.program.id, ...readStoredIds(RECENT_PROGRAMS_KEY).filter((id) => id !== row.program.id)].slice(0, 8);
        window.localStorage.setItem(RECENT_PROGRAMS_KEY, JSON.stringify(recents));
      } catch {
        // Storage full — the tool still opened.
      }
      onClose();
      return;
    }

    if (row.kind === 'client') {
      onClientSearch(row.query);
      onClose();
      return;
    }

    navigator.clipboard
      .writeText(row.detail.value)
      .then(() => addToast(`${row.company.company} — ${row.detail.label} copied.`, 'success'))
      .catch(() => addToast(`${row.company.company} ${row.detail.label}: ${row.detail.value}`, 'info'));
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (rows.length === 0 ? 0 : (prev + 1) % rows.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (rows.length === 0 ? 0 : (prev - 1 + rows.length) % rows.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const row = rows[selectedIndex] ?? rows[0];
      if (row) executeRow(row);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  // Keep the highlighted row in view while arrowing through a long list.
  useEffect(() => {
    const selected = listRef.current?.querySelector('[data-selected="true"]');
    selected?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex, rows]);

  if (!isOpen) return null;

  const renderRow = (row: PaletteRow, index: number) => {
    const isSelected = index === selectedIndex;
    const base = `flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
      isSelected ? 'bg-blue-50 dark:bg-white/10' : 'hover:bg-slate-50 dark:hover:bg-white/5'
    }`;

    if (row.kind === 'tool') {
      const styles = CATEGORY_STYLES[row.program.category];
      return (
        <button
          key={rowKey(row)}
          type="button"
          data-selected={isSelected}
          onClick={() => executeRow(row)}
          onMouseMove={() => setSelectedIndex(index)}
          className={base}
        >
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${styles.iconBg} ${styles.iconText}`}>
            <i className={`${row.program.icon} text-sm`}></i>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-slate-900 dark:text-white">{row.program.title}</span>
            <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
              {row.program.category} · {row.program.note}
            </span>
          </span>
          <span className="shrink-0 text-[11px] font-semibold text-slate-400 dark:text-slate-500">Open</span>
        </button>
      );
    }

    if (row.kind === 'client') {
      const selection = /\d/.test(row.query) ? 'address' : 'name';
      return (
        <button
          key={rowKey(row)}
          type="button"
          data-selected={isSelected}
          onClick={() => executeRow(row)}
          onMouseMove={() => setSelectedIndex(index)}
          className={base}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#003f87] text-white">
            <i className="fa-solid fa-magnifying-glass text-sm"></i>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-slate-900 dark:text-white">
              Search Agency Matrix for “{row.query}”
            </span>
            <span className="block text-xs text-slate-500 dark:text-slate-400">Client search by {selection}</span>
          </span>
          <span className="shrink-0 text-[11px] font-semibold text-slate-400 dark:text-slate-500">Search</span>
        </button>
      );
    }

    return (
      <button
        key={rowKey(row)}
        type="button"
        data-selected={isSelected}
        onClick={() => executeRow(row)}
        onMouseMove={() => setSelectedIndex(index)}
        className={base}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
          <i className={`fa-solid ${row.detail.kind === 'fax' ? 'fa-fax' : 'fa-phone'} text-sm`}></i>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-slate-900 dark:text-white">
            {row.company.company} — {row.detail.label}
          </span>
          <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{row.detail.value}</span>
        </span>
        <span className="shrink-0 text-[11px] font-semibold text-slate-400 dark:text-slate-500">Copy</span>
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-start justify-center px-4 pt-[14vh]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"></div>

      <div
        className="relative w-full max-w-xl animate-slide-down overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-black/30 dark:border-white/10 dark:bg-[#0f1c2e]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 dark:border-white/10">
          <i className="fa-solid fa-bolt text-sm text-[#0076d3]"></i>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a client name, tool, or carrier…"
            className="min-w-0 flex-1 bg-transparent text-base font-medium text-slate-900 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500"
          />
          <kbd className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-400 dark:bg-white/10 dark:text-slate-400">
            Esc
          </kbd>
        </div>

        <div ref={listRef} className="max-h-[46vh] overflow-y-auto p-2 custom-scrollbar">
          {rows.length > 0 ? (
            rows.map(renderRow)
          ) : (
            <div className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
              Open a few tools and they will show here — or just start typing.
            </div>
          )}
        </div>

        <div className="flex items-center justify-center gap-5 border-t border-slate-100 bg-slate-50 px-4 py-2 text-[11px] text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
          <span className="flex items-center gap-1.5">
            <kbd className="rounded bg-white px-1.5 py-0.5 font-mono text-[10px] font-bold shadow-sm dark:bg-white/10">↑↓</kbd>
            Choose
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="rounded bg-white px-1.5 py-0.5 font-mono text-[10px] font-bold shadow-sm dark:bg-white/10">Enter</kbd>
            Open
          </span>
          <span className="hidden items-center gap-1.5 sm:flex">
            <i className="fa-solid fa-circle-info text-[10px]"></i>
            No match? Enter searches Agency Matrix
          </span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
