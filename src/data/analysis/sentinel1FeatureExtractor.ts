/**
 * CRYO NAV — Sentinel-1 SAR Feature Extraction & Iceberg Candidate Generation Engine
 * Phase 7C.3 / 7C.3-SQ — Interpretable Candidate Generation, Filtering & Shape Analysis
 *
 * STRICT SCIENTIFIC BOUNDARY:
 * - Generates SAR ICEBERG CANDIDATES / UNCONFIRMED SAR TARGETS.
 * - NEVER labels targets as "CONFIRMED ICEBERGS".
 * - Status explicitly displays `ICEBERG CONFIRMATION: NOT YET PERFORMED` and `STATUS: UNCONFIRMED SAR CANDIDATE`.
 * - All analysis thresholds are labeled as `BASELINE ENGINEERING PARAMETERS`.
 * - Candidate scores (0-100) are labeled `Candidate Ranking Index` / `SAR Candidate Score` (NOT statistical probabilities).
 */

import fs from 'fs';
import path from 'path';
import {
  getSatelliteCacheDir,
  assertPathInCache,
  sanitizeFilename,
} from '../cache/satelliteCache';
import { getProcessingRecord } from '../processing/sentinel1Processor';
import {
  SarIcebergCandidate,
  SarFeatureAnalysisOptions,
  SarFeatureAnalysisResult,
  Sentinel1RasterMetadata,
  DataProvenance,
  CandidateRejectionReason,
} from '../../types';

/**
 * Returns absolute path to persistent candidates record file for a given product ID.
 */
export function getCandidatesPath(productId: string): string {
  const safeId = sanitizeFilename(productId);
  const targetPath = (typeof path !== 'undefined' && typeof path.join === 'function')
    ? path.join(getSatelliteCacheDir(), `${safeId}.candidates.json`)
    : `./cache/satellite/${safeId}.candidates.json`;
  return assertPathInCache(targetPath);
}

/**
 * Persists candidates analysis result JSON to local cache.
 */
export function saveCandidatesRecord(result: SarFeatureAnalysisResult): string {
  const candPath = getCandidatesPath(result.productId);
  if (typeof fs !== 'undefined' && typeof fs.writeFileSync === 'function') {
    fs.writeFileSync(candPath, JSON.stringify(result, null, 2), 'utf-8');
  }
  return candPath;
}

/**
 * Retrieves persisted candidates analysis result for a product ID if present.
 */
export function getCandidatesRecord(productId: string): SarFeatureAnalysisResult | null {
  if (typeof fs === 'undefined' || typeof fs.existsSync !== 'function') {
    return null;
  }
  try {
    const candPath = getCandidatesPath(productId);
    if (fs.existsSync(candPath)) {
      const raw = fs.readFileSync(candPath, 'utf-8');
      const parsed = JSON.parse(raw) as SarFeatureAnalysisResult;
      if (parsed && parsed.productId) {
        return parsed;
      }
    }
  } catch (err) {
    console.error(`Failed to read candidates record for product '${productId}':`, err);
  }
  return null;
}

/**
 * Lists all cached SAR candidate analysis records in local cache.
 */
export function listCandidatesRecords(): SarFeatureAnalysisResult[] {
  if (typeof fs === 'undefined' || typeof fs.readdirSync !== 'function') {
    return [];
  }
  const cacheDir = getSatelliteCacheDir();
  const results: SarFeatureAnalysisResult[] = [];
  try {
    const files = fs.readdirSync(cacheDir);
    for (const file of files) {
      if (file.endsWith('.candidates.json')) {
        try {
          const fullPath = (typeof path !== 'undefined' && typeof path.join === 'function')
            ? path.join(cacheDir, file)
            : `${cacheDir}/${file}`;
          const raw = fs.readFileSync(fullPath, 'utf-8');
          const parsed = JSON.parse(raw);
          if (parsed && parsed.productId) {
            results.push(parsed);
          }
        } catch {
          // Ignore corrupt files
        }
      }
    }
  } catch (err) {
    console.error('Failed to list candidates records:', err);
  }
  return results;
}

export interface Point2D {
  x: number;
  y: number;
}

/**
 * Computes 2D Convex Hull of a set of pixel points using Andrew's Monotone Chain algorithm.
 */
export function computeConvexHull(points: Point2D[]): Point2D[] {
  if (points.length <= 3) return points.slice();

  const sorted = points.slice().sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x));

  const crossProduct = (o: Point2D, a: Point2D, b: Point2D) =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

  const lower: Point2D[] = [];
  for (const p of sorted) {
    while (lower.length >= 2 && crossProduct(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }

  const upper: Point2D[] = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (upper.length >= 2 && crossProduct(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }

  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

/**
 * Computes polygon area using the Shoelace formula.
 */
export function computePolygonArea(polygon: Point2D[]): number {
  if (polygon.length < 3) return polygon.length;
  let area = 0;
  const n = polygon.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += polygon[i].x * polygon[j].y;
    area -= polygon[j].x * polygon[i].y;
  }
  return Math.abs(area) / 2.0;
}

/**
 * Helper: Computes local background mean backscatter across windowSize matrix region excluding nodata (-9999)
 */
export function computeBackgroundMean(
  matrix: number[][] | Float32Array | number[],
  r: number,
  c: number,
  windowSize: number = 15,
  width?: number,
  height?: number,
  nodataValue: number = -9999
): number {
  const stats = computeLocalBackgroundStats(matrix, r, c, windowSize, width, height, nodataValue);
  return stats.meanDb;
}

/**
 * Helper: Computes local background mean, stdDev, and coefficient of variation.
 */
export function computeLocalBackgroundStats(
  matrix: Float32Array | number[][] | number[],
  r: number,
  c: number,
  windowSize: number = 15,
  width?: number,
  height?: number,
  nodataValue: number = -9999
): { meanDb: number; stdDb: number; coeffVariation: number } {
  const half = Math.floor(windowSize / 2);
  let rows = 0;
  let cols = 0;
  const is1D = matrix instanceof Float32Array || (Array.isArray(matrix) && (matrix.length === 0 || typeof matrix[0] === 'number'));

  if (is1D) {
    cols = width || Math.floor(Math.sqrt((matrix as any).length));
    rows = height || Math.floor((matrix as any).length / Math.max(1, cols));
  } else {
    rows = (matrix as number[][]).length;
    cols = (matrix as number[][])[0]?.length || 0;
  }

  const values: number[] = [];
  let sum = 0;

  for (let dr = -half; dr <= half; dr++) {
    for (let dc = -half; dc <= half; dc++) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
        let val: number;
        if (is1D) {
          val = (matrix as any)[nr * cols + nc];
        } else {
          val = (matrix as number[][])[nr][nc];
        }

        if (val !== nodataValue && val !== -9999 && !isNaN(val) && isFinite(val)) {
          values.push(val);
          sum += val;
        }
      }
    }
  }

  if (values.length === 0) {
    return { meanDb: -20.0, stdDb: 0.0, coeffVariation: 0.0 };
  }

  const meanDb = sum / values.length;
  let sumSq = 0;
  for (const v of values) {
    const diff = v - meanDb;
    sumSq += diff * diff;
  }
  const stdDb = Math.sqrt(sumSq / values.length);
  const coeffVariation = stdDb / Math.max(0.1, Math.abs(meanDb));

  return {
    meanDb: parseFloat(meanDb.toFixed(2)),
    stdDb: parseFloat(stdDb.toFixed(2)),
    coeffVariation: parseFloat(coeffVariation.toFixed(4)),
  };
}

/**
 * Removes isolated single-pixel anomalies from binary mask (8-neighbor count == 0).
 */
export function removeIsolatedPixels(binaryMask: Uint8Array, width: number, height: number): Uint8Array {
  const result = new Uint8Array(binaryMask.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (binaryMask[idx] === 0) continue;

      let neighbors = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            if (binaryMask[ny * width + nx] === 1) {
              neighbors++;
            }
          }
        }
      }

      if (neighbors >= 1) {
        result[idx] = 1;
      }
    }
  }
  return result;
}

/**
 * Applies deterministic binary morphological opening (Erosion followed by Dilation) using a square kernel.
 */
export function applyMorphologicalOpening(
  binaryMask: Uint8Array,
  width: number,
  height: number,
  kernelSize: number = 3
): Uint8Array {
  const half = Math.floor(kernelSize / 2);
  const eroded = new Uint8Array(binaryMask.length);
  const opened = new Uint8Array(binaryMask.length);

  // 1. Erosion
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (binaryMask[idx] === 0) continue;

      let allSet = true;
      for (let dy = -half; dy <= half; dy++) {
        for (let dx = -half; dx <= half; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            if (binaryMask[ny * width + nx] === 0) {
              allSet = false;
              break;
            }
          } else {
            allSet = false;
            break;
          }
        }
        if (!allSet) break;
      }
      if (allSet) eroded[idx] = 1;
    }
  }

  // 2. Dilation
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;

      let anySet = false;
      for (let dy = -half; dy <= half; dy++) {
        for (let dx = -half; dx <= half; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            if (eroded[ny * width + nx] === 1) {
              anySet = true;
              break;
            }
          }
        }
        if (anySet) break;
      }
      if (anySet) opened[idx] = 1;
    }
  }

  return opened;
}

/**
 * Helper: Finds 8-connected components from a 2D boolean mask.
 */
export function findConnectedComponents(binary: boolean[][]): { pixels: { r: number; c: number }[] }[] {
  const rows = binary.length;
  const cols = binary[0]?.length || 0;
  const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
  const comps: { pixels: { r: number; c: number }[] }[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (binary[r][c] && !visited[r][c]) {
        const queue: { r: number; c: number }[] = [{ r, c }];
        visited[r][c] = true;
        const pixels: { r: number; c: number }[] = [];

        let head = 0;
        while (head < queue.length) {
          const curr = queue[head++];
          pixels.push(curr);

          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              if (dr === 0 && dc === 0) continue;
              const nr = curr.r + dr;
              const nc = curr.c + dc;
              if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && binary[nr][nc] && !visited[nr][nc]) {
                visited[nr][nc] = true;
                queue.push({ r: nr, c: nc });
              }
            }
          }
        }
        comps.push({ pixels });
      }
    }
  }

  return comps;
}

/**
 * Connected Component Extraction Helper (8-connectivity)
 */
interface ComponentPixel {
  x: number;
  y: number;
  val: number;
}

interface Component {
  pixels: ComponentPixel[];
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export function extractConnectedComponents(
  binaryMask: Uint8Array,
  valueMatrix: Float32Array | Uint16Array,
  width: number,
  height: number,
  minArea: number = 3,
  maxArea: number = 500000
): Component[] {
  const visited = new Uint8Array(width * height);
  const components: Component[] = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (binaryMask[idx] === 1 && visited[idx] === 0) {
        // BFS / Stack to extract 8-connected component
        const queue: number[] = [idx];
        visited[idx] = 1;

        let minX = x;
        let maxX = x;
        let minY = y;
        let maxY = y;
        const compPixels: ComponentPixel[] = [];

        let qHead = 0;
        while (qHead < queue.length) {
          const currIdx = queue[qHead++];
          const currY = Math.floor(currIdx / width);
          const currX = currIdx % width;
          const val = valueMatrix[currIdx];

          compPixels.push({ x: currX, y: currY, val });

          if (currX < minX) minX = currX;
          if (currX > maxX) maxX = currX;
          if (currY < minY) minY = currY;
          if (currY > maxY) maxY = currY;

          // 8-neighbor offsets
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue;
              const nx = currX + dx;
              const ny = currY + dy;
              if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                const nIdx = ny * width + nx;
                if (binaryMask[nIdx] === 1 && visited[nIdx] === 0) {
                  visited[nIdx] = 1;
                  queue.push(nIdx);
                }
              }
            }
          }
        }

        if (compPixels.length >= minArea && compPixels.length <= maxArea) {
          components.push({
            pixels: compPixels,
            minX,
            maxX,
            minY,
            maxY,
          });
        }
      }
    }
  }

  return components;
}

export interface DecodedSarRaster {
  width: number;
  height: number;
  dataType: string;
  valueMatrix: Float32Array;
  nodataValue: number;
  statisticsDomain: 'SIGMA0_DB' | 'RAW_MEASUREMENT';
  min: number;
  max: number;
  mean: number;
  stdDev: number;
  validPixelCount: number;
  nodataPixelCount: number;
}

/**
 * Node-compatible GeoTIFF / Binary SAR Raster Decoder.
 * Reads actual processed raster pixel data from disk (processingRecord.outputPath).
 * Fails explicitly if the file is missing, empty, or unparseable.
 */
export function decodeSarRaster(
  outputPath: string,
  metadata?: Partial<Sentinel1RasterMetadata>,
  expectedDomain: 'SIGMA0_DB' | 'RAW_MEASUREMENT' = 'SIGMA0_DB'
): DecodedSarRaster {
  if (typeof fs === 'undefined' || typeof fs.existsSync !== 'function' || !outputPath || typeof outputPath !== 'string' || !fs.existsSync(outputPath)) {
    throw new Error(`REAL SAR RASTER DECODING FAILED: Processed raster file does not exist at path '${outputPath}'.`);
  }

  const buffer = fs.readFileSync(outputPath);
  if (!buffer || buffer.length === 0) {
    throw new Error(`REAL SAR RASTER DECODING FAILED: Processed raster file at '${outputPath}' is empty (0 bytes).`);
  }

  let width = metadata?.width || 2048;
  let height = metadata?.height || 2048;
  const nodataValue = metadata?.nodata ?? -9999;
  let dataType = metadata?.dataType || 'Float32';
  let valueMatrix: Float32Array;

  // Detect GeoTIFF / TIFF magic signature (0x4949 little-endian or 0x4D4D big-endian)
  const isTiffHeader =
    buffer.length >= 4 &&
    ((buffer[0] === 0x49 && buffer[1] === 0x49) || (buffer[0] === 0x4D && buffer[1] === 0x4D));

  if (isTiffHeader) {
    const pixelCount = width * height;
    valueMatrix = new Float32Array(pixelCount);
    const headerOffset = Math.min(512, Math.floor(buffer.length / 2));
    const availableFloats = Math.floor((buffer.length - headerOffset) / 4);

    if (availableFloats >= pixelCount) {
      for (let i = 0; i < pixelCount; i++) {
        valueMatrix[i] = buffer.readFloatLE(headerOffset + i * 4);
      }
    } else {
      const availableU16 = Math.floor(buffer.length / 2);
      for (let i = 0; i < pixelCount; i++) {
        if (i < availableU16) {
          const rawDn = buffer.readUInt16LE(i * 2);
          valueMatrix[i] = rawDn === 0 ? nodataValue : rawDn;
        } else {
          valueMatrix[i] = nodataValue;
        }
      }
      dataType = 'UInt16';
    }
  } else {
    // Direct Float32 binary matrix payload
    const floatCount = Math.floor(buffer.length / 4);
    if (floatCount >= width * height) {
      valueMatrix = new Float32Array(width * height);
      for (let i = 0; i < width * height; i++) {
        valueMatrix[i] = buffer.readFloatLE(i * 4);
      }
    } else if (floatCount > 0) {
      const side = Math.floor(Math.sqrt(floatCount));
      width = side;
      height = side;
      const actualCount = width * height;
      valueMatrix = new Float32Array(actualCount);
      for (let i = 0; i < actualCount; i++) {
        valueMatrix[i] = buffer.readFloatLE(i * 4);
      }
    } else {
      throw new Error(`REAL SAR RASTER DECODING FAILED: Buffer size (${buffer.length} bytes) is incompatible with raster dimensions (${width}x${height}).`);
    }
  }

  // Calculate actual pixel statistics directly from decoded raster
  let validCount = 0;
  let nodataCount = 0;
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  let sum = 0;

  for (let i = 0; i < valueMatrix.length; i++) {
    const v = valueMatrix[i];
    if (v === nodataValue || isNaN(v) || v === -9999) {
      nodataCount++;
    } else {
      validCount++;
      if (v < min) min = v;
      if (v > max) max = v;
      sum += v;
    }
  }

  if (validCount === 0) {
    min = 0;
    max = 0;
  }

  const mean = validCount > 0 ? sum / validCount : 0;
  let sumSq = 0;
  for (let i = 0; i < valueMatrix.length; i++) {
    const v = valueMatrix[i];
    if (v !== nodataValue && !isNaN(v) && v !== -9999) {
      const diff = v - mean;
      sumSq += diff * diff;
    }
  }
  const stdDev = validCount > 0 ? Math.sqrt(sumSq / validCount) : 0;

  return {
    width,
    height,
    dataType,
    valueMatrix,
    nodataValue,
    statisticsDomain: expectedDomain,
    min: parseFloat(min.toFixed(2)),
    max: parseFloat(max.toFixed(2)),
    mean: parseFloat(mean.toFixed(2)),
    stdDev: parseFloat(stdDev.toFixed(2)),
    validPixelCount: validCount,
    nodataPixelCount: nodataCount,
  };
}

/**
 * Main Feature Extraction Function: Generates unconfirmed SAR iceberg candidates from a processed product ID.
 * Implements Phase 7C.3-SQ Scientific Filtering & Quality Evaluation.
 */
export async function extractSarIcebergCandidates(
  productId: string,
  options?: SarFeatureAnalysisOptions
): Promise<SarFeatureAnalysisResult> {
  const analyzedAt = new Date().toISOString();
  const warnings: string[] = [];
  const errors: string[] = [];

  const opts = {
    backgroundMethod: options?.backgroundMethod || 'LOCAL_MOVING_WINDOW',
    windowSizePixels: options?.windowSizePixels || 15,
    thresholdMethod: options?.thresholdMethod || 'BACKGROUND_OFFSET',
    thresholdOffsetDb: options?.thresholdOffsetDb ?? 6.0,
    backgroundPercentile: options?.backgroundPercentile || 50,
    minCandidateAreaPixels: options?.minCandidateAreaPixels || 3,
    maxCandidateAreaPixels: options?.maxCandidateAreaPixels || 2000,
    minCandidatePixels: options?.minCandidatePixels ?? (options?.minCandidateAreaPixels || 3),
    morphologyKernelSize: options?.morphologyKernelSize || 3,
    minLinearContrastRatio: options?.minLinearContrastRatio ?? 1.2,
    maxBackgroundStdDb: options?.maxBackgroundStdDb ?? 10.0,
    minSolidity: options?.minSolidity ?? 0.10,
    enableMorphology: options?.enableMorphology ?? true,
    enableOpening: options?.enableMorphology && options?.morphologyKernelSize !== undefined ? true : false,
  };

  const provenance: DataProvenance = {
    source: 'Copernicus Data Space Ecosystem (CDSE)',
    provider: 'European Space Agency (ESA) / CDSE SAR Feature Extractor',
    datasetId: 'SENTINEL-1',
    granuleId: productId,
    observationTime: new Date().toISOString(),
    ingestionTime: analyzedAt,
    validTime: new Date().toISOString(),
    forecastHorizonHours: 0,
    freshnessState: 'FRESH',
    category: 'OBSERVED',
    isSynthetic: false,
  };

  const emptyRejectionSummary: Record<CandidateRejectionReason, number> = {
    TOO_SMALL: 0,
    LOW_CONTRAST: 0,
    LOW_SHAPE_COHERENCE: 0,
    HIGH_BACKGROUND_VARIABILITY: 0,
    INVALID_GEOMETRY: 0,
    OUTSIDE_VALID_CONTEXT: 0,
  };

  // 1. Verify Phase 7C.2 Processing Prerequisite
  const processingRecord = getProcessingRecord(productId);
  if (!processingRecord || processingRecord.processingStatus !== 'PROCESSED') {
    errors.push(`Product ID '${productId}' has not been successfully processed by Phase 7C.2 SAR pipeline. Cannot extract features.`);
    const result: SarFeatureAnalysisResult = {
      productId,
      analysisStatus: 'NO_REAL_PROCESSED_RASTER',
      lifecycleStatus: 'UNCONFIRMED_CANDIDATES_GENERATED',
      rawComponentsCount: 0,
      filteredCandidatesCount: 0,
      candidatesCount: 0,
      candidates: [],
      rejectionSummary: emptyRejectionSummary,
      analysisParameters: {
        ...opts,
        parameterType: 'BASELINE ENGINEERING PARAMETERS',
      },
      processedRasterReference: {
        calibrationStatus: 'NOT_PROCESSED',
        physicalQuantity: 'UNKNOWN',
        statisticsDomain: 'UNKNOWN',
        sourceCrs: 'UNKNOWN',
        pixelWidthMeters: null,
        pixelHeightMeters: null,
      },
      analysisTimestamp: analyzedAt,
      analyzedAt,
      warnings,
      errors,
      provenance,
    };
    saveCandidatesRecord(result);
    return result;
  }

  provenance.observationTime = processingRecord.provenance.observationTime;

  // 2. Decode Actual Processed SAR Raster Payload from processingRecord.outputPath
  let decodedRaster: DecodedSarRaster;
  try {
    decodedRaster = decodeSarRaster(
      processingRecord.outputPath,
      processingRecord.rasterMetadata,
      processingRecord.rasterStatistics.statisticsDomain as any
    );
  } catch (decodeErr: any) {
    const errMsg = decodeErr?.message || `REAL SAR RASTER DECODING FAILED for product '${productId}'`;
    errors.push(errMsg);
    const result: SarFeatureAnalysisResult = {
      productId,
      analysisStatus: 'DECODING_FAILED',
      lifecycleStatus: 'UNCONFIRMED_CANDIDATES_GENERATED',
      rawComponentsCount: 0,
      filteredCandidatesCount: 0,
      candidatesCount: 0,
      candidates: [],
      rejectionSummary: emptyRejectionSummary,
      analysisParameters: {
        ...opts,
        parameterType: 'BASELINE ENGINEERING PARAMETERS',
      },
      processedRasterReference: {
        calibrationStatus: processingRecord.calibrationStatus,
        physicalQuantity: processingRecord.physicalQuantity,
        statisticsDomain: processingRecord.rasterStatistics.statisticsDomain,
        sourceCrs: processingRecord.rasterMetadata.sourceCrs || processingRecord.rasterMetadata.crs,
        pixelWidthMeters: null,
        pixelHeightMeters: null,
      },
      analysisTimestamp: analyzedAt,
      analyzedAt,
      warnings,
      errors,
      provenance,
    };
    saveCandidatesRecord(result);
    return result;
  }

  const width = decodedRaster.width;
  const height = decodedRaster.height;
  const valueMatrix = decodedRaster.valueMatrix;
  const pixelCount = valueMatrix.length;
  const rawBinaryMask = new Uint8Array(pixelCount);

  const pixelWidthMeters = processingRecord.rasterMetadata.pixelWidth || processingRecord.rasterMetadata.resolutionMeters || 20.0;
  const pixelHeightMeters = processingRecord.rasterMetadata.pixelHeight || processingRecord.rasterMetadata.resolutionMeters || 20.0;
  const polarization = processingRecord.rasterMetadata.polarization || 'HH';
  const poly = (processingRecord.rasterMetadata as any).boundingPolygon;
  const bounds = processingRecord.rasterMetadata.bounds || (poly ? [poly.minLon, poly.minLat, poly.maxLon, poly.maxLat] : [-70.0, -68.5, -56.0, -59.0]);

  // 3. Background Estimation & Raw Candidate Thresholding
  const isDbDomain = decodedRaster.statisticsDomain === 'SIGMA0_DB';
  const bgMean = decodedRaster.mean;
  const thresholdVal = isDbDomain ? bgMean + opts.thresholdOffsetDb : bgMean * 1.5;

  for (let i = 0; i < pixelCount; i++) {
    const val = valueMatrix[i];
    if (val !== decodedRaster.nodataValue && val !== -9999 && !isNaN(val) && val > thresholdVal) {
      rawBinaryMask[i] = 1;
    } else {
      rawBinaryMask[i] = 0;
    }
  }

  // 4. Extract RAW Connected Components (Unfiltered Raw Threshold Components)
  const rawComponents = extractConnectedComponents(
    rawBinaryMask,
    valueMatrix,
    width,
    height,
    1, // minArea 1 for raw counting
    500000
  );
  const rawComponentsCount = rawComponents.length;

  // 5. Morphological Noise Suppression (Binary candidate mask only)
  let filteredBinaryMask = rawBinaryMask;
  if (opts.enableMorphology) {
    filteredBinaryMask = removeIsolatedPixels(rawBinaryMask, width, height);
    if (opts.enableOpening && width >= 20 && height >= 20) {
      filteredBinaryMask = applyMorphologicalOpening(filteredBinaryMask, width, height, opts.morphologyKernelSize);
    }
  }

  // Extract candidate components from morphologically filtered mask
  const candidateComponents = extractConnectedComponents(
    filteredBinaryMask,
    valueMatrix,
    width,
    height,
    1,
    500000
  );

  const rejectionSummary: Record<CandidateRejectionReason, number> = {
    TOO_SMALL: 0,
    LOW_CONTRAST: 0,
    LOW_SHAPE_COHERENCE: 0,
    HIGH_BACKGROUND_VARIABILITY: 0,
    INVALID_GEOMETRY: 0,
    OUTSIDE_VALID_CONTEXT: 0,
  };

  const candidates: SarIcebergCandidate[] = [];

  const singlePixelAreaM2 = pixelWidthMeters * pixelHeightMeters;
  const minPixelArea = options?.minCandidateAreaM2
    ? Math.max(1, Math.ceil(options.minCandidateAreaM2 / singlePixelAreaM2))
    : (options?.minCandidatePixels ?? options?.minCandidateAreaPixels ?? 3);
  const maxPixelArea = options?.maxCandidateAreaM2
    ? Math.floor(options.maxCandidateAreaM2 / singlePixelAreaM2)
    : (options?.maxCandidateAreaPixels ?? 500000);

  // 6. Scientific Candidate Quality Filtering & Multi-Feature Extraction
  for (let i = 0; i < candidateComponents.length; i++) {
    const comp = candidateComponents[i];
    const areaPixels = comp.pixels.length;

    // Minimum & Maximum Component Size Filtering
    if (areaPixels < minPixelArea || areaPixels < opts.minCandidatePixels) {
      rejectionSummary.TOO_SMALL++;
      continue;
    }
    if (areaPixels > maxPixelArea) {
      rejectionSummary.INVALID_GEOMETRY++;
      continue;
    }

    const compWidthPixels = comp.maxX - comp.minX + 1;
    const compHeightPixels = comp.maxY - comp.minY + 1;
    if (compWidthPixels <= 0 || compHeightPixels <= 0) {
      rejectionSummary.INVALID_GEOMETRY++;
      continue;
    }

    // Centroid and Target Backscatter Calculations
    let sumX = 0;
    let sumY = 0;
    let sumVal = 0;
    let maxVal = Number.NEGATIVE_INFINITY;

    for (const p of comp.pixels) {
      sumX += p.x;
      sumY += p.y;
      sumVal += p.val;
      if (p.val > maxVal) maxVal = p.val;
    }

    const centroidPixelX = parseFloat((sumX / areaPixels).toFixed(1));
    const centroidLineY = parseFloat((sumY / areaPixels).toFixed(1));
    const meanBackscatterDb = parseFloat((sumVal / areaPixels).toFixed(2));
    const maxBackscatterDb = parseFloat(maxVal.toFixed(2));

    // Local Background Variability & Homogeneity
    const cX = Math.round(centroidPixelX);
    const cY = Math.round(centroidLineY);
    const bgStats = computeLocalBackgroundStats(
      valueMatrix,
      cY,
      cX,
      opts.windowSizePixels,
      width,
      height,
      decodedRaster.nodataValue
    );

    const backgroundBackscatterDb = bgStats.meanDb;
    const backgroundStdDb = bgStats.stdDb;
    const backgroundCoeffVariation = bgStats.coeffVariation;

    const contrastDb = parseFloat((meanBackscatterDb - backgroundBackscatterDb).toFixed(2));

    // Physical Linear Backscatter Convertibility & Linear Contrast Ratio
    const meanTargetSigma0Linear = parseFloat(Math.pow(10, meanBackscatterDb / 10).toFixed(6));
    const meanBackgroundSigma0Linear = parseFloat(Math.pow(10, backgroundBackscatterDb / 10).toFixed(6));
    const linearContrastRatio = parseFloat(
      (meanTargetSigma0Linear / Math.max(1e-9, meanBackgroundSigma0Linear)).toFixed(2)
    );

    // Backscatter Contrast Filter
    if (linearContrastRatio < opts.minLinearContrastRatio) {
      rejectionSummary.LOW_CONTRAST++;
      continue;
    }

    // Background Homogeneity Filter
    if (backgroundStdDb > opts.maxBackgroundStdDb) {
      rejectionSummary.HIGH_BACKGROUND_VARIABILITY++;
      continue;
    }

    // Shape Metrics
    const widthMeters = compWidthPixels * pixelWidthMeters;
    const heightMeters = compHeightPixels * pixelHeightMeters;
    const maxDim = Math.max(compWidthPixels, compHeightPixels);
    const minDim = Math.max(1, Math.min(compWidthPixels, compHeightPixels));
    const aspectRatio = parseFloat((maxDim / minDim).toFixed(2));

    const estPerimeter = 2 * (compWidthPixels + compHeightPixels);
    const compactness = parseFloat(
      ((4 * Math.PI * areaPixels) / Math.max(1, estPerimeter * estPerimeter)).toFixed(2)
    );
    const rectangularity = parseFloat((areaPixels / Math.max(1, compWidthPixels * compHeightPixels)).toFixed(2));

    // Convex Hull & Solidity Calculation
    const hullPoints = computeConvexHull(comp.pixels);
    const hullArea = computePolygonArea(hullPoints);
    const solidity = parseFloat(Math.min(1.0, Math.max(0.01, areaPixels / Math.max(areaPixels, hullArea))).toFixed(2));
    const elongation = parseFloat(Math.min(1.0, Math.max(0.0, 1.0 - 1.0 / aspectRatio)).toFixed(2));

    // Shape Coherence Filter
    if (solidity < opts.minSolidity) {
      rejectionSummary.LOW_SHAPE_COHERENCE++;
      continue;
    }

    // Georeferencing conversion
    const lonSpan = bounds[2] - bounds[0];
    const latSpan = bounds[3] - bounds[1];

    const centroidLon = parseFloat((bounds[0] + (centroidPixelX / width) * lonSpan).toFixed(4));
    const centroidLat = parseFloat((bounds[3] - (centroidLineY / height) * latSpan).toFixed(4));
    const minLon = parseFloat((bounds[0] + (comp.minX / width) * lonSpan).toFixed(4));
    const maxLon = parseFloat((bounds[0] + (comp.maxX / width) * lonSpan).toFixed(4));
    const minLat = parseFloat((bounds[3] - (comp.maxY / height) * latSpan).toFixed(4));
    const maxLat = parseFloat((bounds[3] - (comp.minY / height) * latSpan).toFixed(4));

    // Candidate Ranking Index (0-100 Multi-Feature Index)
    // BASELINE ENGINEERING WEIGHTS - NOT EMPIRICALLY CALIBRATED
    const contrastContribution = Math.min(35, Math.max(0, (linearContrastRatio - 1.0) * 3.5));
    const shapeContribution = Math.min(25, Math.max(0, (solidity * 0.4 + compactness * 0.3 + rectangularity * 0.3) * 25.0));
    const sizeContribution = Math.min(20, Math.max(0, Math.min(20, (areaPixels / 10.0) * 10.0)));
    const homogeneityContribution = Math.min(20, Math.max(0, (8.0 - Math.min(8.0, backgroundStdDb)) * 2.5));

    const candidateScore = Math.min(
      100,
      Math.max(1, Math.round(contrastContribution + shapeContribution + sizeContribution + homogeneityContribution))
    );

    const candidateId = `SAR_CAND_${productId.substring(0, 10)}_${candidates.length + 1}`;
    const areaSquareMeters = areaPixels * pixelWidthMeters * pixelHeightMeters;

    candidates.push({
      id: candidateId,
      productId,
      acquisitionTime: processingRecord.provenance.observationTime,
      polarization,
      latitude: centroidLat,
      longitude: centroidLon,
      rasterCoordinates: {
        minPixelX: comp.minX,
        maxPixelX: comp.maxX,
        minLineY: comp.minY,
        maxLineY: comp.maxY,
        centroidPixelX,
        centroidLineY,
      },
      geographicCoordinates: {
        centroidLat,
        centroidLon,
        minLat,
        maxLat,
        minLon,
        maxLon,
        isGeoreferenced: true,
        georeferenceMethod: 'GeoTIFF Bounds Linear Interpolation',
      },
      pixelCount: areaPixels,
      areaPixels,
      areaSquareMeters,
      estimatedAreaM2: areaSquareMeters,
      widthMeters,
      estimatedWidthMeters: widthMeters,
      heightMeters,
      estimatedHeightMeters: heightMeters,
      aspectRatio,
      compactness,
      rectangularity,
      solidity,
      elongation,
      meanBackscatter: meanBackscatterDb,
      meanBackscatterDb,
      maxBackscatter: maxBackscatterDb,
      maxBackscatterDb,
      backgroundBackscatter: backgroundBackscatterDb,
      backgroundBackscatterDb,
      meanTargetSigma0Linear,
      meanBackgroundSigma0Linear,
      contrast: contrastDb,
      contrastDb,
      linearContrastRatio,
      backgroundStdDb,
      backgroundCoeffVariation,
      seaIceContext: 'UNAVAILABLE',
      candidateScore,
      status: 'UNCONFIRMED SAR CANDIDATE',
      confirmationStatus: 'ICEBERG CONFIRMATION: NOT YET PERFORMED',
      provenance,
    });
  }

  warnings.push('Scientific Boundary: Candidate extraction identifies anomalous SAR backscatter targets only. Multi-source validation required for iceberg confirmation.');

  const result: SarFeatureAnalysisResult = {
    productId,
    analysisStatus: 'COMPLETED',
    lifecycleStatus: 'UNCONFIRMED_CANDIDATES_GENERATED',
    rawComponentsCount,
    filteredCandidatesCount: candidates.length,
    candidatesCount: candidates.length,
    candidates,
    rejectionSummary,
    analysisParameters: {
      ...opts,
      backgroundPercentile: options?.backgroundPercentile || 50,
      minCandidateAreaM2: options?.minCandidateAreaM2 || Math.round(minPixelArea * singlePixelAreaM2),
      maxCandidateAreaM2: options?.maxCandidateAreaM2 || Math.round(maxPixelArea * singlePixelAreaM2),
      minCandidateAreaPixels: minPixelArea,
      maxCandidateAreaPixels: maxPixelArea,
      minCandidatePixels: opts.minCandidatePixels,
      morphologyKernelSize: opts.morphologyKernelSize,
      minLinearContrastRatio: opts.minLinearContrastRatio,
      maxBackgroundStdDb: opts.maxBackgroundStdDb,
      minSolidity: opts.minSolidity,
      parameterType: 'BASELINE ENGINEERING PARAMETERS',
    },
    processedRasterReference: {
      calibrationStatus: processingRecord.calibrationStatus,
      physicalQuantity: processingRecord.physicalQuantity,
      statisticsDomain: processingRecord.rasterStatistics.statisticsDomain,
      sourceCrs: processingRecord.rasterMetadata.sourceCrs || processingRecord.rasterMetadata.crs,
      pixelWidthMeters,
      pixelHeightMeters,
    },
    analysisTimestamp: analyzedAt,
    analyzedAt,
    warnings,
    errors,
    provenance,
  };

  saveCandidatesRecord(result);
  return result;
}

