/**
 * CRYO NAV — Hazard Encounter Intelligence Engine Test Suite
 * Phase 8B Unit Verification
 *
 * Deterministic test suite verifying:
 * 1. Future iceberg position handling
 * 2. Route corridor interaction
 * 3. CPA calculation
 * 4. TCA calculation
 * 5. Temporal matching
 * 6. No-intersection case
 * 7. Potential encounter case
 * 8. Unavailable timing data (no fabricated timestamps)
 * 9. Uncertainty & confidence propagation
 * 10. Hazard classification
 */

import {
  evaluateAllRouteHazards,
  calculateCpaTca,
  classifyHazardSeverity,
  getVesselPositionAtTime,
  getIcebergPositionAtTime,
  calculateNearestRoutePoint,
  evaluateSeaIceRouteInteraction,
} from '../services/hazardEncounterEngine';
import { IcebergDetection, RouteAlternative, VesselProfile, SeaIceCell } from '../types';

// Deterministic Test Fixtures
const mockRoute: RouteAlternative = {
  id: 'safest',
  name: 'Ross Sea Approach Alpha',
  type: 'SAFE',
  color: '#10b981',
  waypoints: [
    [-64.0, 160.0],
    [-64.5, 161.0],
    [-65.0, 162.0],
  ],
  distanceNm: 75.0,
  etaHours: 6.25,
  fuelTons: 12.5,
  riskIndex: 22,
  uncertaintyScore: 15,
  confidence: 'HIGH',
  hazardsCount: 1,
  hazardSummary: [],
  assumptions: [],
  constraintsSatisfied: true,
  isRecommended: true,
  recommendationRationale: 'Safest route clear of fast ice.',
  resilienceScore: 92,
  costBreakdown: { distanceCost: 1, fuelCost: 1, timeCost: 1, riskCost: 1, uncertaintyCost: 1, totalCost: 5 },
};

const mockVessel: VesselProfile = {
  id: 'vessel-01',
  name: 'R/V Nathaniel B. Palmer',
  type: 'Research Icebreaker',
  iceClass: 'Polar Class 3 (Year-round in second-year ice)',
  cruisingSpeedKnots: 12.0,
  maxSpeedKnots: 15.0,
  fuelConsumptionTonsPerDay: 25,
  draftMeters: 8.5,
  maxSeaIceConcentrationPercent: 70,
  minVisibilityNm: 0.5,
  turningLimitationsDegPerMin: 15,
  hullLengthMeters: 94,
  beamMeters: 22,
};

const mockIcebergIntersecting: IcebergDetection = {
  id: 'BERG-INTERSECT-01',
  name: 'Tabular A-76a Fragment',
  lat: -64.0,
  lon: 160.0,
  sizeCategory: 'Large',
  estimatedLengthMeters: 450,
  estimatedWidthMeters: 220,
  freeboardMeters: 35,
  driftSpeedKnots: 1.2,
  driftHeadingDeg: 180,
  observationTime: '2026-09-27T00:00:00.000Z',
  processingTime: '2026-09-27T00:05:00.000Z',
  confidence: 90,
  uncertaintyRadiusNm: 0.8,
  source: 'Sentinel-1 SAR',
  isSynthetic: false,
  historicalTrack: [],
  predictedTrajectory: [
    { horizon: '+6h', hours: 6, lat: -64.5, lon: 161.0, uncertaintyRadiusNm: 1.0, timestamp: '2026-09-27T06:00:00.000Z', confidence: 88, forecastStatus: 'VALID' },
    { horizon: '+12h', hours: 12, lat: -65.0, lon: 162.0, uncertaintyRadiusNm: 1.2, timestamp: '2026-09-27T12:00:00.000Z', confidence: 85, forecastStatus: 'VALID' },
    { horizon: '+24h', hours: 24, lat: -65.5, lon: 163.0, uncertaintyRadiusNm: 1.6, timestamp: '2026-09-28T00:00:00.000Z', confidence: 80, forecastStatus: 'VALID' },
  ],
};

const mockIcebergFarAway: IcebergDetection = {
  id: 'BERG-FAR-01',
  name: 'Iceberg B-15z',
  lat: -60.0,
  lon: 170.0,
  sizeCategory: 'Medium',
  estimatedLengthMeters: 200,
  estimatedWidthMeters: 100,
  freeboardMeters: 20,
  driftSpeedKnots: 0.5,
  driftHeadingDeg: 90,
  observationTime: '2026-09-27T00:00:00.000Z',
  processingTime: '2026-09-27T00:05:00.000Z',
  confidence: 85,
  uncertaintyRadiusNm: 1.5,
  source: 'Optical MODIS',
  isSynthetic: false,
  historicalTrack: [],
  predictedTrajectory: [
    { horizon: '+6h', hours: 6, lat: -60.0, lon: 170.1, uncertaintyRadiusNm: 1.6, timestamp: '2026-09-27T06:00:00.000Z', confidence: 82, forecastStatus: 'VALID' },
    { horizon: '+12h', hours: 12, lat: -60.0, lon: 170.2, uncertaintyRadiusNm: 1.8, timestamp: '2026-09-27T12:00:00.000Z', confidence: 80, forecastStatus: 'VALID' },
  ],
};

const mockIcebergUnavailableTiming: IcebergDetection = {
  id: 'BERG-UNAVAIL-01',
  name: 'Sub-resolution Candidate C-01',
  lat: -64.1,
  lon: 160.2,
  sizeCategory: 'Small',
  estimatedLengthMeters: 80,
  estimatedWidthMeters: 40,
  freeboardMeters: 10,
  driftSpeedKnots: 0.0,
  driftHeadingDeg: 0,
  observationTime: '2026-09-27T00:00:00.000Z',
  processingTime: '2026-09-27T00:05:00.000Z',
  confidence: 60,
  uncertaintyRadiusNm: 2.5,
  source: 'Sentinel-1 SAR',
  isSynthetic: true,
  historicalTrack: [],
  predictedTrajectory: [],
  forecastResult: {
    forecastId: 'FCST-UNAVAIL-1',
    icebergId: 'BERG-UNAVAIL-01',
    icebergName: 'Sub-resolution Candidate C-01',
    initialPosition: { lat: -64.1, lon: 160.2, timestamp: '2026-09-27T00:00:00.000Z' },
    analysisTime: '2026-09-27T00:00:00.000Z',
    forecastHorizonHours: 72,
    trajectoryPoints: [],
    status: 'UNAVAILABLE',
    statusReason: 'Copernicus current vectors missing.',
    metadata: {
      name: 'Baseline Model',
      version: '1.0',
      type: '2D Physical Kinematic',
      label: 'REAL-DATA DRIVEN',
      validationStatus: 'UNVALIDATED',
      windageCoefficient: 0.025,
      windageCoefficientUsed: 0.025,
      windageClassification: 'MODEL ASSUMPTION',
      oceanForcingType: 'Copernicus',
      windForcingType: 'ECMWF',
      uncertaintyType: 'MODEL-DERIVED',
      formula: 'V_berg',
      disclaimer: 'Demo disclaimer',
    },
    inputs: {
      icebergSource: null,
      oceanSource: null,
      weatherSource: null,
      alignmentQuality: 'UNAVAILABLE',
      alignmentStatus: 'UNAVAILABLE',
    },
    warnings: ['Current vectors missing'],
  },
};

export function runHazardEncounterTests(): { success: boolean; passed: number; failed: number; log: string[] } {
  const log: string[] = [];
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail: string = '') {
    if (condition) {
      passed++;
      log.push(`  [PASS] ${testName}${detail ? ` - ${detail}` : ''}`);
    } else {
      failed++;
      log.push(`  [FAIL] ${testName}${detail ? ` - ${detail}` : ''}`);
    }
  }

  log.push('========== PHASE 8B HAZARD / ENCOUNTER INTELLIGENCE TESTS ==========');

  // Test 1: Future Iceberg Position Handling
  try {
    const posAt0h = getIcebergPositionAtTime(mockIcebergIntersecting.lat, mockIcebergIntersecting.lon, mockIcebergIntersecting.predictedTrajectory, 0);
    const posAt6h = getIcebergPositionAtTime(mockIcebergIntersecting.lat, mockIcebergIntersecting.lon, mockIcebergIntersecting.predictedTrajectory, 6);
    assert(posAt0h !== null && posAt0h.lat === -64.0, 'Test 1.1: Initial position at t=0h', `lat=${posAt0h?.lat}`);
    assert(posAt6h !== null && posAt6h.lat === -64.5, 'Test 1.2: Interpolated position at t=6h', `lat=${posAt6h?.lat}`);
  } catch (e: any) {
    assert(false, 'Test 1: Future Iceberg Position Exception', e.message);
  }

  // Test 2: Route Corridor Interaction & Nearest Route Point
  try {
    const match = calculateNearestRoutePoint(-64.0, 160.0, mockRoute.waypoints);
    assert(match.distanceNm < 0.1, 'Test 2.1: Nearest route point matching for exact waypoint', `dist=${match.distanceNm} nm`);
  } catch (e: any) {
    assert(false, 'Test 2: Route Corridor Interaction Exception', e.message);
  }

  // Test 3: CPA (Closest Point of Approach) Calculation
  try {
    const cpaResult = calculateCpaTca(mockIcebergIntersecting, mockRoute.waypoints, { cruisingSpeedKnots: 12.0 });
    assert(cpaResult.cpaNm !== null && cpaResult.cpaNm < 1.0, 'Test 3.1: CPA calculation returns valid approach distance', `CPA=${cpaResult.cpaNm} nm`);
  } catch (e: any) {
    assert(false, 'Test 3: CPA Calculation Exception', e.message);
  }

  // Test 4: TCA (Time of Closest Approach) Calculation
  try {
    const cpaResult = calculateCpaTca(mockIcebergIntersecting, mockRoute.waypoints, { cruisingSpeedKnots: 12.0 });
    assert(cpaResult.tcaHours !== null && cpaResult.tcaHours >= 0, 'Test 4.1: TCA calculation returns positive hours', `TCA=+${cpaResult.tcaHours}h`);
    assert(cpaResult.tcaTimestamp !== null, 'Test 4.2: TCA ISO timestamp generated');
  } catch (e: any) {
    assert(false, 'Test 4: TCA Calculation Exception', e.message);
  }

  // Test 5: Temporal Matching (Vessel & Iceberg Position at t)
  try {
    const vPosAt0 = getVesselPositionAtTime(mockRoute.waypoints, 0, 12.0);
    assert(vPosAt0 !== null && vPosAt0.lat === -64.0, 'Test 5.1: Vessel position at t=0h', `lat=${vPosAt0?.lat}`);
  } catch (e: any) {
    assert(false, 'Test 5: Temporal Matching Exception', e.message);
  }

  // Test 6: No-Intersection Case
  try {
    const cpaFar = calculateCpaTca(mockIcebergFarAway, mockRoute.waypoints, { cruisingSpeedKnots: 12.0 });
    const severityFar = classifyHazardSeverity(cpaFar.cpaNm, cpaFar.tcaHours, cpaFar.minRouteDistanceNm);
    assert(severityFar.severity === 'NONE', 'Test 6.1: Far away iceberg classified as NONE severity', `Severity=${severityFar.severity}`);
    assert(severityFar.status === 'NO_INTERSECTION', 'Test 6.2: Status is NO_INTERSECTION');
  } catch (e: any) {
    assert(false, 'Test 6: No-Intersection Case Exception', e.message);
  }

  // Test 7: Potential Encounter Case
  try {
    const cpaIntersect = calculateCpaTca(mockIcebergIntersecting, mockRoute.waypoints, { cruisingSpeedKnots: 12.0 });
    const severityIntersect = classifyHazardSeverity(cpaIntersect.cpaNm, cpaIntersect.tcaHours, cpaIntersect.minRouteDistanceNm);
    assert(severityIntersect.severity === 'CRITICAL' || severityIntersect.severity === 'HIGH', 'Test 7.1: Intersecting iceberg classified as CRITICAL/HIGH', `Severity=${severityIntersect.severity}`);
  } catch (e: any) {
    assert(false, 'Test 7: Potential Encounter Case Exception', e.message);
  }

  // Test 8: Unavailable Timing Data (No Fabricated Timestamps)
  try {
    const cpaUnavail = calculateCpaTca(mockIcebergUnavailableTiming, mockRoute.waypoints, { cruisingSpeedKnots: 12.0 });
    assert(cpaUnavail.cpaNm === null, 'Test 8.1: Unavailable timing returns CPA = null', `CPA=${cpaUnavail.cpaNm}`);
    assert(cpaUnavail.tcaHours === null, 'Test 8.2: Unavailable timing returns TCA = null', `TCA=${cpaUnavail.tcaHours}`);
    assert(cpaUnavail.tcaTimestamp === null, 'Test 8.3: No fake timestamp generated when timing unavailable');
    assert(cpaUnavail.explanation.includes('UNAVAILABLE'), 'Test 8.4: Explanation explicitly states UNAVAILABLE');
  } catch (e: any) {
    assert(false, 'Test 8: Unavailable Timing Data Exception', e.message);
  }

  // Test 9: Uncertainty / Confidence Propagation
  try {
    const result = evaluateAllRouteHazards(mockRoute, [mockIcebergIntersecting], [], mockVessel);
    assert(result.encounters.length === 1, 'Test 9.1: Encounter evaluated for iceberg');
    assert(result.encounters[0].uncertaintyRadiusNm === 0.8, 'Test 9.2: Uncertainty radius preserved', `±${result.encounters[0].uncertaintyRadiusNm} nm`);
    assert(result.encounters[0].confidence === 90, 'Test 9.3: Confidence percentage preserved', `${result.encounters[0].confidence}%`);
  } catch (e: any) {
    assert(false, 'Test 9: Uncertainty / Confidence Propagation Exception', e.message);
  }

  // Test 10: Master Hazard Evaluation & Classification
  try {
    const result = evaluateAllRouteHazards(mockRoute, [mockIcebergIntersecting, mockIcebergFarAway, mockIcebergUnavailableTiming], [], mockVessel);
    assert(result.totalHazardsEvaluated === 3, 'Test 10.1: All 3 hazards evaluated');
    assert(result.activeEncountersCount >= 1, 'Test 10.2: Active encounters detected');
    assert(result.highestSeverity === 'CRITICAL' || result.highestSeverity === 'HIGH', 'Test 10.3: Highest severity identified correctly', `Highest=${result.highestSeverity}`);
  } catch (e: any) {
    assert(false, 'Test 10: Master Hazard Evaluation Exception', e.message);
  }

  const success = failed === 0;
  log.forEach(l => console.log(l));
  console.log(`\nPhase 8B Hazard Encounter Intelligence Test Summary: ${passed} Passed, ${failed} Failed.`);
  return { success, passed, failed, log };
}
