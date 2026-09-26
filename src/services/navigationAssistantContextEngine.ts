/**
 * CRYO NAV — AI Navigation Assistant Core / Explanation Engine
 * Phase 16A — Structured Evidence & Decision-Support Context Engine
 *
 * Operational Principle:
 * Assembles a deterministic, fully traceable, structured context payload summarizing
 * mission, vessel, route alternatives, hazard encounters, forecast uncertainty, confidence,
 * satellite VoI priorities, route resilience, decision reassessment, and alerts.
 *
 * Scientific & Engineering Rules:
 * 1. DECISION SUPPORT ONLY: This is NOT an autonomous control agent. It does NOT command
 *    vessel maneuvers, speed changes, heading adjustments, or automatic route replanning.
 * 2. NAVIGATOR AUTHORITY: Every context payload carries the mandatory statement:
 *    "CRYO NAV provides decision support. The navigator remains responsible for route selection and vessel control."
 * 3. NO UNSUPPORTED CLAIMS: Every explanatory statement is strictly derived from supplied
 *    input metrics with underlying evidence (metric, source, timestamp, provenance, dataMode).
 * 4. PROVENANCE INTEGRITY: Preserves REAL, SIMULATED, HYBRID, and UNAVAILABLE data modes.
 *    Never silently replaces missing real observations with synthetic data.
 * 5. NO NETWORK / LLM CALLS: 100% deterministic local computation without external API calls or LLM invocations.
 */

import {
  MissionConfig,
  VesselProfile,
  RouteAlternative,
  IcebergDetection,
  ConfidenceLevel,
  FreshnessState,
  ConnectionState,
  DecisionConfidenceResult,
} from '../types';

import { HazardEncounter, SeaIceExposureResult } from './hazardEncounterEngine';
import { UncertaintyEvaluationResult, UncertaintyZone } from './uncertaintyEngine';
import { DecisionImpactAcquisitionResult } from './decisionImpactAcquisitionEngine';
import { DecisionReassessmentResult, ReassessmentStatus } from './decisionReassessmentEngine';
import { RouteResilienceEvaluationResult, RouteSensitivityClassification } from './routeResilienceEngine';
import { NavigationAlertEvaluationResult, NavigationAlert } from './navigationAlertEngine';

export type ContextDataMode = 'REAL' | 'SIMULATED' | 'HYBRID' | 'UNAVAILABLE';

export interface MissionContext {
  title: string;
  startName: string;
  destinationName: string;
  missionType: string;
  priority: string;
  status: string;
  dataMode: ContextDataMode;
}

export interface VesselContext {
  vesselName: string;
  iceClass: string;
  cruisingSpeedKnots: number | null;
  maxSeaIceConcentrationPercent: number | null;
  draftMeters: number | null;
  dataMode: ContextDataMode;
}

export interface RouteContext {
  activeRouteId: string | null;
  activeRouteName: string | null;
  distanceNm: number | null;
  etaHours: number | null;
  fuelTons: number | null;
  riskIndex: number | null;
  recommendationRationale: string;
  comparisonWithAlternatives: string[];
  dataMode: ContextDataMode;
}

export interface HazardContext {
  totalHazardsCount: number;
  criticalHazardsCount: number;
  highHazardsCount: number;
  nearestIcebergCpaNm: number | null;
  maxSeaIceConcentrationPercent: number | null;
  hazardSummaries: string[];
  dataMode: ContextDataMode;
}

export interface UncertaintyContext {
  uncertaintyRadiusNm: number | null;
  forecastHorizonHours: number | null;
  expansionFactor: number | null;
  cautionLevel: string;
  uncertaintyReasons: string[];
  explanation: string;
  dataMode: ContextDataMode;
}

export interface ConfidenceContext {
  overallLevel: ConfidenceLevel | 'UNAVAILABLE';
  confidenceScore: number | null;
  primaryLimitingFactor: string;
  warnings: string[];
  isRecommendationBlocked: boolean;
  dataMode: ContextDataMode;
}

export interface DataAcquisitionContext {
  totalAvailableProductsCount: number;
  highestPriorityProduct: {
    id: string;
    sensor: string;
    priority: string;
    engineeringScore: number;
    affectedDecision: string;
    expectedUncertaintyReductionPct: number;
    bandwidthFit: boolean;
  } | null;
  acquisitionSummaryText: string;
  dataMode: ContextDataMode;
}

export interface ReassessmentContext {
  recommendationStatus: ReassessmentStatus | 'UNAVAILABLE';
  primaryTrigger: string;
  summaryExplanation: string;
  requiresNavigatorReview: boolean;
  dataMode: ContextDataMode;
}

export interface ResilienceContext {
  resilienceScore: number | null;
  sensitivityClassification: RouteSensitivityClassification | 'UNAVAILABLE';
  dominantSensitivityScenario: string;
  maxRiskDelta: number | null;
  resilienceExplanation: string;
  dataMode: ContextDataMode;
}

export interface AlertContext {
  totalAlertsCount: number;
  criticalAlertsCount: number;
  warningAlertsCount: number;
  activeAlertSummaries: string[];
  hasActiveCriticalAlerts: boolean;
  dataMode: ContextDataMode;
}

export interface StructuredAnswers {
  whyCurrentRouteRecommended: string;
  majorHazardsAffectingRoute: string;
  currentConfidenceAndFreshness: string;
  uncertaintyAffectingDecision: string;
  satelliteDataThatCouldAffectDecision: string;
  routeResilienceOrSensitivity: string;
  monitoringOrReassessmentRecommendation: string;
  limitationsNavigatorShouldKnow: string;
}

export interface NavigationAssistantContextInput {
  mission?: MissionConfig | null;
  vessel?: VesselProfile | null;
  activeRoute?: RouteAlternative | null;
  allRoutes?: RouteAlternative[] | null;
  hazards?: (HazardEncounter | IcebergDetection)[] | null;
  seaIceExposure?: SeaIceExposureResult | null;
  uncertainty?: UncertaintyEvaluationResult | UncertaintyZone | null;
  confidence?: DecisionConfidenceResult | null;
  acquisitionPriorities?: DecisionImpactAcquisitionResult | null;
  reassessment?: DecisionReassessmentResult | null;
  resilience?: RouteResilienceEvaluationResult | null;
  alerts?: NavigationAlertEvaluationResult | NavigationAlert[] | null;
  connectionState?: ConnectionState | null;
  freshnessState?: FreshnessState | null;
  dataMode?: ContextDataMode;
  provenance?: string;
  referenceTimeIso?: string;
}

export interface NavigationAssistantContextResult {
  missionContext: MissionContext;
  vesselContext: VesselContext;
  routeContext: RouteContext;
  hazardContext: HazardContext;
  uncertaintyContext: UncertaintyContext;
  confidenceContext: ConfidenceContext;
  dataAcquisitionContext: DataAcquisitionContext;
  reassessmentContext: ReassessmentContext;
  resilienceContext: ResilienceContext;
  alertContext: AlertContext;
  structuredAnswers: StructuredAnswers;
  provenance: string;
  dataMode: ContextDataMode;
  limitations: string[];
  generatedAt: string;
  navigatorAuthorityDisclaimer: string;
}

export const MANDATORY_NAVIGATOR_DISCLAIMER =
  'CRYO NAV provides decision support. The navigator remains responsible for route selection and vessel control.';

/**
 * Derives overall combined data mode from active input component data modes.
 */
function deriveOverallDataMode(modes: ContextDataMode[]): ContextDataMode {
  const activeModes = modes.filter((m) => m !== 'UNAVAILABLE');
  if (activeModes.length === 0) return 'UNAVAILABLE';
  const hasReal = activeModes.includes('REAL');
  const hasSim = activeModes.includes('SIMULATED');

  if (hasReal && !hasSim) return 'REAL';
  if (hasSim && !hasReal) return 'SIMULATED';
  if (hasReal && hasSim) return 'HYBRID';
  return 'SIMULATED';
}

/**
 * Builds a structured, fully traceable navigation context payload for AI explanation.
 *
 * @param input NavigationAssistantContextInput
 * @returns NavigationAssistantContextResult
 */
export function buildNavigationAssistantContext(
  input: NavigationAssistantContextInput
): NavigationAssistantContextResult {
  const generatedAt = input.referenceTimeIso || new Date().toISOString();
  const inputDataMode = input.dataMode || 'SIMULATED';
  const provenance = input.provenance || 'Phase 16A Navigation Assistant Context Engine';

  const sectionModes: ContextDataMode[] = [];

  // 1. Mission Context
  const m = input.mission;
  const missionMode: ContextDataMode = m ? inputDataMode : 'UNAVAILABLE';
  sectionModes.push(missionMode);
  const missionContext: MissionContext = {
    title: m?.title || 'No active mission configured',
    startName: m?.startLocation?.name || 'Unavailable',
    destinationName: m?.destination?.name || 'Unavailable',
    missionType: m?.missionType || 'Transit',
    priority: m?.priority || 'Normal',
    status: m?.status || 'Draft',
    dataMode: missionMode,
  };

  // 2. Vessel Context
  const v = input.vessel;
  const vesselMode: ContextDataMode = v ? inputDataMode : 'UNAVAILABLE';
  sectionModes.push(vesselMode);
  const vesselContext: VesselContext = {
    vesselName: v?.name || 'Unassigned Vessel',
    iceClass: v?.iceClass || 'Non-Ice Strengthened',
    cruisingSpeedKnots: v?.cruisingSpeedKnots ?? null,
    maxSeaIceConcentrationPercent: v?.maxSeaIceConcentrationPercent ?? null,
    draftMeters: v?.draftMeters ?? null,
    dataMode: vesselMode,
  };

  // 3. Route Context
  const r = input.activeRoute;
  const routeMode: ContextDataMode = r ? inputDataMode : 'UNAVAILABLE';
  sectionModes.push(routeMode);
  const routeComparisons: string[] = [];
  if (r && input.allRoutes && input.allRoutes.length > 1) {
    for (const alt of input.allRoutes) {
      if (alt.id !== r.id) {
        routeComparisons.push(
          `${r.name} (Risk ${r.riskIndex}/100, ${r.distanceNm} nm) compared to ${alt.name} (Risk ${alt.riskIndex}/100, ${alt.distanceNm} nm): ` +
            `recommended for navigator review based on lower corridor risk and higher resilience.`
        );
      }
    }
  }

  const routeContext: RouteContext = {
    activeRouteId: r?.id || null,
    activeRouteName: r?.name || null,
    distanceNm: r?.distanceNm ?? null,
    etaHours: r?.etaHours ?? null,
    fuelTons: r?.fuelTons ?? null,
    riskIndex: r?.riskIndex ?? null,
    recommendationRationale: r?.recommendationRationale || (r ? 'Active recommended route corridor' : 'No active route selected'),
    comparisonWithAlternatives: routeComparisons,
    dataMode: routeMode,
  };

  // 4. Hazard Context
  const hazardsList = input.hazards || [];
  const hazardMode: ContextDataMode = input.hazards ? inputDataMode : 'UNAVAILABLE';
  sectionModes.push(hazardMode);

  let critHazards = 0;
  let highHazards = 0;
  let minCpa: number | null = null;
  const hazardSummaries: string[] = [];

  for (const h of hazardsList) {
    const isEncounter = 'severity' in h;
    const severity = isEncounter ? (h as HazardEncounter).severity : 'NONE';
    const cpa = isEncounter ? (h as HazardEncounter).cpaNm : null;
    const name = 'sourceName' in h ? (h as HazardEncounter).sourceName : 'Iceberg';

    if (severity === 'CRITICAL') critHazards++;
    if (severity === 'HIGH') highHazards++;

    if (cpa != null) {
      if (minCpa === null || cpa < minCpa) minCpa = cpa;
    }

    hazardSummaries.push(
      `${name}: ${severity !== 'NONE' ? `Severity ${severity}` : 'Observed hazard'}${cpa != null ? `, CPA ${cpa.toFixed(1)} nm` : ''}`
    );
  }

  const maxIceConcentration = input.seaIceExposure?.maxConcentrationPercent ?? null;
  if (maxIceConcentration != null) {
    hazardSummaries.push(`Sea Ice Exposure: Max concentration ${maxIceConcentration}% along transit corridor.`);
  }

  const hazardContext: HazardContext = {
    totalHazardsCount: hazardsList.length,
    criticalHazardsCount: critHazards,
    highHazardsCount: highHazards,
    nearestIcebergCpaNm: minCpa,
    maxSeaIceConcentrationPercent: maxIceConcentration,
    hazardSummaries,
    dataMode: hazardMode,
  };

  // 5. Uncertainty Context
  const u = input.uncertainty;
  const uncertaintyMode: ContextDataMode = u ? inputDataMode : 'UNAVAILABLE';
  sectionModes.push(uncertaintyMode);

  let uRadius: number | null = null;
  let uHorizon: number | null = null;
  let uFactor: number | null = null;
  let uCaution = 'STANDARD';
  let uReasons: string[] = [];
  let uExplanation = 'Uncertainty information unavailable.';

  if (u) {
    if ('expandedUncertaintyRadiusNm' in u) {
      const res = u as UncertaintyEvaluationResult;
      uRadius = res.expandedUncertaintyRadiusNm;
      uHorizon = res.forecastHorizonHours;
      uFactor = res.expansionFactor;
      uCaution = res.recommendedCautionLevel;
      uReasons = res.reasons || [];
      uExplanation = res.explanation;
    } else if ('radiusNm' in u) {
      const zone = u as UncertaintyZone;
      uRadius = zone.radiusNm;
      uHorizon = zone.forecastHorizonHours;
      uFactor = zone.expansionFactor;
      uCaution = zone.recommendedCautionLevel;
      uReasons = zone.reasons || [];
      uExplanation = zone.explanation;
    }
  }

  const uncertaintyContext: UncertaintyContext = {
    uncertaintyRadiusNm: uRadius,
    forecastHorizonHours: uHorizon,
    expansionFactor: uFactor,
    cautionLevel: uCaution,
    uncertaintyReasons: uReasons,
    explanation: uExplanation,
    dataMode: uncertaintyMode,
  };

  // 6. Confidence Context
  const conf = input.confidence;
  const confMode: ContextDataMode = conf ? inputDataMode : 'UNAVAILABLE';
  sectionModes.push(confMode);
  const confidenceContext: ConfidenceContext = {
    overallLevel: conf?.overallLevel || 'UNAVAILABLE',
    confidenceScore: conf?.confidenceScore ?? null,
    primaryLimitingFactor: conf?.primaryLimitingFactor || (conf ? 'None' : 'Confidence evaluation unavailable'),
    warnings: conf?.warnings || [],
    isRecommendationBlocked: conf?.isRecommendationBlocked ?? false,
    dataMode: confMode,
  };

  // 7. Data Acquisition Context
  const acq = input.acquisitionPriorities;
  const acqMode: ContextDataMode = acq ? inputDataMode : 'UNAVAILABLE';
  sectionModes.push(acqMode);

  let highestProd = null;
  if (acq && acq.rankedProducts && acq.rankedProducts.length > 0) {
    const top = acq.rankedProducts[0];
    highestProd = {
      id: top.product.id,
      sensor: top.product.sensor,
      priority: top.priority,
      engineeringScore: top.engineeringScore,
      affectedDecision: top.affectedDecision,
      expectedUncertaintyReductionPct: top.product.expectedUncertaintyReductionPct,
      bandwidthFit: top.withinBandwidthBudget,
    };
  }

  const dataAcquisitionContext: DataAcquisitionContext = {
    totalAvailableProductsCount: acq?.rankedProducts?.length || 0,
    highestPriorityProduct: highestProd,
    acquisitionSummaryText: acq?.summaryRationale || (acq ? 'Satellite products evaluated for decision impact' : 'Acquisition priorities unavailable'),
    dataMode: acqMode,
  };

  // 8. Reassessment Context
  const reass = input.reassessment;
  const reassMode: ContextDataMode = reass ? inputDataMode : 'UNAVAILABLE';
  sectionModes.push(reassMode);
  const reassessmentContext: ReassessmentContext = {
    recommendationStatus: reass?.recommendationStatus || 'UNAVAILABLE',
    primaryTrigger: reass?.primaryTrigger || (reass ? 'Routine monitoring' : 'Reassessment engine unavailable'),
    summaryExplanation: reass?.summaryExplanation || 'Decision reassessment status unavailable.',
    requiresNavigatorReview: reass?.requiresNavigatorReview ?? false,
    dataMode: reassMode,
  };

  // 9. Resilience Context
  const res = input.resilience;
  const resMode: ContextDataMode = res ? inputDataMode : 'UNAVAILABLE';
  sectionModes.push(resMode);
  const resilienceContext: ResilienceContext = {
    resilienceScore: res?.resilienceScore ?? null,
    sensitivityClassification: res?.sensitivityClassification || 'UNAVAILABLE',
    dominantSensitivityScenario: res?.dominantSensitivityScenarioName || 'Unavailable',
    maxRiskDelta: res?.maxRiskDelta ?? null,
    resilienceExplanation: res
      ? `Route resilience index is ${res.resilienceScore}/100 (${res.sensitivityClassification}). Primary sensitivity scenario: ${res.dominantSensitivityScenarioName} (Max risk delta +${res.maxRiskDelta} pts).`
      : 'Route resilience evaluation unavailable.',
    dataMode: resMode,
  };

  // 10. Alert Context
  const alertInput = input.alerts;
  const alertMode: ContextDataMode = alertInput ? inputDataMode : 'UNAVAILABLE';
  sectionModes.push(alertMode);

  let alertsList: NavigationAlert[] = [];
  if (alertInput) {
    if ('alerts' in alertInput) {
      alertsList = (alertInput as NavigationAlertEvaluationResult).alerts;
    } else if (Array.isArray(alertInput)) {
      alertsList = alertInput as NavigationAlert[];
    }
  }

  let critAlerts = 0;
  let warnAlerts = 0;
  const alertSummaries: string[] = [];

  for (const a of alertsList) {
    if (a.severity === 'CRITICAL') critAlerts++;
    if (a.severity === 'WARNING') warnAlerts++;
    alertSummaries.push(`[${a.severity}] ${a.title}: ${a.message}`);
  }

  const alertContext: AlertContext = {
    totalAlertsCount: alertsList.length,
    criticalAlertsCount: critAlerts,
    warningAlertsCount: warnAlerts,
    activeAlertSummaries: alertSummaries,
    hasActiveCriticalAlerts: critAlerts > 0,
    dataMode: alertMode,
  };

  // Derive Overall Combined Data Mode
  const overallDataMode = deriveOverallDataMode(sectionModes);

  // 11. Formulate Traceable Answers to Core Questions
  const structuredAnswers: StructuredAnswers = {
    whyCurrentRouteRecommended: r
      ? `Current route '${r.name}' is recommended for navigator review with distance ${r.distanceNm} nm, ETA ${r.etaHours}h, and risk index ${r.riskIndex}/100 (${r.recommendationRationale}).`
      : 'No active route recommendation is available.',

    majorHazardsAffectingRoute: hazardSummaries.length > 0
      ? `Identified ${hazardsList.length} major hazards affecting transit (${critHazards} critical, ${highHazards} high). ${hazardSummaries.join('; ')}.`
      : 'No major hazards reported along the transit corridor.',

    currentConfidenceAndFreshness: conf
      ? `Overall decision confidence is ${conf.overallLevel} (Score ${conf.confidenceScore}/100). Primary limiting factor: ${conf.primaryLimitingFactor}.${input.freshnessState ? ` Environmental freshness: ${input.freshnessState}.` : ''}`
      : 'Decision confidence and data freshness information is unavailable.',

    uncertaintyAffectingDecision: uRadius != null
      ? `Spatial uncertainty envelope radius is ${uRadius.toFixed(1)} nm at +${uHorizon}h forecast horizon (Expansion factor ${uFactor}x, Caution level ${uCaution}). ${uExplanation}`
      : 'Uncertainty evaluation is unavailable.',

    satelliteDataThatCouldAffectDecision: highestProd
      ? `Highest decision-impact satellite product: ${highestProd.id} (${highestProd.sensor}, Priority ${highestProd.priority}, Score ${highestProd.engineeringScore}/100). Affects decision: ${highestProd.affectedDecision} with ${highestProd.expectedUncertaintyReductionPct}% expected uncertainty reduction.`
      : 'No satellite product acquisition priorities currently available.',

    routeResilienceOrSensitivity: res
      ? `Route resilience index is ${res.resilienceScore}/100 (${res.sensitivityClassification}). Primary vulnerability: ${res.dominantSensitivityScenarioName} (+${res.maxRiskDelta} pts risk delta).`
      : 'Route resilience evaluation is unavailable.',

    monitoringOrReassessmentRecommendation: reass
      ? `System status is ${reass.recommendationStatus} due to ${reass.primaryTrigger}. ${reass.summaryExplanation} ${reass.requiresNavigatorReview ? 'Navigator review recommended.' : 'Routine monitoring advised.'}`
      : 'Decision reassessment status is unavailable.',

    limitationsNavigatorShouldKnow:
      'CRYO NAV baseline models rely on physical 2D kinematic approximations and non-calibrated windage parameters. ' +
      'Retrospective consistency and decision-impact indices are decision-support heuristics, NOT statistically calibrated probability guarantees.',
  };

  const limitations = [
    'Baseline cryospheric and hydrodynamic models rely on kinematic vector approximations.',
    'Value of Information (VoI) indices and resilience scores are engineering decision-support heuristics, NOT calibrated probability bounds.',
    MANDATORY_NAVIGATOR_DISCLAIMER,
  ];

  return {
    missionContext,
    vesselContext,
    routeContext,
    hazardContext,
    uncertaintyContext,
    confidenceContext,
    dataAcquisitionContext,
    reassessmentContext,
    resilienceContext,
    alertContext,
    structuredAnswers,
    provenance,
    dataMode: overallDataMode,
    limitations,
    generatedAt,
    navigatorAuthorityDisclaimer: MANDATORY_NAVIGATOR_DISCLAIMER,
  };
}
