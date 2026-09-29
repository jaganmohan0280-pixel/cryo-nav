import React, { useState } from 'react';
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
  BookOpen,
  ChevronRight,
  Ship,
  Info,
  X,
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
    mission,
    selectedVessel,
    decisionChangeStatus,
  } = useApp();

  const [showVesselModal, setShowVesselModal] = useState(false);

  const navSections: NavSection[] = [
    {
      title: 'WORKSPACE',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: Compass },
        { id: 'mission', label: 'Mission Planning', icon: MapPin },
        { id: 'navigation', label: 'Navigation', icon: Navigation },
      ],
    },
    {
      title: 'ENVIRONMENT',
      items: [
        { id: 'seaice', label: 'Sea Ice', icon: Layers },
        { id: 'icebergs', label: 'Icebergs', icon: Activity },
      ],
    },
    {
      title: 'ANALYSIS',
      items: [
        {
          id: 'acquisition',
          label: 'Data Acquisition',
          icon: Radio,
          badge: decisionChangeStatus?.changed ? 'Updated' : undefined,
        },
        { id: 'ai', label: 'Decision Support', icon: Bot },
      ],
    },
    {
      title: 'SYSTEM',
      items: [
        { id: 'references', label: 'Research & References', icon: BookOpen },
        { id: 'settings', label: 'Settings', icon: Settings },
      ],
    },
  ];

  return (
    <aside className="w-56 bg-[#075563] text-white flex flex-col h-screen shrink-0 select-none z-30 font-sans shadow-md">
      {/* Brand Header */}
      <div className="px-4 py-4 border-b border-[#0B6470]/60 flex items-center gap-3">
        <div className="w-8 h-8 rounded-[8px] bg-[#2BB9BD] flex items-center justify-center text-white shadow-sm">
          <Compass className="w-5 h-5 text-white" />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-[16px] text-white tracking-tight leading-tight">
            CRYO NAV
          </span>
          <span className="text-[11px] text-[#B9D7D8] font-normal leading-tight">
            Polar Navigation Support
          </span>
        </div>
      </div>

      {/* Compact Mission Context Indicator */}
      <div className="p-3 mx-3 my-3 rounded-[10px] bg-[#0B6470]/70 border border-[#2BB9BD]/30 space-y-1.5 shadow-xs">
        <div className="flex items-center justify-between text-[11px] font-medium text-[#B9D7D8]">
          <span>Current Mission</span>
          <button
            onClick={() => setShowVesselModal(!showVesselModal)}
            className="text-[#2BB9BD] hover:text-white hover:underline flex items-center gap-0.5 text-[11px] font-medium transition"
            title="Inspect vessel and voyage parameters"
          >
            <Info className="w-3 h-3 text-[#2BB9BD]" />
            <span>Details</span>
          </button>
        </div>
        <div className="text-xs font-bold text-white truncate">
          {mission.startLocation.name.split('(')[0]} → {mission.destination.name.split('(')[0]}
        </div>
        <div className="text-[12px] text-[#D8F3F1] flex items-center gap-1.5 truncate">
          <Ship className="w-3.5 h-3.5 text-[#2BB9BD] shrink-0" />
          <span className="truncate">{selectedVessel.name}</span>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
        {navSections.map((section) => (
          <div key={section.title} className="space-y-1">
            <div className="px-2 text-[11px] font-semibold text-[#9FC6C8] uppercase tracking-wider mb-1">
              {section.title}
            </div>
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveView(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-[8px] transition-all duration-150 text-xs font-semibold ${
                    isActive
                      ? 'bg-[#2BB9BD] text-white shadow-sm'
                      : 'text-[#E8F8F6] hover:text-white hover:bg-[#0B6470]/50 font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? 'text-white' : 'text-[#B9D7D8]'
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </div>

                  {item.badge && (
                    <span className="text-[10px] font-bold px-1.5 py-0.3 rounded-[4px] bg-[#FFF7DE] text-[#8A6A22]">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer Details Modal */}
      {showVesselModal && (
        <div className="fixed inset-0 bg-[#18343A]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#DCE7E7] rounded-[12px] max-w-sm w-full p-5 space-y-3.5 shadow-lg font-sans text-xs text-[#18343A]">
            <div className="flex items-center justify-between border-b border-[#DCE7E7] pb-2.5">
              <span className="font-semibold text-sm text-[#075563]">
                Vessel & Voyage Parameters
              </span>
              <button
                onClick={() => setShowVesselModal(false)}
                className="text-[#8B9A9D] hover:text-[#18343A]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-[#63777B]">
              <div className="flex justify-between">
                <span>Vessel Name:</span>
                <strong className="text-[#18343A]">{selectedVessel.name}</strong>
              </div>
              <div className="flex justify-between">
                <span>Polar Rating:</span>
                <strong className="text-[#075563] font-semibold">{selectedVessel.iceClass}</strong>
              </div>
              <div className="flex justify-between">
                <span>Max Sea-Ice Rating:</span>
                <strong className="text-[#18343A]">{selectedVessel.maxSeaIceConcentrationPercent}%</strong>
              </div>
              <div className="flex justify-between">
                <span>Cruising Speed:</span>
                <strong className="text-[#18343A]">{selectedVessel.cruisingSpeedKnots} knots</strong>
              </div>
              <div className="flex justify-between">
                <span>Fuel Consumption:</span>
                <strong className="text-[#18343A]">{selectedVessel.fuelConsumptionTonsPerDay} t/day</strong>
              </div>
            </div>

            <div className="pt-2 border-t border-[#DCE7E7] text-right">
              <button
                onClick={() => {
                  setShowVesselModal(false);
                  setActiveView('settings');
                }}
                className="px-3.5 py-1.5 rounded-[8px] bg-[#2BB9BD] hover:bg-[#22A8AC] text-white font-semibold text-xs inline-flex items-center gap-1 transition shadow-xs"
              >
                <span>Manage Fleet</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* System Footer */}
      <div className="px-4 py-3 border-t border-[#0B6470]/60 bg-[#075563] text-[11px] text-[#B9D7D8] flex items-center justify-between">
        <span>Sector: Peninsula</span>
        <span className="text-[#9FC6C8] font-mono">v1.0</span>
      </div>
    </aside>
  );
};

