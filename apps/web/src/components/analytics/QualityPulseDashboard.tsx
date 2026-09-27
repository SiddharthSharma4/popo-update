import React, { useState, useEffect, useCallback } from "react";
import type {
  QualityPulseOverview,
  QualityHotspot,
  TriggerSentinelResponse,
} from "@osm/shared";
import { UserRole, ActorType } from "@osm/shared";
import { analyticsService } from "../../services/analytics-service.ts";
import type { AuthContext } from "../../services/api-client.ts";
import { HotspotDrillDownModal } from "./HotspotDrillDownModal.tsx";
import { SentinelTriggerModal } from "./SentinelTriggerModal.tsx";

interface QualityPulseDashboardProps {
  auth: AuthContext;
}

export const QualityPulseDashboard: React.FC<QualityPulseDashboardProps> = ({ auth }) => {
  const [pulse, setPulse] = useState<QualityPulseOverview | null>(null);
  const [cycleFilter, setCycleFilter] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Hotspot drill-down modal state
  const [selectedHotspot, setSelectedHotspot] = useState<QualityHotspot | null>(null);
  const [isDrillDownOpen, setIsDrillDownOpen] = useState<boolean>(false);

  // Sentinel trigger modal state
  const [isSentinelModalOpen, setIsSentinelModalOpen] = useState<boolean>(false);
  const [sentinelToast, setSentinelToast] = useState<{
    message: string;
    anomalies: number;
    newSignals: number;
  } | null>(null);

  const isAuthorized =
    auth.actorType !== ActorType.AI &&
    (auth.role === UserRole.MODERATOR || auth.role === UserRole.ADMIN);

  const loadPulse = useCallback(async () => {
    if (!isAuthorized) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await analyticsService.getQualityPulse(
        {
          evaluationCycleId: cycleFilter.trim() ? cycleFilter.trim() : undefined,
          minSampleSize: 5,
          limit: 10,
        },
        auth
      );
      setPulse(data);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to load QualityPulse overview"
      );
    } finally {
      setLoading(false);
    }
  }, [auth, cycleFilter, isAuthorized]);

  useEffect(() => {
    loadPulse();
  }, [loadPulse]);

  const handleDrillDown = (hotspot: QualityHotspot) => {
    setSelectedHotspot(hotspot);
    setIsDrillDownOpen(true);
  };

  const handleSentinelSuccess = (result: TriggerSentinelResponse) => {
    setSentinelToast({
      message: `Sentinel scan completed successfully: ${result.evaluatorsAnalyzed} evaluators analyzed.`,
      anomalies: result.anomaliesDetected,
      newSignals: result.newSignalsGenerated,
    });
    // Refresh pulse data to reflect newly materialized signals and hotspots
    loadPulse();
  };

  // If role is unauthorized (Examiner or AI), render boundary guard
  if (!isAuthorized) {
    return (
      <div className="analytics-unauthorized-container" id="osm-analytics-unauthorized">
        <div className="hero-card unauthorized-card">
          <div className="unauthorized-badge">Restricted Access (06-api §12)</div>
          <h2 className="hero-title">Quality Analytics & QualityPulse Restricted</h2>
          <p className="hero-subtitle">
            Current Actor: <strong>{auth.actorId}</strong> | Role:{" "}
            <strong>{auth.role}</strong> | Type: <strong>{auth.actorType}</strong>
          </p>
          <div className="unauthorized-explanation">
            <p>
              In accordance with <code>docs/contracts/06-api-contract.md §12</code> and{" "}
              <code>docs/contracts/02-architecture-contract.md §12</code>, QualityPulse overview,
              evaluator comparative statistics, and SentinelFlag execution are exclusively
              restricted to <strong>MODERATOR</strong> and <strong>ADMIN</strong> roles.
            </p>
            <p style={{ marginTop: "0.5rem" }}>
              Examiners and AI actors are prohibited from inspecting comparative cohort analytics to
              preserve evaluation neutrality (<code>INV-004</code>).
            </p>
          </div>
        </div>
      </div>
    );
  }

  const riskClass =
    pulse?.health.riskLevel === "CRITICAL"
      ? "risk-critical"
      : pulse?.health.riskLevel === "HIGH"
      ? "risk-high"
      : pulse?.health.riskLevel === "MEDIUM"
      ? "risk-medium"
      : "risk-low";

  return (
    <div className="quality-pulse-container" id="osm-quality-pulse-dashboard">
      {/* Top Banner & Controls */}
      <div className="pulse-header-banner">
        <div>
          <div className="pulse-title-row">
            <h1 className="module-title" id="pulse-dashboard-title">QualityPulse Analytics</h1>
            <span className="brand-badge">Phase 8 Ready</span>
          </div>
          <p className="module-subtitle">
            Real-time quality telemetry, cohort health index, evaluator deviation patterns,
            and prioritized emerging hotspots (<code>01-product §15</code>, <code>02-architecture §31</code>).
          </p>
        </div>

        <div className="pulse-header-controls">
          <div className="pulse-filter-group">
            <input
              id="pulse-cycle-filter-input"
              type="text"
              className="form-input pulse-cycle-input"
              placeholder="Filter by cycle ID..."
              value={cycleFilter}
              onChange={(e) => setCycleFilter(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadPulse()}
            />
            <button
              id="btn-apply-cycle-filter"
              className="btn-secondary"
              onClick={loadPulse}
              disabled={loading}
            >
              Filter
            </button>
          </div>

          <button
            id="btn-refresh-pulse"
            className="btn-secondary"
            onClick={loadPulse}
            disabled={loading}
          >
            ↻ Refresh Pulse
          </button>

          <button
            id="btn-open-sentinel-modal"
            className="btn-primary btn-sentinel-cta"
            onClick={() => setIsSentinelModalOpen(true)}
            disabled={loading}
          >
            ⚡ Run SentinelFlag Scan
          </button>
        </div>
      </div>

      {/* Sentinel Trigger Notification Toast */}
      {sentinelToast && (
        <div className="notice-banner notice-success" id="pulse-sentinel-toast">
          <div className="sentinel-toast-content">
            <span className="toast-bold">⚡ SentinelFlag Anomaly Scan Finished:</span>
            <span>{sentinelToast.message}</span>
            <span className="toast-pill pill-anomalies">
              {sentinelToast.anomalies} Anomalies Detected
            </span>
            <span className="toast-pill pill-signals">
              {sentinelToast.newSignals} Signals Generated
            </span>
          </div>
          <button
            className="btn-notice-dismiss"
            id="btn-dismiss-sentinel-toast"
            onClick={() => setSentinelToast(null)}
          >
            ×
          </button>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="notice-banner notice-error" id="pulse-error-banner">
          <span>Error loading QualityPulse: {error}</span>
          <button className="btn-secondary btn-sm" onClick={loadPulse}>
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && !pulse && (
        <div className="pulse-loading-state" id="pulse-loading-indicator">
          <div className="spinner" />
          <p>Compiling real-time QualityPulse telemetry from derived analytics...</p>
        </div>
      )}

      {/* Main Dashboard Telemetry Grid */}
      {pulse && (
        <>
          <div className="pulse-telemetry-grid">
            {/* 1. Evaluation Progress Card */}
            <div className="telemetry-card" id="card-pulse-progress">
              <div className="telemetry-card-header">
                <span className="card-badge">Throughput</span>
                <h3 className="card-heading">Evaluation Progress</h3>
              </div>
              <div className="progress-stat-row">
                <div className="stat-big">
                  <span className="stat-value" id="stat-progress-total">
                    {pulse.progress.total}
                  </span>
                  <span className="stat-label">Total Scripts</span>
                </div>
                <div className="stat-big">
                  <span className="stat-value" id="stat-progress-percent">
                    {pulse.progress.completionPercentage}%
                  </span>
                  <span className="stat-label">Completed</span>
                </div>
              </div>

              <div className="progress-bar-track">
                <div
                  className="progress-bar-fill"
                  id="pulse-progress-bar-fill"
                  style={{ width: `${Math.min(100, pulse.progress.completionPercentage)}%` }}
                />
              </div>

              <div className="progress-mini-breakdown">
                <div className="mini-stat">
                  <span>Submitted:</span>
                  <strong id="stat-progress-submitted">{pulse.progress.submitted}</strong>
                </div>
                <div className="mini-stat">
                  <span>In Progress:</span>
                  <strong id="stat-progress-in-progress">{pulse.progress.inProgress}</strong>
                </div>
                <div className="mini-stat">
                  <span>Draft:</span>
                  <strong id="stat-progress-draft">{pulse.progress.draft}</strong>
                </div>
                <div className="mini-stat">
                  <span>Finalized:</span>
                  <strong id="stat-progress-finalized">{pulse.progress.finalized}</strong>
                </div>
              </div>
            </div>

            {/* 2. Quality Health Index Card */}
            <div className="telemetry-card" id="card-pulse-health">
              <div className="telemetry-card-header">
                <span className="card-badge">Cohort Health</span>
                <h3 className="card-heading">Quality Health Index</h3>
              </div>
              <div className="health-score-container">
                <div className={`health-gauge ${riskClass}`} id="stat-health-index-gauge">
                  <span className="health-gauge-number" id="stat-health-index">
                    {pulse.health.healthIndex}
                  </span>
                  <span className="health-gauge-max">/100</span>
                </div>
                <div className="health-risk-info">
                  <span className="risk-label">Cohort Risk Level:</span>
                  <span className={`risk-badge ${riskClass}`} id="stat-risk-level">
                    {pulse.health.riskLevel}
                  </span>
                  <span className="signals-count-hint" id="stat-evaluations-with-signals">
                    {pulse.health.evaluationsWithSignalsCount} evaluation(s) flagged with quality signals
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Quality Signals Overview Card */}
            <div className="telemetry-card" id="card-pulse-signals">
              <div className="telemetry-card-header">
                <span className="card-badge">Signals</span>
                <h3 className="card-heading">Quality Signals Overview</h3>
              </div>
              <div className="signals-summary-row">
                <div className="stat-big">
                  <span className="stat-value" id="stat-signals-total">
                    {pulse.signalsOverview.total}
                  </span>
                  <span className="stat-label">Total Signals</span>
                </div>
                <div className="stat-big">
                  <span className="stat-value" id="stat-signals-open">
                    {pulse.signalsOverview.openReviewable}
                  </span>
                  <span className="stat-label">Open for Triage</span>
                </div>
              </div>

              <div className="signals-severity-pills" id="pulse-severity-pills">
                <span className="sev-pill sev-critical">
                  Critical: {pulse.signalsOverview.bySeverity["CRITICAL"] || 0}
                </span>
                <span className="sev-pill sev-high">
                  High: {pulse.signalsOverview.bySeverity["HIGH"] || 0}
                </span>
                <span className="sev-pill sev-medium">
                  Medium: {pulse.signalsOverview.bySeverity["MEDIUM"] || 0}
                </span>
                <span className="sev-pill sev-low">
                  Low: {pulse.signalsOverview.bySeverity["LOW"] || 0}
                </span>
              </div>

              <div className="signals-status-row">
                <span>Linked to Case: {pulse.signalsOverview.linkedToCase}</span>
                <span>Resolved: {pulse.signalsOverview.resolved}</span>
                <span>Dismissed: {pulse.signalsOverview.dismissed}</span>
              </div>
            </div>

            {/* 4. Moderation Throughput Card */}
            <div className="telemetry-card" id="card-pulse-moderation">
              <div className="telemetry-card-header">
                <span className="card-badge">Governance</span>
                <h3 className="card-heading">Moderation Workload</h3>
              </div>
              <div className="moderation-stat-row">
                <div className="stat-big">
                  <span className="stat-value" id="stat-moderation-total">
                    {pulse.moderationOverview.totalCases}
                  </span>
                  <span className="stat-label">Triage Cases</span>
                </div>
                <div className="stat-big">
                  <span className="stat-value" id="stat-moderation-resolution-rate">
                    {pulse.moderationOverview.resolutionRate}%
                  </span>
                  <span className="stat-label">Resolution Rate</span>
                </div>
              </div>

              <div className="moderation-breakdown-row">
                <div className="mini-stat">
                  <span>Open:</span>
                  <strong id="stat-moderation-open">{pulse.moderationOverview.openCases}</strong>
                </div>
                <div className="mini-stat">
                  <span>Assigned:</span>
                  <strong id="stat-moderation-assigned">{pulse.moderationOverview.assignedCases}</strong>
                </div>
                <div className="mini-stat">
                  <span>Resolved:</span>
                  <strong id="stat-moderation-resolved">{pulse.moderationOverview.resolvedCases}</strong>
                </div>
              </div>
            </div>

            {/* 5. Evaluator Cohort Deviations Card */}
            <div className="telemetry-card telemetry-card-wide" id="card-pulse-evaluators">
              <div className="telemetry-card-header">
                <span className="card-badge">Examiner Drift</span>
                <h3 className="card-heading">Evaluator Deviation Telemetry</h3>
              </div>
              <div className="evaluator-deviation-grid">
                <div className="eval-metric-stat">
                  <span className="eval-metric-value" id="stat-evaluators-total">
                    {pulse.evaluatorDeviations.totalEvaluators}
                  </span>
                  <span className="eval-metric-label">Active Evaluators</span>
                </div>
                <div className="eval-metric-stat">
                  <span className="eval-metric-value stat-normal" id="stat-evaluators-normal">
                    {pulse.evaluatorDeviations.normalCount}
                  </span>
                  <span className="eval-metric-label">Normal (Δ &lt; 15%)</span>
                </div>
                <div className="eval-metric-stat">
                  <span className="eval-metric-value stat-moderate" id="stat-evaluators-moderate">
                    {pulse.evaluatorDeviations.moderateDeviationCount}
                  </span>
                  <span className="eval-metric-label">Moderate (15–25%)</span>
                </div>
                <div className="eval-metric-stat">
                  <span className="eval-metric-value stat-critical" id="stat-evaluators-critical">
                    {pulse.evaluatorDeviations.criticalDeviationCount}
                  </span>
                  <span className="eval-metric-label">Critical (Δ ≥ 25%)</span>
                </div>
                <div className="eval-metric-stat">
                  <span className="eval-metric-value stat-insufficient" id="stat-evaluators-insufficient">
                    {pulse.evaluatorDeviations.insufficientDataCount}
                  </span>
                  <span className="eval-metric-label">Insufficient Data</span>
                </div>
              </div>

              {pulse.evaluatorDeviations.flaggedEvaluatorIds.length > 0 && (
                <div className="flagged-evaluators-box" id="pulse-flagged-evaluators">
                  <span className="flagged-title">Flagged Evaluator IDs Requiring Review:</span>
                  <div className="flagged-tags">
                    {pulse.evaluatorDeviations.flaggedEvaluatorIds.map((id) => (
                      <code key={id} className="flagged-eval-tag">
                        {id}
                      </code>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Emerging Hotspot Feed Section */}
          <section className="pulse-hotspots-section" id="osm-pulse-hotspots-section">
            <div className="hotspots-section-header">
              <div>
                <h2 className="section-title">Emerging Quality Hotspots</h2>
                <p className="section-desc">
                  Prioritized concentration clusters across evaluators, questions, and signals
                  warranting human moderator investigation (<code>01-product §15</code>).
                </p>
              </div>
              <span className="hotspots-count-pill" id="pulse-hotspots-count">
                {pulse.topHotspots.length} Detected
              </span>
            </div>

            {pulse.topHotspots.length === 0 ? (
              <div className="empty-hotspots-banner" id="pulse-empty-hotspots">
                <span className="empty-icon">✓</span>
                <div className="empty-text">
                  <strong>No emerging hotspots detected.</strong>
                  <p>Cohort evaluations are within normal statistical distributions and tolerance thresholds.</p>
                </div>
              </div>
            ) : (
              <div className="hotspots-list" id="pulse-hotspots-list">
                {pulse.topHotspots.map((hotspot, idx) => {
                  const severityClass =
                    hotspot.severity === "CRITICAL"
                      ? "badge-critical"
                      : hotspot.severity === "HIGH"
                      ? "badge-high"
                      : hotspot.severity === "MEDIUM"
                      ? "badge-medium"
                      : "badge-low";

                  return (
                    <div
                      key={`${hotspot.hotspotType}-${hotspot.targetId}-${idx}`}
                      className="hotspot-card"
                      id={`hotspot-card-${idx}`}
                    >
                      <div className="hotspot-card-top">
                        <div className="hotspot-badges">
                          <span className={`status-badge ${severityClass}`}>
                            {hotspot.severity}
                          </span>
                          <span className="hotspot-type-tag">{hotspot.hotspotType}</span>
                        </div>
                        <code className="hotspot-target-code">{hotspot.targetId}</code>
                      </div>

                      <h4 className="hotspot-title">{hotspot.title}</h4>
                      <p className="hotspot-desc">{hotspot.description}</p>

                      <div className="hotspot-card-actions">
                        <button
                          type="button"
                          className="btn-secondary btn-sm btn-drilldown"
                          id={`btn-drilldown-hotspot-${idx}`}
                          onClick={() => handleDrillDown(hotspot)}
                        >
                          🔍 Drill Down & Inspect Evidence
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}

      {/* Hotspot Drill-Down Evidence Modal */}
      <HotspotDrillDownModal
        hotspot={selectedHotspot}
        isOpen={isDrillDownOpen}
        onClose={() => setIsDrillDownOpen(false)}
      />

      {/* SentinelFlag Trigger Modal */}
      <SentinelTriggerModal
        isOpen={isSentinelModalOpen}
        onClose={() => setIsSentinelModalOpen(false)}
        onSuccess={handleSentinelSuccess}
        auth={auth}
        currentCycleId={cycleFilter}
      />
    </div>
  );
};
