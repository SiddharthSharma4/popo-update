/**
 * TASK-REAL-01: Real-Data Schema Foundation & Migration 006 Verification Suite.
 * Conforms to:
 * - docs/contracts/08-data-contract.md §20-25, §37
 * - docs/contracts/05-domain-contract.md §3, §4, §20
 * - docs/contracts/09-testing-contract.md §28-30
 * - AGENTS.md (Database safety, human authority, non-destructive additive migration)
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createDatabase, type KyselyDb } from "../src/infrastructure/database/database.js";
import { runMigrations } from "../src/infrastructure/database/migrator.js";
import * as migration006 from "../src/infrastructure/database/migrations/006_real_data_intake.js";
import {
  ExaminationDocumentType,
  DocumentOcrStatus,
  AnswerVerificationStatus,
  AiDisagreementCategory,
} from "@osm/shared";

describe("TASK-REAL-01: Migration 006 Real-Data Schema Foundation", () => {
  let db: KyselyDb;

  beforeEach(async () => {
    // Isolated in-memory database for testing
    db = createDatabase(":memory:");
    await runMigrations(db);
  });

  afterEach(async () => {
    await db.destroy();
  });

  it("1.1 applies migration 006 cleanly and creates all real-data intake tables", async () => {
    const tables = await db
      .selectFrom("sqlite_master" as any)
      .select(["name"])
      .where("type", "=", "table")
      .execute();

    const tableNames = new Set(tables.map((t: any) => t.name));

    expect(tableNames.has("examination_documents")).toBe(true);
    expect(tableNames.has("extracted_answers")).toBe(true);
    expect(tableNames.has("ai_disagreements")).toBe(true);
    // Preserves existing tables
    expect(tableNames.has("evaluations")).toBe(true);
    expect(tableNames.has("questions")).toBe(true);
    expect(tableNames.has("rubrics")).toBe(true);
    expect(tableNames.has("audit_events")).toBe(true);
  });

  it("1.2 creates all expected query and relationship indexes", async () => {
    const indexes = await db
      .selectFrom("sqlite_master" as any)
      .select(["name"])
      .where("type", "=", "index")
      .execute();

    const indexNames = new Set(indexes.map((i: any) => i.name));

    expect(indexNames.has("idx_examination_documents_cycle")).toBe(true);
    expect(indexNames.has("idx_examination_documents_type")).toBe(true);
    expect(indexNames.has("idx_examination_documents_status")).toBe(true);
    expect(indexNames.has("idx_extracted_answers_evaluation")).toBe(true);
    expect(indexNames.has("idx_extracted_answers_question")).toBe(true);
    expect(indexNames.has("idx_extracted_answers_document")).toBe(true);
    expect(indexNames.has("idx_extracted_answers_eval_q")).toBe(true);
    expect(indexNames.has("idx_ai_disagreements_evaluation")).toBe(true);
    expect(indexNames.has("idx_ai_disagreements_question")).toBe(true);
    expect(indexNames.has("idx_ai_disagreements_category")).toBe(true);
    expect(indexNames.has("idx_ai_disagreements_evaluator")).toBe(true);
  });

  it("1.3 allows inserting, querying, and updating an ExaminationDocument record", async () => {
    const docId = "doc_test_101";
    const now = new Date().toISOString();

    await db
      .insertInto("examination_documents")
      .values({
        id: docId,
        evaluation_cycle_id: "cycle_real_2026",
        document_type: ExaminationDocumentType.ANSWER_SHEET,
        original_filename: "student_01_math.pdf",
        storage_path: "./data/uploads/doc_test_101.pdf",
        mime_type: "application/pdf",
        size_bytes: 1048576,
        sha256_hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        ocr_status: DocumentOcrStatus.PENDING,
        ocr_confidence: null,
        raw_text: null,
        human_verified_text: null,
        metadata: JSON.stringify({ pageCount: 3 }),
        created_at: now,
        updated_at: now,
      })
      .execute();

    const retrieved = await db
      .selectFrom("examination_documents")
      .selectAll()
      .where("id", "=", docId)
      .executeTakeFirstOrThrow();

    expect(retrieved.id).toBe(docId);
    expect(retrieved.document_type).toBe(ExaminationDocumentType.ANSWER_SHEET);
    expect(retrieved.ocr_status).toBe(DocumentOcrStatus.PENDING);
    expect(retrieved.size_bytes).toBe(1048576);

    // Update OCR status
    await db
      .updateTable("examination_documents")
      .set({
        ocr_status: DocumentOcrStatus.EXTRACTED,
        ocr_confidence: 0.92,
        raw_text: "Extracted candidate text from PDF",
        updated_at: new Date().toISOString(),
      })
      .where("id", "=", docId)
      .execute();

    const updated = await db
      .selectFrom("examination_documents")
      .selectAll()
      .where("id", "=", docId)
      .executeTakeFirstOrThrow();

    expect(updated.ocr_status).toBe(DocumentOcrStatus.EXTRACTED);
    expect(updated.ocr_confidence).toBe(0.92);
    expect(updated.raw_text).toBe("Extracted candidate text from PDF");
  });

  it("1.4 enforces foreign key integrity on ExtractedAnswers", async () => {
    const now = new Date().toISOString();

    // Inserting an extracted answer referencing a non-existent evaluation must throw
    await expect(
      db
        .insertInto("extracted_answers")
        .values({
          id: "ans_orphan_01",
          evaluation_id: "eval_non_existent",
          question_id: "q_non_existent",
          document_id: null,
          extracted_text: "Some orphan answer text",
          human_verified_text: null,
          page_number: 1,
          confidence: 0.85,
          verification_status: AnswerVerificationStatus.UNVERIFIED,
          uncertainty_flags: null,
          created_at: now,
          updated_at: now,
        })
        .execute()
    ).rejects.toThrow();
  });

  it("1.5 enforces foreign key integrity on AiDisagreements", async () => {
    const now = new Date().toISOString();

    // Inserting a disagreement referencing a non-existent evaluation must throw
    await expect(
      db
        .insertInto("ai_disagreements")
        .values({
          id: "dis_orphan_01",
          evaluation_id: "eval_non_existent",
          question_id: "q_non_existent",
          category: AiDisagreementCategory.MISSED_VALID_CONCEPT,
          ai_suggested_score: 15,
          human_awarded_score: 25,
          score_delta: 10,
          examiner_reason: "Candidate demonstrated alternative valid theorem proof.",
          evaluator_id: "evaluator_1",
          ai_analysis_id: null,
          created_at: now,
        })
        .execute()
    ).rejects.toThrow();
  });

  it("1.6 supports full ExtractedAnswer lifecycle with cascade deletion on Evaluation", async () => {
    const now = new Date().toISOString();
    const evalId = "eval_real_test_001";
    const qId = "q_real_test_001";
    const docId = "doc_test_102";

    // 1. Create Rubric
    await db
      .insertInto("rubrics")
      .values({
        id: "rubric_test_1",
        version: 1,
        title: "Test Rubric",
        criteria: JSON.stringify([]),
        total_max_marks: 30,
        created_at: now,
      })
      .execute();

    // 2. Create Evaluation
    await db
      .insertInto("evaluations")
      .values({
        id: evalId,
        evaluation_cycle_id: "cycle_real_2026",
        script_id: "SCRIPT-REAL-001",
        evaluator_id: "evaluator_1",
        rubric_id: "rubric_test_1",
        rubric_version: 1,
        status: "DRAFT",
        total_score: 0,
        max_possible_score: 30,
        is_complete: 0,
        version: 1,
        submitted_at: null,
        finalized_at: null,
        created_at: now,
        updated_at: now,
      })
      .execute();

    // 3. Create Question
    await db
      .insertInto("questions")
      .values({
        id: qId,
        evaluation_id: evalId,
        question_number: "Q1",
        text: "Explain AVL self-balancing rotations.",
        max_marks: 30,
        rubric_criteria_id: null,
        order_index: 0,
      })
      .execute();

    // 4. Create Document
    await db
      .insertInto("examination_documents")
      .values({
        id: docId,
        evaluation_cycle_id: "cycle_real_2026",
        document_type: ExaminationDocumentType.ANSWER_SHEET,
        original_filename: "script_001.png",
        storage_path: "./data/uploads/doc_test_102.png",
        mime_type: "image/png",
        size_bytes: 512000,
        sha256_hash: "abc123hash",
        ocr_status: DocumentOcrStatus.EXTRACTED,
        ocr_confidence: 0.95,
        raw_text: "Candidate written AVL response",
        human_verified_text: null,
        metadata: null,
        created_at: now,
        updated_at: now,
      })
      .execute();

    // 5. Create ExtractedAnswer linking Evaluation, Question, and Document
    await db
      .insertInto("extracted_answers")
      .values({
        id: "ans_real_001",
        evaluation_id: evalId,
        question_id: qId,
        document_id: docId,
        extracted_text: "Candidate written AVL response",
        human_verified_text: "Candidate written AVL response (verified)",
        page_number: 1,
        confidence: 0.95,
        verification_status: AnswerVerificationStatus.HUMAN_CONFIRMED,
        uncertainty_flags: JSON.stringify([]),
        created_at: now,
        updated_at: now,
      })
      .execute();

    // 6. Create AI Disagreement
    await db
      .insertInto("ai_disagreements")
      .values({
        id: "dis_real_001",
        evaluation_id: evalId,
        question_id: qId,
        category: AiDisagreementCategory.RUBRIC_MISMATCH,
        ai_suggested_score: 20,
        human_awarded_score: 28,
        score_delta: 8,
        examiner_reason: "AI applied beginning band but candidate correctly demonstrated left-right rotation.",
        evaluator_id: "evaluator_1",
        ai_analysis_id: "ai_adv_mock_001",
        created_at: now,
      })
      .execute();

    // Verify records exist
    const ans = await db
      .selectFrom("extracted_answers")
      .selectAll()
      .where("id", "=", "ans_real_001")
      .executeTakeFirst();
    expect(ans).toBeDefined();
    expect(ans?.verification_status).toBe(AnswerVerificationStatus.HUMAN_CONFIRMED);

    const dis = await db
      .selectFrom("ai_disagreements")
      .selectAll()
      .where("id", "=", "dis_real_001")
      .executeTakeFirst();
    expect(dis).toBeDefined();
    expect(dis?.category).toBe(AiDisagreementCategory.RUBRIC_MISMATCH);
    expect(dis?.score_delta).toBe(8);

    // 7. Verify ON DELETE SET NULL on document deletion
    await db.deleteFrom("examination_documents").where("id", "=", docId).execute();
    const ansAfterDocDelete = await db
      .selectFrom("extracted_answers")
      .selectAll()
      .where("id", "=", "ans_real_001")
      .executeTakeFirst();
    expect(ansAfterDocDelete).toBeDefined();
    expect(ansAfterDocDelete?.document_id).toBeNull(); // Set null, not deleted!

    // 8. Verify CASCADE deletion on evaluation deletion
    await db.deleteFrom("evaluations").where("id", "=", evalId).execute();

    const ansAfterEvalDelete = await db
      .selectFrom("extracted_answers")
      .selectAll()
      .where("id", "=", "ans_real_001")
      .executeTakeFirst();
    expect(ansAfterEvalDelete).toBeUndefined(); // Cascaded!

    const disAfterEvalDelete = await db
      .selectFrom("ai_disagreements")
      .selectAll()
      .where("id", "=", "dis_real_001")
      .executeTakeFirst();
    expect(disAfterEvalDelete).toBeUndefined(); // Cascaded!
  });

  it("1.7 down migration drops all three tables cleanly without errors", async () => {
    await migration006.down(db);

    const tables = await db
      .selectFrom("sqlite_master" as any)
      .select(["name"])
      .where("type", "=", "table")
      .execute();

    const tableNames = new Set(tables.map((t: any) => t.name));

    expect(tableNames.has("examination_documents")).toBe(false);
    expect(tableNames.has("extracted_answers")).toBe(false);
    expect(tableNames.has("ai_disagreements")).toBe(false);

    // Core tables remain unaffected
    expect(tableNames.has("evaluations")).toBe(true);
    expect(tableNames.has("questions")).toBe(true);
    expect(tableNames.has("audit_events")).toBe(true);
  });
});
