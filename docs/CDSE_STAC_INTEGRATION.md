# CRYO NAV — CDSE STAC Satellite Catalogue Integration Documentation

## 1. Objective & Operational Scope

The **Copernicus Data Space Ecosystem (CDSE) STAC Satellite Catalogue Adapter** (Phase 7A) replaces static local metadata with real-time satellite product discovery directly from the official Copernicus Data Space STAC API (`https://stac.dataspace.copernicus.eu/v1`).

> **Operational Scope**: Catalogue **DISCOVERY and PRIORITIZATION** of available Sentinel-1 radar products relevant to the active navigation decision.
> 
> **Explicit Boundary**: Discovered products are labeled **`CATALOGUE ITEM — NOT YET ACQUIRED`**. Phase 7A does **NOT** download raster granules, execute SAR image processing, or fabricate synthetic observations.

---

## 2. API Architecture & Query Endpoint

- **Official CDSE STAC Base URL**: `https://stac.dataspace.copernicus.eu/v1`
- **Search Endpoint**: `POST https://stac.dataspace.copernicus.eu/v1/search`
- **Server API Proxy**: `GET /api/satellite/catalogue` in [`server.ts`](file:///c:/Users/JAGAN%20MOHAN/OneDrive/Desktop/cryo-nav%20-%20Copy/cryo-nav%20-%20Copy/server.ts)

### Query Parameters
- `bbox`: Mission corridor bounding box `[minLon, minLat, maxLon, maxLat]` (Default: Antarctic Peninsula `[-70.0, -68.5, -56.0, -59.0]`)
- `datetime`: Temporal range `[startTime]/[endTime]` (Default: configurable 72h look-back window)
- `collections`: `['sentinel-1-grd', 'sentinel-1-slc']`
- `limit`: Maximum item limit (Default: 20, max 50)

---

## 3. Normalized STAC Data Model (`SatelliteCatalogueItem`)

Every raw STAC Feature item returned by CDSE is normalized into [`SatelliteCatalogueItem`](file:///c:/Users/JAGAN%20MOHAN/OneDrive/Desktop/cryo-nav%20-%20Copy/cryo-nav%20-%20Copy/src/types.ts):

| Field | Description | Source Mapping |
| :--- | :--- | :--- |
| `id` | Original STAC Item ID | `feature.id` |
| `collection` | STAC collection identifier | `feature.collection` (`sentinel-1-grd` / `sentinel-1-slc`) |
| `geometry` | GeoJSON Polygon geometry | `feature.geometry` |
| `bbox` | Positional spatial bounding box | `feature.bbox` |
| `acquisitionTime` | Observation timestamp | `properties.datetime` |
| `platform` | Satellite platform name | `properties.platform` (e.g. `Sentinel-1A`, `Sentinel-1D`) |
| `instrument` | Sensor type | `properties.instruments` (`SAR`) |
| `productType` | Product mode | `properties.s1:product_type` (`GRD`, `SLC`) |
| `processingLevel` | Processing status | `properties.s1:processing_level` (`LEVEL1`) |
| `orbitDirection` | Pass trajectory | `properties.sat:orbit_state` (`ASCENDING` / `DESCENDING`) |
| `provenance` | Full Data Provenance metadata | Attached `DataProvenance` model |

---

## 4. Decision-Impact Integration Pipeline

Discovered CDSE STAC items feed directly into the Phase 6 Value-of-Information (VoI) Decision Impact Engine:

$$\text{CDSE STAC Result} \longrightarrow \text{Normalized STAC Item} \longrightarrow \text{Candidate Acquisition Product} \longrightarrow \text{Decision Impact Engine} \longrightarrow \text{Priority Ranking}$$

- **Decision Relevance ($R_{\text{decision}}$)**: Matches SAR capabilities against Phase 4 Decision Confidence limiting factors (`ICEBERG TRAJECTORY UNCERTAINTY`).
- **Spatial Relevance ($S_{\text{overlap}}$)**: Geometrically intersects STAC bbox/polygon against active recommended route corridors.
- **Counterfactual Sensitivity ($S_{\text{sensitivity}}$)**: Boosts product score if the decision is `HIGHLY_SENSITIVE` to iceberg drift or sea-ice concentration.

---

## 5. REAL vs DEMO Operational Mode Isolation

- **`REAL` Mode**: Queries the live CDSE STAC API. If the API returns zero matches, displays **`NO MATCHING CDSE PRODUCTS`**. If the API fails or is unreachable, displays **`CDSE CATALOGUE UNAVAILABLE`**. **Zero synthetic satellite metadata is substituted.**
- **`DEMO` Mode**: Uses synthetic local satellite metadata explicitly tagged as `DEMO / SYNTHETIC DATA`.

---

## 6. Security & Parameter Sanitization

1. **Proxy Endpoint Control**: `GET /api/satellite/catalogue` strictly forwards queries to `https://stac.dataspace.copernicus.eu/v1/search`. No arbitrary URL proxying is allowed.
2. **Collection Whitelisting**: Requests are restricted to validated collections (`SENTINEL-1`, `SENTINEL-2`, `SENTINEL-3`, `SENTINEL-5P`).
3. **Open-Access Search**: CDSE STAC search discovery does not require API keys or credentials.

---

## 7. Product Acquisition & Local Caching (Phase 7B)

1. **Acquisition Endpoint**: Discovered CDSE STAC items can be acquired via `POST /api/satellite/acquire`.
2. **Local Caching**: Acquired products are streamed to `./cache/satellite/` with SHA-256 integrity verification.
3. **Boundary Disclaimer**: Acquired products display **`PROCESSING: NOT YET PERFORMED`**. Raster processing and feature extraction are deferred to Phase 7C.

