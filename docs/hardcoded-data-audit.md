# Hardcoded Data & Fixtures Forensic Audit

**Project:** EvalOS — AI Evaluation Intelligence & QA Layer for On-Screen Marking  
**Document Status:** Complete Forensic Inventory  
**Audit Target:** All Frontend, Backend, Fixture, and Database Seed Files  
**Date:** September 2026  

---

## 1. Classification Categories & Methodology

Each identified value has been strictly classified under the following taxonomies:
- **REAL CONSTANT:** Legitimate domain constant or standard configuration fallback that does not mask missing state.
- **DEMO FIXTURE:** Static client-side or server-side fixture intended specifically for presentation demonstration.
- **SEED DATA:** Deterministic database records inserted via canonical application services (`DemoScenarioService`).
- **CONFIGURATION:** Configurable system parameters or environment settings.
- **DERIVED VALUE:** Telemetry computed dynamically at runtime from database entities.
- **HARDCODED UI DATA:** Static copy, mock text, or labels embedded in JSX markup without dynamic bindings.
- **MOCK DATA:** Synthetic mock implementations standing in place of real services or providers.
- **TEMPORARY FALLBACK:** Client or server fallback logic triggered when dynamic lookup fails.
- **BUG:** Value, mapping, or copy that is actively contradictory, misleading, or factually incorrect relative to canonical database state.

---

## 2. Hardcoded Data Inventory Table

| Location | Hardcoded Value | Category | Current Purpose | Correct Source of Truth | Severity |
|:---|:---|:---|:---|:---|:---|
| `apps/web/src/fixtures/scriptReferences.ts:16-58` | `SCRIPT_REFERENCES` dictionary (`SCRIPT-DEMO-101` → `OSM-2026-CS101-0101`, `Candidate #OSM-2026-CS101-0101`, `Computer Science: Systems & Algorithms`, `CS-101`) | **DEMO FIXTURE** | Provides candidate anonymization label, human-readable script barcode reference, module code, and subject title for demo scripts. | Should be joined from Examination Cycle / Script Metadata table in SQLite (`scripts` or `examination_cycles`). | **HIGH** |
| `apps/web/src/fixtures/scriptReferences.ts:70-76` | Fallback regex generator `OSM-2026-CS101-${numPart}` | **TEMPORARY FALLBACK** | Prevents blank UI when rendering dynamic script IDs not in the static map. | Backend Script / Examination API metadata endpoint (`GET /api/v1/scripts/:id`). | **MEDIUM** |
| `apps/web/src/fixtures/scriptReferences.ts:98-209` | `RUBRIC_CRITERIA` dictionary (`crit-1`, `crit-2`, `crit-3` level descriptions: Exemplary, Proficient, Developing, Beginning, Unattempted) | **DEMO FIXTURE** / **MOCK DATA** | Renders detailed rubric criterion cards, point bands, and qualitative descriptors in examiner marking workspace. | `rubrics.criteria` JSON column in SQLite database (`RubricsTable`). | **HIGH** |
| `apps/web/src/fixtures/scriptReferences.ts:221-232` | `getRubricCriterion` mathematical percent fallbacks (90%, 70%, 40%) | **TEMPORARY FALLBACK** | Generates synthetic rubric bands if criterion ID is not recognized. | Server-side Rubric entity levels (`Rubric.criteria`). | **LOW** |
| `apps/web/src/fixtures/scriptReferences.ts:240-292` | `SCRIPT_ANSWERS` dictionary (`SCRIPT-DEMO-101`, `SCRIPT-DEMO-201`, `SCRIPT-DEMO-501` student answers for q1, q2, q3) | **DEMO FIXTURE** / **MOCK DATA** | Displays student's written examination answer text in left pane of evaluation workspace. | Examination Script Repository / Digitized Answer Sheet OCR storage table (`script_pages` or `script_answers`). | **CRITICAL** |
| `apps/web/src/fixtures/scriptReferences.ts:300-305` | Generic candidate fallback text (`"Candidate response demonstrates algorithm design..."`) | **TEMPORARY FALLBACK** | Renders fake answers for any dynamically created evaluation scripts. | Actual digitized/OCR response text from backend database. | **HIGH** |
| `apps/web/src/services/actor-fixtures.ts:10-19` | `ACTOR_DISPLAY_NAMES` (`evaluator_1` → "Dr. Sarah Jenkins", `evaluator_lenient` → "Dr. Adrian Foster", `moderator_1` → "Prof. Marcus Vance", `admin_1` → "Examination Controller") | **DEMO FIXTURE** | Resolves raw UUID/actor IDs to academic honorifics and human names in headers, tables, and audit logs. | `users` or `actors` table in database with role and profile associations. | **HIGH** |
| `apps/web/src/fixtures/auditActionLabels.ts:20-80` | `AUDIT_ACTION_MAP` (Labels, badge colors, and unicode icons for 12 action verbs) | **REAL CONSTANT** | Formats raw audit action enum strings into readable institutional timeline badges. | UI design token mapping based on `@osm/shared` audit event definitions. | **LOW** (Safe) |
| `apps/web/src/fixtures/auditActionLabels.ts:60-64` | `GENERATE_AI_ADVISORY: { label: "AI Advisory Generated", ... }` | **BUG** | Maps audit UI formatting for AI advisory generation. | Unused/misleading because backend `AiService.generateAdvisory` does not record audit events to database! | **HIGH** |
| `apps/web/src/fixtures/auditActionLabels.ts:65-69` | `TRIGGER_SENTINEL: { label: "Sentinel Scan Run", ... }` | **BUG** | Maps audit UI formatting for Sentinel anomaly scans. | Unused/misleading because backend `QualityPulseService.triggerSentinel` does not write audit records. | **HIGH** |
| `apps/web/src/components/pages/AdminDemoPage.tsx:98` | `"Scenario: Spring 2026 Mathematics (Golden Path)"` | **HARDCODED UI DATA** / **BUG** | Informational pill on Admin Orchestration page. | Directly contradicts database seed data, which is Computer Science `RUBRIC-CS-101` and `CS-101`! | **CRITICAL** |
| `apps/web/src/components/pages/AdminDemoPage.tsx:104` | `"Rubric ID: rubric-math-2026"` | **HARDCODED UI DATA** / **BUG** | Informational pill displaying active rubric. | Directly contradicts database seed, which creates `RUBRIC-CS-101`. | **CRITICAL** |
| `apps/web/src/components/pages/AdminDemoPage.tsx:254` | `"Persona: Dr. Smith (Examiner)"` | **HARDCODED UI DATA** / **BUG** | Act 1 card footer persona description. | In `actor-fixtures.ts`, `evaluator_1` is Dr. Sarah Jenkins. "Dr. Smith" does not exist in any database or fixture. | **MEDIUM** |
| `apps/web/src/components/pages/AdminDemoPage.tsx:272` | `"Dr. Jane Smith deviating +16.7% above cohort mean"` | **HARDCODED UI DATA** / **BUG** | Act 2 card description of anomaly detection. | In database seed, the deviant evaluator is `evaluator_lenient` (Dr. Adrian Foster), whose mathematical deviation is +23.2%! | **HIGH** |
| `apps/web/src/components/pages/AdminDemoPage.tsx:300` | `"Persona: Sarah Jenkins (Chief Moderator)"` | **HARDCODED UI DATA** / **BUG** | Act 3 card footer persona description. | Direct persona role inversion: `evaluator_1` (Dr. Sarah Jenkins) is an Examiner; Chief Moderator is `moderator_1` (Prof. Marcus Vance). | **CRITICAL** |
| `apps/web/src/components/pages/AdminOverviewPage.tsx:143` | `"Spring 2026 Mathematics Examination Cohort"` | **HARDCODED UI DATA** / **BUG** | System Overview cohort description card. | Contradicts actual database seed data (`Computer Science: Systems & Algorithms CS-101`). | **HIGH** |
| `apps/web/src/components/pages/AdminOverviewPage.tsx:242` | `"Engine: better-sqlite3 / WAL"` | **HARDCODED UI DATA** / **BUG** | Architecture telemetry card in Admin Overview. | Factually incorrect runtime information: API runtime uses Node native `node:sqlite` (`DatabaseSync`), NOT `better-sqlite3`. | **MEDIUM** |
| `apps/web/src/components/escalation/TriageCaseDetail.tsx:84` | `getScriptReference(triageCase.evaluationId)` | **BUG** | Triage case detail header script display. | Function expects `scriptId` (`SCRIPT-DEMO-501`), but `triageCase.evaluationId` (`eval-demo-lenient-501`) is passed, triggering fallback and outputting `OSM-2026-CS101-eval-demo-lenient-501`. | **HIGH** |
| `apps/web/src/components/evaluation/EvaluationWorkspace.tsx:505` | `"DEPARTMENT OF COMPUTING & SYSTEMS"` | **HARDCODED UI DATA** | Exam booklet header markup in left pane. | Academic department name in Examination Cycle database record. | **LOW** |
| `apps/web/src/components/evaluation/EvaluationWorkspace.tsx:515` | `"Session: Spring 2026 Examination"` | **HARDCODED UI DATA** | Exam booklet session label. | Examination Cycle record (`evaluationCycle.sessionName`). | **LOW** |
| `apps/web/src/components/layout/Header.tsx:29-56` | Role preset options: `evaluator_1`, `evaluator_lenient`, `moderator_1`, `admin_1` | **DEMO FIXTURE** | Demo persona dropdown switcher in navigation bar. | Should be authenticated user sessions or dynamically populated from active demo actors. | **MEDIUM** |
| `apps/api/src/application/demo/demo-scenario.service.ts:39-40` | `CANONICAL_DEMO_RUBRIC_ID = "RUBRIC-CS-101"`, `CANONICAL_DEMO_CYCLE_ID = "cycle-2026-demo"` | **CONFIGURATION** / **SEED DATA** | Deterministic primary keys for database seed idempotent reconciliation. | Legitimate deterministic demo configuration constants. | **LOW** (Safe) |
| `apps/api/src/application/demo/demo-scenario.service.ts:167-270` | 12 Hardcoded evaluation seed records (`eval-demo-incomplete`, `eval-demo-complete-1..3`, `eval-demo-peer-201..204`, `eval-demo-lenient-501..505`) | **SEED DATA** | Seeds deterministic SQLite records for evaluation workflow and anomaly detection. | Canonical seed fixture; accurately persisted into SQLite tables on seed execution. | **LOW** (Safe) |
| `apps/api/src/infrastructure/ai/mock-ai-provider.ts:25-95` | Static deterministic mock AI recommendation templates (`"Marks awarded for question 1 appear statistically elevated relative to rubric band..."`) | **MOCK DATA** | Simulates external AI LLM provider without network latency or external API keys. | Real LLM Provider (Anthropic/Gemini/OpenAI) adapter adhering to `AiProvider` interface. | **MEDIUM** |
| `apps/api/src/domain/quality-signal/evaluator-mean-deviation-detector.ts:23-28` | Thresholds: `minSampleSize = 5`, `thresholdPercent = 15.0`, `criticalThresholdPercent = 25.0` | **CONFIGURATION** / **REAL CONSTANT** | Statistical boundary thresholds for SentinelFlag anomaly classification. | Examination Quality Policy configuration. | **LOW** (Safe) |
| `apps/web/src/components/evaluation/EvaluationWorkspace.tsx:220` | Default comment fallback: `"Scored against official rubric criteria"` | **REAL CONSTANT** | Populates comment field if examiner submits mark without text notes. | Legitimate UX fallback. | **LOW** (Safe) |

---

## 3. Summary of Discrepancies & False Telemetry

1. **Mathematics vs. Computer Science UI Schism:**
   - The SQLite database seed, question prompts, rubric criteria, and candidate answers are **100% Computer Science** (`CS-101`, AVL Trees, SOLID principles, SQL transactions).
   - In contrast, `AdminDemoPage.tsx` and `AdminOverviewPage.tsx` hardcode the scenario as `"Spring 2026 Mathematics"` with `"Rubric ID: rubric-math-2026"`.
2. **Actor Identity Contradictions:**
   - `AdminDemoPage.tsx:254` introduces a fictional `"Dr. Smith"`, while `actor-fixtures.ts` maps `evaluator_1` to `"Dr. Sarah Jenkins"`.
   - `AdminDemoPage.tsx:300` labels `"Sarah Jenkins"` as `"Chief Moderator"`, which completely inverts the system's role assignments (she is `evaluator_1`, an Examiner; Chief Moderator is `moderator_1`, `"Prof. Marcus Vance"`).
3. **Database Engine Misrepresentation:**
   - `AdminOverviewPage.tsx:242` states the database engine is `better-sqlite3`, while the codebase was intentionally refactored to use Node's native `node:sqlite` (`DatabaseSync`).
4. **Un-audited "Audit Actions":**
   - The UI defines action badges and labels for `GENERATE_AI_ADVISORY` and `TRIGGER_SENTINEL`, but neither of these backend operations writes to the `audit_events` database table.
