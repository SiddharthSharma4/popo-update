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

import {
  EvaluationStatus,
  ActorType,
  SignalSeverity,
  QualitySignalStatus,
  TriageCaseStatus,
  ResolutionOutcome,
  AiAssistanceType,
  EvaluatorDeviationStatus,
  QualityRiskLevel,
  QualityHotspotType,
} from "./enums.js";

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
  id: z.string().trim().min(1).optional(),
  evaluationCycleId: z.string().trim().min(1),
  scriptId: z.string().trim().min(1),
  evaluatorId: z.string().trim().min(1),
  rubricId: z.string().trim().min(1),
  rubricVersion: z.number().int().positive(),
  questions: z.array(CreateEvaluationQuestionSchema).min(1),
});
export type CreateEvaluationRequest = z.infer<typeof CreateEvaluationRequestSchema>;

export const AssignMarkItemSchema = z.object({
  questionId: z.string().trim().min(1),
  awardedMarks: z.number().optional(),
  awarded: z.number().optional(),
  comments: z.string().nullable().optional(),
  isAnnotated: z.boolean().optional(),
});
export type AssignMarkItem = z.infer<typeof AssignMarkItemSchema>;

export const AssignMarkRequestSchema = z.object({
  questionId: z.string().trim().min(1).optional(),
  awardedMarks: z.number().optional(),
  awarded: z.number().optional(),
  marks: z.array(AssignMarkItemSchema).optional(),
  evaluatorId: z.string().trim().min(1).optional(),
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
  id: z.string().trim().min(1).optional(),
  caseNumber: z.string().trim().min(1).optional(),
  qualitySignalId: z.string().trim().min(1),
  priority: z.nativeEnum(SignalSeverity).optional(),
  notes: z.string().nullable().optional(),
});
export type CreateTriageCaseRequest = z.infer<typeof CreateTriageCaseRequestSchema>;

export const AssignTriageCaseRequestSchema = z.object({
  assigneeId: z.string().trim().min(1),
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
  assigneeId: z.string().trim().min(1).optional(),
  evaluationId: z.string().trim().min(1).optional(),
});
export type ListTriageCasesQuery = z.infer<typeof ListTriageCasesQuerySchema>;

// Resolution DTOs (docs/contracts/06-api-contract.md §32-33, §66-67)
export const ResolutionOutcomeSchema = z.nativeEnum(ResolutionOutcome);
export type ResolutionOutcomeType = z.infer<typeof ResolutionOutcomeSchema>;

export const ResolveTriageCaseRequestSchema = z.object({
  outcome: ResolutionOutcomeSchema,
  reason: z.string().trim().min(1, "Resolution reason is required."),
  notes: z.string().nullable().optional(),
  evidenceReferences: z.array(z.string()).optional(),
  expectedVersion: z.number().int().nonnegative().optional(),
});
export type ResolveTriageCaseRequest = z.infer<typeof ResolveTriageCaseRequestSchema>;

export const ResolutionResponseSchema = z.object({
  id: z.string(),
  triageCaseId: z.string(),
  evaluationId: z.string(),
  outcome: ResolutionOutcomeSchema,
  reason: z.string(),
  moderatorId: z.string(),
  notes: z.string().nullable(),
  evidenceReferences: z.array(z.string()),
  createdAt: z.string(),
});
export type ResolutionResponse = z.infer<typeof ResolutionResponseSchema>;

export const ResolveTriageCaseResponseSchema = z.object({
  triageCase: TriageCaseResponseSchema,
  resolution: ResolutionResponseSchema,
});
export type ResolveTriageCaseResponse = z.infer<typeof ResolveTriageCaseResponseSchema>;

// Audit Event DTOs (docs/contracts/06-api-contract.md §37-40, §69)
export const AuditActorDtoSchema = z.object({
  type: z.string(),
  id: z.string(),
});
export type AuditActorDto = z.infer<typeof AuditActorDtoSchema>;

export const AuditResourceDtoSchema = z.object({
  type: z.string(),
  id: z.string(),
});
export type AuditResourceDto = z.infer<typeof AuditResourceDtoSchema>;

export const AuditEventResponseSchema = z.object({
  id: z.string(),
  eventType: z.string(),
  actor: AuditActorDtoSchema,
  resource: AuditResourceDtoSchema,
  action: z.string(),
  details: z.record(z.string(), z.unknown()),
  occurredAt: z.string(),
  actorType: z.string(),
  actorId: z.string(),
  entityType: z.string(),
  entityId: z.string(),
});
export type AuditEventResponse = z.infer<typeof AuditEventResponseSchema>;

export const ListAuditEventsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
  entityType: z.string().min(1).optional(),
  entityId: z.string().min(1).optional(),
  actorType: z.string().min(1).optional(),
  actorId: z.string().min(1).optional(),
  eventType: z.string().min(1).optional(),
  action: z.string().min(1).optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});
export type ListAuditEventsQuery = z.infer<typeof ListAuditEventsQuerySchema>;

export const PaginatedAuditEventsResponseSchema = z.object({
  items: z.array(AuditEventResponseSchema),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative(),
});
export type PaginatedAuditEventsResponse = z.infer<typeof PaginatedAuditEventsResponseSchema>;

// AI Context & Advisory DTOs (docs/contracts/02-architecture-contract.md §27-30, 06-api-contract.md §34-36)
export const ApprovedAiQuestionContextSchema = z.object({
  questionNumber: z.string(),
  text: z.string(),
  maxMarks: z.number().positive(),
  awardedMarks: z.number().nullable(),
  comments: z.string().nullable(),
  isAnnotated: z.boolean(),
  criteriaTitle: z.string().nullable().optional(),
});
export type ApprovedAiQuestionContext = z.infer<typeof ApprovedAiQuestionContextSchema>;

export const ApprovedAiRubricCriterionSchema = z.object({
  id: z.string(),
  title: z.string(),
  maxMarks: z.number().positive(),
  description: z.string().optional(),
  levels: z
    .array(
      z.object({
        title: z.string(),
        marks: z.number(),
        description: z.string(),
      })
    )
    .optional(),
});
export type ApprovedAiRubricCriterion = z.infer<typeof ApprovedAiRubricCriterionSchema>;

export const ApprovedAiSignalContextSchema = z.object({
  signalId: z.string(),
  detectorType: z.string(),
  detectorName: z.string(),
  severity: z.string(),
  summary: z.string(),
  metrics: z.record(z.string(), z.unknown()).optional(),
});
export type ApprovedAiSignalContext = z.infer<typeof ApprovedAiSignalContextSchema>;

export const ApprovedAiTriageContextSchema = z.object({
  caseId: z.string(),
  priority: z.string(),
  notes: z.string().nullable().optional(),
});
export type ApprovedAiTriageContext = z.infer<typeof ApprovedAiTriageContextSchema>;

export const ApprovedAiContextSchema = z.object({
  evaluationId: z.string(),
  rubricId: z.string(),
  rubricVersion: z.number().int().positive(),
  assistanceType: z.nativeEnum(AiAssistanceType),
  questions: z.array(ApprovedAiQuestionContextSchema),
  rubricCriteria: z.array(ApprovedAiRubricCriterionSchema),
  signalContext: ApprovedAiSignalContextSchema.nullable().optional(),
  triageContext: ApprovedAiTriageContextSchema.nullable().optional(),
  assembledAt: z.string(),
});
export type ApprovedAiContext = z.infer<typeof ApprovedAiContextSchema>;

export const AiModelMetadataSchema = z.object({
  provider: z.string(),
  model: z.string(),
  version: z.string(),
  executionTimeMs: z.number().optional(),
});
export type AiModelMetadata = z.infer<typeof AiModelMetadataSchema>;

export const AiRecommendationResponseSchema = z.object({
  id: z.string(),
  type: z.nativeEnum(AiAssistanceType),
  recommendation: z.string(),
  confidence: z.number().min(0).max(1),
  evidenceReferences: z.array(z.string()),
  model: AiModelMetadataSchema,
  disclaimer: z.string(),
  generatedAt: z.string(),
  status: z.enum(["SUCCESS", "FALLBACK"]),
});
export type AiRecommendationResponse = z.infer<typeof AiRecommendationResponseSchema>;

export const GenerateAiAdvisoryRequestSchema = z.object({
  evaluationId: z.string().min(1),
  rubricId: z.string().min(1).optional(),
  rubricVersion: z.number().int().positive().optional(),
  qualitySignalId: z.string().optional(),
  triageCaseId: z.string().optional(),
  assistanceType: z.nativeEnum(AiAssistanceType).default(AiAssistanceType.EVALUATION_SUMMARY),
});
export type GenerateAiAdvisoryRequest = z.infer<typeof GenerateAiAdvisoryRequestSchema>;

// =========================================================================
// Phase 8: Quality Analytics DTOs & Validation Schemas (TASK-P8-ANALYTICS-001)
// =========================================================================

export const EvaluatorDeviationMetricSchema = z.object({
  evaluatorId: z.string(),
  evaluationCount: z.number().int().nonnegative(),
  evaluatorMeanScore: z.number().nonnegative(),
  evaluatorMeanPercentage: z.number().nonnegative(),
  peerMeanPercentage: z.number().nonnegative(),
  deviationPercentage: z.number().nonnegative(),
  standardDeviation: z.number().nonnegative(),
  status: z.nativeEnum(EvaluatorDeviationStatus),
  activeSignalCount: z.number().int().nonnegative(),
  triageCaseCount: z.number().int().nonnegative(),
});
export type EvaluatorDeviationMetric = z.infer<typeof EvaluatorDeviationMetricSchema>;

export const QuestionPerformanceMetricSchema = z.object({
  questionId: z.string(),
  questionNumber: z.string(),
  maxMarks: z.number().positive(),
  evaluationsCount: z.number().int().nonnegative(),
  meanScore: z.number().nonnegative(),
  meanPercentage: z.number().nonnegative(),
  missingMarksCount: z.number().int().nonnegative(),
});
export type QuestionPerformanceMetric = z.infer<typeof QuestionPerformanceMetricSchema>;

export const QualityAnalyticsSummarySchema = z.object({
  evaluationCycleId: z.string().optional(),
  totalEvaluations: z.number().int().nonnegative(),
  totalEvaluators: z.number().int().nonnegative(),
  meanCohortScore: z.number().nonnegative(),
  meanCohortPercentage: z.number().nonnegative(),
  signalsSummary: z.object({
    total: z.number().int().nonnegative(),
    bySeverity: z.record(z.string(), z.number().int().nonnegative()),
    byDetector: z.record(z.string(), z.number().int().nonnegative()),
  }),
  moderationSummary: z.object({
    totalCases: z.number().int().nonnegative(),
    openCases: z.number().int().nonnegative(),
    assignedCases: z.number().int().nonnegative(),
    resolvedCases: z.number().int().nonnegative(),
    byOutcome: z.record(z.string(), z.number().int().nonnegative()),
  }),
  evaluatorMetrics: z.array(EvaluatorDeviationMetricSchema),
  questionMetrics: z.array(QuestionPerformanceMetricSchema),
  generatedAt: z.string(),
});
export type QualityAnalyticsSummary = z.infer<typeof QualityAnalyticsSummarySchema>;

export const GetEvaluatorAnalyticsQuerySchema = z.object({
  evaluationCycleId: z.string().optional(),
  evaluatorId: z.string().optional(),
  minSampleSize: z.coerce.number().int().min(1).default(5),
});
export type GetEvaluatorAnalyticsQuery = z.infer<typeof GetEvaluatorAnalyticsQuerySchema>;

export const GetQualityAnalyticsQuerySchema = z.object({
  evaluationCycleId: z.string().optional(),
  minSampleSize: z.coerce.number().int().min(1).default(5),
});
export type GetQualityAnalyticsQuery = z.infer<typeof GetQualityAnalyticsQuerySchema>;

export const QualityPulseProgressSchema = z.object({
  total: z.number().int().nonnegative(),
  submitted: z.number().int().nonnegative(),
  inProgress: z.number().int().nonnegative(),
  draft: z.number().int().nonnegative(),
  finalized: z.number().int().nonnegative(),
  completionPercentage: z.number().nonnegative(),
});
export type QualityPulseProgress = z.infer<typeof QualityPulseProgressSchema>;

export const QualityPulseHealthSchema = z.object({
  healthIndex: z.number().min(0).max(100),
  riskLevel: z.nativeEnum(QualityRiskLevel),
  evaluationsWithSignalsCount: z.number().int().nonnegative(),
});
export type QualityPulseHealth = z.infer<typeof QualityPulseHealthSchema>;

export const QualityHotspotSchema = z.object({
  hotspotType: z.nativeEnum(QualityHotspotType),
  targetId: z.string(),
  severity: z.nativeEnum(SignalSeverity),
  title: z.string(),
  description: z.string(),
  evidence: z.record(z.string(), z.unknown()),
});
export type QualityHotspot = z.infer<typeof QualityHotspotSchema>;

export const QualityPulseOverviewSchema = z.object({
  evaluationCycleId: z.string().optional(),
  progress: QualityPulseProgressSchema,
  health: QualityPulseHealthSchema,
  signalsOverview: z.object({
    total: z.number().int().nonnegative(),
    openReviewable: z.number().int().nonnegative(),
    linkedToCase: z.number().int().nonnegative(),
    resolved: z.number().int().nonnegative(),
    dismissed: z.number().int().nonnegative(),
    bySeverity: z.record(z.string(), z.number().int().nonnegative()),
    byDetector: z.record(z.string(), z.number().int().nonnegative()),
  }),
  moderationOverview: z.object({
    totalCases: z.number().int().nonnegative(),
    openCases: z.number().int().nonnegative(),
    assignedCases: z.number().int().nonnegative(),
    resolvedCases: z.number().int().nonnegative(),
    resolutionRate: z.number().nonnegative(),
    byOutcome: z.record(z.string(), z.number().int().nonnegative()),
  }),
  evaluatorDeviations: z.object({
    totalEvaluators: z.number().int().nonnegative(),
    normalCount: z.number().int().nonnegative(),
    moderateDeviationCount: z.number().int().nonnegative(),
    criticalDeviationCount: z.number().int().nonnegative(),
    insufficientDataCount: z.number().int().nonnegative(),
    flaggedEvaluatorIds: z.array(z.string()),
  }),
  topHotspots: z.array(QualityHotspotSchema),
  generatedAt: z.string(),
});
export type QualityPulseOverview = z.infer<typeof QualityPulseOverviewSchema>;

export const TriggerSentinelResponseSchema = z.object({
  triggeredAt: z.string(),
  evaluationCycleId: z.string().optional(),
  evaluatorsAnalyzed: z.number().int().nonnegative(),
  anomaliesDetected: z.number().int().nonnegative(),
  newSignalsGenerated: z.number().int().nonnegative(),
  signals: z.array(QualitySignalResponseSchema),
});
export type TriggerSentinelResponse = z.infer<typeof TriggerSentinelResponseSchema>;

export const GetQualityPulseQuerySchema = z.object({
  evaluationCycleId: z.string().optional(),
  minSampleSize: z.coerce.number().int().min(1).default(5),
  limit: z.coerce.number().int().min(1).default(10),
});
export type GetQualityPulseQuery = z.infer<typeof GetQualityPulseQuerySchema>;

// ==========================================
// Phase 9: External OSM Integration Schemas
// Conforms to docs/contracts/02-architecture-contract.md §50-52,
// docs/contracts/06-api-contract.md §54-56,
// and docs/contracts/08-data-contract.md §108-111.
// ==========================================

export const ExternalOsmMarkSchema = z.object({
  questionId: z.string().optional(),
  questionNumber: z.string().min(1, "Question number is required"),
  awardedMarks: z.number().min(0, "Awarded marks cannot be negative"),
  comments: z.string().nullable().optional(),
  isAnnotated: z.boolean().optional(),
});
export type ExternalOsmMark = z.infer<typeof ExternalOsmMarkSchema>;

export const ExternalOsmQuestionSchema = z.object({
  id: z.string().optional(),
  questionNumber: z.string().min(1, "Question number is required"),
  text: z.string().optional(),
  maxMarks: z.number().positive("Question maxMarks must be positive"),
  rubricCriteriaId: z.string().nullable().optional(),
  orderIndex: z.number().int().nonnegative().optional(),
});
export type ExternalOsmQuestion = z.infer<typeof ExternalOsmQuestionSchema>;

export const ExternalOsmEvaluationSchema = z.object({
  externalEvaluationId: z.string().min(1, "External evaluation ID is required"),
  sourceSystem: z.string().min(1, "Source system identifier is required"),
  scriptId: z.string().min(1, "Script ID is required"),
  evaluatorId: z.string().min(1, "Evaluator ID is required"),
  evaluationCycleId: z.string().min(1, "Evaluation cycle ID is required"),
  rubricId: z.string().min(1, "Rubric ID is required"),
  rubricVersion: z.number().int().positive().optional().default(1),
  questions: z.array(ExternalOsmQuestionSchema).optional(),
  marks: z.array(ExternalOsmMarkSchema).default([]),
  autoSubmit: z.boolean().optional().default(false),
  idempotencyKey: z.string().optional(),
});
export type ExternalOsmEvaluation = z.infer<typeof ExternalOsmEvaluationSchema>;

export const ExternalOsmBatchImportSchema = z.object({
  batchId: z.string().min(1, "Batch ID is required"),
  sourceSystem: z.string().min(1, "Source system identifier is required"),
  evaluations: z.array(ExternalOsmEvaluationSchema).min(1, "Batch must contain at least one evaluation"),
});
export type ExternalOsmBatchImport = z.infer<typeof ExternalOsmBatchImportSchema>;

export const ExternalOsmIngestStatus = {
  CREATED: "CREATED",
  IDEMPOTENT_REPLAY: "IDEMPOTENT_REPLAY",
  FAILED: "FAILED",
} as const;
export type ExternalOsmIngestStatus =
  (typeof ExternalOsmIngestStatus)[keyof typeof ExternalOsmIngestStatus];

export const ExternalOsmIngestResultSchema = z.object({
  externalEvaluationId: z.string(),
  evaluationId: z.string(),
  status: z.enum(["CREATED", "IDEMPOTENT_REPLAY", "FAILED"]),
  message: z.string(),
  totalScore: z.number(),
  isSubmitted: z.boolean(),
  error: z.string().optional(),
});
export type ExternalOsmIngestResult = z.infer<typeof ExternalOsmIngestResultSchema>;

export const ExternalOsmBatchResultSchema = z.object({
  batchId: z.string(),
  sourceSystem: z.string(),
  totalCount: z.number(),
  createdCount: z.number(),
  replayedCount: z.number(),
  failedCount: z.number(),
  results: z.array(ExternalOsmIngestResultSchema),
});
export type ExternalOsmBatchResult = z.infer<typeof ExternalOsmBatchResultSchema>;

// =========================================================================
// Phase 11: Demo Scenario DTOs (TASK-P11-DEMO-001)
// =========================================================================

export const DemoSeedResponseSchema = z.object({
  status: z.enum(["SEEDED", "ALREADY_SEEDED"]),
  rubricId: z.string(),
  cycleId: z.string(),
  evaluationsCount: z.number().int().nonnegative(),
  signalsCount: z.number().int().nonnegative(),
  triageCasesCount: z.number().int().nonnegative(),
  message: z.string(),
  seededAt: z.string(),
});
export type DemoSeedResponse = z.infer<typeof DemoSeedResponseSchema>;

export const DemoResetResponseSchema = z.object({
  status: z.enum(["RESET", "ALREADY_RESET"]),
  cycleId: z.string(),
  rubricId: z.string(),
  evaluationsRemoved: z.number().int().nonnegative(),
  signalsRemoved: z.number().int().nonnegative(),
  triageCasesRemoved: z.number().int().nonnegative(),
  resolutionsRemoved: z.number().int().nonnegative(),
  message: z.string(),
  resetAt: z.string(),
});
export type DemoResetResponse = z.infer<typeof DemoResetResponseSchema>;
