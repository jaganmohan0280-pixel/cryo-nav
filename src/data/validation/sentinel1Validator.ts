/**
 * CRYO NAV — Sentinel-1 Product Validation & SAFE Ingestion Engine
 * Phase 7C.1 — Product Container Inspection & Manifest Metadata Extraction
 *
 * SCOPE:
 * - SAFE ZIP & directory structure inspection
 * - Manifest XML discovery and hardened parsing (XXE immune)
 * - Safe ZIP path traversal rejection
 * - Sentinel-1 metadata extraction (Platform, Mode, Orbit, Polarization, Sensing Window)
 * - Validation record local persistence (.val.json)
 * - Offline local validation support
 */

import fs from 'fs';
import path from 'path';
import {
  getSatelliteCacheDir,
  assertPathInCache,
  sanitizeFilename,
  getAcquisitionRecord,
  getProductFilePath,
} from '../cache/satelliteCache';
import {
  Sentinel1ProductValidationResult,
  Sentinel1ValidationStatus,
  Sentinel1ContainerFormat,
  Sentinel1DiscoveredPaths,
  DataProvenance,
} from '../../types';

/**
 * Returns path to persistent validation record file for a given product ID.
 */
export function getValidationPath(productId: string): string {
  const safeId = sanitizeFilename(productId);
  const targetPath = (typeof path !== 'undefined' && typeof path.join === 'function')
    ? path.join(getSatelliteCacheDir(), `${safeId}.val.json`)
    : `./cache/satellite/${safeId}.val.json`;
  return assertPathInCache(targetPath);
}

/**
 * Persists validation result to local cache.
 */
export function saveValidationRecord(result: Sentinel1ProductValidationResult): string {
  const valPath = getValidationPath(result.productId);
  if (typeof fs !== 'undefined' && typeof fs.writeFileSync === 'function') {
    fs.writeFileSync(valPath, JSON.stringify(result, null, 2), 'utf-8');
  }
  return valPath;
}

/**
 * Retrieves persisted validation result for a product ID if present.
 */
export function getValidationRecord(productId: string): Sentinel1ProductValidationResult | null {
  if (typeof fs === 'undefined' || typeof fs.existsSync !== 'function') {
    return null;
  }
  try {
    const valPath = getValidationPath(productId);
    if (fs.existsSync(valPath)) {
      const raw = fs.readFileSync(valPath, 'utf-8');
      const parsed = JSON.parse(raw) as Sentinel1ProductValidationResult;
      if (parsed && parsed.productId) {
        return parsed;
      }
    }
  } catch (err) {
    console.error(`Failed to read validation record for product '${productId}':`, err);
  }
  return null;
}

/**
 * Lists all persisted product validation records in local cache.
 */
export function listValidationRecords(): Sentinel1ProductValidationResult[] {
  if (typeof fs === 'undefined' || typeof fs.readdirSync !== 'function') {
    return [];
  }
  const cacheDir = getSatelliteCacheDir();
  const results: Sentinel1ProductValidationResult[] = [];
  try {
    const files = fs.readdirSync(cacheDir);
    for (const file of files) {
      if (file.endsWith('.val.json')) {
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
          // Ignore corrupt validation files
        }
      }
    }
  } catch (err) {
    console.error('Failed to list validation records:', err);
  }
  return results;
}

/**
 * Scans a ZIP archive buffer or file looking for Central Directory entries safely.
 * Implements strict path traversal prevention (rejects `..`, leading slashes, drive letters).
 * Returns array of zip entry filenames and extracted manifest content if present.
 */
export interface ZipScanResult {
  isZip: boolean;
  entries: string[];
  manifestXmlContent?: string;
  hasSecurityViolation: boolean;
  violationDetail?: string;
}

export function scanZipArchive(buffer: Buffer): ZipScanResult {
  const entries: string[] = [];
  let manifestXmlContent: string | undefined = undefined;

  // Verify PK zip header signature (0x04034b50 or 0x06054b50)
  if (buffer.length < 22 || buffer.readUInt32LE(0) !== 0x04034b50) {
    return { isZip: false, entries: [], hasSecurityViolation: false };
  }

  // Find End of Central Directory Record (EOCD) starting from end of buffer
  let eocdOffset = -1;
  const maxSearch = Math.min(buffer.length - 22, 65557);
  for (let i = buffer.length - 22; i >= buffer.length - maxSearch; i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }

  if (eocdOffset === -1) {
    return { isZip: true, entries: [], hasSecurityViolation: false };
  }

  const cdEntriesCount = buffer.readUInt16LE(eocdOffset + 10);
  const cdOffset = buffer.readUInt32LE(eocdOffset + 16);

  let currentOffset = cdOffset;
  for (let i = 0; i < cdEntriesCount && currentOffset + 46 <= buffer.length; i++) {
    if (buffer.readUInt32LE(currentOffset) !== 0x02014b50) {
      break;
    }

    const flags = buffer.readUInt16LE(currentOffset + 8);
    const compMethod = buffer.readUInt16LE(currentOffset + 10);
    const uncompressedSize = buffer.readUInt32LE(currentOffset + 24);
    const fileNameLen = buffer.readUInt16LE(currentOffset + 28);
    const extraLen = buffer.readUInt16LE(currentOffset + 30);
    const commentLen = buffer.readUInt16LE(currentOffset + 32);
    const localHeaderOffset = buffer.readUInt32LE(currentOffset + 42);

    const fileNameStart = currentOffset + 46;
    const fileNameEnd = fileNameStart + fileNameLen;

    if (fileNameEnd > buffer.length) break;

    const fileName = buffer.toString('utf-8', fileNameStart, fileNameEnd);

    // SECURITY CHECK: Path Traversal Rejection
    if (
      fileName.includes('..') ||
      fileName.startsWith('/') ||
      fileName.startsWith('\\') ||
      /^[a-zA-Z]:/.test(fileName)
    ) {
      return {
        isZip: true,
        entries: [],
        hasSecurityViolation: true,
        violationDetail: `ZIP Path Traversal attempt detected in entry: '${fileName}'`,
      };
    }

    entries.push(fileName);

    // Extract manifest content if this entry is manifest.safe or manifest.xml
    const lowerName = fileName.toLowerCase();
    if (
      (lowerName.endsWith('manifest.safe') || lowerName.endsWith('manifest.xml')) &&
      !manifestXmlContent
    ) {
      try {
        if (localHeaderOffset + 30 <= buffer.length) {
          const localExtraLen = buffer.readUInt16LE(localHeaderOffset + 28);
          const dataStart = localHeaderOffset + 30 + fileNameLen + localExtraLen;

          if (compMethod === 0 && dataStart + uncompressedSize <= buffer.length) {
            // Store uncompressed content directly
            manifestXmlContent = buffer.toString('utf-8', dataStart, dataStart + uncompressedSize);
          }
        }
      } catch {
        // Fallback handled during XML scanner if direct read misses
      }
    }

    currentOffset = fileNameEnd + extraLen + commentLen;
  }

  return { isZip: true, entries, manifestXmlContent, hasSecurityViolation: false };
}

/**
 * Hardened XML parser extracting metadata from Sentinel-1 manifest.safe XML string.
 * Completely immune to XXE (External Entity Expansion) & DTD loading attacks by stripping doctype and entity declarations.
 */
export interface ParsedManifestMetadata {
  manifestValid: boolean;
  platform?: string;
  instrument?: string;
  productType?: string;
  mode?: string;
  polarization?: string[];
  processingLevel?: string;
  acquisitionStart?: string;
  acquisitionEnd?: string;
  relativeOrbit?: number;
  absoluteOrbit?: number;
  footprint?: string;
  warnings: string[];
  errors: string[];
}

export function parseManifestXml(rawXml: string): ParsedManifestMetadata {
  const warnings: string[] = [];
  const errors: string[] = [];

  if (!rawXml || typeof rawXml !== 'string' || rawXml.trim().length === 0) {
    return { manifestValid: false, warnings, errors: ['Manifest XML content is empty or unreadable.'] };
  }

  // XXE Hardening: Reject XML containing DOCTYPE or ENTITY definitions
  if (rawXml.includes('<!ENTITY') || rawXml.includes('<!DOCTYPE')) {
    return { manifestValid: false, warnings, errors: ['XML Security Violation: External Entity Expansion detected.'] };
  }

  const sanitizedXml = rawXml;

  // Extract Metadata using hardened regex pattern matching
  let platform: string | undefined = undefined;
  let instrument: string | undefined = undefined;
  let productType: string | undefined = undefined;
  let mode: string | undefined = undefined;
  const polarizationSet = new Set<string>();
  let processingLevel: string | undefined = undefined;
  let acquisitionStart: string | undefined = undefined;
  let acquisitionEnd: string | undefined = undefined;
  let relativeOrbit: number | undefined = undefined;
  let absoluteOrbit: number | undefined = undefined;
  let footprint: string | undefined = undefined;

  // Platform
  const familyMatch = sanitizedXml.match(/<(?:safe:)?familyName>(.*?)<\/(?:safe:)?familyName>/i);
  const numberMatch = sanitizedXml.match(/<(?:safe:)?number>(.*?)<\/(?:safe:)?number>/i);
  if (familyMatch && familyMatch[1]) {
    const fam = familyMatch[1].trim();
    const num = numberMatch && numberMatch[1] ? numberMatch[1].trim() : '';
    platform = num ? `${fam}-${num}` : fam;
  }

  // Instrument
  const instMatch = sanitizedXml.match(/<(?:safe:)?instrument>(?:[\s\S]*?)<(?:safe:)?familyName>(.*?)<\/(?:safe:)?familyName>/i) ||
                    sanitizedXml.match(/<instrument>(.*?)<\/instrument>/i);
  if (instMatch && instMatch[1]) {
    instrument = instMatch[1].trim().toUpperCase();
  }

  // Product Type
  const prodTypeMatch = sanitizedXml.match(/<(?:s1sarl1:|safe:)?productType>(.*?)<\/(?:s1sarl1:|safe:)?productType>/i);
  if (prodTypeMatch && prodTypeMatch[1]) {
    productType = prodTypeMatch[1].trim();
  }

  // Sensor Mode
  const modeMatch = sanitizedXml.match(/<(?:s1sarl1:|safe:)?mode>(.*?)<\/(?:s1sarl1:|safe:)?mode>/i) ||
                    sanitizedXml.match(/<(?:s1sarl1:|safe:)?operationalMode>(.*?)<\/(?:s1sarl1:|safe:)?operationalMode>/i);
  if (modeMatch && modeMatch[1]) {
    mode = modeMatch[1].trim();
  }

  // Polarizations (e.g. HH, HV, VV, VH)
  const polMatches = sanitizedXml.matchAll(/<(?:s1sarl1:|safe:)?transmitterReceiverPolarisation>(.*?)<\/(?:s1sarl1:|safe:)?transmitterReceiverPolarisation>/gi);
  for (const m of polMatches) {
    if (m[1]) polarizationSet.add(m[1].trim().toUpperCase());
  }

  // Acquisition Start / Stop
  const startMatch = sanitizedXml.match(/<(?:safe:)?startTime>(.*?)<\/(?:safe:)?startTime>/i) ||
                     sanitizedXml.match(/<(?:gml:)?beginPosition>(.*?)<\/(?:gml:)?beginPosition>/i);
  if (startMatch && startMatch[1]) {
    acquisitionStart = startMatch[1].trim();
  }

  const stopMatch = sanitizedXml.match(/<(?:safe:)?stopTime>(.*?)<\/(?:safe:)?stopTime>/i) ||
                    sanitizedXml.match(/<(?:gml:)?endPosition>(.*?)<\/(?:gml:)?endPosition>/i);
  if (stopMatch && stopMatch[1]) {
    acquisitionEnd = stopMatch[1].trim();
  }

  // Relative / Absolute Orbit
  const relOrbitMatch = sanitizedXml.match(/<(?:safe:)?relativeOrbitNumber[^>]*>(.*?)<\/(?:safe:)?relativeOrbitNumber>/i);
  if (relOrbitMatch && relOrbitMatch[1]) {
    const val = parseInt(relOrbitMatch[1].trim());
    if (!isNaN(val)) relativeOrbit = val;
  }

  const absOrbitMatch = sanitizedXml.match(/<(?:safe:)?orbitNumber[^>]*>(.*?)<\/(?:safe:)?orbitNumber>/i);
  if (absOrbitMatch && absOrbitMatch[1]) {
    const val = parseInt(absOrbitMatch[1].trim());
    if (!isNaN(val)) absoluteOrbit = val;
  }

  // Processing Level
  const levelMatch = sanitizedXml.match(/<(?:safe:)?processing>(?:[\s\S]*?)<(?:safe:)?name>(.*?)<\/(?:safe:)?name>/i);
  if (levelMatch && levelMatch[1]) {
    processingLevel = levelMatch[1].trim();
  } else if (productType) {
    processingLevel = productType.includes('GRD') || productType.includes('SLC') ? 'Level-1' : 'Level-2';
  }

  // Footprint / Coordinates
  const coordMatch = sanitizedXml.match(/<(?:gml:)?coordinates>(.*?)<\/(?:gml:)?coordinates>/i) ||
                     sanitizedXml.match(/<(?:gml:)?posList>(.*?)<\/(?:gml:)?posList>/i);
  if (coordMatch && coordMatch[1]) {
    footprint = coordMatch[1].trim();
  }

  // Validate critical fields presence
  const polarization = polarizationSet.size > 0 ? Array.from(polarizationSet) : undefined;
  const manifestValid = Boolean(platform || productType || acquisitionStart || mode);

  if (!manifestValid) {
    warnings.push('Manifest XML parsed, but standard Sentinel-1 tags were missing or unrecognized.');
  }

  return {
    manifestValid,
    platform,
    instrument,
    productType,
    mode,
    polarization,
    processingLevel,
    acquisitionStart,
    acquisitionEnd,
    relativeOrbit,
    absoluteOrbit,
    footprint,
    warnings,
    errors,
  };
}

/**
 * Main Validation Entry Point: Validates a cached Sentinel-1 product ID.
 */
export async function validateSentinel1Product(productId: string): Promise<Sentinel1ProductValidationResult> {
  const validatedAt = new Date().toISOString();
  const warnings: string[] = [];
  const errors: string[] = [];

  // Default initial provenance
  const provenance: DataProvenance = {
    source: 'Copernicus Data Space Ecosystem (CDSE)',
    provider: 'European Space Agency (ESA) / CDSE SAFE Ingestion',
    datasetId: 'SENTINEL-1',
    granuleId: productId,
    observationTime: new Date().toISOString(),
    ingestionTime: validatedAt,
    validTime: new Date().toISOString(),
    forecastHorizonHours: 0,
    freshnessState: 'FRESH',
    category: 'OBSERVED',
    isSynthetic: false,
  };

  // 1. Verify cached acquisition record exists
  const acqRecord = getAcquisitionRecord(productId);
  if (!acqRecord) {
    errors.push(`No cached acquisition record found for product ID '${productId}'.`);
    const result: Sentinel1ProductValidationResult = {
      productId,
      validationStatus: 'VALIDATION_FAILED',
      containerFormat: 'UNKNOWN',
      archiveValid: false,
      manifestFound: false,
      manifestValid: false,
      productStructureStatus: 'INVALID',
      metadataStatus: 'NOT_PRESENT',
      discoveredPaths: {
        measurementPresent: false,
        annotationPresent: false,
        previewPresent: false,
        supportPresent: false,
        entryCount: 0,
      },
      warnings,
      errors,
      provenance,
      validatedAt,
    };
    saveValidationRecord(result);
    return result;
  }

  // Update provenance observation time from acquisition record
  provenance.observationTime = acqRecord.acquisitionTime || provenance.observationTime;

  // 2. Verify binary product file exists on disk
  const binaryFilePath = getProductFilePath(productId, acqRecord.assetId || 'PRODUCT');
  if (!fs.existsSync(binaryFilePath)) {
    errors.push(`Binary product payload file missing from disk cache: '${binaryFilePath}'.`);
    const result: Sentinel1ProductValidationResult = {
      productId,
      validationStatus: 'VALIDATION_FAILED',
      containerFormat: 'UNKNOWN',
      archiveValid: false,
      manifestFound: false,
      manifestValid: false,
      productStructureStatus: 'INVALID',
      metadataStatus: 'NOT_PRESENT',
      discoveredPaths: {
        measurementPresent: false,
        annotationPresent: false,
        previewPresent: false,
        supportPresent: false,
        entryCount: 0,
      },
      warnings,
      errors,
      provenance,
      validatedAt,
    };
    saveValidationRecord(result);
    return result;
  }

  // Read binary file content for container inspection
  const buffer = fs.readFileSync(binaryFilePath);

  // 3. Container Structure Inspection
  const zipScan = scanZipArchive(buffer);

  if (zipScan.hasSecurityViolation) {
    errors.push(zipScan.violationDetail || 'ZIP Security Violation detected.');
    const result: Sentinel1ProductValidationResult = {
      productId,
      validationStatus: 'VALIDATION_FAILED',
      containerFormat: 'SAFE ZIP',
      archiveValid: false,
      manifestFound: false,
      manifestValid: false,
      productStructureStatus: 'INVALID',
      metadataStatus: 'NOT_PRESENT',
      discoveredPaths: {
        measurementPresent: false,
        annotationPresent: false,
        previewPresent: false,
        supportPresent: false,
        entryCount: 0,
      },
      warnings,
      errors,
      provenance,
      validatedAt,
    };
    saveValidationRecord(result);
    return result;
  }

  let containerFormat: Sentinel1ContainerFormat = 'UNKNOWN';
  let archiveValid = false;
  let manifestFound = false;
  let manifestXml: string | undefined = zipScan.manifestXmlContent;
  let manifestPath: string | undefined = undefined;

  let measurementPresent = false;
  let annotationPresent = false;
  let previewPresent = false;
  let supportPresent = false;
  let entryCount = 0;

  if (zipScan.isZip) {
    containerFormat = 'SAFE ZIP';
    archiveValid = zipScan.entries.length > 0;
    entryCount = zipScan.entries.length;

    for (const entry of zipScan.entries) {
      const lower = entry.toLowerCase();
      if (lower.includes('measurement/')) measurementPresent = true;
      if (lower.includes('annotation/')) annotationPresent = true;
      if (lower.includes('preview/')) previewPresent = true;
      if (lower.includes('support/')) supportPresent = true;
      if (lower.endsWith('manifest.safe') || lower.endsWith('manifest.xml')) {
        manifestFound = true;
        manifestPath = entry;
      }
    }
  } else {
    // If not a standard zip, check if buffer contains readable XML manifest directly
    const textSnippet = buffer.toString('utf-8', 0, Math.min(buffer.length, 2048));
    if (textSnippet.includes('<safe:gml') || textSnippet.includes('<xfdu:XFDU') || textSnippet.includes('<gml:')) {
      containerFormat = 'SAFE DIRECTORY';
      archiveValid = true;
      manifestFound = true;
      manifestXml = buffer.toString('utf-8');
      manifestPath = 'manifest.safe';
    } else {
      containerFormat = 'UNRECOGNIZED_CONTAINER';
      archiveValid = true; // Transport file exists
      warnings.push('Downloaded payload is not a standard SAFE ZIP archive or XML container.');
    }
  }

  // 4. Manifest XML Parsing
  let parsedMeta: ParsedManifestMetadata = {
    manifestValid: false,
    warnings: [],
    errors: [],
  };

  if (manifestXml) {
    parsedMeta = parseManifestXml(manifestXml);
  } else if (manifestFound) {
    warnings.push('manifest.safe entry discovered in archive, but raw content was unreadable directly from central directory.');
  }

  // Combine warnings and errors
  warnings.push(...parsedMeta.warnings);
  errors.push(...parsedMeta.errors);

  // Determine Product Structure & Validation Status
  let productStructureStatus: 'VALID' | 'PARTIAL' | 'INVALID' | 'UNCHECKED' = 'INVALID';
  if (archiveValid && (manifestFound || measurementPresent || annotationPresent)) {
    productStructureStatus = 'VALID';
  } else if (archiveValid) {
    productStructureStatus = 'PARTIAL';
  }

  let metadataStatus: 'PARSED' | 'PARTIAL' | 'FAILED' | 'NOT_PRESENT' = 'NOT_PRESENT';
  if (parsedMeta.manifestValid) {
    metadataStatus = 'PARSED';
  } else if (manifestXml) {
    metadataStatus = 'FAILED';
  }

  let validationStatus: Sentinel1ValidationStatus = 'VALIDATION_FAILED';
  if (productStructureStatus === 'VALID' && metadataStatus === 'PARSED') {
    validationStatus = 'READY_FOR_SAR_PROCESSING';
  } else if (productStructureStatus === 'VALID') {
    validationStatus = 'STRUCTURE_VALID';
  } else if (metadataStatus === 'PARSED') {
    validationStatus = 'METADATA_PARSED';
  }

  const result: Sentinel1ProductValidationResult = {
    productId,
    validationStatus,
    containerFormat,
    archiveValid,
    manifestFound,
    manifestValid: parsedMeta.manifestValid,
    productStructureStatus,
    metadataStatus,
    platform: parsedMeta.platform || acqRecord.provenance.datasetId || 'Sentinel-1',
    instrument: parsedMeta.instrument || 'SAR',
    productType: parsedMeta.productType || 'GRD',
    mode: parsedMeta.mode || 'IW',
    polarization: parsedMeta.polarization || ['HH', 'HV'],
    processingLevel: parsedMeta.processingLevel || 'Level-1',
    acquisitionStart: parsedMeta.acquisitionStart || acqRecord.acquisitionTime,
    acquisitionEnd: parsedMeta.acquisitionEnd || acqRecord.acquisitionTime,
    relativeOrbit: parsedMeta.relativeOrbit,
    absoluteOrbit: parsedMeta.absoluteOrbit,
    footprint: parsedMeta.footprint,
    discoveredPaths: {
      manifestPath,
      measurementPresent,
      annotationPresent,
      previewPresent,
      supportPresent,
      entryCount,
    },
    warnings,
    errors,
    provenance,
    validatedAt,
  };

  saveValidationRecord(result);
  return result;
}
