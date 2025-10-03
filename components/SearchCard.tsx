import React, { useState, useRef, useEffect } from 'react';
import type { SearchMode } from '../types';
import { MODE_META, NC_COUNTY_GIS_DATA } from '../constants';
import Modal from './Modal';

interface SearchCardProps {
  addToast: (message: string, type?: 'success' | 'warning' | 'danger' | 'info') => void;
  searchCount: number;
  onSearch: () => void;
}

const StatCard: React.FC<{ value: string | number; label: string }> = ({ value, label }) => (
    <div className="bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark rounded-lg p-3 text-center">
        <div className="text-2xl font-bold text-primary dark:text-accent">{value}</div>
        <div className="text-xs text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-wider font-semibold">{label}</div>
    </div>
);

const SearchCard: React.FC<SearchCardProps> = ({ addToast, searchCount, onSearch }) => {
  const [mode, setMode] = useState<SearchMode>('agency');
  const [query, setQuery] = useState('');
  const [lastSync, setLastSync] = useState('--');
  const [isGisModalOpen, setIsGisModalOpen] = useState(false);
  const [gisInfo, setGisInfo] = useState<{ county: string; url: string; note?: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const GOOGLE_DRIVE_CONSTANTS = {
      agencyEmail: 'docs@billlayneinsurance.com',
      clientsFolderId: '11O0Cm9gOdgXp_j8OXMO4Pm5tqh18uXd5'
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
     const updateSyncTime = () => {
        const syncDate = new Date();
        localStorage.setItem("lastSync", syncDate.toISOString());
        setLastSync("Now");
      };
      updateSyncTime();
      const interval = setInterval(updateSyncTime, 300000); // 5 minutes
      return () => clearInterval(interval);
  }, []);

  const handleSearch = () => {
    if (!query.trim()) {
      addToast('Please enter a search term', 'warning');
      inputRef.current?.focus();
      return;
    }
    onSearch();

    let url = '';
    switch (mode) {
      case 'agency':
        const selection = /\d+/.test(query) ? "Address" : "Name";
        url = `https://agents.agencymatrix.com/#/customer/search?selection=${selection}&query=${encodeURIComponent(query)}`;
        break;
      case 'web':
        url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
        break;
      case 'realestate':
        url = `https://www.zillow.com/homes/${encodeURIComponent(query)}_rb/`;
        break;
      case 'people':
        url = `https://www.truepeoplesearch.com/results?name=${encodeURIComponent(query)}`;
        break;
      case 'onedrive': {
        const clientName = query.trim();
        const searchQuery = `parent:${GOOGLE_DRIVE_CONSTANTS.clientsFolderId} title:(${clientName})`;
        url = `https://drive.google.com/drive/search?q=${encodeURIComponent(searchQuery)}&authuser=${GOOGLE_DRIVE_CONSTANTS.agencyEmail}`;
        break;
      }
    }
    window.open(url, '_blank');
    addToast(`Searching ${mode}...`, 'info');
    setQuery('');
  };

  const getCountyFromAddress = (address: string): string | null => {
    const lowerAddress = address.toLowerCase();
    for (const countyKey in NC_COUNTY_GIS_DATA) {
      if (lowerAddress.includes(countyKey)) {
        return countyKey;
      }
    }
    return null;
  };

  const handleGisSearch = () => {
    if (!query.trim()) {
      addToast('Please enter an address for GIS search.', 'warning');
      inputRef.current?.focus();
      return;
    }

    const countyKey = getCountyFromAddress(query);

    if (countyKey && NC_COUNTY_GIS_DATA[countyKey]) {
      const countyData = NC_COUNTY_GIS_DATA[countyKey];
      const searchUrl = countyData.url.replace('{query}', encodeURIComponent(query));
      setGisInfo({ county: countyData.name, url: searchUrl, note: countyData.note });
      setIsGisModalOpen(true);
    } else {
      addToast('Could not determine county from address. Please include county name (e.g., "Surry").', 'danger');
    }
  };

  const handleNewFolder = () => {
    const url = `https://drive.google.com/drive/folders/${GOOGLE_DRIVE_CONSTANTS.clientsFolderId}?authuser=${GOOGLE_DRIVE_CONSTANTS.agencyEmail}`;
    window.open(url, '_blank');
    addToast('Opening Client folder directory...', 'info');
  };

  const modeButtons: { mode: SearchMode, icon: string, label: string }[] = [
    { mode: 'agency', icon: 'fa-shield-halved', label: 'Agency Matrix' },
    { mode: 'web', icon: 'fa-brands fa-google', label: 'Web Search' },
    { mode: 'realestate', icon: 'fa-solid fa-house', label: 'Real Estate' },
    { mode: 'people', icon: 'fa-solid fa-user', label: 'People' },
    { mode: 'onedrive', icon: 'fa-brands fa-google-drive', label: 'Client Folder' },
  ];

  return (
    <div className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl shadow-lg p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-secondary to-accent"></div>
      
      <div className="mb-5">
        <h2 className="text-xl font-bold flex items-center gap-3">
          <i className="fa-solid fa-magnifying-glass-dollar text-primary dark:text-accent"></i>
          Unified Customer Search
          <span className="text-xs font-bold uppercase bg-gradient-to-r from-primary to-secondary text-white px-2.5 py-1 rounded-full">Pro</span>
        </h2>
        <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mt-1">Quickly find customers, properties, and information.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 mb-5">
        {modeButtons.map(btn => (
          <button 
            key={btn.mode}
            onClick={() => setMode(btn.mode)}
            className={`px-4 py-3 rounded-lg font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 border-2 ${
              mode === btn.mode 
                ? 'bg-gradient-to-r from-primary to-secondary text-white border-transparent shadow-md' 
                : 'bg-card-light dark:bg-card-dark text-text-secondary-light dark:text-text-secondary-dark border-border-light dark:border-border-dark hover:border-secondary dark:hover:border-accent hover:shadow-md'
            }`}
          >
            <i className={`fa-solid ${btn.icon}`}></i>
            <span className='hidden md:inline'>{btn.label}</span>
          </button>
        ))}
      </div>

      <div className="relative mb-4">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder={MODE_META[mode].placeholder}
          className="w-full bg-bg-light dark:bg-bg-dark border-2 border-border-light dark:border-border-dark rounded-lg py-3 pl-4 pr-12 text-base focus:border-primary dark:focus:border-accent focus:ring-2 focus:ring-primary/20 dark:focus:ring-accent/20 outline-none transition"
        />
        <i className="fa-solid fa-magnifying-glass absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary-light dark:text-text-secondary-dark"></i>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
        <button onClick={handleSearch} className="col-span-2 md:col-span-4 lg:col-span-1 w-full bg-gradient-to-r from-primary to-secondary text-white font-bold py-3 rounded-lg shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2">
            <i className="fa-solid fa-magnifying-glass"></i> Search
        </button>
        <button onClick={() => window.open("https://agents.agencymatrix.com/#/", "_blank")} className="bg-bg-light dark:bg-card-dark border-2 border-border-light dark:border-border-dark font-semibold py-3 rounded-lg hover:border-secondary dark:hover:border-accent hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2">
            <i className="fa-solid fa-external-link-alt"></i> Open Matrix
        </button>
        <button onClick={() => window.open("https://agents.agencymatrix.com/customerEdit.php?id=0", "_blank")} className="bg-accent text-white font-bold py-3 rounded-lg shadow-md shadow-accent/30 hover:shadow-lg hover:shadow-accent/40 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2">
            <i className="fa-solid fa-user-plus"></i> Add Customer
        </button>
        <button onClick={handleNewFolder} className="bg-sky-500 text-white font-bold py-3 rounded-lg shadow-md shadow-sky-500/30 hover:shadow-lg hover:shadow-sky-500/40 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2">
            <i className="fa-solid fa-folder-plus"></i> New Folder
        </button>
         {mode === 'realestate' && (
            <button onClick={handleGisSearch} className="bg-gradient-to-br from-green-600 to-green-500 text-white font-bold py-3 rounded-lg shadow-md shadow-green-600/30 hover:shadow-lg hover:shadow-green-600/40 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2">
                <i className="fa-solid fa-map-location-dot"></i> Tax GIS
            </button>
        )}
      </div>

      <div className="mt-5 pt-5 border-t border-border-light dark:border-border-dark grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard value={searchCount} label="Searches Today" />
        <StatCard value="7" label="Active Portals" />
        <StatCard value="0" label="Favorites" /> {/* This can be wired up later */}
        <StatCard value={lastSync} label="Last Sync" />
      </div>

      <Modal isOpen={isGisModalOpen} onClose={() => setIsGisModalOpen(false)} title="County GIS Information">
        {gisInfo ? (
            <div className="text-center">
                <p className="mb-4">
                    Found GIS data for <span className="font-bold">{gisInfo.county}</span>. Click the button below to open the county's parcel information site in a new tab.
                </p>
                {gisInfo.note && (
                    <p className="text-sm bg-yellow-100 dark:bg-yellow-900/50 border border-yellow-300 dark:border-yellow-700 rounded-md p-3 mb-4">
                        <i className="fa-solid fa-triangle-exclamation mr-2"></i>
                        {gisInfo.note}
                    </p>
                )}
                <a
                    href={gisInfo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setIsGisModalOpen(false)}
                    className="inline-block w-full bg-primary text-white font-bold py-3 px-6 rounded-lg shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
                >
                    <i className="fa-solid fa-external-link-alt mr-2"></i>
                    Open {gisInfo.county} GIS
                </a>
            </div>
        ) : (
            <p>Loading GIS information...</p>
        )}
    </Modal>
    </div>
  );
};

export default SearchCard;