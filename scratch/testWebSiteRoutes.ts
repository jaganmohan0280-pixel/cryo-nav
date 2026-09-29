import { generateRouteAlternatives } from '../src/services/routingEngine';
import { INITIAL_VESSELS, DEFAULT_MISSION, SYNTHETIC_WEATHER, generateSyntheticSeaIce } from '../src/data/syntheticAntarcticData';
import { AUTHORITATIVE_RESEARCH_STATIONS, getStationById } from '../src/data/researchStations';
import { validateMaritimeRouteGeometry } from '../src/services/antarcticGeographicMask';

const vessel = INITIAL_VESSELS[0];
const weather = SYNTHETIC_WEATHER;
const seaIce = generateSyntheticSeaIce();

const testCases = [
  { name: 'Rothera -> Palmer', startId: 'st-rothera', destId: 'st-palmer' },
  { name: 'Rothera -> Esperanza', startId: 'st-rothera', destId: 'st-esperanza' },
  { name: 'Palmer -> Esperanza', startId: 'st-palmer', destId: 'st-esperanza' },
  { name: 'Rothera -> McMurdo', startId: 'st-rothera', destId: 'st-mcmurdo' },
  { name: 'Rothera -> Vernadsky', startId: 'st-rothera', destId: 'st-vernadsky' },
  { name: 'Vernadsky -> Rothera', startId: 'st-vernadsky', destId: 'st-rothera' },
  { name: 'Rothera -> Concordia (Inland)', startId: 'st-rothera', destId: 'st-concordia' },
  { name: 'Rothera -> South Pole (Inland)', startId: 'st-rothera', destId: 'st-southpole' },
];

console.log('===========================================================');
console.log('CRYO NAV — MANUAL WEBSITE ROUTE PLANNER COMBINATION AUDIT');
console.log('===========================================================\n');

testCases.forEach((tc) => {
  const startSt = getStationById(tc.startId)!;
  const destSt = getStationById(tc.destId)!;

  const mission = {
    ...DEFAULT_MISSION,
    startLocation: { name: startSt.name, lat: startSt.lat, lon: startSt.lon },
    destination: { name: destSt.name, lat: destSt.lat, lon: destSt.lon },
  };

  const routes = generateRouteAlternatives(mission, vessel, [], seaIce, weather);

  let landCrossing = 'NO';
  let isValid = true;

  routes.forEach((r) => {
    const val = validateMaritimeRouteGeometry(r.waypoints);
    if (!val.isValid || val.landIntersectionsCount > 0 || val.iceShelfIntersectionsCount > 0) {
      landCrossing = 'YES';
      isValid = false;
    }
  });

  const isInland = startSt.isInlandForbidden || destSt.isInlandForbidden;
  const passed = isInland ? routes.length === 0 : (routes.length >= 1 && isValid);

  console.log(`${tc.name}`);
  console.log(`Routes: ${routes.length}`);
  console.log(`Labels: ${routes.map((r) => (r.labels ? r.labels.join('+') : r.type)).join(', ') || 'None'}`);
  console.log(`Land crossing: ${landCrossing}`);
  console.log(`Result: ${passed ? 'PASS' : 'FAIL'}\n`);
});
