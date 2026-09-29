import React from 'react';
import {
  NavigationDecisionState,
  MANDATORY_DECISION_STATE_DISCLAIMER,
} from '../../services/navigationDecisionStateEngine';
import {
  Shield,
  ShieldCheck,
  AlertTriangle,
  Compass,
  Layers,
  Activity,
  Radio,
  FileCheck,
  Database,
  Info,
  Clock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export interface NavigationDecisionStatePanelProps {
  decisionState?: NavigationDecisionState | null;
}

export const NavigationDecisionStatePanel: React.FC<NavigationDecisionStatePanelProps> = ({
  decisionState,
}) => {
  const isAvailable = Boolean(
    decisionState && decisionState.overallDataMode !== 'UNAVAILABLE'
  );

  const overallMode = decisionState?.overallDataMode || 'UNAVAILABLE';

  // Helper for status colors
  const getStatusBadgeStyle = (status?: string) => {
    switch (status) {
      case 'STABLE':
        return 'bg-[#EAF0EB] text-[#52715B] border-[#52715B]/30';
      case 'MONITOR':
        return 'bg-[#E5ECEE] text-[#526F78] border-[#526F78]/30';
      case 'REASSESS':
        return 'bg-[#F3EEE2] text-[#9A7945] border-[#9A7945]/30';
      case 'RECOMMEND_REVIEW':
      case 'RECOMMEND REVIEW':
        return 'bg-[#F3E5E3] text-[#A45750] border-[#A45750]/30';
      default:
        return 'bg-[#F3F0E8] text-[#596267] border-[#D4D1C7]';
    }
  };

  const getSensitivityBadgeStyle = (sensitivity?: string) => {
    switch (sensitivity) {
      case 'ROBUST':
        return 'bg-[#EAF0EB] text-[#52715B] border-[#52715B]/30';
      case 'SENSITIVE':
        return 'bg-[#F3EEE2] text-[#9A7945] border-[#9A7945]/30';
      case 'HIGHLY_SENSITIVE':
      case 'HIGHLY SENSITIVE':
        return 'bg-[#F3E5E3] text-[#A45750] border-[#A45750]/30';
      default:
        return 'bg-[#F3F0E8] text-[#596267] border-[#D4D1C7]';
    }
  };

  const getModeBadgeStyle = (mode?: string) => {
    switch (mode) {
      case 'REAL':
        return 'bg-[#EAF0EB] text-[#52715B] border-[#52715B]/30';
      case 'HYBRID':
        return 'bg-[#E5ECEE] text-[#526F78] border-[#526F78]/30';
      case 'SIMULATED':
        return 'bg-[#F3EEE2] text-[#9A7945] border-[#9A7945]/30';
      default:
        return 'bg-[#F3F0E8] text-[#858C90] border-[#D4D1C7]';
    }
  };

  return (
    <div
      data-testid="decision-state-panel"
      className="bg-[#FCFBF7] text-[#263238] p-5 rounded-[8px] border border-[#D4D1C7] space-y-5 font-sans shadow-2xs"
    >
      {/* Panel Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2DFD6] pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-[#E1ECEB] border border-[#315E62]/20 rounded-[6px] text-[#315E62]">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h3
              data-testid="panel-title"
              className="text-base font-semibold text-[#263238] font-sans"
            >
              Current Navigation Decision State
            </h3>
            <p className="text-xs text-[#596267]">
              System-level decision support aggregation across operational engines
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-sans">
          <span
            data-testid="overall-provenance-badge"
            className={`px-2.5 py-1 rounded-[4px] font-semibold border ${getModeBadgeStyle(
              overallMode
            )}`}
          >
            {`Data mode: ${overallMode}`}
          </span>
        </div>
      </div>

      {!isAvailable || !decisionState ? (
        /* Empty / Unavailable State */
        <div
          data-testid="decision-state-unavailable"
          className="bg-[#F3F0E8] border border-[#D4D1C7] rounded-[6px] p-6 text-center space-y-3"
        >
          <div className="inline-flex p-3 bg-[#FCFBF7] border border-[#D4D1C7] rounded-full text-[#9A7945]">
            <Database className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-semibold text-[#263238]">
            Navigation decision state unavailable
          </h4>
          <p className="text-xs text-[#596267] max-w-md mx-auto leading-relaxed">
            Source information required to compute system decision state is currently incomplete or offline. Missing streams: Active Route, Voyage State, or Hazard Intelligence inputs.
          </p>
          <div className="pt-1 flex justify-center">
            <span className="px-2.5 py-0.5 rounded text-xs border bg-[#FCFBF7] text-[#858C90] border-[#D4D1C7]">
              System mode: Unavailable
            </span>
          </div>
          <div
            data-testid="navigator-disclaimer"
            className="p-3 bg-[#FCFBF7] border border-[#D4D1C7] rounded-[6px] text-xs text-[#596267] flex items-start gap-2.5 text-left mt-3"
          >
            <Shield className="w-4 h-4 text-[#315E62] shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              {MANDATORY_DECISION_STATE_DISCLAIMER}
            </p>
          </div>
        </div>
      ) : (
        /* Complete Aggregation View */
        <div className="space-y-4">
          {/* Top Status & Sensitivity Bar */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* 1. Decision Status Card */}
            <div
              data-testid="card-decision-status"
              className="bg-[#FCFBF7] p-4 rounded-[6px] border border-[#D4D1C7] space-y-2 shadow-2xs"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#596267] tracking-tight">
                  1. Decision status
                </span>
                <span
                  data-testid="decision-status-badge"
                  className={`px-2.5 py-0.5 rounded-[4px] text-xs font-semibold border ${getStatusBadgeStyle(
                    decisionState.decisionStatus
                  )}`}
                >
                  {decisionState.decisionStatus === 'RECOMMEND_REVIEW'
                    ? 'Recommend review'
                    : decisionState.decisionStatus === 'STABLE'
                    ? 'Stable'
                    : decisionState.decisionStatus === 'MONITOR'
                    ? 'Monitor'
                    : decisionState.decisionStatus === 'REASSESS'
                    ? 'Reassess'
                    : decisionState.decisionStatus}
                </span>
              </div>
              <div className="text-xs space-y-1">
                <div className="flex items-start gap-1.5 text-[#364148]">
                  <Info className="w-3.5 h-3.5 text-[#315E62] shrink-0 mt-0.5" />
                  <p data-testid="decision-status-reason" className="leading-snug">
                    {decisionState.reassessmentSummary.primaryTrigger ||
                      'All navigation decision parameters evaluated and stable.'}
                  </p>
                </div>
                <p className="text-[11px] text-[#858C90]">
                  Note: Decision status reflects operational reassessment criteria (not a probability or safety score).
                </p>
              </div>
            </div>

            {/* 2. Decision Sensitivity Card */}
            <div
              data-testid="card-decision-sensitivity"
              className="bg-[#FCFBF7] p-4 rounded-[6px] border border-[#D4D1C7] space-y-2 shadow-2xs"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#596267] tracking-tight">
                  2. Decision sensitivity
                </span>
                <span
                  data-testid="decision-sensitivity-badge"
                  className={`px-2.5 py-0.5 rounded-[4px] text-xs font-semibold border ${getSensitivityBadgeStyle(
                    decisionState.decisionSensitivity
                  )}`}
                >
                  {decisionState.decisionSensitivity === 'HIGHLY_SENSITIVE'
                    ? 'Highly sensitive'
                    : decisionState.decisionSensitivity === 'ROBUST'
                    ? 'Robust'
                    : decisionState.decisionSensitivity === 'SENSITIVE'
                    ? 'Sensitive'
                    : decisionState.decisionSensitivity}
                </span>
              </div>
              <div className="text-xs space-y-1">
                <p className="text-[#364148] leading-snug">
                  Route resilience sensitivity:{' '}
                  <span className="font-semibold text-[#263238]">
                    {decisionState.resilienceSummary.dominantScenario
                      ? `Most sensitive to ${decisionState.resilienceSummary.dominantScenario}`
                      : 'Robust under counterfactual perturbations'}
                  </span>
                </p>
                <p className="text-[11px] text-[#858C90]">
                  Evaluated across 6 standard cryospheric scenario perturbations (+20% current, +20% drift).
                </p>
              </div>
            </div>
          </div>

          {/* Grid of Engine Summaries */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            {/* 3. Active Route Summary */}
            <div
              data-testid="section-active-route"
              className="bg-[#FCFBF7] p-3.5 rounded-[6px] border border-[#D4D1C7] space-y-2 font-sans shadow-2xs"
            >
              <div className="flex items-center justify-between border-b border-[#E2DFD6] pb-1.5">
                <span className="font-semibold text-[#315E62] text-xs uppercase tracking-tight">
                  3. Active route
                </span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-semibold border ${getModeBadgeStyle(
                    decisionState.activeRoute.dataMode
                  )}`}
                >
                  {decisionState.activeRoute.dataMode}
                </span>
              </div>
              <div className="space-y-1 text-[#364148]">
                <div className="flex justify-between">
                  <span className="text-[#596267]">Route name:</span>
                  <span className="font-semibold text-[#263238] truncate max-w-[140px]">
                    {decisionState.activeRoute.routeName || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#596267]">Distance:</span>
                  <span className="font-semibold text-[#263238]">
                    {decisionState.activeRoute.distanceNm != null
                      ? `${decisionState.activeRoute.distanceNm} nm`
                      : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#596267]">ETA:</span>
                  <span className="font-semibold text-[#263238]">
                    {decisionState.activeRoute.etaHours != null
                      ? `${decisionState.activeRoute.etaHours} h`
                      : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#596267]">Modeled risk index:</span>
                  <span className="font-semibold text-[#315E62]">
                    {decisionState.activeRoute.riskIndex != null
                      ? `${decisionState.activeRoute.riskIndex} / 100`
                      : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#596267]">Recommendation:</span>
                  <span
                    className={`font-semibold ${
                      decisionState.activeRoute.isRecommended
                        ? 'text-[#52715B]'
                        : 'text-[#9A7945]'
                    }`}
                  >
                    {decisionState.activeRoute.isRecommended ? 'Recommended' : 'Alternative'}
                  </span>
                </div>
              </div>
            </div>

            {/* 4. Hazard Summary */}
            <div
              data-testid="section-hazards"
              className="bg-slate-950/70 p-3 rounded-lg border border-slate-800 space-y-2 font-mono"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                <span className="font-bold text-cyan-400 text-[11px] uppercase tracking-wider font-sans">
                  4. HAZARD SUMMARY
                </span>
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded font-bold border ${getModeBadgeStyle(
                    decisionState.hazardSummary.dataMode
                  )}`}
                >
                  {decisionState.hazardSummary.dataMode}
                </span>
              </div>
              <div className="space-y-1 text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Total Hazards:</span>
                  <span className="font-bold text-white">
                    {decisionState.hazardSummary.totalHazards}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Critical / High:</span>
                  <span className="font-bold text-amber-400">
                    {decisionState.hazardSummary.criticalHazards} / {decisionState.hazardSummary.highHazards}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Minimum CPA:</span>
                  <span className="font-bold text-cyan-300">
                    {decisionState.hazardSummary.minimumCpaNm != null
                      ? `${decisionState.hazardSummary.minimumCpaNm} nm`
                      : 'None'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Earliest TCA:</span>
                  <span className="font-bold text-slate-200">
                    {decisionState.hazardSummary.earliestTcaHours != null
                      ? `+${decisionState.hazardSummary.earliestTcaHours} h`
                      : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Primary Hazard:</span>
                  <span className="font-bold text-slate-200 truncate max-w-[130px]">
                    {decisionState.hazardSummary.primaryHazardName || 'None'}
                  </span>
                </div>
              </div>
            </div>

            {/* 5. Uncertainty & Confidence */}
            <div
              data-testid="section-uncertainty-confidence"
              className="bg-slate-950/70 p-3 rounded-lg border border-slate-800 space-y-2 font-mono"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                <span className="font-bold text-cyan-400 text-[11px] uppercase tracking-wider font-sans">
                  5. UNCERTAINTY & CONFIDENCE
                </span>
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded font-bold border ${getModeBadgeStyle(
                    decisionState.uncertaintySummary.dataMode
                  )}`}
                >
                  {decisionState.uncertaintySummary.dataMode}
                </span>
              </div>
              <div className="space-y-1 text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Uncertainty Radius:</span>
                  <span className="font-bold text-cyan-300">
                    {decisionState.uncertaintySummary.largestUncertaintyRadiusNm != null
                      ? `±${decisionState.uncertaintySummary.largestUncertaintyRadiusNm} nm`
                      : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Forecast Horizon:</span>
                  <span className="font-bold text-slate-200">
                    {decisionState.uncertaintySummary.forecastHorizonHours != null
                      ? `+${decisionState.uncertaintySummary.forecastHorizonHours} h`
                      : '0 h'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Confidence Level:</span>
                  <span className="font-bold text-emerald-400">
                    {decisionState.confidenceSummary.overallLevel}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Data Freshness:</span>
                  <span className="font-bold text-slate-200">
                    {decisionState.uncertaintySummary.freshnessState}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Caution Level:</span>
                  <span className="font-bold text-amber-400">
                    {decisionState.uncertaintySummary.cautionLevel}
                  </span>
                </div>
              </div>
            </div>

            {/* 6. Data Acquisition */}
            <div
              data-testid="section-acquisition"
              className="bg-slate-950/70 p-3 rounded-lg border border-slate-800 space-y-2 font-mono"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                <span className="font-bold text-cyan-400 text-[11px] uppercase tracking-wider font-sans">
                  6. DATA ACQUISITION
                </span>
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded font-bold border ${getModeBadgeStyle(
                    decisionState.acquisitionSummary.dataMode
                  )}`}
                >
                  {decisionState.acquisitionSummary.dataMode}
                </span>
              </div>
              <div className="space-y-1 text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Priority Product:</span>
                  <span className="font-bold text-white truncate max-w-[130px]">
                    {decisionState.acquisitionSummary.highestPriorityProduct || 'None'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span
                    data-testid="engineering-priority-label"
                    className="text-slate-500 font-sans text-[10px]"
                  >
                    Engineering Priority Index — not a probability:
                  </span>
                  <span className="font-bold text-cyan-300">
                    {decisionState.acquisitionSummary.priorityIndex != null
                      ? `${decisionState.acquisitionSummary.priorityIndex} / 100`
                      : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Expected Uncertainty Δ:</span>
                  <span className="font-bold text-emerald-400">
                    {decisionState.acquisitionSummary.expectedUncertaintyReductionPct != null
                      ? `-${decisionState.acquisitionSummary.expectedUncertaintyReductionPct}%`
                      : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Connectivity:</span>
                  <span className="font-bold text-slate-200">
                    {decisionState.acquisitionSummary.connectivityState}
                  </span>
                </div>
              </div>
            </div>

            {/* 7. Reassessment */}
            <div
              data-testid="section-reassessment"
              className="bg-slate-950/70 p-3 rounded-lg border border-slate-800 space-y-2 font-mono"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                <span className="font-bold text-cyan-400 text-[11px] uppercase tracking-wider font-sans">
                  7. REASSESSMENT
                </span>
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded font-bold border ${getModeBadgeStyle(
                    decisionState.reassessmentSummary.dataMode
                  )}`}
                >
                  {decisionState.reassessmentSummary.dataMode}
                </span>
              </div>
              <div className="space-y-1 text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Reassessment Status:</span>
                  <span
                    className={`font-bold ${getStatusBadgeStyle(
                      decisionState.reassessmentSummary.status
                    )} px-1.5 py-0.5 rounded text-[10px]`}
                  >
                    {decisionState.reassessmentSummary.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Primary Trigger:</span>
                  <span className="font-bold text-slate-200 truncate max-w-[130px]">
                    {decisionState.reassessmentSummary.primaryTrigger}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Changed Variables:</span>
                  <span className="font-bold text-slate-200">
                    {decisionState.reassessmentSummary.changedVariables.length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Navigator Review:</span>
                  <span
                    className={`font-bold ${
                      decisionState.reassessmentSummary.requiresNavigatorReview
                        ? 'text-amber-400'
                        : 'text-slate-400'
                    }`}
                  >
                    {decisionState.reassessmentSummary.requiresNavigatorReview
                      ? 'REQUIRED'
                      : 'ROUTINE'}
                  </span>
                </div>
              </div>
            </div>

            {/* 8. Route Resilience */}
            <div
              data-testid="section-resilience"
              className="bg-slate-950/70 p-3 rounded-lg border border-slate-800 space-y-2 font-mono"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                <span className="font-bold text-cyan-400 text-[11px] uppercase tracking-wider font-sans">
                  8. ROUTE RESILIENCE
                </span>
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded font-bold border ${getModeBadgeStyle(
                    decisionState.resilienceSummary.dataMode
                  )}`}
                >
                  {decisionState.resilienceSummary.dataMode}
                </span>
              </div>
              <div className="space-y-1 text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Resilience Index:</span>
                  <span className="font-bold text-cyan-300">
                    {decisionState.resilienceSummary.resilienceScore != null
                      ? `${decisionState.resilienceSummary.resilienceScore} / 100`
                      : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Sensitivity:</span>
                  <span
                    className={`font-bold ${getSensitivityBadgeStyle(
                      decisionState.resilienceSummary.sensitivity
                    )} px-1.5 py-0.5 rounded text-[10px]`}
                  >
                    {decisionState.resilienceSummary.sensitivity}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Dominant Scenario:</span>
                  <span className="font-bold text-slate-200 truncate max-w-[130px]">
                    {decisionState.resilienceSummary.dominantScenario || 'None'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Max Risk Delta:</span>
                  <span className="font-bold text-slate-200">
                    {decisionState.resilienceSummary.maxRiskDelta != null
                      ? `+${decisionState.resilienceSummary.maxRiskDelta}%`
                      : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* 9. Navigation Alerts */}
            <div
              data-testid="section-alerts"
              className="bg-slate-950/70 p-3 rounded-lg border border-slate-800 space-y-2 font-mono"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                <span className="font-bold text-cyan-400 text-[11px] uppercase tracking-wider font-sans">
                  9. NAVIGATION ALERTS
                </span>
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded font-bold border ${getModeBadgeStyle(
                    decisionState.alertSummary.dataMode
                  )}`}
                >
                  {decisionState.alertSummary.dataMode}
                </span>
              </div>
              <div className="space-y-1 text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Total Alerts:</span>
                  <span className="font-bold text-white">
                    {decisionState.alertSummary.totalAlerts}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Critical Alerts:</span>
                  <span
                    className={`font-bold ${
                      decisionState.alertSummary.criticalCount > 0
                        ? 'text-red-400'
                        : 'text-slate-300'
                    }`}
                  >
                    {decisionState.alertSummary.criticalCount}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Warning / Advisory:</span>
                  <span className="font-bold text-amber-400">
                    {decisionState.alertSummary.warningCount} / {decisionState.alertSummary.advisoryCount}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Info Alerts:</span>
                  <span className="font-bold text-slate-400">
                    {decisionState.alertSummary.infoCount}
                  </span>
                </div>
              </div>
            </div>

            {/* 10. Model Validation */}
            <div
              data-testid="section-model-validation"
              className="bg-slate-950/70 p-3 rounded-lg border border-slate-800 space-y-2 font-mono"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                <span
                  data-testid="retrospective-validation-label"
                  className="font-bold text-cyan-400 text-[10px] uppercase tracking-wider font-sans"
                >
                  10. RETROSPECTIVE MODEL VALIDATION
                </span>
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded font-bold border ${getModeBadgeStyle(
                    decisionState.validationSummary.dataMode
                  )}`}
                >
                  {decisionState.validationSummary.dataMode}
                </span>
              </div>
              <div className="space-y-1 text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Predictions Evaluated:</span>
                  <span className="font-bold text-white">
                    {decisionState.validationSummary.totalEvaluatedPredictions}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Matched Obs:</span>
                  <span className="font-bold text-slate-200">
                    {decisionState.validationSummary.matchedObservationsCount}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">MAE / RMSE:</span>
                  <span className="font-bold text-cyan-300">
                    {decisionState.validationSummary.meanAbsoluteError != null
                      ? `${decisionState.validationSummary.meanAbsoluteError} nm`
                      : 'N/A'}{' '}
                    /{' '}
                    {decisionState.validationSummary.rootMeanSquareError != null
                      ? `${decisionState.validationSummary.rootMeanSquareError} nm`
                      : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Uncertainty Coverage:</span>
                  <span className="font-bold text-emerald-400">
                    {decisionState.validationSummary.uncertaintyCoverageRatePct != null
                      ? `${decisionState.validationSummary.uncertaintyCoverageRatePct}%`
                      : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Validation Status:</span>
                  <span className="font-bold text-slate-200">
                    {decisionState.validationSummary.overallStatus}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Mandatory Navigator Authority Disclaimer */}
          <div
            data-testid="navigator-disclaimer"
            className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 flex items-start gap-2.5"
          >
            <Shield className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              {MANDATORY_DECISION_STATE_DISCLAIMER}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
