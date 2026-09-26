# CRYO NAV — Phase 7B Satellite Product Acquisition & Local Caching Documentation

## 1. Objective & Operational Scope

Phase 7B implements the **Satellite Product Acquisition & Local Caching Layer**. It enables satellite products discovered via CDSE STAC (Phase 7A) to be acquired, streamed over HTTPS, verified for integrity (SHA-256), and persisted in a local filesystem cache (`./cache/satellite/`), while preserving complete data provenance.

> **Explicit Boundary**:
> - Phase 7B performs product acquisition, local caching, SHA-256 integrity verification, and data provenance tracking.
> - Phase 7B does **NOT** execute SAR image processing, automated iceberg detection, or sea-ice concentration derivation from rasters.
> - Downloaded products are explicitly tagged with **`PROCESSING: NOT YET PERFORMED`**.
> - Downloaded binary files are **NOT** automatically integrated into the environmental navigation risk grid.

---

## 2. Acquisition Architecture & Data Flow

```
CATALOGUE ITEM (Phase 7A STAC Item)
      ↓
ACQUISITION REQUEST (POST /api/satellite/acquire)
      ↓
SECURITY VALIDATION (Host Whitelist + Path Sanitization)
      ↓
STREAMING DOWNLOAD (Node.js HTTPS Stream → ./cache/satellite/)
      ↓
SHA-256 INTEGRITY CALCULATION (Incremental Stream Digest)
      ↓
LOCAL CACHE PERSISTENCE (<productId>.meta.json & <productId>_PRODUCT.bin)
      ↓
READY FOR PROCESSING (PROCESSING: NOT YET PERFORMED)
```

---

## 3. Strict Status Model

Every acquisition record follows a strict state transition machine:

| Status State | Description |
| :--- | :--- |
| `CATALOGUE_ITEM` | Item discovered in CDSE STAC search; not yet requested for acquisition. |
| `AVAILABLE_FOR_ACQUISITION` | Validated acquisition candidate ready for downlink request. |
| `ACQUISITION_REQUESTED` | Client triggered acquisition request; server validating request parameters. |
| `DOWNLOADING` | Server actively streaming bytes over HTTPS to local cache directory. |
| `DOWNLOADED` | Streaming download completed; integrity verification in progress. |
| `VERIFIED` | Local SHA-256 hash calculated and matched source checksum. |
| `CACHED` | Product cached locally; source checksum was unavailable for verification. |
| `ACQUISITION_FAILED` | Acquisition failed due to HTTP error, timeout, or checksum mismatch. |
| `UNAVAILABLE` | Acquisition blocked (e.g. system is `OFFLINE` or operating in `DEMO` mode). |

---

## 4. Security & Protection Controls

1. **SSRF Prevention**: `POST /api/satellite/acquire` rejects arbitrary URLs. `assetUrl` hostnames are strictly validated against the official CDSE whitelist:
   - `stac.dataspace.copernicus.eu`
   - `zipper.dataspace.copernicus.eu`
   - `dataspace.copernicus.eu`
   - `download.dataspace.copernicus.eu`
   - `cdse.copernicus.eu`
2. **Path Traversal Protection**: Product IDs and asset references are sanitized via `sanitizeFilename(name)` to strip `..`, `/`, `\`, control characters, and invalid filename symbols. Target paths are validated using `assertPathInCache(path)`.
3. **Download Streaming & Size Caps**: Downloads use Node stream pipes directly to disk, enforcing a maximum file size cap (500 MB) and a 30-second timeout to prevent memory exhaustion or server hanging.
4. **Credential Isolation**: Optional CDSE credentials (`CDSE_CLIENT_ID`, `CDSE_CLIENT_SECRET`) are loaded from environment variables (`.env`) and never exposed to the React frontend client.

---

## 5. Local Cache Storage Abstraction

Downloaded satellite products are stored outside the React source tree under `./cache/satellite/`:
- **Binary Granule Product**: `./cache/satellite/<sanitized_productId>_<assetId>.bin`
- **Metadata JSON Record**: `./cache/satellite/<sanitized_productId>.meta.json`

Metadata records survive application restart and are automatically reloaded into client state on app launch via `GET /api/satellite/cache`.

---

## 6. Integrity Verification & Provenance

- **Source Checksum Available**: Calculated SHA-256 is compared against the source digest. If matched, status is set to `VERIFIED` and `verificationStatus` set to `VERIFIED`.
- **Source Checksum Unavailable**: The system records `"Downloaded successfully; source checksum unavailable."` with status `CACHED` and `verificationStatus = SOURCE_CHECKSUM_UNAVAILABLE`. Cryptographic source authenticity is never claimed without source verification.
- **Data Provenance**: Every record retains original CDSE granule ID, collection, observation timestamp, ingestion time, request time, completion time, local cache file reference, and size.

---

## 7. Operational Modes & Offline Policy

- **`REAL` Mode**: Real CDSE products discovered via STAC are acquired via server proxy.
- **`DEMO` Mode**: Synthetic satellite metadata displays **`Demo satellite products are simulated metadata and cannot be remotely acquired`** and cannot fake downloads.
- **`OFFLINE` Mode**: Remote downloads are blocked with **`Acquisition unavailable while offline`**. Pre-existing cached items display **`CACHED PRODUCT AVAILABLE`**.

---

## 8. Phase 7C.1 Sentinel-1 Container & SAFE Ingestion Validation

Following local acquisition, cached Sentinel-1 products can be validated via `POST /api/satellite/validate` (`sentinel1Validator.ts`):
- **Container Structure**: Scans ZIP Central Directory for `measurement/`, `annotation/`, `preview/`, and `support/` paths.
- **Manifest Parsing**: Hardened XML parser (`parseManifestXml`) extracts Platform, Instrument, Product Type, Mode, Polarization, Sensing Window, Orbit Number, and Processing Level.
- **Security**: ZIP path traversal (`..`) rejected; XML XXE / DTD expansion immune.
- **Persistence**: Validation JSON stored as `./cache/satellite/<productId>.val.json`.
- **Status & Disclaimers**: Displays `READY FOR SAR PROCESSING` with explicit disclaimers (`SAR PROCESSING: NOT YET PERFORMED`, `ICEBERG DETECTION: NOT YET PERFORMED`).

