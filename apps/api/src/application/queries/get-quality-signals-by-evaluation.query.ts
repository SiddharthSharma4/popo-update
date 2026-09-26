/**
 * GetQualitySignalsByEvaluation Query and Handler.
 * Conforms to docs/contracts/06-api-contract.md §25 & docs/contracts/02-architecture-contract.md §8.
 */

import type { QualitySignalRepository } from "../../domain/quality-signal/quality-signal-repository.js";
import { InvalidCommandError } from "../common/errors.js";
import { toQualitySignalDto } from "../dtos/quality-signal.dto.js";
import type { QualitySignalResponse } from "@osm/shared";

export interface GetQualitySignalsByEvaluationQuery {
  evaluationId: string;
}

export class GetQualitySignalsByEvaluationHandler {
  constructor(private readonly qualitySignalRepo: QualitySignalRepository) {}

  async execute(
    query: GetQualitySignalsByEvaluationQuery
  ): Promise<QualitySignalResponse[]> {
    if (!query.evaluationId?.trim()) {
      throw new InvalidCommandError(
        "GetQualitySignalsByEvaluation",
        "Evaluation ID is required."
      );
    }

    const signals = await this.qualitySignalRepo.findByEvaluationId(
      query.evaluationId.trim()
    );
    return signals.map(toQualitySignalDto);
  }
}
