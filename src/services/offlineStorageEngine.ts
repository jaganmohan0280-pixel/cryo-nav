/**
 * CRYO NAV — Offline-First Data & Navigation State Storage Engine
 * Phase 9A — Persistent Local Storage Layer (IndexedDB / Hybrid Engine)
 *
 * Core Responsibility:
 * Preserves verified navigation state, environmental telemetry, active route corridors,
 * and hazard encounter intelligence locally in browser storage (IndexedDB).
 *
 * Architectural & Scientific Rules:
 * 1. SYNC ONCE -> STORE LOCALLY -> OPERATE OFFLINE.
 * 2. NO SYNTHETIC FALLBACK: Storage layer NEVER fabricates data when empty.
 *    If no verified data has been cached, storage reports STORAGE_EMPTY.
 * 3. PROVENANCE & FRESHNESS PRESERVATION: Preserves dataset dataMode ('REAL' | 'SIMULATED' | 'HYBRID'),
 *    source provenance, acquisition timestamps, and freshness metadata. Never converts SIMULATED to REAL.
 * 4. STRICT ISOLATION: Data storage layer ONLY. Does NOT calculate risk, confidence, routing, or drift.
 * 5. FAILURE HANDLING: IndexedDB failures return structured error status without crashing the app.
 */

import {
  SeaIceCell,
  OceanCurrentCell,
  WeatherCondition,
  IcebergDetection,
  RouteAlternative,
  EnvironmentalAlignmentResult,
} from '../types';
import { VoyageState, DataMode } from './voyageStateEngine';
import { HazardEvaluationResult } from './hazardEncounterEngine';

export type StorageOperationStatus =
  | 'STORAGE_AVAILABLE'
  | 'STORAGE_EMPTY'
  | 'STORAGE_READ_ERROR'
  | 'STORAGE_WRITE_ERROR'
  | 'STORAGE_UNAVAILABLE';

export interface StorageRecordMetadata {
  recordId: string;
  sourceName: string;
  sourceType: string;
  timestampAcquired: string;
  timestampCached: string;
  validFrom?: string | null;
  validTo?: string | null;
  freshnessAgeHours: number;
  dataMode: DataMode;
  provenance: string;
  geographicCoverage?: string | null;
  checksum?: string | null;
  recordVersion: string;
  isSynthetic: boolean;
}

export interface StorageResult<T> {
  status: StorageOperationStatus;
  data: T | null;
  message?: string;
  error?: string;
  metadata?: StorageRecordMetadata | null;
}

export interface CachedEnvironmentalData {
  seaIceCells: SeaIceCell[];
  oceanCurrentCells: OceanCurrentCell[];
  weather: WeatherCondition | null;
  icebergs: IcebergDetection[];
  alignment?: EnvironmentalAlignmentResult | null;
}

export interface OfflineNavigationSnapshot {
  voyageState: VoyageState | null;
  environmentalState: CachedEnvironmentalData | null;
  hazards: HazardEvaluationResult | null;
  routes: RouteAlternative[];
  syncTimestamp: string | null;
  dataMode: DataMode;
  provenanceSummary: string;
  metadata: Record<string, StorageRecordMetadata>;
  storageStatus: StorageOperationStatus;
  isOfflineAvailable: boolean;
}

const DB_NAME = 'cryo-nav-offline';
const DB_VERSION = 1;

const STORES = {
  VOYAGE_STATE: 'voyageState',
  ENVIRONMENTAL_STATE: 'environmentalState',
  HAZARDS: 'hazards',
  ROUTES: 'routes',
  METADATA: 'metadata',
} as const;

// In-Memory Storage Driver Fallback (Used if IndexedDB is not supported or in CLI Node runner)
class InMemoryStorageDriver {
  private stores: Record<string, Map<string, any>> = {
    voyageState: new Map(),
    environmentalState: new Map(),
    hazards: new Map(),
    routes: new Map(),
    metadata: new Map(),
  };

  public get(storeName: string, key: string): any {
    return this.stores[storeName]?.get(key) || null;
  }

  public put(storeName: string, key: string, value: any): void {
    if (!this.stores[storeName]) this.stores[storeName] = new Map();
    this.stores[storeName].set(key, value);
  }

  public getAll(storeName: string): any[] {
    return Array.from(this.stores[storeName]?.values() || []);
  }

  public delete(storeName: string, key: string): void {
    this.stores[storeName]?.delete(key);
  }

  public clear(): void {
    Object.keys(this.stores).forEach((k) => this.stores[k].clear());
  }
}

class OfflineStorageEngine {
  private db: IDBDatabase | null = null;
  private inMemoryFallback: InMemoryStorageDriver = new InMemoryStorageDriver();
  private useInMemoryOnly: boolean = false;
  private isInitialized: boolean = false;
  private simulateError: StorageOperationStatus | null = null;

  /**
   * For testing & failure verification: inject simulated storage error
   */
  public setSimulatedError(error: StorageOperationStatus | null): void {
    this.simulateError = error;
  }

  /**
   * Initializes IndexedDB database and object stores safely
   */
  public async initializeOfflineStorage(): Promise<StorageResult<boolean>> {
    if (this.simulateError) {
      return { status: this.simulateError, data: false, message: 'Simulated storage failure' };
    }

    if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
      this.useInMemoryOnly = true;
      this.isInitialized = true;
      return {
        status: 'STORAGE_AVAILABLE',
        data: true,
        message: 'Initialized in-memory offline storage driver (Node/CLI environment).',
      };
    }

    return new Promise((resolve) => {
      try {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
          const db = (event.target as IDBOpenDBRequest).result;
          Object.values(STORES).forEach((storeName) => {
            if (!db.objectStoreNames.contains(storeName)) {
              db.createObjectStore(storeName, { keyPath: 'id' });
            }
          });
        };

        request.onsuccess = (event) => {
          this.db = (event.target as IDBOpenDBRequest).result;
          this.isInitialized = true;
          resolve({ status: 'STORAGE_AVAILABLE', data: true, message: 'IndexedDB initialized successfully.' });
        };

        request.onerror = (event) => {
          this.useInMemoryOnly = true;
          this.isInitialized = true;
          resolve({
            status: 'STORAGE_READ_ERROR',
            data: true,
            message: 'IndexedDB access failed; falling back to memory store driver.',
            error: String((event.target as IDBOpenDBRequest).error),
          });
        };
      } catch (err: any) {
        this.useInMemoryOnly = true;
        this.isInitialized = true;
        resolve({
          status: 'STORAGE_UNAVAILABLE',
          data: true,
          message: 'IndexedDB unavailable; in-memory fallback active.',
          error: err.message,
        });
      }
    });
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initializeOfflineStorage();
    }
  }

  /**
   * Helper metadata builder
   */
  private buildMetadata(
    recordId: string,
    sourceName: string,
    sourceType: string,
    dataMode: DataMode,
    provenance: string,
    override?: Partial<StorageRecordMetadata>
  ): StorageRecordMetadata {
    const now = new Date().toISOString();
    return {
      recordId,
      sourceName,
      sourceType,
      timestampAcquired: override?.timestampAcquired || now,
      timestampCached: now,
      validFrom: override?.validFrom || now,
      validTo: override?.validTo || null,
      freshnessAgeHours: override?.freshnessAgeHours ?? 0,
      dataMode,
      provenance,
      geographicCoverage: override?.geographicCoverage || 'Antarctic Sector',
      checksum: override?.checksum || null,
      recordVersion: '1.0.0',
      isSynthetic: dataMode === 'SIMULATED',
      ...override,
    };
  }

  // Generic Put operation
  private async putRecord(storeName: string, key: string, payload: any): Promise<boolean> {
    if (this.simulateError === 'STORAGE_WRITE_ERROR') {
      throw new Error('Simulated storage write error');
    }

    if (this.useInMemoryOnly || !this.db) {
      this.inMemoryFallback.put(storeName, key, { id: key, payload });
      return true;
    }

    return new Promise((resolve, reject) => {
      try {
        const tx = this.db!.transaction([storeName], 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.put({ id: key, payload });

        req.onsuccess = () => resolve(true);
        req.onerror = (e) => reject((e.target as IDBRequest).error);
      } catch (err) {
        reject(err);
      }
    });
  }

  // Generic Get operation
  private async getRecord(storeName: string, key: string): Promise<any | null> {
    if (this.simulateError === 'STORAGE_READ_ERROR') {
      throw new Error('Simulated storage read error');
    }

    if (this.useInMemoryOnly || !this.db) {
      const item = this.inMemoryFallback.get(storeName, key);
      return item ? item.payload : null;
    }

    return new Promise((resolve, reject) => {
      try {
        const tx = this.db!.transaction([storeName], 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.get(key);

        req.onsuccess = () => {
          resolve(req.result ? req.result.payload : null);
        };
        req.onerror = (e) => reject((e.target as IDBRequest).error);
      } catch (err) {
        reject(err);
      }
    });
  }

  // Generic GetAll operation
  private async getAllRecords(storeName: string): Promise<any[]> {
    if (this.simulateError === 'STORAGE_READ_ERROR') {
      throw new Error('Simulated storage read error');
    }

    if (this.useInMemoryOnly || !this.db) {
      const items = this.inMemoryFallback.getAll(storeName);
      return items.map((i) => i.payload);
    }

    return new Promise((resolve, reject) => {
      try {
        const tx = this.db!.transaction([storeName], 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.getAll();

        req.onsuccess = () => {
          resolve(req.result ? req.result.map((r: any) => r.payload) : []);
        };
        req.onerror = (e) => reject((e.target as IDBRequest).error);
      } catch (err) {
        reject(err);
      }
    });
  }

  // Generic Clear operation
  private async clearStore(storeName: string): Promise<boolean> {
    if (this.useInMemoryOnly || !this.db) {
      this.inMemoryFallback.clear();
      return true;
    }

    return new Promise((resolve, reject) => {
      try {
        const tx = this.db!.transaction([storeName], 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.clear();

        req.onsuccess = () => resolve(true);
        req.onerror = (e) => reject((e.target as IDBRequest).error);
      } catch (err) {
        reject(err);
      }
    });
  }

  // --------------------------------------------------------------------------
  // PUBLIC API IMPLEMENTATION
  // --------------------------------------------------------------------------

  public async saveVoyageState(
    state: VoyageState,
    metaOverride?: Partial<StorageRecordMetadata>
  ): Promise<StorageResult<VoyageState>> {
    await this.ensureInitialized();
    try {
      const meta = this.buildMetadata(
        'voyageState',
        'Voyage State Engine',
        'Navigation Telemetry',
        state.dataMode || 'REAL',
        'CRYO NAV Phase 8A Voyage Monitoring',
        metaOverride
      );

      await this.putRecord(STORES.VOYAGE_STATE, 'latest', state);
      await this.putRecord(STORES.METADATA, 'voyageState', meta);

      return {
        status: 'STORAGE_AVAILABLE',
        data: state,
        metadata: meta,
        message: 'Voyage state successfully persisted to offline storage.',
      };
    } catch (err: any) {
      return {
        status: 'STORAGE_WRITE_ERROR',
        data: null,
        message: 'Failed to write voyage state to offline storage.',
        error: err.message,
      };
    }
  }

  public async getVoyageState(): Promise<StorageResult<VoyageState>> {
    await this.ensureInitialized();
    try {
      const state = await this.getRecord(STORES.VOYAGE_STATE, 'latest');
      const meta = await this.getRecord(STORES.METADATA, 'voyageState');

      if (!state) {
        return {
          status: 'STORAGE_EMPTY',
          data: null,
          message: 'No cached voyage state found in storage.',
        };
      }

      return {
        status: 'STORAGE_AVAILABLE',
        data: state,
        metadata: meta,
      };
    } catch (err: any) {
      return {
        status: 'STORAGE_READ_ERROR',
        data: null,
        message: 'Error reading voyage state from storage.',
        error: err.message,
      };
    }
  }

  public async saveEnvironmentalState(
    envData: CachedEnvironmentalData,
    metaOverride?: Partial<StorageRecordMetadata>
  ): Promise<StorageResult<CachedEnvironmentalData>> {
    await this.ensureInitialized();
    try {
      const isReal =
        envData.seaIceCells?.some((c) => c.isRealData) ||
        envData.icebergs?.some((b) => !b.isSynthetic) ||
        envData.weather?.isRealData ||
        false;

      const dataMode: DataMode = isReal ? 'REAL' : 'SIMULATED';

      const meta = this.buildMetadata(
        'environmentalState',
        'Copernicus Marine / ECMWF / USNIC Unified Telemetry',
        'Environmental Observation & Model Grid',
        dataMode,
        'CRYO NAV Phase 3A Environmental Alignment',
        metaOverride
      );

      await this.putRecord(STORES.ENVIRONMENTAL_STATE, 'latest', envData);
      await this.putRecord(STORES.METADATA, 'environmentalState', meta);

      return {
        status: 'STORAGE_AVAILABLE',
        data: envData,
        metadata: meta,
        message: 'Environmental telemetry state successfully saved to offline storage.',
      };
    } catch (err: any) {
      return {
        status: 'STORAGE_WRITE_ERROR',
        data: null,
        message: 'Failed to write environmental state to offline storage.',
        error: err.message,
      };
    }
  }

  public async getEnvironmentalState(): Promise<StorageResult<CachedEnvironmentalData>> {
    await this.ensureInitialized();
    try {
      const data = await this.getRecord(STORES.ENVIRONMENTAL_STATE, 'latest');
      const meta = await this.getRecord(STORES.METADATA, 'environmentalState');

      if (!data) {
        return {
          status: 'STORAGE_EMPTY',
          data: null,
          message: 'No cached environmental state found in storage.',
        };
      }

      return {
        status: 'STORAGE_AVAILABLE',
        data,
        metadata: meta,
      };
    } catch (err: any) {
      return {
        status: 'STORAGE_READ_ERROR',
        data: null,
        message: 'Error reading environmental state from storage.',
        error: err.message,
      };
    }
  }

  public async saveHazards(
    hazardResult: HazardEvaluationResult,
    metaOverride?: Partial<StorageRecordMetadata>
  ): Promise<StorageResult<HazardEvaluationResult>> {
    await this.ensureInitialized();
    try {
      const isReal = hazardResult.encounters?.some((e) => e.isRealData) ?? false;
      const dataMode: DataMode = isReal ? 'REAL' : 'SIMULATED';

      const meta = this.buildMetadata(
        'hazards',
        'CRYO NAV Hazard Encounter Intelligence',
        'Hazard Evaluation Result',
        dataMode,
        hazardResult.provenance || 'CRYO NAV Phase 8B Kinematic Hazard Encounter Engine',
        metaOverride
      );

      await this.putRecord(STORES.HAZARDS, 'latest', hazardResult);
      await this.putRecord(STORES.METADATA, 'hazards', meta);

      return {
        status: 'STORAGE_AVAILABLE',
        data: hazardResult,
        metadata: meta,
        message: 'Hazard encounter intelligence saved to offline storage.',
      };
    } catch (err: any) {
      return {
        status: 'STORAGE_WRITE_ERROR',
        data: null,
        message: 'Failed to write hazards to offline storage.',
        error: err.message,
      };
    }
  }

  public async getHazards(): Promise<StorageResult<HazardEvaluationResult>> {
    await this.ensureInitialized();
    try {
      const data = await this.getRecord(STORES.HAZARDS, 'latest');
      const meta = await this.getRecord(STORES.METADATA, 'hazards');

      if (!data) {
        return {
          status: 'STORAGE_EMPTY',
          data: null,
          message: 'No cached hazard intelligence found in storage.',
        };
      }

      return {
        status: 'STORAGE_AVAILABLE',
        data,
        metadata: meta,
      };
    } catch (err: any) {
      return {
        status: 'STORAGE_READ_ERROR',
        data: null,
        message: 'Error reading hazards from storage.',
        error: err.message,
      };
    }
  }

  public async saveRoute(
    route: RouteAlternative,
    metaOverride?: Partial<StorageRecordMetadata>
  ): Promise<StorageResult<RouteAlternative>> {
    await this.ensureInitialized();
    try {
      const meta = this.buildMetadata(
        `route-${route.id}`,
        'CRYO NAV Routing Engine',
        'Route Alternative',
        'REAL',
        'CRYO NAV A* / Geodesic Routing Engine',
        metaOverride
      );

      await this.putRecord(STORES.ROUTES, route.id, route);
      await this.putRecord(STORES.METADATA, `route-${route.id}`, meta);

      return {
        status: 'STORAGE_AVAILABLE',
        data: route,
        metadata: meta,
      };
    } catch (err: any) {
      return {
        status: 'STORAGE_WRITE_ERROR',
        data: null,
        message: `Failed to write route ${route.id} to offline storage.`,
        error: err.message,
      };
    }
  }

  public async saveRoutes(
    routes: RouteAlternative[],
    metaOverride?: Partial<StorageRecordMetadata>
  ): Promise<StorageResult<RouteAlternative[]>> {
    await this.ensureInitialized();
    try {
      const meta = this.buildMetadata(
        'routes',
        'CRYO NAV Routing Engine',
        'Route Alternatives Collection',
        'REAL',
        'CRYO NAV A* / Geodesic Routing Engine',
        metaOverride
      );

      for (const r of routes) {
        await this.putRecord(STORES.ROUTES, r.id, r);
      }
      await this.putRecord(STORES.METADATA, 'routes', meta);

      return {
        status: 'STORAGE_AVAILABLE',
        data: routes,
        metadata: meta,
        message: 'Route alternatives batch saved to offline storage.',
      };
    } catch (err: any) {
      return {
        status: 'STORAGE_WRITE_ERROR',
        data: null,
        message: 'Failed to write routes to offline storage.',
        error: err.message,
      };
    }
  }

  public async getRoute(routeId?: string): Promise<StorageResult<RouteAlternative>> {
    await this.ensureInitialized();
    try {
      const routes = await this.getAllRecords(STORES.ROUTES);
      if (routes.length === 0) {
        return {
          status: 'STORAGE_EMPTY',
          data: null,
          message: 'No route alternatives cached in storage.',
        };
      }

      const target = routeId ? routes.find((r) => r.id === routeId) || null : routes[0];
      if (!target) {
        return {
          status: 'STORAGE_EMPTY',
          data: null,
          message: `Route ID ${routeId} not found in offline storage.`,
        };
      }

      const meta = await this.getRecord(STORES.METADATA, `route-${target.id}`);

      return {
        status: 'STORAGE_AVAILABLE',
        data: target,
        metadata: meta,
      };
    } catch (err: any) {
      return {
        status: 'STORAGE_READ_ERROR',
        data: null,
        message: 'Error reading route from storage.',
        error: err.message,
      };
    }
  }

  public async getRoutes(): Promise<StorageResult<RouteAlternative[]>> {
    await this.ensureInitialized();
    try {
      const routes = await this.getAllRecords(STORES.ROUTES);
      const meta = await this.getRecord(STORES.METADATA, 'routes');

      if (routes.length === 0) {
        return {
          status: 'STORAGE_EMPTY',
          data: [],
          message: 'No cached route alternatives in storage.',
        };
      }

      return {
        status: 'STORAGE_AVAILABLE',
        data: routes,
        metadata: meta,
      };
    } catch (err: any) {
      return {
        status: 'STORAGE_READ_ERROR',
        data: [],
        message: 'Error reading routes list from storage.',
        error: err.message,
      };
    }
  }

  public async getStorageMetadata(
    recordId?: string
  ): Promise<StorageResult<StorageRecordMetadata | Record<string, StorageRecordMetadata>>> {
    await this.ensureInitialized();
    try {
      if (recordId) {
        const meta = await this.getRecord(STORES.METADATA, recordId);
        if (!meta) return { status: 'STORAGE_EMPTY', data: null };
        return { status: 'STORAGE_AVAILABLE', data: meta };
      }

      const allMetaRecords = await this.getAllRecords(STORES.METADATA);
      if (allMetaRecords.length === 0) return { status: 'STORAGE_EMPTY', data: {} };

      const metaMap: Record<string, StorageRecordMetadata> = {};
      allMetaRecords.forEach((m: StorageRecordMetadata) => {
        metaMap[m.recordId] = m;
      });

      return { status: 'STORAGE_AVAILABLE', data: metaMap };
    } catch (err: any) {
      return { status: 'STORAGE_READ_ERROR', data: null, error: err.message };
    }
  }

  public async getLastSyncTime(): Promise<string | null> {
    await this.ensureInitialized();
    const metaResult = await this.getStorageMetadata();
    if (metaResult.status !== 'STORAGE_AVAILABLE' || !metaResult.data) return null;

    const map = metaResult.data as Record<string, StorageRecordMetadata>;
    let latestMs = 0;
    let latestTimestamp: string | null = null;

    Object.values(map).forEach((m) => {
      const t = new Date(m.timestampCached).getTime();
      if (t > latestMs) {
        latestMs = t;
        latestTimestamp = m.timestampCached;
      }
    });

    return latestTimestamp;
  }

  public async hasOfflineData(): Promise<boolean> {
    await this.ensureInitialized();
    const voyageRes = await this.getVoyageState();
    const envRes = await this.getEnvironmentalState();
    const routeRes = await this.getRoutes();

    return (
      voyageRes.status === 'STORAGE_AVAILABLE' ||
      envRes.status === 'STORAGE_AVAILABLE' ||
      (routeRes.status === 'STORAGE_AVAILABLE' && (routeRes.data?.length ?? 0) > 0)
    );
  }

  /**
   * Generates a complete Offline Navigation Snapshot representing the latest verified stored state.
   */
  public async getOfflineSnapshot(): Promise<StorageResult<OfflineNavigationSnapshot>> {
    await this.ensureInitialized();
    try {
      const voyageRes = await this.getVoyageState();
      const envRes = await this.getEnvironmentalState();
      const hazardsRes = await this.getHazards();
      const routesRes = await this.getRoutes();
      const metaRes = await this.getStorageMetadata();

      const hasData =
        voyageRes.status === 'STORAGE_AVAILABLE' ||
        envRes.status === 'STORAGE_AVAILABLE' ||
        hazardsRes.status === 'STORAGE_AVAILABLE' ||
        (routesRes.status === 'STORAGE_AVAILABLE' && (routesRes.data?.length ?? 0) > 0);

      if (!hasData) {
        return {
          status: 'STORAGE_EMPTY',
          data: {
            voyageState: null,
            environmentalState: null,
            hazards: null,
            routes: [],
            syncTimestamp: null,
            dataMode: 'UNAVAILABLE',
            provenanceSummary: 'NO OFFLINE DATA PRESERVED IN STORAGE',
            metadata: {},
            storageStatus: 'STORAGE_EMPTY',
            isOfflineAvailable: false,
          },
          message: 'Offline navigation snapshot is empty. Synchronize online telemetry first.',
        };
      }

      const syncTimestamp = await this.getLastSyncTime();
      const metadataObj = (metaRes.data as Record<string, StorageRecordMetadata>) || {};

      // Determine overall data mode across stored datasets
      let overallMode: DataMode = 'REAL';
      if (
        voyageRes.data?.dataMode === 'SIMULATED' ||
        envRes.metadata?.dataMode === 'SIMULATED' ||
        hazardsRes.metadata?.dataMode === 'SIMULATED'
      ) {
        overallMode = 'SIMULATED';
      }

      const provenanceSummary = Object.values(metadataObj)
        .map((m) => `${m.sourceName} (${m.dataMode})`)
        .join(' | ');

      const snapshot: OfflineNavigationSnapshot = {
        voyageState: voyageRes.data,
        environmentalState: envRes.data,
        hazards: hazardsRes.data,
        routes: routesRes.data || [],
        syncTimestamp,
        dataMode: overallMode,
        provenanceSummary: provenanceSummary || 'CRYO NAV Offline Engine',
        metadata: metadataObj,
        storageStatus: 'STORAGE_AVAILABLE',
        isOfflineAvailable: true,
      };

      return {
        status: 'STORAGE_AVAILABLE',
        data: snapshot,
        message: 'Offline navigation snapshot compiled successfully.',
      };
    } catch (err: any) {
      return {
        status: 'STORAGE_READ_ERROR',
        data: null,
        message: 'Failed to generate offline navigation snapshot.',
        error: err.message,
      };
    }
  }

  /**
   * Clears all cached offline data and metadata from storage
   */
  public async clearOfflineData(): Promise<StorageResult<boolean>> {
    await this.ensureInitialized();
    try {
      for (const storeName of Object.values(STORES)) {
        await this.clearStore(storeName);
      }
      return {
        status: 'STORAGE_AVAILABLE',
        data: true,
        message: 'All offline datasets and metadata cleared from local storage.',
      };
    } catch (err: any) {
      return {
        status: 'STORAGE_WRITE_ERROR',
        data: false,
        message: 'Error clearing offline storage.',
        error: err.message,
      };
    }
  }
}

export const offlineStorageEngine = new OfflineStorageEngine();
