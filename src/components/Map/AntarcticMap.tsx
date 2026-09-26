import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import L from 'leaflet';
import { useApp } from '../../context/AppContext';
import { ANTARCTIC_STATIONS } from '../../data/syntheticAntarcticData';
import { RoutePlannerWidget } from '../RoutePlannerWidget';
import { calculateDistanceToRouteNm, calculateRouteCorridorPolygon } from '../../services/riskEngine';
import { forecastSeaIceField } from '../../services/seaIceModel';
import { SelectedAnalysisArea, AreaConditionReport } from '../../types';
import {
  filterCandidatesToArea,
  findSatelliteCoverageForArea,
  generateAreaConditionReport,
  haversineDistanceKm,
} from '../../data/analysis/areaSarAnalysisEngine';
import {
  Layers,
  Compass,
  AlertTriangle,
  Eye,
  Activity,
  Maximize2,
  Info,
  Calendar,
  Clock,
  ShieldAlert,
  Navigation,
  Crosshair,
  Map as MapIcon,
  Globe,
  Satellite,
  X,
  Target,
  Search,
  BarChart2,
  Shield,
  MapPin,
} from 'lucide-react';


import { UncertaintyEvaluationResult } from '../../services/uncertaintyEngine';

interface TileConfig {
  name: string;
  url: string;
  maxZoom: number;
  subdomains?: string | string[];
  attribution: string;
}

const TILE_SERVERS: Record<string, TileConfig> = {
  satellite: {
    name: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 18,
    subdomains: 'abc',
    attribution: '&copy; Esri World Imagery',
  },
  dark: {
    name: 'Dark Tactical',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    maxZoom: 19,
    subdomains: 'abcd',
    attribution: '&copy; CARTO',
  },
  ocean: {
    name: 'Ocean Relief',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 13,
    subdomains: 'abc',
    attribution: '&copy; Esri Ocean',
  },
  osm: {
    name: 'Standard',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    maxZoom: 19,
    subdomains: 'abc',
    attribution: '&copy; OpenStreetMap',
  },
};

export interface AntarcticMapProps {
  mode?: 'default' | 'trajectory' | 'seaice';
  selectedCellId?: string;
  onCellSelect?: (cellId: string) => void;
  uncertaintyEvaluations?: UncertaintyEvaluationResult[] | null;
}

export const AntarcticMap: React.FC<AntarcticMapProps> = ({
  mode = 'default',
  selectedCellId,
  onCellSelect,
  uncertaintyEvaluations,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const baseTileLayerRef = useRef<L.TileLayer | null>(null);

  const [basemapMode, setBasemapMode] = useState<'satellite' | 'dark' | 'ocean' | 'osm'>('satellite');
  const [seaIceShowDrift, setSeaIceShowDrift] = useState<boolean>(true);
  const [seaIceShowUncertainty, setSeaIceShowUncertainty] = useState<boolean>(true);
  const [sarCandidatesList, setSarCandidatesList] = useState<any[]>([]);
  const [sarConfirmationsMap, setSarConfirmationsMap] = useState<Record<string, any>>({});
  const [sarDisplayMode, setSarDisplayMode] = useState<'clustered' | 'top' | 'area'>('clustered');
  const [sarMinScore, setSarMinScore] = useState<number>(30);
  const [selectedSarCandidateId, setSelectedSarCandidateId] = useState<string | null>(null);
  const [mapZoom, setMapZoom] = useState<number>(5);

  // Layer groups refs to update without re-initializing the entire map
  const seaIceLayerRef = useRef<L.LayerGroup>(L.layerGroup());
  const icebergsLayerRef = useRef<L.LayerGroup>(L.layerGroup());
  const trajectoriesLayerRef = useRef<L.LayerGroup>(L.layerGroup());
  const uncertaintyLayerRef = useRef<L.LayerGroup>(L.layerGroup());
  const riskLayerRef = useRef<L.LayerGroup>(L.layerGroup());
  const weatherLayerRef = useRef<L.LayerGroup>(L.layerGroup());
  const oceanLayerRef = useRef<L.LayerGroup>(L.layerGroup());
  const routesLayerRef = useRef<L.LayerGroup>(L.layerGroup());
  const vesselLayerRef = useRef<L.LayerGroup>(L.layerGroup());
  const stationsLayerRef = useRef<L.LayerGroup>(L.layerGroup());
  const sarCandidatesLayerRef = useRef<L.LayerGroup>(L.layerGroup());
  const selectedAreaLayerRef = useRef<L.LayerGroup>(L.layerGroup());

  // Phase 7C.4-UX Redesign — Area-Centric SAR Analysis State
  const [isAreaSelectionActive, setIsAreaSelectionActive] = useState<boolean>(false);
  const [selectedArea, setSelectedArea] = useState<SelectedAnalysisArea | null>(null);
  const [areaRadiusKm, setAreaRadiusKm] = useState<number>(25);
  const [activeAreaConditionReport, setActiveAreaConditionReport] = useState<AreaConditionReport | null>(null);
  const [showAreaSarEvidence, setShowAreaSarEvidence] = useState<boolean>(false);


  const {
    mission,
    selectedVessel,
    icebergs,
    seaIceCells,
    weather,
    currents,
    routes,
    selectedRouteId,
    setSelectedRouteId,
    mapLayers,
    toggleMapLayer,
    gpsTracking,
    forecastHorizonHours,
    selectedIcebergId,
    setSelectedIcebergId,
    activeView,
    environmentalMode,
    realSeaIceProvenance,
    realWeather,
    realWeatherGrid,
    unifiedEnvironment,
    decisionConfidence,
    activeCounterfactualResult,
    selectedAcquisitionFootprintId,
    dataAcquisitionRecommendations,
    satelliteProducts,
    cdseCatalogueItems,
  } = useApp();

  const isTrajectoryMode = mode === 'trajectory' || activeView === 'icebergs';
  const isSeaIceMode = mode === 'seaice' || activeView === 'seaice';

  // Compute forecasted sea-ice cells dynamically based on selected forecast horizon
  const activeSeaIceCells = useMemo(() => {
    if (!isSeaIceMode) return seaIceCells;
    return forecastSeaIceField(seaIceCells, weather, forecastHorizonHours, 1.0);
  }, [isSeaIceMode, seaIceCells, weather, forecastHorizonHours]);

  // Initialize Leaflet Map once
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [-64.5, -64.2],
      zoom: 5,
      minZoom: 3,
      maxZoom: 14,
      zoomControl: false,
      attributionControl: true,
    });

    // Default to Satellite tiles
    const initialTile = L.tileLayer(TILE_SERVERS.satellite.url, {
      maxZoom: TILE_SERVERS.satellite.maxZoom,
      subdomains: TILE_SERVERS.satellite.subdomains || 'abc',
      attribution: TILE_SERVERS.satellite.attribution,
    }).addTo(map);
    baseTileLayerRef.current = initialTile;

    // Zoom controls in bottom right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Scale in nautical miles & kilometers
    L.control.scale({ imperial: true, metric: true, position: 'bottomleft' }).addTo(map);

    // Add all layer groups to map
    seaIceLayerRef.current.addTo(map);
    riskLayerRef.current.addTo(map);
    oceanLayerRef.current.addTo(map);
    weatherLayerRef.current.addTo(map);
    uncertaintyLayerRef.current.addTo(map);
    trajectoriesLayerRef.current.addTo(map);
    routesLayerRef.current.addTo(map);
    stationsLayerRef.current.addTo(map);
    icebergsLayerRef.current.addTo(map);
    sarCandidatesLayerRef.current.addTo(map);
    vesselLayerRef.current.addTo(map);

    mapInstanceRef.current = map;

    // Track map zoom level dynamically
    map.on('zoomend', () => {
      setMapZoom(map.getZoom());
    });

    // Setup robust resize observer
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(mapContainerRef.current);

    const t1 = setTimeout(() => map.invalidateSize(), 100);
    const t2 = setTimeout(() => map.invalidateSize(), 500);
    const t3 = setTimeout(() => map.invalidateSize(), 1200);

    return () => {
      resizeObserver.disconnect();
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Basemap when user toggles
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    if (baseTileLayerRef.current) {
      mapInstanceRef.current.removeLayer(baseTileLayerRef.current);
    }
    const tileConfig = TILE_SERVERS[basemapMode] || TILE_SERVERS.satellite;
    const tileLayer = L.tileLayer(tileConfig.url, {
      maxZoom: tileConfig.maxZoom,
      subdomains: tileConfig.subdomains || 'abc',
      attribution: tileConfig.attribution,
    });
    tileLayer.addTo(mapInstanceRef.current);
    baseTileLayerRef.current = tileLayer;
    mapInstanceRef.current.invalidateSize();
  }, [basemapMode]);

  const [showPlannerOverlay, setShowPlannerOverlay] = useState<boolean>(false);

  // Auto-fit map bounds whenever mode or target selection changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (isSeaIceMode) {
      const bounds = L.latLngBounds([
        [-59.0, -70.0],
        [-68.5, -56.0],
      ]);
      mapInstanceRef.current.fitBounds(bounds, { padding: [30, 30], maxZoom: 7, animate: true });
      return;
    }

    if (isTrajectoryMode) {
      const selectedBerg = icebergs.find((b) => b.id === selectedIcebergId) || icebergs[0];
      if (selectedBerg) {
        const points: [number, number][] = [
          [selectedBerg.lat, selectedBerg.lon],
          ...(selectedBerg.predictedTrajectory?.map((pt) => [pt.lat, pt.lon] as [number, number]) || []),
        ];
        if (points.length > 0) {
          const bounds = L.latLngBounds(points);
          mapInstanceRef.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 8, animate: true });
          return;
        }
      }
    }

    if (!routes || routes.length === 0) return;
    const allPoints: [number, number][] = [
      [mission.startLocation.lat, mission.startLocation.lon],
      [mission.destination.lat, mission.destination.lon],
    ];
    routes.forEach((r) => r.waypoints.forEach((wp) => allPoints.push(wp)));

    if (allPoints.length > 0) {
      const bounds = L.latLngBounds(allPoints);
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 9, animate: true });
    }
  }, [mission.startLocation, mission.destination, routes, selectedIcebergId, isTrajectoryMode, isSeaIceMode, icebergs]);

  const handleCenterVessel = () => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.setView([gpsTracking.currentLat, gpsTracking.currentLon], 7, { animate: true });
  };

  const handleResetVoyageView = () => {
    if (!mapInstanceRef.current || !routes || routes.length === 0) return;
    const allPoints: [number, number][] = [
      [mission.startLocation.lat, mission.startLocation.lon],
      [mission.destination.lat, mission.destination.lon],
    ];
    routes.forEach((r) => r.waypoints.forEach((wp) => allPoints.push(wp)));
    const bounds = L.latLngBounds(allPoints);
    mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 9, animate: true });
  };

  const handleExecuteAreaAnalysis = useCallback(() => {
    if (!selectedArea) return;
    const report = generateAreaConditionReport(
      selectedArea,
      sarCandidatesList,
      {},
      seaIceCells,
      weather,
      currents,
      cdseCatalogueItems,
      {},
      dataAcquisitionRecommendations
    );
    setActiveAreaConditionReport(report);
  }, [
    selectedArea,
    sarCandidatesList,
    seaIceCells,
    weather,
    currents,
    cdseCatalogueItems,
    dataAcquisitionRecommendations,
  ]);

  const handleAnalyzeAhead = useCallback((distKm: number = 25) => {
    const vesselLat = gpsTracking?.currentLat || mission.startLocation.lat;
    const vesselLon = gpsTracking?.currentLon || mission.startLocation.lon;

    const centerLat = vesselLat - (distKm / 111.0) * 0.707;
    const centerLon = vesselLon + (distKm / (111.0 * Math.cos((vesselLat * Math.PI) / 180))) * 0.707;

    const area: SelectedAnalysisArea = {
      id: `ahead-${Date.now()}`,
      type: 'CORRIDOR_AHEAD',
      name: `Corridor Ahead (${distKm} km)`,
      centerLat,
      centerLon,
      radiusKm: distKm,
      bounds: {
        minLat: centerLat - distKm / 111.0,
        maxLat: centerLat + distKm / 111.0,
        minLon: centerLon - distKm / (111.0 * Math.cos((centerLat * Math.PI) / 180)),
        maxLon: centerLon + distKm / (111.0 * Math.cos((centerLat * Math.PI) / 180)),
      },
      selectedAt: new Date().toISOString(),
    };

    setSelectedArea(area);
    setIsAreaSelectionActive(false);

    const report = generateAreaConditionReport(
      area,
      sarCandidatesList,
      {},
      seaIceCells,
      weather,
      currents,
      cdseCatalogueItems,
      {},
      dataAcquisitionRecommendations
    );
    setActiveAreaConditionReport(report);
  }, [
    gpsTracking,
    mission.startLocation,
    sarCandidatesList,
    seaIceCells,
    weather,
    currents,
    cdseCatalogueItems,
    dataAcquisitionRecommendations,
  ]);

  // Update Stations, Custom Source & Destination Pins, and Waypoints
  useEffect(() => {
    const layer = stationsLayerRef.current;
    layer.clearLayers();

    if (isTrajectoryMode || isSeaIceMode) return;

    // 1. Render Custom Source Pin (Origin)
    const sourceIconHtml = `
      <div class="relative flex items-center justify-center">
        <div class="w-4 h-4 rounded-full bg-cyan-600 ring-4 ring-cyan-500/40 flex items-center justify-center shadow-lg">
          <div class="w-1.5 h-1.5 rounded-full bg-white"></div>
        </div>
        <span class="absolute left-5 whitespace-nowrap text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-slate-900 text-cyan-300 border border-cyan-700 pointer-events-none shadow-lg">
          ORIGIN: ${mission.startLocation.name.split('(')[0].trim()}
        </span>
      </div>
    `;
    const sourceIcon = L.divIcon({
      html: sourceIconHtml,
      className: 'custom-source-pin',
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });
    L.marker([mission.startLocation.lat, mission.startLocation.lon], { icon: sourceIcon })
      .bindPopup(`
        <div class="p-2.5 font-mono text-xs space-y-1">
          <div class="font-bold text-cyan-400 flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-cyan-400"></span>
            MISSION SOURCE (ORIGIN)
          </div>
          <div class="text-slate-200 font-semibold">${mission.startLocation.name}</div>
          <div class="text-slate-400 text-[11px]">
            Coords: ${Math.abs(mission.startLocation.lat).toFixed(3)}°S, ${Math.abs(mission.startLocation.lon).toFixed(3)}°W
          </div>
        </div>
      `)
      .addTo(layer);

    // 2. Render Custom Destination Pin
    const destIconHtml = `
      <div class="relative flex items-center justify-center">
        <div class="w-4 h-4 rounded-full bg-emerald-600 ring-4 ring-emerald-500/40 flex items-center justify-center shadow-lg">
          <div class="w-1.5 h-1.5 rounded-full bg-white"></div>
        </div>
        <span class="absolute left-5 whitespace-nowrap text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-slate-900 text-emerald-300 border border-emerald-700 pointer-events-none shadow-lg">
          DESTINATION: ${mission.destination.name.split('(')[0].trim()}
        </span>
      </div>
    `;
    const destIcon = L.divIcon({
      html: destIconHtml,
      className: 'custom-dest-pin',
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });
    L.marker([mission.destination.lat, mission.destination.lon], { icon: destIcon })
      .bindPopup(`
        <div class="p-2.5 font-mono text-xs space-y-1">
          <div class="font-bold text-emerald-400 flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
            MISSION DESTINATION
          </div>
          <div class="text-slate-200 font-semibold">${mission.destination.name}</div>
          <div class="text-slate-400 text-[11px]">
            Coords: ${Math.abs(mission.destination.lat).toFixed(3)}°S, ${Math.abs(mission.destination.lon).toFixed(3)}°W
          </div>
        </div>
      `)
      .addTo(layer);

    // 3. Render Antarctic Regional Stations
    ANTARCTIC_STATIONS.forEach((st) => {
      const isStart = Math.abs(st.lat - mission.startLocation.lat) < 0.1 && Math.abs(st.lon - mission.startLocation.lon) < 0.1;
      const isDest = Math.abs(st.lat - mission.destination.lat) < 0.1 && Math.abs(st.lon - mission.destination.lon) < 0.1;
      if (isStart || isDest) return;

      const iconHtml = `
        <div class="relative flex items-center justify-center">
          <div class="w-3 h-3 rounded-full bg-slate-400 ring-2 ring-slate-600"></div>
          <span class="absolute left-4 whitespace-nowrap text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-slate-900/90 border border-slate-700 text-slate-300 pointer-events-none shadow-md">
            ${st.name.split('(')[0].trim()}
          </span>
        </div>
      `;

      const customIcon = L.divIcon({
        html: iconHtml,
        className: 'custom-station-pin',
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });

      const marker = L.marker([st.lat, st.lon], { icon: customIcon });
      marker.bindPopup(`
        <div class="p-2 space-y-1 text-xs">
          <div class="font-bold text-slate-100">${st.name}</div>
          <div class="text-[11px] text-slate-400 font-mono">
            Lat: ${Math.abs(st.lat).toFixed(2)}°S, Lon: ${Math.abs(st.lon).toFixed(2)}°W
          </div>
        </div>
      `);
      marker.addTo(layer);
    });

    // 4. Render Research Waypoints
    (mission?.researchWaypoints || []).forEach((wp) => {
      const wpIconHtml = `
        <div class="relative flex items-center justify-center">
          <div class="w-3 h-3 rotate-45 bg-purple-400 border border-white ring-2 ring-purple-500/40"></div>
          <span class="absolute left-4 whitespace-nowrap text-[9px] font-mono px-1 py-0.2 rounded bg-purple-950/90 border border-purple-800 text-purple-200 pointer-events-none shadow">
            WP #${wp.order}: ${wp.name.split('(')[0]}
          </span>
        </div>
      `;
      const wpIcon = L.divIcon({
        html: wpIconHtml,
        className: 'custom-wp-pin',
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });
      L.marker([wp.lat, wp.lon], { icon: wpIcon })
        .bindPopup(`
          <div class="p-2 space-y-1 text-xs">
            <div class="font-bold text-purple-300">Research Waypoint #${wp.order}</div>
            <p class="text-slate-200">${wp.name}</p>
            <div class="text-[10px] text-slate-400 font-mono">
              Stop: ${wp.stopDurationHours || 0} hrs • Type: ${wp.type || 'Sampling'}
            </div>
          </div>
        `)
        .addTo(layer);
    });
  }, [mission, isTrajectoryMode, isSeaIceMode]);

  // 1. Update Sea Ice Layer (Full Grid in SeaIceMode, Route-Specific in Default)
  useEffect(() => {
    const layer = seaIceLayerRef.current;
    layer.clearLayers();

    if ((!mapLayers.seaIce && !isSeaIceMode) || isTrajectoryMode) return;

    if (isSeaIceMode) {
      // Render ALL sea ice grid cells spatially across the Antarctic domain
      activeSeaIceCells.forEach((cell) => {
        const isSelected = selectedCellId === cell.id;

        let fillColor = '#0284c7';
        let fillOpacity = 0.25;
        let strokeColor = '#38bdf8';

        if (cell.concentrationPercent >= 90) {
          fillColor = '#f8fafc';
          fillOpacity = 0.9;
          strokeColor = '#ffffff';
        } else if (cell.concentrationPercent >= 70) {
          fillColor = '#6366f1';
          fillOpacity = 0.75;
          strokeColor = '#818cf8';
        } else if (cell.concentrationPercent >= 40) {
          fillColor = '#3b82f6';
          fillOpacity = 0.65;
          strokeColor = '#60a5fa';
        } else if (cell.concentrationPercent >= 10) {
          fillColor = '#38bdf8';
          fillOpacity = 0.5;
          strokeColor = '#38bdf8';
        } else {
          fillColor = '#0284c7';
          fillOpacity = 0.2;
          strokeColor = '#0369a1';
        }

        // Draw spatial grid rectangle cell
        const bounds: L.LatLngBoundsExpression = [
          [cell.lat - 0.48, cell.lon - 0.72],
          [cell.lat + 0.48, cell.lon + 0.72],
        ];

        const rect = L.rectangle(bounds, {
          color: isSelected ? '#f59e0b' : strokeColor,
          weight: isSelected ? 3.5 : 1,
          fillColor,
          fillOpacity,
          dashArray: cell.stage.includes('Fast') ? undefined : isSelected ? undefined : '2, 2',
        });

        rect.on('click', () => {
          if (onCellSelect) onCellSelect(cell.id);
        });

        // Cell Label marker inside rectangle
        const cellLabelIcon = L.divIcon({
          html: `
            <div class="flex flex-col items-center justify-center pointer-events-none select-none">
              <span class="text-[10px] font-mono font-bold ${
                cell.concentrationPercent > 80 ? 'text-slate-950' : 'text-white'
              }">
                ${cell.concentrationPercent}%
              </span>
              <span class="text-[8px] font-mono ${
                cell.concentrationPercent > 80 ? 'text-slate-800 font-semibold' : 'text-slate-200'
              }">
                ${cell.id.replace('ice-cell-', 'C')}
              </span>
            </div>
          `,
          className: 'custom-grid-tile-label',
          iconSize: [40, 24],
          iconAnchor: [20, 12],
        });
        const labelMarker = L.marker([cell.lat, cell.lon], { icon: cellLabelIcon, interactive: false });
        labelMarker.addTo(layer);

        // Drift vector line
        if (seaIceShowDrift && cell.driftVector && cell.driftVector.speedKnots > 0.1) {
          const rad = (cell.driftVector.headingDeg * Math.PI) / 180;
          const lengthDeg = 0.35 * (cell.driftVector.speedKnots / 1.0);
          const endLat = cell.lat + lengthDeg * Math.cos(rad);
          const endLon = cell.lon + (lengthDeg / Math.cos((cell.lat * Math.PI) / 180)) * Math.sin(rad);

          const driftLine = L.polyline([[cell.lat, cell.lon], [endLat, endLon]], {
            color: isSelected ? '#f59e0b' : '#38bdf8',
            weight: isSelected ? 2.5 : 1.5,
            opacity: 0.85,
          });
          driftLine.addTo(layer);
        }

        // Uncertainty circle overlay
        if (seaIceShowUncertainty && cell.uncertainty) {
          const uncRadiusMeters = (cell.uncertainty / 100) * 40000;
          const uncCircle = L.circle([cell.lat, cell.lon], {
            radius: uncRadiusMeters,
            color: '#38bdf8',
            weight: 1,
            fillColor: '#0284c7',
            fillOpacity: 0.06,
            dashArray: '3, 4',
          });
          uncCircle.addTo(layer);
        }

        rect.bindTooltip(
          `
          <div class="text-[11px] font-mono leading-tight p-1 select-none">
            <div class="font-bold text-slate-100 flex items-center justify-between gap-2">
              <span>${cell.id}</span>
              <span class="text-amber-300 font-bold">${cell.concentrationPercent}% Pack Ice</span>
            </div>
            <div class="text-cyan-300 font-semibold mt-0.5">${cell.stage}</div>
            <div class="text-slate-300 mt-0.5">Thickness: ${cell.thicknessMeters}m • Age: ${cell.ageDays ?? 14}d</div>
            <div class="text-emerald-400">Drift: ${cell.driftVector.speedKnots} kt @ ${cell.driftVector.headingDeg}°</div>
            <div class="text-amber-300">Uncertainty: ±${cell.uncertainty}% (Horizon: ${forecastHorizonHours === 0 ? 'T+0' : `+${forecastHorizonHours}h`})</div>
          </div>
        `,
          { sticky: true, opacity: 0.95 }
        );

        rect.addTo(layer);
      });
      return;
    }

    const selectedRoute = routes.find((r) => r.id === selectedRouteId) || routes[0];
    const routeWps = selectedRoute?.waypoints || [];

    seaIceCells.forEach((cell) => {
      if (cell.concentrationPercent < 8) return;

      const distToRoute = calculateDistanceToRouteNm(cell.lat, cell.lon, routeWps);
      if (distToRoute > 45) return;

      let fillColor = '#0284c7';
      let fillOpacity = 0.25;
      let strokeColor = '#38bdf8';

      if (cell.concentrationPercent > 80) {
        fillColor = '#f8fafc';
        fillOpacity = 0.6;
        strokeColor = '#ffffff';
      } else if (cell.concentrationPercent > 60) {
        fillColor = '#bae6fd';
        fillOpacity = 0.45;
        strokeColor = '#7dd3fc';
      } else if (cell.concentrationPercent > 35) {
        fillColor = '#38bdf8';
        fillOpacity = 0.35;
        strokeColor = '#0284c7';
      }

      const circle = L.circle([cell.lat, cell.lon], {
        radius: 32000,
        color: strokeColor,
        weight: 1.5,
        fillColor,
        fillOpacity,
        dashArray: cell.stage.includes('Fast') ? undefined : '3, 4',
      });

      circle.bindTooltip(
        `
        <div class="text-[11px] font-mono leading-tight">
          <div class="font-bold text-slate-100">${cell.concentrationPercent}% Pack Ice</div>
          <div class="text-blue-300 font-semibold">${selectedRoute?.type || 'BALANCED'} Route Corridor</div>
          <div class="text-slate-300">${cell.stage}</div>
          <div class="text-slate-400">Dist to Route: ${distToRoute.toFixed(1)} nm</div>
          <div class="text-slate-400">Drift: ${cell.driftVector.speedKnots} kt @ ${cell.driftVector.headingDeg}°</div>
        </div>
      `,
        { sticky: true, opacity: 0.95 }
      );

      circle.addTo(layer);
    });
  }, [
    seaIceCells,
    activeSeaIceCells,
    mapLayers.seaIce,
    selectedRouteId,
    routes,
    isSeaIceMode,
    isTrajectoryMode,
    selectedCellId,
    onCellSelect,
    forecastHorizonHours,
    seaIceShowDrift,
    seaIceShowUncertainty,
  ]);

  // 2. Update Ocean Currents & Wind Vectors
  useEffect(() => {
    const oceanLayer = oceanLayerRef.current;
    const weatherLayer = weatherLayerRef.current;
    oceanLayer.clearLayers();
    weatherLayer.clearLayers();

    if (isTrajectoryMode || isSeaIceMode) return;

    if (mapLayers.ocean) {
      currents.forEach((c) => {
        const rad = (c.currentHeadingDeg * Math.PI) / 180;
        const lengthDeg = 0.55 * (c.currentSpeedKnots / 1.0 || 1.0);
        const endLat = c.lat + lengthDeg * Math.cos(rad);
        const endLon = c.lon + (lengthDeg / Math.cos((c.lat * Math.PI) / 180)) * Math.sin(rad);

        const currentLine = L.polyline([[c.lat, c.lon], [endLat, endLon]], {
          color: c.isRealData ? '#06b6d4' : '#38bdf8',
          weight: c.isRealData ? 2.5 : 2,
          opacity: 0.85,
          dashArray: c.isRealData ? undefined : '4, 4',
        });

        const tooltipContent = c.isRealData
          ? `
            <div class="text-[11px] font-mono leading-tight p-1 select-none">
              <div class="font-bold text-cyan-300 flex items-center justify-between gap-2">
                <span>REAL OCEAN CURRENT (NEMO 3D)</span>
                <span class="text-emerald-300 font-bold">${c.currentSpeedKnots} kts</span>
              </div>
              <div class="text-slate-200 font-semibold mt-0.5">Flow Heading: ${c.currentHeadingDeg}°</div>
              <div class="text-slate-300 text-[10px]">u: ${c.uMetersPerSec ?? 'N/A'} m/s • v: ${c.vMetersPerSec ?? 'N/A'} m/s</div>
              <div class="text-cyan-400 text-[9px] mt-0.5">Depth: Surface (${c.depthMeters ?? 0.49}m) • Copernicus Marine</div>
            </div>
          `
          : `
            <div class="text-[11px] font-mono leading-tight p-1">
              <div class="font-bold text-slate-100">SYNTHETIC OCEAN CURRENT (DEMO)</div>
              <div class="text-cyan-300 font-semibold">Speed: ${c.currentSpeedKnots} kt @ ${c.currentHeadingDeg}°</div>
            </div>
          `;

        currentLine.bindTooltip(tooltipContent, { sticky: true, opacity: 0.95 });
        currentLine.addTo(oceanLayer);
      });
    }

    if (mapLayers.weather) {
      if (environmentalMode === 'REAL' && (realWeather || realWeatherGrid.length > 0)) {
        const gridPoints = realWeatherGrid.length > 0 ? realWeatherGrid : realWeather ? [realWeather] : [];
        gridPoints.forEach((w) => {
          const lat = w.lat ?? -60.0;
          const lon = w.lon ?? -64.0;
          const windRad = (((w.windDirectionDeg + 180) % 360) * Math.PI) / 180;
          const windEndLat = lat + 0.8 * Math.cos(windRad);
          const windEndLon = lon + (0.8 / Math.cos((lat * Math.PI) / 180)) * Math.sin(windRad);

          const windLine = L.polyline([[lat, lon], [windEndLat, windEndLon]], {
            color: '#f59e0b',
            weight: 3.5,
            opacity: 0.9,
          });

          const weatherIconHtml = `
            <div class="relative flex items-center justify-center select-none">
              <div class="w-4 h-4 rounded-full bg-amber-500 border-2 border-slate-900 ring-2 ring-amber-400/50 flex items-center justify-center shadow-md">
                <div class="w-1.5 h-1.5 rounded-full bg-slate-950"></div>
              </div>
              <span class="absolute -top-4 whitespace-nowrap text-[9px] font-mono font-bold text-amber-300 px-1 py-0.2 bg-slate-950/90 border border-amber-700 rounded shadow">
                REAL FORECAST
              </span>
            </div>
          `;
          const weatherIcon = L.divIcon({
            html: weatherIconHtml,
            className: 'custom-real-weather-marker',
            iconSize: [20, 20],
            iconAnchor: [10, 10],
          });
          const marker = L.marker([lat, lon], { icon: weatherIcon });

          const gustStr = w.windGustMetersPerSec !== undefined ? `${w.windGustMetersPerSec} m/s (${w.windGustKnots ?? 'N/A'} kts)` : 'Not provided by source';
          const visStr = w.visibilityMeters !== undefined ? `${(w.visibilityMeters / 1000).toFixed(1)} km (${w.visibilityNm} nm)` : 'Not provided by source';
          const cloudStr = w.cloudCoverPercent !== undefined ? `${w.cloudCoverPercent}%` : 'Not provided by source';
          const precipStr = w.precipitationMmPerHour !== undefined ? `${w.precipitationMmPerHour} mm/h` : 'Not provided by source';

          marker.bindPopup(`
            <div class="p-3 space-y-2 text-xs font-mono min-w-[250px]">
              <div class="flex items-center justify-between border-b border-slate-700 pb-1.5">
                <span class="font-bold text-amber-300 text-sm">REAL WEATHER FORECAST</span>
                <span class="text-[9px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-200 border border-amber-700 font-bold uppercase">
                  ECMWF IFS
                </span>
              </div>
              <div class="space-y-1 text-[11px]">
                <div><span class="text-slate-400">Temperature:</span> <strong class="text-white">${w.airTempC}°C</strong></div>
                <div><span class="text-slate-400">Wind:</span> <strong class="text-emerald-300">${w.windSpeedMetersPerSec ?? 'N/A'} m/s (${w.windSpeedKnots} kts)</strong></div>
                <div><span class="text-slate-400">Wind direction:</span> <strong class="text-slate-200">${w.windDirectionDeg}°</strong></div>
                <div><span class="text-slate-400">Wind gust:</span> <strong class="text-slate-200">${gustStr}</strong></div>
                <div><span class="text-slate-400">Visibility:</span> <strong class="text-slate-200">${visStr}</strong></div>
                <div><span class="text-slate-400">Cloud cover:</span> <strong class="text-slate-200">${cloudStr}</strong></div>
                <div><span class="text-slate-400">Precipitation:</span> <strong class="text-slate-200">${precipStr}</strong></div>
                <div><span class="text-slate-400">Pressure:</span> <strong class="text-slate-200">${w.barometricPressureHpa} hPa</strong></div>
                <div class="pt-1 border-t border-slate-800 text-[10px] text-slate-400">
                  <div>Forecast valid: <span class="text-white">${w.validTime ? new Date(w.validTime).toUTCString() : 'N/A'}</span></div>
                  <div>Model: <span class="text-cyan-300">ECMWF IFS (0.25° Global)</span></div>
                  <div>Data provider: <span class="text-cyan-300">Open-Meteo API</span></div>
                  <div>Retrieved: <span class="text-slate-300">${w.provenance?.ingestionTime ? new Date(w.provenance.ingestionTime).toLocaleTimeString() : 'N/A'}</span></div>
                  <div>Freshness: <span class="text-emerald-400 font-bold">${w.provenance?.freshnessState || 'FRESH'}</span></div>
                </div>
              </div>
            </div>
          `);

          windLine.addTo(weatherLayer);
          marker.addTo(weatherLayer);
        });
      } else {
        const windRad = (((weather.windDirectionDeg + 180) % 360) * Math.PI) / 180;
        const windEndLat = -60.0 + 0.8 * Math.cos(windRad);
        const windEndLon = -64.0 + (0.8 / Math.cos((-60.0 * Math.PI) / 180)) * Math.sin(windRad);

        const windLine = L.polyline([[-60.0, -64.0], [windEndLat, windEndLon]], {
          color: '#f59e0b',
          weight: 3,
          opacity: 0.85,
        });
        windLine.bindTooltip(
          `Drake Westerlies (DEMO): ${weather.windSpeedKnots} kt @ ${weather.windDirectionDeg}° • Waves: ${weather.waveHeightMeters}m`,
          { sticky: true }
        );
        windLine.addTo(weatherLayer);
      }
    }
  }, [currents, weather, mapLayers.ocean, mapLayers.weather, isTrajectoryMode, isSeaIceMode, environmentalMode, realWeather, realWeatherGrid]);

  // 3. Update Tracked Icebergs Layer
  useEffect(() => {
    const bergsLayer = icebergsLayerRef.current;
    bergsLayer.clearLayers();

    if (isSeaIceMode || (!mapLayers.icebergs && !isTrajectoryMode)) return;

    const selectedRoute = routes.find((r) => r.id === selectedRouteId) || routes[0];
    const routeWps = selectedRoute?.waypoints || [];
    const selectedBerg = icebergs.find((b) => b.id === selectedIcebergId) || icebergs[0];

    icebergs.forEach((berg) => {
      const isSelected = selectedBerg?.id === berg.id;

      if (!isTrajectoryMode) {
        const distToRoute = calculateDistanceToRouteNm(berg.lat, berg.lon, routeWps);
        if (distToRoute > 65) return;
      }

      const cpa = berg.closestApproach;
      const isHighHazard = cpa && (cpa.encounterRisk === 'Critical' || cpa.encounterRisk === 'High');
      const isGiant = berg.sizeCategory === 'Giant Calved Tabular';

      const isCurrentSelectedHorizon = isSelected && isTrajectoryMode && forecastHorizonHours === 0;

      const bergIconHtml = `
        <div class="relative flex items-center justify-center select-none">
          <div class="w-${isGiant ? '5' : '4'} h-${
        isGiant ? '5' : '4'
      } rotate-45 bg-cyan-100 ${
        isCurrentSelectedHorizon
          ? 'border-2 border-amber-400 ring-4 ring-amber-400/60 shadow-xl scale-125'
          : isHighHazard
          ? 'border-2 border-red-500 ring-4 ring-red-500/40'
          : isSelected
          ? 'border-2 border-blue-500 ring-4 ring-blue-500/40'
          : 'border border-cyan-400 ring-2 ring-cyan-500/30'
      } flex items-center justify-center shadow-lg">
            <div class="w-1.5 h-1.5 rounded-full ${isHighHazard ? 'bg-red-600' : 'bg-cyan-600'}"></div>
          </div>
          ${
            isCurrentSelectedHorizon
              ? '<span class="absolute -top-5 whitespace-nowrap text-[9px] font-mono font-bold text-amber-300 px-1.5 py-0.5 bg-slate-900 border border-amber-500 rounded shadow-md">★ NOW (T+0h)</span>'
              : isSelected && isTrajectoryMode
              ? '<span class="absolute -top-4 whitespace-nowrap text-[8px] font-mono font-bold text-blue-300 px-1 bg-slate-900 border border-slate-700 rounded">TARGET</span>'
              : ''
          }
        </div>
      `;

      const bergIcon = L.divIcon({
        html: bergIconHtml,
        className: 'custom-berg-marker',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const marker = L.marker([berg.lat, berg.lon], { icon: bergIcon });
      marker.on('click', () => setSelectedIcebergId(berg.id));

      marker.bindPopup(`
        <div class="p-3 space-y-2 text-xs font-mono min-w-[240px]">
          <div class="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span class="font-bold text-slate-100 text-sm">${berg.name}</span>
            <span class="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold">
              ${berg.id}
            </span>
          </div>
          <div class="grid grid-cols-2 gap-2 text-[11px]">
            <div><span class="text-slate-400">Position:</span> <span class="text-slate-200">${Math.abs(berg.lat).toFixed(3)}°S, ${Math.abs(berg.lon).toFixed(3)}°W</span></div>
            <div><span class="text-slate-400">Drift:</span> <span class="text-emerald-400">${berg.driftSpeedKnots} kt @ ${berg.driftHeadingDeg}°</span></div>
            <div><span class="text-slate-400">Length:</span> <span class="text-slate-200">${berg.estimatedLengthMeters}m</span></div>
            <div><span class="text-slate-400">Uncertainty:</span> <span class="text-amber-300">±${berg.uncertaintyRadiusNm} nm</span></div>
          </div>
        </div>
      `);

      marker.addTo(bergsLayer);

      if (isTrajectoryMode && isSelected && berg.predictedTrajectory) {
        berg.predictedTrajectory.forEach((tp) => {
          const isSelectedHorizon = forecastHorizonHours === tp.hours;

          const tpIconHtml = `
            <div class="relative flex items-center justify-center select-none">
              <div class="w-3.5 h-3.5 rounded-full ${
                isSelectedHorizon
                  ? 'bg-amber-400 ring-4 ring-amber-400/60 border-2 border-white scale-125 shadow-xl'
                  : 'bg-cyan-500 ring-2 ring-cyan-300/40 border border-white'
              } flex items-center justify-center">
                <div class="w-1 h-1 rounded-full bg-slate-900"></div>
              </div>
              ${
                isSelectedHorizon
                  ? `<span class="absolute -top-5 whitespace-nowrap text-[9px] font-mono font-bold text-amber-300 px-1.5 py-0.5 bg-slate-900 border border-amber-500 rounded shadow-md">★ PREDICTED (${tp.horizon})</span>`
                  : `<span class="absolute -bottom-4 text-[8px] font-mono text-cyan-200 px-1 bg-slate-900/80 rounded">${tp.horizon}</span>`
              }
            </div>
          `;

          const tpIcon = L.divIcon({
            html: tpIconHtml,
            className: 'custom-trajectory-point',
            iconSize: [20, 20],
            iconAnchor: [10, 10],
          });

          const tpMarker = L.marker([tp.lat, tp.lon], { icon: tpIcon });
          tpMarker.bindTooltip(
            `
            <div class="text-[11px] font-mono p-1">
              <div class="font-bold text-cyan-300">${berg.name} (${tp.horizon})</div>
              <div>Predicted Pos: ${Math.abs(tp.lat).toFixed(3)}°S, ${Math.abs(tp.lon).toFixed(3)}°W</div>
              <div>Drift Speed: ${tp.driftSpeedKnots ?? berg.driftSpeedKnots} kt</div>
              <div class="text-amber-300 font-bold">Uncertainty Radius: ±${tp.uncertaintyRadiusNm} nm</div>
            </div>
          `,
            { sticky: true }
          );

          tpMarker.addTo(bergsLayer);
        });
      }
    });
  }, [icebergs, mapLayers.icebergs, selectedRouteId, routes, selectedIcebergId, isTrajectoryMode, isSeaIceMode, forecastHorizonHours]);

  // 4. Update Drift Vectors / Trajectories Layer
  useEffect(() => {
    const trajLayer = trajectoriesLayerRef.current;
    trajLayer.clearLayers();

    if (isSeaIceMode || (!mapLayers.trajectories && !isTrajectoryMode)) return;

    const selectedBerg = icebergs.find((b) => b.id === selectedIcebergId) || icebergs[0];

    icebergs.forEach((berg) => {
      const isSelected = selectedBerg?.id === berg.id;
      if (!isTrajectoryMode && !isSelected) return;

      if (berg.predictedTrajectory) {
        const trajPoints: [number, number][] = [
          [berg.lat, berg.lon],
          ...berg.predictedTrajectory.map((p) => [p.lat, p.lon] as [number, number]),
        ];

        const trajLine = L.polyline(trajPoints, {
          color: isSelected ? '#f59e0b' : '#06b6d4',
          weight: isSelected ? 3.5 : 2,
          opacity: isSelected ? 0.95 : 0.6,
          dashArray: isSelected ? undefined : '5, 5',
        });
        trajLine.addTo(trajLayer);
      }
    });
  }, [icebergs, mapLayers.trajectories, selectedIcebergId, isTrajectoryMode, isSeaIceMode]);

  // 5. Update Uncertainty Envelope Layer
  useEffect(() => {
    const uncLayer = uncertaintyLayerRef.current;
    uncLayer.clearLayers();

    if (isSeaIceMode || (!mapLayers.uncertainty && !isTrajectoryMode)) return;

    // Render Phase 10C Uncertainty Evaluations if provided
    if (uncertaintyEvaluations && uncertaintyEvaluations.length > 0) {
      uncertaintyEvaluations.forEach((evalResult) => {
        const radiusMeters = evalResult.expandedUncertaintyRadiusNm * 1852;
        const isCritical = evalResult.severity === 'CRITICAL' || evalResult.recommendedCautionLevel === 'RE_EVALUATION_REQUIRED';
        const isHigh = evalResult.severity === 'HIGH' || evalResult.recommendedCautionLevel === 'EXCLUSIVE_MONITORING' || evalResult.recommendedCautionLevel === 'HIGH_CAUTION';

        const strokeColor = isCritical ? '#ef4444' : isHigh ? '#f59e0b' : '#06b6d4';
        const fillColor = isCritical ? '#ef4444' : isHigh ? '#f59e0b' : '#06b6d4';

        const circle = L.circle([evalResult.location.lat, evalResult.location.lon], {
          radius: radiusMeters,
          color: strokeColor,
          weight: 2,
          dashArray: '4, 4',
          fillColor: fillColor,
          fillOpacity: 0.15,
        });

        const popupContent = `
          <div style="font-family: monospace; font-size: 11px; padding: 4px; max-width: 250px; color: #f8fafc;">
            <div style="font-weight: bold; color: #38bdf8; text-transform: uppercase;">
              Model Uncertainty Zone (${evalResult.forecastHorizonLabel})
            </div>
            <div style="margin-top: 4px;">
              <strong>Hazard:</strong> ${evalResult.hazardName} (${evalResult.hazardType})
            </div>
            <div style="color: #fbbf24; font-weight: bold;">
              <strong>Error Radius:</strong> ±${evalResult.expandedUncertaintyRadiusNm.toFixed(1)} nm (${evalResult.expansionFactor}x expansion)
            </div>
            <div style="color: #94a3b8; margin-top: 2px;">
              <strong>Confidence:</strong> ${evalResult.confidenceLevel} | <strong>Freshness:</strong> ${evalResult.freshnessState}
            </div>
            <div style="color: #94a3b8;">
              <strong>Connectivity:</strong> ${evalResult.connectionState} | <strong>Mode:</strong> ${evalResult.dataMode}
            </div>
            <div style="margin-top: 6px; font-family: sans-serif; font-size: 10px; color: #cbd5e1; background: rgba(15,23,42,0.8); padding: 4px; border-radius: 4px;">
              ${evalResult.explanation}
            </div>
            <div style="margin-top: 4px; font-size: 9px; color: #94a3b8; font-style: italic; border-top: 1px solid #334155; padding-top: 2px;">
              Model spatial uncertainty envelope — NOT a confirmed hazard boundary or collision guarantee.
            </div>
          </div>
        `;

        circle.bindPopup(popupContent);
        circle.bindTooltip(
          `
          <div class="text-[11px] font-mono">
            <div class="font-bold text-cyan-300">Model Uncertainty Zone (${evalResult.forecastHorizonLabel})</div>
            <div>${evalResult.hazardName} (±${evalResult.expandedUncertaintyRadiusNm.toFixed(1)} nm)</div>
            <div class="text-[9px] text-slate-400 italic">Spatial uncertainty envelope</div>
          </div>
        `,
          { sticky: true }
        );

        circle.addTo(uncLayer);
      });
    }

    const selectedBerg = icebergs.find((b) => b.id === selectedIcebergId) || icebergs[0];

    if (isTrajectoryMode && selectedBerg && (!uncertaintyEvaluations || uncertaintyEvaluations.length === 0)) {
      const pointsWithUncertainty = [
        { lat: selectedBerg.lat, lon: selectedBerg.lon, radiusNm: selectedBerg.uncertaintyRadiusNm, label: 'T+0h', hours: 0 },
        ...(selectedBerg.predictedTrajectory?.map((pt) => ({
          lat: pt.lat,
          lon: pt.lon,
          radiusNm: pt.uncertaintyRadiusNm,
          label: pt.horizon,
          hours: pt.hours,
        })) || []),
      ];

      pointsWithUncertainty.forEach((pt) => {
        const isSelectedHorizon = forecastHorizonHours === pt.hours;

        const radiusMeters = pt.radiusNm * 1852;
        const circle = L.circle([pt.lat, pt.lon], {
          radius: radiusMeters,
          color: isSelectedHorizon ? '#f59e0b' : '#38bdf8',
          weight: isSelectedHorizon ? 2.5 : 1,
          fillColor: isSelectedHorizon ? '#f59e0b' : '#0284c7',
          fillOpacity: isSelectedHorizon ? 0.22 : 0.1,
          dashArray: isSelectedHorizon ? undefined : '3, 4',
        });

        circle.bindTooltip(
          `
          <div class="text-[11px] font-mono">
            <div class="font-bold text-amber-300">Uncertainty Envelope (${pt.label})</div>
            <div>Expanding Error Radius: ±${pt.radiusNm} nm</div>
          </div>
        `,
          { sticky: true }
        );

        circle.addTo(uncLayer);
      });
      return;
    }

    const selectedRoute = routes.find((r) => r.id === selectedRouteId) || routes[0];
    if (!selectedRoute || !selectedRoute.waypoints || selectedRoute.waypoints.length < 2) return;

    const corridorOffsetNm = Math.max(3.5, Number(((selectedRoute.uncertaintyScore || 25) / 5.0).toFixed(1)));
    const corridorPolygonCoords = calculateRouteCorridorPolygon(selectedRoute.waypoints, corridorOffsetNm);

    if (corridorPolygonCoords.length > 0) {
      const routeUncertaintyPolygon = L.polygon(corridorPolygonCoords, {
        color: '#0284c7',
        weight: 1.5,
        fillColor: '#38bdf8',
        fillOpacity: 0.18,
        dashArray: '5, 5',
      });
      routeUncertaintyPolygon.addTo(uncLayer);
    }
  }, [routes, selectedRouteId, icebergs, mapLayers.uncertainty, selectedIcebergId, isTrajectoryMode, isSeaIceMode, forecastHorizonHours, uncertaintyEvaluations]);

  // Update Routes Layer
  useEffect(() => {
    const layer = routesLayerRef.current;
    layer.clearLayers();

    if (isSeaIceMode || !mapLayers.routes || isTrajectoryMode) return;

    routes.forEach((route) => {
      const isSelected = selectedRouteId === route.id;
      const isRecommended = route.isRecommended;

      const color = route.color;
      const weight = isSelected ? 5 : isRecommended ? 4 : 2.5;
      const opacity = isSelected ? 0.95 : isRecommended ? 0.85 : 0.55;

      const polyline = L.polyline(route.waypoints, {
        color,
        weight,
        opacity,
        dashArray: route.type === 'FAST' ? '4, 4' : route.type === 'SAFE' ? undefined : '8, 6',
      });

      polyline.on('click', () => {
        setSelectedRouteId(route.id);
      });

      polyline.bindTooltip(
        `
        <div class="p-1 font-mono text-[11px] space-y-0.5">
          <div class="font-bold flex items-center gap-1.5" style="color: ${color}">
            ${route.name}
            ${isRecommended ? '<span class="text-[9px] px-1 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded">RECOMMENDED</span>' : ''}
          </div>
          <div>Dist: ${route.distanceNm} nm • ETA: ${route.etaHours} hrs</div>
          <div>Fuel: ${route.fuelTons} t • Risk Index: ${route.riskIndex}/100</div>
          <div>Confidence: <span class="font-bold">${route.confidence}</span></div>
        </div>
      `,
        { sticky: true, opacity: 0.95 }
      );

      polyline.addTo(layer);
    });

    // Phase 5 — Render Counterfactual Recommended Route Overlay if active
    if (activeCounterfactualResult && activeCounterfactualResult.scenarioRoute) {
      const scenRoute = activeCounterfactualResult.scenarioRoute;
      const counterPolyline = L.polyline(scenRoute.waypoints, {
        color: '#ec4899', // Pink / Magenta
        weight: 4,
        opacity: 0.9,
        dashArray: '8, 8',
      });

      counterPolyline.bindTooltip(
        `
        <div class="p-1 font-mono text-[11px] space-y-0.5 border border-pink-500 bg-slate-950 text-white rounded">
          <div class="font-bold text-pink-400 flex items-center gap-1.5">
            COUNTERFACTUAL ROUTE
            <span class="text-[9px] px-1 bg-pink-950 text-pink-300 border border-pink-800 rounded">WHAT-IF</span>
          </div>
          <div class="text-[10px] text-pink-200">${activeCounterfactualResult.scenario.name}</div>
          <div>Type: ${scenRoute.type} • Dist: ${scenRoute.distanceNm} nm</div>
          <div>Risk Index: ${scenRoute.riskIndex}/100 • Stability: ${activeCounterfactualResult.stability}</div>
          <div class="text-[9px] text-amber-300 italic">COUNTERFACTUAL SCENARIO — NOT OBSERVED DATA</div>
        </div>
      `,
        { sticky: true, opacity: 0.95 }
      );

      counterPolyline.addTo(layer);
    }

    // Phase 6 & Phase 7A — Render Candidate Observation Footprint / CDSE STAC Geometry Overlay if active
    if (selectedAcquisitionFootprintId) {
      const stacItem = cdseCatalogueItems.find((item) => item.id === selectedAcquisitionFootprintId);
      const rec = dataAcquisitionRecommendations.find((r) => r.productId === selectedAcquisitionFootprintId);
      const prod = satelliteProducts.find((p) => p.id === selectedAcquisitionFootprintId);

      if (stacItem && stacItem.geometry && stacItem.geometry.coordinates) {
        // Render Real STAC GeoJSON Feature Polygon
        const geoLayer = L.geoJSON(stacItem.geometry as any, {
          style: {
            color: '#1e40af', // Dark Blue
            weight: 2.5,
            opacity: 0.95,
            dashArray: '6, 4',
            fillColor: '#3b82f6',
            fillOpacity: 0.2,
          },
        });

        geoLayer.bindTooltip(
          `
          <div class="p-2 font-mono text-[11px] space-y-1 border border-blue-600 bg-slate-950 text-white rounded shadow-lg">
            <div class="font-bold text-blue-400 flex items-center justify-between gap-2">
              <span>REAL CDSE STAC FOOTPRINT</span>
              <span class="text-[9px] px-1 bg-blue-950 text-blue-300 border border-blue-800 rounded font-bold">PHASE 7A</span>
            </div>
            <div class="text-[10px] text-blue-200 truncate font-semibold">${stacItem.id}</div>
            <div class="text-slate-200">Platform: ${stacItem.platform} • Instrument: ${stacItem.instrument}</div>
            <div class="text-slate-300">Product: ${stacItem.productType} • Level: ${stacItem.processingLevel}</div>
            <div class="text-amber-300 font-semibold">Priority: ${rec?.priority || 'MEDIUM'} (${rec?.score || 75}/100)</div>
            <div class="text-emerald-400 font-bold border-t border-slate-800 pt-1">CATALOGUE ITEM — NOT YET ACQUIRED</div>
          </div>
        `,
          { sticky: true, opacity: 0.95 }
        );

        geoLayer.addTo(layer);
      } else {
        const fp = rec?.footprint || prod?.footprint;
        if (fp) {
          const circle = L.circle([fp.centerLat, fp.centerLon], {
            radius: fp.radiusNm * 1852, // convert nautical miles to meters
            color: '#2563eb', // Blue
            weight: 2,
            opacity: 0.9,
            dashArray: '6, 6',
            fillColor: '#3b82f6',
            fillOpacity: 0.15,
          });

          circle.bindTooltip(
            `
            <div class="p-1.5 font-mono text-[11px] space-y-0.5 border border-blue-500 bg-slate-950 text-white rounded">
              <div class="font-bold text-blue-400 flex items-center gap-1.5">
                CANDIDATE OBSERVATION FOOTPRINT
                <span class="text-[9px] px-1 bg-blue-950 text-blue-300 border border-blue-800 rounded">PHASE 6</span>
              </div>
              <div class="text-[10px] text-blue-200">${rec?.productName || prod?.name}</div>
              <div>Sensor: ${prod?.sensor || 'Satellite Sensor'} • Size: ${prod?.sizeMb || 0} MB</div>
              <div>Priority: <span class="font-bold text-amber-400">${rec?.priority || 'HIGH'}</span> • Score: ${rec?.score || 80}/100</div>
              <div class="text-[9px] text-slate-300 italic">${fp.description}</div>
            </div>
          `,
            { sticky: true, opacity: 0.95 }
          );

          circle.addTo(layer);
        }
      }
    }
  }, [routes, selectedRouteId, mapLayers.routes, isSeaIceMode, isTrajectoryMode, activeCounterfactualResult, selectedAcquisitionFootprintId, dataAcquisitionRecommendations, satelliteProducts, cdseCatalogueItems]);


  // Update Vessel Telemetry Marker & Track
  useEffect(() => {
    const layer = vesselLayerRef.current;
    layer.clearLayers();

    if (isTrajectoryMode || isSeaIceMode) return;

    if ((gpsTracking?.actualTrack?.length ?? 0) > 1) {
      const trackLine = L.polyline(gpsTracking.actualTrack, {
        color: '#a855f7',
        weight: 2,
        opacity: 0.75,
        dashArray: '2, 3',
      });
      trackLine.addTo(layer);
    }

    const vesselIconHtml = `
      <div class="relative flex items-center justify-center">
        <div class="relative w-5 h-5 rounded-full bg-slate-900 border-2 border-white flex items-center justify-center shadow-md">
          <div class="w-1.5 h-1.5 rounded-full bg-amber-400"></div>
        </div>
        <div class="absolute w-1 h-3.5 bg-slate-900 origin-bottom" style="transform: translateY(-7px) rotate(${gpsTracking.headingDeg}deg)"></div>
      </div>
    `;

    const vesselIcon = L.divIcon({
      html: vesselIconHtml,
      className: 'custom-vessel-marker',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    const marker = L.marker([gpsTracking.currentLat, gpsTracking.currentLon], { icon: vesselIcon });
    marker.bindPopup(`
      <div class="p-2.5 font-mono text-xs space-y-1">
        <div class="font-bold text-slate-900 flex items-center justify-between">
          <span>${selectedVessel.name}</span>
          <span class="text-blue-700 text-[10px] font-semibold">${gpsTracking.isSimulating ? 'TRACKING' : 'IDLE'}</span>
        </div>
        <div class="text-slate-700 text-[11px]">
          Pos: ${Math.abs(gpsTracking.currentLat).toFixed(3)}°S, ${Math.abs(gpsTracking.currentLon).toFixed(3)}°W
        </div>
        <div class="flex justify-between text-slate-600 text-[11px]">
          <span>Heading: ${gpsTracking.headingDeg}°</span>
          <span>Speed: ${gpsTracking.speedKnots} kts</span>
        </div>
        <div class="text-slate-600 text-[11px]">
          Progress: <span class="text-emerald-700 font-bold">${gpsTracking.routeProgressPct}%</span> (${gpsTracking.distanceTraveledNm} / ${gpsTracking.distanceRemainingNm + gpsTracking.distanceTraveledNm} nm)
        </div>
      </div>
    `);

    marker.addTo(layer);
  }, [gpsTracking, selectedVessel, isTrajectoryMode, isSeaIceMode]);

  // Fetch candidate records & confirmation evaluations when SAR Candidates layer is enabled
  useEffect(() => {
    if (!mapLayers.sarCandidates) return;

    Promise.all([
      fetch('/api/satellite/candidates').then((r) => r.json()).catch(() => null),
      fetch('/api/satellite/confirmations').then((r) => r.json()).catch(() => null),
    ]).then(([candData, confData]) => {
      if (candData?.success && Array.isArray(candData.records)) {
        const allCandidates: any[] = [];
        candData.records.forEach((record: any) => {
          if (record && Array.isArray(record.candidates)) {
            allCandidates.push(...record.candidates);
          }
        });
        setSarCandidatesList(allCandidates);
      }
      if (confData?.success && Array.isArray(confData.records)) {
        const confMap: Record<string, any> = {};
        confData.records.forEach((record: any) => {
          if (record && Array.isArray(record.confirmations)) {
            record.confirmations.forEach((c: any) => {
              if (c.candidateId) confMap[c.candidateId] = c;
            });
          }
        });
        setSarConfirmationsMap(confMap);
      }
    });
  }, []);

  // Render SAR Candidates ONLY when user clicks [ View SAR Evidence ] inside Area Condition panel!
  useEffect(() => {
    const candLayer = sarCandidatesLayerRef.current;
    candLayer.clearLayers();

    if (!showAreaSarEvidence || !selectedArea || isSeaIceMode) return;
    if (sarCandidatesList.length === 0) return;

    // Spatially filter candidates strictly to selected area bounds!
    const visibleCandidates = filterCandidatesToArea(sarCandidatesList, selectedArea);
    if (visibleCandidates.length === 0) return;


    // Helper to render individual lightweight dot marker (NO PERMANENT TEXT LABELS!)
    const renderIndividualMarker = (cand: any) => {
      const isSelected = selectedSarCandidateId === cand.id;
      const score = cand.candidateScore || 0;
      const conf = sarConfirmationsMap[cand.id];

      let color = '#f59e0b';
      let fillColor = '#f59e0b';
      let radius = 4;
      let fillOpacity = 0.75;

      if (conf?.confirmationStatus === 'REFERENCE_MATCHED') {
        color = '#059669';
        fillColor = '#10b981';
        radius = 7;
        fillOpacity = 0.95;
      } else if (conf?.confirmationStatus === 'SUPPORTED') {
        color = '#2563eb';
        fillColor = '#3b82f6';
        radius = 6;
        fillOpacity = 0.9;
      } else if (score >= 80) {
        color = '#dc2626';
        fillColor = '#ef4444';
        radius = 7;
        fillOpacity = 0.95;
      } else if (score >= 60) {
        color = '#ea580c';
        fillColor = '#f97316';
        radius = 6;
        fillOpacity = 0.9;
      } else if (score >= 40) {
        color = '#d97706';
        fillColor = '#f59e0b';
        radius = 5;
        fillOpacity = 0.8;
      } else {
        color = '#64748b';
        fillColor = '#94a3b8';
        radius = 3;
        fillOpacity = 0.55;
      }

      const circleMarker = L.circleMarker([cand.latitude, cand.longitude], {
        radius: isSelected ? radius + 4 : radius,
        color: isSelected ? '#38bdf8' : color,
        weight: isSelected ? 3 : 1.5,
        fillColor: isSelected ? '#0284c7' : fillColor,
        fillOpacity: isSelected ? 1.0 : fillOpacity,
      });

      circleMarker.on('click', () => {
        setSelectedSarCandidateId(cand.id);
      });

      const areaStr = cand.estimatedAreaM2 && cand.estimatedAreaM2 > 0 ? `${cand.estimatedAreaM2.toLocaleString()} m²` : 'UNAVAILABLE';
      const dimsStr = cand.estimatedWidthMeters && cand.estimatedHeightMeters && cand.estimatedWidthMeters > 0 ? `${cand.estimatedWidthMeters}m × ${cand.estimatedHeightMeters}m` : 'UNAVAILABLE';
      const meanSigmaStr = cand.meanBackscatterDb !== undefined ? `${cand.meanBackscatterDb.toFixed(2)} dB` : 'UNAVAILABLE';
      const contrastStr = cand.contrastDb !== undefined ? `+${cand.contrastDb.toFixed(2)} dB` : 'UNAVAILABLE';

      const statusText = conf ? conf.confirmationStatus.replace(/_/g, ' ') : 'UNCONFIRMED';
      const statusBadgeStyle =
        conf?.confirmationStatus === 'REFERENCE_MATCHED'
          ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
          : conf?.confirmationStatus === 'SUPPORTED'
          ? 'bg-blue-950 text-blue-300 border-blue-700'
          : 'bg-amber-950 text-amber-200 border-amber-700';

      const seaIceText = conf?.seaIceContext?.classification ? conf.seaIceContext.classification.replace(/_/g, ' ') : 'UNAVAILABLE';
      const usnicMatch = conf?.referenceMatch;
      const usnicText = usnicMatch?.status === 'REFERENCE_MATCH_AVAILABLE' ? 'MATCH' : usnicMatch?.status === 'NO_REFERENCE_MATCH' ? 'NO MATCH' : 'UNAVAILABLE';
      const usnicDetail = usnicMatch?.status === 'REFERENCE_MATCH_AVAILABLE'
        ? `<div><span class="text-slate-400">Reference:</span> <strong class="text-emerald-300">${usnicMatch.referenceId || 'USNIC'}</strong></div><div><span class="text-slate-400">Separation:</span> <strong class="text-amber-300">${usnicMatch.separationDistanceKm?.toFixed(2)} km</strong></div>`
        : '';
      const temporalText = conf?.temporalEvidence?.status === 'TEMPORAL_EVIDENCE_AVAILABLE' ? 'AVAILABLE' : 'UNAVAILABLE';

      circleMarker.bindPopup(`
        <div class="p-3 space-y-2 text-xs font-mono min-w-[260px]">
          <div class="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <div>
              <span class="font-bold text-amber-300 text-sm block">SAR CANDIDATE</span>
              <span class="text-[10px] text-slate-400 font-mono">ID: <strong class="text-white">${cand.id}</strong></span>
            </div>
            <span class="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase border ${statusBadgeStyle}">
              ${statusText}
            </span>
          </div>

          <div class="space-y-1.5 text-[10.5px]">
            <div class="border-b border-slate-800 pb-1 font-bold text-amber-400 text-[10px] tracking-wider uppercase">
              SAR EVIDENCE
            </div>
            <div><span class="text-slate-400">Mean σ⁰:</span> <strong class="text-emerald-400">${meanSigmaStr}</strong></div>
            <div><span class="text-slate-400">Contrast:</span> <strong class="text-amber-300">${contrastStr}</strong></div>
            <div><span class="text-slate-400">Candidate Ranking Index:</span> <strong class="text-white">${score} / 100</strong></div>

            <div class="border-b border-slate-800 pt-1 pb-1 font-bold text-cyan-400 text-[10px] tracking-wider uppercase">
              ENVIRONMENTAL CONTEXT
            </div>
            <div><span class="text-slate-400">Sea Ice:</span> <strong class="text-cyan-300">${seaIceText}</strong></div>

            <div class="border-b border-slate-800 pt-1 pb-1 font-bold text-emerald-400 text-[10px] tracking-wider uppercase">
              REFERENCE EVIDENCE
            </div>
            <div><span class="text-slate-400">USNIC:</span> <strong class="${usnicText === 'MATCH' ? 'text-emerald-300' : 'text-slate-300'}">${usnicText}</strong></div>
            ${usnicDetail}

            <div class="border-b border-slate-800 pt-1 pb-1 font-bold text-purple-400 text-[10px] tracking-wider uppercase">
              TEMPORAL EVIDENCE
            </div>
            <div><span class="text-slate-400">Temporal persistence:</span> <strong class="text-purple-300">${temporalText}</strong></div>

            <div class="pt-1.5 border-t border-slate-800 text-[9.5px] text-amber-300 italic font-sans">
              "Candidate is not an independently confirmed iceberg."
            </div>
          </div>
        </div>
      `);

      circleMarker.bindTooltip(
        `
        <div class="text-[10.5px] font-mono p-1 leading-tight select-none">
          <div class="font-bold text-amber-300">${cand.id}</div>
          <div>Ranking Index: <strong class="text-white">${score}/100</strong></div>
          <div class="text-emerald-400 font-semibold">STATUS: ${statusText}</div>
        </div>
      `,
        { sticky: true, opacity: 0.95 }
      );

      circleMarker.addTo(candLayer);
    };

    // 2. Spatial Grid Clustering Decision
    const shouldCluster = mapZoom < 10 && sarDisplayMode === 'clustered' && visibleCandidates.length > 25;

    if (shouldCluster) {
      const gridSizeLat = mapZoom < 5 ? 1.0 : mapZoom < 7 ? 0.4 : mapZoom < 9 ? 0.18 : 0.08;
      const gridSizeLon = mapZoom < 5 ? 2.0 : mapZoom < 7 ? 0.8 : mapZoom < 9 ? 0.36 : 0.16;

      const clusters: Record<string, {
        latSum: number;
        lonSum: number;
        count: number;
        maxScore: number;
        candidates: any[];
        minLat: number; maxLat: number; minLon: number; maxLon: number;
      }> = {};

      visibleCandidates.forEach((cand) => {
        const latBin = Math.floor(cand.latitude / gridSizeLat);
        const lonBin = Math.floor(cand.longitude / gridSizeLon);
        const key = `${latBin},${lonBin}`;

        if (!clusters[key]) {
          clusters[key] = {
            latSum: cand.latitude,
            lonSum: cand.longitude,
            count: 1,
            maxScore: cand.candidateScore || 0,
            candidates: [cand],
            minLat: cand.latitude, maxLat: cand.latitude,
            minLon: cand.longitude, maxLon: cand.longitude,
          };
        } else {
          const cl = clusters[key];
          cl.latSum += cand.latitude;
          cl.lonSum += cand.longitude;
          cl.count += 1;
          cl.maxScore = Math.max(cl.maxScore, cand.candidateScore || 0);
          cl.candidates.push(cand);
          cl.minLat = Math.min(cl.minLat, cand.latitude);
          cl.maxLat = Math.max(cl.maxLat, cand.latitude);
          cl.minLon = Math.min(cl.minLon, cand.longitude);
          cl.maxLon = Math.max(cl.maxLon, cand.longitude);
        }
      });

      Object.values(clusters).forEach((cl) => {
        const avgLat = cl.latSum / cl.count;
        const avgLon = cl.lonSum / cl.count;

        if (cl.count === 1) {
          renderIndividualMarker(cl.candidates[0]);
        } else {
          const clusterSizePx = Math.min(46, Math.max(26, 22 + Math.floor(Math.log2(cl.count) * 3.5)));
          const clusterIconHtml = `
            <div class="relative flex items-center justify-center select-none cursor-pointer group">
              <div class="w-8 h-8 rounded-full bg-slate-950/95 border-2 border-amber-400 text-amber-300 ring-2 ring-amber-500/40 shadow-xl flex flex-col items-center justify-center font-mono transition transform group-hover:scale-110">
                <span class="text-[10px] font-black leading-none">${cl.count}</span>
                <span class="text-[7.5px] text-slate-300 font-medium leading-none">Max:${cl.maxScore}</span>
              </div>
            </div>
          `;

          const clusterIcon = L.divIcon({
            html: clusterIconHtml,
            className: 'custom-sar-cluster-marker',
            iconSize: [clusterSizePx, clusterSizePx],
            iconAnchor: [clusterSizePx / 2, clusterSizePx / 2],
          });

          const clusterMarker = L.marker([avgLat, avgLon], { icon: clusterIcon });

          clusterMarker.bindTooltip(
            `
            <div class="p-2 text-[11px] font-mono leading-tight bg-slate-950 text-white rounded border border-amber-500 shadow-xl select-none">
              <div class="font-bold text-amber-300 border-b border-slate-800 pb-1 flex items-center justify-between gap-3">
                <span>SAR CANDIDATE CLUSTER</span>
                <span class="text-[9px] px-1 bg-amber-950 text-amber-200 border border-amber-700 font-bold uppercase">UNCONFIRMED</span>
              </div>
              <div class="mt-1 space-y-0.5">
                <div>Candidates in cluster: <strong class="text-white font-bold">${cl.count.toLocaleString()}</strong></div>
                <div>Highest Ranking Index: <strong class="text-amber-400 font-bold">${cl.maxScore}/100</strong></div>
                <div class="text-[9px] text-slate-400 pt-0.5">Click cluster to zoom into target area</div>
              </div>
            </div>
          `,
            { sticky: true, opacity: 0.95 }
          );

          clusterMarker.on('click', () => {
            if (mapInstanceRef.current) {
              if (cl.minLat !== cl.maxLat && cl.minLon !== cl.maxLon) {
                const bounds = L.latLngBounds([
                  [cl.minLat - 0.05, cl.minLon - 0.05],
                  [cl.maxLat + 0.05, cl.maxLon + 0.05],
                ]);
                mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 11, animate: true });
              } else {
                mapInstanceRef.current.setView([avgLat, avgLon], Math.min(12, mapZoom + 3), { animate: true });
              }
            }
          });

          clusterMarker.addTo(candLayer);
        }
      });
    } else {
      visibleCandidates.forEach((cand) => {
        renderIndividualMarker(cand);
      });
    }
  }, [
    mapLayers.sarCandidates,
    isSeaIceMode,
    sarCandidatesList,
    sarMinScore,
    sarDisplayMode,
    mapZoom,
    selectedSarCandidateId,
  ]);

  return (
    <div className="relative w-full h-full min-h-[420px] bg-slate-200 overflow-hidden flex flex-col">
      {/* Map Header Overlay Bar (Basemap Selection & Quick Navigation Controls) */}
      <div className="absolute top-3 left-3 z-[1000] flex items-center gap-2 bg-white/95 backdrop-blur-xs p-2 rounded border border-slate-300 shadow-md text-xs font-mono select-none">
        {/* Basemap Selection */}
        <div className="flex items-center gap-1 pr-2 border-r border-slate-200">
          <span className="text-[10px] text-slate-500 uppercase flex items-center gap-1 font-semibold">
            <Satellite className="w-3 h-3 text-slate-700" /> Base:
          </span>
          <button
            onClick={() => setBasemapMode('satellite')}
            className={`px-2 py-0.5 rounded text-[10px] font-bold transition flex items-center gap-1 ${
              basemapMode === 'satellite'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 bg-slate-100'
            }`}
          >
            <Satellite className="w-2.5 h-2.5" /> Satellite
          </button>
          <button
            onClick={() => setBasemapMode('dark')}
            className={`px-2 py-0.5 rounded text-[10px] font-bold transition flex items-center gap-1 ${
              basemapMode === 'dark'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 bg-slate-100'
            }`}
          >
            Dark
          </button>
          <button
            onClick={() => setBasemapMode('ocean')}
            className={`px-2 py-0.5 rounded text-[10px] font-bold transition flex items-center gap-1 ${
              basemapMode === 'ocean'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 bg-slate-100'
            }`}
          >
            Ocean
          </button>
        </div>

        {/* Quick View Controls (Hidden in Trajectory & Sea-Ice Modes) */}
        {/* Quick View Controls (Hidden in Trajectory & Sea-Ice Modes) */}
        {!isTrajectoryMode && !isSeaIceMode && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowPlannerOverlay((prev) => !prev)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition flex items-center gap-1 border ${
                showPlannerOverlay
                  ? 'bg-blue-600 text-white border-blue-700'
                  : 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100'
              }`}
            >
              <Navigation className="w-3 h-3" /> Change Source/Dest
            </button>
            <button
              onClick={handleCenterVessel}
              title="Center map on vessel coordinates"
              className="px-2 py-0.5 rounded text-[10px] font-bold text-amber-900 hover:bg-amber-100 bg-amber-50 border border-amber-300 flex items-center gap-1 transition"
            >
              <Crosshair className="w-3 h-3 text-amber-700" /> Focus Ship
            </button>
            <button
              onClick={() => {
                setIsAreaSelectionActive((prev) => !prev);
                if (activeAreaConditionReport) {
                  setActiveAreaConditionReport(null);
                  setSelectedArea(null);
                  setShowAreaSarEvidence(false);
                }
              }}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition flex items-center gap-1 border ${
                isAreaSelectionActive || selectedArea
                  ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                  : 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
              }`}
            >
              <Target className="w-3 h-3 text-amber-700" />
              {isAreaSelectionActive ? 'Selecting Area...' : 'Analyze Area'}
            </button>
            <button
              onClick={() => handleAnalyzeAhead(areaRadiusKm)}
              className="px-2 py-0.5 rounded text-[10px] font-bold text-sky-900 hover:bg-sky-100 bg-sky-50 border border-sky-300 flex items-center gap-1 transition"
              title="Analyze corridor ahead of vessel along active route"
            >
              <Compass className="w-3 h-3 text-sky-700" /> Analyze Ahead
            </button>
            <button
              onClick={handleResetVoyageView}
              title="Fit Antarctic Voyage Bounds"
              className="px-2 py-0.5 rounded text-[10px] font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 border border-slate-200 flex items-center gap-1 transition"
            >
              <Compass className="w-3 h-3 text-slate-700" /> Full Voyage
            </button>
          </div>
        )}

        {/* Active Mode Indicator */}
        {isTrajectoryMode ? (
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-bold">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            <span>ICEBERG TRAJECTORY MODELING MODE</span>
          </div>
        ) : isSeaIceMode ? (
          environmentalMode === 'REAL' ? (
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>REAL DATA: COPERNICUS MARINE ({realSeaIceProvenance?.datasetId || 'SEAICE_GLO_L4'})</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-200 font-bold">
              <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse"></span>
              <span>SEA-ICE MODE (DEMO / SYNTHETIC DATA)</span>
            </div>
          )
        ) : (
          (() => {
            const selectedRoute = routes.find((r) => r.id === selectedRouteId) || routes[0];
            return (
              <div className="hidden sm:flex items-center gap-1.5 pl-2 border-l border-slate-200 text-[10px] font-mono text-slate-600">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: selectedRoute?.color || '#0ea5e9' }}></span>
                <span>Sampling: <strong className="text-slate-900 uppercase font-bold">{selectedRoute?.type || 'BALANCED'}</strong> Corridor</span>
              </div>
            );
          })()
        )}
      </div>

      {/* Floating Area Selection Instruction Banner */}
      {isAreaSelectionActive && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-[1100] flex items-center gap-2 bg-amber-950/95 text-amber-200 border border-amber-400 p-2.5 rounded-lg shadow-2xl font-mono text-xs select-none">
          <Target className="w-4 h-4 text-amber-400 animate-pulse" />
          <span>Click anywhere on the map to define custom analysis area (Radius: {areaRadiusKm} km)</span>
          <div className="flex items-center gap-1 pl-2 border-l border-amber-800">
            <button
              onClick={() => setAreaRadiusKm(25)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${areaRadiusKm === 25 ? 'bg-amber-400 text-slate-950' : 'bg-amber-900 text-amber-200'}`}
            >
              25km
            </button>
            <button
              onClick={() => setAreaRadiusKm(50)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${areaRadiusKm === 50 ? 'bg-amber-400 text-slate-950' : 'bg-amber-900 text-amber-200'}`}
            >
              50km
            </button>
            <button
              onClick={() => setAreaRadiusKm(100)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${areaRadiusKm === 100 ? 'bg-amber-400 text-slate-950' : 'bg-amber-900 text-amber-200'}`}
            >
              100km
            </button>
          </div>
          <button
            onClick={() => setIsAreaSelectionActive(false)}
            className="ml-2 text-amber-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Floating Area Coverage & Action Card */}
      {selectedArea && !activeAreaConditionReport && (
        <div className="absolute bottom-6 left-3 z-[1100] flex flex-col bg-slate-900/95 text-white backdrop-blur-md border border-cyan-500/60 shadow-2xl rounded-lg p-3 text-xs font-mono w-80 select-none">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-2 font-bold text-cyan-300 text-[11px] uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <Target className="w-4 h-4 text-cyan-400" />
              SELECTED AREA COVERAGE
            </span>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold">
              AREA
            </span>
          </div>

          <div className="space-y-1 text-[11px] mb-2.5">
            <div className="text-slate-200 font-semibold truncate">{selectedArea.name || 'Custom Analysis Area'}</div>
            {selectedArea.centerLat !== undefined && (
              <div className="text-slate-400 text-[10.5px]">
                Center: {Math.abs(selectedArea.centerLat).toFixed(3)}°S, {Math.abs(selectedArea.centerLon || 0).toFixed(3)}°W
              </div>
            )}
          </div>

          {/* Sentinel-1 Real Coverage Check */}
          {(() => {
            const candPids = Array.from(new Set(sarCandidatesList.map((c) => c.productId)));
            const cov = findSatelliteCoverageForArea(selectedArea, cdseCatalogueItems, {}, candPids);
            return (
              <div className="space-y-2">
                <div className="p-2 rounded bg-slate-950 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Sentinel-1 Coverage:</span>
                    <strong className={`font-bold ${cov.isAvailable ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {cov.statusText}
                    </strong>
                  </div>
                  {cov.isAvailable ? (
                    <div className="text-[10px] space-y-0.5 text-slate-300">
                      <div>Product: <strong className="text-white">{cov.productId ? cov.productId.replace('S1A_IW_GRDH_1SDV_', 'S1A_..._') : 'S1A_REAL_PRODUCT'}</strong></div>
                      <div>Source: <span className="text-cyan-300">{cov.source}</span></div>
                    </div>
                  ) : (
                    <div className="text-[10px] text-amber-300 italic">No real Sentinel-1 acquisition covers this location in cache.</div>
                  )}
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleExecuteAreaAnalysis}
                    className="flex-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold text-[11px] shadow transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Search className="w-3.5 h-3.5" /> Analyze Available Data
                  </button>
                  <button
                    onClick={() => {
                      setSelectedArea(null);
                      setActiveAreaConditionReport(null);
                      setShowAreaSarEvidence(false);
                    }}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] transition cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Phase 7C.4-UX Dedicated Area Condition Panel */}
      {activeAreaConditionReport && (
        <div className="absolute top-14 right-3 bottom-6 z-[1200] w-96 bg-slate-950/95 text-white backdrop-blur-md border border-cyan-500/60 shadow-2xl rounded-lg p-4 font-mono text-xs flex flex-col justify-between overflow-y-auto select-none">
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-cyan-400" />
                <div>
                  <h3 className="font-bold text-white text-sm tracking-wider uppercase">AREA CONDITION REPORT</h3>
                  <p className="text-[10px] text-slate-400 font-mono">Location: {activeAreaConditionReport.selectedArea.name || 'Selected Area'}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setActiveAreaConditionReport(null);
                  setSelectedArea(null);
                  setShowAreaSarEvidence(false);
                }}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Satellite Coverage Card */}
            <div className="p-2.5 rounded bg-slate-900 border border-slate-800 space-y-1 text-[11px]">
              <div className="flex justify-between items-center font-bold">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <Satellite className="w-3.5 h-3.5 text-cyan-400" /> Satellite (Sentinel-1)
                </span>
                <span className={`px-1.5 py-0.2 rounded text-[10px] uppercase font-bold border ${
                  activeAreaConditionReport.satelliteCoverage.isAvailable
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                    : 'bg-amber-950 text-amber-200 border-amber-700'
                }`}>
                  {activeAreaConditionReport.satelliteCoverage.statusText}
                </span>
              </div>
              {activeAreaConditionReport.satelliteCoverage.productId && (
                <div className="text-[10px] text-slate-400 truncate pt-0.5">
                  Product ID: <strong className="text-white">{activeAreaConditionReport.satelliteCoverage.productId}</strong>
                </div>
              )}
            </div>

            {/* SAR Analysis Evidence Card */}
            <div className="p-2.5 rounded bg-slate-900 border border-slate-800 space-y-1.5 text-[11px]">
              <div className="font-bold text-amber-300 text-[11px] uppercase tracking-wider border-b border-slate-800 pb-1 flex justify-between">
                <span>SAR ANALYSIS (INTERNAL EVIDENCE)</span>
                <span className="text-cyan-400">Float32 σ⁰ dB</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10.5px]">
                <div><span className="text-slate-400">SAR Candidates:</span> <strong className="text-amber-300 font-bold">{activeAreaConditionReport.sarAnalysis.totalCandidatesInArea} candidates</strong></div>
                <div><span className="text-slate-400">Max Ranking Index:</span> <strong className="text-white font-bold">{activeAreaConditionReport.sarAnalysis.highestRankingIndex} / 100</strong></div>
                <div><span className="text-slate-400">Density:</span> <strong className="text-slate-200">{activeAreaConditionReport.sarAnalysis.candidateDensityPer100Km2} / 100 km²</strong></div>
                <div><span className="text-slate-400">Confirmation:</span> <strong className="text-amber-400 font-bold uppercase">{activeAreaConditionReport.sarAnalysis.confirmationStatus.replace(/_/g, ' ')}</strong></div>
              </div>
              <div className="text-[10px] text-slate-300 italic pt-1 border-t border-slate-800/60">
                {activeAreaConditionReport.sarAnalysis.explanation}
              </div>
            </div>

            {/* Environmental Context Summary Card */}
            <div className="p-2.5 rounded bg-slate-900 border border-slate-800 space-y-1.5 text-[11px]">
              <div className="font-bold text-cyan-300 text-[11px] uppercase tracking-wider border-b border-slate-800 pb-1">
                ENVIRONMENTAL CONTEXT
              </div>
              <div className="space-y-1 text-[10.5px]">
                <div className="flex justify-between"><span className="text-slate-400">Sea Ice Context:</span> <strong className="text-cyan-300 font-bold">{activeAreaConditionReport.environmentalContext.seaIceClassification.replace(/_/g, ' ')}</strong></div>
                <div className="flex justify-between"><span className="text-slate-400">USNIC Reference:</span> <strong className="text-emerald-300 font-bold">{activeAreaConditionReport.sarAnalysis.usnicReferenceMatchStatus.replace(/_/g, ' ')}</strong></div>
                <div className="flex justify-between"><span className="text-slate-400">Weather Forecast:</span> <strong className="text-amber-300 font-bold">{activeAreaConditionReport.environmentalContext.windSpeedKnots || 22} kts @ {activeAreaConditionReport.environmentalContext.windDirectionDeg || 190}°</strong></div>
                <div className="flex justify-between"><span className="text-slate-400">Ocean Current:</span> <strong className="text-cyan-300 font-bold">{activeAreaConditionReport.environmentalContext.currentSpeedKnots || 0.45} kts @ {activeAreaConditionReport.environmentalContext.currentHeadingDeg || 210}°</strong></div>
              </div>
            </div>

            {/* Data Freshness & Confidence */}
            <div className="p-2.5 rounded bg-slate-900 border border-slate-800 grid grid-cols-2 gap-2 text-[10.5px]">
              <div>
                <span className="text-slate-400 block text-[9.5px]">DATA FRESHNESS</span>
                <strong className="text-emerald-400 font-bold">{activeAreaConditionReport.dataFreshness.overallFreshness} ({activeAreaConditionReport.dataFreshness.dataAgeHours}h)</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[9.5px]">OVERALL CONFIDENCE</span>
                <strong className="text-cyan-300 font-bold">{activeAreaConditionReport.overallDataConfidence}</strong>
              </div>
            </div>

            {/* Decision-Impact Data Acquisition Integration */}
            {activeAreaConditionReport.decisionImpactIntegration && (
              <div className="p-2.5 rounded bg-slate-900 border border-blue-900/60 space-y-1 text-[10.5px]">
                <div className="flex justify-between items-center font-bold text-blue-400 text-[10px] uppercase">
                  <span>DECISION-IMPACT DATA ACQUISITION</span>
                  <span className="px-1.5 py-0.2 rounded bg-blue-950 text-blue-300 border border-blue-800">CONNECTED</span>
                </div>
                <div>Priority: <strong className="text-amber-300">{activeAreaConditionReport.decisionImpactIntegration.priority} ({activeAreaConditionReport.decisionImpactIntegration.score}/100)</strong></div>
                <div className="text-[10px] text-slate-300">{activeAreaConditionReport.decisionImpactIntegration.explanation}</div>
              </div>
            )}

            {/* Mandatory Scientific Disclaimer Notice */}
            <div className="p-2.5 rounded bg-amber-950/40 border border-amber-700/60 text-[10px] text-amber-200 italic space-y-1">
              <div className="font-bold text-amber-300 not-italic uppercase tracking-wider text-[9.5px] flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-amber-400" /> SCIENTIFIC LIMITATION NOTICE
              </div>
              <p>"{activeAreaConditionReport.disclaimer}"</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-800 space-y-2">
            <button
              onClick={() => setShowAreaSarEvidence((prev) => !prev)}
              className={`w-full py-2 rounded font-bold text-[11px] transition flex items-center justify-center gap-1.5 border cursor-pointer ${
                showAreaSarEvidence
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                  : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-amber-500/60'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              {showAreaSarEvidence ? 'Hide Area SAR Evidence' : 'View SAR Evidence (Area Only)'}
            </button>
            <button
              onClick={() => {
                setActiveAreaConditionReport(null);
                setSelectedArea(null);
                setShowAreaSarEvidence(false);
              }}
              className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded font-bold text-[11px] border border-slate-800 transition cursor-pointer"
            >
              Close Area Condition
            </button>
          </div>
        </div>
      )}


      {/* Floating Sea-Ice MAP PARAMETERS Overlay Panel */}
      {isSeaIceMode && (
        <div className="absolute top-14 left-3 z-[1000] flex flex-col bg-slate-900/90 text-white backdrop-blur-xs border border-slate-700 shadow-md rounded p-2.5 text-xs font-mono select-none w-52">
          <div className="flex items-center justify-between border-b border-slate-700 pb-1 mb-1.5 font-bold text-slate-200 text-[10px] tracking-wider uppercase">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3 h-3 text-cyan-400" />
              SEA-ICE MAP LAYERS
            </span>
            <span className="text-[9px] px-1 rounded bg-slate-800 text-cyan-300 border border-slate-700 font-semibold">
              MODEL
            </span>
          </div>
          <div className="space-y-1 text-[10.5px]">
            <label className="flex items-center justify-between cursor-pointer select-none py-0.5 px-1 rounded hover:bg-slate-800/80 transition">
              <span className="text-slate-300 font-medium">Sea-Ice Concentration</span>
              <input type="checkbox" checked={true} readOnly className="w-3.5 h-3.5 rounded border-slate-600 accent-blue-500" />
            </label>
            <label className="flex items-center justify-between cursor-pointer select-none py-0.5 px-1 rounded hover:bg-slate-800/80 transition">
              <span className="text-slate-300 font-medium">Drift Vectors</span>
              <input
                type="checkbox"
                checked={seaIceShowDrift}
                onChange={(e) => setSeaIceShowDrift(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-slate-600 accent-blue-500 cursor-pointer"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer select-none py-0.5 px-1 rounded hover:bg-slate-800/80 transition">
              <span className="text-slate-300 font-medium">Forecast Uncertainty</span>
              <input
                type="checkbox"
                checked={seaIceShowUncertainty}
                onChange={(e) => setSeaIceShowUncertainty(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-slate-600 accent-blue-500 cursor-pointer"
              />
            </label>
          </div>
        </div>
      )}

      {/* Floating MAP PARAMETERS Control Panel for Default Mode */}
      {!isTrajectoryMode && !isSeaIceMode && (
        <div className="absolute top-14 left-3 z-[1000] flex flex-col bg-white/95 backdrop-blur-xs border border-slate-300 shadow-md rounded p-2.5 text-xs font-mono text-slate-800 select-none w-52 max-h-[calc(100%-75px)] overflow-y-auto">
          <div className="flex items-center justify-between border-b border-slate-200 pb-1 mb-1.5 font-bold text-slate-900 text-[10px] tracking-wider uppercase">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3 h-3 text-slate-700" />
              MAP PARAMETERS
            </span>
            <span className="text-[9px] px-1 rounded bg-slate-100 text-slate-500 border border-slate-200 font-semibold">
              WGS84
            </span>
          </div>

          <div className="space-y-0.5 text-[10.5px]">
            <label className="flex items-center justify-between cursor-pointer select-none py-0.5 px-1 rounded hover:bg-slate-100/80 transition">
              <span className="text-slate-700 font-medium">Tracked Icebergs</span>
              <input
                type="checkbox"
                checked={mapLayers.icebergs}
                onChange={() => toggleMapLayer('icebergs')}
                className="w-3.5 h-3.5 rounded border-slate-300 text-slate-900 focus:ring-0 accent-slate-900 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer select-none py-0.5 px-1 rounded hover:bg-slate-100/80 transition">
              <span className="text-slate-700 font-medium">SAR Candidates</span>
              <input
                type="checkbox"
                checked={mapLayers.sarCandidates}
                onChange={() => toggleMapLayer('sarCandidates')}
                className="w-3.5 h-3.5 rounded border-slate-300 text-slate-900 focus:ring-0 accent-slate-900 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer select-none py-0.5 px-1 rounded hover:bg-slate-100/80 transition">
              <span className="text-slate-700 font-medium">Uncertainty Envelope</span>
              <input
                type="checkbox"
                checked={mapLayers.uncertainty}
                onChange={() => toggleMapLayer('uncertainty')}
                className="w-3.5 h-3.5 rounded border-slate-300 text-slate-900 focus:ring-0 accent-slate-900 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer select-none py-0.5 px-1 rounded hover:bg-slate-100/80 transition">
              <span className="text-slate-700 font-medium">Sea Ice Field</span>
              <input
                type="checkbox"
                checked={mapLayers.seaIce}
                onChange={() => toggleMapLayer('seaIce')}
                className="w-3.5 h-3.5 rounded border-slate-300 text-slate-900 focus:ring-0 accent-slate-900 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer select-none py-0.5 px-1 rounded hover:bg-slate-100/80 transition">
              <span className="text-slate-700 font-medium">Drift Vectors</span>
              <input
                type="checkbox"
                checked={mapLayers.trajectories}
                onChange={() => toggleMapLayer('trajectories')}
                className="w-3.5 h-3.5 rounded border-slate-300 text-slate-900 focus:ring-0 accent-slate-900 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer select-none py-0.5 px-1 rounded hover:bg-slate-100/80 transition">
              <span className="text-slate-700 font-medium">Currents & Wind</span>
              <input
                type="checkbox"
                checked={mapLayers.ocean && mapLayers.weather}
                onChange={() => {
                  toggleMapLayer('ocean');
                  toggleMapLayer('weather');
                }}
                className="w-3.5 h-3.5 rounded border-slate-300 text-slate-900 focus:ring-0 accent-slate-900 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer select-none py-0.5 px-1 rounded hover:bg-slate-100/80 transition">
              <span className="text-slate-700 font-medium">Route Corridors</span>
              <input
                type="checkbox"
                checked={mapLayers.routes}
                onChange={() => toggleMapLayer('routes')}
                className="w-3.5 h-3.5 rounded border-slate-300 text-slate-900 focus:ring-0 accent-slate-900 cursor-pointer"
              />
            </label>
          </div>

          <div className="mt-1.5 pt-1.5 border-t border-slate-200 text-[9.5px] space-y-0.5 text-slate-600 font-sans">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 bg-emerald-600 rounded"></span>
              <span>SAFEST Route</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 bg-blue-600 rounded"></span>
              <span>BALANCED Route</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 bg-amber-600 rounded"></span>
              <span>FASTEST Route</span>
            </div>
            {activeCounterfactualResult && (
              <div className="flex items-center gap-1.5 pt-0.5 border-t border-slate-200">
                <span className="w-2.5 h-0.5 bg-pink-500 rounded border-b border-dashed border-white"></span>
                <span className="font-bold text-pink-700">Counterfactual Route (---)</span>
              </div>
            )}
            {selectedAcquisitionFootprintId && (
              <div className="flex items-center gap-1.5 pt-0.5 border-t border-slate-200">
                <span className="w-2.5 h-2.5 rounded-full border border-blue-500 bg-blue-500/20 border-dashed"></span>
                <span className="font-bold text-blue-700">Observation Footprint</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating SAR CANDIDATES Display Control & Summary Panel */}
      {mapLayers.sarCandidates && !isSeaIceMode && (
        <div className="absolute bottom-6 right-3 z-[1000] flex flex-col bg-slate-900/95 text-white backdrop-blur-md border border-amber-500/50 shadow-2xl rounded-lg p-3 text-xs font-mono w-72 select-none">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-2 font-bold text-amber-300 text-[11px] uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <Satellite className="w-3.5 h-3.5 text-amber-400" />
              SAR CANDIDATES LAYER
            </span>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800 font-bold">
              REAL S1
            </span>
          </div>

          {/* Candidate Overview Summary */}
          <div className="space-y-1 text-[10.5px] mb-2 bg-slate-950/80 p-2 rounded border border-slate-800">
            <div className="flex justify-between"><span className="text-slate-400">Extracted Candidates:</span><strong className="text-white">{sarCandidatesList.length.toLocaleString()} UNCONFIRMED</strong></div>
            <div className="flex justify-between"><span className="text-slate-400">Status:</span><strong className="text-amber-300 font-bold">UNCONFIRMED SAR CANDIDATE</strong></div>
            <div className="flex justify-between"><span className="text-slate-400">Ranking Metric:</span><strong className="text-cyan-300">Candidate Ranking Index</strong></div>
            <div className="flex justify-between"><span className="text-slate-400">Confirmation:</span><strong className="text-red-400 font-bold">NOT PERFORMED</strong></div>
          </div>

          {/* Display Mode Selection */}
          <div className="space-y-1.5 mb-2">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Display Mode:</span>
            <div className="grid grid-cols-3 gap-1">
              <button
                onClick={() => setSarDisplayMode('clustered')}
                className={`px-1.5 py-1 rounded text-[10px] font-bold border transition ${
                  sarDisplayMode === 'clustered'
                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                Clustered
              </button>
              <button
                onClick={() => setSarDisplayMode('top')}
                className={`px-1.5 py-1 rounded text-[10px] font-bold border transition ${
                  sarDisplayMode === 'top'
                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                Top 20
              </button>
              <button
                onClick={() => setSarDisplayMode('area')}
                className={`px-1.5 py-1 rounded text-[10px] font-bold border transition ${
                  sarDisplayMode === 'area'
                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                Map Bounds
              </button>
            </div>
          </div>

          {/* Minimum Ranking Score Slider */}
          <div className="space-y-1 mb-2">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-400 font-bold uppercase">Minimum Ranking Index:</span>
              <span className="text-amber-400 font-bold">{sarMinScore} / 100</span>
            </div>
            <input
              type="range"
              min="0"
              max="80"
              step="5"
              value={sarMinScore}
              onChange={(e) => setSarMinScore(Number(e.target.value))}
              className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
            />
            <span className="text-[9px] text-slate-400 italic block">Display filter only — underlying analysis retains {sarCandidatesList.length.toLocaleString()} candidates.</span>
          </div>

          {/* Top Candidates Quick List */}
          {sarCandidatesList.length > 0 && (
            <div className="border-t border-slate-800 pt-2 space-y-1">
              <span className="text-[9.5px] text-slate-400 font-bold uppercase flex justify-between">
                <span>TOP RANKED CANDIDATES</span>
                <span className="text-amber-300">Click to focus</span>
              </span>
              <div className="max-h-24 overflow-y-auto space-y-1 pr-1 font-mono text-[10px]">
                {sarCandidatesList
                  .slice()
                  .sort((a, b) => (b.candidateScore || 0) - (a.candidateScore || 0))
                  .slice(0, 5)
                  .map((c, idx) => (
                    <div
                      key={c.id}
                      onClick={() => {
                        setSelectedSarCandidateId(c.id);
                        if (mapInstanceRef.current) {
                          mapInstanceRef.current.setView([c.latitude, c.longitude], 11, { animate: true });
                        }
                      }}
                      className={`p-1 rounded cursor-pointer flex items-center justify-between transition border ${
                        selectedSarCandidateId === c.id
                          ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                          : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <span className="truncate">#{idx + 1} {c.id.replace('SAR_CAND_S1A_IW_GRD_', 'CAND_')}</span>
                      <span className="font-bold text-amber-400 ml-1">Score {c.candidateScore}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="mt-2 pt-1.5 border-t border-slate-800 flex items-center justify-between text-[9px] text-slate-400">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-400"></span> Score &lt;30</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Score 30+</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-600"></span> Score 60+</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-sky-400 border border-white"></span> Selected</span>
          </div>
        </div>
      )}

      {/* Route Planner Overlay Popover */}
      {showPlannerOverlay && (
        <div className="absolute top-14 left-3 z-[1050] w-full max-w-sm bg-white rounded-lg shadow-2xl border border-slate-300 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 bg-slate-900 text-white font-mono text-xs">
            <span className="font-bold flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5 text-blue-400" />
              Route Planner & Coordinates
            </span>
            <button
              onClick={() => setShowPlannerOverlay(false)}
              className="text-slate-400 hover:text-white p-0.5 rounded transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-3 max-h-[75vh] overflow-y-auto">
            <RoutePlannerWidget
              compact
              onRoutesCalculated={() => setShowPlannerOverlay(false)}
            />
          </div>
        </div>
      )}

      {/* Phase 4 — Decision Confidence Map Overlay Indicator */}
      {decisionConfidence && (
        <div
          className={`absolute top-14 right-3 z-[1000] flex items-center gap-2 px-2.5 py-1 rounded border font-mono text-[10px] shadow-md backdrop-blur-xs select-none transition ${
            decisionConfidence.overallLevel === 'HIGH'
              ? 'bg-slate-900/90 border-emerald-500 text-white'
              : decisionConfidence.overallLevel === 'MEDIUM'
              ? 'bg-slate-900/90 border-sky-500 text-white'
              : decisionConfidence.overallLevel === 'LOW'
              ? 'bg-amber-950/95 border-amber-400 text-amber-100 ring-2 ring-amber-500/50'
              : 'bg-red-950/95 border-red-500 text-red-100 ring-2 ring-red-500/50'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <ShieldAlert className={`w-3.5 h-3.5 ${
              decisionConfidence.overallLevel === 'HIGH' ? 'text-emerald-400' :
              decisionConfidence.overallLevel === 'MEDIUM' ? 'text-sky-400' :
              decisionConfidence.overallLevel === 'LOW' ? 'text-amber-400' : 'text-red-400'
            }`} />
            <span className="text-slate-300 font-bold uppercase">NAV ROUTE CONFIDENCE:</span>
            <span
              className={`font-black px-1.5 py-0.2 rounded text-[9px] uppercase border ${
                decisionConfidence.overallLevel === 'HIGH'
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                  : decisionConfidence.overallLevel === 'MEDIUM'
                  ? 'bg-sky-950 text-sky-300 border-sky-700'
                  : decisionConfidence.overallLevel === 'LOW'
                  ? 'bg-amber-900 text-amber-200 border-amber-600'
                  : 'bg-red-900 text-red-200 border-red-600'
              }`}
            >
              {decisionConfidence.overallLevel} ({decisionConfidence.confidenceScore})
            </span>
          </div>

          {(decisionConfidence.overallLevel === 'LOW' || decisionConfidence.overallLevel === 'CRITICAL') && (
            <span className="text-[9px] font-sans font-bold text-amber-300 hidden sm:inline border-l border-slate-700 pl-2">
              {decisionConfidence.isRecommendationBlocked ? 'NAV BLOCKED' : 'CONSERVATIVE PENALTY ACTIVE'}
            </span>
          )}
        </div>
      )}

      {/* Primary Leaflet Container */}
      <div ref={mapContainerRef} className="w-full h-full min-h-[420px] relative z-0" />
    </div>
  );
};

