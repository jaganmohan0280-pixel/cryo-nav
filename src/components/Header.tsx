import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Bell,
  AlertTriangle,
  ExternalLink,
  CheckCircle2,
  X,
  Radio,
  Wifi,
  WifiOff,
} from 'lucide-react';

export const Header: React.FC = () => {
  const {
    activeView,
    connectionState,
    setConnectionState,
    alerts,
    acknowledgeAlert,
    dismissAlert,
    setActiveView,
  } = useApp();

  const [showAlertsMenu, setShowAlertsMenu] = useState(false);
  const [showConnMenu, setShowConnMenu] = useState(false);

  const unreadAlerts = (alerts || []).filter((a) => !a.acknowledged);

  const viewTitles: Record<string, string> = {
    dashboard: 'Mission Dashboard',
    mission: 'Mission Planning',
    navigation: 'Navigation & Telemetry',
    icebergs: 'Iceberg Trajectories',
    seaice: 'Sea-Ice Forecast',
    acquisition: 'Data Acquisition Engine',
    ai: 'AI Navigation Assistant',
    settings: 'Settings & Fleet',
    references: 'Research & References',
  };

  const pageTitle = viewTitles[activeView] || 'Navigation Workspace';

  return (
    <header className="h-14 bg-white border-b border-[#E2EBEB] flex items-center justify-between px-5 z-20 shrink-0 select-none font-sans">
      {/* Left: Product Name */}
      <div className="flex items-center gap-3">
        <span className="font-bold text-[15px] text-[#075563] tracking-tight">
          CRYO NAV
        </span>
        <span className="hidden sm:inline-block text-[13px] text-[#63777B] border-l border-[#E2EBEB] pl-3 font-normal">
          Polar Navigation Support
        </span>
      </div>

      {/* Center: Current Page Name */}
      <div className="text-[15px] font-semibold text-[#18343A]">
        {pageTitle}
      </div>

      {/* Right: Connection Status & Notifications */}
      <div className="flex items-center gap-3">
        {/* Connection Status Popover Toggle */}
        <div className="relative">
          <button
            onClick={() => setShowConnMenu(!showConnMenu)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-[8px] border text-xs transition font-semibold ${
              connectionState === 'ONLINE'
                ? 'bg-[#E8F7F1] border-[#A9E2CF] text-[#3F705A]'
                : connectionState === 'LIMITED'
                ? 'bg-[#FFF7DE] border-[#F6D77A] text-[#8A6A22]'
                : 'bg-[#FDECEF] border-[#F29BA8] text-[#9A4F5B]'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                connectionState === 'ONLINE'
                  ? 'bg-[#3F705A]'
                  : connectionState === 'LIMITED'
                  ? 'bg-[#8A6A22]'
                  : 'bg-[#9A4F5B]'
              }`}
            />
            <span className="font-semibold hidden sm:inline">
              {connectionState === 'ONLINE' ? 'Online' : connectionState === 'LIMITED' ? 'Limited' : 'Offline'}
            </span>
          </button>

          {showConnMenu && (
            <div className="absolute right-0 mt-2 w-52 rounded-[12px] bg-white border border-[#DCE7E7] shadow-lg z-50 p-2 space-y-1 text-xs font-sans">
              <div className="px-2 py-1 text-[10px] font-semibold text-[#8B9A9D] uppercase tracking-wider">
                Satellite Uplink Status
              </div>
              <button
                onClick={() => {
                  setConnectionState('ONLINE');
                  setShowConnMenu(false);
                }}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[6px] text-left transition ${
                  connectionState === 'ONLINE'
                    ? 'bg-[#E8F7F1] text-[#3F705A] font-semibold'
                    : 'text-[#63777B] hover:bg-[#E8F8F6]'
                }`}
              >
                <Wifi className="w-3.5 h-3.5 text-[#3F705A]" />
                <span>ONLINE (Iridium)</span>
              </button>
              <button
                onClick={() => {
                  setConnectionState('LIMITED');
                  setShowConnMenu(false);
                }}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[6px] text-left transition ${
                  connectionState === 'LIMITED'
                    ? 'bg-[#FFF7DE] text-[#8A6A22] font-semibold'
                    : 'text-[#63777B] hover:bg-[#E8F8F6]'
                }`}
              >
                <Radio className="w-3.5 h-3.5 text-[#8A6A22]" />
                <span>LIMITED BANDWIDTH</span>
              </button>
              <button
                onClick={() => {
                  setConnectionState('OFFLINE');
                  setShowConnMenu(false);
                }}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[6px] text-left transition ${
                  connectionState === 'OFFLINE'
                    ? 'bg-[#FDECEF] text-[#9A4F5B] font-semibold'
                    : 'text-[#63777B] hover:bg-[#E8F8F6]'
                }`}
              >
                <WifiOff className="w-3.5 h-3.5 text-[#9A4F5B]" />
                <span>OFFLINE (Cached)</span>
              </button>
            </div>
          )}
        </div>

        {/* Notifications Drawer Toggle */}
        <div className="relative">
          <button
            onClick={() => setShowAlertsMenu(!showAlertsMenu)}
            className="relative p-2 rounded-[8px] bg-white hover:bg-[#E8F8F6] border border-[#DCE7E7] text-[#075563] transition shadow-xs"
            title="Operational Alerts"
          >
            <Bell className="w-4 h-4 text-[#075563]" />
            {unreadAlerts.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#F29BA8] text-[9px] font-bold text-white shadow-xs">
                {unreadAlerts.length}
              </span>
            )}
          </button>

          {/* Alerts Drawer */}
          {showAlertsMenu && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-[12px] bg-white border border-[#DCE7E7] shadow-lg z-50 overflow-hidden font-sans">
              <div className="p-3.5 border-b border-[#DCE7E7] flex items-center justify-between bg-[#E8F8F6]">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-[#8A6A22]" />
                  <span className="text-xs font-bold text-[#075563]">Operational Alerts</span>
                  <span className="text-[10px] px-2 py-0.3 rounded-[4px] bg-white text-[#075563] font-semibold border border-[#DCE7E7]">
                    {alerts.length}
                  </span>
                </div>
                <button
                  onClick={() => setShowAlertsMenu(false)}
                  className="text-[#8B9A9D] hover:text-[#18343A]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-[#E2EBEB] p-1">
                {alerts.length === 0 ? (
                  <div className="p-4 text-center text-xs text-[#63777B]">
                    No active navigation alerts.
                  </div>
                ) : (
                  alerts.map((a) => (
                    <div
                      key={a.id}
                      className={`p-3 text-xs space-y-1 transition ${
                        a.acknowledged ? 'opacity-60 bg-[#F5F7F7]' : 'bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 font-semibold">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              a.severity === 'CRITICAL'
                                ? 'bg-[#F29BA8]'
                                : a.severity === 'HIGH'
                                ? 'bg-[#F6D77A]'
                                : a.severity === 'WARNING'
                                ? 'bg-[#F6D77A]'
                                : 'bg-[#9CC8F0]'
                            }`}
                          />
                          <span className="text-[#18343A] font-semibold">{a.title}</span>
                        </div>
                        <span className="text-[10px] text-[#8B9A9D] shrink-0">
                          {new Date(a.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#63777B] leading-relaxed">{a.message}</p>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] uppercase text-[#8B9A9D]">
                          {a.type.replace(/_/g, ' ')}
                        </span>
                        <div className="flex items-center gap-2">
                          {!a.acknowledged && (
                            <button
                              onClick={() => acknowledgeAlert(a.id)}
                              className="text-[10px] text-[#2BB9BD] hover:underline flex items-center gap-1 font-semibold"
                            >
                              <CheckCircle2 className="w-3 h-3 text-[#3F705A]" /> Ack
                            </button>
                          )}
                          <button
                            onClick={() => dismissAlert(a.id)}
                            className="text-[10px] text-[#8B9A9D] hover:text-[#9A4F5B] font-semibold"
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-2.5 border-t border-[#DCE7E7] bg-[#E8F8F6] text-center">
                <button
                  onClick={() => {
                    setShowAlertsMenu(false);
                    setActiveView('navigation');
                  }}
                  className="text-[11px] text-[#075563] font-semibold hover:underline flex items-center justify-center gap-1 w-full"
                >
                  <span>Open Navigation & Telemetry View</span>
                  <ExternalLink className="w-3 h-3 text-[#2BB9BD]" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

