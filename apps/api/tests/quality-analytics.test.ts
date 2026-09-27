/**
 * Quality Analytics Verification Test Suite (TASK-P8-ANALYTICS-001).
 *
 * Conforms to:
 * - docs/contracts/01-product-contract.md §15, §16, §17 (QualityPulse & SentinelFlag)
 * - docs/contracts/02-architecture-contract.md §12, §31 (Analytics module & QualityPulse)
 * - docs/contracts/05-domain-contract.md §37, AP-DOM-004 (Analytics Invariants)
 * - docs/contracts/06-api-contract.md §12, §21, §41-45 (Analytics endpoints & auth)
 * - docs/contracts/08-data-contract.md §4.2, §53 (Derived data & immutability)
 * - docs/contracts/09-testing-contract.md §40 (Analytics reproducibility & test strategy)
 * - docs/planning/03-build-roadmap.md §15 (Phase 8 — Analytics & Insights)
 *
 * Invariants:
 * - INV-004: Analytics are derived statistical observations, never authoritative academic state.
 * - INV-003: Pure read-only computation; performs zero mutations on marks, scores, versions, or evaluations.
 * - Minimum sample size guards: prevents ungrounded inferences on small cohorts.
 * - Deterministic reproducibility: 100% consistent results across identical data windows (50 repetitions).
 * - Role-based authorization: MODERATOR/ADMIN permitted; EXAMINER and AI rejected with 403 Forbidden.
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
  Evaluation,
  EvaluationStatus,
  Rubric,
  QualitySignal,
  QualitySignalStatus,
  SignalSeverity,
  TriageCase,
  Resolution,
  ResolutionOutcome,
} from "../src/domain/index.js";
import { QualityAnalyticsService } from "../src/application/analytics/index.js";
import { createServer } from "../src/presentation/server.js";
import {
  EvaluatorDeviationStatus,
  EvaluatorDeviationMetricSchema,
  QualityAnalyticsSummarySchema,
  UserRole,
  ActorType,
} from "@osm/shared";

describe("TASK-P8-ANALYTICS-001: Quality Analytics & Evaluator Deviation", () => {
  let db: KyselyDb;
  let evalRepo: KyselyEvaluationRepository;
  let rubricRepo: KyselyRubricRepository;
  let signalRepo: KyselyQualitySignalRepository;
  let triageRepo: KyselyTriageCaseRepository;
  let resolutionRepo: KyselyResolutionRepository;
  let auditRepo: KyselyAuditRepository;
  let unitOfWork: KyselyUnitOfWork;
  let analyticsService: QualityAnalyticsService;
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

    analyticsService = new QualityAnalyticsService(
      evalRepo,
      signalRepo,
      triageRepo,
      resolutionRepo
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
      analyticsService,
    });

    await server.ready();
  });

  afterEach(async () => {
    await server.close();
    await db.destroy();
  });

  /**
   * Helper to seed evaluations for a given evaluator.
   */
  async function seedEvaluations(
    evaluatorId: string,
    scores: number[],
    options?: {
      cycleId?: string;
      maxMarksPerQ?: number;
    }
  ): Promise<Evaluation[]> {
    const cycleId = options?.cycleId ?? "cycle-2026-autumn";
    const maxMarks = options?.maxMarksPerQ ?? 10;
    const created: Evaluation[] = [];

    for (let i = 0; i < scores.length; i++) {
      const q1Id = randomUUID();
      const q2Id = randomUUID();
      const evaluation = Evaluation.create({
        id: randomUUID(),
        examId: "exam-cs101",
        scriptId: `script-${evaluatorId}-${i}`,
        studentId: `student-${evaluatorId}-${i}`,
        evaluatorId,
        evaluationCycleId: cycleId,
        rubricId: "rubric-cs101-v1",
        rubricVersion: 1,
        questions: [
          { id: q1Id, questionNumber: "1", text: "Question 1", maxMarks, orderIndex: 0 },
          { id: q2Id, questionNumber: "2", text: "Question 2", maxMarks, orderIndex: 1 },
        ],
      });

      // Split the desired score across the two questions
      const halfScore = scores[i] / 2;
      evaluation.assignMark({
        questionId: q1Id,
        awardedMarks: halfScore,
        maxMarks,
        evaluatorId,
      });
      evaluation.assignMark({
        questionId: q2Id,
        awardedMarks: halfScore,
        maxMarks,
        evaluatorId,
      });

      await evalRepo.save(evaluation);
      created.push(evaluation);
    }

    return created;
  }

  describe("Domain & Calculation Engine: QualityAnalyticsService", () => {
    it("1. returns INSUFFICIENT_DATA when sample size is below minSampleSize", async () => {
      // Seed only 3 evaluations for evaluator-A and 3 for evaluator-B (below default threshold of 5)
      await seedEvaluations("evaluator-A", [10, 12, 14]);
      await seedEvaluations("evaluator-B", [18, 19, 20]);

      const metrics = await analyticsService.computeEvaluatorMetrics();

      expect(metrics).toHaveLength(2);
      const metricA = metrics.find((m) => m.evaluatorId === "evaluator-A");
      const metricB = metrics.find((m) => m.evaluatorId === "evaluator-B");

      expect(metricA?.status).toBe(EvaluatorDeviationStatus.INSUFFICIENT_DATA);
      expect(metricB?.status).toBe(EvaluatorDeviationStatus.INSUFFICIENT_DATA);
      expect(metricA?.evaluationCount).toBe(3);
      expect(metricB?.evaluationCount).toBe(3);
    });

    it("2. classifies evaluator as NORMAL when deviation is below 15%", async () => {
      // Total maxMarks = 20. 50% = 10/20, 52% = 10.4/20
      // Evaluator A scores around 50% (10/20)
      // Peer Evaluator B scores around 52% (10.4/20)
      await seedEvaluations("evaluator-A", [10, 10, 10, 10, 10]);
      await seedEvaluations("evaluator-B", [10.4, 10.4, 10.4, 10.4, 10.4]);

      const metrics = await analyticsService.computeEvaluatorMetrics();
      const metricA = metrics.find((m) => m.evaluatorId === "evaluator-A");

      expect(metricA?.status).toBe(EvaluatorDeviationStatus.NORMAL);
      expect(metricA?.evaluatorMeanPercentage).toBe(50);
      expect(metricA?.peerMeanPercentage).toBe(52);
      expect(metricA?.deviationPercentage).toBe(2);
    });

    it("3. classifies evaluator as MODERATE_DEVIATION when deviation is between 15% and 25%", async () => {
      // Peer evaluator B gives 50% (10/20)
      // Evaluator A gives 68% (13.6/20) -> deviation = 18% (MODERATE)
      await seedEvaluations("evaluator-A", [13.6, 13.6, 13.6, 13.6, 13.6]);
      await seedEvaluations("evaluator-B", [10, 10, 10, 10, 10]);

      const metrics = await analyticsService.computeEvaluatorMetrics();
      const metricA = metrics.find((m) => m.evaluatorId === "evaluator-A");

      expect(metricA?.status).toBe(EvaluatorDeviationStatus.MODERATE_DEVIATION);
      expect(metricA?.deviationPercentage).toBe(18);
    });

    it("4. classifies evaluator as CRITICAL_DEVIATION when deviation is 25% or greater", async () => {
      // Peer evaluator B gives 50% (10/20)
      // Evaluator A gives 80% (16/20) -> deviation = 30% (CRITICAL)
      await seedEvaluations("evaluator-A", [16, 16, 16, 16, 16]);
      await seedEvaluations("evaluator-B", [10, 10, 10, 10, 10]);

      const metrics = await analyticsService.computeEvaluatorMetrics();
      const metricA = metrics.find((m) => m.evaluatorId === "evaluator-A");

      expect(metricA?.status).toBe(EvaluatorDeviationStatus.CRITICAL_DEVIATION);
      expect(metricA?.deviationPercentage).toBe(30);
    });

    it("5. calculates population standard deviation correctly", async () => {
      // Evaluator A has variable scores: [10, 12, 14, 16, 18], mean = 14
      // Variances from 14: 16, 4, 0, 4, 16; mean variance = 40/5 = 8; stdDev = sqrt(8) ≈ 2.83
      await seedEvaluations("evaluator-A", [10, 12, 14, 16, 18]);
      await seedEvaluations("evaluator-B", [14, 14, 14, 14, 14]);

      const metrics = await analyticsService.computeEvaluatorMetrics();
      const metricA = metrics.find((m) => m.evaluatorId === "evaluator-A");

      expect(metricA?.evaluatorMeanScore).toBe(14);
      expect(metricA?.standardDeviation).toBe(14.14);
    });

    it("6. computes question performance metrics across cohort", async () => {
      await seedEvaluations("evaluator-A", [12, 14, 16, 18, 20]);

      const questionMetrics = await analyticsService.computeQuestionMetrics();

      expect(questionMetrics).toHaveLength(2);
      expect(questionMetrics[0].questionNumber).toBe("1");
      expect(questionMetrics[0].maxMarks).toBe(10);
      expect(questionMetrics[0].evaluationsCount).toBe(5);
      expect(questionMetrics[0].missingMarksCount).toBe(0);
      expect(questionMetrics[1].questionNumber).toBe("2");
    });

    it("7. respects evaluationCycleId cohort boundary filter", async () => {
      await seedEvaluations("evaluator-A", [10, 10, 10, 10, 10], { cycleId: "cycle-fall-2025" });
      await seedEvaluations("evaluator-B", [15, 15, 15, 15, 15], { cycleId: "cycle-spring-2026" });

      const fallMetrics = await analyticsService.computeEvaluatorMetrics({
        evaluationCycleId: "cycle-fall-2025",
      });

      expect(fallMetrics).toHaveLength(1);
      expect(fallMetrics[0].evaluatorId).toBe("evaluator-A");

      const springMetrics = await analyticsService.computeEvaluatorMetrics({
        evaluationCycleId: "cycle-spring-2026",
      });

      expect(springMetrics).toHaveLength(1);
      expect(springMetrics[0].evaluatorId).toBe("evaluator-B");
    });

    it("8. aggregates quality signals and moderation workload distributions accurately", async () => {
      const evalsA = await seedEvaluations("evaluator-A", [10, 10, 10, 10, 10]);
      await seedEvaluations("evaluator-B", [12, 12, 12, 12, 12]);

      // Seed a quality signal linked to evaluation 0
      const signal = QualitySignal.create({
        id: randomUUID(),
        evaluationId: evalsA[0].id,
        evaluationVersion: 1,
        signalType: "UNCHECKED_ANSWER",
        severity: SignalSeverity.HIGH,
        summary: "Potential unchecked response page 3",
        evidence: { pageNumber: 3 },
        detector: {
          type: "DETERMINISTIC",
          name: "UncheckedAnswerDetector",
          version: "1.0.0",
        },
      });
      await signalRepo.save(signal);

      // Seed a triage case
      const triageCase = TriageCase.create({
        id: randomUUID(),
        evaluationId: evalsA[0].id,
        evaluationCycleId: "cycle-2026-autumn",
        qualitySignalId: signal.id,
      });
      await triageRepo.save(triageCase);

      const summary = await analyticsService.computeQualityAnalytics();

      expect(summary.totalEvaluations).toBe(10);
      expect(summary.totalEvaluators).toBe(2);
      expect(summary.signalsSummary.total).toBe(1);
      expect(summary.signalsSummary.bySeverity[SignalSeverity.HIGH]).toBe(1);
      expect(summary.signalsSummary.byDetector["UncheckedAnswerDetector"]).toBe(1);
      expect(summary.moderationSummary.totalCases).toBe(1);
      expect(summary.moderationSummary.openCases).toBe(1);
    });

    it("9. proves deterministic reproducibility across 50 iterations (09-testing §40)", async () => {
      await seedEvaluations("evaluator-A", [10, 12, 14, 16, 18]);
      await seedEvaluations("evaluator-B", [15, 15, 15, 15, 15]);

      const baseline = await analyticsService.computeQualityAnalytics();

      for (let i = 0; i < 50; i++) {
        const result = await analyticsService.computeQualityAnalytics();
        expect(result.meanCohortScore).toBe(baseline.meanCohortScore);
        expect(result.meanCohortPercentage).toBe(baseline.meanCohortPercentage);
        expect(result.evaluatorMetrics).toEqual(baseline.evaluatorMetrics);
        expect(result.questionMetrics).toEqual(baseline.questionMetrics);
      }
    });

    it("10. preserves read-only immutability of evaluations, marks, and audit logs (INV-003, INV-004)", async () => {
      const evals = await seedEvaluations("evaluator-A", [10, 12, 14, 16, 18]);
      const initialVersion = evals[0].version;
      const initialScore = evals[0].totalScore;

      // Execute analytics multiple times
      await analyticsService.computeQualityAnalytics();
      await analyticsService.computeEvaluatorMetrics();
      await analyticsService.computeQuestionMetrics();

      // Verify evaluation was never mutated
      const reloaded = await evalRepo.findById(evals[0].id);
      expect(reloaded).not.toBeNull();
      expect(reloaded!.version).toBe(initialVersion);
      expect(reloaded!.totalScore).toBe(initialScore);

      // Verify no audit events were created for read-only analytics
      const auditEvents = await auditRepo.findAll();
      expect(auditEvents).toHaveLength(0);
    });
  });

  describe("Presentation Layer: Fastify HTTP Analytics Endpoints", () => {
    beforeEach(async () => {
      await seedEvaluations("evaluator-A", [10, 12, 14, 16, 18]);
      await seedEvaluations("evaluator-B", [15, 15, 15, 15, 15]);
    });

    it("11. GET /api/v1/analytics/evaluators returns 200 for MODERATOR role", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/api/v1/analytics/evaluators",
        headers: {
          "x-actor-type": ActorType.USER,
          "x-user-role": UserRole.MODERATOR,
        },
      });

      expect(response.statusCode).toBe(200);
      const json = JSON.parse(response.payload);
      expect(Array.isArray(json)).toBe(true);
      expect(json).toHaveLength(2);

      // Verify schema adherence
      for (const item of json) {
        expect(() => EvaluatorDeviationMetricSchema.parse(item)).not.toThrow();
      }
    });

    it("12. GET /api/v1/analytics/evaluators returns 200 for ADMIN role", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/api/v1/analytics/evaluators",
        headers: {
          "x-actor-type": ActorType.USER,
          "x-user-role": UserRole.ADMIN,
        },
      });

      expect(response.statusCode).toBe(200);
      const json = JSON.parse(response.payload);
      expect(json).toHaveLength(2);
    });

    it("13. GET /api/v1/analytics/evaluators returns 403 Forbidden for EXAMINER role", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/api/v1/analytics/evaluators",
        headers: {
          "x-actor-type": ActorType.USER,
          "x-user-role": UserRole.EXAMINER,
        },
      });

      expect(response.statusCode).toBe(403);
      const json = JSON.parse(response.payload);
      expect(json.error).toBe("UnauthorizedActionError");
      expect(json.code).toBe("UNAUTHORIZED_ACTION");
    });

    it("14. GET /api/v1/analytics/evaluators returns 403 Forbidden for AI actor", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/api/v1/analytics/evaluators",
        headers: {
          "x-actor-type": ActorType.AI,
          "x-user-role": UserRole.MODERATOR,
        },
      });

      expect(response.statusCode).toBe(403);
      const json = JSON.parse(response.payload);
      expect(json.error).toBe("UnauthorizedActionError");
    });

    it("15. GET /api/v1/analytics/evaluators?evaluatorId=... filters single evaluator", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/api/v1/analytics/evaluators?evaluatorId=evaluator-A",
        headers: {
          "x-actor-type": ActorType.USER,
          "x-user-role": UserRole.MODERATOR,
        },
      });

      expect(response.statusCode).toBe(200);
      const json = JSON.parse(response.payload);
      expect(json).toHaveLength(1);
      expect(json[0].evaluatorId).toBe("evaluator-A");
    });

    it("16. GET /api/v1/analytics/evaluators/:evaluatorId returns 200 for existing evaluator", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/api/v1/analytics/evaluators/evaluator-B",
        headers: {
          "x-actor-type": ActorType.USER,
          "x-user-role": UserRole.MODERATOR,
        },
      });

      expect(response.statusCode).toBe(200);
      const json = JSON.parse(response.payload);
      expect(json.evaluatorId).toBe("evaluator-B");
      expect(() => EvaluatorDeviationMetricSchema.parse(json)).not.toThrow();
    });

    it("17. GET /api/v1/analytics/evaluators/:evaluatorId returns 404 for unknown evaluator", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/api/v1/analytics/evaluators/non-existent-evaluator",
        headers: {
          "x-actor-type": ActorType.USER,
          "x-user-role": UserRole.MODERATOR,
        },
      });

      expect(response.statusCode).toBe(404);
      const json = JSON.parse(response.payload);
      expect(json.error).toBe("EntityNotFoundError");
    });

    it("18. GET /api/v1/analytics/summary returns 200 with full QualityAnalyticsSummary", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/api/v1/analytics/summary",
        headers: {
          "x-actor-type": ActorType.USER,
          "x-user-role": UserRole.MODERATOR,
        },
      });

      expect(response.statusCode).toBe(200);
      const json = JSON.parse(response.payload);
      expect(() => QualityAnalyticsSummarySchema.parse(json)).not.toThrow();
      expect(json.totalEvaluations).toBe(10);
      expect(json.totalEvaluators).toBe(2);
      expect(json.evaluatorMetrics).toHaveLength(2);
      expect(json.questionMetrics).toHaveLength(2);
    });

    it("19. POST /api/v1/analytics/evaluators is rejected with 404 Not Found (read-only resource)", async () => {
      const response = await server.inject({
        method: "POST",
        url: "/api/v1/analytics/evaluators",
        headers: {
          "x-actor-type": ActorType.USER,
          "x-user-role": UserRole.ADMIN,
        },
        payload: { dummy: "data" },
      });

      expect(response.statusCode).toBe(404);
    });

    it("20. DELETE /api/v1/analytics/summary is rejected with 404 Not Found (read-only resource)", async () => {
      const response = await server.inject({
        method: "DELETE",
        url: "/api/v1/analytics/summary",
        headers: {
          "x-actor-type": ActorType.USER,
          "x-user-role": UserRole.ADMIN,
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });
});
