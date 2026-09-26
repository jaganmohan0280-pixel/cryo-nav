# CRYO NAV — Architecture Overview & Technical Design

**Current Architectural Baseline:** React 19 + TypeScript + Vite + Express (Node.js) + Leaflet  
**Target Domain:** Antarctic Sea-Ice & Iceberg Trajectory Decision Support  

---

## 1. Current System Architecture (Prototype Baseline)

The current implementation of CRYO NAV is structured as a single-repository full-stack web application designed for interactive decision support and scenario evaluation.

```
+-----------------------------------------------------------------------------------+
|                                  USER BROWSER                                     |
|  +-----------------------------------------------------------------------------+  |
|  |                             REACT FRONTEND UI                               |  |
|  |  +------------------+  +-------------------+  +--------------------------+  |  |
|  |  | Views & Widgets  |  | AppContext Store  |  | Antarctic Map (Leaflet)  |  |  |
|  |  +------------------+  +-------------------+  +--------------------------+  |  |
|  +-----------------------------------------------------------------------------+  |
+----------------------------------------|------------------------------------------+
                                         | HTTP / REST API
+----------------------------------------v------------------------------------------+
|                            EXPRESS BACKEND SERVER                                 |
|  +------------------+  +----------------------------+  +-----------------------+  |
|  | /api/health      |  | /api/telemetry/live        |  | /api/gemini/assistant |  |
|  | Health Check     |  | Open-Meteo & ECMWF Proxy   |  | Gemini AI Proxy       |  |
|  +------------------+  +----------------------------+  +-----------------------+  |
+----------------------------------------|------------------------------------------+
                                         | Outbound HTTPS
                 +-----------------------+-----------------------+
                 |                                               |
                 v                                               v
   +---------------------------+                   +---------------------------+
   |     Open-Meteo API        |                   |    Google Gemini API      |
   | (Live Southern Ocean Feed)|                   | (Polar Nav Decision LLM)  |
   +---------------------------+                   +---------------------------+
```

---

## 2. Frontend Layer Architecture

- **Framework & Build:** React 19 + TypeScript (~5.8), bundled via Vite 6.
- **Styling & UI:** Vanilla CSS + TailwindCSS v4 with Lucide React icons & Motion animation.
- **GIS Map Rendering:** Leaflet (v1.9.4) rendering polar stereographic / standard projected tiles with custom vector layers for sea-ice heatmaps, iceberg position markers, drift vectors, uncertainty rings, and recommended route poly lines (`AntarcticMap.tsx`).
- **State Management:** Master React Context (`AppContext.tsx`) managing global operational state, active mission configuration, vessel selection, environmental layer visibility, scenario perturbation multipliers, and simulated real-time GPS tracking loop.

### 2.1 Component Structure

- **`src/views/`**:
  - `DashboardView.tsx`: Executive polar situational awareness, risk matrix, active alerts, route comparison, and interactive map preview.
  - `MissionPlanningView.tsx`: Mission parameter configuration, waypoint editing, vessel selection, and exclusion zone configuration.
  - `NavigationView.tsx`: Real-time navigation bridge view with GPS simulation controls, cross-track error, heading, speed, and turn-by-turn waypoint guidance.
  - `IcebergsView.tsx`: Iceberg tracking catalog, closest approach (CPA) risk table, drift trajectory vectors, and size classification.
  - `SeaIceView.tsx`: Sea-ice concentration field, stage of development (open drift, close pack, fast ice), and 72-hour forecast timeline control.
  - `DataAcquisitionView.tsx`: Decision Impact Engine UI for prioritizing satellite observation products based on Value of Information (VoI).
  - `AiAssistantView.tsx`: Interactive decision-support chat powered by Gemini AI with quick queries and context-grounded reasoning.
  - `ResearchReferencesView.tsx`: Reference catalog of polar oceanography papers and satellite missions.
  - `SettingsView.tsx`: Vessel fleet registry management and API credentials status monitoring.

- **`src/components/`**:
  - `Header.tsx`: System header bar, connection state status indicator, and navigation view tabs.
  - `Sidebar.tsx`: Navigation sidebar menu.
  - `RoutePlannerWidget.tsx`: Quick route selector (SAFEST / BALANCED / FASTEST) and summary metrics card.
  - `TimelineSlider.tsx`: Interactive forecast horizon slider (+0h to +72h).
  - `Map/AntarcticMap.tsx`: Leaflet map component with custom vector layers.

---

## 3. Core Scientific Models & Decision Engines (Baseline Implementations)

> [!NOTE]
> All analytical models currently implemented in `src/services/` are baseline physics-informed algorithms and baseline rule models. They serve as functional decision-support demonstrations.

- **`seaIceModel.ts` (Baseline Sea-Ice Model):**
  - Advection-thermodynamic baseline predicting sea-ice concentration shifts across a 72-hour forecast horizon using wind velocity and air temperature.
  - Output: Cell-by-cell concentration percentage, ice stage, thickness, and uncertainty metric.

- **`trajectoryModel.ts` (Baseline Iceberg Trajectory Model):**
  - Lagrangian point-mass drift model calculating iceberg advection under combined atmospheric wind shear (2% rule) and ocean surface current drag.
  - Output: Drift trajectory points (+6h to +72h) with expanding uncertainty radii.

- **`riskEngine.ts` (Baseline Risk Assessment Engine):**
  - Computes composite risk indices (0–100) combining sea-ice concentration penalty, iceberg proximity hazard, wave height penalty, and vessel ice-class rating.

- **`confidenceEngine.ts` (Phase 4 Uncertainty & Decision Confidence Engine):**
  - Deterministic explainable decision confidence engine evaluating 10 factor categories across data quality, freshness, temporal alignment, spatial coverage, forecast horizon, trajectory uncertainty, sea-ice uncertainty, weather quality, ocean quality, and model limitations.
  - Output: `DecisionConfidenceResult` (`HIGH`, `MEDIUM`, `LOW`, `CRITICAL`), primary limiting factor, recommended verification actions, and recommendation blocking flags (`isRecommendationBlocked`).

- **`counterfactualEngine.ts` (Phase 5 Counterfactual & Sensitivity Analysis Engine):**
  - Structured WHAT-IF decision-support engine testing route recommendation stability under controlled perturbations of ocean currents, wind, iceberg drift, sea-ice concentration, and uncertainty bounds.
  - Output: `CounterfactualRouteResult`, `SensitivityResult`, and `BatchSensitivitySummary` with stability classifications (`ROBUST`, `SENSITIVE`, `HIGHLY_SENSITIVE`), $\Delta\text{Risk}, \Delta\text{ETA}, \Delta\text{Fuel}, \Delta\text{Distance}$, structured 3-part natural language explanations ("What changed? Why did it matter? Did recommendation change?"), and provenance tracking (`COUNTERFACTUAL SCENARIO — NOT OBSERVED DATA`).

- **`routingEngine.ts` (Uncertainty-Aware Route Generator):**

  - Evaluates multi-objective routing criteria across waypoints to generate 3 alternative transit corridors:
    1. **SAFEST:** Avoids pack ice and maintains max distance (>5.0 nm) from iceberg drift paths.
    2. **BALANCED:** Recommended trade-off between transit distance, fuel burn, and acceptable risk.
    3. **FASTEST:** Direct corridor prioritizing ETA while accepting higher sea-ice concentration.
  - Integrates Phase 4 Decision Confidence: applies conservative risk treatment (+40% penalty) under `LOW` confidence, flags `[VERIFICATION RECOMMENDED]` under `MEDIUM`, and explicitly sets `isRecommendationBlocked: true` under `CRITICAL` confidence.

- **`cdseStacAdapter.ts` (Phase 7A Real CDSE STAC Satellite Catalogue Adapter):**
  - Queries the official Copernicus Data Space Ecosystem STAC API (`https://stac.dataspace.copernicus.eu/v1/search`) to discover real Sentinel-1 products for the mission corridor.
  - Normalizes GeoJSON STAC features into `SatelliteCatalogueItem` records, preserves ESA granule IDs, and feeds items into `decisionImpactEngine.ts`.

- **`satelliteCache.ts` (Phase 7B Satellite Product Acquisition & Local Cache):**
  - Handles local filesystem cache management (`./cache/satellite/`), filename sanitization (`sanitizeFilename`), path traversal security (`assertPathInCache`), SHA-256 integrity calculation, and JSON metadata persistence (`<productId>.meta.json`).
  - Express server endpoint `POST /api/satellite/acquire` validates host whitelist (`stac.dataspace.copernicus.eu`, `zipper.dataspace.copernicus.eu`, etc.), streams bytes over HTTPS directly to disk, and computes SHA-256 digests.
  - Downloaded products display **`PROCESSING: NOT YET PERFORMED`** (imagery processing deferred to Phase 7C).

---

## 4. Backend Layer Architecture


- **Runtime & Framework:** Express 4 on Node.js, executed via `tsx` in development and bundled via `esbuild` for production (`dist/server.cjs`).
- **Endpoints (`server.ts`):**
  - `GET /api/health`: System health status and environment metadata.
  - `GET /api/system/credentials-status`: Diagnostic endpoint reporting API key presence and telemetry feed status.
  - `GET /api/environment/sea-ice`: Real Copernicus Marine sea-ice concentration adapter endpoint.
  - `GET /api/environment/ocean-currents`: Real Copernicus Marine NEMO 3D ocean hydrodynamics endpoint.
  - `GET /api/environment/icebergs`: Real US National Ice Center (USNIC) Antarctic iceberg database endpoint.
  - `GET /api/environment/weather`: Real ECMWF IFS 0.25° weather forecast endpoint.
  - `GET /api/satellite/catalogue`: Real Copernicus Data Space Ecosystem (CDSE) STAC satellite catalogue search endpoint.
  - `GET /api/telemetry/live`: Proxy endpoint fetching real-time weather and marine telemetry from Open-Meteo & ECMWF for specified polar coordinates.
  - `POST /api/gemini/assistant`: Express backend proxy invoking `@google/genai` with system prompt grounding and environment context payload.


---

## 5. Data Architecture (Synthetic vs Live)

- **Synthetic Antarctic Dataset (`syntheticAntarcticData.ts`):** Baseline dataset modeling the Marguerite Bay / Antarctic Peninsula sector (-67.57°S, -68.13°W), including 6 vessel profiles (e.g. RRS Sir David Attenborough, RV Nathaniel B. Palmer), 6 tracked tabular icebergs (e.g. ICB-A76A, ICB-902), 49 sea-ice grid cells, and satellite observation swaths.
- **Live Telemetry Feed:** Real-time Southern Ocean observational telemetry queried dynamically from Open-Meteo & ECMWF APIs when online.

---

## 6. Future Target Architecture (Planned - NOT Implemented in Phase 0)

> [!CAUTION]
> The components listed below represent the planned long-term architectural evolution. They are **NOT** implemented in Phase 0 and must not be treated as existing operational components.

```
                                  FUTURE TARGET ARCHITECTURE
                                    (Planned Evolution)

+-----------------------------------------------------------------------------------+
|                               Persistent Local Cache                              |
|                              (IndexedDB / RxDB / SQLite)                          |
+-----------------------------------------------------------------------------------+
                                         ^
                                         |
+----------------------------------------v------------------------------------------+
|                              FastAPI Microservices                                |
|  +---------------------+  +------------------------+  +------------------------+  |
|  | Copernicus / Sentinel|  | High-Fidelity Physics   |  |  A* / Fast Marching    |  |
|  | Satellite Adapter   |  | Hydrodynamic Drift     |  | Grid Routing Engine    |  |
|  +---------------------+  +------------------------+  +------------------------+  |
+----------------------------------------|------------------------------------------+
                                         ^
                                         |
+----------------------------------------v------------------------------------------+
|                             Persistent Geospatial DB                              |
|                          (PostgreSQL + PostGIS Extension)                         |
+-----------------------------------------------------------------------------------+
```

- **Geospatial Database:** PostgreSQL + PostGIS for spatial queries, raster sea-ice grids, and historical iceberg trajectory logs.
- **Microservice Layer:** Python FastAPI microservices executing coupled ice-ocean hydrodynamic models and satellite SAR processing pipelines.
- **Continuous Backtesting:** Model validation engine testing predictions against archived buoy tracks.
