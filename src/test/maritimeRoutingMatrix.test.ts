import { generateRouteAlternatives } from '../services/routingEngine';
import { validateMaritimeRouteGeometry } from '../services/antarcticGeographicMask';
import { AUTHORITATIVE_RESEARCH_STATIONS } from '../data/researchStations';
import { forecastSeaIceField } from '../services/seaIceModel';

console.log('========================================================================================');
console.log('RUNNING MARITIME ROUTING MATRIX AUTOMATED GEOMETRY VALIDATION TESTS');
console.log('========================================================================================');

const seaIceCells = forecastSeaIceField(0);

const TEST_PAIRS = [
  { from: 'Rothera', to: 'Bharati' },
  { from: 'Bharati', to: 'Rothera' },
  { from: 'Maitri', to: 'Bharati' },
  { from: 'Bharati', to: 'Maitri' },
  { from: 'Maitri', to: 'Rothera' },
  { from: 'Rothera', to: 'Maitri' },
  { from: 'Palmer', to: 'Bharati' },
  { from: 'Syowa', to: 'Maitri' }
];

let totalPassed = 0;
let totalFailed = 0;

for (const pair of TEST_PAIRS) {
  const originStation = AUTHORITATIVE_RESEARCH_STATIONS.find(s => s.id === `st-${pair.from.toLowerCase()}` || s.name.toLowerCase().includes(pair.from.toLowerCase()));
  const destStation = AUTHORITATIVE_RESEARCH_STATIONS.find(s => s.id === `st-${pair.to.toLowerCase()}` || s.name.toLowerCase().includes(pair.to.toLowerCase()));

  if (!originStation || !destStation) {
    console.error(`[FAIL] Could not find station: ${pair.from} or ${pair.to}`);
    totalFailed++;
    continue;
  }

  console.log(`\nTesting Route: ${originStation.name} -> ${destStation.name}`);

  const mission = {
    id: `m-${pair.from}-${pair.to}`,
    startLocation: { id: originStation.id, name: originStation.name, lat: originStation.lat, lon: originStation.lon },
    destination: { id: destStation.id, name: destStation.name, lat: destStation.lat, lon: destStation.lon },
    departureTime: new Date().toISOString()
  } as any;

  const vessel = {
    id: 'v-normal',
    name: 'Normal Research Vessel',
    isIcebreaker: false,
    iceClass: 'None',
    maxIceConcentrationThreshold: 15
  } as any;

  const weather = { windSpeedKts: 15, waveHeightM: 2.0, visibilityNm: 10 } as any;

  const alternatives = generateRouteAlternatives(
    mission,
    vessel,
    [],
    seaIceCells,
    weather
  );

  if (alternatives.length === 0) {
    const startPt = originStation.maritimeAccessPoint || [originStation.lat, originStation.lon];
    const destPt = destStation.maritimeAccessPoint || [destStation.lat, destStation.lon];
    console.error(`  [FAIL] No route generated for ${originStation.name} -> ${destStation.name}`);
    console.error(`    startPt: ${startPt}, destPt: ${destPt}`);
    totalFailed++;
    continue;
  }

  let pairPassed = true;
  for (const route of alternatives) {
    const geoVal = validateMaritimeRouteGeometry(route.waypoints, seaIceCells, 15);

    if (!geoVal.isValid) {
      console.error(`  [FAIL] ${route.name} route invalid! Intersects Land: ${geoVal.intersectsLand}, Ice Shelf: ${geoVal.intersectsIceShelf}, Sea Ice: ${geoVal.intersectsSeaIce}`);
      pairPassed = false;
    } else {
      const riskVal = route.overallRiskScore ?? route.riskScore ?? 0;
      console.log(`  [PASS] ${route.name} route valid. Waypoints: ${route.waypoints.length}, Distance: ${route.distanceNm?.toFixed(1) ?? 'N/A'} nm, Risk: ${typeof riskVal === 'number' ? riskVal.toFixed(1) : riskVal}`);
    }
  }

  if (pairPassed) {
    totalPassed++;
  } else {
    totalFailed++;
  }
}

console.log('\n========================================================================================');
console.log(`MARITIME ROUTING MATRIX SUMMARY: ${totalPassed} PAIRS PASSED, ${totalFailed} FAILED`);
console.log('========================================================================================');

if (totalFailed > 0) {
  process.exit(1);
}
