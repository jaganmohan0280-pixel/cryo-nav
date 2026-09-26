/**
 * CRYO NAV — Phase 10A Uncertainty Engine Unit & System Tests
 *
 * Verifies core uncertainty transformation logic across:
 * - Confidence levels (HIGH, MEDIUM, LOW, CRITICAL)
 * - Connectivity states (ONLINE, LIMITED, OFFLINE, SYNCING)
 * - Data freshness states (FRESH, AGING, STALE, UNAVAILABLE)
 * - Forecast horizons (+0h to +72h)
 * - Hazard types (ICEBERG, SEA_ICE, WEATHER)
 * - Determinism & zero randomness
 * - Explanation generation
 * - Provenance & dataMode preservation
 */

import {
  evaluateUncertainty,
  evaluateBatchUncertainty,
  calculateExpansionFactor,
  formatHorizonLabel,
  normalizeForecastHorizon,
  UncertaintyInput,
  UNCERTAINTY_COEFFICIENTS,
} from '../services/uncertaintyEngine';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`[FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  } else {
    console.log(`  [PASS] ${message}`);
  }
}

export async function runUncertaintyEngineTests() {
  console.log('========================================================================================');
  console.log('RUNNING PHASE 10A UNCERTAINTY ENGINE TESTS');
  console.log('========================================================================================');

  const baseInput: UncertaintyInput = {
    hazardId: 'berg-001',
    hazardName: 'Iceberg A-76A Fragment',
    hazardType: 'ICEBERG',
    location: { lat: -64.5, lon: -62.1 },
    confidenceLevel: 'HIGH',
    freshnessState: 'FRESH',
    connectionState: 'ONLINE',
    forecastHorizonHours: 0,
    baseRadiusNm: 0.8,
    dataMode: 'REAL',
    provenance: 'USNIC Observation & Copernicus CMEMS',
  };

  // Test 1: HIGH confidence + FRESH
  console.log('\n--- Test 1: HIGH Confidence + FRESH Data ---');
  const res1 = evaluateUncertainty(baseInput);
  assert(res1.confidenceLevel === 'HIGH', 'Test 1.1: Confidence level is HIGH');
  assert(res1.freshnessState === 'FRESH', 'Test 1.2: Freshness state is FRESH');
  assert(res1.expansionFactor === 1.0, 'Test 1.3: Expansion factor is 1.0 for HIGH + FRESH + ONLINE at 0h');
  assert(res1.expandedUncertaintyRadiusNm === 0.8, 'Test 1.4: Expanded radius equals base radius (0.8 nm)');

  // Test 2: MEDIUM confidence
  console.log('\n--- Test 2: MEDIUM Confidence ---');
  const res2 = evaluateUncertainty({ ...baseInput, confidenceLevel: 'MEDIUM' });
  assert(res2.confidenceLevel === 'MEDIUM', 'Test 2.1: Confidence level is MEDIUM');
  assert(res2.expansionFactor === 1.25, 'Test 2.2: Expansion factor increases to 1.25');
  assert(res2.expandedUncertaintyRadiusNm === 1.0, 'Test 2.3: Expanded radius is 1.0 nm');

  // Test 3: LOW confidence
  console.log('\n--- Test 3: LOW Confidence ---');
  const res3 = evaluateUncertainty({ ...baseInput, confidenceLevel: 'LOW' });
  assert(res3.confidenceLevel === 'LOW', 'Test 3.1: Confidence level is LOW');
  assert(res3.expansionFactor === 1.6, 'Test 3.2: Expansion factor is 1.6');
  assert(res3.expandedUncertaintyRadiusNm === 1.28, 'Test 3.3: Expanded radius is 1.28 nm');

  // Test 4: CRITICAL confidence
  console.log('\n--- Test 4: CRITICAL Confidence ---');
  const res4 = evaluateUncertainty({ ...baseInput, confidenceLevel: 'CRITICAL' });
  assert(res4.confidenceLevel === 'CRITICAL', 'Test 4.1: Confidence level is CRITICAL');
  assert(res4.expansionFactor === 2.2, 'Test 4.2: Expansion factor is 2.2');
  assert(res4.severity === 'CRITICAL', 'Test 4.3: Severity classified as CRITICAL');

  // Test 5: ONLINE state
  console.log('\n--- Test 5: ONLINE State ---');
  const res5 = evaluateUncertainty({ ...baseInput, connectionState: 'ONLINE' });
  assert(res5.connectionState === 'ONLINE', 'Test 5.1: Connection state is ONLINE');
  assert(res5.expansionFactor === 1.0, 'Test 5.2: ONLINE state adds no penalty multiplier (1.0x)');

  // Test 6: OFFLINE state
  console.log('\n--- Test 6: OFFLINE State ---');
  const res6 = evaluateUncertainty({ ...baseInput, connectionState: 'OFFLINE' });
  assert(res6.connectionState === 'OFFLINE', 'Test 6.1: Connection state is OFFLINE');
  assert(res6.expansionFactor === 1.35, 'Test 6.2: OFFLINE state expands uncertainty factor to 1.35x');
  assert(res6.expandedUncertaintyRadiusNm === 1.08, 'Test 6.3: OFFLINE expanded radius is 1.08 nm');
  assert(res6.reasons.some((r) => r.includes('OFFLINE')), 'Test 6.4: Explanation explicitly mentions OFFLINE');

  // Test 7: LIMITED state
  console.log('\n--- Test 7: LIMITED State ---');
  const res7 = evaluateUncertainty({ ...baseInput, connectionState: 'LIMITED' });
  assert(res7.connectionState === 'LIMITED', 'Test 7.1: Connection state is LIMITED');
  assert(res7.expansionFactor === 1.15, 'Test 7.2: LIMITED connection applies 1.15x multiplier');

  // Test 8: FRESH data
  console.log('\n--- Test 8: FRESH Data ---');
  const res8 = evaluateUncertainty({ ...baseInput, freshnessState: 'FRESH' });
  assert(res8.freshnessState === 'FRESH', 'Test 8.1: Freshness state is FRESH');
  assert(res8.expansionFactor === 1.0, 'Test 8.2: FRESH data maintains 1.0x freshness multiplier');

  // Test 9: AGING data
  console.log('\n--- Test 9: AGING Data ---');
  const res9 = evaluateUncertainty({ ...baseInput, freshnessState: 'AGING' });
  assert(res9.freshnessState === 'AGING', 'Test 9.1: Freshness state is AGING');
  assert(res9.expansionFactor === 1.2, 'Test 9.2: AGING data applies 1.2x multiplier');

  // Test 10: STALE data
  console.log('\n--- Test 10: STALE Data ---');
  const res10 = evaluateUncertainty({ ...baseInput, freshnessState: 'STALE' });
  assert(res10.freshnessState === 'STALE', 'Test 10.1: Freshness state is STALE');
  assert(res10.expansionFactor === 1.5, 'Test 10.2: STALE data applies 1.5x multiplier');

  // Test 11: 0h forecast horizon
  console.log('\n--- Test 11: 0h Forecast Horizon ---');
  const res11 = evaluateUncertainty({ ...baseInput, forecastHorizonHours: 0 });
  assert(res11.forecastHorizonHours === 0, 'Test 11.1: Horizon hours is 0');
  assert(res11.forecastHorizonLabel === '+0h', 'Test 11.2: Horizon label is +0h');
  assert(res11.expansionFactor === 1.0, 'Test 11.3: 0h horizon applies 1.0x factor');

  // Test 12: 6h forecast horizon
  console.log('\n--- Test 12: 6h Forecast Horizon ---');
  const res12 = evaluateUncertainty({ ...baseInput, forecastHorizonHours: 6 });
  assert(res12.forecastHorizonHours === 6, 'Test 12.1: Horizon hours is 6');
  assert(res12.forecastHorizonLabel === '+6h', 'Test 12.2: Horizon label is +6h');
  assert(res12.expansionFactor === 1.1, 'Test 12.3: 6h horizon applies 1.1x factor');

  // Test 13: 12h forecast horizon
  console.log('\n--- Test 13: 12h Forecast Horizon ---');
  const res13 = evaluateUncertainty({ ...baseInput, forecastHorizonHours: 12 });
  assert(res13.forecastHorizonHours === 12, 'Test 13.1: Horizon hours is 12');
  assert(res13.expansionFactor === 1.25, 'Test 13.2: 12h horizon applies 1.25x factor');

  // Test 14: 24h forecast horizon
  console.log('\n--- Test 14: 24h Forecast Horizon ---');
  const res14 = evaluateUncertainty({ ...baseInput, forecastHorizonHours: 24 });
  assert(res14.forecastHorizonHours === 24, 'Test 14.1: Horizon hours is 24');
  assert(res14.expansionFactor === 1.5, 'Test 14.2: 24h horizon applies 1.5x factor');

  // Test 15: 48h forecast horizon
  console.log('\n--- Test 15: 48h Forecast Horizon ---');
  const res15 = evaluateUncertainty({ ...baseInput, forecastHorizonHours: 48 });
  assert(res15.forecastHorizonHours === 48, 'Test 15.1: Horizon hours is 48');
  assert(res15.expansionFactor === 1.9, 'Test 15.2: 48h horizon applies 1.9x factor');

  // Test 16: 72h forecast horizon
  console.log('\n--- Test 16: 72h Forecast Horizon ---');
  const res16 = evaluateUncertainty({ ...baseInput, forecastHorizonHours: 72 });
  assert(res16.forecastHorizonHours === 72, 'Test 16.1: Horizon hours is 72');
  assert(res16.expansionFactor === 2.4, 'Test 16.2: 72h horizon applies 2.4x factor');

  // Test 17: Uncertainty increases with horizon
  console.log('\n--- Test 17: Uncertainty Increases with Horizon ---');
  const h0 = evaluateUncertainty({ ...baseInput, forecastHorizonHours: 0 }).expandedUncertaintyRadiusNm;
  const h12 = evaluateUncertainty({ ...baseInput, forecastHorizonHours: 12 }).expandedUncertaintyRadiusNm;
  const h72 = evaluateUncertainty({ ...baseInput, forecastHorizonHours: 72 }).expandedUncertaintyRadiusNm;
  assert(h12 > h0, `Test 17.1: Horizon +12h (${h12} nm) > +0h (${h0} nm)`);
  assert(h72 > h12, `Test 17.2: Horizon +72h (${h72} nm) > +12h (${h12} nm)`);

  // Test 18: Uncertainty increases with stale data
  console.log('\n--- Test 18: Uncertainty Increases with Stale Data ---');
  const freshRad = evaluateUncertainty({ ...baseInput, freshnessState: 'FRESH' }).expandedUncertaintyRadiusNm;
  const staleRad = evaluateUncertainty({ ...baseInput, freshnessState: 'STALE' }).expandedUncertaintyRadiusNm;
  assert(staleRad > freshRad, `Test 18.1: STALE data (${staleRad} nm) > FRESH data (${freshRad} nm)`);

  // Test 19: Uncertainty increases when confidence decreases
  console.log('\n--- Test 19: Uncertainty Increases when Confidence Decreases ---');
  const highRad = evaluateUncertainty({ ...baseInput, confidenceLevel: 'HIGH' }).expandedUncertaintyRadiusNm;
  const lowRad = evaluateUncertainty({ ...baseInput, confidenceLevel: 'LOW' }).expandedUncertaintyRadiusNm;
  assert(lowRad > highRad, `Test 19.1: LOW confidence (${lowRad} nm) > HIGH confidence (${highRad} nm)`);

  // Test 20: Uncertainty increases in offline state
  console.log('\n--- Test 20: Uncertainty Increases in Offline State ---');
  const onlineRad = evaluateUncertainty({ ...baseInput, connectionState: 'ONLINE' }).expandedUncertaintyRadiusNm;
  const offlineRad = evaluateUncertainty({ ...baseInput, connectionState: 'OFFLINE' }).expandedUncertaintyRadiusNm;
  assert(offlineRad > onlineRad, `Test 20.1: OFFLINE state (${offlineRad} nm) > ONLINE state (${onlineRad} nm)`);

  // Test 21: Deterministic output
  console.log('\n--- Test 21: Deterministic Output ---');
  const runA = evaluateUncertainty(baseInput);
  const runB = evaluateUncertainty(baseInput);
  assert(runA.expansionFactor === runB.expansionFactor, 'Test 21.1: Expansion factor identical across runs');
  assert(
    runA.expandedUncertaintyRadiusNm === runB.expandedUncertaintyRadiusNm,
    'Test 21.2: Expanded radius identical across runs'
  );
  assert(runA.explanation === runB.explanation, 'Test 21.3: Natural language explanation identical');

  // Test 22: Iceberg uncertainty
  console.log('\n--- Test 22: Iceberg Hazard Uncertainty ---');
  const bergRes = evaluateUncertainty({ ...baseInput, hazardType: 'ICEBERG' });
  assert(bergRes.hazardType === 'ICEBERG', 'Test 22.1: Hazard type is ICEBERG');
  assert(bergRes.baseUncertaintyRadiusNm === 0.8, 'Test 22.2: Default iceberg base radius is 0.8 nm');

  // Test 23: Sea-ice uncertainty
  console.log('\n--- Test 23: Sea-Ice Hazard Uncertainty ---');
  const seaIceRes = evaluateUncertainty({ ...baseInput, hazardType: 'SEA_ICE', baseRadiusNm: undefined });
  assert(seaIceRes.hazardType === 'SEA_ICE', 'Test 23.1: Hazard type is SEA_ICE');
  assert(seaIceRes.baseUncertaintyRadiusNm === 3.0, 'Test 23.2: Default sea-ice base radius is 3.0 nm');

  // Test 24: Weather uncertainty
  console.log('\n--- Test 24: Weather Hazard Uncertainty ---');
  const wxRes = evaluateUncertainty({ ...baseInput, hazardType: 'WEATHER', baseRadiusNm: undefined });
  assert(wxRes.hazardType === 'WEATHER', 'Test 24.1: Hazard type is WEATHER');
  assert(wxRes.baseUncertaintyRadiusNm === 10.0, 'Test 24.2: Default weather base radius is 10.0 nm');

  // Test 25: Explanation generation
  console.log('\n--- Test 25: Structured Explanation Generation ---');
  const expRes = evaluateUncertainty({
    ...baseInput,
    confidenceLevel: 'LOW',
    freshnessState: 'STALE',
    connectionState: 'OFFLINE',
    forecastHorizonHours: 24,
  });
  assert(expRes.reasons.length >= 4, 'Test 25.1: Reasons array contains at least 4 detailed reasons');
  assert(expRes.explanation.length > 20, 'Test 25.2: Human-readable explanation string generated');
  assert(expRes.explanation.includes('LOW model confidence'), 'Test 25.3: Primary driver included in explanation');

  // Test 26: No random behavior
  console.log('\n--- Test 26: No Random Behavior ---');
  const iterations = 50;
  let allEqual = true;
  const firstRad = evaluateUncertainty(baseInput).expandedUncertaintyRadiusNm;
  for (let i = 0; i < iterations; i++) {
    if (evaluateUncertainty(baseInput).expandedUncertaintyRadiusNm !== firstRad) {
      allEqual = false;
      break;
    }
  }
  assert(allEqual, 'Test 26.1: 50 consecutive evaluations produced exact identical output (zero randomness)');

  // Test 27: REAL provenance preservation
  console.log('\n--- Test 27: REAL Provenance Preservation ---');
  const realRes = evaluateUncertainty({ ...baseInput, dataMode: 'REAL', provenance: 'Copernicus SAR NRT' });
  assert(realRes.dataMode === 'REAL', 'Test 27.1: dataMode is REAL');
  assert(realRes.provenance === 'Copernicus SAR NRT', 'Test 27.2: Provenance string preserved');

  // Test 28: SIMULATED provenance preservation
  console.log('\n--- Test 28: SIMULATED Provenance Preservation ---');
  const simRes = evaluateUncertainty({ ...baseInput, dataMode: 'SIMULATED', provenance: 'Synthetic Baseline Demo' });
  assert(simRes.dataMode === 'SIMULATED', 'Test 28.1: dataMode remains SIMULATED');
  assert(simRes.provenance === 'Synthetic Baseline Demo', 'Test 28.2: SIMULATED provenance string preserved');

  console.log('\n========================================================================================');
  console.log('ALL PHASE 10A UNCERTAINTY ENGINE UNIT TESTS PASSED!');
  console.log('========================================================================================\n');
}

// Self-runner if executed directly via CLI
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('uncertaintyEngine.test.ts')) {
  runUncertaintyEngineTests().catch((err) => {
    console.error('Test execution failed:', err);
    process.exit(1);
  });
}
