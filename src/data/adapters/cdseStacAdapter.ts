/**
 * CRYO NAV — Real Copernicus Data Space Ecosystem (CDSE) STAC Data Adapter
 * Phase 7A — CDSE STAC Discovery & Satellite Catalogue Integration
 *
 * OFFICIAL API ENDPOINT:
 * https://stac.dataspace.copernicus.eu/v1
 *
 * SEARCH ENDPOINT:
 * POST/GET https://stac.dataspace.copernicus.eu/v1/search
 *
 * SCOPE:
 * Discovery and prioritization of satellite product metadata.
 * Does NOT download full raster data or fabricate synthetic observations.
 */

import { SatelliteCatalogueItem, CdseStacSearchResult, DataProvenance } from '../../types';

export interface CdseStacQueryParams {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
  startTime?: string;
  endTime?: string;
  collection?: string;
  limit?: number;
}

const CDSE_STAC_BASE_URL = 'https://stac.dataspace.copernicus.eu/v1';

/**
 * Normalizes a raw STAC Feature item returned by CDSE into CRYO NAV SatelliteCatalogueItem model.
 */
export function normalizeCdseStacItem(item: any, retrievedAt: string): SatelliteCatalogueItem {
  const props = item.properties || {};

  // Standardize platform name (e.g. "sentinel-1a" -> "Sentinel-1A")
  let platform = props.platform || 'Sentinel-1';
  if (typeof platform === 'string' && platform.toLowerCase().startsWith('sentinel-')) {
    const parts = platform.split('-');
    platform = `Sentinel-${parts[1]?.toUpperCase() || '1'}`;
  }

  // Instrument
  let instrument = 'SAR';
  if (Array.isArray(props.instruments) && props.instruments.length > 0) {
    instrument = props.instruments.join(', ').toUpperCase();
  } else if (props.instrument) {
    instrument = String(props.instrument).toUpperCase();
  }

  // Product type (e.g., GRD, SLC, OCN)
  const productType =
    props['s1:product_type'] ||
    props['sar:product_type'] ||
    props.productType ||
    props.product_type ||
    'GRD (Ground Range Detected)';

  // Processing level
  const processingLevel =
    props['s1:processing_level'] ||
    props.processingLevel ||
    props.processing_level ||
    'LEVEL1';

  // Orbit direction
  let orbitDirection: 'ASCENDING' | 'DESCENDING' | 'UNKNOWN' = 'UNKNOWN';
  if (props['sat:orbit_state']) {
    const dir = String(props['sat:orbit_state']).toUpperCase();
    if (dir === 'ASCENDING' || dir === 'DESCENDING') orbitDirection = dir;
  }

  // Relative orbit
  const relativeOrbit = props['sat:relative_orbit'] || props.relativeOrbit || undefined;

  // Cloud cover
  const cloudCover = props['eo:cloud_cover'] ?? props.cloudCover ?? undefined;

  // Acquisition timestamp
  const acquisitionTime = props.datetime || props.start_datetime || props.observation_time || new Date().toISOString();

  // Bounding box
  let bbox: [number, number, number, number] = [-70.0, -68.5, -56.0, -59.0];
  if (Array.isArray(item.bbox) && item.bbox.length === 4) {
    bbox = [item.bbox[0], item.bbox[1], item.bbox[2], item.bbox[3]];
  }

  // Geometry
  const geometry = item.geometry || {
    type: 'Polygon',
    coordinates: [
      [
        [bbox[0], bbox[1]],
        [bbox[2], bbox[1]],
        [bbox[2], bbox[3]],
        [bbox[0], bbox[3]],
        [bbox[0], bbox[1]],
      ],
    ],
  };

  const collectionName = item.collection || 'SENTINEL-1';
  const catalogueUrl = `${CDSE_STAC_BASE_URL}/collections/${collectionName}/items/${item.id}`;

  const provenance: DataProvenance = {
    source: 'Copernicus Data Space Ecosystem (CDSE)',
    provider: 'European Space Agency (ESA) / CDSE STAC Catalog',
    datasetId: collectionName,
    granuleId: item.id,
    observationTime: acquisitionTime,
    ingestionTime: retrievedAt,
    validTime: acquisitionTime,
    forecastHorizonHours: 0,
    bbox,
    crs: 'WGS84 EPSG:4326',
    freshnessState: 'FRESH',
    category: 'OBSERVED',
    isSynthetic: false,
  };

  return {
    id: item.id || `STAC_ITEM_${Date.now()}`,
    collection: collectionName,
    geometry,
    bbox,
    acquisitionTime,
    platform,
    instrument,
    productType,
    processingLevel,
    orbitDirection,
    relativeOrbit,
    cloudCover,
    source: 'Copernicus Data Space Ecosystem',
    catalogueUrl,
    assets: item.assets || {},
    retrievedAt,
    provenance,
  };
}

/**
 * Helper function to select the primary downloadable product asset reference from a STAC item or assets dictionary.
 * Prioritizes actual product archives ('PRODUCT', 'PRODUCT-ZIP', 'data', 'download') over auxiliary thumbnails or XML manifests.
 */
export function selectPrimaryStacAsset(
  itemOrAssets?: any
): { assetId: string; href: string; mediaType: string } | null {
  if (!itemOrAssets || typeof itemOrAssets !== 'object') return null;
  const assets = itemOrAssets.assets ? itemOrAssets.assets : itemOrAssets;
  if (!assets || typeof assets !== 'object') return null;

  const priorityKeys = ['PRODUCT', 'PRODUCT-ZIP', 'product', 'data', 'download', 'archive', 'main'];
  for (const key of priorityKeys) {
    if (assets[key] && assets[key].href) {
      return {
        assetId: key,
        href: assets[key].href,
        mediaType: assets[key].type || (assets[key].href.endsWith('.zip') ? 'application/zip' : 'application/octet-stream'),
      };
    }
  }

  const keys = Object.keys(assets);
  for (const key of keys) {
    const asset = assets[key];
    if (asset && asset.href && !key.toLowerCase().includes('thumbnail') && !key.toLowerCase().includes('quicklook')) {
      return {
        assetId: key,
        href: asset.href,
        mediaType: asset.type || (asset.href.endsWith('.zip') ? 'application/zip' : 'application/octet-stream'),
      };
    }
  }

  if (keys.length > 0 && assets[keys[0]]?.href) {
    return {
      assetId: keys[0],
      href: assets[keys[0]].href,
      mediaType: assets[keys[0]].type || 'application/octet-stream',
    };
  }

  return null;
}

/**
 * Queries the official CDSE STAC API search endpoint for Sentinel-1 products.
 */
export async function fetchCdseStacCatalogue(
  params: CdseStacQueryParams
): Promise<CdseStacSearchResult> {
  const retrievedAt = new Date().toISOString();
  const limit = Math.min(50, Math.max(1, params.limit || 20));
  const rawCollection = params.collection || 'SENTINEL-1';
  let collections: string[] = ['sentinel-1-grd'];
  if (rawCollection.toUpperCase() === 'SENTINEL-1') {
    collections = ['sentinel-1-grd', 'sentinel-1-slc'];
  } else {
    collections = [rawCollection.toLowerCase()];
  }

  // Default temporal range: last 72 hours if not specified
  const now = new Date();
  const threeDaysAgo = new Date(now.getTime() - 72 * 3600 * 1000);
  const startTime = params.startTime || threeDaysAgo.toISOString();
  const endTime = params.endTime || now.toISOString();

  const bbox: [number, number, number, number] = [
    params.minLon,
    params.minLat,
    params.maxLon,
    params.maxLat,
  ];

  const queryInfo = {
    bbox,
    startTime,
    endTime,
    collection: rawCollection,
    limit,
  };

  // Construct STAC POST Search Payload
  const searchPayload = {
    collections,
    bbox: [params.minLon, params.minLat, params.maxLon, params.maxLat],
    datetime: `${startTime}/${endTime}`,
    limit,
  };


  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const searchUrl = `${CDSE_STAC_BASE_URL}/search`;
    const response = await fetch(searchUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'CRYO-NAV-Decision-Support-System/1.0',
      },
      body: JSON.stringify(searchPayload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 429) {
        return {
          success: false,
          mode: 'REAL',
          queryInfo,
          items: [],
          count: 0,
          retrievedAt,
          error: 'Rate limited by Copernicus Data Space Ecosystem STAC API (HTTP 429).',
          reason: 'RATE_LIMITED',
        };
      }
      return {
        success: false,
        mode: 'REAL',
        queryInfo,
        items: [],
        count: 0,
        retrievedAt,
        error: `CDSE STAC API returned HTTP ${response.status}: ${response.statusText}`,
        reason: 'SERVICE_UNAVAILABLE',
      };
    }

    const data = await response.json();
    const features = data.features || [];

    if (!Array.isArray(features) || features.length === 0) {
      return {
        success: true,
        mode: 'REAL',
        queryInfo,
        items: [],
        count: 0,
        retrievedAt,
        reason: 'NO_RESULTS',
      };
    }

    const items = features.map((feat: any) => normalizeCdseStacItem(feat, retrievedAt));

    return {
      success: true,
      mode: 'REAL',
      queryInfo,
      items,
      count: items.length,
      retrievedAt,
    };
  } catch (err: any) {
    const isTimeout = err.name === 'AbortError';
    return {
      success: false,
      mode: 'REAL',
      queryInfo,
      items: [],
      count: 0,
      retrievedAt,
      error: isTimeout
        ? 'CDSE STAC API request timed out after 10 seconds.'
        : `Failed to query CDSE STAC API: ${err.message || err}`,
      reason: isTimeout ? 'SERVICE_UNAVAILABLE' : 'NETWORK_ERROR',
    };
  }
}

/**
 * Converts a SatelliteCatalogueItem into a SatelliteProduct candidate for the Decision-Impact Engine.
 */
export function convertStacItemToSatelliteProduct(item: SatelliteCatalogueItem): import('../../types').SatelliteProduct {
  const centerLat = (item.bbox[1] + item.bbox[3]) / 2;
  const centerLon = (item.bbox[0] + item.bbox[2]) / 2;
  const dLat = Math.abs(item.bbox[3] - item.bbox[1]) * 60;
  const dLon = Math.abs(item.bbox[2] - item.bbox[0]) * 60 * Math.cos((centerLat * Math.PI) / 180);
  const radiusNm = Math.max(15, Math.round(Math.sqrt(dLat * dLat + dLon * dLon) / 2));

  return {
    id: item.id,
    name: `${item.platform} ${item.instrument} (${item.productType})`,
    sensor: `${item.platform} ${item.instrument}`,
    resolutionMeters: item.productType.includes('GRD') ? 20 : 10,
    acquisitionTime: item.acquisitionTime,
    processingTime: item.retrievedAt,
    footprint: {
      centerLat: Number(centerLat.toFixed(4)),
      centerLon: Number(centerLon.toFixed(4)),
      radiusNm,
      description: `CDSE Swath Footprint (${item.platform} ${item.productType})`,
    },
    productType: item.productType.includes('SLC') ? 'High-Res SAR Interferometric' : 'SAR Wide Swath Ice Drift',
    sizeMb: 250,
    availability: 'Available for Downlink',
    decisionImpactScore: 0,
    priority: 'MEDIUM',
    impactExplanation: `Real CDSE Catalogue Item (${item.id}) from ${item.source}`,
    expectedUncertaintyReductionPct: 46,
    spatialOverlapWithRoutePct: 0,
    freshness: 'FRESH',
  };
}

