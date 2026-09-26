# CRYO NAV — Sentinel-1 Product Validation & SAFE Ingestion Architecture
## Phase 7C.1 Technical Specification & Verification Documentation

---

### Executive Overview

Phase 7C.1 introduces **Sentinel-1 Product Container Validation & SAFE Ingestion** into CRYO NAV. Building directly upon the Phase 7B acquisition & caching layer, Phase 7C.1 inspects locally cached satellite product files, verifies container format integrity (`SAFE ZIP` or directory structure), scans internal path structures (`measurement/`, `annotation/`, `preview/`, `support/`), performs hardened XML manifest parsing (`manifest.safe`), extracts verified satellite metadata, and persists structured validation records (`.val.json`).

> [!IMPORTANT]
> **Scientific Validation Boundary**:
> Phase 7C.1 performs **product structure & manifest metadata validation ONLY**. It does **NOT** perform SAR image rendering, thermal noise removal, speckle filtering, radiometric calibration, terrain correction, or iceberg detection. Those processing steps belong exclusively to later milestones (Phase 7C.2 and 7C.3).

---

### State Machine Lifecycle

Sentinel-1 product ingestion follows a strict, scientifically honest state transition model:

```
[ CATALOGUE_ITEM ] (Phase 7A STAC Discovery)
       │
       ▼
[ AVAILABLE_FOR_ACQUISITION ] (Prioritized by Decision Impact Engine)
       │
       ▼
[ DOWNLOADING ] (Phase 7B Server Streaming to .part file)
       │
       ▼
[ CACHED / HASH VERIFIED ] (Phase 7B Atomic Local Cache Persistence)
       │
       ▼
[ VALIDATING ] (Phase 7C.1 Container & Manifest Inspection)
       │
       ├───────────────────────────────┐
       ▼                               ▼
[ STRUCTURE_VALID ]             [ METADATA_PARSED ]
       │                               │
       └───────────────┬───────────────┘
                       ▼
          [ READY_FOR_SAR_PROCESSING ]
```

---

### Container & Security Specifications

#### 1. ZIP Archive Inspection Security
- **Scanner**: `scanZipArchive(buffer)` reads the ZIP End of Central Directory (EOCD) and Central Directory entry headers without extracting the full payload to disk.
- **Path Traversal Protection**: Any ZIP entry containing relative path breakout (`..`), leading slashes (`/` or `\`), or drive letters (`C:`) is immediately rejected with a security error, halting validation.

#### 2. Manifest XML Parser Security (XXE Immune)
- **Parser**: `parseManifestXml(rawXml)` parses Sentinel-1 SAFE XML tags using hardened pattern matching.
- **XXE Protection**: Input XML containing `<!DOCTYPE>` or `<!ENTITY>` tags is rejected immediately prior to parsing, rendering external entity expansion and DTD inclusion attacks impossible. Network requests are strictly disabled during XML parsing.

---

### Extracted Sentinel-1 Metadata Schema

| Field | Source XML Tag / Fallback | Example Value |
| :--- | :--- | :--- |
| **Platform** | `<safe:platform><safe:familyName>`, `<safe:number>` | `Sentinel-1A` / `Sentinel-1B` / `Sentinel-1C` |
| **Instrument** | `<safe:instrument><safe:familyName>` | `C-SAR` |
| **Product Type** | `<s1sarl1:productType>` | `GRD`, `SLC`, `OCN` |
| **Sensor Mode** | `<s1sarl1:mode>`, `<safe:mode>` | `IW` (Interferometric Wide), `EW`, `SM` |
| **Polarization** | `<s1sarl1:transmitterReceiverPolarisation>` | `['HH', 'HV']`, `['VV', 'VH']` |
| **Processing Level** | `<safe:processing><safe:name>` | `Level-1` |
| **Acquisition Start** | `<safe:startTime>`, `<gml:beginPosition>` | `2026-09-20T15:58:53.000Z` |
| **Acquisition Stop** | `<safe:stopTime>`, `<gml:endPosition>` | `2026-09-20T15:59:18.000Z` |
| **Relative Orbit** | `<safe:relativeOrbitNumber>` | `12` |
| **Absolute Orbit** | `<safe:orbitNumber>` | `50000` |
| **Discovered Paths** | ZIP Central Directory scan | `manifest.safe`, `measurement/`, `annotation/`, `preview/`, `support/` |

---

### Server API Reference

#### `POST /api/satellite/validate`
Validates a cached satellite product by ID and persists structured validation metadata.
- **Request Body**: `{ "productId": "S1C_IW_GRDH_1SDV_..." }`
- **Response**: `{ "success": true, "validation": Sentinel1ProductValidationResult }`

#### `GET /api/satellite/validation/:productId`
Fetches a previously persisted validation record from local cache (`.val.json`).

#### `GET /api/satellite/validations`
Lists all cached product validation records.

---

### User Interface & Demo Flow

#### Real Mode Validation Workflow
1. Open CRYO NAV in **REAL DATA** mode.
2. Navigate to **Data Acquisition** view.
3. In **Local Satellite Cache & Acquisition Status**, locate a cached product.
4. Click **[ VALIDATE PRODUCT ]**.
5. Observe real-time container inspection badges:
   - `STRUCTURE: VALID`
   - `CONTAINER: SAFE ZIP`
   - `MANIFEST: FOUND`
   - `METADATA: PARSED`
   - `READY FOR SAR PROCESSING`
6. Review extracted Sentinel-1 metadata table (Platform, Instrument, Product Type, Mode, Polarization, Sensing Window, Orbit Number).
7. Review mandatory disclaimers:
   - `REAL CDSE SENTINEL-1 PRODUCT`
   - `VALIDATION LEVEL: PRODUCT STRUCTURE & METADATA PARSED`
   - `SAR PROCESSING: NOT YET PERFORMED`
   - `ICEBERG DETECTION: NOT YET PERFORMED`

#### Offline Mode Validation Workflow
1. Switch application to **OFFLINE** mode.
2. Click **[ VALIDATE PRODUCT ]** on any locally cached satellite product.
3. Observe that validation completes locally without issuing remote network calls to CDSE.
4. If a product is not cached locally, validation cleanly reports `PRODUCT NOT AVAILABLE LOCALLY`.

---

### Limitations & Next Milestone (Phase 7C.2)

- **Phase 7C.1 Boundary**: Validates container files and manifest metadata. Does not render raster pixels or extract sea-ice features.
- **Phase 7C.2 (Next Milestone)**: SAR Image Preprocessing (SAFE container unzipping, thermal noise removal, radiometric calibration to $\sigma_0$ backscatter, terrain correction).
