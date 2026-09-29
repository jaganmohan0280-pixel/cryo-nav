/**
 * CRYO NAV — Master Application State & Decision Support Context
 * Coordinates all scientific modules, offline cache, GPS tracking loop,
 * Decision Impact Engine, and environmental state.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  VesselProfile,
  MissionConfig,
  IcebergDetection,
  SeaIceCell,
  WeatherCondition,
  OceanCurrentCell,
  SatelliteProduct,
  RouteAlternative,
  ConnectionState,
  SimulationScenario,
  GPSTrackingState,
  Alert,
  ResearchReference,
  EnvironmentalDataMode,
  DataProvenance,
  EnvironmentalAlignmentResult,
  DecisionConfidenceResult,
  CounterfactualScenario,
  CounterfactualRouteResult,
  BatchSensitivitySummary,
  CounterfactualParameter,
  DataAcquisitionRecommendation,
  FiveMinuteBudgetSummary,
  SatelliteCatalogueItem,
  CdseStacQueryStatus,
  CdseStacSearchResult,
  SatelliteAcquisitionRecord,
  SatelliteAcquisitionStatus,
} from '../types';
import { generateDataAcquisitionPriorities } from '../services/decisionImpactEngine';
import { convertStacItemToSatelliteProduct } from '../data/adapters/cdseStacAdapter';
import {
  DEFAULT_COUNTERFACTUAL_SCENARIOS,
  runCounterfactualScenario,
  runBatchSensitivityAnalysis,
  runIcebergTrajectoryWhatIf,
} from '../services/counterfactualEngine';

import { buildUnifiedEnvironmentalState } from '../data/environmentalState';
import { evaluateDecisionConfidence } from '../services/confidenceEngine';
import {
  INITIAL_VESSELS,
  DEFAULT_MISSION,
  INITIAL_ICEBERGS,
  generateSyntheticSeaIce,
  SYNTHETIC_WEATHER,
  SYNTHETIC_OCEAN_CURRENTS,
  INITIAL_SATELLITE_PRODUCTS,
  RESEARCH_REFERENCES,
  SIH_PROJECT_METADATA,
} from '../data/syntheticAntarcticData';
import { generateRouteAlternatives, calculateIcebergCPA } from '../services/routingEngine';
import { computeIcebergTrajectories } from '../services/trajectoryModel';
import { forecastSeaIceField } from '../services/seaIceModel';
import { calculateDistanceNm } from '../services/riskEngine';
import { buildVoyageState } from '../services/voyageStateEngine';
import { evaluateAllRouteHazards } from '../services/hazardEncounterEngine';
import { evaluateUncertainty } from '../services/uncertaintyEngine';
import { analyzeRouteResilience } from '../services/routeResilienceEngine';
import { evaluateAcquisitionPriorities } from '../services/decisionImpactAcquisitionEngine';
import { evaluateDecisionReassessment } from '../services/decisionReassessmentEngine';
import { evaluateNavigationAlerts } from '../services/navigationAlertEngine';
import { evaluateModelValidationBatch } from '../services/modelValidationEngine';
import { buildNavigationDecisionState } from '../services/navigationDecisionStateEngine';
import {
  buildNavigationOperationalState,
  NavigationOperationalState,
} from '../services/navigationOperationalStateEngine';

export type ActiveView =
  | 'dashboard'
  | 'mission'
  | 'navigation'
  | 'icebergs'
  | 'seaice'
  | 'acquisition'
  | 'ai'
  | 'references'
  | 'settings';

export interface MapLayerToggles {
  seaIce: boolean;
  icebergs: boolean;
  trajectories: boolean;
  uncertainty: boolean;
  risk: boolean;
  weather: boolean;
  ocean: boolean;
  routes: boolean;
  sarCandidates: boolean;
}

interface AppContextType {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  vessels: VesselProfile[];
  selectedVessel: VesselProfile;
  setSelectedVessel: (v: VesselProfile) => void;
  mission: MissionConfig;
  setMission: (m: MissionConfig) => void;
  icebergs: IcebergDetection[];
  seaIceCells: SeaIceCell[];
  weather: WeatherCondition;
  currents: OceanCurrentCell[];
  satelliteProducts: SatelliteProduct[];
  routes: RouteAlternative[];
  recommendedRoute: RouteAlternative | null;
  selectedRouteId: 'safest' | 'balanced' | 'fastest';
  setSelectedRouteId: (id: 'safest' | 'balanced' | 'fastest') => void;
  forecastHorizonHours: number;
  setForecastHorizonHours: (hours: number) => void;
  mapLayers: MapLayerToggles;
  toggleMapLayer: (layer: keyof MapLayerToggles) => void;
  connectionState: ConnectionState;
  setConnectionState: (state: ConnectionState) => void;
  simulationScenario: SimulationScenario;
  updateSimulationScenario: (scenario: Partial<SimulationScenario>) => void;
  resetSimulationScenario: () => void;
  gpsTracking: GPSTrackingState;
  startGpsSimulation: () => void;
  pauseGpsSimulation: () => void;
  resetGpsSimulation: () => void;
  alerts: Alert[];
  acknowledgeAlert: (id: string) => void;
  dismissAlert: (id: string) => void;
  addAlert: (alert: Omit<Alert, 'id' | 'timestamp' | 'acknowledged'>) => void;
  decisionChangeStatus: {
    changed: boolean;
    oldRouteId: string;
    newRouteId: string;
    message: string;
    timestamp: string;
  } | null;
  acquireSatelliteProduct: (
    productId: string,
    assetId?: string,
    assetUrl?: string,
    sourceChecksum?: string,
    expectedSize?: number,
    collection?: string,
    acquisitionTime?: string
  ) => Promise<SatelliteAcquisitionRecord | null>;
  selectedIcebergId: string | null;
  setSelectedIcebergId: (id: string | null) => void;
  replanRoutes: () => void;
  resetDemoToInitial: () => void;
  researchReferences: ResearchReference[];
  sihMetadata: typeof SIH_PROJECT_METADATA;
  isLiveTelemetry: boolean;
  lastLiveSyncTime: string | null;
  syncLiveTelemetry: () => Promise<void>;
  environmentalMode: EnvironmentalDataMode;
  setEnvironmentalMode: (mode: EnvironmentalDataMode) => void;
  realSeaIceCells: SeaIceCell[];
  realSeaIceProvenance: DataProvenance | null;
  realSeaIceError: string | null;
  isFetchingRealSeaIce: boolean;
  fetchRealSeaIceData: () => Promise<void>;
  realOceanCurrentCells: OceanCurrentCell[];
  realOceanCurrentProvenance: DataProvenance | null;
  realOceanCurrentError: string | null;
  isFetchingRealOceanCurrents: boolean;
  fetchRealOceanCurrentsData: () => Promise<void>;
  realIcebergs: IcebergDetection[];
  realIcebergProvenance: DataProvenance | null;
  realIcebergError: string | null;
  isFetchingRealIcebergs: boolean;
  fetchRealIcebergData: () => Promise<void>;
  realWeather: WeatherCondition | null;
  realWeatherGrid: WeatherCondition[];
  realWeatherProvenance: DataProvenance | null;
  realWeatherError: string | null;
  isFetchingRealWeather: boolean;
  fetchRealWeatherData: () => Promise<void>;
  unifiedEnvironment: EnvironmentalAlignmentResult;
  decisionConfidence: DecisionConfidenceResult;

  // Phase 5 — Counterfactual & Sensitivity Analysis Engine State
  counterfactualScenarios: CounterfactualScenario[];
  activeCounterfactualResult: CounterfactualRouteResult | null;
  batchSensitivitySummary: BatchSensitivitySummary | null;
  runSingleCounterfactual: (scenario: CounterfactualScenario) => CounterfactualRouteResult;
  runBatchSensitivity: () => BatchSensitivitySummary;
  clearCounterfactual: () => void;

  // Phase 6 — Decision-Impact Data Acquisition Engine State
  dataAcquisitionRecommendations: DataAcquisitionRecommendation[];
  fiveMinuteBudgetSummary: FiveMinuteBudgetSummary;
  selectedAcquisitionFootprintId: string | null;
  setSelectedAcquisitionFootprintId: (id: string | null) => void;

  // Phase 7A — CDSE STAC Satellite Catalogue Integration State
  cdseCatalogueItems: SatelliteCatalogueItem[];
  cdseQueryStatus: CdseStacQueryStatus;
  cdseLastQueryResult: CdseStacSearchResult | null;
  cdseQueryInfo: { bbox: [number, number, number, number]; startTime: string; endTime: string; collection: string; limit: number } | null;
  isFetchingCdseCatalogue: boolean;
  fetchCdseCatalogue: (overrideParams?: Partial<{ minLat: number; maxLat: number; minLon: number; maxLon: number; startTime: string; endTime: string; collection: string; limit: number }>) => Promise<void>;

  // Phase 7B — Satellite Product Acquisition & Local Caching State
  satelliteAcquisitionRecords: Record<string, SatelliteAcquisitionRecord>;
  loadCachedAcquisitions: () => Promise<void>;

  // Phase 18C — Authoritative Aggregated Navigation Operational State
  navigationOperationalState: NavigationOperationalState;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [vessels, setVessels] = useState<VesselProfile[]>(INITIAL_VESSELS);
  const [selectedVessel, setSelectedVesselState] = useState<VesselProfile>(INITIAL_VESSELS[0]);
  const [mission, setMissionState] = useState<MissionConfig>(DEFAULT_MISSION);
  const [icebergs, setIcebergs] = useState<IcebergDetection[]>(INITIAL_ICEBERGS);
  const [rawSeaIceCells, setRawSeaIceCells] = useState<SeaIceCell[]>(generateSyntheticSeaIce());
  const [weather, setWeather] = useState<WeatherCondition>(SYNTHETIC_WEATHER);
  const [satelliteProducts, setSatelliteProducts] = useState<SatelliteProduct[]>(INITIAL_SATELLITE_PRODUCTS);

  // Phase 5 Counterfactual State
  const [activeCounterfactualResult, setActiveCounterfactualResult] = useState<CounterfactualRouteResult | null>(null);
  const [batchSensitivitySummary, setBatchSensitivitySummary] = useState<BatchSensitivitySummary | null>(null);

  const [researchReferences] = useState<ResearchReference[]>(RESEARCH_REFERENCES);
  const [isLiveTelemetry, setIsLiveTelemetry] = useState<boolean>(false);
  const [lastLiveSyncTime, setLastLiveSyncTime] = useState<string | null>(null);
  const [forecastHorizonHours, setForecastHorizonHours] = useState<number>(0);
  const [selectedRouteId, setSelectedRouteId] = useState<'safest' | 'balanced' | 'fastest'>('balanced');
  const [selectedIcebergId, setSelectedIcebergId] = useState<string | null>(null);

  // REAL vs DEMO Environmental Mode State
  const [environmentalMode, setEnvironmentalModeState] = useState<EnvironmentalDataMode>('DEMO');
  const [realSeaIceCells, setRealSeaIceCells] = useState<SeaIceCell[]>([]);
  const [realSeaIceProvenance, setRealSeaIceProvenance] = useState<DataProvenance | null>(null);
  const [realSeaIceError, setRealSeaIceError] = useState<string | null>(null);
  const [isFetchingRealSeaIce, setIsFetchingRealSeaIce] = useState<boolean>(false);

  const [realOceanCurrentCells, setRealOceanCurrentCells] = useState<OceanCurrentCell[]>([]);
  const [realOceanCurrentProvenance, setRealOceanCurrentProvenance] = useState<DataProvenance | null>(null);
  const [realOceanCurrentError, setRealOceanCurrentError] = useState<string | null>(null);
  const [isFetchingRealOceanCurrents, setIsFetchingRealOceanCurrents] = useState<boolean>(false);

  const fetchRealSeaIceData = useCallback(async () => {
    setIsFetchingRealSeaIce(true);
    setRealSeaIceError(null);
    try {
      const res = await fetch('/api/environment/sea-ice');
      const data = await res.json();
      if (data.success && data.cells && data.cells.length > 0) {
        setRealSeaIceCells(data.cells);
        setRealSeaIceProvenance(data.provenance);
        setRealSeaIceError(null);
      } else {
        setRealSeaIceCells([]);
        setRealSeaIceProvenance(null);
        setRealSeaIceError(data.error || 'REAL DATA UNAVAILABLE: Copernicus Marine endpoint returned error.');
      }
    } catch (err: any) {
      setRealSeaIceCells([]);
      setRealSeaIceProvenance(null);
      setRealSeaIceError(`REAL DATA UNAVAILABLE: Request failed (${err.message || 'Network connection error'}).`);
    } finally {
      setIsFetchingRealSeaIce(false);
    }
  }, []);

  const fetchRealOceanCurrentsData = useCallback(async () => {
    setIsFetchingRealOceanCurrents(true);
    setRealOceanCurrentError(null);
    try {
      const res = await fetch('/api/environment/ocean-currents');
      const data = await res.json();
      if (data.success && data.cells && data.cells.length > 0) {
        setRealOceanCurrentCells(data.cells);
        setRealOceanCurrentProvenance(data.provenance);
        setRealOceanCurrentError(null);
      } else {
        setRealOceanCurrentCells([]);
        setRealOceanCurrentProvenance(null);
        setRealOceanCurrentError(data.error || 'REAL OCEAN CURRENT DATA UNAVAILABLE: Copernicus Marine endpoint returned error.');
      }
    } catch (err: any) {
      setRealOceanCurrentCells([]);
      setRealOceanCurrentProvenance(null);
      setRealOceanCurrentError(`REAL OCEAN CURRENT DATA UNAVAILABLE: Request failed (${err.message || 'Network connection error'}).`);
    } finally {
      setIsFetchingRealOceanCurrents(false);
    }
  }, []);

  const [realIcebergs, setRealIcebergs] = useState<IcebergDetection[]>([]);
  const [realIcebergProvenance, setRealIcebergProvenance] = useState<DataProvenance | null>(null);
  const [realIcebergError, setRealIcebergError] = useState<string | null>(null);
  const [isFetchingRealIcebergs, setIsFetchingRealIcebergs] = useState<boolean>(false);

  const fetchRealIcebergData = useCallback(async () => {
    setIsFetchingRealIcebergs(true);
    setRealIcebergError(null);
    try {
      const res = await fetch('/api/environment/icebergs');
      const data = await res.json();
      if (data.success && data.icebergs && data.icebergs.length > 0) {
        setRealIcebergs(data.icebergs);
        setRealIcebergProvenance(data.provenance);
        setRealIcebergError(null);
      } else {
        setRealIcebergs([]);
        setRealIcebergProvenance(null);
        setRealIcebergError(data.error || 'REAL ICEBERG DATA UNAVAILABLE: USNIC endpoint returned error.');
      }
    } catch (err: any) {
      setRealIcebergs([]);
      setRealIcebergProvenance(null);
      setRealIcebergError(`REAL ICEBERG DATA UNAVAILABLE: Request failed (${err.message || 'Network connection error'}).`);
    } finally {
      setIsFetchingRealIcebergs(false);
    }
  }, []);

  const [realWeather, setRealWeather] = useState<WeatherCondition | null>(null);
  const [realWeatherGrid, setRealWeatherGrid] = useState<WeatherCondition[]>([]);
  const [realWeatherProvenance, setRealWeatherProvenance] = useState<DataProvenance | null>(null);
  const [realWeatherError, setRealWeatherError] = useState<string | null>(null);
  const [isFetchingRealWeather, setIsFetchingRealWeather] = useState<boolean>(false);

  const fetchRealWeatherData = useCallback(async () => {
    setIsFetchingRealWeather(true);
    setRealWeatherError(null);
    try {
      const res = await fetch('/api/environment/weather');
      const data = await res.json();
      if (data.success && data.weather) {
        setRealWeather(data.weather);
        setRealWeatherGrid(data.weatherGrid || []);
        setRealWeatherProvenance(data.provenance);
        setRealWeatherError(null);
      } else {
        setRealWeather(null);
        setRealWeatherGrid([]);
        setRealWeatherProvenance(null);
        setRealWeatherError(data.error || 'REAL WEATHER DATA UNAVAILABLE: ECMWF/Open-Meteo endpoint returned error.');
      }
    } catch (err: any) {
      setRealWeather(null);
      setRealWeatherGrid([]);
      setRealWeatherProvenance(null);
      setRealWeatherError(`REAL WEATHER DATA UNAVAILABLE: Request failed (${err.message || 'Network connection error'}).`);
    } finally {
      setIsFetchingRealWeather(false);
    }
  }, []);

  // Phase 7A — CDSE STAC Catalogue Ingestion State & Callback
  const [cdseCatalogueItems, setCdseCatalogueItems] = useState<SatelliteCatalogueItem[]>([]);
  const [cdseQueryStatus, setCdseQueryStatus] = useState<CdseStacQueryStatus>('IDLE');
  const [cdseLastQueryResult, setCdseLastQueryResult] = useState<CdseStacSearchResult | null>(null);
  const [cdseQueryInfo, setCdseQueryInfo] = useState<{ bbox: [number, number, number, number]; startTime: string; endTime: string; collection: string; limit: number } | null>(null);
  const [isFetchingCdseCatalogue, setIsFetchingCdseCatalogue] = useState<boolean>(false);

  const fetchCdseCatalogue = useCallback(async (overrideParams?: Partial<{ minLat: number; maxLat: number; minLon: number; maxLon: number; startTime: string; endTime: string; collection: string; limit: number }>) => {
    setIsFetchingCdseCatalogue(true);
    setCdseQueryStatus('QUERYING');
    try {
      const minLat = overrideParams?.minLat ?? -68.5;
      const maxLat = overrideParams?.maxLat ?? -59.0;
      const minLon = overrideParams?.minLon ?? -70.0;
      const maxLon = overrideParams?.maxLon ?? -56.0;
      const collection = overrideParams?.collection ?? 'SENTINEL-1';
      const limit = overrideParams?.limit ?? 20;

      let url = `/api/satellite/catalogue?minLat=${minLat}&maxLat=${maxLat}&minLon=${minLon}&maxLon=${maxLon}&collection=${collection}&limit=${limit}`;
      if (overrideParams?.startTime) url += `&startTime=${encodeURIComponent(overrideParams.startTime)}`;
      if (overrideParams?.endTime) url += `&endTime=${encodeURIComponent(overrideParams.endTime)}`;

      const res = await fetch(url);
      const data: CdseStacSearchResult = await res.json();
      setCdseLastQueryResult(data);
      if (data.queryInfo) setCdseQueryInfo(data.queryInfo);

      if (data.success && data.items) {
        if (data.items.length === 0) {
          setCdseCatalogueItems([]);
          setCdseQueryStatus('NO_RESULTS');
        } else {
          setCdseCatalogueItems(data.items);
          setCdseQueryStatus('RESULTS');
        }
      } else {
        setCdseCatalogueItems([]);
        setCdseQueryStatus(data.reason === 'NO_RESULTS' ? 'NO_RESULTS' : 'UNAVAILABLE');
      }
    } catch (err: any) {
      setCdseCatalogueItems([]);
      setCdseQueryStatus('ERROR');
      setCdseLastQueryResult({
        success: false,
        mode: 'REAL',
        queryInfo: { bbox: [-70, -68.5, -56, -59], startTime: '', endTime: '', collection: 'SENTINEL-1', limit: 20 },
        items: [],
        count: 0,
        retrievedAt: new Date().toISOString(),
        error: `CDSE CATALOGUE UNAVAILABLE: ${err.message || err}`,
        reason: 'NETWORK_ERROR',
      });
    } finally {
      setIsFetchingCdseCatalogue(false);
    }
  }, []);

  // Phase 7B — Satellite Product Acquisition Records State & Cache Loading
  const [satelliteAcquisitionRecords, setSatelliteAcquisitionRecords] = useState<Record<string, SatelliteAcquisitionRecord>>({});

  const loadCachedAcquisitions = useCallback(async () => {
    try {
      const res = await fetch('/api/satellite/cache');
      const data = await res.json();
      if (data.success && Array.isArray(data.records)) {
        const recordMap: Record<string, SatelliteAcquisitionRecord> = {};
        data.records.forEach((rec: SatelliteAcquisitionRecord) => {
          if (rec && rec.productId) {
            recordMap[rec.productId] = rec;
          }
        });
        setSatelliteAcquisitionRecords((prev) => ({ ...prev, ...recordMap }));
      }
    } catch (err) {
      console.error('Failed to load cached satellite acquisition records:', err);
    }
  }, []);

  useEffect(() => {
    loadCachedAcquisitions();
  }, [loadCachedAcquisitions]);

  const setEnvironmentalMode = (mode: EnvironmentalDataMode) => {
    setEnvironmentalModeState(mode);
    if (mode === 'REAL') {
      fetchRealSeaIceData();
      fetchRealOceanCurrentsData();
      fetchRealIcebergData();
      fetchRealWeatherData();
      fetchCdseCatalogue();
    }
  };

  const [mapLayers, setMapLayers] = useState<MapLayerToggles>({
    seaIce: true,
    icebergs: false,
    trajectories: false,
    uncertainty: false,
    risk: true,
    weather: true,
    ocean: true,
    routes: true,
    sarCandidates: false,
  });

  const [connectionState, setConnectionStateInternal] = useState<ConnectionState>('ONLINE');
  const [simulationScenario, setSimulationScenario] = useState<SimulationScenario>({
    icebergDriftOffsetPct: 0,
    seaIceSeverity: 'NORMAL',
    windSeverity: 'NORMAL',
    currentSeverity: 'NORMAL',
    freshnessState: 'FRESH',
  });

  const [decisionChangeStatus, setDecisionChangeStatus] = useState<{
    changed: boolean;
    oldRouteId: string;
    newRouteId: string;
    message: string;
    timestamp: string;
  } | null>(null);

  const [alerts, setAlerts] = useState<Alert[]>([
    {
      id: 'alt-1',
      timestamp: '2026-09-06T07:45:00Z',
      severity: 'WARNING',
      type: 'ICEBERG_PROXIMITY',
      title: 'A-76A Fragment Drifting Near Outer Gateway',
      message: 'Tabular fragment ICB-A76A has increased drift speed to 1.4 kts bearing 038°. Keep minimum 3.5 nm clearance.',
      acknowledged: false,
    },
    {
      id: 'alt-2',
      timestamp: '2026-09-06T08:10:00Z',
      severity: 'INFO',
      type: 'NEW_HAZARD',
      title: 'High-Impact SAR Observation Available',
      message: 'Sentinel-1C Swath SAT-S1C covers the critical Marguerite Bay approach with 92% decision impact score.',
      acknowledged: false,
    },
  ]);

  const evaluatedWeather = React.useMemo(() => {
    if (environmentalMode === 'REAL' && realWeather) {
      return realWeather;
    }
    return weather;
  }, [environmentalMode, realWeather, weather]);

  // Dynamic ocean current field (Real Copernicus NEMO 3D observations or Synthetic baseline)
  const currents = React.useMemo(() => {
    if (environmentalMode === 'REAL') {
      return realOceanCurrentCells;
    }
    return SYNTHETIC_OCEAN_CURRENTS;
  }, [environmentalMode, realOceanCurrentCells]);

  // Dynamic sea-ice field computed for current forecast horizon and scenario
  const seaIceCells = React.useMemo(() => {
    if (environmentalMode === 'REAL') {
      return realSeaIceCells;
    }
    const iceFactor =
      simulationScenario.seaIceSeverity === 'HIGH' ? 1.25 : simulationScenario.seaIceSeverity === 'LOW' ? 0.8 : 1.0;
    return forecastSeaIceField(rawSeaIceCells, weather, forecastHorizonHours, iceFactor);
  }, [environmentalMode, realSeaIceCells, rawSeaIceCells, weather, forecastHorizonHours, simulationScenario.seaIceSeverity]);

  // Temporary raw list of real/demo icebergs for unified environment evaluation
  const rawIcebergsList = environmentalMode === 'REAL' ? realIcebergs : icebergs;

  // Memoized Unified Environmental State & Alignment Assessment (Phase 3A)
  const unifiedEnvironment = React.useMemo(() => {
    return buildUnifiedEnvironmentalState({
      mode: environmentalMode,
      analysisTime: mission?.departureTime || new Date().toISOString(),
      regionBbox: [-70.0, -68.5, -56.0, -59.0],
      regionName: mission?.title || 'Antarctic Peninsula / Marguerite Bay Sector',
      seaIce: {
        cells: seaIceCells,
        provenance: environmentalMode === 'REAL' ? realSeaIceProvenance : null,
        error: environmentalMode === 'REAL' ? realSeaIceError : null,
      },
      ocean: {
        cells: currents,
        provenance: environmentalMode === 'REAL' ? realOceanCurrentProvenance : null,
        error: environmentalMode === 'REAL' ? realOceanCurrentError : null,
      },
      icebergs: {
        list: rawIcebergsList,
        provenance: environmentalMode === 'REAL' ? realIcebergProvenance : null,
        error: environmentalMode === 'REAL' ? realIcebergError : null,
      },
      weather: {
        current: evaluatedWeather,
        grid: environmentalMode === 'REAL' ? realWeatherGrid : [],
        provenance: environmentalMode === 'REAL' ? realWeatherProvenance : null,
        error: environmentalMode === 'REAL' ? realWeatherError : null,
      },
    });
  }, [
    environmentalMode,
    mission?.departureTime,
    mission?.title,
    seaIceCells,
    realSeaIceProvenance,
    realSeaIceError,
    currents,
    realOceanCurrentProvenance,
    realOceanCurrentError,
    rawIcebergsList,
    realIcebergProvenance,
    realIcebergError,
    evaluatedWeather,
    realWeatherGrid,
    realWeatherProvenance,
    realWeatherError,
  ]);

  // Icebergs (Real USNIC observations evaluated against Real Copernicus Ocean + ECMWF Weather in REAL mode, or synthetic in DEMO mode)
  const evaluatedIcebergs = React.useMemo(() => {
    if (environmentalMode === 'REAL') {
      if (!realIcebergs || realIcebergs.length === 0) return [];
      const activeWeather = realWeather || weather;
      return computeIcebergTrajectories(
        realIcebergs,
        activeWeather,
        realOceanCurrentCells,
        1.0,
        'REAL',
        realWeatherGrid,
        unifiedEnvironment
      );
    }
    const driftMultiplier = 1.0 + simulationScenario.icebergDriftOffsetPct / 100;
    return computeIcebergTrajectories(icebergs, weather, currents, driftMultiplier, 'DEMO');
  }, [
    environmentalMode,
    realIcebergs,
    icebergs,
    weather,
    realWeather,
    realWeatherGrid,
    currents,
    realOceanCurrentCells,
    unifiedEnvironment,
    simulationScenario.icebergDriftOffsetPct,
  ]);

  // Memoized Decision Confidence Result (Phase 4)
  const decisionConfidence = React.useMemo(() => {
    return evaluateDecisionConfidence({
      unifiedEnvironment,
      seaIceCells,
      icebergs: rawIcebergsList,
      weather: evaluatedWeather,
      currents,
      forecastHorizonHours,
      mode: environmentalMode,
    });
  }, [
    unifiedEnvironment,
    seaIceCells,
    rawIcebergsList,
    evaluatedWeather,
    currents,
    forecastHorizonHours,
    environmentalMode,
  ]);

  // Routes computed dynamically with decision confidence feedback
  const routes = React.useMemo(() => {
    const scenarioModifier =
      simulationScenario.seaIceSeverity === 'HIGH' || simulationScenario.icebergDriftOffsetPct > 10 ? 1.25 : 1.0;
    return generateRouteAlternatives(
      mission,
      selectedVessel,
      evaluatedIcebergs,
      seaIceCells,
      evaluatedWeather,
      scenarioModifier,
      decisionConfidence
    );
  }, [mission, selectedVessel, evaluatedIcebergs, seaIceCells, evaluatedWeather, simulationScenario, decisionConfidence]);

  const recommendedRoute = routes.find((r) => r.isRecommended) || routes[0] || null;

  // Phase 6 & Phase 7A Data Acquisition Engine State & Dynamic Prioritization Computation
  const [selectedAcquisitionFootprintId, setSelectedAcquisitionFootprintId] = useState<string | null>(null);

  const evaluatedSatelliteProducts = React.useMemo(() => {
    if (environmentalMode === 'REAL') {
      if (cdseCatalogueItems.length > 0) {
        return cdseCatalogueItems.map(convertStacItemToSatelliteProduct);
      }
      return []; // In REAL mode, return empty list if CDSE STAC has no products (NO SYNTHETIC FALLBACK!)
    }
    return satelliteProducts;
  }, [environmentalMode, cdseCatalogueItems, satelliteProducts]);

  const { recommendations: dataAcquisitionRecommendations, fiveMinuteBudget: fiveMinuteBudgetSummary } = React.useMemo(() => {
    return generateDataAcquisitionPriorities(
      evaluatedSatelliteProducts,
      routes,
      evaluatedIcebergs,
      seaIceCells,
      connectionState,
      decisionConfidence,
      batchSensitivitySummary,
      environmentalMode
    );
  }, [
    evaluatedSatelliteProducts,
    routes,
    evaluatedIcebergs,
    seaIceCells,
    connectionState,
    decisionConfidence,
    batchSensitivitySummary,
    environmentalMode,
  ]);

  // Decorate icebergs with closest approach encounters to the recommended/selected route
  const displayIcebergs = React.useMemo(() => {
    const activeRoute =
      routes.find((r) => r.id === selectedRouteId || (r.labels && r.labels.map((l) => l.toLowerCase()).includes(selectedRouteId))) ||
      recommendedRoute ||
      (routes.length > 0 ? routes[0] : null);
    if (!activeRoute) return evaluatedIcebergs;

    return evaluatedIcebergs.map((berg) => {
      const cpa = calculateIcebergCPA(activeRoute.waypoints, berg, selectedVessel.cruisingSpeedKnots);
      return {
        ...berg,
        closestApproach: {
          ...cpa,
          routeId: activeRoute.id,
        },
      };
    });
  }, [evaluatedIcebergs, routes, selectedRouteId, recommendedRoute, selectedVessel]);

  // GPS Tracking Simulation State
  const [gpsTracking, setGpsTracking] = useState<GPSTrackingState>({
    currentLat: DEFAULT_MISSION.startLocation.lat,
    currentLon: DEFAULT_MISSION.startLocation.lon,
    headingDeg: 195,
    speedKnots: INITIAL_VESSELS[0].cruisingSpeedKnots,
    routeProgressPct: 0,
    actualTrack: [[DEFAULT_MISSION.startLocation.lat, DEFAULT_MISSION.startLocation.lon]],
    distanceTraveledNm: 0,
    distanceRemainingNm: 480,
    crossTrackErrorNm: 0.1,
    isSimulating: false,
    simulationSpeedMultiplier: 10,
  });

  const gpsTimerRef = useRef<NodeJS.Timeout | null>(null);

  // GPS Simulation Step
  useEffect(() => {
    if (!gpsTracking.isSimulating) {
      if (gpsTimerRef.current) clearInterval(gpsTimerRef.current);
      return;
    }

    const activeRoute = routes.find((r) => r.isRecommended) || routes[0];
    if (!activeRoute || activeRoute.waypoints.length < 2) return;

    gpsTimerRef.current = setInterval(() => {
      setGpsTracking((prev) => {
        const nextProgress = Math.min(100, prev.routeProgressPct + 0.5 * (prev.simulationSpeedMultiplier / 10));
        const totalDistance = activeRoute.distanceNm;
        const traveled = (nextProgress / 100) * totalDistance;
        const remaining = Math.max(0, totalDistance - traveled);

        // Interpolate position along route waypoints
        const wps = activeRoute.waypoints;
        const segFrac = (nextProgress / 100) * (wps.length - 1);
        const curIdx = Math.min(wps.length - 2, Math.floor(segFrac));
        const subFrac = segFrac - curIdx;

        const p1 = wps[curIdx];
        const p2 = wps[curIdx + 1];
        const newLat = p1[0] + (p2[0] - p1[0]) * subFrac;
        const newLon = p1[1] + (p2[1] - p1[1]) * subFrac;

        // Calculate segment heading
        const dLon = ((p2[1] - p1[1]) * Math.PI) / 180;
        const y = Math.sin(dLon) * Math.cos((p2[0] * Math.PI) / 180);
        const x =
          Math.cos((p1[0] * Math.PI) / 180) * Math.sin((p2[0] * Math.PI) / 180) -
          Math.sin((p1[0] * Math.PI) / 180) * Math.cos((p2[0] * Math.PI) / 180) * Math.cos(dLon);
        const headingDeg = Math.round(((Math.atan2(y, x) * 180) / Math.PI + 360) % 360);

        const newTrack = [...prev.actualTrack, [newLat, newLon] as [number, number]];

        // If vessel gets near destination, stop
        if (nextProgress >= 100) {
          return {
            ...prev,
            currentLat: p2[0],
            currentLon: p2[1],
            routeProgressPct: 100,
            distanceTraveledNm: totalDistance,
            distanceRemainingNm: 0,
            isSimulating: false,
          };
        }

        return {
          ...prev,
          currentLat: Number(newLat.toFixed(4)),
          currentLon: Number(newLon.toFixed(4)),
          headingDeg,
          routeProgressPct: Number(nextProgress.toFixed(1)),
          distanceTraveledNm: Math.round(traveled),
          distanceRemainingNm: Math.round(remaining),
          actualTrack: newTrack.slice(-120), // keep recent 120 points
        };
      });
    }, 1000);

    return () => {
      if (gpsTimerRef.current) clearInterval(gpsTimerRef.current);
    };
  }, [gpsTracking.isSimulating, gpsTracking.simulationSpeedMultiplier, routes]);

  const startGpsSimulation = () => setGpsTracking((p) => ({ ...p, isSimulating: true }));
  const pauseGpsSimulation = () => setGpsTracking((p) => ({ ...p, isSimulating: false }));
  const resetGpsSimulation = () => {
    const activeRoute = routes.find((r) => r.isRecommended) || routes[0];
    const startWp = activeRoute ? activeRoute.waypoints[0] : [DEFAULT_MISSION.startLocation.lat, DEFAULT_MISSION.startLocation.lon];
    setGpsTracking({
      currentLat: startWp[0],
      currentLon: startWp[1],
      headingDeg: 195,
      speedKnots: selectedVessel.cruisingSpeedKnots,
      routeProgressPct: 0,
      actualTrack: [[startWp[0], startWp[1]]],
      distanceTraveledNm: 0,
      distanceRemainingNm: activeRoute?.distanceNm || 480,
      crossTrackErrorNm: 0.1,
      isSimulating: false,
      simulationSpeedMultiplier: 10,
    });
  };

  const toggleMapLayer = (layer: keyof MapLayerToggles) => {
    setMapLayers((prev) => ({ ...prev, [layer]: !prev[layer] }));
  };

  const setConnectionState = (state: ConnectionState) => {
    if (state === 'SYNCING') {
      setConnectionStateInternal('SYNCING');
      setTimeout(() => {
        setConnectionStateInternal('ONLINE');
        addAlert({
          severity: 'INFO',
          type: 'CONFIDENCE_DROP',
          title: 'Antarctic Cache Synchronized',
          message: 'Connected to polar satellite uplink. Environmental observations and forecast models refreshed.',
        });
      }, 1500);
    } else {
      setConnectionStateInternal(state);
      if (state === 'OFFLINE') {
        addAlert({
          severity: 'WARNING',
          type: 'STALE_DATA',
          title: 'OFFLINE — USING LOCAL ENVIRONMENTAL STATE',
          message: 'Satellite downlink suspended. Using onboard cached predictions and deterministic local routing.',
        });
      }
    }
  };

  const updateSimulationScenario = (scenario: Partial<SimulationScenario>) => {
    setSimulationScenario((prev) => ({ ...prev, ...scenario }));
  };

  const resetSimulationScenario = () => {
    setSimulationScenario({
      icebergDriftOffsetPct: 0,
      seaIceSeverity: 'NORMAL',
      windSeverity: 'NORMAL',
      currentSeverity: 'NORMAL',
      freshnessState: 'FRESH',
    });
  };

  const addAlert = (alert: Omit<Alert, 'id' | 'timestamp' | 'acknowledged'>) => {
    const newAlert: Alert = {
      ...alert,
      id: `alt-${Date.now()}`,
      timestamp: new Date().toISOString(),
      acknowledged: false,
    };
    setAlerts((prev) => [newAlert, ...prev]);
  };

  const acknowledgeAlert = (id: string) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a)));
  };

  const dismissAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const setSelectedVessel = (v: VesselProfile) => {
    setSelectedVesselState(v);
  };

  const setMission = (m: MissionConfig) => {
    setMissionState(m);
  };

  const replanRoutes = () => {
    addAlert({
      severity: 'INFO',
      type: 'ROUTE_DEVIATION',
      title: 'Dynamic Route Replanning Triggered',
      message: 'Environmental risk field re-evaluated against latest iceberg trajectories and sea-ice concentration.',
    });
  };

  // DECISION IMPACT ENGINE: Satellite Product Acquisition & Caching Pipeline (Phase 7B)
  const acquireSatelliteProduct = useCallback(
    async (
      productId: string,
      assetId: string = 'PRODUCT',
      assetUrl?: string,
      sourceChecksum?: string,
      expectedSize?: number,
      collection: string = 'SENTINEL-1',
      acquisitionTime?: string
    ): Promise<SatelliteAcquisitionRecord | null> => {
      const nowIso = new Date().toISOString();

      // 1. OFFLINE Enforcement
      if (connectionState === 'OFFLINE') {
        const offlineRecord: SatelliteAcquisitionRecord = {
          productId,
          source: 'Copernicus Data Space Ecosystem',
          collection,
          acquisitionTime: acquisitionTime || nowIso,
          requestTime: nowIso,
          startTime: nowIso,
          status: 'UNAVAILABLE',
          assetId,
          assetUrl: assetUrl || '',
          mediaType: 'application/octet-stream',
          downloadedSize: 0,
          verificationStatus: 'UNVERIFIED',
          error: 'Acquisition unavailable while offline.',
          provenance: {
            source: 'Copernicus Data Space Ecosystem (CDSE)',
            provider: 'European Space Agency (ESA) / CDSE STAC Catalog',
            datasetId: collection,
            granuleId: productId,
            observationTime: acquisitionTime || nowIso,
            ingestionTime: nowIso,
            validTime: acquisitionTime || nowIso,
            forecastHorizonHours: 0,
            freshnessState: 'FRESH',
            category: 'OBSERVED',
            isSynthetic: false,
          },
        };
        setSatelliteAcquisitionRecords((prev) => ({ ...prev, [productId]: offlineRecord }));
        return offlineRecord;
      }

      // 2. DEMO Mode Isolation (Do not fake remote downloads for synthetic metadata)
      if (environmentalMode === 'DEMO') {
        const demoRecord: SatelliteAcquisitionRecord = {
          productId,
          source: 'Simulated Demo Catalogue',
          collection,
          acquisitionTime: acquisitionTime || nowIso,
          requestTime: nowIso,
          startTime: nowIso,
          status: 'UNAVAILABLE',
          assetId,
          assetUrl: assetUrl || '',
          mediaType: 'application/octet-stream',
          downloadedSize: 0,
          verificationStatus: 'UNVERIFIED',
          error: 'Demo satellite products are simulated metadata and cannot be remotely acquired.',
          provenance: {
            source: 'Simulated Demo Catalogue',
            provider: 'CRYO NAV Demo System',
            datasetId: collection,
            granuleId: productId,
            observationTime: acquisitionTime || nowIso,
            ingestionTime: nowIso,
            validTime: acquisitionTime || nowIso,
            forecastHorizonHours: 0,
            freshnessState: 'FRESH',
            category: 'SYNTHETIC',
            isSynthetic: true,
          },
        };
        setSatelliteAcquisitionRecords((prev) => ({ ...prev, [productId]: demoRecord }));
        return demoRecord;
      }

      // 3. REAL Mode Acquisition Pipeline via Server API Proxy
      const requestedRecord: SatelliteAcquisitionRecord = {
        productId,
        source: 'Copernicus Data Space Ecosystem',
        collection,
        acquisitionTime: acquisitionTime || nowIso,
        requestTime: nowIso,
        startTime: nowIso,
        status: 'ACQUISITION_REQUESTED',
        assetId,
        assetUrl: assetUrl || '',
        mediaType: 'application/octet-stream',
        expectedSize,
        downloadedSize: 0,
        verificationStatus: 'UNVERIFIED',
        provenance: {
          source: 'Copernicus Data Space Ecosystem (CDSE)',
          provider: 'European Space Agency (ESA) / CDSE STAC Catalog',
          datasetId: collection,
          granuleId: productId,
          observationTime: acquisitionTime || nowIso,
          ingestionTime: nowIso,
          validTime: acquisitionTime || nowIso,
          forecastHorizonHours: 0,
          freshnessState: 'FRESH',
          category: 'OBSERVED',
          isSynthetic: false,
        },
      };

      setSatelliteAcquisitionRecords((prev) => ({ ...prev, [productId]: requestedRecord }));

      try {
        setSatelliteAcquisitionRecords((prev) => ({
          ...prev,
          [productId]: { ...requestedRecord, status: 'DOWNLOADING' },
        }));

        const response = await fetch('/api/satellite/acquire', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId,
            assetId,
            assetUrl,
            collection,
            acquisitionTime: acquisitionTime || nowIso,
            expectedSize,
            sourceChecksum,
          }),
        });

        const data = await response.json();
        if (data.success && data.record) {
          setSatelliteAcquisitionRecords((prev) => ({ ...prev, [productId]: data.record }));
          return data.record;
        } else {
          const failedRecord: SatelliteAcquisitionRecord = data.record || {
            ...requestedRecord,
            status: 'ACQUISITION_FAILED',
            error: data.error || 'Failed to acquire satellite product.',
            completionTime: new Date().toISOString(),
          };
          setSatelliteAcquisitionRecords((prev) => ({ ...prev, [productId]: failedRecord }));
          return failedRecord;
        }
      } catch (err: any) {
        const failedRecord: SatelliteAcquisitionRecord = {
          ...requestedRecord,
          status: 'ACQUISITION_FAILED',
          error: `Acquisition network request failed: ${err.message || err}`,
          completionTime: new Date().toISOString(),
        };
        setSatelliteAcquisitionRecords((prev) => ({ ...prev, [productId]: failedRecord }));
        return failedRecord;
      }
    },
    [connectionState, environmentalMode]
  );




  const syncLiveTelemetry = async () => {
    try {
      const response = await fetch('/api/telemetry/live?lat=-67.57&lon=-68.13');
      if (!response.ok) throw new Error('Live telemetry server endpoint unavailable');
      const data = await response.json();
      if (data.status === 'success' && data.weather) {
        setWeather(data.weather);
        setIsLiveTelemetry(true);
        setLastLiveSyncTime(new Date().toISOString());
        addAlert({
          severity: 'INFO',
          type: 'WEATHER_DETERIORATION',
          title: 'Live Polar Telemetry Ingested',
          message: `Live Open-Meteo & ECMWF sensor feed synchronized for Marguerite Bay: Wind ${data.weather.windSpeedKnots}kt @ ${data.weather.windDirectionDeg}°, Temp ${data.weather.airTempC}°C, Waves ${data.weather.waveHeightMeters}m.`,
        });
      }
    } catch (err) {
      console.warn('Could not sync live telemetry, operating with onboard cached state:', err);
    }
  };

  useEffect(() => {
    // Attempt initial live telemetry sync
    syncLiveTelemetry();
  }, []);

  const resetDemoToInitial = () => {
    setSelectedVesselState(INITIAL_VESSELS[0]);
    setMissionState(DEFAULT_MISSION);
    setIcebergs(INITIAL_ICEBERGS);
    setRawSeaIceCells(generateSyntheticSeaIce());
    setWeather(SYNTHETIC_WEATHER);
    setSatelliteProducts(INITIAL_SATELLITE_PRODUCTS);
    setForecastHorizonHours(0);
    setSelectedRouteId('balanced');
    setDecisionChangeStatus(null);
    setActiveCounterfactualResult(null);
    setBatchSensitivitySummary(null);
    resetSimulationScenario();
    resetGpsSimulation();
    setMapLayers({
      seaIce: true,
      icebergs: false,
      trajectories: false,
      uncertainty: false,
      risk: true,
      weather: true,
      ocean: true,
      routes: true,
      sarCandidates: false,
    });
    setConnectionStateInternal('ONLINE');
    setIsLiveTelemetry(false);
    setLastLiveSyncTime(null);
    setEnvironmentalModeState('DEMO');
    setRealSeaIceCells([]);
    setRealSeaIceProvenance(null);
    setRealSeaIceError(null);
    setRealOceanCurrentCells([]);
    setRealOceanCurrentProvenance(null);
    setRealOceanCurrentError(null);
    setRealIcebergs([]);
    setRealIcebergProvenance(null);
    setRealIcebergError(null);
    setRealWeather(null);
    setRealWeatherGrid([]);
    setRealWeatherProvenance(null);
    setRealWeatherError(null);
  };

  // Phase 5 Counterfactual Engine Runners
  const runSingleCounterfactual = useCallback(
    (scenario: CounterfactualScenario): CounterfactualRouteResult => {
      const res = runCounterfactualScenario(
        scenario,
        mission,
        selectedVessel,
        seaIceCells,
        currents,
        evaluatedWeather,
        displayIcebergs,
        routes,
        decisionConfidence,
        unifiedEnvironment,
        environmentalMode
      );
      setActiveCounterfactualResult(res);
      return res;
    },
    [
      mission,
      selectedVessel,
      seaIceCells,
      currents,
      evaluatedWeather,
      displayIcebergs,
      routes,
      decisionConfidence,
      unifiedEnvironment,
      environmentalMode,
    ]
  );

  const runBatchSensitivity = useCallback((): BatchSensitivitySummary => {
    const summary = runBatchSensitivityAnalysis(
      mission,
      selectedVessel,
      seaIceCells,
      currents,
      evaluatedWeather,
      displayIcebergs,
      routes,
      decisionConfidence,
      unifiedEnvironment,
      environmentalMode,
      DEFAULT_COUNTERFACTUAL_SCENARIOS
    );
    setBatchSensitivitySummary(summary);
    return summary;
  }, [
    mission,
    selectedVessel,
    seaIceCells,
    currents,
    evaluatedWeather,
    displayIcebergs,
    routes,
    decisionConfidence,
    unifiedEnvironment,
    environmentalMode,
  ]);

  const clearCounterfactual = useCallback(() => {
    setActiveCounterfactualResult(null);
    setBatchSensitivitySummary(null);
  }, []);

  // Phase 18C — Authoritative aggregated end-to-end Navigation Operational State
  const navigationOperationalState = React.useMemo(() => {
    const activeRoute = recommendedRoute || (routes && routes.length > 0 ? routes[0] : null);
    const dataMode = environmentalMode === 'REAL' ? 'REAL' : 'SIMULATED';

    const voyageState = buildVoyageState({
      selectedVessel,
      mission,
      activeRoute,
      gpsTracking,
      connectivityState: connectionState,
      unifiedEnvironment,
      decisionConfidence,
      environmentalMode: environmentalMode === 'REAL' ? 'REAL' : 'DEMO',
    });

    const hazardEvaluation = activeRoute
      ? evaluateAllRouteHazards(activeRoute, displayIcebergs || [], seaIceCells || [], selectedVessel)
      : null;

    const targetBerg = displayIcebergs && displayIcebergs.length > 0 ? displayIcebergs[0] : null;
    const uncertainty = targetBerg
      ? evaluateUncertainty({
          hazardId: targetBerg.id,
          hazardName: targetBerg.name,
          hazardType: 'ICEBERG',
          location: { lat: targetBerg.lat, lon: targetBerg.lon },
          baseRadiusNm: targetBerg.uncertaintyRadiusNm || 0.8,
          confidenceLevel: decisionConfidence?.overallLevel || 'HIGH',
          freshnessState: 'FRESH',
          connectionState,
          forecastHorizonHours: forecastHorizonHours || 0,
          dataMode,
        })
      : null;

    const resilience = activeRoute
      ? analyzeRouteResilience({
          route: activeRoute,
          vessel: selectedVessel,
          seaIceCells: seaIceCells || [],
          icebergs: displayIcebergs || [],
          weather: evaluatedWeather,
          dataMode,
        })
      : null;

    const acquisitionPriorities = activeRoute
      ? evaluateAcquisitionPriorities({
          activeRoutes: routes || [activeRoute],
          selectedRouteId: activeRoute.id,
          candidateProducts: evaluatedSatelliteProducts || [],
          icebergs: displayIcebergs || [],
          seaIceCells: seaIceCells || [],
          connectionState,
          decisionConfidence,
        })
      : null;

    const currentState = activeRoute
      ? {
          selectedRouteId: activeRoute.id,
          selectedRouteName: activeRoute.name,
          confidenceLevel: decisionConfidence?.overallLevel || 'HIGH',
          freshnessState: 'FRESH',
          connectionState,
          routeSensitivity: resilience?.sensitivityClassification || 'ROBUST',
          uncertaintyRadiusNm: uncertainty?.expandedUncertaintyRadiusNm || 1.0,
          primaryHazardSeverity: hazardEvaluation?.highestSeverity || 'NONE',
          hazards: hazardEvaluation?.encounters || [],
          dataMode,
        }
      : null;

    const reassessment = currentState && activeRoute
      ? evaluateDecisionReassessment({
          previousState: currentState,
          currentState,
          activeRoute,
        })
      : null;

    const alerts = activeRoute && selectedVessel
      ? evaluateNavigationAlerts({
          vessel: selectedVessel,
          activeRoute,
          hazards: hazardEvaluation?.encounters || [],
          seaIceExposure: hazardEvaluation?.seaIceRouteSummary || null,
          confidenceLevel: decisionConfidence?.overallLevel || 'HIGH',
          uncertaintyRadiusNm: uncertainty?.expandedUncertaintyRadiusNm || 1.0,
          freshnessState: 'FRESH',
          connectionState,
          gpsState: {
            lat: gpsTracking.currentLat,
            lon: gpsTracking.currentLon,
            headingDeg: gpsTracking.headingDeg,
            speedKnots: gpsTracking.speedKnots,
            isAvailable: true,
          },
          dataMode,
        })
      : null;

    const validationSummary = evaluateModelValidationBatch([], [], 'ICEBERG_TRAJECTORY');

    const decisionState = buildNavigationDecisionState({
      voyageState,
      activeRoute,
      hazards: hazardEvaluation?.encounters || displayIcebergs,
      seaIceExposure: hazardEvaluation?.seaIceRouteSummary || null,
      uncertainty,
      confidence: decisionConfidence,
      acquisitionPriorities,
      reassessment,
      resilience,
      alerts,
      validationSummary,
      connectionState,
      freshnessState: 'FRESH',
      dataMode,
    });

    return buildNavigationOperationalState({
      mission,
      vessel: selectedVessel,
      voyageState,
      activeRoute,
      routes,
      hazards: hazardEvaluation?.encounters || displayIcebergs,
      seaIceExposure: hazardEvaluation?.seaIceRouteSummary || null,
      uncertainty,
      confidence: decisionConfidence,
      acquisitionPriorities,
      reassessment,
      resilience,
      alerts,
      validationSummary,
      decisionState,
      connectionState,
      freshnessState: 'FRESH',
      forecastHorizonHours,
      dataMode,
      provenance: `CRYO NAV Operational State Orchestration (${dataMode})`,
    });
  }, [
    mission,
    selectedVessel,
    recommendedRoute,
    routes,
    displayIcebergs,
    seaIceCells,
    evaluatedWeather,
    gpsTracking,
    connectionState,
    forecastHorizonHours,
    decisionConfidence,
    environmentalMode,
    evaluatedSatelliteProducts,
  ]);

  return (
    <AppContext.Provider
      value={{
        activeView,
        setActiveView,
        vessels,
        selectedVessel,
        setSelectedVessel,
        mission,
        setMission,
        icebergs: displayIcebergs,
        seaIceCells,
        weather: evaluatedWeather,
        currents,
        satelliteProducts,
        routes,
        recommendedRoute,
        selectedRouteId,
        setSelectedRouteId,
        forecastHorizonHours,
        setForecastHorizonHours,
        mapLayers,
        toggleMapLayer,
        connectionState,
        setConnectionState,
        simulationScenario,
        updateSimulationScenario,
        resetSimulationScenario,
        gpsTracking,
        startGpsSimulation,
        pauseGpsSimulation,
        resetGpsSimulation,
        alerts,
        acknowledgeAlert,
        dismissAlert,
        addAlert,
        decisionChangeStatus,
        acquireSatelliteProduct,
        selectedIcebergId,
        setSelectedIcebergId,
        replanRoutes,
        resetDemoToInitial,
        researchReferences,
        sihMetadata: SIH_PROJECT_METADATA,
        isLiveTelemetry,
        lastLiveSyncTime,
        syncLiveTelemetry,
        environmentalMode,
        setEnvironmentalMode,
        realSeaIceCells,
        realSeaIceProvenance,
        realSeaIceError,
        isFetchingRealSeaIce,
        fetchRealSeaIceData,
        realOceanCurrentCells,
        realOceanCurrentProvenance,
        realOceanCurrentError,
        isFetchingRealOceanCurrents,
        fetchRealOceanCurrentsData,
        realIcebergs,
        realIcebergProvenance,
        realIcebergError,
        isFetchingRealIcebergs,
        fetchRealIcebergData,
        realWeather,
        realWeatherGrid,
        realWeatherProvenance,
        realWeatherError,
        isFetchingRealWeather,
        fetchRealWeatherData,
        unifiedEnvironment,
        decisionConfidence,
        counterfactualScenarios: DEFAULT_COUNTERFACTUAL_SCENARIOS,
        activeCounterfactualResult,
        batchSensitivitySummary,
        runSingleCounterfactual,
        runBatchSensitivity,
        clearCounterfactual,
        dataAcquisitionRecommendations,
        fiveMinuteBudgetSummary,
        selectedAcquisitionFootprintId,
        setSelectedAcquisitionFootprintId,
        cdseCatalogueItems,
        cdseQueryStatus,
        cdseLastQueryResult,
        cdseQueryInfo,
        isFetchingCdseCatalogue,
        fetchCdseCatalogue,
        satelliteAcquisitionRecords,
        loadCachedAcquisitions,
        navigationOperationalState,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};


export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};

