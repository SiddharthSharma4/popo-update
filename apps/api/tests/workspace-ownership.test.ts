/**
 * PHASE 3 — Workspace State & Ownership Verification Test Suite
 *
 * Verifies:
 * 1. Target A & F: Evaluation Ownership & 403 Root Cause Verification
 *    - Assigned examiner can assign marks and submit (200 OK).
 *    - Cross-examiner mutation is rejected (403 Forbidden).
 *    - Unauthorized roles (MODERATOR, ADMIN, AI) are rejected (403 Forbidden).
 * 2. Target D: Concurrency & Save/Submit Semantics
 *    - Optimistic concurrency conflict on stale version returns 409 Conflict.
 *    - Failed save preserves database state without partial writes.
 *    - Successful save updates version and persists score accurately.
 * 3. Application Command Layer Defense-in-Depth
 *    - AssignMarkHandler rejects non-examiner and mismatched evaluatorId.
 *    - SubmitEvaluationHandler rejects non-examiner and mismatched evaluatorId.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { createServer } from "../src/presentation/server.js";
import { createDatabase, type KyselyDb } from "../src/infrastructure/database/database.js";
import { runMigrations } from "../src/infrastructure/database/migrator.js";
import {
  KyselyRubricRepository,
  KyselyEvaluationRepository,
  KyselyAuditRepository,
} from "../src/infrastructure/repositories/index.js";
import { KyselyUnitOfWork } from "../src/infrastructure/persistence/index.js";
import {
  CreateEvaluationHandler,
  AssignMarkHandler,
  SubmitEvaluationHandler,
} from "../src/application/index.js";
import { Rubric } from "../src/domain/index.js";
import { UnauthorizedActionError } from "../src/application/common/errors.js";
import { UserRole, ActorType } from "@osm/shared";

describe("PHASE 3: Workspace State & Ownership Verification", () => {
  let db: KyselyDb;
  let server: FastifyInstance;
  let uow: KyselyUnitOfWork;

  const rubricId = "rubric_phase3_cs101";
  const rubricVersion = 1;

  const aliceExaminer = "evaluator_1"; // Dr. Sarah Jenkins
  const fosterExaminer = "evaluator_lenient"; // Dr. Adrian Foster
  const marcusModerator = "moderator_1"; // Prof. Marcus Vance
  const adminActor = "admin_1"; // Examination Controller

  const evalId = "eval-p3-test-001";
  const q1Id = "q_p3_1";
  const q2Id = "q_p3_2";

  beforeEach(async () => {
    db = createDatabase(":memory:");
    await runMigrations(db);
    uow = new KyselyUnitOfWork(db);

    // Seed Rubric
    const rubricRepo = new KyselyRubricRepository(db);
    const rubric = new Rubric({
      id: rubricId,
      title: "Computer Science 101 — Algorithms",
      version: rubricVersion,
      criteria: [
        { id: "crit_1", title: "Algorithms", maxMarks: 40, description: "Correctness" },
        { id: "crit_2", title: "Structure", maxMarks: 30, description: "Modularity" },
      ],
    });
    await rubricRepo.save(rubric);

    // Seed evaluation assigned to aliceExaminer (evaluator_1)
    const createHandler = new CreateEvaluationHandler(uow);
    await createHandler.execute({
      id: evalId,
      evaluationCycleId: "cycle-2026-demo",
      scriptId: "SCRIPT-P3-101",
      evaluatorId: aliceExaminer,
      rubricId,
      rubricVersion,
      questions: [
        { id: q1Id, questionNumber: "Q1", text: "Question 1", maxMarks: 40, orderIndex: 0 },
        { id: q2Id, questionNumber: "Q2", text: "Question 2", maxMarks: 30, orderIndex: 1 },
      ],
      actorId: aliceExaminer,
      userRole: UserRole.EXAMINER,
    });

    server = await createServer({
      config: {
        PORT: 0,
        HOST: "127.0.0.1",
        NODE_ENV: "test",
        LOG_LEVEL: "silent",
        CORS_ORIGIN: "*",
        DATABASE_URL: ":memory:",
      },
      db,
    });
    await server.ready();
  });

  afterEach(async () => {
    if (server) await server.close();
    if (db) await db.destroy();
  });

  async function getDbEvaluation(id: string) {
    return db.selectFrom("evaluations").selectAll().where("id", "=", id).executeTakeFirst();
  }

  async function getDbMarks(evaluationId: string) {
    return db.selectFrom("evaluation_marks").selectAll().where("evaluation_id", "=", evaluationId).execute();
  }

  // =========================================================================
  // 1. TARGET A & F: EVALUATION OWNERSHIP & 403 ROOT CAUSE
  // =========================================================================
  describe("Target A & F: Ownership & Authorization Boundary", () => {
    it("1.1 VALID CASE: Assigned evaluator (evaluator_1) can assign marks (200 OK)", async () => {
      const res = await server.inject({
        method: "PATCH",
        url: `/api/v1/evaluations/${evalId}`,
        headers: {
          "x-user-role": UserRole.EXAMINER,
          "x-actor-type": ActorType.USER,
          "x-actor-id": aliceExaminer,
        },
        payload: {
          marks: [
            { questionId: q1Id, awardedMarks: 35, comments: "Excellent binary tree logic" },
          ],
        },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.totalScore).toBe(35);
      expect(data.version).toBe(2);

      const dbEval = await getDbEvaluation(evalId);
      expect(dbEval?.total_score).toBe(35);
      expect(dbEval?.version).toBe(2);

      const marks = await getDbMarks(evalId);
      expect(marks.length).toBe(1);
      expect(marks[0].awarded_marks).toBe(35);
    });

    it("1.2 INVALID CASE (Cross-Evaluator): Different examiner (evaluator_lenient) cannot assign marks (403 Forbidden)", async () => {
      const beforeEval = await getDbEvaluation(evalId);

      const res = await server.inject({
        method: "PATCH",
        url: `/api/v1/evaluations/${evalId}`,
        headers: {
          "x-user-role": UserRole.EXAMINER,
          "x-actor-type": ActorType.USER,
          "x-actor-id": fosterExaminer,
        },
        payload: {
          marks: [
            { questionId: q1Id, awardedMarks: 40, comments: "Tampered mark by another examiner" },
          ],
        },
      });

      expect(res.statusCode).toBe(403);
      const body = res.json();
      expect(body.error).toBe("UnauthorizedActionError");
      expect(body.message).toContain("Only the assigned evaluator (evaluator_1) may assign marks");

      // Verify database strictly unchanged
      const afterEval = await getDbEvaluation(evalId);
      expect(afterEval?.version).toBe(beforeEval?.version);
      expect(afterEval?.total_score).toBe(beforeEval?.total_score);

      const marks = await getDbMarks(evalId);
      expect(marks.length).toBe(0);
    });

    it("1.3 INVALID CASE (Unauthorized Role): MODERATOR cannot assign marks (403 Forbidden)", async () => {
      const beforeEval = await getDbEvaluation(evalId);

      const res = await server.inject({
        method: "PATCH",
        url: `/api/v1/evaluations/${evalId}`,
        headers: {
          "x-user-role": UserRole.MODERATOR,
          "x-actor-type": ActorType.USER,
          "x-actor-id": marcusModerator,
        },
        payload: {
          marks: [
            { questionId: q1Id, awardedMarks: 30, comments: "Moderator attempting direct mark entry" },
          ],
        },
      });

      expect(res.statusCode).toBe(403);
      const body = res.json();
      expect(body.error).toBe("UnauthorizedActionError");
      expect(body.message).toContain("Role 'MODERATOR' is not authorized to assign evaluation marks");

      // Database strictly unchanged
      const afterEval = await getDbEvaluation(evalId);
      expect(afterEval?.version).toBe(beforeEval?.version);
      expect(afterEval?.total_score).toBe(beforeEval?.total_score);
    });

    it("1.4 INVALID CASE (Unauthorized Role): ADMIN cannot assign marks (403 Forbidden)", async () => {
      const beforeEval = await getDbEvaluation(evalId);

      const res = await server.inject({
        method: "PATCH",
        url: `/api/v1/evaluations/${evalId}`,
        headers: {
          "x-user-role": UserRole.ADMIN,
          "x-actor-type": ActorType.USER,
          "x-actor-id": adminActor,
        },
        payload: {
          marks: [
            { questionId: q1Id, awardedMarks: 20 },
          ],
        },
      });

      expect(res.statusCode).toBe(403);
      const body = res.json();
      expect(body.error).toBe("UnauthorizedActionError");
      expect(body.message).toContain("Role 'ADMIN' is not authorized to assign evaluation marks");

      const afterEval = await getDbEvaluation(evalId);
      expect(afterEval?.version).toBe(beforeEval?.version);
    });

    it("1.5 INVALID CASE: AI cannot assign marks (INV-003) (403 Forbidden)", async () => {
      const res = await server.inject({
        method: "PATCH",
        url: `/api/v1/evaluations/${evalId}`,
        headers: {
          "x-user-role": UserRole.EXAMINER,
          "x-actor-type": ActorType.AI,
          "x-actor-id": "ai-copilot",
        },
        payload: {
          marks: [{ questionId: q1Id, awardedMarks: 38 }],
        },
      });

      expect(res.statusCode).toBe(403);
      expect(res.json().error).toBe("UnauthorizedActionError");
    });

    it("1.6 VALID CASE: Assigned evaluator can submit evaluation once all questions scored (200 OK)", async () => {
      // First score all questions
      await server.inject({
        method: "PATCH",
        url: `/api/v1/evaluations/${evalId}`,
        headers: {
          "x-user-role": UserRole.EXAMINER,
          "x-actor-type": ActorType.USER,
          "x-actor-id": aliceExaminer,
        },
        payload: {
          marks: [
            { questionId: q1Id, awardedMarks: 35 },
            { questionId: q2Id, awardedMarks: 25 },
          ],
        },
      });

      const res = await server.inject({
        method: "POST",
        url: `/api/v1/evaluations/${evalId}/submit`,
        headers: {
          "x-user-role": UserRole.EXAMINER,
          "x-actor-type": ActorType.USER,
          "x-actor-id": aliceExaminer,
        },
        payload: {
          evaluatorId: aliceExaminer,
        },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.status).toBe("SUBMITTED");

      const dbEval = await getDbEvaluation(evalId);
      expect(dbEval?.status).toBe("SUBMITTED");
    });

    it("1.7 INVALID CASE (Cross-Evaluator Submit): Foster cannot submit Alice's evaluation (403 Forbidden)", async () => {
      const res = await server.inject({
        method: "POST",
        url: `/api/v1/evaluations/${evalId}/submit`,
        headers: {
          "x-user-role": UserRole.EXAMINER,
          "x-actor-type": ActorType.USER,
          "x-actor-id": fosterExaminer,
        },
        payload: {
          evaluatorId: fosterExaminer,
        },
      });

      expect(res.statusCode).toBe(403);
      expect(res.json().message).toContain("Only the assigned evaluator (evaluator_1) may submit");
    });

    it("1.8 INVALID CASE (Role Rejection): MODERATOR cannot submit evaluation (403 Forbidden)", async () => {
      const res = await server.inject({
        method: "POST",
        url: `/api/v1/evaluations/${evalId}/submit`,
        headers: {
          "x-user-role": UserRole.MODERATOR,
          "x-actor-type": ActorType.USER,
          "x-actor-id": marcusModerator,
        },
        payload: {
          evaluatorId: marcusModerator,
        },
      });

      expect(res.statusCode).toBe(403);
      expect(res.json().message).toContain("Role 'MODERATOR' is not authorized to submit evaluations");
    });

    it("1.9 INVALID CASE (Role Rejection): ADMIN cannot submit evaluation (403 Forbidden)", async () => {
      const res = await server.inject({
        method: "POST",
        url: `/api/v1/evaluations/${evalId}/submit`,
        headers: {
          "x-user-role": UserRole.ADMIN,
          "x-actor-type": ActorType.USER,
          "x-actor-id": adminActor,
        },
        payload: {
          evaluatorId: adminActor,
        },
      });

      expect(res.statusCode).toBe(403);
      expect(res.json().message).toContain("Role 'ADMIN' is not authorized to submit evaluations");
    });
  });

  // =========================================================================
  // 2. TARGET D: OPTIMISTIC CONCURRENCY PROTECTION
  // =========================================================================
  describe("Target D: Optimistic Concurrency & Persistence Semantics", () => {
    it("2.1 Stale expectedVersion in request payload returns 409 Conflict without database mutation", async () => {
      // First mutation bumps version to 2
      await server.inject({
        method: "PATCH",
        url: `/api/v1/evaluations/${evalId}`,
        headers: {
          "x-user-role": UserRole.EXAMINER,
          "x-actor-type": ActorType.USER,
          "x-actor-id": aliceExaminer,
        },
        payload: {
          marks: [{ questionId: q1Id, awardedMarks: 30 }],
        },
      });

      const midEval = await getDbEvaluation(evalId);
      expect(midEval?.version).toBe(2);

      // Attempt second mutation with stale expectedVersion: 1
      const resConflict = await server.inject({
        method: "PATCH",
        url: `/api/v1/evaluations/${evalId}`,
        headers: {
          "x-user-role": UserRole.EXAMINER,
          "x-actor-type": ActorType.USER,
          "x-actor-id": aliceExaminer,
        },
        payload: {
          expectedVersion: 1, // Stale!
          marks: [{ questionId: q1Id, awardedMarks: 38 }],
        },
      });

      expect(resConflict.statusCode).toBe(409);
      expect(resConflict.json().error).toBe("ConcurrencyConflictError");

      // Verify marks and version were NOT modified by the conflicted request
      const afterEval = await getDbEvaluation(evalId);
      expect(afterEval?.version).toBe(2);
      expect(afterEval?.total_score).toBe(30);
    });

    it("2.2 Stale If-Match header returns 409 Conflict", async () => {
      const resConflict = await server.inject({
        method: "PATCH",
        url: `/api/v1/evaluations/${evalId}`,
        headers: {
          "x-user-role": UserRole.EXAMINER,
          "x-actor-type": ActorType.USER,
          "x-actor-id": aliceExaminer,
          "if-match": '"99"', // Non-matching version
        },
        payload: {
          marks: [{ questionId: q1Id, awardedMarks: 25 }],
        },
      });

      expect(resConflict.statusCode).toBe(409);
    });
  });

  // =========================================================================
  // 3. APPLICATION COMMAND LAYER DEFENSE-IN-DEPTH
  // =========================================================================
  describe("Command Handler Direct Unit Authorization", () => {
    it("3.1 AssignMarkHandler rejects non-examiner role directly", async () => {
      const handler = new AssignMarkHandler(uow);
      await expect(
        handler.execute({
          evaluationId: evalId,
          questionId: q1Id,
          awardedMarks: 25,
          evaluatorId: aliceExaminer,
          userRole: "MODERATOR",
          actorType: "USER",
        })
      ).rejects.toThrow(UnauthorizedActionError);
    });

    it("3.2 AssignMarkHandler rejects cross-evaluator mismatch directly", async () => {
      const handler = new AssignMarkHandler(uow);
      await expect(
        handler.execute({
          evaluationId: evalId,
          questionId: q1Id,
          awardedMarks: 25,
          evaluatorId: fosterExaminer,
          userRole: "EXAMINER",
          actorType: "USER",
        })
      ).rejects.toThrow(UnauthorizedActionError);
    });

    it("3.3 SubmitEvaluationHandler rejects non-examiner role directly", async () => {
      const handler = new SubmitEvaluationHandler(uow);
      await expect(
        handler.execute({
          evaluationId: evalId,
          evaluatorId: aliceExaminer,
          userRole: "ADMIN",
          actorType: "USER",
        })
      ).rejects.toThrow(UnauthorizedActionError);
    });

    it("3.4 SubmitEvaluationHandler rejects cross-evaluator mismatch directly", async () => {
      const handler = new SubmitEvaluationHandler(uow);
      await expect(
        handler.execute({
          evaluationId: evalId,
          evaluatorId: fosterExaminer,
          userRole: "EXAMINER",
          actorType: "USER",
        })
      ).rejects.toThrow(UnauthorizedActionError);
    });
  });
});
