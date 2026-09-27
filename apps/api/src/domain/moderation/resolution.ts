/**
 * Resolution Domain Entity.
 * Represents an authorized human action/decision taken during moderation/investigation.
 * Conforms to:
 * - docs/contracts/05-domain-contract.md §25-28 (Resolution semantics, authority, reason)
 * - docs/contracts/06-api-contract.md §32-33 (Resolution outcome vs case state)
 * - docs/contracts/08-data-contract.md §22-23 (Resolution persistence & immutability)
 *
 * Invariants:
 * - Must be attributable to an authorized human moderator (MODERATOR or ADMIN).
 * - AI and automated systems cannot create resolutions (INV-003, INV-004).
 * - Requires a non-empty reason/rationale (01-product-contract.md FR-009).
 * - Immutable once created.
 */

import { randomUUID } from "node:crypto";
import { ResolutionOutcome } from "@osm/shared";
import { InvalidArgumentError } from "../errors.js";

export { ResolutionOutcome };

export interface CreateResolutionProps {
  id?: string;
  triageCaseId: string;
  evaluationId: string;
  outcome: ResolutionOutcome;
  reason: string;
  moderatorId: string;
  notes?: string | null;
  evidenceReferences?: string[];
  createdAt?: string;
}

export interface ResolutionProps {
  id: string;
  triageCaseId: string;
  evaluationId: string;
  outcome: ResolutionOutcome;
  reason: string;
  moderatorId: string;
  notes: string | null;
  evidenceReferences: string[];
  createdAt: string;
}

export class Resolution {
  readonly id: string;
  readonly triageCaseId: string;
  readonly evaluationId: string;
  readonly outcome: ResolutionOutcome;
  readonly reason: string;
  readonly moderatorId: string;
  readonly notes: string | null;
  readonly evidenceReferences: string[];
  readonly createdAt: string;

  private constructor(props: ResolutionProps) {
    this.id = props.id;
    this.triageCaseId = props.triageCaseId;
    this.evaluationId = props.evaluationId;
    this.outcome = props.outcome;
    this.reason = props.reason;
    this.moderatorId = props.moderatorId;
    this.notes = props.notes;
    this.evidenceReferences = [...props.evidenceReferences];
    this.createdAt = props.createdAt;
  }

  static create(props: CreateResolutionProps): Resolution {
    if (!props.triageCaseId?.trim()) {
      throw new InvalidArgumentError("TriageCase ID is required for Resolution.");
    }
    if (!props.evaluationId?.trim()) {
      throw new InvalidArgumentError("Evaluation ID is required for Resolution.");
    }
    if (!props.outcome || !Object.values(ResolutionOutcome).includes(props.outcome)) {
      throw new InvalidArgumentError(`Invalid resolution outcome: ${props.outcome}`);
    }
    if (!props.reason?.trim()) {
      throw new InvalidArgumentError("Reason is required for Resolution.");
    }
    if (!props.moderatorId?.trim()) {
      throw new InvalidArgumentError("Moderator ID is required for Resolution.");
    }

    const now = new Date().toISOString();
    return new Resolution({
      id: props.id?.trim() || randomUUID(),
      triageCaseId: props.triageCaseId.trim(),
      evaluationId: props.evaluationId.trim(),
      outcome: props.outcome,
      reason: props.reason.trim(),
      moderatorId: props.moderatorId.trim(),
      notes: props.notes?.trim() || null,
      evidenceReferences: props.evidenceReferences ?? [],
      createdAt: props.createdAt ?? now,
    });
  }

  static reconstitute(props: ResolutionProps): Resolution {
    return new Resolution(props);
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      triageCaseId: this.triageCaseId,
      evaluationId: this.evaluationId,
      outcome: this.outcome,
      reason: this.reason,
      moderatorId: this.moderatorId,
      notes: this.notes,
      evidenceReferences: [...this.evidenceReferences],
      createdAt: this.createdAt,
    };
  }
}
