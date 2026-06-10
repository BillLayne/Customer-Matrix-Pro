import React, { useMemo, useRef, useState } from 'react';
import { LOCAL_STORAGE_HISTORY_KEY } from '../constants';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { uploadImage } from '../services/imgurService';
import type { HistoryItem, ToastMessage } from '../types';

interface QuickImageLinksCardProps {
  addToast: (message: string, type?: ToastMessage['type']) => void;
}

const QuickImageLinksCard: React.FC<QuickImageLinksCardProps> = ({ addToast }) => {
  const [history, setHistory] = useLocalStorage<HistoryItem[]>(LOCAL_STORAGE_HISTORY_KEY, []);
  const [isUploading, setIsUploading] = useState(false);
  const [latestLink, setLatestLink] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const recentUploads = useMemo(() => history, [history]);

  const copyLink = async (link: string) => {
    await navigator.clipboard.writeText(link);
    addToast('Image link copied.', 'success');
  };

  const handleUpload = async (file: File) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      addToast('Use JPG, PNG, or WEBP only.', 'warning');
      return;
    }

    setIsUploading(true);
    try {
      const result = await uploadImage(file);
      const newItem: HistoryItem = {
        id: String(Date.now()),
        link: result.link,
        deletehash: result.deletehash,
        name: file.name,
        createdAt: Date.now(),
        groups: [],
      };

      setHistory((prev) => [newItem, ...prev].slice(0, 25));
      setLatestLink(result.link);
      await navigator.clipboard.writeText(result.link);
      addToast('Uploaded to Imgur and copied link.', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed.';
      addToast(message, 'danger');
    } finally {
      setIsUploading(false);
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
            Upload JPG, PNG, or WEBP to Imgur — the hosted link copies automatically.
          </p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.95fr]">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          className={`rounded-[1.35rem] border-2 border-dashed p-6 transition ${
            dragActive
              ? 'border-[#0076d3] bg-blue-50/80 dark:bg-cyan-500/10'
              : 'border-slate-200 bg-slate-50/80 dark:border-white/10 dark:bg-white/5'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-[1.25rem] bg-gradient-to-br from-slate-950 via-[#003f87] to-[#0076d3] text-white shadow-xl shadow-blue-900/20">
              <i className={`fa-solid ${isUploading ? 'fa-spinner fa-spin' : 'fa-cloud-arrow-up'} text-2xl`}></i>
            </div>
            <h3 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
              {isUploading ? 'Uploading image...' : 'Fast image link uploader'}
            </h3>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-300">
              Click to pick a file or drag one here. The hosted Imgur link copies automatically when the upload finishes.
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-white transition hover:bg-[#003f87] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-cyan-300"
            >
              <i className="fa-solid fa-image"></i>
              Choose Image
            </button>
          </div>

          {latestLink && (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#0b1727]/80">
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
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-sm font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-300">
              Recent Uploads
            </h3>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 dark:bg-white/10 dark:text-slate-300">
              {recentUploads.length} saved
            </span>
          </div>

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
                    onClick={() => copyLink(item.link)}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-[#0076d3] hover:text-[#003f87] dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                    title="Copy image link"
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
        </div>
      </div>
    </div>
  );
};

export default QuickImageLinksCard;
