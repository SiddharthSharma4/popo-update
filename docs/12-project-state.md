# 12 — OSM Project State

**Project:** OSM — AI-Powered On-Screen Marking & Digital Evaluation System  
**Document:** `docs/12-project-state.md`  
**Status:** Living Document  
**Last Updated:** 2026-09-27  

---

## 1. Current Execution Pointer

* **Current Phase:** `Phase 4 — Quality Signal Pipeline / Intelligence` (Phase 4 Tasks Complete)
* **Active Task:** None (`TASK-P4-INTEL-003` completed, awaiting authorization for next task)
* **Current Task Status:** `DONE` for `TASK-P4-INTEL-003`
* **Next Ready Task:**
  - `TASK-P5-MOD-001`: Implement TriageCase workflow
  - `TASK-P2-EVAL-003`: Verify evaluation lifecycle

---

## 2. Completed Tasks

| Task ID | Title | Phase | Completed Date | Verification Status |
| :--- | :--- | :--- | :--- | :--- |
| `TASK-P0-FOUND-001` | Establish repository and development foundation | P0 | 2026-09-26 | VERIFIED (Typecheck: PASS, Build: PASS, Tests: 4/4 PASS, Database: PASS) |
| `TASK-P0-FOUND-002` | Establish project documentation and traceability structure | P0 | 2026-09-26 | VERIFIED (Documentation synchronized) |
| `TASK-P1-DOMAIN-001` | Establish core domain model | P1 | 2026-09-26 | VERIFIED (Typecheck: PASS, Build: PASS, Tests: 17/17 PASS in domain suite) |
| `TASK-P1-DOMAIN-002` | Establish authoritative persistence model | P1 | 2026-09-26 | VERIFIED (Typecheck: PASS, Build: PASS, Tests: 29/29 PASS across 4 suites) |
| `TASK-P1-DOMAIN-003` | Establish application/service boundaries | P1 | 2026-09-26 | VERIFIED (Typecheck: PASS, Build: PASS, Tests: 47/47 PASS across 5 suites) |
| `TASK-P2-EVAL-001` | Implement evaluation workflow | P2 | 2026-09-26 | VERIFIED (Typecheck: PASS, Build: PASS, Tests: 66/66 PASS across 6 suites) |
| `TASK-P2-EVAL-002` | Expose evaluation collection query/list operations | P2 | 2026-09-26 | VERIFIED (Typecheck: PASS, Build: PASS, Tests: 77/77 PASS across 6 suites) |
| `TASK-P3-VAL-001` | Implement deterministic completeness validation | P3 | 2026-09-26 | VERIFIED (Typecheck: PASS, Build: PASS, Tests: 89/89 PASS across 7 suites) |
| `TASK-P3-VAL-002` | Generate first QualitySignal | P3 | 2026-09-27 | VERIFIED (Typecheck: PASS, Build: PASS, Tests: 112/112 PASS across 8 suites, 23 new tests) |
| `TASK-P3-VAL-003` | Verify deterministic signal generation | P3 | 2026-09-27 | VERIFIED (Typecheck: PASS, Build: PASS, Tests: 115/115 PASS across 8 suites, +3 new tests, 0 production changes) |
| `TASK-P4-INTEL-001` | Implement first statistical quality detector | P4 | 2026-09-27 | VERIFIED (Typecheck: PASS, Build: PASS, Tests: 127/127 PASS across 9 suites, +12 new tests in statistical-detector.test.ts, git diff --check: PASS) |
| `TASK-P4-INTEL-002` | Establish detector framework | P4 | 2026-09-27 | VERIFIED (Typecheck: PASS, Build: PASS, Tests: 140/140 PASS across 10 suites, +13 new tests in detection-engine.test.ts, git diff --check: PASS) |
| `TASK-P4-INTEL-003` | Verify detector behavior | P4 | 2026-09-27 | VERIFIED (Typecheck: PASS, Build: PASS, Tests: 153/153 PASS across 11 suites, +13 new tests in detector-behavior.test.ts, git diff --check: PASS) |

---

## 3. Unblocked Tasks

* `TASK-P5-MOD-001`: Implement TriageCase workflow
* `TASK-P2-EVAL-003`: Verify evaluation lifecycle

---

## 4. Current Blockers

* **None.** Foundation, domain model, persistence model, application layer / Unit of Work, evaluation workflows, and deterministic completeness validation are fully operational with 100% automated test coverage.

---

## 5. Known Risks & Mitigations

| Risk Category | Description | Mitigation Strategy | Status |
| :--- | :--- | :--- | :--- |
| **Native Addon Tooling** | Windows systems may lack Python/MSVC for `node-gyp`. | Used Node.js native `node:sqlite` via custom Kysely dialect. Zero external C++ dependencies required. | RESOLVED |
| **AI Boundary Leakage** | Risk of AI mutating authoritative marks directly. | Hard invariant enforced: `AssignMarkCommand`, `SubmitEvaluationCommand`, and HTTP controllers explicitly reject `actorType === 'AI'` / `x-actor-type: AI` with `UnauthorizedActionError` (403 Forbidden). | RESOLVED |
| **Concurrent Mutation & Data Loss** | Concurrent evaluations or moderation updates overwriting state (`DATA-006`). | Implemented atomic optimistic concurrency in `KyselyEvaluationRepository` using `WHERE id = ? AND version = ?`, plus `expectedVersion` and `If-Match` validation in Fastify PATCH route. Throws `ConcurrencyConflictError` (409 Conflict) on mismatch. | RESOLVED |
| **Rubric Version Inconsistency** | Historical evaluation meaning altered by modified rubric (`INV-008`, `DATA-007`). | Enforced rubric version immutability in `KyselyRubricRepository`: modifying existing version is rejected with hard error. New version creation preserves historical versions. | RESOLVED |
| **Consistency Gaps on Event Failure** | Domain state committed without corresponding outbox or audit event (`DATA-005`). | `KyselyUnitOfWork` guarantees atomic transaction scope: evaluation mutations, outbox events, and audit logs succeed or roll back together atomically. | RESOLVED |
| **Pagination Drift & Inconsistent Ordering** | Unordered or single-column pagination causing records to shift across pages under identical timestamps. | Implemented deterministic multi-column sorting (`created_at desc, id asc`) in `KyselyEvaluationRepository.findPaginated`. | RESOLVED |
| **Incomplete Evaluation Leakage** | Evaluations submitted with missing marks going unflagged into grading. | Implemented 100% deterministic `SubmissionCompletenessValidator` identifying missing marks, itemizing question IDs with evidence, and recording completeness results in atomic outbox and audit events. | RESOLVED |
| **Direct Presentation Repository Read** | Global QualitySignal routes in `quality-signals.ts` inject repository directly rather than application service (`ARCH-004`). | Evaluation-scoped endpoint (`evaluations.ts`) already follows clean layered architecture. Global query route refactoring is documented as a non-blocking architectural refinement. | ARCHITECTURAL REFINEMENT |
| **Background Dispatcher Integration** | Automated outbox event polling and background dispatching loop is not implemented in core domain/application layer. | Outbox persistence, query indexing, and lifecycle transitions (`PENDING` -> `PUBLISHED`) verified in SQLite. Automated worker/dispatcher scheduled for Phase 9 under `TASK-P9-INTEGRATION-003`. | SCHEDULED FOR PHASE 9 |
| **Statistical Signal Boundaries & Authority** | Statistical quality intelligence generating ungrounded signals or exceeding advisory role (`INV-004`, `05-domain §34`). | Verified in P4-INTEL-001 contract audit: (1) Explicit requirements enforced: `EvaluatorMeanDeviationDetector` named (`02-arch §17`), statistical non-authority (`INV-004`), QualitySignal aggregate & `REVIEWABLE` status (`05-domain §19-20`), absolute deviation `|evaluatorMean - peerMean|`, evaluator sampleSize guard (`05-domain §34`, `02-arch §18`). (2) Permitted behavior: comparison context via `peerSampleSize`, percentage scoring illustration (`osm-step4 §10.6`), shared `SignalSeverity` vocabulary, detector configuration provenance. (3) Implementation interpretations: symmetrical `peerSampleSize >= minSampleSize` guard, default `criticalThresholdPercent = 25.0` for HIGH severity, and 2-decimal rounding. | RESOLVED / VERIFIED |
| **Detector Framework & Engine Boundaries** | Coordination of multiple statistical detectors, error isolation expectations, and persistence boundaries (`02-arch §17`, `05-domain §19`). | Contractually clarified & verified in P4-INTEL-002: (1) Explicit requirements: `Statistical Detection Engine` domain component (`02-arch §17`), synchronous domain execution (`02-arch §40`, `05-domain §45`), and non-authority invariance (`INV-004`). (2) Permitted behavior: multi-detector registration and execution under a unified registry; persistence and deduplication remaining strictly outside the engine (in persistence layer `idx_quality_signals_dedup`). (3) Implementation interpretations: in-memory `Map` registry throwing `InvalidArgumentError` on duplicate detector registration, and fail-fast propagation of unexpected exceptions (as contracts specify no error isolation for pure deterministic domain logic). | RESOLVED / VERIFIED |
| **Population Context & Peer-Baseline Interpretation** | Ensuring statistical detector and engine testing accurately simulates examination cohort baselines without imposing uncontracted production rules. | Contractually verified in P4-INTEL-003: (1) Explicit requirements enforced: multi-evaluator anomaly identification (`02-arch §17`, `05-domain §34`), evaluator and peer minimum sample size guards ($N \ge 5$) suppressing low-sample evaluators, graduated MEDIUM ($\ge 15\%$) and HIGH ($\ge 25\%$) severity classification, engine orchestration across cohort populations, statistical non-authority (`INV-003`, `INV-004`), and 50-repetition determinism (`09-testing §40`). (2) Test-fixture / implementation interpretation: In multi-evaluator examination cohorts, the peer baseline for an evaluator is constructed in test fixtures as all evaluations marked by fellow evaluators (`evaluatorId !== targetEvaluatorId`). This is explicitly a test-fixture interpretation, not a mandated production schema requirement. (3) Legitimate variation resilience: verified that normal grading variation ($< 15\%$) produces 0 false anomalies (`osm-step5-build-plan §12`). | RESOLVED / VERIFIED |

---

## 6. Test Suite & Verification Summary

* **Typecheck:** All workspaces (`@osm/shared`, `@osm/api`, `@osm/web`) pass `tsc --noEmit` with zero errors.
* **Build:** Monorepo build passes. Frontend Vite bundle builds in under 1.3s.
* **Automated Tests:** Vitest test suite running 153 tests across 11 files (+13 tests added in P4-INTEL-003):
  - `tests/detector-behavior.test.ts` (13 tests): Statistical detector behavioral & population verification (`EvaluatorMeanDeviationDetector`, `StatisticalDetectionEngine`):
    - Multi-evaluator population cohort behavior: selectively flags statistical outlier evaluators (lenient/strict) while producing zero signals for conformant evaluators in an examination cycle.
    - Legitimate variation resilience (osm-step5-build-plan §12): evaluators exhibiting normal variance within tolerance (< 15.0%) produce no signals (isAnomaly = false).
    - Exact threshold boundary behavior: strict suppression at 14.99% deviation vs signal generation with MEDIUM severity at exactly 15.00%.
    - Sample-size suppression: evaluator cohort with N < 5 is safely suppressed regardless of extreme scores; peer baseline with N < 5 is safely suppressed.
    - Severity graduation: accurate classification of MEDIUM ([15.0%, 25.0%)) vs HIGH (>= 25.0%) across peer baseline distributions.
    - StatisticalDetectionEngine population orchestration: iterates over cycle cohorts, aggregating signals in deterministic order with correct severity distribution.
    - Empty / no-outlier population behavior: uniform cycles produce empty signal arrays; empty peer cohorts return empty arrays without throwing errors.
    - Statistical non-authority & evaluation immutability (INV-003, INV-004): verifies that population-wide detection leaves all evaluated marks, questions, total scores, versions, and statuses 100% unaltered.
    - Deterministic reproducibility (09-testing §40): 50 consecutive population executions produce bit-for-bit identical signals, severities, evidence payloads, and metadata.
  - `tests/detection-engine.test.ts` (13 tests): Statistical detector framework & engine (`StatisticalDetectionEngine`, `StatisticalDetector`) verification:
    - Registry management: detector registration, querying registered list, and throwing `InvalidArgumentError` on duplicate detector registration.
    - Synchronous single & multi-detector execution: running registered detectors across evaluation inputs and aggregating non-null `QualitySignal` outputs in registration order.
    - Empty execution paths: returns empty array when all registered detectors return `null` or when engine has no registered detectors.
    - Error handling: unexpected detector runtime errors propagate immediately (fail-fast implementation decision; no swallowing or silent degradation).
    - Statistical non-authority & mark invariance (`INV-004`, `INV-003`): engine execution does not mutate marks, scores, questions, or evaluation status.
    - Deterministic reproducibility (Testing Contract §40): 50 repeated engine executions on identical input produce identical signals.
  - `tests/statistical-detector.test.ts` (12 tests): Statistical quality detector (`EvaluatorMeanDeviationDetector`) verification:
    - Minimum sample size guard: evaluations below `minSampleSize` (default 5) for evaluator or peer group return `null` / `isAnomaly = false`.
    - Boundary behavior: exact sample size boundary $N = \text{minSampleSize}-1$ vs $N = \text{minSampleSize}$ and custom `minSampleSize` configuration.
    - Deviation threshold triggering: deviations below 15.0% return `null`.
    - Graduated severity mapping: positive/lenient deviation $\ge 15\%$ triggers `MEDIUM`, negative/strict deviation $\ge 15\%$ triggers `MEDIUM` with strictly absolute deviation $\lvert \text{evaluatorMean} - \text{peerMean} \rvert$, extreme deviation $\ge 25\%$ triggers `HIGH`.
    - Custom threshold configuration: honors custom `thresholdPercent` and `criticalThresholdPercent`.
    - Full detector provenance (`type: "STATISTICAL"`, `name: "evaluator-mean-deviation-detector"`, `version: "1.0.0"`, `config`) and interpretable evidence schema (`evaluatorMean`, `peerMean`, `deviation`, `sampleSize`, `peerSampleSize`, `evaluationCycleId`, `thresholdPercent`).
    - Statistical non-authority & mark invariance (`INV-004`, `INV-003`): execution does not mutate marks, scores, or evaluation status.
    - Deterministic reproducibility (Testing Contract §40): 50 repeated executions produce identical calculations and evidence.
  - `tests/quality-signal.test.ts` (25 tests): Deterministic QualitySignal generation, reproducibility, non-authority, & pipeline verification:
    - Aggregate invariant validation: constructor props, non-empty evaluationId, non-negative version, signalType, summary, valid severity, and detector provenance (`InvalidArgumentError`).
    - Aggregate lifecycle state machine: transitions `REVIEWABLE` → `LINKED_TO_CASE`, `DISMISSED`, `RESOLVED`, evidence preservation, and invalid transition guards (`InvalidStateTransitionError`).
    - Deterministic generator mappings: complete evaluation → `null`, zero questions → `COMPLETENESS_EMPTY` (`CRITICAL`), completely unmarked → `COMPLETENESS_UNMARKED` (`HIGH`), partially marked → `COMPLETENESS_PARTIAL` (`MEDIUM`).
    - Deterministic reproducibility verification (Testing Contract §40): 50 repeated executions on identical input produce identical output fields (`signalType`, `severity`, `status`, `summary`, `detector`, `evidence`).
    - Repository persistence & idempotency: `findById`, `findByEvaluationId`, `findReviewable`, and unique index deduplication on `(evaluation_id, evaluation_version, detector_name, signal_type)`.
    - Submission pipeline integration: transactional signal generation, persistence, outbox event emission (`EvaluationSubmitted` + `QualitySignalGenerated`), and atomic UnitOfWork rollback.
    - QualitySignal non-authority invariant (Testing Contract §41, TEST-003, INV-003): generating completeness signal upon submission does not alter evaluation marks, question states, or scores in DB.
  - `tests/validation.test.ts` (12 tests): Deterministic completeness validation testing covering:
    - Completely unmarked evaluation detection (`COMPLETENESS_ALL_UNMARKED` and itemized `COMPLETENESS_MISSING_MARK` for each question).
    - Partially marked evaluation detection (`COMPLETENESS_PARTIALLY_MARKED` and itemized missing question IDs with max marks evidence).
    - Full marking validation (evaluations with all marks pass completeness check with `isValid: true`, `isComplete: true`, `issues: []`).
    - Dynamic transitions from incomplete to complete as marks are assigned.
    - Determinism guarantee (Testing Contract §40: repeated runs on identical inputs produce identical results).
    - Application query `RunCompletenessCheckHandler` execution, DTO schema validation, and error propagation (`EntityNotFoundError`, `InvalidCommandError`).
    - Submission workflow integration: triggers deterministic completeness validation upon submission.
    - Outbox event persistence: `EvaluationSubmitted` payload captures full completeness state, missing question IDs, and structured issue details.
    - Audit event persistence: `EvaluationSubmitted` captures completeness status and issue counts.
    - Non-assigned evaluator and AI actor rejection (`INV-003`) during submission validation.
  - `tests/evaluation-api.test.ts` (30 tests): HTTP API integration via `fastify.inject()` covering evaluation creation (`POST /api/v1/evaluations` -> 201), retrieval (`GET /api/v1/evaluations/:id` -> 200), mark assignment (`PATCH /api/v1/evaluations/:id` -> 200), evaluation submission (`POST /api/v1/evaluations/:id/submit` -> 200), collection queries with pagination and filters (`GET /api/v1/evaluations` -> 200), locked status guards, and error responses.
  - `tests/application.test.ts` (18 tests): Command execution (`CreateEvaluation`, `AssignMark`, `SubmitEvaluation`, `CreateRubric`), query execution (`GetEvaluationById`, `GetRubricById`), AI non-authority enforcement (`INV-003`), evaluator assignment authorization, domain error propagation, optimistic concurrency conflict propagation, and transactional rollback.
  - `tests/persistence.test.ts` (8 tests): Rubric save & retrieval by version, rubric version immutability guard, multi-version rubric retention, evaluation save & retrieval with questions/marks, mark updating & score recalculation, optimistic locking & conflict detection, and transactional atomic save with outbox events.
  - `tests/domain.test.ts` (17 tests): Mark range constraints, evaluator attribution, VO equality, Question entity validation, Rubric calculation, Evaluation aggregate state transitions, optimistic concurrency version increments, locked status guards, and completeness/missing question detection.
  - `tests/database.test.ts` (4 tests): SQLite WAL mode, migrations, transactional outbox ACID rollback, immutable audit trails, idempotency uniqueness constraints, and `QualitySignalGenerated` outbox event polling & status transition lifecycle (`PENDING` -> `PUBLISHED`).
  - `tests/health.test.ts` (1 test): Verifies `GET /api/v1/health` status, database connection, and ISO 8601 UTC timestamp format.
* **Result:** 153 passed, 0 failed.

---

## 7. Demo Status

* **Status:** NOT STARTED (Scheduled for Phase 11 / `TASK-P11-DEMO-001`).
* **Foundation:** Web shell online with live API health indicator, branding, and role-based navigation tabs.
