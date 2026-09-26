/**
 * CRYO NAV — Area-Centric SAR Analysis Unit Test Suite
 * Phase 7C.4-UX Redesign Verification
 */

import assert from 'assert';
import {
  filterCandidatesToArea,
  findSatelliteCoverageForArea,
  generateAreaConditionReport,
  calculateAreaSquareKm,
} from '../data/analysis/areaSarAnalysisEngine';
import { SelectedAnalysisArea, SarIcebergCandidate } from '../types';

export function runAreaSarAnalysisTests(): { passed: number; failed: number } {
  console.log('\n===================================================================');
  console.log('RUNNING PHASE 7C.4-UX AREA-CENTRIC SAR ANALYSIS UNIT TEST SUITE');
  console.log('===================================================================\n');

  let passed = 0;
  let failed = 0;

  function runTest(name: string, fn: () => void) {
    try {
      fn();
      console.log(`  ✓ PASSED: ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ✗ FAILED: ${name}`);
      console.error(`    Error: ${err.message}`);
      failed++;
    }
  }

  // Mock candidates for testing
  const mockCandidates: SarIcebergCandidate[] = [
    {
      id: 'SAR_CAND_0001',
      productId: 'S1A_IW_GRDH_1SDV_TEST_001',
      acquisitionTime: '2026-09-19T08:15:22Z',
      polarization: 'VV',
      latitude: -64.25,
      longitude: -64.10,
      rasterCoordinates: { minPixelX: 10, maxPixelX: 20, minLineY: 10, maxLineY: 20, centroidPixelX: 15, centroidLineY: 15 },
      geographicCoordinates: { centroidLat: -64.25, centroidLon: -64.10, minLat: -64.26, maxLat: -64.24, minLon: -64.11, maxLon: -64.09, isGeoreferenced: true, georeferenceMethod: 'GCP' },
      pixelCount: 8,
      areaPixels: 8,
      areaSquareMeters: 1600,
      estimatedAreaM2: 1600,
      widthMeters: 40,
      estimatedWidthMeters: 40,
      heightMeters: 40,
      estimatedHeightMeters: 40,
      aspectRatio: 1.0,
      compactness: 0.8,
      rectangularity: 0.8,
      solidity: 0.85,
      elongation: 1.0,
      meanBackscatter: 0.1,
      meanBackscatterDb: -10.0,
      maxBackscatter: 0.2,
      maxBackscatterDb: -7.0,
      backgroundBackscatter: 0.02,
      backgroundBackscatterDb: -17.0,
      meanTargetSigma0Linear: 0.1,
      meanBackgroundSigma0Linear: 0.02,
      contrast: 5.0,
      contrastDb: 7.0,
      linearContrastRatio: 5.0,
      backgroundStdDb: 2.0,
      backgroundCoeffVariation: 0.2,
      seaIceContext: 'ICE_EDGE',
      candidateScore: 65,
      status: 'UNCONFIRMED SAR CANDIDATE',
      confirmationStatus: 'ICEBERG CONFIRMATION: NOT YET PERFORMED',
      provenance: {
        source: 'Sentinel-1 SAR',
        provider: 'ESA',
        datasetId: 'S1A_IW_GRDH_1SDV_TEST_001',
        observationTime: '2026-09-19T08:15:22Z',
        ingestionTime: '2026-09-19T08:15:22Z',
        validTime: '2026-09-19T08:15:22Z',
        forecastHorizonHours: 0,
        freshnessState: 'FRESH',
        category: 'OBSERVED',
        isSynthetic: false,
        dataAgeHours: 0,
        qcFlag: 'PASSED',
      },
    },
    {
      id: 'SAR_CAND_0002',
      productId: 'S1A_IW_GRDH_1SDV_TEST_001',
      acquisitionTime: '2026-09-19T08:15:22Z',
      polarization: 'VV',
      latitude: -68.50, // Far south outside test area
      longitude: -68.50,
      rasterCoordinates: { minPixelX: 100, maxPixelX: 110, minLineY: 100, maxLineY: 110, centroidPixelX: 105, centroidLineY: 105 },
      geographicCoordinates: { centroidLat: -68.50, centroidLon: -68.50, minLat: -68.51, maxLat: -68.49, minLon: -68.51, maxLon: -68.49, isGeoreferenced: true, georeferenceMethod: 'GCP' },
      pixelCount: 12,
      areaPixels: 12,
      areaSquareMeters: 2400,
      estimatedAreaM2: 2400,
      widthMeters: 50,
      estimatedWidthMeters: 50,
      heightMeters: 48,
      estimatedHeightMeters: 48,
      aspectRatio: 1.04,
      compactness: 0.82,
      rectangularity: 0.81,
      solidity: 0.88,
      elongation: 1.04,
      meanBackscatter: 0.12,
      meanBackscatterDb: -9.2,
      maxBackscatter: 0.25,
      maxBackscatterDb: -6.0,
      backgroundBackscatter: 0.02,
      backgroundBackscatterDb: -17.0,
      meanTargetSigma0Linear: 0.12,
      meanBackgroundSigma0Linear: 0.02,
      contrast: 6.0,
      contrastDb: 7.8,
      linearContrastRatio: 6.0,
      backgroundStdDb: 1.8,
      backgroundCoeffVariation: 0.18,
      seaIceContext: 'ICE_EDGE',
      candidateScore: 78,
      status: 'UNCONFIRMED SAR CANDIDATE',
      confirmationStatus: 'ICEBERG CONFIRMATION: NOT YET PERFORMED',
      provenance: {
        source: 'Sentinel-1 SAR',
        provider: 'ESA',
        datasetId: 'S1A_IW_GRDH_1SDV_TEST_001',
        observationTime: '2026-09-19T08:15:22Z',
        ingestionTime: '2026-09-19T08:15:22Z',
        validTime: '2026-09-19T08:15:22Z',
        forecastHorizonHours: 0,
        freshnessState: 'FRESH',
        category: 'OBSERVED',
        isSynthetic: false,
        dataAgeHours: 0,
        qcFlag: 'PASSED',
      },
    },
  ];

  // Test Area
  const testArea: SelectedAnalysisArea = {
    id: 'test_area_001',
    type: 'RADIUS_POINT',
    centerLat: -64.25,
    centerLon: -64.10,
    radiusKm: 25,
    bounds: {
      minLat: -64.50,
      maxLat: -64.00,
      minLon: -64.50,
      maxLon: -63.70,
    },
    selectedAt: new Date().toISOString(),
  };

  runTest('1. filterCandidatesToArea spatially filters candidates to selected area bounds', () => {
    const filtered = filterCandidatesToArea(mockCandidates, testArea);
    assert.strictEqual(filtered.length, 1);
    assert.strictEqual(filtered[0].id, 'SAR_CAND_0001');
  });

  runTest('2. findSatelliteCoverageForArea returns AVAILABLE for matching real product', () => {
    const coverage = findSatelliteCoverageForArea(testArea, [], {}, ['S1A_IW_GRDH_1SDV_TEST_001']);
    assert.strictEqual(coverage.isAvailable, true);
    assert.strictEqual(coverage.statusText, 'AVAILABLE');
    assert.strictEqual(coverage.productId, 'S1A_IW_GRDH_1SDV_TEST_001');
  });

  runTest('3. findSatelliteCoverageForArea returns NOT AVAILABLE when no products exist', () => {
    const emptyCoverage = findSatelliteCoverageForArea(testArea, [], {}, []);
    assert.strictEqual(emptyCoverage.isAvailable, false);
    assert.strictEqual(emptyCoverage.statusText, 'NOT AVAILABLE');
  });

  runTest('4. calculateAreaSquareKm computes correct geometric area for radius point', () => {
    const sqKm = calculateAreaSquareKm(testArea);
    assert.strictEqual(sqKm > 1900 && sqKm < 2000, true); // Math.PI * 25^2 ≈ 1963.5
  });

  runTest('5. generateAreaConditionReport compiles valid internal evidence aggregate', () => {
    const report = generateAreaConditionReport(testArea, mockCandidates, {}, [], null, [], [], {});
    assert.strictEqual(report.satelliteCoverage.isAvailable, true);
    assert.strictEqual(report.sarAnalysis.totalCandidatesInArea, 1);
    assert.strictEqual(report.sarAnalysis.highestRankingIndex, 65);
    assert.strictEqual(report.sarAnalysis.confirmationStatus, 'UNCONFIRMED');
    assert.strictEqual(report.disclaimer.includes('not automatically classified as icebergs'), true);
  });

  runTest('6. Verifies candidate status is never hardcoded as confirmed iceberg', () => {
    const report = generateAreaConditionReport(testArea, mockCandidates, {}, [], null, [], [], {});
    assert.strictEqual((report.sarAnalysis.confirmationStatus as string).includes('CONFIRMED_ICEBERG'), false);
  });

  console.log(`\nPhase 7C.4-UX Area-Centric SAR Analysis Test Summary: ${passed} Passed, ${failed} Failed.`);
  return { passed, failed };
}
