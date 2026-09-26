/**
 * Command to create a new Evaluation.
 * Conforms to docs/contracts/02-architecture-contract.md §8,
 * docs/contracts/05-domain-contract.md §10, and docs/contracts/08-data-contract.md §28-31.
 */

import { Evaluation } from "../../domain/evaluation/evaluation.js";
import type { UnitOfWork } from "../common/unit-of-work.js";
import { EntityNotFoundError, InvalidCommandError } from "../common/errors.js";
import { type EvaluationDto, toEvaluationDto } from "../dtos/evaluation.dto.js";

export interface CreateEvaluationCommand {
  id: string;
  evaluationCycleId: string;
  scriptId: string;
  evaluatorId: string;
  rubricId: string;
  rubricVersion: number;
  questions: {
    id: string;
    questionNumber: string;
    text: string;
    maxMarks: number;
    rubricCriteriaId?: string | null;
    orderIndex: number;
  }[];
}

export class CreateEvaluationHandler {
  constructor(private readonly uow: UnitOfWork) {}

  async execute(command: CreateEvaluationCommand): Promise<EvaluationDto> {
    if (!command.id?.trim()) {
      throw new InvalidCommandError("CreateEvaluation", "Evaluation ID is required.");
    }
    if (!command.evaluatorId?.trim()) {
      throw new InvalidCommandError("CreateEvaluation", "Evaluator ID is required.");
    }
    if (!command.questions || command.questions.length === 0) {
      throw new InvalidCommandError(
        "CreateEvaluation",
        "At least one question is required to create an evaluation."
      );
    }

    return this.uow.execute(async (scope) => {
      // 1. Verify Rubric exists
      const rubric = await scope.rubrics.findByIdAndVersion(
        command.rubricId,
        command.rubricVersion
      );
      if (!rubric) {
        throw new EntityNotFoundError(
          "Rubric",
          `${command.rubricId} (v${command.rubricVersion})`
        );
      }

      // 2. Instantiate Evaluation Aggregate Root
      const evaluation = Evaluation.create({
        id: command.id,
        evaluationCycleId: command.evaluationCycleId,
        scriptId: command.scriptId,
        evaluatorId: command.evaluatorId,
        rubricId: command.rubricId,
        rubricVersion: command.rubricVersion,
        questions: command.questions,
      });

      // 3. Persist evaluation
      await scope.evaluations.save(evaluation);

      // 4. Atomic outbox event (EvaluationCreated)
      await scope.outbox.record({
        eventType: "EvaluationCreated",
        eventVersion: 1,
        aggregateType: "Evaluation",
        aggregateId: evaluation.id,
        producer: "evaluation",
        actorType: "USER",
        actorId: command.evaluatorId,
        payload: {
          evaluationId: evaluation.id,
          evaluationCycleId: evaluation.evaluationCycleId,
          scriptId: evaluation.scriptId,
          evaluatorId: evaluation.evaluatorId,
          rubricId: evaluation.rubricId,
          rubricVersion: evaluation.rubricVersion,
          questionCount: evaluation.questions.length,
          maxPossibleScore: evaluation.maxPossibleScore,
        },
      });

      // 5. Atomic audit event
      await scope.audit.record({
        eventType: "EvaluationCreated",
        actorType: "USER",
        actorId: command.evaluatorId,
        entityType: "Evaluation",
        entityId: evaluation.id,
        action: "CREATE_EVALUATION",
        details: {
          scriptId: evaluation.scriptId,
          evaluatorId: evaluation.evaluatorId,
          totalQuestions: evaluation.questions.length,
        },
      });

      return toEvaluationDto(evaluation);
    });
  }
}
