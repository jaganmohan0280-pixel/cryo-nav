/**
 * CRYO NAV — Decision-Impact Data Acquisition Engine
 * Phase 6 — Decision-Guided Satellite & Observation Prioritization
 *
 * OBJECTIVE:
 * Transform Decision Confidence (Phase 4), Counterfactual Sensitivity (Phase 5),
 * Route Corridors, Hazard Proximity, and Communication Constraints into a
 * deterministic, explainable DATA PRIORITIZATION RANKING.
 *
 * CORE FEEDBACK LOOP:
 * CURRENT DECISION -> WHAT IS UNCERTAIN? -> WHAT COULD CHANGE THE DECISION? ->
 * WHICH AVAILABLE OBSERVATION ADDRESSES THAT? -> RANK OBSERVATIONS -> SHOW WHY THEY MATTER
 *
 * VALUE-OF-INFORMATION HEURISTIC DISCLAIMER:
 * The composite decision-impact score (0–100) is a decision-support heuristic designed
 * to optimize bandwidth allocation. It is NOT a statistically calculated Bayesian Value of Information.
 *
 * PRIORITY CLASSIFICATION NOTICE:
 * Data priority levels (CRITICAL, HIGH, MEDIUM, LOW) represent DATA ACQUISITION PRIORITIES
 * to resolve decision-critical uncertainties. They do not constitute political or operational vessel safety clearances.
 */

import {
  SatelliteProduct,
  RouteAlternative,
  IcebergDetection,
  SeaIceCell,
  ConnectionState,
  DecisionConfidenceResult,
  BatchSensitivitySummary,
  DataAcquisitionPriority,
  DecisionImpactScore,
  DataAcquisitionRecommendation,
  FiveMinuteBudgetSummary,
  EnvironmentalDataMode,
} from '../types';
import { calculateDistanceNm } from './riskEngine';

export interface DecisionImpactAssessment {
  productId: string;
  decisionImpactScore: number; // 0-100
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  spatialOverlapPct: number;
  expectedUncertaintyReductionPct: number;
  routeSensitivityRisk: number;
  recommendationShiftProbabilityPct: number;
  explanation: string;
}

/**
 * Evaluates the decision-impact score and detailed metric breakdown for a single candidate product.
 */
export function evaluateProductDecisionImpact(
  product: SatelliteProduct,
  activeRoutes: RouteAlternative[],
  icebergs: IcebergDetection[],
  seaIceCells: SeaIceCell[],
  connection: ConnectionState,
  decisionConfidence?: DecisionConfidenceResult | null,
  batchSensitivity?: BatchSensitivitySummary | null,
  environmentalMode: EnvironmentalDataMode = 'REAL'
): DataAcquisitionRecommendation {
  const recommendedRoute = activeRoutes.find((r) => r.isRecommended) || activeRoutes[0];
  const fp = product.footprint;

  // 1. SPATIAL RELEVANCE — Route Corridor Overlap (Recommended vs Alternatives vs Hazards)
  let recCoveredNm = 0;
  if (recommendedRoute && recommendedRoute.waypoints.length > 1) {
    const wps = recommendedRoute.waypoints;
    for (let i = 0; i < wps.length - 1; i++) {
      const p1 = wps[i];
      const p2 = wps[i + 1];
      const segDist = calculateDistanceNm(p1[0], p1[1], p2[0], p2[1]);
      const d1 = calculateDistanceNm(p1[0], p1[1], fp.centerLat, fp.centerLon);
      const d2 = calculateDistanceNm(p2[0], p2[1], fp.centerLat, fp.centerLon);
      if (d1 <= fp.radiusNm || d2 <= fp.radiusNm) {
        recCoveredNm += segDist;
      }
    }
  }

  const recOverlapPct = recommendedRoute ? Math.min(100, Math.round((recCoveredNm / Math.max(1, recommendedRoute.distanceNm)) * 100)) : 0;

  // Proximity boost for footprint center near corridor waypoints
  let minWpDist = Infinity;
  activeRoutes.forEach((route) => {
    route.waypoints.forEach((wp) => {
      const dist = calculateDistanceNm(wp[0], wp[1], fp.centerLat, fp.centerLon);
      if (dist < minWpDist) minWpDist = dist;
    });
  });

  let pointProximityScore = 0;
  if (minWpDist <= fp.radiusNm) {
    pointProximityScore = Math.max(40, 100 - (minWpDist / fp.radiusNm) * 60);
  }

  // Spatial Overlap weighted between segment coverage and proximity score
  const spatialOverlapPct = Math.min(100, Math.round(recOverlapPct * 0.5 + pointProximityScore * 0.5));

  // 2. HAZARD RELEVANCE — Proximity to iceberg or high ice concentration hazards
  let hazardWithinFootprint = false;
  let nearestHazardDist = Infinity;
  let hazardCountInFootprint = 0;
  const affectedHazards: string[] = [];

  icebergs.forEach((berg) => {
    const dist = calculateDistanceNm(berg.lat, berg.lon, fp.centerLat, fp.centerLon);
    if (dist < nearestHazardDist) nearestHazardDist = dist;
    if (dist <= fp.radiusNm) {
      hazardWithinFootprint = true;
      hazardCountInFootprint++;
      affectedHazards.push(berg.name || berg.id);
    }
  });

  seaIceCells.forEach((cell) => {
    if (cell.concentrationPercent > 50) {
      const dist = calculateDistanceNm(cell.lat, cell.lon, fp.centerLat, fp.centerLon);
      if (dist <= fp.radiusNm && !affectedHazards.includes('Pack Ice Zone')) {
        affectedHazards.push(`High Sea Ice Pack (${cell.concentrationPercent}%)`);
      }
    }
  });

  const hazardRelevance = Math.min(100, (hazardWithinFootprint ? 50 : 15) + hazardCountInFootprint * 15);

  // 3. DECISION RELEVANCE — Alignment with Phase 4 Dominant Confidence Limiting Factor
  let decisionRelevance = 50;
  const primaryFactor = decisionConfidence?.primaryLimitingFactor || 'ICEBERG TRAJECTORY UNCERTAINTY';
  const sensorLower = (product.sensor + ' ' + product.productType + ' ' + product.name).toLowerCase();

  if (primaryFactor.toLowerCase().includes('iceberg') || primaryFactor.toLowerCase().includes('trajectory')) {
    if (sensorLower.includes('sar') || sensorLower.includes('iceberg') || sensorLower.includes('radar')) {
      decisionRelevance = 90;
    } else if (sensorLower.includes('optical')) {
      decisionRelevance = 65;
    } else {
      decisionRelevance = 40;
    }
  } else if (primaryFactor.toLowerCase().includes('sea ice') || primaryFactor.toLowerCase().includes('ice concentration')) {
    if (sensorLower.includes('altimeter') || sensorLower.includes('microwave') || sensorLower.includes('sea ice')) {
      decisionRelevance = 90;
    } else if (sensorLower.includes('sar')) {
      decisionRelevance = 75;
    } else {
      decisionRelevance = 40;
    }
  } else if (primaryFactor.toLowerCase().includes('weather') || primaryFactor.toLowerCase().includes('wind')) {
    if (sensorLower.includes('scatterometer') || sensorLower.includes('atmospheric') || sensorLower.includes('weather')) {
      decisionRelevance = 90;
    } else {
      decisionRelevance = 45;
    }
  }

  // 4. COUNTERFACTUAL SENSITIVITY RELEVANCE — Phase 5 Feedback Loop
  let sensitivityRelevance = 50;
  const domSens = batchSensitivity?.dominantSensitivity;
  const overallStab = batchSensitivity?.overallStability || 'ROBUST';

  if (domSens === 'ICEBERG_DRIFT' && (sensorLower.includes('sar') || sensorLower.includes('iceberg'))) {
    sensitivityRelevance = overallStab === 'HIGHLY_SENSITIVE' ? 95 : overallStab === 'SENSITIVE' ? 80 : 60;
  } else if (domSens === 'SEA_ICE_CONCENTRATION' && (sensorLower.includes('sea ice') || sensorLower.includes('altimeter'))) {
    sensitivityRelevance = overallStab === 'HIGHLY_SENSITIVE' ? 95 : overallStab === 'SENSITIVE' ? 80 : 60;
  } else if (domSens === 'WIND' && (sensorLower.includes('scatterometer') || sensorLower.includes('wind'))) {
    sensitivityRelevance = overallStab === 'HIGHLY_SENSITIVE' ? 90 : overallStab === 'SENSITIVE' ? 75 : 55;
  } else if (overallStab === 'ROBUST') {
    sensitivityRelevance = 40; // Low sensitivity means new data is less urgent
  }

  // 5. TEMPORAL RELEVANCE & FRESHNESS BENEFIT
  const acquisitionTime = new Date(product.acquisitionTime).getTime();
  const now = Date.now();
  const ageHours = Math.max(0, (now - acquisitionTime) / (1000 * 60 * 60));

  let temporalRelevance = 100;
  let freshnessBenefit = 90;
  if (ageHours <= 6) {
    temporalRelevance = 100;
    freshnessBenefit = 95;
  } else if (ageHours <= 24) {
    temporalRelevance = 80;
    freshnessBenefit = 75;
  } else if (ageHours <= 72) {
    temporalRelevance = 50;
    freshnessBenefit = 45;
  } else {
    temporalRelevance = 20;
    freshnessBenefit = 20;
  }

  // 6. POTENTIAL UNCERTAINTY REDUCTION HEURISTIC WEIGHT / INDEX
  // NOTE: Sensor potential values (High-Res SAR: 46, Iceberg Profiling: 32, Scatterometer: 28, Altimeter: 24, Optical: 20)
  // are baseline engineering heuristic relative weights/indices, NOT measured empirical uncertainty reductions.
  let uncertaintyReductionPotential = 15;
  if (sensorLower.includes('high-res sar') || sensorLower.includes('interferometric')) {
    uncertaintyReductionPotential = 46;
  } else if (sensorLower.includes('dual-polarization') || sensorLower.includes('profiling')) {
    uncertaintyReductionPotential = 32;
  } else if (sensorLower.includes('altimeter') || sensorLower.includes('freeboard')) {
    uncertaintyReductionPotential = 24;
  } else if (sensorLower.includes('scatterometer')) {
    uncertaintyReductionPotential = 28;
  } else if (sensorLower.includes('optical')) {
    uncertaintyReductionPotential = 20;
  }

  // 7. ACQUISITION & CONNECTIVITY COST PENALTIES
  // NOTE: Connectivity speeds (ONLINE: 50 MB/min, LIMITED: 8 MB/min, OFFLINE: 0 MB/min)
  // are configurable downlink planning speed assumptions used for heuristic budget scheduling, NOT measured real-world satellite bandwidth.
  let acquisitionCost = Math.min(100, Math.round((product.sizeMb / 400) * 100)); // Larger files cost more
  let connectivityCost = 0;
  let connectivityFactor = 1.0;

  if (connection === 'ONLINE') {
    connectivityCost = 10;
    connectivityFactor = 1.0;
  } else if (connection === 'LIMITED') {
    connectivityCost = 60;
    connectivityFactor = product.sizeMb > 100 ? 0.65 : 1.1; // Prefer smaller high-impact files
  } else if (connection === 'OFFLINE') {
    connectivityCost = 100;
    connectivityFactor = 0.0;
  } else if (connection === 'SYNCING') {
    connectivityCost = 30;
    connectivityFactor = 0.9;
  }

  // 8. VALUE-OF-INFORMATION HEURISTIC SCORE FORMULA (0-100)
  const weightedComponentSum =
    decisionRelevance * 0.25 +
    spatialOverlapPct * 0.25 +
    uncertaintyReductionPotential * 2.0 * 0.20 +
    sensitivityRelevance * 0.20 +
    temporalRelevance * 0.10;

  const rawImpactScore = weightedComponentSum * connectivityFactor;
  const totalScore = connection === 'OFFLINE' ? 0 : Math.min(99, Math.max(10, Math.round(rawImpactScore)));

  // 9. PRIORITY CLASSIFICATION (DATA PRIORITIES, NOT SAFETY CLASSIFICATIONS)
  let priority: DataAcquisitionPriority = 'LOW';
  if (totalScore >= 85) priority = 'CRITICAL';
  else if (totalScore >= 70) priority = 'HIGH';
  else if (totalScore >= 45) priority = 'MEDIUM';

  // 10. ESTIMATED ACQUISITION TIME (MINUTES) FOR 5-MINUTE PLANNING BUDGET
  let transferSpeedMbPerMin = 50; // default ONLINE (Configurable planning assumption)
  if (connection === 'LIMITED') transferSpeedMbPerMin = 8;
  else if (connection === 'OFFLINE') transferSpeedMbPerMin = 0.001;

  const estimatedAcquisitionTimeMinutes = Number((product.sizeMb / transferSpeedMbPerMin).toFixed(1));
  const isFiveMinuteEligible = estimatedAcquisitionTimeMinutes <= 5.0 && connection !== 'OFFLINE';

  // 11. DYNAMIC RATIONALE GENERATION ("WHY THIS DATA?")
  const affectedDecision = recommendedRoute ? recommendedRoute.name : 'Primary Corridor Selection';
  const dominantUncertainty = primaryFactor;

  let acquisitionReason = '';
  let expectedBenefit = '';

  if (priority === 'CRITICAL') {
    acquisitionReason = `CRITICAL DATA NEED: Directly targets the dominant uncertainty (${primaryFactor}) along the planned ${recommendedRoute?.type || 'BALANCED'} route corridor (${spatialOverlapPct}% overlap). Route choice is currently ${overallStab} under what-if scenario perturbations.`;
    expectedBenefit = `Potential uncertainty reduction weight (index: ${uncertaintyReductionPotential}) for iceberg/sea-ice hazard features along the active transit corridor.`;
  } else if (priority === 'HIGH') {
    acquisitionReason = `HIGH PRIORITY: High spatial overlap (${spatialOverlapPct}%) near ${fp.description}. Directly addresses ${primaryFactor} with potential uncertainty reduction weight of ${uncertaintyReductionPotential}.`;
    expectedBenefit = `Provides fresh satellite coverage to resolve spatial ambiguities prior to critical waypoint entry.`;
  } else if (priority === 'MEDIUM') {
    acquisitionReason = `MEDIUM PRIORITY: Moderate corridor overlap (${spatialOverlapPct}%) over auxiliary route sectors. Useful for background monitoring.`;
    expectedBenefit = `Reduces local observation aging with moderate decision relevance.`;
  } else {
    acquisitionReason = `LOW PRIORITY: Peripheral spatial coverage (${spatialOverlapPct}%) or low sensitivity parameter. Navigation decision remains robust without this downlink.`;
    expectedBenefit = `Low expected impact on current route recommendation.`;
  }

  const explanation = `${priority} PRIORITY (${totalScore}/100): ${acquisitionReason} ${expectedBenefit}`;

  const provenance = environmentalMode === 'REAL'
    ? `Real Satellite Metadata Catalogue — ${product.sensor} (${product.id})`
    : `DEMO / SYNTHETIC DATA — ${product.name}`;

  const status = connection === 'OFFLINE'
    ? 'Downlink Unavailable'
    : product.availability;

  const scoreBreakdown: DecisionImpactScore = {
    totalScore,
    decisionRelevance: Math.round(decisionRelevance),
    spatialRelevance: Math.round(spatialOverlapPct),
    temporalRelevance: Math.round(temporalRelevance),
    uncertaintyReductionPotential,
    routeSensitivityRelevance: Math.round(sensitivityRelevance),
    hazardRelevance: Math.round(hazardRelevance),
    freshnessBenefit: Math.round(freshnessBenefit),
    acquisitionCost: Math.round(acquisitionCost),
    connectivityCost: Math.round(connectivityCost),
    explanation,
  };

  return {
    productId: product.id,
    productName: product.name,
    sensorType: product.sensor,
    priority,
    score: totalScore,
    affectedDecision,
    dominantUncertainty,
    affectedRoute: recommendedRoute?.name || 'Active Recommended Route',
    affectedHazards,
    expectedBenefit,
    acquisitionReason,
    provenance,
    status,
    footprint: product.footprint,
    sizeMb: product.sizeMb,
    estimatedAcquisitionTimeMinutes,
    isFiveMinuteEligible,
    scoreBreakdown,
    isCachedData: connection === 'OFFLINE' || product.availability === 'Acquired',
    cachedTimestamp: product.acquisitionTime,
    cachedAgeHours: Math.round(ageHours * 10) / 10,
  };
}

/**
 * Evaluates all candidate products, ranks them by decision-impact score,
 * and calculates the 5-Minute Acquisition Priority Window budget.
 */
export function generateDataAcquisitionPriorities(
  products: SatelliteProduct[],
  activeRoutes: RouteAlternative[],
  icebergs: IcebergDetection[],
  seaIceCells: SeaIceCell[],
  connection: ConnectionState,
  decisionConfidence?: DecisionConfidenceResult | null,
  batchSensitivity?: BatchSensitivitySummary | null,
  environmentalMode: EnvironmentalDataMode = 'REAL'
): {
  recommendations: DataAcquisitionRecommendation[];
  fiveMinuteBudget: FiveMinuteBudgetSummary;
} {
  if (!products || products.length === 0) {
    return {
      recommendations: [],
      fiveMinuteBudget: {
        totalAllocatedMinutes: 0,
        maxBudgetMinutes: 5.0,
        prioritizedProducts: [],
        remainingBudgetMinutes: 5.0,
        explanation: 'No satellite products available in current catalogue.',
      },
    };
  }

  // 1. Evaluate each product
  const recommendations = products.map((p) =>
    evaluateProductDecisionImpact(
      p,
      activeRoutes,
      icebergs,
      seaIceCells,
      connection,
      decisionConfidence,
      batchSensitivity,
      environmentalMode
    )
  );

  // 2. Sort by score descending (highest impact first)
  recommendations.sort((a, b) => b.score - a.score);

  // 3. Calculate 5-Minute Priority Window Planning Budget
  const prioritizedProducts: DataAcquisitionRecommendation[] = [];
  let accumulatedMinutes = 0;
  const MAX_BUDGET_MINUTES = 5.0;

  if (connection !== 'OFFLINE') {
    for (const rec of recommendations) {
      if (rec.status === 'Acquired') continue; // Skip already downloaded
      const estTime = rec.estimatedAcquisitionTimeMinutes;
      if (accumulatedMinutes + estTime <= MAX_BUDGET_MINUTES) {
        prioritizedProducts.push(rec);
        accumulatedMinutes += estTime;
      }
    }
  }

  accumulatedMinutes = Number(accumulatedMinutes.toFixed(1));
  const remainingBudgetMinutes = Number(Math.max(0, MAX_BUDGET_MINUTES - accumulatedMinutes).toFixed(1));

  const explanation = connection === 'OFFLINE'
    ? 'Acquisition planning budget unavailable while OFFLINE. Using verified local cached observations.'
    : `5-Minute Acquisition Planning Window allocated ${prioritizedProducts.length} high-impact product(s) consuming ${accumulatedMinutes} min of estimated planning budget (Planning heuristic).`;

  return {
    recommendations,
    fiveMinuteBudget: {
      totalAllocatedMinutes: accumulatedMinutes,
      maxBudgetMinutes: MAX_BUDGET_MINUTES,
      prioritizedProducts,
      remainingBudgetMinutes,
      explanation,
    },
  };
}

/**
 * Backwards-compatible wrapper returning DecisionImpactAssessment for legacy callers.
 */
export function evaluateDecisionImpact(
  product: SatelliteProduct,
  activeRoutes: RouteAlternative[],
  icebergs: IcebergDetection[],
  seaIceCells: SeaIceCell[],
  connection: ConnectionState
): DecisionImpactAssessment {
  const rec = evaluateProductDecisionImpact(product, activeRoutes, icebergs, seaIceCells, connection);
  
  let legacyPriority: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
  if (rec.priority === 'CRITICAL' || rec.priority === 'HIGH') legacyPriority = 'HIGH';
  else if (rec.priority === 'MEDIUM') legacyPriority = 'MEDIUM';

  return {
    productId: product.id,
    decisionImpactScore: rec.score,
    priority: legacyPriority,
    spatialOverlapPct: rec.scoreBreakdown.spatialRelevance,
    expectedUncertaintyReductionPct: rec.scoreBreakdown.uncertaintyReductionPotential,
    routeSensitivityRisk: rec.scoreBreakdown.routeSensitivityRelevance,
    recommendationShiftProbabilityPct: Math.min(88, Math.round((rec.score / 100) * 80)),
    explanation: rec.scoreBreakdown.explanation,
  };
}
