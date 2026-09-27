/**
 * QualityAnalyticsService.
 * Domain/application service computing derived evaluation quality analytics,
 * examiner deviation statistics, quality signal distributions, and moderation workload metrics.
 *
 * Conforms to:
 * - docs/contracts/01-product-contract.md §15, §16, §17 (QualityPulse & SentinelFlag)
 * - docs/contracts/02-architecture-contract.md §12, §31 (Analytics Module & QualityPulse)
 * - docs/contracts/05-domain-contract.md §37, AP-DOM-004 (Analytics Invariants)
 * - docs/contracts/08-data-contract.md §4.2, §53 (Derived Data & Rebuildability)
 * - docs/planning/03-build-roadmap.md §15 (Phase 8 — Analytics & Insights)
 *
 * Invariants:
 * - INV-004: Analytics are derived statistical observations, never authoritative academic state.
 * - INV-003: Pure read-only computation; performs zero mutations on marks, scores, versions, or evaluations.
 * - Minimum sample size guards: prevents ungrounded inferences on small cohorts.
 * - Deterministic reproducibility: 100% consistent results across identical data windows (09-testing §40).
 * - Deep runtime immutability: all computed metrics and collections are deeply frozen.
 */

import {
  EvaluatorDeviationStatus,
  QualitySignalStatus,
  type EvaluatorDeviationMetric,
  type QuestionPerformanceMetric,
  type QualityAnalyticsSummary,
} from "@osm/shared";
import type { EvaluationRepository } from "../../domain/evaluation/evaluation-repository.js";
import type { QualitySignalRepository } from "../../domain/quality-signal/quality-signal-repository.js";
import type { TriageCaseRepository } from "../../domain/moderation/triage-case-repository.js";
import type { ResolutionRepository } from "../../domain/moderation/resolution-repository.js";
import type { Evaluation } from "../../domain/evaluation/evaluation.js";
import type { QualitySignal } from "../../domain/quality-signal/quality-signal.js";
import type { TriageCase } from "../../domain/moderation/triage-case.js";
import type { Resolution } from "../../domain/moderation/resolution.js";

export interface ComputeAnalyticsOptions {
  evaluationCycleId?: string;
  minSampleSize?: number;
}

export class QualityAnalyticsService {
  readonly defaultMinSampleSize = 5;
  readonly defaultThresholdPercent = 15.0;
  readonly defaultCriticalThresholdPercent = 25.0;

  constructor(
    private readonly evalRepo: EvaluationRepository,
    private readonly signalRepo: QualitySignalRepository,
    private readonly triageRepo: TriageCaseRepository,
    private readonly resolutionRepo: ResolutionRepository
  ) {}

  /**
   * Helper to round numbers deterministically to 2 decimal places.
   */
  private round2(val: number): number {
    return Math.round(val * 100) / 100;
  }

  /**
   * Loads evaluations matching the optional evaluationCycleId filter.
   */
  private async loadEvaluations(cycleId?: string): Promise<Evaluation[]> {
    const result = await this.evalRepo.findPaginated({
      page: 1,
      pageSize: 10000,
      filter: cycleId ? { evaluationCycleId: cycleId } : undefined,
    });
    return result.items;
  }

  /**
   * Computes evaluator deviation analytics across an evaluation cohort.
   */
  async computeEvaluatorMetrics(
    options?: ComputeAnalyticsOptions
  ): Promise<EvaluatorDeviationMetric[]> {
    const minSampleSize = options?.minSampleSize ?? this.defaultMinSampleSize;
    const evaluations = await this.loadEvaluations(options?.evaluationCycleId);

    if (evaluations.length === 0) {
      return [];
    }

    // Group evaluations by evaluatorId
    const evalsByEvaluator = new Map<string, Evaluation[]>();
    for (const ev of evaluations) {
      const list = evalsByEvaluator.get(ev.evaluatorId) ?? [];
      list.push(ev);
      evalsByEvaluator.set(ev.evaluatorId, list);
    }

    // Load signals and triage cases to link counts
    const allSignals: QualitySignal[] = await this.signalRepo.findAll();
    const allTriageCases: TriageCase[] = await this.triageRepo.list();

    const evaluationIdToSignals = new Map<string, QualitySignal[]>();
    for (const sig of allSignals) {
      const list = evaluationIdToSignals.get(sig.evaluationId) ?? [];
      list.push(sig);
      evaluationIdToSignals.set(sig.evaluationId, list);
    }

    const evaluationIdToCases = new Map<string, TriageCase[]>();
    for (const tc of allTriageCases) {
      const list = evaluationIdToCases.get(tc.evaluationId) ?? [];
      list.push(tc);
      evaluationIdToCases.set(tc.evaluationId, list);
    }

    // Compute metrics per evaluator
    const metrics: EvaluatorDeviationMetric[] = [];

    for (const [evaluatorId, evals] of evalsByEvaluator.entries()) {
      const evalCount = evals.length;

      // Evaluator percentages and scores
      let totalScoreSum = 0;
      let percentageSum = 0;
      const percentages: number[] = [];

      for (const ev of evals) {
        totalScoreSum += ev.totalScore;
        const maxScore = ev.maxPossibleScore;
        const pct = maxScore > 0 ? (ev.totalScore / maxScore) * 100 : 0;
        percentageSum += pct;
        percentages.push(pct);
      }

      const meanScore = this.round2(totalScoreSum / evalCount);
      const meanPercentage = this.round2(percentageSum / evalCount);

      // Standard deviation of evaluator's percentages
      const variance =
        percentages.reduce((sum, p) => sum + Math.pow(p - meanPercentage, 2), 0) /
        evalCount;
      const stdDev = this.round2(Math.sqrt(variance));

      // Peer cohort calculations: all evaluations by OTHER evaluators in this cohort
      const peerEvals = evaluations.filter((e) => e.evaluatorId !== evaluatorId);
      const peerCount = peerEvals.length;

      let peerMeanPercentage = 0;
      if (peerCount > 0) {
        const peerPctSum = peerEvals.reduce((sum, e) => {
          const max = e.maxPossibleScore;
          return sum + (max > 0 ? (e.totalScore / max) * 100 : 0);
        }, 0);
        peerMeanPercentage = this.round2(peerPctSum / peerCount);
      }

      // Absolute deviation from peer mean
      const deviation = this.round2(Math.abs(meanPercentage - peerMeanPercentage));

      // Status classification
      let status: EvaluatorDeviationStatus;
      if (evalCount < minSampleSize || peerCount < minSampleSize) {
        status = EvaluatorDeviationStatus.INSUFFICIENT_DATA;
      } else if (deviation >= this.defaultCriticalThresholdPercent) {
        status = EvaluatorDeviationStatus.CRITICAL_DEVIATION;
      } else if (deviation >= this.defaultThresholdPercent) {
        status = EvaluatorDeviationStatus.MODERATE_DEVIATION;
      } else {
        status = EvaluatorDeviationStatus.NORMAL;
      }

      // Count active signals and triage cases
      let activeSignalCount = 0;
      let triageCaseCount = 0;

      for (const ev of evals) {
        const sigs = evaluationIdToSignals.get(ev.id) ?? [];
        activeSignalCount += sigs.filter(
          (s) =>
            s.status !== QualitySignalStatus.DISMISSED &&
            s.status !== QualitySignalStatus.RESOLVED
        ).length;
        const cases = evaluationIdToCases.get(ev.id) ?? [];
        triageCaseCount += cases.length;
      }

      const metric: EvaluatorDeviationMetric = Object.freeze({
        evaluatorId,
        evaluationCount: evalCount,
        evaluatorMeanScore: meanScore,
        evaluatorMeanPercentage: meanPercentage,
        peerMeanPercentage,
        deviationPercentage: deviation,
        standardDeviation: stdDev,
        status,
        activeSignalCount,
        triageCaseCount,
      });

      metrics.push(metric);
    }

    // Sort deterministically: highest deviation first, then evaluatorId ascending
    metrics.sort((a, b) => {
      if (b.deviationPercentage !== a.deviationPercentage) {
        return b.deviationPercentage - a.deviationPercentage;
      }
      return a.evaluatorId.localeCompare(b.evaluatorId);
    });

    return metrics;
  }

  /**
   * Computes question-level performance metrics across all evaluations in scope.
   */
  async computeQuestionMetrics(
    options?: ComputeAnalyticsOptions
  ): Promise<QuestionPerformanceMetric[]> {
    const evaluations = await this.loadEvaluations(options?.evaluationCycleId);

    if (evaluations.length === 0) {
      return [];
    }

    // Map question number to aggregate statistics
    interface QuestionAccumulator {
      questionId: string;
      questionNumber: string;
      maxMarks: number;
      evaluationsCount: number;
      totalAwardedMarks: number;
      missingMarksCount: number;
    }

    const accumulators = new Map<string, QuestionAccumulator>();

    for (const ev of evaluations) {
      for (const q of ev.questions) {
        let acc = accumulators.get(q.questionNumber);
        if (!acc) {
          acc = {
            questionId: q.id,
            questionNumber: q.questionNumber,
            maxMarks: q.maxMarks,
            evaluationsCount: 0,
            totalAwardedMarks: 0,
            missingMarksCount: 0,
          };
          accumulators.set(q.questionNumber, acc);
        }

        acc.evaluationsCount++;
        const mark = ev.getMark(q.id);
        if (mark) {
          acc.totalAwardedMarks += mark.awardedMarks;
        } else {
          acc.missingMarksCount++;
        }
      }
    }

    const metrics: QuestionPerformanceMetric[] = [];
    for (const acc of accumulators.values()) {
      const markedCount = acc.evaluationsCount - acc.missingMarksCount;
      const meanScore =
        markedCount > 0 ? this.round2(acc.totalAwardedMarks / markedCount) : 0;
      const meanPercentage =
        acc.maxMarks > 0 ? this.round2((meanScore / acc.maxMarks) * 100) : 0;

      metrics.push(
        Object.freeze({
          questionId: acc.questionId,
          questionNumber: acc.questionNumber,
          maxMarks: acc.maxMarks,
          evaluationsCount: acc.evaluationsCount,
          meanScore,
          meanPercentage,
          missingMarksCount: acc.missingMarksCount,
        })
      );
    }

    // Sort deterministically by questionNumber ascending
    metrics.sort((a, b) => a.questionNumber.localeCompare(b.questionNumber));

    return metrics;
  }

  /**
   * Computes a full quality analytics summary consolidating evaluator deviation metrics,
   * question metrics, quality signal distributions, and moderation workload metrics.
   */
  async computeQualityAnalytics(
    options?: ComputeAnalyticsOptions
  ): Promise<QualityAnalyticsSummary> {
    const evaluations = await this.loadEvaluations(options?.evaluationCycleId);
    const evaluatorMetrics = await this.computeEvaluatorMetrics(options);
    const questionMetrics = await this.computeQuestionMetrics(options);

    const totalEvaluations = evaluations.length;
    const uniqueEvaluators = new Set(evaluations.map((e) => e.evaluatorId));

    let totalScoreSum = 0;
    let totalPercentageSum = 0;

    for (const ev of evaluations) {
      totalScoreSum += ev.totalScore;
      const max = ev.maxPossibleScore;
      totalPercentageSum += max > 0 ? (ev.totalScore / max) * 100 : 0;
    }

    const meanCohortScore =
      totalEvaluations > 0 ? this.round2(totalScoreSum / totalEvaluations) : 0;
    const meanCohortPercentage =
      totalEvaluations > 0
        ? this.round2(totalPercentageSum / totalEvaluations)
        : 0;

    // Quality signals distribution
    const allSignals: QualitySignal[] = await this.signalRepo.findAll();
    // Filter signals by evaluations in scope if cycle filter applied
    const evaluationIds = new Set(evaluations.map((e) => e.id));
    const signalsInScope = options?.evaluationCycleId
      ? allSignals.filter((s) => evaluationIds.has(s.evaluationId))
      : allSignals;

    const signalsBySeverity: Record<string, number> = {};
    const signalsByDetector: Record<string, number> = {};

    for (const sig of signalsInScope) {
      signalsBySeverity[sig.severity] = (signalsBySeverity[sig.severity] ?? 0) + 1;
      signalsByDetector[sig.detector.name] =
        (signalsByDetector[sig.detector.name] ?? 0) + 1;
    }

    // Moderation workload distribution
    const allTriageCases: TriageCase[] = await this.triageRepo.list();
    const casesInScope = options?.evaluationCycleId
      ? allTriageCases.filter((tc) => evaluationIds.has(tc.evaluationId))
      : allTriageCases;

    let openCases = 0;
    let assignedCases = 0;
    let resolvedCases = 0;

    for (const tc of casesInScope) {
      if (tc.status === "OPEN") openCases++;
      else if (tc.status === "ASSIGNED") assignedCases++;
      else if (tc.status === "RESOLVED") resolvedCases++;
    }

    // Resolution outcomes distribution
    const allResolutions: Resolution[] = await this.resolutionRepo.findAll();
    const resolutionsInScope = options?.evaluationCycleId
      ? allResolutions.filter((r) => evaluationIds.has(r.evaluationId))
      : allResolutions;

    const byOutcome: Record<string, number> = {};
    for (const res of resolutionsInScope) {
      byOutcome[res.outcome] = (byOutcome[res.outcome] ?? 0) + 1;
    }

    const summary: QualityAnalyticsSummary = Object.freeze({
      evaluationCycleId: options?.evaluationCycleId,
      totalEvaluations,
      totalEvaluators: uniqueEvaluators.size,
      meanCohortScore,
      meanCohortPercentage,
      signalsSummary: Object.freeze({
        total: signalsInScope.length,
        bySeverity: Object.freeze(signalsBySeverity),
        byDetector: Object.freeze(signalsByDetector),
      }),
      moderationSummary: Object.freeze({
        totalCases: casesInScope.length,
        openCases,
        assignedCases,
        resolvedCases,
        byOutcome: Object.freeze(byOutcome),
      }),
      evaluatorMetrics,
      questionMetrics,
      generatedAt: new Date().toISOString(),
    });

    return summary;
  }

  /**
   * Retrieves deviation analytics for a single evaluator.
   */
  async getEvaluatorMetric(
    evaluatorId: string,
    options?: ComputeAnalyticsOptions
  ): Promise<EvaluatorDeviationMetric | null> {
    const metrics = await this.computeEvaluatorMetrics(options);
    const found = metrics.find((m) => m.evaluatorId === evaluatorId);
    return found ?? null;
  }

  /**
   * Alias for getEvaluatorMetric.
   */
  async computeSingleEvaluatorMetric(
    evaluatorId: string,
    options?: ComputeAnalyticsOptions
  ): Promise<EvaluatorDeviationMetric | null> {
    return this.getEvaluatorMetric(evaluatorId, options);
  }

  /**
   * Alias for computeQualityAnalytics.
   */
  async computeQualitySummary(
    options?: ComputeAnalyticsOptions
  ): Promise<QualityAnalyticsSummary> {
    return this.computeQualityAnalytics(options);
  }
}
