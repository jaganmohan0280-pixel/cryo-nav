/**
 * CRYO NAV — Decision-Impact Data Acquisition Engine Test Suite
 * Phase 6 Test Suite — Deterministic Verification of Data Priority Ranking,
 * Route Corridor Overlap, Temporal Relevance, Uncertainty Reduction,
 * Counterfactual Sensitivity Integration, 5-Minute Budget, and Offline State.
 */

import {
  evaluateProductDecisionImpact,
  generateDataAcquisitionPriorities,
} from '../services/decisionImpactEngine';
import { generateRouteAlternatives } from '../services/routingEngine';
import { buildUnifiedEnvironmentalState } from '../data/environmentalState';
import { evaluateDecisionConfidence } from '../services/confidenceEngine';
import { runBatchSensitivityAnalysis } from '../services/counterfactualEngine';

import {
  INITIAL_VESSELS,
  DEFAULT_MISSION,
  INITIAL_ICEBERGS,
  SYNTHETIC_WEATHER,
  SYNTHETIC_OCEAN_CURRENTS,
  generateSyntheticSeaIce,
  INITIAL_SATELLITE_PRODUCTS,
} from '../data/syntheticAntarcticData';
import { SatelliteProduct, ConnectionState, DataAcquisitionRecommendation, BatchSensitivitySummary } from '../types';

export function runDecisionImpactTests() {
  console.log('=====================================================');
  console.log('CRYO NAV — PHASE 6 DECISION IMPACT ACQUISITION TESTS');
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

  const demoUnifiedEnv = buildUnifiedEnvironmentalState({
    mode: 'DEMO',
    analysisTime: defaultMission.departureTime,
    seaIce: { cells: demoSeaIce, provenance: null, error: null },
    ocean: { cells: demoOcean, provenance: null, error: null },
    icebergs: { list: demoIcebergs, provenance: null, error: null },
    weather: { current: demoWeather, grid: [demoWeather], provenance: null, error: null },
  });

  const baselineConfidence = evaluateDecisionConfidence({
    mode: 'DEMO',
    unifiedEnvironment: demoUnifiedEnv,
    weather: demoWeather,
    currents: demoOcean,
    icebergs: demoIcebergs,
    seaIceCells: demoSeaIce,
    forecastHorizonHours: 0,
  });

  const baselineRoutes = generateRouteAlternatives(
    defaultMission,
    defaultVessel,
    demoIcebergs,
    demoSeaIce,
    demoWeather,
    1.0,
    baselineConfidence
  );

  const batchSensitivity = runBatchSensitivityAnalysis(
    defaultMission,
    defaultVessel,
    demoSeaIce,
    demoOcean,
    demoWeather,
    demoIcebergs,
    baselineRoutes,
    baselineConfidence,
    demoUnifiedEnv,
    'DEMO'
  );

  // ----------------------------------------------------
  // TEST 1: High route-corridor overlap increases relevance score
  // ----------------------------------------------------
  const productHighOverlap: SatelliteProduct = {
    ...INITIAL_SATELLITE_PRODUCTS[0],
    footprint: {
      centerLat: -70.0,
      centerLon: 40.0,
      radiusNm: 140,
      description: 'East Antarctic Transit Corridor',
    },
  };
  const resHighOverlap = evaluateProductDecisionImpact(
    productHighOverlap,
    baselineRoutes,
    demoIcebergs,
    demoSeaIce,
    'ONLINE',
    baselineConfidence,
    batchSensitivity,
    'DEMO'
  );
  assert(
    resHighOverlap.scoreBreakdown.spatialRelevance >= 40,
    `1. High route-corridor overlap increases spatial relevance (${resHighOverlap.scoreBreakdown.spatialRelevance}%).`
  );

  // ----------------------------------------------------
  // TEST 2: Low corridor overlap reduces relevance score
  // ----------------------------------------------------
  const productLowOverlap: SatelliteProduct = {
    ...INITIAL_SATELLITE_PRODUCTS[0],
    id: 'SAT-OFF-SECTOR',
    footprint: {
      centerLat: -50.0,
      centerLon: -30.0,
      radiusNm: 20,
      description: 'Distant South Atlantic Open Water',
    },
  };
  const resLowOverlap = evaluateProductDecisionImpact(
    productLowOverlap,
    baselineRoutes,
    demoIcebergs,
    demoSeaIce,
    'ONLINE',
    baselineConfidence,
    batchSensitivity,
    'DEMO'
  );
  assert(
    resLowOverlap.scoreBreakdown.spatialRelevance < 30,
    `2. Low corridor overlap reduces spatial relevance (${resLowOverlap.scoreBreakdown.spatialRelevance}%).`
  );
  assert(
    resLowOverlap.score < resHighOverlap.score,
    `2. High-overlap product outranks low-overlap product (${resHighOverlap.score} vs ${resLowOverlap.score}).`
  );

  // ----------------------------------------------------
  // TEST 3: Fresh observation outranks stale equivalent observation
  // ----------------------------------------------------
  const freshProduct: SatelliteProduct = {
    ...productHighOverlap,
    id: 'SAT-FRESH',
    acquisitionTime: new Date().toISOString(),
  };
  const staleProduct: SatelliteProduct = {
    ...productHighOverlap,
    id: 'SAT-STALE',
    acquisitionTime: new Date(Date.now() - 96 * 3600 * 1000).toISOString(), // 96h old
  };
  const resFresh = evaluateProductDecisionImpact(
    freshProduct,
    baselineRoutes,
    demoIcebergs,
    demoSeaIce,
    'ONLINE',
    baselineConfidence,
    batchSensitivity,
    'DEMO'
  );
  const resStale = evaluateProductDecisionImpact(
    staleProduct,
    baselineRoutes,
    demoIcebergs,
    demoSeaIce,
    'ONLINE',
    baselineConfidence,
    batchSensitivity,
    'DEMO'
  );
  assert(
    resFresh.scoreBreakdown.freshnessBenefit > resStale.scoreBreakdown.freshnessBenefit,
    `3. Fresh observation outranks stale equivalent (${resFresh.scoreBreakdown.freshnessBenefit} vs ${resStale.scoreBreakdown.freshnessBenefit}).`
  );

  // ----------------------------------------------------
  // TEST 4: Dominant uncertainty increases relevant product score
  // ----------------------------------------------------
  const icebergLimitingConf = {
    ...baselineConfidence,
    primaryLimitingFactor: 'ICEBERG TRAJECTORY UNCERTAINTY',
  };
  const sarProduct = INITIAL_SATELLITE_PRODUCTS.find((p) => p.sensor.includes('SAR')) || INITIAL_SATELLITE_PRODUCTS[0];
  const resSarIcebergConf = evaluateProductDecisionImpact(
    sarProduct,
    baselineRoutes,
    demoIcebergs,
    demoSeaIce,
    'ONLINE',
    icebergLimitingConf,
    batchSensitivity,
    'DEMO'
  );
  assert(
    resSarIcebergConf.scoreBreakdown.decisionRelevance >= 80,
    `4. Dominant uncertainty (ICEBERG) increases relevant SAR product decision relevance (${resSarIcebergConf.scoreBreakdown.decisionRelevance}).`
  );

  // ----------------------------------------------------
  // TEST 5: High counterfactual sensitivity increases relevant product score
  // ----------------------------------------------------
  const sensitiveSensitivity: BatchSensitivitySummary = {
    ...batchSensitivity,
    overallStability: 'HIGHLY_SENSITIVE',
    dominantSensitivity: 'ICEBERG_DRIFT',
  };
  const resSensitiveBoost = evaluateProductDecisionImpact(
    sarProduct,
    baselineRoutes,
    demoIcebergs,
    demoSeaIce,
    'ONLINE',
    baselineConfidence,
    sensitiveSensitivity,
    'DEMO'
  );
  assert(
    resSensitiveBoost.scoreBreakdown.routeSensitivityRelevance >= 80,
    `5. High counterfactual sensitivity increases relevant product score (${resSensitiveBoost.scoreBreakdown.routeSensitivityRelevance}).`
  );

  // ----------------------------------------------------
  // TEST 6: Low sensitivity reduces unnecessary acquisition priority
  // ----------------------------------------------------
  const robustSensitivity: BatchSensitivitySummary = {
    ...batchSensitivity,
    overallStability: 'ROBUST',
    dominantSensitivity: null,
  };
  const resRobustPenalty = evaluateProductDecisionImpact(
    INITIAL_SATELLITE_PRODUCTS[3], // Weather product
    baselineRoutes,
    demoIcebergs,
    demoSeaIce,
    'ONLINE',
    baselineConfidence,
    robustSensitivity,
    'DEMO'
  );
  assert(
    resRobustPenalty.scoreBreakdown.routeSensitivityRelevance <= 50,
    `6. Low counterfactual sensitivity reduces unnecessary acquisition priority (${resRobustPenalty.scoreBreakdown.routeSensitivityRelevance}).`
  );

  // ----------------------------------------------------
  // TEST 7: Acquisition cost (size/bandwidth) affects final ranking
  // ----------------------------------------------------
  const smallProduct: SatelliteProduct = { ...productHighOverlap, id: 'SAT-SMALL', sizeMb: 20 };
  const hugeProduct: SatelliteProduct = { ...productHighOverlap, id: 'SAT-HUGE', sizeMb: 350 };
  const resSmall = evaluateProductDecisionImpact(
    smallProduct,
    baselineRoutes,
    demoIcebergs,
    demoSeaIce,
    'LIMITED',
    baselineConfidence,
    batchSensitivity,
    'DEMO'
  );
  const resHuge = evaluateProductDecisionImpact(
    hugeProduct,
    baselineRoutes,
    demoIcebergs,
    demoSeaIce,
    'LIMITED',
    baselineConfidence,
    batchSensitivity,
    'DEMO'
  );
  assert(
    resSmall.score > resHuge.score,
    `7. Acquisition cost/size affects ranking under LIMITED bandwidth (${resSmall.score} vs ${resHuge.score}).`
  );

  // ----------------------------------------------------
  // TEST 8: Limited bandwidth prioritizes smaller high-impact products
  // ----------------------------------------------------
  const limitedBatch = generateDataAcquisitionPriorities(
    [smallProduct, hugeProduct],
    baselineRoutes,
    demoIcebergs,
    demoSeaIce,
    'LIMITED',
    baselineConfidence,
    batchSensitivity,
    'DEMO'
  );
  assert(
    limitedBatch.recommendations[0].productId === 'SAT-SMALL',
    `8. Limited bandwidth prioritizes smaller high-impact product (${limitedBatch.recommendations[0].productId}).`
  );

  // ----------------------------------------------------
  // TEST 9: Offline state does not claim acquisition success
  // ----------------------------------------------------
  const resOffline = evaluateProductDecisionImpact(
    productHighOverlap,
    baselineRoutes,
    demoIcebergs,
    demoSeaIce,
    'OFFLINE',
    baselineConfidence,
    batchSensitivity,
    'DEMO'
  );
  assert(
    resOffline.status === 'Downlink Unavailable',
    `9. Offline state explicitly sets status as Downlink Unavailable (Actual: ${resOffline.status}).`
  );
  assert(
    resOffline.score === 0,
    `9. Offline state sets decision impact score to 0.`
  );

  // ----------------------------------------------------
  // TEST 10: Missing catalog does not create fake observations
  // ----------------------------------------------------
  const emptyBatch = generateDataAcquisitionPriorities(
    [],
    baselineRoutes,
    demoIcebergs,
    demoSeaIce,
    'ONLINE',
    baselineConfidence,
    batchSensitivity,
    'REAL'
  );
  assert(
    emptyBatch.recommendations.length === 0,
    `10. Missing catalog produces empty recommendations array without fabricating products.`
  );

  // ----------------------------------------------------
  // TEST 11: Five-minute budget ranking works
  // ----------------------------------------------------
  const multiProducts: SatelliteProduct[] = [
    { ...productHighOverlap, id: 'P1', name: 'Product 1', sizeMb: 80 }, // 1.6 min
    { ...productHighOverlap, id: 'P2', name: 'Product 2', sizeMb: 100 }, // 2.0 min
    { ...productHighOverlap, id: 'P3', name: 'Product 3', sizeMb: 120 }, // 2.4 min
  ];
  const budgetBatch = generateDataAcquisitionPriorities(
    multiProducts,
    baselineRoutes,
    demoIcebergs,
    demoSeaIce,
    'ONLINE',
    baselineConfidence,
    batchSensitivity,
    'DEMO'
  );
  assert(
    budgetBatch.fiveMinuteBudget.totalAllocatedMinutes <= 5.0,
    `11. Five-minute budget respects 5.0 min cap (${budgetBatch.fiveMinuteBudget.totalAllocatedMinutes} min).`
  );
  assert(
    budgetBatch.fiveMinuteBudget.prioritizedProducts.length >= 1,
    `11. Five-minute budget allocates prioritized products (${budgetBatch.fiveMinuteBudget.prioritizedProducts.length} allocated).`
  );

  // ----------------------------------------------------
  // TEST 12: Explanation reflects actual scoring factors
  // ----------------------------------------------------
  assert(
    resHighOverlap.acquisitionReason.toLowerCase().includes('corridor'),
    `12. Explanation reflects actual scoring factors and route corridor overlap.`
  );

  // ----------------------------------------------------
  // TEST 13: REAL mode does not fallback to synthetic observations
  // ----------------------------------------------------
  const realRes = evaluateProductDecisionImpact(
    productHighOverlap,
    baselineRoutes,
    demoIcebergs,
    demoSeaIce,
    'ONLINE',
    baselineConfidence,
    batchSensitivity,
    'REAL'
  );
  assert(
    realRes.provenance.includes('Real Satellite Metadata Catalogue'),
    `13. REAL mode preserves real provenance string without synthetic fallback (${realRes.provenance}).`
  );

  // ----------------------------------------------------
  // TEST 14: Data Provenance is preserved
  // ----------------------------------------------------
  assert(
    realRes.provenance.includes(productHighOverlap.sensor),
    `14. Product sensor type is preserved in provenance string.`
  );

  // ----------------------------------------------------
  // TEST 15: Batch ranking is deterministic
  // ----------------------------------------------------
  const batch1 = generateDataAcquisitionPriorities(
    INITIAL_SATELLITE_PRODUCTS,
    baselineRoutes,
    demoIcebergs,
    demoSeaIce,
    'ONLINE',
    baselineConfidence,
    batchSensitivity,
    'DEMO'
  );
  const batch2 = generateDataAcquisitionPriorities(
    INITIAL_SATELLITE_PRODUCTS,
    baselineRoutes,
    demoIcebergs,
    demoSeaIce,
    'ONLINE',
    baselineConfidence,
    batchSensitivity,
    'DEMO'
  );
  assert(
    batch1.recommendations[0].productId === batch2.recommendations[0].productId &&
      batch1.recommendations[0].score === batch2.recommendations[0].score,
    `15. Batch ranking is deterministic across identical evaluations (${batch1.recommendations[0].productId}, score ${batch1.recommendations[0].score}).`
  );

  console.log(`\n=====================================================`);
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log(`=====================================================\n`);

  return { passed, failed };
}
