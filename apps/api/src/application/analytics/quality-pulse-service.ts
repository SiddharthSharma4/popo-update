/**
 * QualityPulseService.
 * Application service coordinating the QualityPulse real-time quality overview,
 * operational health index, emerging hotspot discovery, and SentinelFlag statistical anomaly detection.
 *
 * Conforms to:
 * - docs/contracts/01-product-contract.md §15 (QualityPulse overview & drill-down)
 * - docs/contracts/01-product-contract.md §16 (SentinelFlag statistical signals)
 * - docs/contracts/02-architecture-contract.md §12, §31, §61 (Analytics & Read Models)
 * - docs/contracts/05-domain-contract.md §19-21, INV-004 (QualitySignal & Statistical Observation)
 * - docs/contracts/08-data-contract.md §4.2, §53 (Derived Data & Rebuildability)
 * - docs/planning/03-build-roadmap.md §15 (Phase 8 — Analytics & Insights)
 *
 * Invariants:
 * - INV-004: QualityPulse read models and SentinelFlag anomalies are strictly derived/observational.
 * - INV-003: Pure non-authority; zero mutation of authoritative academic marks or operational evaluation state.
 * - Minimum sample size guards: prevents statistically ungrounded inferences on small cohorts.
 * - Deterministic reproducibility: identical inputs produce 100% identical outputs (09-testing §40).
 * - Deep runtime immutability: all computed views and hotspots are deeply frozen.
 */

import {
  EvaluationStatus,
  EvaluatorDeviationStatus,
  QualityRiskLevel,
  QualityHotspotType,
  SignalSeverity,
  QualitySignalStatus,
  type QualityPulseOverview,
  type QualityHotspot,
  type TriggerSentinelResponse,
  type QualitySignalResponse,
} from "@osm/shared";
import type { EvaluationRepository } from "../../domain/evaluation/evaluation-repository.js";
import type { QualitySignalRepository } from "../../domain/quality-signal/quality-signal-repository.js";
import type { TriageCaseRepository } from "../../domain/moderation/triage-case-repository.js";
import type { ResolutionRepository } from "../../domain/moderation/resolution-repository.js";
import type { Evaluation } from "../../domain/evaluation/evaluation.js";
import type { QualitySignal } from "../../domain/quality-signal/quality-signal.js";
import type { TriageCase } from "../../domain/moderation/triage-case.js";
import type { Resolution } from "../../domain/moderation/resolution.js";
import {
  EvaluatorMeanDeviationDetector,
  STATISTICAL_SIGNAL_TYPE,
  type EvaluatorMeanDeviationConfig,
} from "../../domain/quality-signal/evaluator-mean-deviation-detector.js";
import type { QualityAnalyticsService } from "./quality-analytics-service.js";

export interface QualityPulseOptions {
  evaluationCycleId?: string;
  minSampleSize?: number;
  limit?: number;
}

export interface TriggerSentinelOptions {
  evaluationCycleId?: string;
  minSampleSize?: number;
  thresholdPercent?: number;
  criticalThresholdPercent?: number;
}

export class QualityPulseService {
  private readonly detector: EvaluatorMeanDeviationDetector;

  constructor(
    private readonly evalRepo: EvaluationRepository,
    private readonly signalRepo: QualitySignalRepository,
    private readonly triageRepo: TriageCaseRepository,
    private readonly resolutionRepo: ResolutionRepository,
    private readonly analyticsService: QualityAnalyticsService,
    detector?: EvaluatorMeanDeviationDetector
  ) {
    this.detector = detector ?? new EvaluatorMeanDeviationDetector();
  }

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
   * Computes the consolidated QualityPulse overview.
   */
  async getQualityPulse(options?: QualityPulseOptions): Promise<QualityPulseOverview> {
    const evaluations = await this.loadEvaluations(options?.evaluationCycleId);
    const evaluationIds = new Set(evaluations.map((e) => e.id));

    // 1. Progress metrics
    let submitted = 0;
    let inProgress = 0;
    let draft = 0;
    let finalized = 0;

    for (const ev of evaluations) {
      if (ev.status === EvaluationStatus.SUBMITTED) submitted++;
      else if (ev.status === EvaluationStatus.IN_PROGRESS) inProgress++;
      else if (ev.status === EvaluationStatus.DRAFT) draft++;
      else if (ev.status === EvaluationStatus.FINALIZED) finalized++;
    }

    const total = evaluations.length;
    const completionPercentage =
      total > 0 ? this.round2(((submitted + finalized) / total) * 100) : 0;

    // 2. Load signals and triage cases in scope
    const allSignals: QualitySignal[] = await this.signalRepo.findAll();
    const signalsInScope = options?.evaluationCycleId
      ? allSignals.filter((s) => evaluationIds.has(s.evaluationId))
      : allSignals;

    const allTriageCases: TriageCase[] = await this.triageRepo.list();
    const casesInScope = options?.evaluationCycleId
      ? allTriageCases.filter((tc) => evaluationIds.has(tc.evaluationId))
      : allTriageCases;

    const allResolutions: Resolution[] = await this.resolutionRepo.findAll();
    const resolutionsInScope = options?.evaluationCycleId
      ? allResolutions.filter((r) => evaluationIds.has(r.evaluationId))
      : allResolutions;

    // Signal counts
    let openReviewable = 0;
    let linkedToCase = 0;
    let resolvedSignals = 0;
    let dismissedSignals = 0;
    const bySeverity: Record<string, number> = {};
    const byDetector: Record<string, number> = {};
    const evaluationsWithActiveSignals = new Set<string>();

    for (const sig of signalsInScope) {
      if (
        sig.status === QualitySignalStatus.REVIEWABLE ||
        sig.status === QualitySignalStatus.GENERATED
      ) {
        openReviewable++;
        evaluationsWithActiveSignals.add(sig.evaluationId);
      } else if (sig.status === QualitySignalStatus.LINKED_TO_CASE) {
        linkedToCase++;
        evaluationsWithActiveSignals.add(sig.evaluationId);
      } else if (sig.status === QualitySignalStatus.RESOLVED) {
        resolvedSignals++;
      } else if (sig.status === QualitySignalStatus.DISMISSED) {
        dismissedSignals++;
      }

      bySeverity[sig.severity] = (bySeverity[sig.severity] ?? 0) + 1;
      byDetector[sig.detector.name] = (byDetector[sig.detector.name] ?? 0) + 1;
    }

    // Moderation counts
    let openCases = 0;
    let assignedCases = 0;
    let resolvedCases = 0;

    for (const tc of casesInScope) {
      if (tc.status === "OPEN") openCases++;
      else if (tc.status === "ASSIGNED") assignedCases++;
      else if (tc.status === "RESOLVED") resolvedCases++;
    }

    const totalCases = casesInScope.length;
    const resolutionRate =
      totalCases > 0 ? this.round2((resolvedCases / totalCases) * 100) : 100;

    const byOutcome: Record<string, number> = {};
    for (const res of resolutionsInScope) {
      byOutcome[res.outcome] = (byOutcome[res.outcome] ?? 0) + 1;
    }

    // 3. Evaluator deviation metrics via QualityAnalyticsService
    const evaluatorMetrics = await this.analyticsService.computeEvaluatorMetrics(options);
    let normalCount = 0;
    let moderateDeviationCount = 0;
    let criticalDeviationCount = 0;
    let insufficientDataCount = 0;
    const flaggedEvaluatorIds: string[] = [];

    for (const em of evaluatorMetrics) {
      if (em.status === EvaluatorDeviationStatus.NORMAL) normalCount++;
      else if (em.status === EvaluatorDeviationStatus.MODERATE_DEVIATION) {
        moderateDeviationCount++;
        flaggedEvaluatorIds.push(em.evaluatorId);
      } else if (em.status === EvaluatorDeviationStatus.CRITICAL_DEVIATION) {
        criticalDeviationCount++;
        flaggedEvaluatorIds.push(em.evaluatorId);
      } else if (em.status === EvaluatorDeviationStatus.INSUFFICIENT_DATA) {
        insufficientDataCount++;
      }
    }

    // 4. Quality health index & risk level
    const evaluationsWithSignalsCount = evaluationsWithActiveSignals.size;
    const rawHealth =
      total > 0
        ? Math.max(0, 100 - (evaluationsWithSignalsCount / total) * 100)
        : 100;
    const healthIndex = this.round2(rawHealth);

    let riskLevel: QualityRiskLevel;
    const criticalSignalsCount = bySeverity[SignalSeverity.CRITICAL] ?? 0;
    const highSignalsCount = bySeverity[SignalSeverity.HIGH] ?? 0;
    const mediumSignalsCount = bySeverity[SignalSeverity.MEDIUM] ?? 0;

    if (criticalDeviationCount > 0 || criticalSignalsCount > 0) {
      riskLevel = QualityRiskLevel.CRITICAL;
    } else if (moderateDeviationCount > 0 || highSignalsCount > 0) {
      riskLevel = QualityRiskLevel.HIGH;
    } else if (mediumSignalsCount > 0 || evaluationsWithSignalsCount > 0) {
      riskLevel = QualityRiskLevel.MEDIUM;
    } else {
      riskLevel = QualityRiskLevel.LOW;
    }

    // 5. Emerging hotspots
    const hotspots = await this.computeHotspots({
      evaluations,
      signalsInScope,
      evaluatorMetrics,
      limit: options?.limit ?? 10,
    });

    const overview: QualityPulseOverview = Object.freeze({
      evaluationCycleId: options?.evaluationCycleId,
      progress: Object.freeze({
        total,
        submitted,
        inProgress,
        draft,
        finalized,
        completionPercentage,
      }),
      health: Object.freeze({
        healthIndex,
        riskLevel,
        evaluationsWithSignalsCount,
      }),
      signalsOverview: Object.freeze({
        total: signalsInScope.length,
        openReviewable,
        linkedToCase,
        resolved: resolvedSignals,
        dismissed: dismissedSignals,
        bySeverity: Object.freeze(bySeverity),
        byDetector: Object.freeze(byDetector),
      }),
      moderationOverview: Object.freeze({
        totalCases,
        openCases,
        assignedCases,
        resolvedCases,
        resolutionRate,
        byOutcome: Object.freeze(byOutcome),
      }),
      evaluatorDeviations: Object.freeze({
        totalEvaluators: evaluatorMetrics.length,
        normalCount,
        moderateDeviationCount,
        criticalDeviationCount,
        insufficientDataCount,
        flaggedEvaluatorIds: Object.freeze(flaggedEvaluatorIds) as unknown as string[],
      }),
      topHotspots: Object.freeze(hotspots) as unknown as QualityHotspot[],
      generatedAt: new Date().toISOString(),
    });

    return overview;
  }

  /**
   * Helper to compute prioritized emerging hotspots.
   */
  private async computeHotspots(context: {
    evaluations: Evaluation[];
    signalsInScope: QualitySignal[];
    evaluatorMetrics: Awaited<ReturnType<QualityAnalyticsService["computeEvaluatorMetrics"]>>;
    limit: number;
  }): Promise<QualityHotspot[]> {
    const hotspots: QualityHotspot[] = [];

    // 1. Evaluator anomaly hotspots
    for (const em of context.evaluatorMetrics) {
      if (em.status === EvaluatorDeviationStatus.CRITICAL_DEVIATION) {
        hotspots.push(
          Object.freeze({
            hotspotType: QualityHotspotType.EVALUATOR_ANOMALY,
            targetId: em.evaluatorId,
            severity: SignalSeverity.HIGH,
            title: `Critical Deviation: Evaluator ${em.evaluatorId}`,
            description: `Evaluator mean (${em.evaluatorMeanPercentage}%) deviates critically by ${em.deviationPercentage}% from peer baseline (${em.peerMeanPercentage}%).`,
            evidence: Object.freeze({
              evaluatorId: em.evaluatorId,
              evaluatorMeanPercentage: em.evaluatorMeanPercentage,
              peerMeanPercentage: em.peerMeanPercentage,
              deviationPercentage: em.deviationPercentage,
              evaluationCount: em.evaluationCount,
            }),
          })
        );
      } else if (em.status === EvaluatorDeviationStatus.MODERATE_DEVIATION) {
        hotspots.push(
          Object.freeze({
            hotspotType: QualityHotspotType.EVALUATOR_ANOMALY,
            targetId: em.evaluatorId,
            severity: SignalSeverity.MEDIUM,
            title: `Moderate Deviation: Evaluator ${em.evaluatorId}`,
            description: `Evaluator mean (${em.evaluatorMeanPercentage}%) deviates moderately by ${em.deviationPercentage}% from peer baseline (${em.peerMeanPercentage}%).`,
            evidence: Object.freeze({
              evaluatorId: em.evaluatorId,
              evaluatorMeanPercentage: em.evaluatorMeanPercentage,
              peerMeanPercentage: em.peerMeanPercentage,
              deviationPercentage: em.deviationPercentage,
              evaluationCount: em.evaluationCount,
            }),
          })
        );
      }
    }

    // 2. Question difficulty hotspots (questions with average < 40% or missing marks)
    const questionMetrics = await this.analyticsService.computeQuestionMetrics();
    for (const qm of questionMetrics) {
      if (qm.missingMarksCount > 0) {
        hotspots.push(
          Object.freeze({
            hotspotType: QualityHotspotType.QUESTION_DIFFICULTY,
            targetId: qm.questionNumber,
            severity: SignalSeverity.HIGH,
            title: `Missing Marks on Question ${qm.questionNumber}`,
            description: `${qm.missingMarksCount} evaluations lack awarded marks for question ${qm.questionNumber}.`,
            evidence: Object.freeze({
              questionNumber: qm.questionNumber,
              missingMarksCount: qm.missingMarksCount,
              evaluationsCount: qm.evaluationsCount,
            }),
          })
        );
      } else if (qm.meanPercentage < 35.0 && qm.evaluationsCount >= 5) {
        hotspots.push(
          Object.freeze({
            hotspotType: QualityHotspotType.QUESTION_DIFFICULTY,
            targetId: qm.questionNumber,
            severity: SignalSeverity.MEDIUM,
            title: `High Difficulty on Question ${qm.questionNumber}`,
            description: `Cohort mean score is only ${qm.meanPercentage}% of max marks (${qm.meanScore}/${qm.maxMarks}).`,
            evidence: Object.freeze({
              questionNumber: qm.questionNumber,
              meanPercentage: qm.meanPercentage,
              meanScore: qm.meanScore,
              maxMarks: qm.maxMarks,
            }),
          })
        );
      }
    }

    // 3. Signal concentration hotspots (evaluations with >= 2 active signals)
    const signalsByEvaluation = new Map<string, QualitySignal[]>();
    for (const sig of context.signalsInScope) {
      if (
        sig.status === QualitySignalStatus.REVIEWABLE ||
        sig.status === QualitySignalStatus.GENERATED ||
        sig.status === QualitySignalStatus.LINKED_TO_CASE
      ) {
        const list = signalsByEvaluation.get(sig.evaluationId) ?? [];
        list.push(sig);
        signalsByEvaluation.set(sig.evaluationId, list);
      }
    }

    for (const [evaluationId, sigs] of signalsByEvaluation.entries()) {
      if (sigs.length >= 2) {
        hotspots.push(
          Object.freeze({
            hotspotType: QualityHotspotType.SIGNAL_CONCENTRATION,
            targetId: evaluationId,
            severity: SignalSeverity.HIGH,
            title: `Signal Concentration on Evaluation ${evaluationId}`,
            description: `Evaluation has ${sigs.length} concurrent active quality signals requiring review.`,
            evidence: Object.freeze({
              evaluationId,
              signalCount: sigs.length,
              signalTypes: sigs.map((s) => s.signalType),
            }),
          })
        );
      }
    }

    // Sort deterministically: HIGH severity first, then by title
    const severityRank: Record<SignalSeverity, number> = {
      [SignalSeverity.CRITICAL]: 4,
      [SignalSeverity.HIGH]: 3,
      [SignalSeverity.MEDIUM]: 2,
      [SignalSeverity.LOW]: 1,
      [SignalSeverity.INFO]: 0,
    };

    hotspots.sort((a, b) => {
      const rankDiff = (severityRank[b.severity] ?? 0) - (severityRank[a.severity] ?? 0);
      if (rankDiff !== 0) return rankDiff;
      return a.title.localeCompare(b.title);
    });

    return hotspots.slice(0, context.limit);
  }

  /**
   * Retrieves emerging hotspots.
   */
  async getHotspots(options?: QualityPulseOptions): Promise<QualityHotspot[]> {
    const overview = await this.getQualityPulse(options);
    return overview.topHotspots;
  }

  /**
   * Triggers SentinelFlag statistical anomaly detection across an evaluation cycle,
   * materializing and persisting evidence-bearing QualitySignals for newly detected evaluator anomalies.
   *
   * Invariants:
   * - INV-004: Observation is not a finding. It is purely advisory/observational.
   * - INV-003: Pure non-authority; zero mutation of marks, scores, or evaluation statuses.
   * - Idempotency guard: does not generate duplicate signals if an active statistical signal already exists.
   */
  async triggerSentinel(
    options?: TriggerSentinelOptions
  ): Promise<TriggerSentinelResponse> {
    const config: EvaluatorMeanDeviationConfig = {
      minSampleSize: options?.minSampleSize,
      thresholdPercent: options?.thresholdPercent,
      criticalThresholdPercent: options?.criticalThresholdPercent,
    };

    const evaluations = await this.loadEvaluations(options?.evaluationCycleId);

    // Group evaluations by evaluatorId
    const evalsByEvaluator = new Map<string, Evaluation[]>();
    for (const ev of evaluations) {
      const list = evalsByEvaluator.get(ev.evaluatorId) ?? [];
      list.push(ev);
      evalsByEvaluator.set(ev.evaluatorId, list);
    }

    const existingSignals = await this.signalRepo.findAll();
    // Index existing active statistical signals by evaluationId to prevent duplicate generation
    const activeStatSignalsByEval = new Set<string>();
    for (const sig of existingSignals) {
      if (
        sig.signalType === STATISTICAL_SIGNAL_TYPE &&
        sig.status !== QualitySignalStatus.DISMISSED &&
        sig.status !== QualitySignalStatus.RESOLVED
      ) {
        activeStatSignalsByEval.add(sig.evaluationId);
      }
    }

    let evaluatorsAnalyzed = 0;
    let anomaliesDetected = 0;
    const newSignals: QualitySignalResponse[] = [];

    for (const [evaluatorId, evaluatorEvals] of evalsByEvaluator.entries()) {
      const peerEvals = evaluations.filter((e) => e.evaluatorId !== evaluatorId);

      evaluatorsAnalyzed++;

      // Pick the most recent evaluation for this evaluator as the anchor evaluation
      const targetEvaluation = evaluatorEvals[evaluatorEvals.length - 1];

      const signal = this.detector.detect({
        targetEvaluation,
        evaluatorEvaluations: evaluatorEvals,
        peerEvaluations: peerEvals,
        config,
      });

      if (signal) {
        anomaliesDetected++;

        // Only persist and return if target evaluation does not already have an active statistical signal
        if (!activeStatSignalsByEval.has(targetEvaluation.id)) {
          await this.signalRepo.save(signal);

          newSignals.push(
            Object.freeze({
              id: signal.id,
              evaluationId: signal.evaluationId,
              evaluationVersion: signal.evaluationVersion,
              signalType: signal.signalType,
              severity: signal.severity,
              status: signal.status,
              summary: signal.summary,
              evidence: signal.evidence,
              detector: signal.detector,
              createdAt: signal.createdAt,
              updatedAt: signal.updatedAt,
            })
          );
        }
      }
    }

    const result: TriggerSentinelResponse = Object.freeze({
      triggeredAt: new Date().toISOString(),
      evaluationCycleId: options?.evaluationCycleId,
      evaluatorsAnalyzed,
      anomaliesDetected,
      newSignalsGenerated: newSignals.length,
      signals: Object.freeze(newSignals) as unknown as QualitySignalResponse[],
    });

    return result;
  }
}
