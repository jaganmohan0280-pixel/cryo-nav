import React from 'react';
import { useApp } from '../context/AppContext';
import {
  Settings,
  Ship,
  Wifi,
  WifiOff,
  Radio,
  RotateCcw,
  CheckCircle2,
  ShieldCheck,
  Compass,
  FileText,
  Sliders,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const {
    vessels,
    selectedVessel,
    setSelectedVessel,
    connectionState,
    setConnectionState,
    resetDemoToInitial,
    setActiveView,
  } = useApp();

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50 text-slate-900">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="border-b border-slate-200 pb-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-600" />
              Vessel Fleet Profiles & Operational System Settings
            </h1>
            <p className="text-xs text-slate-500 mt-1 font-mono">
              Polar Class Certifications, Satellite Connectivity Protocols, and Demo State
            </p>
          </div>
        </div>

        {/* Section 1: Active Vessel Configuration */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-4">
          <div className="border-b border-slate-200 pb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-900 uppercase font-mono tracking-wider flex items-center gap-2">
              <Ship className="w-4 h-4 text-blue-600" /> Active Vessel Fleet Registry
            </span>
            <span className="text-[10px] text-slate-500 font-mono">Select Active Vessel</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {vessels.map((v) => {
              const isSelected = selectedVessel.id === v.id;
              return (
                <div
                  key={v.id}
                  onClick={() => setSelectedVessel(v)}
                  className={`p-4 rounded-lg border cursor-pointer transition shadow-xs ${
                    isSelected
                      ? 'bg-blue-50 border-blue-300'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-xs text-slate-900">{v.name}</span>
                    {isSelected && (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200 font-semibold">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] font-mono text-blue-700 font-semibold mb-3">
                    {v.iceClass}
                  </div>

                  <div className="space-y-1 text-xs font-mono text-slate-600">
                    <div className="flex justify-between">
                      <span>Max Ice Rating:</span>
                      <span className="text-slate-900 font-semibold">{v.maxSeaIceConcentrationPercent}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Cruising Speed:</span>
                      <span className="text-slate-900 font-semibold">{v.cruisingSpeedKnots} kts</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Fuel Burn:</span>
                      <span className="text-slate-900 font-semibold">{v.fuelConsumptionTonsPerDay} t/day</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Draft / Beam:</span>
                      <span className="text-slate-800">{v.draftMeters}m / {v.beamMeters}m</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Displacement:</span>
                      <span className="text-slate-800">{(v.displacementTons ?? 12800).toLocaleString()} t</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 2: API Keys, Telemetry & Credits Status */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-4">
          <div className="border-b border-slate-200 pb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-900 uppercase font-mono tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> API Keys & Environmental Telemetry Providers
            </span>
            <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-medium">
              ZERO PAID CREDITS REQUIRED
            </span>
          </div>

          <div className="space-y-3 font-mono text-xs">
            {/* Gemini AI Card */}
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-900 font-semibold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                  Google Gemini AI (gemini-3.8-flash)
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                  ACTIVE & OPERATIONAL
                </span>
              </div>
              <div className="text-[11px] text-slate-600">
                <strong className="text-slate-800">Environment Variable:</strong> <code className="text-blue-700">GEMINI_API_KEY</code>
              </div>
              <div className="text-[11px] text-slate-600">
                <strong className="text-slate-800">Credits / Payment:</strong> <span className="text-emerald-700 font-semibold">NO CREDITS NEEDED</span>. Google AI Studio provides a free tier with no payment, billing, or credit card required.
              </div>
              <div className="text-[10px] text-slate-500">
                Role: Generates maritime-standard routing decision support and risk reasoning grounded in live environmental context.
              </div>
            </div>

            {/* Open-Meteo Polar Weather Card */}
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-900 font-semibold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                  Open-Meteo Antarctic Weather & Marine Telemetry
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
                  OPEN ACCESS (FREE)
                </span>
              </div>
              <div className="text-[11px] text-slate-600">
                <strong className="text-slate-800">Environment Variable:</strong> None required (Public Open API)
              </div>
              <div className="text-[11px] text-slate-600">
                <strong className="text-slate-800">Credits / Payment:</strong> <span className="text-emerald-700 font-semibold">NO CREDITS NEEDED</span>. Free open access for research, educational, and enterprise use.
              </div>
              <div className="text-[10px] text-slate-500">
                Role: Real-time observational surface wind, swell height, air/water temperature, and currents for polar coordinates.
              </div>
            </div>

            {/* Copernicus & NOAA Card */}
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-900 font-semibold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                  Copernicus Sentinel-1 SAR & NOAA/NSIDC Sea-Ice
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-semibold">
                  PUBLIC SCIENTIFIC
                </span>
              </div>
              <div className="text-[11px] text-slate-600">
                <strong className="text-slate-800">Environment Variable:</strong> <code className="text-slate-600">COPERNICUS_MARINE_USER</code> (Optional, enterprise only)
              </div>
              <div className="text-[11px] text-slate-600">
                <strong className="text-slate-800">Credits / Payment:</strong> <span className="text-emerald-700 font-semibold">NO CREDITS NEEDED</span>. Public Earth observation datasets.
              </div>
              <div className="text-[10px] text-slate-500">
                Role: SAR sea-ice classification, concentration matrices, and high-latitude iceberg tracking catalog.
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Satellite Connectivity & Offline Snapshot */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-4">
          <div className="border-b border-slate-200 pb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-900 uppercase font-mono tracking-wider flex items-center gap-2">
              <Wifi className="w-4 h-4 text-blue-600" /> Satellite Connectivity & Resilience
            </span>
            <span className="text-[10px] text-slate-500 font-mono">Iridium / Starlink Polar Grounding</span>
          </div>

          <p className="text-xs text-slate-600 font-sans leading-relaxed">
            Antarctic navigation frequently experiences severe satellite communication dropouts below 60°S. CRYO NAV provides continuous offline operation using a client-cached environmental state model and deterministic route optimization.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={() => setConnectionState('ONLINE')}
              className={`p-3 rounded-lg border text-left font-mono transition ${
                connectionState === 'ONLINE'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2 text-xs font-semibold mb-1">
                <Wifi className="w-4 h-4 text-emerald-600" /> ONLINE
              </div>
              <div className="text-[10px] opacity-80">Full satellite uplink. Instant observation ingestion.</div>
            </button>

            <button
              onClick={() => setConnectionState('LIMITED')}
              className={`p-3 rounded-lg border text-left font-mono transition ${
                connectionState === 'LIMITED'
                  ? 'bg-amber-50 border-amber-300 text-amber-900 font-semibold'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2 text-xs font-semibold mb-1">
                <Radio className="w-4 h-4 text-amber-600" /> LIMITED BANDWIDTH
              </div>
              <div className="text-[10px] opacity-80">Prioritizes small vector products (&lt;50 MB).</div>
            </button>

            <button
              onClick={() => setConnectionState('OFFLINE')}
              className={`p-3 rounded-lg border text-left font-mono transition ${
                connectionState === 'OFFLINE'
                  ? 'bg-red-50 border-red-300 text-red-900 font-semibold'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2 text-xs font-semibold mb-1">
                <WifiOff className="w-4 h-4 text-red-600" /> OFFLINE (CACHED)
              </div>
              <div className="text-[10px] opacity-80">Operates 100% locally from onboard snapshot.</div>
            </button>
          </div>
        </div>

        {/* Section 4: Reset Demonstration State */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-slate-900 uppercase font-mono tracking-wider">
              Reset Demonstration System State
            </div>
            <p className="text-xs text-slate-500 mt-1 font-sans">
              Restores initial Marguerite Bay mission, resets acquired observations, and clears simulated scenario perturbations.
            </p>
          </div>

          <button
            onClick={() => {
              resetDemoToInitial();
              setActiveView('dashboard');
            }}
            className="px-4 py-2 rounded text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center gap-2 transition shrink-0 shadow-xs"
          >
            <RotateCcw className="w-4 h-4" /> Reset All Demo Data
          </button>
        </div>
      </div>
    </div>
  );
};
