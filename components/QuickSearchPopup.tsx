
import React, { useState, useEffect, useRef } from 'react';

interface QuickSearchPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (query: string) => void;
  addToast: (message: string, type?: 'success' | 'warning' | 'danger' | 'info') => void;
}

const QuickSearchPopup: React.FC<QuickSearchPopupProps> = ({ isOpen, onClose, onSearch, addToast }) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus and clear query when popup opens
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      // Small delay to ensure render is complete before focus
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const handleSearch = () => {
    if (!query.trim()) {
      addToast('Please enter a search term', 'warning');
      return;
    }
    onSearch(query.trim());
    onClose();
    setQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  // Don't render if not open
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]"
      onClick={onClose}
    >
      {/* Backdrop with blur */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"></div>

      {/* Popup Container */}
      <div
        className="relative w-full max-w-2xl mx-4 animate-slide-down"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Main Search Container */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl shadow-black/30 overflow-hidden border border-gray-200 dark:border-slate-700">

          {/* Header */}
          <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500 px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <i className="fa-solid fa-bolt text-white"></i>
              </div>
              <div>
                <h3 className="text-white font-bold text-sm">Quick Agency Matrix Search</h3>
                <p className="text-blue-100 text-xs">Press Enter to search, Esc to close</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors p-1"
            >
              <i className="fa-solid fa-times"></i>
            </button>
          </div>

          {/* Search Input */}
          <div className="p-4">
            <div className="relative">
              <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"></i>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search customers by name or address..."
                className="w-full bg-gray-50 dark:bg-slate-900 border-2 border-gray-200 dark:border-slate-700 rounded-xl py-4 pl-12 pr-4 text-lg text-gray-900 dark:text-gray-50 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all placeholder:text-gray-400"
                autoFocus
              />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="px-4 pb-4 flex flex-wrap gap-2">
            <button
              onClick={handleSearch}
              disabled={!query.trim()}
              className="flex-1 bg-gradient-to-r from-blue-700 to-blue-600 text-white font-bold py-3 px-6 rounded-xl shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              <i className="fa-solid fa-magnifying-glass"></i>
              Search Agency Matrix
            </button>
            <button
              onClick={() => {
                window.open('https://agents.agencymatrix.com/#/', '_blank');
                onClose();
              }}
              className="bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 font-semibold py-3 px-4 rounded-xl hover:bg-gray-200 dark:hover:bg-slate-600 transition-all flex items-center gap-2"
              title="Open Agency Matrix"
            >
              <i className="fa-solid fa-external-link-alt"></i>
              Open Matrix
            </button>
            <button
              onClick={() => {
                window.open('https://agents.agencymatrix.com/customerEdit.php?id=0', '_blank');
                onClose();
              }}
              className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-semibold py-3 px-4 rounded-xl hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-all flex items-center gap-2"
              title="Add New Customer"
            >
              <i className="fa-solid fa-user-plus"></i>
              Add Customer
            </button>
          </div>

          {/* Keyboard Hints Footer */}
          <div className="bg-gray-50 dark:bg-slate-900 px-4 py-3 border-t border-gray-200 dark:border-slate-700 flex items-center justify-center gap-6 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-slate-700 rounded font-mono text-[10px]">Enter</kbd>
              Search
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-slate-700 rounded font-mono text-[10px]">Esc</kbd>
              Close
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-slate-700 rounded font-mono text-[10px]">Ctrl</kbd>
              <span>+</span>
              <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-slate-700 rounded font-mono text-[10px]">M</kbd>
              Open Popup
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickSearchPopup;
