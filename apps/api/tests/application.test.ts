import { describe, it, expect, beforeEach } from "vitest";
import { createDatabase, type KyselyDb } from "../src/infrastructure/database/database.js";
import { runMigrations } from "../src/infrastructure/database/migrator.js";
import {
  KyselyEvaluationRepository,
  KyselyRubricRepository,
} from "../src/infrastructure/repositories/index.js";
import { KyselyUnitOfWork } from "../src/infrastructure/persistence/index.js";
import {
  CreateEvaluationHandler,
  AssignMarkHandler,
  SubmitEvaluationHandler,
  CreateRubricHandler,
  GetEvaluationByIdHandler,
  GetRubricByIdHandler,
  EvaluationApplicationService,
  EntityNotFoundError,
  InvalidCommandError,
  UnauthorizedActionError,
} from "../src/application/index.js";
import {
  InvalidMarkError,
  QuestionNotFoundError,
  EvaluationLockedError,
  InvalidStateTransitionError,
  ConcurrencyConflictError,
} from "../src/domain/index.js";

describe("Application Layer: Boundaries, Commands, Queries, and Unit of Work", () => {
  let db: KyselyDb;
  let uow: KyselyUnitOfWork;
  let evaluationRepo: KyselyEvaluationRepository;
  let rubricRepo: KyselyRubricRepository;

  let createRubricHandler: CreateRubricHandler;
  let createEvaluationHandler: CreateEvaluationHandler;
  let assignMarkHandler: AssignMarkHandler;
  let submitEvaluationHandler: SubmitEvaluationHandler;
  let getEvaluationByIdHandler: GetEvaluationByIdHandler;
  let getRubricByIdHandler: GetRubricByIdHandler;
  let evaluationService: EvaluationApplicationService;

  beforeEach(async () => {
    db = createDatabase(":memory:");
    await runMigrations(db);

    uow = new KyselyUnitOfWork(db);
    evaluationRepo = new KyselyEvaluationRepository(db);
    rubricRepo = new KyselyRubricRepository(db);

    createRubricHandler = new CreateRubricHandler(uow);
    createEvaluationHandler = new CreateEvaluationHandler(uow);
    assignMarkHandler = new AssignMarkHandler(uow);
    submitEvaluationHandler = new SubmitEvaluationHandler(uow);
    getEvaluationByIdHandler = new GetEvaluationByIdHandler(evaluationRepo);
    getRubricByIdHandler = new GetRubricByIdHandler(rubricRepo);
    evaluationService = new EvaluationApplicationService(uow, evaluationRepo);

    // Seed test rubric
    await createRubricHandler.execute({
      id: "rubric-bio-101",
      title: "Biology 101 Midterm Rubric",
      version: 1,
      criteria: [
        {
          id: "crit-1",
          title: "Conceptual Clarity",
          maxMarks: 10,
        },
        {
          id: "crit-2",
          title: "Data Analysis",
          maxMarks: 10,
        },
      ],
    });
  });

  describe("CreateEvaluationCommand", () => {
    it("should successfully execute CreateEvaluationCommand and emit atomic outbox and audit records", async () => {
      const result = await createEvaluationHandler.execute({
        id: "eval-001",
        evaluationCycleId: "cycle-2026-term1",
        scriptId: "script-student-12",
        evaluatorId: "prof-watson",
        rubricId: "rubric-bio-101",
        rubricVersion: 1,
        questions: [
          {
            id: "q1",
            questionNumber: "1",
            text: "Explain osmosis",
            maxMarks: 10,
            orderIndex: 1,
          },
          {
            id: "q2",
            questionNumber: "2",
            text: "Explain diffusion",
            maxMarks: 10,
            orderIndex: 2,
          },
        ],
      });

      expect(result.id).toBe("eval-001");
      expect(result.status).toBe("DRAFT");
      expect(result.totalScore).toBe(0);
      expect(result.maxPossibleScore).toBe(20);
      expect(result.version).toBe(1);

      // Verify atomic Outbox event was created in SQLite
      const outboxEvents = await db
        .selectFrom("outbox_events")
        .selectAll()
        .where("aggregate_id", "=", "eval-001")
        .execute();

      expect(outboxEvents.length).toBe(1);
      expect(outboxEvents[0].event_type).toBe("EvaluationCreated");
      expect(outboxEvents[0].actor_id).toBe("prof-watson");

      // Verify atomic Audit event was created in SQLite
      const auditEvents = await db
        .selectFrom("audit_events")
        .selectAll()
        .where("entity_id", "=", "eval-001")
        .execute();

      expect(auditEvents.length).toBe(1);
      expect(auditEvents[0].action).toBe("CREATE_EVALUATION");
    });

    it("should throw EntityNotFoundError when rubric does not exist", async () => {
      await expect(
        createEvaluationHandler.execute({
          id: "eval-invalid-rubric",
          evaluationCycleId: "cycle-1",
          scriptId: "script-1",
          evaluatorId: "evaluator-1",
          rubricId: "nonexistent-rubric",
          rubricVersion: 1,
          questions: [
            {
              id: "q1",
              questionNumber: "1",
              text: "Q",
              maxMarks: 10,
              orderIndex: 1,
            },
          ],
        })
      ).rejects.toThrow(EntityNotFoundError);
    });

    it("should throw InvalidCommandError when command payload is invalid", async () => {
      await expect(
        createEvaluationHandler.execute({
          id: "",
          evaluationCycleId: "cycle-1",
          scriptId: "script-1",
          evaluatorId: "evaluator-1",
          rubricId: "rubric-bio-101",
          rubricVersion: 1,
          questions: [],
        })
      ).rejects.toThrow(InvalidCommandError);
    });
  });

  describe("AssignMarkCommand & AI Non-Authority Boundary", () => {
    beforeEach(async () => {
      await createEvaluationHandler.execute({
        id: "eval-002",
        evaluationCycleId: "cycle-2026-term1",
        scriptId: "script-student-12",
        evaluatorId: "prof-watson",
        rubricId: "rubric-bio-101",
        rubricVersion: 1,
        questions: [
          {
            id: "q1",
            questionNumber: "1",
            text: "Explain osmosis",
            maxMarks: 10,
            orderIndex: 1,
          },
        ],
      });
    });

    it("should successfully assign mark, update score, advance version, and record outbox event", async () => {
      const result = await assignMarkHandler.execute({
        evaluationId: "eval-002",
        questionId: "q1",
        awardedMarks: 8.5,
        evaluatorId: "prof-watson",
        comments: "Good clarity",
      });

      expect(result.status).toBe("IN_PROGRESS");
      expect(result.totalScore).toBe(8.5);
      expect(result.version).toBe(2);

      // Verify outbox update event
      const outbox = await db
        .selectFrom("outbox_events")
        .selectAll()
        .where("aggregate_id", "=", "eval-002")
        .where("event_type", "=", "EvaluationUpdated")
        .execute();

      expect(outbox.length).toBe(1);
    });

    it("should enforce AI Non-Authority Invariant (INV-003): reject mark assignment when actor is AI", async () => {
      await expect(
        assignMarkHandler.execute({
          evaluationId: "eval-002",
          questionId: "q1",
          awardedMarks: 9,
          evaluatorId: "ai-assistant-v1",
          actorType: "AI",
        })
      ).rejects.toThrow(UnauthorizedActionError);

      // Verify mark was NOT assigned
      const loaded = await getEvaluationByIdHandler.execute({ evaluationId: "eval-002" });
      expect(loaded.totalScore).toBe(0);
      expect(loaded.version).toBe(1);
    });

    it("should throw EntityNotFoundError when evaluation does not exist", async () => {
      await expect(
        assignMarkHandler.execute({
          evaluationId: "nonexistent-evaluation",
          questionId: "q1",
          awardedMarks: 5,
          evaluatorId: "prof-watson",
        })
      ).rejects.toThrow(EntityNotFoundError);
    });

    it("should propagate domain invariant violations: throw InvalidMarkError when mark exceeds max", async () => {
      await expect(
        assignMarkHandler.execute({
          evaluationId: "eval-002",
          questionId: "q1",
          awardedMarks: 12, // max is 10
          evaluatorId: "prof-watson",
        })
      ).rejects.toThrow(InvalidMarkError);
    });

    it("should propagate domain QuestionNotFoundError when question is not in evaluation", async () => {
      await expect(
        assignMarkHandler.execute({
          evaluationId: "eval-002",
          questionId: "nonexistent-question",
          awardedMarks: 5,
          evaluatorId: "prof-watson",
        })
      ).rejects.toThrow(QuestionNotFoundError);
    });
  });

  describe("SubmitEvaluationCommand", () => {
    beforeEach(async () => {
      await createEvaluationHandler.execute({
        id: "eval-003",
        evaluationCycleId: "cycle-2026-term1",
        scriptId: "script-student-12",
        evaluatorId: "prof-watson",
        rubricId: "rubric-bio-101",
        rubricVersion: 1,
        questions: [
          {
            id: "q1",
            questionNumber: "1",
            text: "Question 1",
            maxMarks: 10,
            orderIndex: 1,
          },
        ],
      });
      await assignMarkHandler.execute({
        evaluationId: "eval-003",
        questionId: "q1",
        awardedMarks: 8,
        evaluatorId: "prof-watson",
      });
    });

    it("should successfully submit evaluation and record submittedAt timestamp", async () => {
      const result = await submitEvaluationHandler.execute({
        evaluationId: "eval-003",
        evaluatorId: "prof-watson",
      });

      expect(result.status).toBe("SUBMITTED");
      expect(result.submittedAt).toBeDefined();
      expect(result.version).toBe(3);

      // Verify EvaluationSubmitted outbox event
      const outbox = await db
        .selectFrom("outbox_events")
        .selectAll()
        .where("aggregate_id", "=", "eval-003")
        .where("event_type", "=", "EvaluationSubmitted")
        .execute();

      expect(outbox.length).toBe(1);
    });

    it("should enforce AI Non-Authority: reject submission by AI actor", async () => {
      await expect(
        submitEvaluationHandler.execute({
          evaluationId: "eval-003",
          evaluatorId: "ai-auto-grader",
          actorType: "AI",
        })
      ).rejects.toThrow(UnauthorizedActionError);
    });

    it("should enforce authorization: reject submission by unauthorized evaluator", async () => {
      await expect(
        submitEvaluationHandler.execute({
          evaluationId: "eval-003",
          evaluatorId: "prof-intruder",
        })
      ).rejects.toThrow(UnauthorizedActionError);
    });

    it("should lock evaluation: reject mark assignment after submission", async () => {
      await submitEvaluationHandler.execute({
        evaluationId: "eval-003",
        evaluatorId: "prof-watson",
      });

      await expect(
        assignMarkHandler.execute({
          evaluationId: "eval-003",
          questionId: "q1",
          awardedMarks: 10,
          evaluatorId: "prof-watson",
        })
      ).rejects.toThrow(EvaluationLockedError);
    });

    it("should reject double submission (InvalidStateTransitionError)", async () => {
      await submitEvaluationHandler.execute({
        evaluationId: "eval-003",
        evaluatorId: "prof-watson",
      });

      await expect(
        submitEvaluationHandler.execute({
          evaluationId: "eval-003",
          evaluatorId: "prof-watson",
        })
      ).rejects.toThrow(InvalidStateTransitionError);
    });
  });

  describe("Unit of Work Transaction Atomicity (Commit & Rollback)", () => {
    it("should rollback all state changes and outbox records when an operation fails mid-transaction", async () => {
      // Setup initial evaluation
      await createEvaluationHandler.execute({
        id: "eval-rollback-test",
        evaluationCycleId: "cycle-1",
        scriptId: "script-1",
        evaluatorId: "prof-watson",
        rubricId: "rubric-bio-101",
        rubricVersion: 1,
        questions: [
          {
            id: "q1",
            questionNumber: "1",
            text: "Question 1",
            maxMarks: 10,
            orderIndex: 1,
          },
        ],
      });

      // Attempt an operation inside UoW that fails after partial work
      const failingOperation = async () => {
        return uow.execute(async (scope) => {
          // 1. Load evaluation and assign mark
          const evaluation = (await scope.evaluations.findById("eval-rollback-test"))!;
          evaluation.assignMark({
            questionId: "q1",
            awardedMarks: 5,
            evaluatorId: "prof-watson",
          });
          await scope.evaluations.save(evaluation);

          // 2. Outbox event
          await scope.outbox.record({
            eventType: "EvaluationUpdated",
            aggregateType: "Evaluation",
            aggregateId: evaluation.id,
            producer: "evaluation",
            actorType: "USER",
            actorId: "prof-watson",
            payload: { partial: true },
          });

          // 3. Deliberately throw an error to simulate downstream failure
          throw new Error("Simulated downstream system failure");
        });
      };

      await expect(failingOperation()).rejects.toThrow("Simulated downstream system failure");

      // Verify that NO partial outbox event with partial=true exists
      const partialEvents = await db
        .selectFrom("outbox_events")
        .selectAll()
        .where("payload", "like", "%partial%")
        .execute();

      expect(partialEvents.length).toBe(0);
    });
  });

  describe("Optimistic Concurrency Conflict Propagation", () => {
    it("should propagate ConcurrencyConflictError when concurrent commands conflict", async () => {
      await createEvaluationHandler.execute({
        id: "eval-concurrency",
        evaluationCycleId: "cycle-1",
        scriptId: "script-1",
        evaluatorId: "prof-watson",
        rubricId: "rubric-bio-101",
        rubricVersion: 1,
        questions: [
          {
            id: "q1",
            questionNumber: "1",
            text: "Q1",
            maxMarks: 10,
            orderIndex: 1,
          },
        ],
      });

      // Session A and Session B both retrieve the evaluation at version 1
      const sessionAEval = (await evaluationRepo.findById("eval-concurrency"))!;
      const sessionBEval = (await evaluationRepo.findById("eval-concurrency"))!;

      expect(sessionAEval.version).toBe(1);
      expect(sessionBEval.version).toBe(1);

      // Session A modifies and saves -> version becomes 2 in DB
      sessionAEval.assignMark({
        questionId: "q1",
        awardedMarks: 8,
        evaluatorId: "prof-watson",
      });
      await evaluationRepo.save(sessionAEval);

      // Session B attempts to modify and save with stale version 1
      sessionBEval.assignMark({
        questionId: "q1",
        awardedMarks: 5,
        evaluatorId: "prof-watson",
      });

      await expect(evaluationRepo.save(sessionBEval)).rejects.toThrow(
        ConcurrencyConflictError
      );
    });
  });

  describe("EvaluationApplicationService Facade", () => {
    it("should coordinate full evaluation lifecycle through the application service facade", async () => {
      // 1. Create
      const created = await evaluationService.createEvaluation({
        id: "eval-facade-001",
        evaluationCycleId: "cycle-1",
        scriptId: "script-facade",
        evaluatorId: "prof-facade",
        rubricId: "rubric-bio-101",
        rubricVersion: 1,
        questions: [
          {
            id: "q1",
            questionNumber: "1",
            text: "Question 1",
            maxMarks: 10,
            orderIndex: 1,
          },
        ],
      });
      expect(created.status).toBe("DRAFT");

      // 2. Assign mark
      const marked = await evaluationService.assignMark({
        evaluationId: "eval-facade-001",
        questionId: "q1",
        awardedMarks: 9,
        evaluatorId: "prof-facade",
      });
      expect(marked.status).toBe("IN_PROGRESS");
      expect(marked.totalScore).toBe(9);

      // 3. Submit
      const submitted = await evaluationService.submitEvaluation({
        evaluationId: "eval-facade-001",
        evaluatorId: "prof-facade",
      });
      expect(submitted.status).toBe("SUBMITTED");

      // 4. Query
      const retrieved = await evaluationService.getEvaluationById("eval-facade-001");
      expect(retrieved.id).toBe("eval-facade-001");
      expect(retrieved.status).toBe("SUBMITTED");
      expect(retrieved.totalScore).toBe(9);
    });
  });

  describe("Rubric Queries", () => {
    it("should query rubric by id and version", async () => {
      const rubric = await getRubricByIdHandler.execute({
        rubricId: "rubric-bio-101",
        version: 1,
      });

      expect(rubric.id).toBe("rubric-bio-101");
      expect(rubric.version).toBe(1);
      expect(rubric.totalMaxMarks).toBe(20);
    });

    it("should throw EntityNotFoundError when rubric does not exist", async () => {
      await expect(
        getRubricByIdHandler.execute({
          rubricId: "nonexistent-rubric",
        })
      ).rejects.toThrow(EntityNotFoundError);
    });
  });
});
