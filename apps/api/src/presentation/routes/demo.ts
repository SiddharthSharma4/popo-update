/**
 * Presentation routes for Demonstration Scenarios.
 * Conforms to:
 * - docs/contracts/10-demo-contract.md §11, §37-41, §72
 * - docs/contracts/06-api-contract.md §12 (Authorization & Role Boundaries)
 */

import type { FastifyPluginAsync } from "fastify";
import { UserRole, ActorType } from "@osm/shared";
import type { DemoScenarioService } from "../../application/demo/demo-scenario.service.js";
import { UnauthorizedActionError } from "../../application/common/errors.js";

export interface DemoRouteOptions {
  demoService: DemoScenarioService;
}

export const demoRoutes = (options: DemoRouteOptions): FastifyPluginAsync => {
  return async (fastify) => {
    const { demoService } = options;

    /**
     * POST /api/v1/demo/seed
     * Seeds the canonical demo scenario cohort into the database.
     * Restricted strictly to administrators (10-demo §10).
     */
    fastify.post("/seed", async (request, reply) => {
      const actorType = (
        (request.headers["x-actor-type"] as string) || ActorType.USER
      ).toUpperCase();
      const userRole = (
        (request.headers["x-user-role"] as string) || UserRole.EXAMINER
      ).toUpperCase();
      const actorId =
        (request.headers["x-actor-id"] as string) ||
        (request.headers["x-user-id"] as string) ||
        "admin_demo";

      // AI cannot execute administrative actions (INV-003)
      if (actorType === ActorType.AI || userRole === "AI") {
        throw new UnauthorizedActionError(
          "SEED_DEMO",
          "AI actors are strictly forbidden from seeding demonstration cohorts."
        );
      }

      // Role check: Only ADMIN can seed demo scenarios
      if (userRole !== UserRole.ADMIN) {
        throw new UnauthorizedActionError(
          "SEED_DEMO",
          `Only administrators may trigger demonstration seeding. Active role: ${userRole}.`
        );
      }

      const result = await demoService.seedCanonicalScenario({
        actorId,
        actorType,
        userRole,
      });

      const statusCode = result.status === "SEEDED" ? 201 : 200;
      return reply.code(statusCode).send(result);
    });

    /**
     * POST /api/v1/demo/reset
     * Safely resets the canonical demo scenario cohort from the database.
     * Restricted strictly to administrators (10-demo §10, 06-api §12).
     */
    fastify.post("/reset", async (request, reply) => {
      const actorType = (
        (request.headers["x-actor-type"] as string) || ActorType.USER
      ).toUpperCase();
      const userRole = (
        (request.headers["x-user-role"] as string) || UserRole.EXAMINER
      ).toUpperCase();
      const actorId =
        (request.headers["x-actor-id"] as string) ||
        (request.headers["x-user-id"] as string) ||
        "admin_demo";

      // AI cannot execute administrative actions (INV-003)
      if (actorType === ActorType.AI || userRole === "AI") {
        throw new UnauthorizedActionError(
          "RESET_DEMO",
          "AI actors are strictly forbidden from resetting demonstration cohorts."
        );
      }

      // Role check: Only ADMIN can reset demo scenarios
      if (userRole !== UserRole.ADMIN) {
        throw new UnauthorizedActionError(
          "RESET_DEMO",
          `Only administrators may trigger demonstration reset. Active role: ${userRole}.`
        );
      }

      const result = await demoService.resetCanonicalScenario({
        actorId,
        actorType,
        userRole,
      });

      return reply.code(200).send(result);
    });
  };
};
