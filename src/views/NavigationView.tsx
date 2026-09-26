import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { AntarcticMap } from '../components/Map/AntarcticMap';
import { TimelineSlider } from '../components/TimelineSlider';
import {
  Navigation,
  Play,
  Pause,
  RotateCcw,
  AlertTriangle,
  RefreshCw,
  Wind,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
} from 'lucide-react';

export const NavigationView: React.FC = () => {
  const {
    selectedVessel,
    mission,
    gpsTracking,
    startGpsSimulation,
    pauseGpsSimulation,
    resetGpsSimulation,
    icebergs,
    replanRoutes,
    weather,
    decisionConfidence,
    unifiedEnvironment,
    forecastHorizonHours,
    setActiveView,
    dataAcquisitionRecommendations,
  } = useApp();

  const [showFactorsModal, setShowFactorsModal] = useState(false);

  // Find nearest iceberg to current GPS position
  const nearestBerg = icebergs
    .map((b) => {
      const R = 3440.065;
      const dLat = ((b.lat - gpsTracking.currentLat) * Math.PI) / 180;
      const dLon = ((b.lon - gpsTracking.currentLon) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((gpsTracking.currentLat * Math.PI) / 180) *
          Math.cos((b.lat * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return { ...b, realTimeDistanceNm: Number(dist.toFixed(1)) };
    })
    .sort((a, b) => a.realTimeDistanceNm - b.realTimeDistanceNm)[0];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50">
      {/* Top Header & Simulation Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 bg-white border-b border-slate-200 shrink-0 shadow-xs">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <Navigation className="w-5 h-5 text-slate-800" />
            Live Navigation & Vessel Conning Station
          </h1>
          <p className="text-[11px] text-slate-500 font-mono">
            {selectedVessel.name} ({selectedVessel.iceClass}) • Destination: {mission.destination.name.split('(')[0]}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!gpsTracking.isSimulating ? (
            <button
              onClick={startGpsSimulation}
              className="px-3.5 py-1.5 rounded text-xs font-bold uppercase tracking-wider bg-slate-900 hover:bg-slate-800 text-white flex items-center gap-1.5 transition shadow-xs"
            >
              <Play className="w-3.5 h-3.5 fill-white" /> Start Live Voyage
            </button>
          ) : (
            <button
              onClick={pauseGpsSimulation}
              className="px-3.5 py-1.5 rounded text-xs font-bold uppercase tracking-wider bg-amber-700 hover:bg-amber-800 text-white flex items-center gap-1.5 transition shadow-xs"
            >
              <Pause className="w-3.5 h-3.5 fill-white" /> Pause Track
            </button>
          )}

          <button
            onClick={resetGpsSimulation}
            title="Reset vessel position to Drake Passage Entry"
            className="p-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Split: Center Interactive Map + Right Conning Telemetry Panel */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
        {/* Real Interactive Antarctic Map */}
        <div className="flex-1 flex flex-col h-[50vh] lg:h-full min-h-[360px] relative overflow-hidden">
          <AntarcticMap />
          <TimelineSlider />
        </div>

        {/* Right Conning & Telemetry Sidebar */}
        <div className="w-full lg:w-96 bg-white border-t lg:border-t-0 lg:border-l border-slate-200 flex flex-col h-[50vh] lg:h-full shrink-0 overflow-y-auto p-4 space-y-4 font-mono">
          {/* Instruments Grid */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-slate-50 p-2.5 rounded border border-slate-200 shadow-xs">
              <div className="text-[10px] text-slate-500 font-semibold">GPS COORDINATES</div>
              <div className="text-sm font-bold text-slate-900 mt-0.5">
                {Math.abs(gpsTracking.currentLat).toFixed(3)}°S
              </div>
              <div className="text-xs text-slate-600">
                {Math.abs(gpsTracking.currentLon).toFixed(3)}°W
              </div>
            </div>

            <div className="bg-slate-50 p-2.5 rounded border border-slate-200 shadow-xs">
              <div className="text-[10px] text-slate-500 font-semibold">SPEED OVER GROUND</div>
              <div className="text-base font-bold text-emerald-700 mt-0.5">
                {gpsTracking.speedKnots} <span className="text-xs text-slate-500 font-normal">kts</span>
              </div>
              <div className="text-[10px] text-slate-500">Status: {gpsTracking.isSimulating ? 'Underway' : 'Moored / Idle'}</div>
            </div>

            <div className="bg-slate-50 p-2.5 rounded border border-slate-200 shadow-xs">
              <div className="text-[10px] text-slate-500 font-semibold">TRUE HEADING</div>
              <div className="text-base font-bold text-blue-700 mt-0.5">
                {gpsTracking.headingDeg}°
              </div>
              <div className="text-[10px] text-slate-500">Gyro Track Lock</div>
            </div>

            <div className="bg-slate-50 p-2.5 rounded border border-slate-200 shadow-xs">
              <div className="text-[10px] text-slate-500 font-semibold">CROSS-TRACK XTE</div>
              <div className="text-base font-bold text-slate-900 mt-0.5">
                {gpsTracking.crossTrackErrorNm} <span className="text-xs text-slate-500 font-normal">nm</span>
              </div>
              <div className="text-[10px] text-emerald-700 font-semibold">Corridor ±0.5 nm</div>
            </div>
          </div>

          {/* DECISION CONFIDENCE PANEL (Phase 4) */}
          <div
            className={`p-3.5 rounded border space-y-3 shadow-xs font-sans transition ${
              decisionConfidence.overallLevel === 'HIGH'
                ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
                : decisionConfidence.overallLevel === 'MEDIUM'
                ? 'bg-sky-50/90 border-sky-300 text-sky-950'
                : decisionConfidence.overallLevel === 'LOW'
                ? 'bg-amber-50/90 border-amber-300 text-amber-950'
                : 'bg-red-50/90 border-red-300 text-red-950'
            }`}
          >
            <div className="flex items-start justify-between border-b border-slate-200/80 pb-2">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">
                  DECISION CONFIDENCE
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`text-lg font-black uppercase ${
                      decisionConfidence.overallLevel === 'HIGH'
                        ? 'text-emerald-700'
                        : decisionConfidence.overallLevel === 'MEDIUM'
                        ? 'text-sky-700'
                        : decisionConfidence.overallLevel === 'LOW'
                        ? 'text-amber-700'
                        : 'text-red-700'
                    }`}
                  >
                    {decisionConfidence.overallLevel}
                  </span>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-800 shadow-2xs">
                    Score: {decisionConfidence.confidenceScore}/100
                  </span>
                </div>
              </div>
              <span
                className={`text-[9px] px-2 py-1 rounded font-bold uppercase tracking-wider ${
                  decisionConfidence.isRecommendationBlocked
                    ? 'bg-red-700 text-white'
                    : decisionConfidence.overallLevel === 'MEDIUM'
                    ? 'bg-sky-700 text-white'
                    : 'bg-emerald-700 text-white'
                }`}
              >
                {decisionConfidence.isRecommendationBlocked ? 'RECOMMENDATION BLOCKED' : 'RECOMMENDATION ALLOWED'}
              </span>
            </div>

            {/* CRITICAL Banner */}
            {decisionConfidence.isRecommendationBlocked && (
              <div className="p-2.5 rounded bg-red-100 border border-red-300 text-red-900 text-xs space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-red-950">
                  <AlertTriangle className="w-4 h-4 text-red-700 shrink-0" />
                  NAVIGATION RECOMMENDATION BLOCKED
                </div>
                <p className="text-[11px] leading-relaxed font-mono">
                  Required environmental information is insufficient to support a normal route recommendation. Option is displayed as an analytical scenario only.
                </p>
              </div>
            )}

            {/* Summary Breakdown */}
            <div className="space-y-1.5 text-xs font-mono">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Primary Limitation:</span>
                <span className="font-bold text-slate-900 truncate max-w-[170px] text-right">
                  {decisionConfidence.primaryLimitingFactor}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Data Quality:</span>
                <span className="font-semibold text-slate-800">{unifiedEnvironment.overallQuality}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Temporal Status:</span>
                <span className="font-semibold text-slate-800">{unifiedEnvironment.alignmentStatus}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Forecast Horizon:</span>
                <span className="font-semibold text-slate-800">+{forecastHorizonHours} h</span>
              </div>
            </div>

            {/* Verification Action Recommendation */}
            {decisionConfidence.recommendedVerificationActions.length > 0 && (
              <div className="pt-2 border-t border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Recommended Verification:
                </span>
                <p className="text-[11px] font-sans text-slate-800 bg-white/70 p-1.5 rounded border border-slate-200/60 leading-tight">
                  {decisionConfidence.recommendedVerificationActions[0]}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between gap-2">
              <button
                onClick={() => setShowFactorsModal(!showFactorsModal)}
                className="text-xs font-bold text-slate-700 hover:text-slate-900 flex items-center gap-1 border border-slate-300 px-2.5 py-1.5 rounded bg-white hover:bg-slate-50 transition shadow-2xs"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-slate-700" />
                {showFactorsModal ? 'Hide Factors' : `Factors (${decisionConfidence.factors.length})`}
              </button>
              <button
                onClick={() => setActiveView('acquisition')}
                className="text-xs font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 px-2.5 py-1.5 rounded flex items-center gap-1 transition shadow-2xs"
              >
                Acquisition <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Inline Factors Modal / Expanded List */}
            {showFactorsModal && (
              <div className="mt-3 pt-3 border-t border-slate-300 space-y-2 text-xs font-sans">
                <span className="font-bold text-slate-900 block text-[11px] uppercase tracking-wider">
                  Confidence Factors Breakdown:
                </span>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {decisionConfidence.factors.map((f, i) => (
                    <div key={i} className="p-2 rounded bg-white border border-slate-200 shadow-2xs space-y-0.5">
                      <div className="flex justify-between items-center font-bold">
                        <span className="text-slate-900 text-[11px]">{f.factorName}</span>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                            f.status === 'GOOD'
                              ? 'bg-emerald-100 text-emerald-800'
                              : f.status === 'ACCEPTABLE'
                              ? 'bg-sky-100 text-sky-800'
                              : f.status === 'CRITICAL'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {f.status} ({f.contributionScore})
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-600 leading-snug font-mono">{f.explanation}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Voyage Progress */}
          <div className="bg-slate-50 p-3 rounded border border-slate-200 space-y-2 shadow-xs">
            <div className="flex justify-between text-xs">
              <span className="text-slate-900 font-bold">Voyage Leg Progress</span>
              <span className="text-blue-700 font-bold">{gpsTracking.routeProgressPct}%</span>
            </div>

            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden p-0.5">
              <div
                className="h-full bg-slate-900 rounded-full transition-all duration-300"
                style={{ width: `${gpsTracking.routeProgressPct}%` }}
              />
            </div>

            <div className="flex justify-between text-[10px] text-slate-500 pt-0.5">
              <span>Made Good: {gpsTracking.distanceTraveledNm} nm</span>
              <span>Remaining: {gpsTracking.distanceRemainingNm} nm</span>
            </div>
          </div>

          {/* Nearest Iceberg Radar Standoff */}
          <div className="bg-slate-50 p-3 rounded border border-slate-200 space-y-2 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
              <span className="text-xs font-bold text-slate-900 uppercase flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Nearest Iceberg Hazard
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-semibold">Live Radar</span>
            </div>

            {nearestBerg ? (
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Target ID:</span>
                  <span className="text-slate-900 font-bold">{nearestBerg.name} ({nearestBerg.id})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Live Distance:</span>
                  <span
                    className={`font-bold ${
                      nearestBerg.realTimeDistanceNm < 3.0
                        ? 'text-red-700'
                        : nearestBerg.realTimeDistanceNm < 6.0
                        ? 'text-amber-700'
                        : 'text-emerald-700'
                    }`}
                  >
                    {nearestBerg.realTimeDistanceNm} nm
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Drift Vector:</span>
                  <span className="text-blue-700 font-bold">{nearestBerg.driftSpeedKnots} kt @ {nearestBerg.driftHeadingDeg}°</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Safety Standoff:</span>
                  <span className="text-slate-700">3.5 nm standard</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500">No tracked icebergs within 30 nm range.</p>
            )}
          </div>

          {/* Live Environmental Wind & Sea */}
          <div className="bg-slate-50 p-3 rounded border border-slate-200 space-y-2 shadow-xs">
            <div className="text-xs font-bold text-slate-900 uppercase flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
              <Wind className="w-3.5 h-3.5 text-slate-700" /> Bridge Environmental Telemetry
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[9px] text-slate-500 font-semibold">WIND SPEED:</span>
                <p className="font-bold text-slate-900">{weather.windSpeedKnots} kts ({weather.windDirectionDeg}°)</p>
              </div>
              <div>
                <span className="text-[9px] text-slate-500 font-semibold">SIGNIFICANT WAVE:</span>
                <p className="font-bold text-slate-900">{weather.waveHeightMeters} m</p>
              </div>
              <div>
                <span className="text-[9px] text-slate-500 font-semibold">AIR TEMP:</span>
                <p className="font-bold text-slate-900">{weather.airTempC}°C</p>
              </div>
              <div>
                <span className="text-[9px] text-slate-500 font-semibold">VISIBILITY:</span>
                <p className="font-bold text-slate-900">{weather.visibilityNm} nm</p>
              </div>
            </div>
          </div>

          {/* Dynamic Replanning Trigger */}
          <div className="bg-slate-50 p-3 rounded border border-slate-200 space-y-2 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 uppercase flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 text-slate-700" /> Dynamic Replan
              </span>
            </div>
            <p className="text-[11px] text-slate-600 leading-snug font-sans">
              Evaluate waypoint deviations if pack ice concentration expands across current leg.
            </p>
            <button
              onClick={replanRoutes}
              className="w-full py-2 px-3 rounded text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center gap-2 transition shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Re-evaluate Alternatives
            </button>
          </div>

          {/* WHAT-IF ANALYSIS PANEL (Phase 5) */}
          <WhatIfAnalysisSection />

          {/* DATA PRIORITY CALLOUT PANEL (Phase 6) */}
          <DataPrioritySection />
        </div>
      </div>
    </div>
  );
};

const DataPrioritySection: React.FC = () => {
  const { dataAcquisitionRecommendations, setActiveView } = useApp();

  if (!dataAcquisitionRecommendations || dataAcquisitionRecommendations.length === 0) return null;
  const topRec = dataAcquisitionRecommendations[0];

  return (
    <div className="bg-slate-900 text-white p-3.5 rounded-lg border border-slate-800 font-mono text-xs space-y-2.5 shadow-md">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-blue-400" />
          <span className="font-bold uppercase tracking-wider text-slate-100">DATA ACQUISITION PRIORITY</span>
        </div>
        <span className="text-[9px] px-2 py-0.5 rounded font-bold bg-blue-950 text-blue-300 border border-blue-800">
          Phase 6 Priority
        </span>
      </div>

      <div className="space-y-1">
        <span className="text-[10px] text-slate-400 block font-bold uppercase">Top Decision-Impact Observation:</span>
        <div className="flex items-center justify-between">
          <span className="font-bold text-white text-xs">{topRec.productName}</span>
          <span
            className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${
              topRec.priority === 'CRITICAL'
                ? 'bg-purple-950 text-purple-300 border-purple-800'
                : 'bg-blue-950 text-blue-300 border-blue-800'
            }`}
          >
            {topRec.priority} ({topRec.score}/100)
          </span>
        </div>
      </div>

      <p className="text-[10px] text-slate-300 font-sans leading-tight">
        {topRec.expectedBenefit}
      </p>

      <button
        onClick={() => setActiveView('acquisition')}
        className="w-full py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-xs"
      >
        <span>INSPECT DATA PRIORITIES</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

const WhatIfAnalysisSection: React.FC = () => {
  const {
    counterfactualScenarios,
    activeCounterfactualResult,
    batchSensitivitySummary,
    runSingleCounterfactual,
    runBatchSensitivity,
    clearCounterfactual,
    recommendedRoute,
  } = useApp();

  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(counterfactualScenarios[4]?.id || 'ICEBERG_DRIFT_POS_20');

  const selectedScenario = counterfactualScenarios.find((s) => s.id === selectedScenarioId) || counterfactualScenarios[0];

  return (
    <div className="bg-slate-900 text-white p-3.5 rounded border border-slate-800 space-y-3 font-sans shadow-md">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-100">WHAT-IF ANALYSIS</h3>
        </div>
        <span className="text-[9px] px-2 py-0.5 rounded font-mono font-bold bg-cyan-950 text-cyan-400 border border-cyan-800">
          Phase 5 Engine
        </span>
      </div>

      <p className="text-[11px] text-slate-300 leading-tight">
        Tests whether route recommendations remain stable when environmental assumptions are perturbed.
      </p>

      {/* Current Recommendation & Baseline Info */}
      <div className="bg-slate-950/80 p-2.5 rounded border border-slate-800 flex items-center justify-between text-xs font-mono">
        <div>
          <span className="text-[10px] text-slate-400 block uppercase">Current Baseline Plan</span>
          <span className="font-bold text-cyan-400">{recommendedRoute?.type || 'BALANCED'}</span>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-slate-400 block uppercase">Decision Stability</span>
          <span
            className={`font-bold px-1.5 py-0.5 rounded text-[10px] uppercase ${
              activeCounterfactualResult?.stability === 'HIGHLY_SENSITIVE'
                ? 'bg-red-950 text-red-400 border border-red-800'
                : activeCounterfactualResult?.stability === 'SENSITIVE'
                ? 'bg-amber-950 text-amber-400 border border-amber-800'
                : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
            }`}
          >
            {activeCounterfactualResult ? activeCounterfactualResult.stability : 'ROBUST (Baseline)'}
          </span>
        </div>
      </div>

      {/* Scenario Selector & Controls */}
      <div className="space-y-2">
        <label className="text-[10px] font-bold text-slate-400 uppercase block">Select Scenario Parameter:</label>
        <select
          value={selectedScenarioId}
          onChange={(e) => setSelectedScenarioId(e.target.value)}
          className="w-full bg-slate-950 text-slate-200 border border-slate-700 rounded px-2.5 py-1.5 text-xs font-mono focus:outline-hidden focus:border-cyan-500"
        >
          {counterfactualScenarios.map((sc) => (
            <option key={sc.id} value={sc.id}>
              {sc.name} ({sc.perturbationValue > 0 ? '+' : ''}{sc.perturbationValue}{sc.units})
            </option>
          ))}
        </select>

        <div className="flex gap-2 pt-1">
          <button
            onClick={() => runSingleCounterfactual(selectedScenario)}
            className="flex-1 py-1.5 px-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-bold uppercase tracking-wider transition flex items-center justify-center gap-1 shadow-xs"
          >
            <Play className="w-3 h-3 fill-white" /> Run Scenario
          </button>

          <button
            onClick={runBatchSensitivity}
            className="flex-1 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 rounded text-xs font-bold uppercase tracking-wider transition flex items-center justify-center gap-1 shadow-xs"
          >
            <RefreshCw className="w-3 h-3" /> Batch Analysis
          </button>
        </div>
      </div>

      {/* SINGLE COUNTERFACTUAL RESULT DISPLAY */}
      {activeCounterfactualResult && (
        <div className="bg-slate-950 p-3 rounded border border-cyan-900/60 space-y-2.5 text-xs font-mono">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="font-bold text-cyan-300 text-[11px] truncate max-w-[200px]">
              {activeCounterfactualResult.scenario.name}
            </span>
            <button onClick={clearCounterfactual} className="text-[10px] text-slate-400 hover:text-white underline">
              Clear
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
              <span className="text-[9px] text-slate-400 block">Baseline Route</span>
              <span className="font-bold text-white">{activeCounterfactualResult.baselineRecommendedType}</span>
            </div>
            <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
              <span className="text-[9px] text-slate-400 block">Counterfactual Route</span>
              <span className="font-bold text-cyan-400">{activeCounterfactualResult.scenarioRecommendedType}</span>
            </div>
          </div>

          <div className="flex items-center justify-between bg-slate-900 p-2 rounded border border-slate-800">
            <div>
              <span className="text-[10px] text-slate-400 block">Recommendation Changed</span>
              <span
                className={`font-bold ${
                  activeCounterfactualResult.recommendationChanged ? 'text-amber-400' : 'text-emerald-400'
                }`}
              >
                {activeCounterfactualResult.recommendationChanged ? 'YES' : 'NO'}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block">Route Stability</span>
              <span
                className={`font-bold uppercase ${
                  activeCounterfactualResult.stability === 'ROBUST' ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {activeCounterfactualResult.stability}
              </span>
            </div>
          </div>

          {/* Deltas Grid */}
          <div className="grid grid-cols-4 gap-1 text-center text-[10px]">
            <div className="bg-slate-900 p-1.5 rounded border border-slate-800">
              <span className="text-slate-400 block">ΔRisk</span>
              <span className={`font-bold ${activeCounterfactualResult.riskChange > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                {activeCounterfactualResult.riskChange > 0 ? '+' : ''}{activeCounterfactualResult.riskChange}%
              </span>
            </div>
            <div className="bg-slate-900 p-1.5 rounded border border-slate-800">
              <span className="text-slate-400 block">ΔETA</span>
              <span className="font-bold text-slate-200">
                {activeCounterfactualResult.etaChange > 0 ? '+' : ''}{activeCounterfactualResult.etaChange} h
              </span>
            </div>
            <div className="bg-slate-900 p-1.5 rounded border border-slate-800">
              <span className="text-slate-400 block">ΔFuel</span>
              <span className="font-bold text-slate-200">
                {activeCounterfactualResult.fuelChange > 0 ? '+' : ''}{activeCounterfactualResult.fuelChange} t
              </span>
            </div>
            <div className="bg-slate-900 p-1.5 rounded border border-slate-800">
              <span className="text-slate-400 block">ΔDist</span>
              <span className="font-bold text-slate-200">
                {activeCounterfactualResult.distanceChange > 0 ? '+' : ''}{activeCounterfactualResult.distanceChange} nm
              </span>
            </div>
          </div>

          {/* 3-Part Structured Explanation */}
          <div className="bg-slate-900/90 p-2.5 rounded border border-slate-800 space-y-1.5 text-[11px] font-sans">
            <div>
              <span className="font-bold text-cyan-400 block text-[10px] uppercase">What Changed?</span>
              <p className="text-slate-300 text-[11px]">{activeCounterfactualResult.explanation.whatChanged}</p>
            </div>
            <div>
              <span className="font-bold text-cyan-400 block text-[10px] uppercase">Why Did It Matter?</span>
              <p className="text-slate-300 text-[11px] leading-snug">{activeCounterfactualResult.explanation.whyItMatter}</p>
            </div>
            <div>
              <span className="font-bold text-cyan-400 block text-[10px] uppercase">Did Recommendation Change?</span>
              <p className="text-slate-300 text-[11px]">{activeCounterfactualResult.explanation.didRecommendationChange}</p>
            </div>
          </div>

          {/* Provenance Warning */}
          <div className="p-2 rounded bg-amber-950/60 border border-amber-800/80 text-[10px] text-amber-300 space-y-0.5">
            <span className="font-bold block uppercase tracking-wider text-[9px] text-amber-200">
              DATA PROVENANCE & TRANSPARENCY
            </span>
            <p className="leading-tight">{activeCounterfactualResult.provenance.scenarioModification}</p>
          </div>
        </div>
      )}

      {/* BATCH SENSITIVITY SUMMARY DISPLAY */}
      {batchSensitivitySummary && (
        <div className="bg-slate-950 p-3 rounded border border-cyan-900/60 space-y-2.5 text-xs font-mono">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="font-bold text-cyan-300 text-[11px]">Batch Sensitivity Matrix</span>
            <span
              className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                batchSensitivitySummary.overallStability === 'ROBUST'
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                  : 'bg-amber-950 text-amber-400 border border-amber-800'
              }`}
            >
              {batchSensitivitySummary.overallStability}
            </span>
          </div>

          <div className="bg-slate-900 p-2 rounded border border-slate-800 text-[11px] font-sans space-y-1">
            <span className="font-bold text-amber-400 block text-[10px] uppercase">
              Dominant Sensitivity in Tested Scenarios:
            </span>
            <span className="font-bold text-white text-xs block">
              {batchSensitivitySummary.dominantSensitivity?.replace('_', ' ') || 'NONE'}
            </span>
            <p className="text-slate-300 text-[10px] leading-tight font-mono">
              {batchSensitivitySummary.dominantExplanation}
            </p>
          </div>

          {/* Matrix Table */}
          <div className="space-y-1 text-[10px]">
            <div className="grid grid-cols-12 text-slate-400 font-bold border-b border-slate-800 pb-1 px-1">
              <span className="col-span-6">PARAMETER</span>
              <span className="col-span-3 text-center">STABILITY</span>
              <span className="col-span-3 text-right">CHANGE</span>
            </div>
            {batchSensitivitySummary.parameterResults.map((pr, idx) => (
              <div key={idx} className="grid grid-cols-12 items-center py-1 px-1 border-b border-slate-900/50">
                <span className="col-span-6 text-slate-200 font-semibold truncate">
                  {pr.parameter.replace('_', ' ')}
                </span>
                <span className="col-span-3 text-center">
                  <span
                    className={`px-1 py-0.5 rounded text-[8px] font-bold uppercase ${
                      pr.routeStability === 'ROBUST'
                        ? 'bg-emerald-950 text-emerald-400'
                        : 'bg-amber-950 text-amber-400'
                    }`}
                  >
                    {pr.routeStability}
                  </span>
                </span>
                <span className="col-span-3 text-right text-slate-300 font-bold">
                  {pr.scenarios.filter((s) => s.recommendationChanged).length > 0 ? 'YES' : 'NO'}
                </span>
              </div>
            ))}
          </div>

        </div>
      )}
    </div>
  );
};


