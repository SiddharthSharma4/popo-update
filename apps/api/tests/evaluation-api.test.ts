/**
 * End-to-End API Integration Test Suite for Evaluation Workflow.
 * Conforms to docs/contracts/06-api-contract.md §18, §21.3, §22, §23, §41, §42,
 * docs/contracts/05-domain-contract.md §10, §38 (INV-003: AI Non-Authority),
 * docs/contracts/08-data-contract.md §28-31 (Outbox/Audit), §43-45 (Optimistic Concurrency),
 * and docs/contracts/09-testing-contract.md.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { createServer } from "../src/presentation/server.js";
import { createDatabase, type KyselyDb } from "../src/infrastructure/database/database.js";
import { runMigrations } from "../src/infrastructure/database/migrator.js";
import { KyselyRubricRepository } from "../src/infrastructure/repositories/kysely-rubric-repository.js";
import { Rubric } from "../src/domain/rubric/rubric.js";
import {
  EvaluationResponseSchema,
  PaginatedEvaluationsResponseSchema,
  ApiErrorResponseSchema,
  EvaluationStatus,
} from "@osm/shared";


describe("Evaluation API Integration (/api/v1/evaluations)", () => {
  let app: FastifyInstance;
  let db: KyselyDb;
  let rubricRepo: KyselyRubricRepository;

  const validRubricId = "rubric_test_101";
  const validRubricVersion = 1;

  beforeAll(async () => {
    // In-memory SQLite for deterministic, isolated testing
    db = createDatabase(":memory:");
    await runMigrations(db);

    rubricRepo = new KyselyRubricRepository(db);

    // Seed a valid immutable rubric required for evaluation creation
    const rubric = new Rubric({
      id: validRubricId,
      version: validRubricVersion,
      title: "Computer Science Assessment Rubric 2026",
      criteria: [
        {
          id: "crit_algo_1",
          title: "Algorithm Correctness",
          description: "Accuracy of algorithmic complexity analysis",
          maxMarks: 10,
        },
        {
          id: "crit_code_2",
          title: "Code Implementation",
          description: "Clean code structure and edge case handling",
          maxMarks: 15,
        },
      ],
    });
    await rubricRepo.save(rubric);

    app = await createServer({
      config: {
        NODE_ENV: "test",
        PORT: 4002,
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

  describe("POST /api/v1/evaluations — Create Evaluation", () => {
    it("should successfully create an evaluation and return 201 Created with valid schema", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/evaluations",
        payload: {
          id: "eval_create_001",
          evaluationCycleId: "cycle_cs_2026",
          scriptId: "script_student_888",
          evaluatorId: "evaluator_prof_smith",
          rubricId: validRubricId,
          rubricVersion: validRubricVersion,
          questions: [
            {
              id: "q_algo_1",
              questionNumber: "1(a)",
              text: "Explain merge sort time complexity.",
              maxMarks: 10,
              rubricCriteriaId: "crit_algo_1",
              orderIndex: 0,
            },
            {
              id: "q_code_2",
              questionNumber: "1(b)",
              text: "Implement binary search in TypeScript.",
              maxMarks: 15,
              rubricCriteriaId: "crit_code_2",
              orderIndex: 1,
            },
          ],
        },
      });

      expect(response.statusCode).toBe(201);

      const body = JSON.parse(response.payload);
      const parsed = EvaluationResponseSchema.safeParse(body);
      expect(parsed.success).toBe(true);

      if (parsed.success) {
        expect(parsed.data.id).toBe("eval_create_001");
        expect(parsed.data.status).toBe(EvaluationStatus.DRAFT);
        expect(parsed.data.evaluatorId).toBe("evaluator_prof_smith");
        expect(parsed.data.maxPossibleScore).toBe(25);
        expect(parsed.data.totalScore).toBe(0);
        expect(parsed.data.isComplete).toBe(false);
        expect(parsed.data.questions).toHaveLength(2);
        expect(parsed.data.marks).toHaveLength(0);
        expect(parsed.data.version).toBe(1);
      }

      // Verify outbox and audit events were persisted in SQLite
      const outboxRows = await db
        .selectFrom("outbox_events")
        .selectAll()
        .where("aggregate_id", "=", "eval_create_001")
        .execute();
      expect(outboxRows.length).toBeGreaterThanOrEqual(1);
      expect(outboxRows[0].event_type).toBe("EvaluationCreated");

      const auditRows = await db
        .selectFrom("audit_events")
        .selectAll()
        .where("entity_id", "=", "eval_create_001")
        .execute();
      expect(auditRows.length).toBeGreaterThanOrEqual(1);
      expect(auditRows[0].action).toBe("CREATE_EVALUATION");
    });

    it("should return 404 Not Found when referenced rubric does not exist", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/evaluations",
        payload: {
          id: "eval_fail_rubric",
          evaluationCycleId: "cycle_cs_2026",
          scriptId: "script_student_999",
          evaluatorId: "evaluator_prof_smith",
          rubricId: "non_existent_rubric",
          rubricVersion: 99,
          questions: [
            {
              id: "q1",
              questionNumber: "1",
              text: "Sample",
              maxMarks: 10,
              orderIndex: 0,
            },
          ],
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.payload);
      expect(body.code).toBe("ENTITY_NOT_FOUND");
      expect(body.error).toBe("EntityNotFoundError");
      expect(body.message).toContain("Rubric with id 'non_existent_rubric (v99)' was not found");
      expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp);
    });

    it("should return 400 Bad Request on malformed or invalid request payload", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/evaluations",
        payload: {
          // Missing required fields: scriptId, evaluatorId, questions
          id: "eval_malformed",
          evaluationCycleId: "cycle_1",
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.payload);
      expect(body.code).toBe("VALIDATION_FAILED");
      expect(body.error).toBe("ValidationError");
      expect(body.details).toBeDefined();
    });
  });

  describe("GET /api/v1/evaluations/:evaluationId — Retrieve Evaluation", () => {
    it("should return 200 OK with the evaluation DTO when it exists", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/evaluations/eval_create_001",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.id).toBe("eval_create_001");
      expect(body.evaluatorId).toBe("evaluator_prof_smith");
      expect(body.status).toBe(EvaluationStatus.DRAFT);
    });

    it("should return 404 Not Found when evaluation ID does not exist", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/evaluations/non_existent_eval_id",
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.payload);
      expect(body.code).toBe("ENTITY_NOT_FOUND");
      expect(body.message).toContain("Evaluation with id 'non_existent_eval_id' was not found");
    });
  });

  describe("PATCH /api/v1/evaluations/:evaluationId — Assign & Update Marks", () => {
    it("should assign a mark and transition evaluation to IN_PROGRESS", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: "/api/v1/evaluations/eval_create_001",
        payload: {
          questionId: "q_algo_1",
          awardedMarks: 8.5,
          evaluatorId: "evaluator_prof_smith",
          comments: "Clear explanation of divide-and-conquer recurrence relation.",
          isAnnotated: true,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.status).toBe(EvaluationStatus.IN_PROGRESS);
      expect(body.totalScore).toBe(8.5);
      expect(body.marks).toHaveLength(1);
      expect(body.marks[0].questionId).toBe("q_algo_1");
      expect(body.marks[0].awardedMarks).toBe(8.5);
      expect(body.marks[0].comments).toBe("Clear explanation of divide-and-conquer recurrence relation.");
      expect(body.marks[0].isAnnotated).toBe(true);
      expect(body.version).toBe(2); // Optimistic concurrency version incremented
    });

    it("should assign mark using headers for evaluator identity", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: "/api/v1/evaluations/eval_create_001",
        headers: {
          "x-evaluator-id": "evaluator_prof_smith",
        },
        payload: {
          questionId: "q_code_2",
          awardedMarks: 12,
          comments: "Clean implementation, handled boundary conditions well.",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.totalScore).toBe(20.5); // 8.5 + 12
      expect(body.marks).toHaveLength(2);
      expect(body.isComplete).toBe(true); // All 2 questions now marked
    });

    it("should reject mark assignment with awardedMarks exceeding maximum permitted (400 Bad Request)", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: "/api/v1/evaluations/eval_create_001",
        payload: {
          questionId: "q_algo_1",
          awardedMarks: 99, // max is 10
          evaluatorId: "evaluator_prof_smith",
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.payload);
      expect(body.code).toBe("INVALID_MARK");
      expect(body.error).toBe("InvalidMarkError");
      expect(body.details.maxMarks).toBe(10);
      expect(body.details.awardedMarks).toBe(99);
    });

    it("should reject negative marks (400 Bad Request)", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: "/api/v1/evaluations/eval_create_001",
        payload: {
          questionId: "q_algo_1",
          awardedMarks: -5,
          evaluatorId: "evaluator_prof_smith",
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.payload);
      expect(body.code).toBe("INVALID_MARK");
      expect(body.error).toBe("InvalidMarkError");
    });

    it("should return 404 Not Found when question does not belong to evaluation", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: "/api/v1/evaluations/eval_create_001",
        payload: {
          questionId: "non_existent_question_id",
          awardedMarks: 5,
          evaluatorId: "evaluator_prof_smith",
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.payload);
      expect(body.code).toBe("QUESTION_NOT_FOUND");
      expect(body.error).toBe("QuestionNotFoundError");
      expect(body.details.questionId).toBe("non_existent_question_id");
    });

    it("should enforce AI Non-Authority Invariant (INV-003): reject mark assignment by AI actor (403 Forbidden)", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: "/api/v1/evaluations/eval_create_001",
        headers: {
          "x-actor-type": "AI",
        },
        payload: {
          questionId: "q_algo_1",
          awardedMarks: 9,
          evaluatorId: "ai_vision_agent_007",
        },
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.payload);
      expect(body.code).toBe("UNAUTHORIZED_ACTION");
      expect(body.error).toBe("UnauthorizedActionError");
      expect(body.message).toContain("AI cannot assign authoritative marks");
    });

    it("should reject mark assignment when expectedVersion mismatches (409 Conflict)", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: "/api/v1/evaluations/eval_create_001",
        payload: {
          questionId: "q_algo_1",
          awardedMarks: 9,
          evaluatorId: "evaluator_prof_smith",
          expectedVersion: 1, // Current version is > 1
        },
      });

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.payload);
      expect(body.code).toBe("CONCURRENCY_CONFLICT");
      expect(body.error).toBe("ConcurrencyConflictError");
    });

    it("should reject mark assignment when If-Match header mismatches (409 Conflict)", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: "/api/v1/evaluations/eval_create_001",
        headers: {
          "if-match": "1",
        },
        payload: {
          questionId: "q_algo_1",
          awardedMarks: 9,
          evaluatorId: "evaluator_prof_smith",
        },
      });

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.payload);
      expect(body.code).toBe("CONCURRENCY_CONFLICT");
      expect(body.error).toBe("ConcurrencyConflictError");
    });
  });

  describe("POST /api/v1/evaluations/:evaluationId/submit — Submit Evaluation", () => {
    it("should reject submission by an unauthorized evaluator (403 Forbidden)", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/evaluations/eval_create_001/submit",
        payload: {
          evaluatorId: "impostor_evaluator_id",
        },
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.payload);
      expect(body.code).toBe("UNAUTHORIZED_ACTION");
      expect(body.message).toContain("Only the assigned evaluator (evaluator_prof_smith) may submit");
    });

    it("should reject submission by AI actor (403 Forbidden)", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/evaluations/eval_create_001/submit",
        headers: {
          "x-actor-type": "AI",
        },
        payload: {
          evaluatorId: "evaluator_prof_smith",
        },
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.payload);
      expect(body.code).toBe("UNAUTHORIZED_ACTION");
      expect(body.message).toContain("AI cannot finalize or submit examination evaluations");
    });

    it("should successfully submit evaluation by assigned evaluator and transition to SUBMITTED", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/evaluations/eval_create_001/submit",
        payload: {
          evaluatorId: "evaluator_prof_smith",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.status).toBe(EvaluationStatus.SUBMITTED);
      expect(body.submittedAt).not.toBeNull();
      expect(new Date(body.submittedAt).toISOString()).toBe(body.submittedAt);

      // Verify outbox event written
      const outboxRows = await db
        .selectFrom("outbox_events")
        .selectAll()
        .where("aggregate_id", "=", "eval_create_001")
        .where("event_type", "=", "EvaluationSubmitted")
        .execute();
      expect(outboxRows.length).toBe(1);

      // Verify audit event written
      const auditRows = await db
        .selectFrom("audit_events")
        .selectAll()
        .where("entity_id", "=", "eval_create_001")
        .where("event_type", "=", "EvaluationSubmitted")
        .execute();
      expect(auditRows.length).toBe(1);
    });

    it("should enforce locked status guard: reject mark modifications on SUBMITTED evaluation (409 Conflict)", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: "/api/v1/evaluations/eval_create_001",
        payload: {
          questionId: "q_algo_1",
          awardedMarks: 10,
          evaluatorId: "evaluator_prof_smith",
        },
      });

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.payload);
      expect(body.code).toBe("EVALUATION_LOCKED");
      expect(body.error).toBe("EvaluationLockedError");
      expect(body.message).toContain("Cannot modify evaluation eval_create_001 in status 'SUBMITTED'");
    });

    it("should reject double-submission / invalid lifecycle transition (409 Conflict)", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/evaluations/eval_create_001/submit",
        payload: {
          evaluatorId: "evaluator_prof_smith",
        },
      });

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.payload);
      expect(body.code).toBe("INVALID_STATE_TRANSITION");
      expect(body.error).toBe("InvalidStateTransitionError");
      expect(body.message).toContain("Invalid state transition for Evaluation from 'SUBMITTED' to 'SUBMITTED'");
    });
  });

  describe("GET /api/v1/evaluations — List Evaluations (Collection Query & Pagination)", () => {
    beforeAll(async () => {
      // Seed 3 additional evaluations for comprehensive collection, filtering & pagination testing
      const testSeedPayloads = [
        {
          id: "eval_list_002",
          evaluationCycleId: "cycle_math_2026",
          scriptId: "script_student_101",
          evaluatorId: "evaluator_prof_smith",
          rubricId: validRubricId,
          rubricVersion: validRubricVersion,
          questions: [
            {
              id: "q_math_1",
              questionNumber: "1",
              text: "Prove Pythagorean theorem.",
              maxMarks: 10,
              orderIndex: 0,
            },
          ],
        },
        {
          id: "eval_list_003",
          evaluationCycleId: "cycle_math_2026",
          scriptId: "script_student_102",
          evaluatorId: "evaluator_dr_jones",
          rubricId: validRubricId,
          rubricVersion: validRubricVersion,
          questions: [
            {
              id: "q_math_2",
              questionNumber: "2",
              text: "Integrate x * exp(x) dx.",
              maxMarks: 15,
              orderIndex: 0,
            },
          ],
        },
        {
          id: "eval_list_004",
          evaluationCycleId: "cycle_phys_2026",
          scriptId: "script_student_103",
          evaluatorId: "evaluator_dr_jones",
          rubricId: validRubricId,
          rubricVersion: validRubricVersion,
          questions: [
            {
              id: "q_phys_1",
              questionNumber: "1",
              text: "State Maxwell equations.",
              maxMarks: 20,
              orderIndex: 0,
            },
          ],
        },
      ];

      for (const payload of testSeedPayloads) {
        const createRes = await app.inject({
          method: "POST",
          url: "/api/v1/evaluations",
          payload,
        });
        expect(createRes.statusCode).toBe(201);
      }

      // Transition eval_list_003 to IN_PROGRESS by assigning a mark
      const patchRes = await app.inject({
        method: "PATCH",
        url: "/api/v1/evaluations/eval_list_003",
        payload: {
          questionId: "q_math_2",
          awardedMarks: 12,
          evaluatorId: "evaluator_dr_jones",
        },
      });
      expect(patchRes.statusCode).toBe(200);
    });

    it("should return 200 OK with default pagination and schema conformity", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/evaluations",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);

      const parsed = PaginatedEvaluationsResponseSchema.safeParse(body);
      expect(parsed.success).toBe(true);

      if (parsed.success) {
        expect(parsed.data.page).toBe(1);
        expect(parsed.data.pageSize).toBe(20);
        expect(parsed.data.total).toBe(4); // eval_create_001 + eval_list_002, 003, 004
        expect(parsed.data.items).toHaveLength(4);
      }
    });

    it("should paginate correctly with page and pageSize limits", async () => {
      // Page 1 with pageSize 2
      const page1Res = await app.inject({
        method: "GET",
        url: "/api/v1/evaluations?page=1&pageSize=2",
      });
      expect(page1Res.statusCode).toBe(200);
      const page1Body = JSON.parse(page1Res.payload);
      expect(page1Body.page).toBe(1);
      expect(page1Body.pageSize).toBe(2);
      expect(page1Body.total).toBe(4);
      expect(page1Body.items).toHaveLength(2);

      // Page 2 with pageSize 2
      const page2Res = await app.inject({
        method: "GET",
        url: "/api/v1/evaluations?page=2&pageSize=2",
      });
      expect(page2Res.statusCode).toBe(200);
      const page2Body = JSON.parse(page2Res.payload);
      expect(page2Body.page).toBe(2);
      expect(page2Body.pageSize).toBe(2);
      expect(page2Body.total).toBe(4);
      expect(page2Body.items).toHaveLength(2);

      // Ensure distinct items across pages
      const page1Ids = page1Body.items.map((i: any) => i.id);
      const page2Ids = page2Body.items.map((i: any) => i.id);
      expect(page1Ids.some((id: string) => page2Ids.includes(id))).toBe(false);

      // Page 3 with pageSize 2 (should be empty but return total 4)
      const page3Res = await app.inject({
        method: "GET",
        url: "/api/v1/evaluations?page=3&pageSize=2",
      });
      expect(page3Res.statusCode).toBe(200);
      const page3Body = JSON.parse(page3Res.payload);
      expect(page3Body.page).toBe(3);
      expect(page3Body.total).toBe(4);
      expect(page3Body.items).toHaveLength(0);
    });

    it("should handle boundary pagination values (pageSize=1 and pageSize=100)", async () => {
      const minPageRes = await app.inject({
        method: "GET",
        url: "/api/v1/evaluations?page=1&pageSize=1",
      });
      expect(minPageRes.statusCode).toBe(200);
      const minBody = JSON.parse(minPageRes.payload);
      expect(minBody.items).toHaveLength(1);
      expect(minBody.pageSize).toBe(1);

      const maxPageRes = await app.inject({
        method: "GET",
        url: "/api/v1/evaluations?page=1&pageSize=100",
      });
      expect(maxPageRes.statusCode).toBe(200);
      const maxBody = JSON.parse(maxPageRes.payload);
      expect(maxBody.items).toHaveLength(4);
      expect(maxBody.pageSize).toBe(100);
    });

    it("should reject invalid pagination parameters (400 Bad Request with VALIDATION_FAILED)", async () => {
      // page < 1
      const res1 = await app.inject({
        method: "GET",
        url: "/api/v1/evaluations?page=0",
      });
      expect(res1.statusCode).toBe(400);
      expect(JSON.parse(res1.payload).code).toBe("VALIDATION_FAILED");

      // page negative
      const res2 = await app.inject({
        method: "GET",
        url: "/api/v1/evaluations?page=-2",
      });
      expect(res2.statusCode).toBe(400);

      // pageSize < 1
      const res3 = await app.inject({
        method: "GET",
        url: "/api/v1/evaluations?pageSize=0",
      });
      expect(res3.statusCode).toBe(400);

      // pageSize > 100
      const res4 = await app.inject({
        method: "GET",
        url: "/api/v1/evaluations?pageSize=101",
      });
      expect(res4.statusCode).toBe(400);

      // invalid status enum
      const res5 = await app.inject({
        method: "GET",
        url: "/api/v1/evaluations?status=INVALID_STATUS_STRING",
      });
      expect(res5.statusCode).toBe(400);
    });

    it("should filter evaluations by status", async () => {
      // Filter DRAFT: eval_list_002 and eval_list_004
      const draftRes = await app.inject({
        method: "GET",
        url: "/api/v1/evaluations?status=DRAFT",
      });
      expect(draftRes.statusCode).toBe(200);
      const draftBody = JSON.parse(draftRes.payload);
      expect(draftBody.total).toBe(2);
      expect(draftBody.items.every((e: any) => e.status === "DRAFT")).toBe(true);

      // Filter IN_PROGRESS: eval_list_003
      const inProgressRes = await app.inject({
        method: "GET",
        url: "/api/v1/evaluations?status=IN_PROGRESS",
      });
      expect(inProgressRes.statusCode).toBe(200);
      const inProgBody = JSON.parse(inProgressRes.payload);
      expect(inProgBody.total).toBe(1);
      expect(inProgBody.items[0].id).toBe("eval_list_003");

      // Filter SUBMITTED: eval_create_001
      const subRes = await app.inject({
        method: "GET",
        url: "/api/v1/evaluations?status=SUBMITTED",
      });
      expect(subRes.statusCode).toBe(200);
      const subBody = JSON.parse(subRes.payload);
      expect(subBody.total).toBe(1);
      expect(subBody.items[0].id).toBe("eval_create_001");
    });

    it("should filter evaluations by evaluatorId", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/evaluations?evaluatorId=evaluator_dr_jones",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.total).toBe(2);
      expect(body.items.every((e: any) => e.evaluatorId === "evaluator_dr_jones")).toBe(true);
    });

    it("should filter evaluations by evaluationCycleId", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/evaluations?evaluationCycleId=cycle_math_2026",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.total).toBe(2);
      expect(body.items.every((e: any) => e.evaluationCycleId === "cycle_math_2026")).toBe(true);
    });

    it("should filter evaluations by scriptId", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/evaluations?scriptId=script_student_101",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.total).toBe(1);
      expect(body.items[0].id).toBe("eval_list_002");
    });

    it("should filter by combination of supported filters", async () => {
      // Combine evaluationCycleId + status
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/evaluations?evaluationCycleId=cycle_math_2026&status=DRAFT",
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.total).toBe(1);
      expect(body.items[0].id).toBe("eval_list_002");
      expect(body.items[0].status).toBe("DRAFT");
      expect(body.items[0].evaluationCycleId).toBe("cycle_math_2026");
    });

    it("should return empty collection with 200 OK for no-result queries", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/evaluations?evaluatorId=non_existent_evaluator_999",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.total).toBe(0);
      expect(body.items).toHaveLength(0);
      expect(body.page).toBe(1);
      expect(body.pageSize).toBe(20);
    });

    it("should return deterministic ordering (created_at desc, id asc)", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/evaluations?pageSize=10",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.items.length).toBeGreaterThanOrEqual(2);

      // Verify non-ascending order of createdAt
      for (let i = 0; i < body.items.length - 1; i++) {
        const current = new Date(body.items[i].createdAt).getTime();
        const next = new Date(body.items[i + 1].createdAt).getTime();
        expect(current).toBeGreaterThanOrEqual(next);
      }
    });
  });

  describe("Contract Conformance & Error Responses", () => {
    it("all error responses must strictly conform to ApiErrorResponseSchema", async () => {

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/evaluations/non_existent_123",
      });

      const body = JSON.parse(response.payload);
      const parsed = ApiErrorResponseSchema.safeParse(body);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.statusCode).toBe(404);
        expect(parsed.data.error).toBe("EntityNotFoundError");
        expect(parsed.data.code).toBe("ENTITY_NOT_FOUND");
        expect(parsed.data.message).toBeDefined();
        expect(new Date(parsed.data.timestamp).toISOString()).toBe(parsed.data.timestamp);
      }
    });
  });
});
