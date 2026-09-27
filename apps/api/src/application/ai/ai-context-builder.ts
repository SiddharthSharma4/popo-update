/**
 * AI Context Builder.
 * Assembles and strictly minimizes context for AI advisory assistance.
 * Conforms to docs/contracts/02-architecture-contract.md §28 and docs/contracts/01-product-contract.md §14.
 */

import {
  type ApprovedAiContext,
  type ApprovedAiQuestionContext,
  type ApprovedAiRubricCriterion,
  type ApprovedAiSignalContext,
  type ApprovedAiTriageContext,
  AiAssistanceType,
} from "@osm/shared";
import type { EvaluationRepository } from "../../domain/evaluation/evaluation-repository.js";
import type { RubricRepository } from "../../domain/rubric/rubric-repository.js";
import type { QualitySignalRepository } from "../../domain/quality-signal/quality-signal-repository.js";
import type { TriageCaseRepository } from "../../domain/moderation/triage-case-repository.js";
import { EntityNotFoundError } from "../common/errors.js";
import { InvalidArgumentError } from "../../domain/errors.js";

function deepFreeze<T>(obj: T): T {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }
  Object.freeze(obj);
  for (const key of Object.keys(obj)) {
    const value = (obj as Record<string, unknown>)[key];
    if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
      deepFreeze(value);
    }
  }
  return obj;
}

export interface BuildAiContextParams {
  evaluationId: string;
  rubricId?: string;
  rubricVersion?: number;
  qualitySignalId?: string;
  triageCaseId?: string;
  assistanceType?: AiAssistanceType;
}

export class AiContextBuilder {
  constructor(
    private readonly evaluationRepo: EvaluationRepository,
    private readonly rubricRepo: RubricRepository,
    private readonly qualitySignalRepo?: QualitySignalRepository,
    private readonly triageCaseRepo?: TriageCaseRepository
  ) {}

  /**
   * Assembles an ApprovedAiContext ensuring strict data minimization,
   * candidate anonymity, and runtime immutability.
   */
  async buildContext(params: BuildAiContextParams): Promise<ApprovedAiContext> {
    if (!params.evaluationId?.trim()) {
      throw new InvalidArgumentError("evaluationId is required to build AI context.");
    }

    // 1. Retrieve authoritative Evaluation aggregate
    const evaluation = await this.evaluationRepo.findById(params.evaluationId);
    if (!evaluation) {
      throw new EntityNotFoundError("Evaluation", params.evaluationId);
    }

    // 2. Resolve and retrieve authoritative Rubric definition
    const rubricId = params.rubricId ?? evaluation.rubricId;
    const rubricVersion = params.rubricVersion ?? evaluation.rubricVersion;

    const rubric = await this.rubricRepo.findByIdAndVersion(rubricId, rubricVersion);
    if (!rubric) {
      throw new EntityNotFoundError("Rubric", `${rubricId}:v${rubricVersion}`);
    }

    // 3. Optional QualitySignal context extraction with cross-evaluation protection
    let signalContext: ApprovedAiSignalContext | null = null;
    if (params.qualitySignalId) {
      if (!this.qualitySignalRepo) {
        throw new InvalidArgumentError("QualitySignalRepository not provided to context builder.");
      }
      const signal = await this.qualitySignalRepo.findById(params.qualitySignalId);
      if (!signal) {
        throw new EntityNotFoundError("QualitySignal", params.qualitySignalId);
      }
      if (signal.evaluationId !== evaluation.id) {
        throw new InvalidArgumentError(
          `QualitySignal '${params.qualitySignalId}' belongs to evaluation '${signal.evaluationId}', not '${evaluation.id}'. Cross-evaluation context prohibited.`
        );
      }

      signalContext = {
        signalId: signal.id,
        detectorType: signal.detector.type,
        detectorName: signal.detector.name,
        severity: signal.severity,
        summary: signal.summary,
        metrics: signal.evidence ?? {},
      };
    }

    // 4. Optional TriageCase context extraction with cross-evaluation protection
    let triageContext: ApprovedAiTriageContext | null = null;
    if (params.triageCaseId) {
      if (!this.triageCaseRepo) {
        throw new InvalidArgumentError("TriageCaseRepository not provided to context builder.");
      }
      const triageCase = await this.triageCaseRepo.findById(params.triageCaseId);
      if (!triageCase) {
        throw new EntityNotFoundError("TriageCase", params.triageCaseId);
      }
      if (triageCase.evaluationId !== evaluation.id) {
        throw new InvalidArgumentError(
          `TriageCase '${params.triageCaseId}' belongs to evaluation '${triageCase.evaluationId}', not '${evaluation.id}'. Cross-evaluation context prohibited.`
        );
      }

      triageContext = {
        caseId: triageCase.id,
        priority: triageCase.priority,
        notes: triageCase.notes,
      };
    }

    // 5. Data Minimization: Map questions and marks without candidate PII or script identity
    const criteriaMap = new Map<string, string>();
    for (const crit of rubric.criteria) {
      criteriaMap.set(crit.id, crit.title);
    }

    const questions: ApprovedAiQuestionContext[] = evaluation.questions.map((q) => {
      const mark = evaluation.getMark(q.id);
      return {
        questionNumber: q.questionNumber,
        text: q.text,
        maxMarks: q.maxMarks,
        awardedMarks: mark?.awardedMarks ?? null,
        comments: mark?.comments ?? null,
        isAnnotated: mark?.isAnnotated ?? false,
        criteriaTitle: q.rubricCriteriaId ? criteriaMap.get(q.rubricCriteriaId) ?? null : null,
      };
    });

    // 6. Data Minimization: Map rubric criteria levels
    const rubricCriteria: ApprovedAiRubricCriterion[] = rubric.criteria.map((c) => ({
      id: c.id,
      title: c.title,
      maxMarks: c.maxMarks,
      description: c.description,
      levels: c.levels?.map((l) => ({
        title: l.title,
        marks: l.marks,
        description: l.description,
      })),
    }));

    // 7. Assemble raw ApprovedAiContext payload
    const rawContext: ApprovedAiContext = {
      evaluationId: evaluation.id,
      rubricId: rubric.id,
      rubricVersion: rubric.version,
      assistanceType: params.assistanceType ?? AiAssistanceType.EVALUATION_SUMMARY,
      questions,
      rubricCriteria,
      signalContext,
      triageContext,
      assembledAt: new Date().toISOString(),
    };

    // 8. Deeply freeze the context to guarantee immutability (ARCH-008)
    return deepFreeze(rawContext);
  }
}
