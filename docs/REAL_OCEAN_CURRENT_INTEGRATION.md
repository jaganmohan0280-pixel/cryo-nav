# CRYO NAV — Real Copernicus Marine Ocean Current Integration Specification

## 1. Executive Overview & Data Source
Phase 2C establishes CRYO NAV's second real Antarctic environmental data pipeline, introducing real 3D ocean hydrodynamics observations and analyses provided by the **Copernicus Marine Service (CMEMS)** / Mercator Ocean International.

* **Data Provider:** Mercator Ocean International / Copernicus Marine Service (CMEMS).
* **Product Name:** Global Ocean Physics Analysis and Forecast.
* **Product Identifier:** `GLOBAL_ANALYSISFORECAST_PHY_001_024`.
* **Target Dataset:** `cmems_mod_glo_phy-cur_anfc_0.083deg_P1D-m` (NEMO 3D Hydrodynamic Model Analysis).
* **Variables:**
  * `uo` / `u` / `eastward_velocity`: Eastward sea water velocity ($m/s$).
  * `vo` / `v` / `northward_velocity`: Northward sea water velocity ($m/s$).
* **Spatial Resolution:** 1/12° (~8 km grid resolution).
* **Temporal Resolution:** Daily mean / 24-hour cycles.
* **Depth / Level:** Surface level (`0.49 meters` top layer).
* **Coordinate Reference System:** `EPSG:4326` (WGS84 lat/lon grid).

---

## 2. Programmatic Access & Authentication
* **Access Mechanism:** Direct HTTPS REST query to Copernicus Marine THREDDS / Subsetter endpoint (`https://nrt.cmems-du.eu/thredds/dodsC/GLOBAL_ANALYSISFORECAST_PHY_001_024`) with HTTP Basic Authentication (`Authorization: Basic <base64>`) executed in `src/data/adapters/copernicusOceanCurrentAdapter.ts`.
* **Official Recommended Method Comparison:** Copernicus Marine officially recommends access via the **Copernicus Marine Toolbox (`copernicusmarine` CLI / Python API)**. The current Node.js Express server adapter performs direct HTTPS queries without requiring external Python CLI dependencies.
* **Server-Side Security:** Credentials (`COPERNICUS_MARINE_USER`, `COPERNICUS_MARINE_PASSWORD`) remain strictly on the Node.js Express server (`server.ts`). Credentials are NEVER exposed to the browser client.

---

## 3. Vector Mathematics & Normalization
From raw eastward ($u$) and northward ($v$) current velocities in $m/s$, the adapter computes oceanographic magnitude and flow heading:
$$\text{speedMetersPerSec} = \sqrt{u^2 + v^2}$$
$$\text{speedKnots} = \text{speedMetersPerSec} \times 1.94384$$
$$\text{headingDeg} = \left(\text{atan2}(u, v) \times \frac{180}{\pi} + 360\right) \pmod{360}$$

Normalized output adheres to `OceanCurrentCell`:
```typescript
export interface OceanCurrentCell {
  id?: string;
  lat: number;
  lon: number;
  currentSpeedKnots: number;
  currentHeadingDeg: number;
  depthMeters?: number;
  uMetersPerSec?: number;
  vMetersPerSec?: number;
  provenance?: DataProvenance;
  isRealData?: boolean;
}
```

---

## 4. Validation & Anti-Fabrication Policy
Before cells are ingested into application state, `validateOceanCurrentCell()` verifies:
* Latitude: `-90.0` to `90.0`
* Longitude: `-180.0` to `180.0`
* Speed range: `0.0` to `20.0 knots` (rejects `NaN`, `Infinity`, malformed values)
* Valid ISO timestamp.

**Data Integrity Directive:**
* Invalid, missing, or malformed observations/analyses are discarded.
* If remote Copernicus credentials or service calls fail, the server returns HTTP 401/503 with an explicit `realOceanCurrentError`.
* **NO DATA FABRICATION:** The platform does NOT generate replacement synthetic current vectors in REAL mode.

---

## 5. Provenance Metadata Specification
Every real ocean current response embeds full metadata (`DataProvenance`):
```json
{
  "source": "Copernicus Marine Service (CMEMS)",
  "provider": "Mercator Ocean International (NEMO 3D Hydrodynamic Model)",
  "datasetId": "GLOBAL_ANALYSISFORECAST_PHY_001_024",
  "granuleId": "cmems_mod_glo_phy-cur_anfc_0.083deg_P1D-m_2026-09-20.nc",
  "license": "Copernicus Open Data License (Free Distribution)",
  "observationTime": "2026-09-20T00:00:00.000Z",
  "ingestionTime": "2026-09-20T02:20:00.000Z",
  "validTime": "2026-09-20T00:00:00.000Z",
  "forecastHorizonHours": 0,
  "bbox": [-70.0, -68.5, -56.0, -59.0],
  "crs": "EPSG:4326",
  "spatialResolutionMeters": 8000,
  "temporalResolutionHours": 24,
  "processingLevel": "L4 (3D Hydrodynamic Model Analysis)",
  "dataAgeHours": 2,
  "freshnessState": "FRESH",
  "category": "ANALYSIS",
  "isSynthetic": false
}
```

---

## 6. Frontend UI & Map Integration
* **Mode Toggle:** Toggling between `DEMO MODE` and `REAL DATA` triggers parallel fetching of real sea-ice and real ocean-current fields.
* **Provenance Card:** `SeaIceView` displays a dedicated `REAL OCEAN HYDRODYNAMICS PIPELINE` card with provider, product ID, dataset, valid time, depth (surface 0.49m), freshness, and spatial bounding box.
* **Map Vector Overlay:** `AntarcticMap` renders solid vector polylines indicating real flow direction and magnitude in knots, tagged with interactive metadata tooltips detailing $u$ and $v$ components.
* **Failure Display:** Displays explicit error alert banners if credentials or Copernicus services fail, allowing users to manually switch back to DEMO mode.

---

## 7. Limitations & Trajectory Integrity Policy
* **Trajectory Model Scoping:** The baseline iceberg trajectory model (`trajectoryModel.ts`) continues operating on baseline inputs for demonstration purposes. **Real ocean currents are made available to application state, but trajectory model integration and scientific validation will occur in a later phase.**
* **Scientific Category:** Real ocean hydrodynamics from `GLOBAL_ANALYSISFORECAST_PHY_001_024` are strictly categorized as **REAL ANALYSIS / FORECAST**, preserving distinction from satellite observations.
