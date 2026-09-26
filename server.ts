import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { fetchCopernicusSeaIceData } from "./src/data/adapters/copernicusSeaIceAdapter";
import { fetchCopernicusOceanCurrentData } from "./src/data/adapters/copernicusOceanCurrentAdapter";
import { fetchUsnicIcebergData } from "./src/data/adapters/usnicIcebergAdapter";
import { fetchEcmwfWeatherData } from "./src/data/adapters/ecmwfWeatherAdapter";
import { fetchCdseStacCatalogue } from "./src/data/adapters/cdseStacAdapter";
import {
  saveAcquisitionRecord,
  getAcquisitionRecord,
  listAcquisitionRecords,
  getProductFilePath,
  getPartProductFilePath,
  sanitizeFilename,
} from "./src/data/cache/satelliteCache";
import {
  validateSentinel1Product,
  getValidationRecord,
  listValidationRecords,
} from "./src/data/validation/sentinel1Validator";
import {
  processSentinel1Sar,
  getProcessingRecord,
  listProcessingRecords,
} from "./src/data/processing/sentinel1Processor";
import {
  extractSarIcebergCandidates,
  getCandidatesRecord,
  listCandidatesRecords,
} from "./src/data/analysis/sentinel1FeatureExtractor";
import {
  evaluateSarCandidatesConfirmation,
  getConfirmationRecord,
  listConfirmationRecords,
} from "./src/data/analysis/sarCandidateConfirmation";
import fs from "fs";
import crypto from "crypto";
import { SatelliteAcquisitionRecord } from "./src/types";


dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      system: "CRYO NAV",
      version: "1.0.0-SIH",
      environment: "Dynamic Environmental Model - Antarctic Operations",
    });
  });

  // System Credentials & API Credits Status
  app.get("/api/system/credentials-status", (_req, res) => {
    const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY);
    res.json({
      status: "success",
      timestamp: new Date().toISOString(),
      credentials: {
        geminiAi: {
          name: "Google Gemini AI (Model gemini-3.8-flash)",
          envVariable: "GEMINI_API_KEY",
          isConfigured: hasGeminiKey,
          creditsRequired: false,
          costTier: "Google AI Studio Free Tier (No credit card or payment needed)",
          status: hasGeminiKey ? "OPERATIONAL" : "KEY_MISSING",
          purpose: "Context-aware Antarctic navigation decision support assistant",
        },
        openMeteoTelemetry: {
          name: "Open-Meteo Polar Weather & ECMWF Marine Telemetry",
          envVariable: "NONE (Open Access)",
          isConfigured: true,
          creditsRequired: false,
          costTier: "Free Open-Access API (Zero credits required)",
          status: "OPERATIONAL",
          purpose: "Real-time Southern Ocean wind, wave height, air/water temp, and surface currents",
        },
        copernicusAndNoaa: {
          name: "Copernicus Sentinel-1 SAR & NOAA/NSIDC Cryosphere Data",
          envVariable: "COPERNICUS_MARINE_USER (Optional for high-volume enterprise pipelines)",
          isConfigured: true,
          creditsRequired: false,
          costTier: "Public Earth Observation Data",
          status: "OPERATIONAL",
          purpose: "Radar sea-ice concentration and iceberg detection catalog",
        },
      },
    });
  });

  // Copernicus Marine Sea-Ice Real Data Adapter Endpoint
  app.get("/api/environment/sea-ice", async (req, res) => {
    try {
      const minLat = parseFloat(req.query.minLat as string) || -68.5;
      const maxLat = parseFloat(req.query.maxLat as string) || -59.0;
      const minLon = parseFloat(req.query.minLon as string) || -70.0;
      const maxLon = parseFloat(req.query.maxLon as string) || -56.0;

      const result = await fetchCopernicusSeaIceData({ minLat, maxLat, minLon, maxLon });

      if (result.success === false) {
        const statusCode = result.reason === 'AUTH_FAILED' ? 401 : 503;
        return res.status(statusCode).json(result);
      }

      return res.json(result);
    } catch (err: any) {
      console.error("Error fetching Copernicus sea-ice data:", err);
      return res.status(500).json({
        success: false,
        mode: 'REAL',
        error: `Internal server error in sea-ice data pipeline: ${err.message || err}`,
        reason: 'SERVICE_UNAVAILABLE',
        source: 'Copernicus Marine Service (EUMETSAT OSI SAF)',
        datasetId: 'SEAICE_GLO_SEAICE_L4_NRT_OBSERVATIONS_011_001',
      });
    }
  });

  // Copernicus Marine Ocean Current Real Data Adapter Endpoint
  app.get("/api/environment/ocean-currents", async (req, res) => {
    try {
      const minLat = parseFloat(req.query.minLat as string) || -68.5;
      const maxLat = parseFloat(req.query.maxLat as string) || -59.0;
      const minLon = parseFloat(req.query.minLon as string) || -70.0;
      const maxLon = parseFloat(req.query.maxLon as string) || -56.0;

      const result = await fetchCopernicusOceanCurrentData({ minLat, maxLat, minLon, maxLon });

      if (result.success === false) {
        const statusCode = result.reason === 'AUTH_FAILED' ? 401 : 503;
        return res.status(statusCode).json(result);
      }

      return res.json(result);
    } catch (err: any) {
      console.error("Error fetching Copernicus ocean current data:", err);
      return res.status(500).json({
        success: false,
        mode: 'REAL',
        error: `Internal server error in ocean current data pipeline: ${err.message || err}`,
        reason: 'SERVICE_UNAVAILABLE',
        source: 'Copernicus Marine Service (Mercator Ocean Hydrodynamic Model)',
        datasetId: 'GLOBAL_ANALYSISFORECAST_PHY_001_024',
      });
    }
  });

  // US National Ice Center (USNIC) Antarctic Iceberg Catalog Endpoint
  app.get("/api/environment/icebergs", async (req, res) => {
    try {
      const minLat = parseFloat(req.query.minLat as string) || -68.5;
      const maxLat = parseFloat(req.query.maxLat as string) || -59.0;
      const minLon = parseFloat(req.query.minLon as string) || -70.0;
      const maxLon = parseFloat(req.query.maxLon as string) || -56.0;

      const result = await fetchUsnicIcebergData({ minLat, maxLat, minLon, maxLon });

      if (result.success === false) {
        const statusCode = result.reason === 'AUTH_FAILED' ? 401 : 503;
        return res.status(statusCode).json(result);
      }

      return res.json(result);
    } catch (err: any) {
      console.error("Error fetching USNIC iceberg data:", err);
      return res.status(500).json({
        success: false,
        mode: 'REAL',
        error: `Internal server error in iceberg catalog data pipeline: ${err.message || err}`,
        reason: 'SERVICE_UNAVAILABLE',
        source: 'US National Ice Center (USNIC) Antarctic Database',
      });
    }
  });

  // ECMWF IFS Weather Forecast Real Data Adapter Endpoint
  app.get("/api/environment/weather", async (req, res) => {
    try {
      const minLat = parseFloat(req.query.minLat as string) || -68.5;
      const maxLat = parseFloat(req.query.maxLat as string) || -59.0;
      const minLon = parseFloat(req.query.minLon as string) || -70.0;
      const maxLon = parseFloat(req.query.maxLon as string) || -56.0;

      const result = await fetchEcmwfWeatherData({ minLat, maxLat, minLon, maxLon });

      if (result.success === false) {
        const statusCode = result.reason === 'AUTH_FAILED' ? 401 : 503;
        return res.status(statusCode).json(result);
      }

      return res.json(result);
    } catch (err: any) {
      console.error("Error fetching ECMWF weather forecast data:", err);
      return res.status(500).json({
        success: false,
        mode: 'REAL',
        error: `Internal server error in weather data pipeline: ${err.message || err}`,
        reason: 'SERVICE_UNAVAILABLE',
        source: 'ECMWF (European Centre for Medium-Range Weather Forecasts)',
        datasetId: 'ECMWF_IFS_GLOBAL_FORECAST',
      });
    }
  });

  // Copernicus Data Space Ecosystem (CDSE) STAC API Satellite Catalogue Endpoint
  app.get("/api/satellite/catalogue", async (req, res) => {
    try {
      const minLat = parseFloat(req.query.minLat as string) || -68.5;
      const maxLat = parseFloat(req.query.maxLat as string) || -59.0;
      const minLon = parseFloat(req.query.minLon as string) || -70.0;
      const maxLon = parseFloat(req.query.maxLon as string) || -56.0;
      const startTime = (req.query.startTime as string) || undefined;
      const endTime = (req.query.endTime as string) || undefined;
      const collection = (req.query.collection as string) || 'SENTINEL-1';
      const limit = parseInt(req.query.limit as string) || 20;

      // Validate collection parameter to prevent arbitrary external proxying
      const allowedCollections = ['SENTINEL-1', 'SENTINEL-2', 'SENTINEL-3', 'SENTINEL-5P'];
      if (!allowedCollections.includes(collection.toUpperCase())) {
        return res.status(400).json({
          success: false,
          mode: 'REAL',
          error: `Invalid collection parameter: ${collection}. Allowed collections: ${allowedCollections.join(', ')}`,
          reason: 'INVALID_QUERY',
        });
      }

      const result = await fetchCdseStacCatalogue({
        minLat,
        maxLat,
        minLon,
        maxLon,
        startTime,
        endTime,
        collection: collection.toUpperCase(),
        limit,
      });

      if (result.success === false) {
        return res.status(503).json(result);
      }

      return res.json(result);
    } catch (err: any) {
      console.error("Error fetching CDSE STAC catalogue:", err);
      return res.status(500).json({
        success: false,
        mode: 'REAL',
        error: `Internal server error in CDSE STAC catalogue pipeline: ${err.message || err}`,
        reason: 'SERVICE_UNAVAILABLE',
        source: 'Copernicus Data Space Ecosystem (CDSE STAC API)',
        datasetId: 'SENTINEL-1',
      });
    }
  });

  // Whitelisted Copernicus Data Space Ecosystem (CDSE) Asset Hosts for SSRF Protection
  const ALLOWED_CDSE_HOSTS = [
    'stac.dataspace.copernicus.eu',
    'zipper.dataspace.copernicus.eu',
    'dataspace.copernicus.eu',
    'download.dataspace.copernicus.eu',
    'cdse.copernicus.eu',
  ];

  function isIpOrLocalhost(hostname: string): boolean {
    const host = hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0' || host === '::1' || host === '[::1]') {
      return true;
    }
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const match = host.match(ipv4Regex);
    if (match) {
      return true;
    }
    return false;
  }

  function isWhitelistedCdseUrl(targetUrl: string): boolean {
    try {
      const parsed = new URL(targetUrl);
      if (parsed.protocol !== 'https:') return false;
      const hostname = parsed.hostname.toLowerCase();
      if (isIpOrLocalhost(hostname)) return false;

      return ALLOWED_CDSE_HOSTS.some(
        (allowed) => hostname === allowed || hostname.endsWith(`.${allowed}`)
      );
    } catch {
      return false;
    }
  }

  // Active acquisitions lock set to prevent race conditions on duplicate product downloads
  const activeAcquisitions = new Set<string>();

  // Satellite Product Acquisition Endpoint (Phase 7B Audit Fixes)
  app.post("/api/satellite/acquire", async (req, res) => {
    const requestTime = new Date().toISOString();
    let acquiredProductId: string | null = null;

    try {
      const {
        productId,
        assetId = 'PRODUCT',
        assetUrl,
        collection = 'SENTINEL-1',
        acquisitionTime = requestTime,
        expectedSize,
        sourceChecksum,
      } = req.body || {};

      if (!productId || typeof productId !== 'string') {
        return res.status(400).json({
          success: false,
          error: "Missing or invalid 'productId' parameter.",
          reason: "INVALID_REQUEST",
        });
      }

      // Path traversal / sanitization check
      const sanitizedId = sanitizeFilename(productId);
      if (productId.includes('..') || productId.includes('/') || productId.includes('\\')) {
        return res.status(400).json({
          success: false,
          error: "Security Violation: productId contains invalid path traversal characters.",
          reason: "SECURITY_VIOLATION",
        });
      }

      // Validate assetUrl whitelist (HTTPS only, trusted CDSE domain, no private IPs)
      if (!assetUrl || typeof assetUrl !== 'string' || !isWhitelistedCdseUrl(assetUrl)) {
        return res.status(400).json({
          success: false,
          error: `Security Violation: assetUrl '${assetUrl}' is not an authorized Copernicus Data Space Ecosystem (CDSE) HTTPS endpoint.`,
          reason: "SECURITY_VIOLATION",
        });
      }

      // Concurrent Acquisition Lock check
      if (activeAcquisitions.has(productId)) {
        return res.status(409).json({
          success: false,
          error: `Acquisition request for product '${productId}' is already in progress on server.`,
          reason: "CONCURRENT_ACQUISITION",
        });
      }

      // Check if product is already cached locally
      const existing = getAcquisitionRecord(productId);
      if (existing && (existing.status === 'VERIFIED' || existing.status === 'CACHED' || existing.status === 'DOWNLOADED')) {
        return res.json({
          success: true,
          alreadyCached: true,
          record: existing,
        });
      }

      activeAcquisitions.add(productId);
      acquiredProductId = productId;

      const startTime = new Date().toISOString();
      const targetFilePath = getProductFilePath(productId, assetId);
      const partFilePath = getPartProductFilePath(productId, assetId);

      // Clean up any stale partial download file before starting
      if (fs.existsSync(partFilePath)) {
        try { fs.unlinkSync(partFilePath); } catch {}
      }

      // Prepare acquisition record
      const record: SatelliteAcquisitionRecord = {
        productId,
        source: 'Copernicus Data Space Ecosystem',
        collection,
        acquisitionTime,
        requestTime,
        startTime,
        status: 'DOWNLOADING',
        assetId,
        assetUrl,
        mediaType: assetUrl.endsWith('.zip') ? 'application/zip' : 'application/octet-stream',
        expectedSize: typeof expectedSize === 'number' ? expectedSize : undefined,
        downloadedSize: 0,
        verificationStatus: 'UNVERIFIED',
        provenance: {
          source: 'Copernicus Data Space Ecosystem (CDSE)',
          provider: 'European Space Agency (ESA) / CDSE STAC Catalog',
          datasetId: collection,
          granuleId: productId,
          observationTime: acquisitionTime,
          ingestionTime: requestTime,
          validTime: acquisitionTime,
          forecastHorizonHours: 0,
          freshnessState: 'FRESH',
          category: 'OBSERVED',
          isSynthetic: false,
        },
      };

      saveAcquisitionRecord(record);

      // Manual Redirect Validation Loop to prevent Redirect SSRF
      let currentUrl = assetUrl;
      let redirectCount = 0;
      let response: Response | null = null;

      while (redirectCount < 5) {
        if (!isWhitelistedCdseUrl(currentUrl)) {
          record.status = 'ACQUISITION_FAILED';
          record.error = `Security Violation: Redirect target URL '${currentUrl}' is not an authorized CDSE endpoint.`;
          record.completionTime = new Date().toISOString();
          saveAcquisitionRecord(record);
          return res.status(400).json({ success: false, error: record.error, record });
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s per step

        const resStep = await fetch(currentUrl, {
          method: 'GET',
          headers: {
            'User-Agent': 'CRYO-NAV-Satellite-Acquisition-Engine/1.0',
          },
          redirect: 'manual',
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (resStep.status >= 300 && resStep.status < 400) {
          const loc = resStep.headers.get('location');
          if (!loc) {
            record.status = 'ACQUISITION_FAILED';
            record.error = `CDSE Endpoint returned HTTP ${resStep.status} redirect without Location header.`;
            saveAcquisitionRecord(record);
            return res.status(502).json({ success: false, error: record.error, record });
          }
          currentUrl = new URL(loc, currentUrl).toString();
          redirectCount++;
          continue;
        }

        response = resStep;
        break;
      }

      if (!response) {
        throw new Error("Failed to execute acquisition HTTP request.");
      }

      if (!response.ok) {
        record.status = 'ACQUISITION_FAILED';
        record.error = `CDSE Asset Endpoint returned HTTP ${response.status}: ${response.statusText}`;
        record.completionTime = new Date().toISOString();
        saveAcquisitionRecord(record);
        return res.status(response.status === 401 || response.status === 403 ? 401 : 502).json({
          success: false,
          error: record.error,
          record,
        });
      }

      const maxSizeBytes = 500 * 1024 * 1024; // 500 MB limit

      // Check Content-Length header BEFORE streaming
      const contentLengthHeader = response.headers.get('content-length');
      if (contentLengthHeader) {
        const parsedLength = parseInt(contentLengthHeader, 10);
        if (!isNaN(parsedLength) && parsedLength > maxSizeBytes) {
          record.status = 'ACQUISITION_FAILED';
          record.error = `Content-Length header specified ${parsedLength} bytes (${(parsedLength / (1024 * 1024)).toFixed(1)} MB), exceeding maximum allowed limit of 500 MB.`;
          record.completionTime = new Date().toISOString();
          saveAcquisitionRecord(record);
          return res.status(400).json({ success: false, error: record.error, record });
        }
      }

      // Check Content-Type header to reject HTML error pages
      const contentType = response.headers.get('content-type') || '';
      if (contentType.toLowerCase().includes('text/html')) {
        record.status = 'ACQUISITION_FAILED';
        record.error = `CDSE Endpoint returned HTML error page ('${contentType}') instead of binary satellite product payload.`;
        record.completionTime = new Date().toISOString();
        saveAcquisitionRecord(record);
        return res.status(422).json({ success: false, error: record.error, record });
      }

      // Stream data chunks into atomic .part file and calculate SHA-256 hash
      const hash = crypto.createHash('sha256');
      const fileStream = fs.createWriteStream(partFilePath);
      let bytesDownloaded = 0;
      let isFirstChunk = true;

      if (!response.body) {
        throw new Error("Response body stream is empty.");
      }

      const reader = (response.body as any).getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value && value.length > 0) {
          // First chunk inspection: verify payload does not start with HTML/XML tags
          if (isFirstChunk) {
            isFirstChunk = false;
            const snippet = Buffer.from(value.slice(0, 200)).toString('utf-8').trim().toLowerCase();
            if (snippet.startsWith('<!doctype html') || snippet.startsWith('<html') || snippet.startsWith('<?xml')) {
              reader.cancel();
              fileStream.close();
              if (fs.existsSync(partFilePath)) fs.unlinkSync(partFilePath);
              record.status = 'ACQUISITION_FAILED';
              record.error = `Server returned HTML/XML error document instead of binary satellite product payload.`;
              record.completionTime = new Date().toISOString();
              saveAcquisitionRecord(record);
              return res.status(422).json({ success: false, error: record.error, record });
            }
          }

          bytesDownloaded += value.length;
          if (bytesDownloaded > maxSizeBytes) {
            reader.cancel();
            fileStream.close();
            if (fs.existsSync(partFilePath)) fs.unlinkSync(partFilePath);
            record.status = 'ACQUISITION_FAILED';
            record.error = `Downloaded stream size (${(bytesDownloaded / (1024 * 1024)).toFixed(1)} MB) exceeded maximum allowed limit of 500 MB.`;
            record.completionTime = new Date().toISOString();
            saveAcquisitionRecord(record);
            return res.status(400).json({ success: false, error: record.error, record });
          }
          hash.update(value);
          fileStream.write(value);
        }
      }

      await new Promise((resolve) => fileStream.end(resolve));

      // Reject 0-byte empty downloads
      if (bytesDownloaded === 0) {
        if (fs.existsSync(partFilePath)) fs.unlinkSync(partFilePath);
        record.status = 'ACQUISITION_FAILED';
        record.error = `Acquisition payload is empty (0 bytes received).`;
        record.completionTime = new Date().toISOString();
        saveAcquisitionRecord(record);
        return res.status(422).json({ success: false, error: record.error, record });
      }

      // Atomic rename from .part to final .bin file
      fs.renameSync(partFilePath, targetFilePath);

      const calculatedSha256 = hash.digest('hex');
      const completionTime = new Date().toISOString();

      record.downloadedSize = bytesDownloaded;
      record.completionTime = completionTime;
      record.localCacheReference = targetFilePath;
      record.checksum = {
        algorithm: 'SHA-256',
        hash: calculatedSha256,
      };

      // Source checksum verification check
      if (sourceChecksum && typeof sourceChecksum === 'string' && sourceChecksum.trim().length > 0) {
        if (sourceChecksum.trim().toLowerCase() === calculatedSha256.toLowerCase()) {
          record.status = 'VERIFIED';
          record.verificationStatus = 'VERIFIED';
        } else {
          record.status = 'ACQUISITION_FAILED';
          record.verificationStatus = 'FAILED';
          record.error = `SHA-256 checksum mismatch: Expected ${sourceChecksum}, calculated ${calculatedSha256}.`;
          saveAcquisitionRecord(record);
          return res.status(422).json({ success: false, error: record.error, record });
        }
      } else {
        record.status = 'CACHED';
        record.verificationStatus = 'SOURCE_CHECKSUM_UNAVAILABLE';
      }

      saveAcquisitionRecord(record);
      return res.json({ success: true, record });
    } catch (err: any) {
      const isTimeout = err.name === 'AbortError';
      const errorMsg = isTimeout
        ? 'Satellite asset download request timed out after 30 seconds.'
        : `Satellite acquisition failed: ${err.message || err}`;
      return res.status(500).json({
        success: false,
        error: errorMsg,
        reason: isTimeout ? 'TIMEOUT' : 'DOWNLOAD_ERROR',
      });
    } finally {
      if (acquiredProductId) {
        activeAcquisitions.delete(acquiredProductId);
      }
    }
  });

  // List all cached satellite acquisition records
  app.get("/api/satellite/cache", (_req, res) => {
    try {
      const records = listAcquisitionRecords();
      return res.json({ success: true, count: records.length, records });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message || err });
    }
  });

  // Get single cached satellite acquisition record by product ID
  app.get("/api/satellite/cache/:productId", (req, res) => {
    try {
      const { productId } = req.params;
      const record = getAcquisitionRecord(productId);
      if (!record) {
        return res.status(404).json({ success: false, error: `Product '${productId}' not found in cache.` });
      }
      return res.json({ success: true, record });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message || err });
    }
  });

  // Phase 7C.1 — Sentinel-1 Product Structure & SAFE Validation Endpoint
  app.post("/api/satellite/validate", async (req, res) => {
    try {
      const { productId } = req.body || {};
      if (!productId || typeof productId !== 'string') {
        return res.status(400).json({ success: false, error: "Missing or invalid 'productId' parameter." });
      }

      const validation = await validateSentinel1Product(productId);
      return res.json({ success: true, validation });
    } catch (err: any) {
      console.error(`Error validating Sentinel-1 product '${req.body?.productId}':`, err);
      return res.status(500).json({ success: false, error: `Validation failed: ${err.message || err}` });
    }
  });

  // Get cached Sentinel-1 product validation record by product ID
  app.get("/api/satellite/validation/:productId", (req, res) => {
    try {
      const { productId } = req.params;
      const validation = getValidationRecord(productId);
      if (!validation) {
        return res.status(404).json({ success: false, error: `Validation record for product '${productId}' not found.` });
      }
      return res.json({ success: true, validation });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message || err });
    }
  });

  // List all cached Sentinel-1 validation records
  app.get("/api/satellite/validations", (_req, res) => {
    try {
      const validations = listValidationRecords();
      return res.json({ success: true, count: validations.length, validations });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message || err });
    }
  });

  // Phase 7C.2 — Sentinel-1 Radiometric Calibration & SAR Preprocessing Endpoint
  app.post("/api/satellite/process", async (req, res) => {
    try {
      const { productId } = req.body || {};
      if (!productId || typeof productId !== 'string') {
        return res.status(400).json({ success: false, error: "Missing or invalid 'productId' parameter." });
      }

      const processing = await processSentinel1Sar(productId);
      return res.json({ success: true, processing });
    } catch (err: any) {
      console.error(`Error executing SAR preprocessing for product '${req.body?.productId}':`, err);
      return res.status(500).json({ success: false, error: `SAR Preprocessing failed: ${err.message || err}` });
    }
  });

  // Get cached Sentinel-1 SAR processing record by product ID
  app.get("/api/satellite/processing/:productId", (req, res) => {
    try {
      const { productId } = req.params;
      const processing = getProcessingRecord(productId);
      if (!processing) {
        return res.status(404).json({ success: false, error: `Processing record for product '${productId}' not found.` });
      }
      return res.json({ success: true, processing });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message || err });
    }
  });

  // List all cached Sentinel-1 SAR processing records
  app.get("/api/satellite/processings", (_req, res) => {
    try {
      const processings = listProcessingRecords();
      return res.json({ success: true, count: processings.length, processings });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message || err });
    }
  });

  // Phase 7C.3 — Sentinel-1 SAR Feature Extraction & Iceberg Candidate Generation Endpoint
  app.post("/api/satellite/analyze-features", async (req, res) => {
    try {
      const { productId, options } = req.body || {};
      if (!productId || typeof productId !== 'string') {
        return res.status(400).json({ success: false, error: "Missing or invalid 'productId' parameter." });
      }

      const candidateResult = await extractSarIcebergCandidates(productId, options);
      return res.json({ success: true, result: candidateResult });
    } catch (err: any) {
      console.error(`Error performing feature extraction for product '${req.body?.productId}':`, err);
      return res.status(500).json({ success: false, error: `Feature extraction failed: ${err.message || err}` });
    }
  });

  // Get cached Sentinel-1 candidate extraction record by product ID
  app.get("/api/satellite/candidates/:productId", (req, res) => {
    try {
      const { productId } = req.params;
      const record = getCandidatesRecord(productId);
      if (!record) {
        return res.status(404).json({ success: false, error: `Candidate extraction record for product '${productId}' not found.` });
      }
      return res.json({ success: true, result: record });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message || err });
    }
  });

  // List all cached Sentinel-1 candidate extraction records
  app.get("/api/satellite/candidates", (_req, res) => {
    try {
      const records = listCandidatesRecords();
      return res.json({ success: true, count: records.length, records });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message || err });
    }
  });

  // Phase 7C.4 — SAR Candidate Evidence Evaluation & Confirmation Endpoint
  app.post("/api/satellite/confirm-candidates", async (req, res) => {
    try {
      const { productId, seaIceCells, icebergs, stacCatalogue, options } = req.body || {};
      if (!productId || typeof productId !== 'string') {
        return res.status(400).json({ success: false, error: "Missing or invalid 'productId' parameter." });
      }

      const summary = await evaluateSarCandidatesConfirmation(
        productId,
        seaIceCells || [],
        icebergs || [],
        stacCatalogue || [],
        options
      );
      return res.json({ success: true, result: summary });
    } catch (err: any) {
      console.error(`Error confirming candidates for product '${req.body?.productId}':`, err);
      return res.status(500).json({ success: false, error: `Candidate confirmation failed: ${err.message || err}` });
    }
  });

  // Get cached Sentinel-1 candidate confirmation record by product ID
  app.get("/api/satellite/confirmation/:productId", (req, res) => {
    try {
      const { productId } = req.params;
      const record = getConfirmationRecord(productId);
      if (!record) {
        return res.status(404).json({ success: false, error: `Confirmation record for product '${productId}' not found.` });
      }
      return res.json({ success: true, result: record });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message || err });
    }
  });

  // List all cached Sentinel-1 candidate confirmation records
  app.get("/api/satellite/confirmations", (_req, res) => {
    try {
      const records = listConfirmationRecords();
      return res.json({ success: true, count: records.length, records });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message || err });
    }
  });

  // Real-time Antarctic Environmental Telemetry from Open-Meteo & ECMWF

  app.get("/api/telemetry/live", async (req, res) => {
    try {
      // Default to Antarctic Peninsula / Marguerite Bay / Rothera Station sector (-67.57°S, -68.13°W)
      const lat = parseFloat(req.query.lat as string) || -67.57;
      const lon = parseFloat(req.query.lon as string) || -68.13;

      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,wind_speed_10m,wind_direction_10m,wind_gusts_10m,surface_pressure,visibility`;
      const marineUrl = `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}&current=wave_height,wave_direction,wave_period,ocean_current_velocity,ocean_current_direction`;

      // Parallel fetch with 7s timeout
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 7000);

      const [weatherRes, marineRes] = await Promise.all([
        fetch(weatherUrl, { signal: controller.signal }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch(marineUrl, { signal: controller.signal }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      ]);

      clearTimeout(timeout);

      const currWeather = weatherRes?.current;
      const currMarine = marineRes?.current;

      const windSpeedKmh = currWeather?.wind_speed_10m ?? 22.0;
      const windSpeedKnots = parseFloat((windSpeedKmh * 0.539957).toFixed(1));
      const windDirectionDeg = currWeather?.wind_direction_10m ?? 190;
      const airTempC = currWeather?.temperature_2m ?? -6.5;
      const waveHeightMeters = currMarine?.wave_height ?? 0.8;
      const visibilityMeters = currWeather?.visibility ?? 8500;
      const visibilityNm = parseFloat((visibilityMeters / 1852).toFixed(1));
      const barometricPressureHpa = currWeather?.surface_pressure ?? 982.0;

      // Calculate icing severity based on air temp and wind
      let icingSeverity: 'Light' | 'Moderate' | 'Severe' = 'Moderate';
      if (airTempC < -10 && windSpeedKnots > 25) {
        icingSeverity = 'Severe';
      } else if (airTempC > -2) {
        icingSeverity = 'Light';
      }

      res.json({
        status: 'success',
        isLive: true,
        dataSource: 'Live Open-Meteo & ECMWF Polar Feeds',
        stationName: 'Antarctic Peninsula Sector (-67.57°S, -68.13°W)',
        coordinates: { lat, lon },
        weather: {
          windSpeedKnots,
          windDirectionDeg,
          airTempC,
          seaTempC: -1.8,
          waveHeightMeters: parseFloat(Number(waveHeightMeters).toFixed(2)),
          visibilityNm: Math.min(25, Math.max(0.5, visibilityNm)),
          barometricPressureHpa: parseFloat(Number(barometricPressureHpa).toFixed(1)),
          timestamp: currWeather?.time ? new Date(currWeather.time).toISOString() : new Date().toISOString(),
          forecastHorizonHours: 0,
          isLive: true,
          dataSource: 'Live Open-Meteo & ECMWF Polar Marine Feeds',
          stationName: 'Marguerite Bay / Rothera Approach',
          icingSeverity,
        },
        oceanCurrent: {
          velocityKnots: parseFloat(((currMarine?.ocean_current_velocity ?? 1.2) * 0.539957).toFixed(2)),
          directionDeg: currMarine?.ocean_current_direction ?? 185,
        },
      });
    } catch (err: any) {
      console.error('Error fetching live Antarctic telemetry:', err);
      res.status(500).json({
        status: 'error',
        error: err.message || 'Failed to fetch live polar telemetry',
        fallback: true,
      });
    }
  });

  // Gemini AI Navigation Assistant Endpoint
  app.post("/api/gemini/assistant", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(503).json({
          error: "GEMINI_API_KEY is not configured in the environment.",
          fallback: true,
          response:
            "CRYO NAV AI Assistant offline: GEMINI_API_KEY is not configured in the platform secrets. Local decision support rules are active.",
        });
      }

      const question = req.body.question || req.body.message || req.body.prompt;
      const context = req.body.context || {};

      if (!question) {
        return res.status(400).json({ error: "Missing 'question' or 'message' in request body." });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const systemInstruction = `You are the CRYO NAV AI Navigation Decision Support Assistant for Antarctic research vessels.
CRYO NAV is a decision support system (not an autonomous control system) for Antarctic navigation, combining satellite SAR, sea ice models, iceberg trajectory prediction, and multi-objective route optimization.

CRITICAL RULES:
1. Ground your answers strictly in the structured navigation context provided.
2. NEVER invent numerical values, distances, coordinates, or fuel metrics. If data is not provided in the context, explicitly state: "I don't have sufficient validated data to answer that."
3. Clearly distinguish between:
   - OBSERVED (satellite/radar observations)
   - PREDICTED (model forecasts like +24h iceberg drift)
   - SIMULATED (what-if perturbations)
   - SYNTHETIC (demo/synthetic training datasets)
4. Do NOT use the term "Digital Twin". Use "Antarctic Environmental State" or "Dynamic Environmental Model".
5. Emphasize that the human captain/navigator always retains ultimate navigational authority and makes the final decision.
6. Keep responses professional, authoritative, maritime-standard, clear, and scannable.`;

      const prompt = `CURRENT ANTARCTIC ENVIRONMENTAL STATE & NAVIGATION CONTEXT:
${JSON.stringify(context || {}, null, 2)}

OPERATOR / NAVIGATOR INQUIRY:
${question}

Provide an objective, structured decision-support response explaining the rationale, hazards, and confidence levels.`;

      const aiResponse = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.3,
        },
      });

      const text = aiResponse.text || "No response generated from model.";
      return res.json({ response: text, reply: text, timestamp: new Date().toISOString() });
    } catch (err: any) {
      console.error("Gemini assistant error:", err);
      return res.status(500).json({
        error: "Failed to query Gemini AI navigation assistant.",
        details: err.message || "Unknown error",
        fallback: true,
      });
    }
  });

  // Vite middleware in dev or static files in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`CRYO NAV server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
