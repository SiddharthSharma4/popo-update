/**
 * Audit Ledger Instrumentation Test Suite (Phase 2).
 * Verifies that AI Advisory generation and Sentinel anomaly detection
 * record immutable, non-authoritative audit events in the canonical audit ledger.
 *
 * Conforms to:
 * - docs/contracts/02-architecture-contract.md §37-38 (Audit module & boundaries)
 * - docs/contracts/05-domain-contract.md §29-31, INV-003, INV-004, INV-005 (Audit authority, immutability, non-authority)
 * - docs/contracts/06-api-contract.md §35, §37-40 (AI Advisory & Audit endpoints)
 * - docs/contracts/08-data-contract.md §24-27 (AuditEvent persistence & integrity)
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { createDatabase, type KyselyDb } from "../src/infrastructure/database/database.js";
import { runMigrations } from "../src/infrastructure/database/migrator.js";
import {
  KyselyEvaluationRepository,
  KyselyRubricRepository,
  KyselyQualitySignalRepository,
  KyselyTriageCaseRepository,
  KyselyResolutionRepository,
  KyselyAuditRepository,
} from "../src/infrastructure/repositories/index.js";
import { KyselyUnitOfWork } from "../src/infrastructure/persistence/index.js";
import {
  CreateEvaluationHandler,
  AssignMarkHandler,
  CreateRubricHandler,
} from "../src/application/index.js";
import {
  QualityAnalyticsService,
  QualityPulseService,
} from "../src/application/analytics/index.js";
import { AiService } from "../src/application/ai/ai-service.js";
import { AiContextBuilder } from "../src/application/ai/ai-context-builder.js";
import { DeterministicMockAiProvider } from "../src/infrastructure/ai/mock-ai-provider.js";
import { createServer } from "../src/presentation/server.js";
import {
  UserRole,
  ActorType,
  AiAssistanceType,
  type AuditEventResponse,
  type PaginatedAuditEventsResponse,
} from "@osm/shared";

describe("Phase 2: Audit Ledger Instrumentation (AI Advisory & Sentinel)", () => {
  let db: KyselyDb;
  let evalRepo: KyselyEvaluationRepository;
  let rubricRepo: KyselyRubricRepository;
  let signalRepo: KyselyQualitySignalRepository;
  let triageRepo: KyselyTriageCaseRepository;
  let resolutionRepo: KyselyResolutionRepository;
  let auditRepo: KyselyAuditRepository;
  let unitOfWork: KyselyUnitOfWork;
  let analyticsService: QualityAnalyticsService;
  let qualityPulseService: QualityPulseService;
  let aiService: AiService;
  let server: FastifyInstance;

  beforeEach(async () => {
    db = createDatabase(":memory:");
    await runMigrations(db);

    evalRepo = new KyselyEvaluationRepository(db);
    rubricRepo = new KyselyRubricRepository(db);
    signalRepo = new KyselyQualitySignalRepository(db);
    triageRepo = new KyselyTriageCaseRepository(db);
    resolutionRepo = new KyselyResolutionRepository(db);
    auditRepo = new KyselyAuditRepository(db);
    unitOfWork = new KyselyUnitOfWork(db);

    analyticsService = new QualityAnalyticsService(
      evalRepo,
      signalRepo,
      triageRepo,
      resolutionRepo
    );

    qualityPulseService = new QualityPulseService(
      evalRepo,
      signalRepo,
      triageRepo,
      resolutionRepo,
      analyticsService
    );

    aiService = new AiService(
      new AiContextBuilder(evalRepo, rubricRepo, signalRepo, triageRepo),
      new DeterministicMockAiProvider()
    );

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
      analyticsService,
      qualityPulseService,
      aiService,
    });

    await server.ready();
  });

  afterEach(async () => {
    await server.close();
    await db.destroy();
  });

  /**
   * Helper to seed a valid Rubric and Evaluation in the database.
   */
  async function seedRubricAndEvaluation(evaluatorId = "evaluator_1", score = 20, cycleId = "cycle-2026-demo") {
    const rubricHandler = new CreateRubricHandler(unitOfWork);
    const evalHandler = new CreateEvaluationHandler(unitOfWork);
    const assignMarkHandler = new AssignMarkHandler(unitOfWork);

    const rubricId = `RUBRIC-${randomUUID()}`;
    const crit1Id = `crit-${randomUUID()}`;

    await rubricHandler.execute({
      id: rubricId,
      title: "Computer Science Examination Rubric",
      version: 1,
      criteria: [
        {
          id: crit1Id,
          title: "Algorithm Complexity",
          maxMarks: 25,
          description: "Big-O runtime analysis and correctness",
          levels: [
            { title: "Exemplary", marks: 25, description: "Flawless asymptotic derivation" },
            { title: "Proficient", marks: 18, description: "Minor algebraic oversight" },
          ],
        },
      ],
    });

    const evalId = `eval-${randomUUID()}`;
    const q1Id = `q-${randomUUID()}`;

    const evalResult = await evalHandler.execute({
      id: evalId,
      evaluationCycleId: cycleId,
      scriptId: `script-${randomUUID()}`,
      rubricId,
      rubricVersion: 1,
      evaluatorId,
      questions: [
        {
          id: q1Id,
          questionNumber: "1(a)",
          text: "Explain Big-O asymptotic analysis.",
          maxMarks: 25,
          rubricCriteriaId: crit1Id,
          orderIndex: 0,
        },
      ],
    });

    await assignMarkHandler.execute({
      evaluationId: evalResult.id,
      evaluatorId,
      questionId: q1Id,
      criterionId: crit1Id,
      awardedMarks: score,
      feedback: "Accurate asymptotic analysis",
      isUncertain: false,
    });

    return { rubricId, evaluationId: evalResult.id };
  }

  // =========================================================================
  // 1. AI Advisory Audit Ledger Instrumentation
  // =========================================================================
  describe("1. AI Advisory Audit Trail", () => {
    it("successfully records exactly one GENERATE_AI_ADVISORY audit event upon advisory generation", async () => {
      const { evaluationId } = await seedRubricAndEvaluation("evaluator_jenkin", 22);

      const beforeEvents = await auditRepo.findAll();
      const aiEventsBefore = beforeEvents.filter((e) => e.action === "GENERATE_AI_ADVISORY");
      expect(aiEventsBefore.length).toBe(0);

      const response = await server.inject({
        method: "POST",
        url: "/api/v1/ai/advisory",
        headers: {
          "x-actor-type": ActorType.USER,
          "x-user-role": UserRole.MODERATOR,
          "x-actor-id": "mod_sarah_jenkins",
        },
        payload: {
          evaluationId,
          assistanceType: AiAssistanceType.EVALUATION_SUMMARY,
        },
      });

      expect(response.statusCode).toBe(200);
      const advisory = response.json();
      expect(advisory.recommendation).toBeDefined();
      expect(advisory.status).toBe("SUCCESS");

      // Verify audit event persisted in the canonical audit ledger
      const afterEvents = await auditRepo.findAll();
      const aiEventsAfter = afterEvents.filter((e) => e.action === "GENERATE_AI_ADVISORY");
      expect(aiEventsAfter.length).toBe(1);

      const event = aiEventsAfter[0];
      expect(event.eventType).toBe("AiAdvisoryGenerated");
      expect(event.actorType).toBe("USER");
      expect(event.actorId).toBe("mod_sarah_jenkins");
      expect(event.entityType).toBe("Evaluation");
      expect(event.entityId).toBe(evaluationId);
      expect(event.action).toBe("GENERATE_AI_ADVISORY");
      expect(event.occurredAt).toBeDefined();

      // Verify details metadata
      expect(event.details.evaluationId).toBe(evaluationId);
      expect(event.details.assistanceType).toBe(AiAssistanceType.EVALUATION_SUMMARY);
      expect(event.details.advisoryId).toBe(advisory.id);
      expect(event.details.provider).toBe(advisory.model.provider);
      expect(event.details.model).toBe(advisory.model.model);
      expect(event.details.confidence).toBe(advisory.confidence);
      expect(event.details.status).toBe("SUCCESS");

      // Verify AI text is NOT stored in audit details (preserves privacy & storage invariants)
      expect(event.details.recommendation).toBeUndefined();
    });

    it("verifies AI advisory output remains non-authoritative: marks and version are untouched", async () => {
      const { evaluationId } = await seedRubricAndEvaluation("evaluator_jenkin", 22);

      const evalBefore = await evalRepo.findById(evaluationId);
      expect(evalBefore).not.toBeNull();
      const scoreBefore = evalBefore!.totalScore;
      const versionBefore = evalBefore!.version;

      await server.inject({
        method: "POST",
        url: "/api/v1/ai/advisory",
        headers: {
          "x-actor-type": ActorType.USER,
          "x-user-role": UserRole.MODERATOR,
          "x-actor-id": "mod_sarah",
        },
        payload: {
          evaluationId,
          assistanceType: AiAssistanceType.RUBRIC_ADVISORY,
        },
      });

      const evalAfter = await evalRepo.findById(evaluationId);
      expect(evalAfter).not.toBeNull();
      expect(evalAfter!.totalScore).toBe(scoreBefore);
      expect(evalAfter!.version).toBe(versionBefore);
    });

    it("does NOT record an audit event if AI advisory generation fails authorization (403)", async () => {
      const { evaluationId } = await seedRubricAndEvaluation();

      // EXAMINER role is forbidden
      const resExaminer = await server.inject({
        method: "POST",
        url: "/api/v1/ai/advisory",
        headers: {
          "x-actor-type": ActorType.USER,
          "x-user-role": UserRole.EXAMINER,
          "x-actor-id": "examiner_1",
        },
        payload: {
          evaluationId,
          assistanceType: AiAssistanceType.EVALUATION_SUMMARY,
        },
      });

      expect(resExaminer.statusCode).toBe(403);

      // AI actor is forbidden
      const resAi = await server.inject({
        method: "POST",
        url: "/api/v1/ai/advisory",
        headers: {
          "x-actor-type": ActorType.AI,
          "x-user-role": UserRole.MODERATOR,
          "x-actor-id": "ai_agent_1",
        },
        payload: {
          evaluationId,
          assistanceType: AiAssistanceType.EVALUATION_SUMMARY,
        },
      });

      expect(resAi.statusCode).toBe(403);

      const events = await auditRepo.findAll();
      const aiEvents = events.filter((e) => e.action === "GENERATE_AI_ADVISORY");
      expect(aiEvents.length).toBe(0);
    });

    it("does NOT record an audit event if validation fails (400)", async () => {
      const res = await server.inject({
        method: "POST",
        url: "/api/v1/ai/advisory",
        headers: {
          "x-actor-type": ActorType.USER,
          "x-user-role": UserRole.MODERATOR,
          "x-actor-id": "mod_1",
        },
        payload: {
          // missing evaluationId and assistanceType
        },
      });

      expect(res.statusCode).toBe(400);

      const events = await auditRepo.findAll();
      const aiEvents = events.filter((e) => e.action === "GENERATE_AI_ADVISORY");
      expect(aiEvents.length).toBe(0);
    });
  });

  // =========================================================================
  // 2. Sentinel Trigger Audit Ledger Instrumentation
  // =========================================================================
  describe("2. Sentinel Trigger Audit Trail", () => {
    it("successfully records exactly one TRIGGER_SENTINEL audit event upon Sentinel trigger", async () => {
      const cycleId = "cycle_audit_test_001";

      // Seed 5 evaluations with one deviant evaluator
      for (let i = 0; i < 4; i++) {
        await seedRubricAndEvaluation(`normal_evaluator_${i}`, 20, cycleId);
      }
      await seedRubricAndEvaluation("deviant_evaluator", 5, cycleId);

      const beforeEvents = await auditRepo.findAll();
      const sentinelEventsBefore = beforeEvents.filter((e) => e.action === "TRIGGER_SENTINEL");
      expect(sentinelEventsBefore.length).toBe(0);

      const response = await server.inject({
        method: "POST",
        url: "/api/v1/analytics/quality-pulse/trigger-sentinel",
        headers: {
          "x-actor-type": ActorType.USER,
          "x-user-role": UserRole.ADMIN,
          "x-actor-id": "admin_marcus_vance",
        },
        payload: {
          evaluationCycleId: cycleId,
          minSampleSize: 1,
        },
      });

      expect(response.statusCode).toBe(200);
      const result = response.json();
      expect(result.evaluatorsAnalyzed).toBeGreaterThanOrEqual(1);

      // Verify audit event in ledger
      const afterEvents = await auditRepo.findAll();
      const sentinelEventsAfter = afterEvents.filter((e) => e.action === "TRIGGER_SENTINEL");
      expect(sentinelEventsAfter.length).toBe(1);

      const event = sentinelEventsAfter[0];
      expect(event.eventType).toBe("SentinelScanRun");
      expect(event.actorType).toBe("USER");
      expect(event.actorId).toBe("admin_marcus_vance");
      expect(event.entityType).toBe("EvaluationCycle");
      expect(event.entityId).toBe(cycleId);
      expect(event.action).toBe("TRIGGER_SENTINEL");
      expect(event.occurredAt).toBeDefined();

      // Verify details metadata
      expect(event.details.evaluationCycleId).toBe(cycleId);
      expect(event.details.evaluatorsAnalyzed).toBe(result.evaluatorsAnalyzed);
      expect(event.details.anomaliesDetected).toBe(result.anomaliesDetected);
      expect(event.details.newSignalsGenerated).toBe(result.newSignalsGenerated);
      expect(Array.isArray(event.details.signalIds)).toBe(true);
    });

    it("supports route alias /api/v1/analytics/sentinel/trigger and records audit event", async () => {
      const cycleId = "cycle_alias_test_002";

      const response = await server.inject({
        method: "POST",
        url: "/api/v1/analytics/sentinel/trigger",
        headers: {
          "x-actor-type": ActorType.USER,
          "x-user-role": UserRole.MODERATOR,
          "x-actor-id": "mod_adrian_foster",
        },
        payload: {
          evaluationCycleId: cycleId,
          minSampleSize: 1,
        },
      });

      expect(response.statusCode).toBe(200);

      const afterEvents = await auditRepo.findAll();
      const sentinelEvents = afterEvents.filter((e) => e.action === "TRIGGER_SENTINEL");
      expect(sentinelEvents.length).toBe(1);
      expect(sentinelEvents[0].actorId).toBe("mod_adrian_foster");
      expect(sentinelEvents[0].entityId).toBe(cycleId);
    });

    it("does NOT record an audit event if Sentinel trigger fails authorization (403)", async () => {
      const resExaminer = await server.inject({
        method: "POST",
        url: "/api/v1/analytics/quality-pulse/trigger-sentinel",
        headers: {
          "x-actor-type": ActorType.USER,
          "x-user-role": UserRole.EXAMINER,
          "x-actor-id": "examiner_unauthorized",
        },
        payload: {},
      });

      expect(resExaminer.statusCode).toBe(403);

      const resAi = await server.inject({
        method: "POST",
        url: "/api/v1/analytics/quality-pulse/trigger-sentinel",
        headers: {
          "x-actor-type": ActorType.AI,
          "x-user-role": UserRole.ADMIN,
          "x-actor-id": "ai_trigger",
        },
        payload: {},
      });

      expect(resAi.statusCode).toBe(403);

      const events = await auditRepo.findAll();
      const sentinelEvents = events.filter((e) => e.action === "TRIGGER_SENTINEL");
      expect(sentinelEvents.length).toBe(0);
    });
  });

  // =========================================================================
  // 3. TrustLens Audit Query Integration
  // =========================================================================
  describe("3. Audit Query & TrustLens Inspection Integration", () => {
    it("allows moderators to query both GENERATE_AI_ADVISORY and TRIGGER_SENTINEL via GET /api/v1/audit-events", async () => {
      const { evaluationId } = await seedRubricAndEvaluation("evaluator_x", 19);

      // Trigger AI Advisory
      await server.inject({
        method: "POST",
        url: "/api/v1/ai/advisory",
        headers: {
          "x-actor-type": ActorType.USER,
          "x-user-role": UserRole.MODERATOR,
          "x-actor-id": "mod_query_test",
        },
        payload: {
          evaluationId,
          assistanceType: AiAssistanceType.SIGNAL_EXPLANATION,
        },
      });

      // Trigger Sentinel
      await server.inject({
        method: "POST",
        url: "/api/v1/analytics/quality-pulse/trigger-sentinel",
        headers: {
          "x-actor-type": ActorType.USER,
          "x-user-role": UserRole.ADMIN,
          "x-actor-id": "admin_query_test",
        },
        payload: {
          evaluationCycleId: "cycle_query_test",
          minSampleSize: 1,
        },
      });

      // Query AI advisory audit events
      const resAi = await server.inject({
        method: "GET",
        url: "/api/v1/audit-events?action=GENERATE_AI_ADVISORY",
        headers: {
          "x-user-role": UserRole.MODERATOR,
        },
      });

      expect(resAi.statusCode).toBe(200);
      const aiData: PaginatedAuditEventsResponse = resAi.json();
      expect(aiData.items.length).toBe(1);
      expect(aiData.items[0].action).toBe("GENERATE_AI_ADVISORY");
      expect(aiData.items[0].actorId).toBe("mod_query_test");

      // Query Sentinel audit events
      const resSentinel = await server.inject({
        method: "GET",
        url: "/api/v1/audit-events?action=TRIGGER_SENTINEL",
        headers: {
          "x-user-role": UserRole.MODERATOR,
        },
      });

      expect(resSentinel.statusCode).toBe(200);
      const sentinelData: PaginatedAuditEventsResponse = resSentinel.json();
      expect(sentinelData.items.length).toBe(1);
      expect(sentinelData.items[0].action).toBe("TRIGGER_SENTINEL");
      expect(sentinelData.items[0].actorId).toBe("admin_query_test");
    });
  });
});
