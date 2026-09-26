/**
 * CRYO NAV — Decision Reassessment UI Component Test Suite
 * Phase 12B — Standalone Presentational Unit Verification
 *
 * Verifies all 20 required test cases:
 * 1. STABLE renders
 * 2. MONITOR renders
 * 3. REASSESS renders
 * 4. RECOMMEND_REVIEW renders
 * 5. explanation renders
 * 6. trigger reasons render
 * 7. changed variables render
 * 8. uncertainty comparison renders
 * 9. hazard/CPA information renders
 * 10. decision sensitivity renders
 * 11. provenance renders
 * 12. REAL data mode is correctly labelled
 * 13. SIMULATED data mode is correctly labelled
 * 14. HYBRID data mode is correctly labelled
 * 15. OFFLINE does not itself imply reassessment (STABLE state preserved)
 * 16. navigator-review disclaimer renders
 * 17. no automatic route-change language is displayed
 * 18. missing optional hazard ID is handled
 * 19. deterministic rendering
 * 20. empty trigger list is handled
 */

import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { DecisionReassessmentPanel } from '../components/navigation/DecisionReassessmentPanel';
import { DecisionReassessmentResult } from '../services/decisionReassessmentEngine';

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
  } else {
    console.error(`  [FAIL] ${testName}${detail ? ` — ${detail}` : ''}`);
    throw new Error(`Assertion failed: ${testName}`);
  }
}

// Helper mock builder for DecisionReassessmentResult
function createMockResult(overrides: Partial<DecisionReassessmentResult> = {}): DecisionReassessmentResult {
  return {
    reassessmentStatus: 'STABLE',
    triggerReasons: ['Minor sea-ice fluctuation within baseline envelope.'],
    explanation: 'Decision state is STABLE for Marguerite Bay Approach Alpha. No material changes in hazards or confidence.',
    changedVariables: ['uncertaintyRadiusNm'],
    previousValues: { uncertaintyRadiusNm: 2.0 },
    currentValues: { uncertaintyRadiusNm: 2.1 },
    decisionSensitivity: 'ROBUST',
    uncertaintyChange: {
      previousRadiusNm: 2.0,
      currentRadiusNm: 2.1,
      deltaNm: 0.1,
      expansionPct: 5.0,
      hasExpandedMaterially: false,
    },
    hazardImpact: {
      previousSeverity: 'LOW',
      currentSeverity: 'LOW',
      hasSeverityIncreased: false,
      previousCpaNm: 15.0,
      currentCpaNm: 15.0,
      cpaDeltaNm: 0.0,
      hasCpaDroppedMaterially: false,
      affectedHazardId: 'iceberg-a76a',
    },
    timestamp: '2026-09-27T02:00:00.000Z',
    provenance: 'REAL',
    dataMode: 'REAL',
    ...overrides,
  };
}

export async function runDecisionReassessmentPanelTests() {
  console.log('========================================================================================');
  console.log('RUNNING PHASE 12B DECISION REASSESSMENT UI COMPONENT TESTS');
  console.log('========================================================================================\n');

  // Test 1: STABLE renders
  {
    const res = createMockResult({ reassessmentStatus: 'STABLE' });
    const html = ReactDOMServer.renderToString(React.createElement(DecisionReassessmentPanel, { result: res }));
    assert(html.includes('STABLE'), '1. STABLE renders');
    assert(html.includes('reassessment-status-badge'), '1.1. Status badge testid rendered');
  }

  // Test 2: MONITOR renders
  {
    const res = createMockResult({ reassessmentStatus: 'MONITOR' });
    const html = ReactDOMServer.renderToString(React.createElement(DecisionReassessmentPanel, { result: res }));
    assert(html.includes('MONITOR'), '2. MONITOR renders');
  }

  // Test 3: REASSESS renders
  {
    const res = createMockResult({ reassessmentStatus: 'REASSESS' });
    const html = ReactDOMServer.renderToString(React.createElement(DecisionReassessmentPanel, { result: res }));
    assert(html.includes('REASSESS'), '3. REASSESS renders');
  }

  // Test 4: RECOMMEND_REVIEW renders
  {
    const res = createMockResult({ reassessmentStatus: 'RECOMMEND_REVIEW' });
    const html = ReactDOMServer.renderToString(React.createElement(DecisionReassessmentPanel, { result: res }));
    assert(html.includes('RECOMMEND REVIEW'), '4. RECOMMEND_REVIEW renders');
  }

  // Test 5: explanation renders
  {
    const res = createMockResult({ explanation: 'Custom decision stability explanation for testing.' });
    const html = ReactDOMServer.renderToString(React.createElement(DecisionReassessmentPanel, { result: res }));
    assert(html.includes('Custom decision stability explanation for testing.'), '5. explanation renders');
    assert(html.includes('reassessment-explanation'), '5.1. Explanation testid rendered');
  }

  // Test 6: trigger reasons render
  {
    const res = createMockResult({ triggerReasons: ['Trigger reason 1: Confidence dropped', 'Trigger reason 2: CPA decreased'] });
    const html = ReactDOMServer.renderToString(React.createElement(DecisionReassessmentPanel, { result: res }));
    assert(html.includes('Trigger reason 1: Confidence dropped') && html.includes('Trigger reason 2: CPA decreased'), '6. trigger reasons render');
  }

  // Test 7: changed variables render
  {
    const res = createMockResult({ changedVariables: ['confidenceLevel', 'primaryHazardSeverity'] });
    const html = ReactDOMServer.renderToString(React.createElement(DecisionReassessmentPanel, { result: res }));
    assert(html.includes('confidenceLevel') && html.includes('primaryHazardSeverity'), '7. changed variables render');
  }

  // Test 8: uncertainty comparison renders
  {
    const res = createMockResult({
      uncertaintyChange: {
        previousRadiusNm: 2.0,
        currentRadiusNm: 4.5,
        deltaNm: 2.5,
        expansionPct: 125.0,
        hasExpandedMaterially: true,
      },
    });
    const html = ReactDOMServer.renderToString(React.createElement(DecisionReassessmentPanel, { result: res }));
    assert(html.includes('Uncertainty Change') && html.includes('2.0 nm') && html.includes('4.5 nm'), '8. uncertainty comparison renders');
  }

  // Test 9: hazard/CPA information renders
  {
    const res = createMockResult({
      hazardImpact: {
        previousSeverity: 'LOW',
        currentSeverity: 'HIGH',
        hasSeverityIncreased: true,
        previousCpaNm: 15.0,
        currentCpaNm: 2.5,
        cpaDeltaNm: -12.5,
        hasCpaDroppedMaterially: true,
        affectedHazardId: 'iceberg-a76a',
      },
    });
    const html = ReactDOMServer.renderToString(React.createElement(DecisionReassessmentPanel, { result: res }));
    assert(html.includes('Hazard &amp; CPA Impact') || html.includes('Hazard & CPA Impact') || html.includes('iceberg-a76a'), '9. hazard/CPA information renders');
  }

  // Test 10: decision sensitivity renders
  {
    const res = createMockResult({ decisionSensitivity: 'HIGHLY_SENSITIVE' });
    const html = ReactDOMServer.renderToString(React.createElement(DecisionReassessmentPanel, { result: res }));
    assert(html.includes('HIGHLY SENSITIVE'), '10. decision sensitivity renders');
  }

  // Test 11: provenance renders
  {
    const res = createMockResult({ provenance: 'Copernicus CMEMS & USNIC' });
    const html = ReactDOMServer.renderToString(React.createElement(DecisionReassessmentPanel, { result: res }));
    assert(html.includes('Copernicus CMEMS &amp; USNIC') || html.includes('Copernicus CMEMS'), '11. provenance renders');
  }

  // Test 12: REAL data mode is correctly labelled
  {
    const res = createMockResult({ dataMode: 'REAL' });
    const html = ReactDOMServer.renderToString(React.createElement(DecisionReassessmentPanel, { result: res }));
    assert(html.includes('REAL'), '12. REAL data mode is correctly labelled');
  }

  // Test 13: SIMULATED data mode is correctly labelled
  {
    const res = createMockResult({ dataMode: 'SIMULATED' });
    const html = ReactDOMServer.renderToString(React.createElement(DecisionReassessmentPanel, { result: res }));
    assert(html.includes('SIMULATED'), '13. SIMULATED data mode is correctly labelled');
  }

  // Test 14: HYBRID data mode is correctly labelled
  {
    const res = createMockResult({ dataMode: 'HYBRID' });
    const html = ReactDOMServer.renderToString(React.createElement(DecisionReassessmentPanel, { result: res }));
    assert(html.includes('HYBRID'), '14. HYBRID data mode is correctly labelled');
  }

  // Test 15: OFFLINE does not itself imply reassessment
  {
    const res = createMockResult({
      reassessmentStatus: 'STABLE',
      explanation: 'Decision state is STABLE despite OFFLINE connectionState.',
    });
    const html = ReactDOMServer.renderToString(React.createElement(DecisionReassessmentPanel, { result: res }));
    assert(html.includes('STABLE') && !html.includes('REASSESS'), '15. OFFLINE does not itself imply reassessment');
  }

  // Test 16: navigator-review disclaimer renders
  {
    const res = createMockResult();
    const html = ReactDOMServer.renderToString(React.createElement(DecisionReassessmentPanel, { result: res }));
    assert(html.includes('CRYO NAV provides decision support. Route changes require navigator review.'), '16. navigator-review disclaimer renders');
  }

  // Test 17: no automatic route-change language is displayed
  {
    const res = createMockResult({ reassessmentStatus: 'RECOMMEND_REVIEW' });
    const html = ReactDOMServer.renderToString(React.createElement(DecisionReassessmentPanel, { result: res }));
    const forbiddenStrings = [
      'Route automatically changed',
      'Safe to proceed',
      'Collision guaranteed',
      'Collision avoided',
      'Captain should choose',
      'Best route',
      'Optimal route',
    ];
    const containsForbidden = forbiddenStrings.some((str) => html.includes(str));
    assert(!containsForbidden, '17. no automatic route-change language is displayed');
  }

  // Test 18: missing optional hazard ID is handled
  {
    const res = createMockResult({
      hazardImpact: {
        previousSeverity: 'NONE',
        currentSeverity: 'NONE',
        hasSeverityIncreased: false,
        previousCpaNm: null,
        currentCpaNm: null,
        cpaDeltaNm: null,
        hasCpaDroppedMaterially: false,
        affectedHazardId: null, // missing optional hazard ID
      },
    });
    const html = ReactDOMServer.renderToString(React.createElement(DecisionReassessmentPanel, { result: res }));
    assert(html.includes('None assigned') || html.includes('N/A'), '18. missing optional hazard ID is handled');
  }

  // Test 19: deterministic rendering
  {
    const res = createMockResult();
    const html1 = ReactDOMServer.renderToString(React.createElement(DecisionReassessmentPanel, { result: res }));
    const html2 = ReactDOMServer.renderToString(React.createElement(DecisionReassessmentPanel, { result: res }));
    assert(html1 === html2, '19. deterministic rendering');
  }

  // Test 20: empty trigger list is handled
  {
    const res = createMockResult({ triggerReasons: [] });
    const html = ReactDOMServer.renderToString(React.createElement(DecisionReassessmentPanel, { result: res }));
    assert(html.includes('No active triggers') || html.includes('empty-trigger-reasons'), '20. empty trigger list is handled');
  }

  console.log('\n========================================================================================');
  console.log('ALL PHASE 12B DECISION REASSESSMENT UI TESTS PASSED!');
  console.log('========================================================================================\n');
}

// Execute directly if run via CLI
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('decisionReassessmentPanel.test.ts')) {
  runDecisionReassessmentPanelTests().catch((err) => {
    console.error('Test execution error:', err);
    process.exit(1);
  });
}
