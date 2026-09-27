/**
 * QualityPulse Analytics Dashboard.
 * Conforms to:
 * - docs/11-frontend-design-contract.md §19, §21, §24 (QualityPulse Redesign)
 * - docs/12-frontend-redesign-build-plan.md FE-021
 * - Cross-Screen Engineering Invariants 1, 2, 8, 9, 10, 11
 */

import React, { useState, useEffect, useCallback } from "react";
import type {
  QualityPulseOverview,
  QualityHotspot,
  TriggerSentinelResponse,
  EvaluatorDeviationMetric,
} from "@osm/shared";
import { UserRole, ActorType } from "@osm/shared";
import { analyticsService } from "../../services/analytics-service.ts";
import type { AuthContext } from "../../services/api-client.ts";
import { CohortHealthCard } from "./CohortHealthCard.tsx";
import { EvaluatorDeviationTable } from "./EvaluatorDeviationTable.tsx";
import { HotspotDrillDownModal } from "./HotspotDrillDownModal.tsx";
import { SentinelTriggerModal } from "./SentinelTriggerModal.tsx";
import { Button, Input, Skeleton, Alert, StatusBadge, EmptyState } from "../ui";
import { getActorDisplayName } from "../../services/actor-fixtures.ts";

export interface QualityPulseDashboardProps {
  auth: AuthContext;
}

export const QualityPulseDashboard: React.FC<QualityPulseDashboardProps> = ({ auth }) => {
  const [pulse, setPulse] = useState<QualityPulseOverview | null>(null);
  const [evaluatorMetrics, setEvaluatorMetrics] = useState<EvaluatorDeviationMetric[]>([]);
  const [cycleFilter, setCycleFilter] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMetrics, setLoadingMetrics] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Hotspot drill-down modal state
  const [selectedHotspot, setSelectedHotspot] = useState<QualityHotspot | null>(null);
  const [isDrillDownOpen, setIsDrillDownOpen] = useState<boolean>(false);

  // Sentinel trigger modal state
  const [isSentinelModalOpen, setIsSentinelModalOpen] = useState<boolean>(false);
  const [sentinelNotice, setSentinelNotice] = useState<{
    message: string;
    anomalies: number;
    newSignals: number;
  } | null>(null);

  const isAuthorized =
    auth.actorType !== ActorType.AI &&
    (auth.role === UserRole.MODERATOR || auth.role === UserRole.ADMIN);

  const isAdmin = auth.role === UserRole.ADMIN;

  // Load QualityPulse overview
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
        err instanceof Error ? err.message : "Failed to load QualityPulse overview telemetry."
      );
    } finally {
      setLoading(false);
    }
  }, [auth, cycleFilter, isAuthorized]);

  // Load Evaluator Deviation Metrics
  const loadEvaluatorMetrics = useCallback(async () => {
    if (!isAuthorized) {
      setLoadingMetrics(false);
      return;
    }

    setLoadingMetrics(true);
    try {
      const metrics = await analyticsService.getEvaluatorMetrics(
        {
          evaluationCycleId: cycleFilter.trim() ? cycleFilter.trim() : undefined,
          minSampleSize: 1,
        },
        auth
      );
      setEvaluatorMetrics(metrics);
    } catch {
      setEvaluatorMetrics([]);
    } finally {
      setLoadingMetrics(false);
    }
  }, [auth, cycleFilter, isAuthorized]);

  const refreshAll = useCallback(() => {
    loadPulse();
    loadEvaluatorMetrics();
  }, [loadPulse, loadEvaluatorMetrics]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const handleDrillDown = (hotspot: QualityHotspot) => {
    setSelectedHotspot(hotspot);
    setIsDrillDownOpen(true);
  };

  const handleSentinelSuccess = (result: TriggerSentinelResponse) => {
    setSentinelNotice({
      message: `Cohort anomaly detection scan completed across ${result.evaluatorsAnalyzed} active evaluators.`,
      anomalies: result.anomaliesDetected,
      newSignals: result.newSignalsGenerated,
    });
    refreshAll();
  };

  // Role Boundary Guard
  if (!isAuthorized) {
    return (
      <div className="osm-page-container" style={{ padding: "2rem" }}>
        <Alert
          type="warning"
          title="Restricted Quality Telemetry View"
          message="QualityPulse analytics, cohort scoring metrics, and anomaly detection are restricted exclusively to authorized Moderators and Examination Administrators."
        />
      </div>
    );
  }

  return (
    <div className="osm-quality-pulse-page" id="osm-quality-pulse-dashboard">
      {/* Top Banner and Controls */}
      <div className="osm-pulse-header">
        <div>
          <div className="osm-pulse-title-row">
            <h1 className="osm-pulse-title" id="pulse-dashboard-title">
              QualityPulse Analytics
            </h1>
            <span className="osm-pulse-badge">Cohort Telemetry</span>
          </div>
          <p className="osm-pulse-subtitle">
            Real-time examination progress, quality health indicators, examiner scoring variance,
            and emerging supervisory hotspots.
          </p>
        </div>

        <div className="osm-pulse-controls">
          <div className="osm-pulse-filter-group">
            <Input
              id="pulse-cycle-filter-input"
              type="text"
              placeholder="Filter by cycle ID..."
              value={cycleFilter}
              onChange={(e) => setCycleFilter(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && refreshAll()}
            />
            <Button
              variant="secondary"
              size="sm"
              id="btn-apply-cycle-filter"
              onClick={refreshAll}
              disabled={loading}
            >
              Filter
            </Button>
          </div>

          <Button
            variant="secondary"
            size="sm"
            id="btn-refresh-pulse"
            onClick={refreshAll}
            loading={loading || loadingMetrics}
          >
            ↻ Refresh
          </Button>

          {isAdmin && (
            <Button
              variant="primary"
              size="sm"
              id="btn-open-sentinel-modal"
              onClick={() => setIsSentinelModalOpen(true)}
              disabled={loading}
            >
              ⚡ Run Anomaly Detection
            </Button>
          )}
        </div>
      </div>

      {/* Sentinel Scan Completion Notification */}
      {sentinelNotice && (
        <div style={{ marginBottom: "1.5rem" }}>
          <Alert
            type="success"
            title="Statistical Scan Complete"
            message={`${sentinelNotice.message} (${sentinelNotice.anomalies} anomalies identified, ${sentinelNotice.newSignals} new quality signals generated).`}
          />
        </div>
      )}

      {/* Query Error Alert */}
      {error && (
        <div style={{ marginBottom: "1.5rem" }}>
          <Alert type="danger" title="Telemetry Query Error" message={error} />
        </div>
      )}

      {/* Loading Skeletons */}
      {loading && !pulse ? (
        <div className="osm-pulse-loading-grid">
          <Skeleton variant="rectangle" width="100%" height="180px" />
          <Skeleton variant="rectangle" width="100%" height="180px" />
        </div>
      ) : pulse ? (
        <>
          {/* 1. Cohort Health Telemetry Section */}
          <CohortHealthCard overview={pulse} />

          {/* 2. Evaluator Scoring Deviation Section */}
          <div style={{ marginTop: "2rem" }}>
            <EvaluatorDeviationTable
              metrics={evaluatorMetrics}
              loading={loadingMetrics}
            />
          </div>

          {/* 3. Emerging Hotspots Section */}
          <section className="osm-pulse-hotspots-section" id="osm-pulse-hotspots-section">
            <div className="osm-hotspots-header">
              <div>
                <h2 className="osm-hotspots-title">Emerging Quality Hotspots</h2>
                <p className="osm-hotspots-desc">
                  Prioritized concentration clusters across evaluators, questions, and signals
                  warranting human moderator investigation.
                </p>
              </div>
              <span className="osm-hotspots-count-chip" id="pulse-hotspots-count">
                {pulse.topHotspots.length} Detected
              </span>
            </div>

            {pulse.topHotspots.length === 0 ? (
              <EmptyState
                title="No Emerging Hotspots Detected"
                description="Cohort marking distributions are currently within normal statistical tolerance thresholds."
                icon="✓"
              />
            ) : (
              <div className="osm-hotspots-grid" id="pulse-hotspots-list">
                {pulse.topHotspots.map((hotspot, idx) => {
                  const targetName =
                    hotspot.hotspotType === "EVALUATOR_ANOMALY"
                      ? getActorDisplayName(hotspot.targetId)
                      : hotspot.targetId;

                  return (
                    <div
                      key={`${hotspot.hotspotType}-${hotspot.targetId}-${idx}`}
                      className="osm-hotspot-item-card"
                      id={`hotspot-card-${idx}`}
                    >
                      <div className="osm-hotspot-item-top">
                        <div className="osm-hotspot-item-badges">
                          <StatusBadge status={hotspot.severity} size="sm" showDot={false} />
                          <span className="osm-hotspot-type-tag">{hotspot.hotspotType}</span>
                        </div>
                        <span className="osm-hotspot-target-pill osm-mono">
                          {targetName}
                        </span>
                      </div>

                      <h4 className="osm-hotspot-item-title">{hotspot.title}</h4>
                      <p className="osm-hotspot-item-desc">{hotspot.description}</p>

                      <div className="osm-hotspot-item-footer">
                        <Button
                          variant="secondary"
                          size="sm"
                          id={`btn-drilldown-hotspot-${idx}`}
                          onClick={() => handleDrillDown(hotspot)}
                        >
                          🔍 Inspect Evidence
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      ) : null}

      {/* Hotspot Drill-Down Modal */}
      <HotspotDrillDownModal
        hotspot={selectedHotspot}
        isOpen={isDrillDownOpen}
        onClose={() => setIsDrillDownOpen(false)}
      />

      {/* Sentinel Anomaly Scan Modal */}
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
