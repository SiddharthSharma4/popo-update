/**
 * Foundation migration establishing outbox_events, audit_events, and idempotency_records.
 * Conforms to docs/contracts/08-data-contract.md §28-31 and docs/contracts/07-event-contract.md.
 */

import { Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  // 1. Transactional Outbox Events Table
  await db.schema
    .createTable("outbox_events")
    .ifNotExists()
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("event_type", "text", (col) => col.notNull())
    .addColumn("event_version", "integer", (col) => col.notNull().defaultTo(1))
    .addColumn("aggregate_type", "text", (col) => col.notNull())
    .addColumn("aggregate_id", "text", (col) => col.notNull())
    .addColumn("producer", "text", (col) => col.notNull())
    .addColumn("actor_type", "text", (col) => col.notNull())
    .addColumn("actor_id", "text", (col) => col.notNull())
    .addColumn("correlation_id", "text", (col) => col.notNull())
    .addColumn("causation_id", "text", (col) => col.notNull())
    .addColumn("payload", "text", (col) => col.notNull())
    .addColumn("status", "text", (col) => col.notNull().defaultTo("PENDING"))
    .addColumn("retry_count", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("last_error", "text")
    .addColumn("created_at", "text", (col) => col.notNull())
    .addColumn("published_at", "text")
    .execute();

  await db.schema
    .createIndex("idx_outbox_events_status")
    .ifNotExists()
    .on("outbox_events")
    .column("status")
    .execute();

  // 2. Immutable Audit Events Table
  await db.schema
    .createTable("audit_events")
    .ifNotExists()
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("event_type", "text", (col) => col.notNull())
    .addColumn("actor_type", "text", (col) => col.notNull())
    .addColumn("actor_id", "text", (col) => col.notNull())
    .addColumn("entity_type", "text", (col) => col.notNull())
    .addColumn("entity_id", "text", (col) => col.notNull())
    .addColumn("action", "text", (col) => col.notNull())
    .addColumn("details", "text", (col) => col.notNull())
    .addColumn("occurred_at", "text", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("idx_audit_events_entity")
    .ifNotExists()
    .on("audit_events")
    .columns(["entity_id", "occurred_at"])
    .execute();

  // 3. Idempotency Records Table
  await db.schema
    .createTable("idempotency_records")
    .ifNotExists()
    .addColumn("key", "text", (col) => col.primaryKey())
    .addColumn("request_hash", "text", (col) => col.notNull())
    .addColumn("response_status", "integer", (col) => col.notNull())
    .addColumn("response_body", "text", (col) => col.notNull())
    .addColumn("created_at", "text", (col) => col.notNull())
    .addColumn("expires_at", "text", (col) => col.notNull())
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("idempotency_records").ifExists().execute();
  await db.schema.dropTable("audit_events").ifExists().execute();
  await db.schema.dropTable("outbox_events").ifExists().execute();
}
