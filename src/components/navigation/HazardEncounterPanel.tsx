/**
 * CRYO NAV — Hazard / Encounter Intelligence Panel
 * Phase 8B — Operational Navigation Interface Component
 *
 * Displays detailed spatial & temporal encounter metrics (CPA, TCA, Corridor Intersection,
 * Hazard Severity, Data Provenance, Sea-Ice Interaction) for active route hazards.
 *
 * DO NOT modify Voyage State Monitoring UI (Phase 8A).
 * DO NOT modify SAR Area Analysis UI (Phase 7C.4).
 */

import React, { useState } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  Clock,
  Navigation,
  Layers,
  CheckCircle2,
  Info,
  Radio,
  Eye,
  Zap,
} from 'lucide-react';
import {
  HazardEncounter,
  HazardEvaluationResult,
  HazardSeverity,
  EncounterStatus,
  DataStatusLabel,
} from '../../services/hazardEncounterEngine';

interface HazardEncounterPanelProps {
  evaluationResult?: HazardEvaluationResult | null;
  selectedHazardId?: string | null;
  onSelectHazard?: (hazardId: string) => void;
  routeCorridorWidthNm?: number;
}

export const HazardEncounterPanel: React.FC<HazardEncounterPanelProps> = ({
  evaluationResult,
  selectedHazardId,
  onSelectHazard,
  routeCorridorWidthNm = 4.0,
}) => {
  const [filterSeverity, setFilterSeverity] = useState<'ALL' | 'ACTIVE_ONLY'>('ACTIVE_ONLY');

  if (!evaluationResult) {
    return (
      <div className="bg-slate-900/90 backdrop-blur border border-slate-700/60 rounded-xl p-4 text-slate-300">
        <div className="flex items-center gap-2 mb-2 text-cyan-400 font-medium">
          <ShieldAlert className="w-5 h-5 text-cyan-400" />
          <span>HAZARD / ENCOUNTER INTELLIGENCE</span>
        </div>
        <p className="text-xs text-slate-400">
          No active route or environmental hazard evaluation available. Select or calculate a route to assess hazard encounters.
        </p>
      </div>
    );
  }

  const { encounters, activeEncountersCount, highestSeverity, seaIceRouteSummary } = evaluationResult;

  // Filter encounters
  const displayedEncounters = encounters.filter((enc) => {
    if (filterSeverity === 'ACTIVE_ONLY') return enc.severity !== 'NONE';
    return true;
  });

  const activeHazard = selectedHazardId
    ? encounters.find((e) => e.hazardId === selectedHazardId || e.icebergId === selectedHazardId) || displayedEncounters[0]
    : displayedEncounters[0];

  // Helper badge styles
  const getSeverityBadge = (severity: HazardSeverity) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse';
      case 'HIGH':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
      case 'MODERATE':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40';
      case 'LOW':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
      case 'NONE':
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  const getStatusBadge = (status: EncounterStatus) => {
    switch (status) {
      case 'DIRECT_INTERSECTION':
        return 'bg-red-900/40 text-red-300 border-red-700';
      case 'CORRIDOR_ENTRY':
        return 'bg-orange-900/40 text-orange-300 border-orange-700';
      case 'PROXIMITY_ALERT':
        return 'bg-yellow-900/30 text-yellow-200 border-yellow-700/60';
      case 'NO_INTERSECTION':
        return 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60';
      case 'UNAVAILABLE':
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  const getDataStatusBadge = (label: DataStatusLabel) => {
    switch (label) {
      case 'REAL':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'SIMULATED':
        return 'bg-purple-500/10 text-purple-300 border-purple-500/30';
      case 'HYBRID':
        return 'bg-amber-500/10 text-amber-300 border-amber-500/30';
      case 'UNAVAILABLE':
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <div className="bg-slate-900/90 backdrop-blur border border-slate-700/80 rounded-xl p-4 shadow-xl text-slate-200 space-y-4">
      {/* Header Banner */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className={`w-5 h-5 ${highestSeverity === 'CRITICAL' || highestSeverity === 'HIGH' ? 'text-red-400' : 'text-cyan-400'}`} />
          <div>
            <h3 className="font-semibold text-sm tracking-wide text-slate-100 uppercase">
              Hazard / Encounter Intelligence
            </h3>
            <p className="text-[11px] text-slate-400">
              Corridor Width: ±{(routeCorridorWidthNm / 2).toFixed(1)} nm ({routeCorridorWidthNm} nm total)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-1 text-xs font-bold rounded-full border ${getSeverityBadge(highestSeverity)}`}>
            {highestSeverity === 'NONE' ? 'ROUTE CLEAR' : `${highestSeverity} HAZARD`}
          </span>
        </div>
      </div>

      {/* Sea Ice Route Interaction Briefing */}
      {seaIceRouteSummary && (
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-3 text-xs space-y-1.5">
          <div className="flex items-center justify-between font-medium text-slate-300">
            <span className="flex items-center gap-1.5 text-cyan-300">
              <Layers className="w-3.5 h-3.5" />
              Sea-Ice Corridor Interaction
            </span>
            <span className={seaIceRouteSummary.isVesselCompatible ? 'text-emerald-400' : 'text-amber-400 font-bold'}>
              {seaIceRouteSummary.isVesselCompatible ? 'Vessel Compatible' : 'Ice Rating Warning'}
            </span>
          </div>
          <p className="text-slate-400 text-[11px]">
            {seaIceRouteSummary.summaryText}
          </p>
        </div>
      )}

      {/* Main Encounters Section */}
      {displayedEncounters.length === 0 ? (
        (evaluationResult as any).dataMode === 'UNAVAILABLE' ? (
          <div data-testid="iceberg-telemetry-unavailable" className="bg-slate-950/60 border border-amber-900/40 rounded-xl p-6 text-center space-y-2">
            <Radio className="w-8 h-8 text-amber-400 mx-auto" />
            <h4 className="font-semibold text-amber-300 text-sm">ICEBERG OBSERVATION TELEMETRY UNAVAILABLE</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              No current iceberg observations available from USNIC / satellite feeds.
            </p>
            <p className="text-[10px] text-amber-400/80 italic mt-2 font-medium">
              Notice: Absence of current iceberg observations does NOT guarantee absence of hazards.
            </p>
          </div>
        ) : (
          <div className="bg-slate-950/60 border border-emerald-900/40 rounded-xl p-6 text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <h4 className="font-semibold text-emerald-300 text-sm">NO RELEVANT ENCOUNTER IDENTIFIED</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              All detected icebergs remain clear (&gt; 25 nm) of the vessel trajectory and route corridor.
            </p>
            <p className="text-[10px] text-slate-500 italic mt-2">
              Notice: Absence of detected encounters does not guarantee complete absence of unmapped ice fragments or sub-resolution ice.
            </p>
          </div>
        )
      ) : (
        <div className="space-y-3">
          {/* Encounter Selection List */}
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>Relevant Encounters ({displayedEncounters.length})</span>
            <button
              onClick={() => setFilterSeverity(filterSeverity === 'ACTIVE_ONLY' ? 'ALL' : 'ACTIVE_ONLY')}
              className="text-[11px] text-cyan-400 hover:underline"
            >
              {filterSeverity === 'ACTIVE_ONLY' ? 'Show All Objects' : 'Active Hazards Only'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {displayedEncounters.slice(0, 3).map((enc) => {
              const isSelected = activeHazard?.hazardId === enc.hazardId;
              return (
                <button
                  key={enc.hazardId}
                  onClick={() => onSelectHazard && onSelectHazard(enc.hazardId)}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    isSelected
                      ? 'bg-slate-800 border-cyan-500/80 ring-1 ring-cyan-500/30'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-xs text-slate-200 truncate max-w-[110px]">
                      {enc.icebergName || enc.hazardId}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold ${getSeverityBadge(enc.severity)}`}>
                      {enc.severity}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center justify-between">
                    <span>CPA: {enc.cpaNm !== null ? `${enc.cpaNm} nm` : 'UNAVAILABLE'}</span>
                    <span>TCA: {enc.tcaHours !== null ? `+${enc.tcaHours}h` : 'N/A'}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active Detailed Hazard Inspection Card */}
          {activeHazard && (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3 mt-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-100 text-sm">
                      {activeHazard.icebergName || activeHazard.hazardId}
                    </h4>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-mono border ${getDataStatusBadge(activeHazard.dataStatusLabel)}`}>
                      {activeHazard.dataStatusLabel} DATA
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Type: {activeHazard.hazardType} ({activeHazard.sizeCategory || 'Tabular'}) • Source: {activeHazard.sourceName}
                  </p>
                </div>

                <div className="text-right">
                  <span className={`px-2.5 py-1 text-xs font-semibold rounded-md border inline-block ${getStatusBadge(activeHazard.encounterStatus)}`}>
                    {activeHazard.encounterStatus.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* Metric Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-900/80 p-3 rounded-lg text-xs border border-slate-800">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Navigation className="w-3 h-3 text-cyan-400" />
                    CPA (Closest)
                  </div>
                  <div className="font-mono text-sm font-bold text-slate-100 mt-0.5">
                    {activeHazard.cpaNm !== null ? `${activeHazard.cpaNm} nm` : <span className="text-slate-500">UNAVAILABLE</span>}
                  </div>
                  <div className="text-[10px] text-slate-400">Min Separation</div>
                </div>

                <div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-400" />
                    TCA (Encounter)
                  </div>
                  <div className="font-mono text-sm font-bold text-slate-100 mt-0.5">
                    {activeHazard.tcaHours !== null ? `+${activeHazard.tcaHours} h` : <span className="text-slate-500">UNAVAILABLE</span>}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">
                    {activeHazard.tcaTimestamp ? new Date(activeHazard.tcaTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'No timestamp'}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Zap className="w-3 h-3 text-purple-400" />
                    Route Separation
                  </div>
                  <div className="font-mono text-sm font-bold text-slate-100 mt-0.5">
                    {activeHazard.minRouteDistanceNm} nm
                  </div>
                  <div className="text-[10px] text-slate-400">Static Distance</div>
                </div>

                <div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Radio className="w-3 h-3 text-emerald-400" />
                    Uncertainty / Conf
                  </div>
                  <div className="font-mono text-sm font-bold text-slate-100 mt-0.5">
                    ±{activeHazard.uncertaintyRadiusNm} nm
                  </div>
                  <div className="text-[10px] text-slate-400">{activeHazard.confidence}% Confidence</div>
                </div>
              </div>

              {/* Explanatory Text */}
              <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 text-xs">
                <div className="font-medium text-slate-300 text-[11px] mb-1 flex items-center gap-1">
                  <Info className="w-3 h-3 text-cyan-400" />
                  HAZARD ASSESSMENT RATIONALE
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  {activeHazard.explanation}
                </p>
              </div>

              {/* Provenance Footer */}
              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-900">
                <span>Data Provenance: {activeHazard.provenance}</span>
                <span>Mode: {activeHazard.isRealData ? 'REAL OBSERVATION' : 'SIMULATED DEMO'}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
