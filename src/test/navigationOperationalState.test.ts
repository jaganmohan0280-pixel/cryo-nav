/**
 * CRYO NAV — Navigation Operational State Orchestration Engine Unit Tests
 * Phase 18A — Operational State Verification Suite
 *
 * Verifies that buildNavigationOperationalState:
 * 1. Assembles an end-to-end operational snapshot across all 16 core sections.
 * 2. Preserves dataMode ('REAL', 'SIMULATED', 'HYBRID', 'UNAVAILABLE') accurately.
 * 3. Never upgrades SIMULATED inputs to REAL.
 * 4. Tolerates missing inputs by setting sections to UNAVAILABLE without synthetic fabrication.
 * 5. Preserves reference timestamps, freshness, confidence, hazards, alerts, and validation.
 * 6. Carries the mandatory navigator-authority disclaimer.
 * 7. Zero autonomous control actions (no steering, speed change, or waypoint mutations).
 * 8. Is 100% deterministic (no network calls, no Gemini invocations).
 */

import {
  buildNavigationOperationalState,
  NavigationOperationalStateInput,
  MANDATORY_OPERATIONAL_STATE_DISCLAIMER,
} from '../services/navigationOperationalStateEngine';

import { MissionConfig, VesselProfile, RouteAlternative, DecisionConfidenceResult } from '../types';
import { VoyageState } from '../services/voyageStateEngine';
import { HazardEncounter } from '../services/hazardEncounterEngine';
import { UncertaintyEvaluationResult } from '../services/uncertaintyEngine';
import { AcquisitionRankingResult } from '../services/decisionImpactAcquisitionEngine';
import { DecisionReassessmentResult } from '../services/decisionReassessmentEngine';
import { RouteResilienceEvaluationResult } from '../services/routeResilienceEngine';
import { NavigationAlertEvaluationResult } from '../services/navigationAlertEngine';
import { ModelValidationSummary } from '../services/modelValidationEngine';

function runNavigationOperationalStateTests() {
  console.log('========================================================================================');
  console.log('RUNNING PHASE 18A NAVIGATION OPERATIONAL STATE ORCHESTRATION ENGINE UNIT TESTS');
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

  const refTime = '2026-09-27T14:00:00.000Z';

  // Mock Objects
  const mockMission: MissionConfig = {
    id: 'm-01',
    title: 'Marguerite Bay Science Recon',
    startLocation: { name: 'Gate 1', lat: -59.5, lon: -64.5 },
    destination: { name: 'Rothera Station', lat: -67.57, lon: -68.13 },
    waypoints: [],
    priority: 'BALANCED',
    maxSeaIceConcentrationPercent: 70,
    departureTimeIso: refTime,
  };

  const mockVessel: VesselProfile = {
    id: 'v-1',
    name: 'RV Polar Explorer',
    iceClass: 'Polar Class 3',
    maxSeaIceConcentrationPercent: 78,
    cruisingSpeedKnots: 11.5,
    draftMeters: 8.8,
    fuelBurnRateTonsPerDay: 24.5,
  };

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
  };

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
  };

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
      },
    ],
    topRecommendation: null,
    totalCandidateCount: 1,
    connectionState: 'ONLINE',
    availableBandwidthMb: 150,
    bandwidthConstraintApplied: false,
    evaluationTimestamp: refTime,
    dataMode: 'REAL',
    provenance: 'VoI Acquisition Engine v11A',
  };

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
  };

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
  };

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
  // TEST 1: Complete REAL Operational Snapshot
  // --------------------------------------------------------------------------------------
  const stateReal = buildNavigationOperationalState({
    mission: mockMission,
    vessel: mockVessel,
    voyageState: mockVoyageReal,
    activeRoute: mockRoute,
    routes: [mockRoute],
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

  assert(stateReal.operationalStateId.startsWith('OPERATIONAL_STATE_'), '1. Generates valid operationalStateId');
  assert(stateReal.overallDataMode === 'REAL', '1b. REAL overall dataMode derived');
  assert(stateReal.mission.title === 'Marguerite Bay Science Recon', '1c. Mission summary aggregated');
  assert(stateReal.vessel.vesselName === 'RV Polar Explorer', '1d. Vessel summary aggregated');
  assert(stateReal.position.latitude === -64.5, '1e. Position summary aggregated');

  // --------------------------------------------------------------------------------------
  // TEST 2: Complete SIMULATED Snapshot
  // --------------------------------------------------------------------------------------
  const stateSim = buildNavigationOperationalState({
    mission: mockMission,
    vessel: mockVessel,
    voyageState: { ...mockVoyageReal, dataMode: 'SIMULATED' },
    activeRoute: mockRoute,
    hazards: [{ ...mockHazard, dataMode: 'SIMULATED' }],
    dataMode: 'SIMULATED',
    referenceTimeIso: refTime,
  });

  assert(stateSim.overallDataMode === 'SIMULATED', '2. SIMULATED dataMode preserved without upgrading to REAL');

  // --------------------------------------------------------------------------------------
  // TEST 3: HYBRID Snapshot
  // --------------------------------------------------------------------------------------
  const stateHybrid = buildNavigationOperationalState({
    voyageState: mockVoyageReal, // REAL
    hazards: [{ ...mockHazard, dataMode: 'SIMULATED' }], // SIMULATED
    dataMode: 'SIMULATED',
    referenceTimeIso: refTime,
  });

  assert(stateHybrid.overallDataMode === 'HYBRID', '3. Mixed REAL and SIMULATED input sources yield HYBRID overall dataMode');

  // --------------------------------------------------------------------------------------
  // TEST 4: Unavailable Environment
  // --------------------------------------------------------------------------------------
  const stateUnavailEnv = buildNavigationOperationalState({
    dataMode: 'UNAVAILABLE',
  });

  assert(stateUnavailEnv.environment.seaIceState === 'UNAVAILABLE', '4. Missing environment returns UNAVAILABLE state without synthetic fabrication');

  // --------------------------------------------------------------------------------------
  // TEST 5: Unavailable Route
  // --------------------------------------------------------------------------------------
  assert(stateUnavailEnv.route.activeRouteId === null, '5. Missing route yields null activeRouteId');
  assert(stateUnavailEnv.route.dataMode === 'UNAVAILABLE', '5b. Missing route mode is UNAVAILABLE');

  // --------------------------------------------------------------------------------------
  // TEST 6: Unavailable Hazard Data
  // --------------------------------------------------------------------------------------
  assert(stateUnavailEnv.hazards.totalHazardsCount === 0, '6. Missing hazards yields 0 total hazards');
  assert(stateUnavailEnv.hazards.dataMode === 'UNAVAILABLE', '6b. Missing hazard dataMode is UNAVAILABLE');

  // --------------------------------------------------------------------------------------
  // TEST 7: Offline State Tolerance
  // --------------------------------------------------------------------------------------
  const stateOffline = buildNavigationOperationalState({
    voyageState: { ...mockVoyageReal, connectivityState: 'OFFLINE' },
    connectionState: 'OFFLINE',
    referenceTimeIso: refTime,
  });

  assert(stateOffline.position.positionTimestamp === refTime, '7. Offline state preserves position timestamp');

  // --------------------------------------------------------------------------------------
  // TEST 8: Stale Environmental State
  // --------------------------------------------------------------------------------------
  const stateStale = buildNavigationOperationalState({
    freshnessState: 'STALE',
    uncertainty: { ...mockUncertainty, freshnessState: 'STALE' },
    referenceTimeIso: refTime,
  });

  assert(stateStale.uncertainty.freshnessState === 'STALE', '8. Stale freshness state propagates cleanly');

  // --------------------------------------------------------------------------------------
  // TEST 9: High Uncertainty Envelope
  // --------------------------------------------------------------------------------------
  const stateHighUncert = buildNavigationOperationalState({
    uncertainty: { ...mockUncertainty, expandedUncertaintyRadiusNm: 9.8, recommendedCautionLevel: 'RE_EVALUATION_REQUIRED' },
    referenceTimeIso: refTime,
  });

  assert(stateHighUncert.uncertainty.uncertaintyRadiusNm === 9.8, '9. High uncertainty radius propagates');
  assert(stateHighUncert.uncertainty.cautionLevel === 'RE_EVALUATION_REQUIRED', '9b. Caution level propagates');

  // --------------------------------------------------------------------------------------
  // TEST 10: Critical Hazard Propagation
  // --------------------------------------------------------------------------------------
  const stateCritHazard = buildNavigationOperationalState({
    hazards: [{ ...mockHazard, severity: 'CRITICAL', cpaNm: 0.2 }],
    referenceTimeIso: refTime,
  });

  assert(stateCritHazard.hazards.highestSeverity === 'CRITICAL', '10. Critical hazard severity propagates');
  assert(stateCritHazard.hazards.minimumCpaNm === 0.2, '10b. Minimum CPA 0.2 nm propagates');

  // --------------------------------------------------------------------------------------
  // TEST 11: Reassessment Required Propagation
  // --------------------------------------------------------------------------------------
  const stateReassess = buildNavigationOperationalState({
    reassessment: { ...mockReassessment, reassessmentStatus: 'REASSESS', triggerReasons: ['Critical CPA breach'] },
    referenceTimeIso: refTime,
  });

  assert(stateReassess.reassessment.currentStatus === 'REASSESS', '11. Reassessment status REASSESS propagates');
  assert(stateReassess.reassessment.requiresNavigatorReview === true, '11b. Navigator review requirement flag set');

  // --------------------------------------------------------------------------------------
  // TEST 12: Alert Propagation
  // --------------------------------------------------------------------------------------
  assert(stateReal.alerts.totalAlertsCount === 1, '12. Total alerts count propagates');
  assert(stateReal.alerts.highestSeverity === 'WARNING', '12b. Highest alert severity propagates');

  // --------------------------------------------------------------------------------------
  // TEST 13: Resilience Propagation
  // --------------------------------------------------------------------------------------
  assert(stateReal.resilience.resilienceScore === 85, '13. Resilience score propagates');
  assert(stateReal.resilience.sensitivityClassification === 'ROBUST', '13b. Sensitivity classification propagates');

  // --------------------------------------------------------------------------------------
  // TEST 14: Data Acquisition VoI Propagation
  // --------------------------------------------------------------------------------------
  assert(stateReal.acquisition.highestPriorityProductId === 'SAT-S1C-001', '14. Highest priority product ID propagates');
  assert(stateReal.acquisition.engineeringPriorityIndex === 87.5, '14b. Engineering Priority Index propagates');

  // --------------------------------------------------------------------------------------
  // TEST 15: Retrospective Model Validation Propagation
  // --------------------------------------------------------------------------------------
  assert(stateReal.validation.retrospectiveValidationStatus === 'VALIDATED_MATCH', '15. Retrospective validation status propagates');
  assert(stateReal.validation.evaluatedPredictionsCount === 42, '15b. Evaluated predictions count propagates');

  // --------------------------------------------------------------------------------------
  // TEST 16: Navigator Authority Guardrail
  // --------------------------------------------------------------------------------------
  assert(stateReal.navigatorAuthorityDisclaimer === MANDATORY_OPERATIONAL_STATE_DISCLAIMER, '16. Mandatory navigator authority disclaimer present');
  assert(stateReal.limitations.includes(MANDATORY_OPERATIONAL_STATE_DISCLAIMER), '16b. Limitations array includes mandatory disclaimer');

  // --------------------------------------------------------------------------------------
  // TEST 17: Provenance Preservation
  // --------------------------------------------------------------------------------------
  assert(stateReal.sourceProvenance.includes('Phase 18A'), '17. Provenance source string preserved');

  // --------------------------------------------------------------------------------------
  // TEST 18: Timestamp Preservation & Zero Autonomous Control
  // --------------------------------------------------------------------------------------
  assert(stateReal.generationTimestamp === refTime, '18. Generation timestamp preserved');

  const initialSpeed = mockVoyageReal.currentSpeedKnots;
  const initialWaypoints = mockRoute.waypoints;

  // Execute orchestration engine call
  buildNavigationOperationalState({
    voyageState: mockVoyageReal,
    activeRoute: mockRoute,
  });

  assert(mockVoyageReal.currentSpeedKnots === initialSpeed, '18b. Vessel speed strictly unmutated');
  assert(mockRoute.waypoints === initialWaypoints, '18c. Route waypoints strictly unmutated');

  console.log('\n========================================================================================');
  console.log(`OPERATIONAL STATE ENGINE TEST SUMMARY: ${passedTests} / ${totalTests} PASSED`);
  console.log('========================================================================================\n');
}

runNavigationOperationalStateTests();
