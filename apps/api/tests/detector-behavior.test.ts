/**
 * Statistical Detector Behavior & Population Verification Tests (TASK-P4-INTEL-003).
 *
 * Verifies end-to-end behavioral properties, population-cohort dynamics, false-positive boundaries,
 * sample-size edge cases, and non-authority invariants of the Statistical Quality Detector framework against:
 * - docs/contracts/02-architecture-contract.md §17 (Statistical Detection Engine)
 * - docs/contracts/02-architecture-contract.md §18 (Detector Provenance & Evidence)
 * - docs/contracts/02-architecture-contract.md §40 (Synchronous Domain Execution)
 * - docs/contracts/05-domain-contract.md §19-21 (QualitySignal Aggregate)
 * - docs/contracts/05-domain-contract.md §33-34 (Statistical Context Requirement)
 * - docs/contracts/09-testing-contract.md §40 (Detector Testing & Reproducibility)
 * - docs/contracts/09-testing-contract.md §41 (QualitySignal Non-Authority Invariant)
 * - docs/contracts/09-testing-contract.md §80 (Detector/Model Reproducibility)
 * - docs/quality-loops/osm-step5-build-plan-quality-loop.md §12 (Phase 4 — Quality Signal Engine & False-Positive Design)
 *
 * Invariants & Testing Principles:
 * - Pure in-memory deterministic test fixtures (no production generator or DB seeder).
 * - Non-authority (INV-003, INV-004): detectors establish statistical observations, NOT academic findings,
 *   misconduct, or grading correctness. Evaluation marks and statuses remain 100% immutable.
 * - Peer Baseline Construction Interpretation: In an evaluation cycle population, the peer baseline for a given
 *   evaluator E is the collection of evaluations marked by all other evaluators in that cycle (evaluatorId !== E.id).
 * - Strict deterministic reproducibility across repeated runs.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { SignalSeverity, QualitySignalStatus } from "@osm/shared";
import { Evaluation } from "../src/domain/evaluation/evaluation.js";
import {
  StatisticalDetectionEngine,
  EvaluatorMeanDeviationDetector,
} from "../src/domain/quality-signal/index.js";

describe("TASK-P4-INTEL-003: Statistical Detector Behavior & Population Verification", () => {
  let detector: EvaluatorMeanDeviationDetector;
  let engine: StatisticalDetectionEngine;

  beforeEach(() => {
    detector = new EvaluatorMeanDeviationDetector();
    engine = new StatisticalDetectionEngine([detector]);
  });

  /**
   * Helper function to create an Evaluation aggregate with a specified percentage score.
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

  /**
   * Helper to generate a cohort of evaluations for an evaluator with a given score profile.
   */
  function createEvaluatorCohort(
    evaluatorId: string,
    cycleId: string,
    scores: number[],
    idPrefix: string
  ): Evaluation[] {
    return scores.map((score, index) =>
      createTestEvaluation(`${idPrefix}_${index + 1}`, evaluatorId, cycleId, score)
    );
  }

  describe("1. Multi-Evaluator Population Cohort Behavior", () => {
    it("should selectively identify statistical outlier evaluators while producing no signals for conformant evaluators in a cycle cohort", () => {
      const cycleId = "cycle_exam_2026";

      // 5 evaluators in the same examination cycle:
      // Evaluator A (conformant): 6 evaluations averaging 61%
      const evalsA = createEvaluatorCohort("evaluator_A", cycleId, [60, 62, 59, 63, 60, 61], "eval_a");
      // Evaluator B (conformant): 6 evaluations averaging 59%
      const evalsB = createEvaluatorCohort("evaluator_B", cycleId, [58, 60, 59, 61, 57, 59], "eval_b");
      // Evaluator C (conformant): 6 evaluations averaging 60%
      const evalsC = createEvaluatorCohort("evaluator_C", cycleId, [61, 59, 60, 62, 58, 60], "eval_c");
      // Evaluator D (statistical outlier - higher average): 6 evaluations averaging 84%
      const evalsD = createEvaluatorCohort("evaluator_D", cycleId, [85, 83, 84, 86, 82, 84], "eval_d");
      // Evaluator E (statistical outlier - lower average): 6 evaluations averaging 38%
      const evalsE = createEvaluatorCohort("evaluator_E", cycleId, [38, 40, 36, 39, 37, 38], "eval_e");

      const allEvaluations = [...evalsA, ...evalsB, ...evalsC, ...evalsD, ...evalsE];
      const evaluators = [
        { id: "evaluator_A", evals: evalsA },
        { id: "evaluator_B", evals: evalsB },
        { id: "evaluator_C", evals: evalsC },
        { id: "evaluator_D", evals: evalsD },
        { id: "evaluator_E", evals: evalsE },
      ];

      // Evaluate each evaluator against their respective peer baseline (all other evaluators)
      const populationSignals = evaluators.flatMap(({ id, evals }) => {
        const peerEvals = allEvaluations.filter((e) => e.evaluatorId !== id);
        return engine.execute({
          targetEvaluation: evals[0],
          evaluatorEvaluations: evals,
          peerEvaluations: peerEvals,
        });
      });

      // Exactly 2 outlier evaluators should produce quality signals
      expect(populationSignals).toHaveLength(2);

      const signaledEvaluatorIds = populationSignals.map((s) => s.evidence.evaluatorId ?? s.evaluationId);
      expect(signaledEvaluatorIds).toContain(evalsD[0].id);
      expect(signaledEvaluatorIds).toContain(evalsE[0].id);

      // Verify that conformant evaluators produced zero signals
      const conformantSignals = populationSignals.filter(
        (s) => s.evaluationId === evalsA[0].id || s.evaluationId === evalsB[0].id || s.evaluationId === evalsC[0].id
      );
      expect(conformantSignals).toHaveLength(0);
    });
  });

  describe("2. Legitimate Variation Resilience (osm-step5-build-plan §12)", () => {
    it("should produce no signal when an evaluator exhibits legitimate variation within normal tolerance (< 15.0%)", () => {
      const cycleId = "cycle_exam_2026";

      // Evaluator with legitimate variation: 10 evaluations averaging 68%
      const evaluatorEvals = createEvaluatorCohort(
        "evaluator_variation",
        cycleId,
        [65, 70, 68, 66, 71, 67, 69, 68, 67, 69],
        "eval_var"
      );

      // Peer baseline: 20 evaluations averaging 60%
      const peerEvals = createEvaluatorCohort(
        "evaluator_peers",
        cycleId,
        Array.from({ length: 20 }, () => 60),
        "peer_eval"
      );

      // Deviation is |68.00 - 60.00| = 8.00% (< 15.00% threshold)
      const calculation = detector.calculate(evaluatorEvals, peerEvals);
      expect(calculation.deviation).toBe(8);
      expect(calculation.isAnomaly).toBe(false);
      expect(calculation.severity).toBeNull();

      const signal = detector.detect({
        targetEvaluation: evaluatorEvals[0],
        evaluatorEvaluations: evaluatorEvals,
        peerEvaluations: peerEvals,
      });
      expect(signal).toBeNull();

      const engineSignals = engine.execute({
        targetEvaluation: evaluatorEvals[0],
        evaluatorEvaluations: evaluatorEvals,
        peerEvaluations: peerEvals,
      });
      expect(engineSignals).toEqual([]);
    });
  });

  describe("3. Exact Threshold Boundary Behavior around 15.0%", () => {
    it("should not produce a signal when deviation is strictly below threshold (deviation = 14.99%)", () => {
      // 10 evaluations at 74.99% vs peer mean of 60.00% -> deviation = 14.99%
      const evaluatorEvals = [
        createTestEvaluation("eval_sub_1", "eval_tester", "cycle_1", 74.95),
        createTestEvaluation("eval_sub_2", "eval_tester", "cycle_1", 75.00),
        createTestEvaluation("eval_sub_3", "eval_tester", "cycle_1", 75.00),
        createTestEvaluation("eval_sub_4", "eval_tester", "cycle_1", 75.00),
        createTestEvaluation("eval_sub_5", "eval_tester", "cycle_1", 75.00),
      ]; // average = (74.95 + 75*4) / 5 = 74.99%

      const peerEvals = Array.from({ length: 10 }, (_, i) =>
        createTestEvaluation(`peer_${i}`, "eval_peer", "cycle_1", 60)
      );

      const result = detector.calculate(evaluatorEvals, peerEvals);
      expect(result.evaluatorMean).toBe(74.99);
      expect(result.peerMean).toBe(60);
      expect(result.deviation).toBe(14.99);
      expect(result.isAnomaly).toBe(false);
      expect(result.severity).toBeNull();

      const signal = detector.detect({
        targetEvaluation: evaluatorEvals[0],
        evaluatorEvaluations: evaluatorEvals,
        peerEvaluations: peerEvals,
      });
      expect(signal).toBeNull();
    });

    it("should produce a signal when deviation exactly meets threshold (deviation = 15.00%)", () => {
      // 5 evaluations at 75.00% vs peer mean of 60.00% -> deviation = 15.00%
      const evaluatorEvals = Array.from({ length: 5 }, (_, i) =>
        createTestEvaluation(`eval_exact_${i}`, "eval_tester", "cycle_1", 75)
      );

      const peerEvals = Array.from({ length: 10 }, (_, i) =>
        createTestEvaluation(`peer_${i}`, "eval_peer", "cycle_1", 60)
      );

      const result = detector.calculate(evaluatorEvals, peerEvals);
      expect(result.evaluatorMean).toBe(75);
      expect(result.peerMean).toBe(60);
      expect(result.deviation).toBe(15);
      expect(result.isAnomaly).toBe(true);
      expect(result.severity).toBe(SignalSeverity.MEDIUM);

      const signal = detector.detect({
        targetEvaluation: evaluatorEvals[0],
        evaluatorEvaluations: evaluatorEvals,
        peerEvaluations: peerEvals,
      });
      expect(signal).not.toBeNull();
      expect(signal?.severity).toBe(SignalSeverity.MEDIUM);
      expect(signal?.evidence.deviation).toBe(15);
    });
  });

  describe("4. Evaluator Sample-Size Suppression (N < 5)", () => {
    it("should suppress signal generation when evaluator has fewer than 5 evaluations regardless of extreme scores", () => {
      // Evaluator has only 4 evaluations, but with an extreme average of 95% against peer mean of 45% (deviation 50%)
      const evaluatorEvals = [
        createTestEvaluation("eval_small_1", "eval_low_n", "cycle_2026", 95),
        createTestEvaluation("eval_small_2", "eval_low_n", "cycle_2026", 95),
        createTestEvaluation("eval_small_3", "eval_low_n", "cycle_2026", 95),
        createTestEvaluation("eval_small_4", "eval_low_n", "cycle_2026", 95),
      ];

      const peerEvals = Array.from({ length: 20 }, (_, i) =>
        createTestEvaluation(`peer_${i}`, "peer_eval", "cycle_2026", 45)
      );

      const result = detector.calculate(evaluatorEvals, peerEvals);
      expect(result.sampleSize).toBe(4);
      expect(result.isAnomaly).toBe(false);
      expect(result.severity).toBeNull();

      const signal = detector.detect({
        targetEvaluation: evaluatorEvals[0],
        evaluatorEvaluations: evaluatorEvals,
        peerEvaluations: peerEvals,
      });
      expect(signal).toBeNull();
    });
  });

  describe("5. Peer Sample-Size Suppression (Peer N < 5)", () => {
    it("should suppress signal generation when peer baseline cohort has fewer than 5 evaluations", () => {
      // Evaluator has 10 evaluations at 90%
      const evaluatorEvals = Array.from({ length: 10 }, (_, i) =>
        createTestEvaluation(`eval_good_${i}`, "eval_target", "cycle_2026", 90)
      );

      // Peer baseline has only 3 evaluations (insufficient peer sample)
      const peerEvals = [
        createTestEvaluation("peer_1", "peer_low_n", "cycle_2026", 50),
        createTestEvaluation("peer_2", "peer_low_n", "cycle_2026", 52),
        createTestEvaluation("peer_3", "peer_low_n", "cycle_2026", 48),
      ];

      const result = detector.calculate(evaluatorEvals, peerEvals);
      expect(result.peerSampleSize).toBe(3);
      expect(result.isAnomaly).toBe(false);
      expect(result.severity).toBeNull();

      const signal = detector.detect({
        targetEvaluation: evaluatorEvals[0],
        evaluatorEvaluations: evaluatorEvals,
        peerEvaluations: peerEvals,
      });
      expect(signal).toBeNull();
    });
  });

  describe("6. MEDIUM Severity at Appropriate Threshold (15.0% <= deviation < 25.0%)", () => {
    it("should classify deviation in [15.0%, 25.0%) as MEDIUM severity", () => {
      // Evaluator average = 78.00% vs peer mean = 60.00% (deviation = 18.00%)
      const evaluatorEvals = Array.from({ length: 6 }, (_, i) =>
        createTestEvaluation(`eval_med_${i}`, "eval_medium", "cycle_1", 78)
      );
      const peerEvals = Array.from({ length: 12 }, (_, i) =>
        createTestEvaluation(`peer_${i}`, "peer_user", "cycle_1", 60)
      );

      const signal = detector.detect({
        targetEvaluation: evaluatorEvals[0],
        evaluatorEvaluations: evaluatorEvals,
        peerEvaluations: peerEvals,
      });

      expect(signal).not.toBeNull();
      expect(signal?.severity).toBe(SignalSeverity.MEDIUM);
      expect(signal?.evidence.deviation).toBe(18);
      expect(signal?.evidence.evaluatorMean).toBe(78);
      expect(signal?.evidence.peerMean).toBe(60);
      expect(signal?.status).toBe(QualitySignalStatus.REVIEWABLE);
    });
  });

  describe("7. HIGH Severity at Appropriate Threshold (deviation >= 25.0%)", () => {
    it("should classify deviation >= 25.0% as HIGH severity", () => {
      // Evaluator average = 88.00% vs peer mean = 60.00% (deviation = 28.00%)
      const evaluatorEvals = Array.from({ length: 6 }, (_, i) =>
        createTestEvaluation(`eval_high_${i}`, "eval_high", "cycle_1", 88)
      );
      const peerEvals = Array.from({ length: 12 }, (_, i) =>
        createTestEvaluation(`peer_${i}`, "peer_user", "cycle_1", 60)
      );

      const signal = detector.detect({
        targetEvaluation: evaluatorEvals[0],
        evaluatorEvaluations: evaluatorEvals,
        peerEvaluations: peerEvals,
      });

      expect(signal).not.toBeNull();
      expect(signal?.severity).toBe(SignalSeverity.HIGH);
      expect(signal?.evidence.deviation).toBe(28);
      expect(signal?.evidence.evaluatorMean).toBe(88);
      expect(signal?.evidence.peerMean).toBe(60);
      expect(signal?.status).toBe(QualitySignalStatus.REVIEWABLE);
    });
  });

  describe("8. StatisticalDetectionEngine Orchestration Across Population", () => {
    it("should orchestrate detector execution across an entire cycle cohort and aggregate all non-null signals", () => {
      const cycleId = "cycle_aggregate_test";

      // 4 evaluators in cycle:
      // E1: 10 evals at 60% (conformant, deviation 13.75% < 15%) -> 0 signals
      const evals1 = createEvaluatorCohort("eval_1", cycleId, Array.from({ length: 10 }, () => 60), "e1");
      // E2: 10 evals at 60% (conformant, deviation 13.75% < 15%) -> 0 signals
      const evals2 = createEvaluatorCohort("eval_2", cycleId, Array.from({ length: 10 }, () => 60), "e2");
      // E3: 5 evals at 83% (peer mean 66.40%, deviation 16.60% in [15%, 25%)) -> 1 MEDIUM signal
      const evals3 = createEvaluatorCohort("eval_3", cycleId, [83, 83, 83, 83, 83], "e3");
      // E4: 5 evals at 92% (peer mean 64.60%, deviation 27.40% >= 25%) -> 1 HIGH signal
      const evals4 = createEvaluatorCohort("eval_4", cycleId, [92, 92, 92, 92, 92], "e4");

      const allCycleEvals = [...evals1, ...evals2, ...evals3, ...evals4];
      const evaluatorCohorts = [evals1, evals2, evals3, evals4];

      const cycleSignals = evaluatorCohorts.flatMap((cohort) => {
        const target = cohort[0];
        const peers = allCycleEvals.filter((e) => e.evaluatorId !== target.evaluatorId);
        return engine.execute({
          targetEvaluation: target,
          evaluatorEvaluations: cohort,
          peerEvaluations: peers,
        });
      });

      expect(cycleSignals).toHaveLength(2);
      expect(cycleSignals[0].severity).toBe(SignalSeverity.MEDIUM);
      expect(cycleSignals[1].severity).toBe(SignalSeverity.HIGH);
      expect(cycleSignals[0].detector.name).toBe("evaluator-mean-deviation-detector");
      expect(cycleSignals[1].detector.name).toBe("evaluator-mean-deviation-detector");
    });
  });

  describe("9. Empty / No-Outlier Population Behavior", () => {
    it("should return an empty signal list when all evaluators in a cycle evaluate within expected variance", () => {
      const cycleId = "cycle_uniform";

      // 3 evaluators all marking around 60%
      const evals1 = createEvaluatorCohort("eval_1", cycleId, [60, 61, 59, 60, 62], "u1");
      const evals2 = createEvaluatorCohort("eval_2", cycleId, [59, 60, 61, 59, 60], "u2");
      const evals3 = createEvaluatorCohort("eval_3", cycleId, [61, 59, 60, 62, 60], "u3");

      const allEvals = [...evals1, ...evals2, ...evals3];
      const cohorts = [evals1, evals2, evals3];

      const signals = cohorts.flatMap((cohort) => {
        const target = cohort[0];
        const peers = allEvals.filter((e) => e.evaluatorId !== target.evaluatorId);
        return engine.execute({
          targetEvaluation: target,
          evaluatorEvaluations: cohort,
          peerEvaluations: peers,
        });
      });

      expect(signals).toEqual([]);
    });

    it("should handle an empty peer baseline gracefully by returning empty signals without errors", () => {
      const target = createTestEvaluation("eval_alone", "eval_lonely", "cycle_empty", 75);
      const signals = engine.execute({
        targetEvaluation: target,
        evaluatorEvaluations: [target],
        peerEvaluations: [],
      });

      expect(signals).toEqual([]);
    });
  });

  describe("10. Statistical Non-Authority & Evaluation Immutability (INV-003, INV-004)", () => {
    it("should guarantee that population-wide statistical detection leaves all evaluations, marks, and statuses completely unaltered", () => {
      const cycleId = "cycle_invariance_test";

      const evals1 = createEvaluatorCohort("eval_inv_1", cycleId, [88, 86, 90, 87, 89], "inv1");
      const evals2 = createEvaluatorCohort("eval_inv_2", cycleId, [50, 52, 48, 51, 49], "inv2");
      const allEvaluations = [...evals1, ...evals2];

      // Take deep snapshots of evaluation state before running detection
      const preExecutionSnapshots = allEvaluations.map((e) => ({
        id: e.id,
        version: e.version,
        status: e.status,
        totalScore: e.totalScore,
        maxPossibleScore: e.maxPossibleScore,
        marks: JSON.stringify(e.getAllMarks()),
      }));

      // Execute engine across both cohorts
      const target1 = evals1[0];
      const target2 = evals2[0];

      const signals1 = engine.execute({
        targetEvaluation: target1,
        evaluatorEvaluations: evals1,
        peerEvaluations: evals2,
      });

      const signals2 = engine.execute({
        targetEvaluation: target2,
        evaluatorEvaluations: evals2,
        peerEvaluations: evals1,
      });

      // Verify signals were generated (statistical deviation confirmed)
      expect(signals1).toHaveLength(1);
      expect(signals2).toHaveLength(1);

      // Verify that every single evaluation in the population is strictly identical to its pre-execution state
      allEvaluations.forEach((evaluation, index) => {
        const snap = preExecutionSnapshots[index];
        expect(evaluation.id).toBe(snap.id);
        expect(evaluation.version).toBe(snap.version);
        expect(evaluation.status).toBe(snap.status);
        expect(evaluation.totalScore).toBe(snap.totalScore);
        expect(evaluation.maxPossibleScore).toBe(snap.maxPossibleScore);
        expect(JSON.stringify(evaluation.getAllMarks())).toBe(snap.marks);
      });
    });
  });

  describe("11. Deterministic Reproducibility Across 50 Identical Executions (09-testing §40)", () => {
    it("should produce bit-for-bit identical signal outputs and evidence payloads across 50 consecutive population executions", () => {
      const cycleId = "cycle_determinism_50";

      const evalsTarget = createEvaluatorCohort("eval_det_target", cycleId, [86, 84, 88, 85, 87], "det_t");
      const evalsPeers = createEvaluatorCohort("eval_det_peer", cycleId, [60, 62, 58, 61, 59], "det_p");

      const input = {
        targetEvaluation: evalsTarget[0],
        evaluatorEvaluations: evalsTarget,
        peerEvaluations: evalsPeers,
      };

      const baselineSignals = engine.execute(input);
      expect(baselineSignals).toHaveLength(1);
      const baseline = baselineSignals[0];

      for (let run = 1; run <= 50; run++) {
        const repeatSignals = engine.execute(input);
        expect(repeatSignals).toHaveLength(1);
        const repeat = repeatSignals[0];

        expect(repeat.signalType).toBe(baseline.signalType);
        expect(repeat.severity).toBe(baseline.severity);
        expect(repeat.status).toBe(baseline.status);
        expect(repeat.summary).toBe(baseline.summary);
        expect(repeat.detector).toEqual(baseline.detector);
        expect(repeat.evidence).toEqual(baseline.evidence);
        expect(repeat.evidence.deviation).toBe(baseline.evidence.deviation);
        expect(repeat.evidence.evaluatorMean).toBe(baseline.evidence.evaluatorMean);
        expect(repeat.evidence.peerMean).toBe(baseline.evidence.peerMean);
        expect(repeat.evidence.sampleSize).toBe(baseline.evidence.sampleSize);
        expect(repeat.evidence.peerSampleSize).toBe(baseline.evidence.peerSampleSize);
      }
    });
  });
});
