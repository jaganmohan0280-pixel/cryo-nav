/**
 * CRYO NAV — Connectivity State Engine
 * Phase 9C — Browser Connectivity Detection & Transition Layer
 *
 * Core Responsibility:
 * Monitors browser network connectivity via navigator.onLine and window online/offline events.
 * Manages connection state transitions (ONLINE, LIMITED, OFFLINE, SYNCING).
 *
 * Strict Rules:
 * - NO environmental calculations.
 * - NO automatic satellite/replanning logic.
 * - Zero external npm dependencies.
 * - Conservative behavior:
 *     navigator.onLine === false -> OFFLINE
 *     navigator.onLine === true -> ONLINE (or LIMITED if service reachability is degraded)
 */

import { ConnectionState } from '../types';

export type ConnectivityListener = (state: ConnectionState) => void;

class ConnectivityStateEngine {
  private currentState: ConnectionState = 'ONLINE';
  private listeners: Set<ConnectivityListener> = new Set();
  private simulatedState: ConnectionState | null = null;
  private isListening: boolean = false;
  private isServiceDegraded: boolean = false;

  constructor() {
    this.detectInitialState();
  }

  private detectInitialState(): void {
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
      if (!navigator.onLine) {
        this.currentState = 'OFFLINE';
      } else {
        this.currentState = this.isServiceDegraded ? 'LIMITED' : 'ONLINE';
      }
    } else {
      this.currentState = 'ONLINE';
    }
  }

  public getCurrentConnectionState(): ConnectionState {
    if (this.simulatedState !== null) {
      return this.simulatedState;
    }
    return this.currentState;
  }

  public setSimulatedState(state: ConnectionState | null): void {
    this.simulatedState = state;
    this.notifyListeners();
  }

  public setServiceDegraded(degraded: boolean): void {
    this.isServiceDegraded = degraded;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.currentState = 'OFFLINE';
    } else {
      this.currentState = degraded ? 'LIMITED' : 'ONLINE';
    }
    this.notifyListeners();
  }

  public handleOnline = (): void => {
    this.currentState = this.isServiceDegraded ? 'LIMITED' : 'ONLINE';
    this.notifyListeners();
  };

  public handleOffline = (): void => {
    this.currentState = 'OFFLINE';
    this.notifyListeners();
  };

  public start(): void {
    if (this.isListening) return;
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
      this.isListening = true;
    }
    this.detectInitialState();
  }

  public stop(): void {
    if (!this.isListening) return;
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
      this.isListening = false;
    }
  }

  public subscribe(listener: ConnectivityListener): () => void {
    this.listeners.add(listener);
    if (!this.isListening) {
      this.start();
    }
    // Immediately notify listener of current state
    listener(this.getCurrentConnectionState());

    return () => {
      this.unsubscribe(listener);
    };
  }

  public unsubscribe(listener: ConnectivityListener): void {
    this.listeners.delete(listener);
    if (this.listeners.size === 0) {
      this.stop();
    }
  }

  public getListenerCount(): number {
    return this.listeners.size;
  }

  private notifyListeners(): void {
    const state = this.getCurrentConnectionState();
    this.listeners.forEach((listener) => {
      try {
        listener(state);
      } catch (err) {
        console.error('Error in connectivity listener:', err);
      }
    });
  }
}

export const connectivityStateEngine = new ConnectivityStateEngine();
