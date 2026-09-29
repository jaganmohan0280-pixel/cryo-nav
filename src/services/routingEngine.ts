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
  isNavigableOceanPoint,
  segmentIsNavigableWater,
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
  vessel?: VesselProfile,
  seaIceCells?: SeaIceCell[]
): RouteGeometryValidationResult {
  const maxIce = vessel?.maxSeaIceConcentrationPercent !== undefined ? Math.min(15, vessel.maxSeaIceConcentrationPercent) : 15;
  const geoResult = validateMaritimeRouteGeometry(waypoints, undefined, undefined, seaIceCells, maxIce);
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
 * Dynamic Region-Based Water Navigation Grid Generator with Sea-Ice Avoidance & Fast Indexing
 */
function buildDynamicWaterGrid(
  startPt: [number, number],
  endPt: [number, number],
  seaIceCells?: SeaIceCell[],
  maxSeaIceThreshold: number = 15
): {
  nodes: GridNode[];
  adjList: Map<string, { targetId: string; distanceNm: number }[]>;
  startNodeId: string;
  endNodeId: string;
} {
  const voyageDist = calculateDistanceNm(startPt[0], startPt[1], endPt[0], endPt[1]);

  // 1. Calculate bounding region
  let minLat = Math.min(startPt[0], endPt[0]) - 3.0;
  let maxLat = Math.max(startPt[0], endPt[0]) + 3.0;
  let minLon = Math.min(startPt[1], endPt[1]) - 8.0;
  let maxLon = Math.max(startPt[1], endPt[1]) + 8.0;

  if (Math.abs(startPt[1] - endPt[1]) > 90) {
    minLat = -75.0;
    maxLat = -55.0;
    minLon = -180.0;
    maxLon = 180.0;
  } else {
    minLat = Math.max(-85.0, minLat);
    maxLat = Math.min(-50.0, maxLat);
  }

  // If voyage crosses or approaches the Antarctic Peninsula
  const isPeninsulaVoyage =
    (minLon < -50 && maxLon > -75) ||
    (startPt[1] < -60 && endPt[1] > -58) ||
    (startPt[1] > -58 && endPt[1] < -60) ||
    (startPt[0] < -62 && endPt[0] < -62 && Math.abs(startPt[1] - endPt[1]) > 4);

  if (isPeninsulaVoyage) {
    maxLat = Math.min(-50.0, Math.max(maxLat, -58.0)); // Expand north into Drake Passage
    minLon = Math.min(minLon, -76.0);
    maxLon = Math.max(maxLon, -50.0);
  }

  const nodesMap = new Map<string, GridNode>();

  const startId = 'start-node';
  const endId = 'end-node';
  nodesMap.set(startId, { id: startId, lat: startPt[0], lon: startPt[1] });
  nodesMap.set(endId, { id: endId, lat: endPt[0], lon: endPt[1] });

  // Adaptive step sizes
  let latStep = 0.25;
  let lonStep = 0.6;
  if (voyageDist > 1500) {
    latStep = 0.5;
    lonStep = 1.2;
  } else if (voyageDist > 800) {
    latStep = 0.35;
    lonStep = 0.8;
  }

  for (let lat = minLat; lat <= maxLat; lat += latStep) {
    for (let lon = minLon; lon <= maxLon; lon += lonStep) {
      const curLat = Number(lat.toFixed(3));
      const curLon = Number(lon.toFixed(3));
      const isNav = isNavigableOceanPoint(curLat, curLon, seaIceCells, maxSeaIceThreshold);
      if (isNav) {
        const id = `grid-${curLat}_${curLon}`;
        nodesMap.set(id, { id, lat: curLat, lon: curLon });
      }
    }
  }

  const nodes = Array.from(nodesMap.values());
  const adjList = new Map<string, { targetId: string; distanceNm: number }[]>();
  nodes.forEach((n) => adjList.set(n.id, []));

  const MAX_NEIGHBOR_DIST_NM = voyageDist > 1500 ? 90.0 : voyageDist > 800 ? 60.0 : 45.0;

  // 2. Build spatial bucket index for regular grid nodes (excluding start/end)
  const bucketSizeLat = 1.0;
  const bucketSizeLon = 2.0;
  const spatialBuckets = new Map<string, GridNode[]>();

  const regularGridNodes = nodes.filter((n) => n.id !== startId && n.id !== endId);

  regularGridNodes.forEach((node) => {
    const bLat = Math.floor(node.lat / bucketSizeLat);
    const bLon = Math.floor(node.lon / bucketSizeLon);
    const key = `${bLat}_${bLon}`;
    if (!spatialBuckets.has(key)) spatialBuckets.set(key, []);
    spatialBuckets.get(key)!.push(node);
  });

  // 3. Connect regular grid nodes to each other
  regularGridNodes.forEach((u) => {
    const uBucketLat = Math.floor(u.lat / bucketSizeLat);
    const uBucketLon = Math.floor(u.lon / bucketSizeLon);

    for (let dLat = -2; dLat <= 2; dLat++) {
      for (let dLon = -2; dLon <= 2; dLon++) {
        const key = `${uBucketLat + dLat}_${uBucketLon + dLon}`;
        const bucketNodes = spatialBuckets.get(key);
        if (!bucketNodes) continue;

        for (let j = 0; j < bucketNodes.length; j++) {
          const v = bucketNodes[j];
          if (u.id >= v.id) continue; // avoid duplicate bidirectional checks

          const dist = calculateDistanceNm(u.lat, u.lon, v.lat, v.lon);
          if (dist <= MAX_NEIGHBOR_DIST_NM) {
            const check = segmentIsNavigableWater([u.lat, u.lon], [v.lat, v.lon], seaIceCells, maxSeaIceThreshold);
            if (check.isNavigable) {
              adjList.get(u.id)?.push({ targetId: v.id, distanceNm: dist });
              adjList.get(v.id)?.push({ targetId: u.id, distanceNm: dist });
            }
          }
        }
      }
    }
  });

  // 4. Connect startNode and endNode to all nearby navigable grid nodes (or each other if direct)
  const terminalNodes = [nodesMap.get(startId)!, nodesMap.get(endId)!];
  terminalNodes.forEach((termNode) => {
    if (!termNode) return;
    const searchRadiusNm = Math.max(MAX_NEIGHBOR_DIST_NM, 150.0); // generous search radius for terminal access

    nodes.forEach((target) => {
      if (termNode.id === target.id) return;
      const dist = calculateDistanceNm(termNode.lat, termNode.lon, target.lat, target.lon);
      if (dist <= searchRadiusNm) {
        const check = segmentIsNavigableWater([termNode.lat, termNode.lon], [target.lat, target.lon], seaIceCells, maxSeaIceThreshold);
        if (check.isNavigable) {
          adjList.get(termNode.id)?.push({ targetId: target.id, distanceNm: dist });
          adjList.get(target.id)?.push({ targetId: termNode.id, distanceNm: dist });
        }
      }
    });
  });

  return { nodes, adjList, startNodeId: startId, endNodeId: endId };
}

/**
 * A* Pathfinding on Water Grid
 */
function runGridAStar(
  startId: string,
  endId: string,
  nodes: GridNode[],
  adjList: Map<string, { targetId: string; distanceNm: number }[]>,
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

    for (const edge of neighbors) {
      const vNode = nodeMap.get(edge.targetId);
      if (!vNode) continue;

      let edgeCost = edge.distanceNm;
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
        lower.includes(s.name.toLowerCase()) ||
        lower.includes(s.shortName.toLowerCase()) ||
        s.name.toLowerCase().includes(lower)
    );
    if (st) return st;
  }

  return AUTHORITATIVE_RESEARCH_STATIONS.find(
    (s) => Math.abs(s.lat - lat) < 0.3 && Math.abs(s.lon - lon) < 0.3
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
  const startPt: [number, number] = startStation?.maritimeAccessPoint
    ? startStation.maritimeAccessPoint
    : [mission.startLocation.lat, mission.startLocation.lon];

  const destPt: [number, number] = destStation?.maritimeAccessPoint
    ? destStation.maritimeAccessPoint
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

  // 3. Build Dynamic Water Grid with Sea-Ice Avoidance
  const maxIceThreshold = vessel.maxSeaIceConcentrationPercent !== undefined ? Math.min(15, vessel.maxSeaIceConcentrationPercent) : 15;
  const grid = buildDynamicWaterGrid(startPt, destPt, seaIceCells, maxIceThreshold);

  const rawCandidatePaths: [number, number][][] = [];

  // Candidate 1: Primary A* Path
  const path1 = runGridAStar(grid.startNodeId, grid.endNodeId, grid.nodes, grid.adjList);
  if (path1.length >= 2) {
    rawCandidatePaths.push(path1);

    // Candidate 2: Penalize Path 1 corridor to search for alternative corridor
    const penaltyMap1 = new Map<string, number>();
    for (let i = 0; i < path1.length; i++) {
      const p1 = path1[i];
      grid.nodes.forEach((u) => {
        const d = calculateDistanceNm(u.lat, u.lon, p1[0], p1[1]);
        if (d < 25.0) {
          const neighbors = grid.adjList.get(u.id) || [];
          for (const edge of neighbors) {
            penaltyMap1.set(`${u.id}->${edge.targetId}`, 4.0);
            penaltyMap1.set(`${edge.targetId}->${u.id}`, 4.0);
          }
        }
      });
    }

    const path2 = runGridAStar(grid.startNodeId, grid.endNodeId, grid.nodes, grid.adjList, penaltyMap1);
    if (path2.length >= 2) {
      rawCandidatePaths.push(path2);

      // Candidate 3: Penalize Path 1 & Path 2 corridors for tertiary search
      const penaltyMap2 = new Map<string, number>(penaltyMap1);
      for (let i = 0; i < path2.length; i++) {
        const p1 = path2[i];
        grid.nodes.forEach((u) => {
          const d = calculateDistanceNm(u.lat, u.lon, p1[0], p1[1]);
          if (d < 25.0) {
            const neighbors = grid.adjList.get(u.id) || [];
            for (const edge of neighbors) {
              penaltyMap2.set(`${u.id}->${edge.targetId}`, 4.0);
              penaltyMap2.set(`${edge.targetId}->${u.id}`, 4.0);
            }
          }
        });
      }

      const path3 = runGridAStar(grid.startNodeId, grid.endNodeId, grid.nodes, grid.adjList, penaltyMap2);
      if (path3.length >= 2) {
        rawCandidatePaths.push(path3);
      }
    }
  }

  if (rawCandidatePaths.length === 0) {
    return []; // ROUTE UNAVAILABLE
  }

  // 4. Densify & Validate 100% Water Safety against antarcticGeographicMask & seaIceCells
  const validatedCandidates: [number, number][][] = [];

  for (const rawPath of rawCandidatePaths) {
    const fullWaypoints: [number, number][] = [];

    // Densify vessel route
    for (let i = 0; i < rawPath.length - 1; i++) {
      const sub = interpolateSubsegment(rawPath[i], rawPath[i + 1], 20);
      if (i > 0) sub.shift();
      fullWaypoints.push(...sub);
    }

    const origStart: [number, number] = [mission.startLocation.lat, mission.startLocation.lon];
    const origDest: [number, number] = [mission.destination.lat, mission.destination.lon];

    const checkStart = segmentIsNavigableWater(origStart, fullWaypoints[0], seaIceCells, maxIceThreshold);
    if (checkStart.isNavigable) {
      fullWaypoints.unshift(origStart);
    }

    const checkEnd = segmentIsNavigableWater(fullWaypoints[fullWaypoints.length - 1], origDest, seaIceCells, maxIceThreshold);
    if (checkEnd.isNavigable) {
      fullWaypoints.push(origDest);
    }

    const valResult = validateMaritimeRouteGeometry(fullWaypoints, undefined, undefined, seaIceCells, maxIceThreshold);
    if (valResult.isValid && valResult.landIntersectionsCount === 0 && valResult.iceShelfIntersectionsCount === 0 && (valResult.seaIceIntersectionsCount || 0) === 0) {
      validatedCandidates.push(fullWaypoints);
    }
  }

  if (validatedCandidates.length === 0) {
    return [];
  }

  // 5. Apply Route Diversity Filtering & Deduplicate Similar Geometries
  const distinctCorridors: [number, number][][] = [];
  for (const candidate of validatedCandidates) {
    let isDuplicate = false;
    for (const existing of distinctCorridors) {
      const sim = calculateRouteSimilarity(candidate, existing, 18.0, 85.0);
      if (sim.isGeometricallySimilar) {
        isDuplicate = true;
        break;
      }
    }
    if (!isDuplicate) {
      distinctCorridors.push(candidate);
    }
  }

  // 6. Evaluate Environmental Metrics for Each Corridor
  let uncertaintyMultiplier = activeScenarioModifier;
  if (decisionConfidence) {
    if (decisionConfidence.overallLevel === 'MEDIUM') uncertaintyMultiplier *= 1.15;
    else if (decisionConfidence.overallLevel === 'LOW') uncertaintyMultiplier *= 1.4;
    else if (decisionConfidence.overallLevel === 'CRITICAL') uncertaintyMultiplier *= 2.0;
  }

  interface EvaluatedCorridor {
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
    evalPointsCount: number;
    safestCost: number;
    balancedCost: number;
    fastestCost: number;
    resilienceScore: number;
    geometryHash: string;
  }

  const evaluatedList: EvaluatedCorridor[] = [];

  for (const waypoints of distinctCorridors) {
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
    const etaHours = Number((distanceNm / Math.max(1, vesselSpeed)).toFixed(1));
    const fuelConsumptionDaily = vessel.fuelConsumptionTonsPerDay;
    const fuelTons = Number(((etaHours / 24) * fuelConsumptionDaily).toFixed(1));

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
      evalPointsCount,
      safestCost,
      balancedCost,
      fastestCost,
      resilienceScore: Math.max(50, Math.min(98, 100 - avgRisk * 0.5 - avgUncertainty * 0.3)),
      geometryHash,
    });
  }

  // 7. Assign Optimization Labels & Merged Route Alternatives
  const results: RouteAlternative[] = [];

  if (evaluatedList.length === 1) {
    const e = evaluatedList[0];
    const constraintsSatisfied = e.maxSeaIceConc <= vessel.maxSeaIceConcentrationPercent;

    const isLowConf = decisionConfidence?.overallLevel === 'LOW';
    results.push({
      id: isLowConf ? 'safest' : 'balanced',
      routeId: 'ROUTE-001',
      name: isLowConf ? 'Safest Maritime Corridor' : 'Unified Valid Maritime Corridor',
      type: isLowConf ? 'SAFE' : 'BALANCED',
      color: isLowConf ? '#10b981' : '#0ea5e9',
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
        `Vessel cruising speed: ${vessel.cruisingSpeedKnots} knots`,
        `Max sea-ice concentration: ${e.maxSeaIceConc}% (Limit: ${vessel.maxSeaIceConcentrationPercent}%)`,
      ],
      constraintsSatisfied,
      isRecommended: true,
      recommendationRationale: isLowConf
        ? 'RECOMMENDED: Elevated environmental uncertainty steers vessel recommendation to Safest Corridor.'
        : 'All optimization objectives (SAFEST, BALANCED, FASTEST) converge on the same maritime corridor under current constraints.',
      resilienceScore: e.resilienceScore,
      labels: ['SAFEST', 'BALANCED', 'FASTEST'],
      geometryHash: e.geometryHash,
      costBreakdown: {
        distanceCost: Number((0.2 * (e.distanceNm / 10)).toFixed(1)),
        fuelCost: Number((0.2 * e.fuelTons).toFixed(1)),
        timeCost: Number((0.2 * e.etaHours).toFixed(1)),
        riskCost: Number((0.25 * e.riskIndex).toFixed(1)),
        uncertaintyCost: Number((0.15 * e.uncertaintyScore).toFixed(1)),
        totalCost: Number(e.balancedCost.toFixed(1)),
      },
    });
  } else if (evaluatedList.length === 2) {
    const e1 = evaluatedList[0];
    const e2 = evaluatedList[1];

    const r1IsSafer = e1.safestCost <= e2.safestCost;
    const safeCorridor = r1IsSafer ? e1 : e2;
    const fastCorridor = r1IsSafer ? e2 : e1;

    results.push({
      id: 'safest',
      routeId: 'ROUTE-001',
      name: 'Safest & Balanced Oceanic Corridor',
      type: 'SAFE',
      color: '#10b981',
      waypoints: safeCorridor.waypoints,
      distanceNm: safeCorridor.distanceNm,
      etaHours: safeCorridor.etaHours,
      fuelTons: safeCorridor.fuelTons,
      riskIndex: safeCorridor.riskIndex,
      uncertaintyScore: safeCorridor.uncertaintyScore,
      confidence: safeCorridor.confidence,
      hazardsCount: safeCorridor.hazardsCount,
      hazardSummary: safeCorridor.hazardSummary,
      assumptions: [
        `Vessel cruising speed: ${vessel.cruisingSpeedKnots} knots`,
        `Max sea-ice concentration: ${safeCorridor.maxSeaIceConc}%`,
      ],
      constraintsSatisfied: safeCorridor.maxSeaIceConc <= vessel.maxSeaIceConcentrationPercent,
      isRecommended: true,
      recommendationRationale: 'RECOMMENDED: Primary maritime corridor offering lowest environmental risk.',
      resilienceScore: safeCorridor.resilienceScore,
      labels: ['SAFEST', 'BALANCED'],
      geometryHash: safeCorridor.geometryHash,
      costBreakdown: {
        distanceCost: Number((0.1 * (safeCorridor.distanceNm / 10)).toFixed(1)),
        fuelCost: Number((0.1 * safeCorridor.fuelTons).toFixed(1)),
        timeCost: Number((0.1 * safeCorridor.etaHours).toFixed(1)),
        riskCost: Number((0.45 * safeCorridor.riskIndex).toFixed(1)),
        uncertaintyCost: Number((0.25 * safeCorridor.uncertaintyScore).toFixed(1)),
        totalCost: Number(safeCorridor.safestCost.toFixed(1)),
      },
    });

    results.push({
      id: 'fastest',
      routeId: 'ROUTE-002',
      name: 'Direct Fast Coastal Highway',
      type: 'FAST',
      color: '#f59e0b',
      waypoints: fastCorridor.waypoints,
      distanceNm: fastCorridor.distanceNm,
      etaHours: fastCorridor.etaHours,
      fuelTons: fastCorridor.fuelTons,
      riskIndex: fastCorridor.riskIndex,
      uncertaintyScore: fastCorridor.uncertaintyScore,
      confidence: fastCorridor.confidence,
      hazardsCount: fastCorridor.hazardsCount,
      hazardSummary: fastCorridor.hazardSummary,
      assumptions: [
        `Vessel cruising speed: ${vessel.cruisingSpeedKnots} knots`,
        `Max sea-ice concentration: ${fastCorridor.maxSeaIceConc}%`,
      ],
      constraintsSatisfied: fastCorridor.maxSeaIceConc <= vessel.maxSeaIceConcentrationPercent,
      isRecommended: false,
      recommendationRationale: 'Direct coastal track prioritizing minimum ETA while avoiding land hazards.',
      resilienceScore: fastCorridor.resilienceScore,
      labels: ['FASTEST'],
      geometryHash: fastCorridor.geometryHash,
      costBreakdown: {
        distanceCost: Number((0.35 * (fastCorridor.distanceNm / 10)).toFixed(1)),
        fuelCost: Number((0.25 * fastCorridor.fuelTons).toFixed(1)),
        timeCost: Number((0.3 * fastCorridor.etaHours).toFixed(1)),
        riskCost: Number((0.08 * fastCorridor.riskIndex).toFixed(1)),
        uncertaintyCost: Number((0.02 * fastCorridor.uncertaintyScore).toFixed(1)),
        totalCost: Number(fastCorridor.fastestCost.toFixed(1)),
      },
    });
  } else {
    const sortedByRisk = [...evaluatedList].sort((a, b) => a.safestCost - b.safestCost);
    const sortedByTime = [...evaluatedList].sort((a, b) => a.fastestCost - b.fastestCost);

    const safestCand = sortedByRisk[0];
    const fastestCand = sortedByTime[0] !== safestCand ? sortedByTime[0] : sortedByTime[1] || evaluatedList[1];
    const balancedCand = evaluatedList.find((e) => e !== safestCand && e !== fastestCand) || evaluatedList[0];

    const cands: { id: 'safest' | 'balanced' | 'fastest'; name: string; type: 'SAFE' | 'BALANCED' | 'FAST'; color: string; cand: EvaluatedCorridor; label: 'SAFEST' | 'BALANCED' | 'FASTEST' }[] = [
      { id: 'safest', name: 'Outer Oceanic Deep-Water Corridor (Safest)', type: 'SAFE', color: '#10b981', cand: safestCand, label: 'SAFEST' },
      { id: 'balanced', name: 'Coastal Research Passage Corridor (Balanced)', type: 'BALANCED', color: '#0ea5e9', cand: balancedCand, label: 'BALANCED' },
      { id: 'fastest', name: 'Direct Coastal Geodesic Track (Fastest)', type: 'FAST', color: '#f59e0b', cand: fastestCand, label: 'FASTEST' },
    ];

    let idx = 1;
    for (const c of cands) {
      const e = c.cand;
      const isLowConf = decisionConfidence?.overallLevel === 'LOW';
      const isRecThis = isLowConf ? c.id === 'safest' : c.id === 'balanced';

      results.push({
        id: c.id,
        routeId: `ROUTE-00${idx++}`,
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
          `Max sea-ice concentration: ${e.maxSeaIceConc}%`,
        ],
        constraintsSatisfied: e.maxSeaIceConc <= vessel.maxSeaIceConcentrationPercent,
        isRecommended: isRecThis,
        recommendationRationale: isRecThis
          ? (isLowConf
              ? 'RECOMMENDED: Elevated environmental uncertainty steers vessel recommendation to Safest Corridor.'
              : `RECOMMENDED: Optimal balance between travel time (${e.etaHours}h) and navigational risk index (${e.riskIndex}/100).`)
          : `Distinct corridor evaluated under ${c.label} cost optimization parameters.`,
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
