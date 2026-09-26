/**
 * Canonical HTTP API DTOs and Zod validation schemas.
 * Conforms to docs/contracts/06-api-contract.md.
 */

import { z } from "zod";

export const HealthResponseSchema = z.object({
  status: z.literal("ok"),
  version: z.string(),
  environment: z.string(),
  timestamp: z.string().datetime(),
  database: z.enum(["connected", "disconnected"]),
  uptimeSeconds: z.number().nonnegative(),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;

export const ApiErrorResponseSchema = z.object({
  statusCode: z.number(),
  error: z.string(),
  message: z.string(),
  code: z.string().optional(),
  details: z.unknown().optional(),
  timestamp: z.string().datetime(),
});

export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;

import { EvaluationStatus, ActorType, SignalSeverity, QualitySignalStatus, TriageCaseStatus } from "./enums.js";

export const CreateEvaluationQuestionSchema = z.object({
  id: z.string().min(1).optional(),
  questionNumber: z.string().min(1),
  text: z.string().min(1),
  maxMarks: z.number().positive(),
  rubricCriteriaId: z.string().nullable().optional(),
  orderIndex: z.number().int().nonnegative(),
});
export type CreateEvaluationQuestionInput = z.infer<typeof CreateEvaluationQuestionSchema>;

export const CreateEvaluationRequestSchema = z.object({
  id: z.string().min(1).optional(),
  evaluationCycleId: z.string().min(1),
  scriptId: z.string().min(1),
  evaluatorId: z.string().min(1),
  rubricId: z.string().min(1),
  rubricVersion: z.number().int().positive(),
  questions: z.array(CreateEvaluationQuestionSchema).min(1),
});
export type CreateEvaluationRequest = z.infer<typeof CreateEvaluationRequestSchema>;

export const AssignMarkItemSchema = z.object({
  questionId: z.string().min(1),
  awardedMarks: z.number().optional(),
  awarded: z.number().optional(),
  comments: z.string().nullable().optional(),
  isAnnotated: z.boolean().optional(),
});
export type AssignMarkItem = z.infer<typeof AssignMarkItemSchema>;

export const AssignMarkRequestSchema = z.object({
  questionId: z.string().min(1).optional(),
  awardedMarks: z.number().optional(),
  awarded: z.number().optional(),
  marks: z.array(AssignMarkItemSchema).optional(),
  evaluatorId: z.string().optional(),
  actorType: z.nativeEnum(ActorType).optional(),
  comments: z.string().nullable().optional(),
  isAnnotated: z.boolean().optional(),
  expectedVersion: z.number().int().nonnegative().optional(),
});
export type AssignMarkRequest = z.infer<typeof AssignMarkRequestSchema>;

export const SubmitEvaluationRequestSchema = z.object({
  evaluatorId: z.string().optional(),
  actorType: z.nativeEnum(ActorType).optional(),
});
export type SubmitEvaluationRequest = z.infer<typeof SubmitEvaluationRequestSchema>;

export const QuestionDtoSchema = z.object({
  id: z.string(),
  questionNumber: z.string(),
  text: z.string(),
  maxMarks: z.number(),
  rubricCriteriaId: z.string().nullable(),
  orderIndex: z.number(),
});
export type QuestionDto = z.infer<typeof QuestionDtoSchema>;

export const MarkDtoSchema = z.object({
  questionId: z.string(),
  awardedMarks: z.number(),
  maxMarks: z.number(),
  evaluatorId: z.string(),
  comments: z.string().nullable(),
  isAnnotated: z.boolean(),
  assignedAt: z.string(),
});
export type MarkDto = z.infer<typeof MarkDtoSchema>;

export const EvaluationResponseSchema = z.object({
  id: z.string(),
  evaluationCycleId: z.string(),
  scriptId: z.string(),
  evaluatorId: z.string(),
  rubricId: z.string(),
  rubricVersion: z.number(),
  status: z.nativeEnum(EvaluationStatus),
  questions: z.array(QuestionDtoSchema),
  marks: z.array(MarkDtoSchema),
  totalScore: z.number(),
  maxPossibleScore: z.number(),
  isComplete: z.boolean(),
  version: z.number(),
  submittedAt: z.string().nullable(),
  finalizedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type EvaluationResponse = z.infer<typeof EvaluationResponseSchema>;

export const ListEvaluationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  evaluationCycleId: z.string().min(1).optional(),
  evaluatorId: z.string().min(1).optional(),
  status: z.nativeEnum(EvaluationStatus).optional(),
  scriptId: z.string().min(1).optional(),
});
export type ListEvaluationsQuery = z.infer<typeof ListEvaluationsQuerySchema>;

export const PaginatedEvaluationsResponseSchema = z.object({
  items: z.array(EvaluationResponseSchema),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative(),
});
export type PaginatedEvaluationsResponse = z.infer<typeof PaginatedEvaluationsResponseSchema>;

// Completeness Validation DTOs (docs/contracts/01-product-contract.md §13, docs/contracts/02-architecture-contract.md §14)
export const ValidationSeveritySchema = z.enum(["ERROR", "WARNING", "INFO"]);
export type ValidationSeverity = z.infer<typeof ValidationSeveritySchema>;

export const ValidationIssueDtoSchema = z.object({
  code: z.string(),
  severity: ValidationSeveritySchema,
  message: z.string(),
  questionId: z.string().optional(),
  evidence: z.record(z.string(), z.unknown()).optional(),
});
export type ValidationIssueDto = z.infer<typeof ValidationIssueDtoSchema>;

export const CompletenessValidationResultDtoSchema = z.object({
  evaluationId: z.string(),
  isComplete: z.boolean(),
  isValid: z.boolean(),
  totalQuestions: z.number().int().nonnegative(),
  markedQuestions: z.number().int().nonnegative(),
  unmarkedQuestions: z.number().int().nonnegative(),
  missingQuestionIds: z.array(z.string()),
  issues: z.array(ValidationIssueDtoSchema),
  validatedAt: z.string(),
});
export type CompletenessValidationResultDto = z.infer<typeof CompletenessValidationResultDtoSchema>;

// QualitySignal DTOs (docs/contracts/06-api-contract.md §25-27, §65, docs/contracts/08-data-contract.md §17-18)
export const QualitySignalSeveritySchema = z.nativeEnum(SignalSeverity);
export type QualitySignalSeverity = z.infer<typeof QualitySignalSeveritySchema>;

export const QualitySignalStatusSchema = z.nativeEnum(QualitySignalStatus);
export type QualitySignalStatusType = z.infer<typeof QualitySignalStatusSchema>;

export const DetectorProvenanceSchema = z.object({
  type: z.enum(["DETERMINISTIC", "STATISTICAL", "AI"]),
  name: z.string().min(1),
  version: z.string().min(1),
  config: z.record(z.string(), z.unknown()).optional(),
});
export type DetectorProvenance = z.infer<typeof DetectorProvenanceSchema>;

export const QualitySignalResponseSchema = z.object({
  id: z.string(),
  evaluationId: z.string(),
  evaluationVersion: z.number().int().nonnegative(),
  signalType: z.string(),
  severity: QualitySignalSeveritySchema,
  status: QualitySignalStatusSchema,
  summary: z.string(),
  evidence: z.record(z.string(), z.unknown()),
  detector: DetectorProvenanceSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type QualitySignalResponse = z.infer<typeof QualitySignalResponseSchema>;

export const ListQualitySignalsQuerySchema = z.object({
  evaluationId: z.string().optional(),
  status: QualitySignalStatusSchema.optional(),
  signalType: z.string().optional(),
});
export type ListQualitySignalsQuery = z.infer<typeof ListQualitySignalsQuerySchema>;

// TriageCase DTOs (docs/contracts/06-api-contract.md §29-32, §66-67)
export const TriageCaseStatusSchema = z.nativeEnum(TriageCaseStatus);
export type TriageCaseStatusType = z.infer<typeof TriageCaseStatusSchema>;

export const CreateTriageCaseRequestSchema = z.object({
  id: z.string().min(1).optional(),
  caseNumber: z.string().min(1).optional(),
  qualitySignalId: z.string().min(1),
  priority: z.nativeEnum(SignalSeverity).optional(),
  notes: z.string().nullable().optional(),
});
export type CreateTriageCaseRequest = z.infer<typeof CreateTriageCaseRequestSchema>;

export const AssignTriageCaseRequestSchema = z.object({
  assigneeId: z.string().min(1),
  expectedVersion: z.number().int().nonnegative().optional(),
});
export type AssignTriageCaseRequest = z.infer<typeof AssignTriageCaseRequestSchema>;

export const TriageCaseResponseSchema = z.object({
  id: z.string(),
  caseNumber: z.string(),
  evaluationId: z.string(),
  evaluationCycleId: z.string(),
  qualitySignalId: z.string(),
  status: TriageCaseStatusSchema,
  priority: z.string(),
  assigneeId: z.string().nullable(),
  notes: z.string().nullable(),
  version: z.number().int().positive(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type TriageCaseResponse = z.infer<typeof TriageCaseResponseSchema>;

export const ListTriageCasesQuerySchema = z.object({
  status: TriageCaseStatusSchema.optional(),
  assigneeId: z.string().min(1).optional(),
  evaluationId: z.string().min(1).optional(),
});
export type ListTriageCasesQuery = z.infer<typeof ListTriageCasesQuerySchema>;
