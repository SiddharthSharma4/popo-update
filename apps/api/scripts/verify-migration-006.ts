import path from "node:path";
import { createDatabase } from "../src/infrastructure/database/database.js";
import { runMigrations } from "../src/infrastructure/database/migrator.js";

async function main() {
  const dbPath = path.resolve("./data/osm.db");
  console.log(`Verifying migration on database: ${dbPath}`);

  const db = createDatabase(dbPath);

  // 1. Run migrations
  await runMigrations(db);

  // 2. Query sqlite_master to verify tables exist
  const tables = await db
    .selectFrom("sqlite_master" as any)
    .select(["name", "type"])
    .where("type", "=", "table")
    .execute();

  const tableNames = new Set(tables.map((t: any) => t.name));
  console.log("Existing tables in database:", Array.from(tableNames));

  const expectedTables = [
    "outbox_events",
    "audit_events",
    "idempotency_records",
    "rubrics",
    "evaluations",
    "questions",
    "evaluation_marks",
    "quality_signals",
    "triage_cases",
    "resolutions",
    "examination_documents",
    "extracted_answers",
    "ai_disagreements",
  ];

  for (const expected of expectedTables) {
    if (!tableNames.has(expected)) {
      throw new Error(`Missing expected table: ${expected}`);
    }
  }
  console.log("✓ All 13 expected tables verified successfully.");

  // 3. Query sqlite_master for indexes
  const indexes = await db
    .selectFrom("sqlite_master" as any)
    .select(["name", "tbl_name"])
    .where("type", "=", "index")
    .execute();

  const indexNames = new Set(indexes.map((i: any) => i.name));
  const expectedIndexes = [
    "idx_examination_documents_cycle",
    "idx_examination_documents_type",
    "idx_examination_documents_status",
    "idx_extracted_answers_evaluation",
    "idx_extracted_answers_question",
    "idx_extracted_answers_document",
    "idx_extracted_answers_eval_q",
    "idx_ai_disagreements_evaluation",
    "idx_ai_disagreements_question",
    "idx_ai_disagreements_category",
    "idx_ai_disagreements_evaluator",
  ];

  for (const idx of expectedIndexes) {
    if (!indexNames.has(idx)) {
      throw new Error(`Missing expected index: ${idx}`);
    }
  }
  console.log("✓ All 11 new indexes verified successfully.");

  // 4. Verify existing audit events are intact
  const auditCount = await db
    .selectFrom("audit_events")
    .select(db.fn.count("id").as("count"))
    .executeTakeFirstOrThrow();

  console.log(`✓ Audit events preserved intact: ${Number(auditCount.count)} records.`);
  if (Number(auditCount.count) !== 112) {
    throw new Error(`Expected 112 audit events, got ${auditCount.count}`);
  }

  console.log("Migration 006 verification completed successfully!");
}

main().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
