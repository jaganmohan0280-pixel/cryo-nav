import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Compass, MapPin, Navigation, CheckCircle2, ArrowRight, Search, X, AlertCircle } from 'lucide-react';
import { AUTHORITATIVE_RESEARCH_STATIONS, ResearchStation, searchStations } from '../data/researchStations';

interface Props {
  compact?: boolean;
  onRoutesCalculated?: () => void;
}

export const RoutePlannerWidget: React.FC<Props> = ({ compact = false, onRoutesCalculated }) => {
  const { mission, setMission, addAlert, selectedVessel } = useApp();

  const [sourceSearch, setSourceSearch] = useState<string>('');
  const [destSearch, setDestSearch] = useState<string>('');
  const [showSourceDropdown, setShowSourceDropdown] = useState<boolean>(false);
  const [showDestDropdown, setShowDestDropdown] = useState<boolean>(false);

  const [selectedSourceId, setSelectedSourceId] = useState<string>(
    AUTHORITATIVE_RESEARCH_STATIONS.find((s) => Math.abs(s.lat - mission.startLocation.lat) < 0.2 && Math.abs(s.lon - mission.startLocation.lon) < 0.2)?.id ||
      'st-drake-entry'
  );

  const [selectedDestId, setSelectedDestId] = useState<string>(
    AUTHORITATIVE_RESEARCH_STATIONS.find((s) => Math.abs(s.lat - mission.destination.lat) < 0.2 && Math.abs(s.lon - mission.destination.lon) < 0.2)?.id ||
      'st-rothera'
  );

  const [isModifiedSinceCalc, setIsModifiedSinceCalc] = useState<boolean>(false);
  const [calculatedSuccess, setCalculatedSuccess] = useState<boolean>(false);

  const filteredSourceStations = useMemo(() => searchStations(sourceSearch), [sourceSearch]);
  const filteredDestStations = useMemo(() => searchStations(destSearch), [destSearch]);

  const selectedSource = AUTHORITATIVE_RESEARCH_STATIONS.find((s) => s.id === selectedSourceId) || AUTHORITATIVE_RESEARCH_STATIONS[0];
  const selectedDest = AUTHORITATIVE_RESEARCH_STATIONS.find((s) => s.id === selectedDestId) || AUTHORITATIVE_RESEARCH_STATIONS[1];

  const isIdentical = selectedSource.id === selectedDest.id || (selectedSource.lat === selectedDest.lat && selectedSource.lon === selectedDest.lon);

  const handleSelectSource = (st: ResearchStation) => {
    setSelectedSourceId(st.id);
    setSourceSearch('');
    setShowSourceDropdown(false);
    setIsModifiedSinceCalc(true);
  };

  const handleSelectDest = (st: ResearchStation) => {
    setSelectedDestId(st.id);
    setDestSearch('');
    setShowDestDropdown(false);
    setIsModifiedSinceCalc(true);
  };

  const handleRunRouting = (e: React.FormEvent) => {
    e.preventDefault();
    if (isIdentical) return;

    setMission({
      ...mission,
      startLocation: {
        name: `${selectedSource.name} (${selectedSource.country})`,
        lat: selectedSource.lat,
        lon: selectedSource.lon,
      },
      destination: {
        name: `${selectedDest.name} (${selectedDest.country})`,
        lat: selectedDest.lat,
        lon: selectedDest.lon,
      },
    });

    addAlert({
      severity: 'INFO',
      type: 'ROUTE_DEVIATION',
      title: 'Navigation Route Calculated',
      message: `Origin: ${selectedSource.name} → Destination: ${selectedDest.name}. Multi-objective route alternatives computed.`,
    });

    setCalculatedSuccess(true);
    setIsModifiedSinceCalc(false);
    setTimeout(() => setCalculatedSuccess(false), 3000);

    if (onRoutesCalculated) {
      onRoutesCalculated();
    }
  };

  return (
    <div className={`bg-white rounded-[12px] border border-[#DCE7E7] font-sans shadow-subtle ${compact ? 'p-3.5 text-xs' : 'p-5 text-xs'}`}>
      <div className="flex items-center justify-between border-b border-[#DCE7E7] pb-3 mb-4">
        <div className="flex items-center gap-2.5">
          <Navigation className="w-4 h-4 text-[#2BB9BD]" />
          <span className="font-bold text-[#075563] tracking-tight text-xs sm:text-sm">
            Antarctic Route & Station Optimizer
          </span>
        </div>
        <span className="text-[11px] px-2.5 py-0.5 rounded-[6px] bg-[#E8F8F6] text-[#075563] border border-[#DCE7E7] font-semibold">
          Authoritative Station Dataset
        </span>
      </div>

      <form onSubmit={handleRunRouting} className="space-y-4">
        <div className={`grid grid-cols-1 ${compact ? 'md:grid-cols-2' : 'md:grid-cols-2'} gap-4`}>
          {/* SOURCE (ORIGIN) SELECTOR */}
          <div className="bg-[#E8F8F6]/40 p-3.5 rounded-[10px] border border-[#DCE7E7] space-y-2 relative">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#075563] flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#2BB9BD]" /> Origin (Departure)
              </label>
              <span className="text-xs text-[#63777B] font-medium">{selectedSource.country}</span>
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setShowSourceDropdown(!showSourceDropdown)}
                className="w-full bg-white border border-[#DCE7E7] rounded-[8px] p-2.5 text-left text-xs text-[#18343A] focus:outline-none focus:border-[#2BB9BD] flex items-center justify-between shadow-2xs"
              >
                <div className="truncate pr-2">
                  <span className="font-bold text-[#18343A]">{selectedSource.name}</span>
                  <span className="text-[11px] text-[#63777B] block truncate">{selectedSource.region}</span>
                </div>
                <Search className="w-3.5 h-3.5 text-[#8B9A9D] shrink-0" />
              </button>

              {showSourceDropdown && (
                <div className="absolute top-full left-0 w-full mt-1 bg-white border border-[#DCE7E7] rounded-[10px] shadow-lg z-50 p-2 space-y-2 max-h-60 overflow-hidden flex flex-col font-sans">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search stations, countries, regions..."
                      value={sourceSearch}
                      onChange={(e) => setSourceSearch(e.target.value)}
                      className="w-full bg-[#F5F7F7] border border-[#DCE7E7] rounded-[6px] pl-7 pr-7 py-1.5 text-xs text-[#18343A] focus:outline-none focus:border-[#2BB9BD]"
                      autoFocus
                    />
                    <Search className="w-3.5 h-3.5 text-[#8B9A9D] absolute left-2 top-2.5" />
                    {sourceSearch && (
                      <button
                        type="button"
                        onClick={() => setSourceSearch('')}
                        className="absolute right-2 top-2.5 text-[#8B9A9D] hover:text-[#18343A]"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="overflow-y-auto max-h-44 space-y-1 pr-1 text-xs">
                    {filteredSourceStations.map((st) => (
                      <div
                        key={st.id}
                        onClick={() => handleSelectSource(st)}
                        className={`p-2 rounded-[6px] cursor-pointer transition flex items-center justify-between ${
                          selectedSourceId === st.id ? 'bg-[#D8F3F1] text-[#075563] font-bold border border-[#2BB9BD]/40' : 'hover:bg-[#E8F8F6] text-[#18343A]'
                        }`}
                      >
                        <div>
                          <div className="font-semibold text-[#18343A]">{st.name}</div>
                          <div className="text-[11px] text-[#63777B]">{st.country} • {st.region}</div>
                        </div>
                        {st.isInlandForbidden && (
                          <span className="text-[10px] px-1.5 py-0.3 bg-[#FFF7DE] text-[#8A6A22] rounded-[4px] border border-[#F6D77A] font-semibold">Inland</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="text-xs text-[#63777B] pt-0.5 flex justify-between">
              <span>Coords: <strong className="text-[#18343A] font-semibold">{Math.abs(selectedSource.lat).toFixed(2)}°S, {Math.abs(selectedSource.lon).toFixed(2)}°{selectedSource.lon < 0 ? 'W' : 'E'}</strong></span>
              <span className="text-[#8B9A9D]">{selectedSource.isCoastal ? 'Coastal Station' : 'Inland'}</span>
            </div>
          </div>

          {/* DESTINATION SELECTOR */}
          <div className="bg-[#E8F8F6]/40 p-3.5 rounded-[10px] border border-[#DCE7E7] space-y-2 relative">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#075563] flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#3F705A]" /> Destination (Arrival)
              </label>
              <span className="text-xs text-[#63777B] font-medium">{selectedDest.country}</span>
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setShowDestDropdown(!showDestDropdown)}
                className="w-full bg-white border border-[#DCE7E7] rounded-[8px] p-2.5 text-left text-xs text-[#18343A] focus:outline-none focus:border-[#2BB9BD] flex items-center justify-between shadow-2xs"
              >
                <div className="truncate pr-2">
                  <span className="font-bold text-[#18343A]">{selectedDest.name}</span>
                  <span className="text-[11px] text-[#63777B] block truncate">{selectedDest.region}</span>
                </div>
                <Search className="w-3.5 h-3.5 text-[#8B9A9D] shrink-0" />
              </button>

              {showDestDropdown && (
                <div className="absolute top-full left-0 w-full mt-1 bg-white border border-[#DCE7E7] rounded-[10px] shadow-lg z-50 p-2 space-y-2 max-h-60 overflow-hidden flex flex-col font-sans">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search stations, countries, regions..."
                      value={destSearch}
                      onChange={(e) => setDestSearch(e.target.value)}
                      className="w-full bg-[#F5F7F7] border border-[#DCE7E7] rounded-[6px] pl-7 pr-7 py-1.5 text-xs text-[#18343A] focus:outline-none focus:border-[#2BB9BD]"
                      autoFocus
                    />
                    <Search className="w-3.5 h-3.5 text-[#8B9A9D] absolute left-2 top-2.5" />
                    {destSearch && (
                      <button
                        type="button"
                        onClick={() => setDestSearch('')}
                        className="absolute right-2 top-2.5 text-[#8B9A9D] hover:text-[#18343A]"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="overflow-y-auto max-h-44 space-y-1 pr-1 text-xs">
                    {filteredDestStations.map((st) => (
                      <div
                        key={st.id}
                        onClick={() => handleSelectDest(st)}
                        className={`p-2 rounded-[6px] cursor-pointer transition flex items-center justify-between ${
                          selectedDestId === st.id ? 'bg-[#E8F7F1] text-[#3F705A] font-bold border border-[#A9E2CF]' : 'hover:bg-[#E8F8F6] text-[#18343A]'
                        }`}
                      >
                        <div>
                          <div className="font-semibold text-[#18343A]">{st.name}</div>
                          <div className="text-[11px] text-[#63777B]">{st.country} • {st.region}</div>
                        </div>
                        {st.isInlandForbidden && (
                          <span className="text-[10px] px-1.5 py-0.3 bg-[#FFF7DE] text-[#8A6A22] rounded-[4px] border border-[#F6D77A] font-semibold">Inland</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="text-xs text-[#63777B] pt-0.5 flex justify-between">
              <span>Coords: <strong className="text-[#18343A] font-semibold">{Math.abs(selectedDest.lat).toFixed(2)}°S, {Math.abs(selectedDest.lon).toFixed(2)}°{selectedDest.lon < 0 ? 'W' : 'E'}</strong></span>
              <span className="text-[#8B9A9D]">{selectedDest.isCoastal ? 'Coastal Station' : 'Inland'}</span>
            </div>
          </div>
        </div>

        {/* IDENTICAL STATION WARNING */}
        {isIdentical && (
          <div className="p-3 bg-[#FDECEF] border border-[#F29BA8] rounded-[8px] text-[#9A4F5B] text-xs flex items-center gap-2.5 font-medium">
            <AlertCircle className="w-4 h-4 text-[#9A4F5B] shrink-0" />
            <span>Origin and destination research stations cannot be identical. Please select different stations.</span>
          </div>
        )}

        {/* STALE MISSION / MODIFIED NOTICE */}
        {isModifiedSinceCalc && !isIdentical && (
          <div className="p-3 bg-[#FFF7DE] border border-[#F6D77A] rounded-[8px] text-[#8A6A22] text-xs flex items-center gap-2.5 font-medium">
            <AlertCircle className="w-4 h-4 text-[#8A6A22] shrink-0" />
            <span>Mission parameters modified — click <strong>Calculate & show paths on map</strong> to re-evaluate the voyage corridor.</span>
          </div>
        )}

        {/* Action Button & Status */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div className="text-xs text-[#63777B]">
            Assigned vessel: <strong className="text-[#075563] font-semibold">{selectedVessel.name}</strong> ({selectedVessel.iceClass})
          </div>

          <div className="flex items-center gap-2.5">
            {calculatedSuccess && (
              <span className="text-xs text-[#3F705A] font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-[#3F705A]" /> Navigation paths calculated!
              </span>
            )}
            <button
              type="submit"
              disabled={isIdentical}
              className={`px-4 py-2 rounded-[8px] font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer ${
                isIdentical
                  ? 'bg-[#F5F7F7] text-[#8B9A9D] cursor-not-allowed border border-[#DCE7E7]'
                  : 'bg-[#2BB9BD] hover:bg-[#22A8AC] text-white shadow-xs'
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>Calculate & show paths on map</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
