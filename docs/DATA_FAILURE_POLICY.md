# CRYO NAV — Real Data Failure & Resilience Policy

**System:** CRYO NAV — AI-Enabled Antarctic Sea-Ice, Iceberg Trajectory & Navigation Decision Support System  
**Phase:** Phase 2A — Real Antarctic Data Source Reconnaissance  
**Domain:** System Safety, Error Fallback Behavior, and Operational Resilience  

---

## 1. Core Safety Mandate

> [!CAUTION]
> **CRACKDOWN ON DATA FABRICATION:** Under no circumstances shall CRYO NAV silently invent, fabricate, seed, or substitute synthetic numbers when real external data streams fail, timeout, or experience outage.

When real data cannot be fetched or fails schema validation, the system MUST operate under the strict failure protocols specified below.

---

## 2. Failure Scenarios & Mandated System Behaviors

### Scenario 1: Total Internet Disconnection / Shipboard Uplink Loss
- **Observed State:** Vessel operating in remote Antarctic sector with zero Iridium/Starlink connectivity (`connectionState = 'OFFLINE'`).
- **System Behavior:**
  1. Continue operating using the **last verified, cached environmental state** stored on local disk/IndexedDB.
  2. Prominently display an **OFFLINE WARNING BANNER** in the UI header detailing the timestamp of the last successful satellite sync.
  3. Automatically mark all environmental layers as **`STALE`** or **`AGING`**.
  4. Automatically expand positional uncertainty bounds on iceberg tracks ($\pm\text{NM}$) and sea-ice fields ($\pm\%$).
  5. Reduce decision confidence ratings (e.g. from `HIGH` to `MEDIUM` or `LOW`).

---

### Scenario 2: External Source API Outage or HTTP 5xx Error
- **Observed State:** Copernicus Marine, USNIC, or CDSE API returns HTTP 500, 503, connection timeout, or 404.
- **System Behavior:**
  1. **Do NOT fabricate a replacement dataset.**
  2. Log the exact HTTP status code, endpoint URL, and error message to the system diagnostic log.
  3. Display a localized **`SOURCE_UNAVAILABLE`** alert badge on the affected view tab (e.g. *"Copernicus Sea-Ice Feed Unavailable — Retaining 14h-old verified cache"*).
  4. Retain prior validated observations while flagging them as `STALE`.

---

### Scenario 3: Stale Data Expiry Threshold Exceeded
- **Observed State:** Time elapsed since `observationTime` exceeds standard operational freshness thresholds.
- **Expiry Thresholds:**
  - **Live Weather Telemetry:** $> 6 \text{ hours} \implies \text{STALE}$
  - **Sea Ice Concentration Grid:** $> 48 \text{ hours} \implies \text{STALE}$
  - **Iceberg Track Observations:** $> 14 \text{ days} \implies \text{STALE}$
- **System Behavior:**
  1. Flag `freshnessState = 'STALE'` on all affected UI panels and map tooltips.
  2. The risk engine (`riskEngine.ts`) automatically applies an **uncertainty penalty multiplier** ($1.25\times$ to $2.0\times$) to all cost evaluations along stale corridors.
  3. The route recommendation engine shifts recommendations toward conservative corridors to maintain IMO Polar Code safety buffers.

---

### Scenario 4: Corrupted, Out-of-Bounds, or Schema Validation Failure
- **Observed State:** Ingested NetCDF, GeoJSON, or JSON payload fails validation checks (e.g. negative sea-ice concentration, invalid lat/lon coordinates out of range $[-90, +90]$, missing timestamp).
- **System Behavior:**
  1. **Immediately reject the invalid dataset payload.**
  2. Do NOT pass corrupted data to the risk or routing engines.
  3. Log a high-severity system alert (`VALIDATION_FAILURE`).
  4. Retain the last known valid dataset state.

---

### Scenario 5: Spatial Coverage Gap or Partial Grid Coverage
- **Observed State:** Ingested satellite swath covers only a portion of the vessel's planned voyage corridor, leaving unmapped gaps.
- **System Behavior:**
  1. Display unmapped spatial sectors on the Leaflet map with a **`UNMAPPED / HIGH UNCERTAINTY`** pattern overlay.
  2. Assign maximum uncertainty score ($100/100$) to unmapped grid cells.
  3. Routing engine penalizes unmapped sectors, preferring corridors backed by validated satellite observations.

---

### Scenario 6: Satellite Product Acquisition Download Failure / Checksum Mismatch
- **Observed State:** `POST /api/satellite/acquire` encounters HTTP error, connection timeout, file size limit overflow (>500MB), or SHA-256 hash mismatch.
- **System Behavior:**
  1. Record acquisition status as **`ACQUISITION_FAILED`** and `verificationStatus = FAILED`.
  2. Log exact checksum or HTTP failure cause in acquisition metadata.
  3. **Do NOT mark product as `VERIFIED` or `CACHED`.**
  4. Do NOT retry indefinitely; allow manual retry or user inspection.

---

## 3. Resilience Matrix Summary

| Failure Condition | UI Indicator | Risk Engine Impact | Routing Recommendation Impact | Data Action |
| :--- | :--- | :--- | :--- | :--- |
| **Offline Connection** | Red `OFFLINE (CACHED)` Banner | Increases uncertainty risk score by $+25\%$ | Recomputes routes with expanded safety clearance | Uses IndexedDB disk cache |
| **API Outage (5xx)** | Yellow `SOURCE_UNAVAILABLE` Badge | Retains last risk index + freshness penalty | Recommendation remains, flagged with low confidence | Retains prior validated cache |
| **Stale Data (>48h)** | Orange `STALE DATA` Warning | Risk index scaled up via uncertainty multiplier | Shifts recommendation from FAST to SAFE corridor | Flags data `STALE` |
| **Corrupted Payload** | Red `VALIDATION_FAILURE` Alert | Unchanged (Corrupted payload rejected) | Unchanged | Rejects file, logs error |
| **Coverage Gap** | Striped `UNMAPPED` Map Overlay | Max uncertainty penalty applied to gap cells | Routes vessel around unmapped gap | Maps available coverage only |
| **Acquisition Failure** | Red `ACQUISITION_FAILED` Badge | Unchanged (`PROCESSING: NOT YET PERFORMED`) | Unchanged | Rejects file, records error |

