/**
 * CRYO NAV — Route Resilience & Counterfactual Analysis UI Component
 * Phase 13B — Presentational Navigation Component
 *
 * Core Responsibility:
 * Displays the deterministic counterfactual sensitivity evaluation produced by
 * routeResilienceEngine.ts for the active route corridor.
 *
 * Communicates:
 * - Active Route Identification (ID & Name)
 * - Engineering Resilience Index (0–100) & Non-Guarantee Disclaimer
 * - Route Sensitivity Classification (ROBUST, SENSITIVE, HIGHLY_SENSITIVE)
 * - Per-Scenario Perturbation Counterfactual Results (Risk Delta, ETA Delta, Fuel Delta, Feasibility)
 * - Dominant Sensitivity Scenario & Max Risk Delta
 * - Aggregate Scenario Metrics (Average Risk Delta, Feasible / Total Scenario Counts)
 * - Scientific Data Provenance & Mode (REAL, SIMULATED, HYBRID, UNAVAILABLE)
 * - Counterfactual Language & Navigator Authority Disclaimers
 *
 * STRICT SAFETY & NAVIGATION RULES:
 * - Counterfactual Analysis ONLY: Does NOT alter active route, waypoints, or speed.
 * - Neutral Engineering Language ONLY: Strictly avoids "safe", "optimal", "guaranteed", or "probability of collision".
 * - Mandatory Disclaimers:
 *   1. "Engineering Resilience Index. Not a probability or safety guarantee."
 *   2. "Counterfactual analysis does not modify the active route."
 *   3. "Route changes require navigator review."
 */

import React, { useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Activity,
  Info,
  Layers,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Compass,
  Zap,
  BarChart2,
  Lock,
  Radio,
} from 'lucide-react';
import {
  RouteResilienceEvaluationResult,
  RouteSensitivityClassification,
  DataMode,
  ScenarioResilienceResult,
} from '../../services/routeResilienceEngine';

export interface RouteResiliencePanelProps {
  evaluationResult?: RouteResilienceEvaluationResult | null;
  result?: RouteResilienceEvaluationResult | null; // Alias for flexibility
  compact?: boolean;
}

export const RouteResiliencePanel: React.FC<RouteResiliencePanelProps> = ({
  evaluationResult,
  result,
  compact = false,
}) => {
  const activeResult = evaluationResult || result || null;
  const [isExpanded, setIsExpanded] = useState<boolean>(!compact);

  // Empty state handling
  if (!activeResult || !activeResult.scenarioResults || activeResult.scenarioResults.length === 0) {
    return (
      <div
        data-testid="route-resilience-panel-empty"
        className="bg-slate-900/90 backdrop-blur border border-slate-700/60 rounded-xl p-4 text-slate-200 shadow-xl"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-cyan-400 font-medium">
            <Activity className="w-5 h-5 text-cyan-400" />
            <span className="font-bold tracking-wide uppercase text-sm text-slate-100" data-testid="panel-title">
              Route Resilience & Counterfactual Analysis
            </span>
          </div>
          <span
            data-testid="data-mode-badge"
            className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700 uppercase"
          >
            {activeResult?.dataMode || 'UNAVAILABLE'}
          </span>
        </div>

        <p className="text-xs text-slate-400 my-3" data-testid="no-resilience-data-message">
          No counterfactual route resilience analysis available for the active route.
        </p>

        <div className="mt-3 pt-2 border-t border-slate-800 text-[11px] text-slate-400 space-y-1">
          <p data-testid="route-immutability-disclaimer">
            Counterfactual analysis does not modify the active route.
          </p>
          <p data-testid="navigator-review-disclaimer">
            Route changes require navigator review.
          </p>
        </div>
      </div>
    );
  }

  const {
    routeId,
    routeName,
    resilienceScore,
    sensitivityClassification,
    dominantSensitivityScenarioName,
    maxRiskDelta,
    scenarioResults,
    averageRiskDelta,
    feasibleScenarioCount,
    totalScenarioCount,
    dataMode = 'SIMULATED',
    provenance = 'Phase 13A Engine',
  } = activeResult;

  // Sensitivity Badge Config
  const getSensitivityBadge = (classification: RouteSensitivityClassification) => {
    switch (classification) {
      case 'ROBUST':
        return {
          label: 'ROBUST',
          bgClass: 'bg-emerald-950/80 border-emerald-500/50 text-emerald-400',
          icon: <ShieldCheck className="w-4 h-4 text-emerald-400" />,
          description: 'Route displays low sensitivity across tested perturbation scenarios.',
        };
      case 'SENSITIVE':
        return {
          label: 'SENSITIVE',
          bgClass: 'bg-amber-950/80 border-amber-500/50 text-amber-400',
          icon: <AlertTriangle className="w-4 h-4 text-amber-400" />,
          description: 'Route displays moderate risk deltas under environmental perturbations.',
        };
      case 'HIGHLY_SENSITIVE':
        return {
          label: 'HIGHLY_SENSITIVE',
          bgClass: 'bg-rose-950/80 border-rose-500/50 text-rose-400',
          icon: <ShieldAlert className="w-4 h-4 text-rose-400" />,
          description: 'Route exhibits high vulnerability or unfeasibility under tested perturbations.',
        };
      default:
        return {
          label: classification,
          bgClass: 'bg-slate-800 border-slate-700 text-slate-300',
          icon: <Info className="w-4 h-4 text-slate-400" />,
          description: 'Sensitivity evaluation complete.',
        };
    }
  };

  const sensitivityBadge = getSensitivityBadge(sensitivityClassification);

  // Provenance Badge Styling
  const getProvenanceBadgeClass = (mode: DataMode) => {
    switch (mode) {
      case 'REAL':
        return 'bg-emerald-900/60 border-emerald-600/70 text-emerald-300';
      case 'HYBRID':
        return 'bg-cyan-900/60 border-cyan-600/70 text-cyan-300';
      case 'SIMULATED':
        return 'bg-purple-900/60 border-purple-600/70 text-purple-300';
      case 'UNAVAILABLE':
      default:
        return 'bg-slate-800 border-slate-700 text-slate-400';
    }
  };

  return (
    <div
      data-testid="route-resilience-panel"
      className="bg-slate-900/90 backdrop-blur border border-slate-700/60 rounded-xl p-4 text-slate-200 shadow-xl space-y-4"
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-cyan-400" />
          <div>
            <h3
              data-testid="panel-title"
              className="font-bold tracking-wide uppercase text-sm text-slate-100 flex items-center gap-2"
            >
              Route Resilience & Counterfactual Analysis
            </h3>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
              <span>Active Route:</span>
              <span data-testid="active-route-name" className="font-semibold text-cyan-300">
                {routeName}
              </span>
              <span data-testid="active-route-id" className="text-[10px] text-slate-500 font-mono">
                ({routeId})
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            data-testid="data-mode-badge"
            className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${getProvenanceBadgeClass(dataMode)}`}
          >
            {dataMode}
          </span>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 transition-colors"
            aria-label="Toggle details"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Primary Score & Sensitivity Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Score Card */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span data-testid="engineering-index-label">Engineering Resilience Index</span>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span data-testid="resilience-score" className="text-3xl font-black text-slate-100 font-mono">
                {resilienceScore}
              </span>
              <span className="text-xs text-slate-500">/ 100</span>
            </div>
            <p data-testid="engineering-disclaimer" className="text-[10px] text-slate-500 mt-1 italic">
              Not a probability or safety guarantee.
            </p>
          </div>

          <div className="text-right">
            <div className="text-[10px] text-slate-400 uppercase font-medium mb-1">Classification</div>
            <div
              data-testid="sensitivity-classification"
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border ${sensitivityBadge.bgClass}`}
            >
              {sensitivityBadge.icon}
              <span>{sensitivityBadge.label}</span>
            </div>
          </div>
        </div>

        {/* Dominant Vulnerability & Aggregates */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3 space-y-2">
          <div data-testid="dominant-sensitivity" className="flex items-start justify-between text-xs">
            <span className="text-slate-400">Dominant Sensitivity:</span>
            <span data-testid="dominant-scenario-name" className="font-semibold text-amber-300 text-right">
              {dominantSensitivityScenarioName}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs border-t border-slate-800/80 pt-1.5">
            <span className="text-slate-400">Max Risk Delta:</span>
            <span data-testid="max-risk-delta" className="font-mono font-bold text-rose-400">
              {`+${maxRiskDelta.toFixed(1)} pts`}
            </span>
          </div>
          <div data-testid="aggregate-metrics" className="flex items-center justify-between text-xs pt-0.5">
            <span className="text-slate-400">Avg Risk Delta:</span>
            <span data-testid="average-risk-delta" className="font-mono text-cyan-300">
              {`+${averageRiskDelta.toFixed(1)} pts`}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
            <span>Feasible Scenarios:</span>
            <span data-testid="feasible-scenario-count" className="font-mono font-medium text-emerald-400">
              {feasibleScenarioCount} / {totalScenarioCount}
            </span>
          </div>
        </div>
      </div>

      {/* Expanded Scenario Details */}
      {isExpanded && (
        <div className="space-y-3 border-t border-slate-800 pt-3">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
            <span className="flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              Counterfactual Scenario Perturbations
            </span>
            <span className="text-[10px] text-slate-500 font-normal">
              Tested under deterministic perturbations
            </span>
          </div>

          {/* Scenario Cards */}
          <div data-testid="scenario-results-list" className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {scenarioResults.map((scenario: ScenarioResilienceResult) => (
              <div
                key={scenario.scenarioId}
                data-testid={`scenario-card-${scenario.scenarioId}`}
                className="bg-slate-950/40 border border-slate-800/80 hover:border-slate-700/80 rounded-lg p-2.5 text-xs transition-colors"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                    <span>{scenario.scenarioName}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    <span
                      data-testid={`scenario-feasibility-${scenario.scenarioId}`}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        scenario.isFeasibleUnderPerturbation
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                          : 'bg-rose-950 text-rose-400 border border-rose-800/60'
                      }`}
                    >
                      {scenario.isFeasibleUnderPerturbation ? 'FEASIBLE' : 'UNFEASIBLE'}
                    </span>
                    <span
                      data-testid={`scenario-risk-delta-${scenario.scenarioId}`}
                      className={`font-bold ${scenario.riskDelta > 0 ? 'text-rose-400' : 'text-emerald-400'}`}
                    >
                      {`Risk ${scenario.riskDelta >= 0 ? '+' : ''}${scenario.riskDelta.toFixed(1)}`}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 mb-2 leading-relaxed">
                  Under the tested perturbation, {scenario.explanation}
                </p>

                {/* Key Metric Deltas */}
                <div className="grid grid-cols-4 gap-2 bg-slate-900/60 rounded p-1.5 text-[10px] font-mono text-slate-300">
                  <div>
                    <span className="text-slate-500 block">ETA Delta</span>
                    <span className="font-semibold">
                      {`${scenario.etaDeltaHours >= 0 ? '+' : ''}${scenario.etaDeltaHours.toFixed(1)}h`}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Fuel Delta</span>
                    <span className="font-semibold">
                      {`${scenario.fuelDeltaTons >= 0 ? '+' : ''}${scenario.fuelDeltaTons.toFixed(1)}t`}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Uncertainty</span>
                    <span
                      data-testid={`scenario-uncertainty-delta-${scenario.scenarioId}`}
                      className="font-semibold"
                    >
                      {`${scenario.uncertaintyDelta >= 0 ? '+' : ''}${scenario.uncertaintyDelta.toFixed(1)}`}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Min CPA</span>
                    <span className="font-semibold">{scenario.counterfactualMinCpaNm.toFixed(1)} nm</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer Provenance & Mandatory Safety Disclaimers */}
      <div className="border-t border-slate-800/80 pt-3 space-y-1.5 text-[11px] text-slate-400">
        <div className="flex items-center justify-between text-[10px] text-slate-400">
          <span className="flex items-center gap-1">
            <Radio className="w-3 h-3 text-cyan-400" />
            <span data-testid="provenance-badge">Provenance: {provenance}</span>
          </span>
          <span className="text-slate-400 font-mono">Counterfactual Engine v13B</span>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded p-2 text-slate-400 space-y-1">
          <div className="flex items-start gap-1.5">
            <Lock className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p data-testid="route-immutability-disclaimer" className="font-medium text-slate-300">
                Counterfactual analysis does not modify the active route.
              </p>
              <p data-testid="navigator-review-disclaimer" className="text-slate-400">
                Route changes require navigator review.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
