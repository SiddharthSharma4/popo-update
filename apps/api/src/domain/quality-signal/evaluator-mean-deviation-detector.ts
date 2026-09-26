/**
 * EvaluatorMeanDeviationDetector.
 * Statistical quality detector identifying significant deviation between an evaluator's
 * average score and peer/cycle baseline.
 *
 * Conforms to:
 * - docs/contracts/02-architecture-contract.md §17 (Statistical Detection Engine)
 * - docs/contracts/02-architecture-contract.md §18 (Detector Provenance & Evidence)
 * - docs/contracts/05-domain-contract.md §19-21 (QualitySignal Aggregate & Deduplication)
 * - docs/contracts/05-domain-contract.md §34 (Statistical Context Requirement)
 * - docs/contracts/01-product-contract.md §31 (Quality Signal Contract & Terminology)
 * - docs/contracts/07-event-contract.md §43 (Statistical Signal Context)
 *
 * Invariants:
 * - INV-004: Statistical observation is not a finding. It is purely advisory/observational.
 * - INV-003: Does not alter marks, questions, or total score on any evaluation.
 * - Minimum sample size guard: does not generate ungrounded signals on insufficient evidence.
 * - Strict absolute deviation: deviation = |evaluatorMean - peerMean|.
 */

import { SignalSeverity, QualitySignalStatus } from "@osm/shared";
import type { DetectorProvenance } from "@osm/shared";
import type { Evaluation } from "../evaluation/evaluation.js";
import { QualitySignal } from "./quality-signal.js";
import type { StatisticalDetector, StatisticalDetectorInput } from "./detector.js";

export const STATISTICAL_DETECTOR_PROVENANCE: DetectorProvenance = {
  type: "STATISTICAL",
  name: "evaluator-mean-deviation-detector",
  version: "1.0.0",
};

export const STATISTICAL_SIGNAL_TYPE = "STATISTICAL_EVALUATOR_DEVIATION";

export interface EvaluatorMeanDeviationConfig {
  /**
   * Minimum evaluations required for evaluator and peer group to compute reliable statistics.
   * Default: 5 evaluations.
   */
  minSampleSize?: number;
  /**
   * Percentage point deviation threshold to trigger a MEDIUM severity signal.
   * Default: 15.0 (percentage points).
   */
  thresholdPercent?: number;
  /**
   * Percentage point deviation threshold to trigger a HIGH severity signal.
   * Default: 25.0 (percentage points).
   */
  criticalThresholdPercent?: number;
}

export interface StatisticalCalculationResult {
  evaluatorMean: number;
  peerMean: number;
  deviation: number;
  sampleSize: number;
  peerSampleSize: number;
  isAnomaly: boolean;
  severity: SignalSeverity | null;
}

export interface DetectEvaluatorDeviationInput extends StatisticalDetectorInput {
  config?: EvaluatorMeanDeviationConfig;
}

export class EvaluatorMeanDeviationDetector implements StatisticalDetector {
  readonly name: string = STATISTICAL_DETECTOR_PROVENANCE.name;
  readonly version: string = STATISTICAL_DETECTOR_PROVENANCE.version;
  readonly defaultMinSampleSize = 5;
  readonly defaultThresholdPercent = 15.0;
  readonly defaultCriticalThresholdPercent = 25.0;

  /**
   * Computes the mean percentage score for a set of evaluations.
   * Percentage score per evaluation = (totalScore / maxPossibleScore) * 100.
   */
  private computeMeanPercentage(evaluations: Evaluation[]): number {
    if (evaluations.length === 0) return 0;
    let totalPercentage = 0;
    for (const evaluation of evaluations) {
      const maxPossible = evaluation.maxPossibleScore;
      const score = evaluation.totalScore;
      const pct = maxPossible > 0 ? (score / maxPossible) * 100 : 0;
      totalPercentage += pct;
    }
    return Math.round((totalPercentage / evaluations.length) * 100) / 100;
  }

  /**
   * Pure mathematical calculation of evaluator mean deviation.
   * Side-effect free and deterministic.
   */
  calculate(
    evaluatorEvaluations: Evaluation[],
    peerEvaluations: Evaluation[],
    config?: EvaluatorMeanDeviationConfig
  ): StatisticalCalculationResult {
    const minSampleSize = config?.minSampleSize ?? this.defaultMinSampleSize;
    const thresholdPercent = config?.thresholdPercent ?? this.defaultThresholdPercent;
    const criticalThresholdPercent =
      config?.criticalThresholdPercent ?? this.defaultCriticalThresholdPercent;

    const sampleSize = evaluatorEvaluations.length;
    const peerSampleSize = peerEvaluations.length;

    // Minimum sample size guard: both groups must satisfy minimum sample size
    if (sampleSize < minSampleSize || peerSampleSize < minSampleSize) {
      return {
        evaluatorMean: 0,
        peerMean: 0,
        deviation: 0,
        sampleSize,
        peerSampleSize,
        isAnomaly: false,
        severity: null,
      };
    }

    const evaluatorMean = this.computeMeanPercentage(evaluatorEvaluations);
    const peerMean = this.computeMeanPercentage(peerEvaluations);

    // Absolute deviation: |evaluatorMean - peerMean|
    const rawDeviation = Math.abs(evaluatorMean - peerMean);
    const deviation = Math.round(rawDeviation * 100) / 100;

    const isAnomaly = deviation >= thresholdPercent;
    let severity: SignalSeverity | null = null;
    if (isAnomaly) {
      severity =
        deviation >= criticalThresholdPercent ? SignalSeverity.HIGH : SignalSeverity.MEDIUM;
    }

    return {
      evaluatorMean,
      peerMean,
      deviation,
      sampleSize,
      peerSampleSize,
      isAnomaly,
      severity,
    };
  }

  /**
   * Detects statistical evaluator deviation and generates an evidence-bearing QualitySignal if threshold is exceeded.
   * Returns null if sample size is insufficient or deviation does not reach threshold.
   */
  detect(input: DetectEvaluatorDeviationInput): QualitySignal | null {
    const { targetEvaluation, evaluatorEvaluations, peerEvaluations, config } = input;
    const minSampleSize = config?.minSampleSize ?? this.defaultMinSampleSize;
    const thresholdPercent = config?.thresholdPercent ?? this.defaultThresholdPercent;
    const criticalThresholdPercent =
      config?.criticalThresholdPercent ?? this.defaultCriticalThresholdPercent;

    const stats = this.calculate(evaluatorEvaluations, peerEvaluations, config);

    if (!stats.isAnomaly || !stats.severity) {
      return null;
    }

    const evaluationCycleId = targetEvaluation.evaluationCycleId;

    const detectorProvenance: DetectorProvenance = {
      ...STATISTICAL_DETECTOR_PROVENANCE,
      config: {
        minSampleSize,
        thresholdPercent,
        criticalThresholdPercent,
      },
    };

    return QualitySignal.create({
      evaluationId: targetEvaluation.id,
      evaluationVersion: targetEvaluation.version,
      signalType: STATISTICAL_SIGNAL_TYPE,
      severity: stats.severity,
      status: QualitySignalStatus.REVIEWABLE,
      summary: `Evaluator mean (${stats.evaluatorMean}%) deviates by ${stats.deviation}% from peer baseline (${stats.peerMean}%) in cycle ${evaluationCycleId} (sample size: ${stats.sampleSize}).`,
      evidence: {
        evaluatorMean: stats.evaluatorMean,
        peerMean: stats.peerMean,
        deviation: stats.deviation,
        sampleSize: stats.sampleSize,
        peerSampleSize: stats.peerSampleSize,
        evaluationCycleId,
        thresholdPercent,
      },
      detector: detectorProvenance,
    });
  }
}
