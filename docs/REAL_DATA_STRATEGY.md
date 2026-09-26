# CRYO NAV — Real Antarctic Data Integration Strategy

**System:** CRYO NAV — AI-Enabled Antarctic Sea-Ice, Iceberg Trajectory & Navigation Decision Support System  
**Phase:** Phase 2A — Real Antarctic Data Source Reconnaissance  
**Scope:** Integration Sequence, Selection Rationale, and Phasing Roadmap  

---

## Executive Summary

To transition CRYO NAV from a baseline synthetic prototype to an operational, data-driven polar decision support system, real Antarctic Earth Observation (EO) data must be introduced systematically. This document defines the recommended multi-stage integration sequence based on scientific authority, API accessibility, programmatic compatibility, coverage, and implementation risk.

```
 [PHASE 2B: 1st Integration]  Copernicus Marine Sea Ice (CMEMS) + Open-Meteo Telemetry
             │
 [PHASE 2C: 2nd Integration]  US National Ice Center (USNIC) Antarctic Iceberg Catalog
             │
 [PHASE 2D: 3rd Integration]  Copernicus Data Space Ecosystem (CDSE) STAC API (Sentinel-1)
             │
 [PHASE 2E: 4th Integration]  Copernicus Marine 3D Ocean Hydrodynamics (NEMO Model)
```

---

## 1. Recommended First Integration (Phase 2B Candidate)

### Primary Selected Source: **Copernicus Marine Service (CMEMS) NRT Sea Ice Concentration**
- **Product Identifier:** `SEAICE_GLO_SEAICE_L4_NRT_OBSERVATIONS_011_001` (OSI-401-d / OSI-408-a)
- **Partner Feed:** **Open-Meteo Antarctic Weather & ECMWF Marine Telemetry API** (already active in baseline)

### Selection Rationale for CRYO NAV:
1. **Direct Interface Alignment:** The NetCDF-4 sea-ice grid maps 1-to-1 to CRYO NAV's existing `SeaIceCell` interface (latitude, longitude, concentration %, stage of development, thickness, uncertainty, timestamp).
2. **Scientific Authority & Freshness:** Produced daily by EUMETSAT OSI SAF with 2–6 hour near-real-time (NRT) latency. It is the gold-standard operational sea-ice product used by Antarctic research icebreakers.
3. **Comprehensive Antarctic Coverage:** Provides complete, un-obscured Southern Ocean spatial coverage (-50°S to -78°S) regardless of polar night cloud cover (passive microwave sensors).
4. **Programmatic Accessibility:** Fully supported via the `copernicusmarine` Python SDK and REST API subsetter with zero data access fees.
5. **Low Implementation Risk:** Allows CRYO NAV to replace synthetic sea-ice grid cells without modifying the downstream `riskEngine.ts` or `routingEngine.ts` contracts.

---

## 2. Second Integration (Phase 2C Candidate)

### Primary Selected Source: **US National Ice Center (USNIC) Antarctic Iceberg Database**
- **Partner Feed:** **BYU Scatterometer Climate Record Pathfinder (SCP) Iceberg Database**

### Selection Rationale for CRYO NAV:
1. **Authoritative Iceberg Tracking:** USNIC is the official international agency responsible for naming, tracking, and sizing Antarctic icebergs (e.g. A-76A, A-23a, B-15).
2. **Direct Interface Alignment:** Ingested GeoJSON/CSV position records map directly to CRYO NAV's `IcebergDetection` interface (ID, name, lat, lon, length, width, freeboard, drift speed, observation time).
3. **Complements Satellite Imagery:** Provides validated analyst-curated iceberg object polygons and points rather than raw uninterpreted radar pixels.
4. **Open Access:** Published weekly without authentication or rate limits.

---

## 3. Third Integration (Phase 2D Candidate)

### Primary Selected Source: **Copernicus Data Space Ecosystem (CDSE) STAC API**
- **STAC Endpoint:** `https://stac.dataspace.copernicus.eu/v1`
- **Target Satellite Constellation:** Sentinel-1 Synthetic Aperture Radar (SAR EW/IW GRD)

### Selection Rationale for CRYO NAV:
1. **Powers Decision-Impact Engine:** Enables real-time querying of Sentinel-1 SAR swath footprints overlapping active vessel route corridors.
2. **Direct Interface Alignment:** Maps STAC Item JSON metadata (footprint polygon, acquisition time, sensor mode, product size) directly to CRYO NAV's `SatelliteProduct` interface.
3. **Open Metadata Access:** Metadata queries are open access via standard STAC REST protocol without requiring S3 data asset downloads.

---

## 4. Fourth Integration (Phase 2E Candidate)

### Primary Selected Source: **Copernicus Marine 3D Ocean Hydrodynamics**
- **Product Identifier:** `GLOBAL_ANALYSISFORECAST_PHY_001_024` (NEMO 1/12° Model)

### Selection Rationale for CRYO NAV:
1. **Advanced Physics Coupling:** Ingests 3D ocean surface current velocity ($u, v$) and sea surface temperature (SST) fields.
2. **Drives Iceberg Drift:** Replaces baseline drift assumptions with coupled hydrodynamic ocean drag forcing in `trajectoryModel.ts`.
3. **10-Day Forecast Horizon:** Provides daily 10-day forecasts supporting long-range expedition route planning.

---

## Integration Roadmap & Phasing Summary

| Stage | Target Real Data Source | System Target | Implementation Outcome |
| :--- | :--- | :--- | :--- |
| **Phase 2A** | Reconnaissance & Strategy | `docs/` Specifications | Verified endpoints, APIs, data source matrix, and provenance rules. |
| **Phase 2B** | CMEMS Sea Ice (`011_001`) | `SeaIceCell` Adapter | Real Antarctic Peninsula sea-ice concentration grid ingested into CRYO NAV. |
| **Phase 2C** | USNIC Iceberg Catalog | `IcebergDetection` Adapter | Real tracked tabular iceberg catalog ingested into risk and trajectory engines. |
| **Phase 2D** | CDSE STAC API (`/v1`) | `SatelliteProduct` Adapter | Live Sentinel-1 SAR swath metadata search powering Decision Impact engine. |
| **Phase 2E** | CMEMS Ocean Hydrodynamics | `OceanCurrentCell` Adapter | 3D ocean surface currents driving iceberg drift and wave risk calculations. |
