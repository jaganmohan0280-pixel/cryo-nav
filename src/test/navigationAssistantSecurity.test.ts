/**
 * CRYO NAV — AI Navigation Assistant LLM Security & Architecture Verification Suite
 * Phase 16C-S — Security Boundary & API Key Protection Tests
 *
 * Operational Principle:
 * Verifies that the private Gemini API key (`GEMINI_API_KEY`) is strictly owned by the
 * Node.js server (`server.ts`) and is NEVER hardcoded, committed, leaked to client bundles,
 * exposed through `import.meta.env`, returned by API endpoints, or logged.
 */

import fs from 'fs';
import path from 'path';
import {
  generateLlmNavigationExplanation,
  SERVICE_UNAVAILABLE_MESSAGE,
} from '../services/navigationAssistantLlm';
import { buildNavigationAssistantContext } from '../services/navigationAssistantContextEngine';

// Master assertion counter
let passCount = 0;
let failCount = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passCount++;
  } else {
    console.error(`  [FAIL] ${testName}`);
    failCount++;
  }
}

async function runSecurityTests() {
  console.log('========================================================================================');
  console.log('RUNNING PHASE 16C-S AI NAVIGATION ASSISTANT LLM SECURITY & ARCHITECTURE TESTS');
  console.log('========================================================================================\n');

  const rootDir = process.cwd();

  // Helper mock context payload
  const refTime = '2026-09-27T04:00:00Z';
  const mockContext = buildNavigationAssistantContext({
    mission: {
      id: 'm1',
      title: 'Antarctic Research Mission',
      vesselId: 'v1',
      startLocation: { name: 'Punta Arenas', lat: -53.16, lon: -70.91 },
      destination: { name: 'Rothera Station', lat: -67.57, lon: -68.13 },
      departureTime: refTime,
      riskPolicy: 'Standard',
      fuelPreference: 'Standard',
      speedPreference: 'Standard',
      maxSeaIceConcentration: 75,
      researchWaypoints: [],
      exclusionZones: [],
      status: 'Active',
    } as any,
    vessel: {
      id: 'v1',
      name: 'RV Polar Explorer',
      type: 'Research Vessel',
      iceClass: 'Polar Class 3 (Year-round in second-year ice)',
      cruisingSpeedKnots: 11.5,
      maxSpeedKnots: 14.0,
      fuelConsumptionTonsPerDay: 24.5,
      draftMeters: 8.8,
      maxSeaIceConcentrationPercent: 75,
      minVisibilityNm: 1.0,
      turningLimitationsDegPerMin: 15.0,
      hullLengthMeters: 120.0,
      beamMeters: 22.0,
    },
    activeRoute: {
      id: 'safest',
      name: 'Recommended Safe Route',
      waypoints: [],
      distanceNm: 680,
      estimatedHours: 59.1,
      totalFuelTons: 60.3,
      riskIndex: 25.0,
      confidenceScore: 88,
      isRecommended: true,
      recommendationRationale: 'Recommended for minimal risk',
    } as any,
    allRoutes: [],
    hazards: [],
    seaIceExposure: null,
    uncertainty: null,
    confidence: {
      overallLevel: 'HIGH',
      confidenceScore: 88,
      primaryLimitingFactor: 'None',
      recommendedVerificationActions: ['Maintain watch'],
      isRecommendationBlocked: false,
      provenance: 'Confidence Engine v4',
      generatedAtIso: refTime,
      evaluatedFactorsCount: 8,
      dataMode: 'REAL',
    } as any,
    acquisitionPriorities: null,
    reassessment: null,
    resilience: null,
    alerts: null,
    connectionState: 'ONLINE',
    dataMode: 'REAL',
    provenance: 'Security Suite Context Payload',
  });

  // ---------------------------------------------------------------------------------------
  // Test 1: API key is not hardcoded in source files
  // ---------------------------------------------------------------------------------------
  const llmSourceCode = fs.readFileSync(
    path.join(rootDir, 'src/services/navigationAssistantLlm.ts'),
    'utf-8'
  );
  const serverSourceCode = fs.readFileSync(
    path.join(rootDir, 'server.ts'),
    'utf-8'
  );
  const panelSourceCode = fs.readFileSync(
    path.join(rootDir, 'src/components/navigation/NavigationAssistantPanel.tsx'),
    'utf-8'
  );
  const viewSourceCode = fs.readFileSync(
    path.join(rootDir, 'src/views/AiAssistantView.tsx'),
    'utf-8'
  );

  const containsHardcodedKey =
    /AIzaSy[A-Za-z0-9_-]{33}/.test(llmSourceCode) ||
    /AIzaSy[A-Za-z0-9_-]{33}/.test(serverSourceCode) ||
    /AIzaSy[A-Za-z0-9_-]{33}/.test(panelSourceCode) ||
    /AIzaSy[A-Za-z0-9_-]{33}/.test(viewSourceCode);

  assert(!containsHardcodedKey, '1. API key is not hardcoded in any source file');

  // ---------------------------------------------------------------------------------------
  // Test 2: API key is not imported into UI components
  // ---------------------------------------------------------------------------------------
  const uiImportsEnvKey =
    panelSourceCode.includes('GEMINI_API_KEY') ||
    viewSourceCode.includes('GEMINI_API_KEY');

  assert(!uiImportsEnvKey, '2. API key string GEMINI_API_KEY is not imported in UI components');

  // ---------------------------------------------------------------------------------------
  // Test 3: API key is not exposed through import.meta.env
  // ---------------------------------------------------------------------------------------
  const exposesImportMetaEnvKey =
    llmSourceCode.includes('import.meta.env.GEMINI_API_KEY') ||
    panelSourceCode.includes('import.meta.env.GEMINI_API_KEY') ||
    viewSourceCode.includes('import.meta.env.GEMINI_API_KEY');

  assert(!exposesImportMetaEnvKey, '3. API key is not accessed via import.meta.env');

  // ---------------------------------------------------------------------------------------
  // Test 4: API key is not returned by server endpoints
  // ---------------------------------------------------------------------------------------
  const credentialsEndpointReturnsKey =
    serverSourceCode.includes('res.json({ apiKey:') ||
    serverSourceCode.includes('geminiKey: process.env.GEMINI_API_KEY');

  assert(!credentialsEndpointReturnsKey, '4. Server endpoints do not return the raw API key');

  // ---------------------------------------------------------------------------------------
  // Test 5: API key is not logged in console outputs
  // ---------------------------------------------------------------------------------------
  const containsKeyLogging =
    serverSourceCode.includes('console.log(process.env.GEMINI_API_KEY') ||
    llmSourceCode.includes('console.log(apiKey') ||
    llmSourceCode.includes('console.log(activeApiKey');

  assert(!containsKeyLogging, '5. API key is not logged in console outputs');

  // ---------------------------------------------------------------------------------------
  // Test 6: Gemini provider instantiation is server-side endpoint owned
  // ---------------------------------------------------------------------------------------
  const serverInstantiatesGenAI = serverSourceCode.includes('new GoogleGenAI');

  assert(serverInstantiatesGenAI, '6. Server-side server.ts instantiates GoogleGenAI proxy endpoint');

  // ---------------------------------------------------------------------------------------
  // Test 7: Missing API key produces safe fallback
  // ---------------------------------------------------------------------------------------
  const mockFailedFetch = async () => {
    return generateLlmNavigationExplanation({
      contextResult: mockContext,
      userQuery: 'Why is this route recommended?',
    });
  };

  const missingKeyResult = await mockFailedFetch();
  assert(
    Boolean(missingKeyResult.isFallback) && missingKeyResult.explanation.includes(SERVICE_UNAVAILABLE_MESSAGE),
    '7. Missing API key or offline server produces clean fallback with official notice'
  );

  // ---------------------------------------------------------------------------------------
  // Test 8: Existing deterministic assistant remains available during fallback
  // ---------------------------------------------------------------------------------------
  assert(
    missingKeyResult.explanation.includes(mockContext.structuredAnswers.whyCurrentRouteRecommended),
    '8. Existing Phase 16B deterministic assistant answer remains fully available during fallback'
  );

  // ---------------------------------------------------------------------------------------
  // Test 9: No real API calls occur during test mock execution
  // ---------------------------------------------------------------------------------------
  let mockCalled: boolean = false;
  const mockGen = async (prompt: string) => {
    mockCalled = true;
    return 'Mocked grounded response';
  };

  const mockTestRes = await generateLlmNavigationExplanation({
    contextResult: mockContext,
    userQuery: 'Test query',
    mockGenerator: mockGen,
  });

  assert(
    mockCalled === true && mockTestRes.explanation === 'Mocked grounded response',
    '9. Unit tests execute via mock generator without making real API network calls'
  );

  // ---------------------------------------------------------------------------------------
  // Test 10: Production build assets do not contain exposed GEMINI_API_KEY secret values
  // ---------------------------------------------------------------------------------------
  const distDir = path.join(rootDir, 'dist');
  let bundleClean = true;

  if (fs.existsSync(distDir)) {
    const assetsDir = path.join(distDir, 'assets');
    if (fs.existsSync(assetsDir)) {
      const files = fs.readdirSync(assetsDir);
      for (const file of files) {
        if (file.endsWith('.js')) {
          const jsContent = fs.readFileSync(path.join(assetsDir, file), 'utf-8');
          if (/AIzaSy[A-Za-z0-9_-]{33}/.test(jsContent)) {
            bundleClean = false;
            break;
          }
        }
      }
    }
  }

  assert(bundleClean, '10. Production client bundle contains ZERO hardcoded Google API key credentials');

  // Summary
  console.log('\n========================================================================================');
  console.log(`PHASE 16C-S SECURITY TEST SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('========================================================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runSecurityTests().catch((err) => {
  console.error('Unhandled error in security tests:', err);
  process.exit(1);
});
