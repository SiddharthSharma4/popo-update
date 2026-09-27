/**
 * Comprehensive Verification Tests for Quality Analytics Dashboard UI (TASK-P8-ANALYTICS-003).
 *
 * Conforms to:
 * - docs/contracts/01-product-contract.md §15 (QualityPulse overview & hotspot drill-down)
 * - docs/contracts/01-product-contract.md §16 (SentinelFlag manual anomaly trigger)
 * - docs/contracts/02-architecture-contract.md §12, §31, §61 (Analytics presentation & read models)
 * - docs/contracts/05-domain-contract.md §37, INV-003, INV-004 (Immutable marks, derived analytics consumption)
 * - docs/contracts/06-api-contract.md §12, §21, §41-45 (Analytics endpoints & role authorization)
 * - docs/contracts/09-testing-contract.md §40 (Verification standards)
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
  Evaluation,
  QualitySignal,
  QualitySignalStatus,
  SignalSeverity,
  TriageCase,
  TriageCaseStatus,
  TriageCasePriority,
} from "../src/domain/index.js";
import {
  QualityAnalyticsService,
  QualityPulseService,
  CreateTriageCaseHandler,
} from "../src/application/index.js";
import { createServer } from "../src/presentation/server.js";
import {
  UserRole,
  ActorType,
  EvaluationStatus,
  QualityRiskLevel,
  QualityHotspotType,
  QualityPulseOverviewSchema,
  QualityHotspotSchema,
  TriggerSentinelResponseSchema,
} from "@osm/shared";
import { analyticsService } from "../../web/src/services/analytics-service.ts";
import { ApiError, type AuthContext } from "../../web/src/services/api-client.ts";

describe("TASK-P8-ANALYTICS-003: Quality Analytics Dashboard UI & Service Verification", () => {
  let db: KyselyDb;
  let evaluationRepo: KyselyEvaluationRepository;
  let signalRepo: KyselyQualitySignalRepository;
  let triageRepo: KyselyTriageCaseRepository;
  let resolutionRepo: KyselyResolutionRepository;
  let unitOfWork: KyselyUnitOfWork;

  let analyticsEngine: QualityAnalyticsService;
  let pulseService: QualityPulseService;
  let server: FastifyInstance;

  beforeEach(async () => {
    db = createDatabase(":memory:");
    await runMigrations(db);

    evaluationRepo = new KyselyEvaluationRepository(db);
    signalRepo = new KyselyQualitySignalRepository(db);
    triageRepo = new KyselyTriageCaseRepository(db);
    resolutionRepo = new KyselyResolutionRepository(db);
    unitOfWork = new KyselyUnitOfWork(db);

    analyticsEngine = new QualityAnalyticsService(
      evaluationRepo,
      signalRepo,
      triageRepo,
      resolutionRepo
    );

    pulseService = new QualityPulseService(
      evaluationRepo,
      signalRepo,
      triageRepo,
      analyticsEngine
    );

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

  // Seed helper for evaluator cohort
  async function seedCohortEvaluations(
    cycleId: string,
    evaluatorScores: Record<string, number[]>,
    status: EvaluationStatus = EvaluationStatus.SUBMITTED
  ) {
    for (const [evaluatorId, scores] of Object.entries(evaluatorScores)) {
      for (const score of scores) {
        const evalId = `eval_${randomUUID()}`;
        const questionId = `q_${randomUUID()}`;
        const evaluation = Evaluation.create({
          id: evalId,
          evaluationCycleId: cycleId,
          scriptId: `script_${randomUUID().slice(0, 8)}`,
          evaluatorId,
          rubricId: "rubric_test_100",
          rubricVersion: 1,
          questions: [
            {
              id: questionId,
              questionNumber: "1",
              text: "Question 1",
              maxMarks: 100,
              rubricCriteriaId: null,
              orderIndex: 0,
            },
          ],
        });

        evaluation.assignMark({
          questionId,
          awardedMarks: score,
          evaluatorId,
        });

        if (status === EvaluationStatus.SUBMITTED) {
          evaluation.submit(evaluatorId);
        }

        await evaluationRepo.save(evaluation);
      }
    }
  }

  describe("1. Vocabulary & Schema Integrity (01-product §15, 06-api §41-45)", () => {
    it("recognizes all QualityRiskLevel enums", () => {
      expect(Object.values(QualityRiskLevel)).toEqual(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
    });

    it("recognizes all QualityHotspotType enums", () => {
      expect(Object.values(QualityHotspotType)).toEqual([
        "EVALUATOR_ANOMALY",
        "QUESTION_DIFFICULTY",
        "SIGNAL_CONCENTRATION",
      ]);
    });

    it("validates empty QualityPulseOverview against canonical Zod schema", () => {
      const emptyOverview = {
        progress: {
          total: 0,
          submitted: 0,
          inProgress: 0,
          draft: 0,
          finalized: 0,
          completionPercentage: 0,
        },
        health: {
          healthIndex: 100,
          riskLevel: QualityRiskLevel.LOW,
          evaluationsWithSignalsCount: 0,
        },
        signalsOverview: {
          total: 0,
          openReviewable: 0,
          linkedToCase: 0,
          resolved: 0,
          dismissed: 0,
          bySeverity: {},
          byDetector: {},
        },
        moderationOverview: {
          totalCases: 0,
          openCases: 0,
          assignedCases: 0,
          resolvedCases: 0,
          resolutionRate: 0,
          byOutcome: {},
        },
        evaluatorDeviations: {
          totalEvaluators: 0,
          normalCount: 0,
          moderateDeviationCount: 0,
          criticalDeviationCount: 0,
          insufficientDataCount: 0,
          flaggedEvaluatorIds: [],
        },
        topHotspots: [],
        generatedAt: new Date().toISOString(),
      };

      const parsed = QualityPulseOverviewSchema.safeParse(emptyOverview);
      expect(parsed.success).toBe(true);
    });
  });

  describe("2. AnalyticsService API Client Layer (Presentation Service)", () => {
    it("serializes getQualityPulse query parameters and auth headers correctly", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({
          progress: { total: 10, submitted: 10, inProgress: 0, draft: 0, finalized: 0, completionPercentage: 100 },
          health: { healthIndex: 95, riskLevel: "LOW", evaluationsWithSignalsCount: 0 },
          signalsOverview: { total: 0, openReviewable: 0, linkedToCase: 0, resolved: 0, dismissed: 0, bySeverity: {}, byDetector: {} },
          moderationOverview: { totalCases: 0, openCases: 0, assignedCases: 0, resolvedCases: 0, resolutionRate: 0, byOutcome: {} },
          evaluatorDeviations: { totalEvaluators: 2, normalCount: 2, moderateDeviationCount: 0, criticalDeviationCount: 0, insufficientDataCount: 0, flaggedEvaluatorIds: [] },
          topHotspots: [],
          generatedAt: new Date().toISOString(),
        }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const auth: AuthContext = {
        role: UserRole.MODERATOR,
        actorType: ActorType.USER,
        actorId: "mod_agent_1",
      };

      const res = await analyticsService.getQualityPulse(
        { evaluationCycleId: "cycle_test_101", minSampleSize: 5, limit: 10 },
        auth
      );

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain("/api/v1/analytics/quality-pulse");
      expect(url).toContain("evaluationCycleId=cycle_test_101");
      expect(url).toContain("minSampleSize=5");
      expect(url).toContain("limit=10");
      expect(options.headers["x-user-role"]).toBe(UserRole.MODERATOR);
      expect(options.headers["x-actor-type"]).toBe(ActorType.USER);
      expect(options.headers["x-actor-id"]).toBe("mod_agent_1");
      expect(res.health.healthIndex).toBe(95);
    });

    it("serializes getHotspots query correctly", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => [
          {
            hotspotType: "EVALUATOR_ANOMALY",
            targetId: "eval_99",
            severity: "CRITICAL",
            title: "Critical Drift",
            description: "Deviation exceeds 25%",
            evidence: { delta: 30.5 },
          },
        ],
      });
      vi.stubGlobal("fetch", mockFetch);

      const res = await analyticsService.getHotspots(
        { evaluationCycleId: "cycle_test_102" },
        { role: UserRole.ADMIN, actorType: ActorType.USER, actorId: "admin_1" }
      );

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain("/api/v1/analytics/quality-pulse/hotspots?evaluationCycleId=cycle_test_102");
      expect(res).toHaveLength(1);
      expect(res[0].hotspotType).toBe("EVALUATOR_ANOMALY");
      expect(res[0].severity).toBe("CRITICAL");
    });

    it("serializes triggerSentinel POST request correctly", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({
          triggeredAt: new Date().toISOString(),
          evaluationCycleId: "cycle_auto_1",
          evaluatorsAnalyzed: 3,
          anomaliesDetected: 1,
          newSignalsGenerated: 1,
          signals: [],
        }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const auth: AuthContext = {
        role: UserRole.MODERATOR,
        actorType: ActorType.USER,
        actorId: "mod_lead",
      };

      const result = await analyticsService.triggerSentinel(
        {
          evaluationCycleId: "cycle_auto_1",
          minSampleSize: 5,
          thresholdPercent: 15,
          criticalThresholdPercent: 25,
        },
        auth
      );

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe("/api/v1/analytics/quality-pulse/trigger-sentinel");
      expect(options.method).toBe("POST");
      expect(JSON.parse(options.body)).toEqual({
        evaluationCycleId: "cycle_auto_1",
        minSampleSize: 5,
        thresholdPercent: 15,
        criticalThresholdPercent: 25,
      });
      expect(result.anomaliesDetected).toBe(1);
      expect(result.evaluatorsAnalyzed).toBe(3);
    });

    it("throws structured ApiError on non-200 responses", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({
          error: "UnauthorizedActionError",
          code: "UNAUTHORIZED_ACTION",
          message: "Examiners are not authorized to inspect quality analytics.",
        }),
      });
      vi.stubGlobal("fetch", mockFetch);

      try {
        await analyticsService.getQualityPulse(
          undefined,
          { role: UserRole.EXAMINER, actorType: ActorType.USER, actorId: "examiner_1" }
        );
        expect.unreachable("Should have thrown ApiError");
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(ApiError);
        const apiErr = err as ApiError;
        expect(apiErr.statusCode).toBe(403);
        expect(apiErr.message).toContain("Examiners are not authorized");
        expect(apiErr.code).toBe("UNAUTHORIZED_ACTION");
      }
    });
  });

  describe("3. HTTP Presentation & Server Integration", () => {
    it("GET /api/v1/analytics/quality-pulse returns full telemetry for populated cohort", async () => {
      const cycleId = "cycle_presentation_001";
      // Seed evaluator data: 4 normal evaluators (70%), 1 outlier (20%)
      await seedCohortEvaluations(cycleId, {
        eval_normal_1: [70, 71, 70, 69, 70],
        eval_normal_2: [71, 70, 69, 71, 70],
        eval_normal_3: [70, 69, 71, 70, 70],
        eval_normal_4: [69, 71, 70, 70, 71],
        eval_drifting: [20, 20, 20, 20, 20],
      });

      const res = await server.inject({
        method: "GET",
        url: `/api/v1/analytics/quality-pulse?evaluationCycleId=${cycleId}`,
        headers: {
          "x-user-role": UserRole.MODERATOR,
          "x-actor-type": ActorType.USER,
          "x-actor-id": "moderator_test",
        },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      const validation = QualityPulseOverviewSchema.safeParse(data);
      expect(validation.success).toBe(true);

      // Verify throughput stats
      expect(data.progress.total).toBe(25);
      expect(data.progress.submitted).toBe(25);
      expect(data.progress.completionPercentage).toBe(100);

      // Verify evaluator deviation distributions
      expect(data.evaluatorDeviations.totalEvaluators).toBe(5);
      expect(data.evaluatorDeviations.criticalDeviationCount).toBe(1);
      expect(data.evaluatorDeviations.normalCount).toBe(4);
      expect(data.evaluatorDeviations.flaggedEvaluatorIds).toContain("eval_drifting");

      // Verify emerging hotspots
      expect(data.topHotspots.length).toBeGreaterThan(0);
      const evaluatorHotspot = data.topHotspots.find((h: any) => h.targetId === "eval_drifting");
      expect(evaluatorHotspot).toBeDefined();
      expect(evaluatorHotspot.hotspotType).toBe("EVALUATOR_ANOMALY");
      expect(evaluatorHotspot.evidence).toBeDefined();
    });

    it("GET /api/v1/analytics/quality-pulse/hotspots returns prioritized hotspots with evidence", async () => {
      const cycleId = "cycle_hotspot_001";
      await seedCohortEvaluations(cycleId, {
        eval_A: [80, 81, 80, 79, 80],
        eval_B: [80, 81, 79, 80, 80],
        eval_C: [81, 80, 80, 80, 79],
        eval_D: [79, 80, 81, 80, 80],
        eval_outlier: [25, 25, 25, 25, 25],
      });

      const res = await server.inject({
        method: "GET",
        url: `/api/v1/analytics/quality-pulse/hotspots?evaluationCycleId=${cycleId}`,
        headers: {
          "x-user-role": UserRole.ADMIN,
          "x-actor-type": ActorType.USER,
          "x-actor-id": "admin_audit",
        },
      });

      expect(res.statusCode).toBe(200);
      const hotspots = res.json();
      expect(Array.isArray(hotspots)).toBe(true);
      expect(hotspots.length).toBeGreaterThan(0);

      const parsed = QualityHotspotSchema.safeParse(hotspots[0]);
      expect(parsed.success).toBe(true);
      expect(hotspots[0].evidence).toHaveProperty("evaluatorMeanPercentage");
      expect(hotspots[0].evidence).toHaveProperty("peerMeanPercentage");
      expect(hotspots[0].evidence).toHaveProperty("deviationPercentage");
    });

    it("POST /api/v1/analytics/quality-pulse/trigger-sentinel successfully generates signals", async () => {
      const cycleId = "cycle_sentinel_001";
      await seedCohortEvaluations(cycleId, {
        eval_A: [85, 84, 86, 85, 85],
        eval_B: [85, 86, 84, 85, 85],
        eval_C: [84, 85, 85, 86, 85],
        eval_D: [85, 85, 86, 84, 85],
        eval_deviant: [30, 30, 30, 30, 30], // Severe deviation
      });

      const res = await server.inject({
        method: "POST",
        url: "/api/v1/analytics/quality-pulse/trigger-sentinel",
        headers: {
          "x-user-role": UserRole.MODERATOR,
          "x-actor-type": ActorType.USER,
          "x-actor-id": "moderator_sentinel",
        },
        payload: {
          evaluationCycleId: cycleId,
          minSampleSize: 5,
          thresholdPercent: 15,
          criticalThresholdPercent: 25,
        },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      const validation = TriggerSentinelResponseSchema.safeParse(data);
      expect(validation.success).toBe(true);

      expect(data.evaluatorsAnalyzed).toBe(5);
      expect(data.anomaliesDetected).toBe(1);
      expect(data.newSignalsGenerated).toBe(1);
      expect(data.signals[0].severity).toBe(SignalSeverity.HIGH);
      expect(data.signals[0].signalType).toBe("STATISTICAL_EVALUATOR_DEVIATION");
    });
  });

  describe("4. Role & Actor Authorization Security Boundaries (06-api §12, 02-architecture §12)", () => {
    it("allows MODERATOR role with 200 OK", async () => {
      const res = await server.inject({
        method: "GET",
        url: "/api/v1/analytics/quality-pulse",
        headers: { "x-user-role": UserRole.MODERATOR, "x-actor-type": ActorType.USER },
      });
      expect(res.statusCode).toBe(200);
    });

    it("allows ADMIN role with 200 OK", async () => {
      const res = await server.inject({
        method: "GET",
        url: "/api/v1/analytics/quality-pulse",
        headers: { "x-user-role": UserRole.ADMIN, "x-actor-type": ActorType.USER },
      });
      expect(res.statusCode).toBe(200);
    });

    it("strictly rejects EXAMINER role with 403 Forbidden on QualityPulse overview", async () => {
      const res = await server.inject({
        method: "GET",
        url: "/api/v1/analytics/quality-pulse",
        headers: { "x-user-role": UserRole.EXAMINER, "x-actor-type": ActorType.USER },
      });
      expect(res.statusCode).toBe(403);
      expect(res.json().error).toBe("UnauthorizedActionError");
    });

    it("strictly rejects EXAMINER role with 403 Forbidden on Hotspots feed", async () => {
      const res = await server.inject({
        method: "GET",
        url: "/api/v1/analytics/quality-pulse/hotspots",
        headers: { "x-user-role": UserRole.EXAMINER, "x-actor-type": ActorType.USER },
      });
      expect(res.statusCode).toBe(403);
      expect(res.json().error).toBe("UnauthorizedActionError");
    });

    it("strictly rejects EXAMINER role with 403 Forbidden on Sentinel trigger", async () => {
      const res = await server.inject({
        method: "POST",
        url: "/api/v1/analytics/quality-pulse/trigger-sentinel",
        headers: { "x-user-role": UserRole.EXAMINER, "x-actor-type": ActorType.USER },
      });
      expect(res.statusCode).toBe(403);
      expect(res.json().error).toBe("UnauthorizedActionError");
    });

    it("strictly rejects AI actor with 403 Forbidden across all analytics endpoints", async () => {
      const endpoints = [
        { method: "GET" as const, url: "/api/v1/analytics/quality-pulse" },
        { method: "GET" as const, url: "/api/v1/analytics/quality-pulse/hotspots" },
        { method: "POST" as const, url: "/api/v1/analytics/quality-pulse/trigger-sentinel" },
      ];

      for (const ep of endpoints) {
        const res = await server.inject({
          method: ep.method,
          url: ep.url,
          headers: { "x-actor-type": ActorType.AI, "x-user-role": UserRole.MODERATOR },
        });
        expect(res.statusCode).toBe(403);
        expect(res.json().error).toBe("UnauthorizedActionError");
      }
    });
  });

  describe("5. Mark & Evaluation State Invariance (INV-003, INV-004)", () => {
    it("guarantees analytics presentation and Sentinel triggers perform zero mark mutation", async () => {
      const cycleId = "cycle_invariance_001";
      await seedCohortEvaluations(cycleId, {
        evaluator_fixed: [75, 75, 75, 75, 75],
      });

      const { items: evaluationsBefore } = await evaluationRepo.findPaginated({
        page: 1,
        pageSize: 100,
        filter: { evaluationCycleId: cycleId },
      });
      const marksBefore = evaluationsBefore.map((e) => ({
        id: e.id,
        totalScore: e.totalScore,
        version: e.version,
        status: e.status,
        questionMarks: e.questions.map((q) => q.awardedMarks),
      }));

      // Execute QualityPulse Overview query
      await server.inject({
        method: "GET",
        url: `/api/v1/analytics/quality-pulse?evaluationCycleId=${cycleId}`,
        headers: { "x-user-role": UserRole.MODERATOR, "x-actor-type": ActorType.USER },
      });

      // Execute Hotspots query
      await server.inject({
        method: "GET",
        url: `/api/v1/analytics/quality-pulse/hotspots?evaluationCycleId=${cycleId}`,
        headers: { "x-user-role": UserRole.MODERATOR, "x-actor-type": ActorType.USER },
      });

      // Execute Sentinel Trigger
      await server.inject({
        method: "POST",
        url: "/api/v1/analytics/quality-pulse/trigger-sentinel",
        headers: { "x-user-role": UserRole.MODERATOR, "x-actor-type": ActorType.USER },
        payload: { evaluationCycleId: cycleId },
      });

      const { items: evaluationsAfter } = await evaluationRepo.findPaginated({
        page: 1,
        pageSize: 100,
        filter: { evaluationCycleId: cycleId },
      });
      const marksAfter = evaluationsAfter.map((e) => ({
        id: e.id,
        totalScore: e.totalScore,
        version: e.version,
        status: e.status,
        questionMarks: e.questions.map((q) => q.awardedMarks),
      }));

      expect(marksAfter).toEqual(marksBefore);
    });
  });
});
