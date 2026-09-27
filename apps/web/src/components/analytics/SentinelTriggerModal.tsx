import React, { useState } from "react";
import type { TriggerSentinelResponse } from "@osm/shared";
import { UserRole } from "@osm/shared";
import { analyticsService } from "../../services/analytics-service.ts";
import type { AuthContext } from "../../services/api-client.ts";
import { Modal, Button, Input, Alert } from "../ui";

export interface SentinelTriggerModalProps {
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

  const isAdmin = auth.role === UserRole.ADMIN;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      setError("Administrative authorization is required to trigger cohort anomaly detection scans.");
      return;
    }

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
        err instanceof Error ? err.message : "Failed to execute cohort anomaly detection scan."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Execute Statistical Anomaly Detection"
      size="md"
    >
      <form onSubmit={handleSubmit} className="osm-modal-form" id="sentinel-trigger-form">
        <p className="osm-modal-intro">
          Initiate automated statistical evaluation across the active candidate cohort. Identifies
          evaluator scoring variance exceeding peer thresholds and materializes actionable quality
          signals for supervisory moderation.
        </p>

        {!isAdmin && (
          <div style={{ marginBottom: "1rem" }}>
            <Alert
              type="warning"
              title="Administrator Role Required"
              message="Cohort-wide Sentinel scans are restricted to Examination Administrators. Switch to Administrator role to execute this scan."
            />
          </div>
        )}

        {error && (
          <div style={{ marginBottom: "1rem" }}>
            <Alert type="danger" title="Scan Execution Failed" message={error} />
          </div>
        )}

        <div className="osm-form-group">
          <label htmlFor="input-sentinel-cycle" className="osm-form-label">
            Examination Cycle ID (Optional)
          </label>
          <Input
            id="input-sentinel-cycle"
            type="text"
            placeholder="e.g. cycle-2026-demo"
            value={cycleId}
            onChange={(e) => setCycleId(e.target.value)}
            disabled={loading || !isAdmin}
          />
        </div>

        <div className="osm-form-row-2">
          <div className="osm-form-group">
            <label htmlFor="input-sentinel-sample" className="osm-form-label">
              Min. Sample Size (N scripts)
            </label>
            <Input
              id="input-sentinel-sample"
              type="number"
              min="1"
              max="50"
              value={minSampleSize}
              onChange={(e) => setMinSampleSize(Number(e.target.value))}
              disabled={loading || !isAdmin}
            />
          </div>

          <div className="osm-form-group">
            <label htmlFor="input-sentinel-threshold" className="osm-form-label">
              Moderate Threshold (Δ %)
            </label>
            <Input
              id="input-sentinel-threshold"
              type="number"
              min="5"
              max="50"
              value={thresholdPercent}
              onChange={(e) => setThresholdPercent(Number(e.target.value))}
              disabled={loading || !isAdmin}
            />
          </div>
        </div>

        <div className="osm-form-group">
          <label htmlFor="input-sentinel-critical" className="osm-form-label">
            Critical Threshold (Δ %)
          </label>
          <Input
            id="input-sentinel-critical"
            type="number"
            min="10"
            max="100"
            value={criticalThresholdPercent}
            onChange={(e) => setCriticalThresholdPercent(Number(e.target.value))}
            disabled={loading || !isAdmin}
          />
        </div>

        <div className="osm-modal-actions-right" style={{ marginTop: "1.5rem" }}>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            id="btn-confirm-sentinel-scan"
            loading={loading}
            disabled={!isAdmin}
          >
            ⚡ Run Detection Scan
          </Button>
        </div>
      </form>
    </Modal>
  );
};
