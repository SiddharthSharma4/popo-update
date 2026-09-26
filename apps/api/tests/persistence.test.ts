import { describe, it, expect, beforeEach } from "vitest";
import { createDatabase, type KyselyDb } from "../src/infrastructure/database/database.js";
import { runMigrations } from "../src/infrastructure/database/migrator.js";
import {
  KyselyEvaluationRepository,
  KyselyRubricRepository,
} from "../src/infrastructure/repositories/index.js";
import { Evaluation } from "../src/domain/evaluation/evaluation.js";
import { Rubric } from "../src/domain/rubric/rubric.js";
import { ConcurrencyConflictError } from "../src/domain/errors.js";

describe("Authoritative Persistence: Rubrics & Evaluations", () => {
  let db: KyselyDb;
  let evaluationRepo: KyselyEvaluationRepository;
  let rubricRepo: KyselyRubricRepository;

  beforeEach(async () => {
    db = createDatabase(":memory:");
    await runMigrations(db);
    evaluationRepo = new KyselyEvaluationRepository(db);
    rubricRepo = new KyselyRubricRepository(db);
  });

  describe("Rubric Persistence & Version Immutability", () => {
    it("should save and retrieve a rubric by ID and version", async () => {
      const rubric = new Rubric({
        id: "rubric-bio-101",
        title: "Biology 101 Midterm Rubric",
        version: 1,
        criteria: [
          {
            id: "c1",
            title: "Cellular Structure",
            maxMarks: 10,
            levels: [
              { title: "Exemplary", marks: 10, description: "All organelles correct" },
              { title: "Adequate", marks: 5, description: "Basic organelles identified" },
            ],
          },
        ],
      });

      await rubricRepo.save(rubric);

      const loaded = await rubricRepo.findByIdAndVersion("rubric-bio-101", 1);
      expect(loaded).not.toBeNull();
      expect(loaded?.id).toBe("rubric-bio-101");
      expect(loaded?.version).toBe(1);
      expect(loaded?.totalMaxMarks).toBe(10);
      expect(loaded?.criteria[0].title).toBe("Cellular Structure");
      expect(loaded?.criteria[0].levels[0].marks).toBe(10);
    });

    it("should enforce immutability: reject modification of existing rubric version", async () => {
      const rubricV1 = new Rubric({
        id: "rubric-chem-201",
        title: "Chemistry Rubric",
        version: 1,
        criteria: [{ id: "c1", title: "Stoichiometry", maxMarks: 10 }],
      });
      await rubricRepo.save(rubricV1);

      // Attempt to overwrite version 1 with different content
      const modifiedV1 = new Rubric({
        id: "rubric-chem-201",
        title: "Chemistry Rubric MODIFIED",
        version: 1,
        criteria: [{ id: "c1", title: "Stoichiometry", maxMarks: 15 }],
      });

      await expect(rubricRepo.save(modifiedV1)).rejects.toThrow(
        /rubric versions are immutable once stored/i
      );
    });

    it("should allow creating a new version for an existing rubric", async () => {
      const rubricV1 = new Rubric({
        id: "rubric-phys-301",
        title: "Physics Rubric V1",
        version: 1,
        criteria: [{ id: "c1", title: "Newtonian Mechanics", maxMarks: 10 }],
      });
      const rubricV2 = new Rubric({
        id: "rubric-phys-301",
        title: "Physics Rubric V2",
        version: 2,
        criteria: [{ id: "c1", title: "Newtonian Mechanics Extended", maxMarks: 20 }],
      });

      await rubricRepo.save(rubricV1);
      await rubricRepo.save(rubricV2);

      const latest = await rubricRepo.findLatestById("rubric-phys-301");
      expect(latest?.version).toBe(2);
      expect(latest?.totalMaxMarks).toBe(20);

      const loadedV1 = await rubricRepo.findByIdAndVersion("rubric-phys-301", 1);
      expect(loadedV1?.version).toBe(1);
      expect(loadedV1?.totalMaxMarks).toBe(10);
    });
  });

  describe("Evaluation Persistence & Optimistic Concurrency", () => {
    const createSampleEvaluation = () => {
      return Evaluation.create({
        id: "eval-sample-001",
        evaluationCycleId: "cycle-2026-term1",
        scriptId: "script-student-42",
        evaluatorId: "evaluator-prof-jones",
        rubricId: "rubric-bio-101",
        rubricVersion: 1,
        questions: [
          {
            id: "q1",
            questionNumber: "1",
            text: "Explain cellular respiration.",
            maxMarks: 10,
            orderIndex: 1,
          },
          {
            id: "q2",
            questionNumber: "2",
            text: "Calculate ATP yield.",
            maxMarks: 10,
            orderIndex: 2,
          },
        ],
      });
    };

    it("should save a new evaluation with questions and reload cleanly", async () => {
      const evalInstance = createSampleEvaluation();
      await evaluationRepo.save(evalInstance);

      const loaded = await evaluationRepo.findById("eval-sample-001");
      expect(loaded).not.toBeNull();
      expect(loaded?.id).toBe("eval-sample-001");
      expect(loaded?.status).toBe("DRAFT");
      expect(loaded?.version).toBe(1);
      expect(loaded?.questions.length).toBe(2);
      expect(loaded?.questions[0].questionNumber).toBe("1");
      expect(loaded?.questions[1].questionNumber).toBe("2");
      expect(loaded?.isComplete()).toBe(false);
      expect(loaded?.totalScore).toBe(0);
    });

    it("should update marks and recalculate aggregate scores in database", async () => {
      const evalInstance = createSampleEvaluation();
      await evaluationRepo.save(evalInstance);

      // Re-load and assign marks
      const loaded = (await evaluationRepo.findById("eval-sample-001"))!;
      loaded.assignMark({
        questionId: "q1",
        awardedMarks: 9,
        evaluatorId: "evaluator-prof-jones",
        comments: "Comprehensive answer",
      });

      await evaluationRepo.save(loaded);

      const updated = (await evaluationRepo.findById("eval-sample-001"))!;
      expect(updated.status).toBe("IN_PROGRESS");
      expect(updated.version).toBe(2);
      expect(updated.totalScore).toBe(9);
      expect(updated.getMark("q1")?.awardedMarks).toBe(9);
      expect(updated.getMark("q1")?.comments).toBe("Comprehensive answer");
      expect(updated.isComplete()).toBe(false);
    });

    it("should detect and reject optimistic concurrency conflicts (DATA-006)", async () => {
      const evalInstance = createSampleEvaluation();
      await evaluationRepo.save(evalInstance);

      // Load two independent instances representing concurrent sessions
      const sessionA = (await evaluationRepo.findById("eval-sample-001"))!;
      const sessionB = (await evaluationRepo.findById("eval-sample-001"))!;

      expect(sessionA.version).toBe(1);
      expect(sessionB.version).toBe(1);

      // Session A modifies and saves successfully
      sessionA.assignMark({
        questionId: "q1",
        awardedMarks: 8,
        evaluatorId: "evaluator-prof-jones",
      });
      await evaluationRepo.save(sessionA);
      expect(sessionA.version).toBe(2);

      // Session B attempts to save based on stale version 1
      sessionB.assignMark({
        questionId: "q1",
        awardedMarks: 5,
        evaluatorId: "evaluator-prof-jones",
      });

      // Saving sessionB must fail with ConcurrencyConflictError
      await expect(evaluationRepo.save(sessionB)).rejects.toThrow(ConcurrencyConflictError);

      // Verify that Session A's value was not overwritten
      const current = (await evaluationRepo.findById("eval-sample-001"))!;
      expect(current.version).toBe(2);
      expect(current.getMark("q1")?.awardedMarks).toBe(8);
    });

    it("should cascade delete questions and marks when evaluation is deleted", async () => {
      const evalInstance = createSampleEvaluation();
      evalInstance.assignMark({
        questionId: "q1",
        awardedMarks: 7,
        evaluatorId: "evaluator-prof-jones",
      });
      await evaluationRepo.save(evalInstance);

      // Verify records exist in DB
      const questionsBefore = await db
        .selectFrom("questions")
        .selectAll()
        .where("evaluation_id", "=", "eval-sample-001")
        .execute();
      expect(questionsBefore.length).toBe(2);

      const marksBefore = await db
        .selectFrom("evaluation_marks")
        .selectAll()
        .where("evaluation_id", "=", "eval-sample-001")
        .execute();
      expect(marksBefore.length).toBe(1);

      // Delete evaluation
      await evaluationRepo.delete("eval-sample-001");

      // Verify cascade
      const questionsAfter = await db
        .selectFrom("questions")
        .selectAll()
        .where("evaluation_id", "=", "eval-sample-001")
        .execute();
      expect(questionsAfter.length).toBe(0);

      const marksAfter = await db
        .selectFrom("evaluation_marks")
        .selectAll()
        .where("evaluation_id", "=", "eval-sample-001")
        .execute();
      expect(marksAfter.length).toBe(0);
    });

    it("should support transactional save with outbox event atomically (DATA-005)", async () => {
      const evalInstance = createSampleEvaluation();

      // Execute within an ACID transaction
      await db.transaction().execute(async (trx) => {
        await evaluationRepo.save(evalInstance, trx);

        await trx
          .insertInto("outbox_events")
          .values({
            id: "evt-001",
            event_type: "EvaluationCreated",
            event_version: 1,
            aggregate_type: "Evaluation",
            aggregate_id: evalInstance.id,
            producer: "evaluation",
            actor_type: "USER",
            actor_id: evalInstance.evaluatorId,
            correlation_id: "corr-1",
            causation_id: "cmd-1",
            payload: JSON.stringify({ evaluationId: evalInstance.id }),
            status: "PENDING",
            created_at: new Date().toISOString(),
          })
          .execute();
      });

      const loadedEval = await evaluationRepo.findById("eval-sample-001");
      const loadedEvent = await db
        .selectFrom("outbox_events")
        .selectAll()
        .where("id", "=", "evt-001")
        .executeTakeFirst();

      expect(loadedEval).not.toBeNull();
      expect(loadedEvent).not.toBeNull();
      expect(loadedEvent?.aggregate_id).toBe("eval-sample-001");
    });
  });
});
