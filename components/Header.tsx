
import React from 'react';

interface HeaderProps {
  theme: 'light' | 'dark';
  showAiAssistant: boolean;
  onToggleTheme: () => void;
  onToggleAiAssistant: () => void;
}

const Header: React.FC<HeaderProps> = ({ theme, showAiAssistant, onToggleTheme, onToggleAiAssistant }) => {
  return (
    <header className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl shadow-md p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-md">
          BL
        </div>
        <div>
          <h1 className="text-lg font-bold text-text-light dark:text-text-dark tracking-tight">Customer Matrix Pro</h1>
          <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark font-medium">Bill Layne Insurance Command Center</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="hidden sm:flex items-center gap-2 py-1.5 px-3 bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark rounded-full">
          <div className="w-2 h-2 rounded-full bg-green-500 status-dot"></div>
          <span className="text-xs font-semibold">Systems Online</span>
        </div>
        <button
          onClick={onToggleAiAssistant}
          title={showAiAssistant ? "Hide AI Tools" : "Show AI Tools"}
          className="px-3 py-2 rounded-lg border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark text-text-secondary-light dark:text-text-secondary-dark hover:bg-bg-light dark:hover:bg-bg-dark hover:text-text-light dark:hover:text-text-dark transition-colors text-sm font-semibold flex items-center gap-2"
        >
          <i className={`fa-solid ${showAiAssistant ? 'fa-eye-slash' : 'fa-robot'}`}></i>
          <span className="hidden md:inline">{showAiAssistant ? 'Hide AI' : 'Show AI'}</span>
        </button>
        <button
          onClick={onToggleTheme}
          title="Toggle Theme"
          className="px-3 py-2 rounded-lg border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark text-text-secondary-light dark:text-text-secondary-dark hover:bg-bg-light dark:hover:bg-bg-dark hover:text-text-light dark:hover:text-text-dark transition-colors"
        >
          {theme === 'dark' ? <i className="fa-solid fa-sun"></i> : <i className="fa-solid fa-moon"></i>}
        </button>
      </div>
    </header>
  );
};

export default Header;