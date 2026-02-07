"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Home, Users, BookOpen, Settings as SettingsIcon, Sparkles } from 'lucide-react';
import { Dashboard } from './components/Dashboard';
import { CharacterGallery } from './components/CharacterGallery';
import { CharacterChat } from './components/CharacterChat';
import { LoreWorld } from './components/LoreWorld';
import { Settings } from './components/Settings';
import { SharedProfile } from './components/SharedProfile';
import { ViewType } from './types';
import { getSettings } from './services/storage';
import { getThemePreset } from './themePresets';
import logoUrl from './branding.jpg';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewType>(ViewType.Dashboard);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | undefined>();
  const [selectedNodeId, setSelectedNodeId] = useState<string | undefined>();
  const [sharedProfileData, setSharedProfileData] = useState<string | null>(null);
  const [sharedProfileCharacterId, setSharedProfileCharacterId] = useState<string | null>(null);
  const [themePreset, setThemePreset] = useState(() => getThemePreset(getSettings().theme));
  const [showSplash, setShowSplash] = useState(true);

  // Handle URL routes on mount
  useEffect(() => {
    const handleRoute = () => {
      const path = window.location.pathname;
      const params = new URLSearchParams(window.location.search);
      
      if (path.startsWith('/share/')) {
        const encodedData = params.get('data');
        const parts = path.split('/').filter(Boolean);
        const characterId = parts[1] || null;
        if (encodedData) {
          setSharedProfileData(encodedData);
        } else {
          setSharedProfileData(null);
        }
        setSharedProfileCharacterId(characterId);
        setCurrentView(ViewType.SharedProfile);
        return;
      }
    };

    handleRoute();
    window.addEventListener('popstate', handleRoute);
    return () => window.removeEventListener('popstate', handleRoute);
  }, []);

  useEffect(() => {
    const updateTheme = () => {
      setThemePreset(getThemePreset(getSettings().theme));
    };
    updateTheme();
    window.addEventListener('settings-updated', updateTheme);
    return () => window.removeEventListener('settings-updated', updateTheme);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setShowSplash(false);
    }, 3000);
    return () => window.clearTimeout(timer);
  }, []);

  const handleNavigate = (view: ViewType, id?: string) => {
    setCurrentView(view);
    if (view === ViewType.CharacterDetail || view === ViewType.Chat) {
      setSelectedCharacterId(id);
    } else {
      setSelectedCharacterId(undefined);
    }
    
    // Update URL without page reload
    if (view === ViewType.Dashboard) {
      window.history.pushState({}, '', '/');
    }
  };

  const renderView = () => {
    switch (currentView) {
      case ViewType.Dashboard:
        return <Dashboard onNavigate={handleNavigate} />;
      case ViewType.Characters:
        return <CharacterGallery onNavigate={handleNavigate} />;
      case ViewType.CharacterDetail:
        return selectedCharacterId ? (
          <CharacterChat 
            characterId={selectedCharacterId} 
            nodeId={selectedNodeId}
            onNavigate={handleNavigate} 
          />
        ) : (
          <CharacterGallery onNavigate={handleNavigate} />
        );
      case ViewType.LoreWorld:
        return <LoreWorld onNavigate={handleNavigate} />;
      case ViewType.Settings:
        return <Settings onNavigate={handleNavigate} />;
      case ViewType.SharedProfile:
        return sharedProfileData || sharedProfileCharacterId ? (
          <SharedProfile
            encodedData={sharedProfileData}
            characterId={sharedProfileCharacterId}
            onNavigate={handleNavigate}
          />
        ) : (
          <Dashboard onNavigate={handleNavigate} />
        );
      default:
        return <Dashboard onNavigate={handleNavigate} />;
    }
  };

  const appStyle = useMemo(() => {
    const isGradient = themePreset.colors.bg.includes('gradient');
    return {
      background: isGradient ? undefined : themePreset.colors.bg,
      backgroundImage: isGradient ? themePreset.colors.bg : undefined,
      color: themePreset.colors.text
    } as React.CSSProperties;
  }, [themePreset]);

  if (showSplash) {
    return (
      <div
        className="flex flex-col h-screen overflow-hidden items-center justify-center text-center"
        style={appStyle}
      >
        <div className="flex flex-col items-center gap-4 px-6">
          <img src={logoUrl} alt="Ooda Muse Engine logo" className="w-32 h-32 drop-shadow-2xl" />
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white tracking-wide">Ooda Muse Engine</h1>
            <p className="text-slate-300 mt-2">Launching your creative realm…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={appStyle}>
      {/* Main Content */}
      <div className={`flex-1 flex flex-col overflow-hidden ${currentView !== ViewType.SharedProfile ? 'pb-24' : ''}`}>
        {renderView()}
      </div>

      {/* Bottom Navigation Bar - Hidden for shared profiles */}
      {currentView !== ViewType.SharedProfile && (
      <div className="fixed bottom-0 left-0 right-0 h-24 neo-dock backdrop-blur-xl z-50">
        <div className="h-full max-w-7xl mx-auto px-4 flex items-center justify-around">
          <NavButton
            icon={<Home className="w-6 h-6" />}
            active={currentView === ViewType.Dashboard}
            onClick={() => handleNavigate(ViewType.Dashboard)}
            label="Dashboard"
          />
          <NavButton
            icon={<Users className="w-6 h-6" />}
            active={currentView === ViewType.Characters || currentView === ViewType.CharacterDetail}
            onClick={() => handleNavigate(ViewType.Characters)}
            label="Characters"
          />
          <NavButton
            icon={<BookOpen className="w-6 h-6" />}
            active={currentView === ViewType.LoreWorld}
            onClick={() => handleNavigate(ViewType.LoreWorld)}
            label="LoreWorld"
          />
          <NavButton
            icon={<Sparkles className="w-6 h-6" />}
            active={false}
            href="/oodaverse"
            label="OodaVerse"
          />
          <NavButton
            icon={<SettingsIcon className="w-6 h-6" />}
            active={currentView === ViewType.Settings}
            onClick={() => handleNavigate(ViewType.Settings)}
            label="Settings"
          />
        </div>
      </div>
      )}
    </div>
  );
};

interface NavButtonProps {
  icon: React.ReactNode;
  active: boolean;
  onClick?: () => void;
  href?: string;
  label: string;
}

const NavButton: React.FC<NavButtonProps> = ({ icon, active, onClick, href, label }) => {
  const baseClasses = `flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-2xl transition-all ${
    active ? 'text-cyan-300' : 'text-slate-300 hover:text-cyan-200'
  }`;

  const content = (
    <>
      <div
        className={`p-3 rounded-2xl transition-all neo-surface ${
          active ? 'shadow-glow' : 'hover:shadow-neon'
        }`}
      >
        {icon}
      </div>
      <span className="text-[11px] font-semibold uppercase tracking-[0.2em]">{label}</span>
    </>
  );

  if (href) {
    return (
      <a href={href} className={baseClasses}>
        {content}
      </a>
    );
  }

  return (
    <button onClick={onClick} className={baseClasses}>
      {content}
    </button>
  );
};

export default App;
