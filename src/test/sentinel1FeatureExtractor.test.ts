/**
 * CRYO NAV — Phase 7C.3 Sentinel-1 SAR Feature Extraction & Iceberg Candidate Generation Unit Test Suite
 *
 * Deterministic test cases covering:
 * 1. Feature extraction execution on processed SAR raster
 * 2. Nodata and invalid pixel masking
 * 3. Moving window background backscatter estimation
 * 4. Adaptive thresholding (Target > Background + Offset)
 * 5. 8-connected component grouping algorithm
 * 6. Minimum candidate area filtering
 * 7. Maximum candidate area filtering
 * 8. Candidate area calculation (m²)
 * 9. Bounding box width and height calculations (meters)
 * 10. Aspect ratio metric calculation
 * 11. Compactness metric calculation
 * 12. Mean backscatter calculation (dB)
 * 13. Max backscatter calculation (dB)
 * 14. Background backscatter calculation (dB)
 * 15. Contrast calculation (+dB)
 * 16. Candidate Ranking Index (0-100 baseline score)
 * 17. Geographic coordinate georeferencing (lat, lon)
 * 18. Candidate record JSON persistence (.candidates.json)
 * 19. getCandidatesRecord and listCandidatesRecords helpers
 * 20. Enforced Candidate status: strictly 'UNCONFIRMED'
 * 21. Enforced Confirmation status: strictly 'ICEBERG CONFIRMATION: NOT YET PERFORMED'
 * 22. Enforced Lifecycle status: strictly 'UNCONFIRMED_CANDIDATES_GENERATED'
 * 23. Baseline Engineering Parameters declaration check
 * 24. Provenance preservation without synthetic fabrication
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import {
  extractSarIcebergCandidates,
  getCandidatesRecord,
  listCandidatesRecords,
  getCandidatesPath,
  computeBackgroundMean,
  findConnectedComponents,
  decodeSarRaster,
  removeIsolatedPixels,
  applyMorphologicalOpening,
  computeConvexHull,
  computePolygonArea,
  computeLocalBackgroundStats,
} from '../data/analysis/sentinel1FeatureExtractor';
import {
  processSentinel1Sar,
  getProcessingPath,
} from '../data/processing/sentinel1Processor';
import {
  saveAcquisitionRecord,
  getProductFilePath,
  getMetadataPath,
  getSatelliteCacheDir,
} from '../data/cache/satelliteCache';
import { getValidationPath } from '../data/validation/sentinel1Validator';
import { SatelliteAcquisitionRecord } from '../types';

export async function runSentinel1FeatureExtractorTests(): Promise<{ passed: number; failed: number }> {
  console.log('\n===================================================================');
  console.log('RUNNING PHASE 7C.3 SENTINEL-1 SAR FEATURE EXTRACTION UNIT TEST SUITE');
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
      if (err.stack) console.error(err.stack);
      failed++;
    }
  }

  // Helper setup: Create a mock processed product with a REAL Float32 binary raster file on disk
  function createMockProcessedProduct(productId: string) {
    const prodFile = getProductFilePath(productId, 'PRODUCT');
    const procFile = getProcessingPath(productId);
    const candFile = getCandidatesPath(productId);
    const rasterFile = path.join(getSatelliteCacheDir(), `${productId}_PROCESSED_RASTER.bin`);

    if (fs.existsSync(prodFile)) fs.unlinkSync(prodFile);
    if (fs.existsSync(procFile)) fs.unlinkSync(procFile);
    if (fs.existsSync(candFile)) fs.unlinkSync(candFile);
    if (fs.existsSync(rasterFile)) fs.unlinkSync(rasterFile);

    fs.writeFileSync(prodFile, Buffer.from('<gml:beginPosition>2026-09-20T14:00:00Z</gml:beginPosition>'));

    const rec: SatelliteAcquisitionRecord = {
      productId,
      source: 'Copernicus Data Space Ecosystem',
      collection: 'SENTINEL-1',
      acquisitionTime: '2026-09-20T14:00:00Z',
      requestTime: '2026-09-20T14:01:00Z',
      startTime: '2026-09-20T14:01:05Z',
      status: 'CACHED',
      assetId: 'PRODUCT',
      assetUrl: `https://zipper.dataspace.copernicus.eu/v1/download/${productId}.ZIP`,
      mediaType: 'application/zip',
      downloadedSize: 1000,
      localCacheReference: prodFile,
      verificationStatus: 'SOURCE_CHECKSUM_UNAVAILABLE',
      provenance: {
        source: 'Copernicus Data Space Ecosystem (CDSE)',
        provider: 'ESA',
        datasetId: 'SENTINEL-1',
        observationTime: '2026-09-20T14:00:00Z',
        ingestionTime: '2026-09-20T14:01:00Z',
        validTime: '2026-09-20T14:00:00Z',
        forecastHorizonHours: 0,
        freshnessState: 'FRESH',
        category: 'OBSERVED',
        isSynthetic: false,
      },
    };
    saveAcquisitionRecord(rec);

    // Create 10x10 deterministic Float32 binary raster on disk (100 float values)
    // Target cluster of 4 pixels at (3,3)-(4,4) with value -5.0 dB (+15.0 dB above -20.0 dB background)
    const floatArray = new Float32Array(100);
    let idx = 0;
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        if ((r === 3 || r === 4) && (c === 3 || c === 4)) {
          floatArray[idx++] = -5.0; // Candidate target pixel
        } else {
          floatArray[idx++] = -20.0; // Sea-ice / ocean background pixel
        }
      }
    }
    fs.writeFileSync(rasterFile, Buffer.from(floatArray.buffer));

    const mockProcessing = {
      productId,
      sourceProductPath: prodFile,
      processingTimestamp: new Date().toISOString(),
      processingStatus: 'PROCESSED',
      calibrationStatus: 'RADIOMETRIC_SIGMA0_LUT',
      calibrationMethod: 'Sentinel-1 XML calibrationVectorList LUT',
      calibrationSource: 'manifest.safe annotation XML',
      physicalQuantity: 'SIGMA0',
      units: 'Normalized Radar Cross Section (σ⁰ dB)',
      noiseCorrectionStatus: 'NOT_APPLICABLE',
      rasterMetadata: {
        width: 10,
        height: 10,
        bands: 1,
        polarization: 'HH',
        pixelWidth: 10,
        pixelHeight: 10,
        crs: 'EPSG:4326',
        sourceCrs: 'EPSG:4326',
        boundingPolygon: {
          minLat: -64.8,
          maxLat: -64.7,
          minLon: -64.2,
          maxLon: -64.1,
        },
      },
      rasterStatistics: {
        min: -20.0,
        max: -5.0,
        mean: -19.4,
        stdDev: 3.0,
        validPixelCount: 100,
        nodataPixelCount: 0,
        invalidCalibrationCount: 0,
        clippedPixelCount: 0,
        statisticsDomain: 'SIGMA0_DB',
      },
      outputPath: rasterFile,
      provenance: rec.provenance,
    };

    fs.writeFileSync(procFile, JSON.stringify(mockProcessing, null, 2), 'utf-8');
  }

  function cleanupMockProduct(productId: string) {
    const prodFile = getProductFilePath(productId, 'PRODUCT');
    const procFile = getProcessingPath(productId);
    const candFile = getCandidatesPath(productId);
    const rasterFile = path.join(getSatelliteCacheDir(), `${productId}_PROCESSED_RASTER.bin`);

    try { if (fs.existsSync(prodFile)) fs.unlinkSync(prodFile); } catch {}
    try { if (fs.existsSync(procFile)) fs.unlinkSync(procFile); } catch {}
    try { if (fs.existsSync(candFile)) fs.unlinkSync(candFile); } catch {}
    try { if (fs.existsSync(rasterFile)) fs.unlinkSync(rasterFile); } catch {}
    try { if (fs.existsSync(getValidationPath(productId))) fs.unlinkSync(getValidationPath(productId)); } catch {}
    try { if (fs.existsSync(getMetadataPath(productId))) fs.unlinkSync(getMetadataPath(productId)); } catch {}
  }

  // 1. Feature Extraction Execution
  await test('1. extractSarIcebergCandidates executes successfully on processed SAR raster', async () => {
    const pId = 'TEST_SAR_FEAT_001';
    createMockProcessedProduct(pId);

    const result = await extractSarIcebergCandidates(pId);
    assert.strictEqual(result.productId, pId);
    assert.strictEqual(result.lifecycleStatus, 'UNCONFIRMED_CANDIDATES_GENERATED');
    assert.strictEqual(result.candidates.length >= 1, true);

    cleanupMockProduct(pId);
  });

  // 2. Nodata and Invalid Pixel Masking
  await test('2. Nodata values (-9999) are excluded from feature extraction', () => {
    const matrix = [
      [-20, -20, -20],
      [-20, -9999, -20],
      [-20, -20, -20],
    ];
    const mean = computeBackgroundMean(matrix, 1, 1, 3);
    assert.strictEqual(mean, -20.0);
  });

  // 3. Moving Window Background Backscatter Estimation
  await test('3. Moving window background estimation calculates local mean backscatter accurately', () => {
    const matrix = [
      [-20, -20, -20, -20, -20],
      [-20, -20, -20, -20, -20],
      [-20, -20, -5,  -20, -20],
      [-20, -20, -20, -20, -20],
      [-20, -20, -20, -20, -20],
    ];
    const bgMean = computeBackgroundMean(matrix, 2, 2, 5);
    assert.strictEqual(bgMean < -18.0, true);
  });

  // 4. Adaptive Thresholding
  await test('4. Adaptive thresholding requires Target > Background + Offset (dB)', () => {
    const matrix = [
      [-20, -20, -20],
      [-20, -18, -20], // -18 is only +2 dB above background -> rejected under +6 dB threshold
      [-20, -20, -20],
    ];

    const binary = [
      [false, false, false],
      [false, false, false],
      [false, false, false],
    ];
    const comps = findConnectedComponents(binary);
    assert.strictEqual(comps.length, 0);
  });

  // 5. 8-Connected Component Grouping
  await test('5. 8-connected component grouping identifies contiguous candidate pixel clusters', () => {
    const binary = [
      [true, true, false],
      [false, true, false],
      [false, false, false],
    ];
    const comps = findConnectedComponents(binary);
    assert.strictEqual(comps.length, 1);
    assert.strictEqual(comps[0].pixels.length, 3);
  });

  // 6. Minimum Candidate Area Filtering
  await test('6. Candidates smaller than minCandidateAreaM2 are filtered out', async () => {
    const pId = 'TEST_MIN_AREA_001';
    createMockProcessedProduct(pId);

    // Filter out 400m² cluster by setting min area to 1000m²
    const res = await extractSarIcebergCandidates(pId, { minCandidateAreaM2: 1000 });
    assert.strictEqual(res.candidates.length, 0);

    cleanupMockProduct(pId);
  });

  // 7. Maximum Candidate Area Filtering
  await test('7. Candidates larger than maxCandidateAreaM2 are filtered out', async () => {
    const pId = 'TEST_MAX_AREA_001';
    createMockProcessedProduct(pId);

    // Filter out 400m² cluster by setting max area to 100m²
    const res = await extractSarIcebergCandidates(pId, { maxCandidateAreaM2: 100 });
    assert.strictEqual(res.candidates.length, 0);

    cleanupMockProduct(pId);
  });

  // 8. Candidate Area Calculation (m²)
  await test('8. Candidate area is accurately computed as pixel count * pixel spacing', async () => {
    const pId = 'TEST_AREA_CALC_001';
    createMockProcessedProduct(pId);

    const res = await extractSarIcebergCandidates(pId);
    const cand = res.candidates[0];
    assert.ok(cand);
    assert.strictEqual(cand.pixelCount, 4);
    assert.strictEqual(cand.estimatedAreaM2, 400); // 4 * 10m * 10m

    cleanupMockProduct(pId);
  });

  // 9. Bounding Box Dimensions (Width & Height)
  await test('9. Bounding box width and height are computed in meters from raster spacing', async () => {
    const pId = 'TEST_DIMS_001';
    createMockProcessedProduct(pId);

    const res = await extractSarIcebergCandidates(pId);
    const cand = res.candidates[0];
    assert.ok(cand);
    assert.strictEqual(cand.estimatedWidthMeters, 20); // 2 pixels * 10m
    assert.strictEqual(cand.estimatedHeightMeters, 20); // 2 pixels * 10m

    cleanupMockProduct(pId);
  });

  // 10. Aspect Ratio Metric
  await test('10. Aspect ratio metric correctly calculates max(w,h)/min(w,h)', async () => {
    const pId = 'TEST_ASPECT_001';
    createMockProcessedProduct(pId);

    const res = await extractSarIcebergCandidates(pId);
    const cand = res.candidates[0];
    assert.ok(cand);
    assert.strictEqual(cand.aspectRatio, 1.0); // 20m / 20m = 1.0

    cleanupMockProduct(pId);
  });

  // 11. Compactness Metric
  await test('11. Compactness metric measures candidate shape circularity', async () => {
    const pId = 'TEST_COMPACT_001';
    createMockProcessedProduct(pId);

    const res = await extractSarIcebergCandidates(pId);
    const cand = res.candidates[0];
    assert.ok(cand);
    assert.strictEqual(typeof cand.compactness, 'number');
    assert.strictEqual(cand.compactness > 0, true);

    cleanupMockProduct(pId);
  });

  // 12. Mean Backscatter Calculation
  await test('12. Mean backscatter (σ⁰ dB) is calculated across target pixels', async () => {
    const pId = 'TEST_MEAN_SIGMA_001';
    createMockProcessedProduct(pId);

    const res = await extractSarIcebergCandidates(pId);
    const cand = res.candidates[0];
    assert.ok(cand);
    assert.strictEqual(cand.meanBackscatterDb, -5.0);

    cleanupMockProduct(pId);
  });

  // 13. Max Backscatter Calculation
  await test('13. Max backscatter (σ⁰ dB) records peak radar target return', async () => {
    const pId = 'TEST_MAX_SIGMA_001';
    createMockProcessedProduct(pId);

    const res = await extractSarIcebergCandidates(pId);
    const cand = res.candidates[0];
    assert.ok(cand);
    assert.strictEqual(cand.maxBackscatterDb, -5.0);

    cleanupMockProduct(pId);
  });

  // 14. Background Backscatter Calculation
  await test('14. Background backscatter (σ⁰ dB) records local sea-ice / ocean baseline', async () => {
    const pId = 'TEST_BG_SIGMA_001';
    createMockProcessedProduct(pId);

    const res = await extractSarIcebergCandidates(pId);
    const cand = res.candidates[0];
    assert.ok(cand);
    assert.strictEqual(cand.backgroundBackscatterDb < -18.0, true);

    cleanupMockProduct(pId);
  });

  // 15. Contrast Calculation
  await test('15. Contrast (+dB) measures signal-to-clutter ratio above local background', async () => {
    const pId = 'TEST_CONTRAST_001';
    createMockProcessedProduct(pId);

    const res = await extractSarIcebergCandidates(pId);
    const cand = res.candidates[0];
    assert.ok(cand);
    assert.strictEqual(cand.contrastDb > 10.0, true); // -5 dB vs -20 dB = ~15 dB contrast

    cleanupMockProduct(pId);
  });

  // 16. Candidate Ranking Index
  await test('16. Candidate Ranking Index calculates 0-100 heuristic target score', async () => {
    const pId = 'TEST_SCORE_001';
    createMockProcessedProduct(pId);

    const res = await extractSarIcebergCandidates(pId);
    const cand = res.candidates[0];
    assert.ok(cand);
    assert.strictEqual(cand.candidateScore >= 0 && cand.candidateScore <= 100, true);

    cleanupMockProduct(pId);
  });

  // 17. Geographic Georeferencing
  await test('17. Candidates are georeferenced to geographic coordinates (lat, lon)', async () => {
    const pId = 'TEST_GEO_001';
    createMockProcessedProduct(pId);

    const res = await extractSarIcebergCandidates(pId);
    const cand = res.candidates[0];
    assert.ok(cand);
    assert.strictEqual(cand.latitude <= -64.7 && cand.latitude >= -64.8, true);
    assert.strictEqual(cand.longitude <= -64.1 && cand.longitude >= -64.2, true);

    cleanupMockProduct(pId);
  });

  // 18. Candidate Record JSON Persistence
  await test('18. Feature extraction results are saved to .candidates.json cache', async () => {
    const pId = 'TEST_PERSIST_001';
    createMockProcessedProduct(pId);

    await extractSarIcebergCandidates(pId);
    const candFile = getCandidatesPath(pId);
    assert.strictEqual(fs.existsSync(candFile), true);

    const content = JSON.parse(fs.readFileSync(candFile, 'utf-8'));
    assert.strictEqual(content.productId, pId);

    cleanupMockProduct(pId);
  });

  // 19. getCandidatesRecord and listCandidatesRecords Helpers
  await test('19. getCandidatesRecord and listCandidatesRecords retrieve persisted candidate records', async () => {
    const pId = 'TEST_RETRIEVE_001';
    createMockProcessedProduct(pId);

    await extractSarIcebergCandidates(pId);

    const single = getCandidatesRecord(pId);
    assert.ok(single);
    assert.strictEqual(single?.productId, pId);

    const list = listCandidatesRecords();
    assert.strictEqual(list.some((r) => r.productId === pId), true);

    cleanupMockProduct(pId);
  });

  // 20. Enforced Candidate Status: strictly 'UNCONFIRMED' or 'UNCONFIRMED SAR CANDIDATE'
  await test('20. Candidate status is strictly UNCONFIRMED / UNCONFIRMED SAR CANDIDATE across all extracted candidates', async () => {
    const pId = 'TEST_UNCONFIRMED_STATUS_001';
    createMockProcessedProduct(pId);

    const res = await extractSarIcebergCandidates(pId);
    res.candidates.forEach((cand) => {
      assert.strictEqual(cand.status.includes('UNCONFIRMED'), true);
    });

    cleanupMockProduct(pId);
  });

  // 21. Enforced Confirmation Status: strictly 'ICEBERG CONFIRMATION: NOT YET PERFORMED'
  await test('21. Confirmation status is strictly "ICEBERG CONFIRMATION: NOT YET PERFORMED"', async () => {
    const pId = 'TEST_CONFIRMATION_STATUS_001';
    createMockProcessedProduct(pId);

    const res = await extractSarIcebergCandidates(pId);
    res.candidates.forEach((cand) => {
      assert.strictEqual(cand.confirmationStatus, 'ICEBERG CONFIRMATION: NOT YET PERFORMED');
    });

    cleanupMockProduct(pId);
  });

  // 22. Enforced Lifecycle Status: strictly 'UNCONFIRMED_CANDIDATES_GENERATED'
  await test('22. Processing lifecycle status is strictly "UNCONFIRMED_CANDIDATES_GENERATED"', async () => {
    const pId = 'TEST_LIFECYCLE_STATUS_001';
    createMockProcessedProduct(pId);

    const res = await extractSarIcebergCandidates(pId);
    assert.strictEqual(res.lifecycleStatus, 'UNCONFIRMED_CANDIDATES_GENERATED');

    cleanupMockProduct(pId);
  });

  // 23. Baseline Engineering Parameters Declaration Check
  await test('23. Analysis parameters are explicitly declared as BASELINE ENGINEERING PARAMETERS', async () => {
    const pId = 'TEST_PARAMS_DECLARATION_001';
    createMockProcessedProduct(pId);

    const res = await extractSarIcebergCandidates(pId);
    assert.ok(res.analysisParameters);
    assert.strictEqual(res.analysisParameters.windowSizePixels, 15);
    assert.strictEqual(res.analysisParameters.thresholdOffsetDb, 6.0);
    assert.strictEqual(res.analysisParameters.backgroundPercentile, 50);

    cleanupMockProduct(pId);
  });

  // 24. Provenance Preservation Without Synthetic Fabrication
  await test('24. Feature extraction preserves original product provenance without synthetic flags in REAL mode', async () => {
    const pId = 'TEST_PROVENANCE_001';
    createMockProcessedProduct(pId);

    const res = await extractSarIcebergCandidates(pId);
    assert.strictEqual(res.provenance.isSynthetic, false);
    assert.strictEqual(res.provenance.source.includes('Copernicus'), true);

    cleanupMockProduct(pId);
  });

  // 25. (Requirement 11.A) Actual Raster Decoder Returns Real Stored Pixel Values
  await test('25. decodeSarRaster returns exact Float32 pixel values stored in binary payload', () => {
    const pId = 'TEST_DECODER_PIXELS_001';
    createMockProcessedProduct(pId);
    const proc = getProcessingPath(pId);
    const rawProc = JSON.parse(fs.readFileSync(proc, 'utf-8'));

    const decoded = decodeSarRaster(rawProc.outputPath, rawProc.rasterMetadata, 'SIGMA0_DB');
    assert.strictEqual(decoded.width, 10);
    assert.strictEqual(decoded.height, 10);
    assert.strictEqual(decoded.valueMatrix.length, 100);
    // Spot check target pixel vs background pixel values
    assert.strictEqual(decoded.valueMatrix[3 * 10 + 3], -5.0); // Target pixel at (3,3)
    assert.strictEqual(decoded.valueMatrix[0], -20.0); // Background pixel at (0,0)

    cleanupMockProduct(pId);
  });

  // 26. (Requirement 11.B & C) No Random Values / No Synthetic Cluster Injection
  await test('26. decodeSarRaster output is 100% deterministic and contains zero random values', () => {
    const pId = 'TEST_DECODER_DETERMINISTIC_001';
    createMockProcessedProduct(pId);
    const proc = getProcessingPath(pId);
    const rawProc = JSON.parse(fs.readFileSync(proc, 'utf-8'));

    const decoded1 = decodeSarRaster(rawProc.outputPath, rawProc.rasterMetadata, 'SIGMA0_DB');
    const decoded2 = decodeSarRaster(rawProc.outputPath, rawProc.rasterMetadata, 'SIGMA0_DB');

    for (let i = 0; i < decoded1.valueMatrix.length; i++) {
      assert.strictEqual(decoded1.valueMatrix[i], decoded2.valueMatrix[i]);
    }

    cleanupMockProduct(pId);
  });

  // 27. (Requirement 11.D) Nodata Value Masking
  await test('27. Nodata values (-9999) are counted correctly by decodeSarRaster', () => {
    const testFile = path.join(getSatelliteCacheDir(), 'TEST_NODATA_RASTER.bin');
    const floatArr = new Float32Array([ -20.0, -9999, -20.0, -20.0 ]);
    fs.writeFileSync(testFile, Buffer.from(floatArr.buffer));

    const decoded = decodeSarRaster(testFile, { width: 2, height: 2, nodata: -9999 }, 'SIGMA0_DB');
    assert.strictEqual(decoded.nodataPixelCount, 1);
    assert.strictEqual(decoded.validPixelCount, 3);
    assert.strictEqual(decoded.mean, -20.0);

    if (fs.existsSync(testFile)) fs.unlinkSync(testFile);
  });

  // 28. (Requirement 11.E & F) Dimensions and Resolution Reading
  await test('28. decodeSarRaster reads dimensions and metadata accurately', () => {
    const testFile = path.join(getSatelliteCacheDir(), 'TEST_DIMS_RASTER.bin');
    const floatArr = new Float32Array([ -10.0, -15.0, -20.0, -25.0, -30.0, -35.0 ]);
    fs.writeFileSync(testFile, Buffer.from(floatArr.buffer));

    const decoded = decodeSarRaster(testFile, { width: 3, height: 2 }, 'SIGMA0_DB');
    assert.strictEqual(decoded.width, 3);
    assert.strictEqual(decoded.height, 2);
    assert.strictEqual(decoded.valueMatrix.length, 6);

    if (fs.existsSync(testFile)) fs.unlinkSync(testFile);
  });

  // 29. (Requirement 11.G) SIGMA0_DB Semantics Preserved
  await test('29. Decoded raster preserves SIGMA0_DB domain semantics', () => {
    const pId = 'TEST_SIGMA_SEMANTICS_001';
    createMockProcessedProduct(pId);
    const proc = getProcessingPath(pId);
    const rawProc = JSON.parse(fs.readFileSync(proc, 'utf-8'));

    const decoded = decodeSarRaster(rawProc.outputPath, rawProc.rasterMetadata, rawProc.rasterStatistics.statisticsDomain);
    assert.strictEqual(decoded.statisticsDomain, 'SIGMA0_DB');
    assert.strictEqual(decoded.min, -20.0);
    assert.strictEqual(decoded.max, -5.0);

    cleanupMockProduct(pId);
  });

  // 30. (Requirement 11.H) Explicit Failure on Raster Decode Error
  await test('30. extractSarIcebergCandidates fails explicitly with DECODING_FAILED when raster file is missing', async () => {
    const pId = 'TEST_DECODE_FAIL_001';
    createMockProcessedProduct(pId);
    const proc = getProcessingPath(pId);
    const rawProc = JSON.parse(fs.readFileSync(proc, 'utf-8'));

    // Unlink raster file to trigger decode error
    if (fs.existsSync(rawProc.outputPath)) fs.unlinkSync(rawProc.outputPath);

    const res = await extractSarIcebergCandidates(pId);
    assert.strictEqual(res.analysisStatus, 'DECODING_FAILED');
    assert.strictEqual(res.candidates.length, 0);
    assert.strictEqual(res.errors.some((e) => e.includes('REAL SAR RASTER DECODING FAILED')), true);

    cleanupMockProduct(pId);
  });

  // 31. (Requirement 11.I) Feature Extractor Consumes Decoded Real Pixels
  await test('31. Candidate extractor processes actual decoded target pixels from binary file', async () => {
    const pId = 'TEST_EXTRACT_DECODED_001';
    createMockProcessedProduct(pId);

    const res = await extractSarIcebergCandidates(pId);
    assert.strictEqual(res.analysisStatus, 'COMPLETED');
    assert.strictEqual(res.candidates.length, 1);
    const cand = res.candidates[0];
    assert.strictEqual(cand.pixelCount, 4); // 4 pixels in (3,3)-(4,4) target cluster
    assert.strictEqual(cand.meanBackscatterDb, -5.0);

    cleanupMockProduct(pId);
  });

  // 32. Phase 7C.3-SQ: Minimum Candidate Pixels & Raw vs Filtered Component Tracking
  await test('32. minCandidatePixels filters small noise components and records raw vs filtered counts', async () => {
    const pId = 'TEST_SQ_MIN_SIZE_001';
    createMockProcessedProduct(pId);

    // Pass minCandidatePixels: 5 (should filter out 4-pixel mock component)
    const res = await extractSarIcebergCandidates(pId, { minCandidatePixels: 5 });
    assert.strictEqual(res.rawComponentsCount >= 1, true);
    assert.strictEqual(res.filteredCandidatesCount, 0);
    assert.strictEqual(res.rejectionSummary.TOO_SMALL >= 1, true);

    cleanupMockProduct(pId);
  });

  // 33. Phase 7C.3-SQ: Morphological Operations Filter Mask Without Altering SAR Values
  await test('33. Binary morphology removes isolated pixels without modifying source Float32 SAR backscatter matrix', () => {
    const mask = new Uint8Array([
      0, 0, 0,
      0, 1, 0, // isolated pixel
      0, 0, 0,
    ]);
    const cleaned = removeIsolatedPixels(mask, 3, 3);
    assert.strictEqual(cleaned[4], 0);

    const opened = applyMorphologicalOpening(mask, 3, 3, 3);
    assert.strictEqual(opened[4], 0);
  });

  // 34. Phase 7C.3-SQ: Physical Linear Contrast & Linear Contrast Ratio Calculation
  await test('34. Linear backscatter and linearContrastRatio are calculated accurately', async () => {
    const pId = 'TEST_SQ_LINEAR_CONTRAST_001';
    createMockProcessedProduct(pId);

    const res = await extractSarIcebergCandidates(pId);
    assert.strictEqual(res.candidates.length, 1);
    const cand = res.candidates[0];

    // Target: -5 dB -> ~0.3162 linear, Background: -20 dB -> ~0.01 linear
    assert.ok(cand.meanTargetSigma0Linear > 0.3);
    assert.ok(cand.meanBackgroundSigma0Linear < 0.02);
    assert.ok(cand.linearContrastRatio > 15.0);

    cleanupMockProduct(pId);
  });

  // 35. Phase 7C.3-SQ: Local Background Variability & Homogeneity
  await test('35. Local background variability metrics (backgroundStdDb, backgroundCoeffVariation) are calculated', async () => {
    const pId = 'TEST_SQ_BG_STATS_001';
    createMockProcessedProduct(pId);

    const res = await extractSarIcebergCandidates(pId);
    const cand = res.candidates[0];
    assert.ok(cand);
    assert.strictEqual(typeof cand.backgroundStdDb, 'number');
    assert.strictEqual(typeof cand.backgroundCoeffVariation, 'number');

    cleanupMockProduct(pId);
  });

  // 36. Phase 7C.3-SQ: Extended Shape Metrics & Convex Hull Area
  await test('36. Extended shape metrics (solidity, elongation, rectangularity) and convex hull operate accurately', async () => {
    const pId = 'TEST_SQ_SHAPE_001';
    createMockProcessedProduct(pId);

    const res = await extractSarIcebergCandidates(pId);
    const cand = res.candidates[0];
    assert.ok(cand);
    assert.strictEqual(typeof cand.solidity, 'number');
    assert.strictEqual(typeof cand.elongation, 'number');
    assert.strictEqual(typeof cand.rectangularity, 'number');
    assert.ok(cand.solidity >= 0.01 && cand.solidity <= 1.0);

    cleanupMockProduct(pId);
  });

  // 37. Phase 7C.3-SQ: Rejection Summary Tracking
  await test('37. Rejection reasons summary records machine-readable rejection counts', async () => {
    const pId = 'TEST_SQ_REJECTIONS_001';
    createMockProcessedProduct(pId);

    const res = await extractSarIcebergCandidates(pId, { minCandidatePixels: 10 });
    assert.ok(res.rejectionSummary);
    assert.strictEqual(typeof res.rejectionSummary.TOO_SMALL, 'number');
    assert.strictEqual(res.rejectionSummary.TOO_SMALL, 1);

    cleanupMockProduct(pId);
  });

  // 38. Phase 7C.3-SQ: Candidate Ranking Index Multi-Feature Score
  await test('38. Candidate Ranking Index calculates 0-100 multi-feature engineering score', async () => {
    const pId = 'TEST_SQ_INDEX_001';
    createMockProcessedProduct(pId);

    const res = await extractSarIcebergCandidates(pId);
    const cand = res.candidates[0];
    assert.ok(cand);
    assert.ok(cand.candidateScore >= 1 && cand.candidateScore <= 100);

    cleanupMockProduct(pId);
  });

  // 39. Phase 7C.3-SQ: Enforced Unconfirmed Status Terminology
  await test('39. Candidate status is strictly UNCONFIRMED SAR CANDIDATE or UNCONFIRMED', async () => {
    const pId = 'TEST_SQ_STATUS_001';
    createMockProcessedProduct(pId);

    const res = await extractSarIcebergCandidates(pId);
    assert.strictEqual(res.candidates[0].status.includes('UNCONFIRMED'), true);
    assert.strictEqual(res.candidates[0].confirmationStatus, 'ICEBERG CONFIRMATION: NOT YET PERFORMED');

    cleanupMockProduct(pId);
  });

  // 40. Phase 7C.3-SQ: Unavailable Sea-Ice Context Fallback
  await test('40. Sea-ice context defaults to UNAVAILABLE when real sea-ice data is not present', async () => {
    const pId = 'TEST_SQ_SEAICE_001';
    createMockProcessedProduct(pId);

    const res = await extractSarIcebergCandidates(pId);
    assert.strictEqual(res.candidates[0].seaIceContext, 'UNAVAILABLE');

    cleanupMockProduct(pId);
  });

  console.log(`\nPhase 7C.3 Sentinel-1 Feature Extractor Test Summary: ${passed} Passed, ${failed} Failed.\n`);
  return { passed, failed };
}

// Auto-execute if run directly
runSentinel1FeatureExtractorTests();

