/**
 * End-to-End Moderation Lifecycle Verification Test Suite (TASK-P5-MOD-004).
 *
 * Conforms to:
 * - docs/contracts/01-product-contract.md §14, §17, §32, FR-008, FR-009 (Moderation workflow, human resolution)
 * - docs/contracts/02-architecture-contract.md §8, §14, §17 (Application & persistence boundaries)
 * - docs/contracts/05-domain-contract.md §22-28 (TriageCase lifecycle, separation from QualitySignal, canonical outcomes)
 * - docs/contracts/06-api-contract.md §29-33, §46, §66-67 (HTTP endpoints, headers, error responses)
 * - docs/contracts/07-event-contract.md §45-48, §63 (TriageCaseCreated, TriageCaseAssigned, TriageCaseResolved)
 * - docs/contracts/08-data-contract.md §20-23, §28-31 (Migrations 004, 005, atomicity, optimistic locking)
 * - docs/contracts/09-testing-contract.md §42-44, §86-87, §127 (Verification requirements)
 * - docs/contracts/10-demo-contract.md §24-25, §74 (Moderator queue, investigation, authorized resolution)
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { createDatabase, type KyselyDb } from "../src/infrastructure/database/database.js";
import { runMigrations } from "../src/infrastructure/database/migrator.js";
import {
  KyselyEvaluationRepository,
  KyselyQualitySignalRepository,
  KyselyTriageCaseRepository,
  KyselyResolutionRepository,
} from "../src/infrastructure/repositories/index.js";
import { KyselyUnitOfWork } from "../src/infrastructure/persistence/index.js";
import {
  TriageCaseStatus,
  ResolutionOutcome,
  QualitySignalStatus,
  SignalSeverity,
  Evaluation,
} from "../src/domain/index.js";
import { createServer } from "../src/presentation/server.js";

describe("TASK-P5-MOD-004: Moderation Lifecycle End-to-End Verification", () => {
  let db: KyselyDb;
  let evaluationRepo: KyselyEvaluationRepository;
  let signalRepo: KyselyQualitySignalRepository;
  let triageRepo: KyselyTriageCaseRepository;
  let resolutionRepo: KyselyResolutionRepository;
  let unitOfWork: KyselyUnitOfWork;
  let server: FastifyInstance;

  beforeEach(async () => {
    db = createDatabase(":memory:");
    await runMigrations(db);

    evaluationRepo = new KyselyEvaluationRepository(db);
    signalRepo = new KyselyQualitySignalRepository(db);
    triageRepo = new KyselyTriageCaseRepository(db);
    resolutionRepo = new KyselyResolutionRepository(db);
    unitOfWork = new KyselyUnitOfWork(db);

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

  // Helper to seed evaluation and submit partial marks to generate a QualitySignal
  async function seedEvaluationAndSignal() {
    const evalId = `eval_${randomUUID()}`;
    const q1Id = `q1_${randomUUID()}`;
    const q2Id = `q2_${randomUUID()}`;
    const evaluation = Evaluation.create({
      id: evalId,
      evaluationCycleId: "cycle_mod_004",
      scriptId: `script_${randomUUID()}`,
      evaluatorId: "examiner_primary_01",
      rubricId: "rubric_math_2026",
      rubricVersion: 1,
      questions: [
        {
          id: q1Id,
          questionNumber: "1",
          text: "Solve linear equation",
          maxMarks: 10,
          rubricCriteriaId: null,
          orderIndex: 0,
        },
        {
          id: q2Id,
          questionNumber: "2",
          text: "Proof of theorem",
          maxMarks: 15,
          rubricCriteriaId: null,
          orderIndex: 1,
        },
      ],
    });

    // Award mark for Q1 only (Q2 left unmarked -> triggers COMPLETENESS_PARTIAL on submission)
    evaluation.assignMark({
      questionId: q1Id,
      awardedMarks: 8,
      evaluatorId: "examiner_primary_01",
      comments: "Step 1 & 2 correct",
    });
    await evaluationRepo.save(evaluation);

    // Submit evaluation through API to run deterministic completeness validation and generate QualitySignal
    const submitRes = await server.inject({
      method: "POST",
      url: `/api/v1/evaluations/${evalId}/submit`,
      headers: {
        "x-user-role": "EXAMINER",
        "x-actor-type": "USER",
        "x-actor-id": "examiner_primary_01",
      },
    });
    expect(submitRes.statusCode).toBe(200);

    // Retrieve generated QualitySignal
    const signals = await signalRepo.findByEvaluationId(evalId);
    expect(signals.length).toBeGreaterThan(0);
    const signal = signals[0];
    expect(signal.status).toBe(QualitySignalStatus.REVIEWABLE);

    return { evalId, signalId: signal.id, initialTotalScore: 8 };
  }

  it("1. Verifies TriageCase creation from QualitySignal and queue visibility", async () => {
    const { evalId, signalId } = await seedEvaluationAndSignal();

    // Moderator creates TriageCase
    const createRes = await server.inject({
      method: "POST",
      url: "/api/v1/triage-cases",
      headers: {
        "x-user-role": "MODERATOR",
        "x-actor-type": "USER",
        "x-actor-id": "mod_dispatch_01",
      },
      payload: {
        qualitySignalId: signalId,
        priority: "HIGH",
        notes: "Automated completeness check flagged unmarked question 2.",
      },
    });

    expect(createRes.statusCode).toBe(201);
    const createdCase = createRes.json();
    expect(createdCase.id).toBeDefined();
    expect(createdCase.caseNumber).toMatch(/^CASE-/);
    expect(createdCase.status).toBe("OPEN");
    expect(createdCase.priority).toBe("HIGH");
    expect(createdCase.version).toBe(1);
    expect(createdCase.qualitySignalId).toBe(signalId);
    expect(createdCase.evaluationId).toBe(evalId);

    // QualitySignal is now atomically transitioned to LINKED_TO_CASE
    const updatedSignal = (await signalRepo.findById(signalId))!;
    expect(updatedSignal.status).toBe(QualitySignalStatus.LINKED_TO_CASE);
    expect(updatedSignal.evidence.linkedCaseId).toBe(createdCase.id);

    // Case appears in Queue list query
    const listRes = await server.inject({
      method: "GET",
      url: "/api/v1/triage-cases?status=OPEN",
      headers: { "x-user-role": "MODERATOR" },
    });
    expect(listRes.statusCode).toBe(200);
    const listCases = listRes.json();
    expect(listCases.some((c: { id: string }) => c.id === createdCase.id)).toBe(true);

    // Case appears in single case retrieval
    const getRes = await server.inject({
      method: "GET",
      url: `/api/v1/triage-cases/${createdCase.id}`,
      headers: { "x-user-role": "MODERATOR" },
    });
    expect(getRes.statusCode).toBe(200);
    expect(getRes.json().id).toBe(createdCase.id);

    // Outbox has TriageCaseCreated event
    const outboxEvents = await db
      .selectFrom("outbox_events")
      .selectAll()
      .where("event_type", "=", "TriageCaseCreated")
      .where("aggregate_id", "=", createdCase.id)
      .execute();
    expect(outboxEvents).toHaveLength(1);
    expect(JSON.parse(outboxEvents[0].payload).caseId).toBe(createdCase.id);
  });

  it("2. Verifies assignment lifecycle, optimistic locking, and role guards", async () => {
    const { signalId } = await seedEvaluationAndSignal();

    const createRes = await server.inject({
      method: "POST",
      url: "/api/v1/triage-cases",
      headers: { "x-user-role": "MODERATOR", "x-actor-id": "mod_lead" },
      payload: { qualitySignalId: signalId, priority: "MEDIUM" },
    });
    const caseId = createRes.json().id;

    // EXAMINER role cannot assign (403 Forbidden)
    const examinerAssign = await server.inject({
      method: "POST",
      url: `/api/v1/triage-cases/${caseId}/assign`,
      headers: { "x-user-role": "EXAMINER", "x-actor-id": "examiner_01" },
      payload: { assigneeId: "examiner_01", expectedVersion: 1 },
    });
    expect(examinerAssign.statusCode).toBe(403);

    // AI actor cannot assign (403 Forbidden)
    const aiAssign = await server.inject({
      method: "POST",
      url: `/api/v1/triage-cases/${caseId}/assign`,
      headers: { "x-user-role": "MODERATOR", "x-actor-type": "AI", "x-actor-id": "ai_agent" },
      payload: { assigneeId: "mod_reviewer_01", expectedVersion: 1 },
    });
    expect(aiAssign.statusCode).toBe(403);

    // Authorized MODERATOR assigns case
    const modAssign = await server.inject({
      method: "POST",
      url: `/api/v1/triage-cases/${caseId}/assign`,
      headers: { "x-user-role": "MODERATOR", "x-actor-id": "mod_lead" },
      payload: { assigneeId: "mod_reviewer_01", expectedVersion: 1 },
    });
    expect(modAssign.statusCode).toBe(200);
    const assignedCase = modAssign.json();
    expect(assignedCase.status).toBe("ASSIGNED");
    expect(assignedCase.assigneeId).toBe("mod_reviewer_01");
    expect(assignedCase.version).toBe(2);

    // Concurrency conflict: subsequent assignment with stale version 1 returns 409 Conflict
    const staleAssign = await server.inject({
      method: "POST",
      url: `/api/v1/triage-cases/${caseId}/assign`,
      headers: { "x-user-role": "MODERATOR", "x-actor-id": "mod_lead" },
      payload: { assigneeId: "mod_reviewer_02", expectedVersion: 1 }, // Stale!
    });
    expect(staleAssign.statusCode).toBe(409);

    // Outbox has TriageCaseAssigned event
    const outboxEvents = await db
      .selectFrom("outbox_events")
      .selectAll()
      .where("event_type", "=", "TriageCaseAssigned")
      .where("aggregate_id", "=", caseId)
      .execute();
    expect(outboxEvents).toHaveLength(1);
    expect(JSON.parse(outboxEvents[0].payload).assigneeId).toBe("mod_reviewer_01");
    expect(JSON.parse(outboxEvents[0].payload).version).toBe(2);
  });

  it("3. Verifies resolution validation, canonical outcomes, and role guards", async () => {
    const { signalId } = await seedEvaluationAndSignal();

    const createRes = await server.inject({
      method: "POST",
      url: "/api/v1/triage-cases",
      headers: { "x-user-role": "MODERATOR" },
      payload: { qualitySignalId: signalId },
    });
    const caseId = createRes.json().id;

    // EXAMINER cannot resolve (403 Forbidden)
    const examinerResolve = await server.inject({
      method: "POST",
      url: `/api/v1/triage-cases/${caseId}/resolve`,
      headers: { "x-user-role": "EXAMINER", "x-actor-id": "examiner_01" },
      payload: {
        outcome: ResolutionOutcome.CONFIRMED_VALID,
        reason: "Examiner asserts self-approval",
        expectedVersion: 1,
      },
    });
    expect(examinerResolve.statusCode).toBe(403);

    // AI actor cannot resolve (403 Forbidden - INV-003, INV-004)
    const aiResolve = await server.inject({
      method: "POST",
      url: `/api/v1/triage-cases/${caseId}/resolve`,
      headers: { "x-user-role": "MODERATOR", "x-actor-type": "AI", "x-actor-id": "gemini-flash" },
      payload: {
        outcome: ResolutionOutcome.CONFIRMED_VALID,
        reason: "AI autonomous decision",
        expectedVersion: 1,
      },
    });
    expect(aiResolve.statusCode).toBe(403);

    // SYSTEM actor cannot resolve (403 Forbidden)
    const sysResolve = await server.inject({
      method: "POST",
      url: `/api/v1/triage-cases/${caseId}/resolve`,
      headers: { "x-user-role": "MODERATOR", "x-actor-type": "SYSTEM", "x-actor-id": "cron_worker" },
      payload: {
        outcome: ResolutionOutcome.CONFIRMED_VALID,
        reason: "System timeout resolution",
        expectedVersion: 1,
      },
    });
    expect(sysResolve.statusCode).toBe(403);

    // Empty reason rejected (400 Bad Request - FR-009)
    const emptyReasonResolve = await server.inject({
      method: "POST",
      url: `/api/v1/triage-cases/${caseId}/resolve`,
      headers: { "x-user-role": "MODERATOR", "x-actor-id": "mod_reviewer_01" },
      payload: {
        outcome: ResolutionOutcome.CONFIRMED_VALID,
        reason: "   ",
        expectedVersion: 1,
      },
    });
    expect(emptyReasonResolve.statusCode).toBe(400);

    // Invalid non-canonical outcome rejected (400 Bad Request)
    const invalidOutcomeResolve = await server.inject({
      method: "POST",
      url: `/api/v1/triage-cases/${caseId}/resolve`,
      headers: { "x-user-role": "MODERATOR", "x-actor-id": "mod_reviewer_01" },
      payload: {
        outcome: "SUPERSEDED_AUTO_PASS", // Non-canonical!
        reason: "Reason text",
        expectedVersion: 1,
      },
    });
    expect(invalidOutcomeResolve.statusCode).toBe(400);
  });

  it("4. Verifies complete OPEN -> ASSIGNED -> RESOLVED lifecycle and database persistence", async () => {
    const { evalId, signalId, initialTotalScore } = await seedEvaluationAndSignal();

    // Step 1: Create Case (OPEN, version = 1)
    const createRes = await server.inject({
      method: "POST",
      url: "/api/v1/triage-cases",
      headers: { "x-user-role": "MODERATOR", "x-actor-id": "mod_triage_master" },
      payload: { qualitySignalId: signalId, priority: "CRITICAL" },
    });
    const caseId = createRes.json().id;
    expect(createRes.json().status).toBe("OPEN");
    expect(createRes.json().version).toBe(1);

    // Step 2: Assign Case (OPEN -> ASSIGNED, version = 2)
    const assignRes = await server.inject({
      method: "POST",
      url: `/api/v1/triage-cases/${caseId}/assign`,
      headers: { "x-user-role": "MODERATOR", "x-actor-id": "mod_triage_master" },
      payload: { assigneeId: "mod_investigator_77", expectedVersion: 1 },
    });
    expect(assignRes.statusCode).toBe(200);
    expect(assignRes.json().status).toBe("ASSIGNED");
    expect(assignRes.json().version).toBe(2);

    // Step 3: Resolve Case with CORRECTION_REQUIRED (ASSIGNED -> RESOLVED, version = 3)
    const resolveRes = await server.inject({
      method: "POST",
      url: `/api/v1/triage-cases/${caseId}/resolve`,
      headers: { "x-user-role": "MODERATOR", "x-actor-id": "mod_investigator_77" },
      payload: {
        outcome: ResolutionOutcome.CORRECTION_REQUIRED,
        reason: "Question 2 was confirmed blank on student paper; award zero and finalize script.",
        notes: "Examiner missed reviewing question 2 completely.",
        evidenceReferences: [signalId, "script_cand_99_p2"],
        expectedVersion: 2,
      },
    });
    expect(resolveRes.statusCode).toBe(200);
    const resolvedPayload = resolveRes.json();
    expect(resolvedPayload.triageCase.status).toBe("RESOLVED");
    expect(resolvedPayload.triageCase.version).toBe(3);
    expect(resolvedPayload.resolution.outcome).toBe(ResolutionOutcome.CORRECTION_REQUIRED);
    expect(resolvedPayload.resolution.moderatorId).toBe("mod_investigator_77");

    // Step 4: Verify Persistence in 'resolutions' Table
    const resolutionDbRows = await db
      .selectFrom("resolutions")
      .selectAll()
      .where("triage_case_id", "=", caseId)
      .execute();
    expect(resolutionDbRows).toHaveLength(1);
    const resRow = resolutionDbRows[0];
    expect(resRow.outcome).toBe("CORRECTION_REQUIRED");
    expect(resRow.reason).toContain("Question 2 was confirmed blank");
    expect(resRow.moderator_id).toBe("mod_investigator_77");
    expect(resRow.evaluation_id).toBe(evalId);
    expect(JSON.parse(resRow.evidence_references!)).toEqual([signalId, "script_cand_99_p2"]);

    // Step 5: Verify QualitySignal State Synchronization
    const finalSignal = (await signalRepo.findById(signalId))!;
    expect(finalSignal.status).toBe(QualitySignalStatus.RESOLVED);
    expect(finalSignal.evidence.resolutionOutcome).toBe("CORRECTION_REQUIRED");

    // Step 6: Verify Outbox Event TriageCaseResolved
    const outboxEvents = await db
      .selectFrom("outbox_events")
      .selectAll()
      .where("event_type", "=", "TriageCaseResolved")
      .where("aggregate_id", "=", caseId)
      .execute();
    expect(outboxEvents).toHaveLength(1);
    const eventPayload = JSON.parse(outboxEvents[0].payload);
    expect(eventPayload.outcome).toBe("CORRECTION_REQUIRED");
    expect(eventPayload.moderatorId).toBe("mod_investigator_77");
    expect(eventPayload.version).toBe(3);

    // Step 7: Terminal State Guarantees
    // Cannot re-resolve a resolved case (409 Conflict)
    const duplicateResolve = await server.inject({
      method: "POST",
      url: `/api/v1/triage-cases/${caseId}/resolve`,
      headers: { "x-user-role": "MODERATOR", "x-actor-id": "mod_investigator_77" },
      payload: {
        outcome: ResolutionOutcome.CONFIRMED_VALID,
        reason: "Second resolution attempt",
        expectedVersion: 3,
      },
    });
    expect(duplicateResolve.statusCode).toBe(409);

    // Cannot reassign a resolved case (409 Conflict)
    const reassignResolved = await server.inject({
      method: "POST",
      url: `/api/v1/triage-cases/${caseId}/assign`,
      headers: { "x-user-role": "MODERATOR", "x-actor-id": "mod_investigator_77" },
      payload: { assigneeId: "mod_other", expectedVersion: 3 },
    });
    expect(reassignResolved.statusCode).toBe(409);

    // Step 8: Evaluation Mark Immutability Invariant (INV-003, INV-004)
    const evalRecord = (await evaluationRepo.findById(evalId))!;
    expect(evalRecord.totalScore).toBe(initialTotalScore);
    expect(evalRecord.status).toBe("SUBMITTED");
    expect(evalRecord.marks.size).toBe(1);
    const marksArray = Array.from(evalRecord.marks.values());
    expect(marksArray[0].awardedMarks).toBe(8);
    expect(evalRecord.evaluatorId).toBe("examiner_primary_01");
  });

  it("5. Verifies resolved state survivability upon fresh query/retrieval", async () => {
    const { evalId, signalId } = await seedEvaluationAndSignal();

    // Create & resolve with DISMISSED outcome
    const createRes = await server.inject({
      method: "POST",
      url: "/api/v1/triage-cases",
      headers: { "x-user-role": "ADMIN", "x-actor-id": "admin_sys" },
      payload: { qualitySignalId: signalId, priority: "LOW" },
    });
    const caseId = createRes.json().id;

    const resolveRes = await server.inject({
      method: "POST",
      url: `/api/v1/triage-cases/${caseId}/resolve`,
      headers: { "x-user-role": "ADMIN", "x-actor-id": "admin_sys" },
      payload: {
        outcome: ResolutionOutcome.DISMISSED,
        reason: "Candidate opted for elective question 1 only; question 2 omission is legitimate.",
        expectedVersion: 1, // Directly resolving from OPEN
      },
    });
    expect(resolveRes.statusCode).toBe(200);

    // Simulate fresh retrieval after reload:
    // 1. GET /api/v1/triage-cases/:caseId
    const freshCaseRes = await server.inject({
      method: "GET",
      url: `/api/v1/triage-cases/${caseId}`,
      headers: { "x-user-role": "MODERATOR" },
    });
    expect(freshCaseRes.statusCode).toBe(200);
    const freshCase = freshCaseRes.json();
    expect(freshCase.status).toBe("RESOLVED");
    expect(freshCase.version).toBe(2);

    // 2. GET /api/v1/quality-signals/:signalId
    const freshSignalRes = await server.inject({
      method: "GET",
      url: `/api/v1/quality-signals/${signalId}`,
      headers: { "x-user-role": "MODERATOR" },
    });
    expect(freshSignalRes.statusCode).toBe(200);
    const freshSignal = freshSignalRes.json();
    expect(freshSignal.status).toBe("DISMISSED");
    expect(freshSignal.evidence.dismissalReason).toBe(
      "Candidate opted for elective question 1 only; question 2 omission is legitimate."
    );

    // 3. Direct persistence query via Resolution repository
    const persistedRes = await resolutionRepo.findByTriageCaseId(caseId);
    expect(persistedRes).not.toBeNull();
    expect(persistedRes?.outcome).toBe(ResolutionOutcome.DISMISSED);
    expect(persistedRes?.moderatorId).toBe("admin_sys");
    expect(persistedRes?.evaluationId).toBe(evalId);

    // 4. Queue query with filter status=RESOLVED includes this case
    const resolvedListRes = await server.inject({
      method: "GET",
      url: "/api/v1/triage-cases?status=RESOLVED",
      headers: { "x-user-role": "MODERATOR" },
    });
    expect(resolvedListRes.statusCode).toBe(200);
    expect(resolvedListRes.json().some((c: { id: string }) => c.id === caseId)).toBe(true);

    // Queue query with filter status=OPEN excludes this case
    const openListRes = await server.inject({
      method: "GET",
      url: "/api/v1/triage-cases?status=OPEN",
      headers: { "x-user-role": "MODERATOR" },
    });
    expect(openListRes.statusCode).toBe(200);
    expect(openListRes.json().some((c: { id: string }) => c.id === caseId)).toBe(false);
  });

  it("6. Verifies all 5 canonical ResolutionOutcome values can be resolved and persisted", async () => {
    const outcomes = [
      ResolutionOutcome.CONFIRMED_VALID,
      ResolutionOutcome.LEGITIMATE_VARIATION,
      ResolutionOutcome.CORRECTION_REQUIRED,
      ResolutionOutcome.ESCALATED,
      ResolutionOutcome.DISMISSED,
    ];

    for (const outcome of outcomes) {
      const { signalId } = await seedEvaluationAndSignal();

      const createRes = await server.inject({
        method: "POST",
        url: "/api/v1/triage-cases",
        headers: { "x-user-role": "MODERATOR", "x-actor-id": "mod_canonical" },
        payload: { qualitySignalId: signalId },
      });
      const caseId = createRes.json().id;

      const resolveRes = await server.inject({
        method: "POST",
        url: `/api/v1/triage-cases/${caseId}/resolve`,
        headers: { "x-user-role": "MODERATOR", "x-actor-id": "mod_canonical" },
        payload: {
          outcome,
          reason: `Verification of canonical outcome ${outcome}`,
          expectedVersion: 1,
        },
      });

      expect(resolveRes.statusCode).toBe(200);
      expect(resolveRes.json().resolution.outcome).toBe(outcome);

      const dbRes = await resolutionRepo.findByTriageCaseId(caseId);
      expect(dbRes).not.toBeNull();
      expect(dbRes?.outcome).toBe(outcome);
    }
  });
});
