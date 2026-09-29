/**
 * CRYO NAV — Navigation Operational State Orchestration Engine
 * Phase 18A — End-to-End Operational Workflow Orchestration Layer
 *
 * Operational Principle:
 * Connects all core CRYO NAV intelligence engines into one authoritative system-level
 * operational snapshot without duplicating navigation mathematics or creating new heuristic scores.
 *
 * Orchestration Chain:
 * MISSION / VESSEL → POSITION → ENVIRONMENT → PREDICTION → HAZARDS → UNCERTAINTY →
 * ROUTE OPTIONS → ROUTE RESILIENCE → DECISION-IMPACT ACQUISITION → DECISION REASSESSMENT →
 * NAVIGATION ALERTS → MODEL VALIDATION → NAVIGATION DECISION STATE → AI ASSISTANT CONTEXT
 *
 * Scientific & Engineering Rules:
 * 1. ORCHESTRATION ONLY: Receives existing authoritative engine outputs. Does NOT recalculate
 *    CPA, uncertainty, route risk, resilience, VoI acquisition priorities, reassessment, alerts, or validation.
 * 2. PROVENANCE INTEGRITY: Preserves input dataMode ('REAL' | 'SIMULATED' | 'HYBRID' | 'UNAVAILABLE').
 *    Never silently upgrades SIMULATED to REAL or fabricates missing observations.
 * 3. NO AUTONOMOUS CONTROL: Does NOT issue vessel steering, speed control, waypoint alteration,
 *    route execution, auto-replanning, or hardware commands.
 * 4. NAVIGATOR AUTHORITY: Every snapshot carries the mandatory disclaimer that the navigator retains
 *    final operational authority for vessel control and route selection.
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

import { VoyageState } from './voyageStateEngine';
import { HazardEncounter, SeaIceExposureResult } from './hazardEncounterEngine';
import { UncertaintyEvaluationResult, UncertaintyZone } from './uncertaintyEngine';
import { AcquisitionRankingResult } from './decisionImpactAcquisitionEngine';
import { DecisionReassessmentResult } from './decisionReassessmentEngine';
import { RouteResilienceEvaluationResult } from './routeResilienceEngine';
import { NavigationAlertEvaluationResult, NavigationAlert } from './navigationAlertEngine';
import { ModelValidationSummary } from './modelValidationEngine';
import {
  buildNavigationDecisionState,
  NavigationDecisionState,
  SystemDecisionStatus,
  SystemDecisionSensitivity,
  SystemDataMode,
} from './navigationDecisionStateEngine';

export type OperationalDataMode = 'REAL' | 'SIMULATED' | 'HYBRID' | 'UNAVAILABLE';

export interface MissionOperationalSummary {
  missionId: string | null;
  title: string | null;
  status: string;
  dataMode: OperationalDataMode;
}

export interface VesselOperationalSummary {
  vesselId: string | null;
  vesselName: string | null;
  iceClass: string | null;
  dataMode: OperationalDataMode;
}

export interface PositionOperationalSummary {
  latitude: number | null;
  longitude: number | null;
  headingDeg: number | null;
  speedKnots: number | null;
  positionTimestamp: string | null;
  dataMode: OperationalDataMode;
}

export interface EnvironmentalOperationalSummary {
  seaIceState: string;
  oceanState: string;
  weatherState: string;
  icebergObservationState: string;
  dataMode: OperationalDataMode;
}

export interface PredictionOperationalSummary {
  predictionHorizonHours: number | null;
  modelStatus: string;
  predictionProvenance: string;
  dataMode: OperationalDataMode;
}

export interface RouteOperationalSummary {
  activeRouteId: string | null;
  activeRouteName: string | null;
  availableRoutesCount: number;
  selectedRouteStatus: string;
  distanceNm: number | null;
  etaHours: number | null;
  dataMode: OperationalDataMode;
}

export interface HazardOperationalSummary {
  totalHazardsCount: number;
  primaryHazardId: string | null;
  primaryHazardName: string | null;
  minimumCpaNm: number | null;
  earliestTcaHours: number | null;
  highestSeverity: string;
  dataMode: OperationalDataMode;
}

export interface UncertaintyOperationalSummary {
  uncertaintyRadiusNm: number | null;
  confidenceLevel: string;
  freshnessState: string;
  forecastHorizonHours: number | null;
  cautionLevel: string;
  dataMode: OperationalDataMode;
}

export interface ResilienceOperationalSummary {
  resilienceScore: number | null;
  sensitivityClassification: string;
  dominantScenarioName: string | null;
  dataMode: OperationalDataMode;
}

export interface DataAcquisitionOperationalSummary {
  highestPriorityProductId: string | null;
  engineeringPriorityIndex: number | null;
  isAvailable: boolean;
  dataMode: OperationalDataMode;
}

export interface ReassessmentOperationalSummary {
  currentStatus: string;
  primaryTrigger: string;
  requiresNavigatorReview: boolean;
  dataMode: OperationalDataMode;
}

export interface AlertOperationalSummary {
  totalAlertsCount: number;
  highestSeverity: string;
  hasActiveCritical: boolean;
  dataMode: OperationalDataMode;
}

export interface ValidationOperationalSummary {
  retrospectiveValidationStatus: string;
  evaluatedPredictionsCount: number;
  matchedObservationsCount: number;
  meanAbsoluteError: number | null;
  uncertaintyCoverageRatePct: number | null;
  dataMode: OperationalDataMode;
}

export interface DecisionStateOperationalSummary {
  decisionStatus: SystemDecisionStatus | string;
  decisionSensitivity: SystemDecisionSensitivity | string;
  dataMode: OperationalDataMode;
}

export interface NavigationOperationalStateInput {
  mission?: MissionConfig | null;
  vessel?: VesselProfile | null;
  voyageState?: VoyageState | null;
  activeRoute?: RouteAlternative | null;
  routes?: RouteAlternative[] | null;
  hazards?: (HazardEncounter | IcebergDetection)[] | null;
  seaIceExposure?: SeaIceExposureResult | null;
  uncertainty?: UncertaintyEvaluationResult | UncertaintyZone | null;
  confidence?: DecisionConfidenceResult | null;
  acquisitionPriorities?: AcquisitionRankingResult | null;
  reassessment?: DecisionReassessmentResult | null;
  resilience?: RouteResilienceEvaluationResult | null;
  alerts?: NavigationAlertEvaluationResult | NavigationAlert[] | null;
  validationSummary?: ModelValidationSummary | null;
  decisionState?: NavigationDecisionState | null;
  connectionState?: ConnectionState | null;
  freshnessState?: FreshnessState | null;
  forecastHorizonHours?: number | null;
  dataMode?: OperationalDataMode;
  provenance?: string;
  referenceTimeIso?: string;
}

export interface NavigationOperationalState {
  operationalStateId: string;
  generationTimestamp: string;
  mission: MissionOperationalSummary;
  vessel: VesselOperationalSummary;
  position: PositionOperationalSummary;
  environment: EnvironmentalOperationalSummary;
  prediction: PredictionOperationalSummary;
  route: RouteOperationalSummary;
  hazards: HazardOperationalSummary;
  uncertainty: UncertaintyOperationalSummary;
  resilience: ResilienceOperationalSummary;
  acquisition: DataAcquisitionOperationalSummary;
  reassessment: ReassessmentOperationalSummary;
  alerts: AlertOperationalSummary;
  validation: ValidationOperationalSummary;
  decisionState: DecisionStateOperationalSummary;
  overallDataMode: OperationalDataMode;
  sourceProvenance: string;
  navigatorAuthorityDisclaimer: string;
  limitations: string[];
}

export const MANDATORY_OPERATIONAL_STATE_DISCLAIMER =
  'CRYO NAV decision state is a system-level aggregation for decision support. The navigator retains final operational authority for vessel control and route selection.';

/**
 * Derives overall combined operational data mode from active input section modes.
 */
function deriveOperationalDataMode(modes: OperationalDataMode[]): OperationalDataMode {
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
 * Assembles an end-to-end operational state snapshot from existing core engine outputs.
 *
 * @param input NavigationOperationalStateInput
 * @returns NavigationOperationalState
 */
export function buildNavigationOperationalState(
  input: NavigationOperationalStateInput
): NavigationOperationalState {
  const generationTimestamp = input.referenceTimeIso || new Date().toISOString();
  const inputMode = input.dataMode || 'SIMULATED';
  const provenance = input.provenance || 'Phase 18A Navigation Operational State Orchestration Engine';

  const stateIdSuffix = generationTimestamp.replace(/[^0-9]/g, '').slice(0, 14);
  const operationalStateId = `OPERATIONAL_STATE_${stateIdSuffix || 'DEFAULT'}`;

  const sectionModes: OperationalDataMode[] = [];

  // 1. Mission Summary
  const m = input.mission;
  const missionMode: OperationalDataMode = m ? inputMode : 'UNAVAILABLE';
  sectionModes.push(missionMode);
  const mission: MissionOperationalSummary = {
    missionId: m?.id || null,
    title: m?.title || null,
    status: m ? 'ACTIVE' : 'UNAVAILABLE',
    dataMode: missionMode,
  };

  // 2. Vessel Summary
  const v = input.vessel || (input.voyageState ? { name: input.voyageState.vesselName, iceClass: input.voyageState.iceClass } : null);
  const vesselMode: OperationalDataMode = v ? inputMode : 'UNAVAILABLE';
  sectionModes.push(vesselMode);
  const vessel: VesselOperationalSummary = {
    vesselId: input.vessel?.id || input.voyageState?.vesselId || null,
    vesselName: input.vessel?.name || input.voyageState?.vesselName || null,
    iceClass: input.vessel?.iceClass || input.voyageState?.iceClass || null,
    dataMode: vesselMode,
  };

  // 3. Position Summary
  const vs = input.voyageState;
  const posMode: OperationalDataMode = vs ? (vs.dataMode as OperationalDataMode) || inputMode : 'UNAVAILABLE';
  sectionModes.push(posMode);
  const position: PositionOperationalSummary = {
    latitude: vs?.currentPosition?.lat ?? null,
    longitude: vs?.currentPosition?.lon ?? null,
    headingDeg: vs?.currentPosition?.headingDeg ?? null,
    speedKnots: vs?.currentPosition?.speedKnots ?? null,
    positionTimestamp: vs?.lastStateUpdate || generationTimestamp,
    dataMode: posMode,
  };

  // 4. Environmental Summary
  const hasEnvInput = Boolean(vs || m || (input.hazards && input.hazards.length > 0) || input.seaIceExposure || input.uncertainty);
  const envMode: OperationalDataMode = hasEnvInput ? (vs ? posMode : inputMode) : 'UNAVAILABLE';
  sectionModes.push(envMode);
  const environment: EnvironmentalOperationalSummary = {
    seaIceState: envMode === 'REAL' ? 'Copernicus Sea Ice NRT' : envMode === 'UNAVAILABLE' ? 'UNAVAILABLE' : 'Synthetic Sea Ice Model',
    oceanState: envMode === 'REAL' ? 'Copernicus NEMO 3D Model' : envMode === 'UNAVAILABLE' ? 'UNAVAILABLE' : 'Synthetic Ocean Current Model',
    weatherState: envMode === 'REAL' ? 'ECMWF IFS Forecast' : envMode === 'UNAVAILABLE' ? 'UNAVAILABLE' : 'Synthetic Weather Model',
    icebergObservationState: envMode === 'REAL' ? 'USNIC Iceberg Catalog' : envMode === 'UNAVAILABLE' ? 'UNAVAILABLE' : 'Synthetic Iceberg Model',
    dataMode: envMode,
  };

  // 5. Prediction Summary
  const predMode: OperationalDataMode = envMode;
  sectionModes.push(predMode);
  const prediction: PredictionOperationalSummary = {
    predictionHorizonHours: input.forecastHorizonHours ?? 24,
    modelStatus: 'ACTIVE_KINEMATIC_ADVECTION',
    predictionProvenance: envMode === 'REAL' ? 'Real Environmental Advection' : envMode === 'UNAVAILABLE' ? 'UNAVAILABLE' : 'Synthetic Model Advection',
    dataMode: predMode,
  };

  // 6. Route Summary
  const r = input.activeRoute;
  const routeMode: OperationalDataMode = r ? inputMode : 'UNAVAILABLE';
  sectionModes.push(routeMode);
  const route: RouteOperationalSummary = {
    activeRouteId: r?.id || null,
    activeRouteName: r?.name || null,
    availableRoutesCount: input.routes?.length || (r ? 1 : 0),
    selectedRouteStatus: r?.isRecommended ? 'RECOMMENDED_OPTIMAL' : r ? 'SELECTED_ALTERNATIVE' : 'UNAVAILABLE',
    distanceNm: r?.distanceNm ?? null,
    etaHours: r?.etaHours ?? null,
    dataMode: routeMode,
  };

  // 7. Hazard Summary
  const hazardsList = input.hazards || [];
  const hazardMode: OperationalDataMode = (input.hazards && input.hazards.length > 0) ? inputMode : 'UNAVAILABLE';
  sectionModes.push(hazardMode);

  let primaryId: string | null = null;
  let primaryName: string | null = null;
  let minCpa: number | null = null;
  let minTca: number | null = null;
  let highestSev = 'NONE';

  for (const h of hazardsList) {
    const isEncounter = 'severity' in h;
    const sev = isEncounter ? (h as HazardEncounter).severity : 'NONE';
    const cpa = isEncounter ? (h as HazardEncounter).cpaNm : null;
    const tca = isEncounter ? (h as HazardEncounter).tcaHours : null;
    const hId = isEncounter ? (h as HazardEncounter).hazardId : 'id' in h ? (h as IcebergDetection).id : null;
    const hName = isEncounter ? (h as HazardEncounter).sourceName : 'Iceberg';

    if (sev === 'CRITICAL') highestSev = 'CRITICAL';
    else if (sev === 'HIGH' && highestSev !== 'CRITICAL') highestSev = 'HIGH';
    else if (sev === 'MODERATE' && highestSev !== 'CRITICAL' && highestSev !== 'HIGH') highestSev = 'MODERATE';

    if (cpa != null && (minCpa === null || cpa < minCpa)) {
      minCpa = cpa;
      primaryId = hId;
      primaryName = hName;
    }
    if (tca != null && (minTca === null || tca < minTca)) {
      minTca = tca;
    }
  }

  const hazards: HazardOperationalSummary = {
    totalHazardsCount: hazardsList.length,
    primaryHazardId: primaryId,
    primaryHazardName: primaryName,
    minimumCpaNm: minCpa,
    earliestTcaHours: minTca,
    highestSeverity: highestSev,
    dataMode: hazardMode,
  };

  // 8. Uncertainty Summary
  const u = input.uncertainty;
  const uncertMode: OperationalDataMode = u ? inputMode : 'UNAVAILABLE';
  sectionModes.push(uncertMode);

  let uRadius: number | null = null;
  let uHorizon: number | null = null;
  let uCaution = 'STANDARD';

  if (u) {
    if ('expandedUncertaintyRadiusNm' in u) {
      const res = u as UncertaintyEvaluationResult;
      uRadius = res.expandedUncertaintyRadiusNm;
      uHorizon = res.forecastHorizonHours;
      uCaution = res.recommendedCautionLevel;
    } else if ('radiusNm' in u) {
      const zone = u as UncertaintyZone;
      uRadius = zone.radiusNm;
      uHorizon = zone.forecastHorizonHours;
      uCaution = zone.recommendedCautionLevel;
    }
  }

  const uncertainty: UncertaintyOperationalSummary = {
    uncertaintyRadiusNm: uRadius,
    confidenceLevel: input.confidence?.overallLevel || 'UNAVAILABLE',
    freshnessState: input.freshnessState || 'UNAVAILABLE',
    forecastHorizonHours: uHorizon,
    cautionLevel: uCaution,
    dataMode: uncertMode,
  };

  // 9. Resilience Summary
  const res = input.resilience;
  const resMode: OperationalDataMode = res ? inputMode : 'UNAVAILABLE';
  sectionModes.push(resMode);

  const resilience: ResilienceOperationalSummary = {
    resilienceScore: res?.resilienceScore ?? null,
    sensitivityClassification: res?.sensitivityClassification || 'UNKNOWN',
    dominantScenarioName: res?.dominantSensitivityScenarioName || null,
    dataMode: resMode,
  };

  // 10. Data Acquisition Summary
  const acq = input.acquisitionPriorities;
  const acqMode: OperationalDataMode = acq ? inputMode : 'UNAVAILABLE';
  sectionModes.push(acqMode);

  let topProd: string | null = null;
  let topPriorityIdx: number | null = null;

  if (acq && acq.rankedCandidates && acq.rankedCandidates.length > 0) {
    const top = acq.rankedCandidates[0];
    topProd = top.productId;
    topPriorityIdx = top.engineeringPriorityIndex;
  }

  const acquisition: DataAcquisitionOperationalSummary = {
    highestPriorityProductId: topProd,
    engineeringPriorityIndex: topPriorityIdx,
    isAvailable: acq != null && (acq.rankedCandidates?.length ?? 0) > 0,
    dataMode: acqMode,
  };

  // 11. Reassessment Summary
  const reass = input.reassessment;
  const reassMode: OperationalDataMode = reass ? (reass.dataMode as OperationalDataMode) || inputMode : 'UNAVAILABLE';
  sectionModes.push(reassMode);

  const reassessment: ReassessmentOperationalSummary = {
    currentStatus: reass?.reassessmentStatus || 'UNAVAILABLE',
    primaryTrigger: reass?.triggerReasons?.[0] || (reass ? 'Routine monitoring' : 'UNAVAILABLE'),
    requiresNavigatorReview: reass ? reass.reassessmentStatus === 'REASSESS' || reass.reassessmentStatus === 'RECOMMEND_REVIEW' : false,
    dataMode: reassMode,
  };

  // 12. Alert Summary
  const alertInput = input.alerts;
  const alertMode: OperationalDataMode = alertInput ? inputMode : 'UNAVAILABLE';
  sectionModes.push(alertMode);

  let alertList: NavigationAlert[] = [];
  if (alertInput) {
    if ('alerts' in alertInput) {
      alertList = (alertInput as NavigationAlertEvaluationResult).alerts;
    } else if (Array.isArray(alertInput)) {
      alertList = alertInput as NavigationAlert[];
    }
  }

  let topAlertSev = 'NONE';
  for (const al of alertList) {
    if (al.severity === 'CRITICAL') topAlertSev = 'CRITICAL';
    else if (al.severity === 'WARNING' && topAlertSev !== 'CRITICAL') topAlertSev = 'WARNING';
    else if (al.severity === 'ADVISORY' && topAlertSev !== 'CRITICAL' && topAlertSev !== 'WARNING') topAlertSev = 'ADVISORY';
  }

  const alerts: AlertOperationalSummary = {
    totalAlertsCount: alertList.length,
    highestSeverity: topAlertSev,
    hasActiveCritical: topAlertSev === 'CRITICAL',
    dataMode: alertMode,
  };

  // 13. Model Validation Summary
  const val = input.validationSummary;
  const valMode: OperationalDataMode = val ? (val.dataMode as OperationalDataMode) || inputMode : 'UNAVAILABLE';
  sectionModes.push(valMode);

  const validation: ValidationOperationalSummary = {
    retrospectiveValidationStatus: val?.overallValidationStatus || 'UNAVAILABLE',
    evaluatedPredictionsCount: val?.totalPredictions ?? 0,
    matchedObservationsCount: val?.matchedObservationsCount ?? 0,
    meanAbsoluteError: val?.meanAbsoluteError ?? null,
    uncertaintyCoverageRatePct: val?.uncertaintyCoverageRatePct ?? null,
    dataMode: valMode,
  };

  // 14. Derive Overall Data Mode from Primary Sections
  const overallDataMode = deriveOperationalDataMode(sectionModes);

  // 15. Decision State Summary
  const decState = input.decisionState || buildNavigationDecisionState({ ...input, dataMode: overallDataMode });
  const decMode: OperationalDataMode = (decState.overallDataMode as OperationalDataMode) || overallDataMode;

  const decisionState: DecisionStateOperationalSummary = {
    decisionStatus: decState.decisionStatus,
    decisionSensitivity: decState.decisionSensitivity,
    dataMode: decMode,
  };

  const limitations = [
    'Navigation operational state is a deterministic system-level orchestration snapshot.',
    'Indices and scores are engineering decision-support heuristics, NOT calibrated probability distributions.',
    MANDATORY_OPERATIONAL_STATE_DISCLAIMER,
  ];

  return {
    operationalStateId,
    generationTimestamp,
    mission,
    vessel,
    position,
    environment,
    prediction,
    route,
    hazards,
    uncertainty,
    resilience,
    acquisition,
    reassessment,
    alerts,
    validation,
    decisionState,
    overallDataMode,
    sourceProvenance: provenance,
    navigatorAuthorityDisclaimer: MANDATORY_OPERATIONAL_STATE_DISCLAIMER,
    limitations,
  };
}
