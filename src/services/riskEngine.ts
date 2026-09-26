/**
 * CRYO NAV — Environmental Risk Engine
 * Implements weighted formulation:
 * Risk = ice_risk + iceberg_risk + weather_risk + ocean_risk + uncertainty_risk
 * Normalized to 0–100.
 * Dynamic safety margins scale with uncertainty.
 */

import { IcebergDetection, SeaIceCell, WeatherCondition, VesselProfile } from '../types';

export interface RiskEvaluationPoint {
  lat: number;
  lon: number;
  totalRisk: number; // 0-100
  iceRisk: number;
  icebergRisk: number;
  weatherRisk: number;
  uncertaintyRisk: number;
  nearestIcebergDistanceNm: number;
  localSeaIceConcentration: number;
  isFeasibleForVessel: boolean;
}

// Great-circle distance approximation in nautical miles
export function calculateDistanceNm(lat1: number, lon1: number, lat2: number, lon2: number): number {
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
  return R * c;
}

// Distance from a point to a line segment in nautical miles
export function calculateDistanceToSegmentNm(
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

// Minimum distance from a point to an array of route waypoints in nautical miles
export function calculateDistanceToRouteNm(
  lat: number,
  lon: number,
  routeWaypoints: [number, number][]
): number {
  if (!routeWaypoints || routeWaypoints.length === 0) return Infinity;
  if (routeWaypoints.length === 1) {
    return calculateDistanceNm(lat, lon, routeWaypoints[0][0], routeWaypoints[0][1]);
  }

  let minDistance = Infinity;
  for (let i = 0; i < routeWaypoints.length - 1; i++) {
    const d = calculateDistanceToSegmentNm(
      lat,
      lon,
      routeWaypoints[i][0],
      routeWaypoints[i][1],
      routeWaypoints[i + 1][0],
      routeWaypoints[i + 1][1]
    );
    if (d < minDistance) minDistance = d;
  }
  return minDistance;
}

// Generates parallel offset corridor polygon coordinates (WGS84) around a route geometry
export function calculateRouteCorridorPolygon(
  routeWaypoints: [number, number][],
  offsetNm: number = 4.0
): [number, number][] {
  if (!routeWaypoints || routeWaypoints.length < 2) return [];

  const degOffset = offsetNm / 60.0;
  const leftSide: [number, number][] = [];
  const rightSide: [number, number][] = [];

  for (let i = 0; i < routeWaypoints.length; i++) {
    let dLat = 0;
    let dLon = 0;

    if (i === 0) {
      dLat = routeWaypoints[1][0] - routeWaypoints[0][0];
      dLon = routeWaypoints[1][1] - routeWaypoints[0][1];
    } else if (i === routeWaypoints.length - 1) {
      dLat = routeWaypoints[i][0] - routeWaypoints[i - 1][0];
      dLon = routeWaypoints[i][1] - routeWaypoints[i - 1][1];
    } else {
      dLat = routeWaypoints[i + 1][0] - routeWaypoints[i - 1][0];
      dLon = routeWaypoints[i + 1][1] - routeWaypoints[i - 1][1];
    }

    const len = Math.sqrt(dLat * dLat + dLon * dLon) || 1;
    const nx = -dLon / len;
    const ny = dLat / len;

    const lat = routeWaypoints[i][0];
    const lon = routeWaypoints[i][1];
    const cosLat = Math.cos((lat * Math.PI) / 180) || 1;

    leftSide.push([lat + ny * degOffset, lon + (nx * degOffset) / cosLat]);
    rightSide.push([lat - ny * degOffset, lon - (nx * degOffset) / cosLat]);
  }

  return [...leftSide, ...rightSide.reverse()];
}

export function evaluatePointRisk(
  lat: number,
  lon: number,
  icebergs: IcebergDetection[],
  seaIceCells: SeaIceCell[],
  weather: WeatherCondition,
  vessel: VesselProfile,
  uncertaintyMultiplier: number = 1.0
): RiskEvaluationPoint {
  // 1. Sea Ice Risk
  // Find closest sea ice grid cell
  let minCellDist = Infinity;
  let nearestCell: SeaIceCell | null = null;

  for (const cell of seaIceCells) {
    const d = calculateDistanceNm(lat, lon, cell.lat, cell.lon);
    if (d < minCellDist) {
      minCellDist = d;
      nearestCell = cell;
    }
  }

  const iceConcentration = nearestCell ? nearestCell.concentrationPercent : 10;
  const vesselMaxIce = vessel.maxSeaIceConcentrationPercent || 70;

  // Ice risk increases sharply when approaching or exceeding vessel rating
  let iceRisk = 0;
  if (iceConcentration > vesselMaxIce) {
    iceRisk = 85 + (iceConcentration - vesselMaxIce) * 1.5;
  } else {
    iceRisk = (iceConcentration / vesselMaxIce) * 45;
  }

  // 2. Iceberg Proximity & Trajectory Risk
  let nearestBergDist = Infinity;
  let maxBergHazard = 0;

  for (const berg of icebergs) {
    const dist = calculateDistanceNm(lat, lon, berg.lat, berg.lon);
    if (dist < nearestBergDist) {
      nearestBergDist = dist;
    }

    // Clearance buffer depends on berg size & uncertainty
    const safetyClearanceNm = (berg.estimatedLengthMeters / 1000) * 1.5 + berg.uncertaintyRadiusNm * 2.0 * uncertaintyMultiplier;

    if (dist < safetyClearanceNm) {
      // Critical proximity
      const proximityFactor = Math.max(0, 1 - dist / safetyClearanceNm);
      const hazard = 50 + proximityFactor * 50;
      if (hazard > maxBergHazard) maxBergHazard = hazard;
    } else if (dist < safetyClearanceNm * 3) {
      // Caution buffer
      const cautionFactor = Math.max(0, 1 - (dist - safetyClearanceNm) / (safetyClearanceNm * 2));
      const hazard = cautionFactor * 40;
      if (hazard > maxBergHazard) maxBergHazard = hazard;
    }

    // Check future trajectory points
    for (const traj of berg.predictedTrajectory) {
      const trajDist = calculateDistanceNm(lat, lon, traj.lat, traj.lon);
      const trajClearance = traj.uncertaintyRadiusNm * 2.5 * uncertaintyMultiplier;
      if (trajDist < trajClearance) {
        const trajHazard = (1 - trajDist / trajClearance) * 35;
        if (trajHazard > maxBergHazard) maxBergHazard = trajHazard;
      }
    }
  }

  const icebergRisk = Math.min(100, maxBergHazard);

  // 3. Weather & Ocean Risk
  const windFactor = Math.min(1.0, Math.max(0, (weather.windSpeedKnots - 15) / 35));
  const waveFactor = Math.min(1.0, Math.max(0, (weather.waveHeightMeters - 1.5) / 5.0));
  const visFactor = Math.min(1.0, Math.max(0, (5.0 - weather.visibilityNm) / 4.0));
  const weatherRisk = Math.min(100, (windFactor * 0.4 + waveFactor * 0.4 + visFactor * 0.2) * 100);

  // 4. Uncertainty Risk
  const cellUncertainty = nearestCell && typeof nearestCell.uncertainty === 'number' ? nearestCell.uncertainty : 20;
  const uncertaintyRisk = Math.min(100, cellUncertainty * 1.2 * uncertaintyMultiplier);

  // Weighted composition (0-100)
  // Weights: Ice (0.35), Iceberg (0.35), Weather (0.15), Uncertainty (0.15)
  const rawTotalRisk =
    iceRisk * 0.35 +
    icebergRisk * 0.35 +
    weatherRisk * 0.15 +
    uncertaintyRisk * 0.15;

  const totalRisk = Math.min(100, Math.max(0, Math.round(rawTotalRisk)));
  const isFeasibleForVessel = iceConcentration <= vesselMaxIce && nearestBergDist >= 0.8;

  return {
    lat,
    lon,
    totalRisk,
    iceRisk: Math.round(iceRisk),
    icebergRisk: Math.round(icebergRisk),
    weatherRisk: Math.round(weatherRisk),
    uncertaintyRisk: Math.round(uncertaintyRisk),
    nearestIcebergDistanceNm: Number(nearestBergDist.toFixed(1)),
    localSeaIceConcentration: iceConcentration,
    isFeasibleForVessel,
  };
}
