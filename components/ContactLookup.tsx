import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import Modal from './Modal';
import { useLocalStorage } from '../hooks/useLocalStorage';
import {
  COMPANY_CONTACTS,
  findCompanyContacts,
  normalizeCompanyName,
  type CompanyContact,
  type ContactDetail,
  type ContactDetailKind,
} from '../data/carrierContacts';

interface ContactLookupProps {
  query: string;
  onQueryChange: (query: string) => void;
  addToast: (message: string, type?: 'success' | 'warning' | 'danger' | 'info') => void;
}

interface ManualContactEntry {
  id: string;
  company: string;
  kind: ContactDetailKind;
  label: string;
  value: string;
  createdAt: number;
}

interface ManualContactForm {
  company: string;
  kind: ContactDetailKind;
  label: string;
  value: string;
}

const MANUAL_CONTACTS_STORAGE_KEY = 'matrix-pro-manual-company-contacts';

const DEFAULT_LABELS: Record<ContactDetailKind, string> = {
  phone: 'Customer service',
  fax: 'Fax',
  email: 'Email',
  website: 'Website',
};

const EMPTY_MANUAL_FORM: ManualContactForm = {
  company: '',
  kind: 'phone',
  label: DEFAULT_LABELS.phone,
  value: '',
};

const detailHref = (detail: ContactDetail) => {
  if (detail.kind === 'phone') return `tel:${detail.value.replace(/[^\d+]/g, '')}`;
  if (detail.kind === 'email') return `mailto:${detail.value}`;
  if (detail.kind === 'website') {
    return detail.value.startsWith('http') ? detail.value : `https://${detail.value}`;
  }
  return null;
};

const detailIcon: Record<ContactDetailKind, string> = {
  phone: 'fa-phone',
  fax: 'fa-fax',
  email: 'fa-envelope',
  website: 'fa-globe',
};

const mobileDetailLabel = (label: string) =>
  label === 'Workers comp phone' ? 'WC phone' : label;

const mergeManualContacts = (manualEntries: ManualContactEntry[]): CompanyContact[] => {
  const directory = COMPANY_CONTACTS.map((contact) => ({
    ...contact,
    aliases: [...contact.aliases],
    details: [...contact.details],
  }));

  manualEntries.forEach((entry) => {
    const normalizedCompany = normalizeCompanyName(entry.company);
    let contact = directory.find((candidate) => {
      const knownNames = [candidate.company, ...candidate.aliases].map(normalizeCompanyName);
      return knownNames.includes(normalizedCompany);
    });

    if (!contact) {
      contact = {
        id: `manual-${normalizedCompany.replace(/\s+/g, '-')}`,
        company: entry.company,
        aliases: [],
        category: 'Saved contact',
        details: [],
        source: 'Added manually in Agency Command Center',
      };
      directory.push(contact);
    }

    contact.details.push({
      label: entry.label,
      value: entry.value,
      kind: entry.kind,
    });
  });

  return directory;
};

const ContactLookup: React.FC<ContactLookupProps> = ({ query, onQueryChange, addToast }) => {
  const [manualEntries, setManualEntries] = useLocalStorage<ManualContactEntry[]>(MANUAL_CONTACTS_STORAGE_KEY, []);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [manualForm, setManualForm] = useState<ManualContactForm>(EMPTY_MANUAL_FORM);

  const directory = useMemo(() => mergeManualContacts(manualEntries), [manualEntries]);
  const matches = useMemo(() => findCompanyContacts(query, directory), [query, directory]);
  const hasQuery = query.trim().length > 0;

  const copyValue = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      addToast(`${label} copied`, 'success');
    } catch {
      addToast(`Could not copy ${label.toLowerCase()}`, 'danger');
    }
  };

  const openAddModal = () => {
    const suggestedCompany = matches.length === 1 ? matches[0].company : '';
    setManualForm((current) => ({
      ...current,
      company: current.company || suggestedCompany,
    }));
    setIsAddModalOpen(true);
  };

  const handleKindChange = (kind: ContactDetailKind) => {
    setManualForm((current) => ({
      ...current,
      kind,
      label: DEFAULT_LABELS[kind],
    }));
  };

  const handleManualContactSave = (event: React.FormEvent) => {
    event.preventDefault();
    const company = manualForm.company.trim();
    const label = manualForm.label.trim();
    const value = manualForm.value.trim();

    if (!company || !label || !value) {
      addToast('Company, label, and contact detail are required.', 'warning');
      return;
    }

    if (manualForm.kind === 'email' && !value.includes('@')) {
      addToast('Please enter a valid email address.', 'warning');
      return;
    }

    const duplicate = manualEntries.some((entry) =>
      normalizeCompanyName(entry.company) === normalizeCompanyName(company)
      && entry.kind === manualForm.kind
      && entry.label.toLowerCase() === label.toLowerCase()
      && entry.value.toLowerCase() === value.toLowerCase()
    );

    if (duplicate) {
      addToast('That contact detail is already saved.', 'warning');
      return;
    }

    const newEntry: ManualContactEntry = {
      id: globalThis.crypto?.randomUUID?.() || `contact-${Date.now()}`,
      company,
      kind: manualForm.kind,
      label,
      value,
      createdAt: Date.now(),
    };

    setManualEntries((current) => [newEntry, ...current]);
    onQueryChange(company);
    setManualForm({
      company,
      kind: 'phone',
      label: DEFAULT_LABELS.phone,
      value: '',
    });
    addToast(`${label} added to ${company}.`, 'success');
  };

  const removeManualEntry = (entryId: string) => {
    const entry = manualEntries.find((candidate) => candidate.id === entryId);
    setManualEntries((current) => current.filter((candidate) => candidate.id !== entryId));
    addToast(entry ? `${entry.label} removed from ${entry.company}.` : 'Contact detail removed.', 'info');
  };

  const categoryLabel = (category: CompanyContact['category']) => {
    if (category === 'Workers compensation') return 'Workers comp';
    if (category === 'Saved contact') return 'Added';
    return 'Carrier';
  };

  return (
    <>
      <section
        aria-label="Company contact search results"
        aria-live="polite"
        className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5"
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-3 py-2.5 dark:border-white/10 sm:px-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#003f87] text-white">
              <i className="fa-solid fa-address-book text-xs"></i>
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-800 dark:text-white">Company Contacts</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{directory.length} companies saved</p>
            </div>
          </div>
          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[#003f87] px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#0076d3] hover:shadow-md"
          >
            <i className="fa-solid fa-plus"></i>
            Add Contact
          </button>
        </div>

        {!hasQuery ? (
          <div className="px-4 py-3">
            <p className="text-sm font-semibold text-slate-800 dark:text-white">Start typing a company name</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Phone, fax, email, and website details will appear as you type.</p>
          </div>
        ) : matches.length === 0 ? (
          <div className="flex items-center gap-3 px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
            <i className="fa-solid fa-circle-info text-slate-400"></i>
            No saved contact matches "{query.trim()}". Use Add Contact to create it.
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5 dark:border-white/10">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {matches.length} {matches.length === 1 ? 'company' : 'companies'} found
              </p>
              <span className="text-xs text-slate-400">Scroll for more details</span>
            </div>
            <div
              tabIndex={0}
              aria-label="Scrollable company contact details"
              className="grid max-h-96 min-h-0 gap-2 overflow-y-auto overscroll-contain p-2 outline-none [scrollbar-gutter:stable] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0076d3]/50 lg:grid-cols-2"
            >
              {matches.map((contact) => (
                <article
                  key={contact.id}
                  className="min-w-0 rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-slate-900/60"
                >
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">{contact.company}</h3>
                      {contact.address && (
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{contact.address}</p>
                      )}
                    </div>
                    <span className="shrink-0 rounded-md bg-blue-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#003f87] dark:bg-blue-500/10 dark:text-blue-200">
                      {categoryLabel(contact.category)}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {contact.details.map((detail, detailIndex) => {
                      const href = detailHref(detail);
                      return (
                        <div
                          key={`${detail.label}-${detail.value}-${detailIndex}`}
                          className="flex min-h-9 min-w-0 items-center gap-2 rounded-md bg-slate-50 px-2.5 py-1.5 dark:bg-white/5"
                        >
                          <i className={`fa-solid ${detailIcon[detail.kind]} w-4 shrink-0 text-center text-xs text-slate-400`}></i>
                          <span className="w-16 shrink-0 text-xs font-medium text-slate-500 dark:text-slate-400 sm:w-28">
                            <span className="sm:hidden">{mobileDetailLabel(detail.label)}</span>
                            <span className="hidden sm:inline">{detail.label}</span>
                          </span>
                          {href ? (
                            <a
                              href={href}
                              target={detail.kind === 'website' ? '_blank' : undefined}
                              rel={detail.kind === 'website' ? 'noreferrer' : undefined}
                              title={detail.value}
                              className="min-w-0 flex-1 truncate text-xs font-semibold text-[#005eb8] hover:underline dark:text-blue-300 sm:text-sm"
                            >
                              {detail.value}
                            </a>
                          ) : (
                            <span title={detail.value} className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-800 dark:text-slate-200 sm:text-sm">{detail.value}</span>
                          )}
                          <button
                            type="button"
                            onClick={() => copyValue(detail.label, detail.value)}
                            title={`Copy ${detail.label.toLowerCase()}`}
                            aria-label={`Copy ${detail.label.toLowerCase()} for ${contact.company}`}
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-white hover:text-[#003f87] dark:hover:bg-white/10 dark:hover:text-white"
                          >
                            <i className="fa-regular fa-copy text-xs"></i>
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <p className="mt-2 break-words text-[10px] text-slate-400">{contact.source}</p>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      {createPortal(
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title="Add Company Contact"
          maxWidthClass="max-w-lg"
        >
          <div className="max-h-[calc(100vh-9rem)] overflow-y-auto pr-1 [scrollbar-gutter:stable]">
          <form onSubmit={handleManualContactSave} className="space-y-4">
            <div>
              <label htmlFor="manual-contact-company" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Company name
              </label>
              <input
                id="manual-contact-company"
                type="text"
                value={manualForm.company}
                onChange={(event) => setManualForm((current) => ({ ...current, company: event.target.value }))}
                placeholder="Example: Nationwide"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-[#0076d3] dark:border-white/10 dark:bg-white/5 dark:text-white"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="manual-contact-kind" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Contact type
                </label>
                <select
                  id="manual-contact-kind"
                  value={manualForm.kind}
                  onChange={(event) => handleKindChange(event.target.value as ContactDetailKind)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-[#0076d3] dark:border-white/10 dark:bg-slate-900 dark:text-white"
                >
                  <option value="phone">Phone</option>
                  <option value="fax">Fax</option>
                  <option value="email">Email</option>
                  <option value="website">Website</option>
                </select>
              </div>

              <div>
                <label htmlFor="manual-contact-label" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Label
                </label>
                <input
                  id="manual-contact-label"
                  type="text"
                  value={manualForm.label}
                  onChange={(event) => setManualForm((current) => ({ ...current, label: event.target.value }))}
                  placeholder="Claims, billing, underwriting..."
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-[#0076d3] dark:border-white/10 dark:bg-white/5 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label htmlFor="manual-contact-value" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Contact detail
              </label>
              <input
                id="manual-contact-value"
                type={manualForm.kind === 'email' ? 'email' : 'text'}
                inputMode={manualForm.kind === 'phone' || manualForm.kind === 'fax' ? 'tel' : 'text'}
                value={manualForm.value}
                onChange={(event) => setManualForm((current) => ({ ...current, value: event.target.value }))}
                placeholder={manualForm.kind === 'phone' || manualForm.kind === 'fax' ? '1-800-555-0123' : manualForm.kind === 'email' ? 'service@company.com' : 'www.company.com'}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-[#0076d3] dark:border-white/10 dark:bg-white/5 dark:text-white"
              />
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
              >
                Close
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-lg bg-[#003f87] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0076d3]"
              >
                <i className="fa-solid fa-plus"></i>
                Save Detail
              </button>
            </div>
          </form>

          {manualEntries.length > 0 && (
            <div className="mt-5 border-t border-slate-200 pt-4 dark:border-white/10">
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Manually Added</h4>
                <span className="text-xs text-slate-400">{manualEntries.length} saved</span>
              </div>
              <div className="max-h-44 space-y-2 overflow-y-auto overscroll-contain pr-1 [scrollbar-gutter:stable]">
                {manualEntries.map((entry) => (
                  <div key={entry.id} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-2.5 dark:border-white/10 dark:bg-white/5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white text-[#003f87] shadow-sm dark:bg-white/10 dark:text-blue-200">
                      <i className={`fa-solid ${detailIcon[entry.kind]} text-xs`}></i>
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-800 dark:text-white">{entry.company}</p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">{entry.label}: {entry.value}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeManualEntry(entry.id)}
                      title={`Remove ${entry.label.toLowerCase()} from ${entry.company}`}
                      aria-label={`Remove ${entry.label.toLowerCase()} from ${entry.company}`}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
                    >
                      <i className="fa-solid fa-trash-can text-xs"></i>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="mt-4 text-xs text-slate-400">
            Manually added contacts are saved in this browser on this computer.
          </p>
          </div>
        </Modal>,
        document.body,
      )}
    </>
  );
};

export default ContactLookup;
