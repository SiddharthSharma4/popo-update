/**
 * TASK-P10-HARDEN-004 — MVP Performance and Reliability Verification Test Suite.
 *
 * Conforms to:
 * - docs/contracts/02-architecture-contract.md §65 (Performance Principles: demo-scale operation, efficient queries, bounded AI, no premature complexity)
 * - docs/contracts/09-testing-contract.md §76 (Performance Testing: evaluation retrieval/submission, triage queue, case resolution, outbox, audit retrieval)
 * - docs/contracts/09-testing-contract.md §77 (Load & Reliability Testing: throughput, latency, resource utilization, database behavior, concurrency, failure recovery)
 * - docs/contracts/10-demo-contract.md §64 (Demo Performance: responsive feel, honest async representation, no artificial delays)
 * - docs/contracts/01-product-contract.md §38 (Success Metrics: operational responsiveness, deterministic demo repeatability)
 * - docs/contracts/06-api-contract.md §88 (API Observability: request latency, trace attribution, error codes)
 * - docs/contracts/08-data-contract.md §28-31, §43-45 (ACID rollback, optimistic concurrency, idempotency replay)
 *
 * Systematically measures and verifies:
 * 1. Request latency distributions (min, p50, p90, p95, p99, max, mean) across critical endpoints.
 * 2. Throughput (requests/sec) for read, write, and analytical operations.
 * 3. Idempotent replay vs fresh ingestion latency.
 * 4. Concurrent race condition handling & optimistic locking contention (409 vs 200, zero 500s).
 * 5. High-concurrency parallel ingestion throughput without lock timeouts.
 * 6. Fault isolation and zero partial database writes under rapid failure injection.
 * 7. Memory stability (heapUsed delta) and resource release.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { performance } from "node:perf_hooks";
import type { FastifyInstance } from "fastify";
import { createServer } from "../src/presentation/server.js";
import { createDatabase, type KyselyDb } from "../src/infrastructure/database/database.js";
import { runMigrations } from "../src/infrastructure/database/migrator.js";
import {
  KyselyRubricRepository,
  KyselyQualitySignalRepository,
} from "../src/infrastructure/repositories/index.js";
import {
  Rubric,
  QualitySignal,
  QualitySignalStatus,
  SignalSeverity,
  ResolutionOutcome,
} from "../src/domain/index.js";
import { UserRole, ActorType } from "@osm/shared";

interface MetricSummary {
  operation: string;
  count: number;
  minMs: number;
  p50Ms: number;
  p90Ms: number;
  p95Ms: number;
  p99Ms: number;
  maxMs: number;
  meanMs: number;
  throughputRps: number;
  errorCount: number;
}

function computeMetrics(operation: string, latencies: number[], totalElapsedMs: number, errorCount = 0): MetricSummary {
  if (latencies.length === 0) {
    return {
      operation,
      count: 0,
      minMs: 0,
      p50Ms: 0,
      p90Ms: 0,
      p95Ms: 0,
      p99Ms: 0,
      maxMs: 0,
      meanMs: 0,
      throughputRps: 0,
      errorCount,
    };
  }

  const sorted = [...latencies].sort((a, b) => a - b);
  const count = sorted.length;
  const minMs = Number(sorted[0].toFixed(2));
  const maxMs = Number(sorted[count - 1].toFixed(2));
  const meanMs = Number((sorted.reduce((acc, val) => acc + val, 0) / count).toFixed(2));

  const percentile = (p: number) => {
    const index = Math.ceil((p / 100) * count) - 1;
    return Number(sorted[Math.max(0, Math.min(index, count - 1))].toFixed(2));
  };

  const p50Ms = percentile(50);
  const p90Ms = percentile(90);
  const p95Ms = percentile(95);
  const p99Ms = percentile(99);

  const durationSec = totalElapsedMs / 1000;
  const throughputRps = Number((count / (durationSec > 0 ? durationSec : 0.001)).toFixed(2));

  return {
    operation,
    count,
    minMs,
    p50Ms,
    p90Ms,
    p95Ms,
    p99Ms,
    maxMs,
    meanMs,
    throughputRps,
    errorCount,
  };
}

describe("TASK-P10-HARDEN-004: MVP Performance and Reliability Verification", () => {
  let db: KyselyDb;
  let server: FastifyInstance;
  let rubricRepo: KyselyRubricRepository;
  let signalRepo: KyselyQualitySignalRepository;

  const rubricId = "rubric_perf_100";
  const rubricVersion = 1;
  const allRecordedMetrics: MetricSummary[] = [];

  beforeAll(async () => {
    db = createDatabase(":memory:");
    await runMigrations(db);

    rubricRepo = new KyselyRubricRepository(db);
    signalRepo = new KyselyQualitySignalRepository(db);

    // Seed master rubric
    await rubricRepo.save(
      new Rubric({
        id: rubricId,
        version: rubricVersion,
        title: "Performance & Reliability Verification Rubric",
        criteria: [
          {
            id: "crit_core_1",
            title: "Core Verification",
            description: "Correctness of core domain logic",
            maxMarks: 20,
          },
          {
            id: "crit_core_2",
            title: "System Reliability",
            description: "Fault tolerance and ACID rollback verification",
            maxMarks: 30,
          },
        ],
      })
    );

    server = await createServer({
      config: {
        NODE_ENV: "test",
        PORT: 4004,
        HOST: "127.0.0.1",
        DATABASE_URL: ":memory:",
        CORS_ORIGIN: "*",
        AI_PROVIDER: "mock",
        AI_API_KEY: "",
      },
      db,
    });
    await server.ready();
  });

  afterAll(async () => {
    await server.close();
    await db.destroy();

    // Output formatted metrics summary for verification records
    console.log("\n==========================================================================================");
    console.log("            TASK-P10-HARDEN-004 BENCHMARK & PERFORMANCE MEASUREMENT MATRIX               ");
    console.log("==========================================================================================");
    console.log(
      "Operation".padEnd(32) +
        "Count".padStart(8) +
        "Min(ms)".padStart(10) +
        "p50(ms)".padStart(10) +
        "p95(ms)".padStart(10) +
        "p99(ms)".padStart(10) +
        "Max(ms)".padStart(10) +
        "RPS".padStart(10)
    );
    console.log("-".repeat(100));
    for (const m of allRecordedMetrics) {
      console.log(
        m.operation.padEnd(32) +
          String(m.count).padStart(8) +
          String(m.minMs).padStart(10) +
          String(m.p50Ms).padStart(10) +
          String(m.p95Ms).padStart(10) +
          String(m.p99Ms).padStart(10) +
          String(m.maxMs).padStart(10) +
          String(m.throughputRps).padStart(10)
      );
    }
    console.log("==========================================================================================\n");
  });

  // --------------------------------------------------------------------------
  // 1. Evaluation Workflow Lifecycle Benchmark
  // --------------------------------------------------------------------------
  describe("1. Evaluation Workflow Lifecycle Latency & Throughput", () => {
    const iterationCount = 50;

    it("measures CreateEvaluation latency & throughput over 50 iterations", async () => {
      // Warm up
      for (let i = 0; i < 3; i++) {
        await server.inject({
          method: "POST",
          url: "/api/v1/evaluations",
          headers: {
            "x-user-role": UserRole.EXAMINER,
            "x-evaluator-id": `evaluator_warmup_${i}`,
            "x-user-id": `evaluator_warmup_${i}`,
            "x-actor-type": ActorType.USER,
          },
          payload: {
            id: `eval_warmup_${i}`,
            evaluationCycleId: "cycle_warmup",
            scriptId: `script_warmup_${i}`,
            evaluatorId: `evaluator_warmup_${i}`,
            rubricId,
            rubricVersion,
            questions: [
              { id: `q_w1_${i}`, questionNumber: "1", text: "Q1", maxMarks: 20, rubricCriteriaId: "crit_core_1", orderIndex: 0 },
              { id: `q_w2_${i}`, questionNumber: "2", text: "Q2", maxMarks: 30, rubricCriteriaId: "crit_core_2", orderIndex: 1 },
            ],
          },
        });
      }

      // Measured iterations
      const latencies: number[] = [];
      let errors = 0;
      const tStart = performance.now();

      for (let i = 0; i < iterationCount; i++) {
        const evalId = `eval_perf_${i}`;
        const evaluatorId = `evaluator_bench_${i}`;
        const reqStart = performance.now();

        const res = await server.inject({
          method: "POST",
          url: "/api/v1/evaluations",
          headers: {
            "x-user-role": UserRole.EXAMINER,
            "x-evaluator-id": evaluatorId,
            "x-user-id": evaluatorId,
            "x-actor-type": ActorType.USER,
          },
          payload: {
            id: evalId,
            evaluationCycleId: "cycle_bench_2026",
            scriptId: `script_bench_${i}`,
            evaluatorId,
            rubricId,
            rubricVersion,
            questions: [
              { id: `q_b1_${i}`, questionNumber: "1", text: "Explain time complexity.", maxMarks: 20, rubricCriteriaId: "crit_core_1", orderIndex: 0 },
              { id: `q_b2_${i}`, questionNumber: "2", text: "Implement binary search.", maxMarks: 30, rubricCriteriaId: "crit_core_2", orderIndex: 1 },
            ],
          },
        });

        latencies.push(performance.now() - reqStart);
        if (res.statusCode !== 201) {
          errors++;
        }
      }

      const totalElapsed = performance.now() - tStart;
      const metrics = computeMetrics("POST /evaluations (Create)", latencies, totalElapsed, errors);
      allRecordedMetrics.push(metrics);

      expect(errors).toBe(0);
      expect(metrics.count).toBe(iterationCount);
      expect(metrics.p95Ms).toBeGreaterThan(0);
    });

    it("measures AssignMark latency & throughput over 50 iterations", async () => {
      const latencies: number[] = [];
      let errors = 0;
      const tStart = performance.now();

      for (let i = 0; i < iterationCount; i++) {
        const evalId = `eval_perf_${i}`;
        const evaluatorId = `evaluator_bench_${i}`;
        const reqStart = performance.now();

        const res = await server.inject({
          method: "PATCH",
          url: `/api/v1/evaluations/${evalId}`,
          headers: {
            "x-user-role": UserRole.EXAMINER,
            "x-evaluator-id": evaluatorId,
            "x-user-id": evaluatorId,
            "x-actor-type": ActorType.USER,
          },
          payload: {
            expectedVersion: 1,
            marks: [
              { questionId: `q_b1_${i}`, awardedMarks: 18, comments: "Optimal algorithmic solution" },
              { questionId: `q_b2_${i}`, awardedMarks: 28, comments: "Clean edge case handling" },
            ],
          },
        });

        latencies.push(performance.now() - reqStart);
        if (res.statusCode !== 200) errors++;
      }

      const totalElapsed = performance.now() - tStart;
      const metrics = computeMetrics("PATCH /evaluations/:id (Mark)", latencies, totalElapsed, errors);
      allRecordedMetrics.push(metrics);

      expect(errors).toBe(0);
      expect(metrics.count).toBe(iterationCount);
    });

    it("measures SubmitEvaluation latency & throughput over 50 iterations", async () => {
      const latencies: number[] = [];
      let errors = 0;
      const tStart = performance.now();

      for (let i = 0; i < iterationCount; i++) {
        const evalId = `eval_perf_${i}`;
        const evaluatorId = `evaluator_bench_${i}`;
        const reqStart = performance.now();

        const res = await server.inject({
          method: "POST",
          url: `/api/v1/evaluations/${evalId}/submit`,
          headers: {
            "x-user-role": UserRole.EXAMINER,
            "x-evaluator-id": evaluatorId,
            "x-user-id": evaluatorId,
            "x-actor-type": ActorType.USER,
          },
          payload: {
            expectedVersion: 2,
          },
        });

        latencies.push(performance.now() - reqStart);
        if (res.statusCode !== 200) errors++;
      }

      const totalElapsed = performance.now() - tStart;
      const metrics = computeMetrics("POST /evaluations/:id/submit", latencies, totalElapsed, errors);
      allRecordedMetrics.push(metrics);

      expect(errors).toBe(0);
      expect(metrics.count).toBe(iterationCount);

      // Verify database integrity: exactly 50 evaluations in SUBMITTED state
      const countSubmitted = await db
        .selectFrom("evaluations")
        .where("status", "=", "SUBMITTED")
        .where("id", "like", "eval_perf_%")
        .selectAll()
        .execute();
      expect(countSubmitted.length).toBe(iterationCount);

      // Verify outbox persistence: at least 50 EvaluationSubmitted events
      const outboxEvents = await db
        .selectFrom("outbox_events")
        .where("event_type", "=", "EvaluationSubmitted")
        .selectAll()
        .execute();
      expect(outboxEvents.length).toBeGreaterThanOrEqual(iterationCount);
    });

    it("measures GetEvaluationById query latency over 50 iterations", async () => {
      const latencies: number[] = [];
      let errors = 0;
      const tStart = performance.now();

      for (let i = 0; i < iterationCount; i++) {
        const evalId = `eval_perf_${i}`;
        const reqStart = performance.now();

        const res = await server.inject({
          method: "GET",
          url: `/api/v1/evaluations/${evalId}`,
          headers: { "x-user-role": UserRole.MODERATOR, "x-actor-type": ActorType.USER },
        });

        latencies.push(performance.now() - reqStart);
        if (res.statusCode !== 200) errors++;
      }

      const totalElapsed = performance.now() - tStart;
      const metrics = computeMetrics("GET /evaluations/:id (Query)", latencies, totalElapsed, errors);
      allRecordedMetrics.push(metrics);

      expect(errors).toBe(0);
      expect(metrics.count).toBe(iterationCount);
    });

    it("measures ListEvaluations paginated collection query latency over 50 iterations", async () => {
      const latencies: number[] = [];
      let errors = 0;
      const tStart = performance.now();

      for (let i = 0; i < iterationCount; i++) {
        const reqStart = performance.now();

        const res = await server.inject({
          method: "GET",
          url: "/api/v1/evaluations?page=1&pageSize=20&status=SUBMITTED",
          headers: { "x-user-role": UserRole.MODERATOR, "x-actor-type": ActorType.USER },
        });

        latencies.push(performance.now() - reqStart);
        if (res.statusCode !== 200) errors++;
      }

      const totalElapsed = performance.now() - tStart;
      const metrics = computeMetrics("GET /evaluations (List/Paginate)", latencies, totalElapsed, errors);
      allRecordedMetrics.push(metrics);

      expect(errors).toBe(0);
      expect(metrics.count).toBe(iterationCount);
    });
  });

  // --------------------------------------------------------------------------
  // 2. Moderation & Triage Lifecycle Benchmark
  // --------------------------------------------------------------------------
  describe("2. Moderation & Triage Lifecycle Latency & Throughput", () => {
    const triageCount = 30;

    beforeAll(async () => {
      // Pre-seed 30 QualitySignals for the 30 triage cases
      for (let i = 0; i < triageCount; i++) {
        await signalRepo.save(
          QualitySignal.create({
            id: `sig_perf_${i}`,
            evaluationId: `eval_perf_${i}`,
            evaluationVersion: 3,
            signalType: "STATISTICAL_OUTLIER",
            severity: SignalSeverity.HIGH,
            status: QualitySignalStatus.GENERATED,
            summary: "Performance verification test signal",
            evidence: { score: 10 },
            detector: {
              type: "STATISTICAL",
              name: "STATISTICAL_OUTLIER",
              version: "1.0",
            },
          })
        );
      }
    });

    it("measures CreateTriageCase, Assign, and Resolve latencies over 30 cycles", async () => {
      // 1. Create Triage Cases
      const createLatencies: number[] = [];
      let createErrors = 0;
      const tCreateStart = performance.now();

      for (let i = 0; i < triageCount; i++) {
        const caseId = `case_perf_${i}`;
        const reqStart = performance.now();

        const res = await server.inject({
          method: "POST",
          url: "/api/v1/triage-cases",
          headers: {
            "x-user-role": UserRole.MODERATOR,
            "x-actor-type": ActorType.USER,
            "x-user-id": "moderator_lead",
          },
          payload: {
            id: caseId,
            qualitySignalId: `sig_perf_${i}`,
            priority: "HIGH",
            notes: "Performance verification triage case",
          },
        });

        createLatencies.push(performance.now() - reqStart);
        if (res.statusCode !== 201) createErrors++;
      }

      const createElapsed = performance.now() - tCreateStart;
      allRecordedMetrics.push(
        computeMetrics("POST /triage-cases (Create)", createLatencies, createElapsed, createErrors)
      );
      expect(createErrors).toBe(0);

      // 2. Assign Triage Cases (reassign to reviewer)
      const assignLatencies: number[] = [];
      let assignErrors = 0;
      const tAssignStart = performance.now();

      for (let i = 0; i < triageCount; i++) {
        const caseId = `case_perf_${i}`;
        const reqStart = performance.now();

        const res = await server.inject({
          method: "POST",
          url: `/api/v1/triage-cases/${caseId}/assign`,
          headers: {
            "x-user-role": UserRole.MODERATOR,
            "x-actor-type": ActorType.USER,
            "x-user-id": "moderator_lead",
          },
          payload: {
            assigneeId: `reviewer_assigned_${i}`,
            expectedVersion: 1,
          },
        });

        assignLatencies.push(performance.now() - reqStart);
        if (res.statusCode !== 200) assignErrors++;
      }

      const assignElapsed = performance.now() - tAssignStart;
      allRecordedMetrics.push(
        computeMetrics("POST /triage-cases/:id/assign", assignLatencies, assignElapsed, assignErrors)
      );
      expect(assignErrors).toBe(0);

      // 3. Resolve Triage Cases
      const resolveLatencies: number[] = [];
      let resolveErrors = 0;
      const tResolveStart = performance.now();

      for (let i = 0; i < triageCount; i++) {
        const caseId = `case_perf_${i}`;
        const reqStart = performance.now();

        const res = await server.inject({
          method: "POST",
          url: `/api/v1/triage-cases/${caseId}/resolve`,
          headers: {
            "x-user-role": UserRole.MODERATOR,
            "x-actor-type": ActorType.USER,
            "x-user-id": "lead_moderator_dr_smith",
          },
          payload: {
            outcome: ResolutionOutcome.CONFIRMED_VALID,
            reason: "Performance benchmark verified resolution justification.",
            expectedVersion: 2,
          },
        });

        resolveLatencies.push(performance.now() - reqStart);
        if (res.statusCode !== 200) resolveErrors++;
      }

      const resolveElapsed = performance.now() - tResolveStart;
      allRecordedMetrics.push(
        computeMetrics("POST /triage-cases/:id/resolve", resolveLatencies, resolveElapsed, resolveErrors)
      );
      expect(resolveErrors).toBe(0);

      // 4. List Triage Cases
      const listLatencies: number[] = [];
      let listErrors = 0;
      const tListStart = performance.now();

      for (let i = 0; i < triageCount; i++) {
        const reqStart = performance.now();
        const res = await server.inject({
          method: "GET",
          url: "/api/v1/triage-cases?status=RESOLVED&page=1&pageSize=20",
          headers: { "x-user-role": UserRole.MODERATOR, "x-actor-type": ActorType.USER },
        });

        listLatencies.push(performance.now() - reqStart);
        if (res.statusCode !== 200) listErrors++;
      }

      const listElapsed = performance.now() - tListStart;
      allRecordedMetrics.push(
        computeMetrics("GET /triage-cases (List)", listLatencies, listElapsed, listErrors)
      );
      expect(listErrors).toBe(0);

      // Verify database integrity: exactly 30 resolved cases in database
      const resolvedDb = await db
        .selectFrom("triage_cases")
        .where("status", "=", "RESOLVED")
        .where("id", "like", "case_perf_%")
        .selectAll()
        .execute();
      expect(resolvedDb.length).toBe(triageCount);

      // Verify resolution records table: exactly 30 resolutions
      const resolutionsDb = await db
        .selectFrom("resolutions")
        .where("triage_case_id", "like", "case_perf_%")
        .selectAll()
        .execute();
      expect(resolutionsDb.length).toBe(triageCount);
    });
  });

  // --------------------------------------------------------------------------
  // 3. OSM Integration Ingestion & Idempotent Replay Benchmark
  // --------------------------------------------------------------------------
  describe("3. OSM Integration Ingestion & Idempotent Replay Benchmark", () => {
    const ingestCount = 30;

    it("measures fresh ingestion latency vs cached idempotent replay latency", async () => {
      const payloads = Array.from({ length: ingestCount }, (_, i) => ({
        externalEvaluationId: `ext_eval_perf_${i}`,
        sourceSystem: "PERF_VENDOR_OSM",
        evaluationCycleId: "cycle_perf_osm",
        scriptId: `script_ext_${i}`,
        evaluatorId: `evaluator_ext_${i}`,
        rubricId,
        rubricVersion,
        questions: [
          { questionNumber: "1", text: "Q1", maxMarks: 20, rubricCriteriaId: "crit_core_1" },
          { questionNumber: "2", text: "Q2", maxMarks: 30, rubricCriteriaId: "crit_core_2" },
        ],
        marks: [
          { questionNumber: "1", awardedMarks: 15 },
          { questionNumber: "2", awardedMarks: 25 },
        ],
        autoSubmit: false,
      }));

      // Phase A: Fresh Ingestion
      const freshLatencies: number[] = [];
      let freshErrors = 0;
      const tFreshStart = performance.now();

      for (let i = 0; i < ingestCount; i++) {
        const reqStart = performance.now();
        const res = await server.inject({
          method: "POST",
          url: "/api/v1/integration/osm/ingest",
          headers: {
            "x-user-role": UserRole.MODERATOR,
            "x-actor-type": ActorType.USER,
          },
          payload: payloads[i],
        });

        freshLatencies.push(performance.now() - reqStart);
        if (res.statusCode !== 200 && res.statusCode !== 201) freshErrors++;
        const body = JSON.parse(res.payload);
        if (body.status !== "CREATED") freshErrors++;
      }

      const freshElapsed = performance.now() - tFreshStart;
      const freshMetrics = computeMetrics(
        "POST /integration/osm (Fresh)",
        freshLatencies,
        freshElapsed,
        freshErrors
      );
      allRecordedMetrics.push(freshMetrics);
      expect(freshErrors).toBe(0);

      // Phase B: Idempotent Replay (exact same payloads)
      const replayLatencies: number[] = [];
      let replayErrors = 0;
      const tReplayStart = performance.now();

      for (let i = 0; i < ingestCount; i++) {
        const reqStart = performance.now();
        const res = await server.inject({
          method: "POST",
          url: "/api/v1/integration/osm/ingest",
          headers: {
            "x-user-role": UserRole.MODERATOR,
            "x-actor-type": ActorType.USER,
          },
          payload: payloads[i],
        });

        replayLatencies.push(performance.now() - reqStart);
        if (res.statusCode !== 200) replayErrors++;
        const body = JSON.parse(res.payload);
        if (body.status !== "IDEMPOTENT_REPLAY") replayErrors++;
      }

      const replayElapsed = performance.now() - tReplayStart;
      const replayMetrics = computeMetrics(
        "POST /integration/osm (Replay)",
        replayLatencies,
        replayElapsed,
        replayErrors
      );
      allRecordedMetrics.push(replayMetrics);
      expect(replayErrors).toBe(0);

      // Verify zero duplicate evaluations created during replay
      const storedIdempotency = await db
        .selectFrom("idempotency_records")
        .where("key", "like", "OSM_INGESTION:PERF_VENDOR_OSM:ext_eval_perf_%")
        .selectAll()
        .execute();
      expect(storedIdempotency.length).toBe(ingestCount);

      // Verify that replay operations were served efficiently
      expect(replayMetrics.meanMs).toBeLessThanOrEqual(freshMetrics.meanMs * 1.5);
    });
  });

  // --------------------------------------------------------------------------
  // 4. Analytics, QualityPulse, and Audit Inspection Query Benchmark
  // --------------------------------------------------------------------------
  describe("4. Analytics, QualityPulse, and Audit Query Benchmark", () => {
    const queryCount = 30;

    beforeAll(async () => {
      // Pre-seed 5 QualitySignals for realistic analytics computation
      for (let i = 0; i < 5; i++) {
        await signalRepo.save(
          QualitySignal.create({
            id: `sig_seed_pulse_${i}`,
            evaluationId: `eval_perf_${i}`,
            evaluationVersion: 3,
            signalType: "STATISTICAL_OUTLIER",
            severity: SignalSeverity.HIGH,
            status: QualitySignalStatus.GENERATED,
            summary: "Score deviation exceeds cohort threshold.",
            evidence: { zScore: 2.75, sampleSize: 20, mean: 40 },
            detector: {
              type: "STATISTICAL",
              name: "STATISTICAL_OUTLIER",
              version: "1.0",
            },
          })
        );
      }
    });

    it("measures QualityPulse cohort analytics query latency over 30 iterations", async () => {
      const latencies: number[] = [];
      let errors = 0;
      const tStart = performance.now();

      for (let i = 0; i < queryCount; i++) {
        const reqStart = performance.now();
        const res = await server.inject({
          method: "GET",
          url: "/api/v1/analytics/quality-pulse",
          headers: { "x-user-role": UserRole.MODERATOR, "x-actor-type": ActorType.USER },
        });

        latencies.push(performance.now() - reqStart);
        if (res.statusCode !== 200) errors++;
      }

      const totalElapsed = performance.now() - tStart;
      const metrics = computeMetrics("GET /analytics/quality-pulse", latencies, totalElapsed, errors);
      allRecordedMetrics.push(metrics);

      expect(errors).toBe(0);
      expect(metrics.count).toBe(queryCount);
    });

    it("measures Analytics Summary query latency over 30 iterations", async () => {
      const latencies: number[] = [];
      let errors = 0;
      const tStart = performance.now();

      for (let i = 0; i < queryCount; i++) {
        const reqStart = performance.now();
        const res = await server.inject({
          method: "GET",
          url: "/api/v1/analytics/summary",
          headers: { "x-user-role": UserRole.MODERATOR, "x-actor-type": ActorType.USER },
        });

        latencies.push(performance.now() - reqStart);
        if (res.statusCode !== 200) errors++;
      }

      const totalElapsed = performance.now() - tStart;
      const metrics = computeMetrics("GET /analytics/summary", latencies, totalElapsed, errors);
      allRecordedMetrics.push(metrics);

      expect(errors).toBe(0);
      expect(metrics.count).toBe(queryCount);
    });

    it("measures Audit Events list retrieval latency over 30 iterations", async () => {
      const latencies: number[] = [];
      let errors = 0;
      const tStart = performance.now();

      for (let i = 0; i < queryCount; i++) {
        const reqStart = performance.now();
        const res = await server.inject({
          method: "GET",
          url: "/api/v1/audit-events?page=1&pageSize=20",
          headers: { "x-user-role": UserRole.MODERATOR, "x-actor-type": ActorType.USER },
        });

        latencies.push(performance.now() - reqStart);
        if (res.statusCode !== 200) errors++;
      }

      const totalElapsed = performance.now() - tStart;
      const metrics = computeMetrics("GET /audit-events (Query)", latencies, totalElapsed, errors);
      allRecordedMetrics.push(metrics);

      expect(errors).toBe(0);
      expect(metrics.count).toBe(queryCount);
    });
  });

  // --------------------------------------------------------------------------
  // 5. Concurrent Load, Contention & Race Resolution Reliability
  // --------------------------------------------------------------------------
  describe("5. Concurrent Load, Contention & Race Resolution Reliability", () => {
    it("handles 25 concurrent submission attempts on the SAME evaluation with optimistic locking: exactly 1 succeeds, 24 return 409 Conflict, 0 return 500", async () => {
      const targetEvalId = "eval_race_target";
      const targetEvaluatorId = "evaluator_race_primary";

      // 1. Create fresh draft evaluation
      await server.inject({
        method: "POST",
        url: "/api/v1/evaluations",
        headers: {
          "x-user-role": UserRole.EXAMINER,
          "x-evaluator-id": targetEvaluatorId,
          "x-user-id": targetEvaluatorId,
          "x-actor-type": ActorType.USER,
        },
        payload: {
          id: targetEvalId,
          evaluationCycleId: "cycle_race",
          scriptId: "script_race_1",
          evaluatorId: targetEvaluatorId,
          rubricId,
          rubricVersion,
          questions: [
            { id: "q_r1", questionNumber: "1", text: "Q1", maxMarks: 20, rubricCriteriaId: "crit_core_1", orderIndex: 0 },
          ],
        },
      });

      // 2. Assign mark
      await server.inject({
        method: "PATCH",
        url: `/api/v1/evaluations/${targetEvalId}`,
        headers: {
          "x-user-role": UserRole.EXAMINER,
          "x-evaluator-id": targetEvaluatorId,
          "x-user-id": targetEvaluatorId,
          "x-actor-type": ActorType.USER,
        },
        payload: {
          expectedVersion: 1,
          marks: [{ questionId: "q_r1", awardedMarks: 17 }],
        },
      });

      // 3. Fire 25 concurrent submit requests targeting the SAME expectedVersion: 2
      const concurrencyLevel = 25;
      const promises = Array.from({ length: concurrencyLevel }, () =>
        server.inject({
          method: "POST",
          url: `/api/v1/evaluations/${targetEvalId}/submit`,
          headers: {
            "x-user-role": UserRole.EXAMINER,
            "x-evaluator-id": targetEvaluatorId,
            "x-user-id": targetEvaluatorId,
            "x-actor-type": ActorType.USER,
          },
          payload: { expectedVersion: 2 },
        })
      );

      const tStart = performance.now();
      const results = await Promise.all(promises);
      const totalElapsed = performance.now() - tStart;

      let successCount = 0;
      let conflictCount = 0;
      let error500Count = 0;

      for (const res of results) {
        if (res.statusCode === 200) successCount++;
        else if (res.statusCode === 409) conflictCount++;
        else error500Count++;
      }

      // Assert concurrency invariants
      expect(successCount).toBe(1);
      expect(conflictCount).toBe(concurrencyLevel - 1);
      expect(error500Count).toBe(0);

      // Verify database state: status is SUBMITTED, version is 3
      const evalDb = await db
        .selectFrom("evaluations")
        .where("id", "=", targetEvalId)
        .selectAll()
        .executeTakeFirst();

      expect(evalDb?.status).toBe("SUBMITTED");
      expect(evalDb?.version).toBe(3);

      // Verify outbox has exactly 1 submission event
      const outboxDb = await db
        .selectFrom("outbox_events")
        .where("aggregate_id", "=", targetEvalId)
        .where("event_type", "=", "EvaluationSubmitted")
        .selectAll()
        .execute();
      expect(outboxDb.length).toBe(1);

      allRecordedMetrics.push(
        computeMetrics(
          "Concurrent Contention (Submit)",
          [totalElapsed],
          totalElapsed,
          error500Count
        )
      );
    });

    it("handles 25 parallel independent evaluation creations concurrently without table lock contention", async () => {
      const concurrencyLevel = 25;
      const tStart = performance.now();

      const promises = Array.from({ length: concurrencyLevel }, (_, i) => {
        const id = `eval_parallel_${i}`;
        const evaluatorId = `evaluator_parallel_${i}`;
        return server.inject({
          method: "POST",
          url: "/api/v1/evaluations",
          headers: {
            "x-user-role": UserRole.EXAMINER,
            "x-evaluator-id": evaluatorId,
            "x-user-id": evaluatorId,
            "x-actor-type": ActorType.USER,
          },
          payload: {
            id,
            evaluationCycleId: "cycle_parallel",
            scriptId: `script_par_${i}`,
            evaluatorId,
            rubricId,
            rubricVersion,
            questions: [
              { id: `q_p1_${i}`, questionNumber: "1", text: "Q1", maxMarks: 20, rubricCriteriaId: "crit_core_1", orderIndex: 0 },
            ],
          },
        });
      });

      const results = await Promise.all(promises);
      const totalElapsed = performance.now() - tStart;

      let successCount = 0;
      let failureCount = 0;

      for (const res of results) {
        if (res.statusCode === 201) successCount++;
        else failureCount++;
      }

      expect(successCount).toBe(concurrencyLevel);
      expect(failureCount).toBe(0);

      // Verify all 25 evaluations exist in database
      const parallelDb = await db
        .selectFrom("evaluations")
        .where("id", "like", "eval_parallel_%")
        .selectAll()
        .execute();
      expect(parallelDb.length).toBe(concurrencyLevel);

      allRecordedMetrics.push(
        computeMetrics(
          "Parallel Ingestion (Create)",
          [totalElapsed],
          totalElapsed,
          failureCount
        )
      );
    });
  });

  // --------------------------------------------------------------------------
  // 6. Fault Isolation & ACID Rollback Reliability Under Rapid Failure Injections
  // --------------------------------------------------------------------------
  describe("6. Fault Isolation & Zero Partial Writes Under Failure Injections", () => {
    it("handles 50 rapid-fire malformed/unauthorized requests: 100% structured client errors, 0 internal server errors, 0 database corruption", async () => {
      const initialEvalCount = (await db.selectFrom("evaluations").selectAll().execute()).length;
      const initialMarksCount = (await db.selectFrom("evaluation_marks").selectAll().execute()).length;

      let error400Count = 0;
      let error403Count = 0;
      let error404Count = 0;
      let error500Count = 0;

      // 10 Malformed payloads (missing fields / bad types) -> 400 Bad Request
      for (let i = 0; i < 10; i++) {
        const res = await server.inject({
          method: "POST",
          url: "/api/v1/evaluations",
          headers: { "x-user-role": UserRole.MODERATOR, "x-actor-type": ActorType.USER },
          payload: { invalidField: 123 },
        });
        if (res.statusCode === 400) error400Count++;
        else error500Count++;
      }

      // 10 Out-of-bounds mark assignments (mark > maxMarks) -> 400 Bad Request
      for (let i = 0; i < 10; i++) {
        const res = await server.inject({
          method: "PATCH",
          url: "/api/v1/evaluations/eval_perf_0",
          headers: {
            "x-user-role": UserRole.MODERATOR,
            "x-actor-type": ActorType.USER,
          },
          payload: {
            expectedVersion: 3,
            marks: [{ questionId: "q_b1_0", awardedMarks: 9999 }],
          },
        });
        if (res.statusCode === 400) error400Count++;
        else error500Count++;
      }

      // 10 Unauthorized role attempts (STUDENT role) -> 403 Forbidden
      for (let i = 0; i < 10; i++) {
        const res = await server.inject({
          method: "POST",
          url: "/api/v1/triage-cases",
          headers: { "x-user-role": "STUDENT", "x-actor-type": ActorType.USER },
          payload: {
            id: `case_unauth_${i}`,
            qualitySignalId: "sig_perf_0",
            priority: "HIGH",
          },
        });
        if (res.statusCode === 403) error403Count++;
        else error500Count++;
      }

      // 10 AI actor mutations -> 403 Forbidden
      for (let i = 0; i < 10; i++) {
        const res = await server.inject({
          method: "POST",
          url: "/api/v1/evaluations/eval_perf_0/submit",
          headers: {
            "x-user-role": UserRole.EXAMINER,
            "x-actor-type": ActorType.AI,
          },
          payload: { expectedVersion: 3 },
        });
        if (res.statusCode === 403) error403Count++;
        else error500Count++;
      }

      // 10 Non-existent entity queries -> 404 Not Found
      for (let i = 0; i < 10; i++) {
        const res = await server.inject({
          method: "GET",
          url: `/api/v1/evaluations/non_existent_id_${i}`,
          headers: { "x-user-role": UserRole.MODERATOR, "x-actor-type": ActorType.USER },
        });
        if (res.statusCode === 404) error404Count++;
        else error500Count++;
      }

      expect(error400Count).toBe(20);
      expect(error403Count).toBe(20);
      expect(error404Count).toBe(10);
      expect(error500Count).toBe(0);

      // Verify that database state was completely unchanged across all 50 negative attempts
      const finalEvalCount = (await db.selectFrom("evaluations").selectAll().execute()).length;
      const finalMarksCount = (await db.selectFrom("evaluation_marks").selectAll().execute()).length;

      expect(finalEvalCount).toBe(initialEvalCount);
      expect(finalMarksCount).toBe(initialMarksCount);
    });
  });

  // --------------------------------------------------------------------------
  // 7. Memory Stability & Resource Consumption
  // --------------------------------------------------------------------------
  describe("7. Memory Stability & Resource Consumption", () => {
    it("verifies stable memory heap consumption without runaway memory growth across hundreds of operations", async () => {
      const initialMemory = process.memoryUsage();
      const initialHeapUsedMb = initialMemory.heapUsed / (1024 * 1024);

      // Execute 100 rapid read operations
      for (let i = 0; i < 100; i++) {
        await server.inject({
          method: "GET",
          url: "/api/v1/evaluations?page=1&pageSize=20",
          headers: { "x-user-role": UserRole.MODERATOR, "x-actor-type": ActorType.USER },
        });
      }

      const finalMemory = process.memoryUsage();
      const finalHeapUsedMb = finalMemory.heapUsed / (1024 * 1024);
      const heapDeltaMb = finalHeapUsedMb - initialHeapUsedMb;

      console.log(
        `Memory Baseline: Initial Heap = ${initialHeapUsedMb.toFixed(2)} MB, Final Heap = ${finalHeapUsedMb.toFixed(2)} MB, Delta = ${heapDeltaMb.toFixed(2)} MB`
      );

      // Memory growth must remain bounded under 50 MB
      expect(heapDeltaMb).toBeLessThan(50);
    });
  });
});
