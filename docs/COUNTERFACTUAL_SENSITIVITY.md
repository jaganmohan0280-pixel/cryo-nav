# CRYO NAV — Counterfactual & Sensitivity Analysis Engine Documentation
## Phase 5 System Specification & Operational Principles

---

## 1. Executive Purpose & Objective

The **Counterfactual & Sensitivity Analysis Engine** (Phase 5) provides structured **WHAT-IF decision-support analysis** for Antarctic vessel navigation.

It directly answers the operational conning question:
> *"If the predicted environmental conditions change, does the recommended route change?"*

### Key Principles & Non-Goals:
1. **Decision Support, Not Future Prediction**: This engine evaluates recommendation stability under environmental perturbation. It is **NOT** intended to predict future physical reality.
2. **Strict Baseline vs Counterfactual Distinction**: The engine clearly demarcates actual baseline observed/forecast conditions from mathematical scenario overrides.
3. **No Fake Observations in REAL Mode**: In `REAL` data mode, scenario perturbations start from current Copernicus Marine and USNIC observations, applying transparent mathematical overrides labeled `COUNTERFACTUAL SCENARIO — NOT OBSERVED DATA`.
4. **No Digital Twin Terminology**: The system does not use terms like "Digital Twin".
5. **No Probabilistic Misrepresentation**: Sensitivity levels (`ROBUST`, `SENSITIVE`, `HIGHLY_SENSITIVE`) are deterministic WHAT-IF test metrics, **NOT** statistically calibrated probabilities of real-world likelihood.

---

## 2. Counterfactual Scenario Definitions & Controlled Perturbations

Initial scenarios implemented in `src/services/counterfactualEngine.ts`:

| Scenario ID | Parameter | Perturbation | Units | Operational Rationale | Baseline Reference |
|---|---|---|---|---|---|
| `OCEAN_CURRENT_POS_20` | Ocean Current | +20% | % | Evaluates route stability against ocean current velocity underestimation in hydrodynamic reanalysis. | Copernicus Marine 0.49m surface currents |
| `OCEAN_CURRENT_NEG_20` | Ocean Current | -20% | % | Evaluates route sensitivity if tidal and geostrophic currents are weaker than modeled. | Copernicus Marine 0.49m surface currents |
| `WIND_POS_20` | Wind Speed | +20% | % | Tests navigational impact of katabatic wind surges or localized Antarctic squalls. | ECMWF IFS 10m wind forecast |
| `WIND_NEG_20` | Wind Speed | -20% | % | Tests decision impact under calm surface atmospheric forcing conditions. | ECMWF IFS 10m wind forecast |
| `ICEBERG_DRIFT_POS_20` | Iceberg Drift | +20% | % | Tests whether faster iceberg movement compromises CPA clearance corridors along planned routes. | USNIC Iceberg Observations & Kinematic Model |
| `ICEBERG_DRIFT_NEG_20` | Iceberg Drift | -20% | % | Tests whether slower iceberg translation stalls icebergs in primary navigation channels. | USNIC Iceberg Observations & Kinematic Model |
| `SEA_ICE_POS_10` | Sea Ice Concentration | +10 | percentage points | Evaluates route tolerance if satellite concentration estimates underreport pack density. | Copernicus Marine sea ice concentration |
| `SEA_ICE_NEG_10` | Sea Ice Concentration | -10 | percentage points | Tests route corridor feasibility under unexpected ice lead opening. | Copernicus Marine sea ice concentration |
| `UNCERTAINTY_POS_25` | Uncertainty Envelope | +25% | % | Assesses decision robustness when positional error bounds and sensor aging expand. | Phase 3B/4 Uncertainty Engine |

All perturbation values are configurable.

---

## 3. Baseline vs Counterfactual Comparison

For every scenario, the engine calculates:

$$\Delta\text{Risk} = \text{ScenarioRisk} - \text{BaselineRisk} \quad (\%) $$
$$\Delta\text{ETA} = \text{ScenarioETA} - \text{BaselineETA} \quad (\text{hours}) $$
$$\Delta\text{Fuel} = \text{ScenarioFuel} - \text{BaselineFuel} \quad (\text{tons}) $$
$$\Delta\text{Distance} = \text{ScenarioDistance} - \text{BaselineDistance} \quad (\text{nm})$$

Additionally, the engine evaluates:
- `routeChanged`: Whether waypoint coordinates or corridor geometry altered.
- `recommendationChanged`: Whether the primary recommended route choice (`SAFE`, `BALANCED`, `FAST`) shifted.
- `hazardsChanged`: Whether near-hazard encounter counts changed along the corridor.

---

## 4. Route Stability Classification

Deterministic classification rules:

- **`ROBUST`**: The primary route recommendation remains unchanged across tested scenarios and risk deltas remain modest ($|\Delta\text{Risk}| \le 15\%$).
- **`SENSITIVE`**: Recommendation changes in some scenarios or risk deltas shift by $>15\%$.
- **`HIGHLY_SENSITIVE`**: Large repeated route/risk changes occur ($|\Delta\text{Risk}| > 20\%$) or hazard counts shift significantly.

---

## 5. Phase 4 Decision Confidence Integration

- Counterfactual scenarios preserve Decision Confidence level tracking.
- If baseline confidence is `CRITICAL`, counterfactual analysis runs for research and diagnostic purposes, but navigation recommendations remain **RECOMMENDATION BLOCKED**.
- Any confidence drop between baseline and counterfactual states is explicitly reported:
  > *"Decision confidence changed from HIGH to MEDIUM under this scenario."*

---

## 6. Data Provenance & Transparency

Every counterfactual result formats explicit data provenance:
- **`baselineProvenance`**: Identifies Copernicus Marine, USNIC, ECMWF IFS feeds or synthetic baseline.
- **`scenarioModification`**: Explicitly states `COUNTERFACTUAL SCENARIO — NOT OBSERVED DATA` along with the mathematical override applied.

---

## 7. Multi-Scenario Batch Sensitivity

The user can execute a batch analysis across the standard scenario suite. The engine groups results by parameter, computes overall stability, and identifies:
- **`Dominant Sensitivity in Tested Scenarios`**: Parameter exhibiting highest recommendation changes or mean risk deltas.
- Explicit notice: *"Dominant sensitivity in tested scenarios (Not a scientific probability of real-world likelihood)."*

---

## 8. Verification & Test Suite

The engine is verified via deterministic unit tests (`src/test/counterfactualEngine.test.ts`):
- 16/16 Phase 5 test assertions passing.
- 20/20 Phase 4 Decision Confidence assertions passing.
