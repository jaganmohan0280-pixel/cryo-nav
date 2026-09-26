/**
 * CRYO NAV — AI Navigation Assistant Core / Explanation Engine Unit Tests
 * Phase 16A — Verification Suite
 *
 * Verifies that buildNavigationAssistantContext:
 * 1. Assembles structured, fully traceable decision-support context.
 * 2. Mandatory navigator authority disclaimer is present in all output payloads.
 * 3. Never generates autonomous control commands (e.g., "turn left", "change speed").
 * 4. Preserves dataMode ('REAL', 'SIMULATED', 'HYBRID', 'UNAVAILABLE').
 * 5. Correctly handles missing / partial inputs without data fabrication.
 * 6. Is 100% deterministic (repeatable across identical inputs).
 */

import {
  buildNavigationAssistantContext,
  MANDATORY_NAVIGATOR_DISCLAIMER,
  NavigationAssistantContextInput,
} from '../services/navigationAssistantContextEngine';

import {
  MissionConfig,
  VesselProfile,
  RouteAlternative,
} from '../types';

import { HazardEncounter } from '../services/hazardEncounterEngine';

function runNavigationAssistantContextTests() {
  console.log('========================================================================================');
  console.log('RUNNING PHASE 16A AI NAVIGATION ASSISTANT CONTEXT ENGINE UNIT TESTS');
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
  const mockMission: MissionConfig = {
    id: 'm-1',
    title: 'Rothera Resupply Transit',
    vesselId: 'v-1',
    startLocation: { name: 'Drake Passage Gate', lat: -59.5, lon: -64.5 },
    destination: { name: 'Rothera Station', lat: -67.57, lon: -68.13 },
    missionType: 'Resupply',
    departureTime: refTime,
    priority: 'High',
    riskPreference: 'Balanced',
    fuelPreference: 'Standard',
    speedPreference: 'Standard',
    maxSeaIceConcentration: 75,
    researchWaypoints: [],
    exclusionZones: [],
    status: 'Active',
  };

  const mockVessel: VesselProfile = {
    id: 'v-1',
    name: 'RV Polar Explorer',
    type: 'Research Vessel',
    iceClass: 'Polar Class 3 (Year-round in second-year ice)',
    cruisingSpeedKnots: 11.5,
    maxSpeedKnots: 14.0,
    fuelConsumptionTonsPerDay: 24.5,
    draftMeters: 8.8,
    maxSeaIceConcentrationPercent: 75,
    minVisibilityNm: 1.0,
    turningLimitationsDegPerMin: 15.0,
    hullLengthMeters: 120.0,
    beamMeters: 22.0,
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
    costBreakdown: {
      distanceCost: 320,
      fuelCost: 18.2,
      timeCost: 28.5,
      riskCost: 25,
      uncertaintyCost: 12,
      totalCost: 403.7,
    },
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

  // ---------------------------------------------------------------------------------------
  // Test 1: Complete Context Generation
  // ---------------------------------------------------------------------------------------
  const fullInput: NavigationAssistantContextInput = {
    mission: mockMission,
    vessel: mockVessel,
    activeRoute: mockRoute,
    allRoutes: [mockRoute],
    hazards: [mockHazard],
    referenceTimeIso: refTime,
    dataMode: 'REAL',
  };
  const ctx1 = buildNavigationAssistantContext(fullInput);
  assert(ctx1.missionContext.title === 'Rothera Resupply Transit', 'Mission title included in missionContext');
  assert(ctx1.vesselContext.vesselName === 'RV Polar Explorer', 'Vessel name included in vesselContext');
  assert(ctx1.routeContext.activeRouteId === 'safest', 'Route ID included in routeContext');
  assert(ctx1.hazardContext.totalHazardsCount === 1, 'Hazard count included in hazardContext');

  // ---------------------------------------------------------------------------------------
  // Test 2: Missing Route Handling
  // ---------------------------------------------------------------------------------------
  const res2 = buildNavigationAssistantContext({ mission: mockMission, activeRoute: null });
  assert(res2.routeContext.activeRouteId === null, 'Missing route sets activeRouteId to null');
  assert(res2.routeContext.dataMode === 'UNAVAILABLE', 'Missing route sets routeContext dataMode to UNAVAILABLE');

  // ---------------------------------------------------------------------------------------
  // Test 3: Missing Hazards Handling
  // ---------------------------------------------------------------------------------------
  const res3 = buildNavigationAssistantContext({ hazards: null });
  assert(res3.hazardContext.totalHazardsCount === 0, 'Missing hazards sets count to 0');
  assert(res3.hazardContext.dataMode === 'UNAVAILABLE', 'Missing hazards sets hazardContext dataMode to UNAVAILABLE');

  // ---------------------------------------------------------------------------------------
  // Test 4: Missing Uncertainty Handling
  // ---------------------------------------------------------------------------------------
  const res4 = buildNavigationAssistantContext({ uncertainty: null });
  assert(res4.uncertaintyContext.uncertaintyRadiusNm === null, 'Missing uncertainty sets radius to null');
  assert(res4.uncertaintyContext.dataMode === 'UNAVAILABLE', 'Missing uncertainty sets uncertaintyContext dataMode to UNAVAILABLE');

  // ---------------------------------------------------------------------------------------
  // Test 5: Missing Confidence Handling
  // ---------------------------------------------------------------------------------------
  const res5 = buildNavigationAssistantContext({ confidence: null });
  assert(res5.confidenceContext.overallLevel === 'UNAVAILABLE', 'Missing confidence sets overallLevel to UNAVAILABLE');

  // ---------------------------------------------------------------------------------------
  // Test 6: Missing Data Acquisition Handling
  // ---------------------------------------------------------------------------------------
  const res6 = buildNavigationAssistantContext({ acquisitionPriorities: null });
  assert(res6.dataAcquisitionContext.highestPriorityProduct === null, 'Missing acquisition sets highestPriorityProduct to null');

  // ---------------------------------------------------------------------------------------
  // Test 7: Missing Resilience Handling
  // ---------------------------------------------------------------------------------------
  const res7 = buildNavigationAssistantContext({ resilience: null });
  assert(res7.resilienceContext.resilienceScore === null, 'Missing resilience sets resilienceScore to null');

  // ---------------------------------------------------------------------------------------
  // Test 8: Missing Reassessment Handling
  // ---------------------------------------------------------------------------------------
  const res8 = buildNavigationAssistantContext({ reassessment: null });
  assert(res8.reassessmentContext.recommendationStatus === 'UNAVAILABLE', 'Missing reassessment sets status to UNAVAILABLE');

  // ---------------------------------------------------------------------------------------
  // Test 9: Alerts Context
  // ---------------------------------------------------------------------------------------
  const res9 = buildNavigationAssistantContext({
    alerts: [
      {
        id: 'a1',
        type: 'ICEBERG_ENCOUNTER',
        severity: 'CRITICAL',
        title: 'Critical Iceberg Encounter',
        message: 'CPA 0.8 nm predicted',
        timestamp: refTime,
        source: 'HAZARD_ENGINE',
        acknowledged: false,
        dataMode: 'REAL',
        provenance: 'USNIC',
      },
    ],
  });
  assert(res9.alertContext.totalAlertsCount === 1, 'Alert count included in alertContext');
  assert(res9.alertContext.hasActiveCriticalAlerts === true, 'Flags active critical alert presence');

  // ---------------------------------------------------------------------------------------
  // Test 10, 11, 12, 13: Data Mode Preservation (REAL, SIMULATED, HYBRID, UNAVAILABLE)
  // ---------------------------------------------------------------------------------------
  const realCtx = buildNavigationAssistantContext({ dataMode: 'REAL', mission: mockMission });
  const simCtx = buildNavigationAssistantContext({ dataMode: 'SIMULATED', mission: mockMission });
  const unavailCtx = buildNavigationAssistantContext({});

  assert(realCtx.dataMode === 'REAL', 'Preserves REAL dataMode');
  assert(simCtx.dataMode === 'SIMULATED', 'Preserves SIMULATED dataMode');
  assert(unavailCtx.dataMode === 'UNAVAILABLE', 'Empty input results in UNAVAILABLE dataMode');

  // ---------------------------------------------------------------------------------------
  // Test 14: Provenance Preservation
  // ---------------------------------------------------------------------------------------
  const provCtx = buildNavigationAssistantContext({ provenance: 'Custom Science Provenance' });
  assert(provCtx.provenance === 'Custom Science Provenance', 'Preserves custom data provenance string');

  // ---------------------------------------------------------------------------------------
  // Test 15: Timestamps Preservation
  // ---------------------------------------------------------------------------------------
  const timeCtx = buildNavigationAssistantContext({ referenceTimeIso: refTime });
  assert(timeCtx.generatedAt === refTime, 'Preserves reference time in generatedAt field');

  // ---------------------------------------------------------------------------------------
  // Test 16: Unsupported Claim Prevention
  // ---------------------------------------------------------------------------------------
  assert(
    !JSON.stringify(ctx1.structuredAnswers).includes('certain collision'),
    'Explanatory text avoids false certainty language like "certain collision"'
  );

  // ---------------------------------------------------------------------------------------
  // Test 17: Navigator Authority Disclaimer Presence
  // ---------------------------------------------------------------------------------------
  assert(
    ctx1.navigatorAuthorityDisclaimer === MANDATORY_NAVIGATOR_DISCLAIMER,
    'Mandatory navigator authority disclaimer is present'
  );
  assert(
    ctx1.limitations.includes(MANDATORY_NAVIGATOR_DISCLAIMER),
    'Mandatory disclaimer included in limitations array'
  );

  // ---------------------------------------------------------------------------------------
  // Test 18: Strict Absence of Autonomous Control Commands
  // ---------------------------------------------------------------------------------------
  const fullText = JSON.stringify(ctx1).toLowerCase();
  const prohibitedCommands = ['turn left', 'turn right', 'change heading', 'change speed', 'execute route', 'automatically replan'];
  for (const cmd of prohibitedCommands) {
    assert(!fullText.includes(cmd), `Output strictly avoids autonomous command: "${cmd}"`);
  }

  // ---------------------------------------------------------------------------------------
  // Test 19: Deterministic Output & Repeatability
  // ---------------------------------------------------------------------------------------
  const cA = buildNavigationAssistantContext(fullInput);
  const cB = buildNavigationAssistantContext(fullInput);
  assert(JSON.stringify(cA) === JSON.stringify(cB), '100% deterministic output across multiple context builds');

  // ---------------------------------------------------------------------------------------
  // Test 20: Empty Input Handling
  // ---------------------------------------------------------------------------------------
  const emptyCtx = buildNavigationAssistantContext({});
  assert(emptyCtx.navigatorAuthorityDisclaimer === MANDATORY_NAVIGATOR_DISCLAIMER, 'Empty input still contains navigator authority disclaimer');
  assert(emptyCtx.dataMode === 'UNAVAILABLE', 'Empty input sets overall dataMode to UNAVAILABLE');

  // ---------------------------------------------------------------------------------------
  // Test 21: Partial Input Handling
  // ---------------------------------------------------------------------------------------
  const partialCtx = buildNavigationAssistantContext({ mission: mockMission });
  assert(partialCtx.missionContext.title === 'Rothera Resupply Transit', 'Partial input renders available section');
  assert(partialCtx.routeContext.activeRouteId === null, 'Partial input cleanly sets missing section to null/UNAVAILABLE');

  // ---------------------------------------------------------------------------------------
  // Test 22: Route Choice Rationale Traceability ("Why is current route recommended?")
  // ---------------------------------------------------------------------------------------
  assert(
    ctx1.structuredAnswers.whyCurrentRouteRecommended.includes('Recommended Safe Route'),
    'Answers "Why is current route recommended?" using traceable route metrics'
  );

  // ---------------------------------------------------------------------------------------
  // Test 23: Major Hazards Summary Traceability
  // ---------------------------------------------------------------------------------------
  assert(
    ctx1.structuredAnswers.majorHazardsAffectingRoute.includes('USNIC Iceberg A76A'),
    'Answers "Major hazards affecting route" using traceable hazard metrics'
  );

  // ---------------------------------------------------------------------------------------
  // Test 24: Data Acquisition VoI Context Traceability
  // ---------------------------------------------------------------------------------------
  assert(
    ctx1.structuredAnswers.satelliteDataThatCouldAffectDecision !== '',
    'Answers satellite VoI acquisition question with traceable context'
  );

  // ---------------------------------------------------------------------------------------
  // Test 25: Decision Reassessment Status Context Traceability
  // ---------------------------------------------------------------------------------------
  assert(
    ctx1.structuredAnswers.monitoringOrReassessmentRecommendation !== '',
    'Answers decision reassessment recommendation question with traceable context'
  );

  console.log('\n========================================================================================');
  console.log(`PHASE 16A AI NAVIGATION ASSISTANT CONTEXT ENGINE TEST SUMMARY: ${passedTests} PASSED, ${totalTests - passedTests} FAILED`);
  console.log('========================================================================================\n');
}

runNavigationAssistantContextTests();
