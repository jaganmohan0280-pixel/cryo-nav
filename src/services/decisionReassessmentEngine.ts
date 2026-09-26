/**
 * CRYO NAV — Continuous Decision Reassessment Core Engine
 * Phase 12A — Decision Stability & Reassessment Analysis Architecture
 *
 * Core Responsibility:
 * Continuously evaluates whether incoming environmental changes, uncertainty expansions,
 * confidence drops, freshness degradations, or hazard trajectory updates materially
 * affect the current navigation decision.
 *
 * Reassessment Statuses:
 * - STABLE: Decision is robust; no material change in decision-relevant parameters.
 * - MONITOR: Environmental/uncertainty parameters changed moderately; monitor ongoing updates.
 * - REASSESS: Material change detected (CPA drop, uncertainty expansion, confidence drop, new relevant observation); decision reassessment warranted.
 * - RECOMMEND_REVIEW: High sensitivity or offline stale hazard condition; formal navigator review recommended.
 *
 * Scientific & Engineering Rules:
 * 1. DECISION RELEVANCE: Distinguishes raw data changes from decision-relevant changes.
 *    Small changes far from the active route corridor remain STABLE.
 * 2. DETERMINISTIC THRESHOLDS: Uses transparent, configurable, deterministic thresholds. NO Math.random().
 * 3. NO ROUTING MUTATION: Does NOT call routingEngine, change waypoints, select alternative routes, or modify active routes.
 * 4. NO DATA DOWNLINK: Does NOT rank satellite products, command acquisition, or call download APIs.
 * 5. PROVENANCE INTEGRITY: Preserves input dataMode ('REAL' | 'SIMULATED' | 'HYBRID' | 'UNAVAILABLE').
 * 6. OFFLINE BEHAVIOR: OFFLINE status alone does NOT force REASSESS. OFFLINE + stale data + sensitive hazard -> RECOMMEND_REVIEW.
 */

import {
  ConfidenceLevel,
  FreshnessState,
  ConnectionState,
  RouteAlternative,
} from '../types';
import { HazardEncounter, HazardSeverity } from './hazardEncounterEngine';
import { UncertaintyZone, UncertaintyEvaluationResult } from './uncertaintyEngine';

export type ReassessmentStatus = 'STABLE' | 'MONITOR' | 'REASSESS' | 'RECOMMEND_REVIEW';

export type ReassessmentDataMode = 'REAL' | 'SIMULATED' | 'HYBRID' | 'UNAVAILABLE';

export interface DecisionStateSnapshot {
  timestamp?: string;
  selectedRouteId?: string | null;
  selectedRouteName?: string | null;
  confidenceLevel?: ConfidenceLevel | string | null;
  freshnessState?: FreshnessState | string | null;
  connectionState?: ConnectionState | string | null;
  routeSensitivity?: string | null; // 'ROBUST' | 'SENSITIVE' | 'HIGHLY_SENSITIVE'
  uncertaintyRadiusNm?: number | null;
  primaryHazardId?: string | null;
  primaryHazardSeverity?: HazardSeverity | string | null;
  primaryHazardCpaNm?: number | null;
  primaryHazardTcaHours?: number | null;
  hazards?: HazardEncounter[];
  uncertaintyZones?: (UncertaintyZone | UncertaintyEvaluationResult)[];
  hasNewObservation?: boolean;
  isObservationNearRoute?: boolean;
  dataMode?: ReassessmentDataMode | string;
  provenance?: string;
}

export interface ReassessmentThresholds {
  uncertaintyExpansionThresholdPct?: number; // default: 25.0 (%)
  uncertaintyExpansionMinNm?: number; // default: 1.0 (nm)
  cpaMaterialDropNm?: number; // default: 2.0 (nm)
  criticalCpaThresholdNm?: number; // default: 3.0 (nm)
}

export interface ReassessmentEvaluationInput {
  previousState: DecisionStateSnapshot;
  currentState: DecisionStateSnapshot;
  activeRoute?: RouteAlternative | null;
  thresholds?: ReassessmentThresholds;
  referenceTimestampIso?: string;
}

export interface UncertaintyChangeSummary {
  previousRadiusNm: number | null;
  currentRadiusNm: number | null;
  deltaNm: number | null;
  expansionPct: number | null;
  hasExpandedMaterially: boolean;
}

export interface HazardImpactSummary {
  previousSeverity: string | null;
  currentSeverity: string | null;
  hasSeverityIncreased: boolean;
  previousCpaNm: number | null;
  currentCpaNm: number | null;
  cpaDeltaNm: number | null;
  hasCpaDroppedMaterially: boolean;
  affectedHazardId: string | null;
}

export interface DecisionReassessmentResult {
  reassessmentStatus: ReassessmentStatus;
  triggerReasons: string[];
  explanation: string;
  changedVariables: string[];
  previousValues: Record<string, any>;
  currentValues: Record<string, any>;
  decisionSensitivity: string;
  uncertaintyChange: UncertaintyChangeSummary;
  hazardImpact: HazardImpactSummary;
  timestamp: string;
  provenance: string;
  dataMode: ReassessmentDataMode;
}

// Configurable Default Engineering Thresholds
const DEFAULT_THRESHOLDS: Required<ReassessmentThresholds> = {
  uncertaintyExpansionThresholdPct: 25.0,
  uncertaintyExpansionMinNm: 1.0,
  cpaMaterialDropNm: 2.0,
  criticalCpaThresholdNm: 3.0,
};

// Numeric rank for Confidence Levels
function getConfidenceRank(level?: string | null): number {
  if (!level) return 0;
  switch (level.toUpperCase()) {
    case 'HIGH':
      return 4;
    case 'MEDIUM':
      return 3;
    case 'LOW':
      return 2;
    case 'CRITICAL':
      return 1;
    default:
      return 0;
  }
}

// Numeric rank for Freshness States
function getFreshnessRank(state?: string | null): number {
  if (!state) return 0;
  switch (state.toUpperCase()) {
    case 'FRESH':
      return 4;
    case 'AGING':
      return 3;
    case 'STALE':
      return 2;
    case 'UNAVAILABLE':
      return 1;
    default:
      return 0;
  }
}

// Numeric rank for Hazard Severities
function getSeverityRank(sev?: string | null): number {
  if (!sev) return 0;
  switch (sev.toUpperCase()) {
    case 'CRITICAL':
      return 4;
    case 'HIGH':
      return 3;
    case 'MODERATE':
      return 2;
    case 'LOW':
      return 1;
    case 'NONE':
      return 0;
    default:
      return 0;
  }
}

/**
 * Evaluates whether continuous environmental, uncertainty, or hazard changes
 * warrant navigation decision reassessment.
 */
export function evaluateDecisionReassessment(
  input: ReassessmentEvaluationInput
): DecisionReassessmentResult {
  const {
    previousState,
    currentState,
    activeRoute = null,
    thresholds = {},
    referenceTimestampIso,
  } = input;

  const config = { ...DEFAULT_THRESHOLDS, ...thresholds };

  const triggerReasons: string[] = [];
  const changedVariables: string[] = [];
  const previousValues: Record<string, any> = {};
  const currentValues: Record<string, any> = {};

  // 1. CONFIDENCE LEVEL CHANGE
  const prevConf = previousState.confidenceLevel || 'HIGH';
  const currConf = currentState.confidenceLevel || 'HIGH';
  const prevConfRank = getConfidenceRank(prevConf);
  const currConfRank = getConfidenceRank(currConf);

  let hasConfidenceDropped = false;
  let hasConfidenceDroppedMaterially = false;
  if (currConfRank < prevConfRank) {
    hasConfidenceDropped = true;
    changedVariables.push('confidenceLevel');
    previousValues.confidenceLevel = prevConf;
    currentValues.confidenceLevel = currConf;
    if (prevConfRank - currConfRank >= 2 || currConf === 'CRITICAL' || currConf === 'LOW') {
      hasConfidenceDroppedMaterially = true;
      triggerReasons.push(`Confidence level dropped from ${prevConf} to ${currConf}.`);
    } else {
      triggerReasons.push(`Confidence level shifted slightly from ${prevConf} to ${currConf}.`);
    }
  }

  // 2. DATA FRESHNESS CHANGE
  const prevFresh = previousState.freshnessState || 'FRESH';
  const currFresh = currentState.freshnessState || 'FRESH';
  const prevFreshRank = getFreshnessRank(prevFresh);
  const currFreshRank = getFreshnessRank(currFresh);

  let hasFreshnessDegraded = false;
  let isDataStale = false;
  if (currFreshRank < prevFreshRank) {
    hasFreshnessDegraded = true;
    changedVariables.push('freshnessState');
    previousValues.freshnessState = prevFresh;
    currentValues.freshnessState = currFresh;
    if (currFresh === 'STALE' || currFresh === 'UNAVAILABLE') {
      isDataStale = true;
      triggerReasons.push(`Environmental data freshness degraded from ${prevFresh} to ${currFresh}.`);
    } else {
      triggerReasons.push(`Data freshness shifted from ${prevFresh} to ${currFresh}.`);
    }
  }

  // 3. UNCERTAINTY RADIUS EXPANSION
  const prevRadius = previousState.uncertaintyRadiusNm ?? null;
  const currRadius = currentState.uncertaintyRadiusNm ?? null;
  let uncertaintyDeltaNm: number | null = null;
  let uncertaintyExpansionPct: number | null = null;
  let hasExpandedMaterially = false;

  if (prevRadius !== null && currRadius !== null) {
    uncertaintyDeltaNm = Math.round((currRadius - prevRadius) * 10) / 10;
    if (prevRadius > 0) {
      uncertaintyExpansionPct = Math.round(((currRadius - prevRadius) / prevRadius) * 100 * 10) / 10;
    }
    if (
      uncertaintyDeltaNm >= config.uncertaintyExpansionMinNm &&
      (uncertaintyExpansionPct !== null && uncertaintyExpansionPct >= config.uncertaintyExpansionThresholdPct)
    ) {
      hasExpandedMaterially = true;
      changedVariables.push('uncertaintyRadiusNm');
      previousValues.uncertaintyRadiusNm = prevRadius;
      currentValues.uncertaintyRadiusNm = currRadius;
      triggerReasons.push(
        `Uncertainty envelope radius expanded from ${prevRadius.toFixed(1)} nm to ${currRadius.toFixed(1)} nm (+${uncertaintyExpansionPct.toFixed(1)}%).`
      );
    }
  }

  // 4. HAZARD IMPACT (SEVERITY & CPA CHANGE)
  const prevSev = previousState.primaryHazardSeverity || 'NONE';
  const currSev = currentState.primaryHazardSeverity || 'NONE';
  const prevSevRank = getSeverityRank(prevSev);
  const currSevRank = getSeverityRank(currSev);
  let hasSeverityIncreased = false;

  if (currSevRank > prevSevRank) {
    hasSeverityIncreased = true;
    changedVariables.push('primaryHazardSeverity');
    previousValues.primaryHazardSeverity = prevSev;
    currentValues.primaryHazardSeverity = currSev;
    triggerReasons.push(`Hazard severity increased from ${prevSev} to ${currSev}.`);
  }

  const prevCpa = previousState.primaryHazardCpaNm ?? null;
  const currCpa = currentState.primaryHazardCpaNm ?? null;
  let cpaDeltaNm: number | null = null;
  let hasCpaDroppedMaterially = false;

  if (prevCpa !== null && currCpa !== null) {
    cpaDeltaNm = Math.round((currCpa - prevCpa) * 10) / 10;
    if (prevCpa - currCpa >= config.cpaMaterialDropNm || currCpa <= config.criticalCpaThresholdNm) {
      hasCpaDroppedMaterially = true;
      changedVariables.push('primaryHazardCpaNm');
      previousValues.primaryHazardCpaNm = prevCpa;
      currentValues.primaryHazardCpaNm = currCpa;
      triggerReasons.push(
        `Closest Point of Approach (CPA) decreased from ${prevCpa.toFixed(1)} nm to ${currCpa.toFixed(1)} nm.`
      );
    }
  }

  // 5. ROUTE SENSITIVITY CHANGE
  const prevSens = previousState.routeSensitivity || 'ROBUST';
  const currSens = currentState.routeSensitivity || 'ROBUST';
  let hasSensitivityIncreased = false;

  if (currSens !== prevSens) {
    changedVariables.push('routeSensitivity');
    previousValues.routeSensitivity = prevSens;
    currentValues.routeSensitivity = currSens;
    if (currSens === 'HIGHLY_SENSITIVE' || (prevSens === 'ROBUST' && currSens === 'SENSITIVE')) {
      hasSensitivityIncreased = true;
      triggerReasons.push(`Route decision sensitivity escalated from ${prevSens} to ${currSens}.`);
    }
  }

  // 6. NEW OBSERVATION EVALUATION
  const hasNewObservation = currentState.hasNewObservation === true;
  const isObservationNearRoute = currentState.isObservationNearRoute === true;

  if (hasNewObservation) {
    changedVariables.push('hasNewObservation');
    if (isObservationNearRoute) {
      triggerReasons.push('New verified observation arrived covering the active route corridor.');
    } else {
      triggerReasons.push('New observation arrived outside the active route corridor.');
    }
  }

  // 7. CONNECTIVITY STATE EVALUATION
  const connState = currentState.connectionState || 'ONLINE';
  const isOffline = connState === 'OFFLINE';

  // REASSESSMENT STATUS CLASSIFICATION LOGIC
  let reassessmentStatus: ReassessmentStatus = 'STABLE';

  // Rule 1: RECOMMEND_REVIEW
  if (
    currSens === 'HIGHLY_SENSITIVE' &&
    (currSev === 'HIGH' || currSev === 'CRITICAL' || hasSeverityIncreased)
  ) {
    reassessmentStatus = 'RECOMMEND_REVIEW';
  } else if (isOffline && (isDataStale || currConf === 'LOW' || currConf === 'CRITICAL') && (currSev !== 'NONE')) {
    reassessmentStatus = 'RECOMMEND_REVIEW';
  } else if (currSev === 'CRITICAL' || (currCpa !== null && currCpa <= config.criticalCpaThresholdNm)) {
    reassessmentStatus = 'RECOMMEND_REVIEW';
  }
  // Rule 2: REASSESS
  else if (
    hasSeverityIncreased ||
    hasCpaDroppedMaterially ||
    hasExpandedMaterially ||
    hasConfidenceDroppedMaterially ||
    (hasNewObservation && isObservationNearRoute)
  ) {
    reassessmentStatus = 'REASSESS';
  }
  // Rule 3: MONITOR
  else if (
    hasFreshnessDegraded ||
    hasConfidenceDropped ||
    (hasNewObservation && !isObservationNearRoute) ||
    hasSensitivityIncreased
  ) {
    reassessmentStatus = 'MONITOR';
  }
  // Rule 4: STABLE
  else {
    reassessmentStatus = 'STABLE';
  }

  // STRUCTURED NATURAL LANGUAGE EXPLANATION GENERATION
  let explanation = '';
  const routeName = activeRoute ? activeRoute.name : currentState.selectedRouteName || 'Active Corridor';

  if (reassessmentStatus === 'STABLE') {
    if (triggerReasons.length > 0) {
      explanation = `Decision state remains STABLE for ${routeName}. Minor environmental changes detected, but none intersect the route corridor or exceed decision thresholds.`;
    } else {
      explanation = `Decision state is STABLE for ${routeName}. No material changes in hazards, confidence, or uncertainty envelope.`;
    }
  } else if (reassessmentStatus === 'MONITOR') {
    explanation = `Decision state set to MONITOR for ${routeName}. ${triggerReasons.join(' ')}`;
  } else if (reassessmentStatus === 'REASSESS') {
    explanation = `Decision state warrants REASSESSMENT for ${routeName}. ${triggerReasons.join(' ')}`;
  } else if (reassessmentStatus === 'RECOMMEND_REVIEW') {
    explanation = `RECOMMEND REVIEW for ${routeName}. ${triggerReasons.join(' ')} Formal navigator review is recommended.`;
  }

  // PROVENANCE & DATA MODE INTEGRITY
  const dataMode: ReassessmentDataMode =
    (currentState.dataMode as ReassessmentDataMode) ||
    (previousState.dataMode as ReassessmentDataMode) ||
    'REAL';

  const provenance = currentState.provenance || previousState.provenance || 'REAL';

  const timestamp = referenceTimestampIso || new Date().toISOString();

  const uncertaintyChange: UncertaintyChangeSummary = {
    previousRadiusNm: prevRadius,
    currentRadiusNm: currRadius,
    deltaNm: uncertaintyDeltaNm,
    expansionPct: uncertaintyExpansionPct,
    hasExpandedMaterially,
  };

  const hazardImpact: HazardImpactSummary = {
    previousSeverity: prevSev,
    currentSeverity: currSev,
    hasSeverityIncreased,
    previousCpaNm: prevCpa,
    currentCpaNm: currCpa,
    cpaDeltaNm,
    hasCpaDroppedMaterially,
    affectedHazardId: currentState.primaryHazardId || previousState.primaryHazardId || null,
  };

  return {
    reassessmentStatus,
    triggerReasons,
    explanation,
    changedVariables,
    previousValues,
    currentValues,
    decisionSensitivity: currSens,
    uncertaintyChange,
    hazardImpact,
    timestamp,
    provenance,
    dataMode,
  };
}
