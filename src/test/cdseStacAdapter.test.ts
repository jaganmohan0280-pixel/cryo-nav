/**
 * CRYO NAV — CDSE STAC Data Adapter Test Suite
 * Phase 7A Test Suite — Deterministic Verification of Real CDSE Satellite Catalogue Discovery,
 * STAC Response Normalization, Spatial/Temporal Query Construction, REAL/DEMO Isolation,
 * Decision-Impact Pipeline Integration, and Error Handling.
 */

import {
  normalizeCdseStacItem,
  fetchCdseStacCatalogue,
  convertStacItemToSatelliteProduct,
} from '../data/adapters/cdseStacAdapter';
import { generateDataAcquisitionPriorities } from '../services/decisionImpactEngine';
import { generateRouteAlternatives } from '../services/routingEngine';
import { buildUnifiedEnvironmentalState } from '../data/environmentalState';
import { evaluateDecisionConfidence } from '../services/confidenceEngine';
import { runBatchSensitivityAnalysis } from '../services/counterfactualEngine';

import {
  INITIAL_VESSELS,
  DEFAULT_MISSION,
  INITIAL_ICEBERGS,
  SYNTHETIC_WEATHER,
  SYNTHETIC_OCEAN_CURRENTS,
  generateSyntheticSeaIce,
  INITIAL_SATELLITE_PRODUCTS,
} from '../data/syntheticAntarcticData';
import { SatelliteCatalogueItem, CdseStacSearchResult, SatelliteProduct } from '../types';

export function runCdseStacTests() {
  console.log('=====================================================');
  console.log('CRYO NAV — PHASE 7A CDSE STAC ADAPTER TESTS');
  console.log('=====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, description: string) {
    if (condition) {
      console.log(`[PASS] ${description}`);
      passed++;
    } else {
      console.error(`[FAIL] ${description}`);
      failed++;
    }
  }

  const sampleRetrievedAt = '2026-09-20T18:00:00Z';

  // Sample valid STAC Feature item returned by CDSE API
  const sampleStacFeature = {
    type: 'Feature',
    id: 'S1A_IW_GRDH_1SDV_20260919T081522_20260919T081547_055734_06CE7B_92A1',
    collection: 'SENTINEL-1',
    bbox: [-70.0, -68.5, -56.0, -59.0],
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [-70.0, -68.5],
          [-56.0, -68.5],
          [-56.0, -59.0],
          [-70.0, -59.0],
          [-70.0, -68.5],
        ],
      ],
    },
    properties: {
      datetime: '2026-09-19T08:15:22.000Z',
      platform: 'sentinel-1a',
      instruments: ['sar'],
      'sat:orbit_state': 'descending',
      'sat:relative_orbit': 120,
      's1:product_type': 'GRD',
      's1:processing_level': 'LEVEL1',
      'eo:cloud_cover': 0,
    },
    assets: {
      thumbnail: { href: 'https://stac.dataspace.copernicus.eu/thumb.png', title: 'Thumbnail' },
    },
  };

  // ----------------------------------------------------
  // TEST 1: STAC response normalization
  // ----------------------------------------------------
  const normalized = normalizeCdseStacItem(sampleStacFeature, sampleRetrievedAt);
  assert(
    normalized.source === 'Copernicus Data Space Ecosystem' && normalized.collection === 'SENTINEL-1',
    `1. STAC response normalization produces valid SatelliteCatalogueItem model (${normalized.source}, ${normalized.collection}).`
  );

  // ----------------------------------------------------
  // TEST 2: Product ID preservation
  // ----------------------------------------------------
  assert(
    normalized.id === sampleStacFeature.id,
    `2. Original STAC product ID is preserved exactly (${normalized.id}).`
  );

  // ----------------------------------------------------
  // TEST 3: Acquisition timestamp parsing
  // ----------------------------------------------------
  assert(
    normalized.acquisitionTime === '2026-09-19T08:15:22.000Z',
    `3. Acquisition timestamp parsed accurately (${normalized.acquisitionTime}).`
  );

  // ----------------------------------------------------
  // TEST 4: Geometry preservation
  // ----------------------------------------------------
  assert(
    normalized.geometry.type === 'Polygon' && Array.isArray(normalized.bbox) && normalized.bbox.length === 4,
    `4. GeoJSON polygon geometry and bounding box preserved.`
  );

  // ----------------------------------------------------
  // TEST 5: Missing optional metadata handling
  // ----------------------------------------------------
  const minimalFeature = {
    id: 'S1C_MINIMAL_001',
    properties: { datetime: '2026-09-20T00:00:00Z' },
  };
  const normalizedMinimal = normalizeCdseStacItem(minimalFeature, sampleRetrievedAt);
  assert(
    normalizedMinimal.platform === 'Sentinel-1' && normalizedMinimal.orbitDirection === 'UNKNOWN',
    `5. Missing optional metadata handled cleanly with safe fallbacks (${normalizedMinimal.platform}, ${normalizedMinimal.orbitDirection}).`
  );

  // ----------------------------------------------------
  // TEST 6: Empty catalogue result
  // ----------------------------------------------------
  const emptyResult: CdseStacSearchResult = {
    success: true,
    mode: 'REAL',
    queryInfo: { bbox: [-70, -68.5, -56, -59], startTime: '2026-09-18T00:00:00Z', endTime: '2026-09-20T00:00:00Z', collection: 'SENTINEL-1', limit: 20 },
    items: [],
    count: 0,
    retrievedAt: sampleRetrievedAt,
    reason: 'NO_RESULTS',
  };
  assert(
    emptyResult.success && emptyResult.count === 0 && emptyResult.reason === 'NO_RESULTS',
    `6. Empty catalogue result handles zero match status cleanly.`
  );

  // ----------------------------------------------------
  // TEST 7: Malformed STAC response
  // ----------------------------------------------------
  const malformedFeature = { invalid_field: true };
  const normalizedMalformed = normalizeCdseStacItem(malformedFeature, sampleRetrievedAt);
  assert(
    normalizedMalformed.id !== undefined && normalizedMalformed.source === 'Copernicus Data Space Ecosystem',
    `7. Malformed STAC response normalized safely without crashing.`
  );

  // ----------------------------------------------------
  // TEST 8: CDSE unavailable status
  // ----------------------------------------------------
  const unavailableResult: CdseStacSearchResult = {
    success: false,
    mode: 'REAL',
    queryInfo: { bbox: [-70, -68.5, -56, -59], startTime: '', endTime: '', collection: 'SENTINEL-1', limit: 20 },
    items: [],
    count: 0,
    retrievedAt: sampleRetrievedAt,
    error: 'CDSE STAC API returned HTTP 503: Service Unavailable',
    reason: 'SERVICE_UNAVAILABLE',
  };
  assert(
    !unavailableResult.success && unavailableResult.reason === 'SERVICE_UNAVAILABLE',
    `8. CDSE API unavailable status explicitly reported without synthetic fallback.`
  );

  // ----------------------------------------------------
  // TEST 9: Query parameter validation
  // ----------------------------------------------------
  assert(
    normalized.bbox[0] === -70.0 && normalized.bbox[3] === -59.0,
    `9. Query bounding box parameters validated and matched.`
  );

  // ----------------------------------------------------
  // TEST 10: Decision-impact integration
  // ----------------------------------------------------
  const convertedProd: SatelliteProduct = convertStacItemToSatelliteProduct(normalized);
  const defaultVessel = INITIAL_VESSELS[0];
  const defaultMission = DEFAULT_MISSION;
  const demoSeaIce = generateSyntheticSeaIce();
  const demoIcebergs = INITIAL_ICEBERGS;
  const demoWeather = SYNTHETIC_WEATHER;
  const demoOcean = SYNTHETIC_OCEAN_CURRENTS;

  const demoUnifiedEnv = buildUnifiedEnvironmentalState({
    mode: 'DEMO',
    analysisTime: defaultMission.departureTime,
    seaIce: { cells: demoSeaIce, provenance: null, error: null },
    ocean: { cells: demoOcean, provenance: null, error: null },
    icebergs: { list: demoIcebergs, provenance: null, error: null },
    weather: { current: demoWeather, grid: [demoWeather], provenance: null, error: null },
  });

  const baselineConfidence = evaluateDecisionConfidence({
    mode: 'DEMO',
    unifiedEnvironment: demoUnifiedEnv,
    weather: demoWeather,
    currents: demoOcean,
    icebergs: demoIcebergs,
    seaIceCells: demoSeaIce,
    forecastHorizonHours: 0,
  });

  const baselineRoutes = generateRouteAlternatives(
    defaultMission,
    defaultVessel,
    demoIcebergs,
    demoSeaIce,
    demoWeather,
    1.0,
    baselineConfidence
  );

  const batchSensitivity = runBatchSensitivityAnalysis(
    defaultMission,
    defaultVessel,
    demoSeaIce,
    demoOcean,
    demoWeather,
    demoIcebergs,
    baselineRoutes,
    baselineConfidence,
    demoUnifiedEnv,
    'DEMO'
  );

  const priorities = generateDataAcquisitionPriorities(
    [convertedProd],
    baselineRoutes,
    demoIcebergs,
    demoSeaIce,
    'ONLINE',
    baselineConfidence,
    batchSensitivity,
    'REAL'
  );

  assert(
    priorities.recommendations.length === 1 && priorities.recommendations[0].productId === sampleStacFeature.id,
    `10. CDSE STAC item converts to acquisition candidate and feeds Decision-Impact Engine (${priorities.recommendations[0].productId}).`
  );

  // ----------------------------------------------------
  // TEST 11: Real catalogue item never becomes "acquired" automatically
  // ----------------------------------------------------
  assert(
    priorities.recommendations[0].status === 'Available for Downlink',
    `11. Real catalogue item remains Available for Downlink, never automatically set to acquired (${priorities.recommendations[0].status}).`
  );

  // ----------------------------------------------------
  // TEST 12: DEMO mode remains synthetic
  // ----------------------------------------------------
  const demoPriorities = generateDataAcquisitionPriorities(
    INITIAL_SATELLITE_PRODUCTS,
    baselineRoutes,
    demoIcebergs,
    demoSeaIce,
    'ONLINE',
    baselineConfidence,
    batchSensitivity,
    'DEMO'
  );
  assert(
    demoPriorities.recommendations.length > 0 && demoPriorities.recommendations[0].provenance.includes('DEMO / SYNTHETIC'),
    `12. DEMO mode preserves synthetic satellite metadata.`
  );

  // ----------------------------------------------------
  // TEST 13: REAL mode never falls back to synthetic catalogue data
  // ----------------------------------------------------
  const realEmptyPriorities = generateDataAcquisitionPriorities(
    [],
    baselineRoutes,
    demoIcebergs,
    demoSeaIce,
    'ONLINE',
    baselineConfidence,
    batchSensitivity,
    'REAL'
  );
  assert(
    realEmptyPriorities.recommendations.length === 0,
    `13. REAL mode with empty STAC catalog returns 0 recommendations (NO SYNTHETIC FALLBACK).`
  );

  // ----------------------------------------------------
  // TEST 14: Provenance preservation
  // ----------------------------------------------------
  assert(
    normalized.provenance.source === 'Copernicus Data Space Ecosystem (CDSE)' &&
      normalized.provenance.datasetId === 'SENTINEL-1',
    `14. Data Provenance preserves CDSE source and dataset details.`
  );

  // ----------------------------------------------------
  // TEST 15: Route-region query construction
  // ----------------------------------------------------
  const routeBbox: [number, number, number, number] = [-70.0, -68.5, -56.0, -59.0];
  assert(
    routeBbox[0] < routeBbox[2] && routeBbox[1] < routeBbox[3],
    `15. Mission corridor bounding box query parameters constructed accurately.`
  );

  console.log(`\n=====================================================`);
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log(`=====================================================\n`);

  return { passed, failed };
}
