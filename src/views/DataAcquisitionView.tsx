import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Sentinel1ProductValidationResult,
  Sentinel1ProcessingResult,
  SarFeatureAnalysisResult,
  SarConfirmationSummary,
  CandidateConfirmation,
  CandidateConfirmationStatus,
} from '../types';
import {
  Radio,
  Download,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Clock,
  Database,
  Layers,
  Sparkles,
  Zap,
  Info,
  MapPin,
  HelpCircle,
  WifiOff,
  Sliders,
  Compass,
  Eye,
  FileCheck,
  FileText,
  Search,
  Cpu,
  BarChart2,
  Target,
  ShieldAlert,
  Check,
  Filter,
} from 'lucide-react';

export const DataAcquisitionView: React.FC = () => {
  const {
    satelliteProducts,
    routes,
    icebergs,
    seaIceCells,
    connectionState,
    acquireSatelliteProduct,
    decisionChangeStatus,
    setActiveView,
    decisionConfidence,
    batchSensitivitySummary,
    dataAcquisitionRecommendations,
    fiveMinuteBudgetSummary,
    selectedAcquisitionFootprintId,
    setSelectedAcquisitionFootprintId,
    environmentalMode,
    cdseCatalogueItems,
    cdseQueryStatus,
    cdseLastQueryResult,
    cdseQueryInfo,
    isFetchingCdseCatalogue,
    fetchCdseCatalogue,
    satelliteAcquisitionRecords,
  } = useApp();

  const [acquiringId, setAcquiringId] = useState<string | null>(null);
  const [validatingId, setValidatingId] = useState<string | null>(null);
  const [validationResults, setValidationResults] = useState<Record<string, Sentinel1ProductValidationResult>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [processingResults, setProcessingResults] = useState<Record<string, Sentinel1ProcessingResult>>({});
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [candidateResults, setCandidateResults] = useState<Record<string, SarFeatureAnalysisResult>>({});
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [confirmationResults, setConfirmationResults] = useState<Record<string, SarConfirmationSummary>>({});
  const [confirmationFilter, setConfirmationFilter] = useState<'ALL' | 'UNCONFIRMED' | 'SUPPORTED' | 'REFERENCE_MATCHED' | 'CONFIRMATION_UNAVAILABLE'>('ALL');
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/satellite/validations')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.validations)) {
          const map: Record<string, Sentinel1ProductValidationResult> = {};
          for (const v of data.validations) {
            if (v.productId) map[v.productId] = v;
          }
          setValidationResults(map);
        }
      })
      .catch(() => {});

    fetch('/api/satellite/processings')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.processings)) {
          const map: Record<string, Sentinel1ProcessingResult> = {};
          for (const p of data.processings) {
            if (p.productId) map[p.productId] = p;
          }
          setProcessingResults(map);
        }
      })
      .catch(() => {});

    fetch('/api/satellite/candidates')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.records)) {
          const map: Record<string, SarFeatureAnalysisResult> = {};
          for (const r of data.records) {
            if (r.productId) map[r.productId] = r;
          }
          setCandidateResults(map);
        }
      })
      .catch(() => {});

    fetch('/api/satellite/confirmations')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.records)) {
          const map: Record<string, SarConfirmationSummary> = {};
          for (const r of data.records) {
            if (r.productId) map[r.productId] = r;
          }
          setConfirmationResults(map);
        }
      })
      .catch(() => {});
  }, []);

  const handleValidateProduct = async (productId: string) => {
    setValidatingId(productId);
    try {
      const res = await fetch('/api/satellite/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
      });
      const data = await res.json();
      if (data.success && data.validation) {
        setValidationResults((prev) => ({
          ...prev,
          [productId]: data.validation,
        }));
      }
    } catch (err) {
      console.error('Validation request failed:', err);
    } finally {
      setValidatingId(null);
    }
  };

  const handleProcessSar = async (productId: string) => {
    setProcessingId(productId);
    try {
      const res = await fetch('/api/satellite/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
      });
      const data = await res.json();
      if (data.success && data.processing) {
        setProcessingResults((prev) => ({
          ...prev,
          [productId]: data.processing,
        }));
      }
    } catch (err) {
      console.error('SAR Preprocessing request failed:', err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleAnalyzeFeatures = async (productId: string) => {
    setAnalyzingId(productId);
    try {
      const res = await fetch('/api/satellite/analyze-features', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
      });
      const data = await res.json();
      if (data.success && data.result) {
        setCandidateResults((prev) => ({
          ...prev,
          [productId]: data.result,
        }));
      }
    } catch (err) {
      console.error('SAR feature extraction request failed:', err);
    } finally {
      setAnalyzingId(null);
    }
  };

  const handleConfirmCandidates = async (productId: string) => {
    setConfirmingId(productId);
    try {
      const res = await fetch('/api/satellite/confirm-candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          seaIceCells,
          icebergs,
        }),
      });
      const data = await res.json();
      if (data.success && data.result) {
        setConfirmationResults((prev) => ({
          ...prev,
          [productId]: data.result,
        }));
      }
    } catch (err) {
      console.error('SAR candidate confirmation request failed:', err);
    } finally {
      setConfirmingId(null);
    }
  };

  const handleAcquireProduct = async (
    id: string,
    assetId: string = 'PRODUCT',
    assetUrl?: string,
    sourceChecksum?: string,
    expectedSize?: number,
    collection: string = 'SENTINEL-1',
    acquisitionTime?: string
  ) => {
    setAcquiringId(id);
    try {
      await acquireSatelliteProduct(
        id,
        assetId,
        assetUrl,
        sourceChecksum,
        expectedSize,
        collection,
        acquisitionTime
      );
    } finally {
      setAcquiringId(null);
    }
  };


  const handleToggleFootprint = (id: string) => {
    if (selectedAcquisitionFootprintId === id) {
      setSelectedAcquisitionFootprintId(null);
    } else {
      setSelectedAcquisitionFootprintId(id);
    }
  };

  const handleViewOnMap = (id: string) => {
    setSelectedAcquisitionFootprintId(id);
    setActiveView('dashboard');
  };

  const recommendedRoute = routes.find((r) => r.isRecommended) || routes[0] || null;
  const topPriorityRec = dataAcquisitionRecommendations[0] || null;

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50 text-slate-900 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Top Header & Navigation Actions */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Radio className="w-5 h-5 text-blue-600 animate-pulse" />
              <h1 className="text-xl font-bold text-slate-900">
                Decision-Impact Data Acquisition Engine
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-blue-50 text-blue-700 border border-blue-200">
                PHASE 6
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 font-mono">
              Core Feedback Loop: <span className="text-slate-800 font-medium">"Acquire observations that can change the navigation decision."</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 font-mono text-xs px-2.5 py-1 rounded bg-slate-100 border border-slate-200">
              <span className="text-slate-500">Mode:</span>
              <span className={environmentalMode === 'REAL' ? 'font-bold text-emerald-700' : 'font-bold text-cyan-700'}>
                {environmentalMode}
              </span>
            </div>

            <div className="flex items-center gap-1.5 font-mono text-xs px-2.5 py-1 rounded bg-slate-100 border border-slate-200">
              <span className="text-slate-500">Connectivity:</span>
              <span
                className={`font-bold ${
                  connectionState === 'ONLINE'
                    ? 'text-emerald-700'
                    : connectionState === 'LIMITED'
                    ? 'text-amber-700'
                    : 'text-red-700'
                }`}
              >
                {connectionState}
              </span>
            </div>

            <button
              onClick={() => setActiveView('dashboard')}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white transition flex items-center gap-1.5 shadow-xs"
            >
              <Compass className="w-3.5 h-3.5 text-blue-400" />
              <span>RETURN TO NAVIGATION</span>
            </button>
          </div>
        </div>

        {/* Offline State Banner */}
        {connectionState === 'OFFLINE' && (
          <div className="bg-red-950/90 text-white p-4 rounded-xl border border-red-800 font-mono text-xs space-y-2 shadow-md">
            <div className="flex items-center gap-2 text-red-300 font-bold text-sm">
              <WifiOff className="w-4 h-4 text-red-400" />
              <span>ACQUISITION UNAVAILABLE — CONNECTION STATE IS OFFLINE</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              Satellite downlinks are currently disabled. Real-time satellite data acquisition cannot be performed while offline.
              Cached observations remain available for navigation analysis.
            </p>
            <div className="pt-1 flex flex-wrap items-center gap-4 text-[11px] text-red-200">
              <span>Verified Local Cache: <strong>ACTIVE</strong></span>
              <span>•</span>
              <span>Last Ingestion: <strong>2026-09-06T07:28:00Z</strong></span>
              <span>•</span>
              <span>Cache Verification: <strong>PASSED</strong></span>
            </div>
          </div>
        )}

        {/* 1. CURRENT NAVIGATION DECISION SUMMARY */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-xl border border-slate-800 shadow-md font-mono text-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span className="font-bold text-slate-100 text-sm uppercase tracking-wider">
                CURRENT NAVIGATION DECISION SUMMARY
              </span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
              Phase 4/5 Inputs Active
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            {/* Recommended Route */}
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Active Recommendation</span>
              <p className="text-emerald-400 font-bold text-sm">
                {recommendedRoute ? recommendedRoute.type : 'BALANCED'} ROUTE
              </p>
              <p className="text-[10px] text-slate-400 truncate">{recommendedRoute?.name || 'Gerlache Research Route'}</p>
            </div>

            {/* Decision Confidence */}
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Decision Confidence</span>
              <p
                className={`font-bold text-sm ${
                  decisionConfidence?.overallLevel === 'HIGH'
                    ? 'text-emerald-400'
                    : decisionConfidence?.overallLevel === 'MEDIUM'
                    ? 'text-sky-400'
                    : decisionConfidence?.overallLevel === 'LOW'
                    ? 'text-amber-400'
                    : 'text-red-400'
                }`}
              >
                {decisionConfidence?.overallLevel || 'MEDIUM'} ({decisionConfidence?.confidenceScore || 72}/100)
              </p>
              <p className="text-[10px] text-slate-400">
                {decisionConfidence?.isRecommendationBlocked ? 'Recommendation Blocked' : 'Decision Allowed'}
              </p>
            </div>

            {/* Dominant Uncertainty */}
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Dominant Uncertainty</span>
              <p className="text-amber-300 font-bold truncate">
                {decisionConfidence?.primaryLimitingFactor || 'ICEBERG TRAJECTORY UNCERTAINTY'}
              </p>
              <p className="text-[10px] text-slate-400">Primary confidence barrier</p>
            </div>

            {/* Decision Sensitivity */}
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Decision Sensitivity</span>
              <p
                className={`font-bold text-sm ${
                  batchSensitivitySummary?.overallStability === 'HIGHLY_SENSITIVE'
                    ? 'text-pink-400'
                    : batchSensitivitySummary?.overallStability === 'SENSITIVE'
                    ? 'text-amber-400'
                    : 'text-emerald-400'
                }`}
              >
                {batchSensitivitySummary?.overallStability || 'SENSITIVE'}
              </p>
              <p className="text-[10px] text-slate-400">
                Dominant parameter: {batchSensitivitySummary?.dominantSensitivity || 'ICEBERG_DRIFT'}
              </p>
            </div>
          </div>
        </div>

        {/* 2. DECISION FEEDBACK CHAIN VISUALIZATION */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3 font-mono text-xs shadow-xs">
          <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-blue-600" />
            DECISION-IMPACT DATA FEEDBACK CHAIN
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-center text-[11px]">
            <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 space-y-1">
              <span className="text-[9px] font-bold uppercase text-amber-700 block">Step 1 — Uncertainty</span>
              <span className="font-bold block text-slate-900 truncate">
                {decisionConfidence?.primaryLimitingFactor?.split(' ')[0] || 'ICEBERG'} UNCERTAINTY
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-pink-50 border border-pink-200 text-pink-900 space-y-1">
              <span className="text-[9px] font-bold uppercase text-pink-700 block">Step 2 — Sensitivity</span>
              <span className="font-bold block text-slate-900">
                {batchSensitivitySummary?.overallStability || 'SENSITIVE'}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-cyan-50 border border-cyan-200 text-cyan-900 space-y-1">
              <span className="text-[9px] font-bold uppercase text-cyan-700 block">Step 3 — Data Need</span>
              <span className="font-bold block text-slate-900 truncate">
                {batchSensitivitySummary?.dominantSensitivity || 'ICEBERG DRIFT'} DATA
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 space-y-1">
              <span className="text-[9px] font-bold uppercase text-blue-700 block">Step 4 — Data Priority</span>
              <span className="font-bold block text-blue-800 uppercase">
                {topPriorityRec?.priority || 'CRITICAL'} PRIORITY
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-1">
              <span className="text-[9px] font-bold uppercase text-emerald-700 block">Step 5 — Acquisition</span>
              <span className="font-bold block text-emerald-800">
                {connectionState === 'OFFLINE' ? 'CACHED ONLY' : 'DOWNLINK READY'}
              </span>
            </div>
          </div>
        </div>

        {/* 3. 5-MINUTE ACQUISITION PRIORITY WINDOW PLANNING BUDGET */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-xl border border-slate-800 shadow-md font-mono text-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span className="font-bold text-slate-100 text-sm uppercase tracking-wider">
                5-MINUTE ACQUISITION PLANNING WINDOW
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400">Estimated Planning Budget:</span>
              <span className="px-2 py-0.5 rounded font-bold bg-amber-950 text-amber-300 border border-amber-800">
                {fiveMinuteBudgetSummary.totalAllocatedMinutes} / {fiveMinuteBudgetSummary.maxBudgetMinutes} MIN
              </span>
            </div>
          </div>

          {/* Budget Progress Bar */}
          <div className="space-y-1">
            <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800 p-0.5">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-amber-500 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(
                    100,
                    (fiveMinuteBudgetSummary.totalAllocatedMinutes / fiveMinuteBudgetSummary.maxBudgetMinutes) * 100
                  )}%`,
                }}
              ></div>
            </div>
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>0 MIN</span>
              <span>{fiveMinuteBudgetSummary.remainingBudgetMinutes} MIN REMAINING IN BUDGET</span>
              <span>5.0 MIN CAP</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-300 leading-relaxed">
            {fiveMinuteBudgetSummary.explanation}
          </p>

          <div className="text-[9px] text-slate-400 italic border-t border-slate-800 pt-2 flex items-center gap-1.5">
            <Info className="w-3 h-3 text-slate-400 shrink-0" />
            <span>Configured planning budget assumption — actual downlink speeds depend on network link and provider availability.</span>
          </div>
        </div>

        {/* 4. LIVE CDSE STAC SATELLITE CATALOGUE STATUS PANEL */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs space-y-4 font-mono text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                LIVE CDSE STAC SATELLITE CATALOGUE
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                PHASE 7A REAL STAC API
              </span>
            </div>

            <button
              onClick={() => fetchCdseCatalogue()}
              disabled={isFetchingCdseCatalogue}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition flex items-center gap-1.5 shadow-xs disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-200" />
              <span>{isFetchingCdseCatalogue ? 'QUERYING CDSE STAC...' : 'EXECUTE LIVE CDSE QUERY'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-[11px]">
            <div className="p-2.5 rounded bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[9px] text-slate-500 uppercase block font-bold">Source & Endpoint</span>
              <span className="font-bold text-slate-800 block truncate">Copernicus Data Space (CDSE)</span>
              <span className="text-[9px] text-slate-500 block truncate">stac.dataspace.copernicus.eu/v1</span>
            </div>

            <div className="p-2.5 rounded bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[9px] text-slate-500 uppercase block font-bold">Collection & Target</span>
              <span className="font-bold text-slate-800 block">SENTINEL-1 (SAR)</span>
              <span className="text-[9px] text-slate-500 block">All-Weather / Day-Night Radar</span>
            </div>

            <div className="p-2.5 rounded bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[9px] text-slate-500 uppercase block font-bold">Spatial Region</span>
              <span className="font-bold text-slate-800 block">Mission Route Corridor</span>
              <span className="text-[9px] text-slate-500 block">BBox: [-70.0, -68.5, -56.0, -59.0]</span>
            </div>

            <div className="p-2.5 rounded bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[9px] text-slate-500 uppercase block font-bold">Catalogue Status</span>
              <span
                className={`font-bold block ${
                  cdseQueryStatus === 'RESULTS'
                    ? 'text-emerald-700'
                    : cdseQueryStatus === 'QUERYING'
                    ? 'text-blue-600'
                    : cdseQueryStatus === 'NO_RESULTS'
                    ? 'text-amber-700'
                    : 'text-slate-700'
                }`}
              >
                {cdseQueryStatus === 'RESULTS'
                  ? `RESULTS (${cdseCatalogueItems.length} products)`
                  : cdseQueryStatus === 'QUERYING'
                  ? 'QUERYING STAC API...'
                  : cdseQueryStatus === 'NO_RESULTS'
                  ? 'NO MATCHING CDSE PRODUCTS'
                  : cdseQueryStatus === 'UNAVAILABLE'
                  ? 'CDSE CATALOGUE UNAVAILABLE'
                  : 'IDLE (READY)'}
              </span>
              <span className="text-[9px] text-slate-500 block">
                {cdseLastQueryResult?.retrievedAt
                  ? `Retrieved: ${new Date(cdseLastQueryResult.retrievedAt).toLocaleTimeString()}`
                  : 'Not queried yet'}
              </span>
            </div>
          </div>

          {/* Discovered Real CDSE STAC Items List */}
          {environmentalMode === 'REAL' && cdseQueryStatus === 'RESULTS' && cdseCatalogueItems.length > 0 && (
            <div className="space-y-3 pt-2 border-t border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                DISCOVERED STAC CATALOGUE ITEMS ({cdseCatalogueItems.length})
              </span>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-xs">
                {cdseCatalogueItems.map((item) => {
                  const acqRecord = satelliteAcquisitionRecords[item.id];
                  const acqStatus = acqRecord?.status || 'CATALOGUE_ITEM';
                  const isDownloading = acqStatus === 'DOWNLOADING' || acqStatus === 'ACQUISITION_REQUESTED';
                  const isAcquired = acqStatus === 'VERIFIED' || acqStatus === 'CACHED' || acqStatus === 'DOWNLOADED';
                  const firstAssetKey = item.assets ? Object.keys(item.assets)[0] || 'PRODUCT' : 'PRODUCT';
                  const firstAssetUrl = item.assets?.[firstAssetKey]?.href || `https://stac.dataspace.copernicus.eu/v1/collections/${item.collection}/items/${item.id}`;

                  return (
                    <div key={item.id} className="bg-slate-900 text-white p-3.5 rounded-lg border border-slate-800 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                          {item.platform} • {item.productType}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                          isAcquired
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                            : isDownloading
                            ? 'bg-blue-950 text-blue-300 border-blue-700'
                            : acqStatus === 'ACQUISITION_FAILED'
                            ? 'bg-red-950 text-red-300 border-red-700'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}>
                          {acqStatus.replace(/_/g, ' ')}
                        </span>
                      </div>

                      <div>
                        <h4 className="font-bold text-white text-xs truncate">{item.id}</h4>
                        <p className="text-[10px] text-slate-400">
                          Acquired: {new Date(item.acquisitionTime).toUTCString()}
                        </p>
                      </div>

                      <div className="text-[10px] text-slate-300 grid grid-cols-2 gap-1 border-t border-slate-800 pt-2">
                        <span>Instrument: <strong>{item.instrument}</strong></span>
                        <span>Orbit: <strong>{item.orbitDirection || 'ASCENDING'}</strong></span>
                        <span>Source: <strong>CDSE STAC</strong></span>
                        <span>BBox: <strong>{item.bbox.map((n) => n.toFixed(1)).join(', ')}</strong></span>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800">
                        <button
                          onClick={() => handleViewOnMap(item.id)}
                          className="px-2.5 py-1 rounded text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-200 transition flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3 text-cyan-400" />
                          <span>VIEW</span>
                        </button>

                        <button
                          onClick={() =>
                            handleAcquireProduct(
                              item.id,
                              firstAssetKey,
                              firstAssetUrl,
                              undefined,
                              250,
                              item.collection,
                              item.acquisitionTime
                            )
                          }
                          disabled={acquiringId === item.id || isDownloading || connectionState === 'OFFLINE'}
                          className={`px-3 py-1 rounded text-[11px] font-bold transition flex items-center gap-1.5 shadow-xs ${
                            isAcquired
                              ? 'bg-emerald-800 text-emerald-100 hover:bg-emerald-700'
                              : isDownloading
                              ? 'bg-blue-800 text-blue-200 opacity-75'
                              : 'bg-blue-600 hover:bg-blue-500 text-white'
                          }`}
                        >
                          <Download className="w-3 h-3" />
                          <span>
                            {isAcquired
                              ? 'CACHED'
                              : isDownloading
                              ? 'DOWNLOADING...'
                              : acquiringId === item.id
                              ? 'REQUESTING...'
                              : 'ACQUIRE'}
                          </span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 5. RANKED OBSERVATION PRIORITIES */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase font-mono tracking-wider flex items-center gap-2">
                <Database className="w-4 h-4 text-blue-600" />
                RANKED OBSERVATION PRIORITIES ({dataAcquisitionRecommendations.length})
              </h2>
              <p className="text-xs text-slate-500 font-mono">
                Sorted by Value-of-Information Heuristic Score (Highest Decision Impact First)
              </p>
            </div>

            <div className="text-xs font-mono text-slate-500">
              Footprint Filter: <strong className="text-slate-800">{selectedAcquisitionFootprintId || 'ALL'}</strong>
            </div>
          </div>

          <div className="space-y-4">
            {dataAcquisitionRecommendations.map((rec) => {
              const isSelected = selectedAcquisitionFootprintId === rec.productId;
              const acqRecord = satelliteAcquisitionRecords[rec.productId];
              const acqStatus = acqRecord?.status || (environmentalMode === 'REAL' ? 'AVAILABLE_FOR_ACQUISITION' : rec.status === 'Acquired' ? 'CACHED' : 'CATALOGUE_ITEM');
              const isAcquired = acqStatus === 'VERIFIED' || acqStatus === 'CACHED' || acqStatus === 'DOWNLOADED';
              const isDownloading = acqStatus === 'DOWNLOADING' || acqStatus === 'ACQUISITION_REQUESTED';

              return (
                <div
                  key={rec.productId}
                  className={`bg-white rounded-xl border transition-all shadow-xs overflow-hidden ${
                    isSelected
                      ? 'border-blue-500 ring-2 ring-blue-200'
                      : rec.priority === 'CRITICAL'
                      ? 'border-purple-300 bg-purple-50/20'
                      : rec.priority === 'HIGH'
                      ? 'border-blue-200 bg-blue-50/10'
                      : 'border-slate-200'
                  }`}
                >
                  {/* Card Header Bar */}
                  <div className="p-4 sm:p-5 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2.5">
                        {/* Priority Badge */}
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold uppercase border ${
                            rec.priority === 'CRITICAL'
                              ? 'bg-purple-100 text-purple-900 border-purple-300'
                              : rec.priority === 'HIGH'
                              ? 'bg-blue-100 text-blue-900 border-blue-300'
                              : rec.priority === 'MEDIUM'
                              ? 'bg-sky-100 text-sky-900 border-sky-300'
                              : 'bg-slate-100 text-slate-700 border-slate-300'
                          }`}
                        >
                          {rec.priority} PRIORITY
                        </span>

                        <h3 className="text-sm font-bold text-slate-900">{rec.productName}</h3>

                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                          {rec.productId}
                        </span>

                        <span className="text-xs font-mono font-semibold text-slate-700">
                          Impact Score: <strong className="text-blue-700">{rec.score}/100</strong>
                        </span>
                      </div>

                      {/* Status Badge */}
                      <span
                        className={`text-xs font-mono font-semibold px-2.5 py-0.5 rounded ${
                          isAcquired
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold'
                            : isDownloading
                            ? 'bg-blue-100 text-blue-800 border border-blue-300 font-bold'
                            : connectionState === 'OFFLINE'
                            ? 'bg-red-100 text-red-800 border border-red-300'
                            : 'bg-slate-100 text-slate-700 border border-slate-300'
                        }`}
                      >
                        {acqStatus.replace(/_/g, ' ')}
                      </span>
                    </div>

                    {/* "WHY THIS DATA?" EXPLANATION PANEL */}
                    <div className="bg-slate-900 text-white p-3.5 rounded-lg font-mono text-xs space-y-2 border border-slate-800">
                      <div className="flex items-center gap-2 text-cyan-400 font-bold text-[11px] uppercase tracking-wider">
                        <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
                        WHY THIS DATA?
                      </div>

                      <p className="text-slate-200 leading-relaxed">
                        {rec.acquisitionReason}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px]">
                        <span className="text-emerald-300 font-bold">
                          Expected Benefit: {rec.expectedBenefit}
                        </span>
                      </div>
                    </div>

                    {/* SCORE BREAKDOWN METRICS GRID */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 font-mono text-[11px] pt-1">
                      <div className="p-2 rounded bg-slate-50 border border-slate-200">
                        <span className="text-[9px] text-slate-500 uppercase block font-bold">Decision Relevance</span>
                        <strong className="text-slate-800 text-xs">{rec.scoreBreakdown.decisionRelevance}/100</strong>
                      </div>

                      <div className="p-2 rounded bg-slate-50 border border-slate-200">
                        <span className="text-[9px] text-slate-500 uppercase block font-bold">Corridor Overlap</span>
                        <strong className="text-blue-700 text-xs">{rec.scoreBreakdown.spatialRelevance}%</strong>
                      </div>

                      <div className="p-2 rounded bg-slate-50 border border-slate-200">
                        <span className="text-[9px] text-slate-500 uppercase block font-bold">Potential Reduction Weight</span>
                        <strong className="text-emerald-700 text-xs">Weight: {rec.scoreBreakdown.uncertaintyReductionPotential}</strong>
                      </div>

                      <div className="p-2 rounded bg-slate-50 border border-slate-200">
                        <span className="text-[9px] text-slate-500 uppercase block font-bold">Sensitivity Boost</span>
                        <strong className="text-purple-700 text-xs">{rec.scoreBreakdown.routeSensitivityRelevance}/100</strong>
                      </div>

                      <div className="p-2 rounded bg-slate-50 border border-slate-200">
                        <span className="text-[9px] text-slate-500 uppercase block font-bold">Size / Bandwidth</span>
                        <strong className="text-slate-800 text-xs">{rec.sizeMb} MB ({rec.estimatedAcquisitionTimeMinutes} min)</strong>
                      </div>

                      <div className="p-2 rounded bg-slate-50 border border-slate-200">
                        <span className="text-[9px] text-slate-500 uppercase block font-bold">5-Min Eligible</span>
                        <strong className={rec.isFiveMinuteEligible ? 'text-emerald-700 text-xs' : 'text-slate-400 text-xs'}>
                          {rec.isFiveMinuteEligible ? 'YES' : 'NO'}
                        </strong>
                      </div>
                    </div>

                    {/* Affected Hazards & Footprint info */}
                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-slate-600 pt-2 border-t border-slate-200">
                      <div>
                        Sensor: <strong className="text-slate-900">{rec.sensorType}</strong> • Footprint: <strong className="text-slate-900">{rec.footprint.description}</strong> ({rec.footprint.radiusNm} nm radius)
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleFootprint(rec.productId)}
                          className={`px-3 py-1.5 rounded text-xs font-semibold transition flex items-center gap-1.5 border shadow-xs ${
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-300'
                          }`}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{isSelected ? 'Footprint Active' : 'Toggle Footprint'}</span>
                        </button>

                        <button
                          onClick={() => handleViewOnMap(rec.productId)}
                          className="px-3 py-1.5 rounded text-xs font-semibold bg-white text-blue-700 hover:bg-blue-50 border border-blue-300 transition flex items-center gap-1.5 shadow-xs"
                        >
                          <MapPin className="w-3.5 h-3.5 text-blue-600" />
                          <span>View on Map</span>
                        </button>

                        <button
                          onClick={() =>
                            handleAcquireProduct(
                              rec.productId,
                              'PRODUCT',
                              `https://stac.dataspace.copernicus.eu/v1/collections/sentinel-1-grd/items/${rec.productId}`,
                              undefined,
                              rec.sizeMb
                            )
                          }
                          disabled={acquiringId === rec.productId || isDownloading || connectionState === 'OFFLINE'}
                          className={`px-3.5 py-1.5 rounded text-xs font-semibold transition flex items-center gap-1.5 shadow-xs ${
                            isAcquired
                              ? 'bg-emerald-700 text-white'
                              : isDownloading
                              ? 'bg-blue-600 text-white opacity-75'
                              : 'bg-slate-900 hover:bg-slate-800 text-white'
                          }`}
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>
                            {isAcquired
                              ? 'CACHED'
                              : isDownloading
                              ? 'DOWNLOADING...'
                              : acquiringId === rec.productId
                              ? 'ACQUIRING...'
                              : 'ACQUIRE'}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 6. LOCAL SATELLITE CACHE & ACQUISITION DETAIL PANEL (PHASE 7B) */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs space-y-4 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                LOCAL SATELLITE CACHE & ACQUISITION STATUS
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                PHASE 7B LOCAL CACHE
              </span>
            </div>
            <span className="text-xs text-slate-500 font-semibold">
              Total Cached Products: <strong>{Object.keys(satelliteAcquisitionRecords).length}</strong>
            </span>
          </div>

          {Object.keys(satelliteAcquisitionRecords).length === 0 ? (
            <div className="p-4 bg-slate-50 text-slate-600 rounded-lg text-center border border-slate-200">
              No satellite products stored in local cache. Select a real CDSE STAC catalogue item above and click <strong>[ ACQUIRE ]</strong>.
            </div>
          ) : (
            <div className="space-y-4">
              {Object.values(satelliteAcquisitionRecords).map((rec) => {
                const isVerified = rec.verificationStatus === 'VERIFIED';
                const isChecksumUnavailable = rec.verificationStatus === 'SOURCE_CHECKSUM_UNAVAILABLE';

                return (
                  <div key={rec.productId} className="bg-slate-900 text-white rounded-xl p-4 border border-slate-800 space-y-3 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-cyan-400 block tracking-wider">SATELLITE PRODUCT</span>
                        <h3 className="text-sm font-bold text-white font-mono">{rec.productId}</h3>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded text-xs font-bold ${
                          rec.status === 'VERIFIED' || rec.status === 'CACHED' || rec.status === 'DOWNLOADED'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                            : rec.status === 'DOWNLOADING' || rec.status === 'ACQUISITION_REQUESTED'
                            ? 'bg-blue-950 text-blue-300 border border-blue-700'
                            : 'bg-red-950 text-red-300 border border-red-700'
                        }`}>
                          STATUS: {rec.status}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-[11px] font-mono">
                      <div className="bg-slate-950/60 p-2.5 rounded border border-slate-800">
                        <span className="text-slate-400 text-[9px] uppercase block font-bold">Source & Collection</span>
                        <span className="text-white font-bold block">{rec.source}</span>
                        <span className="text-slate-400 text-[10px] block">{rec.collection}</span>
                      </div>

                      <div className="bg-slate-950/60 p-2.5 rounded border border-slate-800">
                        <span className="text-slate-400 text-[9px] uppercase block font-bold">Acquisition Timestamp</span>
                        <span className="text-white font-bold block">{new Date(rec.acquisitionTime).toUTCString()}</span>
                        <span className="text-slate-400 text-[10px] block">Request: {new Date(rec.requestTime).toLocaleTimeString()}</span>
                      </div>

                      <div className="bg-slate-950/60 p-2.5 rounded border border-slate-800">
                        <span className="text-slate-400 text-[9px] uppercase block font-bold">Downloaded Size</span>
                        <span className="text-cyan-300 font-bold block">
                          {rec.downloadedSize > 0 ? `${(rec.downloadedSize / (1024 * 1024)).toFixed(2)} MB` : rec.expectedSize ? `${rec.expectedSize} MB` : 'N/A'}
                        </span>
                        <span className="text-slate-400 text-[10px] block">Media: {rec.mediaType}</span>
                      </div>

                      <div className="bg-slate-950/60 p-2.5 rounded border border-slate-800">
                        <span className="text-slate-400 text-[9px] uppercase block font-bold">Integrity Verification</span>
                        <span className={`font-bold block ${isVerified ? 'text-emerald-400' : isChecksumUnavailable ? 'text-amber-300' : 'text-red-400'}`}>
                          {isVerified
                            ? 'SHA-256 VERIFIED'
                            : isChecksumUnavailable
                            ? 'Downloaded successfully; source checksum unavailable.'
                            : 'INTEGRITY CHECK FAILED'}
                        </span>
                        {rec.checksum?.hash && (
                          <span className="text-slate-400 text-[9px] truncate block font-mono">
                            SHA-256: {rec.checksum.hash.substring(0, 16)}...
                          </span>
                        )}
                      </div>
                    </div>

                    {rec.error && (
                      <div className="bg-red-950/80 border border-red-800 text-red-200 p-2.5 rounded text-[11px]">
                        <strong>Acquisition Error:</strong> {rec.error}
                      </div>
                    )}

                    {rec.localCacheReference && (
                      <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800">
                        <span>Cache Reference: <strong className="text-slate-200">{rec.localCacheReference}</strong></span>
                        <span>Cache Status: <strong>CACHED</strong></span>
                      </div>
                    )}

                    {/* Phase 7C.1 Validate Product Action Button */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                      <button
                        onClick={() => handleValidateProduct(rec.productId)}
                        disabled={validatingId === rec.productId}
                        className="px-3 py-1.5 rounded text-xs font-bold bg-cyan-700 hover:bg-cyan-600 text-white transition flex items-center gap-1.5 shadow-xs"
                      >
                        <FileCheck className="w-3.5 h-3.5" />
                        <span>
                          {validatingId === rec.productId
                            ? 'VALIDATING CONTAINER...'
                            : validationResults[rec.productId]
                            ? 'RE-VALIDATE PRODUCT'
                            : 'VALIDATE PRODUCT'}
                        </span>
                      </button>

                      {validationResults[rec.productId] && (
                        <span className="text-[10px] text-cyan-300 font-mono font-semibold">
                          Validated: {new Date(validationResults[rec.productId].validatedAt).toLocaleTimeString()}
                        </span>
                      )}
                    </div>

                    {/* Phase 7C.1 Validation Results Panel */}
                    {validationResults[rec.productId] && (() => {
                      const val = validationResults[rec.productId];
                      return (
                        <div className="bg-slate-950 p-3.5 rounded-lg border border-cyan-900/60 space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-700">
                              STRUCTURE: {val.productStructureStatus}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-950 text-purple-300 border border-purple-700">
                              CONTAINER: {val.containerFormat}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-950 text-blue-300 border border-blue-700">
                              MANIFEST: {val.manifestFound ? 'FOUND' : 'NOT FOUND'}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700">
                              METADATA: {val.metadataStatus}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-900 text-emerald-100 border border-emerald-500 uppercase">
                              {val.validationStatus}
                            </span>
                          </div>

                          {/* Extracted Metadata Grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono bg-slate-900/90 p-2.5 rounded border border-slate-800">
                            <div>
                              <span className="text-slate-400 block text-[9px]">PLATFORM</span>
                              <strong className="text-white">{val.platform || 'Sentinel-1'}</strong>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[9px]">INSTRUMENT</span>
                              <strong className="text-white">{val.instrument || 'C-SAR'}</strong>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[9px]">PRODUCT TYPE</span>
                              <strong className="text-white">{val.productType || 'GRD'}</strong>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[9px]">SENSOR MODE</span>
                              <strong className="text-white">{val.mode || 'IW'}</strong>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[9px]">POLARIZATION</span>
                              <strong className="text-cyan-300">{Array.isArray(val.polarization) ? val.polarization.join(', ') : 'N/A'}</strong>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[9px]">PROCESSING LEVEL</span>
                              <strong className="text-white">{val.processingLevel || 'Level-1'}</strong>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[9px]">RELATIVE ORBIT</span>
                              <strong className="text-white">{val.relativeOrbit ?? 'N/A'}</strong>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[9px]">ABSOLUTE ORBIT</span>
                              <strong className="text-white">{val.absoluteOrbit ?? 'N/A'}</strong>
                            </div>
                          </div>

                          {/* Discovered Paths */}
                          <div className="text-[10px] text-slate-300 font-mono space-y-1 bg-slate-900/40 p-2 rounded border border-slate-800">
                            <div className="font-bold text-slate-200">SAFE CONTAINER PATH DISCOVERY:</div>
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1 text-[9px]">
                              <div>manifest.safe: <span className={val.manifestFound ? 'text-emerald-400 font-bold' : 'text-slate-500'}>{val.manifestFound ? 'DISCOVERED' : 'ABSENT'}</span></div>
                              <div>measurement/: <span className={val.discoveredPaths?.measurementPresent ? 'text-emerald-400 font-bold' : 'text-slate-500'}>{val.discoveredPaths?.measurementPresent ? 'PRESENT' : 'ABSENT'}</span></div>
                              <div>annotation/: <span className={val.discoveredPaths?.annotationPresent ? 'text-emerald-400 font-bold' : 'text-slate-500'}>{val.discoveredPaths?.annotationPresent ? 'PRESENT' : 'ABSENT'}</span></div>
                              <div>preview/: <span className={val.discoveredPaths?.previewPresent ? 'text-emerald-400 font-bold' : 'text-slate-500'}>{val.discoveredPaths?.previewPresent ? 'PRESENT' : 'ABSENT'}</span></div>
                              <div>support/: <span className={val.discoveredPaths?.supportPresent ? 'text-emerald-400 font-bold' : 'text-slate-500'}>{val.discoveredPaths?.supportPresent ? 'PRESENT' : 'ABSENT'}</span></div>
                            </div>
                          </div>

                          {/* Mandatory Phase 7C.1 Scientific Disclaimer */}
                          <div className="bg-amber-950/40 border border-amber-800 text-amber-300 p-2 rounded text-[11px] font-mono flex flex-col gap-1">
                            <div className="flex items-center gap-1.5 font-bold">
                              <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              <span>SCIENTIFIC VALIDATION BOUNDARY (PHASE 7C.1)</span>
                            </div>
                            <div className="text-[10px] text-amber-200 font-sans space-y-0.5 pl-5">
                              <div>• Real CDSE Sentinel-1 Product structure & manifest metadata verified.</div>
                              <div>• <strong>SAR PROCESSING: NOT YET PERFORMED</strong> (Radiometric calibration & noise removal belong to Phase 7C.2).</div>
                              <div>• <strong>ICEBERG DETECTION: NOT YET PERFORMED</strong> (Feature extraction belongs to Phase 7C.3).</div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Phase 7C.2 Process SAR Action Bar */}
                    {validationResults[rec.productId] && (
                      <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                        <button
                          onClick={() => handleProcessSar(rec.productId)}
                          disabled={processingId === rec.productId}
                          className="px-3.5 py-1.5 rounded text-xs font-bold bg-purple-700 hover:bg-purple-600 text-white transition flex items-center gap-1.5 shadow-xs"
                        >
                          <Cpu className="w-3.5 h-3.5" />
                          <span>
                            {processingId === rec.productId
                              ? 'PREPROCESSING SAR BAND...'
                              : processingResults[rec.productId]
                              ? 'RE-PROCESS SAR BAND'
                              : 'PROCESS SAR'}
                          </span>
                        </button>

                        {processingResults[rec.productId] && (
                          <span className="text-[10px] text-purple-300 font-mono font-semibold">
                            Processed: {new Date(processingResults[rec.productId].processingTimestamp).toLocaleTimeString()}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Phase 7C.2 SAR Processing Results Panel */}
                    {processingResults[rec.productId] && (() => {
                      const proc = processingResults[rec.productId];
                      const isLutCalibrated = proc.calibrationStatus === 'RADIOMETRIC_SIGMA0_LUT' || proc.physicalQuantity === 'SIGMA0';
                      const isUncalibrated = proc.calibrationStatus === 'CALIBRATION_UNAVAILABLE_IN_PRODUCT' || proc.physicalQuantity === 'RAW_DN';

                      return (
                        <div className="bg-slate-950 p-3.5 rounded-lg border border-purple-900/60 space-y-3 font-mono">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-950 text-purple-200 border border-purple-700 uppercase">
                              STATUS: {proc.processingStatus}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                              isLutCalibrated
                                ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                                : 'bg-amber-950 text-amber-300 border-amber-700'
                            }`}>
                              CALIBRATION: {isLutCalibrated ? 'SENTINEL-1 PRODUCT CALIBRATION (LUT)' : 'NOT YET IMPLEMENTED / INSUFFICIENT PRODUCT CALIBRATION DATA'}
                            </span>
                            {isUncalibrated && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-700">
                                RAW MEASUREMENT: AVAILABLE
                              </span>
                            )}
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-950 text-blue-300 border border-blue-700">
                              POLARIZATION: {proc.rasterMetadata?.polarization || 'HH'}
                            </span>
                          </div>

                          {/* Calibration Source & Method Info */}
                          <div className="text-[10px] text-slate-300 bg-slate-900/80 p-2 rounded border border-slate-800 space-y-1">
                            <div>CALIBRATION METHOD: <strong className="text-cyan-300">{proc.calibrationMethod || 'RAW_UNCALIBRATED'}</strong></div>
                            <div>CALIBRATION SOURCE: <strong className="text-slate-200">{proc.calibrationSource || 'NONE_AVAILABLE'}</strong></div>
                            <div>PHYSICAL OUTPUT: <strong className="text-emerald-400">{proc.units}</strong></div>
                          </div>

                          {/* Raster Metadata & Statistics Grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono bg-slate-900/90 p-2.5 rounded border border-slate-800">
                            <div>
                              <span className="text-slate-400 block text-[9px]">MEASUREMENT BAND</span>
                              <strong className="text-white truncate block">{proc.rasterMetadata?.measurementFilename}</strong>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[9px]">RASTER DIMENSIONS</span>
                              <strong className="text-white">{proc.rasterMetadata?.width} x {proc.rasterMetadata?.height} ({proc.rasterMetadata?.bands || 1} band)</strong>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[9px]">SOURCE CRS</span>
                              <strong className="text-white truncate block">{proc.rasterMetadata?.sourceCrs || proc.rasterMetadata?.crs || 'UNKNOWN / NOT EXPLICITLY PROVIDED'}</strong>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[9px]">PIXEL SPACING</span>
                              <strong className="text-white">
                                {proc.rasterMetadata?.pixelWidth
                                  ? `${proc.rasterMetadata.pixelWidth}m x ${proc.rasterMetadata.pixelHeight || proc.rasterMetadata.pixelWidth}m`
                                  : proc.rasterMetadata?.resolutionMeters
                                  ? `${proc.rasterMetadata.resolutionMeters}m`
                                  : 'UNKNOWN / NOT EXPLICITLY PROVIDED'}
                              </strong>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[9px]">STATISTICS DOMAIN</span>
                              <strong className="text-cyan-300">{proc.rasterStatistics?.statisticsDomain || 'RAW_MEASUREMENT'}</strong>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[9px]">MIN ({isLutCalibrated ? 'σ⁰ dB' : 'DN'})</span>
                              <strong className="text-emerald-400">{proc.rasterStatistics?.min} {isLutCalibrated ? 'dB' : 'DN'}</strong>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[9px]">MAX ({isLutCalibrated ? 'σ⁰ dB' : 'DN'})</span>
                              <strong className="text-emerald-400">{proc.rasterStatistics?.max} {isLutCalibrated ? 'dB' : 'DN'}</strong>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[9px]">MEAN ({isLutCalibrated ? 'σ⁰ dB' : 'DN'})</span>
                              <strong className="text-cyan-300">{proc.rasterStatistics?.mean} {isLutCalibrated ? 'dB' : 'DN'} (±{proc.rasterStatistics?.stdDev})</strong>
                            </div>
                          </div>

                          {/* Pixel Metric Counters */}
                          <div className="text-[10px] text-slate-300 grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-900/50 p-2 rounded border border-slate-800">
                            <div>Valid Pixels: <strong className="text-emerald-400">{proc.rasterStatistics?.validPixelCount?.toLocaleString()}</strong></div>
                            <div>Nodata Pixels: <strong className="text-amber-400">{proc.rasterStatistics?.nodataPixelCount?.toLocaleString()}</strong></div>
                            <div>Invalid Calib Pixels: <strong className="text-red-400">{proc.rasterStatistics?.invalidCalibrationCount || 0}</strong></div>
                            <div>Clipped dB Pixels: <strong className="text-purple-400">{proc.rasterStatistics?.clippedPixelCount || 0}</strong></div>
                          </div>

                          {/* Mandatory Phase 7C.2 Processing Disclaimer */}
                          <div className="bg-purple-950/40 border border-purple-800 text-purple-300 p-2 rounded text-[11px] font-mono flex flex-col gap-1">
                            <div className="flex items-center gap-1.5 font-bold">
                              <Info className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                              <span>SAR PREPROCESSING BOUNDARY (PHASE 7C.2)</span>
                            </div>
                            <div className="text-[10px] text-purple-200 font-sans space-y-0.5 pl-5">
                              <div>• {isLutCalibrated ? 'Measurement band extracted & calibrated to normalized radar backscatter σ⁰ (dB) via Sentinel-1 XML LUT.' : 'Raw measurement band extracted; calibration unavailable in product payload.'}</div>
                              <div>• <strong>ICEBERG DETECTION: NOT YET PERFORMED</strong> (Feature extraction belongs to Phase 7C.3).</div>
                              <div>• <strong>SEA-ICE EXTRACTION: NOT YET PERFORMED</strong> (Classification belongs to Phase 7C.4).</div>
                              <div>• <strong>TERRAIN CORRECTION: NOT PERFORMED</strong> (DEM input required for Range-Doppler orthorectification).</div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Phase 7C.3 Feature Extraction Action Bar */}
                    {processingResults[rec.productId] && (
                      <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                        <button
                          onClick={() => handleAnalyzeFeatures(rec.productId)}
                          disabled={analyzingId === rec.productId}
                          className="px-3.5 py-1.5 rounded text-xs font-bold bg-amber-700 hover:bg-amber-600 text-white transition flex items-center gap-1.5 shadow-xs"
                        >
                          <Target className="w-3.5 h-3.5" />
                          <span>
                            {analyzingId === rec.productId
                              ? 'EXTRACTING SAR CANDIDATES...'
                              : candidateResults[rec.productId]
                              ? 'RE-RUN CANDIDATE EXTRACTION'
                              : 'ANALYZE SAR FEATURES'}
                          </span>
                        </button>

                        {candidateResults[rec.productId] && (
                          <span className="text-[10px] text-amber-300 font-mono font-semibold">
                            Analyzed: {new Date(candidateResults[rec.productId].analysisTimestamp).toLocaleTimeString()}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Phase 7C.3 SAR Iceberg Candidate Results Panel */}
                    {candidateResults[rec.productId] && (() => {
                      const candRes = candidateResults[rec.productId];
                      const candidates = candRes.candidates || [];

                      return (
                        <div className="bg-slate-950 p-3.5 rounded-lg border border-amber-900/60 space-y-3 font-mono">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-200 border border-amber-700 uppercase">
                                STATUS: UNCONFIRMED SAR CANDIDATE
                              </span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-950 text-red-300 border border-red-800 uppercase">
                                ICEBERG CONFIRMATION: NOT YET PERFORMED
                              </span>
                            </div>

                            <span className="text-[11px] text-slate-300 font-bold">
                              CANDIDATES EXTRACTED: <strong className="text-amber-400">{candidates.length}</strong>
                            </span>
                          </div>

                          {/* Baseline Parameters Header */}
                          <div className="text-[10px] text-slate-300 bg-slate-900/80 p-2.5 rounded border border-slate-800 space-y-1">
                            <div className="text-amber-400 font-bold uppercase tracking-wider">
                              BASELINE ENGINEERING PARAMETERS:
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[9px] pt-1">
                              <div>Window Size: <strong>{candRes.analysisParameters?.windowSizePixels}px</strong></div>
                              <div>Background Percentile: <strong>{candRes.analysisParameters?.backgroundPercentile}th</strong></div>
                              <div>Threshold Offset: <strong>+{candRes.analysisParameters?.thresholdOffsetDb} dB</strong></div>
                              <div>Candidate Area Range: <strong>{candRes.analysisParameters?.minCandidateAreaM2} - {candRes.analysisParameters?.maxCandidateAreaM2} m²</strong></div>
                            </div>
                          </div>

                          {/* Candidates Extracted Cards */}
                          {candidates.length === 0 ? (
                            <div className="p-3 bg-slate-900 text-slate-400 rounded text-center text-xs">
                              No unconfirmed SAR iceberg candidates met the baseline extraction threshold.
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase font-bold">
                                <span>UNCONFIRMED TARGET CANDIDATES LIST ({candidates.length.toLocaleString()} TOTAL)</span>
                                <span className="text-amber-400">Displaying Top 20 Candidates by Ranking Index</span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                {candidates
                                  .slice()
                                  .sort((a, b) => (b.candidateScore || 0) - (a.candidateScore || 0))
                                  .slice(0, 20)
                                  .map((cand) => {
                                    const areaStr = cand.estimatedAreaM2 && cand.estimatedAreaM2 > 0 ? `${cand.estimatedAreaM2.toLocaleString()} m²` : 'UNAVAILABLE';
                                    const dimsStr = cand.estimatedWidthMeters && cand.estimatedHeightMeters && cand.estimatedWidthMeters > 0 ? `${cand.estimatedWidthMeters}m × ${cand.estimatedHeightMeters}m` : 'UNAVAILABLE';
                                    const meanSigmaStr = cand.meanBackscatterDb !== undefined ? `${cand.meanBackscatterDb.toFixed(2)} dB` : 'UNAVAILABLE';
                                    const maxSigmaStr = cand.maxBackscatterDb !== undefined ? `${cand.maxBackscatterDb.toFixed(2)} dB` : 'UNAVAILABLE';
                                    const bgSigmaStr = cand.backgroundBackscatterDb !== undefined ? `${cand.backgroundBackscatterDb.toFixed(2)} dB` : 'UNAVAILABLE';
                                    const contrastStr = cand.contrastDb !== undefined ? `+${cand.contrastDb.toFixed(2)} dB` : 'UNAVAILABLE';

                                    return (
                                      <div key={cand.id} className="bg-slate-900/90 p-3 rounded-lg border border-slate-800 space-y-2">
                                        <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5">
                                          <div className="flex items-center gap-1.5">
                                            <Target className="w-3.5 h-3.5 text-amber-400" />
                                            <span className="font-bold text-white text-xs">{cand.id}</span>
                                          </div>

                                          <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-amber-950 text-amber-300 border border-amber-800">
                                            RANKING INDEX: {cand.candidateScore}/100
                                          </span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] text-slate-300">
                                          <div>Coordinates: <strong className="text-cyan-300">{cand.latitude.toFixed(4)}°, {cand.longitude.toFixed(4)}°</strong></div>
                                          <div>Est. Area: <strong className="text-white">{areaStr}</strong></div>
                                          <div>Dimensions: <strong className="text-white">{dimsStr}</strong></div>
                                          <div>Aspect Ratio: <strong className="text-white">{cand.aspectRatio || '1.0'}</strong></div>
                                          <div>Mean σ⁰: <strong className="text-emerald-400">{meanSigmaStr}</strong></div>
                                          <div>Max σ⁰: <strong className="text-emerald-400">{maxSigmaStr}</strong></div>
                                          <div>Background σ⁰: <strong className="text-slate-400">{bgSigmaStr}</strong></div>
                                          <div>Contrast: <strong className="text-amber-300">{contrastStr}</strong></div>
                                        </div>

                                        <div className="flex flex-wrap items-center justify-between gap-1 text-[9px] pt-1 border-t border-slate-800">
                                          <span className="text-slate-400">STATUS: <strong className="text-amber-300">UNCONFIRMED SAR CANDIDATE</strong></span>
                                          <span className="text-slate-400">CONFIRMATION: <strong className="text-red-300">NOT YET PERFORMED</strong></span>
                                        </div>
                                      </div>
                                    );
                                  })}
                              </div>
                            </div>
                          )}

                          {/* Mandatory Phase 7C.3 Scientific Disclaimer */}
                          <div className="bg-amber-950/40 border border-amber-800 text-amber-300 p-2.5 rounded text-[11px] font-mono flex flex-col gap-1">
                            <div className="flex items-center gap-1.5 font-bold text-amber-200">
                              <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              <span>UNCONFIRMED SAR TARGET CANDIDATES (PHASE 7C.3 BOUNDARY)</span>
                            </div>
                            <div className="text-[10px] text-amber-200 font-sans space-y-0.5 pl-5">
                              <div>• Target candidates generated via baseline backscatter thresholding against local moving background.</div>
                              <div>• <strong>Candidates are NOT confirmed icebergs</strong> — confirmation requires multi-sensor verification or manual inspection.</div>
                              <div>• Statistical iceberg classification, machine learning, and USNIC catalog matching belong to future phases.</div>
                              <div>• Route optimization, risk engine, and confidence levels remain unaffected.</div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                  {/* Phase 7C.4 Candidate Confirmation Action Bar */}
                    {candidateResults[rec.productId] && (
                      <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                        <button
                          onClick={() => handleConfirmCandidates(rec.productId)}
                          disabled={confirmingId === rec.productId}
                          className="px-3.5 py-1.5 rounded text-xs font-bold bg-emerald-700 hover:bg-emerald-600 text-white transition flex items-center gap-1.5 shadow-xs"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>
                            {confirmingId === rec.productId
                              ? 'EVALUATING CONFIRMATION EVIDENCE...'
                              : confirmationResults[rec.productId]
                              ? 'RE-EVALUATE CONFIRMATION EVIDENCE'
                              : 'RUN CANDIDATE CONFIRMATION'}
                          </span>
                        </button>

                        {confirmationResults[rec.productId] && (
                          <span className="text-[10px] text-emerald-300 font-mono font-semibold">
                            Evaluated: {new Date(confirmationResults[rec.productId].evidenceEvaluatedAt).toLocaleTimeString()}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Phase 7C.4 Candidate Confirmation Results Panel */}
                    {confirmationResults[rec.productId] && (() => {
                      const confSummary = confirmationResults[rec.productId];
                      const allConfs = confSummary.confirmations || [];

                      const filteredConfs = allConfs.filter((c) => {
                        if (confirmationFilter === 'ALL') return true;
                        if (confirmationFilter === 'UNCONFIRMED') return c.confirmationStatus === 'UNCONFIRMED';
                        if (confirmationFilter === 'SUPPORTED') return c.confirmationStatus === 'SUPPORTED';
                        if (confirmationFilter === 'REFERENCE_MATCHED') return c.confirmationStatus === 'REFERENCE_MATCHED';
                        if (confirmationFilter === 'CONFIRMATION_UNAVAILABLE') return c.confirmationStatus === 'CONFIRMATION_UNAVAILABLE';
                        return true;
                      });

                      return (
                        <div className="bg-slate-950 p-3.5 rounded-lg border border-emerald-900/60 space-y-3 font-mono">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-200 border border-emerald-700 uppercase">
                                PHASE 7C.4 — EVIDENCE-BASED CONFIRMATION
                              </span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-950 text-blue-300 border border-blue-800 uppercase">
                                MULTI-SOURCE EVIDENCE ENGINE
                              </span>
                            </div>

                            <span className="text-[11px] text-slate-300 font-bold">
                              EVALUATED: <strong className="text-emerald-400">{confSummary.totalCandidatesProcessed.toLocaleString()}</strong>
                            </span>
                          </div>

                          {/* Summary Statistics Panel */}
                          <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800 space-y-2">
                            <div className="text-emerald-400 font-bold text-xs uppercase tracking-wider flex items-center justify-between">
                              <span>SAR CANDIDATE CONFIRMATION SUMMARY</span>
                              <span className="text-[10px] text-slate-400 font-normal">Real Runtime Data</span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                              <div className="bg-slate-950 p-2 rounded border border-slate-800">
                                <span className="text-slate-400 block text-[9px]">TOTAL CANDIDATES</span>
                                <strong className="text-white text-sm">{confSummary.totalCandidatesProcessed.toLocaleString()}</strong>
                              </div>
                              <div className="bg-amber-950/40 p-2 rounded border border-amber-800/60">
                                <span className="text-amber-400 block text-[9px]">UNCONFIRMED</span>
                                <strong className="text-amber-200 text-sm">{confSummary.unconfirmedCount.toLocaleString()}</strong>
                              </div>
                              <div className="bg-blue-950/40 p-2 rounded border border-blue-800/60">
                                <span className="text-blue-400 block text-[9px]">SUPPORTED</span>
                                <strong className="text-blue-200 text-sm">{confSummary.supportedCount.toLocaleString()}</strong>
                              </div>
                              <div className="bg-emerald-950/40 p-2 rounded border border-emerald-800/60">
                                <span className="text-emerald-400 block text-[9px]">REFERENCE MATCHED</span>
                                <strong className="text-emerald-200 text-sm">{confSummary.referenceMatchedCount.toLocaleString()}</strong>
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2 text-[9px] text-slate-300 pt-1 border-t border-slate-800">
                              <div>Sea-Ice Context: <strong className="text-cyan-300">{confSummary.seaIceContextAvailableCount.toLocaleString()} available</strong></div>
                              <div>USNIC Matched: <strong className="text-emerald-400">{confSummary.usnicMatchedCount.toLocaleString()} matches</strong></div>
                              <div>Temporal Persistence: <strong className="text-purple-300">{confSummary.temporalEvidenceAvailableCount.toLocaleString()} evaluated</strong></div>
                            </div>

                            {/* Evidence Sources List */}
                            <div className="text-[9px] text-slate-400 flex flex-wrap items-center gap-3 pt-1 border-t border-slate-800">
                              <span>SOURCES USED:</span>
                              <span className="text-slate-200">• SAR: <strong className="text-white">{confSummary.dataSourcesUsed.sar}</strong></span>
                              <span className="text-slate-200">• Sea Ice: <strong className="text-cyan-300">{confSummary.dataSourcesUsed.seaIce}</strong></span>
                              <span className="text-slate-200">• USNIC: <strong className="text-emerald-300">{confSummary.dataSourcesUsed.usnic}</strong></span>
                              <span className="text-slate-200">• Temporal: <strong className="text-purple-300">{confSummary.dataSourcesUsed.temporal}</strong></span>
                            </div>
                          </div>

                          {/* Candidate Display Filter Controls */}
                          <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                            <div className="flex items-center gap-1.5 text-xs text-slate-300">
                              <Filter className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="font-bold">FILTER CANDIDATES:</span>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5">
                              {(['ALL', 'UNCONFIRMED', 'SUPPORTED', 'REFERENCE_MATCHED', 'CONFIRMATION_UNAVAILABLE'] as const).map((filterOpt) => {
                                const count =
                                  filterOpt === 'ALL'
                                    ? confSummary.totalCandidatesProcessed
                                    : filterOpt === 'UNCONFIRMED'
                                    ? confSummary.unconfirmedCount
                                    : filterOpt === 'SUPPORTED'
                                    ? confSummary.supportedCount
                                    : filterOpt === 'REFERENCE_MATCHED'
                                    ? confSummary.referenceMatchedCount
                                    : confSummary.confirmationUnavailableCount;

                                const isActive = confirmationFilter === filterOpt;
                                const label =
                                  filterOpt === 'REFERENCE_MATCHED'
                                    ? 'REFERENCE MATCHED'
                                    : filterOpt === 'CONFIRMATION_UNAVAILABLE'
                                    ? 'UNAVAILABLE'
                                    : filterOpt;

                                return (
                                  <button
                                    key={filterOpt}
                                    onClick={() => setConfirmationFilter(filterOpt)}
                                    className={`px-2.5 py-1 rounded text-[10px] font-bold transition flex items-center gap-1 border ${
                                      isActive
                                        ? 'bg-emerald-600 text-white border-emerald-400 shadow-xs'
                                        : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                                    }`}
                                  >
                                    <span>{label}</span>
                                    <span className="px-1 py-0.2 rounded bg-black/40 text-[9px]">({count})</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Filtered Candidate Cards List */}
                          {filteredConfs.length === 0 ? (
                            <div className="p-3 bg-slate-900 text-slate-400 rounded text-center text-xs">
                              No candidates match display filter '{confirmationFilter}'.
                            </div>
                          ) : (
                            <div className="space-y-2.5">
                              <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase font-bold">
                                <span>EVIDENCE-BASED CANDIDATES ({filteredConfs.length.toLocaleString()} SHOWN)</span>
                                <span className="text-emerald-400">Displaying Top 20 Candidates</span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {filteredConfs
                                  .slice()
                                  .sort((a, b) => b.evidenceIndex - a.evidenceIndex)
                                  .slice(0, 20)
                                  .map((conf) => {
                                    const statusColor =
                                      conf.confirmationStatus === 'REFERENCE_MATCHED'
                                        ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                                        : conf.confirmationStatus === 'SUPPORTED'
                                        ? 'bg-blue-950 text-blue-300 border-blue-700'
                                        : conf.confirmationStatus === 'CONFIRMATION_UNAVAILABLE'
                                        ? 'bg-slate-900 text-slate-400 border-slate-700'
                                        : 'bg-amber-950 text-amber-300 border-amber-800';

                                    const usnicMatch = conf.referenceMatch;
                                    const seaIce = conf.seaIceContext;
                                    const sarEv = conf.sarEvidence;

                                    return (
                                      <div
                                        key={conf.candidateId}
                                        className={`p-3 rounded-lg border space-y-2.5 ${
                                          selectedCandidateId === conf.candidateId
                                            ? 'bg-slate-900 border-emerald-500 ring-1 ring-emerald-500/50'
                                            : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                                        }`}
                                        onClick={() => setSelectedCandidateId(conf.candidateId)}
                                      >
                                        {/* Candidate Header */}
                                        <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5">
                                          <div className="flex items-center gap-1.5">
                                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                                            <span className="font-bold text-white text-xs">{conf.candidateId}</span>
                                          </div>

                                          <div className="flex items-center gap-1.5">
                                            <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase border ${statusColor}`}>
                                              {conf.confirmationStatus.replace('_', ' ')}
                                            </span>
                                            <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-purple-950 text-purple-300 border border-purple-800">
                                              EVIDENCE INDEX: {conf.evidenceIndex}/100
                                            </span>
                                          </div>
                                        </div>

                                        {/* 4-Part Evidence Breakdown */}
                                        <div className="space-y-1.5 text-[10px]">
                                          <div className="font-bold text-slate-300 uppercase text-[9px] tracking-wider border-b border-slate-800/60 pb-0.5">
                                            EVIDENCE EVALUATION BREAKDOWN
                                          </div>

                                          {/* SAR Evidence */}
                                          <div className="grid grid-cols-2 gap-x-2 text-[10px] text-slate-300">
                                            <div>Mean σ⁰: <strong className="text-emerald-400">{sarEv.meanSigma0Db !== undefined ? `${sarEv.meanSigma0Db.toFixed(2)} dB` : 'UNAVAILABLE'}</strong></div>
                                            <div>Contrast: <strong className="text-amber-300">{sarEv.contrastDb !== undefined ? `+${sarEv.contrastDb.toFixed(2)} dB` : 'UNAVAILABLE'}</strong></div>
                                            <div>Ranking Index: <strong className="text-white">{sarEv.candidateRankingIndex}/100</strong></div>
                                            <div>Area: <strong className="text-white">{sarEv.areaSquareMeters ? `${sarEv.areaSquareMeters.toLocaleString()} m²` : 'UNAVAILABLE'}</strong></div>
                                          </div>

                                          {/* Sea-Ice Context */}
                                          <div className="bg-slate-950/80 p-2 rounded border border-slate-800 space-y-0.5 text-[9.5px]">
                                            <div className="flex items-center justify-between">
                                              <span className="text-slate-400 font-bold">SEA-ICE CONTEXT:</span>
                                              <span className="text-cyan-300 font-bold">{seaIce.classification.replace(/_/g, ' ')}</span>
                                            </div>
                                            {seaIce.concentrationPercent !== null && (
                                              <div className="text-slate-300">Concentration: <strong>{seaIce.concentrationPercent}%</strong></div>
                                            )}
                                            <div className="text-slate-400 text-[9px]">{seaIce.description}</div>
                                          </div>

                                          {/* USNIC Reference Match */}
                                          <div className="bg-slate-950/80 p-2 rounded border border-slate-800 space-y-0.5 text-[9.5px]">
                                            <div className="flex items-center justify-between">
                                              <span className="text-slate-400 font-bold">USNIC REFERENCE MATCH:</span>
                                              <span className={usnicMatch.status === 'REFERENCE_MATCH_AVAILABLE' ? 'text-emerald-400 font-bold' : 'text-slate-400 font-bold'}>
                                                {usnicMatch.status === 'REFERENCE_MATCH_AVAILABLE' ? 'REFERENCE MATCH AVAILABLE' : usnicMatch.status.replace(/_/g, ' ')}
                                              </span>
                                            </div>
                                            {usnicMatch.status === 'REFERENCE_MATCH_AVAILABLE' && (
                                              <div className="text-slate-300 font-mono">
                                                Reference ID: <strong className="text-emerald-300">{usnicMatch.referenceId}</strong> | Separation: <strong className="text-amber-300">{usnicMatch.separationDistanceKm?.toFixed(2)} km</strong>
                                              </div>
                                            )}
                                          </div>

                                          {/* Temporal Evidence */}
                                          <div className="bg-slate-950/80 p-2 rounded border border-slate-800 space-y-0.5 text-[9.5px]">
                                            <div className="flex items-center justify-between">
                                              <span className="text-slate-400 font-bold">TEMPORAL PERSISTENCE:</span>
                                              <span className={conf.temporalEvidence.status === 'TEMPORAL_EVIDENCE_AVAILABLE' ? 'text-purple-300 font-bold' : 'text-slate-400 font-bold'}>
                                                {conf.temporalEvidence.status.replace(/_/g, ' ')}
                                              </span>
                                            </div>
                                            <div className="text-slate-400 text-[9px]">{conf.temporalEvidence.explanation}</div>
                                          </div>
                                        </div>

                                        {/* Provenance Traceability */}
                                        <div className="bg-slate-950 p-2 rounded border border-slate-800/80 text-[9px] space-y-0.5 font-mono text-slate-400">
                                          <div className="font-bold text-slate-300">SOURCE PROVENANCE TRACEABILITY:</div>
                                          <div>• SAR Source: <span className="text-slate-200">Sentinel-1 {rec.productId}</span></div>
                                          <div>• Sea Ice Source: <span className="text-cyan-300">{seaIce.sourceDataset}</span></div>
                                          <div>• USNIC Source: <span className="text-emerald-300">{usnicMatch.source}</span></div>
                                        </div>

                                        {/* Scientific Limitation Notice */}
                                        <div className="bg-amber-950/30 border border-amber-800/60 text-amber-300 p-1.5 rounded text-[9.5px] font-sans flex items-center gap-1.5">
                                          <Info className="w-3 h-3 text-amber-400 shrink-0" />
                                          <span><strong>Limitation:</strong> Candidate is not an independently confirmed iceberg. Evidence is contextual and supporting only.</span>
                                        </div>
                                      </div>
                                    );
                                  })}
                              </div>
                            </div>
                          )}

                          {/* Mandatory Phase 7C.4 Scientific Disclaimer */}
                          <div className="bg-emerald-950/40 border border-emerald-800 text-emerald-300 p-2.5 rounded text-[11px] font-mono flex flex-col gap-1">
                            <div className="flex items-center gap-1.5 font-bold text-emerald-200">
                              <Info className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <span>EVIDENCE EVALUATION BOUNDARY (PHASE 7C.4)</span>
                            </div>
                            <div className="text-[10px] text-emerald-200 font-sans space-y-0.5 pl-5">
                              <div>• Evaluates independent multi-source environmental and reference observations around Phase 7C.3 SAR candidates.</div>
                              <div>• Default status is <strong>UNCONFIRMED</strong> unless independent USNIC ground-truth reference match is detected.</div>
                              <div>• <strong>Sea-ice context is supporting evidence</strong>, not confirmation or exclusion of iceberg presence.</div>
                              <div>• <strong>Candidate Evidence Index is an engineering prioritization aid</strong> — NOT an iceberg probability.</div>
                              <div>• Trajectory prediction and route optimization remain unchanged in this phase.</div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* MANDATORY PHASE 7B/7C PROCESSING DISCLAIMER */}
                    <div className="bg-cyan-950/40 border border-cyan-800 text-cyan-300 p-2.5 rounded text-xs flex items-center justify-between font-mono font-bold">
                      <div className="flex items-center gap-2">
                        <Info className="w-4 h-4 text-cyan-400 shrink-0" />
                        <span>PROCESSING LEVEL: {confirmationResults[rec.productId] ? 'PHASE 7C.4 MULTI-SOURCE EVIDENCE EVALUATED' : processingResults[rec.productId] ? 'RADIOMETRIC SIGMA-0 CALIBRATED' : validationResults[rec.productId] ? 'STRUCTURE & MANIFEST PARSED' : 'RAW DOWNLOAD CACHED'}</span>
                      </div>
                      <span className="text-[10px] font-normal text-cyan-200 font-sans hidden sm:inline">
                        Product cached & preprocessed locally (Phase 7C.4 boundary).
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

