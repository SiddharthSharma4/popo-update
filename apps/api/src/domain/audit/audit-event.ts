/**
 * AuditEvent Domain Entity.
 * Represents an immutable, append-only historical record of an important action or state transition.
 * Conforms to:
 * - docs/contracts/02-architecture-contract.md §37-38 (Audit module & domain distinction)
 * - docs/contracts/05-domain-contract.md §29-31, INV-005 (Audit authority & immutability)
 * - docs/contracts/06-api-contract.md §37-40 (Audit semantics & immutability)
 * - docs/contracts/07-event-contract.md §8, §66-68 (Domain event vs Audit event)
 * - docs/contracts/08-data-contract.md §24-27 (AuditEvent persistence & integrity)
 *
 * Invariants:
 * - Represents what actually happened (committed state changes only).
 * - Strictly append-only and immutable after creation; details cannot be mutated.
 * - Non-authority: audit records do not mutate operational business state (INV-005).
 */

import { randomUUID } from "node:crypto";
import { InvalidArgumentError } from "../errors.js";

export type AuditActorType = "USER" | "SYSTEM" | "DETECTOR" | "AI" | "INTEGRATION";

export interface CreateAuditEventProps {
  id?: string;
  eventType: string;
  actorType: string | AuditActorType;
  actorId: string;
  entityType: string;
  entityId: string;
  action: string;
  details: Record<string, unknown>;
  occurredAt?: string;
}

export interface AuditEventProps {
  id: string;
  eventType: string;
  actorType: string;
  actorId: string;
  entityType: string;
  entityId: string;
  action: string;
  details: Readonly<Record<string, unknown>>;
  occurredAt: string;
}

export class AuditEvent {
  readonly id: string;
  readonly eventType: string;
  readonly actorType: string;
  readonly actorId: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly action: string;
  readonly details: Readonly<Record<string, unknown>>;
  readonly occurredAt: string;

  private constructor(props: AuditEventProps) {
    this.id = props.id;
    this.eventType = props.eventType;
    this.actorType = props.actorType;
    this.actorId = props.actorId;
    this.entityType = props.entityType;
    this.entityId = props.entityId;
    this.action = props.action;
    this.details = Object.freeze({ ...props.details });
    this.occurredAt = props.occurredAt;
    Object.freeze(this);
  }

  static create(props: CreateAuditEventProps): AuditEvent {
    if (!props.eventType?.trim()) {
      throw new InvalidArgumentError("Event type is required for AuditEvent.");
    }
    if (!props.actorType?.trim()) {
      throw new InvalidArgumentError("Actor type is required for AuditEvent.");
    }
    if (!props.actorId?.trim()) {
      throw new InvalidArgumentError("Actor ID is required for AuditEvent.");
    }
    if (!props.entityType?.trim()) {
      throw new InvalidArgumentError("Entity type is required for AuditEvent.");
    }
    if (!props.entityId?.trim()) {
      throw new InvalidArgumentError("Entity ID is required for AuditEvent.");
    }
    if (!props.action?.trim()) {
      throw new InvalidArgumentError("Action is required for AuditEvent.");
    }
    if (!props.details || typeof props.details !== "object") {
      throw new InvalidArgumentError("Details must be an object for AuditEvent.");
    }

    const id = props.id?.trim() || randomUUID();
    const occurredAt = props.occurredAt?.trim() || new Date().toISOString();

    return new AuditEvent({
      id,
      eventType: props.eventType.trim(),
      actorType: props.actorType.trim(),
      actorId: props.actorId.trim(),
      entityType: props.entityType.trim(),
      entityId: props.entityId.trim(),
      action: props.action.trim(),
      details: props.details,
      occurredAt,
    });
  }

  static reconstitute(props: AuditEventProps): AuditEvent {
    return new AuditEvent(props);
  }
}
