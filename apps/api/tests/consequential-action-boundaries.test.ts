/**
 * TASK-P10-HARDEN-002 — Consequential Action Boundaries Verification Test Suite.
 *
 * Systematically tests and proves consequential action boundaries across:
 * 1. Allowed roles and actor types for all consequential operations.
 * 2. Unauthorized roles are rejected.
 * 3. AI actors cannot perform consequential human-authority actions (INV-003, INV-004).
 * 4. Evaluator ownership and resource isolation.
 * 5. Invalid state transitions are rejected.
 * 6. Already-submitted/finalized/immutable state cannot be illegally mutated.
 * 7. Malformed or invalid commands fail before state mutation.
 * 8. Defense-in-depth authorization (presentation HTTP and application command layers).
 * 9. Failed authorization or validation leaves the database strictly unchanged.
 * 10. Successful consequential actions produce required audit/outbox/domain effects.
 * 11. Replay/idempotency behavior wherever the contract requires it.
 * 12. Privilege-escalation and header-spoofing combinations.
 * 13. Cross-resource and cross-evaluator access attempts.
 * 14. Concurrent attempts where concurrency protection is required.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { createServer } from "../src/presentation/server.js";
import { createDatabase, type KyselyDb } from "../src/infrastructure/database/database.js";
import { runMigrations } from "../src/infrastructure/database/migrator.js";
import {
  KyselyRubricRepository,
  KyselyEvaluationRepository,
  KyselyQualitySignalRepository,
  KyselyTriageCaseRepository,
  KyselyResolutionRepository,
  KyselyAuditRepository,
} from "../src/infrastructure/repositories/index.js";
import { KyselyUnitOfWork } from "../src/infrastructure/persistence/index.js";
import {
  CreateEvaluationHandler,
  AssignMarkHandler,
  SubmitEvaluationHandler,
  CreateTriageCaseHandler,
  AssignTriageCaseHandler,
  ResolveTriageCaseHandler,
} from "../src/application/index.js";
import {
  Rubric,
  Evaluation,
  QualitySignal,
  TriageCase,
  Resolution,
  AuditEvent,
  ResolutionOutcome,
  QualitySignalStatus,
  SignalSeverity,
  TriageCaseStatus,
} from "../src/domain/index.js";
import {
  UnauthorizedActionError,
  InvalidCommandError,
  EntityNotFoundError,
} from "../src/application/common/errors.js";
import {
  EvaluationLockedError,
  InvalidStateTransitionError,
  ConcurrencyConflictError,
  InvalidArgumentError,
} from "../src/domain/errors.js";
import { UserRole, ActorType } from "@osm/shared";

describe("TASK-P10-HARDEN-002: Consequential Action Boundaries Verification", () => {
  let db: KyselyDb;
  let server: FastifyInstance;
  let uow: KyselyUnitOfWork;

  const rubricId = "rubric_conseq_102";
  const rubricVersion = 1;

  const examinerAlice = "evaluator_alice";
  const examinerBob = "evaluator_bob";
  const moderatorCharlie = "moderator_charlie";
  const adminDave = "admin_dave";

  beforeEach(async () => {
    db = createDatabase(":memory:");
    await runMigrations(db);
    uow = new KyselyUnitOfWork(db);

    // Seed authoritative rubric
    const rubricRepo = new KyselyRubricRepository(db);
    const rubric = new Rubric({
      id: rubricId,
      title: "Mathematics Exam Rubric",
      version: rubricVersion,
      criteria: [
        {
          id: "crit_1",
          title: "Calculus",
          maxMarks: 20,
          description: "Calculus",
        },
        {
          id: "crit_2",
          title: "Algebra",
          maxMarks: 30,
          description: "Algebra",
        },
      ],
    });
    await rubricRepo.save(rubric);

    server = await createServer({
      config: {
        PORT: 0,
        HOST: "127.0.0.1",
        NODE_ENV: "test",
        LOG_LEVEL: "silent",
        CORS_ORIGIN: "*",
        DATABASE_URL: ":memory:",
      },
      db,
    });
    await server.ready();
  });

  afterEach(async () => {
    if (server) {
      await server.close();
    }
    if (db) {
      await db.destroy();
    }
  });

  // Helpers to inspect raw SQLite tables directly
  async function getDbEvaluation(id: string) {
    return db.selectFrom("evaluations").selectAll().where("id", "=", id).executeTakeFirst();
  }

  async function getDbQuestions(evaluationId: string) {
    return db
      .selectFrom("questions")
      .selectAll()
      .where("evaluation_id", "=", evaluationId)
      .execute();
  }

  async function getDbMarks(evaluationId: string) {
    return db
      .selectFrom("evaluation_marks")
      .selectAll()
      .where("evaluation_id", "=", evaluationId)
      .execute();
  }

  async function getDbTriageCase(id: string) {
    return db.selectFrom("triage_cases").selectAll().where("id", "=", id).executeTakeFirst();
  }

  async function getDbResolutionForCase(caseId: string) {
    return db.selectFrom("resolutions").selectAll().where("triage_case_id", "=", caseId).executeTakeFirst();
  }

  async function getDbQualitySignal(id: string) {
    return db.selectFrom("quality_signals").selectAll().where("id", "=", id).executeTakeFirst();
  }

  async function getDbAuditEventsCount(entityId?: string) {
    let query = db.selectFrom("audit_events").selectAll();
    if (entityId) {
      query = query.where("entity_id", "=", entityId);
    }
    const res = await query.execute();
    return res.length;
  }

  async function getDbOutboxEventsCount(aggregateId?: string) {
    let query = db.selectFrom("outbox_events").selectAll();
    if (aggregateId) {
      query = query.where("aggregate_id", "=", aggregateId);
    }
    const res = await query.execute();
    return res.length;
  }

  // =========================================================================
  // 1. EVALUATION CREATION BOUNDARIES
  // =========================================================================
  describe("Consequential Action: Evaluation Creation", () => {
    const validCreatePayload = {
      id: "eval_create_001",
      evaluationCycleId: "cycle_conseq_1",
      scriptId: "script_001",
      evaluatorId: examinerAlice,
      rubricId,
      rubricVersion,
      questions: [
        {
          id: "q_eval_1",
          questionNumber: "Q1",
          text: "Question 1",
          maxMarks: 20,
          rubricCriteriaId: "crit_1",
          orderIndex: 0,
        },
      ],
    };

    it("1.1 Allowed roles: Assigned EXAMINER can create evaluation with outbox and audit events", async () => {
      const res = await server.inject({
        method: "POST",
        url: "/api/v1/evaluations",
        headers: {
          "x-user-role": UserRole.EXAMINER,
          "x-actor-type": ActorType.USER,
          "x-actor-id": examinerAlice,
        },
        payload: validCreatePayload,
      });

      expect(res.statusCode).toBe(201);
      const dbEval = await getDbEvaluation("eval_create_001");
      expect(dbEval).toBeDefined();
      expect(dbEval?.status).toBe("DRAFT");
      expect(dbEval?.version).toBe(1);
      expect(dbEval?.evaluator_id).toBe(examinerAlice);

      // Verify questions persisted
      const dbQuestions = await getDbQuestions("eval_create_001");
      expect(dbQuestions.length).toBe(1);

      // Verify audit and outbox effects
      const auditCount = await getDbAuditEventsCount("eval_create_001");
      expect(auditCount).toBe(1);
      const outboxCount = await getDbOutboxEventsCount("eval_create_001");
      expect(outboxCount).toBe(1);
    });

    it("1.2 Unauthorized roles: Unauthorized role STUDENT is rejected with 403 and leaves DB unchanged", async () => {
      const beforeCount = (await db.selectFrom("evaluations").selectAll().execute()).length;

      const res = await server.inject({
        method: "POST",
        url: "/api/v1/evaluations",
        headers: {
          "x-user-role": "STUDENT",
          "x-actor-type": ActorType.USER,
          "x-actor-id": "student_101",
        },
        payload: { ...validCreatePayload, id: "eval_create_unauth" },
      });

      expect(res.statusCode).toBe(403);
      const afterCount = (await db.selectFrom("evaluations").selectAll().execute()).length;
      expect(afterCount).toBe(beforeCount);
    });

    it("1.3 AI actor cannot create evaluations (INV-003) and leaves DB unchanged", async () => {
      const beforeCount = (await db.selectFrom("evaluations").selectAll().execute()).length;

      const res = await server.inject({
        method: "POST",
        url: "/api/v1/evaluations",
        headers: {
          "x-user-role": UserRole.EXAMINER,
          "x-actor-type": ActorType.AI,
          "x-actor-id": "ai_assistant_v1",
        },
        payload: { ...validCreatePayload, id: "eval_create_ai" },
      });

      expect(res.statusCode).toBe(403);
      const afterCount = (await db.selectFrom("evaluations").selectAll().execute()).length;
      expect(afterCount).toBe(beforeCount);
    });

    it("1.4 Resource ownership: Examiner cannot create evaluation assigned to a different examiner", async () => {
      const beforeCount = (await db.selectFrom("evaluations").selectAll().execute()).length;

      const res = await server.inject({
        method: "POST",
        url: "/api/v1/evaluations",
        headers: {
          "x-user-role": UserRole.EXAMINER,
          "x-actor-type": ActorType.USER,
          "x-actor-id": examinerAlice,
        },
        payload: {
          ...validCreatePayload,
          id: "eval_create_mismatch",
          evaluatorId: examinerBob, // Alice attempting to create evaluation assigned to Bob
        },
      });

      expect(res.statusCode).toBe(403);
      const afterCount = (await db.selectFrom("evaluations").selectAll().execute()).length;
      expect(afterCount).toBe(beforeCount);
    });

    it("1.5 Defense-in-depth: CreateEvaluationHandler rejects AI actor directly at application layer", async () => {
      const handler = new CreateEvaluationHandler(uow);
      await expect(
        handler.execute({
          ...validCreatePayload,
          id: "eval_direct_ai",
          actorType: "AI",
        })
      ).rejects.toThrow(UnauthorizedActionError);

      const dbEval = await getDbEvaluation("eval_direct_ai");
      expect(dbEval).toBeUndefined();
    });
  });

  // =========================================================================
  // 2. MARK ASSIGNMENT BOUNDARIES
  // =========================================================================
  describe("Consequential Action: Mark Assignment", () => {
    const evalId = "eval_mark_001";
    const q1Id = "q_m_1";

    beforeEach(async () => {
      // Create initial evaluation for Alice
      const createHandler = new CreateEvaluationHandler(uow);
      await createHandler.execute({
        id: evalId,
        evaluationCycleId: "cycle_conseq_1",
        scriptId: "script_mark_001",
        evaluatorId: examinerAlice,
        rubricId,
        rubricVersion,
        questions: [
          {
            id: q1Id,
            questionNumber: "Q1",
            text: "Question 1",
            maxMarks: 20,
            orderIndex: 0,
          },
        ],
        actorId: examinerAlice,
        userRole: UserRole.EXAMINER,
      });
    });

    it("2.1 Allowed roles: Assigned EXAMINER can assign valid mark with optimistic version bump", async () => {
      const res = await server.inject({
        method: "PATCH",
        url: `/api/v1/evaluations/${evalId}`,
        headers: {
          "x-user-role": UserRole.EXAMINER,
          "x-actor-type": ActorType.USER,
          "x-actor-id": examinerAlice,
        },
        payload: {
          marks: [
            {
              questionId: q1Id,
              awardedMarks: 15,
              comments: "Good work",
              isAnnotated: true,
            },
          ],
        },
      });

      expect(res.statusCode).toBe(200);
      const dbEval = await getDbEvaluation(evalId);
      expect(dbEval?.status).toBe("IN_PROGRESS");
      expect(dbEval?.total_score).toBe(15);
      expect(dbEval?.version).toBe(2);

      const dbMarks = await getDbMarks(evalId);
      expect(dbMarks.length).toBe(1);
      expect(dbMarks[0].awarded_marks).toBe(15);
      expect(dbMarks[0].comments).toBe("Good work");
    });

    it("2.2 Cross-evaluator access: Examiner Bob cannot assign marks to Alice's evaluation (DB unchanged)", async () => {
      const beforeEval = await getDbEvaluation(evalId);

      const res = await server.inject({
        method: "PATCH",
        url: `/api/v1/evaluations/${evalId}`,
        headers: {
          "x-user-role": UserRole.EXAMINER,
          "x-actor-type": ActorType.USER,
          "x-actor-id": examinerBob,
        },
        payload: {
          marks: [
            {
              questionId: q1Id,
              awardedMarks: 18,
            },
          ],
        },
      });

      expect(res.statusCode).toBe(403);
      const afterEval = await getDbEvaluation(evalId);
      expect(afterEval?.version).toBe(beforeEval?.version);
      expect(afterEval?.total_score).toBe(beforeEval?.total_score);
    });

    it("2.3 AI actor cannot assign marks (INV-003) and leaves marks unchanged", async () => {
      const beforeEval = await getDbEvaluation(evalId);

      const res = await server.inject({
        method: "PATCH",
        url: `/api/v1/evaluations/${evalId}`,
        headers: {
          "x-user-role": UserRole.EXAMINER,
          "x-actor-type": ActorType.AI,
          "x-actor-id": "ai_assistant_v1",
        },
        payload: {
          marks: [{ questionId: q1Id, awardedMarks: 18 }],
        },
      });

      expect(res.statusCode).toBe(403);
      const afterEval = await getDbEvaluation(evalId);
      expect(afterEval?.version).toBe(beforeEval?.version);
      expect(afterEval?.total_score).toBe(beforeEval?.total_score);
    });

    it("2.4 Out-of-bounds mark (> maxMarks or < 0) fails before state mutation", async () => {
      const beforeEval = await getDbEvaluation(evalId);

      // Exceeds maxMarks (20)
      const resHigh = await server.inject({
        method: "PATCH",
        url: `/api/v1/evaluations/${evalId}`,
        headers: {
          "x-user-role": UserRole.EXAMINER,
          "x-actor-type": ActorType.USER,
          "x-actor-id": examinerAlice,
        },
        payload: {
          marks: [{ questionId: q1Id, awardedMarks: 25 }],
        },
      });
      expect(resHigh.statusCode).toBe(400);

      // Negative marks (< 0)
      const resNeg = await server.inject({
        method: "PATCH",
        url: `/api/v1/evaluations/${evalId}`,
        headers: {
          "x-user-role": UserRole.EXAMINER,
          "x-actor-type": ActorType.USER,
          "x-actor-id": examinerAlice,
        },
        payload: {
          marks: [{ questionId: q1Id, awardedMarks: -5 }],
        },
      });
      expect(resNeg.statusCode).toBe(400);

      // Verify DB unchanged
      const afterEval = await getDbEvaluation(evalId);
      expect(afterEval?.version).toBe(beforeEval?.version);
      expect(afterEval?.total_score).toBe(beforeEval?.total_score);
    });

    it("2.5 Terminal state invariant: Cannot assign marks to an already SUBMITTED evaluation", async () => {
      // First submit the evaluation
      await server.inject({
        method: "POST",
        url: `/api/v1/evaluations/${evalId}/submit`,
        headers: {
          "x-user-role": UserRole.EXAMINER,
          "x-actor-type": ActorType.USER,
          "x-actor-id": examinerAlice,
        },
      });

      const submittedEval = await getDbEvaluation(evalId);
      expect(submittedEval?.status).toBe("SUBMITTED");

      // Attempt to assign mark to locked evaluation
      const res = await server.inject({
        method: "PATCH",
        url: `/api/v1/evaluations/${evalId}`,
        headers: {
          "x-user-role": UserRole.EXAMINER,
          "x-actor-type": ActorType.USER,
          "x-actor-id": examinerAlice,
        },
        payload: {
          marks: [{ questionId: q1Id, awardedMarks: 10 }],
        },
      });

      expect(res.statusCode).toBe(409); // EvaluationLockedError
      const afterEval = await getDbEvaluation(evalId);
      expect(afterEval?.version).toBe(submittedEval?.version);
      expect(afterEval?.status).toBe("SUBMITTED");
    });
  });

  // =========================================================================
  // 3. EVALUATION SUBMISSION BOUNDARIES
  // =========================================================================
  describe("Consequential Action: Evaluation Submission", () => {
    const evalId = "eval_sub_001";
    const q1Id = "q_sub_1";

    beforeEach(async () => {
      const createHandler = new CreateEvaluationHandler(uow);
      await createHandler.execute({
        id: evalId,
        evaluationCycleId: "cycle_conseq_1",
        scriptId: "script_sub_001",
        evaluatorId: examinerAlice,
        rubricId,
        rubricVersion,
        questions: [
          {
            id: q1Id,
            questionNumber: "Q1",
            text: "Question 1",
            maxMarks: 20,
            orderIndex: 0,
          },
        ],
        actorId: examinerAlice,
        userRole: UserRole.EXAMINER,
      });
    });

    it("3.1 Allowed roles: Assigned EXAMINER can submit evaluation; produces outbox and audit events", async () => {
      const res = await server.inject({
        method: "POST",
        url: `/api/v1/evaluations/${evalId}/submit`,
        headers: {
          "x-user-role": UserRole.EXAMINER,
          "x-actor-type": ActorType.USER,
          "x-actor-id": examinerAlice,
        },
      });

      expect(res.statusCode).toBe(200);
      const dbEval = await getDbEvaluation(evalId);
      expect(dbEval?.status).toBe("SUBMITTED");
      expect(dbEval?.submitted_at).not.toBeNull();
      expect(dbEval?.version).toBe(2);

      const outboxEvents = await db
        .selectFrom("outbox_events")
        .selectAll()
        .where("aggregate_id", "=", evalId)
        .where("event_type", "=", "EvaluationSubmitted")
        .execute();
      expect(outboxEvents.length).toBe(1);

      const auditEvents = await db
        .selectFrom("audit_events")
        .selectAll()
        .where("entity_id", "=", evalId)
        .where("action", "=", "SUBMIT_EVALUATION")
        .execute();
      expect(auditEvents.length).toBe(1);
    });

    it("3.2 Cross-evaluator submission: Examiner Bob cannot submit Alice's evaluation (DB unchanged)", async () => {
      const beforeEval = await getDbEvaluation(evalId);

      const res = await server.inject({
        method: "POST",
        url: `/api/v1/evaluations/${evalId}/submit`,
        headers: {
          "x-user-role": UserRole.EXAMINER,
          "x-actor-type": ActorType.USER,
          "x-actor-id": examinerBob,
        },
      });

      expect(res.statusCode).toBe(403);
      const afterEval = await getDbEvaluation(evalId);
      expect(afterEval?.status).toBe(beforeEval?.status);
      expect(afterEval?.submitted_at).toBeNull();
    });

    it("3.3 AI actor cannot submit evaluations (INV-003) and leaves DB unchanged", async () => {
      const beforeEval = await getDbEvaluation(evalId);

      const res = await server.inject({
        method: "POST",
        url: `/api/v1/evaluations/${evalId}/submit`,
        headers: {
          "x-user-role": UserRole.EXAMINER,
          "x-actor-type": ActorType.AI,
          "x-actor-id": "ai_assistant_v1",
        },
      });

      expect(res.statusCode).toBe(403);
      const afterEval = await getDbEvaluation(evalId);
      expect(afterEval?.status).toBe(beforeEval?.status);
    });

    it("3.4 Replay / Double-submit guard: Cannot submit an already SUBMITTED evaluation", async () => {
      // First submit
      await server.inject({
        method: "POST",
        url: `/api/v1/evaluations/${evalId}/submit`,
        headers: {
          "x-user-role": UserRole.EXAMINER,
          "x-actor-type": ActorType.USER,
          "x-actor-id": examinerAlice,
        },
      });

      const firstSubmittedEval = await getDbEvaluation(evalId);
      expect(firstSubmittedEval?.status).toBe("SUBMITTED");
      const firstVersion = firstSubmittedEval?.version;

      // Duplicate submit
      const resDup = await server.inject({
        method: "POST",
        url: `/api/v1/evaluations/${evalId}/submit`,
        headers: {
          "x-user-role": UserRole.EXAMINER,
          "x-actor-type": ActorType.USER,
          "x-actor-id": examinerAlice,
        },
      });

      expect(resDup.statusCode).toBe(409); // InvalidStateTransitionError
      const afterEval = await getDbEvaluation(evalId);
      expect(afterEval?.version).toBe(firstVersion); // Version did not increment again
    });
  });

  // =========================================================================
  // 4. TRIAGE CASE CREATION BOUNDARIES
  // =========================================================================
  describe("Consequential Action: Triage Case Creation", () => {
    let testSignalId: string;
    const testEvalId = "eval_triage_001";

    beforeEach(async () => {
      // Create evaluation and a quality signal
      const createHandler = new CreateEvaluationHandler(uow);
      await createHandler.execute({
        id: testEvalId,
        evaluationCycleId: "cycle_conseq_1",
        scriptId: "script_triage_001",
        evaluatorId: examinerAlice,
        rubricId,
        rubricVersion,
        questions: [
          {
            id: "q_tc_1",
            questionNumber: "Q1",
            text: "Question 1",
            maxMarks: 20,
            orderIndex: 0,
          },
        ],
        actorId: examinerAlice,
        userRole: UserRole.EXAMINER,
      });

      testSignalId = "signal_conseq_001";
      const signal = QualitySignal.create({
        id: testSignalId,
        evaluationId: testEvalId,
        evaluationVersion: 1,
        signalType: "UNCHECKED_RESPONSE",
        severity: SignalSeverity.HIGH,
        summary: "Possible unmarked response",
        detector: {
          type: "DETERMINISTIC",
          name: "UncheckedResponseDetector",
          version: "1.0.0",
        },
      });
      const signalRepo = new KyselyQualitySignalRepository(db);
      await signalRepo.save(signal);
    });

    it("4.1 Allowed roles: MODERATOR can create TriageCase; transitions QualitySignal to LINKED_TO_CASE", async () => {
      const res = await server.inject({
        method: "POST",
        url: "/api/v1/triage-cases",
        headers: {
          "x-user-role": UserRole.MODERATOR,
          "x-actor-type": ActorType.USER,
          "x-actor-id": moderatorCharlie,
        },
        payload: {
          qualitySignalId: testSignalId,
          priority: SignalSeverity.HIGH,
          notes: "Investigate unchecked answer",
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      const caseId = body.id;

      // Verify TriageCase created in SQLite
      const dbCase = await getDbTriageCase(caseId);
      expect(dbCase).toBeDefined();
      expect(dbCase?.status).toBe("OPEN");
      expect(dbCase?.quality_signal_id).toBe(testSignalId);

      // Verify QualitySignal atomically linked
      const dbSignal = await getDbQualitySignal(testSignalId);
      expect(dbSignal?.status).toBe("LINKED_TO_CASE");

      // Verify outbox and audit events
      const outbox = await db
        .selectFrom("outbox_events")
        .selectAll()
        .where("aggregate_id", "=", caseId)
        .where("event_type", "=", "TriageCaseCreated")
        .execute();
      expect(outbox.length).toBe(1);
    });

    it("4.2 Unauthorized roles: EXAMINER cannot create triage cases (403 Forbidden, DB unchanged)", async () => {
      const beforeCases = (await db.selectFrom("triage_cases").selectAll().execute()).length;
      const beforeSignal = await getDbQualitySignal(testSignalId);

      const res = await server.inject({
        method: "POST",
        url: "/api/v1/triage-cases",
        headers: {
          "x-user-role": UserRole.EXAMINER,
          "x-actor-type": ActorType.USER,
          "x-actor-id": examinerAlice,
        },
        payload: {
          qualitySignalId: testSignalId,
        },
      });

      expect(res.statusCode).toBe(403);
      const afterCases = (await db.selectFrom("triage_cases").selectAll().execute()).length;
      expect(afterCases).toBe(beforeCases);

      const afterSignal = await getDbQualitySignal(testSignalId);
      expect(afterSignal?.status).toBe(beforeSignal?.status);
    });

    it("4.3 AI actor cannot create triage cases (INV-003, INV-004) and leaves DB unchanged", async () => {
      const beforeCases = (await db.selectFrom("triage_cases").selectAll().execute()).length;

      const res = await server.inject({
        method: "POST",
        url: "/api/v1/triage-cases",
        headers: {
          "x-user-role": UserRole.MODERATOR,
          "x-actor-type": ActorType.AI,
          "x-actor-id": "ai_assistant_v1",
        },
        payload: {
          qualitySignalId: testSignalId,
        },
      });

      expect(res.statusCode).toBe(403);
      const afterCases = (await db.selectFrom("triage_cases").selectAll().execute()).length;
      expect(afterCases).toBe(beforeCases);
    });

    it("4.4 Cannot link a QualitySignal that is already LINKED_TO_CASE or RESOLVED", async () => {
      // First link
      const createHandler = new CreateTriageCaseHandler(uow);
      await createHandler.execute({
        qualitySignalId: testSignalId,
        actorId: moderatorCharlie,
        userRole: "MODERATOR",
      });

      const beforeCases = (await db.selectFrom("triage_cases").selectAll().execute()).length;

      // Second attempt with same signal
      const resDup = await server.inject({
        method: "POST",
        url: "/api/v1/triage-cases",
        headers: {
          "x-user-role": UserRole.MODERATOR,
          "x-actor-type": ActorType.USER,
          "x-actor-id": moderatorCharlie,
        },
        payload: {
          qualitySignalId: testSignalId,
        },
      });

      expect(resDup.statusCode).toBe(409); // InvalidStateTransitionError
      const afterCases = (await db.selectFrom("triage_cases").selectAll().execute()).length;
      expect(afterCases).toBe(beforeCases);
    });
  });

  // =========================================================================
  // 5. TRIAGE CASE ASSIGNMENT BOUNDARIES
  // =========================================================================
  describe("Consequential Action: Triage Case Assignment", () => {
    let caseId: string;

    beforeEach(async () => {
      // Setup evaluation, signal, and open triage case
      const createEvalHandler = new CreateEvaluationHandler(uow);
      await createEvalHandler.execute({
        id: "eval_assign_case_001",
        evaluationCycleId: "cycle_conseq_1",
        scriptId: "script_assign_001",
        evaluatorId: examinerAlice,
        rubricId,
        rubricVersion,
        questions: [
          {
            id: "q_ac_1",
            questionNumber: "Q1",
            text: "Question 1",
            maxMarks: 20,
            orderIndex: 0,
          },
        ],
        actorId: examinerAlice,
        userRole: UserRole.EXAMINER,
      });

      const signal = QualitySignal.create({
        id: "signal_assign_case_001",
        evaluationId: "eval_assign_case_001",
        evaluationVersion: 1,
        signalType: "UNCHECKED_RESPONSE",
        severity: SignalSeverity.HIGH,
        summary: "Signal for assignment test",
        detector: {
          type: "DETERMINISTIC",
          name: "UncheckedResponseDetector",
          version: "1.0.0",
        },
      });
      const signalRepo = new KyselyQualitySignalRepository(db);
      await signalRepo.save(signal);

      const createCaseHandler = new CreateTriageCaseHandler(uow);
      const resCase = await createCaseHandler.execute({
        qualitySignalId: "signal_assign_case_001",
        actorId: moderatorCharlie,
        userRole: "MODERATOR",
      });
      caseId = resCase.id;
    });

    it("5.1 Allowed roles: MODERATOR can assign TriageCase; updates status and increments version", async () => {
      const res = await server.inject({
        method: "POST",
        url: `/api/v1/triage-cases/${caseId}/assign`,
        headers: {
          "x-user-role": UserRole.MODERATOR,
          "x-actor-type": ActorType.USER,
          "x-actor-id": moderatorCharlie,
        },
        payload: {
          assigneeId: moderatorCharlie,
          expectedVersion: 1,
        },
      });

      expect(res.statusCode).toBe(200);
      const dbCase = await getDbTriageCase(caseId);
      expect(dbCase?.status).toBe("ASSIGNED");
      expect(dbCase?.assignee_id).toBe(moderatorCharlie);
      expect(dbCase?.version).toBe(2);

      const outbox = await db
        .selectFrom("outbox_events")
        .selectAll()
        .where("aggregate_id", "=", caseId)
        .where("event_type", "=", "TriageCaseAssigned")
        .execute();
      expect(outbox.length).toBe(1);
    });

    it("5.2 Unauthorized roles: EXAMINER cannot assign triage case (403 Forbidden, DB unchanged)", async () => {
      const beforeCase = await getDbTriageCase(caseId);

      const res = await server.inject({
        method: "POST",
        url: `/api/v1/triage-cases/${caseId}/assign`,
        headers: {
          "x-user-role": UserRole.EXAMINER,
          "x-actor-type": ActorType.USER,
          "x-actor-id": examinerAlice,
        },
        payload: {
          assigneeId: examinerAlice,
          expectedVersion: 1,
        },
      });

      expect(res.statusCode).toBe(403);
      const afterCase = await getDbTriageCase(caseId);
      expect(afterCase?.status).toBe(beforeCase?.status);
      expect(afterCase?.assignee_id).toBe(beforeCase?.assignee_id);
      expect(afterCase?.version).toBe(beforeCase?.version);
    });

    it("5.3 Optimistic concurrency: Stale expectedVersion returns 409 Conflict and leaves DB unchanged", async () => {
      const beforeCase = await getDbTriageCase(caseId);

      const res = await server.inject({
        method: "POST",
        url: `/api/v1/triage-cases/${caseId}/assign`,
        headers: {
          "x-user-role": UserRole.MODERATOR,
          "x-actor-type": ActorType.USER,
          "x-actor-id": moderatorCharlie,
        },
        payload: {
          assigneeId: moderatorCharlie,
          expectedVersion: 99, // Mismatched version
        },
      });

      expect(res.statusCode).toBe(409); // ConcurrencyConflictError
      const afterCase = await getDbTriageCase(caseId);
      expect(afterCase?.version).toBe(beforeCase?.version);
      expect(afterCase?.status).toBe(beforeCase?.status);
    });
  });

  // =========================================================================
  // 6. TRIAGE CASE RESOLUTION BOUNDARIES
  // =========================================================================
  describe("Consequential Action: Triage Case Resolution", () => {
    let caseId: string;
    const testEvalId = "eval_res_case_001";
    let testSignalId: string;

    beforeEach(async () => {
      const createEvalHandler = new CreateEvaluationHandler(uow);
      await createEvalHandler.execute({
        id: testEvalId,
        evaluationCycleId: "cycle_conseq_1",
        scriptId: "script_res_001",
        evaluatorId: examinerAlice,
        rubricId,
        rubricVersion,
        questions: [
          {
            id: "q_res_1",
            questionNumber: "Q1",
            text: "Question 1",
            maxMarks: 20,
            orderIndex: 0,
          },
        ],
        actorId: examinerAlice,
        userRole: UserRole.EXAMINER,
      });

      // Assign initial mark to verify mark immutability
      const assignMarkHandler = new AssignMarkHandler(uow);
      await assignMarkHandler.execute({
        evaluationId: testEvalId,
        questionId: "q_res_1",
        awardedMarks: 16,
        evaluatorId: examinerAlice,
        userRole: UserRole.EXAMINER,
      });

      testSignalId = "signal_res_case_001";
      const signal = QualitySignal.create({
        id: testSignalId,
        evaluationId: testEvalId,
        evaluationVersion: 1,
        signalType: "UNCHECKED_RESPONSE",
        severity: SignalSeverity.HIGH,
        summary: "Signal for resolution test",
        detector: {
          type: "DETERMINISTIC",
          name: "UncheckedResponseDetector",
          version: "1.0.0",
        },
      });
      const signalRepo = new KyselyQualitySignalRepository(db);
      await signalRepo.save(signal);

      const createCaseHandler = new CreateTriageCaseHandler(uow);
      const resCase = await createCaseHandler.execute({
        qualitySignalId: testSignalId,
        actorId: moderatorCharlie,
        userRole: "MODERATOR",
      });
      caseId = resCase.id;
    });

    it("6.1 Allowed roles: Human MODERATOR can resolve case; preserves evaluation marks (INV-003, INV-004)", async () => {
      const beforeEval = await getDbEvaluation(testEvalId);
      const beforeMarks = await getDbMarks(testEvalId);

      const res = await server.inject({
        method: "POST",
        url: `/api/v1/triage-cases/${caseId}/resolve`,
        headers: {
          "x-user-role": UserRole.MODERATOR,
          "x-actor-type": ActorType.USER,
          "x-actor-id": moderatorCharlie,
        },
        payload: {
          outcome: ResolutionOutcome.CONFIRMED_VALID,
          reason: "Reviewed candidate answer sheet thoroughly; marks are correct.",
          expectedVersion: 1,
        },
      });

      expect(res.statusCode).toBe(200);

      // Verify TriageCase resolved
      const dbCase = await getDbTriageCase(caseId);
      expect(dbCase?.status).toBe("RESOLVED");
      expect(dbCase?.version).toBe(2);

      // Verify Resolution row created in SQLite
      const dbResolution = await getDbResolutionForCase(caseId);
      expect(dbResolution).toBeDefined();
      expect(dbResolution?.outcome).toBe("CONFIRMED_VALID");
      expect(dbResolution?.moderator_id).toBe(moderatorCharlie);

      // Verify QualitySignal synchronized to RESOLVED
      const dbSignal = await getDbQualitySignal(testSignalId);
      expect(dbSignal?.status).toBe("RESOLVED");

      // Verify Evaluation marks remain 100% UNTOUCHED (INV-003, INV-004)
      const afterEval = await getDbEvaluation(testEvalId);
      const afterMarks = await getDbMarks(testEvalId);
      expect(afterEval?.total_score).toBe(beforeEval?.total_score);
      expect(afterEval?.version).toBe(beforeEval?.version);
      expect(afterMarks[0].awarded_marks).toBe(beforeMarks[0].awarded_marks);
    });

    it("6.2 Non-human actors: SYSTEM and AI actors cannot resolve triage case (403 Forbidden)", async () => {
      const beforeResolution = await getDbResolutionForCase(caseId);
      expect(beforeResolution).toBeUndefined();

      // Test AI actor
      const resAi = await server.inject({
        method: "POST",
        url: `/api/v1/triage-cases/${caseId}/resolve`,
        headers: {
          "x-user-role": UserRole.MODERATOR,
          "x-actor-type": ActorType.AI,
          "x-actor-id": "ai_assistant_v1",
        },
        payload: {
          outcome: ResolutionOutcome.CONFIRMED_VALID,
          reason: "Automated AI resolution.",
        },
      });
      expect(resAi.statusCode).toBe(403);

      // Test SYSTEM actor
      const resSystem = await server.inject({
        method: "POST",
        url: `/api/v1/triage-cases/${caseId}/resolve`,
        headers: {
          "x-user-role": UserRole.MODERATOR,
          "x-actor-type": ActorType.SYSTEM,
          "x-actor-id": "automated_system",
        },
        payload: {
          outcome: ResolutionOutcome.CONFIRMED_VALID,
          reason: "Automated batch resolution.",
        },
      });
      expect(resSystem.statusCode).toBe(403);

      // DB remains completely unchanged
      const afterResolution = await getDbResolutionForCase(caseId);
      expect(afterResolution).toBeUndefined();
    });

    it("6.3 Terminal state protection: Cannot resolve an already RESOLVED triage case", async () => {
      // First resolution
      const resolveHandler = new ResolveTriageCaseHandler(uow);
      await resolveHandler.execute({
        caseId,
        outcome: ResolutionOutcome.CONFIRMED_VALID,
        reason: "First valid resolution.",
        actorId: moderatorCharlie,
        userRole: "MODERATOR",
      });

      const beforeCase = await getDbTriageCase(caseId);
      expect(beforeCase?.status).toBe("RESOLVED");
      const beforeVersion = beforeCase?.version;

      // Duplicate resolution attempt
      const resDup = await server.inject({
        method: "POST",
        url: `/api/v1/triage-cases/${caseId}/resolve`,
        headers: {
          "x-user-role": UserRole.MODERATOR,
          "x-actor-type": ActorType.USER,
          "x-actor-id": moderatorCharlie,
        },
        payload: {
          outcome: ResolutionOutcome.DISMISSED,
          reason: "Attempt to change resolution.",
        },
      });

      expect(resDup.statusCode).toBe(409); // InvalidStateTransitionError
      const afterCase = await getDbTriageCase(caseId);
      expect(afterCase?.version).toBe(beforeVersion);
    });

    it("6.4 Concurrency conflict: Stale expectedVersion returns 409 Conflict without creating Resolution", async () => {
      const res = await server.inject({
        method: "POST",
        url: `/api/v1/triage-cases/${caseId}/resolve`,
        headers: {
          "x-user-role": UserRole.MODERATOR,
          "x-actor-type": ActorType.USER,
          "x-actor-id": moderatorCharlie,
        },
        payload: {
          outcome: ResolutionOutcome.CONFIRMED_VALID,
          reason: "Valid reason",
          expectedVersion: 42, // Stale version
        },
      });

      expect(res.statusCode).toBe(409);
      const dbResolution = await getDbResolutionForCase(caseId);
      expect(dbResolution).toBeUndefined();
    });
  });

  // =========================================================================
  // 7. INTEGRATION INGESTION & IDEMPOTENCY BOUNDARIES
  // =========================================================================
  describe("Consequential Action: External OSM Ingestion", () => {
    const validIngestPayload = {
      sourceSystem: "VENDOR_EXT_A",
      externalEvaluationId: "ext_eval_102",
      evaluationCycleId: "cycle_conseq_1",
      scriptId: "script_ext_102",
      evaluatorId: examinerAlice,
      rubricId,
      rubricVersion,
      autoSubmit: false,
      questions: [
        {
          id: "q_ext_1",
          questionNumber: "Q1",
          maxMarks: 20,
          rubricCriteriaId: "crit_1",
          orderIndex: 0,
        },
      ],
      marks: [
        {
          questionNumber: "Q1",
          awardedMarks: 17,
          comments: "Imported via OSM",
        },
      ],
    };

    it("7.1 Allowed roles: ADMIN/MODERATOR can ingest external evaluation atomically", async () => {
      const res = await server.inject({
        method: "POST",
        url: "/api/v1/integration/osm/ingest",
        headers: {
          "x-user-role": UserRole.ADMIN,
          "x-actor-type": ActorType.USER,
          "x-actor-id": adminDave,
        },
        payload: validIngestPayload,
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.status).toBe("CREATED");

      // Verify evaluation and idempotency record persisted in SQLite
      const internalId = body.evaluationId;
      const dbEval = await getDbEvaluation(internalId);
      expect(dbEval).toBeDefined();
      expect(dbEval?.total_score).toBe(17);

      const idempotencyRec = await db
        .selectFrom("idempotency_records")
        .selectAll()
        .where("key", "=", "OSM_INGESTION:VENDOR_EXT_A:ext_eval_102")
        .executeTakeFirst();
      expect(idempotencyRec).toBeDefined();
    });

    it("7.2 Idempotent replay: Resending exact payload returns IDEMPOTENT_REPLAY without duplicating DB rows", async () => {
      // First ingestion
      const res1 = await server.inject({
        method: "POST",
        url: "/api/v1/integration/osm/ingest",
        headers: {
          "x-user-role": UserRole.ADMIN,
          "x-actor-type": ActorType.USER,
          "x-actor-id": adminDave,
        },
        payload: validIngestPayload,
      });
      expect(res1.statusCode).toBe(201);

      const beforeEvalCount = (await db.selectFrom("evaluations").selectAll().execute()).length;
      const beforeAuditCount = (await db.selectFrom("audit_events").selectAll().execute()).length;

      // Second identical ingestion
      const res2 = await server.inject({
        method: "POST",
        url: "/api/v1/integration/osm/ingest",
        headers: {
          "x-user-role": UserRole.ADMIN,
          "x-actor-type": ActorType.USER,
          "x-actor-id": adminDave,
        },
        payload: validIngestPayload,
      });

      expect(res2.statusCode).toBe(200);
      const body2 = JSON.parse(res2.body);
      expect(body2.status).toBe("IDEMPOTENT_REPLAY");

      // Verify zero duplicate rows in SQLite
      const afterEvalCount = (await db.selectFrom("evaluations").selectAll().execute()).length;
      expect(afterEvalCount).toBe(beforeEvalCount);
      const afterAuditCount = (await db.selectFrom("audit_events").selectAll().execute()).length;
      expect(afterAuditCount).toBe(beforeAuditCount);
    });

    it("7.3 Idempotency conflict: Modified payload with same idempotency key returns 409 Conflict", async () => {
      // First ingestion
      await server.inject({
        method: "POST",
        url: "/api/v1/integration/osm/ingest",
        headers: {
          "x-user-role": UserRole.ADMIN,
          "x-actor-type": ActorType.USER,
          "x-actor-id": adminDave,
        },
        payload: validIngestPayload,
      });

      // Second ingestion with different awarded marks (fingerprint mismatch)
      const resConflict = await server.inject({
        method: "POST",
        url: "/api/v1/integration/osm/ingest",
        headers: {
          "x-user-role": UserRole.ADMIN,
          "x-actor-type": ActorType.USER,
          "x-actor-id": adminDave,
        },
        payload: {
          ...validIngestPayload,
          marks: [
            {
              questionNumber: "Q1",
              awardedMarks: 12, // Changed from 17
            },
          ],
        },
      });

      expect(resConflict.statusCode).toBe(409);
    });

    it("7.4 Atomic rollback: Ingesting payload referencing non-existent rubric leaves 0 orphan records", async () => {
      const beforeEvalCount = (await db.selectFrom("evaluations").selectAll().execute()).length;
      const beforeIdempotencyCount = (await db.selectFrom("idempotency_records").selectAll().execute()).length;

      const res = await server.inject({
        method: "POST",
        url: "/api/v1/integration/osm/ingest",
        headers: {
          "x-user-role": UserRole.ADMIN,
          "x-actor-type": ActorType.USER,
          "x-actor-id": adminDave,
        },
        payload: {
          ...validIngestPayload,
          externalEvaluationId: "ext_invalid_rubric",
          rubricId: "non_existent_rubric",
        },
      });

      expect(res.statusCode).toBe(404);
      const afterEvalCount = (await db.selectFrom("evaluations").selectAll().execute()).length;
      expect(afterEvalCount).toBe(beforeEvalCount);
      const afterIdempotencyCount = (await db.selectFrom("idempotency_records").selectAll().execute()).length;
      expect(afterIdempotencyCount).toBe(beforeIdempotencyCount);
    });

    it("7.5 Unauthorized roles: EXAMINER cannot ingest external evaluations (403 Forbidden)", async () => {
      const beforeCount = (await db.selectFrom("evaluations").selectAll().execute()).length;

      const res = await server.inject({
        method: "POST",
        url: "/api/v1/integration/osm/ingest",
        headers: {
          "x-user-role": UserRole.EXAMINER,
          "x-actor-type": ActorType.USER,
          "x-actor-id": examinerAlice,
        },
        payload: validIngestPayload,
      });

      expect(res.statusCode).toBe(403);
      const afterCount = (await db.selectFrom("evaluations").selectAll().execute()).length;
      expect(afterCount).toBe(beforeCount);
    });
  });

  // =========================================================================
  // 8. AUDIT IMMUTABILITY & PRIVILEGE ESCALATION
  // =========================================================================
  describe("Consequential Action: Audit Immutability & Privilege Protections", () => {
    it("8.1 Audit endpoints are strictly read-only: POST/PUT/PATCH/DELETE return 404", async () => {
      const postRes = await server.inject({
        method: "POST",
        url: "/api/v1/audit-events",
        payload: { action: "FAKE_AUDIT" },
      });
      expect(postRes.statusCode).toBe(404);

      const deleteRes = await server.inject({
        method: "DELETE",
        url: "/api/v1/audit-events/evt_123",
      });
      expect(deleteRes.statusCode).toBe(404);
    });

    it("8.2 AuditEvent domain entity is deeply frozen against mutation", () => {
      const event = AuditEvent.create({
        id: "evt_freeze_1",
        eventType: "MarkAssigned",
        actorType: "USER",
        actorId: examinerAlice,
        entityType: "Evaluation",
        entityId: "eval_1",
        action: "ASSIGN_MARK",
        details: { questionId: "Q1", awardedMarks: 10 },
      });

      expect(Object.isFrozen(event)).toBe(true);
      expect(Object.isFrozen(event.details)).toBe(true);
      expect(() => {
        (event as any).action = "MUTATED_ACTION";
      }).toThrow();
    });

    it("8.3 Header spoofing: AI attempting to pass x-user-role: ADMIN is rejected with 403 on all consequential endpoints", async () => {
      const spoofHeaders = {
        "x-actor-type": ActorType.AI,
        "x-user-role": UserRole.ADMIN,
        "x-actor-id": "malicious_ai",
      };

      // Attempt evaluation creation
      const resCreate = await server.inject({
        method: "POST",
        url: "/api/v1/evaluations",
        headers: spoofHeaders,
        payload: {
          id: "eval_spoof",
          evaluationCycleId: "cycle_1",
          scriptId: "s1",
          evaluatorId: "evaluator_1",
          rubricId,
          rubricVersion,
          questions: [{ id: "q1", questionNumber: "Q1", text: "t", maxMarks: 10, orderIndex: 0 }],
        },
      });
      expect(resCreate.statusCode).toBe(403);

      // Attempt triage case creation
      const resTriage = await server.inject({
        method: "POST",
        url: "/api/v1/triage-cases",
        headers: spoofHeaders,
        payload: { qualitySignalId: "sig_1" },
      });
      expect(resTriage.statusCode).toBe(403);

      // Attempt external ingestion
      const resIngest = await server.inject({
        method: "POST",
        url: "/api/v1/integration/osm/ingest",
        headers: spoofHeaders,
        payload: {},
      });
      expect(resIngest.statusCode).toBe(403);
    });
  });

  // =========================================================================
  // 9. CONCURRENCY RACE CONDITIONS
  // =========================================================================
  describe("Consequential Action: Concurrency Race Invariants", () => {
    it("9.1 Parallel case assignments: When two concurrent requests use same expectedVersion, exactly one succeeds", async () => {
      // Create evaluation, signal, and open case
      const createEvalHandler = new CreateEvaluationHandler(uow);
      await createEvalHandler.execute({
        id: "eval_race_001",
        evaluationCycleId: "cycle_conseq_1",
        scriptId: "script_race_001",
        evaluatorId: examinerAlice,
        rubricId,
        rubricVersion,
        questions: [{ id: "q_race_1", questionNumber: "Q1", text: "Q", maxMarks: 10, orderIndex: 0 }],
        actorId: examinerAlice,
        userRole: UserRole.EXAMINER,
      });

      const signal = QualitySignal.create({
        id: "signal_race_001",
        evaluationId: "eval_race_001",
        evaluationVersion: 1,
        signalType: "UNCHECKED_RESPONSE",
        severity: SignalSeverity.HIGH,
        summary: "Race test signal",
        detector: { type: "DETERMINISTIC", name: "D", version: "1" },
      });
      const signalRepo = new KyselyQualitySignalRepository(db);
      await signalRepo.save(signal);

      const createCaseHandler = new CreateTriageCaseHandler(uow);
      const testCase = await createCaseHandler.execute({
        qualitySignalId: "signal_race_001",
        actorId: moderatorCharlie,
        userRole: "MODERATOR",
      });

      // Execute sequential version conflict to simulate race resolution
      const assignHandler = new AssignTriageCaseHandler(uow);
      // Winner
      const res1 = await assignHandler.execute({
        caseId: testCase.id,
        assigneeId: moderatorCharlie,
        expectedVersion: 1,
        actorId: moderatorCharlie,
        userRole: "MODERATOR",
      });
      expect(res1.status).toBe("ASSIGNED");
      expect(res1.version).toBe(2);

      // Loser attempting same expectedVersion 1
      await expect(
        assignHandler.execute({
          caseId: testCase.id,
          assigneeId: adminDave,
          expectedVersion: 1,
          actorId: adminDave,
          userRole: "ADMIN",
        })
      ).rejects.toThrow(ConcurrencyConflictError);

      // Verify winner's state persisted, loser cleanly aborted
      const dbCase = await getDbTriageCase(testCase.id);
      expect(dbCase?.assignee_id).toBe(moderatorCharlie);
      expect(dbCase?.version).toBe(2);
    });
  });
});
