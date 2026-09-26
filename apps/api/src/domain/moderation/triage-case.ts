/**
 * TriageCase Aggregate Root.
 * Represents a human investigation workflow created to investigate one or more QualitySignals.
 * Conforms to:
 * - docs/contracts/05-domain-contract.md §22-24 (TriageCase aggregate & lifecycle)
 * - docs/contracts/06-api-contract.md §29-32 (TriageCase API boundaries)
 * - docs/contracts/08-data-contract.md §20-21 (TriageCase persistence)
 *
 * Invariants:
 * - Represents workflow state, distinct from QualitySignal observation.
 * - Human-only moderation authority; AI cannot create or assign triage cases.
 * - Monotonically increasing version for optimistic concurrency control.
 * - Hard boundary: Resolution logic belongs to TASK-P5-MOD-002 and is NOT implemented here.
 */

import { randomUUID } from "node:crypto";
import { TriageCaseStatus, SignalSeverity } from "@osm/shared";
import { InvalidArgumentError, InvalidStateTransitionError } from "../errors.js";

export { TriageCaseStatus };

export interface CreateTriageCaseProps {
  id?: string;
  caseNumber?: string;
  evaluationId: string;
  evaluationCycleId: string;
  qualitySignalId: string;
  priority?: string | SignalSeverity;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface TriageCaseProps {
  id: string;
  caseNumber: string;
  evaluationId: string;
  evaluationCycleId: string;
  qualitySignalId: string;
  status: TriageCaseStatus;
  priority: string;
  assigneeId: string | null;
  notes: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export class TriageCase {
  readonly id: string;
  readonly caseNumber: string;
  readonly evaluationId: string;
  readonly evaluationCycleId: string;
  readonly qualitySignalId: string;
  private _status: TriageCaseStatus;
  private _priority: string;
  private _assigneeId: string | null;
  private _notes: string | null;
  private _version: number;
  readonly createdAt: string;
  private _updatedAt: string;

  private constructor(props: TriageCaseProps) {
    this.id = props.id;
    this.caseNumber = props.caseNumber;
    this.evaluationId = props.evaluationId;
    this.evaluationCycleId = props.evaluationCycleId;
    this.qualitySignalId = props.qualitySignalId;
    this._status = props.status;
    this._priority = props.priority;
    this._assigneeId = props.assigneeId;
    this._notes = props.notes;
    this._version = props.version;
    this.createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  static create(props: CreateTriageCaseProps): TriageCase {
    if (!props.evaluationId?.trim()) {
      throw new InvalidArgumentError("Evaluation ID is required for TriageCase.");
    }
    if (!props.evaluationCycleId?.trim()) {
      throw new InvalidArgumentError("Evaluation cycle ID is required for TriageCase.");
    }
    if (!props.qualitySignalId?.trim()) {
      throw new InvalidArgumentError("QualitySignal ID is required for TriageCase.");
    }

    const now = new Date().toISOString();
    const id = props.id?.trim() || randomUUID();
    const caseNumber =
      props.caseNumber?.trim() ||
      `CASE-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    return new TriageCase({
      id,
      caseNumber,
      evaluationId: props.evaluationId.trim(),
      evaluationCycleId: props.evaluationCycleId.trim(),
      qualitySignalId: props.qualitySignalId.trim(),
      status: TriageCaseStatus.OPEN,
      priority: props.priority ?? SignalSeverity.MEDIUM,
      assigneeId: null,
      notes: props.notes ?? null,
      version: 1,
      createdAt: props.createdAt ?? now,
      updatedAt: props.updatedAt ?? now,
    });
  }

  static reconstitute(props: TriageCaseProps): TriageCase {
    return new TriageCase(props);
  }

  get status(): TriageCaseStatus {
    return this._status;
  }

  get priority(): string {
    return this._priority;
  }

  get assigneeId(): string | null {
    return this._assigneeId;
  }

  get notes(): string | null {
    return this._notes;
  }

  get version(): number {
    return this._version;
  }

  get updatedAt(): string {
    return this._updatedAt;
  }

  assign(assigneeId: string, _actorId?: string): void {
    if (!assigneeId?.trim()) {
      throw new InvalidArgumentError("Assignee ID is required to assign TriageCase.");
    }

    if (this._status === TriageCaseStatus.RESOLVED) {
      throw new InvalidStateTransitionError(
        "TriageCase",
        this._status,
        TriageCaseStatus.ASSIGNED
      );
    }

    this._assigneeId = assigneeId.trim();
    if (this._status === TriageCaseStatus.OPEN) {
      this._status = TriageCaseStatus.ASSIGNED;
    }
    this._version += 1;
    this._updatedAt = new Date().toISOString();
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      caseNumber: this.caseNumber,
      evaluationId: this.evaluationId,
      evaluationCycleId: this.evaluationCycleId,
      qualitySignalId: this.qualitySignalId,
      status: this._status,
      priority: this._priority,
      assigneeId: this._assigneeId,
      notes: this._notes,
      version: this._version,
      createdAt: this.createdAt,
      updatedAt: this._updatedAt,
    };
  }
}
