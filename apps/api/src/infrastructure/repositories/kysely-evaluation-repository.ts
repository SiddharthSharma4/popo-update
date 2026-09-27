/**
 * Kysely implementation of EvaluationRepository.
 * Conforms to docs/contracts/08-data-contract.md §10-14, §43-45, §67-68
 * and docs/contracts/05-domain-contract.md §10.
 */

import type { KyselyDb, KyselyTx } from "../database/database.js";
import type {
  EvaluationsTable,
  QuestionsTable,
  EvaluationMarksTable,
} from "../database/types.js";
import {
  Evaluation,
  type EvaluationStatus,
} from "../../domain/evaluation/evaluation.js";
import { Mark } from "../../domain/evaluation/mark.js";
import { Question } from "../../domain/evaluation/question.js";
import { sql } from "kysely";
import type {
  EvaluationRepository,
  FindEvaluationsOptions,
  PaginatedResult,
} from "../../domain/evaluation/evaluation-repository.js";
import { ConcurrencyConflictError } from "../../domain/errors.js";

export class KyselyEvaluationRepository implements EvaluationRepository {
  constructor(private readonly db: KyselyDb | KyselyTx) {}


  private toDomain(
    row: EvaluationsTable,
    questionRows: QuestionsTable[],
    markRows: EvaluationMarksTable[]
  ): Evaluation {
    const questions = questionRows.map((q) =>
      Question.create({
        id: q.id,
        questionNumber: q.question_number,
        text: q.text,
        maxMarks: q.max_marks,
        rubricCriteriaId: q.rubric_criteria_id,
        orderIndex: q.order_index,
      })
    );

    const marks = markRows.map((m) =>
      Mark.create({
        questionId: m.question_id,
        awardedMarks: m.awarded_marks,
        maxMarks: m.max_marks,
        evaluatorId: m.evaluator_id,
        comments: m.comments,
        isAnnotated: Boolean(m.is_annotated),
        assignedAt: m.assigned_at,
      })
    );

    return Evaluation.create({
      id: row.id,
      evaluationCycleId: row.evaluation_cycle_id,
      scriptId: row.script_id,
      evaluatorId: row.evaluator_id,
      rubricId: row.rubric_id,
      rubricVersion: row.rubric_version,
      status: row.status as EvaluationStatus,
      questions,
      marks,
      version: row.version,
      submittedAt: row.submitted_at,
      finalizedAt: row.finalized_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }

  async findById(id: string, tx?: KyselyTx): Promise<Evaluation | null> {
    const executor = tx ?? this.db;

    const row = await executor
      .selectFrom("evaluations")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();

    if (!row) return null;

    const questionRows = await executor
      .selectFrom("questions")
      .selectAll()
      .where("evaluation_id", "=", id)
      .orderBy("order_index", "asc")
      .execute();

    const markRows = await executor
      .selectFrom("evaluation_marks")
      .selectAll()
      .where("evaluation_id", "=", id)
      .execute();

    return this.toDomain(row, questionRows, markRows);
  }

  async findByEvaluatorId(evaluatorId: string, tx?: KyselyTx): Promise<Evaluation[]> {
    const executor = tx ?? this.db;

    const rows = await executor
      .selectFrom("evaluations")
      .selectAll()
      .where("evaluator_id", "=", evaluatorId)
      .orderBy("created_at", "desc")
      .execute();

    const evaluations: Evaluation[] = [];
    for (const row of rows) {
      const questionRows = await executor
        .selectFrom("questions")
        .selectAll()
        .where("evaluation_id", "=", row.id)
        .orderBy("order_index", "asc")
        .execute();

      const markRows = await executor
        .selectFrom("evaluation_marks")
        .selectAll()
        .where("evaluation_id", "=", row.id)
        .execute();

      evaluations.push(this.toDomain(row, questionRows, markRows));
    }

    return evaluations;
  }

  async findPaginated(
    options: FindEvaluationsOptions,
    tx?: KyselyTx
  ): Promise<PaginatedResult<Evaluation>> {
    const executor = tx ?? this.db;
    const page = options.page > 0 ? options.page : 1;
    const pageSize = options.pageSize > 0 ? options.pageSize : 20;
    const offset = (page - 1) * pageSize;

    let query = executor.selectFrom("evaluations").selectAll();
    let countQuery = executor
      .selectFrom("evaluations")
      .select(sql<number>`count(*)`.as("count"));

    if (options.filter?.evaluationCycleId) {
      query = query.where("evaluation_cycle_id", "=", options.filter.evaluationCycleId);
      countQuery = countQuery.where("evaluation_cycle_id", "=", options.filter.evaluationCycleId);
    }
    if (options.filter?.evaluatorId) {
      query = query.where("evaluator_id", "=", options.filter.evaluatorId);
      countQuery = countQuery.where("evaluator_id", "=", options.filter.evaluatorId);
    }
    if (options.filter?.status) {
      query = query.where("status", "=", options.filter.status);
      countQuery = countQuery.where("status", "=", options.filter.status);
    }
    if (options.filter?.scriptId) {
      query = query.where("script_id", "=", options.filter.scriptId);
      countQuery = countQuery.where("script_id", "=", options.filter.scriptId);
    }

    const countResult = await countQuery.executeTakeFirst();
    const total = Number(countResult?.count ?? 0);

    const rows = await query
      .orderBy("created_at", "desc")
      .orderBy("id", "asc")
      .limit(pageSize)
      .offset(offset)
      .execute();

    if (rows.length === 0) {
      return {
        items: [],
        total,
        page,
        pageSize,
      };
    }

    const evalIds = rows.map((r) => r.id);

    const questionRows = await executor
      .selectFrom("questions")
      .selectAll()
      .where("evaluation_id", "in", evalIds)
      .orderBy("order_index", "asc")
      .execute();

    const markRows = await executor
      .selectFrom("evaluation_marks")
      .selectAll()
      .where("evaluation_id", "in", evalIds)
      .execute();

    const questionsByEval = new Map<string, QuestionsTable[]>();
    for (const q of questionRows) {
      const list = questionsByEval.get(q.evaluation_id) ?? [];
      list.push(q);
      questionsByEval.set(q.evaluation_id, list);
    }

    const marksByEval = new Map<string, EvaluationMarksTable[]>();
    for (const m of markRows) {
      const list = marksByEval.get(m.evaluation_id) ?? [];
      list.push(m);
      marksByEval.set(m.evaluation_id, list);
    }

    const evaluations = rows.map((row) =>
      this.toDomain(
        row,
        questionsByEval.get(row.id) ?? [],
        marksByEval.get(row.id) ?? []
      )
    );

    return {
      items: evaluations,
      total,
      page,
      pageSize,
    };
  }

  async save(evaluation: Evaluation, tx?: KyselyTx): Promise<void> {
    const executeInTx = async (trx: KyselyTx) => {
      const existing = await trx
        .selectFrom("evaluations")
        .select(["id", "version"])
        .where("id", "=", evaluation.id)
        .executeTakeFirst();

      if (!existing) {
        // 1. Insert new Evaluation
        await trx
          .insertInto("evaluations")
          .values({
            id: evaluation.id,
            evaluation_cycle_id: evaluation.evaluationCycleId,
            script_id: evaluation.scriptId,
            evaluator_id: evaluation.evaluatorId,
            rubric_id: evaluation.rubricId,
            rubric_version: evaluation.rubricVersion,
            status: evaluation.status,
            total_score: evaluation.totalScore,
            max_possible_score: evaluation.maxPossibleScore,
            is_complete: evaluation.isComplete() ? 1 : 0,
            version: evaluation.version,
            submitted_at: evaluation.submittedAt,
            finalized_at: evaluation.finalizedAt,
            created_at: evaluation.createdAt,
            updated_at: evaluation.updatedAt,
          })
          .execute();

        // 2. Insert Questions
        for (const q of evaluation.questions) {
          await trx
            .insertInto("questions")
            .values({
              id: q.id,
              evaluation_id: evaluation.id,
              question_number: q.questionNumber,
              text: q.text,
              max_marks: q.maxMarks,
              rubric_criteria_id: q.rubricCriteriaId,
              order_index: q.orderIndex,
            })
            .execute();
        }

        // 3. Insert Marks (if any)
        for (const m of evaluation.getAllMarks()) {
          await trx
            .insertInto("evaluation_marks")
            .values({
              id: `${evaluation.id}:${m.questionId}`,
              evaluation_id: evaluation.id,
              question_id: m.questionId,
              awarded_marks: m.awardedMarks,
              max_marks: m.maxMarks,
              evaluator_id: m.evaluatorId,
              comments: m.comments,
              is_annotated: m.isAnnotated ? 1 : 0,
              assigned_at: m.assignedAt,
            })
            .execute();
        }

        evaluation.commitVersion();
      } else {
        // Update existing evaluation with optimistic concurrency check
        const updateResult = await trx
          .updateTable("evaluations")
          .set({
            status: evaluation.status,
            total_score: evaluation.totalScore,
            max_possible_score: evaluation.maxPossibleScore,
            is_complete: evaluation.isComplete() ? 1 : 0,
            version: evaluation.version,
            submitted_at: evaluation.submittedAt,
            finalized_at: evaluation.finalizedAt,
            updated_at: evaluation.updatedAt,
          })
          .where("id", "=", evaluation.id)
          .where("version", "=", evaluation.persistedVersion)
          .executeTakeFirst();

        if (updateResult.numUpdatedRows === 0n) {
          throw new ConcurrencyConflictError(
            "Evaluation",
            evaluation.id,
            evaluation.persistedVersion
          );
        }

        // Upsert Marks
        for (const m of evaluation.getAllMarks()) {
          await trx
            .insertInto("evaluation_marks")
            .values({
              id: `${evaluation.id}:${m.questionId}`,
              evaluation_id: evaluation.id,
              question_id: m.questionId,
              awarded_marks: m.awardedMarks,
              max_marks: m.maxMarks,
              evaluator_id: m.evaluatorId,
              comments: m.comments,
              is_annotated: m.isAnnotated ? 1 : 0,
              assigned_at: m.assignedAt,
            })
            .onConflict((oc) =>
              oc.columns(["evaluation_id", "question_id"]).doUpdateSet({
                awarded_marks: m.awardedMarks,
                max_marks: m.maxMarks,
                evaluator_id: m.evaluatorId,
                comments: m.comments,
                is_annotated: m.isAnnotated ? 1 : 0,
                assigned_at: m.assignedAt,
              })
            )
            .execute();
        }

        evaluation.commitVersion();
      }
    };

    if (tx) {
      await executeInTx(tx);
    } else if (this.db.isTransaction) {
      await executeInTx(this.db as KyselyTx);
    } else {
      await (this.db as KyselyDb).transaction().execute(executeInTx);
    }
  }

  async delete(id: string, tx?: KyselyTx): Promise<void> {
    const executor = tx ?? this.db;
    await executor.deleteFrom("evaluation_marks").where("evaluation_id", "=", id).execute();
    await executor.deleteFrom("questions").where("evaluation_id", "=", id).execute();
    await executor.deleteFrom("evaluations").where("id", "=", id).execute();
  }
}
