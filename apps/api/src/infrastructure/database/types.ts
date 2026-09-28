/**
 * Kysely database schema types for OSM Foundation and Authoritative Domain.
 * Conforms to docs/contracts/08-data-contract.md and docs/contracts/07-event-contract.md.
 */

import type { Generated } from "kysely";

export interface OutboxEventsTable {
  id: string;
  event_type: string;
  event_version: number;
  aggregate_type: string;
  aggregate_id: string;
  producer: string;
  actor_type: string;
  actor_id: string;
  correlation_id: string;
  causation_id: string;
  payload: string; // JSON stringified payload
  status: "PENDING" | "PUBLISHED" | "FAILED";
  retry_count: Generated<number>;
  last_error: string | null;
  created_at: string; // ISO 8601 UTC
  published_at: string | null;
}

export interface AuditEventsTable {
  id: string;
  event_type: string;
  actor_type: string;
  actor_id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  details: string; // JSON stringified details
  occurred_at: string; // ISO 8601 UTC
}

export interface IdempotencyRecordsTable {
  key: string;
  request_hash: string;
  response_status: number;
  response_body: string; // JSON stringified response
  created_at: string; // ISO 8601 UTC
  expires_at: string; // ISO 8601 UTC
}

export interface RubricsTable {
  id: string;
  version: number;
  title: string;
  criteria: string; // JSON stringified criteria & levels
  total_max_marks: number;
  created_at: string; // ISO 8601 UTC
}

export interface EvaluationsTable {
  id: string;
  evaluation_cycle_id: string;
  script_id: string;
  evaluator_id: string;
  rubric_id: string;
  rubric_version: number;
  status: string; // "DRAFT" | "IN_PROGRESS" | "SUBMITTED" | "FINALIZED"
  total_score: number;
  max_possible_score: number;
  is_complete: number; // 0 or 1
  version: number;
  submitted_at: string | null;
  finalized_at: string | null;
  created_at: string; // ISO 8601 UTC
  updated_at: string; // ISO 8601 UTC
}

export interface QuestionsTable {
  id: string;
  evaluation_id: string;
  question_number: string;
  text: string;
  max_marks: number;
  rubric_criteria_id: string | null;
  order_index: number;
}

export interface EvaluationMarksTable {
  id: string;
  evaluation_id: string;
  question_id: string;
  awarded_marks: number;
  max_marks: number;
  evaluator_id: string;
  comments: string | null;
  is_annotated: number; // 0 or 1
  assigned_at: string; // ISO 8601 UTC
}

export interface QualitySignalsTable {
  id: string;
  evaluation_id: string;
  evaluation_version: number;
  signal_type: string;
  severity: string;
  status: string;
  summary: string;
  evidence: string; // JSON stringified
  detector_type: string;
  detector_name: string;
  detector_version: string;
  created_at: string; // ISO 8601 UTC
  updated_at: string; // ISO 8601 UTC
}

export interface TriageCasesTable {
  id: string;
  case_number: string;
  evaluation_id: string;
  evaluation_cycle_id: string;
  quality_signal_id: string;
  status: string; // "OPEN" | "ASSIGNED" | "UNDER_REVIEW" | "RESOLVED" | "ESCALATED"
  priority: string;
  assignee_id: string | null;
  notes: string | null;
  version: number;
  created_at: string; // ISO 8601 UTC
  updated_at: string; // ISO 8601 UTC
}

export interface ResolutionsTable {
  id: string;
  triage_case_id: string;
  evaluation_id: string;
  outcome: string; // ResolutionOutcome enum
  reason: string;
  moderator_id: string;
  notes: string | null;
  evidence_references: string | null; // JSON stringified string[]
  created_at: string; // ISO 8601 UTC
}

export interface ExaminationDocumentsTable {
  id: string;
  evaluation_cycle_id: string;
  document_type: string; // "QUESTION_PAPER" | "MARKING_SCHEME" | "ANSWER_SHEET" | "REFERENCE_ANSWER"
  original_filename: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  sha256_hash: string;
  ocr_status: string; // "PENDING" | "EXTRACTED" | "HUMAN_VERIFIED" | "FAILED" | "MANUAL_FALLBACK"
  ocr_confidence: number | null;
  raw_text: string | null;
  human_verified_text: string | null;
  metadata: string | null; // JSON stringified metadata
  created_at: string; // ISO 8601 UTC
  updated_at: string; // ISO 8601 UTC
}

export interface ExtractedAnswersTable {
  id: string;
  evaluation_id: string;
  question_id: string;
  document_id: string | null;
  extracted_text: string;
  human_verified_text: string | null;
  page_number: number | null;
  confidence: number | null;
  verification_status: string; // "UNVERIFIED" | "HUMAN_CONFIRMED" | "MANUALLY_EDITED"
  uncertainty_flags: string | null; // JSON stringified string[]
  created_at: string; // ISO 8601 UTC
  updated_at: string; // ISO 8601 UTC
}

export interface AiDisagreementsTable {
  id: string;
  evaluation_id: string;
  question_id: string;
  category: string; // AiDisagreementCategory enum
  ai_suggested_score: number;
  human_awarded_score: number;
  score_delta: number;
  examiner_reason: string;
  evaluator_id: string;
  ai_analysis_id: string | null;
  created_at: string; // ISO 8601 UTC
}

export interface Database {
  outbox_events: OutboxEventsTable;
  audit_events: AuditEventsTable;
  idempotency_records: IdempotencyRecordsTable;
  rubrics: RubricsTable;
  evaluations: EvaluationsTable;
  questions: QuestionsTable;
  evaluation_marks: EvaluationMarksTable;
  quality_signals: QualitySignalsTable;
  triage_cases: TriageCasesTable;
  resolutions: ResolutionsTable;
  examination_documents: ExaminationDocumentsTable;
  extracted_answers: ExtractedAnswersTable;
  ai_disagreements: AiDisagreementsTable;
}

