# CRYO NAV — Unified Environmental Data Contract & Alignment Specification

**System:** CRYO NAV — AI-Enabled Antarctic Sea-Ice, Iceberg Trajectory & Navigation Decision Support System  
**Phase:** Phase 3A — Unified Environmental Data Contract, Spatial/Temporal Alignment & Data Quality  
**Date:** September 20, 2026  

---

## 1. Purpose & Overview
Phase 3A establishes a common **analysis-ready environmental data contract** for CRYO NAV. Prior to Phase 3A, environmental datasets (Copernicus Marine sea ice, Copernicus Marine 3D ocean currents, USNIC iceberg catalog, and ECMWF IFS weather forecasts) were ingested and normalized independently.

This alignment layer unifies all active environmental pipelines under a single deterministic analysis reference time (`analysisTime`), evaluates temporal offsets, checks spatial bounding box coverage, tracks quality states, and generates empirical alignment warnings.

---

## 2. Architecture & Data Flow

```
REAL SEA ICE (Copernicus)    ──┐
REAL OCEAN (Mercator NEMO 3D) ──┼──> UNIFIED ALIGNMENT ENGINE ──> EnvironmentalAlignmentResult ──> READ-ONLY CONSUMERS
REAL ICEBERGS (USNIC)         ──┤    (environmentalState.ts)       (AppContext.unifiedEnvironment)  (UI Panel & Map Status)
REAL WEATHER (ECMWF IFS)     ──┘
```

---

## 3. Unified Data Contract Structure
The contract is defined in [`src/types.ts`](file:///c:/Users/JAGAN%20MOHAN/OneDrive/Desktop/cryo-nav%20-%20Copy/cryo-nav%20-%20Copy/src/types.ts) and generated deterministically by [`src/data/environmentalState.ts`](file:///c:/Users/JAGAN%20MOHAN/OneDrive/Desktop/cryo-nav%20-%20Copy/cryo-nav%20-%20Copy/src/data/environmentalState.ts):

```typescript
export interface EnvironmentalAlignmentResult {
  analysisTime: string; // Deterministic reference timestamp
  mode: EnvironmentalDataMode; // 'REAL' | 'DEMO'
  region: {
    name: string;
    bbox: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
    displayCrs: string; // 'EPSG:4326 (WGS84)'
  };
  overallQuality: OverallQualityState; // 'VALID' | 'PARTIAL' | 'DEGRADED' | 'UNAVAILABLE'
  alignmentStatus: 'ALIGNED' | 'PARTIALLY ALIGNED' | 'DEGRADED' | 'UNAVAILABLE';
  sources: {
    seaIce: SourceAlignmentSummary;
    ocean: SourceAlignmentSummary;
    icebergs: SourceAlignmentSummary;
    weather: SourceAlignmentSummary;
  };
  warnings: string[];
  recordsCount: {
    seaIceCells: number;
    oceanCells: number;
    icebergs: number;
    weatherPoints: number;
  };
}
```

---

## 4. Deterministic Analysis Time (`analysisTime`)
The analysis time acts as the temporal anchor for all four environmental streams.
- **Reference Source:** Reuses `mission.departureTime` when active, or system ISO timestamp.
- **Deterministic Behavior:** Ensures all time differences ($\Delta t$) are computed relative to a single shared reference.

---

## 5. Temporal Alignment Model & Thresholds
Time offsets ($\Delta t = |\text{validTime} - \text{analysisTime}|$) are evaluated using strict thresholds:

| Temporal Status | Threshold ($\Delta t$) | Description |
| :--- | :--- | :--- |
| **`ALIGNED`** | $\le 3.0 \text{ hours}$ | Optimal synchronization for numerical modeling |
| **`WITHIN_TOLERANCE`** | $\le 12.0 \text{ hours}$ | Acceptable operational window |
| **`AGING`** | $\le 24.0 \text{ hours}$ | Moderate temporal offset |
| **`STALE`** | $\le 72.0 \text{ hours}$ | Significant lag (expected for USNIC analyst updates) |
| **`OUT_OF_WINDOW`** | $> 72.0 \text{ hours}$ | Unacceptable lag for real-time navigation |
| **`MISSING`** | Null / Unprovided | Data stream absent or offline |

---

## 6. Spatial Alignment & CRS Preservation
- **Source-Native Preservation:** CRYO NAV preserves native spatial grid resolutions and projected CRSs.
  - **Sea Ice:** 10 km grid (`0.10°` OSI-401-d / OSI-408-a L4 Analysis)
  - **Ocean Currents:** 8 km grid (`1/12°` Mercator NEMO 3D Hydrodynamic Model)
  - **Icebergs:** Point Observation / Tabular Analyst Tracking Catalog
  - **Weather:** 25 km grid (`0.25°` ECMWF IFS Global Atmospheric Model)
- **Common Display CRS:** WGS84 (`EPSG:4326`) latitude/longitude coordinates are used solely for UI presentation and bounding box checks. Blind grid resampling is NOT performed in this phase.

---

## 7. Coverage Assessment Model
- **`COMPLETE`:** Source dataset bounding box fully contains the requested mission region (`[-70.0, -68.5, -56.0, -59.0]`).
- **`PARTIAL`:** Dataset records exist within the region but do not span the complete bounding box.
- **`NONE`:** Zero records returned or endpoint error.
- **`UNKNOWN`:** Spatial bounds cannot be established.

---

## 8. Data Quality Model
Each source and the overall environmental state receive explicit quality ratings:
- **Source Quality:** `VALID`, `SUSPECT`, `STALE`, `MISSING`, `OUT_OF_COVERAGE`, `INVALID`.
- **Overall Quality:**
  - `VALID`: All 4 sources valid & aligned.
  - `PARTIAL`: Minor time offsets or partial coverage in 1 source.
  - `DEGRADED`: 1 or 2 sources missing or stale.
  - `UNAVAILABLE`: Key sources missing or server endpoints offline.

---

## 9. Provenance Preservation
The unified state retains full `DataProvenance` references for every source, preserving source authority, provider, dataset ID, granule ID, license, overpass time, valid time, ingestion time, and freshness state.

---

## 10. Non-Fabrication Policy in REAL Mode
In `REAL` mode (`environmentalMode === 'REAL'`):
- Zero synthetic data is substituted if a real source fails or is offline.
- If a endpoint fails, the quality is set to `MISSING` or `UNAVAILABLE` and an explicit error message is displayed.

---

## 11. Scientific Honesty Statement
> *"Environmental alignment evaluates temporal compatibility, spatial coverage, and source-native metadata. CRYO NAV preserves source-native metadata and evaluates compatibility before downstream modeling."*

---

## 12. Consumption by Phase 3B Trajectory Forecast Engine
The unified environmental alignment state (`EnvironmentalAlignmentResult`) is consumed by the Phase 3B physical kinematic trajectory engine ([`trajectoryModel.ts`](file:///c:/Users/JAGAN%20MOHAN/OneDrive/Desktop/cryo-nav%20-%20Copy/cryo-nav%20-%20Copy/src/services/trajectoryModel.ts)):
- Checks source quality before executing vector drift advection ($V_{\text{berg}} = V_{\text{ocean}} + 0.025 \cdot V_{\text{wind}}$).
- Emits explicit `DEGRADED` or `UNAVAILABLE` forecast statuses if input datasets are stale, missing, or unaligned.

