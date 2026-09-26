# CRYO NAV — Decision-Impact Data Acquisition Engine Documentation

## 1. Objective & Core Principle

The **Decision-Impact Data Acquisition Engine** (Phase 6) shifts data downlink planning from arbitrary observation schedules to decision-guided data prioritization.

> **Core Principle**: *"Identify which available observations have the greatest potential to improve the current navigation decision."*

Instead of downloading satellite products indiscriminately, CRYO NAV connects:
$$\text{CURRENT DECISION} \longrightarrow \text{WHAT IS UNCERTAIN?} \longrightarrow \text{WHAT COULD CHANGE THE DECISION?} \longrightarrow \text{WHICH OBSERVATION ADDRESSES THAT?} \longrightarrow \text{RANK OBSERVATIONS} \longrightarrow \text{SHOW WHY THEY MATTER}$$

---

## 2. Value-of-Information Heuristic Scoring Model

The composite decision-impact score ($0 \text{ to } 100$) is computed dynamically for each candidate satellite observation using a deterministic Value-of-Information heuristic formula:

$$\text{ImpactScore} = \text{Clamp}_{0..100}\left(\left(R_{\text{decision}} \times 0.25 + S_{\text{overlap}} \times 0.25 + U_{\text{reduction}} \times 0.20 + S_{\text{sensitivity}} \times 0.20 + T_{\text{relevance}} \times 0.10\right) \times C_{\text{connectivity}}\right)$$

### Scoring Factors

1. **Decision Relevance ($R_{\text{decision}}$)**:
   Matches candidate sensor type against Phase 4 Decision Confidence limiting factors (`ICEBERG TRAJECTORY UNCERTAINTY`, `SEA ICE UNCERTAINTY`, `WEATHER QUALITY`).
2. **Spatial Relevance ($S_{\text{overlap}}$)**:
   Calculates geometric overlap against recommended route waypoints, alternative route corridors, hazard zones, and positional error envelopes.
3. **Potential Uncertainty Reduction Weight ($U_{\text{reduction}}$)**:
   Baseline engineering heuristic relative weights/indices (NOT measured empirical uncertainty reductions):
   - High-Resolution SAR Interferometry: **46** (Relative weight index)
   - Dual-Polarization Iceberg Profiling: **32** (Relative weight index)
   - Altimeter Sea Ice Freeboard: **24** (Relative weight index)
   - Scatterometer Surface Wind: **28** (Relative weight index)
   - High-Resolution Optical: **20** (Relative weight index)
4. **Counterfactual Sensitivity Feedback ($S_{\text{sensitivity}}$)**:
   Integrated directly with Phase 5 Sensitivity Analysis output. If the recommended decision is `HIGHLY_SENSITIVE` to iceberg drift or sea-ice concentration, observations constraining that parameter receive a substantial score boost.
5. **Temporal Relevance ($T_{\text{relevance}}$)**:
   Evaluates observation freshness vs nowcast/departure time (Fresh $\le 6$h = 100%, aging $\le 24$h = 80%, stale $> 72$h = 20%).
6. **Connectivity & Bandwidth Penalty ($C_{\text{connectivity}}$)**:
   - `ONLINE`: Normal acquisition factor ($1.0$).
   - `LIMITED`: Bandwidth penalty for large files ($>100$ MB $\rightarrow 0.65\text{x}$, $<30$ MB $\rightarrow 1.1\text{x}$).
   - `OFFLINE`: Acquisition unavailable ($0.0\text{x}$, status = `Downlink Unavailable`).

---

## 3. Data Acquisition Priority Bands

Priority levels are explicitly classified as **DATA ACQUISITION PRIORITIES** to optimize bandwidth usage and resolve decision-critical uncertainties. They do NOT constitute political or operational vessel safety clearances:

- **`CRITICAL` ($\ge 85$)**: High decision relevance, high corridor overlap, directly addresses primary confidence barrier during high decision sensitivity.
- **`HIGH` ($70 - 84$)**: Intersects navigation corridor with high hazard proximity; provides fresh coverage to resolve spatial ambiguities.
- **`MEDIUM` ($45 - 69$)**: Moderate corridor overlap covering auxiliary route sectors; useful for background monitoring.
- **`LOW` ($< 45$)**: Peripheral spatial coverage or low sensitivity parameter; recommendation remains robust without downlink.

---

## 4. 5-Minute Acquisition Planning Window

The system implements a **5-Minute Acquisition Planning Window** as an estimated planning budget heuristic:
- **Bandwidth Planning Assumptions**:
  - `ONLINE`: 50 MB/min ($300\text{ MB in }5.0\text{ min}$) — Configurable planning assumption, not measured network speed.
  - `LIMITED`: 8 MB/min ($40\text{ MB in }5.0\text{ min}$) — Configurable planning assumption.
  - `OFFLINE`: 0 MB/min
- **Greedy Allocation**: Candidate products are allocated in descending order of decision-impact score until total estimated downlink time reaches $5.0$ minutes.
- **Disclaimer**: *"Configured planning budget assumption — actual downlink speeds depend on network link and provider availability."*

---

## 5. Offline-First & Cache Behavior

- **`OFFLINE` Mode**:
  - Acquisition status displays `Downlink Unavailable`.
  - Display Notice: *"Acquisition unavailable while offline. Cached data may remain available."*
  - Exposes cached observation timestamp, age, source, and verification state.
  - Does not silently simulate online downloads or fabricate downloaded data.

---

## 6. REAL vs DEMO Environmental Mode

- **`REAL` Mode**: Evaluates real available satellite product metadata and current real environmental state. If real metadata catalogue is unavailable, displays data acquisition recommendation as unavailable rather than fabricating synthetic observations.
- **`DEMO` Mode**: Simulated polar satellite metadata explicitly labeled as `DEMO / SYNTHETIC DATA`.

---

## 7. Operational Limitations & Scientific Disclaimers

1. **Value-of-Information Labeling**: The score is a decision-support heuristic, not a statistical Bayesian Value of Information.
2. **Uncertainty Language**: Systems use language *"Potential uncertainty reduction weight/index"*; never claiming an observation will definitely eliminate or reduce real-world uncertainty by X%.
3. **Sensor Weight Classification**: Sensor potential values (46, 32, 24, 28, 20) are baseline engineering relative weights, NOT empirically measured calibration parameters.
4. **Bandwidth Speeds**: Downlink speeds (50 MB/min, 8 MB/min) are configurable planning parameters for scheduling heuristics, NOT measured real-world vessel bandwidth.
5. **No Terminology Violations**: The phrase *"Digital Twin"* is strictly prohibited.
