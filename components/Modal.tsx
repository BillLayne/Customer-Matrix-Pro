
import React, { useEffect, useId } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidthClass?: string;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, maxWidthClass = 'max-w-md' }) => {
  const titleId = useId();

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        window.removeEventListener('keydown', handleEsc);
        document.body.style.overflow = previousOverflow;
      };
    }
    return undefined;
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/65 p-3 backdrop-blur-md sm:p-5"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`flex max-h-[calc(100vh-1.5rem)] w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_28px_90px_-26px_rgba(15,23,42,0.75)] dark:border-white/10 dark:bg-[#111c2e] sm:max-h-[calc(100vh-2.5rem)] ${maxWidthClass} animate-fade-in`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-100 px-5 py-4 dark:border-white/10 sm:px-6">
          <h3 id={titleId} className="font-outfit text-lg font-bold tracking-tight text-slate-900 dark:text-white sm:text-xl">
            {title}
          </h3>
          <button
            onClick={onClose}
            aria-label={`Close ${title}`}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 transition hover:border-[#0076d3]/50 hover:bg-white hover:text-[#003f87] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0076d3] dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <i className="fa-solid fa-times"></i>
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto px-5 py-5 custom-scrollbar sm:px-6">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
