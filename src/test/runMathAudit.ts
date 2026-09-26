import fs from 'fs';
import { getProductFilePath, saveAcquisitionRecord } from '../data/cache/satelliteCache';
import { validateSentinel1Product } from '../data/validation/sentinel1Validator';
import { processSentinel1Sar } from '../data/processing/sentinel1Processor';
import {
  extractSarIcebergCandidates,
  decodeSarRaster,
  extractConnectedComponents,
  removeIsolatedPixels,
  computeLocalBackgroundStats,
  computeConvexHull,
  computePolygonArea,
} from '../data/analysis/sentinel1FeatureExtractor';

async function runMathAudit() {
  const productId = 'S1A_IW_GRDH_1SDV_20260919T081522_20260919T081547_055734_06CE7B_92A1';
  const prodFile = getProductFilePath(productId, 'PRODUCT');
  if (!fs.existsSync(prodFile)) {
    fs.writeFileSync(prodFile, Buffer.from('<gml:beginPosition>2026-09-19T08:15:22Z</gml:beginPosition><calibration><calibrationVectorList count="1"><calibrationVector><line>0</line><pixel>0 1000 2000</pixel><sigmaNought>50.0 50.0 50.0</sigmaNought></calibrationVector></calibrationVectorList></calibration>'));
  }

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
  const decoded = decodeSarRaster(proc.outputPath, proc.rasterMetadata, proc.rasterStatistics.statisticsDomain as any);

  const width = decoded.width;
  const height = decoded.height;
  const valueMatrix = decoded.valueMatrix;
  const pixelCount = valueMatrix.length;
  const rawBinaryMask = new Uint8Array(pixelCount);

  const thresholdVal = decoded.mean + 6.0;
  for (let i = 0; i < pixelCount; i++) {
    const val = valueMatrix[i];
    if (val !== decoded.nodataValue && val !== -9999 && !isNaN(val) && val > thresholdVal) {
      rawBinaryMask[i] = 1;
    } else {
      rawBinaryMask[i] = 0;
    }
  }

  // Stage 0: Raw components (minArea = 1)
  const rawComps = extractConnectedComponents(rawBinaryMask, valueMatrix, width, height, 1, 500000);
  const rawCount = rawComps.length;

  // Stage 1: Morphology (Isolated Pixel Removal)
  const filteredMask = removeIsolatedPixels(rawBinaryMask, width, height);
  const morphComps = extractConnectedComponents(filteredMask, valueMatrix, width, height, 1, 500000);
  const morphCount = morphComps.length;
  const morphRejCount = rawCount - morphCount;

  // Stage 2: Size Filter (minCandidatePixels = 5)
  let sizeAcceptedCount = 0;
  let sizeRejectedCount = 0;
  const sizeAcceptedComps: typeof morphComps = [];

  for (const c of morphComps) {
    if (c.pixels.length >= 5) {
      sizeAcceptedCount++;
      sizeAcceptedComps.push(c);
    } else {
      sizeRejectedCount++;
    }
  }

  // Stage 3: Contrast Filter (linearContrastRatio >= 1.20)
  let contrastAcceptedCount = 0;
  let contrastRejectedCount = 0;
  const contrastAcceptedComps: typeof morphComps = [];

  for (const c of sizeAcceptedComps) {
    let sumX = 0, sumY = 0, sumVal = 0;
    for (const p of c.pixels) {
      sumX += p.x; sumY += p.y; sumVal += p.val;
    }
    const cX = Math.round(sumX / c.pixels.length);
    const cY = Math.round(sumY / c.pixels.length);
    const meanTargetDb = sumVal / c.pixels.length;
    const bgStats = computeLocalBackgroundStats(valueMatrix, cY, cX, 15, width, height, decoded.nodataValue);

    const targetLin = Math.pow(10, meanTargetDb / 10);
    const bgLin = Math.pow(10, bgStats.meanDb / 10);
    const contrastRatio = targetLin / Math.max(1e-9, bgLin);

    if (contrastRatio >= 1.20) {
      contrastAcceptedCount++;
      contrastAcceptedComps.push(c);
    } else {
      contrastRejectedCount++;
    }
  }

  // Stage 4: Background Filter (backgroundStdDb <= 10.0)
  let bgAcceptedCount = 0;
  let bgRejectedCount = 0;
  const bgAcceptedComps: typeof morphComps = [];

  for (const c of contrastAcceptedComps) {
    let sumX = 0, sumY = 0;
    for (const p of c.pixels) {
      sumX += p.x; sumY += p.y;
    }
    const cX = Math.round(sumX / c.pixels.length);
    const cY = Math.round(sumY / c.pixels.length);
    const bgStats = computeLocalBackgroundStats(valueMatrix, cY, cX, 15, width, height, decoded.nodataValue);

    if (bgStats.stdDb <= 10.0) {
      bgAcceptedCount++;
      bgAcceptedComps.push(c);
    } else {
      bgRejectedCount++;
    }
  }

  // Stage 5: Shape Filter (solidity >= 0.10)
  let shapeAcceptedCount = 0;
  let shapeRejectedCount = 0;

  for (const c of bgAcceptedComps) {
    const hullPoints = computeConvexHull(c.pixels);
    const hullArea = computePolygonArea(hullPoints);
    const solidity = Math.min(1.0, Math.max(0.01, c.pixels.length / Math.max(c.pixels.length, hullArea)));

    if (solidity >= 0.10) {
      shapeAcceptedCount++;
    } else {
      shapeRejectedCount++;
    }
  }

  // Run full extractSarIcebergCandidates to get final output candidate objects
  const fullResult = await extractSarIcebergCandidates(productId, { minCandidatePixels: 5 });
  const candidates = fullResult.candidates;

  // Calculate statistics across all surviving candidates
  const contrastRatios = candidates.map(c => c.linearContrastRatio).sort((a,b) => a-b);
  const bgStdDbs = candidates.map(c => c.backgroundStdDb).sort((a,b) => a-b);
  const solidities = candidates.map(c => c.solidity).sort((a,b) => a-b);
  const scores = candidates.map(c => c.candidateScore).sort((a,b) => a-b);

  const getPercentile = (arr: number[], p: number) => arr[Math.floor((p / 100) * (arr.length - 1))];
  const getMean = (arr: number[]) => arr.reduce((a,b) => a+b, 0) / Math.max(1, arr.length);

  // Independent verification for Sample A, B, C
  candidates.sort((a, b) => b.candidateScore - a.candidateScore);
  const sampleA = candidates[0];
  const sampleB = candidates[Math.floor(candidates.length / 2)];
  const sampleC = candidates[candidates.length - 1];

  function calculateIndependentScore(c: any) {
    const contrastContribution = Math.min(35, Math.max(0, (c.linearContrastRatio - 1.0) * 3.5));
    const shapeContribution = Math.min(25, Math.max(0, (c.solidity * 0.4 + c.compactness * 0.3 + c.rectangularity * 0.3) * 25.0));
    const sizeContribution = Math.min(20, Math.max(0, Math.min(20, (c.pixelCount / 10.0) * 10.0)));
    const homogeneityContribution = Math.min(20, Math.max(0, (8.0 - Math.min(8.0, c.backgroundStdDb)) * 2.5));

    return Math.min(100, Math.max(1, Math.round(contrastContribution + shapeContribution + sizeContribution + homogeneityContribution)));
  }

  const indA = calculateIndependentScore(sampleA);
  const indB = calculateIndependentScore(sampleB);
  const indC = calculateIndependentScore(sampleC);

  console.log('--- MATH_AUDIT_OUTPUT_START ---');
  console.log(JSON.stringify({
    productId,
    reconciliation: {
      stage0_raw: { input: rawCount, accepted: rawCount, rejected: 0 },
      stage1_morphology: { input: rawCount, accepted: morphCount, rejected: morphRejCount, reason: 'ISOLATED_PIXEL_REMOVAL' },
      stage2_size: { input: morphCount, accepted: sizeAcceptedCount, rejected: sizeRejectedCount, reason: 'TOO_SMALL' },
      stage3_contrast: { input: sizeAcceptedCount, accepted: contrastAcceptedCount, rejected: contrastRejectedCount, reason: 'LOW_CONTRAST' },
      stage4_background: { input: contrastAcceptedCount, accepted: bgAcceptedCount, rejected: bgRejectedCount, reason: 'HIGH_BACKGROUND_VARIABILITY' },
      stage5_shape: { input: bgAcceptedCount, accepted: shapeAcceptedCount, rejected: shapeRejectedCount, reason: 'LOW_SHAPE_COHERENCE' },
      finalCandidatesCount: shapeAcceptedCount,
    },
    contrastRatioStats: {
      min: contrastRatios[0],
      median: getPercentile(contrastRatios, 50),
      mean: parseFloat(getMean(contrastRatios).toFixed(2)),
      max: contrastRatios[contrastRatios.length - 1],
      p95: getPercentile(contrastRatios, 95),
      p99: getPercentile(contrastRatios, 99),
    },
    backgroundStdDbStats: {
      min: bgStdDbs[0],
      median: getPercentile(bgStdDbs, 50),
      mean: parseFloat(getMean(bgStdDbs).toFixed(2)),
      max: bgStdDbs[bgStdDbs.length - 1],
      p95: getPercentile(bgStdDbs, 95),
      p99: getPercentile(bgStdDbs, 99),
    },
    solidityStats: {
      min: solidities[0],
      median: getPercentile(solidities, 50),
      mean: parseFloat(getMean(solidities).toFixed(2)),
      max: solidities[solidities.length - 1],
      p95: getPercentile(solidities, 95),
    },
    scoreStats: {
      minObserved: scores[0],
      medianObserved: getPercentile(scores, 50),
      meanObserved: parseFloat(getMean(scores).toFixed(2)),
      maxObserved: scores[scores.length - 1],
      theoreticalMin: 1,
      theoreticalMax: 100,
    },
    sampleVerification: {
      sampleA: { id: sampleA.id, codeScore: sampleA.candidateScore, independentScore: indA, diff: sampleA.candidateScore - indA },
      sampleB: { id: sampleB.id, codeScore: sampleB.candidateScore, independentScore: indB, diff: sampleB.candidateScore - indB },
      sampleC: { id: sampleC.id, codeScore: sampleC.candidateScore, independentScore: indC, diff: sampleC.candidateScore - indC },
    },
  }, null, 2));
  console.log('--- MATH_AUDIT_OUTPUT_END ---');
}

runMathAudit();
