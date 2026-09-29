import React, { useState } from 'react';
import {
  NavigationAssistantContextResult,
  StructuredAnswers,
  ContextDataMode,
  MANDATORY_NAVIGATOR_DISCLAIMER,
} from '../../services/navigationAssistantContextEngine';
import {
  LlmExplanationResult,
  SERVICE_UNAVAILABLE_MESSAGE,
} from '../../services/navigationAssistantLlm';
import {
  Bot,
  ShieldCheck,
  HelpCircle,
  AlertTriangle,
  Activity,
  CheckCircle2,
  Database,
  Send,
  Sparkles,
  Info,
  Radio,
} from 'lucide-react';

export interface NavigationAssistantPanelProps {
  contextResult?: NavigationAssistantContextResult | null;
  onAskQuery?: (query: string) => Promise<LlmExplanationResult | null>;
  llmResult?: LlmExplanationResult | null;
  isLoadingLlm?: boolean;
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
  onAskQuery,
  llmResult,
  isLoadingLlm = false,
}) => {
  const [selectedQuestionKey, setSelectedQuestionKey] = useState<QuestionKey>(
    'whyCurrentRouteRecommended'
  );
  const [customInputQuery, setCustomInputQuery] = useState<string>('');

  const getDataModeBadgeClass = (mode: ContextDataMode) => {
    switch (mode) {
      case 'REAL':
        return 'bg-[#EEF4EF] text-[#4F6F52] border-[#D5E4D7]';
      case 'SIMULATED':
        return 'bg-[#F7F2E5] text-[#9A7B32] border-[#E8DFC9]';
      case 'HYBRID':
        return 'bg-[#EEF2F4] text-[#526B7A] border-[#D5DEE2]';
      case 'UNAVAILABLE':
      default:
        return 'bg-[#F7ECEC] text-[#A65353] border-[#EAD2D2]';
    }
  };

  const isContextAvailable =
    contextResult &&
    (contextResult.missionContext.title !== 'No active mission configured' ||
      contextResult.routeContext.activeRouteId !== null ||
      contextResult.dataMode !== 'UNAVAILABLE');

  const selectedAnswer = contextResult?.structuredAnswers?.[selectedQuestionKey] || '';

  const handleSelectQuestion = (q: QuestionDefinition) => {
    setSelectedQuestionKey(q.key);
    if (onAskQuery) {
      onAskQuery(q.label);
    }
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInputQuery.trim() || isLoadingLlm) return;
    if (onAskQuery) {
      onAskQuery(customInputQuery.trim());
    }
  };

  return (
    <div
      data-testid="navigation-assistant-panel"
      className="bg-white border border-[#E3E3E0] rounded-[8px] p-5 text-[#202124] space-y-5 font-sans"
    >
      {/* 1. Assistant Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E3E3E0] pb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-[#EEF1F3] border border-[#E3E3E0] rounded-[6px] text-[#34495E]">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3
              data-testid="assistant-header-title"
              className="text-sm font-semibold text-[#202124] tracking-tight flex items-center gap-2"
            >
              CRYO NAV AI ASSISTANT
            </h3>
            <p className="text-xs text-[#6B6F72] font-normal">
              Decision Support — Navigator Authority Retained
            </p>
          </div>
        </div>

        {contextResult && (
          <div className="flex items-center space-x-2 self-start sm:self-auto">
            <span className="text-xs font-medium text-[#6B6F72]">Data Mode:</span>
            <span
              data-testid={`provenance-badge-${contextResult.dataMode.toLowerCase()}`}
              className={`px-2.5 py-0.5 rounded-[4px] text-xs font-medium border ${getDataModeBadgeClass(
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
        className="bg-[#F7F7F5] border border-[#E3E3E0] p-3 rounded-[6px] text-xs text-[#202124] flex items-start space-x-2.5"
      >
        <ShieldCheck className="w-4 h-4 text-[#34495E] shrink-0 mt-0.5" />
        <div className="leading-snug">
          <span className="font-semibold text-[#34495E] block mb-0.5">OPERATIONAL MANDATE:</span>
          {MANDATORY_NAVIGATOR_DISCLAIMER}
        </div>
      </div>

      {/* 2. Context Summary Bar */}
      {!isContextAvailable ? (
        <div
          data-testid="assistant-context-unavailable"
          className="bg-[#F7F7F5] border border-[#E3E3E0] rounded-[6px] p-6 text-center space-y-3"
        >
          <div className="inline-flex p-3 bg-[#EEF1F3] border border-[#E3E3E0] rounded-full text-[#526B7A]">
            <Database className="w-6 h-6" />
          </div>
          <h4 className="text-xs font-semibold text-[#202124] tracking-tight uppercase">
            ASSISTANT CONTEXT UNAVAILABLE
          </h4>
          <p className="text-xs text-[#6B6F72] max-w-md mx-auto leading-relaxed">
            Environmental evidence and navigation decision state required to answer operational inquiries are currently unavailable.
          </p>
          <div className="pt-1 flex justify-center">
            <span className="px-2.5 py-0.5 rounded-[4px] text-[10px] font-medium border bg-[#F7ECEC] text-[#A65353] border-[#EAD2D2]">
              CONTEXT DATA MODE: UNAVAILABLE
            </span>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Quick Context Chips */}
          <div
            data-testid="current-context-summary"
            className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-[#F7F7F5] p-3.5 rounded-[6px] border border-[#E3E3E0] text-xs"
          >
            <div data-testid="context-mission" className="space-y-0.5">
              <span className="text-[10px] text-[#8A8D90] uppercase block font-medium">Mission:</span>
              <span className="text-[#202124] font-semibold truncate block">
                {contextResult.missionContext.title}
              </span>
            </div>

            <div data-testid="context-vessel" className="space-y-0.5">
              <span className="text-[10px] text-[#8A8D90] uppercase block font-medium">Vessel:</span>
              <span className="text-[#202124] font-semibold truncate block">
                {contextResult.vesselContext.vesselName} ({contextResult.vesselContext.iceClass.split(' ')[0]})
              </span>
            </div>

            <div data-testid="context-route" className="space-y-0.5">
              <span className="text-[10px] text-[#8A8D90] uppercase block font-medium">Active Route:</span>
              <span className="text-[#34495E] font-semibold truncate block">
                {contextResult.routeContext.activeRouteName || 'None'} ({contextResult.routeContext.distanceNm ? `${contextResult.routeContext.distanceNm} nm` : 'N/A'})
              </span>
            </div>

            <div data-testid="context-confidence" className="space-y-0.5">
              <span className="text-[10px] text-[#8A8D90] uppercase block font-medium">Confidence:</span>
              <span
                className={`font-semibold block ${
                  contextResult.confidenceContext.overallLevel === 'HIGH'
                    ? 'text-[#4F6F52]'
                    : contextResult.confidenceContext.overallLevel === 'MEDIUM'
                    ? 'text-[#526B7A]'
                    : contextResult.confidenceContext.overallLevel === 'LOW'
                    ? 'text-[#9A7B32]'
                    : 'text-[#A65353]'
                }`}
              >
                {contextResult.confidenceContext.overallLevel} ({contextResult.confidenceContext.confidenceScore ? `${contextResult.confidenceContext.confidenceScore}/100` : 'N/A'})
              </span>
            </div>
          </div>

          {/* Operational Inquiry Shortcuts */}
          <div className="space-y-2">
            <span className="text-[11px] font-semibold text-[#6B6F72] block">
              Quick Operational Questions:
            </span>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Explain Current Decision', query: 'Explain current navigation decision state' },
                { label: 'Why is Route Confidence Low?', query: 'Why is route confidence low or degraded?' },
                { label: 'Compare Route Options', query: 'Compare route options (Safest vs Balanced vs Fastest)' },
                { label: 'Explain Current Hazards', query: 'Explain current hazards and iceberg risk' },
                { label: 'Why is More Data Needed?', query: 'Why is additional satellite data or observation needed?' },
                { label: 'Explain Offline Decision State', query: 'Explain offline decision state and cached data' },
              ].map((btn, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    if (onAskQuery) onAskQuery(btn.query);
                  }}
                  className="px-2.5 py-1.5 rounded-[5px] bg-[#FFFFFF] hover:bg-[#F3F4F3] border border-[#D7D9DA] text-[#34495E] text-xs font-medium transition flex items-center gap-1"
                >
                  <Info className="w-3.5 h-3.5 text-[#526B7A]" />
                  <span>{btn.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Natural Language Inquiry Form */}
          <div className="bg-[#F7F7F5] p-4 rounded-[6px] border border-[#E3E3E0] space-y-3">
            <div className="text-xs font-semibold text-[#34495E] flex items-center gap-1.5">
              <Bot className="w-4 h-4 text-[#34495E]" /> Natural Language Explanation Query:
            </div>

            <form onSubmit={handleCustomSubmit} className="flex gap-2">
              <input
                type="text"
                data-testid="llm-input-box"
                placeholder="Ask question about routes, iceberg uncertainty, satellite VoI, or resilience..."
                value={customInputQuery}
                onChange={(e) => setCustomInputQuery(e.target.value)}
                className="flex-1 bg-white border border-[#D9DCDD] rounded-[5px] px-3 py-1.5 text-xs text-[#202124] placeholder-[#8A8D90] focus:outline-none focus:border-[#526B7A] font-sans"
              />
              <button
                type="submit"
                data-testid="llm-ask-button"
                disabled={!customInputQuery.trim() || isLoadingLlm}
                className="px-3.5 py-1.5 rounded-[5px] bg-[#34495E] hover:bg-[#293B4A] disabled:bg-[#E3E3E0] disabled:text-[#8A8D90] text-white font-medium text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                {isLoadingLlm ? (
                  <Bot className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>Ask</span>
              </button>
            </form>
          </div>

          {/* LLM Explanation Output or Fallback Service State Banner */}
          {isLoadingLlm && (
            <div className="p-3.5 bg-[#F7F7F5] border border-[#E3E3E0] rounded-[6px] text-xs text-[#526B7A] flex items-center gap-2">
              <Bot className="w-4 h-4 animate-spin text-[#34495E]" />
              <span>Generating grounded natural-language explanation over structured evidence...</span>
            </div>
          )}

          {llmResult && (
            <div data-testid="llm-explanation-area" className="space-y-2">
              {(llmResult.isFallback || !llmResult.success) && (
                <div
                  data-testid="llm-service-unavailable-banner"
                  className="bg-[#F7F2E5] border border-[#E8DFC9] p-3 rounded-[6px] text-xs text-[#9A7B32] flex items-start gap-2"
                >
                  <AlertTriangle className="w-4 h-4 text-[#9A7B32] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block">SERVICE NOTICE:</span>
                    {SERVICE_UNAVAILABLE_MESSAGE}
                  </div>
                </div>
              )}

              <div className="bg-white p-4 rounded-[6px] border border-[#E3E3E0] space-y-2">
                <div className="flex items-center justify-between border-b border-[#ECECE9] pb-2 text-xs">
                  <span className="font-semibold text-[#34495E] flex items-center gap-1.5">
                    <Bot className="w-4 h-4 text-[#34495E]" /> Grounded Explanation:
                  </span>
                  <span className="text-[10px] text-[#8A8D90]">{llmResult.provenance}</span>
                </div>
                <p className="text-xs text-[#202124] font-medium leading-relaxed whitespace-pre-wrap pt-1">
                  {llmResult.explanation}
                </p>
              </div>
            </div>
          )}

          {/* Quick Question Buttons */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-[#4F555A] flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-[#34495E]" /> Operational Inquiries (Select to inspect structured evidence):
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
                    onClick={() => handleSelectQuestion(q)}
                    className={`p-2.5 rounded-[6px] text-xs font-medium text-left transition flex items-center justify-between border ${
                      isSelected
                        ? 'bg-[#EEF1F3] text-[#34495E] border-[#34495E]'
                        : 'bg-white text-[#4F555A] hover:bg-[#F7F7F5] border-[#E3E3E0]'
                    }`}
                  >
                    <span className="line-clamp-1">{q.label}</span>
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-[#34495E] shrink-0 ml-1.5" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Structured Answer Area */}
          <div
            data-testid="answer-area"
            className="bg-white p-4 rounded-[6px] border border-[#E3E3E0] space-y-2"
          >
            <div className="flex items-center justify-between border-b border-[#ECECE9] pb-2">
              <span className="text-xs font-semibold text-[#34495E] flex items-center gap-1.5">
                <Bot className="w-4 h-4 text-[#34495E]" /> Structured Evidence Explanation:
              </span>
              <span className="text-[10px] text-[#8A8D90]">
                Deterministic Context Output
              </span>
            </div>

            <p
              data-testid="selected-answer-text"
              className="text-xs text-[#202124] leading-relaxed font-normal whitespace-pre-wrap pt-1"
            >
              {selectedAnswer}
            </p>
          </div>

          {/* Evidence Section (Supporting Metrics) */}
          <div
            data-testid="evidence-section"
            className="bg-[#F7F7F5] p-3.5 rounded-[6px] border border-[#E3E3E0] space-y-2.5"
          >
            <div className="text-xs font-semibold text-[#4F555A] flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-[#34495E]" /> Underlying Evidence Metrics:
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {/* Route Risk */}
              {contextResult.routeContext.riskIndex != null && (
                <div data-testid="evidence-route-risk" className="bg-white p-2.5 rounded border border-[#E3E3E0] space-y-0.5">
                  <span className="text-[10px] text-[#8A8D90] block uppercase">Route Risk</span>
                  <span className="text-[#202124] font-semibold">{contextResult.routeContext.riskIndex}/100</span>
                </div>
              )}

              {/* CPA */}
              {contextResult.hazardContext.nearestIcebergCpaNm != null && (
                <div data-testid="evidence-cpa" className="bg-white p-2.5 rounded border border-[#E3E3E0] space-y-0.5">
                  <span className="text-[10px] text-[#8A8D90] block uppercase">Nearest CPA</span>
                  <span className="text-[#9A7B32] font-semibold">{contextResult.hazardContext.nearestIcebergCpaNm.toFixed(1)} nm</span>
                </div>
              )}

              {/* Uncertainty Radius */}
              {contextResult.uncertaintyContext.uncertaintyRadiusNm != null && (
                <div data-testid="evidence-uncertainty-radius" className="bg-white p-2.5 rounded border border-[#E3E3E0] space-y-0.5">
                  <span className="text-[10px] text-[#8A8D90] block uppercase">Uncertainty Envelope</span>
                  <span className="text-[#526B7A] font-semibold">±{contextResult.uncertaintyContext.uncertaintyRadiusNm.toFixed(1)} nm</span>
                </div>
              )}

              {/* Confidence Score */}
              {contextResult.confidenceContext.confidenceScore != null && (
                <div data-testid="evidence-confidence-score" className="bg-white p-2.5 rounded border border-[#E3E3E0] space-y-0.5">
                  <span className="text-[10px] text-[#8A8D90] block uppercase">Confidence Score</span>
                  <span className="text-[#4F6F52] font-semibold">{contextResult.confidenceContext.confidenceScore}/100</span>
                </div>
              )}

              {/* Resilience Score */}
              {contextResult.resilienceContext.resilienceScore != null && (
                <div data-testid="evidence-resilience-score" className="bg-white p-2.5 rounded border border-[#E3E3E0] space-y-0.5">
                  <span className="text-[10px] text-[#8A8D90] block uppercase">Resilience Index</span>
                  <span className="text-[#4F6F52] font-semibold">{contextResult.resilienceContext.resilienceScore}/100</span>
                </div>
              )}

              {/* Route Sensitivity */}
              {contextResult.resilienceContext.sensitivityClassification !== 'UNAVAILABLE' && (
                <div data-testid="evidence-sensitivity" className="bg-white p-2.5 rounded border border-[#E3E3E0] space-y-0.5">
                  <span className="text-[10px] text-[#8A8D90] block uppercase">Route Sensitivity</span>
                  <span className="text-[#9A7B32] font-semibold">{contextResult.resilienceContext.sensitivityClassification}</span>
                </div>
              )}

              {/* Acquisition Priority */}
              {contextResult.dataAcquisitionContext.highestPriorityProduct && (
                <div data-testid="evidence-acquisition-priority" className="bg-white p-2.5 rounded border border-[#E3E3E0] space-y-0.5 col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-[#8A8D90] block uppercase">Top Acquisition Priority</span>
                  <span className="text-[#34495E] font-semibold truncate block">
                    {contextResult.dataAcquisitionContext.highestPriorityProduct.sensor} ({contextResult.dataAcquisitionContext.highestPriorityProduct.priority})
                  </span>
                </div>
              )}

              {/* Reassessment Status */}
              {contextResult.reassessmentContext.recommendationStatus !== 'UNAVAILABLE' && (
                <div data-testid="evidence-reassessment-status" className="bg-white p-2.5 rounded border border-[#E3E3E0] space-y-0.5 col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-[#8A8D90] block uppercase">Reassessment Status</span>
                  <span className="text-[#526B7A] font-semibold">{contextResult.reassessmentContext.recommendationStatus}</span>
                </div>
              )}

              {/* Critical Alert Severity */}
              {contextResult.alertContext.totalAlertsCount > 0 && (
                <div data-testid="evidence-alerts-count" className="bg-white p-2.5 rounded border border-[#E3E3E0] space-y-0.5 col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-[#8A8D90] block uppercase">Active Alerts</span>
                  <span className="text-[#A65353] font-semibold">
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
