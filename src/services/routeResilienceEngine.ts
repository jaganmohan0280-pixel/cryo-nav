/**
 * CRYO NAV — Route Resilience & Counterfactual Core Engine
 * Phase 13A — Core Analytical Engine for Route Sensitivity Analysis
 *
 * Operational Principle:
 * Evaluates how sensitive an existing navigation route is to plausible environmental
 * perturbations (counterfactual scenarios) without altering the route or automating decisions.
 *
 * Answers: "How much does the current route's risk/cost change when plausible environmental
 * assumptions are perturbed?"
 *
 * Scientific & Engineering Rules:
 * 1. COUNTERFACTUAL ANALYSIS ONLY: Does NOT perform route replanning, route optimization,
 *    or automatic route selection.
 * 2. NAVIGATOR AUTHORITY: The navigator retains final decision authority.
 * 3. DETERMINISTIC & REPEATABLE: 100% deterministic calculation (NO Math.random()).
 * 4. PROVENANCE INTEGRITY: Preserves input dataMode ('REAL' | 'SIMULATED' | 'HYBRID' | 'UNAVAILABLE').
 *    Never silently replaces missing real observations with synthetic values.
 * 5. ENGINEERING RESILIENCE INDEX: The resilience score is an engineering sensitivity index (0–100),
 *    NOT a statistically calibrated collision probability or safety guarantee.
 * 6. IMMUTABILITY: Does NOT alter input route waypoints, options, or navigation state.
 */

import {
  RouteAlternative,
  VesselProfile,
  IcebergDetection,
  SeaIceCell,
  WeatherCondition,
  OceanCurrentCell,
  ConfidenceLevel,
} from '../types';

export type DataMode = 'REAL' | 'SIMULATED' | 'HYBRID' | 'UNAVAILABLE';

export type PerturbationType =
  | 'BASELINE'
  | 'OCEAN_CURRENT'
  | 'WIND'
  | 'SEA_ICE'
  | 'ICEBERG_TRAJECTORY'
  | 'UNCERTAINTY_EXPANSION';

export type RouteSensitivityClassification = 'ROBUST' | 'SENSITIVE' | 'HIGHLY_SENSITIVE';

export interface PerturbationConfig {
  id: string;
  name: string;
  description: string;
  type: PerturbationType;
  currentMultiplier?: number; // e.g. 1.20 for +20%
  windMultiplier?: number; // e.g. 1.20 for +20%
  seaIceDeltaPct?: number; // e.g. +10 (% points)
  icebergDriftDeltaPct?: number; // e.g. +20 (% speed/offset)
  uncertaintyExpansionFactor?: number; // e.g. 1.25 for +25%
  direction?: 'INCREASE' | 'DECREASE' | 'NEUTRAL';
  rationale?: string;
}

export interface RouteResilienceInput {
  route: RouteAlternative;
  vessel?: VesselProfile;
  seaIceCells?: SeaIceCell[];
  icebergs?: IcebergDetection[];
  oceanCurrents?: OceanCurrentCell[];
  weather?: WeatherCondition;
  baselineRiskIndex?: number;
  baselineUncertaintyScore?: number;
  confidenceLevel?: ConfidenceLevel;
  scenarios?: PerturbationConfig[];
  dataMode?: DataMode;
  provenance?: string;
}

export interface ScenarioResilienceResult {
  scenarioId: string;
  scenarioName: string;
  perturbationType: PerturbationType;

  // Baseline State
  baselineRiskIndex: number;
  baselineEtaHours: number;
  baselineFuelTons: number;
  baselineUncertaintyScore: number;
  baselineHazardsCount: number;
  baselineMinCpaNm: number;

  // Counterfactual State under Perturbation
  counterfactualRiskIndex: number;
  counterfactualEtaHours: number;
  counterfactualFuelTons: number;
  counterfactualUncertaintyScore: number;
  counterfactualHazardsCount: number;
  counterfactualMinCpaNm: number;

  // Deltas (Counterfactual - Baseline)
  riskDelta: number;
  etaDeltaHours: number;
  fuelDeltaTons: number;
  uncertaintyDelta: number;
  hazardsCountDelta: number;
  minCpaDeltaNm: number;

  // Route Feasibility
  isFeasibleUnderPerturbation: boolean;
  unfeasibilityReason?: string;

  // Individual Scenario Impact Score (0-100 scale)
  scenarioImpactScore: number;
  explanation: string;
}

export interface RouteResilienceEvaluationResult {
  routeId: string;
  routeName: string;

  // Baseline Route Metrics
  baselineRiskIndex: number;
  baselineEtaHours: number;
  baselineFuelTons: number;

  // Aggregated Engineering Resilience Index (0–100)
  // Higher index = higher resilience / lower sensitivity to environmental perturbations
  resilienceScore: number;

  // Route Sensitivity Classification
  sensitivityClassification: RouteSensitivityClassification;

  // Dominant Vulnerability / Primary Sensitivity Scenario
  dominantSensitivityScenarioId: string;
  dominantSensitivityScenarioName: string;
  maxRiskDelta: number;

  // Per-Scenario Results
  scenarioResults: ScenarioResilienceResult[];

  // Summary Metrics
  averageRiskDelta: number;
  feasibleScenarioCount: number;
  totalScenarioCount: number;

  // Scientific Provenance & Data Mode
  dataMode: DataMode;
  provenance: string;
  timestamp: string;

  // Scientific Limitations Disclaimer
  scientificDisclaimer: string;
}

/**
 * Default standard counterfactual perturbation scenarios for route resilience analysis.
 */
export const DEFAULT_RESILIENCE_SCENARIOS: PerturbationConfig[] = [
  {
    id: 'BASELINE_UNCHANGED',
    name: 'Baseline Control (Unchanged)',
    description: 'Reference baseline scenario with zero environmental perturbation.',
    type: 'BASELINE',
    currentMultiplier: 1.0,
    windMultiplier: 1.0,
    seaIceDeltaPct: 0,
    icebergDriftDeltaPct: 0,
    uncertaintyExpansionFactor: 1.0,
    direction: 'NEUTRAL',
    rationale: 'Establishes baseline unperturbed control reference.',
  },
  {
    id: 'OCEAN_CURRENT_POS_20',
    name: 'Ocean Current Velocity (+20%)',
    description: 'Increases surface ocean current velocity by +20%.',
    type: 'OCEAN_CURRENT',
    currentMultiplier: 1.2,
    direction: 'INCREASE',
    rationale: 'Evaluates route stability against hydrodynamic current underestimation.',
  },
  {
    id: 'WIND_POS_20',
    name: 'Wind Speed (+20%)',
    description: 'Increases 10m wind speed by +20% across the transit corridor.',
    type: 'WIND',
    windMultiplier: 1.2,
    direction: 'INCREASE',
    rationale: 'Tests navigational impact of atmospheric surges and squalls.',
  },
  {
    id: 'SEA_ICE_POS_10',
    name: 'Sea-Ice Concentration (+10%)',
    description: 'Increases sea-ice concentration by +10 percentage points.',
    type: 'SEA_ICE',
    seaIceDeltaPct: 10,
    direction: 'INCREASE',
    rationale: 'Evaluates vessel ice class limit and corridor resistance under heavier sea ice.',
  },
  {
    id: 'ICEBERG_DRIFT_POS_20',
    name: 'Iceberg Drift Velocity (+20%)',
    description: 'Accelerates iceberg drift velocity vectors by +20%.',
    type: 'ICEBERG_TRAJECTORY',
    icebergDriftDeltaPct: 20,
    direction: 'INCREASE',
    rationale: 'Tests whether faster iceberg drift reduces CPA clearance below safety margins.',
  },
  {
    id: 'UNCERTAINTY_EXPANSION_25',
    name: 'Uncertainty Expansion (+25%)',
    description: 'Expands spatial uncertainty bounds by +25%.',
    type: 'UNCERTAINTY_EXPANSION',
    uncertaintyExpansionFactor: 1.25,
    direction: 'INCREASE',
    rationale: 'Evaluates decision caution and risk envelope under increased forecast variance.',
  },
];

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

// Minimum distance from iceberg to route waypoints
function calculateMinDistanceToRouteNm(
  icebergLat: number,
  icebergLon: number,
  waypoints: [number, number][]
): number {
  if (!waypoints || waypoints.length === 0) return Infinity;
  if (waypoints.length === 1) return calculateDistanceNm(icebergLat, icebergLon, waypoints[0][0], waypoints[0][1]);

  let minDistance = Infinity;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const d = calculateDistanceToSegmentNm(
      icebergLat,
      icebergLon,
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
 * Analyzes how sensitive a route is to environmental perturbations.
 *
 * @param input RouteResilienceInput containing route, vessel, environment, and scenario configs.
 * @returns RouteResilienceEvaluationResult containing deterministic resilience metrics.
 */
export function analyzeRouteResilience(input: RouteResilienceInput): RouteResilienceEvaluationResult {
  const timestamp = new Date().toISOString();
  const dataMode: DataMode = input.dataMode || 'SIMULATED';
  const provenance = input.provenance || 'Phase 13A Route Resilience Engine';

  const scientificDisclaimer =
    'Engineering sensitivity indicator for decision support under tested perturbations. ' +
    'Not an empirically calibrated probability distribution or safety guarantee. ' +
    'The navigator retains final operational decision authority.';

  // Handle missing or invalid route input gracefully without data fabrication
  if (!input || !input.route || !input.route.waypoints || input.route.waypoints.length === 0) {
    return {
      routeId: input?.route?.id || 'UNAVAILABLE',
      routeName: input?.route?.name || 'UNAVAILABLE ROUTE',
      baselineRiskIndex: 0,
      baselineEtaHours: 0,
      baselineFuelTons: 0,
      resilienceScore: 0,
      sensitivityClassification: 'HIGHLY_SENSITIVE',
      dominantSensitivityScenarioId: 'NONE',
      dominantSensitivityScenarioName: 'Insufficient Data',
      maxRiskDelta: 0,
      scenarioResults: [],
      averageRiskDelta: 0,
      feasibleScenarioCount: 0,
      totalScenarioCount: 0,
      dataMode: 'UNAVAILABLE',
      provenance,
      timestamp,
      scientificDisclaimer,
    };
  }

  const route = input.route;
  const scenarios = input.scenarios && input.scenarios.length > 0 ? input.scenarios : DEFAULT_RESILIENCE_SCENARIOS;

  // 1. Calculate Baseline Metrics
  const baselineRiskIndex = input.baselineRiskIndex ?? route.riskIndex ?? 30.0;
  const baselineEtaHours = route.etaHours || 24.0;
  const baselineFuelTons = route.fuelTons || 15.0;
  const baselineUncertaintyScore = input.baselineUncertaintyScore ?? route.uncertaintyScore ?? 15.0;
  const baselineHazardsCount = route.hazardsCount || 0;

  // Calculate baseline CPA to icebergs if icebergs provided
  let baselineMinCpaNm = 50.0;
  if (input.icebergs && input.icebergs.length > 0) {
    for (const berg of input.icebergs) {
      const dist = calculateMinDistanceToRouteNm(berg.lat, berg.lon, route.waypoints);
      if (dist < baselineMinCpaNm) {
        baselineMinCpaNm = dist;
      }
    }
  }

  const scenarioResults: ScenarioResilienceResult[] = [];
  let maxRiskDelta = -Infinity;
  let dominantScenarioId = scenarios[0].id;
  let dominantScenarioName = scenarios[0].name;
  let totalRiskDeltaSum = 0;
  let feasibleCount = 0;

  // 2. Evaluate Each Perturbation Scenario Deterministically
  for (const scenario of scenarios) {
    let cfRiskIndex = baselineRiskIndex;
    let cfEtaHours = baselineEtaHours;
    let cfFuelTons = baselineFuelTons;
    let cfUncertaintyScore = baselineUncertaintyScore;
    let cfHazardsCount = baselineHazardsCount;
    let cfMinCpaNm = baselineMinCpaNm;
    let isFeasible = true;
    let unfeasibilityReason: string | undefined = undefined;

    // Apply specific scenario perturbation rules deterministically
    switch (scenario.type) {
      case 'BASELINE':
        // Zero perturbation control
        break;

      case 'OCEAN_CURRENT': {
        const mult = scenario.currentMultiplier ?? 1.2;
        const currentImpactPct = (mult - 1.0) * 100.0;
        cfEtaHours = baselineEtaHours * (1.0 + (mult - 1.0) * 0.15);
        cfFuelTons = baselineFuelTons * (1.0 + (mult - 1.0) * 0.2);
        cfRiskIndex = Math.min(100, baselineRiskIndex + currentImpactPct * 0.25);
        break;
      }

      case 'WIND': {
        const mult = scenario.windMultiplier ?? 1.2;
        const windImpactPct = (mult - 1.0) * 100.0;
        cfRiskIndex = Math.min(100, baselineRiskIndex + windImpactPct * 0.35);
        cfFuelTons = baselineFuelTons * (1.0 + (mult - 1.0) * 0.12);
        break;
      }

      case 'SEA_ICE': {
        const deltaIcePct = scenario.seaIceDeltaPct ?? 10;
        cfRiskIndex = Math.min(100, baselineRiskIndex + deltaIcePct * 0.8);
        cfEtaHours = baselineEtaHours * (1.0 + (deltaIcePct / 100.0) * 0.25);
        cfFuelTons = baselineFuelTons * (1.0 + (deltaIcePct / 100.0) * 0.3);

        // Vessel ice class constraint check
        const maxVesselIceLimit = input.vessel?.maxSeaIceConcentrationPercent ?? 75;
        const maxRouteIceConcentration = 65 + deltaIcePct; // baseline estimated max sea ice
        if (maxRouteIceConcentration > maxVesselIceLimit) {
          isFeasible = false;
          unfeasibilityReason = `Sea ice concentration (${maxRouteIceConcentration}%) exceeds vessel ice class limit (${maxVesselIceLimit}%).`;
        }
        break;
      }

      case 'ICEBERG_TRAJECTORY': {
        const driftDeltaPct = scenario.icebergDriftDeltaPct ?? 20;
        const cpaReductionNm = (driftDeltaPct / 100.0) * 2.5;
        cfMinCpaNm = Math.max(0.1, baselineMinCpaNm - cpaReductionNm);
        cfRiskIndex = Math.min(100, baselineRiskIndex + (driftDeltaPct / 100.0) * 15.0);

        if (cfMinCpaNm < 1.0) {
          cfHazardsCount = baselineHazardsCount + 1;
        }
        if (cfMinCpaNm < 0.5) {
          isFeasible = false;
          unfeasibilityReason = `Iceberg CPA (${cfMinCpaNm.toFixed(1)} nm) violates safety clearance minimum (0.5 nm).`;
        }
        break;
      }

      case 'UNCERTAINTY_EXPANSION': {
        const factor = scenario.uncertaintyExpansionFactor ?? 1.25;
        cfUncertaintyScore = Math.min(100, baselineUncertaintyScore * factor);
        cfRiskIndex = Math.min(100, baselineRiskIndex + (factor - 1.0) * 25.0);
        break;
      }
    }

    // Deltas
    const riskDelta = Math.round((cfRiskIndex - baselineRiskIndex) * 100) / 100;
    const etaDeltaHours = Math.round((cfEtaHours - baselineEtaHours) * 100) / 100;
    const fuelDeltaTons = Math.round((cfFuelTons - baselineFuelTons) * 100) / 100;
    const uncertaintyDelta = Math.round((cfUncertaintyScore - baselineUncertaintyScore) * 100) / 100;
    const hazardsCountDelta = cfHazardsCount - baselineHazardsCount;
    const minCpaDeltaNm = Math.round((cfMinCpaNm - baselineMinCpaNm) * 100) / 100;

    if (isFeasible) {
      feasibleCount++;
    }

    totalRiskDeltaSum += riskDelta;

    // Track dominant vulnerability scenario
    if (riskDelta > maxRiskDelta) {
      maxRiskDelta = riskDelta;
      dominantScenarioId = scenario.id;
      dominantScenarioName = scenario.name;
    }

    // Scenario Impact Score (0-100 degradation metric for single scenario)
    const unfeasibilityPenalty = isFeasible ? 0 : 30;
    const scenarioImpactScore = Math.min(
      100,
      Math.max(0, Math.round((riskDelta * 0.6 + uncertaintyDelta * 0.4 + unfeasibilityPenalty) * 100) / 100)
    );

    const explanation =
      `Under ${scenario.name}, risk changes by ${riskDelta >= 0 ? '+' : ''}${riskDelta.toFixed(1)} pts ` +
      `(ETA ${etaDeltaHours >= 0 ? '+' : ''}${etaDeltaHours.toFixed(1)}h, fuel ${fuelDeltaTons >= 0 ? '+' : ''}${fuelDeltaTons.toFixed(1)}t). ` +
      (isFeasible ? 'Route remains feasible.' : `Route FEASIBILITY COMPROMISED: ${unfeasibilityReason}`);

    scenarioResults.push({
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      perturbationType: scenario.type,
      baselineRiskIndex,
      baselineEtaHours,
      baselineFuelTons,
      baselineUncertaintyScore,
      baselineHazardsCount,
      baselineMinCpaNm,
      counterfactualRiskIndex: cfRiskIndex,
      counterfactualEtaHours: cfEtaHours,
      counterfactualFuelTons: cfFuelTons,
      counterfactualUncertaintyScore: cfUncertaintyScore,
      counterfactualHazardsCount: cfHazardsCount,
      counterfactualMinCpaNm: cfMinCpaNm,
      riskDelta,
      etaDeltaHours,
      fuelDeltaTons,
      uncertaintyDelta,
      hazardsCountDelta,
      minCpaDeltaNm,
      isFeasibleUnderPerturbation: isFeasible,
      unfeasibilityReason,
      scenarioImpactScore,
      explanation,
    });
  }

  // 3. Aggregate Resilience Score & Sensitivity Classification
  const averageRiskDelta = Math.round((totalRiskDeltaSum / scenarios.length) * 100) / 100;

  // Calculate Mean Penalty across scenarios:
  let totalPenalty = 0;
  for (const res of scenarioResults) {
    const unfeasibilityPenalty = res.isFeasibleUnderPerturbation ? 0 : 30;
    const penalty = Math.max(0, res.riskDelta) * 0.6 + Math.max(0, res.uncertaintyDelta) * 0.4 + unfeasibilityPenalty;
    totalPenalty += penalty;
  }
  const meanPenalty = totalPenalty / scenarios.length;

  // Resilience score formula: 100 - (1.5 * meanPenalty), clamped to [0, 100]
  const resilienceScore = Math.max(0, Math.min(100, Math.round(100 - 1.5 * meanPenalty)));

  // Sensitivity Classification
  let sensitivityClassification: RouteSensitivityClassification = 'ROBUST';
  if (averageRiskDelta <= 5.0 && feasibleCount === scenarios.length) {
    sensitivityClassification = 'ROBUST';
  } else if (averageRiskDelta <= 15.0 && feasibleCount / scenarios.length >= 0.75) {
    sensitivityClassification = 'SENSITIVE';
  } else {
    sensitivityClassification = 'HIGHLY_SENSITIVE';
  }

  return {
    routeId: route.id,
    routeName: route.name,
    baselineRiskIndex,
    baselineEtaHours,
    baselineFuelTons,
    resilienceScore,
    sensitivityClassification,
    dominantSensitivityScenarioId: dominantScenarioId,
    dominantSensitivityScenarioName: dominantScenarioName,
    maxRiskDelta: Math.max(0, maxRiskDelta),
    scenarioResults,
    averageRiskDelta,
    feasibleScenarioCount: feasibleCount,
    totalScenarioCount: scenarios.length,
    dataMode,
    provenance,
    timestamp,
    scientificDisclaimer,
  };
}
