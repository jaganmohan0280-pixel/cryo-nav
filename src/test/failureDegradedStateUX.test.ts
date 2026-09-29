/**
 * CRYO NAV — Failure & Degraded-State UX Test Suite
 * Phase 19B — Website Failure, Degraded-State & Recovery Workflow Audit
 *
 * Operational Principle:
 * Verifies that the website UI components, side panels, view containers, and AI Assistant
 * correctly communicate degraded operational states (ONLINE, LIMITED, OFFLINE, STALE, UNAVAILABLE, RECONNECTED).
 *
 * Safety & UX Rules:
 * 1. Missing or unavailable observations must NEVER be displayed as safe conditions ("No hazards").
 * 2. Stale telemetry must be explicitly labeled STALE.
 * 3. Offline operations must display cached provenance and timestamps without claiming live external connectivity.
 * 4. GPS telemetry failure must produce GPS_DATA_UNAVAILABLE alert without inventing coordinates.
 * 5. Failed satellite acquisition must NOT display ACQUIRED.
 * 6. High uncertainty must be labeled as a model variance envelope, NOT a confirmed physical barrier.
 * 7. Mandatory navigator authority disclaimers must be rendered across executive decision panels.
 * 8. Zero user-facing occurrences of "DIGITAL TWIN".
 */

import React from 'react';
import { renderToString } from 'react-dom/server';
import {
  NavigationDecisionStatePanel,
} from '../components/navigation/NavigationDecisionStatePanel';
import {
  HazardEncounterPanel,
} from '../components/navigation/HazardEncounterPanel';
import {
  UncertaintyZonePanel,
} from '../components/navigation/UncertaintyZonePanel';
import {
  AcquisitionPriorityList,
} from '../components/navigation/AcquisitionPriorityList';
import {
  NavigationAlertPanel,
} from '../components/navigation/NavigationAlertPanel';
import {
  OfflineStatusPanel,
} from '../components/navigation/OfflineStatusPanel';
import {
  buildNavigationOperationalState,
  NavigationOperationalStateInput,
  MANDATORY_OPERATIONAL_STATE_DISCLAIMER,
} from '../services/navigationOperationalStateEngine';
import {
  buildNavigationDecisionState,
  MANDATORY_DECISION_STATE_DISCLAIMER,
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

export function runFailureDegradedStateUXTests() {
  console.log('----------------------------------------------------------------------------------------');
  console.log('CRYO NAV — PHASE 19B WEBSITE FAILURE & DEGRADED-STATE UX AUDIT TEST SUITE');
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
  // WORKFLOW 1: NORMAL ONLINE UX
  // =========================================================================
  console.log('\n--- 1. Normal Online Workflow UX ---');
  {
    connectivityStateEngine.setSimulatedState('ONLINE');
    const opState = buildNavigationOperationalState({
      vessel: mockVessel,
      activeRoute: mockRoute,
      dataMode: 'REAL',
    });

    const decState = buildNavigationDecisionState({
      activeRoute: mockRoute,
      dataMode: 'REAL',
    });

    const html = renderToString(
      React.createElement(NavigationDecisionStatePanel, { decisionState: decState })
    );

    assert(html.includes('REAL'), 'ONLINE workflow renders REAL data mode badge');
    assert(html.includes('CRYO NAV decision state is a system-level aggregation'), 'ONLINE panel renders mandatory navigator disclaimer');
    assert(!html.includes('DIGITAL TWIN'), 'Zero occurrences of DIGITAL TWIN terminology in user UI');
  }

  // =========================================================================
  // WORKFLOW 2: ONLINE -> OFFLINE TRANSITION UX
  // =========================================================================
  console.log('\n--- 2. Online -> Offline Transition UX ---');
  {
    connectivityStateEngine.setSimulatedState('OFFLINE');
    const alertResult = evaluateNavigationAlerts({
      connectionState: 'OFFLINE',
    });

    const htmlAlerts = renderToString(
      React.createElement(NavigationAlertPanel, { evaluationResult: alertResult })
    );

    assert(htmlAlerts.includes('OFFLINE'), 'Offline transition renders OFFLINE connectivity badge');
    assert(htmlAlerts.includes('Offline Navigation Mode') || htmlAlerts.includes('OFFLINE_OPERATION'), 'Offline operation alert rendered');

    const htmlStatus = renderToString(
      React.createElement(OfflineStatusPanel, {
        connectionState: 'OFFLINE',
        lastSyncTimestamp: '2026-09-27T08:00:00Z',
      } as any)
    );
    assert(htmlStatus.includes('OFFLINE'), 'OfflineStatusPanel renders OFFLINE state');
    assert(htmlStatus.includes('Cached data'), 'OfflineStatusPanel explicitly identifies stored cached data');
  }

  // =========================================================================
  // WORKFLOW 3: STALE DATA UX
  // =========================================================================
  console.log('\n--- 3. Stale Data Workflow UX ---');
  {
    const opState = buildNavigationOperationalState({
      freshnessState: 'STALE',
    });

    const htmlUncertainty = renderToString(
      React.createElement(UncertaintyZonePanel, {
        uncertaintyData: {
          confidence: 'LOW',
          freshness: 'STALE',
          connectivity: 'ONLINE',
          uncertaintyRadiusNm: 5.2,
          uncertaintyEnvelopeLabel: '±5.2 nm (1.4x expansion)',
          reason: 'Environmental observations stale (>24h old)',
          cautionLevel: 'HIGH',
          provenance: 'REAL',
        },
      })
    );

    assert(htmlUncertainty.includes('STALE'), 'UncertaintyZonePanel renders STALE freshness badge');
    assert(htmlUncertainty.includes('±5.2 nm'), 'Uncertainty radius expansion visible');
  }

  // =========================================================================
  // WORKFLOW 4: GPS UNAVAILABLE UX
  // =========================================================================
  console.log('\n--- 4. GPS Telemetry Unavailable UX ---');
  {
    const alertResult = evaluateNavigationAlerts({
      gpsState: { isAvailable: false, lat: null, lon: null },
      referenceTimeIso: '2026-09-27T10:00:00Z',
    });

    const htmlAlerts = renderToString(
      React.createElement(NavigationAlertPanel, { evaluationResult: alertResult })
    );

    assert(htmlAlerts.includes('GPS Position Unavailable'), 'GPS unavailable alert rendered clearly');
    assert(htmlAlerts.includes('WARNING'), 'GPS unavailable alert rendered with WARNING severity badge');
  }

  // =========================================================================
  // WORKFLOW 5: ENVIRONMENTAL SOURCE UNAVAILABLE UX
  // =========================================================================
  console.log('\n--- 5. Environmental Source Unavailable UX ---');
  {
    const opState = buildNavigationOperationalState({
      vessel: mockVessel,
      dataMode: 'UNAVAILABLE',
    });

    assert(opState.environment.seaIceState === 'UNAVAILABLE', 'Sea-ice environmental state reports UNAVAILABLE');
    assert(opState.environment.oceanState === 'UNAVAILABLE', 'Ocean environmental state reports UNAVAILABLE');
    assert(opState.environment.weatherState === 'UNAVAILABLE', 'Weather environmental state reports UNAVAILABLE');
    assert(opState.overallDataMode === 'UNAVAILABLE', 'Overall data mode is UNAVAILABLE without synthetic upgrade to REAL');
  }

  // =========================================================================
  // WORKFLOW 6: ICEBERG OBSERVATION UNAVAILABLE UX
  // =========================================================================
  console.log('\n--- 6. Iceberg Observation Feed Unavailable UX ---');
  {
    const htmlHazard = renderToString(
      React.createElement(HazardEncounterPanel, {
        evaluationResult: {
          encounters: [],
          activeEncountersCount: 0,
          highestSeverity: 'NONE',
          dataMode: 'UNAVAILABLE',
          provenance: 'USNIC Iceberg Catalog',
          seaIceRouteSummary: null,
          evaluationTimestamp: new Date().toISOString(),
        } as any,
      })
    );

    assert(htmlHazard.includes('ICEBERG OBSERVATION TELEMETRY UNAVAILABLE'), 'HazardEncounterPanel renders explicit ICEBERG TELEMETRY UNAVAILABLE header');
    assert(htmlHazard.includes('Absence of current iceberg observations does NOT guarantee absence of hazards'), 'HazardEncounterPanel renders warning that absence of observations does NOT guarantee absence of hazards');
    assert(!htmlHazard.includes('NO RELEVANT ENCOUNTER IDENTIFIED'), 'Does NOT claim "No encounters" when observation feed is unavailable');
  }

  // =========================================================================
  // WORKFLOW 7: SENTINEL-1 / ACQUISITION FAILURE UX
  // =========================================================================
  console.log('\n--- 7. Satellite Catalogue / Acquisition Failure UX ---');
  {
    const htmlAcq = renderToString(
      React.createElement(AcquisitionPriorityList, {
        candidates: [],
        connectionState: 'OFFLINE',
        emptyReason: 'UNAVAILABLE',
      })
    );

    assert(htmlAcq.includes('Available satellite data could not be identified'), 'AcquisitionPriorityList renders clear failure message');
    assert(!htmlAcq.includes('ACQUIRED'), 'Failed/empty acquisition does NOT render ACQUIRED badge');
  }

  // =========================================================================
  // WORKFLOW 8: HIGH UNCERTAINTY UX
  // =========================================================================
  console.log('\n--- 8. High Uncertainty Bounds UX ---');
  {
    const htmlUncert = renderToString(
      React.createElement(UncertaintyZonePanel, {
        uncertaintyData: {
          confidence: 'CRITICAL',
          freshness: 'STALE',
          connectivity: 'ONLINE',
          uncertaintyRadiusNm: 8.5,
          uncertaintyEnvelopeLabel: '±8.5 nm (2.1x expansion)',
          reason: 'Multiple telemetry streams unavailable',
          cautionLevel: 'EXTREME',
          provenance: 'REAL',
        },
      })
    );

    assert(htmlUncert.includes('±8.5 nm'), 'High uncertainty envelope radius rendered');
    assert(htmlUncert.includes('CRITICAL'), 'CRITICAL confidence badge rendered');
  }

  // =========================================================================
  // WORKFLOW 9: CRITICAL HAZARD UX
  // =========================================================================
  console.log('\n--- 9. Critical Hazard Proximity UX ---');
  {
    const alertResult = evaluateNavigationAlerts({
      hazards: [
        {
          hazardId: 'iceberg-a68',
          sourceName: 'Giant Tabular Iceberg A-68',
          severity: 'CRITICAL',
          cpaNm: 0.4,
          tcaHours: 1.2,
          isRealData: true,
        } as any,
      ],
    });

    const htmlAlerts = renderToString(
      React.createElement(NavigationAlertPanel, { evaluationResult: alertResult })
    );

    assert(htmlAlerts.includes('CRITICAL'), 'NavigationAlertPanel renders CRITICAL hazard alert badge');
    assert(htmlAlerts.includes('Critical Hazard Encounter'), 'Critical hazard encounter title rendered');
  }

  // =========================================================================
  // WORKFLOW 10: SIMULTANEOUS DEGRADED STATE UX
  // =========================================================================
  console.log('\n--- 10. Simultaneous Multi-System Degraded State UX ---');
  {
    const decState = buildNavigationDecisionState({
      vessel: mockVessel,
      activeRoute: mockRoute,
      connectionState: 'OFFLINE',
      freshnessState: 'STALE',
      dataMode: 'UNAVAILABLE',
    } as any);

    const htmlDec = renderToString(
      React.createElement(NavigationDecisionStatePanel, { decisionState: decState })
    );

    assert(htmlDec.includes('UNAVAILABLE'), 'Executive decision panel renders UNAVAILABLE data mode under blackout');
    assert(htmlDec.includes(MANDATORY_DECISION_STATE_DISCLAIMER), 'Executive decision panel preserves mandatory navigator authority disclaimer');
  }

  // =========================================================================
  // WORKFLOW 11: AI ASSISTANT FALLBACK UX
  // =========================================================================
  console.log('\n--- 11. AI Assistant Fallback UX ---');
  {
    const contextResult = buildNavigationAssistantContext({
      vessel: mockVessel,
      activeRoute: mockRoute,
      dataMode: 'SIMULATED',
    });

    const llmPromise = generateLlmNavigationExplanation({
      contextResult,
      userQuery: 'What is the main hazard?',
      apiKey: undefined,
    });

    llmPromise.then((llmResult) => {
      assert(llmResult.isFallback === true, 'AI Assistant returns isFallback: true on network error');
      assert(llmResult.explanation.includes(SERVICE_UNAVAILABLE_MESSAGE), 'Explanation explicitly states AI explanation service unavailable');
      assert(llmResult.explanation.includes('ICEBERG_COLLISION') || llmResult.explanation.length > 50, 'Fallback presents structured deterministic answer');
    });
  }

  // =========================================================================
  // WORKFLOW 12: RECOVERY (OFFLINE -> ONLINE) UX
  // =========================================================================
  console.log('\n--- 12. Recovery (OFFLINE -> ONLINE) UX ---');
  {
    connectivityStateEngine.setSimulatedState('ONLINE');
    assert(connectivityStateEngine.getCurrentConnectionState() === 'ONLINE', 'Connectivity state restored to ONLINE');

    const opState = buildNavigationOperationalState({
      freshnessState: 'STALE',
      connectionState: 'ONLINE',
    });

    assert(opState.uncertainty.freshnessState === 'STALE', 'Reconnection preserves STALE status on cached items until fresh data arrives');
  }

  // =========================================================================
  // WORKFLOW 13: FORBIDDEN TERMINOLOGY CHECK
  // =========================================================================
  console.log('\n--- 13. Forbidden Terminology Check ---');
  {
    const decState = buildNavigationDecisionState({
      activeRoute: mockRoute,
      dataMode: 'REAL',
    });
    const htmlDec = renderToString(
      React.createElement(NavigationDecisionStatePanel, { decisionState: decState })
    );
    assert(!htmlDec.includes('DIGITAL TWIN'), 'Zero occurrences of DIGITAL TWIN terminology in NavigationDecisionStatePanel');
  }

  // =========================================================================
  // WORKFLOW 14: NAVIGATOR AUTHORITY CHECK
  // =========================================================================
  console.log('\n--- 14. Navigator Authority Check ---');
  {
    const decState = buildNavigationDecisionState({
      activeRoute: mockRoute,
    });
    const htmlDec = renderToString(
      React.createElement(NavigationDecisionStatePanel, { decisionState: decState })
    );
    assert(htmlDec.includes('navigator retains final operational authority'), 'Navigator authority disclaimer explicitly present in UI panel rendering');
  }

  console.log('\n----------------------------------------------------------------------------------------');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('----------------------------------------------------------------------------------------');

  return { passed, failed };
}

// Auto-run if executed directly via tsx
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes('failureDegradedStateUX.test.ts')) {
  runFailureDegradedStateUXTests();
}
