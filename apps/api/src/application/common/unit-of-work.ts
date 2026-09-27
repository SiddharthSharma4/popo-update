/**
 * Unit of Work abstraction for transactional boundary management.
 * Conforms to docs/contracts/08-data-contract.md §28-31, §68-70
 * and docs/contracts/02-architecture-contract.md §8.
 */

import type { EvaluationRepository } from "../../domain/evaluation/evaluation-repository.js";
import type { RubricRepository } from "../../domain/rubric/rubric-repository.js";
import type { QualitySignalRepository } from "../../domain/quality-signal/quality-signal-repository.js";
import type { TriageCaseRepository } from "../../domain/moderation/triage-case-repository.js";
import type { ResolutionRepository } from "../../domain/moderation/resolution-repository.js";


import type { AuditEvent } from "../../domain/audit/audit-event.js";

export interface OutboxEventInput {
  id?: string;
  eventType: string;
  eventVersion?: number;
  aggregateType: string;
  aggregateId: string;
  producer: string;
  actorType: "USER" | "SYSTEM" | "DETECTOR" | "AI" | "INTEGRATION";
  actorId: string;
  correlationId?: string;
  causationId?: string;
  payload: Record<string, unknown>;
}

export interface AuditEventInput {
  id?: string;
  eventType: string;
  actorType: string;
  actorId: string;
  entityType: string;
  entityId: string;
  action: string;
  details: Record<string, unknown>;
  occurredAt?: string;
}

export interface OutboxRepository {
  record(event: OutboxEventInput): Promise<void>;
}

export interface AuditRepository {
  record(event: AuditEvent | AuditEventInput): Promise<void>;
  findById?(id: string): Promise<AuditEvent | null>;
  findByEntity?(entityType: string, entityId: string): Promise<AuditEvent[]>;
}

export interface IdempotencyRecord {
  key: string;
  requestHash: string;
  responseStatus: number;
  responseBody: string;
  createdAt: string;
  expiresAt: string;
}

export interface IdempotencyRepository {
  findByKey(key: string): Promise<IdempotencyRecord | null>;
  save(record: IdempotencyRecord): Promise<void>;
}

export interface UnitOfWorkScope {
  evaluations: EvaluationRepository;
  rubrics: RubricRepository;
  qualitySignals: QualitySignalRepository;
  triageCases: TriageCaseRepository;
  resolutions: ResolutionRepository;
  outbox: OutboxRepository;
  audit: AuditRepository;
  idempotency: IdempotencyRepository;
}

export interface UnitOfWork {
  execute<T>(operation: (scope: UnitOfWorkScope) => Promise<T>): Promise<T>;
}
