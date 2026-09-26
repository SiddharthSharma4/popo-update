/**
 * SubmissionCompletenessValidator implements deterministic evaluation completeness checks.
 * Conforms to:
 * - docs/contracts/01-product-contract.md §13 (CompleteCheck) & FR-003 (Completeness Validation)
 * - docs/contracts/02-architecture-contract.md §14 (Validation / CompleteCheck Module)
 * - docs/contracts/05-domain-contract.md §10 (Evaluation Aggregate completeness rules)
 *
 * Invariant: 100% deterministic, zero probabilistic/AI calls.
 */

import type { Evaluation } from "../evaluation/evaluation.js";
import type { ValidationIssue } from "./validation-issue.js";
import type { CompletenessResult } from "./completeness-result.js";

export interface CompletenessValidator {
  validate(evaluation: Evaluation): CompletenessResult;
}

export class SubmissionCompletenessValidator implements CompletenessValidator {
  validate(evaluation: Evaluation): CompletenessResult {
    const totalQuestions = evaluation.questions.length;
    const allMarks = evaluation.getAllMarks();
    const markedQuestions = allMarks.length;
    const missingQuestionIds = evaluation.getMissingQuestionIds();
    const unmarkedQuestions = missingQuestionIds.length;
    const issues: ValidationIssue[] = [];

    if (totalQuestions === 0) {
      issues.push({
        code: "COMPLETENESS_NO_QUESTIONS",
        severity: "ERROR",
        message: "Evaluation does not contain any questions to evaluate.",
        evidence: {
          evaluationId: evaluation.id,
          totalQuestions: 0,
        },
      });
    } else if (markedQuestions === 0) {
      issues.push({
        code: "COMPLETENESS_ALL_UNMARKED",
        severity: "ERROR",
        message: `All ${totalQuestions} question${totalQuestions === 1 ? "" : "s"} in this evaluation remain unmarked.`,
        evidence: {
          evaluationId: evaluation.id,
          totalQuestions,
          missingQuestionIds,
        },
      });

      for (const questionId of missingQuestionIds) {
        const question = evaluation.getQuestion(questionId);
        issues.push({
          code: "COMPLETENESS_MISSING_MARK",
          severity: "ERROR",
          message: question
            ? `Question ${question.questionNumber} (${question.id}) has not been evaluated.`
            : `Question (${questionId}) has not been evaluated.`,
          questionId,
          evidence: {
            questionId,
            questionNumber: question?.questionNumber,
            maxMarks: question?.maxMarks,
          },
        });
      }
    } else if (unmarkedQuestions > 0) {
      issues.push({
        code: "COMPLETENESS_PARTIALLY_MARKED",
        severity: "ERROR",
        message: `Evaluation is incomplete: ${unmarkedQuestions} of ${totalQuestions} questions remain unmarked.`,
        evidence: {
          evaluationId: evaluation.id,
          totalQuestions,
          markedQuestions,
          unmarkedQuestions,
          missingQuestionIds,
        },
      });

      for (const questionId of missingQuestionIds) {
        const question = evaluation.getQuestion(questionId);
        issues.push({
          code: "COMPLETENESS_MISSING_MARK",
          severity: "ERROR",
          message: question
            ? `Question ${question.questionNumber} (${question.id}) has not been evaluated.`
            : `Question (${questionId}) has not been evaluated.`,
          questionId,
          evidence: {
            questionId,
            questionNumber: question?.questionNumber,
            maxMarks: question?.maxMarks,
          },
        });
      }
    }

    const isComplete = totalQuestions > 0 && unmarkedQuestions === 0;
    const isValid = issues.length === 0;

    return {
      evaluationId: evaluation.id,
      isComplete,
      isValid,
      totalQuestions,
      markedQuestions,
      unmarkedQuestions,
      missingQuestionIds,
      issues,
      validatedAt: new Date().toISOString(),
    };
  }
}
