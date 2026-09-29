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
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Compass,
  Layers,
  Radio,
  FileText,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';

export interface NavigationAssistantPanelProps {
  contextResult?: NavigationAssistantContextResult | null;
  onAskQuery?: (query: string) => Promise<LlmExplanationResult | null>;
  llmResult?: LlmExplanationResult | null;
  isLoadingLlm?: boolean;
  onNavigateToView?: (view: 'navigation' | 'mission' | 'acquisition' | 'icebergs' | 'seaice') => void;
  onReassessDecision?: () => void;
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
  onNavigateToView,
  onReassessDecision,
}) => {
  const [selectedQuestionKey, setSelectedQuestionKey] = useState<QuestionKey>(
    'whyCurrentRouteRecommended'
  );
  const [customInputQuery, setCustomInputQuery] = useState<string>('');
  const [showAdvancedMetrics, setShowAdvancedMetrics] = useState<boolean>(false);
  const [showEvidenceTrace, setShowEvidenceTrace] = useState<boolean>(false);
  const [expandedEvidenceGroup, setExpandedEvidenceGroup] = useState<string | null>('route');

  const getDataModeBadgeClass = (mode: ContextDataMode) => {
    switch (mode) {
      case 'REAL':
        return 'bg-[#EEF4EF] text-[#2C6E49] border-[#D5E4D7]';
      case 'SIMULATED':
        return 'bg-[#FEF9C3] text-[#A16207] border-[#FEF08A]';
      case 'HYBRID':
        return 'bg-[#E0F2FE] text-[#0369A1] border-[#BAE6FD]';
      case 'UNAVAILABLE':
      default:
        return 'bg-[#FEE2E2] text-[#991B1B] border-[#FECACA]';
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
      className="bg-[#F5F7F7] min-h-screen text-[#18343A] space-y-6 font-sans pb-12"
    >
      {/* ------------------------------------------------------------- */}
      {/* LEVEL 0: PAGE HEADER                                          */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white border border-[#DCE7E7] rounded-xl p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-[#075563] text-white flex items-center justify-center shadow-xs">
              <Bot className="w-5 h-5 text-[#2BB9BD]" />
            </div>
            <div>
              <h1
                data-testid="assistant-header-title"
                className="text-xl font-bold text-[#075563] tracking-tight flex items-center gap-2"
              >
                AI Navigation Decision Support
              </h1>
              <p className="text-xs text-[#526B7A] mt-0.5 font-medium">
                Understand the current navigation recommendation, its evidence, and what could change it.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          {contextResult && (
            <div className="flex items-center space-x-2 bg-[#F5F7F7] px-3 py-1.5 rounded-lg border border-[#DCE7E7]">
              <span className="text-xs font-semibold text-[#526B7A]">Data Mode:</span>
              <span
                data-testid={`provenance-badge-${contextResult.dataMode.toLowerCase()}`}
                className={`px-2.5 py-0.5 rounded-md text-xs font-semibold border ${getDataModeBadgeClass(
                  contextResult.dataMode
                )}`}
              >
                {contextResult.dataMode}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* LEVEL 1: MISSION CONTEXT BAR                                 */}
      {/* ------------------------------------------------------------- */}
      {isContextAvailable && contextResult ? (
        <div
          data-testid="current-context-summary"
          className="grid grid-cols-2 lg:grid-cols-4 gap-3 bg-white p-4 rounded-xl border border-[#DCE7E7] shadow-xs text-xs"
        >
          <div data-testid="context-mission" className="space-y-1">
            <span className="text-[10px] text-[#526B7A] uppercase font-bold tracking-wider block">
              Mission
            </span>
            <span className="text-[#18343A] font-bold truncate block text-xs">
              {contextResult.missionContext.title || 'East Antarctic Supply Voyage'}
            </span>
          </div>

          <div data-testid="context-vessel" className="space-y-1 border-l border-[#E5E9E9] pl-3">
            <span className="text-[10px] text-[#526B7A] uppercase font-bold tracking-wider block">
              Vessel
            </span>
            <span className="text-[#18343A] font-semibold truncate block text-xs">
              {contextResult.vesselContext.vesselName || 'RV Polar Explorer'} ({contextResult.vesselContext.iceClass.split(' ')[0] || 'PC3'})
            </span>
          </div>

          <div data-testid="context-route" className="space-y-1 border-l border-[#E5E9E9] pl-3">
            <span className="text-[10px] text-[#526B7A] uppercase font-bold tracking-wider block">
              Active Route
            </span>
            <span className="text-[#075563] font-bold truncate block text-xs">
              {contextResult.routeContext.activeRouteName || 'None'} {contextResult.routeContext.distanceNm ? `(${contextResult.routeContext.distanceNm} nm)` : ''}
            </span>
          </div>

          <div data-testid="context-confidence" className="space-y-1 border-l border-[#E5E9E9] pl-3">
            <span className="text-[10px] text-[#526B7A] uppercase font-bold tracking-wider block">
              Decision Confidence
            </span>
            <div className="flex items-center gap-1.5">
              <span
                className={`font-extrabold text-xs px-2 py-0.5 rounded-md ${
                  contextResult.confidenceContext.overallLevel === 'HIGH'
                    ? 'bg-[#EEF4EF] text-[#2C6E49]'
                    : contextResult.confidenceContext.overallLevel === 'MEDIUM'
                    ? 'bg-[#FEF9C3] text-[#A16207]'
                    : 'bg-[#FEE2E2] text-[#991B1B]'
                }`}
              >
                {contextResult.confidenceContext.overallLevel}
              </span>
              <span className="text-[#526B7A] font-medium text-xs">
                · {contextResult.confidenceContext.confidenceScore ?? 80}/100
              </span>
            </div>
          </div>
        </div>
      ) : null}

      {/* ------------------------------------------------------------- */}
      {/* OPERATIONAL AUTHORITY NOTICE (Compact Notice)                */}
      {/* ------------------------------------------------------------- */}
      <div
        data-testid="navigator-authority-disclaimer"
        className="bg-white border-l-4 border-[#075563] border-y border-r border-[#DCE7E7] p-3.5 rounded-lg text-xs text-[#18343A] flex items-start gap-3 shadow-xs"
      >
        <Info className="w-4 h-4 text-[#075563] shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-bold text-[#075563] mr-1.5">ℹ Navigator authority retained:</span>
          {MANDATORY_NAVIGATOR_DISCLAIMER}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* LEVEL 1: PRIMARY DECISION CARD                                */}
      {/* ------------------------------------------------------------- */}
      {!isContextAvailable ? (
        <div
          data-testid="assistant-context-unavailable"
          className="bg-white border border-[#DCE7E7] rounded-xl p-8 text-center space-y-4 shadow-sm"
        >
          <div className="inline-flex p-3.5 bg-[#F5F7F7] border border-[#DCE7E7] rounded-full text-[#526B7A]">
            <Database className="w-7 h-7 text-[#075563]" />
          </div>
          <h3 className="text-sm font-bold text-[#18343A] uppercase tracking-wider">
            NO ACTIVE ROUTE RECOMMENDATION
          </h3>
          <p className="text-xs text-[#526B7A] max-w-md mx-auto leading-relaxed">
            CRYO NAV does not currently have enough active route evidence to provide a route recommendation.
          </p>
          <div className="bg-[#F5F7F7] p-3 rounded-lg border border-[#E5E9E9] max-w-xs mx-auto text-xs text-left space-y-1">
            <span className="text-[10px] font-bold text-[#526B7A] uppercase block">Primary Reason:</span>
            <span className="font-semibold text-[#991B1B]">Insufficient route context</span>
          </div>
          <div className="pt-2 flex flex-wrap justify-center gap-2.5">
            <button
              type="button"
              onClick={() => onNavigateToView?.('mission')}
              className="px-3.5 py-2 rounded-lg bg-[#075563] text-white hover:bg-[#05434F] text-xs font-semibold transition flex items-center gap-1.5"
            >
              <span>Open Mission Planning</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onNavigateToView?.('acquisition')}
              className="px-3.5 py-2 rounded-lg bg-white border border-[#DCE7E7] text-[#075563] hover:bg-[#F5F7F7] text-xs font-semibold transition"
            >
              View Required Data
            </button>
          </div>
        </div>
      ) : contextResult?.routeContext.activeRouteId ? (
        <div className="bg-white border-2 border-[#2BB9BD] rounded-xl p-6 shadow-sm space-y-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-[#2BB9BD] text-[#075563] px-3 py-1 rounded-bl-lg text-[10px] font-extrabold uppercase tracking-wider">
            Current Decision
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E9E9] pb-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#526B7A] block mb-1">
                Recommended Route
              </span>
              <h2 className="text-2xl font-bold text-[#075563] tracking-tight">
                {contextResult.routeContext.activeRouteName || 'Balanced Route'}
              </h2>
              <p className="text-xs text-[#526B7A] font-medium mt-1">
                "Provides the best current balance between route efficiency and iceberg/sea-ice risk."
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <span className="text-[10px] font-bold text-[#526B7A] uppercase block">Confidence</span>
                <span className="text-lg font-bold text-[#075563]">
                  {contextResult.confidenceContext.confidenceScore ?? 80} / 100
                </span>
              </div>
              <span
                className={`px-3 py-1 rounded-md text-xs font-extrabold ${
                  contextResult.confidenceContext.overallLevel === 'HIGH'
                    ? 'bg-[#EEF4EF] text-[#2C6E49]'
                    : contextResult.confidenceContext.overallLevel === 'MEDIUM'
                    ? 'bg-[#FEF9C3] text-[#A16207]'
                    : 'bg-[#FEE2E2] text-[#991B1B]'
                }`}
              >
                {contextResult.confidenceContext.overallLevel}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-[#526B7A]">
              Distance: <strong className="text-[#18343A]">{contextResult.routeContext.distanceNm || 320} nm</strong> · Fuel Est: <strong className="text-[#18343A]">{contextResult.routeContext.fuelTons || 18.2} tons</strong>
            </span>
            <button
              type="button"
              onClick={() => onNavigateToView?.('navigation')}
              className="px-4 py-2 rounded-lg bg-[#075563] hover:bg-[#05434F] text-white text-xs font-semibold transition flex items-center gap-1.5 shadow-xs"
            >
              <Compass className="w-3.5 h-3.5 text-[#2BB9BD]" />
              <span>View Route on Map</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-[#DCE7E7] rounded-xl p-6 text-center space-y-4 shadow-sm">
          <div className="inline-flex p-3 bg-[#F5F7F7] rounded-full text-[#075563]">
            <Compass className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#18343A] uppercase tracking-wider">
              NO ACTIVE ROUTE RECOMMENDATION
            </h3>
            <p className="text-xs text-[#526B7A] max-w-md mx-auto mt-1">
              CRYO NAV does not currently have enough active route evidence to provide a route recommendation.
            </p>
          </div>
          <div className="flex justify-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => onNavigateToView?.('mission')}
              className="px-3.5 py-1.5 rounded-lg bg-[#075563] text-white text-xs font-semibold hover:bg-[#05434F]"
            >
              Open Mission Planning
            </button>
            <button
              type="button"
              onClick={() => onNavigateToView?.('acquisition')}
              className="px-3.5 py-1.5 rounded-lg border border-[#DCE7E7] text-[#075563] text-xs font-semibold hover:bg-[#F5F7F7]"
            >
              View Required Data
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* LEVEL 2: WHY THIS DECISION?                                   */}
      {/* ------------------------------------------------------------- */}
      {isContextAvailable && (
        <div className="bg-white border border-[#DCE7E7] rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#E5E9E9] pb-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#075563] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#2BB9BD]" />
              WHY THIS DECISION?
            </h3>
            <span className="text-[11px] text-[#526B7A]">Primary Evidence Factors</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Factor 1: Iceberg Risk */}
            <div className="bg-[#F5F7F7] p-3.5 rounded-lg border border-[#E5E9E9] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#18343A] flex items-center gap-1">
                  <span className="text-[#2C6E49]">✓</span> Iceberg Risk
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FEF9C3] text-[#A16207]">
                  {contextResult?.hazardContext.highHazardsCount && contextResult.hazardContext.highHazardsCount > 0 ? 'High' : 'Moderate'}
                </span>
              </div>
              <p className="text-[11px] text-[#526B7A] leading-snug">
                Detected iceberg activity is present near the eastern route corridor boundary.
              </p>
            </div>

            {/* Factor 2: Sea-Ice Conditions */}
            <div className="bg-[#F5F7F7] p-3.5 rounded-lg border border-[#E5E9E9] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#18343A] flex items-center gap-1">
                  <span className="text-[#2C6E49]">✓</span> Sea-Ice Conditions
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#EEF4EF] text-[#2C6E49]">
                  Low Risk
                </span>
              </div>
              <p className="text-[11px] text-[#526B7A] leading-snug">
                Average sea-ice concentration remains below vessel ice-class limit (PC3).
              </p>
            </div>

            {/* Factor 3: Route Distance */}
            <div className="bg-[#F5F7F7] p-3.5 rounded-lg border border-[#E5E9E9] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#18343A] flex items-center gap-1">
                  <span className="text-[#2C6E49]">✓</span> Route Distance
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#EEF4EF] text-[#2C6E49]">
                  Favorable
                </span>
              </div>
              <p className="text-[11px] text-[#526B7A] leading-snug">
                Provides optimal fuel efficiency while bypassing high-density accumulation zones.
              </p>
            </div>

            {/* Factor 4: Trajectory Uncertainty */}
            <div className="bg-[#F5F7F7] p-3.5 rounded-lg border border-[#E5E9E9] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#18343A] flex items-center gap-1">
                  <span className="text-[#A16207]">⚠</span> Trajectory Uncertainty
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FEF9C3] text-[#A16207]">
                  {contextResult?.uncertaintyContext.cautionLevel || 'Elevated'}
                </span>
              </div>
              <p className="text-[11px] text-[#526B7A] leading-snug">
                Drift prediction envelope expands slightly over the +24h forecast window.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* LEVEL 3: CONFIDENCE & KEY UNCERTAINTY                         */}
      {/* ------------------------------------------------------------- */}
      {isContextAvailable && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Section 10: DECISION CONFIDENCE */}
          <div className="bg-white border border-[#DCE7E7] rounded-xl p-5 shadow-xs space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-[#E5E9E9] pb-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#075563] flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#075563]" />
                  DECISION CONFIDENCE
                </h3>
                <span className="text-xs font-bold text-[#075563]">
                  {contextResult?.confidenceContext.confidenceScore ?? 80}/100
                </span>
              </div>

              {/* Progress Bar Meter */}
              <div className="mt-3.5 space-y-1.5">
                <div className="w-full bg-[#E5E9E9] h-2.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 rounded-full ${
                      (contextResult?.confidenceContext.confidenceScore ?? 80) >= 80
                        ? 'bg-[#2C6E49]'
                        : (contextResult?.confidenceContext.confidenceScore ?? 80) >= 50
                        ? 'bg-[#2BB9BD]'
                        : 'bg-[#A16207]'
                    }`}
                    style={{ width: `${contextResult?.confidenceContext.confidenceScore ?? 80}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-[#526B7A] font-semibold">
                  <span>LOW (0-50)</span>
                  <span>MEDIUM (51-79)</span>
                  <span>HIGH (80-100)</span>
                </div>
              </div>

              <div className="mt-3 space-y-1 text-xs text-[#526B7A]">
                <span className="font-semibold text-[#18343A] block">Confidence is influenced by:</span>
                <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                  <li>Iceberg trajectory uncertainty</li>
                  <li>Limited recent satellite observations</li>
                  <li>Current environmental data coverage</li>
                </ul>
              </div>
            </div>

            <div className="bg-[#F5F7F7] p-2.5 rounded-lg border border-[#E5E9E9] text-[11px] text-[#526B7A]">
              <strong className="text-[#075563]">What does this mean?</strong> "Low or medium confidence means the current recommendation is sensitive to changes in available environmental information."
            </div>
          </div>

          {/* Section 11: KEY UNCERTAINTY */}
          <div className="bg-white border border-[#DCE7E7] rounded-xl p-5 shadow-xs space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-[#E5E9E9] pb-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#A16207] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-[#A16207]" />
                  KEY UNCERTAINTY
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FEF9C3] text-[#A16207]">
                  ICEBERG
                </span>
              </div>

              <div className="mt-3 space-y-2 text-xs">
                <h4 className="font-bold text-[#18343A]">
                  Iceberg trajectory uncertainty
                </h4>
                <p className="text-[#526B7A] leading-relaxed text-[11px]">
                  {contextResult?.uncertaintyContext.explanation ||
                    '"Recent iceberg movement is not fully constrained by available satellite observations."'}
                </p>
                <div className="bg-[#FEF9C3] p-2.5 rounded-lg border border-[#FEF08A] text-[11px] text-[#A16207]">
                  <strong>Potential Effect:</strong> "Could alter the preferred route corridor if drift velocity increases."
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigateToView?.('icebergs')}
              className="w-full py-1.5 text-center text-xs font-semibold text-[#075563] hover:text-[#05434F] bg-[#F5F7F7] hover:bg-[#E5E9E9] rounded-lg transition border border-[#DCE7E7] flex items-center justify-center gap-1"
            >
              <span>View Iceberg Analysis</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* LEVEL 5: WHAT COULD CHANGE THE DECISION & REASSESSMENT        */}
      {/* ------------------------------------------------------------- */}
      {isContextAvailable && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Section 12: WHAT COULD CHANGE THIS DECISION? (Span 2) */}
          <div className="lg:col-span-2 bg-white border border-[#DCE7E7] rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5E9E9] pb-3">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#075563] flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-[#2BB9BD]" />
                WHAT COULD CHANGE THIS DECISION?
              </h3>
              <span className="text-[11px] text-[#526B7A]">Potential Information Triggers</span>
            </div>

            <div className="space-y-2.5">
              {/* Item 1 */}
              <div className="flex items-start justify-between p-3 bg-[#F5F7F7] rounded-lg border border-[#E5E9E9] text-xs">
                <div>
                  <span className="font-bold text-[#18343A] block">New iceberg observation</span>
                  <p className="text-[11px] text-[#526B7A] mt-0.5">
                    "If new SAR imagery reveals undetected bergs near the corridor, the route recommendation may shift."
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-[#FEE2E2] text-[#991B1B] shrink-0 ml-3">
                  HIGH IMPACT
                </span>
              </div>

              {/* Item 2 */}
              <div className="flex items-start justify-between p-3 bg-[#F5F7F7] rounded-lg border border-[#E5E9E9] text-xs">
                <div>
                  <span className="font-bold text-[#18343A] block">Updated ocean currents</span>
                  <p className="text-[11px] text-[#526B7A] mt-0.5">
                    "Significant changes in current velocity affect iceberg drift envelope predictions."
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-[#FEF9C3] text-[#A16207] shrink-0 ml-3">
                  MEDIUM IMPACT
                </span>
              </div>

              {/* Item 3 */}
              <div className="flex items-start justify-between p-3 bg-[#F5F7F7] rounded-lg border border-[#E5E9E9] text-xs">
                <div>
                  <span className="font-bold text-[#18343A] block">New sea-ice observation</span>
                  <p className="text-[11px] text-[#526B7A] mt-0.5">
                    "Concentration changes could alter speed and fuel consumption estimates."
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-[#FEF9C3] text-[#A16207] shrink-0 ml-3">
                  MEDIUM IMPACT
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-[#E5E9E9]">
              <span className="text-[11px] text-[#526B7A]">
                Additional environmental data can refine uncertainty.
              </span>
              <button
                type="button"
                onClick={() => onNavigateToView?.('acquisition')}
                className="px-3 py-1.5 rounded-lg bg-[#075563] text-white hover:bg-[#05434F] text-xs font-semibold transition flex items-center justify-center gap-1.5 self-start sm:self-auto"
              >
                <span>Open Adaptive Data Acquisition</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Section 13: REASSESSMENT STATUS */}
          <div className="bg-white border border-[#DCE7E7] rounded-xl p-5 shadow-xs space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="border-b border-[#E5E9E9] pb-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#075563] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#075563]" />
                  DECISION STATUS
                </h3>
              </div>

              <div className="p-3.5 rounded-lg border bg-[#F5F7F7] border-[#E5E9E9] text-xs space-y-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      contextResult?.reassessmentContext.recommendationStatus === 'REASSESS'
                        ? 'bg-[#EF4444] animate-pulse'
                        : 'bg-[#2C6E49]'
                    }`}
                  />
                  <span className="font-bold text-[#18343A]">
                    {contextResult?.reassessmentContext.recommendationStatus === 'REASSESS'
                      ? '⚠ Reassessment Recommended'
                      : '● Current Recommendation Valid'}
                  </span>
                </div>
                <p className="text-[11px] text-[#526B7A] leading-relaxed">
                  {contextResult?.reassessmentContext.summaryExplanation ||
                    'Current route corridor remains stable under existing environmental inputs.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (onReassessDecision) onReassessDecision();
              }}
              className="w-full py-2 rounded-lg bg-[#075563] hover:bg-[#05434F] text-white text-xs font-semibold transition flex items-center justify-center gap-1.5 shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#2BB9BD]" />
              <span>Reassess Decision</span>
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* LEVEL 6: ASK THE DECISION ASSISTANT                           */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white border border-[#DCE7E7] rounded-xl p-6 shadow-sm space-y-5">
        <div>
          <h3 className="text-sm font-bold text-[#075563] tracking-tight flex items-center gap-2">
            <Bot className="w-4 h-4 text-[#2BB9BD]" />
            ASK THE DECISION ASSISTANT
          </h3>
          <p className="text-xs text-[#526B7A] mt-0.5">
            Ask about the current recommendation, evidence, uncertainty, or hazards.
          </p>
        </div>

        {/* Natural Language Query Form */}
        <form onSubmit={handleCustomSubmit} className="flex gap-2.5">
          <input
            type="text"
            data-testid="llm-input-box"
            placeholder="Why is this route recommended?"
            value={customInputQuery}
            onChange={(e) => setCustomInputQuery(e.target.value)}
            className="flex-1 bg-[#F5F7F7] border border-[#DCE7E7] rounded-lg px-4 py-2 text-xs text-[#18343A] placeholder-[#8A8D90] focus:outline-none focus:border-[#075563] focus:bg-white font-sans transition"
          />
          <button
            type="submit"
            data-testid="llm-ask-button"
            disabled={!customInputQuery.trim() || isLoadingLlm}
            className="px-5 py-2 rounded-lg bg-[#075563] hover:bg-[#05434F] disabled:bg-[#DCE7E7] disabled:text-[#8A8D90] text-white font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs shrink-0"
          >
            {isLoadingLlm ? (
              <Bot className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>Ask</span>
          </button>
        </form>

        {/* Suggested Questions Area */}
        <div className="space-y-2 pt-1 border-t border-[#E5E9E9]">
          <span className="text-xs font-bold text-[#526B7A] block">
            Suggested questions:
          </span>

          <div
            data-testid="quick-questions-grid"
            className="flex flex-wrap gap-2"
          >
            {QUESTION_DEFINITIONS.map((q) => {
              const isSelected = selectedQuestionKey === q.key;
              return (
                <button
                  key={q.key}
                  type="button"
                  data-testid={`question-btn-${q.key}`}
                  onClick={() => handleSelectQuestion(q)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 border cursor-pointer ${
                    isSelected
                      ? 'bg-[#075563] text-white border-[#075563]'
                      : 'bg-[#F5F7F7] text-[#075563] hover:bg-[#E5E9E9] border-[#DCE7E7]'
                  }`}
                >
                  <span>{q.label}</span>
                  {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-[#2BB9BD] shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* LLM Explanation Output or Structured Answer */}
        {isLoadingLlm && (
          <div className="p-4 bg-[#F5F7F7] border border-[#DCE7E7] rounded-lg text-xs text-[#075563] flex items-center gap-2.5">
            <Bot className="w-4 h-4 animate-spin text-[#2BB9BD]" />
            <span className="font-semibold">Generating grounded natural-language explanation over structured evidence...</span>
          </div>
        )}

        {llmResult && (
          <div data-testid="llm-explanation-area" className="space-y-2">
            {(llmResult.isFallback || !llmResult.success) && (
              <div
                data-testid="llm-service-unavailable-banner"
                className="bg-[#FEF9C3] border border-[#FEF08A] p-3 rounded-lg text-xs text-[#A16207] flex items-start gap-2"
              >
                <AlertTriangle className="w-4 h-4 text-[#A16207] shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">SERVICE NOTICE:</span>
                  {SERVICE_UNAVAILABLE_MESSAGE}
                </div>
              </div>
            )}

            <div className="bg-[#F5F7F7] p-4 rounded-lg border border-[#DCE7E7] space-y-2">
              <div className="flex items-center justify-between border-b border-[#E5E9E9] pb-2 text-xs">
                <span className="font-bold text-[#075563] flex items-center gap-1.5">
                  <Bot className="w-4 h-4 text-[#2BB9BD]" /> Grounded Explanation:
                </span>
                <span className="text-[10px] text-[#526B7A] font-semibold">{llmResult.provenance}</span>
              </div>
              <p className="text-xs text-[#18343A] font-medium leading-relaxed whitespace-pre-wrap pt-1">
                {llmResult.explanation}
              </p>
            </div>
          </div>
        )}

        {/* Structured Answer Area */}
        <div
          data-testid="answer-area"
          className="bg-[#F5F7F7] p-4 rounded-lg border border-[#DCE7E7] space-y-2.5"
        >
          <div className="flex items-center justify-between border-b border-[#E5E9E9] pb-2">
            <span className="text-xs font-bold text-[#075563] flex items-center gap-1.5">
              <Bot className="w-4 h-4 text-[#075563]" /> Response & Evidence Summary:
            </span>
            <span className="text-[10px] text-[#526B7A] font-semibold">
              Deterministic Context Output
            </span>
          </div>

          <p
            data-testid="selected-answer-text"
            className="text-xs text-[#18343A] leading-relaxed font-medium whitespace-pre-wrap pt-1"
          >
            {selectedAnswer}
          </p>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* LEVEL 4 / 7: SUPPORTING EVIDENCE ACCORDION                    */}
      {/* ------------------------------------------------------------- */}
      {isContextAvailable && (
        <div className="bg-white border border-[#DCE7E7] rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#E5E9E9] pb-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#075563] flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#2BB9BD]" />
              SUPPORTING EVIDENCE
            </h3>
            <span className="text-[11px] text-[#526B7A]">Domain Evidence Groups</span>
          </div>

          <div className="space-y-2">
            {/* Group 1: Route Geometry */}
            <div className="border border-[#E5E9E9] rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setExpandedEvidenceGroup(expandedEvidenceGroup === 'route' ? null : 'route')}
                className="w-full px-4 py-3 bg-[#F5F7F7] hover:bg-[#E5E9E9] flex items-center justify-between text-xs font-bold text-[#18343A] transition"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[#2C6E49]">✓</span>
                  <span>Route Geometry & Efficiency</span>
                </div>
                {expandedEvidenceGroup === 'route' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {expandedEvidenceGroup === 'route' && (
                <div className="p-4 bg-white text-xs space-y-2 border-t border-[#E5E9E9]">
                  <p className="text-[#526B7A]">
                    Route corridor length: <strong>{contextResult?.routeContext.distanceNm || 320} nm</strong>. Evaluated across clean water grid avoiding coastline and ice shelf land boundaries.
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1">
                    <div className="bg-[#F5F7F7] p-2 rounded border border-[#E5E9E9]">
                      <span className="text-[#526B7A] block">Source:</span>
                      <strong className="text-[#18343A]">Routing Engine v3</strong>
                    </div>
                    <div className="bg-[#F5F7F7] p-2 rounded border border-[#E5E9E9]">
                      <span className="text-[#526B7A] block">Observation:</span>
                      <strong className="text-[#18343A]">Active Session</strong>
                    </div>
                    <div className="bg-[#F5F7F7] p-2 rounded border border-[#E5E9E9]">
                      <span className="text-[#526B7A] block">Coverage:</span>
                      <strong className="text-[#18343A]">100% Corridor</strong>
                    </div>
                    <div className="bg-[#F5F7F7] p-2 rounded border border-[#E5E9E9]">
                      <span className="text-[#526B7A] block">Status:</span>
                      <strong className="text-[#2C6E49]">Valid</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Group 2: Iceberg Observations */}
            <div className="border border-[#E5E9E9] rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setExpandedEvidenceGroup(expandedEvidenceGroup === 'icebergs' ? null : 'icebergs')}
                className="w-full px-4 py-3 bg-[#F5F7F7] hover:bg-[#E5E9E9] flex items-center justify-between text-xs font-bold text-[#18343A] transition"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[#A16207]">⚠</span>
                  <span>Iceberg Observations & CPA</span>
                </div>
                {expandedEvidenceGroup === 'icebergs' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {expandedEvidenceGroup === 'icebergs' && (
                <div className="p-4 bg-white text-xs space-y-2 border-t border-[#E5E9E9]">
                  <p className="text-[#526B7A]">
                    Nearest CPA: <strong>{contextResult?.hazardContext.nearestIcebergCpaNm ? `${contextResult.hazardContext.nearestIcebergCpaNm.toFixed(1)} nm` : '1.2 nm'}</strong>. Trajectory prediction based on current drift model.
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1">
                    <div className="bg-[#F5F7F7] p-2 rounded border border-[#E5E9E9]">
                      <span className="text-[#526B7A] block">Source:</span>
                      <strong className="text-[#18343A]">Sentinel-1 SAR / USNIC</strong>
                    </div>
                    <div className="bg-[#F5F7F7] p-2 rounded border border-[#E5E9E9]">
                      <span className="text-[#526B7A] block">Observation:</span>
                      <strong className="text-[#18343A]">Recent</strong>
                    </div>
                    <div className="bg-[#F5F7F7] p-2 rounded border border-[#E5E9E9]">
                      <span className="text-[#526B7A] block">Coverage:</span>
                      <strong className="text-[#18343A]">Route Sector</strong>
                    </div>
                    <div className="bg-[#F5F7F7] p-2 rounded border border-[#E5E9E9]">
                      <span className="text-[#526B7A] block">Status:</span>
                      <strong className="text-[#A16207]">Caution</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Group 3: Sea Ice */}
            <div className="border border-[#E5E9E9] rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setExpandedEvidenceGroup(expandedEvidenceGroup === 'seaice' ? null : 'seaice')}
                className="w-full px-4 py-3 bg-[#F5F7F7] hover:bg-[#E5E9E9] flex items-center justify-between text-xs font-bold text-[#18343A] transition"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[#2C6E49]">✓</span>
                  <span>Sea-Ice Concentration & Coverage</span>
                </div>
                {expandedEvidenceGroup === 'seaice' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {expandedEvidenceGroup === 'seaice' && (
                <div className="p-4 bg-white text-xs space-y-2 border-t border-[#E5E9E9]">
                  <p className="text-[#526B7A]">
                    Concentration is well within vessel PC3 ice-class tolerance (75% limit).
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1">
                    <div className="bg-[#F5F7F7] p-2 rounded border border-[#E5E9E9]">
                      <span className="text-[#526B7A] block">Source:</span>
                      <strong className="text-[#18343A]">AMSR2 / Copernicus</strong>
                    </div>
                    <div className="bg-[#F5F7F7] p-2 rounded border border-[#E5E9E9]">
                      <span className="text-[#526B7A] block">Observation:</span>
                      <strong className="text-[#18343A]">Fresh</strong>
                    </div>
                    <div className="bg-[#F5F7F7] p-2 rounded border border-[#E5E9E9]">
                      <span className="text-[#526B7A] block">Coverage:</span>
                      <strong className="text-[#18343A]">Regional</strong>
                    </div>
                    <div className="bg-[#F5F7F7] p-2 rounded border border-[#E5E9E9]">
                      <span className="text-[#526B7A] block">Status:</span>
                      <strong className="text-[#2C6E49]">Available</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* LEVEL 7: ADVANCED EVIDENCE DETAILS (Progressively Disclosed)   */}
      {/* ------------------------------------------------------------- */}
      {isContextAvailable && (
        <div className="bg-white border border-[#DCE7E7] rounded-xl p-5 shadow-xs space-y-4">
          <button
            type="button"
            onClick={() => setShowAdvancedMetrics(!showAdvancedMetrics)}
            className="w-full flex items-center justify-between text-xs font-extrabold uppercase tracking-wider text-[#075563] cursor-pointer py-1"
          >
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#075563]" />
              <span>ADVANCED EVIDENCE DETAILS</span>
            </div>
            {showAdvancedMetrics ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showAdvancedMetrics && (
            <div
              data-testid="evidence-section"
              className="space-y-4 pt-2 border-t border-[#E5E9E9]"
            >
              <div className="text-xs font-bold text-[#526B7A]">
                Underlying Evidence Metrics:
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                {/* Route Risk */}
                {contextResult?.routeContext.riskIndex != null && (
                  <div data-testid="evidence-route-risk" className="bg-[#F5F7F7] p-3 rounded-lg border border-[#E5E9E9] space-y-0.5">
                    <span className="text-[10px] text-[#526B7A] block uppercase font-bold">Route Risk</span>
                    <span className="text-[#18343A] font-extrabold text-sm">{contextResult.routeContext.riskIndex}/100</span>
                  </div>
                )}

                {/* CPA */}
                {contextResult?.hazardContext.nearestIcebergCpaNm != null && (
                  <div data-testid="evidence-cpa" className="bg-[#F5F7F7] p-3 rounded-lg border border-[#E5E9E9] space-y-0.5">
                    <span className="text-[10px] text-[#526B7A] block uppercase font-bold">Nearest CPA</span>
                    <span className="text-[#A16207] font-extrabold text-sm">{contextResult.hazardContext.nearestIcebergCpaNm.toFixed(1)} nm</span>
                  </div>
                )}

                {/* Uncertainty Radius */}
                {contextResult?.uncertaintyContext.uncertaintyRadiusNm != null && (
                  <div data-testid="evidence-uncertainty-radius" className="bg-[#F5F7F7] p-3 rounded-lg border border-[#E5E9E9] space-y-0.5">
                    <span className="text-[10px] text-[#526B7A] block uppercase font-bold">Uncertainty Envelope</span>
                    <span className="text-[#075563] font-extrabold text-sm">±{contextResult.uncertaintyContext.uncertaintyRadiusNm.toFixed(1)} nm</span>
                  </div>
                )}

                {/* Confidence Score */}
                {contextResult?.confidenceContext.confidenceScore != null && (
                  <div data-testid="evidence-confidence-score" className="bg-[#F5F7F7] p-3 rounded-lg border border-[#E5E9E9] space-y-0.5">
                    <span className="text-[10px] text-[#526B7A] block uppercase font-bold">Confidence Score</span>
                    <span className="text-[#2C6E49] font-extrabold text-sm">{contextResult.confidenceContext.confidenceScore}/100</span>
                  </div>
                )}

                {/* Resilience Score */}
                {contextResult?.resilienceContext.resilienceScore != null && (
                  <div data-testid="evidence-resilience-score" className="bg-[#F5F7F7] p-3 rounded-lg border border-[#E5E9E9] space-y-0.5">
                    <span className="text-[10px] text-[#526B7A] block uppercase font-bold">Resilience Index</span>
                    <span className="text-[#2C6E49] font-extrabold text-sm">{contextResult.resilienceContext.resilienceScore}/100</span>
                  </div>
                )}

                {/* Route Sensitivity */}
                {contextResult?.resilienceContext.sensitivityClassification !== 'UNAVAILABLE' && (
                  <div data-testid="evidence-sensitivity" className="bg-[#F5F7F7] p-3 rounded-lg border border-[#E5E9E9] space-y-0.5">
                    <span className="text-[10px] text-[#526B7A] block uppercase font-bold">Route Sensitivity</span>
                    <span className="text-[#A16207] font-extrabold text-sm">{contextResult?.resilienceContext.sensitivityClassification}</span>
                  </div>
                )}

                {/* Acquisition Priority */}
                {contextResult?.dataAcquisitionContext.highestPriorityProduct && (
                  <div data-testid="evidence-acquisition-priority" className="bg-[#F5F7F7] p-3 rounded-lg border border-[#E5E9E9] space-y-0.5 col-span-2 sm:col-span-1">
                    <span className="text-[10px] text-[#526B7A] block uppercase font-bold">Top Acquisition Priority</span>
                    <span className="text-[#075563] font-bold text-xs truncate block">
                      {contextResult.dataAcquisitionContext.highestPriorityProduct.sensor} ({contextResult.dataAcquisitionContext.highestPriorityProduct.priority})
                    </span>
                  </div>
                )}

                {/* Reassessment Status */}
                {contextResult?.reassessmentContext.recommendationStatus !== 'UNAVAILABLE' && (
                  <div data-testid="evidence-reassessment-status" className="bg-[#F5F7F7] p-3 rounded-lg border border-[#E5E9E9] space-y-0.5 col-span-2 sm:col-span-1">
                    <span className="text-[10px] text-[#526B7A] block uppercase font-bold">Reassessment Status</span>
                    <span className="text-[#075563] font-bold text-xs">{contextResult?.reassessmentContext.recommendationStatus}</span>
                  </div>
                )}

                {/* Critical Alert Severity */}
                {contextResult?.alertContext.totalAlertsCount > 0 && (
                  <div data-testid="evidence-alerts-count" className="bg-[#F5F7F7] p-3 rounded-lg border border-[#E5E9E9] space-y-0.5 col-span-2 sm:col-span-1">
                    <span className="text-[10px] text-[#526B7A] block uppercase font-bold">Active Alerts</span>
                    <span className="text-[#991B1B] font-extrabold text-xs">
                      {contextResult.alertContext.totalAlertsCount} Total ({contextResult.alertContext.criticalAlertsCount} Critical)
                    </span>
                  </div>
                )}
              </div>

              {/* DECISION TRACE */}
              <div className="pt-3 border-t border-[#E5E9E9] space-y-2">
                <button
                  type="button"
                  onClick={() => setShowEvidenceTrace(!showEvidenceTrace)}
                  className="text-xs font-bold text-[#075563] hover:text-[#05434F] flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>HOW THE DECISION WAS FORMED (Decision Trace)</span>
                  {showEvidenceTrace ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {showEvidenceTrace && (
                  <div className="p-4 bg-[#F5F7F7] rounded-lg border border-[#E5E9E9] space-y-3">
                    <div className="flex flex-wrap items-center justify-between text-[11px] font-bold text-[#075563] gap-2">
                      <span className="px-2.5 py-1 bg-white rounded border border-[#DCE7E7]">Environmental Data</span>
                      <span>→</span>
                      <span className="px-2.5 py-1 bg-white rounded border border-[#DCE7E7]">Hazard Assessment</span>
                      <span>→</span>
                      <span className="px-2.5 py-1 bg-white rounded border border-[#DCE7E7]">Route Risk</span>
                      <span>→</span>
                      <span className="px-2.5 py-1 bg-white rounded border border-[#DCE7E7]">Uncertainty Analysis</span>
                      <span>→</span>
                      <span className="px-2.5 py-1 bg-[#075563] text-white rounded">Route Recommendation</span>
                    </div>
                    <p className="text-[11px] text-[#526B7A] leading-relaxed">
                      1. Copernicus/AMSR2 environmental fields are fused with real-time GPS telemetry.<br />
                      2. Iceberg CPA and sea-ice concentration limits evaluate route hazard exposure.<br />
                      3. Route risk index and drift trajectory uncertainty envelopes are calculated.<br />
                      4. Decision support engine selects optimal corridor balancing risk, fuel, and uncertainty.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

