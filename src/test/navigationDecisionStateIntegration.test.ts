/**
 * CRYO NAV — Decision-State Logic & Data Consistency Audit Integration Tests
 * Phase 17C-A — System-Wide Integration Audit Test Suite
 *
 * Verifies data/logic propagation across the end-to-end CRYO NAV pipeline:
 * REAL / SIMULATED / HYBRID / UNAVAILABLE data modes
 * Provenance preservation
 * Freshness & temporal state propagation
 * Uncertainty envelope & confidence rules
 * Hazard / CPA integration (no duplicated math)
 * Route resilience classification (Engineering Resilience Index)
 * Decision-impact VoI acquisition priority (Engineering Priority Index)
 * Decision reassessment status
 * Navigation alerts aggregation
 * Retrospective model validation labeling
 * Mandatory navigator authority & zero autonomous action guardrails
 */

import {
  buildNavigationDecisionState,
  NavigationDecisionStateInput,
  MANDATORY_DECISION_STATE_DISCLAIMER,
} from '../services/navigationDecisionStateEngine';

import { RouteAlternative, DecisionConfidenceResult } from '../types';
import { VoyageState } from '../services/voyageStateEngine';
import { HazardEncounter } from '../services/hazardEncounterEngine';
import { UncertaintyEvaluationResult } from '../services/uncertaintyEngine';
import { AcquisitionRankingResult } from '../services/decisionImpactAcquisitionEngine';
import { DecisionReassessmentResult } from '../services/decisionReassessmentEngine';
import { RouteResilienceEvaluationResult } from '../services/routeResilienceEngine';
import { NavigationAlertEvaluationResult } from '../services/navigationAlertEngine';
import { ModelValidationSummary } from '../services/modelValidationEngine';

function runDecisionStateAuditTests() {
  console.log('========================================================================================');
  console.log('RUNNING PHASE 17C-A DECISION-STATE LOGIC & DATA CONSISTENCY AUDIT TESTS');
  console.log('========================================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  [PASS] Test ${totalTests}: ${testName}${detail ? ` (${detail})` : ''}`);
    } else {
      console.error(`  [FAIL] Test ${totalTests}: ${testName}${detail ? ` (${detail})` : ''}`);
      throw new Error(`Test failed: ${testName}`);
    }
  }

  const refTime = '2026-09-27T12:00:00.000Z';

  // Base mock fixtures
  const mockVoyageReal: VoyageState = {
    vesselId: 'v-1',
    vesselName: 'RV Polar Explorer',
    iceClass: 'Polar Class 3',
    currentPosition: { lat: -64.5, lon: -64.2, headingDeg: 180, speedKnots: 11.5 },
    currentRouteId: 'safest',
    currentRouteName: 'Recommended Safe Route',
    navigationStatus: 'UNDERWAY',
    currentWaypoint: null,
    nextWaypoint: null,
    distanceTravelledNm: 120.0,
    remainingDistanceNm: 200.0,
    progressPercent: 37.5,
    estimatedTimeRemainingHours: 17.4,
    estimatedArrivalTime: '2026-09-28T05:24:00Z',
    currentSpeedKnots: 11.5,
    connectivityState: 'ONLINE',
    environmentalDataFreshness: 'FRESH',
    confidenceLevel: 'HIGH',
    lastStateUpdate: refTime,
    dataMode: 'REAL',
    totalWaypointsCount: 4,
    completedWaypointsCount: 1,
  };

  const mockVoyageSim: VoyageState = {
    ...mockVoyageReal,
    dataMode: 'SIMULATED',
  };

  const mockRoute: RouteAlternative = {
    id: 'safest',
    name: 'Recommended Safe Route',
    type: 'SAFE',
    color: '#10b981',
    waypoints: [[-64.5, -64.2], [-67.57, -68.13]],
    distanceNm: 320.0,
    etaHours: 28.5,
    fuelTons: 18.2,
    riskIndex: 25.0,
    uncertaintyScore: 12.0,
    confidence: 'HIGH',
    hazardsCount: 1,
    hazardSummary: ['Iceberg proximity'],
    assumptions: ['Standard ice margin'],
    constraintsSatisfied: true,
    isRecommended: true,
    recommendationRationale: 'Lowest risk route corridor',
    resilienceScore: 88,
    costBreakdown: { distanceCost: 320, fuelCost: 18.2, timeCost: 28.5, riskCost: 25, uncertaintyCost: 12, totalCost: 403.7 },
  };

  const mockHazard: HazardEncounter = {
    hazardId: 'berg-1',
    sourceName: 'Iceberg A76A',
    hazardType: 'ICEBERG',
    severity: 'HIGH',
    cpaNm: 1.2,
    tcaHours: 4.5,
    location: { lat: -65.2, lon: -65.1 },
    distanceToRouteCorridorNm: 0.8,
    affectedWaypointIndex: 2,
    seaIceConcentrationPercent: 65,
    provenance: 'USNIC Iceberg Catalog',
    dataMode: 'REAL',
  } as any;

  const mockUncertainty: UncertaintyEvaluationResult = {
    hazardId: 'berg-1',
    hazardName: 'Iceberg A76A',
    hazardType: 'ICEBERG',
    location: { lat: -65.2, lon: -65.1 },
    baseUncertaintyRadiusNm: 0.8,
    expandedUncertaintyRadiusNm: 2.1,
    expansionFactor: 2.62,
    confidenceLevel: 'HIGH',
    freshnessState: 'FRESH',
    connectionState: 'ONLINE',
    forecastHorizonHours: 24,
    forecastHorizonLabel: '+24h',
    reasons: ['24h drift variance expansion'],
    explanation: 'Uncertainty envelope derived from forecast horizon',
    severity: 'HIGH',
    riskModifier: 1.5,
    recommendedCautionLevel: 'HIGH_CAUTION',
    dataMode: 'REAL',
    provenance: 'Uncertainty Engine v10A',
    uncertaintyZone: {
      center: { lat: -65.2, lon: -65.1 },
      radiusNm: 2.1,
      baseRadiusNm: 0.8,
      expansionFactor: 2.62,
      hazardType: 'ICEBERG',
      confidenceLevel: 'HIGH',
      freshnessState: 'FRESH',
      connectionState: 'ONLINE',
      forecastHorizonHours: 24,
      forecastHorizonLabel: '+24h',
      reasons: ['24h drift variance expansion'],
      explanation: 'Uncertainty envelope',
      severity: 'HIGH',
      riskModifier: 1.5,
      recommendedCautionLevel: 'HIGH_CAUTION',
      dataMode: 'REAL',
      provenance: 'Uncertainty Engine v10A',
    },
    timestamp: refTime,
  };

  const mockConfidence: DecisionConfidenceResult = {
    overallLevel: 'HIGH',
    confidenceScore: 88,
    primaryLimitingFactor: 'None',
    recommendedVerificationActions: ['Maintain watch'],
    isRecommendationBlocked: false,
    provenance: 'Confidence Engine v4',
    dataMode: 'REAL',
  } as any;

  const mockAcquisition: AcquisitionRankingResult = {
    rankedCandidates: [
      {
        productId: 'SAT-S1C-001',
        satelliteName: 'Sentinel-1C SAR',
        sensorType: 'C-band Synthetic Aperture Radar',
        acquisitionTimeIso: '2026-09-27T14:30:00Z',
        engineeringPriorityIndex: 87.5,
        priorityTier: 'CRITICAL',
        affectedDecision: 'Marguerite Bay Approach Route',
        uncertaintyAddressed: 'Iceberg trajectory variance',
        expectedUncertaintyReductionPct: 65,
        rationale: 'High spatial resolution SAR pass directly resolves iceberg drift uncertainty',
        cost: { dataSizeMb: 120, transferTimeMinutes: 8, bandwidthFit: 'FIT' },
        provenance: 'CDSE STAC Catalogue',
      } as any,
    ],
    topRecommendation: null,
    totalCandidateCount: 1,
    connectionState: 'ONLINE',
    availableBandwidthMb: 150,
    bandwidthConstraintApplied: false,
    evaluationTimestamp: refTime,
    dataMode: 'REAL',
    provenance: 'VoI Acquisition Engine v11A',
  } as any;

  const mockReassessment: DecisionReassessmentResult = {
    reassessmentStatus: 'MONITOR',
    triggerReasons: ['Uncertainty expansion threshold crossed'],
    changedVariables: ['uncertaintyRadiusNm'],
    explanation: 'Decision monitoring recommended due to drift uncertainty',
    hasKeyVariableChanged: true,
    previousSnapshot: {} as any,
    currentSnapshot: {} as any,
    dataMode: 'REAL',
    provenance: 'Reassessment Engine v12A',
    evaluationTimestamp: refTime,
  } as any;

  const mockResilience: RouteResilienceEvaluationResult = {
    routeId: 'safest',
    routeName: 'Recommended Safe Route',
    resilienceScore: 85,
    sensitivityClassification: 'ROBUST',
    dominantSensitivityScenarioName: 'Iceberg Drift Offset +20%',
    maxRiskDelta: 4.2,
    scenariosTestedCount: 5,
    feasibleScenariosCount: 5,
    unfeasibleScenariosCount: 0,
    totalScenarioCount: 5,
    scenarioResults: [],
    timestamp: refTime,
    dataMode: 'REAL',
    provenance: 'Route Resilience Engine v13A',
    scientificDisclaimer: 'Engineering decision support index',
  } as any;

  const mockAlerts: NavigationAlertEvaluationResult = {
    alerts: [
      {
        id: 'al-1',
        type: 'ICEBERG_ENCOUNTER',
        severity: 'WARNING',
        title: 'Iceberg Proximity Warning',
        message: 'Iceberg A76A CPA 1.2 nm',
        timestamp: refTime,
        source: 'HAZARD_ENGINE',
        acknowledged: false,
        dataMode: 'REAL',
        provenance: 'Alert Engine v14A',
      },
    ],
    totalAlertsCount: 1,
    criticalAlertsCount: 0,
    warningAlertsCount: 1,
    advisoryAlertsCount: 0,
    infoAlertsCount: 0,
    hasActiveCriticalAlerts: false,
    evaluationTimestamp: refTime,
    dataMode: 'REAL',
    provenance: 'Alert Engine v14A',
  };

  const mockValidation: ModelValidationSummary = {
    modelType: 'ICEBERG_TRAJECTORY',
    totalPredictions: 42,
    matchedObservationsCount: 38,
    unmatchedPredictionsCount: 4,
    insufficientDataCount: 0,
    meanAbsoluteError: 1.15,
    rootMeanSquareError: 1.48,
    bias: 0.2,
    uncertaintyCoverageRatePct: 92.5,
    statusDistribution: {
      VALIDATED_MATCH: 38,
      PARTIAL_MATCH: 0,
      MISMATCH: 4,
      UNMATCHED: 0,
      INSUFFICIENT_DATA: 0,
    },
    overallValidationStatus: 'VALIDATED_MATCH',
    results: [],
    dataMode: 'REAL',
    provenance: 'Validation Engine v15A',
    evaluationTimestamp: refTime,
    scientificDisclaimer: 'Retrospective model validation',
  };

  // --------------------------------------------------------------------------------------
  // AUDIT TEST 1: REAL Data Mode Propagation
  // --------------------------------------------------------------------------------------
  const stateReal = buildNavigationDecisionState({
    voyageState: mockVoyageReal,
    activeRoute: mockRoute,
    hazards: [mockHazard],
    uncertainty: mockUncertainty,
    confidence: mockConfidence,
    acquisitionPriorities: mockAcquisition,
    reassessment: mockReassessment,
    resilience: mockResilience,
    alerts: mockAlerts,
    validationSummary: mockValidation,
    dataMode: 'REAL',
    referenceTimeIso: refTime,
  });

  assert(stateReal.overallDataMode === 'REAL', 'Audit Test 1: REAL data mode propagates cleanly');

  // --------------------------------------------------------------------------------------
  // AUDIT TEST 2: SIMULATED Data Mode Propagation
  // --------------------------------------------------------------------------------------
  const stateSim = buildNavigationDecisionState({
    voyageState: mockVoyageSim,
    activeRoute: mockRoute,
    hazards: [{ ...mockHazard, dataMode: 'SIMULATED' }],
    uncertainty: { ...mockUncertainty, dataMode: 'SIMULATED' },
    confidence: { ...mockConfidence, dataMode: 'SIMULATED' },
    acquisitionPriorities: { ...mockAcquisition, dataMode: 'SIMULATED' },
    reassessment: { ...mockReassessment, dataMode: 'SIMULATED' },
    resilience: { ...mockResilience, dataMode: 'SIMULATED' },
    alerts: { ...mockAlerts, dataMode: 'SIMULATED' },
    validationSummary: { ...mockValidation, dataMode: 'SIMULATED' },
    dataMode: 'SIMULATED',
    referenceTimeIso: refTime,
  });

  assert(stateSim.overallDataMode === 'SIMULATED', 'Audit Test 2: SIMULATED data mode propagates without upgrading to REAL');

  // --------------------------------------------------------------------------------------
  // AUDIT TEST 3: HYBRID Data Mode Propagation
  // --------------------------------------------------------------------------------------
  const stateHybrid = buildNavigationDecisionState({
    voyageState: mockVoyageReal, // REAL
    activeRoute: mockRoute,
    hazards: [{ ...mockHazard, dataMode: 'SIMULATED' }], // SIMULATED
    dataMode: 'SIMULATED',
    referenceTimeIso: refTime,
  });

  assert(stateHybrid.overallDataMode === 'HYBRID', 'Audit Test 3: Mixed REAL and SIMULATED sources yield HYBRID data mode');

  // --------------------------------------------------------------------------------------
  // AUDIT TEST 4: UNAVAILABLE Data Mode Propagation
  // --------------------------------------------------------------------------------------
  const stateUnavailable = buildNavigationDecisionState({});

  assert(stateUnavailable.overallDataMode === 'UNAVAILABLE', 'Audit Test 4: Empty inputs yield UNAVAILABLE data mode');
  assert(stateUnavailable.decisionStatus === 'UNAVAILABLE', 'Audit Test 4b: Decision status is UNAVAILABLE when inputs missing');

  // --------------------------------------------------------------------------------------
  // AUDIT TEST 5: Confidence Propagation
  // --------------------------------------------------------------------------------------
  assert(stateReal.confidenceSummary.overallLevel === 'HIGH', 'Audit Test 5: Confidence overall level propagates');
  assert(stateReal.confidenceSummary.confidenceScore === 88, 'Audit Test 5b: Confidence score propagates');

  // --------------------------------------------------------------------------------------
  // AUDIT TEST 6: Freshness & Temporal Propagation
  // --------------------------------------------------------------------------------------
  const stateFresh = buildNavigationDecisionState({
    freshnessState: 'FRESH',
    referenceTimeIso: refTime,
  });

  assert(stateFresh.timestamp === refTime, 'Audit Test 6: Timestamp reference preserved');
  assert(stateFresh.uncertaintySummary.freshnessState === 'FRESH', 'Audit Test 6b: Freshness state propagates');

  // --------------------------------------------------------------------------------------
  // AUDIT TEST 7: Uncertainty Envelope Propagation
  // --------------------------------------------------------------------------------------
  assert(stateReal.uncertaintySummary.largestUncertaintyRadiusNm === 2.1, 'Audit Test 7: Expanded uncertainty radius propagates');
  assert(stateReal.uncertaintySummary.expansionFactor === 2.62, 'Audit Test 7b: Expansion factor propagates');

  // --------------------------------------------------------------------------------------
  // AUDIT TEST 8: Hazard & CPA Propagation (No Duplicated Math)
  // --------------------------------------------------------------------------------------
  assert(stateReal.hazardSummary.minimumCpaNm === 1.2, 'Audit Test 8: CPA nm consumed directly from hazard engine');
  assert(stateReal.hazardSummary.earliestTcaHours === 4.5, 'Audit Test 8b: TCA hours consumed directly from hazard engine');
  assert(stateReal.hazardSummary.primaryHazardId === 'berg-1', 'Audit Test 8c: Primary hazard ID derived cleanly');

  // --------------------------------------------------------------------------------------
  // AUDIT TEST 9: Acquisition Priority (Engineering Priority Index)
  // --------------------------------------------------------------------------------------
  assert(stateReal.acquisitionSummary.highestPriorityProduct === 'SAT-S1C-001', 'Audit Test 9: Highest priority product propagates');
  assert(stateReal.acquisitionSummary.priorityIndex === 87.5, 'Audit Test 9b: Engineering Priority Index score propagates');

  // --------------------------------------------------------------------------------------
  // AUDIT TEST 10: Reassessment Status Propagation
  // --------------------------------------------------------------------------------------
  assert(stateReal.reassessmentSummary.status === 'MONITOR', 'Audit Test 10: Reassessment status MONITOR propagates');
  assert(stateReal.decisionStatus === 'MONITOR', 'Audit Test 10b: System decision status derived from reassessment status');

  // --------------------------------------------------------------------------------------
  // AUDIT TEST 11: Route Resilience Propagation
  // --------------------------------------------------------------------------------------
  assert(stateReal.resilienceSummary.resilienceScore === 85, 'Audit Test 11: Resilience score propagates');
  assert(stateReal.resilienceSummary.sensitivity === 'ROBUST', 'Audit Test 11b: Sensitivity classification propagates');
  assert(stateReal.decisionSensitivity === 'ROBUST', 'Audit Test 11c: System decision sensitivity derived from resilience');

  // --------------------------------------------------------------------------------------
  // AUDIT TEST 12: Alert Summary Propagation
  // --------------------------------------------------------------------------------------
  assert(stateReal.alertSummary.totalAlerts === 1, 'Audit Test 12: Total alerts count propagates');
  assert(stateReal.alertSummary.warningCount === 1, 'Audit Test 12b: Warning alerts count propagates');

  // --------------------------------------------------------------------------------------
  // AUDIT TEST 13: Retrospective Model Validation Labeling
  // --------------------------------------------------------------------------------------
  assert(stateReal.validationSummary.totalEvaluatedPredictions === 42, 'Audit Test 13: Evaluated predictions count propagates');
  assert(stateReal.validationSummary.overallStatus === 'VALIDATED_MATCH', 'Audit Test 13b: Overall validation status propagates');

  // --------------------------------------------------------------------------------------
  // AUDIT TEST 14: Navigator Authority Guardrails
  // --------------------------------------------------------------------------------------
  assert(stateReal.limitations.includes(MANDATORY_DECISION_STATE_DISCLAIMER), 'Audit Test 14: Mandatory navigator disclaimer present');

  // --------------------------------------------------------------------------------------
  // AUDIT TEST 15: Zero Autonomous Action Guardrails
  // --------------------------------------------------------------------------------------
  const initialRouteWaypoints = mockRoute.waypoints;
  const initialRiskIndex = mockRoute.riskIndex;

  // Build state
  buildNavigationDecisionState({
    voyageState: mockVoyageReal,
    activeRoute: mockRoute,
    hazards: [mockHazard],
    reassessment: { ...mockReassessment, reassessmentStatus: 'REASSESS' },
  });

  assert(mockRoute.waypoints === initialRouteWaypoints, 'Audit Test 15: Route waypoints strictly unmutated');
  assert(mockRoute.riskIndex === initialRiskIndex, 'Audit Test 15b: Active route risk index strictly unmutated');
  assert(mockVoyageReal.currentSpeedKnots === 11.5, 'Audit Test 15c: Vessel speed strictly unmutated');

  console.log('\n========================================================================================');
  console.log(`DECISION STATE AUDIT TEST SUMMARY: ${passedTests} / ${totalTests} PASSED`);
  console.log('========================================================================================\n');
}

runDecisionStateAuditTests();
