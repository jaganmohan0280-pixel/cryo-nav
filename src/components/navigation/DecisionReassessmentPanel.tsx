/**
 * CRYO NAV — Decision Reassessment Panel
 * Phase 12B — Standalone Presentational UI Component
 *
 * Core Responsibility:
 * Displays continuous decision stability & reassessment status produced by
 * decisionReassessmentEngine.ts.
 *
 * Communicates:
 * - Reassessment Status (STABLE, MONITOR, REASSESS, RECOMMEND_REVIEW)
 * - Human-Readable Explanation
 * - Trigger Reasons & Changed Variables
 * - Decision Sensitivity (ROBUST, SENSITIVE, HIGHLY_SENSITIVE)
 * - Uncertainty Change (Previous, Current, Delta, Expansion %, Materiality)
 * - Hazard Impact (Previous/Current Severity, CPA Delta, Affected Hazard ID)
 * - Previous vs Current State Comparison Table
 * - Data Provenance & Mode (REAL, SIMULATED, HYBRID, UNAVAILABLE)
 *
 * STRICT SAFETY & NAVIGATION RULES:
 * - Decision Support ONLY: Does NOT modify routes, waypoints, or active navigation.
 * - Neutral Language ONLY: Never says "Route automatically changed", "Safe to proceed", "Collision guaranteed", "Collision avoided", "Captain should choose", "Best route", or "Optimal route".
 * - Mandatory Disclaimer: "CRYO NAV provides decision support. Route changes require navigator review."
 */

import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Activity,
  Info,
  Clock,
  Radio,
  FileText,
  Compass,
  Maximize2,
  RefreshCw,
  Sliders,
  Layers,
  HelpCircle,
} from 'lucide-react';
import {
  DecisionReassessmentResult,
  ReassessmentStatus,
  ReassessmentDataMode,
} from '../../services/decisionReassessmentEngine';

export interface DecisionReassessmentPanelProps {
  result?: DecisionReassessmentResult | null;
  compact?: boolean;
}

export const DecisionReassessmentPanel: React.FC<DecisionReassessmentPanelProps> = ({
  result,
  compact = false,
}) => {
  // Empty state handling
  if (!result) {
    return (
      <div
        data-testid="decision-reassessment-panel-empty"
        className="bg-slate-900/90 backdrop-blur border border-slate-700/60 rounded-xl p-4 text-slate-200 shadow-xl"
      >
        <div className="flex items-center gap-2 mb-2 text-cyan-400 font-medium">
          <HelpCircle className="w-5 h-5 text-cyan-400" />
          <span className="font-bold tracking-wide uppercase text-sm text-slate-100">
            Decision Reassessment State
          </span>
        </div>
        <p className="text-xs text-slate-400" data-testid="no-reassessment-data-message">
          No decision reassessment assessment available.
        </p>
        <div className="mt-3 text-[11px] text-slate-400 border-t border-slate-800 pt-2" data-testid="navigator-disclaimer">
          CRYO NAV provides decision support. Route changes require navigator review.
        </div>
      </div>
    );
  }

  const {
    reassessmentStatus,
    triggerReasons = [],
    explanation,
    changedVariables = [],
    previousValues = {},
    currentValues = {},
    decisionSensitivity = 'ROBUST',
    uncertaintyChange,
    hazardImpact,
    timestamp,
    provenance = 'REAL',
    dataMode = 'REAL',
  } = result;

  // Status Badge Helper
  const getStatusConfig = (status: ReassessmentStatus) => {
    switch (status) {
      case 'STABLE':
        return {
          label: 'STABLE',
          subLabel: 'Decision remains stable.',
          style: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50',
          badgeText: 'STABLE',
          icon: CheckCircle2,
          bannerStyle: 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200',
        };
      case 'MONITOR':
        return {
          label: 'MONITOR',
          subLabel: 'Environmental metrics changed moderately. Monitor ongoing updates.',
          style: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50',
          badgeText: 'MONITOR',
          icon: Activity,
          bannerStyle: 'bg-cyan-950/40 border-cyan-800/60 text-cyan-200',
        };
      case 'REASSESS':
        return {
          label: 'REASSESS',
          subLabel: 'Material decision-relevant change detected. Navigation decision should be reassessed.',
          style: 'bg-amber-500/20 text-amber-300 border-amber-500/50',
          badgeText: 'REASSESS',
          icon: AlertTriangle,
          bannerStyle: 'bg-amber-950/40 border-amber-800/60 text-amber-200',
        };
      case 'RECOMMEND_REVIEW':
      default:
        return {
          label: 'RECOMMEND REVIEW',
          subLabel: 'High sensitivity or critical risk change. Navigator review recommended.',
          style: 'bg-rose-500/20 text-rose-300 border-rose-500/50',
          badgeText: 'RECOMMEND REVIEW',
          icon: ShieldAlert,
          bannerStyle: 'bg-rose-950/40 border-rose-800/60 text-rose-200',
        };
    }
  };

  // Data Mode / Provenance Badge Helper
  const getDataModeConfig = (mode: ReassessmentDataMode | string) => {
    const m = (mode || 'REAL').toUpperCase();
    if (m.includes('REAL')) {
      return { label: 'REAL', style: 'bg-emerald-950 text-emerald-300 border-emerald-700' };
    }
    if (m.includes('SIMULAT') || m.includes('SYNTHETIC') || m.includes('TEST')) {
      return { label: 'SIMULATED', style: 'bg-amber-950 text-amber-300 border-amber-700' };
    }
    if (m.includes('HYBRID')) {
      return { label: 'HYBRID', style: 'bg-sky-950 text-sky-300 border-sky-700' };
    }
    return { label: 'UNAVAILABLE', style: 'bg-slate-900 text-slate-400 border-slate-700' };
  };

  // Decision Sensitivity Badge Helper
  const getSensitivityConfig = (sens: string) => {
    const s = (sens || 'ROBUST').toUpperCase();
    if (s.includes('HIGHLY')) {
      return { label: 'HIGHLY SENSITIVE', style: 'bg-rose-950/80 text-rose-300 border-rose-800' };
    }
    if (s.includes('SENSITIVE')) {
      return { label: 'SENSITIVE', style: 'bg-amber-950/80 text-amber-300 border-amber-800' };
    }
    return { label: 'ROBUST', style: 'bg-emerald-950/80 text-emerald-300 border-emerald-800' };
  };

  const statusConfig = getStatusConfig(reassessmentStatus);
  const dataModeConfig = getDataModeConfig(dataMode);
  const sensConfig = getSensitivityConfig(decisionSensitivity);
  const StatusIcon = statusConfig.icon;

  const formattedTimestamp = timestamp
    ? new Date(timestamp).toISOString().replace('T', ' ').substring(0, 19) + ' UTC'
    : 'Live Reference';

  return (
    <div
      data-testid="decision-reassessment-panel"
      className="bg-slate-900/95 backdrop-blur border border-slate-700/70 rounded-xl p-5 text-slate-200 shadow-2xl space-y-4"
    >
      {/* Panel Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3.5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-cyan-400 shadow-inner">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100 tracking-wide uppercase flex items-center gap-2">
              Decision Reassessment State
            </h3>
            <p className="text-xs text-slate-400">
              Continuous evaluation of decision stability & material environmental changes
            </p>
          </div>
        </div>

        {/* Provenance & Data Mode Badges */}
        <div className="flex items-center gap-2">
          <span
            data-testid="data-mode-badge"
            className={`px-2.5 py-1 rounded text-xs font-mono font-bold border ${dataModeConfig.style}`}
          >
            {dataModeConfig.label}
          </span>
          <span
            data-testid="provenance-badge"
            className="px-2 py-1 rounded text-[11px] font-mono text-slate-400 bg-slate-950 border border-slate-800"
          >
            {provenance}
          </span>
        </div>
      </div>

      {/* Prominent Status Banner */}
      <div
        data-testid="reassessment-status-banner"
        className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${statusConfig.bannerStyle}`}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg border ${statusConfig.style}`}>
            <StatusIcon className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span
                data-testid="reassessment-status-badge"
                className={`px-3 py-0.5 rounded-md text-sm font-mono font-extrabold border ${statusConfig.style}`}
              >
                {statusConfig.badgeText}
              </span>
              <span className="text-xs font-mono text-slate-400">
                Status Assessment
              </span>
            </div>
            <p className="text-xs mt-1 font-medium text-slate-300">
              {statusConfig.subLabel}
            </p>
          </div>
        </div>

        {/* Decision Sensitivity Badge */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-[10px] font-mono text-slate-400 uppercase">
            Sensitivity:
          </span>
          <span
            data-testid="decision-sensitivity-badge"
            className={`px-2.5 py-1 rounded text-xs font-mono font-bold border ${sensConfig.style}`}
          >
            {sensConfig.label}
          </span>
        </div>
      </div>

      {/* Natural Language Explanation Card */}
      <div className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-4 shadow-inner">
        <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
          <FileText className="w-4 h-4 text-cyan-400" />
          Reassessment Rationale & Explanation
        </h4>
        <p
          data-testid="reassessment-explanation"
          className="text-xs text-slate-200 leading-relaxed font-sans"
        >
          {explanation || 'Decision state is STABLE. No material changes in hazards, confidence, or uncertainty envelope.'}
        </p>
      </div>

      {/* Key Metrics Grid: Uncertainty & Hazard Impact */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Uncertainty Change Summary */}
        <div
          data-testid="uncertainty-comparison"
          className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-2 text-xs"
        >
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
              Uncertainty Change
            </span>
            {uncertaintyChange?.hasExpandedMaterially ? (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-800">
                MATERIAL EXPANSION
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-900 text-slate-400 border border-slate-800">
                WITHIN BOUNDS
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-[10px] font-mono text-slate-400 uppercase block">Previous Radius</span>
              <span className="font-mono font-bold text-slate-300">
                {uncertaintyChange?.previousRadiusNm !== null && uncertaintyChange?.previousRadiusNm !== undefined
                  ? `${uncertaintyChange.previousRadiusNm.toFixed(1)} nm`
                  : 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-mono text-slate-400 uppercase block">Current Radius</span>
              <span className="font-mono font-bold text-amber-300">
                {uncertaintyChange?.currentRadiusNm !== null && uncertaintyChange?.currentRadiusNm !== undefined
                  ? `${uncertaintyChange.currentRadiusNm.toFixed(1)} nm`
                  : 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-mono text-slate-400 uppercase block">Radius Delta</span>
              <span className="font-mono font-bold text-slate-300">
                {uncertaintyChange?.deltaNm !== null && uncertaintyChange?.deltaNm !== undefined
                  ? `${uncertaintyChange.deltaNm > 0 ? '+' : ''}${uncertaintyChange.deltaNm.toFixed(1)} nm`
                  : '0.0 nm'}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-mono text-slate-400 uppercase block">Expansion %</span>
              <span className="font-mono font-bold text-cyan-300">
                {uncertaintyChange?.expansionPct !== null && uncertaintyChange?.expansionPct !== undefined
                  ? `${uncertaintyChange.expansionPct > 0 ? '+' : ''}${uncertaintyChange.expansionPct.toFixed(1)}%`
                  : '0.0%'}
              </span>
            </div>
          </div>
        </div>

        {/* Hazard & CPA Impact Summary */}
        <div
          data-testid="hazard-cpa-impact"
          className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-2 text-xs"
        >
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              Hazard & CPA Impact
            </span>
            {hazardImpact?.hasSeverityIncreased || hazardImpact?.hasCpaDroppedMaterially ? (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-800">
                MATERIAL HAZARD SHIFT
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-900 text-slate-400 border border-slate-800">
                HAZARD STABLE
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-[10px] font-mono text-slate-400 uppercase block">Severity Shift</span>
              <span className="font-mono font-bold text-slate-300">
                {hazardImpact?.previousSeverity || 'NONE'} → {hazardImpact?.currentSeverity || 'NONE'}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-mono text-slate-400 uppercase block">CPA Distance</span>
              <span className="font-mono font-bold text-cyan-300">
                {hazardImpact?.previousCpaNm !== null && hazardImpact?.previousCpaNm !== undefined
                  ? `${hazardImpact.previousCpaNm.toFixed(1)} nm`
                  : 'N/A'}{' '}
                →{' '}
                {hazardImpact?.currentCpaNm !== null && hazardImpact?.currentCpaNm !== undefined
                  ? `${hazardImpact.currentCpaNm.toFixed(1)} nm`
                  : 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-mono text-slate-400 uppercase block">CPA Delta</span>
              <span className="font-mono font-bold text-slate-300">
                {hazardImpact?.cpaDeltaNm !== null && hazardImpact?.cpaDeltaNm !== undefined
                  ? `${hazardImpact.cpaDeltaNm > 0 ? '+' : ''}${hazardImpact.cpaDeltaNm.toFixed(1)} nm`
                  : '0.0 nm'}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-mono text-slate-400 uppercase block">Primary Hazard ID</span>
              <span className="font-mono font-bold text-amber-300 truncate block">
                {hazardImpact?.affectedHazardId || 'None assigned'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Trigger Reasons List */}
      <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5">
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-cyan-400" />
          Trigger Reasons & Evaluated Drivers
        </h4>

        {triggerReasons.length > 0 ? (
          <ul data-testid="trigger-reasons-list" className="space-y-1.5 text-xs">
            {triggerReasons.map((reason, idx) => (
              <li
                key={`trigger-${idx}`}
                className="text-slate-300 bg-slate-900/80 border border-slate-800 rounded-lg px-3 py-1.5 flex items-start gap-2"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0 mt-1.5" />
                <span className="leading-snug">{reason}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p data-testid="empty-trigger-reasons" className="text-xs text-slate-400 italic">
            No active triggers. Parameters remain within standard baseline thresholds.
          </p>
        )}
      </div>

      {/* Changed Variables & Parameter Comparison Table */}
      {(changedVariables.length > 0 || Object.keys(previousValues).length > 0) && (
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-2">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            Parameter State Comparison
          </h4>

          {/* Changed variables pill list */}
          {changedVariables.length > 0 && (
            <div data-testid="changed-variables-list" className="flex flex-wrap items-center gap-1.5 text-xs mb-2">
              <span className="text-[10px] font-mono text-slate-400 uppercase">Changed:</span>
              {changedVariables.map((v) => (
                <span key={v} className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-800 text-cyan-300 border border-slate-700">
                  {v}
                </span>
              ))}
            </div>
          )}

          {/* Previous vs Current values table */}
          {Object.keys(previousValues).length > 0 && (
            <div className="overflow-x-auto" data-testid="previous-vs-current-table">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-mono text-[10px] uppercase">
                    <th className="py-1.5 px-2">Variable</th>
                    <th className="py-1.5 px-2">Previous State</th>
                    <th className="py-1.5 px-2">Current State</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {Object.keys(previousValues).map((key) => (
                    <tr key={key} className="hover:bg-slate-900/50">
                      <td className="py-1.5 px-2 text-slate-300 font-bold">{key}</td>
                      <td className="py-1.5 px-2 text-slate-400">{String(previousValues[key])}</td>
                      <td className="py-1.5 px-2 text-amber-300 font-bold">{String(currentValues[key])}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Footer Mandatory Safety Disclaimer Notice */}
      <div
        data-testid="navigator-disclaimer"
        className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 text-[11px] text-slate-300 leading-normal flex items-center justify-between gap-2"
      >
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>
            <strong className="text-slate-200">Decision Support Notice: </strong>
            CRYO NAV provides decision support. Route changes require navigator review.
          </span>
        </div>
        <span className="text-[10px] font-mono text-slate-400 shrink-0">{formattedTimestamp}</span>
      </div>
    </div>
  );
};
