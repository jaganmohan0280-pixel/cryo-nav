/**
 * CRYO NAV — Hazard / Encounter Intelligence Engine
 * Phase 8B — Operational Hazard & Trajectory Route Interaction Analysis
 *
 * Core Responsibility:
 * Determines whether predicted environmental hazards (icebergs, sea ice) materially
 * interact with the vessel's planned future route corridor in time and space.
 *
 * Key Concepts:
 * - ICEBERG OBSERVATION -> PREDICTED TRAJECTORY -> VESSEL FUTURE POSITION -> ROUTE CORRIDOR
 * -> SPATIAL/TEMPORAL INTERSECTION -> ENCOUNTER METRICS -> HAZARD ASSESSMENT
 *
 * Mathematical / Engineering Assumptions:
 * 1. Vessel Trajectory Model:
 *    Vessel progresses along route waypoints at constant nominal speed V_v (default cruising speed).
 *    Distance d_v(t) = V_v * t. Position P_v(t) is interpolated along geodesic route segments.
 *
 * 2. Iceberg Trajectory Model:
 *    Iceberg positions P_i(t) are obtained from Phase 3B kinematic drift engine predictions
 *    sampled at t in {0, 6, 12, 24, 48, 72} hours, with linear/geodesic interpolation between horizons.
 *
 * 3. CPA (Closest Point of Approach) & TCA (Time of Closest Approach):
 *    CPA = min_{t in [0, 72]} dist(P_v(t), P_i(t))
 *    TCA = argmin_{t in [0, 72]} dist(P_v(t), P_i(t))
 *
 * 4. Temporal Data Availability:
 *    If timing information is missing or invalid (forecastStatus === 'UNAVAILABLE'),
 *    CPA and TCA are set to null (UNAVAILABLE) and NOT fabricated.
 *
 * 5. Hazard Severity Classification Thresholds (Engineering-Configurable):
 *    - CRITICAL: CPA <= 1.0 nm OR (Corridor Intersection within 12h)
 *    - HIGH:     CPA <= 3.0 nm OR (Corridor Intersection within 24h)
 *    - MODERATE: CPA <= 10.0 nm OR (Corridor Intersection within 72h)
 *    - LOW:      CPA <= 25.0 nm (Proximity Awareness)
 *    - NONE:     CPA > 25.0 nm & Corridor Separation > 25.0 nm
 */

import {
  IcebergDetection,
  SeaIceCell,
  RouteAlternative,
  VesselProfile,
  TrajectoryPoint,
} from '../types';
import { calculateDistanceNm } from './riskEngine';

export type EncounterStatus =
  | 'DIRECT_INTERSECTION'
  | 'CORRIDOR_ENTRY'
  | 'PROXIMITY_ALERT'
  | 'NO_INTERSECTION'
  | 'UNAVAILABLE';

export type HazardSeverity = 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW' | 'NONE';

export type DataStatusLabel = 'REAL' | 'SIMULATED' | 'HYBRID' | 'UNAVAILABLE';

export interface CpaTcaResult {
  cpaNm: number | null;
  tcaHours: number | null;
  tcaTimestamp: string | null;
  vesselPointAtCpa: { lat: number; lon: number } | null;
  icebergPointAtCpa: { lat: number; lon: number } | null;
  minRouteDistanceNm: number;
  nearestRoutePoint: { lat: number; lon: number };
  temporalDataAvailable: boolean;
  explanation: string;
}

export interface SeaIceExposureResult {
  maxConcentrationPercent: number;
  avgConcentrationPercent: number;
  corridorExposurePct: number;
  isVesselCompatible: boolean;
  highRiskWaypointsCount: number;
  summaryText: string;
}

export interface HazardEncounter {
  hazardId: string;
  hazardType: 'ICEBERG' | 'SEA_ICE' | 'WEATHER';
  sourceName: string;
  icebergId?: string;
  icebergName?: string;
  sizeCategory?: string;
  currentPosition: { lat: number; lon: number; timestamp?: string };
  predictedPositionAtCpa: { lat: number; lon: number; timestamp?: string } | null;
  nearestRoutePoint: { lat: number; lon: number };
  cpaNm: number | null;
  tcaHours: number | null;
  tcaTimestamp: string | null;
  minRouteDistanceNm: number;
  encounterStatus: EncounterStatus;
  severity: HazardSeverity;
  confidence: number; // 0-100
  uncertaintyRadiusNm: number;
  explanation: string;
  provenance: string;
  isRealData: boolean;
  dataStatusLabel: DataStatusLabel;
  seaIceExposure?: SeaIceExposureResult;
}

export interface HazardEvaluationResult {
  evaluationTime: string;
  totalHazardsEvaluated: number;
  activeEncountersCount: number;
  highestSeverity: HazardSeverity;
  encounters: HazardEncounter[];
  seaIceRouteSummary?: SeaIceExposureResult;
  provenance: string;
}

export interface EncounterEngineOptions {
  routeCorridorWidthNm?: number; // Total corridor width in nautical miles (default 4.0 nm)
  cruisingSpeedKnots?: number;   // Nominal vessel speed along route (default from profile or 12.0 kts)
  timeHorizonHours?: number;     // Evaluation horizon in hours (default 72h)
  baseStartTime?: string;        // Starting ISO timestamp for vessel departure/current time
}

/**
 * Helper: Interpolates vessel position along a route at time `tHours` from departure
 */
export function getVesselPositionAtTime(
  routeWaypoints: [number, number][],
  tHours: number,
  speedKnots: number
): { lat: number; lon: number } | null {
  if (!routeWaypoints || routeWaypoints.length === 0) return null;
  if (routeWaypoints.length === 1 || tHours <= 0) {
    return { lat: routeWaypoints[0][0], lon: routeWaypoints[0][1] };
  }

  const targetDistanceNm = tHours * speedKnots;
  let accumulatedDist = 0;

  for (let i = 0; i < routeWaypoints.length - 1; i++) {
    const segLat1 = routeWaypoints[i][0];
    const segLon1 = routeWaypoints[i][1];
    const segLat2 = routeWaypoints[i + 1][0];
    const segLon2 = routeWaypoints[i + 1][1];

    const segDist = calculateDistanceNm(segLat1, segLon1, segLat2, segLon2);
    if (segDist === 0) continue;

    if (accumulatedDist + segDist >= targetDistanceNm) {
      const remainingDist = targetDistanceNm - accumulatedDist;
      const frac = remainingDist / segDist;
      const lat = segLat1 + frac * (segLat2 - segLat1);
      const lon = segLon1 + frac * (segLon2 - segLon1);
      return { lat, lon };
    }

    accumulatedDist += segDist;
  }

  // If time exceeds route completion, return final destination waypoint
  const last = routeWaypoints[routeWaypoints.length - 1];
  return { lat: last[0], lon: last[1] };
}

/**
 * Helper: Interpolates iceberg position from predicted trajectory points at time `tHours`
 */
export function getIcebergPositionAtTime(
  initialLat: number,
  initialLon: number,
  trajectoryPoints: TrajectoryPoint[] | undefined,
  tHours: number
): { lat: number; lon: number } | null {
  if (tHours <= 0 || !trajectoryPoints || trajectoryPoints.length === 0) {
    return { lat: initialLat, lon: initialLon };
  }

  // Filter out invalid/unavailable trajectory points
  const validPoints = trajectoryPoints.filter(p => p.forecastStatus !== 'UNAVAILABLE');
  if (validPoints.length === 0) {
    return null; // Cannot determine position at tHours
  }

  // Sort by forecast hours ascending
  const sorted = [...validPoints].sort((a, b) => a.hours - b.hours);

  // If tHours is before first forecast point, interpolate from initial position to first point
  if (tHours <= sorted[0].hours) {
    const frac = tHours / sorted[0].hours;
    return {
      lat: initialLat + frac * (sorted[0].lat - initialLat),
      lon: initialLon + frac * (sorted[0].lon - initialLon),
    };
  }

  // Search between consecutive forecast horizons
  for (let i = 0; i < sorted.length - 1; i++) {
    const p1 = sorted[i];
    const p2 = sorted[i + 1];

    if (tHours >= p1.hours && tHours <= p2.hours) {
      const dt = p2.hours - p1.hours;
      const frac = dt > 0 ? (tHours - p1.hours) / dt : 0;
      return {
        lat: p1.lat + frac * (p2.lat - p1.lat),
        lon: p1.lon + frac * (p2.lon - p1.lon),
      };
    }
  }

  // Beyond last horizon point, return last valid point
  const last = sorted[sorted.length - 1];
  return { lat: last.lat, lon: last.lon };
}

/**
 * Helper: Computes minimum distance from an iceberg to the route geometry across all trajectory points
 */
export function calculateNearestRoutePoint(
  lat: number,
  lon: number,
  routeWaypoints: [number, number][]
): { lat: number; lon: number; distanceNm: number } {
  if (!routeWaypoints || routeWaypoints.length === 0) {
    return { lat, lon, distanceNm: Infinity };
  }
  if (routeWaypoints.length === 1) {
    return {
      lat: routeWaypoints[0][0],
      lon: routeWaypoints[0][1],
      distanceNm: calculateDistanceNm(lat, lon, routeWaypoints[0][0], routeWaypoints[0][1]),
    };
  }

  let minDistance = Infinity;
  let nearestPt = { lat: routeWaypoints[0][0], lon: routeWaypoints[0][1] };

  for (let i = 0; i < routeWaypoints.length - 1; i++) {
    const p1 = routeWaypoints[i];
    const p2 = routeWaypoints[i + 1];

    const d12 = calculateDistanceNm(p1[0], p1[1], p2[0], p2[1]);
    if (d12 === 0) continue;

    const cosLat = Math.cos((((p1[0] + p2[0]) / 2) * Math.PI) / 180);
    const dx = (p2[1] - p1[1]) * cosLat;
    const dy = p2[0] - p1[0];
    const px = (lon - p1[1]) * Math.cos((((p1[0] + lat) / 2) * Math.PI) / 180);
    const py = lat - p1[0];

    const t = Math.max(0, Math.min(1, (px * dx + py * dy) / (dx * dx + dy * dy || 1)));
    const projLat = p1[0] + t * (p2[0] - p1[0]);
    const projLon = p1[1] + t * (p2[1] - p1[1]);
    const dist = calculateDistanceNm(lat, lon, projLat, projLon);

    if (dist < minDistance) {
      minDistance = dist;
      nearestPt = { lat: projLat, lon: projLon };
    }
  }

  return { lat: nearestPt.lat, lon: nearestPt.lon, distanceNm: minDistance };
}

/**
 * Calculates CPA (Closest Point of Approach) and TCA (Time of Closest Approach)
 * by evaluating vessel trajectory vs iceberg trajectory at matching time steps.
 */
export function calculateCpaTca(
  berg: IcebergDetection,
  routeWaypoints: [number, number][],
  options: EncounterEngineOptions = {}
): CpaTcaResult {
  const speedKnots = options.cruisingSpeedKnots || 12.0;
  const horizonHours = options.timeHorizonHours || 72;
  const baseTimeMs = options.baseStartTime ? new Date(options.baseStartTime).getTime() : Date.now();

  const staticRouteMatch = calculateNearestRoutePoint(berg.lat, berg.lon, routeWaypoints);

  // Check if iceberg trajectory data is unavailable
  if (berg.forecastResult?.status === 'UNAVAILABLE') {
    return {
      cpaNm: null,
      tcaHours: null,
      tcaTimestamp: null,
      vesselPointAtCpa: null,
      icebergPointAtCpa: null,
      minRouteDistanceNm: Number(staticRouteMatch.distanceNm.toFixed(2)),
      nearestRoutePoint: { lat: staticRouteMatch.lat, lon: staticRouteMatch.lon },
      temporalDataAvailable: false,
      explanation: 'UNAVAILABLE: Iceberg trajectory predictions are unavailable for this sector.',
    };
  }

  // Evaluate at discrete 1-hour intervals across horizon (0 to 72 hours)
  let minSepNm = Infinity;
  let bestT = 0;
  let bestVesselPt: { lat: number; lon: number } | null = null;
  let bestBergPt: { lat: number; lon: number } | null = null;
  let validStepCount = 0;

  for (let t = 0; t <= horizonHours; t += 1.0) {
    const vPos = getVesselPositionAtTime(routeWaypoints, t, speedKnots);
    const iPos = getIcebergPositionAtTime(berg.lat, berg.lon, berg.predictedTrajectory, t);

    if (vPos && iPos) {
      validStepCount++;
      const sep = calculateDistanceNm(vPos.lat, vPos.lon, iPos.lat, iPos.lon);
      if (sep < minSepNm) {
        minSepNm = sep;
        bestT = t;
        bestVesselPt = vPos;
        bestBergPt = iPos;
      }
    }
  }

  if (validStepCount === 0 || minSepNm === Infinity) {
    return {
      cpaNm: null,
      tcaHours: null,
      tcaTimestamp: null,
      vesselPointAtCpa: null,
      icebergPointAtCpa: null,
      minRouteDistanceNm: Number(staticRouteMatch.distanceNm.toFixed(2)),
      nearestRoutePoint: { lat: staticRouteMatch.lat, lon: staticRouteMatch.lon },
      temporalDataAvailable: false,
      explanation: 'UNAVAILABLE: Temporal matching failed due to missing iceberg forecast steps.',
    };
  }

  const cpaNm = Number(minSepNm.toFixed(2));
  const tcaHours = Number(bestT.toFixed(1));
  const tcaTimestamp = new Date(baseTimeMs + bestT * 3600 * 1000).toISOString();

  return {
    cpaNm,
    tcaHours,
    tcaTimestamp,
    vesselPointAtCpa: bestVesselPt,
    icebergPointAtCpa: bestBergPt,
    minRouteDistanceNm: Number(staticRouteMatch.distanceNm.toFixed(2)),
    nearestRoutePoint: { lat: staticRouteMatch.lat, lon: staticRouteMatch.lon },
    temporalDataAvailable: true,
    explanation: `Calculated CPA = ${cpaNm} nm at TCA = +${tcaHours}h from current vessel trajectory.`,
  };
}

/**
 * Classifies Hazard Severity based on CPA, TCA, corridor entry, and uncertainty envelope
 */
export function classifyHazardSeverity(
  cpaNm: number | null,
  tcaHours: number | null,
  minRouteDistanceNm: number,
  corridorHalfWidthNm: number = 2.0,
  uncertaintyRadiusNm: number = 1.0
): { severity: HazardSeverity; status: EncounterStatus; explanation: string } {
  // If temporal calculation unavailable, classify based on static route separation
  if (cpaNm === null || tcaHours === null) {
    if (minRouteDistanceNm <= corridorHalfWidthNm) {
      return {
        severity: 'HIGH',
        status: 'CORRIDOR_ENTRY',
        explanation: `Iceberg static position lies inside route corridor (${minRouteDistanceNm.toFixed(1)} nm). Temporal CPA unavailable.`,
      };
    } else if (minRouteDistanceNm <= 10.0) {
      return {
        severity: 'MODERATE',
        status: 'PROXIMITY_ALERT',
        explanation: `Iceberg static position is within 10 nm proximity of route (${minRouteDistanceNm.toFixed(1)} nm). Temporal CPA unavailable.`,
      };
    } else if (minRouteDistanceNm <= 25.0) {
      return {
        severity: 'LOW',
        status: 'PROXIMITY_ALERT',
        explanation: `Iceberg static position is within 25 nm proximity of route (${minRouteDistanceNm.toFixed(1)} nm). Temporal CPA unavailable.`,
      };
    }
    return {
      severity: 'NONE',
      status: 'NO_INTERSECTION',
      explanation: `Iceberg position is clear of route corridor (${minRouteDistanceNm.toFixed(1)} nm separation).`,
    };
  }

  // Account for uncertainty envelope in effective separation
  const effectiveCpa = Math.max(0, cpaNm - uncertaintyRadiusNm * 0.5);

  if (cpaNm <= 1.0 || (minRouteDistanceNm <= corridorHalfWidthNm && tcaHours <= 12)) {
    return {
      severity: 'CRITICAL',
      status: 'DIRECT_INTERSECTION',
      explanation: `CRITICAL ENCOUNTER: Predicted CPA of ${cpaNm.toFixed(1)} nm at +${tcaHours.toFixed(1)}h indicates direct collision or immediate safety buffer violation.`,
    };
  }

  if (cpaNm <= 3.0 || (minRouteDistanceNm <= corridorHalfWidthNm && tcaHours <= 24)) {
    return {
      severity: 'HIGH',
      status: cpaNm <= corridorHalfWidthNm ? 'CORRIDOR_ENTRY' : 'PROXIMITY_ALERT',
      explanation: `HIGH HAZARD: CPA of ${cpaNm.toFixed(1)} nm within +${tcaHours.toFixed(1)}h intersects route corridor safety clearance.`,
    };
  }

  if (cpaNm <= 10.0 || (minRouteDistanceNm <= corridorHalfWidthNm && tcaHours <= 72)) {
    return {
      severity: 'MODERATE',
      status: cpaNm <= corridorHalfWidthNm ? 'CORRIDOR_ENTRY' : 'PROXIMITY_ALERT',
      explanation: `MODERATE HAZARD: CPA of ${cpaNm.toFixed(1)} nm at +${tcaHours.toFixed(1)}h represents a close approach to planned route corridor.`,
    };
  }

  if (cpaNm <= 25.0 || minRouteDistanceNm <= 25.0) {
    return {
      severity: 'LOW',
      status: 'PROXIMITY_ALERT',
      explanation: `LOW HAZARD: CPA of ${cpaNm.toFixed(1)} nm at +${tcaHours.toFixed(1)}h within 25 nm situational monitoring range.`,
    };
  }

  return {
    severity: 'NONE',
    status: 'NO_INTERSECTION',
    explanation: `NO RELEVANT ENCOUNTER: Minimum approach of ${cpaNm.toFixed(1)} nm at +${tcaHours.toFixed(1)}h is clear of route corridor (> 25 nm).`,
  };
}

/**
 * Evaluates sea-ice interaction along the route corridor
 */
export function evaluateSeaIceRouteInteraction(
  routeWaypoints: [number, number][],
  seaIceCells: SeaIceCell[],
  vessel: VesselProfile
): SeaIceExposureResult {
  if (!routeWaypoints || routeWaypoints.length === 0 || !seaIceCells || seaIceCells.length === 0) {
    return {
      maxConcentrationPercent: 0,
      avgConcentrationPercent: 0,
      corridorExposurePct: 0,
      isVesselCompatible: true,
      highRiskWaypointsCount: 0,
      summaryText: 'Sea-ice data unavailable for route corridor evaluation.',
    };
  }

  const maxVesselIce = vessel.maxSeaIceConcentrationPercent || 70;
  let totalConc = 0;
  let maxConc = 0;
  let highRiskCount = 0;
  let exposedPointsCount = 0;

  for (const wp of routeWaypoints) {
    // Find closest sea ice cell to waypoint
    let minD = Infinity;
    let closestConc = 0;
    for (const cell of seaIceCells) {
      const d = calculateDistanceNm(wp[0], wp[1], cell.lat, cell.lon);
      if (d < minD) {
        minD = d;
        closestConc = cell.concentrationPercent;
      }
    }

    if (minD <= 25.0) {
      totalConc += closestConc;
      if (closestConc > maxConc) maxConc = closestConc;
      if (closestConc > maxVesselIce) highRiskCount++;
      if (closestConc > 10) exposedPointsCount++;
    }
  }

  const sampleCount = routeWaypoints.length;
  const avgConc = sampleCount > 0 ? Math.round(totalConc / sampleCount) : 0;
  const corridorExposurePct = Math.round((exposedPointsCount / sampleCount) * 100);
  const isVesselCompatible = maxConc <= maxVesselIce;

  let summaryText = `Corridor average ice concentration is ${avgConc}% (Max ${maxConc}%).`;
  if (!isVesselCompatible) {
    summaryText += ` EXCEEDS vessel ice rating (${maxVesselIce}%) at ${highRiskCount} waypoint segment(s).`;
  } else if (maxConc > 40) {
    summaryText += ` Route navigates moderate ice pack compatible with ${vessel.iceClass}.`;
  } else {
    summaryText += ` Route is predominantly in open water / light ice conditions.`;
  }

  return {
    maxConcentrationPercent: maxConc,
    avgConcentrationPercent: avgConc,
    corridorExposurePct,
    isVesselCompatible,
    highRiskWaypointsCount: highRiskCount,
    summaryText,
  };
}

/**
 * Master function: Evaluates all iceberg and sea-ice encounters for a given route
 */
export function evaluateAllRouteHazards(
  route: RouteAlternative,
  icebergs: IcebergDetection[],
  seaIceCells: SeaIceCell[],
  vessel: VesselProfile,
  options: EncounterEngineOptions = {}
): HazardEvaluationResult {
  const waypoints = route.waypoints;
  const corridorHalfWidthNm = (options.routeCorridorWidthNm || 4.0) / 2.0;

  const encounters: HazardEncounter[] = [];

  for (const berg of icebergs) {
    const cpaResult = calculateCpaTca(berg, waypoints, {
      ...options,
      cruisingSpeedKnots: vessel.cruisingSpeedKnots || options.cruisingSpeedKnots || 12.0,
    });

    const uncertaintyNm = berg.uncertaintyRadiusNm || 1.0;
    const severityClassification = classifyHazardSeverity(
      cpaResult.cpaNm,
      cpaResult.tcaHours,
      cpaResult.minRouteDistanceNm,
      corridorHalfWidthNm,
      uncertaintyNm
    );

    // Determine Data Status Label
    let dataStatusLabel: DataStatusLabel = 'REAL';
    if (berg.isSynthetic) {
      dataStatusLabel = 'SIMULATED';
    } else if (cpaResult.cpaNm === null) {
      dataStatusLabel = 'UNAVAILABLE';
    } else if (berg.provenance?.category === 'REANALYSIS' || berg.provenance?.category === 'FORECAST') {
      dataStatusLabel = 'HYBRID';
    }

    const provenanceStr = berg.provenance
      ? `${berg.provenance.source} (${berg.provenance.datasetId})`
      : berg.source || 'USNIC Antarctic Iceberg Database';

    encounters.push({
      hazardId: `HAZ-BERG-${berg.id}`,
      hazardType: 'ICEBERG',
      sourceName: berg.source || 'Sentinel-1 SAR / USNIC',
      icebergId: berg.id,
      icebergName: berg.name,
      sizeCategory: berg.sizeCategory,
      currentPosition: { lat: berg.lat, lon: berg.lon, timestamp: berg.observationTime },
      predictedPositionAtCpa: cpaResult.icebergPointAtCpa
        ? {
            lat: Number(cpaResult.icebergPointAtCpa.lat.toFixed(3)),
            lon: Number(cpaResult.icebergPointAtCpa.lon.toFixed(3)),
            timestamp: cpaResult.tcaTimestamp || undefined,
          }
        : null,
      nearestRoutePoint: cpaResult.nearestRoutePoint,
      cpaNm: cpaResult.cpaNm,
      tcaHours: cpaResult.tcaHours,
      tcaTimestamp: cpaResult.tcaTimestamp,
      minRouteDistanceNm: cpaResult.minRouteDistanceNm,
      encounterStatus: severityClassification.status,
      severity: severityClassification.severity,
      confidence: berg.confidence || 85,
      uncertaintyRadiusNm: uncertaintyNm,
      explanation: severityClassification.explanation,
      provenance: provenanceStr,
      isRealData: !berg.isSynthetic,
      dataStatusLabel,
    });
  }

  // Sort encounters by severity rank: CRITICAL > HIGH > MODERATE > LOW > NONE
  const severityRank: Record<HazardSeverity, number> = {
    CRITICAL: 4,
    HIGH: 3,
    MODERATE: 2,
    LOW: 1,
    NONE: 0,
  };

  encounters.sort((a, b) => severityRank[b.severity] - severityRank[a.severity] || (a.cpaNm ?? 999) - (b.cpaNm ?? 999));

  // Determine highest severity across all encounters
  let highestSeverity: HazardSeverity = 'NONE';
  let activeEncountersCount = 0;

  for (const enc of encounters) {
    if (enc.severity !== 'NONE') activeEncountersCount++;
    if (severityRank[enc.severity] > severityRank[highestSeverity]) {
      highestSeverity = enc.severity;
    }
  }

  // Evaluate Sea-Ice Exposure
  const seaIceExposure = evaluateSeaIceRouteInteraction(waypoints, seaIceCells, vessel);

  return {
    evaluationTime: new Date().toISOString(),
    totalHazardsEvaluated: icebergs.length,
    activeEncountersCount,
    highestSeverity,
    encounters,
    seaIceRouteSummary: seaIceExposure,
    provenance: 'CRYO NAV Phase 8B Kinematic Hazard Encounter Engine',
  };
}
