/**
 * Statistical Quality Detector Unit Tests (TASK-P4-INTEL-001).
 * Verifies EvaluatorMeanDeviationDetector behavior against:
 * - docs/contracts/02-architecture-contract.md §17 (Statistical Detection Engine)
 * - docs/contracts/02-architecture-contract.md §18 (Detector Provenance & Evidence)
 * - docs/contracts/05-domain-contract.md §19-21 (QualitySignal Aggregate)
 * - docs/contracts/05-domain-contract.md §34 (Statistical Context Requirement)
 * - docs/contracts/01-product-contract.md §31 (Quality Signal Contract)
 * - docs/contracts/09-testing-contract.md §40 (Detector Testing & Reproducibility)
 *
 * Invariants:
 * - Minimum sample size guard: no signal without sufficient statistical evidence.
 * - Strict absolute deviation: deviation = |evaluatorMean - peerMean|.
 * - Non-authority (INV-004, INV-003): detector execution must not mutate evaluation marks/scores.
 * - Deterministic reproducibility: identical inputs yield identical statistical outputs.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { SignalSeverity, QualitySignalStatus } from "@osm/shared";
import { Evaluation } from "../src/domain/evaluation/evaluation.js";
import {
  EvaluatorMeanDeviationDetector,
  STATISTICAL_DETECTOR_PROVENANCE,
  STATISTICAL_SIGNAL_TYPE,
} from "../src/domain/quality-signal/evaluator-mean-deviation-detector.js";

describe("TASK-P4-INTEL-001: EvaluatorMeanDeviationDetector (Statistical Quality Intelligence)", () => {
  let detector: EvaluatorMeanDeviationDetector;

  beforeEach(() => {
    detector = new EvaluatorMeanDeviationDetector();
  });

  /**
   * Helper function to create an evaluation with a specific score percentage.
   * Default evaluation has 1 question with maxMarks: 100.
   */
  function createTestEvaluation(
    id: string,
    evaluatorId: string,
    cycleId: string,
    awardedMarks: number,
    maxMarks = 100
  ): Evaluation {
    return Evaluation.create({
      id,
      evaluationCycleId: cycleId,
      scriptId: `script_${id}`,
      rubricId: "rubric_standard",
      rubricVersion: 1,
      evaluatorId,
      questions: [
        {
          id: `q_${id}`,
          questionNumber: "1",
          text: "Question 1",
          maxMarks,
          orderIndex: 1,
        },
      ],
      marks: [
        {
          questionId: `q_${id}`,
          awardedMarks,
          maxMarks,
          evaluatorId,
        },
      ],
    });
  }

  describe("Minimum Sample Size Guard (05-domain-contract §34)", () => {
    it("should return null when evaluator evaluation count is below minimum sample size (sampleSize < 5)", () => {
      // 4 evaluator evaluations (default minSampleSize = 5)
      const evaluatorEvals = [
        createTestEvaluation("eval_1", "evaluator_alice", "cycle_2026", 90),
        createTestEvaluation("eval_2", "evaluator_alice", "cycle_2026", 92),
        createTestEvaluation("eval_3", "evaluator_alice", "cycle_2026", 88),
        createTestEvaluation("eval_4", "evaluator_alice", "cycle_2026", 95),
      ];

      // 10 peer evaluations with average 60%
      const peerEvals = Array.from({ length: 10 }, (_, i) =>
        createTestEvaluation(`peer_${i}`, "evaluator_peer", "cycle_2026", 60)
      );

      const target = evaluatorEvals[0];
      const signal = detector.detect({
        targetEvaluation: target,
        evaluatorEvaluations: evaluatorEvals,
        peerEvaluations: peerEvals,
      });

      expect(signal).toBeNull();

      const calc = detector.calculate(evaluatorEvals, peerEvals);
      expect(calc.isAnomaly).toBe(false);
      expect(calc.sampleSize).toBe(4);
      expect(calc.severity).toBeNull();
    });

    it("should return null when peer evaluation count is below minimum sample size (peerSampleSize < 5)", () => {
      // 6 evaluator evaluations
      const evaluatorEvals = Array.from({ length: 6 }, (_, i) =>
        createTestEvaluation(`eval_${i}`, "evaluator_alice", "cycle_2026", 90)
      );

      // Only 3 peer evaluations
      const peerEvals = [
        createTestEvaluation("peer_1", "evaluator_peer", "cycle_2026", 50),
        createTestEvaluation("peer_2", "evaluator_peer", "cycle_2026", 55),
        createTestEvaluation("peer_3", "evaluator_peer", "cycle_2026", 52),
      ];

      const signal = detector.detect({
        targetEvaluation: evaluatorEvals[0],
        evaluatorEvaluations: evaluatorEvals,
        peerEvaluations: peerEvals,
      });

      expect(signal).toBeNull();
    });

    it("should respect exact minimum sample size boundary (N = minSampleSize - 1 vs N = minSampleSize)", () => {
      const peerEvals = Array.from({ length: 10 }, (_, i) =>
        createTestEvaluation(`peer_${i}`, "evaluator_peer", "cycle_2026", 60)
      );

      // Boundary - 1: exactly 4 evaluations -> null
      const fourEvals = Array.from({ length: 4 }, (_, i) =>
        createTestEvaluation(`eval_${i}`, "evaluator_alice", "cycle_2026", 85)
      );
      expect(
        detector.detect({
          targetEvaluation: fourEvals[0],
          evaluatorEvaluations: fourEvals,
          peerEvaluations: peerEvals,
        })
      ).toBeNull();

      // Boundary: exactly 5 evaluations -> triggers signal
      const fiveEvals = [
        ...fourEvals,
        createTestEvaluation("eval_4", "evaluator_alice", "cycle_2026", 85),
      ];
      const signal = detector.detect({
        targetEvaluation: fiveEvals[0],
        evaluatorEvaluations: fiveEvals,
        peerEvaluations: peerEvals,
      });
      expect(signal).not.toBeNull();
      expect(signal!.signalType).toBe(STATISTICAL_SIGNAL_TYPE);
    });

    it("should honor custom configurable minSampleSize", () => {
      const peerEvals = Array.from({ length: 10 }, (_, i) =>
        createTestEvaluation(`peer_${i}`, "evaluator_peer", "cycle_2026", 60)
      );

      // 3 evaluator evaluations
      const threeEvals = Array.from({ length: 3 }, (_, i) =>
        createTestEvaluation(`eval_${i}`, "evaluator_alice", "cycle_2026", 90)
      );

      // Under custom minSampleSize = 3, this triggers
      const signal = detector.detect({
        targetEvaluation: threeEvals[0],
        evaluatorEvaluations: threeEvals,
        peerEvaluations: peerEvals,
        config: { minSampleSize: 3 },
      });

      expect(signal).not.toBeNull();
      expect(signal!.evidence.sampleSize).toBe(3);
    });
  });

  describe("Deviation Calculation and Threshold Triggering", () => {
    it("should return null when evaluator deviation is below threshold (deviation < 15.0%)", () => {
      // Evaluator average = 64%
      const evaluatorEvals = [
        createTestEvaluation("eval_1", "evaluator_bob", "cycle_2026", 62),
        createTestEvaluation("eval_2", "evaluator_bob", "cycle_2026", 65),
        createTestEvaluation("eval_3", "evaluator_bob", "cycle_2026", 66),
        createTestEvaluation("eval_4", "evaluator_bob", "cycle_2026", 63),
        createTestEvaluation("eval_5", "evaluator_bob", "cycle_2026", 64),
      ];

      // Peer average = 60%
      const peerEvals = Array.from({ length: 10 }, (_, i) =>
        createTestEvaluation(`peer_${i}`, "evaluator_peer", "cycle_2026", 60)
      );

      const signal = detector.detect({
        targetEvaluation: evaluatorEvals[0],
        evaluatorEvaluations: evaluatorEvals,
        peerEvaluations: peerEvals,
      });

      // Deviation is 4.0%, which is below default threshold 15.0%
      expect(signal).toBeNull();

      const calc = detector.calculate(evaluatorEvals, peerEvals);
      expect(calc.evaluatorMean).toBe(64);
      expect(calc.peerMean).toBe(60);
      expect(calc.deviation).toBe(4);
      expect(calc.isAnomaly).toBe(false);
    });

    it("should generate MEDIUM severity signal on significant positive (lenient) deviation (15% <= deviation < 25%)", () => {
      // Evaluator average = 80% (lenient marker)
      const evaluatorEvals = Array.from({ length: 5 }, (_, i) =>
        createTestEvaluation(`eval_${i}`, "evaluator_lenient", "cycle_2026", 80)
      );

      // Peer average = 60%
      const peerEvals = Array.from({ length: 10 }, (_, i) =>
        createTestEvaluation(`peer_${i}`, "evaluator_peer", "cycle_2026", 60)
      );

      const target = evaluatorEvals[0];
      const signal = detector.detect({
        targetEvaluation: target,
        evaluatorEvaluations: evaluatorEvals,
        peerEvaluations: peerEvals,
      });

      expect(signal).not.toBeNull();
      expect(signal!.signalType).toBe("STATISTICAL_EVALUATOR_DEVIATION");
      expect(signal!.severity).toBe(SignalSeverity.MEDIUM);
      expect(signal!.status).toBe(QualitySignalStatus.REVIEWABLE);
      expect(signal!.evaluationId).toBe(target.id);
      expect(signal!.evaluationVersion).toBe(target.version);

      // Absolute deviation invariant
      expect(signal!.evidence.evaluatorMean).toBe(80);
      expect(signal!.evidence.peerMean).toBe(60);
      expect(signal!.evidence.deviation).toBe(20);
      expect(signal!.evidence.deviation).toBeGreaterThanOrEqual(0);
      expect(signal!.evidence.sampleSize).toBe(5);
      expect(signal!.evidence.peerSampleSize).toBe(10);
      expect(signal!.evidence.evaluationCycleId).toBe("cycle_2026");
    });

    it("should generate MEDIUM severity signal on significant negative (strict) deviation (15% <= deviation < 25%) with strictly absolute deviation", () => {
      // Evaluator average = 42% (strict marker)
      const evaluatorEvals = Array.from({ length: 6 }, (_, i) =>
        createTestEvaluation(`eval_${i}`, "evaluator_strict", "cycle_2026", 42)
      );

      // Peer average = 62%
      const peerEvals = Array.from({ length: 10 }, (_, i) =>
        createTestEvaluation(`peer_${i}`, "evaluator_peer", "cycle_2026", 62)
      );

      const target = evaluatorEvals[0];
      const signal = detector.detect({
        targetEvaluation: target,
        evaluatorEvaluations: evaluatorEvals,
        peerEvaluations: peerEvals,
      });

      expect(signal).not.toBeNull();
      expect(signal!.severity).toBe(SignalSeverity.MEDIUM);

      // Absolute deviation invariant: |42 - 62| = 20, strictly non-negative
      expect(signal!.evidence.evaluatorMean).toBe(42);
      expect(signal!.evidence.peerMean).toBe(62);
      expect(signal!.evidence.deviation).toBe(20);
      expect(signal!.evidence.deviation).toBe(Math.abs(42 - 62));
    });

    it("should generate HIGH severity signal on extreme deviation (deviation >= 25.0%)", () => {
      // Evaluator average = 92%
      const evaluatorEvals = Array.from({ length: 5 }, (_, i) =>
        createTestEvaluation(`eval_${i}`, "evaluator_extreme", "cycle_2026", 92)
      );

      // Peer average = 60%
      const peerEvals = Array.from({ length: 10 }, (_, i) =>
        createTestEvaluation(`peer_${i}`, "evaluator_peer", "cycle_2026", 60)
      );

      const signal = detector.detect({
        targetEvaluation: evaluatorEvals[0],
        evaluatorEvaluations: evaluatorEvals,
        peerEvaluations: peerEvals,
      });

      expect(signal).not.toBeNull();
      expect(signal!.severity).toBe(SignalSeverity.HIGH);
      expect(signal!.evidence.deviation).toBe(32);
    });

    it("should honor custom threshold and criticalThreshold configuration", () => {
      // Evaluator average = 70%, Peer average = 60% (deviation = 10%)
      const evaluatorEvals = Array.from({ length: 5 }, (_, i) =>
        createTestEvaluation(`eval_${i}`, "evaluator_custom", "cycle_2026", 70)
      );
      const peerEvals = Array.from({ length: 10 }, (_, i) =>
        createTestEvaluation(`peer_${i}`, "evaluator_peer", "cycle_2026", 60)
      );

      // Default threshold 15% -> returns null
      expect(
        detector.detect({
          targetEvaluation: evaluatorEvals[0],
          evaluatorEvaluations: evaluatorEvals,
          peerEvaluations: peerEvals,
        })
      ).toBeNull();

      // Custom threshold 8% -> triggers MEDIUM
      const mediumSignal = detector.detect({
        targetEvaluation: evaluatorEvals[0],
        evaluatorEvaluations: evaluatorEvals,
        peerEvaluations: peerEvals,
        config: { thresholdPercent: 8, criticalThresholdPercent: 12 },
      });
      expect(mediumSignal).not.toBeNull();
      expect(mediumSignal!.severity).toBe(SignalSeverity.MEDIUM);

      // Custom critical threshold 10% -> triggers HIGH
      const highSignal = detector.detect({
        targetEvaluation: evaluatorEvals[0],
        evaluatorEvaluations: evaluatorEvals,
        peerEvaluations: peerEvals,
        config: { thresholdPercent: 5, criticalThresholdPercent: 10 },
      });
      expect(highSignal).not.toBeNull();
      expect(highSignal!.severity).toBe(SignalSeverity.HIGH);
    });
  });

  describe("Detector Provenance and Evidence Conformance (02-architecture §18, 05-domain §34)", () => {
    it("should retain full provenance and interpretable evidence on generated QualitySignal", () => {
      const evaluatorEvals = Array.from({ length: 7 }, (_, i) =>
        createTestEvaluation(`eval_${i}`, "evaluator_prov", "cycle_spring_2026", 82)
      );
      const peerEvals = Array.from({ length: 12 }, (_, i) =>
        createTestEvaluation(`peer_${i}`, "evaluator_peer", "cycle_spring_2026", 62)
      );

      const target = evaluatorEvals[0];
      const signal = detector.detect({
        targetEvaluation: target,
        evaluatorEvaluations: evaluatorEvals,
        peerEvaluations: peerEvals,
      });

      expect(signal).not.toBeNull();

      // 1. Provenance conforms to DetectorProvenance schema
      expect(signal!.detector).toEqual({
        type: "STATISTICAL",
        name: "evaluator-mean-deviation-detector",
        version: "1.0.0",
        config: {
          minSampleSize: 5,
          thresholdPercent: 15.0,
          criticalThresholdPercent: 25.0,
        },
      });

      // 2. Evidence conforms to 02-architecture-contract §18
      expect(signal!.evidence).toEqual({
        evaluatorMean: 82,
        peerMean: 62,
        deviation: 20,
        sampleSize: 7,
        peerSampleSize: 12,
        evaluationCycleId: "cycle_spring_2026",
        thresholdPercent: 15.0,
      });

      // 3. Summary provides human-interpretable contextual explanation
      expect(signal!.summary).toContain("Evaluator mean (82%)");
      expect(signal!.summary).toContain("deviates by 20%");
      expect(signal!.summary).toContain("peer baseline (62%)");
      expect(signal!.summary).toContain("cycle_spring_2026");
      expect(signal!.summary).toContain("sample size: 7");
    });
  });

  describe("Statistical Non-Authority and Mark Invariance (INV-004, INV-003)", () => {
    it("should guarantee that statistical detection leaves evaluation marks, scores, and status untouched", () => {
      const target = createTestEvaluation("target_eval", "eval_user", "cycle_2026", 88, 100);
      const initialTotalScore = target.totalScore;
      const initialMaxScore = target.maxPossibleScore;
      const initialMarks = target.getAllMarks();
      const initialStatus = target.status;

      const evaluatorEvals = [
        target,
        createTestEvaluation("eval_2", "eval_user", "cycle_2026", 86),
        createTestEvaluation("eval_3", "eval_user", "cycle_2026", 89),
        createTestEvaluation("eval_4", "eval_user", "cycle_2026", 90),
        createTestEvaluation("eval_5", "eval_user", "cycle_2026", 87),
      ];

      const peerEvals = Array.from({ length: 10 }, (_, i) =>
        createTestEvaluation(`peer_${i}`, "evaluator_peer", "cycle_2026", 60)
      );

      // Run detection
      const signal = detector.detect({
        targetEvaluation: target,
        evaluatorEvaluations: evaluatorEvals,
        peerEvaluations: peerEvals,
      });

      expect(signal).not.toBeNull();

      // Assert target evaluation invariant
      expect(target.totalScore).toBe(initialTotalScore);
      expect(target.maxPossibleScore).toBe(initialMaxScore);
      expect(target.status).toBe(initialStatus);
      expect(target.getAllMarks()).toEqual(initialMarks);
      expect(target.getMark(`q_target_eval`)?.awardedMarks).toBe(88);
    });
  });

  describe("Deterministic Reproducibility (Testing Contract §40)", () => {
    it("should produce identical statistical calculations and evidence across 50 repeated executions", () => {
      const evaluatorEvals = Array.from({ length: 8 }, (_, i) =>
        createTestEvaluation(`eval_${i}`, "evaluator_rep", "cycle_2026", 78)
      );
      const peerEvals = Array.from({ length: 15 }, (_, i) =>
        createTestEvaluation(`peer_${i}`, "evaluator_peer", "cycle_2026", 58)
      );

      const target = evaluatorEvals[0];
      const baseline = detector.detect({
        targetEvaluation: target,
        evaluatorEvaluations: evaluatorEvals,
        peerEvaluations: peerEvals,
      });

      expect(baseline).not.toBeNull();

      for (let i = 0; i < 50; i++) {
        const next = detector.detect({
          targetEvaluation: target,
          evaluatorEvaluations: evaluatorEvals,
          peerEvaluations: peerEvals,
        });

        expect(next).not.toBeNull();
        expect(next!.signalType).toBe(baseline!.signalType);
        expect(next!.severity).toBe(baseline!.severity);
        expect(next!.status).toBe(baseline!.status);
        expect(next!.summary).toBe(baseline!.summary);
        expect(next!.detector).toEqual(baseline!.detector);
        expect(next!.evidence).toEqual(baseline!.evidence);
      }
    });
  });
});
