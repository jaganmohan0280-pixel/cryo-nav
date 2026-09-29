/**
 * CRYO NAV — Uncertainty Zone Visualization & Explanation Panel
 * Phase 10B — Standalone Presentational UI Component
 *
 * Communicates:
 * - Uncertainty Zone Envelope & Radius
 * - Confidence Level (HIGH, MEDIUM, LOW, CRITICAL)
 * - Data Freshness (FRESH, AGING, STALE, UNAVAILABLE)
 * - Forecast Horizon (0h, 6h, 12h, 24h, 48h, 72h)
 * - Connectivity State (ONLINE, LIMITED, OFFLINE, SYNCING)
 * - Human-Readable Explanation / Reason for Uncertainty Expansion
 * - Decision Caution Level (STANDARD, ELEVATED, HIGH, EXTREME)
 * - Data Provenance / Data Mode (REAL, SIMULATED, HYBRID, UNAVAILABLE)
 *
 * STRICT PRESENTATIONAL CONTRACT:
 * - NO uncertainty calculations / mathematical modifications inside
 * - NO service calls, API calls, or IndexedDB access
 * - NO routing or navigation map modifications
 * - Strictly avoids false certainty language ("prediction guaranteed", "certain collision", "exact danger boundary", "100% safe")
 */

import React from 'react';
import {
  AlertTriangle,
  HelpCircle,
  Clock,
  Wifi,
  WifiOff,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Compass,
  Layers,
  Info,
  Activity,
  Maximize2,
  AlertCircle,
  CheckCircle2,
  Radio,
} from 'lucide-react';
import { ConnectionState, ConfidenceLevel, FreshnessState } from '../../types';

export type HazardType = 'ICEBERG' | 'SEA ICE' | 'WEATHER';

export type DataMode = 'REAL' | 'SIMULATED' | 'HYBRID' | 'UNAVAILABLE';

export type ForecastHorizon =
  | '0h'
  | '6h'
  | '12h'
  | '24h'
  | '48h'
  | '72h'
  | '+0h'
  | '+6h'
  | '+12h'
  | '+24h'
  | '+48h'
  | '+72h';

export type CautionLevel = 'STANDARD' | 'ELEVATED' | 'HIGH' | 'EXTREME';

export interface UncertaintyData {
  id?: string;
  hazardType?: HazardType | string;
  confidence?: ConfidenceLevel | string | null;
  freshness?: FreshnessState | string | null;
  connectivity?: ConnectionState | string | null;
  forecastHorizon?: ForecastHorizon | string | null;
  uncertaintyRadiusNm?: number | null;
  uncertaintyEnvelopeLabel?: string | null;
  reason?: string | null;
  cautionLevel?: CautionLevel | string | null;
  provenance?: DataMode | string | null;
  lastUpdateTimestamp?: string | null;
}

export interface UncertaintyZonePanelProps {
  uncertaintyData?: UncertaintyData | null;
  compact?: boolean;
  showLegendInline?: boolean;
}

export const UncertaintyZonePanel: React.FC<UncertaintyZonePanelProps> = ({
  uncertaintyData,
  compact = false,
  showLegendInline = false,
}) => {
  // Handle empty / unavailable state
  if (!uncertaintyData) {
    return (
      <div
        data-testid="uncertainty-panel-empty"
        className="bg-slate-900/90 backdrop-blur border border-slate-700/60 rounded-xl p-4 text-slate-200 shadow-xl"
      >
        <div className="flex items-center gap-2 mb-2 text-cyan-400 font-medium">
          <HelpCircle className="w-5 h-5 text-cyan-400" />
          <span className="font-bold tracking-wide uppercase text-sm text-slate-100">
            Uncertainty Zone Visualization
          </span>
        </div>
        <p className="text-xs text-slate-400" data-testid="no-uncertainty-data-message">
          No uncertainty assessment available
        </p>
      </div>
    );
  }

  const {
    hazardType = 'ICEBERG',
    confidence,
    freshness,
    connectivity = 'ONLINE',
    forecastHorizon = '+24h',
    uncertaintyRadiusNm,
    uncertaintyEnvelopeLabel,
    reason,
    cautionLevel = 'ELEVATED',
    provenance = 'REAL',
  } = uncertaintyData;

  // Format Provenance Badge
  const getProvenanceConfig = (mode?: string | null) => {
    switch (mode) {
      case 'REAL':
        return {
          label: 'REAL',
          style: 'bg-emerald-950 text-emerald-300 border-emerald-700',
        };
      case 'SIMULATED':
        return {
          label: 'SIMULATED',
          style: 'bg-amber-950 text-amber-300 border-amber-700',
        };
      case 'HYBRID':
        return {
          label: 'HYBRID',
          style: 'bg-sky-950 text-sky-300 border-sky-700',
        };
      case 'UNAVAILABLE':
      default:
        return {
          label: 'UNAVAILABLE',
          style: 'bg-slate-900 text-slate-400 border-slate-700',
        };
    }
  };

  // Format Confidence Level Badge
  const getConfidenceConfig = (conf?: string | null) => {
    if (!conf) {
      return {
        label: 'Confidence unavailable',
        style: 'bg-slate-800 text-slate-400 border-slate-700',
        icon: Info,
      };
    }
    switch (conf.toUpperCase()) {
      case 'HIGH':
        return {
          label: 'HIGH',
          style: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50',
          icon: CheckCircle2,
        };
      case 'MEDIUM':
        return {
          label: 'MEDIUM',
          style: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50',
          icon: Info,
        };
      case 'LOW':
        return {
          label: 'LOW',
          style: 'bg-amber-500/20 text-amber-300 border-amber-500/50',
          icon: AlertTriangle,
        };
      case 'CRITICAL':
        return {
          label: 'CRITICAL',
          style: 'bg-rose-500/20 text-rose-300 border-rose-500/50',
          icon: ShieldAlert,
        };
      default:
        return {
          label: conf,
          style: 'bg-slate-800 text-slate-300 border-slate-700',
          icon: Info,
        };
    }
  };

  // Format Data Freshness Badge
  const getFreshnessConfig = (fresh?: string | null) => {
    if (!fresh) {
      return {
        label: 'Freshness unavailable',
        style: 'bg-slate-800 text-slate-400 border-slate-700',
      };
    }
    switch (fresh.toUpperCase()) {
      case 'FRESH':
        return {
          label: 'FRESH',
          style: 'bg-emerald-950 text-emerald-300 border-emerald-700',
        };
      case 'AGING':
        return {
          label: 'AGING',
          style: 'bg-amber-950 text-amber-300 border-amber-700',
        };
      case 'STALE':
        return {
          label: 'STALE',
          style: 'bg-rose-950 text-rose-300 border-rose-700',
        };
      case 'UNAVAILABLE':
      default:
        return {
          label: 'Freshness unavailable',
          style: 'bg-slate-800 text-slate-400 border-slate-700',
        };
    }
  };

  // Format Connectivity Badge
  const getConnectivityConfig = (conn?: string | null) => {
    switch (conn?.toUpperCase()) {
      case 'ONLINE':
        return { label: 'ONLINE', icon: Wifi, style: 'text-emerald-400' };
      case 'LIMITED':
        return { label: 'LIMITED', icon: AlertTriangle, style: 'text-amber-400' };
      case 'OFFLINE':
        return { label: 'OFFLINE', icon: WifiOff, style: 'text-rose-400' };
      case 'SYNCING':
        return { label: 'SYNCING', icon: RefreshCw, style: 'text-cyan-400' };
      default:
        return { label: conn || 'ONLINE', icon: Radio, style: 'text-slate-400' };
    }
  };

  // Format Caution Level Badge
  const getCautionConfig = (caut?: string | null) => {
    switch (caut?.toUpperCase()) {
      case 'STANDARD':
        return { label: 'STANDARD CAUTION', style: 'bg-emerald-950/80 text-emerald-200 border-emerald-700' };
      case 'ELEVATED':
        return { label: 'ELEVATED CAUTION', style: 'bg-amber-950/80 text-amber-200 border-amber-700' };
      case 'HIGH':
        return { label: 'HIGH CAUTION', style: 'bg-orange-950/80 text-orange-200 border-orange-700' };
      case 'EXTREME':
        return { label: 'EXTREME CAUTION', style: 'bg-rose-950/80 text-rose-200 border-rose-700' };
      default:
        return { label: 'DECISION CAUTION', style: 'bg-slate-800 text-slate-200 border-slate-700' };
    }
  };

  const provConfig = getProvenanceConfig(provenance);
  const confConfig = getConfidenceConfig(confidence);
  const freshConfig = getFreshnessConfig(freshness);
  const connConfig = getConnectivityConfig(connectivity);
  const cautConfig = getCautionConfig(cautionLevel);

  const ConnIcon = connConfig.icon;
  const ConfIcon = confConfig.icon;

  const displayRadius =
    uncertaintyRadiusNm !== undefined && uncertaintyRadiusNm !== null
      ? `±${uncertaintyRadiusNm.toFixed(1)} nm`
      : uncertaintyEnvelopeLabel || 'Envelope unavailable';

  return (
    <div
      data-testid="uncertainty-zone-panel"
      className="bg-slate-900/90 backdrop-blur border border-slate-700/60 rounded-xl p-4 text-slate-200 shadow-xl"
    >
      {/* Panel Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-cyan-400">
            <Maximize2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 tracking-wide uppercase flex items-center gap-2">
              Uncertainty Zone & Explanation
            </h3>
            <p className="text-xs text-slate-400">
              Model spatial variance, confidence factors & forecast horizon metrics
            </p>
          </div>
        </div>

        {/* Provenance Badge */}
        <div className="flex items-center gap-2">
          <span
            data-testid="provenance-badge"
            className={`px-2.5 py-1 rounded text-xs font-mono font-bold border ${provConfig.style}`}
          >
            {provConfig.label}
          </span>
        </div>
      </div>

      {/* Main Overview Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {/* Hazard Type */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3">
          <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">
            Hazard Type
          </div>
          <div
            data-testid="hazard-type-value"
            className="text-xs font-mono font-bold text-cyan-300 truncate"
          >
            {hazardType}
          </div>
        </div>

        {/* Confidence Level */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3">
          <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">
            Confidence
          </div>
          <div className="flex items-center gap-1.5">
            <ConfIcon className="w-3.5 h-3.5" />
            <span
              data-testid="confidence-badge"
              className={`px-1.5 py-0.5 rounded text-[11px] font-mono font-bold border ${confConfig.style}`}
            >
              {confConfig.label}
            </span>
          </div>
        </div>

        {/* Data Freshness */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3">
          <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Data Freshness</span>
          </div>
          <div>
            <span
              data-testid="freshness-badge"
              className={`px-1.5 py-0.5 rounded text-[11px] font-mono font-bold border ${freshConfig.style}`}
            >
              {freshConfig.label}
            </span>
          </div>
        </div>

        {/* Forecast Horizon */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3">
          <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">
            Forecast Horizon
          </div>
          <div
            data-testid="forecast-horizon-value"
            className="text-xs font-mono font-bold text-slate-200"
          >
            {forecastHorizon}
          </div>
        </div>
      </div>

      {/* Secondary Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        {/* Connectivity */}
        <div className="bg-slate-950/40 border border-slate-800 rounded-lg p-2.5 flex items-center justify-between">
          <span className="text-xs text-slate-400">Connectivity:</span>
          <span
            data-testid="connectivity-value"
            className={`text-xs font-mono font-bold flex items-center gap-1 ${connConfig.style}`}
          >
            <ConnIcon className="w-3.5 h-3.5" />
            {connConfig.label}
          </span>
        </div>

        {/* Uncertainty Radius / Envelope */}
        <div className="bg-slate-950/40 border border-slate-800 rounded-lg p-2.5 flex items-center justify-between">
          <span className="text-xs text-slate-400">Uncertainty Zone:</span>
          <span
            data-testid="uncertainty-radius-value"
            className="text-xs font-mono font-bold text-amber-300"
          >
            {displayRadius}
          </span>
        </div>

        {/* Decision Caution Level */}
        <div className="bg-slate-950/40 border border-slate-800 rounded-lg p-2.5 flex items-center justify-between">
          <span className="text-xs text-slate-400">Decision Caution:</span>
          <span
            data-testid="caution-level-value"
            className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${cautConfig.style}`}
          >
            {cautConfig.label}
          </span>
        </div>
      </div>

      {/* Human-Readable Explanation / Reason Banner */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3.5 mb-4">
        <div className="text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
          <Info className="w-4 h-4 text-cyan-400" />
          Reason for Uncertainty Expansion:
        </div>
        <p
          data-testid="uncertainty-reason-text"
          className="text-xs text-slate-300 leading-relaxed font-sans"
        >
          {reason || 'Model baseline uncertainty envelope based on spatial resolution and forecast horizon.'}
        </p>
      </div>

      {/* Scientific Distinction & Disclaimer Banner */}
      <div className="bg-cyan-950/30 border border-cyan-800/40 rounded-lg p-3 text-[11px] text-cyan-200/90 leading-normal flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-cyan-300">Scientific Notice: </span>
          An uncertainty zone represents a spatial region of model forecast variance due to drift dynamics, weather forcing, and observation freshness. It does NOT represent an exact collision boundary or guaranteed hazard position.
        </div>
      </div>
    </div>
  );
};
