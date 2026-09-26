import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { buildNavigationAssistantContext } from '../services/navigationAssistantContextEngine';
import { NavigationAssistantPanel } from '../components/navigation/NavigationAssistantPanel';
import { evaluateAllRouteHazards } from '../services/hazardEncounterEngine';
import { evaluateUncertainty } from '../services/uncertaintyEngine';
import { evaluateAcquisitionPriorities } from '../services/decisionImpactAcquisitionEngine';
import { evaluateDecisionReassessment } from '../services/decisionReassessmentEngine';
import { analyzeRouteResilience } from '../services/routeResilienceEngine';
import { evaluateNavigationAlerts } from '../services/navigationAlertEngine';

export const AiAssistantView: React.FC = () => {
  const {
    mission,
    selectedVessel,
    recommendedRoute,
    routes,
    icebergs,
    seaIceCells,
    weather,
    connectionState,
    satelliteProducts,
    forecastHorizonHours,
    decisionConfidence,
    environmentalMode,
    gpsTracking,
  } = useApp();

  const activeRoute = recommendedRoute || routes[0] || null;

  const hazardEvaluation = useMemo(() => {
    if (!activeRoute || !selectedVessel) return null;
    return evaluateAllRouteHazards(activeRoute, icebergs || [], seaIceCells || [], selectedVessel);
  }, [activeRoute, icebergs, seaIceCells, selectedVessel]);

  const uncertaintyResult = useMemo(() => {
    if (!activeRoute || !icebergs || icebergs.length === 0) return null;
    const targetBerg = icebergs[0];
    return evaluateUncertainty({
      hazardId: targetBerg.id,
      hazardName: targetBerg.name,
      hazardType: 'ICEBERG',
      location: { lat: targetBerg.lat, lon: targetBerg.lon },
      baseRadiusNm: targetBerg.uncertaintyRadiusNm || 0.8,
      confidenceLevel: decisionConfidence?.overallLevel || 'HIGH',
      freshnessState: 'FRESH',
      connectionState,
      forecastHorizonHours: forecastHorizonHours || 0,
      dataMode: environmentalMode === 'REAL' ? 'REAL' : 'SIMULATED',
    });
  }, [activeRoute, icebergs, decisionConfidence, connectionState, forecastHorizonHours, environmentalMode]);

  const routeResilience = useMemo(() => {
    if (!activeRoute || !selectedVessel) return null;
    return analyzeRouteResilience({
      route: activeRoute,
      vessel: selectedVessel,
      seaIceCells: seaIceCells || [],
      icebergs: icebergs || [],
      weather,
      dataMode: environmentalMode === 'REAL' ? 'REAL' : 'SIMULATED',
    });
  }, [activeRoute, selectedVessel, seaIceCells, icebergs, weather, environmentalMode]);

  const acquisitionResult = useMemo(() => {
    if (!activeRoute) return null;
    return evaluateAcquisitionPriorities({
      activeRoutes: routes || [activeRoute],
      selectedRouteId: activeRoute.id,
      candidateProducts: satelliteProducts || [],
      icebergs: icebergs || [],
      seaIceCells: seaIceCells || [],
      connectionState,
      decisionConfidence,
    });
  }, [activeRoute, routes, satelliteProducts, icebergs, seaIceCells, connectionState, decisionConfidence]);

  const reassessmentResult = useMemo(() => {
    if (!activeRoute) return null;
    const currentState = {
      selectedRouteId: activeRoute.id,
      selectedRouteName: activeRoute.name,
      confidenceLevel: decisionConfidence?.overallLevel || 'HIGH',
      freshnessState: 'FRESH',
      connectionState,
      routeSensitivity: routeResilience?.sensitivityClassification || 'ROBUST',
      uncertaintyRadiusNm: uncertaintyResult?.expandedUncertaintyRadiusNm || 1.0,
      primaryHazardSeverity: hazardEvaluation?.highestSeverity || 'NONE',
      hazards: hazardEvaluation?.encounters || [],
      dataMode: environmentalMode === 'REAL' ? 'REAL' : 'SIMULATED',
    };
    return evaluateDecisionReassessment({
      previousState: currentState,
      currentState,
      activeRoute,
    });
  }, [activeRoute, routes, decisionConfidence, connectionState, routeResilience, uncertaintyResult, hazardEvaluation, environmentalMode]);

  const alertsResult = useMemo(() => {
    if (!activeRoute || !selectedVessel) return null;
    return evaluateNavigationAlerts({
      vessel: selectedVessel,
      activeRoute,
      hazards: hazardEvaluation?.encounters || [],
      seaIceExposure: hazardEvaluation?.seaIceRouteSummary || null,
      confidenceLevel: decisionConfidence?.overallLevel || 'HIGH',
      uncertaintyRadiusNm: uncertaintyResult?.expandedUncertaintyRadiusNm || 1.0,
      freshnessState: 'FRESH',
      connectionState,
      gpsState: {
        lat: gpsTracking.currentLat,
        lon: gpsTracking.currentLon,
        headingDeg: gpsTracking.headingDeg,
        speedKnots: gpsTracking.speedKnots,
        isAvailable: true,
      },
      dataMode: environmentalMode === 'REAL' ? 'REAL' : 'SIMULATED',
    });
  }, [selectedVessel, activeRoute, hazardEvaluation, decisionConfidence, uncertaintyResult, gpsTracking, connectionState, environmentalMode]);

  const assistantContextResult = useMemo(() => {
    const dataMode = environmentalMode === 'REAL' ? 'REAL' : 'SIMULATED';
    return buildNavigationAssistantContext({
      mission,
      vessel: selectedVessel,
      activeRoute,
      allRoutes: routes,
      hazards: hazardEvaluation?.encounters || icebergs,
      seaIceExposure: hazardEvaluation?.seaIceRouteSummary || null,
      uncertainty: uncertaintyResult,
      confidence: decisionConfidence,
      acquisitionPriorities: acquisitionResult,
      reassessment: reassessmentResult,
      resilience: routeResilience,
      alerts: alertsResult,
      connectionState,
      dataMode,
      provenance: `CRYO NAV Structured Context Engine (${dataMode})`,
    });
  }, [
    mission,
    selectedVessel,
    activeRoute,
    routes,
    hazardEvaluation,
    icebergs,
    uncertaintyResult,
    decisionConfidence,
    acquisitionResult,
    reassessmentResult,
    routeResilience,
    alertsResult,
    connectionState,
    environmentalMode,
  ]);

  return (
    <div className="flex-1 p-6 bg-slate-950 overflow-y-auto min-h-screen text-slate-100 space-y-6">
      <NavigationAssistantPanel contextResult={assistantContextResult} />
    </div>
  );
};


