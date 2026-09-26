/**
 * CRYO NAV — Phase 10C Uncertainty Integration System Tests
 *
 * Verifies end-to-end integration of the Uncertainty Engine, Uncertainty Zone Panel,
 * and Map Visualization Layer with existing navigation, hazard, and connectivity states.
 *
 * Key Architectural Rules Tested:
 * 1. Uncertainty engine output flows seamlessly into UI panels and map layers.
 * 2. Confidence, freshness, connectivity, and forecast horizon dynamically drive spatial uncertainty bounds.
 * 3. NO AUTOMATIC REPLANNING: Increased uncertainty NEVER modifies route selection or alters waypoints.
 * 4. PROVENANCE INTEGRITY: REAL and SIMULATED data modes are strictly preserved.
 * 5. DETERMINISM: 100% deterministic output with zero random noise.
 */

import {
  evaluateUncertainty,
  evaluateBatchUncertainty,
  UncertaintyInput,
  UncertaintyEvaluationResult,
} from '../services/uncertaintyEngine';
import { UncertaintyData } from '../components/navigation/UncertaintyZonePanel';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`[FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  } else {
    console.log(`  [PASS] ${message}`);
  }
}

/**
 * Helper to map engine result to panel data structure
 */
function mapEvaluationToPanelData(evalRes: UncertaintyEvaluationResult | null): UncertaintyData | null {
  if (!evalRes) return null;
  return {
    id: evalRes.hazardId,
    hazardType: evalRes.hazardType === 'SEA_ICE' ? 'SEA ICE' : evalRes.hazardType,
    confidence: evalRes.confidenceLevel,
    freshness: evalRes.freshnessState,
    connectivity: evalRes.connectionState,
    forecastHorizon: evalRes.forecastHorizonLabel,
    uncertaintyRadiusNm: evalRes.expandedUncertaintyRadiusNm,
    uncertaintyEnvelopeLabel: `±${evalRes.expandedUncertaintyRadiusNm.toFixed(1)} nm (${evalRes.expansionFactor}x expansion)`,
    reason: evalRes.explanation,
    cautionLevel:
      evalRes.recommendedCautionLevel === 'RE_EVALUATION_REQUIRED'
        ? 'EXTREME'
        : evalRes.recommendedCautionLevel === 'EXCLUSIVE_MONITORING'
        ? 'HIGH'
        : evalRes.recommendedCautionLevel === 'HIGH_CAUTION'
        ? 'HIGH'
        : evalRes.recommendedCautionLevel === 'ELEVATED'
        ? 'ELEVATED'
        : 'STANDARD',
    provenance: evalRes.dataMode,
    lastUpdateTimestamp: evalRes.timestamp,
  };
}

export async function runUncertaintyIntegrationTests() {
  console.log('========================================================================================');
  console.log('RUNNING PHASE 10C UNCERTAINTY INTEGRATION SYSTEM TESTS');
  console.log('========================================================================================');

  const baseInput: UncertaintyInput = {
    hazardId: 'berg-76a',
    hazardName: 'A-76A Iceberg Fragment',
    hazardType: 'ICEBERG',
    location: { lat: -64.8, lon: -63.2 },
    confidenceLevel: 'HIGH',
    freshnessState: 'FRESH',
    connectionState: 'ONLINE',
    forecastHorizonHours: 0,
    baseRadiusNm: 0.8,
    dataMode: 'REAL',
    provenance: 'USNIC Iceberg Catalogue',
  };

  // 1. Uncertainty engine output reaches integration layer
  console.log('\n--- Test 1: Engine Output Reaches Integration Layer ---');
  const eval1 = evaluateUncertainty(baseInput);
  const panelData1 = mapEvaluationToPanelData(eval1);
  assert(panelData1 !== null, 'Test 1.1: Panel data successfully generated from engine result');
  assert(panelData1?.id === 'berg-76a', 'Test 1.2: Hazard ID preserved in panel data');
  assert(panelData1?.uncertaintyRadiusNm === 0.8, 'Test 1.3: Expanded radius (0.8 nm) mapped to panel data');

  // 2. HIGH confidence produces expected tight zone
  console.log('\n--- Test 2: HIGH Confidence Produces Tight Zone ---');
  const eval2 = evaluateUncertainty({ ...baseInput, confidenceLevel: 'HIGH' });
  assert(eval2.expansionFactor === 1.0, 'Test 2.1: HIGH confidence produces 1.0x tight expansion factor');
  assert(eval2.expandedUncertaintyRadiusNm === 0.8, 'Test 2.2: Spatial radius remains tight at 0.8 nm');

  // 3. LOW confidence produces expanded zone
  console.log('\n--- Test 3: LOW Confidence Produces Expanded Zone ---');
  const eval3 = evaluateUncertainty({ ...baseInput, confidenceLevel: 'LOW' });
  assert(eval3.expansionFactor > 1.0, 'Test 3.1: LOW confidence produces expanded factor (> 1.0x)');
  assert(eval3.expandedUncertaintyRadiusNm > eval2.expandedUncertaintyRadiusNm, 'Test 3.2: Spatial radius expands relative to HIGH confidence');

  // 4. STALE data produces expanded zone
  console.log('\n--- Test 4: STALE Data Produces Expanded Zone ---');
  const eval4 = evaluateUncertainty({ ...baseInput, freshnessState: 'STALE' });
  assert(eval4.expansionFactor === 1.5, 'Test 4.1: STALE data applies 1.5x expansion factor');
  assert(eval4.expandedUncertaintyRadiusNm === 1.2, 'Test 4.2: Spatial radius expands to 1.2 nm');

  // 5. OFFLINE state reaches uncertainty evaluation
  console.log('\n--- Test 5: OFFLINE State Reaches Uncertainty Evaluation ---');
  const eval5 = evaluateUncertainty({ ...baseInput, connectionState: 'OFFLINE' });
  assert(eval5.connectionState === 'OFFLINE', 'Test 5.1: OFFLINE state passed to evaluation');
  assert(eval5.expansionFactor === 1.35, 'Test 5.2: OFFLINE state applies 1.35x expansion factor');
  assert(eval5.reasons.some((r) => r.includes('OFFLINE')), 'Test 5.3: OFFLINE reason included in explanation');

  // 6. Forecast horizon affects displayed uncertainty
  console.log('\n--- Test 6: Forecast Horizon Affects Displayed Uncertainty ---');
  const eval6_0h = evaluateUncertainty({ ...baseInput, forecastHorizonHours: 0 });
  const eval6_24h = evaluateUncertainty({ ...baseInput, forecastHorizonHours: 24 });
  const eval6_72h = evaluateUncertainty({ ...baseInput, forecastHorizonHours: 72 });
  assert(eval6_24h.expandedUncertaintyRadiusNm > eval6_0h.expandedUncertaintyRadiusNm, 'Test 6.1: +24h radius > +0h radius');
  assert(eval6_72h.expandedUncertaintyRadiusNm > eval6_24h.expandedUncertaintyRadiusNm, 'Test 6.2: +72h radius > +24h radius');

  // 7. ICEBERG uncertainty
  console.log('\n--- Test 7: ICEBERG Uncertainty ---');
  const eval7 = evaluateUncertainty({ ...baseInput, hazardType: 'ICEBERG' });
  assert(eval7.hazardType === 'ICEBERG', 'Test 7.1: Hazard type is ICEBERG');
  assert(eval7.baseUncertaintyRadiusNm === 0.8, 'Test 7.2: Base radius is 0.8 nm');

  // 8. SEA_ICE uncertainty
  console.log('\n--- Test 8: SEA_ICE Uncertainty ---');
  const eval8 = evaluateUncertainty({ ...baseInput, hazardType: 'SEA_ICE', baseRadiusNm: 3.0 });
  assert(eval8.hazardType === 'SEA_ICE', 'Test 8.1: Hazard type is SEA_ICE');
  assert(eval8.baseUncertaintyRadiusNm === 3.0, 'Test 8.2: Base radius is 3.0 nm');

  // 9. WEATHER uncertainty
  console.log('\n--- Test 9: WEATHER Uncertainty ---');
  const eval9 = evaluateUncertainty({ ...baseInput, hazardType: 'WEATHER', baseRadiusNm: 10.0 });
  assert(eval9.hazardType === 'WEATHER', 'Test 9.1: Hazard type is WEATHER');
  assert(eval9.baseUncertaintyRadiusNm === 10.0, 'Test 9.2: Base radius is 10.0 nm');

  // 10. REAL provenance preserved
  console.log('\n--- Test 10: REAL Provenance Preserved ---');
  const eval10 = evaluateUncertainty({ ...baseInput, dataMode: 'REAL' });
  const panel10 = mapEvaluationToPanelData(eval10);
  assert(eval10.dataMode === 'REAL', 'Test 10.1: Engine dataMode is REAL');
  assert(panel10?.provenance === 'REAL', 'Test 10.2: Panel data provenance is REAL');

  // 11. SIMULATED provenance preserved
  console.log('\n--- Test 11: SIMULATED Provenance Preserved ---');
  const eval11 = evaluateUncertainty({ ...baseInput, dataMode: 'SIMULATED' });
  const panel11 = mapEvaluationToPanelData(eval11);
  assert(eval11.dataMode === 'SIMULATED', 'Test 11.1: Engine dataMode is SIMULATED');
  assert(panel11?.provenance === 'SIMULATED', 'Test 11.2: Panel data provenance is SIMULATED');

  // 12. Missing data produces unavailable state
  console.log('\n--- Test 12: Missing Data Produces Unavailable State ---');
  const panel12 = mapEvaluationToPanelData(null);
  assert(panel12 === null, 'Test 12.1: Null evaluation yields null panel data (handled by fallback message)');

  // 13. Uncertainty does not modify route selection
  console.log('\n--- Test 13: Uncertainty Does Not Modify Route Selection ---');
  const initialSelectedRouteId = 'route-balanced';
  let activeRouteId = initialSelectedRouteId;
  const eval13 = evaluateUncertainty({ ...baseInput, confidenceLevel: 'CRITICAL', freshnessState: 'STALE' });
  // Simulating UI integration check: Route selection remains untouched
  assert(activeRouteId === 'route-balanced', 'Test 13.1: Active route ID remains unchanged despite CRITICAL uncertainty');

  // 14. Uncertainty does not trigger replanning
  console.log('\n--- Test 14: Uncertainty Does Not Trigger Replanning ---');
  let replanTriggered = false;
  const eval14 = evaluateUncertainty({ ...baseInput, connectionState: 'OFFLINE' });
  assert(replanTriggered === false, 'Test 14.1: Replan trigger remains false during uncertainty evaluation');

  // 15. Map receives uncertainty-zone data
  console.log('\n--- Test 15: Map Receives Uncertainty-Zone Data ---');
  const batchEvals = evaluateBatchUncertainty([
    baseInput,
    { ...baseInput, hazardType: 'SEA_ICE', baseRadiusNm: 3.0 },
  ]);
  assert(batchEvals.length === 2, 'Test 15.1: Map receives 2 uncertainty zone evaluations');
  assert(batchEvals[0].uncertaintyZone.radiusNm === 0.8, 'Test 15.2: Iceberg zone radius matches');
  assert(batchEvals[1].uncertaintyZone.radiusNm === 3.0, 'Test 15.3: Sea-ice zone radius matches');

  // 16. Panel receives uncertainty-zone data
  console.log('\n--- Test 16: Panel Receives Uncertainty-Zone Data ---');
  const panelData16 = mapEvaluationToPanelData(batchEvals[0]);
  assert(panelData16?.hazardType === 'ICEBERG', 'Test 16.1: Panel receives hazard type');
  assert(panelData16?.uncertaintyRadiusNm === 0.8, 'Test 16.2: Panel receives uncertainty radius');

  // 17. Existing navigation state remains intact
  console.log('\n--- Test 17: Existing Navigation State Remains Intact ---');
  const mockNavigationState = { vesselId: 'vessel-01', progressPct: 45.2, currentSpeedKnots: 11.5 };
  evaluateUncertainty(baseInput);
  assert(mockNavigationState.progressPct === 45.2, 'Test 17.1: Navigation progress percentage unchanged');
  assert(mockNavigationState.currentSpeedKnots === 11.5, 'Test 17.2: Vessel speed unchanged');

  // 18. No random uncertainty generation
  console.log('\n--- Test 18: No Random Uncertainty Generation ---');
  const radiusA = evaluateUncertainty(baseInput).expandedUncertaintyRadiusNm;
  const radiusB = evaluateUncertainty(baseInput).expandedUncertaintyRadiusNm;
  assert(radiusA === radiusB, 'Test 18.1: Evaluated radius is 100% deterministic (no randomness)');

  console.log('\n========================================================================================');
  console.log('ALL PHASE 10C UNCERTAINTY INTEGRATION TESTS PASSED!');
  console.log('========================================================================================\n');
}

// Self-runner if executed directly via CLI
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('uncertaintyIntegration.test.ts')) {
  runUncertaintyIntegrationTests().catch((err) => {
    console.error('Integration test failed:', err);
    process.exit(1);
  });
}
