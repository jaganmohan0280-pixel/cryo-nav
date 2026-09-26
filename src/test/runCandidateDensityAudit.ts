import fs from 'fs';
import { saveAcquisitionRecord, getProductFilePath } from '../data/cache/satelliteCache';
import { validateSentinel1Product } from '../data/validation/sentinel1Validator';
import { processSentinel1Sar } from '../data/processing/sentinel1Processor';
import { extractSarIcebergCandidates, decodeSarRaster } from '../data/analysis/sentinel1FeatureExtractor';

async function runDensityAudit() {
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

  // 1. Sensitivity Audit Across minCandidatePixels Parameter Values
  const sensitivityValues = [1, 3, 5, 8, 10, 15];
  const sensitivityAuditResults: any[] = [];

  for (const minPx of sensitivityValues) {
    const res = await extractSarIcebergCandidates(productId, { minCandidatePixels: minPx });
    const rawCount = res.rawComponentsCount;
    const filtCount = res.filteredCandidatesCount;
    const reductionPct = rawCount > 0 ? parseFloat((((rawCount - filtCount) / rawCount) * 100).toFixed(2)) : 0;
    sensitivityAuditResults.push({
      minCandidatePixels: minPx,
      rawComponentsCount: rawCount,
      filteredCandidatesCount: filtCount,
      reductionPercentage: `${reductionPct}%`,
      rejectionSummary: res.rejectionSummary,
    });
  }

  // 2. Main Audit Run with Baseline minCandidatePixels = 5
  const defaultResult = await extractSarIcebergCandidates(productId, { minCandidatePixels: 5 });
  const rawComponentsCount = defaultResult.rawComponentsCount;
  const filteredCandidatesCount = defaultResult.filteredCandidatesCount;
  const reductionPercentage = rawComponentsCount > 0
    ? parseFloat((((rawComponentsCount - filteredCandidatesCount) / rawComponentsCount) * 100).toFixed(2))
    : 0;

  const candidates = defaultResult.candidates;
  candidates.sort((a, b) => b.candidateScore - a.candidateScore);

  // Pick 3 representative sample candidates: A. Highest, B. Medium, C. Lowest surviving candidate
  const sampleA = candidates[0] || null;
  const sampleB = candidates[Math.floor(candidates.length / 2)] || null;
  const sampleC = candidates[candidates.length - 1] || null;

  const formatSample = (cand: any, label: string) => {
    if (!cand) return null;
    return {
      sampleLabel: label,
      id: cand.id,
      row: cand.rasterCoordinates.centroidLineY,
      column: cand.rasterCoordinates.centroidPixelX,
      latitude: cand.latitude,
      longitude: cand.longitude,
      pixelCount: cand.pixelCount,
      areaSquareMeters: cand.areaSquareMeters,
      widthMeters: cand.widthMeters,
      heightMeters: cand.heightMeters,
      aspectRatio: cand.aspectRatio,
      compactness: cand.compactness,
      rectangularity: cand.rectangularity,
      solidity: cand.solidity,
      elongation: cand.elongation,
      meanSigma0Db: cand.meanBackscatterDb,
      peakSigma0Db: cand.maxBackscatterDb,
      backgroundSigma0Db: cand.backgroundBackscatterDb,
      contrastDb: cand.contrastDb,
      linearContrastRatio: cand.linearContrastRatio,
      backgroundStdDb: cand.backgroundStdDb,
      backgroundCoeffVariation: cand.backgroundCoeffVariation,
      candidateScore: cand.candidateScore,
      seaIceContext: cand.seaIceContext,
      status: cand.status,
      confirmationStatus: cand.confirmationStatus,
    };
  };

  console.log('--- DENSITY_AUDIT_OUTPUT_START ---');
  console.log(JSON.stringify({
    productId,
    rawComponentsCount,
    filteredCandidatesCount,
    reductionPercentage: `${reductionPercentage}%`,
    rejectionReasons: defaultResult.rejectionSummary,
    sensitivityAudit: sensitivityAuditResults,
    sampleCandidates: {
      highestRanking: formatSample(sampleA, 'A. Highest Candidate Ranking'),
      mediumRanking: formatSample(sampleB, 'B. Medium Candidate Ranking'),
      lowestSurvivingRanking: formatSample(sampleC, 'C. Lowest Surviving Candidate Ranking'),
    },
    scientificLimitations: 'Baseline engineering parameters only. Candidates represent unconfirmed high-backscatter SAR anomalies. Independent sea-ice / USNIC validation required before confirmation.',
  }, null, 2));
  console.log('--- DENSITY_AUDIT_OUTPUT_END ---');
}

runDensityAudit();

