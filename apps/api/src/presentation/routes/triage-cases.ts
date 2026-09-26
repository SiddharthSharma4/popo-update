/**
 * TriageCase HTTP routes and controller endpoints.
 * Conforms to docs/contracts/06-api-contract.md §29-32, §66-67.
 *
 * Invariants:
 * - Only human moderators or admins may create or assign triage cases.
 * - AI cannot create or assign triage cases.
 * - Resolution endpoint is strictly excluded (belongs to TASK-P5-MOD-002).
 */

import type { FastifyPluginAsync } from "fastify";
import {
  CreateTriageCaseRequestSchema,
  AssignTriageCaseRequestSchema,
  ListTriageCasesQuerySchema,
  UserRole,
  ActorType,
  TriageCaseStatus,
} from "@osm/shared";
import type { UnitOfWork } from "../../application/common/unit-of-work.js";
import type { TriageCaseRepository } from "../../domain/moderation/triage-case-repository.js";
import {
  CreateTriageCaseHandler,
  AssignTriageCaseHandler,
  GetTriageCaseByIdHandler,
  ListTriageCasesHandler,
} from "../../application/index.js";
import { UnauthorizedActionError } from "../../application/common/errors.js";

export interface TriageCaseRouteDependencies {
  uow: UnitOfWork;
  triageCaseRepo: TriageCaseRepository;
}

export const triageCaseRoutes = (
  deps: TriageCaseRouteDependencies
): FastifyPluginAsync => {
  const createHandler = new CreateTriageCaseHandler(deps.uow);
  const assignHandler = new AssignTriageCaseHandler(deps.uow);
  const getByIdHandler = new GetTriageCaseByIdHandler(deps.triageCaseRepo);
  const listHandler = new ListTriageCasesHandler(deps.triageCaseRepo);

  return async (fastify) => {
    /**
     * GET /api/v1/triage-cases
     * Lists triage cases with optional filtering.
     * Conforms to 06-api-contract.md §29.
     */
    fastify.get<{ Querystring: Record<string, unknown> }>(
      "/",
      async (request, reply) => {
        const parsed = ListTriageCasesQuerySchema.safeParse(request.query);
        if (!parsed.success) {
          throw parsed.error;
        }

        const cases = await listHandler.execute({
          status: parsed.data.status,
          assigneeId: parsed.data.assigneeId,
          evaluationId: parsed.data.evaluationId,
        });

        return reply.code(200).send(cases);
      }
    );

    /**
     * GET /api/v1/triage-cases/:caseId
     * Retrieves a single TriageCase by its ID.
     * Conforms to 06-api-contract.md §29, §66.
     */
    fastify.get<{ Params: { caseId: string } }>(
      "/:caseId",
      async (request, reply) => {
        const { caseId } = request.params;
        const triageCase = await getByIdHandler.execute(caseId);
        return reply.code(200).send(triageCase);
      }
    );

    /**
     * POST /api/v1/triage-cases
     * Creates a new TriageCase linked to a QualitySignal.
     * Conforms to 06-api-contract.md §30.
     */
    fastify.post("/", async (request, reply) => {
      const parsed = CreateTriageCaseRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        throw parsed.error;
      }

      const actorType = (request.headers["x-actor-type"] as string) || ActorType.USER;
      const actorId =
        (request.headers["x-actor-id"] as string)?.trim() ||
        (request.headers["x-user-id"] as string)?.trim() ||
        "moderator_1";
      const userRole = (request.headers["x-user-role"] as string) || UserRole.MODERATOR;

      if (actorType === ActorType.AI) {
        throw new UnauthorizedActionError(
          "CREATE_TRIAGE_CASE",
          "AI cannot create or open triage cases."
        );
      }

      if (userRole === UserRole.EXAMINER) {
        throw new UnauthorizedActionError(
          "CREATE_TRIAGE_CASE",
          "Examiners are not authorized to create triage cases. Required: MODERATOR or ADMIN."
        );
      }

      const created = await createHandler.execute({
        id: parsed.data.id,
        caseNumber: parsed.data.caseNumber,
        qualitySignalId: parsed.data.qualitySignalId,
        priority: parsed.data.priority,
        notes: parsed.data.notes,
        actorId,
        actorType: actorType as "USER" | "AI" | "SYSTEM",
        userRole: userRole as "MODERATOR" | "ADMIN" | "EXAMINER",
      });

      return reply.code(201).send(created);
    });

    /**
     * POST /api/v1/triage-cases/:caseId/assign
     * Assigns a TriageCase to a reviewer/moderator.
     * Conforms to 06-api-contract.md §31, §67.
     */
    fastify.post<{ Params: { caseId: string } }>(
      "/:caseId/assign",
      async (request, reply) => {
        const { caseId } = request.params;
        const parsed = AssignTriageCaseRequestSchema.safeParse(request.body);
        if (!parsed.success) {
          throw parsed.error;
        }

        const actorType = (request.headers["x-actor-type"] as string) || ActorType.USER;
        const actorId =
          (request.headers["x-actor-id"] as string)?.trim() ||
          (request.headers["x-user-id"] as string)?.trim() ||
          "moderator_1";
        const userRole = (request.headers["x-user-role"] as string) || UserRole.MODERATOR;

        if (actorType === ActorType.AI) {
          throw new UnauthorizedActionError(
            "ASSIGN_TRIAGE_CASE",
            "AI cannot assign triage cases."
          );
        }

        if (userRole === UserRole.EXAMINER) {
          throw new UnauthorizedActionError(
            "ASSIGN_TRIAGE_CASE",
            "Examiners are not authorized to assign triage cases. Required: MODERATOR or ADMIN."
          );
        }

        const assigned = await assignHandler.execute({
          caseId,
          assigneeId: parsed.data.assigneeId,
          expectedVersion: parsed.data.expectedVersion,
          actorId,
          actorType: actorType as "USER" | "AI" | "SYSTEM",
          userRole: userRole as "MODERATOR" | "ADMIN" | "EXAMINER",
        });

        return reply.code(200).send(assigned);
      }
    );
  };
};
