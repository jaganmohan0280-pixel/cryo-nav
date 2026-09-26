/**
 * CRYO NAV — Navigation Alert Panel UI Test Suite
 * Phase 14B — Presentational Component Verification
 *
 * Verifies all 20 required test cases:
 * 1. zero alerts
 * 2. info alert
 * 3. advisory alert
 * 4. warning alert
 * 5. critical alert
 * 6. alert counts
 * 7. alert title/message
 * 8. alert source
 * 9. alert timestamp
 * 10. affected entity
 * 11. REAL mode
 * 12. SIMULATED mode
 * 13. UNAVAILABLE mode
 * 14. GPS unavailable
 * 15. OFFLINE status
 * 16. no autonomous-control disclaimer
 * 17. deterministic ordering / rendering
 * 18. multiple alerts
 * 19. empty optional fields
 * 20. no unsafe/guarantee language
 */

import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { NavigationAlertPanel } from '../components/navigation/NavigationAlertPanel';
import {
  NavigationAlertEvaluationResult,
  NavigationAlert,
} from '../services/navigationAlertEngine';

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
  } else {
    console.error(`  [FAIL] ${testName}${detail ? ` — ${detail}` : ''}`);
    throw new Error(`Assertion failed: ${testName}`);
  }
}

function createMockAlertResult(
  overrides: Partial<NavigationAlertEvaluationResult> = {}
): NavigationAlertEvaluationResult {
  const alerts: NavigationAlert[] = overrides.alerts || [
    {
      id: 'ALERT_GPS_DATA_UNAVAILABLE',
      type: 'GPS_DATA_UNAVAILABLE',
      severity: 'WARNING',
      title: 'GPS Position Unavailable',
      message: 'Vessel GPS position telemetry is currently unavailable.',
      timestamp: '2026-09-27T12:00:00.000Z',
      source: 'GPS_TELEMETRY',
      acknowledged: false,
      dataMode: 'REAL',
      provenance: 'Shipboard Marine NMEA GPS',
    },
    {
      id: 'ALERT_ICEBERG_ENCOUNTER_berg-1',
      type: 'ICEBERG_ENCOUNTER',
      severity: 'CRITICAL',
      title: 'Critical Hazard Encounter',
      message: 'Critical iceberg corridor encounter predicted (CPA 0.8 nm).',
      timestamp: '2026-09-27T12:00:00.000Z',
      source: 'HAZARD_ENGINE',
      targetEntityId: 'berg-1',
      acknowledged: false,
      dataMode: 'REAL',
      provenance: 'USNIC Iceberg Catalog',
    },
    {
      id: 'ALERT_CONNECTIVITY_LIMITED',
      type: 'CONNECTIVITY_DEGRADED',
      severity: 'ADVISORY',
      title: 'Connectivity Limited',
      message: 'Downlink connectivity is LIMITED. Bandwidth budget active.',
      timestamp: '2026-09-27T12:00:00.000Z',
      source: 'CONNECTIVITY_ENGINE',
      acknowledged: false,
      dataMode: 'REAL',
      provenance: 'Iridium Telemetry Feed',
    },
    {
      id: 'ALERT_CONNECTIVITY_OFFLINE',
      type: 'OFFLINE_OPERATION',
      severity: 'INFO',
      title: 'Offline Navigation Mode',
      message: 'Navigation operating with offline data availability.',
      timestamp: '2026-09-27T12:00:00.000Z',
      source: 'CONNECTIVITY_ENGINE',
      acknowledged: false,
      dataMode: 'REAL',
      provenance: 'Local IndexedDB Cache',
    },
  ];

  let criticalCount = 0;
  let warningCount = 0;
  let advisoryCount = 0;
  let infoCount = 0;
  for (const a of alerts) {
    if (a.severity === 'CRITICAL') criticalCount++;
    else if (a.severity === 'WARNING') warningCount++;
    else if (a.severity === 'ADVISORY') advisoryCount++;
    else if (a.severity === 'INFO') infoCount++;
  }

  return {
    alerts,
    totalAlertsCount: alerts.length,
    criticalAlertsCount: criticalCount,
    warningAlertsCount: warningCount,
    advisoryAlertsCount: advisoryCount,
    infoAlertsCount: infoCount,
    evaluationTimestamp: '2026-09-27T12:00:00.000Z',
    dataMode: 'REAL',
    provenance: 'Phase 14A Alert Engine',
    hasActiveCriticalAlerts: criticalCount > 0,
    ...overrides,
  };
}

export function runNavigationAlertPanelTests() {
  console.log('========================================================================================');
  console.log('RUNNING PHASE 14B NAVIGATION ALERT UI COMPONENT TESTS');
  console.log('========================================================================================\n');

  // Test 1: Zero alerts
  {
    const emptyResult: NavigationAlertEvaluationResult = {
      alerts: [],
      totalAlertsCount: 0,
      criticalAlertsCount: 0,
      warningAlertsCount: 0,
      advisoryAlertsCount: 0,
      infoAlertsCount: 0,
      evaluationTimestamp: '2026-09-27T12:00:00.000Z',
      dataMode: 'REAL',
      provenance: 'Phase 14A Engine',
      hasActiveCriticalAlerts: false,
    };
    const html = ReactDOMServer.renderToString(React.createElement(NavigationAlertPanel, { result: emptyResult }));
    assert(html.includes('No active navigation alerts'), '1. zero alerts state handled cleanly');
  }

  // Test 2: Info alert
  {
    const res = createMockAlertResult();
    const html = ReactDOMServer.renderToString(React.createElement(NavigationAlertPanel, { result: res }));
    assert(html.includes('Offline Navigation Mode') && html.includes('INFO'), '2. info alert rendered');
  }

  // Test 3: Advisory alert
  {
    const res = createMockAlertResult();
    const html = ReactDOMServer.renderToString(React.createElement(NavigationAlertPanel, { result: res }));
    assert(html.includes('Connectivity Limited') && html.includes('ADVISORY'), '3. advisory alert rendered');
  }

  // Test 4: Warning alert
  {
    const res = createMockAlertResult();
    const html = ReactDOMServer.renderToString(React.createElement(NavigationAlertPanel, { result: res }));
    assert(html.includes('GPS Position Unavailable') && html.includes('WARNING'), '4. warning alert rendered');
  }

  // Test 5: Critical alert
  {
    const res = createMockAlertResult();
    const html = ReactDOMServer.renderToString(React.createElement(NavigationAlertPanel, { result: res }));
    assert(html.includes('Critical Hazard Encounter') && html.includes('CRITICAL'), '5. critical alert rendered');
  }

  // Test 6: Alert counts summary
  {
    const res = createMockAlertResult();
    const html = ReactDOMServer.renderToString(React.createElement(NavigationAlertPanel, { result: res }));
    assert(
      html.includes('total-alerts-count') &&
        html.includes('critical-alerts-count') &&
        html.includes('warning-alerts-count'),
      '6. alert counts summary rendered'
    );
  }

  // Test 7: Alert title & message
  {
    const res = createMockAlertResult();
    const html = ReactDOMServer.renderToString(React.createElement(NavigationAlertPanel, { result: res }));
    assert(
      html.includes('Critical Hazard Encounter') &&
        html.includes('Critical iceberg corridor encounter predicted (CPA 0.8 nm).'),
      '7. alert title & message rendered'
    );
  }

  // Test 8: Alert source
  {
    const res = createMockAlertResult();
    const html = ReactDOMServer.renderToString(React.createElement(NavigationAlertPanel, { result: res }));
    assert(html.includes('Src: HAZARD_ENGINE') && html.includes('Src: GPS_TELEMETRY'), '8. alert source rendered');
  }

  // Test 9: Alert timestamp
  {
    const res = createMockAlertResult();
    const html = ReactDOMServer.renderToString(React.createElement(NavigationAlertPanel, { result: res }));
    assert(html.includes('alert-timestamp-'), '9. alert timestamp element rendered');
  }

  // Test 10: Affected entity
  {
    const res = createMockAlertResult();
    const html = ReactDOMServer.renderToString(React.createElement(NavigationAlertPanel, { result: res }));
    assert(html.includes('Target: berg-1'), '10. affected entity rendered');
  }

  // Test 11: REAL mode badge
  {
    const res = createMockAlertResult({ dataMode: 'REAL' });
    const html = ReactDOMServer.renderToString(React.createElement(NavigationAlertPanel, { result: res }));
    assert(html.includes('REAL'), '11. REAL mode badge rendered');
  }

  // Test 12: SIMULATED mode badge
  {
    const res = createMockAlertResult({ dataMode: 'SIMULATED' });
    const html = ReactDOMServer.renderToString(React.createElement(NavigationAlertPanel, { result: res }));
    assert(html.includes('SIMULATED'), '12. SIMULATED mode badge rendered');
  }

  // Test 13: UNAVAILABLE mode badge
  {
    const res = createMockAlertResult({ dataMode: 'UNAVAILABLE' });
    const html = ReactDOMServer.renderToString(React.createElement(NavigationAlertPanel, { result: res }));
    assert(html.includes('UNAVAILABLE'), '13. UNAVAILABLE mode badge rendered');
  }

  // Test 14: GPS unavailable
  {
    const res = createMockAlertResult();
    const html = ReactDOMServer.renderToString(
      React.createElement(NavigationAlertPanel, { result: res, gpsAvailable: false })
    );
    assert(html.includes('TELEMETRY UNAVAILABLE'), '14. GPS unavailable state handled');
  }

  // Test 15: OFFLINE status
  {
    const res = createMockAlertResult();
    const html = ReactDOMServer.renderToString(
      React.createElement(NavigationAlertPanel, { result: res, connectionState: 'OFFLINE' })
    );
    assert(html.includes('OFFLINE'), '15. OFFLINE status rendered cleanly');
  }

  // Test 16: No autonomous-control disclaimer
  {
    const res = createMockAlertResult();
    const html = ReactDOMServer.renderToString(React.createElement(NavigationAlertPanel, { result: res }));
    assert(
      html.includes(
        'CRYO NAV provides decision support. Vessel control and route changes remain with the navigator.'
      ),
      '16. no autonomous-control disclaimer rendered'
    );
  }

  // Test 17: Deterministic rendering
  {
    const res = createMockAlertResult();
    const html1 = ReactDOMServer.renderToString(React.createElement(NavigationAlertPanel, { result: res }));
    const html2 = ReactDOMServer.renderToString(React.createElement(NavigationAlertPanel, { result: res }));
    assert(html1 === html2, '17. deterministic rendering across calls');
  }

  // Test 18: Multiple alerts list
  {
    const res = createMockAlertResult();
    const html = ReactDOMServer.renderToString(React.createElement(NavigationAlertPanel, { result: res }));
    assert(
      html.includes('ALERT_GPS_DATA_UNAVAILABLE') && html.includes('ALERT_ICEBERG_ENCOUNTER_berg-1'),
      '18. multiple alerts rendered in list'
    );
  }

  // Test 19: Empty optional fields
  {
    const minimalAlert: NavigationAlert = {
      id: 'ALERT_MINIMAL',
      type: 'INFO_SYSTEM' as any,
      severity: 'INFO',
      title: 'Minimal System Alert',
      message: 'System running normally.',
      timestamp: '2026-09-27T12:00:00.000Z',
      source: 'SYSTEM',
      acknowledged: false,
      dataMode: 'REAL',
      provenance: 'Base System',
    };
    const res = createMockAlertResult({ alerts: [minimalAlert] });
    const html = ReactDOMServer.renderToString(React.createElement(NavigationAlertPanel, { result: res }));
    assert(html.includes('Minimal System Alert'), '19. empty optional fields handled');
  }

  // Test 20: No unsafe/guarantee language
  {
    const res = createMockAlertResult();
    const html = ReactDOMServer.renderToString(React.createElement(NavigationAlertPanel, { result: res }));
    const lowerHtml = html.toLowerCase();
    const forbiddenPhrases = [
      'collision guaranteed',
      'ship will collide',
      'definitely unsafe',
    ];
    let foundForbidden = false;
    for (const phrase of forbiddenPhrases) {
      if (lowerHtml.includes(phrase)) {
        foundForbidden = true;
        break;
      }
    }
    assert(!foundForbidden, '20. no unsafe/guarantee language present');
  }

  console.log('\n========================================================================================');
  console.log('ALL PHASE 14B NAVIGATION ALERT UI TESTS PASSED!');
  console.log('========================================================================================\n');
}

// Execute directly if run via CLI
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('navigationAlertPanel.test.ts')) {
  try {
    runNavigationAlertPanelTests();
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}
