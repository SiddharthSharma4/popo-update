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
  UserRole,
  ActorType,
} from "@osm/shared";
import type { EvaluationApplicationService } from "../../application/services/evaluation.service.js";
import type { EvaluationDto } from "../../application/dtos/evaluation.dto.js";
import { InvalidCommandError, UnauthorizedActionError } from "../../application/common/errors.js";
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
        const actorType = (request.headers["x-actor-type"] as string)?.toUpperCase();
        const userRole = (request.headers["x-user-role"] as string)?.toUpperCase();
        if (actorType === ActorType.AI || userRole === "AI") {
          throw new UnauthorizedActionError(
            "LIST_EVALUATIONS",
            "AI actors are not authorized to access evaluation lists."
          );
        }

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
      const actorType = (
        (request.headers["x-actor-type"] as string) ||
        (request.body as Record<string, unknown> | null)?.actorType ||
        ActorType.USER
      ).toString().toUpperCase();
      const rawUserRole =
        (request.headers["x-user-role"] as string) ||
        (request.body as Record<string, unknown> | null)?.userRole;
      const userRole = (rawUserRole || UserRole.ADMIN).toString().toUpperCase();

      if (actorType === ActorType.AI || userRole === "AI") {
        throw new UnauthorizedActionError(
          "CREATE_EVALUATION",
          "AI actors are strictly prohibited from creating authoritative evaluations."
        );
      }

      if (
        userRole !== UserRole.EXAMINER &&
        userRole !== UserRole.MODERATOR &&
        userRole !== UserRole.ADMIN
      ) {
        throw new UnauthorizedActionError(
          "CREATE_EVALUATION",
          `User role '${userRole}' is not authorized to create evaluations.`
        );
      }
      const actorId =
        (request.headers["x-actor-id"] as string)?.trim() ||
        (request.headers["x-user-id"] as string)?.trim() ||
        (request.headers["x-evaluator-id"] as string)?.trim();

      const parsed = CreateEvaluationRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        throw parsed.error;
      }
      const data = parsed.data;

      if (userRole === UserRole.EXAMINER && actorId && data.evaluatorId !== actorId) {
        throw new UnauthorizedActionError(
          "CREATE_EVALUATION",
          `Examiner '${actorId}' cannot create evaluation assigned to '${data.evaluatorId}'.`
        );
      }

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
        actorType,
        actorId,
        userRole,
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
        if (!evaluationId || evaluationId.trim() === "") {
          throw new InvalidCommandError(
            "GetEvaluation",
            "Evaluation ID cannot be empty or whitespace."
          );
        }

        const actorType = (request.headers["x-actor-type"] as string)?.toUpperCase();
        const userRole = (request.headers["x-user-role"] as string)?.toUpperCase();
        if (actorType === ActorType.AI || userRole === "AI") {
          throw new UnauthorizedActionError(
            "GET_EVALUATION",
            "AI actors are not authorized to inspect evaluation details."
          );
        }

        const evaluation = await evaluationService.getEvaluationById(evaluationId.trim());
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
        if (!evaluationId || evaluationId.trim() === "") {
          throw new InvalidCommandError(
            "AssignMark",
            "Evaluation ID cannot be empty or whitespace."
          );
        }

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
          ActorType.USER
        ).toString().toUpperCase() as "USER" | "AI" | "SYSTEM";

        const userRole = (
          (request.headers["x-user-role"] as string) ||
          UserRole.EXAMINER
        ).toUpperCase();

        if (actorType === ActorType.AI || userRole === "AI") {
          throw new UnauthorizedActionError(
            "ASSIGN_MARK",
            "AI cannot assign authoritative marks. Academic evaluation requires authorized human attribution."
          );
        }

        if (!evaluatorId) {
          throw new InvalidCommandError(
            "AssignMark",
            "Evaluator ID is required via request body or 'x-evaluator-id' header."
          );
        }

        // Enforce resource ownership: examiners may only mark their own assigned evaluation
        if (userRole === UserRole.EXAMINER) {
          const current = await evaluationService.getEvaluationById(evaluationId.trim());
          if (current.evaluatorId !== evaluatorId) {
            throw new UnauthorizedActionError(
              "ASSIGN_MARK",
              `Only the assigned evaluator (${current.evaluatorId}) may assign marks to evaluation ${evaluationId}.`
            );
          }
        }

        // Check optimistic concurrency if expectedVersion provided in body
        if (data.expectedVersion !== undefined) {
          const current = await evaluationService.getEvaluationById(evaluationId.trim());
          if (current.version !== data.expectedVersion) {
            throw new ConcurrencyConflictError(
              "Evaluation",
              evaluationId.trim(),
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
            const current = await evaluationService.getEvaluationById(evaluationId.trim());
            if (current.version !== expectedHeaderVersion) {
              throw new ConcurrencyConflictError(
                "Evaluation",
                evaluationId.trim(),
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
              evaluationId: evaluationId.trim(),
              questionId: item.questionId,
              awardedMarks: awarded,
              evaluatorId,
              actorType,
              userRole,
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
            evaluationId: evaluationId.trim(),
            questionId: data.questionId,
            awardedMarks: awarded,
            evaluatorId,
            actorType,
            userRole,
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
        if (!evaluationId || evaluationId.trim() === "") {
          throw new InvalidCommandError(
            "SubmitEvaluation",
            "Evaluation ID cannot be empty or whitespace."
          );
        }

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
          ActorType.USER
        ).toString().toUpperCase() as "USER" | "AI" | "SYSTEM";

        const userRole = (request.headers["x-user-role"] as string)?.toUpperCase();

        if (actorType === ActorType.AI || userRole === "AI") {
          throw new UnauthorizedActionError(
            "SUBMIT_EVALUATION",
            "AI cannot finalize or submit examination evaluations."
          );
        }

        if (!evaluatorId) {
          throw new InvalidCommandError(
            "SubmitEvaluation",
            "Evaluator ID is required via request body or 'x-evaluator-id' header."
          );
        }

        const submittedEvaluation = await evaluationService.submitEvaluation({
          evaluationId: evaluationId.trim(),
          evaluatorId,
          actorType,
          userRole,
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
        if (!evaluationId || evaluationId.trim() === "") {
          throw new InvalidCommandError(
            "GetQualitySignals",
            "Evaluation ID cannot be empty or whitespace."
          );
        }

        const actorType = (request.headers["x-actor-type"] as string)?.toUpperCase();
        const userRole = (request.headers["x-user-role"] as string)?.toUpperCase();
        if (actorType === ActorType.AI || userRole === "AI") {
          throw new UnauthorizedActionError(
            "GET_QUALITY_SIGNALS",
            "AI actors are not authorized to inspect quality signals."
          );
        }

        const signals = await evaluationService.getQualitySignals(evaluationId.trim());
        return reply.code(200).send(signals);
      }
    );

    /**
     * GET /api/v1/evaluations/:evaluationId/completeness
     * Runs deterministic completeness validation (CompleteCheck).
     * Conforms to 01-product-contract.md §13 and 02-architecture-contract.md §14.
     */
    fastify.get<{ Params: { evaluationId: string } }>(
      "/:evaluationId/completeness",
      async (request, reply) => {
        const { evaluationId } = request.params;
        if (!evaluationId || evaluationId.trim() === "") {
          throw new InvalidCommandError(
            "RunCompletenessCheck",
            "Evaluation ID cannot be empty or whitespace."
          );
        }

        const actorType = (request.headers["x-actor-type"] as string)?.toUpperCase();
        const userRole = (request.headers["x-user-role"] as string)?.toUpperCase();
        if (actorType === ActorType.AI || userRole === "AI") {
          throw new UnauthorizedActionError(
            "RUN_COMPLETENESS_CHECK",
            "AI actors cannot invoke validation checks."
          );
        }

        const result = await evaluationService.runCompletenessCheck(evaluationId.trim());
        return reply.code(200).send(result);
      }
    );
  };
};
