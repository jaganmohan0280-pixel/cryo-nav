/**
 * CRYO NAV — Uncertainty Zone Visual Legend & Interpretation Aid
 * Phase 10B — Standalone Presentational UI Component
 *
 * Explains the visual representation of uncertainty zones:
 * - Tight Zone: Higher confidence, fresh observation data, short forecast horizon
 * - Moderate Zone: Moderate confidence, aging telemetry, mid-term forecast
 * - Expanded Zone: Increased uncertainty, stale/missing data, extended forecast horizon
 * - Provenance Badges: REAL, SIMULATED, HYBRID, UNAVAILABLE
 *
 * SCIENTIFIC INTERPRETATION AID:
 * Clarifies that an uncertainty zone is an analytical area of forecast position variance,
 * NOT a confirmed hazard boundary or guaranteed collision prediction.
 */

import React from 'react';
import { Layers, Info, ShieldAlert, CheckCircle2, Clock, HelpCircle } from 'lucide-react';

export interface UncertaintyLegendProps {
  compact?: boolean;
}

export const UncertaintyLegend: React.FC<UncertaintyLegendProps> = ({ compact = false }) => {
  return (
    <div
      data-testid="uncertainty-legend"
      className="bg-slate-900/90 backdrop-blur border border-slate-700/60 rounded-xl p-4 text-slate-200 shadow-xl"
    >
      {/* Legend Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-3">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <h4 className="text-xs font-bold text-slate-100 tracking-wide uppercase">
            Uncertainty Zone Legend
          </h4>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
          UI Interpretation Aid
        </span>
      </div>

      {/* Legend Items Grid */}
      <div className="space-y-2.5 mb-3.5">
        {/* Tight Zone */}
        <div
          data-testid="legend-item-tight"
          className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 flex items-start gap-3 text-xs"
        >
          <div className="w-6 h-6 rounded-full border-2 border-emerald-400 bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          </div>
          <div>
            <div className="font-semibold text-emerald-300 flex items-center gap-2">
              <span>Tight Zone</span>
              <span className="text-[10px] font-mono text-emerald-400/80">(±0.5 nm - ±1.5 nm)</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Higher confidence / fresher information. Indicates short forecast horizons (+0h to +6h) or high-quality Sentinel-1 / SAR observation feeds.
            </div>
          </div>
        </div>

        {/* Moderate Zone */}
        <div
          data-testid="legend-item-moderate"
          className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 flex items-start gap-3 text-xs"
        >
          <div className="w-6 h-6 rounded-full border-2 border-cyan-400 border-dashed bg-cyan-500/10 flex items-center justify-center shrink-0 mt-0.5">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
          </div>
          <div>
            <div className="font-semibold text-cyan-300 flex items-center gap-2">
              <span>Moderate Zone</span>
              <span className="text-[10px] font-mono text-cyan-400/80">(±1.5 nm - ±4.0 nm)</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Moderate uncertainty. Standard forecast horizons (+12h to +24h) or aging environmental telemetry.
            </div>
          </div>
        </div>

        {/* Expanded Zone */}
        <div
          data-testid="legend-item-expanded"
          className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 flex items-start gap-3 text-xs"
        >
          <div className="w-6 h-6 rounded-full border-2 border-amber-400 border-dotted bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          </div>
          <div>
            <div className="font-semibold text-amber-300 flex items-center gap-2">
              <span>Expanded Zone</span>
              <span className="text-[10px] font-mono text-amber-400/80">(&gt; ±4.0 nm)</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Increased uncertainty. Extended forecast horizons (+48h to +72h), stale telemetry, or offline mode.
            </div>
          </div>
        </div>
      </div>

      {/* Provenance Key */}
      <div className="bg-slate-950/40 border border-slate-800 rounded-lg p-2.5 mb-3">
        <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1.5">
          Data Provenance Indicators
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono">
          <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700">
            REAL: Observed Telemetry
          </span>
          <span className="px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-700">
            SIMULATED: Model Baseline
          </span>
          <span className="px-1.5 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-700">
            HYBRID: Multi-Source
          </span>
          <span className="px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-700">
            UNAVAILABLE: Missing Input
          </span>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="text-[11px] text-slate-400 flex items-start gap-1.5 italic">
        <Info className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
        <span>
          Uncertainty zones represent model position variance over time. They do not represent exact collision boundaries or guaranteed hazard locations.
        </span>
      </div>
    </div>
  );
};
