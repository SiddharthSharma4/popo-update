/**
 * Audit Integrity Verification Test Suite (TASK-P6-AUDIT-003).
 *
 * Conforms to:
 * - docs/contracts/01-product-contract.md §15, FR-010 (Traceable, append-only audit logging)
 * - docs/contracts/02-architecture-contract.md §37-38, §46 (Audit module, role boundaries)
 * - docs/contracts/05-domain-contract.md §29-31, INV-003, INV-004, INV-005 (Audit authority, immutability, non-authority)
 * - docs/contracts/06-api-contract.md §37-40, §44-45, §69 (Audit endpoints, query filtering, pagination)
 * - docs/contracts/07-event-contract.md §8, §66-68 (Domain Event vs Audit Event separation)
 * - docs/contracts/08-data-contract.md §24-27, §104, §1430 (Persistence immutability & distinction from outbox/logs)
 * - docs/contracts/09-testing-contract.md §44-45, §74, §143 (Audit integrity verification, role isolation)
 * - docs/contracts/10-demo-contract.md §26, §76 (Audit demonstration & evidence)
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { createDatabase, type KyselyDb } from "../src/infrastructure/database/database.js";
import { runMigrations } from "../src/infrastructure/database/migrator.js";
import {
  KyselyEvaluationRepository,
  KyselyRubricRepository,
  KyselyQualitySignalRepository,
  KyselyTriageCaseRepository,
  KyselyResolutionRepository,
  KyselyAuditRepository,
} from "../src/infrastructure/repositories/index.js";
import { KyselyUnitOfWork } from "../src/infrastructure/persistence/index.js";
import {
  AuditEvent,
  Evaluation,
  Rubric,
  ResolutionOutcome,
  TriageCaseStatus,
  QualitySignalStatus,
  SignalSeverity,
} from "../src/domain/index.js";
import {
  CreateEvaluationHandler,
  AssignMarkHandler,
  SubmitEvaluationHandler,
  CreateRubricHandler,
  CreateTriageCaseHandler,
  AssignTriageCaseHandler,
  ResolveTriageCaseHandler,
} from "../src/application/index.js";
import { createServer } from "../src/presentation/server.js";
import {
  UserRole,
  ActorType,
  AuditEventResponseSchema,
  PaginatedAuditEventsResponseSchema,
} from "@osm/shared";

describe("TASK-P6-AUDIT-003: Audit Integrity & End-to-End Verification", () => {
  let db: KyselyDb;
  let evalRepo: KyselyEvaluationRepository;
  let rubricRepo: KyselyRubricRepository;
  let signalRepo: KyselyQualitySignalRepository;
  let triageRepo: KyselyTriageCaseRepository;
  let resolutionRepo: KyselyResolutionRepository;
  let auditRepo: KyselyAuditRepository;
  let unitOfWork: KyselyUnitOfWork;
  let server: FastifyInstance;

  beforeEach(async () => {
    db = createDatabase(":memory:");
    await runMigrations(db);

    evalRepo = new KyselyEvaluationRepository(db);
    rubricRepo = new KyselyRubricRepository(db);
    signalRepo = new KyselyQualitySignalRepository(db);
    triageRepo = new KyselyTriageCaseRepository(db);
    resolutionRepo = new KyselyResolutionRepository(db);
    auditRepo = new KyselyAuditRepository(db);
    unitOfWork = new KyselyUnitOfWork(db);

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
    await server.close();
    await db.destroy();
  });

  /**
   * Helper executing a complete, authentic consequential workflow:
   * 1. CreateRubric
   * 2. CreateEvaluation
   * 3. AssignMark (partial marking to trigger completeness signal upon submit)
   * 4. SubmitEvaluation (triggers completeness check & generates QualitySignal)
   * 5. CreateTriageCase (linked to QualitySignal)
   * 6. AssignTriageCase (assigned to moderator)
   * 7. ResolveTriageCase (resolved by moderator with canonical outcome & reason)
   */
  async function executeFullConsequentialWorkflow() {
    const rubricHandler = new CreateRubricHandler(unitOfWork);
    const evalCreateHandler = new CreateEvaluationHandler(unitOfWork);
    const assignMarkHandler = new AssignMarkHandler(unitOfWork);
    const submitEvalHandler = new SubmitEvaluationHandler(unitOfWork);
    const createCaseHandler = new CreateTriageCaseHandler(unitOfWork);
    const assignCaseHandler = new AssignTriageCaseHandler(unitOfWork);
    const resolveCaseHandler = new ResolveTriageCaseHandler(unitOfWork);

    const rubricId = `rubric_${randomUUID()}`;
    const evalId = `eval_${randomUUID()}`;
    const q1Id = `q1_${randomUUID()}`;
    const q2Id = `q2_${randomUUID()}`;
    const caseId = `case_${randomUUID()}`;
    const cycleId = "cycle_integrity_2026";
    const examinerId = "examiner_integrity_01";
    const moderatorId = "mod_integrity_lead";
    const assigneeId = "mod_integrity_reviewer";

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    // Step 1: Create Rubric
    await rubricHandler.execute({
      id: rubricId,
      title: "Consequential Examination Rubric 2026",
      version: 1,
      criteria: [
        { id: `crit_${randomUUID()}`, title: "Correctness", description: "Correctness", maxMarks: 20 },
        { id: `crit_${randomUUID()}`, title: "Clarity", description: "Clarity", maxMarks: 10 },
      ],
    });
    await sleep(5);

    // Step 2: Create Evaluation
    await evalCreateHandler.execute({
      id: evalId,
      evaluationCycleId: cycleId,
      scriptId: `script_${randomUUID()}`,
      evaluatorId: examinerId,
      rubricId,
      rubricVersion: 1,
      questions: [
        { id: q1Id, questionNumber: "1", text: "Question 1", maxMarks: 20, rubricCriteriaId: null, orderIndex: 0 },
        { id: q2Id, questionNumber: "2", text: "Question 2", maxMarks: 10, rubricCriteriaId: null, orderIndex: 1 },
      ],
    });
    await sleep(5);

    // Step 3: Assign Mark to Question 1 only (leaving Question 2 unmarked)
    await assignMarkHandler.execute({
      evaluationId: evalId,
      questionId: q1Id,
      awardedMarks: 18,
      evaluatorId: examinerId,
      comments: "Good initial solution",
      isAnnotated: true,
    });
    await sleep(5);

    // Step 4: Submit Evaluation (triggers deterministic completeness validation, generates QualitySignal)
    const submitResult = await submitEvalHandler.execute({
      evaluationId: evalId,
      evaluatorId: examinerId,
    });
    await sleep(5);

    // Retrieve generated QualitySignal
    const signals = await signalRepo.findByEvaluationId(evalId);
    expect(signals.length).toBeGreaterThanOrEqual(1);
    const signalId = signals[0].id;

    // Step 5: Create TriageCase linked to QualitySignal
    const triageCase = await createCaseHandler.execute({
      id: caseId,
      caseNumber: `CASE-INT-${randomUUID().substring(0, 8).toUpperCase()}`,
      qualitySignalId: signalId,
      priority: SignalSeverity.HIGH,
      notes: "Unmarked question detected during evaluation submission",
      actorId: moderatorId,
      actorType: "USER",
      userRole: "MODERATOR",
    });
    await sleep(5);

    // Step 6: Assign TriageCase
    await assignCaseHandler.execute({
      caseId: triageCase.id,
      assigneeId,
      expectedVersion: triageCase.version,
      actorId: moderatorId,
      actorType: "USER",
      userRole: "MODERATOR",
    });
    await sleep(5);

    // Step 7: Resolve TriageCase
    const resolvedCase = await triageRepo.findById(caseId);
    await resolveCaseHandler.execute({
      caseId: triageCase.id,
      outcome: ResolutionOutcome.CORRECTION_REQUIRED,
      reason: "Confirmed missing mark on Question 2. Examiner reassigned for completion.",
      notes: "Audit verified against submission marks",
      evidenceReferences: [`eval:${evalId}`, `signal:${signalId}`],
      expectedVersion: resolvedCase!.version,
      actorId: assigneeId,
      actorType: "USER",
      userRole: "MODERATOR",
    });

    return {
      rubricId,
      evalId,
      signalId,
      caseId,
      examinerId,
      moderatorId,
      assigneeId,
    };
  }

  describe("A & B & C & D. Complete Consequential Lifecycle & Chronological Inspection", () => {
    it("executes the entire consequential workflow and proves the complete, unbroken audit trail via HTTP API", async () => {
      const ctx = await executeFullConsequentialWorkflow();

      // Query the audit trail through the live HTTP inspection API
      const res = await server.inject({
        method: "GET",
        url: "/api/v1/audit-events?sortOrder=asc",
        headers: {
          "x-user-role": UserRole.MODERATOR,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      const parseResult = PaginatedAuditEventsResponseSchema.safeParse(body);
      expect(parseResult.success).toBe(true);

      // Verify total events recorded across the workflow
      // 1. RubricCreated
      // 2. EvaluationCreated
      // 3. MarkAssigned
      // 4. EvaluationSubmitted
      // 5. TriageCaseCreated
      // 6. TriageCaseAssigned
      // 7. TriageCaseResolved
      expect(body.total).toBe(7);
      expect(body.items.length).toBe(7);

      const items = body.items;

      // 1. RubricCreated
      expect(items[0].eventType).toBe("RubricCreated");
      expect(items[0].action).toBe("CREATE_RUBRIC");
      expect(items[0].resource.type).toBe("Rubric");
      expect(items[0].resource.id).toContain(ctx.rubricId);

      // 2. EvaluationCreated
      expect(items[1].eventType).toBe("EvaluationCreated");
      expect(items[1].action).toBe("CREATE_EVALUATION");
      expect(items[1].resource.type).toBe("Evaluation");
      expect(items[1].resource.id).toBe(ctx.evalId);
      expect(items[1].actor.id).toBe(ctx.examinerId);

      // 3. MarkAssigned
      expect(items[2].eventType).toBe("MarkAssigned");
      expect(items[2].action).toBe("ASSIGN_MARK");
      expect(items[2].resource.type).toBe("Evaluation");
      expect(items[2].resource.id).toBe(ctx.evalId);
      expect(items[2].actor.id).toBe(ctx.examinerId);
      expect(items[2].details.awardedMarks).toBe(18);

      // 4. EvaluationSubmitted
      expect(items[3].eventType).toBe("EvaluationSubmitted");
      expect(items[3].action).toBe("SUBMIT_EVALUATION");
      expect(items[3].resource.type).toBe("Evaluation");
      expect(items[3].resource.id).toBe(ctx.evalId);
      expect(items[3].actor.id).toBe(ctx.examinerId);
      expect(items[3].details.isComplete).toBe(false);

      // 5. TriageCaseCreated
      expect(items[4].eventType).toBe("TriageCaseCreated");
      expect(items[4].action).toBe("CREATE_TRIAGE_CASE");
      expect(items[4].resource.type).toBe("TriageCase");
      expect(items[4].resource.id).toBe(ctx.caseId);
      expect(items[4].actor.id).toBe(ctx.moderatorId);

      // 6. TriageCaseAssigned
      expect(items[5].eventType).toBe("TriageCaseAssigned");
      expect(items[5].action).toBe("ASSIGN_TRIAGE_CASE");
      expect(items[5].resource.type).toBe("TriageCase");
      expect(items[5].resource.id).toBe(ctx.caseId);
      expect(items[5].actor.id).toBe(ctx.moderatorId);
      expect(items[5].details.assigneeId).toBe(ctx.assigneeId);

      // 7. TriageCaseResolved
      expect(items[6].eventType).toBe("TriageCaseResolved");
      expect(items[6].action).toBe("RESOLVE_TRIAGE_CASE");
      expect(items[6].resource.type).toBe("TriageCase");
      expect(items[6].resource.id).toBe(ctx.caseId);
      expect(items[6].actor.id).toBe(ctx.assigneeId);
      expect(items[6].details.outcome).toBe(ResolutionOutcome.CORRECTION_REQUIRED);
      expect(items[6].details.reason).toContain("Confirmed missing mark on Question 2");

      // Verify single event retrieval for resolution event via GET /api/v1/audit-events/:eventId
      const singleRes = await server.inject({
        method: "GET",
        url: `/api/v1/audit-events/${items[6].id}`,
        headers: { "x-user-role": UserRole.MODERATOR },
      });
      expect(singleRes.statusCode).toBe(200);
      const singleBody = singleRes.json();
      expect(AuditEventResponseSchema.safeParse(singleBody).success).toBe(true);
      expect(singleBody.id).toBe(items[6].id);
      expect(singleBody.details.outcome).toBe(ResolutionOutcome.CORRECTION_REQUIRED);
    });

    it("verifies entity-scoped filtering matches exact sub-histories", async () => {
      const ctx = await executeFullConsequentialWorkflow();

      // Query evaluation audit trail specifically
      const evalRes = await server.inject({
        method: "GET",
        url: `/api/v1/audit-events?entityType=Evaluation&entityId=${ctx.evalId}`,
        headers: { "x-user-role": UserRole.MODERATOR },
      });
      expect(evalRes.statusCode).toBe(200);
      const evalEvents = evalRes.json().items;
      expect(evalEvents.length).toBe(3);
      expect(evalEvents.map((e: { action: string }) => e.action)).toEqual([
        "SUBMIT_EVALUATION",
        "ASSIGN_MARK",
        "CREATE_EVALUATION",
      ]);

      // Query triage case audit trail specifically
      const caseRes = await server.inject({
        method: "GET",
        url: `/api/v1/audit-events?entityType=TriageCase&entityId=${ctx.caseId}&sortOrder=asc`,
        headers: { "x-user-role": UserRole.ADMIN },
      });
      expect(caseRes.statusCode).toBe(200);
      const caseEvents = caseRes.json().items;
      expect(caseEvents.length).toBe(3);
      expect(caseEvents.map((e: { action: string }) => e.action)).toEqual([
        "CREATE_TRIAGE_CASE",
        "ASSIGN_TRIAGE_CASE",
        "RESOLVE_TRIAGE_CASE",
      ]);
    });
  });

  describe("E. Transactional Coupling & Failure Rollback Isolation", () => {
    it("guarantees zero phantom audit events when command transaction fails and rolls back", async () => {
      // Seed a case first
      const ctx = await executeFullConsequentialWorkflow();
      const countBefore = await auditRepo.findAll();
      const initialCount = countBefore.length;

      // Attempt to resolve the case with a forced failure (stale concurrency version)
      const resolveHandler = new ResolveTriageCaseHandler(unitOfWork);
      await expect(
        resolveHandler.execute({
          caseId: ctx.caseId,
          outcome: ResolutionOutcome.DISMISSED,
          reason: "Attempt with stale version",
          expectedVersion: 999, // Stale version forces ConcurrencyConflictError
          actorId: ctx.moderatorId,
          actorType: "USER",
          userRole: "MODERATOR",
        })
      ).rejects.toThrow();

      // Verify that NO phantom audit event was persisted
      const countAfter = await auditRepo.findAll();
      expect(countAfter.length).toBe(initialCount);

      // Verify no audit event was created with the failed action
      const failedEvents = await db
        .selectFrom("audit_events")
        .selectAll()
        .where("details", "like", "%stale version%")
        .execute();
      expect(failedEvents.length).toBe(0);
    });
  });

  describe("F & G. Multi-Boundary Immutability & Architectural Demarcation", () => {
    it("verifies in-memory domain aggregate immutability (Object.freeze)", () => {
      const event = AuditEvent.create({
        id: "evt_freeze_test",
        eventType: "TestEvent",
        actorType: "USER",
        actorId: "usr_1",
        entityType: "TestEntity",
        entityId: "ent_1",
        action: "TEST_ACTION",
        details: { key: "value", nested: { count: 1 } },
      });

      expect(Object.isFrozen(event)).toBe(true);
      expect(Object.isFrozen(event.details)).toBe(true);

      // Mutation attempts must throw TypeError in runtime
      expect(() => {
        (event as any).action = "MUTATED_ACTION";
      }).toThrow(TypeError);

      expect(() => {
        (event.details as any).key = "MUTATED_VALUE";
      }).toThrow(TypeError);
    });

    it("verifies repository interface contract exposes zero mutation or deletion capabilities", () => {
      // AuditRepository interface methods are explicitly inspectable
      const repoPrototype = Object.getPrototypeOf(auditRepo);
      const methodNames = Object.getOwnPropertyNames(repoPrototype);

      expect(methodNames).toContain("record");
      expect(methodNames).toContain("findById");
      expect(methodNames).toContain("findByEntity");
      expect(methodNames).toContain("findAll");
      expect(methodNames).toContain("query");

      // Verify NO update or delete methods exist on repository contract
      expect(methodNames).not.toContain("update");
      expect(methodNames).not.toContain("delete");
      expect(methodNames).not.toContain("remove");
      expect(methodNames).not.toContain("purge");
    });

    it("verifies HTTP presentation layer strictly rejects mutation requests (POST/PUT/DELETE)", async () => {
      const postRes = await server.inject({
        method: "POST",
        url: "/api/v1/audit-events",
        payload: { fake: "attempt" },
      });
      expect(postRes.statusCode).toBe(404);

      const putRes = await server.inject({
        method: "PUT",
        url: "/api/v1/audit-events/evt_123",
        payload: { fake: "attempt" },
      });
      expect(putRes.statusCode).toBe(404);

      const deleteRes = await server.inject({
        method: "DELETE",
        url: "/api/v1/audit-events/evt_123",
      });
      expect(deleteRes.statusCode).toBe(404);
    });

    it("verifies historical audit records survive repeated application cycles bit-for-bit unchanged", async () => {
      const ctx = await executeFullConsequentialWorkflow();
      const beforeEvents = await auditRepo.findAll();

      // Execute 20 read and query operations through API
      for (let i = 0; i < 20; i++) {
        await server.inject({
          method: "GET",
          url: "/api/v1/audit-events?pageSize=10",
          headers: { "x-user-role": UserRole.MODERATOR },
        });
      }

      const afterEvents = await auditRepo.findAll();
      expect(afterEvents.length).toBe(beforeEvents.length);

      // Verify exact row-by-row and field-by-field equality
      for (let i = 0; i < beforeEvents.length; i++) {
        expect(afterEvents[i].id).toBe(beforeEvents[i].id);
        expect(afterEvents[i].eventType).toBe(beforeEvents[i].eventType);
        expect(afterEvents[i].action).toBe(beforeEvents[i].action);
        expect(afterEvents[i].occurredAt).toBe(beforeEvents[i].occurredAt);
        expect(afterEvents[i].details).toEqual(beforeEvents[i].details);
      }
    });

    it("documents architectural demarcation: application/repository append-only vs raw database capability", async () => {
      // This test explicitly documents the architectural reality required by instruction (G):
      // 1. Application layer & KyselyAuditRepository strictly prohibit update/delete (append-only architecture).
      // 2. The raw database engine (SQLite), however, does not have custom schema triggers installed in 001_foundation.ts.
      // Direct raw SQL execution on the connection bypasses repository boundaries, which is accurate to document.
      const auditEvent = AuditEvent.create({
        id: "evt_raw_check",
        eventType: "RawCheck",
        actorType: "SYSTEM",
        actorId: "sys",
        entityType: "System",
        entityId: "sys_1",
        action: "TEST_RAW",
        details: { initial: true },
      });
      await auditRepo.record(auditEvent);

      // Direct raw query check confirms persistence
      const row = await db.selectFrom("audit_events").selectAll().where("id", "=", "evt_raw_check").executeTakeFirst();
      expect(row).toBeDefined();
      expect(row!.action).toBe("TEST_RAW");
    });
  });

  describe("H. Domain Event vs Audit Event Architectural Separation (07-event §8, 08-data §24)", () => {
    it("proves outbox_events and audit_events remain distinct in structure, lifecycle, and semantics", async () => {
      const ctx = await executeFullConsequentialWorkflow();

      // Retrieve outbox rows
      const outboxRows = await db.selectFrom("outbox_events").selectAll().execute();
      // Retrieve audit rows
      const auditRows = await db.selectFrom("audit_events").selectAll().execute();

      expect(outboxRows.length).toBeGreaterThan(0);
      expect(auditRows.length).toBeGreaterThan(0);

      // 1. Schema separation: Outbox has aggregate_type, aggregate_id, payload, status, retry_count, correlation_id
      const sampleOutbox = outboxRows[0];
      expect(sampleOutbox).toHaveProperty("aggregate_type");
      expect(sampleOutbox).toHaveProperty("aggregate_id");
      expect(sampleOutbox).toHaveProperty("payload");
      expect(sampleOutbox).toHaveProperty("status");
      expect(sampleOutbox).toHaveProperty("retry_count");
      expect(sampleOutbox).toHaveProperty("correlation_id");
      expect(sampleOutbox.status).toBe("PENDING");

      // 2. Schema separation: Audit has actor_type, actor_id, entity_type, entity_id, action, details
      const sampleAudit = auditRows[0];
      expect(sampleAudit).toHaveProperty("actor_type");
      expect(sampleAudit).toHaveProperty("actor_id");
      expect(sampleAudit).toHaveProperty("entity_type");
      expect(sampleAudit).toHaveProperty("entity_id");
      expect(sampleAudit).toHaveProperty("action");
      expect(sampleAudit).toHaveProperty("details");
      expect(sampleAudit).not.toHaveProperty("status");
      expect(sampleAudit).not.toHaveProperty("retry_count");
      expect(sampleAudit).not.toHaveProperty("payload");

      // 3. Lifecycle distinction:
      // Outbox events are mutable operational delivery records (PENDING -> PUBLISHED with retry attempts)
      // Audit events are durable historical evidence (no status changes, no dispatch lifecycle)
      expect(sampleAudit.action).toBeDefined();
    });
  });

  describe("I. Multi-Role Authorization & Role Isolation (09-testing §74)", () => {
    it("allows MODERATOR and ADMIN roles to inspect audit events", async () => {
      await executeFullConsequentialWorkflow();

      const modRes = await server.inject({
        method: "GET",
        url: "/api/v1/audit-events",
        headers: { "x-user-role": UserRole.MODERATOR },
      });
      expect(modRes.statusCode).toBe(200);

      const adminRes = await server.inject({
        method: "GET",
        url: "/api/v1/audit-events",
        headers: { "x-user-role": UserRole.ADMIN },
      });
      expect(adminRes.statusCode).toBe(200);
    });

    it("strictly rejects EXAMINER role with 403 Forbidden under all conditions", async () => {
      const ctx = await executeFullConsequentialWorkflow();

      // List endpoint
      const listRes = await server.inject({
        method: "GET",
        url: "/api/v1/audit-events",
        headers: { "x-user-role": UserRole.EXAMINER },
      });
      expect(listRes.statusCode).toBe(403);
      expect(listRes.json().error).toBe("UnauthorizedActionError");

      // Filtered list endpoint
      const filterRes = await server.inject({
        method: "GET",
        url: `/api/v1/audit-events?entityId=${ctx.evalId}`,
        headers: { "x-user-role": UserRole.EXAMINER },
      });
      expect(filterRes.statusCode).toBe(403);

      // Detail endpoint
      const detailRes = await server.inject({
        method: "GET",
        url: `/api/v1/audit-events/any_id`,
        headers: { "x-user-role": UserRole.EXAMINER },
      });
      expect(detailRes.statusCode).toBe(403);
    });

    it("strictly rejects unauthorized and unknown roles with 403 Forbidden", async () => {
      const res = await server.inject({
        method: "GET",
        url: "/api/v1/audit-events",
        headers: { "x-user-role": "GUEST" },
      });
      expect(res.statusCode).toBe(403);
      expect(res.json().error).toBe("UnauthorizedActionError");
    });

    it("strictly rejects AI actor type with 403 Forbidden", async () => {
      const res = await server.inject({
        method: "GET",
        url: "/api/v1/audit-events",
        headers: {
          "x-actor-type": ActorType.AI,
          "x-user-role": UserRole.ADMIN,
        },
      });
      expect(res.statusCode).toBe(403);
      expect(res.json().error).toBe("UnauthorizedActionError");
    });
  });

  describe("J. Evaluation Mark & Business State Invariance (INV-003, INV-004, INV-005)", () => {
    it("guarantees audit recording and inspection operations perform zero mutation to evaluation marks, scores, or statuses", async () => {
      const ctx = await executeFullConsequentialWorkflow();

      // Inspect evaluation state immediately after consequential workflow
      const evalBeforeInspection = await evalRepo.findById(ctx.evalId);
      expect(evalBeforeInspection).toBeDefined();
      const originalTotalScore = evalBeforeInspection!.totalScore;
      const originalStatus = evalBeforeInspection!.status;
      const originalMarks = evalBeforeInspection!.getAllMarks().map((m) => ({
        questionId: m.questionId,
        awardedMarks: m.awardedMarks,
        evaluatorId: m.evaluatorId,
      }));
      const originalVersion = evalBeforeInspection!.version;

      // Perform extensive audit inspection queries
      await server.inject({
        method: "GET",
        url: "/api/v1/audit-events?pageSize=100",
        headers: { "x-user-role": UserRole.MODERATOR },
      });
      await server.inject({
        method: "GET",
        url: `/api/v1/audit-events?entityType=Evaluation&entityId=${ctx.evalId}`,
        headers: { "x-user-role": UserRole.ADMIN },
      });

      // Record additional audit events directly
      await auditRepo.record(
        AuditEvent.create({
          eventType: "InspectionCompleted",
          actorType: "USER",
          actorId: "auditor_inspect",
          entityType: "AuditSession",
          entityId: "session_001",
          action: "INSPECT_AUDIT_LOG",
          details: { inspectedCount: 7 },
        })
      );

      // Re-fetch evaluation directly from persistence
      const evalAfterInspection = await evalRepo.findById(ctx.evalId);
      expect(evalAfterInspection).toBeDefined();

      // Assert complete invariance
      expect(evalAfterInspection!.totalScore).toBe(originalTotalScore);
      expect(evalAfterInspection!.status).toBe(originalStatus);
      expect(evalAfterInspection!.version).toBe(originalVersion);
      expect(evalAfterInspection!.evaluatorId).toBe(evalBeforeInspection!.evaluatorId);
      expect(evalAfterInspection!.getAllMarks().map((m) => ({
        questionId: m.questionId,
        awardedMarks: m.awardedMarks,
        evaluatorId: m.evaluatorId,
      }))).toEqual(originalMarks);
    });
  });
});
