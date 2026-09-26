# CRYO NAV — Phase 7C.3 / 7C.3-SQ SAR Feature Extraction & Scientific Filtering

## 1. Overview & Strict Scientific Boundary

Phase 7C.3 / 7C.3-SQ implements interpretable SAR feature extraction, candidate-quality filtering, and candidate ranking from Phase 7C.2 processed Sentinel-1 SAR rasters ($\sigma^0$ / $\sigma^0 \text{ dB}$).

> [!IMPORTANT]
> **STRICT SCIENTIFIC BOUNDARY ENFORCEMENT:**
> - Feature extraction produces **UNCONFIRMED SAR TARGET CANDIDATES**.
> - Candidates are **NEVER** labeled as "CONFIRMED ICEBERGS".
> - UI panels, Leaflet map overlays, and API responses strictly display:
>   - `STATUS: UNCONFIRMED SAR CANDIDATE`
>   - `ICEBERG CONFIRMATION: NOT YET PERFORMED`
> - Feature extraction thresholding, filtering, and morphology settings are explicitly declared as **BASELINE ENGINEERING PARAMETERS**.
> - The candidate score (0–100) is a **Candidate Ranking Index (Baseline Heuristic Index)** — NOT a statistical detection probability.
> - Confirmation has NOT been performed.
> - Raw threshold-connected components are preserved separately from filtered candidates for complete scientific auditability.

## 1.1 Phase 7C.3-R & 7C.3-SQ Pipeline Architectural Progression

Previous Pipeline:
$$\text{SIGMA0\_DB} \longrightarrow \text{threshold} \longrightarrow \text{connected components} \longrightarrow \text{candidates}$$

Phase 7C.3-SQ Scientifically Defensible Filtering Pipeline:
$$\text{SIGMA0\_DB} \longrightarrow \text{nodata/background masking} \longrightarrow \text{adaptive anomaly mask} \longrightarrow \text{morphology/noise suppression}$$
$$\longrightarrow \text{connected components} \longrightarrow \text{physical plausibility filtering} \longrightarrow \text{feature extraction} \longrightarrow \text{candidate ranking} \longrightarrow \text{UNCONFIRMED SAR CANDIDATES}$$

---

## 2. Raw Components vs Filtered Candidates

Two explicit processing stages are established:
1. **RAW SAR COMPONENTS**: All contiguous 8-connected pixel clusters exceeding the backscatter anomaly threshold prior to size and quality filtering. Recorded in `rawComponentsCount`.
2. **FILTERED SAR CANDIDATES**: Surviving candidates after morphological noise suppression, size filtering, backscatter contrast verification, background variability filtering, and shape coherence evaluation. Recorded in `filteredCandidatesCount`.

### Rejection Summary Categorization
Every rejected component is assigned a machine-readable rejection code in `rejectionSummary`:
- `TOO_SMALL`: Component pixel count below `minCandidatePixels`.
- `LOW_CONTRAST`: Linear contrast ratio ($\frac{\text{meanTargetLinear}}{\text{meanBackgroundLinear}}$) below `minLinearContrastRatio`.
- `HIGH_BACKGROUND_VARIABILITY`: Local background standard deviation ($\text{backgroundStdDb}$) exceeding `maxBackgroundStdDb`.
- `LOW_SHAPE_COHERENCE`: Convexity / solidity ($\frac{\text{areaPixels}}{\text{convexHullArea}}$) below `minSolidity`.
- `INVALID_GEOMETRY`: Corrupt or non-positive spatial bounding dimensions.
- `OUTSIDE_VALID_CONTEXT`: Target outside valid region of interest.

> [!NOTE]
> Terminology rule: Rejections NEVER use "NOT_ICEBERG" because iceberg confirmation has not been performed.

---

## 3. Baseline Engineering Parameters & Filtering Rules

All parameters are explicitly declared in output records as `BASELINE ENGINEERING PARAMETERS`:

| Parameter | Default Value | Description |
| :--- | :--- | :--- |
| `minCandidatePixels` | `5 px` (configurable 3–15 px) | Baseline engineering speckle-suppression minimum size filter |
| `morphologyKernelSize` | `3 px` | Structuring element kernel size for binary morphological opening |
| `minLinearContrastRatio` | `1.20` | Minimum physical linear backscatter ratio ($\frac{\mu_{\text{target,linear}}}{\mu_{\text{bg,linear}}}$) |
| `maxBackgroundStdDb` | `10.0 dB` | Maximum allowable local background standard deviation |
| `minSolidity` | `0.10` | Minimum shape convexity ratio ($\frac{\text{area}}{\text{convexHullArea}}$) |
| `thresholdOffsetDb` | `+6.0 dB` | Anomaly detection threshold above local background mean |

---

## 4. Physical Backscatter & Contrast Metrics

For each candidate, both decibel and physical linear backscatter values are computed:
- **Target Mean Linear**: $\mu_{\text{target,linear}} = 10^{\text{meanTargetSigma0Db} / 10}$
- **Background Mean Linear**: $\mu_{\text{bg,linear}} = 10^{\text{backgroundMeanDb} / 10}$
- **Contrast dB**: $\text{contrastDb} = \text{meanTargetSigma0Db} - \text{backgroundMeanDb}$
- **Linear Contrast Ratio**: $\text{linearContrastRatio} = \frac{\mu_{\text{target,linear}}}{\mu_{\text{bg,linear}}}$

> [!IMPORTANT]
> Decibel subtraction ($\text{contrastDb}$) is NOT used as a physical ratio. Both `contrastDb` and `linearContrastRatio` are preserved.

---

## 5. Background Homogeneity Metrics

Local clutter statistics are calculated using a $15 \times 15$ moving window surrounding the candidate centroid:
- `backgroundMeanDb`: Local background mean backscatter.
- `backgroundStdDb`: Local background backscatter standard deviation.
- `backgroundCoeffVariation`: $C_v = \frac{\text{backgroundStdDb}}{|\text{backgroundMeanDb}|}$.

Targets embedded in highly heterogeneous clutter receive lower candidate ranking scores or rejection (`HIGH_BACKGROUND_VARIABILITY`).

---

## 6. Extended Shape & Convexity Metrics

Each candidate record includes comprehensive shape features:
- **Area**: `pixelCount` and `estimatedAreaM2` ($A = N_{\text{px}} \times w_{\text{px}} \times h_{\text{px}}$).
- **Bounding Envelope**: `estimatedWidthMeters`, `estimatedHeightMeters`.
- **Aspect Ratio**: $\text{aspectRatio} = \frac{\max(w_{\text{px}}, h_{\text{px}})}{\min(w_{\text{px}}, h_{\text{px}})} \ge 1.0$.
- **Compactness**: $\text{compactness} = \frac{4 \pi \cdot N_{\text{px}}}{P^2}$.
- **Rectangularity**: $\text{rectangularity} = \frac{N_{\text{px}}}{w_{\text{px}} \cdot h_{\text{px}}}$.
- **Convex Hull & Solidity**: Andrew's Monotone Chain 2D convex hull calculation: $\text{solidity} = \frac{N_{\text{px}}}{\text{convexHullAreaPixels}}$.
- **Elongation**: $\text{elongation} = 1.0 - \frac{1.0}{\text{aspectRatio}}$.

---

## 7. Sea-Ice Context & No-Synthetic Policy

- If real sea-ice context data is present, candidate is associated with local sea-ice concentration.
- If real sea-ice data is missing or spatially/temporally misaligned, `seaIceContext` is set strictly to `'UNAVAILABLE'`.
- Production REAL mode contains ZERO synthetic fallbacks (`Math.random()`, fake clusters, or synthetic raster pixels).

---

## 8. Multi-Feature Candidate Ranking Index (0–100)

The candidate score is calculated using explicit engineering weights labeled:
`BASELINE ENGINEERING WEIGHT` / `NOT EMPIRICALLY CALIBRATED`.

The score is a direct convex linear combination of four sub-component contributions ($C_{\text{contrast}} \le 35, C_{\text{shape}} \le 25, C_{\text{size}} \le 20, C_{\text{homo}} \le 20$):

$$\text{CandidateScore} = \text{Clamp}_{1}^{100} \left( \text{Math.round}(C_{\text{contrast}} + C_{\text{shape}} + C_{\text{size}} + C_{\text{homo}}) \right)$$

- **Contrast Contribution** ($C_{\text{contrast}} \le 35$): $C_{\text{contrast}} = \min(35, \max(0, (\text{linearContrastRatio} - 1.0) \times 3.5))$
- **Shape Coherence Contribution** ($C_{\text{shape}} \le 25$): $C_{\text{shape}} = \min(25, \max(0, (0.4 \cdot \text{solidity} + 0.3 \cdot \text{compactness} + 0.3 \cdot \text{rectangularity}) \times 25.0))$
- **Size Plausibility Contribution** ($C_{\text{size}} \le 20$): $C_{\text{size}} = \min(20, \max(0, \text{pixelCount}))$
- **Background Homogeneity Contribution** ($C_{\text{homo}} \le 20$): $C_{\text{homo}} = \min(20, \max(0, (8.0 - \min(8.0, \text{backgroundStdDb})) \times 2.5))$

- **Theoretical Score Bounds**: $[1, 100]$
- **Observed Score Range**: Min = $34$, Median = $39$, Mean = $39.25$, Max = $46$

Output name: `Candidate Ranking Index: 0–100`. NOT probability, confidence probability, or iceberg probability.

---

## 9. Stage-by-Stage Filtering Accounting & Density Audit Results

Product: `S1A_IW_GRDH_1SDV_20260919T081522_20260919T081547_055734_06CE7B_92A1` (4.19 Million Valid Pixels)

### Exact Filtering Stage Reconciliation (`input = accepted + rejected`)

| Stage | Filtering Operation | Input Count | Accepted Count | Rejected Count | Rejection Reason / Note |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Stage 0** | Raw Anomaly Thresholding ($> \text{bgMean} + 6\text{ dB}$) | 243,761 | 243,761 | 0 | `RAW_COMPONENTS` |
| **Stage 1** | Morphology (Isolated Pixel Removal) | 243,761 | 68,709 | 175,052 | `ISOLATED_PIXEL_REMOVAL` |
| **Stage 2** | Minimum Size Filter ($N_{\text{px}} \ge 5$) | 68,709 | 3,604 | 65,105 | `TOO_SMALL` |
| **Stage 3** | Contrast Filter ($\text{linearContrastRatio} \ge 1.20$) | 3,604 | 3,604 | 0 | `LOW_CONTRAST` (Redundant, $10^{0.6} \approx 3.98$) |
| **Stage 4** | Background Filter ($\text{backgroundStdDb} \le 10\text{ dB}$) | 3,604 | 3,604 | 0 | `HIGH_BACKGROUND_VARIABILITY` (Non-discriminative, max 6.18 dB) |
| **Stage 5** | Shape Filter ($\text{solidity} \ge 0.10$) | 3,604 | 3,604 | 0 | `LOW_SHAPE_COHERENCE` (Non-discriminative, min 0.47) |
| **Final** | **Surviving Candidates** | **3,604** | **3,604** | — | `UNCONFIRMED SAR CANDIDATES` |

### Sensitivity Audit Across `minCandidatePixels`

| Parameter (`minCandidatePixels`) | Raw Component Count | Filtered Candidate Count | Reduction Percentage |
| :--- | :--- | :--- | :--- |
| **1 px** | 243,761 | 68,709 | 71.81% |
| **3 px** | 243,761 | 23,767 | 90.25% |
| **5 px (Baseline)** | 243,761 | **3,604** | **98.52%** |
| **8 px** | 243,761 | 239 | 99.90% |
| **10 px** | 243,761 | 41 | 99.98% |
| **15 px** | 243,761 | 0 | 100.00% |

---

## 10. Verification & Test Compliance

- **Unit Test Suite**: 40 unit test cases passing in `src/test/sentinel1FeatureExtractor.test.ts`.
- **Master Test Suite**: All tests passing in `npx tsx src/test/runAllTests.ts`.
- **TypeScript**: Clean `npx tsc --noEmit` build (0 errors).
- **Production Build**: Clean `npm run build` bundle output.

- **Master Test Runner**: 134/134 tests passed in `src/test/runAllTests.ts`.
- **TypeScript Type Safety**: 0 errors (`npx tsc --noEmit`).
- **Production Build**: 0 errors (`npm run build`).
