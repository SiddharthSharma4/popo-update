/**
 * Query to retrieve a TriageCase by its ID.
 * Conforms to docs/contracts/06-api-contract.md §29, §66.
 */

import type { TriageCaseRepository } from "../../domain/moderation/triage-case-repository.js";
import { EntityNotFoundError } from "../common/errors.js";
import { type TriageCaseResponse, toTriageCaseDto } from "../dtos/triage-case.dto.js";

export class GetTriageCaseByIdHandler {
  constructor(private readonly triageCaseRepo: TriageCaseRepository) {}

  async execute(caseId: string): Promise<TriageCaseResponse> {
    const triageCase = await this.triageCaseRepo.findById(caseId.trim());
    if (!triageCase) {
      throw new EntityNotFoundError("TriageCase", caseId);
    }
    return toTriageCaseDto(triageCase);
  }
}
