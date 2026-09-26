# CRYO NAV — Sentinel-1 SAR Preprocessing Pipeline (Phase 7C.2-R)

## Scientific Calibration Correction & Raster Metadata Audit Specification

**Document Version:** 2.0.0 (Phase 7C.2-R Scientific Calibration Corrected)  
**Phase:** Phase 7C.2-R — Scientific Calibration Correction & Raster Metadata Audit  
**Status:** COMPLETED & SCIENTIFICALLY AUDITED  
**Date:** September 20, 2026  

---

## 1. Executive Summary & Audit Overview

Following a rigorous scientific audit, Phase 7C.2-R eliminates all hardcoded assumptions and fixed calibration constant claims (such as $K = 50.0$) from the CRYO NAV Sentinel-1 SAR preprocessing pipeline.

The corrected engine enforces an **honest 2-case outcome model**:
- **CASE A (Valid Sentinel-1 Product Calibration LUT Available):**
  Parses XML calibration LUT vectors (`calibrationVectorList` / `pixel` / `sigmaNought` / `betaNought`), performs linear LUT interpolation across swath pixel coordinates $x$, converts Digital Numbers ($DN$) to linear radar backscatter ($\sigma^0$), applies log zero-floor clamping ($10 \cdot \log_{10}(\max(\sigma^0, 10^{-5})) = -50\text{ dB}$), and computes decibel statistics.
- **CASE B (Calibration Metadata Missing/Insufficient in Product Payload):**
  Preserves raw measurement values ($DN$), sets `calibrationStatus: CALIBRATION_UNAVAILABLE_IN_PRODUCT`, sets `physicalQuantity: RAW_DN`, sets `statisticsDomain: RAW_MEASUREMENT`, and displays `CALIBRATION: NOT YET IMPLEMENTED / INSUFFICIENT PRODUCT CALIBRATION DATA` and `RAW MEASUREMENT: AVAILABLE` in the UI.

---

## 2. Radiometric Calibration & LUT Vector Interpolation

### 2.1 Calibration Lookup Vector Parsing (`parseCalibrationXml`)
Sentinel-1 calibration XML files (e.g. `annotation/calibration/calibration-s1a-iw-grd-hh-*.xml`) provide calibration vectors with pixel indices $x_i$ and scaling factors $A_{\sigma, i}$:

$$\text{calibrationVector} = \{ \text{line}, \text{pixel}[x_0, x_1, \dots, x_k], \text{sigmaNought}[A_{\sigma, 0}, A_{\sigma, 1}, \dots, A_{\sigma, k}] \}$$

### 2.2 Swath Pixel Linear Interpolation
For a given sample pixel coordinate $x$ along a raster line, scaling factor $A_{\sigma}(x)$ is linearly interpolated between adjacent vector points $x_i \le x \le x_{i+1}$:

$$A_{\sigma}(x) = A_{\sigma, i} + \frac{x - x_i}{x_{i+1} - x_i} \left( A_{\sigma, i+1} - A_{\sigma, i} \right)$$

### 2.3 Linear Backscatter & Decibel Conversion
Linear normalized backscatter coefficient $\sigma^0$:

$$\sigma^0(x) = \frac{DN(x)^2}{A_{\sigma}(x)^2}$$

Decibel scale conversion:

$$\sigma^0_{\text{dB}}(x) = 10 \cdot \log_{10} \left( \max(\sigma^0(x), 10^{-5}) \right)$$

---

## 3. GeoTIFF CRS & Resolution Audits

- **Coordinate Reference System (CRS):** GeoTIFF tags (34735/34737 GeoKeyDirectory) are strictly inspected. If missing or unprovided, `sourceCrs` is reported as `UNKNOWN / NOT EXPLICITLY PROVIDED` without guessing `EPSG:4326`.
- **Pixel Spacing & Resolution:** GeoTIFF tag 33550 (ModelPixelScaleTag) and XML metadata are inspected. If unprovided, `resolutionMeters` is reported as `null` and `pixelSpacing` as `UNKNOWN / NOT EXPLICITLY PROVIDED`.

---

## 4. Statistics Domain & Metric Counters

Raster statistics explicitly record their domain to prevent raw Digital Numbers from being mislabeled as calibrated backscatter:
- **`statisticsDomain`:** `'SIGMA0_DB'` (Case A) or `'RAW_MEASUREMENT'` (Case B).
- **Pixel Counters:** `validPixelCount`, `nodataPixelCount`, `invalidCalibrationCount`, `clippedPixelCount`.

---

## 5. UI Integration & Disclaimers

In `DataAcquisitionView.tsx`:
- **Case A Display:** `CALIBRATION: SENTINEL-1 PRODUCT CALIBRATION (LUT)`, `CALIBRATION SOURCE: <file path>`, `OUTPUT: σ⁰ / σ⁰ dB`.
- **Case B Display:** `CALIBRATION: NOT YET IMPLEMENTED / INSUFFICIENT PRODUCT CALIBRATION DATA`, `RAW MEASUREMENT: AVAILABLE`.
- **Boundary Disclaimers:**
  - `ICEBERG DETECTION: NOT YET PERFORMED`
  - `SEA-ICE EXTRACTION: NOT YET PERFORMED`
  - `TERRAIN CORRECTION: NOT PERFORMED`

---

## 6. Deterministic Verification

Verified by 15 deterministic unit tests in `src/test/sentinel1Processing.test.ts` and 109 master unit tests in `src/test/runAllTests.ts`.
