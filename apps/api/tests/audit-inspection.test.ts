/**
 * Audit Inspection HTTP API Test Suite (TASK-P6-AUDIT-002).
 *
 * Conforms to:
 * - docs/contracts/06-api-contract.md §37-40, §44-45, §69 (GET /api/v1/audit-events, GET /api/v1/audit-events/:eventId)
 * - docs/contracts/05-domain-contract.md §29-31, INV-005 (Audit authority & immutability)
 * - docs/contracts/02-architecture-contract.md §37-38, §46 (Audit module & role boundaries)
 * - docs/contracts/08-data-contract.md §24-27 (AuditEvent persistence & querying)
 * - docs/contracts/09-testing-contract.md §44-45, §74, §143 (Audit inspection, role isolation, non-authority)
 * - docs/contracts/10-demo-contract.md §26, §76 (Audit demonstration & evidence)
 * - Invariants INV-003, INV-004 (Evaluation mark immutability)
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { createDatabase, type KyselyDb } from "../src/infrastructure/database/database.js";
import { runMigrations } from "../src/infrastructure/database/migrator.js";
import {
  KyselyAuditRepository,
  KyselyEvaluationRepository,
} from "../src/infrastructure/repositories/index.js";
import { AuditEvent, Evaluation } from "../src/domain/index.js";
import { createServer } from "../src/presentation/server.js";
import {
  UserRole,
  ActorType,
  AuditEventResponseSchema,
  PaginatedAuditEventsResponseSchema,
  ApiErrorResponseSchema,
} from "@osm/shared";

describe("TASK-P6-AUDIT-002: Audit Inspection HTTP Endpoints", () => {
  let db: KyselyDb;
  let auditRepo: KyselyAuditRepository;
  let evalRepo: KyselyEvaluationRepository;
  let server: FastifyInstance;

  beforeEach(async () => {
    db = createDatabase(":memory:");
    await runMigrations(db);

    auditRepo = new KyselyAuditRepository(db);
    evalRepo = new KyselyEvaluationRepository(db);

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
    await server.close();
    await db.destroy();
  });

  async function seedAuditEvents() {
    const events = [
      AuditEvent.create({
        id: "audit_evt_001",
        eventType: "EvaluationCreated",
        actorType: "USER",
        actorId: "evaluator_1",
        entityType: "Evaluation",
        entityId: "eval_101",
        action: "CREATE_EVALUATION",
        details: { evaluationCycleId: "cycle_1", scriptId: "scr_1" },
        occurredAt: "2026-09-27T08:00:00.000Z",
      }),
      AuditEvent.create({
        id: "audit_evt_002",
        eventType: "MarkAssigned",
        actorType: "USER",
        actorId: "evaluator_1",
        entityType: "Evaluation",
        entityId: "eval_101",
        action: "ASSIGN_MARK",
        details: { questionId: "q_1", awardedMarks: 10 },
        occurredAt: "2026-09-27T08:15:00.000Z",
      }),
      AuditEvent.create({
        id: "audit_evt_003",
        eventType: "EvaluationSubmitted",
        actorType: "USER",
        actorId: "evaluator_1",
        entityType: "Evaluation",
        entityId: "eval_101",
        action: "SUBMIT_EVALUATION",
        details: { totalScore: 10, isComplete: true },
        occurredAt: "2026-09-27T08:30:00.000Z",
      }),
      AuditEvent.create({
        id: "audit_evt_004",
        eventType: "TriageCaseCreated",
        actorType: "USER",
        actorId: "mod_lead",
        entityType: "TriageCase",
        entityId: "case_201",
        action: "CREATE_TRIAGE_CASE",
        details: { priority: "HIGH", caseNumber: "CASE-2026-0001" },
        occurredAt: "2026-09-27T09:00:00.000Z",
      }),
      AuditEvent.create({
        id: "audit_evt_005",
        eventType: "TriageCaseAssigned",
        actorType: "USER",
        actorId: "mod_lead",
        entityType: "TriageCase",
        entityId: "case_201",
        action: "ASSIGN_TRIAGE_CASE",
        details: { assigneeId: "mod_reviewer" },
        occurredAt: "2026-09-27T09:15:00.000Z",
      }),
      AuditEvent.create({
        id: "audit_evt_006",
        eventType: "TriageCaseResolved",
        actorType: "USER",
        actorId: "mod_reviewer",
        entityType: "TriageCase",
        entityId: "case_201",
        action: "RESOLVE_TRIAGE_CASE",
        details: { outcome: "CONFIRMED_VALID", reason: "Standard variation" },
        occurredAt: "2026-09-27T09:30:00.000Z",
      }),
    ];

    for (const evt of events) {
      await auditRepo.record(evt);
    }
    return events;
  }

  describe("1. List Audit Events (GET /api/v1/audit-events)", () => {
    it("returns 200 with paginated audit events and metadata", async () => {
      await seedAuditEvents();

      const res = await server.inject({
        method: "GET",
        url: "/api/v1/audit-events",
        headers: {
          "x-user-role": UserRole.MODERATOR,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.total).toBe(6);
      expect(body.page).toBe(1);
      expect(body.pageSize).toBe(50);
      expect(Array.isArray(body.items)).toBe(true);
      expect(body.items.length).toBe(6);

      // Verify schema conformance
      const parseResult = PaginatedAuditEventsResponseSchema.safeParse(body);
      expect(parseResult.success).toBe(true);
    });

    it("conforms strictly to AuditEventResponse DTO shape (06-api §69)", async () => {
      await seedAuditEvents();

      const res = await server.inject({
        method: "GET",
        url: "/api/v1/audit-events",
        headers: {
          "x-user-role": UserRole.ADMIN,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      const first = body.items[0];

      // Verifies nested actor and resource representations
      expect(first.actor).toBeDefined();
      expect(typeof first.actor.type).toBe("string");
      expect(typeof first.actor.id).toBe("string");
      expect(first.resource).toBeDefined();
      expect(typeof first.resource.type).toBe("string");
      expect(typeof first.resource.id).toBe("string");

      // Verifies flat representations for client convenience
      expect(first.actorType).toBe(first.actor.type);
      expect(first.actorId).toBe(first.actor.id);
      expect(first.entityType).toBe(first.resource.type);
      expect(first.entityId).toBe(first.resource.id);

      // Verifies action and details
      expect(typeof first.action).toBe("string");
      expect(typeof first.details).toBe("object");
      expect(typeof first.occurredAt).toBe("string");
    });
  });

  describe("2. Single Audit Event Retrieval (GET /api/v1/audit-events/:eventId)", () => {
    it("returns 200 with the requested audit event", async () => {
      await seedAuditEvents();

      const res = await server.inject({
        method: "GET",
        url: "/api/v1/audit-events/audit_evt_004",
        headers: {
          "x-user-role": UserRole.MODERATOR,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.id).toBe("audit_evt_004");
      expect(body.eventType).toBe("TriageCaseCreated");
      expect(body.action).toBe("CREATE_TRIAGE_CASE");
      expect(body.entityType).toBe("TriageCase");
      expect(body.entityId).toBe("case_201");
      expect(body.details.priority).toBe("HIGH");

      const parsed = AuditEventResponseSchema.safeParse(body);
      expect(parsed.success).toBe(true);
    });

    it("returns 404 for unknown audit event ID", async () => {
      const res = await server.inject({
        method: "GET",
        url: "/api/v1/audit-events/unknown_audit_999",
        headers: {
          "x-user-role": UserRole.MODERATOR,
        },
      });

      expect(res.statusCode).toBe(404);
      const body = res.json();
      expect(body.statusCode).toBe(404);
      expect(body.error).toBe("EntityNotFoundError");

      const parsed = ApiErrorResponseSchema.safeParse(body);
      expect(parsed.success).toBe(true);
    });
  });

  describe("3. Filtering Capabilities", () => {
    it("filters correctly by entityType", async () => {
      await seedAuditEvents();

      const res = await server.inject({
        method: "GET",
        url: "/api/v1/audit-events?entityType=TriageCase",
        headers: { "x-user-role": UserRole.MODERATOR },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.total).toBe(3);
      for (const item of body.items) {
        expect(item.entityType).toBe("TriageCase");
      }
    });

    it("filters correctly by entityId", async () => {
      await seedAuditEvents();

      const res = await server.inject({
        method: "GET",
        url: "/api/v1/audit-events?entityId=eval_101",
        headers: { "x-user-role": UserRole.MODERATOR },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.total).toBe(3);
      for (const item of body.items) {
        expect(item.entityId).toBe("eval_101");
      }
    });

    it("filters correctly by actorId", async () => {
      await seedAuditEvents();

      const res = await server.inject({
        method: "GET",
        url: "/api/v1/audit-events?actorId=mod_lead",
        headers: { "x-user-role": UserRole.MODERATOR },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.total).toBe(2);
      for (const item of body.items) {
        expect(item.actorId).toBe("mod_lead");
      }
    });

    it("filters correctly by actorType", async () => {
      await seedAuditEvents();

      const res = await server.inject({
        method: "GET",
        url: "/api/v1/audit-events?actorType=USER",
        headers: { "x-user-role": UserRole.MODERATOR },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.total).toBe(6);
    });

    it("filters correctly by action and eventType", async () => {
      await seedAuditEvents();

      const res = await server.inject({
        method: "GET",
        url: "/api/v1/audit-events?action=SUBMIT_EVALUATION&eventType=EvaluationSubmitted",
        headers: { "x-user-role": UserRole.MODERATOR },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.total).toBe(1);
      expect(body.items[0].id).toBe("audit_evt_003");
    });
  });

  describe("4. Pagination & Ordering", () => {
    it("paginates with page and pageSize correctly", async () => {
      await seedAuditEvents();

      // Page 1 with pageSize 2 (descending)
      const p1Res = await server.inject({
        method: "GET",
        url: "/api/v1/audit-events?page=1&pageSize=2",
        headers: { "x-user-role": UserRole.MODERATOR },
      });

      expect(p1Res.statusCode).toBe(200);
      const p1 = p1Res.json();
      expect(p1.total).toBe(6);
      expect(p1.page).toBe(1);
      expect(p1.pageSize).toBe(2);
      expect(p1.items.length).toBe(2);
      expect(p1.items[0].id).toBe("audit_evt_006");
      expect(p1.items[1].id).toBe("audit_evt_005");

      // Page 2 with pageSize 2
      const p2Res = await server.inject({
        method: "GET",
        url: "/api/v1/audit-events?page=2&pageSize=2",
        headers: { "x-user-role": UserRole.MODERATOR },
      });

      expect(p2Res.statusCode).toBe(200);
      const p2 = p2Res.json();
      expect(p2.total).toBe(6);
      expect(p2.page).toBe(2);
      expect(p2.pageSize).toBe(2);
      expect(p2.items.length).toBe(2);
      expect(p2.items[0].id).toBe("audit_evt_004");
      expect(p2.items[1].id).toBe("audit_evt_003");
    });

    it("supports ascending and descending deterministic ordering", async () => {
      await seedAuditEvents();

      const descRes = await server.inject({
        method: "GET",
        url: "/api/v1/audit-events?sortOrder=desc",
        headers: { "x-user-role": UserRole.MODERATOR },
      });
      const descItems = descRes.json().items;
      expect(descItems[0].id).toBe("audit_evt_006");
      expect(descItems[descItems.length - 1].id).toBe("audit_evt_001");

      const ascRes = await server.inject({
        method: "GET",
        url: "/api/v1/audit-events?sortOrder=asc",
        headers: { "x-user-role": UserRole.MODERATOR },
      });
      const ascItems = ascRes.json().items;
      expect(ascItems[0].id).toBe("audit_evt_001");
      expect(ascItems[ascItems.length - 1].id).toBe("audit_evt_006");
    });

    it("guarantees 100% deterministic reproducibility across repeated queries", async () => {
      await seedAuditEvents();

      const runs = await Promise.all(
        Array.from({ length: 10 }).map(() =>
          server.inject({
            method: "GET",
            url: "/api/v1/audit-events?sortOrder=desc&pageSize=5",
            headers: { "x-user-role": UserRole.MODERATOR },
          })
        )
      );

      const firstIds = runs[0].json().items.map((i: { id: string }) => i.id);
      for (let i = 1; i < runs.length; i++) {
        const currentIds = runs[i].json().items.map((item: { id: string }) => item.id);
        expect(currentIds).toEqual(firstIds);
      }
    });
  });

  describe("5. Validation and Query Error Handling", () => {
    it("returns 400 Bad Request on invalid page number", async () => {
      const res = await server.inject({
        method: "GET",
        url: "/api/v1/audit-events?page=0",
        headers: { "x-user-role": UserRole.MODERATOR },
      });

      expect(res.statusCode).toBe(400);
      const body = res.json();
      expect(body.statusCode).toBe(400);
      expect(body.error).toBe("ValidationError");
    });

    it("returns 400 Bad Request on invalid pageSize", async () => {
      const res = await server.inject({
        method: "GET",
        url: "/api/v1/audit-events?pageSize=500",
        headers: { "x-user-role": UserRole.MODERATOR },
      });

      expect(res.statusCode).toBe(400);
      const body = res.json();
      expect(body.statusCode).toBe(400);
      expect(body.error).toBe("ValidationError");
    });

    it("returns 400 Bad Request on invalid sortOrder", async () => {
      const res = await server.inject({
        method: "GET",
        url: "/api/v1/audit-events?sortOrder=unordered",
        headers: { "x-user-role": UserRole.MODERATOR },
      });

      expect(res.statusCode).toBe(400);
      const body = res.json();
      expect(body.statusCode).toBe(400);
      expect(body.error).toBe("ValidationError");
    });
  });

  describe("6. Role-Based & Actor-Type Authorization", () => {
    it("allows MODERATOR role to inspect audit events", async () => {
      const res = await server.inject({
        method: "GET",
        url: "/api/v1/audit-events",
        headers: { "x-user-role": UserRole.MODERATOR },
      });
      expect(res.statusCode).toBe(200);
    });

    it("allows ADMIN role to inspect audit events", async () => {
      const res = await server.inject({
        method: "GET",
        url: "/api/v1/audit-events",
        headers: { "x-user-role": UserRole.ADMIN },
      });
      expect(res.statusCode).toBe(200);
    });

    it("rejects EXAMINER role with 403 Forbidden on list endpoint", async () => {
      const res = await server.inject({
        method: "GET",
        url: "/api/v1/audit-events",
        headers: { "x-user-role": UserRole.EXAMINER },
      });

      expect(res.statusCode).toBe(403);
      const body = res.json();
      expect(body.statusCode).toBe(403);
      expect(body.error).toBe("UnauthorizedActionError");
    });

    it("rejects EXAMINER role with 403 Forbidden on detail endpoint", async () => {
      await seedAuditEvents();

      const res = await server.inject({
        method: "GET",
        url: "/api/v1/audit-events/audit_evt_001",
        headers: { "x-user-role": UserRole.EXAMINER },
      });

      expect(res.statusCode).toBe(403);
      const body = res.json();
      expect(body.statusCode).toBe(403);
      expect(body.error).toBe("UnauthorizedActionError");
    });

    it("rejects unknown user role with 403 Forbidden", async () => {
      const res = await server.inject({
        method: "GET",
        url: "/api/v1/audit-events",
        headers: { "x-user-role": "STUDENT" },
      });

      expect(res.statusCode).toBe(403);
      const body = res.json();
      expect(body.statusCode).toBe(403);
      expect(body.error).toBe("UnauthorizedActionError");
    });

    it("rejects AI actor type with 403 Forbidden", async () => {
      const res = await server.inject({
        method: "GET",
        url: "/api/v1/audit-events",
        headers: {
          "x-actor-type": ActorType.AI,
          "x-user-role": UserRole.ADMIN,
        },
      });

      expect(res.statusCode).toBe(403);
      const body = res.json();
      expect(body.statusCode).toBe(403);
      expect(body.error).toBe("UnauthorizedActionError");
    });
  });

  describe("7. Read-Only Invariants & Immutability", () => {
    it("rejects mutation attempts (POST, PUT, DELETE) on audit-events resource", async () => {
      // POST /api/v1/audit-events
      const postRes = await server.inject({
        method: "POST",
        url: "/api/v1/audit-events",
        payload: { fake: "event" },
      });
      expect(postRes.statusCode).toBe(404);

      // PUT /api/v1/audit-events/audit_evt_001
      const putRes = await server.inject({
        method: "PUT",
        url: "/api/v1/audit-events/audit_evt_001",
        payload: { fake: "mutation" },
      });
      expect(putRes.statusCode).toBe(404);

      // DELETE /api/v1/audit-events/audit_evt_001
      const delRes = await server.inject({
        method: "DELETE",
        url: "/api/v1/audit-events/audit_evt_001",
      });
      expect(delRes.statusCode).toBe(404);
    });

    it("leaves authoritative evaluation marks, total scores, and statuses 100% unaltered (INV-003, INV-004)", async () => {
      // Seed evaluation with awarded mark
      const evalId = `eval_${randomUUID()}`;
      const q1Id = `q1_${randomUUID()}`;
      const evaluation = Evaluation.create({
        id: evalId,
        evaluationCycleId: "cycle_audit_inv",
        scriptId: `script_${randomUUID()}`,
        evaluatorId: "examiner_orig",
        rubricId: "rubric_1",
        rubricVersion: 1,
        questions: [{ id: q1Id, questionNumber: "1", text: "Q1", maxMarks: 20, rubricCriteriaId: null, orderIndex: 0 }],
      });
      evaluation.assignMark({
        questionId: q1Id,
        awardedMarks: 17,
        evaluatorId: "examiner_orig",
        comments: "Well done",
      });
      await evalRepo.save(evaluation);

      // Verify state before inspection
      const beforeEval = await evalRepo.findById(evalId);
      expect(beforeEval!.totalScore).toBe(17);
      expect(beforeEval!.status).toBe("IN_PROGRESS");

      // Seed and inspect audit events multiple times
      await seedAuditEvents();
      await server.inject({
        method: "GET",
        url: "/api/v1/audit-events",
        headers: { "x-user-role": UserRole.MODERATOR },
      });
      await server.inject({
        method: "GET",
        url: "/api/v1/audit-events/audit_evt_001",
        headers: { "x-user-role": UserRole.ADMIN },
      });

      // Verify state after inspection is 100% untouched
      const afterEval = await evalRepo.findById(evalId);
      expect(afterEval!.totalScore).toBe(17);
      expect(afterEval!.status).toBe("IN_PROGRESS");
      expect(afterEval!.getMark(q1Id)!.awardedMarks).toBe(17);
      expect(afterEval!.version).toBe(beforeEval!.version);
    });
  });
});
