import React, { useState } from "react";
import type { TriageCaseResponse, ResolveTriageCaseRequest } from "@osm/shared";
import { ResolutionOutcome } from "@osm/shared";
import { ApiError } from "../../services/api-client.ts";
import { Modal, Button, Textarea, Alert } from "../ui";

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
      setError("Please provide a substantive academic rationale justifying this resolution.");
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
          setError("Concurrency Conflict: This moderation case was modified by another reviewer. Please reload the latest case state before attempting resolution.");
        } else if (err.statusCode === 403) {
          setError(err.message || "Forbidden: Only authorized Moderators or Administrators can resolve moderation cases.");
        } else {
          setError(err.message || `Server Error (${err.statusCode})`);
        }
      } else {
        setError(err instanceof Error ? err.message : "Failed to record case resolution.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Record Authoritative Case Resolution"
      size="md"
      footer={
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", width: "100%" }}>
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
            id="btn-cancel-resolution"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={isSubmitting}
            disabled={!reason.trim()}
            onClick={handleSubmit}
            id="btn-confirm-resolve"
          >
            Confirm Resolution ⚖️
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        <p style={{ color: "var(--osm-text-secondary)", fontSize: "0.875rem", lineHeight: 1.5, margin: 0 }}>
          Recording final moderation decision for Case <strong>{triageCase.caseNumber}</strong>. This action is authoritative, permanent, and cryptographically registered in the audit ledger.
        </p>

        {error && (
          <Alert
            type={isConflict ? "warning" : "danger"}
            message={error}
            action={
              isConflict ? (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    onRefreshCase();
                    onClose();
                  }}
                >
                  Reload Case
                </Button>
              ) : undefined
            }
          />
        )}

        {/* Outcome Selector */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <label htmlFor="select-resolution-outcome" style={{ fontSize: "0.8125rem", fontWeight: 500, color: "var(--osm-text-secondary)" }}>
            Resolution Outcome <span style={{ color: "var(--osm-danger)" }}>*</span>
          </label>
          <select
            id="select-resolution-outcome"
            className="osm-queue-filter-select"
            style={{ width: "100%", padding: "0.5rem 0.75rem", fontSize: "0.875rem" }}
            value={outcome}
            onChange={(e) => setOutcome(e.target.value as ResolutionOutcome)}
            disabled={isSubmitting}
          >
            <option value={ResolutionOutcome.CONFIRMED_VALID}>
              CONFIRMED_VALID — Evaluator marks confirmed as compliant with rubric criteria
            </option>
            <option value={ResolutionOutcome.LEGITIMATE_VARIATION}>
              LEGITIMATE_VARIATION — Scoring variance represents acceptable academic discretion
            </option>
            <option value={ResolutionOutcome.CORRECTION_REQUIRED}>
              CORRECTION_REQUIRED — Scoring anomaly verified; re-evaluation or mark correction required
            </option>
            <option value={ResolutionOutcome.ESCALATED}>
              ESCALATED — Escalated to Chief Examiner and Academic Review Committee
            </option>
            <option value={ResolutionOutcome.DISMISSED}>
              DISMISSED — Signal dismissed as ungrounded or false-positive
            </option>
          </select>
          <span style={{ fontSize: "0.75rem", color: "var(--osm-text-muted)" }}>
            Selected outcome establishes the official academic finding for this moderation investigation.
          </span>
        </div>

        {/* Mandatory Rationale */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <label htmlFor="input-resolution-reason" style={{ fontSize: "0.8125rem", fontWeight: 500, color: "var(--osm-text-secondary)" }}>
              Substantive Rationale & Findings <span style={{ color: "var(--osm-danger)" }}>*</span>
            </label>
            <span style={{ fontSize: "0.75rem", color: "var(--osm-text-muted)", fontFamily: "var(--osm-font-mono)" }}>
              {reason.length} / 500
            </span>
          </div>
          <Textarea
            id="input-resolution-reason"
            rows={3}
            maxLength={500}
            placeholder="Explain the academic evidence, rubric alignment, and factual basis justifying this resolution..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={isSubmitting}
          />
        </div>

        {/* Optional Notes */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <label htmlFor="input-resolution-notes" style={{ fontSize: "0.8125rem", fontWeight: 500, color: "var(--osm-text-secondary)" }}>
            Internal Moderation Notes (Optional)
          </label>
          <Textarea
            id="input-resolution-notes"
            rows={2}
            placeholder="Add internal supervisory notes or policy recommendations for future examination cycles..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={isSubmitting}
          />
        </div>
      </form>
    </Modal>
  );
};
