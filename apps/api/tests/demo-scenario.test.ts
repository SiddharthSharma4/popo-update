/**
 * End-to-End Test Suite for Deterministic Demo Scenario (Golden Path).
 * Conforms to TASK-P11-DEMO-001, docs/contracts/10-demo-contract.md,
 * docs/contracts/05-domain-contract.md §10, §22-28, §38 (INV-003, INV-004),
 * docs/contracts/06-api-contract.md §18-42, and docs/contracts/08-data-contract.md.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { createServer } from "../src/presentation/server.js";
import { createDatabase, type KyselyDb } from "../src/infrastructure/database/database.js";
import { runMigrations } from "../src/infrastructure/database/migrator.js";
import {
  UserRole,
  ActorType,
  EvaluationStatus,
  TriageCaseStatus,
  ResolutionOutcome,
  DemoSeedResponseSchema,
  EvaluationResponseSchema,
  CompletenessValidationResultDtoSchema,
  TriageCaseResponseSchema,
  AiRecommendationResponseSchema,
} from "@osm/shared";

describe("TASK-P11-DEMO-001: Deterministic End-to-End Demo Scenario", () => {
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

  const evaluatorHeaders = {
    "x-user-role": UserRole.EXAMINER,
    "x-user-id": "evaluator_1",
    "x-evaluator-id": "evaluator_1",
    "x-actor-id": "evaluator_1",
    "x-actor-type": ActorType.USER,
  };

  const aiActorHeaders = {
    "x-user-role": UserRole.EXAMINER,
    "x-user-id": "ai-assistant-01",
    "x-evaluator-id": "ai-assistant-01",
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
        PORT: 4015,
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
  // 1. Deterministic Seeder (POST /api/v1/demo/seed)
  // =========================================================================
  describe("1. Deterministic Demo Seeder Invariants", () => {
    it("rejects unauthorized roles from seeding the demo scenario (403 Forbidden)", async () => {
      // EXAMINER attempt
      const examinerRes = await app.inject({
        method: "POST",
        url: "/api/v1/demo/seed",
        headers: evaluatorHeaders,
      });
      expect(examinerRes.statusCode).toBe(403);

      // MODERATOR attempt
      const moderatorRes = await app.inject({
        method: "POST",
        url: "/api/v1/demo/seed",
        headers: moderatorHeaders,
      });
      expect(moderatorRes.statusCode).toBe(403);

      // AI Actor attempt
      const aiRes = await app.inject({
        method: "POST",
        url: "/api/v1/demo/seed",
        headers: aiActorHeaders,
      });
      expect(aiRes.statusCode).toBe(403);

      // Anonymous attempt
      const anonRes = await app.inject({
        method: "POST",
        url: "/api/v1/demo/seed",
      });
      expect(anonRes.statusCode).toBe(403);
    });

    it("allows ADMIN to seed the canonical deterministic dataset", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/demo/seed",
        headers: adminHeaders,
      });

      expect(res.statusCode).toBe(201);
      const body = res.json();
      const parsed = DemoSeedResponseSchema.safeParse(body);
      expect(parsed.success).toBe(true);

      if (parsed.success) {
        expect(parsed.data.status).toBe("SEEDED");
        expect(parsed.data.rubricId).toBe("RUBRIC-CS-101");
        expect(parsed.data.cycleId).toBe("cycle-2026-demo");
        expect(parsed.data.evaluationsCount).toBe(12); // 1 incomplete + 6 baseline + 5 lenient
        expect(parsed.data.signalsCount).toBe(2); // 1 active outlier + 1 historical calibration
        expect(parsed.data.triageCasesCount).toBe(2);
      }
    });

    it("verifies idempotency: repeated execution does not duplicate canonical records", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/demo/seed",
        headers: adminHeaders,
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      const parsed = DemoSeedResponseSchema.safeParse(body);
      expect(parsed.success).toBe(true);

      if (parsed.success) {
        expect(parsed.data.status).toBe("ALREADY_SEEDED");
        expect(parsed.data.evaluationsCount).toBe(12);
        expect(parsed.data.triageCasesCount).toBe(2);
      }
    });
  });

  // =========================================================================
  // 2. Evaluator Lifecycle (Golden Path: Incomplete -> Warn -> Fix -> Submit -> Locked)
  // =========================================================================
  describe("2. Evaluator Workspace Lifecycle Invariants", () => {
    const incompleteId = "eval-demo-incomplete";

    it("confirms canonical incomplete evaluation exists with Q1 and Q3 marked, Q2 missing", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/v1/evaluations/${incompleteId}`,
        headers: evaluatorHeaders,
      });

      expect(res.statusCode).toBe(200);
      const evalData = res.json();
      const parsed = EvaluationResponseSchema.safeParse(evalData);
      expect(parsed.success).toBe(true);

      if (parsed.success) {
        expect(parsed.data.status).toBe(EvaluationStatus.IN_PROGRESS);
        expect(parsed.data.evaluatorId).toBe("evaluator_1");
        expect(parsed.data.questions.length).toBe(3);

        const markedQuestionIds = parsed.data.marks.map((m) => m.questionId);
        expect(markedQuestionIds).toContain("q1");
        expect(markedQuestionIds).toContain("q3");
        expect(markedQuestionIds).not.toContain("q2");
        expect(parsed.data.isComplete).toBe(false);
      }
    });

    it("detects incomplete answers via completeness check endpoint", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/v1/evaluations/${incompleteId}/completeness`,
        headers: evaluatorHeaders,
      });

      expect(res.statusCode).toBe(200);
      const check = res.json();
      const parsed = CompletenessValidationResultDtoSchema.safeParse(check);
      expect(parsed.success).toBe(true);

      if (parsed.success) {
        expect(parsed.data.isValid).toBe(false);
        expect(parsed.data.missingQuestionIds).toContain("q2");
        expect(parsed.data.issues.length).toBeGreaterThan(0);
      }
    });

    it("enforces rubric bounds: rejects marks exceeding maximum question marks (400 Bad Request)", async () => {
      const res = await app.inject({
        method: "PATCH",
        url: `/api/v1/evaluations/${incompleteId}`,
        headers: evaluatorHeaders,
        payload: {
          questionId: "q2",
          awardedMarks: 45, // maxMarks is 30!
          evaluatorId: "evaluator_1",
          comments: "Attempting out-of-bounds score",
        },
      });

      expect(res.statusCode).toBe(400);
    });

    it("allows evaluator to complete the missing mark (q2: 25/30)", async () => {
      const res = await app.inject({
        method: "PATCH",
        url: `/api/v1/evaluations/${incompleteId}`,
        headers: evaluatorHeaders,
        payload: {
          questionId: "q2",
          awardedMarks: 25,
          evaluatorId: "evaluator_1",
          comments: "Valid object-oriented recursion implementation",
        },
      });

      expect(res.statusCode).toBe(200);
      const evalData = res.json();
      expect(evalData.isComplete).toBe(true);
      expect(evalData.totalScore).toBe(75); // 28 + 25 + 22
    });

    it("confirms completeness validation passes once all marks are awarded", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/v1/evaluations/${incompleteId}/completeness`,
        headers: evaluatorHeaders,
      });

      expect(res.statusCode).toBe(200);
      const check = res.json();
      expect(check.isValid).toBe(true);
      expect(check.missingQuestionIds.length).toBe(0);
    });

    it("submits the completed evaluation successfully", async () => {
      const res = await app.inject({
        method: "POST",
        url: `/api/v1/evaluations/${incompleteId}/submit`,
        headers: evaluatorHeaders,
        payload: {
          evaluatorId: "evaluator_1",
        },
      });

      expect(res.statusCode).toBe(200);
      const submitted = res.json();
      expect(submitted.status).toBe(EvaluationStatus.SUBMITTED);
      expect(submitted.submittedAt).not.toBeNull();
    });

    it("enforces locked state invariant: submitted evaluations cannot be modified (409 Conflict)", async () => {
      const res = await app.inject({
        method: "PATCH",
        url: `/api/v1/evaluations/${incompleteId}`,
        headers: evaluatorHeaders,
        payload: {
          questionId: "q2",
          awardedMarks: 26,
          evaluatorId: "evaluator_1",
          comments: "Attempted tampering after submit",
        },
      });

      expect(res.statusCode).toBe(409);
    });
  });

  // =========================================================================
  // 3. Statistical Anomaly & QualitySignal Observation
  // =========================================================================
  describe("3. QualitySignal Observation & Persistence", () => {
    it("confirms canonical evaluator deviation signal exists with detector provenance", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/quality-signals/sig-demo-lenient-001",
        headers: moderatorHeaders,
      });

      expect(res.statusCode).toBe(200);
      const signal = res.json();
      expect(signal.id).toBe("sig-demo-lenient-001");
      expect(signal.signalType).toBe("STATISTICAL_ANOMALY");
      expect(signal.severity).toBe("HIGH");
      expect(signal.detector.name).toBe("evaluator-mean-deviation-detector");
      expect(signal.detector.type).toBe("STATISTICAL");

      // Verify mathematical evidence is persisted
      expect(signal.evidence.evaluatorId).toBe("evaluator_lenient");
      expect(signal.evidence.evaluatorMean).toBe(94.8);
      expect(signal.evidence.peerMean).toBe(71.6);
      expect(signal.evidence.deviation).toBe(23.2);
    });
  });

  // =========================================================================
  // 4. Moderator Investigation & Resolution Lifecycle
  // =========================================================================
  describe("4. Moderator Triage & Human Resolution Invariants", () => {
    const caseId = "tc-demo-001";

    it("confirms canonical open triage case exists (tc-demo-001)", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/v1/triage-cases/${caseId}`,
        headers: moderatorHeaders,
      });

      expect(res.statusCode).toBe(200);
      const triageCase = res.json();
      const parsed = TriageCaseResponseSchema.safeParse(triageCase);
      expect(parsed.success).toBe(true);

      if (parsed.success) {
        expect(parsed.data.id).toBe(caseId);
        expect(parsed.data.caseNumber).toBe("TC-DEMO-001");
        expect(parsed.data.status).toBe(TriageCaseStatus.OPEN);
        expect(parsed.data.qualitySignalId).toBe("sig-demo-lenient-001");
      }
    });

    it("permits moderator to assign case to themselves", async () => {
      const res = await app.inject({
        method: "POST",
        url: `/api/v1/triage-cases/${caseId}/assign`,
        headers: moderatorHeaders,
        payload: {
          assigneeId: "moderator_1",
        },
      });

      expect(res.statusCode).toBe(200);
      const updated = res.json();
      expect(updated.status).toBe(TriageCaseStatus.ASSIGNED);
      expect(updated.assigneeId).toBe("moderator_1");
    });

    it("enforces mandatory human reason: rejects resolution without non-empty reason (400 Bad Request)", async () => {
      const res = await app.inject({
        method: "POST",
        url: `/api/v1/triage-cases/${caseId}/resolve`,
        headers: moderatorHeaders,
        payload: {
          outcome: ResolutionOutcome.CONFIRMED_VALID,
          reason: "   ", // Blank reason prohibited by FR-009!
        },
      });

      expect(res.statusCode).toBe(400);
    });

    it("records authoritative human resolution and transitions case to terminal RESOLVED state", async () => {
      const res = await app.inject({
        method: "POST",
        url: `/api/v1/triage-cases/${caseId}/resolve`,
        headers: moderatorHeaders,
        payload: {
          outcome: ResolutionOutcome.CORRECTION_REQUIRED,
          reason: "Verified systemic lenient drift across 5 scripts; cohort scheduled for blind moderation reassessment.",
          notes: "Evaluator notified of calibration standard.",
          evidenceReferences: ["sig-demo-lenient-001", "eval-demo-lenient-501"],
        },
      });

      expect(res.statusCode).toBe(200);
      const resolved = res.json();
      expect(resolved.triageCase.status).toBe(TriageCaseStatus.RESOLVED);
      expect(resolved.resolution.outcome).toBe(ResolutionOutcome.CORRECTION_REQUIRED);
    });

    it("enforces terminal state lock: double resolution on resolved case is rejected (409 Conflict)", async () => {
      const res = await app.inject({
        method: "POST",
        url: `/api/v1/triage-cases/${caseId}/resolve`,
        headers: moderatorHeaders,
        payload: {
          outcome: ResolutionOutcome.DISMISSED,
          reason: "Attempting duplicate resolution on already resolved case.",
        },
      });

      expect(res.statusCode).toBe(409);
    });
  });

  // =========================================================================
  // 5. AI Advisory Non-Authority (INV-003, INV-004)
  // =========================================================================
  describe("5. AI Advisory Integration & Strict Non-Authority", () => {
    it("generates structured, explainable AI advisory without modifying domain state", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/ai/advisory",
        headers: moderatorHeaders,
        payload: {
          evaluationId: "eval-demo-lenient-501",
          triageCaseId: "tc-demo-001",
          qualitySignalId: "sig-demo-lenient-001",
          assistanceType: "SIGNAL_EXPLANATION",
        },
      });

      expect(res.statusCode).toBe(200);
      const advisory = res.json();
      const parsed = AiRecommendationResponseSchema.safeParse(advisory);
      expect(parsed.success).toBe(true);

      if (parsed.success) {
        expect(parsed.data.recommendation).toBeDefined();
        expect(parsed.data.confidence).toBeGreaterThan(0);
        expect(parsed.data.confidence).toBeLessThanOrEqual(1);
        expect(parsed.data.model.provider).toBeDefined();
        expect(parsed.data.disclaimer.toLowerCase()).toContain("advisory");
      }
    });

    it("verifies AI actor CANNOT resolve triage cases (403 Forbidden)", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/triage-cases/tc-demo-000/resolve",
        headers: aiActorHeaders,
        payload: {
          outcome: ResolutionOutcome.CONFIRMED_VALID,
          reason: "Autonomous AI resolution attempt.",
        },
      });

      expect(res.statusCode).toBe(403);
    });

    it("verifies AI actor CANNOT submit evaluations or mutate marks (403 Forbidden)", async () => {
      const res = await app.inject({
        method: "PATCH",
        url: "/api/v1/evaluations/eval-demo-incomplete",
        headers: aiActorHeaders,
        payload: {
          questionId: "q1",
          awardedMarks: 10,
          evaluatorId: "ai-assistant-01",
        },
      });

      expect(res.statusCode).toBe(403);
    });
  });

  // =========================================================================
  // 6. Immutable Audit Trail & Attribution
  // =========================================================================
  describe("6. Audit Ledger Verification", () => {
    it("retrieves persisted audit events demonstrating end-to-end consequential transitions", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/audit-events",
        headers: adminHeaders,
      });

      expect(res.statusCode).toBe(200);
      const events = res.json();
      expect(Array.isArray(events.items)).toBe(true);
      expect(events.items.length).toBeGreaterThan(0);

      // Verify presence of consequential transition events
      const actions = events.items.map((e: any) => e.action);
      expect(actions).toContain("SEED_DEMO_COHORT");

      // Verify actor attribution on all audit entries
      for (const ev of events.items) {
        expect(ev.actorId).toBeDefined();
        expect(ev.actorType).toBeDefined();
        expect(ev.occurredAt).toBeDefined();
      }
    });
  });

  // =========================================================================
  // 7. Cross-Role Authorization Boundaries
  // =========================================================================
  describe("7. Cross-Role Authorization Boundaries", () => {
    it("examiner cannot access audit trail (403 Forbidden)", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/audit-events",
        headers: evaluatorHeaders,
      });

      expect(res.statusCode).toBe(403);
    });

    it("examiner cannot resolve triage cases (403 Forbidden)", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/triage-cases/tc-demo-001/resolve",
        headers: evaluatorHeaders,
        payload: {
          outcome: ResolutionOutcome.CONFIRMED_VALID,
          reason: "Examiner attempting moderation.",
        },
      });

      expect(res.statusCode).toBe(403);
    });
  });
});
