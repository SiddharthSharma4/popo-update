/**
 * Integration & Unit Tests for TriageCase Aggregate, Repository, Commands, and HTTP API (TASK-P5-MOD-001).
 *
 * Conforms to:
 * - docs/contracts/01-product-contract.md §14 (Human-in-the-loop triage case workflow)
 * - docs/contracts/02-architecture-contract.md §4, §8 (Unit of Work transactional atomicity)
 * - docs/contracts/05-domain-contract.md §22-24 (TriageCase lifecycle, separation from QualitySignal)
 * - docs/contracts/06-api-contract.md §29-32, §66-67 (API contract, headers, role guards)
 * - docs/contracts/07-event-contract.md §45-46 (TriageCaseCreated and TriageCaseAssigned outbox events)
 * - docs/contracts/08-data-contract.md §20-21, §28-31 (Migration 004, atomicity, optimistic locking)
 * - docs/contracts/09-testing-contract.md §42, §144 (Triage workflow testing)
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { randomUUID } from "node:crypto";
import { createDatabase, type KyselyDb } from "../src/infrastructure/database/database.js";
import { runMigrations } from "../src/infrastructure/database/migrator.js";
import {
  KyselyEvaluationRepository,
  KyselyRubricRepository,
  KyselyQualitySignalRepository,
  KyselyTriageCaseRepository,
} from "../src/infrastructure/repositories/index.js";
import { KyselyUnitOfWork } from "../src/infrastructure/persistence/index.js";
import {
  TriageCase,
  TriageCaseStatus,
  QualitySignal,
  QualitySignalStatus,
  SignalSeverity,
  InvalidArgumentError,
  InvalidStateTransitionError,
  ConcurrencyConflictError,
  Evaluation,
  EvaluationStatus,
} from "../src/domain/index.js";
import {
  CreateTriageCaseHandler,
  AssignTriageCaseHandler,
  GetTriageCaseByIdHandler,
  ListTriageCasesHandler,
  EntityNotFoundError,
  UnauthorizedActionError,
} from "../src/application/index.js";
import { createServer } from "../src/presentation/server.js";
import type { FastifyInstance } from "fastify";

describe("TASK-P5-MOD-001: TriageCase Aggregate, Repository, Commands, and Workflow", () => {
  let db: KyselyDb;
  let uow: KyselyUnitOfWork;
  let evaluationRepo: KyselyEvaluationRepository;
  let qualitySignalRepo: KyselyQualitySignalRepository;
  let triageCaseRepo: KyselyTriageCaseRepository;

  let createTriageCaseHandler: CreateTriageCaseHandler;
  let assignTriageCaseHandler: AssignTriageCaseHandler;
  let getTriageCaseByIdHandler: GetTriageCaseByIdHandler;
  let listTriageCasesHandler: ListTriageCasesHandler;

  let testEvaluation: Evaluation;
  let testSignal: QualitySignal;

  beforeEach(async () => {
    db = createDatabase(":memory:");
    await runMigrations(db);

    evaluationRepo = new KyselyEvaluationRepository(db);
    qualitySignalRepo = new KyselyQualitySignalRepository(db);
    triageCaseRepo = new KyselyTriageCaseRepository(db);
    uow = new KyselyUnitOfWork(db);

    createTriageCaseHandler = new CreateTriageCaseHandler(uow);
    assignTriageCaseHandler = new AssignTriageCaseHandler(uow);
    getTriageCaseByIdHandler = new GetTriageCaseByIdHandler(triageCaseRepo);
    listTriageCasesHandler = new ListTriageCasesHandler(triageCaseRepo);

    // Seed evaluation
    testEvaluation = Evaluation.create({
      id: `eval_${randomUUID()}`,
      evaluationCycleId: "cycle_1",
      scriptId: "script_1",
      evaluatorId: "examiner_1",
      rubricId: "rubric_1",
      rubricVersion: 1,
      questions: [
        {
          id: "q_1",
          questionNumber: "1",
          text: "Question 1",
          maxMarks: 10,
          rubricCriteriaId: null,
          orderIndex: 0,
        },
      ],
    });
    await evaluationRepo.save(testEvaluation);

    // Seed quality signal
    testSignal = QualitySignal.create({
      id: `sig_${randomUUID()}`,
      evaluationId: testEvaluation.id,
      evaluationVersion: testEvaluation.version,
      signalType: "UNCHECKED_ANSWER",
      severity: SignalSeverity.HIGH,
      summary: "Detected unmarked response pages.",
      evidence: { unmarkedPages: [3] },
      detector: {
        type: "DETERMINISTIC",
        name: "CompletenessDetector",
        version: "1.0.0",
      },
    });
    await qualitySignalRepo.save(testSignal);
  });

  afterEach(async () => {
    await db.destroy();
  });

  describe("1. TriageCase Domain Aggregate", () => {
    it("creates a TriageCase with valid attributes and default OPEN state", () => {
      const triageCase = TriageCase.create({
        evaluationId: "eval_1",
        evaluationCycleId: "cycle_1",
        qualitySignalId: "sig_1",
        priority: SignalSeverity.HIGH,
        notes: "Initial investigation note",
      });

      expect(triageCase.id).toBeDefined();
      expect(triageCase.caseNumber).toMatch(/^CASE-/);
      expect(triageCase.evaluationId).toBe("eval_1");
      expect(triageCase.evaluationCycleId).toBe("cycle_1");
      expect(triageCase.qualitySignalId).toBe("sig_1");
      expect(triageCase.status).toBe(TriageCaseStatus.OPEN);
      expect(triageCase.priority).toBe(SignalSeverity.HIGH);
      expect(triageCase.assigneeId).toBeNull();
      expect(triageCase.notes).toBe("Initial investigation note");
      expect(triageCase.version).toBe(1);
      expect(triageCase.createdAt).toBeDefined();
      expect(triageCase.updatedAt).toBeDefined();
    });

    it("rejects creation if required fields are missing", () => {
      expect(() =>
        TriageCase.create({
          evaluationId: "",
          evaluationCycleId: "cycle_1",
          qualitySignalId: "sig_1",
        })
      ).toThrow(InvalidArgumentError);

      expect(() =>
        TriageCase.create({
          evaluationId: "eval_1",
          evaluationCycleId: "",
          qualitySignalId: "sig_1",
        })
      ).toThrow(InvalidArgumentError);

      expect(() =>
        TriageCase.create({
          evaluationId: "eval_1",
          evaluationCycleId: "cycle_1",
          qualitySignalId: "",
        })
      ).toThrow(InvalidArgumentError);
    });

    it("assigns a reviewer: transitions status to ASSIGNED, updates version and timestamp", () => {
      const triageCase = TriageCase.create({
        evaluationId: "eval_1",
        evaluationCycleId: "cycle_1",
        qualitySignalId: "sig_1",
      });

      expect(triageCase.status).toBe(TriageCaseStatus.OPEN);
      expect(triageCase.version).toBe(1);

      triageCase.assign("moderator_alice", "admin_1");

      expect(triageCase.status).toBe(TriageCaseStatus.ASSIGNED);
      expect(triageCase.assigneeId).toBe("moderator_alice");
      expect(triageCase.version).toBe(2);
    });

    it("reassigns a reviewer: maintains ASSIGNED status, updates assignee and increments version", () => {
      const triageCase = TriageCase.create({
        evaluationId: "eval_1",
        evaluationCycleId: "cycle_1",
        qualitySignalId: "sig_1",
      });

      triageCase.assign("moderator_alice", "admin_1");
      expect(triageCase.version).toBe(2);

      triageCase.assign("moderator_bob", "admin_1");
      expect(triageCase.assigneeId).toBe("moderator_bob");
      expect(triageCase.status).toBe(TriageCaseStatus.ASSIGNED);
      expect(triageCase.version).toBe(3);
    });

    it("rejects assignment if assigneeId is empty", () => {
      const triageCase = TriageCase.create({
        evaluationId: "eval_1",
        evaluationCycleId: "cycle_1",
        qualitySignalId: "sig_1",
      });

      expect(() => triageCase.assign("", "admin_1")).toThrow(InvalidArgumentError);
    });

    it("rejects assignment if case is already resolved", () => {
      const triageCase = TriageCase.reconstitute({
        id: "case_1",
        caseNumber: "CASE-1",
        evaluationId: "eval_1",
        evaluationCycleId: "cycle_1",
        qualitySignalId: "sig_1",
        status: TriageCaseStatus.RESOLVED,
        priority: "HIGH",
        assigneeId: "moderator_1",
        notes: null,
        version: 3,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      expect(() => triageCase.assign("moderator_2", "admin_1")).toThrow(
        InvalidStateTransitionError
      );
    });
  });

  describe("2. Persistence & Migration 004", () => {
    it("persists a new TriageCase and loads it via findById", async () => {
      const triageCase = TriageCase.create({
        id: `case_${randomUUID()}`,
        caseNumber: "CASE-TEST-001",
        evaluationId: testEvaluation.id,
        evaluationCycleId: testEvaluation.evaluationCycleId,
        qualitySignalId: testSignal.id,
        priority: SignalSeverity.CRITICAL,
        notes: "Urgent review required",
      });

      await triageCaseRepo.save(triageCase);

      const loaded = await triageCaseRepo.findById(triageCase.id);
      expect(loaded).not.toBeNull();
      expect(loaded!.id).toBe(triageCase.id);
      expect(loaded!.caseNumber).toBe("CASE-TEST-001");
      expect(loaded!.status).toBe(TriageCaseStatus.OPEN);
      expect(loaded!.priority).toBe(SignalSeverity.CRITICAL);
      expect(loaded!.notes).toBe("Urgent review required");
      expect(loaded!.version).toBe(1);
    });

    it("finds by qualitySignalId and by evaluationId", async () => {
      const triageCase = TriageCase.create({
        evaluationId: testEvaluation.id,
        evaluationCycleId: testEvaluation.evaluationCycleId,
        qualitySignalId: testSignal.id,
      });
      await triageCaseRepo.save(triageCase);

      const bySignal = await triageCaseRepo.findByQualitySignalId(testSignal.id);
      expect(bySignal).not.toBeNull();
      expect(bySignal!.id).toBe(triageCase.id);

      const byEval = await triageCaseRepo.findByEvaluationId(testEvaluation.id);
      expect(byEval).toHaveLength(1);
      expect(byEval[0].id).toBe(triageCase.id);
    });

    it("lists and filters by status, assignee, and evaluation", async () => {
      const case1 = TriageCase.create({
        evaluationId: testEvaluation.id,
        evaluationCycleId: testEvaluation.evaluationCycleId,
        qualitySignalId: testSignal.id,
      });
      await triageCaseRepo.save(case1);

      const case2 = TriageCase.create({
        evaluationId: testEvaluation.id,
        evaluationCycleId: testEvaluation.evaluationCycleId,
        qualitySignalId: testSignal.id,
      });
      case2.assign("moderator_alice", "admin_1");
      await triageCaseRepo.save(case2);

      const openCases = await triageCaseRepo.list({ status: TriageCaseStatus.OPEN });
      expect(openCases).toHaveLength(1);
      expect(openCases[0].id).toBe(case1.id);

      const assignedCases = await triageCaseRepo.list({ status: TriageCaseStatus.ASSIGNED });
      expect(assignedCases).toHaveLength(1);
      expect(assignedCases[0].id).toBe(case2.id);

      const aliceCases = await triageCaseRepo.list({ assigneeId: "moderator_alice" });
      expect(aliceCases).toHaveLength(1);
      expect(aliceCases[0].id).toBe(case2.id);
    });

    it("updates existing case on save", async () => {
      const triageCase = TriageCase.create({
        evaluationId: testEvaluation.id,
        evaluationCycleId: testEvaluation.evaluationCycleId,
        qualitySignalId: testSignal.id,
      });
      await triageCaseRepo.save(triageCase);

      triageCase.assign("moderator_x", "admin_1");
      await triageCaseRepo.save(triageCase);

      const updated = await triageCaseRepo.findById(triageCase.id);
      expect(updated!.status).toBe(TriageCaseStatus.ASSIGNED);
      expect(updated!.assigneeId).toBe("moderator_x");
      expect(updated!.version).toBe(2);
    });
  });

  describe("3. Application Commands & Unit of Work Atomicity", () => {
    it("CreateTriageCaseHandler atomically creates case, links signal, and writes outbox event", async () => {
      expect(testSignal.status).toBe(QualitySignalStatus.REVIEWABLE);

      const result = await createTriageCaseHandler.execute({
        qualitySignalId: testSignal.id,
        priority: SignalSeverity.HIGH,
        notes: "Investigate unchecked answer.",
        actorId: "moderator_lead",
        actorType: "USER",
        userRole: "MODERATOR",
      });

      expect(result.id).toBeDefined();
      expect(result.status).toBe(TriageCaseStatus.OPEN);
      expect(result.qualitySignalId).toBe(testSignal.id);

      // Verify QualitySignal status was updated atomically to LINKED_TO_CASE
      const reloadedSignal = await qualitySignalRepo.findById(testSignal.id);
      expect(reloadedSignal!.status).toBe(QualitySignalStatus.LINKED_TO_CASE);
      expect((reloadedSignal!.evidence as Record<string, unknown>).linkedCaseId).toBe(result.id);

      // Verify OutboxEvent was recorded
      const outboxRows = await db
        .selectFrom("outbox_events")
        .selectAll()
        .where("event_type", "=", "TriageCaseCreated")
        .execute();

      expect(outboxRows).toHaveLength(1);
      expect(outboxRows[0].aggregate_id).toBe(result.id);
      expect(outboxRows[0].actor_id).toBe("moderator_lead");
      const payload = JSON.parse(outboxRows[0].payload);
      expect(payload.caseId).toBe(result.id);
      expect(payload.qualitySignalId).toBe(testSignal.id);
    });

    it("CreateTriageCaseHandler rolls back cleanly if signal does not exist", async () => {
      await expect(
        createTriageCaseHandler.execute({
          qualitySignalId: "non_existent_signal",
          actorId: "moderator_1",
          userRole: "MODERATOR",
        })
      ).rejects.toThrow(EntityNotFoundError);

      const cases = await triageCaseRepo.list();
      expect(cases).toHaveLength(0);

      const outbox = await db
        .selectFrom("outbox_events")
        .selectAll()
        .where("event_type", "=", "TriageCaseCreated")
        .execute();
      expect(outbox).toHaveLength(0);
    });

    it("CreateTriageCaseHandler throws if signal is already linked to a case", async () => {
      // Create first case
      await createTriageCaseHandler.execute({
        qualitySignalId: testSignal.id,
        actorId: "moderator_1",
        userRole: "MODERATOR",
      });

      // Try creating second case from same signal
      await expect(
        createTriageCaseHandler.execute({
          qualitySignalId: testSignal.id,
          actorId: "moderator_2",
          userRole: "MODERATOR",
        })
      ).rejects.toThrow(InvalidStateTransitionError);
    });

    it("AssignTriageCaseHandler assigns case, increments version, and writes outbox event", async () => {
      const created = await createTriageCaseHandler.execute({
        qualitySignalId: testSignal.id,
        actorId: "moderator_1",
        userRole: "MODERATOR",
      });

      const assigned = await assignTriageCaseHandler.execute({
        caseId: created.id,
        assigneeId: "moderator_expert",
        actorId: "admin_lead",
        userRole: "ADMIN",
      });

      expect(assigned.status).toBe(TriageCaseStatus.ASSIGNED);
      expect(assigned.assigneeId).toBe("moderator_expert");
      expect(assigned.version).toBe(2);

      // Verify OutboxEvent
      const outboxRows = await db
        .selectFrom("outbox_events")
        .selectAll()
        .where("event_type", "=", "TriageCaseAssigned")
        .execute();

      expect(outboxRows).toHaveLength(1);
      expect(outboxRows[0].aggregate_id).toBe(created.id);
      expect(outboxRows[0].actor_id).toBe("admin_lead");
      const payload = JSON.parse(outboxRows[0].payload);
      expect(payload.assigneeId).toBe("moderator_expert");
      expect(payload.version).toBe(2);
    });

    it("AssignTriageCaseHandler enforces optimistic concurrency control", async () => {
      const created = await createTriageCaseHandler.execute({
        qualitySignalId: testSignal.id,
        actorId: "moderator_1",
        userRole: "MODERATOR",
      });

      // Version is 1
      expect(created.version).toBe(1);

      // Successfully assign with matching version 1
      await assignTriageCaseHandler.execute({
        caseId: created.id,
        assigneeId: "moderator_alice",
        expectedVersion: 1,
        actorId: "admin_1",
        userRole: "ADMIN",
      });

      // Stale attempt with expectedVersion 1 should fail with ConcurrencyConflictError (version is now 2)
      await expect(
        assignTriageCaseHandler.execute({
          caseId: created.id,
          assigneeId: "moderator_bob",
          expectedVersion: 1,
          actorId: "admin_1",
          userRole: "ADMIN",
        })
      ).rejects.toThrow(ConcurrencyConflictError);
    });
  });

  describe("4. Actor Type & Role Authorization Rules", () => {
    it("rejects AI actor attempting to create a triage case (INV-003, INV-004)", async () => {
      await expect(
        createTriageCaseHandler.execute({
          qualitySignalId: testSignal.id,
          actorId: "ai_bot",
          actorType: "AI",
          userRole: "MODERATOR",
        })
      ).rejects.toThrow(UnauthorizedActionError);
    });

    it("rejects AI actor attempting to assign a triage case (INV-003, INV-004)", async () => {
      const created = await createTriageCaseHandler.execute({
        qualitySignalId: testSignal.id,
        actorId: "moderator_1",
        userRole: "MODERATOR",
      });

      await expect(
        assignTriageCaseHandler.execute({
          caseId: created.id,
          assigneeId: "moderator_2",
          actorId: "ai_bot",
          actorType: "AI",
          userRole: "MODERATOR",
        })
      ).rejects.toThrow(UnauthorizedActionError);
    });

    it("rejects EXAMINER role attempting to create or assign a triage case", async () => {
      await expect(
        createTriageCaseHandler.execute({
          qualitySignalId: testSignal.id,
          actorId: "examiner_1",
          userRole: "EXAMINER",
        })
      ).rejects.toThrow(UnauthorizedActionError);

      const created = await createTriageCaseHandler.execute({
        qualitySignalId: testSignal.id,
        actorId: "moderator_1",
        userRole: "MODERATOR",
      });

      await expect(
        assignTriageCaseHandler.execute({
          caseId: created.id,
          assigneeId: "moderator_2",
          actorId: "examiner_1",
          userRole: "EXAMINER",
        })
      ).rejects.toThrow(UnauthorizedActionError);
    });

    it("allows ADMIN and MODERATOR roles to perform triage operations", async () => {
      const createdByMod = await createTriageCaseHandler.execute({
        qualitySignalId: testSignal.id,
        actorId: "mod_1",
        userRole: "MODERATOR",
      });
      expect(createdByMod.id).toBeDefined();

      const assignedByAdmin = await assignTriageCaseHandler.execute({
        caseId: createdByMod.id,
        assigneeId: "mod_2",
        actorId: "admin_1",
        userRole: "ADMIN",
      });
      expect(assignedByAdmin.assigneeId).toBe("mod_2");
    });
  });

  describe("5. HTTP API Presentation Endpoints", () => {
    let server: FastifyInstance;

    beforeEach(async () => {
      server = await createServer({
        config: {
          PORT: 3000,
          HOST: "127.0.0.1",
          NODE_ENV: "test",
          LOG_LEVEL: "silent",
          CORS_ORIGIN: "*",
          DATABASE_URL: ":memory:",
        },
        db,
      });
    });

    afterEach(async () => {
      await server.close();
    });

    it("POST /api/v1/triage-cases creates case and returns 201", async () => {
      const res = await server.inject({
        method: "POST",
        url: "/api/v1/triage-cases",
        headers: {
          "x-user-role": "MODERATOR",
          "x-actor-type": "USER",
          "x-actor-id": "moderator_1",
        },
        payload: {
          qualitySignalId: testSignal.id,
          priority: "HIGH",
          notes: "Created via API",
        },
      });

      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.id).toBeDefined();
      expect(body.caseNumber).toMatch(/^CASE-/);
      expect(body.qualitySignalId).toBe(testSignal.id);
      expect(body.status).toBe("OPEN");
    });

    it("POST /api/v1/triage-cases rejects AI actor with 403 Forbidden", async () => {
      const res = await server.inject({
        method: "POST",
        url: "/api/v1/triage-cases",
        headers: {
          "x-user-role": "MODERATOR",
          "x-actor-type": "AI",
        },
        payload: {
          qualitySignalId: testSignal.id,
        },
      });

      expect(res.statusCode).toBe(403);
      const body = res.json();
      expect(body.error).toBe("UnauthorizedActionError");
    });

    it("POST /api/v1/triage-cases rejects EXAMINER role with 403 Forbidden", async () => {
      const res = await server.inject({
        method: "POST",
        url: "/api/v1/triage-cases",
        headers: {
          "x-user-role": "EXAMINER",
        },
        payload: {
          qualitySignalId: testSignal.id,
        },
      });

      expect(res.statusCode).toBe(403);
      const body = res.json();
      expect(body.error).toBe("UnauthorizedActionError");
    });

    it("GET /api/v1/triage-cases lists cases and GET /api/v1/triage-cases/:caseId returns single case", async () => {
      const createRes = await server.inject({
        method: "POST",
        url: "/api/v1/triage-cases",
        headers: { "x-user-role": "MODERATOR" },
        payload: { qualitySignalId: testSignal.id },
      });
      const created = createRes.json();

      // List
      const listRes = await server.inject({
        method: "GET",
        url: "/api/v1/triage-cases",
      });
      expect(listRes.statusCode).toBe(200);
      const list = listRes.json();
      expect(list).toHaveLength(1);
      expect(list[0].id).toBe(created.id);

      // Get by ID
      const getRes = await server.inject({
        method: "GET",
        url: `/api/v1/triage-cases/${created.id}`,
      });
      expect(getRes.statusCode).toBe(200);
      expect(getRes.json().id).toBe(created.id);
    });

    it("GET /api/v1/triage-cases/:caseId returns 404 for non-existent case", async () => {
      const res = await server.inject({
        method: "GET",
        url: "/api/v1/triage-cases/non_existent_case",
      });
      expect(res.statusCode).toBe(404);
      expect(res.json().error).toBe("EntityNotFoundError");
    });

    it("POST /api/v1/triage-cases/:caseId/assign assigns case and returns 200", async () => {
      const createRes = await server.inject({
        method: "POST",
        url: "/api/v1/triage-cases",
        headers: { "x-user-role": "MODERATOR" },
        payload: { qualitySignalId: testSignal.id },
      });
      const created = createRes.json();

      const assignRes = await server.inject({
        method: "POST",
        url: `/api/v1/triage-cases/${created.id}/assign`,
        headers: { "x-user-role": "MODERATOR" },
        payload: {
          assigneeId: "moderator_reviewer",
        },
      });

      expect(assignRes.statusCode).toBe(200);
      const body = assignRes.json();
      expect(body.status).toBe("ASSIGNED");
      expect(body.assigneeId).toBe("moderator_reviewer");
      expect(body.version).toBe(2);
    });

    it("POST /api/v1/triage-cases/:caseId/assign returns 409 on version conflict", async () => {
      const createRes = await server.inject({
        method: "POST",
        url: "/api/v1/triage-cases",
        headers: { "x-user-role": "MODERATOR" },
        payload: { qualitySignalId: testSignal.id },
      });
      const created = createRes.json();

      // First assignment bumps version to 2
      await server.inject({
        method: "POST",
        url: `/api/v1/triage-cases/${created.id}/assign`,
        headers: { "x-user-role": "MODERATOR" },
        payload: { assigneeId: "moderator_1" },
      });

      // Second assignment providing stale expectedVersion: 1 should return 409
      const staleRes = await server.inject({
        method: "POST",
        url: `/api/v1/triage-cases/${created.id}/assign`,
        headers: { "x-user-role": "MODERATOR" },
        payload: {
          assigneeId: "moderator_2",
          expectedVersion: 1,
        },
      });

      expect(staleRes.statusCode).toBe(409);
      expect(staleRes.json().error).toBe("ConcurrencyConflictError");
    });

    it("verifies P5-MOD-002 resolve endpoint is NOT implemented (hard boundary)", async () => {
      const res = await server.inject({
        method: "POST",
        url: "/api/v1/triage-cases/case_123/resolve",
        payload: { outcome: "DISMISSED" },
      });

      // Fastify 404 Route Not Found
      expect(res.statusCode).toBe(404);
    });
  });
});
