/**
 * Query to retrieve a Rubric by ID and optional version.
 * Conforms to docs/contracts/06-api-contract.md §20.
 */

import type { RubricRepository } from "../../domain/rubric/rubric-repository.js";
import { EntityNotFoundError } from "../common/errors.js";
import { type RubricDto, toRubricDto } from "../dtos/rubric.dto.js";

export interface GetRubricByIdQuery {
  rubricId: string;
  version?: number;
}

export class GetRubricByIdHandler {
  constructor(private readonly rubricRepo: RubricRepository) {}

  async execute(query: GetRubricByIdQuery): Promise<RubricDto> {
    const rubric =
      query.version !== undefined
        ? await this.rubricRepo.findByIdAndVersion(query.rubricId, query.version)
        : await this.rubricRepo.findLatestById(query.rubricId);

    if (!rubric) {
      throw new EntityNotFoundError(
        "Rubric",
        query.version !== undefined ? `${query.rubricId}:v${query.version}` : query.rubricId
      );
    }

    return toRubricDto(rubric);
  }
}
