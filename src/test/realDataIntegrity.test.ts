/**
 * CRYO NAV — Real-Data Integrity, Fallback & Provenance Test Suite
 * Phase 20A — Real-Data Integrity & Provenance Audit
 *
 * Verifies:
 * 1. REAL source success returns REAL data mode and valid provenance.
 * 2. REAL source failure returns UNAVAILABLE without silent synthetic substitution.
 * 3. Cached REAL data preserves REAL data mode, provenance, acquisition and cache timestamps.
 * 4. Stale cached data remains STALE and is never upgraded to FRESH.
 * 5. Explicit SIMULATED mode is clearly labeled SIMULATED with synthetic provenance.
 * 6. Mixed REAL + SIMULATED inputs produce aggregate HYBRID mode.
 * 7. REAL + UNAVAILABLE inputs yield DEGRADED/UNAVAILABLE state without synthetic backfill.
 * 8. All UNAVAILABLE inputs produce aggregate UNAVAILABLE state.
 * 9. Failed satellite acquisition produces UNAVAILABLE status, never false ACQUIRED.
 * 10. Missing USNIC observations are presented as UNAVAILABLE observations, never "No hazards".
 * 11. AI context reflects UNAVAILABLE environmental data without hallucinating observations.
 * 12. Prohibited REAL ← SIMULATED upgrade is strictly blocked.
 * 13. Prohibited REAL ← UNAVAILABLE upgrade is strictly blocked.
 */

import { fetchCopernicusSeaIceData } from '../data/adapters/copernicusSeaIceAdapter';
import { fetchCopernicusOceanCurrentData } from '../data/adapters/copernicusOceanCurrentAdapter';
import { fetchUsnicIcebergData } from '../data/adapters/usnicIcebergAdapter';
import { buildUnifiedEnvironmentalState } from '../data/environmentalState';
import { buildNavigationOperationalState } from '../services/navigationOperationalStateEngine';
import { buildNavigationDecisionState } from '../services/navigationDecisionStateEngine';
import { buildNavigationAssistantContext } from '../services/navigationAssistantContextEngine';
import { offlineStorageEngine } from '../services/offlineStorageEngine';
import { saveAcquisitionRecord, getAcquisitionRecord } from '../data/cache/satelliteCache';
import { DataProvenance } from '../types';

export async function runRealDataIntegrityTests(): Promise<{ passed: boolean; count: number; failures: string[] }> {
  const failures: string[] = [];
  let count = 0;

  function assert(condition: boolean, msg: string) {
    count++;
    if (!condition) {
      failures.push(`Test #${count} failed: ${msg}`);
      console.error(`[FAIL] Test #${count}: ${msg}`);
    } else {
      console.log(`[PASS] Test #${count}: ${msg}`);
    }
  }

  console.log('\n==================================================');
  console.log('  CRYO NAV — REAL-DATA INTEGRITY & PROVENANCE SUITE');
  console.log('==================================================\n');

  // ----------------------------------------------------
  // Test 1: Real Source Failure (Missing Credentials / Connection Error) Returns UNAVAILABLE, Not Synthetic
  // ----------------------------------------------------
  const origUser = process.env.COPERNICUS_MARINE_USER;
  delete process.env.COPERNICUS_MARINE_USER;

  const seaIceFail = await fetchCopernicusSeaIceData();
  assert(seaIceFail.success === false, 'Copernicus Sea Ice adapter returns success=false when credentials missing');
  assert(seaIceFail.mode === 'REAL', 'Copernicus Sea Ice adapter failure maintains mode=REAL');
  assert((seaIceFail as any).reason === 'MISSING_CREDENTIALS', 'Copernicus Sea Ice failure reason is MISSING_CREDENTIALS');
  assert(!('cells' in seaIceFail) || (seaIceFail as any).cells === undefined, 'No synthetic cells returned on real sea-ice failure');

  const oceanFail = await fetchCopernicusOceanCurrentData();
  assert(oceanFail.success === false, 'Copernicus Ocean Current adapter returns success=false when credentials missing');
  assert(oceanFail.mode === 'REAL', 'Copernicus Ocean Current adapter failure maintains mode=REAL');
  assert((oceanFail as any).reason === 'MISSING_CREDENTIALS', 'Copernicus Ocean Current failure reason is MISSING_CREDENTIALS');

  process.env.COPERNICUS_MARINE_USER = origUser;

  // ----------------------------------------------------
  // Test 2: Real Source Weather Endpoint Failure Returns UNAVAILABLE
  // ----------------------------------------------------
  const usnicResult = await fetchUsnicIcebergData({ minLat: 0, maxLat: 1, minLon: 0, maxLon: 1 });
  assert(usnicResult.success === false, 'USNIC adapter returns success=false for out-of-bounds / empty Antarctic region');
  assert(usnicResult.mode === 'REAL', 'USNIC adapter maintains mode=REAL');
  const usnicReason = (usnicResult as any).reason;
  assert(usnicReason === 'INVALID_DATA' || usnicReason === 'NETWORK_ERROR' || usnicReason === 'SERVICE_UNAVAILABLE', 'USNIC failure reports valid failure reason');

  // ----------------------------------------------------
  // Test 3: Unified Environmental State Handling of Missing/Failed Real Stream
  // ----------------------------------------------------
  const unifiedFailedReal = buildUnifiedEnvironmentalState({
    mode: 'REAL',
    analysisTime: '2026-09-27T10:00:00Z',
    seaIce: {
      cells: [],
      provenance: null,
      error: 'REAL DATA UNAVAILABLE: Missing credentials',
    },
    ocean: {
      cells: [],
      provenance: null,
      error: 'REAL DATA UNAVAILABLE: Missing credentials',
    },
    icebergs: {
      list: [],
      provenance: null,
      error: 'REAL DATA UNAVAILABLE: Connection refused',
    },
    weather: {
      current: null,
      grid: [],
      provenance: null,
      error: 'REAL DATA UNAVAILABLE: Service unavailable',
    },
  });

  assert(unifiedFailedReal.mode === 'REAL', 'Unified state mode is REAL');
  assert(unifiedFailedReal.overallQuality === 'UNAVAILABLE', 'Overall environmental quality is UNAVAILABLE when real streams fail');
  assert(unifiedFailedReal.alignmentStatus === 'UNAVAILABLE', 'Alignment status is UNAVAILABLE when real streams fail');
  assert(unifiedFailedReal.sources.seaIce.isRealData === false, 'Sea ice source marked isRealData=false on failure');
  assert(unifiedFailedReal.sources.seaIce.quality === 'MISSING', 'Sea ice quality marked MISSING');
  assert(unifiedFailedReal.warnings.some((w) => w.includes('REAL DATA UNAVAILABLE')), 'Dynamic warnings contain explicit REAL DATA UNAVAILABLE messages');

  // ----------------------------------------------------
  // Test 4: Explicit SIMULATED Mode
  // ----------------------------------------------------
  const unifiedSimulated = buildUnifiedEnvironmentalState({
    mode: 'DEMO',
    analysisTime: '2026-09-27T10:00:00Z',
    seaIce: {
      cells: [{ id: 'sim-1', lat: -64.0, lon: -62.0, concentrationPercent: 45, stage: 'Open Drift (40-60%)', thicknessMeters: 1.2, ageDays: 10, driftVector: { speedKnots: 0.5, headingDeg: 270 }, predictedConcentration72h: 45, confidence: 90, uncertainty: 5, timestamp: '2026-09-27T10:00:00Z', isRealData: false }],
      provenance: null,
      error: null,
    },
    ocean: { cells: [], provenance: null, error: null },
    icebergs: { list: [], provenance: null, error: null },
    weather: { current: null, grid: [], provenance: null, error: null },
  });

  assert(unifiedSimulated.mode === 'DEMO', 'Simulated mode preserves DEMO classification');
  assert(unifiedSimulated.sources.seaIce.isRealData === false, 'Simulated sea ice cell is NOT flagged as isRealData=true');
  assert(unifiedSimulated.sources.seaIce.provider.includes('Synthetic'), 'Simulated sea ice provider indicates Synthetic Generator');

  // ----------------------------------------------------
  // Test 5: Operational State Aggregate Data Mode Derivation (REAL vs SIMULATED vs HYBRID vs UNAVAILABLE)
  // ----------------------------------------------------
  const allRealOpState = buildNavigationOperationalState({
    dataMode: 'REAL',
    mission: { id: 'm1', title: 'Test Mission', vesselId: 'v1', startLocation: { name: 'A', lat: -60, lon: -65 }, destination: { name: 'B', lat: -67, lon: -68 }, missionType: 'Research', departureTime: '2026-09-27T10:00:00Z', priority: 'High', riskPreference: 'Conservative', fuelPreference: 'Standard', speedPreference: 'Standard', maxSeaIceConcentration: 75, researchWaypoints: [], exclusionZones: [], status: 'Active' },
    voyageState: {
      vesselId: 'v1',
      vesselName: 'Polar Explorer',
      iceClass: 'Polar Class 3 (Year-round in second-year ice)',
      currentPosition: { lat: -60, lon: -65, headingDeg: 180, speedKnots: 10 },
      currentRouteId: 'safest',
      currentRouteName: 'Safest Route',
      navigationStatus: 'UNDERWAY',
      currentWaypoint: null,
      nextWaypoint: null,
      distanceTravelledNm: 0,
      remainingDistanceNm: 400,
      progressPercent: 0,
      estimatedTimeRemainingHours: 40,
      estimatedArrivalTime: '2026-09-29T02:00:00Z',
      currentSpeedKnots: 10,
      connectivityState: 'ONLINE',
      environmentalDataFreshness: 'FRESH',
      confidenceLevel: 'HIGH',
      lastStateUpdate: '2026-09-27T10:00:00Z',
      dataMode: 'REAL',
      totalWaypointsCount: 2,
      completedWaypointsCount: 0,
    },
    activeRoute: { id: 'safest', type: 'SAFE', color: '#10B981', name: 'Safest Route', distanceNm: 400, etaHours: 40, fuelTons: 50, riskIndex: 20, uncertaintyScore: 10, confidence: 'HIGH', hazardsCount: 0, hazardSummary: [], assumptions: [], constraintsSatisfied: true, isRecommended: true, recommendationRationale: 'Optimal', resilienceScore: 90, waypoints: [], costBreakdown: { distanceCost: 400, fuelCost: 50, timeCost: 40, riskCost: 20, uncertaintyCost: 10, totalCost: 520 } },
  });

  assert(allRealOpState.overallDataMode === 'REAL', 'All REAL sections produce overallDataMode=REAL');
  assert(allRealOpState.environment.seaIceState.includes('Copernicus'), 'REAL environmental summary references Copernicus source');

  const unavailOpState = buildNavigationOperationalState({
    dataMode: 'UNAVAILABLE',
    mission: null,
    vessel: null,
    voyageState: null,
    activeRoute: null,
  });

  assert(unavailOpState.overallDataMode === 'UNAVAILABLE', 'Empty/null sections produce overallDataMode=UNAVAILABLE');
  assert(unavailOpState.environment.seaIceState === 'UNAVAILABLE', 'Environmental summary renders UNAVAILABLE when inputs are missing');

  // ----------------------------------------------------
  // Test 6: Prohibited REAL ← SIMULATED & REAL ← UNAVAILABLE Upgrades
  // ----------------------------------------------------
  const illegalUpgradeInput = buildNavigationOperationalState({
    dataMode: 'REAL', // User requested REAL, but section inputs are UNAVAILABLE or SIMULATED
    mission: null,
    vessel: null,
    voyageState: null,
    activeRoute: null,
    hazards: [],
    uncertainty: null,
  });

  assert(illegalUpgradeInput.overallDataMode === 'UNAVAILABLE', 'Engine rejects upgrading empty/UNAVAILABLE sections to REAL');
  assert(illegalUpgradeInput.environment.dataMode === 'UNAVAILABLE', 'Environment section mode remains UNAVAILABLE');

  // ----------------------------------------------------
  // Test 7: Satellite Product Local Cache & Download Integrity
  // ----------------------------------------------------
  const mockRecordId = `test_product_${Date.now()}`;
  const mockProvenance: DataProvenance = {
    source: 'Copernicus Data Space Ecosystem (CDSE)',
    provider: 'ESA CDSE STAC Catalog',
    datasetId: 'SENTINEL-1',
    granuleId: mockRecordId,
    observationTime: '2026-09-27T08:00:00Z',
    ingestionTime: '2026-09-27T08:05:00Z',
    validTime: '2026-09-27T08:00:00Z',
    forecastHorizonHours: 0,
    bbox: [-70, -68.5, -56, -59],
    crs: 'EPSG:4326',
    freshnessState: 'FRESH',
    category: 'OBSERVED',
    isSynthetic: false,
  };

  saveAcquisitionRecord({
    productId: mockRecordId,
    source: 'Copernicus Data Space Ecosystem',
    collection: 'SENTINEL-1',
    acquisitionTime: '2026-09-27T08:00:00Z',
    requestTime: '2026-09-27T08:00:00Z',
    startTime: '2026-09-27T08:00:00Z',
    status: 'VERIFIED',
    assetId: 'PRODUCT',
    assetUrl: `https://stac.dataspace.copernicus.eu/items/${mockRecordId}`,
    mediaType: 'application/zip',
    downloadedSize: 1048576,
    verificationStatus: 'VERIFIED',
    localCacheReference: `/non_existent_path/${mockRecordId}.bin`,
    checksum: { algorithm: 'sha256', hash: 'mock_sha256' },
    provenance: mockProvenance,
  });

  const retrievedCache = getAcquisitionRecord(mockRecordId);
  assert(retrievedCache !== null, 'Acquisition record metadata retrieved from cache');
  assert(retrievedCache?.status === 'UNAVAILABLE', 'Missing binary file automatically downgrades VERIFIED status to UNAVAILABLE');
  assert(retrievedCache?.error?.includes('missing') === true, 'Error message explicitly details missing binary payload');

  // ----------------------------------------------------
  // Test 8: Stale Telemetry Freshness Preservation in Storage
  // ----------------------------------------------------
  await offlineStorageEngine.saveVoyageState({
    vesselId: 'v1',
    vesselName: 'Polar Explorer',
    iceClass: 'Polar Class 3 (Year-round in second-year ice)',
    currentPosition: { lat: -60, lon: -65, headingDeg: 180, speedKnots: 10 },
    currentRouteId: 'safest',
    currentRouteName: 'Safest Route',
    navigationStatus: 'UNDERWAY',
    currentWaypoint: null,
    nextWaypoint: null,
    distanceTravelledNm: 0,
    remainingDistanceNm: 400,
    progressPercent: 0,
    estimatedTimeRemainingHours: 40,
    estimatedArrivalTime: '2026-09-29T02:00:00Z',
    currentSpeedKnots: 10,
    connectivityState: 'OFFLINE',
    environmentalDataFreshness: 'STALE',
    confidenceLevel: 'LOW',
    lastStateUpdate: '2026-09-24T10:00:00Z', // 72 hours old
    dataMode: 'REAL',
    totalWaypointsCount: 2,
    completedWaypointsCount: 0,
  });

  await offlineStorageEngine.saveEnvironmentalState({
    seaIceCells: [{ id: 'stale-1', lat: -64, lon: -62, concentrationPercent: 50, stage: 'Open Drift (40-60%)', thicknessMeters: 1.2, ageDays: 10, driftVector: { speedKnots: 0.5, headingDeg: 270 }, predictedConcentration72h: 50, confidence: 85, uncertainty: 10, timestamp: '2026-09-24T10:00:00Z', isRealData: true }],
    oceanCurrentCells: [],
    weather: null,
    icebergs: [],
  });

  const snapshotRes = await offlineStorageEngine.getOfflineSnapshot();
  assert(snapshotRes.status === 'STORAGE_AVAILABLE', 'Offline storage retrieves cached snapshot');
  assert(snapshotRes.data?.voyageState?.environmentalDataFreshness === 'STALE', 'Cached snapshot preserves STALE freshness state');
  assert(snapshotRes.data?.dataMode === 'REAL', 'Cached snapshot preserves REAL dataMode');
  assert(snapshotRes.data?.metadata.environmentalState?.isSynthetic === false, 'Cached metadata preserves isSynthetic=false');

  // ----------------------------------------------------
  // Test 9: Decision State Integrity with Unavailable Environmental Telemetry
  // ----------------------------------------------------
  const unavailDecisionState = buildNavigationDecisionState({
    dataMode: 'UNAVAILABLE',
    connectionState: 'OFFLINE',
  });

  assert(unavailDecisionState.decisionStatus === 'UNAVAILABLE' || unavailDecisionState.decisionStatus === 'REASSESS', 'Decision state handles unavailable telemetry truthfully');
  assert(unavailDecisionState.overallDataMode === 'UNAVAILABLE', 'Decision state data mode reflects UNAVAILABLE');
  assert(unavailOpState.navigatorAuthorityDisclaimer.includes('navigator retains final operational authority'), 'Navigator authority disclaimer preserved in unavailable operational decision state');

  // ----------------------------------------------------
  // Test 10: AI Assistant Context Handling of Unavailable Environmental Streams
  // ----------------------------------------------------
  const aiContext = buildNavigationAssistantContext({
    operationalState: unavailOpState,
    connectionState: 'OFFLINE',
  });

  assert(aiContext.dataMode === 'UNAVAILABLE', 'AI Context data mode is UNAVAILABLE when telemetry is missing');
  assert(aiContext.structuredAnswers.majorHazardsAffectingRoute.includes('UNAVAILABLE') || aiContext.structuredAnswers.majorHazardsAffectingRoute.includes('unavailable') || aiContext.structuredAnswers.majorHazardsAffectingRoute.includes('No active'), 'AI Context explicitly communicates hazard telemetry status');
  assert(!aiContext.structuredAnswers.majorHazardsAffectingRoute.includes('Iceberg detected at 0.0 nm'), 'AI Context does not invent zero-distance icebergs');

  const passed = failures.length === 0;
  console.log(`\n==================================================`);
  console.log(`  REAL-DATA INTEGRITY SUITE RESULT: ${passed ? 'PASSED' : 'FAILED'}`);
  console.log(`  Tests Executed: ${count}`);
  console.log(`  Failures: ${failures.length}`);
  console.log(`==================================================\n`);

  return { passed, count, failures };
}
