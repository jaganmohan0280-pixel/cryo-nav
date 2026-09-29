import assert from 'assert';
import {
  buildNavigationOperationalState,
  NavigationOperationalStateInput,
  MANDATORY_OPERATIONAL_STATE_DISCLAIMER,
} from '../services/navigationOperationalStateEngine';
import { buildNavigationAssistantContext } from '../services/navigationAssistantContextEngine';
import { buildNavigationDecisionState } from '../services/navigationDecisionStateEngine';
import { RouteAlternative } from '../types';

function runNavigationOperationalStateIntegrationTests() {
  console.log('=== RUNNING NAVIGATION OPERATIONAL STATE INTEGRATION TESTS (PHASE 18C-A) ===\n');
  let passCount = 0;

  function test(name: string, fn: () => void) {
    try {
      fn();
      console.log(`✓ PASS: ${name}`);
      passCount++;
    } catch (err: any) {
      console.error(`✗ FAIL: ${name}`);
      console.error(err);
      process.exit(1);
    }
  }

  const mockRoute: RouteAlternative = {
    id: 'balanced',
    name: 'Marguerite Gateway Direct',
    type: 'BALANCED',
    distanceNm: 420.5,
    etaHours: 35.0,
    fuelTons: 42.0,
    riskIndex: 18.5,
    isRecommended: true,
    recommendationRationale: 'Optimal safety-speed balance along Antarctic Peninsula corridor',
    waypoints: [
      [-64.5, -62.0],
      [-67.5, -68.0],
    ],
    segments: [],
  };

  // 1. All-Real state remains REAL
  test('1. All-real state remains REAL', () => {
    const input: NavigationOperationalStateInput = {
      dataMode: 'REAL',
      mission: {
        id: 'mis-1',
        title: 'Peninsula Survey',
        startLocation: { name: 'Palmer', lat: -64.77, lon: -64.05 },
        destination: { name: 'Rothera', lat: -67.57, lon: -68.13 },
        departureTime: '2026-09-27T00:00:00Z',
        missionType: 'Scientific',
        priority: 'High',
        status: 'Active',
      } as any,
      vessel: {
        id: 'ves-1',
        name: 'RRS Sir David Attenborough',
        iceClass: 'POLAR_CLASS',
        cruisingSpeedKnots: 12,
        maxSeaIceConcentrationPercent: 70,
        draftMeters: 7.2,
      } as any,
      voyageState: {
        vesselId: 'ves-1',
        vesselName: 'RRS Sir David Attenborough',
        iceClass: 'POLAR_CLASS',
        currentPosition: { lat: -65.0, lon: -64.5, headingDeg: 195, speedKnots: 11.8 },
        selectedRouteId: 'balanced',
        distanceTraveledNm: 120,
        distanceRemainingNm: 300.5,
        etaHours: 25.0,
        navigationStatus: 'IN_TRANSIT',
        lastStateUpdate: '2026-09-27T04:00:00Z',
        dataMode: 'REAL',
      } as any,
      reassessment: {
        reassessmentStatus: 'STABLE',
        triggerReasons: ['Routine monitoring'],
        dataMode: 'REAL',
        primaryTrigger: 'Routine monitoring',
        requiresNavigatorReview: false,
      } as any,
      validationSummary: {
        overallValidationStatus: 'VALIDATED',
        totalPredictions: 50,
        matchedObservationsCount: 48,
        meanAbsoluteError: 1.12,
        rootMeanSquareError: 1.45,
        uncertaintyCoverageRatePct: 94.0,
        dataMode: 'REAL',
      } as any,
    };

    const res = buildNavigationOperationalState(input);
    assert.strictEqual(res.overallDataMode, 'REAL');
    assert.strictEqual(res.mission.dataMode, 'REAL');
    assert.strictEqual(res.position.dataMode, 'REAL');
    assert.strictEqual(res.environment.dataMode, 'REAL');
    assert.strictEqual(res.validation.dataMode, 'REAL');
  });

  // 2. All-Simulated state remains SIMULATED
  test('2. All-simulated state remains SIMULATED', () => {
    const input: NavigationOperationalStateInput = {
      dataMode: 'SIMULATED',
      mission: {
        id: 'mis-sim',
        title: 'Demo Transit',
        startLocation: { name: 'Base A', lat: -64.0, lon: -62.0 },
        destination: { name: 'Base B', lat: -67.0, lon: -67.0 },
        departureTime: '2026-09-27T00:00:00Z',
        missionType: 'Transit',
        priority: 'Normal',
        status: 'Draft',
      } as any,
    };

    const res = buildNavigationOperationalState(input);
    assert.strictEqual(res.overallDataMode, 'SIMULATED');
  });

  // 3. Mixed sources become HYBRID
  test('3. Mixed sources become HYBRID', () => {
    const input: NavigationOperationalStateInput = {
      dataMode: 'SIMULATED',
      voyageState: {
        vesselId: 'ves-1',
        vesselName: 'RRS Sir David Attenborough',
        iceClass: 'POLAR_CLASS',
        currentPosition: { lat: -65.0, lon: -64.5, headingDeg: 195, speedKnots: 11.8 },
        selectedRouteId: 'balanced',
        distanceTraveledNm: 120,
        distanceRemainingNm: 300.5,
        etaHours: 25.0,
        navigationStatus: 'IN_TRANSIT',
        lastStateUpdate: '2026-09-27T04:00:00Z',
        dataMode: 'REAL',
      } as any,
      mission: {
        id: 'mis-sim',
        title: 'Demo Transit',
        startLocation: { name: 'Base A', lat: -64.0, lon: -62.0 },
        destination: { name: 'Base B', lat: -67.0, lon: -67.0 },
        departureTime: '2026-09-27T00:00:00Z',
        missionType: 'Transit',
        priority: 'Normal',
        status: 'Draft',
      } as any,
    };

    const res = buildNavigationOperationalState(input);
    assert.strictEqual(res.overallDataMode, 'HYBRID');
  });

  // 4. Missing streams become UNAVAILABLE
  test('4. Missing streams become UNAVAILABLE', () => {
    const input: NavigationOperationalStateInput = {
      dataMode: 'SIMULATED',
    };

    const res = buildNavigationOperationalState(input);
    assert.strictEqual(res.mission.dataMode, 'UNAVAILABLE');
    assert.strictEqual(res.vessel.dataMode, 'UNAVAILABLE');
    assert.strictEqual(res.position.dataMode, 'UNAVAILABLE');
    assert.strictEqual(res.route.dataMode, 'UNAVAILABLE');
    assert.strictEqual(res.hazards.dataMode, 'UNAVAILABLE');
    assert.strictEqual(res.uncertainty.dataMode, 'UNAVAILABLE');
    assert.strictEqual(res.resilience.dataMode, 'UNAVAILABLE');
    assert.strictEqual(res.acquisition.dataMode, 'UNAVAILABLE');
    assert.strictEqual(res.reassessment.dataMode, 'UNAVAILABLE');
    assert.strictEqual(res.alerts.dataMode, 'UNAVAILABLE');
    assert.strictEqual(res.validation.dataMode, 'UNAVAILABLE');
    assert.strictEqual(res.overallDataMode, 'UNAVAILABLE');
  });

  // 5. Provenance survives aggregation
  test('5. Provenance survives aggregation', () => {
    const customProvenance = 'Copernicus CMEMS Sentinel-1 SAR & ECMWF IFS Operational State Engine';
    const input: NavigationOperationalStateInput = {
      provenance: customProvenance,
    };

    const res = buildNavigationOperationalState(input);
    assert.strictEqual(res.sourceProvenance, customProvenance);
  });

  // 6. Timestamps survive aggregation
  test('6. Timestamps survive aggregation', () => {
    const timeIso = '2026-09-27T04:15:30.000Z';
    const input: NavigationOperationalStateInput = {
      referenceTimeIso: timeIso,
    };

    const res = buildNavigationOperationalState(input);
    assert.strictEqual(res.generationTimestamp, timeIso);
    assert.ok(res.operationalStateId.includes('20260927041530'));
  });

  // 7. Hazard CPA is not recalculated
  test('7. Hazard CPA is not recalculated', () => {
    const input: NavigationOperationalStateInput = {
      hazards: [
        {
          hazardId: 'haz-101',
          sourceName: 'A-76A Iceberg Fragment',
          severity: 'HIGH',
          cpaNm: 1.84,
          tcaHours: 4.2,
          encounterTimestamp: '2026-09-27T08:00:00Z',
          confidenceLevel: 'HIGH',
          dataMode: 'REAL',
        } as any,
      ],
    };

    const res = buildNavigationOperationalState(input);
    assert.strictEqual(res.hazards.minimumCpaNm, 1.84);
    assert.strictEqual(res.hazards.earliestTcaHours, 4.2);
    assert.strictEqual(res.hazards.primaryHazardId, 'haz-101');
    assert.strictEqual(res.hazards.primaryHazardName, 'A-76A Iceberg Fragment');
    assert.strictEqual(res.hazards.highestSeverity, 'HIGH');
  });

  // 8. Uncertainty is not recalculated
  test('8. Uncertainty is not recalculated', () => {
    const input: NavigationOperationalStateInput = {
      uncertainty: {
        hazardId: 'haz-101',
        hazardName: 'A-76A Iceberg Fragment',
        expandedUncertaintyRadiusNm: 3.42,
        forecastHorizonHours: 24,
        expansionFactor: 1.71,
        recommendedCautionLevel: 'ELEVATED',
        reasons: ['Windage drift divergence'],
        explanation: 'Model uncertainty spatial expansion envelope.',
        dataMode: 'REAL',
      } as any,
    };

    const res = buildNavigationOperationalState(input);
    assert.strictEqual(res.uncertainty.uncertaintyRadiusNm, 3.42);
    assert.strictEqual(res.uncertainty.forecastHorizonHours, 24);
    assert.strictEqual(res.uncertainty.cautionLevel, 'ELEVATED');
  });

  // 9. Resilience is not recalculated
  test('9. Resilience is not recalculated', () => {
    const input: NavigationOperationalStateInput = {
      resilience: {
        resilienceScore: 81.5,
        sensitivityClassification: 'ROBUST',
        dominantSensitivityScenarioName: 'Current Acceleration (+20%)',
        maxRiskDelta: 5.2,
        evaluatedScenariosCount: 6,
        robustScenariosCount: 5,
        dataMode: 'REAL',
      } as any,
    };

    const res = buildNavigationOperationalState(input);
    assert.strictEqual(res.resilience.resilienceScore, 81.5);
    assert.strictEqual(res.resilience.sensitivityClassification, 'ROBUST');
    assert.strictEqual(res.resilience.dominantScenarioName, 'Current Acceleration (+20%)');
  });

  // 10. Acquisition priority is not recalculated
  test('10. Acquisition priority is not recalculated', () => {
    const input: NavigationOperationalStateInput = {
      acquisitionPriorities: {
        rankedCandidates: [
          {
            productId: 'SAT-S1A-IW-001',
            engineeringPriorityIndex: 94.2,
            isAvailable: true,
          } as any,
        ],
        dataMode: 'REAL',
      } as any,
    };

    const res = buildNavigationOperationalState(input);
    assert.strictEqual(res.acquisition.highestPriorityProductId, 'SAT-S1A-IW-001');
    assert.strictEqual(res.acquisition.engineeringPriorityIndex, 94.2);
    assert.strictEqual(res.acquisition.isAvailable, true);
  });

  // 11. Reassessment state is preserved
  test('11. Reassessment state is preserved', () => {
    const input: NavigationOperationalStateInput = {
      reassessment: {
        reassessmentStatus: 'RECOMMEND_REVIEW',
        triggerReasons: ['Uncertainty expansion beyond clearance threshold'],
        dataMode: 'REAL',
        primaryTrigger: 'Uncertainty expansion beyond clearance threshold',
        requiresNavigatorReview: true,
      } as any,
    };

    const res = buildNavigationOperationalState(input);
    assert.strictEqual(res.reassessment.currentStatus, 'RECOMMEND_REVIEW');
    assert.strictEqual(res.reassessment.primaryTrigger, 'Uncertainty expansion beyond clearance threshold');
    assert.strictEqual(res.reassessment.requiresNavigatorReview, true);
  });

  // 12. Alerts are preserved
  test('12. Alerts are preserved', () => {
    const input: NavigationOperationalStateInput = {
      alerts: [
        {
          id: 'alt-101',
          severity: 'CRITICAL',
          type: 'ICEBERG_PROXIMITY',
          title: 'Immediate Iceberg Encounter',
          message: 'CPA < 1.0 nm along active corridor',
        } as any,
      ],
    };

    const res = buildNavigationOperationalState(input);
    assert.strictEqual(res.alerts.totalAlertsCount, 1);
    assert.strictEqual(res.alerts.highestSeverity, 'CRITICAL');
    assert.strictEqual(res.alerts.hasActiveCritical, true);
  });

  // 13. Validation metrics are preserved
  test('13. Validation metrics are preserved', () => {
    const input: NavigationOperationalStateInput = {
      validationSummary: {
        overallValidationStatus: 'VALIDATED',
        totalPredictions: 100,
        matchedObservationsCount: 96,
        meanAbsoluteError: 1.15,
        rootMeanSquareError: 1.42,
        uncertaintyCoverageRatePct: 95.5,
        dataMode: 'REAL',
      } as any,
    };

    const res = buildNavigationOperationalState(input);
    assert.strictEqual(res.validation.retrospectiveValidationStatus, 'VALIDATED');
    assert.strictEqual(res.validation.evaluatedPredictionsCount, 100);
    assert.strictEqual(res.validation.matchedObservationsCount, 96);
    assert.strictEqual(res.validation.meanAbsoluteError, 1.15);
    assert.strictEqual(res.validation.uncertaintyCoverageRatePct, 95.5);
  });

  // 14. Decision state is preserved
  test('14. Decision state is preserved', () => {
    const decState = buildNavigationDecisionState({
      activeRoute: mockRoute,
      dataMode: 'REAL',
    });

    const input: NavigationOperationalStateInput = {
      decisionState: decState,
    };

    const res = buildNavigationOperationalState(input);
    assert.strictEqual(res.decisionState.decisionStatus, decState.decisionStatus);
    assert.strictEqual(res.decisionState.decisionSensitivity, decState.decisionSensitivity);
  });

  // 15. Navigator authority remains true
  test('15. Navigator authority remains true', () => {
    const res = buildNavigationOperationalState({});
    assert.ok(res.navigatorAuthorityDisclaimer.includes('navigator retains final operational authority'));
    assert.ok(res.limitations.some((l) => l.includes('navigator retains final operational authority')));
  });

  // 16. No autonomous control fields exist
  test('16. No autonomous control fields exist', () => {
    const res = buildNavigationOperationalState({});
    const jsonStr = JSON.stringify(res).toLowerCase();
    assert.strictEqual(jsonStr.includes('autosteer'), false);
    assert.strictEqual(jsonStr.includes('autoroute'), false);
    assert.strictEqual(jsonStr.includes('executeroute'), false);
    assert.strictEqual(jsonStr.includes('thrustersetpoint'), false);
    assert.strictEqual(jsonStr.includes('nmeacommand'), false);
  });

  // 17. AI context can consume the operational state correctly
  test('17. AI context can consume the operational state correctly', () => {
    const opState = buildNavigationOperationalState({
      dataMode: 'REAL',
      mission: {
        id: 'mis-1',
        title: 'Antarctic Expedition',
        startLocation: { name: 'Palmer', lat: -64.77, lon: -64.05 },
        destination: { name: 'Rothera', lat: -67.57, lon: -68.13 },
        departureTime: '2026-09-27T00:00:00Z',
        missionType: 'Scientific',
        priority: 'High',
        status: 'Active',
      } as any,
      activeRoute: mockRoute,
      provenance: 'Real Copernicus Satellite Pipeline',
    });

    const aiContext = buildNavigationAssistantContext({
      operationalState: opState,
      mission: {
        id: 'mis-1',
        title: 'Antarctic Expedition',
        startLocation: { name: 'Palmer', lat: -64.77, lon: -64.05 },
        destination: { name: 'Rothera', lat: -67.57, lon: -68.13 },
        departureTime: '2026-09-27T00:00:00Z',
        missionType: 'Scientific',
        priority: 'High',
        status: 'Active',
      } as any,
      activeRoute: mockRoute,
      dataMode: 'REAL',
    });

    assert.strictEqual(aiContext.dataMode, 'REAL');
    assert.ok(aiContext.navigatorAuthorityDisclaimer.includes('navigator remains responsible'));
  });

  // 18. No synthetic values are introduced in REAL mode
  test('18. No synthetic values are introduced in REAL mode', () => {
    const input: NavigationOperationalStateInput = {
      dataMode: 'REAL',
      // omitting uncertainty and hazards
    };

    const res = buildNavigationOperationalState(input);
    assert.strictEqual(res.hazards.minimumCpaNm, null);
    assert.strictEqual(res.hazards.earliestTcaHours, null);
    assert.strictEqual(res.hazards.primaryHazardId, null);
    assert.strictEqual(res.uncertainty.uncertaintyRadiusNm, null);
    assert.strictEqual(res.resilience.resilienceScore, null);
    assert.strictEqual(res.acquisition.engineeringPriorityIndex, null);
  });

  console.log(`\n==================================================`);
  console.log(`ALL ${passCount} OPERATIONAL STATE INTEGRATION TESTS PASSED cleanly!`);
  console.log(`==================================================\n`);
}

runNavigationOperationalStateIntegrationTests();
