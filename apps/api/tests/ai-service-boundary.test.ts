/**
 * Test Suite: TASK-P7-AI-001 — AI Service Boundary & Context Builder
 *
 * Verifies:
 * 1. AI context builder data assembly and strict minimization (02-arch §28)
 * 2. AI context runtime immutability (ARCH-008)
 * 3. Cross-evaluation context protection & entity validation
 * 4. AI provider abstraction & deterministic mock provider (02-arch §27, 09-testing §96)
 * 5. Output schema validation and provenance metadata (02-arch §29, 06-api §35, 05-domain §36)
 * 6. Deterministic failure recovery and safe fallback degradation (02-arch §30, 06-api §36, 09-testing §38)
 * 7. AI non-authority invariant & evaluation mark invariance (INV-003, INV-004, INV-005)
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { randomUUID } from "node:crypto";
import {
  AiAssistanceType,
  AiRecommendationResponseSchema,
  SignalSeverity,
  type ApprovedAiContext,
} from "@osm/shared";
import { createDatabase, type KyselyDb } from "../src/infrastructure/database/database.js";
import { runMigrations } from "../src/infrastructure/database/migrator.js";
import {
  KyselyEvaluationRepository,
  KyselyRubricRepository,
  KyselyQualitySignalRepository,
  KyselyTriageCaseRepository,
} from "../src/infrastructure/repositories/index.js";
import { KyselyUnitOfWork } from "../src/infrastructure/persistence/kysely-unit-of-work.js";
import {
  CreateRubricHandler,
  CreateEvaluationHandler,
  AssignMarkHandler,
  SubmitEvaluationHandler,
  CreateTriageCaseHandler,
  EntityNotFoundError,
} from "../src/application/index.js";
import { InvalidArgumentError } from "../src/domain/errors.js";
import { AiContextBuilder } from "../src/application/ai/ai-context-builder.js";
import { AiService } from "../src/application/ai/ai-service.js";
import { DeterministicMockAiProvider } from "../src/infrastructure/ai/mock-ai-provider.js";

describe("TASK-P7-AI-001: AI Service Boundary & Context Builder", () => {
  let db: KyselyDb;
  let unitOfWork: KyselyUnitOfWork;
  let evalRepo: KyselyEvaluationRepository;
  let rubricRepo: KyselyRubricRepository;
  let signalRepo: KyselyQualitySignalRepository;
  let triageRepo: KyselyTriageCaseRepository;

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
    unitOfWork = new KyselyUnitOfWork(db);

    contextBuilder = new AiContextBuilder(evalRepo, rubricRepo, signalRepo, triageRepo);
    mockProvider = new DeterministicMockAiProvider();
    aiService = new AiService(contextBuilder, mockProvider);
  });

  afterEach(async () => {
    await db.destroy();
  });

  /**
   * Helper to seed a standard evaluation workflow fixture with questions, marks, and rubric.
   */
  async function seedEvaluationFixture() {
    const rubricHandler = new CreateRubricHandler(unitOfWork);
    const evalHandler = new CreateEvaluationHandler(unitOfWork);
    const assignMarkHandler = new AssignMarkHandler(unitOfWork);
    const submitHandler = new SubmitEvaluationHandler(unitOfWork);

    const rubricId = `rubric_${randomUUID()}`;
    const crit1Id = `crit_${randomUUID()}`;
    const crit2Id = `crit_${randomUUID()}`;

    // 1. Create Rubric
    await rubricHandler.execute({
      id: rubricId,
      title: "Algorithms & Data Structures Rubric 2026",
      version: 1,
      criteria: [
        {
          id: crit1Id,
          title: "Algorithmic Correctness",
          maxMarks: 20,
          description: "Accuracy of the logic, edge cases, and algorithmic complexity",
          levels: [
            { title: "Exemplary", marks: 20, description: "Optimal complexity and zero defects" },
            { title: "Competent", marks: 14, description: "Correct solution with minor sub-optimality" },
            { title: "Developing", marks: 7, description: "Partially correct with edge case defects" },
          ],
        },
        {
          id: crit2Id,
          title: "Code Clarity & Structure",
          maxMarks: 10,
          description: "Variable naming, modularity, and readable implementation",
          levels: [
            { title: "Clean", marks: 10, description: "Idiomatic and well-structured" },
            { title: "Adequate", marks: 5, description: "Readable but monolithic" },
          ],
        },
      ],
    });

    // 2. Create Evaluation
    const evalId = `eval_${randomUUID()}`;
    const q1Id = `q1_${randomUUID()}`;
    const q2Id = `q2_${randomUUID()}`;
    const examinerId = "examiner_ai_test_01";

    await evalHandler.execute({
      id: evalId,
      evaluationCycleId: "cycle_ai_2026",
      scriptId: `script_${randomUUID()}`,
      evaluatorId: examinerId,
      rubricId,
      rubricVersion: 1,
      questions: [
        { id: q1Id, questionNumber: "1", text: "Implement binary search", maxMarks: 20, rubricCriteriaId: crit1Id, orderIndex: 0 },
        { id: q2Id, questionNumber: "2", text: "Explain time complexity", maxMarks: 10, rubricCriteriaId: crit2Id, orderIndex: 1 },
      ],
    });

    // 3. Assign Mark on Question 1 only (leaving Question 2 unmarked)
    await assignMarkHandler.execute({
      evaluationId: evalId,
      questionId: q1Id,
      awardedMarks: 18,
      evaluatorId: examinerId,
      comments: "Optimal binary search implementation with neat boundary handling",
      isAnnotated: true,
    });

    // 4. Submit Evaluation (completeness validator generates QualitySignal)
    await submitHandler.execute({
      evaluationId: evalId,
      evaluatorId: examinerId,
    });

    // 5. Retrieve generated QualitySignal
    const signals = await signalRepo.findByEvaluationId(evalId);
    const signalId = signals[0]?.id;

    // 6. Create TriageCase
    const createCaseHandler = new CreateTriageCaseHandler(unitOfWork);
    const triageCase = await createCaseHandler.execute({
      id: `case_${randomUUID()}`,
      caseNumber: `CASE-${randomUUID().substring(0, 8).toUpperCase()}`,
      qualitySignalId: signalId,
      priority: SignalSeverity.HIGH,
      notes: "Unmarked question 2 flagged during evaluation submission",
      actorId: "mod_lead",
      actorType: "USER",
      userRole: "MODERATOR",
    });

    return {
      evalId,
      rubricId,
      crit1Id,
      crit2Id,
      q1Id,
      q2Id,
      signalId,
      caseId: triageCase.id,
      examinerId,
    };
  }

  describe("1. Context Builder Data Assembly & Minimization (02-arch §28)", () => {
    it("assembles an approved, sanitized AI context with required questions and rubric criteria", async () => {
      const fixture = await seedEvaluationFixture();

      const context = await contextBuilder.buildContext({
        evaluationId: fixture.evalId,
        assistanceType: AiAssistanceType.EVALUATION_SUMMARY,
      });

      expect(context.evaluationId).toBe(fixture.evalId);
      expect(context.rubricId).toBe(fixture.rubricId);
      expect(context.rubricVersion).toBe(1);
      expect(context.assistanceType).toBe(AiAssistanceType.EVALUATION_SUMMARY);

      // Verify Questions context
      expect(context.questions.length).toBe(2);
      expect(context.questions[0].questionNumber).toBe("1");
      expect(context.questions[0].text).toBe("Implement binary search");
      expect(context.questions[0].maxMarks).toBe(20);
      expect(context.questions[0].awardedMarks).toBe(18);
      expect(context.questions[0].comments).toBe("Optimal binary search implementation with neat boundary handling");
      expect(context.questions[0].isAnnotated).toBe(true);
      expect(context.questions[0].criteriaTitle).toBe("Algorithmic Correctness");

      expect(context.questions[1].questionNumber).toBe("2");
      expect(context.questions[1].awardedMarks).toBeNull();
      expect(context.questions[1].comments).toBeNull();
      expect(context.questions[1].isAnnotated).toBe(false);

      // Verify Rubric Criteria context
      expect(context.rubricCriteria.length).toBe(2);
      expect(context.rubricCriteria[0].id).toBe(fixture.crit1Id);
      expect(context.rubricCriteria[0].title).toBe("Algorithmic Correctness");
      expect(context.rubricCriteria[0].levels?.length).toBe(3);
      expect(context.rubricCriteria[1].id).toBe(fixture.crit2Id);

      // Verify data minimization: Candidate identity & PII are NOT exposed
      expect(context).not.toHaveProperty("studentId");
      expect(context).not.toHaveProperty("candidateId");
      expect(context).not.toHaveProperty("rollNumber");
      expect(context).not.toHaveProperty("candidateName");
      expect(context).not.toHaveProperty("password");
      expect(context).not.toHaveProperty("credentials");
    });

    it("enriches context with QualitySignal evidence when signalId is provided", async () => {
      const fixture = await seedEvaluationFixture();

      const context = await contextBuilder.buildContext({
        evaluationId: fixture.evalId,
        qualitySignalId: fixture.signalId,
        assistanceType: AiAssistanceType.SIGNAL_EXPLANATION,
      });

      expect(context.signalContext).not.toBeNull();
      expect(context.signalContext?.signalId).toBe(fixture.signalId);
      expect(context.signalContext?.detectorType).toBeDefined();
      expect(context.signalContext?.detectorName).toBeDefined();
      expect(context.signalContext?.severity).toBeDefined();
      expect(context.signalContext?.summary).toBeDefined();
      expect(context.signalContext?.metrics).toBeDefined();
    });

    it("enriches context with TriageCase notes and priority when triageCaseId is provided", async () => {
      const fixture = await seedEvaluationFixture();

      const context = await contextBuilder.buildContext({
        evaluationId: fixture.evalId,
        triageCaseId: fixture.caseId,
      });

      expect(context.triageContext).not.toBeNull();
      expect(context.triageContext?.caseId).toBe(fixture.caseId);
      expect(context.triageContext?.priority).toBe(SignalSeverity.HIGH);
      expect(context.triageContext?.notes).toContain("Unmarked question 2");
    });
  });

  describe("2. Context Runtime Immutability (ARCH-008)", () => {
    it("guarantees deep immutability via Object.freeze on the assembled ApprovedAiContext", async () => {
      const fixture = await seedEvaluationFixture();

      const context = await contextBuilder.buildContext({
        evaluationId: fixture.evalId,
      });

      // Top-level object must be frozen
      expect(Object.isFrozen(context)).toBe(true);

      // Nested collections and objects must be deeply frozen
      expect(Object.isFrozen(context.questions)).toBe(true);
      expect(Object.isFrozen(context.questions[0])).toBe(true);
      expect(Object.isFrozen(context.rubricCriteria)).toBe(true);
      expect(Object.isFrozen(context.rubricCriteria[0])).toBe(true);

      // Attempting to mutate in strict mode must throw
      expect(() => {
        (context as { evaluationId: string }).evaluationId = "tampered_eval_id";
      }).toThrow(TypeError);

      expect(() => {
        (context.questions[0] as { text: string }).text = "mutated text";
      }).toThrow(TypeError);
    });
  });

  describe("3. Cross-Evaluation Boundary & Entity Validation", () => {
    it("strictly throws when evaluationId is missing or whitespace", async () => {
      await expect(contextBuilder.buildContext({ evaluationId: "" })).rejects.toThrow(
        InvalidArgumentError
      );
      await expect(contextBuilder.buildContext({ evaluationId: "   " })).rejects.toThrow(
        InvalidArgumentError
      );
    });

    it("strictly throws EntityNotFoundError when evaluation does not exist", async () => {
      await expect(
        contextBuilder.buildContext({ evaluationId: "eval_non_existent" })
      ).rejects.toThrow(EntityNotFoundError);
    });

    it("strictly throws InvalidArgumentError on cross-evaluation signal context leakage", async () => {
      const fixture1 = await seedEvaluationFixture();
      const fixture2 = await seedEvaluationFixture();

      // Attempt to link fixture1's signal to fixture2's evaluation
      await expect(
        contextBuilder.buildContext({
          evaluationId: fixture2.evalId,
          qualitySignalId: fixture1.signalId,
        })
      ).rejects.toThrow(InvalidArgumentError);
    });

    it("strictly throws InvalidArgumentError on cross-evaluation triage case context leakage", async () => {
      const fixture1 = await seedEvaluationFixture();
      const fixture2 = await seedEvaluationFixture();

      // Attempt to link fixture1's triage case to fixture2's evaluation
      await expect(
        contextBuilder.buildContext({
          evaluationId: fixture2.evalId,
          triageCaseId: fixture1.caseId,
        })
      ).rejects.toThrow(InvalidArgumentError);
    });
  });

  describe("4. Provider Abstraction & Deterministic Mock Provider (02-arch §27, 09-testing §96)", () => {
    it("generates deterministic EVALUATION_SUMMARY advisory conforming to AiProvider contract", async () => {
      const fixture = await seedEvaluationFixture();
      const context = await contextBuilder.buildContext({
        evaluationId: fixture.evalId,
        assistanceType: AiAssistanceType.EVALUATION_SUMMARY,
      });

      const rawOutput = await mockProvider.generateAdvisory(context);

      expect(rawOutput.recommendation).toContain("Evaluation summary: 1 of 2 questions marked");
      expect(rawOutput.recommendation).toContain("Awarded score: 18 / 30 marks");
      expect(rawOutput.recommendation).toContain("Unmarked questions detected: [2]");
      expect(rawOutput.confidence).toBe(0.92);
      expect(rawOutput.evidenceReferences).toContain("question:1");
      expect(rawOutput.evidenceReferences).toContain("question:2");
    });

    it("generates deterministic SIGNAL_EXPLANATION advisory conforming to AiProvider contract", async () => {
      const fixture = await seedEvaluationFixture();
      const context = await contextBuilder.buildContext({
        evaluationId: fixture.evalId,
        qualitySignalId: fixture.signalId,
        assistanceType: AiAssistanceType.SIGNAL_EXPLANATION,
      });

      const rawOutput = await mockProvider.generateAdvisory(context);

      expect(rawOutput.recommendation).toContain("Quality Signal Analysis");
      expect(rawOutput.recommendation).toContain("Severity: MEDIUM");
      expect(rawOutput.confidence).toBe(0.88);
      expect(rawOutput.evidenceReferences).toContain(`signal:${fixture.signalId}`);
    });

    it("generates deterministic RUBRIC_ADVISORY advisory conforming to AiProvider contract", async () => {
      const fixture = await seedEvaluationFixture();
      const context = await contextBuilder.buildContext({
        evaluationId: fixture.evalId,
        assistanceType: AiAssistanceType.RUBRIC_ADVISORY,
      });

      const rawOutput = await mockProvider.generateAdvisory(context);

      expect(rawOutput.recommendation).toContain("Rubric Guidance Analysis");
      expect(rawOutput.recommendation).toContain("2 performance criteria evaluated");
      expect(rawOutput.confidence).toBe(0.85);
      expect(rawOutput.evidenceReferences).toContain(`rubric:${fixture.crit1Id}`);
      expect(rawOutput.evidenceReferences).toContain(`rubric:${fixture.crit2Id}`);
    });
  });

  describe("5. Schema Validation & Provenance Metadata (02-arch §29, 06-api §35, 05-domain §36)", () => {
    it("validates that full AiService output conforms strictly to AiRecommendationResponseSchema", async () => {
      const fixture = await seedEvaluationFixture();

      const response = await aiService.generateAdvisory({
        evaluationId: fixture.evalId,
        assistanceType: AiAssistanceType.EVALUATION_SUMMARY,
      });

      // Zod schema validation
      const parseResult = AiRecommendationResponseSchema.safeParse(response);
      expect(parseResult.success).toBe(true);

      expect(response.id).toMatch(/^ai_adv_/);
      expect(response.type).toBe(AiAssistanceType.EVALUATION_SUMMARY);
      expect(response.status).toBe("SUCCESS");
      expect(response.confidence).toBeGreaterThanOrEqual(0);
      expect(response.confidence).toBeLessThanOrEqual(1);
      expect(response.evidenceReferences.length).toBeGreaterThan(0);

      // Model metadata provenance
      expect(response.model.provider).toBe("OSM-Mock-AI");
      expect(response.model.model).toBe("osm-advisory-model-v1");
      expect(response.model.version).toBe("1.0.0");
      expect(typeof response.model.executionTimeMs).toBe("number");

      // Non-authority disclaimer
      expect(response.disclaimer).toContain("Advisory AI assistance only");
      expect(response.generatedAt).toBeDefined();
    });
  });

  describe("6. Deterministic Failure Recovery & Safe Fallback Degradation (02-arch §30, 06-api §36, 09-testing §38)", () => {
    it("safely degrades to heuristic fallback when AI provider throws a connection failure", async () => {
      const fixture = await seedEvaluationFixture();

      // Configure provider to fail
      mockProvider.setOptions({
        shouldFail: true,
        failureMessage: "Remote AI endpoint unreachable: 503 Service Unavailable",
      });

      const response = await aiService.generateAdvisory({
        evaluationId: fixture.evalId,
        qualitySignalId: fixture.signalId,
        assistanceType: AiAssistanceType.EVALUATION_SUMMARY,
      });

      // Must degrade safely to fallback rather than crashing
      expect(response.status).toBe("FALLBACK");
      expect(response.confidence).toBe(0.5);
      expect(response.model.model).toBe("deterministic-heuristic-fallback");
      expect(response.recommendation).toContain("Deterministic advisory fallback");
      expect(response.recommendation).toContain("Current total: 18/30 marks");
      expect(response.recommendation).toContain("Missing marks on questions: [2]");
      expect(response.disclaimer).toContain("deterministic fallback mode");
      expect(response.evidenceReferences).toContain("question:1");
      expect(response.evidenceReferences).toContain("question:2");
    });

    it("safely degrades to fallback when AI provider times out", async () => {
      const fixture = await seedEvaluationFixture();

      // Configure provider with delay exceeding timeout
      mockProvider.setOptions({ delayMs: 100 });
      const timeoutService = new AiService(contextBuilder, mockProvider, {
        timeoutMs: 20, // 20ms timeout
        fallbackEnabled: true,
      });

      const response = await timeoutService.generateAdvisory({
        evaluationId: fixture.evalId,
      });

      expect(response.status).toBe("FALLBACK");
      expect(response.recommendation).toContain("Deterministic advisory fallback");
    });

    it("safely degrades to fallback when AI provider returns malformed output violating schema", async () => {
      const fixture = await seedEvaluationFixture();

      // Configure provider to return invalid output
      mockProvider.setOptions({ malformedOutput: true });

      const response = await aiService.generateAdvisory({
        evaluationId: fixture.evalId,
      });

      expect(response.status).toBe("FALLBACK");
      expect(response.recommendation).toContain("Deterministic advisory fallback");
    });

    it("re-throws error when fallback is explicitly disabled", async () => {
      const fixture = await seedEvaluationFixture();

      mockProvider.setOptions({
        shouldFail: true,
        failureMessage: "Forced test failure without fallback",
      });

      const noFallbackService = new AiService(contextBuilder, mockProvider, {
        fallbackEnabled: false,
      });

      await expect(
        noFallbackService.generateAdvisory({
          evaluationId: fixture.evalId,
        })
      ).rejects.toThrow("Forced test failure without fallback");
    });
  });

  describe("7. AI Non-Authority & Evaluation Mark Invariance (INV-003, INV-004, INV-005)", () => {
    it("guarantees AI service execution performs zero mutation on evaluation marks, scores, or statuses", async () => {
      const fixture = await seedEvaluationFixture();

      // Capture authoritative baseline state directly from persistence
      const baselineEval = await evalRepo.findById(fixture.evalId);
      expect(baselineEval).not.toBeNull();
      const baselineMark = baselineEval!.getMark(fixture.q1Id);
      const baselineScore = baselineEval!.totalScore;
      const baselineStatus = baselineEval!.status;
      const baselineVersion = baselineEval!.version;
      const baselineEvaluatorId = baselineEval!.evaluatorId;

      // Execute multiple AI operations: normal summary, signal explanation, rubric advisory, and fallback
      await aiService.generateAdvisory({
        evaluationId: fixture.evalId,
        assistanceType: AiAssistanceType.EVALUATION_SUMMARY,
      });

      await aiService.generateAdvisory({
        evaluationId: fixture.evalId,
        qualitySignalId: fixture.signalId,
        assistanceType: AiAssistanceType.SIGNAL_EXPLANATION,
      });

      await aiService.generateAdvisory({
        evaluationId: fixture.evalId,
        assistanceType: AiAssistanceType.RUBRIC_ADVISORY,
      });

      mockProvider.setOptions({ shouldFail: true });
      await aiService.generateAdvisory({
        evaluationId: fixture.evalId,
        assistanceType: AiAssistanceType.EVALUATION_SUMMARY,
      });

      // Verify that after multiple AI executions, authoritative evaluation state is 100% unaltered
      const afterEval = await evalRepo.findById(fixture.evalId);
      expect(afterEval).not.toBeNull();

      expect(afterEval!.totalScore).toBe(baselineScore);
      expect(afterEval!.status).toBe(baselineStatus);
      expect(afterEval!.version).toBe(baselineVersion);
      expect(afterEval!.evaluatorId).toBe(baselineEvaluatorId);

      const afterMark = afterEval!.getMark(fixture.q1Id);
      expect(afterMark?.awardedMarks).toBe(baselineMark?.awardedMarks);
      expect(afterMark?.comments).toBe(baselineMark?.comments);
      expect(afterMark?.isAnnotated).toBe(baselineMark?.isAnnotated);

      const unmarkedQ = afterEval!.getMark(fixture.q2Id);
      expect(unmarkedQ).toBeUndefined(); // Question 2 was not marked and remains unmarked

      // Verify zero audit events were recorded claiming a human decision occurred
      const auditRows = await db
        .selectFrom("audit_events")
        .selectAll()
        .where("action", "like", "%AI%")
        .execute();
      expect(auditRows.length).toBe(0);
    });
  });
});
