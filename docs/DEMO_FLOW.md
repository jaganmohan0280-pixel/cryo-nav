# CRYO NAV — Master Demonstration Flow & Script

**System:** CRYO NAV — AI-Enabled Antarctic Sea-Ice, Iceberg Trajectory & Navigation Decision Support System  
**Purpose:** End-to-End Walkthrough Script for Competitions, Reviews, and Demonstration Trials  
**Current Status:** Phase 1 Verified Prototype  

---

## Complete 15-Step Demonstration Sequence

This document provides the exact sequence of actions to demonstrate the full CRYO NAV decision-support workflow.

---

### Step 1: Open Mission Dashboard
- **WHERE in website:** Mission Dashboard View (`activeView: 'dashboard'`)
- **USER ACTION:** Click **"Mission Dashboard"** on the left navigation sidebar.
- **EXPECTED VISUAL RESULT:** Full-screen interactive Leaflet polar map loads centered on the Antarctic Peninsula / Marguerite Bay sector (-64.5°S, -64.2°W) with dark/satellite basemap, sea-ice heatmap cells, tracked iceberg markers, and recommended route poly lines. Top header displays live vessel status (`RV Polar Explorer`), telemetry status (`ONLINE (IRIDIUM)`), and active alerts count.
- **WHAT CRYO NAV IS CALCULATING:** Renders Leaflet map layers, computes initial multi-objective route corridors, and checks active alert conditions against current vessel position.
- **WHETHER DATA IS SYNTHETIC OR REAL:** Map basemap tiles are **REAL** (Esri World Imagery); sea-ice grid and iceberg locations are **SYNTHETIC DEMO DATA**.

---

### Step 2: Create / Select Mission
- **WHERE in website:** Mission Planning View (`activeView: 'mission'`)
- **USER ACTION:** Click **"Mission Planning"** on the left navigation sidebar.
- **EXPECTED VISUAL RESULT:** Mission configuration form displays title *"Marguerite Bay & Rothera Resupply Transit"*, departure time, priority select, and intermediate research waypoints list.
- **WHAT CRYO NAV IS CALCULATING:** Loads active `MissionConfig` object from `AppContext` and validates departure timestamps and logistics constraints.
- **WHETHER DATA IS SYNTHETIC OR REAL:** **SYNTHETIC DEMO DATA** (Mission logistics configuration).

---

### Step 3: Select Vessel & Inspect Capabilities
- **WHERE in website:** Mission Planning View → Assigned Polar Vessel Section
- **USER ACTION:** Select **`RV Polar Explorer (PC3)`** (or switch to `RRS Endurance IV (PC5)` / `MV Drake Supplier (PC7)`).
- **EXPECTED VISUAL RESULT:** Active vessel card highlights selected vessel with Polar Class rating, max ice concentration limit (78%), cruising speed (11.5 kts), draft (8.8m), and fuel burn (24.5 tons/day). If an ice rating constraint is violated by the mission settings, a red warning banner appears immediately.
- **WHAT CRYO NAV IS CALCULATING:** Evaluates vessel ice class rating against max sea-ice concentration parameter (`maxSeaIceConcentrationPercent`).
- **WHETHER DATA IS SYNTHETIC OR REAL:** **SYNTHETIC DEMO DATA** (Vessel fleet profiles based on real-world Polar Class specifications).

---

### Step 4: Select Destination & Origin Coordinates
- **WHERE in website:** Mission Planning View → Origin & Destination Route Optimizer Widget
- **USER ACTION:** Select Origin preset **"Drake Passage Transit Gate"** (-59.50°S, -64.50°W) and Destination preset **"Rothera Research Station (UK)"** (-67.57°S, -68.13°W) (or custom coordinates).
- **EXPECTED VISUAL RESULT:** Coordinate inputs populate with selected lat/lon values, formatted in clean polar notation (59.50°S, 64.50°W).
- **WHAT CRYO NAV IS CALCULATING:** Updates `startLocation` and `destination` in `MissionConfig` state.
- **WHETHER DATA IS SYNTHETIC OR REAL:** Coordinates represent **REAL** geographic polar research stations and ingress gates.

---

### Step 5: Generate Dynamic Route Alternatives
- **WHERE in website:** Route Optimizer Widget / Mission Planning View
- **USER ACTION:** Click **"Calculate & Show Paths on Map"** or **"Save Mission & Recalculate"**.
- **EXPECTED VISUAL RESULT:** Notification alert fires: *"3 Route Corridors Generated!"*. Green success indicator confirms route recalculation.
- **WHAT CRYO NAV IS CALCULATING:** `routingEngine.ts` executes multi-objective path generation (`generateRouteAlternatives`), building 3 distinct spatial route corridors (SAFEST, BALANCED, FASTEST) by sampling sea-ice cells and computing iceberg CPA distances.
- **WHETHER DATA IS SYNTHETIC OR REAL:** **SYNTHETIC DEMO ALGORITHM** (Multi-objective routing over synthetic environmental fields).

---

### Step 6: Compare Safe, Balanced, and Fast Alternatives
- **WHERE in website:** Mission Dashboard / Route Planner Widget / Navigation View
- **USER ACTION:** Inspect and click between **SAFEST (Emerald)**, **BALANCED (Cyan)**, and **FASTEST (Amber)** route options.
- **EXPECTED VISUAL RESULT:** Map updates active polyline highlighting selected route corridor. Route metrics update:
  - **SAFEST:** ~520 nm, 49.5h ETA, 50.5t fuel, Risk Index 24/100, High Confidence, 0 hazards.
  - **BALANCED:** ~480 nm, 41.7h ETA, 42.6t fuel, Risk Index 38/100, High Confidence, 1 hazard.
  - **FASTEST:** ~445 nm, 36.8h ETA, 37.5t fuel, Risk Index 58/100, Medium Confidence, 2 hazards.
- **WHAT CRYO NAV IS CALCULATING:** `routingEngine.ts` computes distance (nm), ETA (hours = distance / speed), fuel burn (tons = (ETA/24) * fuel_rate), composite risk index, and cost breakdown for each alternative.
- **WHETHER DATA IS SYNTHETIC OR REAL:** **SYNTHETIC DEMO METRICS** calculated from baseline formulas.

---

### Step 7: Inspect Risk, Uncertainty & Confidence Scores
- **WHERE in website:** Mission Dashboard / Icebergs / Sea Ice Views
- **USER ACTION:** View route cards or open **"Iceberg Trajectories"** / **"Sea-Ice Forecast"** views.
- **EXPECTED VISUAL RESULT:** Detailed breakdown displays risk indices (0–100), uncertainty scores (±NM or ±%), confidence labels (HIGH / MEDIUM / LOW / CRITICAL), and resilience scores (% of scenario perturbations tolerated).
- **WHAT CRYO NAV IS CALCULATING:** `riskEngine.ts` calculates weighted composite risk:  
  $$\text{Risk} = 0.35 \times \text{IceRisk} + 0.35 \times \text{IcebergRisk} + 0.15 \times \text{WeatherRisk} + 0.15 \times \text{UncertaintyRisk}$$
- **WHETHER DATA IS SYNTHETIC OR REAL:** **SYNTHETIC DEMO RISK MODEL**.

---

### Step 8: Start GPS Voyage Position Simulation
- **WHERE in website:** Live Navigation & Vessel Conning Station (`activeView: 'navigation'`)
- **USER ACTION:** Click **"Live Navigation"** on sidebar, then click **"Start Live Voyage"**.
- **EXPECTED VISUAL RESULT:** Simulation starts. Vessel marker moves smoothly along the recommended route on the map. Bridge instrument panels display updating GPS coordinates, Speed Over Ground (11.5 kts), True Heading (195°), Cross-Track Error (XTE ±0.1 nm), and percentage progress bar.
- **WHAT CRYO NAV IS CALCULATING:** `AppContext.tsx` runs real-time GPS position interpolation loop along route waypoints, calculating heading, cross-track error, distance traveled, and distance remaining.
- **WHETHER DATA IS SYNTHETIC OR REAL:** **SIMULATED REAL-TIME GPS LOOP**.

---

### Step 9: Trigger & Observe Active Alerts
- **WHERE in website:** Top Header Alert Bell & Navigation View Right Panel
- **USER ACTION:** Click the **Bell Icon** in the top header.
- **EXPECTED VISUAL RESULT:** Dropdown alert drawer opens displaying real-time alerts:
  - `WARNING`: *"A-76A Fragment Drifting Near Outer Gateway — Keep minimum 3.5 nm clearance."*
  - `INFO`: *"High-Impact SAR Observation Available — Sentinel-1C Swath SAT-S1C covers Marguerite Bay approach."*
  User can click **"Ack"** to acknowledge or **"Dismiss"** to clear alerts.
- **WHAT CRYO NAV IS CALCULATING:** Filters active alert log in `AppContext` by timestamp, severity, and acknowledgment state.
- **WHETHER DATA IS SYNTHETIC OR REAL:** **SYNTHETIC DEMO ALERTS**.

---

### Step 10: Change a What-If Scenario Parameter
- **WHERE in website:** Timeline Slider / Sea-Ice View / Navigation View
- **USER ACTION:** Move the timeline slider to **+24h** or **+48h**, or toggle simulation scenario severity in context controls.
- **EXPECTED VISUAL RESULT:** Map sea-ice concentration heatmaps shift and advect. Iceberg position markers move along drift vectors, and uncertainty circles expand (from ±0.8 nm at T+0 to ±9.8 nm at +72h).
- **WHAT CRYO NAV IS CALCULATING:** `seaIceModel.ts` and `trajectoryModel.ts` recalculate 2D sea-ice advection fields and Lagrangian iceberg drift tracks at specified forecast horizon $T + h$.
- **WHETHER DATA IS SYNTHETIC OR REAL:** **SYNTHETIC DEMO PREDICTIVE MODELS**.

---

### Step 11: Observe Dynamic Route Recalculation & Decision Shift
- **WHERE in website:** Navigation View / Top Header
- **USER ACTION:** Click **"Replan"** in top header or re-evaluate routes after scenario shift.
- **EXPECTED VISUAL RESULT:** System recalculates hazard field. If iceberg ICB-902 drifts into Grandidier Channel, an alert triggers: *"DECISION CHANGED — Recommendation shifted from BALANCED to SAFEST outer oceanic corridor."*
- **WHAT CRYO NAV IS CALCULATING:** `routingEngine.ts` re-evaluates route costs under perturbed hazard positions and automatically updates `recommendedRoute` to maintain mandated safety clearance.
- **WHETHER DATA IS SYNTHETIC OR REAL:** **SYNTHETIC DEMO DECISION ENGINE**.

---

### Step 12: Open Data Acquisition Engine (Decision-Impact Engine)
- **WHERE in website:** Data Acquisition Engine View (`activeView: 'acquisition'`)
- **USER ACTION:** Click **"Data Acquisition Engine"** on the left sidebar.
- **EXPECTED VISUAL RESULT:** View loads listing available synthetic satellite observation swaths (e.g. Sentinel-1C SAR, CryoSat-2 SARIn). Top callout highlights high-priority candidate **SAT-S1C-20260906-0815** with 92/100 Decision Impact Score.
- **WHAT CRYO NAV IS CALCULATING:** `decisionImpactEngine.ts` calculates Value of Information (VoI) for each satellite swath based on spatial route overlap, freshness, and potential to resolve route recommendation ambiguity.
- **WHETHER DATA IS SYNTHETIC OR REAL:** **SYNTHETIC DEMO SATELLITE METADATA**.

---

### Step 13: Inspect Acquisition Priorities & Ingest Swath
- **WHERE in website:** Data Acquisition Engine View
- **USER ACTION:** Click **"Acquire High Priority"** or **"Acquire Observation"** next to `SAT-S1C`.
- **EXPECTED VISUAL RESULT:** Button shows *"Acquiring & Updating..."*. Upon completion, product status changes to `INGESTED & ACTIVE`. Decision Change Banner appears: *"DECISION CHANGED: High-resolution SAR observation resolved iceberg ICB-902 trajectory. Recommendation shifted to SAFEST corridor."*
- **WHAT CRYO NAV IS CALCULATING:** `acquireSatelliteProduct` reduces spatial uncertainty radii of icebergs within swath footprint, updates iceberg positions, recalculates route costs, and shifts recommended route.
- **WHETHER DATA IS SYNTHETIC OR REAL:** **SIMULATED OBSERVATION INGESTION FLOW**.

---

### Step 14: Open Nav AI Decision Support Assistant
- **WHERE in website:** Nav AI Assistant View (`activeView: 'ai'`)
- **USER ACTION:** Click **"Nav AI Assistant"** on the left sidebar.
- **EXPECTED VISUAL RESULT:** Chat interface opens with context bar showing assigned vessel (`RV Polar Explorer`) and recommended route (`SAFEST`). Initial assistant welcome message displays formatted markdown summary of current operational parameters.
- **WHAT CRYO NAV IS CALCULATING:** Renders conversation log and initializes LLM prompt context payload.
- **WHETHER DATA IS SYNTHETIC OR REAL:** **LIVE AI PROXY** (Express proxy `/api/gemini/assistant` querying Google Gemini API with local fallback).

---

### Step 15: Ask AI Assistant for Navigation Decision Explanation
- **WHERE in website:** Nav AI Assistant View
- **USER ACTION:** Click suggested prompt: **"Why is the current route recommended over the fastest alternative?"** (or type a custom question).
- **EXPECTED VISUAL RESULT:** Assistant displays loading indicator: *"Analyzing environmental risk fields, iceberg CPA, and vessel constraints..."*. Returns structured, professional markdown response detailing:
  1. **Primary Rationale:** Maintaining >5.0 nm clearance from tabular iceberg ICB-902.
  2. **Vessel Capability Match:** Sea-ice concentrations within RV Polar Explorer's rated 78% limit.
  3. **Risk Trade-off:** Explaining why the 4.9h time savings of the fastest route carries unacceptable collision risk.
- **WHAT CRYO NAV IS CALCULATING:** Express backend POSTs JSON payload containing active mission, vessel profile, 3 route alternatives, top iceberg hazards, and live weather to `/api/gemini/assistant`. Gemini model generates grounded reasoning under system prompt rules.
- **WHETHER DATA IS SYNTHETIC OR REAL:** **REAL AI MODEL** grounded in active environmental state.

---

## REAL SEA-ICE DATA DEMONSTRATION (PHASE 2B)

### Step 16: Copernicus Marine Live Sea-Ice Pipeline Demonstration
- **WHERE in website:** Sea-Ice Concentration & Advection View (`activeView: 'seaice'`)
- **USER ACTION:**
  1. Open CRYO NAV.
  2. Click **"Sea-Ice Forecast"** on the left navigation sidebar.
  3. In the top header bar, click **"REAL DATA (COPERNICUS MARINE)"**.
  4. Observe the automatic query to backend Express endpoint `/api/environment/sea-ice`.
- **WHAT APPEARS:**
  - **With valid credentials:** Real Copernicus observation cells render on the map with a live green `REAL OBSERVATION PIPELINE` provenance panel.
  - **Without credentials:** A red alert banner appears: `REAL DATA UNAVAILABLE — NO DATA FABRICATION`, displaying the exact reason (`MISSING_CREDENTIALS` / `COPERNICUS_MARINE_USER credentials missing`). An explicit option allows switching back to `DEMO MODE`.
- **DATA PROVENANCE DISPLAYED:**
  - **Source:** Copernicus Marine Service (CMEMS)
  - **Provider:** EUMETSAT Ocean and Sea Ice SAF (OSI SAF)
  - **Product / Dataset:** `SEAICE_GLO_SEAICE_L4_NRT_OBSERVATIONS_011_001` (OSI-401-d / OSI-408-a)
  - **Observation Time:** Timestamp of real satellite overpass
  - **Retrieval Time:** Timestamp of server ingestion
  - **Data Age:** Calculated age in hours from current system time
  - **Freshness:** State label (`FRESH`, `AGING`, `STALE`)
  - **Spatial Coverage:** Antarctic Peninsula bounding box `[-70.0, -68.5, -56.0, -59.0]`
- **WHAT IS REAL vs SYNTHETIC:**
  - **REAL:** Copernicus Marine satellite sea-ice observations, dataset metadata, provenance timestamps, server validation check, and live polar weather.
  - **STILL SYNTHETIC:** Iceberg trajectory prediction catalog and baseline advection forecast models (`seaIceModel.ts`), which remain baseline demonstration models.
- **OPERATIONAL EXPLANATION:**
  - The real satellite observation is now fed directly into the CRYO NAV environmental pipeline.
  - Future sea-ice prediction remains a separate model stage down-piped from the real observation.

---

## REAL OCEAN CURRENT DATA DEMONSTRATION (PHASE 2C)

### Step 17: Copernicus Marine Live Ocean Currents Pipeline Demonstration
- **WHERE in website:** Sea-Ice & Environmental Intelligence View (`activeView: 'seaice'`) / Interactive Leaflet Map
- **USER ACTION:**
  1. Open CRYO NAV.
  2. Open Sea Ice / Environmental Intelligence view (`activeView: 'seaice'`).
  3. Select **"REAL DATA (COPERNICUS MARINE)"** mode in the top header.
  4. Request the Antarctic Peninsula mission region.
  5. Wait for Copernicus Marine hydrodynamics response via `/api/environment/ocean-currents`.
- **WHAT APPEARS:**
  - **With valid credentials:** Real ocean current vector lines render on the Leaflet map with flow heading and speed in knots. Dedicated cyan `REAL OCEAN HYDRODYNAMICS PIPELINE` provenance card displays:
    - **Source:** Copernicus Marine Service (CMEMS)
    - **Provider:** Mercator Ocean International (NEMO 3D Hydrodynamic Model)
    - **Product / Dataset:** `GLOBAL_ANALYSISFORECAST_PHY_001_024` / `cmems_mod_glo_phy-cur_anfc_0.083deg_P1D-m`
    - **Valid Time:** Response timestamp
    - **Retrieval Time:** Ingestion timestamp
    - **Data Age & Freshness:** Calculated age in hours & state (`FRESH`)
    - **Coverage & Resolution:** 8 km (1/12° NEMO 3D grid) across Antarctic Peninsula `[-70.0, -68.5, -56.0, -59.0]`
    - **Depth / Level:** Surface level (`0.49 meters`)
  - **Without credentials:** A red alert banner appears: `REAL ENVIRONMENTAL DATA UNAVAILABLE — NO DATA FABRICATION`, detailing the exact failure reason (`MISSING_CREDENTIALS`). No synthetic current vectors appear in REAL mode.
- **OPERATIONAL EXPLANATION & SCIENTIFIC HONESTY:**
  - *"The system is now ingesting real Antarctic ocean-current observations/analyses from the Copernicus Marine NEMO 3D Hydrodynamic Model."*
  - *"These currents will become inputs to the iceberg trajectory intelligence layer in a subsequent phase."*
  - **Explicit Note:** The baseline iceberg trajectory model (`trajectoryModel.ts`) remains an unvalidated demonstration model in Phase 2C and is NOT claimed to be scientifically validated.

---

## REAL ICEBERG DATA DEMONSTRATION (PHASE 2D)

### Step 18: REAL ICEBERG OBSERVATION DEMONSTRATION
- **WHERE in website:** Icebergs & Trajectories View (`activeView: 'icebergs'`) / Interactive Leaflet Map
- **USER ACTION & EXACT FLOW:**
  1. Open CRYO NAV.
  2. Open Icebergs (`activeView: 'icebergs'`).
  3. Select **"REAL DATA (USNIC ICEBERGS)"** mode in the top header mode toggle.
  4. Request the Antarctic mission region.
  5. Wait for USNIC response via `/api/environment/icebergs`.
  6. Observe actual iceberg markers on the Leaflet map.
  7. Click an iceberg marker (e.g. `USNIC-A76A`).
  8. Show Iceberg Details:
     - Identifier (`USNIC-A76A`)
     - Actual position (`-64.20°S, -62.80°W`)
     - Observation / update time (`2026-09-18T12:00:00Z`)
     - Source (`US National Ice Center (USNIC)`)
     - Data age (`38.5 hours (FRESH)`)
     - Dimensions if available (Length: 135.0 km, Width: 25.0 km, Area: 3375.0 km²) or `"Not provided by source"`
  9. Open provenance panel (`REAL ICEBERG CATALOG PIPELINE`).
  10. Show category: **`REAL OBSERVATION`**.
  11. **EXPLAIN TO AUDIENCE / REVIEWERS:**
      > *"These are real iceberg observations from an authoritative Antarctic iceberg catalog (US National Ice Center)."*
      > 
      > **Explicit Scientific Distinction:**
      > *"CRYO NAV has not yet predicted their future trajectories in this phase. That is the next scientific modeling stage."*
- **FAILURE HANDLING DEMONSTRATION:**
  - If the USNIC endpoint fails or network disconnects: Red alert banner appears displaying `REAL ICEBERG DATA UNAVAILABLE`. No synthetic iceberg records are silently rendered in REAL mode.

---

## REAL WEATHER DATA DEMONSTRATION (PHASE 2E)

### Step 19: REAL WEATHER FORECAST DEMONSTRATION
- **WHERE in website:** Environmental Intelligence View (`activeView: 'seaice'`) / Interactive Leaflet Map
- **USER ACTION & EXACT FLOW:**
  1. Open CRYO NAV.
  2. Open Sea Ice & Environmental Intelligence (`activeView: 'seaice'`).
  3. Select **"REAL DATA (COPERNICUS MARINE / ECMWF)"** mode in top header.
  4. Enable / open Weather layer on map.
  5. Request / load Antarctic mission region.
  6. Wait for backend weather request via `/api/environment/weather`.
  7. Observe REAL FORECAST weather markers and wind vectors on map.
  8. Click a weather forecast point on map.
  9. Show actual returned weather values:
     - Temperature at 2m (e.g. `-6.5°C`)
     - Wind speed at 10m (e.g. `11.3 m/s` / `22.0 kts`)
     - Wind direction at 10m (e.g. `190°`)
     - Wind gust at 10m (e.g. `15.2 m/s` or `"Not provided by source"`)
     - Visibility (e.g. `8.5 km` or `"Not provided by source"`)
     - Cloud cover (e.g. `85%` or `"Not provided by source"`)
     - Precipitation (e.g. `0.2 mm/h` or `"Not provided by source"`)
     - Surface Pressure (e.g. `982.0 hPa`)
  10. Show forecast valid time (e.g. `2026-09-20T02:00:00Z`).
  11. Show model: **ECMWF IFS (0.25° Global Model)**.
  12. Show access provider: **Open-Meteo API**.
  13. Show retrieval time and freshness state (`FRESH`).
  14. Open provenance card (`REAL WEATHER FORECAST PIPELINE`).
  15. Demonstrate DEMO mode toggle: switch to `DEMO MODE` to return to synthetic weather baseline.
  16. Switch back to `REAL DATA`.
  17. Explain scientific honesty statement:
      > *"CRYO NAV currently ingests real ECMWF IFS weather forecasts. These forecasts are displayed as environmental inputs. Weather-driven iceberg trajectory prediction and weather-aware route optimization are not yet claimed in this phase."*
- **FAILURE HANDLING DEMONSTRATION:**
  - If the ECMWF weather endpoint fails or disconnects: Red alert banner appears displaying `REAL WEATHER DATA UNAVAILABLE`. Zero synthetic weather values are substituted in REAL mode.

---

## UNIFIED ENVIRONMENTAL DATA ALIGNMENT DEMONSTRATION (PHASE 3A)

### Step 20: Unified Environmental Data Alignment Demonstration
- **WHERE in website:** Sea-Ice & Environmental Intelligence View (`activeView: 'seaice'`) / Interactive Leaflet Map
- **USER ACTION & EXACT FLOW:**
  1. Open CRYO NAV.
  2. Open Sea Ice & Environmental Intelligence (`activeView: 'seaice'`).
  3. Select **"REAL DATA"** mode in top header.
  4. Load / request the Antarctic mission region.
  5. Scroll to **ENVIRONMENTAL DATA STATUS & ALIGNMENT ASSESSMENT** panel.
  6. Show all four real environmental sources unified into a single panel:
     - **Real Sea Ice:** Copernicus Marine | Status: `VALID` | Freshness: `FRESH` | Valid Time: `18 Sep 2026 12:00 UTC` | Resolution: `10 km (0.10° L4)`
     - **Real Ocean Currents:** Copernicus Marine | Status: `VALID` | Freshness: `FRESH` | Valid Time: `18 Sep 2026 12:00 UTC` | Resolution: `8 km (1/12° NEMO)`
     - **Real Iceberg Observations:** USNIC Catalog | Status: `VALID` | Freshness: `FRESH` | Latest obs: `18 Sep 2026 12:00 UTC` | Resolution: `Point Observation`
     - **Real Weather Forecast:** ECMWF IFS | Status: `VALID` | Freshness: `FRESH` | Forecast valid: `18 Sep 2026 12:00 UTC` | Resolution: `25 km (0.25° IFS)`
  7. Show common **Analysis Time** (derived deterministically from selected mission reference time).
  8. Show source-specific valid times and data ages.
  9. Show spatial alignment metadata: Mission Region bounding box `[-70.0, -68.5, -56.0, -59.0]`, Display CRS `WGS84 EPSG:4326`, Source-Native Grids Preserved.
  10. Show Overall Quality Badge: **`VALID`** / **`PARTIALLY ALIGNED`** / **`DEGRADED`** / **`UNAVAILABLE`**.
  11. If there is an empirical temporal or spatial mismatch, point to the generated warning alert box (e.g. *"Weather forecast valid time differs from sea-ice analysis by 5.2 h"* or *"Ocean current dataset coverage covers 88% of mission region"*).
  12. Point out the top-right environmental alignment badge indicator on the map (`ALIGNED`).
  13. Switch to **`DEMO MODE`** and demonstrate that the exact same unified alignment contract and quality engine evaluates synthetic demonstration dataset fields seamlessly.
---

## REAL-DATA DRIVEN ICEBERG TRAJECTORY FORECAST DEMONSTRATION (PHASE 3B)

### Step 21: Real-Data Driven Iceberg Trajectory Forecast Demonstration
- **WHERE in website:** Icebergs & Trajectories View (`activeView: 'icebergs'`) / Interactive Leaflet Map
- **USER ACTION & EXACT FLOW:**
  1. Open CRYO NAV.
  2. Click **"Iceberg Trajectories"** on the left navigation sidebar (`activeView: 'icebergs'`).
  3. Select **"REAL DATA (USNIC ICEBERGS)"** mode in the top header toggle.
  4. Select an actual real USNIC iceberg returned at runtime (e.g. `USNIC-A76A`).
  5. Inspect initial observation details:
     - Identifier (`USNIC-A76A`)
     - Observed position (`-64.20°S, -62.80°W`)
     - Observation time (`2026-09-18T12:00:00Z`)
     - Source (`US National Ice Center`)
  6. Click **"PREDICT TRAJECTORY (T+24h)"** or select horizon **`+24h`**.
  7. CRYO NAV evaluates Phase 3A environmental alignment across USNIC iceberg observation, Copernicus surface ocean hydrodynamics, and ECMWF IFS weather forecast.
  8. Trajectory engine executes 2D physical kinematic momentum integration ($V_{\text{berg}} = V_{\text{ocean}} + C_{\text{wind}} \cdot V_{\text{wind}}$) using configurable baseline windage $C_{\text{wind}} = 0.025$ with explicit 1-hour numerical timesteps.
  9. Show interactive map visualization:
     - **Observed Position:** Solid blue marker (`T0`)
     - **Forecast Trajectory:** Gold dashed polyline path
     - **Expanding Uncertainty Envelope:** Gold/cyan translucent error circles ($\sigma(t) = \sigma_0 + 0.65 \cdot t^{1.15}$)
  10. Open **MODEL METADATA** panel:
      - Model Name: **`Baseline 2D Kinematic Iceberg Drift Model`**
      - Model Version: **`v3.5-REAL-KINEMATIC`**
      - Ocean Forcing: **`Copernicus surface current (0.49m)`**
      - Wind Forcing: **`ECMWF IFS 10 m wind`**
      - Windage Parameter: **`0.025 baseline assumption (MODEL ASSUMPTION)`**
      - Validation Status Badge: **`NOT YET OPERATIONALLY VALIDATED`**
      - Uncertainty Specification: **`MODEL-DERIVED UNCERTAINTY`**
      - Inputs: `USNIC Icebergs + Copernicus Surface Ocean + ECMWF 10m Wind`
  11. Change forecast horizon to **`+48h`** or **`+72h`**.
  12. Observe predicted position shifting along the flow vector and uncertainty radius expanding (from $\pm 0.8\text{ nm}$ at T0 to $\pm 9.8\text{ nm}$ at +72h).
  13. Demonstrate failure/degraded behavior: if ocean current or weather input is disconnected or unavailable, demonstrate that the system displays `TRAJECTORY FORECAST UNAVAILABLE / DEGRADED` rather than substituting synthetic values.
  14. Switch to **`DEMO MODE`** and confirm synthetic iceberg demonstration trajectory prediction remains functional.
  15. **EXPLAIN TO AUDIENCE / REVIEWERS:**
      > *"CRYO NAV currently uses a transparent 2D kinematic baseline for iceberg drift. The model uses surface ocean-current forcing and ECMWF wind forcing with a configurable baseline windage coefficient. The default coefficient has not yet been calibrated against historical Antarctic iceberg trajectories."*

---

---

## COUNTERFACTUAL & SENSITIVITY ANALYSIS DEMONSTRATION (PHASE 5)

### Step 23: Phase 5 Judge Demonstration Flow — Counterfactual WHAT-IF Analysis & Sensitivity Matrix

- **WHERE in website:** Navigation View (`activeView: 'navigation'`) & Icebergs View (`activeView: 'icebergs'`)
- **EXACT STEP-BY-STEP DEMO SEQUENCE:**

1. **Open CRYO NAV**: Launch application on `http://localhost:3000`.
2. **Select Mission**: Select mission **"Marguerite Bay & Rothera Resupply Transit"** in Mission Planning.
3. **Open Navigation Station**: Click **"Live Navigation"** on sidebar (`activeView: 'navigation'`).
4. **Show Current Route Recommendation**: Point out baseline recommended route (e.g. `BALANCED`).
5. **Show Decision Confidence**: Note baseline confidence classification (e.g. `HIGH` or `MEDIUM`).
6. **Open WHAT-IF ANALYSIS**: Locate **WHAT-IF ANALYSIS** card in the right conning sidebar.
7. **Select Scenario Parameter**: Select **"Iceberg Drift Velocity (+20%)"** from the parameter dropdown.
8. **Run Scenario Analysis**: Click **`[ RUN SCENARIO ]`**.
9. **Show Baseline Route**: Observe baseline route choice (`BALANCED`).
10. **Show Counterfactual Route**: Observe counterfactual route choice (e.g. `SAFE`).
11. **Show Map Overlay**: Observe the pink/magenta dashed counterfactual polyline overlay (`---`) on the Antarctic map alongside solid baseline routes, with counterfactual legend callout.
12. **Show Metrics Deltas**: Highlight $\Delta\text{Risk}$ (+4.2%), $\Delta\text{ETA}$ (+0.3 h), $\Delta\text{Fuel}$ (+1.8 t), and $\Delta\text{Distance}$.
13. **Show Recommendation Changed Badge**: Note whether recommendation changed (`YES` / `NO`).
14. **Show Route Stability State**: Note deterministic stability classification (`ROBUST` / `SENSITIVE` / `HIGHLY_SENSITIVE`).
15. **Show Structured 3-Part Explanation**:
    - **What changed?** *"Iceberg Drift Velocity was perturbed by +20%."*
    - **Why did it matter?** *"The perturbation increased hazard clearance risk in the primary corridor, making the SAFE route preferred over BALANCED."*
    - **Did the recommendation change?** *"Yes. Recommended route changed from BALANCED to SAFE."*
16. **Show Data Provenance Banner**: Point out `COUNTERFACTUAL SCENARIO — NOT OBSERVED DATA` provenance disclosure.
17. **Run Batch Sensitivity Analysis**: Click **`[ BATCH ANALYSIS ]`**.
18. **Show Batch Sensitivity Matrix**: Inspect the 5-parameter sensitivity table displaying parameter stability, recommendation change status, and **Dominant Sensitivity in Tested Scenarios** (e.g. `ICEBERG DRIFT`).
19. **Open Icebergs View**: Click **"Iceberg Intelligence"** (`activeView: 'icebergs'`).
20. **Show Trajectory What-If**: Open **TRAJECTORY WHAT-IF ANALYSIS** panel for selected iceberg (e.g. ICB-902), toggle `+20% Drift`, and observe baseline predicted trajectory vs perturbed trajectory offset ($\Delta\text{Displacement}$) and route corridor impact.
21. **Return to Navigation Station**: Return to Live Navigation View.
22. **EXPLAIN TO AUDIENCE / REVIEWERS:**
    > *"CRYO NAV does not assume its forecast is perfect. It tests whether the navigation decision remains stable when environmental assumptions are perturbed."*

---

## DECISION-IMPACT DATA ACQUISITION DEMONSTRATION (PHASE 6)

### Step 24: Phase 6 Judge Demonstration Flow — Decision-Impact Satellite Data Prioritization & 5-Minute Acquisition Budget

- **WHERE in website:** Data Acquisition View (`activeView: 'acquisition'`) & Live Navigation View (`activeView: 'navigation'`)
- **EXACT STEP-BY-STEP DEMO SEQUENCE:**

1. **Open Live Navigation**: View top banner callout: **TOP DATA PRIORITY — High-Resolution Sentinel-1C SAR (Score 92/100, CRITICAL)**.
2. **Open Data Acquisition View**: Click **"Data Acquisition"** on the left sidebar (`activeView: 'acquisition'`).
3. **Inspect Navigation Decision Context Header**: Point out current navigation decision (`SAFEST` corridor, `MEDIUM` Confidence, `SENSITIVE` Stability).
4. **Inspect 5-Step Feedback Loop Chain**:
   - `UNCERTAINTY` $\rightarrow$ `SENSITIVITY` $\rightarrow$ `DATA NEED` $\rightarrow$ `DATA PRIORITY` $\rightarrow$ `ACQUISITION`
5. **Inspect 5-Minute Acquisition Planning Budget**:
   - Show available downlink mode: `ONLINE (50.0 MB/min)` / `LIMITED (8.0 MB/min)` / `OFFLINE (0 MB/min)`.
   - Show 5-minute allocation summary: Allocated count, total downlink volume (MB), total downlink duration ($\le 5.0$ min cap).
6. **Inspect Observation Product Cards**:
   - Show ranked products: **Sentinel-1C EW C-Band SAR** (Score 92, CRITICAL), **CryoSat-2 SARIn** (Score 78, HIGH), **ECMWF IFS Weather Update** (Score 62, MEDIUM).
   - Expand **"WHY THIS DATA?"** panel on top product:
     - **Decision Context:** High uncertainty in iceberg trajectory along active corridor.
     - **Uncertainty Reduction:** 46% potential trajectory uncertainty reduction.
     - **Route Corridor Overlap:** 82% spatial overlap with active recommended route.
7. **Toggle Satellite Footprint Overlay on Map**:
   - Click **"View Footprint on Map"** on Sentinel-1C card.
   - Observe blue dashed footprint circle overlay (`#2563eb`) rendered on the Antarctic Leaflet map.
8. **Simulate Observation Ingestion**:
   - Click **"Acquire & Ingest"**.
   - Product status updates to `INGESTED & ACTIVE`.
   - Observe decision refresh notice and updated confidence state.
9. **Inspect Connectivity State Handling**:
   - Switch bandwidth mode to **`OFFLINE`**.
   - Observe status updating to `Downlink Unavailable`, decision impact score zeroed out, and cached provenance banner displayed.
10. **EXPLAIN TO AUDIENCE / REVIEWERS:**
    > *"CRYO NAV does not just download satellite imagery. It calculates which available observations have the highest Value of Information to resolve current navigation decision uncertainty under vessel bandwidth constraints."*

---

## REAL CDSE STAC CATALOGUE DISCOVERY DEMONSTRATION (PHASE 7A)

### Step 25: Phase 7A Judge Demonstration Flow — Live CDSE STAC Satellite Catalogue Discovery

- **WHERE in website:** Data Acquisition View (`activeView: 'acquisition'`) & Leaflet Polar Map
- **EXACT STEP-BY-STEP DEMO SEQUENCE:**

1. **Open CRYO NAV**: Launch application on `http://localhost:3000`.
2. **Select Mission**: Select mission **"Marguerite Bay & Rothera Resupply Transit"** in Mission Planning.
3. **Open Live Navigation**: View baseline route and note primary uncertainty (e.g. `ICEBERG TRAJECTORY UNCERTAINTY`).
4. **Open Data Acquisition Engine**: Click **"Data Acquisition"** on the left sidebar (`activeView: 'acquisition'`).
5. **Switch to REAL DATA Mode**: In the top header toggle, select **`REAL DATA`**.
6. **Inspect LIVE CDSE STAC SATELLITE CATALOGUE Panel**:
   - Source: `Copernicus Data Space Ecosystem (CDSE STAC API)`
   - Target Collection: `SENTINEL-1 (SAR)`
   - Query Bounding Box: Mission Route Corridor `[-70.0, -68.5, -56.0, -59.0]`
7. **Execute Live CDSE STAC Discovery Query**:
   - Click **`[ EXECUTE LIVE CDSE QUERY ]`**.
   - Observe real-time HTTP request to `/api/satellite/catalogue`.
8. **Show Live Catalogue Results**:
   - Status badge updates: `RESULTS (5 products)` with retrieval timestamp.
   - Discovered items display actual ESA STAC Product IDs (e.g. `S1D_EW_GRDM_1SSH_20260919T084010_...`).
   - Platform: `Sentinel-1D` / `Sentinel-1A`, Instrument: `SAR`, Product Type: `GRD` / `SLC`, Level: `LEVEL1`.
9. **Show Decision-Impact Pipeline Integration**:
   - Discovered real CDSE STAC items are automatically processed by `decisionImpactEngine.ts`, receiving Value-of-Information scores and priority rankings (`CRITICAL`, `HIGH`, `MEDIUM`).
10. **Show Explicit Product Status**:
    - Product cards display explicit badge: **`CATALOGUE ITEM — NOT YET ACQUIRED`**.
11. **Render Real STAC GeoJSON Geometry on Map**:
    - Click **"View Footprint on Map"** on top CDSE STAC product.
    - View dark blue dashed GeoJSON polygon footprint overlay (`#1e40af`) rendered on the Antarctic Leaflet map over the mission corridor.
12. **Demonstrate Failure Handling (CDSE Unavailable)**:
    - If network disconnects or API is unreachable, point out explicit alert: `CDSE CATALOGUE UNAVAILABLE`.
    - Zero synthetic satellite observations are fabricated in REAL mode.
13. **EXPLAIN TO AUDIENCE / REVIEWERS:**
    > *"CRYO NAV has identified actual satellite observations currently available from the Copernicus Data Space Ecosystem that are relevant to the active navigation decision. This phase discovers and prioritizes the observation; full download and environmental ingestion are separate subsequent steps."*

---

## REAL SATELLITE PRODUCT ACQUISITION & LOCAL CACHING DEMONSTRATION (PHASE 7B)

### Step 26: Phase 7B Judge Demonstration Flow — Satellite Product Acquisition & Local Caching

- **WHERE in website:** Data Acquisition View (`activeView: 'acquisition'`)
- **EXACT STEP-BY-STEP DEMO SEQUENCE:**

1. **Open CRYO NAV & Switch to REAL Mode**: Launch application on `http://localhost:3000` and switch mode toggle to **`REAL DATA`**.
2. **Execute Live CDSE STAC Search**: Click **`[ EXECUTE LIVE CDSE QUERY ]`** in Data Acquisition view to discover real Sentinel-1 products.
3. **Select Real Catalogue Item**: Pick a real Sentinel-1 product from the discovered list (e.g. `S1D_EW_GRDM_...`).
4. **Inspect Pre-Acquisition State**: Observe badge **`CATALOGUE ITEM`** or **`AVAILABLE FOR ACQUISITION`**.
5. **Click [ ACQUIRE ]**:
   - Status updates: `ACQUISITION REQUESTED` $\rightarrow$ `DOWNLOADING...`.
   - Server streams payload from CDSE endpoint over HTTPS directly to `./cache/satellite/`.
6. **Observe Post-Acquisition State**:
   - Status badge updates to **`VERIFIED`** (if SHA-256 matched source checksum) or **`CACHED`** (if source checksum was unavailable).
7. **Inspect Local Cache Panel**:
   - Scroll to **LOCAL SATELLITE CACHE & ACQUISITION STATUS**.
   - Review Product ID, Source, Collection, Acquisition timestamp, Downloaded size (MB), Local Cache reference path, and SHA-256 digest.
8. **Verify Processing Disclaimer**:
   - Observe cyan banner: **`PROCESSING: NOT YET PERFORMED`**.
   - Confirm that imagery has not been processed or integrated into the environmental grid (Phase 7B boundary).
9. **Test Offline Resilience**:
   - Set connectivity state to **`OFFLINE`**.
   - Attempting to acquire a new product shows: **`Acquisition unavailable while offline.`**
   - Previously acquired item displays: **`CACHED PRODUCT AVAILABLE`**.
10. **EXPLAIN TO AUDIENCE / REVIEWERS:**
    > *"CRYO NAV has acquired the selected Sentinel-1 satellite product from the Copernicus Data Space Ecosystem and cached it locally with SHA-256 integrity verification. Complete data provenance is preserved. Raw imagery processing and raster feature extraction remain un-executed until Phase 7C."*

---

## SENTINEL-1 SAR PREPROCESSING DEMONSTRATION (PHASE 7C.2-R)

### Step 27: Phase 7C.2-R Judge Demonstration Flow — Sentinel-1 SAR Preprocessing Pipeline

- **WHERE in website:** Data Acquisition View (`activeView: 'acquisition'`)
- **EXACT STEP-BY-STEP DEMO SEQUENCE:**

1. **Open CRYO NAV & Switch to REAL Mode**: Launch application on `http://localhost:3000` and switch mode toggle to **`REAL DATA`**.
2. **Validate Product Container**: In Local Satellite Cache panel, click **`[ VALIDATE PRODUCT ]`** (Phase 7C.1). Product displays `READY FOR SAR PROCESSING`.
3. **Execute SAR Preprocessing**: Click **`[ PROCESS SAR ]`** (Phase 7C.2-R).
4. **Observe Processing Lifecycle & Results**:
   - Processing status updates to `STATUS: PROCESSED`.
   - Calibration status displays `CALIBRATION: SENTINEL-1 PRODUCT CALIBRATION (LUT)` (if XML calibration LUT was provided) or `CALIBRATION: NOT YET IMPLEMENTED / INSUFFICIENT PRODUCT CALIBRATION DATA` (if LUT was missing).
5. **Inspect Audited Metadata Grid**:
   - Source CRS: Extracted from GeoTIFF tags or reported as `UNKNOWN / NOT EXPLICITLY PROVIDED`.
   - Pixel Spacing: Extracted from ModelPixelScaleTag or reported as `UNKNOWN / NOT EXPLICITLY PROVIDED`.
   - Statistics Domain: Explicitly labeled as `SIGMA0_DB` or `RAW_MEASUREMENT`.
6. **Verify Metric Counters & Disclaimers**:
   - Counters display: `validPixelCount`, `nodataPixelCount`, `invalidCalibrationCount`, `clippedPixelCount`.
   - Purple disclaimer banner confirms: `ICEBERG DETECTION: NOT YET PERFORMED`, `TERRAIN CORRECTION: NOT PERFORMED`.
7. **EXPLAIN TO AUDIENCE / REVIEWERS:**
    > *"CRYO NAV has processed the cached Sentinel-1 measurement band using an audited, scientifically honest calibration pipeline. No universal K=50 constants are assumed; calibration uses actual product LUT vectors when available, and explicitly preserves raw DN measurement without fabrication when calibration metadata is absent."*

---

## REAL SENTINEL-1 SAR CANDIDATE EXTRACTION DEMONSTRATION (PHASE 7C.3-SQ)

### Step 28: Phase 7C.3-SQ Judge Demonstration Flow — Real SAR Candidate Extraction

- **WHERE in website:** Satellite / SAR Analysis View (`activeView: 'sar'`) & Data Acquisition View (`activeView: 'acquisition'`)
- **EXACT STEP-BY-STEP DEMO SEQUENCE:**

1. **Open CRYO NAV**: Launch application on `http://localhost:3000`.
2. **Navigate to SAR / Satellite Analysis**: Click **"SAR Analysis"** on sidebar (`activeView: 'sar'`).
3. **Select REAL Sentinel-1 Product**: Select active real product (`S1A_IW_GRDH_1SDV_20260919T081522_20260919T081547_055734_06CE7B_92A1`).
4. **Start SAR Feature Extraction**: Click **`[ RUN SAR FEATURE EXTRACTION ]`** or **`[ EXTRACT CANDIDATES ]`**.
5. **Observe Actual Raster Processing**: Pipeline decodes actual Float32 $\sigma^0_{\text{dB}}$ raster, calculates local background clutter ($15 \times 15$ window), applies adaptive anomaly thresholding ($+6.0\text{ dB}$), runs binary morphology, minimum size filtering ($N_{\text{px}} \ge 5$), backscatter contrast verification, and shape convexity analysis.
6. **Display Resulting Candidate Overlay**: Map renders 3,604 extracted candidate target footprints over the SAR raster swath.
7. **Select Individual Candidate**: Click an extracted target on the map or candidate list.
8. **Show Source Product & Extracted Features**:
   - Source Product: `S1A_IW_GRDH_1SDV_20260919T081522_20260919T081547_055734_06CE7B_92A1`
   - Data Provenance: `REAL SENTINEL-1 SAR RASTER`
   - Row / Column: `R: 1240, C: 852`
   - Pixel Count: `8 px`
   - Estimated Area: `1,600 m²`
   - Linear Contrast Ratio: `4.12`
   - Background Std Dev: `2.4 dB`
   - Solidity: `0.85` | Compactness: `0.72` | Rectangularity: `0.78`
9. **Show Candidate Ranking Index**:
   - Score: `46 / 100` (`Candidate Ranking Index: 0–100` = $C_{\text{contrast}} + C_{\text{shape}} + C_{\text{size}} + C_{\text{homo}}$)
   - Explicit Label: `ENGINEERING CANDIDATE RANKING INDEX — NOT AN ICEBERG PROBABILITY`
10. **Show Candidate Status**:
    - Status Badge: **`UNCONFIRMED SAR CANDIDATE`**
    - Scientific Validation: **`CONDITIONALLY VERIFIED — BASELINE CANDIDATE EXTRACTION`**
11. **State Future Phase Boundary**: Explicitly inform reviewers that iceberg confirmation is a future Phase 7C.4 capability.

- **JUDGE-FACING STATEMENT:**
  > *"CRYO NAV is processing a real Sentinel-1 SAR product and extracting physically measurable SAR candidate features. These are intentionally labelled unconfirmed until independent confirmation evidence is applied."*

---

## REAL SAR CANDIDATE CONFIRMATION DEMONSTRATION (PHASE 7C.4)

### Step 29: Phase 7C.4 Judge Demonstration Flow — Multi-Source SAR Candidate Confirmation

- **WHERE in website:** Satellite / SAR Analysis View (`activeView: 'sar'`), Data Acquisition View (`activeView: 'acquisition'`) & Interactive Leaflet Polar Map
- **EXACT STEP-BY-STEP DEMO SEQUENCE:**

1. **Open CRYO NAV**: Launch application on `http://localhost:3000`.
2. **Navigate to SAR / Satellite Analysis**: Click **"Satellite Analysis"** / **"SAR Analysis"** on sidebar (`activeView: 'sar'`).
3. **Select REAL Sentinel-1 Product**: Select active real product (`S1A_IW_GRDH_1SDV_20260919T081522_20260919T081547_055734_06CE7B_92A1`).
4. **Execute SAR Processing & Candidate Extraction**: Run validation $\rightarrow$ preprocessing $\rightarrow$ candidate extraction (3,604 unconfirmed SAR candidates generated).
5. **Execute Candidate Confirmation**: Click **`[ RUN CANDIDATE CONFIRMATION ]`** or observe auto-evaluated multi-source evidence.
6. **Inspect Summary Statistics Box**:
   - Total Candidates: `3,604`
   - Unconfirmed: `3,598`
   - Supported: `6` (candidates with Copernicus sea-ice context)
   - Reference Matched: `0` (or count of candidates within configured 10.0 km radius of real USNIC iceberg observations)
   - Confirmation Unavailable: `0` (or count when environmental feeds are unpopulated)
7. **Inspect Display Filters**:
   - Toggle filters: `ALL` (3,604), `UNCONFIRMED`, `SUPPORTED`, `REFERENCE MATCHED`, `CONFIRMATION UNAVAILABLE`.
   - Confirm underlying dataset remains unchanged (non-destructive UI display filter).
8. **Select a Candidate Card / Map Marker**:
   - Click a candidate marker on Leaflet map or card in Candidate Evidence panel.
9. **Show Candidate Popup / Evidence Card Details**:
   - **Candidate ID:** `SAR_CAND_0001`
   - **Status Badge:** `UNCONFIRMED` / `SUPPORTED` / `REFERENCE_MATCHED` / `CONFIRMATION_UNAVAILABLE`
   - **SAR Evidence:** Mean $\sigma^0$ dB (-12.4 dB), Contrast (+7.8 dB), Candidate Ranking Index (46/100)
   - **Environmental Context:** Sea-Ice Context (`ICE EDGE CONTEXT` / `OPEN WATER CONTEXT` / `SEA ICE CONTEXT` / `UNAVAILABLE`)
   - **Reference Match:** USNIC Reference (`REFERENCE_MATCH_AVAILABLE` with reference ID & separation distance, or `NO_REFERENCE_MATCH`, or `REFERENCE_DATA_UNAVAILABLE`)
   - **Temporal Evidence:** Persistence (`TEMPORAL_EVIDENCE_UNAVAILABLE` when single acquisition)
10. **Inspect Mandatory Scientific Limitation Notice**:
    - Highlight explicit notice on popup/card: *"Candidate is not an independently confirmed iceberg."*
11. **Verify Source Provenance Traceability**:
    - Provenance tags displayed: `Sentinel-1 SAR`, `Copernicus Marine`, `USNIC Iceberg Catalog`.
12. **EXPLAIN TO AUDIENCE / REVIEWERS:**
    > *"CRYO NAV first identifies SAR candidates from real Sentinel-1 observations. It then evaluates independent environmental and reference evidence before assigning a confirmation status. A SAR candidate is not automatically treated as an iceberg."*

---

## AREA-CENTRIC SAR ANALYSIS DEMONSTRATION (PHASE 7C.4-UX REDESIGN)

### Step 30: Phase 7C.4-UX Judge Demonstration Flow — Area-Centric SAR Analysis

- **WHERE in website:** Main Interactive Leaflet Polar Map (`activeView: 'dashboard'`)
- **EXACT STEP-BY-STEP DEMO SEQUENCE:**

1. **Open CRYO NAV**: Launch application on `http://localhost:3000`.
2. **Set Source & Destination**: Configure origin and destination coordinates.
3. **Generate Route Corridors**: Compute active vessel transit corridors.
4. **Main Map Visualization**: Observe that the main navigation map remains clean by default, displaying vessel position, route corridors, sea-ice field, iceberg observations, currents, weather, and uncertainty. Thousands of SAR candidate dots are NOT displayed by default.
5. **Initiate Area Analysis**: Click **`[ ANALYZE AREA ]`** on top map toolbar (or **`[ ANALYZE AHEAD ]`** for corridor ahead of vessel).
6. **Define Analysis Area**: Click a location on map to set a 25 km / 50 km / 100 km radius point or drag rectangle area.
7. **Check Sentinel-1 Real Coverage**: Selected Area Coverage card displays `Sentinel-1 Coverage: AVAILABLE` (with Product ID, Acquisition timestamp, and Source) or `NOT AVAILABLE`.
8. **Execute Area Analysis**: Click **`[ ANALYZE AVAILABLE DATA ]`**.
9. **Inspect Area Condition Report**: Dedicated slide-over panel opens presenting structured analysis:
   - **Location & Area:** Selected area coordinates and geometric area ($km^2$)
   - **Satellite Coverage:** Real Sentinel-1 product ID and source
   - **SAR Candidate Evidence:** Total candidates in area (e.g., `12`), highest Candidate Ranking Index (e.g., `46/100`), status (`UNCONFIRMED`)
   - **Sea-Ice Context:** Real Copernicus sea-ice context (`ICE EDGE CONTEXT`)
   - **USNIC Reference:** USNIC iceberg match status (`NO MATCH`)
   - **Environmental Feeds:** Weather and Ocean Currents availability
   - **Data Freshness & Confidence:** Real timestamp offset and environmental confidence
   - **Decision Impact:** Integration status with VoI engine
10. **Reveal SAR Evidence (Optional)**: Click **`[ VIEW SAR EVIDENCE ]`** inside panel to temporarily render candidate markers strictly within the selected analysis area.
11. **Inspect Individual Candidate**: Click a candidate marker in the selected area to inspect physical features ($\sigma^0_{\text{dB}}$, contrast, dimensions, source product).
12. **Close Analysis**: Close panel or click **`[ Close Evidence ]`** to return to clean navigation map.

- **JUDGE-FACING STATEMENT:**
  > *"CRYO NAV does not command Sentinel-1 to acquire imagery on demand. It searches for and analyzes available real Sentinel-1 acquisitions covering the selected area. Phase 7C.4 introduces area-centric SAR analysis. SAR candidates remain an internal analytical result rather than a permanent navigation-map layer."*

---

## PHASE 9 OFFLINE-FIRST NAVIGATION DEMONSTRATION (PHASE 9C INTEGRATION)

### Step 31: Phase 9 Offline-First Navigation Demonstration Flow

- **WHERE in website:** Main Live Navigation View (`activeView: 'navigation'`)
- **EXACT STEP-BY-STEP DEMO SEQUENCE:**

1. **Open CRYO NAV**: Launch application at `http://localhost:3000`.
2. **Navigate to Live Navigation**: Click **"Live Navigation"** on sidebar.
3. **Observe Offline Status Panel**: Inspect the new top **Offline Connectivity & Readiness Panel**.
   - **Connection State:** Displays `ONLINE` with green indicator.
   - **Local Data Availability:** Displays `AVAILABLE` or `PARTIAL`.
   - **Last Sync Timestamp:** Displays ISO timestamp of latest background cache sync.
   - **Dataset Provenance Table:** Shows Sea Ice (`REAL`), Ocean (`REAL`), Weather (`REAL`), Icebergs (`REAL`), Route (`REAL`), Voyage State (`REAL`) with `Live data` labels.
4. **Disable Network Connectivity**: Disable network adapter or toggle browser Offline mode.
5. **Observe Instant State Transition**:
   - Connection status switches to **`OFFLINE`** (`Operating from cached data`).
   - Data stream labels transition from `Live data` to **`Cached data`**.
   - Data provenance labels remain preserved (cached `REAL` data stays `REAL`, cached `SIMULATED` data stays `SIMULATED`).
6. **Verify Navigation System Usability**:
   - Navigation screen, interactive map, voyage telemetry, route planner, and iceberg encounter panel remain fully responsive and functional.
   - System does NOT crash, block interaction, or display blank screens.
   - System does NOT inject synthetic fallback data or claim cached data is live.
7. **Restore Network Connectivity**:
   - Re-enable network adapter.
   - Status transitions back to **`ONLINE`** (`Live data available`).
   - System maintains distinction that sync occurs only upon explicit update without falsely claiming unperformed syncs.

- **JUDGE-FACING STATEMENT:**
  > *"CRYO NAV does not simply stop when connectivity disappears. Instead, the navigation interface remains available, last verified data remains locally accessible in IndexedDB storage, data age and provenance are visible, cached and live information are clearly distinguished, and the system never fabricates missing data."*

---

## PHASE 10 UNCERTAINTY-AWARE NAVIGATION & MAP INTEGRATION (PHASE 10C INTEGRATION)

### Step 32: Phase 10 Uncertainty-Aware Navigation Demonstration Flow

- **WHERE in website:** Main Live Navigation View (`activeView: 'navigation'`)
- **EXACT STEP-BY-STEP DEMO SEQUENCE:**

1. **Open Live Navigation Workspace**: Launch application at `http://localhost:3000` and navigate to **"Live Navigation"**.
2. **Inspect Uncertainty Zone & Explanation Panel**:
   - Locate top **Uncertainty Zone & Explanation Panel**.
   - Observe baseline parameters: Hazard Type (`ICEBERG`), Confidence (`HIGH`), Freshness (`FRESH`), Horizon (`+0h`), Radius (`±0.8 nm`), Caution Level (`STANDARD`), and Data Mode (`REAL`).
3. **Observe Antarctic Map Overlay**:
   - Inspect Leaflet GIS map. Translucent cyan dashed envelope (`±0.8 nm`) is drawn around the target hazard.
   - Hover cursor or click envelope: Tooltip/Popup confirms *"Model Uncertainty Zone (+0h)"* with explicit scientific disclaimer: *"Model spatial uncertainty envelope — NOT a confirmed hazard boundary or collision guarantee."*
4. **Demonstrate Horizon Uncertainty Expansion**:
   - Move bottom **Timeline Slider** from `+0h` $\rightarrow$ `+24h` $\rightarrow$ `+48h` $\rightarrow$ `+72h`.
   - Observe dynamic spatial envelope expansion on map (from `±0.8 nm` to `±1.92 nm`).
   - Uncertainty Zone Panel updates reason: `"+72h forecast horizon (+140% horizon growth factor)"` and Caution Level shifts to `ELEVATED` / `HIGH`.
5. **Demonstrate Offline Connectivity Uncertainty Expansion**:
   - Disable network adapter or toggle DevTools Offline mode.
   - Panel updates connection state to **`OFFLINE`** (`Operating from cached data`).
   - Uncertainty expansion factor increases by 1.35x. Expanded radius grows on map. Explanation explicitly details offline cache latency.
6. **Verify No Automatic Route Alteration**:
   - Observe that selected route corridor, waypoints, and vessel path remain intact.
   - Increased uncertainty communicates decision-support caution without triggering automatic route deletion or unauthorized replanning.
7. **Restore Connectivity**:
   - Re-enable network connectivity. Status reverts to `ONLINE` and uncertainty envelope tightens accordingly.

- **JUDGE-FACING STATEMENT:**
  > *"CRYO NAV does not treat a prediction as a precise point. Instead, when confidence decreases, data becomes stale, connectivity is lost, or forecast horizon increases, the modeled spatial uncertainty zone expands deterministically, making forecast risk operationally visible to the navigator without mutating underlying routes."*

---

## PHASE 11 DECISION-IMPACT DATA ACQUISITION UI DEMONSTRATION (PHASE 11B)

### Step 33: Phase 11 Decision-Impact Data Acquisition UI Demonstration Flow

- **WHERE in website:** Decision-Impact Acquisition Panel / Data Acquisition View
- **EXACT STEP-BY-STEP DEMO SEQUENCE:**

1. **Open Decision-Impact Acquisition UI**: Inspect `DecisionImpactAcquisitionPanel` component.
2. **Inspect Navigation Decision Overview**:
   - **Current Route:** Displays active recommended route corridor (`Recommended Safe Route`).
   - **Decision Sensitivity:** Displays deterministic stability state (`SENSITIVE` / `HIGHLY_SENSITIVE`).
   - **Current Uncertainty:** Displays active uncertainty zone description (`Uncertainty Zone (2.5 nm radius)`).
   - **Connectivity:** Displays active connection state (`ONLINE` / `LIMITED` / `OFFLINE` / `SYNCING`).
   - **Available Bandwidth:** Displays current downlink bandwidth budget (e.g. `100 MB available`).
3. **Inspect Ranked Data Acquisition Priorities**:
   - Review ranked candidate products sorted deterministically by **Engineering Priority Index (0–100)**.
   - Note priority levels (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`) and explicit labeling: *"Engineering Priority Index (NOT a hazard or collision probability)"*.
4. **Inspect Candidate Card Details**:
   - **Affected Decision:** Shows specific route choice & navigation corridor affected.
   - **Uncertainty Addressed:** Shows spatial/temporal uncertainty zone addressed.
   - **Expected Decision Impact:** Shows expected effect on decision stability (e.g. *"Potential route recommendation shift or corridor risk reduction"*).
   - **Expected Uncertainty Reduction:** Displays percentage reduction (e.g. `-65%`).
   - **Bandwidth Budget Fit:** Clearly distinguishes `Within current budget` vs `Exceeds current budget`.
   - **Reason for Priority:** Displays clear human-readable explanation of why the product was prioritized.
5. **Inspect SAR Evidence & Provenance Disclosures**:
   - **SAR Terminology:** Verified use of `"SAR evidence/candidate region"` with zero false certainty language (`"confirmed iceberg"` is strictly avoided).
   - **Provenance:** Preserves `REAL`, `SIMULATED`, `HYBRID` provenance metadata.
6. **Inspect Connectivity & Budget State Handling**:
   - In `OFFLINE` state: Candidates display `Ready when connected` status.
   - In `LIMITED` state: Bandwidth budget constraints evaluate product size against bandwidth limit without performing unrequested downloads.

- **JUDGE-FACING STATEMENT:**
  > *"CRYO NAV does not download everything. Instead, it evaluates discoverable satellite products against route sensitivity and bandwidth limits to identify which specific acquisitions can actually alter the active navigation decision."*

---

## PHASE 11C DECISION-IMPACT DATA ACQUISITION INTEGRATION DEMONSTRATION (PHASE 11C)

### Step 34: Phase 11C Decision-Impact Data Acquisition Integration Navigation Demonstration

- **WHERE in website:** Navigation View (`activeView: 'navigation'`)
- **EXACT STEP-BY-STEP DEMO SEQUENCE:**

1. **Start CRYO NAV & Navigate**:
   - Launch application (`npm run dev`).
   - Click **"Navigation"** on the left navigation sidebar.
2. **Observe Current Route & Navigation State**:
   - View vessel position, active route corridor, waypoints, ETA, and distance in top navigation header cards.
3. **Observe Uncertainty Information**:
   - Inspect the **Uncertainty Zone Panel** displaying spatial uncertainty envelope, confidence level, freshness, and forecast horizon.
4. **Locate Decision-Impact Data Acquisition Section**:
   - Scroll below Uncertainty Zone Panel to locate the section titled **"Decision-Impact Data Acquisition"** with supporting text: *"Prioritize available observations that could change the current navigation decision."*
5. **Show Current Route & Decision Context**:
   - Verify active route context, route sensitivity status, connectivity state, and available downlink bandwidth.
6. **Show Ranked Available Satellite Products**:
   - Observe ranked discoverable Sentinel-1 SAR products sorted by Value of Information (VoI).
7. **Open Highest-Priority Product**:
   - Click on the top candidate product card to expand details.
8. **Inspect Decision-Support Rationale**:
   - **Affected Decision:** Specific navigation decision corridor impacted.
   - **Uncertainty Addressed:** Spatial hazard uncertainty region targeted.
   - **Expected Decision Impact:** Quantified decision stability effect.
   - **Expected Uncertainty Reduction:** Percentage reduction in spatial uncertainty bounds.
   - **Acquisition Cost:** File size / downlink payload cost (MB).
   - **Bandwidth Fit:** Whether product satisfies current bandwidth budget constraints.
   - **Priority Assigned:** Priority level (`CRITICAL` / `HIGH` / `MEDIUM` / `LOW`).
9. **Switch to LIMITED Connectivity**:
   - Toggle connection state to **LIMITED** via application state controls.
10. **Observe Bandwidth Constraints**:
    - Panel dynamically updates bandwidth budget and flags products exceeding budget limits.
11. **Switch to OFFLINE Connectivity**:
    - Toggle connection state to **OFFLINE**.
12. **Observe Product Status Update**:
    - Products transition to `READY_WHEN_CONNECTED` status.
13. **Confirm No Download Occurs**:
    - System visualizes decision-impact metrics without initiating raster file downloads or satellite commands.
14. **Confirm No Automatic Route Replanning**:
    - Route waypoints, active alternative selection, and vessel guidance remain unaffected. Navigator retains full operational authority.

- **JUDGE-FACING STATEMENT:**
  > *"CRYO NAV does not simply download every available observation. It evaluates which available data could materially affect the current navigation decision and prioritizes acquisition accordingly."*
## PHASE 12 DECISION REASSESSMENT INTEGRATION DEMONSTRATION (PHASE 12C)

### Step 35: Phase 12C Decision Reassessment Controlled Navigation Integration

- **WHAT WAS BUILT:**
  Controlled integration of Phase 12A Decision Reassessment Engine (`decisionReassessmentEngine.ts`) and Phase 12B Decision Reassessment Panel (`DecisionReassessmentPanel.tsx`) into the active Live Navigation view (`NavigationView.tsx`).

- **WHERE in website:**
  Live Navigation & Vessel Conning Station (`activeView: 'navigation'`)

- **INTEGRATION ARCHITECTURE:**
  `Live Environmental / Navigation State` $\rightarrow$ `Previous Decision Snapshot` $\rightarrow$ `Current Decision Snapshot` $\rightarrow$ `decisionReassessmentEngine.ts` $\rightarrow$ `DecisionReassessmentPanel.tsx` $\rightarrow$ `Navigator Review`

- **JUDGE DEMO FLOW:**
  1. **Open Live Navigation:** Click **"Live Navigation"** on sidebar (`activeView: 'navigation'`).
  2. **Observe Initial Reassessment Panel:** Scroll to **DECISION REASSESSMENT** panel positioned near Voyage State, Hazard Encounter, Uncertainty, and Decision-Impact Acquisition panels.
  3. **Verify Initial Stability:** Confirm initial load displays status **`STABLE`** with green status badge. Verify that no false reassessment occurs on initial startup.
  4. **Inspect Baseline Metrics:** Panel displays previous vs current values for Confidence, Freshness, Connectivity, CPA/TCA, Uncertainty Radius, Primary Hazard, and Route Sensitivity.
  5. **Observe Change Detection:** As navigation telemetry, hazard proximity, or data freshness changes:
     - If parameters remain within stable bounds: Panel displays `STABLE`.
     - If hazard severity increases or CPA drops below safety threshold: Panel status transitions to `REASSESS` or `RECOMMEND_REVIEW`.
  6. **Inspect Trigger Reasons:** Panel displays exact trigger driver list detailing parameter deltas (e.g. *"Closest Point of Approach (CPA) decreased..."* or *"Data freshness degraded to AGING..."*).
  7. **Inspect Offline Behavior:**
     - Toggle connectivity to **OFFLINE**. Notice that `OFFLINE` alone does NOT trigger false reassessment.
     - If `OFFLINE` is combined with stale data and sensitive hazard: Engine produces `RECOMMEND_REVIEW` with clear trigger explanation.
  8. **Verify Data Provenance:** Panel clearly displays active provenance badge (`REAL`, `SIMULATED`, or `HYBRID`).
  9. **Verify Decision Support Guardrails:** Confirm that route geometry, waypoints, and vessel speed are NOT modified automatically. Navigator retains 100% operational authority.

- **DATA PROVENANCE & SCIENTIFIC INTEGRITY:**
  `REAL` when real environmental feeds are active; `SIMULATED` in synthetic demo mode. The integration uses real existing application state without artificial data fabrication.

















