/**
 * Deterministic Completeness QualitySignal Generator.
 * Maps deterministic evaluation completeness results to a canonical QualitySignal.
 * Conforms to:
 * - docs/contracts/01-product-contract.md §13 (CompleteCheck)
 * - docs/contracts/02-architecture-contract.md §14, §19-20
 * - docs/contracts/05-domain-contract.md §19-21
 * - docs/contracts/08-data-contract.md §17-18
 *
 * Invariants:
 * - 100% deterministic mapping, zero AI/probabilistic calls.
 * - fully complete evaluation -> NO QualitySignal (returns null).
 * - zero-question evaluation -> COMPLETENESS_EMPTY (severity CRITICAL).
 * - completely unmarked -> COMPLETENESS_UNMARKED (severity HIGH).
 * - partially marked -> COMPLETENESS_PARTIAL (severity MEDIUM).
 */

import { SignalSeverity, QualitySignalStatus } from "@osm/shared";
import type { Evaluation } from "../evaluation/evaluation.js";
import type { CompletenessResult } from "../validation/completeness-result.js";
import { QualitySignal } from "./quality-signal.js";

export const COMPLETENESS_DETECTOR_PROVENANCE = {
  type: "DETERMINISTIC" as const,
  name: "completeness-detector",
  version: "1.0.0",
};

export class CompletenessSignalGenerator {
  generate(
    evaluation: Evaluation,
    completeness: CompletenessResult
  ): QualitySignal | null {
    // Fully complete evaluation -> NO QualitySignal
    if (completeness.isComplete && completeness.unmarkedQuestions === 0 && completeness.totalQuestions > 0) {
      return null;
    }

    // Zero-question evaluation -> COMPLETENESS_EMPTY (CRITICAL)
    if (completeness.totalQuestions === 0) {
      return QualitySignal.create({
        evaluationId: evaluation.id,
        evaluationVersion: evaluation.version,
        signalType: "COMPLETENESS_EMPTY",
        severity: SignalSeverity.CRITICAL,
        status: QualitySignalStatus.REVIEWABLE,
        summary: "Evaluation has zero questions configured.",
        evidence: {
          evaluationId: evaluation.id,
          scriptId: evaluation.scriptId,
          totalQuestions: 0,
          markedQuestions: 0,
          unmarkedQuestions: 0,
          missingQuestionIds: [],
          reason: "Zero questions configured for evaluation.",
        },
        detector: COMPLETENESS_DETECTOR_PROVENANCE,
      });
    }

    // Completely unmarked -> COMPLETENESS_UNMARKED (HIGH)
    if (completeness.markedQuestions === 0) {
      return QualitySignal.create({
        evaluationId: evaluation.id,
        evaluationVersion: evaluation.version,
        signalType: "COMPLETENESS_UNMARKED",
        severity: SignalSeverity.HIGH,
        status: QualitySignalStatus.REVIEWABLE,
        summary: `Evaluation is completely unmarked (${completeness.totalQuestions} question${completeness.totalQuestions === 1 ? "" : "s"} unmarked).`,
        evidence: {
          evaluationId: evaluation.id,
          scriptId: evaluation.scriptId,
          totalQuestions: completeness.totalQuestions,
          markedQuestions: 0,
          unmarkedQuestions: completeness.unmarkedQuestions,
          missingQuestionIds: completeness.missingQuestionIds,
          reason: "All questions in this evaluation remain unmarked.",
        },
        detector: COMPLETENESS_DETECTOR_PROVENANCE,
      });
    }

    // Partially marked -> COMPLETENESS_PARTIAL (MEDIUM)
    if (completeness.unmarkedQuestions > 0) {
      return QualitySignal.create({
        evaluationId: evaluation.id,
        evaluationVersion: evaluation.version,
        signalType: "COMPLETENESS_PARTIAL",
        severity: SignalSeverity.MEDIUM,
        status: QualitySignalStatus.REVIEWABLE,
        summary: `Evaluation is partially marked (${completeness.unmarkedQuestions} of ${completeness.totalQuestions} questions unmarked).`,
        evidence: {
          evaluationId: evaluation.id,
          scriptId: evaluation.scriptId,
          totalQuestions: completeness.totalQuestions,
          markedQuestions: completeness.markedQuestions,
          unmarkedQuestions: completeness.unmarkedQuestions,
          missingQuestionIds: completeness.missingQuestionIds,
          reason: "Evaluation has unmarked questions upon submission.",
        },
        detector: COMPLETENESS_DETECTOR_PROVENANCE,
      });
    }

    return null;
  }
}
