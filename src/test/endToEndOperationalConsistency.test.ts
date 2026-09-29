import assert from 'assert';
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
  buildNavigationAssistantContext,
  MANDATORY_NAVIGATOR_DISCLAIMER,
} from '../services/navigationAssistantContextEngine';
import { RouteAlternative } from '../types';

function runEndToEndOperationalConsistencyTests() {
  console.log('=== RUNNING CRYO NAV END-TO-END OPERATIONAL CONSISTENCY TESTS (PHASE 18C-B) ===\n');
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
    name: 'Marguerite Gateway Direct Corridor',
    type: 'BALANCED',
    distanceNm: 420.5,
    etaHours: 35.0,
    fuelTons: 42.0,
    riskIndex: 18.5,
    isRecommended: true,
    recommendationRationale: 'Optimal balance between sea-ice concentration and transit time.',
    waypoints: [
      [-64.5, -62.0],
      [-67.5, -68.0],
    ],
  } as any;

  const mockHazard = {
    hazardId: 'haz-A76A',
    sourceName: 'Tabular Fragment A-76A',
    severity: 'HIGH',
    cpaNm: 2.15,
    tcaHours: 5.5,
    encounterTimestamp: '2026-09-27T12:00:00Z',
    confidenceLevel: 'HIGH',
    dataMode: 'REAL',
  };

  const mockUncertainty = {
    hazardId: 'haz-A76A',
    hazardName: 'Tabular Fragment A-76A',
    expandedUncertaintyRadiusNm: 3.25,
    forecastHorizonHours: 24,
    expansionFactor: 1.62,
    recommendedCautionLevel: 'ELEVATED',
    reasons: ['Hydrodynamic current variance'],
    explanation: 'Model uncertainty spatial expansion envelope.',
    dataMode: 'REAL',
  };

  const mockResilience = {
    resilienceScore: 84.0,
    sensitivityClassification: 'ROBUST',
    dominantSensitivityScenarioName: 'Current Acceleration (+20%)',
    maxRiskDelta: 4.8,
    evaluatedScenariosCount: 6,
    robustScenariosCount: 5,
    dataMode: 'REAL',
  };

  const mockAcquisition = {
    rankedCandidates: [
      {
        productId: 'SAT-S1A-MARGUERITE-001',
        engineeringPriorityIndex: 92.5,
        isAvailable: true,
      },
    ],
    dataMode: 'REAL',
  };

  const mockReassessment = {
    reassessmentStatus: 'MONITOR',
    triggerReasons: ['Moderate wind shifts'],
    dataMode: 'REAL',
    primaryTrigger: 'Moderate wind shifts',
    requiresNavigatorReview: false,
  };

  const mockAlerts = [
    {
      id: 'alt-001',
      severity: 'WARNING',
      type: 'ICEBERG_PROXIMITY',
      title: 'A-76A Proximity Notice',
      message: 'Maintain 3.5 nm clearance.',
    },
  ];

  const mockValidation = {
    overallValidationStatus: 'VALIDATED',
    totalPredictions: 80,
    matchedObservationsCount: 76,
    meanAbsoluteError: 1.08,
    rootMeanSquareError: 1.35,
    uncertaintyCoverageRatePct: 95.0,
    dataMode: 'REAL',
  };

  // 1. Authoritative State reaches Navigation View context
  test('1. Authoritative OperationalState reaches Navigation View state model', () => {
    const input: NavigationOperationalStateInput = {
      dataMode: 'REAL',
      mission: {
        id: 'mis-001',
        title: 'Peninsula Transit',
        startLocation: { name: 'Palmer Base', lat: -64.77, lon: -64.05 },
        destination: { name: 'Rothera Station', lat: -67.57, lon: -68.13 },
        departureTime: '2026-09-27T00:00:00Z',
        missionType: 'Scientific',
        priority: 'High',
        status: 'Active',
      } as any,
      vessel: {
        id: 'ves-001',
        name: 'RRS Sir David Attenborough',
        iceClass: 'POLAR_CLASS',
        cruisingSpeedKnots: 12.0,
        maxSeaIceConcentrationPercent: 70,
        draftMeters: 7.2,
      } as any,
      activeRoute: mockRoute,
      hazards: [mockHazard as any],
      uncertainty: mockUncertainty as any,
      resilience: mockResilience as any,
      acquisitionPriorities: mockAcquisition as any,
      reassessment: mockReassessment as any,
      alerts: mockAlerts as any,
      validationSummary: mockValidation as any,
    };

    const opState = buildNavigationOperationalState(input);
    assert.strictEqual(opState.overallDataMode, 'REAL');
    assert.strictEqual(opState.vessel.vesselName, 'RRS Sir David Attenborough');
    assert.strictEqual(opState.route.activeRouteId, 'balanced');
  });

  // 2. Authoritative State reaches AI Assistant context
  test('2. Authoritative OperationalState reaches AI Assistant context without recalculation', () => {
    const input: NavigationOperationalStateInput = {
      dataMode: 'REAL',
      activeRoute: mockRoute,
      hazards: [mockHazard as any],
      uncertainty: mockUncertainty as any,
      resilience: mockResilience as any,
      reassessment: mockReassessment as any,
      alerts: mockAlerts as any,
      provenance: 'Real Copernicus Marine & Sentinel-1 Ingest',
    };

    const opState = buildNavigationOperationalState(input);
    const aiContext = buildNavigationAssistantContext({
      operationalState: opState,
      activeRoute: mockRoute,
      hazards: [mockHazard as any],
      uncertainty: mockUncertainty as any,
      resilience: mockResilience as any,
      reassessment: mockReassessment as any,
      alerts: mockAlerts as any,
      dataMode: 'REAL',
    });

    assert.strictEqual(aiContext.dataMode, 'REAL');
    assert.strictEqual(aiContext.provenance, opState.sourceProvenance);
    assert.ok(aiContext.structuredAnswers.majorHazardsAffectingRoute.includes('Tabular Fragment A-76A'));
  });

  // 3. Hazard values remain consistent across panels & state
  test('3. Hazard values (CPA, TCA, Severity, ID) remain strictly consistent', () => {
    const input: NavigationOperationalStateInput = {
      dataMode: 'REAL',
      hazards: [mockHazard as any],
    };

    const opState = buildNavigationOperationalState(input);
    assert.strictEqual(opState.hazards.minimumCpaNm, 2.15);
    assert.strictEqual(opState.hazards.earliestTcaHours, 5.5);
    assert.strictEqual(opState.hazards.primaryHazardId, 'haz-A76A');
    assert.strictEqual(opState.hazards.primaryHazardName, 'Tabular Fragment A-76A');
    assert.strictEqual(opState.hazards.highestSeverity, 'HIGH');
  });

  // 4. Uncertainty values remain consistent
  test('4. Uncertainty radius and caution state remain consistent', () => {
    const input: NavigationOperationalStateInput = {
      dataMode: 'REAL',
      uncertainty: mockUncertainty as any,
    };

    const opState = buildNavigationOperationalState(input);
    assert.strictEqual(opState.uncertainty.uncertaintyRadiusNm, 3.25);
    assert.strictEqual(opState.uncertainty.forecastHorizonHours, 24);
    assert.strictEqual(opState.uncertainty.cautionLevel, 'ELEVATED');
  });

  // 5. Resilience values remain consistent
  test('5. Route resilience score and classification remain consistent', () => {
    const input: NavigationOperationalStateInput = {
      dataMode: 'REAL',
      resilience: mockResilience as any,
    };

    const opState = buildNavigationOperationalState(input);
    assert.strictEqual(opState.resilience.resilienceScore, 84.0);
    assert.strictEqual(opState.resilience.sensitivityClassification, 'ROBUST');
    assert.strictEqual(opState.resilience.dominantScenarioName, 'Current Acceleration (+20%)');
  });

  // 6. Acquisition priority values remain consistent
  test('6. Acquisition Engineering Priority Index remains consistent', () => {
    const input: NavigationOperationalStateInput = {
      dataMode: 'REAL',
      acquisitionPriorities: mockAcquisition as any,
    };

    const opState = buildNavigationOperationalState(input);
    assert.strictEqual(opState.acquisition.highestPriorityProductId, 'SAT-S1A-MARGUERITE-001');
    assert.strictEqual(opState.acquisition.engineeringPriorityIndex, 92.5);
    assert.strictEqual(opState.acquisition.isAvailable, true);
  });

  // 7. Reassessment status remains consistent
  test('7. Decision Reassessment status remains consistent', () => {
    const input: NavigationOperationalStateInput = {
      dataMode: 'REAL',
      reassessment: mockReassessment as any,
    };

    const opState = buildNavigationOperationalState(input);
    assert.strictEqual(opState.reassessment.currentStatus, 'MONITOR');
    assert.strictEqual(opState.reassessment.primaryTrigger, 'Moderate wind shifts');
    assert.strictEqual(opState.reassessment.requiresNavigatorReview, false);
  });

  // 8. Alerts remain consistent
  test('8. Navigation Alerts metrics remain consistent', () => {
    const input: NavigationOperationalStateInput = {
      dataMode: 'REAL',
      alerts: mockAlerts as any,
    };

    const opState = buildNavigationOperationalState(input);
    assert.strictEqual(opState.alerts.totalAlertsCount, 1);
    assert.strictEqual(opState.alerts.highestSeverity, 'WARNING');
    assert.strictEqual(opState.alerts.hasActiveCritical, false);
  });

  // 9. Validation metrics remain consistent
  test('9. Retrospective Model Validation metrics remain consistent', () => {
    const input: NavigationOperationalStateInput = {
      dataMode: 'REAL',
      validationSummary: mockValidation as any,
    };

    const opState = buildNavigationOperationalState(input);
    assert.strictEqual(opState.validation.retrospectiveValidationStatus, 'VALIDATED');
    assert.strictEqual(opState.validation.evaluatedPredictionsCount, 80);
    assert.strictEqual(opState.validation.matchedObservationsCount, 76);
    assert.strictEqual(opState.validation.meanAbsoluteError, 1.08);
    assert.strictEqual(opState.validation.uncertaintyCoverageRatePct, 95.0);
  });

  // 10. Decision status remains consistent
  test('10. Decision Status remains consistent across decision state engine', () => {
    const decState = buildNavigationDecisionState({
      activeRoute: mockRoute,
      reassessment: mockReassessment as any,
      resilience: mockResilience as any,
      dataMode: 'REAL',
    });

    const input: NavigationOperationalStateInput = {
      decisionState: decState,
      dataMode: 'REAL',
    };

    const opState = buildNavigationOperationalState(input);
    assert.strictEqual(opState.decisionState.decisionStatus, decState.decisionStatus);
    assert.strictEqual(opState.decisionState.decisionSensitivity, decState.decisionSensitivity);
  });

  // 11. Data mode rules strictly enforced
  test('11. Data Mode rules strictly enforced (REAL vs SIMULATED vs HYBRID vs UNAVAILABLE)', () => {
    // Case A: All REAL -> REAL
    const realState = buildNavigationOperationalState({
      dataMode: 'REAL',
      voyageState: { dataMode: 'REAL' } as any,
      reassessment: { dataMode: 'REAL' } as any,
      validationSummary: { dataMode: 'REAL' } as any,
    });
    assert.strictEqual(realState.overallDataMode, 'REAL');

    // Case B: All SIMULATED -> SIMULATED
    const simState = buildNavigationOperationalState({
      dataMode: 'SIMULATED',
      mission: { id: 'm-1' } as any,
    });
    assert.strictEqual(simState.overallDataMode, 'SIMULATED');

    // Case C: Mixed -> HYBRID
    const hybridState = buildNavigationOperationalState({
      dataMode: 'SIMULATED',
      voyageState: { dataMode: 'REAL' } as any,
      mission: { id: 'm-1' } as any,
    });
    assert.strictEqual(hybridState.overallDataMode, 'HYBRID');

    // Case D: Missing required streams -> UNAVAILABLE
    const emptyState = buildNavigationOperationalState({});
    assert.strictEqual(emptyState.overallDataMode, 'UNAVAILABLE');
  });

  // 12. Provenance attribution preserved
  test('12. Provenance attribution preserved without synthetic provider invention', () => {
    const prov = 'Copernicus Marine NEMO 3D & USNIC Polar Catalog';
    const opState = buildNavigationOperationalState({ provenance: prov });
    assert.strictEqual(opState.sourceProvenance, prov);
  });

  // 13. No synthetic upgrades
  test('13. SIMULATED data is never silently upgraded to REAL', () => {
    const opState = buildNavigationOperationalState({
      dataMode: 'SIMULATED',
      mission: { id: 'm-1' } as any,
    });
    assert.notStrictEqual(opState.overallDataMode, 'REAL');
    assert.strictEqual(opState.overallDataMode, 'SIMULATED');
  });

  // 14. Navigator Authority Disclaimer present across all Engine & AI Context Disclaimers
  test('14. Mandatory Navigator Authority Disclaimer present in engine outputs', () => {
    const opState = buildNavigationOperationalState({});
    const decState = buildNavigationDecisionState({});
    const aiContext = buildNavigationAssistantContext({});

    assert.ok(opState.navigatorAuthorityDisclaimer.includes('navigator retains final operational authority'));
    assert.ok(decState.limitations.some((l) => l.includes('navigator retains final operational authority')));
    assert.ok(aiContext.navigatorAuthorityDisclaimer.includes('navigator remains responsible'));
  });

  // 15. Zero Autonomous Control fields exist
  test('15. Zero autonomous vessel control fields exist in operational state', () => {
    const opState = buildNavigationOperationalState({
      activeRoute: mockRoute,
      hazards: [mockHazard as any],
    });

    const json = JSON.stringify(opState).toLowerCase();
    assert.strictEqual(json.includes('autosteer'), false);
    assert.strictEqual(json.includes('autoroute'), false);
    assert.strictEqual(json.includes('execute_route'), false);
    assert.strictEqual(json.includes('thruster_command'), false);
    assert.strictEqual(json.includes('nmea_output'), false);
  });

  console.log(`\n==================================================`);
  console.log(`ALL ${passCount} END-TO-END CONSISTENCY TESTS PASSED cleanly!`);
  console.log(`==================================================\n`);
}

runEndToEndOperationalConsistencyTests();
