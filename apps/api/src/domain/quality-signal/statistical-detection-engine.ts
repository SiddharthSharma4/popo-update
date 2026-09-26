/**
 * Statistical Detection Engine.
 * In-memory coordinator for statistical quality detectors in the Intelligence Module.
 *
 * Conforms to:
 * - docs/contracts/02-architecture-contract.md §17 (Statistical Detection Engine)
 * - docs/contracts/02-architecture-contract.md §18 (Detector Provenance)
 * - docs/contracts/02-architecture-contract.md §40 (Synchronous Execution)
 * - docs/contracts/05-domain-contract.md §19 (QualitySignal Generation)
 * - docs/contracts/05-domain-contract.md §45 (Synchronous Domain Work)
 * - Invariant INV-004: Statistical detection is purely observational; leaves evaluations untouched.
 * - Invariant INV-003: Non-authority; does not modify marks, questions, or total score.
 *
 * Architectural Boundaries:
 * - Pure in-memory domain coordinator.
 * - Zero database access.
 * - Zero stateful deduplication (persistence layer owns deduplication via unique constraints).
 * - Zero caching or background worker loops.
 * - Fails fast on programmer errors by propagating unexpected exceptions.
 */

import { InvalidArgumentError } from "../errors.js";
import type { StatisticalDetector, StatisticalDetectorInput } from "./detector.js";
import type { QualitySignal } from "./quality-signal.js";

export class StatisticalDetectionEngine {
  private readonly detectors = new Map<string, StatisticalDetector>();

  constructor(initialDetectors: StatisticalDetector[] = []) {
    for (const detector of initialDetectors) {
      this.register(detector);
    }
  }

  /**
   * Registers a statistical detector with the engine.
   * Throws InvalidArgumentError if a detector with the same name is already registered,
   * or if the detector lacks a valid name or version.
   */
  register(detector: StatisticalDetector): void {
    if (!detector) {
      throw new InvalidArgumentError("Detector must not be null or undefined.");
    }
    if (!detector.name || detector.name.trim() === "") {
      throw new InvalidArgumentError("Detector must have a non-empty name.");
    }
    if (!detector.version || detector.version.trim() === "") {
      throw new InvalidArgumentError("Detector must have a non-empty version.");
    }
    if (this.detectors.has(detector.name)) {
      throw new InvalidArgumentError(
        `Detector with name '${detector.name}' is already registered in StatisticalDetectionEngine.`
      );
    }

    this.detectors.set(detector.name, detector);
  }

  /**
   * Returns a registered detector by name, or undefined if not found.
   */
  getDetector(name: string): StatisticalDetector | undefined {
    return this.detectors.get(name);
  }

  /**
   * Checks whether a detector with the given name is registered.
   */
  hasDetector(name: string): boolean {
    return this.detectors.has(name);
  }

  /**
   * Returns a copy of all registered detectors.
   */
  listDetectors(): StatisticalDetector[] {
    return Array.from(this.detectors.values());
  }

  /**
   * Executes all registered statistical detectors synchronously against the provided input.
   * Collects and returns any generated QualitySignal instances.
   *
   * If any detector throws an unhandled error, it is propagated immediately (fail-fast).
   */
  execute(input: StatisticalDetectorInput): QualitySignal[] {
    if (!input || !input.targetEvaluation) {
      throw new InvalidArgumentError("StatisticalDetectorInput with targetEvaluation is required.");
    }

    const signals: QualitySignal[] = [];

    for (const detector of this.detectors.values()) {
      const signal = detector.detect(input);
      if (signal !== null) {
        signals.push(signal);
      }
    }

    return signals;
  }
}
