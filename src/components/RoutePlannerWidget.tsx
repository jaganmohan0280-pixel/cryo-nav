import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Compass, MapPin, Navigation, Play, RotateCcw, CheckCircle2, ArrowRight } from 'lucide-react';

export interface LocationPreset {
  name: string;
  lat: number;
  lon: number;
  description?: string;
}

export const POLAR_LOCATION_PRESETS: LocationPreset[] = [
  { name: 'Drake Passage Transit Gate', lat: -59.50, lon: -64.50, description: 'Southern Ocean Open Water Entry (-59.50°S, -64.50°W)' },
  { name: 'Punta Arenas, Chile', lat: -53.16, lon: -70.91, description: 'Sub-Antarctic Port Gateway (-53.16°S, -70.91°W)' },
  { name: 'Ushuaia, Argentina', lat: -54.80, lon: -68.30, description: 'Drake Passage Departure Port (-54.80°S, -68.30°W)' },
  { name: 'King George Island (South Shetlands)', lat: -62.20, lon: -58.96, description: 'South Shetland Archipelago (-62.20°S, -58.96°W)' },
  { name: 'Deception Island (Whalers Bay)', lat: -62.98, lon: -60.57, description: 'Volcanic Caldera Anchorage (-62.98°S, -60.57°W)' },
  { name: 'Palmer Station (USA)', lat: -64.77, lon: -64.05, description: 'Anvers Island Base (-64.77°S, -64.05°W)' },
  { name: 'Vernadsky Station (Ukraine)', lat: -65.25, lon: -64.25, description: 'Argentine Islands (-65.25°S, -64.25°W)' },
  { name: 'Rothera Research Station (UK)', lat: -67.57, lon: -68.13, description: 'Marguerite Bay / Adelaide Island (-67.57°S, -68.13°W)' },
  { name: 'San Martin Base (Argentina)', lat: -68.13, lon: -67.10, description: 'Marguerite Bay Deep South (-68.13°S, -67.10°W)' },
  { name: 'Halley VI Station (UK)', lat: -75.58, lon: -26.35, description: 'Weddell Sea Ice Shelf (-75.58°S, -26.35°W)' },
  { name: 'McMurdo Station (USA)', lat: -77.85, lon: 166.67, description: 'Ross Sea Hub (-77.85°S, 166.67°E)' },
];

interface Props {
  compact?: boolean;
  onRoutesCalculated?: () => void;
}

export const RoutePlannerWidget: React.FC<Props> = ({ compact = false, onRoutesCalculated }) => {
  const { mission, setMission, setActiveView, addAlert, selectedVessel } = useApp();

  const [selectedSourcePreset, setSelectedSourcePreset] = useState<string>(
    POLAR_LOCATION_PRESETS.find((p) => p.name.includes(mission.startLocation.name.split('(')[0].trim()))?.name ||
      POLAR_LOCATION_PRESETS[0].name
  );
  const [sourceName, setSourceName] = useState<string>(mission.startLocation.name);
  const [sourceLat, setSourceLat] = useState<number>(mission.startLocation.lat);
  const [sourceLon, setSourceLon] = useState<number>(mission.startLocation.lon);

  const [selectedDestPreset, setSelectedDestPreset] = useState<string>(
    POLAR_LOCATION_PRESETS.find((p) => p.name.includes(mission.destination.name.split('(')[0].trim()))?.name ||
      POLAR_LOCATION_PRESETS[7].name
  );
  const [destName, setDestName] = useState<string>(mission.destination.name);
  const [destLat, setDestLat] = useState<number>(mission.destination.lat);
  const [destLon, setDestLon] = useState<number>(mission.destination.lon);

  const [isCustomSource, setIsCustomSource] = useState<boolean>(false);
  const [isCustomDest, setIsCustomDest] = useState<boolean>(false);
  const [calculatedSuccess, setCalculatedSuccess] = useState<boolean>(false);

  const handleSourcePresetChange = (presetName: string) => {
    setSelectedSourcePreset(presetName);
    if (presetName === 'CUSTOM') {
      setIsCustomSource(true);
    } else {
      setIsCustomSource(false);
      const preset = POLAR_LOCATION_PRESETS.find((p) => p.name === presetName);
      if (preset) {
        setSourceName(preset.name);
        setSourceLat(preset.lat);
        setSourceLon(preset.lon);
      }
    }
  };

  const handleDestPresetChange = (presetName: string) => {
    setSelectedDestPreset(presetName);
    if (presetName === 'CUSTOM') {
      setIsCustomDest(true);
    } else {
      setIsCustomDest(false);
      const preset = POLAR_LOCATION_PRESETS.find((p) => p.name === presetName);
      if (preset) {
        setDestName(preset.name);
        setDestLat(preset.lat);
        setDestLon(preset.lon);
      }
    }
  };

  const handleRunRouting = (e: React.FormEvent) => {
    e.preventDefault();

    setMission({
      ...mission,
      startLocation: {
        name: sourceName || `Custom Origin (${sourceLat.toFixed(2)}°S, ${sourceLon.toFixed(2)}°W)`,
        lat: Number(sourceLat),
        lon: Number(sourceLon),
      },
      destination: {
        name: destName || `Custom Destination (${destLat.toFixed(2)}°S, ${destLon.toFixed(2)}°W)`,
        lat: Number(destLat),
        lon: Number(destLon),
      },
    });

    addAlert({
      severity: 'INFO',
      type: 'ROUTE_DEVIATION',
      title: 'Routes Calculated for Selected Corridor',
      message: `Origin: ${sourceName} (${sourceLat}°S, ${sourceLon}°W) → Destination: ${destName} (${destLat}°S, ${destLon}°W). 3 Route Corridors Generated!`,
    });

    setCalculatedSuccess(true);
    setTimeout(() => setCalculatedSuccess(false), 3000);

    if (onRoutesCalculated) {
      onRoutesCalculated();
    }
  };

  return (
    <div className={`bg-white rounded-lg border border-slate-200 shadow-xs font-mono ${compact ? 'p-3 text-xs' : 'p-4 text-xs'}`}>
      <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
        <div className="flex items-center gap-2">
          <Navigation className="w-4 h-4 text-blue-600" />
          <span className="font-semibold text-slate-900 uppercase tracking-wider">
            Origin & Destination Route Optimizer
          </span>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-medium">
          Interactive Polar Router
        </span>
      </div>

      <form onSubmit={handleRunRouting} className="space-y-3">
        <div className={`grid grid-cols-1 ${compact ? 'md:grid-cols-2' : 'md:grid-cols-2'} gap-3`}>
          {/* SOURCE (ORIGIN) INPUT */}
          <div className="bg-slate-50 p-3 rounded border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-slate-800 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-cyan-600" /> SOURCE (ORIGIN)
              </label>
              <span className="text-[10px] text-slate-500">Departure Location</span>
            </div>

            <select
              value={selectedSourcePreset}
              onChange={(e) => handleSourcePresetChange(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs text-slate-900 focus:outline-hidden focus:border-blue-500 font-sans"
            >
              {POLAR_LOCATION_PRESETS.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name}
                </option>
              ))}
              <option value="CUSTOM">Custom Latitude & Longitude...</option>
            </select>

            {isCustomSource && (
              <div className="space-y-2 pt-1">
                <input
                  type="text"
                  placeholder="Source Name"
                  value={sourceName}
                  onChange={(e) => setSourceName(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs text-slate-900 focus:outline-hidden focus:border-blue-500 font-sans"
                />
                <div className="flex gap-2">
                  <div className="w-1/2">
                    <label className="text-[10px] text-slate-500 block">Lat (°S)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={sourceLat}
                      onChange={(e) => setSourceLat(Number(e.target.value))}
                      className="w-full bg-white border border-slate-300 rounded p-1 text-xs text-slate-900"
                    />
                  </div>
                  <div className="w-1/2">
                    <label className="text-[10px] text-slate-500 block">Lon (°W)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={sourceLon}
                      onChange={(e) => setSourceLon(Number(e.target.value))}
                      className="w-full bg-white border border-slate-300 rounded p-1 text-xs text-slate-900"
                    />
                  </div>
                </div>
              </div>
            )}

            {!isCustomSource && (
              <div className="text-[10px] text-slate-500 pt-0.5">
                Coords: <strong className="text-slate-800">{Math.abs(sourceLat).toFixed(2)}°S, {Math.abs(sourceLon).toFixed(2)}°W</strong>
              </div>
            )}
          </div>

          {/* DESTINATION INPUT */}
          <div className="bg-slate-50 p-3 rounded border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-slate-800 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" /> DESTINATION
              </label>
              <span className="text-[10px] text-slate-500">Arrival Target</span>
            </div>

            <select
              value={selectedDestPreset}
              onChange={(e) => handleDestPresetChange(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs text-slate-900 focus:outline-hidden focus:border-blue-500 font-sans"
            >
              {POLAR_LOCATION_PRESETS.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name}
                </option>
              ))}
              <option value="CUSTOM">Custom Latitude & Longitude...</option>
            </select>

            {isCustomDest && (
              <div className="space-y-2 pt-1">
                <input
                  type="text"
                  placeholder="Destination Name"
                  value={destName}
                  onChange={(e) => setDestName(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs text-slate-900 focus:outline-hidden focus:border-blue-500 font-sans"
                />
                <div className="flex gap-2">
                  <div className="w-1/2">
                    <label className="text-[10px] text-slate-500 block">Lat (°S)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={destLat}
                      onChange={(e) => setDestLat(Number(e.target.value))}
                      className="w-full bg-white border border-slate-300 rounded p-1 text-xs text-slate-900"
                    />
                  </div>
                  <div className="w-1/2">
                    <label className="text-[10px] text-slate-500 block">Lon (°W)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={destLon}
                      onChange={(e) => setDestLon(Number(e.target.value))}
                      className="w-full bg-white border border-slate-300 rounded p-1 text-xs text-slate-900"
                    />
                  </div>
                </div>
              </div>
            )}

            {!isCustomDest && (
              <div className="text-[10px] text-slate-500 pt-0.5">
                Coords: <strong className="text-slate-800">{Math.abs(destLat).toFixed(2)}°S, {Math.abs(destLon).toFixed(2)}°W</strong>
              </div>
            )}
          </div>
        </div>

        {/* Action Button & Status */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div className="text-[11px] text-slate-600 font-sans">
            Vessel: <strong className="text-slate-900">{selectedVessel.name}</strong> ({selectedVessel.iceClass})
          </div>

          <div className="flex items-center gap-2">
            {calculatedSuccess && (
              <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Paths Recalculated!
              </span>
            )}
            <button
              type="submit"
              className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs tracking-wider flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer"
            >
              <Compass className="w-4 h-4" />
              <span>Calculate & Show Paths on Map</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
