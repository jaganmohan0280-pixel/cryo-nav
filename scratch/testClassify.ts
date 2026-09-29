import { classifyGeographicLocation } from '../src/services/antarcticGeographicMask';

console.log('Esperanza [-63.25, -56.80]:', classifyGeographicLocation(-63.25, -56.80));
console.log('Esperanza offshore [-63.10, -56.50]:', classifyGeographicLocation(-63.10, -56.50));

console.log('McMurdo [-77.50, 166.20]:', classifyGeographicLocation(-77.50, 166.20));
console.log('McMurdo offshore [-76.50, 166.50]:', classifyGeographicLocation(-76.50, 166.50));
