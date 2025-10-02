
import React, { useRef } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import type { Favorite } from '../types';

const safeHost = (url: string) => {
    try {
        return new URL(url).hostname;
    } catch {
        return url;
    }
};

const siteIcon = (url: string) => {
    const host = safeHost(url).toLowerCase();
    if (host.includes('agencymatrix')) return 'fa-shield-halved';
    if (host.includes('nationwide')) return 'fa-flag-usa';
    if (host.includes('progressive')) return 'fa-chart-line';
    if (host.includes('zillow')) return 'fa-house';
    if (host.includes('claude.ai')) return 'fa-robot';
    return 'fa-link';
};

interface FavoritesProps {
    addToast: (message: string, type?: 'success' | 'warning' | 'danger' | 'info') => void;
}

const Favorites: React.FC<FavoritesProps> = ({ addToast }) => {
    const [favorites, setFavorites] = useLocalStorage<Favorite[]>('matrixFavorites_v2', []);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const addFavorite = () => {
        const name = prompt('Favorite name:');
        if (!name) return;
        const url = prompt('URL:');
        if (!url) return;
        
        let cleanUrl = url.trim();
        if (!cleanUrl.startsWith('http')) {
            cleanUrl = `https://${cleanUrl}`;
        }

        try {
            new URL(cleanUrl);
        } catch {
            addToast('Invalid URL', 'danger');
            return;
        }

        const newFav: Favorite = { id: String(Date.now()), name, url: cleanUrl, description: safeHost(cleanUrl) };
        setFavorites(prev => [...prev, newFav]);
        addToast('Favorite added!', 'success');
    };

    const removeFavorite = (id: string) => {
        setFavorites(prev => prev.filter(f => f.id !== id));
        addToast('Favorite removed.', 'success');
    };

    const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target?.result as string);
                if (Array.isArray(data.favorites)) {
                    setFavorites(data.favorites);
                    addToast('Favorites imported successfully!', 'success');
                } else {
                    throw new Error('Invalid file format');
                }
            } catch (error) {
                addToast('Failed to import favorites.', 'danger');
            }
        };
        reader.readAsText(file);
    };

    const handleExport = () => {
        const dataStr = JSON.stringify({ favorites, exportDate: new Date().toISOString() }, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `favorites-export.json`;
        a.click();
        URL.revokeObjectURL(url);
        addToast('Favorites exported!', 'success');
    };

    return (
        <div className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl shadow-md p-5">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold flex items-center gap-2">
                    <i className="fa-solid fa-star text-primary dark:text-accent"></i>
                    Quick Access Favorites
                </h3>
                <div className="flex items-center gap-2">
                    <button onClick={addFavorite} title="Add Favorite" className="px-3 py-1.5 rounded-md border border-border-light dark:border-border-dark text-xs font-semibold hover:bg-bg-light dark:hover:bg-bg-dark transition-colors">
                        <i className="fa-solid fa-plus"></i>
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} title="Import" className="px-3 py-1.5 rounded-md border border-border-light dark:border-border-dark text-xs font-semibold hover:bg-bg-light dark:hover:bg-bg-dark transition-colors">
                        <i className="fa-solid fa-upload"></i>
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleImport} accept=".json" className="hidden" />
                    <button onClick={handleExport} title="Export" className="px-3 py-1.5 rounded-md border border-border-light dark:border-border-dark text-xs font-semibold hover:bg-bg-light dark:hover:bg-bg-dark transition-colors">
                        <i className="fa-solid fa-download"></i>
                    </button>
                </div>
            </div>
            <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
                {favorites.length > 0 ? (
                    favorites.map(fav => (
                        <div key={fav.id} className="group relative bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark rounded-lg p-3 flex items-center gap-3 transition-colors hover:border-secondary dark:hover:border-accent cursor-pointer" onClick={() => window.open(fav.url, '_blank')}>
                            <div className="w-8 h-8 rounded-md bg-gradient-to-br from-primary to-secondary text-white flex items-center justify-center text-sm flex-shrink-0">
                                <i className={`fa-solid ${siteIcon(fav.url)}`}></i>
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <h5 className="font-bold text-sm truncate">{fav.name}</h5>
                                <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark truncate">{fav.description}</p>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); removeFavorite(fav.id); }} className="absolute top-1/2 -translate-y-1/2 right-2 w-6 h-6 bg-red-500/80 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs">
                                <i className="fa-solid fa-times"></i>
                            </button>
                        </div>
                    ))
                ) : (
                    <p className="text-center text-sm text-text-secondary-light dark:text-text-secondary-dark py-4">No favorites yet. Click '+' to add one.</p>
                )}
            </div>
        </div>
    );
};

export default Favorites;
