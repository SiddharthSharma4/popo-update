/**
 * Migration 003: Quality Signals Schema.
 * Creates the quality_signals table and supporting indexes.
 * Conforms to docs/contracts/08-data-contract.md §17-18 and docs/contracts/05-domain-contract.md §19-21.
 */

import { Kysely } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  // 1. Quality Signals Table
  await db.schema
    .createTable("quality_signals")
    .ifNotExists()
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("evaluation_id", "text", (col) =>
      col.notNull().references("evaluations.id").onDelete("cascade")
    )
    .addColumn("evaluation_version", "integer", (col) => col.notNull())
    .addColumn("signal_type", "text", (col) => col.notNull())
    .addColumn("severity", "text", (col) => col.notNull())
    .addColumn("status", "text", (col) => col.notNull().defaultTo("REVIEWABLE"))
    .addColumn("summary", "text", (col) => col.notNull())
    .addColumn("evidence", "text", (col) => col.notNull())
    .addColumn("detector_type", "text", (col) => col.notNull())
    .addColumn("detector_name", "text", (col) => col.notNull())
    .addColumn("detector_version", "text", (col) => col.notNull())
    .addColumn("created_at", "text", (col) => col.notNull())
    .addColumn("updated_at", "text", (col) => col.notNull())
    .execute();

  // 2. Query Index: Fast lookup by evaluation_id
  await db.schema
    .createIndex("idx_quality_signals_evaluation")
    .ifNotExists()
    .on("quality_signals")
    .column("evaluation_id")
    .execute();

  // 3. Query Index: Fast triage filtering by status
  await db.schema
    .createIndex("idx_quality_signals_status")
    .ifNotExists()
    .on("quality_signals")
    .column("status")
    .execute();

  // 4. Idempotency / Deduplication Unique Index (Evaluation + Version + Detector + Signal Type)
  await db.schema
    .createIndex("idx_quality_signals_dedup")
    .ifNotExists()
    .unique()
    .on("quality_signals")
    .columns(["evaluation_id", "evaluation_version", "detector_name", "signal_type"])
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("quality_signals").ifExists().execute();
}
