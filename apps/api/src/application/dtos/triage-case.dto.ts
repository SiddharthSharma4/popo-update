/**
 * TriageCase DTO conversion helper.
 * Conforms to docs/contracts/06-api-contract.md §29-32.
 */

import type { TriageCaseResponse } from "@osm/shared";
import type { TriageCase } from "../../domain/moderation/triage-case.js";

export type { TriageCaseResponse };

export function toTriageCaseDto(triageCase: TriageCase): TriageCaseResponse {
  return {
    id: triageCase.id,
    caseNumber: triageCase.caseNumber,
    evaluationId: triageCase.evaluationId,
    evaluationCycleId: triageCase.evaluationCycleId,
    qualitySignalId: triageCase.qualitySignalId,
    status: triageCase.status,
    priority: triageCase.priority,
    assigneeId: triageCase.assigneeId,
    notes: triageCase.notes,
    version: triageCase.version,
    createdAt: triageCase.createdAt,
    updatedAt: triageCase.updatedAt,
  };
}
