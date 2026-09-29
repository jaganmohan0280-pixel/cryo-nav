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
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-[#F3F0E8]">
      <Header />
      <main className="flex-1 overflow-hidden relative flex flex-col">
        {renderActiveView()}
      </main>
    </div>
  );
};

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('CRYO NAV Runtime Render Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#F3F0E8] p-6 text-[#263238] font-sans">
          <div className="max-w-lg w-full bg-white rounded-xl shadow-lg border border-[#DCE7E7] p-6 space-y-4">
            <div className="flex items-center gap-3 border-b border-[#E2EBEB] pb-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold text-xl">
                ⚠
              </div>
              <div>
                <h1 className="font-bold text-lg text-[#075563]">CRYO NAV — System Safeguard</h1>
                <p className="text-xs text-slate-500">React Operational Error Protection</p>
              </div>
            </div>

            <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-3 font-mono overflow-auto max-h-48">
              <strong>Error Message:</strong> {this.state.error?.message || 'An unexpected rendering error occurred.'}
              {this.state.error?.stack && (
                <pre className="mt-2 text-[10px] text-slate-600 whitespace-pre-wrap">
                  {this.state.error.stack}
                </pre>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.reload();
                }}
                className="flex-1 bg-[#075563] hover:bg-[#096879] text-white font-semibold text-xs py-2.5 px-4 rounded-lg transition"
              >
                Reload CRYO NAV System
              </button>
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="bg-[#E8F8F6] hover:bg-[#d0f2ee] text-[#075563] font-semibold text-xs py-2.5 px-4 rounded-lg border border-[#DCE7E7] transition"
              >
                Retry Component Render
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <div className="flex h-screen w-screen overflow-hidden bg-[#F3F0E8] text-[#263238] font-sans select-none">
          <Sidebar />
          <MainContent />
        </div>
      </AppProvider>
    </ErrorBoundary>
  );
}

