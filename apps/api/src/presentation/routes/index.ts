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
import { healthRoutes } from "./health.js";
import { evaluationRoutes } from "./evaluations.js";
import { qualitySignalRoutes } from "./quality-signals.js";
import { triageCaseRoutes } from "./triage-cases.js";

export interface ApiV1Options {
  db: KyselyDb;
  evaluationService?: EvaluationApplicationService;
}

export const apiV1Routes = (optsOrDb: ApiV1Options | KyselyDb): FastifyPluginAsync => {
  return async (fastify) => {
    const db = "db" in optsOrDb ? optsOrDb.db : optsOrDb;
    const uow = new KyselyUnitOfWork(db);
    const qualitySignalRepo = new KyselyQualitySignalRepository(db);
    const triageCaseRepo = new KyselyTriageCaseRepository(db);
    const evaluationService =
      "evaluationService" in optsOrDb && optsOrDb.evaluationService
        ? optsOrDb.evaluationService
        : new EvaluationApplicationService(
            uow,
            new KyselyEvaluationRepository(db),
            qualitySignalRepo
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
  };
};
