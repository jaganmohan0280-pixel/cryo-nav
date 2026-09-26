import React, { useState } from 'react';
import {
  NavigationAssistantContextResult,
  StructuredAnswers,
  ContextDataMode,
  MANDATORY_NAVIGATOR_DISCLAIMER,
} from '../../services/navigationAssistantContextEngine';
import {
  Bot,
  ShieldCheck,
  HelpCircle,
  AlertTriangle,
  Compass,
  Ship,
  Route,
  Activity,
  CheckCircle2,
  Database,
  Info,
  Layers,
} from 'lucide-react';

export interface NavigationAssistantPanelProps {
  contextResult?: NavigationAssistantContextResult | null;
}

export type QuestionKey = keyof StructuredAnswers;

export interface QuestionDefinition {
  key: QuestionKey;
  label: string;
}

export const QUESTION_DEFINITIONS: QuestionDefinition[] = [
  { key: 'whyCurrentRouteRecommended', label: 'Why is this route recommended?' },
  { key: 'majorHazardsAffectingRoute', label: 'What hazards affect my route?' },
  { key: 'currentConfidenceAndFreshness', label: 'How confident is the current decision?' },
  { key: 'uncertaintyAffectingDecision', label: 'What uncertainty affects this decision?' },
  { key: 'satelliteDataThatCouldAffectDecision', label: 'What data could change the decision?' },
  { key: 'routeResilienceOrSensitivity', label: 'Is this route resilient?' },
  { key: 'monitoringOrReassessmentRecommendation', label: 'Does the system recommend reassessment?' },
  { key: 'limitationsNavigatorShouldKnow', label: 'What limitations should I know?' },
];

export const NavigationAssistantPanel: React.FC<NavigationAssistantPanelProps> = ({
  contextResult,
}) => {
  const [selectedQuestionKey, setSelectedQuestionKey] = useState<QuestionKey>(
    'whyCurrentRouteRecommended'
  );

  const getDataModeBadgeClass = (mode: ContextDataMode) => {
    switch (mode) {
      case 'REAL':
        return 'bg-emerald-950/80 text-emerald-400 border-emerald-700/80';
      case 'SIMULATED':
        return 'bg-blue-950/80 text-blue-400 border-blue-700/80';
      case 'HYBRID':
        return 'bg-purple-950/80 text-purple-400 border-purple-700/80';
      case 'UNAVAILABLE':
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  const isContextAvailable =
    contextResult &&
    (contextResult.missionContext.title !== 'No active mission configured' ||
      contextResult.routeContext.activeRouteId !== null ||
      contextResult.dataMode !== 'UNAVAILABLE');

  const selectedAnswer = contextResult?.structuredAnswers?.[selectedQuestionKey] || '';

  return (
    <div
      data-testid="navigation-assistant-panel"
      className="bg-slate-900/95 border border-cyan-800/50 rounded-xl p-5 shadow-2xl backdrop-blur-md text-slate-100 space-y-5 font-sans"
    >
      {/* 1. Assistant Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-cyan-950/80 border border-cyan-700/60 rounded-xl text-cyan-400 shadow-inner">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h3
              data-testid="assistant-header-title"
              className="text-base font-extrabold text-white tracking-wide uppercase flex items-center gap-2"
            >
              CRYO NAV AI ASSISTANT
            </h3>
            <p className="text-xs text-cyan-400 font-medium">
              Decision Support — Navigator Authority Retained
            </p>
          </div>
        </div>

        {contextResult && (
          <div className="flex items-center space-x-2 self-start sm:self-auto">
            <span className="text-xs font-semibold text-slate-400 font-mono">Data Mode:</span>
            <span
              data-testid={`provenance-badge-${contextResult.dataMode.toLowerCase()}`}
              className={`px-2.5 py-1 rounded text-xs font-mono font-bold border ${getDataModeBadgeClass(
                contextResult.dataMode
              )}`}
            >
              {contextResult.dataMode}
            </span>
          </div>
        )}
      </div>

      {/* Navigator Authority Mandatory Disclaimer */}
      <div
        data-testid="navigator-authority-disclaimer"
        className="bg-slate-950/90 border border-cyan-900/80 p-3 rounded-lg text-xs text-cyan-200 flex items-start space-x-2.5"
      >
        <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <div className="leading-snug font-medium">
          <span className="font-bold text-cyan-300 block mb-0.5">OPERATIONAL MANDATE:</span>
          {MANDATORY_NAVIGATOR_DISCLAIMER}
        </div>
      </div>

      {/* 2. Context Summary Bar */}
      {!isContextAvailable ? (
        <div
          data-testid="assistant-context-unavailable"
          className="bg-slate-950/80 border border-amber-900/60 rounded-lg p-6 text-center space-y-3"
        >
          <div className="inline-flex p-3 bg-amber-950/60 border border-amber-800 rounded-full text-amber-400">
            <Database className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-amber-400 tracking-wider uppercase">
            ASSISTANT CONTEXT UNAVAILABLE
          </h4>
          <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
            Environmental evidence and navigation decision state required to answer operational inquiries are currently unavailable.
          </p>
          <div className="pt-1 flex justify-center">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-mono border bg-gray-800 text-gray-400 border-gray-700">
              CONTEXT DATA MODE: UNAVAILABLE
            </span>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Quick Context Chips */}
          <div
            data-testid="current-context-summary"
            className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-950/80 p-3.5 rounded-lg border border-slate-800 text-xs font-mono"
          >
            <div data-testid="context-mission" className="space-y-0.5">
              <span className="text-[10px] text-slate-500 uppercase block font-sans font-bold">Mission:</span>
              <span className="text-white font-bold truncate block">
                {contextResult.missionContext.title}
              </span>
            </div>

            <div data-testid="context-vessel" className="space-y-0.5">
              <span className="text-[10px] text-slate-500 uppercase block font-sans font-bold">Vessel:</span>
              <span className="text-slate-200 font-bold truncate block">
                {contextResult.vesselContext.vesselName} ({contextResult.vesselContext.iceClass.split(' ')[0]})
              </span>
            </div>

            <div data-testid="context-route" className="space-y-0.5">
              <span className="text-[10px] text-slate-500 uppercase block font-sans font-bold">Active Route:</span>
              <span className="text-cyan-400 font-bold truncate block">
                {contextResult.routeContext.activeRouteName || 'None'} ({contextResult.routeContext.distanceNm ? `${contextResult.routeContext.distanceNm} nm` : 'N/A'})
              </span>
            </div>

            <div data-testid="context-confidence" className="space-y-0.5">
              <span className="text-[10px] text-slate-500 uppercase block font-sans font-bold">Confidence:</span>
              <span
                className={`font-bold block ${
                  contextResult.confidenceContext.overallLevel === 'HIGH'
                    ? 'text-emerald-400'
                    : contextResult.confidenceContext.overallLevel === 'MEDIUM'
                    ? 'text-sky-400'
                    : contextResult.confidenceContext.overallLevel === 'LOW'
                    ? 'text-amber-400'
                    : 'text-rose-400'
                }`}
              >
                {contextResult.confidenceContext.overallLevel} ({contextResult.confidenceContext.confidenceScore ? `${contextResult.confidenceContext.confidenceScore}/100` : 'N/A'})
              </span>
            </div>
          </div>

          {/* 3. Quick Question Buttons (8 Phase 16A Questions) */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-cyan-400" /> Operational Inquiries (Select to inspect structured evidence):
            </div>

            <div
              data-testid="quick-questions-grid"
              className="grid grid-cols-1 sm:grid-cols-2 gap-2"
            >
              {QUESTION_DEFINITIONS.map((q) => {
                const isSelected = selectedQuestionKey === q.key;
                return (
                  <button
                    key={q.key}
                    type="button"
                    data-testid={`question-btn-${q.key}`}
                    onClick={() => setSelectedQuestionKey(q.key)}
                    className={`p-2.5 rounded-lg text-xs font-semibold text-left transition-all duration-200 flex items-center justify-between border ${
                      isSelected
                        ? 'bg-cyan-950/90 text-cyan-300 border-cyan-600 shadow-md ring-1 ring-cyan-500/50'
                        : 'bg-slate-950/60 text-slate-300 hover:text-white hover:bg-slate-800/80 border-slate-800'
                    }`}
                  >
                    <span className="line-clamp-1">{q.label}</span>
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 ml-1.5" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Structured Answer Area */}
          <div
            data-testid="answer-area"
            className="bg-slate-950 p-4 rounded-xl border border-cyan-900/60 space-y-2"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <Bot className="w-4 h-4 text-cyan-400" /> Structured Evidence Explanation:
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                Deterministic Context Output
              </span>
            </div>

            <p
              data-testid="selected-answer-text"
              className="text-xs text-slate-200 leading-relaxed font-sans font-medium whitespace-pre-wrap pt-1"
            >
              {selectedAnswer}
            </p>
          </div>

          {/* 5. Evidence Section (Supporting Metrics for Selected Question) */}
          <div
            data-testid="evidence-section"
            className="bg-slate-950/70 p-3.5 rounded-lg border border-slate-800 space-y-2.5"
          >
            <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-cyan-400" /> Underlying Evidence Metrics:
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
              {/* Route Risk */}
              {contextResult.routeContext.riskIndex != null && (
                <div data-testid="evidence-route-risk" className="bg-slate-900/80 p-2.5 rounded border border-slate-800 space-y-0.5">
                  <span className="text-[10px] text-slate-500 block uppercase">Route Risk</span>
                  <span className="text-white font-bold">{contextResult.routeContext.riskIndex}/100</span>
                </div>
              )}

              {/* CPA */}
              {contextResult.hazardContext.nearestIcebergCpaNm != null && (
                <div data-testid="evidence-cpa" className="bg-slate-900/80 p-2.5 rounded border border-slate-800 space-y-0.5">
                  <span className="text-[10px] text-slate-500 block uppercase">Nearest CPA</span>
                  <span className="text-amber-400 font-bold">{contextResult.hazardContext.nearestIcebergCpaNm.toFixed(1)} nm</span>
                </div>
              )}

              {/* Uncertainty Radius */}
              {contextResult.uncertaintyContext.uncertaintyRadiusNm != null && (
                <div data-testid="evidence-uncertainty-radius" className="bg-slate-900/80 p-2.5 rounded border border-slate-800 space-y-0.5">
                  <span className="text-[10px] text-slate-500 block uppercase">Uncertainty Envelope</span>
                  <span className="text-cyan-400 font-bold">±{contextResult.uncertaintyContext.uncertaintyRadiusNm.toFixed(1)} nm</span>
                </div>
              )}

              {/* Confidence Score */}
              {contextResult.confidenceContext.confidenceScore != null && (
                <div data-testid="evidence-confidence-score" className="bg-slate-900/80 p-2.5 rounded border border-slate-800 space-y-0.5">
                  <span className="text-[10px] text-slate-500 block uppercase">Confidence Score</span>
                  <span className="text-emerald-400 font-bold">{contextResult.confidenceContext.confidenceScore}/100</span>
                </div>
              )}

              {/* Resilience Score */}
              {contextResult.resilienceContext.resilienceScore != null && (
                <div data-testid="evidence-resilience-score" className="bg-slate-900/80 p-2.5 rounded border border-slate-800 space-y-0.5">
                  <span className="text-[10px] text-slate-500 block uppercase">Resilience Index</span>
                  <span className="text-emerald-300 font-bold">{contextResult.resilienceContext.resilienceScore}/100</span>
                </div>
              )}

              {/* Route Sensitivity */}
              {contextResult.resilienceContext.sensitivityClassification !== 'UNAVAILABLE' && (
                <div data-testid="evidence-sensitivity" className="bg-slate-900/80 p-2.5 rounded border border-slate-800 space-y-0.5">
                  <span className="text-[10px] text-slate-500 block uppercase">Route Sensitivity</span>
                  <span className="text-amber-300 font-bold">{contextResult.resilienceContext.sensitivityClassification}</span>
                </div>
              )}

              {/* Acquisition Priority */}
              {contextResult.dataAcquisitionContext.highestPriorityProduct && (
                <div data-testid="evidence-acquisition-priority" className="bg-slate-900/80 p-2.5 rounded border border-slate-800 space-y-0.5 col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-slate-500 block uppercase">Top Acquisition Priority</span>
                  <span className="text-purple-300 font-bold truncate block">
                    {contextResult.dataAcquisitionContext.highestPriorityProduct.sensor} ({contextResult.dataAcquisitionContext.highestPriorityProduct.priority})
                  </span>
                </div>
              )}

              {/* Reassessment Status */}
              {contextResult.reassessmentContext.recommendationStatus !== 'UNAVAILABLE' && (
                <div data-testid="evidence-reassessment-status" className="bg-slate-900/80 p-2.5 rounded border border-slate-800 space-y-0.5 col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-slate-500 block uppercase">Reassessment Status</span>
                  <span className="text-cyan-300 font-bold">{contextResult.reassessmentContext.recommendationStatus}</span>
                </div>
              )}

              {/* Critical Alert Severity */}
              {contextResult.alertContext.totalAlertsCount > 0 && (
                <div data-testid="evidence-alerts-count" className="bg-slate-900/80 p-2.5 rounded border border-slate-800 space-y-0.5 col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-slate-500 block uppercase">Active Alerts</span>
                  <span className="text-rose-400 font-bold">
                    {contextResult.alertContext.totalAlertsCount} Total ({contextResult.alertContext.criticalAlertsCount} Critical)
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
