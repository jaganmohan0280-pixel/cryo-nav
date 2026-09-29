import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { AntarcticMap } from '../components/Map/AntarcticMap';
import { forecastSeaIceField } from '../services/seaIceModel';
import {
  Layers,
  Info,
  Play,
  Pause,
  RotateCcw,
  Compass,
  Clock,
  Search,
  Database,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Radio,
  FileText,
  ShieldAlert,
} from 'lucide-react';

export const SeaIceView: React.FC = () => {
  const {
    seaIceCells,
    forecastHorizonHours,
    setForecastHorizonHours,
    weather,
    selectedVessel,
    environmentalMode,
    setEnvironmentalMode,
    realSeaIceProvenance,
    realSeaIceError,
    isFetchingRealSeaIce,
    fetchRealSeaIceData,
    realOceanCurrentCells,
    realOceanCurrentProvenance,
    realOceanCurrentError,
    isFetchingRealOceanCurrents,
    fetchRealOceanCurrentsData,
    realWeatherProvenance,
    realWeatherError,
    isFetchingRealWeather,
    fetchRealWeatherData,
    unifiedEnvironment,
    decisionConfidence,
  } = useApp();

  const [selectedCellId, setSelectedCellId] = useState<string>('ice-cell-0');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const horizons = [
    { label: 'Now (T+0)', hours: 0, text: 'T+0' },
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

  const selectedCell = seaIceCells.find((c) => c.id === selectedCellId) || seaIceCells[0];

  // Compute forecast timeline for selected cell across 0h, 6h, 12h, 24h, 48h, 72h
  const cellTimeline = [0, 6, 12, 24, 48, 72].map((h) => {
    const forecastedField = forecastSeaIceField(seaIceCells, weather, h, 1.0);
    const targetCell = forecastedField.find((c) => c.id === selectedCell?.id) || selectedCell;
    return {
      horizon: h === 0 ? 'T+0' : `+${h}h`,
      hours: h,
      concentrationPercent: targetCell.concentrationPercent,
      stage: targetCell.stage,
      uncertainty: targetCell.uncertainty,
      confidence: targetCell.confidence,
    };
  });

  const filteredCells = seaIceCells.filter(
    (c) =>
      c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.stage.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `${c.lat}`.includes(searchQuery) ||
      `${c.lon}`.includes(searchQuery)
  );

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-[#F5F7F7] font-sans">
      {/* Top Header & Overview */}
      <div className="px-6 py-4 bg-white border-b border-[#DCE7E7] shrink-0 shadow-xs">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-[#075563] flex items-center gap-2.5">
              <Layers className="w-6 h-6 text-[#2BB9BD]" />
              Sea-Ice Concentration & Advection Forecasting
            </h1>
            <p className="text-sm text-[#63777B] mt-1 font-normal">
              Copernicus Marine observations and kinetic advection model
            </p>
          </div>

          {/* Environmental Data Mode Toggle (DEMO vs REAL) */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center bg-[#F5F7F7] p-1 rounded-lg border border-[#DCE7E7]">
              <button
                onClick={() => setEnvironmentalMode('DEMO')}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition flex items-center gap-1.5 ${
                  environmentalMode === 'DEMO'
                    ? 'bg-[#2BB9BD] text-white shadow-xs'
                    : 'text-[#63777B] hover:text-[#18343A]'
                }`}
              >
                <Radio className="w-3.5 h-3.5 text-white" />
                Demo Mode
              </button>
              <button
                onClick={() => setEnvironmentalMode('REAL')}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition flex items-center gap-1.5 ${
                  environmentalMode === 'REAL'
                    ? 'bg-[#075563] text-white shadow-xs'
                    : 'text-[#63777B] hover:text-[#18343A]'
                }`}
              >
                <Database className="w-3.5 h-3.5 text-white" />
                Real Data
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="px-3 py-1.5 rounded-lg bg-white border border-[#DCE7E7] text-[#63777B] font-medium">
                Grid cells: <strong className="text-[#18343A]">{seaIceCells.length}</strong>
              </span>
              <span className="px-3 py-1.5 rounded-lg bg-[#E8F8F6] border border-[#DCE7E7] text-[#075563] font-semibold flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#2BB9BD]" />
                Horizon: <strong className="text-[#075563]">{forecastHorizonHours === 0 ? 'T+0' : `+${forecastHorizonHours}h`}</strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Workspace */}
      <div className="p-6 space-y-6 max-w-[1400px] w-full mx-auto flex-1 flex flex-col min-h-0">
        {/* REAL DATA Provenance Card */}
        {environmentalMode === 'REAL' && realSeaIceProvenance && (
          <div className="bg-white text-[#252B30] p-3.5 rounded-[8px] border border-[#DCDAD4] shadow-subtle font-mono text-xs space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E8E6E1] pb-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-[4px] bg-[#EDF2ED] text-[#58725D] font-bold text-[10px] tracking-wider uppercase border border-[#58725D]/30">
                  REAL OBSERVATION PIPELINE
                </span>
                <span className="font-bold text-[#252B30] text-sm flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#58725D]" />
                  {realSeaIceProvenance.source}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[#626A70]">
                  Freshness: <strong className="text-[#252B30] px-1.5 py-0.5 rounded bg-[#EDF2ED] border border-[#DCDAD4]">{realSeaIceProvenance.freshnessState}</strong>
                </span>
                <button
                  onClick={() => fetchRealSeaIceData()}
                  disabled={isFetchingRealSeaIce}
                  className="px-2.5 py-1 rounded-[6px] bg-[#3D5665] hover:bg-[#304652] text-white font-bold text-[11px] transition flex items-center gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${isFetchingRealSeaIce ? 'animate-spin' : ''}`} />
                  Refresh Real Data
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1">
              <div className="bg-[#F5F3EE] p-2 rounded-[6px] border border-[#E8E6E1]">
                <span className="text-[#626A70] text-[10px] uppercase font-bold block">Provider & Product</span>
                <span className="text-[#252B30] font-bold">{realSeaIceProvenance.provider}</span>
                <div className="text-[10px] text-[#8A9094] truncate">{realSeaIceProvenance.datasetId}</div>
              </div>
              <div className="bg-[#F5F3EE] p-2 rounded-[6px] border border-[#E8E6E1]">
                <span className="text-[#626A70] text-[10px] uppercase font-bold block">Observation Time</span>
                <span className="text-[#252B30] font-bold">{new Date(realSeaIceProvenance.observationTime).toUTCString()}</span>
                <div className="text-[10px] text-[#8A9094]">Data Age: {realSeaIceProvenance.dataAgeHours} hours</div>
              </div>
              <div className="bg-[#F5F3EE] p-2 rounded-[6px] border border-[#E8E6E1]">
                <span className="text-[#626A70] text-[10px] uppercase font-bold block">Grid Resolution & Level</span>
                <span className="text-[#252B30] font-bold">10 km L4 Grid Analysis</span>
                <div className="text-[10px] text-[#8A9094]">{realSeaIceProvenance.crs || 'EPSG:4326'}</div>
              </div>
              <div className="bg-[#F5F3EE] p-2 rounded-[6px] border border-[#E8E6E1]">
                <span className="text-[#626A70] text-[10px] uppercase font-bold block">Spatial Coverage BBox</span>
                <span className="text-[#252B30] font-bold">Antarctic Sector</span>
                <div className="text-[10px] text-[#8A9094]">[{realSeaIceProvenance.bbox?.map(n => n.toFixed(1)).join(', ')}]</div>
              </div>
            </div>
          </div>
        )}

        {/* REAL OCEAN CURRENT DATA Provenance Card */}
        {environmentalMode === 'REAL' && realOceanCurrentProvenance && (
          <div className="bg-white text-[#252B30] p-3.5 rounded-[8px] border border-[#DCDAD4] shadow-subtle font-mono text-xs space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E8E6E1] pb-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-[4px] bg-[#EDF1F3] text-[#5C7280] font-bold text-[10px] tracking-wider uppercase border border-[#5C7280]/30">
                  REAL OCEAN HYDRODYNAMICS PIPELINE
                </span>
                <span className="font-bold text-[#252B30] text-sm flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#5C7280]" />
                  {realOceanCurrentProvenance.source}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[#626A70]">
                  Freshness: <strong className="text-[#252B30] px-1.5 py-0.5 rounded bg-[#EDF1F3] border border-[#DCDAD4]">{realOceanCurrentProvenance.freshnessState}</strong>
                </span>
                <button
                  onClick={() => fetchRealOceanCurrentsData()}
                  disabled={isFetchingRealOceanCurrents}
                  className="px-2.5 py-1 rounded-[6px] bg-[#3D5665] hover:bg-[#304652] text-white font-bold text-[11px] transition flex items-center gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${isFetchingRealOceanCurrents ? 'animate-spin' : ''}`} />
                  Refresh Ocean Currents
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1">
              <div className="bg-[#F5F3EE] p-2 rounded-[6px] border border-[#E8E6E1]">
                <span className="text-[#626A70] text-[10px] uppercase font-bold block">Provider & Model</span>
                <span className="text-[#252B30] font-bold">{realOceanCurrentProvenance.provider}</span>
                <div className="text-[10px] text-[#8A9094] truncate">{realOceanCurrentProvenance.datasetId}</div>
              </div>
              <div className="bg-[#F5F3EE] p-2 rounded-[6px] border border-[#E8E6E1]">
                <span className="text-[#626A70] text-[10px] uppercase font-bold block">Valid Time & Depth</span>
                <span className="text-[#252B30] font-bold">{new Date(realOceanCurrentProvenance.observationTime).toUTCString()}</span>
                <div className="text-[10px] text-[#8A9094]">Level: Surface (0.49m) • Data Age: {realOceanCurrentProvenance.dataAgeHours}h</div>
              </div>
              <div className="bg-[#F5F3EE] p-2 rounded-[6px] border border-[#E8E6E1]">
                <span className="text-[#626A70] text-[10px] uppercase font-bold block">Grid Resolution & Category</span>
                <span className="text-[#252B30] font-bold">8 km (1/12° NEMO Hydrodynamic)</span>
                <div className="text-[10px] text-[#8A9094]">Category: {realOceanCurrentProvenance.category} ({realOceanCurrentProvenance.crs || 'EPSG:4326'})</div>
              </div>
              <div className="bg-[#F5F3EE] p-2 rounded-[6px] border border-[#E8E6E1]">
                <span className="text-[#626A70] text-[10px] uppercase font-bold block">Spatial Coverage BBox</span>
                <span className="text-[#252B30] font-bold">Antarctic Peninsula Sector</span>
                <div className="text-[10px] text-[#8A9094]">[{realOceanCurrentProvenance.bbox?.map(n => n.toFixed(1)).join(', ')}]</div>
              </div>
            </div>
          </div>
        )}

        {/* REAL WEATHER FORECAST Provenance Card */}
        {environmentalMode === 'REAL' && realWeatherProvenance && (
          <div className="bg-white text-[#252B30] p-3.5 rounded-[8px] border border-[#DCDAD4] shadow-subtle font-mono text-xs space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E8E6E1] pb-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-[4px] bg-[#F5F0E5] text-[#9A7945] font-bold text-[10px] tracking-wider uppercase border border-[#9A7945]/30">
                  REAL WEATHER FORECAST PIPELINE
                </span>
                <span className="font-bold text-[#252B30] text-sm flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#9A7945]" />
                  {realWeatherProvenance.source}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[#626A70]">
                  Freshness: <strong className="text-[#252B30] px-1.5 py-0.5 rounded bg-[#F5F0E5] border border-[#DCDAD4]">{realWeatherProvenance.freshnessState}</strong>
                </span>
                <button
                  onClick={() => fetchRealWeatherData()}
                  disabled={isFetchingRealWeather}
                  className="px-2.5 py-1 rounded-[6px] bg-[#3D5665] hover:bg-[#304652] text-white font-bold text-[11px] transition flex items-center gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${isFetchingRealWeather ? 'animate-spin' : ''}`} />
                  Refresh Weather Data
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1">
              <div className="bg-[#F5F3EE] p-2 rounded-[6px] border border-[#E8E6E1]">
                <span className="text-[#626A70] text-[10px] uppercase font-bold block">Access & Model</span>
                <span className="text-[#252B30] font-bold">{realWeatherProvenance.provider}</span>
                <div className="text-[10px] text-[#8A9094] truncate">{realWeatherProvenance.datasetId}</div>
              </div>
              <div className="bg-[#F5F3EE] p-2 rounded-[6px] border border-[#E8E6E1]">
                <span className="text-[#626A70] text-[10px] uppercase font-bold block">Forecast Valid Time</span>
                <span className="text-[#252B30] font-bold">{new Date(realWeatherProvenance.validTime).toUTCString()}</span>
                <div className="text-[10px] text-[#8A9094]">Category: {realWeatherProvenance.category} (REAL FORECAST)</div>
              </div>
              <div className="bg-[#F5F3EE] p-2 rounded-[6px] border border-[#E8E6E1]">
                <span className="text-[#626A70] text-[10px] uppercase font-bold block">Grid Resolution & Level</span>
                <span className="text-[#252B30] font-bold">25 km (0.25° ECMWF IFS Model)</span>
                <div className="text-[10px] text-amber-300">Init Run: {new Date(realWeatherProvenance.observationTime).toLocaleTimeString()}</div>
              </div>
              <div>
                <span className="text-amber-400 text-[10px] uppercase font-bold block">Spatial Coverage BBox</span>
                <span className="text-amber-100 font-bold">Antarctic Peninsula Sector</span>
                <div className="text-[10px] text-amber-300">[{realWeatherProvenance.bbox?.map(n => n.toFixed(1)).join(', ')}]</div>
              </div>
            </div>
          </div>
        )}

        {/* REAL DATA Error Alert Banner (When Credentials missing or Auth/Server failed) */}
        {environmentalMode === 'REAL' && (realSeaIceError || realOceanCurrentError || realWeatherError) && (
          <div className="bg-[#F5EAEA] text-[#252B30] p-4 rounded-lg border border-[#A65B55]/40 shadow-xs font-mono text-xs space-y-2">
            <div className="flex items-center justify-between border-b border-[#A65B55]/20 pb-2">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-[#A65B55]" />
                <span className="font-bold text-[#A65B55] text-sm uppercase tracking-wider">
                  REAL ENVIRONMENTAL DATA UNAVAILABLE — NO DATA FABRICATION
                </span>
              </div>
              <button
                onClick={() => setEnvironmentalMode('DEMO')}
                className="px-3 py-1 rounded bg-white hover:bg-[#F5F3EE] text-[#3D5665] border border-[#DCDAD4] font-bold text-xs transition shadow-xs"
              >
                Switch to DEMO MODE
              </button>
            </div>
            <div className="space-y-1.5 text-[11px] text-[#252B30]">
              {realSeaIceError && (
                <p className="bg-white/80 p-2.5 rounded border border-[#A65B55]/30 text-[#A65B55] font-mono">
                  [SEA ICE] {realSeaIceError}
                </p>
              )}
              {realOceanCurrentError && (
                <p className="bg-white/80 p-2.5 rounded border border-[#A65B55]/30 text-[#A65B55] font-mono">
                  [OCEAN CURRENTS] {realOceanCurrentError}
                </p>
              )}
              {realWeatherError && (
                <p className="bg-white/80 p-2.5 rounded border border-[#A65B55]/30 text-[#A65B55] font-mono">
                  [WEATHER FORECAST] {realWeatherError}
                </p>
              )}
              <p className="text-[#626A70] text-[10px]">
                CRYO NAV Security & Integrity Policy: Invalid or missing remote environmental observations/forecasts are rejected. The platform does NOT generate replacement synthetic observations or forecasts in REAL mode.
              </p>
            </div>
          </div>
        )}

        {/* Phase 3A — Environmental Data Status */}
        {unifiedEnvironment && (
          <div className="bg-[#FCFBF7] text-[#263238] p-5 rounded-xl border border-[#D4D1C7] shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E7E4DA] pb-3">
              <div className="flex items-center gap-2.5">
                <Database className="w-5 h-5 text-[#315E62]" />
                <h2 className="text-base sm:text-lg font-semibold text-[#263238]">
                  Environmental Data Status
                </h2>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-[#596267] font-medium">Overall quality:</span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                      unifiedEnvironment.overallQuality === 'VALID'
                        ? 'bg-[#EAF0EB] text-[#52715B] border-[#52715B]/30'
                        : unifiedEnvironment.overallQuality === 'PARTIAL'
                        ? 'bg-[#F3EEE2] text-[#9A7945] border-[#9A7945]/30'
                        : 'bg-[#F3E5E3] text-[#A45750] border-[#A45750]/30'
                    }`}
                  >
                    {unifiedEnvironment.overallQuality}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-[#596267] font-medium">Alignment:</span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                      unifiedEnvironment.alignmentStatus === 'ALIGNED'
                        ? 'bg-[#E5ECEE] text-[#526F78] border-[#526F78]/30'
                        : 'bg-[#F3EEE2] text-[#9A7945] border-[#9A7945]/30'
                    }`}
                  >
                    {unifiedEnvironment.alignmentStatus}
                  </span>
                </div>
              </div>
            </div>

            {/* Analysis Reference Time */}
            <div className="flex items-center justify-between text-xs bg-[#F3F0E8] p-3 rounded-lg border border-[#D4D1C7]">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#315E62]" />
                <span className="text-[#596267] font-medium">Analysis reference time:</span>
                <span className="text-[#263238] font-semibold">{new Date(unifiedEnvironment.analysisTime).toUTCString()}</span>
              </div>
              <span className="text-xs text-[#596267]">
                Mode: <strong className="text-[#315E62]">{unifiedEnvironment.mode}</strong>
              </span>
            </div>

            {/* 4 Source Alignment Summary Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs pt-1">
              {/* Sea Ice Card */}
              <div className="bg-[#F3F0E8] p-4 rounded-xl border border-[#D4D1C7] space-y-2.5">
                <div className="flex items-center justify-between border-b border-[#D4D1C7] pb-2">
                  <span className="font-semibold text-sm text-[#263238]">Sea Ice</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-md border ${
                    unifiedEnvironment.sources.seaIce.quality === 'VALID' ? 'bg-[#EAF0EB] text-[#52715B] border-[#52715B]/30' : 'bg-[#F3E5E3] text-[#A45750] border-[#A45750]/30'
                  }`}>
                    {unifiedEnvironment.sources.seaIce.quality}
                  </span>
                </div>
                <div className="text-sm font-semibold text-[#315E62]">{unifiedEnvironment.sources.seaIce.sourceName}</div>
                <div className="space-y-1.5 text-xs text-[#364148]">
                  <div className="flex justify-between"><span className="text-[#596267] font-medium">Status</span><span className="font-semibold text-[#263238]">{unifiedEnvironment.sources.seaIce.temporalStatus}</span></div>
                  <div className="flex justify-between"><span className="text-[#596267] font-medium">Valid time</span><span className="text-[#263238]">{unifiedEnvironment.sources.seaIce.validTime ? new Date(unifiedEnvironment.sources.seaIce.validTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}</span></div>
                  <div className="flex justify-between"><span className="text-[#596267] font-medium">Resolution</span><span className="text-[#263238]">{unifiedEnvironment.sources.seaIce.sourceResolution}</span></div>
                  <div className="flex justify-between"><span className="text-[#596267] font-medium">Coverage</span><span className="text-[#263238]">{unifiedEnvironment.sources.seaIce.coverage}</span></div>
                </div>
              </div>

              {/* Ocean Currents Card */}
              <div className="bg-[#F3F0E8] p-4 rounded-xl border border-[#D4D1C7] space-y-2.5">
                <div className="flex items-center justify-between border-b border-[#D4D1C7] pb-2">
                  <span className="font-semibold text-sm text-[#263238]">Ocean Currents</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-md border ${
                    unifiedEnvironment.sources.ocean.quality === 'VALID' ? 'bg-[#EAF0EB] text-[#52715B] border-[#52715B]/30' : 'bg-[#F3E5E3] text-[#A45750] border-[#A45750]/30'
                  }`}>
                    {unifiedEnvironment.sources.ocean.quality}
                  </span>
                </div>
                <div className="text-sm font-semibold text-[#315E62]">{unifiedEnvironment.sources.ocean.sourceName}</div>
                <div className="space-y-1.5 text-xs text-[#364148]">
                  <div className="flex justify-between"><span className="text-[#596267] font-medium">Status</span><span className="font-semibold text-[#263238]">{unifiedEnvironment.sources.ocean.temporalStatus}</span></div>
                  <div className="flex justify-between"><span className="text-[#596267] font-medium">Valid time</span><span className="text-[#263238]">{unifiedEnvironment.sources.ocean.validTime ? new Date(unifiedEnvironment.sources.ocean.validTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}</span></div>
                  <div className="flex justify-between"><span className="text-[#596267] font-medium">Resolution</span><span className="text-[#263238]">{unifiedEnvironment.sources.ocean.sourceResolution}</span></div>
                  <div className="flex justify-between"><span className="text-[#596267] font-medium">Coverage</span><span className="text-[#263238]">{unifiedEnvironment.sources.ocean.coverage}</span></div>
                </div>
              </div>

              {/* Iceberg Catalog Card */}
              <div className="bg-[#F3F0E8] p-4 rounded-xl border border-[#D4D1C7] space-y-2.5">
                <div className="flex items-center justify-between border-b border-[#D4D1C7] pb-2">
                  <span className="font-semibold text-sm text-[#263238]">Iceberg Catalog</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-md border ${
                    unifiedEnvironment.sources.icebergs.quality === 'VALID' ? 'bg-[#EAF0EB] text-[#52715B] border-[#52715B]/30' : 'bg-[#F3E5E3] text-[#A45750] border-[#A45750]/30'
                  }`}>
                    {unifiedEnvironment.sources.icebergs.quality}
                  </span>
                </div>
                <div className="text-sm font-semibold text-[#315E62]">{unifiedEnvironment.sources.icebergs.sourceName}</div>
                <div className="space-y-1.5 text-xs text-[#364148]">
                  <div className="flex justify-between"><span className="text-[#596267] font-medium">Status</span><span className="font-semibold text-[#263238]">{unifiedEnvironment.sources.icebergs.temporalStatus}</span></div>
                  <div className="flex justify-between"><span className="text-[#596267] font-medium">Latest obs</span><span className="text-[#263238]">{unifiedEnvironment.sources.icebergs.validTime ? new Date(unifiedEnvironment.sources.icebergs.validTime).toLocaleDateString() : 'N/A'}</span></div>
                  <div className="flex justify-between"><span className="text-[#596267] font-medium">Resolution</span><span className="text-[#263238]">{unifiedEnvironment.sources.icebergs.sourceResolution}</span></div>
                  <div className="flex justify-between"><span className="text-[#596267] font-medium">Coverage</span><span className="text-[#263238]">{unifiedEnvironment.sources.icebergs.coverage}</span></div>
                </div>
              </div>

              {/* Weather Forecast Card */}
              <div className="bg-[#F3F0E8] p-4 rounded-xl border border-[#D4D1C7] space-y-2.5">
                <div className="flex items-center justify-between border-b border-[#D4D1C7] pb-2">
                  <span className="font-semibold text-sm text-[#263238]">Weather Forecast</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-md border ${
                    unifiedEnvironment.sources.weather.quality === 'VALID' ? 'bg-[#EAF0EB] text-[#52715B] border-[#52715B]/30' : 'bg-[#F3E5E3] text-[#A45750] border-[#A45750]/30'
                  }`}>
                    {unifiedEnvironment.sources.weather.quality}
                  </span>
                </div>
                <div className="text-sm font-semibold text-[#315E62]">{unifiedEnvironment.sources.weather.sourceName}</div>
                <div className="space-y-1.5 text-xs text-[#364148]">
                  <div className="flex justify-between"><span className="text-[#596267] font-medium">Status</span><span className="font-semibold text-[#263238]">{unifiedEnvironment.sources.weather.temporalStatus}</span></div>
                  <div className="flex justify-between"><span className="text-[#596267] font-medium">Forecast valid</span><span className="text-[#263238]">{unifiedEnvironment.sources.weather.validTime ? new Date(unifiedEnvironment.sources.weather.validTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}</span></div>
                  <div className="flex justify-between"><span className="text-[#596267] font-medium">Resolution</span><span className="text-[#263238]">{unifiedEnvironment.sources.weather.sourceResolution}</span></div>
                  <div className="flex justify-between"><span className="text-[#596267] font-medium">Coverage</span><span className="text-[#263238]">{unifiedEnvironment.sources.weather.coverage}</span></div>
                </div>
              </div>
            </div>

            {/* Spatial Alignment Metadata & CRS Section */}
            <div className="pt-3 border-t border-[#E7E4DA] flex flex-col sm:flex-row sm:items-center justify-between text-xs text-[#596267] gap-2">
              <div>
                <span className="text-[#315E62] font-semibold">Spatial alignment:</span> Mission area: <span className="text-[#263238] font-medium">[{unifiedEnvironment.region.bbox.map(n => n.toFixed(1)).join(', ')}]</span> · Display CRS: <span className="text-[#263238] font-medium">{unifiedEnvironment.region.displayCrs}</span>
              </div>
              <div className="text-[#858C90] italic">
                Source-native spatial resolutions preserved.
              </div>
            </div>

            {/* Alignment Notices */}
            {unifiedEnvironment.warnings.length > 0 && (
              <div className="pt-3 border-t border-[#E7E4DA] space-y-2">
                <div className="text-xs font-semibold text-[#9A7945] flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-[#9A7945]" /> Alignment notice
                </div>
                <div className="space-y-1.5 pl-2 text-xs text-[#364148]">
                  {unifiedEnvironment.warnings.map((w, idx) => (
                    <div key={idx} className="flex items-start gap-2 bg-[#F3EEE2] p-2.5 rounded-lg border border-[#9A7945]/20">
                      <span className="text-[#9A7945] font-bold">•</span>
                      <span className="leading-relaxed">{w}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Scientific Honesty Notice */}
            <div className="text-xs text-[#626A70] bg-[#EFEEE9] p-2.5 rounded-lg border border-[#E8E6E1] italic">
              "Environmental alignment evaluates temporal compatibility, spatial coverage, and source-native metadata. CRYO NAV preserves source-native metadata and evaluates compatibility before downstream modeling."
            </div>
          </div>
        )}

        {/* SEA-ICE CONFIDENCE CONTRIBUTION PANEL (Phase 4) */}
        {decisionConfidence && (
          <div className="bg-white text-[#252B30] p-3.5 rounded-lg border border-[#DCDAD4] shadow-xs font-mono text-xs space-y-2">
            <div className="flex items-center justify-between border-b border-[#E8E6E1] pb-2">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-[#58725D]" />
                <span className="font-bold text-[#252B30] text-xs uppercase tracking-wider">
                  SEA-ICE CONFIDENCE CONTRIBUTION
                </span>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                decisionConfidence.overallLevel === 'HIGH' ? 'bg-[#EDF2ED] text-[#58725D] border-[#58725D]/30' :
                decisionConfidence.overallLevel === 'MEDIUM' ? 'bg-[#E7EDF0] text-[#3D5665] border-[#3D5665]/30' :
                decisionConfidence.overallLevel === 'LOW' ? 'bg-[#F5F0E5] text-[#9A7945] border-[#9A7945]/30' :
                'bg-[#F5EAEA] text-[#A65B55] border-[#A65B55]/30'
              }`}>
                CONFIDENCE LEVEL: {decisionConfidence.overallLevel} ({decisionConfidence.confidenceScore}/100)
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1">
              <div className="bg-[#F5F3EE] p-2 rounded border border-[#E8E6E1]">
                <span className="text-[#626A70] text-[10px] uppercase font-bold block">SOURCE PIPELINE</span>
                <span className="text-[#3D5665] font-bold">{unifiedEnvironment?.sources.seaIce.sourceName}</span>
                <div className="text-[10px] text-[#626A70]">{unifiedEnvironment?.sources.seaIce.provider}</div>
              </div>
              <div className="bg-[#F5F3EE] p-2 rounded border border-[#E8E6E1]">
                <span className="text-[#626A70] text-[10px] uppercase font-bold block">TEMPORAL STATUS</span>
                <span className="text-[#58725D] font-bold">{unifiedEnvironment?.sources.seaIce.temporalStatus}</span>
                <div className="text-[10px] text-[#626A70]">{unifiedEnvironment?.sources.seaIce.timeDiffHours !== null ? `${unifiedEnvironment.sources.seaIce.timeDiffHours?.toFixed(1)} h offset` : 'Unknown'}</div>
              </div>
              <div className="bg-[#F5F3EE] p-2 rounded border border-[#E8E6E1]">
                <span className="text-[#626A70] text-[10px] uppercase font-bold block">SPATIAL COVERAGE</span>
                <span className="text-[#3D5665] font-bold">{unifiedEnvironment?.sources.seaIce.coverage}</span>
                <div className="text-[10px] text-[#626A70]">Target Bounding Box</div>
              </div>
              <div className="bg-[#F5F3EE] p-2 rounded border border-[#E8E6E1]">
                <span className="text-[#626A70] text-[10px] uppercase font-bold block">FORECAST UNCERTAINTY</span>
                <span className="text-[#9A7945] font-bold">{forecastHorizonHours === 0 ? 'LOW (Nowcast)' : forecastHorizonHours <= 24 ? 'MODERATE (+24h)' : 'HIGH (+48h/+72h)'}</span>
                <div className="text-[10px] text-[#626A70]">Grid cell variance: ±{(selectedCell?.uncertainty || 15).toFixed(0)}%</div>
              </div>
            </div>

            <div className="text-[10px] text-[#626A70] pt-1.5 border-t border-[#E8E6E1] leading-snug italic font-sans">
              Notice: Sea-ice confidence scores and grid cell uncertainties are decision-support heuristics and baseline operational assumptions. They are not statistically calibrated probability bounds.
            </div>
          </div>
        )}
        {/* Interactive Map Container (Primary Focus - Large Workspace) */}
        <div className="w-full flex flex-col h-[620px] min-h-[520px] relative overflow-hidden rounded-lg border border-[#DCDAD4] bg-[#EFEEE9] shadow-xs shrink-0">
          {/* Interactive Leaflet Map in Sea-Ice Mode */}
          <AntarcticMap mode="seaice" selectedCellId={selectedCellId} onCellSelect={(id) => setSelectedCellId(id)} />

          {/* Top Map Overlay: Forecast Horizon Selector Bar */}
          <div className="absolute top-3 left-3 right-3 z-[1000] flex flex-wrap items-center justify-between gap-2 bg-white/95 text-[#252B30] p-2 rounded-md border border-[#DCDAD4] shadow-sm backdrop-blur-xs font-mono text-xs select-none">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-[#626A70] font-bold uppercase tracking-wider hidden sm:inline mr-1">
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
                          ? 'bg-[#3D5665] text-white shadow-xs'
                          : 'bg-[#F5F3EE] text-[#626A70] hover:bg-[#EFEEE9] border border-[#DCDAD4]'
                      }`}
                    >
                      {isActive && <span className="w-1.5 h-1.5 rounded-full bg-white"></span>}
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
                    ? 'bg-[#9A7945] hover:bg-[#856738] text-white border-[#9A7945] shadow-xs'
                    : 'bg-[#3D5665] hover:bg-[#304652] text-white border-[#3D5665] shadow-xs'
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
                  title="Reset to Now (T+0)"
                  className="p-1 rounded bg-[#F5F3EE] hover:bg-[#EFEEE9] text-[#626A70] border border-[#DCDAD4]"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Bottom Map Overlay: WMO Antarctic Sea-Ice Concentration Legend */}
          <div className="absolute bottom-4 left-4 z-[1000] bg-white/95 text-[#252B30] px-3 py-2 rounded border border-[#DCDAD4] text-[10px] font-mono shadow-sm backdrop-blur-xs flex flex-wrap items-center gap-3 select-none">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-sky-700 border border-sky-400"></span>
              <span>Open Water (&lt;10%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-cyan-600 border border-cyan-300"></span>
              <span>Very Open Drift (10-39%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-sky-400 border border-sky-200"></span>
              <span>Open/Close Pack (40-69%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-sky-200 border border-white"></span>
              <span>Very Close Pack (70-89%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-slate-100 border border-slate-300"></span>
              <span className="font-bold text-[#252B30]">Fast Ice (90-100%)</span>
            </div>
            <div className="flex items-center gap-1.5 pl-2 border-l border-[#DCDAD4]">
              <span className="w-3 h-0.5 bg-[#3D5665]"></span>
              <span>Drift Vector</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full border border-dashed border-[#3D5665] bg-[#3D5665]/10"></span>
              <span>Uncertainty (±%)</span>
            </div>
          </div>
        </div>

        {/* Selected Cell Modeling Inspector & Forecast Progression Timeline */}
        {selectedCell && (
          <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-3 gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-slate-900 font-mono">{selectedCell.id}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200 font-bold">
                    ({Math.abs(selectedCell.lat).toFixed(1)}°S, {Math.abs(selectedCell.lon).toFixed(1)}°W)
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 font-bold">
                    HORIZON: {forecastHorizonHours === 0 ? 'T+0' : `+${forecastHorizonHours}h`}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  WMO Classification: <strong>{selectedCell.stage}</strong>
                </p>
              </div>

              <div className="flex items-center gap-3 font-mono text-xs text-right">
                <div>
                  <span className="text-slate-500 text-[10px]">Vessel Hull Rating</span>
                  <div className="text-xs font-bold text-slate-900">
                    Limit: {selectedVessel.maxSeaIceConcentrationPercent}% Pack
                  </div>
                </div>
                <div className="pl-3 border-l border-slate-200">
                  <span className="text-slate-500 text-[10px]">Feasibility Status</span>
                  <div
                    className={`text-xs font-bold ${
                      selectedCell.concentrationPercent > selectedVessel.maxSeaIceConcentrationPercent
                        ? 'text-red-700'
                        : selectedCell.concentrationPercent > 50
                        ? 'text-amber-700'
                        : 'text-emerald-700'
                    }`}
                  >
                    {selectedCell.concentrationPercent > selectedVessel.maxSeaIceConcentrationPercent
                      ? 'EXCEEDS RATING'
                      : selectedCell.concentrationPercent > 50
                      ? 'CAUTION: SPEED LOSS'
                      : 'FEASIBLE'}
                  </div>
                </div>
              </div>
            </div>

            {/* Modeling Values Grid for Selected Cell */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
              <div className="bg-slate-50 p-2.5 rounded border border-slate-200 shadow-xs">
                <div className="text-[10px] text-slate-500 font-semibold uppercase">
                  {forecastHorizonHours === 0 ? 'Current Concentration (T0)' : `Predicted Concentration (+${forecastHorizonHours}h)`}
                </div>
                <div
                  className={`font-bold mt-0.5 text-base ${
                    selectedCell.concentrationPercent > 70
                      ? 'text-amber-700'
                      : selectedCell.concentrationPercent > 40
                      ? 'text-blue-700'
                      : 'text-emerald-700'
                  }`}
                >
                  {selectedCell.concentrationPercent}%
                </div>
                <div className="text-slate-600 text-[11px]">{selectedCell.stage}</div>
              </div>

              <div className="bg-slate-50 p-2.5 rounded border border-slate-200 shadow-xs">
                <div className="text-[10px] text-slate-500 font-semibold uppercase">Thickness & Ice Age</div>
                <div className="text-slate-900 font-bold mt-0.5 text-base">
                  {selectedCell.thicknessMeters} m
                </div>
                <div className="text-slate-600 text-xs">Estimated Age: {selectedCell.ageDays ?? 14} days</div>
              </div>

              <div className="bg-slate-50 p-2.5 rounded border border-slate-200 shadow-xs">
                <div className="text-[10px] text-slate-500 font-semibold uppercase">Drift Advection</div>
                <div className="text-emerald-700 font-bold mt-0.5 text-base">
                  {selectedCell.driftVector.speedKnots} kts
                </div>
                <div className="text-slate-600 text-xs">Heading: {selectedCell.driftVector.headingDeg}°</div>
              </div>

              <div className="bg-slate-50 p-2.5 rounded border border-slate-200 shadow-xs">
                <div className="text-[10px] text-slate-500 font-semibold uppercase">Forecast Uncertainty</div>
                <div className="text-blue-700 font-bold mt-0.5 text-base">
                  ±{selectedCell.uncertainty}%
                </div>
                <div className="text-slate-500 text-[10px]">Confidence: {selectedCell.confidence}%</div>
              </div>
            </div>

            {/* Selected Cell Forecast Progression Timeline Table */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-xs font-mono text-slate-900 font-bold">
                <span className="flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-slate-700" /> Cell {selectedCell.id} Forecast Progression (+0h to +72h)
                </span>
                <span className="text-[10px] text-slate-500">Thermodynamic & Advection Time Progression</span>
              </div>

              <div className="divide-y divide-slate-200 text-xs font-mono border border-slate-200 rounded-md bg-white overflow-hidden shadow-xs">
                <div className="grid grid-cols-5 p-2 text-[10px] text-slate-600 font-bold bg-slate-100 uppercase">
                  <div>Horizon</div>
                  <div>Pred Concentration</div>
                  <div>WMO Stage</div>
                  <div>Uncertainty</div>
                  <div>Feasibility Rating</div>
                </div>

                {cellTimeline.map((item) => {
                  const isSelectedRow = forecastHorizonHours === item.hours;
                  const isOverLimit = item.concentrationPercent > selectedVessel.maxSeaIceConcentrationPercent;

                  return (
                    <div
                      key={item.horizon}
                      onClick={() => setForecastHorizonHours(item.hours)}
                      className={`grid grid-cols-5 p-2.5 cursor-pointer transition ${
                        isSelectedRow
                          ? 'bg-amber-50 font-bold text-amber-950 border-l-4 border-amber-500'
                          : 'hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      <div className="text-blue-700 font-bold">{item.horizon}</div>
                      <div
                        className={`font-bold ${
                          item.concentrationPercent > 70
                            ? 'text-amber-700'
                            : item.concentrationPercent > 40
                            ? 'text-blue-700'
                            : 'text-emerald-700'
                        }`}
                      >
                        {item.concentrationPercent}%
                      </div>
                      <div>{item.stage}</div>
                      <div>±{item.uncertainty}%</div>
                      <div
                        className={`font-bold ${
                          isOverLimit ? 'text-red-700' : item.concentrationPercent > 50 ? 'text-amber-700' : 'text-emerald-700'
                        }`}
                      >
                        {isOverLimit ? 'EXCEEDS RATING' : item.concentrationPercent > 50 ? 'SPEED LOSS' : 'FEASIBLE'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Evaluated Regional Grid Cells Table (100 Cells) - Secondary Detailed View */}
        <div className="bg-white rounded-lg border border-slate-200 space-y-3 p-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-3 gap-2 font-mono text-xs">
            <span className="font-bold text-slate-900 uppercase">
              Evaluated Regional Grid Cells Matrix ({seaIceCells.length})
            </span>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
              <input
                type="text"
                placeholder="Filter cells or stage..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1 text-xs border border-slate-300 rounded bg-slate-50 focus:bg-white text-slate-800 w-48 font-mono"
              />
            </div>
          </div>

          <div className="max-h-[300px] overflow-y-auto divide-y divide-slate-200 font-mono text-xs">
            {filteredCells.map((cell) => {
              const isSelected = selectedCellId === cell.id;
              const isOverLimit = cell.concentrationPercent > selectedVessel.maxSeaIceConcentrationPercent;

              return (
                <div
                  key={cell.id}
                  onClick={() => setSelectedCellId(cell.id)}
                  className={`py-2 px-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer transition ${
                    isSelected ? 'bg-amber-50 border-l-4 border-amber-500 font-bold' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{cell.id}</span>
                      <span className="text-slate-500 text-[11px]">
                        ({Math.abs(cell.lat).toFixed(1)}°S, {Math.abs(cell.lon).toFixed(1)}°W)
                      </span>
                      {isOverLimit && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-red-100 text-red-800 border border-red-300 font-bold">
                          EXCEEDS VESSEL RATING
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-600">
                      {cell.stage} • Thickness: {cell.thicknessMeters}m • Age: {cell.ageDays ?? 14} days
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <div className="text-[10px] text-slate-500 font-semibold">CONCENTRATION</div>
                      <div
                        className={`font-bold text-xs ${
                          cell.concentrationPercent > 70
                            ? 'text-amber-700'
                            : cell.concentrationPercent > 40
                            ? 'text-blue-700'
                            : 'text-emerald-700'
                        }`}
                      >
                        {cell.concentrationPercent}%
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] text-slate-500 font-semibold">UNCERTAINTY</div>
                      <div className="text-slate-800 text-xs">±{cell.uncertainty}%</div>
                    </div>

                    <div>
                      <div className="text-[10px] text-slate-500 font-semibold">DRIFT</div>
                      <div className="text-slate-800 text-xs">
                        {cell.driftVector.speedKnots} kt @ {cell.driftVector.headingDeg}°
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Model Formulation Notes */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 text-xs font-sans text-slate-600 space-y-1.5 leading-relaxed shadow-xs">
          <div className="font-bold text-slate-900 flex items-center gap-1.5 font-mono text-xs">
            <Info className="w-4 h-4 text-slate-700" /> Real-Data Initialized Sea-Ice Formulation & Scientific Honesty Statement
          </div>
          <p>
            {environmentalMode === 'REAL' ? (
              <>
                <strong>REAL DATA INITIALIZED BASELINE FORECAST:</strong> Ingests Copernicus Marine L4 satellite sea-ice concentration observations. Real sea-ice observations are available, but operational forecasting is not yet scientifically validated.
              </>
            ) : (
              <>
                Sea ice concentration evolves under thermodynamic growth (+0.05%/h below -1.8°C) and wind stress advection (2.1% of 10m wind velocity).
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};
