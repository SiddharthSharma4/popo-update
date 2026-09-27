/**
 * QualitySignal HTTP routes and controller endpoints.
 * Conforms to docs/contracts/06-api-contract.md §25-27, §65.
 * Strictly read-only; clients cannot arbitrarily create QualitySignals via POST.
 */

import type { FastifyPluginAsync } from "fastify";
import { ActorType } from "@osm/shared";
import type { QualitySignalRepository } from "../../domain/quality-signal/quality-signal-repository.js";
import { toQualitySignalDto } from "../../application/dtos/quality-signal.dto.js";
import { EntityNotFoundError, InvalidCommandError, UnauthorizedActionError } from "../../application/common/errors.js";

export const qualitySignalRoutes = (
  qualitySignalRepo: QualitySignalRepository
): FastifyPluginAsync => {
  return async (fastify) => {
    /**
     * GET /api/v1/quality-signals
     * Lists quality signals, optionally filtered by evaluationId or status.
     * Conforms to 06-api-contract.md §25.
     */
    fastify.get<{
      Querystring: { evaluationId?: string; status?: string };
    }>("/", async (request, reply) => {
      const actorType = (request.headers["x-actor-type"] as string)?.toUpperCase();
      const userRole = (request.headers["x-user-role"] as string)?.toUpperCase();

      if (actorType === ActorType.AI || userRole === "AI") {
        throw new UnauthorizedActionError(
          "INSPECT_QUALITY_SIGNALS",
          "AI actors are not authorized to inspect quality signals."
        );
      }

      const { evaluationId, status } = request.query;

      if (evaluationId !== undefined) {
        if (!evaluationId.trim()) {
          throw new InvalidCommandError(
            "ListQualitySignals",
            "Evaluation ID cannot be empty or whitespace."
          );
        }
        const signals = await qualitySignalRepo.findByEvaluationId(evaluationId.trim());
        return reply.code(200).send(signals.map(toQualitySignalDto));
      }

      if (status === "REVIEWABLE") {
        const signals = await qualitySignalRepo.findReviewable();
        return reply.code(200).send(signals.map(toQualitySignalDto));
      }

      // If no filter, return reviewable signals by default
      const signals = await qualitySignalRepo.findReviewable();
      return reply.code(200).send(signals.map(toQualitySignalDto));
    });

    /**
     * GET /api/v1/quality-signals/:signalId
     * Retrieves a single QualitySignal by its ID.
     * Conforms to 06-api-contract.md §25, §65.
     */
    fastify.get<{ Params: { signalId: string } }>(
      "/:signalId",
      async (request, reply) => {
        const actorType = (request.headers["x-actor-type"] as string)?.toUpperCase();
        const userRole = (request.headers["x-user-role"] as string)?.toUpperCase();

        if (actorType === ActorType.AI || userRole === "AI") {
          throw new UnauthorizedActionError(
            "INSPECT_QUALITY_SIGNALS",
            "AI actors are not authorized to inspect quality signals."
          );
        }

        const { signalId } = request.params;
        if (!signalId || signalId.trim() === "") {
          throw new InvalidCommandError(
            "GetQualitySignal",
            "Signal ID cannot be empty or whitespace."
          );
        }

        const signal = await qualitySignalRepo.findById(signalId.trim());
        if (!signal) {
          throw new EntityNotFoundError("QualitySignal", signalId.trim());
        }

        return reply.code(200).send(toQualitySignalDto(signal));
      }
    );
  };
};
