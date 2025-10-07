import React, { useState, useMemo, useRef } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import type { Task, Communication } from '../types';
import { GoogleGenAI, Type } from "@google/genai";
import Modal from './Modal';

interface TaskMatrixCardProps {
    addToast: (message: string, type?: 'success' | 'warning' | 'danger' | 'info') => void;
}

const PRIORITY_STYLES: Record<Task['priority'], { dot: string, text: string, bg: string }> = {
    high: { dot: 'bg-red-500', text: 'text-red-500', bg: 'bg-red-500/10' },
    medium: { dot: 'bg-yellow-500', text: 'text-yellow-500', bg: 'bg-yellow-500/10' },
    low: { dot: 'bg-green-500', text: 'text-green-500', bg: 'bg-green-500/10' },
};

const formatDate = (dateString: string | null): { text: string; isOverdue: boolean } => {
    if (!dateString) return { text: '', isOverdue: false };
    
    // Check for invalid date format before creating Date object
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        return { text: 'Invalid Date', isOverdue: false };
    }

    const dueDate = new Date(dateString + 'T00:00:00'); // Treat date as local timezone
    if (isNaN(dueDate.getTime())) {
        return { text: 'Invalid Date', isOverdue: false };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isOverdue = dueDate < today;

    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let text = '';
    if (diffDays === 0) {
        text = 'Today';
    } else if (diffDays === 1) {
        text = 'Tomorrow';
    } else if (isOverdue) {
        text = `Overdue`;
    } else {
        text = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(dueDate);
    }
    return { text, isOverdue };
};

const BLANK_TASK_FORM: Omit<Task, 'id' | 'createdAt' | 'completed' | 'communications'> = {
    text: '',
    dueDate: null,
    priority: 'medium',
    customerName: '',
    phone: '',
    email: '',
    customerValue: undefined,
    taskType: 'Follow-up',
    followUpDate: null,
    carrier: '',
    policyNumber: '',
    description: '',
    internalNotes: '',
    isRecurring: false,
};


const TaskMatrixCard: React.FC<TaskMatrixCardProps> = ({ addToast }) => {
    const [tasks, setTasks] = useLocalStorage<Task[]>('taskMatrixTasks_v3', []);
    const [newTaskInput, setNewTaskInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('active');
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [taskFormData, setTaskFormData] = useState(BLANK_TASK_FORM);
    const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const importFileInputRef = useRef<HTMLInputElement>(null);
    const [newCommLog, setNewCommLog] = useState<Record<string, string>>({});

    const [isAiAssistantModalOpen, setIsAiAssistantModalOpen] = useState(false);
    const [selectedTaskForAi, setSelectedTaskForAi] = useState<Task | null>(null);
    const [aiAssistantAction, setAiAssistantAction] = useState<'email' | 'summary' | 'custom'>('email');
    const [aiAssistantCustomPrompt, setAiAssistantCustomPrompt] = useState('');
    const [isAiGenerating, setIsAiGenerating] = useState(false);
    const [aiGeneratedContent, setAiGeneratedContent] = useState('');


    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                const result = reader.result as string;
                const base64 = result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = (error) => reject(error);
        });
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (file.type !== 'application/pdf') {
                addToast('Please select a PDF file.', 'warning');
                return;
            }
            setPdfFile(file);
        }
    };

    const clearPdfFile = () => {
        setPdfFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };


    const handleAddTask = async () => {
        if (!newTaskInput.trim() && !pdfFile) {
            addToast('Please enter a task or upload a PDF.', 'warning');
            return;
        }
        setIsLoading(true);

        const today = new Date().toISOString().split('T')[0];
        const prompt = `
You are an intelligent task parser for an insurance agent's to-do list. Your job is to analyze the user's text and/or a provided PDF document and convert it into a structured task object.

Today's date is: ${today}.

**Source Data:**
- User's text input (may contain instructions or the full task): "${newTaskInput}"
- A PDF document is ${pdfFile ? 'also provided. Prioritize information from the PDF.' : 'not provided.'}

**Your Task:**
Extract the following details. If a piece of information is not found, return null for that field or an appropriate default.

1.  **text:** The main, concise title for the task (e.g., "Follow up with John Doe on auto renewal").
2.  **description:** A more detailed description if available.
3.  **dueDate:** The absolute due date in YYYY-MM-DD format.
4.  **priority:** 'high', 'medium', or 'low'. Default to 'medium'.
5.  **customerName:** The full name of the client.
6.  **phone:** Client's phone number.
7.  **email:** Client's email address.
8.  **customerValue:** The premium amount, as a number.
9.  **taskType:** A category like 'Policy Change', 'New Quote', 'Follow-up', 'Claim'.
10. **followUpDate:** A separate follow-up date in YYYY-MM-DD format.
11. **carrier:** The insurance carrier's name.
12. **policyNumber:** The policy number.
13. **internalNotes:** Any notes for internal use.
14. **isRecurring:** A boolean (true/false) if the task seems to be recurring.

Return a single JSON object with the keys corresponding to the fields above.
`;

        try {
            const API_KEY = process.env.API_KEY;
            if (!API_KEY) throw new Error("API key not found.");
            const ai = new GoogleGenAI({ apiKey: API_KEY });

            let fileData = null;
            if (pdfFile) {
                const base64 = await fileToBase64(pdfFile);
                fileData = { mimeType: pdfFile.type, data: base64 };
            }

            const contents = fileData ? { parts: [{ text: prompt }, { inlineData: fileData }] } : prompt;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: contents,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            text: { type: Type.STRING },
                            dueDate: { type: Type.STRING },
                            priority: { type: Type.STRING },
                            customerName: { type: Type.STRING },
                            phone: { type: Type.STRING },
                            email: { type: Type.STRING },
                            customerValue: { type: Type.NUMBER },
                            taskType: { type: Type.STRING },
                            followUpDate: { type: Type.STRING },
                            carrier: { type: Type.STRING },
                            policyNumber: { type: Type.STRING },
                            description: { type: Type.STRING },
                            internalNotes: { type: Type.STRING },
                            isRecurring: { type: Type.BOOLEAN }
                        },
                        required: ['text', 'dueDate', 'priority']
                    }
                }
            });
            
            if (!response.text) {
                throw new Error("AI did not return a valid task.");
            }

            const parsedTask = JSON.parse(response.text);

            const newTask: Task = {
                ...BLANK_TASK_FORM,
                ...parsedTask,
                id: String(Date.now()),
                completed: false,
                createdAt: Date.now(),
            };

            setTasks(prev => [newTask, ...prev]);
            setNewTaskInput('');
            clearPdfFile();
            addToast('AI task created successfully!', 'success');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            addToast(`Failed to add task: ${errorMessage}`, 'danger');
        } finally {
            setIsLoading(false);
        }
    };
    
    const openModalForNew = () => {
        setEditingTask(null);
        setTaskFormData(BLANK_TASK_FORM);
        setIsModalOpen(true);
    };

    const openModalForEdit = (task: Task) => {
        setEditingTask(task);
        setTaskFormData({
            text: task.text,
            dueDate: task.dueDate,
            priority: task.priority,
            customerName: task.customerName || '',
            phone: task.phone || '',
            email: task.email || '',
            customerValue: task.customerValue,
            taskType: task.taskType || 'Follow-up',
            followUpDate: task.followUpDate,
            carrier: task.carrier || '',
            policyNumber: task.policyNumber || '',
            description: task.description || '',
            internalNotes: task.internalNotes || '',
            isRecurring: task.isRecurring || false,
        });
        setIsModalOpen(true);
    };

    const handleSaveTask = () => {
        if (!taskFormData.text.trim()) {
            addToast('Task title is required.', 'warning');
            return;
        }

        if (editingTask) {
            // Update existing task
            setTasks(prev => prev.map(t => t.id === editingTask.id ? { ...t, ...taskFormData } : t));
            addToast('Task updated!', 'success');
        } else {
            // Add new task
            const newTask: Task = {
                ...taskFormData,
                id: String(Date.now()),
                completed: false,
                createdAt: Date.now(),
                communications: [],
            };
            setTasks(prev => [newTask, ...prev]);
            addToast('Task added!', 'success');
        }
        setIsModalOpen(false);
    };


    const toggleTaskCompletion = (id: string) => {
        setTasks(prev => prev.map(task => 
            task.id === id ? { ...task, completed: !task.completed } : task
        ));
    };

    const deleteTask = (id: string) => {
        setTasks(prev => prev.filter(task => task.id !== id));
        addToast('Task removed.', 'info');
    };

    const handleAddCommunication = (taskId: string, type: Communication['type']) => {
        const text = newCommLog[taskId]?.trim();
        if (!text) {
            addToast('Please enter a note for the communication log.', 'warning');
            return;
        }

        const newCommunication: Communication = {
            id: String(Date.now()),
            type,
            text,
            timestamp: Date.now(),
        };

        setTasks(prevTasks => prevTasks.map(task => {
            if (task.id === taskId) {
                const updatedCommunications = [...(task.communications || []), newCommunication];
                return { ...task, communications: updatedCommunications };
            }
            return task;
        }));

        setNewCommLog(prev => ({ ...prev, [taskId]: '' }));
        addToast(`'${type}' logged successfully.`, 'success');
    };

    const handleExportTasks = () => {
        if (tasks.length === 0) {
            addToast('No tasks to export.', 'warning');
            return;
        }
        const dataStr = JSON.stringify({ tasks: tasks, exportDate: new Date().toISOString() }, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const date = new Date().toISOString().slice(0, 10);
        a.download = `matrix-tasks-export-${date}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        addToast('Tasks exported successfully!', 'success');
    };

    const handleImportClick = () => {
        importFileInputRef.current?.click();
    };
    
    const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
    
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const result = e.target?.result as string;
                const data = JSON.parse(result);
                
                // Handle both new object format and old raw array format for backward compatibility
                const importedTasks = Array.isArray(data) ? data : data.tasks;
    
                if (!Array.isArray(importedTasks) || (importedTasks.length > 0 && (!importedTasks[0].id || !importedTasks[0].text))) {
                    throw new Error('Invalid task file format.');
                }
    
                if (window.confirm(`Are you sure you want to import ${importedTasks.length} tasks? This will replace all your current tasks.`)) {
                    setTasks(importedTasks);
                    addToast('Tasks imported successfully!', 'success');
                }
            } catch (error) {
                addToast('Failed to import tasks. Invalid file.', 'danger');
                console.error(error);
            } finally {
                if(event.target) {
                    event.target.value = '';
                }
            }
        };
        reader.readAsText(file);
    };


    const filteredTasks = useMemo(() => {
        const parseDate = (dateString: string | null): number => {
            if (!dateString) return Infinity;
             if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return Infinity;
            const date = new Date(dateString + 'T00:00:00');
            return isNaN(date.getTime()) ? Infinity : date.getTime();
        };

        const sortedTasks = [...tasks].sort((a, b) => {
            const completedSort = Number(a.completed) - Number(b.completed);
            if (completedSort !== 0) return completedSort;
            const dateSort = parseDate(a.dueDate) - parseDate(b.dueDate);
            if (dateSort !== 0 && isFinite(dateSort)) return dateSort;
            return b.createdAt - a.createdAt;
        });

        if (filter === 'active') return sortedTasks.filter(t => !t.completed);
        if (filter === 'completed') return sortedTasks.filter(t => t.completed);
        return sortedTasks;
    }, [tasks, filter]);

    const handleOpenAiAssistant = (task: Task) => {
        setSelectedTaskForAi(task);
        setAiAssistantAction('email'); // Default action
        setAiAssistantCustomPrompt('');
        setAiGeneratedContent('');
        setIsAiAssistantModalOpen(true);
    };
    
    const handleGenerateForTask = async () => {
        if (!selectedTaskForAi) return;
    
        setIsAiGenerating(true);
        setAiGeneratedContent('');
    
        const taskContext = `
            Task Title: ${selectedTaskForAi.text}
            Customer Name: ${selectedTaskForAi.customerName || 'N/A'}
            Due Date: ${selectedTaskForAi.dueDate || 'N/A'}
            Priority: ${selectedTaskForAi.priority}
            Task Type: ${selectedTaskForAi.taskType || 'N/A'}
            Carrier: ${selectedTaskForAi.carrier || 'N/A'}
            Policy #: ${selectedTaskForAi.policyNumber || 'N/A'}
            Description: ${selectedTaskForAi.description || 'N/A'}
            Internal Notes: ${selectedTaskForAi.internalNotes || 'N/A'}
            Communication Log: ${selectedTaskForAi.communications?.map(c => `${c.type} on ${new Date(c.timestamp).toLocaleDateString()}: ${c.text}`).join('\n') || 'N/A'}
        `;
    
        let actionPrompt = '';
        switch (aiAssistantAction) {
            case 'email':
                actionPrompt = `Based on the task context, draft a professional and courteous follow-up email to the customer (${selectedTaskForAi.customerName}). The email should address the core subject of the task.`;
                break;
            case 'summary':
                actionPrompt = `Based on the task context, provide a concise summary of the situation and suggest the next logical action step for the agent. Format it as an internal note.`;
                break;
            case 'custom':
                if (!aiAssistantCustomPrompt.trim()) {
                    addToast('Please enter a custom prompt.', 'warning');
                    setIsAiGenerating(false);
                    return;
                }
                actionPrompt = aiAssistantCustomPrompt;
                break;
        }
    
        const fullPrompt = `
You are an expert insurance agent assistant for Bill Layne Insurance Agency.
Your goal is to help the agent complete their tasks efficiently.

Here is the full context for a specific task:
---
${taskContext}
---

Now, please perform the following action:
---
${actionPrompt}
---

Keep your response concise, professional, and directly useful. If drafting an email, sign off with our agency details.
`;
        
        try {
            const API_KEY = process.env.API_KEY;
            if (!API_KEY) throw new Error("API key not found.");
            const ai = new GoogleGenAI({ apiKey: API_KEY });
    
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: fullPrompt,
            });
    
            if (!response.text) {
                throw new Error("AI did not return a valid response.");
            }
            setAiGeneratedContent(response.text);
    
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            addToast(`AI Assistant failed: ${errorMessage}`, 'danger');
        } finally {
            setIsAiGenerating(false);
        }
    };

    const handleAddAiContentToNotes = () => {
        if (!aiGeneratedContent || !selectedTaskForAi) return;
    
        const newCommunication: Communication = {
            id: String(Date.now()),
            type: 'note',
            text: `--- AI Assistant Generated ---\nAction: ${aiAssistantAction}\n${aiAssistantAction === 'custom' ? `Prompt: ${aiAssistantCustomPrompt}\n` : ''}Response:\n${aiGeneratedContent}`,
            timestamp: Date.now(),
        };
    
        setTasks(prevTasks => prevTasks.map(task => {
            if (task.id === selectedTaskForAi.id) {
                const updatedCommunications = [...(task.communications || []), newCommunication];
                const updatedInternalNotes = `${task.internalNotes || ''}\n\n--- AI Assistant (${new Date().toLocaleString()}) ---\n${aiGeneratedContent}`.trim();
                return { ...task, communications: updatedCommunications, internalNotes: updatedInternalNotes };
            }
            return task;
        }));
    
        addToast('AI content added to notes.', 'success');
        setIsAiAssistantModalOpen(false);
    };

    const handleCopyAiContent = () => {
        if (!aiGeneratedContent) return;
        navigator.clipboard.writeText(aiGeneratedContent).then(() => {
            addToast('Content copied to clipboard!', 'success');
        }).catch(() => {
            addToast('Failed to copy content.', 'danger');
        });
    };

    return (
        <>
        <div className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl shadow-md p-5">
            <h3 className="text-base font-bold flex items-center justify-between mb-4">
                <span className="flex items-center gap-2">
                    <i className="fa-solid fa-list-check text-primary dark:text-accent"></i>
                    AI Task Matrix
                </span>
                <div className="flex items-center gap-1">
                    <button onClick={handleImportClick} title="Import Tasks" className="px-2 py-1 rounded-md border border-border-light dark:border-border-dark text-xs font-semibold hover:bg-bg-light dark:hover:bg-bg-dark transition-colors flex items-center gap-1.5">
                        <i className="fa-solid fa-upload"></i> <span className="hidden sm:inline">Import</span>
                    </button>
                    <input type="file" ref={importFileInputRef} onChange={handleFileImport} accept=".json" className="hidden" />
                    <button onClick={handleExportTasks} title="Export Tasks" className="px-2 py-1 rounded-md border border-border-light dark:border-border-dark text-xs font-semibold hover:bg-bg-light dark:hover:bg-bg-dark transition-colors flex items-center gap-1.5">
                        <i className="fa-solid fa-download"></i> <span className="hidden sm:inline">Export</span>
                    </button>
                    <span className="text-xs font-bold uppercase bg-gradient-to-r from-primary to-secondary text-white px-2 py-0.5 rounded-full ml-2">Pro</span>
                </div>
            </h3>
            <div className="space-y-3 mb-3">
                <textarea
                    value={newTaskInput}
                    onChange={(e) => setNewTaskInput(e.target.value)}
                    placeholder="Quick add: Follow up with Jane Doe renewal tomorrow, or drop a PDF below..."
                    className="w-full h-20 p-2 bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark rounded-md text-sm"
                    disabled={isLoading}
                />
                 <div className="bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark rounded-lg p-3">
                    <div className="flex items-center gap-2">
                        <label htmlFor="task-pdf-upload" className="flex-1 cursor-pointer w-full bg-card-light dark:bg-card-dark border-2 border-dashed border-border-light dark:border-border-dark font-semibold py-2 px-3 rounded-lg hover:border-primary dark:hover:border-accent transition-colors flex items-center justify-center gap-2 text-sm text-text-secondary-light dark:text-text-secondary-dark">
                            <i className="fa-solid fa-file-pdf"></i>
                            <span>{pdfFile ? 'Change PDF' : 'Add Task from PDF'}</span>
                        </label>
                        <input id="task-pdf-upload" type="file" accept=".pdf" onChange={handleFileChange} ref={fileInputRef} className="hidden" />
                        {pdfFile && (
                            <button onClick={clearPdfFile} title="Clear selection" className="px-3 py-2 text-red-500 rounded-lg hover:bg-red-500/10">
                                <i className="fa-solid fa-times"></i>
                            </button>
                        )}
                    </div>
                    {pdfFile && (
                        <div className="text-xs text-text-secondary-light dark:text-text-secondary-dark mt-2 px-1 flex items-center gap-2">
                            <i className="fa-solid fa-file-invoice flex-shrink-0"></i>
                            <span className="truncate" title={pdfFile.name}>{pdfFile.name}</span>
                        </div>
                    )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <button 
                        onClick={handleAddTask} 
                        disabled={isLoading}
                        className="w-full bg-gradient-to-r from-primary to-secondary text-white font-bold py-2.5 rounded-lg shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                    >
                        {isLoading ? <><i className="fa-solid fa-spinner fa-spin"></i> Analyzing...</> : <><i className="fa-solid fa-wand-magic-sparkles"></i> Create with AI</>}
                    </button>
                    <button 
                        onClick={openModalForNew}
                        className="w-full bg-bg-light dark:bg-card-dark border-2 border-border-light dark:border-border-dark font-semibold py-2.5 rounded-lg hover:border-secondary dark:hover:border-accent transition-all flex items-center justify-center gap-2"
                    >
                       <i className="fa-solid fa-plus"></i> Add Detailed Task
                    </button>
                </div>
            </div>
            
            <div className="flex items-center justify-between mb-3 border-b border-border-light dark:border-border-dark pb-3">
                <div className="text-xs font-semibold text-text-secondary-light dark:text-text-secondary-dark uppercase">
                    {filteredTasks.length} {filter === 'completed' ? 'Completed' : filter === 'active' ? 'Active' : ''} Task(s)
                </div>
                 <div className="flex items-center gap-1 bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark p-0.5 rounded-md">
                    {(['active', 'completed', 'all'] as const).map(f => (
                        <button key={f} onClick={() => setFilter(f)} className={`px-2 py-1 text-xs font-semibold rounded capitalize transition-colors ${filter === f ? 'bg-primary text-white shadow-sm' : 'hover:bg-primary/10'}`}>
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex flex-col gap-2 max-h-96 overflow-y-auto pr-1">
                {filteredTasks.length > 0 ? (
                    filteredTasks.map(task => {
                        const { text: dateText, isOverdue } = formatDate(task.dueDate);
                        const isExpanded = expandedTaskId === task.id;
                        return (
                            <div key={task.id} className={`group bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark rounded-lg p-3 transition-all duration-300`}>
                                <div className="flex items-start gap-3">
                                    <div className={`w-5 h-5 flex-shrink-0 mt-0.5 flex items-center justify-center border-2 rounded cursor-pointer ${task.completed ? 'bg-primary border-primary text-white' : 'border-border-dark'}`} onClick={() => toggleTaskCompletion(task.id)}>
                                        {task.completed && <i className="fa-solid fa-check text-xs"></i>}
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <p className={`text-sm font-medium ${task.completed ? 'line-through text-text-secondary-light dark:text-text-secondary-dark' : ''}`}>{task.text}</p>
                                        <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs text-text-secondary-light dark:text-text-secondary-dark mt-1">
                                            <div className="flex items-center gap-1.5">
                                                <div className={`w-2 h-2 rounded-full ${PRIORITY_STYLES[task.priority].dot}`}></div>
                                                <span className="capitalize">{task.priority}</span>
                                            </div>
                                            {dateText && (
                                                <div className={`flex items-center gap-1.5 ${isOverdue ? 'text-red-500 font-semibold' : ''}`}>
                                                    <i className="fa-solid fa-calendar-alt"></i>
                                                    <span>{dateText}</span>
                                                </div>
                                            )}
                                            {task.customerName && (
                                                <div className='flex items-center gap-1.5'>
                                                    <i className="fa-solid fa-user"></i>
                                                    <span>{task.customerName}</span>
                                                    {task.phone && (
                                                        <a href={`tel:${task.phone}`} onClick={e => e.stopPropagation()} title={`Call ${task.phone}`} className="ml-1 text-primary dark:text-accent hover:opacity-75 text-sm">
                                                            <i className="fa-solid fa-phone-volume"></i>
                                                        </a>
                                                    )}
                                                    {task.email && (
                                                        <a href={`mailto:${task.email}`} onClick={e => e.stopPropagation()} title={`Email ${task.email}`} className="text-primary dark:text-accent hover:opacity-75 text-sm">
                                                            <i className="fa-solid fa-envelope"></i>
                                                        </a>
                                                    )}
                                                </div>
                                            )}
                                            {task.policyNumber && <div className='flex items-center gap-1.5'><i className="fa-solid fa-file-shield"></i><span>{task.policyNumber}</span></div>}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                         <button onClick={() => handleOpenAiAssistant(task)} title="AI Assistant" className="w-6 h-6 rounded flex items-center justify-center text-primary dark:text-accent hover:bg-black/10 dark:hover:bg-white/10 transition-colors text-xs flex-shrink-0">
                                            <i className="fa-solid fa-wand-magic-sparkles"></i>
                                        </button>
                                        <button onClick={() => setExpandedTaskId(isExpanded ? null : task.id)} className="w-6 h-6 rounded flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 transition-colors text-xs flex-shrink-0">
                                            <i className={`fa-solid fa-chevron-down transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}></i>
                                        </button>
                                        <button onClick={() => openModalForEdit(task)} className="w-6 h-6 rounded flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 transition-colors text-xs flex-shrink-0">
                                            <i className="fa-solid fa-pencil"></i>
                                        </button>
                                        <button onClick={() => deleteTask(task.id)} className="w-6 h-6 text-red-500 rounded flex items-center justify-center hover:bg-red-500/10 transition-colors text-xs flex-shrink-0">
                                            <i className="fa-solid fa-trash"></i>
                                        </button>
                                    </div>
                                </div>
                                {isExpanded && (
                                    <div className="mt-3 pt-3 border-t border-border-light dark:border-border-dark text-xs text-text-secondary-light dark:text-text-secondary-dark space-y-2">
                                        {task.description && <div><strong>Description:</strong> {task.description}</div>}
                                        {task.carrier && <div><strong>Carrier:</strong> {task.carrier}</div>}
                                        {task.taskType && <div><strong>Type:</strong> {task.taskType}</div>}
                                        {task.internalNotes && <div><strong>Notes:</strong> <p className="whitespace-pre-wrap pl-2">{task.internalNotes}</p></div>}
                                        
                                        <div className="mt-3 pt-2 border-t border-border-light/50 dark:border-border-dark/50">
                                            <h5 className="font-semibold mb-2 text-text-light dark:text-text-dark">Communication Log</h5>
                                            <div className="space-y-2 max-h-40 overflow-y-auto pr-1 mb-2">
                                                {task.communications && task.communications.length > 0 ? (
                                                    [...task.communications].reverse().map(comm => (
                                                        <div key={comm.id} className="flex items-start gap-2 p-2 bg-card-light/50 dark:bg-card-dark rounded-md">
                                                            <i className={`fa-solid ${comm.type === 'call' ? 'fa-phone' : comm.type === 'email' ? 'fa-envelope' : 'fa-note-sticky'} mt-1 text-primary dark:text-accent`}></i>
                                                            <div className="flex-1">
                                                                <p className="text-text-light dark:text-text-dark text-xs whitespace-pre-wrap">{comm.text}</p>
                                                                <p className="text-[10px] text-text-secondary-light dark:text-text-secondary-dark mt-1">{new Date(comm.timestamp).toLocaleString()}</p>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <p className="text-xs text-center p-2">No communication logged yet.</p>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    placeholder="Log an interaction..."
                                                    value={newCommLog[task.id] || ''}
                                                    onChange={e => setNewCommLog(prev => ({ ...prev, [task.id]: e.target.value }))}
                                                    className="flex-1 w-full p-1.5 bg-card-light dark:bg-bg-dark border border-border-light dark:border-border-dark rounded-md text-xs"
                                                />
                                                <button onClick={() => handleAddCommunication(task.id, 'call')} title="Log Call" className="px-2 py-1.5 rounded-md border border-border-light dark:border-border-dark hover:bg-black/5 dark:hover:bg-white/5"><i className="fa-solid fa-phone"></i></button>
                                                <button onClick={() => handleAddCommunication(task.id, 'email')} title="Log Email" className="px-2 py-1.5 rounded-md border border-border-light dark:border-border-dark hover:bg-black/5 dark:hover:bg-white/5"><i className="fa-solid fa-envelope"></i></button>
                                                <button onClick={() => handleAddCommunication(task.id, 'note')} title="Log Note" className="px-2 py-1.5 rounded-md border border-border-light dark:border-border-dark hover:bg-black/5 dark:hover:bg-white/5"><i className="fa-solid fa-note-sticky"></i></button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                ) : (
                    <p className="text-center text-sm text-text-secondary-light dark:text-text-secondary-dark py-4">
                        {filter === 'completed' ? 'No completed tasks.' : 'All caught up! 🎉'}
                    </p>
                )}
            </div>
        </div>
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingTask ? "Edit Task" : "Add Detailed Task"}>
                <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                    {/* Main Details */}
                    <div className="p-3 border border-border-light dark:border-border-dark rounded-lg">
                        <label className="text-sm font-medium">Task Title*</label>
                        <input type="text" value={taskFormData.text} onChange={e => setTaskFormData({...taskFormData, text: e.target.value})} className="w-full mt-1 p-2 bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark rounded-md"/>
                        <label className="text-sm font-medium mt-3 block">Description</label>
                        <textarea value={taskFormData.description} onChange={e => setTaskFormData({...taskFormData, description: e.target.value})} className="w-full mt-1 p-2 h-20 bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark rounded-md"/>
                    </div>
                    {/* Customer Info */}
                    <div className="p-3 border border-border-light dark:border-border-dark rounded-lg grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium">Customer Name</label>
                            <input type="text" value={taskFormData.customerName} onChange={e => setTaskFormData({...taskFormData, customerName: e.target.value})} className="w-full mt-1 p-2 bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark rounded-md"/>
                        </div>
                        <div>
                            <label className="text-sm font-medium">Phone</label>
                            <input type="text" value={taskFormData.phone} onChange={e => setTaskFormData({...taskFormData, phone: e.target.value})} className="w-full mt-1 p-2 bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark rounded-md"/>
                        </div>
                         <div className="col-span-2">
                            <label className="text-sm font-medium">Email</label>
                            <input type="email" value={taskFormData.email} onChange={e => setTaskFormData({...taskFormData, email: e.target.value})} className="w-full mt-1 p-2 bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark rounded-md"/>
                        </div>
                    </div>
                    {/* Policy & Task Details */}
                     <div className="p-3 border border-border-light dark:border-border-dark rounded-lg grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium">Due Date</label>
                            <input type="date" value={taskFormData.dueDate || ''} onChange={e => setTaskFormData({...taskFormData, dueDate: e.target.value})} className="w-full mt-1 p-2 bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark rounded-md"/>
                        </div>
                         <div>
                            <label className="text-sm font-medium">Follow-up Date</label>
                            <input type="date" value={taskFormData.followUpDate || ''} onChange={e => setTaskFormData({...taskFormData, followUpDate: e.target.value})} className="w-full mt-1 p-2 bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark rounded-md"/>
                        </div>
                        <div>
                            <label className="text-sm font-medium">Priority</label>
                            <select value={taskFormData.priority} onChange={e => setTaskFormData({...taskFormData, priority: e.target.value as Task['priority']})} className="w-full mt-1 p-2 bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark rounded-md">
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                            </select>
                        </div>
                         <div>
                            <label className="text-sm font-medium">Task Type</label>
                            <input type="text" value={taskFormData.taskType} onChange={e => setTaskFormData({...taskFormData, taskType: e.target.value})} className="w-full mt-1 p-2 bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark rounded-md"/>
                        </div>
                        <div>
                            <label className="text-sm font-medium">Insurance Carrier</label>
                            <input type="text" value={taskFormData.carrier} onChange={e => setTaskFormData({...taskFormData, carrier: e.target.value})} className="w-full mt-1 p-2 bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark rounded-md"/>
                        </div>
                        <div>
                            <label className="text-sm font-medium">Policy #</label>
                            <input type="text" value={taskFormData.policyNumber} onChange={e => setTaskFormData({...taskFormData, policyNumber: e.target.value})} className="w-full mt-1 p-2 bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark rounded-md"/>
                        </div>
                    </div>
                     <div className="p-3 border border-border-light dark:border-border-dark rounded-lg">
                        <label className="text-sm font-medium">Internal Notes</label>
                        <textarea value={taskFormData.internalNotes} onChange={e => setTaskFormData({...taskFormData, internalNotes: e.target.value})} className="w-full mt-1 p-2 h-20 bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark rounded-md"/>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-md border border-border-light dark:border-border-dark font-semibold">Cancel</button>
                        <button onClick={handleSaveTask} className="px-4 py-2 rounded-md bg-primary text-white font-semibold">Save Task</button>
                    </div>
                </div>
            </Modal>
        <Modal isOpen={isAiAssistantModalOpen} onClose={() => setIsAiAssistantModalOpen(false)} title={`AI Assistant: ${selectedTaskForAi?.text || ''}`}>
            {selectedTaskForAi && (
                <div className="space-y-4 text-sm">
                    <div>
                        <label className="text-xs font-semibold text-text-secondary-light dark:text-text-secondary-dark">SELECT ACTION</label>
                        <div className="grid grid-cols-3 gap-2 mt-1">
                            <button onClick={() => setAiAssistantAction('email')} className={`px-3 py-2 rounded-md font-semibold transition-colors text-xs ${aiAssistantAction === 'email' ? 'bg-primary text-white' : 'bg-bg-light dark:bg-bg-dark hover:bg-primary/10'}`}>Draft Email</button>
                            <button onClick={() => setAiAssistantAction('summary')} className={`px-3 py-2 rounded-md font-semibold transition-colors text-xs ${aiAssistantAction === 'summary' ? 'bg-primary text-white' : 'bg-bg-light dark:bg-bg-dark hover:bg-primary/10'}`}>Summarize & Suggest</button>
                            <button onClick={() => setAiAssistantAction('custom')} className={`px-3 py-2 rounded-md font-semibold transition-colors text-xs ${aiAssistantAction === 'custom' ? 'bg-primary text-white' : 'bg-bg-light dark:bg-bg-dark hover:bg-primary/10'}`}>Custom Prompt</button>
                        </div>
                    </div>

                    {aiAssistantAction === 'custom' && (
                        <div>
                            <label className="text-xs font-semibold text-text-secondary-light dark:text-text-secondary-dark">CUSTOM PROMPT</label>
                            <textarea
                                value={aiAssistantCustomPrompt}
                                onChange={(e) => setAiAssistantCustomPrompt(e.target.value)}
                                placeholder="e.g., Explain the next steps for a claim..."
                                className="w-full h-20 p-2 mt-1 bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark rounded-md text-sm"
                            />
                        </div>
                    )}

                    <button onClick={handleGenerateForTask} disabled={isAiGenerating} className="w-full bg-gradient-to-r from-primary to-secondary text-white font-bold py-2.5 rounded-lg shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2">
                        {isAiGenerating ? <><i className="fa-solid fa-spinner fa-spin"></i> Generating...</> : <><i className="fa-solid fa-wand-magic-sparkles"></i> Generate with Gemini</>}
                    </button>

                    {(isAiGenerating || aiGeneratedContent) && (
                        <div className="mt-4 pt-4 border-t border-border-light dark:border-border-dark">
                            <h4 className="text-sm font-semibold mb-2">AI Generated Content</h4>
                            <div className="w-full h-48 p-2 bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark rounded-md text-sm overflow-y-auto whitespace-pre-wrap">
                                {isAiGenerating ? (
                                    <div className="flex items-center justify-center h-full text-text-secondary-light dark:text-text-secondary-dark">
                                        <i className="fa-solid fa-spinner fa-spin text-xl"></i>
                                    </div>
                                ) : (
                                    aiGeneratedContent
                                )}
                            </div>
                             {aiGeneratedContent && !isAiGenerating && (
                                <div className="flex justify-end gap-2 mt-2">
                                    <button onClick={handleCopyAiContent} className="px-3 py-1.5 text-xs rounded-md border border-border-light dark:border-border-dark font-semibold">Copy</button>
                                    <button onClick={handleAddAiContentToNotes} className="px-3 py-1.5 text-xs rounded-md bg-primary text-white font-semibold">Add to Notes</button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </Modal>
        </>
    );
};

export default TaskMatrixCard;