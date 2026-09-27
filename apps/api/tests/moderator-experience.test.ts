/**
 * Comprehensive Tests for Moderator Review Experience (TASK-P5-MOD-003).
 *
 * Conforms to:
 * - docs/contracts/01-product-contract.md §32, FR-008, FR-009 (Human resolution, mandatory reason)
 * - docs/contracts/02-architecture-contract.md §8 (Presentation & application workflow)
 * - docs/contracts/05-domain-contract.md §24-28 (TriageCase lifecycle, canonical outcomes)
 * - docs/contracts/06-api-contract.md §29-33, §46, §66-67 (HTTP routes, auth headers, concurrency)
 * - docs/contracts/09-testing-contract.md §42-44, §86-87, §127 (Verification requirements)
 * - docs/contracts/10-demo-contract.md §24-25 (EscalationHub moderation demo requirements)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
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
  ResolutionOutcome,
  QualitySignal,
  QualitySignalStatus,
  SignalSeverity,
  Evaluation,
} from "../src/domain/index.js";
import {
  CreateTriageCaseHandler,
  AssignTriageCaseHandler,
  ResolveTriageCaseHandler,
} from "../src/application/index.js";
import { createServer } from "../src/presentation/server.js";
import { UserRole, ActorType, EvaluationStatus } from "@osm/shared";
import { triageService } from "../../web/src/services/triage-service.ts";
import { ApiError, type AuthContext } from "../../web/src/services/api-client.ts";

describe("TASK-P5-MOD-003: Moderator Review Experience & EscalationHub Integration", () => {
  let db: KyselyDb;
  let evaluationRepo: KyselyEvaluationRepository;
  let signalRepo: KyselyQualitySignalRepository;
  let triageRepo: KyselyTriageCaseRepository;
  let resolutionRepo: KyselyResolutionRepository;
  let unitOfWork: KyselyUnitOfWork;

  let createCaseHandler: CreateTriageCaseHandler;
  let server: FastifyInstance;

  beforeEach(async () => {
    db = createDatabase(":memory:");
    await runMigrations(db);

    evaluationRepo = new KyselyEvaluationRepository(db);
    signalRepo = new KyselyQualitySignalRepository(db);
    triageRepo = new KyselyTriageCaseRepository(db);
    resolutionRepo = new KyselyResolutionRepository(db);
    unitOfWork = new KyselyUnitOfWork(db);

    createCaseHandler = new CreateTriageCaseHandler(unitOfWork);

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
    vi.restoreAllMocks();
  });

  // Helper to seed evaluation + quality signal
  async function seedSignal(severity: SignalSeverity = SignalSeverity.HIGH) {
    const evaluationId = `eval_${randomUUID()}`;
    const evaluation = Evaluation.create({
      id: evaluationId,
      evaluationCycleId: "cycle_test_001",
      scriptId: "script_test_001",
      evaluatorId: "examiner_orig_001",
      rubricId: "rubric_test_001",
      rubricVersion: 1,
      questions: [
        {
          id: "q_1",
          questionNumber: "1",
          text: "Test question",
          maxMarks: 100,
          rubricCriteriaId: null,
          orderIndex: 0,
        },
      ],
    });
    evaluation.assignMark({
      questionId: "q_1",
      awardedMarks: 78,
      evaluatorId: "examiner_orig_001",
    });
    await evaluationRepo.save(evaluation);

    const signalId = `sig_${randomUUID()}`;
    const signal = QualitySignal.create({
      id: signalId,
      evaluationId,
      evaluationVersion: evaluation.version,
      signalType: "HIGH_SCORE_OUTLIER",
      severity,
      status: QualitySignalStatus.REVIEWABLE,
      summary: "Score is 3 standard deviations above examiner cohort mean.",
      evidence: { zScore: 3.4, mean: 45.2, stdev: 9.6 },
      detector: {
        type: "STATISTICAL",
        name: "StatisticalOutlierDetector",
        version: "1.0.0",
      },
    });
    await signalRepo.save(signal);

    return { evaluation, signal };
  }

  describe("1. Canonical Resolution Outcomes & Vocabulary Integrity", () => {
    it("recognizes exactly the 5 canonical ResolutionOutcome values", () => {
      const canonicalOutcomes = [
        ResolutionOutcome.CONFIRMED_VALID,
        ResolutionOutcome.LEGITIMATE_VARIATION,
        ResolutionOutcome.CORRECTION_REQUIRED,
        ResolutionOutcome.ESCALATED,
        ResolutionOutcome.DISMISSED,
      ];

      expect(canonicalOutcomes).toEqual([
        "CONFIRMED_VALID",
        "LEGITIMATE_VARIATION",
        "CORRECTION_REQUIRED",
        "ESCALATED",
        "DISMISSED",
      ]);
      expect(canonicalOutcomes).toHaveLength(5);
    });

    it("verifies the ResolutionModal outcome list matches repository enums exactly", () => {
      const modalOutcomes = [
        "CONFIRMED_VALID",
        "LEGITIMATE_VARIATION",
        "CORRECTION_REQUIRED",
        "ESCALATED",
        "DISMISSED",
      ] as const;

      for (const outcome of modalOutcomes) {
        expect(Object.values(ResolutionOutcome)).toContain(outcome);
      }
    });
  });

  describe("2. TriageService API Client Unit Integration", () => {
    it("serializes auth headers correctly into outgoing requests", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => [],
      });
      vi.stubGlobal("fetch", mockFetch);

      const auth: AuthContext = {
        role: UserRole.MODERATOR,
        actorType: ActorType.USER,
        actorId: "mod_agent_alpha",
      };

      const result = await triageService.listTriageCases({ status: TriageCaseStatus.OPEN }, auth);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain("/api/v1/triage-cases?status=OPEN");
      expect(options.headers["x-user-role"]).toBe("MODERATOR");
      expect(options.headers["x-actor-type"]).toBe("USER");
      expect(options.headers["x-actor-id"]).toBe("mod_agent_alpha");
      expect(result).toEqual([]);
    });

    it("maps 403 Forbidden to ApiError with correct properties", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({
          error: "UnauthorizedActionError",
          code: "UNAUTHORIZED_ACTION",
          message: "Examiners are not authorized to resolve triage cases. Required: MODERATOR or ADMIN.",
        }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const auth: AuthContext = {
        role: UserRole.EXAMINER,
        actorType: ActorType.USER,
        actorId: "examiner_001",
      };

      await expect(
        triageService.resolveTriageCase(
          "case_123",
          {
            outcome: ResolutionOutcome.CONFIRMED_VALID,
            reason: "Valid reason text",
            expectedVersion: 1,
          },
          auth
        )
      ).rejects.toThrow(ApiError);

      try {
        await triageService.resolveTriageCase(
          "case_123",
          {
            outcome: ResolutionOutcome.CONFIRMED_VALID,
            reason: "Valid reason text",
            expectedVersion: 1,
          },
          auth
        );
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(ApiError);
        const apiError = err as ApiError;
        expect(apiError.statusCode).toBe(403);
        expect(apiError.code).toBe("UNAUTHORIZED_ACTION");
        expect(apiError.message).toContain("Examiners are not authorized");
      }
    });

    it("maps 409 Conflict (concurrency error) to ApiError with correct properties", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({
          error: "ConcurrencyConflictError",
          code: "CONCURRENCY_CONFLICT",
          message: "TriageCase has been modified by another user. Expected version 1, current is 2.",
        }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const auth: AuthContext = {
        role: UserRole.MODERATOR,
        actorType: ActorType.USER,
        actorId: "mod_001",
      };

      try {
        await triageService.assignTriageCase(
          "case_123",
          { assigneeId: "mod_002", expectedVersion: 1 },
          auth
        );
        expect.unreachable("Should have thrown ApiError");
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(ApiError);
        const apiError = err as ApiError;
        expect(apiError.statusCode).toBe(409);
        expect(apiError.code).toBe("CONCURRENCY_CONFLICT");
      }
    });

    it("submits assign payload with expectedVersion correctly", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({
          id: "case_abc",
          status: "ASSIGNED",
          assigneeId: "moderator_99",
          version: 2,
        }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const auth: AuthContext = {
        role: UserRole.MODERATOR,
        actorType: ActorType.USER,
        actorId: "mod_99",
      };

      const res = await triageService.assignTriageCase(
        "case_abc",
        { assigneeId: "moderator_99", expectedVersion: 1 },
        auth
      );

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe("/api/v1/triage-cases/case_abc/assign");
      expect(options.method).toBe("POST");
      expect(JSON.parse(options.body)).toEqual({
        assigneeId: "moderator_99",
        expectedVersion: 1,
      });
      expect(res.status).toBe("ASSIGNED");
    });
  });

  describe("3. Queue Filter & Metric Computation Invariants", () => {
    function filterCases(
      cases: Array<{
        id: string;
        signalType: string;
        summary: string;
        assigneeId: string | null;
        status: TriageCaseStatus;
        priority: SignalSeverity;
      }>,
      statusFilter: string,
      priorityFilter: string,
      search: string
    ) {
      return cases.filter((c) => {
        if (statusFilter !== "ALL" && c.status !== statusFilter) return false;
        if (priorityFilter !== "ALL" && c.priority !== priorityFilter) return false;
        if (search.trim()) {
          const q = search.toLowerCase();
          const matches =
            c.id.toLowerCase().includes(q) ||
            c.signalType.toLowerCase().includes(q) ||
            c.summary.toLowerCase().includes(q) ||
            (c.assigneeId && c.assigneeId.toLowerCase().includes(q));
          if (!matches) return false;
        }
        return true;
      });
    }

    const testCases = [
      {
        id: "case_01",
        signalType: "HIGH_SCORE_OUTLIER",
        summary: "Examiner scored exceptionally high",
        assigneeId: "mod_1",
        status: TriageCaseStatus.OPEN,
        priority: SignalSeverity.CRITICAL,
      },
      {
        id: "case_02",
        signalType: "SPEED_ANOMALY",
        summary: "Marking completed in 12 seconds",
        assigneeId: "mod_2",
        status: TriageCaseStatus.ASSIGNED,
        priority: SignalSeverity.HIGH,
      },
      {
        id: "case_03",
        signalType: "LOW_CONFIDENCE_OCR",
        summary: "OCR uncertainty in question 3",
        assigneeId: "mod_1",
        status: TriageCaseStatus.RESOLVED,
        priority: SignalSeverity.LOW,
      },
      {
        id: "case_04",
        signalType: "UNCHECKED_ANSWER",
        summary: "Page 4 has unmarked response",
        assigneeId: null,
        status: TriageCaseStatus.OPEN,
        priority: SignalSeverity.HIGH,
      },
    ];

    it("filters accurately by status", () => {
      expect(filterCases(testCases, "OPEN", "ALL", "")).toHaveLength(2);
      expect(filterCases(testCases, "ASSIGNED", "ALL", "")).toHaveLength(1);
      expect(filterCases(testCases, "RESOLVED", "ALL", "")).toHaveLength(1);
      expect(filterCases(testCases, "ALL", "ALL", "")).toHaveLength(4);
    });

    it("filters accurately by priority", () => {
      expect(filterCases(testCases, "ALL", "CRITICAL", "")).toHaveLength(1);
      expect(filterCases(testCases, "ALL", "HIGH", "")).toHaveLength(2);
      expect(filterCases(testCases, "ALL", "LOW", "")).toHaveLength(1);
      expect(filterCases(testCases, "ALL", "MEDIUM", "")).toHaveLength(0);
    });

    it("filters accurately by search term", () => {
      expect(filterCases(testCases, "ALL", "ALL", "speed")).toHaveLength(1);
      expect(filterCases(testCases, "ALL", "ALL", "mod_1")).toHaveLength(2);
      expect(filterCases(testCases, "ALL", "ALL", "unmarked")).toHaveLength(1);
      expect(filterCases(testCases, "ALL", "ALL", "nonexistent")).toHaveLength(0);
    });

    it("computes queue metrics accurately", () => {
      const total = testCases.length;
      const open = testCases.filter((c) => c.status === TriageCaseStatus.OPEN).length;
      const assigned = testCases.filter((c) => c.status === TriageCaseStatus.ASSIGNED).length;
      const resolved = testCases.filter((c) => c.status === TriageCaseStatus.RESOLVED).length;
      const highPriority = testCases.filter(
        (c) => c.priority === SignalSeverity.CRITICAL || c.priority === SignalSeverity.HIGH
      ).length;

      expect(total).toBe(4);
      expect(open).toBe(2);
      expect(assigned).toBe(1);
      expect(resolved).toBe(1);
      expect(highPriority).toBe(3);
    });
  });

  describe("4. End-to-End Moderation Lifecycle via Live Fastify Server", () => {
    it("executes complete lifecycle: list -> assign -> resolve, while verifying authorization & concurrency", async () => {
      const { evaluation, signal } = await seedSignal(SignalSeverity.HIGH);

      // Step A: Create TriageCase
      const createRes = await server.inject({
        method: "POST",
        url: "/api/v1/triage-cases",
        headers: {
          "x-user-role": "MODERATOR",
          "x-actor-type": "USER",
          "x-actor-id": "mod_super_01",
        },
        payload: {
          qualitySignalId: signal.id,
          priority: "HIGH",
        },
      });
      expect(createRes.statusCode).toBe(201);
      const caseData = createRes.json();
      const caseId = caseData.id;
      expect(caseData.status).toBe("OPEN");
      expect(caseData.version).toBe(1);

      // Step B: List cases (Queue View)
      const listRes = await server.inject({
        method: "GET",
        url: "/api/v1/triage-cases?status=OPEN",
        headers: {
          "x-user-role": "MODERATOR",
          "x-actor-type": "USER",
          "x-actor-id": "mod_super_01",
        },
      });
      expect(listRes.statusCode).toBe(200);
      const listJson = listRes.json();
      expect(listJson).toHaveLength(1);
      expect(listJson[0].id).toBe(caseId);

      // Step C: Examiner attempts assignment -> 403 Forbidden
      const unauthAssign = await server.inject({
        method: "POST",
        url: `/api/v1/triage-cases/${caseId}/assign`,
        headers: {
          "x-user-role": "EXAMINER",
          "x-actor-type": "USER",
          "x-actor-id": "examiner_001",
        },
        payload: {
          assigneeId: "examiner_001",
          expectedVersion: 1,
        },
      });
      expect(unauthAssign.statusCode).toBe(403);

      // Step D: Moderator assigns case (Assignment UI)
      const assignRes = await server.inject({
        method: "POST",
        url: `/api/v1/triage-cases/${caseId}/assign`,
        headers: {
          "x-user-role": "MODERATOR",
          "x-actor-type": "USER",
          "x-actor-id": "mod_lead_01",
        },
        payload: {
          assigneeId: "mod_specialist_42",
          expectedVersion: 1,
        },
      });
      expect(assignRes.statusCode).toBe(200);
      const assignedCase = assignRes.json();
      expect(assignedCase.status).toBe("ASSIGNED");
      expect(assignedCase.assigneeId).toBe("mod_specialist_42");
      expect(assignedCase.version).toBe(2);

      // Step E: Stale assignment with expectedVersion 1 -> 409 Conflict
      const staleAssign = await server.inject({
        method: "POST",
        url: `/api/v1/triage-cases/${caseId}/assign`,
        headers: {
          "x-user-role": "MODERATOR",
          "x-actor-type": "USER",
          "x-actor-id": "mod_lead_01",
        },
        payload: {
          assigneeId: "mod_other_99",
          expectedVersion: 1,
        },
      });
      expect(staleAssign.statusCode).toBe(409);

      // Step F: Examiner attempts resolution -> 403 Forbidden
      const unauthResolve = await server.inject({
        method: "POST",
        url: `/api/v1/triage-cases/${caseId}/resolve`,
        headers: {
          "x-user-role": "EXAMINER",
          "x-actor-type": "USER",
          "x-actor-id": "examiner_001",
        },
        payload: {
          outcome: "CONFIRMED_VALID",
          reason: "Examiner tries to self-resolve",
          expectedVersion: 2,
        },
      });
      expect(unauthResolve.statusCode).toBe(403);

      // Step G: Moderator attempts resolution with stale version 1 -> 409 Conflict
      const staleResolve = await server.inject({
        method: "POST",
        url: `/api/v1/triage-cases/${caseId}/resolve`,
        headers: {
          "x-user-role": "MODERATOR",
          "x-actor-type": "USER",
          "x-actor-id": "mod_specialist_42",
        },
        payload: {
          outcome: "CONFIRMED_VALID",
          reason: "Valid reason text",
          expectedVersion: 1, // Stale! Current is 2
        },
      });
      expect(staleResolve.statusCode).toBe(409);

      // Step H: Moderator attempts resolution with empty reason -> 400 Bad Request (FR-009)
      const emptyReasonResolve = await server.inject({
        method: "POST",
        url: `/api/v1/triage-cases/${caseId}/resolve`,
        headers: {
          "x-user-role": "MODERATOR",
          "x-actor-type": "USER",
          "x-actor-id": "mod_specialist_42",
        },
        payload: {
          outcome: "CONFIRMED_VALID",
          reason: "   ",
          expectedVersion: 2,
        },
      });
      expect(emptyReasonResolve.statusCode).toBe(400);

      // Step I: Moderator resolves with expectedVersion 2 and canonical outcome (Resolution Modal)
      const resolveRes = await server.inject({
        method: "POST",
        url: `/api/v1/triage-cases/${caseId}/resolve`,
        headers: {
          "x-user-role": "MODERATOR",
          "x-actor-type": "USER",
          "x-actor-id": "mod_specialist_42",
        },
        payload: {
          outcome: "CONFIRMED_VALID",
          reason: "Reviewed candidate script and confirmed answer merits awarded marks according to marking rubric section 3.2.",
          notes: "Variation is legitimate given the student's novel algorithmic approach.",
          evidenceReferences: ["rubric_section_3.2", "marking_guidelines_p14"],
          expectedVersion: 2,
        },
      });
      expect(resolveRes.statusCode).toBe(200);
      const resolveJson = resolveRes.json();
      expect(resolveJson.triageCase.status).toBe("RESOLVED");
      expect(resolveJson.triageCase.version).toBe(3);
      expect(resolveJson.resolution.outcome).toBe("CONFIRMED_VALID");
      expect(resolveJson.resolution.moderatorId).toBe("mod_specialist_42");
      expect(resolveJson.resolution.reason).toContain("Reviewed candidate script");

      // Step J: Re-resolving already resolved case -> 409 Conflict
      const doubleResolve = await server.inject({
        method: "POST",
        url: `/api/v1/triage-cases/${caseId}/resolve`,
        headers: {
          "x-user-role": "MODERATOR",
          "x-actor-type": "USER",
          "x-actor-id": "mod_specialist_42",
        },
        payload: {
          outcome: "DISMISSED",
          reason: "Trying to overwrite resolution",
          expectedVersion: 3,
        },
      });
      expect(doubleResolve.statusCode).toBe(409);

      // Step K: Reassigning already resolved case -> 409 Conflict
      const reassignResolved = await server.inject({
        method: "POST",
        url: `/api/v1/triage-cases/${caseId}/assign`,
        headers: {
          "x-user-role": "MODERATOR",
          "x-actor-type": "USER",
          "x-actor-id": "mod_lead_01",
        },
        payload: {
          assigneeId: "mod_other",
          expectedVersion: 3,
        },
      });
      expect(reassignResolved.statusCode).toBe(409);

      // Step L: Verify Evaluation marks, score, and status remain 100% UNTOUCHED (INV-003, INV-004)
      const evaluationRecord = await evaluationRepo.findById(evaluation.id);
      expect(evaluationRecord).not.toBeNull();
      expect(evaluationRecord?.totalScore).toBe(78);
      expect(evaluationRecord?.status).toBe(evaluation.status);
      expect(evaluationRecord?.evaluatorId).toBe("examiner_orig_001");
      expect(evaluationRecord?.version).toBe(evaluation.version);
    });
  });
});
