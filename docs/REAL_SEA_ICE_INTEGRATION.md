# CRYO NAV — Real Copernicus Marine Sea-Ice Integration Specification

## 1. Executive Overview & Data Source
Phase 2B establishes CRYO NAV's first real Antarctic environmental data pipeline, transitioning from synthetic sea-ice fields to live observations provided by the **Copernicus Marine Service (CMEMS)**.

* **Data Provider:** EUMETSAT Ocean and Sea Ice Satellite Application Facility (OSI SAF) / Copernicus Marine Service.
* **Product Name:** Global Ocean Sea Ice Concentration NRT (Near-Real-Time).
* **Product Identifier:** `SEAICE_GLO_SEAICE_L4_NRT_OBSERVATIONS_011_001`.
* **Target Dataset:** `OSI-401-d` / `OSI-408-a` (Global Near-Real-Time Sea Ice Concentration Analysis).
* **Grid Resolution:** 10 km polar stereographic / EPSG:4326 grid over the Southern Ocean.
* **Update Frequency:** Daily NRT updates (2–6 hour latency from satellite overpass).

---

## 2. Programmatic Access & Authentication Mechanism
* **Actual Code Mechanism:** Direct HTTP GET request over HTTPS to THREDDS / OGC endpoint (`https://nrt.cmems-du.eu/thredds/dodsC/SEAICE_GLO_SEAICE_L4_NRT_OBSERVATIONS_011_001`) with HTTP Basic Authentication (`Authorization: Basic <base64>`) implemented in `src/data/adapters/copernicusSeaIceAdapter.ts`.
* **Official Recommended Method Comparison:** Copernicus Marine officially recommends access via the **Copernicus Marine Toolbox (`copernicusmarine` CLI / Python SDK)** or STAC API. The current TypeScript/Node.js adapter performs direct server-side HTTPS queries without external Python runtime dependencies.
* **Server-Side Security:** Credentials (`COPERNICUS_MARINE_USER`, `COPERNICUS_MARINE_PASSWORD`) are strictly isolated on the Node.js Express server (`server.ts`).
* **Client Isolation:** Credentials are NEVER exposed to the React/Vite browser client. The client fetches normalized cells via Express API `GET /api/environment/sea-ice`.

---

## 3. Spatial & Temporal Subsetting
* **Default Bounding Box:** Antarctic Peninsula / Marguerite Bay sector:
  * `minLat`: -68.5°S
  * `maxLat`: -59.0°S
  * `minLon`: -70.0°W
  * `maxLon`: -56.0°W
* **Temporal Subset:** Latest valid NRT satellite observation cycle (`validTime`).

---

## 4. Normalization Pipeline
Raw satellite sea-ice concentration percentages (0–100%) are normalized into CRYO NAV's standard `SeaIceCell` interface and categorized using standard **WMO Sea Ice Stages of Development**:
* `concentrationPercent >= 90%` → **Consolidated Fast Ice**
* `70% <= concentrationPercent < 90%` → **Very Close Pack (90-100%)**
* `40% <= concentrationPercent < 70%` → **Open Drift (40-60%)**
* `10% <= concentrationPercent < 40%` → **Very Open Drift (10-30%)**
* `< 10%` → **Open Water**

---

## 5. Strict Validation & Anti-Fabrication Policy
Before observations enter CRYO NAV's context, every grid cell passes numeric and spatial validation (`validateObservationCell`):
* Latitude range check: `-90.0` to `90.0`
* Longitude range check: `-180.0` to `180.0`
* Concentration numeric bounds: `0` to `100` (rejects `NaN`, `null`, `undefined`)
* Valid ISO timestamp parser check.

**CRYO NAV Policy on Data Integrity:**
* Invalid, missing, or malformed observation cells are discarded.
* If remote Copernicus data or authentication fails, the application returns an explicit HTTP 401/503 error status with `realSeaIceError`.
* **NO DATA FABRICATION:** The platform does NOT generate replacement synthetic data in REAL mode.

---

## 6. Provenance Metadata Specification
Every real-data response embeds full provenance metadata (`DataProvenance`):
```json
{
  "source": "Copernicus Marine Service (CMEMS)",
  "provider": "EUMETSAT Ocean and Sea Ice SAF (OSI SAF)",
  "datasetId": "SEAICE_GLO_SEAICE_L4_NRT_OBSERVATIONS_011_001",
  "granuleId": "cmems_obs-si_glo_phy-ic-l4_2026-09-19.nc",
  "license": "Copernicus Open Data License (Free Distribution)",
  "observationTime": "2026-09-19T18:00:00.000Z",
  "ingestionTime": "2026-09-19T22:00:00.000Z",
  "validTime": "2026-09-19T18:00:00.000Z",
  "forecastHorizonHours": 0,
  "bbox": [-70.0, -68.5, -56.0, -59.0],
  "crs": "EPSG:4326",
  "spatialResolutionMeters": 10000,
  "processingLevel": "L4 (Interpolated Grid Analysis)",
  "dataAgeHours": 4,
  "freshnessState": "FRESH",
  "category": "OBSERVED",
  "isSynthetic": false
}
```

---

## 7. Frontend UI & Map Integration
* **Mode Toggle:** Explicit UI toggle between `DEMO MODE (SYNTHETIC)` and `REAL DATA (COPERNICUS MARINE)` in `SeaIceView`.
* **Provenance Card:** Displays provider, product ID, observation timestamp, retrieval time, data age, freshness, grid resolution, and bounding box.
* **Leaflet Map Overlay:** Displays real sea-ice concentration polygons and WMO classifications when REAL mode is active, tagged with a live `REAL DATA: COPERNICUS MARINE` badge.
* **Error Banner:** Displays explicit error messages when credentials or service are missing/unavailable, allowing users to explicitly switch to DEMO mode.

---

## 8. Limitations & Future Extensions
* **Observation vs Forecast:** Phase 2B integrates **observed/analyzed sea ice** (`forecastHorizonHours = 0`). Future sea-ice predictions continue to be handled by downstream advection models (`seaIceModel.ts`).
* **Offline Caching:** Full offline synchronization store will be expanded in Phase 3.

---

## 9. Official Source References
1. Copernicus Marine Service Product Portfolio: `https://data.marine.copernicus.eu/product/SEAICE_GLO_SEAICE_L4_NRT_OBSERVATIONS_011_001`
2. EUMETSAT OSI SAF Sea Ice Concentration Manual (OSI-401-d): `https://osi-saf.eumetsat.int/products/osi-401-d`
