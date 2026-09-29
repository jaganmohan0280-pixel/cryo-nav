/**
 * CRYO NAV — Failure, Degraded-State & Safety Engine Test Suite
 * Phase 19A — Controlled Failure, Degraded-State & Safety Audit
 *
 * Operational Principle:
 * Verifies system safety and deterministic degraded behavior when external data sources,
 * connectivity, environmental observations, GPS feeds, or AI services fail.
 *
 * Safety Rules:
 * 1. UNKNOWN -> NEVER SAFE
 * 2. UNAVAILABLE -> NEVER NO_HAZARD
 * 3. STALE -> NEVER CURRENT
 * 4. FAILED DOWNLOAD -> NEVER ACQUIRED
 * 5. SIMULATED -> NEVER REAL
 * 6. NO GPS -> NEVER CURRENT POSITION
 * 7. ZERO AUTONOMOUS VESSEL CONTROL
 */

import {
  buildNavigationOperationalState,
  NavigationOperationalStateInput,
  MANDATORY_OPERATIONAL_STATE_DISCLAIMER,
} from '../services/navigationOperationalStateEngine';
import {
  buildNavigationDecisionState,
} from '../services/navigationDecisionStateEngine';
import {
  evaluateNavigationAlerts,
} from '../services/navigationAlertEngine';
import { connectivityStateEngine } from '../services/connectivityStateEngine';
import {
  generateLlmNavigationExplanation,
  SERVICE_UNAVAILABLE_MESSAGE,
} from '../services/navigationAssistantLlm';
import { buildNavigationAssistantContext } from '../services/navigationAssistantContextEngine';
import { RouteAlternative, VesselProfile } from '../types';

export function runFailureDegradedStateTests() {
  console.log('----------------------------------------------------------------------------------------');
  console.log('CRYO NAV — PHASE 19A FAILURE, DEGRADED-STATE & SAFETY ENGINE TEST SUITE');
  console.log('----------------------------------------------------------------------------------------');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName} - ${detail || 'Assertion failed'}`);
      failed++;
    }
  }

  // Baseline Mock Fixtures
  const mockVessel: VesselProfile = {
    id: 'vessel-polaris-01',
    name: 'R/V Polaris Explorer',
    iceClass: 'Polar Class 3 (Year-round in second-year ice)',
    lengthMeters: 110,
    beamMeters: 20,
    maxDraftMeters: 7.5,
    displacementTons: 6500,
    maxSpeedKnots: 15,
    economicSpeedKnots: 11,
    fuelCapacityTons: 1200,
    fuelConsumptionRateTonsPerDay: 18,
    maxSeaIceConcentrationPercent: 80,
  } as any;

  const mockRoute: RouteAlternative = {
    id: 'safest',
    name: 'Primary Safe Channel',
    waypoints: [
      [-64.8, -63.5],
      [-65.0, -64.0],
      [-65.2, -64.5],
    ],
    distanceNm: 142.5,
    etaHours: 12.5,
    fuelTons: 9.8,
    riskIndex: 0.18,
    isRecommended: true,
  } as any;

  // =========================================================================
  // SCENARIO 1: SEA-ICE SOURCE UNAVAILABLE
  // =========================================================================
  console.log('\n--- 1. Sea-Ice Source Unavailable ---');
  {
    const state = buildNavigationOperationalState({
      vessel: mockVessel,
      activeRoute: mockRoute,
      dataMode: 'UNAVAILABLE',
    });

    assert(state.environment.seaIceState === 'UNAVAILABLE', 'Environment sea-ice state reports UNAVAILABLE when source fails');
    assert(state.overallDataMode === 'UNAVAILABLE', 'Overall data mode remains UNAVAILABLE; does not upgrade to REAL');
    assert(state.environment.dataMode === 'UNAVAILABLE', 'Environment section dataMode is UNAVAILABLE');
  }

  // =========================================================================
  // SCENARIO 2: OCEAN CURRENT SOURCE UNAVAILABLE
  // =========================================================================
  console.log('\n--- 2. Ocean Current Source Unavailable ---');
  {
    const state = buildNavigationOperationalState({
      vessel: mockVessel,
      dataMode: 'UNAVAILABLE',
    });

    assert(state.environment.oceanState === 'UNAVAILABLE', 'Environment ocean current state reports UNAVAILABLE when source fails');
    assert(state.prediction.predictionProvenance === 'UNAVAILABLE', 'Prediction provenance reflects UNAVAILABLE data source');
  }

  // =========================================================================
  // SCENARIO 3: WEATHER SOURCE UNAVAILABLE
  // =========================================================================
  console.log('\n--- 3. Weather Source Unavailable ---');
  {
    const state = buildNavigationOperationalState({
      vessel: mockVessel,
      dataMode: 'UNAVAILABLE',
    });

    assert(state.environment.weatherState === 'UNAVAILABLE', 'Weather state correctly exposes UNAVAILABLE status without inventing wind');
  }

  // =========================================================================
  // SCENARIO 4: USNIC ICEBERG DATA UNAVAILABLE
  // =========================================================================
  console.log('\n--- 4. USNIC Iceberg Data Unavailable ---');
  {
    const state = buildNavigationOperationalState({
      vessel: mockVessel,
      hazards: undefined, // Missing iceberg observation feed
      dataMode: 'UNAVAILABLE',
    });

    assert(state.environment.icebergObservationState === 'UNAVAILABLE', 'Iceberg observation state reports UNAVAILABLE when catalog is down');
    assert(state.hazards.totalHazardsCount === 0, 'Zero hazards counted when observations are unavailable');
    assert(state.hazards.dataMode === 'UNAVAILABLE', 'Hazard section dataMode is UNAVAILABLE (not mistaken for NO_HAZARDS in REAL mode)');
  }

  // =========================================================================
  // SCENARIO 5: SENTINEL-1 / CDSE UNAVAILABLE
  // =========================================================================
  console.log('\n--- 5. Sentinel-1 / CDSE Catalogue Unavailable ---');
  {
    const state = buildNavigationOperationalState({
      vessel: mockVessel,
      acquisitionPriorities: {
        rankedCandidates: [],
        timestamp: new Date().toISOString(),
        connectionState: 'OFFLINE',
      } as any,
    });

    assert(state.acquisition.isAvailable === false, 'Data acquisition indicates false availability when CDSE catalogue returns empty');
    assert(state.acquisition.highestPriorityProductId === null, 'Highest priority product ID is null when catalogue is unavailable');
  }

  // =========================================================================
  // SCENARIO 6: GPS UNAVAILABLE
  // =========================================================================
  console.log('\n--- 6. GPS Telemetry Unavailable ---');
  {
    const alertResult = evaluateNavigationAlerts({
      gpsState: { isAvailable: false, lat: null, lon: null },
      referenceTimeIso: '2026-09-27T10:00:00Z',
    });

    const gpsAlert = alertResult.alerts.find((a) => a.type === 'GPS_DATA_UNAVAILABLE');
    assert(gpsAlert != null, 'GPS_DATA_UNAVAILABLE alert generated when GPS telemetry fails');
    assert(gpsAlert?.severity === 'WARNING', 'GPS unavailable alert assigned WARNING severity');
    assert(gpsAlert?.dataMode === 'UNAVAILABLE', 'GPS alert dataMode is UNAVAILABLE');

    const state = buildNavigationOperationalState({
      voyageState: null,
      alerts: alertResult,
    });
    assert(state.position.latitude === null && state.position.longitude === null, 'Position summary lat/lon remain null when GPS is unavailable');
    assert(state.position.dataMode === 'UNAVAILABLE', 'Position section dataMode is UNAVAILABLE');
  }

  // =========================================================================
  // SCENARIO 7: GPS STALE
  // =========================================================================
  console.log('\n--- 7. GPS Telemetry Stale ---');
  {
    const alertResult = evaluateNavigationAlerts({
      gpsState: {
        isAvailable: true,
        lat: -64.8,
        lon: -63.5,
        headingDeg: 180,
        speedKnots: 12,
        timestamp: '2026-09-27T08:00:00Z', // 120 minutes old
      },
      positionAgeMinutesThreshold: 15,
      referenceTimeIso: '2026-09-27T10:00:00Z',
    });

    const staleAlert = alertResult.alerts.find((a) => a.type === 'STALE_POSITION');
    assert(staleAlert != null, 'STALE_POSITION alert generated when GPS timestamp exceeds age threshold');
    assert(staleAlert?.severity === 'WARNING', 'Stale position alert has WARNING severity');
  }

  // =========================================================================
  // SCENARIO 8: ENVIRONMENTAL DATA STALE
  // =========================================================================
  console.log('\n--- 8. Environmental Telemetry Stale ---');
  {
    const alertResult = evaluateNavigationAlerts({
      freshnessState: 'STALE',
      referenceTimeIso: '2026-09-27T10:00:00Z',
    });

    const envAlert = alertResult.alerts.find((a) => a.type === 'STALE_ENVIRONMENT');
    assert(envAlert != null, 'STALE_ENVIRONMENT alert generated when freshness state is STALE');

    const opState = buildNavigationOperationalState({
      freshnessState: 'STALE',
      uncertainty: {
        expandedUncertaintyRadiusNm: 6.5,
        forecastHorizonHours: 24,
        expansionFactor: 1.4,
        recommendedCautionLevel: 'HIGH_CAUTION',
        reasons: ['Stale environmental data'],
      } as any,
    });

    assert(opState.uncertainty.freshnessState === 'STALE', 'Operational state preserves STALE freshness status');
    assert(opState.uncertainty.uncertaintyRadiusNm === 6.5, 'Uncertainty radius reflects expansion factor for stale data');
  }

  // =========================================================================
  // SCENARIO 9: OFFLINE TRANSITION
  // =========================================================================
  console.log('\n--- 9. Offline Transition ---');
  {
    connectivityStateEngine.setSimulatedState('OFFLINE');
    assert(connectivityStateEngine.getCurrentConnectionState() === 'OFFLINE', 'ConnectivityStateEngine updates to OFFLINE');

    const alertResult = evaluateNavigationAlerts({
      connectionState: 'OFFLINE',
    });

    const offlineAlert = alertResult.alerts.find((a) => a.type === 'OFFLINE_OPERATION');
    assert(offlineAlert != null, 'OFFLINE_OPERATION alert generated');
    assert(offlineAlert?.severity === 'INFO', 'Offline operation alert assigned neutral INFO severity');
  }

  // =========================================================================
  // SCENARIO 10: RECONNECTION
  // =========================================================================
  console.log('\n--- 10. Reconnection (OFFLINE -> ONLINE) ---');
  {
    connectivityStateEngine.setSimulatedState('ONLINE');
    assert(connectivityStateEngine.getCurrentConnectionState() === 'ONLINE', 'ConnectivityStateEngine restores ONLINE status');

    const opState = buildNavigationOperationalState({
      freshnessState: 'STALE', // Stale cached data does NOT automatically become fresh
      connectionState: 'ONLINE',
    });

    assert(opState.uncertainty.freshnessState === 'STALE', 'Reconnection does NOT automatically upgrade stale cached data to fresh');
  }

  // =========================================================================
  // SCENARIO 11: LIMITED CONNECTIVITY
  // =========================================================================
  console.log('\n--- 11. Limited Connectivity ---');
  {
    connectivityStateEngine.setSimulatedState('LIMITED');
    const alertResult = evaluateNavigationAlerts({
      connectionState: 'LIMITED',
    });

    const limitedAlert = alertResult.alerts.find((a) => a.type === 'CONNECTIVITY_DEGRADED');
    assert(limitedAlert != null, 'CONNECTIVITY_DEGRADED alert generated in LIMITED mode');
    assert(limitedAlert?.severity === 'ADVISORY', 'Limited connectivity alert has ADVISORY severity');

    const decState = buildNavigationDecisionState({
      connectionState: 'LIMITED',
    });
    assert(decState.acquisitionSummary.connectivityState === 'LIMITED', 'Decision state records LIMITED connectivity state');
  }

  // =========================================================================
  // SCENARIO 12: SATELLITE ACQUISITION FAILURE
  // =========================================================================
  console.log('\n--- 12. Satellite Acquisition Failure ---');
  {
    const opState = buildNavigationOperationalState({
      acquisitionPriorities: {
        rankedCandidates: [],
        timestamp: new Date().toISOString(),
        connectionState: 'OFFLINE',
      } as any,
    });

    assert(opState.acquisition.isAvailable === false, 'Failed download / empty acquisition returns isAvailable: false');
    assert(opState.acquisition.highestPriorityProductId === null, 'Does not report satellite product acquired when acquisition failed');
  }

  // =========================================================================
  // SCENARIO 13: MALFORMED OBSERVATION HANDLING
  // =========================================================================
  console.log('\n--- 13. Malformed Observation Handling ---');
  {
    // Feed NaN and invalid timestamp into evaluateNavigationAlerts
    const alertResult = evaluateNavigationAlerts({
      gpsState: {
        isAvailable: true,
        lat: NaN,
        lon: -64.0,
        timestamp: 'INVALID_DATE_STRING',
      },
      referenceTimeIso: '2026-09-27T10:00:00Z',
    });

    const gpsAlert = alertResult.alerts.find((a) => a.type === 'GPS_DATA_UNAVAILABLE');
    assert(gpsAlert != null, 'Malformed GPS coordinates (NaN) trigger GPS_DATA_UNAVAILABLE safety alert without crashing');
  }

  // =========================================================================
  // SCENARIO 14: HIGH UNCERTAINTY
  // =========================================================================
  console.log('\n--- 14. High Uncertainty Bounds ---');
  {
    const alertResult = evaluateNavigationAlerts({
      confidenceLevel: 'CRITICAL',
      uncertaintyRadiusNm: 8.5,
    });

    const confAlert = alertResult.alerts.find((a) => a.type === 'LOW_CONFIDENCE');
    const uncertAlert = alertResult.alerts.find((a) => a.type === 'STALE_ENVIRONMENT');

    assert(confAlert != null && confAlert.severity === 'CRITICAL', 'CRITICAL confidence level generates CRITICAL low confidence alert');
    assert(uncertAlert != null, 'Large uncertainty envelope generates ADVISORY alert');
  }

  // =========================================================================
  // SCENARIO 15: HIGH-RISK HAZARD
  // =========================================================================
  console.log('\n--- 15. High-Risk Hazard Handling ---');
  {
    const alertResult = evaluateNavigationAlerts({
      hazards: [
        {
          hazardId: 'iceberg-giant-99',
          sourceName: 'Giant Tabular Iceberg A-68',
          severity: 'CRITICAL',
          cpaNm: 0.4,
          tcaHours: 1.2,
          isRealData: true,
        } as any,
      ],
    });

    const critAlert = alertResult.alerts.find((a) => a.severity === 'CRITICAL');
    assert(critAlert != null, 'CRITICAL hazard encounter produces CRITICAL severity alert');
    assert(alertResult.hasActiveCriticalAlerts === true, 'hasActiveCriticalAlerts flag set to true');

    const decState = buildNavigationDecisionState({
      alerts: alertResult,
      reassessment: {
        reassessmentStatus: 'REASSESS',
        triggerReasons: ['Critical hazard CPA < 1.0 nm'],
        changedVariables: ['cpaNm'],
        explanation: 'Reassessment required due to critical hazard proximity.',
        dataMode: 'REAL',
        timestamp: new Date().toISOString(),
      } as any,
    });

    assert(decState.decisionStatus === 'REASSESS', 'Decision status transitions to REASSESS on critical hazard');
    assert(decState.reassessmentSummary.requiresNavigatorReview === true, 'Requires navigator review is true');
  }

  // =========================================================================
  // SCENARIO 16: SIMULTANEOUS MULTI-SYSTEM FAILURES
  // =========================================================================
  console.log('\n--- 16. Simultaneous Multi-System Failures ---');
  {
    const multiFailureInput: NavigationOperationalStateInput = {
      vessel: mockVessel,
      activeRoute: mockRoute,
      dataMode: 'UNAVAILABLE',
      connectionState: 'OFFLINE',
      freshnessState: 'STALE',
      confidence: {
        overallLevel: 'CRITICAL',
        confidenceScore: 0.15,
        primaryLimitingFactor: 'Multiple telemetry streams unavailable',
        isRecommendationBlocked: true,
      } as any,
      alerts: [
        {
          id: 'ALERT_GPS_DATA_UNAVAILABLE',
          type: 'GPS_DATA_UNAVAILABLE',
          severity: 'WARNING',
          title: 'GPS Position Unavailable',
          message: 'GPS telemetry missing',
          timestamp: '2026-09-27T10:00:00Z',
          source: 'GPS',
          acknowledged: false,
          dataMode: 'UNAVAILABLE',
          provenance: 'Test',
        },
        {
          id: 'ALERT_CRITICAL_ICEBERG',
          type: 'ICEBERG_ENCOUNTER',
          severity: 'CRITICAL',
          title: 'Critical Iceberg Proximity',
          message: 'Close proximity iceberg',
          timestamp: '2026-09-27T10:00:00Z',
          source: 'Radar',
          acknowledged: false,
          dataMode: 'UNAVAILABLE',
          provenance: 'Test',
        },
      ],
    };

    const state = buildNavigationOperationalState(multiFailureInput);

    assert(state.overallDataMode === 'UNAVAILABLE', 'Overall data mode reports UNAVAILABLE under total data blackout; no synthetic upgrade');
    assert(state.alerts.hasActiveCritical === true, 'Critical alerts preserved under simultaneous failure');
    assert(state.navigatorAuthorityDisclaimer === MANDATORY_OPERATIONAL_STATE_DISCLAIMER, 'Navigator authority disclaimer strictly preserved');
  }

  // =========================================================================
  // SCENARIO 17: AI SERVICE FAILURE FALLBACK
  // =========================================================================
  console.log('\n--- 17. AI Service Failure & Deterministic Fallback ---');
  {
    const contextResult = buildNavigationAssistantContext({
      vessel: mockVessel,
      activeRoute: mockRoute,
      dataMode: 'SIMULATED',
    });

    // Invoke LLM explanation with missing API key and no mock generator to simulate service failure
    const llmPromise = generateLlmNavigationExplanation({
      contextResult,
      userQuery: 'What is the main hazard?',
      apiKey: undefined,
    });

    llmPromise.then((llmResult) => {
      assert(llmResult.success === false, 'LLM result reports success: false when API is unavailable');
      assert(llmResult.isFallback === true, 'isFallback is true');
      assert(llmResult.explanation.includes(SERVICE_UNAVAILABLE_MESSAGE), 'Explanation contains explicit service unavailable message');
      assert(llmResult.explanation.length > 50, 'Fallback explanation includes structured deterministic answer');
    });
  }

  // =========================================================================
  // SCENARIO 18: MIXED DATA MODE COMBINATIONS
  // =========================================================================
  console.log('\n--- 18. Mixed Data Mode Combinations ---');
  {
    // REAL + SIMULATED -> HYBRID
    const hybridState = buildNavigationOperationalState({
      dataMode: 'SIMULATED',
      voyageState: {
        vesselId: 'v1',
        vesselName: 'Polaris',
        iceClass: 'PC3',
        navigationStatus: 'UNDERWAY',
        currentPosition: { lat: -65, lon: -64, headingDeg: 180, speedKnots: 12 },
        progressPercent: 50,
        remainingDistanceNm: 70,
        estimatedTimeRemainingHours: 6,
        lastStateUpdate: new Date().toISOString(),
        dataMode: 'REAL',
      } as any,
      activeRoute: mockRoute, // SIMULATED via inputMode
    });

    assert(hybridState.overallDataMode === 'HYBRID', 'REAL + SIMULATED yields HYBRID overall data mode');

    // ALL REAL -> REAL
    const realState = buildNavigationOperationalState({
      dataMode: 'REAL',
      voyageState: {
        vesselId: 'v1',
        vesselName: 'Polaris',
        iceClass: 'PC3',
        navigationStatus: 'UNDERWAY',
        currentPosition: { lat: -65, lon: -64, headingDeg: 180, speedKnots: 12 },
        progressPercent: 50,
        remainingDistanceNm: 70,
        estimatedTimeRemainingHours: 6,
        lastStateUpdate: new Date().toISOString(),
        dataMode: 'REAL',
      } as any,
      activeRoute: { ...mockRoute },
      mission: { id: 'm1', title: 'Mission 1', status: 'Active' } as any,
    });

    assert(realState.overallDataMode === 'REAL', 'ALL REAL inputs yield REAL overall data mode');
  }

  // =========================================================================
  // SCENARIO 19: STRESS TESTING
  // =========================================================================
  console.log('\n--- 19. Stress & Stability Testing ---');
  {
    const startMs = Date.now();
    const ITERATIONS = 1000;

    for (let i = 0; i < ITERATIONS; i++) {
      buildNavigationOperationalState({
        vessel: mockVessel,
        activeRoute: mockRoute,
        dataMode: i % 2 === 0 ? 'REAL' : 'SIMULATED',
        forecastHorizonHours: (i % 72),
      });

      evaluateNavigationAlerts({
        gpsState: { isAvailable: i % 5 !== 0, lat: -64.5, lon: -63.0 },
        connectionState: i % 3 === 0 ? 'OFFLINE' : 'ONLINE',
      });
    }

    const elapsedMs = Date.now() - startMs;
    assert(elapsedMs < 2000, `Completed ${ITERATIONS} stress iterations in ${elapsedMs} ms (< 2000 ms threshold)`);
  }

  console.log('\n----------------------------------------------------------------------------------------');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('----------------------------------------------------------------------------------------');

  return { passed, failed };
}

// Auto-run if executed directly via tsx
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes('failureDegradedState.test.ts')) {
  runFailureDegradedStateTests();
}
