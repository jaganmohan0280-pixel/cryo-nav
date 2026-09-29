/**
 * CRYO NAV — Antarctic Sea-Ice, Iceberg Trajectory & Navigation Decision Support System
 * Core Data Architecture Types
 * Strictly separates: OBSERVATION, PREDICTION, DERIVED INFORMATION, DECISION
 */

export type ConnectionState = 'ONLINE' | 'LIMITED' | 'OFFLINE' | 'SYNCING';

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'CRITICAL';

export type ConfidenceFactorCategory =
  | 'DATA QUALITY'
  | 'DATA FRESHNESS'
  | 'TEMPORAL ALIGNMENT'
  | 'SPATIAL COVERAGE'
  | 'FORECAST HORIZON'
  | 'TRAJECTORY UNCERTAINTY'
  | 'SEA-ICE UNCERTAINTY'
  | 'WEATHER QUALITY'
  | 'OCEAN QUALITY'
  | 'MODEL LIMITATIONS';

export interface ConfidenceFactor {
  factorName: string;
  category: ConfidenceFactorCategory;
  status: 'GOOD' | 'ACCEPTABLE' | 'ELEVATED_RISK' | 'DEGRADED' | 'CRITICAL' | 'LIMITATION';
  contributionScore: number; // 0-100 heuristic score
  explanation: string;
  source: string;
  timestamp?: string;
}

export interface DecisionConfidenceResult {
  overallLevel: ConfidenceLevel;
  confidenceScore: number; // 0-100 heuristic (decision-support heuristic, NOT a statistically calibrated probability)
  factors: ConfidenceFactor[];
  primaryLimitingFactor: string;
  warnings: string[];
  limitations: string[];
  requiredActions: string[];
  recommendedVerificationActions: string[];
  routeDecisionAllowed: boolean;
  isRecommendationBlocked: boolean;
  timestamp: string;
  provenance: string;
}

export type FreshnessState = 'FRESH' | 'AGING' | 'STALE' | 'UNAVAILABLE';

export type MissionType = 'Research' | 'Logistics' | 'Resupply' | 'Emergency' | 'Transit';

export type RiskPreference = 'Conservative' | 'Balanced' | 'Aggressive';

export type FuelPreference = 'High Efficiency' | 'Standard' | 'Speed Priority';

export type SpeedPreference = 'Economy' | 'Standard' | 'Maximum Safe Speed';

export type IceClass =
  | 'Polar Class 1 (Year-round in all polar waters)'
  | 'Polar Class 3 (Year-round in second-year ice)'
  | 'Polar Class 5 (Year-round in medium first-year ice)'
  | 'Polar Class 7 (Summer/autumn in thin first-year ice)'
  | 'Non-Ice Strengthened';

export interface VesselProfile {
  id: string;
  name: string;
  type: string;
  iceClass: IceClass;
  cruisingSpeedKnots: number;
  maxSpeedKnots: number;
  fuelConsumptionTonsPerDay: number;
  draftMeters: number;
  maxSeaIceConcentrationPercent: number; // e.g. 70%
  minVisibilityNm: number;
  turningLimitationsDegPerMin: number;
  hullLengthMeters: number;
  beamMeters: number;
  displacementTons?: number;
}

export interface Waypoint {
  id: string;
  name: string;
  lat: number;
  lon: number;
  order: number;
  stopDurationHours?: number;
  type?: 'Station' | 'Oceanographic Cast' | 'Drift Buoy Deployment' | 'Fuel Depot' | 'Waypoint';
}

export interface ExclusionZone {
  id: string;
  name: string;
  polygon: [number, number][]; // [lat, lon]
  reason: 'Protected Marine Reserve' | 'Uncharted Shoal / Pinnacle' | 'Calving Shelf Danger Zone';
}

export interface MissionConfig {
  id: string;
  title: string;
  vesselId: string;
  startLocation: { name: string; lat: number; lon: number };
  destination: { name: string; lat: number; lon: number };
  missionType: MissionType;
  departureTime: string;
  priority: 'Normal' | 'High' | 'Critical';
  riskPreference: RiskPreference;
  fuelPreference: FuelPreference;
  speedPreference: SpeedPreference;
  maxSeaIceConcentration: number;
  researchWaypoints: Waypoint[];
  exclusionZones: ExclusionZone[];
  status: 'Draft' | 'Active' | 'Completed';
}

export type ForecastStatus = 'VALID' | 'DEGRADED' | 'UNAVAILABLE';

export interface TrajectoryPoint {
  horizon: '+6h' | '+12h' | '+24h' | '+48h' | '+72h';
  hours: number;
  lat: number;
  lon: number;
  uncertaintyRadiusNm: number;
  timestamp: string;
  confidence: number;
  driftSpeedKnots?: number;
  driftHeadingDeg?: number;
  oceanCurrentSpeedKnots?: number;
  oceanCurrentHeadingDeg?: number;
  windSpeedKnots?: number;
  windDirectionDeg?: number;
  forecastStatus?: ForecastStatus;
}

export interface IcebergForecastMetadata {
  name: string;
  version: string;
  type: string;
  label: string;
  validationStatus: string;
  windageCoefficient: number;
  windageCoefficientUsed: number;
  windageClassification: string;
  oceanForcingType: string;
  windForcingType: string;
  uncertaintyType: string;
  formula: string;
  disclaimer: string;
}

export interface IcebergForecastResult {
  forecastId: string;
  icebergId: string;
  icebergName: string;
  initialPosition: { lat: number; lon: number; timestamp: string };
  analysisTime: string;
  forecastHorizonHours: number;
  trajectoryPoints: TrajectoryPoint[];
  status: ForecastStatus;
  statusReason?: string;
  metadata: IcebergForecastMetadata;
  inputs: {
    icebergSource: DataProvenance | null;
    oceanSource: DataProvenance | null;
    weatherSource: DataProvenance | null;
    alignmentQuality: OverallQualityState;
    alignmentStatus: string;
  };
  warnings: string[];
}

export interface IcebergEncounter {
  distanceNm: number;
  timeHours: number;
  bearingDeg: number;
  encounterRisk: 'Low' | 'Moderate' | 'High' | 'Critical';
  routeId: string;
}

export interface IcebergDetection {
  id: string;
  name: string;
  lat: number;
  lon: number;
  sizeCategory: 'Small' | 'Medium' | 'Large' | 'Very Large' | 'Giant Calved Tabular';
  estimatedLengthMeters: number;
  estimatedWidthMeters: number;
  freeboardMeters: number;
  driftSpeedKnots: number;
  driftHeadingDeg: number;
  observationTime: string;
  processingTime: string;
  confidence: number; // 0-100
  uncertaintyRadiusNm: number;
  source: 'Sentinel-1 SAR' | 'CryoSat-2 SARIn' | 'RADARSAT Constellation' | 'Optical MODIS' | 'Shipboard Marine Radar';
  isSynthetic: boolean;
  historicalTrack: { lat: number; lon: number; timestamp: string }[];
  predictedTrajectory: TrajectoryPoint[];
  forecastResult?: IcebergForecastResult;
  closestApproach?: IcebergEncounter;
  provenance?: DataProvenance;
}

export type EnvironmentalDataMode = 'DEMO' | 'REAL';

export interface DataProvenance {
  source: string;
  provider: string;
  datasetId: string;
  granuleId?: string;
  license?: string;
  observationTime: string;
  publicationTime?: string;
  ingestionTime: string;
  validTime: string;
  forecastHorizonHours: number;
  bbox?: [number, number, number, number];
  crs?: string;
  spatialResolutionMeters?: number;
  temporalResolutionHours?: number;
  processingLevel?: string;
  qcFlag?: 'PASSED' | 'WARNING' | 'FAILED' | 'UNCHECKED';
  confidenceScore?: number;
  dataAgeHours?: number;
  freshnessState: FreshnessState;
  category: 'OBSERVED' | 'FORECAST' | 'REANALYSIS' | 'ANALYSIS' | 'SYNTHETIC';
  isSynthetic: boolean;
}

// Phase 3A — Unified Environmental Alignment & Data Quality Contract Types
export type SourceQualityState = 'VALID' | 'SUSPECT' | 'STALE' | 'MISSING' | 'OUT_OF_COVERAGE' | 'INVALID';

export type OverallQualityState = 'VALID' | 'PARTIAL' | 'DEGRADED' | 'UNAVAILABLE';

export type CoverageState = 'COMPLETE' | 'PARTIAL' | 'NONE' | 'UNKNOWN';

export type TemporalAlignmentStatus = 'ALIGNED' | 'WITHIN_TOLERANCE' | 'AGING' | 'STALE' | 'MISSING' | 'OUT_OF_WINDOW';

export interface SourceAlignmentSummary {
  sourceName: string;
  provider: string;
  datasetId: string;
  category: string;
  sourceTime: string | null;
  validTime: string | null;
  retrievalTime: string | null;
  timeDiffHours: number | null;
  temporalStatus: TemporalAlignmentStatus;
  quality: SourceQualityState;
  coverage: CoverageState;
  sourceResolution: string;
  sourceCrs: string;
  displayCrs: string;
  provenance: DataProvenance | null;
  isRealData: boolean;
  errorMessage?: string | null;
}

export interface EnvironmentalAlignmentResult {
  analysisTime: string;
  mode: EnvironmentalDataMode;
  region: {
    name: string;
    bbox: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
    displayCrs: string;
  };
  overallQuality: OverallQualityState;
  alignmentStatus: 'ALIGNED' | 'PARTIALLY ALIGNED' | 'DEGRADED' | 'UNAVAILABLE';
  sources: {
    seaIce: SourceAlignmentSummary;
    ocean: SourceAlignmentSummary;
    icebergs: SourceAlignmentSummary;
    weather: SourceAlignmentSummary;
  };
  warnings: string[];
  recordsCount: {
    seaIceCells: number;
    oceanCells: number;
    icebergs: number;
    weatherPoints: number;
  };
}

export interface SeaIceCell {
  id: string;
  lat: number;
  lon: number;
  concentrationPercent: number; // 0-100
  stage: 'Open Water' | 'Very Open Drift (10-30%)' | 'Open Drift (40-60%)' | 'Close Pack (70-80%)' | 'Very Close Pack (90-100%)' | 'Consolidated Fast Ice';
  thicknessMeters: number;
  ageDays?: number;
  driftVector: { speedKnots: number; headingDeg: number };
  predictedConcentration72h: number;
  confidence: number;
  uncertainty: number;
  timestamp: string;
  provenance?: DataProvenance;
  isRealData?: boolean;
}

export interface WeatherCondition {
  windSpeedKnots: number;
  windDirectionDeg: number;
  airTempC: number;
  seaTempC: number;
  waveHeightMeters: number;
  visibilityNm: number;
  barometricPressureHpa: number;
  timestamp: string;
  forecastHorizonHours: number;
  isLive?: boolean;
  dataSource?: string;
  stationName?: string;
  icingSeverity?: 'Light' | 'Moderate' | 'Severe';

  // Extended Real ECMWF Weather Forecast Fields (Phase 2E)
  lat?: number;
  lon?: number;
  windSpeedMetersPerSec?: number;
  windGustMetersPerSec?: number;
  windGustKnots?: number;
  visibilityMeters?: number;
  cloudCoverPercent?: number;
  precipitationMmPerHour?: number;
  modelName?: string;
  initRunTime?: string;
  validTime?: string;
  provenance?: DataProvenance;
  isRealData?: boolean;
}

export interface OceanCurrentCell {
  id?: string;
  lat: number;
  lon: number;
  currentSpeedKnots: number;
  currentHeadingDeg: number;
  depthMeters?: number;
  uMetersPerSec?: number;
  vMetersPerSec?: number;
  provenance?: DataProvenance;
  isRealData?: boolean;
}

export interface RouteAlternative {
  id: 'safest' | 'balanced' | 'fastest';
  routeId?: string;
  labels?: ('SAFEST' | 'BALANCED' | 'FASTEST')[];
  geometryHash?: string;
  name: string;
  type: 'SAFE' | 'BALANCED' | 'FAST';
  color: string;
  waypoints: [number, number][]; // [lat, lon]
  distanceNm: number;
  etaHours: number;
  fuelTons: number;
  riskIndex: number; // 0-100
  uncertaintyScore: number; // 0-100
  confidence: ConfidenceLevel;
  hazardsCount: number;
  hazardSummary: string[];
  assumptions: string[];
  constraintsSatisfied: boolean;
  isRecommended: boolean;
  recommendationRationale: string;
  resilienceScore: number; // % of perturbed scenarios where route maintains safety
  isRecommendationBlocked?: boolean;
  confidenceResult?: DecisionConfidenceResult;
  uncertaintyPenaltyApplied?: boolean;
  uncertaintyPenaltyReason?: string;
  costBreakdown: {
    distanceCost: number;
    fuelCost: number;
    timeCost: number;
    riskCost: number;
    uncertaintyCost: number;
    totalCost: number;
  };
}

export interface SatelliteProduct {
  id: string;
  name?: string;
  sensor: string;
  resolutionMeters?: number;
  acquisitionTime: string;
  processingTime: string;
  footprint: {
    centerLat: number;
    centerLon: number;
    radiusNm: number;
    description: string;
  };
  productType:
    | 'High-Res SAR Interferometric'
    | 'SAR Wide Swath Ice Drift'
    | 'Altimeter Sea Ice Freeboard'
    | 'Dual-Polarization Iceberg Profiling';
  sizeMb: number;
  availability: 'Available for Downlink' | 'Acquired' | 'Processing';
  decisionImpactScore: number; // 0-100
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  impactExplanation: string;
  expectedUncertaintyReductionPct: number;
  spatialOverlapWithRoutePct: number;
  freshness: FreshnessState;
}

export interface Alert {
  id: string;
  timestamp: string;
  severity: 'INFO' | 'WARNING' | 'HIGH' | 'CRITICAL';
  type:
    | 'ICEBERG_PROXIMITY'
    | 'ROUTE_DEVIATION'
    | 'DANGEROUS_SEA_ICE'
    | 'WEATHER_DETERIORATION'
    | 'CONFIDENCE_DROP'
    | 'STALE_DATA'
    | 'ROUTE_UNSAFE'
    | 'NEW_HAZARD'
    | 'MODEL_DISAGREEMENT';
  title: string;
  message: string;
  acknowledged: boolean;
}

export interface GPSTrackingState {
  currentLat: number;
  currentLon: number;
  headingDeg: number;
  speedKnots: number;
  routeProgressPct: number;
  actualTrack: [number, number][];
  distanceTraveledNm: number;
  distanceRemainingNm: number;
  crossTrackErrorNm: number;
  isSimulating: boolean;
  simulationSpeedMultiplier: number;
}

export interface SimulationScenario {
  icebergDriftOffsetPct: number; // e.g. -20, 0, +20
  seaIceSeverity: 'LOW' | 'NORMAL' | 'HIGH';
  windSeverity: 'LOW' | 'NORMAL' | 'HIGH';
  currentSeverity: 'LOW' | 'NORMAL' | 'HIGH';
  freshnessState: FreshnessState;
}

export interface ResearchReference {
  id: string;
  title: string;
  source: string;
  url: string;
  description: string;
  category: 'Satellite' | 'Ocean & Sea-Ice' | 'Atmospheric' | 'Polar Routing Research';
}

// Phase 5 — Counterfactual & Sensitivity Analysis Engine Types
export type CounterfactualParameter =
  | 'OCEAN_CURRENT'
  | 'WIND'
  | 'ICEBERG_DRIFT'
  | 'SEA_ICE_CONCENTRATION'
  | 'UNCERTAINTY';

export interface CounterfactualScenario {
  id: string;
  name: string;
  description: string;
  parameter: CounterfactualParameter;
  perturbationValue: number; // e.g. +20, -20, +10, -10, +25
  units: string; // e.g. '%', 'percentage points'
  direction: 'INCREASE' | 'DECREASE' | 'EXPAND';
  rationale: string;
  baselineReference: string;
}

export interface CounterfactualExplanation {
  whatChanged: string;
  whyItMatter: string;
  didRecommendationChange: string;
  newRecommendation: string;
}

export interface CounterfactualProvenance {
  baselineProvenance: string;
  scenarioModification: string;
}

export interface CounterfactualRouteResult {
  scenario: CounterfactualScenario;
  baselineRoute: RouteAlternative;
  scenarioRoute: RouteAlternative;
  baselineRecommendedType: 'SAFE' | 'BALANCED' | 'FAST';
  scenarioRecommendedType: 'SAFE' | 'BALANCED' | 'FAST';
  distanceChange: number; // nm
  etaChange: number; // hours
  fuelChange: number; // tons
  riskChange: number; // percentage point delta (e.g. +4.2%)
  confidenceChange: string; // e.g. "Baseline HIGH -> Scenario MEDIUM"
  baselineConfidence: ConfidenceLevel;
  scenarioConfidence: ConfidenceLevel;
  routeChanged: boolean;
  recommendationChanged: boolean;
  hazardsChanged: boolean;
  stability: RouteStability;
  explanation: CounterfactualExplanation;
  provenance: CounterfactualProvenance;
}

export type RouteStability = 'ROBUST' | 'SENSITIVE' | 'HIGHLY_SENSITIVE';

export interface SensitivityResult {
  parameter: CounterfactualParameter;
  scenarios: CounterfactualRouteResult[];
  routeStability: RouteStability;
  sensitivityLevel: RouteStability;
  dominantImpact: string;
  explanation: string;
}

export interface BatchSensitivitySummary {
  overallStability: RouteStability;
  dominantSensitivity: CounterfactualParameter | null;
  dominantExplanation: string;
  parameterResults: SensitivityResult[];
  testedScenariosCount: number;
  recommendationChangedCount: number;
  analysisTimestamp: string;
}

// Phase 6 — Decision-Impact Data Acquisition Engine Types
export type DataAcquisitionPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface DecisionImpactScore {
  totalScore: number; // 0-100
  decisionRelevance: number; // 0-100
  spatialRelevance: number; // 0-100
  temporalRelevance: number; // 0-100
  uncertaintyReductionPotential: number; // 0-100 (%)
  routeSensitivityRelevance: number; // 0-100
  hazardRelevance: number; // 0-100
  freshnessBenefit: number; // 0-100
  acquisitionCost: number; // 0-100 (penalty score)
  connectivityCost: number; // 0-100 (penalty score)
  explanation: string;
}

export interface DataAcquisitionRecommendation {
  productId: string;
  productName: string;
  sensorType: string;
  priority: DataAcquisitionPriority;
  score: number; // 0-100
  affectedDecision: string;
  dominantUncertainty: string;
  affectedRoute: string;
  affectedHazards: string[];
  expectedBenefit: string;
  acquisitionReason: string;
  provenance: string;
  status: string; // 'Available for Downlink' | 'Acquired' | 'Downlink Unavailable'
  footprint: {
    centerLat: number;
    centerLon: number;
    radiusNm: number;
    description: string;
  };
  sizeMb: number;
  estimatedAcquisitionTimeMinutes: number;
  isFiveMinuteEligible: boolean;
  scoreBreakdown: DecisionImpactScore;
  cachedTimestamp?: string;
  cachedAgeHours?: number;
  isCachedData?: boolean;
}

export interface FiveMinuteBudgetSummary {
  totalAllocatedMinutes: number;
  maxBudgetMinutes: number; // default 5.0
  prioritizedProducts: DataAcquisitionRecommendation[];
  remainingBudgetMinutes: number;
  explanation: string;
}

// Phase 7A — CDSE STAC Satellite Catalogue Types
export type CdseStacQueryStatus = 'IDLE' | 'QUERYING' | 'RESULTS' | 'NO_RESULTS' | 'UNAVAILABLE' | 'ERROR';

export interface SatelliteCatalogueItem {
  id: string;
  collection: string;
  geometry: {
    type: string;
    coordinates: any;
  };
  bbox: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
  acquisitionTime: string;
  platform: string;
  instrument: string;
  productType: string;
  processingLevel: string;
  orbitDirection?: 'ASCENDING' | 'DESCENDING' | 'UNKNOWN';
  relativeOrbit?: number;
  cloudCover?: number;
  source: 'Copernicus Data Space Ecosystem';
  catalogueUrl: string;
  assets?: Record<string, { href: string; title?: string; type?: string }>;
  retrievedAt: string;
  provenance: DataProvenance;
}

export interface CdseStacItem {
  id: string;
  type: string;
  stac_version: string;
  stac_extensions?: string[];
  collection?: string;
  geometry: {
    type: string;
    coordinates: any;
  };
  bbox: [number, number, number, number];
  properties: Record<string, any>;
  links: any[];
  assets: Record<string, { href: string; title?: string; type?: string }>;
}

export interface CdseStacSearchResult {
  success: boolean;
  mode: EnvironmentalDataMode;
  queryInfo: {
    bbox: [number, number, number, number];
    startTime: string;
    endTime: string;
    collection: string;
    limit: number;
  };
  items: SatelliteCatalogueItem[];
  count: number;
  retrievedAt: string;
  error?: string;
  reason?: 'NO_RESULTS' | 'SERVICE_UNAVAILABLE' | 'INVALID_QUERY' | 'RATE_LIMITED' | 'NETWORK_ERROR';
  provenance?: DataProvenance;
}

// Phase 7B — Satellite Product Acquisition & Local Caching Types
export type SatelliteAcquisitionStatus =
  | 'CATALOGUE_ITEM'
  | 'AVAILABLE_FOR_ACQUISITION'
  | 'ACQUISITION_REQUESTED'
  | 'DOWNLOADING'
  | 'DOWNLOADED'
  | 'VERIFIED'
  | 'CACHED'
  | 'ACQUISITION_FAILED'
  | 'UNAVAILABLE';

export interface SatelliteAcquisitionRecord {
  productId: string;
  source: string;
  collection: string;
  acquisitionTime: string;
  requestTime: string;
  startTime: string;
  completionTime?: string;
  status: SatelliteAcquisitionStatus;
  assetId: string;
  assetUrl: string;
  mediaType: string;
  expectedSize?: number;
  downloadedSize: number;
  checksum?: {
    algorithm: string;
    hash: string;
  };
  localCacheReference?: string;
  verificationStatus: 'VERIFIED' | 'FAILED' | 'UNVERIFIED' | 'SOURCE_CHECKSUM_UNAVAILABLE';
  error?: string;
  provenance: DataProvenance;
}

// Phase 7C.1 — Sentinel-1 Product Validation & SAFE Ingestion Types
export type Sentinel1ValidationStatus =
  | 'NOT_VALIDATED'
  | 'VALIDATING'
  | 'STRUCTURE_VALID'
  | 'METADATA_PARSED'
  | 'READY_FOR_SAR_PROCESSING'
  | 'VALIDATION_FAILED';

export type Sentinel1ContainerFormat = 'SAFE ZIP' | 'SAFE DIRECTORY' | 'UNRECOGNIZED_CONTAINER' | 'UNKNOWN';

export interface Sentinel1DiscoveredPaths {
  manifestPath?: string;
  measurementPresent: boolean;
  annotationPresent: boolean;
  previewPresent: boolean;
  supportPresent: boolean;
  entryCount: number;
}

export interface Sentinel1ProductValidationResult {
  productId: string;
  validationStatus: Sentinel1ValidationStatus;
  containerFormat: Sentinel1ContainerFormat;
  archiveValid: boolean;
  manifestFound: boolean;
  manifestValid: boolean;
  productStructureStatus: 'VALID' | 'PARTIAL' | 'INVALID' | 'UNCHECKED';
  metadataStatus: 'PARSED' | 'PARTIAL' | 'FAILED' | 'NOT_PRESENT';
  platform?: string;
  instrument?: string;
  productType?: string;
  mode?: string;
  polarization?: string[];
  processingLevel?: string;
  acquisitionStart?: string;
  acquisitionEnd?: string;
  relativeOrbit?: number;
  absoluteOrbit?: number;
  footprint?: string;
  discoveredPaths: Sentinel1DiscoveredPaths;
  warnings: string[];
  errors: string[];
  provenance: DataProvenance;
  validatedAt: string;
}

// Phase 7C.2 — Sentinel-1 SAR Preprocessing Pipeline Types
export type Sentinel1ProcessingStatus =
  | 'NOT_PROCESSED'
  | 'PROCESSING'
  | 'MEASUREMENT_EXTRACTED'
  | 'CALIBRATED'
  | 'PROCESSED'
  | 'PROCESSING_FAILED';

export type Sentinel1CalibrationStatus =
  | 'RADIOMETRIC_SIGMA0_DB'
  | 'RADIOMETRIC_SIGMA0_LUT'
  | 'CALIBRATION_UNAVAILABLE_IN_PRODUCT'
  | 'UNCALIBRATED_RAW_DN'
  | 'CALIBRATION_FAILED';

export interface Sentinel1RasterMetadata {
  width: number;
  height: number;
  bands: number;
  dataType: string;
  pixelRepresentation?: 'DN' | 'AMPLITUDE' | 'INTENSITY' | 'UNKNOWN';
  nodata: number | null;
  crs: string;
  sourceCrs: string;
  bounds?: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
  resolutionMeters?: number | null;
  pixelWidth?: number | null;
  pixelHeight?: number | null;
  resolutionUnits?: string;
  resolutionSource?: string;
  polarization: string;
  measurementFilename: string;
}

export interface Sentinel1RasterStatistics {
  statisticsDomain: 'SIGMA0_DB' | 'SIGMA0_LINEAR' | 'RAW_MEASUREMENT' | 'UNCALIBRATED_DN';
  min: number;
  max: number;
  mean: number;
  stdDev: number;
  validPixelCount: number;
  nodataPixelCount: number;
  invalidCalibrationCount: number;
  clippedPixelCount: number;
}

export interface Sentinel1ProcessingResult {
  productId: string;
  processingStatus: Sentinel1ProcessingStatus;
  calibrationStatus: Sentinel1CalibrationStatus;
  calibrationMethod: string;
  calibrationSource: string;
  physicalQuantity: 'SIGMA0' | 'BETA0' | 'GAMMA0' | 'RAW_DN';
  dBConversionStatus: 'APPLIED' | 'NOT_APPLIED' | 'NOT_APPLICABLE';
  rasterMetadata: Sentinel1RasterMetadata;
  rasterStatistics: Sentinel1RasterStatistics;
  outputPath: string;
  outputFormat: string;
  units: string;
  processingTimestamp: string;
  warnings: string[];
  errors: string[];
  provenance: DataProvenance;
}

// Phase 7C.3 / 7C.3-SQ — SAR Feature Extraction & Iceberg Candidate Generation Types
export interface SarIcebergCandidate {
  id: string;
  productId: string;
  acquisitionTime: string;
  polarization: string;
  latitude: number;
  longitude: number;
  rasterCoordinates: {
    minPixelX: number;
    maxPixelX: number;
    minLineY: number;
    maxLineY: number;
    centroidPixelX: number;
    centroidLineY: number;
  };
  geographicCoordinates: {
    centroidLat: number | null;
    centroidLon: number | null;
    minLat: number | null;
    maxLat: number | null;
    minLon: number | null;
    maxLon: number | null;
    isGeoreferenced: boolean;
    georeferenceMethod: string;
  };
  pixelCount: number;
  areaPixels: number;
  areaSquareMeters: number;
  estimatedAreaM2: number;
  widthMeters: number;
  estimatedWidthMeters: number;
  heightMeters: number;
  estimatedHeightMeters: number;
  aspectRatio: number;
  compactness: number;
  rectangularity: number;
  solidity: number;
  elongation: number;
  meanBackscatter: number;
  meanBackscatterDb: number;
  maxBackscatter: number;
  maxBackscatterDb: number;
  backgroundBackscatter: number;
  backgroundBackscatterDb: number;
  meanTargetSigma0Linear: number;
  meanBackgroundSigma0Linear: number;
  contrast: number;
  contrastDb: number;
  linearContrastRatio: number;
  backgroundStdDb: number;
  backgroundCoeffVariation: number;
  seaIceContext: string;
  candidateScore: number; // 0-100 baseline engineering score (Candidate Ranking Index)
  status: 'UNCONFIRMED SAR CANDIDATE' | 'UNCONFIRMED';
  confirmationStatus: 'ICEBERG CONFIRMATION: NOT YET PERFORMED';
  provenance: DataProvenance;
}

export type CandidateRejectionReason =
  | 'TOO_SMALL'
  | 'LOW_CONTRAST'
  | 'LOW_SHAPE_COHERENCE'
  | 'HIGH_BACKGROUND_VARIABILITY'
  | 'INVALID_GEOMETRY'
  | 'OUTSIDE_VALID_CONTEXT';

export interface SarFeatureAnalysisOptions {
  backgroundMethod?: 'LOCAL_MOVING_WINDOW' | 'PERCENTILE_ADAPTIVE' | 'ROBUST_MEDIAN';
  windowSizePixels?: number;
  thresholdMethod?: 'BACKGROUND_OFFSET' | 'ADAPTIVE_RATIO';
  thresholdOffsetDb?: number;
  backgroundPercentile?: number;
  minCandidateAreaM2?: number;
  maxCandidateAreaM2?: number;
  minCandidateAreaPixels?: number;
  maxCandidateAreaPixels?: number;
  minCandidatePixels?: number;
  morphologyKernelSize?: number;
  minLinearContrastRatio?: number;
  maxBackgroundStdDb?: number;
  minSolidity?: number;
  enableMorphology?: boolean;
}

export interface SarFeatureAnalysisResult {
  productId: string;
  analysisStatus: 'COMPLETED' | 'ANALYSIS_FAILED' | 'NO_REAL_PROCESSED_RASTER' | 'DECODING_FAILED';
  lifecycleStatus: 'UNCONFIRMED_CANDIDATES_GENERATED';
  rawComponentsCount: number;
  filteredCandidatesCount: number;
  candidatesCount: number;
  candidates: SarIcebergCandidate[];
  rejectionSummary: Record<CandidateRejectionReason, number>;
  analysisParameters: {
    backgroundMethod: string;
    windowSizePixels: number;
    thresholdMethod: string;
    thresholdOffsetDb: number;
    backgroundPercentile?: number;
    minCandidateAreaM2?: number;
    maxCandidateAreaM2?: number;
    minCandidateAreaPixels: number;
    maxCandidateAreaPixels: number;
    minCandidatePixels: number;
    morphologyKernelSize: number;
    minLinearContrastRatio: number;
    maxBackgroundStdDb: number;
    minSolidity: number;
    parameterType: 'BASELINE ENGINEERING PARAMETERS';
  };
  processedRasterReference: {
    calibrationStatus: string;
    physicalQuantity: string;
    statisticsDomain: string;
    sourceCrs: string;
    pixelWidthMeters: number | null;
    pixelHeightMeters: number | null;
  };
  analysisTimestamp: string;
  analyzedAt: string;
  warnings: string[];
  errors: string[];
  provenance: DataProvenance;
}

// ============================================================================
// PHASE 7C.4 — SAR CANDIDATE CONFIRMATION & MULTI-SOURCE EVIDENCE TYPES
// ============================================================================

export type CandidateConfirmationStatus =
  | 'UNCONFIRMED'
  | 'SUPPORTED'
  | 'REFERENCE_MATCHED'
  | 'CONFIRMATION_UNAVAILABLE';

export type SeaIceContextClassification =
  | 'OPEN_WATER_CONTEXT'
  | 'SEA_ICE_CONTEXT'
  | 'ICE_EDGE_CONTEXT'
  | 'MIXED_CONTEXT'
  | 'UNAVAILABLE';

export type UsnicReferenceStatus =
  | 'REFERENCE_MATCH_AVAILABLE'
  | 'NO_REFERENCE_MATCH'
  | 'REFERENCE_DATA_UNAVAILABLE';

export interface CandidateUsnicReferenceMatch {
  status: UsnicReferenceStatus;
  referenceId: string | null;
  referenceCoordinates: { lat: number; lon: number } | null;
  separationDistanceKm: number | null;
  separationDistanceNm: number | null;
  observationTime?: string | null;
  observationTimestamp?: string | null;
  source: 'USNIC Antarctic Iceberg Database' | 'UNAVAILABLE';
  provenance?: DataProvenance;
}

export type TemporalEvidenceStatus =
  | 'TEMPORAL_EVIDENCE_AVAILABLE'
  | 'TEMPORAL_EVIDENCE_UNAVAILABLE';

export interface CandidateTemporalEvidence {
  status: TemporalEvidenceStatus;
  acquisitionsCount: number;
  matchingAcquisitionCount?: number;
  acquisitionIds: string[];
  persistenceScore: number | null;
  explanation: string;
  rationale?: string;
  provenance?: DataProvenance;
}

export interface CandidateEvidenceItem {
  evidenceCategory: 'SAR_FEATURE' | 'SEA_ICE_CONTEXT' | 'USNIC_REFERENCE' | 'TEMPORAL_PERSISTENCE';
  status: 'AVAILABLE' | 'UNAVAILABLE' | 'MATCH' | 'NO_MATCH';
  title: string;
  detail: string;
  provenanceSource: string;
  timestamp: string | null;
}

export interface CandidateConfirmation {
  candidateId: string;
  sourceProductId: string;
  confirmationStatus: CandidateConfirmationStatus;
  evidenceItems: CandidateEvidenceItem[];
  evidenceIndex: number; // 0-100 prioritization aid (NOT probability!)
  sarEvidence: {
    meanSigma0Db: number;
    maxSigma0Db: number;
    contrastDb: number;
    linearContrastRatio: number;
    areaSquareMeters: number;
    solidity: number;
    candidateRankingIndex: number;
    provenance?: DataProvenance;
  };
  seaIceContext: {
    classification: SeaIceContextClassification;
    concentrationPercent: number | null;
    seaIceConcentrationPct?: number | null;
    description: string;
    rationale?: string;
    sourceDataset: string;
    provenance?: DataProvenance;
  };
  referenceMatch: CandidateUsnicReferenceMatch;
  temporalEvidence: CandidateTemporalEvidence;
  disclaimer: 'Candidate is an evidence-assessed target. Independent ground-truth confirmation has not been performed.';
  limitations: string[];
  evaluatedAt: string;
  provenance: DataProvenance;
}

export interface CandidateConfirmationOptions {
  usnicMatchingRadiusKm?: number;
  seaIceSearchRadiusKm?: number;
}

export interface SarConfirmationSummary {
  productId: string;
  totalCandidatesProcessed: number;
  unconfirmedCount: number;
  supportedCount: number;
  referenceMatchedCount: number;
  confirmationUnavailableCount: number;
  seaIceContextAvailableCount: number;
  usnicMatchedCount: number;
  temporalEvidenceAvailableCount: number;
  evidenceEvaluatedAt: string;
  confirmations: CandidateConfirmation[];
  dataSourcesUsed: {
    sar: string;
    seaIce: string;
    usnic: string;
    temporal: string;
  };
  provenance: DataProvenance;
}

// ============================================================================
// PHASE 7C.4-UX REDESIGN — AREA-CENTRIC SAR ANALYSIS TYPES
// ============================================================================

export interface SelectedAnalysisArea {
  id: string;
  type: 'BOUNDING_BOX' | 'RADIUS_POINT' | 'CORRIDOR_AHEAD';
  bounds: {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
  };
  centerLat?: number;
  centerLon?: number;
  radiusKm?: number;
  corridorDistanceKm?: number;
  name?: string;
  selectedAt: string;
}

export interface AreaSatelliteCoverageResult {
  isAvailable: boolean;
  statusText: 'AVAILABLE' | 'NOT AVAILABLE';
  productId?: string;
  acquisitionTime?: string;
  source?: string;
  intersectionPct?: number;
  matchingProductsCount: number;
  availableProductIds: string[];
}

export interface AreaConditionReport {
  areaId: string;
  selectedArea: SelectedAnalysisArea;
  satelliteCoverage: AreaSatelliteCoverageResult;
  sarAnalysis: {
    isAvailable: boolean;
    statusText: string;
    totalCandidatesInArea: number;
    highestRankingIndex: number;
    candidateDensityPer100Km2: number;
    seaIceContext: SeaIceContextClassification;
    usnicReferenceMatchStatus: UsnicReferenceStatus;
    matchedReferenceId?: string | null;
    matchedSeparationKm?: number | null;
    temporalEvidenceStatus: TemporalEvidenceStatus;
    confirmationStatus: CandidateConfirmationStatus;
    explanation: string;
  };
  environmentalContext: {
    seaIceStatus: 'AVAILABLE' | 'UNAVAILABLE';
    seaIceClassification: SeaIceContextClassification;
    seaIceConcentrationPct?: number | null;
    weatherStatus: 'AVAILABLE' | 'UNAVAILABLE';
    windSpeedKnots?: number;
    windDirectionDeg?: number;
    airTempC?: number;
    oceanStatus: 'AVAILABLE' | 'UNAVAILABLE';
    currentSpeedKnots?: number;
    currentHeadingDeg?: number;
  };
  dataFreshness: {
    overallFreshness: 'FRESH' | 'AGING' | 'STALE';
    latestTimestamp: string;
    dataAgeHours: number;
  };
  overallDataConfidence: 'HIGH' | 'MEDIUM' | 'LOW';
  decisionImpactIntegration?: {
    isConnected: boolean;
    priority?: string;
    score?: number;
    explanation?: string;
  };
  disclaimer: string;
  generatedAt: string;
}





