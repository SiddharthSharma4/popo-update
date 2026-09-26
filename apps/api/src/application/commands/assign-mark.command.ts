/**
 * Command to assign or update a mark for an evaluation item.
 * Conforms to docs/contracts/05-domain-contract.md §12, §38 (INV-003: AI Is Not Authority),
 * and docs/contracts/08-data-contract.md §43-45 (optimistic concurrency).
 */

import type { UnitOfWork } from "../common/unit-of-work.js";
import {
  EntityNotFoundError,
  InvalidCommandError,
  UnauthorizedActionError,
} from "../common/errors.js";
import { type EvaluationDto, toEvaluationDto } from "../dtos/evaluation.dto.js";

export interface AssignMarkCommand {
  evaluationId: string;
  questionId: string;
  awardedMarks: number;
  evaluatorId: string;
  actorType?: "USER" | "AI" | "SYSTEM";
  comments?: string | null;
  isAnnotated?: boolean;
}

export class AssignMarkHandler {
  constructor(private readonly uow: UnitOfWork) {}

  async execute(command: AssignMarkCommand): Promise<EvaluationDto> {
    if (!command.evaluationId?.trim()) {
      throw new InvalidCommandError("AssignMark", "Evaluation ID is required.");
    }
    if (!command.questionId?.trim()) {
      throw new InvalidCommandError("AssignMark", "Question ID is required.");
    }
    if (!command.evaluatorId?.trim()) {
      throw new InvalidCommandError("AssignMark", "Evaluator ID is required.");
    }

    // Hard Invariant: AI Non-Authority Boundary (docs/contracts/05-domain-contract.md INV-003)
    // AI outputs are advisory only and must never directly assign authoritative marks.
    if (command.actorType === "AI") {
      throw new UnauthorizedActionError(
        "ASSIGN_MARK",
        "AI cannot assign authoritative marks. Academic evaluation requires authorized human attribution."
      );
    }

    return this.uow.execute(async (scope) => {
      const evaluation = await scope.evaluations.findById(command.evaluationId);
      if (!evaluation) {
        throw new EntityNotFoundError("Evaluation", command.evaluationId);
      }

      // Delegate business invariants to the domain aggregate
      const mark = evaluation.assignMark({
        questionId: command.questionId,
        awardedMarks: command.awardedMarks,
        evaluatorId: command.evaluatorId,
        comments: command.comments,
        isAnnotated: command.isAnnotated,
      });

      // Persist within transaction with optimistic concurrency check
      await scope.evaluations.save(evaluation);

      // Record outbox event
      await scope.outbox.record({
        eventType: "EvaluationUpdated",
        eventVersion: 1,
        aggregateType: "Evaluation",
        aggregateId: evaluation.id,
        producer: "evaluation",
        actorType: "USER",
        actorId: command.evaluatorId,
        payload: {
          evaluationId: evaluation.id,
          questionId: mark.questionId,
          awardedMarks: mark.awardedMarks,
          totalScore: evaluation.totalScore,
          version: evaluation.version,
        },
      });

      // Record audit trail
      await scope.audit.record({
        eventType: "MarkAssigned",
        actorType: "USER",
        actorId: command.evaluatorId,
        entityType: "Evaluation",
        entityId: evaluation.id,
        action: "ASSIGN_MARK",
        details: {
          questionId: mark.questionId,
          awardedMarks: mark.awardedMarks,
          maxMarks: mark.maxMarks,
          totalScore: evaluation.totalScore,
        },
      });

      return toEvaluationDto(evaluation);
    });
  }
}
