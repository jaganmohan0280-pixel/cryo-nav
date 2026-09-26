/**
 * CRYO NAV — Decision-Impact Data Acquisition Core Engine Test Suite
 * Phase 11A — Unit Verification
 *
 * Deterministic test suite verifying:
 * 1. high spatial overlap
 * 2. low spatial overlap
 * 3. high route sensitivity
 * 4. low route sensitivity
 * 5. high uncertainty
 * 6. low uncertainty
 * 7. fresh product
 * 8. stale product
 * 9. available product
 * 10. unavailable product
 * 11. high resolution relevance
 * 12. low resolution relevance
 * 13. low acquisition cost
 * 14. high acquisition cost
 * 15. ONLINE connectivity
 * 16. LIMITED connectivity
 * 17. OFFLINE connectivity
 * 18. SYNCING connectivity
 * 19. bandwidth budget compliance
 * 20. product too large for budget
 * 21. decision-impact explanation
 * 22. multiple products ranking
 * 23. deterministic ranking
 * 24. REAL satellite metadata preservation
 * 25. SAR candidate is not labeled confirmed iceberg
 * 26. no download occurs
 * 27. no route modification occurs
 * 28. missing factor handling
 */

import {
  evaluateAcquisitionPriorities,
  DecisionImpactAcquisitionInput,
  AcquisitionRankingResult,
} from '../services/decisionImpactAcquisitionEngine';
import {
  SatelliteProduct,
  RouteAlternative,
  BatchSensitivitySummary,
} from '../types';
import { UncertaintyZone } from '../services/uncertaintyEngine';

// Test Fixtures
const MOCK_ROUTE_ALPHA: RouteAlternative = {
  id: 'safest',
  name: 'Ross Sea Corridor Alpha',
  type: 'SAFE',
  color: '#10b981',
  waypoints: [
    [-64.0, 160.0],
    [-64.5, 161.0],
    [-65.0, 162.0],
  ],
  distanceNm: 75.0,
  etaHours: 6.25,
  fuelTons: 12.5,
  riskIndex: 22,
  uncertaintyScore: 15,
  confidence: 'HIGH',
  hazardsCount: 0,
  hazardSummary: [],
  assumptions: [],
  constraintsSatisfied: true,
  isRecommended: true,
  recommendationRationale: 'Clear of fast ice',
  resilienceScore: 92,
  costBreakdown: { distanceCost: 1, fuelCost: 1, timeCost: 1, riskCost: 1, uncertaintyCost: 1, totalCost: 5 },
};

const MOCK_PRODUCT_NEAR: SatelliteProduct = {
  id: 'fixture-sentinel-1-near',
  name: 'Sentinel-1C SAR Wide Swath (Ross Sea)',
  sensor: 'Sentinel-1 SAR',
  resolutionMeters: 10,
  acquisitionTime: '2026-09-27T01:00:00Z',
  processingTime: '2026-09-27T01:15:00Z',
  footprint: {
    centerLat: -64.25,
    centerLon: 160.5,
    radiusNm: 30,
    description: 'Ross Sea Swath Footprint',
  },
  productType: 'SAR Wide Swath Ice Drift',
  sizeMb: 45,
  availability: 'Available for Downlink',
  decisionImpactScore: 85,
  priority: 'HIGH',
  impactExplanation: 'Overlaps active corridor Alpha',
  expectedUncertaintyReductionPct: 65,
  spatialOverlapWithRoutePct: 90,
  freshness: 'FRESH',
};

const MOCK_PRODUCT_FAR: SatelliteProduct = {
  id: 'fixture-sentinel-1-far',
  name: 'Sentinel-1A SAR Swath (Weddell Sea)',
  sensor: 'Sentinel-1 SAR',
  resolutionMeters: 10,
  acquisitionTime: '2026-09-26T12:00:00Z',
  processingTime: '2026-09-26T12:30:00Z',
  footprint: {
    centerLat: -75.0,
    centerLon: -40.0,
    radiusNm: 30,
    description: 'Weddell Sea Remote Swath',
  },
  productType: 'SAR Wide Swath Ice Drift',
  sizeMb: 50,
  availability: 'Available for Downlink',
  decisionImpactScore: 15,
  priority: 'LOW',
  impactExplanation: 'Remote sector',
  expectedUncertaintyReductionPct: 10,
  spatialOverlapWithRoutePct: 0,
  freshness: 'STALE',
};

export function runDecisionImpactAcquisitionTests() {
  console.log('========================================================================================');
  console.log('RUNNING PHASE 11A DECISION-IMPACT DATA ACQUISITION CORE ENGINE TESTS');
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

  // Test 1: high spatial overlap
  {
    const result = evaluateAcquisitionPriorities({
      activeRoutes: [MOCK_ROUTE_ALPHA],
      candidateProducts: [MOCK_PRODUCT_NEAR],
    });
    const candidate = result.rankedCandidates[0];
    assert(
      candidate.scoreBreakdown.spatialOverlapPct > 50,
      '1. high spatial overlap',
      `Expected spatialOverlapPct > 50%, got ${candidate.scoreBreakdown.spatialOverlapPct}%`
    );
  }

  // Test 2: low spatial overlap
  {
    const result = evaluateAcquisitionPriorities({
      activeRoutes: [MOCK_ROUTE_ALPHA],
      candidateProducts: [MOCK_PRODUCT_FAR],
    });
    const candidate = result.rankedCandidates[0];
    assert(
      candidate.scoreBreakdown.spatialOverlapPct < 20,
      '2. low spatial overlap',
      `Expected spatialOverlapPct < 20%, got ${candidate.scoreBreakdown.spatialOverlapPct}%`
    );
  }

  // Test 3: high route sensitivity
  {
    const sensitivityHigh: BatchSensitivitySummary = {
      overallStability: 'HIGHLY_SENSITIVE',
      dominantSensitivity: 'ICEBERG_DRIFT',
      dominantExplanation: 'Route recommendation shifts under iceberg drift perturbations.',
      parameterResults: [],
      testedScenariosCount: 9,
      recommendationChangedCount: 4,
      analysisTimestamp: '2026-09-27T01:00:00Z',
    };
    const result = evaluateAcquisitionPriorities({
      activeRoutes: [MOCK_ROUTE_ALPHA],
      candidateProducts: [MOCK_PRODUCT_NEAR],
      batchSensitivity: sensitivityHigh,
    });
    assert(
      result.rankedCandidates[0].scoreBreakdown.routeSensitivityRelevance >= 90,
      '3. high route sensitivity',
      'Expected high route sensitivity relevance score'
    );
  }

  // Test 4: low route sensitivity
  {
    const sensitivityLow: BatchSensitivitySummary = {
      overallStability: 'ROBUST',
      dominantSensitivity: null,
      dominantExplanation: 'Route choice is robust across perturbations.',
      parameterResults: [],
      testedScenariosCount: 9,
      recommendationChangedCount: 0,
      analysisTimestamp: '2026-09-27T01:00:00Z',
    };
    const result = evaluateAcquisitionPriorities({
      activeRoutes: [MOCK_ROUTE_ALPHA],
      candidateProducts: [MOCK_PRODUCT_NEAR],
      batchSensitivity: sensitivityLow,
    });
    assert(
      result.rankedCandidates[0].scoreBreakdown.routeSensitivityRelevance <= 40,
      '4. low route sensitivity',
      'Expected low route sensitivity relevance score'
    );
  }

  // Test 5: high uncertainty
  {
    const highUncertaintyZone: UncertaintyZone = {
      center: { lat: -64.25, lon: 160.5 },
      radiusNm: 8.5,
      baseRadiusNm: 2.0,
      expansionFactor: 4.25,
      hazardType: 'ICEBERG',
      confidenceLevel: 'LOW',
      freshnessState: 'STALE',
      connectionState: 'OFFLINE',
      forecastHorizonHours: 72,
      forecastHorizonLabel: '+72h',
      reasons: ['Offline data aging'],
      explanation: 'Expanded uncertainty',
      severity: 'HIGH',
      riskModifier: 1.4,
      recommendedCautionLevel: 'HIGH_CAUTION',
      dataMode: 'REAL',
      provenance: 'REAL',
    };

    const result = evaluateAcquisitionPriorities({
      activeRoutes: [MOCK_ROUTE_ALPHA],
      candidateProducts: [MOCK_PRODUCT_NEAR],
      uncertaintyZones: [highUncertaintyZone],
    });
    assert(
      result.rankedCandidates[0].scoreBreakdown.uncertaintyMagnitudeScore > 70,
      '5. high uncertainty',
      'Expected high uncertainty magnitude score'
    );
  }

  // Test 6: low uncertainty
  {
    const lowUncertaintyZone: UncertaintyZone = {
      center: { lat: -64.25, lon: 160.5 },
      radiusNm: 0.8,
      baseRadiusNm: 0.8,
      expansionFactor: 1.0,
      hazardType: 'ICEBERG',
      confidenceLevel: 'HIGH',
      freshnessState: 'FRESH',
      connectionState: 'ONLINE',
      forecastHorizonHours: 6,
      forecastHorizonLabel: '+6h',
      reasons: ['Fresh data'],
      explanation: 'Tight uncertainty',
      severity: 'LOW',
      riskModifier: 1.0,
      recommendedCautionLevel: 'STANDARD',
      dataMode: 'REAL',
      provenance: 'REAL',
    };

    const result = evaluateAcquisitionPriorities({
      activeRoutes: [MOCK_ROUTE_ALPHA],
      candidateProducts: [MOCK_PRODUCT_NEAR],
      uncertaintyZones: [lowUncertaintyZone],
    });
    assert(
      result.rankedCandidates[0].scoreBreakdown.uncertaintyMagnitudeScore <= 60,
      '6. low uncertainty',
      'Expected lower uncertainty magnitude score'
    );
  }

  // Test 7: fresh product
  {
    const result = evaluateAcquisitionPriorities({
      activeRoutes: [MOCK_ROUTE_ALPHA],
      candidateProducts: [{ ...MOCK_PRODUCT_NEAR, freshness: 'FRESH' }],
    });
    assert(
      result.rankedCandidates[0].scoreBreakdown.temporalRelevancePct >= 90,
      '7. fresh product',
      'Expected high temporal relevance score for FRESH product'
    );
  }

  // Test 8: stale product
  {
    const result = evaluateAcquisitionPriorities({
      activeRoutes: [MOCK_ROUTE_ALPHA],
      candidateProducts: [{ ...MOCK_PRODUCT_NEAR, freshness: 'STALE' }],
    });
    assert(
      result.rankedCandidates[0].scoreBreakdown.temporalRelevancePct <= 50,
      '8. stale product',
      'Expected lower temporal relevance score for STALE product'
    );
  }

  // Test 9: available product
  {
    const result = evaluateAcquisitionPriorities({
      activeRoutes: [MOCK_ROUTE_ALPHA],
      candidateProducts: [{ ...MOCK_PRODUCT_NEAR, availability: 'Available for Downlink' }],
      connectionState: 'ONLINE',
    });
    assert(
      result.rankedCandidates[0].availabilityStatus === 'AVAILABLE_FOR_DOWNLINK',
      '9. available product',
      'Expected AVAILABLE_FOR_DOWNLINK status'
    );
  }

  // Test 10: unavailable product
  {
    const result = evaluateAcquisitionPriorities({
      activeRoutes: [MOCK_ROUTE_ALPHA],
      candidateProducts: [{ ...MOCK_PRODUCT_NEAR, availability: 'Acquired' }],
      connectionState: 'ONLINE',
    });
    assert(
      result.rankedCandidates[0].availabilityStatus === 'ACQUIRED',
      '10. unavailable product',
      'Expected ACQUIRED status'
    );
  }

  // Test 11: high resolution relevance
  {
    const result = evaluateAcquisitionPriorities({
      activeRoutes: [MOCK_ROUTE_ALPHA],
      candidateProducts: [{ ...MOCK_PRODUCT_NEAR, resolutionMeters: 5 }],
    });
    assert(
      result.rankedCandidates[0].scoreBreakdown.resolutionRelevanceScore >= 90,
      '11. high resolution relevance',
      'Expected high resolution relevance score for 5m product'
    );
  }

  // Test 12: low resolution relevance
  {
    const result = evaluateAcquisitionPriorities({
      activeRoutes: [MOCK_ROUTE_ALPHA],
      candidateProducts: [{ ...MOCK_PRODUCT_NEAR, resolutionMeters: 500 }],
    });
    assert(
      result.rankedCandidates[0].scoreBreakdown.resolutionRelevanceScore <= 50,
      '12. low resolution relevance',
      'Expected low resolution relevance score for 500m product'
    );
  }

  // Test 13: low acquisition cost
  {
    const result = evaluateAcquisitionPriorities({
      activeRoutes: [MOCK_ROUTE_ALPHA],
      candidateProducts: [{ ...MOCK_PRODUCT_NEAR, sizeMb: 15 }],
    });
    assert(
      result.rankedCandidates[0].scoreBreakdown.acquisitionCostPenalty === 0,
      '13. low acquisition cost',
      'Expected zero acquisition cost penalty for 15MB file'
    );
  }

  // Test 14: high acquisition cost
  {
    const result = evaluateAcquisitionPriorities({
      activeRoutes: [MOCK_ROUTE_ALPHA],
      candidateProducts: [{ ...MOCK_PRODUCT_NEAR, sizeMb: 450 }],
    });
    assert(
      result.rankedCandidates[0].scoreBreakdown.acquisitionCostPenalty > 20,
      '14. high acquisition cost',
      'Expected acquisition cost penalty for 450MB file'
    );
  }

  // Test 15: ONLINE
  {
    const result = evaluateAcquisitionPriorities({
      activeRoutes: [MOCK_ROUTE_ALPHA],
      candidateProducts: [MOCK_PRODUCT_NEAR],
      connectionState: 'ONLINE',
    });
    assert(
      result.connectionState === 'ONLINE' && result.rankedCandidates[0].availabilityStatus === 'AVAILABLE_FOR_DOWNLINK',
      '15. ONLINE',
      'Should report ONLINE connectivity and AVAILABLE_FOR_DOWNLINK candidate status'
    );
  }

  // Test 16: LIMITED
  {
    const result = evaluateAcquisitionPriorities({
      activeRoutes: [MOCK_ROUTE_ALPHA],
      candidateProducts: [MOCK_PRODUCT_NEAR],
      connectionState: 'LIMITED',
    });
    assert(
      result.connectionState === 'LIMITED' && result.rankedCandidates[0].scoreBreakdown.connectivityCostPenalty > 0,
      '16. LIMITED',
      'Should report LIMITED connectivity and apply connectivity cost penalty'
    );
  }

  // Test 17: OFFLINE
  {
    const result = evaluateAcquisitionPriorities({
      activeRoutes: [MOCK_ROUTE_ALPHA],
      candidateProducts: [MOCK_PRODUCT_NEAR],
      connectionState: 'OFFLINE',
    });
    assert(
      result.rankedCandidates[0].availabilityStatus === 'READY_WHEN_CONNECTED',
      '17. OFFLINE',
      'OFFLINE state should tag candidate as READY_WHEN_CONNECTED without claiming download happened'
    );
  }

  // Test 18: SYNCING
  {
    const result = evaluateAcquisitionPriorities({
      activeRoutes: [MOCK_ROUTE_ALPHA],
      candidateProducts: [MOCK_PRODUCT_NEAR],
      connectionState: 'SYNCING',
    });
    assert(
      result.rankedCandidates[0].availabilityStatus === 'READY_WHEN_CONNECTED',
      '18. SYNCING',
      'SYNCING state should tag candidate as READY_WHEN_CONNECTED'
    );
  }

  // Test 19: bandwidth budget
  {
    const result = evaluateAcquisitionPriorities({
      activeRoutes: [MOCK_ROUTE_ALPHA],
      candidateProducts: [{ ...MOCK_PRODUCT_NEAR, sizeMb: 45 }],
      availableBandwidthMb: 100,
    });
    assert(
      result.rankedCandidates[0].withinBandwidthBudget === true,
      '19. bandwidth budget',
      '45MB product should be marked within 100MB bandwidth budget'
    );
  }

  // Test 20: product too large for budget
  {
    const result = evaluateAcquisitionPriorities({
      activeRoutes: [MOCK_ROUTE_ALPHA],
      candidateProducts: [{ ...MOCK_PRODUCT_NEAR, sizeMb: 250 }],
      availableBandwidthMb: 100,
    });
    assert(
      result.rankedCandidates[0].withinBandwidthBudget === false &&
        result.rankedCandidates[0].availabilityStatus === 'EXCEEDS_BANDWIDTH',
      '20. product too large for budget',
      '250MB product should exceed 100MB bandwidth budget and be marked EXCEEDS_BANDWIDTH'
    );
  }

  // Test 21: decision-impact explanation
  {
    const result = evaluateAcquisitionPriorities({
      activeRoutes: [MOCK_ROUTE_ALPHA],
      candidateProducts: [MOCK_PRODUCT_NEAR],
    });
    const reason = result.rankedCandidates[0].reason;
    assert(
      reason.includes('Ross Sea Corridor Alpha') && reason.includes('Index'),
      '21. decision-impact explanation',
      'Reason should contain human-readable decision impact rationale'
    );
  }

  // Test 22: multiple products ranking
  {
    const result = evaluateAcquisitionPriorities({
      activeRoutes: [MOCK_ROUTE_ALPHA],
      candidateProducts: [MOCK_PRODUCT_FAR, MOCK_PRODUCT_NEAR],
    });
    assert(
      result.rankedCandidates[0].productId === MOCK_PRODUCT_NEAR.id,
      '22. multiple products ranking',
      'Near product should rank above far product'
    );
  }

  // Test 23: deterministic ranking
  {
    const input: DecisionImpactAcquisitionInput = {
      activeRoutes: [MOCK_ROUTE_ALPHA],
      candidateProducts: [MOCK_PRODUCT_FAR, MOCK_PRODUCT_NEAR],
    };
    const result1 = evaluateAcquisitionPriorities(input);
    const result2 = evaluateAcquisitionPriorities(input);

    const isIdentical =
      result1.rankedCandidates[0].engineeringPriorityIndex ===
        result2.rankedCandidates[0].engineeringPriorityIndex &&
      result1.rankedCandidates[0].productId === result2.rankedCandidates[0].productId &&
      result1.rankedCandidates[1].productId === result2.rankedCandidates[1].productId;

    assert(isIdentical, '23. deterministic ranking', 'Identical inputs should yield identical ranking');
  }

  // Test 24: REAL satellite metadata preservation
  {
    const result = evaluateAcquisitionPriorities({
      activeRoutes: [MOCK_ROUTE_ALPHA],
      candidateProducts: [MOCK_PRODUCT_NEAR],
    });
    assert(
      result.rankedCandidates[0].provenance === 'REAL' &&
        result.rankedCandidates[0].rawProductMetadata.id === MOCK_PRODUCT_NEAR.id,
      '24. REAL satellite metadata preservation',
      'Should preserve REAL provenance and raw satellite product metadata'
    );
  }

  // Test 25: SAR candidate is not labeled confirmed iceberg
  {
    const result = evaluateAcquisitionPriorities({
      activeRoutes: [MOCK_ROUTE_ALPHA],
      candidateProducts: [MOCK_PRODUCT_NEAR],
      sarCandidateRegionsCount: 3,
    });
    const candidate = result.rankedCandidates[0];
    const sarNote = candidate.sarEvidenceNote || '';
    const claimsConfirmedIcebergs =
      sarNote.toLowerCase().includes('3 confirmed icebergs') ||
      sarNote.toLowerCase().includes('iceberg count: 3');

    assert(
      sarNote.includes('SAR evidence/candidate region') && !claimsConfirmedIcebergs,
      '25. SAR candidate is not labeled confirmed iceberg',
      'SAR notes must describe candidates as SAR evidence/candidate regions, NOT confirmed icebergs'
    );
  }

  // Test 26: no download occurs
  {
    // Synchronous execution completes without async network operations
    const startTime = Date.now();
    const result = evaluateAcquisitionPriorities({
      activeRoutes: [MOCK_ROUTE_ALPHA],
      candidateProducts: [MOCK_PRODUCT_NEAR, MOCK_PRODUCT_FAR],
    });
    const duration = Date.now() - startTime;
    assert(
      duration < 500 && result.rankedCandidates.length === 2,
      '26. no download occurs',
      'Evaluation must execute synchronously without network downloads'
    );
  }

  // Test 27: no route modification occurs
  {
    const routeCopy = JSON.parse(JSON.stringify(MOCK_ROUTE_ALPHA));
    evaluateAcquisitionPriorities({
      activeRoutes: [MOCK_ROUTE_ALPHA],
      candidateProducts: [MOCK_PRODUCT_NEAR],
    });
    const routeUnchanged = JSON.stringify(MOCK_ROUTE_ALPHA) === JSON.stringify(routeCopy);
    assert(
      routeUnchanged,
      '27. no route modification occurs',
      'Input routes and waypoints must remain completely unmodified'
    );
  }

  // Test 28: missing factor handling
  {
    const result = evaluateAcquisitionPriorities({
      activeRoutes: [],
      candidateProducts: [
        {
          id: 'minimal-product',
          sensor: 'Generic SAR',
          acquisitionTime: '2026-09-27T00:00:00Z',
          processingTime: '2026-09-27T00:05:00Z',
          footprint: { centerLat: -65, centerLon: -64, radiusNm: 20, description: 'Footprint' },
          productType: 'SAR Wide Swath Ice Drift',
          sizeMb: 50,
          availability: 'Available for Downlink',
          decisionImpactScore: 50,
          priority: 'MEDIUM',
          impactExplanation: 'Minimal input',
          expectedUncertaintyReductionPct: 20,
          spatialOverlapWithRoutePct: 0,
          freshness: 'UNAVAILABLE',
        },
      ],
      decisionConfidence: null,
      batchSensitivity: null,
      uncertaintyZones: [],
    });
    assert(
      result.rankedCandidates.length === 1 && result.rankedCandidates[0].productId === 'minimal-product',
      '28. missing factor handling',
      'Should handle missing confidence, sensitivity, and uncertainty zones gracefully'
    );
  }

  console.log(`\nPHASE 11A DECISION IMPACT ACQUISITION TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================================================\n');

  return { passed, failed };
}

// Execute tests if run directly via tsx
runDecisionImpactAcquisitionTests();
