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

import { AUTHORITATIVE_RESEARCH_STATIONS } from './researchStations';

export const ANTARCTIC_STATIONS = AUTHORITATIVE_RESEARCH_STATIONS;

export const DEFAULT_MISSION: MissionConfig = {
  id: 'mission-east-ant-2026',
  title: 'East Antarctic Research Supply Voyage',
  vesselId: 'vessel-pc3-alpha',
  startLocation: {
    name: 'Maitri Research Station (India)',
    lat: -70.76,
    lon: 11.74,
  },
  destination: {
    name: 'Bharati Antarctic Station (India)',
    lat: -69.41,
    lon: 76.19,
  },
  missionType: 'Resupply',
  departureTime: '2026-09-29T12:00:00Z',
  priority: 'High',
  riskPreference: 'Conservative',
  fuelPreference: 'Standard',
  speedPreference: 'Standard',
  maxSeaIceConcentration: 75,
  researchWaypoints: [
    {
      id: 'wp-ea-1',
      name: 'Princess Astrid Coast Oceanographic Cast',
      lat: -69.20,
      lon: 25.00,
      order: 1,
      stopDurationHours: 3,
      type: 'Oceanographic Cast',
    },
    {
      id: 'wp-ea-2',
      name: 'Prydz Bay Glacial Hydrodynamics Buoy',
      lat: -68.80,
      lon: 72.50,
      order: 2,
      stopDurationHours: 2,
      type: 'Drift Buoy Deployment',
    },
  ],
  exclusionZones: [
    {
      id: 'ex-ea-1',
      name: 'Amery Ice Shelf Calving Danger Zone',
      polygon: [
        [-69.00, 68.50],
        [-69.00, 73.00],
        [-71.50, 73.00],
        [-71.50, 68.50],
      ],
      reason: 'Calving Shelf Danger Zone',
    },
  ],
  status: 'Active',
};

// Synthetic Regional Icebergs with predicted deterministic drift trajectories (+6h, +12h, +24h, +48h, +72h)
export const INITIAL_ICEBERGS: IcebergDetection[] = [
  {
    id: 'ICB-D28-FRAG',
    name: 'D-28 Amery Calved Fragment',
    lat: -68.85,
    lon: 74.50,
    sizeCategory: 'Giant Calved Tabular',
    estimatedLengthMeters: 6200,
    estimatedWidthMeters: 2800,
    freeboardMeters: 36,
    driftSpeedKnots: 1.2,
    driftHeadingDeg: 285,
    observationTime: '2026-09-29T06:15:00Z',
    processingTime: '2026-09-29T06:40:00Z',
    confidence: 95,
    uncertaintyRadiusNm: 0.8,
    source: 'Sentinel-1 SAR',
    isSynthetic: true,
    historicalTrack: [
      { lat: -69.10, lon: 75.20, timestamp: '2026-09-28T06:00:00Z' },
      { lat: -69.00, lon: 74.90, timestamp: '2026-09-28T18:00:00Z' },
      { lat: -68.92, lon: 74.70, timestamp: '2026-09-29T00:00:00Z' },
      { lat: -68.85, lon: 74.50, timestamp: '2026-09-29T06:15:00Z' },
    ],
    predictedTrajectory: [
      { horizon: '+6h', hours: 6, lat: -68.76, lon: 74.25, uncertaintyRadiusNm: 1.4, timestamp: '2026-09-29T12:15:00Z', confidence: 92 },
      { horizon: '+12h', hours: 12, lat: -68.67, lon: 74.00, uncertaintyRadiusNm: 2.1, timestamp: '2026-09-29T18:15:00Z', confidence: 87 },
      { horizon: '+24h', hours: 24, lat: -68.49, lon: 73.48, uncertaintyRadiusNm: 3.6, timestamp: '2026-09-30T06:15:00Z', confidence: 79 },
      { horizon: '+48h', hours: 48, lat: -68.12, lon: 72.40, uncertaintyRadiusNm: 6.2, timestamp: '2026-10-01T06:15:00Z', confidence: 65 },
      { horizon: '+72h', hours: 72, lat: -67.75, lon: 71.30, uncertaintyRadiusNm: 9.2, timestamp: '2026-10-02T06:15:00Z', confidence: 53 },
    ],
  },
  {
    id: 'ICB-MAITRI-01',
    name: 'Schirmacher Coastal Iceberg',
    lat: -69.80,
    lon: 14.20,
    sizeCategory: 'Large',
    estimatedLengthMeters: 2400,
    estimatedWidthMeters: 1300,
    freeboardMeters: 28,
    driftSpeedKnots: 0.9,
    driftHeadingDeg: 260,
    observationTime: '2026-09-29T05:30:00Z',
    processingTime: '2026-09-29T06:05:00Z',
    confidence: 90,
    uncertaintyRadiusNm: 1.0,
    source: 'RADARSAT Constellation',
    isSynthetic: true,
    historicalTrack: [
      { lat: -69.72, lon: 14.70, timestamp: '2026-09-28T06:00:00Z' },
      { lat: -69.75, lon: 14.50, timestamp: '2026-09-28T18:00:00Z' },
      { lat: -69.78, lon: 14.32, timestamp: '2026-09-29T00:00:00Z' },
      { lat: -69.80, lon: 14.20, timestamp: '2026-09-29T05:30:00Z' },
    ],
    predictedTrajectory: [
      { horizon: '+6h', hours: 6, lat: -69.83, lon: 13.98, uncertaintyRadiusNm: 1.6, timestamp: '2026-09-29T11:30:00Z', confidence: 86 },
      { horizon: '+12h', hours: 12, lat: -69.86, lon: 13.76, uncertaintyRadiusNm: 2.4, timestamp: '2026-09-29T17:30:00Z', confidence: 81 },
      { horizon: '+24h', hours: 24, lat: -69.92, lon: 13.31, uncertaintyRadiusNm: 4.1, timestamp: '2026-09-30T05:30:00Z', confidence: 72 },
      { horizon: '+48h', hours: 48, lat: -70.04, lon: 12.38, uncertaintyRadiusNm: 7.0, timestamp: '2026-10-01T05:30:00Z', confidence: 59 },
      { horizon: '+72h', hours: 72, lat: -70.16, lon: 11.45, uncertaintyRadiusNm: 10.0, timestamp: '2026-10-02T05:30:00Z', confidence: 47 },
    ],
  },
  {
    id: 'ICB-ENDERBY-02',
    name: 'Enderby Land Iceberg Block',
    lat: -67.90,
    lon: 52.40,
    sizeCategory: 'Medium',
    estimatedLengthMeters: 1100,
    estimatedWidthMeters: 550,
    freeboardMeters: 22,
    driftSpeedKnots: 1.4,
    driftHeadingDeg: 275,
    observationTime: '2026-09-29T07:10:00Z',
    processingTime: '2026-09-29T07:28:00Z',
    confidence: 85,
    uncertaintyRadiusNm: 1.4,
    source: 'Sentinel-1 SAR',
    isSynthetic: true,
    historicalTrack: [
      { lat: -67.85, lon: 53.10, timestamp: '2026-09-28T06:00:00Z' },
      { lat: -67.87, lon: 52.85, timestamp: '2026-09-28T18:00:00Z' },
      { lat: -67.89, lon: 52.60, timestamp: '2026-09-29T00:00:00Z' },
      { lat: -67.90, lon: 52.40, timestamp: '2026-09-29T07:10:00Z' },
    ],
    predictedTrajectory: [
      { horizon: '+6h', hours: 6, lat: -67.92, lon: 52.05, uncertaintyRadiusNm: 2.0, timestamp: '2026-09-29T13:10:00Z', confidence: 80 },
      { horizon: '+12h', hours: 12, lat: -67.94, lon: 51.70, uncertaintyRadiusNm: 3.0, timestamp: '2026-09-29T19:10:00Z', confidence: 74 },
      { horizon: '+24h', hours: 24, lat: -67.98, lon: 51.00, uncertaintyRadiusNm: 4.8, timestamp: '2026-09-30T07:10:00Z', confidence: 63 },
      { horizon: '+48h', hours: 48, lat: -68.06, lon: 49.60, uncertaintyRadiusNm: 8.2, timestamp: '2026-10-01T07:10:00Z', confidence: 49 },
      { horizon: '+72h', hours: 72, lat: -68.14, lon: 48.20, uncertaintyRadiusNm: 11.8, timestamp: '2026-10-02T07:10:00Z', confidence: 36 },
    ],
  },
  {
    id: 'ICB-PRYDZ-BAY-04',
    name: 'Larsemann Approach Tabular',
    lat: -68.60,
    lon: 75.10,
    sizeCategory: 'Large',
    estimatedLengthMeters: 3200,
    estimatedWidthMeters: 1600,
    freeboardMeters: 32,
    driftSpeedKnots: 0.8,
    driftHeadingDeg: 300,
    observationTime: '2026-09-29T04:45:00Z',
    processingTime: '2026-09-29T05:20:00Z',
    confidence: 92,
    uncertaintyRadiusNm: 0.9,
    source: 'Sentinel-1 SAR',
    isSynthetic: true,
    historicalTrack: [
      { lat: -68.72, lon: 75.40, timestamp: '2026-09-28T06:00:00Z' },
      { lat: -68.68, lon: 75.30, timestamp: '2026-09-28T18:00:00Z' },
      { lat: -68.64, lon: 75.20, timestamp: '2026-09-29T00:00:00Z' },
      { lat: -68.60, lon: 75.10, timestamp: '2026-09-29T04:45:00Z' },
    ],
    predictedTrajectory: [
      { horizon: '+6h', hours: 6, lat: -68.56, lon: 74.92, uncertaintyRadiusNm: 1.5, timestamp: '2026-09-29T10:45:00Z', confidence: 88 },
      { horizon: '+12h', hours: 12, lat: -68.52, lon: 74.74, uncertaintyRadiusNm: 2.2, timestamp: '2026-09-29T16:45:00Z', confidence: 82 },
      { horizon: '+24h', hours: 24, lat: -68.44, lon: 74.38, uncertaintyRadiusNm: 3.8, timestamp: '2026-09-30T04:45:00Z', confidence: 73 },
      { horizon: '+48h', hours: 48, lat: -68.28, lon: 73.66, uncertaintyRadiusNm: 6.6, timestamp: '2026-10-01T04:45:00Z', confidence: 60 },
      { horizon: '+72h', hours: 72, lat: -68.12, lon: 72.94, uncertaintyRadiusNm: 9.4, timestamp: '2026-10-02T04:45:00Z', confidence: 48 },
    ],
  },
  {
    id: 'ICB-QUEEN-MAUD-03',
    name: 'Queen Maud Offshore Floe',
    lat: -68.70,
    lon: 32.50,
    sizeCategory: 'Medium',
    estimatedLengthMeters: 780,
    estimatedWidthMeters: 390,
    freeboardMeters: 19,
    driftSpeedKnots: 1.5,
    driftHeadingDeg: 265,
    observationTime: '2026-09-29T07:45:00Z',
    processingTime: '2026-09-29T08:00:00Z',
    confidence: 84,
    uncertaintyRadiusNm: 1.6,
    source: 'Shipboard Marine Radar',
    isSynthetic: true,
    historicalTrack: [
      { lat: -68.65, lon: 33.30, timestamp: '2026-09-28T06:00:00Z' },
      { lat: -68.67, lon: 33.00, timestamp: '2026-09-28T18:00:00Z' },
      { lat: -68.69, lon: 32.75, timestamp: '2026-09-29T00:00:00Z' },
      { lat: -68.70, lon: 32.50, timestamp: '2026-09-29T07:45:00Z' },
    ],
    predictedTrajectory: [
      { horizon: '+6h', hours: 6, lat: -68.71, lon: 32.10, uncertaintyRadiusNm: 2.2, timestamp: '2026-09-29T13:45:00Z', confidence: 78 },
      { horizon: '+12h', hours: 12, lat: -68.72, lon: 31.70, uncertaintyRadiusNm: 3.2, timestamp: '2026-09-29T19:45:00Z', confidence: 71 },
      { horizon: '+24h', hours: 24, lat: -68.74, lon: 30.90, uncertaintyRadiusNm: 5.2, timestamp: '2026-09-30T07:45:00Z', confidence: 58 },
      { horizon: '+48h', hours: 48, lat: -68.78, lon: 29.30, uncertaintyRadiusNm: 8.8, timestamp: '2026-10-01T07:45:00Z', confidence: 44 },
      { horizon: '+72h', hours: 72, lat: -68.82, lon: 27.70, uncertaintyRadiusNm: 12.5, timestamp: '2026-10-02T07:45:00Z', confidence: 32 },
    ],
  },
];

// Synthetic Sea Ice Grid for East Antarctica Corridor (lat: -66 to -71.5, lon: 8 to 80)
export const generateSyntheticSeaIce = (): SeaIceCell[] => {
  const cells: SeaIceCell[] = [];
  let index = 0;

  for (let lat = -66.0; lat >= -71.5; lat -= 1.0) {
    for (let lon = 8.0; lon <= 80.0; lon += 3.0) {
      // Further south / closer to ice shelf = higher ice concentration
      const southFactor = Math.min(1.0, Math.max(0.0, (-lat - 66.0) / 5.5));
      // Distance to coast
      let baseConcentration = southFactor * 70;
      
      // Outer ocean leads (north of -67.5°S)
      if (lat > -67.5) baseConcentration *= 0.2;
      // Schirmacher Oasis & Prydz Bay coastal ice
      if (lat < -69.5 && (lon < 16.0 || lon > 70.0)) baseConcentration = Math.min(92, baseConcentration + 25);

      const concentration = Math.min(98, Math.max(0, Math.round(baseConcentration)));

      let stage: SeaIceCell['stage'] = 'Open Water';
      if (concentration > 88) stage = 'Consolidated Fast Ice';
      else if (concentration > 65) stage = 'Close Pack (70-80%)';
      else if (concentration > 35) stage = 'Open Drift (40-60%)';
      else if (concentration > 10) stage = 'Very Open Drift (10-30%)';

      const thickness = concentration > 65 ? 1.6 + Math.random() * 0.7 : concentration > 35 ? 0.8 + Math.random() * 0.4 : 0.2;

      cells.push({
        id: `ice-cell-${index++}`,
        lat: Number(lat.toFixed(2)),
        lon: Number(lon.toFixed(2)),
        concentrationPercent: concentration,
        stage,
        thicknessMeters: Number(thickness.toFixed(2)),
        driftVector: {
          speedKnots: Number((0.5 + Math.random() * 0.7).toFixed(2)),
          headingDeg: Math.round(270 + (Math.random() - 0.5) * 30),
        },
        predictedConcentration72h: Math.min(99, Math.max(0, Math.round(concentration + (Math.random() - 0.4) * 8))),
        confidence: Math.round(88 - southFactor * 15),
        uncertainty: Math.round(12 + southFactor * 20),
        timestamp: '2026-09-29T06:00:00Z',
      });
    }
  }

  return cells;
};

// East Antarctic Weather & Ocean Currents
export const SYNTHETIC_WEATHER: WeatherCondition = {
  windSpeedKnots: 26.5,
  windDirectionDeg: 140, // SE Katabatic wind off East Antarctic ice sheet
  airTempC: -12.5,
  seaTempC: -1.8,
  waveHeightMeters: 2.8,
  visibilityNm: 6.0,
  barometricPressureHpa: 982.4,
  timestamp: '2026-09-29T08:00:00Z',
  forecastHorizonHours: 72,
};

export const SYNTHETIC_OCEAN_CURRENTS: OceanCurrentCell[] = [
  { lat: -68.0, lon: 12.0, currentSpeedKnots: 0.9, currentHeadingDeg: 270 }, // Coastal Antarctic Coastal Current (westward)
  { lat: -68.0, lon: 35.0, currentSpeedKnots: 1.1, currentHeadingDeg: 265 },
  { lat: -67.5, lon: 60.0, currentSpeedKnots: 1.0, currentHeadingDeg: 260 },
  { lat: -68.5, lon: 76.0, currentSpeedKnots: 0.7, currentHeadingDeg: 285 }, // Prydz Bay gyre circulation
];

// Synthetic Satellite Products for East Antarctic Corridor
export const INITIAL_SATELLITE_PRODUCTS: SatelliteProduct[] = [
  {
    id: 'SAT-S1C-EA-20260929-0815',
    sensor: 'Sentinel-1C C-Band SAR Extra-Wide Swath',
    acquisitionTime: '2026-09-29T08:15:00Z',
    processingTime: '2026-09-29T08:35:00Z',
    footprint: {
      centerLat: -68.8,
      centerLon: 74.5,
      radiusNm: 85,
      description: 'Prydz Bay & Larsemann Hills Iceberg Convergence Corridor',
    },
    productType: 'High-Res SAR Interferometric',
    sizeMb: 142.5,
    availability: 'Available for Downlink',
    decisionImpactScore: 94, // HIGH! Overlaps critical route fork
    priority: 'HIGH',
    impactExplanation:
      'Recent high-resolution SAR observation intersects the ICB-D28-FRAG corridor and fast-ice lead near Bharati approach. Acquiring this observation reduces route risk uncertainty by ~46% and can confirm the primary recommended route.',
    expectedUncertaintyReductionPct: 46,
    spatialOverlapWithRoutePct: 90,
    freshness: 'FRESH',
  },
  {
    id: 'SAT-RCM2-EA-20260929-0740',
    sensor: 'RADARSAT Constellation Mission (RCM-2)',
    acquisitionTime: '2026-09-29T07:40:00Z',
    processingTime: '2026-09-29T08:05:00Z',
    footprint: {
      centerLat: -69.8,
      centerLon: 14.0,
      radiusNm: 60,
      description: 'Schirmacher Oasis & Maitri Access Lead',
    },
    productType: 'Dual-Polarization Iceberg Profiling',
    sizeMb: 88.0,
    availability: 'Available for Downlink',
    decisionImpactScore: 72,
    priority: 'MEDIUM',
    impactExplanation:
      'Provides updated freeboard and edge profiling for Schirmacher coastal icebergs. Confirms lead openings along the balanced route alternative.',
    expectedUncertaintyReductionPct: 26,
    spatialOverlapWithRoutePct: 65,
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

