/**
 * Migration 002: Authoritative Domain Schema.
 * Creates rubrics, evaluations, questions, and evaluation_marks tables.
 * Conforms to docs/contracts/08-data-contract.md §10-16, §43-45, §59-61.
 */

import { Kysely } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  // 1. Rubrics Table (Versioned, immutable historical criteria)
  await db.schema
    .createTable("rubrics")
    .ifNotExists()
    .addColumn("id", "text", (col) => col.notNull())
    .addColumn("version", "integer", (col) => col.notNull())
    .addColumn("title", "text", (col) => col.notNull())
    .addColumn("criteria", "text", (col) => col.notNull())
    .addColumn("total_max_marks", "real", (col) => col.notNull())
    .addColumn("created_at", "text", (col) => col.notNull())
    .addPrimaryKeyConstraint("pk_rubrics", ["id", "version"])
    .execute();

  // 2. Evaluations Table (Authoritative operational evaluation state)
  await db.schema
    .createTable("evaluations")
    .ifNotExists()
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("evaluation_cycle_id", "text", (col) => col.notNull())
    .addColumn("script_id", "text", (col) => col.notNull())
    .addColumn("evaluator_id", "text", (col) => col.notNull())
    .addColumn("rubric_id", "text", (col) => col.notNull())
    .addColumn("rubric_version", "integer", (col) => col.notNull())
    .addColumn("status", "text", (col) => col.notNull().defaultTo("DRAFT"))
    .addColumn("total_score", "real", (col) => col.notNull().defaultTo(0))
    .addColumn("max_possible_score", "real", (col) => col.notNull().defaultTo(0))
    .addColumn("is_complete", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("version", "integer", (col) => col.notNull().defaultTo(1))
    .addColumn("submitted_at", "text")
    .addColumn("finalized_at", "text")
    .addColumn("created_at", "text", (col) => col.notNull())
    .addColumn("updated_at", "text", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("idx_evaluations_evaluator")
    .ifNotExists()
    .on("evaluations")
    .column("evaluator_id")
    .execute();

  await db.schema
    .createIndex("idx_evaluations_cycle")
    .ifNotExists()
    .on("evaluations")
    .column("evaluation_cycle_id")
    .execute();

  await db.schema
    .createIndex("idx_evaluations_status")
    .ifNotExists()
    .on("evaluations")
    .column("status")
    .execute();

  // 3. Questions Table (Evaluable questions attached to evaluation context)
  await db.schema
    .createTable("questions")
    .ifNotExists()
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("evaluation_id", "text", (col) =>
      col.notNull().references("evaluations.id").onDelete("cascade")
    )
    .addColumn("question_number", "text", (col) => col.notNull())
    .addColumn("text", "text", (col) => col.notNull())
    .addColumn("max_marks", "real", (col) => col.notNull())
    .addColumn("rubric_criteria_id", "text")
    .addColumn("order_index", "integer", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("idx_questions_evaluation")
    .ifNotExists()
    .on("questions")
    .column("evaluation_id")
    .execute();

  await db.schema
    .createIndex("idx_questions_order")
    .ifNotExists()
    .on("questions")
    .columns(["evaluation_id", "order_index"])
    .execute();

  // 4. Evaluation Marks Table (Awarded marks per question)
  await db.schema
    .createTable("evaluation_marks")
    .ifNotExists()
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("evaluation_id", "text", (col) =>
      col.notNull().references("evaluations.id").onDelete("cascade")
    )
    .addColumn("question_id", "text", (col) => col.notNull())
    .addColumn("awarded_marks", "real", (col) => col.notNull())
    .addColumn("max_marks", "real", (col) => col.notNull())
    .addColumn("evaluator_id", "text", (col) => col.notNull())
    .addColumn("comments", "text")
    .addColumn("is_annotated", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("assigned_at", "text", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("idx_marks_evaluation_question")
    .ifNotExists()
    .unique()
    .on("evaluation_marks")
    .columns(["evaluation_id", "question_id"])
    .execute();

  await db.schema
    .createIndex("idx_marks_evaluation")
    .ifNotExists()
    .on("evaluation_marks")
    .column("evaluation_id")
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("evaluation_marks").ifExists().execute();
  await db.schema.dropTable("questions").ifExists().execute();
  await db.schema.dropTable("evaluations").ifExists().execute();
  await db.schema.dropTable("rubrics").ifExists().execute();
}
