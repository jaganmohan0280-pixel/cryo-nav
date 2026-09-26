/**
 * CRYO NAV — Synthetic Antarctic Environmental & Navigation Dataset
 * STRICTLY LABELED AS: DEMO / SYNTHETIC DATA
 * Antarctic Peninsula & Weddell Sea Corridor (-58°S to -69°S, -75°W to -50°W)
 */

import {
  VesselProfile,
  MissionConfig,
  IcebergDetection,
  SeaIceCell,
  WeatherCondition,
  OceanCurrentCell,
  SatelliteProduct,
} from '../types';

export const SYNTHETIC_DATA_BANNER = {
  label: 'DEMO / SYNTHETIC DATA',
  disclaimer:
    'All satellite passes, iceberg detections, sea-ice grids, and hydrodynamic fields are simulated for decision support demonstration. Do not use for real-world navigation.',
};

export const INITIAL_VESSELS: VesselProfile[] = [
  {
    id: 'vessel-pc3-alpha',
    name: 'RV Polar Explorer (PC3)',
    type: 'Heavy Antarctic Research Icebreaker',
    iceClass: 'Polar Class 3 (Year-round in second-year ice)',
    cruisingSpeedKnots: 11.5,
    maxSpeedKnots: 15.0,
    fuelConsumptionTonsPerDay: 24.5,
    draftMeters: 8.8,
    maxSeaIceConcentrationPercent: 78,
    minVisibilityNm: 0.5,
    turningLimitationsDegPerMin: 18,
    hullLengthMeters: 128,
    beamMeters: 24,
  },
  {
    id: 'vessel-pc5-beta',
    name: 'RRS Endurance IV (PC5)',
    type: 'Scientific Survey & Multibeam Vessel',
    iceClass: 'Polar Class 5 (Year-round in medium first-year ice)',
    cruisingSpeedKnots: 10.0,
    maxSpeedKnots: 13.5,
    fuelConsumptionTonsPerDay: 17.2,
    draftMeters: 7.2,
    maxSeaIceConcentrationPercent: 55,
    minVisibilityNm: 1.0,
    turningLimitationsDegPerMin: 22,
    hullLengthMeters: 98,
    beamMeters: 19,
  },
  {
    id: 'vessel-pc7-gamma',
    name: 'MV Drake Supplier (PC7)',
    type: 'Antarctic Logistics & Resupply Carrier',
    iceClass: 'Polar Class 7 (Summer/autumn in thin first-year ice)',
    cruisingSpeedKnots: 9.0,
    maxSpeedKnots: 11.5,
    fuelConsumptionTonsPerDay: 13.8,
    draftMeters: 6.0,
    maxSeaIceConcentrationPercent: 35,
    minVisibilityNm: 2.0,
    turningLimitationsDegPerMin: 15,
    hullLengthMeters: 85,
    beamMeters: 16,
  },
];

export const ANTARCTIC_STATIONS = [
  { id: 'st-rothera', name: 'Rothera Research Station (UK)', lat: -67.57, lon: -68.13 },
  { id: 'st-palmer', name: 'Palmer Station (US)', lat: -64.77, lon: -64.05 },
  { id: 'st-esperanza', name: 'Esperanza Base (Argentina)', lat: -63.40, lon: -56.99 },
  { id: 'st-frei', name: 'Presidente Eduardo Frei / Bellingshausen (Chile/Russia)', lat: -62.20, lon: -58.96 },
  { id: 'st-bharati', name: 'Bharati Antarctic Station (India)', lat: -69.41, lon: 76.19 },
  { id: 'st-mcmurdo', name: 'McMurdo Station (US - Ross Sea)', lat: -77.85, lon: 166.67 },
  { id: 'st-drake-entry', name: 'Drake Passage South Ingress (Maritime Gate)', lat: -59.50, lon: -64.50 },
  { id: 'st-scotia-entry', name: 'South Scotia Ingress Gate', lat: -60.00, lon: -54.00 },
];

export const DEFAULT_MISSION: MissionConfig = {
  id: 'mission-ant-2026-08',
  title: 'Marguerite Bay & Rothera Resupply Transit',
  vesselId: 'vessel-pc3-alpha',
  startLocation: {
    name: 'Drake Passage South Ingress Gate',
    lat: -59.50,
    lon: -64.50,
  },
  destination: {
    name: 'Rothera Research Station (Adelaide Island)',
    lat: -67.57,
    lon: -68.13,
  },
  missionType: 'Research',
  departureTime: '2026-09-06T12:00:00Z',
  priority: 'High',
  riskPreference: 'Conservative',
  fuelPreference: 'Standard',
  speedPreference: 'Standard',
  maxSeaIceConcentration: 75,
  researchWaypoints: [
    {
      id: 'wp-1',
      name: 'King George Oceanographic Transect (CTD-01)',
      lat: -62.45,
      lon: -60.10,
      order: 1,
      stopDurationHours: 4,
      type: 'Oceanographic Cast',
    },
    {
      id: 'wp-2',
      name: 'Anvers Island Glacial Runoff Buoy',
      lat: -64.95,
      lon: -64.30,
      order: 2,
      stopDurationHours: 2,
      type: 'Drift Buoy Deployment',
    },
  ],
  exclusionZones: [
    {
      id: 'ex-1',
      name: 'Adelaide Island West Shallow Reef & Calving Front',
      polygon: [
        [-67.10, -69.50],
        [-67.10, -68.80],
        [-67.60, -68.80],
        [-67.60, -69.50],
      ],
      reason: 'Calving Shelf Danger Zone',
    },
    {
      id: 'ex-2',
      name: 'South Shetland Specially Protected Marine Area',
      polygon: [
        [-62.80, -61.20],
        [-62.80, -60.50],
        [-63.20, -60.50],
        [-63.20, -61.20],
      ],
      reason: 'Protected Marine Reserve',
    },
  ],
  status: 'Active',
};

// Synthetic Icebergs with tracks and predicted deterministic drift trajectories (+6h, +12h, +24h, +48h, +72h)
export const INITIAL_ICEBERGS: IcebergDetection[] = [
  {
    id: 'ICB-A76A-FRAG',
    name: 'A-76A Calved Tabular Fragment',
    lat: -63.15,
    lon: -58.40,
    sizeCategory: 'Giant Calved Tabular',
    estimatedLengthMeters: 8400,
    estimatedWidthMeters: 3100,
    freeboardMeters: 38,
    driftSpeedKnots: 1.4,
    driftHeadingDeg: 38,
    observationTime: '2026-09-06T06:15:00Z',
    processingTime: '2026-09-06T06:40:00Z',
    confidence: 94,
    uncertaintyRadiusNm: 0.8,
    source: 'Sentinel-1 SAR',
    isSynthetic: true,
    historicalTrack: [
      { lat: -63.50, lon: -58.85, timestamp: '2026-09-05T06:00:00Z' },
      { lat: -63.38, lon: -58.70, timestamp: '2026-09-05T18:00:00Z' },
      { lat: -63.26, lon: -58.55, timestamp: '2026-09-06T00:00:00Z' },
      { lat: -63.15, lon: -58.40, timestamp: '2026-09-06T06:15:00Z' },
    ],
    predictedTrajectory: [
      { horizon: '+6h', hours: 6, lat: -63.02, lon: -58.24, uncertaintyRadiusNm: 1.4, timestamp: '2026-09-06T12:15:00Z', confidence: 91 },
      { horizon: '+12h', hours: 12, lat: -62.88, lon: -58.07, uncertaintyRadiusNm: 2.2, timestamp: '2026-09-06T18:15:00Z', confidence: 86 },
      { horizon: '+24h', hours: 24, lat: -62.61, lon: -57.73, uncertaintyRadiusNm: 3.8, timestamp: '2026-09-07T06:15:00Z', confidence: 78 },
      { horizon: '+48h', hours: 48, lat: -62.06, lon: -57.06, uncertaintyRadiusNm: 6.5, timestamp: '2026-09-08T06:15:00Z', confidence: 64 },
      { horizon: '+72h', hours: 72, lat: -61.50, lon: -56.38, uncertaintyRadiusNm: 9.8, timestamp: '2026-09-09T06:15:00Z', confidence: 52 },
    ],
  },
  {
    id: 'ICB-B22A-SEC',
    name: 'B-22A Marginal Floe Block',
    lat: -65.20,
    lon: -64.85,
    sizeCategory: 'Large',
    estimatedLengthMeters: 2600,
    estimatedWidthMeters: 1400,
    freeboardMeters: 26,
    driftSpeedKnots: 1.1,
    driftHeadingDeg: 215,
    observationTime: '2026-09-06T05:30:00Z',
    processingTime: '2026-09-06T06:05:00Z',
    confidence: 89,
    uncertaintyRadiusNm: 1.2,
    source: 'RADARSAT Constellation',
    isSynthetic: true,
    historicalTrack: [
      { lat: -64.88, lon: -64.45, timestamp: '2026-09-05T06:00:00Z' },
      { lat: -64.99, lon: -64.58, timestamp: '2026-09-05T18:00:00Z' },
      { lat: -65.10, lon: -64.72, timestamp: '2026-09-06T00:00:00Z' },
      { lat: -65.20, lon: -64.85, timestamp: '2026-09-06T05:30:00Z' },
    ],
    predictedTrajectory: [
      { horizon: '+6h', hours: 6, lat: -65.31, lon: -64.98, uncertaintyRadiusNm: 1.8, timestamp: '2026-09-06T11:30:00Z', confidence: 85 },
      { horizon: '+12h', hours: 12, lat: -65.41, lon: -65.11, uncertaintyRadiusNm: 2.7, timestamp: '2026-09-06T17:30:00Z', confidence: 80 },
      { horizon: '+24h', hours: 24, lat: -65.62, lon: -65.37, uncertaintyRadiusNm: 4.4, timestamp: '2026-09-07T05:30:00Z', confidence: 71 },
      { horizon: '+48h', hours: 48, lat: -66.03, lon: -65.88, uncertaintyRadiusNm: 7.2, timestamp: '2026-09-08T05:30:00Z', confidence: 58 },
      { horizon: '+72h', hours: 72, lat: -66.44, lon: -66.39, uncertaintyRadiusNm: 10.5, timestamp: '2026-09-09T05:30:00Z', confidence: 45 },
    ],
  },
  {
    id: 'ICB-902-PINNACLE',
    name: 'ICB-902 High Pinnacle Berg',
    lat: -66.40,
    lon: -67.20,
    sizeCategory: 'Medium',
    estimatedLengthMeters: 920,
    estimatedWidthMeters: 450,
    freeboardMeters: 42,
    driftSpeedKnots: 1.6,
    driftHeadingDeg: 195,
    observationTime: '2026-09-06T07:10:00Z',
    processingTime: '2026-09-06T07:28:00Z',
    confidence: 82,
    uncertaintyRadiusNm: 1.5,
    source: 'Sentinel-1 SAR',
    isSynthetic: true,
    historicalTrack: [
      { lat: -65.95, lon: -66.90, timestamp: '2026-09-05T06:00:00Z' },
      { lat: -66.10, lon: -67.00, timestamp: '2026-09-05T18:00:00Z' },
      { lat: -66.25, lon: -67.10, timestamp: '2026-09-06T00:00:00Z' },
      { lat: -66.40, lon: -67.20, timestamp: '2026-09-06T07:10:00Z' },
    ],
    predictedTrajectory: [
      { horizon: '+6h', hours: 6, lat: -66.55, lon: -67.28, uncertaintyRadiusNm: 2.1, timestamp: '2026-09-06T13:10:00Z', confidence: 79 },
      { horizon: '+12h', hours: 12, lat: -66.71, lon: -67.36, uncertaintyRadiusNm: 3.1, timestamp: '2026-09-06T19:10:00Z', confidence: 73 },
      { horizon: '+24h', hours: 24, lat: -67.02, lon: -67.52, uncertaintyRadiusNm: 5.0, timestamp: '2026-09-07T07:10:00Z', confidence: 62 },
      { horizon: '+48h', hours: 48, lat: -67.64, lon: -67.84, uncertaintyRadiusNm: 8.5, timestamp: '2026-09-08T07:10:00Z', confidence: 48 },
      { horizon: '+72h', hours: 72, lat: -68.25, lon: -68.16, uncertaintyRadiusNm: 12.0, timestamp: '2026-09-09T07:10:00Z', confidence: 35 },
    ],
  },
  {
    id: 'ICB-841-TABULAR',
    name: 'ICB-841 Weddell Shelf Calving',
    lat: -61.80,
    lon: -55.60,
    sizeCategory: 'Large',
    estimatedLengthMeters: 3100,
    estimatedWidthMeters: 1850,
    freeboardMeters: 31,
    driftSpeedKnots: 0.9,
    driftHeadingDeg: 345,
    observationTime: '2026-09-06T04:45:00Z',
    processingTime: '2026-09-06T05:20:00Z',
    confidence: 91,
    uncertaintyRadiusNm: 1.0,
    source: 'Sentinel-1 SAR',
    isSynthetic: true,
    historicalTrack: [
      { lat: -62.15, lon: -55.45, timestamp: '2026-09-05T06:00:00Z' },
      { lat: -62.03, lon: -55.50, timestamp: '2026-09-05T18:00:00Z' },
      { lat: -61.92, lon: -55.55, timestamp: '2026-09-06T00:00:00Z' },
      { lat: -61.80, lon: -55.60, timestamp: '2026-09-06T04:45:00Z' },
    ],
    predictedTrajectory: [
      { horizon: '+6h', hours: 6, lat: -61.71, lon: -55.65, uncertaintyRadiusNm: 1.6, timestamp: '2026-09-06T10:45:00Z', confidence: 87 },
      { horizon: '+12h', hours: 12, lat: -61.62, lon: -55.70, uncertaintyRadiusNm: 2.4, timestamp: '2026-09-06T16:45:00Z', confidence: 81 },
      { horizon: '+24h', hours: 24, lat: -61.44, lon: -55.80, uncertaintyRadiusNm: 4.0, timestamp: '2026-09-07T04:45:00Z', confidence: 72 },
      { horizon: '+48h', hours: 48, lat: -61.08, lon: -56.00, uncertaintyRadiusNm: 6.8, timestamp: '2026-09-08T04:45:00Z', confidence: 59 },
      { horizon: '+72h', hours: 72, lat: -60.72, lon: -56.20, uncertaintyRadiusNm: 9.6, timestamp: '2026-09-09T04:45:00Z', confidence: 46 },
    ],
  },
  {
    id: 'ICB-715-GROWLER',
    name: 'ICB-715 Submerged Growler Swarm',
    lat: -64.10,
    lon: -62.30,
    sizeCategory: 'Small',
    estimatedLengthMeters: 180,
    estimatedWidthMeters: 95,
    freeboardMeters: 4,
    driftSpeedKnots: 1.8,
    driftHeadingDeg: 230,
    observationTime: '2026-09-06T07:45:00Z',
    processingTime: '2026-09-06T08:00:00Z',
    confidence: 76,
    uncertaintyRadiusNm: 2.1,
    source: 'Shipboard Marine Radar',
    isSynthetic: true,
    historicalTrack: [
      { lat: -63.60, lon: -61.70, timestamp: '2026-09-05T06:00:00Z' },
      { lat: -63.78, lon: -61.90, timestamp: '2026-09-05T18:00:00Z' },
      { lat: -63.94, lon: -62.10, timestamp: '2026-09-06T00:00:00Z' },
      { lat: -64.10, lon: -62.30, timestamp: '2026-09-06T07:45:00Z' },
    ],
    predictedTrajectory: [
      { horizon: '+6h', hours: 6, lat: -64.24, lon: -62.51, uncertaintyRadiusNm: 2.8, timestamp: '2026-09-06T13:45:00Z', confidence: 70 },
      { horizon: '+12h', hours: 12, lat: -64.38, lon: -62.71, uncertaintyRadiusNm: 4.1, timestamp: '2026-09-06T19:45:00Z', confidence: 61 },
      { horizon: '+24h', hours: 24, lat: -64.67, lon: -63.12, uncertaintyRadiusNm: 6.4, timestamp: '2026-09-07T07:45:00Z', confidence: 49 },
      { horizon: '+48h', hours: 48, lat: -65.23, lon: -63.95, uncertaintyRadiusNm: 10.2, timestamp: '2026-09-08T07:45:00Z', confidence: 35 },
      { horizon: '+72h', hours: 72, lat: -65.80, lon: -64.77, uncertaintyRadiusNm: 14.5, timestamp: '2026-09-09T07:45:00Z', confidence: 22 },
    ],
  },
];

// Synthetic Sea Ice Grid (latitude: -59 to -68, longitude: -70 to -56)
export const generateSyntheticSeaIce = (): SeaIceCell[] => {
  const cells: SeaIceCell[] = [];
  let index = 0;

  for (let lat = -59.0; lat >= -68.5; lat -= 1.0) {
    for (let lon = -70.0; lon <= -56.0; lon += 1.5) {
      // Latitude factor: further south = higher ice concentration
      const southFactor = Math.min(1.0, Math.max(0.0, (-lat - 59.0) / 9.0));
      // Proximity to Weddell / Peninsula shelf (east is colder/pack ice)
      const eastFactor = Math.min(1.0, Math.max(0.0, (lon + 70.0) / 14.0));

      let baseConcentration = southFactor * 75 + eastFactor * 20;
      // Drake passage open lead
      if (lat > -60.5) baseConcentration *= 0.15;
      // Marguerite bay coastal pack
      if (lat < -66.5 && lon < -66.0) baseConcentration = Math.min(94, baseConcentration + 25);

      const concentration = Math.min(98, Math.max(0, Math.round(baseConcentration)));

      let stage: SeaIceCell['stage'] = 'Open Water';
      if (concentration > 90) stage = 'Consolidated Fast Ice';
      else if (concentration > 70) stage = 'Close Pack (70-80%)';
      else if (concentration > 40) stage = 'Open Drift (40-60%)';
      else if (concentration > 15) stage = 'Very Open Drift (10-30%)';

      const thickness = concentration > 70 ? 1.8 + Math.random() * 0.8 : concentration > 40 ? 0.9 + Math.random() * 0.5 : 0.2;

      cells.push({
        id: `ice-cell-${index++}`,
        lat: Number(lat.toFixed(2)),
        lon: Number(lon.toFixed(2)),
        concentrationPercent: concentration,
        stage,
        thicknessMeters: Number(thickness.toFixed(2)),
        driftVector: {
          speedKnots: Number((0.4 + Math.random() * 0.8).toFixed(2)),
          headingDeg: Math.round(210 + (Math.random() - 0.5) * 40),
        },
        predictedConcentration72h: Math.min(99, Math.max(0, Math.round(concentration + (Math.random() - 0.4) * 8))),
        confidence: Math.round(85 - southFactor * 18),
        uncertainty: Math.round(15 + southFactor * 22),
        timestamp: '2026-09-06T06:00:00Z',
      });
    }
  }

  return cells;
};

// Ocean Currents & Wind Field
export const SYNTHETIC_WEATHER: WeatherCondition = {
  windSpeedKnots: 28.5,
  windDirectionDeg: 260, // Westerlies in Drake Passage
  airTempC: -8.4,
  seaTempC: -1.2,
  waveHeightMeters: 3.4,
  visibilityNm: 4.5,
  barometricPressureHpa: 978.2,
  timestamp: '2026-09-06T08:00:00Z',
  forecastHorizonHours: 72,
};

export const SYNTHETIC_OCEAN_CURRENTS: OceanCurrentCell[] = [
  { lat: -60.0, lon: -64.0, currentSpeedKnots: 1.8, currentHeadingDeg: 75 }, // Antarctic Circumpolar Current
  { lat: -62.0, lon: -62.0, currentSpeedKnots: 1.4, currentHeadingDeg: 60 },
  { lat: -64.0, lon: -64.0, currentSpeedKnots: 0.9, currentHeadingDeg: 210 }, // Bransfield / Gerlache counter-drift
  { lat: -66.0, lon: -67.0, currentSpeedKnots: 0.7, currentHeadingDeg: 200 },
  { lat: -67.5, lon: -68.0, currentSpeedKnots: 0.5, currentHeadingDeg: 190 }, // Marguerite Bay coastal circulation
];

// Available Synthetic Satellite Products for the Decision Impact Engine
export const INITIAL_SATELLITE_PRODUCTS: SatelliteProduct[] = [
  {
    id: 'SAT-S1C-20260906-0815',
    sensor: 'Sentinel-1C C-Band SAR Extra-Wide Swath',
    acquisitionTime: '2026-09-06T08:15:00Z',
    processingTime: '2026-09-06T08:35:00Z',
    footprint: {
      centerLat: -66.1,
      centerLon: -67.0,
      radiusNm: 85,
      description: 'Adelaide Island & Marguerite Bay Iceberg Convergence Corridor',
    },
    productType: 'High-Res SAR Interferometric',
    sizeMb: 142.5,
    availability: 'Available for Downlink',
    decisionImpactScore: 92, // HIGH! Overlaps critical route fork
    priority: 'HIGH',
    impactExplanation:
      'Recent high-resolution SAR observation intersects the highly uncertain ICB-902 corridor and high-concentration sea ice pack near Rothera approach. Acquiring this observation reduces route risk uncertainty by ~44% and can alter the primary recommended route.',
    expectedUncertaintyReductionPct: 44,
    spatialOverlapWithRoutePct: 88,
    freshness: 'FRESH',
  },
  {
    id: 'SAT-RCM2-20260906-0740',
    sensor: 'RADARSAT Constellation Mission (RCM-2)',
    acquisitionTime: '2026-09-06T07:40:00Z',
    processingTime: '2026-09-06T08:05:00Z',
    footprint: {
      centerLat: -64.5,
      centerLon: -63.5,
      radiusNm: 60,
      description: 'Anvers Island & Gerlache Strait Inshore Leads',
    },
    productType: 'Dual-Polarization Iceberg Profiling',
    sizeMb: 88.0,
    availability: 'Available for Downlink',
    decisionImpactScore: 68,
    priority: 'MEDIUM',
    impactExplanation:
      'Provides updated freeboard and edge profiling for iceberg B-22A fragment. Confirms lead openings in open drift ice along the balanced route alternative.',
    expectedUncertaintyReductionPct: 24,
    spatialOverlapWithRoutePct: 62,
    freshness: 'FRESH',
  },
  {
    id: 'SAT-CS2-20260906-0510',
    sensor: 'CryoSat-2 SARIn Radar Altimeter',
    acquisitionTime: '2026-09-06T05:10:00Z',
    processingTime: '2026-09-06T06:15:00Z',
    footprint: {
      centerLat: -63.0,
      centerLon: -58.0,
      radiusNm: 120,
      description: 'Weddell Sea Outer Marginal Ice Zone',
    },
    productType: 'Altimeter Sea Ice Freeboard',
    sizeMb: 34.0,
    availability: 'Available for Downlink',
    decisionImpactScore: 35,
    priority: 'LOW',
    impactExplanation:
      'Nadir altimeter track across Weddell Sea. Only peripheral overlap with the primary navigation corridor. Low expected decision change probability.',
    expectedUncertaintyReductionPct: 8,
    spatialOverlapWithRoutePct: 18,
    freshness: 'AGING',
  },
  {
    id: 'SAT-S3-20260906-0645',
    sensor: 'Sentinel-3 SLSTR Thermal Infrared',
    acquisitionTime: '2026-09-06T06:45:00Z',
    processingTime: '2026-09-06T07:30:00Z',
    footprint: {
      centerLat: -60.5,
      centerLon: -64.0,
      radiusNm: 150,
      description: 'Drake Passage South Sea Surface Temperature',
    },
    productType: 'SAR Wide Swath Ice Drift',
    sizeMb: 62.0,
    availability: 'Acquired',
    decisionImpactScore: 28,
    priority: 'LOW',
    impactExplanation:
      'Covers ice-free open ocean entry. Validates boundary water temperature. Minimal impact on polar route alternative selection.',
    expectedUncertaintyReductionPct: 5,
    spatialOverlapWithRoutePct: 14,
    freshness: 'FRESH',
  },
];

export const SIH_PROJECT_METADATA = {
  hackathon: 'SMART INDIA HACKATHON 2026',
  problemStatementId: 'SIH26059',
  problemStatementTitle: 'AI-Enabled Antarctic Sea-Ice, Iceberg Trajectory, and Navigation Decision Support System',
  theme: 'Transportation & Logistics',
  psCategory: 'Software',
  teamId: 'SIH26059_189',
  teamName: 'CRYONAV_RGUKTN',
  missionSlogan: 'An integrated AI system that monitors, predicts and helps navigate Antarctic ice hazards for safer and fuel-efficient research missions.',
};

export const RESEARCH_REFERENCES: import('../types').ResearchReference[] = [
  {
    id: 'ref-1',
    title: 'Copernicus Sentinel-1 SAR Constellation',
    source: 'European Space Agency (ESA) / Copernicus Data Space',
    url: 'https://dataspace.copernicus.eu/data-collections/copernicus-sentinel-missions/sentinel-1',
    description: 'Provides C-band Synthetic Aperture Radar (SAR) imagery penetrating polar cloud cover and polar night for sea-ice classification and iceberg target detection.',
    category: 'Satellite',
  },
  {
    id: 'ref-2',
    title: 'Copernicus Marine Environment Monitoring Service (CMEMS)',
    source: 'Mercator Ocean International',
    url: 'https://data.marine.copernicus.eu/',
    description: 'Operational ocean analysis and forecast products providing Antarctic sea surface temperature, mixed layer depth, and surface ocean current velocity fields.',
    category: 'Ocean & Sea-Ice',
  },
  {
    id: 'ref-3',
    title: 'ECMWF ERA5 Reanalysis & Atmospheric Forecasts',
    source: 'European Centre for Medium-Range Weather Forecasts',
    url: 'https://www.ecmwf.int/en/forecasts/datasets/reanalysis-datasets/era5',
    description: 'High-resolution surface winds, air temperatures, atmospheric pressure fields, and ocean wave spectra over the Southern Ocean and Drake Passage.',
    category: 'Atmospheric',
  },
  {
    id: 'ref-4',
    title: 'NOAA / NSIDC Climate Data Record of Passive Microwave Sea Ice',
    source: 'National Snow and Ice Data Center (NSIDC)',
    url: 'https://nsidc.org/data/g02202/versions/6',
    description: 'Near-real-time and historical daily gridded sea-ice concentration products from AMSR2 and SSMIS satellite radiometers.',
    category: 'Ocean & Sea-Ice',
  },
  {
    id: 'ref-5',
    title: 'British Antarctic Survey (BAS) Automated Polar Ship Route Planning',
    source: 'British Antarctic Survey AI Lab',
    url: 'https://www.bas.ac.uk/news/new-ai-tool-set-to-revolutionise-polar-ship-navigation/',
    description: 'Benchmark research for polar ship routing using environmental state graphs to minimize fuel consumption and collision risk for RRS Sir David Attenborough.',
    category: 'Polar Routing Research',
  },
  {
    id: 'ref-6',
    title: 'PolarRoute: Dynamic Sea-Ice Route Optimization Software',
    source: 'Open Research Software / Zenodo',
    url: 'https://zenodo.org/records/22129790',
    description: 'Discrete mesh optimization formulation integrating IMO Polar Code vessel speed curves, ice concentration penalties, and carbon emission minimization.',
    category: 'Polar Routing Research',
  },
  {
    id: 'ref-7',
    title: 'NSIDC Antarctic Sea Ice Index & Extent Trends',
    source: 'NSIDC / University of Colorado Boulder',
    url: 'https://nsidc.org/data/seaice_index',
    description: 'Antarctic-wide daily sea ice extent, regional anomaly tracking, and seasonal freeze-up/melt cycle baselines.',
    category: 'Ocean & Sea-Ice',
  },
];

