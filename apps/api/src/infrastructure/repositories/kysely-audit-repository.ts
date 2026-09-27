/**
 * Kysely implementation of AuditRepository.
 * Conforms to:
 * - docs/contracts/08-data-contract.md §24-27 (AuditEvent persistence & integrity)
 * - docs/contracts/05-domain-contract.md §29-31, INV-005 (Audit authority & immutability)
 * - docs/contracts/02-architecture-contract.md §37-38 (Audit module)
 *
 * Invariants:
 * - Append-only: inserts immutable audit events into `audit_events`.
 * - No update or physical delete operations permitted.
 */

import { randomUUID } from "node:crypto";
import { sql } from "kysely";
import type { KyselyDb, KyselyTx } from "../database/database.js";
import type { AuditEventsTable } from "../database/types.js";
import {
  AuditEvent,
  type AuditRepository,
  type AuditQueryFilter,
  type AuditQueryOptions,
  type AuditQueryResult,
} from "../../domain/audit/index.js";
import type { AuditEventInput } from "../../application/common/unit-of-work.js";

export class KyselyAuditRepository implements AuditRepository {
  constructor(private readonly db: KyselyDb | KyselyTx) {}

  private toDomain(row: AuditEventsTable): AuditEvent {
    let details: Record<string, unknown> = {};
    if (row.details) {
      try {
        details = JSON.parse(row.details);
      } catch {
        details = {};
      }
    }

    return AuditEvent.reconstitute({
      id: row.id,
      eventType: row.event_type,
      actorType: row.actor_type,
      actorId: row.actor_id,
      entityType: row.entity_type,
      entityId: row.entity_id,
      action: row.action,
      details,
      occurredAt: row.occurred_at,
    });
  }

  async record(event: AuditEvent | AuditEventInput): Promise<void> {
    const id = event.id ?? randomUUID();
    const occurredAt =
      ("occurredAt" in event && event.occurredAt) ? event.occurredAt : new Date().toISOString();

    await this.db
      .insertInto("audit_events")
      .values({
        id,
        event_type: event.eventType,
        actor_type: event.actorType,
        actor_id: event.actorId,
        entity_type: event.entityType,
        entity_id: event.entityId,
        action: event.action,
        details: JSON.stringify(event.details),
        occurred_at: occurredAt,
      })
      .execute();
  }

  async findById(id: string): Promise<AuditEvent | null> {
    const row = await this.db
      .selectFrom("audit_events")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();

    if (!row) return null;
    return this.toDomain(row);
  }

  async findByEntity(entityType: string, entityId: string): Promise<AuditEvent[]> {
    const rows = await this.db
      .selectFrom("audit_events")
      .selectAll()
      .where("entity_type", "=", entityType)
      .where("entity_id", "=", entityId)
      .orderBy("occurred_at", "asc")
      .execute();

    return rows.map((r) => this.toDomain(r));
  }

  async findAll(options?: { limit?: number; offset?: number }): Promise<AuditEvent[]> {
    let query = this.db
      .selectFrom("audit_events")
      .selectAll()
      .orderBy("occurred_at", "desc");

    if (options?.limit !== undefined) {
      query = query.limit(options.limit);
    }
    if (options?.offset !== undefined) {
      query = query.offset(options.offset);
    }

    const rows = await query.execute();
    return rows.map((r) => this.toDomain(r));
  }

  async query(filter?: AuditQueryFilter, options?: AuditQueryOptions): Promise<AuditQueryResult> {
    const page = options?.page && options.page > 0 ? options.page : 1;
    const pageSize =
      options?.pageSize && options.pageSize > 0
        ? options.pageSize
        : options?.limit && options.limit > 0
        ? options.limit
        : 50;
    const offset = options?.offset !== undefined ? options.offset : (page - 1) * pageSize;
    const sortOrder = options?.sortOrder ?? "desc";

    let query = this.db.selectFrom("audit_events").selectAll();
    let countQuery = this.db
      .selectFrom("audit_events")
      .select(sql<number>`count(*)`.as("count"));

    if (filter?.entityType) {
      query = query.where("entity_type", "=", filter.entityType);
      countQuery = countQuery.where("entity_type", "=", filter.entityType);
    }
    if (filter?.entityId) {
      query = query.where("entity_id", "=", filter.entityId);
      countQuery = countQuery.where("entity_id", "=", filter.entityId);
    }
    if (filter?.actorType) {
      query = query.where("actor_type", "=", filter.actorType);
      countQuery = countQuery.where("actor_type", "=", filter.actorType);
    }
    if (filter?.actorId) {
      query = query.where("actor_id", "=", filter.actorId);
      countQuery = countQuery.where("actor_id", "=", filter.actorId);
    }
    if (filter?.eventType) {
      query = query.where("event_type", "=", filter.eventType);
      countQuery = countQuery.where("event_type", "=", filter.eventType);
    }
    if (filter?.action) {
      query = query.where("action", "=", filter.action);
      countQuery = countQuery.where("action", "=", filter.action);
    }

    const countResult = await countQuery.executeTakeFirst();
    const total = Number(countResult?.count ?? 0);

    const rows = await query
      .orderBy("occurred_at", sortOrder)
      .orderBy("id", sortOrder)
      .limit(pageSize)
      .offset(offset)
      .execute();

    return {
      items: rows.map((r) => this.toDomain(r)),
      total,
      page,
      pageSize,
    };
  }
}

