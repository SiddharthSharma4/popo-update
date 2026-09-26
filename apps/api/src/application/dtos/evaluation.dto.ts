/**
 * Evaluation Application DTOs.
 * Conforms to docs/contracts/06-api-contract.md §18, §21.3.
 */

import type { Evaluation, EvaluationStatus } from "../../domain/evaluation/evaluation.js";

export interface QuestionDto {
  id: string;
  questionNumber: string;
  text: string;
  maxMarks: number;
  rubricCriteriaId: string | null;
  orderIndex: number;
}

export interface MarkDto {
  questionId: string;
  awardedMarks: number;
  maxMarks: number;
  evaluatorId: string;
  comments: string | null;
  isAnnotated: boolean;
  assignedAt: string;
}

export interface EvaluationDto {
  id: string;
  evaluationCycleId: string;
  scriptId: string;
  evaluatorId: string;
  rubricId: string;
  rubricVersion: number;
  status: EvaluationStatus;
  questions: QuestionDto[];
  marks: MarkDto[];
  totalScore: number;
  maxPossibleScore: number;
  isComplete: boolean;
  version: number;
  submittedAt: string | null;
  finalizedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export function toEvaluationDto(evaluation: Evaluation): EvaluationDto {
  return {
    id: evaluation.id,
    evaluationCycleId: evaluation.evaluationCycleId,
    scriptId: evaluation.scriptId,
    evaluatorId: evaluation.evaluatorId,
    rubricId: evaluation.rubricId,
    rubricVersion: evaluation.rubricVersion,
    status: evaluation.status,
    questions: evaluation.questions.map((q) => ({
      id: q.id,
      questionNumber: q.questionNumber,
      text: q.text,
      maxMarks: q.maxMarks,
      rubricCriteriaId: q.rubricCriteriaId,
      orderIndex: q.orderIndex,
    })),
    marks: evaluation.getAllMarks().map((m) => ({
      questionId: m.questionId,
      awardedMarks: m.awardedMarks,
      maxMarks: m.maxMarks,
      evaluatorId: m.evaluatorId,
      comments: m.comments,
      isAnnotated: m.isAnnotated,
      assignedAt: m.assignedAt,
    })),
    totalScore: evaluation.totalScore,
    maxPossibleScore: evaluation.maxPossibleScore,
    isComplete: evaluation.isComplete(),
    version: evaluation.version,
    submittedAt: evaluation.submittedAt,
    finalizedAt: evaluation.finalizedAt,
    createdAt: evaluation.createdAt,
    updatedAt: evaluation.updatedAt,
  };
}
