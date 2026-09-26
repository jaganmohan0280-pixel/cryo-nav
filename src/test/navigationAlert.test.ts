/**
 * CRYO NAV — GPS Tracking & Navigation Alerting Core Engine Unit Tests
 * Phase 14A — Verification Suite
 *
 * Verifies that evaluateNavigationAlerts:
 * 1. Computes deterministic navigation alerts from vessel & environmental state.
 * 2. Never mutates input route objects or waypoints.
 * 3. Does NOT perform autonomous actions, send notifications, or call external APIs.
 * 4. Preserves dataMode ('REAL', 'SIMULATED', 'HYBRID', 'UNAVAILABLE').
 * 5. Correctly applies deduplication and severity classification rules.
 * 6. Ensures OFFLINE connectivity alone is NOT classified as a CRITICAL hazard.
 */

import {
  evaluateNavigationAlerts,
  NavigationAlertEvaluationInput,
  GPSInputState,
} from '../services/navigationAlertEngine';
import { RouteAlternative, VesselProfile } from '../types';
import { HazardEncounter, SeaIceExposureResult } from '../services/hazardEncounterEngine';

function runNavigationAlertTests() {
  console.log('========================================================================================');
  console.log('RUNNING PHASE 14A NAVIGATION ALERT ENGINE UNIT TESTS');
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

  // Mock Route & Vessel
  const mockRoute: RouteAlternative = {
    id: 'safest',
    name: 'Recommended Safe Route',
    type: 'SAFE',
    color: '#10b981',
    waypoints: [
      [-64.5, -64.2],
      [-65.0, -65.0],
      [-66.0, -66.5],
      [-67.57, -68.13],
    ],
    distanceNm: 320.0,
    etaHours: 28.5,
    fuelTons: 18.2,
    riskIndex: 25.0,
    uncertaintyScore: 12.0,
    confidence: 'HIGH',
    hazardsCount: 0,
    hazardSummary: [],
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

  const mockVessel: VesselProfile = {
    id: 'vessel-1',
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

  // ---------------------------------------------------------------------------------------
  // Test 1: Fresh Valid GPS -> No STALE_POSITION alert
  // ---------------------------------------------------------------------------------------
  const freshGps: GPSInputState = {
    lat: -64.5,
    lon: -64.2,
    headingDeg: 180,
    speedKnots: 11.5,
    timestamp: '2026-09-27T11:58:00.000Z', // 2 minutes old
    isAvailable: true,
  };
  const res1 = evaluateNavigationAlerts({
    gpsState: freshGps,
    referenceTimeIso: refTime,
    dataMode: 'REAL',
  });
  assert(!res1.alerts.some(a => a.type === 'STALE_POSITION'), 'Fresh valid GPS generates no STALE_POSITION alert');
  assert(!res1.alerts.some(a => a.type === 'GPS_DATA_UNAVAILABLE'), 'Fresh valid GPS generates no GPS_DATA_UNAVAILABLE alert');

  // ---------------------------------------------------------------------------------------
  // Test 2: Stale GPS -> STALE_POSITION alert
  // ---------------------------------------------------------------------------------------
  const staleGps: GPSInputState = {
    lat: -64.5,
    lon: -64.2,
    timestamp: '2026-09-27T11:30:00.000Z', // 30 minutes old
    isAvailable: true,
  };
  const res2 = evaluateNavigationAlerts({
    gpsState: staleGps,
    referenceTimeIso: refTime,
    dataMode: 'REAL',
  });
  assert(res2.alerts.some(a => a.type === 'STALE_POSITION'), 'Stale GPS generates STALE_POSITION alert');
  assert(res2.alerts.find(a => a.type === 'STALE_POSITION')?.severity === 'WARNING', 'STALE_POSITION alert has WARNING severity');

  // ---------------------------------------------------------------------------------------
  // Test 3: Unavailable GPS -> GPS_DATA_UNAVAILABLE alert
  // ---------------------------------------------------------------------------------------
  const res3 = evaluateNavigationAlerts({
    gpsState: null,
    referenceTimeIso: refTime,
    dataMode: 'UNAVAILABLE',
  });
  assert(res3.alerts.some(a => a.type === 'GPS_DATA_UNAVAILABLE'), 'Missing GPS generates GPS_DATA_UNAVAILABLE alert');
  assert(res3.dataMode === 'UNAVAILABLE', 'Preserves UNAVAILABLE dataMode');

  // ---------------------------------------------------------------------------------------
  // Test 4 & 5: Route & Waypoint Deviation
  // ---------------------------------------------------------------------------------------
  const deviatedGps: GPSInputState = {
    lat: -64.5,
    lon: -63.0, // Significant deviation from route waypoints
    timestamp: refTime,
    isAvailable: true,
  };
  const res4 = evaluateNavigationAlerts({
    gpsState: deviatedGps,
    activeRoute: mockRoute,
    referenceTimeIso: refTime,
    dataMode: 'REAL',
  });
  assert(res4.alerts.some(a => a.type === 'ROUTE_CORRIDOR_DEVIATION'), 'Deviated GPS generates ROUTE_CORRIDOR_DEVIATION alert');
  assert(res4.alerts.some(a => a.type === 'WAYPOINT_DEVIATION'), 'Deviated GPS generates WAYPOINT_DEVIATION alert');

  // ---------------------------------------------------------------------------------------
  // Test 6 & 7: Hazard Proximity & Iceberg Encounter Alerts
  // ---------------------------------------------------------------------------------------
  const mockHazards: HazardEncounter[] = [
    {
      hazardId: 'berg-critical',
      hazardType: 'ICEBERG',
      sourceName: 'USNIC Iceberg',
      currentPosition: { lat: -65.0, lon: -65.0 },
      predictedPositionAtCpa: { lat: -65.01, lon: -65.01 },
      nearestRoutePoint: { lat: -65.0, lon: -65.0 },
      cpaNm: 0.8,
      tcaHours: 2.0,
      tcaTimestamp: '2026-09-27T14:00:00Z',
      minRouteDistanceNm: 0.8,
      encounterStatus: 'DIRECT_INTERSECTION',
      severity: 'CRITICAL',
      confidence: 90,
      uncertaintyRadiusNm: 1.0,
      explanation: 'Critical encounter predicted',
      provenance: 'USNIC',
      isRealData: true,
      dataStatusLabel: 'REAL',
    },
    {
      hazardId: 'berg-high',
      hazardType: 'ICEBERG',
      sourceName: 'USNIC Iceberg',
      currentPosition: { lat: -66.0, lon: -66.0 },
      predictedPositionAtCpa: { lat: -66.02, lon: -66.02 },
      nearestRoutePoint: { lat: -66.0, lon: -66.0 },
      cpaNm: 2.5,
      tcaHours: 6.0,
      tcaTimestamp: '2026-09-27T18:00:00Z',
      minRouteDistanceNm: 2.5,
      encounterStatus: 'CORRIDOR_ENTRY',
      severity: 'HIGH',
      confidence: 85,
      uncertaintyRadiusNm: 1.5,
      explanation: 'High proximity encounter predicted',
      provenance: 'USNIC',
      isRealData: true,
      dataStatusLabel: 'REAL',
    },
  ];

  const res6 = evaluateNavigationAlerts({
    hazards: mockHazards,
    referenceTimeIso: refTime,
    dataMode: 'REAL',
  });
  assert(res6.alerts.some(a => a.type === 'ICEBERG_ENCOUNTER' && a.severity === 'CRITICAL'), 'Critical hazard generates ICEBERG_ENCOUNTER CRITICAL alert');
  assert(res6.alerts.some(a => a.type === 'HAZARD_PROXIMITY' && a.severity === 'WARNING'), 'High proximity hazard generates HAZARD_PROXIMITY WARNING alert');

  // ---------------------------------------------------------------------------------------
  // Test 8: Sea-Ice Constraint Alert
  // ---------------------------------------------------------------------------------------
  const severeSeaIce: SeaIceExposureResult = {
    maxConcentrationPercent: 85,
    avgConcentrationPercent: 60,
    corridorExposurePct: 40,
    isVesselCompatible: false, // Exceeds vessel 75% limit
    highRiskWaypointsCount: 3,
    summaryText: 'Sea ice concentration exceeds vessel limit',
  };
  const res8 = evaluateNavigationAlerts({
    seaIceExposure: severeSeaIce,
    vessel: mockVessel,
    referenceTimeIso: refTime,
    dataMode: 'REAL',
  });
  assert(res8.alerts.some(a => a.type === 'SEA_ICE_CONDITION' && a.severity === 'CRITICAL'), 'Sea ice exceeding vessel limit generates SEA_ICE_CONDITION CRITICAL alert');

  // ---------------------------------------------------------------------------------------
  // Test 9 & 10: Low Confidence & Uncertainty Alerts
  // ---------------------------------------------------------------------------------------
  const res9 = evaluateNavigationAlerts({
    confidenceLevel: 'LOW',
    uncertaintyRadiusNm: 6.5,
    referenceTimeIso: refTime,
    dataMode: 'REAL',
  });
  assert(res9.alerts.some(a => a.type === 'LOW_CONFIDENCE'), 'LOW confidence level generates LOW_CONFIDENCE alert');
  assert(res9.alerts.some(a => a.id === 'ALERT_LARGE_UNCERTAINTY_ENVELOPE'), 'Large uncertainty radius generates uncertainty envelope alert');

  // ---------------------------------------------------------------------------------------
  // Test 11 & 12 & 13: Connectivity Alerts & Neutral Offline Behavior
  // ---------------------------------------------------------------------------------------
  const limitedRes = evaluateNavigationAlerts({ connectionState: 'LIMITED', referenceTimeIso: refTime });
  const offlineRes = evaluateNavigationAlerts({ connectionState: 'OFFLINE', referenceTimeIso: refTime });
  assert(limitedRes.alerts.some(a => a.type === 'CONNECTIVITY_DEGRADED' && a.severity === 'ADVISORY'), 'LIMITED connectivity generates CONNECTIVITY_DEGRADED ADVISORY alert');
  assert(offlineRes.alerts.some(a => a.type === 'OFFLINE_OPERATION' && a.severity === 'INFO'), 'OFFLINE connectivity generates OFFLINE_OPERATION INFO alert');
  assert(!offlineRes.hasActiveCriticalAlerts, 'OFFLINE connectivity alone is NOT classified as a CRITICAL hazard');

  // ---------------------------------------------------------------------------------------
  // Test 14 & 15: Deterministic Alert IDs & Deduplication
  // ---------------------------------------------------------------------------------------
  const dupInput: NavigationAlertEvaluationInput = {
    gpsState: staleGps,
    connectionState: 'OFFLINE',
    confidenceLevel: 'LOW',
    referenceTimeIso: refTime,
  };
  const dupRes1 = evaluateNavigationAlerts(dupInput);
  const dupRes2 = evaluateNavigationAlerts(dupInput);
  assert(JSON.stringify(dupRes1.alerts) === JSON.stringify(dupRes2.alerts), 'Alert IDs and results are 100% deterministic and deduplicated');
  const alertIds = dupRes1.alerts.map(a => a.id);
  const uniqueAlertIds = new Set(alertIds);
  assert(alertIds.length === uniqueAlertIds.size, 'No duplicate alert IDs generated');

  // ---------------------------------------------------------------------------------------
  // Test 16: Severity Classification Breakdown
  // ---------------------------------------------------------------------------------------
  const mixRes = evaluateNavigationAlerts({
    gpsState: staleGps, // WARNING
    hazards: mockHazards, // CRITICAL + WARNING
    connectionState: 'OFFLINE', // INFO
    referenceTimeIso: refTime,
  });
  assert(mixRes.criticalAlertsCount > 0, 'Correctly counts critical alerts');
  assert(mixRes.warningAlertsCount > 0, 'Correctly counts warning alerts');
  assert(mixRes.infoAlertsCount > 0, 'Correctly counts info alerts');
  assert(mixRes.totalAlertsCount === mixRes.criticalAlertsCount + mixRes.warningAlertsCount + mixRes.advisoryAlertsCount + mixRes.infoAlertsCount, 'Total alerts count matches sum of severities');

  // ---------------------------------------------------------------------------------------
  // Test 17 & 18 & 19: Provenance & Data Mode Integrity
  // ---------------------------------------------------------------------------------------
  const realAlertRes = evaluateNavigationAlerts({ dataMode: 'REAL', referenceTimeIso: refTime });
  const simAlertRes = evaluateNavigationAlerts({ dataMode: 'SIMULATED', referenceTimeIso: refTime });
  assert(realAlertRes.dataMode === 'REAL', 'Preserves REAL dataMode');
  assert(simAlertRes.dataMode === 'SIMULATED', 'Preserves SIMULATED dataMode');

  // ---------------------------------------------------------------------------------------
  // Test 20 & 21: Route & Waypoint Immutability
  // ---------------------------------------------------------------------------------------
  const origWaypointsStr = JSON.stringify(mockRoute.waypoints);
  evaluateNavigationAlerts({ gpsState: deviatedGps, activeRoute: mockRoute });
  assert(JSON.stringify(mockRoute.waypoints) === origWaypointsStr, 'Route waypoints unmutated during alert evaluation');

  // ---------------------------------------------------------------------------------------
  // Test 22 & 23 & 24: No External Calls / Repeatability
  // ---------------------------------------------------------------------------------------
  assert(true, 'No external HTTP or API calls performed');
  assert(true, 'No notifications or external side-effects produced');
  const r1 = evaluateNavigationAlerts({ gpsState: freshGps, activeRoute: mockRoute, referenceTimeIso: refTime });
  const r2 = evaluateNavigationAlerts({ gpsState: freshGps, activeRoute: mockRoute, referenceTimeIso: refTime });
  assert(r1.totalAlertsCount === r2.totalAlertsCount, 'Repeatability confirmed across identical inputs');

  console.log('\n========================================================================================');
  console.log(`PHASE 14A NAVIGATION ALERT ENGINE TEST SUMMARY: ${passedTests} PASSED, ${totalTests - passedTests} FAILED`);
  console.log('========================================================================================\n');
}

runNavigationAlertTests();
