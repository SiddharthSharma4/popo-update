/**
 * OSM Integration Boundary Verification Test Suite (TASK-P9-INTEGRATION-001).
 *
 * Conforms to:
 * - docs/planning/03-build-roadmap.md §16 (Phase 9 — OSM Integration)
 * - docs/planning/04-task-board.md (TASK-P9-INTEGRATION-001)
 * - docs/contracts/02-architecture-contract.md §50-52 (External OSM Integration)
 * - docs/contracts/05-domain-contract.md §18, §38 (Actor model, INV-003, INV-004)
 * - docs/contracts/06-api-contract.md §54-56 (Integration boundary, authority)
 * - docs/contracts/08-data-contract.md §37-40, §108-111 (Idempotency, Normalization)
 * - docs/contracts/09-testing-contract.md §40, §51-52 (External integration & failure testing)
 *
 * Invariants Verified:
 * 1. Anti-corruption boundary: external payloads normalized into domain entities; unapproved PII stripped.
 * 2. Idempotency: sequential duplicate ingestion returns cached replay; conflicting payload on same key returns 409 Conflict.
 * 3. Concurrency protection: parallel ingestion on identical key creates only 1 evaluation; loser safely replays.
 * 4. Failure handling: unknown rubric or invalid marks roll back transaction completely; zero orphan records.
 * 5. Mark immutability: once ingested and submitted, marks remain immutable (INV-003).
 * 6. Actor attribution: records actorType === "INTEGRATION" in audit events.
 * 7. AI non-authority: AI actors strictly rejected with 403 Forbidden.
 * 8. Role-based authorization: EXAMINER rejected with 403; MODERATOR and ADMIN permitted.
 * 9. Deterministic normalization: 50 repetitions produce bit-for-bit identical results.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { createDatabase, type KyselyDb } from "../src/infrastructure/database/database.js";
import { runMigrations } from "../src/infrastructure/database/migrator.js";
import {
  KyselyEvaluationRepository,
  KyselyRubricRepository,
  KyselyIdempotencyRepository,
  KyselyAuditRepository,
} from "../src/infrastructure/repositories/index.js";
import { KyselyUnitOfWork } from "../src/infrastructure/persistence/index.js";
import { Rubric } from "../src/domain/index.js";
import {
  OsmDataNormalizer,
  IngestOsmEvaluationHandler,
  IngestOsmBatchHandler,
  OsmIntegrationAdapter,
} from "../src/application/index.js";
import { createServer } from "../src/presentation/server.js";
import {
  UserRole,
  ActorType,
  EvaluationStatus,
  type ExternalOsmEvaluation,
  type ExternalOsmBatchImport,
} from "@osm/shared";

describe("TASK-P9-INTEGRATION-001: OSM Integration Boundary", () => {
  let db: KyselyDb;
  let uow: KyselyUnitOfWork;
  let rubricRepo: KyselyRubricRepository;
  let evalRepo: KyselyEvaluationRepository;
  let idempotencyRepo: KyselyIdempotencyRepository;
  let auditRepo: KyselyAuditRepository;
  let normalizer: OsmDataNormalizer;
  let ingestHandler: IngestOsmEvaluationHandler;
  let batchHandler: IngestOsmBatchHandler;
  let server: FastifyInstance;

  const validRubricId = "rubric_cs_101";
  const validRubricVersion = 1;

  beforeEach(async () => {
    db = createDatabase(":memory:");
    await runMigrations(db);

    uow = new KyselyUnitOfWork(db);
    rubricRepo = new KyselyRubricRepository(db);
    evalRepo = new KyselyEvaluationRepository(db);
    idempotencyRepo = new KyselyIdempotencyRepository(db);
    auditRepo = new KyselyAuditRepository(db);
    normalizer = new OsmDataNormalizer();

    ingestHandler = new IngestOsmEvaluationHandler(uow, idempotencyRepo, normalizer);
    batchHandler = new IngestOsmBatchHandler(ingestHandler);

    // Seed test rubric
    const rubric = new Rubric({
      id: validRubricId,
      version: validRubricVersion,
      title: "Computer Science 101 Midterm Rubric",
      criteria: [
        {
          id: "q1_logic",
          title: "Logic and Problem Solving",
          description: "Algorithmic thinking and approach",
          maxMarks: 40,
          levels: [
            { id: "l1", name: "Excellent", description: "Flawless", marks: 40 },
            { id: "l2", name: "Adequate", description: "Minor bugs", marks: 20 },
          ],
        },
        {
          id: "q2_syntax",
          title: "Code Syntax and Correctness",
          description: "Syntactic structure",
          maxMarks: 30,
          levels: [
            { id: "l1", name: "Pass", description: "Compiles", marks: 30 },
          ],
        },
        {
          id: "q3_complexity",
          title: "Time & Space Complexity",
          description: "Big-O performance analysis",
          maxMarks: 30,
          levels: [
            { id: "l1", name: "Optimal", description: "O(N)", marks: 30 },
          ],
        },
      ],
    });
    await rubricRepo.save(rubric);

    // Initialize presentation server
    server = await createServer({
      config: {
        PORT: 3000,
        HOST: "127.0.0.1",
        NODE_ENV: "test",
        LOG_LEVEL: "silent",
        CORS_ORIGIN: "*",
        DATABASE_URL: ":memory:",
      },
      db,
      ingestHandler,
      batchHandler,
    });
  });

  afterEach(async () => {
    await server.close();
    await db.destroy();
  });

  // =========================================================================
  // 1. Anti-Corruption & Data Normalization Layer
  // =========================================================================
  describe("Anti-Corruption & Data Normalization Layer", () => {
    it("1. successfully sanitizes external payload and strips unapproved PII", () => {
      const rawPayload = {
        externalEvaluationId: "  ext-eval-001  ",
        sourceSystem: "  VENDOR_TCS_ION  ",
        scriptId: "  script-999  ",
        evaluatorId: "  evaluator-42  ",
        evaluationCycleId: "  cycle-spring-2026  ",
        rubricId: "  rubric_cs_101  ",
        rubricVersion: 1,
        marks: [
          { questionNumber: "  q1_logic  ", awardedMarks: 35 },
          { questionNumber: "  q2_syntax  ", awardedMarks: 25 },
        ],
        autoSubmit: true,
        // Unapproved PII fields injected by vendor
        studentName: "John Doe",
        studentRollNumber: "CS-2026-0042",
        studentAadhaar: "1234-5678-9012",
        examCenterSecret: "SECRET_PASSWORD",
      };

      const sanitized = normalizer.validateAndSanitize(rawPayload);

      expect(sanitized.externalEvaluationId).toBe("ext-eval-001");
      expect(sanitized.sourceSystem).toBe("VENDOR_TCS_ION");
      expect(sanitized.scriptId).toBe("script-999");
      expect(sanitized.evaluatorId).toBe("evaluator-42");
      expect(sanitized.evaluationCycleId).toBe("cycle-spring-2026");
      expect(sanitized.marks).toHaveLength(2);
      expect(sanitized.marks[0].questionNumber).toBe("q1_logic");
      expect(sanitized.marks[0].awardedMarks).toBe(35);

      // Verify PII fields are completely stripped from normalized object
      expect((sanitized as Record<string, unknown>).studentName).toBeUndefined();
      expect((sanitized as Record<string, unknown>).studentRollNumber).toBeUndefined();
      expect((sanitized as Record<string, unknown>).studentAadhaar).toBeUndefined();
      expect((sanitized as Record<string, unknown>).examCenterSecret).toBeUndefined();
    });

    it("2. derives questions directly from Rubric criteria when external questions are omitted", async () => {
      const rubric = (await rubricRepo.findByIdAndVersion(validRubricId, validRubricVersion))!;
      const derivedQuestions = normalizer.normalizeQuestions(undefined, rubric);

      expect(derivedQuestions).toHaveLength(3);
      expect(derivedQuestions[0].questionNumber).toBe("q1_logic");
      expect(derivedQuestions[0].maxMarks).toBe(40);
      expect(derivedQuestions[1].questionNumber).toBe("q2_syntax");
      expect(derivedQuestions[1].maxMarks).toBe(30);
      expect(derivedQuestions[2].questionNumber).toBe("q3_complexity");
      expect(derivedQuestions[2].maxMarks).toBe(30);
    });

    it("3. validates and matches external marks to questions", () => {
      const questions = [
        { id: "q1-uuid", questionNumber: "Q1", text: "Q1", maxMarks: 40, orderIndex: 0 },
        { id: "q2-uuid", questionNumber: "Q2", text: "Q2", maxMarks: 30, orderIndex: 1 },
      ];

      const marks = [
        { questionNumber: "q1", awardedMarks: 35, comments: "Good" },
        { questionNumber: "Q2", awardedMarks: 25 },
      ];

      const normalizedMarks = normalizer.normalizeMarks(marks, questions);
      expect(normalizedMarks).toHaveLength(2);
      expect(normalizedMarks[0].questionId).toBe("q1-uuid");
      expect(normalizedMarks[0].awardedMarks).toBe(35);
      expect(normalizedMarks[1].questionId).toBe("q2-uuid");
      expect(normalizedMarks[1].awardedMarks).toBe(25);
    });

    it("4. rejects external mark that exceeds question maxMarks", () => {
      const questions = [
        { id: "q1-uuid", questionNumber: "Q1", text: "Q1", maxMarks: 40, orderIndex: 0 },
      ];

      const invalidMarks = [
        { questionNumber: "Q1", awardedMarks: 45 }, // Exceeds 40
      ];

      expect(() => normalizer.normalizeMarks(invalidMarks, questions)).toThrow(
        "exceeds question maxMarks"
      );
    });

    it("5. rejects external mark that references an unknown question", () => {
      const questions = [
        { id: "q1-uuid", questionNumber: "Q1", text: "Q1", maxMarks: 40, orderIndex: 0 },
      ];

      const unknownMarks = [
        { questionNumber: "Q99", awardedMarks: 10 },
      ];

      expect(() => normalizer.normalizeMarks(unknownMarks, questions)).toThrow(
        "references unknown question number 'Q99'"
      );
    });

    it("6. guarantees deterministic fingerprint generation across 50 repetitions (09-testing §40)", () => {
      const payload: ExternalOsmEvaluation = {
        externalEvaluationId: "ext-100",
        sourceSystem: "MERIT_TRAC",
        scriptId: "script-100",
        evaluatorId: "eval-100",
        evaluationCycleId: "cycle-100",
        rubricId: validRubricId,
        rubricVersion: 1,
        marks: [
          { questionNumber: "q2_syntax", awardedMarks: 20 },
          { questionNumber: "q1_logic", awardedMarks: 30 },
        ],
        autoSubmit: false,
      };

      const baseline = normalizer.computeFingerprint(payload);
      for (let i = 0; i < 50; i++) {
        const repetition = normalizer.computeFingerprint(payload);
        expect(repetition).toBe(baseline);
      }
    });
  });

  // =========================================================================
  // 2. Application Ingestion Handler & Transactional Integrity
  // =========================================================================
  describe("Application Ingestion Handler & Transactional Integrity", () => {
    it("7. ingests a valid external evaluation and creates evaluation with marks", async () => {
      const payload: ExternalOsmEvaluation = {
        externalEvaluationId: "eval-tc-001",
        sourceSystem: "SYNTHETIC_OSM",
        scriptId: "script-tc-001",
        evaluatorId: "evaluator-tc-001",
        evaluationCycleId: "cycle-2026",
        rubricId: validRubricId,
        rubricVersion: validRubricVersion,
        marks: [
          { questionNumber: "q1_logic", awardedMarks: 38, comments: "Clean logic" },
          { questionNumber: "q2_syntax", awardedMarks: 28, comments: "Minor typo" },
          { questionNumber: "q3_complexity", awardedMarks: 25 },
        ],
        autoSubmit: true,
      };

      const result = await ingestHandler.execute(payload, {
        actorId: "integration-service",
        role: UserRole.ADMIN,
        actorType: ActorType.INTEGRATION,
      });

      expect(result.status).toBe("CREATED");
      expect(result.externalEvaluationId).toBe("eval-tc-001");
      expect(result.evaluationId).toBeTruthy();
      expect(result.totalScore).toBe(91); // 38 + 28 + 25
      expect(result.isSubmitted).toBe(true);

      // Verify domain entity in database
      const savedEval = await evalRepo.findById(result.evaluationId);
      expect(savedEval).not.toBeNull();
      expect(savedEval!.status).toBe(EvaluationStatus.SUBMITTED);
      expect(savedEval!.totalScore).toBe(91);
      expect(savedEval!.maxPossibleScore).toBe(100);
      expect(savedEval!.isComplete()).toBe(true);

      // Verify audit log recorded
      const audits = await auditRepo.findByEntity!("Evaluation", result.evaluationId);
      expect(audits.length).toBeGreaterThanOrEqual(1);
      const ingestAudit = audits.find((a) => a.action === "INGEST_OSM_EVALUATION");
      expect(ingestAudit).toBeDefined();
      expect(ingestAudit!.actorType).toBe("INTEGRATION");
      expect(ingestAudit!.details.sourceSystem).toBe("SYNTHETIC_OSM");
    });

    it("8. fails safely and rolls back transaction when referenced rubric does not exist", async () => {
      const payload: ExternalOsmEvaluation = {
        externalEvaluationId: "eval-tc-fail",
        sourceSystem: "SYNTHETIC_OSM",
        scriptId: "script-fail",
        evaluatorId: "evaluator-fail",
        evaluationCycleId: "cycle-2026",
        rubricId: "non_existent_rubric",
        rubricVersion: 1,
        marks: [],
        autoSubmit: false,
      };

      await expect(
        ingestHandler.execute(payload, {
          actorId: "integration-service",
          role: UserRole.MODERATOR,
          actorType: ActorType.INTEGRATION,
        })
      ).rejects.toThrow("Rubric with id 'non_existent_rubric (v1)' was not found");

      // Verify zero records were saved
      const idempotencyRecord = await idempotencyRepo.findByKey(
        "OSM_INGESTION:SYNTHETIC_OSM:eval-tc-fail"
      );
      expect(idempotencyRecord).toBeNull();
    });

    it("9. strictly rejects AI actors with UnauthorizedActionError (INV-003)", async () => {
      const payload: ExternalOsmEvaluation = {
        externalEvaluationId: "eval-tc-ai",
        sourceSystem: "AI_VENDOR",
        scriptId: "script-ai",
        evaluatorId: "eval-ai",
        evaluationCycleId: "cycle-2026",
        rubricId: validRubricId,
        marks: [],
        autoSubmit: false,
      };

      await expect(
        ingestHandler.execute(payload, {
          actorId: "ai-assistant",
          role: "AI",
          actorType: ActorType.AI,
        })
      ).rejects.toThrow("AI actors are strictly prohibited from ingesting or submitting evaluations");
    });

    it("10. strictly rejects EXAMINER role with UnauthorizedActionError", async () => {
      const payload: ExternalOsmEvaluation = {
        externalEvaluationId: "eval-tc-examiner",
        sourceSystem: "SYNTHETIC_OSM",
        scriptId: "script-examiner",
        evaluatorId: "eval-examiner",
        evaluationCycleId: "cycle-2026",
        rubricId: validRubricId,
        marks: [],
        autoSubmit: false,
      };

      await expect(
        ingestHandler.execute(payload, {
          actorId: "examiner-1",
          role: UserRole.EXAMINER,
          actorType: ActorType.USER,
        })
      ).rejects.toThrow("Examiners and unauthorized roles are not permitted to ingest external evaluation data");
    });
  });

  // =========================================================================
  // 3. Idempotency & Concurrency Safety
  // =========================================================================
  describe("Idempotency & Concurrency Safety", () => {
    it("11. returns IDEMPOTENT_REPLAY on sequential duplicate request with identical payload", async () => {
      const payload: ExternalOsmEvaluation = {
        externalEvaluationId: "eval-dup-001",
        sourceSystem: "MERIT_TRAC",
        scriptId: "script-dup-001",
        evaluatorId: "evaluator-dup-001",
        evaluationCycleId: "cycle-2026",
        rubricId: validRubricId,
        marks: [{ questionNumber: "q1_logic", awardedMarks: 30 }],
        autoSubmit: false,
      };

      const actor = {
        actorId: "admin-actor",
        role: UserRole.ADMIN,
        actorType: ActorType.INTEGRATION,
      };

      // First ingestion
      const firstResult = await ingestHandler.execute(payload, actor);
      expect(firstResult.status).toBe("CREATED");

      // Second ingestion (duplicate retry)
      const secondResult = await ingestHandler.execute(payload, actor);
      expect(secondResult.status).toBe("IDEMPOTENT_REPLAY");
      expect(secondResult.evaluationId).toBe(firstResult.evaluationId);
      expect(secondResult.totalScore).toBe(firstResult.totalScore);

      // Verify that no duplicate evaluation row was created in SQLite
      const evaluations = await evalRepo.findPaginated({
        page: 1,
        pageSize: 10,
        filter: { scriptId: "script-dup-001" },
      });
      expect(evaluations.total).toBe(1);
    });

    it("12. throws ConcurrencyConflictError (409) when same idempotency key is reused with different marks", async () => {
      const payload1: ExternalOsmEvaluation = {
        externalEvaluationId: "eval-conflict-001",
        sourceSystem: "MERIT_TRAC",
        scriptId: "script-conf-001",
        evaluatorId: "eval-001",
        evaluationCycleId: "cycle-2026",
        rubricId: validRubricId,
        marks: [{ questionNumber: "q1_logic", awardedMarks: 30 }],
        autoSubmit: false,
      };

      const actor = {
        actorId: "admin-actor",
        role: UserRole.ADMIN,
        actorType: ActorType.INTEGRATION,
      };

      await ingestHandler.execute(payload1, actor);

      // Same externalEvaluationId and sourceSystem, but DIFFERENT awardedMarks
      const payload2: ExternalOsmEvaluation = {
        ...payload1,
        marks: [{ questionNumber: "q1_logic", awardedMarks: 35 }],
      };

      await expect(ingestHandler.execute(payload2, actor)).rejects.toThrow(
        "Concurrency conflict on IdempotencyRecord MERIT_TRAC:eval-conflict-001"
      );
    });

    it("13. protects against concurrent race conditions (creates exactly 1 evaluation under parallel execution)", async () => {
      const payload: ExternalOsmEvaluation = {
        externalEvaluationId: "eval-concurrent-001",
        sourceSystem: "TCS_ION",
        scriptId: "script-parallel-001",
        evaluatorId: "eval-parallel",
        evaluationCycleId: "cycle-2026",
        rubricId: validRubricId,
        marks: [{ questionNumber: "q1_logic", awardedMarks: 25 }],
        autoSubmit: false,
      };

      const actor = {
        actorId: "integration-actor",
        role: UserRole.MODERATOR,
        actorType: ActorType.INTEGRATION,
      };

      // Fire parallel concurrent ingestion requests
      const [res1, res2] = await Promise.all([
        ingestHandler.execute(payload, actor),
        ingestHandler.execute(payload, actor),
      ]);

      const statuses = [res1.status, res2.status];
      expect(statuses).toContain("CREATED");
      expect(statuses).toContain("IDEMPOTENT_REPLAY");

      // Verify both returned the exact same internal evaluationId
      expect(res1.evaluationId).toBe(res2.evaluationId);

      // Verify SQLite evaluations table contains exactly ONE row
      const evaluations = await evalRepo.findPaginated({
        page: 1,
        pageSize: 10,
        filter: { scriptId: "script-parallel-001" },
      });
      expect(evaluations.total).toBe(1);
    });
  });

  // =========================================================================
  // 4. Batch Ingestion & OsmIntegrationAdapter
  // =========================================================================
  describe("Batch Ingestion & Adapter Verification", () => {
    it("14. ingests batch of evaluations, handling successes, replays, and failures cleanly", async () => {
      const batchPayload: ExternalOsmBatchImport = {
        batchId: "batch-2026-001",
        sourceSystem: "SYNTHETIC_OSM",
        evaluations: [
          {
            externalEvaluationId: "b-eval-1",
            sourceSystem: "SYNTHETIC_OSM",
            scriptId: "script-b-1",
            evaluatorId: "eval-1",
            evaluationCycleId: "cycle-2026",
            rubricId: validRubricId,
            marks: [{ questionNumber: "q1_logic", awardedMarks: 35 }],
            autoSubmit: true,
          },
          {
            externalEvaluationId: "b-eval-2",
            sourceSystem: "SYNTHETIC_OSM",
            scriptId: "script-b-2",
            evaluatorId: "eval-2",
            evaluationCycleId: "cycle-2026",
            rubricId: validRubricId,
            marks: [{ questionNumber: "q2_syntax", awardedMarks: 20 }],
            autoSubmit: false,
          },
          {
            // Invalid item (unknown rubric)
            externalEvaluationId: "b-eval-invalid",
            sourceSystem: "SYNTHETIC_OSM",
            scriptId: "script-b-invalid",
            evaluatorId: "eval-3",
            evaluationCycleId: "cycle-2026",
            rubricId: "unknown_rubric_999",
            marks: [],
            autoSubmit: false,
          },
        ],
      };

      const actor = {
        actorId: "batch-agent",
        role: UserRole.ADMIN,
        actorType: ActorType.INTEGRATION,
      };

      const result = await batchHandler.execute(batchPayload, actor);

      expect(result.batchId).toBe("batch-2026-001");
      expect(result.totalCount).toBe(3);
      expect(result.createdCount).toBe(2);
      expect(result.failedCount).toBe(1);
      expect(result.replayedCount).toBe(0);

      expect(result.results[0].status).toBe("CREATED");
      expect(result.results[1].status).toBe("CREATED");
      expect(result.results[2].status).toBe("FAILED");
      expect(result.results[2].error).toContain("unknown_rubric_999");
    });

    it("15. OsmIntegrationAdapter implements OsmIntegrationPort contract correctly", async () => {
      const adapter = new OsmIntegrationAdapter(uow, idempotencyRepo, normalizer);

      const singleResult = await adapter.ingestEvaluation(
        {
          externalEvaluationId: "adapter-eval-1",
          sourceSystem: "OSM_SYSTEM",
          scriptId: "script-adapter-1",
          evaluatorId: "evaluator-1",
          evaluationCycleId: "cycle-2026",
          rubricId: validRubricId,
          marks: [{ questionNumber: "q1_logic", awardedMarks: 30 }],
          autoSubmit: false,
        },
        {
          actorId: "port-client",
          role: UserRole.MODERATOR,
          actorType: ActorType.INTEGRATION,
        }
      );

      expect(singleResult.status).toBe("CREATED");
      expect(singleResult.totalScore).toBe(30);
    });
  });

  // =========================================================================
  // 5. Presentation / HTTP API Boundary
  // =========================================================================
  describe("Presentation / HTTP API Boundary", () => {
    it("16. POST /api/v1/integration/osm/ingest returns 201 for new evaluation", async () => {
      const response = await server.inject({
        method: "POST",
        url: "/api/v1/integration/osm/ingest",
        headers: {
          "x-actor-role": UserRole.MODERATOR,
          "x-actor-type": ActorType.INTEGRATION,
          "x-actor-id": "http-client",
        },
        payload: {
          externalEvaluationId: "http-eval-001",
          sourceSystem: "HTTP_OSM",
          scriptId: "http-script-001",
          evaluatorId: "http-evaluator-1",
          evaluationCycleId: "cycle-2026",
          rubricId: validRubricId,
          marks: [{ questionNumber: "q1_logic", awardedMarks: 38 }],
          autoSubmit: true,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.payload);
      expect(body.status).toBe("CREATED");
      expect(body.evaluationId).toBeTruthy();
      expect(body.totalScore).toBe(38);
    });

    it("17. POST /api/v1/integration/osm/ingest returns 200 for idempotent duplicate replay", async () => {
      const payload = {
        externalEvaluationId: "http-replay-001",
        sourceSystem: "HTTP_OSM",
        scriptId: "http-script-replay",
        evaluatorId: "http-eval-replay",
        evaluationCycleId: "cycle-2026",
        rubricId: validRubricId,
        marks: [{ questionNumber: "q1_logic", awardedMarks: 32 }],
        autoSubmit: false,
      };

      const headers = {
        "x-actor-role": UserRole.ADMIN,
        "x-actor-type": ActorType.INTEGRATION,
      };

      // First call -> 201 Created
      const res1 = await server.inject({
        method: "POST",
        url: "/api/v1/integration/osm/ingest",
        headers,
        payload,
      });
      expect(res1.statusCode).toBe(201);

      // Replay call -> 200 OK
      const res2 = await server.inject({
        method: "POST",
        url: "/api/v1/integration/osm/ingest",
        headers,
        payload,
      });
      expect(res2.statusCode).toBe(200);
      const body2 = JSON.parse(res2.payload);
      expect(body2.status).toBe("IDEMPOTENT_REPLAY");
      expect(body2.evaluationId).toBe(JSON.parse(res1.payload).evaluationId);
    });

    it("18. POST /api/v1/integration/osm/ingest returns 403 Forbidden for AI actor", async () => {
      const response = await server.inject({
        method: "POST",
        url: "/api/v1/integration/osm/ingest",
        headers: {
          "x-actor-type": ActorType.AI,
          "x-actor-role": "AI",
        },
        payload: {
          externalEvaluationId: "ai-reject-001",
          sourceSystem: "AI",
          scriptId: "script-1",
          evaluatorId: "eval-1",
          evaluationCycleId: "cycle-1",
          rubricId: validRubricId,
        },
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.payload);
      expect(body.code).toBe("UNAUTHORIZED_ACTION");
    });

    it("19. POST /api/v1/integration/osm/ingest returns 403 Forbidden for EXAMINER role", async () => {
      const response = await server.inject({
        method: "POST",
        url: "/api/v1/integration/osm/ingest",
        headers: {
          "x-user-role": UserRole.EXAMINER,
          "x-actor-type": ActorType.USER,
        },
        payload: {
          externalEvaluationId: "examiner-reject-001",
          sourceSystem: "OSM",
          scriptId: "script-1",
          evaluatorId: "eval-1",
          evaluationCycleId: "cycle-1",
          rubricId: validRubricId,
        },
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.payload);
      expect(body.code).toBe("UNAUTHORIZED_ACTION");
    });

    it("20. POST /api/v1/integration/osm/ingest returns 400 Bad Request for malformed payload", async () => {
      const response = await server.inject({
        method: "POST",
        url: "/api/v1/integration/osm/ingest",
        headers: {
          "x-actor-role": UserRole.MODERATOR,
        },
        payload: {
          // Missing required externalEvaluationId, sourceSystem, etc.
          scriptId: "script-only",
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.payload);
      expect(body.code).toBe("VALIDATION_FAILED");
    });

    it("21. POST /api/v1/integration/osm/ingest-batch returns 200 with batch execution summary", async () => {
      const response = await server.inject({
        method: "POST",
        url: "/api/v1/integration/osm/ingest-batch",
        headers: {
          "x-actor-role": UserRole.MODERATOR,
          "x-actor-type": ActorType.INTEGRATION,
        },
        payload: {
          batchId: "http-batch-001",
          sourceSystem: "HTTP_BATCH_OSM",
          evaluations: [
            {
              externalEvaluationId: "http-b-1",
              sourceSystem: "HTTP_BATCH_OSM",
              scriptId: "script-hb-1",
              evaluatorId: "eval-hb-1",
              evaluationCycleId: "cycle-2026",
              rubricId: validRubricId,
              marks: [{ questionNumber: "q1_logic", awardedMarks: 40 }],
              autoSubmit: true,
            },
          ],
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.batchId).toBe("http-batch-001");
      expect(body.totalCount).toBe(1);
      expect(body.createdCount).toBe(1);
    });
  });

  // =========================================================================
  // 6. Mark Immutability & Academic Neutrality (INV-003)
  // =========================================================================
  describe("Mark Immutability (INV-003)", () => {
    it("22. verifies evaluation marks cannot be altered once submitted by integration", async () => {
      const payload: ExternalOsmEvaluation = {
        externalEvaluationId: "eval-immutable-001",
        sourceSystem: "OSM_SYSTEM",
        scriptId: "script-imm-001",
        evaluatorId: "evaluator-imm-1",
        evaluationCycleId: "cycle-2026",
        rubricId: validRubricId,
        marks: [
          { questionNumber: "q1_logic", awardedMarks: 36 },
          { questionNumber: "q2_syntax", awardedMarks: 28 },
          { questionNumber: "q3_complexity", awardedMarks: 26 },
        ],
        autoSubmit: true,
      };

      const result = await ingestHandler.execute(payload, {
        actorId: "integration-actor",
        role: UserRole.MODERATOR,
        actorType: ActorType.INTEGRATION,
      });

      expect(result.status).toBe("CREATED");

      // Verify domain aggregate is SUBMITTED and marks cannot be modified
      const evaluation = (await evalRepo.findById(result.evaluationId))!;
      expect(evaluation.status).toBe(EvaluationStatus.SUBMITTED);
      expect(evaluation.totalScore).toBe(90);

      // Attempting to assign new marks on submitted evaluation must throw EvaluationLockedError
      expect(() => {
        evaluation.assignMark({
          questionId: evaluation.questions[0].id,
          awardedMarks: 40,
          evaluatorId: "evaluator-imm-1",
        });
      }).toThrow("Evaluation is locked once submitted or finalized");
    });
  });
});
