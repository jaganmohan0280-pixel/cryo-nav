import React, { useState } from 'react';
import {
  ModelValidationSummary,
  PredictionModelType,
  ValidationStatus,
  ValidationDataMode,
  ValidationRecordResult,
} from '../../services/modelValidationEngine';
import { Activity, ShieldCheck, AlertTriangle, CheckCircle2, Clock, HelpCircle, FileText, Database } from 'lucide-react';

export interface ModelValidationPanelProps {
  icebergValidationSummary?: ModelValidationSummary | null;
  seaIceValidationSummary?: ModelValidationSummary | null;
  selectedModelType?: PredictionModelType;
  onModelTypeChange?: (modelType: PredictionModelType) => void;
}

export const ModelValidationPanel: React.FC<ModelValidationPanelProps> = ({
  icebergValidationSummary,
  seaIceValidationSummary,
  selectedModelType: propSelectedModelType,
  onModelTypeChange,
}) => {
  const [internalModelType, setInternalModelType] = useState<PredictionModelType>('ICEBERG_TRAJECTORY');

  const activeModelType = propSelectedModelType ?? internalModelType;

  const handleModelTypeSelect = (type: PredictionModelType) => {
    if (onModelTypeChange) {
      onModelTypeChange(type);
    } else {
      setInternalModelType(type);
    }
  };

  const summary =
    activeModelType === 'ICEBERG_TRAJECTORY'
      ? icebergValidationSummary
      : seaIceValidationSummary;

  const getStatusBadgeClass = (status: ValidationStatus) => {
    switch (status) {
      case 'VALIDATED_MATCH':
        return 'bg-emerald-950/80 text-emerald-400 border-emerald-700/80';
      case 'PARTIAL_MATCH':
        return 'bg-amber-950/80 text-amber-400 border-amber-700/80';
      case 'MISMATCH':
        return 'bg-rose-950/80 text-rose-400 border-rose-700/80';
      case 'UNMATCHED':
        return 'bg-purple-950/80 text-purple-400 border-purple-700/80';
      case 'INSUFFICIENT_DATA':
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  const getDataModeBadgeClass = (mode: ValidationDataMode) => {
    switch (mode) {
      case 'REAL':
        return 'bg-emerald-900/40 text-emerald-300 border-emerald-700/60';
      case 'SIMULATED':
        return 'bg-blue-900/40 text-blue-300 border-blue-700/60';
      case 'HYBRID':
        return 'bg-purple-900/40 text-purple-300 border-purple-700/60';
      case 'UNAVAILABLE':
      default:
        return 'bg-gray-800 text-gray-400 border-gray-700';
    }
  };

  const getCoverageBadgeClass = (coverage: string) => {
    switch (coverage) {
      case 'INSIDE':
        return 'bg-emerald-950 text-emerald-400 border-emerald-800';
      case 'OUTSIDE':
        return 'bg-rose-950 text-rose-400 border-rose-800';
      case 'UNAVAILABLE':
      default:
        return 'bg-gray-800 text-gray-400 border-gray-700';
    }
  };

  const unitLabel = activeModelType === 'ICEBERG_TRAJECTORY' ? 'nm' : '%';

  const hasPopulatedData =
    summary &&
    summary.totalPredictions > 0 &&
    summary.overallValidationStatus !== 'INSUFFICIENT_DATA';

  return (
    <div
      data-testid="model-validation-panel"
      className="bg-slate-900/90 border border-cyan-800/50 rounded-xl p-5 shadow-2xl backdrop-blur-md text-slate-100 space-y-5"
    >
      {/* Header & Model Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-cyan-950/80 border border-cyan-700/60 rounded-lg text-cyan-400 shadow-inner">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
              RETROSPECTIVE MODEL VALIDATION
            </h3>
            <p className="text-xs text-slate-400">
              Comparing prior model predictions with subsequently available observations
            </p>
          </div>
        </div>

        {/* Model Type Selector Tabs */}
        <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800 self-start sm:self-auto">
          <button
            type="button"
            data-testid="tab-iceberg-trajectory"
            onClick={() => handleModelTypeSelect('ICEBERG_TRAJECTORY')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 ${
              activeModelType === 'ICEBERG_TRAJECTORY'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            ICEBERG TRAJECTORY
          </button>
          <button
            type="button"
            data-testid="tab-sea-ice"
            onClick={() => handleModelTypeSelect('SEA_ICE')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 ${
              activeModelType === 'SEA_ICE'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            SEA ICE CONCENTRATION
          </button>
        </div>
      </div>

      {/* Main Validation Content */}
      {!summary || summary.totalPredictions === 0 ? (
        /* Empty / Unavailable State */
        <div
          data-testid="validation-unavailable-state"
          className="bg-slate-950/60 border border-slate-800 rounded-lg p-6 text-center space-y-3"
        >
          <div className="inline-flex p-3 bg-slate-800/80 border border-slate-700 rounded-full text-slate-400">
            <Database className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-amber-400 tracking-wider">
            VALIDATION DATA UNAVAILABLE
          </h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Insufficient matching prediction and observation records available for retrospective evaluation of {activeModelType === 'ICEBERG_TRAJECTORY' ? 'Iceberg Drift' : 'Sea Ice Concentration'}.
          </p>
          <div className="pt-2 flex justify-center">
            <span
              data-testid="provenance-badge-unavailable"
              className="px-2.5 py-0.5 rounded text-[10px] font-mono border bg-gray-800 text-gray-400 border-gray-700"
            >
              DATA MODE: UNAVAILABLE
            </span>
          </div>
        </div>
      ) : (
        /* Populated State */
        <div className="space-y-5">
          {/* Status & Provenance Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/80 p-3.5 rounded-lg border border-slate-800">
            <div className="flex items-center space-x-3">
              <span className="text-xs font-semibold text-slate-400">Overall Status:</span>
              <span
                data-testid={`overall-status-badge-${summary.overallValidationStatus.toLowerCase()}`}
                className={`px-3 py-1 rounded-md text-xs font-bold border tracking-wider ${getStatusBadgeClass(
                  summary.overallValidationStatus
                )}`}
              >
                {summary.overallValidationStatus.replace('_', ' ')}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-slate-400">Provenance:</span>
              <span
                data-testid={`provenance-badge-${summary.dataMode.toLowerCase()}`}
                className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold border ${getDataModeBadgeClass(
                  summary.dataMode
                )}`}
              >
                {summary.dataMode}
              </span>
            </div>
          </div>

          {/* Metric Cards Grid (8 Metrics) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Predictions Evaluated */}
            <div
              data-testid="metric-total-predictions"
              className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 space-y-1"
            >
              <div className="text-[11px] font-medium text-slate-400">Predictions Evaluated</div>
              <div className="text-lg font-bold text-white font-mono">{summary.totalPredictions}</div>
            </div>

            {/* Observations Matched */}
            <div
              data-testid="metric-matched-observations"
              className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 space-y-1"
            >
              <div className="text-[11px] font-medium text-slate-400">Matched Observations</div>
              <div className="text-lg font-bold text-emerald-400 font-mono">
                {summary.matchedObservationsCount}
              </div>
            </div>

            {/* Unmatched Predictions */}
            <div
              data-testid="metric-unmatched-predictions"
              className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 space-y-1"
            >
              <div className="text-[11px] font-medium text-slate-400">Unmatched Predictions</div>
              <div className="text-lg font-bold text-purple-400 font-mono">
                {summary.unmatchedPredictionsCount}
              </div>
            </div>

            {/* Insufficient Data */}
            <div
              data-testid="metric-insufficient-data"
              className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 space-y-1"
            >
              <div className="text-[11px] font-medium text-slate-400">Insufficient Data</div>
              <div className="text-lg font-bold text-slate-400 font-mono">
                {summary.insufficientDataCount}
              </div>
            </div>

            {/* MAE */}
            <div
              data-testid="metric-mae"
              className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 space-y-1"
            >
              <div className="text-[11px] font-medium text-slate-400">Mean Absolute Error (MAE)</div>
              <div className="text-lg font-bold text-cyan-300 font-mono">
                {summary.meanAbsoluteError != null
                  ? `${summary.meanAbsoluteError.toFixed(2)} ${unitLabel}`
                  : 'N/A'}
              </div>
            </div>

            {/* RMSE */}
            <div
              data-testid="metric-rmse"
              className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 space-y-1"
            >
              <div className="text-[11px] font-medium text-slate-400">RMSE</div>
              <div className="text-lg font-bold text-cyan-300 font-mono">
                {summary.rootMeanSquareError != null
                  ? `${summary.rootMeanSquareError.toFixed(2)} ${unitLabel}`
                  : 'N/A'}
              </div>
            </div>

            {/* Bias */}
            <div
              data-testid="metric-bias"
              className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 space-y-1"
            >
              <div className="text-[11px] font-medium text-slate-400">Bias (Mean Error)</div>
              <div className="text-lg font-bold text-cyan-300 font-mono">
                {summary.bias != null
                  ? `${summary.bias > 0 ? '+' : ''}${summary.bias.toFixed(2)} ${unitLabel}`
                  : 'N/A'}
              </div>
            </div>

            {/* Uncertainty Coverage Rate */}
            <div
              data-testid="metric-uncertainty-coverage-rate"
              className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 space-y-1"
            >
              <div className="text-[11px] font-medium text-slate-400">Uncertainty Coverage Rate</div>
              <div className="text-lg font-bold text-emerald-300 font-mono">
                {summary.uncertaintyCoverageRatePct != null
                  ? `${summary.uncertaintyCoverageRatePct.toFixed(1)}%`
                  : 'N/A'}
              </div>
            </div>
          </div>

          {/* Status Distribution Summary */}
          <div className="bg-slate-950/70 p-3.5 rounded-lg border border-slate-800 space-y-2">
            <div className="text-xs font-semibold text-slate-300">Status Distribution Breakdown:</div>
            <div
              data-testid="status-distribution-container"
              className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs"
            >
              <div className="bg-emerald-950/40 border border-emerald-800/60 p-2 rounded">
                <div className="text-emerald-400 font-bold font-mono">
                  {summary.statusDistribution.VALIDATED_MATCH}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">VALIDATED</div>
              </div>
              <div className="bg-amber-950/40 border border-amber-800/60 p-2 rounded">
                <div className="text-amber-400 font-bold font-mono">
                  {summary.statusDistribution.PARTIAL_MATCH}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">PARTIAL</div>
              </div>
              <div className="bg-rose-950/40 border border-rose-800/60 p-2 rounded">
                <div className="text-rose-400 font-bold font-mono">
                  {summary.statusDistribution.MISMATCH}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">MISMATCH</div>
              </div>
              <div className="bg-purple-950/40 border border-purple-800/60 p-2 rounded">
                <div className="text-purple-400 font-bold font-mono">
                  {summary.statusDistribution.UNMATCHED}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">UNMATCHED</div>
              </div>
              <div className="bg-slate-800/40 border border-slate-700/60 p-2 rounded col-span-2 sm:col-span-1">
                <div className="text-slate-400 font-bold font-mono">
                  {summary.statusDistribution.INSUFFICIENT_DATA}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">INSUFFICIENT</div>
              </div>
            </div>
          </div>

          {/* Individual Validation Records List */}
          {summary.results.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>Validation Record Log ({summary.results.length} records):</span>
              </div>
              <div
                data-testid="validation-records-list"
                className="space-y-2 max-h-60 overflow-y-auto pr-1"
              >
                {summary.results.map((rec) => (
                  <div
                    key={rec.predictionId}
                    data-testid={`validation-record-${rec.predictionId}`}
                    className="bg-slate-950/90 border border-slate-800/80 p-3 rounded-lg text-xs space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-cyan-300 font-bold">
                          Pred: {rec.predictionId}
                        </span>
                        {rec.observationId && (
                          <span className="font-mono text-slate-400">
                            | Obs: {rec.observationId}
                          </span>
                        )}
                      </div>
                      <span
                        data-testid={`record-status-${rec.status.toLowerCase()}`}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusBadgeClass(
                          rec.status
                        )}`}
                      >
                        {rec.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-300 font-mono">
                      <div>
                        <span className="text-slate-500">Temporal: </span>
                        {rec.temporalMismatchHours != null
                          ? `${rec.temporalMismatchHours.toFixed(1)}h`
                          : 'N/A'}
                      </div>
                      <div>
                        <span className="text-slate-500">Error: </span>
                        {rec.positionErrorNm != null
                          ? `${rec.positionErrorNm.toFixed(2)} nm`
                          : rec.absoluteValueError != null
                          ? `${rec.absoluteValueError.toFixed(1)}%`
                          : 'N/A'}
                      </div>
                      <div>
                        <span className="text-slate-500">Coverage: </span>
                        <span
                          data-testid={`coverage-badge-${rec.uncertaintyCoverage.toLowerCase()}`}
                          className={`px-1.5 py-0.2 rounded text-[10px] border ${getCoverageBadgeClass(
                            rec.uncertaintyCoverage
                          )}`}
                        >
                          {rec.uncertaintyCoverage}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500">Mode: </span>
                        <span className="text-slate-400">{rec.dataMode}</span>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-400 italic">
                      {rec.statusExplanation}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mandatory Scientific Disclaimer */}
      <div
        data-testid="scientific-disclaimer"
        className="bg-amber-950/30 border border-amber-800/40 p-3 rounded-lg text-xs text-amber-300/90 flex items-start space-x-2.5"
      >
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-amber-300 block mb-0.5">Scientific Disclaimer:</span>
          Retrospective model validation compares prior predictions with subsequently available observations. It does not certify operational safety, forecast probability, or navigation outcome.
        </div>
      </div>

      {/* Mandatory Navigator Authority Disclaimer */}
      <div
        data-testid="navigator-authority-disclaimer"
        className="bg-slate-950/80 border border-slate-800 p-3 rounded-lg text-xs text-slate-300 flex items-start space-x-2.5"
      >
        <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-cyan-300 block mb-0.5 font-mono">
            NAVIGATOR AUTHORITY & ZERO AUTONOMOUS ACTION:
          </span>
          CRYO NAV provides decision support. Validation results do not automatically modify models, routes, or vessel control.
        </div>
      </div>
    </div>
  );
};
