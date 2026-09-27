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
import { KyselyResolutionRepository } from "../repositories/kysely-resolution-repository.js";
import { KyselyAuditRepository } from "../repositories/kysely-audit-repository.js";
import { KyselyIdempotencyRepository } from "../repositories/kysely-idempotency-repository.js";

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

export class KyselyUnitOfWork implements UnitOfWork {
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly db: KyselyDb) {}

  async execute<T>(operation: (scope: UnitOfWorkScope) => Promise<T>): Promise<T> {
    const run = async () => {
      return this.db.transaction().execute(async (trx) => {
        const scope: UnitOfWorkScope = {
          evaluations: new KyselyEvaluationRepository(trx),
          rubrics: new KyselyRubricRepository(trx),
          qualitySignals: new KyselyQualitySignalRepository(trx),
          triageCases: new KyselyTriageCaseRepository(trx),
          resolutions: new KyselyResolutionRepository(trx),
          outbox: new KyselyOutboxRepository(trx),
          audit: new KyselyAuditRepository(trx),
          idempotency: new KyselyIdempotencyRepository(trx),
        };

        return operation(scope);
      });
    };

    const next = this.queue.then(run, run);
    this.queue = next.catch(() => {});
    return next;
  }
}
