/**
 * OSM Integration HTTP Routes.
 * Conforms to:
 * - docs/contracts/06-api-contract.md §54-56 (External OSM Integration Boundary)
 * - docs/contracts/06-api-contract.md §12, §41-45 (Security, canonical error envelopes)
 * - docs/contracts/08-data-contract.md §37-40, §108-111 (Idempotency, Normalization)
 *
 * Invariants:
 * - External vendor payloads validated strictly via Zod at the boundary.
 * - Restricted to MODERATOR and ADMIN roles, or INTEGRATION actor type.
 * - Rejects EXAMINER and AI actors with 403 Forbidden.
 * - Returns 201 Created for new evaluations, 200 OK for idempotent replays.
 */

import type { FastifyPluginAsync } from "fastify";
import {
  ExternalOsmEvaluationSchema,
  ExternalOsmBatchImportSchema,
  UserRole,
  ActorType,
} from "@osm/shared";
import {
  IngestOsmEvaluationHandler,
  IngestOsmBatchHandler,
  UnauthorizedActionError,
} from "../../application/index.js";

export interface IntegrationRoutesOptions {
  ingestHandler: IngestOsmEvaluationHandler;
  batchHandler?: IngestOsmBatchHandler;
}

export const integrationRoutes = (
  options: IntegrationRoutesOptions
): FastifyPluginAsync => {
  const { ingestHandler, batchHandler = new IngestOsmBatchHandler(ingestHandler) } =
    options;

  function verifyIntegrationAuthorization(
    actorTypeHeader?: string,
    userRoleHeader?: string
  ): { actorType: string; role: string; actorId: string } {
    const actorType = (actorTypeHeader || ActorType.INTEGRATION).toUpperCase();
    const role = (userRoleHeader || UserRole.MODERATOR).toUpperCase();

    if (actorType === ActorType.AI || role === "AI") {
      throw new UnauthorizedActionError(
        "INTEGRATION_ACCESS",
        "AI actors are strictly prohibited from ingesting evaluations."
      );
    }

    if (role === UserRole.EXAMINER) {
      throw new UnauthorizedActionError(
        "INTEGRATION_ACCESS",
        "Examiners cannot invoke OSM ingestion. Required: MODERATOR or ADMIN."
      );
    }

    if (
      role !== UserRole.MODERATOR &&
      role !== UserRole.ADMIN &&
      actorType !== ActorType.INTEGRATION &&
      actorType !== ActorType.SYSTEM
    ) {
      throw new UnauthorizedActionError(
        "INTEGRATION_ACCESS",
        "Examiners and unauthorized roles cannot invoke OSM ingestion. Required: MODERATOR or ADMIN."
      );
    }

    return { actorType, role, actorId: "osm-integration-client" };
  }

  return async (fastify) => {
    /**
     * POST /api/v1/integration/osm/ingest
     * Ingests a single external OSM evaluation.
     */
    fastify.post("/ingest", async (request, reply) => {
      const actorType = request.headers["x-actor-type"] as string | undefined;
      const userRole = request.headers["x-user-role"] as string | undefined;
      const customActorId = request.headers["x-actor-id"] as string | undefined;

      const auth = verifyIntegrationAuthorization(actorType, userRole);
      const actor = {
        actorId: customActorId || auth.actorId,
        role: auth.role,
        actorType: auth.actorType,
      };

      const parseResult = ExternalOsmEvaluationSchema.safeParse(request.body);
      if (!parseResult.success) {
        throw parseResult.error;
      }

      const result = await ingestHandler.execute(parseResult.data, actor);

      const statusCode = result.status === "CREATED" ? 201 : 200;
      return reply.code(statusCode).send(result);
    });

    /**
     * POST /api/v1/integration/osm/ingest-batch
     * Ingests a batch of external OSM evaluations.
     */
    fastify.post("/ingest-batch", async (request, reply) => {
      const actorType = request.headers["x-actor-type"] as string | undefined;
      const userRole = request.headers["x-user-role"] as string | undefined;
      const customActorId = request.headers["x-actor-id"] as string | undefined;

      const auth = verifyIntegrationAuthorization(actorType, userRole);
      const actor = {
        actorId: customActorId || auth.actorId,
        role: auth.role,
        actorType: auth.actorType,
      };

      const parseResult = ExternalOsmBatchImportSchema.safeParse(request.body);
      if (!parseResult.success) {
        throw parseResult.error;
      }

      const result = await batchHandler.execute(parseResult.data, actor);
      return reply.code(200).send(result);
    });
  };
};
