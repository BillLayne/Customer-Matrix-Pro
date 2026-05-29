import React, { useEffect, useMemo, useState } from 'react';
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

interface LauncherCollection {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  icon: string;
  accent: string;
  programIds: string[];
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

const CATEGORY_DESCRIPTIONS: Record<ProgramCategory, string> = {
  Operations: 'Communication, delivery, and daily workflow tools.',
  'Documents & Forms': 'Issue forms, proof, cards, quotes, and customer-facing paperwork.',
  'Property & Coverage': 'Address-first research, rebuild help, and coverage estimate tools.',
};

const FEATURED_COLLECTIONS: LauncherCollection[] = [
  {
    id: 'most-used',
    eyebrow: 'Most Used',
    title: 'Start with the tools people reach for first',
    description: 'These are the fastest paths for customer communication, certificates, proof, and quote delivery.',
    icon: 'fa-solid fa-star',
    accent: 'from-[#003f87] via-[#0076d3] to-cyan-400',
    programIds: ['send-docs', 'sms-command-center', 'certificate-generator', 'poi-generator', 'insurance-cards', 'pdf-quote-creator'],
  },
  {
    id: 'coverage-lane',
    eyebrow: 'Coverage Lane',
    title: 'When the next question starts with an address or dwelling',
    description: 'Property lookup, rebuild cost help, and condo coverage tools grouped into one path.',
    icon: 'fa-solid fa-house-circle-check',
    accent: 'from-emerald-800 via-teal-700 to-cyan-500',
    programIds: ['nc-tools-property', 'home-rebuild', 'condo-coverage', 'home-inventory', 'nc-grange-down-payment'],
  },
];

const RECENT_PROGRAMS_KEY = 'matrix-pro-recent-programs';

const toFileUrl = (windowsPath: string) => encodeURI(`file:///${windowsPath.replace(/\\/g, '/')}`);

const displayPath = (windowsPath: string) =>
  windowsPath
    .replace('C:\\Users\\bill\\OneDrive\\Documents\\Playground\\', '')
    .replace('C:\\Users\\bill\\OneDrive\\Documents\\', '');

const groupedPrograms = CATEGORY_ORDER.map((category) => ({
  category,
  items: PROGRAMS.filter((program) => program.category === category),
}));

const ProgramLauncher: React.FC<ProgramLauncherProps> = ({ addToast }) => {
  const isHostedDashboard = window.location.protocol.startsWith('http') && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
  const [recentProgramIds, setRecentProgramIds] = useLocalStorage<string[]>(RECENT_PROGRAMS_KEY, []);
  const [isMobileView, setIsMobileView] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<ProgramCategory, boolean>>({
    Operations: true,
    'Documents & Forms': false,
    'Property & Coverage': false,
  });

  const programMap = useMemo(
    () => Object.fromEntries(PROGRAMS.map((program) => [program.id, program])),
    []
  );

  const featuredCollections = useMemo(
    () =>
      FEATURED_COLLECTIONS.map((collection) => ({
        ...collection,
        items: collection.programIds
          .map((programId) => programMap[programId])
          .filter((program): program is ProgramEntry => Boolean(program)),
      })),
    [programMap]
  );

  const recentPrograms = useMemo(
    () =>
      recentProgramIds
        .map((programId) => programMap[programId])
        .filter((program): program is ProgramEntry => Boolean(program))
        .slice(0, 6),
    [programMap, recentProgramIds]
  );

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

  const toggleCategory = (category: ProgramCategory) => {
    setExpandedCategories((prev) => ({ ...prev, [category]: !prev[category] }));
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

  return (
    <div className="rounded-[1.45rem] border border-slate-200/70 bg-white/80 p-4 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.5)] backdrop-blur-xl sm:rounded-[1.75rem] sm:p-5 dark:border-white/10 dark:bg-white/5">
      <div className="mb-4 flex flex-col gap-2 lg:mb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.35em] text-[#0076d3] dark:text-cyan-300">
            Guided Tool Launchers
          </p>
          <h2 className="mt-1 font-outfit text-xl font-black tracking-tight text-slate-900 sm:text-2xl dark:text-white">
            Open the right agency tool without hunting for it
          </h2>
        </div>
        <p className="max-w-xl text-xs leading-5 text-slate-500 dark:text-slate-300">
          Featured tools come first, recent tools stay visible, and the full launcher wall still lives underneath.
        </p>
      </div>

      <div className="space-y-3 sm:space-y-5">
        {featuredCollections.map((collection) => (
          <section
            key={collection.id}
            className="overflow-hidden rounded-[1.25rem] border border-slate-200/80 bg-slate-50/80 shadow-[0_16px_40px_-34px_rgba(15,23,42,0.45)] dark:border-white/10 dark:bg-white/5"
          >
            <div className={`h-2 bg-gradient-to-r ${collection.accent}`}></div>
            <div className="p-4 sm:p-5">
              <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div className="flex items-start gap-3">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem] bg-gradient-to-br ${collection.accent} text-white shadow-lg`}>
                    <i className={`${collection.icon} text-base`}></i>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-400">
                      {collection.eyebrow}
                    </p>
                    <h3 className="mt-1 font-outfit text-lg font-black tracking-tight text-slate-900 dark:text-white">
                      {collection.title}
                    </h3>
                    <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-300">
                      {collection.description}
                    </p>
                  </div>
                </div>
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                  {collection.items.length} shortcuts
                </span>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {collection.items.map((program) => (
                  <button
                    key={program.id}
                    onClick={() => openProgram(program)}
                    className="group rounded-[1.1rem] border border-slate-200/80 bg-white/90 p-4 text-left shadow-[0_16px_40px_-36px_rgba(15,23,42,0.8)] transition hover:-translate-y-1 hover:border-[#0076d3]/40 hover:shadow-xl dark:border-white/10 dark:bg-[#0b1727]/80"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.95rem] bg-gradient-to-br ${program.accent} text-white shadow-lg`}>
                        <i className={`${program.icon} text-sm`}></i>
                      </div>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500 dark:bg-white/10 dark:text-slate-300">
                        {program.note}
                      </span>
                    </div>
                    <h4 className="mt-4 font-outfit text-lg font-black tracking-tight text-slate-900 dark:text-white">
                      {program.title}
                    </h4>
                    <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-300">
                      {program.description}
                    </p>
                    <div className="mt-4 inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#003f87] transition group-hover:text-[#0076d3] dark:text-cyan-300">
                      <i className="fa-solid fa-arrow-up-right-from-square"></i>
                      Open now
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </section>
        ))}

        <section className="rounded-[1.2rem] border border-slate-200/80 bg-white/90 p-4 shadow-[0_16px_40px_-34px_rgba(15,23,42,0.4)] dark:border-white/10 dark:bg-[#0b1727]/80">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-400">
                Recent Tools
              </p>
              <h3 className="mt-1 font-outfit text-lg font-black tracking-tight text-slate-900 dark:text-white">
                Jump back into what you opened last
              </h3>
            </div>
            <p className="max-w-xl text-xs leading-5 text-slate-500 dark:text-slate-300">
              This keeps the launcher friendlier for repeat work, especially when someone uses the same 3 to 5 tools all day.
            </p>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {recentPrograms.length > 0 ? (
              recentPrograms.map((program) => (
                <button
                  key={program.id}
                  onClick={() => openProgram(program)}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-slate-600 transition hover:border-[#0076d3]/40 hover:text-[#003f87] dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                >
                  <i className={program.icon}></i>
                  {program.title}
                </button>
              ))
            ) : (
              <div className="rounded-full border border-dashed border-slate-200 bg-slate-50 px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-slate-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
                Open a tool and it will show here
              </div>
            )}
          </div>
        </section>

        {groupedPrograms.map((group) => (
          <section key={group.category}>
            <div className="mb-3">
              {isMobileView ? (
                <button
                  type="button"
                  onClick={() => toggleCategory(group.category)}
                  className="flex w-full items-center gap-3 rounded-[1.2rem] border border-slate-200 bg-slate-50/80 px-4 py-4 text-left dark:border-white/10 dark:bg-white/5"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem] bg-slate-900 text-white dark:bg-[#0076d3]">
                    <i className={`${CATEGORY_ICONS[group.category]} text-base`}></i>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-xs font-black uppercase tracking-[0.22em] text-slate-700 dark:text-slate-100">
                      {group.category}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">
                      {CATEGORY_DESCRIPTIONS[group.category]}
                    </p>
                  </div>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
                    <i className={`fa-solid ${expandedCategories[group.category] ? 'fa-chevron-up' : 'fa-chevron-down'} text-sm`}></i>
                  </div>
                </button>
              ) : (
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-[0.24em] text-slate-500 dark:text-slate-300">
                      {group.category}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">
                      {CATEGORY_DESCRIPTIONS[group.category]}
                    </p>
                  </div>
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                    {group.items.length} tools
                  </span>
                </div>
              )}
            </div>

            {(!isMobileView || expandedCategories[group.category]) && (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {group.items.map((program) => (
                  <article
                    key={program.id}
                    className="overflow-hidden rounded-[1.2rem] border border-slate-200/80 bg-white/90 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.8)] transition hover:-translate-y-1 hover:border-[#0076d3]/40 hover:shadow-xl sm:rounded-[1.35rem] dark:border-white/10 dark:bg-[#0b1727]/80"
                  >
                    <div className={`h-2 bg-gradient-to-r ${program.accent}`}></div>
                    <div className="p-4">
                      <div className="mb-4 flex items-start gap-3 sm:justify-between">
                        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem] bg-gradient-to-br ${program.accent} text-white shadow-lg`}>
                          <i className={`${program.icon} text-base`}></i>
                        </div>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500 dark:bg-white/10 dark:text-slate-300">
                          {program.note}
                        </span>
                      </div>

                      <h4 className="font-outfit text-lg font-black tracking-tight text-slate-900 sm:text-xl dark:text-white">
                        {program.title}
                      </h4>
                      <p className="mt-2 text-[13px] leading-5 text-slate-500 sm:text-sm dark:text-slate-300">{program.description}</p>

                      <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-3 dark:border-white/10 dark:bg-white/5">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-400">
                          {program.targetType === 'web' ? 'Live link' : 'Local entry'}
                        </p>
                        <p className="mt-2 break-all text-xs leading-5 text-slate-500 dark:text-slate-300">
                          {isHostedDashboard && program.hostedTarget
                            ? program.hostedTarget
                            : program.targetType === 'web'
                              ? program.target
                              : displayPath(program.target)}
                        </p>
                      </div>

                      <button
                        onClick={() => openProgram(program)}
                        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-white transition hover:bg-[#003f87] dark:bg-white dark:text-slate-900 dark:hover:bg-cyan-300"
                      >
                        <i className="fa-solid fa-arrow-up-right-from-square"></i>
                        Open Tool
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
};

export default ProgramLauncher;
