import React, { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, Plus, Check, X } from 'lucide-react';
import { Wand2, BookMarked, Lightbulb, ListChecks } from 'lucide-react';
import { Message, Role, Lorebook, ProposedLoreCard } from '../types';
import { getLorebooks, getLorebook, saveLoreEntry, generateId, getLoreEntries, saveLorebook } from '../services/storage';
import { chatWithLoreAI, parseLoreCards } from '../services/xaiService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface LoreAIBuilderProps {
  onEntrySaved?: () => void;
}

export const LoreAIBuilder: React.FC<LoreAIBuilderProps> = ({ onEntrySaved }) => {
  const [lorebooks, setLorebooks] = useState<Lorebook[]>(getLorebooks());
  const [selectedLorebookId, setSelectedLorebookId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [proposedCards, setProposedCards] = useState<ProposedLoreCard[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const quickPrompts = [
    'Draft three factions with goals and conflicts.',
    'Describe a capital city, its districts, and a signature landmark.',
    'Create a myth or legend that locals whisper about.',
    'Outline a cultural festival with rituals and foods.',
    'Generate plot hooks tied to current lore entries.'
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (selectedLorebookId) {
      const lorebook = getLorebook(selectedLorebookId);
      if (lorebook) {
        setMessages([{
          id: generateId(),
          role: Role.Assistant,
          content: `Hey, I’m LoreAI. I’ll brainstorm, draft, and organize cards for **${lorebook.name}**.

Tell me what you need. I can:
• Pitch ideas, then turn the best into cards
• Expand existing entries with richer detail
• Keep tone/genre consistent with current lore
• Build quick hooks, factions, locations, items, and characters

Start with a request, or tap a quick prompt below.`,
          timestamp: Date.now()
        }]);
      }
    }
  }, [selectedLorebookId]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading || !selectedLorebookId) return;

    const userMessage: Message = {
      id: generateId(),
      role: Role.User,
      content: input.trim(),
      timestamp: Date.now()
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    try {
      // Build context from existing lorebook
      const lorebook = getLorebook(selectedLorebookId);
      const loreEntries = getLoreEntries();
      let lorebookContext = '';
      
      if (lorebook) {
        const entries = loreEntries.filter(e => lorebook.entries.includes(e.id));
        if (entries.length > 0) {
          lorebookContext = `Existing entries:\n${entries.map(e => 
            `- ${e.name} (${e.category}): ${e.content.slice(0, 100)}...`
          ).join('\n')}`;
        }
      }

      const response = await chatWithLoreAI(updatedMessages, lorebookContext);

      const assistantMessage: Message = {
        id: generateId(),
        role: Role.Assistant,
        content: response,
        timestamp: Date.now()
      };

      setMessages([...updatedMessages, assistantMessage]);

      // Parse any lore cards from response
      const cards = parseLoreCards(response);
      if (cards.length > 0) {
        const newProposed = cards.map(card => ({
          ...card,
          id: generateId(),
          category: card.category as 'character' | 'location' | 'event' | 'item' | 'concept' | 'other'
        }));
        setProposedCards(prev => [...prev, ...newProposed]);
      }
    } catch (error) {
      console.error('Failed to chat with LoreAI:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Failed to get response from LoreAI. Please try again.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptCard = (card: ProposedLoreCard) => {
    if (!selectedLorebookId) return;

    const newEntry = {
      id: generateId(),
      name: card.name,
      content: card.content,
      keys: card.keys,
      category: card.category as any,
      importance: card.importance,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    saveLoreEntry(newEntry);

    const lorebook = getLorebook(selectedLorebookId);
    if (lorebook) {
      const updatedBook = {
        ...lorebook,
        entries: [...lorebook.entries, newEntry.id],
        updatedAt: Date.now()
      };
      saveLorebook(updatedBook);
      setLorebooks(getLorebooks());
    }

    setProposedCards(prev => prev.filter(c => c.id !== card.id));
    
    // Notify parent to refresh
    if (onEntrySaved) {
      onEntrySaved();
    }
  };

  const handleRejectCard = (cardId: string) => {
    setProposedCards(prev => prev.filter(c => c.id !== cardId));
  };

  return (
    <div className="h-full flex overflow-hidden">
      {/* Left Panel - Chat */}
      <div className="flex-1 flex flex-col h-full">
        <div className="bg-slate-900/50 backdrop-blur-xl border-b border-slate-700/50 p-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-cyan-400" />
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-white">LoreAI Builder</h2>
              <select
                value={selectedLorebookId}
                onChange={(e) => setSelectedLorebookId(e.target.value)}
                className="mt-2 w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500"
              >
                <option value="">Select a lorebook...</option>
                {lorebooks.map(book => (
                  <option key={book.id} value={book.id}>{book.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
          {messages.map(message => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.role === Role.User ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === Role.Assistant && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-600 to-blue-600 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
              )}
              <div
                className={`max-w-[70%] rounded-xl p-4 ${
                  message.role === Role.User
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white'
                    : 'bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 text-slate-100'
                }`}
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose prose-invert prose-sm max-w-none">
                  {message.content}
                </ReactMarkdown>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-600 to-blue-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-4">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-slate-700/50 p-4 bg-slate-900/50 backdrop-blur-xl flex-shrink-0">
          {selectedLorebookId && messages.length <= 1 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {quickPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => setInput(prompt)}
                  disabled={isLoading}
                  className="px-3 py-1.5 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 text-slate-300 text-xs rounded-lg transition-all disabled:opacity-50"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-2 items-end">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={selectedLorebookId ? "Describe what you want to create... (Shift+Enter for new line)" : "Select a lorebook first"}
              disabled={isLoading || !selectedLorebookId}
              rows={2}
              className="flex-1 px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 disabled:opacity-50 resize-none"
              style={{ minHeight: '48px', maxHeight: '120px' }}
            />
            <button
              onClick={handleSendMessage}
              disabled={isLoading || !input.trim() || !selectedLorebookId}
              className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-all flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Right Panel - Proposed Cards */}
      <div className="w-110 max-w-md bg-slate-900/50 backdrop-blur-xl border-l border-slate-700/50 overflow-y-auto hidden lg:block">
        <div className="p-4 border-b border-slate-700/50">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <BookMarked className="w-5 h-5 text-cyan-400" />
            Card Deck
          </h3>
          <p className="text-xs text-slate-400 mt-1">Accept to file into the selected lorebook.</p>
        </div>
        <div className="p-4 space-y-3">
          {proposedCards.length === 0 && (
            <div className="text-slate-400 text-sm bg-slate-800/50 border border-slate-700/50 rounded-xl p-3">
              Cards you create will appear here. Ask me to "make cards" or tap a quick prompt.
            </div>
          )}
          {proposedCards.map(card => (
            <div key={card.id} className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-4 shadow-lg">
              <div className="flex items-start justify-between mb-2 gap-2">
                <div>
                  <h4 className="font-semibold text-white leading-tight">{card.name}</h4>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    <span className="text-xs px-2 py-1 bg-cyan-600/20 text-cyan-300 rounded-lg">
                      {card.category}
                    </span>
                    <span className="text-xs px-2 py-1 bg-blue-600/20 text-blue-300 rounded-lg">
                      {card.importance}/10
                    </span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleAcceptCard(card)}
                    className="px-2 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs transition-all flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" />
                    Save
                  </button>
                  <button
                    onClick={() => handleRejectCard(card.id)}
                    className="px-2 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-xl text-xs transition-all"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">{card.content}</p>
              {card.keys.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {card.keys.map(key => (
                    <span key={key} className="text-xs px-2 py-1 bg-slate-700/50 text-slate-200 rounded-lg">
                      {key}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
