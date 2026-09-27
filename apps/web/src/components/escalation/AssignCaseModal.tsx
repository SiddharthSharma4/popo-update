import React, { useState } from "react";
import type { TriageCaseResponse } from "@osm/shared";
import { ApiError } from "../../services/api-client.ts";
import { Modal, Button, Input, Alert } from "../ui";

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
      setError("Please specify an authorized moderator identifier.");
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
          setError("Concurrency Conflict: This moderation case was modified by another reviewer. Please reload the latest case state.");
        } else if (err.statusCode === 403) {
          setError(err.message || "Forbidden: Only authorized Moderators or Administrators can assign cases.");
        } else {
          setError(err.message || `Server Error (${err.statusCode})`);
        }
      } else {
        setError(err instanceof Error ? err.message : "Failed to assign moderation case.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={triageCase.assigneeId ? "Reassign Moderation Case" : "Assign Moderation Case"}
      size="sm"
      footer={
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", width: "100%" }}>
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
            id="btn-cancel-assign"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={isSubmitting}
            disabled={!assigneeId.trim()}
            onClick={handleSubmit}
            id="btn-submit-assign"
          >
            Confirm Assignment
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <p style={{ color: "var(--osm-text-secondary)", fontSize: "0.875rem", lineHeight: 1.5, margin: 0 }}>
          Assigning case <strong>{triageCase.caseNumber}</strong> to an academic reviewer for formal evidence investigation and resolution.
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

        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <label htmlFor="input-assignee-id" style={{ fontSize: "0.8125rem", fontWeight: 500, color: "var(--osm-text-secondary)" }}>
            Assigned Reviewer ID <span style={{ color: "var(--osm-danger)" }}>*</span>
          </label>
          <Input
            id="input-assignee-id"
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
            placeholder="e.g. moderator_1"
            disabled={isSubmitting}
          />
          <span style={{ fontSize: "0.75rem", color: "var(--osm-text-muted)" }}>
            Select an authorized moderator or academic controller to take ownership of this investigation.
          </span>
        </div>
      </form>
    </Modal>
  );
};
