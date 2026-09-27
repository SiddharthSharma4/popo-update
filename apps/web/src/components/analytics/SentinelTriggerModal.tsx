import React, { useState } from "react";
import type { TriggerSentinelResponse } from "@osm/shared";
import { analyticsService } from "../../services/analytics-service.ts";
import type { AuthContext } from "../../services/api-client.ts";

interface SentinelTriggerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (result: TriggerSentinelResponse) => void;
  auth: AuthContext;
  currentCycleId?: string;
}

export const SentinelTriggerModal: React.FC<SentinelTriggerModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  auth,
  currentCycleId,
}) => {
  const [cycleId, setCycleId] = useState<string>(currentCycleId || "");
  const [minSampleSize, setMinSampleSize] = useState<number>(5);
  const [thresholdPercent, setThresholdPercent] = useState<number>(15);
  const [criticalThresholdPercent, setCriticalThresholdPercent] = useState<number>(25);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await analyticsService.triggerSentinel(
        {
          evaluationCycleId: cycleId.trim() ? cycleId.trim() : undefined,
          minSampleSize: Number(minSampleSize) || 5,
          thresholdPercent: Number(thresholdPercent) || 15,
          criticalThresholdPercent: Number(criticalThresholdPercent) || 25,
        },
        auth
      );

      onSuccess(response);
      onClose();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to execute SentinelFlag scan"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" id="osm-sentinel-modal-backdrop" onClick={onClose}>
      <div
        className="modal-container sentinel-trigger-modal"
        id="osm-sentinel-trigger-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="sentinel-modal-title-row">
            <span className="brand-badge">Phase 4 / Phase 8</span>
            <h2 className="modal-title" id="sentinel-modal-title">
              Execute SentinelFlag Anomaly Scan
            </h2>
          </div>
          <button
            className="btn-modal-close"
            id="btn-close-sentinel-modal"
            onClick={onClose}
            disabled={loading}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form" id="sentinel-trigger-form">
          <p className="modal-intro-text">
            Trigger statistical evaluation analysis across the active cohort. Detects evaluator
            score deviations beyond peer thresholds and materializes actionable QualitySignals for
            moderation triage (<code>01-product §16</code>, <code>INV-004</code>).
          </p>

          {error && (
            <div className="form-error-banner" id="sentinel-trigger-error-banner">
              <span className="error-icon">⚠</span>
              <div className="error-content">
                <strong>Sentinel Execution Failed:</strong>
                <span>{error}</span>
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="sentinel-cycle-id">
              Evaluation Cycle ID (Optional Filter)
            </label>
            <input
              id="sentinel-cycle-id"
              type="text"
              className="form-input"
              value={cycleId}
              onChange={(e) => setCycleId(e.target.value)}
              placeholder="e.g. cycle_2026_term1 (Leave empty for all cycles)"
              disabled={loading}
            />
            <span className="form-hint">
              Filters statistical analysis to evaluations within this cycle boundary.
            </span>
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label" htmlFor="sentinel-min-sample">
                Minimum Sample Size (N)
              </label>
              <input
                id="sentinel-min-sample"
                type="number"
                min="1"
                max="100"
                className="form-input"
                value={minSampleSize}
                onChange={(e) => setMinSampleSize(Math.max(1, parseInt(e.target.value) || 1))}
                disabled={loading}
              />
              <span className="form-hint">
                Evaluators with fewer evaluations are tagged <code>INSUFFICIENT_DATA</code>.
              </span>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="sentinel-threshold">
                Moderate Deviation (Δ %)
              </label>
              <input
                id="sentinel-threshold"
                type="number"
                min="1"
                max="50"
                className="form-input"
                value={thresholdPercent}
                onChange={(e) => setThresholdPercent(Math.max(1, parseInt(e.target.value) || 15))}
                disabled={loading}
              />
              <span className="form-hint">Deviation threshold for HIGH severity signals.</span>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="sentinel-critical-threshold">
              Critical Deviation (Δ %)
            </label>
            <input
              id="sentinel-critical-threshold"
              type="number"
              min="5"
              max="100"
              className="form-input"
              value={criticalThresholdPercent}
              onChange={(e) =>
                setCriticalThresholdPercent(Math.max(5, parseInt(e.target.value) || 25))
              }
              disabled={loading}
            />
            <span className="form-hint">Deviation threshold for CRITICAL severity signals.</span>
          </div>

          <div className="concurrency-info-box">
            <strong>Non-Authoritative Invariant (INV-003):</strong> SentinelFlag scans generate
            quality signals for human moderator review. Authoritative student marks, question scores,
            and evaluation statuses remain strictly unaltered.
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn-secondary"
              id="btn-cancel-sentinel"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary btn-sentinel-run"
              id="btn-submit-sentinel"
              disabled={loading}
            >
              {loading ? "Analyzing Cohort..." : "⚡ Run Sentinel Detection"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
