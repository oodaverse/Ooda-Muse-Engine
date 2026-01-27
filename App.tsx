import React, { useState, useEffect } from 'react';
import { Home, Users, BookOpen, Settings as SettingsIcon } from 'lucide-react';
import { Dashboard } from './components/Dashboard';
import { CharacterGallery } from './components/CharacterGallery';
import { CharacterChat } from './components/CharacterChat';
import { LoreWorld } from './components/LoreWorld';
import { Settings } from './components/Settings';
import { SharedProfile } from './components/SharedProfile';
import { ViewType } from './types';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewType>(ViewType.Dashboard);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | undefined>();
  const [selectedNodeId, setSelectedNodeId] = useState<string | undefined>();
  const [sharedProfileData, setSharedProfileData] = useState<string | null>(null);
  const [sharedProfileCharacterId, setSharedProfileCharacterId] = useState<string | null>(null);

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

  return (
    <div className="flex flex-col h-screen bg-black text-white overflow-hidden">
      {/* Main Content */}
      <div className={`flex-1 flex flex-col overflow-hidden ${currentView !== ViewType.SharedProfile ? 'pb-20' : ''}`}>
        {renderView()}
      </div>

      {/* Bottom Navigation Bar - Hidden for shared profiles */}
      {currentView !== ViewType.SharedProfile && (
      <div className="fixed bottom-0 left-0 right-0 h-20 bg-black/40 backdrop-blur-xl border-t border-slate-700/50 z-50">
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
  onClick: () => void;
  label: string;
}

const NavButton: React.FC<NavButtonProps> = ({ icon, active, onClick, label }) => {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-xl transition-all ${
        active
          ? 'text-cyan-400'
          : 'text-slate-400 hover:text-cyan-300'
      }`}
    >
      <div className={`p-2 rounded-lg transition-all ${
        active
          ? 'bg-cyan-500/20 shadow-lg shadow-cyan-500/20'
          : 'hover:bg-slate-700/30'
      }`}>
        {icon}
      </div>
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
};

export default App;
