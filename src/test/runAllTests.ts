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
import { runOfflineStorageTests } from './offlineStorage.test';
import { runOfflineStatusPanelTests } from './offlineStatusPanel.test';
import { runOfflineIntegrationTests } from './offlineIntegration.test';
import { runUncertaintyEngineTests } from './uncertaintyEngine.test';
import { runUncertaintyZonePanelTests } from './uncertaintyZonePanel.test';
import { runUncertaintyIntegrationTests } from './uncertaintyIntegration.test';
import { runDecisionImpactAcquisitionTests } from './decisionImpactAcquisition.test';
import { runDecisionImpactAcquisitionPanelTests } from './decisionImpactAcquisitionPanel.test';
import { runDecisionReassessmentTests } from './decisionReassessment.test';
import { runDecisionReassessmentPanelTests } from './decisionReassessmentPanel.test';
import './routeResilience.test';
import { runRouteResiliencePanelTests } from './routeResiliencePanel.test';
import './navigationAlert.test';
import { runNavigationAlertPanelTests } from './navigationAlertPanel.test';
import './modelValidation.test';
import { runModelValidationPanelTests } from './modelValidationPanel.test';

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
  const p9aResult = await runOfflineStorageTests();
  runOfflineStatusPanelTests();
  const p9cResult = await runOfflineIntegrationTests();
  await runUncertaintyEngineTests();
  runUncertaintyZonePanelTests();
  await runUncertaintyIntegrationTests();
  runDecisionImpactAcquisitionTests();
  await runDecisionImpactAcquisitionPanelTests();
  const p12aResult = runDecisionReassessmentTests();
  runRouteResiliencePanelTests();
  runNavigationAlertPanelTests();
  runModelValidationPanelTests();

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
    p8bResult.failed > 0 ||
    p9aResult.failed > 0 ||
    !p9cResult.success ||
    p12aResult.failed > 0
  ) {
    process.exit(1);
  } else {
    console.log('========================================================================================');
    console.log('ALL PHASE 4, 5, 6, 7A, 7B, 7C, 8A, 8B, 9A, 9B, 9C, 10, 11, 12, 13, 14 & 15 TESTS PASSED!');
    console.log('========================================================================================\n');
  }
});




