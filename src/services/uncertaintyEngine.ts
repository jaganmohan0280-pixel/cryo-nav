/**
 * CRYO NAV — Uncertainty Engine & Uncertainty-Aware Navigation Logic
 * Phase 10A — Core Uncertainty & Risk Envelope Transformation Engine
 *
 * Core Responsibility:
 * Transforms model confidence, data freshness, connectivity state, forecast horizon,
 * and hazard characteristics into explicit, deterministic uncertainty information.
 *
 * Scientific & Engineering Rules:
 * 1. HIGH CONFIDENCE + FRESH DATA -> tighter uncertainty envelope.
 * 2. LOW CONFIDENCE / STALE DATA / OFFLINE -> expanded uncertainty envelope.
 * 3. OFFLINE RULE: OFFLINE means "No new information is currently available".
 *    Cached data is preserved, but uncertainty expands due to update latency.
 * 4. DETERMINISTIC & EXPLAINABLE: 100% deterministic (NO Math.random()).
 *    Every uncertainty evaluation generates clear, human-readable explanations.
 * 5. PROVENANCE INTEGRITY: Preserves input dataMode ('REAL' | 'SIMULATED').
 *    Never converts SIMULATED to REAL.
 * 6. NO ROUTING MUTATION: Does NOT alter routes, trigger replanning, or modify routingEngine.ts.
 *
 * ENGINEERING BASELINE PARAMETERS:
 * Numerical multipliers in this engine represent transparent engineering decision-support
 * heuristics for Antarctic navigation and are NOT empirically calibrated statistical probability distributions.
 */

import {
  ConfidenceLevel,
  FreshnessState,
  ConnectionState,
} from '../types';

export type HazardType = 'ICEBERG' | 'SEA_ICE' | 'WEATHER';

export type DataMode = 'REAL' | 'SIMULATED' | 'HYBRID' | 'UNAVAILABLE';

export type CautionLevel =
  | 'STANDARD'
  | 'ELEVATED'
  | 'HIGH_CAUTION'
  | 'EXCLUSIVE_MONITORING'
  | 'RE_EVALUATION_REQUIRED';

export type HazardSeverityLevel = 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW' | 'NONE';

export interface LocationPoint {
  lat: number;
  lon: number;
}

export interface UncertaintyInput {
  hazardId?: string;
  hazardName?: string;
  hazardType: HazardType;
  location: LocationPoint;
  confidenceLevel: ConfidenceLevel;
  freshnessState: FreshnessState;
  connectionState: ConnectionState;
  forecastHorizonHours: number; // 0, 6, 12, 24, 48, 72
  baseRadiusNm?: number;
  dataMode?: DataMode;
  provenance?: string;
}

export interface UncertaintyZone {
  center: LocationPoint;
  radiusNm: number;
  baseRadiusNm: number;
  expansionFactor: number;
  hazardType: HazardType;
  confidenceLevel: ConfidenceLevel;
  freshnessState: FreshnessState;
  connectionState: ConnectionState;
  forecastHorizonHours: number;
  forecastHorizonLabel: string;
  reasons: string[];
  explanation: string;
  severity: HazardSeverityLevel;
  riskModifier: number;
  recommendedCautionLevel: CautionLevel;
  dataMode: DataMode;
  provenance: string;
}

export interface UncertaintyEvaluationResult {
  hazardId: string;
  hazardName: string;
  hazardType: HazardType;
  location: LocationPoint;
  baseUncertaintyRadiusNm: number;
  expandedUncertaintyRadiusNm: number;
  expansionFactor: number;
  confidenceLevel: ConfidenceLevel;
  freshnessState: FreshnessState;
  connectionState: ConnectionState;
  forecastHorizonHours: number;
  forecastHorizonLabel: string;
  reasons: string[];
  explanation: string;
  severity: HazardSeverityLevel;
  riskModifier: number;
  recommendedCautionLevel: CautionLevel;
  dataMode: DataMode;
  provenance: string;
  uncertaintyZone: UncertaintyZone;
  timestamp: string;
}

/**
 * ENGINEERING BASELINE MULTIPLIERS
 * Transparent, deterministic operational baseline coefficients.
 */
export const UNCERTAINTY_COEFFICIENTS = {
  // Confidence Multipliers
  CONFIDENCE: {
    HIGH: 1.00,
    MEDIUM: 1.25,
    LOW: 1.60,
    CRITICAL: 2.20,
  },

  // Data Freshness Multipliers
  FRESHNESS: {
    FRESH: 1.00,
    AGING: 1.20,
    STALE: 1.50,
    UNAVAILABLE: 2.00,
  },

  // Connectivity State Multipliers
  CONNECTIVITY: {
    ONLINE: 1.00,
    LIMITED: 1.15,
    OFFLINE: 1.35,
    SYNCING: 1.05,
  },

  // Forecast Horizon Multipliers (0h to 72h)
  HORIZON: {
    0: 1.00,
    6: 1.10,
    12: 1.25,
    24: 1.50,
    48: 1.90,
    72: 2.40,
  },

  // Base Default Radii (nautical miles)
  BASE_RADIUS_NM: {
    ICEBERG: 0.80,
    SEA_ICE: 3.00,
    WEATHER: 10.00,
  },
} as const;

/**
 * Converts numeric forecast horizon hours into standard string label
 */
export function formatHorizonLabel(hours: number): string {
  if (hours <= 0) return '+0h';
  return `+${Math.round(hours)}h`;
}

/**
 * Normalizes forecast horizon hours to standard evaluation milestones (0, 6, 12, 24, 48, 72)
 */
export function normalizeForecastHorizon(hours: number): number {
  if (hours <= 0) return 0;
  if (hours <= 6) return 6;
  if (hours <= 12) return 12;
  if (hours <= 24) return 24;
  if (hours <= 48) return 48;
  return 72;
}

/**
 * Computes deterministic expansion factor based on inputs
 */
export function calculateExpansionFactor(
  confidenceLevel: ConfidenceLevel,
  freshnessState: FreshnessState,
  connectionState: ConnectionState,
  forecastHorizonHours: number
): number {
  const normHours = normalizeForecastHorizon(forecastHorizonHours);

  const confCoeff = UNCERTAINTY_COEFFICIENTS.CONFIDENCE[confidenceLevel] ?? 1.0;
  const freshCoeff = UNCERTAINTY_COEFFICIENTS.FRESHNESS[freshnessState] ?? 1.0;
  const connCoeff = UNCERTAINTY_COEFFICIENTS.CONNECTIVITY[connectionState] ?? 1.0;

  let horizCoeff = 1.0;
  if (normHours === 0) horizCoeff = UNCERTAINTY_COEFFICIENTS.HORIZON[0];
  else if (normHours === 6) horizCoeff = UNCERTAINTY_COEFFICIENTS.HORIZON[6];
  else if (normHours === 12) horizCoeff = UNCERTAINTY_COEFFICIENTS.HORIZON[12];
  else if (normHours === 24) horizCoeff = UNCERTAINTY_COEFFICIENTS.HORIZON[24];
  else if (normHours === 48) horizCoeff = UNCERTAINTY_COEFFICIENTS.HORIZON[48];
  else horizCoeff = UNCERTAINTY_COEFFICIENTS.HORIZON[72];

  const totalFactor = confCoeff * freshCoeff * connCoeff * horizCoeff;
  return Number(totalFactor.toFixed(3));
}

/**
 * Derives hazard severity level based on expanded radius and input parameters
 */
export function deriveHazardSeverity(
  hazardType: HazardType,
  expandedRadiusNm: number,
  confidenceLevel: ConfidenceLevel
): HazardSeverityLevel {
  if (confidenceLevel === 'CRITICAL') return 'CRITICAL';

  if (hazardType === 'ICEBERG') {
    if (expandedRadiusNm >= 5.0) return 'CRITICAL';
    if (expandedRadiusNm >= 3.0) return 'HIGH';
    if (expandedRadiusNm >= 1.5) return 'MODERATE';
    if (expandedRadiusNm >= 1.0) return 'LOW';
    return 'NONE';
  }

  if (hazardType === 'SEA_ICE') {
    if (expandedRadiusNm >= 15.0) return 'CRITICAL';
    if (expandedRadiusNm >= 10.0) return 'HIGH';
    if (expandedRadiusNm >= 6.0) return 'MODERATE';
    return 'LOW';
  }

  // WEATHER
  if (expandedRadiusNm >= 35.0) return 'CRITICAL';
  if (expandedRadiusNm >= 25.0) return 'HIGH';
  if (expandedRadiusNm >= 15.0) return 'MODERATE';
  return 'LOW';
}

/**
 * Derives recommended caution level deterministically
 */
export function deriveCautionLevel(
  expansionFactor: number,
  severity: HazardSeverityLevel,
  connectionState: ConnectionState
): CautionLevel {
  if (severity === 'CRITICAL' || expansionFactor >= 3.5) {
    return 'RE_EVALUATION_REQUIRED';
  }
  if (severity === 'HIGH' || expansionFactor >= 2.5) {
    return 'EXCLUSIVE_MONITORING';
  }
  if (expansionFactor >= 1.8 || connectionState === 'OFFLINE') {
    return 'HIGH_CAUTION';
  }
  if (expansionFactor >= 1.25 || connectionState === 'LIMITED') {
    return 'ELEVATED';
  }
  return 'STANDARD';
}

/**
 * Main Uncertainty Evaluation Function
 */
export function evaluateUncertainty(input: UncertaintyInput): UncertaintyEvaluationResult {
  const hazardType = input.hazardType;
  const baseRadiusNm = input.baseRadiusNm ?? UNCERTAINTY_COEFFICIENTS.BASE_RADIUS_NM[hazardType];
  const normHours = normalizeForecastHorizon(input.forecastHorizonHours);
  const horizonLabel = formatHorizonLabel(normHours);

  const expansionFactor = calculateExpansionFactor(
    input.confidenceLevel,
    input.freshnessState,
    input.connectionState,
    normHours
  );

  const expandedUncertaintyRadiusNm = Number((baseRadiusNm * expansionFactor).toFixed(2));
  const severity = deriveHazardSeverity(hazardType, expandedUncertaintyRadiusNm, input.confidenceLevel);
  const cautionLevel = deriveCautionLevel(expansionFactor, severity, input.connectionState);

  // Risk modifier multiplier (e.g. 1.0 = baseline, up to 2.5x under maximum uncertainty expansion)
  const riskModifier = Number((1.0 + (expansionFactor - 1.0) * 0.30).toFixed(2));

  // Build structured, explainable reasons array
  const reasons: string[] = [];

  if (input.confidenceLevel !== 'HIGH') {
    reasons.push(
      `${input.confidenceLevel} confidence level (${UNCERTAINTY_COEFFICIENTS.CONFIDENCE[input.confidenceLevel]}x expansion multiplier)`
    );
  } else {
    reasons.push('HIGH decision confidence maintains baseline spatial bounds');
  }

  if (input.freshnessState !== 'FRESH') {
    reasons.push(
      `Environmental data is ${input.freshnessState} (${UNCERTAINTY_COEFFICIENTS.FRESHNESS[input.freshnessState]}x expansion multiplier)`
    );
  } else {
    reasons.push('FRESH environmental telemetry reduces temporal decay');
  }

  if (input.connectionState === 'OFFLINE') {
    reasons.push(
      'System is OFFLINE: Operating from locally cached data without live update feed (1.35x expansion multiplier)'
    );
  } else if (input.connectionState === 'LIMITED') {
    reasons.push('System connection is LIMITED: Telemetry update rate restricted (1.15x expansion multiplier)');
  } else if (input.connectionState === 'SYNCING') {
    reasons.push('System is SYNCING: Background cache synchronization active (1.05x expansion multiplier)');
  } else {
    reasons.push('ONLINE connection active: Live telemetry stream available');
  }

  if (normHours > 0) {
    const hCoeff = UNCERTAINTY_COEFFICIENTS.HORIZON[normHours as keyof typeof UNCERTAINTY_COEFFICIENTS.HORIZON] ?? 1.0;
    reasons.push(
      `${horizonLabel} forecast horizon (+${Math.round((hCoeff - 1.0) * 100)}% horizon growth factor)`
    );
  } else {
    reasons.push('Current horizon (+0h): Zero temporal projection growth');
  }

  // Single human-readable summary explanation
  const primaryDriver =
    input.confidenceLevel === 'CRITICAL' || input.confidenceLevel === 'LOW'
      ? `${input.confidenceLevel} model confidence`
      : input.freshnessState === 'STALE' || input.freshnessState === 'UNAVAILABLE'
      ? `${input.freshnessState} environmental data`
      : input.connectionState === 'OFFLINE'
      ? 'OFFLINE cached operation'
      : normHours >= 24
      ? `extended ${horizonLabel} forecast horizon`
      : 'optimal fresh telemetry';

  const explanation = `Uncertainty radius for ${hazardType} ${
    input.hazardName || input.hazardId || 'hazard'
  } expanded from ${baseRadiusNm} nm to ${expandedUncertaintyRadiusNm} nm (${expansionFactor}x factor) driven by ${primaryDriver}.`;

  const dataMode: DataMode = input.dataMode || 'REAL';
  const provenance = input.provenance || 'CRYO NAV Phase 10A Uncertainty Engine Baseline';

  const center: LocationPoint = {
    lat: input.location.lat,
    lon: input.location.lon,
  };

  const uncertaintyZone: UncertaintyZone = {
    center,
    radiusNm: expandedUncertaintyRadiusNm,
    baseRadiusNm,
    expansionFactor,
    hazardType,
    confidenceLevel: input.confidenceLevel,
    freshnessState: input.freshnessState,
    connectionState: input.connectionState,
    forecastHorizonHours: normHours,
    forecastHorizonLabel: horizonLabel,
    reasons,
    explanation,
    severity,
    riskModifier,
    recommendedCautionLevel: cautionLevel,
    dataMode,
    provenance,
  };

  return {
    hazardId: input.hazardId || `hazard-${hazardType.toLowerCase()}-01`,
    hazardName: input.hazardName || `${hazardType} Hazard`,
    hazardType,
    location: center,
    baseUncertaintyRadiusNm: baseRadiusNm,
    expandedUncertaintyRadiusNm,
    expansionFactor,
    confidenceLevel: input.confidenceLevel,
    freshnessState: input.freshnessState,
    connectionState: input.connectionState,
    forecastHorizonHours: normHours,
    forecastHorizonLabel: horizonLabel,
    reasons,
    explanation,
    severity,
    riskModifier,
    recommendedCautionLevel: cautionLevel,
    dataMode,
    provenance,
    uncertaintyZone,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Batch evaluates uncertainty across multiple hazards
 */
export function evaluateBatchUncertainty(inputs: UncertaintyInput[]): UncertaintyEvaluationResult[] {
  return inputs.map((input) => evaluateUncertainty(input));
}
