import React, { useMemo, useRef, useState } from 'react';
import { LOCAL_STORAGE_HISTORY_KEY } from '../constants';
import { useLocalStorage } from '../hooks/useLocalStorage';
import {
  IMAGE_PRESETS,
  checkAccessCode,
  getAccessCode,
  listAllHostedImages,
  setAccessCode,
  uploadImage,
} from '../services/imageHostService';
import type { ImageHostLibraryItem, ImagePresetId } from '../services/imageHostService';
import type { HistoryItem, ToastMessage } from '../types';

interface QuickImageLinksCardProps {
  addToast: (message: string, type?: ToastMessage['type']) => void;
}

const QuickImageLinksCard: React.FC<QuickImageLinksCardProps> = ({ addToast }) => {
  const [history, setHistory] = useLocalStorage<HistoryItem[]>(LOCAL_STORAGE_HISTORY_KEY, []);
  const [isUploading, setIsUploading] = useState(false);
  const [latestLink, setLatestLink] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [hasAccessCode, setHasAccessCode] = useState(() => Boolean(getAccessCode()));
  const [codeDraft, setCodeDraft] = useState('');
  const [isSavingCode, setIsSavingCode] = useState(false);
  const [presetId, setPresetId] = useLocalStorage<ImagePresetId>('quick-image-preset', 'gmail');
  const [libraryQuery, setLibraryQuery] = useState('');
  const [libraryImages, setLibraryImages] = useState<ImageHostLibraryItem[]>([]);
  const [isLibraryLoading, setIsLibraryLoading] = useState(false);
  const [isLibraryLoaded, setIsLibraryLoaded] = useState(false);
  const [libraryError, setLibraryError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activePreset = IMAGE_PRESETS.find((p) => p.id === presetId) ?? IMAGE_PRESETS[0];

  const recentUploads = useMemo(() => history, [history]);
  const libraryMatches = useMemo(() => {
    const terms = libraryQuery.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length || !isLibraryLoaded) return [];

    return libraryImages.filter((image) => {
      const searchable = [
        image.originalName,
        image.label,
        image.key,
        image.url,
      ].filter(Boolean).join(' ').toLowerCase();
      return terms.every((term) => searchable.includes(term));
    });
  }, [isLibraryLoaded, libraryImages, libraryQuery]);

  const formatLibraryDate = (uploaded: string) => {
    const date = new Date(uploaded);
    return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleDateString();
  };

  const copyLink = async (link: string) => {
    await navigator.clipboard.writeText(link);
    addToast('Image link copied.', 'success');
  };

  const handleUpload = async (file: File) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      addToast('Use JPG, PNG, WEBP, GIF, or SVG only.', 'warning');
      return;
    }

    setIsUploading(true);
    try {
      const result = await uploadImage(file, activePreset);
      const newItem: HistoryItem = {
        id: String(Date.now()),
        link: result.url,
        key: result.key,
        name: file.name,
        createdAt: Date.now(),
        groups: [],
      };

      setHistory((prev) => [newItem, ...prev].slice(0, 25));
      if (isLibraryLoaded) {
        setLibraryImages((prev) => [{
          key: result.key,
          url: result.url,
          size: result.size,
          uploaded: new Date().toISOString(),
          originalName: file.name,
          label: '',
        }, ...prev.filter((image) => image.key !== result.key)]);
      }
      setLatestLink(result.url);
      await navigator.clipboard.writeText(result.url);
      addToast('Uploaded — link copied.', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed.';
      if (message.toLowerCase().includes('access code')) {
        setHasAccessCode(false);
      }
      addToast(message, 'danger');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveCode = async () => {
    const draft = codeDraft.trim();
    if (!draft) return;
    setIsSavingCode(true);
    try {
      if (await checkAccessCode(draft)) {
        setAccessCode(draft);
        setHasAccessCode(true);
        setIsLibraryLoaded(false);
        setLibraryImages([]);
        setLibraryError('');
        setCodeDraft('');
        addToast('Image host unlocked.', 'success');
      } else {
        addToast('Access code rejected.', 'danger');
      }
    } catch {
      addToast('Could not reach the image host.', 'danger');
    } finally {
      setIsSavingCode(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await handleUpload(file);
    }
    e.target.value = '';
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await handleUpload(file);
    }
  };

  const handleLibrarySearch = async (event?: React.FormEvent, forceRefresh = false) => {
    event?.preventDefault();
    if (!libraryQuery.trim()) {
      addToast('Enter an image name or label to search.', 'warning');
      return;
    }
    if (!hasAccessCode) {
      addToast('Unlock the image host to search the full library.', 'warning');
      return;
    }
    if (isLibraryLoaded && !forceRefresh) return;

    setIsLibraryLoading(true);
    setLibraryError('');
    try {
      const images = await listAllHostedImages();
      setLibraryImages(images);
      setIsLibraryLoaded(true);
      addToast(`${images.length} hosted images ready to search.`, 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not load the image library.';
      if (message.toLowerCase().includes('access code')) {
        setHasAccessCode(false);
      }
      setLibraryError(message);
      addToast(message, 'danger');
    } finally {
      setIsLibraryLoading(false);
    }
  };

  const clearLibrarySearch = () => {
    setLibraryQuery('');
    setLibraryError('');
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5 sm:p-5">
      <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="flex items-center gap-2.5 font-outfit text-lg font-bold tracking-tight text-slate-900 dark:text-white sm:text-xl">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900">
              <i className="fa-solid fa-image text-sm"></i>
            </span>
            Quick Image Links
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Optimized and hosted on img.billlayneinsurance.com — the link copies automatically.
          </p>
        </div>
        <a
          href="https://img.billlayneinsurance.com"
          target="_blank"
          rel="noreferrer"
          className="inline-flex shrink-0 items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 shadow-sm transition hover:border-[#0076d3]/50 hover:text-[#003f87] dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:text-white lg:self-auto"
        >
          <i className="fa-solid fa-images"></i>
          Open Library
        </a>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
          Format
        </span>
        {IMAGE_PRESETS.map((preset) => (
          <button
            key={preset.id}
            onClick={() => setPresetId(preset.id)}
            title={preset.hint}
            aria-pressed={preset.id === activePreset.id}
            className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-bold transition ${
              preset.id === activePreset.id
                ? 'border-[#0076d3] bg-blue-50 text-[#003f87] shadow-sm dark:border-cyan-300/60 dark:bg-cyan-500/10 dark:text-cyan-200'
                : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-[#0076d3]/50 hover:bg-white hover:text-[#003f87] dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white'
            }`}
          >
            <i className={`fa-solid ${preset.icon} text-[11px]`}></i>
            {preset.label}
          </button>
        ))}
        <span className="hidden text-xs text-slate-400 sm:inline dark:text-slate-500">
          {activePreset.hint}
        </span>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.95fr]">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          className={`self-start rounded-2xl border-2 border-dashed p-4 transition ${
            dragActive
              ? 'border-[#0076d3] bg-blue-50/80 dark:bg-cyan-500/10'
              : 'border-slate-200 bg-slate-50/80 dark:border-white/10 dark:bg-white/5'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.gif,.svg,image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
            className="hidden"
            onChange={handleFileChange}
          />
          {hasAccessCode ? (
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-950 via-[#003f87] to-[#0076d3] text-white shadow-lg shadow-blue-900/20">
                <i className={`fa-solid ${isUploading ? 'fa-spinner fa-spin' : 'fa-cloud-arrow-up'} text-base`}></i>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {isUploading ? 'Uploading image...' : 'Drop an image here, or choose a file'}
                </h3>
                <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-300">
                  Uploads as <span className="font-bold text-slate-700 dark:text-slate-100">{activePreset.label}</span> — link copies automatically.
                </p>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#003f87] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-cyan-300"
              >
                <i className="fa-solid fa-image"></i>
                Choose Image
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-950 via-[#003f87] to-[#0076d3] text-white shadow-lg shadow-blue-900/20">
                <i className="fa-solid fa-lock text-base"></i>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Unlock the image host
                </h3>
                <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-300">
                  Enter the agency access code once — it's remembered on this device.
                </p>
              </div>
              <div className="flex w-full min-w-0 gap-2 sm:w-auto">
                <input
                  type="password"
                  value={codeDraft}
                  onChange={(e) => setCodeDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void handleSaveCode();
                  }}
                  placeholder="Access code"
                  className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-[#0076d3] dark:border-white/10 dark:bg-white/5 dark:text-slate-200 sm:w-40"
                />
                <button
                  onClick={() => void handleSaveCode()}
                  disabled={isSavingCode || !codeDraft.trim()}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#0076d3] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#003f87] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <i className={`fa-solid ${isSavingCode ? 'fa-spinner fa-spin' : 'fa-unlock'}`}></i>
                  Unlock
                </button>
              </div>
            </div>
          )}

          {latestLink && (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#0b1727]/80">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                Latest image link
              </p>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                <input
                  readOnly
                  value={latestLink}
                  className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                />
                <button
                  onClick={() => copyLink(latestLink)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0076d3] px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-white transition hover:bg-[#003f87]"
                >
                  <i className="fa-solid fa-copy"></i>
                  Copy
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-[1.35rem] border border-slate-200/80 bg-white/90 p-4 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.8)] dark:border-white/10 dark:bg-[#0b1727]/80">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-sm font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-300">
                {libraryQuery.trim() ? 'Image Library' : 'Recent Uploads'}
              </h3>
              <p className="mt-1 truncate text-xs text-slate-400 dark:text-slate-500">
                {libraryQuery.trim()
                  ? isLibraryLoaded
                    ? `Searching ${libraryImages.length} hosted images`
                    : 'Search every image stored on the BLI Image Host'
                  : 'Newest links saved on this browser'}
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 dark:bg-white/10 dark:text-slate-300">
              {libraryQuery.trim()
                ? isLibraryLoaded
                  ? `${libraryMatches.length} found`
                  : isLibraryLoading
                    ? 'Loading'
                    : 'Full library'
                : `${recentUploads.length} saved`}
            </span>
          </div>

          <form onSubmit={handleLibrarySearch} className="my-4 flex gap-2">
            <div className="relative min-w-0 flex-1">
              <i className="fa-solid fa-magnifying-glass pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400"></i>
              <input
                type="search"
                value={libraryQuery}
                onChange={(event) => setLibraryQuery(event.target.value)}
                disabled={!hasAccessCode}
                placeholder={hasAccessCode ? 'Search all hosted images...' : 'Unlock image host to search...'}
                aria-label="Search all hosted images"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-9 text-sm font-semibold text-slate-800 outline-none transition focus:border-[#0076d3] focus:bg-white disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:bg-white/10"
              />
              {libraryQuery && (
                <button
                  type="button"
                  onClick={clearLibrarySearch}
                  title="Clear image search"
                  aria-label="Clear image search"
                  className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
                >
                  <i className="fa-solid fa-xmark text-xs"></i>
                </button>
              )}
            </div>
            {isLibraryLoaded && libraryQuery.trim() && (
              <button
                type="button"
                onClick={() => void handleLibrarySearch(undefined, true)}
                disabled={isLibraryLoading}
                title="Refresh hosted image library"
                aria-label="Refresh hosted image library"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-[#0076d3] hover:text-[#003f87] disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
              >
                <i className={`fa-solid ${isLibraryLoading ? 'fa-spinner fa-spin' : 'fa-rotate'} text-xs`}></i>
              </button>
            )}
            <button
              type="submit"
              disabled={!hasAccessCode || !libraryQuery.trim() || isLibraryLoading}
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#003f87] px-3.5 text-xs font-bold text-white transition hover:bg-[#0076d3] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <i className={`fa-solid ${isLibraryLoading ? 'fa-spinner fa-spin' : isLibraryLoaded ? 'fa-check' : 'fa-magnifying-glass'} text-[11px]`}></i>
              <span className="hidden sm:inline">{isLibraryLoaded ? 'Loaded' : 'Search'}</span>
            </button>
          </form>

          {libraryError && (
            <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-200">
              {libraryError}
            </div>
          )}

          {libraryQuery.trim() ? (
            <div
              aria-label="Hosted image library search results"
              data-testid="quick-image-library-search-scroll"
              className="max-h-[26rem] min-h-0 space-y-3 overflow-y-auto overscroll-contain pr-1 touch-pan-y custom-scrollbar"
            >
              {isLibraryLoading ? (
                <div className="flex items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-10 text-sm font-semibold text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                  <i className="fa-solid fa-spinner fa-spin text-[#0076d3]"></i>
                  Loading the complete image library...
                </div>
              ) : !isLibraryLoaded ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-10 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                  Press Search to find this name across every hosted image.
                </div>
              ) : libraryMatches.length > 0 ? (
                libraryMatches.map((image) => {
                  const imageName = image.originalName || image.key.split('/').pop() || 'Hosted image';
                  return (
                    <div
                      key={image.key}
                      className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-3 dark:border-white/10 dark:bg-white/5"
                    >
                      <a href={image.url} target="_blank" rel="noreferrer" className="shrink-0" title={`Open ${imageName}`}>
                        <img
                          src={image.url}
                          alt={imageName}
                          loading="lazy"
                          className="h-14 w-14 rounded-xl bg-white object-contain dark:bg-white/5"
                        />
                      </a>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{imageName}</p>
                        <p className="truncate text-xs text-slate-500 dark:text-slate-300">
                          {image.label ? `${image.label} - ` : ''}{formatLibraryDate(image.uploaded)}
                        </p>
                        <p className="truncate text-[11px] text-slate-400">{image.url}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyLink(image.url)}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-[#0076d3] hover:text-[#003f87] dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                        title="Copy image link"
                        aria-label={`Copy image link for ${imageName}`}
                      >
                        <i className="fa-solid fa-copy"></i>
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-10 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                  No hosted images match "{libraryQuery.trim()}".
                </div>
              )}
            </div>
          ) : (
            <div
              aria-label="Recent uploaded image links"
              data-testid="quick-image-recent-uploads-scroll"
              className="max-h-[26rem] min-h-0 space-y-3 overflow-y-auto overscroll-contain pr-1 touch-pan-y custom-scrollbar"
            >
              {recentUploads.length > 0 ? (
                recentUploads.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-3 dark:border-white/10 dark:bg-white/5"
                  >
                    <img src={item.link} alt={item.name} className="h-14 w-14 rounded-xl object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{item.name}</p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-300">{item.link}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyLink(item.link)}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-[#0076d3] hover:text-[#003f87] dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                      title="Copy image link"
                      aria-label={`Copy image link for ${item.name}`}
                    >
                      <i className="fa-solid fa-copy"></i>
                    </button>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-10 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                  Your uploaded image links will show here.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuickImageLinksCard;
