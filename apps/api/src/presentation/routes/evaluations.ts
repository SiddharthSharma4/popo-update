/**
 * Evaluation HTTP routes and controller endpoints.
 * Conforms to docs/contracts/06-api-contract.md §18, §21.3, §22, §23, §62, §63, §64.
 * Delegates exclusively to EvaluationApplicationService without containing business logic.
 */

import { randomUUID } from "node:crypto";
import type { FastifyPluginAsync } from "fastify";
import {
  CreateEvaluationRequestSchema,
  AssignMarkRequestSchema,
  SubmitEvaluationRequestSchema,
  ListEvaluationsQuerySchema,
} from "@osm/shared";
import type { EvaluationApplicationService } from "../../application/services/evaluation.service.js";
import type { EvaluationDto } from "../../application/dtos/evaluation.dto.js";
import { InvalidCommandError } from "../../application/common/errors.js";
import { ConcurrencyConflictError } from "../../domain/errors.js";

export const evaluationRoutes = (
  evaluationService: EvaluationApplicationService
): FastifyPluginAsync => {
  return async (fastify) => {
    /**
     * GET /api/v1/evaluations
     * Lists evaluations with pagination and filtering.
     * Conforms to 06-api-contract.md §21.3, §44, §45.
     */
    fastify.get<{ Querystring: Record<string, unknown> }>(
      "/",
      async (request, reply) => {
        const parsed = ListEvaluationsQuerySchema.safeParse(request.query);
        if (!parsed.success) {
          throw parsed.error;
        }
        const result = await evaluationService.listEvaluations(parsed.data);
        return reply.code(200).send(result);
      }
    );

    /**
     * POST /api/v1/evaluations
     * Creates a new evaluation instance.
     * Conforms to 06-api-contract.md §21.3.
     */
    fastify.post("/", async (request, reply) => {

      const parsed = CreateEvaluationRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        throw parsed.error;
      }
      const data = parsed.data;

      const evaluationId = data.id?.trim() || `eval_${randomUUID()}`;

      const questions = data.questions.map((q, idx) => ({
        id: q.id?.trim() || `q_${idx + 1}_${randomUUID()}`,
        questionNumber: q.questionNumber,
        text: q.text,
        maxMarks: q.maxMarks,
        rubricCriteriaId: q.rubricCriteriaId ?? null,
        orderIndex: q.orderIndex,
      }));

      const evaluation = await evaluationService.createEvaluation({
        id: evaluationId,
        evaluationCycleId: data.evaluationCycleId,
        scriptId: data.scriptId,
        evaluatorId: data.evaluatorId,
        rubricId: data.rubricId,
        rubricVersion: data.rubricVersion,
        questions,
      });

      return reply.code(201).send(evaluation);
    });

    /**
     * GET /api/v1/evaluations/:evaluationId
     * Retrieves an evaluation instance by ID.
     * Conforms to 06-api-contract.md §21.3.
     */
    fastify.get<{ Params: { evaluationId: string } }>(
      "/:evaluationId",
      async (request, reply) => {
        const { evaluationId } = request.params;
        const evaluation = await evaluationService.getEvaluationById(evaluationId);
        return reply.code(200).send(evaluation);
      }
    );

    /**
     * PATCH /api/v1/evaluations/:evaluationId
     * Assigns or updates marks on an evaluation item.
     * Conforms to 06-api-contract.md §12, §21.3, §22, §63.
     */
    fastify.patch<{ Params: { evaluationId: string } }>(
      "/:evaluationId",
      async (request, reply) => {
        const { evaluationId } = request.params;

        const parsed = AssignMarkRequestSchema.safeParse(request.body);
        if (!parsed.success) {
          throw parsed.error;
        }
        const data = parsed.data;

        // Resolve evaluator identity from body or header
        const evaluatorId =
          data.evaluatorId?.trim() ||
          (request.headers["x-evaluator-id"] as string)?.trim() ||
          (request.headers["x-actor-id"] as string)?.trim();

        // Resolve actor type from body or header
        const actorType = (
          data.actorType ||
          (request.headers["x-actor-type"] as string) ||
          "USER"
        ) as "USER" | "AI" | "SYSTEM";

        if (!evaluatorId) {
          throw new InvalidCommandError(
            "AssignMark",
            "Evaluator ID is required via request body or 'x-evaluator-id' header."
          );
        }

        // Check optimistic concurrency if expectedVersion provided in body
        if (data.expectedVersion !== undefined) {
          const current = await evaluationService.getEvaluationById(evaluationId);
          if (current.version !== data.expectedVersion) {
            throw new ConcurrencyConflictError(
              "Evaluation",
              evaluationId,
              data.expectedVersion,
              current.version
            );
          }
        }

        // Check If-Match header if provided
        const ifMatch = request.headers["if-match"];
        if (ifMatch) {
          const expectedHeaderVersion = parseInt(ifMatch.replace(/["']/g, ""), 10);
          if (!isNaN(expectedHeaderVersion)) {
            const current = await evaluationService.getEvaluationById(evaluationId);
            if (current.version !== expectedHeaderVersion) {
              throw new ConcurrencyConflictError(
                "Evaluation",
                evaluationId,
                expectedHeaderVersion,
                current.version
              );
            }
          }
        }

        let updatedEvaluation: EvaluationDto;

        // Support multiple marks via marks array (§63)
        if (data.marks && data.marks.length > 0) {
          let latestDto: EvaluationDto | undefined;
          for (const item of data.marks) {
            const awarded = item.awardedMarks ?? item.awarded;
            if (awarded === undefined) {
              throw new InvalidCommandError(
                "AssignMark",
                `Awarded marks is required for question ${item.questionId}.`
              );
            }
            latestDto = await evaluationService.assignMark({
              evaluationId,
              questionId: item.questionId,
              awardedMarks: awarded,
              evaluatorId,
              actorType,
              comments: item.comments,
              isAnnotated: item.isAnnotated,
            });
          }
          updatedEvaluation = latestDto!;
        } else if (data.questionId) {
          // Single mark payload
          const awarded = data.awardedMarks ?? data.awarded;
          if (awarded === undefined) {
            throw new InvalidCommandError(
              "AssignMark",
              `Awarded marks is required for question ${data.questionId}.`
            );
          }
          updatedEvaluation = await evaluationService.assignMark({
            evaluationId,
            questionId: data.questionId,
            awardedMarks: awarded,
            evaluatorId,
            actorType,
            comments: data.comments,
            isAnnotated: data.isAnnotated,
          });
        } else {
          throw new InvalidCommandError(
            "AssignMark",
            "Either 'questionId' with 'awardedMarks' or a non-empty 'marks' array is required."
          );
        }

        return reply.code(200).send(updatedEvaluation);
      }
    );

    /**
     * POST /api/v1/evaluations/:evaluationId/submit
     * Submits an evaluation, enforcing assignment authorization and lifecycle status guards.
     * Conforms to 06-api-contract.md §13, §21.3, §23, §64.
     */
    fastify.post<{ Params: { evaluationId: string } }>(
      "/:evaluationId/submit",
      async (request, reply) => {
        const { evaluationId } = request.params;

        const parsed = SubmitEvaluationRequestSchema.safeParse(request.body ?? {});
        if (!parsed.success) {
          throw parsed.error;
        }
        const data = parsed.data;

        // Resolve evaluator identity from body or header
        const evaluatorId =
          data.evaluatorId?.trim() ||
          (request.headers["x-evaluator-id"] as string)?.trim() ||
          (request.headers["x-actor-id"] as string)?.trim();

        // Resolve actor type from body or header
        const actorType = (
          data.actorType ||
          (request.headers["x-actor-type"] as string) ||
          "USER"
        ) as "USER" | "AI" | "SYSTEM";

        if (!evaluatorId) {
          throw new InvalidCommandError(
            "SubmitEvaluation",
            "Evaluator ID is required via request body or 'x-evaluator-id' header."
          );
        }

        const submittedEvaluation = await evaluationService.submitEvaluation({
          evaluationId,
          evaluatorId,
          actorType,
        });

        return reply.code(200).send(submittedEvaluation);
      }
    );

    /**
     * GET /api/v1/evaluations/:evaluationId/quality-signals
     * Retrieves quality signals for an evaluation.
     * Conforms to 06-api-contract.md §25.
     */
    fastify.get<{ Params: { evaluationId: string } }>(
      "/:evaluationId/quality-signals",
      async (request, reply) => {
        const { evaluationId } = request.params;
        const signals = await evaluationService.getQualitySignals(evaluationId);
        return reply.code(200).send(signals);
      }
    );
  };
};
