import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { AntarcticMap } from '../components/Map/AntarcticMap';
import { TimelineSlider } from '../components/TimelineSlider';
import {
  Navigation,
  Play,
  Pause,
  RotateCcw,
  AlertTriangle,
  RefreshCw,
  Wind,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  X,
  Activity,
} from 'lucide-react';

import { VoyageStatePanel } from '../components/navigation/VoyageStatePanel';
import { buildVoyageState } from '../services/voyageStateEngine';
import { HazardEncounterPanel } from '../components/navigation/HazardEncounterPanel';
import { evaluateAllRouteHazards } from '../services/hazardEncounterEngine';
import { OfflineStatusPanel, OfflineStatusPanelProps } from '../components/navigation/OfflineStatusPanel';
import { connectivityStateEngine } from '../services/connectivityStateEngine';
import { offlineStorageEngine, OfflineNavigationSnapshot } from '../services/offlineStorageEngine';
import { ConnectionState, FreshnessState, ConfidenceLevel } from '../types';
import {
  evaluateUncertainty,
  evaluateBatchUncertainty,
  UncertaintyEvaluationResult,
  UncertaintyInput,
} from '../services/uncertaintyEngine';
import { UncertaintyZonePanel, UncertaintyData } from '../components/navigation/UncertaintyZonePanel';
import { UncertaintyLegend } from '../components/navigation/UncertaintyLegend';
import {
  evaluateAcquisitionPriorities,
  AcquisitionRankingResult,
} from '../services/decisionImpactAcquisitionEngine';
import { DecisionImpactAcquisitionPanel } from '../components/navigation/DecisionImpactAcquisitionPanel';
import {
  evaluateDecisionReassessment,
  DecisionStateSnapshot,
  DecisionReassessmentResult,
  ReassessmentDataMode,
} from '../services/decisionReassessmentEngine';
import { DecisionReassessmentPanel } from '../components/navigation/DecisionReassessmentPanel';
import {
  analyzeRouteResilience,
  RouteResilienceEvaluationResult,
  DataMode,
} from '../services/routeResilienceEngine';
import { RouteResiliencePanel } from '../components/navigation/RouteResiliencePanel';
import {
  evaluateNavigationAlerts,
  NavigationAlertEvaluationResult,
  GPSInputState,
  NavigationDataMode,
} from '../services/navigationAlertEngine';
import { NavigationAlertPanel } from '../components/navigation/NavigationAlertPanel';
import {
  evaluateModelValidationBatch,
  PredictionRecord,
  ObservationRecord,
  ValidationDataMode as ModelValidationDataMode,
} from '../services/modelValidationEngine';
import { ModelValidationPanel } from '../components/navigation/ModelValidationPanel';
import {
  buildNavigationDecisionState,
  NavigationDecisionState,
} from '../services/navigationDecisionStateEngine';
import { NavigationDecisionStatePanel } from '../components/navigation/NavigationDecisionStatePanel';

export const NavigationView: React.FC = () => {
  const {
    selectedVessel,
    mission,
    gpsTracking,
    startGpsSimulation,
    pauseGpsSimulation,
    resetGpsSimulation,
    icebergs,
    seaIceCells,
    recommendedRoute,
    routes,
    selectedRouteId,
    replanRoutes,
    weather,
    decisionConfidence,
    unifiedEnvironment,
    forecastHorizonHours,
    setActiveView,
    dataAcquisitionRecommendations,
    satelliteProducts,
    batchSensitivitySummary,
    navigationOperationalState,
  } = useApp();

  const [showFactorsModal, setShowFactorsModal] = useState(false);
  const [selectedHazardId, setSelectedHazardId] = useState<string | null>(null);
  const [showAnalysisDrawer, setShowAnalysisDrawer] = useState(false);
  const [showTelemetryDrawer, setShowTelemetryDrawer] = useState(false);
  const [activeAnalysisTab, setActiveAnalysisTab] = useState<
    'decision' | 'hazards' | 'uncertainty' | 'resilience' | 'acquisition' | 'reassessment' | 'alerts' | 'validation' | 'offline'
  >('decision');

  const [connectionState, setConnectionState] = useState<ConnectionState>(() =>
    connectivityStateEngine.getCurrentConnectionState()
  );
  const [offlineSnapshot, setOfflineSnapshot] = useState<OfflineNavigationSnapshot | null>(null);

  // Subscribe to browser connectivity state transitions
  useEffect(() => {
    connectivityStateEngine.start();
    const unsubscribe = connectivityStateEngine.subscribe((state) => {
      setConnectionState(state);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const activeRoute = recommendedRoute || (routes && routes.length > 0 ? routes[0] : null);

  const hazardEvaluation = useMemo(() => {
    if (!activeRoute) return null;
    return evaluateAllRouteHazards(activeRoute, icebergs || [], seaIceCells || [], selectedVessel, {
      cruisingSpeedKnots: selectedVessel?.cruisingSpeedKnots || 12.0,
    });
  }, [activeRoute, icebergs, seaIceCells, selectedVessel]);

  // Derive Phase 10A / Phase 10C Uncertainty Evaluations
  const uncertaintyEvaluations = useMemo<UncertaintyEvaluationResult[]>(() => {
    const freshnessState: FreshnessState =
      connectionState === 'OFFLINE' && offlineSnapshot?.syncTimestamp
        ? 'STALE'
        : unifiedEnvironment?.alignmentStatus === 'DEGRADED' || unifiedEnvironment?.alignmentStatus === 'UNAVAILABLE'
        ? 'STALE'
        : unifiedEnvironment?.alignmentStatus === 'PARTIALLY ALIGNED'
        ? 'AGING'
        : 'FRESH';

    const confidenceLevel = decisionConfidence?.overallLevel || 'HIGH';
    const inputs: UncertaintyInput[] = [];

    // Target iceberg hazard
    const targetBerg =
      (selectedHazardId && icebergs?.find((b) => b.id === selectedHazardId)) ||
      (icebergs && icebergs.length > 0 ? icebergs[0] : null);

    if (targetBerg) {
      inputs.push({
        hazardId: targetBerg.id,
        hazardName: targetBerg.name,
        hazardType: 'ICEBERG',
        location: { lat: targetBerg.lat, lon: targetBerg.lon },
        confidenceLevel,
        freshnessState,
        connectionState,
        forecastHorizonHours: forecastHorizonHours || 0,
        baseRadiusNm: targetBerg.uncertaintyRadiusNm || 0.8,
        dataMode: targetBerg.isSynthetic ? 'SIMULATED' : 'REAL',
        provenance: targetBerg.isSynthetic ? 'Synthetic Baseline Model' : 'USNIC Iceberg Observation',
      });
    }

    // Sea Ice hazard
    if (seaIceCells && seaIceCells.length > 0) {
      const highIceCell = seaIceCells.find((c) => c.concentrationPercent > 60) || seaIceCells[0];
      inputs.push({
        hazardId: `seaice-${highIceCell.id}`,
        hazardName: `Pack Ice (${highIceCell.concentrationPercent}% conc)`,
        hazardType: 'SEA_ICE',
        location: { lat: highIceCell.lat, lon: highIceCell.lon },
        confidenceLevel,
        freshnessState,
        connectionState,
        forecastHorizonHours: forecastHorizonHours || 0,
        baseRadiusNm: 3.0,
        dataMode: highIceCell.isRealData ? 'REAL' : 'SIMULATED',
        provenance: highIceCell.isRealData ? 'Copernicus Sea-Ice NRT' : 'Synthetic Sea-Ice Model',
      });
    }

    // Weather hazard
    if (weather) {
      inputs.push({
        hazardId: 'weather-01',
        hazardName: `Polar Weather Front (${weather.windSpeedKnots} kts wind)`,
        hazardType: 'WEATHER',
        location: { lat: gpsTracking.currentLat, lon: gpsTracking.currentLon },
        confidenceLevel,
        freshnessState,
        connectionState,
        forecastHorizonHours: forecastHorizonHours || 0,
        baseRadiusNm: 10.0,
        dataMode: weather.isRealData ? 'REAL' : 'SIMULATED',
        provenance: weather.isRealData ? 'ECMWF IFS Weather Forecast' : 'Synthetic Weather Model',
      });
    }

    if (inputs.length === 0) return [];
    return evaluateBatchUncertainty(inputs);
  }, [
    connectionState,
    decisionConfidence,
    forecastHorizonHours,
    gpsTracking,
    icebergs,
    offlineSnapshot,
    seaIceCells,
    selectedHazardId,
    unifiedEnvironment,
    weather,
  ]);

  const activeUncertaintyPanelData = useMemo<UncertaintyData | null>(() => {
    if (uncertaintyEvaluations.length === 0) return null;
    const match =
      (selectedHazardId && uncertaintyEvaluations.find((e) => e.hazardId === selectedHazardId)) ||
      uncertaintyEvaluations[0];

    return {
      id: match.hazardId,
      hazardType: match.hazardType === 'SEA_ICE' ? 'SEA ICE' : match.hazardType,
      confidence: match.confidenceLevel,
      freshness: match.freshnessState,
      connectivity: match.connectionState,
      forecastHorizon: match.forecastHorizonLabel,
      uncertaintyRadiusNm: match.expandedUncertaintyRadiusNm,
      uncertaintyEnvelopeLabel: `±${match.expandedUncertaintyRadiusNm.toFixed(1)} nm (${match.expansionFactor}x expansion)`,
      reason: match.explanation,
      cautionLevel:
        match.recommendedCautionLevel === 'RE_EVALUATION_REQUIRED'
          ? 'EXTREME'
          : match.recommendedCautionLevel === 'EXCLUSIVE_MONITORING'
          ? 'HIGH'
          : match.recommendedCautionLevel === 'HIGH_CAUTION'
          ? 'HIGH'
          : match.recommendedCautionLevel === 'ELEVATED'
          ? 'ELEVATED'
          : 'STANDARD',
      provenance: match.dataMode,
      lastUpdateTimestamp: match.timestamp,
    };
  }, [uncertaintyEvaluations, selectedHazardId]);

  // Derive Phase 11A / 11C Decision-Impact Acquisition Priorities
  const acquisitionRankingResult = useMemo<AcquisitionRankingResult | null>(() => {
    const candidates = satelliteProducts && satelliteProducts.length > 0 ? satelliteProducts : [];
    if (candidates.length === 0) return null;

    return evaluateAcquisitionPriorities({
      activeRoutes: routes || [],
      selectedRouteId,
      candidateProducts: candidates,
      uncertaintyZones: uncertaintyEvaluations || [],
      icebergs: icebergs || [],
      seaIceCells: seaIceCells || [],
      decisionConfidence,
      batchSensitivity: batchSensitivitySummary,
      connectionState,
      availableBandwidthMb: connectionState === 'LIMITED' ? 50 : 150,
    });
  }, [
    routes,
    selectedRouteId,
    satelliteProducts,
    uncertaintyEvaluations,
    icebergs,
    seaIceCells,
    decisionConfidence,
    batchSensitivitySummary,
    connectionState,
  ]);

  // Derive Phase 12A / 12C Decision State Snapshot & Reassessment
  const currentSnapshot = useMemo<DecisionStateSnapshot>(() => {
    const targetBerg =
      (selectedHazardId && icebergs?.find((b) => b.id === selectedHazardId)) ||
      (icebergs && icebergs.length > 0 ? icebergs[0] : null);

    const primaryEncounter =
      hazardEvaluation?.encounters?.find(
        (e) => e.icebergId === targetBerg?.id || e.hazardId === targetBerg?.id
      ) || (hazardEvaluation?.encounters && hazardEvaluation.encounters.length > 0 ? hazardEvaluation.encounters[0] : null);

    const targetUncertainty =
      activeUncertaintyPanelData?.uncertaintyRadiusNm ??
      targetBerg?.uncertaintyRadiusNm ??
      0.8;

    const freshnessState: FreshnessState =
      connectionState === 'OFFLINE' && offlineSnapshot?.syncTimestamp
        ? 'STALE'
        : unifiedEnvironment?.alignmentStatus === 'DEGRADED' || unifiedEnvironment?.alignmentStatus === 'UNAVAILABLE'
        ? 'STALE'
        : unifiedEnvironment?.alignmentStatus === 'PARTIALLY ALIGNED'
        ? 'AGING'
        : 'FRESH';

    const confidenceLevel = decisionConfidence?.overallLevel || 'HIGH';
    const routeSensitivity = batchSensitivitySummary?.overallStability || 'ROBUST';
    const dataMode: ReassessmentDataMode =
      targetBerg && !targetBerg.isSynthetic ? 'REAL' : 'SIMULATED';

    return {
      timestamp: new Date().toISOString(),
      selectedRouteId: activeRoute?.id || selectedRouteId || 'safest',
      selectedRouteName: activeRoute?.name || 'Active Route Corridor',
      confidenceLevel,
      freshnessState,
      connectionState,
      routeSensitivity,
      uncertaintyRadiusNm: targetUncertainty,
      primaryHazardId: targetBerg?.id || primaryEncounter?.hazardId || primaryEncounter?.icebergId || 'primary-hazard',
      primaryHazardSeverity: primaryEncounter?.severity || 'LOW',
      primaryHazardCpaNm: primaryEncounter?.cpaNm ?? targetBerg?.closestApproach?.distanceNm ?? 15.0,
      primaryHazardTcaHours: primaryEncounter?.tcaHours ?? targetBerg?.closestApproach?.timeHours ?? 12.0,
      hazards: hazardEvaluation?.encounters || [],
      uncertaintyZones: uncertaintyEvaluations || [],
      hasNewObservation: false,
      isObservationNearRoute: false,
      dataMode,
      provenance: targetBerg?.provenance?.source || (dataMode === 'REAL' ? 'USNIC / Copernicus Real Data' : 'Synthetic Antarctic Model'),
    };
  }, [
    activeRoute,
    selectedRouteId,
    selectedHazardId,
    icebergs,
    hazardEvaluation,
    activeUncertaintyPanelData,
    connectionState,
    offlineSnapshot,
    unifiedEnvironment,
    decisionConfidence,
    batchSensitivitySummary,
    uncertaintyEvaluations,
  ]);

  const prevSnapshotRef = useRef<DecisionStateSnapshot | null>(null);

  const reassessmentResult = useMemo<DecisionReassessmentResult | null>(() => {
    if (!currentSnapshot) return null;

    if (!prevSnapshotRef.current) {
      prevSnapshotRef.current = currentSnapshot;
    }

    const prev = prevSnapshotRef.current;
    const curr = currentSnapshot;

    const hasKeyChanged =
      prev.confidenceLevel !== curr.confidenceLevel ||
      prev.freshnessState !== curr.freshnessState ||
      prev.connectionState !== curr.connectionState ||
      prev.routeSensitivity !== curr.routeSensitivity ||
      prev.uncertaintyRadiusNm !== curr.uncertaintyRadiusNm ||
      prev.primaryHazardSeverity !== curr.primaryHazardSeverity ||
      prev.primaryHazardCpaNm !== curr.primaryHazardCpaNm ||
      prev.primaryHazardId !== curr.primaryHazardId ||
      prev.hasNewObservation !== curr.hasNewObservation;

    const evalResult = evaluateDecisionReassessment({
      previousState: prev,
      currentState: curr,
      activeRoute,
    });

    if (hasKeyChanged) {
      prevSnapshotRef.current = curr;
    }

    return evalResult;
  }, [currentSnapshot, activeRoute]);

  // Phase 13B — Route Resilience & Counterfactual Evaluation
  const resilienceResult = useMemo<RouteResilienceEvaluationResult | null>(() => {
    if (!activeRoute) return null;

    const confLevel = (currentSnapshot?.confidenceLevel as ConfidenceLevel) || 'HIGH';
    const mode = (currentSnapshot?.dataMode as DataMode) || 'SIMULATED';

    return analyzeRouteResilience({
      route: activeRoute,
      vessel: selectedVessel || undefined,
      seaIceCells: seaIceCells || [],
      icebergs: icebergs || [],
      baselineRiskIndex: activeRoute.riskIndex,
      baselineUncertaintyScore: activeRoute.uncertaintyScore,
      confidenceLevel: confLevel,
      dataMode: mode,
      provenance: activeRoute.assumptions?.[0] || (mode === 'REAL' ? 'Copernicus / USNIC Real Data' : 'Synthetic Antarctic Model'),
    });
  }, [activeRoute, selectedVessel, seaIceCells, icebergs, currentSnapshot]);

  // Phase 14B — GPS Tracking & Navigation Alert Evaluation
  const navigationAlertResult = useMemo<NavigationAlertEvaluationResult | null>(() => {
    const isGpsActive = gpsTracking.isSimulating || (gpsTracking.currentLat !== 0 && gpsTracking.currentLon !== 0);
    const gpsState: GPSInputState = {
      lat: isGpsActive ? gpsTracking.currentLat : null,
      lon: isGpsActive ? gpsTracking.currentLon : null,
      headingDeg: gpsTracking.headingDeg,
      speedKnots: gpsTracking.speedKnots,
      timestamp: new Date().toISOString(),
      isAvailable: isGpsActive,
    };

    const targetBerg =
      (selectedHazardId && icebergs?.find((b) => b.id === selectedHazardId)) ||
      (icebergs && icebergs.length > 0 ? icebergs[0] : null);

    const freshnessState: FreshnessState =
      connectionState === 'OFFLINE' && offlineSnapshot?.syncTimestamp
        ? 'STALE'
        : unifiedEnvironment?.alignmentStatus === 'DEGRADED' || unifiedEnvironment?.alignmentStatus === 'UNAVAILABLE'
        ? 'STALE'
        : unifiedEnvironment?.alignmentStatus === 'PARTIALLY ALIGNED'
        ? 'AGING'
        : 'FRESH';

    const confLevel: ConfidenceLevel = (decisionConfidence?.overallLevel as ConfidenceLevel) || 'HIGH';
    const mode: NavigationDataMode = targetBerg && !targetBerg.isSynthetic ? 'REAL' : 'SIMULATED';

    return evaluateNavigationAlerts({
      gpsState,
      activeRoute,
      vessel: selectedVessel || null,
      hazards: hazardEvaluation?.encounters || icebergs || null,
      seaIceExposure: hazardEvaluation?.seaIceRouteSummary || null,
      confidenceLevel: confLevel,
      uncertaintyRadiusNm: activeUncertaintyPanelData?.uncertaintyRadiusNm || targetBerg?.uncertaintyRadiusNm || 0.8,
      freshnessState,
      connectionState,
      dataMode: mode,
      provenance: targetBerg?.provenance?.source || (mode === 'REAL' ? 'USNIC / Copernicus Real Data' : 'Synthetic Antarctic Model'),
    });
  }, [
    gpsTracking,
    activeRoute,
    selectedVessel,
    hazardEvaluation,
    icebergs,
    activeUncertaintyPanelData,
    connectionState,
    offlineSnapshot,
    unifiedEnvironment,
    decisionConfidence,
    selectedHazardId,
  ]);

  // Phase 15B — Continuous Model Validation Summaries
  const { icebergValidationSummary, seaIceValidationSummary } = useMemo(() => {
    const targetValidTime = new Date().toISOString();

    const icebergPredictions: PredictionRecord[] = (icebergs || []).map((berg) => {
      const isSynth = berg.isSynthetic;
      const mode: ModelValidationDataMode = isSynth ? 'SIMULATED' : 'REAL';
      return {
        id: `pred-${berg.id}`,
        modelType: 'ICEBERG_TRAJECTORY',
        predictionTimestamp: berg.processingTime || berg.observationTime || targetValidTime,
        validTime: targetValidTime,
        predictedPosition: berg.predictedTrajectory && berg.predictedTrajectory.length > 0
          ? { lat: berg.predictedTrajectory[0].lat, lon: berg.predictedTrajectory[0].lon }
          : { lat: berg.lat, lon: berg.lon },
        uncertaintyRadiusNm: berg.uncertaintyRadiusNm || 0.8,
        provenance: berg.provenance?.source || berg.source || 'Iceberg Drift Engine v3.5',
        dataMode: mode,
      };
    });

    const icebergObservations: ObservationRecord[] = (icebergs || []).map((berg) => {
      const isSynth = berg.isSynthetic;
      const mode: ModelValidationDataMode = isSynth ? 'SIMULATED' : 'REAL';
      return {
        id: `pred-${berg.id}`,
        modelType: 'ICEBERG_TRAJECTORY',
        observationTimestamp: berg.observationTime || targetValidTime,
        observedPosition: { lat: berg.lat, lon: berg.lon },
        source: berg.source || 'USNIC Catalog / Marine Radar',
        provenance: berg.provenance?.source || 'Observed Position',
        dataMode: mode,
      };
    });

    const seaIcePredictions: PredictionRecord[] = (seaIceCells || []).slice(0, 10).map((cell) => {
      const isReal = cell.isRealData;
      const mode: ModelValidationDataMode = isReal ? 'REAL' : 'SIMULATED';
      return {
        id: `pred-ice-${cell.id}`,
        modelType: 'SEA_ICE',
        predictionTimestamp: cell.timestamp || targetValidTime,
        validTime: targetValidTime,
        predictedValue: cell.predictedConcentration72h ?? cell.concentrationPercent,
        uncertaintyMargin: cell.uncertainty || 5.0,
        provenance: cell.provenance?.source || 'Sea-Ice Model v2.0',
        dataMode: mode,
      };
    });

    const seaIceObservations: ObservationRecord[] = (seaIceCells || []).slice(0, 10).map((cell) => {
      const isReal = cell.isRealData;
      const mode: ModelValidationDataMode = isReal ? 'REAL' : 'SIMULATED';
      return {
        id: `pred-ice-${cell.id}`,
        modelType: 'SEA_ICE',
        observationTimestamp: cell.timestamp || targetValidTime,
        observedValue: cell.concentrationPercent,
        source: cell.provenance?.source || 'Copernicus OSI SAF',
        provenance: cell.provenance?.source || 'Satellite Sea-Ice Observation',
        dataMode: mode,
      };
    });

    const bergSummary = icebergPredictions.length > 0
      ? evaluateModelValidationBatch(icebergPredictions, icebergObservations, 'ICEBERG_TRAJECTORY')
      : null;

    const iceSummary = seaIcePredictions.length > 0
      ? evaluateModelValidationBatch(seaIcePredictions, seaIceObservations, 'SEA_ICE')
      : null;

    return {
      icebergValidationSummary: bergSummary,
      seaIceValidationSummary: iceSummary,
    };
  }, [icebergs, seaIceCells]);

  // Phase 17B — System-Level Navigation Decision State Engine Integration
  const voyageStateForDecisionEngine = useMemo(() => {
    return buildVoyageState({
      selectedVessel,
      mission,
      activeRoute,
      gpsTracking,
      connectivityState: connectionState,
      unifiedEnvironment,
      decisionConfidence,
      environmentalMode: 'DEMO',
    });
  }, [
    selectedVessel,
    mission,
    activeRoute,
    gpsTracking,
    connectionState,
    unifiedEnvironment,
    decisionConfidence,
  ]);

  const navigationDecisionState = useMemo<NavigationDecisionState>(() => {
    return buildNavigationDecisionState({
      voyageState: voyageStateForDecisionEngine,
      activeRoute,
      hazards: hazardEvaluation?.encounters,
      seaIceExposure: hazardEvaluation?.seaIceRouteSummary,
      uncertainty: uncertaintyEvaluations?.[0] || null,
      confidence: decisionConfidence,
      acquisitionPriorities: acquisitionRankingResult,
      reassessment: reassessmentResult,
      resilience: resilienceResult,
      alerts: navigationAlertResult,
      validationSummary: icebergValidationSummary || seaIceValidationSummary,
      connectionState,
    });
  }, [
    voyageStateForDecisionEngine,
    activeRoute,
    hazardEvaluation,
    uncertaintyEvaluations,
    decisionConfidence,
    acquisitionRankingResult,
    reassessmentResult,
    resilienceResult,
    navigationAlertResult,
    icebergValidationSummary,
    seaIceValidationSummary,
    connectionState,
  ]);

  // Persist environmental state to local storage when online / update snapshot

  useEffect(() => {
    let isMounted = true;
    const syncLocalStorage = async () => {
      if (connectionState === 'ONLINE' || connectionState === 'LIMITED') {
        if (seaIceCells || icebergs || weather) {
          await offlineStorageEngine.saveEnvironmentalState({
            seaIceCells: seaIceCells || [],
            oceanCurrentCells: [],
            weather: weather || null,
            icebergs: icebergs || [],
          });
        }
        if (activeRoute) {
          await offlineStorageEngine.saveRoute(activeRoute);
        }
        if (hazardEvaluation) {
          await offlineStorageEngine.saveHazards(hazardEvaluation);
        }
      }
      const snapRes = await offlineStorageEngine.getOfflineSnapshot();
      if (isMounted && snapRes.status === 'STORAGE_AVAILABLE' && snapRes.data) {
        setOfflineSnapshot(snapRes.data);
      }
    };
    syncLocalStorage();
    return () => {
      isMounted = false;
    };
  }, [connectionState, seaIceCells, icebergs, weather, activeRoute, hazardEvaluation, unifiedEnvironment]);

  // Derive panel props for Phase 9B OfflineStatusPanel
  const offlinePanelProps: OfflineStatusPanelProps = useMemo(() => {
    if (!offlineSnapshot || !offlineSnapshot.isOfflineAvailable || offlineSnapshot.storageStatus === 'STORAGE_EMPTY') {
      return {
        connectionState,
        localDataAvailability: 'EMPTY' as const,
        lastSyncTimestamp: null,
        dataFreshnessSummary: 'NO LOCAL DATA CACHED',
        dataSources: [
          { name: 'Sea Ice', mode: 'UNAVAILABLE' as const, isCached: false, freshnessLabel: 'UNAVAILABLE' },
          { name: 'Ocean', mode: 'UNAVAILABLE' as const, isCached: false, freshnessLabel: 'UNAVAILABLE' },
          { name: 'Weather', mode: 'UNAVAILABLE' as const, isCached: false, freshnessLabel: 'UNAVAILABLE' },
          { name: 'Icebergs', mode: 'UNAVAILABLE' as const, isCached: false, freshnessLabel: 'UNAVAILABLE' },
          { name: 'Route', mode: 'UNAVAILABLE' as const, isCached: false, freshnessLabel: 'UNAVAILABLE' },
          { name: 'Voyage State', mode: 'UNAVAILABLE' as const, isCached: false, freshnessLabel: 'UNAVAILABLE' },
        ],
      };
    }

    const isCached = connectionState === 'OFFLINE';

    const dataSources: Array<{ name: string; mode: 'REAL' | 'SIMULATED' | 'UNAVAILABLE'; isCached: boolean; lastUpdate?: string | null; freshnessLabel: string }> = [
      {
        name: 'Sea Ice',
        mode: offlineSnapshot.environmentalState?.seaIceCells?.some((c) => c.isRealData) ? 'REAL' : 'SIMULATED',
        isCached,
        lastUpdate: offlineSnapshot.syncTimestamp,
        freshnessLabel: 'FRESH',
      },
      {
        name: 'Ocean',
        mode: offlineSnapshot.environmentalState?.oceanCurrentCells?.length ? 'REAL' : 'SIMULATED',
        isCached,
        lastUpdate: offlineSnapshot.syncTimestamp,
        freshnessLabel: 'FRESH',
      },
      {
        name: 'Weather',
        mode: offlineSnapshot.environmentalState?.weather ? (offlineSnapshot.environmentalState.weather.isRealData ? 'REAL' : 'SIMULATED') : 'UNAVAILABLE',
        isCached,
        lastUpdate: offlineSnapshot.syncTimestamp,
        freshnessLabel: offlineSnapshot.environmentalState?.weather ? 'FRESH' : 'UNAVAILABLE',
      },
      {
        name: 'Icebergs',
        mode: offlineSnapshot.environmentalState?.icebergs?.some((b) => !b.isSynthetic) ? 'REAL' : 'SIMULATED',
        isCached,
        lastUpdate: offlineSnapshot.syncTimestamp,
        freshnessLabel: 'FRESH',
      },
      {
        name: 'Route',
        mode: offlineSnapshot.routes?.length > 0 ? 'REAL' : 'UNAVAILABLE',
        isCached,
        lastUpdate: offlineSnapshot.syncTimestamp,
        freshnessLabel: offlineSnapshot.routes?.length > 0 ? 'FRESH' : 'UNAVAILABLE',
      },
      {
        name: 'Voyage State',
        mode: offlineSnapshot.voyageState?.dataMode === 'REAL' ? 'REAL' : offlineSnapshot.voyageState?.dataMode === 'SIMULATED' ? 'SIMULATED' : 'UNAVAILABLE',
        isCached,
        lastUpdate: offlineSnapshot.syncTimestamp,
        freshnessLabel: offlineSnapshot.voyageState ? 'FRESH' : 'UNAVAILABLE',
      },
    ];

    const hasAll = dataSources.every((ds) => ds.mode !== 'UNAVAILABLE');
    const localDataAvailability = hasAll ? ('AVAILABLE' as const) : ('PARTIAL' as const);

    return {
      connectionState,
      localDataAvailability,
      lastSyncTimestamp: offlineSnapshot.syncTimestamp,
      dataFreshnessSummary: offlineSnapshot.syncTimestamp
        ? `Last saved at ${new Date(offlineSnapshot.syncTimestamp).toLocaleTimeString()}`
        : 'FRESH',
      dataSources,
    };
  }, [connectionState, offlineSnapshot]);

  // Find nearest iceberg to current GPS position
  const nearestBerg = icebergs
    .map((b) => {
      const R = 3440.065;
      const dLat = ((b.lat - gpsTracking.currentLat) * Math.PI) / 180;
      const dLon = ((b.lon - gpsTracking.currentLon) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((gpsTracking.currentLat * Math.PI) / 180) *
          Math.cos((b.lat * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return { ...b, realTimeDistanceNm: Number(dist.toFixed(1)) };
    })
    .sort((a, b) => a.realTimeDistanceNm - b.realTimeDistanceNm)[0];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#F3F0E8] relative">
      {/* Top Contextual Bar over Map */}
      <div className="bg-[#FCFBF7] border-b border-[#D4D1C7] px-4 py-2 flex items-center justify-between z-10 shrink-0 shadow-xs h-12">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-[#263238]">
            <span className="font-medium text-[#596267]">Voyage:</span>
            <span className="font-semibold">{mission?.startLocation?.name?.split('(')[0] || 'Rothera Station'}</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#858C90]" />
            <span className="font-semibold">{mission?.destination?.name?.split('(')[0] || 'McMurdo Station'}</span>
          </div>

          <button
            onClick={() => {
              replanRoutes();
            }}
            className="px-3 py-1 bg-[#315E62] hover:bg-[#264B4F] text-white text-xs font-medium rounded-[6px] transition flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Recalculate Route
          </button>

          {decisionConfidence?.isRecommendationBlocked && (
            <div className="flex items-center gap-2 px-3 py-1 bg-[#F3E5E3] border border-[#A45750]/30 text-[#A45750] text-xs rounded-[6px]">
              <AlertTriangle className="w-3.5 h-3.5 text-[#A45750] shrink-0" />
              <span className="font-medium">Route Blocked: Insufficient confidence</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAnalysisDrawer(!showAnalysisDrawer)}
            className={`px-3 py-1 border text-xs font-medium rounded-[6px] transition flex items-center gap-1.5 ${
              showAnalysisDrawer
                ? 'bg-[#315E62] text-white border-[#315E62]'
                : 'bg-[#FCFBF7] text-[#263238] border-[#D4D1C7] hover:bg-[#E1ECEB]'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Decision Support & Analysis
            {decisionConfidence?.isRecommendationBlocked && (
              <span className="w-2 h-2 rounded-full bg-[#A45750]"></span>
            )}
          </button>

          <button
            onClick={() => setShowTelemetryDrawer(!showTelemetryDrawer)}
            className={`px-3 py-1 border text-xs font-medium rounded-[6px] transition flex items-center gap-1.5 ${
              showTelemetryDrawer
                ? 'bg-[#315E62] text-white border-[#315E62]'
                : 'bg-[#FCFBF7] text-[#263238] border-[#D4D1C7] hover:bg-[#E1ECEB]'
            }`}
          >
            <Navigation className="w-3.5 h-3.5" />
            Telemetry & Conning
          </button>
        </div>
      </div>

      {/* Main Workspace (Map + Drawers) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Map Workspace */}
        <div className="flex-1 flex flex-col h-full relative overflow-hidden">
          <AntarcticMap uncertaintyEvaluations={uncertaintyEvaluations} />
          <TimelineSlider />
        </div>

        {/* Telemetry / Conning Drawer */}
        {showTelemetryDrawer && (
          <div className="w-80 bg-[#FCFBF7] border-l border-[#D4D1C7] flex flex-col h-full overflow-y-auto shrink-0 z-20 p-4 space-y-4 shadow-lg">
            <div className="flex items-center justify-between border-b border-[#D4D1C7] pb-2">
              <h3 className="text-sm font-semibold text-[#263238] flex items-center gap-1.5">
                <Navigation className="w-4 h-4 text-[#596267]" />
                Telemetry & Conning
              </h3>
              <button
                onClick={() => setShowTelemetryDrawer(false)}
                className="p-1 hover:bg-[#F3F0E8] rounded text-[#596267]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Telemetry Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-[#F3F0E8] p-2.5 rounded-[6px] border border-[#D4D1C7]">
                <div className="text-[10px] text-[#596267] font-semibold">LAT / LON</div>
                <div className="text-xs font-bold text-[#263238] mt-0.5">
                  {Math.abs(gpsTracking.currentLat).toFixed(3)}°S
                </div>
                <div className="text-[11px] text-[#596267]">
                  {Math.abs(gpsTracking.currentLon).toFixed(3)}°W
                </div>
              </div>

              <div className="bg-[#F3F0E8] p-2.5 rounded-[6px] border border-[#D4D1C7]">
                <div className="text-[10px] text-[#596267] font-semibold">SPEED</div>
                <div className="text-xs font-bold text-[#263238] mt-0.5">
                  {gpsTracking.speedKnots} kts
                </div>
                <div className="text-[10px] text-[#596267]">{gpsTracking.isSimulating ? 'Underway' : 'Idle'}</div>
              </div>

              <div className="bg-[#F3F0E8] p-2.5 rounded-[6px] border border-[#D4D1C7]">
                <div className="text-[10px] text-[#596267] font-semibold">HEADING</div>
                <div className="text-xs font-bold text-[#263238] mt-0.5">
                  {gpsTracking.headingDeg}°
                </div>
                <div className="text-[10px] text-[#596267]">Gyro Lock</div>
              </div>

              <div className="bg-[#F3F0E8] p-2.5 rounded-[6px] border border-[#D4D1C7]">
                <div className="text-[10px] text-[#596267] font-semibold">XTE CORRIDOR</div>
                <div className="text-xs font-bold text-[#263238] mt-0.5">
                  {gpsTracking.crossTrackErrorNm} nm
                </div>
                <div className="text-[10px] text-[#596267]">±0.5 nm</div>
              </div>
            </div>

            {/* GPS Simulation Controls */}
            <div className="bg-[#F3F0E8] p-3 rounded-[6px] border border-[#D4D1C7] space-y-2">
              <div className="text-xs font-semibold text-[#263238]">GPS Simulation</div>
              <div className="flex items-center gap-2">
                {!gpsTracking.isSimulating ? (
                  <button
                    onClick={startGpsSimulation}
                    className="flex-1 px-3 py-1.5 bg-[#315E62] hover:bg-[#264B4F] text-white text-xs font-medium rounded-[6px] transition flex items-center justify-center gap-1"
                  >
                    <Play className="w-3.5 h-3.5" /> Start
                  </button>
                ) : (
                  <button
                    onClick={pauseGpsSimulation}
                    className="flex-1 px-3 py-1.5 bg-[#9A7945] hover:bg-[#856738] text-white text-xs font-medium rounded-[6px] transition flex items-center justify-center gap-1"
                  >
                    <Pause className="w-3.5 h-3.5" /> Pause
                  </button>
                )}
              </div>
            </div>

            {/* Decision Confidence Panel */}
            <div className="p-3.5 rounded-[6px] border border-[#D4D1C7] bg-[#FCFBF7] space-y-2">
              <div className="text-xs font-semibold text-[#263238] uppercase tracking-wider">
                Decision Confidence
              </div>
              <div className="flex items-center justify-between">
                <span className={`text-base font-bold uppercase ${
                  decisionConfidence.overallLevel === 'HIGH'
                    ? 'text-[#52715B]'
                    : decisionConfidence.overallLevel === 'MEDIUM'
                    ? 'text-[#9A7945]'
                    : 'text-[#A45750]'
                }`}>
                  {decisionConfidence.overallLevel}
                </span>
                <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-[#F3F0E8] border border-[#D4D1C7] text-[#263238]">
                  Score: {decisionConfidence.confidenceScore}/100
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Decision Support & Analysis Drawer */}
        {showAnalysisDrawer && (
          <div className="w-[540px] bg-[#FCFBF7] border-l border-[#D4D1C7] flex flex-col h-full overflow-hidden shrink-0 z-20 shadow-xl">
            {/* Drawer Header */}
            <div className="p-3.5 border-b border-[#D4D1C7] flex items-center justify-between bg-[#E7E4DA]">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#315E62]" />
                <h3 className="text-sm font-semibold text-[#263238]">Analysis & Decision Support</h3>
              </div>
              <button
                onClick={() => setShowAnalysisDrawer(false)}
                className="p-1 hover:bg-[#D4D1C7] rounded text-[#596267]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Tabs */}
            <div className="flex items-center gap-1 p-2 border-b border-[#D4D1C7] bg-[#FCFBF7] overflow-x-auto text-xs shrink-0">
              {[
                { id: 'decision', label: 'Decision State' },
                { id: 'hazards', label: 'Hazards' },
                { id: 'uncertainty', label: 'Uncertainty' },
                { id: 'resilience', label: 'Resilience' },
                { id: 'acquisition', label: 'Acquisition' },
                { id: 'reassessment', label: 'Reassessment' },
                { id: 'alerts', label: 'Alerts' },
                { id: 'validation', label: 'Validation' },
                { id: 'offline', label: 'Offline' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveAnalysisTab(tab.id as any)}
                  className={`px-2.5 py-1 rounded-[4px] font-medium whitespace-nowrap transition ${
                    activeAnalysisTab === tab.id
                      ? 'bg-[#315E62] text-white'
                      : 'text-[#596267] hover:bg-[#F3F0E8] hover:text-[#263238]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {activeAnalysisTab === 'offline' && (
                <OfflineStatusPanel {...offlinePanelProps} />
              )}

              {activeAnalysisTab === 'decision' && (
                <NavigationDecisionStatePanel decisionState={navigationDecisionState} />
              )}

              {activeAnalysisTab === 'hazards' && (
                <>
                  <VoyageStatePanel />
                  <HazardEncounterPanel
                    evaluationResult={hazardEvaluation}
                    selectedHazardId={selectedHazardId}
                    onSelectHazard={(id) => setSelectedHazardId(id)}
                  />
                </>
              )}

              {activeAnalysisTab === 'uncertainty' && (
                <UncertaintyZonePanel uncertaintyData={activeUncertaintyPanelData} showLegendInline={true} />
              )}

              {activeAnalysisTab === 'resilience' && (
                <RouteResiliencePanel evaluationResult={resilienceResult} />
              )}

              {activeAnalysisTab === 'acquisition' && (
                <DecisionImpactAcquisitionPanel
                  rankingResult={acquisitionRankingResult}
                  currentRouteName={activeRoute?.name || 'Active Route Corridor'}
                  decisionSensitivity={batchSensitivitySummary?.overallStability || 'ROBUST'}
                  currentUncertainty={activeUncertaintyPanelData?.uncertaintyEnvelopeLabel || 'Regional Uncertainty Zone'}
                  connectionState={connectionState}
                  availableBandwidthMb={connectionState === 'LIMITED' ? 50 : 150}
                />
              )}

              {activeAnalysisTab === 'reassessment' && (
                <DecisionReassessmentPanel result={reassessmentResult} />
              )}

              {activeAnalysisTab === 'alerts' && (
                <NavigationAlertPanel
                  evaluationResult={navigationAlertResult}
                  connectionState={connectionState}
                  gpsAvailable={gpsTracking.isSimulating || (gpsTracking.currentLat !== 0 && gpsTracking.currentLon !== 0)}
                />
              )}

              {activeAnalysisTab === 'validation' && (
                <ModelValidationPanel
                  icebergValidationSummary={icebergValidationSummary}
                  seaIceValidationSummary={seaIceValidationSummary}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};






const DataPrioritySection: React.FC = () => {
  const { dataAcquisitionRecommendations, setActiveView } = useApp();

  if (!dataAcquisitionRecommendations || dataAcquisitionRecommendations.length === 0) return null;
  const topRec = dataAcquisitionRecommendations[0];

  return (
    <div className="bg-white text-[#252B30] p-3.5 rounded-lg border border-[#DCDAD4] font-mono text-xs space-y-2.5 shadow-xs">
      <div className="flex items-center justify-between border-b border-[#E8E6E1] pb-2">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-[#3D5665]" />
          <span className="font-bold uppercase tracking-wider text-[#252B30]">DATA ACQUISITION PRIORITY</span>
        </div>
        <span className="text-[9px] px-2 py-0.5 rounded font-bold bg-[#E7EDF0] text-[#3D5665] border border-[#3D5665]/30">
          Phase 6 Priority
        </span>
      </div>

      <div className="space-y-1">
        <span className="text-[10px] text-[#626A70] block font-bold uppercase">Top Decision-Impact Observation:</span>
        <div className="flex items-center justify-between">
          <span className="font-bold text-[#252B30] text-xs">{topRec.productName}</span>
          <span
            className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${
              topRec.priority === 'CRITICAL'
                ? 'bg-[#F5EAEA] text-[#A65B55] border-[#A65B55]/30'
                : 'bg-[#E7EDF0] text-[#3D5665] border-[#3D5665]/30'
            }`}
          >
            {topRec.priority} ({topRec.score}/100)
          </span>
        </div>
      </div>

      <p className="text-[10px] text-[#626A70] font-sans leading-tight">
        {topRec.expectedBenefit}
      </p>

      <button
        onClick={() => setActiveView('acquisition')}
        className="w-full py-1.5 rounded bg-[#3D5665] hover:bg-[#304652] text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-xs"
      >
        <span>INSPECT DATA PRIORITIES</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

const WhatIfAnalysisSection: React.FC = () => {
  const {
    counterfactualScenarios,
    activeCounterfactualResult,
    batchSensitivitySummary,
    runSingleCounterfactual,
    runBatchSensitivity,
    clearCounterfactual,
    recommendedRoute,
  } = useApp();

  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(counterfactualScenarios[4]?.id || 'ICEBERG_DRIFT_POS_20');

  const selectedScenario = counterfactualScenarios.find((s) => s.id === selectedScenarioId) || counterfactualScenarios[0];

  return (
    <div className="bg-white text-[#252B30] p-3.5 rounded border border-[#DCDAD4] space-y-3 font-sans shadow-xs">
      <div className="flex items-center justify-between border-b border-[#E8E6E1] pb-2">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-[#3D5665]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#252B30]">WHAT-IF ANALYSIS</h3>
        </div>
        <span className="text-[9px] px-2 py-0.5 rounded font-mono font-bold bg-[#E7EDF0] text-[#3D5665] border border-[#3D5665]/30">
          Phase 5 Engine
        </span>
      </div>

      <p className="text-[11px] text-[#626A70] leading-tight">
        Tests whether route recommendations remain stable when environmental assumptions are perturbed.
      </p>

      {/* Current Recommendation & Baseline Info */}
      <div className="bg-[#F5F3EE] p-2.5 rounded border border-[#E8E6E1] flex items-center justify-between text-xs font-mono">
        <div>
          <span className="text-[10px] text-[#626A70] block uppercase">Current Baseline Plan</span>
          <span className="font-bold text-[#3D5665]">{recommendedRoute?.type || 'BALANCED'}</span>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-[#626A70] block uppercase">Decision Stability</span>
          <span
            className={`font-bold px-1.5 py-0.5 rounded text-[10px] uppercase ${
              activeCounterfactualResult?.stability === 'HIGHLY_SENSITIVE'
                ? 'bg-[#F5EAEA] text-[#A65B55] border border-[#A65B55]/30'
                : activeCounterfactualResult?.stability === 'SENSITIVE'
                ? 'bg-[#F5F0E5] text-[#9A7945] border border-[#9A7945]/30'
                : 'bg-[#EDF2ED] text-[#58725D] border border-[#58725D]/30'
            }`}
          >
            {activeCounterfactualResult ? activeCounterfactualResult.stability : 'ROBUST (Baseline)'}
          </span>
        </div>
      </div>

      {/* Scenario Selector & Controls */}
      <div className="space-y-2">
        <label className="text-[10px] font-bold text-[#626A70] uppercase block">Select Scenario Parameter:</label>
        <select
          value={selectedScenarioId}
          onChange={(e) => setSelectedScenarioId(e.target.value)}
          className="w-full bg-white text-[#252B30] border border-[#DCDAD4] rounded px-2.5 py-1.5 text-xs font-mono focus:outline-hidden focus:border-[#3D5665]"
        >
          {counterfactualScenarios.map((sc) => (
            <option key={sc.id} value={sc.id}>
              {sc.name} ({sc.perturbationValue > 0 ? '+' : ''}{sc.perturbationValue}{sc.units})
            </option>
          ))}
        </select>

        <div className="flex gap-2 pt-1">
          <button
            onClick={() => runSingleCounterfactual(selectedScenario)}
            className="flex-1 py-1.5 px-2 bg-[#3D5665] hover:bg-[#304652] text-white rounded text-xs font-bold uppercase tracking-wider transition flex items-center justify-center gap-1 shadow-xs"
          >
            <Play className="w-3 h-3 fill-white" /> Run Scenario
          </button>

          <button
            onClick={runBatchSensitivity}
            className="flex-1 py-1.5 px-2 bg-white hover:bg-[#F5F3EE] text-[#3D5665] border border-[#DCDAD4] rounded text-xs font-bold uppercase tracking-wider transition flex items-center justify-center gap-1 shadow-xs"
          >
            <RefreshCw className="w-3 h-3" /> Batch Analysis
          </button>
        </div>
      </div>

      {/* SINGLE COUNTERFACTUAL RESULT DISPLAY */}
      {activeCounterfactualResult && (
        <div className="bg-[#F5F3EE] p-3 rounded border border-[#DCDAD4] space-y-2.5 text-xs font-mono">
          <div className="flex items-center justify-between border-b border-[#E8E6E1] pb-1.5">
            <span className="font-bold text-[#3D5665] text-[11px] truncate max-w-[200px]">
              {activeCounterfactualResult.scenario.name}
            </span>
            <button onClick={clearCounterfactual} className="text-[10px] text-[#626A70] hover:text-[#252B30] underline">
              Clear
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="bg-white p-2 rounded border border-[#E8E6E1]">
              <span className="text-[9px] text-[#626A70] block">Baseline Route</span>
              <span className="font-bold text-[#252B30]">{activeCounterfactualResult.baselineRecommendedType}</span>
            </div>
            <div className="bg-white p-2 rounded border border-[#E8E6E1]">
              <span className="text-[9px] text-[#626A70] block">Counterfactual Route</span>
              <span className="font-bold text-[#3D5665]">{activeCounterfactualResult.scenarioRecommendedType}</span>
            </div>
          </div>

          <div className="flex items-center justify-between bg-white p-2 rounded border border-[#E8E6E1]">
            <div>
              <span className="text-[10px] text-[#626A70] block">Recommendation Changed</span>
              <span
                className={`font-bold ${
                  activeCounterfactualResult.recommendationChanged ? 'text-[#9A7945]' : 'text-[#58725D]'
                }`}
              >
                {activeCounterfactualResult.recommendationChanged ? 'YES' : 'NO'}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-[#626A70] block">Route Stability</span>
              <span
                className={`font-bold uppercase ${
                  activeCounterfactualResult.stability === 'ROBUST' ? 'text-[#58725D]' : 'text-[#9A7945]'
                }`}
              >
                {activeCounterfactualResult.stability}
              </span>
            </div>
          </div>

          {/* Deltas Grid */}
          <div className="grid grid-cols-4 gap-1 text-center text-[10px]">
            <div className="bg-white p-1.5 rounded border border-[#E8E6E1]">
              <span className="text-[#626A70] block">ΔRisk</span>
              <span className={`font-bold ${activeCounterfactualResult.riskChange > 0 ? 'text-[#A65B55]' : 'text-[#58725D]'}`}>
                {activeCounterfactualResult.riskChange > 0 ? '+' : ''}{activeCounterfactualResult.riskChange}%
              </span>
            </div>
            <div className="bg-white p-1.5 rounded border border-[#E8E6E1]">
              <span className="text-[#626A70] block">ΔETA</span>
              <span className="font-bold text-[#252B30]">
                {activeCounterfactualResult.etaChange > 0 ? '+' : ''}{activeCounterfactualResult.etaChange} h
              </span>
            </div>
            <div className="bg-white p-1.5 rounded border border-[#E8E6E1]">
              <span className="text-[#626A70] block">ΔFuel</span>
              <span className="font-bold text-[#252B30]">
                {activeCounterfactualResult.fuelChange > 0 ? '+' : ''}{activeCounterfactualResult.fuelChange} t
              </span>
            </div>
            <div className="bg-white p-1.5 rounded border border-[#E8E6E1]">
              <span className="text-[#626A70] block">ΔDist</span>
              <span className="font-bold text-[#252B30]">
                {activeCounterfactualResult.distanceChange > 0 ? '+' : ''}{activeCounterfactualResult.distanceChange} nm
              </span>
            </div>
          </div>

          {/* 3-Part Structured Explanation */}
          <div className="bg-white p-2.5 rounded border border-[#E8E6E1] space-y-1.5 text-[11px] font-sans">
            <div>
              <span className="font-bold text-[#3D5665] block text-[10px] uppercase">What Changed?</span>
              <p className="text-[#626A70] text-[11px]">{activeCounterfactualResult.explanation.whatChanged}</p>
            </div>
            <div>
              <span className="font-bold text-[#3D5665] block text-[10px] uppercase">Why Did It Matter?</span>
              <p className="text-[#626A70] text-[11px] leading-snug">{activeCounterfactualResult.explanation.whyItMatter}</p>
            </div>
            <div>
              <span className="font-bold text-[#3D5665] block text-[10px] uppercase">Did Recommendation Change?</span>
              <p className="text-[#626A70] text-[11px]">{activeCounterfactualResult.explanation.didRecommendationChange}</p>
            </div>
          </div>

          {/* Provenance Warning */}
          <div className="p-2 rounded bg-[#F5F0E5] border border-[#9A7945]/30 text-[10px] text-[#9A7945] space-y-0.5">
            <span className="font-bold block uppercase tracking-wider text-[9px] text-[#9A7945]">
              DATA PROVENANCE & TRANSPARENCY
            </span>
            <p className="leading-tight">{activeCounterfactualResult.provenance.scenarioModification}</p>
          </div>
        </div>
      )}

      {/* BATCH SENSITIVITY SUMMARY DISPLAY */}
      {batchSensitivitySummary && (
        <div className="bg-[#F5F3EE] p-3 rounded border border-[#DCDAD4] space-y-2.5 text-xs font-mono">
          <div className="flex items-center justify-between border-b border-[#E8E6E1] pb-1.5">
            <span className="font-bold text-[#3D5665] text-[11px]">Batch Sensitivity Matrix</span>
            <span
              className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                batchSensitivitySummary.overallStability === 'ROBUST'
                  ? 'bg-[#EDF2ED] text-[#58725D] border border-[#58725D]/30'
                  : 'bg-[#F5F0E5] text-[#9A7945] border border-[#9A7945]/30'
              }`}
            >
              {batchSensitivitySummary.overallStability}
            </span>
          </div>

          <div className="bg-white p-2 rounded border border-[#E8E6E1] text-[11px] font-sans space-y-1">
            <span className="font-bold text-[#9A7945] block text-[10px] uppercase">
              Dominant Sensitivity in Tested Scenarios:
            </span>
            <span className="font-bold text-[#252B30] text-xs block">
              {batchSensitivitySummary.dominantSensitivity?.replace('_', ' ') || 'NONE'}
            </span>
            <p className="text-[#626A70] text-[10px] leading-tight font-mono">
              {batchSensitivitySummary.dominantExplanation}
            </p>
          </div>

          {/* Matrix Table */}
          <div className="space-y-1 text-[10px]">
            <div className="grid grid-cols-12 text-[#626A70] font-bold border-b border-[#E8E6E1] pb-1 px-1">
              <span className="col-span-6">PARAMETER</span>
              <span className="col-span-3 text-center">STABILITY</span>
              <span className="col-span-3 text-right">CHANGE</span>
            </div>
            {batchSensitivitySummary.parameterResults.map((pr, idx) => (
              <div key={idx} className="grid grid-cols-12 items-center py-1 px-1 border-b border-[#E8E6E1]/50">
                <span className="col-span-6 text-[#252B30] font-semibold truncate">
                  {pr.parameter.replace('_', ' ')}
                </span>
                <span className="col-span-3 text-center">
                  <span
                    className={`px-1 py-0.5 rounded text-[8px] font-bold uppercase ${
                      pr.routeStability === 'ROBUST'
                        ? 'bg-[#EDF2ED] text-[#58725D]'
                        : 'bg-[#F5F0E5] text-[#9A7945]'
                    }`}
                  >
                    {pr.routeStability}
                  </span>
                </span>
                <span className="col-span-3 text-right text-[#626A70] font-bold">
                  {pr.scenarios.filter((s) => s.recommendationChanged).length > 0 ? 'YES' : 'NO'}
                </span>
              </div>
            ))}
          </div>

        </div>
      )}
    </div>
  );
};


