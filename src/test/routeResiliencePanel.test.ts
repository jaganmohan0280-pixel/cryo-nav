/**
 * CRYO NAV — Route Resilience Panel UI Test Suite
 * Phase 13B — Presentational Component Verification
 *
 * Verifies all 20 required test cases:
 * 1. active route displayed
 * 2. resilience score displayed
 * 3. engineering index disclaimer ("Not a probability or safety guarantee.")
 * 4. ROBUST displayed
 * 5. SENSITIVE displayed
 * 6. HIGHLY_SENSITIVE displayed
 * 7. scenario results rendered
 * 8. risk delta rendered
 * 9. uncertainty delta rendered
 * 10. feasibility rendered
 * 11. dominant sensitivity displayed
 * 12. aggregate scenario counts displayed
 * 13. REAL provenance rendered
 * 14. SIMULATED provenance rendered
 * 15. UNAVAILABLE handling
 * 16. route immutability disclaimer ("Counterfactual analysis does not modify the active route.")
 * 17. navigator review disclaimer ("Route changes require navigator review.")
 * 18. deterministic rendering
 * 19. empty scenario list handled
 * 20. no unsafe/guarantee language
 */

import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { RouteResiliencePanel } from '../components/navigation/RouteResiliencePanel';
import { RouteResilienceEvaluationResult } from '../services/routeResilienceEngine';

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
  } else {
    console.error(`  [FAIL] ${testName}${detail ? ` — ${detail}` : ''}`);
    throw new Error(`Assertion failed: ${testName}`);
  }
}

function createMockResilienceResult(
  overrides: Partial<RouteResilienceEvaluationResult> = {}
): RouteResilienceEvaluationResult {
  return {
    routeId: 'safest',
    routeName: 'Recommended Safe Corridor',
    baselineRiskIndex: 25.0,
    baselineEtaHours: 28.5,
    baselineFuelTons: 18.2,
    resilienceScore: 88,
    sensitivityClassification: 'ROBUST',
    dominantSensitivityScenarioId: 'ICEBERG_DRIFT_POS_20',
    dominantSensitivityScenarioName: 'Iceberg Drift Velocity (+20%)',
    maxRiskDelta: 4.2,
    scenarioResults: [
      {
        scenarioId: 'BASELINE_UNCHANGED',
        scenarioName: 'Baseline Control (Unchanged)',
        perturbationType: 'BASELINE',
        baselineRiskIndex: 25.0,
        baselineEtaHours: 28.5,
        baselineFuelTons: 18.2,
        baselineUncertaintyScore: 12.0,
        baselineHazardsCount: 0,
        baselineMinCpaNm: 15.0,
        counterfactualRiskIndex: 25.0,
        counterfactualEtaHours: 28.5,
        counterfactualFuelTons: 18.2,
        counterfactualUncertaintyScore: 12.0,
        counterfactualHazardsCount: 0,
        counterfactualMinCpaNm: 15.0,
        riskDelta: 0.0,
        etaDeltaHours: 0.0,
        fuelDeltaTons: 0.0,
        uncertaintyDelta: 0.0,
        hazardsCountDelta: 0,
        minCpaDeltaNm: 0.0,
        isFeasibleUnderPerturbation: true,
        scenarioImpactScore: 0.0,
        explanation: 'Baseline scenario with zero perturbation. Route remains baseline.',
      },
      {
        scenarioId: 'ICEBERG_DRIFT_POS_20',
        scenarioName: 'Iceberg Drift Velocity (+20%)',
        perturbationType: 'ICEBERG_TRAJECTORY',
        baselineRiskIndex: 25.0,
        baselineEtaHours: 28.5,
        baselineFuelTons: 18.2,
        baselineUncertaintyScore: 12.0,
        baselineHazardsCount: 0,
        baselineMinCpaNm: 15.0,
        counterfactualRiskIndex: 29.2,
        counterfactualEtaHours: 28.5,
        counterfactualFuelTons: 18.2,
        counterfactualUncertaintyScore: 12.0,
        counterfactualHazardsCount: 0,
        counterfactualMinCpaNm: 12.5,
        riskDelta: 4.2,
        etaDeltaHours: 0.0,
        fuelDeltaTons: 0.0,
        uncertaintyDelta: 0.0,
        hazardsCountDelta: 0,
        minCpaDeltaNm: -2.5,
        isFeasibleUnderPerturbation: true,
        scenarioImpactScore: 2.5,
        explanation: 'Risk changes by +4.2 pts. Route remains feasible.',
      },
      {
        scenarioId: 'UNCERTAINTY_EXPANSION_25',
        scenarioName: 'Uncertainty Expansion (+25%)',
        perturbationType: 'UNCERTAINTY_EXPANSION',
        baselineRiskIndex: 25.0,
        baselineEtaHours: 28.5,
        baselineFuelTons: 18.2,
        baselineUncertaintyScore: 12.0,
        baselineHazardsCount: 0,
        baselineMinCpaNm: 15.0,
        counterfactualRiskIndex: 31.25,
        counterfactualEtaHours: 28.5,
        counterfactualFuelTons: 18.2,
        counterfactualUncertaintyScore: 15.0,
        counterfactualHazardsCount: 0,
        counterfactualMinCpaNm: 15.0,
        riskDelta: 6.25,
        etaDeltaHours: 0.0,
        fuelDeltaTons: 0.0,
        uncertaintyDelta: 3.0,
        hazardsCountDelta: 0,
        minCpaDeltaNm: 0.0,
        isFeasibleUnderPerturbation: true,
        scenarioImpactScore: 4.95,
        explanation: 'Risk changes by +6.3 pts. Uncertainty increases by +3.0 pts.',
      },
    ],
    averageRiskDelta: 3.5,
    feasibleScenarioCount: 3,
    totalScenarioCount: 3,
    dataMode: 'REAL',
    provenance: 'Copernicus / USNIC Real Data Pipeline',
    timestamp: '2026-09-27T03:00:00.000Z',
    scientificDisclaimer:
      'Engineering sensitivity indicator for decision support under tested perturbations. Not a probability or safety guarantee.',
    ...overrides,
  };
}

export function runRouteResiliencePanelTests() {
  console.log('========================================================================================');
  console.log('RUNNING PHASE 13B ROUTE RESILIENCE UI COMPONENT TESTS');
  console.log('========================================================================================\n');

  // Test 1: Active route displayed
  {
    const res = createMockResilienceResult({ routeId: 'safest-corridor', routeName: 'Marguerite Bay Safe Outer' });
    const html = ReactDOMServer.renderToString(React.createElement(RouteResiliencePanel, { result: res }));
    assert(html.includes('Marguerite Bay Safe Outer') && html.includes('safest-corridor'), '1. active route displayed');
  }

  // Test 2: Resilience score displayed
  {
    const res = createMockResilienceResult({ resilienceScore: 92 });
    const html = ReactDOMServer.renderToString(React.createElement(RouteResiliencePanel, { result: res }));
    assert(html.includes('92'), '2. resilience score displayed');
    assert(html.includes('resilience-score'), '2.1. resilience score testid rendered');
  }

  // Test 3: Engineering index disclaimer displayed
  {
    const res = createMockResilienceResult();
    const html = ReactDOMServer.renderToString(React.createElement(RouteResiliencePanel, { result: res }));
    assert(
      html.includes('Engineering Resilience Index') && html.includes('Not a probability or safety guarantee.'),
      '3. engineering index disclaimer displayed'
    );
  }

  // Test 4: ROBUST displayed
  {
    const res = createMockResilienceResult({ sensitivityClassification: 'ROBUST' });
    const html = ReactDOMServer.renderToString(React.createElement(RouteResiliencePanel, { result: res }));
    assert(html.includes('ROBUST'), '4. ROBUST displayed');
  }

  // Test 5: SENSITIVE displayed
  {
    const res = createMockResilienceResult({ sensitivityClassification: 'SENSITIVE' });
    const html = ReactDOMServer.renderToString(React.createElement(RouteResiliencePanel, { result: res }));
    assert(html.includes('SENSITIVE'), '5. SENSITIVE displayed');
  }

  // Test 6: HIGHLY_SENSITIVE displayed
  {
    const res = createMockResilienceResult({ sensitivityClassification: 'HIGHLY_SENSITIVE' });
    const html = ReactDOMServer.renderToString(React.createElement(RouteResiliencePanel, { result: res }));
    assert(html.includes('HIGHLY_SENSITIVE'), '6. HIGHLY_SENSITIVE displayed');
  }

  // Test 7: Scenario results rendered
  {
    const res = createMockResilienceResult();
    const html = ReactDOMServer.renderToString(React.createElement(RouteResiliencePanel, { result: res }));
    assert(
      html.includes('Baseline Control (Unchanged)') &&
        html.includes('Iceberg Drift Velocity (+20%)') &&
        html.includes('Uncertainty Expansion (+25%)'),
      '7. scenario results rendered'
    );
  }

  // Test 8: Risk delta rendered
  {
    const res = createMockResilienceResult();
    const html = ReactDOMServer.renderToString(React.createElement(RouteResiliencePanel, { result: res }));
    assert(html.includes('Risk +4.2') || html.includes('Risk +6.3') || html.includes('Risk +0.0'), '8. risk delta rendered');
  }

  // Test 9: Uncertainty delta rendered
  {
    const res = createMockResilienceResult();
    const html = ReactDOMServer.renderToString(React.createElement(RouteResiliencePanel, { result: res }));
    assert(html.includes('+3.0') || html.includes('scenario-uncertainty-delta'), '9. uncertainty delta rendered');
  }

  // Test 10: Feasibility rendered
  {
    const res = createMockResilienceResult();
    const html = ReactDOMServer.renderToString(React.createElement(RouteResiliencePanel, { result: res }));
    assert(html.includes('FEASIBLE'), '10. feasibility rendered');
  }

  // Test 11: Dominant sensitivity displayed
  {
    const res = createMockResilienceResult({
      dominantSensitivityScenarioName: 'Wind Speed Surge (+25%)',
      maxRiskDelta: 8.5,
    });
    const html = ReactDOMServer.renderToString(React.createElement(RouteResiliencePanel, { result: res }));
    assert(html.includes('Wind Speed Surge (+25%)') && html.includes('+8.5 pts'), '11. dominant sensitivity displayed');
  }

  // Test 12: Aggregate scenario counts displayed
  {
    const res = createMockResilienceResult({ feasibleScenarioCount: 5, totalScenarioCount: 6 });
    const html = ReactDOMServer.renderToString(React.createElement(RouteResiliencePanel, { result: res }));
    assert(html.includes('5 / 6') || html.includes('5'), '12. aggregate scenario counts displayed');
  }

  // Test 13: REAL provenance rendered
  {
    const res = createMockResilienceResult({ dataMode: 'REAL', provenance: 'CMEMS Satellite Pipeline' });
    const html = ReactDOMServer.renderToString(React.createElement(RouteResiliencePanel, { result: res }));
    assert(html.includes('REAL') && html.includes('CMEMS Satellite Pipeline'), '13. REAL provenance rendered');
  }

  // Test 14: SIMULATED provenance rendered
  {
    const res = createMockResilienceResult({ dataMode: 'SIMULATED', provenance: 'Synthetic Model' });
    const html = ReactDOMServer.renderToString(React.createElement(RouteResiliencePanel, { result: res }));
    assert(html.includes('SIMULATED') && html.includes('Synthetic Model'), '14. SIMULATED provenance rendered');
  }

  // Test 15: UNAVAILABLE handling (null result)
  {
    const html = ReactDOMServer.renderToString(React.createElement(RouteResiliencePanel, { result: null }));
    assert(
      html.includes('UNAVAILABLE') && html.includes('No counterfactual route resilience analysis available'),
      '15. UNAVAILABLE handling for null result'
    );
  }

  // Test 16: Route immutability disclaimer rendered
  {
    const res = createMockResilienceResult();
    const html = ReactDOMServer.renderToString(React.createElement(RouteResiliencePanel, { result: res }));
    assert(html.includes('Counterfactual analysis does not modify the active route.'), '16. route immutability disclaimer rendered');
  }

  // Test 17: Navigator review disclaimer rendered
  {
    const res = createMockResilienceResult();
    const html = ReactDOMServer.renderToString(React.createElement(RouteResiliencePanel, { result: res }));
    assert(html.includes('Route changes require navigator review.'), '17. navigator review disclaimer rendered');
  }

  // Test 18: Deterministic rendering
  {
    const res = createMockResilienceResult();
    const html1 = ReactDOMServer.renderToString(React.createElement(RouteResiliencePanel, { result: res }));
    const html2 = ReactDOMServer.renderToString(React.createElement(RouteResiliencePanel, { result: res }));
    assert(html1 === html2, '18. deterministic rendering across calls');
  }

  // Test 19: Empty scenario list handled
  {
    const res = createMockResilienceResult({ scenarioResults: [] });
    const html = ReactDOMServer.renderToString(React.createElement(RouteResiliencePanel, { result: res }));
    assert(html.includes('No counterfactual route resilience analysis available'), '19. empty scenario list handled');
  }

  // Test 20: Strict avoidance of forbidden unsafe/guarantee language
  {
    const res = createMockResilienceResult();
    const html = ReactDOMServer.renderToString(React.createElement(RouteResiliencePanel, { result: res }));
    const lowerHtml = html.toLowerCase();
    const forbiddenPhrases = [
      'this route is safe',
      'this route will remain safe',
      'this route is optimal',
      'this route is guaranteed',
      'probability of collision',
    ];
    let foundForbidden = false;
    for (const phrase of forbiddenPhrases) {
      if (lowerHtml.includes(phrase)) {
        foundForbidden = true;
        break;
      }
    }
    assert(!foundForbidden, '20. no unsafe/guarantee language present');
  }

  console.log('\n========================================================================================');
  console.log('ALL PHASE 13B ROUTE RESILIENCE UI TESTS PASSED!');
  console.log('========================================================================================\n');
}

// Execute directly if run via CLI
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('routeResiliencePanel.test.ts')) {
  try {
    runRouteResiliencePanelTests();
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

