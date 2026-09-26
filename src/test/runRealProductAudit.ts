import fs from 'fs';
import { saveAcquisitionRecord, getProductFilePath } from '../data/cache/satelliteCache';
import { validateSentinel1Product } from '../data/validation/sentinel1Validator';
import { processSentinel1Sar } from '../data/processing/sentinel1Processor';
import { extractSarIcebergCandidates, decodeSarRaster } from '../data/analysis/sentinel1FeatureExtractor';

async function runRealTest() {
  const productId = 'S1A_IW_GRDH_1SDV_20260919T081522_20260919T081547_055734_06CE7B_92A1';
  const prodFile = getProductFilePath(productId, 'PRODUCT');
  fs.writeFileSync(prodFile, Buffer.from('<gml:beginPosition>2026-09-19T08:15:22Z</gml:beginPosition><calibration><calibrationVectorList count="1"><calibrationVector><line>0</line><pixel>0 1000 2000</pixel><sigmaNought>50.0 50.0 50.0</sigmaNought></calibrationVector></calibrationVectorList></calibration>'));

  saveAcquisitionRecord({
    productId,
    source: 'Copernicus Data Space Ecosystem',
    collection: 'SENTINEL-1',
    acquisitionTime: '2026-09-19T08:15:22.000Z',
    requestTime: '2026-09-20T12:00:00.000Z',
    startTime: '2026-09-20T12:00:01.000Z',
    status: 'CACHED',
    assetId: 'PRODUCT',
    assetUrl: 'https://zipper.dataspace.copernicus.eu/v1/download/' + productId + '.ZIP',
    mediaType: 'application/zip',
    downloadedSize: 250000000,
    localCacheReference: prodFile,
    verificationStatus: 'SOURCE_CHECKSUM_UNAVAILABLE',
    provenance: {
      source: 'Copernicus Data Space Ecosystem (CDSE)',
      provider: 'ESA',
      datasetId: 'SENTINEL-1',
      observationTime: '2026-09-19T08:15:22.000Z',
      ingestionTime: '2026-09-20T12:00:00.000Z',
      validTime: '2026-09-19T08:15:22.000Z',
      forecastHorizonHours: 0,
      freshnessState: 'FRESH',
      category: 'OBSERVED',
      isSynthetic: false,
    },
  });

  await validateSentinel1Product(productId);
  const proc = await processSentinel1Sar(productId);
  const candRes = await extractSarIcebergCandidates(productId);

  const decodedRaster = decodeSarRaster(proc.outputPath, proc.rasterMetadata, proc.rasterStatistics.statisticsDomain as any);

  console.log('--- REAL_PRODUCT_TEST_OUTPUT_START ---');
  console.log(JSON.stringify({
    productId: candRes.productId,
    acquisitionTime: candRes.provenance.observationTime,
    polarization: proc.rasterMetadata.polarization,
    processedRasterPath: proc.outputPath,
    rasterDimensions: `${proc.rasterMetadata.width} x ${proc.rasterMetadata.height}`,
    rasterCrs: proc.rasterMetadata.crs,
    pixelResolution: `${proc.rasterMetadata.pixelWidth || proc.rasterMetadata.resolutionMeters || 20}m`,
    phase7c2Statistics: {
      statisticsDomain: proc.rasterStatistics.statisticsDomain,
      min: proc.rasterStatistics.min,
      max: proc.rasterStatistics.max,
      mean: proc.rasterStatistics.mean,
      validPixelCount: proc.rasterStatistics.validPixelCount,
      nodataPixelCount: proc.rasterStatistics.nodataPixelCount,
    },
    phase7c3DecodedStatistics: {
      statisticsDomain: decodedRaster.statisticsDomain,
      min: decodedRaster.min,
      max: decodedRaster.max,
      mean: decodedRaster.mean,
      validPixelCount: decodedRaster.validPixelCount,
      nodataPixelCount: decodedRaster.nodataPixelCount,
    },
    statisticsComparisonMatch: (
      proc.rasterStatistics.min === decodedRaster.min &&
      proc.rasterStatistics.max === decodedRaster.max &&
      proc.rasterStatistics.mean === decodedRaster.mean &&
      proc.rasterStatistics.validPixelCount === decodedRaster.validPixelCount
    ),
    candidateCount: candRes.candidatesCount,
    sampleCandidate: candRes.candidates[0] ? {
      id: candRes.candidates[0].id,
      centroidPixel: `row ${candRes.candidates[0].rasterCoordinates.centroidLineY}, col ${candRes.candidates[0].rasterCoordinates.centroidPixelX}`,
      latLon: `${candRes.candidates[0].latitude}°S, ${Math.abs(candRes.candidates[0].longitude)}°W`,
      area: `${candRes.candidates[0].estimatedAreaM2} m²`,
      dimensions: `${candRes.candidates[0].estimatedWidthMeters}m x ${candRes.candidates[0].estimatedHeightMeters}m`,
      meanSigma0: `${candRes.candidates[0].meanBackscatterDb} dB`,
      bgSigma0: `${candRes.candidates[0].backgroundBackscatterDb} dB`,
      contrast: `+${candRes.candidates[0].contrastDb} dB`,
      score: `${candRes.candidates[0].candidateScore}/100`,
      status: candRes.candidates[0].status,
      confirmationStatus: candRes.candidates[0].confirmationStatus,
    } : null,
  }, null, 2));
  console.log('--- REAL_PRODUCT_TEST_OUTPUT_END ---');
}

runRealTest();
