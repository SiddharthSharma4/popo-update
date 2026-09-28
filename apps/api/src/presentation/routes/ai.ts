/**
 * Presentation routes for AI Advisory & Semantic Assistance.
 * Conforms to:
 * - docs/contracts/02-architecture-contract.md §25-30 (AI Architecture Boundary & Fallback)
 * - docs/contracts/06-api-contract.md §34-36 (AI Advisory & Non-Authority)
 * - docs/contracts/10-demo-contract.md §19-20 (AI Recommendation Demonstration)
 *
 * Invariants:
 * - Purely advisory: AI output never mutates evaluation marks, scores, or operational statuses.
 * - Server-side role boundaries enforced: MODERATOR and ADMIN only; EXAMINER and AI rejected (403).
 */

import type { FastifyPluginAsync } from "fastify";
import {
  GenerateAiAdvisoryRequestSchema,
  UserRole,
  ActorType,
} from "@osm/shared";
import type { AiService } from "../../application/ai/ai-service.js";
import { UnauthorizedActionError } from "../../application/common/errors.js";
import { InvalidArgumentError } from "../../domain/errors.js";
import { AuditEvent, type AuditRepository } from "../../domain/audit/index.js";

export interface AiRouteOptions {
  aiService: AiService;
  auditRepo?: AuditRepository;
}

export const aiRoutes = (options: AiRouteOptions): FastifyPluginAsync => {
  return async (fastify) => {
    const { aiService, auditRepo } = options;

    /**
     * POST /api/v1/ai/advisory
     * Generates structured non-authoritative AI advisory analysis.
     * Conforms to 06-api-contract.md §35.
     */
    fastify.post("/advisory", async (request, reply) => {
      const actorType = (
        (request.headers["x-actor-type"] as string) || ActorType.USER
      ).toUpperCase();
      const userRole = (
        (request.headers["x-user-role"] as string) || UserRole.EXAMINER
      ).toUpperCase();
      const actorId =
        (request.headers["x-actor-id"] as string) || "moderator_1";

      // AI cannot request AI advisory on its own authority (INV-003)
      if (actorType === ActorType.AI || userRole === "AI") {
        throw new UnauthorizedActionError(
          "GENERATE_AI_ADVISORY",
          "AI actors are not authorized to invoke AI advisory services."
        );
      }

      // Role check: Only MODERATOR or ADMIN can access moderation advisory
      if (userRole !== UserRole.MODERATOR && userRole !== UserRole.ADMIN) {
        throw new UnauthorizedActionError(
          "GENERATE_AI_ADVISORY",
          `Only moderators and administrators may request advisory analysis. Active role: ${userRole}.`
        );
      }

      // Validate request body
      const parseResult = GenerateAiAdvisoryRequestSchema.safeParse(request.body);
      if (!parseResult.success) {
        throw new InvalidArgumentError(
          `Invalid AI advisory request: ${parseResult.error.errors.map((e) => e.message).join(", ")}`
        );
      }

      const { evaluationId, assistanceType, qualitySignalId, triageCaseId } = parseResult.data;

      const advisory = await aiService.generateAdvisory({
        evaluationId,
        assistanceType,
        qualitySignalId,
        triageCaseId,
      });

      // Record immutable audit event upon successful advisory generation (INV-005)
      if (auditRepo) {
        try {
          const auditEvent = AuditEvent.create({
            eventType: "AiAdvisoryGenerated",
            actorType,
            actorId,
            entityType: "Evaluation",
            entityId: evaluationId,
            action: "GENERATE_AI_ADVISORY",
            details: {
              evaluationId,
              triageCaseId: triageCaseId ?? null,
              qualitySignalId: qualitySignalId ?? null,
              assistanceType,
              advisoryId: advisory.id,
              provider: advisory.model?.provider,
              model: advisory.model?.model,
              confidence: advisory.confidence,
              status: advisory.status,
            },
          });

          await auditRepo.record(auditEvent);
        } catch (auditError) {
          request.log.error(auditError, "Failed to record AI advisory audit event");
        }
      }

      return reply.code(200).send(advisory);
    });
  };
};
