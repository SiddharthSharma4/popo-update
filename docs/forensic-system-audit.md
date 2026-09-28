# EvalOS Forensic System Audit & Comprehensive Technical Review

**Document Version:** 1.0.0  
**Document Classification:** Authoritative Forensic Technical Audit  
**Auditor Roles:** Senior Staff Engineer, Systems Architect, QA Engineer, Product Engineer, and Forensic Code Reviewer  
**Repository Target:** EvalOS — AI Evaluation Intelligence & QA Layer for On-Screen Marking  
**Date:** September 2026  

---

## 1. Executive Summary

This forensic audit was commissioned to verify the structural integrity, state veracity, and architectural soundness of **EvalOS** ("AI Evaluation Intelligence & QA Layer for On-Screen Marking"). The primary goal was to determine whether the user interface displays represent real, persistent, transactional application state or whether metrics, states, and demo records are independently seeded, mock-driven, or hardcoded.

### Key Audit Conclusions

1. **The Core Domain & Transaction Engine is Genuinely Real:**
   - Authoritative marking, score calculation, optimistic locking, and submission transitions are **truthfully implemented** via Fastify endpoints (`PATCH /api/v1/evaluations/:id`, `POST /api/v1/evaluations/:id/submit`) and transactional Unit of Work repositories backed by a real SQLite WAL database.
   - Evaluator cohort analytics (QualityPulse, $\Delta\%$, $\sigma$, clean evaluation rate) are **mathematically computed at runtime** from active database records by `QualityPulseService` and `QualityAnalyticsService`.
   - Moderation triage cases, case assignments, human resolutions, and outbox events are **fully transactional** and write to canonical tables (`triage_cases`, `resolutions`, `quality_signals`).
   - The TrustLens ledger is backed by an append-only `audit_events` database table with real-time Fastify streaming and server-enforced role authorization.

2. **The Peripheral Layer is Heavily Fixture-Dependent:**
   - **Candidate Answer Text:** The SQLite database stores only question prompts, max marks, and criteria IDs. The actual written student responses displayed in the left pane of the evaluation workspace exist **only in a static client-side fixture** (`apps/web/src/fixtures/scriptReferences.ts`).
   - **Rubric Descriptors:** Detailed qualitative grading bands (Exemplary, Proficient, Developing, etc.) are hardcoded in the frontend fixture rather than retrieved from the database's `rubrics.criteria` JSON column.
   - **Actor Personas & Names:** User accounts do not exist in the database. Authentication is simulated via client-side headers (`x-user-role`, `x-actor-id`), and names like "Dr. Sarah Jenkins" come from a frontend lookup table (`actor-fixtures.ts`).

3. **Critical Contradictions & Broken References Found:**
   - **Curriculum Schism:** The database seed, question prompts, rubric criteria, and candidate answers are **100% Computer Science** (`CS-101`, AVL Trees, SOLID architecture). However, `AdminDemoPage.tsx` and `AdminOverviewPage.tsx` repeatedly describe a fictional "Spring 2026 Mathematics Cohort" with "Rubric ID: rubric-math-2026".
   - **Persona Inversion:** `AdminDemoPage.tsx` calls `evaluator_1` "Dr. Smith", but in `actor-fixtures.ts` she is "Dr. Sarah Jenkins". Later in Act 3, the copy calls "Sarah Jenkins" the "Chief Moderator", directly inverting her role (she is an Examiner; Chief Moderator is `moderator_1` Prof. Marcus Vance).
   - **Triage Script Reference Bug:** `TriageCaseDetail.tsx:84` passes `evaluationId` (`eval-demo-lenient-501`) into `getScriptReference()` instead of `scriptId` (`SCRIPT-DEMO-501`), producing broken fallback barcode labels like `OSM-2026-CS101-eval-demo-lenient-501`.
   - **Un-audited Operations:** The UI defines audit labels for `GENERATE_AI_ADVISORY` and `TRIGGER_SENTINEL`, but neither the AI service nor the Sentinel anomaly detection engine writes records to the `audit_events` table.
   - **Unsaved Draft Risk:** In the workspace, typing marks updates local React state only (`localMarks`). If the examiner clicks to another question or exits to the queue without clicking "Save Mark", the score is discarded silently.

---

## 2. Actual Architecture

### 2.1 Monorepo Structure & Technology Stack
- **Architecture Style:** Clean Architecture / Domain-Driven Design (DDD) monorepo powered by npm workspaces.
- **Frontend App (`apps/web`):**
  - **Framework:** React 19 (`react: ^19.0.0`, `react-dom: ^19.0.0`).
  - **Bundler & Dev Server:** Vite 6 (`vite: ^6.0.0`).
  - **Routing:** React Router v7 (`react-router-dom: ^7.1.0`).
  - **Styling:** Custom Vanilla CSS design system (`apps/web/src/styles/index.css`) with institutional design tokens. Zero Tailwind.
- **Backend API (`apps/api`):**
  - **Framework:** Fastify 5 (`fastify: ^5.0.0`).
  - **Runtime Database:** Node native `node:sqlite` (`DatabaseSync`) operating in Write-Ahead Logging (WAL) mode.
  - **ORM / Query Layer:** Kysely 0.27 (`kysely: ^0.27.0`) with custom dialect adapter (`dialect.ts`).
  - **Schema Validation:** Zod 3 (`zod: ^3.24.0`) shared across API and Web via `@osm/shared`.
- **Shared Package (`packages/shared`):**
  - Domain enums, Zod request/response schemas, DTOs, and type contracts.

### 2.2 System Layering
```
apps/web (React 19 / Vite 6)
  └── Services (api-client, evaluation-service, analytics-service, triage-service, demo-service)
        └── Fastify HTTP Presentation Layer (apps/api/src/presentation/routes)
              └── Application Layer (Commands, Queries, Services)
                    └── Domain Layer (Aggregates: Evaluation, Rubric, QualitySignal, TriageCase, AuditEvent)
                          └── Infrastructure (Kysely Repositories, Unit of Work, node:sqlite WAL)
```

---

## 3. Actual User Flows

The system supports three primary user personas via client-side role simulation:

### A. Examiner Journey
1. Examiner selects their identity preset in `Header.tsx` (e.g., `evaluator_1` Dr. Sarah Jenkins).
2. Navigates to `/examiner/queue`: API fetches evaluations filtered by `evaluatorId`.
3. Opens `/examiner/evaluate/:id`: API returns evaluation, questions, and existing marks. Client joins static student answers from `SCRIPT_ANSWERS`.
4. Examiner inputs marks per question. Marks are held in React `localMarks`.
5. Examiner clicks "Save Mark": `PATCH /api/v1/evaluations/:id` updates DB, increments version, updates total score, and writes `ASSIGN_MARK` to audit table.
6. When all questions are marked, `CompleteCheck` turns green.
7. Examiner clicks "Validate & Submit": `POST /api/v1/evaluations/:id/submit` sets status to `SUBMITTED`, locks the evaluation, and writes `SUBMIT_EVALUATION` to audit ledger.

### B. Moderator Journey
1. Moderator selects `moderator_1` (Prof. Marcus Vance) and opens `/moderator/triage`.
2. Selects an active case (e.g. `TC-DEMO-001` or `TC-DEMO-002`). Detail pane loads linked `QualitySignal`.
3. Moderator clicks "Assign to Me": `POST /api/v1/triage-cases/:id/assign` claims case and writes `ASSIGN_TRIAGE_CASE` to audit log.
4. Moderator clicks "Request AI Advisory": `POST /api/v1/ai/advisory` invokes mock AI provider. Ephemeral recommendation renders in modal.
5. Moderator clicks "Record Authoritative Resolution": selects outcome (`CONFIRMED_VALID`, `DISMISSED`, etc.), enters rationale, submits `POST /api/v1/triage-cases/:id/resolve`. DB marks case resolved, updates signal status, and writes `RESOLVE_TRIAGE_CASE` to audit ledger.

### C. Administrator & Supervisory Journey
1. Admin inspects `/analytics`: Real-time QualityPulse telemetry (throughput, clean evaluation rate, evaluator scoring variance) is computed from database records.
2. Admin opens `/admin/demo`: Can trigger SentinelFlag anomaly scan (`POST /api/v1/analytics/sentinel/trigger`), seed golden cohort (`POST /api/v1/demo/seed`), or purge/reset database (`POST /api/v1/demo/reset`).
3. Admin opens `/moderator/audit`: Inspects immutable chronological audit events across all actors and entities.

---

## 4. Entity / Data Model

The SQLite database manages 10 core tables defined in `apps/api/src/infrastructure/database/types.ts`:

1. `evaluations`:
   - `id` (PK, string), `evaluation_cycle_id`, `script_id`, `evaluator_id`, `rubric_id`, `rubric_version`, `status` (`DRAFT`, `IN_PROGRESS`, `SUBMITTED`, `FINALIZED`), `total_score`, `max_possible_score`, `is_complete` (0/1), `version` (int), `submitted_at`, `finalized_at`, `created_at`, `updated_at`.
2. `questions`:
   - `id` (PK, string), `evaluation_id` (FK), `question_number`, `text`, `max_marks`, `rubric_criteria_id`, `order_index`.
3. `evaluation_marks`:
   - `id` (PK, string), `evaluation_id` (FK), `question_id` (FK), `awarded_marks`, `max_marks`, `evaluator_id`, `comments`, `is_annotated` (0/1), `assigned_at`.
4. `rubrics`:
   - `id` (PK, string), `version` (int), `title`, `criteria` (JSON string), `total_max_marks`, `created_at`.
5. `quality_signals`:
   - `id` (PK, string), `evaluation_id` (FK), `evaluation_version`, `signal_type`, `severity`, `status` (`GENERATED`, `REVIEWABLE`, `LINKED_TO_CASE`, `RESOLVED`, `DISMISSED`), `summary`, `evidence` (JSON), `detector_type`, `detector_name`, `detector_version`, `created_at`, `updated_at`.
6. `triage_cases`:
   - `id` (PK, string), `case_number`, `evaluation_id` (FK), `evaluation_cycle_id`, `quality_signal_id` (FK), `status` (`OPEN`, `ASSIGNED`, `UNDER_REVIEW`, `RESOLVED`, `ESCALATED`), `priority`, `assignee_id`, `notes`, `version`, `created_at`, `updated_at`.
7. `resolutions`:
   - `id` (PK, string), `triage_case_id` (FK), `evaluation_id` (FK), `outcome` (`CONFIRMED_VALID`, `DISMISSED`, etc.), `reason`, `moderator_id`, `notes`, `evidence_references` (JSON), `created_at`.
8. `audit_events`:
   - `id` (PK, string), `event_type`, `actor_type`, `actor_id`, `entity_type`, `entity_id`, `action`, `details` (JSON), `occurred_at`.
9. `outbox_events`:
   - `id` (PK, string), `event_type`, `event_version`, `aggregate_type`, `aggregate_id`, `producer`, `actor_type`, `actor_id`, `correlation_id`, `causation_id`, `payload` (JSON), `status` (`PENDING`, `PUBLISHED`, `FAILED`), `retry_count`, `last_error`, `created_at`, `published_at`.
10. `idempotency_records`:
    - `key` (PK), `request_hash`, `response_status`, `response_body` (JSON), `created_at`, `expires_at`.

---

## 5. Source-of-Truth Map

*(Detailed mapping available in [docs/source-of-truth-map.md](file:///c:/Users/siddh/Desktop/POPO%20-%20updrage/docs/source-of-truth-map.md))*

- **Authoritative Database Entities:** `evaluations`, `questions`, `evaluation_marks`, `rubrics`, `quality_signals`, `triage_cases`, `resolutions`, `audit_events`.
- **Pure Client Fixtures:** Candidate script answer text (`SCRIPT_ANSWERS`), rubric qualitative bands (`RUBRIC_CRITERIA`), user display names (`ACTOR_DISPLAY_NAMES`).
- **Secondary React State Risks:** `localMarks` in `EvaluationWorkspace.tsx` holds un-persisted mark drafts that are discarded if navigation occurs before clicking "Save Mark".

---

## 6. State Machine

### 6.1 Evaluation Lifecycle State Machine
```
   [DRAFT]
      │
      │ assignMark()
      ▼
 [IN_PROGRESS] ◄────┐
      │             │ assignMark() (edit)
      │             └─────┘
      │ submit() (requires DRAFT or IN_PROGRESS)
      ▼
  [SUBMITTED] ────────► [FINALIZED] (via moderation/system)
   (LOCKED: assignMark throws EvaluationLockedError)
```

- **Invariant:** Once `status === 'SUBMITTED'`, all mark updates throw `EvaluationLockedError`.
- **Asymmetry:** Backend `submit()` allows incomplete evaluations to be submitted and creates a `COMPLETENESS_PARTIAL` signal, but the frontend disables the submit button if `!completeness.isComplete`.

### 6.2 Triage Case Lifecycle State Machine
```
   [OPEN]
      │
      │ assign()
      ▼
  [ASSIGNED]
      │
      │ resolve() (requires human MODERATOR or ADMIN)
      ▼
  [RESOLVED] (Terminal; locks case against further resolution)
```

---

## 7. API / Service Map

| Endpoint | Method | Fastify Handler | Application Service / Command | Status |
|:---|:---:|:---|:---|:---|
| `/api/v1/health` | GET | `healthRoutes` | Database connectivity & uptime check | Working |
| `/api/v1/evaluations` | GET | `evaluationRoutes` | `ListEvaluationsQueryHandler` | Working |
| `/api/v1/evaluations/:id` | GET | `evaluationRoutes` | `GetEvaluationByIdQueryHandler` | Working |
| `/api/v1/evaluations/:id/completeness` | GET | `evaluationRoutes` | `SubmissionCompletenessValidator` | Working |
| `/api/v1/evaluations/:id` | PATCH | `evaluationRoutes` | `AssignMarkHandler` | Working |
| `/api/v1/evaluations/:id/submit` | POST | `evaluationRoutes` | `SubmitEvaluationHandler` | Working |
| `/api/v1/triage-cases` | GET | `triageCaseRoutes` | `triageCaseRepo.list()` | Working |
| `/api/v1/triage-cases/:id` | GET | `triageCaseRoutes` | `triageCaseRepo.findById()` | Working |
| `/api/v1/triage-cases/:id/assign` | POST | `triageCaseRoutes` | `AssignTriageCaseHandler` | Working |
| `/api/v1/triage-cases/:id/resolve` | POST | `triageCaseRoutes` | `ResolveTriageCaseHandler` | Working |
| `/api/v1/quality-signals` | GET | `qualitySignalRoutes` | `qualitySignalRepo.findAll()` | Working |
| `/api/v1/quality-signals/:id` | GET | `qualitySignalRoutes` | `qualitySignalRepo.findById()` | Working |
| `/api/v1/ai/advisory` | POST | `aiRoutes` | `AiService.generateAdvisory` | Working (Ephemeral) |
| `/api/v1/analytics/quality-pulse` | GET | `analyticsRoutes` | `QualityPulseService.getQualityPulse` | Working |
| `/api/v1/analytics/evaluators` | GET | `analyticsRoutes` | `QualityAnalyticsService.computeEvaluatorMetrics` | Working |
| `/api/v1/analytics/sentinel/trigger`| POST | `analyticsRoutes` | `QualityPulseService.triggerSentinel` | Working |
| `/api/v1/audit-events` | GET | `auditEventRoutes` | `ListAuditEventsHandler` | Working |
| `/api/v1/demo/seed` | POST | `demoRoutes` | `DemoScenarioService.seedScenario` | Working |
| `/api/v1/demo/reset` | POST | `demoRoutes` | `DemoScenarioService.resetScenario` | Working |

---

## 8. Frontend State Map

| Component | State Variables | Source | Sync / Refresh Behavior |
|:---|:---|:---|:---|
| `App.tsx` | `auth: AuthContext` (`role`, `actorId`, `actorType`) | `Header.tsx` dropdown selector | In-memory React state; sent as headers in every API call. |
| `EvaluationWorkspace.tsx` | `evaluation: EvaluationResponse` | `GET /api/v1/evaluations/:id` | Refetched on mark save, submit, or 409 conflict reload. |
| `EvaluationWorkspace.tsx` | `localMarks: Record<qId, { awardedMarks, comments }>` | Local user input in scoring dock | **Unsaved draft state.** Discarded on unmount. |
| `EvaluationWorkspace.tsx` | `completeness: CompletenessResult` | `GET /api/v1/evaluations/:id/completeness` | Refetched after successful mark save. |
| `EscalationHub.tsx` | `cases: TriageCaseResponse[]` | `GET /api/v1/triage-cases` | Loaded on mount; refetched on case assignment/resolution. |
| `EscalationHub.tsx` | `selectedCase: TriageCaseResponse` | `GET /api/v1/triage-cases/:id` | Synced with route `:caseId`. |
| `TrustLensView.tsx` | `events: AuditEventResponse[]` | `GET /api/v1/audit-events` | Re-queried when entity filter or search query changes. |

---

## 9. Hardcoded Data Findings

*(Detailed forensic table available in [docs/hardcoded-data-audit.md](file:///c:/Users/siddh/Desktop/POPO%20-%20updrage/docs/hardcoded-data-audit.md))*

- **Severe Copy Contradictions:** `AdminDemoPage.tsx:98` and `AdminOverviewPage.tsx:143` declare the demo cohort to be "Mathematics", conflicting with the database's actual Computer Science `RUBRIC-CS-101`.
- **Fictional Personas:** `AdminDemoPage.tsx:254` references "Dr. Smith", who does not exist. Act 3 labels "Sarah Jenkins" as Chief Moderator, when she is actually `evaluator_1` (Examiner).
- **Static Content:** Student answer responses (`SCRIPT_ANSWERS`) and detailed rubric criteria (`RUBRIC_CRITERIA`) exist solely in client-side TypeScript fixtures.

---

## 10. Cross-Screen Consistency Findings

Tracing canonical evaluation `OSM-2026-CS101-0501` (`eval-demo-lenient-501`) across screens reveals:
1. **Examiner Queue:** Appears under `evaluator_lenient` with 3 questions, 85/100 points, `SUBMITTED`.
2. **Evaluation Workspace:** Loads correctly, inputs are locked (`Evaluation Locked`), score shows 85/100.
3. **Admin Demo Page:** Act 2 claims "Dr. Jane Smith deviating +16.7%". In reality, this script belongs to `evaluator_lenient` ("Dr. Adrian Foster"), whose deviation is +23.2%!
4. **Triage Case Detail:** Case `TC-DEMO-001` references `eval-demo-lenient-501`. Due to the `getScriptReference` bug, the header displays `OSM-2026-CS101-eval-demo-lenient-501` instead of `OSM-2026-CS101-0501`.
5. **QualityPulse Analytics:** The 85-point score correctly feeds the evaluator scoring average and standard deviation computations.
6. **TrustLens Audit:** Displays real `SUBMIT_EVALUATION` and `ASSIGN_MARK` events for this script.

---

## 11. Role / Identity Findings

The role-switching mechanism is entirely client-side:
- Changing the preset in `Header.tsx` updates `auth` state in `App.tsx`.
- The backend performs server-side role validation on every request by reading `x-user-role` and `x-actor-id`.
- **Desynchronization Hazard:** If a user logged in as `evaluator_1` opens an evaluation belonging to `evaluator_2`, the UI renders without warnings, but clicking "Save Mark" fails with HTTP 403 Forbidden because backend strictly enforces `evaluation.evaluatorId === command.evaluatorId`.

---

## 12. Examiner Flow Findings

- **Draft Mark Isolation:** Marks typed into input fields remain in `localMarks` React state and are NOT auto-saved.
- **Save Feedback:** Clicking "Save Mark" successfully updates SQLite, updates `total_score`, and displays a temporary "Saved ✓" indicator.
- **Submission CompleteCheck:** The submit button is strictly disabled if any question is unmarked.

---

## 13. Moderator Flow Findings

- **Case Claiming:** "Assign to Me" successfully transitions case status to `ASSIGNED` in SQLite and logs `ASSIGN_TRIAGE_CASE`.
- **AI Advisory:** Advisory generation executes via mock provider, returning structured recommendations. However, **no audit event is recorded**, and the recommendation is not saved in SQLite.
- **Resolution:** Recording resolution updates `triage_cases.status = 'RESOLVED'`, creates a record in `resolutions`, updates linked `quality_signals`, and writes an immutable audit record.

---

## 14. Analytics Findings

- **Real Computations:** `QualityPulseService` computes Total Booklets, Completion %, Clean Evaluation Rate, and Signal Counts dynamically from active SQLite records.
- **Formula:** Clean Evaluation Rate = $\max(0, 100 - (\text{flagged} / \text{total}) \times 100)$.
- **Evaluator Variance:** `QualityAnalyticsService` dynamically groups evaluations by evaluator, computes mean score, peer baseline, deviation percentage, and standard deviation ($\sigma$).

---

## 15. Audit Findings

- **Append-Only Ledger:** The `audit_events` table contains no update or delete routes.
- **Audited Commands:** `CreateEvaluation`, `AssignMark`, `SubmitEvaluation`, `CreateTriageCase`, `AssignTriageCase`, `ResolveTriageCase`, `SeedDemoCohort`, `ResetDemoCohort`.
- **Missing Audit Records:** `AiService.generateAdvisory` and `QualityPulseService.triggerSentinel` do NOT record audit events, despite the UI having defined labels for them.

---

## 16. Demo Control Findings

- **Seed Deterministic Cohort (`POST /api/v1/demo/seed`):** Idempotently writes `RUBRIC-CS-101`, 12 evaluations, 36 marks, 2 quality signals, 2 triage cases, and 1 resolution.
- **Reset Scenario (`POST /api/v1/demo/reset`):** Purges operational tables and resets evaluations to initial un-marked state. Retains audit ledger history.

---

## 17. Failure / Edge Case Findings

- **Out of Bounds Mark:** Caught client-side and server-side (`awardedMarks > maxMarks` rejected).
- **Concurrency Conflicts (409):** Handled gracefully with optimistic locking (`expectedVersion`).
- **Cross-Actor Editing (403):** Rejected by backend with `UnauthorizedActionError`.
- **Double Submission:** Rejected with `EvaluationLockedError`.

---

## 18. Security / Authorization Findings

- **Server-Side Enforcement:** Fastify routes verify role headers (`x-user-role`). Examiners are blocked from audit logs (`403 Forbidden`). AI actors are forbidden from submitting evaluations or resolving triage cases.
- **No Direct Token/Auth:** The system relies on header injection; there is no JWT, cookie, or session authentication layer.

---

## 19. UX Findings

- **Lack of Auto-Save:** High risk of examiner data loss.
- **No Keyboard Shortcuts:** High cognitive fatigue for high-throughput examiners.
- **Crowded Telemetry Cards:** Layout strains on viewports $< 1440\text{px}$.

---

## 20. Domain UX Findings

- **Statistical Variance vs. Error:** Red badges in evaluator deviation tables incorrectly imply examiner wrongdoing rather than observational sampling triggers.
- **Non-Authoritative AI:** AI advisories correctly include disclaimers, but need stronger inline rubric citations.

---

## 21. Critical Bugs

1. **Math vs. Computer Science UI Incoherence:** Admin pages display "Mathematics" and "rubric-math-2026", directly contradicting the database seed (`RUBRIC-CS-101`).
2. **Persona Role Inversion in Act 3:** Admin copy names "Sarah Jenkins" as Chief Moderator, when she is an Examiner (`evaluator_1`).
3. **Script Reference Bug in Triage Detail (`TriageCaseDetail.tsx:84`):** Passes `evaluationId` instead of `scriptId`, corrupting candidate display references.
4. **Missing Audit Logging for AI & Sentinel:** Backend fails to record audit events for advisory generation and anomaly scans.

---

## 22. Architectural Weaknesses

1. **No Backend Persistence for Student Answers:** Candidate answer text is hardcoded in a frontend fixture file (`scriptReferences.ts`).
2. **No User / Account Table:** Actors exist only as string IDs and client fixture names.
3. **Dual Source of Truth in Marking Workspace:** `localMarks` React state operates independently of database persistence until explicit button click.

---

## 23. Medium Issues

1. **Database Engine Display:** Admin Overview claims `better-sqlite3`, while code uses `node:sqlite`.
2. **Ephemeral AI Advisory:** AI advisory output is lost on page refresh.
3. **No Unsaved Changes Warning:** Navigating away from an active evaluation with unsaved marks does not prompt the user.

---

## 24. Cosmetic Issues

1. Monospace `<pre>` answer formatting looks like a developer console rather than an exam booklet.
2. Inconsistent button styling and alignment across modal dialogs.
3. Color contrast issues with muted text on dark slate backgrounds.

---

## 25. Recommended Fix Order

1. **Phase A — Fix Critical Copy & Bug Incoherencies (Zero architecture risk):**
   - Correct `AdminDemoPage.tsx` and `AdminOverviewPage.tsx` copy to Computer Science (`CS-101`, `RUBRIC-CS-101`).
   - Fix persona roles in demo script (Dr. Sarah Jenkins = Examiner; Prof. Marcus Vance = Chief Moderator).
   - Fix `TriageCaseDetail.tsx:84` to pass `triageCase.scriptId` (or resolve script from evaluation).
2. **Phase B — Close Audit & Persistence Gaps:**
   - Add audit event recording to `AiService.generateAdvisory` (`GENERATE_AI_ADVISORY`).
   - Add audit event recording to `QualityPulseService.triggerSentinel` (`TRIGGER_SENTINEL`).
   - Persist AI advisory outputs to database or triage case metadata.
3. **Phase C — Resolve Frontend Dual Source-of-Truth & Auto-Save:**
   - Implement debounced auto-save or an unmistakable dirty draft state indicator in `EvaluationWorkspace`.
   - Add browser `beforeunload` warning when `localMarks` contains unsaved edits.
4. **Phase D — UI/UX & Design System Redesign:**
   - Execute the complete redesign plan outlined in `docs/ui-ux-redesign-input.md`.
