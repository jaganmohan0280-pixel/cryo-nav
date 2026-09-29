import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  buildNavigationAssistantContext,
  MANDATORY_NAVIGATOR_DISCLAIMER,
} from '../services/navigationAssistantContextEngine';
import {
  generateLlmNavigationExplanation,
  LlmExplanationResult,
  SERVICE_UNAVAILABLE_MESSAGE,
} from '../services/navigationAssistantLlm';
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
    navigationOperationalState,
  } = useApp();

  const [llmResult, setLlmResult] = useState<LlmExplanationResult | null>(null);
  const [isLoadingLlm, setIsLoadingLlm] = useState<boolean>(false);

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
      provenance: navigationOperationalState?.sourceProvenance || `CRYO NAV Structured Context Engine (${dataMode})`,
      operationalState: navigationOperationalState,
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
    navigationOperationalState,
  ]);

  const handleAskQuery = async (query: string): Promise<LlmExplanationResult | null> => {
    if (!assistantContextResult) return null;
    setIsLoadingLlm(true);
    try {
      const result = await generateLlmNavigationExplanation({
        contextResult: assistantContextResult,
        userQuery: query,
      });
      setLlmResult(result);
      return result;
    } catch (err: any) {
      const fallbackRes: LlmExplanationResult = {
        success: false,
        explanation: `${SERVICE_UNAVAILABLE_MESSAGE}\n\n${assistantContextResult.structuredAnswers.whyCurrentRouteRecommended}`,
        isFallback: true,
        error: err?.message || 'UNKNOWN_ERROR',
        provenance: 'Phase 16B Deterministic Fallback',
        dataMode: assistantContextResult.dataMode,
        navigatorAuthorityDisclaimer: MANDATORY_NAVIGATOR_DISCLAIMER,
        generatedAt: new Date().toISOString(),
      };
      setLlmResult(fallbackRes);
      return fallbackRes;
    } finally {
      setIsLoadingLlm(false);
    }
  };

  return (
    <div className="flex-1 p-6 bg-[#F5F7F7] overflow-y-auto min-h-screen text-[#18343A] space-y-6 font-sans">
      <NavigationAssistantPanel
        contextResult={assistantContextResult}
        onAskQuery={handleAskQuery}
        llmResult={llmResult}
        isLoadingLlm={isLoadingLlm}
      />
    </div>
  );
};
