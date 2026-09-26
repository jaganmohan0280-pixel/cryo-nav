import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Bell,
  RefreshCw,
  Compass,
  AlertTriangle,
  Clock,
  ExternalLink,
  CheckCircle2,
  X,
} from 'lucide-react';

export const Header: React.FC = () => {
  const {
    mission,
    recommendedRoute,
    gpsTracking,
    connectionState,
    setConnectionState,
    alerts,
    acknowledgeAlert,
    dismissAlert,
    replanRoutes,
    setActiveView,
  } = useApp();

  const [showAlertsMenu, setShowAlertsMenu] = useState(false);
  const unreadAlerts = (alerts || []).filter((a) => !a.acknowledged);

  return (
    <header className="h-13 bg-white border-b border-slate-200 flex items-center justify-between px-4 z-20 shrink-0 shadow-xs">
      {/* Left: Mission & Vessel Info */}
      <div className="flex items-center gap-4">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs text-slate-900 truncate max-w-[280px]">
              {mission.title}
            </span>
            <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-semibold">
              {mission.missionType}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono mt-0.5">
            <span>To: {mission.destination.name.split('(')[0]}</span>
            <span>•</span>
            <span>ETA: {recommendedRoute ? `${recommendedRoute.etaHours}h` : '--'}</span>
            <span>•</span>
            <span className="text-emerald-700 font-bold bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200/80">
              REC: {recommendedRoute ? recommendedRoute.type : 'CALCULATING'}
            </span>
          </div>
        </div>
      </div>

      {/* Center: Realtime Telemetry Bar */}
      <div className="hidden md:flex items-center gap-4 px-3 py-1 rounded bg-slate-50 border border-slate-200 font-mono text-[11px] text-slate-700">
        <div className="flex items-center gap-1.5 text-slate-600">
          <Compass className="w-3.5 h-3.5 text-slate-700" />
          <span>POS:</span>
          <span className="text-slate-900 font-bold">
            {Math.abs(gpsTracking.currentLat).toFixed(2)}°S, {Math.abs(gpsTracking.currentLon).toFixed(2)}°W
          </span>
        </div>
        <div className="h-3 w-px bg-slate-200" />
        <div className="flex items-center gap-1 text-slate-600">
          <span>HDG:</span>
          <span className="text-blue-700 font-bold">{gpsTracking.headingDeg}°</span>
        </div>
        <div className="h-3 w-px bg-slate-200" />
        <div className="flex items-center gap-1 text-slate-600">
          <span>SPD:</span>
          <span className="text-emerald-700 font-bold">{gpsTracking.speedKnots} kts</span>
        </div>
        <div className="h-3 w-px bg-slate-200" />
        <div className="flex items-center gap-1 text-slate-500">
          <Clock className="w-3 h-3 text-slate-400" />
          <span>FRESH (38m)</span>
        </div>
      </div>

      {/* Right: Actions & Connection Modes */}
      <div className="flex items-center gap-2.5">
        {/* Dynamic Replanning Button */}
        <button
          onClick={replanRoutes}
          title="Recalculate dynamic route alternatives against updated environmental state"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-600" />
          <span className="hidden sm:inline">Replan</span>
        </button>

        {/* Offline / Online Connection Toggle */}
        <div className="flex items-center rounded bg-slate-100 p-0.5 border border-slate-200">
          <button
            onClick={() => setConnectionState('ONLINE')}
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition ${
              connectionState === 'ONLINE'
                ? 'bg-white text-emerald-800 border border-emerald-300 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            ONLINE
          </button>
          <button
            onClick={() => setConnectionState('LIMITED')}
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition ${
              connectionState === 'LIMITED'
                ? 'bg-white text-amber-800 border border-amber-300 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            LIMITED
          </button>
          <button
            onClick={() => setConnectionState('OFFLINE')}
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition ${
              connectionState === 'OFFLINE'
                ? 'bg-white text-red-800 border border-red-300 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            OFFLINE
          </button>
        </div>

        {/* Alert Center Button */}
        <div className="relative">
          <button
            onClick={() => setShowAlertsMenu(!showAlertsMenu)}
            className="relative p-1.5 rounded bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 transition"
          >
            <Bell className="w-4 h-4" />
            {unreadAlerts.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[9px] font-bold text-white shadow-xs">
                {unreadAlerts.length}
              </span>
            )}
          </button>

          {/* Alerts Dropdown Drawer */}
          {showAlertsMenu && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-md bg-white border border-slate-200 shadow-lg z-50 overflow-hidden">
              <div className="p-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-bold text-slate-900">Operational Alerts</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 font-mono font-semibold">
                    {alerts.length}
                  </span>
                </div>
                <button
                  onClick={() => setShowAlertsMenu(false)}
                  className="text-slate-400 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 p-1">
                {alerts.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500">
                    No active navigation alerts.
                  </div>
                ) : (
                  alerts.map((a) => (
                    <div
                      key={a.id}
                      className={`p-3 text-xs space-y-1 transition ${
                        a.acknowledged ? 'opacity-60 bg-slate-50/50' : 'bg-slate-50/80'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 font-semibold">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              a.severity === 'CRITICAL'
                                ? 'bg-red-600'
                                : a.severity === 'HIGH'
                                ? 'bg-orange-600'
                                : a.severity === 'WARNING'
                                ? 'bg-amber-500'
                                : 'bg-blue-600'
                            }`}
                          />
                          <span className="text-slate-900">{a.title}</span>
                        </div>
                        <span className="text-[9px] text-slate-500 font-mono shrink-0">
                          {new Date(a.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">{a.message}</p>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[9px] font-mono uppercase text-slate-500">
                          {a.type.replace(/_/g, ' ')}
                        </span>
                        <div className="flex items-center gap-2">
                          {!a.acknowledged && (
                            <button
                              onClick={() => acknowledgeAlert(a.id)}
                              className="text-[10px] text-blue-700 hover:underline flex items-center gap-1 font-semibold"
                            >
                              <CheckCircle2 className="w-3 h-3" /> Ack
                            </button>
                          )}
                          <button
                            onClick={() => dismissAlert(a.id)}
                            className="text-[10px] text-slate-400 hover:text-red-600 font-medium"
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-2 border-t border-slate-200 bg-slate-50 text-center">
                <button
                  onClick={() => {
                    setShowAlertsMenu(false);
                    setActiveView('navigation');
                  }}
                  className="text-[11px] text-blue-700 font-semibold hover:underline flex items-center justify-center gap-1 w-full"
                >
                  <span>Open Navigation & Telemetry View</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

