/**
 * TASK-P10-HARDEN-001 — Security, Authorization, and Validation Hardening Test Suite.
 *
 * Systematically tests and verifies:
 * 1. Authentication / authorization boundaries across all protected routes.
 * 2. Role enforcement on every protected endpoint (MODERATOR, ADMIN, EXAMINER).
 * 3. AI actor restrictions and non-authority invariants (INV-003, INV-004).
 * 4. Input schema validation (Zod) at all API boundaries.
 * 5. Invalid enum and invalid value handling.
 * 6. Missing, malformed, and unexpected request fields.
 * 7. Identifier validation (whitespace-only, empty, trimmed path/param checks).
 * 8. Resource ownership / access checks (examiners restricted to their assigned evaluations).
 * 9. Protection against privilege escalation or authorization bypass (AI + ADMIN spoofing, SYSTEM on human actions).
 * 10. Defense-in-depth: consistency between presentation routes and application command handlers.
 * 11. Validation of consequential commands.
 * 12. Integration endpoint authorization hardening.
 * 13. Production error mapping and prevention of internal information leakage.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { createServer } from "../src/presentation/server.js";
import { createDatabase, type KyselyDb } from "../src/infrastructure/database/database.js";
import { runMigrations } from "../src/infrastructure/database/migrator.js";
import { KyselyRubricRepository } from "../src/infrastructure/repositories/kysely-rubric-repository.js";
import { Rubric } from "../src/domain/rubric/rubric.js";
import { Evaluation } from "../src/domain/evaluation/evaluation.js";
import { QualitySignal } from "../src/domain/quality-signal/quality-signal.js";
import { TriageCase } from "../src/domain/moderation/triage-case.js";
import { KyselyUnitOfWork } from "../src/infrastructure/persistence/index.js";
import {
  CreateEvaluationHandler,
  AssignMarkHandler,
  SubmitEvaluationHandler,
  CreateTriageCaseHandler,
  AssignTriageCaseHandler,
  ResolveTriageCaseHandler,
} from "../src/application/index.js";
import {
  UnauthorizedActionError,
  InvalidCommandError,
  EntityNotFoundError,
} from "../src/application/common/errors.js";
import { mapErrorToHttpResponse } from "../src/presentation/errors/error-mapper.js";
import {
  ResolutionOutcome,
  SignalSeverity,
  UserRole,
  ActorType,
} from "@osm/shared";

describe("TASK-P10-HARDEN-001 — Security, Authorization & Validation Hardening", () => {
  let app: FastifyInstance;
  let db: KyselyDb;
  let uow: KyselyUnitOfWork;

  const validRubricId = "rubric_harden_101";
  const validRubricVersion = 1;
  const evalAssignedExaminer1 = "eval_harden_examiner_1";
  const evalAssignedExaminer2 = "eval_harden_examiner_2";
  const examiner1Id = "examiner_smith_01";
  const examiner2Id = "examiner_jones_02";
  const moderatorId = "moderator_clark_01";

  let testSignalId: string;
  let testTriageCaseId: string;

  beforeAll(async () => {
    db = createDatabase(":memory:");
    await runMigrations(db);
    uow = new KyselyUnitOfWork(db);

    // 1. Seed valid Rubric
    const rubricRepo = new KyselyRubricRepository(db);
    const rubric = new Rubric({
      id: validRubricId,
      version: validRubricVersion,
      title: "Hardening Assessment Rubric",
      criteria: [
        {
          id: "crit_harden_1",
          title: "Technical Accuracy",
          description: "Technical precision and depth",
          maxMarks: 10,
        },
      ],
    });
    await rubricRepo.save(rubric);

    // 2. Seed evaluations for two different examiners
    await uow.execute(async (scope) => {
      const eval1 = Evaluation.create({
        id: evalAssignedExaminer1,
        evaluationCycleId: "cycle_term_1",
        scriptId: "script_student_101",
        evaluatorId: examiner1Id,
        rubricId: validRubricId,
        rubricVersion: validRubricVersion,
        questions: [
          {
            id: "q_harden_1",
            questionNumber: "1",
            text: "Explain encryption algorithms.",
            maxMarks: 10,
            orderIndex: 0,
          },
        ],
      });
      await scope.evaluations.save(eval1);

      const eval2 = Evaluation.create({
        id: evalAssignedExaminer2,
        evaluationCycleId: "cycle_term_1",
        scriptId: "script_student_102",
        evaluatorId: examiner2Id,
        rubricId: validRubricId,
        rubricVersion: validRubricVersion,
        questions: [
          {
            id: "q_harden_2",
            questionNumber: "1",
            text: "Explain digital signatures.",
            maxMarks: 10,
            orderIndex: 0,
          },
        ],
      });
      await scope.evaluations.save(eval2);

      // Seed QualitySignal
      const signal = QualitySignal.create({
        evaluationId: evalAssignedExaminer1,
        evaluationVersion: 1,
        signalType: "UNCHECKED_ANSWER",
        severity: SignalSeverity.HIGH,
        summary: "Detected unchecked question",
        evidence: { missingQuestionIds: ["q_harden_1"] },
        detector: { type: "DETERMINISTIC", name: "test-detector", version: "1.0.0" },
      });
      await scope.qualitySignals.save(signal);
      testSignalId = signal.id;

      // Seed TriageCase linked to signal
      const triageCase = TriageCase.create({
        evaluationId: evalAssignedExaminer1,
        evaluationCycleId: "cycle_term_1",
        qualitySignalId: signal.id,
        priority: SignalSeverity.HIGH,
      });
      await scope.triageCases.save(triageCase);
      testTriageCaseId = triageCase.id;
    });

    app = await createServer({
      config: {
        NODE_ENV: "test",
        PORT: 4005,
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
  // 1. AI Actor Restrictions & Non-Authority Invariants (INV-003, INV-004)
  // =========================================================================
  describe("1. AI Actor Non-Authority Invariants (INV-003, INV-004)", () => {
    it("POST /api/v1/evaluations rejects AI actor with 403 Forbidden", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/evaluations",
        headers: { "x-actor-type": "AI" },
        payload: {
          id: "eval_ai_forbidden",
          evaluationCycleId: "cycle_1",
          scriptId: "script_1",
          evaluatorId: "ai_bot",
          rubricId: validRubricId,
          rubricVersion: validRubricVersion,
          questions: [{ questionNumber: "1", text: "Q1", maxMarks: 10, orderIndex: 0 }],
        },
      });
      expect(res.statusCode).toBe(403);
      const body = res.json();
      expect(body.error).toBe("UnauthorizedActionError");
      expect(body.message).toContain("AI actors are strictly prohibited");
    });

    it("PATCH /api/v1/evaluations/:id rejects AI actor with 403 Forbidden", async () => {
      const res = await app.inject({
        method: "PATCH",
        url: `/api/v1/evaluations/${evalAssignedExaminer1}`,
        headers: { "x-actor-type": "AI" },
        payload: {
          questionId: "q_harden_1",
          awardedMarks: 8,
          evaluatorId: examiner1Id,
        },
      });
      expect(res.statusCode).toBe(403);
      const body = res.json();
      expect(body.error).toBe("UnauthorizedActionError");
      expect(body.message).toContain("AI cannot assign authoritative marks");
    });

    it("POST /api/v1/evaluations/:id/submit rejects AI actor with 403 Forbidden", async () => {
      const res = await app.inject({
        method: "POST",
        url: `/api/v1/evaluations/${evalAssignedExaminer1}/submit`,
        headers: { "x-actor-type": "AI" },
        payload: { evaluatorId: examiner1Id },
      });
      expect(res.statusCode).toBe(403);
      const body = res.json();
      expect(body.error).toBe("UnauthorizedActionError");
      expect(body.message).toContain("AI cannot finalize or submit");
    });

    it("GET /api/v1/evaluations rejects AI actor with 403 Forbidden", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/evaluations",
        headers: { "x-actor-type": "AI" },
      });
      expect(res.statusCode).toBe(403);
    });

    it("GET /api/v1/evaluations/:id rejects AI actor with 403 Forbidden", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/v1/evaluations/${evalAssignedExaminer1}`,
        headers: { "x-actor-type": "AI" },
      });
      expect(res.statusCode).toBe(403);
    });

    it("GET /api/v1/evaluations/:id/quality-signals rejects AI actor with 403 Forbidden", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/v1/evaluations/${evalAssignedExaminer1}/quality-signals`,
        headers: { "x-actor-type": "AI" },
      });
      expect(res.statusCode).toBe(403);
    });

    it("GET /api/v1/quality-signals rejects AI actor with 403 Forbidden", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/quality-signals",
        headers: { "x-actor-type": "AI" },
      });
      expect(res.statusCode).toBe(403);
    });

    it("GET /api/v1/quality-signals/:id rejects AI actor with 403 Forbidden", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/v1/quality-signals/${testSignalId}`,
        headers: { "x-actor-type": "AI" },
      });
      expect(res.statusCode).toBe(403);
    });

    it("GET /api/v1/triage-cases rejects AI actor with 403 Forbidden", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/triage-cases",
        headers: { "x-actor-type": "AI" },
      });
      expect(res.statusCode).toBe(403);
    });

    it("GET /api/v1/triage-cases/:id rejects AI actor with 403 Forbidden", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/v1/triage-cases/${testTriageCaseId}`,
        headers: { "x-actor-type": "AI" },
      });
      expect(res.statusCode).toBe(403);
    });

    it("POST /api/v1/triage-cases rejects AI actor with 403 Forbidden", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/triage-cases",
        headers: { "x-actor-type": "AI" },
        payload: { qualitySignalId: testSignalId },
      });
      expect(res.statusCode).toBe(403);
    });

    it("POST /api/v1/triage-cases/:id/assign rejects AI actor with 403 Forbidden", async () => {
      const res = await app.inject({
        method: "POST",
        url: `/api/v1/triage-cases/${testTriageCaseId}/assign`,
        headers: { "x-actor-type": "AI" },
        payload: { assigneeId: moderatorId },
      });
      expect(res.statusCode).toBe(403);
    });

    it("POST /api/v1/triage-cases/:id/resolve rejects AI actor with 403 Forbidden", async () => {
      const res = await app.inject({
        method: "POST",
        url: `/api/v1/triage-cases/${testTriageCaseId}/resolve`,
        headers: { "x-actor-type": "AI" },
        payload: { outcome: ResolutionOutcome.CONFIRMED_VALID, reason: "Valid answer." },
      });
      expect(res.statusCode).toBe(403);
    });

    it("GET /api/v1/audit-events rejects AI actor with 403 Forbidden", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/audit-events",
        headers: { "x-actor-type": "AI" },
      });
      expect(res.statusCode).toBe(403);
    });

    it("GET /api/v1/analytics/evaluators rejects AI actor with 403 Forbidden", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/analytics/evaluators",
        headers: { "x-actor-type": "AI" },
      });
      expect(res.statusCode).toBe(403);
    });

    it("POST /api/v1/integration/osm/ingest rejects AI actor with 403 Forbidden", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/integration/osm/ingest",
        headers: { "x-actor-type": "AI" },
        payload: {
          externalEvaluationId: "ext_100",
          examinationCycleId: "cycle_1",
          candidateScriptId: "script_1",
          examinerId: "ex_1",
          rubricReference: { rubricId: validRubricId, version: validRubricVersion },
          questionMarks: [{ questionId: "q1", awardedMarks: 5, maximumMarks: 10 }],
        },
      });
      expect(res.statusCode).toBe(403);
    });
  });

  // =========================================================================
  // 2. Role Enforcement & Boundaries (EXAMINER vs MODERATOR vs ADMIN)
  // =========================================================================
  describe("2. Role Enforcement & Boundaries", () => {
    it("EXAMINER cannot inspect triage cases list (403 Forbidden)", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/triage-cases",
        headers: { "x-user-role": UserRole.EXAMINER },
      });
      expect(res.statusCode).toBe(403);
      expect(res.json().message).toContain("Examiners are not authorized");
    });

    it("EXAMINER cannot inspect a specific triage case (403 Forbidden)", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/v1/triage-cases/${testTriageCaseId}`,
        headers: { "x-user-role": UserRole.EXAMINER },
      });
      expect(res.statusCode).toBe(403);
    });

    it("EXAMINER cannot create a triage case (403 Forbidden)", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/triage-cases",
        headers: { "x-user-role": UserRole.EXAMINER },
        payload: { qualitySignalId: testSignalId },
      });
      expect(res.statusCode).toBe(403);
    });

    it("EXAMINER cannot assign a triage case (403 Forbidden)", async () => {
      const res = await app.inject({
        method: "POST",
        url: `/api/v1/triage-cases/${testTriageCaseId}/assign`,
        headers: { "x-user-role": UserRole.EXAMINER },
        payload: { assigneeId: moderatorId },
      });
      expect(res.statusCode).toBe(403);
    });

    it("EXAMINER cannot resolve a triage case (403 Forbidden)", async () => {
      const res = await app.inject({
        method: "POST",
        url: `/api/v1/triage-cases/${testTriageCaseId}/resolve`,
        headers: { "x-user-role": UserRole.EXAMINER },
        payload: { outcome: ResolutionOutcome.CONFIRMED_VALID, reason: "Valid marks." },
      });
      expect(res.statusCode).toBe(403);
    });

    it("EXAMINER cannot inspect audit events (403 Forbidden)", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/audit-events",
        headers: { "x-user-role": UserRole.EXAMINER },
      });
      expect(res.statusCode).toBe(403);
    });

    it("EXAMINER cannot inspect comparative analytics (403 Forbidden)", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/analytics/evaluators",
        headers: { "x-user-role": UserRole.EXAMINER },
      });
      expect(res.statusCode).toBe(403);
    });

    it("EXAMINER cannot invoke OSM ingestion (403 Forbidden)", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/integration/osm/ingest",
        headers: { "x-user-role": UserRole.EXAMINER },
        payload: {
          externalEvaluationId: "ext_ex_forbidden",
          examinationCycleId: "cycle_1",
          candidateScriptId: "script_1",
          examinerId: examiner1Id,
          rubricReference: { rubricId: validRubricId, version: validRubricVersion },
          questionMarks: [{ questionId: "q1", awardedMarks: 5, maximumMarks: 10 }],
        },
      });
      expect(res.statusCode).toBe(403);
    });

    it("Unrecognized role (e.g. 'HACKER') is rejected with 403 Forbidden across protected routes", async () => {
      const resAudit = await app.inject({
        method: "GET",
        url: "/api/v1/audit-events",
        headers: { "x-user-role": "HACKER" },
      });
      expect(resAudit.statusCode).toBe(403);

      const resTriage = await app.inject({
        method: "GET",
        url: "/api/v1/triage-cases",
        headers: { "x-user-role": "HACKER" },
      });
      expect(resTriage.statusCode).toBe(403);

      const resAnalytics = await app.inject({
        method: "GET",
        url: "/api/v1/analytics/evaluators",
        headers: { "x-user-role": "HACKER" },
      });
      expect(resAnalytics.statusCode).toBe(403);
    });
  });

  // =========================================================================
  // 3. Resource Ownership & Evaluator Assignment Isolation (06-api §15)
  // =========================================================================
  describe("3. Resource Ownership & Evaluator Isolation", () => {
    it("Examiner 2 cannot assign marks to an evaluation assigned to Examiner 1 (403 Forbidden)", async () => {
      const res = await app.inject({
        method: "PATCH",
        url: `/api/v1/evaluations/${evalAssignedExaminer1}`,
        headers: {
          "x-user-role": UserRole.EXAMINER,
          "x-evaluator-id": examiner2Id,
        },
        payload: {
          questionId: "q_harden_1",
          awardedMarks: 7,
          evaluatorId: examiner2Id,
        },
      });
      expect(res.statusCode).toBe(403);
      expect(res.json().error).toBe("UnauthorizedActionError");
      expect(res.json().message).toContain("Only the assigned evaluator");
    });

    it("Examiner 2 cannot submit an evaluation assigned to Examiner 1 (403 Forbidden)", async () => {
      const res = await app.inject({
        method: "POST",
        url: `/api/v1/evaluations/${evalAssignedExaminer1}/submit`,
        headers: {
          "x-user-role": UserRole.EXAMINER,
          "x-evaluator-id": examiner2Id,
        },
        payload: { evaluatorId: examiner2Id },
      });
      expect(res.statusCode).toBe(403);
      expect(res.json().error).toBe("UnauthorizedActionError");
      expect(res.json().message).toContain("Only the assigned evaluator");
    });

    it("Examiner 1 can successfully assign marks to their own assigned evaluation (200 OK)", async () => {
      const res = await app.inject({
        method: "PATCH",
        url: `/api/v1/evaluations/${evalAssignedExaminer1}`,
        headers: {
          "x-user-role": UserRole.EXAMINER,
          "x-evaluator-id": examiner1Id,
        },
        payload: {
          questionId: "q_harden_1",
          awardedMarks: 9,
          evaluatorId: examiner1Id,
        },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().totalScore).toBe(9);
    });

    it("Examiner cannot create an evaluation assigned to another evaluator (403 Forbidden)", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/evaluations",
        headers: {
          "x-user-role": UserRole.EXAMINER,
          "x-actor-id": examiner1Id,
        },
        payload: {
          id: "eval_forged_assignment",
          evaluationCycleId: "cycle_1",
          scriptId: "script_1",
          evaluatorId: examiner2Id, // Attempting to assign to examiner2
          rubricId: validRubricId,
          rubricVersion: validRubricVersion,
          questions: [{ questionNumber: "1", text: "Q1", maxMarks: 10, orderIndex: 0 }],
        },
      });
      expect(res.statusCode).toBe(403);
      expect(res.json().message).toContain("Examiner 'examiner_smith_01' cannot create evaluation assigned to 'examiner_jones_02'");
    });
  });

  // =========================================================================
  // 4. Identifier Validation (Empty / Whitespace-only Path Params)
  // =========================================================================
  describe("4. Identifier & Parameter Validation", () => {
    it("GET /api/v1/evaluations/%20 (whitespace evaluationId) returns 400 Bad Request", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/evaluations/%20",
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().error).toBe("InvalidCommandError");
    });

    it("PATCH /api/v1/evaluations/%20 returns 400 Bad Request", async () => {
      const res = await app.inject({
        method: "PATCH",
        url: "/api/v1/evaluations/%20",
        payload: { questionId: "q1", awardedMarks: 5, evaluatorId: examiner1Id },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().error).toBe("InvalidCommandError");
    });

    it("POST /api/v1/evaluations/%20/submit returns 400 Bad Request", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/evaluations/%20/submit",
        payload: { evaluatorId: examiner1Id },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().error).toBe("InvalidCommandError");
    });

    it("GET /api/v1/evaluations/%20/quality-signals returns 400 Bad Request", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/evaluations/%20/quality-signals",
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().error).toBe("InvalidCommandError");
    });

    it("GET /api/v1/quality-signals/%20 returns 400 Bad Request", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/quality-signals/%20",
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().error).toBe("InvalidCommandError");
    });

    it("GET /api/v1/triage-cases/%20 returns 400 Bad Request", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/triage-cases/%20",
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().error).toBe("InvalidCommandError");
    });

    it("POST /api/v1/triage-cases/%20/assign returns 400 Bad Request", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/triage-cases/%20/assign",
        payload: { assigneeId: moderatorId },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().error).toBe("InvalidCommandError");
    });

    it("POST /api/v1/triage-cases/%20/resolve returns 400 Bad Request", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/triage-cases/%20/resolve",
        payload: { outcome: ResolutionOutcome.CONFIRMED_VALID, reason: "Reason." },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().error).toBe("InvalidCommandError");
    });

    it("GET /api/v1/audit-events/%20 returns 400 Bad Request", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/audit-events/%20",
        headers: {
          "x-user-role": UserRole.MODERATOR,
        },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().error).toBe("InvalidCommandError");
    });

    it("GET /api/v1/analytics/evaluators/%20 returns 400 Bad Request", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/analytics/evaluators/%20",
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().error).toBe("InvalidCommandError");
    });
  });

  // =========================================================================
  // 5. Input Schema Validation, Enum Validation & Malformed Data
  // =========================================================================
  describe("5. Input Schema Validation & Value Boundaries", () => {
    it("Malformed JSON returns 400 Bad Request", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/evaluations",
        headers: { "content-type": "application/json" },
        payload: "{ malformed json",
      });
      expect(res.statusCode).toBe(400);
    });

    it("POST /triage-cases/:id/resolve rejects invalid enum outcome with 400 Bad Request", async () => {
      const res = await app.inject({
        method: "POST",
        url: `/api/v1/triage-cases/${testTriageCaseId}/resolve`,
        payload: { outcome: "SUPER_APPROVE_FORGED", reason: "Good" },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().code).toBe("VALIDATION_FAILED");
    });

    it("POST /triage-cases/:id/resolve rejects whitespace-only reason with 400 Bad Request", async () => {
      const res = await app.inject({
        method: "POST",
        url: `/api/v1/triage-cases/${testTriageCaseId}/resolve`,
        payload: { outcome: ResolutionOutcome.CONFIRMED_VALID, reason: "    " },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().code).toBe("VALIDATION_FAILED");
    });

    it("PATCH /api/v1/evaluations/:id rejects invalid actorType enum with 400 Bad Request", async () => {
      const res = await app.inject({
        method: "PATCH",
        url: `/api/v1/evaluations/${evalAssignedExaminer1}`,
        payload: {
          questionId: "q_harden_1",
          awardedMarks: 5,
          evaluatorId: examiner1Id,
          actorType: "ROBOTIC_AI",
        },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().code).toBe("VALIDATION_FAILED");
    });

    it("PATCH /api/v1/evaluations/:id rejects mark exceeding maximum with 400 Bad Request", async () => {
      const res = await app.inject({
        method: "PATCH",
        url: `/api/v1/evaluations/${evalAssignedExaminer1}`,
        payload: {
          questionId: "q_harden_1",
          awardedMarks: 15, // maxMarks is 10
          evaluatorId: examiner1Id,
        },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().error).toBe("InvalidMarkError");
    });

    it("PATCH /api/v1/evaluations/:id rejects negative marks with 400 Bad Request", async () => {
      const res = await app.inject({
        method: "PATCH",
        url: `/api/v1/evaluations/${evalAssignedExaminer1}`,
        payload: {
          questionId: "q_harden_1",
          awardedMarks: -2,
          evaluatorId: examiner1Id,
        },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().error).toBe("InvalidMarkError");
    });
  });

  // =========================================================================
  // 6. Privilege Escalation & Bypass Protection
  // =========================================================================
  describe("6. Privilege Escalation & Bypass Protection", () => {
    it("AI actor spoofing ADMIN role is still strictly rejected with 403 Forbidden", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/evaluations",
        headers: {
          "x-actor-type": "AI",
          "x-user-role": "ADMIN",
        },
        payload: {
          id: "eval_spoofed_admin",
          evaluationCycleId: "cycle_1",
          scriptId: "script_1",
          evaluatorId: "ai_admin",
          rubricId: validRubricId,
          rubricVersion: validRubricVersion,
          questions: [{ questionNumber: "1", text: "Q1", maxMarks: 10, orderIndex: 0 }],
        },
      });
      expect(res.statusCode).toBe(403);
      expect(res.json().error).toBe("UnauthorizedActionError");
    });

    it("SYSTEM actor attempting consequential human resolution is rejected with 403 Forbidden", async () => {
      const res = await app.inject({
        method: "POST",
        url: `/api/v1/triage-cases/${testTriageCaseId}/resolve`,
        headers: {
          "x-actor-type": "SYSTEM",
          "x-user-role": "ADMIN",
        },
        payload: { outcome: ResolutionOutcome.CONFIRMED_VALID, reason: "Automated resolution." },
      });
      expect(res.statusCode).toBe(403);
      expect(res.json().error).toBe("UnauthorizedActionError");
      expect(res.json().message).toContain("Human resolution is required");
    });
  });

  // =========================================================================
  // 7. Application-Layer Defense-in-Depth (Direct Command Invariants)
  // =========================================================================
  describe("7. Application-Layer Command Invariants (Defense-in-Depth)", () => {
    it("CreateEvaluationHandler directly rejects AI actorType", async () => {
      const handler = new CreateEvaluationHandler(uow);
      await expect(
        handler.execute({
          id: "eval_direct_ai",
          evaluationCycleId: "cycle_1",
          scriptId: "script_1",
          evaluatorId: "ai_bot",
          rubricId: validRubricId,
          rubricVersion: validRubricVersion,
          questions: [{ id: "q1", questionNumber: "1", text: "Q1", maxMarks: 10, orderIndex: 0 }],
          actorType: "AI",
        })
      ).rejects.toThrow(UnauthorizedActionError);
    });

    it("AssignMarkHandler directly rejects AI actorType", async () => {
      const handler = new AssignMarkHandler(uow);
      await expect(
        handler.execute({
          evaluationId: evalAssignedExaminer1,
          questionId: "q_harden_1",
          awardedMarks: 5,
          evaluatorId: examiner1Id,
          actorType: "AI",
        })
      ).rejects.toThrow(UnauthorizedActionError);
    });

    it("AssignMarkHandler directly rejects EXAMINER for non-owned evaluation", async () => {
      const handler = new AssignMarkHandler(uow);
      await expect(
        handler.execute({
          evaluationId: evalAssignedExaminer1,
          questionId: "q_harden_1",
          awardedMarks: 5,
          evaluatorId: examiner2Id, // Not the assigned evaluator
          userRole: "EXAMINER",
        })
      ).rejects.toThrow(UnauthorizedActionError);
    });

    it("SubmitEvaluationHandler directly rejects AI actorType", async () => {
      const handler = new SubmitEvaluationHandler(uow);
      await expect(
        handler.execute({
          evaluationId: evalAssignedExaminer1,
          evaluatorId: examiner1Id,
          actorType: "AI",
        })
      ).rejects.toThrow(UnauthorizedActionError);
    });

    it("SubmitEvaluationHandler directly rejects mismatched evaluatorId", async () => {
      const handler = new SubmitEvaluationHandler(uow);
      await expect(
        handler.execute({
          evaluationId: evalAssignedExaminer1,
          evaluatorId: examiner2Id, // Not the assigned evaluator
        })
      ).rejects.toThrow(UnauthorizedActionError);
    });

    it("CreateTriageCaseHandler directly rejects AI actorType", async () => {
      const handler = new CreateTriageCaseHandler(uow);
      await expect(
        handler.execute({
          qualitySignalId: testSignalId,
          actorId: "ai_bot",
          actorType: "AI",
        })
      ).rejects.toThrow(UnauthorizedActionError);
    });

    it("CreateTriageCaseHandler directly rejects EXAMINER role", async () => {
      const handler = new CreateTriageCaseHandler(uow);
      await expect(
        handler.execute({
          qualitySignalId: testSignalId,
          actorId: examiner1Id,
          userRole: "EXAMINER",
        })
      ).rejects.toThrow(UnauthorizedActionError);
    });

    it("AssignTriageCaseHandler directly rejects AI actorType", async () => {
      const handler = new AssignTriageCaseHandler(uow);
      await expect(
        handler.execute({
          caseId: testTriageCaseId,
          assigneeId: moderatorId,
          actorId: "ai_bot",
          actorType: "AI",
        })
      ).rejects.toThrow(UnauthorizedActionError);
    });

    it("AssignTriageCaseHandler directly rejects EXAMINER role", async () => {
      const handler = new AssignTriageCaseHandler(uow);
      await expect(
        handler.execute({
          caseId: testTriageCaseId,
          assigneeId: moderatorId,
          actorId: examiner1Id,
          userRole: "EXAMINER",
        })
      ).rejects.toThrow(UnauthorizedActionError);
    });

    it("ResolveTriageCaseHandler directly rejects AI actorType", async () => {
      const handler = new ResolveTriageCaseHandler(uow);
      await expect(
        handler.execute({
          caseId: testTriageCaseId,
          outcome: ResolutionOutcome.CONFIRMED_VALID,
          reason: "Valid",
          actorId: "ai_bot",
          actorType: "AI",
        })
      ).rejects.toThrow(UnauthorizedActionError);
    });

    it("ResolveTriageCaseHandler directly rejects SYSTEM actorType", async () => {
      const handler = new ResolveTriageCaseHandler(uow);
      await expect(
        handler.execute({
          caseId: testTriageCaseId,
          outcome: ResolutionOutcome.CONFIRMED_VALID,
          reason: "Automated",
          actorId: "system_cron",
          actorType: "SYSTEM",
        })
      ).rejects.toThrow(UnauthorizedActionError);
    });

    it("ResolveTriageCaseHandler directly rejects EXAMINER role", async () => {
      const handler = new ResolveTriageCaseHandler(uow);
      await expect(
        handler.execute({
          caseId: testTriageCaseId,
          outcome: ResolutionOutcome.CONFIRMED_VALID,
          reason: "Valid",
          actorId: examiner1Id,
          userRole: "EXAMINER",
        })
      ).rejects.toThrow(UnauthorizedActionError);
    });
  });

  // =========================================================================
  // 8. Production Error Mapping & Information Leakage Prevention
  // =========================================================================
  describe("8. Error Mapping & Production Information Leakage", () => {
    it("In production mode (isProduction: true), unexpected 500 masks internal details", () => {
      const internalSqlError = new Error("SELECT * FROM secret_passwords WHERE id = 'bad' [SQLITE_ERROR: syntax error]");
      const mapped = mapErrorToHttpResponse(internalSqlError, true);

      expect(mapped.statusCode).toBe(500);
      expect(mapped.payload.code).toBe("INTERNAL_SERVER_ERROR");
      expect(mapped.payload.message).toBe("An internal server error occurred");
      expect(mapped.payload.message).not.toContain("SQLITE_ERROR");
      expect(mapped.payload.message).not.toContain("secret_passwords");
      expect(mapped.payload.details).toBeUndefined();
    });

    it("In development mode (isProduction: false), internal error message is preserved for debugging", () => {
      const devError = new Error("Simulated dev error");
      const mapped = mapErrorToHttpResponse(devError, false);

      expect(mapped.statusCode).toBe(500);
      expect(mapped.payload.message).toBe("Simulated dev error");
    });

    it("404 errors map with structured EntityNotFoundError payload", () => {
      const notFound = new EntityNotFoundError("Evaluation", "eval_999");
      const mapped = mapErrorToHttpResponse(notFound, true);

      expect(mapped.statusCode).toBe(404);
      expect(mapped.payload.code).toBe("ENTITY_NOT_FOUND");
      expect(mapped.payload.message).toContain("eval_999");
    });

    it("403 errors map with structured UnauthorizedActionError payload", () => {
      const unauth = new UnauthorizedActionError("SUBMIT_EVALUATION", "AI is forbidden.");
      const mapped = mapErrorToHttpResponse(unauth, true);

      expect(mapped.statusCode).toBe(403);
      expect(mapped.payload.code).toBe("UNAUTHORIZED_ACTION");
      expect(mapped.payload.details).toEqual({ action: "SUBMIT_EVALUATION" });
    });
  });
});
