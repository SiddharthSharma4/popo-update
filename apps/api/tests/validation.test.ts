/**
 * Integration & Unit Tests for Deterministic Completeness Validation (TASK-P3-VAL-001).
 *
 * Conforms to:
 * - docs/contracts/01-product-contract.md §13 (CompleteCheck) & FR-003 (Completeness Validation)
 * - docs/contracts/02-architecture-contract.md §8 (Application Layer) & §14 (Validation / CompleteCheck Module)
 * - docs/contracts/05-domain-contract.md §10 (Evaluation Aggregate completeness rules)
 * - docs/contracts/06-api-contract.md §23, §24 (Submission Validation Trigger)
 * - docs/contracts/07-event-contract.md §5, §32 (EvaluationSubmitted payload & audit)
 * - docs/contracts/09-testing-contract.md §40 (Deterministic detector testing)
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createDatabase, type KyselyDb } from "../src/infrastructure/database/database.js";
import { runMigrations } from "../src/infrastructure/database/migrator.js";
import { KyselyUnitOfWork } from "../src/infrastructure/persistence/kysely-unit-of-work.js";
import { KyselyEvaluationRepository } from "../src/infrastructure/repositories/kysely-evaluation-repository.js";
import { KyselyRubricRepository } from "../src/infrastructure/repositories/kysely-rubric-repository.js";
import {
  Evaluation,
  SubmissionCompletenessValidator,
  Rubric,
} from "../src/domain/index.js";
import {
  RunCompletenessCheckHandler,
  CreateEvaluationHandler,
  CreateRubricHandler,
  AssignMarkHandler,
  SubmitEvaluationHandler,
  EntityNotFoundError,
  InvalidCommandError,
  UnauthorizedActionError,
} from "../src/application/index.js";
import { CompletenessValidationResultDtoSchema } from "@osm/shared";

describe("Deterministic Completeness Validation (TASK-P3-VAL-001)", () => {
  let db: KyselyDb;
  let uow: KyselyUnitOfWork;
  let evaluationRepo: KyselyEvaluationRepository;
  let rubricRepo: KyselyRubricRepository;
  let completenessValidator: SubmissionCompletenessValidator;
  let runCompletenessCheckHandler: RunCompletenessCheckHandler;
  let createRubricHandler: CreateRubricHandler;
  let createEvaluationHandler: CreateEvaluationHandler;
  let assignMarkHandler: AssignMarkHandler;
  let submitEvaluationHandler: SubmitEvaluationHandler;

  beforeEach(async () => {
    db = createDatabase(":memory:");
    await runMigrations(db);

    evaluationRepo = new KyselyEvaluationRepository(db);
    rubricRepo = new KyselyRubricRepository(db);
    uow = new KyselyUnitOfWork(db, evaluationRepo, rubricRepo);

    completenessValidator = new SubmissionCompletenessValidator();
    runCompletenessCheckHandler = new RunCompletenessCheckHandler(
      evaluationRepo,
      completenessValidator
    );
    createRubricHandler = new CreateRubricHandler(uow);
    createEvaluationHandler = new CreateEvaluationHandler(uow);
    assignMarkHandler = new AssignMarkHandler(uow);
    submitEvaluationHandler = new SubmitEvaluationHandler(uow, completenessValidator);

    // Seed a standard test rubric
    await createRubricHandler.execute({
      id: "rubric-math-101",
      title: "Mathematics 101 Rubric",
      version: 1,
      criteria: [
        {
          id: "crit-1",
          title: "Calculus foundations",
          maxMarks: 10,
        },
      ],
    });
  });

  afterEach(async () => {
    await db.destroy();
  });

  describe("SubmissionCompletenessValidator (Domain Unit Tests)", () => {
    it("should detect completely unmarked evaluations (all questions unmarked)", () => {
      const evaluation = Evaluation.create({
        id: "eval-unmarked",
        evaluationCycleId: "cycle-2026-term1",
        scriptId: "script-001",
        evaluatorId: "evaluator-prof-jones",
        rubricId: "rubric-math-101",
        rubricVersion: 1,
        questions: [
          { id: "q1", questionNumber: "1", text: "Integrate x^2", maxMarks: 10, orderIndex: 1 },
          { id: "q2", questionNumber: "2", text: "Differentiate sin(x)", maxMarks: 10, orderIndex: 2 },
          { id: "q3", questionNumber: "3", text: "Compute limit", maxMarks: 10, orderIndex: 3 },
        ],
      });

      const result = completenessValidator.validate(evaluation);

      expect(result.evaluationId).toBe("eval-unmarked");
      expect(result.isComplete).toBe(false);
      expect(result.isValid).toBe(false);
      expect(result.totalQuestions).toBe(3);
      expect(result.markedQuestions).toBe(0);
      expect(result.unmarkedQuestions).toBe(3);
      expect(result.missingQuestionIds).toEqual(["q1", "q2", "q3"]);

      // Verify explainable structured issues
      const allUnmarkedIssue = result.issues.find((i) => i.code === "COMPLETENESS_ALL_UNMARKED");
      expect(allUnmarkedIssue).toBeDefined();
      expect(allUnmarkedIssue?.severity).toBe("ERROR");
      expect(allUnmarkedIssue?.message).toContain("All 3 questions in this evaluation remain unmarked.");

      // Verify itemized missing question issues with evidence
      const missingMarkIssues = result.issues.filter((i) => i.code === "COMPLETENESS_MISSING_MARK");
      expect(missingMarkIssues.length).toBe(3);
      expect(missingMarkIssues[0].questionId).toBe("q1");
      expect(missingMarkIssues[0].evidence?.maxMarks).toBe(10);
    });

    it("should detect partially marked evaluations and identify exact missing question IDs", () => {
      const evaluation = Evaluation.create({
        id: "eval-partial",
        evaluationCycleId: "cycle-2026-term1",
        scriptId: "script-002",
        evaluatorId: "evaluator-prof-jones",
        rubricId: "rubric-math-101",
        rubricVersion: 1,
        questions: [
          { id: "q1", questionNumber: "1", text: "Question 1", maxMarks: 10, orderIndex: 1 },
          { id: "q2", questionNumber: "2", text: "Question 2", maxMarks: 10, orderIndex: 2 },
          { id: "q3", questionNumber: "3", text: "Question 3", maxMarks: 10, orderIndex: 3 },
        ],
      });

      // Mark only q1
      evaluation.assignMark({
        questionId: "q1",
        awardedMarks: 9,
        evaluatorId: "evaluator-prof-jones",
      });

      const result = completenessValidator.validate(evaluation);

      expect(result.isComplete).toBe(false);
      expect(result.isValid).toBe(false);
      expect(result.totalQuestions).toBe(3);
      expect(result.markedQuestions).toBe(1);
      expect(result.unmarkedQuestions).toBe(2);
      expect(result.missingQuestionIds).toEqual(["q2", "q3"]);

      // Structured partial issue
      const partialIssue = result.issues.find((i) => i.code === "COMPLETENESS_PARTIALLY_MARKED");
      expect(partialIssue).toBeDefined();
      expect(partialIssue?.message).toContain("2 of 3 questions remain unmarked.");
      expect(partialIssue?.evidence?.missingQuestionIds).toEqual(["q2", "q3"]);

      // Specific missing question issues
      const missingIssues = result.issues.filter((i) => i.code === "COMPLETENESS_MISSING_MARK");
      expect(missingIssues.length).toBe(2);
      expect(missingIssues.map((i) => i.questionId)).toEqual(["q2", "q3"]);
    });

    it("should pass completeness validation when all questions are marked", () => {
      const evaluation = Evaluation.create({
        id: "eval-complete",
        evaluationCycleId: "cycle-2026-term1",
        scriptId: "script-003",
        evaluatorId: "evaluator-prof-jones",
        rubricId: "rubric-math-101",
        rubricVersion: 1,
        questions: [
          { id: "q1", questionNumber: "1", text: "Question 1", maxMarks: 10, orderIndex: 1 },
          { id: "q2", questionNumber: "2", text: "Question 2", maxMarks: 10, orderIndex: 2 },
        ],
      });

      evaluation.assignMark({
        questionId: "q1",
        awardedMarks: 8,
        evaluatorId: "evaluator-prof-jones",
      });
      evaluation.assignMark({
        questionId: "q2",
        awardedMarks: 7,
        evaluatorId: "evaluator-prof-jones",
      });

      const result = completenessValidator.validate(evaluation);

      expect(result.isComplete).toBe(true);
      expect(result.isValid).toBe(true);
      expect(result.totalQuestions).toBe(2);
      expect(result.markedQuestions).toBe(2);
      expect(result.unmarkedQuestions).toBe(0);
      expect(result.missingQuestionIds).toEqual([]);
      expect(result.issues).toEqual([]);
    });

    it("should dynamically transition from incomplete to complete as marks are recorded", () => {
      const evaluation = Evaluation.create({
        id: "eval-dynamic",
        evaluationCycleId: "cycle-2026-term1",
        scriptId: "script-004",
        evaluatorId: "evaluator-prof-jones",
        rubricId: "rubric-math-101",
        rubricVersion: 1,
        questions: [
          { id: "q1", questionNumber: "1", text: "Question 1", maxMarks: 10, orderIndex: 1 },
          { id: "q2", questionNumber: "2", text: "Question 2", maxMarks: 10, orderIndex: 2 },
        ],
      });

      // Step 1: 0 marks
      const check1 = completenessValidator.validate(evaluation);
      expect(check1.isComplete).toBe(false);
      expect(check1.missingQuestionIds).toEqual(["q1", "q2"]);

      // Step 2: 1 mark
      evaluation.assignMark({
        questionId: "q1",
        awardedMarks: 5,
        evaluatorId: "evaluator-prof-jones",
      });
      const check2 = completenessValidator.validate(evaluation);
      expect(check2.isComplete).toBe(false);
      expect(check2.missingQuestionIds).toEqual(["q2"]);

      // Step 3: all marks
      evaluation.assignMark({
        questionId: "q2",
        awardedMarks: 10,
        evaluatorId: "evaluator-prof-jones",
      });
      const check3 = completenessValidator.validate(evaluation);
      expect(check3.isComplete).toBe(true);
      expect(check3.missingQuestionIds).toEqual([]);
      expect(check3.issues).toEqual([]);
    });

    it("should guarantee determinism: identical inputs produce identical outputs (Testing Contract §40)", () => {
      const evaluation = Evaluation.create({
        id: "eval-deterministic",
        evaluationCycleId: "cycle-2026-term1",
        scriptId: "script-005",
        evaluatorId: "evaluator-prof-jones",
        rubricId: "rubric-math-101",
        rubricVersion: 1,
        questions: [
          { id: "q1", questionNumber: "1", text: "Question 1", maxMarks: 10, orderIndex: 1 },
          { id: "q2", questionNumber: "2", text: "Question 2", maxMarks: 10, orderIndex: 2 },
        ],
      });
      evaluation.assignMark({
        questionId: "q1",
        awardedMarks: 6,
        evaluatorId: "evaluator-prof-jones",
      });

      const run1 = completenessValidator.validate(evaluation);
      const run2 = completenessValidator.validate(evaluation);
      const run3 = completenessValidator.validate(evaluation);

      expect(run1.isComplete).toBe(run2.isComplete);
      expect(run2.isComplete).toBe(run3.isComplete);
      expect(run1.missingQuestionIds).toEqual(run2.missingQuestionIds);
      expect(run1.issues.length).toEqual(run2.issues.length);
      expect(run1.issues.map((i) => i.code)).toEqual(run3.issues.map((i) => i.code));
    });
  });

  describe("RunCompletenessCheckHandler (Application Use Case)", () => {
    it("should run completeness check on persistent evaluation and return conforming DTO", async () => {
      await createEvaluationHandler.execute({
        id: "eval-app-check",
        evaluationCycleId: "cycle-2026-term1",
        scriptId: "script-100",
        evaluatorId: "evaluator-prof-jones",
        rubricId: "rubric-math-101",
        rubricVersion: 1,
        questions: [
          { id: "q1", questionNumber: "1", text: "Question 1", maxMarks: 10, orderIndex: 1 },
          { id: "q2", questionNumber: "2", text: "Question 2", maxMarks: 10, orderIndex: 2 },
        ],
      });

      // Initially unmarked
      const resultDto = await runCompletenessCheckHandler.execute({
        evaluationId: "eval-app-check",
      });

      // Validate schema conformity
      const parsed = CompletenessValidationResultDtoSchema.safeParse(resultDto);
      expect(parsed.success).toBe(true);

      expect(resultDto.evaluationId).toBe("eval-app-check");
      expect(resultDto.isComplete).toBe(false);
      expect(resultDto.unmarkedQuestions).toBe(2);
      expect(resultDto.missingQuestionIds).toEqual(["q1", "q2"]);

      // Mark q1, q2 and re-check
      await assignMarkHandler.execute({
        evaluationId: "eval-app-check",
        questionId: "q1",
        awardedMarks: 8,
        evaluatorId: "evaluator-prof-jones",
      });
      await assignMarkHandler.execute({
        evaluationId: "eval-app-check",
        questionId: "q2",
        awardedMarks: 9,
        evaluatorId: "evaluator-prof-jones",
      });

      const updatedDto = await runCompletenessCheckHandler.execute({
        evaluationId: "eval-app-check",
      });

      expect(updatedDto.isComplete).toBe(true);
      expect(updatedDto.isValid).toBe(true);
      expect(updatedDto.unmarkedQuestions).toBe(0);
      expect(updatedDto.missingQuestionIds).toEqual([]);
      expect(updatedDto.issues).toEqual([]);
    });

    it("should throw EntityNotFoundError when evaluation does not exist", async () => {
      await expect(
        runCompletenessCheckHandler.execute({
          evaluationId: "nonexistent-evaluation",
        })
      ).rejects.toThrow(EntityNotFoundError);
    });

    it("should throw InvalidCommandError when evaluationId is empty", async () => {
      await expect(
        runCompletenessCheckHandler.execute({
          evaluationId: "   ",
        })
      ).rejects.toThrow(InvalidCommandError);
    });
  });

  describe("Submission Flow Integration (06-api-contract §23, §24)", () => {
    it("should trigger deterministic completeness validation on submission and record results in Outbox and Audit trails", async () => {
      await createEvaluationHandler.execute({
        id: "eval-submit-complete",
        evaluationCycleId: "cycle-2026-term1",
        scriptId: "script-200",
        evaluatorId: "evaluator-prof-jones",
        rubricId: "rubric-math-101",
        rubricVersion: 1,
        questions: [
          { id: "q1", questionNumber: "1", text: "Question 1", maxMarks: 10, orderIndex: 1 },
          { id: "q2", questionNumber: "2", text: "Question 2", maxMarks: 10, orderIndex: 2 },
        ],
      });

      // Mark both questions
      await assignMarkHandler.execute({
        evaluationId: "eval-submit-complete",
        questionId: "q1",
        awardedMarks: 10,
        evaluatorId: "evaluator-prof-jones",
      });
      await assignMarkHandler.execute({
        evaluationId: "eval-submit-complete",
        questionId: "q2",
        awardedMarks: 9,
        evaluatorId: "evaluator-prof-jones",
      });

      // Submit
      const submitted = await submitEvaluationHandler.execute({
        evaluationId: "eval-submit-complete",
        evaluatorId: "evaluator-prof-jones",
      });

      expect(submitted.status).toBe("SUBMITTED");
      expect(submitted.isComplete).toBe(true);

      // Verify Outbox event payload records full completeness result
      const outboxEvents = await db
        .selectFrom("outbox_events")
        .selectAll()
        .where("aggregate_id", "=", "eval-submit-complete")
        .where("event_type", "=", "EvaluationSubmitted")
        .execute();

      expect(outboxEvents.length).toBe(1);
      const outboxPayload = JSON.parse(outboxEvents[0].payload);
      expect(outboxPayload.isComplete).toBe(true);
      expect(outboxPayload.missingQuestions).toEqual([]);
      expect(outboxPayload.completeness).toBeDefined();
      expect(outboxPayload.completeness.isComplete).toBe(true);
      expect(outboxPayload.completeness.isValid).toBe(true);
      expect(outboxPayload.completeness.unmarkedQuestions).toBe(0);
      expect(outboxPayload.completeness.issueCount).toBe(0);

      // Verify Audit event captures completeness result
      const auditEvents = await db
        .selectFrom("audit_events")
        .selectAll()
        .where("entity_id", "=", "eval-submit-complete")
        .where("event_type", "=", "EvaluationSubmitted")
        .execute();

      expect(auditEvents.length).toBe(1);
      const auditDetails = JSON.parse(auditEvents[0].details || "{}");
      expect(auditDetails.isComplete).toBe(true);
      expect(auditDetails.completenessResult.isValid).toBe(true);
      expect(auditDetails.completenessResult.missingCount).toBe(0);
    });

    it("should capture partial completeness state in Outbox and Audit when submitting partially marked evaluation", async () => {
      await createEvaluationHandler.execute({
        id: "eval-submit-partial",
        evaluationCycleId: "cycle-2026-term1",
        scriptId: "script-201",
        evaluatorId: "evaluator-prof-jones",
        rubricId: "rubric-math-101",
        rubricVersion: 1,
        questions: [
          { id: "q1", questionNumber: "1", text: "Question 1", maxMarks: 10, orderIndex: 1 },
          { id: "q2", questionNumber: "2", text: "Question 2", maxMarks: 10, orderIndex: 2 },
          { id: "q3", questionNumber: "3", text: "Question 3", maxMarks: 10, orderIndex: 3 },
        ],
      });

      // Mark only q1
      await assignMarkHandler.execute({
        evaluationId: "eval-submit-partial",
        questionId: "q1",
        awardedMarks: 7,
        evaluatorId: "evaluator-prof-jones",
      });

      // Submit partially marked evaluation
      const submitted = await submitEvaluationHandler.execute({
        evaluationId: "eval-submit-partial",
        evaluatorId: "evaluator-prof-jones",
      });

      expect(submitted.status).toBe("SUBMITTED");
      expect(submitted.isComplete).toBe(false);

      // Verify Outbox captures incomplete state and exact missing questions for downstream QualitySignal pipeline
      const outboxEvents = await db
        .selectFrom("outbox_events")
        .selectAll()
        .where("aggregate_id", "=", "eval-submit-partial")
        .where("event_type", "=", "EvaluationSubmitted")
        .execute();

      const outboxPayload = JSON.parse(outboxEvents[0].payload);
      expect(outboxPayload.isComplete).toBe(false);
      expect(outboxPayload.missingQuestions).toEqual(["q2", "q3"]);
      expect(outboxPayload.completeness.isComplete).toBe(false);
      expect(outboxPayload.completeness.unmarkedQuestions).toBe(2);
      expect(outboxPayload.completeness.missingQuestionIds).toEqual(["q2", "q3"]);
      expect(outboxPayload.completeness.issueCount).toBeGreaterThan(0);

      // Verify Audit event captures missing count
      const auditEvents = await db
        .selectFrom("audit_events")
        .selectAll()
        .where("entity_id", "=", "eval-submit-partial")
        .where("event_type", "=", "EvaluationSubmitted")
        .execute();

      const auditDetails = JSON.parse(auditEvents[0].details || "{}");
      expect(auditDetails.isComplete).toBe(false);
      expect(auditDetails.completenessResult.isValid).toBe(false);
      expect(auditDetails.completenessResult.missingCount).toBe(2);
    });

    it("should preserve AI non-authority invariant (INV-003) during submission validation", async () => {
      await createEvaluationHandler.execute({
        id: "eval-ai-submit-reject",
        evaluationCycleId: "cycle-2026-term1",
        scriptId: "script-202",
        evaluatorId: "evaluator-prof-jones",
        rubricId: "rubric-math-101",
        rubricVersion: 1,
        questions: [
          { id: "q1", questionNumber: "1", text: "Question 1", maxMarks: 10, orderIndex: 1 },
        ],
      });

      await expect(
        submitEvaluationHandler.execute({
          evaluationId: "eval-ai-submit-reject",
          evaluatorId: "evaluator-prof-jones",
          actorType: "AI",
        })
      ).rejects.toThrow(UnauthorizedActionError);
    });

    it("should preserve evaluator assignment authorization during submission validation", async () => {
      await createEvaluationHandler.execute({
        id: "eval-auth-submit-reject",
        evaluationCycleId: "cycle-2026-term1",
        scriptId: "script-203",
        evaluatorId: "evaluator-prof-jones",
        rubricId: "rubric-math-101",
        rubricVersion: 1,
        questions: [
          { id: "q1", questionNumber: "1", text: "Question 1", maxMarks: 10, orderIndex: 1 },
        ],
      });

      await expect(
        submitEvaluationHandler.execute({
          evaluationId: "eval-auth-submit-reject",
          evaluatorId: "evaluator-different-person",
          actorType: "USER",
        })
      ).rejects.toThrow(UnauthorizedActionError);
    });
  });
});
