import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { RoutePlannerWidget } from '../components/RoutePlannerWidget';
import { MissionType, RiskPreference, FuelPreference, SpeedPreference, Waypoint } from '../types';
import {
  MapPin,
  Compass,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';

export const MissionPlanningView: React.FC = () => {
  const {
    mission,
    setMission,
    vessels,
    selectedVessel,
    setSelectedVessel,
    setActiveView,
    addAlert,
  } = useApp();

  const [formData, setFormData] = useState({
    title: mission.title,
    vesselId: selectedVessel.id,
    startName: mission.startLocation.name,
    startLat: mission.startLocation.lat,
    startLon: mission.startLocation.lon,
    destName: mission.destination.name,
    destLat: mission.destination.lat,
    destLon: mission.destination.lon,
    missionType: mission.missionType,
    departureTime: mission.departureTime.slice(0, 16),
    priority: mission.priority,
    riskPreference: mission.riskPreference,
    fuelPreference: mission.fuelPreference,
    speedPreference: mission.speedPreference,
    maxSeaIceConcentration: mission.maxSeaIceConcentration,
  });

  const [waypoints, setWaypoints] = useState<Waypoint[]>(mission.researchWaypoints);
  const [newWpName, setNewWpName] = useState('');
  const [newWpLat, setNewWpLat] = useState(-63.5);
  const [newWpLon, setNewWpLon] = useState(-62.0);
  const [newWpStop, setNewWpStop] = useState(2);

  const [savedSuccess, setSavedSuccess] = useState(false);

  // Validation
  const iceLimitExceeded = formData.maxSeaIceConcentration > selectedVessel.maxSeaIceConcentrationPercent;

  const handleVesselChange = (vId: string) => {
    const v = vessels.find((ves) => ves.id === vId);
    if (v) {
      setSelectedVessel(v);
      setFormData((prev) => ({
        ...prev,
        vesselId: vId,
        maxSeaIceConcentration: Math.min(prev.maxSeaIceConcentration, v.maxSeaIceConcentrationPercent),
      }));
    }
  };

  const handleAddWaypoint = () => {
    if (!newWpName.trim()) return;
    const newWp: Waypoint = {
      id: `wp-${Date.now()}`,
      name: newWpName.trim(),
      lat: Number(newWpLat),
      lon: Number(newWpLon),
      order: waypoints.length + 1,
      stopDurationHours: Number(newWpStop),
      type: 'Oceanographic Cast',
    };
    setWaypoints([...waypoints, newWp]);
    setNewWpName('');
  };

  const handleRemoveWaypoint = (id: string) => {
    setWaypoints(waypoints.filter((w) => w.id !== id).map((w, idx) => ({ ...w, order: idx + 1 })));
  };

  const handleSaveMission = (e: React.FormEvent) => {
    e.preventDefault();

    setMission({
      ...mission,
      title: formData.title,
      vesselId: formData.vesselId,
      startLocation: {
        name: formData.startName,
        lat: formData.startLat,
        lon: formData.startLon,
      },
      destination: {
        name: formData.destName,
        lat: formData.destLat,
        lon: formData.destLon,
      },
      missionType: formData.missionType as MissionType,
      departureTime: new Date(formData.departureTime).toISOString(),
      priority: formData.priority as 'Normal' | 'High' | 'Critical',
      riskPreference: formData.riskPreference as RiskPreference,
      fuelPreference: formData.fuelPreference as FuelPreference,
      speedPreference: formData.speedPreference as SpeedPreference,
      maxSeaIceConcentration: formData.maxSeaIceConcentration,
      researchWaypoints: waypoints,
    });

    addAlert({
      severity: 'INFO',
      type: 'ROUTE_DEVIATION',
      title: 'Mission Configuration Updated',
      message: `Mission "${formData.title}" saved. Routes recomputed for vessel ${selectedVessel.name}.`,
    });

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#F5F7F7] font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#DCE7E7] pb-4">
          <div>
            <h1 className="text-xl font-semibold text-[#075563] flex items-center gap-2">
              <MapPin className="w-5 h-5 text-[#2BB9BD]" />
              Antarctic Mission Planning & Vessel Parameters
            </h1>
            <p className="text-xs text-[#63777B] mt-1 font-normal">
              Configure vessel constraints, polar waypoints, risk tolerances, and exclusion zones.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveView('dashboard')}
              className="px-3.5 py-2 rounded-[8px] text-xs font-semibold bg-[#2BB9BD] hover:bg-[#22A8AC] text-white shadow-2xs transition flex items-center gap-1.5"
            >
              <span>View on map</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Ice Capability Validation Warning */}
        {iceLimitExceeded && (
          <div className="p-3.5 rounded-[12px] bg-[#FDECEF] border border-[#F29BA8] text-[#18343A] text-xs flex items-start gap-2.5 shadow-2xs">
            <AlertTriangle className="w-4 h-4 text-[#9A4F5B] shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-[#9A4F5B]">Ice rating constraint violation:</p>
              <p className="text-[13px] text-[#63777B]">
                Selected vessel ({selectedVessel.name}) is certified for up to{' '}
                <strong className="text-[#18343A]">{selectedVessel.maxSeaIceConcentrationPercent}%</strong> sea-ice concentration.
                Mission limit of {formData.maxSeaIceConcentration}% exceeds hull certification.
              </p>
            </div>
          </div>
        )}

        {/* Source & Destination Route Planner Widget */}
        <RoutePlannerWidget
          onRoutesCalculated={() => {
            setFormData((prev) => ({
              ...prev,
              startName: mission.startLocation.name,
              startLat: mission.startLocation.lat,
              startLon: mission.startLocation.lon,
              destName: mission.destination.name,
              destLat: mission.destination.lat,
              destLon: mission.destination.lon,
            }));
          }}
        />

        <form onSubmit={handleSaveMission} className="space-y-6">
          {/* Section 1: Vessel Selection & Constraints */}
          <div className="bg-white p-5 rounded-[12px] border border-[#DCE7E7] space-y-4 shadow-2xs">
            <div className="flex items-center justify-between border-b border-[#DCE7E7] pb-2.5">
              <span className="text-sm font-semibold text-[#075563] flex items-center gap-2">
                <Compass className="w-4 h-4 text-[#2BB9BD]" /> Assigned Polar Vessel
              </span>
              <span className="text-xs text-[#63777B]">Governs route feasibility</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {vessels.map((v) => {
                const isSelected = selectedVessel.id === v.id;
                return (
                  <div
                    key={v.id}
                    onClick={() => handleVesselChange(v.id)}
                    className={`p-3.5 rounded-[10px] border cursor-pointer transition ${
                      isSelected
                        ? 'bg-[#D8F3F1] border-[#2BB9BD] text-[#075563] shadow-2xs font-semibold'
                        : 'bg-white border-[#DCE7E7] text-[#63777B] hover:border-[#2BB9BD]'
                    }`}
                  >
                    <div className="font-semibold text-xs text-[#18343A] mb-1">{v.name}</div>
                    <div className="text-xs text-[#075563] font-semibold mb-2">{v.iceClass}</div>
                    <div className="text-xs space-y-1 text-[#63777B]">
                      <div>Max ice rating: <span className="text-[#18343A] font-semibold">{v.maxSeaIceConcentrationPercent}%</span></div>
                      <div>Cruising speed: <span className="text-[#18343A] font-semibold">{v.cruisingSpeedKnots} kts</span></div>
                      <div>Vessel draft: <span className="text-[#18343A] font-semibold">{v.draftMeters} m</span></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Mission Parameters */}
          <div className="bg-white p-5 rounded-[12px] border border-[#DCE7E7] space-y-4 shadow-2xs">
            <div className="border-b border-[#DCE7E7] pb-2.5">
              <span className="text-sm font-semibold text-[#075563]">
                Mission Logistics & Voyage Profile
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#63777B] mb-1">Mission title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-white border border-[#DCE7E7] rounded-[8px] px-3 py-1.5 text-xs text-[#18343A] focus:outline-none focus:border-[#2BB9BD] font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#63777B] mb-1">Mission type</label>
                <select
                  value={formData.missionType}
                  onChange={(e) => setFormData({ ...formData, missionType: e.target.value as MissionType })}
                  className="w-full bg-white border border-[#DCE7E7] rounded-[8px] px-3 py-1.5 text-xs text-[#18343A] focus:outline-none focus:border-[#2BB9BD] font-sans"
                >
                  <option value="Research">Research (Oceanographic & Glaciology)</option>
                  <option value="Logistics">Logistics (Station Cargo Transfer)</option>
                  <option value="Resupply">Resupply (Fuel & Food Depot)</option>
                  <option value="Emergency">Emergency (Medical / Search & Rescue)</option>
                  <option value="Transit">Transit (Open Sea Passage)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#63777B] mb-1">Departure time (UTC)</label>
                <input
                  type="datetime-local"
                  value={formData.departureTime}
                  onChange={(e) => setFormData({ ...formData, departureTime: e.target.value })}
                  className="w-full bg-white border border-[#DCE7E7] rounded-[8px] px-3 py-1.5 text-xs text-[#18343A] focus:outline-none focus:border-[#2BB9BD] font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#63777B] mb-1">Mission priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                  className="w-full bg-white border border-[#DCE7E7] rounded-[8px] px-3 py-1.5 text-xs text-[#18343A] focus:outline-none focus:border-[#2BB9BD] font-sans"
                >
                  <option value="Normal">Normal Operational Schedule</option>
                  <option value="High">High (Weather Window Constrained)</option>
                  <option value="Critical">Critical Priority</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Route Preference Weights */}
          <div className="bg-white p-5 rounded-[12px] border border-[#DCE7E7] space-y-4 shadow-2xs">
            <div className="border-b border-[#DCE7E7] pb-2.5">
              <span className="text-sm font-semibold text-[#075563]">
                Optimization Policies & Tolerances
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#63777B] mb-1">Risk preference</label>
                <select
                  value={formData.riskPreference}
                  onChange={(e) => setFormData({ ...formData, riskPreference: e.target.value as RiskPreference })}
                  className="w-full bg-white border border-[#DCE7E7] rounded-[8px] px-3 py-1.5 text-xs text-[#18343A] focus:outline-none focus:border-[#2BB9BD] font-sans"
                >
                  <option value="Conservative">Conservative (Avoids all close icebergs)</option>
                  <option value="Balanced">Balanced (Standard multi-objective)</option>
                  <option value="Aggressive">Aggressive (Prioritizes direct leads)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#63777B] mb-1">Fuel preference</label>
                <select
                  value={formData.fuelPreference}
                  onChange={(e) => setFormData({ ...formData, fuelPreference: e.target.value as FuelPreference })}
                  className="w-full bg-white border border-[#DCE7E7] rounded-[8px] px-3 py-1.5 text-xs text-[#18343A] focus:outline-none focus:border-[#2BB9BD] font-sans"
                >
                  <option value="Standard">Standard Economic Speed</option>
                  <option value="High Efficiency">High Efficiency (Lowest burn)</option>
                  <option value="Speed Priority">Speed Priority</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#63777B] mb-1">
                  Max sea-ice limit: {formData.maxSeaIceConcentration}%
                </label>
                <input
                  type="range"
                  min="20"
                  max="90"
                  step="5"
                  value={formData.maxSeaIceConcentration}
                  onChange={(e) => setFormData({ ...formData, maxSeaIceConcentration: Number(e.target.value) })}
                  className="w-full mt-2 accent-[#2BB9BD]"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Research Waypoints */}
          <div className="bg-white p-5 rounded-[12px] border border-[#DCE7E7] space-y-4 shadow-2xs">
            <div className="flex items-center justify-between border-b border-[#DCE7E7] pb-2.5">
              <span className="text-sm font-semibold text-[#075563]">
                Intermediate Research Waypoints ({waypoints.length})
              </span>
              <span className="text-xs text-[#63777B]">Must be incorporated by router</span>
            </div>

            <div className="space-y-2">
              {waypoints.map((wp) => (
                <div
                  key={wp.id}
                  className="flex items-center justify-between p-2.5 rounded-[8px] bg-[#F5F7F7] border border-[#DCE7E7] text-xs font-sans"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-[4px] bg-[#075563] text-white flex items-center justify-center font-semibold text-[11px]">
                      {wp.order}
                    </span>
                    <span className="text-[#18343A] font-semibold">{wp.name}</span>
                    <span className="text-[#63777B] text-xs">
                      ({Math.abs(wp.lat).toFixed(2)}°S, {Math.abs(wp.lon).toFixed(2)}°W)
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-[#63777B] font-medium">{wp.stopDurationHours || 0}h stop</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveWaypoint(wp.id)}
                      className="text-[#8B9A9D] hover:text-[#F29BA8] p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Waypoint Row */}
            <div className="pt-2.5 border-t border-[#DCE7E7] grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
              <input
                type="text"
                placeholder="Waypoint / Station Name"
                value={newWpName}
                onChange={(e) => setNewWpName(e.target.value)}
                className="bg-white border border-[#DCE7E7] rounded-[8px] px-2.5 py-1.5 text-[#18343A] focus:outline-none focus:border-[#2BB9BD]"
              />
              <input
                type="number"
                step="0.05"
                placeholder="Lat (e.g. -63.5)"
                value={newWpLat}
                onChange={(e) => setNewWpLat(Number(e.target.value))}
                className="bg-white border border-[#DCE7E7] rounded-[8px] px-2.5 py-1.5 text-[#18343A]"
              />
              <input
                type="number"
                step="0.05"
                placeholder="Lon (e.g. -62.0)"
                value={newWpLon}
                onChange={(e) => setNewWpLon(Number(e.target.value))}
                className="bg-white border border-[#DCE7E7] rounded-[8px] px-2.5 py-1.5 text-[#18343A]"
              />
              <button
                type="button"
                onClick={handleAddWaypoint}
                className="px-3.5 py-1.5 rounded-[8px] bg-[#2BB9BD] hover:bg-[#22A8AC] text-white font-semibold flex items-center justify-center gap-1.5 transition shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" /> Add waypoint
              </button>
            </div>
          </div>

          {/* Submit / Save Button */}
          <div className="flex items-center justify-between pt-2">
            <div>
              {savedSuccess && (
                <span className="text-xs text-[#3F705A] font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#3F705A]" /> Mission parameters updated & routes recalculated.
                </span>
              )}
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 rounded-[8px] text-xs font-semibold bg-[#2BB9BD] hover:bg-[#22A8AC] text-white shadow-2xs transition flex items-center gap-2"
            >
              <Compass className="w-4 h-4" />
              Save Mission & Recalculate
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

