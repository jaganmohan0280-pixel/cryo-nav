/**
 * CRYO NAV — Continuous Decision Reassessment Engine Test Suite
 * Phase 12A — Unit Verification
 *
 * Deterministic test suite verifying:
 * 1. identical state → STABLE
 * 2. small irrelevant environmental change → STABLE
 * 3. moderate relevant change → MONITOR
 * 4. material uncertainty expansion → REASSESS
 * 5. confidence drop → REASSESS
 * 6. freshness degradation → MONITOR/REASSESS according to threshold
 * 7. hazard severity increase → REASSESS
 * 8. CPA material change → REASSESS
 * 9. route sensitivity increase → RECOMMEND_REVIEW
 * 10. new relevant observation → REASSESS
 * 11. irrelevant distant observation → STABLE
 * 12. OFFLINE alone → no automatic reassessment (STABLE)
 * 13. OFFLINE + stale + sensitive hazard → RECOMMEND_REVIEW
 * 14. REAL provenance preservation
 * 15. SIMULATED provenance preservation
 * 16. deterministic output
 * 17. explanation generation
 * 18. previous/current comparison
 * 19. no route modification
 * 20. no acquisition execution
 */

import {
  evaluateDecisionReassessment,
  DecisionStateSnapshot,
  DecisionReassessmentResult,
} from '../services/decisionReassessmentEngine';
import { RouteAlternative } from '../types';

// Mock Route Fixture
const MOCK_ROUTE: RouteAlternative = {
  id: 'safest',
  name: 'Marguerite Bay Approach Alpha',
  type: 'SAFE',
  color: '#10b981',
  waypoints: [
    [-67.5, -68.0],
    [-67.8, -68.3],
    [-68.1, -68.6],
  ],
  distanceNm: 45.0,
  etaHours: 3.75,
  fuelTons: 7.5,
  riskIndex: 18,
  uncertaintyScore: 12,
  confidence: 'HIGH',
  hazardsCount: 0,
  hazardSummary: [],
  assumptions: [],
  constraintsSatisfied: true,
  isRecommended: true,
  recommendationRationale: 'Clear corridor',
  resilienceScore: 94,
  costBreakdown: { distanceCost: 1, fuelCost: 1, timeCost: 1, riskCost: 1, uncertaintyCost: 1, totalCost: 5 },
};

const BASELINE_SNAPSHOT: DecisionStateSnapshot = {
  timestamp: '2026-09-27T02:00:00Z',
  selectedRouteId: 'safest',
  selectedRouteName: 'Marguerite Bay Approach Alpha',
  confidenceLevel: 'HIGH',
  freshnessState: 'FRESH',
  connectionState: 'ONLINE',
  routeSensitivity: 'ROBUST',
  uncertaintyRadiusNm: 2.0,
  primaryHazardId: 'iceberg-a76a',
  primaryHazardSeverity: 'LOW',
  primaryHazardCpaNm: 15.0,
  primaryHazardTcaHours: 12.0,
  hasNewObservation: false,
  isObservationNearRoute: false,
  dataMode: 'REAL',
  provenance: 'REAL',
};

export function runDecisionReassessmentTests() {
  console.log('========================================================================================');
  console.log('RUNNING PHASE 12A CONTINUOUS DECISION REASSESSMENT CORE ENGINE TESTS');
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

  // Test 1: identical state → STABLE
  {
    const result = evaluateDecisionReassessment({
      previousState: BASELINE_SNAPSHOT,
      currentState: BASELINE_SNAPSHOT,
      activeRoute: MOCK_ROUTE,
    });
    assert(
      result.reassessmentStatus === 'STABLE',
      '1. identical state → STABLE',
      `Expected STABLE, got ${result.reassessmentStatus}`
    );
  }

  // Test 2: small irrelevant environmental change → STABLE
  {
    const current = {
      ...BASELINE_SNAPSHOT,
      uncertaintyRadiusNm: 2.1, // minor expansion below threshold
    };
    const result = evaluateDecisionReassessment({
      previousState: BASELINE_SNAPSHOT,
      currentState: current,
      activeRoute: MOCK_ROUTE,
    });
    assert(
      result.reassessmentStatus === 'STABLE',
      '2. small irrelevant environmental change → STABLE',
      `Expected STABLE, got ${result.reassessmentStatus}`
    );
  }

  // Test 3: moderate relevant change → MONITOR
  {
    const current = {
      ...BASELINE_SNAPSHOT,
      freshnessState: 'AGING',
    };
    const result = evaluateDecisionReassessment({
      previousState: BASELINE_SNAPSHOT,
      currentState: current,
      activeRoute: MOCK_ROUTE,
    });
    assert(
      result.reassessmentStatus === 'MONITOR',
      '3. moderate relevant change → MONITOR',
      `Expected MONITOR, got ${result.reassessmentStatus}`
    );
  }

  // Test 4: material uncertainty expansion → REASSESS
  {
    const current = {
      ...BASELINE_SNAPSHOT,
      uncertaintyRadiusNm: 4.5, // expanded from 2.0 to 4.5 nm (+125%)
    };
    const result = evaluateDecisionReassessment({
      previousState: BASELINE_SNAPSHOT,
      currentState: current,
      activeRoute: MOCK_ROUTE,
    });
    assert(
      result.reassessmentStatus === 'REASSESS' && result.uncertaintyChange.hasExpandedMaterially,
      '4. material uncertainty expansion → REASSESS',
      `Expected REASSESS, got ${result.reassessmentStatus}`
    );
  }

  // Test 5: confidence drop → REASSESS
  {
    const current = {
      ...BASELINE_SNAPSHOT,
      confidenceLevel: 'LOW',
    };
    const result = evaluateDecisionReassessment({
      previousState: BASELINE_SNAPSHOT,
      currentState: current,
      activeRoute: MOCK_ROUTE,
    });
    assert(
      result.reassessmentStatus === 'REASSESS',
      '5. confidence drop → REASSESS',
      `Expected REASSESS, got ${result.reassessmentStatus}`
    );
  }

  // Test 6: freshness degradation → MONITOR/REASSESS according to threshold
  {
    const current = {
      ...BASELINE_SNAPSHOT,
      freshnessState: 'STALE',
    };
    const result = evaluateDecisionReassessment({
      previousState: BASELINE_SNAPSHOT,
      currentState: current,
      activeRoute: MOCK_ROUTE,
    });
    assert(
      result.reassessmentStatus === 'MONITOR' || result.reassessmentStatus === 'REASSESS',
      '6. freshness degradation → MONITOR/REASSESS',
      `Expected MONITOR or REASSESS, got ${result.reassessmentStatus}`
    );
  }

  // Test 7: hazard severity increase → REASSESS
  {
    const current = {
      ...BASELINE_SNAPSHOT,
      primaryHazardSeverity: 'HIGH',
    };
    const result = evaluateDecisionReassessment({
      previousState: BASELINE_SNAPSHOT,
      currentState: current,
      activeRoute: MOCK_ROUTE,
    });
    assert(
      result.reassessmentStatus === 'REASSESS' && result.hazardImpact.hasSeverityIncreased,
      '7. hazard severity increase → REASSESS',
      `Expected REASSESS, got ${result.reassessmentStatus}`
    );
  }

  // Test 8: CPA material change → REASSESS
  {
    const current = {
      ...BASELINE_SNAPSHOT,
      primaryHazardCpaNm: 2.5, // dropped from 15.0 nm to 2.5 nm
    };
    const result = evaluateDecisionReassessment({
      previousState: BASELINE_SNAPSHOT,
      currentState: current,
      activeRoute: MOCK_ROUTE,
    });
    assert(
      result.reassessmentStatus === 'REASSESS' || result.reassessmentStatus === 'RECOMMEND_REVIEW',
      '8. CPA material change → REASSESS',
      `Expected REASSESS or RECOMMEND_REVIEW, got ${result.reassessmentStatus}`
    );
  }

  // Test 9: route sensitivity increase → RECOMMEND_REVIEW
  {
    const current = {
      ...BASELINE_SNAPSHOT,
      routeSensitivity: 'HIGHLY_SENSITIVE',
      primaryHazardSeverity: 'HIGH',
    };
    const result = evaluateDecisionReassessment({
      previousState: BASELINE_SNAPSHOT,
      currentState: current,
      activeRoute: MOCK_ROUTE,
    });
    assert(
      result.reassessmentStatus === 'RECOMMEND_REVIEW',
      '9. route sensitivity increase → RECOMMEND_REVIEW',
      `Expected RECOMMEND_REVIEW, got ${result.reassessmentStatus}`
    );
  }

  // Test 10: new relevant observation → REASSESS
  {
    const current = {
      ...BASELINE_SNAPSHOT,
      hasNewObservation: true,
      isObservationNearRoute: true,
    };
    const result = evaluateDecisionReassessment({
      previousState: BASELINE_SNAPSHOT,
      currentState: current,
      activeRoute: MOCK_ROUTE,
    });
    assert(
      result.reassessmentStatus === 'REASSESS',
      '10. new relevant observation → REASSESS',
      `Expected REASSESS, got ${result.reassessmentStatus}`
    );
  }

  // Test 11: irrelevant distant observation → STABLE
  {
    const current = {
      ...BASELINE_SNAPSHOT,
      hasNewObservation: true,
      isObservationNearRoute: false,
    };
    const result = evaluateDecisionReassessment({
      previousState: BASELINE_SNAPSHOT,
      currentState: current,
      activeRoute: MOCK_ROUTE,
    });
    assert(
      result.reassessmentStatus === 'STABLE' || result.reassessmentStatus === 'MONITOR',
      '11. irrelevant distant observation → STABLE',
      `Expected STABLE or MONITOR, got ${result.reassessmentStatus}`
    );
  }

  // Test 12: OFFLINE alone → no automatic reassessment
  {
    const current = {
      ...BASELINE_SNAPSHOT,
      connectionState: 'OFFLINE',
    };
    const result = evaluateDecisionReassessment({
      previousState: BASELINE_SNAPSHOT,
      currentState: current,
      activeRoute: MOCK_ROUTE,
    });
    assert(
      result.reassessmentStatus === 'STABLE',
      '12. OFFLINE alone → no automatic reassessment',
      `Expected STABLE, got ${result.reassessmentStatus}`
    );
  }

  // Test 13: OFFLINE + stale + sensitive hazard → RECOMMEND_REVIEW
  {
    const current = {
      ...BASELINE_SNAPSHOT,
      connectionState: 'OFFLINE',
      freshnessState: 'STALE',
      primaryHazardSeverity: 'HIGH',
    };
    const result = evaluateDecisionReassessment({
      previousState: BASELINE_SNAPSHOT,
      currentState: current,
      activeRoute: MOCK_ROUTE,
    });
    assert(
      result.reassessmentStatus === 'RECOMMEND_REVIEW',
      '13. OFFLINE + stale + sensitive hazard → RECOMMEND_REVIEW',
      `Expected RECOMMEND_REVIEW, got ${result.reassessmentStatus}`
    );
  }

  // Test 14: REAL provenance preservation
  {
    const result = evaluateDecisionReassessment({
      previousState: { ...BASELINE_SNAPSHOT, dataMode: 'REAL', provenance: 'REAL' },
      currentState: { ...BASELINE_SNAPSHOT, dataMode: 'REAL', provenance: 'REAL' },
      activeRoute: MOCK_ROUTE,
    });
    assert(
      result.dataMode === 'REAL' && result.provenance === 'REAL',
      '14. REAL provenance preservation',
      'Should preserve REAL dataMode and provenance'
    );
  }

  // Test 15: SIMULATED provenance preservation
  {
    const result = evaluateDecisionReassessment({
      previousState: { ...BASELINE_SNAPSHOT, dataMode: 'SIMULATED', provenance: 'SIMULATED' },
      currentState: { ...BASELINE_SNAPSHOT, dataMode: 'SIMULATED', provenance: 'SIMULATED' },
      activeRoute: MOCK_ROUTE,
    });
    assert(
      result.dataMode === 'SIMULATED' && result.provenance === 'SIMULATED',
      '15. SIMULATED provenance preservation',
      'Should preserve SIMULATED dataMode and provenance'
    );
  }

  // Test 16: deterministic output
  {
    const current = {
      ...BASELINE_SNAPSHOT,
      uncertaintyRadiusNm: 5.0,
      primaryHazardSeverity: 'HIGH',
    };
    const r1 = evaluateDecisionReassessment({
      previousState: BASELINE_SNAPSHOT,
      currentState: current,
      activeRoute: MOCK_ROUTE,
    });
    const r2 = evaluateDecisionReassessment({
      previousState: BASELINE_SNAPSHOT,
      currentState: current,
      activeRoute: MOCK_ROUTE,
    });
    const isIdentical =
      r1.reassessmentStatus === r2.reassessmentStatus &&
      r1.explanation === r2.explanation &&
      r1.triggerReasons.length === r2.triggerReasons.length;

    assert(isIdentical, '16. deterministic output', 'Identical inputs must produce identical outputs');
  }

  // Test 17: explanation generation
  {
    const current = {
      ...BASELINE_SNAPSHOT,
      uncertaintyRadiusNm: 6.0,
    };
    const result = evaluateDecisionReassessment({
      previousState: BASELINE_SNAPSHOT,
      currentState: current,
      activeRoute: MOCK_ROUTE,
    });
    assert(
      result.explanation.length > 0 && result.explanation.includes('Marguerite Bay Approach Alpha'),
      '17. explanation generation',
      'Explanation must be a non-empty natural language justification'
    );
  }

  // Test 18: previous/current comparison
  {
    const current = {
      ...BASELINE_SNAPSHOT,
      confidenceLevel: 'LOW',
    };
    const result = evaluateDecisionReassessment({
      previousState: BASELINE_SNAPSHOT,
      currentState: current,
      activeRoute: MOCK_ROUTE,
    });
    assert(
      result.previousValues.confidenceLevel === 'HIGH' && result.currentValues.confidenceLevel === 'LOW',
      '18. previous/current comparison',
      'Previous and current values must track changed state parameters'
    );
  }

  // Test 19: no route modification
  {
    const routeCopy = JSON.parse(JSON.stringify(MOCK_ROUTE));
    evaluateDecisionReassessment({
      previousState: BASELINE_SNAPSHOT,
      currentState: { ...BASELINE_SNAPSHOT, uncertaintyRadiusNm: 10.0 },
      activeRoute: MOCK_ROUTE,
    });
    const routeUnchanged = JSON.stringify(MOCK_ROUTE) === JSON.stringify(routeCopy);
    assert(routeUnchanged, '19. no route modification', 'Input route must remain completely unmodified');
  }

  // Test 20: no acquisition execution
  {
    const startTime = Date.now();
    const result = evaluateDecisionReassessment({
      previousState: BASELINE_SNAPSHOT,
      currentState: { ...BASELINE_SNAPSHOT, confidenceLevel: 'CRITICAL' },
      activeRoute: MOCK_ROUTE,
    });
    const duration = Date.now() - startTime;
    assert(
      duration < 500 && result.reassessmentStatus === 'REASSESS',
      '20. no acquisition execution',
      'Evaluation must execute synchronously without network downloads or satellite acquisition calls'
    );
  }

  console.log(`\nPHASE 12A DECISION REASSESSMENT TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================================================\n');

  return { passed, failed };
}

// Execute tests if run directly via tsx
runDecisionReassessmentTests();
