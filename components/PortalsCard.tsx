
import React, { useState } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import type { Portal } from '../types';
import { DEFAULT_INSURANCE_PORTALS } from '../constants';
import Modal from './Modal';

interface PortalTileProps {
  portal: Portal;
  onRemove?: (id: string) => void;
}

const PortalTile: React.FC<PortalTileProps> = ({ portal, onRemove }) => {
    return (
        <div 
            className="bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark rounded-lg p-4 cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-md hover:border-secondary dark:hover:border-accent relative group"
            onClick={() => window.open(portal.url, '_blank')}
        >
            <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary text-white rounded-lg flex items-center justify-center text-lg">
                    <i className={portal.icon}></i>
                </div>
                <h4 className="font-bold text-text-light dark:text-text-dark flex-1">{portal.name}</h4>
            </div>
            <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark line-clamp-2">{portal.description}</p>
            {portal.custom && onRemove && (
                <button
                    onClick={(e) => { e.stopPropagation(); onRemove(portal.id); }}
                    className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                    title="Remove Portal"
                >
                    <i className="fa-solid fa-times"></i>
                </button>
            )}
        </div>
    );
};

interface PortalsCardProps {
    addToast: (message: string, type?: 'success' | 'warning' | 'danger' | 'info') => void;
}

const PortalsCard: React.FC<PortalsCardProps> = ({ addToast }) => {
    const [customPortals, setCustomPortals] = useLocalStorage<Portal[]>('customInsurancePortals', []);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newPortal, setNewPortal] = useState({ name: '', url: '', icon: 'fa-solid fa-building', description: '' });

    const allPortals = [...DEFAULT_INSURANCE_PORTALS, ...customPortals].sort((a, b) => a.name.localeCompare(b.name));
    
    const handleAddPortal = () => {
        if (!newPortal.name || !newPortal.url) {
            addToast('Portal name and URL are required.', 'warning');
            return;
        }
        
        let cleanUrl = newPortal.url.trim();
        if (!cleanUrl.startsWith('http')) {
            cleanUrl = `https://${cleanUrl}`;
        }

        try {
            new URL(cleanUrl);
        } catch {
            addToast('Invalid URL provided.', 'danger');
            return;
        }

        const portalToAdd: Portal = {
            id: String(Date.now()),
            name: newPortal.name.trim(),
            url: cleanUrl,
            icon: newPortal.icon.trim() || 'fa-solid fa-building',
            description: newPortal.description.trim() || `${newPortal.name.trim()} portal`,
            custom: true,
        };

        setCustomPortals(prev => [...prev, portalToAdd]);
        addToast('Portal added successfully!', 'success');
        setIsModalOpen(false);
        setNewPortal({ name: '', url: '', icon: 'fa-solid fa-building', description: '' });
    };
    
    const handleRemovePortal = (id: string) => {
        setCustomPortals(prev => prev.filter(p => p.id !== id));
        addToast('Custom portal removed.', 'success');
    };

    const handleResetPortals = () => {
        if (window.confirm('Are you sure you want to reset to default portals? This will remove all custom portals.')) {
            setCustomPortals([]);
            addToast('Portals have been reset to default.', 'success');
        }
    };

    return (
        <div className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl shadow-md p-5">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold flex items-center gap-2">
                    <i className="fa-solid fa-building-columns text-primary dark:text-accent"></i>
                    Insurance Company Portals
                </h3>
                <div className="flex items-center gap-2">
                    <button onClick={() => setIsModalOpen(true)} className="px-3 py-1.5 rounded-md border border-border-light dark:border-border-dark text-xs font-semibold hover:bg-bg-light dark:hover:bg-bg-dark transition-colors flex items-center gap-2">
                        <i className="fa-solid fa-plus"></i> Add
                    </button>
                    <button onClick={handleResetPortals} className="px-3 py-1.5 rounded-md border border-border-light dark:border-border-dark text-xs font-semibold hover:bg-bg-light dark:hover:bg-bg-dark transition-colors flex items-center gap-2">
                        <i className="fa-solid fa-rotate"></i> Reset
                    </button>
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {allPortals.map(portal => (
                    <PortalTile key={portal.id} portal={portal} onRemove={handleRemovePortal} />
                ))}
            </div>
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add New Portal">
                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-medium">Portal Name</label>
                        <input type="text" value={newPortal.name} onChange={e => setNewPortal({...newPortal, name: e.target.value})} className="w-full mt-1 p-2 bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark rounded-md"/>
                    </div>
                     <div>
                        <label className="text-sm font-medium">Portal URL</label>
                        <input type="text" value={newPortal.url} onChange={e => setNewPortal({...newPortal, url: e.target.value})} className="w-full mt-1 p-2 bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark rounded-md"/>
                    </div>
                     <div>
                        <label className="text-sm font-medium">Font Awesome Icon Class</label>
                        <input type="text" value={newPortal.icon} onChange={e => setNewPortal({...newPortal, icon: e.target.value})} className="w-full mt-1 p-2 bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark rounded-md"/>
                    </div>
                     <div>
                        <label className="text-sm font-medium">Description</label>
                        <input type="text" value={newPortal.description} onChange={e => setNewPortal({...newPortal, description: e.target.value})} className="w-full mt-1 p-2 bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark rounded-md"/>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-md border border-border-light dark:border-border-dark font-semibold">Cancel</button>
                        <button onClick={handleAddPortal} className="px-4 py-2 rounded-md bg-primary text-white font-semibold">Add Portal</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default PortalsCard;