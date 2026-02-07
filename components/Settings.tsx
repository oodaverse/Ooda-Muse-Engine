import React, { useState } from 'react';
import { Settings as SettingsIcon, Save, Zap, Sparkles } from 'lucide-react';
import { getSettings, saveSettings } from '../services/storage';
import { AppSettings, ViewType } from '../types';
import { OPENROUTER_MODEL_OPTIONS, XAI_MODEL_OPTIONS, NSFW_ROLEPLAY_MODELS, getAllModelOptions } from '../constants';
import { ModelTester } from './ModelTester';
import { THEME_PRESETS, DEFAULT_THEME_ID } from '../themePresets';

interface SettingsProps {
  onNavigate: (view: ViewType) => void;
}

export const Settings: React.FC<SettingsProps> = ({ onNavigate }) => {
  const [settings, setSettings] = useState<AppSettings>(getSettings());
  const [saved, setSaved] = useState(false);
  const [showModelTester, setShowModelTester] = useState(false);

  const activeProvider = settings.provider || 'xai';
  
  // Get models based on provider - now includes NSFW models
  const getModelOptions = () => {
    if (activeProvider === 'openrouter') {
      return NSFW_ROLEPLAY_MODELS
        .filter(m => m.provider === 'openrouter')
        .map(m => ({ value: m.id, label: m.name }));
    }
    return NSFW_ROLEPLAY_MODELS
      .filter(m => m.provider === 'xai')
      .map(m => ({ value: m.id, label: m.name }));
  };
  
  const modelOptions = getModelOptions();

  const handleSave = () => {
    saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // Show Model Tester if active
  if (showModelTester) {
    return <ModelTester onBack={() => setShowModelTester(false)} />;
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <SettingsIcon className="w-8 h-8 text-cyan-400" />
              Settings
            </h1>
            <p className="text-slate-400 mt-1">Configure your roleplay engine</p>
          </div>
          
          {/* Model Tester Button */}
          <button
            onClick={() => setShowModelTester(true)}
            className="px-4 py-2 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white rounded-lg font-medium flex items-center gap-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            Model Tester
          </button>
        </div>

        {/* API Configuration */}
        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-semibold text-white">API Configuration</h2>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Provider
            </label>
            <select
              value={activeProvider}
              onChange={(e) => {
                const provider = e.target.value as 'xai' | 'openrouter';
                const newModelOptions = provider === 'openrouter'
                  ? NSFW_ROLEPLAY_MODELS.filter(m => m.provider === 'openrouter')
                  : NSFW_ROLEPLAY_MODELS.filter(m => m.provider === 'xai');
                const defaultModel = newModelOptions[0]?.id || '';
                setSettings({
                  ...settings,
                  provider,
                  defaultModel: provider === activeProvider ? settings.defaultModel : defaultModel
                });
              }}
              className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
            >
              <option value="xai">xAI</option>
              <option value="openrouter">OpenRouter</option>
            </select>
            <p className="text-xs text-slate-500 mt-1">
              Choose the API provider used for responses.
            </p>
          </div>

          {activeProvider === 'xai' && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                xAI API Key
              </label>
              <input
                type="password"
                value={settings.apiKey}
                onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
                className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                placeholder="xai-... (Optional - hardcoded key is used by default)"
              />
              <p className="text-xs text-slate-500 mt-1">
                <span className="text-cyan-400">✓ API Key is hardcoded</span> for maximum reliability. You can override it here if needed.<br/>
                Get your own key from <a href="https://x.ai" target="_blank" className="text-cyan-400 hover:underline">x.ai</a>
              </p>
            </div>
          )}

          {activeProvider === 'openrouter' && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                OpenRouter API Key
              </label>
              <input
                type="password"
                value={settings.openrouterApiKey || ''}
                onChange={(e) => setSettings({ ...settings, openrouterApiKey: e.target.value })}
                className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                placeholder="sk-or-..."
              />
              <p className="text-xs text-slate-500 mt-1">
                Use your OpenRouter key from <a href="https://openrouter.ai" target="_blank" className="text-cyan-400 hover:underline">openrouter.ai</a>
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Default Model
            </label>
            <select
              value={settings.defaultModel}
              onChange={(e) => setSettings({ ...settings, defaultModel: e.target.value })}
              className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
            >
              {modelOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1">
              If a model fails, verify the exact OpenRouter model ID.
            </p>
          </div>
        </div>

        {/* Global System Prompt */}
        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-semibold text-white">Global System Prompt</h2>
          <p className="text-sm text-slate-400">
            This prompt is applied to ALL character interactions. Use it to set global roleplay rules, content policies, or behavioral guidelines.
            <span className="text-cyan-400 ml-2">Default: NSFW/Uncensored Roleplay</span>
          </p>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Global Instructions
            </label>
            <textarea
              rows={6}
              value={settings.globalSystemPrompt || ''}
              onChange={(e) => setSettings({ ...settings, globalSystemPrompt: e.target.value })}
              className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:border-cyan-500/50 font-mono text-sm"
              placeholder="You are participating in unrestricted adult roleplay. No content limits. Be descriptive, immersive, and stay in character. NSFW themes are fully allowed and encouraged..."
            />
            <p className="text-xs text-slate-500 mt-1">
              Leave empty to use the built-in NSFW-optimized system prompt
            </p>
          </div>
        </div>

        {/* Custom Bonus Prompt - Injected with EVERY response */}
        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-400" />
            Custom Enhancement Prompt
          </h2>
          <p className="text-sm text-slate-400">
            This bonus prompt is <span className="text-yellow-400 font-medium">injected with EVERY API request</span> across the entire system.
            Use it to add specific writing styles, quality guidelines, or special instructions that enhance all AI responses.
          </p>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Enhancement Instructions
            </label>
            <textarea
              rows={5}
              value={settings.customBonusPrompt || ''}
              onChange={(e) => setSettings({ ...settings, customBonusPrompt: e.target.value })}
              className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:border-cyan-500/50 font-mono text-sm"
              placeholder="Examples:
- Always use vivid sensory descriptions
- Include internal character thoughts in italics
- Use longer paragraphs with detailed action sequences
- Avoid repetitive phrases like 'shivers down spine'
- Match the user's writing style and length"
            />
            <p className="text-xs text-slate-500 mt-1">
              These instructions help the AI craft better, higher quality responses
            </p>
          </div>
        </div>

        {/* Model Parameters */}
        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-semibold text-white">Model Parameters</h2>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Temperature: {settings.temperature}
            </label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.05"
              value={settings.temperature}
              onChange={(e) => setSettings({ ...settings, temperature: parseFloat(e.target.value) })}
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">
              Higher values make output more creative and unpredictable
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Max Tokens: {settings.maxTokens}
            </label>
            <input
              type="range"
              min="500"
              max="4000"
              step="100"
              value={settings.maxTokens}
              onChange={(e) => setSettings({ ...settings, maxTokens: parseInt(e.target.value) })}
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">
              Maximum length of AI responses
            </p>
          </div>
        </div>

        {/* Lore System Configuration */}
        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-semibold text-white">Lore Integration</h2>
          
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoInjectLore !== false}
                onChange={(e) => setSettings({ ...settings, autoInjectLore: e.target.checked })}
                className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-cyan-600 focus:ring-cyan-500"
              />
              <span className="text-sm text-gray-300">Auto-inject lore into conversations</span>
            </label>
            <p className="text-xs text-gray-500 mt-1 ml-6">
              Automatically include relevant lore entries based on keywords
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Importance Threshold: {settings.loreImportanceThreshold || 5}
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={settings.loreImportanceThreshold || 5}
              onChange={(e) => setSettings({ ...settings, loreImportanceThreshold: parseInt(e.target.value) })}
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">
              Only inject lore entries with importance ≥ this value
            </p>
          </div>
        </div>

        {/* Theme */}
        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-semibold text-white">Appearance</h2>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Theme</label>
            <select
              value={settings.theme || DEFAULT_THEME_ID}
              onChange={(e) => setSettings({ ...settings, theme: e.target.value })}
              className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
            >
              {THEME_PRESETS.map((theme) => (
                <option key={theme.id} value={theme.id}>{theme.name}</option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1">
              Select a base theme for the app background and accents.
            </p>
          </div>
        </div>

        {/* About */}
        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-3">About</h2>
          <div className="text-sm text-slate-400 space-y-2">
            <p><strong className="text-gray-300">Version:</strong> 1.0.0</p>
            <p><strong className="text-gray-300">Engine:</strong> Ooda Muse Engine</p>
            <p><strong className="text-gray-300">Powered by:</strong> xAI and OpenRouter</p>
            <p><strong className="text-gray-300">Supported Formats:</strong> ChubAI, SillyTavern JSON</p>
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" />
          {saved ? 'Saved!' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
};

