import { generateRouteAlternatives } from '../src/services/routingEngine';
import { getStationById } from '../src/data/researchStations';
import { INITIAL_VESSELS, DEFAULT_MISSION, SYNTHETIC_WEATHER, generateSyntheticSeaIce } from '../src/data/syntheticAntarcticData';

const vessel = INITIAL_VESSELS[0];
const weather = SYNTHETIC_WEATHER;
const seaIce = generateSyntheticSeaIce();

const startSt = getStationById('st-rothera')!;
const destSt = getStationById('st-esperanza')!;

const mission = {
  ...DEFAULT_MISSION,
  startLocation: { name: startSt.name, lat: startSt.lat, lon: startSt.lon },
  destination: { name: destSt.name, lat: destSt.lat, lon: destSt.lon },
};

console.time('Routing');
const routes = generateRouteAlternatives(mission, vessel, [], seaIce, weather);
console.timeEnd('Routing');

console.log('Routes generated:', routes.length);
