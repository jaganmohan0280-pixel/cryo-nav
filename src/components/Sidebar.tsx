import React from 'react';
import { useApp, ActiveView } from '../context/AppContext';
import {
  Compass,
  MapPin,
  Navigation,
  Activity,
  Layers,
  Radio,
  Bot,
  Settings,
  Wifi,
  WifiOff,
  BookOpen,
} from 'lucide-react';

interface NavItem {
  id: ActiveView;
  label: string;
  icon: React.FC<{ className?: string }>;
  badge?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export const Sidebar: React.FC = () => {
  const {
    activeView,
    setActiveView,
    connectionState,
    alerts,
    selectedVessel,
    decisionChangeStatus,
  } = useApp();

  const unreadAlerts = (alerts || []).filter((a) => !a.acknowledged).length;

  const navSections: NavSection[] = [
    {
      title: 'Navigation & Operations',
      items: [
        { id: 'dashboard', label: 'Mission Dashboard', icon: Compass },
        { id: 'mission', label: 'Mission Planning', icon: MapPin },
      ],
    },
    {
      title: 'Environmental & Hazard Models',
      items: [
        { id: 'icebergs', label: 'Iceberg Trajectories', icon: Activity },
        { id: 'seaice', label: 'Sea-Ice Forecast', icon: Layers },
      ],
    },
    {
      title: 'Unique Features',
      items: [
        { id: 'navigation', label: 'GPS & Telemetry', icon: Navigation },
        {
          id: 'acquisition',
          label: 'Data Acquisition Engine',
          icon: Radio,
          badge: decisionChangeStatus?.changed ? 'UPDATED' : undefined,
        },
        { id: 'ai', label: 'Nav AI Assistant', icon: Bot },
      ],
    },
    {
      title: 'System & Architecture',
      items: [
        { id: 'settings', label: 'Vessel Fleet & Settings', icon: Settings },
        { id: 'references', label: 'Research & References', icon: BookOpen },
      ],
    },
  ];

  return (
    <aside className="w-64 bg-slate-100 border-r border-slate-200 flex flex-col h-screen shrink-0 select-none z-30">
      {/* Brand Header */}
      <div className="p-3.5 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-slate-900 flex items-center justify-center text-white shadow-xs">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold tracking-tight text-sm text-slate-900">
              CRYO-NAV
            </div>
            <p className="text-[10px] text-slate-500 font-medium">
              Polar Decision Support System
            </p>
          </div>
        </div>
      </div>

      {/* Active Vessel Card */}
      <div className="px-3 py-2.5 mx-3 my-2.5 rounded bg-white border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between text-[10px] text-slate-500 mb-0.5">
          <span className="font-mono text-slate-500 uppercase font-semibold">Assigned Vessel</span>
          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            {selectedVessel.iceClass.split(' ')[0]} {selectedVessel.iceClass.split(' ')[1]}
          </span>
        </div>
        <p className="text-xs font-bold text-slate-900 truncate">{selectedVessel.name}</p>
        <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1 font-mono">
          <span>Max Ice: <strong className="text-slate-800">{selectedVessel.maxSeaIceConcentrationPercent}%</strong></span>
          <span>Cruise: <strong className="text-slate-800">{selectedVessel.cruisingSpeedKnots} kt</strong></span>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 overflow-y-auto px-2 py-1 space-y-3">
        {navSections.map((section) => (
          <div key={section.title} className="space-y-0.5">
            <div className="px-2.5 text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold mb-1">
              {section.title}
            </div>
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveView(item.id)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs transition-colors duration-150 ${
                    isActive
                      ? 'bg-slate-900 text-white font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon
                      className={`w-3.5 h-3.5 shrink-0 ${
                        isActive ? 'text-white' : 'text-slate-500'
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </div>

                  {item.badge && (
                    <span className="text-[8px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300">
                      {item.badge}
                    </span>
                  )}
                  {item.id === 'navigation' && unreadAlerts > 0 && (
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-red-600 text-white">
                      {unreadAlerts}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Connection & System Footer */}
      <div className="p-3 border-t border-slate-200 bg-white space-y-1">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            {connectionState === 'ONLINE' && (
              <span className="text-[10px] font-mono font-bold text-emerald-700 flex items-center gap-1.5">
                <Wifi className="w-3 h-3" /> ONLINE (IRIDIUM)
              </span>
            )}
            {connectionState === 'LIMITED' && (
              <span className="text-[10px] font-mono font-bold text-amber-700 flex items-center gap-1.5">
                <Radio className="w-3 h-3" /> LIMITED BANDWIDTH
              </span>
            )}
            {connectionState === 'OFFLINE' && (
              <span className="text-[10px] font-mono font-bold text-red-700 flex items-center gap-1.5">
                <WifiOff className="w-3 h-3" /> OFFLINE (CACHED)
              </span>
            )}
          </div>

          <span className="text-[10px] font-mono text-slate-400">v1.0.0</span>
        </div>

        <div className="text-[10px] font-mono text-slate-500 truncate">
          Sector: Antarctic Peninsula (-67.57°S, -68.13°W)
        </div>
      </div>
    </aside>
  );
};

