/**
 * Dedicated Test Suite for Demo Reset & Recovery (TASK-P11-DEMO-002).
 * Conforms to:
 * - docs/contracts/10-demo-contract.md §11, §37-41, §72
 * - docs/contracts/05-domain-contract.md §10, §38 (INV-003: AI Non-Authority)
 * - docs/contracts/06-api-contract.md §12 (Server-side RBAC)
 * - docs/contracts/08-data-contract.md §28-31 (Transactional Safety & Child-to-Parent Deletion)
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { createServer } from "../src/presentation/server.js";
import { createDatabase, type KyselyDb } from "../src/infrastructure/database/database.js";
import { runMigrations } from "../src/infrastructure/database/migrator.js";
import {
  UserRole,
  ActorType,
  DemoResetResponseSchema,
  DemoSeedResponseSchema,
} from "@osm/shared";

describe("TASK-P11-DEMO-002: Demo Reset & Recovery", () => {
  let app: FastifyInstance;
  let db: KyselyDb;

  const adminHeaders = {
    "x-user-role": UserRole.ADMIN,
    "x-user-id": "admin_master",
    "x-actor-type": ActorType.USER,
  };

  const moderatorHeaders = {
    "x-user-role": UserRole.MODERATOR,
    "x-user-id": "moderator_1",
    "x-actor-type": ActorType.USER,
  };

  const examinerHeaders = {
    "x-user-role": UserRole.EXAMINER,
    "x-user-id": "evaluator_1",
    "x-evaluator-id": "evaluator_1",
    "x-actor-id": "evaluator_1",
    "x-actor-type": ActorType.USER,
  };

  const aiActorHeaders = {
    "x-user-role": UserRole.ADMIN,
    "x-user-id": "ai-assistant-01",
    "x-actor-id": "ai-assistant-01",
    "x-actor-type": ActorType.AI,
  };

  beforeAll(async () => {
    // In-memory SQLite for deterministic, isolated execution
    db = createDatabase(":memory:");
    await runMigrations(db);

    app = await createServer({
      config: {
        NODE_ENV: "test",
        PORT: 4016,
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

  // =========================================================================
  // 1. Authorization & Role Security
  // =========================================================================
  describe("1. Server-Side RBAC & AI Non-Authority", () => {
    it("rejects EXAMINER role with 403 Forbidden", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/demo/reset",
        headers: examinerHeaders,
      });
      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.body);
      expect(body.message).toContain("Only administrators");
    });

    it("rejects MODERATOR role with 403 Forbidden", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/demo/reset",
        headers: moderatorHeaders,
      });
      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.body);
      expect(body.message).toContain("Only administrators");
    });

    it("rejects Anonymous / missing headers with 403 Forbidden", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/demo/reset",
        headers: {},
      });
      expect(res.statusCode).toBe(403);
    });

    it("rejects AI actor even if role header claims admin (INV-003)", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/demo/reset",
        headers: aiActorHeaders,
      });
      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.body);
      expect(body.message).toContain("AI actors are strictly forbidden");
    });
  });

  // =========================================================================
  // 2. Case C: Reset Before Seed
  // =========================================================================
  describe("2. Case C — Reset Before Seed", () => {
    it("returns ALREADY_RESET safely when database has no canonical demo records", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/demo/reset",
        headers: adminHeaders,
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      const parsed = DemoResetResponseSchema.safeParse(body);
      expect(parsed.success).toBe(true);
      expect(body.status).toBe("ALREADY_RESET");
      expect(body.cycleId).toBe("cycle-2026-demo");
      expect(body.rubricId).toBe("RUBRIC-CS-101");
      expect(body.evaluationsRemoved).toBe(0);
      expect(body.signalsRemoved).toBe(0);
      expect(body.triageCasesRemoved).toBe(0);
      expect(body.resolutionsRemoved).toBe(0);
    });
  });

  // =========================================================================
  // 3. Authorized Reset After Successful Seed
  // =========================================================================
  describe("3. Case A — Authorized Reset After Seed", () => {
    it("successfully seeds then completely removes canonical demo scenario", async () => {
      // 1. Seed demo scenario
      const seedRes = await app.inject({
        method: "POST",
        url: "/api/v1/demo/seed",
        headers: adminHeaders,
      });
      expect(seedRes.statusCode).toBe(201);
      const seedBody = JSON.parse(seedRes.body);
      expect(seedBody.status).toBe("SEEDED");
      expect(seedBody.evaluationsCount).toBe(12);

      // Verify canonical records exist in database
      const rubricBefore = await db
        .selectFrom("rubrics")
        .selectAll()
        .where("id", "=", "RUBRIC-CS-101")
        .executeTakeFirst();
      expect(rubricBefore).toBeDefined();

      const evalBefore = await db
        .selectFrom("evaluations")
        .selectAll()
        .where("id", "=", "eval-demo-incomplete")
        .executeTakeFirst();
      expect(evalBefore).toBeDefined();

      const triageBefore = await db
        .selectFrom("triage_cases")
        .selectAll()
        .where("id", "=", "tc-demo-001")
        .executeTakeFirst();
      expect(triageBefore).toBeDefined();

      const resBefore = await db
        .selectFrom("resolutions")
        .selectAll()
        .where("id", "=", "res-demo-000")
        .executeTakeFirst();
      expect(resBefore).toBeDefined();

      // 2. Execute Demo Reset
      const resetRes = await app.inject({
        method: "POST",
        url: "/api/v1/demo/reset",
        headers: adminHeaders,
      });

      expect(resetRes.statusCode).toBe(200);
      const resetBody = JSON.parse(resetRes.body);
      const parsed = DemoResetResponseSchema.safeParse(resetBody);
      expect(parsed.success).toBe(true);
      expect(resetBody.status).toBe("RESET");
      expect(resetBody.cycleId).toBe("cycle-2026-demo");
      expect(resetBody.rubricId).toBe("RUBRIC-CS-101");
      expect(resetBody.evaluationsRemoved).toBe(12);
      expect(resetBody.signalsRemoved).toBe(2);
      expect(resetBody.triageCasesRemoved).toBe(2);
      expect(resetBody.resolutionsRemoved).toBe(1);

      // 3. Verify canonical records are completely removed from SQLite
      const rubricAfter = await db
        .selectFrom("rubrics")
        .selectAll()
        .where("id", "=", "RUBRIC-CS-101")
        .executeTakeFirst();
      expect(rubricAfter).toBeUndefined();

      const evalAfter = await db
        .selectFrom("evaluations")
        .selectAll()
        .where("evaluation_cycle_id", "=", "cycle-2026-demo")
        .execute();
      expect(evalAfter.length).toBe(0);

      const triageAfter = await db
        .selectFrom("triage_cases")
        .selectAll()
        .where("evaluation_cycle_id", "=", "cycle-2026-demo")
        .execute();
      expect(triageAfter.length).toBe(0);

      const resAfter = await db
        .selectFrom("resolutions")
        .selectAll()
        .where("id", "=", "res-demo-000")
        .executeTakeFirst();
      expect(resAfter).toBeUndefined();

      const marksAfter = await db
        .selectFrom("evaluation_marks")
        .selectAll()
        .where("evaluation_id", "=", "eval-demo-incomplete")
        .execute();
      expect(marksAfter.length).toBe(0);
    });
  });

  // =========================================================================
  // 4. Case B: Repeated Reset (Idempotency)
  // =========================================================================
  describe("4. Case B — Repeated Reset Idempotency", () => {
    it("returns ALREADY_RESET without error when executed consecutively", async () => {
      const resetRes2 = await app.inject({
        method: "POST",
        url: "/api/v1/demo/reset",
        headers: adminHeaders,
      });

      expect(resetRes2.statusCode).toBe(200);
      const body = JSON.parse(resetRes2.body);
      expect(body.status).toBe("ALREADY_RESET");
      expect(body.evaluationsRemoved).toBe(0);
      expect(body.signalsRemoved).toBe(0);
      expect(body.triageCasesRemoved).toBe(0);
      expect(body.resolutionsRemoved).toBe(0);
    });
  });

  // =========================================================================
  // 5. Case D: Seed -> Reset -> Seed (Lifecycle Recovery)
  // =========================================================================
  describe("5. Case D — Full SEED -> RESET -> SEED Lifecycle", () => {
    it("re-seeds cleanly without duplicate key conflicts or corrupt state", async () => {
      // 1. Re-seed after previous reset
      const reSeedRes = await app.inject({
        method: "POST",
        url: "/api/v1/demo/seed",
        headers: adminHeaders,
      });

      expect(reSeedRes.statusCode).toBe(201);
      const reSeedBody = JSON.parse(reSeedRes.body);
      expect(reSeedBody.status).toBe("SEEDED");
      expect(reSeedBody.evaluationsCount).toBe(12);

      // Verify records are back
      const evalRow = await db
        .selectFrom("evaluations")
        .selectAll()
        .where("id", "=", "eval-demo-incomplete")
        .executeTakeFirst();
      expect(evalRow).toBeDefined();

      // 2. Reset again
      const resetRes = await app.inject({
        method: "POST",
        url: "/api/v1/demo/reset",
        headers: adminHeaders,
      });
      expect(resetRes.statusCode).toBe(200);
      expect(JSON.parse(resetRes.body).status).toBe("RESET");

      // 3. Seed a 3rd time to guarantee 100% repeatable deterministic lifecycle
      const reSeed3 = await app.inject({
        method: "POST",
        url: "/api/v1/demo/seed",
        headers: adminHeaders,
      });
      expect(reSeed3.statusCode).toBe(201);
      expect(JSON.parse(reSeed3.body).status).toBe("SEEDED");
    });
  });

  // =========================================================================
  // 6. Non-Demo Data Protection (Scope Isolation)
  // =========================================================================
  describe("6. Non-Demo Data Isolation & Protection", () => {
    it("preserves non-demo evaluations, rubrics, and triage cases during reset", async () => {
      // Insert non-demo rubric
      await db
        .insertInto("rubrics")
        .values({
          id: "RUBRIC-MATH-PRODUCTION",
          version: 1,
          title: "Production Mathematics Exam 2026",
          criteria: JSON.stringify([
            { id: "crit-m1", title: "Calculus", maxMarks: 50, description: "Derivatives and Integrals" },
          ]),
          total_max_marks: 50,
          created_at: new Date().toISOString(),
        })
        .execute();

      // Insert non-demo evaluation
      await db
        .insertInto("evaluations")
        .values({
          id: "eval-prod-live-999",
          evaluation_cycle_id: "cycle-production-live",
          script_id: "SCRIPT-PROD-999",
          evaluator_id: "evaluator_senior",
          rubric_id: "RUBRIC-MATH-PRODUCTION",
          rubric_version: 1,
          status: "IN_PROGRESS",
          total_score: 35,
          max_possible_score: 50,
          is_complete: 0,
          version: 1,
          submitted_at: null,
          finalized_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .execute();

      // Execute Reset
      const resetRes = await app.inject({
        method: "POST",
        url: "/api/v1/demo/reset",
        headers: adminHeaders,
      });
      expect(resetRes.statusCode).toBe(200);
      expect(JSON.parse(resetRes.body).status).toBe("RESET");

      // Assert non-demo rubric is 100% INTACT
      const nonDemoRubric = await db
        .selectFrom("rubrics")
        .selectAll()
        .where("id", "=", "RUBRIC-MATH-PRODUCTION")
        .executeTakeFirst();
      expect(nonDemoRubric).toBeDefined();
      expect(nonDemoRubric?.title).toBe("Production Mathematics Exam 2026");

      // Assert non-demo evaluation is 100% INTACT
      const nonDemoEval = await db
        .selectFrom("evaluations")
        .selectAll()
        .where("id", "=", "eval-prod-live-999")
        .executeTakeFirst();
      expect(nonDemoEval).toBeDefined();
      expect(nonDemoEval?.evaluation_cycle_id).toBe("cycle-production-live");

      // Clean up the non-demo test fixture
      await db.deleteFrom("evaluations").where("id", "=", "eval-prod-live-999").execute();
      await db.deleteFrom("rubrics").where("id", "=", "RUBRIC-MATH-PRODUCTION").execute();
    });
  });

  // =========================================================================
  // 7. Audit Trail Preservation & Immutability
  // =========================================================================
  describe("7. Audit Trail Immutability & Event Attribution", () => {
    it("does not wipe audit events, and appends RESET_DEMO_SCENARIO event with attribution", async () => {
      // Check audit events table
      const auditRows = await db
        .selectFrom("audit_events")
        .selectAll()
        .where("action", "=", "RESET_DEMO_SCENARIO")
        .execute();

      expect(auditRows.length).toBeGreaterThan(0);
      const latestResetAudit = auditRows[auditRows.length - 1];
      expect(latestResetAudit.event_type).toBe("DemoCohortReset");
      expect(latestResetAudit.actor_id).toBe("admin_master");
      expect(latestResetAudit.entity_id).toBe("cycle-2026-demo");

      const details = JSON.parse(latestResetAudit.details);
      expect(details.rubricId).toBe("RUBRIC-CS-101");
      expect(details).toHaveProperty("evaluationsRemoved");
      expect(details).toHaveProperty("signalsRemoved");
      expect(details).toHaveProperty("triageCasesRemoved");
      expect(details).toHaveProperty("resolutionsRemoved");
    });
  });

  // =========================================================================
  // 8. Transactional Failure & Rollback Invariant
  // =========================================================================
  describe("8. Transactional Failure & Rollback Invariant", () => {
    it("rolls back all deletions atomically if an error occurs midway through reset", async () => {
      // 1. Ensure scenario is seeded
      await app.inject({
        method: "POST",
        url: "/api/v1/demo/seed",
        headers: adminHeaders,
      });

      // Confirm canonical records exist before attempting failed reset
      const evalBefore = await db
        .selectFrom("evaluations")
        .selectAll()
        .where("id", "=", "eval-demo-incomplete")
        .executeTakeFirst();
      expect(evalBefore).toBeDefined();

      const rubricBefore = await db
        .selectFrom("rubrics")
        .selectAll()
        .where("id", "=", "RUBRIC-CS-101")
        .executeTakeFirst();
      expect(rubricBefore).toBeDefined();

      // 2. Perform a simulated mid-transaction failure inside UnitOfWork
      const { KyselyUnitOfWork } = await import(
        "../src/infrastructure/persistence/kysely-unit-of-work.js"
      );
      const uow = new KyselyUnitOfWork(db);

      await expect(
        uow.execute(async (scope) => {
          // Delete resolution, triage case, and signal
          await scope.resolutions.delete("res-demo-000");
          await scope.triageCases.delete("tc-demo-001");
          await scope.qualitySignals.delete("sig-demo-lenient-001");

          // Throw simulated failure midway through operation
          throw new Error("Simulated disk I/O error midway through reset transaction");
        })
      ).rejects.toThrow("Simulated disk I/O error midway through reset transaction");

      // 3. Verify complete rollback: resolution, triage case, and signal STILL EXIST in SQLite
      const resAfterRollback = await db
        .selectFrom("resolutions")
        .selectAll()
        .where("id", "=", "res-demo-000")
        .executeTakeFirst();
      expect(resAfterRollback).toBeDefined();

      const caseAfterRollback = await db
        .selectFrom("triage_cases")
        .selectAll()
        .where("id", "=", "tc-demo-001")
        .executeTakeFirst();
      expect(caseAfterRollback).toBeDefined();

      const signalAfterRollback = await db
        .selectFrom("quality_signals")
        .selectAll()
        .where("id", "=", "sig-demo-lenient-001")
        .executeTakeFirst();
      expect(signalAfterRollback).toBeDefined();

      // 4. Clean up with regular reset
      const cleanReset = await app.inject({
        method: "POST",
        url: "/api/v1/demo/reset",
        headers: adminHeaders,
      });
      expect(cleanReset.statusCode).toBe(200);
    });
  });
});
