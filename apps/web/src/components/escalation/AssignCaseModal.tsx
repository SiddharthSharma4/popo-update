import React, { useState } from "react";
import type { TriageCaseResponse } from "@osm/shared";
import { ApiError } from "../../services/api-client.ts";

interface AssignCaseModalProps {
  triageCase: TriageCaseResponse;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (assigneeId: string, expectedVersion: number) => Promise<void>;
  onRefreshCase: () => void;
}

export const AssignCaseModal: React.FC<AssignCaseModalProps> = ({
  triageCase,
  isOpen,
  onClose,
  onSubmit,
  onRefreshCase,
}) => {
  const [assigneeId, setAssigneeId] = useState<string>(triageCase.assigneeId || "moderator_1");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isConflict, setIsConflict] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigneeId.trim()) {
      setError("Assignee ID is required.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setIsConflict(false);

    try {
      await onSubmit(assigneeId.trim(), triageCase.version);
      onClose();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.statusCode === 409) {
          setIsConflict(true);
          setError("Concurrency Conflict: This case was modified by another reviewer. Please reload.");
        } else if (err.statusCode === 403) {
          setError(err.message || "Forbidden: Only authorized MODERATOR or ADMIN can assign cases.");
        } else {
          setError(err.message || `API Error ${err.statusCode}`);
        }
      } else {
        setError(err instanceof Error ? err.message : "Failed to assign triage case.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" id="osm-assign-modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card" id="osm-assign-modal">
        <div className="modal-header">
          <div>
            <h3 className="modal-title">{triageCase.assigneeId ? "Reassign Case" : "Assign Case"}</h3>
            <p className="modal-subtitle">
              Case: <strong>{triageCase.caseNumber}</strong> (Current Version: {triageCase.version})
            </p>
          </div>
          <button className="btn-close" onClick={onClose} disabled={isSubmitting}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && (
            <div className={`form-error-banner ${isConflict ? "conflict-banner" : ""}`} id="assign-error-banner">
              <span className="error-icon">{isConflict ? "⚠️" : "✕"}</span>
              <div className="error-content">
                <p>{error}</p>
                {isConflict && (
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
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

          <div className="form-group">
            <label htmlFor="input-assignee-id" className="form-label">
              Assignee Moderator ID <span className="required-star">*</span>
            </label>
            <input
              id="input-assignee-id"
              type="text"
              className="form-input"
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              placeholder="e.g. moderator_1, reviewer_senior"
              disabled={isSubmitting}
              required
            />
            <span className="form-hint">
              Assigns this triage case to an authorized human moderator. Transition: <code>OPEN → ASSIGNED</code>.
            </span>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn-secondary"
              id="btn-cancel-assign"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              id="btn-submit-assign"
              disabled={isSubmitting || !assigneeId.trim()}
            >
              {isSubmitting ? "Assigning..." : "Confirm Assignment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
