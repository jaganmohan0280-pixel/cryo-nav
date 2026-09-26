/**
 * CRYO NAV — Decision-Impact Data Acquisition Core Engine
 * Phase 11A — Core Data Acquisition Prioritization Architecture
 *
 * Core Responsibility:
 * Determines which available or discoverable environmental data products should receive
 * higher acquisition priority based on their potential to reduce uncertainty and affect
 * active navigation decisions.
 *
 * Fundamental Decision-Impact Loop:
 * UNCERTAINTY -> DECISION SENSITIVITY -> INFORMATION NEED -> DATA PRODUCT -> EXPECTED DECISION IMPACT -> ACQUISITION PRIORITY
 *
 * Scientific & Engineering Rules:
 * 1. SCIENTIFIC DISCLOSURE: System identifies available/discoverable data products.
 *    Does NOT command satellites to re-point or scan areas on demand.
 * 2. ENGINEERING PRIORITY INDEX: Composite score (0-100) is an Engineering Priority Index
 *    for bandwidth and downlink allocation. It is NOT a probability of hazard, collision, or route failure.
 * 3. CONNECTIVITY AWARENESS: Support ONLINE, LIMITED, OFFLINE, SYNCING.
 *    OFFLINE does NOT mean "download now". Offline candidate status is READY_WHEN_CONNECTED.
 * 4. SAR EVIDENCE DISTINCTION: SAR candidate extraction regions are "SAR evidence/candidate regions",
 *    NOT confirmed icebergs.
 * 5. DETERMINISTIC & EXPLAINABLE: 100% deterministic (NO Math.random()). Generate clear, human-readable explanations.
 * 6. NO ROUTING MUTATION: Does NOT alter routes, trigger replanning, or modify routingEngine.ts.
 * 7. NO AUTOMATIC DOWNLOAD: Does NOT trigger satellite downloads, STAC queries, or OAuth routines.
 */

import {
  SatelliteProduct,
  SatelliteCatalogueItem,
  RouteAlternative,
  IcebergDetection,
  SeaIceCell,
  ConnectionState,
  ConfidenceLevel,
  FreshnessState,
  DecisionConfidenceResult,
  BatchSensitivitySummary,
  DataAcquisitionPriority,
} from '../types';
import { calculateDistanceNm } from './riskEngine';
import { UncertaintyZone, UncertaintyEvaluationResult } from './uncertaintyEngine';

export type ProductAvailabilityStatus =
  | 'AVAILABLE_FOR_DOWNLINK'
  | 'READY_WHEN_CONNECTED'
  | 'ACQUIRED'
  | 'DOWNLINK_UNAVAILABLE'
  | 'EXCEEDS_BANDWIDTH';

export interface DecisionImpactAcquisitionInput {
  activeRoutes: RouteAlternative[];
  selectedRouteId?: string | null;
  candidateProducts: (SatelliteProduct | SatelliteCatalogueItem)[];
  uncertaintyZones?: (UncertaintyZone | UncertaintyEvaluationResult)[];
  icebergs?: IcebergDetection[];
  seaIceCells?: SeaIceCell[];
  sarCandidateRegionsCount?: number;
  decisionConfidence?: DecisionConfidenceResult | null;
  batchSensitivity?: BatchSensitivitySummary | null;
  connectionState?: ConnectionState;
  availableBandwidthMb?: number | null;
  maxAcquisitionTimeMinutes?: number | null;
  isTestFixture?: boolean;
}

export interface AcquisitionCandidateScoreBreakdown {
  spatialOverlapPct: number;
  temporalRelevancePct: number;
  routeSensitivityRelevance: number;
  uncertaintyMagnitudeScore: number;
  potentialRecommendationShiftScore: number;
  freshnessBenefitScore: number;
  productAvailabilityScore: number;
  resolutionRelevanceScore: number;
  acquisitionCostPenalty: number;
  connectivityCostPenalty: number;
}

export interface AcquisitionCandidate {
  productId: string;
  productName: string;
  sensor: string;
  productType: string;
  engineeringPriorityIndex: number; // 0-100 score (NOT a probability)
  priority: DataAcquisitionPriority;
  availabilityStatus: ProductAvailabilityStatus;
  affectedDecision: string;
  affectedRouteName: string;
  uncertaintyAddressed: string;
  expectedDecisionImpact: string;
  expectedUncertaintyReductionPct: number;
  acquisitionCostMb: number;
  withinBandwidthBudget: boolean;
  reason: string;
  provenance: string;
  confidenceLevel: ConfidenceLevel | 'UNAVAILABLE';
  freshnessState: FreshnessState | 'UNAVAILABLE';
  footprint: {
    centerLat: number;
    centerLon: number;
    radiusNm: number;
    description: string;
  };
  scoreBreakdown: AcquisitionCandidateScoreBreakdown;
  sarEvidenceNote?: string;
  rawProductMetadata: SatelliteProduct | SatelliteCatalogueItem;
}

export interface AcquisitionRankingResult {
  rankedCandidates: AcquisitionCandidate[];
  totalCandidatesEvaluated: number;
  eligibleWithinBandwidthCount: number;
  connectionState: ConnectionState;
  availableBandwidthMb: number | null;
  dominantAcquisitionPriority: DataAcquisitionPriority;
  rankingTimestamp: string;
  explanation: string;
  isTestFixture: boolean;
}

/**
 * Normalizes footprints for both SatelliteProduct and SatelliteCatalogueItem inputs.
 */
function extractFootprint(product: SatelliteProduct | SatelliteCatalogueItem): {
  centerLat: number;
  centerLon: number;
  radiusNm: number;
  description: string;
} {
  if ('footprint' in product && product.footprint) {
    return {
      centerLat: product.footprint.centerLat,
      centerLon: product.footprint.centerLon,
      radiusNm: product.footprint.radiusNm || 25.0,
      description: product.footprint.description || 'Satellite observation footprint',
    };
  }

  if ('bbox' in product && Array.isArray(product.bbox) && product.bbox.length === 4) {
    const [minLon, minLat, maxLon, maxLat] = product.bbox;
    const centerLat = (minLat + maxLat) / 2;
    const centerLon = (minLon + maxLon) / 2;
    const dLatNm = Math.abs(maxLat - minLat) * 60;
    const dLonNm = Math.abs(maxLon - minLon) * 60 * Math.cos((centerLat * Math.PI) / 180);
    const radiusNm = Math.max(10, Math.round((Math.sqrt(dLatNm * dLatNm + dLonNm * dLonNm) / 2) * 10) / 10);
    return {
      centerLat,
      centerLon,
      radiusNm,
      description: `BBox [${minLat.toFixed(2)}, ${minLon.toFixed(2)} to ${maxLat.toFixed(2)}, ${maxLon.toFixed(2)}]`,
    };
  }

  return {
    centerLat: -65.0,
    centerLon: -64.0,
    radiusNm: 25.0,
    description: 'Polar sector coverage area',
  };
}

/**
 * Normalizes size in MB for candidate data products.
 */
function extractSizeMb(product: SatelliteProduct | SatelliteCatalogueItem): number {
  if ('sizeMb' in product && typeof product.sizeMb === 'number') {
    return product.sizeMb;
  }
  return 50; // default standard SAR tile estimation
}

/**
 * Core Decision-Impact Data Acquisition Engine calculation.
 * Takes current decision state, uncertainty, sensitivity, connectivity, and data candidates
 * to return a deterministic, ranked collection of acquisition priorities.
 */
export function evaluateAcquisitionPriorities(
  input: DecisionImpactAcquisitionInput
): AcquisitionRankingResult {
  const {
    activeRoutes = [],
    selectedRouteId,
    candidateProducts = [],
    uncertaintyZones = [],
    icebergs = [],
    seaIceCells = [],
    sarCandidateRegionsCount = 0,
    decisionConfidence = null,
    batchSensitivity = null,
    connectionState = 'ONLINE',
    availableBandwidthMb = null,
    isTestFixture = false,
  } = input;

  const recommendedRoute =
    activeRoutes.find((r) => r.id === selectedRouteId) ||
    activeRoutes.find((r) => r.isRecommended) ||
    activeRoutes[0] ||
    null;

  const rankedCandidates: AcquisitionCandidate[] = candidateProducts.map((product) => {
    const productId = product.id;
    const productName =
      ('name' in product && product.name) ||
      ('platform' in product && `${product.platform} ${product.productType}`) ||
      productId;
    const sensor =
      ('sensor' in product && product.sensor) ||
      ('instrument' in product && product.instrument) ||
      'Sentinel-1 SAR';
    const productType = product.productType || 'SAR Image Product';
    const sizeMb = extractSizeMb(product);
    const footprint = extractFootprint(product);

    // 1. SPATIAL OVERLAP (0 - 100)
    let spatialOverlapPct = 0;
    let minWpDist = Infinity;

    if (recommendedRoute && recommendedRoute.waypoints.length > 0) {
      let coveredDistNm = 0;
      const wps = recommendedRoute.waypoints;
      for (let i = 0; i < wps.length - 1; i++) {
        const p1 = wps[i];
        const p2 = wps[i + 1];
        const segDist = calculateDistanceNm(p1[0], p1[1], p2[0], p2[1]);
        const d1 = calculateDistanceNm(p1[0], p1[1], footprint.centerLat, footprint.centerLon);
        const d2 = calculateDistanceNm(p2[0], p2[1], footprint.centerLat, footprint.centerLon);
        if (d1 <= footprint.radiusNm || d2 <= footprint.radiusNm) {
          coveredDistNm += segDist;
        }
      }
      const routeDist = Math.max(1, recommendedRoute.distanceNm);
      const segmentCoveragePct = Math.min(100, Math.round((coveredDistNm / routeDist) * 100));

      wps.forEach((wp) => {
        const d = calculateDistanceNm(wp[0], wp[1], footprint.centerLat, footprint.centerLon);
        if (d < minWpDist) minWpDist = d;
      });

      let proximityScore = 0;
      if (minWpDist <= footprint.radiusNm) {
        proximityScore = Math.max(40, Math.round(100 - (minWpDist / footprint.radiusNm) * 60));
      }

      spatialOverlapPct = Math.min(100, Math.round(segmentCoveragePct * 0.5 + proximityScore * 0.5));
    } else {
      spatialOverlapPct = 10; // Baseline default if no active route
    }

    // 2. TEMPORAL RELEVANCE & FRESHNESS (0 - 100)
    let freshnessState: FreshnessState | 'UNAVAILABLE' = 'UNAVAILABLE';
    if ('freshness' in product && product.freshness) {
      freshnessState = product.freshness;
    }

    let temporalRelevancePct = 60;
    if (freshnessState === 'FRESH') temporalRelevancePct = 95;
    else if (freshnessState === 'AGING') temporalRelevancePct = 70;
    else if (freshnessState === 'STALE') temporalRelevancePct = 40;
    else if (freshnessState === 'UNAVAILABLE') temporalRelevancePct = 50;

    // 3. ROUTE SENSITIVITY & COUNTERFACTUAL RELEVANCE (0 - 100)
    let routeSensitivityRelevance = 50;
    if (batchSensitivity) {
      if (batchSensitivity.overallStability === 'HIGHLY_SENSITIVE') routeSensitivityRelevance = 95;
      else if (batchSensitivity.overallStability === 'SENSITIVE') routeSensitivityRelevance = 75;
      else if (batchSensitivity.overallStability === 'ROBUST') routeSensitivityRelevance = 35;
    }

    // 4. UNCERTAINTY MAGNITUDE & ADDRESSED UNCERTAINTY (0 - 100)
    let uncertaintyMagnitudeScore = 40;
    let expectedUncertaintyReductionPct = 30;
    let matchingZoneDescription = 'General regional uncertainty';

    if (uncertaintyZones && uncertaintyZones.length > 0) {
      let maxZoneRadius = 0;
      uncertaintyZones.forEach((zone) => {
        const zCenter = 'center' in zone ? zone.center : 'location' in zone ? zone.location : { lat: -65, lon: -64 };
        const zRadius = 'radiusNm' in zone ? zone.radiusNm : 'expandedUncertaintyRadiusNm' in zone ? zone.expandedUncertaintyRadiusNm : 2.0;
        const distToZone = calculateDistanceNm(zCenter.lat, zCenter.lon, footprint.centerLat, footprint.centerLon);

        if (distToZone <= footprint.radiusNm + zRadius) {
          if (zRadius > maxZoneRadius) {
            maxZoneRadius = zRadius;
            matchingZoneDescription = `Uncertainty Zone (${zRadius.toFixed(1)} nm radius)`;
          }
        }
      });

      if (maxZoneRadius > 0) {
        uncertaintyMagnitudeScore = Math.min(100, Math.round(50 + maxZoneRadius * 6));
        expectedUncertaintyReductionPct = Math.min(85, Math.round(40 + maxZoneRadius * 4));
      }
    }

    // 5. POTENTIAL RECOMMENDATION SHIFT SCORE (0 - 100)
    let potentialRecommendationShiftScore = 30;
    if (spatialOverlapPct > 50 && routeSensitivityRelevance > 60) {
      potentialRecommendationShiftScore = Math.min(95, Math.round((spatialOverlapPct * 0.5) + (routeSensitivityRelevance * 0.5)));
    }

    // 6. RESOLUTION RELEVANCE SCORE (0 - 100)
    let resolutionRelevanceScore = 60;
    const resMeters = ('resolutionMeters' in product && product.resolutionMeters) || 20;
    if (resMeters <= 10) resolutionRelevanceScore = 95;
    else if (resMeters <= 30) resolutionRelevanceScore = 80;
    else if (resMeters <= 100) resolutionRelevanceScore = 60;
    else resolutionRelevanceScore = 40;

    // 7. ACQUISITION COST & CONNECTIVITY PENALTIES (0 - 100)
    let acquisitionCostPenalty = 0;
    if (sizeMb > 200) acquisitionCostPenalty = 40;
    else if (sizeMb > 100) acquisitionCostPenalty = 25;
    else if (sizeMb > 50) acquisitionCostPenalty = 10;

    let connectivityCostPenalty = 0;
    if (connectionState === 'LIMITED') {
      connectivityCostPenalty = Math.min(60, Math.round(sizeMb * 0.2));
    } else if (connectionState === 'OFFLINE') {
      connectivityCostPenalty = 0; // Offline preserves engineering index score for queue sorting
    }

    // BANDWIDTH BUDGET EVALUATION
    const withinBandwidthBudget =
      availableBandwidthMb === null || availableBandwidthMb === undefined
        ? true
        : sizeMb <= availableBandwidthMb;

    // DETERMINISTIC ENGINEERING PRIORITY INDEX SCORE (0 - 100)
    const rawScore =
      0.25 * spatialOverlapPct +
      0.20 * uncertaintyMagnitudeScore +
      0.20 * routeSensitivityRelevance +
      0.15 * temporalRelevancePct +
      0.10 * resolutionRelevanceScore +
      0.10 * potentialRecommendationShiftScore -
      0.05 * acquisitionCostPenalty -
      0.05 * connectivityCostPenalty;

    const engineeringPriorityIndex = Math.max(0, Math.min(100, Math.round(rawScore)));

    // CLASSIFY PRIORITY LEVEL
    let priority: DataAcquisitionPriority = 'LOW';
    if (engineeringPriorityIndex >= 75) priority = 'CRITICAL';
    else if (engineeringPriorityIndex >= 55) priority = 'HIGH';
    else if (engineeringPriorityIndex >= 35) priority = 'MEDIUM';

    // AVAILABILITY STATUS DETERMINATION
    let availabilityStatus: ProductAvailabilityStatus = 'AVAILABLE_FOR_DOWNLINK';
    if (connectionState === 'OFFLINE') {
      availabilityStatus = 'READY_WHEN_CONNECTED';
    } else if (!withinBandwidthBudget) {
      availabilityStatus = 'EXCEEDS_BANDWIDTH';
    } else if ('availability' in product && product.availability === 'Acquired') {
      availabilityStatus = 'ACQUIRED';
    } else if (connectionState === 'SYNCING') {
      availabilityStatus = 'READY_WHEN_CONNECTED';
    }

    // EXPLANATION GENERATION
    let reason = '';
    const routeName = recommendedRoute ? recommendedRoute.name : 'Active Corridor';

    if (spatialOverlapPct > 50 && uncertaintyMagnitudeScore > 50) {
      reason = `High priority (Index ${engineeringPriorityIndex}/100) because the product overlaps ${spatialOverlapPct}% of ${routeName} and addresses an expanded ${matchingZoneDescription}.`;
    } else if (spatialOverlapPct > 50) {
      reason = `Moderate priority (Index ${engineeringPriorityIndex}/100) because the product overlaps ${spatialOverlapPct}% of ${routeName}.`;
    } else if (spatialOverlapPct <= 20) {
      reason = `Low priority (Index ${engineeringPriorityIndex}/100) because the acquisition footprint does not significantly overlap ${routeName}.`;
    } else {
      reason = `Priority Index ${engineeringPriorityIndex}/100 based on spatial coverage (${spatialOverlapPct}%) and sensor resolution relevance (${resolutionRelevanceScore}%).`;
    }

    if (connectionState === 'OFFLINE') {
      reason += ' Status: Queued (READY_WHEN_CONNECTED) until online connectivity is restored.';
    } else if (!withinBandwidthBudget) {
      reason += ` Status: Exceeds current bandwidth budget (${sizeMb} MB > ${availableBandwidthMb} MB available).`;
    }

    // SAR EVIDENCE NOTE (Explicit scientific distinction: SAR candidates are candidate regions, NOT confirmed icebergs)
    let sarEvidenceNote: string | undefined = undefined;
    if (sensor.toLowerCase().includes('sar') || productType.toLowerCase().includes('sar')) {
      if (sarCandidateRegionsCount > 0) {
        sarEvidenceNote = `Covers ${sarCandidateRegionsCount} physically plausible SAR evidence/candidate region(s). Note: SAR backscatter targets represent candidate evidence regions, not confirmed icebergs.`;
      } else {
        sarEvidenceNote = 'Provides surface SAR backscatter evidence. Note: SAR features represent candidate evidence regions, not confirmed icebergs.';
      }
    }

    // PROVENANCE DETERMINATION
    let provenance = 'REAL';
    if ('provenance' in product && typeof product.provenance === 'string') {
      provenance = product.provenance;
    } else if ('isSynthetic' in product && product.isSynthetic) {
      provenance = 'SIMULATED';
    }

    const confidenceLevel: ConfidenceLevel | 'UNAVAILABLE' =
      decisionConfidence?.overallLevel || 'UNAVAILABLE';

    const scoreBreakdown: AcquisitionCandidateScoreBreakdown = {
      spatialOverlapPct,
      temporalRelevancePct,
      routeSensitivityRelevance,
      uncertaintyMagnitudeScore,
      potentialRecommendationShiftScore,
      freshnessBenefitScore: temporalRelevancePct,
      productAvailabilityScore: withinBandwidthBudget ? 90 : 30,
      resolutionRelevanceScore,
      acquisitionCostPenalty,
      connectivityCostPenalty,
    };

    return {
      productId,
      productName,
      sensor,
      productType,
      engineeringPriorityIndex,
      priority,
      availabilityStatus,
      affectedDecision: `Navigation Corridor & Route Choice (${routeName})`,
      affectedRouteName: routeName,
      uncertaintyAddressed: matchingZoneDescription,
      expectedDecisionImpact:
        potentialRecommendationShiftScore > 60
          ? 'Potential route recommendation shift or corridor risk reduction'
          : 'Refines spatial uncertainty boundaries along active corridor',
      expectedUncertaintyReductionPct,
      acquisitionCostMb: sizeMb,
      withinBandwidthBudget,
      reason,
      provenance,
      confidenceLevel,
      freshnessState,
      footprint,
      scoreBreakdown,
      sarEvidenceNote,
      rawProductMetadata: product,
    };
  });

  // DETERMINISTIC SORTING: Order by Engineering Priority Index descending, tie-break by productId ascending
  rankedCandidates.sort((a, b) => {
    if (b.engineeringPriorityIndex !== a.engineeringPriorityIndex) {
      return b.engineeringPriorityIndex - a.engineeringPriorityIndex;
    }
    return a.productId.localeCompare(b.productId);
  });

  const eligibleWithinBandwidthCount = rankedCandidates.filter((c) => c.withinBandwidthBudget).length;
  const dominantAcquisitionPriority = rankedCandidates[0]?.priority || 'LOW';

  const rankingTimestamp = new Date().toISOString();

  const explanation = `Evaluated ${rankedCandidates.length} candidate data product(s) under ${connectionState} connectivity. ${eligibleWithinBandwidthCount} product(s) fit bandwidth constraints. Highest engineering priority index: ${rankedCandidates[0]?.engineeringPriorityIndex || 0}/100 (${dominantAcquisitionPriority}).`;

  return {
    rankedCandidates,
    totalCandidatesEvaluated: rankedCandidates.length,
    eligibleWithinBandwidthCount,
    connectionState,
    availableBandwidthMb,
    dominantAcquisitionPriority,
    rankingTimestamp,
    explanation,
    isTestFixture,
  };
}
