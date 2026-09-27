/**
 * Immutable Audit Event Recording Test Suite (TASK-P6-AUDIT-001).
 *
 * Conforms to:
 * - docs/contracts/02-architecture-contract.md §37-38 (Audit module & domain distinction)
 * - docs/contracts/05-domain-contract.md §29-31, INV-005 (Audit authority & immutability)
 * - docs/contracts/06-api-contract.md §37-40 (Audit semantics & immutability)
 * - docs/contracts/07-event-contract.md §8, §66-68 (Domain event vs Audit event)
 * - docs/contracts/08-data-contract.md §24-27 (AuditEvent persistence & integrity)
 * - docs/contracts/09-testing-contract.md §44-45, §143 (Audit testing & non-authority)
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
  InvalidArgumentError,
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

describe("TASK-P6-AUDIT-001: Immutable Audit Event Recording", () => {
  let db: KyselyDb;
  let auditRepo: KyselyAuditRepository;
  let unitOfWork: KyselyUnitOfWork;

  beforeEach(async () => {
    db = createDatabase(":memory:");
    await runMigrations(db);

    auditRepo = new KyselyAuditRepository(db);
    unitOfWork = new KyselyUnitOfWork(db);
  });

  afterEach(async () => {
    await db.destroy();
  });

  describe("1. Domain Entity Invariants (INV-005, ARCH-008)", () => {
    it("creates a valid, frozen AuditEvent with all required fields", () => {
      const event = AuditEvent.create({
        eventType: "TriageCaseResolved",
        actorType: "USER",
        actorId: "mod_lead_01",
        entityType: "TriageCase",
        entityId: "case_abc_123",
        action: "RESOLVE_TRIAGE_CASE",
        details: {
          outcome: "CORRECTION_REQUIRED",
          reason: "Mark discrepancy identified in question 2",
        },
      });

      expect(event.id).toBeDefined();
      expect(event.eventType).toBe("TriageCaseResolved");
      expect(event.actorType).toBe("USER");
      expect(event.actorId).toBe("mod_lead_01");
      expect(event.entityType).toBe("TriageCase");
      expect(event.entityId).toBe("case_abc_123");
      expect(event.action).toBe("RESOLVE_TRIAGE_CASE");
      expect(event.occurredAt).toBeDefined();

      // Entity and details must be deeply frozen
      expect(Object.isFrozen(event)).toBe(true);
      expect(Object.isFrozen(event.details)).toBe(true);
    });

    it("strictly rejects creation when required fields are missing", () => {
      expect(() =>
        AuditEvent.create({
          eventType: "",
          actorType: "USER",
          actorId: "user_1",
          entityType: "Evaluation",
          entityId: "eval_1",
          action: "CREATE",
          details: {},
        })
      ).toThrow(InvalidArgumentError);

      expect(() =>
        AuditEvent.create({
          eventType: "EvaluationCreated",
          actorType: "   ",
          actorId: "user_1",
          entityType: "Evaluation",
          entityId: "eval_1",
          action: "CREATE",
          details: {},
        })
      ).toThrow(InvalidArgumentError);

      expect(() =>
        AuditEvent.create({
          eventType: "EvaluationCreated",
          actorType: "USER",
          actorId: "",
          entityType: "Evaluation",
          entityId: "eval_1",
          action: "CREATE",
          details: {},
        })
      ).toThrow(InvalidArgumentError);

      expect(() =>
        AuditEvent.create({
          eventType: "EvaluationCreated",
          actorType: "USER",
          actorId: "user_1",
          entityType: "",
          entityId: "eval_1",
          action: "CREATE",
          details: {},
        })
      ).toThrow(InvalidArgumentError);

      expect(() =>
        AuditEvent.create({
          eventType: "EvaluationCreated",
          actorType: "USER",
          actorId: "user_1",
          entityType: "Evaluation",
          entityId: "eval_1",
          action: "",
          details: {},
        })
      ).toThrow(InvalidArgumentError);
    });

    it("reconstitutes an existing AuditEvent without modification", () => {
      const occurredAt = "2026-09-27T10:00:00.000Z";
      const event = AuditEvent.reconstitute({
        id: "audit_persisted_789",
        eventType: "MarkAssigned",
        actorType: "USER",
        actorId: "examiner_01",
        entityType: "Evaluation",
        entityId: "eval_99",
        action: "ASSIGN_MARK",
        details: { questionId: "q1", awardedMarks: 9 },
        occurredAt,
      });

      expect(event.id).toBe("audit_persisted_789");
      expect(event.eventType).toBe("MarkAssigned");
      expect(event.occurredAt).toBe(occurredAt);
      expect(event.details.awardedMarks).toBe(9);
      expect(Object.isFrozen(event)).toBe(true);
      expect(Object.isFrozen(event.details)).toBe(true);
    });
  });

  describe("2. KyselyAuditRepository Persistence & Query Capabilities", () => {
    it("persists and retrieves an AuditEvent by ID", async () => {
      const event = AuditEvent.create({
        id: `audit_${randomUUID()}`,
        eventType: "RubricCreated",
        actorType: "USER",
        actorId: "admin_01",
        entityType: "Rubric",
        entityId: "rubric_math_v1",
        action: "CREATE_RUBRIC",
        details: { version: 1, criteriaCount: 3 },
      });

      await auditRepo.record(event);

      const retrieved = await auditRepo.findById(event.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(event.id);
      expect(retrieved?.eventType).toBe("RubricCreated");
      expect(retrieved?.actorId).toBe("admin_01");
      expect(retrieved?.entityType).toBe("Rubric");
      expect(retrieved?.entityId).toBe("rubric_math_v1");
      expect(retrieved?.details).toEqual({ version: 1, criteriaCount: 3 });
      expect(Object.isFrozen(retrieved?.details)).toBe(true);
    });

    it("returns null when querying a non-existent AuditEvent ID", async () => {
      const retrieved = await auditRepo.findById("non_existent_id");
      expect(retrieved).toBeNull();
    });

    it("queries chronological audit streams by entity (findByEntity)", async () => {
      const entityId = `eval_${randomUUID()}`;

      // Insert 3 sequential audit events for this entity
      await auditRepo.record(
        AuditEvent.create({
          eventType: "EvaluationCreated",
          actorType: "USER",
          actorId: "examiner_1",
          entityType: "Evaluation",
          entityId,
          action: "CREATE_EVALUATION",
          details: { step: 1 },
          occurredAt: "2026-09-27T10:00:00.000Z",
        })
      );

      await auditRepo.record(
        AuditEvent.create({
          eventType: "MarkAssigned",
          actorType: "USER",
          actorId: "examiner_1",
          entityType: "Evaluation",
          entityId,
          action: "ASSIGN_MARK",
          details: { step: 2 },
          occurredAt: "2026-09-27T10:01:00.000Z",
        })
      );

      await auditRepo.record(
        AuditEvent.create({
          eventType: "EvaluationSubmitted",
          actorType: "USER",
          actorId: "examiner_1",
          entityType: "Evaluation",
          entityId,
          action: "SUBMIT_EVALUATION",
          details: { step: 3 },
          occurredAt: "2026-09-27T10:02:00.000Z",
        })
      );

      // Also insert an audit event for a different entity
      await auditRepo.record(
        AuditEvent.create({
          eventType: "EvaluationCreated",
          actorType: "USER",
          actorId: "examiner_2",
          entityType: "Evaluation",
          entityId: "other_eval",
          action: "CREATE_EVALUATION",
          details: { step: 1 },
        })
      );

      const stream = await auditRepo.findByEntity("Evaluation", entityId);
      expect(stream).toHaveLength(3);
      expect(stream[0].action).toBe("CREATE_EVALUATION");
      expect(stream[1].action).toBe("ASSIGN_MARK");
      expect(stream[2].action).toBe("SUBMIT_EVALUATION");
    });

    it("retrieves paginated audit events with findAll", async () => {
      for (let i = 0; i < 5; i++) {
        await auditRepo.record(
          AuditEvent.create({
            eventType: "TestEvent",
            actorType: "SYSTEM",
            actorId: "system",
            entityType: "Test",
            entityId: `id_${i}`,
            action: `ACTION_${i}`,
            details: { index: i },
            occurredAt: `2026-09-27T10:0${i}:00.000Z`,
          })
        );
      }

      const page1 = await auditRepo.findAll({ limit: 2, offset: 0 });
      expect(page1).toHaveLength(2);
      expect(page1[0].action).toBe("ACTION_4"); // Latest first (desc)
      expect(page1[1].action).toBe("ACTION_3");

      const page2 = await auditRepo.findAll({ limit: 2, offset: 2 });
      expect(page2).toHaveLength(2);
      expect(page2[0].action).toBe("ACTION_2");
      expect(page2[1].action).toBe("ACTION_1");
    });
  });

  describe("3. End-to-End Consequential Operation Audit Recording", () => {
    it("verifies Evaluation workflow operations record audit events", async () => {
      const createEvalHandler = new CreateEvaluationHandler(unitOfWork);
      const assignMarkHandler = new AssignMarkHandler(unitOfWork);
      const submitEvalHandler = new SubmitEvaluationHandler(unitOfWork);

      const rubricRepo = new KyselyRubricRepository(db);
      await rubricRepo.save(
        new Rubric({
          id: "rubric_audit_v1",
          title: "Math Rubric",
          version: 1,
          criteria: [],
        })
      );

      const evalId = `eval_${randomUUID()}`;
      const q1Id = `q1_${randomUUID()}`;

      // Step 1: Create Evaluation
      const evalDto = await createEvalHandler.execute({
        id: evalId,
        evaluationCycleId: "cycle_audit_test",
        scriptId: "script_audit_99",
        evaluatorId: "examiner_auditor_01",
        rubricId: "rubric_audit_v1",
        rubricVersion: 1,
        questions: [
          {
            id: q1Id,
            questionNumber: "1",
            text: "Question 1 text",
            maxMarks: 10,
            rubricCriteriaId: null,
            orderIndex: 0,
          },
        ],
      });

      // Verify EvaluationCreated audit event
      const createAudits = await auditRepo.findByEntity("Evaluation", evalDto.id);
      expect(createAudits).toHaveLength(1);
      expect(createAudits[0].eventType).toBe("EvaluationCreated");
      expect(createAudits[0].action).toBe("CREATE_EVALUATION");
      expect(createAudits[0].actorId).toBe("examiner_auditor_01");

      // Step 2: Assign Mark
      await assignMarkHandler.execute({
        evaluationId: evalDto.id,
        questionId: q1Id,
        awardedMarks: 7,
        evaluatorId: "examiner_auditor_01",
      });

      const markAudits = await auditRepo.findByEntity("Evaluation", evalDto.id);
      expect(markAudits).toHaveLength(2);
      expect(markAudits[1].eventType).toBe("MarkAssigned");
      expect(markAudits[1].action).toBe("ASSIGN_MARK");
      expect(markAudits[1].details.awardedMarks).toBe(7);

      // Step 3: Submit Evaluation
      await submitEvalHandler.execute({
        evaluationId: evalDto.id,
        evaluatorId: "examiner_auditor_01",
      });

      const submitAudits = await auditRepo.findByEntity("Evaluation", evalDto.id);
      expect(submitAudits).toHaveLength(3);
      expect(submitAudits[2].eventType).toBe("EvaluationSubmitted");
      expect(submitAudits[2].action).toBe("SUBMIT_EVALUATION");
      expect(submitAudits[2].details.totalScore).toBe(7);
    });

    it("verifies Rubric creation records RubricCreated audit event", async () => {
      const createRubricHandler = new CreateRubricHandler(unitOfWork);
      const rubricId = `rubric_${randomUUID()}`;

      await createRubricHandler.execute({
        id: rubricId,
        version: 1,
        title: "Mathematics Rubric 2026",
        totalMaxMarks: 100,
        criteria: [],
      });

      const rubricAudits = await auditRepo.findByEntity("Rubric", `${rubricId}:v1`);
      expect(rubricAudits).toHaveLength(1);
      expect(rubricAudits[0].eventType).toBe("RubricCreated");
      expect(rubricAudits[0].action).toBe("CREATE_RUBRIC");
      expect(rubricAudits[0].actorType).toBe("USER");
    });

    it("verifies Moderation workflow operations record atomic audit events", async () => {
      // Seed evaluation, submit partially to create QualitySignal
      const evalRepo = new KyselyEvaluationRepository(db);
      const signalRepo = new KyselyQualitySignalRepository(db);

      const evalId = `eval_${randomUUID()}`;
      const q1Id = `q1_${randomUUID()}`;
      const q2Id = `q2_${randomUUID()}`;
      const evaluation = Evaluation.create({
        id: evalId,
        evaluationCycleId: "cycle_mod_audit",
        scriptId: "script_mod_audit",
        evaluatorId: "examiner_orig",
        rubricId: "rubric_mod_audit",
        rubricVersion: 1,
        questions: [
          { id: q1Id, questionNumber: "1", text: "Q1", maxMarks: 10, rubricCriteriaId: null, orderIndex: 0 },
          { id: q2Id, questionNumber: "2", text: "Q2", maxMarks: 10, rubricCriteriaId: null, orderIndex: 1 },
        ],
      });
      evaluation.assignMark({ questionId: q1Id, awardedMarks: 8, evaluatorId: "examiner_orig" });
      await evalRepo.save(evaluation);

      const submitHandler = new SubmitEvaluationHandler(unitOfWork);
      await submitHandler.execute({ evaluationId: evalId, evaluatorId: "examiner_orig" });

      const signals = await signalRepo.findByEvaluationId(evalId);
      expect(signals.length).toBeGreaterThan(0);
      const signal = signals[0];

      // Moderation Action 1: Create TriageCase
      const createCaseHandler = new CreateTriageCaseHandler(unitOfWork);
      const caseDto = await createCaseHandler.execute({
        qualitySignalId: signal.id,
        priority: "HIGH",
        notes: "Audited triage case investigation",
        actorId: "mod_dispatcher_01",
        actorType: "USER",
      });

      // Verify TriageCaseCreated audit event
      const caseAuditsAfterCreate = await auditRepo.findByEntity("TriageCase", caseDto.id);
      expect(caseAuditsAfterCreate).toHaveLength(1);
      expect(caseAuditsAfterCreate[0].eventType).toBe("TriageCaseCreated");
      expect(caseAuditsAfterCreate[0].action).toBe("CREATE_TRIAGE_CASE");
      expect(caseAuditsAfterCreate[0].actorId).toBe("mod_dispatcher_01");
      expect(caseAuditsAfterCreate[0].details.qualitySignalId).toBe(signal.id);
      expect(caseAuditsAfterCreate[0].details.priority).toBe("HIGH");

      // Moderation Action 2: Assign TriageCase
      const assignCaseHandler = new AssignTriageCaseHandler(unitOfWork);
      await assignCaseHandler.execute({
        caseId: caseDto.id,
        assigneeId: "mod_investigator_42",
        expectedVersion: 1,
        actorId: "mod_lead_99",
        actorType: "USER",
      });

      // Verify TriageCaseAssigned audit event
      const caseAuditsAfterAssign = await auditRepo.findByEntity("TriageCase", caseDto.id);
      expect(caseAuditsAfterAssign).toHaveLength(2);
      expect(caseAuditsAfterAssign[1].eventType).toBe("TriageCaseAssigned");
      expect(caseAuditsAfterAssign[1].action).toBe("ASSIGN_TRIAGE_CASE");
      expect(caseAuditsAfterAssign[1].actorId).toBe("mod_lead_99");
      expect(caseAuditsAfterAssign[1].details.assigneeId).toBe("mod_investigator_42");
      expect(caseAuditsAfterAssign[1].details.version).toBe(2);

      // Moderation Action 3: Resolve TriageCase
      const resolveCaseHandler = new ResolveTriageCaseHandler(unitOfWork);
      const resolveResult = await resolveCaseHandler.execute({
        caseId: caseDto.id,
        outcome: ResolutionOutcome.CORRECTION_REQUIRED,
        reason: "Omitted question 2 verified and requires manual examiner evaluation",
        notes: "Detailed resolution notes for audit",
        expectedVersion: 2,
        actorId: "mod_investigator_42",
        actorType: "USER",
        userRole: "MODERATOR",
      });

      // Verify TriageCaseResolved audit event
      const caseAuditsAfterResolve = await auditRepo.findByEntity("TriageCase", caseDto.id);
      expect(caseAuditsAfterResolve).toHaveLength(3);
      expect(caseAuditsAfterResolve[2].eventType).toBe("TriageCaseResolved");
      expect(caseAuditsAfterResolve[2].action).toBe("RESOLVE_TRIAGE_CASE");
      expect(caseAuditsAfterResolve[2].actorId).toBe("mod_investigator_42");
      expect(caseAuditsAfterResolve[2].details.outcome).toBe(ResolutionOutcome.CORRECTION_REQUIRED);
      expect(caseAuditsAfterResolve[2].details.reason).toBe(
        "Omitted question 2 verified and requires manual examiner evaluation"
      );
      expect(caseAuditsAfterResolve[2].details.resolutionId).toBe(resolveResult.resolution.id);
      expect(caseAuditsAfterResolve[2].details.version).toBe(3);
    });
  });

  describe("4. ACID Transactional Consistency & Failure Isolation", () => {
    it("guarantees zero audit events are recorded when transaction rolls back", async () => {
      const evalId = `eval_${randomUUID()}`;

      await expect(
        unitOfWork.execute(async (scope) => {
          // Record an audit event inside transaction
          await scope.audit.record({
            eventType: "EvaluationCreated",
            actorType: "USER",
            actorId: "examiner_fail",
            entityType: "Evaluation",
            entityId: evalId,
            action: "CREATE_EVALUATION",
            details: { test: true },
          });

          // Simulate unexpected failure before commit
          throw new Error("Simulated domain processing failure inside transaction");
        })
      ).rejects.toThrow("Simulated domain processing failure inside transaction");

      // Verify that NO audit event was committed to the database
      const audits = await auditRepo.findByEntity("Evaluation", evalId);
      expect(audits).toHaveLength(0);
    });
  });

  describe("5. Evaluation Mark Invariance (INV-003, INV-004, INV-005)", () => {
    it("ensures audit event recording does not alter evaluation marks, scores, or status", async () => {
      const evalRepo = new KyselyEvaluationRepository(db);
      const evalId = `eval_${randomUUID()}`;
      const q1Id = `q1_${randomUUID()}`;

      const evaluation = Evaluation.create({
        id: evalId,
        evaluationCycleId: "cycle_inv_test",
        scriptId: "script_inv_test",
        evaluatorId: "examiner_01",
        rubricId: "rubric_inv_test",
        rubricVersion: 1,
        questions: [{ id: q1Id, questionNumber: "1", text: "Q1", maxMarks: 10, rubricCriteriaId: null, orderIndex: 0 }],
      });
      evaluation.assignMark({ questionId: q1Id, awardedMarks: 9, evaluatorId: "examiner_01" });
      await evalRepo.save(evaluation);

      // Perform multiple audit recordings
      await auditRepo.record(
        AuditEvent.create({
          eventType: "ExternalAuditLog",
          actorType: "SYSTEM",
          actorId: "audit_checker",
          entityType: "Evaluation",
          entityId: evalId,
          action: "AUDIT_INSPECTION",
          details: { verified: true },
        })
      );

      // Verify evaluation marks, totalScore, and status in DB remain bit-for-bit identical
      const evalAfter = (await evalRepo.findById(evalId))!;
      expect(evalAfter.totalScore).toBe(9);
      expect(evalAfter.status).toBe("IN_PROGRESS");
      expect(evalAfter.marks.size).toBe(1);
      expect(Array.from(evalAfter.marks.values())[0].awardedMarks).toBe(9);
      expect(evalAfter.evaluatorId).toBe("examiner_01");
    });
  });
});
