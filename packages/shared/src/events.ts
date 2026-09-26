/**
 * Canonical event envelope and actor models.
 * Conforms to docs/contracts/07-event-contract.md §14-15.
 */

import { ActorType } from "./enums.js";

export interface ActorReference {
  type: ActorType;
  id: string;
}

export interface AggregateReference {
  type: string;
  id: string;
}

export interface EventEnvelope<T = Record<string, unknown>> {
  eventId: string;
  eventType: string;
  eventVersion: number;
  occurredAt: string; // ISO 8601 UTC
  producer: string;
  actor: ActorReference;
  aggregate: AggregateReference;
  correlationId: string;
  causationId: string;
  payload: T;
}
