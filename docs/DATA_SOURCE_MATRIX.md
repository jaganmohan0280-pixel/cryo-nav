# CRYO NAV — Real Antarctic Data Source Reconnaissance Matrix

**System:** CRYO NAV — AI-Enabled Antarctic Sea-Ice, Iceberg Trajectory & Navigation Decision Support System  
**Phase:** Phase 2A — Real Antarctic Data Source Reconnaissance  
**Verification Date:** September 19, 2026  

---

## Authoritative Data Source Matrix

The matrix below details candidate and selected real-world Antarctic Earth Observation (EO), oceanographic, cryospheric, and atmospheric data sources investigated for CRYO NAV integration.

| Data Category | Source / Institution | Product / API Identifier | Data Type | Spatial Resolution | Temporal Resolution | Freshness / Lag | Antarctic Coverage | Access Method | Authentication | Data Format | Historical Archive | Forecast Horizon | CRYO NAV Target Use | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Sea Ice** | EUMETSAT OSI SAF / Copernicus Marine | `SEAICE_GLO_SEAICE_L4_NRT_OBSERVATIONS_011_001` (OSI-401-d / OSI-408-a) | Observation (Satellite Passive Microwave L4) | 10 km grid (OSI-401) / 4 km (OSI-408 AMSR2) | Daily | 2–6 hours (NRT) | Global (Full Antarctic polar coverage) | Copernicus Marine Toolbox / REST API / Subsetter | Credentials Required (Free Copernicus Account) | NetCDF-4 | 1978 – Present | Observation NRT (0h) | `SeaIceCell` spatial concentration matrix & stage | **VERIFIED (ACTIVE)** |
| **Sea Ice** | NSIDC (National Snow & Ice Data Center) | `NSIDC-0051` (Sea Ice Concentrations from Nimbus-7 SMMR and DMSP SSM/I-SSMIS) | Observation (Satellite L3) | 25 km polar stereographic grid | Daily | 1–2 days | Antarctic Polar Stereographic | HTTPS / FTP / NSIDC DAAC API | Open Access (Optional Earthdata Login) | NetCDF-4 / GeoTIFF | 1978 – Present | Observation NRT | Historical backtesting & sea-ice baseline | **VERIFIED** |
| **Sea Ice** | NOAA STAR | `NOAA-STAR-ICE-CONC-ANT` | Observation | 10 km grid | Daily | 12 hours | Southern Ocean | HTTPS REST | Open Access | NetCDF-4 | 2012 – Present | Observation NRT | Secondary validation for sea-ice concentration | **LIKELY** |
| **Ocean Currents** | Copernicus Marine (CMEMS) | `GLOBAL_ANALYSISFORECAST_PHY_001_024` (NEMO Hydrodynamic Model) | Forecast / Reanalysis (3D Ocean) | 1/12° (~8 km grid) | Hourly & Daily | NRT Daily forecast | Global Ocean (Includes Southern Ocean) | Copernicus Marine API / OPENDAP / REST | Credentials Required (Free Copernicus Account) | NetCDF-4 | 1993 – Present | +0h to +240h (10-day forecast) | `OceanCurrentCell` surface velocity & ocean hydrodynamics | **VERIFIED (ACTIVE)** |
| **Ocean Currents** | Copernicus Marine (CMEMS) | `MULTIOBS_SO_PHY_REP_015_004` | Observation (Satellite Altimetry + Drifters) | 1/4° (~25 km grid) | Daily | Weekly | Southern Ocean (-40°S to -78°S) | Copernicus Marine Subsetter | Credentials Required (Free Copernicus Account) | NetCDF-4 | 1993 – Present | Observation (Reanalysis) | Deep ocean current shear & geostrophic drift | **VERIFIED** |
| **Weather** | Open-Meteo & ECMWF | Open-Meteo Polar Weather & ECMWF Marine Telemetry API | Observation & Forecast | 0.1° (~11 km grid) | Hourly | Real-Time / Live | Global (Includes Antarctic Peninsula) | HTTPS REST API | Open Access (No API key needed) | JSON | 1940 – Present (ERA5) | +0h to +168h (7-day forecast) | `WeatherCondition` wind speed/dir, air/sea temp, waves, pressure | **VERIFIED (ACTIVE)** |
| **Weather** | ECMWF | ERA5 Reanalysis & HRES Global Forecast | Reanalysis & Forecast | 0.25° (~28 km grid) | Hourly | 5 days (ERA5) / Real-time (HRES) | Global | ECMWF CDS API / AWS S3 Open Data / Open-Meteo | Open Access / API Key | GRIB2 / NetCDF-4 / JSON | 1940 – Present | +0h to +240h | Weather risk calculation & icing hazard model | **VERIFIED (ACTIVE)** |
| **Iceberg Tracking** | US National Ice Center (USNIC) | USNIC Antarctic Iceberg Tracking Database | Analyst Observation (SAR + Visible) | Point Coordinates (Center + Dimensions) | Weekly (or per major event) | 1–7 days | Antarctic Waters (All named icebergs >10 nm) | HTTPS Download / Web Feature Service | Open Access (No credentials) | GeoJSON / CSV / KML | 1976 – Present | Historical track only | `IcebergDetection` position, size class, & ID | **VERIFIED (ACTIVE)** |
| **Iceberg Tracking** | BYU Center for Remote Sensing / NASA SCP | BYU Antarctic Iceberg Tracking Database | Scatterometer Observation (ASCAT/QuikSCAT) | Point Track Coordinates | Daily to Weekly | Historical / Semi-NRT | Southern Ocean Polar Waters | HTTPS / FTP Download | Open Access (No credentials) | ASCII Text / CSV | 1992 – Present | Historical drift tracks | Long-term iceberg trajectory validation & backtesting | **VERIFIED** |
| **Iceberg Detection** | Satellite SAR (Sentinel-1) | Derived Sentinel-1 SAR Object Detections (CDSE STAC) | Satellite Feature Extraction | 10m–20m ground resolution | 1–3 days (pass overlap) | 2–6 hours post-pass | Antarctic Peninsula / Sentinel swaths | CDSE STAC API / S3 | Credentials Required for S3 Assets | GeoJSON / COG | 2014 – Present | Observation (Pass timestamp) | High-resolution iceberg detection & position refinement | **LIKELY** |
| **Satellite Metadata** | Copernicus Data Space Ecosystem (CDSE) | CDSE STAC API (`https://stac.dataspace.copernicus.eu/v1`) | Satellite Product Metadata Catalog | Footprint Polygon & Metadata | Per Satellite Orbit Pass | Real-Time Cataloging | Global (Sentinel-1 SAR / Sentinel-2 MSI) | STAC REST API | Open Access for Metadata (S3 Assets require OAuth2 Token) | JSON STAC Item | 2014 – Present | Observation metadata | `SatelliteProduct` Decision-Impact Engine Value of Information | **VERIFIED** |

---

## Key Findings & Verification Methodology

1. **Copernicus Marine Sea Ice (`SEAICE_GLO_SEAICE_L4_NRT_OBSERVATIONS_011_001`):** Verified. Provides daily 10 km grid sea-ice concentration and drift fields across the Southern Ocean produced by EUMETSAT OSI SAF (OSI-401-d and OSI-408-a). Accessible via Copernicus Marine Python API / REST Subsetter.
2. **USNIC Antarctic Iceberg Database:** Verified. Authoritative source for named Antarctic icebergs (e.g. A-76A, A-23a). Published in open GeoJSON/CSV formats with weekly operational analyst updates.
3. **Open-Meteo Polar Weather & ECMWF Marine Telemetry:** Verified & Active. Ingesting live surface winds, air/sea temperatures, barometric pressure, and swell wave height for polar coordinates (-67.57°S, -68.13°W).
4. **CDSE STAC API (`https://stac.dataspace.copernicus.eu/v1`):** Verified. Active STAC v1.0.0 API endpoint supporting spatial bbox queries for Sentinel-1 EW/IW SAR imagery footprints across the Antarctic Peninsula. Metadata discovery is open access.
