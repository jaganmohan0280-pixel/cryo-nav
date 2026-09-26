/**
 * CRYO NAV — Master Unit Test Runner
 * Runs Phase 4 (Decision Confidence), Phase 5 (Counterfactual Sensitivity),
 * and Phase 6 (Decision-Impact Data Acquisition Engine) test suites.
 */

import { runCounterfactualTests } from './counterfactualEngine.test';
import { runDecisionImpactTests } from './decisionImpactEngine.test';
import { runCdseStacTests } from './cdseStacAdapter.test';
import { runSatelliteAcquisitionTests } from './satelliteAcquisition.test';
import { runSentinel1ValidationTests } from './sentinel1Validation.test';
import { runSentinel1ProcessingTests } from './sentinel1Processing.test';
import { runSentinel1FeatureExtractorTests } from './sentinel1FeatureExtractor.test';
import { runSarCandidateConfirmationTests } from './sarCandidateConfirmation.test';
import { runAreaSarAnalysisTests } from './areaSarAnalysis.test';
import { runVoyageStateTests } from './voyageState.test';
import { runHazardEncounterTests } from './hazardEncounter.test';

// 1. Run Phase 4 Decision Confidence Tests (auto-runs on import)
import './confidenceEngine.test';

// 2. Run Phase 5 Counterfactual Sensitivity Tests
const p5Result = runCounterfactualTests();

// 3. Run Phase 6 Decision-Impact Data Acquisition Tests
const p6Result = runDecisionImpactTests();

// 4. Run Phase 7A CDSE STAC Satellite Catalogue Integration Tests
const p7aResult = runCdseStacTests();

// 5. Run Phase 7B Satellite Product Acquisition & Caching Tests
const p7bPromise = runSatelliteAcquisitionTests();

p7bPromise.then(async (p7bResult) => {
  const p7c1Result = await runSentinel1ValidationTests();
  const p7c2Result = await runSentinel1ProcessingTests();
  const p7c3Result = await runSentinel1FeatureExtractorTests();
  const p7c4Result = await runSarCandidateConfirmationTests();
  const p7c4UxResult = runAreaSarAnalysisTests();
  runVoyageStateTests();
  const p8bResult = runHazardEncounterTests();

  if (
    p5Result.failed > 0 ||
    p6Result.failed > 0 ||
    p7aResult.failed > 0 ||
    p7bResult.failed > 0 ||
    p7c1Result.failed > 0 ||
    p7c2Result.failed > 0 ||
    p7c3Result.failed > 0 ||
    p7c4Result.failed > 0 ||
    p7c4UxResult.failed > 0 ||
    p8bResult.failed > 0
  ) {
    process.exit(1);
  } else {
    console.log('========================================================================================');
    console.log('ALL PHASE 4, 5, 6, 7A, 7B, 7C, 8A & 8B HAZARD ENCOUNTER TESTS PASSED!');
    console.log('========================================================================================\n');
  }
});



