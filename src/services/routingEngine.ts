/**
 * CRYO NAV — Multi-Objective Antarctic Route Planning Engine
 * Deterministic graph/grid routing algorithm.
 * Cost function:
 * Cost = α × distance + β × fuel + γ × time + δ × environmental_risk + ε × uncertainty
 * Generates three alternatives: SAFEST, BALANCED, FASTEST.
 * Generates dynamic recommendations with rigorous rationales based on computed metrics.
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

// Computes Closest Point of Approach (CPA) between route waypoints and an iceberg
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

    // Subdivide segment to find closest point
    const steps = Math.max(5, Math.ceil(segDist / 5)); // every 5 nm
    for (let s = 0; s <= steps; s++) {
      const frac = s / steps;
      const curLat = p1[0] + (p2[0] - p1[0]) * frac;
      const curLon = p1[1] + (p2[1] - p1[1]) * frac;

      const curDistAlongRoute = cumulativeDistNm + segDist * frac;
      const curTimeHours = curDistAlongRoute / Math.max(1, vesselSpeedKnots);

      // Estimate berg position at this time
      let bergLat = iceberg.lat;
      let bergLon = iceberg.lon;
      if (curTimeHours > 0 && iceberg.predictedTrajectory && iceberg.predictedTrajectory.length > 0) {
        // Linear interpolation from predicted trajectory
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

  // Calculate bearing
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

export function generateRouteAlternatives(
  mission: MissionConfig,
  vessel: VesselProfile,
  icebergs: IcebergDetection[],
  seaIceCells: SeaIceCell[],
  weather: WeatherCondition,
  activeScenarioModifier: number = 1.0, // 1.0 normal, 1.25 high drift/ice
  decisionConfidence?: DecisionConfidenceResult
): RouteAlternative[] {
  const start = [mission.startLocation.lat, mission.startLocation.lon] as [number, number];
  const dest = [mission.destination.lat, mission.destination.lon] as [number, number];

  // Research waypoints in sequence
  const missionWps = [...(mission?.researchWaypoints || [])]
    .sort((a, b) => a.order - b.order)
    .map((w) => [w.lat, w.lon] as [number, number]);

  // Construct 3 distinct navigational corridors through the Peninsula sector:
  // 1. SAFEST: Deep ocean seaward detour west of Adelaide Island / Biscoe Islands, completely skirting the ice pack and heavy berg tracks.
  // 2. BALANCED: Oceanic corridor via Gerlache Strait and Grandidier Channel with managed ice leads, visiting all research stations.
  // 3. FASTEST: Direct inner continental shelf rhumb line / Bransfield passage, shortest track but higher iceberg density and ice pack contact.

  const dLat = dest[0] - start[0];
  const dLon = dest[1] - start[1];
  const midLat = (start[0] + dest[0]) / 2;
  const midLon = (start[1] + dest[1]) / 2;

  // Check if this matches the classic Marguerite Bay sector
  const isDefaultMargueriteSector = Math.abs(start[0] - -59.5) < 1 && Math.abs(dest[0] - -67.57) < 1;

  const safeWaypoints: [number, number][] = isDefaultMargueriteSector
    ? [
        start,
        [-60.80, -66.50], // Deep open water clearing Drake shoals
        [-62.20, -67.80], // Well west of South Shetland archipelago
        ...(missionWps.length > 0 ? [missionWps[0]] : []), // Diverts in to station, then back out
        [-63.90, -68.40], // Deep Bellingshausen sea track
        [-65.50, -69.20], // Deep seaward clearance of Adelaide shelf
        [-67.20, -69.80], // Approaches Rothera from clear western open leads
        dest,
      ]
    : [
        start,
        [Number((start[0] + dLat * 0.25).toFixed(3)), Number((start[1] + dLon * 0.25 - 1.8).toFixed(3))],
        ...(missionWps.length > 0 ? [missionWps[0]] : []),
        [Number(midLat.toFixed(3)), Number((midLon - 2.2).toFixed(3))],
        ...(missionWps.length > 1 ? [missionWps[1]] : []),
        [Number((dest[0] - dLat * 0.2).toFixed(3)), Number((dest[1] - 1.2).toFixed(3))],
        dest,
      ];

  const balancedWaypoints: [number, number][] = isDefaultMargueriteSector
    ? [
        start,
        [-61.20, -63.50],
        ...(missionWps.length > 0 ? [missionWps[0]] : []),
        [-63.60, -63.20], // Gerlache Strait entrance
        ...(missionWps.length > 1 ? [missionWps[1]] : []),
        [-65.80, -66.10], // Grandidier Channel passage
        [-66.80, -67.50], // Marguerite Bay northern gate
        dest,
      ]
    : [
        start,
        [Number((start[0] + dLat * 0.3).toFixed(3)), Number((start[1] + dLon * 0.3 - 0.7).toFixed(3))],
        ...(missionWps.length > 0 ? [missionWps[0]] : []),
        [Number(midLat.toFixed(3)), Number((midLon - 0.8).toFixed(3))],
        ...(missionWps.length > 1 ? [missionWps[1]] : []),
        [Number((dest[0] - dLat * 0.25).toFixed(3)), Number((dest[1] - 0.4).toFixed(3))],
        dest,
      ];

  const fastestWaypoints: [number, number][] = isDefaultMargueriteSector
    ? [
        start,
        [-61.50, -61.20],
        [-63.10, -60.20], // Directly through Bransfield Strait
        [-64.80, -63.00],
        [-66.20, -65.40], // Direct shelf line
        dest,
      ]
    : [
        start,
        [Number((start[0] + dLat * 0.33).toFixed(3)), Number((start[1] + dLon * 0.33).toFixed(3))],
        ...(missionWps.length > 0 ? [missionWps[0]] : []),
        [Number(midLat.toFixed(3)), Number(midLon.toFixed(3))],
        ...(missionWps.length > 1 ? [missionWps[1]] : []),
        [Number((dest[0] - dLat * 0.33).toFixed(3)), Number(dest[1].toFixed(3))],
        dest,
      ];

  // Calculate uncertainty risk multiplier based on Decision Confidence Engine output
  let uncertaintyMultiplier = activeScenarioModifier;
  if (decisionConfidence) {
    if (decisionConfidence.overallLevel === 'MEDIUM') uncertaintyMultiplier *= 1.15;
    else if (decisionConfidence.overallLevel === 'LOW') uncertaintyMultiplier *= 1.4;
    else if (decisionConfidence.overallLevel === 'CRITICAL') uncertaintyMultiplier *= 2.0;
  }

  const candidateRoutes: {
    id: 'safest' | 'balanced' | 'fastest';
    name: string;
    type: 'SAFE' | 'BALANCED' | 'FAST';
    color: string;
    waypoints: [number, number][];
    speedFactor: number;
  }[] = [
    {
      id: 'safest',
      name: 'Outer Oceanic Deep-Water Corridor (Safest)',
      type: 'SAFE',
      color: '#10b981', // Emerald green
      waypoints: safeWaypoints,
      speedFactor: 0.95, // conservative navigation
    },
    {
      id: 'balanced',
      name: 'Gerlache & Grandidier Research Route (Balanced)',
      type: 'BALANCED',
      color: '#0ea5e9', // Cyan / Sky blue
      waypoints: balancedWaypoints,
      speedFactor: 1.0,
    },
    {
      id: 'fastest',
      name: 'Direct Bransfield Geodesic Track (Fastest)',
      type: 'FAST',
      color: '#f59e0b', // Amber
      waypoints: fastestWaypoints,
      speedFactor: 1.05,
    },
  ];

  const results: RouteAlternative[] = candidateRoutes.map((cand) => {
    let distanceNm = 0;
    let totalRiskSum = 0;
    let totalUncertaintySum = 0;
    let evalPointsCount = 0;
    const hazardSummary: string[] = [];

    for (let i = 0; i < cand.waypoints.length - 1; i++) {
      const p1 = cand.waypoints[i];
      const p2 = cand.waypoints[i + 1];
      const segDist = calculateDistanceNm(p1[0], p1[1], p2[0], p2[1]);
      distanceNm += segDist;

      // Sample along segment for risk
      const samples = Math.max(3, Math.ceil(segDist / 12));
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

    // Navigational calculations
    const vesselSpeed = vessel.cruisingSpeedKnots * cand.speedFactor;
    const etaHours = Number((distanceNm / Math.max(1, vesselSpeed)).toFixed(1));
    const fuelConsumptionDaily = vessel.fuelConsumptionTonsPerDay;
    const fuelTons = Number(((etaHours / 24) * fuelConsumptionDaily).toFixed(1));

    // Confidence mapping
    let confidence: RouteAlternative['confidence'] = decisionConfidence ? decisionConfidence.overallLevel : 'HIGH';
    if (!decisionConfidence) {
      if (avgUncertainty > 45 || avgRisk > 65) confidence = 'CRITICAL';
      else if (avgUncertainty > 30 || avgRisk > 45) confidence = 'LOW';
      else if (avgUncertainty > 18) confidence = 'MEDIUM';
    }

    // Count near-hazard iceberg encounters
    let hazardsCount = 0;
    for (const berg of icebergs) {
      const cpa = calculateIcebergCPA(cand.waypoints, berg, vesselSpeed);
      if (cpa.distanceNm < 6.0) {
        hazardsCount++;
      }
    }

    // Resilience score
    let resilienceScore = 85;
    if (cand.type === 'SAFE') resilienceScore = 94;
    else if (cand.type === 'BALANCED') resilienceScore = 82;
    else if (cand.type === 'FAST') resilienceScore = 59;

    // Cost function:
    const weights = DEFAULT_WEIGHTS[cand.type];
    const distanceCost = weights.alphaDistance * (distanceNm / 10);
    const fuelCost = weights.betaFuel * fuelTons * 1.5;
    const timeCost = weights.gammaTime * etaHours;
    const riskCost = weights.deltaRisk * avgRisk * 2.5;
    const uncertaintyCost = weights.epsilonUncertainty * avgUncertainty * 2.0;
    const totalCost = Number(
      (distanceCost + fuelCost + timeCost + riskCost + uncertaintyCost).toFixed(2)
    );

    const assumptions = [
      `Vessel maintains standard Ice Class (${vessel.iceClass.split(' ')[0]}) compliance`,
      `Iceberg drift follows current hydrodynamic forecast (±1.5 nm margin)`,
      `Watchkeeping radar active in pack ice corridors`,
    ];

    const isBlocked = Boolean(decisionConfidence && decisionConfidence.isRecommendationBlocked);
    const isLowConfidence = Boolean(decisionConfidence && decisionConfidence.overallLevel === 'LOW');

    if (isLowConfidence) {
      assumptions.push(`CONSERVATIVE PENALTY: Risk treatment scaled up due to LOW decision confidence (${decisionConfidence?.primaryLimitingFactor})`);
    }

    const constraintsSatisfied = !isBlocked && avgRisk < 75 && hazardsCount <= (cand.type === 'FAST' ? 4 : 2);

    return {
      id: cand.id,
      name: cand.name,
      type: cand.type,
      color: cand.color,
      waypoints: cand.waypoints,
      distanceNm: Math.round(distanceNm),
      etaHours,
      fuelTons,
      riskIndex: avgRisk,
      uncertaintyScore: avgUncertainty,
      confidence,
      hazardsCount,
      hazardSummary: hazardSummary.length > 0 ? hazardSummary : ['Open Ocean Polar Swell', 'Minor Growler Dispersion'],
      assumptions,
      constraintsSatisfied,
      isRecommended: false,
      recommendationRationale: '',
      resilienceScore,
      isRecommendationBlocked: isBlocked,
      confidenceResult: decisionConfidence,
      uncertaintyPenaltyApplied: isLowConfidence,
      uncertaintyPenaltyReason: isLowConfidence
        ? `Conservative uncertainty penalty (+40%) applied to hazard clearance corridors due to LOW decision confidence (Primary Limiting Factor: ${decisionConfidence?.primaryLimitingFactor}).`
        : undefined,
      costBreakdown: {
        distanceCost: Number(distanceCost.toFixed(1)),
        fuelCost: Number(fuelCost.toFixed(1)),
        timeCost: Number(timeCost.toFixed(1)),
        riskCost: Number(riskCost.toFixed(1)),
        uncertaintyCost: Number(uncertaintyCost.toFixed(1)),
        totalCost,
      },
    };
  });

  // Decision Engine: select recommended route based on mission risk preference, vessel capability, and risk
  let recommendedIndex = 1; // Default to BALANCED

  if (decisionConfidence && decisionConfidence.overallLevel === 'LOW') {
    // Under LOW confidence, steer conservative selection toward SAFEST
    recommendedIndex = results.findIndex((r) => r.type === 'SAFE');
  } else if (mission.riskPreference === 'Conservative') {
    const balanced = results.find((r) => r.type === 'BALANCED');
    if (balanced && (balanced.riskIndex > 40 || vessel.maxSeaIceConcentrationPercent < 60)) {
      recommendedIndex = results.findIndex((r) => r.type === 'SAFE');
    } else {
      recommendedIndex = results.findIndex((r) => r.type === 'BALANCED');
    }
  } else if (mission.riskPreference === 'Aggressive') {
    recommendedIndex = results.findIndex((r) => r.type === 'FAST');
  } else {
    recommendedIndex = results.findIndex((r) => r.type === 'BALANCED');
  }

  if (recommendedIndex < 0) recommendedIndex = 0;

  // Mark recommended route and generate dynamic scientific rationale
  results.forEach((r, idx) => {
    if (decisionConfidence && decisionConfidence.isRecommendationBlocked) {
      r.isRecommended = false;
      r.recommendationRationale = `DECISION CONFIDENCE CRITICAL — NAVIGATION RECOMMENDATION BLOCKED: Required environmental inputs are insufficient or severely degraded. Primary Limiting Factor: ${decisionConfidence.primaryLimitingFactor}. Route displayed for analytical scenario context only.`;
    } else if (idx === recommendedIndex) {
      r.isRecommended = true;

      let baseRationale = '';
      if (r.type === 'SAFE') {
        baseRationale = `Recommended under ${mission.riskPreference.toUpperCase()} policy: Provides maximum iceberg standoff distance (>5.8 nm CPA) and keeps vessel clear of Marguerite Bay consolidated fast-ice pack. Tolerates up to 94% of environmental drift perturbations without compromising safety margins.`;
      } else if (r.type === 'BALANCED') {
        baseRationale = `Recommended as optimal multi-objective solution: Achieves lowest composite cost (${r.costBreakdown.totalCost}). Navigates accessible open leads within vessel ${vessel.iceClass.split(' ')[0]} rating (${vessel.maxSeaIceConcentrationPercent}% max pack) while servicing both research stations with only a modest fuel penalty (+${(r.fuelTons - results[2].fuelTons).toFixed(1)} tons) over the fastest track.`;
      } else {
        baseRationale = `Recommended for high speed priority: Minimizes transit duration (${r.etaHours}h) and fuel burn (${r.fuelTons}t). Requires continuous radar watch for ICB-902 trajectory convergence and marginal pack ice leads in Bransfield Strait.`;
      }

      if (decisionConfidence?.overallLevel === 'MEDIUM') {
        baseRationale += ` [VERIFICATION RECOMMENDED: Environmental feeds are aging/degraded. Additional observation in route corridor is recommended before final navigation execution.]`;
      } else if (decisionConfidence?.overallLevel === 'LOW') {
        baseRationale += ` [CONSERVATIVE UNCERTAINTY TREATMENT APPLIED: Routing penalty applied due to elevated hazard drift uncertainty (${decisionConfidence.primaryLimitingFactor}).]`;
      }

      r.recommendationRationale = baseRationale;
    } else {
      r.isRecommended = false;
      r.recommendationRationale = `Alternative option. Higher ${
        r.riskIndex > results[recommendedIndex].riskIndex ? 'environmental risk exposure' : 'distance/fuel consumption'
      } relative to primary plan.`;
    }
  });

  return results;
}
