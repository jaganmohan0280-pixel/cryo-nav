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
  X,
  Sliders,
  ExternalLink,
  Bot,
  Activity,
  ArrowRight,
  TrendingUp,
  MapPin,
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
    mapLayers,
    toggleMapLayer,
    setActiveView,
    mission,
  } = useApp();

  const [selectedCellId, setSelectedCellId] = useState<string>('ice-cell-0');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'forecast' | 'change'>('forecast');

  // Modals for technical details (keeping secondary information accessible)
  const [showDataStatusModal, setShowDataStatusModal] = useState<boolean>(false);
  const [showGridMatrixModal, setShowGridMatrixModal] = useState<boolean>(false);
  const [showModelDetailsModal, setShowModelDetailsModal] = useState<boolean>(false);

  const horizons = [
    { label: 'NOW', hours: 0, text: 'T+0' },
    { label: '+6h', hours: 6, text: '+6h' },
    { label: '+12h', hours: 12, text: '+12h' },
    { label: '+24h', hours: 24, text: '+24h' },
    { label: '+48h', hours: 48, text: '+48h' },
    { label: '+72h', hours: 72, text: '+72h' },
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

  // Compute forecast field at horizon = 0 (Current T+0 baseline)
  const baselineField = forecastSeaIceField(seaIceCells, weather, 0, 1.0);
  const baselineCell = baselineField.find((c) => c.id === selectedCell?.id) || selectedCell;

  // Compute forecast field at active horizon
  const activeForecastField = forecastSeaIceField(seaIceCells, weather, forecastHorizonHours, 1.0);
  const forecastedCell = activeForecastField.find((c) => c.id === selectedCell?.id) || selectedCell;

  // Change relative to baseline T+0
  const concentrationDelta = (forecastedCell?.concentrationPercent || 0) - (baselineCell?.concentrationPercent || 0);

  // Compute forecast timeline for selected cell across 0h to 72h
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
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#F5F7F7] font-sans">
      {/* ------------------------------------------------------------- */}
      {/* 1. COMPACT PAGE HEADER                                        */}
      {/* ------------------------------------------------------------- */}
      <header className="bg-white border-b border-[#DCE7E7] px-6 py-3 shrink-0 shadow-2xs z-20">
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#075563] text-white flex items-center justify-center shrink-0">
              <Layers className="w-4 h-4 text-[#2BB9BD]" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-[#075563] tracking-tight flex items-center gap-2">
                Sea-Ice Forecast
                <span className="hidden sm:inline text-xs text-[#526B7A] font-normal">
                  (CRYO NAV SEA ICE)
                </span>
              </h1>
              <p className="text-xs text-[#526B7A]">
                Visualize current sea-ice concentration and forecast movement across the mission area.
              </p>
            </div>
          </div>

          {/* Quick Context & Status Badges */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 bg-[#F5F7F7] px-2.5 py-1 rounded-md border border-[#DCE7E7]">
              <span className="text-[11px] text-[#526B7A]">Data mode:</span>
              <button
                onClick={() => setEnvironmentalMode(environmentalMode === 'REAL' ? 'DEMO' : 'REAL')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold border transition cursor-pointer ${
                  environmentalMode === 'REAL'
                    ? 'bg-[#EEF4EF] text-[#2C6E49] border-[#D5E4D7]'
                    : 'bg-[#FEF9C3] text-[#A16207] border-[#FEF08A]'
                }`}
                title="Click to toggle Real / Demo data mode"
              >
                {environmentalMode === 'REAL' ? '● REAL DATA' : '● DEMO MODE'}
              </button>
            </div>

            <button
              onClick={() => setShowDataStatusModal(true)}
              className="px-2.5 py-1 bg-white hover:bg-[#F0F4F4] border border-[#DCE7E7] text-[#075563] text-xs rounded-md font-medium transition flex items-center gap-1 cursor-pointer"
            >
              <Database className="w-3.5 h-3.5 text-[#075563]" />
              <span>Data Status</span>
              <span className="w-2 h-2 rounded-full bg-[#2C6E49] ml-0.5"></span>
            </button>

            <button
              onClick={() => setShowModelDetailsModal(true)}
              className="px-2.5 py-1 bg-white hover:bg-[#F0F4F4] border border-[#DCE7E7] text-[#075563] text-xs rounded-md font-medium transition flex items-center gap-1 cursor-pointer"
            >
              <Info className="w-3.5 h-3.5 text-[#075563]" />
              <span>Model & Assumptions</span>
            </button>

            <button
              onClick={() => setShowGridMatrixModal(true)}
              className="px-2.5 py-1 bg-white hover:bg-[#F0F4F4] border border-[#DCE7E7] text-[#075563] text-xs rounded-md font-medium transition flex items-center gap-1 cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5 text-[#075563]" />
              <span>Regional Grid ({seaIceCells.length})</span>
            </button>
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------- */}
      {/* 2. COMPACT MISSION CONTEXT BAR                                */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white border-b border-[#DCE7E7] px-6 py-1.5 text-xs text-[#526B7A] flex items-center justify-between shrink-0 shadow-2xs">
        <div className="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap">
          <span className="font-medium text-[#18343A]">Current mission:</span>
          <span className="text-[#18343A] font-medium">{mission.title || 'Antarctic Voyage'}</span>
          <span>·</span>
          <span>Vessel: {selectedVessel.name} ({selectedVessel.iceClass.split(' ')[0]})</span>
          <span>·</span>
          <span className="text-[#075563] font-medium">Region: Antarctic Peninsula Sector</span>
        </div>

        <div className="flex items-center gap-2 text-[11px] shrink-0">
          <span>Confidence:</span>
          <span className="font-semibold text-[#18343A]">
            {decisionConfidence?.overallLevel || 'MEDIUM'} ({decisionConfidence?.confidenceScore || 75}/100)
          </span>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. MAP-FIRST PRIMARY WORKSPACE (65-75% Area)                  */}
      {/* ------------------------------------------------------------- */}
      <main className="flex-1 flex flex-col lg:flex-row p-4 gap-4 overflow-hidden max-w-[1600px] w-full mx-auto">
        {/* Central Map & Forecast Timeline Workspace */}
        <div className="flex-1 flex flex-col bg-white rounded-xl border border-[#DCE7E7] shadow-2xs overflow-hidden">
          {/* Map Container */}
          <div className="flex-1 relative min-h-[440px] bg-[#EFEEE9]">
            <AntarcticMap
              mode="seaice"
              selectedCellId={selectedCellId}
              onCellSelect={(id) => setSelectedCellId(id)}
            />

            {/* Map Layer Controls Floating Overlay */}
            <div className="absolute top-3 right-3 z-[1000] bg-white/95 text-[#18343A] p-2.5 rounded-lg border border-[#DCE7E7] shadow-sm backdrop-blur-xs text-xs space-y-1.5 select-none max-w-[200px]">
              <div className="text-[10px] font-semibold uppercase text-[#526B7A] tracking-wider mb-1">
                Map Layers
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium hover:text-[#075563]">
                <input
                  type="checkbox"
                  checked={mapLayers.seaIce}
                  onChange={() => toggleMapLayer('seaIce')}
                  className="rounded text-[#075563] focus:ring-[#075563]"
                />
                <span>Sea-Ice Concentration</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium hover:text-[#075563]">
                <input
                  type="checkbox"
                  checked={mapLayers.routes}
                  onChange={() => toggleMapLayer('routes')}
                  className="rounded text-[#075563] focus:ring-[#075563]"
                />
                <span>Active Route</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium hover:text-[#075563]">
                <input
                  type="checkbox"
                  checked={mapLayers.icebergs}
                  onChange={() => toggleMapLayer('icebergs')}
                  className="rounded text-[#075563] focus:ring-[#075563]"
                />
                <span>Iceberg Observations</span>
              </label>
            </div>

            {/* Map Legend Floating Overlay */}
            <div className="absolute bottom-3 left-3 z-[1000] bg-white/95 text-[#18343A] px-3 py-2 rounded-lg border border-[#DCE7E7] text-[11px] shadow-sm backdrop-blur-xs flex flex-wrap items-center gap-3 select-none">
              <span className="text-[10px] font-semibold uppercase text-[#526B7A]">Concentration:</span>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-sky-600 border border-sky-400"></span>
                <span>0% Open</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-sky-400 border border-sky-200"></span>
                <span>25% Low</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-indigo-500 border border-indigo-300"></span>
                <span>50% Medium</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-indigo-700 border border-indigo-500"></span>
                <span>75% High</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-slate-100 border border-slate-300"></span>
                <span className="font-semibold">100% Fast Ice</span>
              </div>
            </div>

            {/* Timestep Indicator Floating Overlay */}
            <div className="absolute top-3 left-3 z-[1000] bg-[#075563] text-white px-3 py-1.5 rounded-lg text-xs font-medium shadow-sm flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-[#2BB9BD]" />
              <span>
                Forecast: {forecastHorizonHours === 0 ? 'NOW (T+0)' : `+${forecastHorizonHours}h`}
              </span>
            </div>
          </div>

          {/* Forecast Timeline & Controls Toolbar */}
          <div className="bg-white border-t border-[#DCE7E7] p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
            {/* Forecast Horizons Step Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-medium text-[#526B7A] mr-1">Horizon:</span>
              {horizons.map((h) => {
                const isActive = forecastHorizonHours === h.hours;
                return (
                  <button
                    key={h.hours}
                    onClick={() => {
                      setForecastHorizonHours(h.hours);
                      setIsPlaying(false);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      isActive
                        ? 'bg-[#075563] text-white shadow-2xs'
                        : 'bg-[#F5F7F7] hover:bg-[#E5E9E9] text-[#075563] border border-[#DCE7E7]'
                    }`}
                  >
                    {h.label}
                  </button>
                );
              })}
            </div>

            {/* Playback Controls & Mode Toggle */}
            <div className="flex items-center gap-3 self-end sm:self-auto">
              {/* View Mode (Forecast vs Change) */}
              <div className="flex items-center bg-[#F5F7F7] p-0.5 rounded-lg border border-[#DCE7E7] text-xs">
                <button
                  onClick={() => setViewMode('forecast')}
                  className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                    viewMode === 'forecast' ? 'bg-[#075563] text-white' : 'text-[#526B7A]'
                  }`}
                >
                  Forecast
                </button>
                <button
                  onClick={() => setViewMode('change')}
                  className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                    viewMode === 'change' ? 'bg-[#075563] text-white' : 'text-[#526B7A]'
                  }`}
                >
                  Change (Δ %)
                </button>
              </div>

              {/* Play / Pause */}
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                  isPlaying
                    ? 'bg-[#A16207] text-white'
                    : 'bg-[#075563] text-white hover:bg-[#05434F]'
                }`}
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-3.5 h-3.5" /> Pause
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" /> Play Forecast
                  </>
                )}
              </button>

              {forecastHorizonHours !== 0 && (
                <button
                  onClick={() => {
                    setForecastHorizonHours(0);
                    setIsPlaying(false);
                  }}
                  title="Reset to NOW (T+0)"
                  className="p-1.5 rounded-lg bg-[#F5F7F7] hover:bg-[#E5E9E9] text-[#075563] border border-[#DCE7E7] cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* 4. SELECTED LOCATION INSPECTOR SIDE PANEL                      */}
        {/* ------------------------------------------------------------- */}
        <aside className="w-full lg:w-[360px] bg-white rounded-xl border border-[#DCE7E7] p-4 flex flex-col justify-between space-y-4 shadow-2xs overflow-y-auto shrink-0">
          <div>
            <div className="flex items-center justify-between border-b border-[#E5E9E9] pb-3">
              <div>
                <span className="text-[10px] font-semibold uppercase text-[#526B7A]">Selected Location</span>
                <h3 className="text-sm font-semibold text-[#075563] flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-[#2BB9BD]" />
                  {selectedCell?.id || 'Cell 0'}
                </h3>
              </div>
              <span className="text-xs text-[#526B7A] font-medium bg-[#F5F7F7] px-2 py-1 rounded border border-[#DCE7E7]">
                {selectedCell ? `${Math.abs(selectedCell.lat).toFixed(1)}°S, ${Math.abs(selectedCell.lon).toFixed(1)}°W` : ''}
              </span>
            </div>

            {/* Current vs Forecast Comparison Box */}
            <div className="mt-3 bg-[#F5F7F7] p-3 rounded-xl border border-[#DCE7E7] space-y-3">
              <div className="flex items-center justify-between text-xs text-[#526B7A]">
                <span>WMO Stage:</span>
                <strong className="text-[#18343A]">{forecastedCell?.stage || 'Open Pack'}</strong>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <div className="bg-white p-2.5 rounded-lg border border-[#E5E9E9]">
                  <span className="text-[10px] text-[#526B7A] block">Current (T+0)</span>
                  <span className="text-base font-semibold text-[#18343A]">
                    {baselineCell?.concentrationPercent}%
                  </span>
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-[#E5E9E9]">
                  <span className="text-[10px] text-[#526B7A] block">
                    Forecast ({forecastHorizonHours === 0 ? 'T+0' : `+${forecastHorizonHours}h`})
                  </span>
                  <span className="text-base font-semibold text-[#075563]">
                    {forecastedCell?.concentrationPercent}%
                  </span>
                </div>
              </div>

              {/* Change Indicator */}
              <div className="flex items-center justify-between text-xs pt-1 border-t border-[#E5E9E9]">
                <span className="text-[#526B7A]">Change from current:</span>
                <span
                  className={`font-bold px-2 py-0.5 rounded text-xs ${
                    concentrationDelta > 0
                      ? 'bg-[#FEF9C3] text-[#A16207]'
                      : concentrationDelta < 0
                      ? 'bg-[#EEF4EF] text-[#2C6E49]'
                      : 'bg-white text-[#526B7A]'
                  }`}
                >
                  {concentrationDelta > 0 ? `+${concentrationDelta}%` : `${concentrationDelta}%`}
                </span>
              </div>
            </div>

            {/* Movement & Uncertainty Breakdown */}
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="bg-[#F5F7F7] p-2.5 rounded-lg border border-[#DCE7E7]">
                <span className="text-[10px] text-[#526B7A] block font-medium">Drift Vector</span>
                <span className="text-[#18343A] font-semibold block text-sm mt-0.5">
                  {forecastedCell?.driftVector?.speedKnots || 1.0} kts
                </span>
                <span className="text-[10px] text-[#526B7A]">
                  Heading {forecastedCell?.driftVector?.headingDeg || 180}°
                </span>
              </div>

              <div className="bg-[#F5F7F7] p-2.5 rounded-lg border border-[#DCE7E7]">
                <span className="text-[10px] text-[#526B7A] block font-medium">Uncertainty</span>
                <span className="text-[#075563] font-semibold block text-sm mt-0.5">
                  ±{forecastedCell?.uncertainty || 15}%
                </span>
                <span className="text-[10px] text-[#526B7A]">
                  Confidence: {forecastedCell?.confidence || 80}%
                </span>
              </div>
            </div>

            {/* Forecast Progression Timeline for Selected Cell */}
            <div className="mt-4 space-y-2">
              <span className="text-xs font-semibold text-[#075563] block">
                Forecast Progression (+0h to +72h)
              </span>

              <div className="divide-y divide-[#E5E9E9] text-xs border border-[#DCE7E7] rounded-xl bg-white overflow-hidden">
                {cellTimeline.map((item) => {
                  const isSelected = forecastHorizonHours === item.hours;
                  return (
                    <div
                      key={item.horizon}
                      onClick={() => setForecastHorizonHours(item.hours)}
                      className={`px-3 py-2 flex items-center justify-between cursor-pointer transition ${
                        isSelected ? 'bg-[#EEF4EF] font-semibold text-[#075563]' : 'hover:bg-[#F5F7F7] text-[#18343A]'
                      }`}
                    >
                      <span className="text-[#075563] font-medium">{item.horizon}</span>
                      <span>{item.concentrationPercent}% ({item.stage.split(' ')[0]})</span>
                      <span className="text-[10px] text-[#526B7A]">±{item.uncertainty}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Contextual Action Triggers */}
          <div className="pt-2 border-t border-[#E5E9E9] space-y-2">
            <button
              onClick={() => setActiveView('ai')}
              className="w-full py-2 bg-[#075563] text-white hover:bg-[#05434F] text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Bot className="w-3.5 h-3.5 text-[#2BB9BD]" />
              <span>Ask Decision Support About This Area</span>
            </button>
            <button
              onClick={() => setActiveView('acquisition')}
              className="w-full py-2 border border-[#DCE7E7] text-[#075563] hover:bg-[#F5F7F7] text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#075563]" />
              <span>Acquire Updated Satellite Imagery</span>
            </button>
          </div>
        </aside>
      </main>

      {/* ------------------------------------------------------------- */}
      {/* 5. MODAL: DATA STATUS & PIPELINE PROVENANCE                   */}
      {/* ------------------------------------------------------------- */}
      {showDataStatusModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full p-6 space-y-4 shadow-xl border border-[#DCE7E7] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E5E9E9] pb-3">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-[#075563]" />
                <h3 className="text-base font-semibold text-[#075563]">
                  Environmental Data Status & Pipeline Provenance
                </h3>
              </div>
              <button
                onClick={() => setShowDataStatusModal(false)}
                className="p-1 text-[#526B7A] hover:text-[#18343A] rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error alerts if any stream is degraded */}
            {environmentalMode === 'REAL' && (realSeaIceError || realOceanCurrentError || realWeatherError) && (
              <div className="bg-[#FEE2E2] text-[#991B1B] p-3 rounded-lg border border-[#FECACA] text-xs space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" /> Real Data Service Alert
                </div>
                {realSeaIceError && <p>[Sea Ice] {realSeaIceError}</p>}
                {realOceanCurrentError && <p>[Ocean Currents] {realOceanCurrentError}</p>}
                {realWeatherError && <p>[Weather] {realWeatherError}</p>}
              </div>
            )}

            {/* 4 Data Stream Cards */}
            {unifiedEnvironment && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Sea Ice */}
                <div className="bg-[#F5F7F7] p-3 rounded-lg border border-[#DCE7E7] space-y-1">
                  <div className="font-semibold text-[#075563] flex justify-between">
                    <span>Sea Ice Observations</span>
                    <span className="text-[#2C6E49]">{unifiedEnvironment.sources.seaIce.quality}</span>
                  </div>
                  <p className="text-[11px] text-[#526B7A]">{unifiedEnvironment.sources.seaIce.sourceName}</p>
                  <p className="text-[11px]">Resolution: {unifiedEnvironment.sources.seaIce.sourceResolution}</p>
                </div>

                {/* Ocean Currents */}
                <div className="bg-[#F5F7F7] p-3 rounded-lg border border-[#DCE7E7] space-y-1">
                  <div className="font-semibold text-[#075563] flex justify-between">
                    <span>Ocean Hydrodynamics</span>
                    <span className="text-[#2C6E49]">{unifiedEnvironment.sources.ocean.quality}</span>
                  </div>
                  <p className="text-[11px] text-[#526B7A]">{unifiedEnvironment.sources.ocean.sourceName}</p>
                  <p className="text-[11px]">Resolution: {unifiedEnvironment.sources.ocean.sourceResolution}</p>
                </div>

                {/* Iceberg Catalog */}
                <div className="bg-[#F5F7F7] p-3 rounded-lg border border-[#DCE7E7] space-y-1">
                  <div className="font-semibold text-[#075563] flex justify-between">
                    <span>Iceberg Catalog</span>
                    <span className="text-[#2C6E49]">{unifiedEnvironment.sources.icebergs.quality}</span>
                  </div>
                  <p className="text-[11px] text-[#526B7A]">{unifiedEnvironment.sources.icebergs.sourceName}</p>
                  <p className="text-[11px]">Coverage: {unifiedEnvironment.sources.icebergs.coverage}</p>
                </div>

                {/* Weather Forecast */}
                <div className="bg-[#F5F7F7] p-3 rounded-lg border border-[#DCE7E7] space-y-1">
                  <div className="font-semibold text-[#075563] flex justify-between">
                    <span>Weather Forecast</span>
                    <span className="text-[#A16207]">{unifiedEnvironment.sources.weather.quality}</span>
                  </div>
                  <p className="text-[11px] text-[#526B7A]">{unifiedEnvironment.sources.weather.sourceName}</p>
                  <p className="text-[11px]">Resolution: {unifiedEnvironment.sources.weather.sourceResolution}</p>
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowDataStatusModal(false)}
                className="px-4 py-2 bg-[#075563] text-white text-xs font-semibold rounded-lg cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 6. MODAL: REGIONAL GRID DATA MATRIX (100 Cells)               */}
      {/* ------------------------------------------------------------- */}
      {showGridMatrixModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full p-6 space-y-4 shadow-xl border border-[#DCE7E7] max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[#E5E9E9] pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-[#075563]" />
                <h3 className="text-base font-semibold text-[#075563]">
                  Evaluated Regional Grid Cells Matrix ({seaIceCells.length})
                </h3>
              </div>
              <button
                onClick={() => setShowGridMatrixModal(false)}
                className="p-1 text-[#526B7A] hover:text-[#18343A] rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Input */}
            <div className="relative shrink-0">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#526B7A]" />
              <input
                type="text"
                placeholder="Filter grid cells by ID, stage, or coordinates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs border border-[#DCE7E7] rounded-lg bg-[#F5F7F7] focus:bg-white text-[#18343A] focus:outline-none focus:border-[#075563]"
              />
            </div>

            {/* Cells List */}
            <div className="flex-1 overflow-y-auto border border-[#DCE7E7] rounded-xl divide-y divide-[#E5E9E9] text-xs">
              {filteredCells.map((cell) => (
                <div
                  key={cell.id}
                  onClick={() => {
                    setSelectedCellId(cell.id);
                    setShowGridMatrixModal(false);
                  }}
                  className={`p-3 flex items-center justify-between cursor-pointer transition ${
                    selectedCellId === cell.id ? 'bg-[#EEF4EF] font-semibold text-[#075563]' : 'hover:bg-[#F5F7F7]'
                  }`}
                >
                  <div>
                    <span className="font-semibold text-[#075563]">{cell.id}</span>
                    <span className="text-[#526B7A] text-[11px] ml-2">
                      ({Math.abs(cell.lat).toFixed(1)}°S, {Math.abs(cell.lon).toFixed(1)}°W)
                    </span>
                    <p className="text-[11px] text-[#526B7A] mt-0.5">{cell.stage}</p>
                  </div>

                  <div className="flex items-center gap-6 text-right">
                    <div>
                      <span className="text-[10px] text-[#526B7A] block">Concentration</span>
                      <strong className="text-[#075563]">{cell.concentrationPercent}%</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#526B7A] block">Drift</span>
                      <span>{cell.driftVector.speedKnots} kts</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#526B7A] block">Uncertainty</span>
                      <span>±{cell.uncertainty}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-end shrink-0">
              <button
                onClick={() => setShowGridMatrixModal(false)}
                className="px-4 py-2 bg-[#075563] text-white text-xs font-semibold rounded-lg cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 7. MODAL: MODEL DETAILS & SCIENTIFIC HONESTY                  */}
      {/* ------------------------------------------------------------- */}
      {showModelDetailsModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 space-y-4 shadow-xl border border-[#DCE7E7] max-h-[90vh] overflow-y-auto text-xs leading-relaxed text-[#18343A]">
            <div className="flex items-center justify-between border-b border-[#E5E9E9] pb-3">
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 text-[#075563]" />
                <h3 className="text-base font-semibold text-[#075563]">
                  Sea-Ice Advection Model & Scientific Formulation
                </h3>
              </div>
              <button
                onClick={() => setShowModelDetailsModal(false)}
                className="p-1 text-[#526B7A] hover:text-[#18343A] rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-[#075563]">Kinematic Advection & Growth Formulation</h4>
              <p className="text-[#526B7A]">
                Sea-ice concentration evolves under thermodynamic growth (+0.05%/h below -1.8°C seawater freezing threshold) and wind stress advection (2.1% of 10m wind velocity field).
              </p>

              <h4 className="font-semibold text-[#075563]">Forecast Horizon Limits</h4>
              <p className="text-[#526B7A]">
                Short-range forecasts (+6h to +24h) maintain high spatial fidelity based on Copernicus Marine L4 sea-ice observations. Medium-range forecasts (+48h to +72h) incorporate expanded uncertainty envelopes due to boundary layer wind variance.
              </p>

              <div className="bg-[#F5F7F7] p-3 rounded-lg border border-[#DCE7E7] text-[11px] text-[#526B7A] italic">
                Notice: Sea-ice confidence scores and grid cell uncertainties are decision-support heuristics and baseline operational assumptions for Antarctic navigation.
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowModelDetailsModal(false)}
                className="px-4 py-2 bg-[#075563] text-white text-xs font-semibold rounded-lg cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
