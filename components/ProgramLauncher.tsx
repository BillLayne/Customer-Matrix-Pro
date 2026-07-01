import React, { useMemo, useState } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface ProgramLauncherProps {
  addToast: (message: string, type?: 'success' | 'warning' | 'danger' | 'info') => void;
}

type ProgramCategory = 'Operations' | 'Documents & Forms' | 'Property & Coverage';

interface ProgramEntry {
  id: string;
  title: string;
  category: ProgramCategory;
  description: string;
  target: string;
  hostedTarget?: string;
  icon: string;
  accent: string;
  note: string;
  targetType: 'local' | 'web';
}

const PROGRAMS: ProgramEntry[] = [
  {
    id: 'send-docs',
    title: 'Send Documents',
    category: 'Operations',
    description: 'Create and open the live Send Bill Docs agent link generator.',
    target: 'https://www.sendbilldocs.com/agent.html',
    icon: 'fa-solid fa-file-arrow-up',
    accent: 'from-sky-700 to-cyan-500',
    note: 'Live agent portal',
    targetType: 'web',
  },
  {
    id: 'quote-follow-up',
    title: 'Quote Drip Follow Up',
    category: 'Operations',
    description: 'Open the live quote follow-up manager for drip campaigns and sales follow-up.',
    target: 'https://quote-follow-up-manager-cloudflare.pages.dev/',
    icon: 'fa-solid fa-envelopes-bulk',
    accent: 'from-indigo-700 to-violet-500',
    note: 'Live cloud app',
    targetType: 'web',
  },
  {
    id: 'ai-task-manager',
    title: 'AI Task Manager',
    category: 'Operations',
    description: 'Open your AI-powered task manager for agency follow-ups, reminders, and daily work tracking.',
    target: 'https://ai-task-manager.bill-7e3.workers.dev',
    icon: 'fa-solid fa-list-check',
    accent: 'from-blue-950 to-cyan-500',
    note: 'Live Workers app',
    targetType: 'web',
  },
  {
    id: 'sms-command-center',
    title: 'SMS Command Center',
    category: 'Operations',
    description: 'Open the central Twilio text line for sending documents, insurance cards, receipts, images, and customer SMS replies.',
    target: 'https://agency-sms-command-center.bill-7e3.workers.dev',
    icon: 'fa-solid fa-comments',
    accent: 'from-emerald-900 to-teal-500',
    note: 'Live text line',
    targetType: 'web',
  },
  {
    id: 'renewal-gmail-program',
    title: 'Renewal Gmail Program',
    category: 'Operations',
    description: 'Open the renewal Gmail workflow for renewal-focused customer messages.',
    target: 'https://renewal-gmail-program.pages.dev/',
    hostedTarget: 'https://renewal-gmail-program.pages.dev/',
    icon: 'fa-solid fa-envelope-circle-check',
    accent: 'from-blue-900 to-cyan-500',
    note: 'Live Pages app',
    targetType: 'web',
  },
  {
    id: 'agency-quote-link-host',
    title: 'Hosted Quote Links',
    category: 'Operations',
    description: 'Create hosted quote and customer links for sending clean cloud URLs to clients.',
    target: 'https://agency-quote-link-host.bill-7e3.workers.dev/',
    hostedTarget: 'https://agency-quote-link-host.bill-7e3.workers.dev/',
    icon: 'fa-solid fa-link',
    accent: 'from-cyan-800 to-blue-500',
    note: 'Hosted link builder',
    targetType: 'web',
  },
  {
    id: 'claude-designer',
    title: 'Claude Designer',
    category: 'Operations',
    description: 'Open your Claude Designer program for creating polished documents and emails.',
    target: 'https://claude.ai/design/p/2d67b336-76a7-40c8-803f-68a57c3d947c',
    hostedTarget: 'https://claude.ai/design/p/2d67b336-76a7-40c8-803f-68a57c3d947c',
    icon: 'fa-solid fa-pen-nib',
    accent: 'from-violet-800 to-fuchsia-500',
    note: 'Design workspace',
    targetType: 'web',
  },
  {
    id: 'html-studio',
    title: 'HTML Studio',
    category: 'Operations',
    description: 'Paste HTML from AI, inspect it live, switch mobile or desktop widths, and export clean preview files.',
    target: '/html-studio.html',
    hostedTarget: '/html-studio.html',
    icon: 'fa-solid fa-code',
    accent: 'from-slate-900 to-blue-600',
    note: 'Hosted in dashboard',
    targetType: 'web',
  },
  {
    id: 'insurance-cards',
    title: 'Insurance Card Generator',
    category: 'Documents & Forms',
    description: 'Generate and print customer insurance cards with a clean issuance flow.',
    target: 'C:\\Users\\bill\\OneDrive\\Documents\\Playground\\insurance-card-generator-2026-color-edition\\index.html',
    hostedTarget: 'https://insurance-card-generator-2026-color-edition.pages.dev/',
    icon: 'fa-solid fa-id-card',
    accent: 'from-indigo-700 to-blue-500',
    note: 'Standalone HTML tool',
    targetType: 'local',
  },
  {
    id: 'carrier-contact-pages',
    title: 'Carrier & Agency Contacts',
    category: 'Documents & Forms',
    description: 'Open the carrier and agency contact page index from the insurance card tool.',
    target: 'https://insurance-card-generator-2026-color-edition.pages.dev/contact-page-index',
    hostedTarget: 'https://insurance-card-generator-2026-color-edition.pages.dev/contact-page-index',
    icon: 'fa-solid fa-address-book',
    accent: 'from-teal-800 to-cyan-500',
    note: 'Live contact index',
    targetType: 'web',
  },
  {
    id: 'customer-reference-card',
    title: 'Customer Reference Card',
    category: 'Documents & Forms',
    description: 'Build the insurance customer reference card with agency details loaded.',
    target: 'https://insurance-card-generator-2026-color-edition.pages.dev/?builder=policy-reference&agency=1',
    hostedTarget: 'https://insurance-card-generator-2026-color-edition.pages.dev/?builder=policy-reference&agency=1',
    icon: 'fa-solid fa-clipboard-list',
    accent: 'from-indigo-800 to-sky-500',
    note: 'Live card builder',
    targetType: 'web',
  },
  {
    id: 'poi-generator',
    title: 'POI Generator',
    category: 'Documents & Forms',
    description: 'Parse carrier applications and build polished proof-of-insurance PDFs with Gemini.',
    target: 'C:\\Users\\bill\\OneDrive\\Documents\\Playground\\bill-layne-insurance-poi-generator\\index.html',
    hostedTarget: 'https://bill-layne-insurance-poi-generator.pages.dev',
    icon: 'fa-solid fa-file-pdf',
    accent: 'from-blue-800 to-cyan-500',
    note: 'Live cloud app',
    targetType: 'local',
  },
  {
    id: 'certificate-generator',
    title: 'Certificates',
    category: 'Documents & Forms',
    description: 'Open the live certificate platform for COIs and certificate work.',
    target: 'https://coi-certificates-certguard-ai.pages.dev/',
    icon: 'fa-solid fa-certificate',
    accent: 'from-teal-700 to-emerald-500',
    note: 'Live cloud app',
    targetType: 'web',
  },
  {
    id: 'envelope-maker',
    title: 'Envelope Maker',
    category: 'Documents & Forms',
    description: 'Open the envelope addressing program for fast document mailings.',
    target: 'C:\\Users\\bill\\OneDrive\\Documents\\Envelope-Maker\\index.html',
    hostedTarget: 'https://envelope-maker-cte.pages.dev',
    icon: 'fa-solid fa-envelope',
    accent: 'from-fuchsia-700 to-rose-500',
    note: 'Hosted cloud app',
    targetType: 'local',
  },
  {
    id: 'receipt-maker',
    title: 'Receipt Maker',
    category: 'Documents & Forms',
    description: 'Create clean customer receipts for payments, confirmations, and recordkeeping.',
    target: 'https://billlayne.github.io/Receipt-Maker/index.html',
    hostedTarget: 'https://billlayne.github.io/Receipt-Maker/index.html',
    icon: 'fa-solid fa-receipt',
    accent: 'from-amber-700 to-yellow-500',
    note: 'Live hosted tool',
    targetType: 'web',
  },
  {
    id: 'nc-grange-down-payment',
    title: 'NC Grange Down Payment',
    category: 'Documents & Forms',
    description: 'Calculate NC Grange Mutual down payments and payment plan breakdowns for home insurance quotes.',
    target: '/nc-grange-down-payment-calculator.html',
    hostedTarget: '/nc-grange-down-payment-calculator.html',
    icon: 'fa-solid fa-calculator',
    accent: 'from-blue-900 to-emerald-500',
    note: 'Hosted in dashboard',
    targetType: 'web',
  },
  {
    id: 'quote-template-studio',
    title: 'Quote Template Studio',
    category: 'Documents & Forms',
    description: 'Open the live PDF-to-quote studio for building polished quote templates and proposal layouts.',
    target: 'https://quote-template-studio.pages.dev/',
    hostedTarget: 'https://quote-template-studio.pages.dev/',
    icon: 'fa-solid fa-file-lines',
    accent: 'from-blue-800 to-violet-500',
    note: 'Live cloud app',
    targetType: 'web',
  },
  {
    id: 'pdf-quote-creator',
    title: 'PDF Quote Creator',
    category: 'Documents & Forms',
    description: 'Open the live quote image creator for building polished PDF-style quote visuals and exports.',
    target: 'https://insurance-quote-image-creator.bill-7e3.workers.dev/',
    hostedTarget: 'https://insurance-quote-image-creator.bill-7e3.workers.dev/',
    icon: 'fa-solid fa-file-image',
    accent: 'from-sky-800 to-indigo-500',
    note: 'Live Workers app',
    targetType: 'web',
  },
  {
    id: 'hazard-collages',
    title: 'Hazard Photo Collages',
    category: 'Documents & Forms',
    description: 'Create observation and hazard photo collages for inspections, underwriting, and client documentation.',
    target: 'https://chatgpt.com/g/g-p-6a0c8997403c8191897c34fba8e553e7-observation-hazard-photo-collage-generator/project',
    hostedTarget: 'https://chatgpt.com/g/g-p-6a0c8997403c8191897c34fba8e553e7-observation-hazard-photo-collage-generator/project',
    icon: 'fa-solid fa-triangle-exclamation',
    accent: 'from-orange-700 to-amber-500',
    note: 'Photo collage GPT',
    targetType: 'web',
  },
  {
    id: 'photo-guide-creator',
    title: 'Photo Guide Creator',
    category: 'Documents & Forms',
    description: 'Build branded photo guide emails and layouts from the hosted photo guide composer.',
    target: '/photo-guide-composer.html',
    hostedTarget: '/photo-guide-composer.html',
    icon: 'fa-solid fa-images',
    accent: 'from-fuchsia-700 to-indigo-500',
    note: 'Hosted in dashboard',
    targetType: 'web',
  },
  {
    id: 'dl123-generator',
    title: 'DL123 Generator',
    category: 'Documents & Forms',
    description: 'Open the hosted DL123 maker for North Carolina driver license liability insurance certifications.',
    target: '/dl123-generator/index.html',
    hostedTarget: '/dl123-generator/index.html',
    icon: 'fa-solid fa-file-shield',
    accent: 'from-blue-900 to-cyan-500',
    note: 'Hosted in dashboard',
    targetType: 'web',
  },
  {
    id: 'cancellation-form',
    title: 'Cancellation Link Generator',
    category: 'Documents & Forms',
    description: 'Generate live cancellation form links for customers and policy changes.',
    target: 'https://thecancellationform.com/link-generator.html',
    icon: 'fa-solid fa-ban',
    accent: 'from-rose-700 to-red-500',
    note: 'Live link generator',
    targetType: 'web',
  },
  {
    id: 'no-loss',
    title: 'No Loss Form Generator',
    category: 'Documents & Forms',
    description: 'Build live no-loss statement links from the agent portal.',
    target: 'https://mynolossform.com/agent-portal.html',
    icon: 'fa-solid fa-file-signature',
    accent: 'from-slate-700 to-slate-500',
    note: 'Live agent portal',
    targetType: 'web',
  },
  {
    id: 'home-inventory',
    title: 'Home Inventory',
    category: 'Property & Coverage',
    description: 'Guide clients through room-by-room inventory capture for better coverage reviews.',
    target: 'C:\\Users\\bill\\OneDrive\\Documents\\Playground\\HOME-INVENTORY\\index.html',
    hostedTarget: 'https://billlayne.github.io/HOME-INVENTORY/',
    icon: 'fa-solid fa-box-open',
    accent: 'from-violet-700 to-indigo-500',
    note: 'Standalone HTML tool',
    targetType: 'local',
  },
  {
    id: 'home-rebuild',
    title: 'Home Rebuild Estimator',
    category: 'Property & Coverage',
    description: 'Open the rebuild-cost estimator for replacement-cost conversations.',
    target: 'C:\\Users\\bill\\OneDrive\\Documents\\Playground\\HOME-REBUILD-ESTIMATOR\\public\\index.html',
    hostedTarget: 'https://home-rebuild-estimator.pages.dev',
    icon: 'fa-solid fa-house-circle-exclamation',
    accent: 'from-amber-700 to-orange-500',
    note: 'Public HTML entry',
    targetType: 'local',
  },
  {
    id: 'condo-coverage',
    title: 'Condo Coverage Calculator',
    category: 'Property & Coverage',
    description: 'Estimate walls-in condo coverage needs for HO-6 discussions.',
    target: 'C:\\Users\\bill\\OneDrive\\Documents\\Playground\\CONDO-COVERAGE-CALCULATOR\\public\\index.html',
    hostedTarget: 'https://condo-coverage-calculator.pages.dev',
    icon: 'fa-solid fa-building-user',
    accent: 'from-cyan-700 to-sky-500',
    note: 'Public HTML entry',
    targetType: 'local',
  },
  {
    id: 'nc-tools-property',
    title: 'NC Tools Property Lookup',
    category: 'Property & Coverage',
    description: 'Open the live NC insurance tools property lookup workspace.',
    target: 'https://nc-insurance-tools-gemini.pages.dev/',
    hostedTarget: 'https://nc-insurance-tools-gemini.pages.dev/',
    icon: 'fa-solid fa-map-location-dot',
    accent: 'from-emerald-700 to-teal-500',
    note: 'Live cloud app',
    targetType: 'web',
  },
  {
    id: 'agency-site',
    title: 'Agency Website',
    category: 'Operations',
    description: 'Open the local site build when you want your public pages close at hand.',
    target: 'C:\\Users\\bill\\OneDrive\\Documents\\Playground\\Bill-Layne-Insurance-Agency\\index.html',
    hostedTarget: 'https://www.billlayneinsurance.com',
    icon: 'fa-solid fa-earth-americas',
    accent: 'from-blue-900 to-slate-700',
    note: 'Local site entry',
    targetType: 'local',
  },
];

const CATEGORY_ORDER: ProgramCategory[] = ['Operations', 'Documents & Forms', 'Property & Coverage'];

const CATEGORY_ICONS: Record<ProgramCategory, string> = {
  Operations: 'fa-solid fa-bolt',
  'Documents & Forms': 'fa-solid fa-folder-open',
  'Property & Coverage': 'fa-solid fa-house-circle-check',
};

const CATEGORY_STYLES: Record<ProgramCategory, { iconBg: string; iconText: string }> = {
  Operations: {
    iconBg: 'bg-blue-50 dark:bg-blue-500/15',
    iconText: 'text-[#0069bd] dark:text-sky-300',
  },
  'Documents & Forms': {
    iconBg: 'bg-emerald-50 dark:bg-emerald-500/15',
    iconText: 'text-emerald-700 dark:text-emerald-300',
  },
  'Property & Coverage': {
    iconBg: 'bg-amber-50 dark:bg-amber-500/15',
    iconText: 'text-amber-700 dark:text-amber-300',
  },
};

const byProgramTitle = (a: ProgramEntry, b: ProgramEntry) =>
  a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });

const sortProgramsByTitle = (programs: ProgramEntry[]) => [...programs].sort(byProgramTitle);

const RECENT_PROGRAMS_KEY = 'matrix-pro-recent-programs';
const PINNED_PROGRAMS_KEY = 'matrix-pro-pinned-programs';

const DEFAULT_PINNED: string[] = [
  'send-docs',
  'sms-command-center',
  'certificate-generator',
  'poi-generator',
  'insurance-cards',
  'dl123-generator',
  'pdf-quote-creator',
  'no-loss',
  'agency-quote-link-host',
  'claude-designer',
  'hazard-collages',
  'carrier-contact-pages',
];

const toFileUrl = (windowsPath: string) => encodeURI(`file:///${windowsPath.replace(/\\/g, '/')}`);

const ProgramLauncher: React.FC<ProgramLauncherProps> = ({ addToast }) => {
  const isHostedDashboard =
    window.location.protocol.startsWith('http') &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1';
  const [recentProgramIds, setRecentProgramIds] = useLocalStorage<string[]>(RECENT_PROGRAMS_KEY, []);
  const [pinnedProgramIds, setPinnedProgramIds] = useLocalStorage<string[]>(PINNED_PROGRAMS_KEY, DEFAULT_PINNED);
  const [filterQuery, setFilterQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<ProgramCategory | 'All'>('All');

  const programMap = useMemo(
    () => Object.fromEntries(PROGRAMS.map((program) => [program.id, program])),
    []
  );

  const pinnedPrograms = useMemo(
    () =>
      pinnedProgramIds
        .map((programId) => programMap[programId])
        .filter((program): program is ProgramEntry => Boolean(program)),
    [programMap, pinnedProgramIds]
  );

  const recentPrograms = useMemo(
    () =>
      recentProgramIds
        .map((programId) => programMap[programId])
        .filter((program): program is ProgramEntry => Boolean(program))
        .slice(0, 6),
    [programMap, recentProgramIds]
  );

  const normalizedFilter = filterQuery.trim().toLowerCase();

  const filteredPrograms = useMemo(() => {
    if (!normalizedFilter) return [];
    return sortProgramsByTitle(
      PROGRAMS.filter((program) =>
        [program.title, program.description, program.category, program.note]
          .join(' ')
          .toLowerCase()
          .includes(normalizedFilter)
      )
    );
  }, [normalizedFilter]);

  const groupedPrograms = useMemo(
    () =>
      CATEGORY_ORDER.filter((category) => activeCategory === 'All' || activeCategory === category).map(
        (category) => ({
          category,
          items: sortProgramsByTitle(PROGRAMS.filter((program) => program.category === category)),
        })
      ),
    [activeCategory]
  );

  const togglePin = (program: ProgramEntry) => {
    setPinnedProgramIds((prev) => {
      if (prev.includes(program.id)) {
        addToast(`${program.title} unpinned.`, 'info');
        return prev.filter((id) => id !== program.id);
      }
      addToast(`${program.title} pinned to the top.`, 'success');
      return [...prev, program.id];
    });
  };

  const openProgram = (program: ProgramEntry) => {
    if (isHostedDashboard && program.targetType === 'local' && !program.hostedTarget) {
      addToast(`${program.title} is a local-only tool. Open it from the local dashboard on this computer.`, 'warning');
      return;
    }

    const destination = isHostedDashboard && program.hostedTarget
      ? program.hostedTarget
      : program.targetType === 'web'
        ? program.target
        : toFileUrl(program.target);
    const newWindow = window.open(destination, '_blank', 'noopener,noreferrer');
    if (newWindow) {
      setRecentProgramIds((prev) => [program.id, ...prev.filter((item) => item !== program.id)].slice(0, 8));
      addToast(`Opening ${program.title}...`, 'info');
      return;
    }

    addToast(`Popup blocked while opening ${program.title}. Please allow popups for this dashboard.`, 'warning');
  };

  const renderTile = (program: ProgramEntry) => {
    const isPinned = pinnedProgramIds.includes(program.id);
    const styles = CATEGORY_STYLES[program.category];
    return (
      <button
        key={program.id}
        type="button"
        onClick={() => openProgram(program)}
        title={program.description}
        className="group flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-[#0076d3]/50 hover:shadow-md dark:border-white/10 dark:bg-white/5 dark:hover:border-cyan-400/40"
      >
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${styles.iconBg} ${styles.iconText}`}>
          <i className={`${program.icon} text-base`}></i>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-slate-900 dark:text-white">
            {program.title}
          </span>
          <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{program.note}</span>
        </span>
        <span
          role="button"
          aria-label={isPinned ? `Unpin ${program.title}` : `Pin ${program.title}`}
          onClick={(e) => {
            e.stopPropagation();
            togglePin(program);
          }}
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm transition ${
            isPinned
              ? 'text-amber-500 hover:text-slate-400'
              : 'text-slate-300 opacity-0 hover:text-amber-500 group-hover:opacity-100 dark:text-slate-600'
          }`}
          title={isPinned ? 'Unpin from top' : 'Pin to top'}
        >
          <i className={`${isPinned ? 'fa-solid' : 'fa-regular'} fa-star`}></i>
        </span>
      </button>
    );
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5 sm:p-5">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="flex items-center gap-2.5 font-outfit text-lg font-bold tracking-tight text-slate-900 dark:text-white sm:text-xl">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900">
              <i className="fa-solid fa-table-cells-large text-sm"></i>
            </span>
            Program Launcher
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Every agency tool in one place. Star the ones you use most to keep them on top.
          </p>
        </div>

        <div className="relative w-full lg:max-w-xs">
          <i className="fa-solid fa-filter pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400"></i>
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Filter tools… (e.g. certificate)"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-9 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#0076d3]/60 focus:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500"
          />
          {filterQuery && (
            <button
              type="button"
              onClick={() => setFilterQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600 dark:hover:text-slate-200"
              aria-label="Clear filter"
            >
              <i className="fa-solid fa-circle-xmark"></i>
            </button>
          )}
        </div>
      </div>

      {normalizedFilter ? (
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {filteredPrograms.length} {filteredPrograms.length === 1 ? 'match' : 'matches'}
          </p>
          {filteredPrograms.length > 0 ? (
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredPrograms.map(renderTile)}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
              No tools match “{filterQuery}”. Try a shorter word.
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {pinnedPrograms.length > 0 && (
            <section>
              <div className="mb-2.5 flex items-center gap-2">
                <i className="fa-solid fa-star text-xs text-amber-500"></i>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Pinned
                </h3>
              </div>
              <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {pinnedPrograms.map(renderTile)}
              </div>
            </section>
          )}

          {recentPrograms.length > 0 && (
            <section>
              <div className="mb-2.5 flex items-center gap-2">
                <i className="fa-solid fa-clock-rotate-left text-xs text-slate-400"></i>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Recent
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {recentPrograms.map((program) => (
                  <button
                    key={program.id}
                    onClick={() => openProgram(program)}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-[#0076d3]/50 hover:bg-white hover:text-[#003f87] dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:text-white"
                  >
                    <i className={`${program.icon} text-[11px]`}></i>
                    {program.title}
                  </button>
                ))}
              </div>
            </section>
          )}

          <section>
            <div className="mb-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4 dark:border-white/10">
              <h3 className="mr-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                All Tools
              </h3>
              {(['All', ...CATEGORY_ORDER] as Array<ProgramCategory | 'All'>).map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setActiveCategory(category)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                    activeCategory === category
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                      : 'border border-slate-200 bg-white text-slate-500 hover:border-[#0076d3]/40 hover:text-[#003f87] dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:text-white'
                  }`}
                >
                  {category === 'All'
                    ? `All (${PROGRAMS.length})`
                    : `${category} (${PROGRAMS.filter((p) => p.category === category).length})`}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              {groupedPrograms.map((group) => (
                <div key={group.category}>
                  <div className="mb-2 flex items-center gap-2">
                    <i className={`${CATEGORY_ICONS[group.category]} text-xs ${CATEGORY_STYLES[group.category].iconText}`}></i>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      {group.category}
                    </h4>
                  </div>
                  <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {group.items.map(renderTile)}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default ProgramLauncher;
