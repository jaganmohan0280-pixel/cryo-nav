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
    <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#F5F7F7] text-[#18343A] font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="border-b border-[#DCE7E7] pb-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-[#075563] flex items-center gap-2">
              <Settings className="w-5 h-5 text-[#2BB9BD]" />
              Vessel Fleet Profiles & Operational System Settings
            </h1>
            <p className="text-xs text-[#63777B] mt-1 font-normal">
              Polar Class Certifications, Satellite Connectivity Protocols, and Demo State
            </p>
          </div>
        </div>

        {/* Section 1: Active Vessel Configuration */}
        <div className="bg-white p-5 rounded-[12px] border border-[#DCE7E7] space-y-4 shadow-2xs">
          <div className="border-b border-[#DCE7E7] pb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-[#075563] flex items-center gap-2">
              <Ship className="w-4 h-4 text-[#2BB9BD]" /> Active Vessel Fleet Registry
            </span>
            <span className="text-[10px] text-[#63777B]">Select Active Vessel</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {vessels.map((v) => {
              const isSelected = selectedVessel.id === v.id;
              return (
                <div
                  key={v.id}
                  onClick={() => setSelectedVessel(v)}
                  className={`p-4 rounded-[10px] border cursor-pointer transition ${
                    isSelected
                      ? 'bg-[#D8F3F1] border-[#2BB9BD] text-[#075563] shadow-2xs font-semibold'
                      : 'bg-white border-[#DCE7E7] text-[#63777B] hover:border-[#2BB9BD]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-xs text-[#18343A]">{v.name}</span>
                    {isSelected && (
                      <span className="text-[9px] font-semibold px-2 py-0.5 rounded-[4px] bg-[#075563] text-white">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-[#075563] font-semibold mb-3">
                    {v.iceClass}
                  </div>

                  <div className="space-y-1 text-xs text-[#63777B]">
                    <div className="flex justify-between">
                      <span>Max Ice Rating:</span>
                      <span className="text-[#18343A] font-semibold">{v.maxSeaIceConcentrationPercent}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Cruising Speed:</span>
                      <span className="text-[#18343A] font-semibold">{v.cruisingSpeedKnots} kts</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Fuel Burn:</span>
                      <span className="text-[#18343A] font-semibold">{v.fuelConsumptionTonsPerDay} t/day</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Draft / Beam:</span>
                      <span className="text-[#18343A] font-medium">{v.draftMeters}m / {v.beamMeters}m</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Displacement:</span>
                      <span className="text-[#18343A] font-medium">{(v.displacementTons ?? 12800).toLocaleString()} t</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 2: API Keys, Telemetry & Credits Status */}
        <div className="bg-white p-5 rounded-[12px] border border-[#DCE7E7] space-y-4 shadow-2xs">
          <div className="border-b border-[#DCE7E7] pb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-[#075563] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#3F705A]" /> API Keys & Environmental Telemetry Providers
            </span>
            <span className="text-[10px] text-[#3F705A] bg-[#E8F7F1] px-2.5 py-0.5 rounded-[6px] border border-[#A9E2CF] font-semibold">
              ZERO PAID CREDITS REQUIRED
            </span>
          </div>

          <div className="space-y-3 text-xs">
            {/* Gemini AI Card */}
            <div className="p-3.5 rounded-[8px] bg-[#F5F7F7] border border-[#DCE7E7] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[#18343A] font-semibold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#3F705A]"></span>
                  Google Gemini AI (gemini-3.8-flash)
                </span>
                <span className="text-[10px] px-2.5 py-0.5 rounded-[6px] bg-[#E8F7F1] text-[#3F705A] border border-[#A9E2CF] font-semibold">
                  ACTIVE & OPERATIONAL
                </span>
              </div>
              <div className="text-[11px] text-[#63777B]">
                <strong className="text-[#18343A]">Environment Variable:</strong> <code className="text-[#075563]">GEMINI_API_KEY</code>
              </div>
              <div className="text-[11px] text-[#63777B]">
                <strong className="text-[#18343A]">Credits / Payment:</strong> <span className="text-[#3F705A] font-semibold">NO CREDITS NEEDED</span>. Google AI Studio provides a free tier with no payment, billing, or credit card required.
              </div>
              <div className="text-[10px] text-[#8B9A9D]">
                Role: Generates maritime-standard routing decision support and risk reasoning grounded in live environmental context.
              </div>
            </div>

            {/* Open-Meteo Polar Weather Card */}
            <div className="p-3.5 rounded-[8px] bg-[#F5F7F7] border border-[#DCE7E7] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[#18343A] font-semibold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#3F705A]"></span>
                  Open-Meteo Antarctic Weather & Marine Telemetry
                </span>
                <span className="text-[10px] px-2.5 py-0.5 rounded-[6px] bg-[#E8F8F6] text-[#075563] border border-[#DCE7E7] font-semibold">
                  OPEN ACCESS (FREE)
                </span>
              </div>
              <div className="text-[11px] text-[#63777B]">
                <strong className="text-[#18343A]">Environment Variable:</strong> None required (Public Open API)
              </div>
              <div className="text-[11px] text-[#63777B]">
                <strong className="text-[#18343A]">Credits / Payment:</strong> <span className="text-[#3F705A] font-semibold">NO CREDITS NEEDED</span>. Free open access for research, educational, and enterprise use.
              </div>
              <div className="text-[10px] text-[#8B9A9D]">
                Role: Real-time observational surface wind, swell height, air/water temperature, and currents for polar coordinates.
              </div>
            </div>

            {/* Copernicus & NOAA Card */}
            <div className="p-3.5 rounded-[8px] bg-[#F5F7F7] border border-[#DCE7E7] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[#18343A] font-semibold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#3F705A]"></span>
                  Copernicus Sentinel-1 SAR & NOAA/NSIDC Sea-Ice
                </span>
                <span className="text-[10px] px-2.5 py-0.5 rounded-[6px] bg-[#E8F8F6] text-[#63777B] font-semibold">
                  PUBLIC SCIENTIFIC
                </span>
              </div>
              <div className="text-[11px] text-[#63777B]">
                <strong className="text-[#18343A]">Environment Variable:</strong> <code className="text-[#63777B]">COPERNICUS_MARINE_USER</code> (Optional, enterprise only)
              </div>
              <div className="text-[11px] text-[#63777B]">
                <strong className="text-[#18343A]">Credits / Payment:</strong> <span className="text-[#3F705A] font-semibold">NO CREDITS NEEDED</span>. Public Earth observation datasets.
              </div>
              <div className="text-[10px] text-[#8B9A9D]">
                Role: SAR sea-ice classification, concentration matrices, and high-latitude iceberg tracking catalog.
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Satellite Connectivity & Offline Snapshot */}
        <div className="bg-white p-5 rounded-[12px] border border-[#DCE7E7] space-y-4 shadow-2xs">
          <div className="border-b border-[#DCE7E7] pb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-[#075563] flex items-center gap-2">
              <Wifi className="w-4 h-4 text-[#2BB9BD]" /> Satellite Connectivity & Resilience
            </span>
            <span className="text-[10px] text-[#63777B]">Iridium / Starlink Polar Grounding</span>
          </div>

          <p className="text-xs text-[#63777B] font-normal leading-relaxed">
            Antarctic navigation frequently experiences severe satellite communication dropouts below 60°S. CRYO NAV provides continuous offline operation using a client-cached environmental state model and deterministic route optimization.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={() => setConnectionState('ONLINE')}
              className={`p-3 rounded-[8px] border text-left transition ${
                connectionState === 'ONLINE'
                  ? 'bg-[#E8F7F1] border-[#A9E2CF] text-[#3F705A] font-semibold'
                  : 'bg-[#F5F7F7] border-[#DCE7E7] text-[#63777B] hover:bg-[#E8F8F6]'
              }`}
            >
              <div className="flex items-center gap-2 text-xs font-semibold mb-1">
                <Wifi className="w-4 h-4 text-[#3F705A]" /> ONLINE
              </div>
              <div className="text-[10px] opacity-80">Full satellite uplink. Instant observation ingestion.</div>
            </button>

            <button
              onClick={() => setConnectionState('LIMITED')}
              className={`p-3 rounded-[8px] border text-left transition ${
                connectionState === 'LIMITED'
                  ? 'bg-[#FFF7DE] border-[#F6D77A] text-[#8A6A22] font-semibold'
                  : 'bg-[#F5F7F7] border-[#DCE7E7] text-[#63777B] hover:bg-[#E8F8F6]'
              }`}
            >
              <div className="flex items-center gap-2 text-xs font-semibold mb-1">
                <Radio className="w-4 h-4 text-[#8A6A22]" /> LIMITED BANDWIDTH
              </div>
              <div className="text-[10px] opacity-80">Prioritizes small vector products (&lt;50 MB).</div>
            </button>

            <button
              onClick={() => setConnectionState('OFFLINE')}
              className={`p-3 rounded-[8px] border text-left transition ${
                connectionState === 'OFFLINE'
                  ? 'bg-[#FDECEF] border-[#F29BA8] text-[#9A4F5B] font-semibold'
                  : 'bg-[#F5F7F7] border-[#DCE7E7] text-[#63777B] hover:bg-[#E8F8F6]'
              }`}
            >
              <div className="flex items-center gap-2 text-xs font-semibold mb-1">
                <WifiOff className="w-4 h-4 text-[#9A4F5B]" /> OFFLINE (CACHED)
              </div>
              <div className="text-[10px] opacity-80">Operates 100% locally from onboard snapshot.</div>
            </button>
          </div>
        </div>

        {/* Section 4: Reset Demonstration State */}
        <div className="bg-white p-5 rounded-[12px] border border-[#DCE7E7] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
          <div>
            <div className="text-xs font-semibold text-[#075563]">
              Reset Demonstration System State
            </div>
            <p className="text-xs text-[#63777B] mt-1 font-normal">
              Restores initial Marguerite Bay mission, resets acquired observations, and clears simulated scenario perturbations.
            </p>
          </div>

          <button
            onClick={() => {
              resetDemoToInitial();
              setActiveView('dashboard');
            }}
            className="px-4 py-2 rounded-[8px] text-xs font-semibold bg-[#2BB9BD] hover:bg-[#22A8AC] text-white flex items-center justify-center gap-2 transition shrink-0 cursor-pointer shadow-2xs"
          >
            <RotateCcw className="w-4 h-4" /> Reset All Demo Data
          </button>
        </div>
      </div>
    </div>
  );
};
