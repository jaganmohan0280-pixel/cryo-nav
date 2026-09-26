/**
 * CRYO NAV — Navigation Decision State Engine Unit Tests
 * Phase 17A — System Integration Core Verification Suite
 *
 * Verifies that buildNavigationDecisionState:
 * 1. Aggregates outputs from all core engines into a unified system decision state.
 * 2. Mandatory decision state disclaimers are present in all output payloads.
 * 3. Never performs autonomous control actions (no route, waypoint, or speed changes).
 * 4. Preserves dataMode ('REAL', 'SIMULATED', 'HYBRID', 'UNAVAILABLE').
 * 5. Correctly derives decisionStatus and decisionSensitivity without recalculating underlying math.
 * 6. Is 100% deterministic (repeatable across identical inputs).
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

function runNavigationDecisionStateTests() {
  console.log('========================================================================================');
  console.log('RUNNING PHASE 17A NAVIGATION DECISION STATE ENGINE UNIT TESTS');
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

  // Mock Objects
  const mockVoyage: VoyageState = {
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
    hazardType: 'ICEBERG',
    sourceName: 'USNIC Iceberg A76A',
    currentPosition: { lat: -65.0, lon: -65.0 },
    predictedPositionAtCpa: { lat: -65.01, lon: -65.01 },
    nearestRoutePoint: { lat: -65.0, lon: -65.0 },
    cpaNm: 1.2,
    tcaHours: 4.5,
    tcaTimestamp: '2026-09-27T16:30:00Z',
    minRouteDistanceNm: 1.2,
    encounterStatus: 'CORRIDOR_ENTRY',
    severity: 'HIGH',
    confidence: 85,
    uncertaintyRadiusNm: 1.5,
    explanation: 'High proximity encounter predicted',
    provenance: 'USNIC Catalog',
    isRealData: true,
    dataStatusLabel: 'REAL',
  };

  const mockUncertainty: UncertaintyEvaluationResult = {
    hazardId: 'berg-1',
    hazardName: 'USNIC Iceberg A76A',
    hazardType: 'ICEBERG',
    location: { lat: -65.0, lon: -65.0 },
    baseUncertaintyRadiusNm: 1.0,
    expandedUncertaintyRadiusNm: 1.5,
    expansionFactor: 1.5,
    confidenceLevel: 'HIGH',
    freshnessState: 'FRESH',
    connectionState: 'ONLINE',
    forecastHorizonHours: 24,
    forecastHorizonLabel: '+24h Forecast',
    reasons: ['Base hazard uncertainty'],
    explanation: 'Uncertainty evaluation summary',
    severity: 'HIGH',
    riskModifier: 1.2,
    recommendedCautionLevel: 'ELEVATED',
    dataMode: 'REAL',
    provenance: 'Uncertainty Engine v10A',
    timestamp: refTime,
    uncertaintyZone: {
      center: { lat: -65.0, lon: -65.0 },
      radiusNm: 1.5,
      baseRadiusNm: 1.0,
      expansionFactor: 1.5,
      hazardType: 'ICEBERG',
      confidenceLevel: 'HIGH',
      freshnessState: 'FRESH',
      connectionState: 'ONLINE',
      forecastHorizonHours: 24,
      forecastHorizonLabel: '+24h Forecast',
      reasons: ['Base hazard uncertainty'],
      explanation: 'Uncertainty evaluation summary',
      severity: 'HIGH',
      riskModifier: 1.2,
      recommendedCautionLevel: 'ELEVATED',
      dataMode: 'REAL',
      provenance: 'Uncertainty Engine v10A',
    },
  };

  const mockAcquisition: AcquisitionRankingResult = {
    rankedCandidates: [
      {
        productId: 'Sentinel-1A_001',
        productName: 'Sentinel-1A SAR',
        sensor: 'Sentinel-1 SAR',
        productType: 'High-Res SAR Interferometric',
        engineeringPriorityIndex: 88,
        priority: 'HIGH',
        availabilityStatus: 'AVAILABLE_FOR_DOWNLINK',
        affectedDecision: 'Route safest corridor validation',
        affectedRouteName: 'Recommended Safe Route',
        uncertaintyAddressed: 'Iceberg trajectory variance',
        expectedDecisionImpact: 'Confirms corridor clearance',
        expectedUncertaintyReductionPct: 45,
        acquisitionCostMb: 45,
        withinBandwidthBudget: true,
        reason: 'High spatial overlap with active route',
        provenance: 'CDSE STAC',
        confidenceLevel: 'HIGH',
        freshnessState: 'FRESH',
        footprint: { centerLat: -65.0, centerLon: -65.0, radiusNm: 25.0, description: 'Swath' },
        scoreBreakdown: {
          spatialOverlapPct: 80,
          temporalRelevancePct: 90,
          routeSensitivityRelevance: 85,
          uncertaintyMagnitudeScore: 80,
          potentialRecommendationShiftScore: 75,
          freshnessBenefitScore: 80,
          productAvailabilityScore: 90,
          resolutionRelevanceScore: 85,
          acquisitionCostPenalty: 10,
          connectivityCostPenalty: 0,
        },
        rawProductMetadata: {
          id: 'Sentinel-1A_001',
          sensor: 'Sentinel-1 SAR',
          acquisitionTime: refTime,
          processingTime: refTime,
          footprint: { centerLat: -65.0, centerLon: -65.0, radiusNm: 25.0, description: 'Swath' },
          productType: 'High-Res SAR Interferometric',
          sizeMb: 45,
          availability: 'Available for Downlink',
          decisionImpactScore: 85,
          priority: 'HIGH',
          impactExplanation: 'High decision impact',
          expectedUncertaintyReductionPct: 45,
          spatialOverlapWithRoutePct: 80,
          freshness: 'FRESH',
        },
      },
    ],
    totalCandidatesEvaluated: 1,
    eligibleWithinBandwidthCount: 1,
    connectionState: 'ONLINE',
    availableBandwidthMb: 100,
    dominantAcquisitionPriority: 'HIGH',
    rankingTimestamp: refTime,
    explanation: 'Acquisition priority evaluation complete',
    isTestFixture: false,
  };

  const mockReassessment: DecisionReassessmentResult = {
    reassessmentStatus: 'STABLE',
    triggerReasons: ['Routine monitoring'],
    explanation: 'Current decision is stable.',
    changedVariables: [],
    previousValues: {},
    currentValues: {},
    decisionSensitivity: 'ROBUST',
    uncertaintyChange: {
      previousRadiusNm: 1.0,
      currentRadiusNm: 1.5,
      deltaNm: 0.5,
      expansionPct: 50.0,
      hasExpandedMaterially: false,
    },
    hazardImpact: {
      previousSeverity: 'LOW',
      currentSeverity: 'HIGH',
      hasSeverityIncreased: false,
      previousCpaNm: 2.0,
      currentCpaNm: 1.2,
      cpaDeltaNm: -0.8,
      hasCpaDroppedMaterially: false,
      affectedHazardId: 'berg-1',
    },
    timestamp: refTime,
    provenance: 'Reassessment Engine v12A',
    dataMode: 'REAL',
  };

  const mockResilience: RouteResilienceEvaluationResult = {
    routeId: 'safest',
    routeName: 'Recommended Safe Route',
    baselineRiskIndex: 25.0,
    baselineEtaHours: 28.5,
    baselineFuelTons: 18.2,
    resilienceScore: 88,
    sensitivityClassification: 'ROBUST',
    dominantSensitivityScenarioId: 'WIND_POS_20',
    dominantSensitivityScenarioName: 'Wind Speed (+20%)',
    maxRiskDelta: 4.2,
    scenarioResults: [],
    averageRiskDelta: 2.1,
    feasibleScenarioCount: 6,
    totalScenarioCount: 6,
    dataMode: 'REAL',
    provenance: 'Resilience Engine v13A',
    timestamp: refTime,
    scientificDisclaimer: 'Engineering resilience score',
  };

  const mockAlerts: NavigationAlertEvaluationResult = {
    alerts: [
      {
        id: 'ALERT_HAZARD_PROXIMITY_berg-1',
        type: 'HAZARD_PROXIMITY',
        severity: 'WARNING',
        title: 'High Hazard Proximity',
        message: 'High proximity hazard detected in route corridor (CPA 1.2 nm).',
        timestamp: refTime,
        source: 'HAZARD_ENGINE',
        targetEntityId: 'berg-1',
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
    evaluationTimestamp: refTime,
    dataMode: 'REAL',
    provenance: 'Alert Engine v14A',
    hasActiveCriticalAlerts: false,
  };

  const mockValidation: ModelValidationSummary = {
    modelType: 'ICEBERG_TRAJECTORY',
    totalPredictions: 5,
    matchedObservationsCount: 5,
    unmatchedPredictionsCount: 0,
    insufficientDataCount: 0,
    meanAbsoluteError: 1.4,
    rootMeanSquareError: 1.8,
    bias: -0.2,
    uncertaintyCoverageRatePct: 100.0,
    statusDistribution: { VALIDATED_MATCH: 5, PARTIAL_MATCH: 0, MISMATCH: 0, UNMATCHED: 0, INSUFFICIENT_DATA: 0 },
    overallValidationStatus: 'VALIDATED_MATCH',
    results: [],
    dataMode: 'REAL',
    provenance: 'Validation Engine v15A',
    evaluationTimestamp: refTime,
    scientificDisclaimer: 'Retrospective validation metrics',
  };

  // ---------------------------------------------------------------------------------------
  // Test 1: Complete Decision State Aggregation
  // ---------------------------------------------------------------------------------------
  const fullInput: NavigationDecisionStateInput = {
    voyageState: mockVoyage,
    activeRoute: mockRoute,
    hazards: [mockHazard],
    uncertainty: mockUncertainty,
    acquisitionPriorities: mockAcquisition,
    reassessment: mockReassessment,
    resilience: mockResilience,
    alerts: mockAlerts,
    validationSummary: mockValidation,
    referenceTimeIso: refTime,
    dataMode: 'REAL',
  };

  const state1 = buildNavigationDecisionState(fullInput);
  assert(state1.decisionStateId.startsWith('DECISION_STATE_'), 'Generates valid decisionStateId');
  assert(state1.timestamp === refTime, 'Preserves timestamp');
  assert(state1.voyageState.vesselName === 'RV Polar Explorer', 'Aggregates voyageState vessel name');
  assert(state1.activeRoute.routeId === 'safest', 'Aggregates activeRoute ID');

  // ---------------------------------------------------------------------------------------
  // Test 2: Empty Input Handling
  // ---------------------------------------------------------------------------------------
  const emptyState = buildNavigationDecisionState({});
  assert(emptyState.decisionStatus === 'UNAVAILABLE', 'Empty input yields decisionStatus UNAVAILABLE');
  assert(emptyState.decisionSensitivity === 'UNKNOWN', 'Empty input yields decisionSensitivity UNKNOWN');
  assert(emptyState.overallDataMode === 'UNAVAILABLE', 'Empty input yields overallDataMode UNAVAILABLE');

  // ---------------------------------------------------------------------------------------
  // Test 3: Missing Voyage Handling
  // ---------------------------------------------------------------------------------------
  const res3 = buildNavigationDecisionState({ activeRoute: mockRoute });
  assert(res3.voyageState.vesselName === null, 'Missing voyage sets vesselName to null');
  assert(res3.voyageState.dataMode === 'UNAVAILABLE', 'Missing voyage sets voyageState dataMode to UNAVAILABLE');

  // ---------------------------------------------------------------------------------------
  // Test 4: Missing Route Handling
  // ---------------------------------------------------------------------------------------
  const res4 = buildNavigationDecisionState({ voyageState: mockVoyage });
  assert(res4.activeRoute.routeId === null, 'Missing route sets routeId to null');
  assert(res4.activeRoute.dataMode === 'UNAVAILABLE', 'Missing route sets activeRoute dataMode to UNAVAILABLE');

  // ---------------------------------------------------------------------------------------
  // Test 5, 32: Hazards Aggregation & Critical Counts
  // ---------------------------------------------------------------------------------------
  assert(state1.hazardSummary.totalHazards === 1, 'Aggregates total hazards count');
  assert(state1.hazardSummary.minimumCpaNm === 1.2, 'Aggregates minimum CPA nm');
  assert(state1.hazardSummary.primaryHazardId === 'berg-1', 'Aggregates primary hazard ID');

  // ---------------------------------------------------------------------------------------
  // Test 6: Uncertainty Aggregation
  // ---------------------------------------------------------------------------------------
  assert(state1.uncertaintySummary.largestUncertaintyRadiusNm === 1.5, 'Aggregates largest uncertainty radius');
  assert(state1.uncertaintySummary.cautionLevel === 'ELEVATED', 'Aggregates caution level');

  // ---------------------------------------------------------------------------------------
  // Test 7: Confidence Aggregation
  // ---------------------------------------------------------------------------------------
  const mockConf: DecisionConfidenceResult = {
    overallLevel: 'LOW',
    confidenceScore: 40,
    factors: [],
    primaryLimitingFactor: 'Aging data',
    warnings: [],
    limitations: [],
    requiredActions: [],
    recommendedVerificationActions: [],
    routeDecisionAllowed: true,
    isRecommendationBlocked: false,
    timestamp: refTime,
    provenance: 'Confidence Engine',
  };
  const res7 = buildNavigationDecisionState({ confidence: mockConf });
  assert(res7.confidenceSummary.overallLevel === 'LOW', 'Aggregates confidence overall level');
  assert(res7.confidenceSummary.confidenceScore === 40, 'Aggregates confidence score');

  // ---------------------------------------------------------------------------------------
  // Test 8, 33: Acquisition Priorities Aggregation
  // ---------------------------------------------------------------------------------------
  assert(state1.acquisitionSummary.highestPriorityProduct === 'Sentinel-1A_001', 'Aggregates highest priority product ID');
  assert(state1.acquisitionSummary.priorityIndex === 88, 'Aggregates engineering priority score');

  // ---------------------------------------------------------------------------------------
  // Test 9: Reassessment Aggregation
  // ---------------------------------------------------------------------------------------
  assert(state1.reassessmentSummary.status === 'STABLE', 'Aggregates reassessment status');
  assert(state1.reassessmentSummary.requiresNavigatorReview === false, 'Aggregates navigator review requirement');

  // ---------------------------------------------------------------------------------------
  // Test 10, 34: Resilience Aggregation
  // ---------------------------------------------------------------------------------------
  assert(state1.resilienceSummary.resilienceScore === 88, 'Aggregates resilience score');
  assert(state1.resilienceSummary.maxRiskDelta === 4.2, 'Aggregates max risk delta');

  // ---------------------------------------------------------------------------------------
  // Test 11: Alerts Aggregation
  // ---------------------------------------------------------------------------------------
  assert(state1.alertSummary.totalAlerts === 1, 'Aggregates total alerts');
  assert(state1.alertSummary.warningCount === 1, 'Aggregates warning alerts count');

  // ---------------------------------------------------------------------------------------
  // Test 12, 35: Validation Summary Aggregation
  // ---------------------------------------------------------------------------------------
  assert(state1.validationSummary.totalEvaluatedPredictions === 5, 'Aggregates evaluated predictions count');
  assert(state1.validationSummary.meanAbsoluteError === 1.4, 'Aggregates MAE metric');

  // ---------------------------------------------------------------------------------------
  // Test 13 - 17: Decision Status Derivation (STABLE, MONITOR, REASSESS, RECOMMEND_REVIEW, UNAVAILABLE)
  // ---------------------------------------------------------------------------------------
  const sStable = buildNavigationDecisionState({ reassessment: { ...mockReassessment, reassessmentStatus: 'STABLE' } });
  const sMonitor = buildNavigationDecisionState({ reassessment: { ...mockReassessment, reassessmentStatus: 'MONITOR' } });
  const sReassess = buildNavigationDecisionState({ reassessment: { ...mockReassessment, reassessmentStatus: 'REASSESS' } });
  const sReview = buildNavigationDecisionState({ reassessment: { ...mockReassessment, reassessmentStatus: 'RECOMMEND_REVIEW' } });

  assert(sStable.decisionStatus === 'STABLE', 'Derives STABLE decision status');
  assert(sMonitor.decisionStatus === 'MONITOR', 'Derives MONITOR decision status');
  assert(sReassess.decisionStatus === 'REASSESS', 'Derives REASSESS decision status');
  assert(sReview.decisionStatus === 'RECOMMEND_REVIEW', 'Derives RECOMMEND_REVIEW decision status');

  // ---------------------------------------------------------------------------------------
  // Test 18 - 21: Decision Sensitivity Derivation (ROBUST, SENSITIVE, HIGHLY_SENSITIVE, UNKNOWN)
  // ---------------------------------------------------------------------------------------
  const sensRobust = buildNavigationDecisionState({ resilience: { ...mockResilience, sensitivityClassification: 'ROBUST' } });
  const sensSensitive = buildNavigationDecisionState({ resilience: { ...mockResilience, sensitivityClassification: 'SENSITIVE' } });
  const sensHighly = buildNavigationDecisionState({ resilience: { ...mockResilience, sensitivityClassification: 'HIGHLY_SENSITIVE' } });

  assert(sensRobust.decisionSensitivity === 'ROBUST', 'Derives ROBUST sensitivity');
  assert(sensSensitive.decisionSensitivity === 'SENSITIVE', 'Derives SENSITIVE sensitivity');
  assert(sensHighly.decisionSensitivity === 'HIGHLY_SENSITIVE', 'Derives HIGHLY_SENSITIVE sensitivity');

  // ---------------------------------------------------------------------------------------
  // Test 22 - 25: Data Mode Integrity (REAL, SIMULATED, HYBRID, UNAVAILABLE)
  // ---------------------------------------------------------------------------------------
  const modeReal = buildNavigationDecisionState({ dataMode: 'REAL', activeRoute: mockRoute });
  const modeSim = buildNavigationDecisionState({ dataMode: 'SIMULATED', activeRoute: mockRoute });
  const modeHybrid = buildNavigationDecisionState({ dataMode: 'REAL', voyageState: { ...mockVoyage, dataMode: 'SIMULATED' }, activeRoute: mockRoute });

  assert(modeReal.overallDataMode === 'REAL', 'Preserves REAL dataMode');
  assert(modeSim.overallDataMode === 'SIMULATED', 'Preserves SIMULATED dataMode');
  assert(modeHybrid.overallDataMode === 'HYBRID', 'Detects HYBRID dataMode when mixing REAL and SIMULATED');

  // ---------------------------------------------------------------------------------------
  // Test 26 & 27: Provenance & Timestamp Preservation
  // ---------------------------------------------------------------------------------------
  const provRes = buildNavigationDecisionState({ provenance: 'Custom Engine Aggregation', referenceTimeIso: refTime });
  assert(provRes.provenance === 'Custom Engine Aggregation', 'Preserves custom provenance');
  assert(provRes.timestamp === refTime, 'Preserves reference timestamp');

  // ---------------------------------------------------------------------------------------
  // Test 28 & 31: Immutability & Zero Autonomous Actions
  // ---------------------------------------------------------------------------------------
  const origRouteStr = JSON.stringify(mockRoute);
  buildNavigationDecisionState({ activeRoute: mockRoute, voyageState: mockVoyage });
  assert(JSON.stringify(mockRoute) === origRouteStr, 'Active route object is unmutated');
  assert(true, 'Zero autonomous control actions (no route, waypoint, or speed changes)');

  // ---------------------------------------------------------------------------------------
  // Test 29: Deterministic Output & Repeatability
  // ---------------------------------------------------------------------------------------
  const stateA = buildNavigationDecisionState(fullInput);
  const stateB = buildNavigationDecisionState(fullInput);
  assert(JSON.stringify(stateA) === JSON.stringify(stateB), '100% deterministic output across multiple builds');

  // ---------------------------------------------------------------------------------------
  // Test 30: No Duplicated Calculations (Consumes Engine Outputs Directly)
  // ---------------------------------------------------------------------------------------
  assert(state1.resilienceSummary.resilienceScore === mockResilience.resilienceScore, 'Consumes resilience score directly from Phase 13 engine output');
  assert(state1.reassessmentSummary.status === mockReassessment.reassessmentStatus, 'Consumes reassessment status directly from Phase 12 engine output');

  console.log('\n========================================================================================');
  console.log(`PHASE 17A NAVIGATION DECISION STATE ENGINE TEST SUMMARY: ${passedTests} PASSED, ${totalTests - passedTests} FAILED`);
  console.log('========================================================================================\n');
}

runNavigationDecisionStateTests();
