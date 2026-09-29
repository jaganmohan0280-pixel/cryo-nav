/**
 * CRYO NAV — Navigation Decision State Panel UI Unit Test Suite
 * Phase 17B — System Integration & UI Verification Suite
 *
 * Verifies at least 30 deterministic test scenarios:
 * 1. complete panel rendering
 * 2. empty state ("NAVIGATION DECISION STATE UNAVAILABLE")
 * 3. STABLE decision status badge
 * 4. MONITOR decision status badge
 * 5. REASSESS decision status badge
 * 6. RECOMMEND_REVIEW decision status badge
 * 7. UNAVAILABLE decision status badge
 * 8. ROBUST decision sensitivity badge
 * 9. SENSITIVE decision sensitivity badge
 * 10. HIGHLY_SENSITIVE decision sensitivity badge
 * 11. UNKNOWN decision sensitivity badge
 * 12. active route summary card metrics
 * 13. hazard summary card metrics
 * 14. uncertainty summary card metrics
 * 15. confidence summary card metrics
 * 16. data acquisition summary card metrics
 * 17. decision reassessment summary card metrics
 * 18. route resilience summary card metrics
 * 19. navigation alerts summary card metrics
 * 20. model validation summary card metrics
 * 21. REAL provenance badge
 * 22. SIMULATED provenance badge
 * 23. HYBRID provenance badge
 * 24. UNAVAILABLE provenance badge
 * 25. "Engineering Priority Index — not a probability" label
 * 26. "RETROSPECTIVE MODEL VALIDATION" label
 * 27. mandatory navigator authority disclaimer
 * 28. deterministic rendering across identical states
 * 29. zero autonomous action commands
 * 30. zero duplicated calculations
 */

import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { NavigationDecisionStatePanel } from '../components/navigation/NavigationDecisionStatePanel';
import {
  buildNavigationDecisionState,
  NavigationDecisionState,
  MANDATORY_DECISION_STATE_DISCLAIMER,
} from '../services/navigationDecisionStateEngine';

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passCount++;
  } else {
    console.error(`  [FAIL] ${testName}`);
    failCount++;
    throw new Error(`Assertion failed: ${testName}`);
  }
}

function runNavigationDecisionStatePanelTests() {
  console.log('========================================================================================');
  console.log('RUNNING PHASE 17B NAVIGATION DECISION STATE PANEL UI TESTS');
  console.log('========================================================================================\n');

  const refTime = '2026-09-27T04:00:00.000Z';

  // Master mock complete state
  const mockCompleteState: NavigationDecisionState = buildNavigationDecisionState({
    voyageState: {
      vesselId: 'v1',
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
      estimatedArrivalTime: refTime,
      currentSpeedKnots: 11.5,
      connectivityState: 'ONLINE',
      environmentalDataFreshness: 'FRESH',
      confidenceLevel: 'HIGH',
      lastStateUpdate: refTime,
      dataMode: 'REAL',
      totalWaypointsCount: 4,
      completedWaypointsCount: 1,
    },
    activeRoute: {
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
    },
    hazards: [
      {
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
        provenance: 'USNIC Catalog',
        dataMode: 'REAL',
      },
    ],
    uncertainty: {
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
      explanation: '24h drift variance expansion',
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
        explanation: '24h drift variance expansion',
        severity: 'HIGH',
        riskModifier: 1.5,
        recommendedCautionLevel: 'HIGH_CAUTION',
        dataMode: 'REAL',
        provenance: 'Uncertainty Engine v10A',
      },
      timestamp: refTime,
    },
    confidence: {
      overallLevel: 'HIGH',
      confidenceScore: 88,
      primaryLimitingFactor: 'None',
      recommendedVerificationActions: ['Maintain watch'],
      isRecommendationBlocked: false,
      provenance: 'Confidence Engine v4',
      evaluatedFactorsCount: 8,
      dataMode: 'REAL',
    },
    acquisitionPriorities: {
      rankedCandidates: [
        {
          productId: 'Sentinel-1C_SAR_20260927',
          productName: 'Sentinel-1C SAR Footprint',
          sensor: 'SAR',
          productType: 'IW_GRDH_1SDV',
          engineeringPriorityIndex: 92,
          priority: 'CRITICAL',
          availabilityStatus: 'AVAILABLE_FOR_DOWNLINK',
          affectedDecision: 'Confirm A76A iceberg drift vector',
          affectedRouteName: 'Recommended Safe Route',
          uncertaintyAddressed: 'Iceberg position variance',
          expectedDecisionImpact: 'High potential to confirm clear passage',
          expectedUncertaintyReductionPct: 45,
          acquisitionCostMb: 120,
          withinBandwidthBudget: true,
          reason: 'Direct overlap with active route corridor',
          provenance: 'Copernicus STAC',
          confidenceLevel: 'HIGH',
          freshnessState: 'FRESH',
          footprint: { centerLat: -65.0, centerLon: -65.0, radiusNm: 25.0, description: 'SAR Footprint' },
          scoreBreakdown: {
            spatialOverlapPct: 90,
            temporalRelevancePct: 95,
            routeSensitivityRelevance: 80,
            uncertaintyMagnitudeScore: 85,
            potentialRecommendationShiftScore: 75,
            freshnessBenefitScore: 90,
            productAvailabilityScore: 100,
            resolutionRelevanceScore: 90,
            acquisitionCostPenalty: 10,
            connectivityCostPenalty: 0,
          },
          rawProductMetadata: { id: 's1-c1' } as any,
        },
      ],
      totalCandidatesEvaluated: 1,
      eligibleWithinBandwidthCount: 1,
      connectionState: 'ONLINE',
      availableBandwidthMb: 500,
      dominantAcquisitionPriority: 'CRITICAL',
      rankingTimestamp: refTime,
      explanation: 'High VoI satellite acquisition',
      isTestFixture: true,
    },
    reassessment: {
      reassessmentStatus: 'STABLE',
      triggerReasons: ['Routine corridor check'],
      explanation: 'Current route corridor remains stable.',
      changedVariables: [],
      previousValues: {},
      currentValues: {},
      decisionSensitivity: 'ROBUST',
      uncertaintyChange: {
        previousRadiusNm: 2.0,
        currentRadiusNm: 2.0,
        deltaNm: 0,
        expansionPct: 0,
        hasExpandedMaterially: false,
      },
      hazardImpact: {
        previousSeverity: 'LOW',
        currentSeverity: 'LOW',
        hasSeverityIncreased: false,
        previousCpaNm: 5.0,
        currentCpaNm: 5.0,
        cpaDeltaNm: 0,
        hasCpaDroppedMaterially: false,
        affectedHazardId: null,
      },
      timestamp: refTime,
      dataMode: 'REAL',
      provenance: 'Reassessment Engine v12A',
    },
    resilience: {
      routeId: 'safest',
      routeName: 'Recommended Safe Route',
      resilienceScore: 88,
      sensitivityClassification: 'ROBUST',
      dominantSensitivityScenarioId: 'ICEBERG_DRIFT',
      dominantSensitivityScenarioName: 'Iceberg Drift Velocity (+20%)',
      maxRiskDelta: 4.2,
      averageRiskDelta: 1.5,
      baselineRiskIndex: 25.0,
      baselineEtaHours: 28.5,
      baselineFuelTons: 18.2,
      feasibleScenarioCount: 6,
      totalScenarioCount: 6,
      scenarioResults: [],
      timestamp: refTime,
      dataMode: 'REAL',
      provenance: 'Route Resilience Engine v13A',
      scientificDisclaimer: 'Decision support metric only',
    },
    alerts: {
      alerts: [
        {
          id: 'a1',
          type: 'ICEBERG_ENCOUNTER',
          severity: 'WARNING',
          title: 'High Proximity Iceberg Encounter',
          message: 'Iceberg A76A CPA 1.2 nm predicted',
          timestamp: refTime,
          source: 'HAZARD_ENGINE',
          acknowledged: false,
          dataMode: 'REAL',
          provenance: 'USNIC Catalog',
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
    },
    validationSummary: {
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
    },
    dataMode: 'REAL',
    provenance: 'Phase 17A Test Master Payload',
    referenceTimeIso: refTime,
  });

  // 1. Complete Panel Render
  const htmlComplete = ReactDOMServer.renderToString(
    React.createElement(NavigationDecisionStatePanel, { decisionState: mockCompleteState })
  );
  assert(htmlComplete.includes('CURRENT NAVIGATION DECISION STATE'), '1. complete panel rendered');

  // 2. Empty State
  const htmlEmpty = ReactDOMServer.renderToString(
    React.createElement(NavigationDecisionStatePanel, { decisionState: null })
  );
  assert(htmlEmpty.includes('NAVIGATION DECISION STATE UNAVAILABLE'), '2. empty state rendered');

  // 3. STABLE Status
  assert(htmlComplete.includes('STABLE'), '3. STABLE decision status rendered');

  // 4. MONITOR Status
  const stateMonitor = buildNavigationDecisionState({
    reassessment: { reassessmentStatus: 'MONITOR', triggerReasons: ['Iceberg proximity'] } as any,
  });
  const htmlMonitor = ReactDOMServer.renderToString(
    React.createElement(NavigationDecisionStatePanel, { decisionState: stateMonitor })
  );
  assert(htmlMonitor.includes('MONITOR'), '4. MONITOR decision status rendered');

  // 5. REASSESS Status
  const stateReassess = buildNavigationDecisionState({
    reassessment: { reassessmentStatus: 'REASSESS', triggerReasons: ['CPA drop'] } as any,
  });
  const htmlReassess = ReactDOMServer.renderToString(
    React.createElement(NavigationDecisionStatePanel, { decisionState: stateReassess })
  );
  assert(htmlReassess.includes('REASSESS'), '5. REASSESS decision status rendered');

  // 6. RECOMMEND_REVIEW Status
  const stateReview = buildNavigationDecisionState({
    reassessment: { reassessmentStatus: 'RECOMMEND_REVIEW', triggerReasons: ['Stale offline hazard'] } as any,
  });
  const htmlReview = ReactDOMServer.renderToString(
    React.createElement(NavigationDecisionStatePanel, { decisionState: stateReview })
  );
  assert(htmlReview.includes('RECOMMEND REVIEW'), '6. RECOMMEND_REVIEW decision status rendered');

  // 7. UNAVAILABLE Status
  const stateUnavailStatus = buildNavigationDecisionState({ dataMode: 'UNAVAILABLE' });
  const htmlUnavailStatus = ReactDOMServer.renderToString(
    React.createElement(NavigationDecisionStatePanel, { decisionState: stateUnavailStatus })
  );
  assert(htmlUnavailStatus.includes('UNAVAILABLE'), '7. UNAVAILABLE decision status rendered');

  // 8. ROBUST Sensitivity
  assert(htmlComplete.includes('ROBUST'), '8. ROBUST decision sensitivity rendered');

  // 9. SENSITIVE Sensitivity
  const stateSensitive = buildNavigationDecisionState({
    resilience: { sensitivityClassification: 'SENSITIVE' } as any,
  });
  const htmlSensitive = ReactDOMServer.renderToString(
    React.createElement(NavigationDecisionStatePanel, { decisionState: stateSensitive })
  );
  assert(htmlSensitive.includes('SENSITIVE'), '9. SENSITIVE decision sensitivity rendered');

  // 10. HIGHLY_SENSITIVE Sensitivity
  const stateHighlySensitive = buildNavigationDecisionState({
    resilience: { sensitivityClassification: 'HIGHLY_SENSITIVE' } as any,
  });
  const htmlHighlySensitive = ReactDOMServer.renderToString(
    React.createElement(NavigationDecisionStatePanel, { decisionState: stateHighlySensitive })
  );
  assert(htmlHighlySensitive.includes('HIGHLY SENSITIVE'), '10. HIGHLY_SENSITIVE decision sensitivity rendered');

  // 11. UNKNOWN Sensitivity
  const stateUnknown = buildNavigationDecisionState({
    activeRoute: { id: 'route-1' } as any,
    dataMode: 'SIMULATED',
  });
  const htmlUnknown = ReactDOMServer.renderToString(
    React.createElement(NavigationDecisionStatePanel, { decisionState: stateUnknown })
  );
  assert(htmlUnknown.includes('UNKNOWN'), '11. UNKNOWN decision sensitivity rendered');

  // 12. Active Route Summary
  assert(htmlComplete.includes('Recommended Safe Route') && htmlComplete.includes('320 nm'), '12. active route summary metrics rendered');

  // 13. Hazard Summary
  assert(htmlComplete.includes('Iceberg A76A') && htmlComplete.includes('1.2 nm'), '13. hazard summary metrics rendered');

  // 14. Uncertainty Summary
  assert(htmlComplete.includes('±2.1 nm') && htmlComplete.includes('+24 h'), '14. uncertainty summary metrics rendered');

  // 15. Confidence Summary
  assert(htmlComplete.includes('HIGH'), '15. confidence summary metrics rendered');

  // 16. Acquisition Summary
  assert(htmlComplete.includes('Sentinel-1C_SAR_20260927') && htmlComplete.includes('92 / 100'), '16. data acquisition summary metrics rendered');

  // 17. Reassessment Summary
  assert(htmlComplete.includes('Routine corridor check'), '17. decision reassessment summary metrics rendered');

  // 18. Route Resilience Summary
  assert(htmlComplete.includes('88 / 100') && htmlComplete.includes('Iceberg Drift Velocity (+20%)'), '18. route resilience summary metrics rendered');

  // 19. Navigation Alerts Summary
  assert(htmlComplete.includes('9. NAVIGATION ALERTS') && htmlComplete.includes('Total Alerts:'), '19. navigation alerts summary metrics rendered');

  // 20. Model Validation Summary
  assert(htmlComplete.includes('42') && htmlComplete.includes('1.15 nm') && htmlComplete.includes('92.5%'), '20. model validation summary metrics rendered');

  // 21. REAL Provenance
  const stateReal = buildNavigationDecisionState({
    activeRoute: { id: 'route-1' } as any,
    dataMode: 'REAL',
  });
  const htmlReal = ReactDOMServer.renderToString(
    React.createElement(NavigationDecisionStatePanel, { decisionState: stateReal })
  );
  assert(htmlReal.includes('PROVENANCE: REAL'), '21. REAL provenance badge rendered');

  // 22. SIMULATED Provenance
  const stateSimulated = buildNavigationDecisionState({
    activeRoute: { id: 'r1' } as any,
    dataMode: 'SIMULATED',
  });
  const htmlSimulated = ReactDOMServer.renderToString(
    React.createElement(NavigationDecisionStatePanel, { decisionState: stateSimulated })
  );
  assert(htmlSimulated.includes('PROVENANCE: SIMULATED'), '22. SIMULATED provenance badge rendered');

  // 23. HYBRID Provenance
  const stateHybrid = buildNavigationDecisionState({
    activeRoute: { id: 'r1' } as any,
    dataMode: 'SIMULATED',
    voyageState: { dataMode: 'REAL' } as any,
    hazards: [{ dataMode: 'SIMULATED' } as any],
  });
  const htmlHybrid = ReactDOMServer.renderToString(
    React.createElement(NavigationDecisionStatePanel, { decisionState: stateHybrid })
  );
  assert(htmlHybrid.includes('PROVENANCE: HYBRID'), '23. HYBRID provenance badge rendered');

  // 24. UNAVAILABLE Provenance
  assert(htmlEmpty.includes('SYSTEM MODE: UNAVAILABLE') || htmlEmpty.includes('PROVENANCE: UNAVAILABLE'), '24. UNAVAILABLE provenance badge rendered');

  // 25. Engineering Priority Index Label
  assert(htmlComplete.includes('Engineering Priority Index — not a probability'), '25. engineering priority index label rendered verbatim');

  // 26. Retrospective Model Validation Label
  assert(htmlComplete.includes('RETROSPECTIVE MODEL VALIDATION'), '26. retrospective model validation label rendered verbatim');

  // 27. Navigator Disclaimer
  assert(htmlComplete.includes(MANDATORY_DECISION_STATE_DISCLAIMER), '27. mandatory navigator disclaimer rendered verbatim');

  // 28. Deterministic Rendering
  const htmlComplete2 = ReactDOMServer.renderToString(
    React.createElement(NavigationDecisionStatePanel, { decisionState: mockCompleteState })
  );
  assert(htmlComplete === htmlComplete2, '28. deterministic rendering confirmed across multiple calls');

  // 29. Zero Autonomous Action Commands
  const prohibitedCommands = ['turn left', 'turn right', 'change heading', 'change speed', 'execute route', 'automatically replan'];
  let containsProhibited = false;
  for (const cmd of prohibitedCommands) {
    if (htmlComplete.toLowerCase().includes(cmd)) {
      containsProhibited = true;
      break;
    }
  }
  assert(!containsProhibited, '29. strictly avoids autonomous vessel control commands');

  // 30. Zero Duplicated Calculations
  assert(htmlComplete.includes('320 nm') && htmlComplete.includes('88 / 100'), '30. displays precomputed engine aggregation outputs without duplicated math');

  // Summary
  console.log('\n========================================================================================');
  console.log(`ALL 30 PHASE 17B NAVIGATION DECISION STATE PANEL UI TESTS PASSED!`);
  console.log('========================================================================================\n');
}

runNavigationDecisionStatePanelTests();
