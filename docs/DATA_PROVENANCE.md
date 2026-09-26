# CRYO NAV — Data Provenance & Lineage Design Specification

**System:** CRYO NAV — AI-Enabled Antarctic Sea-Ice, Iceberg Trajectory & Navigation Decision Support System  
**Phase:** Phase 2A — Real Antarctic Data Source Reconnaissance  
**Domain:** Scientific Provenance, Data Lineage Tracking & Quality Auditability  

---

## 1. Overview & Objectives

In polar navigation decision support, data provenance is a critical safety requirement. Master mariners and polar navigators must know the exact origin, sensor type, age, processing level, and confidence of every environmental observation grounding a route recommendation.

> [!IMPORTANT]
> **Provenance Mandate:** CRYO NAV will retain full metadata lineage for every ingested real-world dataset. Environmental data without verified provenance must be flagged as `UNKNOWN_PROVENANCE` and assigned a higher spatial uncertainty penalty.

---

## 2. Standardized Provenance Metadata Schema

Every environmental data record ingested into CRYO NAV (whether sea-ice cells, iceberg track points, weather telemetry, or satellite swath footprints) will attach the standardized `DataProvenance` metadata block defined below:

```typescript
export interface DataProvenance {
  // 1. Source & Attribution
  source: string;                // e.g. "Copernicus Marine Service (CMEMS)"
  provider: string;              // e.g. "EUMETSAT OSI SAF"
  datasetId: string;             // e.g. "SEAICE_GLO_SEAICE_L4_NRT_OBSERVATIONS_011_001"
  granuleId: string;             // e.g. "ice_conc_ant_polstere-100_multi_202609191200.nc"
  license: string;               // e.g. "Copernicus License / CC-BY 4.0"

  // 2. Temporal Metadata & Lineage
  observationTime: string;       // ISO 8601 UTC timestamp of physical sensor observation
  publicationTime: string;       // ISO 8601 UTC timestamp when provider published dataset
  ingestionTime: string;         // ISO 8601 UTC timestamp when CRYO NAV ingested record
  validTime: string;             // ISO 8601 UTC timestamp for which forecast/observation applies
  forecastHorizonHours: number;  // 0 for NRT observation, +6 to +240 for forecast model

  // 3. Spatial & Sensor Characteristics
  bbox: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
  crs: string;                   // e.g. "EPSG:4326" or "EPSG:3031" (Antarctic Polar Stereographic)
  spatialResolutionMeters: number; // e.g. 10000 (10 km)
  temporalResolutionHours: number;// e.g. 24 (Daily)
  processingLevel: 'L2' | 'L3' | 'L4' | 'Analyst-Derived';

  // 4. Quality, Freshness & Integrity
  qcFlag: 'PASSED' | 'WARNING' | 'FAILED' | 'UNCHECKED';
  confidenceScore: number;       // 0–100 %
  dataAgeHours: number;          // Hours elapsed since observationTime
  freshnessState: 'FRESH' | 'AGING' | 'STALE' | 'UNAVAILABLE';
  category: 'OBSERVED' | 'FORECAST' | 'REANALYSIS' | 'SYNTHETIC';
  isSynthetic: boolean;          // true for demo baseline, false for real EO feeds

  // 5. System Lineage
  processingVersion: string;     // CRYO NAV adapter pipeline version (e.g. "2.1.0")
  checksumSHA256?: string;       // SHA-256 hash of original raw payload
}
```

---

## 3. Data Category Provenance Mapping

| Data Category | Target Source | Ingested Dataset ID | Processing Level | Freshness Threshold | Default Category |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Sea Ice Grid** | Copernicus Marine (CMEMS) | `SEAICE_GLO_SEAICE_L4_NRT_OBSERVATIONS_011_001` | L4 (Grid Analysis) | FRESH < 24h, STALE > 48h | `OBSERVED` |
| **Iceberg Tracking** | US National Ice Center (USNIC) | `USNIC_ANTARCTIC_ICEBERG_CATALOG` | Analyst-Derived | FRESH < 7d, STALE > 14d | `OBSERVED` |
| **Ocean Hydrodynamics** | Copernicus Marine (CMEMS) | `GLOBAL_ANALYSISFORECAST_PHY_001_024` | L4 Model Forecast | FRESH < 12h, STALE > 24h | `FORECAST` |
| **Polar Weather** | Open-Meteo & ECMWF | `OPENMETEO_POLAR_TELEMETRY_LIVE` | L4 NRT Stream | FRESH < 3h, STALE > 6h | `OBSERVED / FORECAST` |
| **Satellite Metadata** | CDSE STAC API | `CDSE_STAC_SENTINEL_1` | L1 / L2 Metadata | FRESH < 12h, STALE > 48h | `OBSERVED` |
| **Satellite Acquisition & Cache** | CDSE Product Access & Local Cache | `CDSE_SENTINEL_1_GRD` | L1 / L2 Product Archive | FRESH < 24h, STALE > 7d | `OBSERVED` |

---

## 4. Phase 7B Satellite Product Acquisition Lineage

For every satellite product acquired and stored in the local cache (`./cache/satellite/`):
- **Catalogue Product ID**: Original CDSE STAC granule ID (`item.id`)
- **Source & Provider**: `Copernicus Data Space Ecosystem (CDSE)` / `European Space Agency (ESA)`
- **Timestamps**: Acquisition observation time, STAC retrieval time, download request time, completion time
- **File & Integrity Metadata**: Asset ID, media type, downloaded file size (MB), local file path reference, SHA-256 digest
- **Verification Status**: `VERIFIED` (if source checksum matched), `SOURCE_CHECKSUM_UNAVAILABLE` (if source hash missing), or `FAILED`
- **Processing Flag**: Explicitly tagged with **`PROCESSING: NOT YET PERFORMED`**

---

## 5. Phase 7C.2-R Sentinel-1 SAR Preprocessing Lineage

For every SAR product preprocessed by `sentinel1Processor.ts` (`.processing.json`):
- **Calibration Method & Source:** Records exact calibration method (`SENTINEL-1 CALIBRATION LUT (calibrationVectorList)` vs `RAW_UNCALIBRATED`) and calibration XML source.
- **Physical Output & Units:** Explicitly records physical quantity (`SIGMA0` vs `RAW_DN`) and units (`dB` vs `DN`).
- **GeoTIFF Source CRS & Pixel Spacing:** Preserves extracted GeoTIFF GeoKeys or records `UNKNOWN / NOT EXPLICITLY PROVIDED` without fabrication.
- **Statistics Domain:** Explicitly records `statisticsDomain` (`SIGMA0_DB` vs `RAW_MEASUREMENT`).
- **Metric Counters:** Preserves counts for valid, nodata, invalid calibration, and clipped dB pixels.

---

## 6. UI Provenance Transparency

In the CRYO NAV user interface, every environmental component must display its active provenance metadata:
1. **Hover Tooltips:** Display sensor source, dataset ID, observation time, and data age on map vector overlays.
2. **Status Banners:** Clearly label whether active data is `REAL OBSERVATION (NRT)`, `REAL FORECAST`, or `DEMO / SYNTHETIC DATA`.
3. **Data Provenance Drawer:** Detailed scientific metadata popup available when clicking any sea-ice cell, iceberg marker, satellite swath, or acquired cache record.

