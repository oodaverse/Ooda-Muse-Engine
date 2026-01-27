import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Search, Bot, PenTool, Briefcase, GraduationCap, 
  CheckCircle2, HeartHandshake, Flower2, Code2, ArrowRight,
  Zap, Brain, Sparkles, Ghost, Gamepad2, Music, Trash2
} from 'lucide-react';
import { AiMode } from '../types';

interface ModeSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMode: (mode: AiMode) => void;
  activeModeId: string;
  modes: AiMode[];
  onDeleteMode?: (id: string) => void;
}

// Icon mapping helper
export const getModeIcon = (iconName: string, size = 20, className = "") => {
  const props = { size, className };
  switch (iconName) {
    case 'PenTool': return <PenTool {...props} />;
    case 'Briefcase': return <Briefcase {...props} />;
    case 'GraduationCap': return <GraduationCap {...props} />;
    case 'CheckCircle2': return <CheckCircle2 {...props} />;
    case 'HeartHandshake': return <HeartHandshake {...props} />;
    case 'Flower2': return <Flower2 {...props} />;
    case 'Code2': return <Code2 {...props} />;
    case 'Zap': return <Zap {...props} />;
    case 'Brain': return <Brain {...props} />;
    case 'Sparkles': return <Sparkles {...props} />;
    case 'Ghost': return <Ghost {...props} />;
    case 'Gamepad2': return <Gamepad2 {...props} />;
    case 'Music': return <Music {...props} />;
    case 'Bot': 
    default: return <Bot {...props} />;
  }
};

export const ModeSelector: React.FC<ModeSelectorProps> = ({ 
  isOpen, 
  onClose, 
  onSelectMode, 
  activeModeId, 
  modes,
  onDeleteMode 
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredModes = modes.filter(mode => 
    mode.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    mode.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm("Delete this custom mode? This cannot be undone.")) {
        onDeleteMode?.(id);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
        animate={{ opacity: 1, backdropFilter: "blur(8px)" }}
        exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
        className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div 
          initial={{ scale: 0.9, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.9, y: 20, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="w-full max-w-5xl bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/50 backdrop-blur-sm sticky top-0 z-10">
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                <Bot className="text-indigo-400" size={28} />
                Select AI Personality
              </h2>
              <p className="text-zinc-400 text-sm mt-1">Choose a specialized mode for your conversation.</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative hidden md:block w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                <input 
                  type="text" 
                  placeholder="Search modes..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-zinc-600"
                />
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-zinc-800 rounded-full text-zinc-500 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>
          </div>

          {/* Grid Content */}
          <div className="p-6 overflow-y-auto bg-zinc-950/95 scrollbar-thin scrollbar-thumb-zinc-800">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredModes.map((mode) => {
                const isActive = activeModeId === mode.id;
                return (
                  <motion.div
                    key={mode.id}
                    layout
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`relative p-5 rounded-2xl border transition-all flex flex-col h-full group ${
                      isActive 
                        ? 'bg-indigo-900/10 border-indigo-500/50 ring-1 ring-indigo-500/30' 
                        : 'bg-zinc-900/40 border-zinc-800 hover:bg-zinc-900/80 hover:border-zinc-700'
                    }`}
                  >
                    {mode.isCustom && (
                        <button 
                            onClick={(e) => handleDelete(e, mode.id)}
                            className="absolute top-3 right-3 p-2 text-zinc-600 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                            title="Delete custom mode"
                        >
                            <Trash2 size={16} />
                        </button>
                    )}

                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors ${
                       isActive ? 'bg-indigo-500 text-white' : 'bg-zinc-800 text-zinc-400'
                    }`}>
                      {getModeIcon(mode.iconName, 24)}
                    </div>

                    <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                        {mode.name}
                        {mode.isCustom && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">USER</span>}
                    </h3>
                    <p className="text-xs text-zinc-400 leading-relaxed mb-4 flex-1">
                      {mode.description}
                    </p>

                    <div className="space-y-3">
                       <div className="flex flex-wrap gap-1.5">
                          {mode.features.slice(0, 2).map((feature, i) => (
                             <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-500 border border-zinc-700">
                                {feature}
                             </span>
                          ))}
                          {mode.features.length > 2 && (
                             <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-500 border border-zinc-700">
                               +{mode.features.length - 2}
                             </span>
                          )}
                       </div>

                       <button 
                         onClick={() => onSelectMode(mode)}
                         className={`w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                            isActive 
                              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
                              : 'bg-white text-black hover:bg-zinc-200'
                         }`}
                       >
                         {isActive ? 'Active Mode' : 'Select Mode'}
                         {!isActive && <ArrowRight size={16} />}
                       </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
            
            {filteredModes.length === 0 && (
               <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
                  <Bot size={48} className="mb-4 opacity-20" />
                  <p>No modes found matching "{searchQuery}"</p>
               </div>
            )}
          </div>
          
          <div className="p-4 border-t border-zinc-800 bg-zinc-950 text-center">
             <p className="text-[10px] text-zinc-600">
                AI Modes define system behavior and response style. Interactions are private and isolated per session.
             </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};