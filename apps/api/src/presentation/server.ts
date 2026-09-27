/**
 * Fastify application factory and presentation configuration.
 * Conforms to docs/contracts/02-architecture-contract.md §7 and docs/contracts/06-api-contract.md.
 */

import Fastify, { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import type { AppConfig } from "../config/index.js";
import type { KyselyDb } from "../infrastructure/database/database.js";
import type { EvaluationApplicationService } from "../application/services/evaluation.service.js";
import type {
  QualityAnalyticsService,
  QualityPulseService,
} from "../application/analytics/index.js";
import type {
  IngestOsmEvaluationHandler,
  IngestOsmBatchHandler,
} from "../application/commands/ingest-osm-evaluation.command.js";
import type { DemoScenarioService } from "../application/demo/demo-scenario.service.js";
import type { AiService } from "../application/ai/ai-service.js";
import { apiV1Routes } from "./routes/index.js";
import { logger } from "../infrastructure/logging/logger.js";
import { mapErrorToHttpResponse } from "./errors/error-mapper.js";

export interface ServerOptions {
  config: AppConfig;
  db: KyselyDb;
  evaluationService?: EvaluationApplicationService;
  analyticsService?: QualityAnalyticsService;
  qualityPulseService?: QualityPulseService;
  ingestHandler?: IngestOsmEvaluationHandler;
  batchHandler?: IngestOsmBatchHandler;
  demoService?: DemoScenarioService;
  aiService?: AiService;
}

export async function createServer(options: ServerOptions): Promise<FastifyInstance> {
  const {
    config,
    db,
    evaluationService,
    analyticsService,
    qualityPulseService,
    ingestHandler,
    batchHandler,
    demoService,
    aiService,
  } = options;

  const app = Fastify({
    logger: false, // We use our structured domain-aware logger
  });

  // Register CORS
  await app.register(cors, {
    origin: config.CORS_ORIGIN,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  });

  // Global Error Handler conforming to API contract (avoid leaking stack traces)
  app.setErrorHandler((error, _request, reply) => {
    const mapped = mapErrorToHttpResponse(error, config.NODE_ENV === "production");

    if (mapped.statusCode >= 500) {
      logger.error("HTTP internal server error", error as Error, { statusCode: mapped.statusCode });
    } else {
      logger.warn("HTTP client/domain error", {
        statusCode: mapped.statusCode,
        error: mapped.payload.error,
        code: mapped.payload.code,
        message: mapped.payload.message,
      });
    }

    return reply.code(mapped.statusCode).send(mapped.payload);
  });

  // Register Canonical /api/v1 routes
  await app.register(
    apiV1Routes({
      db,
      evaluationService,
      analyticsService,
      qualityPulseService,
      ingestHandler,
      batchHandler,
      demoService,
      aiService,
    }),
    { prefix: "/api/v1" }
  );

  return app;
}
