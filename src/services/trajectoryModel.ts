/**
 * CRYO NAV — Iceberg Trajectory Model
 * Phase 3B — Real-Data-Driven Scientific Kinematic Drift Engine (Correction Audit)
 *
 * Kinematic momentum equations:
 * V_berg(t) = V_ocean(x, y, t) + C_wind * V_wind(x, y, t)
 *
 * Model Parameters & Classification:
 * - C_wind (Configurable Windage Coefficient) = 0.025 (default 2.5% of 10m wind vector)
 *   Classification: MODEL ASSUMPTION / BASELINE PARAMETER
 *   Notice: This coefficient is a configurable baseline assumption used by the CRYO NAV kinematic model.
 *   It has not yet been calibrated against USNIC Antarctic iceberg tracks and must not be interpreted
 *   as a universally valid Antarctic iceberg windage coefficient.
 *
 * - Surface Ocean Current Forcing: 2D surface vector (0.49m level) from Copernicus Marine hydrodynamic product.
 * - Atmospheric Forcing: 10m wind vector from ECMWF IFS global forecast model.
 * - Numerical Integration: Explicit 1-hour timesteps (dt = 1.0 h).
 * - Uncertainty Specification: MODEL-DERIVED UNCERTAINTY envelope: sigma(t) = sigma_0 + 0.65 * t^1.15
 *
 * Model Limitations:
 * - No full 3D iceberg body dynamics
 * - No explicit keel-depth ocean current velocity profile
 * - No bathymetric grounding or shoal interaction model
 * - No thermodynamic melt, deterioration, or fragmentation model
 * - No wave radiation drift force
 * - No statistically calibrated windage parameter
 * - NOT YET OPERATIONALLY VALIDATED
 */

import {
  IcebergDetection,
  TrajectoryPoint,
  WeatherCondition,
  OceanCurrentCell,
  EnvironmentalDataMode,
  EnvironmentalAlignmentResult,
  IcebergForecastResult,
  IcebergForecastMetadata,
  ForecastStatus,
} from '../types';
import { calculateDistanceNm } from './riskEngine';

export const REAL_KINEMATIC_TRAJECTORY_METADATA: IcebergForecastMetadata = {
  name: 'Baseline 2D Kinematic Iceberg Drift Model',
  version: 'v3.5-REAL-KINEMATIC',
  type: '2D Physical Kinematic Vector Integration (Surface Current + Sail Windage)',
  label: 'REAL-DATA DRIVEN BASELINE MODEL',
  validationStatus: 'NOT YET OPERATIONALLY VALIDATED',
  windageCoefficient: 0.025,
  windageCoefficientUsed: 0.025,
  windageClassification: 'MODEL ASSUMPTION / BASELINE PARAMETER',
  oceanForcingType: 'Copernicus Marine surface ocean current (0.49m)',
  windForcingType: 'ECMWF IFS 10 m wind forecast',
  uncertaintyType: 'MODEL-DERIVED UNCERTAINTY',
  formula: 'V_berg(t) = V_ocean(x,y,t) + C_wind * V_wind(x,y,t)',
  disclaimer:
    'This coefficient is a configurable baseline assumption used by the CRYO NAV kinematic demonstration model. It has not yet been calibrated against USNIC Antarctic iceberg tracks and must not be interpreted as a universally valid Antarctic iceberg windage coefficient.',
};

export const TRAJECTORY_MODEL_METADATA = {
  name: 'Antarctic Tabular & Pinnacle Drift Model',
  version: 'v3.1-BASELINE-DEMO',
  type: 'Deterministic Kinematic Drift with Stochastic Diffusion',
  label: 'BASELINE DEMO MODEL',
};

// Earth conversion constants in polar latitudes (~64°S)
function kmToLat(km: number): number {
  return km / 111.139;
}

function kmToLon(km: number, latDeg: number): number {
  const rad = (latDeg * Math.PI) / 180;
  return km / (111.139 * Math.cos(rad));
}

/**
 * Spatial interpolation helper: finds closest ocean current cell or computes inverse-distance weight
 */
function findNearestOceanCurrent(
  lat: number,
  lon: number,
  currents: OceanCurrentCell[]
): OceanCurrentCell | null {
  if (!currents || currents.length === 0) return null;
  let closest: OceanCurrentCell = currents[0];
  let minD = Infinity;

  for (const c of currents) {
    const d = calculateDistanceNm(lat, lon, c.lat, c.lon);
    if (d < minD) {
      minD = d;
      closest = c;
    }
  }

  // If closest cell is further than 150 nm, treat as out of spatial coverage
  if (minD > 150) return null;
  return closest;
}

/**
 * Spatial interpolation helper: finds closest weather forecast point
 */
function findNearestWeatherPoint(
  lat: number,
  lon: number,
  weather: WeatherCondition | null,
  weatherGrid: WeatherCondition[]
): WeatherCondition | null {
  if (weatherGrid && weatherGrid.length > 0) {
    let closest: WeatherCondition = weatherGrid[0];
    let minD = Infinity;
    for (const w of weatherGrid) {
      if (w.lat !== undefined && w.lon !== undefined) {
        const d = calculateDistanceNm(lat, lon, w.lat, w.lon);
        if (d < minD) {
          minD = d;
          closest = w;
        }
      }
    }
    if (minD <= 150) return closest;
  }
  return weather;
}

/**
 * Generates a complete scientific forecast result for a single real or synthetic iceberg
 */
export function predictIcebergTrajectoryResult(
  berg: IcebergDetection,
  currents: OceanCurrentCell[],
  weather: WeatherCondition | null,
  weatherGrid: WeatherCondition[] = [],
  unifiedAlignment?: EnvironmentalAlignmentResult,
  mode: EnvironmentalDataMode = 'DEMO',
  driftFactorMultiplier: number = 1.0,
  options?: { windageCoefficient?: number }
): IcebergForecastResult {
  const horizons: { horizon: TrajectoryPoint['horizon']; hours: number }[] = [
    { horizon: '+6h', hours: 6 },
    { horizon: '+12h', hours: 12 },
    { horizon: '+24h', hours: 24 },
    { horizon: '+48h', hours: 48 },
    { horizon: '+72h', hours: 72 },
  ];

  const configuredWindage = options?.windageCoefficient ?? 0.025;

  const dynamicMetadata: IcebergForecastMetadata = {
    ...REAL_KINEMATIC_TRAJECTORY_METADATA,
    windageCoefficient: configuredWindage,
    windageCoefficientUsed: configuredWindage,
    formula: `V_berg(t) = V_ocean(x,y,t) + ${configuredWindage} * V_wind(x,y,t)`,
  };

  const warnings: string[] = [];
  let forecastStatus: ForecastStatus = 'VALID';
  let statusReason: string | undefined = undefined;

  // 1. REAL Mode Quality & Data Coverage Validation
  if (mode === 'REAL') {
    const oceanQuality = unifiedAlignment?.sources?.ocean?.quality || 'MISSING';
    const weatherQuality = unifiedAlignment?.sources?.weather?.quality || 'MISSING';
    const icebergQuality = unifiedAlignment?.sources?.icebergs?.quality || 'MISSING';

    if (currents.length === 0 || oceanQuality === 'MISSING' || oceanQuality === 'INVALID' || oceanQuality === 'OUT_OF_COVERAGE') {
      forecastStatus = 'UNAVAILABLE';
      statusReason = 'REAL OCEAN CURRENT DATA UNAVAILABLE: Copernicus Marine surface ocean current vectors missing for iceberg sector.';
      warnings.push('Forecast unavailable due to missing Copernicus surface ocean current forcing.');
    } else if (weather === null || weatherQuality === 'MISSING' || weatherQuality === 'INVALID' || weatherQuality === 'OUT_OF_COVERAGE') {
      forecastStatus = 'DEGRADED';
      statusReason = 'REAL WEATHER FORECAST DATA DEGRADED: ECMWF IFS 10m wind vectors missing; drift integrated from surface ocean current only.';
      warnings.push('Wind force missing; trajectory computed solely from surface ocean hydrodynamics.');
    } else if (unifiedAlignment?.alignmentStatus === 'DEGRADED' || oceanQuality === 'STALE' || weatherQuality === 'STALE' || icebergQuality === 'STALE') {
      forecastStatus = 'DEGRADED';
      statusReason = 'INPUT DATA ALIGNMENT DEGRADED: Input sources exceed preferred temporal freshness window.';
      warnings.push('Input sources have temporal validity offsets exceeding preferred thresholds.');
    }
  }

  const initialObsTime = berg.observationTime || new Date().toISOString();
  const baseObsTimeMs = new Date(initialObsTime).getTime();

  // If status is completely UNAVAILABLE, return unavailable result without fabricating points
  if (forecastStatus === 'UNAVAILABLE') {
    return {
      forecastId: `FCST-${berg.id}-${Date.now()}`,
      icebergId: berg.id,
      icebergName: berg.name,
      initialPosition: { lat: berg.lat, lon: berg.lon, timestamp: initialObsTime },
      analysisTime: unifiedAlignment?.analysisTime || new Date().toISOString(),
      forecastHorizonHours: 72,
      trajectoryPoints: horizons.map((h) => ({
        horizon: h.horizon,
        hours: h.hours,
        lat: berg.lat,
        lon: berg.lon,
        uncertaintyRadiusNm: berg.uncertaintyRadiusNm,
        timestamp: new Date(baseObsTimeMs + h.hours * 3600 * 1000).toISOString(),
        confidence: 0,
        forecastStatus: 'UNAVAILABLE',
      })),
      status: 'UNAVAILABLE',
      statusReason,
      metadata: dynamicMetadata,
      inputs: {
        icebergSource: berg.provenance || null,
        oceanSource: unifiedAlignment?.sources?.ocean?.provenance || null,
        weatherSource: unifiedAlignment?.sources?.weather?.provenance || null,
        alignmentQuality: unifiedAlignment?.overallQuality || 'UNAVAILABLE',
        alignmentStatus: unifiedAlignment?.alignmentStatus || 'UNAVAILABLE',
      },
      warnings,
    };
  }

  // 2. Numerical Hourly Kinematic Integration Loop
  let currentLat = berg.lat;
  let currentLon = berg.lon;
  let accumulatedHours = 0;

  const trajectoryPoints: TrajectoryPoint[] = [];

  // Base observation uncertainty (e.g. 0.8 nm for USNIC SAR, 1.5 nm default)
  const baseUncertainty = berg.uncertaintyRadiusNm || 0.8;

  for (const hTarget of horizons) {
    const hoursToIntegrate = hTarget.hours - accumulatedHours;
    const dtStep = 1.0; // 1-hour integration step
    const steps = Math.round(hoursToIntegrate / dtStep);

    let lastCurrentSpeed = berg.driftSpeedKnots || 0.5;
    let lastCurrentHeading = berg.driftHeadingDeg || 60;
    let lastWindSpeed = 0;
    let lastWindDir = 0;
    let lastDriftSpeed = 0;
    let lastDriftHeading = 0;

    for (let step = 0; step < steps; step++) {
      accumulatedHours += dtStep;

      // Sample local environmental forcing at current iceberg coordinates
      const currentCell = findNearestOceanCurrent(currentLat, currentLon, currents);
      const weatherPoint = findNearestWeatherPoint(currentLat, currentLon, weather, weatherGrid);

      // Surface ocean current vector (knots) from Copernicus Marine
      const oceanSpeed = currentCell ? currentCell.currentSpeedKnots : 0.8;
      const oceanHeading = currentCell ? currentCell.currentHeadingDeg : berg.driftHeadingDeg || 60;
      lastCurrentSpeed = oceanSpeed;
      lastCurrentHeading = oceanHeading;

      const oceanHeadingRad = (oceanHeading * Math.PI) / 180;
      const oceanVx = oceanSpeed * Math.sin(oceanHeadingRad); // Eastward component (kts)
      const oceanVy = oceanSpeed * Math.cos(oceanHeadingRad); // Northward component (kts)

      // ECMWF 10m Wind vector (knots & direction FROM) -> push direction is (windDir + 180)
      const windSpeed = weatherPoint ? weatherPoint.windSpeedKnots : 0;
      const windDirFrom = weatherPoint ? weatherPoint.windDirectionDeg : 0;
      lastWindSpeed = windSpeed;
      lastWindDir = windDirFrom;

      const windPushDirRad = (((windDirFrom + 180) % 360) * Math.PI) / 180;
      const windVx = windSpeed * configuredWindage * Math.sin(windPushDirRad);
      const windVy = windSpeed * configuredWindage * Math.cos(windPushDirRad);

      // Initial berg velocity component (decaying momentum factor in DEMO mode)
      const initRad = (berg.driftHeadingDeg * Math.PI) / 180;
      const initVx = berg.driftSpeedKnots * Math.sin(initRad);
      const initVy = berg.driftSpeedKnots * Math.cos(initRad);

      let netVx: number;
      let netVy: number;

      if (mode === 'REAL') {
        // Pure physical vector addition: V_ocean (surface) + C_wind * V_wind (10m)
        netVx = oceanVx + windVx;
        netVy = oceanVy + windVy;
      } else {
        // DEMO mode momentum synthesis
        netVx = (initVx * 0.5 + oceanVx * 0.35 + windVx * 0.15) * driftFactorMultiplier;
        netVy = (initVy * 0.5 + oceanVx * 0.35 + windVx * 0.15) * driftFactorMultiplier;
      }

      // Net drift speed and heading
      lastDriftSpeed = Number(Math.sqrt(netVx * netVx + netVy * netVy).toFixed(2));
      const radHeading = Math.atan2(netVx, netVy);
      lastDriftHeading = Math.round(((radHeading * 180) / Math.PI + 360) % 360);

      // Geodesic position displacement for 1-hour step (1 knot = 1.852 km/h)
      const dKmX = netVx * 1.852 * dtStep;
      const dKmY = netVy * 1.852 * dtStep;

      currentLat += kmToLat(dKmY);
      currentLon += kmToLon(dKmX, currentLat);
    }

    // Model-derived uncertainty envelope growing with forecast time: sigma(t) = sigma_0 + 0.65 * t^1.15
    const uncertaintyRadiusNm = Number(
      (baseUncertainty + 0.65 * Math.pow(hTarget.hours / 6.0, 1.15)).toFixed(1)
    );

    const confidence = Math.max(
      15,
      Math.round((berg.confidence || 90) * Math.exp(-0.008 * hTarget.hours))
    );

    const timestamp = new Date(baseObsTimeMs + hTarget.hours * 3600 * 1000).toISOString();

    trajectoryPoints.push({
      horizon: hTarget.horizon,
      hours: hTarget.hours,
      lat: Number(currentLat.toFixed(3)),
      lon: Number(currentLon.toFixed(3)),
      uncertaintyRadiusNm,
      timestamp,
      confidence,
      driftSpeedKnots: lastDriftSpeed,
      driftHeadingDeg: lastDriftHeading,
      oceanCurrentSpeedKnots: Number(lastCurrentSpeed.toFixed(2)),
      oceanCurrentHeadingDeg: Math.round(lastCurrentHeading),
      windSpeedKnots: Number(lastWindSpeed.toFixed(1)),
      windDirectionDeg: Math.round(lastWindDir),
      forecastStatus,
    });
  }

  return {
    forecastId: `FCST-${berg.id}-${Date.now()}`,
    icebergId: berg.id,
    icebergName: berg.name,
    initialPosition: { lat: berg.lat, lon: berg.lon, timestamp: initialObsTime },
    analysisTime: unifiedAlignment?.analysisTime || new Date().toISOString(),
    forecastHorizonHours: 72,
    trajectoryPoints,
    status: forecastStatus,
    statusReason,
    metadata: dynamicMetadata,
    inputs: {
      icebergSource: berg.provenance || null,
      oceanSource: unifiedAlignment?.sources?.ocean?.provenance || null,
      weatherSource: unifiedAlignment?.sources?.weather?.provenance || null,
      alignmentQuality: unifiedAlignment?.overallQuality || 'VALID',
      alignmentStatus: unifiedAlignment?.alignmentStatus || 'ALIGNED',
    },
    warnings,
  };
}

/**
 * Master trajectory function for an array of icebergs (REAL or DEMO mode)
 */
export function computeIcebergTrajectories(
  icebergs: IcebergDetection[],
  weather: WeatherCondition | null,
  currents: OceanCurrentCell[],
  driftFactorMultiplier: number = 1.0,
  mode: EnvironmentalDataMode = 'DEMO',
  weatherGrid: WeatherCondition[] = [],
  unifiedAlignment?: EnvironmentalAlignmentResult,
  options?: { windageCoefficient?: number }
): IcebergDetection[] {
  if (!icebergs || icebergs.length === 0) return [];

  return icebergs.map((berg) => {
    const forecastResult = predictIcebergTrajectoryResult(
      berg,
      currents,
      weather,
      weatherGrid,
      unifiedAlignment,
      mode,
      driftFactorMultiplier,
      options
    );

    return {
      ...berg,
      predictedTrajectory: forecastResult.trajectoryPoints,
      forecastResult,
    };
  });
}
