/**
 * CRYO NAV — Unified Environmental Data Contract & Alignment Engine
 * Phase 3A: Unified Environmental State, Spatial/Temporal Alignment & Data Quality Assessment
 *
 * PIPELINE:
 * Real Sea Ice (Copernicus)  ──┐
 * Real Ocean (Copernicus)    ──┼──> Validation & Alignment Engine ──> Unified Environmental State
 * Real Icebergs (USNIC)      ──┤    (environmentalState.ts)            (Analysis-Ready Record)
 * Real Weather (ECMWF IFS)   ──┘
 *
 * SCIENTIFIC HONESTY:
 * Environmental alignment evaluates temporal compatibility, spatial coverage, and source-native metadata.
 * It does NOT perform spatial resampling or force multi-source fusion into a single grid.
 * Source-native resolutions, CRSs, and raw timestamps are strictly preserved.
 */

import {
  EnvironmentalDataMode,
  DataProvenance,
  SeaIceCell,
  OceanCurrentCell,
  IcebergDetection,
  WeatherCondition,
  SourceQualityState,
  OverallQualityState,
  CoverageState,
  TemporalAlignmentStatus,
  SourceAlignmentSummary,
  EnvironmentalAlignmentResult,
} from '../types';

export interface UnifiedStateInput {
  mode: EnvironmentalDataMode;
  analysisTime?: string;
  regionBbox?: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
  regionName?: string;
  seaIce: {
    cells: SeaIceCell[];
    provenance: DataProvenance | null;
    error: string | null;
  };
  ocean: {
    cells: OceanCurrentCell[];
    provenance: DataProvenance | null;
    error: string | null;
  };
  icebergs: {
    list: IcebergDetection[];
    provenance: DataProvenance | null;
    error: string | null;
  };
  weather: {
    current: WeatherCondition | null;
    grid: WeatherCondition[];
    provenance: DataProvenance | null;
    error: string | null;
  };
}

/**
 * Calculates temporal alignment status and time difference in hours between a source timestamp and analysisTime.
 */
export function calculateTemporalAlignment(
  sourceTimeIso: string | null | undefined,
  analysisTimeIso: string
): { timeDiffHours: number | null; temporalStatus: TemporalAlignmentStatus } {
  if (!sourceTimeIso || isNaN(Date.parse(sourceTimeIso))) {
    return { timeDiffHours: null, temporalStatus: 'MISSING' };
  }

  const sourceTime = new Date(sourceTimeIso).getTime();
  const analysisTime = new Date(analysisTimeIso).getTime();
  const diffHours = Number((Math.abs(analysisTime - sourceTime) / 3600000).toFixed(1));

  let temporalStatus: TemporalAlignmentStatus = 'ALIGNED';
  if (diffHours <= 3.0) {
    temporalStatus = 'ALIGNED';
  } else if (diffHours <= 12.0) {
    temporalStatus = 'WITHIN_TOLERANCE';
  } else if (diffHours <= 24.0) {
    temporalStatus = 'AGING';
  } else if (diffHours <= 72.0) {
    temporalStatus = 'STALE';
  } else {
    temporalStatus = 'OUT_OF_WINDOW';
  }

  return { timeDiffHours: diffHours, temporalStatus };
}

/**
 * Evaluates spatial coverage state for a source against the target mission bounding box.
 */
export function evaluateSpatialCoverage(
  recordsCount: number,
  sourceBbox: [number, number, number, number] | undefined,
  targetBbox: [number, number, number, number],
  error: string | null
): CoverageState {
  if (error || recordsCount === 0) {
    return 'NONE';
  }

  if (!sourceBbox || sourceBbox.length !== 4) {
    return recordsCount >= 4 ? 'COMPLETE' : 'PARTIAL';
  }

  const [sMinLon, sMinLat, sMaxLon, sMaxLat] = sourceBbox;
  const [tMinLon, tMinLat, tMaxLon, tMaxLat] = targetBbox;

  // Check full containment/overlap
  const coversLat = sMinLat <= tMinLat + 0.5 && sMaxLat >= tMaxLat - 0.5;
  const coversLon = sMinLon <= tMinLon + 0.5 && sMaxLon >= tMaxLon - 0.5;

  if (coversLat && coversLon) {
    return 'COMPLETE';
  } else if (recordsCount > 0) {
    return 'PARTIAL';
  }
  return 'NONE';
}

/**
 * Evaluates source quality state based on error status, temporal freshness, and coverage.
 */
export function evaluateSourceQuality(
  error: string | null,
  recordsCount: number,
  temporalStatus: TemporalAlignmentStatus,
  coverage: CoverageState,
  mode: EnvironmentalDataMode
): SourceQualityState {
  if (error || (mode === 'REAL' && recordsCount === 0)) {
    return 'MISSING';
  }
  if (coverage === 'NONE') {
    return 'OUT_OF_COVERAGE';
  }
  if (temporalStatus === 'OUT_OF_WINDOW' || temporalStatus === 'STALE') {
    return 'STALE';
  }
  if (coverage === 'PARTIAL' || temporalStatus === 'AGING') {
    return 'SUSPECT';
  }
  return 'VALID';
}

/**
 * Builds the unified analysis-ready environmental state contract.
 */
export function buildUnifiedEnvironmentalState(input: UnifiedStateInput): EnvironmentalAlignmentResult {
  const mode = input.mode;
  const analysisTime = input.analysisTime || new Date().toISOString();
  const targetBbox: [number, number, number, number] = input.regionBbox || [-70.0, -68.5, -56.0, -59.0];
  const regionName = input.regionName || 'Antarctic Peninsula / Marguerite Bay Sector';
  const displayCrs = 'EPSG:4326 (WGS84 Geographical Coordinates)';

  // 1. Sea Ice Alignment Evaluation
  const seaIceCount = input.seaIce.cells.length;
  const seaIceProv = input.seaIce.provenance;
  const seaIceTime = seaIceProv?.validTime || seaIceProv?.observationTime || (seaIceCount > 0 && input.seaIce.cells[0]?.timestamp ? input.seaIce.cells[0].timestamp : mode === 'DEMO' && seaIceCount > 0 ? analysisTime : null);
  const seaIceTemp = calculateTemporalAlignment(seaIceTime, analysisTime);
  const seaIceCoverage = evaluateSpatialCoverage(seaIceCount, seaIceProv?.bbox, targetBbox, input.seaIce.error);
  const seaIceQuality = evaluateSourceQuality(input.seaIce.error, seaIceCount, seaIceTemp.temporalStatus, seaIceCoverage, mode);

  const seaIceSummary: SourceAlignmentSummary = {
    sourceName: 'Copernicus Marine Sea-Ice Concentration',
    provider: seaIceProv?.provider || (mode === 'REAL' ? 'EUMETSAT OSI SAF' : 'CRYO NAV Synthetic Generator'),
    datasetId: seaIceProv?.datasetId || 'SEAICE_GLO_SEAICE_L4_NRT_OBSERVATIONS_011_001',
    category: seaIceProv?.category || (mode === 'REAL' ? 'OBSERVED' : 'SYNTHETIC'),
    sourceTime: seaIceProv?.observationTime || seaIceTime || analysisTime,
    validTime: seaIceProv?.validTime || seaIceTime || analysisTime,
    retrievalTime: seaIceProv?.ingestionTime || null,
    timeDiffHours: seaIceTemp.timeDiffHours,
    temporalStatus: seaIceTemp.temporalStatus,
    quality: seaIceQuality,
    coverage: seaIceCoverage,
    sourceResolution: '10 km (0.10° OSI-401-d L4 Analysis Grid)',
    sourceCrs: seaIceProv?.crs || 'EPSG:4326',
    displayCrs,
    provenance: seaIceProv,
    isRealData: mode === 'REAL' && Boolean(seaIceProv && !seaIceProv.isSynthetic),
    errorMessage: input.seaIce.error,
  };

  // 2. Ocean Current Hydrodynamics Alignment Evaluation
  const oceanCount = input.ocean.cells.length;
  const oceanProv = input.ocean.provenance;
  const oceanTime = oceanProv?.validTime || oceanProv?.observationTime || (mode === 'DEMO' && oceanCount > 0 ? analysisTime : null);
  const oceanTemp = calculateTemporalAlignment(oceanTime, analysisTime);
  const oceanCoverage = evaluateSpatialCoverage(oceanCount, oceanProv?.bbox, targetBbox, input.ocean.error);
  const oceanQuality = evaluateSourceQuality(input.ocean.error, oceanCount, oceanTemp.temporalStatus, oceanCoverage, mode);

  const oceanSummary: SourceAlignmentSummary = {
    sourceName: 'Copernicus Marine 3D Ocean Hydrodynamics',
    provider: oceanProv?.provider || (mode === 'REAL' ? 'Mercator Ocean International (NEMO 3D)' : 'CRYO NAV Synthetic Streamlines'),
    datasetId: oceanProv?.datasetId || 'GLOBAL_ANALYSISFORECAST_PHY_001_024',
    category: oceanProv?.category || (mode === 'REAL' ? 'FORECAST' : 'SYNTHETIC'),
    sourceTime: oceanProv?.observationTime || oceanTime || analysisTime,
    validTime: oceanProv?.validTime || oceanTime || analysisTime,
    retrievalTime: oceanProv?.ingestionTime || null,
    timeDiffHours: oceanTemp.timeDiffHours,
    temporalStatus: oceanTemp.temporalStatus,
    quality: oceanQuality,
    coverage: oceanCoverage,
    sourceResolution: '8 km (1/12° NEMO 3D Hydrodynamic Surface Field)',
    sourceCrs: oceanProv?.crs || 'EPSG:4326',
    displayCrs,
    provenance: oceanProv,
    isRealData: mode === 'REAL' && Boolean(oceanProv && !oceanProv.isSynthetic),
    errorMessage: input.ocean.error,
  };

  // 3. Iceberg Observations Alignment Evaluation
  const icebergCount = input.icebergs.list.length;
  const icebergProv = input.icebergs.provenance;
  const icebergTime = icebergProv?.observationTime || (icebergCount > 0 && input.icebergs.list[0]?.observationTime ? input.icebergs.list[0].observationTime : mode === 'DEMO' && icebergCount > 0 ? analysisTime : null);
  const icebergTemp = calculateTemporalAlignment(icebergTime, analysisTime);
  const icebergCoverage = evaluateSpatialCoverage(icebergCount, icebergProv?.bbox, targetBbox, input.icebergs.error);
  const icebergQuality = evaluateSourceQuality(input.icebergs.error, icebergCount, icebergTemp.temporalStatus, icebergCoverage, mode);

  const icebergSummary: SourceAlignmentSummary = {
    sourceName: 'US National Ice Center (USNIC) Iceberg Database',
    provider: icebergProv?.provider || (mode === 'REAL' ? 'NOAA / US Navy / USCG Joint Ice Center' : 'CRYO NAV Tabular Synthetic Catalog'),
    datasetId: icebergProv?.datasetId || 'USNIC_ANTARCTIC_ICEBERG_DATABASE',
    category: icebergProv?.category || (mode === 'REAL' ? 'OBSERVED' : 'SYNTHETIC'),
    sourceTime: icebergProv?.observationTime || icebergTime || analysisTime,
    validTime: icebergProv?.validTime || icebergTime || analysisTime,
    retrievalTime: icebergProv?.ingestionTime || null,
    timeDiffHours: icebergTemp.timeDiffHours,
    temporalStatus: icebergTemp.temporalStatus,
    quality: icebergQuality,
    coverage: icebergCoverage,
    sourceResolution: 'Point Observation / Tabular Analyst Tracking Catalog',
    sourceCrs: icebergProv?.crs || 'EPSG:4326',
    displayCrs,
    provenance: icebergProv,
    isRealData: mode === 'REAL' && Boolean(icebergProv && !icebergProv.isSynthetic),
    errorMessage: input.icebergs.error,
  };

  // 4. ECMWF IFS Weather Forecast Alignment Evaluation
  const weatherCount = input.weather.grid.length > 0 ? input.weather.grid.length : input.weather.current ? 1 : 0;
  const weatherProv = input.weather.provenance;
  const weatherTime = weatherProv?.validTime || (input.weather.current?.timestamp ? input.weather.current.timestamp : mode === 'DEMO' && weatherCount > 0 ? analysisTime : null);
  const weatherTemp = calculateTemporalAlignment(weatherTime, analysisTime);
  const weatherCoverage = evaluateSpatialCoverage(weatherCount, weatherProv?.bbox, targetBbox, input.weather.error);
  const weatherQuality = evaluateSourceQuality(input.weather.error, weatherCount, weatherTemp.temporalStatus, weatherCoverage, mode);

  const weatherSummary: SourceAlignmentSummary = {
    sourceName: 'ECMWF IFS Global Atmospheric Model Forecast',
    provider: weatherProv?.provider || (mode === 'REAL' ? 'Open-Meteo ECMWF API' : 'CRYO NAV Synthetic Polar Telemetry'),
    datasetId: weatherProv?.datasetId || 'ECMWF_IFS_GLOBAL_FORECAST',
    category: weatherProv?.category || (mode === 'REAL' ? 'FORECAST' : 'SYNTHETIC'),
    sourceTime: weatherProv?.observationTime || weatherTime || null,
    validTime: weatherProv?.validTime || weatherTime || null,
    retrievalTime: weatherProv?.ingestionTime || null,
    timeDiffHours: weatherTemp.timeDiffHours,
    temporalStatus: weatherTemp.temporalStatus,
    quality: weatherQuality,
    coverage: weatherCoverage,
    sourceResolution: '25 km (0.25° ECMWF IFS High-Resolution Model)',
    sourceCrs: weatherProv?.crs || 'EPSG:4326',
    displayCrs,
    provenance: weatherProv,
    isRealData: mode === 'REAL' && Boolean(weatherProv && !weatherProv.isSynthetic),
    errorMessage: input.weather.error,
  };

  // 5. Generate Dynamic Empirical Warnings
  const warnings: string[] = [];

  if (mode === 'REAL') {
    if (input.seaIce.error) warnings.push(`[SEA ICE] ${input.seaIce.error}`);
    if (input.ocean.error) warnings.push(`[OCEAN CURRENTS] ${input.ocean.error}`);
    if (input.icebergs.error) warnings.push(`[ICEBERGS] ${input.icebergs.error}`);
    if (input.weather.error) warnings.push(`[WEATHER] ${input.weather.error}`);
  }

  // Check temporal offsets between sources
  if (seaIceTemp.timeDiffHours !== null && weatherTemp.timeDiffHours !== null) {
    const seaIceVsWeatherOffset = Math.abs(seaIceTemp.timeDiffHours - weatherTemp.timeDiffHours);
    if (seaIceVsWeatherOffset > 3.0) {
      warnings.push(`Weather forecast valid time differs from sea-ice analysis timestamp by ${seaIceVsWeatherOffset.toFixed(1)} h.`);
    }
  }

  if (icebergTemp.timeDiffHours !== null && icebergTemp.timeDiffHours > 24.0) {
    warnings.push(`USNIC iceberg catalog observations are ${icebergTemp.timeDiffHours.toFixed(1)} h old relative to analysis reference time.`);
  }

  if (oceanSummary.coverage === 'PARTIAL') {
    warnings.push('Copernicus Marine 3D Ocean hydrodynamics coverage is PARTIAL across requested Antarctic Peninsula sector.');
  }

  if (warnings.length === 0) {
    warnings.push('All available environmental sources are within temporal and spatial alignment tolerances.');
  }

  // 6. Calculate Overall Quality & Alignment Status
  const sourceQualities = [seaIceQuality, oceanQuality, icebergQuality, weatherQuality];
  const missingCount = sourceQualities.filter((q) => q === 'MISSING' || q === 'INVALID').length;
  const staleCount = sourceQualities.filter((q) => q === 'STALE' || q === 'OUT_OF_COVERAGE').length;
  const suspectCount = sourceQualities.filter((q) => q === 'SUSPECT').length;

  let overallQuality: OverallQualityState = 'VALID';
  let alignmentStatus: 'ALIGNED' | 'PARTIALLY ALIGNED' | 'DEGRADED' | 'UNAVAILABLE' = 'ALIGNED';

  if (missingCount >= 3) {
    overallQuality = 'UNAVAILABLE';
    alignmentStatus = 'UNAVAILABLE';
  } else if (missingCount >= 1 || staleCount >= 2) {
    overallQuality = 'DEGRADED';
    alignmentStatus = 'DEGRADED';
  } else if (suspectCount >= 1 || staleCount === 1) {
    overallQuality = 'PARTIAL';
    alignmentStatus = 'PARTIALLY ALIGNED';
  } else {
    overallQuality = 'VALID';
    alignmentStatus = 'ALIGNED';
  }

  return {
    analysisTime,
    mode,
    region: {
      name: regionName,
      bbox: targetBbox,
      displayCrs,
    },
    overallQuality,
    alignmentStatus,
    sources: {
      seaIce: seaIceSummary,
      ocean: oceanSummary,
      icebergs: icebergSummary,
      weather: weatherSummary,
    },
    warnings,
    recordsCount: {
      seaIceCells: seaIceCount,
      oceanCells: oceanCount,
      icebergs: icebergCount,
      weatherPoints: weatherCount,
    },
  };
}
