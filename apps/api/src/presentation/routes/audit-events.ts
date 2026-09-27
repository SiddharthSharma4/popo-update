/**
 * AuditEvent HTTP routes and controller endpoints.
 * Conforms to:
 * - docs/contracts/06-api-contract.md §37-40, §44-45, §69
 * - docs/contracts/05-domain-contract.md §29-31, INV-005
 * - docs/contracts/02-architecture-contract.md §37-38, §46
 * - docs/contracts/08-data-contract.md §24-27
 *
 * Invariants:
 * - Strictly read-only inspection (no POST/PUT/DELETE endpoints).
 * - Only authorized human roles (MODERATOR, ADMIN) may inspect audit events.
 * - AI and EXAMINER actors are forbidden from inspecting audit events.
 * - Deterministic ordering and structured pagination metadata returned.
 */

import type { FastifyPluginAsync } from "fastify";
import {
  ListAuditEventsQuerySchema,
  UserRole,
  ActorType,
} from "@osm/shared";
import type { AuditRepository } from "../../domain/audit/index.js";
import {
  GetAuditEventByIdHandler,
  ListAuditEventsHandler,
  InvalidCommandError,
  UnauthorizedActionError,
} from "../../application/index.js";

export const auditEventRoutes = (
  auditRepo: AuditRepository
): FastifyPluginAsync => {
  const getByIdHandler = new GetAuditEventByIdHandler(auditRepo);
  const listHandler = new ListAuditEventsHandler(auditRepo);

  function verifyAuditAuthorization(
    actorTypeHeader?: string,
    userRoleHeader?: string
  ): void {
    const actorType = actorTypeHeader || ActorType.USER;
    const userRole = userRoleHeader || UserRole.MODERATOR;

    if (actorType === ActorType.AI) {
      throw new UnauthorizedActionError(
        "INSPECT_AUDIT_LOG",
        "AI is not authorized to inspect audit logs."
      );
    }

    if (userRole === UserRole.EXAMINER) {
      throw new UnauthorizedActionError(
        "INSPECT_AUDIT_LOG",
        "Examiners are not authorized to inspect audit events. Required: MODERATOR or ADMIN."
      );
    }

    if (userRole !== UserRole.MODERATOR && userRole !== UserRole.ADMIN) {
      throw new UnauthorizedActionError(
        "INSPECT_AUDIT_LOG",
        `Role '${userRole}' is not authorized to inspect audit events. Required: MODERATOR or ADMIN.`
      );
    }
  }

  return async (fastify) => {
    /**
     * GET /api/v1/audit-events
     * Lists audit events with filtering, pagination, and deterministic ordering.
     * Conforms to 06-api-contract.md §37, §44-45, §69.
     */
    fastify.get<{ Querystring: Record<string, unknown> }>(
      "/",
      async (request, reply) => {
        verifyAuditAuthorization(
          request.headers["x-actor-type"] as string | undefined,
          request.headers["x-user-role"] as string | undefined
        );

        const parsed = ListAuditEventsQuerySchema.safeParse(request.query);
        if (!parsed.success) {
          throw parsed.error;
        }

        const {
          page,
          pageSize,
          limit,
          offset,
          entityType,
          entityId,
          actorType,
          actorId,
          eventType,
          action,
          sortOrder,
        } = parsed.data;

        const effectivePageSize = limit ?? pageSize;
        const events = await listHandler.execute(
          {
            entityType,
            entityId,
            actorType,
            actorId,
            eventType,
            action,
          },
          {
            page,
            pageSize: effectivePageSize,
            limit,
            offset,
            sortOrder,
          }
        );

        return reply.code(200).send(events);
      }
    );

    /**
     * GET /api/v1/audit-events/:eventId
     * Retrieves a single AuditEvent by its ID.
     * Conforms to 06-api-contract.md §37, §69.
     */
    fastify.get<{ Params: { eventId: string } }>(
      "/:eventId",
      async (request, reply) => {
        verifyAuditAuthorization(
          request.headers["x-actor-type"] as string | undefined,
          request.headers["x-user-role"] as string | undefined
        );

        const { eventId } = request.params;
        if (!eventId || eventId.trim() === "") {
          throw new InvalidCommandError(
            "GetAuditEvent",
            "Event ID cannot be empty or whitespace."
          );
        }

        const event = await getByIdHandler.execute(eventId.trim());
        return reply.code(200).send(event);
      }
    );
  };
};
