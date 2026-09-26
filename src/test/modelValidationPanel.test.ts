/**
 * CRYO NAV — Continuous Model Validation Panel UI Unit Tests
 * Phase 15B — Verification Suite for Retrospective Validation UI
 *
 * Verifies all 20 required test cases:
 * 1. populated validation summary
 * 2. empty validation state
 * 3. SEA_ICE
 * 4. ICEBERG_TRAJECTORY
 * 5. VALIDATED_MATCH
 * 6. PARTIAL_MATCH
 * 7. MISMATCH
 * 8. UNMATCHED
 * 9. INSUFFICIENT_DATA
 * 10. MAE/RMSE/Bias rendering
 * 11. uncertainty coverage
 * 12. status distribution
 * 13. REAL provenance
 * 14. SIMULATED provenance
 * 15. HYBRID provenance
 * 16. UNAVAILABLE provenance
 * 17. scientific disclaimer
 * 18. navigator authority disclaimer
 * 19. deterministic rendering/order
 * 20. no autonomous action
 */

import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { ModelValidationPanel } from '../components/navigation/ModelValidationPanel';
import {
  ModelValidationSummary,
  PredictionRecord,
  ObservationRecord,
  evaluateModelValidationBatch,
  validatePredictionVsObservation,
} from '../services/modelValidationEngine';

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
  } else {
    console.error(`  [FAIL] ${testName}${detail ? ` — ${detail}` : ''}`);
    throw new Error(`Assertion failed: ${testName}`);
  }
}

export function runModelValidationPanelTests() {
  console.log('========================================================================================');
  console.log('RUNNING PHASE 15B MODEL VALIDATION PANEL UI TESTS');
  console.log('========================================================================================\n');

  const validTime = '2026-09-27T12:00:00.000Z';

  // Helper mock generator for Iceberg Validation Summary
  const createMockIcebergSummary = (
    overrides: Partial<ModelValidationSummary> = {}
  ): ModelValidationSummary => {
    return {
      modelType: 'ICEBERG_TRAJECTORY',
      totalPredictions: 4,
      matchedObservationsCount: 3,
      unmatchedPredictionsCount: 1,
      insufficientDataCount: 0,
      meanAbsoluteError: 2.15,
      rootMeanSquareError: 2.85,
      bias: 0.45,
      uncertaintyCoverageRatePct: 100.0,
      statusDistribution: {
        VALIDATED_MATCH: 2,
        PARTIAL_MATCH: 1,
        MISMATCH: 0,
        UNMATCHED: 1,
        INSUFFICIENT_DATA: 0,
      },
      overallValidationStatus: 'VALIDATED_MATCH',
      results: [
        {
          predictionId: 'pred-berg-1',
          observationId: 'obs-berg-1',
          modelType: 'ICEBERG_TRAJECTORY',
          predictionTimestamp: validTime,
          validTime,
          observationTimestamp: validTime,
          temporalMismatchHours: 0.0,
          positionErrorNm: 1.2,
          latErrorDeg: 0.01,
          lonErrorDeg: 0.02,
          valueError: 1.2,
          absoluteValueError: 1.2,
          uncertaintyCoverage: 'INSIDE',
          uncertaintyMarginOrRadius: 3.0,
          status: 'VALIDATED_MATCH',
          statusExplanation: 'Position error (1.2 nm) is within spatial tolerance (5.0 nm).',
          dataMode: 'REAL',
          provenance: 'Validation Engine (USNIC vs Trajectory)',
        },
        {
          predictionId: 'pred-berg-2',
          observationId: 'obs-berg-2',
          modelType: 'ICEBERG_TRAJECTORY',
          predictionTimestamp: validTime,
          validTime,
          observationTimestamp: validTime,
          temporalMismatchHours: 0.5,
          positionErrorNm: 6.8,
          latErrorDeg: 0.05,
          lonErrorDeg: 0.08,
          valueError: 6.8,
          absoluteValueError: 6.8,
          uncertaintyCoverage: 'OUTSIDE',
          uncertaintyMarginOrRadius: 3.0,
          status: 'PARTIAL_MATCH',
          statusExplanation: 'Position error (6.8 nm) exceeds tolerance but within 2x.',
          dataMode: 'REAL',
          provenance: 'Validation Engine (USNIC vs Trajectory)',
        },
      ],
      dataMode: 'REAL',
      provenance: 'Phase 15A Validation Batch Engine',
      evaluationTimestamp: validTime,
      scientificDisclaimer: 'Internal consistency metrics only.',
      ...overrides,
    };
  };

  // Helper mock generator for Sea Ice Summary
  const createMockSeaIceSummary = (
    overrides: Partial<ModelValidationSummary> = {}
  ): ModelValidationSummary => {
    return {
      modelType: 'SEA_ICE',
      totalPredictions: 3,
      matchedObservationsCount: 3,
      unmatchedPredictionsCount: 0,
      insufficientDataCount: 0,
      meanAbsoluteError: 4.5,
      rootMeanSquareError: 5.8,
      bias: -1.2,
      uncertaintyCoverageRatePct: 100.0,
      statusDistribution: {
        VALIDATED_MATCH: 3,
        PARTIAL_MATCH: 0,
        MISMATCH: 0,
        UNMATCHED: 0,
        INSUFFICIENT_DATA: 0,
      },
      overallValidationStatus: 'VALIDATED_MATCH',
      results: [
        {
          predictionId: 'pred-ice-1',
          observationId: 'obs-ice-1',
          modelType: 'SEA_ICE',
          predictionTimestamp: validTime,
          validTime,
          observationTimestamp: validTime,
          temporalMismatchHours: 0.0,
          positionErrorNm: null,
          latErrorDeg: null,
          lonErrorDeg: null,
          valueError: -4.5,
          absoluteValueError: 4.5,
          uncertaintyCoverage: 'INSIDE',
          uncertaintyMarginOrRadius: 10.0,
          status: 'VALIDATED_MATCH',
          statusExplanation: 'Concentration error (4.5%) is within tolerance.',
          dataMode: 'SIMULATED',
          provenance: 'Validation Engine (Copernicus OSI vs Synthetic Model)',
        },
      ],
      dataMode: 'SIMULATED',
      provenance: 'Phase 15A Validation Batch Engine',
      evaluationTimestamp: validTime,
      scientificDisclaimer: 'Internal consistency metrics only.',
      ...overrides,
    };
  };

  // 1. Populated Validation Summary
  const html1 = ReactDOMServer.renderToString(
    React.createElement(ModelValidationPanel, {
      icebergValidationSummary: createMockIcebergSummary(),
      selectedModelType: 'ICEBERG_TRAJECTORY',
    })
  );
  assert(html1.includes('RETROSPECTIVE MODEL VALIDATION'), '1. populated validation summary header rendered');
  assert(html1.includes('Predictions Evaluated'), '1. predictions evaluated metric label rendered');

  // 2. Empty Validation State
  const html2 = ReactDOMServer.renderToString(
    React.createElement(ModelValidationPanel, {
      icebergValidationSummary: null,
      selectedModelType: 'ICEBERG_TRAJECTORY',
    })
  );
  assert(html2.includes('VALIDATION DATA UNAVAILABLE'), '2. empty validation state renders explicit alert banner');

  // 3. SEA_ICE
  const html3 = ReactDOMServer.renderToString(
    React.createElement(ModelValidationPanel, {
      seaIceValidationSummary: createMockSeaIceSummary(),
      selectedModelType: 'SEA_ICE',
    })
  );
  assert(html3.includes('pred-ice-1'), '3. SEA_ICE summary rendered correctly');

  // 4. ICEBERG_TRAJECTORY
  const html4 = ReactDOMServer.renderToString(
    React.createElement(ModelValidationPanel, {
      icebergValidationSummary: createMockIcebergSummary(),
      selectedModelType: 'ICEBERG_TRAJECTORY',
    })
  );
  assert(html4.includes('pred-berg-1'), '4. ICEBERG_TRAJECTORY summary rendered correctly');

  // 5. VALIDATED_MATCH
  const html5 = ReactDOMServer.renderToString(
    React.createElement(ModelValidationPanel, {
      icebergValidationSummary: createMockIcebergSummary({ overallValidationStatus: 'VALIDATED_MATCH' }),
      selectedModelType: 'ICEBERG_TRAJECTORY',
    })
  );
  assert(html5.includes('VALIDATED MATCH'), '5. VALIDATED_MATCH status badge rendered');

  // 6. PARTIAL_MATCH
  const html6 = ReactDOMServer.renderToString(
    React.createElement(ModelValidationPanel, {
      icebergValidationSummary: createMockIcebergSummary({ overallValidationStatus: 'PARTIAL_MATCH' }),
      selectedModelType: 'ICEBERG_TRAJECTORY',
    })
  );
  assert(html6.includes('PARTIAL MATCH'), '6. PARTIAL_MATCH status badge rendered');

  // 7. MISMATCH
  const html7 = ReactDOMServer.renderToString(
    React.createElement(ModelValidationPanel, {
      icebergValidationSummary: createMockIcebergSummary({ overallValidationStatus: 'MISMATCH' }),
      selectedModelType: 'ICEBERG_TRAJECTORY',
    })
  );
  assert(html7.includes('MISMATCH'), '7. MISMATCH status badge rendered');

  // 8. UNMATCHED
  const html8 = ReactDOMServer.renderToString(
    React.createElement(ModelValidationPanel, {
      icebergValidationSummary: createMockIcebergSummary({ overallValidationStatus: 'UNMATCHED' }),
      selectedModelType: 'ICEBERG_TRAJECTORY',
    })
  );
  assert(html8.includes('UNMATCHED'), '8. UNMATCHED status badge rendered');

  // 9. INSUFFICIENT_DATA
  const html9 = ReactDOMServer.renderToString(
    React.createElement(ModelValidationPanel, {
      icebergValidationSummary: createMockIcebergSummary({ overallValidationStatus: 'INSUFFICIENT_DATA' }),
      selectedModelType: 'ICEBERG_TRAJECTORY',
    })
  );
  assert(html9.includes('INSUFFICIENT DATA'), '9. INSUFFICIENT_DATA status badge rendered');

  // 10. MAE/RMSE/Bias Rendering
  assert(html1.includes('2.15 nm'), '10. MAE value (2.15 nm) rendered');
  assert(html1.includes('2.85 nm'), '10. RMSE value (2.85 nm) rendered');
  assert(html1.includes('+0.45 nm'), '10. Bias value (+0.45 nm) rendered');

  // 11. Uncertainty Coverage
  assert(html1.includes('100.0%'), '11. Uncertainty coverage rate percentage rendered');
  assert(html1.includes('INSIDE'), '11. INSIDE coverage badge rendered');
  assert(html1.includes('OUTSIDE'), '11. OUTSIDE coverage badge rendered');

  // 12. Status Distribution
  assert(html1.includes('Status Distribution Breakdown:'), '12. Status distribution header rendered');
  assert(html1.includes('VALIDATED'), '12. Status distribution counter items present');

  // 13. REAL Provenance
  const html13 = ReactDOMServer.renderToString(
    React.createElement(ModelValidationPanel, {
      icebergValidationSummary: createMockIcebergSummary({ dataMode: 'REAL' }),
      selectedModelType: 'ICEBERG_TRAJECTORY',
    })
  );
  assert(html13.includes('REAL'), '13. REAL dataMode provenance badge rendered');

  // 14. SIMULATED Provenance
  const html14 = ReactDOMServer.renderToString(
    React.createElement(ModelValidationPanel, {
      icebergValidationSummary: createMockIcebergSummary({ dataMode: 'SIMULATED' }),
      selectedModelType: 'ICEBERG_TRAJECTORY',
    })
  );
  assert(html14.includes('SIMULATED'), '14. SIMULATED dataMode provenance badge rendered');

  // 15. HYBRID Provenance
  const html15 = ReactDOMServer.renderToString(
    React.createElement(ModelValidationPanel, {
      icebergValidationSummary: createMockIcebergSummary({ dataMode: 'HYBRID' }),
      selectedModelType: 'ICEBERG_TRAJECTORY',
    })
  );
  assert(html15.includes('HYBRID'), '15. HYBRID dataMode provenance badge rendered');

  // 16. UNAVAILABLE Provenance
  const html16 = ReactDOMServer.renderToString(
    React.createElement(ModelValidationPanel, {
      icebergValidationSummary: null,
      selectedModelType: 'ICEBERG_TRAJECTORY',
    })
  );
  assert(html16.includes('UNAVAILABLE'), '16. UNAVAILABLE dataMode provenance badge rendered');

  // 17. Scientific Disclaimer
  assert(
    html1.includes('Retrospective model validation compares prior predictions with subsequently available observations.'),
    '17. Mandatory scientific disclaimer rendered verbatim'
  );

  // 18. Navigator Authority Disclaimer
  assert(
    html1.includes('CRYO NAV provides decision support. Validation results do not automatically modify models, routes, or vessel control.'),
    '18. Mandatory navigator authority disclaimer rendered verbatim'
  );

  // 19. Deterministic Rendering Across Calls
  const html19A = ReactDOMServer.renderToString(
    React.createElement(ModelValidationPanel, {
      icebergValidationSummary: createMockIcebergSummary(),
      selectedModelType: 'ICEBERG_TRAJECTORY',
    })
  );
  const html19B = ReactDOMServer.renderToString(
    React.createElement(ModelValidationPanel, {
      icebergValidationSummary: createMockIcebergSummary(),
      selectedModelType: 'ICEBERG_TRAJECTORY',
    })
  );
  assert(html19A === html19B, '19. Deterministic rendering confirmed across multiple component renders');

  // 20. No Autonomous Action / Control Language Guardrails
  assert(
    !html1.includes('Collision guaranteed') &&
      !html1.includes('Route automatically changed') &&
      !html1.includes('Model automatically retrained'),
    '20. Strictly excludes autonomous control or fake safety claims'
  );

  console.log('\n========================================================================================');
  console.log('ALL PHASE 15B MODEL VALIDATION PANEL UI TESTS PASSED!');
  console.log('========================================================================================\n');
}

runModelValidationPanelTests();
