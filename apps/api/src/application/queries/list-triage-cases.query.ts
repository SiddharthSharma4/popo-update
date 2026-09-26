/**
 * Query to list TriageCases with optional filtering.
 * Conforms to docs/contracts/06-api-contract.md §29.
 */

import type {
  TriageCaseRepository,
  ListTriageCasesFilter,
} from "../../domain/moderation/triage-case-repository.js";
import { type TriageCaseResponse, toTriageCaseDto } from "../dtos/triage-case.dto.js";

export class ListTriageCasesHandler {
  constructor(private readonly triageCaseRepo: TriageCaseRepository) {}

  async execute(filter?: ListTriageCasesFilter): Promise<TriageCaseResponse[]> {
    const cases = await this.triageCaseRepo.list(filter);
    return cases.map(toTriageCaseDto);
  }
}
