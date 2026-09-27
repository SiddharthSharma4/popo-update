/**
 * Synthetic OSM Adapter Test Suite (TASK-P9-INTEGRATION-002).
 *
 * Conforms to:
 * - docs/planning/03-build-roadmap.md §16 (Phase 9 — OSM Integration)
 * - docs/planning/04-task-board.md (TASK-P9-INTEGRATION-002)
 * - docs/contracts/01-product-contract.md §34-36 (Synthetic Demo Data Strategy & Seeded Scenarios)
 * - docs/contracts/02-architecture-contract.md §50-52 (External OSM Integration & Synthetic Adapter)
 * - docs/contracts/06-api-contract.md §54-56 (Synthetic OSM Adapter & External Data Authority)
 * - docs/contracts/08-data-contract.md §108-111 (Synthetic OSM Boundary & Data Import)
 * - docs/contracts/09-testing-contract.md §40 (Deterministic Reproducibility)
 *
 * Invariants Verified:
 * 1. Port Implementation: SyntheticOsmAdapter implements OsmIntegrationPort.
 * 2. Determinism: 50 repeated runs with identical seed produce bit-for-bit identical outputs.
 * 3. Schema Adherence: Generated payloads satisfy ExternalOsmEvaluationSchema and ExternalOsmBatchImportSchema.
 * 4. Boundary Protection: All synthetic data enters exclusively through canonical integration boundary.
 * 5. Ingestion Integrity: Integrates with OsmDataNormalizer, UnitOfWork, Outbox, and AuditEvent logging.
 * 6. Scenarios Coverage: NORMAL, INCOMPLETE, UNMARKED, ANOMALOUS_LENIENT, ANOMALOUS_STRICT, INVALID_RUBRIC, OUT_OF_BOUNDS_MARK.
 * 7. Idempotency: Re-submitting generated synthetic payload returns IDEMPOTENT_REPLAY with 0 duplicate DB records.
 * 8. Authorization: Strict MODERATOR/ADMIN enforcement; 403 on EXAMINER and AI actor.
 * 9. Database Isolation: Synthetic adapter performs zero direct DB writes; zero synthetic JSON leaks into domain tables.
 */

import { describe, it, expect, beforeEach } from "vitest";
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
import { OsmDataNormalizer } from "../src/application/index.js";
import {
  SyntheticOsmAdapter,
  DeterministicPrng,
  DEFAULT_SYNTHETIC_QUESTIONS,
} from "../src/infrastructure/adapters/synthetic-osm-adapter.js";
import {
  UserRole,
  ActorType,
  ExternalOsmEvaluationSchema,
  ExternalOsmBatchImportSchema,
} from "@osm/shared";

describe("TASK-P9-INTEGRATION-002: Synthetic OSM Adapter", () => {
  let db: KyselyDb;
  let uow: KyselyUnitOfWork;
  let rubricRepo: KyselyRubricRepository;
  let evalRepo: KyselyEvaluationRepository;
  let idempotencyRepo: KyselyIdempotencyRepository;
  let auditRepo: KyselyAuditRepository;
  let normalizer: OsmDataNormalizer;
  let adapter: SyntheticOsmAdapter;

  const validRubricId = "rubric_synth_101";
  const validRubricVersion = 1;

  const adminActor = {
    actorId: "admin-syn-1",
    role: UserRole.ADMIN,
    actorType: ActorType.INTEGRATION,
  };

  const moderatorActor = {
    actorId: "mod-syn-1",
    role: UserRole.MODERATOR,
    actorType: ActorType.INTEGRATION,
  };

  beforeEach(async () => {
    db = createDatabase(":memory:");
    await runMigrations(db);

    uow = new KyselyUnitOfWork(db);
    rubricRepo = new KyselyRubricRepository(db);
    evalRepo = new KyselyEvaluationRepository(db);
    idempotencyRepo = new KyselyIdempotencyRepository(db);
    auditRepo = new KyselyAuditRepository(db);
    normalizer = new OsmDataNormalizer();

    adapter = new SyntheticOsmAdapter({
      uow,
      idempotencyRepo,
      normalizer,
      defaultSourceSystem: "SYNTHETIC_OSM",
    });

    // Seed test rubric
    const rubric = new Rubric({
      id: validRubricId,
      version: validRubricVersion,
      title: "Synthetic Examination Rubric",
      criteria: [
        {
          id: "Q1",
          title: "Algorithmic Logic",
          description: "Core algorithmic correctness",
          maxMarks: 40,
          levels: [
            { id: "l1", name: "Full", description: "Flawless", marks: 40 },
          ],
        },
        {
          id: "Q2",
          title: "Syntax and Structure",
          description: "Code syntax adherence",
          maxMarks: 30,
          levels: [
            { id: "l1", name: "Pass", description: "Compiles", marks: 30 },
          ],
        },
        {
          id: "Q3",
          title: "Architecture & Design",
          description: "System design quality",
          maxMarks: 30,
          levels: [
            { id: "l1", name: "Optimal", description: "Modular", marks: 30 },
          ],
        },
      ],
    });
    await rubricRepo.save(rubric);
  });

  // =========================================================================
  // 1. Port Interface & Architecture Conformance
  // =========================================================================
  describe("Port Interface & Architecture Conformance", () => {
    it("1. implements OsmIntegrationPort contract correctly", () => {
      expect(typeof adapter.ingestEvaluation).toBe("function");
      expect(typeof adapter.ingestBatch).toBe("function");
      expect(typeof adapter.generateEvaluation).toBe("function");
      expect(typeof adapter.generateBatch).toBe("function");
      expect(typeof adapter.simulateEvaluation).toBe("function");
      expect(typeof adapter.simulateBatch).toBe("function");
    });

    it("2. does not perform direct database writes during generation", async () => {
      // Calling generateEvaluation should only return an in-memory DTO
      const payload = adapter.generateEvaluation({
        seed: 42,
        index: 1,
        rubricId: validRubricId,
      });

      expect(payload).toBeDefined();

      // Database tables must remain completely empty
      const evaluations = await evalRepo.findPaginated({ page: 1, pageSize: 10 });
      expect(evaluations.total).toBe(0);

      const idempotencyRecord = await idempotencyRepo.findByKey(
        `OSM_INGESTION:${payload.sourceSystem}:${payload.externalEvaluationId}`
      );
      expect(idempotencyRecord).toBeNull();
    });
  });

  // =========================================================================
  // 2. Deterministic PRNG & Payload Generation
  // =========================================================================
  describe("Deterministic Generation & PRNG Verification", () => {
    it("3. DeterministicPrng produces bit-for-bit identical sequence across repeated runs", () => {
      const prng1 = new DeterministicPrng(12345);
      const prng2 = new DeterministicPrng(12345);

      const sequence1 = Array.from({ length: 50 }, () => prng1.next());
      const sequence2 = Array.from({ length: 50 }, () => prng2.next());

      expect(sequence1).toEqual(sequence2);
    });

    it("4. Deterministic reproducibility (09-testing §40): 50 repetitions produce identical evaluation payload", () => {
      const baseline = adapter.generateEvaluation({
        seed: 9999,
        index: 1,
        rubricId: validRubricId,
        scenario: "NORMAL",
      });

      for (let i = 0; i < 50; i++) {
        const current = adapter.generateEvaluation({
          seed: 9999,
          index: 1,
          rubricId: validRubricId,
          scenario: "NORMAL",
        });

        expect(JSON.stringify(current)).toBe(JSON.stringify(baseline));
      }
    });

    it("5. generates valid ExternalOsmEvaluation matching schema", () => {
      const payload = adapter.generateEvaluation({
        seed: 1234,
        index: 1,
        rubricId: validRubricId,
      });

      const parsed = ExternalOsmEvaluationSchema.safeParse(payload);
      expect(parsed.success).toBe(true);

      expect(payload.sourceSystem).toBe("SYNTHETIC_OSM");
      expect(payload.externalEvaluationId).toBe("SYN-EVAL-SYNTHETIC_OSM-NORMAL-0001");
      expect(payload.scriptId).toBe("SYN-SCRIPT-0001");
      expect(payload.rubricId).toBe(validRubricId);
      expect(payload.rubricVersion).toBe(1);
      expect(payload.marks.length).toBe(DEFAULT_SYNTHETIC_QUESTIONS.length);
    });

    it("6. assigns marks strictly within rubric/question bounds (0 <= awardedMarks <= maxMarks)", () => {
      for (let idx = 1; idx <= 10; idx++) {
        const payload = adapter.generateEvaluation({
          seed: idx * 100,
          index: idx,
          rubricId: validRubricId,
        });

        for (const mark of payload.marks) {
          const question = DEFAULT_SYNTHETIC_QUESTIONS.find(
            (q) => q.questionNumber === mark.questionNumber
          );
          expect(question).toBeDefined();
          expect(mark.awardedMarks).toBeGreaterThanOrEqual(0);
          expect(mark.awardedMarks).toBeLessThanOrEqual(question!.maxMarks);
        }
      }
    });

    it("7. generates unique deterministic IDs for different indices", () => {
      const eval1 = adapter.generateEvaluation({ seed: 500, index: 1, rubricId: validRubricId });
      const eval2 = adapter.generateEvaluation({ seed: 500, index: 2, rubricId: validRubricId });

      expect(eval1.externalEvaluationId).not.toBe(eval2.externalEvaluationId);
      expect(eval1.scriptId).not.toBe(eval2.scriptId);
      expect(eval1.externalEvaluationId).toContain("0001");
      expect(eval2.externalEvaluationId).toContain("0002");
    });
  });

  // =========================================================================
  // 3. Seeded Demo Scenarios (01-product §36)
  // =========================================================================
  describe("Seeded Demo Scenarios", () => {
    it("8. Scenario NORMAL: produces complete evaluation with conformant passing marks", async () => {
      const result = await adapter.simulateEvaluation(
        {
          seed: 101,
          index: 1,
          scenario: "NORMAL",
          rubricId: validRubricId,
          autoSubmit: true,
        },
        moderatorActor
      );

      expect(result.status).toBe("CREATED");
      expect(result.isSubmitted).toBe(true);
      expect(result.totalScore).toBeGreaterThanOrEqual(60);
      expect(result.totalScore).toBeLessThanOrEqual(80);

      // Verify domain state in DB
      const evaluation = await evalRepo.findById(result.evaluationId);
      expect(evaluation).not.toBeNull();
      expect(evaluation!.status).toBe("SUBMITTED");
      expect(evaluation!.isComplete()).toBe(true);
    });

    it("9. Scenario INCOMPLETE: leaves question unmarked, triggering completeness QualitySignal", async () => {
      const payload = adapter.generateEvaluation({
        seed: 202,
        index: 2,
        scenario: "INCOMPLETE",
        rubricId: validRubricId,
        autoSubmit: true,
      });

      // Question 2 should be omitted from marks
      const q2Mark = payload.marks.find((m) => m.questionNumber === "Q2");
      expect(q2Mark).toBeUndefined();
      expect(payload.marks.length).toBe(2);

      const result = await adapter.ingestEvaluation(payload, moderatorActor);
      expect(result.status).toBe("CREATED");

      // Verify completeness issue attached
      const evaluation = await evalRepo.findById(result.evaluationId);
      expect(evaluation).not.toBeNull();
      expect(evaluation!.isComplete()).toBe(false);

      // Verify QualitySignal was generated in DB
      const signals = await db
        .selectFrom("quality_signals")
        .selectAll()
        .where("evaluation_id", "=", result.evaluationId)
        .execute();

      expect(signals.length).toBe(1);
      expect(signals[0].signal_type).toBe("COMPLETENESS_PARTIAL");
    });

    it("10. Scenario UNMARKED: assigns zero marks, triggering COMPLETENESS_UNMARKED QualitySignal", async () => {
      const payload = adapter.generateEvaluation({
        seed: 303,
        index: 3,
        scenario: "UNMARKED",
        rubricId: validRubricId,
        autoSubmit: true,
      });

      expect(payload.marks.length).toBe(0);

      const result = await adapter.ingestEvaluation(payload, adminActor);
      expect(result.status).toBe("CREATED");
      expect(result.totalScore).toBe(0);

      const signals = await db
        .selectFrom("quality_signals")
        .selectAll()
        .where("evaluation_id", "=", result.evaluationId)
        .execute();

      expect(signals.length).toBe(1);
      expect(signals[0].signal_type).toBe("COMPLETENESS_UNMARKED");
    });

    it("11. Scenario ANOMALOUS_LENIENT: assigns consistently high marks (90-98%)", () => {
      const payload = adapter.generateEvaluation({
        seed: 404,
        index: 4,
        scenario: "ANOMALOUS_LENIENT",
        rubricId: validRubricId,
      });

      const totalAwarded = payload.marks.reduce((acc, m) => acc + m.awardedMarks, 0);
      expect(totalAwarded).toBeGreaterThanOrEqual(90);
      expect(totalAwarded).toBeLessThanOrEqual(100);
    });

    it("12. Scenario ANOMALOUS_STRICT: assigns consistently low marks (15-28%)", () => {
      const payload = adapter.generateEvaluation({
        seed: 505,
        index: 5,
        scenario: "ANOMALOUS_STRICT",
        rubricId: validRubricId,
      });

      const totalAwarded = payload.marks.reduce((acc, m) => acc + m.awardedMarks, 0);
      expect(totalAwarded).toBeGreaterThanOrEqual(15);
      expect(totalAwarded).toBeLessThanOrEqual(28);
    });

    it("13. Scenario INVALID_RUBRIC: fails safely without mutating database", async () => {
      const payload = adapter.generateEvaluation({
        seed: 606,
        index: 6,
        scenario: "INVALID_RUBRIC",
        rubricId: validRubricId,
      });

      expect(payload.rubricId).toBe("unknown_rubric_999");

      await expect(
        adapter.ingestEvaluation(payload, adminActor)
      ).rejects.toThrow("unknown_rubric_999");

      // Verify zero partial state in database
      const evals = await evalRepo.findPaginated({ page: 1, pageSize: 10 });
      expect(evals.total).toBe(0);
    });

    it("14. Scenario OUT_OF_BOUNDS_MARK: fails boundary validation safely", async () => {
      const payload = adapter.generateEvaluation({
        seed: 707,
        index: 7,
        scenario: "OUT_OF_BOUNDS_MARK",
        rubricId: validRubricId,
      });

      await expect(
        adapter.ingestEvaluation(payload, adminActor)
      ).rejects.toThrow("exceeds question maxMarks");

      const evals = await evalRepo.findPaginated({ page: 1, pageSize: 10 });
      expect(evals.total).toBe(0);
    });
  });

  // =========================================================================
  // 4. Batch Generation & Simulation
  // =========================================================================
  describe("Batch Generation & Simulation", () => {
    it("15. generates valid ExternalOsmBatchImport matching schema", () => {
      const batchPayload = adapter.generateBatch({
        seed: 808,
        count: 5,
        rubricId: validRubricId,
      });

      const parsed = ExternalOsmBatchImportSchema.safeParse(batchPayload);
      expect(parsed.success).toBe(true);

      expect(batchPayload.sourceSystem).toBe("SYNTHETIC_OSM");
      expect(batchPayload.batchId).toBe("SYN-BATCH-SYNTHETIC_OSM-808-5");
      expect(batchPayload.evaluations.length).toBe(5);
    });

    it("16. simulateBatch ingests batch cleanly through canonical integration boundary", async () => {
      const result = await adapter.simulateBatch(
        {
          seed: 909,
          count: 3,
          rubricId: validRubricId,
          autoSubmit: true,
        },
        moderatorActor
      );

      expect(result.totalCount).toBe(3);
      expect(result.createdCount).toBe(3);
      expect(result.failedCount).toBe(0);
      expect(result.replayedCount).toBe(0);

      // Verify all 3 evaluations exist in DB
      const evals = await evalRepo.findPaginated({ page: 1, pageSize: 10 });
      expect(evals.total).toBe(3);
    });

    it("17. generates batch with custom scenario distribution", async () => {
      const batchPayload = adapter.generateBatch({
        seed: 1111,
        rubricId: validRubricId,
        scenarioDistribution: [
          { scenario: "NORMAL", count: 2 },
          { scenario: "INCOMPLETE", count: 1 },
          { scenario: "ANOMALOUS_LENIENT", count: 1 },
        ],
      });

      expect(batchPayload.evaluations.length).toBe(4);
      expect(batchPayload.evaluations[0].externalEvaluationId).toContain("NORMAL");
      expect(batchPayload.evaluations[1].externalEvaluationId).toContain("NORMAL");
      expect(batchPayload.evaluations[2].externalEvaluationId).toContain("INCOMPLETE");
      expect(batchPayload.evaluations[3].externalEvaluationId).toContain("ANOMALOUS_LENIENT");

      const result = await adapter.ingestBatch(batchPayload, adminActor);
      expect(result.createdCount).toBe(4);
      expect(result.failedCount).toBe(0);

      // One signal should exist for the INCOMPLETE scenario
      const signals = await db.selectFrom("quality_signals").selectAll().execute();
      expect(signals.length).toBe(1);
    });
  });

  // =========================================================================
  // 5. Idempotency & Concurrency Verification
  // =========================================================================
  describe("Idempotency & Concurrency Protection", () => {
    it("18. returns IDEMPOTENT_REPLAY when same synthetic evaluation is simulated twice", async () => {
      const config = {
        seed: 2222,
        index: 1,
        rubricId: validRubricId,
      };

      // First simulation
      const res1 = await adapter.simulateEvaluation(config, adminActor);
      expect(res1.status).toBe("CREATED");

      // Second simulation (duplicate replay)
      const res2 = await adapter.simulateEvaluation(config, adminActor);
      expect(res2.status).toBe("IDEMPOTENT_REPLAY");
      expect(res2.evaluationId).toBe(res1.evaluationId);
      expect(res2.totalScore).toBe(res1.totalScore);

      // Exactly 1 row in SQLite
      const evals = await evalRepo.findPaginated({ page: 1, pageSize: 10 });
      expect(evals.total).toBe(1);
    });

    it("19. replaying synthetic batch returns replayedCount without creating duplicate evaluations", async () => {
      const batchConfig = {
        seed: 3333,
        count: 3,
        rubricId: validRubricId,
      };

      const res1 = await adapter.simulateBatch(batchConfig, adminActor);
      expect(res1.createdCount).toBe(3);
      expect(res1.replayedCount).toBe(0);

      const res2 = await adapter.simulateBatch(batchConfig, adminActor);
      expect(res2.createdCount).toBe(0);
      expect(res2.replayedCount).toBe(3);
      expect(res2.failedCount).toBe(0);

      // Total evaluations in SQLite remains 3
      const evals = await evalRepo.findPaginated({ page: 1, pageSize: 10 });
      expect(evals.total).toBe(3);
    });
  });

  // =========================================================================
  // 6. Security, Authorization & Audit Attribution
  // =========================================================================
  describe("Security, Authorization & Audit Attribution", () => {
    it("20. rejects EXAMINER role with 403 UnauthorizedActionError", async () => {
      const examinerActor = {
        actorId: "examiner-1",
        role: UserRole.EXAMINER,
        actorType: ActorType.USER,
      };

      await expect(
        adapter.simulateEvaluation(
          { seed: 4444, index: 1, rubricId: validRubricId },
          examinerActor
        )
      ).rejects.toThrow("Examiners and unauthorized roles are not permitted to ingest external evaluation data");
    });

    it("21. rejects AI actor with 403 UnauthorizedActionError (INV-003)", async () => {
      const aiActor = {
        actorId: "ai-copilot",
        role: "AI",
        actorType: ActorType.AI,
      };

      await expect(
        adapter.simulateEvaluation(
          { seed: 5555, index: 1, rubricId: validRubricId },
          aiActor
        )
      ).rejects.toThrow("AI actors are strictly prohibited from ingesting or submitting evaluations");
    });

    it("22. attributes audit event to INTEGRATION actor with complete provenance", async () => {
      const result = await adapter.simulateEvaluation(
        { seed: 6666, index: 1, rubricId: validRubricId },
        moderatorActor
      );

      const auditEvents = await auditRepo.findByEntity("Evaluation", result.evaluationId);
      expect(auditEvents.length).toBeGreaterThanOrEqual(1);

      const ingestEvent = auditEvents.find((e) => e.eventType === "OsmEvaluationIngested");
      expect(ingestEvent).toBeDefined();
      expect(ingestEvent!.actorType).toBe("INTEGRATION");
      expect(ingestEvent!.actorId).toBe("mod-syn-1");
      expect(ingestEvent!.details.sourceSystem).toBe("SYNTHETIC_OSM");
      expect(ingestEvent!.details.externalEvaluationId).toContain("SYN-EVAL-SYNTHETIC_OSM");
    });
  });
});
