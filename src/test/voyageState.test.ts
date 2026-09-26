/**
 * CRYO NAV — Phase 8A Voyage State Monitoring Unit Test Suite
 *
 * Tests the creation, calculation, waypoint tracking, ETA estimation,
 * connectivity, freshness, and confidence propagation of the Voyage State Engine.
 */

import {
  haversineDistanceNm,
  resolveRouteWaypoints,
  calculateEta,
  determineNavigationStatus,
  determineDataMode,
  buildVoyageState,
  VoyageState,
} from '../services/voyageStateEngine';
import { INITIAL_VESSELS, DEFAULT_MISSION } from '../data/syntheticAntarcticData';
import { RouteAlternative, GPSTrackingState } from '../types';

const MOCK_VESSEL = INITIAL_VESSELS[0];
const MOCK_MISSION = DEFAULT_MISSION;

const MOCK_ROUTE: RouteAlternative = {
  id: 'balanced',
  name: 'BALANCED Corridor',
  type: 'BALANCED',
  color: '#10b981',
  waypoints: [
    [-60.0, -65.0],
    [-62.5, -66.0],
    [-65.0, -67.0],
    [-67.57, -68.13],
  ],
  distanceNm: 480,
  etaHours: 40.0,
  fuelTons: 41.6,
  riskIndex: 12.5,
  uncertaintyScore: 15,
  confidence: 'HIGH',
  hazardsCount: 0,
  hazardSummary: [],
  assumptions: [],
  constraintsSatisfied: true,
  isRecommended: true,
  recommendationRationale: 'Avoids heavy multi-year pack ice',
  resilienceScore: 90,
  costBreakdown: {
    distanceCost: 480,
    riskCost: 12.5,
    fuelCost: 41.6,
    timeCost: 40.0,
    uncertaintyCost: 0,
    totalCost: 574.1,
  },
};

const MOCK_GPS: GPSTrackingState = {
  currentLat: -62.5,
  currentLon: -66.0,
  headingDeg: 195,
  speedKnots: 12.0,
  routeProgressPct: 33.3,
  actualTrack: [[-60.0, -65.0], [-62.5, -66.0]],
  distanceTraveledNm: 160,
  distanceRemainingNm: 320,
  crossTrackErrorNm: 0.2,
  isSimulating: true,
  simulationSpeedMultiplier: 10,
};

export function runVoyageStateTests(): void {
  console.log('\n===================================================================');
  console.log('RUNNING PHASE 8A VOYAGE STATE MONITORING UNIT TEST SUITE');
  console.log('===================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, description: string) {
    if (condition) {
      console.log(`  ✓ PASSED: ${description}`);
      passed++;
    } else {
      console.error(`  ✕ FAILED: ${description}`);
      failed++;
    }
  }

  // 1. Voyage State Creation
  const state: VoyageState = buildVoyageState({
    selectedVessel: MOCK_VESSEL,
    mission: MOCK_MISSION,
    activeRoute: MOCK_ROUTE,
    gpsTracking: MOCK_GPS,
    connectivityState: 'ONLINE',
    environmentalMode: 'DEMO',
    referenceTimestampIso: '2026-09-27T10:00:00Z',
  });

  assert(state !== null && typeof state === 'object', '1. Voyage state object is created successfully');
  assert(state.vesselId === MOCK_VESSEL.id && state.vesselName === MOCK_VESSEL.name, '1b. Vessel metadata matches selected vessel profile');

  // 2. Current Waypoint Detection
  const { currentWaypoint, nextWaypoint } = resolveRouteWaypoints(
    MOCK_ROUTE.waypoints,
    -62.5,
    -66.0,
    33.3
  );
  assert(currentWaypoint !== null && currentWaypoint.index === 1, '2. Current waypoint index is correctly identified along route');

  // 3. Next Waypoint Detection
  assert(nextWaypoint !== null && nextWaypoint.index === 2 && nextWaypoint.name === 'Waypoint 2', '3. Next waypoint index and target name are correctly resolved');

  // 4. Route Progress Calculation
  assert(state.progressPercent === 33.3, '4. Route progress percentage is correctly captured');
  assert(state.distanceTravelledNm === 159.8, '4b. Distance traveled in nm is accurately computed from progress fraction');

  // 5. Remaining Distance Calculation
  assert(state.remainingDistanceNm === 320.2, '5. Remaining distance in nm is accurately computed from total route length');

  // 6. ETA Calculation
  const eta = calculateEta(320, 12.0, '2026-09-27T10:00:00Z');
  assert(eta.estimatedTimeRemainingHours === 26.7, '6. Remaining transit hours estimated accurately (320nm / 12kts = 26.7 hrs)');
  assert(eta.estimatedArrivalTime !== null && eta.estimatedArrivalTime.includes('2026-09-28'), '6b. ISO arrival timestamp is projected correctly into the future');

  // 7. Connectivity Propagation
  const offlineState = buildVoyageState({
    selectedVessel: MOCK_VESSEL,
    mission: MOCK_MISSION,
    activeRoute: MOCK_ROUTE,
    gpsTracking: MOCK_GPS,
    connectivityState: 'OFFLINE',
  });
  assert(offlineState.connectivityState === 'OFFLINE', '7. Connectivity state is correctly propagated into voyage state snapshot');

  // 8. Freshness Propagation
  const realState = buildVoyageState({
    selectedVessel: MOCK_VESSEL,
    mission: MOCK_MISSION,
    activeRoute: MOCK_ROUTE,
    gpsTracking: MOCK_GPS,
    environmentalMode: 'REAL',
    unifiedEnvironment: {
      alignmentStatus: 'ALIGNED',
      analysisTime: '2026-09-27T09:30:00Z',
    } as any,
  });
  assert(realState.environmentalDataFreshness === 'ALIGNED', '8. Environmental data freshness is correctly propagated');

  // 9. Confidence Propagation
  const confidenceState = buildVoyageState({
    selectedVessel: MOCK_VESSEL,
    mission: MOCK_MISSION,
    activeRoute: MOCK_ROUTE,
    gpsTracking: MOCK_GPS,
    decisionConfidence: {
      overallLevel: 'HIGH',
      confidenceScore: 92,
      factors: [],
      primaryLimitingFactor: 'None',
      warnings: [],
      limitations: [],
      requiredActions: [],
      recommendedVerificationActions: [],
      routeDecisionAllowed: true,
      isRecommendationBlocked: false,
      timestamp: '2026-09-27T10:00:00Z',
      provenance: 'TEST',
    },
  });
  assert(confidenceState.confidenceLevel === 'HIGH', '9. Legitimate decision confidence level is correctly propagated');

  // 10. Unavailable Data Handling
  const emptyState = buildVoyageState({
    selectedVessel: MOCK_VESSEL,
    mission: MOCK_MISSION,
    activeRoute: null,
    gpsTracking: { ...MOCK_GPS, speedKnots: 0, routeProgressPct: 0 },
  });
  assert(emptyState.estimatedTimeRemainingHours === null, '10. ETA handles zero speed gracefully without returning NaN or Infinity');
  assert(emptyState.currentRouteName !== null, '10b. Missing active route falls back to default corridor without crashing');

  console.log(`\nPhase 8A Voyage State Monitoring Test Summary: ${passed} Passed, ${failed} Failed.`);
  if (failed > 0) {
    throw new Error(`Phase 8A Voyage State Monitoring tests failed: ${failed} failures.`);
  }
}
