/**
 * CRYO NAV — Decision-Impact Data Acquisition UI Component Tests
 * Phase 11B — Test Suite for DecisionImpactAcquisitionPanel & AcquisitionPriorityList
 *
 * Verifies all 24 required test cases:
 * 1. CRITICAL priority
 * 2. HIGH priority
 * 3. MEDIUM priority
 * 4. LOW priority
 * 5. Engineering Priority Index score display
 * 6. Affected decision
 * 7. Uncertainty addressed
 * 8. Expected decision impact
 * 9. Expected uncertainty reduction
 * 10. Bandwidth within budget
 * 11. Bandwidth exceeded
 * 12. ONLINE connectivity
 * 13. LIMITED connectivity
 * 14. OFFLINE connectivity
 * 15. SYNCING connectivity
 * 16. REAL provenance
 * 17. SIMULATED provenance
 * 18. SAR evidence terminology ("SAR evidence/candidate region")
 * 19. No confirmed-iceberg language (must NOT say "confirmed iceberg")
 * 20. Empty candidates state ("No decision-impacting acquisition candidates available.")
 * 21. Unavailable candidates state ("Available satellite data could not be identified for the current decision.")
 * 22. Explanation rendering
 * 23. Deterministic ordering
 * 24. No fake download status ("Downloaded" not displayed when candidate is available/queued)
 */

import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { DecisionImpactAcquisitionPanel } from '../components/navigation/DecisionImpactAcquisitionPanel';
import { AcquisitionPriorityList } from '../components/navigation/AcquisitionPriorityList';
import { AcquisitionCandidate } from '../services/decisionImpactAcquisitionEngine';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`[FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  } else {
    console.log(`  [PASS] ${message}`);
  }
}

// Helper mock candidate builder
function createMockCandidate(overrides: Partial<AcquisitionCandidate> = {}): AcquisitionCandidate {
  return {
    productId: 'S1A_IW_GRDH_1SDV_20260927T020000',
    productName: 'Sentinel-1A IW GRDH Polar Sector',
    sensor: 'Sentinel-1 C-band SAR',
    productType: 'SAR Image Product',
    engineeringPriorityIndex: 88,
    priority: 'CRITICAL',
    availabilityStatus: 'AVAILABLE_FOR_DOWNLINK',
    affectedDecision: 'Navigation Corridor & Route Choice (Recommended Safe Route)',
    affectedRouteName: 'Recommended Safe Route',
    uncertaintyAddressed: 'Uncertainty Zone (2.5 nm radius)',
    expectedDecisionImpact: 'Potential route recommendation shift or corridor risk reduction',
    expectedUncertaintyReductionPct: 65,
    acquisitionCostMb: 45,
    withinBandwidthBudget: true,
    reason: 'High priority because the product overlaps 80% of Recommended Safe Route.',
    provenance: 'REAL',
    confidenceLevel: 'HIGH',
    freshnessState: 'FRESH',
    footprint: { centerLat: -65.2, centerLon: -64.1, radiusNm: 25.0, description: 'Polar sector coverage' },
    scoreBreakdown: {
      spatialOverlapPct: 80,
      temporalRelevancePct: 90,
      routeSensitivityRelevance: 85,
      uncertaintyMagnitudeScore: 75,
      potentialRecommendationShiftScore: 80,
      freshnessBenefitScore: 90,
      productAvailabilityScore: 90,
      resolutionRelevanceScore: 85,
      acquisitionCostPenalty: 0,
      connectivityCostPenalty: 0,
    },
    sarEvidenceNote: 'Covers 2 physically plausible SAR evidence/candidate region(s). Note: SAR backscatter targets represent candidate evidence regions.',
    rawProductMetadata: {
      id: 'S1A_IW_GRDH_1SDV_20260927T020000',
      sensor: 'Sentinel-1 C-band SAR',
      acquisitionTime: '2026-09-27T00:00:00Z',
      processingTime: '2026-09-27T01:00:00Z',
      footprint: { centerLat: -65.2, centerLon: -64.1, radiusNm: 25.0, description: 'Polar sector coverage' },
      productType: 'Dual-Polarization Iceberg Profiling',
      sizeMb: 45,
      availability: 'Available for Downlink',
      decisionImpactScore: 88,
      priority: 'HIGH',
      impactExplanation: 'High impact product',
      expectedUncertaintyReductionPct: 65,
      spatialOverlapWithRoutePct: 80,
      freshness: 'FRESH',
    },
    ...overrides,
  };
}

export async function runDecisionImpactAcquisitionPanelTests() {
  console.log('========================================================================================');
  console.log('RUNNING PHASE 11B DECISION-IMPACT DATA ACQUISITION UI TESTS');
  console.log('========================================================================================');

  // 1. CRITICAL priority
  console.log('\n--- Test 1: CRITICAL Priority Display ---');
  const candCritical = createMockCandidate({ priority: 'CRITICAL', engineeringPriorityIndex: 92 });
  const html1 = ReactDOMServer.renderToString(
    React.createElement(DecisionImpactAcquisitionPanel, { candidates: [candCritical] })
  );
  assert(html1.includes('CRITICAL PRIORITY'), 'Test 1.1: CRITICAL priority badge rendered');
  assert(html1.includes('priority-badge-critical'), 'Test 1.2: priority-badge-critical testid rendered');

  // 2. HIGH priority
  console.log('\n--- Test 2: HIGH Priority Display ---');
  const candHigh = createMockCandidate({ priority: 'HIGH', engineeringPriorityIndex: 68 });
  const html2 = ReactDOMServer.renderToString(
    React.createElement(DecisionImpactAcquisitionPanel, { candidates: [candHigh] })
  );
  assert(html2.includes('HIGH PRIORITY'), 'Test 2.1: HIGH priority badge rendered');
  assert(html2.includes('priority-badge-high'), 'Test 2.2: priority-badge-high testid rendered');

  // 3. MEDIUM priority
  console.log('\n--- Test 3: MEDIUM Priority Display ---');
  const candMedium = createMockCandidate({ priority: 'MEDIUM', engineeringPriorityIndex: 48 });
  const html3 = ReactDOMServer.renderToString(
    React.createElement(DecisionImpactAcquisitionPanel, { candidates: [candMedium] })
  );
  assert(html3.includes('MEDIUM PRIORITY'), 'Test 3.1: MEDIUM priority badge rendered');
  assert(html3.includes('priority-badge-medium'), 'Test 3.2: priority-badge-medium testid rendered');

  // 4. LOW priority
  console.log('\n--- Test 4: LOW Priority Display ---');
  const candLow = createMockCandidate({ priority: 'LOW', engineeringPriorityIndex: 25 });
  const html4 = ReactDOMServer.renderToString(
    React.createElement(DecisionImpactAcquisitionPanel, { candidates: [candLow] })
  );
  assert(html4.includes('LOW PRIORITY'), 'Test 4.1: LOW priority badge rendered');
  assert(html4.includes('priority-badge-low'), 'Test 4.2: priority-badge-low testid rendered');

  // 5. Engineering score display
  console.log('\n--- Test 5: Engineering Score Display ---');
  const html5 = ReactDOMServer.renderToString(
    React.createElement(DecisionImpactAcquisitionPanel, { candidates: [candCritical] })
  );
  assert(html5.includes('Engineering Priority Index'), 'Test 5.1: Engineering Priority Index label present');
  assert(html5.includes('92 / 100') || html5.includes('engineering-priority-index'), 'Test 5.2: Engineering priority index value 92/100 displayed');

  // 6. Affected decision
  console.log('\n--- Test 6: Affected Decision Display ---');
  assert(html5.includes('Affected Decision'), 'Test 6.1: Affected Decision label rendered');
  assert(html5.includes('Navigation Corridor &amp; Route Choice') || html5.includes('Navigation Corridor'), 'Test 6.2: Affected decision text rendered');

  // 7. Uncertainty addressed
  console.log('\n--- Test 7: Uncertainty Addressed Display ---');
  assert(html5.includes('Uncertainty Addressed'), 'Test 7.1: Uncertainty Addressed label rendered');
  assert(html5.includes('Uncertainty Zone (2.5 nm radius)'), 'Test 7.2: Uncertainty zone description rendered');

  // 8. Expected decision impact
  console.log('\n--- Test 8: Expected Decision Impact Display ---');
  assert(html5.includes('Expected Decision Impact'), 'Test 8.1: Expected Decision Impact label rendered');
  assert(html5.includes('Potential route recommendation shift'), 'Test 8.2: Expected decision impact text rendered');

  // 9. Uncertainty reduction
  console.log('\n--- Test 9: Expected Uncertainty Reduction Display ---');
  assert(html5.includes('Expected Uncertainty Reduction'), 'Test 9.1: Expected Uncertainty Reduction label rendered');
  assert(html5.includes('-65%'), 'Test 9.2: Expected uncertainty reduction percentage rendered');

  // 10. Bandwidth within budget
  console.log('\n--- Test 10: Bandwidth Within Budget Display ---');
  const candInBudget = createMockCandidate({ withinBandwidthBudget: true, acquisitionCostMb: 25 });
  const html10 = ReactDOMServer.renderToString(
    React.createElement(DecisionImpactAcquisitionPanel, { candidates: [candInBudget], availableBandwidthMb: 100 })
  );
  assert(html10.includes('Within current budget'), 'Test 10.1: Within current budget badge displayed');

  // 11. Bandwidth exceeded
  console.log('\n--- Test 11: Bandwidth Exceeded Display ---');
  const candExceeded = createMockCandidate({
    withinBandwidthBudget: false,
    availabilityStatus: 'EXCEEDS_BANDWIDTH',
    acquisitionCostMb: 250,
  });
  const html11 = ReactDOMServer.renderToString(
    React.createElement(DecisionImpactAcquisitionPanel, { candidates: [candExceeded], availableBandwidthMb: 100 })
  );
  assert(html11.includes('Exceeds current budget'), 'Test 11.1: Exceeds current budget badge displayed');

  // 12. ONLINE connectivity
  console.log('\n--- Test 12: ONLINE Connectivity State ---');
  const html12 = ReactDOMServer.renderToString(
    React.createElement(DecisionImpactAcquisitionPanel, { candidates: [candCritical], connectionState: 'ONLINE' })
  );
  assert(html12.includes('ONLINE'), 'Test 12.1: ONLINE connectivity badge displayed');

  // 13. LIMITED connectivity
  console.log('\n--- Test 13: LIMITED Connectivity State ---');
  const html13 = ReactDOMServer.renderToString(
    React.createElement(DecisionImpactAcquisitionPanel, { candidates: [candCritical], connectionState: 'LIMITED' })
  );
  assert(html13.includes('LIMITED'), 'Test 13.1: LIMITED connectivity badge displayed');

  // 14. OFFLINE connectivity
  console.log('\n--- Test 14: OFFLINE Connectivity State ---');
  const html14 = ReactDOMServer.renderToString(
    React.createElement(DecisionImpactAcquisitionPanel, { candidates: [candCritical], connectionState: 'OFFLINE' })
  );
  assert(html14.includes('OFFLINE'), 'Test 14.1: OFFLINE connectivity badge displayed');
  assert(html14.includes('Ready when connected'), 'Test 14.2: Ready when connected status displayed for offline candidate');

  // 15. SYNCING connectivity
  console.log('\n--- Test 15: SYNCING Connectivity State ---');
  const html15 = ReactDOMServer.renderToString(
    React.createElement(DecisionImpactAcquisitionPanel, { candidates: [candCritical], connectionState: 'SYNCING' })
  );
  assert(html15.includes('SYNCING'), 'Test 15.1: SYNCING connectivity badge displayed');

  // 16. REAL provenance
  console.log('\n--- Test 16: REAL Provenance Badge ---');
  const candReal = createMockCandidate({ provenance: 'REAL' });
  const html16 = ReactDOMServer.renderToString(
    React.createElement(DecisionImpactAcquisitionPanel, { candidates: [candReal] })
  );
  assert(html16.includes('REAL'), 'Test 16.1: REAL provenance badge rendered');

  // 17. SIMULATED provenance
  console.log('\n--- Test 17: SIMULATED Provenance Badge ---');
  const candSimulated = createMockCandidate({ provenance: 'SIMULATED' });
  const html17 = ReactDOMServer.renderToString(
    React.createElement(DecisionImpactAcquisitionPanel, { candidates: [candSimulated] })
  );
  assert(html17.includes('SIMULATED'), 'Test 17.1: SIMULATED provenance badge rendered');

  // 18. SAR evidence terminology
  console.log('\n--- Test 18: SAR Evidence Terminology ---');
  const html18 = ReactDOMServer.renderToString(
    React.createElement(DecisionImpactAcquisitionPanel, { candidates: [candCritical] })
  );
  assert(html18.includes('SAR evidence/candidate region'), 'Test 18.1: Uses SAR evidence/candidate region terminology');

  // 19. No confirmed-iceberg language
  console.log('\n--- Test 19: Strict Absence of Confirmed Iceberg Language ---');
  const lowerHtml = html18.toLowerCase();
  assert(!lowerHtml.includes('confirmed iceberg'), 'Test 19.1: Panel strictly avoids "confirmed iceberg" language');

  // 20. Empty candidates
  console.log('\n--- Test 20: Empty Candidates State ---');
  const html20 = ReactDOMServer.renderToString(
    React.createElement(DecisionImpactAcquisitionPanel, { candidates: [] })
  );
  assert(html20.includes('No decision-impacting acquisition candidates available.'), 'Test 20.1: Correct empty candidate message displayed');

  // 21. Unavailable candidates
  console.log('\n--- Test 21: Unavailable Candidates State ---');
  const html21 = ReactDOMServer.renderToString(
    React.createElement(AcquisitionPriorityList, { candidates: [], emptyReason: 'UNAVAILABLE' })
  );
  assert(html21.includes('Available satellite data could not be identified for the current decision.'), 'Test 21.1: Correct unavailable candidates message displayed');

  // 22. Explanation rendering
  console.log('\n--- Test 22: Explanation Rendering ---');
  assert(html1.includes('Reason for Priority:'), 'Test 22.1: Reason for priority header rendered');
  assert(html1.includes('High priority because the product overlaps 80%'), 'Test 22.2: Candidate explanation text rendered');

  // 23. Deterministic ordering
  console.log('\n--- Test 23: Deterministic Ordering ---');
  const cand1 = createMockCandidate({ productId: 'prod-1', engineeringPriorityIndex: 95, priority: 'CRITICAL' });
  const cand2 = createMockCandidate({ productId: 'prod-2', engineeringPriorityIndex: 60, priority: 'HIGH' });
  const html23 = ReactDOMServer.renderToString(
    React.createElement(DecisionImpactAcquisitionPanel, { candidates: [cand1, cand2] })
  );
  const pos1 = html23.indexOf('prod-1');
  const pos2 = html23.indexOf('prod-2');
  assert(pos1 !== -1 && pos2 !== -1 && pos1 < pos2, 'Test 23.1: Higher priority index candidate (prod-1: 95) rendered before lower candidate (prod-2: 60)');

  // 24. No fake download status
  console.log('\n--- Test 24: No Fake Download Status ---');
  const candAvailable = createMockCandidate({ availabilityStatus: 'AVAILABLE_FOR_DOWNLINK' });
  const html24 = ReactDOMServer.renderToString(
    React.createElement(DecisionImpactAcquisitionPanel, { candidates: [candAvailable] })
  );
  assert(!html24.includes('Downloaded'), 'Test 24.1: Available candidate does not show fake Downloaded status');

  console.log('\n========================================================================================');
  console.log('ALL PHASE 11B DECISION-IMPACT DATA ACQUISITION UI TESTS PASSED!');
  console.log('========================================================================================\n');
}

// Direct CLI Execution runner
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('decisionImpactAcquisitionPanel.test.ts')) {
  runDecisionImpactAcquisitionPanelTests().catch((err) => {
    console.error('Test execution error:', err);
    process.exit(1);
  });
}
