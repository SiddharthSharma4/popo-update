/**
 * Resolution Application DTO Mapper.
 * Conforms to docs/contracts/06-api-contract.md §32-33.
 */

import type { Resolution } from "../../domain/moderation/resolution.js";
import type { ResolutionResponse } from "@osm/shared";

export type { ResolutionResponse };

export function toResolutionDto(resolution: Resolution): ResolutionResponse {
  return {
    id: resolution.id,
    triageCaseId: resolution.triageCaseId,
    evaluationId: resolution.evaluationId,
    outcome: resolution.outcome,
    reason: resolution.reason,
    moderatorId: resolution.moderatorId,
    notes: resolution.notes,
    evidenceReferences: [...resolution.evidenceReferences],
    createdAt: resolution.createdAt,
  };
}
