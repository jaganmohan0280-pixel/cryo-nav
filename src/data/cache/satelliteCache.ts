/**
 * CRYO NAV — Satellite Product Local Cache Manager
 * Phase 7B — Satellite Product Acquisition & Local Caching Audit
 *
 * Provides safe filesystem operations, filename sanitization,
 * metadata persistence, missing file detection, and cache discovery.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { SatelliteAcquisitionRecord } from '../../types';

// Default cache location outside React source tree
const DEFAULT_CACHE_DIR = (typeof process !== 'undefined' && process.env && process.env.SATELLITE_CACHE_DIR)
  ? process.env.SATELLITE_CACHE_DIR
  : (typeof process !== 'undefined' && typeof process.cwd === 'function' && typeof path !== 'undefined' && typeof path.join === 'function')
    ? path.join(process.cwd(), 'cache', 'satellite')
    : './cache/satellite';

/**
 * Sanitizes input string to prevent path traversal (`../`, `\`), control characters, and invalid filename characters.
 */
export function sanitizeFilename(name: string): string {
  if (!name || typeof name !== 'string') {
    return `product_${Date.now()}`;
  }
  // Replace path separators, double dots, and special characters with underscores
  const clean = name
    .replace(/\.\./g, '_')
    .replace(/[\/\\:\*\?"<>\|]/g, '_')
    .replace(/[\x00-\x1F\x7F]/g, '')
    .trim();

  // Enforce max length and safe character set
  const sanitized = clean.replace(/[^a-zA-Z0-9_\-\.]/g, '_').substring(0, 180);
  return sanitized || `product_${Date.now()}`;
}

/**
 * Returns absolute path to configured satellite cache directory, creating it if necessary.
 */
export function getSatelliteCacheDir(): string {
  const cacheDir = DEFAULT_CACHE_DIR;
  if (typeof fs !== 'undefined' && typeof fs.existsSync === 'function' && !fs.existsSync(cacheDir)) {
    try {
      fs.mkdirSync(cacheDir, { recursive: true });
    } catch {
      // Ignore in browser or restricted environment
    }
  }
  return cacheDir;
}

/**
 * Validates that a requested file path resolves strictly inside the satellite cache directory.
 * Throws an error if path traversal or directory breakout is detected.
 */
export function assertPathInCache(targetPath: string): string {
  if (typeof path === 'undefined' || typeof path.resolve !== 'function') {
    return targetPath;
  }
  const cacheDir = path.resolve(getSatelliteCacheDir());
  const resolvedTarget = path.resolve(targetPath);

  if (!resolvedTarget.startsWith(cacheDir)) {
    throw new Error(`Security Violation: Target path '${targetPath}' resolves outside cache directory '${cacheDir}'.`);
  }
  return resolvedTarget;
}

/**
 * Returns metadata file path for a given product ID.
 */
export function getMetadataPath(productId: string): string {
  const safeId = sanitizeFilename(productId);
  const targetPath = (typeof path !== 'undefined' && typeof path.join === 'function')
    ? path.join(getSatelliteCacheDir(), `${safeId}.meta.json`)
    : `./cache/satellite/${safeId}.meta.json`;
  return assertPathInCache(targetPath);
}

/**
 * Returns binary product file path for a given product ID and asset ID.
 */
export function getProductFilePath(productId: string, assetId: string = 'PRODUCT'): string {
  const safeId = sanitizeFilename(productId);
  const safeAsset = sanitizeFilename(assetId);
  const targetPath = (typeof path !== 'undefined' && typeof path.join === 'function')
    ? path.join(getSatelliteCacheDir(), `${safeId}_${safeAsset}.bin`)
    : `./cache/satellite/${safeId}_${safeAsset}.bin`;
  return assertPathInCache(targetPath);
}

/**
 * Returns temporary atomic download file path (`.part`) for a given product ID and asset ID.
 */
export function getPartProductFilePath(productId: string, assetId: string = 'PRODUCT'): string {
  const finalPath = getProductFilePath(productId, assetId);
  return `${finalPath}.part`;
}

/**
 * Persists satellite acquisition record metadata JSON to the local cache.
 */
export function saveAcquisitionRecord(record: SatelliteAcquisitionRecord): string {
  const metaPath = getMetadataPath(record.productId);
  if (typeof fs !== 'undefined' && typeof fs.writeFileSync === 'function') {
    fs.writeFileSync(metaPath, JSON.stringify(record, null, 2), 'utf-8');
  }
  return metaPath;
}

/**
 * Retrieves cached acquisition record by product ID if present in local cache.
 * Verifies that referenced binary product files actually exist on disk.
 */
export function getAcquisitionRecord(productId: string): SatelliteAcquisitionRecord | null {
  if (typeof fs === 'undefined' || typeof fs.existsSync !== 'function') {
    return null;
  }
  try {
    const metaPath = getMetadataPath(productId);
    if (fs.existsSync(metaPath)) {
      const data = fs.readFileSync(metaPath, 'utf-8');
      const record = JSON.parse(data) as SatelliteAcquisitionRecord;
      if (record && record.productId) {
        // Detect missing binary payload for completed/cached records
        if ((record.status === 'VERIFIED' || record.status === 'CACHED' || record.status === 'DOWNLOADED') && record.localCacheReference) {
          if (!fs.existsSync(record.localCacheReference)) {
            record.status = 'UNAVAILABLE';
            record.error = 'Cache metadata exists, but binary product file is missing from local disk cache.';
          }
        }
        return record;
      }
    }
  } catch (err) {
    console.error(`Failed to read cache metadata for product '${productId}':`, err);
  }
  return null;
}

/**
 * Lists all cached satellite acquisition records present in the cache directory.
 * Safely handles corrupt metadata files and verifies underlying file existence.
 */
export function listAcquisitionRecords(): SatelliteAcquisitionRecord[] {
  if (typeof fs === 'undefined' || typeof fs.readdirSync !== 'function') {
    return [];
  }
  const cacheDir = getSatelliteCacheDir();
  const records: SatelliteAcquisitionRecord[] = [];

  try {
    const files = fs.readdirSync(cacheDir);
    for (const file of files) {
      if (file.endsWith('.meta.json')) {
        try {
          const fullPath = (typeof path !== 'undefined' && typeof path.join === 'function')
            ? path.join(cacheDir, file)
            : `${cacheDir}/${file}`;
          const raw = fs.readFileSync(fullPath, 'utf-8');
          const parsed = JSON.parse(raw);
          if (parsed && parsed.productId) {
            if ((parsed.status === 'VERIFIED' || parsed.status === 'CACHED' || parsed.status === 'DOWNLOADED') && parsed.localCacheReference) {
              if (!fs.existsSync(parsed.localCacheReference)) {
                parsed.status = 'UNAVAILABLE';
                parsed.error = 'Binary product file missing from local cache directory.';
              }
            }
            records.push(parsed);
          }
        } catch {
          // Ignore invalid JSON files in cache
        }
      }
    }
  } catch (err) {
    console.error('Failed to list satellite acquisition cache records:', err);
  }

  return records;
}

/**
 * Calculates SHA-256 hash of a local file.
 */
export async function calculateFileSha256(filePath: string): Promise<string> {
  if (typeof fs === 'undefined' || typeof fs.createReadStream !== 'function' || typeof crypto === 'undefined' || typeof crypto.createHash !== 'function') {
    return 'HASH_UNAVAILABLE_BROWSER';
  }
  assertPathInCache(filePath);
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', (err) => reject(err));
  });
}
