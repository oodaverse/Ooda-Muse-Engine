import React from 'react';
import { 
  Image, Globe, Code2, StickyNote, Mic, 
  LayoutGrid, Bot, Search as SearchIcon, Split, CheckSquare, Calendar,
  X, Command, PlusCircle, BrainCircuit
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ToolType } from '../types';

interface RightToolbarProps {
  activeTool: ToolType | null;
  onToggleTool: (tool: ToolType) => void;
}

// --- Desktop Toolbar ---

const ToolButton: React.FC<{
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}> = ({ icon, label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 group relative shrink-0 ${
      isActive 
        ? 'bg-white text-black shadow-lg shadow-white/10' 
        : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200'
    }`}
  >
    {icon}
    {/* Tooltip */}
    <span className="absolute right-14 bg-zinc-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-zinc-700 z-50">
      {label}
    </span>
  </button>
);

export const RightToolbar: React.FC<RightToolbarProps> = ({ activeTool, onToggleTool }) => {
  return (
    <div className="w-16 h-full bg-zinc-950 border-l border-zinc-800 flex flex-col items-center py-4 gap-4 shrink-0 z-20 overflow-y-auto scrollbar-hide hidden lg:flex">
      
      {/* Group 1: Core/Management */}
      <div className="flex flex-col gap-3">
        <ToolButton 
          icon={<LayoutGrid size={20} />} 
          label="Workspace" 
          isActive={activeTool === ToolType.Workspace}
          onClick={() => onToggleTool(ToolType.Workspace)}
        />
        <ToolButton 
          icon={<Bot size={20} />} 
          label="Create Agent" 
          isActive={activeTool === ToolType.CreateMode}
          onClick={() => onToggleTool(ToolType.CreateMode)}
        />
        {/* Memory Button */}
        <ToolButton 
          icon={<BrainCircuit size={20} />} 
          label="Memory & Brain" 
          isActive={activeTool === ToolType.Brain}
          onClick={() => onToggleTool(ToolType.Brain)}
        />
      </div>

      <div className="w-8 h-[1px] bg-zinc-800/50 shrink-0" />

      {/* Group 2: Productivity */}
      <div className="flex flex-col gap-3">
        <ToolButton 
          icon={<CheckSquare size={20} />} 
          label="Tasks" 
          isActive={activeTool === ToolType.Tasks}
          onClick={() => onToggleTool(ToolType.Tasks)}
        />
        <ToolButton 
          icon={<Calendar size={20} />} 
          label="Calendar" 
          isActive={activeTool === ToolType.Calendar}
          onClick={() => onToggleTool(ToolType.Calendar)}
        />
        <ToolButton 
          icon={<StickyNote size={20} />} 
          label="Notes" 
          isActive={activeTool === ToolType.Notes}
          onClick={() => onToggleTool(ToolType.Notes)}
        />
      </div>

      <div className="w-8 h-[1px] bg-zinc-800/50 shrink-0" />

      {/* Group 3: Power Tools */}
      <div className="flex flex-col gap-3">
        <ToolButton 
          icon={<SearchIcon size={20} />} 
          label="Research" 
          isActive={activeTool === ToolType.Research}
          onClick={() => onToggleTool(ToolType.Research)}
        />
        <ToolButton 
          icon={<Split size={20} />} 
          label="Compare" 
          isActive={activeTool === ToolType.Compare}
          onClick={() => onToggleTool(ToolType.Compare)}
        />
        <ToolButton 
          icon={<Code2 size={20} />} 
          label="Coding" 
          isActive={activeTool === ToolType.Coding}
          onClick={() => onToggleTool(ToolType.Coding)}
        />
        <ToolButton 
          icon={<Globe size={20} />} 
          label="Web Search" 
          isActive={activeTool === ToolType.WebSearch}
          onClick={() => onToggleTool(ToolType.WebSearch)}
        />
        <ToolButton 
          icon={<Image size={20} />} 
          label="Image Gen" 
          isActive={activeTool === ToolType.ImageGen}
          onClick={() => onToggleTool(ToolType.ImageGen)}
        />
      </div>

      <div className="mt-auto flex flex-col gap-4 pt-4">
        <button className="w-10 h-10 rounded-full flex items-center justify-center text-zinc-500 hover:text-white transition-colors">
            <Mic size={20} />
        </button>
      </div>
    </div>
  );
};

// --- Mobile Immersive Toolbar ---

const MobileToolItem: React.FC<{
    icon: React.ReactNode;
    label: string;
    isActive: boolean;
    onClick: () => void;
}> = ({ icon, label, isActive, onClick }) => (
    <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={onClick}
        className={`flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all ${
            isActive 
            ? 'bg-white text-black border-white/50 shadow-xl' 
            : 'bg-zinc-900/50 text-zinc-400 border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 backdrop-blur-sm'
        }`}
    >
        <div className={`p-3 rounded-full ${isActive ? 'bg-zinc-100' : 'bg-zinc-800'}`}>
            {icon}
        </div>
        <span className="text-xs font-medium">{label}</span>
    </motion.button>
);

interface MobileToolbarProps extends RightToolbarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileToolbar: React.FC<MobileToolbarProps> = ({ activeTool, onToggleTool, isOpen, onClose }) => {
    
    return (
        <div className="lg:hidden">
            {/* Immersive Overlay */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
                        animate={{ opacity: 1, backdropFilter: "blur(12px)" }}
                        exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
                        className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center p-6"
                        onClick={onClose}
                    >
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-md bg-zinc-950/90 border border-zinc-800 p-6 rounded-3xl shadow-2xl relative"
                        >
                            <button 
                                onClick={onClose}
                                className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>

                            <div className="text-center mb-8 mt-2">
                                <h3 className="text-2xl font-bold text-white tracking-tight flex items-center justify-center gap-2">
                                    <Command size={24} />
                                    Koda Command
                                </h3>
                                <p className="text-zinc-400 text-sm mt-1">Select a tool to activate</p>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <MobileToolItem 
                                    icon={<Bot size={20} />} 
                                    label="Create Agent" 
                                    isActive={activeTool === ToolType.CreateMode} 
                                    onClick={() => onToggleTool(ToolType.CreateMode)} 
                                />
                                <MobileToolItem 
                                    icon={<BrainCircuit size={20} />} 
                                    label="Brain" 
                                    isActive={activeTool === ToolType.Brain} 
                                    onClick={() => onToggleTool(ToolType.Brain)} 
                                />
                                <MobileToolItem 
                                    icon={<LayoutGrid size={20} />} 
                                    label="Work" 
                                    isActive={activeTool === ToolType.Workspace} 
                                    onClick={() => onToggleTool(ToolType.Workspace)} 
                                />
                                <MobileToolItem 
                                    icon={<SearchIcon size={20} />} 
                                    label="Research" 
                                    isActive={activeTool === ToolType.Research} 
                                    onClick={() => onToggleTool(ToolType.Research)} 
                                />
                                
                                <MobileToolItem 
                                    icon={<CheckSquare size={20} />} 
                                    label="Tasks" 
                                    isActive={activeTool === ToolType.Tasks} 
                                    onClick={() => onToggleTool(ToolType.Tasks)} 
                                />
                                <MobileToolItem 
                                    icon={<Code2 size={20} />} 
                                    label="Code" 
                                    isActive={activeTool === ToolType.Coding} 
                                    onClick={() => onToggleTool(ToolType.Coding)} 
                                />
                                <MobileToolItem 
                                    icon={<Image size={20} />} 
                                    label="Image" 
                                    isActive={activeTool === ToolType.ImageGen} 
                                    onClick={() => onToggleTool(ToolType.ImageGen)} 
                                />
                                
                                <MobileToolItem 
                                    icon={<StickyNote size={20} />} 
                                    label="Notes" 
                                    isActive={activeTool === ToolType.Notes} 
                                    onClick={() => onToggleTool(ToolType.Notes)} 
                                />
                                <MobileToolItem 
                                    icon={<Calendar size={20} />} 
                                    label="Calendar" 
                                    isActive={activeTool === ToolType.Calendar} 
                                    onClick={() => onToggleTool(ToolType.Calendar)} 
                                />
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};