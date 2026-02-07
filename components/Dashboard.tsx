import React from 'react';
import { Sparkles, Users, BookOpen, Settings, Plus, MessageSquare } from 'lucide-react';
import { getCharacters, getNodes } from '../services/storage';
import { ViewType } from '../types';
import logoUrl from '../branding.jpg';

interface DashboardProps {
  onNavigate: (view: ViewType, id?: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const characters = getCharacters();
  const nodes = getNodes();

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-950 via-slate-900 to-black">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="text-center space-y-3 mb-8">
          <div className="flex items-center justify-center gap-3">
            <img src={logoUrl} alt="Ooda Muse Engine logo" className="w-12 h-12" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-slate-300 bg-clip-text text-transparent">
              Ooda Muse Engine
            </h1>
          </div>
          <p className="text-slate-400 text-lg">Your AI-Powered Roleplay Engine</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 shadow-lg shadow-cyan-500/5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-slate-400">Characters</h3>
              <Users className="w-5 h-5 text-cyan-400" />
            </div>
            <div className="text-3xl font-bold text-white">{characters.length}</div>
            <p className="text-xs text-slate-500 mt-1">Total characters created</p>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 shadow-lg shadow-blue-500/5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-slate-400">Conversations</h3>
              <MessageSquare className="w-5 h-5 text-blue-400" />
            </div>
            <div className="text-3xl font-bold text-white">{nodes.length}</div>
            <p className="text-xs text-slate-500 mt-1">Active chat sessions</p>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 shadow-lg shadow-slate-500/5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-slate-400">AI Model</h3>
              <Sparkles className="w-5 h-5 text-slate-300" />
            </div>
            <div className="text-xl font-bold text-white">Grok 4</div>
            <p className="text-xs text-slate-500 mt-1">Powered by xAI</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 shadow-lg">
          <h2 className="text-xl font-semibold mb-4 text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              onClick={() => onNavigate(ViewType.Characters)}
              className="flex items-center gap-3 p-4 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-xl transition-all text-left group"
            >
              <div className="p-2 bg-cyan-500/20 rounded-lg group-hover:scale-110 transition-transform">
                <Plus className="w-5 h-5 text-cyan-300" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Create Character</h3>
                <p className="text-sm text-slate-400">Build a new roleplay character</p>
              </div>
            </button>

            <button
              onClick={() => onNavigate(ViewType.LoreWorld)}
              className="flex items-center gap-3 p-4 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-xl transition-all text-left group"
            >
              <div className="p-2 bg-blue-500/20 rounded-lg group-hover:scale-110 transition-transform">
                <BookOpen className="w-5 h-5 text-blue-300" />
              </div>
              <div>
                <h3 className="font-semibold text-white">LoreBuilder</h3>
                <p className="text-sm text-gray-400">Manage worldbuilding lore</p>
              </div>
            </button>

            <button
              onClick={() => onNavigate(ViewType.Characters)}
              className="flex items-center gap-3 p-4 bg-pink-600/20 hover:bg-pink-600/30 border border-pink-500/50 rounded-lg transition-all text-left group"
            >
              <div className="p-2 bg-pink-600/30 rounded-lg group-hover:scale-110 transition-transform">
                <Users className="w-5 h-5 text-pink-300" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Browse Characters</h3>
                <p className="text-sm text-gray-400">View your character gallery</p>
              </div>
            </button>

            <button
              onClick={() => onNavigate(ViewType.Settings)}
              className="flex items-center gap-3 p-4 bg-gray-600/20 hover:bg-gray-600/30 border border-gray-500/50 rounded-lg transition-all text-left group"
            >
              <div className="p-2 bg-gray-600/30 rounded-lg group-hover:scale-110 transition-transform">
                <Settings className="w-5 h-5 text-gray-300" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Settings</h3>
                <p className="text-sm text-gray-400">Configure API and preferences</p>
              </div>
            </button>
          </div>
        </div>

        {/* Recent Characters */}
        {characters.length > 0 && (
          <div className="bg-gray-800/50 backdrop-blur border border-gray-700/50 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-400" />
              Recent Characters
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {characters.slice(0, 4).map(character => (
                <button
                  key={character.id}
                  onClick={() => onNavigate(ViewType.CharacterDetail, character.id)}
                  className="group relative aspect-square rounded-lg overflow-hidden border border-gray-700 hover:border-purple-500 transition-all"
                >
                  {character.avatar ? (
                    <img 
                      src={character.avatar} 
                      alt={character.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-600/30 to-blue-600/30 flex items-center justify-center">
                      <Users className="w-12 h-12 text-gray-400" />
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                    <p className="font-semibold text-white text-sm truncate">{character.name}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Getting Started */}
        {characters.length === 0 && (
          <div className="bg-gray-800/50 backdrop-blur border border-gray-700/50 rounded-lg p-8 text-center">
            <Sparkles className="w-16 h-16 mx-auto mb-4 text-purple-400" />
            <h2 className="text-2xl font-bold mb-2 text-white">Welcome to Ooda Muse Engine!</h2>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              Get started by creating your first character or importing existing ones from ChubAI or SillyTavern formats.
            </p>
            <button
              onClick={() => onNavigate(ViewType.Characters)}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors"
            >
              Create Your First Character
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
