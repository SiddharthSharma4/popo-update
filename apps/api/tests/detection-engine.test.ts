/**
 * Statistical Detection Engine Unit Tests (TASK-P4-INTEL-002).
 * Verifies StatisticalDetectionEngine behavior against:
 * - docs/contracts/02-architecture-contract.md §17 (Statistical Detection Engine)
 * - docs/contracts/02-architecture-contract.md §18 (Detector Provenance)
 * - docs/contracts/02-architecture-contract.md §40 (Synchronous Execution)
 * - docs/contracts/05-domain-contract.md §19 (QualitySignal Generation)
 * - docs/contracts/05-domain-contract.md §45 (Synchronous Domain Work)
 * - Invariant INV-004: Statistical observation is not a finding; leaves evaluations untouched.
 * - Invariant INV-003: Non-authority; pure observation.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { SignalSeverity, QualitySignalStatus } from "@osm/shared";
import { Evaluation } from "../src/domain/evaluation/evaluation.js";
import { QualitySignal } from "../src/domain/quality-signal/quality-signal.js";
import {
  StatisticalDetectionEngine,
  EvaluatorMeanDeviationDetector,
  type StatisticalDetector,
  type StatisticalDetectorInput,
} from "../src/domain/quality-signal/index.js";
import { InvalidArgumentError } from "../src/domain/errors.js";

describe("TASK-P4-INTEL-002: StatisticalDetectionEngine (Detector Framework)", () => {
  let engine: StatisticalDetectionEngine;

  beforeEach(() => {
    engine = new StatisticalDetectionEngine();
  });

  /**
   * Helper to create a test evaluation with given score.
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

  describe("Detector Registration and Registry Queries", () => {
    it("should start with an empty detector registry", () => {
      expect(engine.listDetectors()).toHaveLength(0);
      expect(engine.hasDetector("any-detector")).toBe(false);
      expect(engine.getDetector("any-detector")).toBeUndefined();
    });

    it("should register a detector and allow retrieval by name", () => {
      const detector = new EvaluatorMeanDeviationDetector();
      engine.register(detector);

      expect(engine.hasDetector(detector.name)).toBe(true);
      expect(engine.getDetector(detector.name)).toBe(detector);
      expect(engine.listDetectors()).toHaveLength(1);
      expect(engine.listDetectors()[0].name).toBe(detector.name);
    });

    it("should accept initial detectors via constructor", () => {
      const detector = new EvaluatorMeanDeviationDetector();
      const preloadedEngine = new StatisticalDetectionEngine([detector]);

      expect(preloadedEngine.hasDetector(detector.name)).toBe(true);
      expect(preloadedEngine.listDetectors()).toHaveLength(1);
    });

    it("should reject duplicate detector registration with InvalidArgumentError", () => {
      const detector1 = new EvaluatorMeanDeviationDetector();
      const detector2 = new EvaluatorMeanDeviationDetector();

      engine.register(detector1);
      expect(() => engine.register(detector2)).toThrow(InvalidArgumentError);
      expect(() => engine.register(detector2)).toThrow(/already registered/);
    });

    it("should reject detector registration with invalid or empty name/version", () => {
      expect(() => engine.register(null as unknown as StatisticalDetector)).toThrow(
        InvalidArgumentError
      );
      expect(() =>
        engine.register({
          name: "",
          version: "1.0.0",
          detect: () => null,
        })
      ).toThrow(InvalidArgumentError);
      expect(() =>
        engine.register({
          name: "valid-name",
          version: "",
          detect: () => null,
        })
      ).toThrow(InvalidArgumentError);
    });
  });

  describe("Engine Execution with EvaluatorMeanDeviationDetector", () => {
    it("should execute registered detector and return generated QualitySignal on deviation", () => {
      const detector = new EvaluatorMeanDeviationDetector();
      engine.register(detector);

      // Evaluator average = 82% (lenient marker)
      const evaluatorEvals = Array.from({ length: 5 }, (_, i) =>
        createTestEvaluation(`eval_${i}`, "evaluator_lenient", "cycle_2026", 82)
      );

      // Peer average = 60%
      const peerEvals = Array.from({ length: 10 }, (_, i) =>
        createTestEvaluation(`peer_${i}`, "evaluator_peer", "cycle_2026", 60)
      );

      const target = evaluatorEvals[0];
      const signals = engine.execute({
        targetEvaluation: target,
        evaluatorEvaluations: evaluatorEvals,
        peerEvaluations: peerEvals,
      });

      expect(signals).toHaveLength(1);
      const signal = signals[0];
      expect(signal.signalType).toBe("STATISTICAL_EVALUATOR_DEVIATION");
      expect(signal.severity).toBe(SignalSeverity.MEDIUM);
      expect(signal.status).toBe(QualitySignalStatus.REVIEWABLE);
      expect(signal.evaluationId).toBe(target.id);
      expect(signal.evidence.deviation).toBe(22);
      expect(signal.evidence.evaluatorMean).toBe(82);
      expect(signal.evidence.peerMean).toBe(60);
      expect(signal.detector.name).toBe("evaluator-mean-deviation-detector");
    });

    it("should return empty array when registered detector finds no anomaly", () => {
      const detector = new EvaluatorMeanDeviationDetector();
      engine.register(detector);

      // Evaluator average = 62%
      const evaluatorEvals = Array.from({ length: 5 }, (_, i) =>
        createTestEvaluation(`eval_${i}`, "evaluator_normal", "cycle_2026", 62)
      );

      // Peer average = 60% (deviation = 2%, below threshold 15%)
      const peerEvals = Array.from({ length: 10 }, (_, i) =>
        createTestEvaluation(`peer_${i}`, "evaluator_peer", "cycle_2026", 60)
      );

      const target = evaluatorEvals[0];
      const signals = engine.execute({
        targetEvaluation: target,
        evaluatorEvaluations: evaluatorEvals,
        peerEvaluations: peerEvals,
      });

      expect(signals).toEqual([]);
    });

    it("should return empty array when engine has no registered detectors", () => {
      const target = createTestEvaluation("target_eval", "eval_user", "cycle_2026", 75);
      const signals = engine.execute({
        targetEvaluation: target,
        evaluatorEvaluations: [target],
        peerEvaluations: [],
      });

      expect(signals).toEqual([]);
    });

    it("should reject execute with missing or invalid input", () => {
      expect(() => engine.execute(null as unknown as StatisticalDetectorInput)).toThrow(
        InvalidArgumentError
      );
      expect(() =>
        engine.execute({
          targetEvaluation: null as unknown as Evaluation,
          evaluatorEvaluations: [],
          peerEvaluations: [],
        })
      ).toThrow(InvalidArgumentError);
    });
  });

  describe("Multi-Detector Execution and Aggregation", () => {
    it("should aggregate signals across multiple registered detectors", () => {
      const meanDetector = new EvaluatorMeanDeviationDetector();

      // Create a second mock statistical detector
      const customDetector: StatisticalDetector = {
        name: "mock-distribution-shift-detector",
        version: "1.0.0",
        detect: (input: StatisticalDetectorInput) => {
          return QualitySignal.create({
            evaluationId: input.targetEvaluation.id,
            evaluationVersion: input.targetEvaluation.version,
            signalType: "STATISTICAL_DISTRIBUTION_SHIFT",
            severity: SignalSeverity.HIGH,
            status: QualitySignalStatus.REVIEWABLE,
            summary: "Mock distribution shift detected.",
            evidence: { shiftScore: 0.85 },
            detector: {
              type: "STATISTICAL",
              name: "mock-distribution-shift-detector",
              version: "1.0.0",
            },
          });
        },
      };

      engine.register(meanDetector);
      engine.register(customDetector);

      // 85% vs 60% triggers mean deviation (MEDIUM)
      const evaluatorEvals = Array.from({ length: 5 }, (_, i) =>
        createTestEvaluation(`eval_${i}`, "eval_multi", "cycle_2026", 85)
      );
      const peerEvals = Array.from({ length: 10 }, (_, i) =>
        createTestEvaluation(`peer_${i}`, "eval_peer", "cycle_2026", 60)
      );

      const target = evaluatorEvals[0];
      const signals = engine.execute({
        targetEvaluation: target,
        evaluatorEvaluations: evaluatorEvals,
        peerEvaluations: peerEvals,
      });

      expect(signals).toHaveLength(2);
      const signalTypes = signals.map((s) => s.signalType);
      expect(signalTypes).toContain("STATISTICAL_EVALUATOR_DEVIATION");
      expect(signalTypes).toContain("STATISTICAL_DISTRIBUTION_SHIFT");
    });
  });

  describe("Fail-Fast Error Handling", () => {
    it("should propagate unhandled detector exceptions immediately (fail-fast)", () => {
      const faultyDetector: StatisticalDetector = {
        name: "faulty-detector",
        version: "1.0.0",
        detect: () => {
          throw new Error("Unexpected detector calculation failure");
        },
      };

      engine.register(faultyDetector);

      const target = createTestEvaluation("target", "user", "cycle_2026", 80);
      expect(() =>
        engine.execute({
          targetEvaluation: target,
          evaluatorEvaluations: [target],
          peerEvaluations: [],
        })
      ).toThrow("Unexpected detector calculation failure");
    });
  });

  describe("Non-Authority Invariance (INV-004, INV-003)", () => {
    it("should leave target and baseline evaluations completely unmutated across engine execution", () => {
      const detector = new EvaluatorMeanDeviationDetector();
      engine.register(detector);

      const target = createTestEvaluation("eval_target", "eval_user", "cycle_2026", 85);
      const initialMarks = target.getAllMarks();
      const initialTotalScore = target.totalScore;
      const initialMaxScore = target.maxPossibleScore;
      const initialStatus = target.status;

      const evaluatorEvals = [
        target,
        createTestEvaluation("eval_2", "eval_user", "cycle_2026", 85),
        createTestEvaluation("eval_3", "eval_user", "cycle_2026", 85),
        createTestEvaluation("eval_4", "eval_user", "cycle_2026", 85),
        createTestEvaluation("eval_5", "eval_user", "cycle_2026", 85),
      ];

      const peerEvals = Array.from({ length: 10 }, (_, i) =>
        createTestEvaluation(`peer_${i}`, "eval_peer", "cycle_2026", 60)
      );

      const signals = engine.execute({
        targetEvaluation: target,
        evaluatorEvaluations: evaluatorEvals,
        peerEvaluations: peerEvals,
      });

      expect(signals).toHaveLength(1);

      // Verify strict mark and score invariance
      expect(target.getAllMarks()).toEqual(initialMarks);
      expect(target.totalScore).toBe(initialTotalScore);
      expect(target.maxPossibleScore).toBe(initialMaxScore);
      expect(target.status).toBe(initialStatus);
    });
  });

  describe("Deterministic Reproducibility (Testing Contract §40)", () => {
    it("should produce identical signal outputs across 50 repeated engine executions", () => {
      const detector = new EvaluatorMeanDeviationDetector();
      engine.register(detector);

      const evaluatorEvals = Array.from({ length: 6 }, (_, i) =>
        createTestEvaluation(`eval_${i}`, "eval_det", "cycle_2026", 84)
      );
      const peerEvals = Array.from({ length: 12 }, (_, i) =>
        createTestEvaluation(`peer_${i}`, "eval_peer", "cycle_2026", 60)
      );

      const target = evaluatorEvals[0];
      const baseline = engine.execute({
        targetEvaluation: target,
        evaluatorEvaluations: evaluatorEvals,
        peerEvaluations: peerEvals,
      });

      expect(baseline).toHaveLength(1);

      for (let i = 0; i < 50; i++) {
        const next = engine.execute({
          targetEvaluation: target,
          evaluatorEvaluations: evaluatorEvals,
          peerEvaluations: peerEvals,
        });

        expect(next).toHaveLength(1);
        expect(next[0].signalType).toBe(baseline[0].signalType);
        expect(next[0].severity).toBe(baseline[0].severity);
        expect(next[0].status).toBe(baseline[0].status);
        expect(next[0].summary).toBe(baseline[0].summary);
        expect(next[0].evidence).toEqual(baseline[0].evidence);
        expect(next[0].detector).toEqual(baseline[0].detector);
      }
    });
  });
});
