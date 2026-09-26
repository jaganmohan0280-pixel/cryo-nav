/**
 * CRYO NAV — Navigation Alert Panel
 * Phase 14B — Presentational Navigation UI Component
 *
 * Core Responsibility:
 * Displays structured navigation alerts and telemetry warnings produced by
 * navigationAlertEngine.ts for active vessel conning decision support.
 *
 * Communicates:
 * - Active Alert Summary Counts (Critical, Warning, Advisory, Info, Total)
 * - Individual Alert Cards (Title, Severity, Type, Message, Source, Target Entity ID, Timestamp)
 * - Telemetry & Connectivity Context (GPS availability, Position freshness, Connection state)
 * - Scientific Data Mode & Provenance (REAL, SIMULATED, HYBRID, UNAVAILABLE)
 * - Mandatory Safety & Navigator Authority Disclaimers
 *
 * STRICT SAFETY & NAVIGATION RULES:
 * - Decision Support ONLY: Does NOT alter vessel speed, heading, waypoints, or route geometry.
 * - Neutral Language ONLY: Never says "Collision guaranteed", "Ship will collide", "Definitely unsafe", "Safe to proceed", or "Collision avoided".
 * - Mandatory Disclaimer: "CRYO NAV provides decision support. Vessel control and route changes remain with the navigator."
 */

import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Info,
  Activity,
  CheckCircle2,
  Radio,
  Clock,
  Compass,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Navigation,
  Lock,
  Zap,
} from 'lucide-react';
import {
  NavigationAlertEvaluationResult,
  NavigationAlert,
  NavigationAlertSeverity,
  NavigationDataMode,
} from '../../services/navigationAlertEngine';
import { ConnectionState } from '../../types';

export interface NavigationAlertPanelProps {
  evaluationResult?: NavigationAlertEvaluationResult | null;
  result?: NavigationAlertEvaluationResult | null; // Alias for flexibility
  connectionState?: ConnectionState;
  gpsAvailable?: boolean;
  gpsAgeMinutes?: number | null;
  compact?: boolean;
}

export const NavigationAlertPanel: React.FC<NavigationAlertPanelProps> = ({
  evaluationResult,
  result,
  connectionState = 'ONLINE',
  gpsAvailable = true,
  gpsAgeMinutes = null,
  compact = false,
}) => {
  const activeResult = evaluationResult || result || null;
  const [isExpanded, setIsExpanded] = useState<boolean>(!compact);

  // Helper for Severity Badges & Colors
  const getSeverityBadge = (severity: NavigationAlertSeverity) => {
    switch (severity) {
      case 'CRITICAL':
        return {
          label: 'CRITICAL',
          bgClass: 'bg-rose-950/90 border-rose-500/60 text-rose-300',
          icon: <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />,
        };
      case 'WARNING':
        return {
          label: 'WARNING',
          bgClass: 'bg-amber-950/90 border-amber-500/60 text-amber-300',
          icon: <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />,
        };
      case 'ADVISORY':
        return {
          label: 'ADVISORY',
          bgClass: 'bg-cyan-950/90 border-cyan-500/60 text-cyan-300',
          icon: <Activity className="w-4 h-4 text-cyan-400 shrink-0" />,
        };
      case 'INFO':
      default:
        return {
          label: 'INFO',
          bgClass: 'bg-slate-800/90 border-slate-600/60 text-slate-300',
          icon: <Info className="w-4 h-4 text-slate-400 shrink-0" />,
        };
    }
  };

  // Helper for Provenance Badges
  const getProvenanceBadgeClass = (mode: NavigationDataMode) => {
    switch (mode) {
      case 'REAL':
        return 'bg-emerald-950/80 border-emerald-600/60 text-emerald-300';
      case 'HYBRID':
        return 'bg-cyan-950/80 border-cyan-600/60 text-cyan-300';
      case 'SIMULATED':
        return 'bg-purple-950/80 border-purple-600/60 text-purple-300';
      case 'UNAVAILABLE':
      default:
        return 'bg-slate-800 border-slate-700 text-slate-400';
    }
  };

  // Connection State Badge Styling
  const getConnectionStateClass = (state: ConnectionState) => {
    switch (state) {
      case 'ONLINE':
        return 'bg-emerald-950 text-emerald-300 border-emerald-700/60';
      case 'LIMITED':
        return 'bg-amber-950 text-amber-300 border-amber-700/60';
      case 'OFFLINE':
        return 'bg-slate-800 text-slate-300 border-slate-600';
      case 'SYNCING':
        return 'bg-cyan-950 text-cyan-300 border-cyan-700/60';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  // Zero / Empty state handling
  if (!activeResult || activeResult.totalAlertsCount === 0) {
    return (
      <div
        data-testid="navigation-alert-panel-empty"
        className="bg-slate-900/90 backdrop-blur border border-slate-700/60 rounded-xl p-4 text-slate-200 shadow-xl space-y-3"
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span data-testid="panel-title" className="font-bold tracking-wide uppercase text-sm text-slate-100">
              Navigation Alerts & Telemetry
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              data-testid="connectivity-badge"
              className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${getConnectionStateClass(connectionState)}`}
            >
              {connectionState}
            </span>
            <span
              data-testid="data-mode-badge"
              className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${getProvenanceBadgeClass(
                activeResult?.dataMode || 'UNAVAILABLE'
              )}`}
            >
              {activeResult?.dataMode || 'UNAVAILABLE'}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs bg-slate-950/60 rounded-lg p-2.5 border border-slate-800">
          <div className="flex items-center gap-2 text-emerald-400 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span data-testid="zero-alerts-message">No active navigation alerts or telemetry hazards detected.</span>
          </div>
          <span data-testid="total-alerts-count" className="font-mono font-bold text-slate-300 text-xs">
            0 Active
          </span>
        </div>

        {/* GPS Telemetry Summary */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 bg-slate-950/40 p-2 rounded border border-slate-800/80">
          <span className="flex items-center gap-1.5">
            <Navigation className="w-3.5 h-3.5 text-cyan-400" />
            <span>GPS Status:</span>
            <span
              data-testid="gps-status-badge"
              className={`font-semibold ${gpsAvailable ? 'text-emerald-400' : 'text-rose-400'}`}
            >
              {gpsAvailable ? 'POSITION AVAILABLE' : 'TELEMETRY UNAVAILABLE'}
            </span>
          </span>
          {gpsAgeMinutes != null && (
            <span data-testid="gps-age-text" className="font-mono text-slate-400">
              Age: {Math.round(gpsAgeMinutes)}m
            </span>
          )}
        </div>

        {/* Navigator Authority Disclaimer */}
        <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-start gap-1.5">
          <Lock className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
          <p data-testid="navigator-authority-disclaimer">
            CRYO NAV provides decision support. Vessel control and route changes remain with the navigator.
          </p>
        </div>
      </div>
    );
  }

  const {
    alerts = [],
    totalAlertsCount,
    criticalAlertsCount,
    warningAlertsCount,
    advisoryAlertsCount,
    infoAlertsCount,
    dataMode = 'SIMULATED',
    provenance = 'Phase 14A Alert Engine',
  } = activeResult;

  return (
    <div
      data-testid="navigation-alert-panel"
      className="bg-slate-900/90 backdrop-blur border border-slate-700/60 rounded-xl p-4 text-slate-200 shadow-xl space-y-4"
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          {criticalAlertsCount > 0 ? (
            <ShieldAlert className="w-5 h-5 text-rose-400" />
          ) : warningAlertsCount > 0 ? (
            <AlertTriangle className="w-5 h-5 text-amber-400" />
          ) : (
            <Activity className="w-5 h-5 text-cyan-400" />
          )}
          <div>
            <h3 data-testid="panel-title" className="font-bold tracking-wide uppercase text-sm text-slate-100 flex items-center gap-2">
              Navigation Alerts & Telemetry
            </h3>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
              <span>GPS Status:</span>
              <span
                data-testid="gps-status-badge"
                className={`font-semibold ${gpsAvailable ? 'text-emerald-400' : 'text-rose-400'}`}
              >
                {gpsAvailable ? 'POSITION AVAILABLE' : 'TELEMETRY UNAVAILABLE'}
              </span>
              {gpsAgeMinutes != null && (
                <span data-testid="gps-age-text" className="font-mono text-slate-400 text-[11px]">
                  ({Math.round(gpsAgeMinutes)}m age)
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            data-testid="connectivity-badge"
            className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${getConnectionStateClass(connectionState)}`}
          >
            {connectionState}
          </span>
          <span
            data-testid="data-mode-badge"
            className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${getProvenanceBadgeClass(dataMode)}`}
          >
            {dataMode}
          </span>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 transition-colors"
            aria-label="Toggle details"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Alert Summary Counters */}
      <div data-testid="alert-summary-counters" className="grid grid-cols-5 gap-2 text-center text-xs">
        <div className="bg-slate-950/60 border border-slate-800 p-2 rounded-lg">
          <span className="text-[10px] text-slate-400 uppercase block font-semibold">Total</span>
          <span data-testid="total-alerts-count" className="font-mono text-lg font-bold text-slate-100">
            {totalAlertsCount}
          </span>
        </div>
        <div className="bg-slate-950/60 border border-slate-800 p-2 rounded-lg">
          <span className="text-[10px] text-rose-400 uppercase block font-semibold">Critical</span>
          <span data-testid="critical-alerts-count" className="font-mono text-lg font-bold text-rose-400">
            {criticalAlertsCount}
          </span>
        </div>
        <div className="bg-slate-950/60 border border-slate-800 p-2 rounded-lg">
          <span className="text-[10px] text-amber-400 uppercase block font-semibold">Warning</span>
          <span data-testid="warning-alerts-count" className="font-mono text-lg font-bold text-amber-400">
            {warningAlertsCount}
          </span>
        </div>
        <div className="bg-slate-950/60 border border-slate-800 p-2 rounded-lg">
          <span className="text-[10px] text-cyan-400 uppercase block font-semibold">Advisory</span>
          <span data-testid="advisory-alerts-count" className="font-mono text-lg font-bold text-cyan-400">
            {advisoryAlertsCount}
          </span>
        </div>
        <div className="bg-slate-950/60 border border-slate-800 p-2 rounded-lg">
          <span className="text-[10px] text-slate-400 uppercase block font-semibold">Info</span>
          <span data-testid="info-alerts-count" className="font-mono text-lg font-bold text-slate-300">
            {infoAlertsCount}
          </span>
        </div>
      </div>

      {/* Active Alerts List */}
      {isExpanded && (
        <div data-testid="alerts-list" className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {alerts.map((alert: NavigationAlert) => {
            const badge = getSeverityBadge(alert.severity);
            return (
              <div
                key={alert.id}
                data-testid={`alert-card-${alert.id}`}
                className="bg-slate-950/50 border border-slate-800/90 hover:border-slate-700 rounded-lg p-3 text-xs space-y-2 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    {badge.icon}
                    <div>
                      <h4 data-testid={`alert-title-${alert.id}`} className="font-bold text-slate-100 text-xs">
                        {alert.title}
                      </h4>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5 font-mono">
                        <span data-testid={`alert-source-${alert.id}`}>{`Src: ${alert.source}`}</span>
                        <span>•</span>
                        <span data-testid={`alert-type-${alert.id}`}>{`Type: ${alert.type}`}</span>
                        {alert.targetEntityId && (
                          <>
                            <span>•</span>
                            <span data-testid={`alert-target-${alert.id}`}>{`Target: ${alert.targetEntityId}`}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <span
                    data-testid={`alert-severity-${alert.id}`}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase shrink-0 ${badge.bgClass}`}
                  >
                    {badge.label}
                  </span>
                </div>

                <p data-testid={`alert-message-${alert.id}`} className="text-slate-300 leading-relaxed text-[11px]">
                  {alert.message}
                </p>

                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-900 font-mono">
                  <span data-testid={`alert-timestamp-${alert.id}`}>
                    {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                  <span className="truncate max-w-[200px]">Prov: {alert.provenance}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer & Navigator Authority Disclaimer */}
      <div className="border-t border-slate-800/80 pt-3 space-y-1.5 text-[11px] text-slate-400">
        <div className="flex items-center justify-between text-[10px] text-slate-400">
          <span className="flex items-center gap-1">
            <Radio className="w-3 h-3 text-cyan-400" />
            <span data-testid="provenance-badge">Provenance: {provenance}</span>
          </span>
          <span className="text-slate-400 font-mono">Navigation Alert Engine v14B</span>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded p-2 text-slate-400 space-y-1">
          <div className="flex items-start gap-1.5">
            <Lock className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
            <p data-testid="navigator-authority-disclaimer" className="text-slate-300">
              CRYO NAV provides decision support. Vessel control and route changes remain with the navigator.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
