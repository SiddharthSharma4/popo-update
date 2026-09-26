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
}

