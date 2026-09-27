/**
 * Dedicated Demo Scenario Orchestration Service.
 * Conforms to:
 * - docs/contracts/10-demo-contract.md §11, §37-41, §72 (Deterministic Demo Scenario & Seed Data)
 * - docs/contracts/01-product-contract.md §34-36 (Seeded Demo Scenarios)
 * - docs/contracts/02-architecture-contract.md §8 (Application Services & Boundaries)
 * - docs/contracts/08-data-contract.md §28-31 (UnitOfWork & Invariant Integrity)
 *
 * Rules:
 * - ADMIN-only access.
 * - Deterministic identifiers (RUBRIC-CS-101, cycle-2026-demo, eval-demo-incomplete, TC-DEMO-001).
 * - Idempotent repeated execution (reconciles without duplicate insertion).
 * - Exercises real domain entities, repositories, and UnitOfWork boundaries.
 * - Zero direct SQL bypasses.
 */

import { randomUUID } from "node:crypto";
import type { UnitOfWork } from "../common/unit-of-work.js";
import type { EvaluationRepository } from "../../domain/evaluation/evaluation-repository.js";
import type { RubricRepository } from "../../domain/rubric/rubric-repository.js";
import type { QualitySignalRepository } from "../../domain/quality-signal/quality-signal-repository.js";
import type { TriageCaseRepository } from "../../domain/moderation/triage-case-repository.js";
import type { ResolutionRepository } from "../../domain/moderation/resolution-repository.js";
import { Rubric } from "../../domain/rubric/rubric.js";
import { Evaluation } from "../../domain/evaluation/evaluation.js";
import { QualitySignal } from "../../domain/quality-signal/quality-signal.js";
import { TriageCase } from "../../domain/moderation/triage-case.js";
import { Resolution } from "../../domain/moderation/resolution.js";
import {
  SignalSeverity,
  TriageCaseStatus,
  ResolutionOutcome,
  UserRole,
  type DemoSeedResponse,
  type DemoResetResponse,
} from "@osm/shared";
import { UnauthorizedActionError } from "../common/errors.js";

export const CANONICAL_DEMO_RUBRIC_ID = "RUBRIC-CS-101";
export const CANONICAL_DEMO_CYCLE_ID = "cycle-2026-demo";

export interface DemoScenarioContext {
  actorId: string;
  actorType?: string;
  userRole?: string;
}

export class DemoScenarioService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly evalRepo: EvaluationRepository,
    private readonly rubricRepo: RubricRepository,
    private readonly qualitySignalRepo: QualitySignalRepository,
    private readonly triageCaseRepo: TriageCaseRepository,
    private readonly resolutionRepo: ResolutionRepository
  ) {}

  /**
   * Seeds the deterministic canonical demonstration scenario into SQLite.
   * Restricted strictly to administrators (10-demo §10, 06-api §12).
   */
  async seedCanonicalScenario(context: DemoScenarioContext): Promise<DemoSeedResponse> {
    // 1. Role Authorization Guard (ADMIN only)
    const userRole = context.userRole?.toUpperCase();
    const actorType = context.actorType?.toUpperCase();

    if (actorType === "AI" || userRole === "AI") {
      throw new UnauthorizedActionError(
        "SEED_DEMO_SCENARIO",
        "AI actors are strictly forbidden from executing administrative environment seeding."
      );
      }

    if (userRole !== UserRole.ADMIN) {
      throw new UnauthorizedActionError(
        "SEED_DEMO_SCENARIO",
        `Only administrators may seed the demo scenario. Current role: ${userRole ?? "ANONYMOUS"}.`
      );
    }

    // 2. Check Idempotency: Does the canonical demo rubric and evaluation already exist?
    const existingRubric = await this.rubricRepo.findByIdAndVersion(CANONICAL_DEMO_RUBRIC_ID, 1);
    const existingIncomplete = await this.evalRepo.findById("eval-demo-incomplete");

    if (existingRubric && existingIncomplete) {
      const paginatedEvals = await this.evalRepo.findPaginated({
        page: 1,
        pageSize: 100,
        filter: { evaluationCycleId: CANONICAL_DEMO_CYCLE_ID },
      });
      const allCases = await this.triageCaseRepo.list();

      return {
        status: "ALREADY_SEEDED",
        rubricId: CANONICAL_DEMO_RUBRIC_ID,
        cycleId: CANONICAL_DEMO_CYCLE_ID,
        evaluationsCount: paginatedEvals.total,
        signalsCount: 2,
        triageCasesCount: allCases.length,
        message: "Canonical demo scenario cohort is already seeded and ready for demonstration.",
        seededAt: new Date().toISOString(),
      };
    }

    // 3. Populate Canonical Scenario within an Atomic UnitOfWork Transaction
    return this.uow.execute(async (scope) => {
      // 3.1 Create Canonical Rubric (RUBRIC-CS-101)
      const rubric = new Rubric({
        id: CANONICAL_DEMO_RUBRIC_ID,
        title: "Computer Science 101 — Algorithms & Systems Design",
        version: 1,
        criteria: [
          {
            id: "crit-1",
            title: "Core Algorithmic Correctness",
            maxMarks: 40,
            description: "Correctness of algorithmic solution, edge cases, and runtime complexity",
          },
          {
            id: "crit-2",
            title: "Code Structure & Modularity",
            maxMarks: 30,
            description: "Clean architecture, naming conventions, and SOLID adherence",
          },
          {
            id: "crit-3",
            title: "Error Handling & Defensive Design",
            maxMarks: 30,
            description: "Defensive input validation, exception recovery, and system robustness",
          },
        ],
      });

      if (!existingRubric) {
        await scope.rubrics.save(rubric);
      }

      // Canonical Question Definitions
      const questions = [
        {
          id: "q1",
          questionNumber: "Q1",
          text: "Implement binary search tree rebalancing algorithm with O(log n) rotation.",
          maxMarks: 40,
          rubricCriteriaId: "crit-1",
          orderIndex: 0,
        },
        {
          id: "q2",
          questionNumber: "Q2",
          text: "Structure modular class architecture adhering to SOLID principles.",
          maxMarks: 30,
          rubricCriteriaId: "crit-2",
          orderIndex: 1,
        },
        {
          id: "q3",
          questionNumber: "Q3",
          text: "Implement defensive boundary validation and transactional error recovery.",
          maxMarks: 30,
          rubricCriteriaId: "crit-3",
          orderIndex: 2,
        },
      ];

      // 3.2 Evaluation 1: The Golden Path Incomplete Evaluation (assigned to evaluator_1)
      // Contains marks for Q1 and Q3, but Q2 is omitted (trigger for CompleteCheck!)
      const incompleteEval = Evaluation.create({
        id: "eval-demo-incomplete",
        evaluationCycleId: CANONICAL_DEMO_CYCLE_ID,
        scriptId: "SCRIPT-DEMO-101",
        evaluatorId: "evaluator_1",
        rubricId: CANONICAL_DEMO_RUBRIC_ID,
        rubricVersion: 1,
        questions,
      });

      // Award marks for Q1 and Q3; leave Q2 unassigned
      incompleteEval.assignMark({
        questionId: "q1",
        awardedMarks: 28,
        comments: "Solid algorithmic logic with minor edge case omission",
        evaluatorId: "evaluator_1",
      });
      incompleteEval.assignMark({
        questionId: "q3",
        awardedMarks: 22,
        comments: "Clean exception handling and logging structure",
        evaluatorId: "evaluator_1",
      });
      await scope.evaluations.save(incompleteEval);

      // 3.3 Evaluation Cohort: Peer Baseline (evaluator_2, evaluator_3, evaluator_4)
      // Scores reflect normal evaluator distribution (68-74%)
      const peerEvaluationsData = [
        { id: "eval-demo-peer-201", evaluator: "evaluator_2", script: "SCRIPT-DEMO-201", q1: 29, q2: 21, q3: 22 },
        { id: "eval-demo-peer-202", evaluator: "evaluator_2", script: "SCRIPT-DEMO-202", q1: 27, q2: 23, q3: 20 },
        { id: "eval-demo-peer-301", evaluator: "evaluator_3", script: "SCRIPT-DEMO-301", q1: 28, q2: 22, q3: 23 },
        { id: "eval-demo-peer-302", evaluator: "evaluator_3", script: "SCRIPT-DEMO-302", q1: 30, q2: 20, q3: 21 },
        { id: "eval-demo-peer-401", evaluator: "evaluator_4", script: "SCRIPT-DEMO-401", q1: 26, q2: 22, q3: 21 },
        { id: "eval-demo-peer-402", evaluator: "evaluator_4", script: "SCRIPT-DEMO-402", q1: 29, q2: 21, q3: 24 },
      ];

      for (const item of peerEvaluationsData) {
        const itemQuestions = [
          {
            id: `${item.id}-q1`,
            questionNumber: "Q1",
            text: "Implement an algorithmic solution with balanced time and space complexity.",
            maxMarks: 40,
            rubricCriteriaId: "crit-1",
            orderIndex: 0,
          },
          {
            id: `${item.id}-q2`,
            questionNumber: "Q2",
            text: "Design modular, testable software components with clean abstractions.",
            maxMarks: 30,
            rubricCriteriaId: "crit-2",
            orderIndex: 1,
          },
          {
            id: `${item.id}-q3`,
            questionNumber: "Q3",
            text: "Implement defensive boundary validation and transactional error recovery.",
            maxMarks: 30,
            rubricCriteriaId: "crit-3",
            orderIndex: 2,
          },
        ];

        const evalItem = Evaluation.create({
          id: item.id,
          evaluationCycleId: CANONICAL_DEMO_CYCLE_ID,
          scriptId: item.script,
          evaluatorId: item.evaluator,
          rubricId: CANONICAL_DEMO_RUBRIC_ID,
          rubricVersion: 1,
          questions: itemQuestions,
        });
        evalItem.assignMark({
          questionId: `${item.id}-q1`,
          awardedMarks: item.q1,
          comments: "Standard algorithmic implementation",
          evaluatorId: item.evaluator,
        });
        evalItem.assignMark({
          questionId: `${item.id}-q2`,
          awardedMarks: item.q2,
          comments: "Good modular code structure",
          evaluatorId: item.evaluator,
        });
        evalItem.assignMark({
          questionId: `${item.id}-q3`,
          awardedMarks: item.q3,
          comments: "Standard error handling",
          evaluatorId: item.evaluator,
        });
        evalItem.submit();
        await scope.evaluations.save(evalItem);
      }

      // 3.4 Evaluation Cohort: Lenient Evaluator (evaluator_lenient)
      // Consistently high marks (94-96%) designed to trigger statistical anomaly detection
      const lenientEvaluationsData = [
        { id: "eval-demo-lenient-501", script: "SCRIPT-DEMO-501", q1: 38, q2: 29, q3: 28 }, // 95%
        { id: "eval-demo-lenient-502", script: "SCRIPT-DEMO-502", q1: 39, q2: 28, q3: 29 }, // 96%
        { id: "eval-demo-lenient-503", script: "SCRIPT-DEMO-503", q1: 37, q2: 29, q3: 28 }, // 94%
        { id: "eval-demo-lenient-504", script: "SCRIPT-DEMO-504", q1: 38, q2: 28, q3: 28 }, // 94%
        { id: "eval-demo-lenient-505", script: "SCRIPT-DEMO-505", q1: 39, q2: 29, q3: 27 }, // 95%
      ];

      for (const item of lenientEvaluationsData) {
        const itemQuestions = [
          {
            id: `${item.id}-q1`,
            questionNumber: "Q1",
            text: "Implement an algorithmic solution with balanced time and space complexity.",
            maxMarks: 40,
            rubricCriteriaId: "crit-1",
            orderIndex: 0,
          },
          {
            id: `${item.id}-q2`,
            questionNumber: "Q2",
            text: "Design modular, testable software components with clean abstractions.",
            maxMarks: 30,
            rubricCriteriaId: "crit-2",
            orderIndex: 1,
          },
          {
            id: `${item.id}-q3`,
            questionNumber: "Q3",
            text: "Implement defensive boundary validation and transactional error recovery.",
            maxMarks: 30,
            rubricCriteriaId: "crit-3",
            orderIndex: 2,
          },
        ];

        const evalItem = Evaluation.create({
          id: item.id,
          evaluationCycleId: CANONICAL_DEMO_CYCLE_ID,
          scriptId: item.script,
          evaluatorId: "evaluator_lenient",
          rubricId: CANONICAL_DEMO_RUBRIC_ID,
          rubricVersion: 1,
          questions: itemQuestions,
        });
        evalItem.assignMark({
          questionId: `${item.id}-q1`,
          awardedMarks: item.q1,
          comments: "Excellent algorithmic implementation",
          evaluatorId: "evaluator_lenient",
        });
        evalItem.assignMark({
          questionId: `${item.id}-q2`,
          awardedMarks: item.q2,
          comments: "Outstanding structural clarity",
          evaluatorId: "evaluator_lenient",
        });
        evalItem.assignMark({
          questionId: `${item.id}-q3`,
          awardedMarks: item.q3,
          comments: "Comprehensive defensive coverage",
          evaluatorId: "evaluator_lenient",
        });
        evalItem.submit();
        await scope.evaluations.save(evalItem);
      }

      // 3.5 QualitySignal: Statistical Anomaly for evaluator_lenient
      const signalLenient = QualitySignal.create({
        id: "sig-demo-lenient-001",
        evaluationId: "eval-demo-lenient-501",
        evaluationVersion: 1,
        signalType: "STATISTICAL_ANOMALY",
        severity: SignalSeverity.HIGH,
        summary: "Evaluator evaluator_lenient mean score (94.8%) deviates significantly (+23.2%) from peer baseline (71.6%).",
        detector: {
          type: "STATISTICAL",
          name: "evaluator-mean-deviation-detector",
          version: "1.0.0",
          config: { thresholdPercent: 15, criticalThresholdPercent: 25 },
        },
        evidence: {
          evaluatorId: "evaluator_lenient",
          evaluationCycleId: CANONICAL_DEMO_CYCLE_ID,
          evaluatorMean: 94.8,
          peerMean: 71.6,
          deviation: 23.2,
          sampleSize: 5,
          peerSampleSize: 6,
        },
      });
      signalLenient.linkToCase("tc-demo-001");
      await scope.qualitySignals.save(signalLenient);

      // 3.6 TriageCase 1: Open Triage Case for the Golden Path Moderator (TC-DEMO-001)
      const triageCaseOpen = TriageCase.create({
        id: "tc-demo-001",
        caseNumber: "TC-DEMO-001",
        evaluationId: "eval-demo-lenient-501",
        evaluationCycleId: CANONICAL_DEMO_CYCLE_ID,
        qualitySignalId: "sig-demo-lenient-001",
        priority: SignalSeverity.HIGH,
        notes: "Statistical outlier: evaluator_lenient scoring consistently 94-96% across cohort scripts.",
      });
      await scope.triageCases.save(triageCaseOpen);

      // 3.7 QualitySignal & TriageCase 2: Previously Resolved Historical Calibration Case
      const signalResolved = QualitySignal.create({
        id: "sig-demo-history-000",
        evaluationId: "eval-demo-peer-201",
        evaluationVersion: 1,
        signalType: "COMPLETENESS_PARTIAL",
        severity: SignalSeverity.MEDIUM,
        summary: "Evaluation submitted with missing question response during initial ingest.",
        detector: {
          type: "DETERMINISTIC",
          name: "completeness-detector",
          version: "1.0.0",
        },
        evidence: {
          evaluationCycleId: CANONICAL_DEMO_CYCLE_ID,
          missingQuestionIds: ["q2"],
          resolutionOutcome: ResolutionOutcome.CONFIRMED_VALID,
        },
      });
      signalResolved.linkToCase("tc-demo-000");
      signalResolved.resolve("res-demo-000");
      await scope.qualitySignals.save(signalResolved);

      const now = new Date().toISOString();
      const triageCaseResolved = TriageCase.reconstitute({
        id: "tc-demo-000",
        caseNumber: "TC-DEMO-000",
        evaluationId: "eval-demo-peer-201",
        evaluationCycleId: CANONICAL_DEMO_CYCLE_ID,
        qualitySignalId: "sig-demo-history-000",
        assigneeId: "moderator_1",
        status: TriageCaseStatus.RESOLVED,
        priority: SignalSeverity.MEDIUM,
        notes: "Historical calibration sample confirmed valid by senior moderator.",
        version: 2,
        createdAt: now,
        updatedAt: now,
      });
      await scope.triageCases.save(triageCaseResolved);

      // Save Resolution record
      const resolution = Resolution.create({
        id: "res-demo-000",
        triageCaseId: "tc-demo-000",
        evaluationId: "eval-demo-peer-201",
        moderatorId: "moderator_1",
        outcome: ResolutionOutcome.CONFIRMED_VALID,
        reason: "Inspected paper script physical annotation; candidate provided alternative valid recursive implementation.",
        notes: "Mark awarded was confirmed legitimate and preserved.",
        evidenceReferences: ["RUBRIC-CS-101:crit-2", "SCRIPT-DEMO-201:p2"],
      });
      await scope.resolutions.save(resolution);

      // 3.8 Audit Event Recording for Seeding
      await scope.audit.record({
        eventType: "DemoCohortSeeded",
        actorType: "USER",
        actorId: context.actorId,
        entityType: "Demonstration",
        entityId: CANONICAL_DEMO_CYCLE_ID,
        action: "SEED_DEMO_COHORT",
        details: {
          rubricId: CANONICAL_DEMO_RUBRIC_ID,
          evaluationsCreated: 12,
          signalsCreated: 2,
          triageCasesCreated: 2,
          timestamp: new Date().toISOString(),
        },
      });

      return {
        status: "SEEDED",
        rubricId: CANONICAL_DEMO_RUBRIC_ID,
        cycleId: CANONICAL_DEMO_CYCLE_ID,
        evaluationsCount: 12,
        signalsCount: 2,
        triageCasesCount: 2,
        message: "Canonical demo scenario cohort successfully seeded in SQLite database.",
        seededAt: new Date().toISOString(),
      };
    });
  }

  /**
   * Safely resets the canonical demonstration scenario.
   * Conforms to:
   * - docs/contracts/10-demo-contract.md §11, §37-41, §72
   * - docs/contracts/08-data-contract.md §28-31 (UnitOfWork & Foreign Key Integrity)
   * - docs/contracts/06-api-contract.md §12 (RBAC: ADMIN only, AI forbidden)
   *
   * Rules:
   * - Strictly scoped to canonical demo scenario (cycleId: cycle-2026-demo, rubricId: RUBRIC-CS-101).
   * - Preserves all non-demo evaluations, rubrics, cases, and signals.
   * - Deletes in child-to-parent order (resolutions -> triage cases -> signals -> evaluations -> rubric).
   * - Preserves audit log immutability by recording a RESET_DEMO_SCENARIO event rather than wiping history.
   * - Fully idempotent (safe to call when empty or repeatedly).
   */
  async resetCanonicalScenario(context: DemoScenarioContext): Promise<DemoResetResponse> {
    // 1. Role Authorization Guard (ADMIN only, AI rejected)
    const userRole = context.userRole?.toUpperCase();
    const actorType = context.actorType?.toUpperCase();

    if (actorType === "AI" || userRole === "AI") {
      throw new UnauthorizedActionError(
        "RESET_DEMO_SCENARIO",
        "AI actors are strictly forbidden from executing destructive administrative resets."
      );
    }

    if (userRole !== UserRole.ADMIN) {
      throw new UnauthorizedActionError(
        "RESET_DEMO_SCENARIO",
        `Only administrators may reset the demo scenario. Current role: ${userRole ?? "ANONYMOUS"}.`
      );
    }

    // 2. Identify all canonical demo records
    const existingRubric = await this.rubricRepo.findLatestById(CANONICAL_DEMO_RUBRIC_ID);

    const paginatedEvals = await this.evalRepo.findPaginated({
      page: 1,
      pageSize: 1000,
      filter: { evaluationCycleId: CANONICAL_DEMO_CYCLE_ID },
    });

    const demoEvaluationIds = new Set<string>(paginatedEvals.items.map((e) => e.id));
    const knownCanonicalEvalIds = [
      "eval-demo-incomplete",
      "eval-demo-peer-201",
      "eval-demo-peer-202",
      "eval-demo-peer-301",
      "eval-demo-peer-302",
      "eval-demo-peer-401",
      "eval-demo-peer-402",
      "eval-demo-lenient-501",
      "eval-demo-lenient-502",
      "eval-demo-lenient-503",
      "eval-demo-lenient-504",
      "eval-demo-lenient-505",
    ];
    for (const id of knownCanonicalEvalIds) {
      const ev = await this.evalRepo.findById(id);
      if (ev) {
        demoEvaluationIds.add(id);
      }
    }

    const allCases = await this.triageCaseRepo.list();
    const demoCases = allCases.filter(
      (c) =>
        c.evaluationCycleId === CANONICAL_DEMO_CYCLE_ID ||
        demoEvaluationIds.has(c.evaluationId) ||
        c.id === "tc-demo-001" ||
        c.id === "tc-demo-000"
    );
    const demoCaseIds = new Set<string>(demoCases.map((c) => c.id));

    const allSignals = await this.qualitySignalRepo.findAll();
    const demoSignals = allSignals.filter(
      (s) =>
        demoEvaluationIds.has(s.evaluationId) ||
        s.id === "sig-demo-lenient-001" ||
        s.id === "sig-demo-history-000"
    );

    const allResolutions = await this.resolutionRepo.findAll();
    const demoResolutions = allResolutions.filter(
      (r) =>
        demoCaseIds.has(r.triageCaseId) ||
        demoEvaluationIds.has(r.evaluationId) ||
        r.id === "res-demo-000"
    );

    // 3. Check if already reset (Idempotency)
    const hasRecords =
      demoEvaluationIds.size > 0 ||
      demoSignals.length > 0 ||
      demoCases.length > 0 ||
      demoResolutions.length > 0 ||
      existingRubric !== null;

    if (!hasRecords) {
      return {
        status: "ALREADY_RESET",
        cycleId: CANONICAL_DEMO_CYCLE_ID,
        rubricId: CANONICAL_DEMO_RUBRIC_ID,
        evaluationsRemoved: 0,
        signalsRemoved: 0,
        triageCasesRemoved: 0,
        resolutionsRemoved: 0,
        message: "Canonical demo scenario is already reset. No canonical demo records were present.",
        resetAt: new Date().toISOString(),
      };
    }

    // 4. Execute atomic deletion in child-to-parent order inside UnitOfWork
    return this.uow.execute(async (scope) => {
      // 4.1 Delete Resolutions
      for (const res of demoResolutions) {
        await scope.resolutions.delete(res.id);
      }

      // 4.2 Delete TriageCases
      for (const c of demoCases) {
        await scope.triageCases.delete(c.id);
      }

      // 4.3 Delete QualitySignals
      for (const sig of demoSignals) {
        await scope.qualitySignals.delete(sig.id);
      }

      // 4.4 Delete Evaluations (also deletes marks & questions)
      for (const evalId of demoEvaluationIds) {
        await scope.evaluations.delete(evalId);
      }

      // 4.5 Delete Canonical Rubric
      if (existingRubric) {
        await scope.rubrics.delete(CANONICAL_DEMO_RUBRIC_ID);
      }

      // 4.6 Record Audit Event
      await scope.audit.record({
        eventType: "DemoCohortReset",
        actorType: "USER",
        actorId: context.actorId,
        entityType: "Demonstration",
        entityId: CANONICAL_DEMO_CYCLE_ID,
        action: "RESET_DEMO_SCENARIO",
        details: {
          rubricId: CANONICAL_DEMO_RUBRIC_ID,
          evaluationsRemoved: demoEvaluationIds.size,
          signalsRemoved: demoSignals.length,
          triageCasesRemoved: demoCases.length,
          resolutionsRemoved: demoResolutions.length,
          timestamp: new Date().toISOString(),
        },
      });

      return {
        status: "RESET",
        cycleId: CANONICAL_DEMO_CYCLE_ID,
        rubricId: CANONICAL_DEMO_RUBRIC_ID,
        evaluationsRemoved: demoEvaluationIds.size,
        signalsRemoved: demoSignals.length,
        triageCasesRemoved: demoCases.length,
        resolutionsRemoved: demoResolutions.length,
        message: "Canonical demo scenario cohort successfully reset.",
        resetAt: new Date().toISOString(),
      };
    });
  }
}
