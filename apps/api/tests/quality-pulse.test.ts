/**
 * QualityPulse & SentinelFlag Verification Test Suite (TASK-P8-ANALYTICS-002).
 *
 * Conforms to:
 * - docs/contracts/01-product-contract.md §15 (QualityPulse overview & drill-down)
 * - docs/contracts/01-product-contract.md §16 (SentinelFlag statistical signals)
 * - docs/contracts/02-architecture-contract.md §12, §31, §61 (Analytics & Read Models)
 * - docs/contracts/05-domain-contract.md §37, AP-DOM-004, INV-004 (Analytics Invariants)
 * - docs/contracts/06-api-contract.md §12, §21, §41-45 (Analytics & QualityPulse endpoints)
 * - docs/contracts/08-data-contract.md §4.2, §53 (Derived data & immutability)
 * - docs/contracts/09-testing-contract.md §40 (Analytics reproducibility & test strategy)
 * - docs/planning/03-build-roadmap.md §15 (Phase 8 — Analytics & Insights)
 *
 * Invariants Verified:
 * - INV-004: Analytics and SentinelFlag are derived statistical observations, never authoritative academic state.
 * - INV-003: Pure read-only computation; zero mutations on marks, scores, versions, or evaluations.
 * - Minimum sample size guards: prevents ungrounded inferences on small cohorts.
 * - SentinelFlag Idempotency: repeated triggers do not duplicate active statistical signals.
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
import {
  Evaluation,
  Rubric,
  QualitySignal,
  QualitySignalStatus,
  SignalSeverity,
  TriageCase,
  Resolution,
} from "../src/domain/index.js";
import {
  QualityAnalyticsService,
  QualityPulseService,
} from "../src/application/analytics/index.js";
import { createServer } from "../src/presentation/server.js";
import {
  EvaluationStatus,
  ResolutionOutcome,
  QualityRiskLevel,
  QualityHotspotType,
  QualityPulseOverviewSchema,
  QualityHotspotSchema,
  TriggerSentinelResponseSchema,
  EvaluatorDeviationStatus,
  UserRole,
  ActorType,
} from "@osm/shared";

describe("TASK-P8-ANALYTICS-002: QualityPulse & SentinelFlag", () => {
  let db: KyselyDb;
  let evalRepo: KyselyEvaluationRepository;
  let rubricRepo: KyselyRubricRepository;
  let signalRepo: KyselyQualitySignalRepository;
  let triageRepo: KyselyTriageCaseRepository;
  let resolutionRepo: KyselyResolutionRepository;
  let auditRepo: KyselyAuditRepository;
  let analyticsService: QualityAnalyticsService;
  let qualityPulseService: QualityPulseService;
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

    analyticsService = new QualityAnalyticsService(
      evalRepo,
      signalRepo,
      triageRepo,
      resolutionRepo
    );

    qualityPulseService = new QualityPulseService(
      evalRepo,
      signalRepo,
      triageRepo,
      resolutionRepo,
      analyticsService
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
      qualityPulseService,
    });

    await server.ready();
  });

  afterEach(async () => {
    await server.close();
    await db.destroy();
  });

  /**
   * Helper to seed evaluations for a given evaluator with specified scores.
   */
  async function seedEvaluations(
    evaluatorId: string,
    scores: number[],
    options?: {
      cycleId?: string;
      maxMarksPerQ?: number;
      status?: EvaluationStatus;
    }
  ): Promise<Evaluation[]> {
    const cycleId = options?.cycleId ?? "cycle-2026-autumn";
    const maxMarks = options?.maxMarksPerQ ?? 10;
    const status = options?.status ?? EvaluationStatus.SUBMITTED;
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

      if (status === EvaluationStatus.SUBMITTED || status === EvaluationStatus.FINALIZED) {
        evaluation.submit();
      }

      await evalRepo.save(evaluation);
      created.push(evaluation);
    }

    return created;
  }

  describe("Domain & Service Layer: QualityPulseService", () => {
    it("1. getQualityPulse returns valid overview with zero state for empty repository", async () => {
      const pulse = await qualityPulseService.getQualityPulse();

      expect(() => QualityPulseOverviewSchema.parse(pulse)).not.toThrow();
      expect(pulse.progress.total).toBe(0);
      expect(pulse.progress.submitted).toBe(0);
      expect(pulse.progress.inProgress).toBe(0);
      expect(pulse.progress.completionPercentage).toBe(0);
      expect(pulse.health.healthIndex).toBe(100);
      expect(pulse.health.riskLevel).toBe(QualityRiskLevel.LOW);
      expect(pulse.signalsOverview.total).toBe(0);
      expect(pulse.moderationOverview.totalCases).toBe(0);
      expect(pulse.evaluatorDeviations.totalEvaluators).toBe(0);
      expect(pulse.topHotspots).toEqual([]);
    });

    it("2. getQualityPulse calculates progress metrics accurately", async () => {
      // 5 submitted, 3 in progress
      await seedEvaluations("evaluator-A", [10, 10, 10, 10, 10], {
        status: EvaluationStatus.SUBMITTED,
      });
      await seedEvaluations("evaluator-A", [10, 10, 10], {
        status: EvaluationStatus.IN_PROGRESS,
      });

      const pulse = await qualityPulseService.getQualityPulse();

      expect(pulse.progress.total).toBe(8);
      expect(pulse.progress.submitted).toBe(5);
      expect(pulse.progress.inProgress).toBe(3);
      expect(pulse.progress.completionPercentage).toBe(62.5);
    });

    it("3. getQualityPulse calculates cohort quality health index and sets risk level LOW when healthy", async () => {
      // 10 completed evaluations, no signals
      await seedEvaluations("evaluator-A", [10, 10, 10, 10, 10]);
      await seedEvaluations("evaluator-B", [10, 10, 10, 10, 10]);

      const pulse = await qualityPulseService.getQualityPulse();

      expect(pulse.health.healthIndex).toBe(100);
      expect(pulse.health.riskLevel).toBe(QualityRiskLevel.LOW);
      expect(pulse.health.evaluationsWithSignalsCount).toBe(0);
    });

    it("4. getQualityPulse sets risk level CRITICAL when active critical signals exist", async () => {
      const evals = await seedEvaluations("evaluator-A", [10, 10, 10, 10, 10]);

      // Add a critical signal on the first evaluation
      const signal = QualitySignal.create({
        id: randomUUID(),
        evaluationId: evals[0].id,
        evaluationVersion: evals[0].version,
        severity: SignalSeverity.CRITICAL,
        signalType: "DETECTOR_EVALUATOR_ANOMALY",
        summary: "Severe deviation detected",
        detector: {
          type: "STATISTICAL" as any,
          name: "EvaluatorMeanDeviationDetector",
          version: "1.0.0",
        },
      });
      await signalRepo.save(signal);

      const pulse = await qualityPulseService.getQualityPulse();

      expect(pulse.health.riskLevel).toBe(QualityRiskLevel.CRITICAL);
      expect(pulse.signalsOverview.bySeverity.CRITICAL).toBe(1);
      expect(pulse.health.evaluationsWithSignalsCount).toBe(1);
    });

    it("5. getQualityPulse sets risk level HIGH when active moderate deviations exist", async () => {
      // Evaluator A gives 68% (13.6/20), Evaluator B gives 50% (10/20), Evaluator C gives 50% (10/20)
      // Peer baseline for A = 50% -> dev = 18% (MODERATE)
      // Peer baseline for B = 59% -> dev = 9% (NORMAL)
      // Peer baseline for C = 59% -> dev = 9% (NORMAL)
      await seedEvaluations("evaluator-A", [13.6, 13.6, 13.6, 13.6, 13.6]);
      await seedEvaluations("evaluator-B", [10, 10, 10, 10, 10]);
      await seedEvaluations("evaluator-C", [10, 10, 10, 10, 10]);

      const pulse = await qualityPulseService.getQualityPulse();

      expect(pulse.health.riskLevel).toBe(QualityRiskLevel.HIGH);
      expect(pulse.evaluatorDeviations.moderateDeviationCount).toBe(1);
    });

    it("6. getQualityPulse sets risk level MEDIUM when active warning signals exist", async () => {
      const evals = await seedEvaluations("evaluator-A", [10, 10, 10, 10, 10]);

      // Add a medium signal
      const signal = QualitySignal.create({
        id: randomUUID(),
        evaluationId: evals[0].id,
        evaluationVersion: evals[0].version,
        severity: SignalSeverity.MEDIUM,
        signalType: "DETECTOR_RUBRIC_DISCREPANCY",
        summary: "Slight discrepancy detected",
        detector: {
          type: "STATISTICAL" as any,
          name: "RubricDiscrepancyDetector",
          version: "1.0.0",
        },
      });
      await signalRepo.save(signal);

      const pulse = await qualityPulseService.getQualityPulse();

      expect(pulse.health.riskLevel).toBe(QualityRiskLevel.MEDIUM);
      expect(pulse.signalsOverview.bySeverity.MEDIUM).toBe(1);
    });

    it("7. getQualityPulse accurately calculates signal counts and statuses", async () => {
      const evals = await seedEvaluations("evaluator-A", [10, 10, 10, 10, 10]);

      const s1 = QualitySignal.create({
        id: randomUUID(),
        evaluationId: evals[0].id,
        evaluationVersion: evals[0].version,
        severity: SignalSeverity.CRITICAL,
        signalType: "TEST_DETECTOR",
        summary: "Critical",
        detector: { type: "STATISTICAL" as any, name: "TestDetector", version: "1.0.0" },
      });
      const s2 = QualitySignal.create({
        id: randomUUID(),
        evaluationId: evals[1].id,
        evaluationVersion: evals[1].version,
        severity: SignalSeverity.MEDIUM,
        signalType: "TEST_DETECTOR",
        summary: "Warning",
        detector: { type: "STATISTICAL" as any, name: "TestDetector", version: "1.0.0" },
      });
      const s3 = QualitySignal.create({
        id: randomUUID(),
        evaluationId: evals[2].id,
        evaluationVersion: evals[2].version,
        severity: SignalSeverity.INFO,
        signalType: "TEST_DETECTOR",
        summary: "Info",
        detector: { type: "STATISTICAL" as any, name: "TestDetector", version: "1.0.0" },
      });

      // Resolve s3
      s3.resolve("user-moderator", "Reviewed and cleared");

      await signalRepo.save(s1);
      await signalRepo.save(s2);
      await signalRepo.save(s3);

      const pulse = await qualityPulseService.getQualityPulse();

      expect(pulse.signalsOverview.total).toBe(3);
      expect(pulse.signalsOverview.bySeverity.CRITICAL).toBe(1);
      expect(pulse.signalsOverview.bySeverity.MEDIUM).toBe(1);
      expect(pulse.signalsOverview.bySeverity.INFO).toBe(1);
      expect(pulse.signalsOverview.openReviewable).toBe(2);
      expect(pulse.signalsOverview.resolved).toBe(1);
    });

    it("8. getQualityPulse accurately tracks moderation triage cases and resolution rate", async () => {
      const evals = await seedEvaluations("evaluator-A", [10, 10, 10, 10, 10]);

      const sig1 = QualitySignal.create({
        id: randomUUID(),
        evaluationId: evals[0].id,
        evaluationVersion: evals[0].version,
        severity: SignalSeverity.MEDIUM,
        signalType: "TEST_SIGNAL",
        summary: "Signal for triage 1",
        detector: { type: "STATISTICAL" as any, name: "TestDetector", version: "1.0.0" },
      });
      const sig2 = QualitySignal.create({
        id: randomUUID(),
        evaluationId: evals[1].id,
        evaluationVersion: evals[1].version,
        severity: SignalSeverity.MEDIUM,
        signalType: "TEST_SIGNAL",
        summary: "Signal for triage 2",
        detector: { type: "STATISTICAL" as any, name: "TestDetector", version: "1.0.0" },
      });
      await signalRepo.save(sig1);
      await signalRepo.save(sig2);

      const case1 = TriageCase.create({
        id: randomUUID(),
        evaluationId: evals[0].id,
        evaluationCycleId: "cycle-2026-autumn",
        qualitySignalId: sig1.id,
        notes: "Test trigger",
      });
      const case2 = TriageCase.create({
        id: randomUUID(),
        evaluationId: evals[1].id,
        evaluationCycleId: "cycle-2026-autumn",
        qualitySignalId: sig2.id,
        notes: "Test trigger 2",
      });

      const res1 = Resolution.create({
        id: randomUUID(),
        triageCaseId: case1.id,
        evaluationId: evals[0].id,
        outcome: ResolutionOutcome.CONFIRMED_VALID,
        reason: "Approved after review",
        moderatorId: "mod-1",
      });

      case1.resolve(ResolutionOutcome.CONFIRMED_VALID, "Approved after review", "mod-1");

      await triageRepo.save(case1);
      await triageRepo.save(case2);
      await resolutionRepo.save(res1);

      const pulse = await qualityPulseService.getQualityPulse();

      expect(pulse.moderationOverview.totalCases).toBe(2);
      expect(pulse.moderationOverview.resolvedCases).toBe(1);
      expect(pulse.moderationOverview.openCases).toBe(1);
      expect(pulse.moderationOverview.resolutionRate).toBe(50);
    });

    it("9. getQualityPulse accurately summarizes evaluator deviation distribution", async () => {
      // Evaluator A: normal (10/20 vs 10.4/20 = 2% diff)
      await seedEvaluations("evaluator-A", [10, 10, 10, 10, 10]);
      // Evaluator B: normal (10.4/20)
      await seedEvaluations("evaluator-B", [10.4, 10.4, 10.4, 10.4, 10.4]);
      // Evaluator C: insufficient data (only 2 evaluations)
      await seedEvaluations("evaluator-C", [15, 15]);

      const pulse = await qualityPulseService.getQualityPulse();

      expect(pulse.evaluatorDeviations.totalEvaluators).toBe(3);
      expect(pulse.evaluatorDeviations.normalCount).toBe(2);
      expect(pulse.evaluatorDeviations.moderateDeviationCount).toBe(0);
      expect(pulse.evaluatorDeviations.criticalDeviationCount).toBe(0);
      expect(pulse.evaluatorDeviations.insufficientDataCount).toBe(1);
    });

    it("10. getHotspots discovers EVALUATOR_ANOMALY with detailed evidence", async () => {
      // Peer evaluator B gives 50% (10/20)
      // Evaluator A gives 80% (16/20) -> deviation = 30% (CRITICAL_DEVIATION)
      await seedEvaluations("evaluator-A", [16, 16, 16, 16, 16]);
      await seedEvaluations("evaluator-B", [10, 10, 10, 10, 10]);

      const hotspots = await qualityPulseService.getHotspots();

      expect(hotspots.length).toBeGreaterThan(0);
      const evalHotspot = hotspots.find(
        (h) => h.hotspotType === QualityHotspotType.EVALUATOR_ANOMALY && h.targetId === "evaluator-A"
      );
      expect(evalHotspot).toBeDefined();
      expect(evalHotspot?.severity).toBe(SignalSeverity.HIGH);
      expect(evalHotspot?.description).toContain("30% from peer baseline");
      expect(evalHotspot?.evidence.evaluatorMeanPercentage).toBe(80);
      expect(evalHotspot?.evidence.peerMeanPercentage).toBe(50);
    });

    it("11. getHotspots discovers SIGNAL_CONCENTRATION when multiple signals target an evaluation", async () => {
      const evals = await seedEvaluations("evaluator-A", [10, 10, 10, 10, 10]);

      // Seed 3 signals on evaluation 0
      for (let i = 0; i < 3; i++) {
        const s = QualitySignal.create({
          id: randomUUID(),
          evaluationId: evals[0].id,
          evaluationVersion: evals[0].version,
          severity: SignalSeverity.MEDIUM,
          signalType: `TEST_DETECTOR_${i}`,
          summary: `Signal concentration test ${i}`,
          detector: { type: "STATISTICAL" as any, name: `TestDetector${i}`, version: "1.0.0" },
        });
        await signalRepo.save(s);
      }

      const hotspots = await qualityPulseService.getHotspots();

      const concHotspot = hotspots.find(
        (h) => h.hotspotType === QualityHotspotType.SIGNAL_CONCENTRATION && h.targetId === evals[0].id
      );
      expect(concHotspot).toBeDefined();
      expect(concHotspot?.severity).toBe(SignalSeverity.HIGH);
      expect(concHotspot?.evidence.signalCount).toBe(3);
    });

    it("12. triggerSentinel detects critical evaluator deviation and materializes QualitySignal", async () => {
      // Evaluator A: 80% (16/20), Evaluator B: 50% (10/20), Evaluator C: 50% (10/20)
      const evalsA = await seedEvaluations("evaluator-A", [16, 16, 16, 16, 16]);
      await seedEvaluations("evaluator-B", [10, 10, 10, 10, 10]);
      await seedEvaluations("evaluator-C", [10, 10, 10, 10, 10]);

      const triggerResult = await qualityPulseService.triggerSentinel({
        evaluationCycleId: "cycle-2026-autumn",
      });

      expect(() => TriggerSentinelResponseSchema.parse(triggerResult)).not.toThrow();
      expect(triggerResult.evaluatorsAnalyzed).toBe(3);
      expect(triggerResult.anomaliesDetected).toBeGreaterThanOrEqual(1);
      expect(triggerResult.newSignalsGenerated).toBeGreaterThanOrEqual(1);
      expect(triggerResult.evaluationCycleId).toBe("cycle-2026-autumn");

      // Verify that the signal was materialized in the repository for Evaluator A
      const signals = await signalRepo.findAll();
      const evalsAIds = new Set(evalsA.map((e) => e.id));
      const sentinelSignal = signals.find((s) => evalsAIds.has(s.evaluationId));
      expect(sentinelSignal).toBeDefined();
      expect(sentinelSignal?.severity).toBe(SignalSeverity.HIGH);
      expect(sentinelSignal?.status).toBe(QualitySignalStatus.REVIEWABLE);
    });

    it("13. triggerSentinel detects moderate deviation and materializes MEDIUM QualitySignal", async () => {
      // Evaluator A gives 68% (13.6/20), Evaluator B gives 50% (10/20), Evaluator C gives 50% (10/20)
      const evalsA = await seedEvaluations("evaluator-A", [13.6, 13.6, 13.6, 13.6, 13.6]);
      await seedEvaluations("evaluator-B", [10, 10, 10, 10, 10]);
      await seedEvaluations("evaluator-C", [10, 10, 10, 10, 10]);

      const triggerResult = await qualityPulseService.triggerSentinel({
        evaluationCycleId: "cycle-2026-autumn",
      });

      expect(triggerResult.anomaliesDetected).toBe(1);
      expect(triggerResult.newSignalsGenerated).toBe(1);

      const signals = await signalRepo.findAll();
      const sentinelSignal = signals.find((s) => s.signalType === "STATISTICAL_EVALUATOR_DEVIATION");
      expect(sentinelSignal?.severity).toBe(SignalSeverity.MEDIUM);
    });

    it("14. triggerSentinel does NOT materialize signals for NORMAL evaluators", async () => {
      await seedEvaluations("evaluator-A", [10, 10, 10, 10, 10]);
      await seedEvaluations("evaluator-B", [10.4, 10.4, 10.4, 10.4, 10.4]);

      const triggerResult = await qualityPulseService.triggerSentinel();

      expect(triggerResult.evaluatorsAnalyzed).toBe(2);
      expect(triggerResult.anomaliesDetected).toBe(0);
      expect(triggerResult.newSignalsGenerated).toBe(0);
    });

    it("15. triggerSentinel does NOT materialize signals when sample size is insufficient", async () => {
      await seedEvaluations("evaluator-A", [18, 18, 18]); // 3 is below minSampleSize 5
      await seedEvaluations("evaluator-B", [10, 10, 10]);

      const triggerResult = await qualityPulseService.triggerSentinel();

      expect(triggerResult.anomaliesDetected).toBe(0);
      expect(triggerResult.newSignalsGenerated).toBe(0);
    });

    it("16. triggerSentinel is idempotent: repeated triggers do NOT duplicate active signals", async () => {
      await seedEvaluations("evaluator-A", [16, 16, 16, 16, 16]);
      await seedEvaluations("evaluator-B", [10, 10, 10, 10, 10]);

      // First run: creates signals
      const run1 = await qualityPulseService.triggerSentinel();
      expect(run1.newSignalsGenerated).toBeGreaterThan(0);

      // Second run: recognizes existing active signal, creates 0 signals
      const run2 = await qualityPulseService.triggerSentinel();
      expect(run2.anomaliesDetected).toBe(run1.anomaliesDetected);
      expect(run2.newSignalsGenerated).toBe(0);
    });

    it("17. Statistical observation vs academic decision (INV-004): SentinelFlag creates review trigger without mutating marks", async () => {
      const evalsA = await seedEvaluations("evaluator-A", [16, 16, 16, 16, 16]);
      await seedEvaluations("evaluator-B", [10, 10, 10, 10, 10]);

      const initialEvaluation = await evalRepo.findById(evalsA[0].id);
      expect(initialEvaluation?.totalScore).toBe(16);

      // Trigger sentinel
      await qualityPulseService.triggerSentinel();

      // Verify that the evaluation is completely untouched in score, marks, and status
      const postEvaluation = await evalRepo.findById(evalsA[0].id);
      expect(postEvaluation?.totalScore).toBe(16);
      expect(postEvaluation?.getAllMarks()).toHaveLength(2);
      expect(postEvaluation?.status).toBe(EvaluationStatus.SUBMITTED);
    });

    it("18. Invariance & Pure Non-Mutation (INV-003): getQualityPulse and getHotspots perform zero mutations", async () => {
      const evals = await seedEvaluations("evaluator-A", [14, 14, 14, 14, 14]);
      await seedEvaluations("evaluator-B", [10, 10, 10, 10, 10]);

      const beforeEvals = await evalRepo.findByEvaluatorId("evaluator-A");
      const beforeMarks = beforeEvals.map((e) => ({
        id: e.id,
        total: e.totalScore,
        marks: e.getAllMarks().map((m) => m.awardedMarks),
      }));

      // Execute read-only analytical queries
      await qualityPulseService.getQualityPulse();
      await qualityPulseService.getHotspots();

      const afterEvals = await evalRepo.findByEvaluatorId("evaluator-A");
      const afterMarks = afterEvals.map((e) => ({
        id: e.id,
        total: e.totalScore,
        marks: e.getAllMarks().map((m) => m.awardedMarks),
      }));

      expect(afterMarks).toEqual(beforeMarks);
    });

    it("19. Deterministic reproducibility (09-testing §40): 50 repetitions produce identical results", async () => {
      await seedEvaluations("evaluator-A", [15, 15, 15, 15, 15]);
      await seedEvaluations("evaluator-B", [10, 10, 10, 10, 10]);

      const firstPulse = await qualityPulseService.getQualityPulse();
      const firstHotspots = await qualityPulseService.getHotspots();

      const { generatedAt: _t1, ...firstPulseStatic } = firstPulse;

      for (let i = 0; i < 50; i++) {
        const pulse = await qualityPulseService.getQualityPulse();
        const hotspots = await qualityPulseService.getHotspots();
        const { generatedAt: _t, ...pulseStatic } = pulse;

        expect(pulseStatic).toEqual(firstPulseStatic);
        expect(hotspots).toEqual(firstHotspots);
      }
    });
  });

  describe("Presentation / HTTP API Layer & Authorization", () => {
    beforeEach(async () => {
      await seedEvaluations("evaluator-A", [16, 16, 16, 16, 16]);
      await seedEvaluations("evaluator-B", [10, 10, 10, 10, 10]);
    });

    it("20. GET /api/v1/analytics/quality-pulse returns 200 for MODERATOR role and adheres to schema", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/api/v1/analytics/quality-pulse",
        headers: {
          "x-actor-type": ActorType.USER,
          "x-user-role": UserRole.MODERATOR,
        },
      });

      expect(response.statusCode).toBe(200);
      const json = JSON.parse(response.payload);
      expect(() => QualityPulseOverviewSchema.parse(json)).not.toThrow();
      expect(json.progress.total).toBe(10);
      expect(json.progress.submitted).toBe(10);
      expect(json.evaluatorDeviations.totalEvaluators).toBe(2);
    });

    it("21. GET /api/v1/analytics/quality-pulse returns 200 for ADMIN role", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/api/v1/analytics/quality-pulse",
        headers: {
          "x-actor-type": ActorType.USER,
          "x-user-role": UserRole.ADMIN,
        },
      });

      expect(response.statusCode).toBe(200);
      const json = JSON.parse(response.payload);
      expect(json.progress.total).toBe(10);
    });

    it("22. GET /api/v1/analytics/quality-pulse returns 403 Forbidden for EXAMINER role", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/api/v1/analytics/quality-pulse",
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

    it("23. GET /api/v1/analytics/quality-pulse returns 403 Forbidden for AI actor", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/api/v1/analytics/quality-pulse",
        headers: {
          "x-actor-type": ActorType.AI,
          "x-user-role": UserRole.MODERATOR,
        },
      });

      expect(response.statusCode).toBe(403);
      const json = JSON.parse(response.payload);
      expect(json.error).toBe("UnauthorizedActionError");
    });

    it("24. GET /api/v1/analytics/quality-pulse/hotspots returns 200 for MODERATOR and matches schema", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/api/v1/analytics/quality-pulse/hotspots",
        headers: {
          "x-actor-type": ActorType.USER,
          "x-user-role": UserRole.MODERATOR,
        },
      });

      expect(response.statusCode).toBe(200);
      const json = JSON.parse(response.payload);
      expect(Array.isArray(json)).toBe(true);
      for (const item of json) {
        expect(() => QualityHotspotSchema.parse(item)).not.toThrow();
      }
    });

    it("25. GET /api/v1/analytics/quality-pulse/hotspots returns 403 Forbidden for EXAMINER and AI", async () => {
      const resExaminer = await server.inject({
        method: "GET",
        url: "/api/v1/analytics/quality-pulse/hotspots",
        headers: {
          "x-actor-type": ActorType.USER,
          "x-user-role": UserRole.EXAMINER,
        },
      });
      expect(resExaminer.statusCode).toBe(403);

      const resAi = await server.inject({
        method: "GET",
        url: "/api/v1/analytics/quality-pulse/hotspots",
        headers: {
          "x-actor-type": ActorType.AI,
          "x-user-role": UserRole.ADMIN,
        },
      });
      expect(resAi.statusCode).toBe(403);
    });

    it("26. POST /api/v1/analytics/quality-pulse/trigger-sentinel returns 200 and triggers detection", async () => {
      const response = await server.inject({
        method: "POST",
        url: "/api/v1/analytics/quality-pulse/trigger-sentinel",
        headers: {
          "x-actor-type": ActorType.USER,
          "x-user-role": UserRole.MODERATOR,
        },
        payload: {
          minSampleSize: 5,
        },
      });

      expect(response.statusCode).toBe(200);
      const json = JSON.parse(response.payload);
      expect(() => TriggerSentinelResponseSchema.parse(json)).not.toThrow();
      expect(json.evaluatorsAnalyzed).toBe(2);
      expect(json.anomaliesDetected).toBe(2);
      expect(json.newSignalsGenerated).toBe(2);
    });

    it("27. POST /api/v1/analytics/quality-pulse/trigger-sentinel returns 403 Forbidden for EXAMINER", async () => {
      const response = await server.inject({
        method: "POST",
        url: "/api/v1/analytics/quality-pulse/trigger-sentinel",
        headers: {
          "x-actor-type": ActorType.USER,
          "x-user-role": UserRole.EXAMINER,
        },
        payload: {},
      });

      expect(response.statusCode).toBe(403);
      const json = JSON.parse(response.payload);
      expect(json.error).toBe("UnauthorizedActionError");
    });

    it("28. POST /api/v1/analytics/quality-pulse/trigger-sentinel returns 403 Forbidden for AI actor", async () => {
      const response = await server.inject({
        method: "POST",
        url: "/api/v1/analytics/quality-pulse/trigger-sentinel",
        headers: {
          "x-actor-type": ActorType.AI,
          "x-user-role": UserRole.ADMIN,
        },
        payload: {},
      });

      expect(response.statusCode).toBe(403);
      const json = JSON.parse(response.payload);
      expect(json.error).toBe("UnauthorizedActionError");
    });

    it("29. POST /api/v1/analytics/quality-pulse is rejected with 404 (read-only endpoint)", async () => {
      const response = await server.inject({
        method: "POST",
        url: "/api/v1/analytics/quality-pulse",
        headers: {
          "x-actor-type": ActorType.USER,
          "x-user-role": UserRole.ADMIN,
        },
        payload: { invalid: true },
      });

      expect(response.statusCode).toBe(404);
    });

    it("30. DELETE /api/v1/analytics/quality-pulse/hotspots is rejected with 404 (read-only endpoint)", async () => {
      const response = await server.inject({
        method: "DELETE",
        url: "/api/v1/analytics/quality-pulse/hotspots",
        headers: {
          "x-actor-type": ActorType.USER,
          "x-user-role": UserRole.ADMIN,
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });
});
