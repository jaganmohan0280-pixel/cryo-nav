/**
 * CRYO NAV — Navigation Decision State / System Integration Core
 * Phase 17A — System-Level Navigation Decision State Aggregation Engine
 *
 * Operational Principle:
 * Acts as an orchestration and aggregation layer that synthesizes outputs from all core engines:
 * - Voyage State Monitoring (Phase 8A)
 * - Hazard / Encounter Intelligence (Phase 8B)
 * - Uncertainty Engine (Phase 10A)
 * - Decision-Impact Acquisition Engine (Phase 11A)
 * - Continuous Decision Reassessment Engine (Phase 12A)
 * - Route Resilience & Counterfactual Core Engine (Phase 13A)
 * - Navigation Alerting Engine (Phase 14A)
 * - Continuous Model Validation Engine (Phase 15A)
 *
 * Scientific & Engineering Rules:
 * 1. AGGREGATION ONLY: This is NOT a new navigation model. It does NOT rewrite scientific formulas,
 *    create new heuristic safety scores, or alter active route recommendations.
 * 2. NO AUTONOMOUS ACTION: Does NOT change route, waypoints, vessel speed, heading, trigger acquisition,
 *    trigger replanning, retrain models, or send notifications.
 * 3. PROVENANCE INTEGRITY: Preserves input dataMode ('REAL' | 'SIMULATED' | 'HYBRID' | 'UNAVAILABLE').
 *    Never silently upgrades data quality. If mixed sources are present, represents 'HYBRID'.
 * 4. NAVIGATOR AUTHORITY: Retains mandatory disclaimers establishing that the navigator retains final operational authority.
 */

import {
  RouteAlternative,
  IcebergDetection,
  ConfidenceLevel,
  FreshnessState,
  ConnectionState,
  DecisionConfidenceResult,
} from '../types';

import { VoyageState } from './voyageStateEngine';
import { HazardEncounter, SeaIceExposureResult } from './hazardEncounterEngine';
import { UncertaintyEvaluationResult, UncertaintyZone } from './uncertaintyEngine';
import { AcquisitionRankingResult } from './decisionImpactAcquisitionEngine';
import { DecisionReassessmentResult, ReassessmentStatus } from './decisionReassessmentEngine';
import { RouteResilienceEvaluationResult, RouteSensitivityClassification } from './routeResilienceEngine';
import { NavigationAlertEvaluationResult, NavigationAlert } from './navigationAlertEngine';
import { ModelValidationSummary } from './modelValidationEngine';

export type SystemDataMode = 'REAL' | 'SIMULATED' | 'HYBRID' | 'UNAVAILABLE';

export type SystemDecisionStatus =
  | 'STABLE'
  | 'MONITOR'
  | 'REASSESS'
  | 'RECOMMEND_REVIEW'
  | 'UNAVAILABLE';

export type SystemDecisionSensitivity =
  | 'ROBUST'
  | 'SENSITIVE'
  | 'HIGHLY_SENSITIVE'
  | 'UNKNOWN';

export interface VoyageStateSummary {
  vesselId: string | null;
  vesselName: string | null;
  iceClass: string | null;
  navigationStatus: string | null;
  progressPercent: number | null;
  remainingDistanceNm: number | null;
  estimatedTimeRemainingHours: number | null;
  dataMode: SystemDataMode;
}

export interface ActiveRouteSummary {
  routeId: string | null;
  routeName: string | null;
  distanceNm: number | null;
  etaHours: number | null;
  fuelTons: number | null;
  riskIndex: number | null;
  isRecommended: boolean;
  dataMode: SystemDataMode;
}

export interface HazardStateSummary {
  totalHazards: number;
  criticalHazards: number;
  highHazards: number;
  minimumCpaNm: number | null;
  earliestTcaHours: number | null;
  primaryHazardId: string | null;
  primaryHazardName: string | null;
  provenance: string;
  dataMode: SystemDataMode;
}

export interface UncertaintyStateSummary {
  largestUncertaintyRadiusNm: number | null;
  forecastHorizonHours: number | null;
  expansionFactor: number | null;
  confidenceLevel: ConfidenceLevel | 'UNAVAILABLE';
  freshnessState: FreshnessState | 'UNAVAILABLE';
  cautionLevel: string;
  uncertaintyReasons: string[];
  dataMode: SystemDataMode;
}

export interface ConfidenceStateSummary {
  overallLevel: ConfidenceLevel | 'UNAVAILABLE';
  confidenceScore: number | null;
  primaryLimitingFactor: string;
  isRecommendationBlocked: boolean;
  dataMode: SystemDataMode;
}

export interface AcquisitionStateSummary {
  highestPriorityProduct: string | null;
  priorityIndex: number | null;
  affectedDecision: string | null;
  expectedUncertaintyReductionPct: number | null;
  connectivityState: ConnectionState | string;
  isAvailable: boolean;
  dataMode: SystemDataMode;
}

export interface ReassessmentStateSummary {
  status: ReassessmentStatus | 'UNAVAILABLE';
  primaryTrigger: string;
  changedVariables: string[];
  summaryExplanation: string;
  requiresNavigatorReview: boolean;
  dataMode: SystemDataMode;
}

export interface ResilienceStateSummary {
  resilienceScore: number | null;
  sensitivity: RouteSensitivityClassification | 'UNKNOWN';
  dominantScenario: string | null;
  maxRiskDelta: number | null;
  dataMode: SystemDataMode;
}

export interface AlertStateSummary {
  totalAlerts: number;
  criticalCount: number;
  warningCount: number;
  advisoryCount: number;
  infoCount: number;
  hasActiveCriticalAlert: boolean;
  dataMode: SystemDataMode;
}

export interface ValidationStateSummary {
  totalEvaluatedPredictions: number;
  matchedObservationsCount: number;
  meanAbsoluteError: number | null;
  rootMeanSquareError: number | null;
  uncertaintyCoverageRatePct: number | null;
  overallStatus: string;
  dataMode: SystemDataMode;
}

export interface NavigationDecisionStateInput {
  voyageState?: VoyageState | null;
  activeRoute?: RouteAlternative | null;
  hazards?: (HazardEncounter | IcebergDetection)[] | null;
  seaIceExposure?: SeaIceExposureResult | null;
  uncertainty?: UncertaintyEvaluationResult | UncertaintyZone | null;
  confidence?: DecisionConfidenceResult | null;
  acquisitionPriorities?: AcquisitionRankingResult | null;
  reassessment?: DecisionReassessmentResult | null;
  resilience?: RouteResilienceEvaluationResult | null;
  alerts?: NavigationAlertEvaluationResult | NavigationAlert[] | null;
  validationSummary?: ModelValidationSummary | null;
  connectionState?: ConnectionState | null;
  freshnessState?: FreshnessState | null;
  dataMode?: SystemDataMode;
  provenance?: string;
  referenceTimeIso?: string;
}

export interface NavigationDecisionState {
  decisionStateId: string;
  timestamp: string;
  voyageState: VoyageStateSummary;
  activeRoute: ActiveRouteSummary;
  hazardSummary: HazardStateSummary;
  uncertaintySummary: UncertaintyStateSummary;
  confidenceSummary: ConfidenceStateSummary;
  acquisitionSummary: AcquisitionStateSummary;
  reassessmentSummary: ReassessmentStateSummary;
  resilienceSummary: ResilienceStateSummary;
  alertSummary: AlertStateSummary;
  validationSummary: ValidationStateSummary;
  decisionStatus: SystemDecisionStatus;
  decisionSensitivity: SystemDecisionSensitivity;
  overallDataMode: SystemDataMode;
  provenance: string;
  limitations: string[];
}

export const MANDATORY_DECISION_STATE_DISCLAIMER =
  'CRYO NAV decision state is a system-level aggregation for decision support. The navigator retains final operational authority for vessel control and route selection.';

/**
 * Derives overall combined data mode from active input section modes.
 */
function deriveOverallDataMode(modes: SystemDataMode[]): SystemDataMode {
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
 * Aggregates outputs from core engines into a unified system-level navigation decision state.
 *
 * @param input NavigationDecisionStateInput
 * @returns NavigationDecisionState
 */
export function buildNavigationDecisionState(
  input: NavigationDecisionStateInput
): NavigationDecisionState {
  const timestamp = input.referenceTimeIso || new Date().toISOString();
  const inputDataMode = input.dataMode || 'SIMULATED';
  const provenance = input.provenance || 'Phase 17A System Decision State Engine';

  // Deterministic ID generation based on timestamp
  const stateIdSuffix = timestamp.replace(/[^0-9]/g, '').slice(0, 14);
  const decisionStateId = `DECISION_STATE_${stateIdSuffix || 'DEFAULT'}`;

  const sectionModes: SystemDataMode[] = [];

  // 1. Voyage State Summary
  const vs = input.voyageState;
  const voyageMode: SystemDataMode = vs ? (vs.dataMode as SystemDataMode) || inputDataMode : 'UNAVAILABLE';
  sectionModes.push(voyageMode);
  const voyageState: VoyageStateSummary = {
    vesselId: vs?.vesselId || null,
    vesselName: vs?.vesselName || null,
    iceClass: vs?.iceClass || null,
    navigationStatus: vs?.navigationStatus || null,
    progressPercent: vs?.progressPercent ?? null,
    remainingDistanceNm: vs?.remainingDistanceNm ?? null,
    estimatedTimeRemainingHours: vs?.estimatedTimeRemainingHours ?? null,
    dataMode: voyageMode,
  };

  // 2. Active Route Summary
  const r = input.activeRoute;
  const routeMode: SystemDataMode = r ? inputDataMode : 'UNAVAILABLE';
  sectionModes.push(routeMode);
  const activeRoute: ActiveRouteSummary = {
    routeId: r?.id || null,
    routeName: r?.name || null,
    distanceNm: r?.distanceNm ?? null,
    etaHours: r?.etaHours ?? null,
    fuelTons: r?.fuelTons ?? null,
    riskIndex: r?.riskIndex ?? null,
    isRecommended: r?.isRecommended ?? false,
    dataMode: routeMode,
  };

  // 3. Hazard Summary
  const hazardsList = input.hazards || [];
  const hazardMode: SystemDataMode = input.hazards ? inputDataMode : 'UNAVAILABLE';
  sectionModes.push(hazardMode);

  let critHazards = 0;
  let highHazards = 0;
  let minCpa: number | null = null;
  let minTca: number | null = null;
  let primaryId: string | null = null;
  let primaryName: string | null = null;

  for (const h of hazardsList) {
    const isEncounter = 'severity' in h;
    const severity = isEncounter ? (h as HazardEncounter).severity : 'NONE';
    const cpa = isEncounter ? (h as HazardEncounter).cpaNm : null;
    const tca = isEncounter ? (h as HazardEncounter).tcaHours : null;
    const hId = isEncounter ? (h as HazardEncounter).hazardId : 'id' in h ? (h as IcebergDetection).id : null;
    const hName = isEncounter ? (h as HazardEncounter).sourceName : 'Iceberg';

    if (severity === 'CRITICAL') critHazards++;
    if (severity === 'HIGH') highHazards++;

    if (cpa != null) {
      if (minCpa === null || cpa < minCpa) {
        minCpa = cpa;
        primaryId = hId;
        primaryName = hName;
      }
    }
    if (tca != null) {
      if (minTca === null || tca < minTca) {
        minTca = tca;
      }
    }
  }

  const hazardSummary: HazardStateSummary = {
    totalHazards: hazardsList.length,
    criticalHazards: critHazards,
    highHazards: highHazards,
    minimumCpaNm: minCpa,
    earliestTcaHours: minTca,
    primaryHazardId: primaryId,
    primaryHazardName: primaryName,
    provenance: hazardsList.length > 0 ? 'Hazard Encounter Intelligence Engine' : 'No active hazards',
    dataMode: hazardMode,
  };

  // 4. Uncertainty Summary
  const u = input.uncertainty;
  const uncertaintyMode: SystemDataMode = u ? inputDataMode : 'UNAVAILABLE';
  sectionModes.push(uncertaintyMode);

  let uRadius: number | null = null;
  let uHorizon: number | null = null;
  let uFactor: number | null = null;
  let uCaution = 'STANDARD';
  let uReasons: string[] = [];

  if (u) {
    if ('expandedUncertaintyRadiusNm' in u) {
      const res = u as UncertaintyEvaluationResult;
      uRadius = res.expandedUncertaintyRadiusNm;
      uHorizon = res.forecastHorizonHours;
      uFactor = res.expansionFactor;
      uCaution = res.recommendedCautionLevel;
      uReasons = res.reasons || [];
    } else if ('radiusNm' in u) {
      const zone = u as UncertaintyZone;
      uRadius = zone.radiusNm;
      uHorizon = zone.forecastHorizonHours;
      uFactor = zone.expansionFactor;
      uCaution = zone.recommendedCautionLevel;
      uReasons = zone.reasons || [];
    }
  }

  const uncertaintySummary: UncertaintyStateSummary = {
    largestUncertaintyRadiusNm: uRadius,
    forecastHorizonHours: uHorizon,
    expansionFactor: uFactor,
    confidenceLevel: input.confidence?.overallLevel || 'UNAVAILABLE',
    freshnessState: input.freshnessState || 'UNAVAILABLE',
    cautionLevel: uCaution,
    uncertaintyReasons: uReasons,
    dataMode: uncertaintyMode,
  };

  // 5. Confidence Summary
  const conf = input.confidence;
  const confMode: SystemDataMode = conf ? inputDataMode : 'UNAVAILABLE';
  sectionModes.push(confMode);
  const confidenceSummary: ConfidenceStateSummary = {
    overallLevel: conf?.overallLevel || 'UNAVAILABLE',
    confidenceScore: conf?.confidenceScore ?? null,
    primaryLimitingFactor: conf?.primaryLimitingFactor || (conf ? 'None' : 'Confidence evaluation unavailable'),
    isRecommendationBlocked: conf?.isRecommendationBlocked ?? false,
    dataMode: confMode,
  };

  // 6. Acquisition Summary
  const acq = input.acquisitionPriorities;
  const acqMode: SystemDataMode = acq ? inputDataMode : 'UNAVAILABLE';
  sectionModes.push(acqMode);

  let topProdName: string | null = null;
  let topScore: number | null = null;
  let topDecision: string | null = null;
  let topUncertRed: number | null = null;

  if (acq && acq.rankedCandidates && acq.rankedCandidates.length > 0) {
    const top = acq.rankedCandidates[0];
    topProdName = top.productId;
    topScore = top.engineeringPriorityIndex;
    topDecision = top.affectedDecision;
    topUncertRed = top.expectedUncertaintyReductionPct;
  }

  const acquisitionSummary: AcquisitionStateSummary = {
    highestPriorityProduct: topProdName,
    priorityIndex: topScore,
    affectedDecision: topDecision,
    expectedUncertaintyReductionPct: topUncertRed,
    connectivityState: input.connectionState || acq?.connectionState || 'ONLINE',
    isAvailable: acq != null && (acq.rankedCandidates?.length ?? 0) > 0,
    dataMode: acqMode,
  };

  // 7. Reassessment Summary
  const reass = input.reassessment;
  const reassMode: SystemDataMode = reass ? (reass.dataMode as SystemDataMode) || inputDataMode : 'UNAVAILABLE';
  sectionModes.push(reassMode);

  const reqReview = reass
    ? reass.reassessmentStatus === 'REASSESS' || reass.reassessmentStatus === 'RECOMMEND_REVIEW'
    : false;

  const reassessmentSummary: ReassessmentStateSummary = {
    status: reass?.reassessmentStatus || 'UNAVAILABLE',
    primaryTrigger: reass?.triggerReasons?.[0] || (reass ? 'Routine monitoring' : 'Engine unavailable'),
    changedVariables: reass?.changedVariables || [],
    summaryExplanation: reass?.explanation || 'Decision reassessment status unavailable.',
    requiresNavigatorReview: reqReview,
    dataMode: reassMode,
  };

  // 8. Resilience Summary
  const res = input.resilience;
  const resMode: SystemDataMode = res ? inputDataMode : 'UNAVAILABLE';
  sectionModes.push(resMode);

  const resilienceSummary: ResilienceStateSummary = {
    resilienceScore: res?.resilienceScore ?? null,
    sensitivity: res?.sensitivityClassification || 'UNKNOWN',
    dominantScenario: res?.dominantSensitivityScenarioName || null,
    maxRiskDelta: res?.maxRiskDelta ?? null,
    dataMode: resMode,
  };

  // 9. Alert Summary
  const alertInput = input.alerts;
  const alertMode: SystemDataMode = alertInput ? inputDataMode : 'UNAVAILABLE';
  sectionModes.push(alertMode);

  let alertsList: NavigationAlert[] = [];
  if (alertInput) {
    if ('alerts' in alertInput) {
      alertsList = (alertInput as NavigationAlertEvaluationResult).alerts;
    } else if (Array.isArray(alertInput)) {
      alertsList = alertInput as NavigationAlert[];
    }
  }

  let cAlerts = 0;
  let wAlerts = 0;
  let aAlerts = 0;
  let iAlerts = 0;

  for (const al of alertsList) {
    if (al.severity === 'CRITICAL') cAlerts++;
    else if (al.severity === 'WARNING') wAlerts++;
    else if (al.severity === 'ADVISORY') aAlerts++;
    else if (al.severity === 'INFO') iAlerts++;
  }

  const alertSummary: AlertStateSummary = {
    totalAlerts: alertsList.length,
    criticalCount: cAlerts,
    warningCount: wAlerts,
    advisoryCount: aAlerts,
    infoCount: iAlerts,
    hasActiveCriticalAlert: cAlerts > 0,
    dataMode: alertMode,
  };

  // 10. Validation Summary
  const val = input.validationSummary;
  const valMode: SystemDataMode = val ? (val.dataMode as SystemDataMode) || inputDataMode : 'UNAVAILABLE';
  sectionModes.push(valMode);

  const validationSummary: ValidationStateSummary = {
    totalEvaluatedPredictions: val?.totalPredictions ?? 0,
    matchedObservationsCount: val?.matchedObservationsCount ?? 0,
    meanAbsoluteError: val?.meanAbsoluteError ?? null,
    rootMeanSquareError: val?.rootMeanSquareError ?? null,
    uncertaintyCoverageRatePct: val?.uncertaintyCoverageRatePct ?? null,
    overallStatus: val?.overallValidationStatus || 'UNAVAILABLE',
    dataMode: valMode,
  };

  // 11. Derive Decision Status
  let decisionStatus: SystemDecisionStatus = 'UNAVAILABLE';
  if (reass && reass.reassessmentStatus) {
    decisionStatus = reass.reassessmentStatus as SystemDecisionStatus;
  } else if (cAlerts > 0) {
    decisionStatus = 'RECOMMEND_REVIEW';
  } else if (r && r.id) {
    decisionStatus = 'STABLE';
  } else {
    decisionStatus = 'UNAVAILABLE';
  }

  // 12. Derive Decision Sensitivity
  let decisionSensitivity: SystemDecisionSensitivity = 'UNKNOWN';
  if (res && res.sensitivityClassification) {
    decisionSensitivity = res.sensitivityClassification as SystemDecisionSensitivity;
  } else {
    decisionSensitivity = 'UNKNOWN';
  }

  // Derive Overall Data Mode
  const overallDataMode = deriveOverallDataMode(sectionModes);

  const limitations = [
    'System decision state is a deterministic aggregation payload combining core engine outputs.',
    'Indices and scores are engineering decision-support heuristics, NOT calibrated probability distributions.',
    MANDATORY_DECISION_STATE_DISCLAIMER,
  ];

  return {
    decisionStateId,
    timestamp,
    voyageState,
    activeRoute,
    hazardSummary,
    uncertaintySummary,
    confidenceSummary,
    acquisitionSummary,
    reassessmentSummary,
    resilienceSummary,
    alertSummary,
    validationSummary,
    decisionStatus,
    decisionSensitivity,
    overallDataMode,
    provenance,
    limitations,
  };
}
