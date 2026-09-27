/**
 * Command to submit an Evaluation.
 * Conforms to docs/contracts/06-api-contract.md §23,
 * docs/contracts/05-domain-contract.md §10, and docs/contracts/07-event-contract.md §5.
 */

import { randomUUID } from "node:crypto";
import type { UnitOfWork } from "../common/unit-of-work.js";
import {
  EntityNotFoundError,
  InvalidCommandError,
  UnauthorizedActionError,
} from "../common/errors.js";
import { type EvaluationDto, toEvaluationDto } from "../dtos/evaluation.dto.js";
import {
  SubmissionCompletenessValidator,
  type CompletenessValidator,
} from "../../domain/validation/submission-completeness-validator.js";
import { CompletenessSignalGenerator } from "../../domain/quality-signal/completeness-signal-generator.js";

export interface SubmitEvaluationCommand {
  evaluationId: string;
  evaluatorId: string;
  actorType?: "USER" | "AI" | "SYSTEM";
  userRole?: string;
}

export class SubmitEvaluationHandler {
  private readonly completenessValidator: CompletenessValidator;
  private readonly completenessSignalGenerator: CompletenessSignalGenerator;

  constructor(
    private readonly uow: UnitOfWork,
    completenessValidator?: CompletenessValidator,
    completenessSignalGenerator?: CompletenessSignalGenerator
  ) {
    this.completenessValidator =
      completenessValidator ?? new SubmissionCompletenessValidator();
    this.completenessSignalGenerator =
      completenessSignalGenerator ?? new CompletenessSignalGenerator();
  }

  async execute(command: SubmitEvaluationCommand): Promise<EvaluationDto> {
    if (!command.evaluationId?.trim()) {
      throw new InvalidCommandError("SubmitEvaluation", "Evaluation ID is required.");
    }
    if (!command.evaluatorId?.trim()) {
      throw new InvalidCommandError("SubmitEvaluation", "Evaluator ID is required.");
    }

    // AI cannot submit an evaluation (INV-003)
    if (command.actorType === "AI" || command.userRole === "AI") {
      throw new UnauthorizedActionError(
        "SUBMIT_EVALUATION",
        "AI cannot finalize or submit examination evaluations."
      );
    }

    return this.uow.execute(async (scope) => {
      const evaluation = await scope.evaluations.findById(command.evaluationId);
      if (!evaluation) {
        throw new EntityNotFoundError("Evaluation", command.evaluationId);
      }

      // Check assignment authorization
      if (evaluation.evaluatorId !== command.evaluatorId) {
        throw new UnauthorizedActionError(
          "SUBMIT_EVALUATION",
          `Only the assigned evaluator (${evaluation.evaluatorId}) may submit evaluation ${evaluation.id}.`
        );
      }

      // Run deterministic completeness validation (docs/contracts/06-api-contract.md §23, §24)
      const completeness = this.completenessValidator.validate(evaluation);

      // Transition aggregate state (enforces status guards)
      evaluation.submit();

      // Persist state change
      await scope.evaluations.save(evaluation);

      // Check if deterministic QualitySignal should be generated (TASK-P3-VAL-002)
      const qualitySignal = this.completenessSignalGenerator.generate(evaluation, completeness);
      if (qualitySignal) {
        await scope.qualitySignals.save(qualitySignal);
      }

      const submissionEventId = randomUUID();

      // Record EvaluationSubmitted outbox event atomically
      await scope.outbox.record({
        id: submissionEventId,
        eventType: "EvaluationSubmitted",
        eventVersion: 1,
        aggregateType: "Evaluation",
        aggregateId: evaluation.id,
        producer: "evaluation",
        actorType: "USER",
        actorId: command.evaluatorId,
        correlationId: submissionEventId,
        payload: {
          evaluationId: evaluation.id,
          scriptId: evaluation.scriptId,
          totalScore: evaluation.totalScore,
          maxPossibleScore: evaluation.maxPossibleScore,
          isComplete: completeness.isComplete,
          missingQuestions: completeness.missingQuestionIds,
          submittedAt: evaluation.submittedAt,
          completeness: {
            isValid: completeness.isValid,
            isComplete: completeness.isComplete,
            totalQuestions: completeness.totalQuestions,
            markedQuestions: completeness.markedQuestions,
            unmarkedQuestions: completeness.unmarkedQuestions,
            missingQuestionIds: completeness.missingQuestionIds,
            issueCount: completeness.issues.length,
            issues: completeness.issues,
          },
        },
      });

      // Record QualitySignalGenerated outbox event atomically if signal was generated
      if (qualitySignal) {
        await scope.outbox.record({
          id: randomUUID(),
          eventType: "QualitySignalGenerated",
          eventVersion: 1,
          aggregateType: "QualitySignal",
          aggregateId: qualitySignal.id,
          producer: "completeness-detector",
          actorType: "DETECTOR",
          actorId: "completeness-detector:v1.0.0",
          correlationId: submissionEventId,
          causationId: submissionEventId,
          payload: {
            signalId: qualitySignal.id,
            evaluationId: qualitySignal.evaluationId,
            evaluationVersion: qualitySignal.evaluationVersion,
            signalType: qualitySignal.signalType,
            severity: qualitySignal.severity,
            status: qualitySignal.status,
            summary: qualitySignal.summary,
            evidence: qualitySignal.evidence,
            detector: qualitySignal.detector,
            createdAt: qualitySignal.createdAt,
          },
        });
      }

      // Record audit event
      await scope.audit.record({
        eventType: "EvaluationSubmitted",
        actorType: "USER",
        actorId: command.evaluatorId,
        entityType: "Evaluation",
        entityId: evaluation.id,
        action: "SUBMIT_EVALUATION",
        details: {
          totalScore: evaluation.totalScore,
          isComplete: completeness.isComplete,
          completenessResult: {
            isValid: completeness.isValid,
            isComplete: completeness.isComplete,
            missingCount: completeness.unmarkedQuestions,
            issueCount: completeness.issues.length,
          },
          qualitySignal: qualitySignal
            ? {
                id: qualitySignal.id,
                signalType: qualitySignal.signalType,
                severity: qualitySignal.severity,
                status: qualitySignal.status,
              }
            : null,
        },
      });

      return toEvaluationDto(evaluation);
    });
  }
}
