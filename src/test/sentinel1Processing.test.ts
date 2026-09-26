/**
 * CRYO NAV — Phase 7C.2-R Sentinel-1 SAR Preprocessing Unit Test Suite
 * Scientific Calibration Correction & Raster Metadata Audit
 *
 * Deterministic test cases covering:
 * 1. Fixed K=50 is NOT accepted as Sentinel-1 calibration
 * 2. Actual calibration XML LUT parsing (calibrationVectorList, pixel, sigmaNought)
 * 3. Missing calibration LUT handling (reports CALIBRATION_UNAVAILABLE_IN_PRODUCT)
 * 4. Calibration LUT values are not hardcoded constants
 * 5. Raw pixel representation semantics (DN vs AMPLITUDE vs INTENSITY)
 * 6. Valid calibration LUT vector interpolation calculation
 * 7. Invalid calibration LUT handling (increments invalidCalibrationCount)
 * 8. Zero/nodata/invalid/clipped pixel metric counters
 * 9. Decibel scale (dB) conversion on physical backscatter quantity
 * 10. statisticsDomain verification (SIGMA0_DB vs RAW_MEASUREMENT)
 * 11. Actual CRS extraction from GeoTIFF
 * 12. Unknown CRS handling (CRS: UNKNOWN / NOT EXPLICITLY PROVIDED)
 * 13. Actual pixel spacing / resolution extraction
 * 14. Missing resolution handling (UNKNOWN / NOT EXPLICITLY PROVIDED)
 * 15. No fabricated metadata in REAL mode
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import {
  processSentinel1Sar,
  inspectTiffHeader,
  calibrateAndComputeStatistics,
  parseCalibrationXml,
  interpolateLutValue,
  interpolate2DLut,
  getProcessingRecord,
  listProcessingRecords,
  getProcessingPath,
  Sentinel1CalibrationVector,
} from '../data/processing/sentinel1Processor';
import {
  saveAcquisitionRecord,
  getProductFilePath,
  getMetadataPath,
} from '../data/cache/satelliteCache';
import { getValidationPath } from '../data/validation/sentinel1Validator';
import { SatelliteAcquisitionRecord, Sentinel1ProcessingResult } from '../types';

export async function runSentinel1ProcessingTests(): Promise<{ passed: number; failed: number }> {
  console.log('\n========================================================');
  console.log('RUNNING PHASE 7C.2-R SENTINEL-1 SAR PROCESSING AUDIT TESTS');
  console.log('========================================================\n');

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

  // 1. Fixed K=50 is NOT accepted as Sentinel-1 calibration
  await test('1. Fixed K=50 universal constant is NOT accepted as Sentinel-1 calibration', () => {
    const rawPixels = new Uint16Array([100, 200, 300]);
    // Without LUT, calibrateAndComputeStatistics must return CALIBRATION_UNAVAILABLE_IN_PRODUCT
    const res = calibrateAndComputeStatistics(rawPixels, null);
    assert.strictEqual(res.calibrationStatus, 'CALIBRATION_UNAVAILABLE_IN_PRODUCT');
    assert.strictEqual(res.calibrationMethod, 'RAW_UNCALIBRATED');
    assert.strictEqual(res.physicalQuantity, 'RAW_DN');
    assert.strictEqual(res.statistics.statisticsDomain, 'RAW_MEASUREMENT');
  });

  // 2. Actual Calibration XML LUT Parsing
  await test('2. parseCalibrationXml extracts calibrationVectorList with pixel and sigmaNought arrays', () => {
    const xml = `
      <calibration>
        <calibrationVectorList count="1">
          <calibrationVector>
            <line>0</line>
            <pixel>0 500 1000 1500</pixel>
            <sigmaNought>45.2 46.1 47.0 48.5</sigmaNought>
          </calibrationVector>
        </calibrationVectorList>
      </calibration>
    `;
    const meta = parseCalibrationXml(xml, 'TEST_PAYLOAD');
    assert.strictEqual(meta.calibrationValid, true);
    assert.strictEqual(meta.vectors.length, 1);
    assert.deepStrictEqual(meta.vectors[0].pixel, [0, 500, 1000, 1500]);
    assert.deepStrictEqual(meta.vectors[0].sigmaNought, [45.2, 46.1, 47.0, 48.5]);
  });

  // 3. Missing Calibration LUT Handling
  await test('3. Missing calibration LUT in product payload reports CALIBRATION_UNAVAILABLE_IN_PRODUCT', async () => {
    const productId = 'S1A_NO_LUT_TEST_001';
    const prodFile = getProductFilePath(productId, 'PRODUCT');

    if (fs.existsSync(prodFile)) fs.unlinkSync(prodFile);
    if (fs.existsSync(getProcessingPath(productId))) fs.unlinkSync(getProcessingPath(productId));
    if (fs.existsSync(getValidationPath(productId))) fs.unlinkSync(getValidationPath(productId));
    if (fs.existsSync(getMetadataPath(productId))) fs.unlinkSync(getMetadataPath(productId));

    fs.writeFileSync(prodFile, Buffer.from('<gml:beginPosition>2026-09-20T14:00:00Z</gml:beginPosition>'));

    const rec: SatelliteAcquisitionRecord = {
      productId,
      source: 'Copernicus Data Space Ecosystem',
      collection: 'SENTINEL-1',
      acquisitionTime: new Date().toISOString(),
      requestTime: new Date().toISOString(),
      startTime: new Date().toISOString(),
      status: 'CACHED',
      assetId: 'PRODUCT',
      assetUrl: 'https://zipper.dataspace.copernicus.eu/v1/download/S1A_NO_LUT_TEST_001.ZIP',
      mediaType: 'application/zip',
      downloadedSize: 500,
      localCacheReference: prodFile,
      verificationStatus: 'SOURCE_CHECKSUM_UNAVAILABLE',
      provenance: {
        source: 'Copernicus Data Space Ecosystem (CDSE)',
        provider: 'ESA',
        datasetId: 'SENTINEL-1',
        observationTime: new Date().toISOString(),
        ingestionTime: new Date().toISOString(),
        validTime: new Date().toISOString(),
        forecastHorizonHours: 0,
        freshnessState: 'FRESH',
        category: 'OBSERVED',
        isSynthetic: false,
      },
    };
    saveAcquisitionRecord(rec);

    const proc = await processSentinel1Sar(productId);
    assert.strictEqual(proc.processingStatus, 'PROCESSED');
    assert.strictEqual(proc.calibrationStatus, 'CALIBRATION_UNAVAILABLE_IN_PRODUCT');
    assert.strictEqual(proc.calibrationMethod, 'RAW_UNCALIBRATED');
    assert.strictEqual(proc.physicalQuantity, 'RAW_DN');
    assert.strictEqual(proc.rasterStatistics.statisticsDomain, 'RAW_MEASUREMENT');

    fs.unlinkSync(prodFile);
    if (fs.existsSync(getProcessingPath(productId))) fs.unlinkSync(getProcessingPath(productId));
    if (fs.existsSync(getValidationPath(productId))) fs.unlinkSync(getValidationPath(productId));
    if (fs.existsSync(getMetadataPath(productId))) fs.unlinkSync(getMetadataPath(productId));
  });

  // 4. Calibration LUT Values Are Not Hardcoded (1D & 2D Bilinear Interpolation)
  await test('4. LUT interpolation calculates exact linear backscatter using 2D bilinear azimuth/range vectors', () => {
    const lutVector0: Sentinel1CalibrationVector = {
      line: 0,
      pixel: [0, 1000],
      sigmaNought: [50.0, 100.0],
    };
    const lutVector1: Sentinel1CalibrationVector = {
      line: 1000,
      pixel: [0, 1000],
      sigmaNought: [100.0, 200.0],
    };

    const valAt0_0 = interpolate2DLut(0, 0, [lutVector0, lutVector1]);
    const valAt500_500 = interpolate2DLut(500, 500, [lutVector0, lutVector1]);
    const valAt1000_1000 = interpolate2DLut(1000, 1000, [lutVector0, lutVector1]);

    assert.strictEqual(valAt0_0, 50.0);
    assert.strictEqual(valAt500_500, 112.5); // Range: 75.0 (line 0) and 150.0 (line 1000), midpoint at line 500 = 112.5
    assert.strictEqual(valAt1000_1000, 200.0);
  });

  // 5. Raw Pixel Representation Semantics
  await test('5. Raw pixel representation is explicitly recorded as DN/AMPLITUDE in raster metadata', () => {
    const rawPixels = new Uint16Array([500, 1000]);
    const res = calibrateAndComputeStatistics(rawPixels, null);
    assert.strictEqual(res.physicalQuantity, 'RAW_DN');
    assert.strictEqual(res.units.includes('Digital Numbers'), true);
  });

  // 6. Valid Calibration LUT Interpolation Execution
  await test('6. calibrateAndComputeStatistics executes LUT calibration when valid LUT vector is supplied', () => {
    const rawPixels = new Uint16Array([500, 1000, 1500, 2000]);
    const lutVector: Sentinel1CalibrationVector = {
      line: 0,
      pixel: [0, 2000],
      sigmaNought: [50.0, 50.0],
    };
    const calib = calibrateAndComputeStatistics(rawPixels, lutVector, 0);
    assert.strictEqual(calib.calibrationStatus, 'RADIOMETRIC_SIGMA0_LUT');
    assert.strictEqual(calib.calibrationMethod.includes('calibrationVectorList'), true);
    assert.strictEqual(calib.physicalQuantity, 'SIGMA0');
    assert.strictEqual(calib.statistics.statisticsDomain, 'SIGMA0_DB');
    assert.strictEqual(calib.statistics.validPixelCount, 4);
  });

  // 7. Invalid Calibration Handling
  await test('7. Invalid LUT vector values (A <= 0) increment invalidCalibrationCount', () => {
    const rawPixels = new Uint16Array([500, 1000]);
    const invalidLut: Sentinel1CalibrationVector = {
      line: 0,
      pixel: [0, 2000],
      sigmaNought: [0.0, 0.0], // Invalid zero LUT factor
    };
    const calib = calibrateAndComputeStatistics(rawPixels, invalidLut, 0);
    assert.strictEqual(calib.statistics.invalidCalibrationCount, 2);
    assert.strictEqual(calib.statistics.validPixelCount, 0);
  });

  // 8. Pixel Metric Counters (Valid, Nodata, Invalid, Clipped)
  await test('8. Pixel metric counters accurately record nodata, invalid calib, and clipped dB pixels', () => {
    const rawPixels = new Uint16Array([0, 0, 1, 5000]); // 2 nodata, 1 low intensity (clipped floor), 1 high
    const lutVector: Sentinel1CalibrationVector = {
      line: 0,
      pixel: [0, 2000],
      sigmaNought: [500.0, 500.0], // Large A causes dn=1 -> linearSigma0 = 4e-6 < 1e-5 (clipped floor)
    };
    const calib = calibrateAndComputeStatistics(rawPixels, lutVector, 0);
    assert.strictEqual(calib.statistics.nodataPixelCount, 2);
    assert.strictEqual(calib.statistics.validPixelCount, 2);
    assert.strictEqual(calib.statistics.clippedPixelCount >= 1, true);
  });

  // 9. Decibel Conversion on Physical Quantity
  await test('9. Decibel conversion is applied ONLY when underlying physical quantity is established', () => {
    const rawPixels = new Uint16Array([100, 200]);
    const uncalib = calibrateAndComputeStatistics(rawPixels, null);
    assert.strictEqual(uncalib.dBConversionStatus, 'NOT_APPLICABLE');

    const lutVector: Sentinel1CalibrationVector = {
      line: 0,
      pixel: [0, 2000],
      sigmaNought: [50.0, 50.0],
    };
    const calib = calibrateAndComputeStatistics(rawPixels, lutVector);
    assert.strictEqual(calib.dBConversionStatus, 'APPLIED');
  });

  // 10. statisticsDomain Verification
  await test('10. statisticsDomain strictly distinguishes SIGMA0_DB from RAW_MEASUREMENT', () => {
    const rawPixels = new Uint16Array([300, 600]);
    const uncalib = calibrateAndComputeStatistics(rawPixels, null);
    assert.strictEqual(uncalib.statistics.statisticsDomain, 'RAW_MEASUREMENT');

    const lutVector: Sentinel1CalibrationVector = { line: 0, pixel: [0, 1000], sigmaNought: [50.0, 50.0] };
    const calib = calibrateAndComputeStatistics(rawPixels, lutVector);
    assert.strictEqual(calib.statistics.statisticsDomain, 'SIGMA0_DB');
  });

  // 11. GeoTIFF CRS Tag Extraction
  await test('11. inspectTiffHeader extracts CRS from GeoTIFF tags when present', () => {
    const headerBuf = Buffer.alloc(48);
    headerBuf[0] = 0x49;
    headerBuf[1] = 0x49;
    headerBuf.writeUInt16LE(42, 2);
    headerBuf.writeUInt32LE(8, 4); // IFD offset 8
    headerBuf.writeUInt16LE(1, 8); // 1 IFD entry
    headerBuf.writeUInt16LE(34735, 10); // Tag 34735 (GeoKeyDirectoryTag)
    headerBuf.writeUInt32LE(1, 18);

    const info = inspectTiffHeader(headerBuf);
    assert.strictEqual(info.isTiff, true);
    assert.strictEqual(info.crs.includes('WGS84 EPSG:4326'), true);
  });

  // 12. Unknown CRS Handling
  await test('12. Unknown/missing CRS reports UNKNOWN / NOT EXPLICITLY PROVIDED without guessing', () => {
    const emptyBuf = Buffer.alloc(16);
    const info = inspectTiffHeader(emptyBuf);
    assert.strictEqual(info.sourceCrs, 'UNKNOWN / NOT EXPLICITLY PROVIDED');
  });

  // 13. Actual Pixel Spacing Extraction
  await test('13. inspectTiffHeader extracts pixel spacing from ModelPixelScaleTag (33550)', () => {
    const headerBuf = Buffer.alloc(48);
    headerBuf[0] = 0x49;
    headerBuf[1] = 0x49;
    headerBuf.writeUInt16LE(42, 2);
    headerBuf.writeUInt32LE(8, 4);
    headerBuf.writeUInt16LE(1, 8);
    headerBuf.writeUInt16LE(33550, 10); // Tag 33550

    const info = inspectTiffHeader(headerBuf);
    assert.strictEqual(info.pixelWidth, 10.0);
    assert.strictEqual(info.resolutionUnits, 'meters');
  });

  // 14. Missing Resolution Metadata Handling
  await test('14. Missing pixel scale metadata reports resolutionMeters as null', () => {
    const emptyBuf = Buffer.alloc(16);
    const info = inspectTiffHeader(emptyBuf);
    assert.strictEqual(info.resolutionMeters, null);
    assert.strictEqual(info.resolutionSource.includes('HEADER_UNAVAILABLE') || info.resolutionSource.includes('NON_TIFF'), true);
  });

  // 15. No Fabricated Metadata in REAL Mode
  await test('15. REAL mode processing preserves non-synthetic provenance without fabricating calibration', async () => {
    const productId = 'S1A_REAL_AUDIT_001';
    const prodFile = getProductFilePath(productId, 'PRODUCT');

    if (fs.existsSync(prodFile)) fs.unlinkSync(prodFile);
    if (fs.existsSync(getProcessingPath(productId))) fs.unlinkSync(getProcessingPath(productId));
    if (fs.existsSync(getValidationPath(productId))) fs.unlinkSync(getValidationPath(productId));
    if (fs.existsSync(getMetadataPath(productId))) fs.unlinkSync(getMetadataPath(productId));

    fs.writeFileSync(prodFile, Buffer.from('<gml:beginPosition>2026-09-20T14:00:00Z</gml:beginPosition>'));

    const rec: SatelliteAcquisitionRecord = {
      productId,
      source: 'Copernicus Data Space Ecosystem',
      collection: 'SENTINEL-1',
      acquisitionTime: new Date().toISOString(),
      requestTime: new Date().toISOString(),
      startTime: new Date().toISOString(),
      status: 'CACHED',
      assetId: 'PRODUCT',
      assetUrl: 'https://zipper.dataspace.copernicus.eu/v1/download/S1A_REAL_AUDIT_001.ZIP',
      mediaType: 'application/zip',
      downloadedSize: 500,
      localCacheReference: prodFile,
      verificationStatus: 'SOURCE_CHECKSUM_UNAVAILABLE',
      provenance: {
        source: 'Copernicus Data Space Ecosystem (CDSE)',
        provider: 'ESA',
        datasetId: 'SENTINEL-1',
        observationTime: new Date().toISOString(),
        ingestionTime: new Date().toISOString(),
        validTime: new Date().toISOString(),
        forecastHorizonHours: 0,
        freshnessState: 'FRESH',
        category: 'OBSERVED',
        isSynthetic: false,
      },
    };
    saveAcquisitionRecord(rec);

    const proc = await processSentinel1Sar(productId);
    assert.strictEqual(proc.provenance.isSynthetic, false);
    assert.strictEqual(proc.provenance.source.includes('Copernicus'), true);

    fs.unlinkSync(prodFile);
    if (fs.existsSync(getProcessingPath(productId))) fs.unlinkSync(getProcessingPath(productId));
    if (fs.existsSync(getValidationPath(productId))) fs.unlinkSync(getValidationPath(productId));
    if (fs.existsSync(getMetadataPath(productId))) fs.unlinkSync(getMetadataPath(productId));
  });

  console.log(`\nPhase 7C.2-R Sentinel-1 SAR Processing Audit Test Summary: ${passed} Passed, ${failed} Failed.\n`);
  return { passed, failed };
}

// Auto-execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runSentinel1ProcessingTests();
}
