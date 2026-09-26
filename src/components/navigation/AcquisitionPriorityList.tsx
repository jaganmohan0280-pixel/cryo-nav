/**
 * CRYO NAV — Decision-Impact Data Acquisition Priority List
 * Phase 11B — Data Acquisition Candidate List Component
 *
 * Renders ranked candidate data products with:
 * - Engineering Priority Index (0–100) — strictly labeled, NOT a probability
 * - Priority Level (CRITICAL, HIGH, MEDIUM, LOW)
 * - Affected Decision & Route
 * - Uncertainty Addressed
 * - Expected Decision Impact & Uncertainty Reduction (%)
 * - Bandwidth Fit (Within current budget vs Exceeds current budget)
 * - Availability Status & Connectivity Constraint Awareness
 * - SAR Evidence Terminology (SAR evidence/candidate regions, NEVER confirmed icebergs)
 * - Data Provenance (REAL, SIMULATED, HYBRID)
 */

import React from 'react';
import {
  Satellite,
  Database,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Wifi,
  WifiOff,
  RefreshCw,
  HardDrive,
  Info,
  ShieldAlert,
  ArrowUpRight,
  Layers,
  Radio,
  FileText,
} from 'lucide-react';
import { AcquisitionCandidate, ProductAvailabilityStatus } from '../../services/decisionImpactAcquisitionEngine';
import { ConnectionState, DataAcquisitionPriority } from '../../types';

export interface AcquisitionPriorityListProps {
  candidates?: AcquisitionCandidate[] | null;
  connectionState?: ConnectionState | string | null;
  availableBandwidthMb?: number | null;
  onAcquireRequest?: (candidate: AcquisitionCandidate) => void;
  emptyReason?: 'NO_CANDIDATES' | 'UNAVAILABLE' | string;
}

export const AcquisitionPriorityList: React.FC<AcquisitionPriorityListProps> = ({
  candidates,
  connectionState = 'ONLINE',
  availableBandwidthMb = null,
  onAcquireRequest,
  emptyReason = 'NO_CANDIDATES',
}) => {
  // Empty state handling
  if (!candidates || candidates.length === 0) {
    if (emptyReason === 'UNAVAILABLE') {
      return (
        <div
          data-testid="unavailable-candidates-message"
          className="bg-slate-950/60 border border-slate-800 rounded-xl p-6 text-center text-slate-400"
        >
          <Satellite className="w-8 h-8 text-slate-500 mx-auto mb-2 opacity-60" />
          <p className="text-sm font-medium text-slate-300">
            Available satellite data could not be identified for the current decision.
          </p>
          <p className="text-xs text-slate-500 mt-1">
            No discoverable acquisitions overlap the active route corridor or address current uncertainty zones.
          </p>
        </div>
      );
    }

    return (
      <div
        data-testid="empty-candidates-message"
        className="bg-slate-950/60 border border-slate-800 rounded-xl p-6 text-center text-slate-400"
      >
        <Database className="w-8 h-8 text-slate-500 mx-auto mb-2 opacity-60" />
        <p className="text-sm font-medium text-slate-300">
          No decision-impacting acquisition candidates available.
        </p>
        <p className="text-xs text-slate-500 mt-1">
          Current environmental data freshness and confidence are sufficient for the active navigation corridor.
        </p>
      </div>
    );
  }

  // Priority Badge Styling Helper
  const getPriorityBadgeConfig = (priority: DataAcquisitionPriority) => {
    switch (priority) {
      case 'CRITICAL':
        return {
          label: 'CRITICAL',
          testId: 'priority-badge-critical',
          style: 'bg-rose-500/20 text-rose-300 border-rose-500/50',
          icon: ShieldAlert,
        };
      case 'HIGH':
        return {
          label: 'HIGH',
          testId: 'priority-badge-high',
          style: 'bg-amber-500/20 text-amber-300 border-amber-500/50',
          icon: AlertTriangle,
        };
      case 'MEDIUM':
        return {
          label: 'MEDIUM',
          testId: 'priority-badge-medium',
          style: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50',
          icon: Info,
        };
      case 'LOW':
      default:
        return {
          label: 'LOW',
          testId: 'priority-badge-low',
          style: 'bg-slate-800 text-slate-300 border-slate-700',
          icon: CheckCircle2,
        };
    }
  };

  // Availability Status Helper
  const getAvailabilityConfig = (
    status: ProductAvailabilityStatus,
    withinBudget: boolean,
    connState: string
  ) => {
    if (connState === 'OFFLINE') {
      return {
        label: 'Ready when connected',
        style: 'bg-rose-950/80 text-rose-300 border-rose-800',
        badgeText: 'OFFLINE QUEUED',
      };
    }
    if (connState === 'SYNCING') {
      return {
        label: 'Ready when connected / sync in progress',
        style: 'bg-cyan-950/80 text-cyan-300 border-cyan-800',
        badgeText: 'SYNCING',
      };
    }
    if (connState === 'LIMITED') {
      if (!withinBudget) {
        return {
          label: 'Exceeds bandwidth budget (Constrained)',
          style: 'bg-amber-950/80 text-amber-300 border-amber-800',
          badgeText: 'BANDWIDTH LIMITED',
        };
      }
      return {
        label: 'Acquisition constrained by bandwidth/connectivity',
        style: 'bg-amber-950/60 text-amber-300 border-amber-800',
        badgeText: 'LIMITED FIT',
      };
    }

    switch (status) {
      case 'ACQUIRED':
        return {
          label: 'Acquired & Cached Locally',
          style: 'bg-emerald-950/80 text-emerald-300 border-emerald-800',
          badgeText: 'ACQUIRED',
        };
      case 'EXCEEDS_BANDWIDTH':
        return {
          label: 'Exceeds bandwidth budget',
          style: 'bg-amber-950/80 text-amber-300 border-amber-800',
          badgeText: 'EXCEEDS BUDGET',
        };
      case 'READY_WHEN_CONNECTED':
        return {
          label: 'Ready when connected',
          style: 'bg-rose-950/80 text-rose-300 border-rose-800',
          badgeText: 'READY WHEN CONNECTED',
        };
      case 'DOWNLINK_UNAVAILABLE':
        return {
          label: 'Downlink unavailable',
          style: 'bg-slate-900 text-slate-400 border-slate-700',
          badgeText: 'UNAVAILABLE',
        };
      case 'AVAILABLE_FOR_DOWNLINK':
      default:
        return {
          label: 'Available for downlink',
          style: 'bg-emerald-950/60 text-emerald-300 border-emerald-800',
          badgeText: 'AVAILABLE',
        };
    }
  };

  // Provenance Helper
  const getProvenanceConfig = (prov?: string) => {
    if (!prov) return { label: 'REAL', style: 'bg-emerald-950 text-emerald-300 border-emerald-700' };
    const p = prov.toUpperCase();
    if (p.includes('REAL')) {
      return { label: 'REAL', style: 'bg-emerald-950 text-emerald-300 border-emerald-700' };
    }
    if (p.includes('SIMULAT') || p.includes('SYNTHETIC') || p.includes('TEST')) {
      return { label: 'SIMULATED', style: 'bg-amber-950 text-amber-300 border-amber-700' };
    }
    if (p.includes('HYBRID')) {
      return { label: 'HYBRID', style: 'bg-sky-950 text-sky-300 border-sky-700' };
    }
    return { label: p, style: 'bg-slate-800 text-slate-300 border-slate-700' };
  };

  return (
    <div className="space-y-4" data-testid="acquisition-priority-list">
      {candidates.map((candidate, idx) => {
        const priorityConfig = getPriorityBadgeConfig(candidate.priority);
        const availConfig = getAvailabilityConfig(
          candidate.availabilityStatus,
          candidate.withinBandwidthBudget,
          connectionState
        );
        const provConfig = getProvenanceConfig(candidate.provenance);
        const PriorityIcon = priorityConfig.icon;

        return (
          <div
            key={candidate.productId || `candidate-${idx}`}
            data-testid={`acquisition-candidate-card-${candidate.productId}`}
            className="bg-slate-950/70 border border-slate-800 hover:border-slate-700 rounded-xl p-4 transition-all shadow-lg text-slate-200"
          >
            {/* Header Row */}
            <div className="flex flex-wrap items-start justify-between gap-3 mb-3 border-b border-slate-800/80 pb-3">
              <div className="flex items-start gap-2.5">
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-cyan-400 mt-0.5">
                  <Satellite className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-bold text-slate-100 font-mono tracking-tight">
                      {candidate.productName}
                    </h4>
                    <span
                      data-testid="provenance-badge"
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${provConfig.style}`}
                    >
                      {provConfig.label}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                    <span>{candidate.sensor}</span>
                    <span>•</span>
                    <span>{candidate.productType}</span>
                    <span>•</span>
                    <span data-testid="acquisition-size" className="font-mono text-slate-300">
                      {`${candidate.acquisitionCostMb} MB`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Priority & Engineering Score */}
              <div className="flex items-center gap-2">
                <div
                  data-testid={priorityConfig.testId}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border flex items-center gap-1.5 ${priorityConfig.style}`}
                >
                  <PriorityIcon className="w-3.5 h-3.5" />
                  <span>{`${priorityConfig.label} PRIORITY`}</span>
                </div>
              </div>
            </div>

            {/* Engineering Priority Index Metric Bar */}
            <div className="bg-slate-900/80 border border-slate-800/80 rounded-lg p-3 mb-3.5">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  Engineering Priority Index
                </span>
                <span
                  data-testid="engineering-priority-index"
                  className="font-mono font-extrabold text-cyan-300 text-sm"
                >
                  {`${candidate.engineeringPriorityIndex} / 100`}
                </span>
              </div>
              {/* Progress bar */}
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    candidate.engineeringPriorityIndex >= 75
                      ? 'bg-rose-500'
                      : candidate.engineeringPriorityIndex >= 55
                      ? 'bg-amber-400'
                      : candidate.engineeringPriorityIndex >= 35
                      ? 'bg-cyan-400'
                      : 'bg-slate-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(5, candidate.engineeringPriorityIndex))}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Composite downlink priority index based on spatial overlap, uncertainty reduction potential & route sensitivity.
                (Not a hazard or collision probability).
              </p>
            </div>

            {/* Impact Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3 text-xs">
              {/* Affected Decision */}
              <div className="bg-slate-900/50 border border-slate-800/60 rounded-lg p-2.5">
                <span className="text-[10px] font-mono text-slate-400 uppercase block mb-0.5">
                  Affected Decision
                </span>
                <span data-testid="affected-decision" className="font-medium text-slate-200">
                  {candidate.affectedDecision}
                </span>
              </div>

              {/* Uncertainty Addressed */}
              <div className="bg-slate-900/50 border border-slate-800/60 rounded-lg p-2.5">
                <span className="text-[10px] font-mono text-slate-400 uppercase block mb-0.5">
                  Uncertainty Addressed
                </span>
                <span data-testid="uncertainty-addressed" className="font-medium text-amber-300">
                  {candidate.uncertaintyAddressed}
                </span>
              </div>

              {/* Expected Decision Impact */}
              <div className="bg-slate-900/50 border border-slate-800/60 rounded-lg p-2.5">
                <span className="text-[10px] font-mono text-slate-400 uppercase block mb-0.5">
                  Expected Decision Impact
                </span>
                <span data-testid="expected-decision-impact" className="font-medium text-cyan-300">
                  {candidate.expectedDecisionImpact}
                </span>
              </div>

              {/* Expected Uncertainty Reduction */}
              <div className="bg-slate-900/50 border border-slate-800/60 rounded-lg p-2.5">
                <span className="text-[10px] font-mono text-slate-400 uppercase block mb-0.5">
                  Expected Uncertainty Reduction
                </span>
                <span data-testid="uncertainty-reduction" className="font-mono font-bold text-emerald-300">
                  {`-${candidate.expectedUncertaintyReductionPct}%`}
                </span>
              </div>
            </div>

            {/* Bandwidth & Product Availability Status Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-3">
              {/* Bandwidth Fit */}
              <div
                data-testid="bandwidth-status"
                className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${
                  candidate.withinBandwidthBudget
                    ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-300'
                    : 'bg-amber-950/30 border-amber-800/60 text-amber-300'
                }`}
              >
                <span className="flex items-center gap-1.5 font-medium">
                  <HardDrive className="w-3.5 h-3.5" />
                  Bandwidth Budget:
                </span>
                <span className="font-mono font-bold">
                  {candidate.withinBandwidthBudget ? 'Within current budget' : 'Exceeds current budget'}
                </span>
              </div>

              {/* Product Availability */}
              <div
                data-testid="product-availability"
                className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${availConfig.style}`}
              >
                <span className="flex items-center gap-1.5 font-medium">
                  <Radio className="w-3.5 h-3.5" />
                  Availability:
                </span>
                <span className="font-mono font-bold">{availConfig.label}</span>
              </div>
            </div>

            {/* Explanation & Reason for Priority */}
            <div className="bg-slate-900/70 border border-slate-800/80 rounded-lg p-3 text-xs mb-3">
              <span className="font-bold text-slate-300 flex items-center gap-1.5 mb-1">
                <FileText className="w-3.5 h-3.5 text-cyan-400" />
                Reason for Priority:
              </span>
              <p data-testid="acquisition-explanation" className="text-slate-300 leading-relaxed font-sans">
                {candidate.reason}
              </p>
            </div>

            {/* SAR Evidence Terminology Banner (Explicit Scientific Distinction) */}
            {candidate.sarEvidenceNote && (
              <div
                data-testid="sar-evidence-note"
                className="bg-sky-950/30 border border-sky-800/40 rounded-lg p-2.5 text-[11px] text-sky-200/90 leading-normal flex items-start gap-2 mb-3"
              >
                <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-sky-300">SAR Evidence Distinction: </span>
                  {candidate.sarEvidenceNote}
                </div>
              </div>
            )}

            {/* Action / Downlink Button (Optional callback hook) */}
            {onAcquireRequest && (
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => onAcquireRequest(candidate)}
                  disabled={!candidate.withinBandwidthBudget || connectionState === 'OFFLINE'}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
                    !candidate.withinBandwidthBudget || connectionState === 'OFFLINE'
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                      : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-md'
                  }`}
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>Acquire available product</span>
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
