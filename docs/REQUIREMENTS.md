# CRYO NAV — System Requirements & Capabilities Specification

**System Name:** CRYO NAV — AI-Enabled Antarctic Sea-Ice, Iceberg Trajectory & Navigation Decision Support System  
**Current Phase:** Phase 0 — Security, Configuration, Baseline Documentation and Project Health  
**Domain:** Polar Navigation Decision Support & Risk Quantification  

---

## 1. System Vision & Purpose

CRYO NAV is a specialized decision support system designed to assist ship captains, navigators, and polar expedition leaders operating research and logistics vessels in Antarctic waters (such as the Antarctic Peninsula, Marguerite Bay, and Weddell Sea).

> [!IMPORTANT]
> **Decision Support Mandate:** CRYO NAV is strictly an advisory decision-support system, **not** an autonomous steering system. Ultimate navigational authority and collision avoidance responsibility remains entirely with the human captain and qualified watch officer.

---

## 2. Requirements Matrix & Implementation Status

The matrix below details current, partial, and planned capabilities across all system domains.

### 2.1 Environmental Monitoring & Telemetry

| Feature / Requirement | Category | Status | Details |
| :--- | :--- | :--- | :--- |
| **Antarctic Peninsula Telemetry** | Observation | **CURRENTLY IMPLEMENTED** | Live integration via Open-Meteo & ECMWF API for surface winds, air/sea temp, barometric pressure, wave height, and currents. |
| **Synthetic Polar Grid Data** | Simulation | **CURRENTLY IMPLEMENTED** | High-density synthetic sea-ice grid and iceberg catalog simulating Marguerite Bay corridor hazards. |
| **Multi-Source Satellite Ingestion** | Observation | **PLANNED** | Real-time direct ingestion of Copernicus Sentinel-1 SAR GRD, MODIS, and CryoSat-2 altimetry products. |
| **Offline Telemetry Caching** | Storage | **PARTIALLY IMPLEMENTED** | Application context falls back to stored state on connection drop; persistent IndexedDB store planned. |

### 2.2 Cryosphere & Hazard Modeling

| Feature / Requirement | Category | Status | Details |
| :--- | :--- | :--- | :--- |
| **Sea-Ice Concentration & Stage** | Modeling | **CURRENTLY IMPLEMENTED** | Baseline advection-thermodynamic model (`seaIceModel.ts`) computing concentration % and stage at forecast horizons (+0h to +72h). |
| **Iceberg Trajectory Drift** | Prediction | **CURRENTLY IMPLEMENTED** | Deterministic drift model (`trajectoryModel.ts`) combining wind shear and current drag with uncertainty radius expansion. |
| **Uncertainty Quantification** | Physics | **CURRENTLY IMPLEMENTED** | Spatial uncertainty radius (nm) and confidence scores (0–100%) attached to iceberg tracks and sea-ice cells. |
| **Advanced Hydrodynamic Iceberg Coupling** | ML / Physics | **PLANNED** | High-fidelity hydrodynamic drift incorporating iceberg geometry, bathymetric grounding, and deep ocean shear. |

### 2.3 Route Optimization & Vessel Constraints

| Feature / Requirement | Category | Status | Details |
| :--- | :--- | :--- | :--- |
| **Multi-Objective Routing** | Optimization | **CURRENTLY IMPLEMENTED** | Multi-attribute route generator (`routingEngine.ts`) yielding 3 distinct alternatives (SAFEST, BALANCED, FASTEST). |
| **Polar Class Constraints** | Compliance | **CURRENTLY IMPLEMENTED** | Speed and route filtering based on vessel Ice Class (Polar Class 1 to Non-Ice Strengthened) and max sea-ice rating. |
| **Vessel Hydrodynamic Profiles** | Dynamics | **CURRENTLY IMPLEMENTED** | Draft, beam, fuel burn (tons/day), cruising/max speed, and turning constraints integrated into cost scoring. |
| **Dynamic Exclusion Zones** | Safety | **CURRENTLY IMPLEMENTED** | Polygon exclusion zones for marine protected areas and unmapped bathymetric hazards. |
| **A* / Fast Marching Grid Routing** | Algorithmic | **PLANNED** | Continuous spatial grid routing replacing baseline waypoint interpolation. |

### 2.4 Decision Impact Data Acquisition

| Feature / Requirement | Category | Status | Details |
| :--- | :--- | :--- | :--- |
| **Value of Information (VoI) Scoring** | Decision Intel | **CURRENTLY IMPLEMENTED** | Value of Information calculation (`decisionImpactEngine.ts`) prioritizing high-impact satellite observation swaths. |
| **Observation Acquisition Flow** | User Flow | **CURRENTLY IMPLEMENTED** | Simulated satellite swath purchase/acquisition resolving local iceberg/sea-ice uncertainty and shifting route recommendations. |
| **Autonomous Sensor Downlink Scheduling** | Automation | **PLANNED** | Automated tasking requests sent to satellite ground station networks. |

### 2.5 Real-Time Tracking & User Interface

| Feature / Requirement | Category | Status | Details |
| :--- | :--- | :--- | :--- |
| **Interactive Polar Leaflet Map** | GIS UI | **CURRENTLY IMPLEMENTED** | Custom map interface rendering sea-ice overlays, iceberg markers, drift vectors, uncertainty rings, and route lines. |
| **GPS Tracking Simulation** | Navigation | **CURRENTLY IMPLEMENTED** | Real-time vessel position simulation along active route with cross-track error, heading, and distance-to-go calculations. |
| **Active Alerting Engine** | Safety | **CURRENTLY IMPLEMENTED** | Contextual alerts for iceberg proximity, stale data, route deviation, and recommendation changes. |
| **Scenario Perturbation Testing** | Simulation | **CURRENTLY IMPLEMENTED** | Controls to perturb wind, sea-ice severity, and iceberg drift offset to test route resilience. |

### 2.6 AI Decision Assistant

| Feature / Requirement | Category | Status | Details |
| :--- | :--- | :--- | :--- |
| **Gemini AI Decision Assistant** | AI / LLM | **CURRENTLY IMPLEMENTED** | Express proxy endpoint (`/api/gemini/assistant`) integrating Google Gemini model with system instruction grounding. |
| **Grounded Reasoning Engine** | RAG | **CURRENTLY IMPLEMENTED** | Injecting vessel profile, active route alternatives, weather, and top iceberg hazards into LLM context. |
| **Offline Rule-Based AI Fallback** | AI Safety | **CURRENTLY IMPLEMENTED** | Local decision support fallback responses when API key is unconfigured or network is disconnected. |

### 2.7 Verification & Validation

| Feature / Requirement | Category | Status | Details |
| :--- | :--- | :--- | :--- |
| **Baseline Project Health Checks** | QA | **CURRENTLY IMPLEMENTED** | End-to-end linting, TypeScript type-checking, build checks, and HTTP health endpoint (`/api/health`). |
| **Continuous Model Backtesting** | Validation | **PLANNED** | Automated model backtesting against historical Antarctic satellite tracks and buoy drift datasets. |

---

## 3. Human-in-the-Loop Operational Mandate

1. **Advisory Role:** All output produced by CRYO NAV is advisory.
2. **Authority:** Master / Captain retains absolute discretion and authority over all vessel maneuvers.
3. **Data Disclaimer:** Baseline and synthetic environmental data are for demonstration and decision support testing only and MUST NOT be used as the sole basis for real-world polar navigation.
