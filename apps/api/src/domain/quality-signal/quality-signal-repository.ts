/**
 * Repository interface for QualitySignal persistence.
 * Conforms to docs/contracts/05-domain-contract.md §7.1 and docs/contracts/08-data-contract.md §17-18.
 */

import type { QualitySignal } from "./quality-signal.js";

export interface QualitySignalRepository {
  findById(id: string): Promise<QualitySignal | null>;
  findByEvaluationId(evaluationId: string): Promise<QualitySignal[]>;
  findReviewable(): Promise<QualitySignal[]>;
  findAll(): Promise<QualitySignal[]>;
  findByEvaluationAndType(
    evaluationId: string,
    version: number,
    detectorName: string,
    signalType: string
  ): Promise<QualitySignal | null>;
  save(signal: QualitySignal): Promise<void>;
  delete(id: string): Promise<void>;
}
