/**
 * CRYO NAV — Offline Connectivity & Readiness UI Unit Test Suite
 * Phase 9B — Unit Verification
 *
 * Deterministic test suite verifying:
 * 1. ONLINE rendering
 * 2. LIMITED rendering
 * 3. OFFLINE rendering
 * 4. SYNCING rendering
 * 5. EMPTY local-data state
 * 6. PARTIAL local-data state
 * 7. AVAILABLE local-data state
 * 8. last sync timestamp display
 * 9. unavailable dataset handling (no fabricated timestamps/REAL-TIME labels)
 * 10. REAL data label
 * 11. SIMULATED data label
 * 12. cached vs live distinction
 * 13. no-data state
 * 14. prop changes handling
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  OfflineStatusPanel,
  OfflineStatusPanelProps,
  DataSourceStatus,
} from '../components/navigation/OfflineStatusPanel';

export function runOfflineStatusPanelTests() {
  console.log('========================================================================================');
  console.log('RUNNING PHASE 9B OFFLINE CONNECTIVITY & READINESS UI TESTS');
  console.log('========================================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      passed++;
      console.log(`  [PASS] ${testName}`);
    } else {
      failed++;
      console.error(`  [FAIL] ${testName}${detail ? ` — ${detail}` : ''}`);
    }
  }

  const sampleSources: DataSourceStatus[] = [
    { name: 'Sea Ice', mode: 'REAL', lastUpdate: '2026-09-26T18:00:00Z', isCached: false },
    { name: 'Ocean', mode: 'REAL', lastUpdate: '2026-09-26T17:30:00Z', isCached: false },
    { name: 'Weather', mode: 'SIMULATED', lastUpdate: '2026-09-26T16:00:00Z', isCached: true },
    { name: 'Icebergs', mode: 'UNAVAILABLE', lastUpdate: null, isCached: false },
    { name: 'Route', mode: 'REAL', lastUpdate: '2026-09-26T18:15:00Z', isCached: false },
    { name: 'Voyage State', mode: 'REAL', lastUpdate: '2026-09-26T18:20:00Z', isCached: false },
  ];

  // Test 1: ONLINE rendering
  {
    const html = renderToStaticMarkup(
      React.createElement(OfflineStatusPanel, {
        connectionState: 'ONLINE',
        localDataAvailability: 'AVAILABLE',
      })
    );
    assert(
      html.includes('ONLINE') && html.includes('Live data available'),
      '1. ONLINE rendering',
      'Should display ONLINE badge and "Live data available"'
    );
  }

  // Test 2: LIMITED rendering
  {
    const html = renderToStaticMarkup(
      React.createElement(OfflineStatusPanel, {
        connectionState: 'LIMITED',
        localDataAvailability: 'PARTIAL',
      })
    );
    assert(
      html.includes('LIMITED') && html.includes('Connectivity limited'),
      '2. LIMITED rendering',
      'Should display LIMITED badge and "Connectivity limited"'
    );
  }

  // Test 3: OFFLINE rendering
  {
    const html = renderToStaticMarkup(
      React.createElement(OfflineStatusPanel, {
        connectionState: 'OFFLINE',
        localDataAvailability: 'AVAILABLE',
      })
    );
    assert(
      html.includes('OFFLINE') && html.includes('Operating from cached data'),
      '3. OFFLINE rendering',
      'Should display OFFLINE badge and "Operating from cached data"'
    );
  }

  // Test 4: SYNCING rendering
  {
    const html = renderToStaticMarkup(
      React.createElement(OfflineStatusPanel, {
        connectionState: 'SYNCING',
        localDataAvailability: 'AVAILABLE',
        isSyncing: true,
      })
    );
    assert(
      html.includes('SYNCING') && html.includes('Synchronizing verified data'),
      '4. SYNCING rendering',
      'Should display SYNCING badge and "Synchronizing verified data"'
    );
  }

  // Test 5: EMPTY local-data state
  {
    const html = renderToStaticMarkup(
      React.createElement(OfflineStatusPanel, {
        connectionState: 'OFFLINE',
        localDataAvailability: 'EMPTY',
        dataSources: [],
      })
    );
    assert(
      html.includes('EMPTY') && html.includes('No local navigation data stored'),
      '5. EMPTY local-data state',
      'Should display EMPTY badge and state description'
    );
  }

  // Test 6: PARTIAL local-data state
  {
    const html = renderToStaticMarkup(
      React.createElement(OfflineStatusPanel, {
        connectionState: 'LIMITED',
        localDataAvailability: 'PARTIAL',
      })
    );
    assert(
      html.includes('PARTIAL') && html.includes('Partial navigation data stored'),
      '6. PARTIAL local-data state',
      'Should display PARTIAL badge and state description'
    );
  }

  // Test 7: AVAILABLE local-data state
  {
    const html = renderToStaticMarkup(
      React.createElement(OfflineStatusPanel, {
        connectionState: 'ONLINE',
        localDataAvailability: 'AVAILABLE',
      })
    );
    assert(
      html.includes('AVAILABLE') && html.includes('Complete local navigation datasets stored'),
      '7. AVAILABLE local-data state',
      'Should display AVAILABLE badge and state description'
    );
  }

  // Test 8: last sync timestamp display
  {
    const htmlTimestamp = renderToStaticMarkup(
      React.createElement(OfflineStatusPanel, {
        connectionState: 'ONLINE',
        localDataAvailability: 'AVAILABLE',
        lastSyncTimestamp: '2026-09-27T00:45:00Z',
      })
    );
    const htmlNever = renderToStaticMarkup(
      React.createElement(OfflineStatusPanel, {
        connectionState: 'OFFLINE',
        localDataAvailability: 'EMPTY',
        lastSyncTimestamp: null,
      })
    );

    assert(
      htmlTimestamp.includes('2026-09-27T00:45:00Z') && htmlNever.includes('Never synchronized'),
      '8. last sync timestamp display',
      'Should display formatted timestamp or "Never synchronized"'
    );
  }

  // Test 9: unavailable dataset handling
  {
    const html = renderToStaticMarkup(
      React.createElement(OfflineStatusPanel, {
        connectionState: 'LIMITED',
        localDataAvailability: 'PARTIAL',
        dataSources: sampleSources,
      })
    );

    const hasIcebergsUnavailable = html.includes('Icebergs') && html.includes('UNAVAILABLE');
    const doesNotFabricateRealTime = !html.includes('REAL-TIME');

    assert(
      hasIcebergsUnavailable && doesNotFabricateRealTime,
      '9. unavailable dataset handling',
      'Should mark missing datasets as UNAVAILABLE and not display false REAL-TIME labels'
    );
  }

  // Test 10: REAL data label
  {
    const html = renderToStaticMarkup(
      React.createElement(OfflineStatusPanel, {
        connectionState: 'ONLINE',
        localDataAvailability: 'AVAILABLE',
        dataSources: sampleSources,
      })
    );
    assert(
      html.includes('Sea Ice') && html.includes('REAL'),
      '10. REAL data label',
      'Should display REAL provenance label for real telemetry data'
    );
  }

  // Test 11: SIMULATED data label
  {
    const html = renderToStaticMarkup(
      React.createElement(OfflineStatusPanel, {
        connectionState: 'ONLINE',
        localDataAvailability: 'AVAILABLE',
        dataSources: sampleSources,
      })
    );
    assert(
      html.includes('Weather') && html.includes('SIMULATED'),
      '11. SIMULATED data label',
      'Should display SIMULATED provenance label for simulated data'
    );
  }

  // Test 12: cached vs live distinction
  {
    const htmlOffline = renderToStaticMarkup(
      React.createElement(OfflineStatusPanel, {
        connectionState: 'OFFLINE',
        localDataAvailability: 'AVAILABLE',
        dataSources: sampleSources,
      })
    );
    const htmlOnline = renderToStaticMarkup(
      React.createElement(OfflineStatusPanel, {
        connectionState: 'ONLINE',
        localDataAvailability: 'AVAILABLE',
        dataSources: [{ name: 'Sea Ice', mode: 'REAL', isCached: false }],
      })
    );

    const offlineHasCached = htmlOffline.includes('Cached data');
    const onlineHasLive = htmlOnline.includes('Live data');

    assert(
      offlineHasCached && onlineHasLive,
      '12. cached vs live distinction',
      'Offline state should display "Cached data" while Online non-cached displays "Live data"'
    );
  }

  // Test 13: no-data state
  {
    const html = renderToStaticMarkup(
      React.createElement(OfflineStatusPanel, {
        connectionState: 'OFFLINE',
        localDataAvailability: 'EMPTY',
        dataSources: [],
      })
    );
    assert(
      html.includes('No local navigation datasets stored'),
      '13. no-data state',
      'Should display clear no-data message when local datasets are empty'
    );
  }

  // Test 14: prop changes
  {
    const propsInitial: OfflineStatusPanelProps = {
      connectionState: 'OFFLINE',
      localDataAvailability: 'EMPTY',
      lastSyncTimestamp: null,
    };
    const htmlInitial = renderToStaticMarkup(React.createElement(OfflineStatusPanel, propsInitial));

    const propsUpdated: OfflineStatusPanelProps = {
      connectionState: 'ONLINE',
      localDataAvailability: 'AVAILABLE',
      lastSyncTimestamp: '2026-09-27T01:00:00Z',
    };
    const htmlUpdated = renderToStaticMarkup(React.createElement(OfflineStatusPanel, propsUpdated));

    const changedState =
      htmlInitial.includes('OFFLINE') &&
      htmlInitial.includes('EMPTY') &&
      htmlUpdated.includes('ONLINE') &&
      htmlUpdated.includes('AVAILABLE') &&
      htmlUpdated.includes('2026-09-27T01:00:00Z');

    assert(
      changedState,
      '14. prop changes',
      'Re-rendering with modified props should update connection, availability, and timestamp presentation'
    );
  }

  console.log(`\nPHASE 9B OFFLINE STATUS PANEL TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================================================\n');

  return { passed, failed };
}

// Execute tests if run directly via tsx
runOfflineStatusPanelTests();

