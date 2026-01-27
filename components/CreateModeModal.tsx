import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Bot, Sparkles, ArrowRight, ArrowLeft, Wand2, 
  PenTool, Briefcase, GraduationCap, CheckCircle2, 
  HeartHandshake, Flower2, Code2, Zap, Brain, Ghost, Gamepad2, Music, Loader2
} from 'lucide-react';
import { AiMode } from '../types';
import { sendMessageToKoda } from '../services/xaiService';

interface CreateModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (mode: AiMode) => void;
}

const ICONS = [
  'Bot', 'Zap', 'Brain', 'Sparkles', 'Ghost', 
  'Gamepad2', 'Music', 'PenTool', 'Briefcase', 
  'GraduationCap', 'CheckCircle2', 'HeartHandshake', 'Flower2', 'Code2'
] as const;

export const CreateModeModal: React.FC<CreateModeModalProps> = ({ isOpen, onClose, onSave }) => {
  const [step, setStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIcon, setSelectedIcon] = useState<string>('Bot');
  const [userIntent, setUserIntent] = useState('');
  const [systemInstruction, setSystemInstruction] = useState('');
  const [featuresInput, setFeaturesInput] = useState('');

  const handleGeneratePrompt = async () => {
    if (!userIntent.trim()) return;
    setIsGenerating(true);
    try {
        const prompt = `Create a robust, professional system instruction (system prompt) for an AI assistant based on the following user intent: "${userIntent}". 
        
        The instruction should define the AI's persona, tone, rules, and behavior boundaries. 
        It should be written in the second person ("You are...").
        Return ONLY the system instruction text.`;
        
        const generated = await sendMessageToKoda([], prompt);
        setSystemInstruction(generated.replace(/^"|"$/g, '').trim());
    } catch (e) {
        console.error(e);
    } finally {
        setIsGenerating(false);
    }
  };

  const handleSave = () => {
    const newMode: AiMode = {
        id: `custom-${Date.now()}`,
        name: name || 'Custom Agent',
        description: description || 'A custom AI agent.',
        iconName: selectedIcon as any,
        systemInstruction: systemInstruction,
        features: featuresInput.split(',').map(f => f.trim()).filter(f => f.length > 0),
        isCustom: true
    };
    onSave(newMode);
    onClose();
    // Reset state after close animation
    setTimeout(() => {
        setStep(1);
        setName('');
        setDescription('');
        setUserIntent('');
        setSystemInstruction('');
        setFeaturesInput('');
    }, 500);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div 
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Bot className="text-indigo-500" />
              Create Custom Agent
            </h2>
            <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
              <X size={24} />
            </button>
          </div>

          {/* Body */}
          <div className="p-8">
            {step === 1 ? (
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-400">Agent Name</label>
                    <input 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g., Python Expert, Sarcastic Chef..."
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-400">Brief Description</label>
                    <input 
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="What does this agent do?"
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                </div>
                <div className="space-y-3">
                    <label className="text-sm font-medium text-zinc-400">Select Icon</label>
                    <div className="flex flex-wrap gap-2">
                        {ICONS.map(icon => (
                            <button
                                key={icon}
                                onClick={() => setSelectedIcon(icon)}
                                className={`p-3 rounded-xl border transition-all ${
                                    selectedIcon === icon 
                                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/25' 
                                    : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-white hover:bg-zinc-800'
                                }`}
                            >
                                {/* Render simplified icons directly for Wizard to avoid huge dependency chain in this snippet */}
                                {icon === 'Bot' && <Bot size={20} />}
                                {icon === 'Zap' && <Zap size={20} />}
                                {icon === 'Brain' && <Brain size={20} />}
                                {icon === 'Sparkles' && <Sparkles size={20} />}
                                {icon === 'Ghost' && <Ghost size={20} />}
                                {icon === 'Gamepad2' && <Gamepad2 size={20} />}
                                {icon === 'Music' && <Music size={20} />}
                                {icon === 'PenTool' && <PenTool size={20} />}
                                {icon === 'Briefcase' && <Briefcase size={20} />}
                                {icon === 'GraduationCap' && <GraduationCap size={20} />}
                                {icon === 'CheckCircle2' && <CheckCircle2 size={20} />}
                                {icon === 'HeartHandshake' && <HeartHandshake size={20} />}
                                {icon === 'Flower2' && <Flower2 size={20} />}
                                {icon === 'Code2' && <Code2 size={20} />}
                            </button>
                        ))}
                    </div>
                </div>
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-400 flex items-center justify-between">
                        <span>System Instruction (The "Brain")</span>
                        <span className="text-xs text-indigo-400 flex items-center gap-1">
                            <Sparkles size={12} /> AI Powered
                        </span>
                    </label>
                    
                    {/* AI Generator Input */}
                    <div className="flex gap-2">
                        <input 
                            value={userIntent}
                            onChange={(e) => setUserIntent(e.target.value)}
                            placeholder="Describe the personality (e.g. 'A strict english teacher who loves Shakespeare')..."
                            className="flex-1 bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                        />
                        <button 
                            onClick={handleGeneratePrompt}
                            disabled={isGenerating || !userIntent.trim()}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-sm font-medium flex items-center gap-2 transition-all"
                        >
                            {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                            Generate
                        </button>
                    </div>

                    <textarea 
                        value={systemInstruction}
                        onChange={(e) => setSystemInstruction(e.target.value)}
                        placeholder="You are..."
                        className="w-full h-40 bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-sm text-zinc-300 focus:outline-none focus:border-indigo-500 transition-colors resize-none font-mono"
                    />
                </div>
                <div className="space-y-2">
                     <label className="text-sm font-medium text-zinc-400">Features (Comma separated tags)</label>
                     <input 
                        value={featuresInput}
                        onChange={(e) => setFeaturesInput(e.target.value)}
                        placeholder="e.g., Code Review, Debugging, Quick Tips"
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                </div>
              </motion.div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-zinc-800 bg-zinc-900/50 flex justify-between items-center">
            {step === 2 ? (
                <button 
                    onClick={() => setStep(1)}
                    className="text-zinc-400 hover:text-white flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg hover:bg-zinc-800 transition-colors"
                >
                    <ArrowLeft size={16} /> Back
                </button>
            ) : (
                <div /> /* Spacer */
            )}

            {step === 1 ? (
                <button 
                    onClick={() => setStep(2)}
                    disabled={!name.trim()}
                    className="bg-white hover:bg-zinc-200 text-black px-6 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Next Step <ArrowRight size={16} />
                </button>
            ) : (
                <button 
                    onClick={handleSave}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 shadow-lg shadow-indigo-500/20 transition-all transform hover:scale-105"
                >
                    Create Agent <Bot size={18} />
                </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};