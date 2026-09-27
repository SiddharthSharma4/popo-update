/**
 * Deterministic Synthetic OSM Adapter.
 * Conforms to:
 * - docs/contracts/01-product-contract.md §34-36 (Synthetic Demo Data Strategy & Seeded Scenarios)
 * - docs/contracts/02-architecture-contract.md §50-52 (External OSM Integration & Synthetic Adapter)
 * - docs/contracts/06-api-contract.md §54-56 (Synthetic OSM Adapter & External Data Authority)
 * - docs/contracts/08-data-contract.md §108-111 (Synthetic OSM Boundary & Data Import)
 * - docs/contracts/09-testing-contract.md §40 (Deterministic Reproducibility)
 *
 * Invariants:
 * - Implements OsmIntegrationPort; does not create competing integration abstractions.
 * - Purely simulated feed with zero network calls and zero direct database access.
 * - 100% deterministic generation: identical seed and configuration yield identical payloads.
 * - All generated data enters the system strictly through the established OSM integration boundary
 *   (ExternalOsm* schemas -> OsmDataNormalizer -> IngestOsmEvaluationHandler -> UnitOfWork).
 * - Zero raw vendor/synthetic JSON leaks into operational domain tables.
 */

import {
  ExternalOsmEvaluationSchema,
  ExternalOsmBatchImportSchema,
  type ExternalOsmEvaluation,
  type ExternalOsmBatchImport,
  type ExternalOsmIngestResult,
  type ExternalOsmBatchResult,
  type ExternalOsmQuestion,
  type ExternalOsmMark,
} from "@osm/shared";
import type {
  OsmIntegrationPort,
  IntegrationActorContext,
} from "../../application/integration/osm-integration.port.js";
import {
  IngestOsmEvaluationHandler,
  IngestOsmBatchHandler,
} from "../../application/commands/ingest-osm-evaluation.command.js";
import type {
  UnitOfWork,
  IdempotencyRepository,
} from "../../application/common/unit-of-work.js";
import { OsmDataNormalizer } from "../../application/integration/osm-data-normalizer.js";

/**
 * Deterministic pseudo-random number generator (LCG).
 * Guarantees bit-for-bit identical outputs given identical seeds.
 */
export class DeterministicPrng {
  private state: number;

  constructor(seed: number | string = 12345) {
    if (typeof seed === "string") {
      let hash = 0;
      for (let i = 0; i < seed.length; i++) {
        hash = (hash << 5) - hash + seed.charCodeAt(i);
        hash |= 0;
      }
      this.state = Math.abs(hash) || 12345;
    } else {
      this.state = Math.abs(seed) || 12345;
    }
  }

  /**
   * Returns a deterministic float in [0, 1).
   */
  next(): number {
    this.state = (this.state * 1664525 + 1013904223) % 4294967296;
    return this.state / 4294967296;
  }

  /**
   * Returns a deterministic integer in [min, max] inclusive.
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * Selects an element deterministically from an array.
   */
  choice<T>(items: T[]): T {
    if (items.length === 0) {
      throw new Error("Cannot choose from empty array");
    }
    return items[this.nextInt(0, items.length - 1)];
  }
}

/**
 * Canonical synthetic scenarios supported by the adapter.
 * Directly maps to product contract §36 (Seeded Demo Scenarios).
 */
export type SyntheticScenarioType =
  | "NORMAL" // Complete evaluation, conformant passing marks (65-78%)
  | "INCOMPLETE" // Incomplete evaluation, missing marks on one or more questions (CompleteCheck trigger)
  | "UNMARKED" // All questions unmarked (0 marks assigned)
  | "ANOMALOUS_LENIENT" // Marks consistently high (90-98%) to trigger statistical anomaly detectors
  | "ANOMALOUS_STRICT" // Marks consistently low (15-28%) to trigger statistical anomaly detectors
  | "INVALID_RUBRIC" // References non-existent rubric for failure testing
  | "OUT_OF_BOUNDS_MARK"; // Mark exceeds maxMarks for failure testing

export interface SyntheticQuestionConfig {
  questionNumber: string;
  maxMarks: number;
  text?: string;
  rubricCriteriaId?: string;
  orderIndex?: number;
}

export const DEFAULT_SYNTHETIC_QUESTIONS: SyntheticQuestionConfig[] = [
  {
    questionNumber: "Q1",
    maxMarks: 40,
    text: "Core algorithmic implementation and correctness",
    orderIndex: 0,
  },
  {
    questionNumber: "Q2",
    maxMarks: 30,
    text: "Code structure, syntax, and style adherence",
    orderIndex: 1,
  },
  {
    questionNumber: "Q3",
    maxMarks: 30,
    text: "Architectural design, error handling, and complexity",
    orderIndex: 2,
  },
];

export interface SyntheticEvaluationConfig {
  seed?: number | string;
  index?: number;
  scenario?: SyntheticScenarioType;
  sourceSystem?: string;
  evaluationCycleId?: string;
  scriptId?: string;
  evaluatorId?: string;
  rubricId: string;
  rubricVersion?: number;
  questions?: SyntheticQuestionConfig[];
  autoSubmit?: boolean;
  customExternalEvaluationId?: string;
  idempotencyKey?: string;
  simulateTimeout?: boolean;
  simulateConnectionFailure?: boolean;
}

export interface SyntheticBatchConfig {
  batchId?: string;
  sourceSystem?: string;
  evaluationCycleId?: string;
  rubricId: string;
  rubricVersion?: number;
  count?: number;
  seed?: number | string;
  questions?: SyntheticQuestionConfig[];
  defaultEvaluatorId?: string;
  evaluators?: string[];
  scenarioDistribution?: Array<{ scenario: SyntheticScenarioType; count: number }>;
  autoSubmit?: boolean;
  simulateTimeout?: boolean;
  simulateConnectionFailure?: boolean;
}

export interface SyntheticOsmAdapterOptions {
  uow: UnitOfWork;
  idempotencyRepo?: IdempotencyRepository;
  normalizer?: OsmDataNormalizer;
  defaultSourceSystem?: string;
}

/**
 * Synthetic OSM Adapter simulating an external examination provider.
 */
export class SyntheticOsmAdapter implements OsmIntegrationPort {
  private readonly singleHandler: IngestOsmEvaluationHandler;
  private readonly batchHandler: IngestOsmBatchHandler;
  private readonly defaultSourceSystem: string;

  constructor(options: SyntheticOsmAdapterOptions) {
    this.defaultSourceSystem = options.defaultSourceSystem ?? "SYNTHETIC_OSM";
    const normalizer = options.normalizer ?? new OsmDataNormalizer();
    this.singleHandler = new IngestOsmEvaluationHandler(
      options.uow,
      options.idempotencyRepo,
      normalizer
    );
    this.batchHandler = new IngestOsmBatchHandler(this.singleHandler);
  }

  // =========================================================================
  // OsmIntegrationPort Interface Implementation
  // =========================================================================

  /**
   * Ingests a single external OSM evaluation via the canonical integration boundary.
   */
  async ingestEvaluation(
    payload: ExternalOsmEvaluation,
    actor: IntegrationActorContext
  ): Promise<ExternalOsmIngestResult> {
    return this.singleHandler.execute(payload, actor);
  }

  /**
   * Ingests a batch of external OSM evaluations via the canonical integration boundary.
   */
  async ingestBatch(
    payload: ExternalOsmBatchImport,
    actor: IntegrationActorContext
  ): Promise<ExternalOsmBatchResult> {
    return this.batchHandler.execute(payload, actor);
  }

  // =========================================================================
  // Deterministic Synthetic Generation Methods
  // =========================================================================

  /**
   * Generates a single deterministic external evaluation payload.
   * Does NOT write to the database.
   */
  generateEvaluation(config: SyntheticEvaluationConfig): ExternalOsmEvaluation {
    const seed = config.seed ?? 1000;
    const index = config.index ?? 1;
    const prng = new DeterministicPrng(`${seed}_eval_${index}`);

    const scenario = config.scenario ?? "NORMAL";
    const sourceSystem = (config.sourceSystem ?? this.defaultSourceSystem).trim();
    const evaluationCycleId = (config.evaluationCycleId ?? "cycle-2026-synthetic").trim();
    const evaluatorId = (config.evaluatorId ?? `evaluator-syn-${index.toString().padStart(2, "0")}`).trim();
    const rubricId =
      scenario === "INVALID_RUBRIC"
        ? "unknown_rubric_999"
        : config.rubricId.trim();
    const rubricVersion = config.rubricVersion ?? 1;

    const padIndex = index.toString().padStart(4, "0");
    const externalEvaluationId =
      config.customExternalEvaluationId?.trim() ??
      `SYN-EVAL-${sourceSystem}-${scenario}-${padIndex}`;
    const scriptId = config.scriptId?.trim() ?? `SYN-SCRIPT-${padIndex}`;

    const questionConfigs =
      config.questions && config.questions.length > 0
        ? config.questions
        : DEFAULT_SYNTHETIC_QUESTIONS;

    const questions: ExternalOsmQuestion[] = questionConfigs.map((q, idx) => ({
      questionNumber: q.questionNumber.trim(),
      maxMarks: q.maxMarks,
      text: q.text?.trim() ?? `Question ${q.questionNumber.trim()}`,
      rubricCriteriaId: q.rubricCriteriaId?.trim() || null,
      orderIndex: q.orderIndex ?? idx,
    }));

    const marks: ExternalOsmMark[] = [];

    if (scenario === "UNMARKED") {
      // 0 marks assigned across all questions
    } else if (scenario === "INCOMPLETE") {
      // Intentionally omit question 2 (index 1) to trigger completeness validation issue
      for (let i = 0; i < questions.length; i++) {
        if (i === 1) {
          continue; // Missing mark
        }
        const q = questions[i];
        const awardedMarks = Math.round(
          q.maxMarks * (0.65 + prng.next() * 0.12)
        );
        marks.push({
          questionNumber: q.questionNumber,
          awardedMarks,
          comments: `Deterministic synthetic mark for ${q.questionNumber}`,
          isAnnotated: true,
        });
      }
    } else if (scenario === "ANOMALOUS_LENIENT") {
      // Very high marks (90-98%)
      for (const q of questions) {
        const fraction = 0.9 + prng.next() * 0.08;
        const awardedMarks = Math.min(q.maxMarks, Math.round(q.maxMarks * fraction));
        marks.push({
          questionNumber: q.questionNumber,
          awardedMarks,
          comments: `Synthetic lenient score for ${q.questionNumber}`,
          isAnnotated: true,
        });
      }
    } else if (scenario === "ANOMALOUS_STRICT") {
      // Very low marks (15-28%)
      for (const q of questions) {
        const fraction = 0.15 + prng.next() * 0.13;
        const awardedMarks = Math.max(0, Math.round(q.maxMarks * fraction));
        marks.push({
          questionNumber: q.questionNumber,
          awardedMarks,
          comments: `Synthetic strict score for ${q.questionNumber}`,
          isAnnotated: true,
        });
      }
    } else if (scenario === "OUT_OF_BOUNDS_MARK") {
      // Deliberately exceed maxMarks on first question
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const awardedMarks = i === 0 ? q.maxMarks + 50 : Math.round(q.maxMarks * 0.7);
        marks.push({
          questionNumber: q.questionNumber,
          awardedMarks,
          comments: `Synthetic out-of-bounds test mark for ${q.questionNumber}`,
          isAnnotated: false,
        });
      }
    } else {
      // NORMAL / CONFORMANT: 65-78% of maxMarks
      for (const q of questions) {
        const fraction = 0.65 + prng.next() * 0.13;
        const awardedMarks = Math.min(q.maxMarks, Math.round(q.maxMarks * fraction));
        marks.push({
          questionNumber: q.questionNumber,
          awardedMarks,
          comments: `Synthetic normal evaluation for ${q.questionNumber}`,
          isAnnotated: true,
        });
      }
    }

    const payload: ExternalOsmEvaluation = {
      externalEvaluationId,
      sourceSystem,
      scriptId,
      evaluatorId,
      evaluationCycleId,
      rubricId,
      rubricVersion,
      questions,
      marks,
      autoSubmit: config.autoSubmit ?? true,
      idempotencyKey:
        config.idempotencyKey?.trim() ??
        `${sourceSystem}:${externalEvaluationId}`,
    };

    // Strictly validate against shared schema before returning
    return ExternalOsmEvaluationSchema.parse(payload);
  }

  /**
   * Generates a deterministic synthetic batch import payload.
   * Does NOT write to the database.
   */
  generateBatch(config: SyntheticBatchConfig): ExternalOsmBatchImport {
    const seed = config.seed ?? 1000;
    const sourceSystem = (config.sourceSystem ?? this.defaultSourceSystem).trim();
    const evaluationCycleId = (config.evaluationCycleId ?? "cycle-2026-synthetic").trim();
    const rubricId = config.rubricId.trim();
    const rubricVersion = config.rubricVersion ?? 1;
    const autoSubmit = config.autoSubmit ?? true;

    const evaluations: ExternalOsmEvaluation[] = [];

    if (config.scenarioDistribution && config.scenarioDistribution.length > 0) {
      let currentIndex = 1;
      for (const dist of config.scenarioDistribution) {
        for (let i = 0; i < dist.count; i++) {
          const evaluatorId = config.evaluators && config.evaluators.length > 0
            ? config.evaluators[(currentIndex - 1) % config.evaluators.length]
            : (config.defaultEvaluatorId ?? `evaluator-syn-${currentIndex.toString().padStart(2, "0")}`);

          const evalItem = this.generateEvaluation({
            seed,
            index: currentIndex,
            scenario: dist.scenario,
            sourceSystem,
            evaluationCycleId,
            evaluatorId,
            rubricId,
            rubricVersion,
            questions: config.questions,
            autoSubmit,
          });

          evaluations.push(evalItem);
          currentIndex++;
        }
      }
    } else {
      const count = config.count ?? 5;
      for (let i = 1; i <= count; i++) {
        const evaluatorId = config.evaluators && config.evaluators.length > 0
          ? config.evaluators[(i - 1) % config.evaluators.length]
          : (config.defaultEvaluatorId ?? `evaluator-syn-${i.toString().padStart(2, "0")}`);

        const evalItem = this.generateEvaluation({
          seed,
          index: i,
          scenario: "NORMAL",
          sourceSystem,
          evaluationCycleId,
          evaluatorId,
          rubricId,
          rubricVersion,
          questions: config.questions,
          autoSubmit,
        });

        evaluations.push(evalItem);
      }
    }

    const batchId =
      config.batchId?.trim() ??
      `SYN-BATCH-${sourceSystem}-${seed}-${evaluations.length}`;

    const batchPayload: ExternalOsmBatchImport = {
      batchId,
      sourceSystem,
      evaluations,
    };

    return ExternalOsmBatchImportSchema.parse(batchPayload);
  }

  // =========================================================================
  // Synthetic Simulation Conveniences (Generates + Ingests via Port)
  // =========================================================================

  /**
   * Generates and ingests a single synthetic evaluation through the integration boundary.
   */
  async simulateEvaluation(
    config: SyntheticEvaluationConfig,
    actor: IntegrationActorContext
  ): Promise<ExternalOsmIngestResult> {
    if (config.simulateTimeout) {
      throw new Error("External OSM provider timeout after 30000ms");
    }
    if (config.simulateConnectionFailure) {
      throw new Error("External OSM provider connection failure: ECONNREFUSED");
    }
    const payload = this.generateEvaluation(config);
    return this.ingestEvaluation(payload, actor);
  }

  /**
   * Generates and ingests a synthetic batch through the integration boundary.
   */
  async simulateBatch(
    config: SyntheticBatchConfig,
    actor: IntegrationActorContext
  ): Promise<ExternalOsmBatchResult> {
    if (config.simulateTimeout) {
      throw new Error("External OSM provider timeout after 30000ms");
    }
    if (config.simulateConnectionFailure) {
      throw new Error("External OSM provider connection failure: ECONNREFUSED");
    }
    const batchPayload = this.generateBatch(config);
    return this.ingestBatch(batchPayload, actor);
  }
}
