/**
 * Query to retrieve an Evaluation by ID.
 * Conforms to docs/contracts/06-api-contract.md §21.3.
 */

import type { EvaluationRepository } from "../../domain/evaluation/evaluation-repository.js";
import { EntityNotFoundError } from "../common/errors.js";
import { type EvaluationDto, toEvaluationDto } from "../dtos/evaluation.dto.js";

export interface GetEvaluationByIdQuery {
  evaluationId: string;
}

export class GetEvaluationByIdHandler {
  constructor(private readonly evaluationRepo: EvaluationRepository) {}

  async execute(query: GetEvaluationByIdQuery): Promise<EvaluationDto> {
    const evaluation = await this.evaluationRepo.findById(query.evaluationId);
    if (!evaluation) {
      throw new EntityNotFoundError("Evaluation", query.evaluationId);
    }
    return toEvaluationDto(evaluation);
  }
}
