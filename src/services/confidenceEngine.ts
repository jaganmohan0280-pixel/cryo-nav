/**
 * CRYO NAV — Uncertainty & Decision Confidence Engine
 * Phase 4 — Scientific Decision Support & Confidence Assessment
 *
 * OBJECTIVE:
 * Transform environmental quality, temporal alignment, spatial coverage, model uncertainty,
 * and forecast horizon signals into DECISION-LEVEL CONFIDENCE that directly affects system behavior.
 *
 * SCIENTIFIC & OPERATIONAL TRANSPARENCY:
 * The overall confidence score (0–100) is a DECISION-SUPPORT HEURISTIC and baseline operational assumption.
 * It is NOT a statistically calibrated probability bound and has not been operationally validated in sea trials.
 *
 * FACTOR CATEGORIES:
 * 1. DATA QUALITY
 * 2. DATA FRESHNESS
 * 3. TEMPORAL ALIGNMENT
 * 4. SPATIAL COVERAGE
 * 5. FORECAST HORIZON
 * 6. TRAJECTORY UNCERTAINTY
 * 7. SEA-ICE UNCERTAINTY
 * 8. WEATHER QUALITY
 * 9. OCEAN QUALITY
 * 10. MODEL LIMITATIONS
 */

import {
  ConfidenceLevel,
  ConfidenceFactorCategory,
  ConfidenceFactor,
  DecisionConfidenceResult,
  EnvironmentalAlignmentResult,
  SeaIceCell,
  IcebergDetection,
  WeatherCondition,
  OceanCurrentCell,
  EnvironmentalDataMode,
} from '../types';

/**
 * CONFIGURABLE THRESHOLDS SECTION
 * Store thresholds in one clearly documented configuration section so they can later
 * be replaced with scientifically validated values.
 */
export const CONFIDENCE_CONFIG = {
  freshnessThresholdsHours: {
    fresh: 6.0,
    aging: 24.0,
    stale: 72.0,
  },
  spatialCoverageThresholds: {
    complete: 0.9,
    partial: 0.5,
  },
  forecastHorizonThresholdsHours: {
    lowUncertainty: 24,
    moderateUncertainty: 48,
    highUncertainty: 72,
  },
  trajectoryUncertaintyThresholdsNm: {
    low: 4.0,
    moderate: 8.0,
    high: 15.0,
  },
  uncertaintyRiskMultiplier: {
    HIGH: 1.0,
    MEDIUM: 1.15,
    LOW: 1.4,
    CRITICAL: 2.0,
  },
  disclaimer:
    'Numeric confidence scores and threshold limits are decision-support heuristics and baseline operational assumptions. They are not statistically calibrated probability distributions and have not been operationally validated in sea trials.',
};

export interface ConfidenceEvaluationInput {
  unifiedEnvironment: EnvironmentalAlignmentResult;
  seaIceCells: SeaIceCell[];
  icebergs: IcebergDetection[];
  weather: WeatherCondition;
  currents: OceanCurrentCell[];
  forecastHorizonHours: number;
  mode: EnvironmentalDataMode;
}

/**
 * Evaluates decision-level confidence deterministically based on environmental alignment,
 * forecast horizon, sensor quality, spatial coverage, and trajectory model uncertainty.
 */
export function evaluateDecisionConfidence(input: ConfidenceEvaluationInput): DecisionConfidenceResult {
  const {
    unifiedEnvironment,
    seaIceCells,
    icebergs,
    weather,
    currents,
    forecastHorizonHours,
    mode,
  } = input;

  const timestamp = new Date().toISOString();
  const factors: ConfidenceFactor[] = [];
  const warnings: string[] = [...(unifiedEnvironment?.warnings || [])];
  const limitations: string[] = [
    'Baseline 2D kinematic drift model assumption (C_wind = 0.025 sail windage ratio)',
    'No 3D keel hydrodynamics or ocean velocity stratification profile',
    'No bathymetric grounding, shoal friction, or sea floor interaction model',
    'No thermodynamic ice melt, solar radiation deterioration, or calving wave drift',
    'Not operationally validated against sea-trial telemetry',
  ];
  const requiredActions: string[] = [];
  const recommendedVerificationActions: string[] = [];

  // ----------------------------------------------------
  // 1. DATA QUALITY FACTOR
  // ----------------------------------------------------
  const overallQuality = unifiedEnvironment?.overallQuality || 'UNAVAILABLE';
  let qualityScore = 95;
  let qualityStatus: ConfidenceFactor['status'] = 'GOOD';
  let qualityExp = 'All environmental input pipelines reporting valid structural integrity.';

  if (overallQuality === 'UNAVAILABLE') {
    qualityScore = 10;
    qualityStatus = 'CRITICAL';
    qualityExp = 'Critical environmental pipelines unavailable or unreachable.';
  } else if (overallQuality === 'DEGRADED') {
    qualityScore = 40;
    qualityStatus = 'DEGRADED';
    qualityExp = 'One or more required environmental sources reporting missing or corrupt data.';
  } else if (overallQuality === 'PARTIAL') {
    qualityScore = 70;
    qualityStatus = 'ACCEPTABLE';
    qualityExp = 'Environmental state relies on partial coverage or auxiliary telemetry.';
  }

  factors.push({
    factorName: 'Overall Data Quality',
    category: 'DATA QUALITY',
    status: qualityStatus,
    contributionScore: qualityScore,
    explanation: qualityExp,
    source: `Unified Environmental Engine (${mode} mode)`,
    timestamp,
  });

  // ----------------------------------------------------
  // 2. DATA FRESHNESS FACTOR
  // ----------------------------------------------------
  const sources = unifiedEnvironment?.sources;
  const getAgeHours = (summary: any): number | null => {
    if (!summary) return null;
    if (summary.timeDiffHours !== null && !isNaN(summary.timeDiffHours)) return summary.timeDiffHours;
    if (mode === 'DEMO' && summary.quality === 'VALID') return 0.0;
    return null;
  };

  const seaIceAge = getAgeHours(sources?.seaIce);
  const weatherAge = getAgeHours(sources?.weather);
  const oceanAge = getAgeHours(sources?.ocean);
  const icebergAge = getAgeHours(sources?.icebergs);

  const validAges = [seaIceAge, weatherAge, oceanAge, icebergAge].filter((a): a is number => a !== null);
  const maxDataAgeHours = validAges.length > 0 ? Math.max(...validAges) : (mode === 'REAL' ? 999 : 0.0);

  let freshnessScore = 90;
  let freshnessStatus: ConfidenceFactor['status'] = 'GOOD';
  let freshnessExp = `Input observation age (${maxDataAgeHours.toFixed(1)} h) within operational threshold (<${CONFIDENCE_CONFIG.freshnessThresholdsHours.aging} h).`;

  if (maxDataAgeHours > CONFIDENCE_CONFIG.freshnessThresholdsHours.stale || validAges.length === 0) {
    freshnessScore = 15;
    freshnessStatus = 'CRITICAL';
    freshnessExp = `Observation data is stale (> ${CONFIDENCE_CONFIG.freshnessThresholdsHours.stale} h old) or timestamp missing.`;
    recommendedVerificationActions.push('Acquire current environmental observations before relying on route decision');
  } else if (maxDataAgeHours > CONFIDENCE_CONFIG.freshnessThresholdsHours.aging) {
    freshnessScore = 45;
    freshnessStatus = 'DEGRADED';
    freshnessExp = `Observation age (${maxDataAgeHours.toFixed(1)} h) exceeds freshness target (${CONFIDENCE_CONFIG.freshnessThresholdsHours.aging} h).`;
    recommendedVerificationActions.push('Refresh environmental data feeds');
  } else if (maxDataAgeHours > CONFIDENCE_CONFIG.freshnessThresholdsHours.fresh) {
    freshnessScore = 75;
    freshnessStatus = 'ACCEPTABLE';
    freshnessExp = `Observations are ${maxDataAgeHours.toFixed(1)} h old. Acceptable for tactical planning.`;
  }

  factors.push({
    factorName: 'Data Freshness',
    category: 'DATA FRESHNESS',
    status: freshnessStatus,
    contributionScore: freshnessScore,
    explanation: freshnessExp,
    source: 'Copernicus & USNIC Provenance Timestamps',
    timestamp,
  });

  // ----------------------------------------------------
  // 3. TEMPORAL ALIGNMENT FACTOR
  // ----------------------------------------------------
  const alignmentStatus = unifiedEnvironment?.alignmentStatus || 'UNAVAILABLE';
  let temporalScore = 90;
  let temporalStatus: ConfidenceFactor['status'] = 'GOOD';
  let temporalExp = 'Multi-source observation timestamps are synchronized within 3 hours.';

  if (alignmentStatus === 'UNAVAILABLE') {
    temporalScore = 10;
    temporalStatus = 'CRITICAL';
    temporalExp = 'Severe temporal misalignment between environmental inputs.';
  } else if (alignmentStatus === 'DEGRADED') {
    temporalScore = 40;
    temporalStatus = 'DEGRADED';
    temporalExp = 'Significant temporal discrepancy between weather forecast and ocean/iceberg observations.';
  } else if (alignmentStatus === 'PARTIALLY ALIGNED') {
    temporalScore = 68;
    temporalStatus = 'ACCEPTABLE';
    temporalExp = 'Minor temporal offset between Copernicus sea-ice and ECMWF weather timestamps.';
  }

  factors.push({
    factorName: 'Temporal Alignment',
    category: 'TEMPORAL ALIGNMENT',
    status: temporalStatus,
    contributionScore: temporalScore,
    explanation: temporalExp,
    source: 'Temporal Alignment Engine',
    timestamp,
  });

  // ----------------------------------------------------
  // 4. SPATIAL COVERAGE FACTOR
  // ----------------------------------------------------
  const seaIceCov = sources?.seaIce?.coverage || 'NONE';
  const oceanCov = sources?.ocean?.coverage || 'NONE';
  const bergCov = sources?.icebergs?.coverage || 'NONE';

  let spatialScore = 90;
  let spatialStatus: ConfidenceFactor['status'] = 'GOOD';
  let spatialExp = 'Complete spatial coverage across the target Antarctic sector.';

  if (seaIceCov === 'NONE' || oceanCov === 'NONE' || (mode === 'REAL' && seaIceCells.length === 0)) {
    spatialScore = 15;
    spatialStatus = 'CRITICAL';
    spatialExp = 'Critical gap in spatial coverage over active navigation corridor.';
    recommendedVerificationActions.push('Acquire higher-resolution observation in route corridor');
  } else if (seaIceCov === 'PARTIAL' || oceanCov === 'PARTIAL' || bergCov === 'PARTIAL') {
    spatialScore = 55;
    spatialStatus = 'DEGRADED';
    spatialExp = 'Partial coverage across bounding box. Interpolation required at sector edges.';
    recommendedVerificationActions.push('Acquire higher-resolution observation in route corridor');
  }

  factors.push({
    factorName: 'Spatial Coverage',
    category: 'SPATIAL COVERAGE',
    status: spatialStatus,
    contributionScore: spatialScore,
    explanation: spatialExp,
    source: 'Sector Bounding Box Evaluation',
    timestamp,
  });

  // ----------------------------------------------------
  // 5. FORECAST HORIZON FACTOR
  // ----------------------------------------------------
  let horizonScore = 95;
  let horizonStatus: ConfidenceFactor['status'] = 'GOOD';
  let horizonExp = `Nowcast analysis (Horizon: +${forecastHorizonHours} h). Minimum model error propagation.`;

  if (forecastHorizonHours >= CONFIDENCE_CONFIG.forecastHorizonThresholdsHours.highUncertainty) {
    horizonScore = 40;
    horizonStatus = 'DEGRADED';
    horizonExp = `Extended forecast horizon (+${forecastHorizonHours} h) introduces cumulative hydrodynamic divergence.`;
  } else if (forecastHorizonHours >= CONFIDENCE_CONFIG.forecastHorizonThresholdsHours.moderateUncertainty) {
    horizonScore = 65;
    horizonStatus = 'ELEVATED_RISK';
    horizonExp = `Medium-term forecast horizon (+${forecastHorizonHours} h). Moderate growth in uncertainty envelope.`;
  } else if (forecastHorizonHours > 0) {
    horizonScore = 82;
    horizonStatus = 'ACCEPTABLE';
    horizonExp = `Short-term forecast (+${forecastHorizonHours} h) with controlled drift variance.`;
  }

  factors.push({
    factorName: 'Forecast Horizon',
    category: 'FORECAST HORIZON',
    status: horizonStatus,
    contributionScore: horizonScore,
    explanation: horizonExp,
    source: `Kinematic Model Integration Horizon (+${forecastHorizonHours}h)`,
    timestamp,
  });

  // ----------------------------------------------------
  // 6. TRAJECTORY UNCERTAINTY FACTOR
  // ----------------------------------------------------
  let maxTrajUncertaintyNm = 2.0;
  if (icebergs && icebergs.length > 0) {
    const uncs = icebergs.map((b) => {
      if (b.predictedTrajectory && b.predictedTrajectory.length > 0) {
        const pt = b.predictedTrajectory.find((p) => p.hours === forecastHorizonHours) || b.predictedTrajectory[b.predictedTrajectory.length - 1];
        return pt ? pt.uncertaintyRadiusNm : b.uncertaintyRadiusNm;
      }
      return b.uncertaintyRadiusNm;
    });
    maxTrajUncertaintyNm = Math.max(...uncs);
  }

  let trajScore = 90;
  let trajStatus: ConfidenceFactor['status'] = 'GOOD';
  let trajExp = `Iceberg drift uncertainty envelope is narrow (±${maxTrajUncertaintyNm.toFixed(1)} nm).`;

  if (maxTrajUncertaintyNm > CONFIDENCE_CONFIG.trajectoryUncertaintyThresholdsNm.high) {
    trajScore = 25;
    trajStatus = 'CRITICAL';
    trajExp = `Iceberg trajectory uncertainty (±${maxTrajUncertaintyNm.toFixed(1)} nm) exceeds safe navigation corridor limits.`;
    recommendedVerificationActions.push('Review iceberg trajectory uncertainty');
    recommendedVerificationActions.push('Acquire higher-resolution observation in route corridor');
  } else if (maxTrajUncertaintyNm > CONFIDENCE_CONFIG.trajectoryUncertaintyThresholdsNm.moderate) {
    trajScore = 50;
    trajStatus = 'DEGRADED';
    trajExp = `Elevated trajectory uncertainty (±${maxTrajUncertaintyNm.toFixed(1)} nm) due to wind/current forcing variance.`;
    recommendedVerificationActions.push('Review iceberg trajectory uncertainty');
  } else if (maxTrajUncertaintyNm > CONFIDENCE_CONFIG.trajectoryUncertaintyThresholdsNm.low) {
    trajScore = 72;
    trajStatus = 'ELEVATED_RISK';
    trajExp = `Moderate trajectory drift radius (±${maxTrajUncertaintyNm.toFixed(1)} nm).`;
  }

  factors.push({
    factorName: 'Iceberg Trajectory Uncertainty',
    category: 'TRAJECTORY UNCERTAINTY',
    status: trajStatus,
    contributionScore: trajScore,
    explanation: trajExp,
    source: '2D Kinematic Drift Model Uncertainty Envelope',
    timestamp,
  });

  // ----------------------------------------------------
  // 7. SEA-ICE UNCERTAINTY FACTOR
  // ----------------------------------------------------
  let iceUncScore = 88;
  let iceUncStatus: ConfidenceFactor['status'] = 'GOOD';
  let iceUncExp = 'Copernicus sea-ice concentration grid validated with high retrieval confidence.';

  if (mode === 'REAL' && seaIceCells.length === 0) {
    iceUncScore = 10;
    iceUncStatus = 'CRITICAL';
    iceUncExp = 'REAL sea-ice observation data missing from Copernicus pipeline.';
    recommendedVerificationActions.push('Acquire newer sea-ice observation');
  } else {
    const avgCellUnc = seaIceCells.length > 0 ? seaIceCells.reduce((acc, c) => acc + (c.uncertainty || 15), 0) / seaIceCells.length : 15;
    if (avgCellUnc > 35) {
      iceUncScore = 45;
      iceUncStatus = 'DEGRADED';
      iceUncExp = `High spatial uncertainty in sea-ice edge concentration (${avgCellUnc.toFixed(0)}%).`;
      recommendedVerificationActions.push('Acquire newer sea-ice observation');
    } else if (avgCellUnc > 22) {
      iceUncScore = 68;
      iceUncStatus = 'ACCEPTABLE';
      iceUncExp = `Moderate pack ice concentration variance (${avgCellUnc.toFixed(0)}%).`;
    }
  }

  factors.push({
    factorName: 'Sea-Ice Concentration Uncertainty',
    category: 'SEA-ICE UNCERTAINTY',
    status: iceUncStatus,
    contributionScore: iceUncScore,
    explanation: iceUncExp,
    source: 'Copernicus OSI SAF L4 Product Grid',
    timestamp,
  });

  // ----------------------------------------------------
  // 8. WEATHER QUALITY FACTOR
  // ----------------------------------------------------
  let weatherScore = 85;
  let weatherStatus: ConfidenceFactor['status'] = 'GOOD';
  let weatherExp = 'ECMWF IFS atmospheric forcing telemetry available and valid.';

  if (!weather || (mode === 'REAL' && sources?.weather?.quality === 'MISSING')) {
    weatherScore = 20;
    weatherStatus = 'CRITICAL';
    weatherExp = 'ECMWF IFS weather forecast feed unavailable.';
    recommendedVerificationActions.push('Refresh weather forecast');
  } else if (weather.windSpeedKnots > 35) {
    weatherScore = 55;
    weatherStatus = 'ELEVATED_RISK';
    weatherExp = `High polar wind conditions (${weather.windSpeedKnots.toFixed(0)} kts) increase sail windage forcing uncertainty.`;
    recommendedVerificationActions.push('Refresh weather forecast');
  }

  factors.push({
    factorName: 'Atmospheric Weather Quality',
    category: 'WEATHER QUALITY',
    status: weatherStatus,
    contributionScore: weatherScore,
    explanation: weatherExp,
    source: 'ECMWF IFS Global Atmospheric Forecast',
    timestamp,
  });

  // ----------------------------------------------------
  // 9. OCEAN QUALITY FACTOR
  // ----------------------------------------------------
  let oceanScore = 85;
  let oceanStatus: ConfidenceFactor['status'] = 'GOOD';
  let oceanExp = 'Copernicus Marine surface ocean velocity field valid.';

  if (!currents || currents.length === 0 || (mode === 'REAL' && sources?.ocean?.quality === 'MISSING')) {
    oceanScore = 20;
    oceanStatus = 'CRITICAL';
    oceanExp = 'Copernicus 3D ocean hydrodynamics product stream unavailable.';
    recommendedVerificationActions.push('Refresh ocean-current information');
  } else if (sources?.ocean?.coverage === 'PARTIAL') {
    oceanScore = 60;
    oceanStatus = 'ACCEPTABLE';
    oceanExp = 'Partial coverage of ocean hydrodynamic grid across sector boundary.';
  }

  factors.push({
    factorName: 'Ocean Hydrodynamics Quality',
    category: 'OCEAN QUALITY',
    status: oceanStatus,
    contributionScore: oceanScore,
    explanation: oceanExp,
    source: 'Copernicus Marine NEMO Hydrodynamic Model',
    timestamp,
  });

  // ----------------------------------------------------
  // 10. MODEL LIMITATIONS FACTOR
  // ----------------------------------------------------
  let limitScore = 75;
  let limitStatus: ConfidenceFactor['status'] = 'LIMITATION';
  let limitExp = 'Baseline 2D kinematic model assumption active (C_wind = 0.025). Subject to sail geometry and keel velocity profile limits.';

  if (forecastHorizonHours >= 48 || (weather && weather.windSpeedKnots > 30)) {
    limitScore = 50;
    limitStatus = 'LIMITATION';
    limitExp = 'Model limitations materially affect current decision: 2D kinematic formulation lacks 3D keel dynamics during extended forecast/high wind conditions.';
  }

  factors.push({
    factorName: 'Scientific Model Limitations',
    category: 'MODEL LIMITATIONS',
    status: limitStatus,
    contributionScore: limitScore,
    explanation: limitExp,
    source: 'CRYO NAV Scientific Kinematic Model Definition',
    timestamp,
  });

  // ----------------------------------------------------
  // OVERALL CONFIDENCE & DECISION LOGIC
  // ----------------------------------------------------
  const numericScore = Math.min(
    100,
    Math.max(
      0,
      Math.round(
        factors.reduce((sum, f) => sum + f.contributionScore, 0) / factors.length
      )
    )
  );

  const hasCriticalFactor = factors.some((f) => f.status === 'CRITICAL');
  const criticalCount = factors.filter((f) => f.status === 'CRITICAL').length;
  const degradedCount = factors.filter((f) => f.status === 'DEGRADED' || f.status === 'ELEVATED_RISK').length;

  let overallLevel: ConfidenceLevel = 'HIGH';

  // Strict REAL mode rule: if required sources are missing/error -> CRITICAL
  if (mode === 'REAL' && (seaIceCells.length === 0 || !weather || currents.length === 0 || hasCriticalFactor)) {
    overallLevel = 'CRITICAL';
  } else if (hasCriticalFactor || numericScore < 45 || criticalCount >= 1) {
    overallLevel = 'CRITICAL';
  } else if (numericScore < 62 || degradedCount >= 3 || maxTrajUncertaintyNm > 10.0) {
    overallLevel = 'LOW';
  } else if (numericScore < 80 || degradedCount >= 1 || maxDataAgeHours > 12.0 || forecastHorizonHours >= 24) {
    overallLevel = 'MEDIUM';
  } else {
    overallLevel = 'HIGH';
  }

  // Identify Primary Limiting Factor
  const sortedFactors = [...factors].sort((a, b) => a.contributionScore - b.contributionScore);
  const primaryLimitingFactor = sortedFactors[0]?.factorName || 'Data Freshness';

  // Recommendation status
  const isRecommendationBlocked = overallLevel === 'CRITICAL';
  const routeDecisionAllowed = !isRecommendationBlocked;

  if (isRecommendationBlocked) {
    requiredActions.push('Acquire missing environmental telemetry before authorizing navigation decisions');
    requiredActions.push('Consult ice navigator for manual iceberg radar clearance');
  }

  // Ensure unique recommended verification actions
  const uniqueVerificationActions = Array.from(new Set(recommendedVerificationActions));
  if (uniqueVerificationActions.length === 0) {
    uniqueVerificationActions.push('Routine monitoring of Copernicus Marine and ECMWF forecast feeds');
  }

  return {
    overallLevel,
    confidenceScore: numericScore,
    factors,
    primaryLimitingFactor,
    warnings,
    limitations,
    requiredActions,
    recommendedVerificationActions: uniqueVerificationActions,
    routeDecisionAllowed,
    isRecommendationBlocked,
    timestamp,
    provenance: `Decision Confidence Engine (${mode} Mode)`,
  };
}
