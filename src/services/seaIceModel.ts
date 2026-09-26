/**
 * CRYO NAV — Sea-Ice Cellular Advection & Thermodynamic Forecast Model
 * Baseline Demonstration & Real-Data Initialized Forecast Model
 *
 * Inputs: current sea-ice concentration, air/sea temperature, wind stress, forecast horizon.
 * Output: predicted concentration, timestamp, confidence, uncertainty, model version.
 *
 * Scientific Validation Status: NOT YET OPERATIONALLY VALIDATED
 */

import { SeaIceCell, WeatherCondition } from '../types';

export const REAL_SEA_ICE_MODEL_METADATA = {
  name: 'Antarctic Sea-Ice Cellular Advection Model',
  version: 'v3.5-REAL-INITIALIZED',
  type: 'Thermodynamic Growth & Wind Advection initialized from Copernicus Marine L4',
  label: 'REAL-DATA INITIALIZED BASELINE FORECAST',
  validationStatus: 'NOT YET OPERATIONALLY VALIDATED',
  disclaimer: 'Real sea-ice observations are available, but operational forecasting is not yet scientifically validated.',
};

export const SEA_ICE_MODEL_METADATA = {
  name: 'Antarctic Sea-Ice Cellular Advection Model',
  version: 'v2.4-BASELINE-DEMO',
  type: 'Thermodynamic Growth / Decay & Wind Advection',
  label: 'BASELINE DEMO MODEL',
};

export function forecastSeaIceField(
  cells: SeaIceCell[],
  weather: WeatherCondition,
  horizonHours: number, // 0, 6, 12, 24, 48, 72
  iceSeverityMultiplier: number = 1.0 // for what-if scenarios (LOW=0.8, NORMAL=1.0, HIGH=1.25)
): SeaIceCell[] {
  if (!cells || cells.length === 0) return [];

  // If temperature is below -1.8C (freezing point of seawater), ice grows slightly in sheltered bays
  const thermoRate = (weather.seaTempC || -1.5) < -1.8 ? 0.05 : -0.08;

  return cells.map((cell) => {
    // Advection by wind (wind pushes ice at ~2-3% of wind speed)
    const windSpeed = weather.windSpeedKnots || 15;
    const advectionShift = (windSpeed / 30) * (horizonHours / 24) * 1.5;

    // Coastal consolidation vs open lead opening
    const deltaConcentration = (thermoRate * horizonHours + advectionShift) * iceSeverityMultiplier;
    const rawConcentration = cell.concentrationPercent + deltaConcentration;
    const predictedConcentration = Math.min(99, Math.max(0, Math.round(rawConcentration)));

    // Uncertainty increases with forecast horizon
    const baseUncertainty = cell.uncertainty || 15;
    const uncertainty = Math.min(65, Math.round(baseUncertainty + (horizonHours / 72) * 25));
    const confidence = Math.max(35, Math.round(100 - uncertainty));

    let stage: SeaIceCell['stage'] = 'Open Water';
    if (predictedConcentration > 90) stage = 'Consolidated Fast Ice';
    else if (predictedConcentration > 70) stage = 'Close Pack (70-80%)';
    else if (predictedConcentration > 40) stage = 'Open Drift (40-60%)';
    else if (predictedConcentration > 15) stage = 'Very Open Drift (10-30%)';

    return {
      ...cell,
      concentrationPercent: predictedConcentration,
      stage,
      uncertainty,
      confidence,
    };
  });
}
