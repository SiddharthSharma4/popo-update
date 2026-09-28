# Canonical Source-of-Truth Architecture Map

**Project:** EvalOS — AI Evaluation Intelligence & QA Layer for On-Screen Marking  
**Document Status:** Complete Forensic Architecture Mapping  
**Target:** State Management, Canonical Persistence, Read Models, Projections, and Dual Source-of-Truth Analysis  
**Date:** September 2026  

---

## 1. Executive Analysis: Canonical Persistence vs Dual Frontend State

A foundational finding of this forensic audit is that the core authoritative marking, moderation, and audit workflows are **truthfully backed by SQLite tables** via Fastify endpoints and transactional unit-of-work repositories. However, several peripheral entities (such as users, candidate demographic metadata, script OCR content, and rubric level text) have **no database tables** and exist exclusively as **client-side React fixtures**.

Furthermore, React state in components like `EvaluationWorkspace` acts as an active **secondary source of truth** during marking sessions prior to explicit save or submit actions.

```
                    CANONICAL STORAGE LAYER (SQLite / WAL)
   ┌───────────────────────────────────────────────────────────────────────┐
   │ evaluations │ questions │ evaluation_marks │ rubrics │ quality_signals │
   │ triage_cases │ resolutions │ audit_events  │ outbox_events            │
   └───────────────────────────────────────────────────────────────────────┘
                                      ▲
                                      │ REST API (JSON / Zod Schemas)
                                      ▼
                        FRONTEND STATE PROJECTIONS
   ┌───────────────────────────────────────────────────────────────────────┐
   │ React useState (localMarks, activeQuestionId, saveStatus)             │
   │ AuthContext (role, actorId, actorType from Header Switcher)           │
   │ Static Fixtures (SCRIPT_REFERENCES, RUBRIC_CRITERIA, SCRIPT_ANSWERS) │
   └───────────────────────────────────────────────────────────────────────┘
```

---

## 2. Comprehensive Entity Source-of-Truth Matrix

| Entity | Canonical Table / Model | Creation Path | Update Path | Read Path | Dependents / Projections | Audit Event | Potential Duplicate / Dual Source |
|:---|:---|:---|:---|:---|:---|:---|:---|
| **User / Identity** | **NONE** (No DB table). Header-injected context. | Client-side demo role switcher preset selection in `Header.tsx`. | Changed via `<select>` in header; stored in `App.tsx` state (`auth`). | Read from `auth` state in React components; sent via `x-actor-id`, `x-user-role` HTTP headers. | Role guards, evaluation assignment validation, triage assignment. | None for identity change. | `apps/web/src/services/actor-fixtures.ts` (`ACTOR_DISPLAY_NAMES`) maps IDs to strings. |
| **Role** | **NONE** (No DB table). Validated via `@osm/shared` `UserRole` enum. | Initialized in `App.tsx` default (`UserRole.EXAMINER`). | Header dropdown switches between `EXAMINER`, `MODERATOR`, `ADMIN`. | Inspected by `AppRoutes.tsx`, route guards, and backend fastify pre-handlers. | Route visibility, API endpoint permissioning. | None. | Frontend `auth.role` state vs backend header parsing. |
| **Examiner / Evaluator** | **NONE** (No standalone examiner table). Represented as `evaluator_id` foreign key in `evaluations`. | Seeded in `DemoScenarioService` (`evaluator_1`, `evaluator_lenient`, etc.). | Cannot be directly updated. | `GET /api/v1/evaluations?evaluatorId=...`, `GET /api/v1/analytics/evaluators`. | Evaluator scoring distributions, cohort mean deviations. | Indirectly via `ASSIGN_MARK`. | `actor-fixtures.ts` contains hardcoded academic titles and names. |
| **Candidate** | **NONE** (No DB table). Candidate is anonymized. | Seeded as part of `script_id`. | Immutable. | Joined purely on client via `getScriptReference(scriptId)`. | Script display header, candidate label chips. | None. | `apps/web/src/fixtures/scriptReferences.ts` (`SCRIPT_REFERENCES`). |
| **Script (Answer Booklet)** | **NONE** (Only `script_id` string stored in `evaluations` table). | Injected during evaluation creation or demo seeding. | Immutable. | `evaluations.script_id` column. | `EvaluationWorkspace.tsx` left pane. | None. | `apps/web/src/fixtures/scriptReferences.ts` (`SCRIPT_ANSWERS` fixture contains the full answer text!). |
| **Evaluation** | `evaluations` (SQLite) / `Evaluation` aggregate | `POST /api/v1/evaluations` or `DemoScenarioService.seedScenario`. | `PATCH /api/v1/evaluations/:id`, `POST /api/v1/evaluations/:id/submit`. | `GET /api/v1/evaluations/:id`, `GET /api/v1/evaluations`. | Progress telemetry, QualityPulse, Triage, Examiner Queue. | `CREATE_EVALUATION`, `SUBMIT_EVALUATION`. | `EvaluationWorkspace.tsx` maintains local `evaluation` React state, which can desync if concurrent edits occur. |
| **Question** | `questions` (SQLite) / `Question` entity | Created with parent evaluation via `CreateEvaluationHandler` or demo seed. | Immutable once created (no update endpoint). | `GET /api/v1/evaluations/:id` (eagerly joined with marks). | Marking inputs, CompleteCheck validator, question stepper. | None individually. | Question prompt text stored in SQLite; answer text stored in frontend fixture. |
| **Question Mark** | `evaluation_marks` (SQLite) / `Mark` value object | `PATCH /api/v1/evaluations/:id` (`AssignMarkHandler`). | `PATCH /api/v1/evaluations/:id` (updates existing mark in-place). | Joined in `GET /api/v1/evaluations/:id`. | `evaluation.total_score`, CompleteCheck validation, cohort mean analytics. | `ASSIGN_MARK` (or `UPDATE_MARK` if overwriting). | **CRITICAL:** `EvaluationWorkspace` stores uncommitted drafts in `localMarks` React state. If user navigates away before clicking "Save Mark", mark is lost! |
| **Rubric** | `rubrics` (SQLite) / `Rubric` aggregate | `POST /api/v1/rubrics` or demo seed (`RUBRIC-CS-101`). | Immutable versioned aggregate. New version requires new entity. | `GET /api/v1/rubrics/:id`. | Max marks validation, criteria scoring bands. | `CREATE_RUBRIC`. | **CRITICAL:** SQLite stores criteria IDs and titles, but `apps/web/src/fixtures/scriptReferences.ts` (`RUBRIC_CRITERIA`) stores the actual qualitative band text! |
| **Submission** | `evaluations.submitted_at` & `evaluations.status = 'SUBMITTED'` | `POST /api/v1/evaluations/:id/submit` (`SubmitEvaluationHandler`). | Locked upon transition; cannot be un-submitted. | `GET /api/v1/evaluations/:id`. | CompleteCheck status bar, evaluation locking, quality signal generation. | `SUBMIT_EVALUATION`. | Frontend disables button via `!completeness.isComplete`, but backend permits submission of partial scripts and generates a signal. |
| **Quality Signal** | `quality_signals` (SQLite) / `QualitySignal` aggregate | `CompletenessSignalGenerator` (on submission) or `EvaluatorMeanDeviationDetector` (`POST /api/v1/analytics/sentinel/trigger`). | `signal.resolve(outcome)` or `signal.dismiss(reason)` via `ResolveTriageCaseHandler`. | `GET /api/v1/quality-signals`, `GET /api/v1/quality-signals/:id`. | Triage cases, QualityPulse signals count, Cohort Health Card. | Only captured in audit log when triage case is resolved; signal generation itself does not create an audit record. | None. Pure backend database entity. |
| **Triage Case** | `triage_cases` (SQLite) / `TriageCase` aggregate | `POST /api/v1/triage-cases` or `DemoScenarioService.seedScenario`. | `POST /api/v1/triage-cases/:id/assign`, `POST /api/v1/triage-cases/:id/resolve`. | `GET /api/v1/triage-cases`, `GET /api/v1/triage-cases/:id`. | Escalation Hub, Moderator queue, resolution rate telemetry. | `CREATE_TRIAGE_CASE`, `ASSIGN_TRIAGE_CASE`, `RESOLVE_TRIAGE_CASE`. | EscalationHub stores selected case in React state. |
| **AI Advisory** | **EPHEMERAL / RUNTIME** (Generated on-demand, NOT stored in DB table). | `POST /api/v1/ai/advisory` (`AiService.generateAdvisory`). | None. Fresh advisory generated per call. | Transient HTTP response body. | Triage Case Detail modal AI advisory box. | **NONE.** (Backend does not write audit record for AI advisory). | Frontend displays advisory in `TriageCaseDetail.tsx`; lost on page refresh. |
| **Resolution** | `resolutions` (SQLite) / `Resolution` entity | `POST /api/v1/triage-cases/:id/resolve` (`ResolveTriageCaseHandler`). | Immutable record of human moderation decision. | Joined in `GET /api/v1/triage-cases/:id`. | Triage Case Detail resolution banner, QualityPulse resolution breakdown. | `RESOLVE_TRIAGE_CASE`. | None. Canonical SQLite table. |
| **Audit Event** | `audit_events` (SQLite) / `AuditEvent` entity | Append-only write via `scope.audit.record(...)` across command handlers. | **STRICTLY IMMUTABLE** (No update/delete paths exist). | `GET /api/v1/audit-events` (with pagination, entity/actor filters). | TrustLens Audit Ledger timeline view. | Self-describing audit trail. | None. Canonical SQLite table. |
| **Examination Cycle** | Seeded identifier `cycle-2026-demo` in `evaluations.evaluation_cycle_id`. (No standalone cycles table). | Injected during demo seed or evaluation ingestion. | Immutable string identifier. | Query parameter in evaluation and analytics endpoints. | QualityPulse filtering, Cohort Health card. | None. | Admin pages hardcode cycle description as "Mathematics" while cycle ID represents Computer Science. |
| **Cohort** | Analytical grouping of evaluations sharing an `evaluation_cycle_id`. | Derived dynamically by `QualityAnalyticsService`. | Recomputed on demand from active evaluations in SQLite. | `GET /api/v1/analytics/quality-pulse`, `GET /api/v1/analytics/evaluators`. | Cohort Health Index, Evaluator Deviation Table, Hotspots list. | None. | None. Real-time dynamic projection. |

---

## 3. Detailed Entity Lifecycle Tracing

### 3.1 Evaluation Entity Lifecycle
- **Canonical Table:** `evaluations`
- **Creation Path:** `POST /api/v1/evaluations` → `CreateEvaluationHandler` validates rubric exists, creates `Evaluation` aggregate, records `CREATE_EVALUATION` audit event, inserts into `evaluations` and `questions` tables in a single transaction.
- **Marking Path:** `PATCH /api/v1/evaluations/:id` → `AssignMarkHandler` loads `Evaluation` aggregate, verifies `evaluator_id` matches caller, checks `status !== 'SUBMITTED'`, invokes `evaluation.assignMark(...)`, writes to `evaluation_marks` table, increments `version`, updates `total_score`, records `ASSIGN_MARK` audit event, and publishes outbox event.
- **Submission Path:** `POST /api/v1/evaluations/:id/submit` → `SubmitEvaluationHandler` checks evaluator authorization, validates completeness, executes `evaluation.submit()`, updates `evaluations` (`status='SUBMITTED'`, `submitted_at=now`), conditionally creates `QualitySignal`, and records `SUBMIT_EVALUATION` audit event.
- **Read Path:** `GET /api/v1/evaluations/:id` queries `evaluations`, joins `questions` and `evaluation_marks`, constructs `EvaluationResponse` DTO.
- **Consumers:** `EvaluationWorkspace.tsx`, `ExaminerQueue.tsx`, `CohortHealthCard.tsx`, `QualityPulseService`.

### 3.2 Quality Signal & Triage Case Lifecycle
- **Canonical Tables:** `quality_signals`, `triage_cases`, `resolutions`
- **Generation:**
  - *Completeness Signal:* Automatically generated in `SubmitEvaluationHandler` if `unmarkedQuestions > 0`.
  - *Statistical Signal:* Generated via `POST /api/v1/analytics/sentinel/trigger` by `EvaluatorMeanDeviationDetector` if an evaluator's average score deviates by $\ge 15\%$ from peer baseline.
- **Triage Assignment:** `POST /api/v1/triage-cases/:id/assign` → `AssignTriageCaseHandler` sets `assignee_id`, transitions status to `ASSIGNED`, records `ASSIGN_TRIAGE_CASE` audit event.
- **Resolution:** `POST /api/v1/triage-cases/:id/resolve` → `ResolveTriageCaseHandler` validates human moderator role, transitions case to `RESOLVED`, creates record in `resolutions`, updates `quality_signals` to `RESOLVED` or `DISMISSED`, records `RESOLVE_TRIAGE_CASE` audit event.
- **Consumers:** `EscalationHub.tsx`, `TriageCaseDetail.tsx`, `QualityPulseDashboard.tsx`.

---

## 4. Frontend Dual Source-of-Truth Risks

1. **Unsaved Local Marks (`localMarks` in `EvaluationWorkspace.tsx`):**
   - The user inputs a mark in the text box. The component updates `localMarks[q.id]`.
   - The score on screen and question tabs update locally, but the database is unchanged until the user explicitly clicks the small "Save Mark" button.
   - If the user clicks "Next Question" or navigates back to the queue, all un-saved input is discarded without an alert or dirty-state warning.
2. **Actor Identity State Disconnect:**
   - The top navigation bar maintains `auth.actorId` (`evaluator_1`, `Dr. Sarah Jenkins`).
   - The URL parameter can point to an evaluation assigned to `evaluator_2` (`eval-demo-peer-201`).
   - Because the frontend does not enforce synchronization between the active identity and the evaluation's assigned evaluator, the UI displays one person while viewing another person's script, resulting in an unexpected 403 Forbidden error on save.
3. **Hardcoded Student Answers vs. Database Questions:**
   - The database stores question text (`"Explain the difference between AVL trees..."`), max marks (40), and criteria IDs.
   - However, the student's answer text is loaded from `SCRIPT_ANSWERS` in `scriptReferences.ts`. If an evaluation has a `script_id` that is not in the hardcoded dictionary, the student answer appears as a generic placeholder.
