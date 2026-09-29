import { AUTHORITATIVE_RESEARCH_STATIONS } from '../src/data/researchStations';
import { classifyGeographicLocation } from '../src/services/antarcticGeographicMask';

export function findStationByLocation(locName: string, lat: number, lon: number) {
  if (!locName) return undefined;
  let st = AUTHORITATIVE_RESEARCH_STATIONS.find((s) => s.id === locName);
  if (st) return st;

  const lower = locName.toLowerCase();
  st = AUTHORITATIVE_RESEARCH_STATIONS.find(
    (s) =>
      lower.includes(s.name.toLowerCase()) ||
      lower.includes(s.shortName.toLowerCase()) ||
      s.name.toLowerCase().includes(lower)
  );
  if (st) return st;

  return AUTHORITATIVE_RESEARCH_STATIONS.find(
    (s) => Math.abs(s.lat - lat) < 0.3 && Math.abs(s.lon - lon) < 0.3
  );
}

const testStations = [
  'Rothera Research Station',
  'Palmer Station',
  'Esperanza Base',
  'McMurdo Station',
  'Academician Vernadsky Station',
  'Concordia Station (High Plateau)',
  'Amundsen–Scott South Pole Station',
];

testStations.forEach((name) => {
  const st = findStationByLocation(name, 0, 0);
  if (st) {
    const acc = st.maritimeAccessPoint || [st.lat, st.lon];
    const cls = classifyGeographicLocation(acc[0], acc[1]);
    console.log(`${st.name} -> Maritime Access: [${acc.join(', ')}] -> Classification: ${cls}`);
  } else {
    console.log(`NOT FOUND: ${name}`);
  }
});
