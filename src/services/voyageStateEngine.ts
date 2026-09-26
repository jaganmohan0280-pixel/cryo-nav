/**
 * CRYO NAV — Voyage State Monitoring Engine (Phase 8A)
 *
 * Provides continuous navigation state tracking, route progress computation,
 * waypoint resolution, ETA estimation, connectivity state propagation,
 * and environmental data freshness integration.
 *
 * ARCHITECTURAL ISOLATION:
 * - Owns ONLY Phase 8A Voyage State Monitoring.
 * - DOES NOT perform iceberg encounter calculations, hazard detection, or replanning (Phase 8B boundary).
 * - Consumes existing project routes, vessel state, and environmental telemetry without mutating underlying models.
 */

import {
  VesselProfile,
  MissionConfig,
  RouteAlternative,
  GPSTrackingState,
  EnvironmentalAlignmentResult,
  DecisionConfidenceResult,
} from '../types';

export type NavigationStatus = 'PLANNING' | 'READY' | 'UNDERWAY' | 'PAUSED' | 'COMPLETED';
export type ConnectivityState = 'ONLINE' | 'LIMITED' | 'OFFLINE' | 'SYNCING';
export type DataMode = 'REAL' | 'SIMULATED' | 'HYBRID' | 'UNAVAILABLE';

export interface WaypointInfo {
  index: number;
  name: string;
  lat: number;
  lon: number;
  distanceToNm: number;
}

export interface VoyageState {
  vesselId: string;
  vesselName: string;
  iceClass: string;
  currentPosition: {
    lat: number;
    lon: number;
    headingDeg: number;
    speedKnots: number;
  };
  currentRouteId: string | null;
  currentRouteName: string | null;
  navigationStatus: NavigationStatus;
  currentWaypoint: WaypointInfo | null;
  nextWaypoint: WaypointInfo | null;
  distanceTravelledNm: number;
  remainingDistanceNm: number;
  progressPercent: number;
  estimatedTimeRemainingHours: number | null;
  estimatedArrivalTime: string | null;
  currentSpeedKnots: number;
  connectivityState: ConnectivityState;
  environmentalDataFreshness: string;
  confidenceLevel: string;
  lastStateUpdate: string;
  dataMode: DataMode;
  totalWaypointsCount: number;
  completedWaypointsCount: number;
}

export interface BuildVoyageStateInput {
  selectedVessel: VesselProfile;
  mission: MissionConfig;
  activeRoute: RouteAlternative | null;
  gpsTracking: GPSTrackingState;
  connectivityState?: ConnectivityState;
  unifiedEnvironment?: EnvironmentalAlignmentResult | null;
  decisionConfidence?: DecisionConfidenceResult | null;
  environmentalMode?: 'REAL' | 'DEMO';
  referenceTimestampIso?: string;
}

/**
 * Computes exact Haversine distance in nautical miles between two geographic coordinates.
 */
export function haversineDistanceNm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3440.065; // Earth radius in nautical miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

/**
 * Resolves current and next waypoints along an active route given vessel position and progress %.
 */
export function resolveRouteWaypoints(
  waypoints: [number, number][] = [],
  currentLat: number,
  currentLon: number,
  progressPct: number
): {
  currentWaypoint: WaypointInfo | null;
  nextWaypoint: WaypointInfo | null;
  completedWaypointsCount: number;
} {
  if (!waypoints || waypoints.length === 0) {
    return { currentWaypoint: null, nextWaypoint: null, completedWaypointsCount: 0 };
  }

  const total = waypoints.length;
  if (total === 1) {
    const wp: WaypointInfo = {
      index: 0,
      name: 'Destination',
      lat: waypoints[0][0],
      lon: waypoints[0][1],
      distanceToNm: haversineDistanceNm(currentLat, currentLon, waypoints[0][0], waypoints[0][1]),
    };
    return { currentWaypoint: wp, nextWaypoint: null, completedWaypointsCount: 1 };
  }

  // Calculate segment index along waypoints list
  const fraction = Math.max(0, Math.min(100, progressPct)) / 100;
  const targetIdx = Math.round(fraction * (total - 1));
  const segIndex = Math.min(total - 2, Math.max(0, targetIdx));
  const completedCount = segIndex;

  const curWpPoint = waypoints[segIndex];
  const nextWpPoint = waypoints[segIndex + 1];

  const currentWpName = segIndex === 0 ? 'Origin / Start' : `Waypoint ${segIndex}`;
  const nextWpName = segIndex + 1 === total - 1 ? 'Destination' : `Waypoint ${segIndex + 1}`;

  const currentWaypoint: WaypointInfo = {
    index: segIndex,
    name: currentWpName,
    lat: curWpPoint[0],
    lon: curWpPoint[1],
    distanceToNm: haversineDistanceNm(currentLat, currentLon, curWpPoint[0], curWpPoint[1]),
  };

  const nextWaypoint: WaypointInfo = {
    index: segIndex + 1,
    name: nextWpName,
    lat: nextWpPoint[0],
    lon: nextWpPoint[1],
    distanceToNm: haversineDistanceNm(currentLat, currentLon, nextWpPoint[0], nextWpPoint[1]),
  };

  return { currentWaypoint, nextWaypoint, completedWaypointsCount: completedCount };
}

/**
 * Calculates Estimated Time Remaining (hours) and Estimated Arrival Time (ISO string).
 */
export function calculateEta(
  remainingDistanceNm: number,
  speedKnots: number,
  referenceTimestampIso?: string
): {
  estimatedTimeRemainingHours: number | null;
  estimatedArrivalTime: string | null;
} {
  const refTime = referenceTimestampIso ? new Date(referenceTimestampIso) : new Date();
  if (isNaN(refTime.getTime())) {
    return { estimatedTimeRemainingHours: null, estimatedArrivalTime: null };
  }

  if (remainingDistanceNm <= 0) {
    return {
      estimatedTimeRemainingHours: 0,
      estimatedArrivalTime: refTime.toISOString(),
    };
  }

  if (!speedKnots || speedKnots <= 0) {
    return {
      estimatedTimeRemainingHours: null,
      estimatedArrivalTime: null,
    };
  }

  const hoursRemaining = Number((remainingDistanceNm / speedKnots).toFixed(1));
  const arrivalMs = refTime.getTime() + hoursRemaining * 3600 * 1000;
  const etaDate = new Date(arrivalMs);

  return {
    estimatedTimeRemainingHours: hoursRemaining,
    estimatedArrivalTime: etaDate.toISOString(),
  };
}

/**
 * Determines operational navigation status from vessel progress, simulation state, and route selection.
 */
export function determineNavigationStatus(
  isSimulating: boolean,
  progressPct: number,
  hasActiveRoute: boolean
): NavigationStatus {
  if (progressPct >= 100) return 'COMPLETED';
  if (isSimulating) return 'UNDERWAY';
  if (progressPct > 0 && !isSimulating) return 'PAUSED';
  if (hasActiveRoute) return 'READY';
  return 'PLANNING';
}

/**
 * Determines data provenance mode (REAL / SIMULATED / HYBRID / UNAVAILABLE).
 */
export function determineDataMode(
  environmentalMode: 'REAL' | 'DEMO' = 'DEMO',
  isSimulating: boolean = false
): DataMode {
  if (environmentalMode === 'REAL') {
    return isSimulating ? 'HYBRID' : 'REAL';
  }
  return 'SIMULATED';
}

/**
 * Builds the complete Phase 8A VoyageState snapshot from active application context parameters.
 */
export function buildVoyageState(input: BuildVoyageStateInput): VoyageState {
  const nowIso = input.referenceTimestampIso || new Date().toISOString();
  const vessel = input.selectedVessel;
  const gps = input.gpsTracking;
  const route = input.activeRoute;
  const envMode = input.environmentalMode || 'DEMO';

  const progressPct = Math.max(0, Math.min(100, gps.routeProgressPct || 0));
  const totalDistance = route ? route.distanceNm : (gps.distanceTraveledNm + gps.distanceRemainingNm || 480);
  const traveledNm = Number(((progressPct / 100) * totalDistance).toFixed(1));
  const remainingNm = Number(Math.max(0, totalDistance - traveledNm).toFixed(1));

  const speedKnots = gps.speedKnots;
  const navStatus = determineNavigationStatus(gps.isSimulating, progressPct, Boolean(route));
  const dataMode = determineDataMode(envMode, gps.isSimulating);

  const waypoints = route ? route.waypoints : [];
  const { currentWaypoint, nextWaypoint, completedWaypointsCount } = resolveRouteWaypoints(
    waypoints,
    gps.currentLat,
    gps.currentLon,
    progressPct
  );

  const eta = calculateEta(remainingNm, speedKnots, nowIso);

  // Environmental freshness label
  let freshnessLabel = 'FRESH (REAL-TIME TELEMETRY)';
  if (input.unifiedEnvironment) {
    freshnessLabel = input.unifiedEnvironment.alignmentStatus || 'FRESH';
  } else if (envMode === 'DEMO') {
    freshnessLabel = 'DEMO DATASET (SYNTHETIC BASELINE)';
  }

  // Decision confidence level
  let confidenceLevel = 'MEDIUM';
  if (input.decisionConfidence) {
    confidenceLevel = input.decisionConfidence.overallLevel || 'MEDIUM';
  }

  const connectivity: ConnectivityState = input.connectivityState || 'ONLINE';

  return {
    vesselId: vessel.id,
    vesselName: vessel.name,
    iceClass: vessel.iceClass,
    currentPosition: {
      lat: gps.currentLat,
      lon: gps.currentLon,
      headingDeg: gps.headingDeg,
      speedKnots,
    },
    currentRouteId: route ? route.id : null,
    currentRouteName: route ? route.name || route.type : 'Recommended Drake Corridor',
    navigationStatus: navStatus,
    currentWaypoint,
    nextWaypoint,
    distanceTravelledNm: traveledNm,
    remainingDistanceNm: remainingNm,
    progressPercent: progressPct,
    estimatedTimeRemainingHours: eta.estimatedTimeRemainingHours,
    estimatedArrivalTime: eta.estimatedArrivalTime,
    currentSpeedKnots: speedKnots,
    connectivityState: connectivity,
    environmentalDataFreshness: freshnessLabel,
    confidenceLevel,
    lastStateUpdate: nowIso,
    dataMode,
    totalWaypointsCount: waypoints.length,
    completedWaypointsCount,
  };
}
