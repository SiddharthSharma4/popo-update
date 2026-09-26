/**
 * Statistical Detector Abstractions.
 * Defines the contract for statistical quality detectors operating in the Intelligence Module.
 *
 * Conforms to:
 * - docs/contracts/02-architecture-contract.md §15 (Intelligence Module)
 * - docs/contracts/02-architecture-contract.md §17 (Statistical Detection Engine)
 * - docs/contracts/02-architecture-contract.md §18 (Detector Provenance)
 * - docs/contracts/05-domain-contract.md §19 (QualitySignal Generation)
 * - docs/contracts/05-domain-contract.md §34 (Statistical Context Requirement)
 * - Invariant INV-004: Statistical observation is not a finding. It is purely advisory/observational.
 * - Invariant INV-003: Pure observation; does not modify authoritative marks, questions, or status.
 */

import type { Evaluation } from "../evaluation/evaluation.js";
import type { QualitySignal } from "./quality-signal.js";

/**
 * Standard input context for statistical quality detectors.
 * Provides the target evaluation along with evaluator-scoped and peer-group baselines.
 */
export interface StatisticalDetectorInput {
  targetEvaluation: Evaluation;
  evaluatorEvaluations: Evaluation[];
  peerEvaluations: Evaluation[];
}

/**
 * Standard domain interface for statistical quality detectors.
 * Operates synchronously and side-effect free.
 */
export interface StatisticalDetector {
  readonly name: string;
  readonly version: string;
  detect(input: StatisticalDetectorInput): QualitySignal | null;
}
