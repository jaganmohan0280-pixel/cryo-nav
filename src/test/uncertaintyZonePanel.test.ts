/**
 * CRYO NAV — Uncertainty Zone Visualization & Explanation UI Test Suite
 * Phase 10B — Unit Verification
 *
 * Deterministic test suite verifying:
 * 1. HIGH confidence display
 * 2. MEDIUM confidence display
 * 3. LOW confidence display
 * 4. CRITICAL confidence display
 * 5. FRESH display
 * 6. AGING display
 * 7. STALE display
 * 8. OFFLINE display
 * 9. ONLINE display
 * 10. forecast horizon display
 * 11. uncertainty radius display
 * 12. reason display
 * 13. REAL provenance
 * 14. SIMULATED provenance
 * 15. HYBRID provenance
 * 16. UNAVAILABLE provenance
 * 17. missing uncertainty data
 * 18. missing confidence
 * 19. missing freshness
 * 20. legend rendering
 * 21. no false certainty language
 * 22. prop updates
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  UncertaintyZonePanel,
  UncertaintyZonePanelProps,
  UncertaintyData,
} from '../components/navigation/UncertaintyZonePanel';
import { UncertaintyLegend } from '../components/navigation/UncertaintyLegend';

export function runUncertaintyZonePanelTests() {
  console.log('========================================================================================');
  console.log('RUNNING PHASE 10B UNCERTAINTY ZONE VISUALIZATION & EXPLANATION UI TESTS');
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

  // Test 1: HIGH confidence display
  {
    const html = renderToStaticMarkup(
      React.createElement(UncertaintyZonePanel, {
        uncertaintyData: { confidence: 'HIGH' },
      })
    );
    assert(html.includes('HIGH'), '1. HIGH confidence display', 'Should display HIGH confidence badge');
  }

  // Test 2: MEDIUM confidence display
  {
    const html = renderToStaticMarkup(
      React.createElement(UncertaintyZonePanel, {
        uncertaintyData: { confidence: 'MEDIUM' },
      })
    );
    assert(html.includes('MEDIUM'), '2. MEDIUM confidence display', 'Should display MEDIUM confidence badge');
  }

  // Test 3: LOW confidence display
  {
    const html = renderToStaticMarkup(
      React.createElement(UncertaintyZonePanel, {
        uncertaintyData: { confidence: 'LOW' },
      })
    );
    assert(html.includes('LOW'), '3. LOW confidence display', 'Should display LOW confidence badge');
  }

  // Test 4: CRITICAL confidence display
  {
    const html = renderToStaticMarkup(
      React.createElement(UncertaintyZonePanel, {
        uncertaintyData: { confidence: 'CRITICAL' },
      })
    );
    assert(html.includes('CRITICAL'), '4. CRITICAL confidence display', 'Should display CRITICAL confidence badge');
  }

  // Test 5: FRESH display
  {
    const html = renderToStaticMarkup(
      React.createElement(UncertaintyZonePanel, {
        uncertaintyData: { freshness: 'FRESH' },
      })
    );
    assert(html.includes('FRESH'), '5. FRESH display', 'Should display FRESH freshness badge');
  }

  // Test 6: AGING display
  {
    const html = renderToStaticMarkup(
      React.createElement(UncertaintyZonePanel, {
        uncertaintyData: { freshness: 'AGING' },
      })
    );
    assert(html.includes('AGING'), '6. AGING display', 'Should display AGING freshness badge');
  }

  // Test 7: STALE display
  {
    const html = renderToStaticMarkup(
      React.createElement(UncertaintyZonePanel, {
        uncertaintyData: { freshness: 'STALE' },
      })
    );
    assert(html.includes('STALE'), '7. STALE display', 'Should display STALE freshness badge');
  }

  // Test 8: OFFLINE display
  {
    const html = renderToStaticMarkup(
      React.createElement(UncertaintyZonePanel, {
        uncertaintyData: { connectivity: 'OFFLINE' },
      })
    );
    assert(html.includes('OFFLINE'), '8. OFFLINE display', 'Should display OFFLINE connectivity state');
  }

  // Test 9: ONLINE display
  {
    const html = renderToStaticMarkup(
      React.createElement(UncertaintyZonePanel, {
        uncertaintyData: { connectivity: 'ONLINE' },
      })
    );
    assert(html.includes('ONLINE'), '9. ONLINE display', 'Should display ONLINE connectivity state');
  }

  // Test 10: forecast horizon display
  {
    const html = renderToStaticMarkup(
      React.createElement(UncertaintyZonePanel, {
        uncertaintyData: { forecastHorizon: '+48h' },
      })
    );
    assert(html.includes('+48h') || html.includes('48h'), '10. forecast horizon display', 'Should display forecast horizon');
  }

  // Test 11: uncertainty radius display
  {
    const html = renderToStaticMarkup(
      React.createElement(UncertaintyZonePanel, {
        uncertaintyData: { uncertaintyRadiusNm: 3.8 },
      })
    );
    assert(html.includes('3.8 nm'), '11. uncertainty radius display', 'Should display uncertainty radius value');
  }

  // Test 12: reason display
  {
    const reasonText = 'Extended forecast horizon (+48h) combined with aging telemetry.';
    const html = renderToStaticMarkup(
      React.createElement(UncertaintyZonePanel, {
        uncertaintyData: { reason: reasonText },
      })
    );
    assert(html.includes(reasonText), '12. reason display', 'Should display reason text');
  }

  // Test 13: REAL provenance
  {
    const html = renderToStaticMarkup(
      React.createElement(UncertaintyZonePanel, {
        uncertaintyData: { provenance: 'REAL' },
      })
    );
    assert(html.includes('REAL'), '13. REAL provenance', 'Should display REAL data provenance badge');
  }

  // Test 14: SIMULATED provenance
  {
    const html = renderToStaticMarkup(
      React.createElement(UncertaintyZonePanel, {
        uncertaintyData: { provenance: 'SIMULATED' },
      })
    );
    assert(html.includes('SIMULATED'), '14. SIMULATED provenance', 'Should display SIMULATED data provenance badge');
  }

  // Test 15: HYBRID provenance
  {
    const html = renderToStaticMarkup(
      React.createElement(UncertaintyZonePanel, {
        uncertaintyData: { provenance: 'HYBRID' },
      })
    );
    assert(html.includes('HYBRID'), '15. HYBRID provenance', 'Should display HYBRID data provenance badge');
  }

  // Test 16: UNAVAILABLE provenance
  {
    const html = renderToStaticMarkup(
      React.createElement(UncertaintyZonePanel, {
        uncertaintyData: { provenance: 'UNAVAILABLE' },
      })
    );
    assert(html.includes('UNAVAILABLE'), '16. UNAVAILABLE provenance', 'Should display UNAVAILABLE data provenance badge');
  }

  // Test 17: missing uncertainty data
  {
    const html = renderToStaticMarkup(
      React.createElement(UncertaintyZonePanel, {
        uncertaintyData: null,
      })
    );
    assert(
      html.includes('No uncertainty assessment available'),
      '17. missing uncertainty data',
      'Should display clear fallback message when uncertainty data is null'
    );
  }

  // Test 18: missing confidence
  {
    const html = renderToStaticMarkup(
      React.createElement(UncertaintyZonePanel, {
        uncertaintyData: { confidence: null },
      })
    );
    assert(
      html.includes('Confidence unavailable'),
      '18. missing confidence',
      'Should display "Confidence unavailable" when confidence is null'
    );
  }

  // Test 19: missing freshness
  {
    const html = renderToStaticMarkup(
      React.createElement(UncertaintyZonePanel, {
        uncertaintyData: { freshness: null },
      })
    );
    assert(
      html.includes('Freshness unavailable'),
      '19. missing freshness',
      'Should display "Freshness unavailable" when freshness is null'
    );
  }

  // Test 20: legend rendering
  {
    const html = renderToStaticMarkup(React.createElement(UncertaintyLegend));
    assert(
      html.includes('Uncertainty Zone Legend') && html.includes('Tight Zone'),
      '20. legend rendering',
      'UncertaintyLegend component should render legend items and explanation'
    );
  }

  // Test 21: no false certainty language
  {
    const panelHtml = renderToStaticMarkup(
      React.createElement(UncertaintyZonePanel, {
        uncertaintyData: {
          hazardType: 'ICEBERG',
          confidence: 'LOW',
          freshness: 'STALE',
          connectivity: 'OFFLINE',
          forecastHorizon: '+72h',
          uncertaintyRadiusNm: 8.5,
          reason: 'Severe forecast horizon advection dispersion.',
          provenance: 'SIMULATED',
        },
      })
    );
    const legendHtml = renderToStaticMarkup(React.createElement(UncertaintyLegend));
    const combinedHtml = panelHtml + legendHtml;

    const forbiddenPhrases = [
      'prediction guaranteed',
      'certain collision',
      'exact danger boundary',
      '100% safe',
    ];

    let containsForbidden = false;
    for (const phrase of forbiddenPhrases) {
      if (combinedHtml.toLowerCase().includes(phrase)) {
        containsForbidden = true;
        break;
      }
    }

    assert(
      !containsForbidden,
      '21. no false certainty language',
      'Should avoid misleading claims like "prediction guaranteed", "certain collision", "exact danger boundary", or "100% safe"'
    );
  }

  // Test 22: prop updates
  {
    const initialProps: UncertaintyZonePanelProps = {
      uncertaintyData: {
        confidence: 'LOW',
        provenance: 'SIMULATED',
        forecastHorizon: '+72h',
      },
    };
    const initialHtml = renderToStaticMarkup(React.createElement(UncertaintyZonePanel, initialProps));

    const updatedProps: UncertaintyZonePanelProps = {
      uncertaintyData: {
        confidence: 'HIGH',
        provenance: 'REAL',
        forecastHorizon: '+6h',
      },
    };
    const updatedHtml = renderToStaticMarkup(React.createElement(UncertaintyZonePanel, updatedProps));

    const propsChangedSuccessfully =
      initialHtml.includes('LOW') &&
      initialHtml.includes('SIMULATED') &&
      updatedHtml.includes('HIGH') &&
      updatedHtml.includes('REAL') &&
      updatedHtml.includes('+6h');

    assert(
      propsChangedSuccessfully,
      '22. prop updates',
      'Re-rendering component with updated props should reflect new confidence, provenance, and forecast horizon'
    );
  }

  console.log(`\nPHASE 10B UNCERTAINTY ZONE PANEL TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================================================\n');

  return { passed, failed };
}

// Execute tests if run directly via tsx
runUncertaintyZonePanelTests();
