/**
 * Kysely implementation of UnitOfWork.
 * Ensures atomic transactions across domain models, outbox events, and audit logs.
 * Conforms to docs/contracts/08-data-contract.md §28-31, §68-70.
 */

import { randomUUID } from "node:crypto";
import type { KyselyDb, KyselyTx } from "../database/database.js";
import type {
  UnitOfWork,
  UnitOfWorkScope,
  OutboxRepository,
  AuditRepository,
  OutboxEventInput,
  AuditEventInput,
} from "../../application/common/unit-of-work.js";
import { KyselyEvaluationRepository } from "../repositories/kysely-evaluation-repository.js";
import { KyselyRubricRepository } from "../repositories/kysely-rubric-repository.js";
import { KyselyQualitySignalRepository } from "../repositories/kysely-quality-signal-repository.js";
import { KyselyTriageCaseRepository } from "../repositories/kysely-triage-case-repository.js";


export class KyselyOutboxRepository implements OutboxRepository {
  constructor(private readonly trx: KyselyTx) {}

  async record(event: OutboxEventInput): Promise<void> {
    await this.trx
      .insertInto("outbox_events")
      .values({
        id: event.id ?? randomUUID(),
        event_type: event.eventType,
        event_version: event.eventVersion ?? 1,
        aggregate_type: event.aggregateType,
        aggregate_id: event.aggregateId,
        producer: event.producer,
        actor_type: event.actorType,
        actor_id: event.actorId,
        correlation_id: event.correlationId ?? randomUUID(),
        causation_id: event.causationId ?? randomUUID(),
        payload: JSON.stringify(event.payload),
        status: "PENDING",
        created_at: new Date().toISOString(),
      })
      .execute();
  }
}

export class KyselyAuditRepository implements AuditRepository {
  constructor(private readonly trx: KyselyTx) {}

  async record(event: AuditEventInput): Promise<void> {
    await this.trx
      .insertInto("audit_events")
      .values({
        id: event.id ?? randomUUID(),
        event_type: event.eventType,
        actor_type: event.actorType,
        actor_id: event.actorId,
        entity_type: event.entityType,
        entity_id: event.entityId,
        action: event.action,
        details: JSON.stringify(event.details),
        occurred_at: event.occurredAt ?? new Date().toISOString(),
      })
      .execute();
  }
}

export class KyselyUnitOfWork implements UnitOfWork {
  constructor(private readonly db: KyselyDb) {}

  async execute<T>(operation: (scope: UnitOfWorkScope) => Promise<T>): Promise<T> {
    return this.db.transaction().execute(async (trx) => {
      const scope: UnitOfWorkScope = {
        evaluations: new KyselyEvaluationRepository(trx),
        rubrics: new KyselyRubricRepository(trx),
        qualitySignals: new KyselyQualitySignalRepository(trx),
        triageCases: new KyselyTriageCaseRepository(trx),
        outbox: new KyselyOutboxRepository(trx),
        audit: new KyselyAuditRepository(trx),
      };

      return operation(scope);
    });
  }
}
