/**
 * Migration 005: Resolutions Schema.
 * Creates the resolutions table and supporting indexes.
 * Conforms to docs/contracts/08-data-contract.md §22-23, §119 and docs/contracts/05-domain-contract.md §25-28.
 */

import { Kysely } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  // 1. Resolutions Table
  await db.schema
    .createTable("resolutions")
    .ifNotExists()
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("triage_case_id", "text", (col) =>
      col.notNull().references("triage_cases.id").onDelete("cascade")
    )
    .addColumn("evaluation_id", "text", (col) =>
      col.notNull().references("evaluations.id").onDelete("cascade")
    )
    .addColumn("outcome", "text", (col) => col.notNull())
    .addColumn("reason", "text", (col) => col.notNull())
    .addColumn("moderator_id", "text", (col) => col.notNull())
    .addColumn("notes", "text")
    .addColumn("evidence_references", "text") // JSON stringified array
    .addColumn("created_at", "text", (col) => col.notNull())
    .execute();

  // 2. Unique Index: Fast lookup by triage_case_id and 1:1 constraint enforcement
  await db.schema
    .createIndex("idx_resolutions_triage_case")
    .ifNotExists()
    .unique()
    .on("resolutions")
    .column("triage_case_id")
    .execute();

  // 3. Query Index: Fast lookup by evaluation_id
  await db.schema
    .createIndex("idx_resolutions_evaluation")
    .ifNotExists()
    .on("resolutions")
    .column("evaluation_id")
    .execute();

  // 4. Query Index: Fast lookup by moderator_id
  await db.schema
    .createIndex("idx_resolutions_moderator")
    .ifNotExists()
    .on("resolutions")
    .column("moderator_id")
    .execute();

  // 5. Query Index: Fast lookup by outcome
  await db.schema
    .createIndex("idx_resolutions_outcome")
    .ifNotExists()
    .on("resolutions")
    .column("outcome")
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("resolutions").ifExists().execute();
}
