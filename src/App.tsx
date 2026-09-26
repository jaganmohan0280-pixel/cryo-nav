/**
 * CRYO NAV — Master Operational Application Container
 * AI-Enabled Antarctic Sea-Ice, Iceberg Trajectory, and Navigation Decision Support System
 */

import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './views/DashboardView';
import { MissionPlanningView } from './views/MissionPlanningView';
import { NavigationView } from './views/NavigationView';
import { IcebergsView } from './views/IcebergsView';
import { SeaIceView } from './views/SeaIceView';
import { DataAcquisitionView } from './views/DataAcquisitionView';
import { AiAssistantView } from './views/AiAssistantView';
import { SettingsView } from './views/SettingsView';
import { ResearchReferencesView } from './views/ResearchReferencesView';

const MainContent: React.FC = () => {
  const { activeView } = useApp();

  const renderActiveView = () => {
    switch (activeView) {
      case 'mission':
        return <MissionPlanningView />;
      case 'navigation':
        return <NavigationView />;
      case 'icebergs':
        return <IcebergsView />;
      case 'seaice':
        return <SeaIceView />;
      case 'acquisition':
        return <DataAcquisitionView />;
      case 'ai':
        return <AiAssistantView />;
      case 'references':
        return <ResearchReferencesView />;
      case 'settings':
        return <SettingsView />;
      case 'dashboard':
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50">
      <Header />
      <main className="flex-1 overflow-hidden relative flex flex-col">
        {renderActiveView()}
      </main>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-900 font-sans select-none">
        <Sidebar />
        <MainContent />
      </div>
    </AppProvider>
  );
}
