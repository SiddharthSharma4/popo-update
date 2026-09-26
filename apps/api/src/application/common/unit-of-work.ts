/**
 * Unit of Work abstraction for transactional boundary management.
 * Conforms to docs/contracts/08-data-contract.md §28-31, §68-70
 * and docs/contracts/02-architecture-contract.md §8.
 */

import type { EvaluationRepository } from "../../domain/evaluation/evaluation-repository.js";
import type { RubricRepository } from "../../domain/rubric/rubric-repository.js";
import type { QualitySignalRepository } from "../../domain/quality-signal/quality-signal-repository.js";
import type { TriageCaseRepository } from "../../domain/moderation/triage-case-repository.js";


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
  record(event: AuditEventInput): Promise<void>;
}

export interface UnitOfWorkScope {
  evaluations: EvaluationRepository;
  rubrics: RubricRepository;
  qualitySignals: QualitySignalRepository;
  triageCases: TriageCaseRepository;
  outbox: OutboxRepository;
  audit: AuditRepository;
}

export interface UnitOfWork {
  execute<T>(operation: (scope: UnitOfWorkScope) => Promise<T>): Promise<T>;
}
