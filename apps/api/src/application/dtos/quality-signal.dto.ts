/**
 * QualitySignal DTO mappers.
 * Conforms to docs/contracts/06-api-contract.md §25-27, §65.
 */

import type { QualitySignal } from "../../domain/quality-signal/quality-signal.js";
import type { QualitySignalResponse } from "@osm/shared";

export function toQualitySignalDto(signal: QualitySignal): QualitySignalResponse {
  return {
    id: signal.id,
    evaluationId: signal.evaluationId,
    evaluationVersion: signal.evaluationVersion,
    signalType: signal.signalType,
    severity: signal.severity,
    status: signal.status,
    summary: signal.summary,
    evidence: signal.evidence,
    detector: {
      type: signal.detector.type,
      name: signal.detector.name,
      version: signal.detector.version,
      config: signal.detector.config,
    },
    createdAt: signal.createdAt,
    updatedAt: signal.updatedAt,
  };
}
