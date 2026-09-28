import React from "react";
import type { EvaluatorDeviationMetric } from "@osm/shared";
import { EvaluatorDeviationStatus } from "@osm/shared";
import { getActorDisplayName } from "../../services/actor-fixtures.ts";
import { Skeleton } from "../ui";

export interface EvaluatorDeviationTableProps {
  metrics: EvaluatorDeviationMetric[];
  loading?: boolean;
}

export const EvaluatorDeviationTable: React.FC<EvaluatorDeviationTableProps> = ({
  metrics,
  loading = false,
}) => {
  const getStatusBadge = (status: EvaluatorDeviationStatus) => {
    switch (status) {
      case EvaluatorDeviationStatus.CRITICAL_DEVIATION:
        return (
          <span className="osm-eval-status-badge osm-eval-status-badge--critical">
            High Deviation Signal (Δ ≥ 25%)
          </span>
        );
      case EvaluatorDeviationStatus.MODERATE_DEVIATION:
        return (
          <span className="osm-eval-status-badge osm-eval-status-badge--moderate">
            Moderate Variance Signal (15–25%)
          </span>
        );
      case EvaluatorDeviationStatus.NORMAL:
        return (
          <span className="osm-eval-status-badge osm-eval-status-badge--normal">
            Expected Variance (Δ &lt; 15%)
          </span>
        );
      case EvaluatorDeviationStatus.INSUFFICIENT_DATA:
      default:
        return (
          <span className="osm-eval-status-badge osm-eval-status-badge--insufficient">
            Limited Sample (N &lt; 5)
          </span>
        );
    }
  };

  return (
    <div className="osm-eval-table-card" id="card-pulse-evaluator-table">
      <div className="osm-eval-table-header">
        <div>
          <h3 className="osm-eval-table-title">Evaluator Cohort Scoring Distribution</h3>
          <p className="osm-eval-table-desc">
            Comparative analysis of examiner scoring averages relative to peer cohort baselines across the active examination cycle.
          </p>
        </div>
        <span className="osm-eval-count-chip">
          {metrics.length} Evaluators Monitored
        </span>
      </div>

      {loading ? (
        <div style={{ padding: "1.5rem" }}>
          <Skeleton variant="rectangle" width="100%" height="160px" />
        </div>
      ) : metrics.length === 0 ? (
        <div className="osm-eval-empty">
          <p>No evaluator scoring telemetry recorded for this cohort.</p>
        </div>
      ) : (
        <div className="osm-eval-table-wrapper">
          <table className="osm-eval-table" id="table-evaluator-deviations">
            <thead>
              <tr>
                <th>Evaluator</th>
                <th>Sample Size (N)</th>
                <th>Mean Score</th>
                <th>Peer Baseline</th>
                <th>Deviation (Δ)</th>
                <th>Std Dev (σ)</th>
                <th>Statistical Signal</th>
                <th>Linked Triage</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((row) => {
                const displayName = getActorDisplayName(row.evaluatorId);
                const isPositive = (row.deviationPercentage ?? 0) >= 0;

                return (
                  <tr key={row.evaluatorId} id={`eval-row-${row.evaluatorId}`}>
                    <td className="osm-eval-cell-name">
                      <strong className="osm-eval-name">{displayName}</strong>
                      <code className="osm-eval-sub-id">{row.evaluatorId}</code>
                    </td>
                    <td className="osm-eval-cell-sample">
                      <span className="osm-mono">{row.evaluationCount} scripts</span>
                    </td>
                    <td className="osm-eval-cell-mean">
                      <strong className="osm-mono">{Number(row.evaluatorMeanPercentage).toFixed(1)}%</strong>
                      <span className="osm-eval-sub-pts">({Number(row.evaluatorMeanScore).toFixed(1)} pts)</span>
                    </td>
                    <td className="osm-eval-cell-peer">
                      <span className="osm-mono">{Number(row.peerMeanPercentage).toFixed(1)}%</span>
                    </td>
                    <td className="osm-eval-cell-delta">
                      <span
                        className={`osm-mono osm-eval-delta ${
                          row.status === EvaluatorDeviationStatus.CRITICAL_DEVIATION
                            ? "osm-eval-delta--critical"
                            : row.status === EvaluatorDeviationStatus.MODERATE_DEVIATION
                            ? "osm-eval-delta--moderate"
                            : ""
                        }`}
                      >
                        {isPositive ? "+" : ""}
                        {Number(row.deviationPercentage).toFixed(1)}%
                      </span>
                    </td>
                    <td className="osm-eval-cell-sd">
                      <span className="osm-mono">±{Number(row.standardDeviation).toFixed(2)}</span>
                    </td>
                    <td className="osm-eval-cell-status">
                      {getStatusBadge(row.status)}
                    </td>
                    <td className="osm-eval-cell-cases">
                      {row.triageCaseCount > 0 ? (
                        <span className="osm-eval-cases-pill">
                          ⚡ {row.triageCaseCount} Case(s)
                        </span>
                      ) : (
                        <span className="osm-eval-none">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Institutional Context Banner */}
      <div className="osm-eval-invariant-notice">
        <span>ℹ️</span>
        <p>
          <strong>Statistical Deviation Notice:</strong> Scoring deviations represent statistical variance from peer cohort averages across evaluated scripts. Deviations are non-evaluative quality signals prompting supervisory review against rubrics; they do not imply misconduct, grading error, or evaluator incompetence.
        </p>
      </div>
    </div>
  );
};
