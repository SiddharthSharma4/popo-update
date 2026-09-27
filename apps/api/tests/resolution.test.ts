/**
 * Integration & Unit Tests for Resolution Workflow (TASK-P5-MOD-002).
 *
 * Conforms to:
 * - docs/contracts/01-product-contract.md §32, FR-008, FR-009 (Human resolution, mandatory reason)
 * - docs/contracts/02-architecture-contract.md §8 (Application resolve command, UoW atomicity)
 * - docs/contracts/05-domain-contract.md §24-28 (TriageCase lifecycle, Resolution entity & outcome)
 * - docs/contracts/06-api-contract.md §32-33, §46, §66-67 (POST /:caseId/resolve, optimistic locking, role guards)
 * - docs/contracts/07-event-contract.md §48 (TriageCaseResolved outbox event)
 * - docs/contracts/08-data-contract.md §22-23, §28-31, §119 (Migration 005, atomicity, immutability)
 * - docs/contracts/09-testing-contract.md §42-44, §86-87, §127 (Resolution workflow testing)
 * - docs/contracts/10-demo-contract.md §24-25 (Authorized real resolution)
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { randomUUID } from "node:crypto";
import { createDatabase, type KyselyDb } from "../src/infrastructure/database/database.js";
import { runMigrations } from "../src/infrastructure/database/migrator.js";
import {
  KyselyEvaluationRepository,
  KyselyQualitySignalRepository,
  KyselyTriageCaseRepository,
  KyselyResolutionRepository,
} from "../src/infrastructure/repositories/index.js";
import { KyselyUnitOfWork } from "../src/infrastructure/persistence/index.js";
import {
  TriageCase,
  TriageCaseStatus,
  Resolution,
  ResolutionOutcome,
  QualitySignal,
  QualitySignalStatus,
  SignalSeverity,
  Evaluation,
  EvaluationStatus,
  InvalidArgumentError,
  InvalidStateTransitionError,
  ConcurrencyConflictError,
} from "../src/domain/index.js";
import {
  CreateTriageCaseHandler,
  AssignTriageCaseHandler,
  ResolveTriageCaseHandler,
  GetTriageCaseByIdHandler,
  EntityNotFoundError,
  InvalidCommandError,
  UnauthorizedActionError,
} from "../src/application/index.js";
import { createServer } from "../src/presentation/server.js";
import type { FastifyInstance } from "fastify";

describe("TASK-P5-MOD-002: Human Resolution Workflow", () => {
  let db: KyselyDb;
  let uow: KyselyUnitOfWork;
  let evaluationRepo: KyselyEvaluationRepository;
  let qualitySignalRepo: KyselyQualitySignalRepository;
  let triageCaseRepo: KyselyTriageCaseRepository;
  let resolutionRepo: KyselyResolutionRepository;

  let createTriageCaseHandler: CreateTriageCaseHandler;
  let assignTriageCaseHandler: AssignTriageCaseHandler;
  let resolveTriageCaseHandler: ResolveTriageCaseHandler;

  let testEvaluation: Evaluation;
  let testSignal: QualitySignal;
  let testCase: TriageCase;

  beforeEach(async () => {
    db = createDatabase(":memory:");
    await runMigrations(db);

    evaluationRepo = new KyselyEvaluationRepository(db);
    qualitySignalRepo = new KyselyQualitySignalRepository(db);
    triageCaseRepo = new KyselyTriageCaseRepository(db);
    resolutionRepo = new KyselyResolutionRepository(db);
    uow = new KyselyUnitOfWork(db);

    createTriageCaseHandler = new CreateTriageCaseHandler(uow);
    assignTriageCaseHandler = new AssignTriageCaseHandler(uow);
    resolveTriageCaseHandler = new ResolveTriageCaseHandler(uow);

    // Seed evaluation with marks
    testEvaluation = Evaluation.create({
      id: `eval_${randomUUID()}`,
      evaluationCycleId: "cycle_alpha",
      scriptId: "script_alpha",
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
    testEvaluation.assignMark({
      questionId: "q_1",
      awardedMarks: 8,
      evaluatorId: "examiner_1",
      comments: "Good answer",
    });
    await evaluationRepo.save(testEvaluation);

    // Seed quality signal
    testSignal = QualitySignal.create({
      id: `sig_${randomUUID()}`,
      evaluationId: testEvaluation.id,
      evaluationVersion: testEvaluation.version,
      signalType: "EVALUATOR_MEAN_DEVIATION",
      severity: SignalSeverity.HIGH,
      status: QualitySignalStatus.REVIEWABLE,
      summary: "Evaluator deviated by +28.5% from peer cohort mean",
      evidence: { deviation: 0.285, evaluatorMean: 8.0, peerMean: 6.22 },
      detector: {
        type: "STATISTICAL",
        name: "evaluator-mean-deviation-detector",
        version: "1.0.0",
      },
    });
    await qualitySignalRepo.save(testSignal);

    // Create triage case linked to signal
    const caseDto = await createTriageCaseHandler.execute({
      qualitySignalId: testSignal.id,
      priority: SignalSeverity.HIGH,
      notes: "Initial investigation required",
      actorId: "mod_lead",
      actorType: "USER",
      userRole: "MODERATOR",
    });
    testCase = (await triageCaseRepo.findById(caseDto.id))!;
  });

  describe("1. Domain Aggregate: Resolution & TriageCase Lifecycle", () => {
    it("creates a valid Resolution entity with required properties", () => {
      const res = Resolution.create({
        triageCaseId: testCase.id,
        evaluationId: testEvaluation.id,
        outcome: ResolutionOutcome.CONFIRMED_VALID,
        reason: "Detailed rubric analysis confirms mark validity despite cohort variance.",
        moderatorId: "mod_expert",
        notes: "Reviewed student answer against rubric criterion 1.2",
        evidenceReferences: [testSignal.id],
      });

      expect(res.id).toBeDefined();
      expect(res.triageCaseId).toBe(testCase.id);
      expect(res.evaluationId).toBe(testEvaluation.id);
      expect(res.outcome).toBe(ResolutionOutcome.CONFIRMED_VALID);
      expect(res.reason).toBe("Detailed rubric analysis confirms mark validity despite cohort variance.");
      expect(res.moderatorId).toBe("mod_expert");
      expect(res.notes).toBe("Reviewed student answer against rubric criterion 1.2");
      expect(res.evidenceReferences).toEqual([testSignal.id]);
      expect(res.createdAt).toBeDefined();
    });

    it("rejects Resolution creation when required fields are missing", () => {
      expect(() =>
        Resolution.create({
          triageCaseId: "",
          evaluationId: testEvaluation.id,
          outcome: ResolutionOutcome.CONFIRMED_VALID,
          reason: "Some reason",
          moderatorId: "mod_1",
        })
      ).toThrow(InvalidArgumentError);

      expect(() =>
        Resolution.create({
          triageCaseId: testCase.id,
          evaluationId: "",
          outcome: ResolutionOutcome.CONFIRMED_VALID,
          reason: "Some reason",
          moderatorId: "mod_1",
        })
      ).toThrow(InvalidArgumentError);

      expect(() =>
        Resolution.create({
          triageCaseId: testCase.id,
          evaluationId: testEvaluation.id,
          outcome: "INVALID_OUTCOME" as any,
          reason: "Some reason",
          moderatorId: "mod_1",
        })
      ).toThrow(InvalidArgumentError);

      expect(() =>
        Resolution.create({
          triageCaseId: testCase.id,
          evaluationId: testEvaluation.id,
          outcome: ResolutionOutcome.CONFIRMED_VALID,
          reason: "   ",
          moderatorId: "mod_1",
        })
      ).toThrow(InvalidArgumentError);

      expect(() =>
        Resolution.create({
          triageCaseId: testCase.id,
          evaluationId: testEvaluation.id,
          outcome: ResolutionOutcome.CONFIRMED_VALID,
          reason: "Valid reason",
          moderatorId: "",
        })
      ).toThrow(InvalidArgumentError);
    });

    it("transitions TriageCase from OPEN to RESOLVED and increments version", () => {
      expect(testCase.status).toBe(TriageCaseStatus.OPEN);
      expect(testCase.version).toBe(1);

      testCase.resolve(ResolutionOutcome.LEGITIMATE_VARIATION, "Variance is legitimate", "mod_1");

      expect(testCase.status).toBe(TriageCaseStatus.RESOLVED);
      expect(testCase.version).toBe(2);
      expect(testCase.updatedAt).toBeDefined();
    });

    it("transitions TriageCase from ASSIGNED to RESOLVED and increments version", () => {
      testCase.assign("reviewer_1", "mod_lead");
      expect(testCase.status).toBe(TriageCaseStatus.ASSIGNED);
      expect(testCase.version).toBe(2);

      testCase.resolve(ResolutionOutcome.CONFIRMED_VALID, "Confirmed valid after assignment", "reviewer_1");

      expect(testCase.status).toBe(TriageCaseStatus.RESOLVED);
      expect(testCase.version).toBe(3);
    });

    it("throws InvalidStateTransitionError when attempting to resolve an already resolved case", () => {
      testCase.resolve(ResolutionOutcome.CONFIRMED_VALID, "First resolution", "mod_1");
      expect(testCase.status).toBe(TriageCaseStatus.RESOLVED);

      expect(() =>
        testCase.resolve(ResolutionOutcome.DISMISSED, "Second resolution attempt", "mod_1")
      ).toThrow(InvalidStateTransitionError);
    });

    it("throws InvalidStateTransitionError when attempting to assign an already resolved case (terminal state)", () => {
      testCase.resolve(ResolutionOutcome.CONFIRMED_VALID, "Case is finished", "mod_1");

      expect(() => testCase.assign("reviewer_2", "mod_lead")).toThrow(
        InvalidStateTransitionError
      );
    });
  });

  describe("2. Database Persistence & Migration 005", () => {
    it("verifies migration 005 created resolutions table with indexes and constraints", async () => {
      // Query sqlite master table for resolutions table and indexes
      const tableInfo = await db
        .selectFrom("sqlite_master" as any)
        .select(["name", "sql"])
        .where("type", "=", "table")
        .where("name", "=", "resolutions")
        .executeTakeFirst();

      expect(tableInfo).toBeDefined();
      expect((tableInfo as any).name).toBe("resolutions");

      const indexes = await db
        .selectFrom("sqlite_master" as any)
        .select(["name"])
        .where("type", "=", "index")
        .where("tbl_name", "=", "resolutions")
        .execute();

      const indexNames = indexes.map((i: any) => i.name);
      expect(indexNames).toContain("idx_resolutions_triage_case");
      expect(indexNames).toContain("idx_resolutions_evaluation");
      expect(indexNames).toContain("idx_resolutions_moderator");
      expect(indexNames).toContain("idx_resolutions_outcome");
    });

    it("persists and retrieves a Resolution using KyselyResolutionRepository", async () => {
      const res = Resolution.create({
        triageCaseId: testCase.id,
        evaluationId: testEvaluation.id,
        outcome: ResolutionOutcome.CORRECTION_REQUIRED,
        reason: "Marks applied incorrectly for partial credit.",
        moderatorId: "mod_auditor",
        notes: "Recommended re-checking question 1",
        evidenceReferences: [testSignal.id, "ref_rule_4"],
      });

      await resolutionRepo.save(res);

      const retrieved = await resolutionRepo.findById(res.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.id).toBe(res.id);
      expect(retrieved!.triageCaseId).toBe(testCase.id);
      expect(retrieved!.evaluationId).toBe(testEvaluation.id);
      expect(retrieved!.outcome).toBe(ResolutionOutcome.CORRECTION_REQUIRED);
      expect(retrieved!.reason).toBe(res.reason);
      expect(retrieved!.moderatorId).toBe("mod_auditor");
      expect(retrieved!.notes).toBe("Recommended re-checking question 1");
      expect(retrieved!.evidenceReferences).toEqual([testSignal.id, "ref_rule_4"]);

      // Verify findByTriageCaseId
      const byCase = await resolutionRepo.findByTriageCaseId(testCase.id);
      expect(byCase).not.toBeNull();
      expect(byCase!.id).toBe(res.id);

      // Verify findByEvaluationId
      const byEval = await resolutionRepo.findByEvaluationId(testEvaluation.id);
      expect(byEval).toHaveLength(1);
      expect(byEval[0].id).toBe(res.id);
    });

    it("enforces 1:1 unique constraint on triage_case_id in database", async () => {
      const res1 = Resolution.create({
        triageCaseId: testCase.id,
        evaluationId: testEvaluation.id,
        outcome: ResolutionOutcome.CONFIRMED_VALID,
        reason: "First resolution",
        moderatorId: "mod_1",
      });
      await resolutionRepo.save(res1);

      const res2 = Resolution.create({
        triageCaseId: testCase.id,
        evaluationId: testEvaluation.id,
        outcome: ResolutionOutcome.DISMISSED,
        reason: "Duplicate resolution for same case",
        moderatorId: "mod_2",
      });

      await expect(resolutionRepo.save(res2)).rejects.toThrow();
    });
  });

  describe("3. Application Command: ResolveTriageCaseHandler & Unit of Work", () => {
    it("resolves an OPEN case, synchronizes QualitySignal to RESOLVED, and records outbox event", async () => {
      const result = await resolveTriageCaseHandler.execute({
        caseId: testCase.id,
        outcome: ResolutionOutcome.CONFIRMED_VALID,
        reason: "Evaluator scores fall within acceptable variance rubric guidelines.",
        notes: "Complete audit verified",
        evidenceReferences: [testSignal.id],
        expectedVersion: 1,
        actorId: "mod_senior",
        actorType: "USER",
        userRole: "MODERATOR",
      });

      // Verify TriageCase updated state
      expect(result.triageCase.status).toBe(TriageCaseStatus.RESOLVED);
      expect(result.triageCase.version).toBe(2);

      // Verify Resolution payload
      expect(result.resolution.id).toBeDefined();
      expect(result.resolution.triageCaseId).toBe(testCase.id);
      expect(result.resolution.evaluationId).toBe(testEvaluation.id);
      expect(result.resolution.outcome).toBe(ResolutionOutcome.CONFIRMED_VALID);
      expect(result.resolution.moderatorId).toBe("mod_senior");

      // Verify persistent QualitySignal state was synchronized to RESOLVED
      const updatedSignal = (await qualitySignalRepo.findById(testSignal.id))!;
      expect(updatedSignal.status).toBe(QualitySignalStatus.RESOLVED);
      expect(updatedSignal.evidence.resolutionOutcome).toBe(ResolutionOutcome.CONFIRMED_VALID);

      // Verify transactional OutboxEvent
      const outboxRows = await db
        .selectFrom("outbox_events")
        .selectAll()
        .where("event_type", "=", "TriageCaseResolved")
        .execute();

      expect(outboxRows).toHaveLength(1);
      const outbox = outboxRows[0];
      expect(outbox.aggregate_id).toBe(testCase.id);
      expect(outbox.aggregate_type).toBe("TriageCase");
      expect(outbox.actor_type).toBe("USER");
      expect(outbox.actor_id).toBe("mod_senior");

      const payload = JSON.parse(outbox.payload);
      expect(payload.caseId).toBe(testCase.id);
      expect(payload.resolutionId).toBe(result.resolution.id);
      expect(payload.outcome).toBe(ResolutionOutcome.CONFIRMED_VALID);
      expect(payload.status).toBe(TriageCaseStatus.RESOLVED);
      expect(payload.version).toBe(2);
    });

    it("resolves a case with DISMISSED outcome and synchronizes QualitySignal to DISMISSED", async () => {
      const result = await resolveTriageCaseHandler.execute({
        caseId: testCase.id,
        outcome: ResolutionOutcome.DISMISSED,
        reason: "False positive deviation due to exceptional question difficulty.",
        notes: "No misconduct found",
        actorId: "mod_senior",
        actorType: "USER",
        userRole: "ADMIN",
      });

      expect(result.triageCase.status).toBe(TriageCaseStatus.RESOLVED);
      expect(result.resolution.outcome).toBe(ResolutionOutcome.DISMISSED);

      const updatedSignal = (await qualitySignalRepo.findById(testSignal.id))!;
      expect(updatedSignal.status).toBe(QualitySignalStatus.DISMISSED);
      expect(updatedSignal.evidence.dismissalReason).toBe(
        "False positive deviation due to exceptional question difficulty."
      );
    });

    it("supports all 5 ResolutionOutcome values", async () => {
      const outcomes = [
        ResolutionOutcome.CONFIRMED_VALID,
        ResolutionOutcome.LEGITIMATE_VARIATION,
        ResolutionOutcome.CORRECTION_REQUIRED,
        ResolutionOutcome.ESCALATED,
        ResolutionOutcome.DISMISSED,
      ];

      for (const outcome of outcomes) {
        // Create new signal and case with distinct signalType
        const sig = QualitySignal.create({
          evaluationId: testEvaluation.id,
          evaluationVersion: 1,
          signalType: `SPEED_ANOMALY_${outcome}`,
          severity: SignalSeverity.MEDIUM,
          summary: `Testing outcome ${outcome}`,
          evidence: {},
          detector: { type: "STATISTICAL", name: `test-${outcome.toLowerCase()}`, version: "1.0" },
        });
        await qualitySignalRepo.save(sig);

        const newCaseDto = await createTriageCaseHandler.execute({
          qualitySignalId: sig.id,
          actorId: "mod_1",
          actorType: "USER",
          userRole: "MODERATOR",
        });

        const res = await resolveTriageCaseHandler.execute({
          caseId: newCaseDto.id,
          outcome,
          reason: `Resolving with ${outcome}`,
          actorId: "mod_1",
          actorType: "USER",
          userRole: "MODERATOR",
        });

        expect(res.triageCase.status).toBe(TriageCaseStatus.RESOLVED);
        expect(res.resolution.outcome).toBe(outcome);
      }
    });

    it("rejects resolution with ConcurrencyConflictError when expectedVersion is stale", async () => {
      // Assign case first to increment version from 1 to 2
      await assignTriageCaseHandler.execute({
        caseId: testCase.id,
        assigneeId: "mod_assigned",
        actorId: "mod_lead",
        userRole: "MODERATOR",
      });

      // Pass stale expectedVersion = 1
      await expect(
        resolveTriageCaseHandler.execute({
          caseId: testCase.id,
          outcome: ResolutionOutcome.CONFIRMED_VALID,
          reason: "Resolving with stale version",
          expectedVersion: 1,
          actorId: "mod_assigned",
          userRole: "MODERATOR",
        })
      ).rejects.toThrow(ConcurrencyConflictError);
    });

    it("rejects resolution with InvalidStateTransitionError when case is already resolved", async () => {
      await resolveTriageCaseHandler.execute({
        caseId: testCase.id,
        outcome: ResolutionOutcome.CONFIRMED_VALID,
        reason: "First valid resolution",
        actorId: "mod_1",
        userRole: "MODERATOR",
      });

      await expect(
        resolveTriageCaseHandler.execute({
          caseId: testCase.id,
          outcome: ResolutionOutcome.DISMISSED,
          reason: "Second resolution attempt",
          actorId: "mod_1",
          userRole: "MODERATOR",
        })
      ).rejects.toThrow(InvalidStateTransitionError);
    });

    it("rejects resolution with EntityNotFoundError when caseId does not exist", async () => {
      await expect(
        resolveTriageCaseHandler.execute({
          caseId: "nonexistent_case",
          outcome: ResolutionOutcome.CONFIRMED_VALID,
          reason: "Resolving non-existent case",
          actorId: "mod_1",
          userRole: "MODERATOR",
        })
      ).rejects.toThrow(EntityNotFoundError);
    });

    it("rejects resolution with InvalidCommandError when reason is empty", async () => {
      await expect(
        resolveTriageCaseHandler.execute({
          caseId: testCase.id,
          outcome: ResolutionOutcome.CONFIRMED_VALID,
          reason: "   ",
          actorId: "mod_1",
          userRole: "MODERATOR",
        })
      ).rejects.toThrow(InvalidCommandError);
    });

    it("rolls back all changes atomically when transaction fails", async () => {
      // Simulate transaction failure by forcing an invalid resolution save
      const failingUow: any = {
        execute: async (fn: any) => {
          return db.transaction().execute(async (trx) => {
            const scope = {
              evaluations: new KyselyEvaluationRepository(trx),
              rubrics: null as any,
              qualitySignals: new KyselyQualitySignalRepository(trx),
              triageCases: new KyselyTriageCaseRepository(trx),
              resolutions: {
                save: async () => {
                  throw new Error("Simulated database failure during resolution save");
                },
              },
              outbox: { record: async () => {} },
              audit: { record: async () => {} },
            };
            return fn(scope);
          });
        },
      };

      const failingHandler = new ResolveTriageCaseHandler(failingUow);

      await expect(
        failingHandler.execute({
          caseId: testCase.id,
          outcome: ResolutionOutcome.CONFIRMED_VALID,
          reason: "This will fail and roll back",
          actorId: "mod_1",
          userRole: "MODERATOR",
        })
      ).rejects.toThrow("Simulated database failure during resolution save");

      // Verify case status was rolled back to OPEN and version remains 1
      const unmodifiedCase = (await triageCaseRepo.findById(testCase.id))!;
      expect(unmodifiedCase.status).toBe(TriageCaseStatus.OPEN);
      expect(unmodifiedCase.version).toBe(1);

      // Verify no resolution was persisted
      const noRes = await resolutionRepo.findByTriageCaseId(testCase.id);
      expect(noRes).toBeNull();
    });
  });

  describe("4. Authorization Boundaries (INV-003, INV-004)", () => {
    it("strictly rejects AI actors from resolving triage cases (INV-003, INV-004)", async () => {
      await expect(
        resolveTriageCaseHandler.execute({
          caseId: testCase.id,
          outcome: ResolutionOutcome.CONFIRMED_VALID,
          reason: "AI attempted resolution",
          actorId: "gemini-model-v2",
          actorType: "AI",
          userRole: "MODERATOR",
        })
      ).rejects.toThrow(UnauthorizedActionError);
    });

    it("strictly rejects automated system actors from resolving triage cases", async () => {
      await expect(
        resolveTriageCaseHandler.execute({
          caseId: testCase.id,
          outcome: ResolutionOutcome.CONFIRMED_VALID,
          reason: "Background cron job attempted resolution",
          actorId: "system_cron",
          actorType: "SYSTEM",
          userRole: "MODERATOR",
        })
      ).rejects.toThrow(UnauthorizedActionError);
    });

    it("strictly rejects EXAMINER role from resolving triage cases", async () => {
      await expect(
        resolveTriageCaseHandler.execute({
          caseId: testCase.id,
          outcome: ResolutionOutcome.CONFIRMED_VALID,
          reason: "Examiner attempting self-moderation",
          actorId: "examiner_1",
          actorType: "USER",
          userRole: "EXAMINER",
        })
      ).rejects.toThrow(UnauthorizedActionError);
    });

    it("allows MODERATOR role to resolve triage cases", async () => {
      const res = await resolveTriageCaseHandler.execute({
        caseId: testCase.id,
        outcome: ResolutionOutcome.CONFIRMED_VALID,
        reason: "Authorized moderator resolution",
        actorId: "moderator_1",
        actorType: "USER",
        userRole: "MODERATOR",
      });
      expect(res.triageCase.status).toBe(TriageCaseStatus.RESOLVED);
    });

    it("allows ADMIN role to resolve triage cases", async () => {
      const res = await resolveTriageCaseHandler.execute({
        caseId: testCase.id,
        outcome: ResolutionOutcome.CONFIRMED_VALID,
        reason: "Authorized admin supervisor resolution",
        actorId: "admin_1",
        actorType: "USER",
        userRole: "ADMIN",
      });
      expect(res.triageCase.status).toBe(TriageCaseStatus.RESOLVED);
    });
  });

  describe("5. HTTP Presentation Integration: POST /api/v1/triage-cases/:caseId/resolve", () => {
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
      await server.ready();
    });

    afterEach(async () => {
      await server.close();
    });

    it("POST /api/v1/triage-cases/:caseId/resolve returns 200 with resolved case and resolution payload", async () => {
      const res = await server.inject({
        method: "POST",
        url: `/api/v1/triage-cases/${testCase.id}/resolve`,
        headers: {
          "x-actor-type": "USER",
          "x-actor-id": "mod_api_user",
          "x-user-role": "MODERATOR",
        },
        payload: {
          outcome: "CONFIRMED_VALID",
          reason: "Verified correct application of standard rubric",
          notes: "Approved after moderator review",
          evidenceReferences: [testSignal.id],
          expectedVersion: 1,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.triageCase).toBeDefined();
      expect(body.triageCase.status).toBe("RESOLVED");
      expect(body.triageCase.version).toBe(2);
      expect(body.resolution).toBeDefined();
      expect(body.resolution.triageCaseId).toBe(testCase.id);
      expect(body.resolution.outcome).toBe("CONFIRMED_VALID");
      expect(body.resolution.moderatorId).toBe("mod_api_user");
    });

    it("POST /api/v1/triage-cases/:caseId/resolve returns 400 Bad Request on missing reason", async () => {
      const res = await server.inject({
        method: "POST",
        url: `/api/v1/triage-cases/${testCase.id}/resolve`,
        headers: { "x-user-role": "MODERATOR" },
        payload: {
          outcome: "CONFIRMED_VALID",
          reason: "", // Empty reason
        },
      });

      expect(res.statusCode).toBe(400);
    });

    it("POST /api/v1/triage-cases/:caseId/resolve returns 400 Bad Request on invalid outcome", async () => {
      const res = await server.inject({
        method: "POST",
        url: `/api/v1/triage-cases/${testCase.id}/resolve`,
        headers: { "x-user-role": "MODERATOR" },
        payload: {
          outcome: "NOT_A_REAL_OUTCOME",
          reason: "Some valid reason",
        },
      });

      expect(res.statusCode).toBe(400);
    });

    it("POST /api/v1/triage-cases/:caseId/resolve returns 403 Forbidden when x-actor-type is AI", async () => {
      const res = await server.inject({
        method: "POST",
        url: `/api/v1/triage-cases/${testCase.id}/resolve`,
        headers: {
          "x-actor-type": "AI",
          "x-user-role": "MODERATOR",
        },
        payload: {
          outcome: "CONFIRMED_VALID",
          reason: "AI attempted resolution",
        },
      });

      expect(res.statusCode).toBe(403);
      expect(res.json().error).toBe("UnauthorizedActionError");
    });

    it("POST /api/v1/triage-cases/:caseId/resolve returns 403 Forbidden when x-user-role is EXAMINER", async () => {
      const res = await server.inject({
        method: "POST",
        url: `/api/v1/triage-cases/${testCase.id}/resolve`,
        headers: {
          "x-actor-type": "USER",
          "x-user-role": "EXAMINER",
        },
        payload: {
          outcome: "CONFIRMED_VALID",
          reason: "Examiner attempting resolution",
        },
      });

      expect(res.statusCode).toBe(403);
      expect(res.json().error).toBe("UnauthorizedActionError");
    });

    it("POST /api/v1/triage-cases/:caseId/resolve returns 404 Not Found for non-existent case", async () => {
      const res = await server.inject({
        method: "POST",
        url: "/api/v1/triage-cases/case_missing_12345/resolve",
        headers: { "x-user-role": "MODERATOR" },
        payload: {
          outcome: "CONFIRMED_VALID",
          reason: "Valid reason for missing case",
        },
      });

      expect(res.statusCode).toBe(404);
      expect(res.json().error).toBe("EntityNotFoundError");
    });

    it("POST /api/v1/triage-cases/:caseId/resolve returns 409 Conflict on stale expectedVersion", async () => {
      // First resolve case through API
      await server.inject({
        method: "POST",
        url: `/api/v1/triage-cases/${testCase.id}/resolve`,
        headers: { "x-user-role": "MODERATOR" },
        payload: {
          outcome: "CONFIRMED_VALID",
          reason: "First resolution",
          expectedVersion: 1,
        },
      });

      // Attempt to resolve again with stale version 1
      const res = await server.inject({
        method: "POST",
        url: `/api/v1/triage-cases/${testCase.id}/resolve`,
        headers: { "x-user-role": "MODERATOR" },
        payload: {
          outcome: "DISMISSED",
          reason: "Conflicting resolution attempt",
          expectedVersion: 1,
        },
      });

      expect(res.statusCode).toBe(409);
    });
  });

  describe("6. Evaluation Mark Invariance (INV-003, INV-004)", () => {
    it("ensures evaluation marks, scores, and status remain 100% unaltered before and after resolution", async () => {
      const evalBefore = (await evaluationRepo.findById(testEvaluation.id))!;
      const totalScoreBefore = evalBefore.totalScore;
      const marksBefore = evalBefore.marks;
      const statusBefore = evalBefore.status;
      const versionBefore = evalBefore.version;

      await resolveTriageCaseHandler.execute({
        caseId: testCase.id,
        outcome: ResolutionOutcome.CORRECTION_REQUIRED,
        reason: "Correction required for question 1 mark allocation",
        actorId: "mod_lead",
        userRole: "MODERATOR",
      });

      const evalAfter = (await evaluationRepo.findById(testEvaluation.id))!;
      expect(evalAfter.totalScore).toBe(totalScoreBefore);
      expect(evalAfter.marks).toEqual(marksBefore);
      expect(evalAfter.status).toBe(statusBefore);
      expect(evalAfter.version).toBe(versionBefore);
    });
  });
});
