/**
 * TriageCase HTTP routes and controller endpoints.
 * Conforms to docs/contracts/06-api-contract.md §29-32, §66-67.
 *
 * Invariants:
 * - Only human moderators or admins may create, assign, or resolve triage cases.
 * - AI cannot create, assign, or resolve triage cases.
 * - Human Resolution workflow implemented per TASK-P5-MOD-002 (POST /:caseId/resolve).
 */

import type { FastifyPluginAsync } from "fastify";
import {
  CreateTriageCaseRequestSchema,
  AssignTriageCaseRequestSchema,
  ResolveTriageCaseRequestSchema,
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
  ResolveTriageCaseHandler,
  GetTriageCaseByIdHandler,
  ListTriageCasesHandler,
} from "../../application/index.js";
import { InvalidCommandError, UnauthorizedActionError } from "../../application/common/errors.js";

export interface TriageCaseRouteDependencies {
  uow: UnitOfWork;
  triageCaseRepo: TriageCaseRepository;
}

export const triageCaseRoutes = (
  deps: TriageCaseRouteDependencies
): FastifyPluginAsync => {
  const createHandler = new CreateTriageCaseHandler(deps.uow);
  const assignHandler = new AssignTriageCaseHandler(deps.uow);
  const resolveHandler = new ResolveTriageCaseHandler(deps.uow);
  const getByIdHandler = new GetTriageCaseByIdHandler(deps.triageCaseRepo);
  const listHandler = new ListTriageCasesHandler(deps.triageCaseRepo);

  function verifyTriageCaseAuthorization(
    action: string,
    actorTypeHeader?: string,
    userRoleHeader?: string
  ): { actorType: string; userRole: string } {
    const actorType = (actorTypeHeader || ActorType.USER).toUpperCase();
    const userRole = (userRoleHeader || UserRole.MODERATOR).toUpperCase();

    if (actorType === ActorType.AI || userRole === "AI") {
      throw new UnauthorizedActionError(
        action,
        "AI cannot inspect or manage triage cases."
      );
    }

    if (userRole === UserRole.EXAMINER) {
      throw new UnauthorizedActionError(
        action,
        `Examiners are not authorized to perform '${action}'. Required: MODERATOR or ADMIN.`
      );
    }

    if (userRole !== UserRole.MODERATOR && userRole !== UserRole.ADMIN) {
      throw new UnauthorizedActionError(
        action,
        `Role '${userRole}' is not authorized to perform '${action}'. Required: MODERATOR or ADMIN.`
      );
    }

    return { actorType, userRole };
  }

  return async (fastify) => {
    /**
     * GET /api/v1/triage-cases
     * Lists triage cases with optional filtering.
     * Conforms to 06-api-contract.md §29.
     */
    fastify.get<{ Querystring: Record<string, unknown> }>(
      "/",
      async (request, reply) => {
        verifyTriageCaseAuthorization(
          "LIST_TRIAGE_CASES",
          request.headers["x-actor-type"] as string | undefined,
          request.headers["x-user-role"] as string | undefined
        );

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
        verifyTriageCaseAuthorization(
          "GET_TRIAGE_CASE",
          request.headers["x-actor-type"] as string | undefined,
          request.headers["x-user-role"] as string | undefined
        );

        const { caseId } = request.params;
        if (!caseId || caseId.trim() === "") {
          throw new InvalidCommandError(
            "GetTriageCase",
            "Case ID cannot be empty or whitespace."
          );
        }

        const triageCase = await getByIdHandler.execute(caseId.trim());
        return reply.code(200).send(triageCase);
      }
    );

    /**
     * POST /api/v1/triage-cases
     * Creates a new TriageCase linked to a QualitySignal.
     * Conforms to 06-api-contract.md §30.
     */
    fastify.post("/", async (request, reply) => {
      const auth = verifyTriageCaseAuthorization(
        "CREATE_TRIAGE_CASE",
        request.headers["x-actor-type"] as string | undefined,
        request.headers["x-user-role"] as string | undefined
      );

      const parsed = CreateTriageCaseRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        throw parsed.error;
      }

      const actorId =
        (request.headers["x-actor-id"] as string)?.trim() ||
        (request.headers["x-user-id"] as string)?.trim() ||
        "moderator_1";

      const created = await createHandler.execute({
        id: parsed.data.id,
        caseNumber: parsed.data.caseNumber,
        qualitySignalId: parsed.data.qualitySignalId,
        priority: parsed.data.priority,
        notes: parsed.data.notes,
        actorId,
        actorType: auth.actorType as "USER" | "AI" | "SYSTEM",
        userRole: auth.userRole as "MODERATOR" | "ADMIN" | "EXAMINER",
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
        if (!caseId || caseId.trim() === "") {
          throw new InvalidCommandError(
            "AssignTriageCase",
            "Case ID cannot be empty or whitespace."
          );
        }

        const auth = verifyTriageCaseAuthorization(
          "ASSIGN_TRIAGE_CASE",
          request.headers["x-actor-type"] as string | undefined,
          request.headers["x-user-role"] as string | undefined
        );

        const parsed = AssignTriageCaseRequestSchema.safeParse(request.body);
        if (!parsed.success) {
          throw parsed.error;
        }

        const actorId =
          (request.headers["x-actor-id"] as string)?.trim() ||
          (request.headers["x-user-id"] as string)?.trim() ||
          "moderator_1";

        const assigned = await assignHandler.execute({
          caseId: caseId.trim(),
          assigneeId: parsed.data.assigneeId,
          expectedVersion: parsed.data.expectedVersion,
          actorId,
          actorType: auth.actorType as "USER" | "AI" | "SYSTEM",
          userRole: auth.userRole as "MODERATOR" | "ADMIN" | "EXAMINER",
        });

        return reply.code(200).send(assigned);
      }
    );

    /**
     * POST /api/v1/triage-cases/:caseId/resolve
     * Resolves a TriageCase by an authorized human moderator.
     * Conforms to 06-api-contract.md §32-33, §66-67.
     */
    fastify.post<{ Params: { caseId: string } }>(
      "/:caseId/resolve",
      async (request, reply) => {
        const { caseId } = request.params;
        if (!caseId || caseId.trim() === "") {
          throw new InvalidCommandError(
            "ResolveTriageCase",
            "Case ID cannot be empty or whitespace."
          );
        }

        const auth = verifyTriageCaseAuthorization(
          "RESOLVE_TRIAGE_CASE",
          request.headers["x-actor-type"] as string | undefined,
          request.headers["x-user-role"] as string | undefined
        );

        if (auth.actorType === ActorType.SYSTEM) {
          throw new UnauthorizedActionError(
            "RESOLVE_TRIAGE_CASE",
            "Automated system cannot resolve triage cases. Human resolution is required."
          );
        }

        const parsed = ResolveTriageCaseRequestSchema.safeParse(request.body);
        if (!parsed.success) {
          throw parsed.error;
        }

        const actorId =
          (request.headers["x-actor-id"] as string)?.trim() ||
          (request.headers["x-user-id"] as string)?.trim() ||
          "moderator_1";

        const resolved = await resolveHandler.execute({
          caseId: caseId.trim(),
          outcome: parsed.data.outcome,
          reason: parsed.data.reason,
          notes: parsed.data.notes,
          evidenceReferences: parsed.data.evidenceReferences,
          expectedVersion: parsed.data.expectedVersion,
          actorId,
          actorType: auth.actorType as "USER" | "AI" | "SYSTEM",
          userRole: auth.userRole as "MODERATOR" | "ADMIN" | "EXAMINER",
        });

        return reply.code(200).send(resolved);
      }
    );
  };
};
