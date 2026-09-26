/**
 * API Contract verification test for /api/v1/health.
 * Conforms to docs/contracts/09-testing-contract.md §13 and docs/contracts/06-api-contract.md.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { createServer } from "../src/presentation/server.js";
import { createDatabase, type KyselyDb } from "../src/infrastructure/database/database.js";
import { runMigrations } from "../src/infrastructure/database/migrator.js";
import { HealthResponseSchema } from "@osm/shared";

describe("API Foundation — Health Check", () => {
  let app: FastifyInstance;
  let db: KyselyDb;

  beforeAll(async () => {
    // In-memory SQLite for deterministic, isolated testing
    db = createDatabase(":memory:");
    await runMigrations(db);

    app = await createServer({
      config: {
        NODE_ENV: "test",
        PORT: 4001,
        HOST: "127.0.0.1",
        DATABASE_URL: ":memory:",
        CORS_ORIGIN: "*",
        AI_PROVIDER: "mock",
        AI_API_KEY: "",
      },
      db,
    });

    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await db.destroy();
  });

  it("GET /api/v1/health returns 200 with valid schema and connected database", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/health",
    });

    expect(response.statusCode).toBe(200);

    const payload = JSON.parse(response.payload);
    const parsed = HealthResponseSchema.safeParse(payload);

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.status).toBe("ok");
      expect(parsed.data.database).toBe("connected");
      expect(parsed.data.environment).toBe("test");
      expect(parsed.data.uptimeSeconds).toBeGreaterThanOrEqual(0);
      expect(new Date(parsed.data.timestamp).toISOString()).toBe(parsed.data.timestamp);
    }
  });
});
