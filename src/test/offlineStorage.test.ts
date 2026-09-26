/**
 * CRYO NAV — Offline Storage Engine Test Suite
 * Phase 9A Unit & Integration Verification
 *
 * Deterministic test suite verifying:
 * 1. Database initialization
 * 2. Empty storage state handling
 * 3. Save voyage state
 * 4. Retrieve voyage state
 * 5. Save environmental state
 * 6. Retrieve environmental state
 * 7. Save hazards
 * 8. Retrieve hazards
 * 9. Save route / routes
 * 10. Retrieve route / routes
 * 11. Offline navigation snapshot generation
 * 12. Metadata persistence & retrieval
 * 13. Last synchronization timestamp
 * 14. Storage clear operation
 * 15. Missing record behavior (STORAGE_EMPTY)
 * 16. Storage error behavior handling
 * 17. REAL vs SIMULATED data mode preservation
 * 18. Repeated writes / update behavior
 * 19. Database versioning & schema handling
 * 20. Strict NO synthetic fallback verification
 */

import { offlineStorageEngine } from '../services/offlineStorageEngine';
import { VoyageState } from '../services/voyageStateEngine';
import { HazardEvaluationResult } from '../services/hazardEncounterEngine';
import { RouteAlternative, SeaIceCell, IcebergDetection } from '../types';

// Deterministic Test Fixtures
const mockVoyageStateReal: VoyageState = {
  vesselId: 'vessel-01',
  vesselName: 'R/V Nathaniel B. Palmer',
  iceClass: 'Polar Class 3',
  currentPosition: { lat: -64.5, lon: 160.5, headingDeg: 180, speedKnots: 12.5 },
  currentRouteId: 'safest',
  currentRouteName: 'Ross Sea Approach Alpha',
  navigationStatus: 'UNDERWAY',
  currentWaypoint: { index: 1, name: 'WP1-Cape Adare', lat: -64.0, lon: 160.0, distanceToNm: 0 },
  nextWaypoint: { index: 2, name: 'WP2-Coulman Island', lat: -65.0, lon: 162.0, distanceToNm: 45.2 },
  totalWaypointsCount: 3,
  completedWaypointsCount: 1,
  distanceTravelledNm: 75.0,
  remainingDistanceNm: 245.0,
  progressPercent: 23.4,
  estimatedTimeRemainingHours: 19.6,
  estimatedArrivalTime: '2026-09-28T05:30:00.000Z',
  currentSpeedKnots: 12.5,
  connectivityState: 'ONLINE',
  environmentalDataFreshness: 'FRESH (1.2h old)',
  confidenceLevel: 'HIGH',
  lastStateUpdate: '2026-09-27T00:00:00.000Z',
  dataMode: 'REAL',
};

const mockVoyageStateSimulated: VoyageState = {
  ...mockVoyageStateReal,
  vesselId: 'vessel-sim-02',
  vesselName: 'Simulated Test Vessel',
  dataMode: 'SIMULATED',
};

const mockRouteAlpha: RouteAlternative = {
  id: 'safest',
  name: 'Ross Sea Approach Alpha',
  type: 'SAFE',
  color: '#10b981',
  waypoints: [
    [-64.0, 160.0],
    [-65.0, 162.0],
  ],
  distanceNm: 320.0,
  etaHours: 25.6,
  fuelTons: 28.5,
  riskIndex: 18,
  uncertaintyScore: 12,
  confidence: 'HIGH',
  hazardsCount: 0,
  hazardSummary: [],
  assumptions: [],
  constraintsSatisfied: true,
  isRecommended: true,
  recommendationRationale: 'Clear of heavy pack ice',
  resilienceScore: 95,
  costBreakdown: { distanceCost: 1, fuelCost: 1, timeCost: 1, riskCost: 1, uncertaintyCost: 1, totalCost: 5 },
};

const mockSeaIceCell: SeaIceCell = {
  id: 'ice-cell-1',
  lat: -64.2,
  lon: 160.4,
  concentrationPercent: 35,
  stage: 'Open Drift (40-60%)',
  thicknessMeters: 0.8,
  driftVector: { speedKnots: 0.4, headingDeg: 45 },
  predictedConcentration72h: 40,
  confidence: 90,
  uncertainty: 10,
  timestamp: '2026-09-27T00:00:00.000Z',
  isRealData: true,
};

const mockIceberg: IcebergDetection = {
  id: 'BERG-REAL-01',
  name: 'Tabular A-76a',
  lat: -64.0,
  lon: 160.0,
  sizeCategory: 'Giant Calved Tabular',
  estimatedLengthMeters: 1200,
  estimatedWidthMeters: 800,
  freeboardMeters: 40,
  driftSpeedKnots: 1.1,
  driftHeadingDeg: 180,
  observationTime: '2026-09-27T00:00:00.000Z',
  processingTime: '2026-09-27T00:05:00.000Z',
  confidence: 95,
  uncertaintyRadiusNm: 0.5,
  source: 'Sentinel-1 SAR',
  isSynthetic: false,
  historicalTrack: [],
  predictedTrajectory: [],
};

const mockHazardResult: HazardEvaluationResult = {
  evaluationTime: '2026-09-27T00:00:00.000Z',
  totalHazardsEvaluated: 1,
  activeEncountersCount: 1,
  highestSeverity: 'CRITICAL',
  encounters: [
    {
      hazardId: 'HAZ-BERG-REAL-01',
      hazardType: 'ICEBERG',
      sourceName: 'Sentinel-1 SAR',
      icebergId: 'BERG-REAL-01',
      icebergName: 'Tabular A-76a',
      currentPosition: { lat: -64.0, lon: 160.0 },
      predictedPositionAtCpa: { lat: -64.5, lon: 161.0 },
      nearestRoutePoint: { lat: -64.5, lon: 161.0 },
      cpaNm: 0.2,
      tcaHours: 6.0,
      tcaTimestamp: '2026-09-27T06:00:00.000Z',
      minRouteDistanceNm: 0.2,
      encounterStatus: 'DIRECT_INTERSECTION',
      severity: 'CRITICAL',
      confidence: 95,
      uncertaintyRadiusNm: 0.5,
      explanation: 'CRITICAL ENCOUNTER: CPA of 0.2 nm at +6.0h',
      provenance: 'Copernicus Marine / Sentinel-1 SAR',
      isRealData: true,
      dataStatusLabel: 'REAL',
    },
  ],
  provenance: 'CRYO NAV Phase 8B Kinematic Engine',
};

export async function runOfflineStorageTests(): Promise<{ success: boolean; passed: number; failed: number; log: string[] }> {
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

  log.push('========== PHASE 9A OFFLINE STORAGE ENGINE UNIT TESTS ==========');

  // Test 1: Storage Initialization
  try {
    const initRes = await offlineStorageEngine.initializeOfflineStorage();
    assert(initRes.status === 'STORAGE_AVAILABLE' && initRes.data === true, 'Test 1: Initialize Offline Storage', initRes.message);
  } catch (e: any) {
    assert(false, 'Test 1: Storage Init Exception', e.message);
  }

  // Test 2: Storage Clear & Initial Empty State Check
  try {
    await offlineStorageEngine.clearOfflineData();
    const hasData = await offlineStorageEngine.hasOfflineData();
    const emptyVoyage = await offlineStorageEngine.getVoyageState();
    assert(hasData === false, 'Test 2.1: Initial storage hasOfflineData() is false');
    assert(emptyVoyage.status === 'STORAGE_EMPTY' && emptyVoyage.data === null, 'Test 2.2: Empty storage returns STORAGE_EMPTY & null data');
  } catch (e: any) {
    assert(false, 'Test 2: Empty Storage Check Exception', e.message);
  }

  // Test 3 & 4: Save & Retrieve Voyage State
  try {
    const saveRes = await offlineStorageEngine.saveVoyageState(mockVoyageStateReal);
    assert(saveRes.status === 'STORAGE_AVAILABLE', 'Test 3.1: Save REAL Voyage State');

    const getRes = await offlineStorageEngine.getVoyageState();
    assert(getRes.status === 'STORAGE_AVAILABLE', 'Test 4.1: Retrieve Voyage State status');
    assert(getRes.data !== null && getRes.data.vesselId === 'vessel-01', 'Test 4.2: Voyage state vesselId matches', `vesselId=${getRes.data?.vesselId}`);
    assert(getRes.metadata !== null && getRes.metadata.dataMode === 'REAL', 'Test 4.3: Metadata dataMode is REAL', `dataMode=${getRes.metadata?.dataMode}`);
  } catch (e: any) {
    assert(false, 'Test 3/4: Save & Retrieve Voyage State Exception', e.message);
  }

  // Test 5 & 6: Save & Retrieve Environmental State
  try {
    const envPayload = {
      seaIceCells: [mockSeaIceCell],
      oceanCurrentCells: [],
      weather: null,
      icebergs: [mockIceberg],
    };

    const saveEnvRes = await offlineStorageEngine.saveEnvironmentalState(envPayload);
    assert(saveEnvRes.status === 'STORAGE_AVAILABLE', 'Test 5.1: Save Environmental State');

    const getEnvRes = await offlineStorageEngine.getEnvironmentalState();
    assert(getEnvRes.status === 'STORAGE_AVAILABLE', 'Test 6.1: Retrieve Environmental State status');
    assert(getEnvRes.data !== null && getEnvRes.data.seaIceCells.length === 1, 'Test 6.2: Environmental sea-ice cell count matches');
    assert(getEnvRes.data !== null && getEnvRes.data.icebergs.length === 1, 'Test 6.3: Environmental iceberg count matches');
  } catch (e: any) {
    assert(false, 'Test 5/6: Save & Retrieve Environmental State Exception', e.message);
  }

  // Test 7 & 8: Save & Retrieve Hazard Evaluation Result
  try {
    const saveHazRes = await offlineStorageEngine.saveHazards(mockHazardResult);
    assert(saveHazRes.status === 'STORAGE_AVAILABLE', 'Test 7.1: Save Hazards Result');

    const getHazRes = await offlineStorageEngine.getHazards();
    assert(getHazRes.status === 'STORAGE_AVAILABLE', 'Test 8.1: Retrieve Hazards status');
    assert(getHazRes.data !== null && getHazRes.data.highestSeverity === 'CRITICAL', 'Test 8.2: Hazards highestSeverity matches', `highest=${getHazRes.data?.highestSeverity}`);
  } catch (e: any) {
    assert(false, 'Test 7/8: Save & Retrieve Hazards Exception', e.message);
  }

  // Test 9 & 10: Save & Retrieve Route Alternatives
  try {
    const saveRouteRes = await offlineStorageEngine.saveRoute(mockRouteAlpha);
    assert(saveRouteRes.status === 'STORAGE_AVAILABLE', 'Test 9.1: Save Route Alternative');

    const getRouteRes = await offlineStorageEngine.getRoute('safest');
    assert(getRouteRes.status === 'STORAGE_AVAILABLE', 'Test 10.1: Retrieve Route status');
    assert(getRouteRes.data !== null && getRouteRes.data.id === 'safest', 'Test 10.2: Route ID matches');

    const getAllRoutesRes = await offlineStorageEngine.getRoutes();
    assert(getAllRoutesRes.data !== null && getAllRoutesRes.data.length === 1, 'Test 10.3: getRoutes() array length matches');
  } catch (e: any) {
    assert(false, 'Test 9/10: Save & Retrieve Routes Exception', e.message);
  }

  // Test 11: Offline Navigation Snapshot Generation
  try {
    const snapshotRes = await offlineStorageEngine.getOfflineSnapshot();
    assert(snapshotRes.status === 'STORAGE_AVAILABLE', 'Test 11.1: getOfflineSnapshot status');
    assert(snapshotRes.data !== null && snapshotRes.data.isOfflineAvailable === true, 'Test 11.2: Snapshot isOfflineAvailable === true');
    assert(snapshotRes.data?.voyageState?.vesselId === 'vessel-01', 'Test 11.3: Snapshot contains voyageState');
    assert(snapshotRes.data?.environmentalState?.icebergs.length === 1, 'Test 11.4: Snapshot contains environmentalState');
    assert(snapshotRes.data?.hazards?.activeEncountersCount === 1, 'Test 11.5: Snapshot contains hazards');
    assert(snapshotRes.data?.routes.length === 1, 'Test 11.6: Snapshot contains routes');
  } catch (e: any) {
    assert(false, 'Test 11: Offline Snapshot Exception', e.message);
  }

  // Test 12: Metadata Persistence & Inspection
  try {
    const metaRes = await offlineStorageEngine.getStorageMetadata();
    assert(metaRes.status === 'STORAGE_AVAILABLE', 'Test 12.1: getStorageMetadata status');
    const metaMap = metaRes.data as Record<string, any>;
    assert(metaMap['voyageState'] !== undefined, 'Test 12.2: Voyage state metadata entry exists');
    assert(metaMap['environmentalState'] !== undefined, 'Test 12.3: Environmental state metadata entry exists');
  } catch (e: any) {
    assert(false, 'Test 12: Metadata Persistence Exception', e.message);
  }

  // Test 13: Last Synchronization Timestamp Retrieval
  try {
    const syncTime = await offlineStorageEngine.getLastSyncTime();
    assert(syncTime !== null && typeof syncTime === 'string', 'Test 13.1: getLastSyncTime returns ISO string', `syncTime=${syncTime}`);
  } catch (e: any) {
    assert(false, 'Test 13: Sync Time Exception', e.message);
  }

  // Test 14: Storage Clear Operation
  try {
    const clearRes = await offlineStorageEngine.clearOfflineData();
    assert(clearRes.status === 'STORAGE_AVAILABLE' && clearRes.data === true, 'Test 14.1: clearOfflineData returns success');

    const emptyVoyageAfterClear = await offlineStorageEngine.getVoyageState();
    assert(emptyVoyageAfterClear.status === 'STORAGE_EMPTY', 'Test 14.2: Storage is STORAGE_EMPTY after clear');
  } catch (e: any) {
    assert(false, 'Test 14: Clear Storage Exception', e.message);
  }

  // Test 15: Missing Record Behavior (STORAGE_EMPTY)
  try {
    const missingRoute = await offlineStorageEngine.getRoute('non-existent-route-999');
    assert(missingRoute.status === 'STORAGE_EMPTY' && missingRoute.data === null, 'Test 15.1: Missing route returns STORAGE_EMPTY and null');
  } catch (e: any) {
    assert(false, 'Test 15: Missing Record Exception', e.message);
  }

  // Test 16: Storage Error Behavior Handling
  try {
    offlineStorageEngine.setSimulatedError('STORAGE_READ_ERROR');
    const errorRes = await offlineStorageEngine.getVoyageState();
    assert(errorRes.status === 'STORAGE_READ_ERROR', 'Test 16.1: Simulated read error handled gracefully', `status=${errorRes.status}`);

    offlineStorageEngine.setSimulatedError(null); // Reset error simulation
  } catch (e: any) {
    assert(false, 'Test 16: Error Behavior Exception', e.message);
  }

  // Test 17: REAL vs SIMULATED Data Mode Preservation
  try {
    await offlineStorageEngine.saveVoyageState(mockVoyageStateSimulated);
    const getSimRes = await offlineStorageEngine.getVoyageState();

    assert(getSimRes.data?.dataMode === 'SIMULATED', 'Test 17.1: SIMULATED dataMode is preserved in state', `mode=${getSimRes.data?.dataMode}`);
    assert(getSimRes.metadata?.isSynthetic === true, 'Test 17.2: SIMULATED metadata.isSynthetic is true');
    assert(getSimRes.metadata?.dataMode === 'SIMULATED', 'Test 17.3: SIMULATED metadata.dataMode is SIMULATED');

    await offlineStorageEngine.clearOfflineData();
  } catch (e: any) {
    assert(false, 'Test 17: REAL vs SIMULATED Preservation Exception', e.message);
  }

  // Test 18: Repeated Writes & Update Behavior
  try {
    await offlineStorageEngine.saveVoyageState(mockVoyageStateReal);
    const updatedState: VoyageState = {
      ...mockVoyageStateReal,
      progressPercent: 50.0,
      remainingDistanceNm: 160.0,
    };

    await offlineStorageEngine.saveVoyageState(updatedState);
    const updatedGetRes = await offlineStorageEngine.getVoyageState();

    assert(updatedGetRes.data?.progressPercent === 50.0, 'Test 18.1: Repeated write updates existing record', `progress=${updatedGetRes.data?.progressPercent}%`);
    assert(updatedGetRes.data?.remainingDistanceNm === 160.0, 'Test 18.2: Remaining distance updated');
  } catch (e: any) {
    assert(false, 'Test 18: Repeated Writes Exception', e.message);
  }

  // Test 19: Database Versioning & Record Metadata Schema
  try {
    const metaRes = await offlineStorageEngine.getStorageMetadata('voyageState');
    const meta = metaRes.data as any;
    assert(meta !== null && meta.recordVersion === '1.0.0', 'Test 19.1: Record version 1.0.0 preserved in metadata', `ver=${meta?.recordVersion}`);
    assert(meta?.recordId === 'voyageState', 'Test 19.2: Record ID stored in metadata', `recordId=${meta?.recordId}`);
  } catch (e: any) {
    assert(false, 'Test 19: Version Handling Exception', e.message);
  }

  // Test 20: Strict NO Synthetic Fallback Verification
  try {
    await offlineStorageEngine.clearOfflineData();

    const emptySnapshot = await offlineStorageEngine.getOfflineSnapshot();
    assert(emptySnapshot.status === 'STORAGE_EMPTY', 'Test 20.1: Empty snapshot returns STORAGE_EMPTY status');
    assert(emptySnapshot.data?.isOfflineAvailable === false, 'Test 20.2: isOfflineAvailable === false when empty');
    assert(emptySnapshot.data?.voyageState === null, 'Test 20.3: voyageState === null (NO synthetic fallback data)');
    assert(emptySnapshot.data?.environmentalState === null, 'Test 20.4: environmentalState === null (NO synthetic fallback data)');
    assert(emptySnapshot.data?.routes.length === 0, 'Test 20.5: routes array is empty (NO synthetic fallback data)');
  } catch (e: any) {
    assert(false, 'Test 20: NO Synthetic Fallback Exception', e.message);
  }

  const success = failed === 0;
  log.forEach((l) => console.log(l));
  console.log(`\nPhase 9A Offline Storage Engine Test Summary: ${passed} Passed, ${failed} Failed.`);
  return { success, passed, failed, log };
}

// Standalone CLI runner when executed via npx tsx
runOfflineStorageTests().then((res) => {
  if (!res.success) {
    process.exit(1);
  }
});
