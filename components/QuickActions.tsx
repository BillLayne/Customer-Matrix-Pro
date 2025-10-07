
import React from 'react';

const QuickButton: React.FC<{ title: string; desc: string; icon: string; url: string; color: string }> = ({ title, desc, icon, url, color }) => (
    <button
        onClick={() => window.open(url, '_blank')}
        className="w-full bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark rounded-lg p-3 text-left flex items-center gap-4 transition-all duration-200 hover:bg-gradient-to-r hover:from-primary hover:to-secondary hover:text-white group hover:translate-x-1"
    >
        <div className={`w-10 h-10 rounded-md flex items-center justify-center text-white text-lg ${color} flex-shrink-0 group-hover:bg-white/20 transition-colors`}>
            <i className={icon}></i>
        </div>
        <div className="flex-1">
            <h5 className="font-bold text-sm text-text-light dark:text-text-dark group-hover:text-white">{title}</h5>
            <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark group-hover:text-white/80">{desc}</p>
        </div>
    </button>
);

const QuickActions: React.FC = () => {
  const actions = [
    { title: "Social Media Composer", desc: "Craft posts for social platforms", icon: "fa-solid fa-share-nodes", url: "https://aistudio.google.com/u/0/apps/drive/1RB3_0--C1TkvUeMunl6o6OcU9wm2Os0m?showPreview=true&showAssistant=true", color: "bg-gradient-to-br from-orange-600 to-orange-500" },
    { title: "New Business Followup", desc: "Draft follow-up emails for leads", icon: "fa-solid fa-user-plus", url: "https://aistudio.google.com/u/2/apps/drive/1k8WpG5vdFJhZJp_UORoFh7GI1sxwrBFj?showPreview=true&showAssistant=true&resourceKey=", color: "bg-gradient-to-br from-teal-600 to-teal-500" },
    { title: "Email Composer", desc: "General purpose email drafting", icon: "fa-solid fa-envelope-open-text", url: "https://aistudio.google.com/u/2/apps/drive/1pHGvEjfpAiNNsoBD9tsV3jWP5G9KdBYf?showPreview=true&showAssistant=true", color: "bg-gradient-to-br from-indigo-600 to-indigo-500" },
    { title: "Create PDF Document", desc: "Claude PDF generator project", icon: "fa-solid fa-file-pdf", url: "https://claude.ai/project/01993948-a57c-7166-ae81-c547e60fe8fa", color: "bg-gradient-to-br from-red-600 to-red-500" },
    { title: "Home Address Research", desc: "Property & address analysis", icon: "fa-solid fa-house-chimney-user", url: "https://claude.ai/project/0198f624-8a25-73be-a9e1-98389bc44b2c", color: "bg-gradient-to-br from-green-600 to-green-500" },
    { title: "Auto Quote Template", desc: "Generate auto insurance quotes", icon: "fa-solid fa-car", url: "https://claude.ai/project/0197c35a-7c70-72f7-8d5c-83df3286f0a4", color: "bg-gradient-to-br from-purple-600 to-purple-500" },
    { title: "Reports", desc: "View analytics", icon: "fa-solid fa-chart-bar", url: "https://agents.agencymatrix.com/#/reports", color: "bg-gradient-to-br from-sky-600 to-sky-500" },
  ];

  return (
    <div className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl shadow-md p-5">
      <h3 className="text-base font-bold flex items-center justify-between mb-4">
        <span>
          <i className="fa-solid fa-bolt text-primary dark:text-accent mr-2"></i>
          Quick AI Actions
        </span>
        <span className="text-xs font-bold uppercase bg-gradient-to-r from-primary to-secondary text-white px-2 py-0.5 rounded-full">AI Studio</span>
      </h3>
      <div className="flex flex-col gap-2">
        {actions.map(action => (
          <QuickButton key={action.title} {...action} />
        ))}
      </div>
    </div>
  );
};

export default QuickActions;