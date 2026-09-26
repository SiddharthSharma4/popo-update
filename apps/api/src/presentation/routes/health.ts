/**
 * Health check endpoint verifying service status and database connectivity.
 * Conforms to docs/contracts/06-api-contract.md.
 */

import type { FastifyPluginAsync } from "fastify";
import { sql } from "kysely";
import type { HealthResponse } from "@osm/shared";
import type { KyselyDb } from "../../infrastructure/database/database.js";

const startTime = Date.now();

export const healthRoutes = (db: KyselyDb): FastifyPluginAsync => {
  return async (fastify) => {
    fastify.get("/health", async (_request, reply) => {
      let dbStatus: "connected" | "disconnected" = "disconnected";

      try {
        await sql`SELECT 1`.execute(db);
        dbStatus = "connected";
      } catch {
        dbStatus = "disconnected";
      }

      const response: HealthResponse = {
        status: "ok",
        version: "0.1.0",
        environment: process.env.NODE_ENV ?? "development",
        timestamp: new Date().toISOString(),
        database: dbStatus,
        uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
      };

      return reply.code(dbStatus === "connected" ? 200 : 503).send(response);
    });
  };
};
