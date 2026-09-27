import React from "react";
import type { QualityPulseOverview } from "@osm/shared";
import { StatusBadge } from "../ui";

export interface CohortHealthCardProps {
  overview: QualityPulseOverview;
}

export const CohortHealthCard: React.FC<CohortHealthCardProps> = ({ overview }) => {
  const { progress, health, signalsOverview, moderationOverview } = overview;

  return (
    <div className="osm-cohort-health-section" id="osm-cohort-health-card">
      <div className="osm-pulse-telemetry-grid">
        {/* 1. Evaluation Progress */}
        <div className="osm-telemetry-card" id="card-pulse-progress">
          <div className="osm-telemetry-card-header">
            <span className="osm-telemetry-tag">Throughput</span>
            <h3 className="osm-telemetry-title">Evaluation Progress</h3>
          </div>

          <div className="osm-telemetry-stat-row">
            <div className="osm-stat-block">
              <span className="osm-stat-num" id="stat-progress-total">
                {progress.total}
              </span>
              <span className="osm-stat-label">Total Booklets</span>
            </div>
            <div className="osm-stat-block">
              <span className="osm-stat-num" id="stat-progress-percent">
                {progress.completionPercentage}%
              </span>
              <span className="osm-stat-label">Completed</span>
            </div>
          </div>

          <div className="osm-progress-bar-track">
            <div
              className="osm-progress-bar-fill"
              id="pulse-progress-bar-fill"
              style={{ width: `${Math.min(100, progress.completionPercentage)}%` }}
            />
          </div>

          <div className="osm-telemetry-mini-grid">
            <div className="osm-mini-stat">
              <span className="osm-mini-label">Submitted:</span>
              <strong className="osm-mono">{progress.submitted}</strong>
            </div>
            <div className="osm-mini-stat">
              <span className="osm-mini-label">In Progress:</span>
              <strong className="osm-mono">{progress.inProgress}</strong>
            </div>
            <div className="osm-mini-stat">
              <span className="osm-mini-label">Draft:</span>
              <strong className="osm-mono">{progress.draft}</strong>
            </div>
            <div className="osm-mini-stat">
              <span className="osm-mini-label">Finalized:</span>
              <strong className="osm-mono">{progress.finalized}</strong>
            </div>
          </div>
        </div>

        {/* 2. Quality Health Index */}
        <div className="osm-telemetry-card" id="card-pulse-health">
          <div className="osm-telemetry-card-header">
            <span className="osm-telemetry-tag">Cohort Health</span>
            <h3 className="osm-telemetry-title">Quality Health Index</h3>
          </div>

          <div className="osm-health-score-container">
            <div className="osm-health-gauge-box">
              <span className="osm-health-score-number" id="stat-health-index">
                {health.healthIndex}
              </span>
              <span className="osm-health-score-denom">/ 100</span>
            </div>

            <div className="osm-health-risk-info">
              <span className="osm-risk-label">Cohort Risk Level:</span>
              <StatusBadge status={health.riskLevel} size="md" showDot={false} />
              <span className="osm-signals-hint" id="stat-evaluations-with-signals">
                {health.evaluationsWithSignalsCount} evaluation(s) flagged with quality signals
              </span>
            </div>
          </div>

          <p className="osm-telemetry-explanation">
            Derived quality score reflects cohort marking consistency, flag volume, and sample distributions.
          </p>
        </div>

        {/* 3. Quality Signals Summary */}
        <div className="osm-telemetry-card" id="card-pulse-signals">
          <div className="osm-telemetry-card-header">
            <span className="osm-telemetry-tag">Detector Signals</span>
            <h3 className="osm-telemetry-title">Signals Summary</h3>
          </div>

          <div className="osm-telemetry-stat-row">
            <div className="osm-stat-block">
              <span className="osm-stat-num" id="stat-signals-total">
                {signalsOverview.total}
              </span>
              <span className="osm-stat-label">Total Signals</span>
            </div>
            <div className="osm-stat-block">
              <span className="osm-stat-num" id="stat-signals-open">
                {signalsOverview.openReviewable}
              </span>
              <span className="osm-stat-label">Active / Open</span>
            </div>
          </div>

          <div className="osm-severity-pills-row" id="pulse-severity-pills">
            <span className="osm-sev-pill osm-sev-pill--critical">
              Critical: {signalsOverview.bySeverity["CRITICAL"] || 0}
            </span>
            <span className="osm-sev-pill osm-sev-pill--high">
              High: {signalsOverview.bySeverity["HIGH"] || 0}
            </span>
            <span className="osm-sev-pill osm-sev-pill--medium">
              Medium: {signalsOverview.bySeverity["MEDIUM"] || 0}
            </span>
            <span className="osm-sev-pill osm-sev-pill--low">
              Low: {signalsOverview.bySeverity["LOW"] || 0}
            </span>
          </div>

          <div className="osm-telemetry-mini-grid">
            <div className="osm-mini-stat">
              <span className="osm-mini-label">In Triage:</span>
              <strong className="osm-mono">{signalsOverview.linkedToCase}</strong>
            </div>
            <div className="osm-mini-stat">
              <span className="osm-mini-label">Resolved:</span>
              <strong className="osm-mono">{signalsOverview.resolved}</strong>
            </div>
            <div className="osm-mini-stat">
              <span className="osm-mini-label">Dismissed:</span>
              <strong className="osm-mono">{signalsOverview.dismissed}</strong>
            </div>
          </div>
        </div>

        {/* 4. Moderation Workload */}
        <div className="osm-telemetry-card" id="card-pulse-moderation">
          <div className="osm-telemetry-card-header">
            <span className="osm-telemetry-tag">Supervisory Triage</span>
            <h3 className="osm-telemetry-title">Moderation Workload</h3>
          </div>

          <div className="osm-telemetry-stat-row">
            <div className="osm-stat-block">
              <span className="osm-stat-num" id="stat-moderation-total">
                {moderationOverview.totalCases}
              </span>
              <span className="osm-stat-label">Triage Cases</span>
            </div>
            <div className="osm-stat-block">
              <span className="osm-stat-num" id="stat-moderation-resolution-rate">
                {moderationOverview.resolutionRate}%
              </span>
              <span className="osm-stat-label">Resolution Rate</span>
            </div>
          </div>

          <div className="osm-telemetry-mini-grid" style={{ marginTop: "1rem" }}>
            <div className="osm-mini-stat">
              <span className="osm-mini-label">Open:</span>
              <strong className="osm-mono" id="stat-moderation-open">{moderationOverview.openCases}</strong>
            </div>
            <div className="osm-mini-stat">
              <span className="osm-mini-label">Assigned:</span>
              <strong className="osm-mono" id="stat-moderation-assigned">{moderationOverview.assignedCases}</strong>
            </div>
            <div className="osm-mini-stat">
              <span className="osm-mini-label">Resolved:</span>
              <strong className="osm-mono" id="stat-moderation-resolved">{moderationOverview.resolvedCases}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
