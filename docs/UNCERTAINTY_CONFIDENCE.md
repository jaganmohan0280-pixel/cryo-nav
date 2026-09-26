# CRYO NAV — Uncertainty & Decision Confidence Engine
## Scientific & Technical Architecture Specification — Phase 4

### 1. Purpose & Objective

The **CRYO NAV Uncertainty & Decision Confidence Engine** transforms environmental quality, temporal alignment, spatial coverage, model uncertainty, and forecast horizon signals into **decision-level confidence**.

Decision-level confidence directly governs system routing behavior, risk penalties, UI banners, and data acquisition feedback loops. It ensures the decision-support system never presents an uncertain or degraded prediction as operationally trusted.

---

### 2. Confidence Levels & Operational Decision Impact

| Confidence Level | System Behavior & Routing Impact | Recommendation Status | Action Required |
| :--- | :--- | :--- | :--- |
| **HIGH** | Normal multi-objective route comparison (Safest, Balanced, Fastest). Standoff distance standard (3.5 nm). | **RECOMMENDATION ALLOWED** | Proceed with routine bridge watchkeeping and telemetry monitoring. |
| **MEDIUM** | Route alternatives available with explicit `[VERIFICATION RECOMMENDED]` flag. Expose aging/degraded factors. | **RECOMMENDATION ALLOWED** | Acquire updated environmental feeds prior to final route execution. |
| **LOW** | Conservative risk treatment applied. Hazard clearance buffer expanded (+40%), routing penalty applied near uncertain bergs, recommendation steered to SAFEST corridor. | **RECOMMENDATION ALLOWED (WITH CONSERVATIVE PENALTY)** | High-value satellite observation or radar verification recommended. |
| **CRITICAL** | Trusted navigation recommendation **BLOCKED** (`isRecommendationBlocked: true`). Route alternatives displayed as analytical scenarios only. Banner: `DECISION CONFIDENCE CRITICAL — NAVIGATION RECOMMENDATION BLOCKED`. | **RECOMMENDATION BLOCKED** | Acquire missing environmental telemetry before authorizing navigation decisions. |

> [!IMPORTANT]
> **Scientific Honesty & Heuristic Scores**: The numerical confidence score (0–100) is explicitly classified as a **decision-support heuristic** and baseline operational assumption. It is NOT a statistically calibrated probability distribution and has not been operationally validated in sea trials.

---

### 3. Factor Categories (10-Factor Auditable Breakdown)

The engine evaluates 10 explicit factor categories:

1. **DATA QUALITY**: Overall structural integrity of environmental pipelines (`VALID`, `PARTIAL`, `DEGRADED`, `UNAVAILABLE`).
2. **DATA FRESHNESS**: Max time offset across input feeds relative to operational target limits (<24h aging, <72h stale).
3. **TEMPORAL ALIGNMENT**: Multi-source temporal synchronization across Copernicus sea ice, ocean hydrodynamics, USNIC icebergs, and ECMWF IFS weather.
4. **SPATIAL COVERAGE**: Sector bounding box coverage over active navigation corridors (`COMPLETE`, `PARTIAL`, `NONE`).
5. **FORECAST HORIZON**: Model error propagation and kinematic vector divergence across integration horizons (+0h, +6h, +12h, +24h, +48h, +72h).
6. **TRAJECTORY UNCERTAINTY**: Expanding model-derived uncertainty envelope ($\sigma(t) = \sigma_0 + 0.65 \cdot t^{1.15}$).
7. **SEA-ICE UNCERTAINTY**: Copernicus Marine OSI SAF concentration grid variance and retrieval error bounds.
8. **WEATHER QUALITY**: ECMWF IFS 10m wind velocity and gale severity forcing measurement uncertainty.
9. **OCEAN QUALITY**: Copernicus Marine 3D NEMO ocean current velocity field presence and coverage.
10. **MODEL LIMITATIONS**: Material impact of baseline 2D kinematic model assumptions ($C_{\text{wind}} = 0.025$, no 3D keel hydrodynamics, no bathymetric grounding, no thermodynamic melt, no wave radiation drift).

---

### 4. Threshold Configuration (`CONFIDENCE_CONFIG`)

All operational threshold configurations are declared in `CONFIDENCE_CONFIG` within `src/services/confidenceEngine.ts`:

```typescript
export const CONFIDENCE_CONFIG = {
  freshnessThresholdsHours: {
    fresh: 6.0,
    aging: 24.0,
    stale: 72.0,
  },
  spatialCoverageThresholds: {
    complete: 0.9,
    partial: 0.5,
  },
  forecastHorizonThresholdsHours: {
    lowUncertainty: 24,
    moderateUncertainty: 48,
    highUncertainty: 72,
  },
  trajectoryUncertaintyThresholdsNm: {
    low: 4.0,
    moderate: 8.0,
    high: 15.0,
  },
  uncertaintyRiskMultiplier: {
    HIGH: 1.0,
    MEDIUM: 1.15,
    LOW: 1.4,
    CRITICAL: 2.0,
  },
  disclaimer:
    'Numeric confidence scores and threshold limits are decision-support heuristics and baseline operational assumptions. They are not statistically calibrated probability distributions and have not been operationally validated in sea trials.',
};
```

---

### 5. Decision Impact Feedback Loop ("What Would Improve Confidence?")

When decision confidence drops to `LOW` or `CRITICAL`, the system automatically identifies the **dominant limiting factor** and exposes structured `recommendedVerificationActions`:

- `"Acquire higher-resolution observation in route corridor (Decision Impact Engine)"`
- `"Acquire newer Copernicus sea-ice observation for Marguerite Bay sector"`
- `"Refresh ECMWF weather forecast telemetry"`
- `"Refresh Copernicus Marine ocean hydrodynamics data"`
- `"Review iceberg trajectory uncertainty under 2D drift model assumptions"`

These actions link directly into the **Decision Impact Engine** and **Data Acquisition View**, creating a closed-loop observation prioritization pipeline.

---

### 6. REAL vs DEMO Mode Behavior

- **REAL MODE**:
  - Uses only real Copernicus Marine, USNIC, and ECMWF IFS integrations.
  - If required environmental inputs are missing or return errors, confidence **degrades to CRITICAL / BLOCKED**.
  - The platform NEVER silently substitutes synthetic environmental data in REAL mode.

- **DEMO MODE**:
  - Uses synthetic Antarctic environmental data.
  - Clearly labeled with `DEMO / SYNTHETIC DATA` badges.

---

### 7. Verification Results

Deterministic automated test suite (`npm run test`) verifies:
- Test 1: Good data -> HIGH
- Test 2: Aging data -> MEDIUM
- Test 3: Significant drift uncertainty -> LOW
- Test 4: Missing required source -> CRITICAL (Recommendation BLOCKED)
- Test 5: Partial coverage -> Degraded confidence score
- Test 6: Long forecast horizon -> Reduced confidence score
- Test 7: LOW confidence -> Conservative route behavior & uncertainty penalty
- Test 8: CRITICAL confidence -> All recommendations BLOCKED
- Test 9: Recommended verification actions generated
- Test 10: REAL mode never falls back to synthetic data

**Result:** 20/20 test assertions passed.
