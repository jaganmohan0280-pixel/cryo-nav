import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  buildVoyageState,
  VoyageState,
} from '../../services/voyageStateEngine';
import {
  Compass,
  Navigation,
  Play,
  Pause,
  RotateCcw,
  Activity,
  Clock,
  Wifi,
  ShieldCheck,
  MapPin,
  Anchor,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Info,
} from 'lucide-react';

export const VoyageStatePanel: React.FC = () => {
  const {
    selectedVessel,
    mission,
    routes,
    selectedRouteId,
    gpsTracking,
    startGpsSimulation,
    pauseGpsSimulation,
    resetGpsSimulation,
    environmentalMode,
    unifiedEnvironment,
    decisionConfidence,
  } = useApp();

  const activeRoute = routes.find((r) => r.id === selectedRouteId) || routes[0] || null;

  const voyageState: VoyageState = buildVoyageState({
    selectedVessel,
    mission,
    activeRoute,
    gpsTracking,
    connectivityState: 'ONLINE',
    unifiedEnvironment,
    decisionConfidence,
    environmentalMode,
  });

  const formatCoordinate = (lat: number, lon: number) => {
    const latDir = lat >= 0 ? 'N' : 'S';
    const lonDir = lon >= 0 ? 'E' : 'W';
    return `${Math.abs(lat).toFixed(3)}°${latDir}, ${Math.abs(lon).toFixed(3)}°${lonDir}`;
  };

  const formatEta = (isoString: string | null) => {
    if (!isoString) return 'UNAVAILABLE';
    try {
      const d = new Date(isoString);
      return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short',
      });
    } catch {
      return 'UNAVAILABLE';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'UNDERWAY':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50';
      case 'PAUSED':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/50';
      case 'READY':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50';
      case 'COMPLETED':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/50';
      default:
        return 'bg-slate-700 text-slate-300 border-slate-600';
    }
  };

  const getDataModeBadge = (mode: string) => {
    switch (mode) {
      case 'REAL':
        return 'bg-emerald-950 text-emerald-300 border-emerald-700';
      case 'HYBRID':
        return 'bg-sky-950 text-sky-300 border-sky-700';
      case 'SIMULATED':
        return 'bg-amber-950 text-amber-300 border-amber-700';
      default:
        return 'bg-slate-900 text-slate-400 border-slate-800';
    }
  };

  return (
    <div className="bg-slate-900 text-white rounded-lg border border-slate-800 p-4 font-mono shadow-xl space-y-4 select-none">
      {/* Header & Badges */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Navigation className="w-5 h-5 text-cyan-400 animate-pulse" />
          <div>
            <h2 className="text-xs sm:text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
              VOYAGE STATE MONITORING
              <span className="text-[10px] text-cyan-400 bg-cyan-950 px-1.5 py-0.5 rounded border border-cyan-800">
                PHASE 8A
              </span>
            </h2>
            <p className="text-[10.5px] text-slate-400">
              Vessel: <strong className="text-white">{voyageState.vesselName}</strong> ({voyageState.iceClass})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`px-2 py-0.5 text-[10px] font-bold rounded border uppercase ${getStatusColor(voyageState.navigationStatus)}`}>
            STATUS: {voyageState.navigationStatus}
          </span>
          <span className={`px-2 py-0.5 text-[10px] font-bold rounded border uppercase ${getDataModeBadge(voyageState.dataMode)}`}>
            DATA: {voyageState.dataMode}
          </span>
          <span className="px-2 py-0.5 text-[10px] font-bold rounded border bg-emerald-950 text-emerald-300 border-emerald-800 flex items-center gap-1">
            <Wifi className="w-3 h-3 text-emerald-400" />
            {voyageState.connectivityState}
          </span>
        </div>
      </div>

      {/* Main Grid: 4 Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        {/* Card 1: Position & Kinematics */}
        <div className="p-3 bg-slate-950/80 rounded border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between text-slate-400 font-semibold border-b border-slate-800/80 pb-1 text-[11px]">
            <span className="flex items-center gap-1">
              <Compass className="w-3.5 h-3.5 text-cyan-400" /> POSITION & SPEED
            </span>
            <span className="text-cyan-400 font-bold">{voyageState.currentSpeedKnots} kts</span>
          </div>
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-500">Coordinates:</span>
              <strong className="text-white">{formatCoordinate(voyageState.currentPosition.lat, voyageState.currentPosition.lon)}</strong>
            </div>
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-500">Heading:</span>
              <strong className="text-cyan-300">{voyageState.currentPosition.headingDeg}° TRUE</strong>
            </div>
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-500">Cross-Track Error:</span>
              <strong className="text-slate-300">{gpsTracking.crossTrackErrorNm || 0.1} nm</strong>
            </div>
          </div>
        </div>

        {/* Card 2: Route Progress */}
        <div className="p-3 bg-slate-950/80 rounded border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between text-slate-400 font-semibold border-b border-slate-800/80 pb-1 text-[11px]">
            <span className="flex items-center gap-1">
              <Anchor className="w-3.5 h-3.5 text-emerald-400" /> ROUTE PROGRESS
            </span>
            <span className="text-emerald-400 font-bold">{voyageState.progressPercent}%</span>
          </div>
          <div className="space-y-1.5 text-[11px]">
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-700">
              <div
                className="bg-emerald-500 h-full transition-all duration-300 shadow-xs"
                style={{ width: `${voyageState.progressPercent}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-[10.5px]">
              <span className="text-slate-400">Traveled: <strong className="text-white">{voyageState.distanceTravelledNm} nm</strong></span>
              <span className="text-slate-400">Remaining: <strong className="text-amber-300">{voyageState.remainingDistanceNm} nm</strong></span>
            </div>
          </div>
        </div>

        {/* Card 3: Waypoint Tracking */}
        <div className="p-3 bg-slate-950/80 rounded border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between text-slate-400 font-semibold border-b border-slate-800/80 pb-1 text-[11px]">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-amber-400" /> WAYPOINTS
            </span>
            <span className="text-slate-400 text-[10px]">
              {voyageState.completedWaypointsCount} / {voyageState.totalWaypointsCount || 0}
            </span>
          </div>
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between text-slate-300 truncate">
              <span className="text-slate-500">Current:</span>
              <strong className="text-slate-200 truncate">{voyageState.currentWaypoint?.name || 'Origin'}</strong>
            </div>
            <div className="flex justify-between text-slate-300 truncate">
              <span className="text-slate-500">Next Target:</span>
              <strong className="text-amber-300 truncate">{voyageState.nextWaypoint?.name || 'Destination'}</strong>
            </div>
            {voyageState.nextWaypoint && (
              <div className="flex justify-between text-slate-400 text-[10.5px]">
                <span>Distance to Next:</span>
                <span className="text-white font-bold">{voyageState.nextWaypoint.distanceToNm} nm</span>
              </div>
            )}
          </div>
        </div>

        {/* Card 4: ETA & Data Telemetry */}
        <div className="p-3 bg-slate-950/80 rounded border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between text-slate-400 font-semibold border-b border-slate-800/80 pb-1 text-[11px]">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-purple-400" /> ETA & TELEMETRY
            </span>
            <span className="text-purple-300 font-bold">
              {voyageState.estimatedTimeRemainingHours !== null ? `${voyageState.estimatedTimeRemainingHours} hrs` : 'N/A'}
            </span>
          </div>
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-500">Estimated Arrival:</span>
              <strong className="text-white text-[10.5px]">{formatEta(voyageState.estimatedArrivalTime)}</strong>
            </div>
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-500">Freshness:</span>
              <strong className="text-emerald-300 text-[10px]">{voyageState.environmentalDataFreshness}</strong>
            </div>
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-500">Confidence:</span>
              <strong className="text-cyan-300 text-[10.5px]">{voyageState.confidenceLevel}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Controls & Timestamp */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-3 text-[11px]">
        <div className="flex items-center gap-2">
          {!gpsTracking.isSimulating ? (
            <button
              onClick={startGpsSimulation}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Play className="w-3.5 h-3.5 fill-white" /> Start Track Simulation
            </button>
          ) : (
            <button
              onClick={pauseGpsSimulation}
              className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Pause className="w-3.5 h-3.5 fill-white" /> Pause Track
            </button>
          )}

          <button
            onClick={resetGpsSimulation}
            title="Reset position to origin"
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition flex items-center gap-1 cursor-pointer border border-slate-700"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
        </div>

        <div className="text-[10px] text-slate-500 flex items-center gap-1">
          <Activity className="w-3 h-3 text-slate-600" />
          Last State Update: <span className="text-slate-400">{new Date(voyageState.lastStateUpdate).toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  );
};
