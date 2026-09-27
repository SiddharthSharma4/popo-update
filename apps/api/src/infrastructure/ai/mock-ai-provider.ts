/**
 * Deterministic Mock AI Provider.
 * Conforms to docs/contracts/09-testing-contract.md §96 and docs/contracts/10-demo-contract.md §4.3.
 */

import {
  type ApprovedAiContext,
  type ApprovedAiQuestionContext,
  type ApprovedAiRubricCriterion,
  AiAssistanceType,
} from "@osm/shared";
import type { AiProvider, RawAiOutput } from "../../application/ai/ai-provider.js";

export interface MockAiProviderOptions {
  shouldFail?: boolean;
  failureMessage?: string;
  delayMs?: number;
  malformedOutput?: boolean;
  confidenceOverride?: number;
}

export class DeterministicMockAiProvider implements AiProvider {
  readonly providerName = "OSM-Mock-AI";
  readonly modelName = "osm-advisory-model-v1";
  readonly version = "1.0.0";

  private options: MockAiProviderOptions;

  constructor(options: MockAiProviderOptions = {}) {
    this.options = { ...options };
  }

  setOptions(options: MockAiProviderOptions): void {
    this.options = { ...this.options, ...options };
  }

  async generateAdvisory(context: ApprovedAiContext): Promise<RawAiOutput> {
    if (this.options.delayMs && this.options.delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.options.delayMs));
    }

    if (this.options.shouldFail) {
      throw new Error(
        this.options.failureMessage ?? "AI provider service unavailable: Connection timeout"
      );
    }

    if (this.options.malformedOutput) {
      return {
        recommendation: "",
        confidence: 2.5, // Invalid: exceeds 1.0
        evidenceReferences: null as unknown as string[],
      };
    }

    switch (context.assistanceType) {
      case AiAssistanceType.SIGNAL_EXPLANATION:
        return this.generateSignalExplanation(context);
      case AiAssistanceType.RUBRIC_ADVISORY:
        return this.generateRubricAdvisory(context);
      case AiAssistanceType.EVALUATION_SUMMARY:
      default:
        return this.generateEvaluationSummary(context);
    }
  }

  private generateEvaluationSummary(context: ApprovedAiContext): RawAiOutput {
    const totalQuestions = context.questions.length;
    const markedQuestions = context.questions.filter(
      (q: ApprovedAiQuestionContext) => q.awardedMarks !== null
    );
    const totalMax = context.questions.reduce(
      (sum: number, q: ApprovedAiQuestionContext) => sum + q.maxMarks,
      0
    );
    const totalAwarded = markedQuestions.reduce(
      (sum: number, q: ApprovedAiQuestionContext) => sum + (q.awardedMarks ?? 0),
      0
    );

    const evidenceReferences = context.questions.map(
      (q: ApprovedAiQuestionContext) => `question:${q.questionNumber}`
    );

    let text = `Evaluation summary: ${markedQuestions.length} of ${totalQuestions} questions marked. `;
    text += `Awarded score: ${totalAwarded} / ${totalMax} marks. `;

    const unmarked = context.questions.filter(
      (q: ApprovedAiQuestionContext) => q.awardedMarks === null
    );
    if (unmarked.length > 0) {
      text += `Unmarked questions detected: [${unmarked
        .map((q: ApprovedAiQuestionContext) => q.questionNumber)
        .join(", ")}]. `;
    } else {
      text += `All questions evaluated. `;
    }

    const annotatedCount = context.questions.filter(
      (q: ApprovedAiQuestionContext) => q.isAnnotated
    ).length;
    text += `${annotatedCount} questions have annotations.`;

    return {
      recommendation: text,
      confidence: this.options.confidenceOverride ?? 0.92,
      evidenceReferences,
      rawText: text,
    };
  }

  private generateSignalExplanation(context: ApprovedAiContext): RawAiOutput {
    const signal = context.signalContext;
    const evidenceReferences: string[] = [];

    if (signal) {
      evidenceReferences.push(`signal:${signal.signalId}`);
    }
    for (const q of context.questions) {
      evidenceReferences.push(`question:${q.questionNumber}`);
    }

    let text = "";
    if (signal) {
      text = `Quality Signal Analysis (${signal.detectorName}, Severity: ${signal.severity}): ${signal.summary}. `;
      text += `Recommended action: Review flagged evaluation for marking consistency against cohort norms and rubric guidance.`;
    } else {
      text = `No QualitySignal linked. Standard evaluation monitoring recommended.`;
    }

    return {
      recommendation: text,
      confidence: this.options.confidenceOverride ?? 0.88,
      evidenceReferences,
      rawText: text,
    };
  }

  private generateRubricAdvisory(context: ApprovedAiContext): RawAiOutput {
    const criteriaCount = context.rubricCriteria.length;
    const evidenceReferences = context.rubricCriteria.map(
      (c: ApprovedAiRubricCriterion) => `rubric:${c.id}`
    );

    let text = `Rubric Guidance Analysis (Rubric ${context.rubricId} v${context.rubricVersion}): `;
    text += `${criteriaCount} performance criteria evaluated. `;
    text += `Criteria breakdown: ${context.rubricCriteria
      .map((c: ApprovedAiRubricCriterion) => `${c.title} (Max: ${c.maxMarks})`)
      .join("; ")}. `;
    text += `Advisory: Ensure evaluator comments justify grade tiers across criteria levels.`;

    return {
      recommendation: text,
      confidence: this.options.confidenceOverride ?? 0.85,
      evidenceReferences,
      rawText: text,
    };
  }
}
