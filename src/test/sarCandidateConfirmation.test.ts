/**
 * CRYO NAV — Phase 7C.4 SAR Candidate Evidence & Confirmation Unit Test Suite
 *
 * Deterministic test cases covering:
 * 1. candidate with no external evidence -> UNCONFIRMED
 * 2. candidate with valid supporting evidence -> SUPPORTED
 * 3. candidate with USNIC reference match -> REFERENCE_MATCHED
 * 4. unavailable USNIC -> REFERENCE_DATA_UNAVAILABLE
 * 5. unavailable sea-ice context -> UNAVAILABLE
 * 6. no temporal acquisition -> TEMPORAL_EVIDENCE_UNAVAILABLE
 * 7. no synthetic fallback (isSynthetic: false)
 * 8. candidate provenance traceability
 * 9. evidence status calculation & summary accounting
 * 10. UI filtering consistency
 */

import assert from 'assert';
import {
  evaluateSingleCandidateConfirmation,
  evaluateSarCandidatesConfirmation,
  haversineDistanceKm,
  saveConfirmationRecord,
  getConfirmationRecord,
} from '../data/analysis/sarCandidateConfirmation';
import {
  SarIcebergCandidate,
  SeaIceCell,
  IcebergDetection,
  SatelliteCatalogueItem,
  SarConfirmationSummary,
} from '../types';

export async function runSarCandidateConfirmationTests(): Promise<{ passed: number; failed: number }> {
  console.log('\n===================================================================');
  console.log('RUNNING PHASE 7C.4 SAR CANDIDATE EVIDENCE & CONFIRMATION UNIT TESTS');
  console.log('===================================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => void | Promise<void>) {
    try {
      await fn();
      console.log(`  ✓ PASSED: ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ✗ FAILED: ${name}`);
      console.error(`    ${err.message || err}`);
      failed++;
    }
  }

  // Sample test fixtures
  // Sample test fixtures
  // Sample test fixtures
  const dummyCandidate: SarIcebergCandidate = {
    id: 'SAR_CAND_TEST_001',
    productId: 'TEST_PRODUCT_001',
    acquisitionTime: new Date().toISOString(),
    polarization: 'HH',
    latitude: -64.8,
    longitude: -63.5,
    geographicCoordinates: {
      centroidLat: -64.8,
      centroidLon: -63.5,
      minLat: -64.81,
      maxLat: -64.79,
      minLon: -63.51,
      maxLon: -63.49,
      isGeoreferenced: true,
      georeferenceMethod: 'GCP_BILINEAR',
    },
    rasterCoordinates: { minPixelX: 100, maxPixelX: 110, minLineY: 100, maxLineY: 110, centroidPixelX: 105, centroidLineY: 105 },
    pixelCount: 15,
    areaPixels: 15,
    estimatedAreaM2: 2500,
    areaSquareMeters: 2500,
    estimatedWidthMeters: 50,
    widthMeters: 50,
    estimatedHeightMeters: 50,
    heightMeters: 50,
    aspectRatio: 1.0,
    compactness: 0.85,
    elongation: 1.0,
    rectangularity: 0.78,
    solidity: 0.90,
    meanBackscatter: 2.81,
    meanBackscatterDb: 4.5,
    maxBackscatter: 6.6,
    maxBackscatterDb: 8.2,
    backgroundBackscatter: 0.063,
    backgroundBackscatterDb: -12.0,
    meanTargetSigma0Linear: 2.81,
    meanBackgroundSigma0Linear: 0.063,
    backgroundStdDb: 1.5,
    backgroundCoeffVariation: 0.12,
    contrast: 2.75,
    contrastDb: 16.5,
    linearContrastRatio: 44.6,
    seaIceContext: 'UNAVAILABLE',
    candidateScore: 45,
    status: 'UNCONFIRMED SAR CANDIDATE',
    confirmationStatus: 'ICEBERG CONFIRMATION: NOT YET PERFORMED',
    provenance: {
      source: 'Sentinel-1 C-SAR',
      provider: 'ESA CDSE',
      datasetId: 'TEST_PRODUCT_001',
      observationTime: new Date().toISOString(),
      ingestionTime: new Date().toISOString(),
      validTime: new Date().toISOString(),
      forecastHorizonHours: 0,
      freshnessState: 'FRESH',
      category: 'OBSERVED',
      isSynthetic: false,
    },
  };

  const dummyUsnicIceberg: IcebergDetection = {
    id: 'USNIC_BERG_A68A',
    name: 'Iceberg A-68A',
    lat: -64.81, // ~1.1 km away from dummy candidate
    lon: -63.51,
    sizeCategory: 'Large',
    estimatedLengthMeters: 1200,
    estimatedWidthMeters: 800,
    freeboardMeters: 35,
    driftSpeedKnots: 0.8,
    driftHeadingDeg: 310,
    observationTime: new Date().toISOString(),
    processingTime: new Date().toISOString(),
    source: 'Sentinel-1 SAR',
    confidence: 85,
    uncertaintyRadiusNm: 0.5,
    isSynthetic: false,
    historicalTrack: [],
    predictedTrajectory: [],
  };

  const farUsnicIceberg: IcebergDetection = {
    id: 'USNIC_BERG_B15',
    name: 'Iceberg B-15',
    lat: -65.50, // ~80 km away from dummy candidate (outside 10 km radius)
    lon: -64.20,
    sizeCategory: 'Large',
    estimatedLengthMeters: 2500,
    estimatedWidthMeters: 1500,
    freeboardMeters: 40,
    driftSpeedKnots: 0.5,
    driftHeadingDeg: 280,
    observationTime: new Date().toISOString(),
    processingTime: new Date().toISOString(),
    source: 'Sentinel-1 SAR',
    confidence: 85,
    uncertaintyRadiusNm: 0.5,
    isSynthetic: false,
    historicalTrack: [],
    predictedTrajectory: [],
  };

  const dummySeaIceCell: SeaIceCell = {
    id: 'SEA_ICE_CELL_001',
    lat: -64.8,
    lon: -63.5,
    concentrationPercent: 45,
    stage: 'Open Drift (40-60%)',
    thicknessMeters: 1.2,
    driftVector: { speedKnots: 0.4, headingDeg: 180 },
    predictedConcentration72h: 45,
    confidence: 85,
    uncertainty: 5,
    timestamp: new Date().toISOString(),
  };

  // Test Case 1: candidate with no external evidence -> UNCONFIRMED
  await test('1. Candidate with evaluated USNIC dataset but no spatial match defaults to UNCONFIRMED', () => {
    const result = evaluateSingleCandidateConfirmation(
      { ...dummyCandidate, candidateScore: 25 },
      'TEST_PRODUCT_001',
      [],
      [farUsnicIceberg],
      []
    );

    assert.strictEqual(result.confirmationStatus, 'UNCONFIRMED');
    assert.strictEqual(result.referenceMatch.status, 'NO_REFERENCE_MATCH');
    assert.strictEqual(result.seaIceContext.classification, 'UNAVAILABLE');
    assert.strictEqual(result.temporalEvidence.status, 'TEMPORAL_EVIDENCE_UNAVAILABLE');
  });

  // Test Case 2: candidate with valid supporting evidence -> SUPPORTED
  await test('2. Candidate with valid supporting sea-ice context produces SUPPORTED status', () => {
    const result = evaluateSingleCandidateConfirmation(
      { ...dummyCandidate, candidateScore: 65 },
      'TEST_PRODUCT_001',
      [dummySeaIceCell],
      [farUsnicIceberg],
      []
    );

    assert.strictEqual(result.confirmationStatus, 'SUPPORTED');
    assert.notStrictEqual(result.seaIceContext.classification, 'UNAVAILABLE');
    assert.strictEqual(result.referenceMatch.status, 'NO_REFERENCE_MATCH');
  });

  // Test Case 3: candidate with USNIC reference match -> REFERENCE_MATCHED
  await test('3. Candidate within configured proximity of USNIC observation yields REFERENCE_MATCHED', () => {
    const result = evaluateSingleCandidateConfirmation(
      dummyCandidate,
      'TEST_PRODUCT_001',
      [dummySeaIceCell],
      [dummyUsnicIceberg],
      [],
      { usnicMatchingRadiusKm: 10.0 }
    );

    assert.strictEqual(result.confirmationStatus, 'REFERENCE_MATCHED');
    assert.strictEqual(result.referenceMatch.status, 'REFERENCE_MATCH_AVAILABLE');
    assert.strictEqual(result.referenceMatch.referenceId, 'USNIC_BERG_A68A');
    assert.ok(result.referenceMatch.separationDistanceKm! < 5.0);
  });

  // Test Case 4: unavailable USNIC -> REFERENCE_DATA_UNAVAILABLE
  await test('4. Empty USNIC iceberg dataset yields REFERENCE_DATA_UNAVAILABLE status', () => {
    const result = evaluateSingleCandidateConfirmation(
      dummyCandidate,
      'TEST_PRODUCT_001',
      [dummySeaIceCell],
      [],
      []
    );

    assert.strictEqual(result.referenceMatch.status, 'REFERENCE_DATA_UNAVAILABLE');
  });

  // Test Case 5: unavailable sea-ice context -> UNAVAILABLE
  await test('5. Empty sea-ice dataset yields UNAVAILABLE sea-ice context', () => {
    const result = evaluateSingleCandidateConfirmation(
      dummyCandidate,
      'TEST_PRODUCT_001',
      [],
      [dummyUsnicIceberg],
      []
    );

    assert.strictEqual(result.seaIceContext.classification, 'UNAVAILABLE');
  });

  // Test Case 6: no temporal acquisition -> TEMPORAL_EVIDENCE_UNAVAILABLE
  await test('6. Single product or empty catalogue yields TEMPORAL_EVIDENCE_UNAVAILABLE', () => {
    const result = evaluateSingleCandidateConfirmation(
      dummyCandidate,
      'TEST_PRODUCT_001',
      [dummySeaIceCell],
      [dummyUsnicIceberg],
      []
    );

    assert.strictEqual(result.temporalEvidence.status, 'TEMPORAL_EVIDENCE_UNAVAILABLE');
    assert.strictEqual(result.temporalEvidence.acquisitionsCount, 1);
  });

  // Test Case 7: no synthetic fallback (isSynthetic: false)
  await test('7. Verifies zero synthetic fallback in REAL confirmation evaluation', () => {
    const result = evaluateSingleCandidateConfirmation(
      dummyCandidate,
      'TEST_PRODUCT_001',
      [dummySeaIceCell],
      [dummyUsnicIceberg],
      []
    );

    assert.strictEqual(result.provenance.isSynthetic, false);
    assert.strictEqual(result.seaIceContext.provenance?.isSynthetic, false);
    assert.strictEqual(result.referenceMatch.provenance?.isSynthetic, false);
  });

  // Test Case 8: candidate provenance traceability
  await test('8. All evidence categories maintain complete provenance traceability', () => {
    const result = evaluateSingleCandidateConfirmation(
      dummyCandidate,
      'TEST_PRODUCT_001',
      [dummySeaIceCell],
      [dummyUsnicIceberg],
      []
    );

    assert.ok(result.provenance.datasetId.includes('TEST_PRODUCT_001'));
    assert.ok(result.sarEvidence.provenance?.source.includes('Sentinel-1'));
    assert.ok(result.seaIceContext.provenance?.source.includes('Copernicus Marine'));
    assert.ok(result.referenceMatch.provenance?.source.includes('USNIC'));
  });

  // Test Case 9: evidence status calculation & summary accounting
  await test('9. Summary statistics reconcile: Total = Unconfirmed + Supported + Matched + Unavailable', () => {
    const cand1 = { ...dummyCandidate, id: 'SAR_CAND_1', candidateScore: 10 };
    const cand2 = { ...dummyCandidate, id: 'SAR_CAND_2', candidateScore: 70 };
    const cand3 = { ...dummyCandidate, id: 'SAR_CAND_3', latitude: -64.81, longitude: -63.51 };
    const cand4 = { ...dummyCandidate, id: 'SAR_CAND_4', candidateScore: 15 };

    const conf1 = evaluateSingleCandidateConfirmation(cand1, 'TEST', [], [farUsnicIceberg], []);
    const conf2 = evaluateSingleCandidateConfirmation(cand2, 'TEST', [dummySeaIceCell], [farUsnicIceberg], []);
    const conf3 = evaluateSingleCandidateConfirmation(cand3, 'TEST', [], [dummyUsnicIceberg], []);
    const conf4 = evaluateSingleCandidateConfirmation(cand4, 'TEST', [], [], []);

    const all = [conf1, conf2, conf3, conf4];
    const total = all.length;
    const unconf = all.filter((c) => c.confirmationStatus === 'UNCONFIRMED').length;
    const supp = all.filter((c) => c.confirmationStatus === 'SUPPORTED').length;
    const refMatch = all.filter((c) => c.confirmationStatus === 'REFERENCE_MATCHED').length;
    const unavail = all.filter((c) => c.confirmationStatus === 'CONFIRMATION_UNAVAILABLE').length;

    assert.strictEqual(total, unconf + supp + refMatch + unavail);
    assert.strictEqual(total, 4);
    assert.strictEqual(unconf, 1);
    assert.strictEqual(supp, 1);
    assert.strictEqual(refMatch, 1);
    assert.strictEqual(unavail, 1);
  });

  // Test Case 10: UI filtering consistency
  await test('10. Candidate confirmation array filtering returns exact subset without deleting candidates', () => {
    const cand1 = { ...dummyCandidate, id: 'SAR_CAND_1', candidateScore: 10 };
    const cand2 = { ...dummyCandidate, id: 'SAR_CAND_2', candidateScore: 70 };
    const cand3 = { ...dummyCandidate, id: 'SAR_CAND_3', latitude: -64.81, longitude: -63.51 };
    const cand4 = { ...dummyCandidate, id: 'SAR_CAND_4', candidateScore: 15 };

    const conf1 = evaluateSingleCandidateConfirmation(cand1, 'TEST', [], [farUsnicIceberg], []);
    const conf2 = evaluateSingleCandidateConfirmation(cand2, 'TEST', [dummySeaIceCell], [farUsnicIceberg], []);
    const conf3 = evaluateSingleCandidateConfirmation(cand3, 'TEST', [], [dummyUsnicIceberg], []);
    const conf4 = evaluateSingleCandidateConfirmation(cand4, 'TEST', [], [], []);

    const fullList = [conf1, conf2, conf3, conf4];

    const unconfList = fullList.filter((c) => c.confirmationStatus === 'UNCONFIRMED');
    const matchedList = fullList.filter((c) => c.confirmationStatus === 'REFERENCE_MATCHED');
    const unavailList = fullList.filter((c) => c.confirmationStatus === 'CONFIRMATION_UNAVAILABLE');

    assert.strictEqual(unconfList.length, 1);
    assert.strictEqual(matchedList.length, 1);
    assert.strictEqual(unavailList.length, 1);
    assert.strictEqual(fullList.length, 4); // Underlying dataset count preserved
  });

  console.log(`\nPHASE 7C.4 TEST RESULTS: ${passed} PASSED, ${failed} FAILED.\n`);
  return { passed, failed };
}

// Auto-run when executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runSarCandidateConfirmationTests().then(({ failed }) => {
    if (failed > 0) process.exit(1);
  });
}
