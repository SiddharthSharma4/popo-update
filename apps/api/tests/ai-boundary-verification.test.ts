/**
 * Test Suite: TASK-P7-AI-003 — Verify AI Boundary & Advisory Behavior
 *
 * Authoritative Contracts:
 * - docs/contracts/01-product-contract.md §16, §23, §26
 * - docs/contracts/02-architecture-contract.md §27–30
 * - docs/contracts/05-domain-contract.md §36, INV-003, INV-004, INV-005
 * - docs/contracts/06-api-contract.md §34–36
 * - docs/contracts/08-data-contract.md §32–34
 * - docs/contracts/09-testing-contract.md §38, §40, §96, §147
 *
 * Verifies:
 * 1. Advisory generation across all assistance types (EVALUATION_SUMMARY, SIGNAL_EXPLANATION, RUBRIC_ADVISORY)
 * 2. 50-run deterministic reproducibility of advisory outputs (09-testing §40)
 * 3. AI non-authority & multi-command rejection across all consequential commands (INV-003, INV-004)
 * 4. Operational state & evaluation mark invariance (INV-003, INV-004, INV-005)
 * 5. Context boundary, privacy protection & cross-evaluation isolation
 * 6. Deterministic fallback degradation under timeout, network error, and schema violations
 * 7. Advisory-to-human decision handoff (AI advisory -> human moderator resolution)
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { randomUUID } from "node:crypto";
import {
  AiAssistanceType,
  AiRecommendationResponseSchema,
  ResolutionOutcome,
  UserRole,
  ActorType,
} from "@osm/shared";
import { createDatabase, type KyselyDb } from "../src/infrastructure/database/database.js";
import { runMigrations } from "../src/infrastructure/database/migrator.js";
import {
  KyselyEvaluationRepository,
  KyselyRubricRepository,
  KyselyQualitySignalRepository,
  KyselyTriageCaseRepository,
  KyselyAuditRepository,
  KyselyResolutionRepository,
} from "../src/infrastructure/repositories/index.js";
import { KyselyUnitOfWork } from "../src/infrastructure/persistence/kysely-unit-of-work.js";
import {
  CreateRubricHandler,
  CreateEvaluationHandler,
  AssignMarkHandler,
  SubmitEvaluationHandler,
  CreateTriageCaseHandler,
  AssignTriageCaseHandler,
  ResolveTriageCaseHandler,
  EntityNotFoundError,
} from "../src/application/index.js";
import { InvalidArgumentError, UnauthorizedActionError } from "../src/domain/errors.js";
import { AiContextBuilder } from "../src/application/ai/ai-context-builder.js";
import { AiService } from "../src/application/ai/ai-service.js";
import { DeterministicMockAiProvider } from "../src/infrastructure/ai/mock-ai-provider.js";

describe("TASK-P7-AI-003: Verify AI Boundary & Advisory Behavior", () => {
  let db: KyselyDb;
  let unitOfWork: KyselyUnitOfWork;
  let evalRepo: KyselyEvaluationRepository;
  let rubricRepo: KyselyRubricRepository;
  let signalRepo: KyselyQualitySignalRepository;
  let triageRepo: KyselyTriageCaseRepository;
  let auditRepo: KyselyAuditRepository;
  let resolutionRepo: KyselyResolutionRepository;

  let contextBuilder: AiContextBuilder;
  let mockProvider: DeterministicMockAiProvider;
  let aiService: AiService;

  beforeEach(async () => {
    db = createDatabase(":memory:");
    await runMigrations(db);

    evalRepo = new KyselyEvaluationRepository(db);
    rubricRepo = new KyselyRubricRepository(db);
    signalRepo = new KyselyQualitySignalRepository(db);
    triageRepo = new KyselyTriageCaseRepository(db);
    auditRepo = new KyselyAuditRepository(db);
    resolutionRepo = new KyselyResolutionRepository(db);
    unitOfWork = new KyselyUnitOfWork(db);

    contextBuilder = new AiContextBuilder(evalRepo, rubricRepo, signalRepo, triageRepo);
    mockProvider = new DeterministicMockAiProvider();
    aiService = new AiService(contextBuilder, mockProvider);
  });

  afterEach(async () => {
    await db.destroy();
  });

  /**
   * Helper fixture generator seeding a complete evaluation lifecycle with rubric, questions, and marks.
   */
  async function seedTestCohort() {
    const rubricHandler = new CreateRubricHandler(unitOfWork);
    const evalHandler = new CreateEvaluationHandler(unitOfWork);
    const assignMarkHandler = new AssignMarkHandler(unitOfWork);
    const submitHandler = new SubmitEvaluationHandler(unitOfWork);
    const triageHandler = new CreateTriageCaseHandler(unitOfWork);

    const rubricId = `rubric_${randomUUID()}`;
    const crit1Id = `crit_${randomUUID()}`;
    const crit2Id = `crit_${randomUUID()}`;

    // 1. Create 2-criterion rubric
    await rubricHandler.execute({
      id: rubricId,
      title: "Operating Systems Examination Rubric",
      version: 1,
      criteria: [
        {
          id: crit1Id,
          title: "Memory Management & Virtual Memory",
          maxMarks: 25,
          description: "Understanding of page tables, TLB, and replacement algorithms",
          levels: [
            { title: "Exemplary", marks: 25, description: "Comprehensive derivation and trade-offs" },
            { title: "Proficient", marks: 18, description: "Accurate concepts with minor gaps" },
            { title: "Novice", marks: 10, description: "Superficial understanding" },
          ],
        },
        {
          id: crit2Id,
          title: "Concurrency & Deadlocks",
          maxMarks: 25,
          description: "Mutexes, semaphores, race conditions, and Coffman conditions",
          levels: [
            { title: "Exemplary", marks: 25, description: "Rigorous proofs and correct sync primitives" },
            { title: "Proficient", marks: 18, description: "Correct synchronization with minor edge cases" },
          ],
        },
      ],
    });

    // 2. Create Evaluation A (partially marked -> generates QualitySignal upon submit)
    const evalAId = `eval_${randomUUID()}`;
    const qA1Id = `q_${randomUUID()}`;
    const qA2Id = `q_${randomUUID()}`;

    await evalHandler.execute({
      id: evalAId,
      evaluationCycleId: "cycle_os_2026",
      scriptId: `script_${randomUUID()}`,
      rubricId,
      rubricVersion: 1,
      evaluatorId: "examiner_alpha",
      questions: [
        { id: qA1Id, questionNumber: "1(a)", text: "Explain multi-level paging and calculate effective memory access time.", maxMarks: 25, rubricCriteriaId: crit1Id, orderIndex: 0 },
        { id: qA2Id, questionNumber: "1(b)", text: "Analyze the Dining Philosophers problem and propose a deadlock-free solution.", maxMarks: 25, rubricCriteriaId: crit2Id, orderIndex: 1 },
      ],
    });

    // Examiner marks Q1 but leaves Q2 unmarked
    await assignMarkHandler.execute({
      evaluationId: evalAId,
      questionId: qA1Id,
      awardedMarks: 22,
      evaluatorId: "examiner_alpha",
      comments: "Excellent calculation of EMAT and TLB hit ratio.",
      isAnnotated: true,
      expectedVersion: 0,
    });

    // Submit evaluation -> triggers SubmissionCompletenessValidator -> generates QualitySignal
    await submitHandler.execute({
      evaluationId: evalAId,
      evaluatorId: "examiner_alpha",
      expectedVersion: 1,
    });

    const signalsA = await signalRepo.findByEvaluationId(evalAId);
    const signalA = signalsA[0];

    // Create TriageCase for Evaluation A
    const triageCaseA = await triageHandler.execute({
      qualitySignalId: signalA.id,
      evaluationId: evalAId,
      priority: "HIGH",
      actorId: "moderator_lead",
      actorType: "USER",
    });

    // 3. Create Evaluation B (completely separate evaluation in same cohort)
    const evalBId = `eval_${randomUUID()}`;
    const qB1Id = `q_${randomUUID()}`;
    const qB2Id = `q_${randomUUID()}`;

    await evalHandler.execute({
      id: evalBId,
      evaluationCycleId: "cycle_os_2026",
      scriptId: `script_${randomUUID()}`,
      rubricId,
      rubricVersion: 1,
      evaluatorId: "examiner_beta",
      questions: [
        { id: qB1Id, questionNumber: "1(a)", text: "Explain multi-level paging.", maxMarks: 25, rubricCriteriaId: crit1Id, orderIndex: 0 },
        { id: qB2Id, questionNumber: "1(b)", text: "Analyze the Dining Philosophers problem.", maxMarks: 25, rubricCriteriaId: crit2Id, orderIndex: 1 },
      ],
    });

    await assignMarkHandler.execute({
      evaluationId: evalBId,
      questionId: qB1Id,
      awardedMarks: 20,
      evaluatorId: "examiner_beta",
      expectedVersion: 0,
    });

    await assignMarkHandler.execute({
      evaluationId: evalBId,
      questionId: qB2Id,
      awardedMarks: 21,
      evaluatorId: "examiner_beta",
      expectedVersion: 1,
    });

    await submitHandler.execute({
      evaluationId: evalBId,
      evaluatorId: "examiner_beta",
      expectedVersion: 2,
    });

    return {
      rubricId,
      crit1Id,
      crit2Id,
      evalA: { id: evalAId, q1Id: qA1Id, q2Id: qA2Id, signalId: signalA.id, caseId: triageCaseA.id, caseVersion: triageCaseA.version },
      evalB: { id: evalBId, q1Id: qB1Id, q2Id: qB2Id },
    };
  }

  // =========================================================================
  // Section 1: Advisory Assistance Types Coverage (01-prod §16, 06-api §34–35)
  // =========================================================================
  describe("1. Advisory Assistance Types Coverage (01-prod §16, 06-api §34–35)", () => {
    it("generates grounded EVALUATION_SUMMARY itemizing marked and unmarked questions", async () => {
      const cohort = await seedTestCohort();

      const response = await aiService.generateAdvisory({
        evaluationId: cohort.evalA.id,
        assistanceType: AiAssistanceType.EVALUATION_SUMMARY,
      });

      expect(response.type).toBe(AiAssistanceType.EVALUATION_SUMMARY);
      expect(response.status).toBe("SUCCESS");
      expect(response.recommendation).toContain("1 of 2 questions marked");
      expect(response.recommendation).toContain("22 / 50 marks");
      expect(response.recommendation).toContain("Unmarked questions detected: [1(b)]");
      expect(response.recommendation).toContain("1 questions have annotations");
      expect(response.confidence).toBeGreaterThanOrEqual(0.85);
      expect(response.evidenceReferences).toContain("question:1(a)");
      expect(response.evidenceReferences).toContain("question:1(b)");
      expect(response.model.provider).toBe("OSM-Mock-AI");
      expect(response.model.model).toBe("osm-advisory-model-v1");
      expect(response.model.version).toBe("1.0.0");
      expect(response.disclaimer).toContain("Advisory AI assistance only");
    });

    it("generates grounded SIGNAL_EXPLANATION contextualizing quality anomaly and evidence", async () => {
      const cohort = await seedTestCohort();

      const response = await aiService.generateAdvisory({
        evaluationId: cohort.evalA.id,
        qualitySignalId: cohort.evalA.signalId,
        assistanceType: AiAssistanceType.SIGNAL_EXPLANATION,
      });

      expect(response.type).toBe(AiAssistanceType.SIGNAL_EXPLANATION);
      expect(response.status).toBe("SUCCESS");
      expect(response.recommendation).toContain("Quality Signal Analysis");
      expect(response.recommendation).toContain("completeness-detector");
      expect(response.recommendation).toContain("Severity: MEDIUM");
      expect(response.recommendation).toContain("Recommended action: Review flagged evaluation");
      expect(response.evidenceReferences).toContain(`signal:${cohort.evalA.signalId}`);
      expect(response.evidenceReferences).toContain("question:1(a)");
      expect(response.evidenceReferences).toContain("question:1(b)");
    });

    it("generates grounded RUBRIC_ADVISORY summarizing performance criteria and levels", async () => {
      const cohort = await seedTestCohort();

      const response = await aiService.generateAdvisory({
        evaluationId: cohort.evalA.id,
        assistanceType: AiAssistanceType.RUBRIC_ADVISORY,
      });

      expect(response.type).toBe(AiAssistanceType.RUBRIC_ADVISORY);
      expect(response.status).toBe("SUCCESS");
      expect(response.recommendation).toContain("Rubric Guidance Analysis");
      expect(response.recommendation).toContain("2 performance criteria evaluated");
      expect(response.recommendation).toContain("Memory Management & Virtual Memory (Max: 25)");
      expect(response.recommendation).toContain("Concurrency & Deadlocks (Max: 25)");
      expect(response.evidenceReferences).toContain(`rubric:${cohort.crit1Id}`);
      expect(response.evidenceReferences).toContain(`rubric:${cohort.crit2Id}`);
    });
  });

  // =========================================================================
  // Section 2: 50-Run Deterministic Reproducibility (09-testing §40)
  // =========================================================================
  describe("2. Deterministic Reproducibility (09-testing §40)", () => {
    it("produces bit-for-bit identical recommendations across 50 consecutive runs on identical inputs", async () => {
      const cohort = await seedTestCohort();

      const baseline = await aiService.generateAdvisory({
        evaluationId: cohort.evalA.id,
        qualitySignalId: cohort.evalA.signalId,
        assistanceType: AiAssistanceType.SIGNAL_EXPLANATION,
      });

      for (let i = 0; i < 50; i++) {
        const iteration = await aiService.generateAdvisory({
          evaluationId: cohort.evalA.id,
          qualitySignalId: cohort.evalA.signalId,
          assistanceType: AiAssistanceType.SIGNAL_EXPLANATION,
        });

        expect(iteration.recommendation).toBe(baseline.recommendation);
        expect(iteration.confidence).toBe(baseline.confidence);
        expect(iteration.evidenceReferences).toEqual(baseline.evidenceReferences);
        expect(iteration.model.provider).toBe(baseline.model.provider);
        expect(iteration.model.model).toBe(baseline.model.model);
        expect(iteration.model.version).toBe(baseline.model.version);
        expect(iteration.status).toBe(baseline.status);
        expect(iteration.type).toBe(baseline.type);
      }
    });
  });

  // =========================================================================
  // Section 3: AI Non-Authority & Multi-Command Rejection (INV-003, INV-004)
  // =========================================================================
  describe("3. AI Non-Authority & Multi-Command Rejection (INV-003, INV-004)", () => {
    it("strictly rejects AssignMarkCommand when actorType is AI", async () => {
      const cohort = await seedTestCohort();
      const assignMarkHandler = new AssignMarkHandler(unitOfWork);

      await expect(
        assignMarkHandler.execute({
          evaluationId: cohort.evalA.id,
          questionId: cohort.evalA.q2Id,
          awardedMarks: 15,
          evaluatorId: "ai_agent_1",
          actorType: "AI",
          expectedVersion: 2,
        })
      ).rejects.toThrow(UnauthorizedActionError);
    });

    it("strictly rejects SubmitEvaluationCommand when actorType is AI", async () => {
      const cohort = await seedTestCohort();
      const submitHandler = new SubmitEvaluationHandler(unitOfWork);

      await expect(
        submitHandler.execute({
          evaluationId: cohort.evalB.id,
          evaluatorId: "ai_agent_1",
          actorType: "AI",
          expectedVersion: 3,
        })
      ).rejects.toThrow(UnauthorizedActionError);
    });

    it("strictly rejects CreateTriageCaseCommand when actorType is AI", async () => {
      const cohort = await seedTestCohort();
      const triageHandler = new CreateTriageCaseHandler(unitOfWork);

      await expect(
        triageHandler.execute({
          qualitySignalId: cohort.evalA.signalId,
          evaluationId: cohort.evalA.id,
          priority: "HIGH",
          actorId: "ai_bot",
          actorType: "AI",
        })
      ).rejects.toThrow(UnauthorizedActionError);
    });

    it("strictly rejects AssignTriageCaseCommand when actorType is AI", async () => {
      const cohort = await seedTestCohort();
      const assignCaseHandler = new AssignTriageCaseHandler(unitOfWork);

      await expect(
        assignCaseHandler.execute({
          caseId: cohort.evalA.caseId,
          assigneeId: "moderator_2",
          actorId: "ai_bot",
          actorType: "AI",
          expectedVersion: 0,
        })
      ).rejects.toThrow(UnauthorizedActionError);
    });

    it("strictly rejects ResolveTriageCaseCommand when actorType is AI", async () => {
      const cohort = await seedTestCohort();
      const resolveHandler = new ResolveTriageCaseHandler(unitOfWork);

      await expect(
        resolveHandler.execute({
          caseId: cohort.evalA.caseId,
          outcome: ResolutionOutcome.CONFIRMED_VALID,
          reason: "AI autonomous decision: evaluation marks confirmed",
          actorId: "ai_bot",
          actorType: "AI",
          expectedVersion: 0,
        })
      ).rejects.toThrow(UnauthorizedActionError);
    });
  });

  // =========================================================================
  // Section 4: Operational State & Evaluation Mark Invariance (INV-003, INV-005)
  // =========================================================================
  describe("4. Operational State & Evaluation Mark Invariance (INV-003, INV-005)", () => {
    it("proves multiple AI advisory calls across all types perform zero mutations on marks, scores, and versions", async () => {
      const cohort = await seedTestCohort();

      // Snapshot authoritative state before AI execution
      const evalBefore = await evalRepo.findById(cohort.evalA.id);
      expect(evalBefore).not.toBeNull();
      const marksBefore = evalBefore!.questions.map((q) => evalBefore!.getMark(q.id));
      const versionBefore = evalBefore!.version;
      const statusBefore = evalBefore!.status;
      const totalScoreBefore = evalBefore!.totalScore;

      const auditCountBefore = (await auditRepo.findAll()).length;

      // Execute AI advisory multiple times across all three assistance types
      await aiService.generateAdvisory({
        evaluationId: cohort.evalA.id,
        assistanceType: AiAssistanceType.EVALUATION_SUMMARY,
      });

      await aiService.generateAdvisory({
        evaluationId: cohort.evalA.id,
        qualitySignalId: cohort.evalA.signalId,
        assistanceType: AiAssistanceType.SIGNAL_EXPLANATION,
      });

      await aiService.generateAdvisory({
        evaluationId: cohort.evalA.id,
        assistanceType: AiAssistanceType.RUBRIC_ADVISORY,
      });

      // Reload authoritative evaluation from database
      const evalAfter = await evalRepo.findById(cohort.evalA.id);
      expect(evalAfter).not.toBeNull();
      const marksAfter = evalAfter!.questions.map((q) => evalAfter!.getMark(q.id));

      expect(evalAfter!.version).toBe(versionBefore);
      expect(evalAfter!.status).toBe(statusBefore);
      expect(evalAfter!.totalScore).toBe(totalScoreBefore);
      expect(marksAfter).toEqual(marksBefore);

      // Verify that AI advisory generated exactly zero audit records
      const auditCountAfter = (await auditRepo.findAll()).length;
      expect(auditCountAfter).toBe(auditCountBefore);
    });
  });

  // =========================================================================
  // Section 5: Context Boundary, Privacy Protection & Isolation (02-arch §28)
  // =========================================================================
  describe("5. Context Boundary, Privacy Protection & Isolation (02-arch §28)", () => {
    it("guarantees candidate PII, evaluator IDs, and credentials are completely absent from context", async () => {
      const cohort = await seedTestCohort();

      const context = await contextBuilder.buildContext({
        evaluationId: cohort.evalA.id,
        qualitySignalId: cohort.evalA.signalId,
        triageCaseId: cohort.evalA.caseId,
        assistanceType: AiAssistanceType.EVALUATION_SUMMARY,
      });

      const serialized = JSON.stringify(context);

      // Strictly verify no student/evaluator identifiers
      expect(serialized).not.toContain("examiner_alpha");
      expect(serialized).not.toContain("moderator_lead");
      expect(serialized).not.toContain("studentId");
      expect(serialized).not.toContain("candidateName");
      expect(serialized).not.toContain("rollNumber");
      expect(serialized).not.toContain("bearer");
      expect(serialized).not.toContain("token");
      expect(serialized).not.toContain("password");
    });

    it("strictly isolates cross-evaluation signal and triage context across cohort", async () => {
      const cohort = await seedTestCohort();

      // Attempt to attach Evaluation A's signal to Evaluation B
      await expect(
        contextBuilder.buildContext({
          evaluationId: cohort.evalB.id,
          qualitySignalId: cohort.evalA.signalId,
        })
      ).rejects.toThrow(InvalidArgumentError);

      // Attempt to attach Evaluation A's triage case to Evaluation B
      await expect(
        contextBuilder.buildContext({
          evaluationId: cohort.evalB.id,
          triageCaseId: cohort.evalA.caseId,
        })
      ).rejects.toThrow(InvalidArgumentError);
    });

    it("verifies deep runtime immutability on context and sub-objects", async () => {
      const cohort = await seedTestCohort();

      const context = await contextBuilder.buildContext({
        evaluationId: cohort.evalA.id,
        qualitySignalId: cohort.evalA.signalId,
        assistanceType: AiAssistanceType.SIGNAL_EXPLANATION,
      });

      expect(Object.isFrozen(context)).toBe(true);
      expect(Object.isFrozen(context.questions)).toBe(true);
      expect(Object.isFrozen(context.questions[0])).toBe(true);
      expect(Object.isFrozen(context.rubricCriteria)).toBe(true);
      expect(Object.isFrozen(context.rubricCriteria[0])).toBe(true);
      expect(Object.isFrozen(context.signalContext)).toBe(true);

      // Mutating frozen property should throw in strict mode
      expect(() => {
        (context as Record<string, unknown>).evaluationId = "tampered_id";
      }).toThrow();
    });
  });

  // =========================================================================
  // Section 6: Fault Recovery & Fallback Degradation (02-arch §30, 06-api §36)
  // =========================================================================
  describe("6. Fault Recovery & Fallback Degradation (02-arch §30, 06-api §36)", () => {
    it("degrades gracefully to valid heuristic fallback on provider connection exception", async () => {
      const cohort = await seedTestCohort();
      mockProvider.setOptions({ shouldFail: true, failureMessage: "ECONNREFUSED: AI Provider cluster offline" });

      const response = await aiService.generateAdvisory({
        evaluationId: cohort.evalA.id,
        qualitySignalId: cohort.evalA.signalId,
        assistanceType: AiAssistanceType.SIGNAL_EXPLANATION,
      });

      expect(response.status).toBe("FALLBACK");
      expect(response.confidence).toBe(0.5);
      expect(response.recommendation).toContain("Deterministic advisory fallback");
      expect(response.recommendation).toContain("1/2 questions evaluated");
      expect(response.recommendation).toContain("Current total: 22/50 marks");
      expect(response.recommendation).toContain("Missing marks on questions: [1(b)]");
      expect(response.recommendation).toContain("completeness-detector");
      expect(response.recommendation).toContain("Manual examiner review is recommended");
      expect(response.model.model).toBe("deterministic-heuristic-fallback");
      expect(response.disclaimer).toContain("deterministic fallback mode");

      // Verify that fallback response itself strictly validates against schema
      const parseResult = AiRecommendationResponseSchema.safeParse(response);
      expect(parseResult.success).toBe(true);
    });

    it("degrades gracefully to fallback when provider latency exceeds timeoutMs", async () => {
      const cohort = await seedTestCohort();
      const shortTimeoutService = new AiService(contextBuilder, mockProvider, { timeoutMs: 30 });
      mockProvider.setOptions({ delayMs: 150 });

      const response = await shortTimeoutService.generateAdvisory({
        evaluationId: cohort.evalA.id,
        assistanceType: AiAssistanceType.EVALUATION_SUMMARY,
      });

      expect(response.status).toBe("FALLBACK");
      expect(response.recommendation).toContain("Deterministic advisory fallback");
    });

    it("degrades gracefully to fallback when provider returns malformed schema output", async () => {
      const cohort = await seedTestCohort();
      mockProvider.setOptions({ malformedOutput: true });

      const response = await aiService.generateAdvisory({
        evaluationId: cohort.evalA.id,
        assistanceType: AiAssistanceType.EVALUATION_SUMMARY,
      });

      expect(response.status).toBe("FALLBACK");
      expect(response.confidence).toBe(0.5);
    });

    it("re-throws provider exception when fallback is explicitly disabled", async () => {
      const cohort = await seedTestCohort();
      const noFallbackService = new AiService(contextBuilder, mockProvider, { fallbackEnabled: false });
      mockProvider.setOptions({ shouldFail: true, failureMessage: "Fatal model error" });

      await expect(
        noFallbackService.generateAdvisory({
          evaluationId: cohort.evalA.id,
          assistanceType: AiAssistanceType.EVALUATION_SUMMARY,
        })
      ).rejects.toThrow("Fatal model error");
    });
  });

  // =========================================================================
  // Section 7: Advisory-to-Human Consequential Handoff Workflow
  // =========================================================================
  describe("7. Advisory-to-Human Consequential Handoff Workflow", () => {
    it("proves workflow: AI generates advisory recommendation -> Human moderator resolves case -> Human AuditEvent is recorded", async () => {
      const cohort = await seedTestCohort();
      const resolveHandler = new ResolveTriageCaseHandler(unitOfWork);

      // Step 1: Moderator requests AI advisory on flagged evaluation
      const advisory = await aiService.generateAdvisory({
        evaluationId: cohort.evalA.id,
        qualitySignalId: cohort.evalA.signalId,
        triageCaseId: cohort.evalA.caseId,
        assistanceType: AiAssistanceType.SIGNAL_EXPLANATION,
      });

      expect(advisory.status).toBe("SUCCESS");
      expect(advisory.recommendation).toContain("Recommended action: Review flagged evaluation");

      // Step 2: Human moderator uses advisory to formulate an informed human decision
      const resolutionResult = await resolveHandler.execute({
        caseId: cohort.evalA.caseId,
        outcome: ResolutionOutcome.CORRECTION_REQUIRED,
        reason: "Confirmed missing question 1(b) as noted in signal and advisory. Returning to examiner.",
        notes: `AI advisory reference: ${advisory.id}`,
        evidenceReferences: advisory.evidenceReferences,
        actorId: "moderator_senior_1",
        actorType: "USER",
        userRole: "MODERATOR",
        expectedVersion: cohort.evalA.caseVersion,
      });

      expect(resolutionResult.triageCase.status).toBe("RESOLVED");
      expect(resolutionResult.resolution.outcome).toBe(ResolutionOutcome.CORRECTION_REQUIRED);
      expect(resolutionResult.resolution.moderatorId).toBe("moderator_senior_1");

      // Step 3: Verify that the resulting AuditEvent attributes the human moderator, NOT the AI
      const auditEvents = await auditRepo.findByEntity("TriageCase", cohort.evalA.caseId);
      const resolveAudit = auditEvents.find((e) => e.eventType === "TriageCaseResolved");

      expect(resolveAudit).toBeDefined();
      expect(resolveAudit!.actorType).toBe("USER");
      expect(resolveAudit!.actorId).toBe("moderator_senior_1");
      expect(resolveAudit!.action).toBe("RESOLVE_TRIAGE_CASE");
      expect(resolveAudit!.details.outcome).toBe(ResolutionOutcome.CORRECTION_REQUIRED);
      expect(resolveAudit!.details.reason).toContain("Confirmed missing question 1(b)");
    });
  });
});
