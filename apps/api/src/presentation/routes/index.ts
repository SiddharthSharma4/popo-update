/**
 * API route registry for /api/v1.
 * Conforms to docs/contracts/06-api-contract.md §5, §21.
 */

import type { FastifyPluginAsync } from "fastify";
import type { KyselyDb } from "../../infrastructure/database/database.js";
import { EvaluationApplicationService } from "../../application/services/evaluation.service.js";
import { KyselyUnitOfWork } from "../../infrastructure/persistence/kysely-unit-of-work.js";
import { KyselyEvaluationRepository } from "../../infrastructure/repositories/kysely-evaluation-repository.js";
import { KyselyQualitySignalRepository } from "../../infrastructure/repositories/kysely-quality-signal-repository.js";
import { KyselyTriageCaseRepository } from "../../infrastructure/repositories/kysely-triage-case-repository.js";
import { KyselyAuditRepository } from "../../infrastructure/repositories/kysely-audit-repository.js";
import { KyselyIdempotencyRepository } from "../../infrastructure/repositories/kysely-idempotency-repository.js";
import { healthRoutes } from "./health.js";
import { evaluationRoutes } from "./evaluations.js";
import { qualitySignalRoutes } from "./quality-signals.js";
import { triageCaseRoutes } from "./triage-cases.js";
import { auditEventRoutes } from "./audit-events.js";
import { analyticsRoutes } from "./analytics.js";
import { integrationRoutes } from "./integration.js";
import { KyselyResolutionRepository } from "../../infrastructure/repositories/kysely-resolution-repository.js";
import { KyselyRubricRepository } from "../../infrastructure/repositories/kysely-rubric-repository.js";
import {
  QualityAnalyticsService,
  QualityPulseService,
} from "../../application/analytics/index.js";
import {
  IngestOsmEvaluationHandler,
  IngestOsmBatchHandler,
} from "../../application/commands/ingest-osm-evaluation.command.js";
import { DemoScenarioService } from "../../application/demo/demo-scenario.service.js";
import { demoRoutes } from "./demo.js";
import { AiService } from "../../application/ai/ai-service.js";
import { AiContextBuilder } from "../../application/ai/ai-context-builder.js";
import { DeterministicMockAiProvider } from "../../infrastructure/ai/mock-ai-provider.js";
import { aiRoutes } from "./ai.js";

export interface ApiV1Options {
  db: KyselyDb;
  evaluationService?: EvaluationApplicationService;
  analyticsService?: QualityAnalyticsService;
  qualityPulseService?: QualityPulseService;
  ingestHandler?: IngestOsmEvaluationHandler;
  batchHandler?: IngestOsmBatchHandler;
  demoService?: DemoScenarioService;
  aiService?: AiService;
}

export const apiV1Routes = (optsOrDb: ApiV1Options | KyselyDb): FastifyPluginAsync => {
  return async (fastify) => {
    const db = "db" in optsOrDb ? optsOrDb.db : optsOrDb;
    const uow = new KyselyUnitOfWork(db);
    const evalRepo = new KyselyEvaluationRepository(db);
    const rubricRepo = new KyselyRubricRepository(db);
    const qualitySignalRepo = new KyselyQualitySignalRepository(db);
    const triageCaseRepo = new KyselyTriageCaseRepository(db);
    const resolutionRepo = new KyselyResolutionRepository(db);
    const auditRepo = new KyselyAuditRepository(db);
    const idempotencyRepo = new KyselyIdempotencyRepository(db);

    const evaluationService =
      "evaluationService" in optsOrDb && optsOrDb.evaluationService
        ? optsOrDb.evaluationService
        : new EvaluationApplicationService(
            uow,
            evalRepo,
            qualitySignalRepo
          );
    const analyticsService =
      "analyticsService" in optsOrDb && optsOrDb.analyticsService
        ? optsOrDb.analyticsService
        : new QualityAnalyticsService(
            evalRepo,
            qualitySignalRepo,
            triageCaseRepo,
            resolutionRepo
          );
    const qualityPulseService =
      "qualityPulseService" in optsOrDb && optsOrDb.qualityPulseService
        ? optsOrDb.qualityPulseService
        : new QualityPulseService(
            evalRepo,
            qualitySignalRepo,
            triageCaseRepo,
            resolutionRepo,
            analyticsService
          );
    const ingestHandler =
      "ingestHandler" in optsOrDb && optsOrDb.ingestHandler
        ? optsOrDb.ingestHandler
        : new IngestOsmEvaluationHandler(uow, idempotencyRepo);
    const batchHandler =
      "batchHandler" in optsOrDb && optsOrDb.batchHandler
        ? optsOrDb.batchHandler
        : new IngestOsmBatchHandler(ingestHandler);

    const demoService =
      "demoService" in optsOrDb && optsOrDb.demoService
        ? optsOrDb.demoService
        : new DemoScenarioService(
            uow,
            evalRepo,
            rubricRepo,
            qualitySignalRepo,
            triageCaseRepo,
            resolutionRepo
          );

    const aiService =
      "aiService" in optsOrDb && optsOrDb.aiService
        ? optsOrDb.aiService
        : new AiService(
            new AiContextBuilder(
              evalRepo,
              rubricRepo,
              qualitySignalRepo,
              triageCaseRepo
            ),
            new DeterministicMockAiProvider()
          );

    // Health routes mounted at /api/v1/health
    await fastify.register(healthRoutes(db));

    // Evaluation routes mounted at /api/v1/evaluations
    await fastify.register(evaluationRoutes(evaluationService), {
      prefix: "/evaluations",
    });

    // Quality signals routes mounted at /api/v1/quality-signals (strictly read-only)
    await fastify.register(qualitySignalRoutes(qualitySignalRepo), {
      prefix: "/quality-signals",
    });

    // Triage case routes mounted at /api/v1/triage-cases (human moderation workflow)
    await fastify.register(triageCaseRoutes({ uow, triageCaseRepo }), {
      prefix: "/triage-cases",
    });

    // Audit event routes mounted at /api/v1/audit-events (strictly read-only inspection)
    await fastify.register(auditEventRoutes(auditRepo), {
      prefix: "/audit-events",
    });

    // Quality analytics & QualityPulse routes mounted at /api/v1/analytics
    await fastify.register(
      analyticsRoutes({ analyticsService, qualityPulseService, auditRepo }),
      {
        prefix: "/analytics",
      }
    );

    // OSM Integration routes mounted at /api/v1/integration/osm
    await fastify.register(integrationRoutes({ ingestHandler, batchHandler }), {
      prefix: "/integration/osm",
    });

    // AI Advisory routes mounted at /api/v1/ai
    await fastify.register(aiRoutes({ aiService, auditRepo }), {
      prefix: "/ai",
    });

    // Demo Scenario routes mounted at /api/v1/demo
    await fastify.register(demoRoutes({ demoService }), {
      prefix: "/demo",
    });
  };
};
