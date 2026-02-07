import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Share2, Search, Menu, Cpu, Sparkles, StopCircle, GripHorizontal, Copy, Check, Terminal, ExternalLink, StickyNote, Plus, ArrowRight, Globe, Tag, Loader2, RefreshCw } from 'lucide-react';
import { Message, Role, Note, AiMode, MemoryFact } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { sendMessageToKoda } from '../services/xaiService';
import { getModeIcon } from './ModeSelector';

interface ChatAreaProps {
  chatId: string;
  title: string;
  messages: Message[];
  activeMode: AiMode;
  memoryFacts: MemoryFact[];
  onUpdateMessages: (chatId: string, messages: Message[]) => void;
  onInteractionComplete: (userMsg: string, aiMsg: string) => void;
  onToggleSidebar: () => void;
  onOpenMobileMenu: () => void;
  onAddNote: (note: Note) => void;
  onSwitchMode: () => void;
}

// --- Global Toast Component ---
const Toast = ({ message, onClose }: { message: string, onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 2000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, x: '-50%' }}
      animate={{ opacity: 1, y: 0, x: '-50%' }}
      exit={{ opacity: 0, y: 20, x: '-50%' }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="fixed bottom-24 left-1/2 z-[200] px-4 py-2 bg-zinc-900 border border-zinc-800 text-white text-sm font-medium rounded-full shadow-2xl flex items-center gap-2 pointer-events-none"
    >
      <div className="w-5 h-5 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center border border-green-500/20">
        <Check size={12} strokeWidth={3} />
      </div>
      {message}
    </motion.div>
  );
};

// --- Custom Markdown Components ---
const CodeBlock = ({ language, value }: { language: string, value: string }) => {
  const [isCopySuccess, setIsCopySuccess] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setIsCopySuccess(true);
    // Hide after 2 seconds (animation timing handled by AnimatePresence)
    setTimeout(() => setIsCopySuccess(false), 2000);
  };

  return (
    <div className="my-4 rounded-xl overflow-hidden border border-zinc-800 bg-[#0d0d0d] shadow-2xl relative group ring-1 ring-white/5">
        
        {/* Success Overlay - Positioned Top Right */}
        <AnimatePresence>
            {isCopySuccess && (
                <motion.div
                    initial={{ opacity: 0, scale: 1 }}
                    animate={{ opacity: 1, scale: 1.05 }}
                    exit={{ opacity: 0, scale: 1 }}
                    transition={{ 
                        opacity: { duration: 0.2 }, 
                        scale: { duration: 0.2 },
                    }}
                    className="absolute top-2.5 right-12 z-20 px-2.5 py-1 bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] font-bold uppercase tracking-wider rounded-md backdrop-blur-md shadow-lg flex items-center gap-1.5"
                >
                    <Check size={12} strokeWidth={3} />
                    Copied!
                </motion.div>
            )}
        </AnimatePresence>

        <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-900/50 border-b border-zinc-800/50 backdrop-blur-sm">
            <div className="flex items-center gap-2.5">
                <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/50"></div>
                </div>
                <div className="w-px h-4 bg-zinc-800 mx-1"></div>
                <Terminal size={13} className="text-zinc-500" />
                <span className="text-xs font-mono font-medium text-zinc-400 lowercase">{language || 'plaintext'}</span>
            </div>
            <button 
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all active:scale-95"
                title="Copy Code"
            >
                <Copy size={14} />
            </button>
        </div>
        <div className="relative">
            <SyntaxHighlighter 
                language={language} 
                style={oneDark} 
                customStyle={{ margin: 0, padding: '1.5rem', background: 'transparent', fontSize: '0.875rem', lineHeight: '1.6', fontFamily: '"JetBrains Mono", monospace' }}
                showLineNumbers={true}
                lineNumberStyle={{ minWidth: '2.5em', paddingRight: '1em', color: '#52525b', textAlign: 'right' }}
                wrapLines={true}
            >
                {value}
            </SyntaxHighlighter>
        </div>
    </div>
  );
};

// --- Selection Popup Menu ---
interface SelectionMenuProps {
  position: { top: number; left: number };
  selectedText: string;
  chatId: string;
  onClose: () => void;
  onAddNote: (note: Note) => void;
  onShowToast: (msg: string) => void;
}

const SelectionMenu: React.FC<SelectionMenuProps> = ({ position, selectedText, chatId, onClose, onAddNote, onShowToast }) => {
  const [mode, setMode] = useState<'initial' | 'wizard'>('initial');
  const [noteTitle, setNoteTitle] = useState('');
  const [tags, setTags] = useState('');
  const [isGlobal, setIsGlobal] = useState(false);

  useEffect(() => {
    if (selectedText) setNoteTitle(selectedText.length > 30 ? selectedText.substring(0, 30) + '...' : selectedText);
  }, [selectedText]);

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedText);
    onShowToast("Selection copied to clipboard");
    onClose();
  };

  const handleQuickAdd = () => {
    onAddNote({ id: Date.now().toString(), title: noteTitle, content: selectedText, tags: [], isGlobal: false, chatId: chatId, source: 'quick', createdAt: Date.now() });
    onShowToast("Saved to Notes");
    onClose();
  };

  const handleWizardSave = () => {
    const parsedTags = tags.split(',').map(t => t.trim()).filter(t => t.length > 0);
    onAddNote({ id: Date.now().toString(), title: noteTitle, content: selectedText, tags: parsedTags, isGlobal: isGlobal, chatId: chatId, source: 'wizard', createdAt: Date.now() });
    onShowToast("Note created with context");
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 5, scale: 0.95 }}
      style={{ top: position.top - 50, left: position.left }}
      className="fixed z-50 -translate-x-1/2"
      // Prevent focus loss and text deselection when interacting with the menu
      onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
    >
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl flex flex-col overflow-hidden ring-1 ring-white/10 max-w-sm w-max">
        {mode === 'initial' ? (
          <div className="flex items-center p-1 gap-1">
             <button onClick={handleCopy} className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors whitespace-nowrap">
              <Copy size={14} /> Copy
            </button>
            <div className="w-px h-4 bg-zinc-800" />
            <button onClick={handleQuickAdd} className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors whitespace-nowrap">
              <StickyNote size={14} className="text-indigo-400" /> Quick Save
            </button>
            <div className="w-px h-4 bg-zinc-800" />
            <button onClick={() => setMode('wizard')} className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors whitespace-nowrap">
              <Sparkles size={14} className="text-amber-400" /> Add Context...
            </button>
          </div>
        ) : (
          <div className="p-4 flex flex-col gap-3 w-80">
             <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Note Details</span>
                <span className="text-[10px] text-zinc-600">Selecting text...</span>
             </div>
             <div className="space-y-3">
                <div className="space-y-1">
                    <label className="text-[10px] text-zinc-500 font-medium">Title</label>
                    <input type="text" autoFocus value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500/50" />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] text-zinc-500 font-medium flex items-center gap-1"><Tag size={10} /> Keywords</label>
                    <input type="text" value={tags} onChange={(e) => setTags(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500/50" />
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-zinc-900/30 border border-zinc-800/50 cursor-pointer" onClick={() => setIsGlobal(!isGlobal)}>
                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isGlobal ? 'bg-indigo-600 border-indigo-600' : 'border-zinc-700'}`}>
                        {isGlobal && <Check size={10} className="text-white" />}
                    </div>
                    <span className="text-xs text-zinc-300 select-none flex items-center gap-1.5"><Globe size={12} /> Save to Global Notes</span>
                </div>
             </div>
             <div className="flex justify-end gap-2 mt-2 pt-3 border-t border-zinc-800">
                <button onClick={() => setMode('initial')} className="px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">Cancel</button>
                <button onClick={handleWizardSave} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-md transition-colors flex items-center gap-1">Save Note <ArrowRight size={12} /></button>
             </div>
          </div>
        )}
        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-zinc-950 border-r border-b border-zinc-800 rotate-45"></div>
      </div>
    </motion.div>
  );
};

export const ChatArea: React.FC<ChatAreaProps> = ({ 
  chatId, 
  title, 
  messages, 
  activeMode,
  memoryFacts,
  onUpdateMessages,
  onInteractionComplete,
  onToggleSidebar,
  onOpenMobileMenu,
  onAddNote,
  onSwitchMode
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [originalPrompt, setOriginalPrompt] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Selection State
  const [selection, setSelection] = useState<{ text: string; position: { top: number; left: number }; } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => scrollToBottom(), [messages, isLoading]);
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputValue]);

  // Handle Text Selection Logic
  useEffect(() => {
    const handleSelectionChange = () => {
      const activeSelection = window.getSelection();
      if (activeSelection && !activeSelection.isCollapsed && activeSelection.toString().trim()) {
        const text = activeSelection.toString().trim();
        const range = activeSelection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        // Only update if selection is meaningful
        setSelection({ 
            text, 
            position: { 
                top: Math.max(rect.top, 60), 
                left: rect.left + rect.width / 2 
            } 
        });
      }
    };

    const handleDocumentMouseDown = () => {
      // Logic: If user clicks anywhere that ISN'T text (causing blur), we should hide the menu.
      // However, if the user highlights text, native selection stays.
      // If user clicks away, native selection clears (isCollapsed).
      const activeSelection = window.getSelection();
      if (!activeSelection || activeSelection.isCollapsed) {
          setSelection(null);
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    document.addEventListener('mousedown', handleDocumentMouseDown);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      document.removeEventListener('mousedown', handleDocumentMouseDown);
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    if (originalPrompt !== null) setOriginalPrompt(null);
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;
    setOriginalPrompt(null);
    
    const userContent = inputValue;
    const userMsg: Message = { id: Date.now().toString(), role: Role.User, content: userContent, timestamp: Date.now() };
    const newMessages = [...messages, userMsg];
    onUpdateMessages(chatId, newMessages);
    setInputValue('');
    setIsLoading(true);

    try {
      const responseContent = await sendMessageToKoda(messages, userContent, activeMode.systemInstruction, memoryFacts);
      
      const aiMsg: Message = { id: (Date.now() + 1).toString(), role: Role.Assistant, content: responseContent, timestamp: Date.now() };
      onUpdateMessages(chatId, [...newMessages, aiMsg]);
      onInteractionComplete(userContent, responseContent);

    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnhancePrompt = async () => {
    if (!inputValue.trim() || isEnhancing) return;
    if (originalPrompt !== null) {
      setInputValue(originalPrompt);
      setOriginalPrompt(null);
      return;
    }
    setOriginalPrompt(inputValue);
    setIsEnhancing(true);
    try {
        const prompt = `Rewrite the following user prompt to be more effective, detailed, and structured for an LLM interaction. Output ONLY the enhanced prompt text, without quotes. User Prompt: "${inputValue}"`;
        const enhancedText = await sendMessageToKoda([], prompt); 
        setInputValue(enhancedText.replace(/^"|"$/g, '').trim());
    } catch (err) {
        console.error("Enhancement failed", err);
        setOriginalPrompt(null);
    } finally {
        setIsEnhancing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-black relative">
      <AnimatePresence>
        {toastMessage && (
            <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selection && (
          <SelectionMenu 
            position={selection.position} 
            selectedText={selection.text} 
            chatId={chatId} 
            // CRITICAL CHANGE: Just hide modal on close, do NOT clear ranges. Highlight persists.
            onClose={() => setSelection(null)} 
            onAddNote={onAddNote}
            onShowToast={setToastMessage}
          />
        )}
      </AnimatePresence>

      {/* Header with Mode Switching */}
      <header className="h-16 border-b border-zinc-800/50 flex items-center justify-between px-6 bg-black/50 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button onClick={onToggleSidebar} className="text-zinc-400 hover:text-white lg:hidden"><Menu size={20} /></button>
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                {getModeIcon(activeMode.iconName, 18)}
             </div>
             <div>
                <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                  {title}
                </h2>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">{activeMode.name}</span>
                    <button 
                        onClick={onSwitchMode}
                        className="flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-300 hover:underline cursor-pointer"
                    >
                        <RefreshCw size={10} /> Switch Mode
                    </button>
                </div>
             </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"><Search size={18} /></button>
          <button className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"><Share2 size={18} /></button>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-8 scrollbar-thin scrollbar-thumb-zinc-800">
        {messages.map((msg) => (
          <motion.div 
            key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className={`flex w-full ${msg.role === Role.User ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex w-full max-w-4xl gap-4 ${msg.role === Role.User ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-xs font-bold border shadow-sm ${msg.role === Role.User ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-white text-black'}`}>
                {msg.role === Role.User ? 'You' : getModeIcon(activeMode.iconName, 14, "text-black")}
              </div>
              <div className={`flex flex-col gap-1 min-w-0 flex-1 ${msg.role === Role.User ? 'items-end' : 'items-start'}`}>
                <div className="text-[11px] font-medium text-zinc-500 px-1 uppercase tracking-wider mb-1">{msg.role === Role.User ? 'You' : activeMode.name}</div>
                <div className={`w-full ${msg.role === Role.User ? 'bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-2xl rounded-tr-sm px-6 py-4 shadow-sm max-w-2xl' : 'bg-transparent text-zinc-300 pl-0 pt-0'}`}>
                  {msg.role === Role.Assistant ? (
                    <div className="prose prose-invert prose-zinc max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                          code({node, inline, className, children, ...props}: any) {
                            const match = /language-(\w+)/.exec(className || '');
                            return !inline && match ? <CodeBlock language={match[1]} value={String(children).replace(/\n$/, '')} /> : <code className="bg-zinc-800/80 text-zinc-200 px-1.5 py-0.5 rounded text-[0.9em] font-mono border border-zinc-700/50" {...props}>{children}</code>;
                          },
                          table: ({children}) => <div className="my-6 w-full overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/20 shadow-sm"><table className="min-w-full text-left text-sm">{children}</table></div>,
                          thead: ({children}) => <thead className="bg-zinc-900 border-b border-zinc-800">{children}</thead>,
                          th: ({children}) => <th className="px-4 py-3 font-semibold text-zinc-200 text-xs uppercase tracking-wider">{children}</th>,
                          tr: ({children}) => <tr className="border-b border-zinc-800/50 last:border-0 hover:bg-zinc-900/30 transition-colors">{children}</tr>,
                          td: ({children}) => <td className="px-4 py-3 text-zinc-300">{children}</td>,
                          h1: ({children}) => <h1 className="text-2xl font-bold text-white mb-6 mt-10 pb-3 border-b-2 border-zinc-700/50 first:mt-0">{children}</h1>,
                          h2: ({children}) => <h2 className="text-xl font-bold text-white mb-5 mt-10 flex items-center gap-2.5 first:mt-0"><span className="w-1.5 h-7 bg-gradient-to-b from-white to-zinc-400 rounded-full shadow-sm"></span>{children}</h2>,
                          h3: ({children}) => <h3 className="text-lg font-semibold text-zinc-100 mb-4 mt-8 first:mt-0">{children}</h3>,
                          h4: ({children}) => <h4 className="text-base font-semibold text-zinc-200 mb-3 mt-6 first:mt-0">{children}</h4>,
                          p: ({children}) => <p className="leading-[1.8] mb-6 text-zinc-300 text-[15px] last:mb-0">{children}</p>,
                          ul: ({children}) => <ul className="list-disc list-outside ml-5 mb-6 space-y-2.5 text-zinc-300 marker:text-zinc-500">{children}</ul>,
                          ol: ({children}) => <ol className="list-decimal list-outside ml-5 mb-6 space-y-2.5 text-zinc-300 marker:text-zinc-500">{children}</ol>,
                          li: ({children}) => <li className="pl-1.5 leading-[1.7]">{children}</li>,
                          blockquote: ({children}) => <blockquote className="border-l-4 border-zinc-600 pl-5 py-3 my-6 italic text-zinc-400 bg-zinc-900/40 rounded-r-lg">{children}</blockquote>,
                          a: ({href, children}) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline decoration-blue-400/30 hover:decoration-blue-300/50 underline-offset-2 transition-colors inline-flex items-center gap-1">{children}<ExternalLink size={11} strokeWidth={2.5} className="opacity-70" /></a>,
                          hr: () => <hr className="border-zinc-800 my-10" />,
                          strong: ({children}) => <strong className="font-semibold text-white">{children}</strong>,
                          em: ({children}) => <em className="italic text-zinc-200">{children}</em>
                        }}
                      >{msg.content}</ReactMarkdown>
                    </div>
                  ) : <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">{msg.content}</div>}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
        {isLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start w-full">
             <div className="flex w-full max-w-4xl gap-4">
              <div className="w-8 h-8 shrink-0 rounded-lg bg-white text-black flex items-center justify-center border border-white"><Cpu size={16} className="animate-pulse" /></div>
              <div className="flex items-center gap-2 mt-2 h-8">
                 <div className="flex gap-1"><span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span><span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span><span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce"></span></div>
                 <span className="text-xs text-zinc-500 font-medium animate-pulse ml-2">{activeMode.id === 'general' ? 'Thinking...' : `${activeMode.name} is working...`}</span>
              </div>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 sm:p-4 bg-black relative z-20">
        <div className="max-w-4xl mx-auto relative group">
          <div className="absolute -top-[1.6rem] left-1/2 -translate-x-1/2 lg:hidden z-0">
             <button onClick={onOpenMobileMenu} className="h-7 px-8 bg-zinc-900 border-t border-x border-zinc-800 rounded-t-xl flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all shadow-lg active:scale-95 group-hover:border-zinc-700"><GripHorizontal size={16} /></button>
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className={`relative bg-zinc-900/80 border hover:border-zinc-700 focus-within:border-zinc-600 rounded-xl p-2 flex items-end gap-2 shadow-2xl transition-all duration-300 backdrop-blur-md z-10 ${originalPrompt !== null ? 'border-indigo-500/50 shadow-indigo-500/10' : 'border-zinc-800'}`}>
            <button className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors shrink-0 mb-0.5"><Paperclip size={18} /></button>
            <textarea ref={textareaRef} value={inputValue} onChange={handleInputChange} onKeyDown={handleKeyDown} placeholder={`Ask ${activeMode.name} anything...`} rows={1} className="flex-1 bg-transparent text-sm text-white placeholder-zinc-500 resize-none py-2 focus:outline-none max-h-[40vh] min-h-[24px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 whitespace-pre-wrap font-sans" />
            <div className="flex items-center gap-1 shrink-0 mb-0.5">
              <button onClick={handleEnhancePrompt} disabled={!inputValue.trim() && !originalPrompt} className={`p-1.5 rounded-lg transition-all duration-300 relative group overflow-hidden ${originalPrompt !== null ? 'text-indigo-300 bg-indigo-500/10 ring-1 ring-indigo-500/30' : 'text-zinc-500 hover:text-yellow-300 hover:bg-zinc-800'}`} title={originalPrompt !== null ? "Revert to Original" : "Enhance Prompt"}>
                {isEnhancing ? <Loader2 size={18} className="animate-spin" /> : <><Sparkles size={18} className={originalPrompt !== null ? "fill-indigo-400/20" : ""} />{originalPrompt === null && <span className="absolute inset-0 rounded-lg ring-2 ring-yellow-400/50 opacity-0 group-hover:animate-pulse"></span>}</>}
              </button>
              <button onClick={handleSend} disabled={!inputValue.trim() && !isLoading} className={`p-1.5 rounded-lg transition-all duration-300 ${inputValue.trim() ? 'bg-white text-black hover:bg-zinc-200' : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'}`}>{isLoading ? <StopCircle size={18} /> : <Send size={18} />}</button>
            </div>
          </div>
          <div className="text-center mt-2"><p className="text-[10px] text-zinc-600">KodaAI ({activeMode.name}) can make mistakes. Please verify important information.</p></div>
        </div>
      </div>
    </div>
  );
};