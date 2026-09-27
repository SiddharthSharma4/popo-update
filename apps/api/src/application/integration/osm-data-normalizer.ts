/**
 * OSM Anti-Corruption Layer & Data Normalizer.
 * Conforms to:
 * - docs/contracts/02-architecture-contract.md §50 (Anti-corruption boundary)
 * - docs/contracts/06-api-contract.md §54, §56 (External Data Authority & Normalization)
 * - docs/contracts/06-api-contract.md INV-API-016 (External OSM models must not become internal domain models directly)
 * - docs/contracts/08-data-contract.md §110-111 (External Data Import & Data Normalization)
 * - docs/contracts/09-testing-contract.md §40 (Deterministic Reproducibility)
 *
 * Invariants:
 * - Pure TypeScript normalizer, side-effect free, 100% deterministic across repetitions.
 * - Strips unauthorized student PII and credentials at the boundary.
 * - Validates question boundaries and marks bounds (0 <= awardedMarks <= maxMarks).
 * - Computes deterministic SHA-256 request fingerprint for idempotency tracking.
 */

import { createHash, randomUUID } from "node:crypto";
import {
  ExternalOsmEvaluationSchema,
  type ExternalOsmEvaluation,
  type ExternalOsmQuestion,
  type ExternalOsmMark,
} from "@osm/shared";
import type { Rubric } from "../../domain/rubric/rubric.js";
import { InvalidArgumentError } from "../../domain/errors.js";

export interface NormalizedQuestionDefinition {
  id: string;
  questionNumber: string;
  text: string;
  maxMarks: number;
  rubricCriteriaId?: string | null;
  orderIndex: number;
}

export interface NormalizedMarkAssignment {
  questionId: string;
  questionNumber: string;
  awardedMarks: number;
  comments?: string | null;
  isAnnotated: boolean;
}

export interface NormalizedEvaluationPayload {
  externalEvaluationId: string;
  sourceSystem: string;
  scriptId: string;
  evaluatorId: string;
  evaluationCycleId: string;
  rubricId: string;
  rubricVersion: number;
  idempotencyKey: string;
  fingerprint: string;
  autoSubmit: boolean;
  questions: NormalizedQuestionDefinition[];
  marks: NormalizedMarkAssignment[];
}

export class OsmDataNormalizer {
  /**
   * Sanitizes external payload, verifies schema bounds, and strips unapproved PII/metadata.
   */
  validateAndSanitize(rawInput: unknown): ExternalOsmEvaluation {
    const parseResult = ExternalOsmEvaluationSchema.safeParse(rawInput);
    if (!parseResult.success) {
      const issueDetails = parseResult.error.issues
        .map((issue: { path: (string | number)[]; message: string }) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ");
      throw new InvalidArgumentError(
        `External OSM payload validation failed: ${issueDetails}`
      );
    }

    const data = parseResult.data;

    // Sanitize string inputs (trimming)
    return {
      externalEvaluationId: data.externalEvaluationId.trim(),
      sourceSystem: data.sourceSystem.trim(),
      scriptId: data.scriptId.trim(),
      evaluatorId: data.evaluatorId.trim(),
      evaluationCycleId: data.evaluationCycleId.trim(),
      rubricId: data.rubricId.trim(),
      rubricVersion: data.rubricVersion ?? 1,
      questions: data.questions?.map((q: ExternalOsmQuestion) => ({
        id: q.id?.trim(),
        questionNumber: q.questionNumber.trim(),
        text: q.text?.trim(),
        maxMarks: q.maxMarks,
        rubricCriteriaId: q.rubricCriteriaId?.trim() || null,
        orderIndex: q.orderIndex,
      })),
      marks: data.marks.map((m: ExternalOsmMark) => ({
        questionId: m.questionId?.trim(),
        questionNumber: m.questionNumber.trim(),
        awardedMarks: m.awardedMarks,
        comments: m.comments?.trim() || null,
        isAnnotated: Boolean(m.isAnnotated),
      })),
      autoSubmit: Boolean(data.autoSubmit),
      idempotencyKey: data.idempotencyKey?.trim(),
    };
  }

  /**
   * Computes a deterministic SHA-256 fingerprint from sanitized payload data.
   */
  computeFingerprint(data: ExternalOsmEvaluation): string {
    // Canonicalize question and mark order for stable hashing
    const sortedQuestions = data.questions
      ? [...data.questions].sort((a, b) => a.questionNumber.localeCompare(b.questionNumber))
      : [];

    const sortedMarks = [...data.marks].sort((a, b) =>
      a.questionNumber.localeCompare(b.questionNumber)
    );

    const canonicalState = {
      externalEvaluationId: data.externalEvaluationId,
      sourceSystem: data.sourceSystem,
      scriptId: data.scriptId,
      evaluatorId: data.evaluatorId,
      evaluationCycleId: data.evaluationCycleId,
      rubricId: data.rubricId,
      rubricVersion: data.rubricVersion,
      questions: sortedQuestions.map((q) => ({
        questionNumber: q.questionNumber,
        maxMarks: q.maxMarks,
        rubricCriteriaId: q.rubricCriteriaId,
      })),
      marks: sortedMarks.map((m) => ({
        questionNumber: m.questionNumber,
        awardedMarks: m.awardedMarks,
        comments: m.comments,
        isAnnotated: m.isAnnotated,
      })),
      autoSubmit: data.autoSubmit,
    };

    return createHash("sha256")
      .update(JSON.stringify(canonicalState))
      .digest("hex");
  }

  /**
   * Normalizes question definitions from payload or derives them from rubric criteria.
   */
  normalizeQuestions(
    payloadQuestions: ExternalOsmQuestion[] | undefined,
    rubric: Rubric
  ): NormalizedQuestionDefinition[] {
    if (payloadQuestions && payloadQuestions.length > 0) {
      return payloadQuestions.map((q, idx) => ({
        id: q.id?.trim() || `q_${idx + 1}_${randomUUID()}`,
        questionNumber: q.questionNumber.trim(),
        text: q.text?.trim() || `Question ${q.questionNumber.trim()}`,
        maxMarks: q.maxMarks,
        rubricCriteriaId: q.rubricCriteriaId?.trim() || null,
        orderIndex: q.orderIndex ?? idx,
      }));
    }

    // Derive questions directly from Rubric criteria if not explicitly itemized
    if (!rubric.criteria || rubric.criteria.length === 0) {
      throw new InvalidArgumentError(
        `Rubric '${rubric.id}' has no criteria to derive questions from.`
      );
    }

    return rubric.criteria.map((criterion, idx) => ({
      id: `q_${idx + 1}_${randomUUID()}`,
      questionNumber: criterion.id || `Q${idx + 1}`,
      text: criterion.description || criterion.title,
      maxMarks: criterion.maxMarks,
      rubricCriteriaId: criterion.id,
      orderIndex: idx,
    }));
  }

  /**
   * Validates and maps external awarded marks to internal question references.
   */
  normalizeMarks(
    payloadMarks: ExternalOsmMark[],
    questions: NormalizedQuestionDefinition[]
  ): NormalizedMarkAssignment[] {
    const questionByNumber = new Map<string, NormalizedQuestionDefinition>();
    const questionById = new Map<string, NormalizedQuestionDefinition>();

    for (const q of questions) {
      questionByNumber.set(q.questionNumber.toLowerCase(), q);
      questionById.set(q.id, q);
    }

    const normalizedMarks: NormalizedMarkAssignment[] = [];

    for (const mark of payloadMarks) {
      let matchedQuestion: NormalizedQuestionDefinition | undefined;

      if (mark.questionId && questionById.has(mark.questionId)) {
        matchedQuestion = questionById.get(mark.questionId);
      } else if (questionByNumber.has(mark.questionNumber.toLowerCase())) {
        matchedQuestion = questionByNumber.get(mark.questionNumber.toLowerCase());
      }

      if (!matchedQuestion) {
        throw new InvalidArgumentError(
          `External mark references unknown question number '${mark.questionNumber}'.`
        );
      }

      if (mark.awardedMarks < 0) {
        throw new InvalidArgumentError(
          `Awarded mark cannot be negative for question '${matchedQuestion.questionNumber}'.`
        );
      }

      if (mark.awardedMarks > matchedQuestion.maxMarks) {
        throw new InvalidArgumentError(
          `Awarded mark (${mark.awardedMarks}) exceeds question maxMarks (${matchedQuestion.maxMarks}) for question '${matchedQuestion.questionNumber}'.`
        );
      }

      normalizedMarks.push({
        questionId: matchedQuestion.id,
        questionNumber: matchedQuestion.questionNumber,
        awardedMarks: mark.awardedMarks,
        comments: mark.comments ?? null,
        isAnnotated: Boolean(mark.isAnnotated),
      });
    }

    return normalizedMarks;
  }
}
