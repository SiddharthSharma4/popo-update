/**
 * AI Service / Gateway.
 * Orchestrates context building, provider delegation, response validation,
 * and deterministic fallback behavior.
 * Conforms to docs/contracts/02-architecture-contract.md §25-30 and docs/contracts/06-api-contract.md §34-36.
 */

import { randomUUID } from "node:crypto";
import {
  type AiRecommendationResponse,
  AiRecommendationResponseSchema,
  type ApprovedAiContext,
  type ApprovedAiQuestionContext,
} from "@osm/shared";
import type { AiProvider } from "./ai-provider.js";
import type { AiContextBuilder, BuildAiContextParams } from "./ai-context-builder.js";

export interface AiServiceOptions {
  timeoutMs?: number;
  fallbackEnabled?: boolean;
}

export class AiService {
  private readonly timeoutMs: number;
  private readonly fallbackEnabled: boolean;

  constructor(
    private readonly contextBuilder: AiContextBuilder,
    private readonly provider: AiProvider,
    options: AiServiceOptions = {}
  ) {
    this.timeoutMs = options.timeoutMs ?? 5000;
    this.fallbackEnabled = options.fallbackEnabled ?? true;
  }

  /**
   * Generates advisory analysis from evaluation and rubric context.
   * Enforces schema validation and safe fallback degradation.
   * Guarantees zero authoritative domain mutation (INV-003, INV-004).
   */
  async generateAdvisory(params: BuildAiContextParams): Promise<AiRecommendationResponse> {
    const startTime = Date.now();

    // 1. Build and sanitize context (strictly minimized and frozen)
    const context = await this.contextBuilder.buildContext(params);

    try {
      // 2. Delegate to AI provider with timeout protection
      const rawOutput = await this.executeWithTimeout(
        this.provider.generateAdvisory(context),
        this.timeoutMs
      );

      // 3. Assemble structured candidate response conforming to 06-api §35
      const candidate: AiRecommendationResponse = {
        id: `ai_adv_${randomUUID()}`,
        type: context.assistanceType,
        recommendation: rawOutput.recommendation,
        confidence: rawOutput.confidence,
        evidenceReferences: rawOutput.evidenceReferences,
        model: {
          provider: this.provider.providerName,
          model: this.provider.modelName,
          version: this.provider.version,
          executionTimeMs: Date.now() - startTime,
        },
        disclaimer:
          "Advisory AI assistance only. Does not alter marks or make official academic decisions.",
        generatedAt: new Date().toISOString(),
        status: "SUCCESS",
      };

      // 4. Schema validation (02-arch §29, 06-api §35)
      const parseResult = AiRecommendationResponseSchema.safeParse(candidate);
      if (!parseResult.success) {
        throw new Error(
          `AI output validation failed: ${JSON.stringify(parseResult.error.flatten())}`
        );
      }

      return parseResult.data;
    } catch (error) {
      if (!this.fallbackEnabled) {
        throw error;
      }

      // 5. Safe deterministic fallback degradation (02-arch §30, 06-api §36)
      return this.generateFallbackAdvisory(context, startTime);
    }
  }

  private async executeWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    let timer: NodeJS.Timeout;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(new Error(`AI provider timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      clearTimeout(timer!);
    }
  }

  private generateFallbackAdvisory(
    context: ApprovedAiContext,
    startTime: number
  ): AiRecommendationResponse {
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

    let fallbackText = `Deterministic advisory fallback: ${markedQuestions.length}/${totalQuestions} questions evaluated. `;
    fallbackText += `Current total: ${totalAwarded}/${totalMax} marks. `;

    const unmarked = context.questions.filter(
      (q: ApprovedAiQuestionContext) => q.awardedMarks === null
    );
    if (unmarked.length > 0) {
      fallbackText += `Missing marks on questions: [${unmarked
        .map((q: ApprovedAiQuestionContext) => q.questionNumber)
        .join(", ")}]. `;
    }

    if (context.signalContext) {
      fallbackText += `Linked signal (${context.signalContext.detectorName}): ${context.signalContext.summary}. `;
    }

    fallbackText += "Manual examiner review is recommended.";

    const evidenceReferences: string[] = [];
    if (context.signalContext) {
      evidenceReferences.push(`signal:${context.signalContext.signalId}`);
    }
    for (const q of context.questions) {
      evidenceReferences.push(`question:${q.questionNumber}`);
    }

    return {
      id: `ai_adv_fallback_${randomUUID()}`,
      type: context.assistanceType,
      recommendation: fallbackText,
      confidence: 0.5,
      evidenceReferences,
      model: {
        provider: this.provider.providerName,
        model: "deterministic-heuristic-fallback",
        version: "1.0.0",
        executionTimeMs: Date.now() - startTime,
      },
      disclaimer:
        "Advisory AI assistance (deterministic fallback mode). AI provider was unavailable or output was invalid.",
      generatedAt: new Date().toISOString(),
      status: "FALLBACK",
    };
  }
}
