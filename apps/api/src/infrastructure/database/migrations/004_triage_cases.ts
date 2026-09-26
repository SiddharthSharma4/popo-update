/**
 * Migration 004: Triage Cases Schema.
 * Creates the triage_cases table and supporting indexes.
 * Conforms to docs/contracts/08-data-contract.md §20-21 and docs/contracts/05-domain-contract.md §22-24.
 */

import { Kysely } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  // 1. Triage Cases Table
  await db.schema
    .createTable("triage_cases")
    .ifNotExists()
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("case_number", "text", (col) => col.notNull())
    .addColumn("evaluation_id", "text", (col) =>
      col.notNull().references("evaluations.id").onDelete("cascade")
    )
    .addColumn("evaluation_cycle_id", "text", (col) => col.notNull())
    .addColumn("quality_signal_id", "text", (col) =>
      col.notNull().references("quality_signals.id").onDelete("cascade")
    )
    .addColumn("status", "text", (col) => col.notNull().defaultTo("OPEN"))
    .addColumn("priority", "text", (col) => col.notNull().defaultTo("MEDIUM"))
    .addColumn("assignee_id", "text")
    .addColumn("notes", "text")
    .addColumn("version", "integer", (col) => col.notNull().defaultTo(1))
    .addColumn("created_at", "text", (col) => col.notNull())
    .addColumn("updated_at", "text", (col) => col.notNull())
    .execute();

  // 2. Query Index: Fast lookup by status
  await db.schema
    .createIndex("idx_triage_cases_status")
    .ifNotExists()
    .on("triage_cases")
    .column("status")
    .execute();

  // 3. Query Index: Fast lookup by evaluation_id
  await db.schema
    .createIndex("idx_triage_cases_evaluation")
    .ifNotExists()
    .on("triage_cases")
    .column("evaluation_id")
    .execute();

  // 4. Query Index: Fast lookup by quality_signal_id
  await db.schema
    .createIndex("idx_triage_cases_signal")
    .ifNotExists()
    .on("triage_cases")
    .column("quality_signal_id")
    .execute();

  // 5. Query Index: Fast lookup by assignee_id
  await db.schema
    .createIndex("idx_triage_cases_assignee")
    .ifNotExists()
    .on("triage_cases")
    .column("assignee_id")
    .execute();

  // 6. Unique Index on case_number
  await db.schema
    .createIndex("idx_triage_cases_number")
    .ifNotExists()
    .unique()
    .on("triage_cases")
    .column("case_number")
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("triage_cases").ifExists().execute();
}
