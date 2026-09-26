/**
 * CRYO NAV — Decision-Impact Data Acquisition Panel
 * Phase 11B — Main Decision-Support Presentational Panel
 *
 * Core Goal:
 * Answers "Given the current navigation decision, uncertainty, and available connectivity,
 * what data should CRYO NAV acquire first because it could change the decision?"
 *
 * Exposes:
 * - CURRENT NAVIGATION DECISION SUMMARY (Route, Sensitivity, Uncertainty, Connectivity, Bandwidth)
 * - DATA ACQUISITION PRIORITIES (Ranked candidate data products via AcquisitionPriorityList)
 *
 * Strict Terminology Rules:
 * - "Available satellite product", "Discoverable acquisition", "Available Sentinel-1 coverage"
 * - NEVER "Command satellite", "Satellite will scan", "Request satellite to observe"
 * - SAR features are "SAR evidence/candidate regions", NEVER "confirmed icebergs"
 * - Engineering Priority Index (0-100), NEVER probability/risk probability
 */

import React from 'react';
import {
  Satellite,
  Compass,
  Activity,
  Wifi,
  WifiOff,
  RefreshCw,
  HardDrive,
  Info,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Radio,
  Layers,
} from 'lucide-react';
import {
  AcquisitionCandidate,
  AcquisitionRankingResult,
} from '../../services/decisionImpactAcquisitionEngine';
import { ConnectionState, RouteStability } from '../../types';
import { AcquisitionPriorityList } from './AcquisitionPriorityList';

export interface DecisionImpactAcquisitionPanelProps {
  rankingResult?: AcquisitionRankingResult | null;
  currentRouteName?: string | null;
  decisionSensitivity?: RouteStability | string | null;
  currentUncertainty?: string | null;
  connectionState?: ConnectionState | string | null;
  availableBandwidthMb?: number | null;
  candidates?: AcquisitionCandidate[] | null;
  onAcquireRequest?: (candidate: AcquisitionCandidate) => void;
  compact?: boolean;
}

export const DecisionImpactAcquisitionPanel: React.FC<DecisionImpactAcquisitionPanelProps> = ({
  rankingResult,
  currentRouteName,
  decisionSensitivity,
  currentUncertainty,
  connectionState: overrideConnState,
  availableBandwidthMb: overrideBandwidth,
  candidates: overrideCandidates,
  onAcquireRequest,
  compact = false,
}) => {
  // Derive active variables from rankingResult or explicit overrides
  const connState: ConnectionState =
    (overrideConnState as ConnectionState) ||
    rankingResult?.connectionState ||
    'ONLINE';

  const bandwidthMb =
    overrideBandwidth !== undefined
      ? overrideBandwidth
      : rankingResult?.availableBandwidthMb !== undefined
      ? rankingResult.availableBandwidthMb
      : null;

  const candidateList: AcquisitionCandidate[] =
    overrideCandidates || rankingResult?.rankedCandidates || [];

  const routeName =
    currentRouteName ||
    candidateList[0]?.affectedRouteName ||
    'Active Recommended Route';

  const sensitivity = decisionSensitivity || 'SENSITIVE';

  const uncertaintyText =
    currentUncertainty ||
    candidateList[0]?.uncertaintyAddressed ||
    'Regional Uncertainty Zone';

  // Connectivity Badge Config
  const getConnConfig = (cState: ConnectionState) => {
    switch (cState) {
      case 'ONLINE':
        return { label: 'ONLINE', icon: Wifi, style: 'text-emerald-400 bg-emerald-950/60 border-emerald-800' };
      case 'LIMITED':
        return { label: 'LIMITED', icon: AlertTriangle, style: 'text-amber-400 bg-amber-950/60 border-amber-800' };
      case 'OFFLINE':
        return { label: 'OFFLINE', icon: WifiOff, style: 'text-rose-400 bg-rose-950/60 border-rose-800' };
      case 'SYNCING':
        return { label: 'SYNCING', icon: RefreshCw, style: 'text-cyan-400 bg-cyan-950/60 border-cyan-800' };
      default:
        return { label: cState, icon: Radio, style: 'text-slate-400 bg-slate-900 border-slate-700' };
    }
  };

  // Sensitivity Badge Config
  const getSensitivityConfig = (sens: string) => {
    switch (sens.toUpperCase()) {
      case 'HIGHLY_SENSITIVE':
      case 'HIGHLY SENSITIVE':
        return { label: 'HIGHLY SENSITIVE', style: 'bg-rose-950/80 text-rose-300 border-rose-800' };
      case 'SENSITIVE':
        return { label: 'SENSITIVE', style: 'bg-amber-950/80 text-amber-300 border-amber-800' };
      case 'ROBUST':
      default:
        return { label: 'ROBUST', style: 'bg-emerald-950/80 text-emerald-300 border-emerald-800' };
    }
  };

  const connConfig = getConnConfig(connState);
  const sensConfig = getSensitivityConfig(sensitivity);
  const ConnIcon = connConfig.icon;

  const bandwidthDisplay =
    bandwidthMb === null || bandwidthMb === undefined
      ? 'Unrestricted'
      : `${bandwidthMb} MB available`;

  return (
    <div
      data-testid="decision-impact-acquisition-panel"
      className="bg-slate-900/95 backdrop-blur border border-slate-700/70 rounded-xl p-5 text-slate-200 shadow-2xl space-y-5"
    >
      {/* Panel Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3.5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-cyan-400 shadow-inner">
            <Satellite className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100 tracking-wide uppercase flex items-center gap-2">
              Decision-Impact Data Acquisition
            </h3>
            <p className="text-xs text-slate-400">
              Prioritizes discoverable environmental satellite coverage that could shift the active navigation decision
            </p>
          </div>
        </div>

        {/* Global Connection Badge */}
        <div className="flex items-center gap-2">
          <div
            data-testid="connectivity-state"
            className={`px-3 py-1 rounded-lg text-xs font-mono font-bold border flex items-center gap-1.5 ${connConfig.style}`}
          >
            <ConnIcon className="w-3.5 h-3.5" />
            <span>{connConfig.label}</span>
          </div>
        </div>
      </div>

      {/* Section 1: Current Navigation Decision Overview */}
      <div className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-4 shadow-inner">
        <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Compass className="w-4 h-4 text-cyan-400" />
          Current Navigation Decision & Context
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Active Route */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-lg p-3">
            <span className="text-[10px] font-mono text-slate-400 uppercase block mb-1">
              Current Route
            </span>
            <span data-testid="current-route-name" className="font-bold text-slate-100 truncate block">
              {routeName}
            </span>
          </div>

          {/* Decision Sensitivity */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-lg p-3">
            <span className="text-[10px] font-mono text-slate-400 uppercase block mb-1">
              Decision Sensitivity
            </span>
            <span
              data-testid="decision-sensitivity"
              className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold inline-block border ${sensConfig.style}`}
            >
              {sensConfig.label}
            </span>
          </div>

          {/* Current Uncertainty */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-lg p-3">
            <span className="text-[10px] font-mono text-slate-400 uppercase block mb-1">
              Current Uncertainty
            </span>
            <span data-testid="current-uncertainty" className="font-bold text-amber-300 truncate block">
              {uncertaintyText}
            </span>
          </div>

          {/* Available Bandwidth */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-lg p-3">
            <span className="text-[10px] font-mono text-slate-400 uppercase block mb-1">
              Available Bandwidth
            </span>
            <span data-testid="available-bandwidth" className="font-mono font-bold text-emerald-300 truncate block">
              {bandwidthDisplay}
            </span>
          </div>
        </div>
      </div>

      {/* Engine Overview Explanation Banner */}
      {rankingResult?.explanation && (
        <div
          data-testid="ranking-summary-explanation"
          className="bg-slate-950/40 border border-slate-800/80 rounded-lg p-3 text-xs text-slate-300 flex items-start gap-2"
        >
          <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-cyan-300">Prioritization Strategy: </span>
            {rankingResult.explanation}
          </div>
        </div>
      )}

      {/* Section 2: Data Acquisition Priorities */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            Data Acquisition Priorities
          </h4>
          <span className="text-xs text-slate-400 font-mono">
            Ranked by Engineering Priority Index
          </span>
        </div>

        {/* Priority List */}
        <AcquisitionPriorityList
          candidates={candidateList}
          connectionState={connState}
          availableBandwidthMb={bandwidthMb}
          onAcquireRequest={onAcquireRequest}
        />
      </div>

      {/* Footer Scientific & Engineering Disclosure Notice */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3.5 text-[11px] text-slate-400 leading-normal flex items-start gap-2.5">
        <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-slate-300">Decision-Support Paradigm: </span>
          CRYO NAV does not perform unconstrained data downloads. It evaluates discoverable satellite coverage against route sensitivity to identify which specific acquisitions could alter the active navigation decision, maximizing bandwidth efficiency under polar connectivity constraints.
        </div>
      </div>
    </div>
  );
};
