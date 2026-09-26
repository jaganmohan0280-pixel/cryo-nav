/**
 * CRYO NAV — GPS Tracking & Navigation Alerting Core Engine
 * Phase 14A — Core Engine for Navigation Alerts Evaluation
 *
 * Operational Principle:
 * Evaluates vessel GPS position, route corridor progress, hazard encounters,
 * environmental freshness, uncertainty bounds, and connectivity state to produce
 * structured, deterministic navigation alerts requiring navigator attention.
 *
 * Scientific & Engineering Rules:
 * 1. DECISION SUPPORT ONLY: This is NOT an autonomous control system. Does NOT modify
 *    vessel heading, speed, route, waypoints, or perform automatic route replanning.
 * 2. DETERMINISTIC & REPEATABLE: 100% deterministic calculation (NO Math.random()).
 * 3. PROVENANCE INTEGRITY: Preserves input dataMode ('REAL' | 'SIMULATED' | 'HYBRID' | 'UNAVAILABLE').
 *    Never converts missing GPS data into synthetic coordinates.
 * 4. NEUTRAL OFFLINE WORDING: OFFLINE connectivity alone is NOT classified as a hazard or CRITICAL alert.
 * 5. DEDUPLICATION: Assigns deterministic alert IDs to prevent duplicate alerts for identical conditions.
 */

import {
  RouteAlternative,
  VesselProfile,
  IcebergDetection,
  ConfidenceLevel,
  FreshnessState,
  ConnectionState,
} from '../types';
import { HazardEncounter, SeaIceExposureResult } from './hazardEncounterEngine';

export type NavigationAlertType =
  | 'WAYPOINT_DEVIATION'
  | 'ROUTE_CORRIDOR_DEVIATION'
  | 'HAZARD_PROXIMITY'
  | 'ICEBERG_ENCOUNTER'
  | 'SEA_ICE_CONDITION'
  | 'STALE_POSITION'
  | 'STALE_ENVIRONMENT'
  | 'LOW_CONFIDENCE'
  | 'CONNECTIVITY_DEGRADED'
  | 'OFFLINE_OPERATION'
  | 'GPS_DATA_UNAVAILABLE';

export type NavigationAlertSeverity = 'INFO' | 'ADVISORY' | 'WARNING' | 'CRITICAL';

export type NavigationDataMode = 'REAL' | 'SIMULATED' | 'HYBRID' | 'UNAVAILABLE';

export interface NavigationAlert {
  id: string;
  type: NavigationAlertType;
  severity: NavigationAlertSeverity;
  title: string;
  message: string;
  timestamp: string;
  source: string;
  targetEntityId?: string;
  acknowledged: boolean;
  dataMode: NavigationDataMode;
  provenance: string;
}

export interface GPSInputState {
  lat?: number | null;
  lon?: number | null;
  headingDeg?: number | null;
  speedKnots?: number | null;
  timestamp?: string | null;
  isAvailable?: boolean;
}

export interface NavigationAlertEvaluationInput {
  gpsState?: GPSInputState | null;
  activeRoute?: RouteAlternative | null;
  vessel?: VesselProfile | null;
  hazards?: (HazardEncounter | IcebergDetection)[] | null;
  seaIceExposure?: SeaIceExposureResult | null;
  confidenceLevel?: ConfidenceLevel | null;
  uncertaintyRadiusNm?: number | null;
  freshnessState?: FreshnessState | null;
  connectionState?: ConnectionState | null;
  positionAgeMinutesThreshold?: number; // Default: 15 minutes
  routeDeviationNmThreshold?: number; // Default: 2.0 nm
  waypointDeviationNmThreshold?: number; // Default: 3.0 nm
  dataMode?: NavigationDataMode;
  provenance?: string;
  referenceTimeIso?: string;
}

export interface NavigationAlertEvaluationResult {
  alerts: NavigationAlert[];
  totalAlertsCount: number;
  criticalAlertsCount: number;
  warningAlertsCount: number;
  advisoryAlertsCount: number;
  infoAlertsCount: number;
  evaluationTimestamp: string;
  dataMode: NavigationDataMode;
  provenance: string;
  hasActiveCriticalAlerts: boolean;
}

// Great-circle distance helper in nautical miles
function calculateDistanceNm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3440.065;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Distance from point to line segment in nautical miles
function calculateDistanceToSegmentNm(
  lat: number,
  lon: number,
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const d12 = calculateDistanceNm(lat1, lon1, lat2, lon2);
  if (d12 === 0) return calculateDistanceNm(lat, lon, lat1, lon1);

  const cosLat = Math.cos((((lat1 + lat2) / 2) * Math.PI) / 180);
  const dx = (lon2 - lon1) * cosLat;
  const dy = lat2 - lat1;
  const px = (lon - lon1) * Math.cos((((lat1 + lat) / 2) * Math.PI) / 180);
  const py = lat - lat1;

  const t = Math.max(0, Math.min(1, (px * dx + py * dy) / (dx * dx + dy * dy || 1)));
  const projLat = lat1 + t * (lat2 - lat1);
  const projLon = lon1 + t * (lon2 - lon1);

  return calculateDistanceNm(lat, lon, projLat, projLon);
}

// Minimum distance from vessel position to route corridor segments
function calculateCrossTrackDistanceNm(lat: number, lon: number, waypoints: [number, number][]): number {
  if (!waypoints || waypoints.length === 0) return Infinity;
  if (waypoints.length === 1) return calculateDistanceNm(lat, lon, waypoints[0][0], waypoints[0][1]);

  let minDistance = Infinity;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const d = calculateDistanceToSegmentNm(
      lat,
      lon,
      waypoints[i][0],
      waypoints[i][1],
      waypoints[i + 1][0],
      waypoints[i + 1][1]
    );
    if (d < minDistance) minDistance = d;
  }
  return minDistance;
}

/**
 * Evaluates supplied navigation state and produces deterministic navigation alerts.
 *
 * @param input NavigationAlertEvaluationInput state inputs
 * @returns NavigationAlertEvaluationResult structured alert evaluation
 */
export function evaluateNavigationAlerts(
  input: NavigationAlertEvaluationInput
): NavigationAlertEvaluationResult {
  const refTime = input.referenceTimeIso || new Date().toISOString();
  const dataMode: NavigationDataMode = input.dataMode || 'SIMULATED';
  const provenance = input.provenance || 'Phase 14A Navigation Alert Engine';

  const alertsMap = new Map<string, NavigationAlert>();

  const posAgeThresholdMinutes = input.positionAgeMinutesThreshold ?? 15.0;
  const routeDeviationThresholdNm = input.routeDeviationNmThreshold ?? 2.0;
  const waypointDeviationThresholdNm = input.waypointDeviationNmThreshold ?? 3.0;

  // Helper to add alert with deduplication
  function addAlert(alert: NavigationAlert) {
    if (!alertsMap.has(alert.id)) {
      alertsMap.set(alert.id, alert);
    }
  }

  // 1. GPS Position & Freshness Logic
  const gps = input.gpsState;
  const isGpsUnavailable =
    !gps ||
    gps.isAvailable === false ||
    gps.lat == null ||
    gps.lon == null ||
    isNaN(gps.lat) ||
    isNaN(gps.lon);

  if (isGpsUnavailable) {
    addAlert({
      id: 'ALERT_GPS_DATA_UNAVAILABLE',
      type: 'GPS_DATA_UNAVAILABLE',
      severity: 'WARNING',
      title: 'GPS Position Unavailable',
      message: 'Vessel GPS position telemetry is currently unavailable or missing.',
      timestamp: refTime,
      source: 'GPS_TELEMETRY',
      acknowledged: false,
      dataMode: 'UNAVAILABLE',
      provenance,
    });
  } else if (gps && gps.timestamp) {
    // Evaluate Position Freshness
    const gpsTime = new Date(gps.timestamp).getTime();
    const currentTime = new Date(refTime).getTime();
    if (!isNaN(gpsTime) && !isNaN(currentTime)) {
      const ageMinutes = (currentTime - gpsTime) / (1000 * 60);
      if (ageMinutes > posAgeThresholdMinutes) {
        addAlert({
          id: 'ALERT_STALE_POSITION',
          type: 'STALE_POSITION',
          severity: 'WARNING',
          title: 'Stale Vessel Position',
          message: `Vessel GPS position telemetry is stale (${Math.round(ageMinutes)} minutes old). Navigator verification advised.`,
          timestamp: refTime,
          source: 'GPS_TELEMETRY',
          acknowledged: false,
          dataMode,
          provenance,
        });
      }
    }
  }

  // 2. Route Corridor & Waypoint Deviation Logic
  if (!isGpsUnavailable && gps && gps.lat != null && gps.lon != null && input.activeRoute && input.activeRoute.waypoints) {
    const routeWaypoints = input.activeRoute.waypoints;
    if (routeWaypoints.length > 0) {
      const crossTrackNm = calculateCrossTrackDistanceNm(gps.lat, gps.lon, routeWaypoints);

      // Route Corridor Deviation
      if (crossTrackNm > routeDeviationThresholdNm && crossTrackNm !== Infinity) {
        addAlert({
          id: 'ALERT_ROUTE_CORRIDOR_DEVIATION',
          type: 'ROUTE_CORRIDOR_DEVIATION',
          severity: 'WARNING',
          title: 'Route Corridor Deviation',
          message: `Vessel has deviated ${crossTrackNm.toFixed(1)} nm from active route corridor (threshold: ${routeDeviationThresholdNm.toFixed(1)} nm).`,
          timestamp: refTime,
          source: 'ROUTE_MONITOR',
          targetEntityId: input.activeRoute.id,
          acknowledged: false,
          dataMode,
          provenance,
        });
      }

      // Waypoint Deviation
      if (crossTrackNm > waypointDeviationThresholdNm && crossTrackNm !== Infinity) {
        addAlert({
          id: 'ALERT_WAYPOINT_DEVIATION',
          type: 'WAYPOINT_DEVIATION',
          severity: 'WARNING',
          title: 'Waypoint Track Deviation',
          message: `Vessel position deviates ${crossTrackNm.toFixed(1)} nm from nominal waypoint track.`,
          timestamp: refTime,
          source: 'WAYPOINT_MONITOR',
          targetEntityId: input.activeRoute.id,
          acknowledged: false,
          dataMode,
          provenance,
        });
      }
    }
  }

  // 3. Hazard & Iceberg Proximity Logic
  if (input.hazards && input.hazards.length > 0) {
    for (const h of input.hazards) {
      // Check if item is HazardEncounter or IcebergDetection
      const isEncounter = 'severity' in h;
      const hazardId = 'hazardId' in h ? (h.hazardId as string) : 'id' in h ? (h.id as string) : 'unknown';
      const hazardSeverity = isEncounter ? (h as HazardEncounter).severity : 'NONE';
      const cpaNm = isEncounter ? (h as HazardEncounter).cpaNm : null;

      if (hazardSeverity === 'CRITICAL' || (cpaNm !== null && cpaNm <= 1.0)) {
        addAlert({
          id: `ALERT_ICEBERG_ENCOUNTER_${hazardId}`,
          type: 'ICEBERG_ENCOUNTER',
          severity: 'CRITICAL',
          title: 'Critical Hazard Encounter',
          message: `Critical iceberg corridor encounter predicted${cpaNm !== null ? ` (CPA ${cpaNm.toFixed(1)} nm)` : ''}. Immediate navigator review advised.`,
          timestamp: refTime,
          source: 'HAZARD_ENGINE',
          targetEntityId: hazardId,
          acknowledged: false,
          dataMode,
          provenance,
        });
      } else if (hazardSeverity === 'HIGH' || (cpaNm !== null && cpaNm <= 3.0)) {
        addAlert({
          id: `ALERT_HAZARD_PROXIMITY_${hazardId}`,
          type: 'HAZARD_PROXIMITY',
          severity: 'WARNING',
          title: 'High Hazard Proximity',
          message: `High proximity hazard detected in route corridor${cpaNm !== null ? ` (CPA ${cpaNm.toFixed(1)} nm)` : ''}.`,
          timestamp: refTime,
          source: 'HAZARD_ENGINE',
          targetEntityId: hazardId,
          acknowledged: false,
          dataMode,
          provenance,
        });
      }
    }
  }

  // 4. Sea-Ice Condition Logic
  if (input.seaIceExposure) {
    const seaIce = input.seaIceExposure;
    const vesselIceLimit = input.vessel?.maxSeaIceConcentrationPercent ?? 75;

    if (!seaIce.isVesselCompatible || seaIce.maxConcentrationPercent > vesselIceLimit) {
      addAlert({
        id: 'ALERT_SEA_ICE_CONDITION_EXCEEDED',
        type: 'SEA_ICE_CONDITION',
        severity: 'CRITICAL',
        title: 'Sea-Ice Concentration Limit Exceeded',
        message: `Sea-ice concentration (${seaIce.maxConcentrationPercent}%) exceeds vessel Polar Class rating limit (${vesselIceLimit}%).`,
        timestamp: refTime,
        source: 'SEA_ICE_MONITOR',
        acknowledged: false,
        dataMode,
        provenance,
      });
    } else if (seaIce.maxConcentrationPercent >= 60) {
      addAlert({
        id: 'ALERT_SEA_ICE_CONDITION_ELEVATED',
        type: 'SEA_ICE_CONDITION',
        severity: 'ADVISORY',
        title: 'Elevated Sea-Ice Concentration',
        message: `Elevated sea-ice concentration (${seaIce.maxConcentrationPercent}%) observed along transit corridor.`,
        timestamp: refTime,
        source: 'SEA_ICE_MONITOR',
        acknowledged: false,
        dataMode,
        provenance,
      });
    }
  }

  // 5. Confidence & Uncertainty Logic
  if (input.confidenceLevel) {
    if (input.confidenceLevel === 'CRITICAL') {
      addAlert({
        id: 'ALERT_LOW_CONFIDENCE_CRITICAL',
        type: 'LOW_CONFIDENCE',
        severity: 'CRITICAL',
        title: 'Critical Confidence Degradation',
        message: 'Decision confidence is CRITICAL due to severe data degradation or staleness. Route review required.',
        timestamp: refTime,
        source: 'CONFIDENCE_ENGINE',
        acknowledged: false,
        dataMode,
        provenance,
      });
    } else if (input.confidenceLevel === 'LOW') {
      addAlert({
        id: 'ALERT_LOW_CONFIDENCE_LOW',
        type: 'LOW_CONFIDENCE',
        severity: 'WARNING',
        title: 'Low Decision Confidence',
        message: 'Decision confidence is LOW. Additional verification or satellite acquisition recommended.',
        timestamp: refTime,
        source: 'CONFIDENCE_ENGINE',
        acknowledged: false,
        dataMode,
        provenance,
      });
    }
  }

  if (input.uncertaintyRadiusNm && input.uncertaintyRadiusNm > 5.0) {
    addAlert({
      id: 'ALERT_LARGE_UNCERTAINTY_ENVELOPE',
      type: 'STALE_ENVIRONMENT',
      severity: 'ADVISORY',
      title: 'Expanded Uncertainty Envelope',
      message: `Spatial forecast uncertainty envelope is expanded (${input.uncertaintyRadiusNm.toFixed(1)} nm radius).`,
      timestamp: refTime,
      source: 'UNCERTAINTY_ENGINE',
      acknowledged: false,
      dataMode,
      provenance,
    });
  }

  if (input.freshnessState === 'STALE' || input.freshnessState === 'AGING') {
    addAlert({
      id: 'ALERT_STALE_ENVIRONMENT',
      type: 'STALE_ENVIRONMENT',
      severity: 'ADVISORY',
      title: 'Stale Environmental Telemetry',
      message: `Environmental telemetry data is ${input.freshnessState}. Data refresh recommended.`,
      timestamp: refTime,
      source: 'ENVIRONMENT_MONITOR',
      acknowledged: false,
      dataMode,
      provenance,
    });
  }

  // 6. Connectivity Logic
  if (input.connectionState === 'LIMITED') {
    addAlert({
      id: 'ALERT_CONNECTIVITY_LIMITED',
      type: 'CONNECTIVITY_DEGRADED',
      severity: 'ADVISORY',
      title: 'Connectivity Limited',
      message: 'Downlink connectivity is LIMITED. Bandwidth budget constraints active.',
      timestamp: refTime,
      source: 'CONNECTIVITY_ENGINE',
      acknowledged: false,
      dataMode,
      provenance,
    });
  } else if (input.connectionState === 'OFFLINE') {
    addAlert({
      id: 'ALERT_CONNECTIVITY_OFFLINE',
      type: 'OFFLINE_OPERATION',
      severity: 'INFO',
      title: 'Offline Navigation Mode',
      message: 'Navigation operating with offline data availability.',
      timestamp: refTime,
      source: 'CONNECTIVITY_ENGINE',
      acknowledged: false,
      dataMode,
      provenance,
    });
  }

  // Compile final summary results
  const alertsArray = Array.from(alertsMap.values());
  let criticalCount = 0;
  let warningCount = 0;
  let advisoryCount = 0;
  let infoCount = 0;

  for (const a of alertsArray) {
    if (a.severity === 'CRITICAL') criticalCount++;
    else if (a.severity === 'WARNING') warningCount++;
    else if (a.severity === 'ADVISORY') advisoryCount++;
    else if (a.severity === 'INFO') infoCount++;
  }

  return {
    alerts: alertsArray,
    totalAlertsCount: alertsArray.length,
    criticalAlertsCount: criticalCount,
    warningAlertsCount: warningCount,
    advisoryAlertsCount: advisoryCount,
    infoAlertsCount: infoCount,
    evaluationTimestamp: refTime,
    dataMode,
    provenance,
    hasActiveCriticalAlerts: criticalCount > 0,
  };
}
