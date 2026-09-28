/**
 * Quality Analytics and QualityPulse HTTP routes and controller endpoints.
 * Conforms to:
 * - docs/contracts/01-product-contract.md §15 (QualityPulse overview & drill-down)
 * - docs/contracts/01-product-contract.md §16 (SentinelFlag statistical signals)
 * - docs/contracts/02-architecture-contract.md §12, §31, §61 (Analytics & Read Models)
 * - docs/contracts/05-domain-contract.md §37, AP-DOM-004, INV-004
 * - docs/contracts/06-api-contract.md §12, §21, §41-45
 * - docs/contracts/08-data-contract.md §4.2, §53
 *
 * Invariants:
 * - Read-only analytical inspection & non-authoritative signal generation (INV-003, INV-004).
 * - Restricted access: only MODERATOR and ADMIN roles are authorized.
 * - EXAMINER and AI actors are rejected with 403 Forbidden.
 * - Returns deeply structured, deterministic, validated response models.
 */

import type { FastifyPluginAsync } from "fastify";
import {
  GetEvaluatorAnalyticsQuerySchema,
  GetQualityAnalyticsQuerySchema,
  GetQualityPulseQuerySchema,
  UserRole,
  ActorType,
} from "@osm/shared";
import {
  QualityAnalyticsService,
  QualityPulseService,
  InvalidCommandError,
  UnauthorizedActionError,
  EntityNotFoundError,
} from "../../application/index.js";
import { AuditEvent, type AuditRepository } from "../../domain/audit/index.js";

export interface AnalyticsRoutesOptions {
  analyticsService: QualityAnalyticsService;
  qualityPulseService?: QualityPulseService;
  auditRepo?: AuditRepository;
}

export const analyticsRoutes = (
  analyticsServiceOrOpts: QualityAnalyticsService | AnalyticsRoutesOptions,
  maybePulseService?: QualityPulseService
): FastifyPluginAsync => {
  const analyticsService =
    "analyticsService" in analyticsServiceOrOpts
      ? analyticsServiceOrOpts.analyticsService
      : analyticsServiceOrOpts;

  const qualityPulseService =
    "qualityPulseService" in analyticsServiceOrOpts
      ? analyticsServiceOrOpts.qualityPulseService
      : maybePulseService;

  const auditRepo =
    "auditRepo" in analyticsServiceOrOpts
      ? analyticsServiceOrOpts.auditRepo
      : undefined;

  function verifyAnalyticsAuthorization(
    actorTypeHeader?: string,
    userRoleHeader?: string
  ): void {
    const actorType = actorTypeHeader || ActorType.USER;
    const rawRole = (userRoleHeader || UserRole.MODERATOR).toString().trim().toUpperCase();
    const userRole = rawRole === "ADMINISTRATOR" ? UserRole.ADMIN : rawRole;

    if (actorType === ActorType.AI) {
      throw new UnauthorizedActionError(
        "INSPECT_ANALYTICS",
        "AI actors are not authorized to inspect quality analytics."
      );
    }

    if (userRole === UserRole.EXAMINER) {
      throw new UnauthorizedActionError(
        "INSPECT_ANALYTICS",
        "Examiners are not authorized to inspect comparative analytics. Required: MODERATOR or ADMIN."
      );
    }

    if (userRole !== UserRole.MODERATOR && userRole !== UserRole.ADMIN) {
      throw new UnauthorizedActionError(
        "INSPECT_ANALYTICS",
        `Role '${userRole}' is not authorized to inspect analytics. Required: MODERATOR or ADMIN.`
      );
    }
  }

  return async (fastify) => {
    /**
     * GET /api/v1/analytics/evaluators
     * Computes and lists evaluator deviation metrics across an evaluation cohort.
     */
    fastify.get<{ Querystring: Record<string, unknown> }>(
      "/evaluators",
      async (request, reply) => {
        verifyAnalyticsAuthorization(
          request.headers["x-actor-type"] as string | undefined,
          request.headers["x-user-role"] as string | undefined
        );

        const parsed = GetEvaluatorAnalyticsQuerySchema.safeParse(request.query);
        if (!parsed.success) {
          throw parsed.error;
        }

        const { evaluationCycleId, evaluatorId, minSampleSize } = parsed.data;
        const metrics = await analyticsService.computeEvaluatorMetrics({
          evaluationCycleId,
          minSampleSize,
        });

        if (evaluatorId) {
          const filtered = metrics.filter((m) => m.evaluatorId === evaluatorId);
          return reply.code(200).send(filtered);
        }

        return reply.code(200).send(metrics);
      }
    );

    /**
     * GET /api/v1/analytics/evaluators/:evaluatorId
     * Retrieves deviation analytics for a single evaluator.
     */
    fastify.get<{
      Params: { evaluatorId: string };
      Querystring: Record<string, unknown>;
    }>("/evaluators/:evaluatorId", async (request, reply) => {
      verifyAnalyticsAuthorization(
        request.headers["x-actor-type"] as string | undefined,
        request.headers["x-user-role"] as string | undefined
      );

      const parsed = GetEvaluatorAnalyticsQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        throw parsed.error;
      }

      const { evaluatorId } = request.params;
      if (!evaluatorId || evaluatorId.trim() === "") {
        throw new InvalidCommandError(
          "GetEvaluatorMetrics",
          "Evaluator ID cannot be empty or whitespace."
        );
      }
      const { evaluationCycleId, minSampleSize } = parsed.data;

      const metric = await analyticsService.computeSingleEvaluatorMetric(
        evaluatorId.trim(),
        {
          evaluationCycleId,
          minSampleSize,
        }
      );

      if (!metric) {
        throw new EntityNotFoundError("EvaluatorAnalytics", evaluatorId);
      }

      return reply.code(200).send(metric);
    });

    /**
     * GET /api/v1/analytics/summary
     * Computes high-level quality analytics summary including evaluator cohorts,
     * question difficulty distributions, quality signal counts, and moderation throughput.
     */
    fastify.get<{ Querystring: Record<string, unknown> }>(
      "/summary",
      async (request, reply) => {
        verifyAnalyticsAuthorization(
          request.headers["x-actor-type"] as string | undefined,
          request.headers["x-user-role"] as string | undefined
        );

        const parsed = GetQualityAnalyticsQuerySchema.safeParse(request.query);
        if (!parsed.success) {
          throw parsed.error;
        }

        const { evaluationCycleId, minSampleSize } = parsed.data;
        const summary = await analyticsService.computeQualitySummary({
          evaluationCycleId,
          minSampleSize,
        });

        return reply.code(200).send(summary);
      }
    );

    /**
     * GET /api/v1/analytics/quality-pulse
     * Returns consolidated QualityPulse real-time overview.
     */
    fastify.get<{ Querystring: Record<string, unknown> }>(
      "/quality-pulse",
      async (request, reply) => {
        verifyAnalyticsAuthorization(
          request.headers["x-actor-type"] as string | undefined,
          request.headers["x-user-role"] as string | undefined
        );

        if (!qualityPulseService) {
          throw new Error("QualityPulseService is not configured.");
        }

        const parsed = GetQualityPulseQuerySchema.safeParse(request.query);
        if (!parsed.success) {
          throw parsed.error;
        }

        const { evaluationCycleId, minSampleSize, limit } = parsed.data;
        const pulse = await qualityPulseService.getQualityPulse({
          evaluationCycleId,
          minSampleSize,
          limit,
        });

        return reply.code(200).send(pulse);
      }
    );

    /**
     * GET /api/v1/analytics/quality-pulse/hotspots
     * Returns prioritized emerging quality hotspots with drill-down evidence.
     */
    fastify.get<{ Querystring: Record<string, unknown> }>(
      "/quality-pulse/hotspots",
      async (request, reply) => {
        verifyAnalyticsAuthorization(
          request.headers["x-actor-type"] as string | undefined,
          request.headers["x-user-role"] as string | undefined
        );

        if (!qualityPulseService) {
          throw new Error("QualityPulseService is not configured.");
        }

        const parsed = GetQualityPulseQuerySchema.safeParse(request.query);
        if (!parsed.success) {
          throw parsed.error;
        }

        const { evaluationCycleId, minSampleSize, limit } = parsed.data;
        const hotspots = await qualityPulseService.getHotspots({
          evaluationCycleId,
          minSampleSize,
          limit,
        });

        return reply.code(200).send(hotspots);
      }
    );

    /**
     * POST /api/v1/analytics/quality-pulse/trigger-sentinel
     * (and alias POST /api/v1/analytics/sentinel/trigger)
     * Triggers SentinelFlag statistical anomaly detection across an evaluation cycle,
     * materializing and persisting evidence-bearing QualitySignals for newly detected evaluator anomalies.
     */
    const triggerSentinelHandler = async (
      request: {
        headers: Record<string, unknown>;
        query: Record<string, unknown>;
        body?: Record<string, unknown>;
        log: { error: (err: unknown, msg: string) => void };
      },
      reply: { code: (statusCode: number) => { send: (payload: unknown) => unknown } }
    ) => {
      verifyAnalyticsAuthorization(
        request.headers["x-actor-type"] as string | undefined,
        request.headers["x-user-role"] as string | undefined
      );

      if (!qualityPulseService) {
        throw new Error("QualityPulseService is not configured.");
      }

      const bodyOrQuery = {
        ...request.query,
        ...(request.body ?? {}),
      };

      const parsed = GetQualityPulseQuerySchema.safeParse(bodyOrQuery);
      if (!parsed.success) {
        throw parsed.error;
      }

      const { evaluationCycleId, minSampleSize } = parsed.data;
      const thresholdPercent =
        typeof bodyOrQuery.thresholdPercent === "number"
          ? bodyOrQuery.thresholdPercent
          : undefined;
      const criticalThresholdPercent =
        typeof bodyOrQuery.criticalThresholdPercent === "number"
          ? bodyOrQuery.criticalThresholdPercent
          : undefined;

      const result = await qualityPulseService.triggerSentinel({
        evaluationCycleId,
        minSampleSize,
        thresholdPercent,
        criticalThresholdPercent,
      });

      // Record immutable audit event upon successful Sentinel scan (INV-005)
      if (auditRepo) {
        try {
          const actorType =
            ((request.headers["x-actor-type"] as string) || ActorType.USER).toUpperCase();
          const actorId =
            (request.headers["x-actor-id"] as string) || "admin_1";
          const cycleId = evaluationCycleId || "cycle-2026-demo";

          const auditEvent = AuditEvent.create({
            eventType: "SentinelScanRun",
            actorType,
            actorId,
            entityType: "EvaluationCycle",
            entityId: cycleId,
            action: "TRIGGER_SENTINEL",
            details: {
              evaluationCycleId: cycleId,
              evaluatorsAnalyzed: result.evaluatorsAnalyzed,
              anomaliesDetected: result.anomaliesDetected,
              newSignalsGenerated: result.newSignalsGenerated,
              signalIds: result.signals.map((s) => s.id),
            },
          });

          await auditRepo.record(auditEvent);
        } catch (auditError) {
          request.log.error(auditError, "Failed to record Sentinel scan audit event");
        }
      }

      return reply.code(200).send(result);
    };

    fastify.post("/quality-pulse/trigger-sentinel", triggerSentinelHandler as any);
    fastify.post("/sentinel/trigger", triggerSentinelHandler as any);
  };
};
