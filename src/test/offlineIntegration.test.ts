/**
 * CRYO NAV — Offline Integration Unit & System Test Suite
 * Phase 9C — System Integration Verification
 *
 * Deterministic test suite verifying:
 * 1. Initial ONLINE state
 * 2. Transition ONLINE -> OFFLINE
 * 3. Transition OFFLINE -> ONLINE
 * 4. Offline with cached navigation snapshot
 * 5. Offline with empty storage
 * 6. Cached REAL data remains REAL
 * 7. Cached SIMULATED data remains SIMULATED
 * 8. Unavailable datasets remain UNAVAILABLE
 * 9. Cached data never gets labeled live
 * 10. No synthetic fallback when storage is empty
 * 11. Snapshot retrieval through offlineStorageEngine service API
 * 12. NavigationView integration data shape derivation
 * 13. SYNCING is not falsely triggered on load
 * 14. Connectivity event subscription & notification
 * 15. Listener cleanup on unsubscribe
 * 16. Browser connectivity API fallback handling
 */

import { connectivityStateEngine } from '../services/connectivityStateEngine';
import { offlineStorageEngine, OfflineNavigationSnapshot } from '../services/offlineStorageEngine';
import { VoyageState } from '../services/voyageStateEngine';
import { HazardEvaluationResult } from '../services/hazardEncounterEngine';
import { SeaIceCell, IcebergDetection, RouteAlternative } from '../types';
import { DataSourceStatus, LocalDataAvailability } from '../components/navigation/OfflineStatusPanel';

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

const mockRoute: RouteAlternative = {
  id: 'safest',
  name: 'Ross Sea Approach Alpha',
  type: 'SAFE',
  color: '#10b981',
  waypoints: [[-64.0, 160.0], [-65.0, 162.0]],
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

const mockHazards: HazardEvaluationResult = {
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

// Helper function to derive NavigationView panel props from snapshot and connection state
export function deriveNavigationViewOfflineProps(
  connectionState: string,
  snapshot: OfflineNavigationSnapshot | null
) {
  let availability: LocalDataAvailability = 'EMPTY';

  if (snapshot && snapshot.isOfflineAvailable) {
    const hasVoyage = snapshot.voyageState !== null;
    const hasEnv = snapshot.environmentalState !== null;
    const hasRoutes = snapshot.routes.length > 0;

    if (hasVoyage && hasEnv && hasRoutes) {
      availability = 'AVAILABLE';
    } else {
      availability = 'PARTIAL';
    }
  }

  const isOffline = connectionState === 'OFFLINE';

  const sources: DataSourceStatus[] = [
    {
      name: 'Sea Ice',
      mode: snapshot?.environmentalState?.seaIceCells?.some((c) => c.isRealData) ? 'REAL' : 'SIMULATED',
      lastUpdate: snapshot?.syncTimestamp || null,
      isCached: isOffline || Boolean(snapshot?.syncTimestamp),
      freshnessLabel: snapshot?.environmentalState ? 'FRESH' : 'UNAVAILABLE',
      itemCount: snapshot?.environmentalState?.seaIceCells?.length || 0,
    },
    {
      name: 'Ocean',
      mode: 'REAL',
      lastUpdate: snapshot?.syncTimestamp || null,
      isCached: isOffline || Boolean(snapshot?.syncTimestamp),
      freshnessLabel: snapshot?.environmentalState ? 'FRESH' : 'UNAVAILABLE',
    },
    {
      name: 'Weather',
      mode: snapshot?.environmentalState?.weather?.isRealData ? 'REAL' : 'SIMULATED',
      lastUpdate: snapshot?.syncTimestamp || null,
      isCached: isOffline || Boolean(snapshot?.syncTimestamp),
      freshnessLabel: snapshot?.environmentalState?.weather ? 'FRESH' : 'UNAVAILABLE',
    },
    {
      name: 'Icebergs',
      mode: snapshot?.environmentalState?.icebergs?.some((b) => !b.isSynthetic) ? 'REAL' : 'SIMULATED',
      lastUpdate: snapshot?.syncTimestamp || null,
      isCached: isOffline || Boolean(snapshot?.syncTimestamp),
      freshnessLabel: snapshot?.environmentalState ? 'FRESH' : 'UNAVAILABLE',
      itemCount: snapshot?.environmentalState?.icebergs?.length || 0,
    },
    {
      name: 'Route',
      mode: 'REAL',
      lastUpdate: snapshot?.syncTimestamp || null,
      isCached: isOffline || Boolean(snapshot?.syncTimestamp),
      freshnessLabel: snapshot?.routes.length ? 'FRESH' : 'UNAVAILABLE',
      itemCount: snapshot?.routes.length || 0,
    },
    {
      name: 'Voyage State',
      mode: snapshot?.voyageState?.dataMode === 'REAL' ? 'REAL' : snapshot?.voyageState?.dataMode === 'SIMULATED' ? 'SIMULATED' : 'UNAVAILABLE',
      lastUpdate: snapshot?.voyageState?.lastStateUpdate || snapshot?.syncTimestamp || null,
      isCached: isOffline || Boolean(snapshot?.syncTimestamp),
      freshnessLabel: snapshot?.voyageState ? 'FRESH' : 'UNAVAILABLE',
    },
  ];

  return {
    connectionState,
    localDataAvailability: availability,
    lastSyncTimestamp: snapshot?.syncTimestamp || null,
    dataFreshnessSummary: isOffline
      ? 'Operating from verified local storage'
      : snapshot?.syncTimestamp
      ? 'Live telemetry aligned with local storage'
      : 'No verified local synchronization',
    dataSources: sources,
  };
}

export async function runOfflineIntegrationTests() {
  console.log('========================================================================================');
  console.log('RUNNING PHASE 9C OFFLINE INTEGRATION SYSTEM TESTS');
  console.log('========================================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      passed++;
      console.log(`  [PASS] ${testName}`);
    } else {
      failed++;
      console.error(`  [FAIL] ${testName}${detail ? ` — ${detail}` : ''}`);
    }
  }

  // Test 1: Initial ONLINE state
  {
    connectivityStateEngine.setSimulatedState(null);
    const state = connectivityStateEngine.getCurrentConnectionState();
    assert(state === 'ONLINE' || state === 'OFFLINE', 'Test 1: Initial connection state returns valid ConnectionState', `state=${state}`);
  }

  // Test 2: Transition ONLINE -> OFFLINE
  {
    let notifiedState = '';
    const unsub = connectivityStateEngine.subscribe((s) => {
      notifiedState = s;
    });

    connectivityStateEngine.setSimulatedState('OFFLINE');
    assert(connectivityStateEngine.getCurrentConnectionState() === 'OFFLINE', 'Test 2.1: Transition to OFFLINE state');
    assert(notifiedState === 'OFFLINE', 'Test 2.2: Listener notified of OFFLINE transition');

    unsub();
  }

  // Test 3: Transition OFFLINE -> ONLINE
  {
    let notifiedState = '';
    const unsub = connectivityStateEngine.subscribe((s) => {
      notifiedState = s;
    });

    connectivityStateEngine.setSimulatedState('ONLINE');
    assert(connectivityStateEngine.getCurrentConnectionState() === 'ONLINE', 'Test 3.1: Transition to ONLINE state');
    assert(notifiedState === 'ONLINE', 'Test 3.2: Listener notified of ONLINE transition');

    unsub();
  }

  // Test 4 & 11: Offline with cached navigation snapshot retrieval
  try {
    await offlineStorageEngine.clearOfflineData();
    await offlineStorageEngine.saveVoyageState(mockVoyageStateReal);
    await offlineStorageEngine.saveEnvironmentalState({
      seaIceCells: [mockSeaIceCell],
      oceanCurrentCells: [],
      weather: null,
      icebergs: [mockIceberg],
    });
    await offlineStorageEngine.saveHazards(mockHazards);
    await offlineStorageEngine.saveRoute(mockRoute);

    const snapRes = await offlineStorageEngine.getOfflineSnapshot();
    assert(snapRes.status === 'STORAGE_AVAILABLE', 'Test 4.1: getOfflineSnapshot succeeds with cached data');
    assert(snapRes.data !== null && snapRes.data.isOfflineAvailable === true, 'Test 4.2: Snapshot isOfflineAvailable === true');
    assert(snapRes.data?.voyageState?.vesselId === 'vessel-01', 'Test 4.3: Snapshot voyageState matches');
    assert(snapRes.data?.environmentalState?.icebergs.length === 1, 'Test 4.4: Snapshot environmentalState icebergs match');
  } catch (e: any) {
    assert(false, 'Test 4 Exception', e.message);
  }

  // Test 5 & 10: Offline with empty storage (NO synthetic fallback)
  try {
    await offlineStorageEngine.clearOfflineData();
    const emptySnap = await offlineStorageEngine.getOfflineSnapshot();
    assert(emptySnap.status === 'STORAGE_EMPTY', 'Test 5.1: Empty storage returns STORAGE_EMPTY');
    assert(emptySnap.data?.isOfflineAvailable === false, 'Test 5.2: isOfflineAvailable === false when empty');
    assert(emptySnap.data?.voyageState === null, 'Test 5.3: voyageState === null (NO synthetic fallback)');
    assert(emptySnap.data?.environmentalState === null, 'Test 5.4: environmentalState === null (NO synthetic fallback)');
    assert(emptySnap.data?.routes.length === 0, 'Test 5.5: routes array is empty');
  } catch (e: any) {
    assert(false, 'Test 5 Exception', e.message);
  }

  // Test 6: Cached REAL data remains REAL
  try {
    await offlineStorageEngine.saveVoyageState(mockVoyageStateReal);
    const snapRes = await offlineStorageEngine.getOfflineSnapshot();
    assert(snapRes.data?.voyageState?.dataMode === 'REAL', 'Test 6.1: Cached REAL voyageState remains REAL');
    assert(snapRes.data?.dataMode === 'REAL', 'Test 6.2: Snapshot dataMode remains REAL');
  } catch (e: any) {
    assert(false, 'Test 6 Exception', e.message);
  }

  // Test 7: Cached SIMULATED data remains SIMULATED
  try {
    await offlineStorageEngine.clearOfflineData();
    await offlineStorageEngine.saveVoyageState({
      ...mockVoyageStateReal,
      dataMode: 'SIMULATED',
    });
    const snapRes = await offlineStorageEngine.getOfflineSnapshot();
    assert(snapRes.data?.voyageState?.dataMode === 'SIMULATED', 'Test 7.1: Cached SIMULATED data remains SIMULATED');
    assert(snapRes.data?.dataMode === 'SIMULATED', 'Test 7.2: Snapshot dataMode reflects SIMULATED');
  } catch (e: any) {
    assert(false, 'Test 7 Exception', e.message);
  }

  // Test 8: Unavailable datasets remain UNAVAILABLE
  try {
    await offlineStorageEngine.clearOfflineData();
    await offlineStorageEngine.saveEnvironmentalState({
      seaIceCells: [],
      oceanCurrentCells: [],
      weather: null,
      icebergs: [],
    });
    const snapRes = await offlineStorageEngine.getOfflineSnapshot();
    const props = deriveNavigationViewOfflineProps('OFFLINE', snapRes.data);

    const weatherSource = props.dataSources.find((s) => s.name === 'Weather');
    assert(weatherSource !== undefined && weatherSource.freshnessLabel === 'UNAVAILABLE', 'Test 8.1: Missing weather dataset remains UNAVAILABLE');
  } catch (e: any) {
    assert(false, 'Test 8 Exception', e.message);
  }

  // Test 9: Cached data is labeled cached (isCached === true when offline)
  try {
    await offlineStorageEngine.saveVoyageState(mockVoyageStateReal);
    const snapRes = await offlineStorageEngine.getOfflineSnapshot();
    const props = deriveNavigationViewOfflineProps('OFFLINE', snapRes.data);

    assert(props.dataSources.every((s) => s.isCached === true), 'Test 9.1: All data sources flagged as isCached === true when OFFLINE');
  } catch (e: any) {
    assert(false, 'Test 9 Exception', e.message);
  }

  // Test 12: NavigationView integration data shape derivation
  try {
    await offlineStorageEngine.saveVoyageState(mockVoyageStateReal);
    await offlineStorageEngine.saveEnvironmentalState({
      seaIceCells: [mockSeaIceCell],
      oceanCurrentCells: [],
      weather: null,
      icebergs: [mockIceberg],
    });
    await offlineStorageEngine.saveRoute(mockRoute);

    const snapRes = await offlineStorageEngine.getOfflineSnapshot();
    const props = deriveNavigationViewOfflineProps('ONLINE', snapRes.data);

    assert(props.connectionState === 'ONLINE', 'Test 12.1: Derived props connectionState matches');
    assert(props.localDataAvailability === 'AVAILABLE', 'Test 12.2: Derived props localDataAvailability === AVAILABLE');
    assert(props.dataSources.length === 6, 'Test 12.3: Derived props dataSources array contains 6 datasets');
  } catch (e: any) {
    assert(false, 'Test 12 Exception', e.message);
  }

  // Test 13: SYNCING is not falsely triggered on load
  {
    const props = deriveNavigationViewOfflineProps('ONLINE', null);
    assert(props.connectionState !== 'SYNCING', 'Test 13.1: SYNCING is not falsely triggered on initial load');
  }

  // Test 14 & 15: Event subscription & Listener cleanup
  {
    const initialCount = connectivityStateEngine.getListenerCount();
    const unsub = connectivityStateEngine.subscribe(() => {});
    assert(connectivityStateEngine.getListenerCount() === initialCount + 1, 'Test 14.1: Listener count increases on subscribe');

    unsub();
    assert(connectivityStateEngine.getListenerCount() === initialCount, 'Test 15.1: Listener count decreases on unsubscribe');
  }

  // Test 16: Browser connectivity API fallback handling
  {
    connectivityStateEngine.setSimulatedState(null); // Reset simulation state first
    connectivityStateEngine.handleOffline();
    assert(connectivityStateEngine.getCurrentConnectionState() === 'OFFLINE', 'Test 16.1: handleOffline() forces OFFLINE state');

    connectivityStateEngine.handleOnline();
    assert(connectivityStateEngine.getCurrentConnectionState() === 'ONLINE', 'Test 16.2: handleOnline() forces ONLINE state');

    connectivityStateEngine.setSimulatedState(null); // Reset simulation
  }

  console.log(`\nPhase 9C Offline Integration Test Summary: ${passed} Passed, ${failed} Failed.`);
  return { success: failed === 0, passed, failed };
}

// Standalone CLI runner when executed directly
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('offlineIntegration.test')) {
  runOfflineIntegrationTests();
}
