/**
 * Integration & Unit Tests for QualitySignal Aggregate, Generator, Repository, and Submission Pipeline (TASK-P3-VAL-002).
 *
 * Conforms to:
 * - docs/contracts/01-product-contract.md §13 (CompleteCheck & QualitySignal)
 * - docs/contracts/02-architecture-contract.md §4 (ARCH-004), §6 (ARCH-006 Deterministic Before AI), §8 (Unit of Work)
 * - docs/contracts/05-domain-contract.md §19-21 (QualitySignal Aggregate & Lifecycle)
 * - docs/contracts/06-api-contract.md §25-27, §65 (QualitySignal read-only access)
 * - docs/contracts/07-event-contract.md §5, §11-12, §14-15 (QualitySignalGenerated Outbox Event)
 * - docs/contracts/08-data-contract.md §17-18, §28-31 (QualitySignal Persistence & Deduplication)
 * - docs/contracts/09-testing-contract.md §41, §144 (QualitySignal verification)
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { randomUUID } from "node:crypto";
import { createDatabase, type KyselyDb } from "../src/infrastructure/database/database.js";
import { runMigrations } from "../src/infrastructure/database/migrator.js";
import {
  KyselyEvaluationRepository,
  KyselyRubricRepository,
  KyselyQualitySignalRepository,
} from "../src/infrastructure/repositories/index.js";
import { KyselyUnitOfWork } from "../src/infrastructure/persistence/index.js";
import {
  QualitySignal,
  CompletenessSignalGenerator,
  COMPLETENESS_DETECTOR_PROVENANCE,
  SignalSeverity,
  QualitySignalStatus,
  InvalidArgumentError,
  InvalidStateTransitionError,
  Evaluation,
  type CompletenessResult,
} from "../src/domain/index.js";
import {
  CreateEvaluationHandler,
  CreateRubricHandler,
  AssignMarkHandler,
  SubmitEvaluationHandler,
  GetQualitySignalsByEvaluationHandler,
} from "../src/application/index.js";

describe("TASK-P3-VAL-002: QualitySignal Aggregate, Generator, Repository, and Pipeline", () => {
  let db: KyselyDb;
  let uow: KyselyUnitOfWork;
  let evaluationRepo: KyselyEvaluationRepository;
  let rubricRepo: KyselyRubricRepository;
  let qualitySignalRepo: KyselyQualitySignalRepository;

  let createRubricHandler: CreateRubricHandler;
  let createEvaluationHandler: CreateEvaluationHandler;
  let assignMarkHandler: AssignMarkHandler;
  let submitEvaluationHandler: SubmitEvaluationHandler;
  let getQualitySignalsHandler: GetQualitySignalsByEvaluationHandler;

  beforeEach(async () => {
    db = createDatabase(":memory:");
    await runMigrations(db);

    evaluationRepo = new KyselyEvaluationRepository(db);
    rubricRepo = new KyselyRubricRepository(db);
    qualitySignalRepo = new KyselyQualitySignalRepository(db);
    uow = new KyselyUnitOfWork(db);

    createRubricHandler = new CreateRubricHandler(uow);
    createEvaluationHandler = new CreateEvaluationHandler(uow);
    assignMarkHandler = new AssignMarkHandler(uow);
    submitEvaluationHandler = new SubmitEvaluationHandler(uow);
    getQualitySignalsHandler = new GetQualitySignalsByEvaluationHandler(qualitySignalRepo);
  });

  afterEach(async () => {
    await db.destroy();
  });

  describe("QualitySignal Aggregate: Validation & Invariants", () => {
    it("should instantiate a valid QualitySignal with default REVIEWABLE status", () => {
      const signal = QualitySignal.create({
        evaluationId: "eval_test_001",
        evaluationVersion: 1,
        signalType: "COMPLETENESS_PARTIAL",
        severity: SignalSeverity.MEDIUM,
        summary: "Partial markings detected",
        evidence: { unmarkedQuestions: 2 },
        detector: COMPLETENESS_DETECTOR_PROVENANCE,
      });

      expect(signal.id).toBeDefined();
      expect(signal.evaluationId).toBe("eval_test_001");
      expect(signal.evaluationVersion).toBe(1);
      expect(signal.signalType).toBe("COMPLETENESS_PARTIAL");
      expect(signal.severity).toBe(SignalSeverity.MEDIUM);
      expect(signal.status).toBe(QualitySignalStatus.REVIEWABLE);
      expect(signal.summary).toBe("Partial markings detected");
      expect(signal.evidence).toEqual({ unmarkedQuestions: 2 });
      expect(signal.detector).toEqual(COMPLETENESS_DETECTOR_PROVENANCE);
      expect(signal.createdAt).toBeDefined();
      expect(signal.updatedAt).toBeDefined();
    });

    it("should throw InvalidArgumentError when evaluationId is missing or blank", () => {
      expect(() =>
        QualitySignal.create({
          evaluationId: "   ",
          evaluationVersion: 1,
          signalType: "COMPLETENESS_EMPTY",
          severity: SignalSeverity.CRITICAL,
          summary: "No questions",
          evidence: {},
          detector: COMPLETENESS_DETECTOR_PROVENANCE,
        })
      ).toThrow(InvalidArgumentError);
    });

    it("should throw InvalidArgumentError when evaluationVersion is negative", () => {
      expect(() =>
        QualitySignal.create({
          evaluationId: "eval_001",
          evaluationVersion: -1,
          signalType: "COMPLETENESS_EMPTY",
          severity: SignalSeverity.CRITICAL,
          summary: "No questions",
          evidence: {},
          detector: COMPLETENESS_DETECTOR_PROVENANCE,
        })
      ).toThrow(InvalidArgumentError);
    });

    it("should throw InvalidArgumentError when signalType is missing or blank", () => {
      expect(() =>
        QualitySignal.create({
          evaluationId: "eval_001",
          evaluationVersion: 1,
          signalType: "",
          severity: SignalSeverity.CRITICAL,
          summary: "No questions",
          evidence: {},
          detector: COMPLETENESS_DETECTOR_PROVENANCE,
        })
      ).toThrow(InvalidArgumentError);
    });

    it("should throw InvalidArgumentError when summary is missing or blank", () => {
      expect(() =>
        QualitySignal.create({
          evaluationId: "eval_001",
          evaluationVersion: 1,
          signalType: "COMPLETENESS_EMPTY",
          severity: SignalSeverity.CRITICAL,
          summary: "   ",
          evidence: {},
          detector: COMPLETENESS_DETECTOR_PROVENANCE,
        })
      ).toThrow(InvalidArgumentError);
    });

    it("should throw InvalidArgumentError when detector provenance is missing or invalid", () => {
      expect(() =>
        QualitySignal.create({
          evaluationId: "eval_001",
          evaluationVersion: 1,
          signalType: "COMPLETENESS_EMPTY",
          severity: SignalSeverity.CRITICAL,
          summary: "No questions",
          evidence: {},
          detector: { type: "DETERMINISTIC", name: "", version: "1.0.0" },
        })
      ).toThrow(InvalidArgumentError);
    });

    it("should throw InvalidArgumentError when severity is invalid", () => {
      expect(() =>
        QualitySignal.create({
          evaluationId: "eval_001",
          evaluationVersion: 1,
          signalType: "COMPLETENESS_EMPTY",
          severity: "NON_EXISTENT_SEVERITY" as any,
          summary: "No questions",
          evidence: {},
          detector: COMPLETENESS_DETECTOR_PROVENANCE,
        })
      ).toThrow(InvalidArgumentError);
    });

    it("should serialize to JSON and reconstitute correctly", () => {
      const original = QualitySignal.create({
        evaluationId: "eval_001",
        evaluationVersion: 2,
        signalType: "COMPLETENESS_UNMARKED",
        severity: SignalSeverity.HIGH,
        summary: "All unmarked",
        evidence: { total: 5 },
        detector: COMPLETENESS_DETECTOR_PROVENANCE,
      });

      const json = original.toJSON();
      expect(json.id).toBe(original.id);
      expect(json.signalType).toBe("COMPLETENESS_UNMARKED");

      const reconstituted = QualitySignal.reconstitute({
        id: original.id,
        evaluationId: original.evaluationId,
        evaluationVersion: original.evaluationVersion,
        signalType: original.signalType,
        severity: original.severity,
        status: original.status,
        summary: original.summary,
        evidence: original.evidence,
        detector: original.detector,
        createdAt: original.createdAt,
        updatedAt: original.updatedAt,
      });

      expect(reconstituted.id).toBe(original.id);
      expect(reconstituted.evaluationId).toBe(original.evaluationId);
      expect(reconstituted.severity).toBe(original.severity);
      expect(reconstituted.status).toBe(original.status);
    });
  });

  describe("QualitySignal Aggregate: Lifecycle Transitions", () => {
    it("should transition from REVIEWABLE to LINKED_TO_CASE with evidence", () => {
      const signal = QualitySignal.create({
        evaluationId: "eval_001",
        evaluationVersion: 1,
        signalType: "COMPLETENESS_PARTIAL",
        severity: SignalSeverity.MEDIUM,
        summary: "Partial marks",
        evidence: {},
        detector: COMPLETENESS_DETECTOR_PROVENANCE,
      });

      signal.linkToCase("case_123");
      expect(signal.status).toBe(QualitySignalStatus.LINKED_TO_CASE);
      expect(signal.evidence.linkedCaseId).toBe("case_123");
    });

    it("should transition from REVIEWABLE to DISMISSED with dismissal reason", () => {
      const signal = QualitySignal.create({
        evaluationId: "eval_001",
        evaluationVersion: 1,
        signalType: "COMPLETENESS_PARTIAL",
        severity: SignalSeverity.MEDIUM,
        summary: "Partial marks",
        evidence: {},
        detector: COMPLETENESS_DETECTOR_PROVENANCE,
      });

      signal.dismiss("Examiner verified non-applicable question");
      expect(signal.status).toBe(QualitySignalStatus.DISMISSED);
      expect(signal.evidence.dismissalReason).toBe("Examiner verified non-applicable question");
    });

    it("should transition to RESOLVED with outcome", () => {
      const signal = QualitySignal.create({
        evaluationId: "eval_001",
        evaluationVersion: 1,
        signalType: "COMPLETENESS_PARTIAL",
        severity: SignalSeverity.MEDIUM,
        summary: "Partial marks",
        evidence: {},
        detector: COMPLETENESS_DETECTOR_PROVENANCE,
      });

      signal.resolve("Moderator accepted marks after review");
      expect(signal.status).toBe(QualitySignalStatus.RESOLVED);
      expect(signal.evidence.resolutionOutcome).toBe("Moderator accepted marks after review");
    });

    it("should throw InvalidStateTransitionError when linking an already resolved signal to a case", () => {
      const signal = QualitySignal.create({
        evaluationId: "eval_001",
        evaluationVersion: 1,
        signalType: "COMPLETENESS_PARTIAL",
        severity: SignalSeverity.MEDIUM,
        summary: "Partial marks",
        evidence: {},
        detector: COMPLETENESS_DETECTOR_PROVENANCE,
      });

      signal.resolve();

      expect(() => signal.linkToCase("case_999")).toThrow(InvalidStateTransitionError);
      try {
        signal.linkToCase("case_999");
      } catch (err) {
        expect(err).toBeInstanceOf(InvalidStateTransitionError);
        const stateErr = err as InvalidStateTransitionError;
        expect(stateErr.entity).toBe("QualitySignal");
        expect(stateErr.fromStatus).toBe(QualitySignalStatus.RESOLVED);
        expect(stateErr.toStatus).toBe(QualitySignalStatus.LINKED_TO_CASE);
      }
    });

    it("should throw InvalidStateTransitionError when dismissing an already resolved signal", () => {
      const signal = QualitySignal.create({
        evaluationId: "eval_001",
        evaluationVersion: 1,
        signalType: "COMPLETENESS_PARTIAL",
        severity: SignalSeverity.MEDIUM,
        summary: "Partial marks",
        evidence: {},
        detector: COMPLETENESS_DETECTOR_PROVENANCE,
      });

      signal.resolve();

      expect(() => signal.dismiss("Too late")).toThrow(InvalidStateTransitionError);
      try {
        signal.dismiss("Too late");
      } catch (err) {
        expect(err).toBeInstanceOf(InvalidStateTransitionError);
        const stateErr = err as InvalidStateTransitionError;
        expect(stateErr.entity).toBe("QualitySignal");
        expect(stateErr.fromStatus).toBe(QualitySignalStatus.RESOLVED);
        expect(stateErr.toStatus).toBe(QualitySignalStatus.DISMISSED);
      }
    });
  });

  describe("CompletenessSignalGenerator: Deterministic Mappings", () => {
    const generator = new CompletenessSignalGenerator();

    const dummyEvaluation = Evaluation.create({
      id: "eval_dummy_001",
      evaluationCycleId: "cycle_dummy_2026",
      scriptId: "script_001",
      rubricId: "rubric_001",
      rubricVersion: 1,
      evaluatorId: "evaluator_001",
      questions: [
        { id: "q1", questionNumber: "1", text: "Question 1", maxMarks: 10, orderIndex: 1 },
      ],
    });

    it("should return null for a 100% complete evaluation (no signal generated)", () => {
      const completeness: CompletenessResult = {
        isValid: true,
        isComplete: true,
        totalQuestions: 3,
        markedQuestions: 3,
        unmarkedQuestions: 0,
        missingQuestionIds: [],
        issues: [],
      };

      const signal = generator.generate(dummyEvaluation, completeness);
      expect(signal).toBeNull();
    });

    it("should map zero questions to COMPLETENESS_EMPTY with CRITICAL severity", () => {
      const completeness: CompletenessResult = {
        isValid: false,
        isComplete: false,
        totalQuestions: 0,
        markedQuestions: 0,
        unmarkedQuestions: 0,
        missingQuestionIds: [],
        issues: [
          {
            code: "ZERO_QUESTIONS",
            message: "Evaluation has no questions defined.",
            severity: "ERROR",
          },
        ],
      };

      const signal = generator.generate(dummyEvaluation, completeness);
      expect(signal).not.toBeNull();
      expect(signal!.signalType).toBe("COMPLETENESS_EMPTY");
      expect(signal!.severity).toBe(SignalSeverity.CRITICAL);
      expect(signal!.status).toBe(QualitySignalStatus.REVIEWABLE);
      expect(signal!.detector).toEqual(COMPLETENESS_DETECTOR_PROVENANCE);
    });

    it("should map completely unmarked evaluation to COMPLETENESS_UNMARKED with HIGH severity", () => {
      const completeness: CompletenessResult = {
        isValid: false,
        isComplete: false,
        totalQuestions: 4,
        markedQuestions: 0,
        unmarkedQuestions: 4,
        missingQuestionIds: ["q1", "q2", "q3", "q4"],
        issues: [
          {
            code: "UNMARKED_QUESTIONS",
            message: "4 questions remain unmarked.",
            severity: "ERROR",
          },
        ],
      };

      const signal = generator.generate(dummyEvaluation, completeness);
      expect(signal).not.toBeNull();
      expect(signal!.signalType).toBe("COMPLETENESS_UNMARKED");
      expect(signal!.severity).toBe(SignalSeverity.HIGH);
      expect(signal!.status).toBe(QualitySignalStatus.REVIEWABLE);
      expect(signal!.evidence.missingQuestionIds).toEqual(["q1", "q2", "q3", "q4"]);
      expect(signal!.detector).toEqual(COMPLETENESS_DETECTOR_PROVENANCE);
    });

    it("should map partially marked evaluation to COMPLETENESS_PARTIAL with MEDIUM severity", () => {
      const completeness: CompletenessResult = {
        isValid: false,
        isComplete: false,
        totalQuestions: 3,
        markedQuestions: 1,
        unmarkedQuestions: 2,
        missingQuestionIds: ["q2", "q3"],
        issues: [
          {
            code: "UNMARKED_QUESTIONS",
            message: "2 questions remain unmarked.",
            severity: "ERROR",
          },
        ],
      };

      const signal = generator.generate(dummyEvaluation, completeness);
      expect(signal).not.toBeNull();
      expect(signal!.signalType).toBe("COMPLETENESS_PARTIAL");
      expect(signal!.severity).toBe(SignalSeverity.MEDIUM);
      expect(signal!.status).toBe(QualitySignalStatus.REVIEWABLE);
      expect(signal!.evidence.unmarkedQuestions).toBe(2);
      expect(signal!.evidence.missingQuestionIds).toEqual(["q2", "q3"]);
      expect(signal!.detector).toEqual(COMPLETENESS_DETECTOR_PROVENANCE);
    });

    it("should guarantee deterministic reproducibility across 50 repeated executions (Testing Contract §40)", () => {
      const completeness: CompletenessResult = {
        isValid: false,
        isComplete: false,
        totalQuestions: 5,
        markedQuestions: 3,
        unmarkedQuestions: 2,
        missingQuestionIds: ["q4", "q5"],
        issues: [
          {
            code: "UNMARKED_QUESTIONS",
            message: "2 questions remain unmarked.",
            severity: "ERROR",
          },
        ],
      };

      const baseline = generator.generate(dummyEvaluation, completeness);
      expect(baseline).not.toBeNull();

      for (let i = 0; i < 50; i++) {
        const next = generator.generate(dummyEvaluation, completeness);
        expect(next).not.toBeNull();
        expect(next!.signalType).toBe(baseline!.signalType);
        expect(next!.severity).toBe(baseline!.severity);
        expect(next!.status).toBe(baseline!.status);
        expect(next!.summary).toBe(baseline!.summary);
        expect(next!.detector).toEqual(baseline!.detector);
        expect(next!.evidence).toEqual(baseline!.evidence);
      }
    });
  });

  describe("KyselyQualitySignalRepository: Persistence, Querying & Idempotency", () => {
    it("should persist a QualitySignal and retrieve it by ID", async () => {
      const rubric = await createRubricHandler.execute({
        id: "rubric_qs_001",
        version: 1,
        title: "CS101 Rubric",
        criteria: [{ id: "q1", maxMarks: 10, description: "Algo" }],
      });

      const evaluation = await createEvaluationHandler.execute({
        id: "eval_qs_001",
        evaluationCycleId: "cycle_2026",
        scriptId: "script_001",
        rubricId: rubric.id,
        rubricVersion: rubric.version,
        evaluatorId: "evaluator_001",
        questions: [{ id: "q1", questionNumber: "1", text: "Q1", maxMarks: 10, orderIndex: 1 }],
      });

      const signal = QualitySignal.create({
        id: "sig_001",
        evaluationId: evaluation.id,
        evaluationVersion: 1,
        signalType: "COMPLETENESS_UNMARKED",
        severity: SignalSeverity.HIGH,
        summary: "All unmarked",
        evidence: { testKey: "testVal" },
        detector: COMPLETENESS_DETECTOR_PROVENANCE,
      });

      await qualitySignalRepo.save(signal);

      const retrieved = await qualitySignalRepo.findById("sig_001");
      expect(retrieved).not.toBeNull();
      expect(retrieved!.id).toBe("sig_001");
      expect(retrieved!.evaluationId).toBe(evaluation.id);
      expect(retrieved!.signalType).toBe("COMPLETENESS_UNMARKED");
      expect(retrieved!.severity).toBe(SignalSeverity.HIGH);
      expect(retrieved!.evidence).toEqual({ testKey: "testVal" });
      expect(retrieved!.detector).toEqual(COMPLETENESS_DETECTOR_PROVENANCE);
    });

    it("should filter signals by evaluationId and by REVIEWABLE status", async () => {
      const rubric = await createRubricHandler.execute({
        id: "rubric_qs_002",
        version: 1,
        title: "Test Rubric",
        criteria: [{ id: "q1", maxMarks: 10, description: "Desc" }],
      });

      const evaluation = await createEvaluationHandler.execute({
        id: "eval_qs_002",
        evaluationCycleId: "cycle_2026",
        scriptId: "script_002",
        rubricId: rubric.id,
        rubricVersion: rubric.version,
        evaluatorId: "evaluator_001",
        questions: [{ id: "q1", questionNumber: "1", text: "Q1", maxMarks: 10, orderIndex: 1 }],
      });

      const sig1 = QualitySignal.create({
        id: "sig_filter_1",
        evaluationId: evaluation.id,
        evaluationVersion: 1,
        signalType: "COMPLETENESS_UNMARKED",
        severity: SignalSeverity.HIGH,
        summary: "Signal 1",
        evidence: {},
        detector: COMPLETENESS_DETECTOR_PROVENANCE,
      });

      const sig2 = QualitySignal.create({
        id: "sig_filter_2",
        evaluationId: evaluation.id,
        evaluationVersion: 1,
        signalType: "COMPLETENESS_PARTIAL",
        severity: SignalSeverity.MEDIUM,
        summary: "Signal 2",
        evidence: {},
        detector: { type: "DETERMINISTIC", name: "other-detector", version: "1.0.0" },
      });
      sig2.resolve(); // Not reviewable

      await qualitySignalRepo.save(sig1);
      await qualitySignalRepo.save(sig2);

      const evaluationSignals = await qualitySignalRepo.findByEvaluationId(evaluation.id);
      expect(evaluationSignals).toHaveLength(2);

      const reviewableSignals = await qualitySignalRepo.findReviewable();
      const reviewableIds = reviewableSignals.map((s) => s.id);
      expect(reviewableIds).toContain("sig_filter_1");
      expect(reviewableIds).not.toContain("sig_filter_2");
    });

    it("should enforce deduplication/idempotency on (evaluation_id, evaluation_version, detector_name, signal_type)", async () => {
      const rubric = await createRubricHandler.execute({
        id: "rubric_qs_003",
        version: 1,
        title: "Rubric",
        criteria: [{ id: "q1", maxMarks: 10, description: "Desc" }],
      });

      const evaluation = await createEvaluationHandler.execute({
        id: "eval_qs_003",
        evaluationCycleId: "cycle_2026",
        scriptId: "script_003",
        rubricId: rubric.id,
        rubricVersion: rubric.version,
        evaluatorId: "evaluator_001",
        questions: [{ id: "q1", questionNumber: "1", text: "Q1", maxMarks: 10, orderIndex: 1 }],
      });

      const signal1 = QualitySignal.create({
        id: "sig_dedup_original",
        evaluationId: evaluation.id,
        evaluationVersion: 1,
        signalType: "COMPLETENESS_UNMARKED",
        severity: SignalSeverity.HIGH,
        summary: "Original Summary",
        evidence: { run: 1 },
        detector: COMPLETENESS_DETECTOR_PROVENANCE,
      });

      await qualitySignalRepo.save(signal1);

      // Same evaluation, version, detector, signal_type, but updated summary and new ID
      const signal2 = QualitySignal.create({
        id: "sig_dedup_second_run",
        evaluationId: evaluation.id,
        evaluationVersion: 1,
        signalType: "COMPLETENESS_UNMARKED",
        severity: SignalSeverity.HIGH,
        summary: "Updated Summary",
        evidence: { run: 2 },
        detector: COMPLETENESS_DETECTOR_PROVENANCE,
      });

      // Saving duplicate must update the existing record rather than insert a second row
      await qualitySignalRepo.save(signal2);

      const signals = await qualitySignalRepo.findByEvaluationId(evaluation.id);
      expect(signals).toHaveLength(1);
      expect(signals[0].id).toBe("sig_dedup_original");
      expect(signals[0].summary).toBe("Updated Summary");
      expect(signals[0].evidence).toEqual({ run: 2 });
    });
  });

  describe("End-to-End Submission Pipeline: Transactional Signal & Outbox Generation", () => {
    it("should generate QualitySignal and QualitySignalGenerated outbox event on partial evaluation submission", async () => {
      // 1. Seed Rubric with 2 questions
      await createRubricHandler.execute({
        id: "rubric_pipe_001",
        version: 1,
        title: "Algorithms",
        criteria: [
          { id: "q1", maxMarks: 10, description: "Sorting" },
          { id: "q2", maxMarks: 15, description: "Graphs" },
        ],
      });

      // 2. Create Evaluation
      await createEvaluationHandler.execute({
        id: "eval_pipe_001",
        evaluationCycleId: "cycle_pipe_2026",
        scriptId: "script_pipe_001",
        rubricId: "rubric_pipe_001",
        rubricVersion: 1,
        evaluatorId: "evaluator_alice",
        questions: [
          { id: "q1", questionNumber: "1", text: "Sorting", maxMarks: 10, orderIndex: 1 },
          { id: "q2", questionNumber: "2", text: "Graphs", maxMarks: 15, orderIndex: 2 },
        ],
      });

      // 3. Mark only 1 question (leaving q2 unmarked)
      await assignMarkHandler.execute({
        evaluationId: "eval_pipe_001",
        questionId: "q1",
        awardedMarks: 8,
        evaluatorId: "evaluator_alice",
      });

      // 4. Submit Evaluation
      const submitted = await submitEvaluationHandler.execute({
        evaluationId: "eval_pipe_001",
        evaluatorId: "evaluator_alice",
        actorType: "USER",
      });

      expect(submitted.status).toBe("SUBMITTED");

      // 5. Verify QualitySignal was persisted atomically
      const signals = await getQualitySignalsHandler.execute({
        evaluationId: "eval_pipe_001",
      });

      expect(signals).toHaveLength(1);
      const signal = signals[0];
      expect(signal.signalType).toBe("COMPLETENESS_PARTIAL");
      expect(signal.severity).toBe(SignalSeverity.MEDIUM);
      expect(signal.status).toBe(QualitySignalStatus.REVIEWABLE);
      expect(signal.detector.name).toBe("completeness-detector");
      expect(signal.detector.type).toBe("DETERMINISTIC");
      expect((signal.evidence as any).unmarkedQuestions).toBe(1);
      expect((signal.evidence as any).missingQuestionIds).toEqual(["q2"]);

      // 6. Verify Outbox table contains both EvaluationSubmitted and QualitySignalGenerated
      const submittedEvent = await db
        .selectFrom("outbox_events")
        .selectAll()
        .where("aggregate_id", "=", "eval_pipe_001")
        .where("event_type", "=", "EvaluationSubmitted")
        .executeTakeFirst();
      expect(submittedEvent).toBeDefined();

      const qualitySignalOutbox = await db
        .selectFrom("outbox_events")
        .selectAll()
        .where("aggregate_id", "=", signal.id)
        .where("event_type", "=", "QualitySignalGenerated")
        .executeTakeFirst();
      expect(qualitySignalOutbox).toBeDefined();
      expect(qualitySignalOutbox!.aggregate_type).toBe("QualitySignal");
      expect(qualitySignalOutbox!.aggregate_id).toBe(signal.id);
      expect(qualitySignalOutbox!.producer).toBe("completeness-detector");
      expect(qualitySignalOutbox!.actor_type).toBe("DETECTOR");
      expect(qualitySignalOutbox!.actor_id).toBe("completeness-detector:v1.0.0");
      expect(qualitySignalOutbox!.correlation_id).toBe(submittedEvent!.correlation_id);
      expect(qualitySignalOutbox!.causation_id).toBe(submittedEvent!.id);

      const payload = JSON.parse(qualitySignalOutbox!.payload);
      expect(payload.signalId).toBe(signal.id);
      expect(payload.signalType).toBe("COMPLETENESS_PARTIAL");
      expect(payload.severity).toBe(SignalSeverity.MEDIUM);
      expect(payload.detector.name).toBe("completeness-detector");
    });

    it("should NOT generate a QualitySignal or QualitySignalGenerated outbox event when evaluation is 100% complete", async () => {
      // 1. Seed Rubric
      await createRubricHandler.execute({
        id: "rubric_pipe_002",
        version: 1,
        title: "Algorithms",
        criteria: [{ id: "q1", maxMarks: 10, description: "Sorting" }],
      });

      // 2. Create Evaluation
      await createEvaluationHandler.execute({
        id: "eval_pipe_002",
        evaluationCycleId: "cycle_pipe_2026",
        scriptId: "script_pipe_002",
        rubricId: "rubric_pipe_002",
        rubricVersion: 1,
        evaluatorId: "evaluator_bob",
        questions: [{ id: "q1", questionNumber: "1", text: "Sorting", maxMarks: 10, orderIndex: 1 }],
      });

      // 3. Mark the question
      await assignMarkHandler.execute({
        evaluationId: "eval_pipe_002",
        questionId: "q1",
        awardedMarks: 10,
        evaluatorId: "evaluator_bob",
      });

      // 4. Submit Evaluation
      await submitEvaluationHandler.execute({
        evaluationId: "eval_pipe_002",
        evaluatorId: "evaluator_bob",
        actorType: "USER",
      });

      // 5. Verify NO QualitySignal exists
      const signals = await getQualitySignalsHandler.execute({
        evaluationId: "eval_pipe_002",
      });
      expect(signals).toHaveLength(0);

      // 6. Verify Outbox contains EvaluationSubmitted and NO QualitySignalGenerated
      const submittedOutbox = await db
        .selectFrom("outbox_events")
        .selectAll()
        .where("aggregate_id", "=", "eval_pipe_002")
        .where("event_type", "=", "EvaluationSubmitted")
        .executeTakeFirst();
      expect(submittedOutbox).toBeDefined();

      const signalOutbox = await db
        .selectFrom("outbox_events")
        .selectAll()
        .where("event_type", "=", "QualitySignalGenerated")
        .execute();
      expect(signalOutbox).toHaveLength(0);
    });

    it("should roll back all modifications (evaluation, signals, outbox) if transaction fails", async () => {
      await createRubricHandler.execute({
        id: "rubric_pipe_003",
        version: 1,
        title: "Rollback Test Rubric",
        criteria: [{ id: "q1", maxMarks: 10, description: "Desc" }],
      });

      await createEvaluationHandler.execute({
        id: "eval_pipe_rollback",
        evaluationCycleId: "cycle_pipe_2026",
        scriptId: "script_rb",
        rubricId: "rubric_pipe_003",
        rubricVersion: 1,
        evaluatorId: "evaluator_alice",
        questions: [{ id: "q1", questionNumber: "1", text: "Desc", maxMarks: 10, orderIndex: 1 }],
      });

      // Trigger a failure inside uow.execute after saving a signal
      const signal = QualitySignal.create({
        id: "sig_rollback_test",
        evaluationId: "eval_pipe_rollback",
        evaluationVersion: 1,
        signalType: "COMPLETENESS_UNMARKED",
        severity: SignalSeverity.HIGH,
        summary: "Will be rolled back",
        evidence: {},
        detector: COMPLETENESS_DETECTOR_PROVENANCE,
      });

      await expect(
        uow.execute(async (scope) => {
          await scope.qualitySignals.save(signal);
          await scope.outbox.record({
            id: randomUUID(),
            eventType: "QualitySignalGenerated",
            aggregateType: "QualitySignal",
            aggregateId: signal.id,
            producer: "completeness-detector",
            actorType: "DETECTOR",
            actorId: "completeness-detector:v1.0.0",
            payload: {},
          });
          throw new Error("Simulated transactional failure");
        })
      ).rejects.toThrow("Simulated transactional failure");

      // Verify that neither the quality signal nor the outbox event were persisted
      const persistedSignal = await qualitySignalRepo.findById("sig_rollback_test");
      expect(persistedSignal).toBeNull();

      const outboxEvents = await db
        .selectFrom("outbox_events")
        .selectAll()
        .where("aggregate_id", "=", signal.id)
        .execute();
      expect(outboxEvents).toHaveLength(0);
    });

    it("should enforce QualitySignal non-authority: signal generation must not alter evaluation marks or scores (Testing Contract §41, TEST-003, INV-003)", async () => {
      // 1. Seed Rubric
      await createRubricHandler.execute({
        id: "rubric_invariance",
        version: 1,
        title: "Invariance Test Rubric",
        criteria: [
          { id: "q1", maxMarks: 10, description: "Part 1" },
          { id: "q2", maxMarks: 15, description: "Part 2" },
        ],
      });

      // 2. Create Evaluation
      await createEvaluationHandler.execute({
        id: "eval_invariance",
        evaluationCycleId: "cycle_pipe_2026",
        scriptId: "script_inv",
        rubricId: "rubric_invariance",
        rubricVersion: 1,
        evaluatorId: "evaluator_alice",
        questions: [
          { id: "q1", questionNumber: "1", text: "Part 1", maxMarks: 10, orderIndex: 1 },
          { id: "q2", questionNumber: "2", text: "Part 2", maxMarks: 15, orderIndex: 2 },
        ],
      });

      // 3. Mark question 1 with 7 marks (leaving question 2 unmarked)
      await assignMarkHandler.execute({
        evaluationId: "eval_invariance",
        questionId: "q1",
        awardedMarks: 7,
        evaluatorId: "evaluator_alice",
      });

      // Pre-submission check
      const preSubmissionEval = await evaluationRepo.findById("eval_invariance");
      expect(preSubmissionEval).not.toBeNull();
      expect(preSubmissionEval!.totalScore).toBe(7);
      expect(preSubmissionEval!.maxPossibleScore).toBe(25);
      expect(preSubmissionEval!.getMark("q1")?.awardedMarks).toBe(7);
      expect(preSubmissionEval!.getMark("q2")).toBeUndefined();

      // 4. Submit Evaluation (triggers CompletenessSignalGenerator -> COMPLETENESS_PARTIAL QualitySignal)
      const submitted = await submitEvaluationHandler.execute({
        evaluationId: "eval_invariance",
        evaluatorId: "evaluator_alice",
        actorType: "USER",
      });

      // 5. Verify signal was generated
      const signals = await getQualitySignalsHandler.execute({
        evaluationId: "eval_invariance",
      });
      expect(signals).toHaveLength(1);
      expect(signals[0].signalType).toBe("COMPLETENESS_PARTIAL");

      // 6. Hard invariant assertion: Evaluation marks and scores MUST remain unchanged
      expect(submitted.totalScore).toBe(7);
      expect(submitted.maxPossibleScore).toBe(25);
      expect(submitted.marks).toHaveLength(1);
      expect(submitted.marks[0].questionId).toBe("q1");
      expect(submitted.marks[0].awardedMarks).toBe(7);

      // Verify from database reload
      const reloadedEval = await evaluationRepo.findById("eval_invariance");
      expect(reloadedEval!.totalScore).toBe(7);
      expect(reloadedEval!.maxPossibleScore).toBe(25);
      expect(reloadedEval!.getMark("q1")?.awardedMarks).toBe(7);
      expect(reloadedEval!.getMark("q2")).toBeUndefined();
    });
  });
});

