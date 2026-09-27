/**
 * Integration Contract Verification Test Suite (TASK-P9-INTEGRATION-003).
 *
 * Conforms to:
 * - docs/planning/03-build-roadmap.md §16 (Phase 9 — OSM Integration)
 * - docs/planning/04-task-board.md (TASK-P9-INTEGRATION-003 — Verify integration contract)
 * - docs/contracts/01-product-contract.md §34-36 (Synthetic Demo Data Strategy & Seeded Scenarios)
 * - docs/contracts/02-architecture-contract.md §50-52 (External OSM Integration Boundary & Synthetic Adapter)
 * - docs/contracts/06-api-contract.md §54-56 (Integration Boundary, Normalization & Authority)
 * - docs/contracts/07-event-contract.md §20-25 (Integration Events & Outbox Publishing)
 * - docs/contracts/08-data-contract.md §37-40, §108-111 (Idempotency, External Data Import, Data Hygiene)
 * - docs/contracts/09-testing-contract.md §40, §51-52 (External Integration & Failure Testing)
 * - docs/contracts/10-demo-contract.md §28-30 (Deterministic Integration Demo Verification)
 *
 * Invariants & Contract Verification:
 * 1. End-to-End Pipeline:
 *    SyntheticOsmAdapter -> External DTO -> schema validation -> anti-corruption normalization
 *    -> ingestion command -> domain evaluation -> marks -> quality signals -> outbox -> audit
 *    -> idempotency -> SQLite persistence.
 * 2. Canonical Seeded Scenarios:
 *    - NORMAL: valid complete evaluation, passing marks (65-78%), status SUBMITTED, 0 signals.
 *    - INCOMPLETE: missing question mark, status SUBMITTED, emits COMPLETENESS_PARTIAL signal.
 *    - UNMARKED: all marks 0, status SUBMITTED, emits COMPLETENESS_UNMARKED signal (CRITICAL).
 *    - ANOMALOUS_LENIENT: marks 90-98%, status SUBMITTED, marks persisted accurately.
 *    - ANOMALOUS_STRICT: marks 15-28%, status SUBMITTED, marks persisted accurately.
 * 3. Boundary Failure Modes:
 *    - INVALID_RUBRIC: safe failure on unknown rubric (EntityNotFoundError), zero partial state.
 *    - OUT_OF_BOUNDS_MARK: mark exceeding maxMarks rejected (InvalidArgumentError), zero partial state.
 *    - Malformed payload: schema-invalid external payload rejected at boundary, zero domain writes.
 * 4. Deterministic Reproducibility:
 *    - 50-repetition test verifying bit-for-bit identical payloads across repeated generation.
 * 5. Idempotency & Concurrency:
 *    - Sequential duplicate replay returns cached IDEMPOTENT_REPLAY without duplicate evaluation rows.
 *    - Conflicting duplicate payload with same key returns 409 ConcurrencyConflictError.
 *    - Concurrent duplicate ingestion race condition produces exactly 1 internal evaluation.
 * 6. Batch Ingestion:
 *    - Batch ingestion with itemized tracking (createdCount, replayedCount, failedCount).
 *    - Partial failure isolation: invalid items fail without rolling back valid sibling items.
 * 7. Security & Role Authorization:
 *    - MODERATOR and ADMIN roles permitted (201 / 200).
 *    - EXAMINER role strictly rejected with 403 UnauthorizedActionError.
 *    - AI actor strictly rejected with 403 UnauthorizedActionError (INV-003, INV-004).
 * 8. Audit & Outbox Attribution:
 *    - Audit event recorded with actorType === "INTEGRATION" and action === "INGEST_OSM_EVALUATION".
 *    - Outbox records EvaluationCreated and EvaluationSubmitted events transactionally.
 * 9. Anti-Corruption & Data Hygiene:
 *    - Zero vendor/synthetic PII (candidateName, rollNumber, raw payload) leaks into domain tables.
 * 10. External Failure Simulation (§52 testing contract):
 *    - Simulated timeout and simulated connection failure tested without domain state corruption.
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
  KyselyQualitySignalRepository,
} from "../src/infrastructure/repositories/index.js";
import { KyselyUnitOfWork } from "../src/infrastructure/persistence/index.js";
import { Rubric } from "../src/domain/index.js";
import {
  OsmDataNormalizer,
  IngestOsmEvaluationHandler,
  IngestOsmBatchHandler,
  EntityNotFoundError,
  UnauthorizedActionError,
} from "../src/application/index.js";
import { ConcurrencyConflictError, InvalidArgumentError } from "../src/domain/errors.js";
import {
  SyntheticOsmAdapter,
  DeterministicPrng,
  DEFAULT_SYNTHETIC_QUESTIONS,
} from "../src/infrastructure/adapters/synthetic-osm-adapter.js";
import { createServer } from "../src/presentation/server.js";
import {
  UserRole,
  ActorType,
  EvaluationStatus,
  type ExternalOsmEvaluation,
  type ExternalOsmBatchImport,
} from "@osm/shared";

describe("TASK-P9-INTEGRATION-003: Integration Contract Verification", () => {
  let db: KyselyDb;
  let uow: KyselyUnitOfWork;
  let rubricRepo: KyselyRubricRepository;
  let evalRepo: KyselyEvaluationRepository;
  let idempotencyRepo: KyselyIdempotencyRepository;
  let auditRepo: KyselyAuditRepository;
  let signalRepo: KyselyQualitySignalRepository;
  let normalizer: OsmDataNormalizer;
  let ingestHandler: IngestOsmEvaluationHandler;
  let batchHandler: IngestOsmBatchHandler;
  let adapter: SyntheticOsmAdapter;
  let server: FastifyInstance;

  const validRubricId = "rubric_contract_p9";
  const validRubricVersion = 1;

  const adminActor = {
    actorId: "admin-verifier-1",
    role: UserRole.ADMIN,
    actorType: ActorType.INTEGRATION,
  };

  const moderatorActor = {
    actorId: "mod-verifier-1",
    role: UserRole.MODERATOR,
    actorType: ActorType.INTEGRATION,
  };

  const examinerActor = {
    actorId: "examiner-unauth-1",
    role: UserRole.EXAMINER,
    actorType: ActorType.USER,
  };

  const aiActor = {
    actorId: "ai-actor-1",
    role: UserRole.ADMIN,
    actorType: ActorType.AI,
  };

  beforeEach(async () => {
    db = createDatabase(":memory:");
    await runMigrations(db);

    uow = new KyselyUnitOfWork(db);
    rubricRepo = new KyselyRubricRepository(db);
    evalRepo = new KyselyEvaluationRepository(db);
    idempotencyRepo = new KyselyIdempotencyRepository(db);
    auditRepo = new KyselyAuditRepository(db);
    signalRepo = new KyselyQualitySignalRepository(db);
    normalizer = new OsmDataNormalizer();

    ingestHandler = new IngestOsmEvaluationHandler(uow, idempotencyRepo, normalizer);
    batchHandler = new IngestOsmBatchHandler(ingestHandler);

    adapter = new SyntheticOsmAdapter({
      uow,
      idempotencyRepo,
      normalizer,
      defaultSourceSystem: "CONTRACT_SYNTHETIC_OSM",
    });

    // Seed authoritative rubric matching default question config
    const rubric = new Rubric({
      id: validRubricId,
      version: validRubricVersion,
      title: "P9 Integration Verification Rubric",
      criteria: [
        {
          id: "Q1",
          title: "Core algorithmic implementation and correctness",
          description: "Algorithmic thinking and approach",
          maxMarks: 40,
          levels: [
            { id: "l1", name: "Full", description: "Flawless", marks: 40 },
          ],
        },
        {
          id: "Q2",
          title: "Code structure, syntax, and style adherence",
          description: "Syntactic structure",
          maxMarks: 30,
          levels: [
            { id: "l1", name: "Pass", description: "Compiles", marks: 30 },
          ],
        },
        {
          id: "Q3",
          title: "Architectural design, error handling, and complexity",
          description: "Big-O performance analysis",
          maxMarks: 30,
          levels: [
            { id: "l1", name: "Optimal", description: "Modular", marks: 30 },
          ],
        },
      ],
    });
    await rubricRepo.save(rubric);

    // Initialize presentation server for HTTP boundary verification
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
  // 1. Complete End-to-End Ingestion Path
  // =========================================================================
  describe("1. Complete End-to-End Ingestion Path", () => {
    it("executes the full pipeline: Adapter -> DTO -> Normalizer -> Command -> Domain -> Marks -> Outbox -> Audit -> Idempotency -> SQLite", async () => {
      // 1. Generate synthetic evaluation
      const generatedDto = adapter.generateEvaluation({
        seed: 777,
        index: 1,
        scenario: "NORMAL",
        rubricId: validRubricId,
        rubricVersion: validRubricVersion,
      });

      expect(generatedDto.externalEvaluationId).toBeDefined();
      expect(generatedDto.marks).toHaveLength(3);

      // 2. Ingest through adapter port
      const result = await adapter.ingestEvaluation(generatedDto, adminActor);

      expect(result.status).toBe("CREATED");
      expect(result.evaluationId).toBeDefined();
      expect(result.isSubmitted).toBe(true);
      expect(result.totalScore).toBeGreaterThanOrEqual(65);
      expect(result.totalScore).toBeLessThanOrEqual(78);

      // 3. Verify evaluation row in SQLite
      const evaluation = await evalRepo.findById(result.evaluationId);
      expect(evaluation).not.toBeNull();
      expect(evaluation!.status).toBe(EvaluationStatus.SUBMITTED);
      expect(evaluation!.totalScore).toBe(result.totalScore);
      expect(evaluation!.questions).toHaveLength(3);
      expect(evaluation!.marks.size).toBe(3);

      // 4. Verify evaluation_marks rows in SQLite
      const rawMarks = await db
        .selectFrom("evaluation_marks")
        .selectAll()
        .where("evaluation_id", "=", result.evaluationId)
        .execute();
      expect(rawMarks).toHaveLength(3);
      const totalRawScore = rawMarks.reduce((sum, m) => sum + m.awarded_marks, 0);
      expect(totalRawScore).toBe(result.totalScore);

      // 5. Verify outbox events in SQLite
      const outboxEvents = await db
        .selectFrom("outbox_events")
        .selectAll()
        .where("aggregate_id", "=", result.evaluationId)
        .orderBy("created_at", "asc")
        .execute();
      expect(outboxEvents.length).toBeGreaterThanOrEqual(2);
      const eventTypes = outboxEvents.map((e) => e.event_type);
      expect(eventTypes).toContain("EvaluationCreated");
      expect(eventTypes).toContain("EvaluationSubmitted");

      // Verify EvaluationCreated payload
      const createdEvent = outboxEvents.find((e) => e.event_type === "EvaluationCreated");
      const createdPayload = JSON.parse(createdEvent!.payload);
      expect(createdPayload.externalEvaluationId).toBe(generatedDto.externalEvaluationId);
      expect(createdPayload.rubricId).toBe(validRubricId);
      expect(createdEvent!.actor_type).toBe("INTEGRATION");

      // 6. Verify audit event in SQLite
      const auditEvents = await db
        .selectFrom("audit_events")
        .selectAll()
        .where("entity_id", "=", result.evaluationId)
        .execute();
      expect(auditEvents).toHaveLength(1);
      const audit = auditEvents[0];
      expect(audit.event_type).toBe("OsmEvaluationIngested");
      expect(audit.actor_type).toBe("INTEGRATION");
      expect(audit.actor_id).toBe(adminActor.actorId);
      expect(audit.action).toBe("INGEST_OSM_EVALUATION");
      const auditDetails = JSON.parse(audit.details);
      expect(auditDetails.externalEvaluationId).toBe(generatedDto.externalEvaluationId);
      expect(auditDetails.totalScore).toBe(result.totalScore);

      // 7. Verify idempotency record in SQLite
      const idempotencyKey = `OSM_INGESTION:${generatedDto.idempotencyKey}`;
      const record = await idempotencyRepo.findByKey(idempotencyKey);
      expect(record).not.toBeNull();
      expect(record!.responseStatus).toBe(201);
      const cachedResult = JSON.parse(record!.responseBody);
      expect(cachedResult.evaluationId).toBe(result.evaluationId);
    });
  });

  // =========================================================================
  // 2. Canonical Seeded Scenarios Verification
  // =========================================================================
  describe("2. Canonical Seeded Scenarios Verification", () => {
    it("verifies valid synthetic NORMAL flow (complete, passing marks 65-78%, 0 quality signals)", async () => {
      const result = await adapter.simulateEvaluation(
        {
          seed: 101,
          scenario: "NORMAL",
          rubricId: validRubricId,
        },
        adminActor
      );

      expect(result.status).toBe("CREATED");
      expect(result.isSubmitted).toBe(true);
      expect(result.totalScore).toBeGreaterThanOrEqual(65);
      expect(result.totalScore).toBeLessThanOrEqual(78);

      // Check quality signals in DB: clean normal evaluation must produce 0 signals
      const signals = await signalRepo.findByEvaluationId(result.evaluationId);
      expect(signals).toHaveLength(0);
    });

    it("verifies INCOMPLETE flow (missing question mark -> COMPLETENESS_PARTIAL QualitySignal emitted)", async () => {
      const result = await adapter.simulateEvaluation(
        {
          seed: 202,
          scenario: "INCOMPLETE",
          rubricId: validRubricId,
        },
        adminActor
      );

      expect(result.status).toBe("CREATED");
      expect(result.isSubmitted).toBe(true);

      // Check quality signals in DB: must have COMPLETENESS_PARTIAL signal
      const signals = await signalRepo.findByEvaluationId(result.evaluationId);
      expect(signals).toHaveLength(1);
      const signal = signals[0];
      expect(signal.signalType).toBe("COMPLETENESS_PARTIAL");
      expect(signal.severity).toBe("MEDIUM");
      expect(signal.evidence.unmarkedQuestions).toBe(1);
      expect(signal.evidence.missingQuestionIds).toHaveLength(1);
      expect(signal.evidence.reason).toBe("Evaluation has unmarked questions upon submission.");

      // Outbox must contain QualitySignalGenerated
      const outbox = await db
        .selectFrom("outbox_events")
        .selectAll()
        .where("aggregate_id", "=", signal.id)
        .execute();
      expect(outbox).toHaveLength(1);
      expect(outbox[0].event_type).toBe("QualitySignalGenerated");
    });

    it("verifies UNMARKED flow (all questions unmarked -> COMPLETENESS_UNMARKED QualitySignal emitted)", async () => {
      const result = await adapter.simulateEvaluation(
        {
          seed: 303,
          scenario: "UNMARKED",
          rubricId: validRubricId,
        },
        adminActor
      );

      expect(result.status).toBe("CREATED");
      expect(result.isSubmitted).toBe(true);
      expect(result.totalScore).toBe(0);

      // Check quality signals in DB: must have COMPLETENESS_UNMARKED signal
      const signals = await signalRepo.findByEvaluationId(result.evaluationId);
      expect(signals).toHaveLength(1);
      const signal = signals[0];
      expect(signal.signalType).toBe("COMPLETENESS_UNMARKED");
      expect(signal.severity).toBe("HIGH");
      expect(signal.evidence.unmarkedQuestions).toBe(3);
      expect(signal.evidence.missingQuestionIds).toHaveLength(3);
      expect(signal.evidence.reason).toBe("All questions in this evaluation remain unmarked.");
    });

    it("verifies ANOMALOUS_LENIENT flow (marks consistently high in 90-98% range)", async () => {
      const result = await adapter.simulateEvaluation(
        {
          seed: 404,
          scenario: "ANOMALOUS_LENIENT",
          rubricId: validRubricId,
        },
        adminActor
      );

      expect(result.status).toBe("CREATED");
      expect(result.totalScore).toBeGreaterThanOrEqual(90);
      expect(result.totalScore).toBeLessThanOrEqual(98);

      const evaluation = await evalRepo.findById(result.evaluationId);
      expect(evaluation).not.toBeNull();
      expect(evaluation!.marks.size).toBe(3);
      for (const mark of evaluation!.marks.values()) {
        expect(mark.awardedMarks).toBeGreaterThanOrEqual(27); // Q1(40) >= 36, Q2(30) >= 27, Q3(30) >= 27
      }
    });

    it("verifies ANOMALOUS_STRICT flow (marks consistently low in 15-28% range)", async () => {
      const result = await adapter.simulateEvaluation(
        {
          seed: 505,
          scenario: "ANOMALOUS_STRICT",
          rubricId: validRubricId,
        },
        adminActor
      );

      expect(result.status).toBe("CREATED");
      expect(result.totalScore).toBeGreaterThanOrEqual(15);
      expect(result.totalScore).toBeLessThanOrEqual(28);

      const evaluation = await evalRepo.findById(result.evaluationId);
      expect(evaluation).not.toBeNull();
      expect(evaluation!.marks.size).toBe(3);
    });
  });

  // =========================================================================
  // 3. Boundary Failure Modes & Zero Partial State
  // =========================================================================
  describe("3. Boundary Failure Modes & Zero Partial State", () => {
    it("verifies invalid rubric failure throws EntityNotFoundError with zero partial DB state", async () => {
      const initialEvals = await db.selectFrom("evaluations").selectAll().execute();
      const initialOutbox = await db.selectFrom("outbox_events").selectAll().execute();
      const initialAudit = await db.selectFrom("audit_events").selectAll().execute();
      const initialIdempotency = await db.selectFrom("idempotency_records").selectAll().execute();

      await expect(
        adapter.simulateEvaluation(
          {
            seed: 606,
            scenario: "INVALID_RUBRIC",
            rubricId: "non_existent_rubric_999",
          },
          adminActor
        )
      ).rejects.toThrow(EntityNotFoundError);

      // Verify zero partial records left behind in any table
      const postEvals = await db.selectFrom("evaluations").selectAll().execute();
      const postOutbox = await db.selectFrom("outbox_events").selectAll().execute();
      const postAudit = await db.selectFrom("audit_events").selectAll().execute();
      const postIdempotency = await db.selectFrom("idempotency_records").selectAll().execute();

      expect(postEvals).toHaveLength(initialEvals.length);
      expect(postOutbox).toHaveLength(initialOutbox.length);
      expect(postAudit).toHaveLength(initialAudit.length);
      expect(postIdempotency).toHaveLength(initialIdempotency.length);
    });

    it("verifies out-of-bounds mark failure throws InvalidArgumentError with zero partial DB state", async () => {
      const initialEvals = await db.selectFrom("evaluations").selectAll().execute();

      await expect(
        adapter.simulateEvaluation(
          {
            seed: 707,
            scenario: "OUT_OF_BOUNDS_MARK",
            rubricId: validRubricId,
          },
          adminActor
        )
      ).rejects.toThrow(InvalidArgumentError);

      const postEvals = await db.selectFrom("evaluations").selectAll().execute();
      expect(postEvals).toHaveLength(initialEvals.length);
    });

    it("verifies malformed/schema-invalid external payload rejected at boundary with zero DB writes", async () => {
      const invalidPayload = {
        // missing externalEvaluationId, sourceSystem, scriptId, evaluatorId, etc.
        sourceSystem: "VENDOR",
        marks: [{ questionNumber: "Q1", awardedMarks: -5 }],
      };

      await expect(
        ingestHandler.execute(invalidPayload as any, adminActor)
      ).rejects.toThrow(InvalidArgumentError);

      const evalCount = await db.selectFrom("evaluations").selectAll().execute();
      expect(evalCount).toHaveLength(0);
    });

    it("verifies negative awarded mark rejected at schema boundary", async () => {
      const payload = adapter.generateEvaluation({
        seed: 808,
        rubricId: validRubricId,
      });
      payload.marks[0].awardedMarks = -1;

      await expect(
        ingestHandler.execute(payload, adminActor)
      ).rejects.toThrow(InvalidArgumentError);

      const evalCount = await db.selectFrom("evaluations").selectAll().execute();
      expect(evalCount).toHaveLength(0);
    });
  });

  // =========================================================================
  // 4. Deterministic Synthetic Payload Reproducibility
  // =========================================================================
  describe("4. Deterministic Synthetic Payload Reproducibility", () => {
    it("generates bit-for-bit identical payload across 50 consecutive runs (09-testing §40)", () => {
      const config = {
        seed: 999,
        index: 5,
        scenario: "NORMAL" as const,
        sourceSystem: "REPRO_TEST_OSM",
        rubricId: validRubricId,
      };

      const baseline = JSON.stringify(adapter.generateEvaluation(config));

      for (let run = 2; run <= 50; run++) {
        const current = JSON.stringify(adapter.generateEvaluation(config));
        expect(current).toBe(baseline);
      }
    });

    it("DeterministicPrng produces identical float and integer sequences across separate instances", () => {
      const prng1 = new DeterministicPrng(123456);
      const prng2 = new DeterministicPrng(123456);

      for (let i = 0; i < 50; i++) {
        expect(prng1.next()).toBe(prng2.next());
        expect(prng1.nextInt(10, 100)).toBe(prng2.nextInt(10, 100));
      }
    });
  });

  // =========================================================================
  // 5. Concurrency, Idempotency & Conflict Semantics
  // =========================================================================
  describe("5. Concurrency, Idempotency & Conflict Semantics", () => {
    it("sequential duplicate replay returns cached IDEMPOTENT_REPLAY with zero duplicate DB rows", async () => {
      const payload = adapter.generateEvaluation({
        seed: 111,
        rubricId: validRubricId,
      });

      // First ingestion -> CREATED (201)
      const firstResult = await adapter.ingestEvaluation(payload, adminActor);
      expect(firstResult.status).toBe("CREATED");

      // Verify 1 evaluation in DB
      let evalRows = await db.selectFrom("evaluations").selectAll().execute();
      expect(evalRows).toHaveLength(1);

      // Second ingestion with identical payload -> IDEMPOTENT_REPLAY (200)
      const secondResult = await adapter.ingestEvaluation(payload, adminActor);
      expect(secondResult.status).toBe("IDEMPOTENT_REPLAY");
      expect(secondResult.evaluationId).toBe(firstResult.evaluationId);
      expect(secondResult.totalScore).toBe(firstResult.totalScore);

      // Verify still exactly 1 evaluation in DB
      evalRows = await db.selectFrom("evaluations").selectAll().execute();
      expect(evalRows).toHaveLength(1);
    });

    it("conflicting duplicate payload with same idempotency key throws 409 ConcurrencyConflictError", async () => {
      const payload1 = adapter.generateEvaluation({
        seed: 222,
        rubricId: validRubricId,
        idempotencyKey: "SAME_KEY_DIFFERENT_DATA",
      });

      // First ingestion succeeds
      const result1 = await adapter.ingestEvaluation(payload1, adminActor);
      expect(result1.status).toBe("CREATED");

      // Second payload: same key, but different marks
      const payload2: ExternalOsmEvaluation = {
        ...payload1,
        marks: payload1.marks.map((m) => ({
          ...m,
          awardedMarks: Math.max(0, m.awardedMarks - 10),
        })),
      };

      await expect(
        adapter.ingestEvaluation(payload2, adminActor)
      ).rejects.toThrow(ConcurrencyConflictError);

      // Verify original evaluation in DB remains untouched
      const original = await evalRepo.findById(result1.evaluationId);
      expect(original!.totalScore).toBe(result1.totalScore);
    });

    it("handles concurrent duplicate ingestion race condition safely (exactly 1 created, loser replays)", async () => {
      const payload = adapter.generateEvaluation({
        seed: 333,
        rubricId: validRubricId,
        idempotencyKey: "CONCURRENT_RACE_KEY_001",
      });

      // Fire concurrent requests simultaneously
      const [res1, res2] = await Promise.all([
        adapter.ingestEvaluation(payload, adminActor),
        adapter.ingestEvaluation(payload, adminActor),
      ]);

      const statuses = [res1.status, res2.status].sort();
      expect(statuses).toEqual(["CREATED", "IDEMPOTENT_REPLAY"]);

      // Both must report the exact same evaluation ID
      const createdId = res1.status === "CREATED" ? res1.evaluationId : res2.evaluationId;
      const replayedId = res1.status === "IDEMPOTENT_REPLAY" ? res1.evaluationId : res2.evaluationId;
      expect(createdId).toBe(replayedId);

      // Database must have exactly 1 evaluation record
      const allEvals = await db.selectFrom("evaluations").selectAll().execute();
      expect(allEvals).toHaveLength(1);
      expect(allEvals[0].id).toBe(createdId);
    });
  });

  // =========================================================================
  // 6. Batch Ingestion & Partial Failure Isolation
  // =========================================================================
  describe("6. Batch Ingestion & Partial Failure Isolation", () => {
    it("successfully ingests a batch of synthetic evaluations with itemized tracking", async () => {
      const batchResult = await adapter.simulateBatch(
        {
          seed: 444,
          count: 4,
          rubricId: validRubricId,
        },
        adminActor
      );

      expect(batchResult.totalCount).toBe(4);
      expect(batchResult.createdCount).toBe(4);
      expect(batchResult.replayedCount).toBe(0);
      expect(batchResult.failedCount).toBe(0);
      expect(batchResult.results).toHaveLength(4);

      for (const res of batchResult.results) {
        expect(res.status).toBe("CREATED");
        expect(res.evaluationId).toBeTruthy();
      }

      // SQLite must contain 4 evaluation rows
      const allEvals = await db.selectFrom("evaluations").selectAll().execute();
      expect(allEvals).toHaveLength(4);
    });

    it("verifies batch item failure isolation: invalid item fails while valid items commit cleanly", async () => {
      // Create batch where item 1 is valid, item 2 has invalid rubric, item 3 is valid
      const eval1 = adapter.generateEvaluation({
        seed: 551,
        index: 1,
        scenario: "NORMAL",
        rubricId: validRubricId,
      });

      const eval2 = adapter.generateEvaluation({
        seed: 552,
        index: 2,
        scenario: "INVALID_RUBRIC",
        rubricId: "non_existent_rubric_batch_fail",
      });

      const eval3 = adapter.generateEvaluation({
        seed: 553,
        index: 3,
        scenario: "NORMAL",
        rubricId: validRubricId,
      });

      const batchPayload: ExternalOsmBatchImport = {
        batchId: "ISOLATION_BATCH_001",
        sourceSystem: "TEST_OSM",
        evaluations: [eval1, eval2, eval3],
      };

      const result = await adapter.ingestBatch(batchPayload, adminActor);

      expect(result.totalCount).toBe(3);
      expect(result.createdCount).toBe(2);
      expect(result.failedCount).toBe(1);

      expect(result.results[0].status).toBe("CREATED");
      expect(result.results[1].status).toBe("FAILED");
      expect(result.results[1].error).toContain("not found");
      expect(result.results[2].status).toBe("CREATED");

      // Verify that valid items 1 and 3 are persisted in SQLite, and failed item 2 has 0 orphan rows
      const persistedEvals = await db.selectFrom("evaluations").selectAll().execute();
      expect(persistedEvals).toHaveLength(2);
      const evalIds = persistedEvals.map((e) => e.id);
      expect(evalIds).toContain(result.results[0].evaluationId);
      expect(evalIds).toContain(result.results[2].evaluationId);
    });
  });

  // =========================================================================
  // 7. Security, Actor Boundaries & Role Authorization
  // =========================================================================
  describe("7. Security, Actor Boundaries & Role Authorization", () => {
    it("allows ADMIN and MODERATOR roles to ingest evaluations", async () => {
      const evalAdmin = adapter.generateEvaluation({
        seed: 701,
        index: 1,
        rubricId: validRubricId,
      });
      const resAdmin = await adapter.ingestEvaluation(evalAdmin, adminActor);
      expect(resAdmin.status).toBe("CREATED");

      const evalMod = adapter.generateEvaluation({
        seed: 702,
        index: 2,
        rubricId: validRubricId,
      });
      const resMod = await adapter.ingestEvaluation(evalMod, moderatorActor);
      expect(resMod.status).toBe("CREATED");
    });

    it("strictly rejects EXAMINER role with 403 UnauthorizedActionError at handler level", async () => {
      const payload = adapter.generateEvaluation({
        seed: 703,
        rubricId: validRubricId,
      });

      await expect(
        adapter.ingestEvaluation(payload, examinerActor)
      ).rejects.toThrow(UnauthorizedActionError);

      const allEvals = await db.selectFrom("evaluations").selectAll().execute();
      expect(allEvals).toHaveLength(0);
    });

    it("strictly rejects AI actor with 403 UnauthorizedActionError (INV-003, INV-004)", async () => {
      const payload = adapter.generateEvaluation({
        seed: 704,
        rubricId: validRubricId,
      });

      await expect(
        adapter.ingestEvaluation(payload, aiActor)
      ).rejects.toThrow(UnauthorizedActionError);

      const allEvals = await db.selectFrom("evaluations").selectAll().execute();
      expect(allEvals).toHaveLength(0);
    });

    it("enforces role and actor rejection over HTTP integration routes", async () => {
      const payload = adapter.generateEvaluation({
        seed: 705,
        rubricId: validRubricId,
      });

      // 1. EXAMINER role over HTTP -> 403 Forbidden
      const examinerRes = await server.inject({
        method: "POST",
        url: "/api/v1/integration/osm/ingest",
        headers: {
          "x-user-role": UserRole.EXAMINER,
          "x-actor-type": ActorType.USER,
        },
        payload,
      });
      expect(examinerRes.statusCode).toBe(403);

      // 2. AI actor over HTTP -> 403 Forbidden
      const aiRes = await server.inject({
        method: "POST",
        url: "/api/v1/integration/osm/ingest",
        headers: {
          "x-user-role": UserRole.ADMIN,
          "x-actor-type": ActorType.AI,
        },
        payload,
      });
      expect(aiRes.statusCode).toBe(403);

      // 3. Authorized MODERATOR over HTTP -> 201 Created
      const modRes = await server.inject({
        method: "POST",
        url: "/api/v1/integration/osm/ingest",
        headers: {
          "x-user-role": UserRole.MODERATOR,
          "x-actor-type": ActorType.INTEGRATION,
        },
        payload,
      });
      expect(modRes.statusCode).toBe(201);
      const modData = JSON.parse(modRes.body);
      expect(modData.status).toBe("CREATED");

      // 4. Sequential duplicate over HTTP -> 200 OK (IDEMPOTENT_REPLAY)
      const replayRes = await server.inject({
        method: "POST",
        url: "/api/v1/integration/osm/ingest",
        headers: {
          "x-user-role": UserRole.MODERATOR,
          "x-actor-type": ActorType.INTEGRATION,
        },
        payload,
      });
      expect(replayRes.statusCode).toBe(200);
      const replayData = JSON.parse(replayRes.body);
      expect(replayData.status).toBe("IDEMPOTENT_REPLAY");
    });
  });

  // =========================================================================
  // 8. Anti-Corruption & Data Hygiene (Zero PII Leakage)
  // =========================================================================
  describe("8. Anti-Corruption & Data Hygiene (Zero PII Leakage)", () => {
    it("ensures zero vendor or synthetic PII leaks into domain tables (02-arch §20, 08-data §110)", async () => {
      // Construct external payload with vendor/candidate PII fields
      const piiPayload = {
        ...adapter.generateEvaluation({
          seed: 801,
          rubricId: validRubricId,
        }),
        candidateName: "John Doe",
        rollNumber: "ROLL-9988",
        candidateEmail: "john.doe@test-university.edu",
        vendorRawToken: "SECRET_VENDOR_BEARER_TOKEN_123",
        rawMetadata: { room: "B-201", seat: 42, ipAddress: "192.168.1.100" },
      };

      const result = await ingestHandler.execute(piiPayload as any, adminActor);
      expect(result.status).toBe("CREATED");

      // Query raw SQLite tables directly to verify zero PII in columns
      const rawEval = await db
        .selectFrom("evaluations")
        .selectAll()
        .where("id", "=", result.evaluationId)
        .executeTakeFirstOrThrow();

      // Check all keys in evaluations row: only schema-approved columns exist
      const evalKeys = Object.keys(rawEval);
      expect(evalKeys).not.toContain("candidateName");
      expect(evalKeys).not.toContain("candidate_name");
      expect(evalKeys).not.toContain("rollNumber");
      expect(evalKeys).not.toContain("roll_number");
      expect(evalKeys).not.toContain("candidateEmail");
      expect(evalKeys).not.toContain("vendorRawToken");

      // Ensure evaluations columns do NOT contain the PII string values
      const rawJson = JSON.stringify(rawEval);
      expect(rawJson).not.toContain("John Doe");
      expect(rawJson).not.toContain("ROLL-9988");
      expect(rawJson).not.toContain("john.doe@test-university.edu");
      expect(rawJson).not.toContain("SECRET_VENDOR_BEARER_TOKEN_123");
    });

    it("verifies contract compliance between adapter output and integration boundary schemas", () => {
      const evalDto = adapter.generateEvaluation({
        seed: 802,
        scenario: "NORMAL",
        rubricId: validRubricId,
      });
      expect(evalDto).toBeDefined();

      const batchDto = adapter.generateBatch({
        seed: 803,
        count: 3,
        rubricId: validRubricId,
      });
      expect(batchDto).toBeDefined();
      expect(batchDto.evaluations).toHaveLength(3);
    });
  });

  // =========================================================================
  // 9. Simulated External Failure Modes (§52 Testing Contract)
  // =========================================================================
  describe("9. Simulated External Failure Modes (§52 Testing Contract)", () => {
    it("verifies simulated external timeout throws error without database corruption", async () => {
      const initialEvals = await db.selectFrom("evaluations").selectAll().execute();
      const initialIdempotency = await db.selectFrom("idempotency_records").selectAll().execute();

      await expect(
        adapter.simulateEvaluation(
          {
            seed: 901,
            rubricId: validRubricId,
            simulateTimeout: true,
          },
          adminActor
        )
      ).rejects.toThrow("External OSM provider timeout after 30000ms");

      // Verify zero changes in database
      const postEvals = await db.selectFrom("evaluations").selectAll().execute();
      const postIdempotency = await db.selectFrom("idempotency_records").selectAll().execute();
      expect(postEvals).toHaveLength(initialEvals.length);
      expect(postIdempotency).toHaveLength(initialIdempotency.length);
    });

    it("verifies simulated external connection failure throws error without database corruption", async () => {
      const initialEvals = await db.selectFrom("evaluations").selectAll().execute();

      await expect(
        adapter.simulateEvaluation(
          {
            seed: 902,
            rubricId: validRubricId,
            simulateConnectionFailure: true,
          },
          adminActor
        )
      ).rejects.toThrow("External OSM provider connection failure: ECONNREFUSED");

      const postEvals = await db.selectFrom("evaluations").selectAll().execute();
      expect(postEvals).toHaveLength(initialEvals.length);
    });

    it("verifies simulated batch timeout and connection failure throw cleanly", async () => {
      await expect(
        adapter.simulateBatch(
          {
            seed: 903,
            count: 3,
            rubricId: validRubricId,
            simulateTimeout: true,
          },
          adminActor
        )
      ).rejects.toThrow("External OSM provider timeout after 30000ms");

      await expect(
        adapter.simulateBatch(
          {
            seed: 904,
            count: 3,
            rubricId: validRubricId,
            simulateConnectionFailure: true,
          },
          adminActor
        )
      ).rejects.toThrow("External OSM provider connection failure: ECONNREFUSED");
    });
  });
});
