/**
 * CRYO NAV — Decision Confidence Engine Verification Test Suite
 * Phase 4 Test Suite — Deterministic Verification of Decision Confidence Levels,
 * Routing Impacts, and Verification Loops.
 */

import { evaluateDecisionConfidence } from '../services/confidenceEngine';
import { generateRouteAlternatives } from '../services/routingEngine';
import { buildUnifiedEnvironmentalState } from '../data/environmentalState';
import {
  INITIAL_VESSELS,
  DEFAULT_MISSION,
  INITIAL_ICEBERGS,
  SYNTHETIC_WEATHER,
  SYNTHETIC_OCEAN_CURRENTS,
  generateSyntheticSeaIce,
} from '../data/syntheticAntarcticData';
import { EnvironmentalDataMode, DataProvenance, SeaIceCell, WeatherCondition } from '../types';

function runTests() {
  console.log('=====================================================');
  console.log('CRYO NAV — PHASE 4 DECISION CONFIDENCE ENGINE TESTS');
  console.log('=====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, description: string) {
    if (condition) {
      console.log(`[PASS] ${description}`);
      passed++;
    } else {
      console.error(`[FAIL] ${description}`);
      failed++;
    }
  }

  const defaultVessel = INITIAL_VESSELS[0];
  const defaultMission = DEFAULT_MISSION;
  const demoSeaIce = generateSyntheticSeaIce();
  const demoIcebergs = INITIAL_ICEBERGS;
  const demoWeather = SYNTHETIC_WEATHER;
  const demoOcean = SYNTHETIC_OCEAN_CURRENTS;

  const analysisTime = DEFAULT_MISSION.departureTime;

  // ----------------------------------------------------
  // TEST 1: Good data -> HIGH Confidence
  // ----------------------------------------------------
  const freshIcebergs = demoIcebergs.map((b) => ({
    ...b,
    uncertaintyRadiusNm: 2.5,
    predictedTrajectory: b.predictedTrajectory?.map((pt) => ({ ...pt, uncertaintyRadiusNm: 2.5 })) || [],
  }));

  const freshUnified = buildUnifiedEnvironmentalState({
    mode: 'DEMO',
    analysisTime,
    seaIce: { cells: demoSeaIce, provenance: null, error: null },
    ocean: { cells: demoOcean, provenance: null, error: null },
    icebergs: { list: freshIcebergs, provenance: null, error: null },
    weather: { current: demoWeather, grid: [], provenance: null, error: null },
  });

  const highConf = evaluateDecisionConfidence({
    unifiedEnvironment: freshUnified,
    seaIceCells: demoSeaIce,
    icebergs: freshIcebergs,
    weather: demoWeather,
    currents: demoOcean,
    forecastHorizonHours: 0,
    mode: 'DEMO',
  });

  assert(highConf.overallLevel === 'HIGH', 'Test 1: Good data produces HIGH confidence level.');
  assert(highConf.confidenceScore >= 80, `Test 1: HIGH confidence score heuristic is >= 80 (Actual: ${highConf.confidenceScore}).`);
  assert(highConf.routeDecisionAllowed === true, 'Test 1: Route decision allowed under HIGH confidence.');

  // ----------------------------------------------------
  // TEST 2: Aging data -> MEDIUM Confidence
  // ----------------------------------------------------
  const agingUnified = {
    ...freshUnified,
    sources: {
      ...freshUnified.sources,
      seaIce: {
        ...freshUnified.sources.seaIce,
        timeDiffHours: 18.0,
        temporalStatus: 'AGING' as const,
      },
    },
  };

  const mediumConf = evaluateDecisionConfidence({
    unifiedEnvironment: agingUnified,
    seaIceCells: demoSeaIce,
    icebergs: demoIcebergs,
    weather: demoWeather,
    currents: demoOcean,
    forecastHorizonHours: 24,
    mode: 'DEMO',
  });

  assert(mediumConf.overallLevel === 'MEDIUM', `Test 2: Aging data (18h offset) produces MEDIUM confidence level (Actual: ${mediumConf.overallLevel}).`);
  assert(mediumConf.confidenceScore >= 60 && mediumConf.confidenceScore < 85, 'Test 2: MEDIUM confidence score is in 60-84 heuristic range.');

  // ----------------------------------------------------
  // TEST 3: Significant uncertainty -> LOW Confidence
  // ----------------------------------------------------
  const uncertainIcebergs = demoIcebergs.map((b) => ({
    ...b,
    uncertaintyRadiusNm: 12.0,
    predictedTrajectory: b.predictedTrajectory.map((p) => ({ ...p, uncertaintyRadiusNm: 12.0 })),
  }));

  const lowConf = evaluateDecisionConfidence({
    unifiedEnvironment: freshUnified,
    seaIceCells: demoSeaIce,
    icebergs: uncertainIcebergs,
    weather: demoWeather,
    currents: demoOcean,
    forecastHorizonHours: 48,
    mode: 'DEMO',
  });

  assert(lowConf.overallLevel === 'LOW', `Test 3: Significant drift uncertainty (±12 nm) produces LOW confidence level (Actual: ${lowConf.overallLevel}).`);
  assert(lowConf.primaryLimitingFactor.includes('Trajectory') || lowConf.primaryLimitingFactor.includes('Iceberg'), 'Test 3: Dominant limiting factor correctly identifies iceberg trajectory uncertainty.');

  // ----------------------------------------------------
  // TEST 4: Required source unavailable -> CRITICAL Confidence
  // ----------------------------------------------------
  const missingUnified = buildUnifiedEnvironmentalState({
    mode: 'REAL',
    seaIce: { cells: [], provenance: null, error: 'Copernicus sea ice API unreachable' },
    ocean: { cells: [], provenance: null, error: 'Copernicus ocean current timeout' },
    icebergs: { list: [], provenance: null, error: null },
    weather: { current: null, grid: [], provenance: null, error: null },
  });

  const criticalConf = evaluateDecisionConfidence({
    unifiedEnvironment: missingUnified,
    seaIceCells: [],
    icebergs: [],
    weather: demoWeather,
    currents: [],
    forecastHorizonHours: 0,
    mode: 'REAL',
  });

  assert(criticalConf.overallLevel === 'CRITICAL', `Test 4: Missing required real environmental source produces CRITICAL confidence level (Actual: ${criticalConf.overallLevel}).`);
  assert(criticalConf.isRecommendationBlocked === true, 'Test 4: CRITICAL confidence explicitly sets isRecommendationBlocked = true.');

  // ----------------------------------------------------
  // TEST 5: Partial spatial coverage -> Degraded confidence
  // ----------------------------------------------------
  const partialUnified = {
    ...freshUnified,
    sources: {
      ...freshUnified.sources,
      ocean: {
        ...freshUnified.sources.ocean,
        coverage: 'PARTIAL' as const,
      },
    },
  };

  const partialConf = evaluateDecisionConfidence({
    unifiedEnvironment: partialUnified,
    seaIceCells: demoSeaIce,
    icebergs: demoIcebergs,
    weather: demoWeather,
    currents: demoOcean,
    forecastHorizonHours: 0,
    mode: 'DEMO',
  });

  assert(partialConf.confidenceScore < highConf.confidenceScore, 'Test 5: Partial spatial coverage degrades numerical confidence score.');

  // ----------------------------------------------------
  // TEST 6: Long forecast horizon -> Reduced confidence
  // ----------------------------------------------------
  const longHorizonConf = evaluateDecisionConfidence({
    unifiedEnvironment: freshUnified,
    seaIceCells: demoSeaIce,
    icebergs: demoIcebergs,
    weather: demoWeather,
    currents: demoOcean,
    forecastHorizonHours: 72,
    mode: 'DEMO',
  });

  assert(longHorizonConf.confidenceScore < highConf.confidenceScore, 'Test 6: Extended forecast horizon (+72h) reduces confidence relative to nowcast (+0h).');

  // ----------------------------------------------------
  // TEST 7: LOW confidence -> Conservative route behavior & Uncertainty Penalty
  // ----------------------------------------------------
  const lowConfRoutes = generateRouteAlternatives(
    defaultMission,
    defaultVessel,
    uncertainIcebergs,
    demoSeaIce,
    demoWeather,
    1.0,
    lowConf
  );

  const recommendedLowRoute = lowConfRoutes.find((r) => r.isRecommended);
  assert(recommendedLowRoute?.type === 'SAFE', 'Test 7: LOW confidence steers route recommendation to SAFEST corridor.');
  assert(lowConfRoutes.some((r) => r.uncertaintyPenaltyApplied === true), 'Test 7: LOW confidence applies explicit conservative uncertainty penalty flags to routes.');

  // ----------------------------------------------------
  // TEST 8: CRITICAL confidence -> Recommendation BLOCKED
  // ----------------------------------------------------
  const criticalConfRoutes = generateRouteAlternatives(
    defaultMission,
    defaultVessel,
    [],
    [],
    demoWeather,
    1.0,
    criticalConf
  );

  assert(criticalConfRoutes.every((r) => r.isRecommended === false), 'Test 8: CRITICAL confidence prevents any route from being marked as trusted recommended.');
  assert(criticalConfRoutes.every((r) => r.isRecommendationBlocked === true), 'Test 8: CRITICAL confidence sets isRecommendationBlocked = true on all route alternatives.');
  assert(criticalConfRoutes[0].recommendationRationale.includes('RECOMMENDATION BLOCKED'), 'Test 8: Recommendation rationale starts with NAVIGATION RECOMMENDATION BLOCKED banner.');

  // ----------------------------------------------------
  // TEST 9: Verification actions generated
  // ----------------------------------------------------
  assert(lowConf.recommendedVerificationActions.length > 0, 'Test 9: Recommended verification actions generated from confidence factors.');
  assert(
    lowConf.recommendedVerificationActions.some(
      (a) => a.includes('trajectory') || a.includes('observation') || a.includes('corridor')
    ),
    `Test 9: Verification actions point to valid observation workflows (Actual: "${lowConf.recommendedVerificationActions.join('; ')}").`
  );

  // ----------------------------------------------------
  // TEST 10: REAL mode never falls back to synthetic data
  // ----------------------------------------------------
  const realModeWithEmptyData = buildUnifiedEnvironmentalState({
    mode: 'REAL',
    seaIce: { cells: [], provenance: null, error: 'REAL DATA MISSING' },
    ocean: { cells: [], provenance: null, error: 'REAL DATA MISSING' },
    icebergs: { list: [], provenance: null, error: null },
    weather: { current: null, grid: [], provenance: null, error: null },
  });

  const realModeConf = evaluateDecisionConfidence({
    unifiedEnvironment: realModeWithEmptyData,
    seaIceCells: [],
    icebergs: [],
    weather: null as any,
    currents: [],
    forecastHorizonHours: 0,
    mode: 'REAL',
  });

  assert(realModeConf.overallLevel === 'CRITICAL', 'Test 10: REAL mode with missing environmental inputs yields CRITICAL level (does not fall back to synthetic).');
  assert(realModeConf.isRecommendationBlocked === true, 'Test 10: REAL mode missing data explicitly blocks route recommendation.');

  console.log('\n=====================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('=====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
