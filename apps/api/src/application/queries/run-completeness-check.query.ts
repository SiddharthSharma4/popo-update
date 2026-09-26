/**
 * RunCompletenessCheck Query and Handler.
 * Conforms to docs/contracts/02-architecture-contract.md §8 & §14,
 * and docs/contracts/01-product-contract.md §13 (CompleteCheck).
 */

import type { EvaluationRepository } from "../../domain/evaluation/evaluation-repository.js";
import {
  SubmissionCompletenessValidator,
  type CompletenessValidator,
} from "../../domain/validation/submission-completeness-validator.js";
import { EntityNotFoundError, InvalidCommandError } from "../common/errors.js";
import type { CompletenessValidationResultDto } from "@osm/shared";

export interface RunCompletenessCheckQuery {
  evaluationId: string;
}

export class RunCompletenessCheckHandler {
  private readonly validator: CompletenessValidator;

  constructor(
    private readonly evaluationRepo: EvaluationRepository,
    validator?: CompletenessValidator
  ) {
    this.validator = validator ?? new SubmissionCompletenessValidator();
  }

  async execute(query: RunCompletenessCheckQuery): Promise<CompletenessValidationResultDto> {
    if (!query.evaluationId?.trim()) {
      throw new InvalidCommandError("RunCompletenessCheck", "Evaluation ID is required.");
    }

    const evaluation = await this.evaluationRepo.findById(query.evaluationId);
    if (!evaluation) {
      throw new EntityNotFoundError("Evaluation", query.evaluationId);
    }

    const result = this.validator.validate(evaluation);

    return {
      evaluationId: result.evaluationId,
      isComplete: result.isComplete,
      isValid: result.isValid,
      totalQuestions: result.totalQuestions,
      markedQuestions: result.markedQuestions,
      unmarkedQuestions: result.unmarkedQuestions,
      missingQuestionIds: result.missingQuestionIds,
      issues: result.issues.map((i) => ({
        code: i.code,
        severity: i.severity,
        message: i.message,
        questionId: i.questionId,
        evidence: i.evidence,
      })),
      validatedAt: result.validatedAt,
    };
  }
}
