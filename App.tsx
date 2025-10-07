
import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import SearchCard from './components/SearchCard';
import PortalsCard from './components/PortalsCard';
import QuickActions from './components/QuickActions';
import AiAssistant from './components/AiAssistant';
import Toast from './components/Toast';
import type { ToastMessage } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import NeedsAnalysisCard from './components/NeedsAnalysisCard';
import PdfParserCard from './components/PdfParserCard';
import QuoteAssistantCard from './components/QuoteAssistantCard';
import TaskMatrixCard from './components/TaskMatrixCard';

export default function App() {
  const [theme, setTheme] = useLocalStorage<'light' | 'dark'>('theme', 'light');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [showAiAssistant, setShowAiAssistant] = useState(true);
  const [searchCount, setSearchCount] = useLocalStorage<number>('searchesToday', 0);
  const [searchDate, setSearchDate] = useLocalStorage<string>('searchDate', new Date().toDateString());

  useEffect(() => {
    const today = new Date().toDateString();
    if (searchDate !== today) {
      setSearchDate(today);
      setSearchCount(0);
    }
  }, [searchDate, setSearchDate, setSearchCount]);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  const addToast = useCallback((message: string, type: ToastMessage['type'] = 'success') => {
    const id = Date.now();
    setToasts(prevToasts => [...prevToasts, { id, message, type }]);
    setTimeout(() => {
      setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
    }, 3000);
  }, []);

  return (
    <div className="p-3 md:p-5">
      <Header
        theme={theme}
        showAiAssistant={showAiAssistant}
        onToggleTheme={toggleTheme}
        onToggleAiAssistant={() => setShowAiAssistant(prev => !prev)}
      />

      <main className="mt-5 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-5">
        <div className="flex flex-col gap-5">
          <SearchCard addToast={addToast} searchCount={searchCount} onSearch={() => setSearchCount(prev => prev + 1)} />
          <QuoteAssistantCard addToast={addToast} />
          <PortalsCard addToast={addToast} />
          <PdfParserCard addToast={addToast} />
          <TaskMatrixCard addToast={addToast} />
        </div>
        <aside className="flex flex-col gap-5">
          <QuickActions />
          <NeedsAnalysisCard addToast={addToast} />
          {showAiAssistant && <AiAssistant addToast={addToast} />}
        </aside>
      </main>
      
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2">
        {toasts.map(toast => (
          <Toast key={toast.id} message={toast.message} type={toast.type} />
        ))}
      </div>
    </div>
  );
}