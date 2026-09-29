/**
 * CRYO NAV — Dynamic Water-Constrained Antarctic Route Planning Engine
 *
 * Cost function:
 * Cost = α × distance + β × fuel + γ × time + δ × environmental_risk + ε × uncertainty
 *
 * Generates 1, 2, or 3 valid navigational alternatives: SAFEST, BALANCED, FASTEST.
 * Dynamically constructs a water-only navigation grid across the ocean space between
 * source and destination. Strictly enforces segment-level land/ice-shelf avoidance.
 * REJECTS any route that intersects continental land or ice shelves.
 */

import {
  MissionConfig,
  VesselProfile,
  IcebergDetection,
  SeaIceCell,
  WeatherCondition,
  RouteAlternative,
  IcebergEncounter,
  DecisionConfidenceResult,
} from '../types';
import { calculateDistanceNm, evaluatePointRisk } from './riskEngine';
import { getStationById, AUTHORITATIVE_RESEARCH_STATIONS, ResearchStation } from '../data/researchStations';
import {
  classifyGeographicLocation,
  segmentIntersectsProhibitedGeography,
  validateMaritimeRouteGeometry,
  toLeafletLatLng,
  toGeoJsonCoordinate,
} from './antarcticGeographicMask';

export interface RoutingWeights {
  alphaDistance: number;
  betaFuel: number;
  gammaTime: number;
  deltaRisk: number;
  epsilonUncertainty: number;
}

export const DEFAULT_WEIGHTS: Record<'SAFE' | 'BALANCED' | 'FAST', RoutingWeights> = {
  SAFE: {
    alphaDistance: 0.1,
    betaFuel: 0.1,
    gammaTime: 0.1,
    deltaRisk: 0.45,
    epsilonUncertainty: 0.25,
  },
  BALANCED: {
    alphaDistance: 0.2,
    betaFuel: 0.2,
    gammaTime: 0.2,
    deltaRisk: 0.25,
    epsilonUncertainty: 0.15,
  },
  FAST: {
    alphaDistance: 0.35,
    betaFuel: 0.25,
    gammaTime: 0.3,
    deltaRisk: 0.08,
    epsilonUncertainty: 0.02,
  },
};

/**
 * Route Similarity & Geometric Separation Evaluation Result
 */
export interface RouteSimilarityResult {
  averageSeparationNm: number;
  maxSeparationNm: number;
  corridorOverlapPct: number;
  isGeometricallySimilar: boolean;
}

/**
 * Calculates geometric similarity between two route polylines
 */
export function calculateRouteSimilarity(
  routeA: [number, number][],
  routeB: [number, number][],
  minSeparationThresholdNm: number = 18.0,
  maxOverlapPctThreshold: number = 85.0
): RouteSimilarityResult {
  if (!routeA || !routeB || routeA.length < 2 || routeB.length < 2) {
    return {
      averageSeparationNm: 0,
      maxSeparationNm: 0,
      corridorOverlapPct: 100,
      isGeometricallySimilar: true,
    };
  }

  const numSamples = 25;
  const samplesA = sampleRoutePoints(routeA, numSamples);
  const samplesB = sampleRoutePoints(routeB, numSamples);

  let totalSeparation = 0;
  let maxSeparation = 0;
  let overlapCount = 0;

  for (let i = 0; i < numSamples; i++) {
    const pA = samplesA[i];
    const pB = samplesB[i];
    const dist = calculateDistanceNm(pA[0], pA[1], pB[0], pB[1]);
    totalSeparation += dist;
    if (dist > maxSeparation) maxSeparation = dist;
    if (dist <= minSeparationThresholdNm) overlapCount++;
  }

  const averageSeparationNm = Number((totalSeparation / numSamples).toFixed(1));
  const maxSeparationNm = Number(maxSeparation.toFixed(1));
  const corridorOverlapPct = Number(((overlapCount / numSamples) * 100).toFixed(1));

  const isGeometricallySimilar =
    corridorOverlapPct >= maxOverlapPctThreshold || averageSeparationNm < minSeparationThresholdNm;

  return {
    averageSeparationNm,
    maxSeparationNm,
    corridorOverlapPct,
    isGeometricallySimilar,
  };
}

/**
 * Helper to sample N progress points along a polyline
 */
function sampleRoutePoints(waypoints: [number, number][], numSamples: number): [number, number][] {
  let totalDist = 0;
  const segDistances: number[] = [];
  for (let i = 0; i < waypoints.length - 1; i++) {
    const d = calculateDistanceNm(waypoints[i][0], waypoints[i][1], waypoints[i + 1][0], waypoints[i + 1][1]);
    segDistances.push(d);
    totalDist += d;
  }

  if (totalDist === 0) {
    return Array(numSamples).fill(waypoints[0]);
  }

  const result: [number, number][] = [];
  for (let s = 0; s < numSamples; s++) {
    const targetDist = (s / (numSamples - 1)) * totalDist;
    let accumulated = 0;
    let found = false;

    for (let i = 0; i < segDistances.length; i++) {
      const segD = segDistances[i];
      if (accumulated + segD >= targetDist || i === segDistances.length - 1) {
        const span = segD > 0 ? targetDist - accumulated : 0;
        const frac = segD > 0 ? Math.min(1, Math.max(0, span / segD)) : 0;
        const p1 = waypoints[i];
        const p2 = waypoints[i + 1];
        const lat = p1[0] + (p2[0] - p1[0]) * frac;
        const lon = p1[1] + (p2[1] - p1[1]) * frac;
        result.push([lat, lon]);
        found = true;
        break;
      }
      accumulated += segD;
    }
    if (!found) result.push(waypoints[waypoints.length - 1]);
  }
  return result;
}

/**
 * Deterministic hash generator for route geometry deduplication
 */
export function generateGeometryHash(waypoints: [number, number][]): string {
  if (!waypoints || waypoints.length === 0) return 'empty-hash';
  const samples = sampleRoutePoints(waypoints, 10);
  const str = samples.map((p) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`).join('|');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `GEO-${Math.abs(hash).toString(16)}`;
}

/**
 * Calculates Closest Point of Approach (CPA) between route waypoints and an iceberg.
 */
export function calculateIcebergCPA(
  routeWaypoints: [number, number][],
  iceberg: IcebergDetection,
  vesselSpeedKnots: number
): IcebergEncounter {
  if (!routeWaypoints || routeWaypoints.length < 2) {
    return {
      distanceNm: 999,
      timeHours: 0,
      bearingDeg: 0,
      encounterRisk: 'Low',
      routeId: '',
    };
  }

  let minDistance = Infinity;
  let timeHoursAtMin = 0;
  let cumulativeDistNm = 0;

  for (let i = 0; i < routeWaypoints.length - 1; i++) {
    const p1 = routeWaypoints[i];
    const p2 = routeWaypoints[i + 1];
    const segDist = calculateDistanceNm(p1[0], p1[1], p2[0], p2[1]);

    const steps = Math.max(5, Math.ceil(segDist / 5));
    for (let s = 0; s <= steps; s++) {
      const frac = s / steps;
      const curLat = p1[0] + (p2[0] - p1[0]) * frac;
      const curLon = p1[1] + (p2[1] - p1[1]) * frac;

      const curDistAlongRoute = cumulativeDistNm + segDist * frac;
      const curTimeHours = curDistAlongRoute / Math.max(1, vesselSpeedKnots);

      let bergLat = iceberg.lat;
      let bergLon = iceberg.lon;
      if (curTimeHours > 0 && iceberg.predictedTrajectory && iceberg.predictedTrajectory.length > 0) {
        for (let t = 0; t < iceberg.predictedTrajectory.length; t++) {
          const pt = iceberg.predictedTrajectory[t];
          if (curTimeHours <= pt.hours) {
            const prevPt = t === 0 ? { hours: 0, lat: iceberg.lat, lon: iceberg.lon } : iceberg.predictedTrajectory[t - 1];
            const span = pt.hours - prevPt.hours;
            const subFrac = span > 0 ? (curTimeHours - prevPt.hours) / span : 0;
            bergLat = prevPt.lat + (pt.lat - prevPt.lat) * subFrac;
            bergLon = prevPt.lon + (pt.lon - prevPt.lon) * subFrac;
            break;
          }
        }
      }

      const d = calculateDistanceNm(curLat, curLon, bergLat, bergLon);
      if (d < minDistance) {
        minDistance = d;
        timeHoursAtMin = curTimeHours;
      }
    }

    cumulativeDistNm += segDist;
  }

  const dLon = ((iceberg.lon - routeWaypoints[0][1]) * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos((iceberg.lat * Math.PI) / 180);
  const x =
    Math.cos((routeWaypoints[0][0] * Math.PI) / 180) * Math.sin((iceberg.lat * Math.PI) / 180) -
    Math.sin((routeWaypoints[0][0] * Math.PI) / 180) * Math.cos((iceberg.lat * Math.PI) / 180) * Math.cos(dLon);
  const bearingDeg = Math.round(((Math.atan2(y, x) * 180) / Math.PI + 360) % 360);

  let encounterRisk: IcebergEncounter['encounterRisk'] = 'Low';
  if (minDistance < 2.0) encounterRisk = 'Critical';
  else if (minDistance < 4.5) encounterRisk = 'High';
  else if (minDistance < 8.0) encounterRisk = 'Moderate';

  return {
    distanceNm: Number(minDistance.toFixed(1)),
    timeHours: Number(timeHoursAtMin.toFixed(1)),
    bearingDeg,
    encounterRisk,
    routeId: '',
  };
}

export interface RouteGeometryValidationResult {
  isValid: boolean;
  reason?: string;
  totalDistanceNm?: number;
}

/**
 * Validates generated route geometry before displaying on map or decision state.
 */
export function validateRouteGeometry(
  waypoints: [number, number][],
  source: [number, number],
  dest: [number, number],
  vessel?: VesselProfile
): RouteGeometryValidationResult {
  const geoResult = validateMaritimeRouteGeometry(waypoints);
  if (!geoResult.isValid) {
    return {
      isValid: false,
      reason: geoResult.details,
      totalDistanceNm: geoResult.totalDistanceNm,
    };
  }

  return { isValid: true, totalDistanceNm: geoResult.totalDistanceNm };
}

/**
 * Dense subsegment interpolation for smooth map rendering
 */
function interpolateSubsegment(
  p1: [number, number],
  p2: [number, number],
  maxSpacingNm: number = 25
): [number, number][] {
  const dist = calculateDistanceNm(p1[0], p1[1], p2[0], p2[1]);
  if (dist <= maxSpacingNm) return [p1, p2];

  const steps = Math.ceil(dist / maxSpacingNm);
  const pts: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const frac = i / steps;
    const lat = Number((p1[0] + (p2[0] - p1[0]) * frac).toFixed(4));
    const lon = Number((p1[1] + (p2[1] - p1[1]) * frac).toFixed(4));
    pts.push([lat, lon]);
  }
  return pts;
}

/**
 * Internal Grid Node Representation
 */
interface GridNode {
  id: string;
  lat: number;
  lon: number;
}

/**
 * Global Antarctic Ocean Highway Navigational Nodes
 * Verified open-water ocean nodes in the Southern Ocean surrounding Antarctica.
 * Situated offshore (latitudes -59°S to -65°S) to ensure vessels navigate open water
 * without hopping between research stations.
 */
/**
 * Global Antarctic Ocean Highway Navigational Nodes
 * Verified open-water ocean nodes in the Southern Ocean surrounding Antarctica.
 * Situated offshore (latitudes -59°S to -65°S) to ensure vessels navigate open water
 * without hopping between research stations.
 */
export const GLOBAL_ANTARCTIC_OCEAN_WAYPOINTS: { id: string; name: string; lat: number; lon: number }[] = [
  { id: 'gate-drake-south', name: 'Drake Passage South Gate', lat: -59.5, lon: -64.5 },
  { id: 'gate-scotia-east', name: 'Scotia Sea East Gate', lat: -60.0, lon: -45.0 },
  { id: 'gate-weddell-north', name: 'Weddell Sea Approach', lat: -62.0, lon: -40.0 },
  { id: 'gate-weddell-deep', name: 'Weddell Sea Outer Corridor', lat: -65.0, lon: -35.0 },
  { id: 'gate-dronning-maud-w', name: 'Atka Bay Outer Ocean', lat: -64.0, lon: -8.3 },
  { id: 'gate-dronning-maud-e', name: 'Schirmacher Outer Ocean', lat: -63.5, lon: 11.8 },
  { id: 'gate-enderby-west', name: 'Enderby Land Outer Ocean', lat: -62.5, lon: 35.0 },
  { id: 'gate-enderby-east', name: 'Enderby East Offshore Gate', lat: -63.0, lon: 48.0 },
  { id: 'gate-mawson-gate', name: 'Mac. Robertson Outer Ocean', lat: -63.5, lon: 62.9 },
  { id: 'gate-prydz-bay-gate', name: 'Larsemann Hills Outer Ocean', lat: -64.5, lon: 76.2 },
  { id: 'gate-davis-gate', name: 'Vestfold Hills Outer Ocean', lat: -63.5, lon: 78.0 },
  { id: 'gate-shackleton-outer', name: 'Shackleton Outer Ocean', lat: -62.0, lon: 95.0 },
  { id: 'gate-vincennes-gate', name: 'Vincennes Bay Outer Ocean', lat: -61.5, lon: 110.5 },
  { id: 'gate-wilkes-outer', name: 'Wilkes Land Outer Ocean', lat: -61.0, lon: 125.0 },
  { id: 'gate-adelie-coast', name: 'Adélie Coast Outer Ocean', lat: -60.5, lon: 140.0 },
  { id: 'gate-ross-north', name: 'Ross Sea North Outer Gate', lat: -66.0, lon: 170.0 },
  { id: 'gate-amundsen-sea', name: 'Amundsen Sea Outer Corridor', lat: -64.0, lon: -120.0 },
  { id: 'gate-amundsen-east', name: 'Amundsen East Outer Corridor', lat: -63.5, lon: -105.0 },
  { id: 'gate-bellingshausen', name: 'Bellingshausen Sea Gate', lat: -63.0, lon: -90.0 },
  { id: 'gate-bellingshausen-west', name: 'Bellingshausen West Gate', lat: -63.5, lon: -80.0 },
  { id: 'gate-peninsula-west', name: 'Adelaide / Rothera Outer Gate', lat: -64.5, lon: -68.5 },
];

/**
  Resolves a research station to a valid navigable maritime ocean access point.
 */
export function resolveMaritimeAccessPoint(station: ResearchStation): [number, number] {
  if (station.maritimeAccessPoint) {
    const cls = classifyGeographicLocation(station.maritimeAccessPoint[0], station.maritimeAccessPoint[1]);
    if (cls === 'WATER' || cls === 'UNKNOWN') {
      return station.maritimeAccessPoint;
    }
  }

  // Search outward in expanding rings for closest open water point
  const radii = [0.1, 0.25, 0.5, 0.8, 1.2, 1.8, 2.5];
  const angles = [0, 45, 90, 135, 180, 225, 270, 315];

  for (const r of radii) {
    for (const a of angles) {
      const rad = (a * Math.PI) / 180;
      const testLat = station.lat + r * Math.cos(rad);
      const testLon = station.lon + (r * Math.sin(rad)) / Math.cos((station.lat * Math.PI) / 180);
      if (classifyGeographicLocation(testLat, testLon) === 'WATER') {
        return [Number(testLat.toFixed(3)), Number(testLon.toFixed(3))];
      }
    }
  }

  return [station.lat, station.lon];
}

/**
 * Dynamic Region-Based Water Navigation Grid Generator
 */
function buildDynamicWaterGrid(
  startPt: [number, number],
  endPt: [number, number]
): {
  nodes: GridNode[];
  adjList: Map<string, { targetId: string; distanceNm: number }[]>;
  startNodeId: string;
  endNodeId: string;
} {
  const nodesMap = new Map<string, GridNode>();

  const startId = 'start-node';
  const endId = 'end-node';
  nodesMap.set(startId, { id: startId, lat: startPt[0], lon: startPt[1] });
  nodesMap.set(endId, { id: endId, lat: endPt[0], lon: endPt[1] });

  // Add all global Antarctic ocean highway waypoints
  GLOBAL_ANTARCTIC_OCEAN_WAYPOINTS.forEach((gw) => {
    if (classifyGeographicLocation(gw.lat, gw.lon) === 'WATER') {
      nodesMap.set(gw.id, { id: gw.id, lat: gw.lat, lon: gw.lon });
    }
  });

  // Calculate voyage bounding region & direction vector
  const distDirect = calculateDistanceNm(startPt[0], startPt[1], endPt[0], endPt[1]);
  const steps = Math.max(4, Math.min(15, Math.ceil(distDirect / 120)));

  const dLat = endPt[0] - startPt[0];
  const dLon = endPt[1] - startPt[1];
  const len = Math.hypot(dLat, dLon) || 1.0;
  // Perpendicular unit vector (cross-track offset direction)
  const pLat = -dLon / len;
  const pLon = dLat / len;

  // Perpendicular offset multipliers (degrees latitude/longitude equivalent)
  const perpOffsets = [0, -1.2, 1.2, -3.0, 3.0, -6.0, 6.0, -10.0, 10.0];

  for (let s = 1; s < steps; s++) {
    const frac = s / steps;
    const baseLat = startPt[0] + dLat * frac;
    const baseLon = startPt[1] + dLon * frac;

    for (const off of perpOffsets) {
      const lat = Number((baseLat + pLat * off).toFixed(2));
      const lon = Number((baseLon + pLon * off).toFixed(2));
      if (lat >= -85.0 && lat <= -50.0 && lon >= -180 && lon <= 180) {
        if (classifyGeographicLocation(lat, lon) === 'WATER') {
          const id = `grid-${lat}_${lon}`;
          if (!nodesMap.has(id)) {
            nodesMap.set(id, { id, lat, lon });
          }
        }
      }
    }
  }

  // Add dense local grid nodes around start & end access points
  const localRadii = [0.3, 0.8, 1.8, 3.5];
  const localAngles = [0, 45, 90, 135, 180, 225, 270, 315];

  [startPt, endPt].forEach((pt) => {
    for (const r of localRadii) {
      for (const a of localAngles) {
        const rad = (a * Math.PI) / 180;
        const lat = Number((pt[0] + r * Math.cos(rad)).toFixed(2));
        const lon = Number((pt[1] + (r * Math.sin(rad)) / Math.cos((pt[0] * Math.PI) / 180)).toFixed(2));
        if (lat >= -85.0 && lat <= -50.0 && classifyGeographicLocation(lat, lon) === 'WATER') {
          const id = `grid-${lat}_${lon}`;
          if (!nodesMap.has(id)) {
            nodesMap.set(id, { id, lat, lon });
          }
        }
      }
    }
  });

  const nodes = Array.from(nodesMap.values());
  const adjList = new Map<string, { targetId: string; distanceNm: number }[]>();
  nodes.forEach((n) => adjList.set(n.id, []));

  // Maximum neighbor distance scale with voyage length
  const MAX_NEIGHBOR_DIST_NM = Math.max(250.0, Math.min(950.0, distDirect * 0.75));

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const u = nodes[i];
      const v = nodes[j];

      // Fast bounding box pre-filter to eliminate distant node pairs instantly
      if (Math.abs(u.lat - v.lat) > 12.0 || Math.abs(u.lon - v.lon) > 25.0) {
        continue;
      }

      const dist = calculateDistanceNm(u.lat, u.lon, v.lat, v.lon);
      if (dist <= MAX_NEIGHBOR_DIST_NM) {
        const check = segmentIntersectsProhibitedGeography([u.lat, u.lon], [v.lat, v.lon]);
        if (!check.intersects) {
          adjList.get(u.id)?.push({ targetId: v.id, distanceNm: dist });
          adjList.get(v.id)?.push({ targetId: u.id, distanceNm: dist });
        }
      }
    }
  }

  return { nodes, adjList, startNodeId: startId, endNodeId: endId };
}

/**
 * Objective-Specific A* Pathfinding on Water Grid
 */
function runGridAStar(
  startId: string,
  endId: string,
  nodes: GridNode[],
  adjList: Map<string, { targetId: string; distanceNm: number }[]>,
  objective: 'SAFE' | 'BALANCED' | 'FAST',
  icebergs: IcebergDetection[],
  seaIceCells: SeaIceCell[],
  weather: WeatherCondition,
  vessel: VesselProfile,
  uncertaintyMultiplier: number = 1.0,
  edgePenaltyMap?: Map<string, number>
): [number, number][] {
  const nodeMap = new Map<string, GridNode>();
  nodes.forEach((n) => nodeMap.set(n.id, n));

  const endNode = nodeMap.get(endId);
  if (!endNode) return [];

  const gScore = new Map<string, number>();
  const fScore = new Map<string, number>();
  const previous = new Map<string, string | null>();
  const openSet = new Set<string>();

  nodes.forEach((n) => {
    gScore.set(n.id, Infinity);
    fScore.set(n.id, Infinity);
    previous.set(n.id, null);
  });

  const startNode = nodeMap.get(startId)!;
  const startH = calculateDistanceNm(startNode.lat, startNode.lon, endNode.lat, endNode.lon);

  gScore.set(startId, 0);
  fScore.set(startId, startH);
  openSet.add(startId);

  while (openSet.size > 0) {
    let currentId: string | null = null;
    let minF = Infinity;

    for (const id of openSet) {
      const f = fScore.get(id)!;
      if (f < minF) {
        minF = f;
        currentId = id;
      }
    }

    if (!currentId || minF === Infinity) break;
    if (currentId === endId) break;

    openSet.delete(currentId);

    const neighbors = adjList.get(currentId) || [];
    const uNode = nodeMap.get(currentId)!;

    for (const edge of neighbors) {
      const vNode = nodeMap.get(edge.targetId);
      if (!vNode) continue;

      const dist = edge.distanceNm;
      const midLat = (uNode.lat + vNode.lat) / 2;
      const midLon = (uNode.lon + vNode.lon) / 2;

      // Evaluate environmental risk at segment midpoint
      const evalPt = evaluatePointRisk(midLat, midLon, icebergs, seaIceCells, weather, vessel, uncertaintyMultiplier);

      let objectiveWeight = 1.0;
      if (objective === 'SAFE') {
        // SAFE strongly avoids risk, sea ice, icebergs, weather, and coastal proximity
        const iceRiskPen = evalPt.localSeaIceConcentration > 0 ? (evalPt.localSeaIceConcentration / 12) ** 1.8 : 0;
        const bergPen = evalPt.nearestIcebergDistanceNm < 8.0 ? (8.0 - evalPt.nearestIcebergDistanceNm) * 2.5 : 0;
        const riskPen = evalPt.totalRisk * 0.08;
        const uncPen = evalPt.uncertaintyRisk * 0.05;
        // Prefer deep offshore ocean (further north lat) for safety
        const coastalProximityPen = Math.max(0, (-63.0 - midLat) * 0.12);

        objectiveWeight = 1.0 + iceRiskPen + bergPen + riskPen + uncPen + coastalProximityPen;
      } else if (objective === 'BALANCED') {
        // BALANCED: moderate balance between distance, time, and safety
        const iceRiskPen = evalPt.localSeaIceConcentration > 0 ? (evalPt.localSeaIceConcentration / 25) * 1.2 : 0;
        const bergPen = evalPt.nearestIcebergDistanceNm < 5.0 ? (5.0 - evalPt.nearestIcebergDistanceNm) * 1.0 : 0;
        const riskPen = evalPt.totalRisk * 0.03;

        objectiveWeight = 1.0 + iceRiskPen + bergPen + riskPen;
      } else {
        // FAST: Minimizes travel time (ETA), incorporating ocean current assistance if present
        const riskPen = evalPt.totalRisk * 0.005;
        let currentAssistance = 0;
        if (weather && weather.oceanCurrentKnots) {
          const edgeAngleRad = Math.atan2(vNode.lon - uNode.lon, vNode.lat - uNode.lat);
          const currAngleRad = ((weather.oceanCurrentDirectionDeg || 0) * Math.PI) / 180;
          const dot = Math.cos(edgeAngleRad - currAngleRad);
          currentAssistance = weather.oceanCurrentKnots * dot * 0.2;
        }
        const effectiveSpeed = Math.max(1, vessel.cruisingSpeedKnots + currentAssistance);
        objectiveWeight = (vessel.cruisingSpeedKnots / effectiveSpeed) * (1.0 + riskPen);
      }

      let edgeCost = dist * objectiveWeight;
      if (edgePenaltyMap) {
        const edgeKey = `${currentId}->${edge.targetId}`;
        const penalty = edgePenaltyMap.get(edgeKey) || 1.0;
        edgeCost *= penalty;
      }

      const tentativeG = gScore.get(currentId)! + edgeCost;

      if (tentativeG < gScore.get(edge.targetId)!) {
        previous.set(edge.targetId, currentId);
        gScore.set(edge.targetId, tentativeG);
        const h = calculateDistanceNm(vNode.lat, vNode.lon, endNode.lat, endNode.lon);
        fScore.set(edge.targetId, tentativeG + h);
        openSet.add(edge.targetId);
      }
    }
  }

  if (gScore.get(endId) === Infinity) return [];

  const pathNodes: string[] = [];
  let curr: string | null = endId;
  while (curr) {
    pathNodes.unshift(curr);
    curr = previous.get(curr) || null;
  }

  return pathNodes.map((id) => [nodeMap.get(id)!.lat, nodeMap.get(id)!.lon]);
}

export function findStationByLocation(locName: string, lat: number, lon: number): ResearchStation | undefined {
  if (locName) {
    let st = AUTHORITATIVE_RESEARCH_STATIONS.find((s) => s.id === locName);
    if (st) return st;

    const lower = locName.toLowerCase();
    st = AUTHORITATIVE_RESEARCH_STATIONS.find(
      (s) =>
        s.name.toLowerCase().includes(lower) ||
        lower.includes(s.name.toLowerCase()) ||
        s.shortName.toLowerCase().includes(lower) ||
        lower.includes(s.shortName.toLowerCase())
    );
    if (st) return st;

    // Check partial words (e.g. "Rothera", "Palmer", "Maitri", "Bharati")
    const words = lower.split(/\s+/).filter((w) => w.length >= 4);
    for (const w of words) {
      st = AUTHORITATIVE_RESEARCH_STATIONS.find(
        (s) => s.name.toLowerCase().includes(w) || s.shortName.toLowerCase().includes(w)
      );
      if (st) return st;
    }
  }

  // Fallback spatial proximity check within 1.5 degrees
  return AUTHORITATIVE_RESEARCH_STATIONS.find(
    (s) => Math.abs(s.lat - lat) < 1.5 && Math.abs(s.lon - lon) < 1.5
  );
}

/**
 * Generates multi-objective route alternatives between source and destination.
 */
export function generateRouteAlternatives(
  mission: MissionConfig,
  vessel: VesselProfile,
  icebergs: IcebergDetection[],
  seaIceCells: SeaIceCell[],
  weather: WeatherCondition,
  activeScenarioModifier: number = 1.0,
  decisionConfidence?: DecisionConfidenceResult
): RouteAlternative[] {
  const startStation = findStationByLocation(mission.startLocation.name, mission.startLocation.lat, mission.startLocation.lon);
  const destStation = findStationByLocation(mission.destination.name, mission.destination.lat, mission.destination.lon);

  // 1. Check for Inland Station (South Pole / Concordia)
  const isStartInland = (startStation && startStation.isInlandForbidden) || mission.startLocation.lat < -80.0;
  const isDestInland = (destStation && destStation.isInlandForbidden) || mission.destination.lat < -80.0;

  if (isStartInland || isDestInland) {
    return []; // Inland research stations produce MARITIME ROUTE UNAVAILABLE
  }

  // 2. Resolve source & destination maritime access coordinates
  const startPt: [number, number] = startStation
    ? resolveMaritimeAccessPoint(startStation)
    : [mission.startLocation.lat, mission.startLocation.lon];

  const destPt: [number, number] = destStation
    ? resolveMaritimeAccessPoint(destStation)
    : [mission.destination.lat, mission.destination.lon];

  // Check identical start/dest
  if (calculateDistanceNm(startPt[0], startPt[1], destPt[0], destPt[1]) < 0.1) {
    return [];
  }

  // Verify start and destination geographic classification
  const startClass = classifyGeographicLocation(startPt[0], startPt[1]);
  const destClass = classifyGeographicLocation(destPt[0], destPt[1]);

  if (startClass === 'LAND' || destClass === 'LAND' || startClass === 'ICE_SHELF' || destClass === 'ICE_SHELF') {
    return [];
  }

  // 3. Build Dynamic Water Grid
  const grid = buildDynamicWaterGrid(startPt, destPt);

  let uncertaintyMultiplier = activeScenarioModifier;
  if (decisionConfidence) {
    if (decisionConfidence.overallLevel === 'MEDIUM') uncertaintyMultiplier *= 1.15;
    else if (decisionConfidence.overallLevel === 'LOW') uncertaintyMultiplier *= 1.4;
    else if (decisionConfidence.overallLevel === 'CRITICAL') uncertaintyMultiplier *= 2.0;
  }

  // 4. Generate Objective-Specific Primary A* Paths
  const rawPathSafe = runGridAStar(
    grid.startNodeId,
    grid.endNodeId,
    grid.nodes,
    grid.adjList,
    'SAFE',
    icebergs,
    seaIceCells,
    weather,
    vessel,
    uncertaintyMultiplier
  );

  let rawPathBalanced = runGridAStar(
    grid.startNodeId,
    grid.endNodeId,
    grid.nodes,
    grid.adjList,
    'BALANCED',
    icebergs,
    seaIceCells,
    weather,
    vessel,
    uncertaintyMultiplier
  );

  let rawPathFast = runGridAStar(
    grid.startNodeId,
    grid.endNodeId,
    grid.nodes,
    grid.adjList,
    'FAST',
    icebergs,
    seaIceCells,
    weather,
    vessel,
    uncertaintyMultiplier
  );

  // Helper to build penalty map around a set of path waypoints
  const createCorridorPenaltyMap = (paths: [number, number][][], penaltyFactor: number = 4.0): Map<string, number> => {
    const pMap = new Map<string, number>();
    paths.forEach((path) => {
      for (let i = 0; i < path.length; i++) {
        const pt = path[i];
        grid.nodes.forEach((u) => {
          const d = calculateDistanceNm(u.lat, u.lon, pt[0], pt[1]);
          if (d < 30.0) {
            const neighbors = grid.adjList.get(u.id) || [];
            for (const edge of neighbors) {
              pMap.set(`${u.id}->${edge.targetId}`, penaltyFactor);
              pMap.set(`${edge.targetId}->${u.id}`, penaltyFactor);
            }
          }
        });
      }
    });
    return pMap;
  };

  // Enforce Route Diversity: If BALANCED is geometrically similar to SAFE, search secondary corridor
  if (rawPathSafe.length >= 2 && rawPathBalanced.length >= 2) {
    const simSB = calculateRouteSimilarity(rawPathSafe, rawPathBalanced, 15.0, 80.0);
    if (simSB.isGeometricallySimilar) {
      const penMapSafe = createCorridorPenaltyMap([rawPathSafe], 3.5);
      const altBalanced = runGridAStar(
        grid.startNodeId,
        grid.endNodeId,
        grid.nodes,
        grid.adjList,
        'BALANCED',
        icebergs,
        seaIceCells,
        weather,
        vessel,
        uncertaintyMultiplier,
        penMapSafe
      );
      if (altBalanced.length >= 2) {
        rawPathBalanced = altBalanced;
      }
    }
  }

  // Enforce Route Diversity: If FAST is geometrically similar to SAFE or BALANCED, search tertiary corridor
  if (rawPathSafe.length >= 2 && rawPathFast.length >= 2) {
    const simSF = calculateRouteSimilarity(rawPathSafe, rawPathFast, 15.0, 80.0);
    const simBF = rawPathBalanced.length >= 2 ? calculateRouteSimilarity(rawPathBalanced, rawPathFast, 15.0, 80.0) : { isGeometricallySimilar: false };

    if (simSF.isGeometricallySimilar || simBF.isGeometricallySimilar) {
      const penMapBoth = createCorridorPenaltyMap([rawPathSafe, rawPathBalanced], 4.0);
      const altFast = runGridAStar(
        grid.startNodeId,
        grid.endNodeId,
        grid.nodes,
        grid.adjList,
        'FAST',
        icebergs,
        seaIceCells,
        weather,
        vessel,
        uncertaintyMultiplier,
        penMapBoth
      );
      if (altFast.length >= 2) {
        rawPathFast = altFast;
      }
    }
  }

  const candidateRawMap: { id: 'safest' | 'balanced' | 'fastest'; raw: [number, number][] }[] = [
    { id: 'safest', raw: rawPathSafe },
    { id: 'balanced', raw: rawPathBalanced },
    { id: 'fastest', raw: rawPathFast },
  ];

  // 5. Densify & Validate 100% Water Safety against antarcticGeographicMask
  interface ValidatedCorridor {
    id: 'safest' | 'balanced' | 'fastest';
    waypoints: [number, number][];
  }

  const validatedCorridors: ValidatedCorridor[] = [];

  for (const candItem of candidateRawMap) {
    const rawPath = candItem.raw;
    if (!rawPath || rawPath.length < 2) continue;

    const fullWaypoints: [number, number][] = [];

    if (startStation && startStation.isCoastal) {
      const origStart: [number, number] = [mission.startLocation.lat, mission.startLocation.lon];
      const checkStart = segmentIntersectsProhibitedGeography(origStart, rawPath[0]);
      if (!checkStart.intersects) fullWaypoints.push(origStart);
    }

    // Densify
    for (let i = 0; i < rawPath.length - 1; i++) {
      const sub = interpolateSubsegment(rawPath[i], rawPath[i + 1], 20);
      if (i > 0) sub.shift();
      fullWaypoints.push(...sub);
    }

    if (destStation && destStation.isCoastal) {
      const origDest: [number, number] = [mission.destination.lat, mission.destination.lon];
      const checkEnd = segmentIntersectsProhibitedGeography(fullWaypoints[fullWaypoints.length - 1], origDest);
      if (!checkEnd.intersects) fullWaypoints.push(origDest);
    }

    const valResult = validateMaritimeRouteGeometry(fullWaypoints);
    if (valResult.isValid && valResult.landIntersectionsCount === 0 && valResult.iceShelfIntersectionsCount === 0) {
      validatedCorridors.push({ id: candItem.id, waypoints: fullWaypoints });
    }
  }

  if (validatedCorridors.length === 0) {
    return []; // ROUTE UNAVAILABLE
  }

  // 6. Evaluate Environmental Metrics for Each Corridor
  interface EvaluatedCorridor {
    id: 'safest' | 'balanced' | 'fastest';
    waypoints: [number, number][];
    distanceNm: number;
    etaHours: number;
    fuelTons: number;
    riskIndex: number;
    uncertaintyScore: number;
    confidence: RouteAlternative['confidence'];
    hazardsCount: number;
    hazardSummary: string[];
    maxSeaIceConc: number;
    safestCost: number;
    balancedCost: number;
    fastestCost: number;
    resilienceScore: number;
    geometryHash: string;
  }

  const evaluatedList: EvaluatedCorridor[] = [];

  for (const corr of validatedCorridors) {
    const waypoints = corr.waypoints;
    const valResult = validateMaritimeRouteGeometry(waypoints);
    let distanceNm = valResult.totalDistanceNm;
    let totalRiskSum = 0;
    let totalUncertaintySum = 0;
    let evalPointsCount = 0;
    let maxSeaIceConc = 0;
    const hazardSummary: string[] = [];

    for (let i = 0; i < waypoints.length - 1; i++) {
      const p1 = waypoints[i];
      const p2 = waypoints[i + 1];
      const segDist = calculateDistanceNm(p1[0], p1[1], p2[0], p2[1]);

      const samples = Math.max(2, Math.ceil(segDist / 15));
      for (let s = 0; s <= samples; s++) {
        const frac = s / samples;
        const lat = p1[0] + (p2[0] - p1[0]) * frac;
        const lon = p1[1] + (p2[1] - p1[1]) * frac;

        const evalPoint = evaluatePointRisk(
          lat,
          lon,
          icebergs,
          seaIceCells,
          weather,
          vessel,
          uncertaintyMultiplier
        );

        totalRiskSum += evalPoint.totalRisk;
        totalUncertaintySum += evalPoint.uncertaintyRisk;
        if (evalPoint.localSeaIceConcentration > maxSeaIceConc) {
          maxSeaIceConc = evalPoint.localSeaIceConcentration;
        }
        evalPointsCount++;

        if (evalPoint.nearestIcebergDistanceNm < 3.5 && !hazardSummary.includes('Proximate Iceberg Zone')) {
          hazardSummary.push(`Proximate Iceberg Zone (<${evalPoint.nearestIcebergDistanceNm} nm)`);
        }
        if (evalPoint.localSeaIceConcentration > 65 && !hazardSummary.includes('Consolidated Pack Ice Lead')) {
          hazardSummary.push(`Consolidated Pack Ice Lead (${evalPoint.localSeaIceConcentration}%)`);
        }
      }
    }

    const avgRisk = Math.round(totalRiskSum / Math.max(1, evalPointsCount));
    const avgUncertainty = Math.round(totalUncertaintySum / Math.max(1, evalPointsCount));

    const vesselSpeed = vessel.cruisingSpeedKnots;
    // Calculate speed adjustments for FAST vs SAFE vs BALANCED
    const speedFactor = corr.id === 'fastest' ? 1.08 : corr.id === 'safest' ? 0.92 : 1.0;
    const effectiveSpeed = Math.max(1, vesselSpeed * speedFactor);
    const etaHours = Number((distanceNm / effectiveSpeed).toFixed(1));
    const fuelConsumptionDaily = vessel.fuelConsumptionTonsPerDay;
    const fuelTons = Number(((etaHours / 24) * fuelConsumptionDaily * (corr.id === 'fastest' ? 1.15 : corr.id === 'safest' ? 0.95 : 1.0)).toFixed(1));

    let confidence: RouteAlternative['confidence'] = decisionConfidence ? decisionConfidence.overallLevel : 'HIGH';
    if (!decisionConfidence) {
      if (avgUncertainty > 45 || avgRisk > 65) confidence = 'CRITICAL';
      else if (avgUncertainty > 30 || avgRisk > 45) confidence = 'LOW';
      else if (avgUncertainty > 18) confidence = 'MEDIUM';
    }

    let hazardsCount = 0;
    for (const berg of icebergs) {
      const cpa = calculateIcebergCPA(waypoints, berg, vesselSpeed);
      if (cpa.distanceNm < 6.0) hazardsCount++;
    }

    const safestCost = 0.1 * (distanceNm / 10) + 0.45 * avgRisk + 0.25 * avgUncertainty + hazardsCount * 5;
    const balancedCost = 0.2 * (distanceNm / 10) + 0.2 * fuelTons + 0.2 * etaHours + 0.25 * avgRisk + 0.15 * avgUncertainty;
    const fastestCost = 0.35 * (distanceNm / 10) + 0.3 * etaHours + 0.25 * fuelTons + 0.08 * avgRisk;

    const geometryHash = generateGeometryHash(waypoints);

    evaluatedList.push({
      id: corr.id,
      waypoints,
      distanceNm,
      etaHours,
      fuelTons,
      riskIndex: Math.min(100, Math.max(1, avgRisk)),
      uncertaintyScore: Math.min(100, Math.max(1, avgUncertainty)),
      confidence,
      hazardsCount,
      hazardSummary,
      maxSeaIceConc,
      safestCost,
      balancedCost,
      fastestCost,
      resilienceScore: Math.max(50, Math.min(98, 100 - avgRisk * 0.5 - avgUncertainty * 0.3)),
      geometryHash,
    });
  }

  // 7. Map to the 3 Route Alternatives (SAFE, BALANCED, FAST)
  const safestCand = evaluatedList.find((e) => e.id === 'safest') || evaluatedList[0];
  const balancedCand = evaluatedList.find((e) => e.id === 'balanced') || evaluatedList[1] || evaluatedList[0];
  const fastestCand = evaluatedList.find((e) => e.id === 'fastest') || evaluatedList[2] || evaluatedList[0];

  const cands: {
    id: 'safest' | 'balanced' | 'fastest';
    routeId: string;
    name: string;
    type: 'SAFE' | 'BALANCED' | 'FAST';
    color: string;
    cand: EvaluatedCorridor;
    label: 'SAFEST' | 'BALANCED' | 'FASTEST';
  }[] = [
    {
      id: 'safest',
      routeId: 'ROUTE-001',
      name: 'Outer Oceanic Deep-Water Corridor (Safest)',
      type: 'SAFE',
      color: '#10b981',
      cand: safestCand,
      label: 'SAFEST',
    },
    {
      id: 'balanced',
      routeId: 'ROUTE-002',
      name: 'Coastal Passage Corridor (Balanced)',
      type: 'BALANCED',
      color: '#0ea5e9',
      cand: balancedCand,
      label: 'BALANCED',
    },
    {
      id: 'fastest',
      routeId: 'ROUTE-003',
      name: 'Direct Open-Sea Highway (Fastest)',
      type: 'FAST',
      color: '#f59e0b',
      cand: fastestCand,
      label: 'FASTEST',
    },
  ];

  const results: RouteAlternative[] = [];

  for (const c of cands) {
    const e = c.cand;
    const isLowConf = decisionConfidence?.overallLevel === 'LOW';
    const isRecThis = isLowConf ? c.id === 'safest' : c.id === 'balanced';

    results.push({
      id: c.id,
      routeId: c.routeId,
      name: c.name,
      type: c.type,
      color: c.color,
      waypoints: e.waypoints,
      distanceNm: e.distanceNm,
      etaHours: e.etaHours,
      fuelTons: e.fuelTons,
      riskIndex: e.riskIndex,
      uncertaintyScore: e.uncertaintyScore,
      confidence: e.confidence,
      hazardsCount: e.hazardsCount,
      hazardSummary: e.hazardSummary,
      assumptions: [
        `Vessel cruising speed: ${vessel.cruisingSpeedKnots} knots (${c.name})`,
        `Max sea-ice concentration: ${e.maxSeaIceConc}% (Limit: ${vessel.maxSeaIceConcentrationPercent}%)`,
      ],
      constraintsSatisfied: e.maxSeaIceConc <= vessel.maxSeaIceConcentrationPercent,
      isRecommended: isRecThis,
      recommendationRationale: isRecThis
        ? (isLowConf
            ? 'RECOMMENDED: Elevated environmental uncertainty steers vessel recommendation to Safest Corridor.'
            : `RECOMMENDED: Optimal balance between travel time (${e.etaHours}h) and navigational risk index (${e.riskIndex}/100).`)
        : `Calculated under ${c.label} cost optimization parameters along valid open water.`,
      resilienceScore: e.resilienceScore,
      labels: [c.label],
      geometryHash: e.geometryHash,
      costBreakdown: {
        distanceCost: Number((0.2 * (e.distanceNm / 10)).toFixed(1)),
        fuelCost: Number((0.2 * e.fuelTons).toFixed(1)),
        timeCost: Number((0.2 * e.etaHours).toFixed(1)),
        riskCost: Number((0.25 * e.riskIndex).toFixed(1)),
        uncertaintyCost: Number((0.15 * e.uncertaintyScore).toFixed(1)),
        totalCost: Number((c.id === 'safest' ? e.safestCost : c.id === 'balanced' ? e.balancedCost : e.fastestCost).toFixed(1)),
      },
    });
  }

  // Handle recommendation block / confidence penalties
  const isBlocked = Boolean(decisionConfidence?.isRecommendationBlocked || decisionConfidence?.overallLevel === 'CRITICAL');
  const applyPenalty = decisionConfidence?.overallLevel === 'LOW' || decisionConfidence?.overallLevel === 'CRITICAL';

  return results.map((r) => ({
    ...r,
    isRecommended: isBlocked ? false : r.isRecommended,
    isRecommendationBlocked: isBlocked,
    uncertaintyPenaltyApplied: applyPenalty,
    recommendationRationale: isBlocked
      ? 'NAVIGATION RECOMMENDATION BLOCKED: High environmental uncertainty or insufficient real observation data blocks route recommendation.'
      : r.recommendationRationale,
  }));
}

