# CRYO NAV — Real Antarctic Iceberg Data Integration

**System:** CRYO NAV — AI-Enabled Antarctic Sea-Ice, Iceberg Trajectory & Navigation Decision Support System  
**Phase:** Phase 2D — Real Antarctic Iceberg Data Integration  
**Date:** September 20, 2026  

---

## 1. Source & Provider
- **Source:** US National Ice Center (USNIC) / Naval Ice Center
- **Provider:** US National Ice Center Antarctic Iceberg Tracking Database
- **Authority:** Official US operational agency for iceberg tracking in Antarctic polar waters

---

## 2. Dataset Identifier
- **Dataset ID:** `USNIC_ANTARCTIC_ICEBERG_DATABASE`
- **Product Name:** USNIC Tracked Antarctic Icebergs Catalog
- **Category:** `REAL OBSERVATION`

---

## 3. Access Method & Backend Architecture
- **Browser Interaction:** Browser queries backend Express endpoint `GET /api/environment/icebergs`.
- **Backend Access:** Server executes `fetchUsnicIcebergData(bounds)` via HTTP GET / GeoJSON WFS endpoint.
- **Security & Privacy:** Backend handles all external HTTP queries; client credentials and private tokens are isolated from browser execution.

---

## 4. Data Format
- **Format:** GeoJSON FeatureCollection / Normalized JSON payload.
- **Structure:** Contains feature attributes including `ICEBERG_ID`, `LATITUDE`, `LONGITUDE`, `OBSERVATION_DATE`, `LENGTH_KM`, `WIDTH_KM`, `AREA_KM2`, `SOURCE`.

---

## 5. Fields Ingested & Mapping
| Source Field | CRYO NAV Target Field | Type | Handling / Fallback |
| :--- | :--- | :--- | :--- |
| `ICEBERG_ID` / `name` | `id` / `name` | string | Mandatory string (e.g. `A-76A`) |
| `LATITUDE` / `lat` | `latitude` | number | Mandatory float (-90.0 to -50.0) |
| `LONGITUDE` / `lon` | `longitude` | number | Mandatory float (-180.0 to 180.0) |
| `OBSERVATION_DATE` | `observationTime` | ISO timestamp | ISO Date string; null if unprovided |
| `LENGTH_KM` / `length` | `lengthMeters` | number | Derived in meters if provided, else null |
| `WIDTH_KM` / `width` | `widthMeters` | number | Derived in meters if provided, else null |
| `AREA_KM2` / `area` | `areaSqKm` | number | Derived in $km^2$ if provided, else null |
| `SOURCE` | `provenance.source` | string | "US National Ice Center (USNIC)" |

---

## 6. Spatial Coverage
- **Coverage Region:** Antarctic Polar Waters / Southern Ocean
- **Mission Bounding Box:** `[-70.0, -68.5, -56.0, -59.0]` (Antarctic Peninsula / Marguerite Bay sector)
- **Bounding Box Query:** Backend passes spatial bounding box parameters to filter active icebergs dynamically.

---

## 7. Update Frequency
- **Update Cycle:** Operational updates occur every 24 to 72 hours based on satellite SAR/visible overpass availability and analyst tracking workflows.
- **Freshness Classification:**
  - `FRESH`: Data age < 48 hours
  - `AGING`: Data age 48–120 hours
  - `STALE`: Data age > 120 hours

---

## 8. Validation Rules
The `validateIcebergRecord` function enforces strict empirical checks:
1. **Latitude:** Must be between `-90.0` and `-50.0` (Antarctic polar coordinates).
2. **Longitude:** Must be between `-180.0` and `180.0`.
3. **Identifier:** Must be present and non-empty.
4. **Dimensions:** If provided, `length`, `width`, and `area` must be non-negative numeric values.
5. **Timestamp:** If provided, must parse into a valid ISO date object.

*Any record failing validation is rejected immediately. No missing values are replaced with fabricated coordinates or dummy timestamps.*

---

## 9. Normalization & Category Mapping
Derived fields are calculated deterministically without altering raw source measurements:
- **Size Category (`deriveSizeCategory`):**
  - Length > 10 km: `VERY_LARGE` (Tabular Mega-berg)
  - Length 3–10 km: `LARGE`
  - Length 1–3 km: `MEDIUM`
  - Length 100m–1km: `SMALL`
  - Length < 100m: `BERGY_BIT` / `GROWLER`
- **Missing Dimensions:** Unprovided dimensions render explicitly as `"Not provided by source"`.

---

## 10. Data Provenance Metadata
Every normalized `IcebergDetection` returned by the endpoint includes a complete `DataProvenance` object:
```json
{
  "source": "US National Ice Center (USNIC)",
  "provider": "USNIC Antarctic Iceberg Database",
  "dataset": "USNIC_ANTARCTIC_ICEBERG_DATABASE",
  "recordId": "A-76A",
  "observationTime": "2026-09-18T12:00:00.000Z",
  "retrievalTime": "2026-09-20T02:30:00.000Z",
  "dataAgeHours": 38.5,
  "freshness": "FRESH",
  "coverage": "Antarctic Peninsula Bounding Box [-70.0, -68.5, -56.0, -59.0]",
  "mode": "REAL",
  "category": "REAL OBSERVATION"
}
```

---

## 11. Map Rendering & Interaction
- **REAL Mode Visualization:** Leaflet map displays real iceberg coordinates using diamond markers with catalog identifiers.
- **Marker Interaction:** Clicking an iceberg marker opens the Iceberg Inspection Panel displaying:
  - Iceberg Identifier (e.g. `A-76A`)
  - Precise Latitude & Longitude
  - Observation / Update Time
  - Source & Provider Name
  - Data Age & Freshness State
  - Dimensions (Length, Width, Area) or `"Not provided by source"`
- **Historical Track:** Displays historical track points only if explicitly provided in USNIC catalog records. No track is generated from a single point.

---

## 12. Failure Handling & Non-Fabrication Policy
- **Failure Conditions:** Network timeout, endpoint 5xx error, missing remote data, malformed GeoJSON.
- **Behavior in REAL Mode:**
  - Endpoint returns HTTP status 503/400 with detailed JSON error object (`{ error: "USNIC iceberg data service unavailable", details: ... }`).
  - Frontend catches error, sets `realIcebergError`, and displays a red warning banner: `REAL ICEBERG DATA UNAVAILABLE`.
  - **Zero Fabrication:** Synthetic iceberg records are NEVER silently substituted when REAL mode is active.

---

## 13. System Limitations
1. **Analyst Delay:** Tracking updates depend on USNIC analyst overpass review schedules (24–72h lag).
2. **Detection Threshold:** Sub-kilometer icebergs and growlers below satellite SAR resolution are generally absent from catalog data.

---

## 14. What This Phase Does NOT Provide
1. **No AI SAR Object Detection:** Does not run optical/SAR image segmentation algorithms.
2. **No Automatic Trajectory Validation:** Real iceberg observations are stored as baseline inputs; they do NOT automatically convert `trajectoryModel.ts` into a scientifically validated model.
3. **No Dynamic Drift Prediction in REAL Mode:** Real catalog positions are presented as pure observed state.
