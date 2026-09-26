# CRYO NAV — Scientific Forecasting & Real-Data-Driven Iceberg Trajectory

**Phase:** Phase 3B — Scientific Forecasting & Real-Data-Driven Iceberg Trajectory (Scientific Correction Audit)  
**Date:** September 20, 2026  
**System Version:** CRYO NAV v3.5-REAL-KINEMATIC  
**Scientific Validation Status:** NOT YET OPERATIONALLY VALIDATED  

---

## 1. Scientific Objective

Phase 3B upgrades CRYO NAV's trajectory intelligence pipeline from a prototype demonstration model to a **real-data-driven physical/kinematic forecast engine**.

When **REAL DATA** mode is active, the trajectory engine ingests real environmental inputs from authoritative polar data streams:
1. **Real USNIC Iceberg Observations** (US National Ice Center L4 Analyst Verified Catalog)
2. **Real Copernicus Marine Surface Ocean Currents** (Mercator NEMO 3D 1/12° Surface Hydrodynamic Model)
3. **Real ECMWF IFS 10m Weather Forecasts** (ECMWF IFS 0.25° Global Atmospheric Model via Open-Meteo)
4. **Phase 3A Unified Environmental Alignment State** ([`environmentalState.ts`](file:///c:/Users/JAGAN%20MOHAN/OneDrive/Desktop/cryo-nav%20-%20Copy/cryo-nav%20-%20Copy/src/data/environmentalState.ts))

---

## 2. Baseline 2D Kinematic Vector Formulation

Iceberg velocity vectors $\vec{V}_{\text{berg}}(x, y, t)$ are computed using a 2D physical kinematic vector momentum addition model combining surface ocean current drag and freeboard windage:

$$\vec{V}_{\text{berg}}(x, y, t) = \vec{V}_{\text{ocean}}(x, y, t) + C_{\text{wind}} \cdot \vec{V}_{\text{wind}}(x, y, t)$$

### Model Parameters & Scientific Classification

- **`C_wind` (Configurable Baseline Windage Parameter):** Default `0.025` (dimensionless, 2.5% of 10m wind vector).
  - **Scientific Classification:** **`MODEL ASSUMPTION / BASELINE PARAMETER`**
  - **Explicit Calibration Notice:**
    > *"This coefficient is a configurable baseline assumption used by the CRYO NAV kinematic demonstration model. It has not yet been calibrated against the current USNIC Antarctic iceberg tracks and must not be interpreted as a universally valid Antarctic iceberg windage coefficient."*
  - **Literature Context:** Polar oceanographic literature (Smith, 1993; Allison, 1989) provides general background motivation for freeboard aerodynamic drag modeling, but does NOT constitute empirical validation of CRYO NAV's exact default coefficient.
- **Ocean Current Forcing:** `1.0` (100% of Copernicus Marine 2D surface ocean current velocity at 0.49m depth).
- **Wind Vector Convention:** ECMWF meteorological wind direction is "direction wind is coming FROM". The aerodynamic force vector pushes the iceberg towards $(\theta_{\text{wind}} + 180)^\circ \pmod{360}$.

---

## 3. Configurable Parameter Architecture

The model parameter `windageCoefficient` is exposed as a configurable option (default `0.025`). The forecast result and model metadata record the exact coefficient used (`windageCoefficientUsed: 0.025`). This guarantees that future empirical validation can calibrate or tune the parameter without altering the underlying kinematic integration loop.

Existing forecast trajectories remain numerically identical when evaluated with the default coefficient `0.025`.

---

## 4. Ocean-Current Forcing Terminology

- **Precise Specification:** The model uses **surface ocean-current forcing** from the Copernicus Marine hydrodynamic product (`GLOBAL_ANALYSISFORECAST_PHY_001_024`).
- **Terminology Rule:** The trajectory engine is described as a **Baseline 2D Kinematic Iceberg Drift Model** consuming 2D surface current forcing. Although the underlying Copernicus product contains 3D hydrodynamic fields, CRYO NAV currently uses the surface layer (`0.49m`).

---

## 5. Explicit Model Limitations

The CRYO NAV Phase 3B baseline trajectory model has the following explicit scientific limitations:
1. **No full 3D iceberg body dynamics** (integrated volumetric mass/draft distribution is not modeled).
2. **No explicit keel-depth ocean current velocity profile** (uses surface 0.49m current vector only).
3. **No bathymetric grounding or shoal interaction model** (keel collision with sea floor is not simulated).
4. **No thermodynamic melt, thermal deterioration, or wave calving/fragmentation model**.
5. **No wave radiation drift force** or sea-state wave-action dynamics.
6. **No statistically calibrated windage parameter** (coefficient `0.025` is an uncalibrated baseline assumption).
7. **No operational validation yet** against historical track datasets.

---

## 6. Numerical Integration & Displacement Calculation

Position integration is executed using explicit numerical hourly timesteps ($dt = 1.0\text{ hour}$) from $T+0$ to $T+h$ (for forecast horizons $+6\text{h}$, $+12\text{h}$, $+24\text{h}$, $+48\text{h}$, $+72\text{h}$).

### Geodesic Displacement Equations
At each timestep:
$$\Delta \text{lat} = \frac{v_{\text{north}} \cdot 1.852 \cdot dt}{111.139\text{ km/deg}}$$

$$\Delta \text{lon} = \frac{u_{\text{east}} \cdot 1.852 \cdot dt}{111.139 \cdot \cos(\text{lat}_{\text{rad}})\text{ km/deg}}$$

Where velocity components $u$ and $v$ are in knots ($1\text{ knot} = 1.852\text{ km/h}$).

---

## 7. Model-Derived Uncertainty Specification

Uncertainty is represented as an expanding spatial error envelope radius $\sigma(t)$ in nautical miles:

$$\sigma(t) = \sigma_0 + 0.65 \cdot \left(\frac{t}{6}\right)^{1.15}$$

- $\sigma_0$: Base observation uncertainty derived directly from initial satellite sensor metadata (e.g. 0.8 nm for USNIC SAR L4 analyst overpasses).
- **Labeling:** Explicitly designated as **`MODEL-DERIVED UNCERTAINTY`** (NOT a 95% confidence interval or statistically calibrated probability distribution).

---

## 8. Data Alignment & Input Provenance

- **Input Sources:** USNIC (Iceberg observations), Copernicus Marine (Surface ocean currents), ECMWF IFS (10m wind forecasts).
- **Forecast Computation:** Performed by CRYO NAV's kinematic integration engine. (USNIC/Copernicus/ECMWF provide input data streams, not the forecast computation).
- **Phase 3A Quality Integration:** If required real inputs are missing or unaligned, the forecast status is set to `UNAVAILABLE` or `DEGRADED` without synthetic data fabrication.

---

## 9. Comprehensive Scientific Limitation Statement

> *"CRYO NAV currently uses a transparent 2D kinematic baseline for iceberg drift. The model uses surface ocean-current forcing and ECMWF wind forcing with a configurable baseline windage coefficient. The default coefficient has not yet been calibrated against historical Antarctic iceberg trajectories."*
