/**
 * CRYO NAV — Offline Connectivity & Readiness Status Panel
 * Phase 9B — Standalone Presentational UI Component
 *
 * Communicates:
 * - Connection State: ONLINE, LIMITED, OFFLINE, SYNCING
 * - Local Navigation Data Availability: AVAILABLE, PARTIAL, EMPTY
 * - Last Synchronization Timestamp / "Never synchronized"
 * - Data Freshness Information
 * - Provenance & Stream Mode for Data Sources (Sea Ice, Ocean, Weather, Icebergs, Route, Voyage State)
 *
 * STRICT PRESENTATIONAL CONTRACT:
 * - NO data-fetching logic inside
 * - NO direct IndexedDB / API / satellite calls
 * - NO automatic replanning / hazard escalation / route modification
 */

import React from 'react';
import {
  Wifi,
  WifiOff,
  AlertTriangle,
  RefreshCw,
  Database,
  Clock,
  Layers,
  CheckCircle2,
  AlertCircle,
  XCircle,
  HardDrive,
  Radio,
  Server,
  Info,
} from 'lucide-react';
import { ConnectionState } from '../../types';

export type LocalDataAvailability = 'AVAILABLE' | 'PARTIAL' | 'EMPTY';

export type ProvenanceMode = 'REAL' | 'SIMULATED' | 'UNAVAILABLE';

export interface DataSourceStatus {
  name: string; // 'Sea Ice' | 'Ocean' | 'Weather' | 'Icebergs' | 'Route' | 'Voyage State' or custom
  mode: ProvenanceMode;
  lastUpdate?: string | null;
  isCached?: boolean;
  freshnessLabel?: string; // 'FRESH' | 'AGING' | 'STALE' | 'UNAVAILABLE'
  itemCount?: number;
  details?: string;
}

export interface OfflineStatusPanelProps {
  connectionState: ConnectionState;
  localDataAvailability: LocalDataAvailability;
  lastSyncTimestamp?: string | null;
  dataFreshnessSummary?: string;
  dataSources?: DataSourceStatus[];
  isSyncing?: boolean;
  onManualSyncRequest?: () => void;
  compact?: boolean;
}

const DEFAULT_DATA_SOURCES: DataSourceStatus[] = [
  { name: 'Sea Ice', mode: 'REAL', isCached: false, freshnessLabel: 'FRESH' },
  { name: 'Ocean', mode: 'REAL', isCached: false, freshnessLabel: 'FRESH' },
  { name: 'Weather', mode: 'REAL', isCached: false, freshnessLabel: 'FRESH' },
  { name: 'Icebergs', mode: 'REAL', isCached: false, freshnessLabel: 'FRESH' },
  { name: 'Route', mode: 'REAL', isCached: false, freshnessLabel: 'FRESH' },
  { name: 'Voyage State', mode: 'REAL', isCached: false, freshnessLabel: 'FRESH' },
];

export const OfflineStatusPanel: React.FC<OfflineStatusPanelProps> = ({
  connectionState,
  localDataAvailability,
  lastSyncTimestamp,
  dataFreshnessSummary,
  dataSources,
  isSyncing = false,
  onManualSyncRequest,
  compact = false,
}) => {
  const activeConnection = isSyncing ? 'SYNCING' : connectionState;

  // Visual styling mapping for Connection State
  const getConnectionConfig = (state: ConnectionState) => {
    switch (state) {
      case 'ONLINE':
        return {
          label: 'ONLINE',
          description: 'Live data available',
          icon: Wifi,
          badgeStyle: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50',
          bannerStyle: 'bg-emerald-950/60 border-emerald-800/60 text-emerald-200',
          indicatorColor: 'bg-emerald-400',
        };
      case 'LIMITED':
        return {
          label: 'LIMITED',
          description: 'Connectivity limited',
          icon: AlertTriangle,
          badgeStyle: 'bg-amber-500/20 text-amber-300 border-amber-500/50',
          bannerStyle: 'bg-amber-950/60 border-amber-800/60 text-amber-200',
          indicatorColor: 'bg-amber-400',
        };
      case 'OFFLINE':
        return {
          label: 'OFFLINE',
          description: 'Operating from cached data',
          icon: WifiOff,
          badgeStyle: 'bg-rose-500/20 text-rose-300 border-rose-500/50',
          bannerStyle: 'bg-rose-950/60 border-rose-800/60 text-rose-200',
          indicatorColor: 'bg-rose-400',
        };
      case 'SYNCING':
        return {
          label: 'SYNCING',
          description: 'Synchronizing verified data',
          icon: RefreshCw,
          badgeStyle: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50',
          bannerStyle: 'bg-cyan-950/60 border-cyan-800/60 text-cyan-200',
          indicatorColor: 'bg-cyan-400 animate-spin',
        };
      default:
        return {
          label: state,
          description: 'Unknown connectivity status',
          icon: Radio,
          badgeStyle: 'bg-slate-700 text-slate-300 border-slate-600',
          bannerStyle: 'bg-slate-900 border-slate-700 text-slate-300',
          indicatorColor: 'bg-slate-500',
        };
    }
  };

  // Visual styling for Local Data Availability
  const getAvailabilityConfig = (availability: LocalDataAvailability) => {
    switch (availability) {
      case 'AVAILABLE':
        return {
          label: 'AVAILABLE',
          description: 'Complete local navigation datasets stored',
          badgeStyle: 'bg-emerald-950 text-emerald-300 border-emerald-700',
          icon: CheckCircle2,
          iconColor: 'text-emerald-400',
        };
      case 'PARTIAL':
        return {
          label: 'PARTIAL',
          description: 'Partial navigation data stored; some parameters offline',
          badgeStyle: 'bg-amber-950 text-amber-300 border-amber-700',
          icon: AlertCircle,
          iconColor: 'text-amber-400',
        };
      case 'EMPTY':
        return {
          label: 'EMPTY',
          description: 'No local navigation data stored',
          badgeStyle: 'bg-rose-950 text-rose-300 border-rose-700',
          icon: XCircle,
          iconColor: 'text-rose-400',
        };
      default:
        return {
          label: availability,
          description: 'Data availability unknown',
          badgeStyle: 'bg-slate-800 text-slate-300 border-slate-700',
          icon: Info,
          iconColor: 'text-slate-400',
        };
    }
  };

  const connConfig = getConnectionConfig(activeConnection);
  const availConfig = getAvailabilityConfig(localDataAvailability);
  const ConnectionIcon = connConfig.icon;
  const AvailabilityIcon = availConfig.icon;

  // Determine datasets to render
  const effectiveSources = dataSources !== undefined ? dataSources : DEFAULT_DATA_SOURCES;

  const formattedLastSync = lastSyncTimestamp ? lastSyncTimestamp : 'Never synchronized';

  return (
    <div
      data-testid="offline-status-panel"
      className="bg-slate-900/90 backdrop-blur border border-slate-700/60 rounded-xl p-4 text-slate-200 shadow-xl"
    >
      {/* Panel Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-cyan-400">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 tracking-wide uppercase flex items-center gap-2">
              Offline Connectivity & Readiness
            </h3>
            <p className="text-xs text-slate-400">
              Local data readiness & telemetry synchronization status
            </p>
          </div>
        </div>

        {/* Primary Connection State Pill */}
        <div className="flex items-center gap-2">
          <span
            data-testid="connection-state-badge"
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold border ${connConfig.badgeStyle}`}
          >
            <ConnectionIcon className={`w-3.5 h-3.5 ${activeConnection === 'SYNCING' ? 'animate-spin' : ''}`} />
            <span>{connConfig.label}</span>
          </span>

          {onManualSyncRequest && (
            <button
              onClick={onManualSyncRequest}
              disabled={isSyncing}
              className="px-2.5 py-1 text-xs font-semibold rounded bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 transition disabled:opacity-50 flex items-center gap-1"
              title="Request telemetry sync"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>Sync</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Status Description Banner */}
      <div className={`p-3 rounded-lg border mb-4 flex items-center justify-between gap-3 ${connConfig.bannerStyle}`}>
        <div className="flex items-center gap-2.5">
          <ConnectionIcon className="w-5 h-5 shrink-0" />
          <div>
            <div className="text-xs font-bold tracking-wide">{connConfig.description}</div>
            <div className="text-[11px] opacity-80">
              {activeConnection === 'OFFLINE'
                ? 'System using locally stored cache for decision support.'
                : activeConnection === 'LIMITED'
                ? 'High latency or restricted bandwidth connection detected.'
                : activeConnection === 'SYNCING'
                ? 'Synchronizing local cache with satellite telemetry feeds.'
                : 'Connected to live satellite & environmental stream.'}
            </div>
          </div>
        </div>
        <div className="text-right font-mono text-[11px] shrink-0">
          <span className="opacity-75">Data stream: </span>
          <span className="font-bold">
            {activeConnection === 'OFFLINE' ? 'Cached data' : 'Live data'}
          </span>
        </div>
      </div>

      {/* Local Data Availability Summary Section */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        {/* Availability State */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3">
          <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Local Data</span>
            <AvailabilityIcon className={`w-3.5 h-3.5 ${availConfig.iconColor}`} />
          </div>
          <div className="flex items-center gap-2">
            <span
              data-testid="data-availability-badge"
              className={`px-2 py-0.5 rounded text-xs font-mono font-bold border ${availConfig.badgeStyle}`}
            >
              {availConfig.label}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1 truncate" title={availConfig.description}>
            {availConfig.description}
          </div>
        </div>

        {/* Last Synchronization */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3">
          <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>Last Sync</span>
          </div>
          <div
            data-testid="last-sync-timestamp"
            className="text-xs font-mono font-semibold text-slate-200 truncate"
            title={formattedLastSync}
          >
            {formattedLastSync}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {lastSyncTimestamp ? 'Local store synchronized' : 'No sync recorded'}
          </div>
        </div>

        {/* Data Freshness */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3">
          <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span>Data Freshness</span>
          </div>
          <div data-testid="data-freshness-summary" className="text-xs font-mono font-semibold text-slate-200 truncate">
            {dataFreshnessSummary || (localDataAvailability === 'EMPTY' ? 'UNAVAILABLE' : 'FRESH')}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {dataFreshnessSummary ? 'Telemetry freshness metric' : 'Overall data status'}
          </div>
        </div>
      </div>

      {/* Dataset Provenance & Storage Table */}
      {!compact && (
        <div className="bg-slate-950/40 border border-slate-800 rounded-lg overflow-hidden">
          <div className="px-3 py-2 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between text-xs font-semibold text-slate-300">
            <span className="flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-cyan-400" />
              Dataset Provenance & Local Storage Status
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              {effectiveSources.length} Datasets Tracked
            </span>
          </div>

          {effectiveSources.length === 0 || localDataAvailability === 'EMPTY' ? (
            <div className="p-4 text-center text-xs text-slate-400 font-mono" data-testid="no-datasets-message">
              No local navigation datasets stored or available.
            </div>
          ) : (
            <div className="divide-y divide-slate-800/80">
              {effectiveSources.map((ds, idx) => {
                const isCachedData = activeConnection === 'OFFLINE' || ds.isCached === true;
                const isUnavailable = ds.mode === 'UNAVAILABLE';
                const formattedUpdate = isUnavailable
                  ? 'UNAVAILABLE'
                  : ds.lastUpdate
                  ? ds.lastUpdate
                  : 'UNAVAILABLE';

                return (
                  <div
                    key={ds.name || idx}
                    data-testid={`dataset-row-${ds.name.toLowerCase().replace(/\s+/g, '-')}`}
                    className="p-2.5 px-3 flex flex-wrap items-center justify-between gap-2 text-xs hover:bg-slate-900/50 transition"
                  >
                    {/* Dataset Name */}
                    <div className="flex items-center gap-2 min-w-[120px]">
                      <span className="font-semibold text-slate-200">{ds.name}</span>
                    </div>

                    {/* Mode (REAL / SIMULATED / UNAVAILABLE) */}
                    <div className="flex items-center gap-1.5">
                      <span
                        data-testid={`mode-badge-${ds.name.toLowerCase().replace(/\s+/g, '-')}`}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${
                          ds.mode === 'REAL'
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                            : ds.mode === 'SIMULATED'
                            ? 'bg-amber-950 text-amber-300 border-amber-700'
                            : 'bg-slate-900 text-slate-400 border-slate-700'
                        }`}
                      >
                        {ds.mode}
                      </span>
                    </div>

                    {/* Storage Type (Cached data vs Live data) */}
                    <div className="flex items-center gap-1">
                      <span
                        data-testid={`storage-label-${ds.name.toLowerCase().replace(/\s+/g, '-')}`}
                        className={`text-[11px] font-mono px-1.5 py-0.5 rounded border ${
                          isCachedData
                            ? 'bg-slate-800 text-slate-300 border-slate-700'
                            : 'bg-sky-950 text-sky-300 border-sky-800'
                        }`}
                      >
                        {isCachedData ? 'Cached data' : 'Live data'}
                      </span>
                    </div>

                    {/* Last Update Timestamp */}
                    <div className="text-[11px] font-mono text-slate-400 min-w-[140px] text-right">
                      <span className="opacity-75">Update: </span>
                      <span
                        data-testid={`last-update-${ds.name.toLowerCase().replace(/\s+/g, '-')}`}
                        className="text-slate-200 font-semibold"
                      >
                        {formattedUpdate}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
