# CRYO NAV — Real Data Adapter Architecture & Pipeline Plan

**System:** CRYO NAV — AI-Enabled Antarctic Sea-Ice, Iceberg Trajectory & Navigation Decision Support System  
**Phase:** Phase 2A — Real Antarctic Data Source Reconnaissance  
**Scope:** Adapter Architecture, Transformation Pipelines, and Data Contract Specifications  

---

## 1. End-to-End Adapter Pipeline Architecture

```
+-----------------------------------------------------------------------------------+
|                              EXTERNAL REAL DATA SOURCES                           |
|   Copernicus Marine (CMEMS) • USNIC Iceberg Catalog • Open-Meteo • CDSE STAC API  |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
|                                1. SOURCE ADAPTER                                  |
|   - HTTP / REST / S3 / OPENDAP Transport Client                                   |
|   - Authentication & Token Refresh (OAuth2 / API Key)                             |
|   - Network Timeout & Retry Handling                                              |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
|                                2. RAW DATA STORAGE                                |
|   - Temporary NetCDF-4, GeoJSON, CSV, or STAC Item JSON Payload                   |
|   - SHA-256 Checksum Computation                                                  |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
|                                3. DATA VALIDATION                                 |
|   - Schema Structure & Required Field Check                                       |
|   - Geographical Bounding Box Validation (-50°S to -85°S)                         |
|   - Physical Range Check (Sea Ice %: 0–100; Temp: -50°C to +30°C)                 |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
|                                4. NORMALIZATION PIPELINE                          |
|   - Spatial Reprojection (Polar Stereographic EPSG:3031 → WGS84 EPSG:4326)         |
|   - Grid Resampling & Interpolation                                               |
|   - Provenance Metadata Attachment                                                |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
|                         5. CRYO NAV COMMON DATA TYPES                             |
|   SeaIceCell[] • IcebergDetection[] • WeatherCondition • SatelliteProduct[]       |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
|                          APPLICATION & DECISION ENGINES                           |
|   riskEngine.ts • routingEngine.ts • trajectoryModel.ts • AI Assistant            |
+-----------------------------------------------------------------------------------+
```

---

## 2. Adapter Specifications by Data Category

### 2.1 Sea Ice Concentration Adapter (`CMEMSSeaIceAdapter`)
- **External Source:** Copernicus Marine Service (`SEAICE_GLO_SEAICE_L4_NRT_OBSERVATIONS_011_001`)
- **Adapter Responsibility:** Ingest daily 10 km NetCDF-4 polar sea-ice concentration grid, clip to Antarctic Peninsula voyage bounds, and normalize into `SeaIceCell[]`.
- **Expected Input:** NetCDF-4 granule containing variables `ice_conc`, `ice_stage`, `ice_thickness`, `status_flag`.
- **Expected Output:** Array of `SeaIceCell` objects matching `src/types.ts`.
- **Validation Rules:** Concentration values must be $0 \le C \le 100\%$. Latitude bounds must be within $[-85.0, -50.0]$.
- **Failure Behavior:** If download fails or schema is invalid, activate `DATA_FAILURE_POLICY` (display fallback alert, retain cached grid with `STALE` status).
- **Freshness Handling:** Data age $< 24\text{h} \implies \text{FRESH}$; $24\text{h} \le \text{age} \le 48\text{h} \implies \text{AGING}$; $> 48\text{h} \implies \text{STALE}$.
- **Caching Considerations:** Cache NetCDF grids locally on disk/IndexedDB indexed by date (`YYYYMMDD`).

---

### 2.2 Iceberg Catalog Adapter (`USNICIcebergAdapter`)
- **External Source:** US National Ice Center (USNIC) Weekly Antarctic Iceberg GeoJSON/CSV Feed
- **Adapter Responsibility:** Parse official analyst iceberg position records, calculate current closest approaches (CPA) to active routes, and normalize into `IcebergDetection[]`.
- **Expected Input:** GeoJSON FeatureCollection or CSV containing `iceberg_id`, `name`, `latitude`, `longitude`, `length_m`, `width_m`, `observation_date`.
- **Expected Output:** Array of `IcebergDetection` objects.
- **Validation Rules:** Coordinates must be valid lat/lon. Iceberg length must be $> 0$ meters.
- **Failure Behavior:** Retain previously ingested iceberg positions, mark data `STALE`, and expand positional uncertainty radii.
- **Freshness Handling:** Data age $< 7\text{d} \implies \text{FRESH}$; $> 14\text{d} \implies \text{STALE}$.
- **Caching Considerations:** Store iceberg catalog in local state/database keyed by iceberg ID.

---

### 2.3 Polar Weather & Marine Telemetry Adapter (`OpenMeteoTelemetryAdapter`)
- **External Source:** Open-Meteo Antarctic Weather & ECMWF Marine API (Already active in baseline backend `/api/telemetry/live`)
- **Adapter Responsibility:** Query live surface wind speed/direction, air/sea temperature, barometric pressure, wave height, and ocean current velocity for vessel coordinates.
- **Expected Input:** JSON response from Open-Meteo REST API.
- **Expected Output:** `WeatherCondition` & `OceanCurrentCell[]` objects.
- **Validation Rules:** Wind speed $\ge 0$ knots, wave height $\ge 0$ meters.
- **Failure Behavior:** Express backend catches fetch error, logs warning, and returns cached telemetry with `fallback: true`.
- **Freshness Handling:** Data age $< 3\text{h} \implies \text{FRESH}$; $> 6\text{h} \implies \text{STALE}$.
- **Caching Considerations:** 15-minute in-memory cache on Express backend to prevent API rate limiting.

---

### 2.4 Satellite Metadata STAC Adapter (`CDSEStacAdapter`)
- **External Source:** Copernicus Data Space Ecosystem STAC API (`https://stac.dataspace.copernicus.eu/v1`)
- **Adapter Responsibility:** Execute STAC spatial `bbox` and temporal range queries for Sentinel-1 EW/IW SAR imagery footprints over the vessel corridor, calculate decision impact, and populate `SatelliteProduct[]`.
- **Expected Input:** STAC ItemCollection JSON containing spatial polygons, datetime, asset links, and radar mode metadata.
- **Expected Output:** Array of `SatelliteProduct` objects.
- **Validation Rules:** STAC item must contain valid geometry and `datetime`.
- **Failure Behavior:** Fall back to cached satellite metadata list.
- **Freshness Handling:** Data age $< 12\text{h} \implies \text{FRESH}$; $> 48\text{h} \implies \text{STALE}$.
- **Caching Considerations:** Cache STAC query results by spatial bounding box and date.
