/**
 * CRYO NAV — Counterfactual & Sensitivity Analysis Engine
 * Phase 5 — Structured WHAT-IF Decision Support Analysis
 *
 * Objective:
 * Tests whether the current navigation decision remains stable when important
 * environmental assumptions are perturbed.
 *
 * Answers: "If the predicted environmental conditions change, does the recommended route change?"
 *
 * Principles:
 * 1. NOT intended to predict future reality or digital twin state.
 * 2. Clearly distinguishes BASELINE from COUNTERFACTUAL SCENARIO.
 * 3. Does NOT describe sensitivity as a statistical probability.
 * 4. Preserves baseline real data integrity (COUNTERFACTUAL SCENARIO — NOT OBSERVED DATA).
 * 5. Integrates Phase 4 Decision Confidence.
 */

import {
  MissionConfig,
  VesselProfile,
  IcebergDetection,
  SeaIceCell,
  WeatherCondition,
  OceanCurrentCell,
  RouteAlternative,
  ConfidenceLevel,
  DecisionConfidenceResult,
  EnvironmentalDataMode,
  EnvironmentalAlignmentResult,
  CounterfactualParameter,
  CounterfactualScenario,
  CounterfactualRouteResult,
  CounterfactualExplanation,
  CounterfactualProvenance,
  RouteStability,
  SensitivityResult,
  BatchSensitivitySummary,
} from '../types';
import { generateRouteAlternatives } from './routingEngine';
import { computeIcebergTrajectories } from './trajectoryModel';
import { evaluateDecisionConfidence } from './confidenceEngine';

export const DEFAULT_COUNTERFACTUAL_SCENARIOS: CounterfactualScenario[] = [
  {
    id: 'OCEAN_CURRENT_POS_20',
    name: 'Ocean Current Velocity (+20%)',
    description: 'Increases surface ocean current velocity by +20% across the domain.',
    parameter: 'OCEAN_CURRENT',
    perturbationValue: 20,
    units: '%',
    direction: 'INCREASE',
    rationale: 'Evaluates route stability against ocean current velocity underestimation in hydrodynamic reanalysis.',
    baselineReference: 'Copernicus Marine surface ocean currents (0.49m)',
  },
  {
    id: 'OCEAN_CURRENT_NEG_20',
    name: 'Ocean Current Velocity (-20%)',
    description: 'Decreases surface ocean current velocity by -20% across the domain.',
    parameter: 'OCEAN_CURRENT',
    perturbationValue: -20,
    units: '%',
    direction: 'DECREASE',
    rationale: 'Evaluates route sensitivity if tidal and geostrophic currents are weaker than modeled.',
    baselineReference: 'Copernicus Marine surface ocean currents (0.49m)',
  },
  {
    id: 'WIND_POS_20',
    name: 'Wind Speed (+20%)',
    description: 'Increases 10m wind speed by +20% across the transit corridor.',
    parameter: 'WIND',
    perturbationValue: 20,
    units: '%',
    direction: 'INCREASE',
    rationale: 'Tests navigational impact of katabatic wind surges or localized Antarctic squalls.',
    baselineReference: 'ECMWF IFS 10m wind forecast',
  },
  {
    id: 'WIND_NEG_20',
    name: 'Wind Speed (-20%)',
    description: 'Decreases 10m wind speed by -20% across the transit corridor.',
    parameter: 'WIND',
    perturbationValue: -20,
    units: '%',
    direction: 'DECREASE',
    rationale: 'Tests decision impact under calm surface atmospheric forcing conditions.',
    baselineReference: 'ECMWF IFS 10m wind forecast',
  },
  {
    id: 'ICEBERG_DRIFT_POS_20',
    name: 'Iceberg Drift Velocity (+20%)',
    description: 'Accelerates iceberg drift velocity vectors by +20%.',
    parameter: 'ICEBERG_DRIFT',
    perturbationValue: 20,
    units: '%',
    direction: 'INCREASE',
    rationale: 'Tests whether faster iceberg movement compromises CPA clearance corridors along planned routes.',
    baselineReference: 'USNIC Iceberg Observations & Kinematic Drift Model',
  },
  {
    id: 'ICEBERG_DRIFT_NEG_20',
    name: 'Iceberg Drift Velocity (-20%)',
    description: 'Decelerates iceberg drift velocity vectors by -20%.',
    parameter: 'ICEBERG_DRIFT',
    perturbationValue: -20,
    units: '%',
    direction: 'DECREASE',
    rationale: 'Tests whether slower iceberg translation stalls icebergs in primary navigation channels.',
    baselineReference: 'USNIC Iceberg Observations & Kinematic Drift Model',
  },
  {
    id: 'SEA_ICE_POS_10',
    name: 'Sea Ice Concentration (+10%)',
    description: 'Increases sea ice concentration by +10 percentage points across pack cells.',
    parameter: 'SEA_ICE_CONCENTRATION',
    perturbationValue: 10,
    units: 'percentage points',
    direction: 'INCREASE',
    rationale: 'Evaluates route tolerance if satellite concentration estimates underreport pack density.',
    baselineReference: 'Copernicus Marine sea ice concentration product',
  },
  {
    id: 'SEA_ICE_NEG_10',
    name: 'Sea Ice Concentration (-10%)',
    description: 'Decreases sea ice concentration by -10 percentage points across pack cells.',
    parameter: 'SEA_ICE_CONCENTRATION',
    perturbationValue: -10,
    units: 'percentage points',
    direction: 'DECREASE',
    rationale: 'Tests route corridor feasibility under unexpected ice lead opening.',
    baselineReference: 'Copernicus Marine sea ice concentration product',
  },
  {
    id: 'UNCERTAINTY_POS_25',
    name: 'Uncertainty Envelope (+25%)',
    description: 'Expands positional uncertainty radius and hazard margins by +25%.',
    parameter: 'UNCERTAINTY',
    perturbationValue: 25,
    units: '%',
    direction: 'EXPAND',
    rationale: 'Assesses decision robustness when positional error bounds and sensor aging expand.',
    baselineReference: 'Phase 3B/4 Uncertainty Engine',
  },
];

/**
 * Deep clones environmental inputs and applies controlled scenario mathematical perturbations.
 */
export function createPerturbedEnvironmentalState(
  scenario: CounterfactualScenario,
  seaIceCells: SeaIceCell[],
  oceanCurrents: OceanCurrentCell[],
  weather: WeatherCondition,
  icebergs: IcebergDetection[]
): {
  seaIceCells: SeaIceCell[];
  oceanCurrents: OceanCurrentCell[];
  weather: WeatherCondition;
  icebergs: IcebergDetection[];
  uncertaintyModifier: number;
} {
  const mult = 1 + scenario.perturbationValue / 100;
  let uncertaintyModifier = 1.0;

  // Clone objects
  const clonedSeaIce: SeaIceCell[] = seaIceCells.map((cell) => ({ ...cell }));
  const clonedCurrents: OceanCurrentCell[] = oceanCurrents.map((curr) => ({ ...curr }));
  const clonedWeather: WeatherCondition = { ...weather };
  const clonedIcebergs: IcebergDetection[] = icebergs.map((berg) => ({
    ...berg,
    predictedTrajectory: berg.predictedTrajectory
      ? berg.predictedTrajectory.map((pt) => ({ ...pt }))
      : [],
  }));



  switch (scenario.parameter) {
    case 'OCEAN_CURRENT':
      clonedCurrents.forEach((curr) => {
        curr.currentSpeedKnots = Number((curr.currentSpeedKnots * mult).toFixed(2));
        if (curr.uMetersPerSec !== undefined) curr.uMetersPerSec = Number((curr.uMetersPerSec * mult).toFixed(3));
        if (curr.vMetersPerSec !== undefined) curr.vMetersPerSec = Number((curr.vMetersPerSec * mult).toFixed(3));
      });
      break;

    case 'WIND':
      clonedWeather.windSpeedKnots = Number((clonedWeather.windSpeedKnots * mult).toFixed(1));
      if (clonedWeather.windSpeedMetersPerSec !== undefined) {
        clonedWeather.windSpeedMetersPerSec = Number((clonedWeather.windSpeedMetersPerSec * mult).toFixed(2));
      }
      if (clonedWeather.windGustKnots !== undefined) {
        clonedWeather.windGustKnots = Number((clonedWeather.windGustKnots * mult).toFixed(1));
      }
      break;

    case 'ICEBERG_DRIFT':
      clonedIcebergs.forEach((berg) => {
        berg.driftSpeedKnots = Number((berg.driftSpeedKnots * mult).toFixed(2));
        if (berg.predictedTrajectory) {
          berg.predictedTrajectory.forEach((pt) => {
            if (pt.driftSpeedKnots) pt.driftSpeedKnots = Number((pt.driftSpeedKnots * mult).toFixed(2));
            const dLat = pt.lat - berg.lat;
            const dLon = pt.lon - berg.lon;
            pt.lat = Number((berg.lat + dLat * mult).toFixed(4));
            pt.lon = Number((berg.lon + dLon * mult).toFixed(4));
          });
        }
      });
      break;

    case 'SEA_ICE_CONCENTRATION':
      clonedSeaIce.forEach((cell) => {
        const newConc = Math.max(0, Math.min(100, cell.concentrationPercent + scenario.perturbationValue));
        cell.concentrationPercent = Math.round(newConc);
      });
      break;

    case 'UNCERTAINTY':
      uncertaintyModifier = mult;
      clonedIcebergs.forEach((berg) => {
        berg.uncertaintyRadiusNm = Number((berg.uncertaintyRadiusNm * mult).toFixed(2));
        if (berg.predictedTrajectory) {
          berg.predictedTrajectory.forEach((pt) => {
            pt.uncertaintyRadiusNm = Number((pt.uncertaintyRadiusNm * mult).toFixed(2));
          });
        }
      });
      break;
  }

  return {
    seaIceCells: clonedSeaIce,
    oceanCurrents: clonedCurrents,
    weather: clonedWeather,
    icebergs: clonedIcebergs,
    uncertaintyModifier,
  };
}

/**
 * Runs a single counterfactual WHAT-IF scenario against current baseline state.
 */
export function runCounterfactualScenario(
  scenario: CounterfactualScenario,
  mission: MissionConfig,
  vessel: VesselProfile,
  seaIceCells: SeaIceCell[],
  oceanCurrents: OceanCurrentCell[],
  weather: WeatherCondition,
  icebergs: IcebergDetection[],
  baselineRoutes: RouteAlternative[],
  baselineConfidenceResult?: DecisionConfidenceResult,
  alignmentResult?: EnvironmentalAlignmentResult,
  mode: EnvironmentalDataMode = 'REAL'
): CounterfactualRouteResult {
  // Find baseline recommended route
  const baselineRec = baselineRoutes.find((r) => r.isRecommended) || baselineRoutes[1] || baselineRoutes[0];
  const baselineRecType = baselineRec.type;

  // 1. Create controlled mathematical perturbation
  const perturbed = createPerturbedEnvironmentalState(
    scenario,
    seaIceCells,
    oceanCurrents,
    weather,
    icebergs
  );

  const baselineConfLevel = baselineConfidenceResult?.overallLevel || baselineRec.confidence || 'HIGH';
  const baselineProvText = mode === 'REAL'
    ? 'Copernicus Marine sea ice & currents, USNIC iceberg observations, ECMWF IFS weather'
    : 'CRYO NAV Synthetic Antarctic Environmental Data';

  // Zero perturbation baseline reference shortcut
  if (scenario.perturbationValue === 0) {
    return {
      scenario,
      baselineRoute: baselineRec,
      scenarioRoute: baselineRec,
      baselineRecommendedType: baselineRecType,
      scenarioRecommendedType: baselineRecType,
      distanceChange: 0,
      etaChange: 0,
      fuelChange: 0,
      riskChange: 0,
      confidenceChange: 'Confidence classification remained unchanged.',
      baselineConfidence: baselineConfLevel,
      scenarioConfidence: baselineConfLevel,
      routeChanged: false,
      recommendationChanged: false,
      hazardsChanged: false,
      stability: 'ROBUST',
      explanation: {
        whatChanged: `${scenario.name} was evaluated with 0% perturbation (baseline reference check).`,
        whyItMatter: 'The zero-perturbation reference scenario matches baseline conditions exactly.',
        didRecommendationChange: `No. Recommended route remains ${baselineRecType}.`,
        newRecommendation: baselineRecType,
      },
      provenance: {
        baselineProvenance: baselineProvText,
        scenarioModification: 'BASELINE REFERENCE SCENARIO — NO PERTURBATION APPLIED',
      },
    };
  }


  // 2. Re-compute trajectories under scenario perturbation (skip if 0% perturbation or ICEBERG_DRIFT parameter)
  const scenarioIcebergs = (scenario.perturbationValue === 0 || scenario.parameter === 'ICEBERG_DRIFT')
    ? perturbed.icebergs
    : computeIcebergTrajectories(
        perturbed.icebergs,
        perturbed.weather,
        perturbed.oceanCurrents,
        1.0,
        mode,
        [],
        alignmentResult
      );



  // 3. Re-evaluate Decision Confidence for scenario (preserve baseline confidence unless scenario is UNCERTAINTY parameter)
  const scenarioConfidenceResult = (baselineConfidenceResult && scenario.parameter !== 'UNCERTAINTY')
    ? baselineConfidenceResult
    : evaluateDecisionConfidence({
        mode,
        unifiedEnvironment: alignmentResult,
        weather: perturbed.weather,
        currents: perturbed.oceanCurrents,
        icebergs: scenarioIcebergs,
        seaIceCells: perturbed.seaIceCells,
        forecastHorizonHours: 24,
      });


  // 4. Re-run routing calculation pipeline with perturbed state
  const scenarioRoutes = generateRouteAlternatives(
    mission,
    vessel,
    scenarioIcebergs,
    perturbed.seaIceCells,
    perturbed.weather,
    perturbed.uncertaintyModifier,
    scenarioConfidenceResult
  );

  // Find scenario recommended route (if decision blocked, fallback to cost minimum for research analytical view)
  let scenarioRec = scenarioRoutes.find((r) => r.isRecommended);
  if (!scenarioRec) {
    // If blocked, pick lowest total cost alternative for research comparison
    scenarioRec = [...scenarioRoutes].sort((a, b) => a.costBreakdown.totalCost - b.costBreakdown.totalCost)[0];
  }
  const scenarioRecType = scenarioRec.type;

  // 5. Calculate Deltas
  const distanceChange = Math.round(scenarioRec.distanceNm - baselineRec.distanceNm);
  const etaChange = Number((scenarioRec.etaHours - baselineRec.etaHours).toFixed(1));
  const fuelChange = Number((scenarioRec.fuelTons - baselineRec.fuelTons).toFixed(1));
  const riskChange = Math.round(scenarioRec.riskIndex - baselineRec.riskIndex);

  const routeChanged =
    baselineRec.waypoints.length !== scenarioRec.waypoints.length ||
    baselineRec.waypoints.some((wp, idx) => wp[0] !== scenarioRec.waypoints[idx]?.[0] || wp[1] !== scenarioRec.waypoints[idx]?.[1]);

  const recommendationChanged = baselineRecType !== scenarioRecType;
  const hazardDiff = Math.abs(scenarioRec.hazardsCount - baselineRec.hazardsCount);
  const hazardsChanged = hazardDiff > 0;

  // 6. Evaluate Route Stability State (Deterministic rule)
  let stability: RouteStability = 'ROBUST';
  if (recommendationChanged) {
    if (Math.abs(riskChange) > 15 || hazardDiff > 0 || routeChanged) {
      stability = 'HIGHLY_SENSITIVE';
    } else {
      stability = 'SENSITIVE';
    }
  } else if (Math.abs(riskChange) > 15 || hazardDiff > 1 || scenario.perturbationValue >= 40) {
    stability = 'HIGHLY_SENSITIVE';
  } else if (Math.abs(riskChange) > 5 || hazardDiff > 0 || routeChanged || scenario.perturbationValue >= 20) {
    stability = 'SENSITIVE';
  } else {
    stability = 'ROBUST';
  }


  // Confidence comparison
  const scenarioConfLevel = scenarioConfidenceResult.overallLevel;

  let confidenceChangeText = 'Confidence classification remained unchanged.';
  if (baselineConfLevel !== scenarioConfLevel) {
    confidenceChangeText = `Decision confidence changed from ${baselineConfLevel} to ${scenarioConfLevel}.`;
  }

  // 7. Format 3-Part Structured Natural Language Explanation
  const whatChanged = `${scenario.name} was perturbed by ${scenario.perturbationValue > 0 ? '+' : ''}${scenario.perturbationValue}${scenario.units}.`;

  let whyItMatter = '';
  if (recommendationChanged) {
    whyItMatter = `The perturbation increased hazard clearance risk in the primary corridor, making the ${scenarioRecType} route preferred over the baseline ${baselineRecType} route. (Risk Δ: ${riskChange > 0 ? '+' : ''}${riskChange}%, ETA Δ: ${etaChange > 0 ? '+' : ''}${etaChange}h).`;
  } else if (Math.abs(riskChange) > 5) {
    whyItMatter = `The perturbation altered route risk by ${riskChange > 0 ? '+' : ''}${riskChange}% and fuel burn by ${fuelChange > 0 ? '+' : ''}${fuelChange}t, but the baseline ${baselineRecType} route retains optimal multi-objective balance.`;
  } else {
    whyItMatter = `The perturbation had minimal impact on route risk (${riskChange > 0 ? '+' : ''}${riskChange}%) and hazard encounter points.`;
  }

  const didRecommendationChange = recommendationChanged
    ? `Yes. Recommended route changed from ${baselineRecType} to ${scenarioRecType}.`
    : `No. Recommended route remains ${baselineRecType}.`;

  const newRecommendation = scenarioRecType;

  const explanation: CounterfactualExplanation = {
    whatChanged,
    whyItMatter,
    didRecommendationChange,
    newRecommendation,
  };

  // 8. Format Data Provenance
  const scenarioModification = `COUNTERFACTUAL SCENARIO — NOT OBSERVED DATA: Applied ${scenario.perturbationValue > 0 ? '+' : ''}${scenario.perturbationValue}${scenario.units} override to baseline ${scenario.parameter} parameter.`;

  const provenance: CounterfactualProvenance = {
    baselineProvenance: baselineProvText,
    scenarioModification,
  };


  return {
    scenario,
    baselineRoute: baselineRec,
    scenarioRoute: scenarioRec,
    baselineRecommendedType: baselineRecType,
    scenarioRecommendedType: scenarioRecType,
    distanceChange,
    etaChange,
    fuelChange,
    riskChange,
    confidenceChange: confidenceChangeText,
    baselineConfidence: baselineConfLevel,
    scenarioConfidence: scenarioConfLevel,
    routeChanged,
    recommendationChanged,
    hazardsChanged,
    stability,
    explanation,
    provenance,
  };
}

/**
 * Runs a batch sensitivity analysis over all standard counterfactual scenarios.
 */
export function runBatchSensitivityAnalysis(
  mission: MissionConfig,
  vessel: VesselProfile,
  seaIceCells: SeaIceCell[],
  oceanCurrents: OceanCurrentCell[],
  weather: WeatherCondition,
  icebergs: IcebergDetection[],
  baselineRoutes: RouteAlternative[],
  baselineConfidenceResult?: DecisionConfidenceResult,
  alignmentResult?: EnvironmentalAlignmentResult,
  mode: EnvironmentalDataMode = 'REAL',
  scenarios: CounterfactualScenario[] = DEFAULT_COUNTERFACTUAL_SCENARIOS
): BatchSensitivitySummary {
  const results: CounterfactualRouteResult[] = scenarios.map((scenario) =>
    runCounterfactualScenario(
      scenario,
      mission,
      vessel,
      seaIceCells,
      oceanCurrents,
      weather,
      icebergs,
      baselineRoutes,
      baselineConfidenceResult,
      alignmentResult,
      mode
    )
  );

  // Group by parameter
  const parameterMap = new Map<CounterfactualParameter, CounterfactualRouteResult[]>();
  results.forEach((res) => {
    const param = res.scenario.parameter;
    if (!parameterMap.has(param)) parameterMap.set(param, []);
    parameterMap.get(param)!.push(res);
  });

  const parameterResults: SensitivityResult[] = [];
  let totalRecommendationChanges = 0;

  parameterMap.forEach((paramScenarios, param) => {
    const hasChange = paramScenarios.some((s) => s.recommendationChanged);
    const hasHighlySensitive = paramScenarios.some((s) => s.stability === 'HIGHLY_SENSITIVE');
    const recChangeCount = paramScenarios.filter((s) => s.recommendationChanged).length;
    totalRecommendationChanges += recChangeCount;

    let routeStability: RouteStability = 'ROBUST';
    if (hasHighlySensitive) routeStability = 'HIGHLY_SENSITIVE';
    else if (hasChange) routeStability = 'SENSITIVE';

    const maxRiskDelta = Math.max(...paramScenarios.map((s) => Math.abs(s.riskChange)));

    let dominantImpact = '';
    if (hasChange) {
      dominantImpact = `Route recommendation changes under tested ${param.replace('_', ' ')} perturbations.`;
    } else if (maxRiskDelta > 10) {
      dominantImpact = `Risk score shifts up to ±${maxRiskDelta}% without changing primary route recommendation.`;
    } else {
      dominantImpact = `Route recommendation remains robust under tested ${param.replace('_', ' ')} perturbations.`;
    }

    const explanation = `Tested ${paramScenarios.length} scenarios. Recommendation changed in ${recChangeCount}/${paramScenarios.length} tests.`;

    parameterResults.push({
      parameter: param,
      scenarios: paramScenarios,
      routeStability,
      sensitivityLevel: routeStability,
      dominantImpact,
      explanation,
    });
  });

  // Determine overall stability
  let overallStability: RouteStability = 'ROBUST';
  if (parameterResults.some((p) => p.routeStability === 'HIGHLY_SENSITIVE')) {
    overallStability = 'HIGHLY_SENSITIVE';
  } else if (parameterResults.some((p) => p.routeStability === 'SENSITIVE')) {
    overallStability = 'SENSITIVE';
  }

  // Find dominant sensitivity in tested scenarios
  let dominantSensitivity: CounterfactualParameter | null = null;
  let maxChanges = -1;
  let maxAvgRisk = -1;

  parameterResults.forEach((p) => {
    const changes = p.scenarios.filter((s) => s.recommendationChanged).length;
    const avgRisk = p.scenarios.reduce((sum, s) => sum + Math.abs(s.riskChange), 0) / Math.max(1, p.scenarios.length);

    if (changes > maxChanges || (changes === maxChanges && avgRisk > maxAvgRisk)) {
      maxChanges = changes;
      maxAvgRisk = avgRisk;
      dominantSensitivity = p.parameter;
    }
  });

  let dominantExplanation = '';
  if (dominantSensitivity && maxChanges > 0) {
    dominantExplanation = `Route recommendation is most sensitive to ${String(dominantSensitivity).replace('_', ' ')} perturbations in tested scenarios. Recommendation changed in ${maxChanges} scenario test(s).`;
  } else if (dominantSensitivity) {
    dominantExplanation = `Route recommendation is highly robust across all tested scenarios. Highest risk score variation observed in ${String(dominantSensitivity).replace('_', ' ')} perturbations (mean Δ: ${maxAvgRisk.toFixed(1)}%).`;
  } else {
    dominantExplanation = 'All tested environmental parameters demonstrated robust route recommendations.';
  }

  return {
    overallStability,
    dominantSensitivity,
    dominantExplanation,
    parameterResults,
    testedScenariosCount: results.length,
    recommendationChangedCount: totalRecommendationChanges,
    analysisTimestamp: new Date().toISOString(),
  };
}

/**
 * Single iceberg trajectory WHAT-IF test for IcebergsView.
 */
export function runIcebergTrajectoryWhatIf(
  iceberg: IcebergDetection,
  driftPerturbationPct: number,
  oceanCurrents: OceanCurrentCell[],
  weather: WeatherCondition,
  mode: EnvironmentalDataMode = 'REAL'
): {
  baselineTrajectory: IcebergDetection['predictedTrajectory'];
  scenarioTrajectory: IcebergDetection['predictedTrajectory'];
  closestApproachDeltaNm: number;
  routeImpactDescription: string;
} {
  const mult = 1 + driftPerturbationPct / 100;
  const perturbedBerg: IcebergDetection = {
    ...iceberg,
    driftSpeedKnots: Number((iceberg.driftSpeedKnots * mult).toFixed(2)),
  };

  const baselineComputed = computeIcebergTrajectories([iceberg], weather, oceanCurrents, 1.0, mode)[0];
  const scenarioComputed = computeIcebergTrajectories([perturbedBerg], weather, oceanCurrents, 1.0, mode)[0];


  const basePoints = baselineComputed.predictedTrajectory || [];
  const scenPoints = scenarioComputed.predictedTrajectory || [];

  const baseLast = basePoints[basePoints.length - 1];
  const scenLast = scenPoints[scenPoints.length - 1];

  let closestApproachDeltaNm = 0;
  if (baseLast && scenLast) {
    const latDiff = Math.abs(scenLast.lat - baseLast.lat);
    const lonDiff = Math.abs(scenLast.lon - baseLast.lon);
    closestApproachDeltaNm = Number((Math.sqrt(latDiff * latDiff + lonDiff * lonDiff) * 60).toFixed(1));
  }

  let routeImpactDescription = 'Minimal corridor impact';
  if (closestApproachDeltaNm > 3.0) {
    routeImpactDescription = 'Significant trajectory offset — may intersect primary transit corridor';
  } else if (closestApproachDeltaNm > 1.0) {
    routeImpactDescription = 'Moderate trajectory shift — monitor clearance margin';
  }

  return {
    baselineTrajectory: basePoints,
    scenarioTrajectory: scenPoints,
    closestApproachDeltaNm,
    routeImpactDescription,
  };
}
