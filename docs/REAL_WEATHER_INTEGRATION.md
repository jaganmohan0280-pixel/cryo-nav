# CRYO NAV — Real Antarctic Weather Data Integration

**System:** CRYO NAV — AI-Enabled Antarctic Sea-Ice, Iceberg Trajectory & Navigation Decision Support System  
**Phase:** Phase 2E — Real Antarctic Weather Data Integration  
**Date:** September 20, 2026  

---

## 1. Source & Authority
- **Source:** European Centre for Medium-Range Weather Forecasts (ECMWF)
- **Model:** ECMWF Integrated Forecasting System (IFS 0.25° High-Resolution Global Atmospheric Model)
- **Authority:** World-leading global numerical weather prediction center

---

## 2. API Provider & Access Mechanism
- **Provider:** Open-Meteo ECMWF API (`https://open-meteo.com/en/docs/ecmwf-api`)
- **Backend Architecture:** Express backend endpoint `GET /api/environment/weather` queries Open-Meteo ECMWF API (`https://api.open-meteo.com/v1/forecast?models=ecmwf_ifs025`).
- **Security & Client Isolation:** The browser client NEVER makes direct external calls to third-party APIs. All external HTTP requests are mediated, validated, and normalized by the Express server.

---

## 3. Ingested Weather Variables & Explicit Units
| Variable Name | ECMWF Field Name | CRYO NAV Field | Explicit Unit | Range / Fallback |
| :--- | :--- | :--- | :--- | :--- |
| **Air Temperature (2m)** | `temperature_2m` | `airTempC` | °C (Degrees Celsius) | -100°C to +60°C |
| **Wind Speed (10m)** | `wind_speed_10m` | `windSpeedMetersPerSec` / `windSpeedKnots` | m/s & knots ($1 \text{ m/s} = 1.94384 \text{ kts}$) | $\ge 0 \text{ m/s}$ |
| **Wind Direction (10m)** | `wind_direction_10m` | `windDirectionDeg` | Degrees (0°–360° True) | 0° to 360° |
| **Wind Gusts (10m)** | `wind_gusts_10m` | `windGustMetersPerSec` / `windGustKnots` | m/s & knots | $\ge 0 \text{ m/s}$ or "Not provided by source" |
| **Visibility** | `visibility` | `visibilityMeters` / `visibilityNm` | Meters, km & NM ($1 \text{ NM} = 1852 \text{ m}$) | $\ge 0 \text{ m}$ or "Not provided by source" |
| **Cloud Cover** | `cloud_cover` | `cloudCoverPercent` | % (Percentage 0–100%) | 0% to 100% or "Not provided by source" |
| **Precipitation** | `precipitation` | `precipitationMmPerHour` | mm/h (Millimeters per hour) | $\ge 0 \text{ mm/h}$ or "Not provided by source" |
| **Surface Pressure** | `surface_pressure` | `barometricPressureHpa` | hPa (Hectopascals) | 800 hPa to 1100 hPa |
| **Forecast Valid Time** | `time` | `validTime` / `timestamp` | ISO 8601 UTC Timestamp | Valid ISO Date String |

---

## 4. Spatial & Temporal Resolution
- **Spatial Bounds:** Antarctic Peninsula Sector (`[-70.0, -68.5, -56.0, -59.0]`) centered at Marguerite Bay (`-64.5°S, -64.2°W`).
- **Grid Resolution:** 0.25° grid (~25 km spatial resolution).
- **Temporal Step:** 1-hour model forecast resolution up to +240 hours.

---

## 5. Forecast Timestamps & Freshness
- **Initialization Run Time:** Timestamp of ECMWF model initialization (00:00 UTC / 12:00 UTC runs).
- **Forecast Valid Time:** Target validity timestamp of the forecast state.
- **Retrieval Time:** Server-side ingestion timestamp.
- **Data Age:** Calculated age in hours from system execution time.
- **Freshness Classification:**
  - `FRESH`: Data age < 6 hours
  - `AGING`: Data age 6–24 hours
  - `STALE`: Data age > 24 hours

---

## 6. Validation Rules
The `validateWeatherRecord` function validates every weather record prior to state ingestion:
1. **Latitude:** Range between `-90.0` and `90.0`.
2. **Longitude:** Range between `-180.0` and `180.0`.
3. **Air Temperature:** Finite numeric value between `-100.0°C` and `60.0°C`.
4. **Wind Speed:** Non-negative finite numeric value.
5. **Wind Direction:** Range between `0` and `360` degrees.
6. **Barometric Pressure:** Finite numeric value between `800.0 hPa` and `1100.0 hPa`.
7. **Timestamp:** Valid parseable ISO 8601 date string.

*Records failing validation are rejected. Invalid numeric values are never silently repaired or replaced with dummy values.*

---

## 7. Data Provenance Metadata
Every real weather dataset returned to the frontend carries complete `DataProvenance`:
```json
{
  "source": "ECMWF (European Centre for Medium-Range Weather Forecasts)",
  "provider": "Open-Meteo ECMWF API",
  "datasetId": "ECMWF_IFS_GLOBAL_FORECAST",
  "granuleId": "ecmwf_ifs_2026-09-20T00:00.json",
  "license": "ECMWF Open Data Licence / CC-BY-4.0",
  "observationTime": "2026-09-20T00:00:00.000Z",
  "publicationTime": "2026-09-20T00:00:00.000Z",
  "ingestionTime": "2026-09-20T02:40:00.000Z",
  "validTime": "2026-09-20T02:00:00.000Z",
  "forecastHorizonHours": 0,
  "bbox": [-70.0, -68.5, -56.0, -59.0],
  "crs": "EPSG:4326",
  "spatialResolutionMeters": 25000,
  "temporalResolutionHours": 1,
  "processingLevel": "L4 Global Atmospheric Model Forecast",
  "qcFlag": "PASSED",
  "confidenceScore": 92,
  "dataAgeHours": 0,
  "freshnessState": "FRESH",
  "category": "FORECAST",
  "isSynthetic": false
}
```

---

## 8. REAL vs DEMO Mode Behavior
- **REAL Mode (`environmentalMode === 'REAL'`):** Uses ONLY real ECMWF IFS weather forecast responses fetched from `/api/environment/weather`.
- **DEMO Mode (`environmentalMode === 'DEMO'`):** Uses baseline `SYNTHETIC_WEATHER` data.
- **Failure Policy:** If the ECMWF/Open-Meteo API call fails or disconnects in REAL mode, the application sets `realWeatherError` and displays an explicit UI error banner: `REAL WEATHER DATA UNAVAILABLE`. **Zero synthetic weather data is substituted.**

---

## 9. Map & Inspection Visuals
- **Leaflet Map:** Map renders real ECMWF weather forecast sampling points with an unobtrusive `REAL FORECAST` badge.
- **Weather Inspector Popup:** Clicking a weather marker displays all normalized weather variables with explicit units, validity timestamps, model identification, data provider, and freshness status.

---

## 10. Scientific Limitations & Honesty Statement
> *"CRYO NAV currently ingests real ECMWF IFS weather forecasts. These forecasts are displayed as environmental inputs. Weather-driven iceberg trajectory prediction and weather-aware route optimization are not yet claimed in this phase."*
