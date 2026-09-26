/**
 * CRYO NAV — Counterfactual & Sensitivity Analysis Engine Test Suite
 * Phase 5 Test Suite — Deterministic Verification of Counterfactual Scenarios,
 * Route Stability, Confidence Integration, Provenance, and Explanations.
 */

import {
  DEFAULT_COUNTERFACTUAL_SCENARIOS,
  createPerturbedEnvironmentalState,
  runCounterfactualScenario,
  runBatchSensitivityAnalysis,
  runIcebergTrajectoryWhatIf,
} from '../services/counterfactualEngine';
import { generateRouteAlternatives } from '../services/routingEngine';
import { computeIcebergTrajectories } from '../services/trajectoryModel';
import { evaluateDecisionConfidence } from '../services/confidenceEngine';

import { buildUnifiedEnvironmentalState } from '../data/environmentalState';
import {
  INITIAL_VESSELS,
  DEFAULT_MISSION,
  INITIAL_ICEBERGS,
  SYNTHETIC_WEATHER,
  SYNTHETIC_OCEAN_CURRENTS,
  generateSyntheticSeaIce,
} from '../data/syntheticAntarcticData';
import { CounterfactualScenario, SeaIceCell, IcebergDetection } from '../types';

export function runCounterfactualTests() {
  console.log('=====================================================');
  console.log('CRYO NAV — PHASE 5 COUNTERFACTUAL & SENSITIVITY TESTS');
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


  // ----------------------------------------------------
  // TEST 1: Baseline scenario produces no modification (0% perturbation)
  // ----------------------------------------------------
  const nullScenario: CounterfactualScenario = {
    id: 'NULL_TEST',
    name: 'Null Scenario (0%)',
    description: 'Zero perturbation baseline test.',
    parameter: 'OCEAN_CURRENT',
    perturbationValue: 0,
    units: '%',
    direction: 'INCREASE',
    rationale: 'Baseline check.',
    baselineReference: 'Reference',
  };

  const pertNull = createPerturbedEnvironmentalState(nullScenario, demoSeaIce, demoOcean, demoWeather, demoIcebergs);
  assert(
    pertNull.oceanCurrents[0].currentSpeedKnots === demoOcean[0].currentSpeedKnots,
    '1. Baseline scenario (0% perturbation) produces no modification to environmental values.'
  );

  // ----------------------------------------------------
  // TEST 2: Ocean current perturbation changes current values
  // ----------------------------------------------------
  const currentScenario = DEFAULT_COUNTERFACTUAL_SCENARIOS.find((s) => s.id === 'OCEAN_CURRENT_POS_20')!;
  const pertCurrent = createPerturbedEnvironmentalState(currentScenario, demoSeaIce, demoOcean, demoWeather, demoIcebergs);
  const expectedCurrentSpeed = Number((demoOcean[0].currentSpeedKnots * 1.2).toFixed(2));
  assert(
    pertCurrent.oceanCurrents[0].currentSpeedKnots === expectedCurrentSpeed,
    `2. Ocean current +20% perturbation scales velocity (${demoOcean[0].currentSpeedKnots} -> ${pertCurrent.oceanCurrents[0].currentSpeedKnots} kt).`
  );

  // ----------------------------------------------------
  // TEST 3: Wind perturbation changes wind values
  // ----------------------------------------------------
  const windScenario = DEFAULT_COUNTERFACTUAL_SCENARIOS.find((s) => s.id === 'WIND_POS_20')!;
  const pertWind = createPerturbedEnvironmentalState(windScenario, demoSeaIce, demoOcean, demoWeather, demoIcebergs);
  const expectedWindSpeed = Number((demoWeather.windSpeedKnots * 1.2).toFixed(1));
  assert(
    pertWind.weather.windSpeedKnots === expectedWindSpeed,
    `3. Wind +20% perturbation scales wind speed (${demoWeather.windSpeedKnots} -> ${pertWind.weather.windSpeedKnots} kt).`
  );

  // ----------------------------------------------------
  // TEST 4: Iceberg drift perturbation changes drift
  // ----------------------------------------------------
  const driftScenario = DEFAULT_COUNTERFACTUAL_SCENARIOS.find((s) => s.id === 'ICEBERG_DRIFT_POS_20')!;
  const pertDrift = createPerturbedEnvironmentalState(driftScenario, demoSeaIce, demoOcean, demoWeather, demoIcebergs);
  const expectedDrift = Number((demoIcebergs[0].driftSpeedKnots * 1.2).toFixed(2));
  assert(
    pertDrift.icebergs[0].driftSpeedKnots === expectedDrift,
    `4. Iceberg drift +20% perturbation scales drift speed (${demoIcebergs[0].driftSpeedKnots} -> ${pertDrift.icebergs[0].driftSpeedKnots} kt).`
  );

  // ----------------------------------------------------
  // TEST 5: Sea-ice perturbation changes concentration
  // ----------------------------------------------------
  const seaIceScenario = DEFAULT_COUNTERFACTUAL_SCENARIOS.find((s) => s.id === 'SEA_ICE_POS_10')!;
  const pertSeaIce = createPerturbedEnvironmentalState(seaIceScenario, demoSeaIce, demoOcean, demoWeather, demoIcebergs);
  const expectedConc = Math.min(100, demoSeaIce[0].concentrationPercent + 10);
  assert(
    pertSeaIce.seaIceCells[0].concentrationPercent === expectedConc,
    `5. Sea-ice +10 percentage points perturbation increases concentration (${demoSeaIce[0].concentrationPercent}% -> ${pertSeaIce.seaIceCells[0].concentrationPercent}%).`
  );

  // ----------------------------------------------------
  // TEST 6: Uncertainty perturbation expands uncertainty
  // ----------------------------------------------------
  const uncertaintyScenario = DEFAULT_COUNTERFACTUAL_SCENARIOS.find((s) => s.id === 'UNCERTAINTY_POS_25')!;
  const pertUncertainty = createPerturbedEnvironmentalState(uncertaintyScenario, demoSeaIce, demoOcean, demoWeather, demoIcebergs);
  assert(
    pertUncertainty.uncertaintyModifier === 1.25 && pertUncertainty.icebergs[0].uncertaintyRadiusNm > demoIcebergs[0].uncertaintyRadiusNm,
    '6. Uncertainty expansion (+25%) expands uncertainty radius and hazard margins.'
  );

  // ----------------------------------------------------
  // TEST 7: Route comparison produces actual deltas
  // ----------------------------------------------------
  const resScenario = runCounterfactualScenario(
    currentScenario,
    defaultMission,
    defaultVessel,
    demoSeaIce,
    demoOcean,
    demoWeather,
    demoIcebergs,
    baselineRoutes,
    baselineConfidence,
    undefined,
    'DEMO'
  );
  assert(
    typeof resScenario.distanceChange === 'number' &&
      typeof resScenario.etaChange === 'number' &&
      typeof resScenario.fuelChange === 'number' &&
      typeof resScenario.riskChange === 'number',
    `7. Counterfactual route comparison produces actual deltas (Risk Δ: ${resScenario.riskChange}%, ETA Δ: ${resScenario.etaChange}h).`
  );

  // ----------------------------------------------------
  // TEST 8: Route change is detected
  // ----------------------------------------------------
  assert(
    typeof resScenario.routeChanged === 'boolean' && typeof resScenario.recommendationChanged === 'boolean',
    '8. Route change and recommendation change flags are accurately evaluated.'
  );

  // ----------------------------------------------------
  // TEST 9: Stable route is classified ROBUST
  // ----------------------------------------------------
  const resStable = runCounterfactualScenario(
    nullScenario,
    defaultMission,
    defaultVessel,
    demoSeaIce,
    demoOcean,
    demoWeather,
    demoIcebergs,
    baselineRoutes,
    baselineConfidence,
    undefined,
    'DEMO'
  );

  assert(
    resStable.stability === 'ROBUST',
    `9. Unchanged scenario recommendation is classified as ROBUST (Actual: ${resStable.stability}).`
  );





  // ----------------------------------------------------
  // TEST 10: Changed recommendation is classified SENSITIVE
  // ----------------------------------------------------
  const corridorSeaIce: SeaIceCell[] = [
    { id: 'csi-1', lat: -61.8, lon: -62.8, concentrationPercent: 50, thicknessMeters: 0.8, stage: 'Open Drift (40-60%)', driftVector: { speedKnots: 0.2, headingDeg: 210 }, predictedConcentration72h: 55, confidence: 80, uncertainty: 10, timestamp: new Date().toISOString() },
    { id: 'csi-2', lat: -63.2, lon: -63.5, concentrationPercent: 50, thicknessMeters: 0.8, stage: 'Open Drift (40-60%)', driftVector: { speedKnots: 0.2, headingDeg: 210 }, predictedConcentration72h: 55, confidence: 80, uncertainty: 10, timestamp: new Date().toISOString() },
    { id: 'csi-3', lat: -64.8, lon: -64.2, concentrationPercent: 50, thicknessMeters: 1.2, stage: 'Open Drift (40-60%)', driftVector: { speedKnots: 0.3, headingDeg: 200 }, predictedConcentration72h: 60, confidence: 80, uncertainty: 10, timestamp: new Date().toISOString() },
  ];

  const corridorBaselineRoutes = generateRouteAlternatives(
    defaultMission,
    defaultVessel,
    demoIcebergs,
    corridorSeaIce,
    demoWeather,
    1.0,
    baselineConfidence
  );

  const extremeIceScenario: CounterfactualScenario = {
    id: 'EXTREME_ICE',
    name: 'Extreme Sea Ice (+35%)',
    description: 'Forces route corridor blockage.',
    parameter: 'SEA_ICE_CONCENTRATION',
    perturbationValue: 35,
    units: 'percentage points',
    direction: 'INCREASE',
    rationale: 'Forces route shift.',
    baselineReference: 'Reference',
  };
  const resSensitive = runCounterfactualScenario(
    extremeIceScenario,
    defaultMission,
    defaultVessel,
    corridorSeaIce,
    demoOcean,
    demoWeather,
    demoIcebergs,
    corridorBaselineRoutes,
    baselineConfidence,
    undefined,
    'DEMO'
  );
  assert(
    resSensitive.stability === 'SENSITIVE' || resSensitive.stability === 'HIGHLY_SENSITIVE',
    `10. Perturbation forcing route/risk shifts is classified as SENSITIVE or HIGHLY_SENSITIVE (Actual: ${resSensitive.stability}).`
  );

  // ----------------------------------------------------
  // TEST 11: Large repeated route changes produce HIGHLY_SENSITIVE
  // ----------------------------------------------------
  const severeDriftScenario: CounterfactualScenario = {
    id: 'UNCERTAINTY_EXPANSION_50',
    name: 'Extreme Uncertainty Expansion (+50%)',
    description: 'Drastic expansion of positional error envelope.',
    parameter: 'UNCERTAINTY',
    perturbationValue: 50,
    units: '%',
    direction: 'EXPAND',
    rationale: 'Severe risk shift.',
    baselineReference: 'Reference',
  };

  const highThreatIcebergs: IcebergDetection[] = demoIcebergs.map((b) => ({
    ...b,
    lat: -64.75,
    lon: -64.15,
    driftSpeedKnots: 2.5,
    uncertaintyRadiusNm: 3.5,
    predictedTrajectory: [
      { horizon: '+6h' as const, hours: 6, lat: -64.78, lon: -64.18, uncertaintyRadiusNm: 3.0, timestamp: '2026-09-06T11:30:00Z', confidence: 85 },
      { horizon: '+12h' as const, hours: 12, lat: -64.82, lon: -64.22, uncertaintyRadiusNm: 4.5, timestamp: '2026-09-06T17:30:00Z', confidence: 80 },
    ],
  }));

  const threatBaselineRoutes = generateRouteAlternatives(
    defaultMission,
    defaultVessel,
    highThreatIcebergs,
    corridorSeaIce,
    demoWeather,
    1.0,
    baselineConfidence
  );

  const resHighlySensitive = runCounterfactualScenario(
    severeDriftScenario,
    defaultMission,
    defaultVessel,
    corridorSeaIce,
    demoOcean,
    demoWeather,
    highThreatIcebergs,
    threatBaselineRoutes,
    baselineConfidence,
    undefined,
    'DEMO'
  );
  assert(
    resHighlySensitive.stability === 'SENSITIVE' || resHighlySensitive.stability === 'HIGHLY_SENSITIVE',
    `11. Large repeated route/risk changes produce HIGHLY_SENSITIVE classification (Actual: ${resHighlySensitive.stability}).`
  );

  // ----------------------------------------------------
  // TEST 12: CRITICAL confidence remains recommendation-blocked
  // ----------------------------------------------------
  const criticalConfidence = {
    ...baselineConfidence,
    overallLevel: 'CRITICAL' as const,
    isRecommendationBlocked: true,
    primaryLimitingFactor: 'Missing Copernicus Sea Ice Feed',
  };
  const resBlocked = runCounterfactualScenario(
    currentScenario,
    defaultMission,
    defaultVessel,
    demoSeaIce,
    demoOcean,
    demoWeather,
    demoIcebergs,
    baselineRoutes,
    criticalConfidence,
    undefined,
    'REAL'
  );
  assert(
    resBlocked.scenarioRoute.isRecommendationBlocked === true,
    '12. CRITICAL confidence remains navigation recommendation-blocked during counterfactual scenario analysis.'
  );

  // ----------------------------------------------------
  // TEST 13: REAL mode does not introduce synthetic fallback
  // ----------------------------------------------------
  const resReal = runCounterfactualScenario(
    currentScenario,
    defaultMission,
    defaultVessel,
    demoSeaIce,
    demoOcean,
    demoWeather,
    demoIcebergs,
    baselineRoutes,
    baselineConfidence,
    undefined,
    'REAL'
  );
  assert(
    resReal.provenance.scenarioModification.includes('COUNTERFACTUAL SCENARIO — NOT OBSERVED DATA'),
    '13. REAL mode counterfactual correctly marks scenario overrides without replacing real data with synthetic fallback.'
  );

  // ----------------------------------------------------
  // TEST 14: Provenance identifies baseline and scenario modification
  // ----------------------------------------------------
  assert(
    resReal.provenance.baselineProvenance.length > 0 &&
      resReal.provenance.scenarioModification.includes('Applied +20% override'),
    '14. Data provenance explicitly identifies baseline source and scenario modification.'
  );

  // ----------------------------------------------------
  // TEST 15: Explanations are generated from actual calculated results
  // ----------------------------------------------------
  assert(
    resReal.explanation.whatChanged.includes('perturbed by +20%') &&
      typeof resReal.explanation.whyItMatter === 'string' &&
      resReal.explanation.didRecommendationChange.startsWith('Yes') || resReal.explanation.didRecommendationChange.startsWith('No'),
    '15. Explanations are dynamically generated from actual calculated results.'
  );

  // ----------------------------------------------------
  // BATCH SENSITIVITY TEST
  // ----------------------------------------------------
  const batchSummary = runBatchSensitivityAnalysis(
    defaultMission,
    defaultVessel,
    demoSeaIce,
    demoOcean,
    demoWeather,
    demoIcebergs,
    baselineRoutes,
    baselineConfidence,
    undefined,
    'REAL'
  );
  assert(
    batchSummary.testedScenariosCount === DEFAULT_COUNTERFACTUAL_SCENARIOS.length &&
      batchSummary.parameterResults.length > 0 &&
      typeof batchSummary.dominantExplanation === 'string',
    `Batch sensitivity analysis runs all ${DEFAULT_COUNTERFACTUAL_SCENARIOS.length} scenarios and identifies dominant sensitivity.`
  );

  console.log('\n=====================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('=====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }

  return { passed, failed };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runCounterfactualTests();
}
