import React, { useState } from "react";
import type { TriageCaseResponse, ResolveTriageCaseRequest } from "@osm/shared";
import { ResolutionOutcome } from "@osm/shared";
import { ApiError } from "../../services/api-client.ts";

interface ResolutionModalProps {
  triageCase: TriageCaseResponse;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (request: ResolveTriageCaseRequest) => Promise<void>;
  onRefreshCase: () => void;
}

export const ResolutionModal: React.FC<ResolutionModalProps> = ({
  triageCase,
  isOpen,
  onClose,
  onSubmit,
  onRefreshCase,
}) => {
  const [outcome, setOutcome] = useState<ResolutionOutcome>(ResolutionOutcome.CONFIRMED_VALID);
  const [reason, setReason] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isConflict, setIsConflict] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError("Resolution reason is mandatory (FR-009). Please enter a substantive rationale.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setIsConflict(false);

    try {
      await onSubmit({
        outcome,
        reason: reason.trim(),
        notes: notes.trim() || undefined,
        evidenceReferences: [triageCase.qualitySignalId],
        expectedVersion: triageCase.version,
      });
      onClose();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.statusCode === 409) {
          setIsConflict(true);
          setError("Concurrency Conflict: This triage case was modified by another reviewer. Please reload the latest state before attempting resolution.");
        } else if (err.statusCode === 403) {
          setError(err.message || "Forbidden: Only authorized MODERATOR or ADMIN can resolve cases.");
        } else {
          setError(err.message || `API Error ${err.statusCode}`);
        }
      } else {
        setError(err instanceof Error ? err.message : "Failed to resolve triage case.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" id="osm-resolution-modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card" id="osm-resolution-modal">
        <div className="modal-header">
          <div>
            <h3 className="modal-title">Record Human Resolution</h3>
            <p className="modal-subtitle">
              Case: <strong>{triageCase.caseNumber}</strong> (Concurrency Version: {triageCase.version})
            </p>
          </div>
          <button className="btn-close" onClick={onClose} disabled={isSubmitting}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && (
            <div className={`form-error-banner ${isConflict ? "conflict-banner" : ""}`} id="resolution-error-banner">
              <span className="error-icon">{isConflict ? "⚠️" : "✕"}</span>
              <div className="error-content">
                <p>{error}</p>
                {isConflict && (
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    id="btn-conflict-refresh"
                    onClick={() => {
                      onRefreshCase();
                      onClose();
                    }}
                  >
                    Reload Latest Case
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Outcome Selector */}
          <div className="form-group">
            <label htmlFor="select-resolution-outcome" className="form-label">
              Resolution Outcome <span className="required-star">*</span>
            </label>
            <select
              id="select-resolution-outcome"
              className="form-select"
              value={outcome}
              onChange={(e) => setOutcome(e.target.value as ResolutionOutcome)}
              disabled={isSubmitting}
            >
              <option value={ResolutionOutcome.CONFIRMED_VALID}>
                CONFIRMED_VALID — Evaluator marks confirmed as compliant
              </option>
              <option value={ResolutionOutcome.LEGITIMATE_VARIATION}>
                LEGITIMATE_VARIATION — Variance is acceptable academic discretion
              </option>
              <option value={ResolutionOutcome.CORRECTION_REQUIRED}>
                CORRECTION_REQUIRED — Scoring anomaly verified; correction needed
              </option>
              <option value={ResolutionOutcome.ESCALATED}>
                ESCALATED — Escalated to Chief Examiner / Review Committee
              </option>
              <option value={ResolutionOutcome.DISMISSED}>
                DISMISSED — False positive / ungrounded signal dismissed
              </option>
            </select>
            <span className="form-hint">
              Selected outcome determines the official domain classification per <code>05-domain §25-28</code>.
            </span>
          </div>

          {/* Mandatory Reason */}
          <div className="form-group">
            <label htmlFor="input-resolution-reason" className="form-label">
              Resolution Reason / Rationale <span className="required-star">*</span>
            </label>
            <textarea
              id="input-resolution-reason"
              className="form-textarea"
              rows={3}
              placeholder="State the substantive findings justifying this resolution (e.g. reviewed answers against question 2 rubric; marks awarded are consistent with criteria)..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isSubmitting}
              required
            />
            <span className="form-hint">
              Mandatory human rationale (FR-009). Stored permanently in immutable audit trail.
            </span>
          </div>

          {/* Optional Reviewer Notes */}
          <div className="form-group">
            <label htmlFor="input-resolution-notes" className="form-label">
              Reviewer Notes (Optional)
            </label>
            <textarea
              id="input-resolution-notes"
              className="form-textarea"
              rows={2}
              placeholder="Additional internal notes for subsequent moderation cycles..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          {/* Concurrency Info */}
          <div className="concurrency-info-box">
            <span>🔒 Concurrency Guard: Expected Version <strong>{triageCase.version}</strong></span>
          </div>

          {/* Modal Actions */}
          <div className="modal-actions">
            <button
              type="button"
              className="btn-secondary"
              id="btn-cancel-resolution"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              id="btn-submit-resolution"
              disabled={isSubmitting || !reason.trim()}
            >
              {isSubmitting ? "Submitting Resolution..." : "Confirm & Record Resolution"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
