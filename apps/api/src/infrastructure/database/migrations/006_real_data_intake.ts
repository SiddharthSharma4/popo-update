/**
 * Migration 006: Real-Data Intake & Evaluation Foundation Schema.
 * Creates examination_documents, extracted_answers, and ai_disagreements tables and supporting indexes.
 * Conforms to:
 * - docs/contracts/08-data-contract.md §20-25, §37
 * - docs/contracts/05-domain-contract.md §3, §4, §20
 * - AGENTS.md (Human Authority, AI Non-Authority, Immutable Auditability)
 */

import { Kysely } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  // 1. Examination Documents Table
  await db.schema
    .createTable("examination_documents")
    .ifNotExists()
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("evaluation_cycle_id", "text", (col) => col.notNull())
    .addColumn("document_type", "text", (col) => col.notNull())
    .addColumn("original_filename", "text", (col) => col.notNull())
    .addColumn("storage_path", "text", (col) => col.notNull())
    .addColumn("mime_type", "text", (col) => col.notNull())
    .addColumn("size_bytes", "integer", (col) => col.notNull())
    .addColumn("sha256_hash", "text", (col) => col.notNull())
    .addColumn("ocr_status", "text", (col) => col.notNull().defaultTo("PENDING"))
    .addColumn("ocr_confidence", "real")
    .addColumn("raw_text", "text")
    .addColumn("human_verified_text", "text")
    .addColumn("metadata", "text")
    .addColumn("created_at", "text", (col) => col.notNull())
    .addColumn("updated_at", "text", (col) => col.notNull())
    .execute();

  // Indexes for Examination Documents
  await db.schema
    .createIndex("idx_examination_documents_cycle")
    .ifNotExists()
    .on("examination_documents")
    .column("evaluation_cycle_id")
    .execute();

  await db.schema
    .createIndex("idx_examination_documents_type")
    .ifNotExists()
    .on("examination_documents")
    .column("document_type")
    .execute();

  await db.schema
    .createIndex("idx_examination_documents_status")
    .ifNotExists()
    .on("examination_documents")
    .column("ocr_status")
    .execute();

  // 2. Extracted Answers Table (Persists Student Answer Evidence)
  await db.schema
    .createTable("extracted_answers")
    .ifNotExists()
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("evaluation_id", "text", (col) =>
      col.notNull().references("evaluations.id").onDelete("cascade")
    )
    .addColumn("question_id", "text", (col) =>
      col.notNull().references("questions.id").onDelete("cascade")
    )
    .addColumn("document_id", "text", (col) =>
      col.references("examination_documents.id").onDelete("set null")
    )
    .addColumn("extracted_text", "text", (col) => col.notNull())
    .addColumn("human_verified_text", "text")
    .addColumn("page_number", "integer")
    .addColumn("confidence", "real")
    .addColumn("verification_status", "text", (col) => col.notNull().defaultTo("UNVERIFIED"))
    .addColumn("uncertainty_flags", "text")
    .addColumn("created_at", "text", (col) => col.notNull())
    .addColumn("updated_at", "text", (col) => col.notNull())
    .execute();

  // Indexes for Extracted Answers
  await db.schema
    .createIndex("idx_extracted_answers_evaluation")
    .ifNotExists()
    .on("extracted_answers")
    .column("evaluation_id")
    .execute();

  await db.schema
    .createIndex("idx_extracted_answers_question")
    .ifNotExists()
    .on("extracted_answers")
    .column("question_id")
    .execute();

  await db.schema
    .createIndex("idx_extracted_answers_document")
    .ifNotExists()
    .on("extracted_answers")
    .column("document_id")
    .execute();

  await db.schema
    .createIndex("idx_extracted_answers_eval_q")
    .ifNotExists()
    .on("extracted_answers")
    .columns(["evaluation_id", "question_id"])
    .execute();

  // 3. AI Disagreements Table (Captures Human Examiner AI Pain Points & Feedback)
  await db.schema
    .createTable("ai_disagreements")
    .ifNotExists()
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("evaluation_id", "text", (col) =>
      col.notNull().references("evaluations.id").onDelete("cascade")
    )
    .addColumn("question_id", "text", (col) =>
      col.notNull().references("questions.id").onDelete("cascade")
    )
    .addColumn("category", "text", (col) => col.notNull())
    .addColumn("ai_suggested_score", "real", (col) => col.notNull())
    .addColumn("human_awarded_score", "real", (col) => col.notNull())
    .addColumn("score_delta", "real", (col) => col.notNull())
    .addColumn("examiner_reason", "text", (col) => col.notNull())
    .addColumn("evaluator_id", "text", (col) => col.notNull())
    .addColumn("ai_analysis_id", "text")
    .addColumn("created_at", "text", (col) => col.notNull())
    .execute();

  // Indexes for AI Disagreements
  await db.schema
    .createIndex("idx_ai_disagreements_evaluation")
    .ifNotExists()
    .on("ai_disagreements")
    .column("evaluation_id")
    .execute();

  await db.schema
    .createIndex("idx_ai_disagreements_question")
    .ifNotExists()
    .on("ai_disagreements")
    .column("question_id")
    .execute();

  await db.schema
    .createIndex("idx_ai_disagreements_category")
    .ifNotExists()
    .on("ai_disagreements")
    .column("category")
    .execute();

  await db.schema
    .createIndex("idx_ai_disagreements_evaluator")
    .ifNotExists()
    .on("ai_disagreements")
    .column("evaluator_id")
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("ai_disagreements").ifExists().execute();
  await db.schema.dropTable("extracted_answers").ifExists().execute();
  await db.schema.dropTable("examination_documents").ifExists().execute();
}
