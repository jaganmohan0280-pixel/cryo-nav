/**
 * CRYO NAV — Continuous Model Validation Core Engine
 * Phase 15A — Core Analytical Engine for Retrospective Model Validation
 *
 * Operational Principle:
 * Compares previous CRYO NAV model predictions (iceberg drift trajectories, sea ice concentration)
 * against later observations (USNIC iceberg tracks, Copernicus OSI-401-d sea ice, STAC imagery)
 * to evaluate predictive accuracy, error metrics, and uncertainty envelope coverage.
 *
 * Scientific & Engineering Rules:
 * 1. RETROSPECTIVE VALIDATION ONLY: Does NOT perform model retraining or alter seaIceModel / trajectoryModel.
 * 2. NO FABRICATION: Does NOT invent observations or modify data mode. Preserves REAL vs SIMULATED.
 * 3. DETERMINISTIC & REPEATABLE: 100% deterministic calculation (NO Math.random()).
 * 4. TEMPORAL ALIGNMENT: Strictly checks temporal offset between forecast valid time and observation time.
 * 5. UNCERTAINTY ENVELOPE COVERAGE: Evaluates whether later observations fall inside or outside
 *    the model's predicted uncertainty envelope (labeled "uncertainty envelope coverage").
 * 6. SCIENTIFIC HONESTY: Output includes explicit scientific disclaimers clarifying that retrospective
 *    consistency does not constitute operational scientific certification or peer-reviewed validation.
 */

export type PredictionModelType = 'SEA_ICE' | 'ICEBERG_TRAJECTORY';

export type ValidationStatus =
  | 'VALIDATED_MATCH'
  | 'PARTIAL_MATCH'
  | 'MISMATCH'
  | 'UNMATCHED'
  | 'INSUFFICIENT_DATA';

export type UncertaintyCoverage = 'INSIDE' | 'OUTSIDE' | 'UNAVAILABLE';

export type ValidationDataMode = 'REAL' | 'SIMULATED' | 'HYBRID' | 'UNAVAILABLE';

export interface PredictionRecord {
  id: string;
  modelType: PredictionModelType;
  predictionTimestamp: string; // ISO timestamp when prediction was generated
  validTime: string; // ISO target forecast valid time
  forecastHorizonHours?: number;
  predictedPosition?: { lat: number; lon: number };
  predictedValue?: number; // e.g. sea ice concentration %
  uncertaintyRadiusNm?: number; // Spatial uncertainty radius (nm)
  uncertaintyMargin?: number; // Concentration uncertainty margin (%)
  provenance?: string;
  dataMode?: ValidationDataMode;
}

export interface ObservationRecord {
  id: string;
  modelType: PredictionModelType;
  observationTimestamp: string; // ISO timestamp when observation was recorded
  observedPosition?: { lat: number; lon: number };
  observedValue?: number; // e.g. observed sea ice concentration %
  source?: string;
  provenance?: string;
  dataMode?: ValidationDataMode;
}

export interface ValidationConfig {
  maxTemporalMismatchHours?: number; // Default: 3.0 hours
  spatialToleranceNm?: number; // Default: 5.0 nm
  valueTolerance?: number; // Default: 10.0%
}

export interface ValidationRecordResult {
  predictionId: string;
  observationId?: string;
  modelType: PredictionModelType;
  predictionTimestamp: string;
  validTime: string;
  observationTimestamp?: string;
  temporalMismatchHours: number | null;

  // Spatial / Value Error Metrics
  positionErrorNm: number | null;
  latErrorDeg: number | null;
  lonErrorDeg: number | null;
  valueError: number | null; // predictedValue - observedValue (signed error)
  absoluteValueError: number | null;

  // Uncertainty Envelope Coverage
  uncertaintyCoverage: UncertaintyCoverage;
  uncertaintyMarginOrRadius: number | null;

  // Validation Status
  status: ValidationStatus;
  statusExplanation: string;

  // Data Mode & Provenance
  dataMode: ValidationDataMode;
  provenance: string;
}

export interface ModelValidationSummary {
  modelType: PredictionModelType;
  totalPredictions: number;
  matchedObservationsCount: number;
  unmatchedPredictionsCount: number;
  insufficientDataCount: number;

  // Aggregated Error Metrics
  meanAbsoluteError: number | null; // MAE (nm for iceberg position, % for sea ice)
  rootMeanSquareError: number | null; // RMSE
  bias: number | null; // Mean Signed Error (predicted - observed)
  uncertaintyCoverageRatePct: number | null; // % of matches where observation fell inside uncertainty envelope

  statusDistribution: Record<ValidationStatus, number>;
  overallValidationStatus: ValidationStatus;

  results: ValidationRecordResult[];

  dataMode: ValidationDataMode;
  provenance: string;
  evaluationTimestamp: string;
  scientificDisclaimer: string;
}

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

// Combine data modes safely
function deriveCombinedDataMode(
  predMode?: ValidationDataMode,
  obsMode?: ValidationDataMode
): ValidationDataMode {
  if (!predMode && !obsMode) return 'SIMULATED';
  const p = predMode || 'SIMULATED';
  const o = obsMode || 'SIMULATED';
  if (p === 'REAL' && o === 'REAL') return 'REAL';
  if (p === 'SIMULATED' && o === 'SIMULATED') return 'SIMULATED';
  if (p === 'UNAVAILABLE' || o === 'UNAVAILABLE') return 'UNAVAILABLE';
  return 'HYBRID';
}

/**
 * Validates a single prediction record against a corresponding observation record.
 *
 * @param pred PredictionRecord
 * @param obs ObservationRecord (optional)
 * @param config ValidationConfig (optional)
 * @returns ValidationRecordResult
 */
export function validatePredictionVsObservation(
  pred: PredictionRecord,
  obs?: ObservationRecord | null,
  config?: ValidationConfig
): ValidationRecordResult {
  const maxTemporalMismatchHours = config?.maxTemporalMismatchHours ?? 3.0;
  const spatialToleranceNm = config?.spatialToleranceNm ?? 5.0;
  const valueTolerance = config?.valueTolerance ?? 10.0;

  const dataMode = deriveCombinedDataMode(pred.dataMode, obs?.dataMode);
  const provenance = `Validation Engine (${pred.provenance || 'Prediction'} vs ${obs?.provenance || 'Observation'})`;

  // Base fallback if no observation provided
  if (!obs) {
    return {
      predictionId: pred.id,
      observationId: undefined,
      modelType: pred.modelType,
      predictionTimestamp: pred.predictionTimestamp,
      validTime: pred.validTime,
      observationTimestamp: undefined,
      temporalMismatchHours: null,
      positionErrorNm: null,
      latErrorDeg: null,
      lonErrorDeg: null,
      valueError: null,
      absoluteValueError: null,
      uncertaintyCoverage: 'UNAVAILABLE',
      uncertaintyMarginOrRadius: pred.uncertaintyRadiusNm ?? pred.uncertaintyMargin ?? null,
      status: 'UNMATCHED',
      statusExplanation: 'No corresponding observation record was provided for comparison.',
      dataMode: pred.dataMode || 'UNAVAILABLE',
      provenance,
    };
  }

  // 1. Temporal Alignment Check
  const predValidMs = new Date(pred.validTime).getTime();
  const obsMs = new Date(obs.observationTimestamp).getTime();

  let temporalMismatchHours: number | null = null;
  if (!isNaN(predValidMs) && !isNaN(obsMs)) {
    temporalMismatchHours = Math.round((Math.abs(obsMs - predValidMs) / (1000 * 3600)) * 100) / 100;
  }

  if (temporalMismatchHours === null || temporalMismatchHours > maxTemporalMismatchHours) {
    return {
      predictionId: pred.id,
      observationId: obs.id,
      modelType: pred.modelType,
      predictionTimestamp: pred.predictionTimestamp,
      validTime: pred.validTime,
      observationTimestamp: obs.observationTimestamp,
      temporalMismatchHours,
      positionErrorNm: null,
      latErrorDeg: null,
      lonErrorDeg: null,
      valueError: null,
      absoluteValueError: null,
      uncertaintyCoverage: 'UNAVAILABLE',
      uncertaintyMarginOrRadius: pred.uncertaintyRadiusNm ?? pred.uncertaintyMargin ?? null,
      status: 'UNMATCHED',
      statusExplanation: `Temporal mismatch (${temporalMismatchHours != null ? temporalMismatchHours.toFixed(1) : 'unknown'}h) exceeds allowed tolerance (${maxTemporalMismatchHours.toFixed(1)}h).`,
      dataMode,
      provenance,
    };
  }

  // 2. Model Specific Validation (ICEBERG_TRAJECTORY vs SEA_ICE)
  if (pred.modelType === 'ICEBERG_TRAJECTORY') {
    if (!pred.predictedPosition || !obs.observedPosition) {
      return {
        predictionId: pred.id,
        observationId: obs.id,
        modelType: pred.modelType,
        predictionTimestamp: pred.predictionTimestamp,
        validTime: pred.validTime,
        observationTimestamp: obs.observationTimestamp,
        temporalMismatchHours,
        positionErrorNm: null,
        latErrorDeg: null,
        lonErrorDeg: null,
        valueError: null,
        absoluteValueError: null,
        uncertaintyCoverage: 'UNAVAILABLE',
        uncertaintyMarginOrRadius: pred.uncertaintyRadiusNm ?? null,
        status: 'INSUFFICIENT_DATA',
        statusExplanation: 'Missing spatial position coordinates in prediction or observation record.',
        dataMode,
        provenance,
      };
    }

    const pPos = pred.predictedPosition;
    const oPos = obs.observedPosition;

    const positionErrorNm = Math.round(calculateDistanceNm(pPos.lat, pPos.lon, oPos.lat, oPos.lon) * 100) / 100;
    const latErrorDeg = Math.round((pPos.lat - oPos.lat) * 10000) / 10000;
    const lonErrorDeg = Math.round((pPos.lon - oPos.lon) * 10000) / 10000;

    // Uncertainty Coverage Evaluation
    let uncertaintyCoverage: UncertaintyCoverage = 'UNAVAILABLE';
    const radius = pred.uncertaintyRadiusNm;
    if (radius != null && radius > 0) {
      uncertaintyCoverage = positionErrorNm <= radius ? 'INSIDE' : 'OUTSIDE';
    }

    // Status Classification
    let status: ValidationStatus = 'VALIDATED_MATCH';
    let statusExplanation = `Position error (${positionErrorNm.toFixed(1)} nm) is within spatial tolerance (${spatialToleranceNm.toFixed(1)} nm).`;

    if (positionErrorNm <= spatialToleranceNm) {
      status = 'VALIDATED_MATCH';
    } else if (positionErrorNm <= spatialToleranceNm * 2.0) {
      status = 'PARTIAL_MATCH';
      statusExplanation = `Position error (${positionErrorNm.toFixed(1)} nm) exceeds spatial tolerance (${spatialToleranceNm.toFixed(1)} nm) but is within 2x threshold.`;
    } else {
      status = 'MISMATCH';
      statusExplanation = `Position error (${positionErrorNm.toFixed(1)} nm) exceeds 2x spatial tolerance (${(spatialToleranceNm * 2.0).toFixed(1)} nm).`;
    }

    return {
      predictionId: pred.id,
      observationId: obs.id,
      modelType: pred.modelType,
      predictionTimestamp: pred.predictionTimestamp,
      validTime: pred.validTime,
      observationTimestamp: obs.observationTimestamp,
      temporalMismatchHours,
      positionErrorNm,
      latErrorDeg,
      lonErrorDeg,
      valueError: positionErrorNm,
      absoluteValueError: positionErrorNm,
      uncertaintyCoverage,
      uncertaintyMarginOrRadius: radius ?? null,
      status,
      statusExplanation,
      dataMode,
      provenance,
    };
  } else {
    // SEA_ICE model validation
    if (pred.predictedValue == null || obs.observedValue == null) {
      return {
        predictionId: pred.id,
        observationId: obs.id,
        modelType: pred.modelType,
        predictionTimestamp: pred.predictionTimestamp,
        validTime: pred.validTime,
        observationTimestamp: obs.observationTimestamp,
        temporalMismatchHours,
        positionErrorNm: null,
        latErrorDeg: null,
        lonErrorDeg: null,
        valueError: null,
        absoluteValueError: null,
        uncertaintyCoverage: 'UNAVAILABLE',
        uncertaintyMarginOrRadius: pred.uncertaintyMargin ?? null,
        status: 'INSUFFICIENT_DATA',
        statusExplanation: 'Missing concentration value in prediction or observation record.',
        dataMode,
        provenance,
      };
    }

    const valueError = Math.round((pred.predictedValue - obs.observedValue) * 100) / 100;
    const absoluteValueError = Math.abs(valueError);

    // Uncertainty Coverage Evaluation
    let uncertaintyCoverage: UncertaintyCoverage = 'UNAVAILABLE';
    const margin = pred.uncertaintyMargin;
    if (margin != null && margin > 0) {
      uncertaintyCoverage = absoluteValueError <= margin ? 'INSIDE' : 'OUTSIDE';
    }

    // Status Classification
    let status: ValidationStatus = 'VALIDATED_MATCH';
    let statusExplanation = `Concentration error (${absoluteValueError.toFixed(1)}%) is within tolerance (${valueTolerance.toFixed(1)}%).`;

    if (absoluteValueError <= valueTolerance) {
      status = 'VALIDATED_MATCH';
    } else if (absoluteValueError <= valueTolerance * 2.0) {
      status = 'PARTIAL_MATCH';
      statusExplanation = `Concentration error (${absoluteValueError.toFixed(1)}%) exceeds tolerance (${valueTolerance.toFixed(1)}%) but is within 2x threshold.`;
    } else {
      status = 'MISMATCH';
      statusExplanation = `Concentration error (${absoluteValueError.toFixed(1)}%) exceeds 2x tolerance (${(valueTolerance * 2.0).toFixed(1)}%).`;
    }

    return {
      predictionId: pred.id,
      observationId: obs.id,
      modelType: pred.modelType,
      predictionTimestamp: pred.predictionTimestamp,
      validTime: pred.validTime,
      observationTimestamp: obs.observationTimestamp,
      temporalMismatchHours,
      positionErrorNm: null,
      latErrorDeg: null,
      lonErrorDeg: null,
      valueError,
      absoluteValueError,
      uncertaintyCoverage,
      uncertaintyMarginOrRadius: margin ?? null,
      status,
      statusExplanation,
      dataMode,
      provenance,
    };
  }
}

/**
 * Evaluates a batch of predictions against observations and generates aggregated validation summary.
 *
 * @param predictions PredictionRecord[]
 * @param observations ObservationRecord[]
 * @param modelType PredictionModelType
 * @param config ValidationConfig
 * @returns ModelValidationSummary
 */
export function evaluateModelValidationBatch(
  predictions: PredictionRecord[] = [],
  observations: ObservationRecord[] = [],
  modelType: PredictionModelType = 'ICEBERG_TRAJECTORY',
  config?: ValidationConfig
): ModelValidationSummary {
  const timestamp = new Date().toISOString();
  const scientificDisclaimer =
    'Internal consistency and retrospective validation metrics only. ' +
    'Does NOT constitute operational scientific certification, calibrated probability distribution, or peer-reviewed predictive accuracy. ' +
    'Models are baseline decision support tools.';

  const filteredPreds = predictions.filter((p) => p.modelType === modelType);
  const filteredObs = observations.filter((o) => o.modelType === modelType);

  const results: ValidationRecordResult[] = [];
  const statusDistribution: Record<ValidationStatus, number> = {
    VALIDATED_MATCH: 0,
    PARTIAL_MATCH: 0,
    MISMATCH: 0,
    UNMATCHED: 0,
    INSUFFICIENT_DATA: 0,
  };

  let matchedCount = 0;
  let unmatchedCount = 0;
  let insufficientCount = 0;

  let totalErrorSum = 0;
  let totalSquaredErrorSum = 0;
  let totalSignedErrorSum = 0;
  let validErrorCount = 0;

  let insideUncertaintyCount = 0;
  let evaluatedUncertaintyCount = 0;

  let overallDataMode: ValidationDataMode = 'SIMULATED';
  const dataModesSeen = new Set<ValidationDataMode>();

  for (const pred of filteredPreds) {
    if (pred.dataMode) dataModesSeen.add(pred.dataMode);

    // Find corresponding observation record by ID or closest timestamp match
    let matchingObs: ObservationRecord | undefined = filteredObs.find((o) => o.id === pred.id);
    if (!matchingObs && filteredObs.length > 0) {
      // Find observation closest in time
      let minDeltaMs = Infinity;
      const pMs = new Date(pred.validTime).getTime();

      for (const obs of filteredObs) {
        const oMs = new Date(obs.observationTimestamp).getTime();
        if (!isNaN(pMs) && !isNaN(oMs)) {
          const delta = Math.abs(pMs - oMs);
          if (delta < minDeltaMs) {
            minDeltaMs = delta;
            matchingObs = obs;
          }
        }
      }
    }

    if (matchingObs && matchingObs.dataMode) {
      dataModesSeen.add(matchingObs.dataMode);
    }

    const valResult = validatePredictionVsObservation(pred, matchingObs, config);
    results.push(valResult);
    statusDistribution[valResult.status]++;

    if (valResult.status === 'UNMATCHED') {
      unmatchedCount++;
    } else if (valResult.status === 'INSUFFICIENT_DATA') {
      insufficientCount++;
    } else {
      matchedCount++;
      const err = valResult.absoluteValueError ?? valResult.positionErrorNm;
      const signedErr = valResult.valueError;

      if (err != null) {
        totalErrorSum += err;
        totalSquaredErrorSum += err * err;
        validErrorCount++;
      }
      if (signedErr != null) {
        totalSignedErrorSum += signedErr;
      }
    }

    if (valResult.uncertaintyCoverage === 'INSIDE') {
      insideUncertaintyCount++;
      evaluatedUncertaintyCount++;
    } else if (valResult.uncertaintyCoverage === 'OUTSIDE') {
      evaluatedUncertaintyCount++;
    }
  }

  // Derive aggregated error metrics
  const meanAbsoluteError = validErrorCount > 0 ? Math.round((totalErrorSum / validErrorCount) * 100) / 100 : null;
  const rootMeanSquareError =
    validErrorCount > 0 ? Math.round(Math.sqrt(totalSquaredErrorSum / validErrorCount) * 100) / 100 : null;
  const bias = validErrorCount > 0 ? Math.round((totalSignedErrorSum / validErrorCount) * 100) / 100 : null;

  const uncertaintyCoverageRatePct =
    evaluatedUncertaintyCount > 0
      ? Math.round((insideUncertaintyCount / evaluatedUncertaintyCount) * 1000) / 10
      : null;

  // Derive Overall Data Mode
  if (dataModesSeen.has('REAL') && !dataModesSeen.has('SIMULATED')) {
    overallDataMode = 'REAL';
  } else if (dataModesSeen.has('REAL') && dataModesSeen.has('SIMULATED')) {
    overallDataMode = 'HYBRID';
  } else if (dataModesSeen.has('UNAVAILABLE') && dataModesSeen.size === 1) {
    overallDataMode = 'UNAVAILABLE';
  } else {
    overallDataMode = 'SIMULATED';
  }

  // Overall Validation Status determination
  let overallValidationStatus: ValidationStatus = 'INSUFFICIENT_DATA';
  if (filteredPreds.length === 0 || matchedCount === 0) {
    overallValidationStatus = 'INSUFFICIENT_DATA';
  } else {
    const matchRatio = statusDistribution.VALIDATED_MATCH / matchedCount;
    const partialRatio = (statusDistribution.VALIDATED_MATCH + statusDistribution.PARTIAL_MATCH) / matchedCount;

    if (matchRatio >= 0.7) {
      overallValidationStatus = 'VALIDATED_MATCH';
    } else if (partialRatio >= 0.5) {
      overallValidationStatus = 'PARTIAL_MATCH';
    } else {
      overallValidationStatus = 'MISMATCH';
    }
  }

  return {
    modelType,
    totalPredictions: filteredPreds.length,
    matchedObservationsCount: matchedCount,
    unmatchedPredictionsCount: unmatchedCount,
    insufficientDataCount: insufficientCount,
    meanAbsoluteError,
    rootMeanSquareError,
    bias,
    uncertaintyCoverageRatePct,
    statusDistribution,
    overallValidationStatus,
    results,
    dataMode: overallDataMode,
    provenance: `Phase 15A Validation Batch Engine (${filteredPreds.length} predictions evaluated)`,
    evaluationTimestamp: timestamp,
    scientificDisclaimer,
  };
}
