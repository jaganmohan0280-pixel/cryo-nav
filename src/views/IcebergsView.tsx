import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { AntarcticMap } from '../components/Map/AntarcticMap';
import { runIcebergTrajectoryWhatIf } from '../services/counterfactualEngine';
import {
  Activity,
  Compass,
  Info,
  Play,
  Pause,
  RotateCcw,
  Target,
  Clock,
  Radio,
  Database,
  CheckCircle2,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';

export const IcebergsView: React.FC = () => {
  const {
    icebergs,
    selectedIcebergId,
    setSelectedIcebergId,
    forecastHorizonHours,
    setForecastHorizonHours,
    environmentalMode,
    setEnvironmentalMode,
    realIcebergProvenance,
    realIcebergError,
    isFetchingRealIcebergs,
    fetchRealIcebergData,
    unifiedEnvironment,
    decisionConfidence,
  } = useApp();

  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const selectedBerg = icebergs.find((b) => b.id === selectedIcebergId) || icebergs[0];

  const horizons = [
    { label: 'Now (T+0h)', hours: 0, text: 'T+0h' },
    { label: '+6h', hours: 6, text: '+6h' },
    { label: '+12h', hours: 12, text: '+12h' },
    { label: '+24h (+1d)', hours: 24, text: '+24h' },
    { label: '+48h (+2d)', hours: 48, text: '+48h' },
    { label: '+72h (+3d)', hours: 72, text: '+72h' },
  ];

  // Auto-play interval for forecast progression
  useEffect(() => {
    if (!isPlaying) return;
    const horizonList = [0, 6, 12, 24, 48, 72];
    const timer = setInterval(() => {
      const idx = horizonList.indexOf(forecastHorizonHours);
      const nextIdx = (idx + 1) % horizonList.length;
      setForecastHorizonHours(horizonList[nextIdx]);
    }, 1500);
    return () => clearInterval(timer);
  }, [isPlaying, forecastHorizonHours, setForecastHorizonHours]);

  // Derived current/predicted parameters at selected horizon
  const activePoint =
    forecastHorizonHours === 0
      ? null
      : selectedBerg?.predictedTrajectory?.find((pt) => pt.hours === forecastHorizonHours);

  const currentDisplay = {
    lat: activePoint ? activePoint.lat : selectedBerg?.lat || 0,
    lon: activePoint ? activePoint.lon : selectedBerg?.lon || 0,
    driftSpeedKnots: activePoint?.driftSpeedKnots ?? selectedBerg?.driftSpeedKnots ?? 0,
    driftHeadingDeg: selectedBerg?.driftHeadingDeg ?? 0,
    uncertaintyRadiusNm: activePoint ? activePoint.uncertaintyRadiusNm : selectedBerg?.uncertaintyRadiusNm || 0,
    horizonLabel: forecastHorizonHours === 0 ? 'Now (T+0h)' : `+${forecastHorizonHours}h`,
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-slate-50 font-sans">
      {/* Top Header & Overview */}
      <div className="px-4 py-3 bg-white border-b border-slate-200 shrink-0 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <Activity className="w-5 h-5 text-slate-800" />
            Iceberg Tracking & Environmental Intelligence
          </h1>
          <p className="text-[11px] text-slate-500 font-mono">
            USNIC Antarctic Iceberg Database Observations & Trajectory Envelopes
          </p>
        </div>

        {/* Environmental Data Mode Toggle (DEMO vs REAL) */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setEnvironmentalMode('DEMO')}
              className={`px-3 py-1 text-xs font-bold font-mono rounded-md transition flex items-center gap-1.5 ${
                environmentalMode === 'DEMO'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Radio className="w-3.5 h-3.5 text-amber-400" />
              DEMO MODE (SYNTHETIC)
            </button>
            <button
              onClick={() => setEnvironmentalMode('REAL')}
              className={`px-3 py-1 text-xs font-bold font-mono rounded-md transition flex items-center gap-1.5 ${
                environmentalMode === 'REAL'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Database className="w-3.5 h-3.5 text-emerald-300" />
              REAL DATA (USNIC ICEBERGS)
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="px-2.5 py-1 rounded bg-slate-100 border border-slate-200 text-slate-700 font-semibold">
              Active Targets: <strong className="text-slate-900">{icebergs.length}</strong>
            </span>
            <span className="px-2.5 py-1 rounded bg-blue-50 border border-blue-200 text-blue-800 font-semibold flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              Horizon: <strong className="text-blue-900">{currentDisplay.horizonLabel}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Workspace */}
      <div className="p-4 space-y-4 max-w-[1600px] w-full mx-auto flex-1 flex flex-col min-h-0">
        {/* REAL ICEBERG DATA Provenance Card */}
        {environmentalMode === 'REAL' && realIcebergProvenance && (
          <div className="bg-amber-950 text-white p-3.5 rounded-lg border border-amber-800 shadow-md font-mono text-xs space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-800/80 pb-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-bold text-[10px] tracking-wider uppercase">
                  REAL ICEBERG CATALOG PIPELINE
                </span>
                <span className="font-bold text-amber-200 text-sm flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-amber-400" />
                  {realIcebergProvenance.source}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-amber-300">
                  Freshness: <strong className="text-white px-1.5 py-0.5 rounded bg-amber-900 border border-amber-700">{realIcebergProvenance.freshnessState}</strong>
                </span>
                <button
                  onClick={() => fetchRealIcebergData()}
                  disabled={isFetchingRealIcebergs}
                  className="px-2.5 py-1 rounded bg-amber-800 hover:bg-amber-700 text-amber-100 border border-amber-600 font-bold text-[11px] transition flex items-center gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${isFetchingRealIcebergs ? 'animate-spin' : ''}`} />
                  Refresh USNIC Catalog
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1">
              <div>
                <span className="text-amber-400 text-[10px] uppercase font-bold block">Provider & Institution</span>
                <span className="text-amber-100 font-bold">{realIcebergProvenance.provider}</span>
                <div className="text-[10px] text-amber-300 truncate">{realIcebergProvenance.datasetId}</div>
              </div>
              <div>
                <span className="text-amber-400 text-[10px] uppercase font-bold block">Observation Date</span>
                <span className="text-white font-bold">{new Date(realIcebergProvenance.observationTime).toUTCString()}</span>
                <div className="text-[10px] text-amber-300">Data Age: {realIcebergProvenance.dataAgeHours} hours</div>
              </div>
              <div>
                <span className="text-amber-400 text-[10px] uppercase font-bold block">Processing Level & Type</span>
                <span className="text-amber-100 font-bold">L4 Analyst SAR Verification</span>
                <div className="text-[10px] text-amber-300">Category: {realIcebergProvenance.category} ({realIcebergProvenance.crs || 'EPSG:4326'})</div>
              </div>
              <div>
                <span className="text-amber-400 text-[10px] uppercase font-bold block">Spatial Bounding Box</span>
                <span className="text-amber-100 font-bold">Antarctic Sector</span>
                <div className="text-[10px] text-amber-300">[{realIcebergProvenance.bbox?.map(n => n.toFixed(1)).join(', ')}]</div>
              </div>
            </div>
          </div>
        )}

        {/* REAL DATA Error Alert Banner (When Credentials/Server failed) */}
        {environmentalMode === 'REAL' && realIcebergError && (
          <div className="bg-red-950 text-white p-4 rounded-lg border border-red-800 shadow-md font-mono text-xs space-y-2">
            <div className="flex items-center justify-between border-b border-red-800 pb-2">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-400" />
                <span className="font-bold text-red-200 text-sm uppercase tracking-wider">
                  REAL ICEBERG DATA UNAVAILABLE — NO DATA FABRICATION
                </span>
              </div>
              <button
                onClick={() => setEnvironmentalMode('DEMO')}
                className="px-3 py-1 rounded bg-slate-900 hover:bg-slate-800 text-amber-300 border border-slate-700 font-bold text-xs transition"
              >
                Switch to DEMO MODE
              </button>
            </div>
            <div className="space-y-1.5 text-[11px] text-red-200">
              <p className="bg-red-900/60 p-2.5 rounded border border-red-800 text-red-100 font-mono">
                [ICEBERGS] {realIcebergError}
              </p>
              <p className="text-red-400 text-[10px]">
                CRYO NAV Security & Integrity Policy: Invalid or missing remote iceberg observations are rejected. The platform does NOT generate replacement synthetic iceberg markers in REAL mode.
              </p>
            </div>
          </div>
        )}
        {/* Split Section: Left Tracked Catalog (3.5 cols) + Center/Right Interactive Map Workspace (8.5 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-[500px]">
          {/* Left Column: Tracked Target Catalog */}
          <div className="lg:col-span-4 bg-white p-3 rounded-lg border border-slate-200 shadow-xs flex flex-col h-[500px] lg:h-full overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2">
              <span className="text-xs font-bold text-slate-900 uppercase font-mono flex items-center gap-1.5">
                <Target className="w-4 h-4 text-slate-700" /> Tracked Target Catalog
              </span>
              <span className="text-[10px] font-mono text-slate-500">Sorted by Hazard</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {icebergs.map((berg) => {
                const isSelected = selectedBerg?.id === berg.id;
                const cpa = berg.closestApproach;
                const isHighHazard = cpa && (cpa.encounterRisk === 'Critical' || cpa.encounterRisk === 'High');

                return (
                  <div
                    key={berg.id}
                    onClick={() => setSelectedIcebergId(berg.id)}
                    className={`p-2.5 rounded border cursor-pointer transition select-none ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/20'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2.5 h-2.5 rotate-45 shrink-0 ${
                            isHighHazard ? 'bg-red-500 ring-2 ring-red-400/40' : isSelected ? 'bg-amber-400' : 'bg-blue-600'
                          }`}
                        />
                        <span className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                          {berg.name}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.2 rounded border font-semibold ${
                          isSelected
                            ? 'bg-slate-800 text-cyan-300 border-slate-700'
                            : 'bg-white text-slate-700 border-slate-200'
                        }`}
                      >
                        {berg.id}
                      </span>
                    </div>

                    <div
                      className={`text-[11px] font-mono flex items-center justify-between mt-1 ${
                        isSelected ? 'text-slate-300' : 'text-slate-600'
                      }`}
                    >
                      <span>{berg.sizeCategory}</span>
                      <span>L: {berg.estimatedLengthMeters}m • FB: {berg.freeboardMeters}m</span>
                    </div>

                    <div
                      className={`flex items-center justify-between text-[11px] font-mono pt-1.5 mt-1.5 border-t ${
                        isSelected ? 'border-slate-800' : 'border-slate-200'
                      }`}
                    >
                      <span className={`font-bold ${isSelected ? 'text-emerald-300' : 'text-blue-700'}`}>
                        {berg.driftSpeedKnots} kt @ {berg.driftHeadingDeg}°
                      </span>
                      {cpa && (
                        <span
                          className={`font-bold text-[10.5px] ${
                            cpa.encounterRisk === 'Critical'
                              ? isSelected ? 'text-red-300' : 'text-red-700'
                              : cpa.encounterRisk === 'High'
                              ? isSelected ? 'text-amber-300' : 'text-amber-700'
                              : isSelected ? 'text-emerald-300' : 'text-emerald-700'
                          }`}
                        >
                          CPA: {cpa.distanceNm} nm ({cpa.encounterRisk})
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Center/Right Workspace: Interactive Map with embedded Timeline Controller & Legend */}
          <div className="lg:col-span-8 flex flex-col h-[500px] lg:h-full relative overflow-hidden rounded-lg border border-slate-300 bg-slate-200 shadow-md">
            {/* Interactive Leaflet Map in Trajectory Mode */}
            <AntarcticMap mode="trajectory" />

            {/* Top Map Overlay: Time-Horizon Selector Bar */}
            <div className="absolute top-3 left-3 right-3 z-[1000] flex flex-wrap items-center justify-between gap-2 bg-slate-900/95 text-white p-2 rounded-md border border-slate-700 shadow-lg backdrop-blur-xs font-mono text-xs select-none">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider hidden sm:inline mr-1">
                  Forecast Horizon:
                </span>
                <div className="flex items-center gap-1 flex-wrap">
                  {horizons.map((h) => {
                    const isActive = forecastHorizonHours === h.hours;
                    return (
                      <button
                        key={h.hours}
                        onClick={() => {
                          setForecastHorizonHours(h.hours);
                          setIsPlaying(false);
                        }}
                        className={`px-2.5 py-1 rounded text-[11px] font-bold transition flex items-center gap-1 ${
                          isActive
                            ? 'bg-amber-400 text-slate-950 shadow-md ring-2 ring-amber-300/50'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700'
                        }`}
                      >
                        {isActive && <span className="w-1.5 h-1.5 rounded-full bg-slate-950"></span>}
                        {h.text}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Play / Pause Animation Control */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsPlaying((prev) => !prev)}
                  className={`px-3 py-1 rounded text-[11px] font-bold tracking-wider uppercase transition flex items-center gap-1.5 border ${
                    isPlaying
                      ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 border-amber-400 shadow-md'
                      : 'bg-blue-600 hover:bg-blue-500 text-white border-blue-500 shadow-xs'
                  }`}
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-3.5 h-3.5 fill-current" /> Pause
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" /> Play Forecast
                    </>
                  )}
                </button>
                {forecastHorizonHours !== 0 && (
                  <button
                    onClick={() => {
                      setForecastHorizonHours(0);
                      setIsPlaying(false);
                    }}
                    title="Reset to Now (T+0h)"
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Bottom Map Overlay: Trajectory Legend */}
            <div className="absolute bottom-4 left-4 z-[1000] bg-slate-900/90 text-white px-3 py-2 rounded border border-slate-700 text-[10px] font-mono shadow-md backdrop-blur-xs flex flex-wrap items-center gap-3 select-none">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rotate-45 bg-blue-500 border border-white"></span>
                <span>Current (T0)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 border border-slate-900 ring-2 ring-amber-300"></span>
                <span className="font-bold text-amber-300">★ Selected Horizon</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400 border border-white"></span>
                <span>Waypoint</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-0.5 bg-amber-400"></span>
                <span>Predicted Path</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full border border-dashed border-amber-400 bg-amber-400/20"></span>
                <span>Uncertainty Envelope (±NM)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section: Selected Iceberg Scientific Forecast Information & Trajectory Table */}
        {selectedBerg && (
          <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-4 shadow-xs">
            {/* Target Title & Selected Horizon Parameters Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-3 gap-2">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-base font-bold text-slate-900">{selectedBerg.name}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200 font-bold">
                    {selectedBerg.id}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 font-bold">
                    HORIZON: {currentDisplay.horizonLabel}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 font-bold flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3 text-amber-600" />
                    NOT YET OPERATIONALLY VALIDATED
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  Class: {selectedBerg.sizeCategory} • Sensor Source: {selectedBerg.source}
                </p>
              </div>

              <div className="flex items-center gap-2 font-mono text-xs">
                <button
                  onClick={() => setForecastHorizonHours(forecastHorizonHours === 24 ? 48 : 24)}
                  className="px-3 py-1.5 rounded-md bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold border border-amber-400 shadow-xs transition flex items-center gap-1.5"
                >
                  <Target className="w-3.5 h-3.5" />
                  PREDICT TRAJECTORY (T+{forecastHorizonHours || 24}h)
                </button>
                <div className="pl-3 border-l border-slate-200 text-right">
                  <span className="text-slate-500 text-[10px]">Sensor Confidence</span>
                  <div className="text-sm font-bold text-blue-700">{selectedBerg.confidence}%</div>
                </div>
              </div>
            </div>

            {/* Scientific Forecast Model & TRAJECTORY CONFIDENCE Metadata Banner (Phase 4) */}
            <div className="bg-slate-950 text-white p-3.5 rounded-lg border border-slate-800 font-mono text-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-blue-500 text-slate-950 font-bold text-[10px] uppercase">
                    MODEL METADATA
                  </span>
                  <span className="font-bold text-cyan-300 text-sm">
                    {selectedBerg.forecastResult?.metadata?.name || 'Baseline 2D Kinematic Iceberg Drift Model'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold border border-slate-700 px-1.5 py-0.5 rounded">
                    {selectedBerg.forecastResult?.metadata?.version || (environmentalMode === 'REAL' ? 'v3.5-REAL-KINEMATIC' : 'v3.1-BASELINE-DEMO')}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-300">
                    VALIDATION: <strong className="text-amber-300 px-1.5 py-0.5 rounded bg-amber-950 border border-amber-800">{selectedBerg.forecastResult?.metadata?.validationStatus || 'NOT YET OPERATIONALLY VALIDATED'}</strong>
                  </span>
                </div>
              </div>

              {/* TRAJECTORY CONFIDENCE BREAKDOWN PANEL (Phase 4) */}
              <div className="p-3 rounded bg-slate-900 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5" /> TRAJECTORY CONFIDENCE
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                    decisionConfidence.overallLevel === 'HIGH' ? 'bg-emerald-900 text-emerald-300 border border-emerald-700' :
                    decisionConfidence.overallLevel === 'MEDIUM' ? 'bg-sky-900 text-sky-300 border border-sky-700' :
                    decisionConfidence.overallLevel === 'LOW' ? 'bg-amber-900 text-amber-300 border border-amber-700' :
                    'bg-red-900 text-red-300 border border-red-700'
                  }`}>
                    LEVEL: {decisionConfidence.overallLevel} ({decisionConfidence.confidenceScore}/100)
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[10.5px]">
                  <div className="bg-slate-950 p-2 rounded border border-slate-800">
                    <span className="text-slate-400 text-[9px] uppercase font-bold block">OBSERVATION FRESHNESS</span>
                    <span className="text-emerald-300 font-bold">{environmentalMode === 'REAL' ? 'USNIC Real Catalog' : 'Synthetic Observation'}</span>
                    <div className="text-[9.5px] text-slate-400">{unifiedEnvironment.sources.icebergs.temporalStatus}</div>
                  </div>
                  <div className="bg-slate-950 p-2 rounded border border-slate-800">
                    <span className="text-slate-400 text-[9px] uppercase font-bold block">OCEAN FORCING</span>
                    <span className="text-cyan-300 font-bold">{unifiedEnvironment.sources.ocean.quality}</span>
                    <div className="text-[9.5px] text-slate-400">Copernicus Marine NEMO</div>
                  </div>
                  <div className="bg-slate-950 p-2 rounded border border-slate-800">
                    <span className="text-slate-400 text-[9px] uppercase font-bold block">WEATHER FORCING</span>
                    <span className="text-cyan-300 font-bold">{unifiedEnvironment.sources.weather.quality}</span>
                    <div className="text-[9.5px] text-slate-400">ECMWF IFS Global</div>
                  </div>
                  <div className="bg-slate-950 p-2 rounded border border-slate-800">
                    <span className="text-slate-400 text-[9px] uppercase font-bold block">FORECAST HORIZON</span>
                    <span className="text-amber-300 font-bold">+{forecastHorizonHours} h</span>
                    <div className="text-[9.5px] text-slate-400">Integration Span</div>
                  </div>
                  <div className="bg-slate-950 p-2 rounded border border-slate-800">
                    <span className="text-slate-400 text-[9px] uppercase font-bold block">MODEL UNCERTAINTY</span>
                    <span className="text-amber-300 font-bold">±{currentDisplay.uncertaintyRadiusNm.toFixed(1)} nm</span>
                    <div className="text-[9.5px] text-slate-400">Model-Derived Envelope</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-0.5">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">OCEAN FORCING</span>
                  <span className="text-cyan-300 font-bold">{selectedBerg.forecastResult?.metadata?.oceanForcingType || 'Copernicus surface current'}</span>
                  <div className="text-[10px] text-slate-400">2D surface velocity vectors</div>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">WIND FORCING</span>
                  <span className="text-cyan-300 font-bold">{selectedBerg.forecastResult?.metadata?.windForcingType || 'ECMWF IFS 10 m wind'}</span>
                  <div className="text-[10px] text-slate-400">10 m atmospheric forecast</div>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">WINDAGE PARAMETER</span>
                  <span className="text-amber-300 font-bold">{selectedBerg.forecastResult?.metadata?.windageCoefficientUsed ?? 0.025} baseline assumption</span>
                  <div className="text-[10px] text-slate-400">MODEL ASSUMPTION (uncalibrated)</div>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">UNCERTAINTY</span>
                  <span className="text-amber-300 font-bold">{selectedBerg.forecastResult?.metadata?.uncertaintyType || 'MODEL-DERIVED'}</span>
                  <div className="text-[10px] text-slate-400">Expanding error radius: σ(t) = σ₀ + 0.65 · t¹·¹⁵</div>
                </div>
              </div>

              <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800/80 leading-normal italic">
                Notice: This coefficient is a configurable baseline assumption used by the CRYO NAV kinematic demonstration model. It has not yet been calibrated against USNIC Antarctic iceberg tracks and must not be interpreted as a universally valid Antarctic iceberg windage coefficient.
              </div>
            </div>

            {/* Failure or Degraded Forecast Alert Banner */}
            {selectedBerg.forecastResult && selectedBerg.forecastResult.status !== 'VALID' && (
              <div className="bg-amber-950 text-white p-3 rounded-lg border border-amber-800 font-mono text-xs space-y-1.5">
                <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  <span>TRAJECTORY FORECAST STATUS: {selectedBerg.forecastResult.status}</span>
                </div>
                {selectedBerg.forecastResult.statusReason && (
                  <p className="text-amber-200 text-[11px] bg-amber-900/40 p-2 rounded border border-amber-800">
                    [REASON] {selectedBerg.forecastResult.statusReason}
                  </p>
                )}
                {selectedBerg.forecastResult.warnings && selectedBerg.forecastResult.warnings.length > 0 && (
                  <div className="text-[10px] text-amber-400 space-y-0.5">
                    {selectedBerg.forecastResult.warnings.map((w, idx) => (
                      <div key={idx}>• {w}</div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Modeling Values Grid at Selected Forecast Horizon */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
              <div className="bg-slate-50 p-2.5 rounded border border-slate-200 shadow-xs">
                <div className="text-[10px] text-slate-500 font-semibold uppercase">
                  {forecastHorizonHours === 0 ? 'Current Position (T0)' : `Predicted Position (${currentDisplay.horizonLabel})`}
                </div>
                <div className="text-slate-900 font-bold mt-0.5 text-sm">
                  {Math.abs(currentDisplay.lat).toFixed(3)}°S
                </div>
                <div className="text-slate-700 text-xs font-semibold">
                  {Math.abs(currentDisplay.lon).toFixed(3)}°W
                </div>
              </div>

              <div className="bg-slate-50 p-2.5 rounded border border-slate-200 shadow-xs">
                <div className="text-[10px] text-slate-500 font-semibold uppercase">Drift Kinematics</div>
                <div className="text-emerald-700 font-bold mt-0.5 text-sm">
                  {currentDisplay.driftSpeedKnots} kts
                </div>
                <div className="text-slate-600 text-xs">Heading: {currentDisplay.driftHeadingDeg}°</div>
              </div>

              <div className="bg-slate-50 p-2.5 rounded border border-slate-200 shadow-xs">
                <div className="text-[10px] text-slate-500 font-semibold uppercase">Dimensions / Freeboard</div>
                <div className="text-slate-900 font-bold mt-0.5 text-sm">
                  {selectedBerg.estimatedLengthMeters} m
                </div>
                <div className="text-slate-600 text-xs">Freeboard: {selectedBerg.freeboardMeters}m</div>
              </div>

              <div className="bg-slate-50 p-2.5 rounded border border-slate-200 shadow-xs">
                <div className="text-[10px] text-slate-500 font-semibold uppercase">Prediction Uncertainty</div>
                <div className="text-amber-600 font-bold mt-0.5 text-sm">
                  ±{currentDisplay.uncertaintyRadiusNm} nm
                </div>
                <div className="text-slate-500 text-[10px]">MODEL-DERIVED ({currentDisplay.horizonLabel})</div>
              </div>
            </div>

            {/* Forecast Horizon Progression Table (+6h to +72h) */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-xs font-mono text-slate-900 font-bold">
                <span className="flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-slate-700" /> Physical Kinematic Trajectory Progression Table
                </span>
                <span className="text-[10px] text-slate-500">Explicit Timestep Integration (dt = 1.0 h)</span>
              </div>

              <div className="divide-y divide-slate-200 text-xs font-mono border border-slate-200 rounded-md bg-white overflow-hidden shadow-xs">
                <div className="grid grid-cols-6 p-2 text-[10px] text-slate-600 font-bold bg-slate-100 uppercase">
                  <div>Horizon</div>
                  <div>Pred Lat</div>
                  <div>Pred Lon</div>
                  <div>Ocean Current</div>
                  <div>Drift Speed</div>
                  <div>Uncertainty Radius</div>
                </div>

                {/* Row for T+0h */}
                <div
                  onClick={() => setForecastHorizonHours(0)}
                  className={`grid grid-cols-6 p-2.5 cursor-pointer transition ${
                    forecastHorizonHours === 0 ? 'bg-amber-50 font-bold text-amber-950 border-l-4 border-amber-500' : 'hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <div className="text-blue-700 font-bold">Now (T+0h)</div>
                  <div>{Math.abs(selectedBerg.lat).toFixed(3)}°S</div>
                  <div>{Math.abs(selectedBerg.lon).toFixed(3)}°W</div>
                  <div className="text-cyan-700">Observed</div>
                  <div>{selectedBerg.driftSpeedKnots} kt</div>
                  <div className="text-emerald-700 font-bold">±{selectedBerg.uncertaintyRadiusNm} nm</div>
                </div>

                {selectedBerg.predictedTrajectory?.map((pt) => {
                  const isSelectedRow = forecastHorizonHours === pt.hours;
                  return (
                    <div
                      key={pt.horizon}
                      onClick={() => setForecastHorizonHours(pt.hours)}
                      className={`grid grid-cols-6 p-2.5 cursor-pointer transition ${
                        isSelectedRow ? 'bg-amber-50 font-bold text-amber-950 border-l-4 border-amber-500' : 'hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      <div className="text-blue-700 font-bold">{pt.horizon}</div>
                      <div>{Math.abs(pt.lat).toFixed(3)}°S</div>
                      <div>{Math.abs(pt.lon).toFixed(3)}°W</div>
                      <div className="text-cyan-700">
                        {pt.oceanCurrentSpeedKnots !== undefined ? `${pt.oceanCurrentSpeedKnots} kt @ ${pt.oceanCurrentHeadingDeg}°` : 'N/A'}
                      </div>
                      <div>{pt.driftSpeedKnots ?? selectedBerg.driftSpeedKnots} kt</div>
                      <div
                        className={`font-bold ${
                          pt.uncertaintyRadiusNm > 5.0
                            ? 'text-amber-700'
                            : pt.uncertaintyRadiusNm > 2.0
                            ? 'text-blue-700'
                            : 'text-emerald-700'
                        }`}
                      >
                        ±{pt.uncertaintyRadiusNm} nm
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Phase 5 — Trajectory What-If Analysis Panel */}
            <IcebergTrajectoryWhatIfSection selectedBerg={selectedBerg} />

            {/* Scientific Disclaimer Note */}
            <div className="text-[11px] text-slate-600 bg-slate-50 p-3 rounded border border-slate-200 leading-relaxed font-sans shadow-xs">
              <div className="font-bold text-slate-900 mb-1 flex items-center gap-1.5 font-mono text-xs">
                <Info className="w-3.5 h-3.5 text-slate-700" /> Physical Kinematic Trajectory Specification & Scientific Honesty Statement
              </div>
              CRYO NAV uses real Antarctic observations (USNIC) and environmental forcing fields (Copernicus Marine hydrodynamics + ECMWF IFS wind vectors) as inputs to a transparent baseline kinematic drift model (V_berg = V_ocean + 0.025 * V_wind). Expanding uncertainty envelopes represent model-derived numerical diffusion over time. The resulting forecast is explicitly marked as <strong>NOT YET OPERATIONALLY VALIDATED</strong> and must not be used for primary vessel navigation.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const IcebergTrajectoryWhatIfSection: React.FC<{ selectedBerg: any }> = ({ selectedBerg }) => {
  const { currents, weather, environmentalMode } = useApp();
  const [driftPerturbation, setDriftPerturbation] = useState<number>(20);

  const whatIfResult = React.useMemo(() => {
    if (!selectedBerg) return null;
    return runIcebergTrajectoryWhatIf(selectedBerg, driftPerturbation, currents, weather, environmentalMode);
  }, [selectedBerg, driftPerturbation, currents, weather, environmentalMode]);

  if (!whatIfResult || !selectedBerg) return null;

  return (
    <div className="bg-slate-900 text-white p-3.5 rounded-lg border border-slate-800 font-mono text-xs space-y-2.5 shadow-md">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-cyan-400" />
          <span className="font-bold uppercase tracking-wider text-slate-100">TRAJECTORY WHAT-IF ANALYSIS</span>
        </div>
        <span className="text-[9px] px-2 py-0.5 rounded font-bold bg-cyan-950 text-cyan-400 border border-cyan-800">
          Phase 5 What-If
        </span>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-[10px] text-slate-400 font-bold uppercase">Select Drift Perturbation:</span>
        <div className="flex gap-2 text-xs">
          {[
            { label: '+20% Drift', val: 20 },
            { label: '-20% Drift', val: -20 },
            { label: '+50% Drift', val: 50 },
          ].map((item) => (
            <button
              key={item.val}
              onClick={() => setDriftPerturbation(item.val)}
              className={`px-2.5 py-1 rounded border text-[11px] font-bold transition ${
                driftPerturbation === item.val
                  ? 'bg-cyan-600 text-white border-cyan-400'
                  : 'bg-slate-950 text-slate-300 border-slate-700 hover:bg-slate-800'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-[11px]">
        <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
          <span className="text-[9px] text-slate-400 block uppercase">Baseline Drift Velocity</span>
          <span className="font-bold text-white">{selectedBerg.driftSpeedKnots} knots</span>
          <div className="text-[10px] text-slate-400">Heading: {selectedBerg.driftHeadingDeg}°</div>
        </div>

        <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
          <span className="text-[9px] text-slate-400 block uppercase">Perturbed Drift Velocity</span>
          <span className="font-bold text-cyan-400">
            {Number((selectedBerg.driftSpeedKnots * (1 + driftPerturbation / 100)).toFixed(2))} knots
          </span>
          <div className="text-[10px] text-slate-400">
            Displacement Δ: <strong className="text-cyan-300">+{whatIfResult.closestApproachDeltaNm} nm</strong>
          </div>
        </div>

        <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
          <span className="text-[9px] text-slate-400 block uppercase">Transit Corridor Impact</span>
          <span
            className={`font-bold block ${
              whatIfResult.closestApproachDeltaNm > 3.0 ? 'text-amber-400' : 'text-emerald-400'
            }`}
          >
            {whatIfResult.routeImpactDescription}
          </span>
        </div>
      </div>

      <div className="p-2 rounded bg-amber-950/60 border border-amber-800/80 text-[10px] text-amber-300 font-sans">
        <strong>COUNTERFACTUAL SCENARIO — NOT OBSERVED DATA:</strong> This perturbation tests iceberg drift rate variance using existing kinematic forcing equations without replacing real USNIC target baseline data.
      </div>
    </div>
  );
};

