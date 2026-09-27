# OSM — Hackathon Demo Guide & System Walkthrough

**Project:** OSM — AI-Powered On-Screen Marking & Digital Examination Evaluation Platform  
**Document:** `docs/demo/HACKATHON-DEMO-GUIDE.md`  
**Purpose:** Canonical hackathon presentation, judge demonstration script, AI boundary specification, and verification overview.  
**Status:** Active — Hackathon Freeze  
**Governing Contracts:** `docs/contracts/10-demo-contract.md`, `docs/contracts/01-product-contract.md`, `docs/contracts/02-architecture-contract.md`

---

# 1. Executive Summary & Problem Context

State examination boards and major universities in India and globally process millions of handwritten answer booklets across concentrated 30-day evaluation windows. Traditional on-screen marking (OSM) systems suffer from four systemic vulnerabilities:
1. **Unchecked Answers:** Examiners accidentally skip pages or questions under fatigue, leading to post-result litigation, court mandates, and public embarrassment.
2. **Examiner Drift & Leniency/Strictness Outliers:** Evaluator variance distorts standardized grading without early-warning signals for examination controllers.
3. **Black-Box AI Replacement Risks:** Reckless attempts to replace human evaluators with autonomous LLMs fail legally, ethically, and academically due to hallucinations, lack of DPDP Act compliance, and absence of human accountability.
4. **Fragile Audit Trails:** Absence of append-only, tamper-evident audit logs leaves academic institutions defenseless against integrity disputes.

**OSM** solves this not by replacing the human examiner, but by wrapping the evaluation lifecycle in a **continuous quality and audit harness**:
- **Deterministic Evaluation Workspace:** Real-time rubric alignment, draft auto-saving, and strict server-side completeness validation.
- **QualityPulse Analytics:** Statistical cohort-level outlier detection ($z$-score analysis) identifying examiner bias and anomalies in real time.
- **EscalationHub & Human-in-the-Loop Moderation:** Formal triage case management where moderators make final academic determinations.
- **Non-Authoritative AI Advisory:** Structured, explainable AI recommendations that assist human moderators with evidence pointers while strictly prohibited from altering marks or operational state.
- **TrustLens Audit Trail:** Append-only, tamper-evident recording of every evaluation, mark assignment, moderation decision, and administrative action.

---

# 2. Canonical Demo Scenario Story (12 Steps)

The standard demonstration executes the following deterministic 12-step journey:

```text
1. Administrator Seeds Canonical Demo Cohort (POST /api/v1/demo/seed)
       ↓
2. Examiner EXAM-003 Opens Incomplete Evaluation (eval-demo-010)
       ↓
3. Examiner Attempts Premature Submission (POST /api/v1/evaluations/eval-demo-010/submit)
       ↓
4. CompleteCheck Guard Rejects Submission with HTTP 422 (Missing Q3 Mark)
       ↓
5. Examiner Completes Evaluation Workspace (Enters Q3 = 9 Marks)
       ↓
6. Examiner Submits Evaluation (Status -> SUBMITTED, Score = 24/30)
       ↓
7. Post-Submission Lock Enforced (HTTP 409 EVALUATION_LOCKED on Edit Attempts)
       ↓
8. QualityPulse Cohort Analytics Flags Examiner EXAM-002 as Leniency Outlier (z = +2.61)
       ↓
9. Moderator Opens EscalationHub & Inspects Triage Case (tc-demo-001)
       ↓
10. Moderator Requests AI Advisory (Receives Structured Evidence & Recommendations)
       ↓
11. Moderator Independently Resolves Case with Mandatory Human Rationale
       ↓
12. TrustLens Displays Verifiable Audit Trail (Preserved Across Demo Resets)
```

---

# 3. Canonical Demo Personas

| Persona ID | Display Name | Role | Demo Purpose & Observable Behavior |
| :--- | :--- | :--- | :--- |
| `ADMIN-001` | **System Administrator** | `ADMIN` | Controls demo environment lifecycle; executes deterministic seed (`POST /api/v1/demo/seed`) and demo reset (`POST /api/v1/demo/reset`). Proves server-side RBAC restriction. |
| `EXAM-001` | **Dr. Aris Thorne (Calibrated)** | `EXAMINER` | Baseline calibrated examiner; evaluated 5 booklets (`eval-demo-001` to `005`) with mean mark 20.8/30. Forms the statistical cohort baseline. |
| `EXAM-002` | **Prof. Elena Vance (Outlier)** | `EXAMINER` | Leniency outlier examiner; evaluated 4 booklets (`eval-demo-006` to `009`) with mean mark 27.5/30 ($z$-score $+2.61 > 2.0$). Triggers QualityPulse anomaly detection. |
| `EXAM-003` | **Marcus Reed (Active/Incomplete)** | `EXAMINER` | Active examiner with 3 booklets; owns `eval-demo-010` in `IN_PROGRESS` state with missing Q3. Demonstrates completeness guard and submission lock. |
| `MOD-001` | **Chief Moderator Sarah Jenkins** | `MODERATOR` | Reviews QualityPulse anomalies, claims triage cases in EscalationHub, reviews AI advisory suggestions, and issues final binding academic resolutions. |

---

# 4. AI Architecture & Non-Authority Boundary

### What AI Receives
When advisory assistance is requested for a triage case, the application's context builder extracts a strictly minimized, sanitized payload:
- Triage case identifier and signal type (e.g. `LENIENCY_BIAS`)
- Evaluator anonymized identifier and cohort summary statistics (mean, cohort mean, standard deviation, $z$-score)
- Rubric criteria identifiers and maximum marks
- **Zero Student PII:** Student names, roll numbers, and personal identifiers are completely excluded at the domain boundary (`02-architecture §28`).

### What AI Produces
AI returns a strictly validated JSON structure conforming to the domain contract schema:
```json
{
  "recommendation": "Recommend sample remarking or moderation review for EXAM-002 cohort",
  "confidence": 0.85,
  "evidence": ["eval-demo-006", "eval-demo-007", "eval-demo-008", "eval-demo-009"],
  "requiredHumanReview": true,
  "model": "mock-deepseek-r1",
  "modelVersion": "1.0.0",
  "promptVersion": "v1.2.0",
  "generatedAt": "2026-09-27T14:30:00.000Z"
}
```

### What AI CANNOT Do (Non-Authority Invariants `INV-003`, `INV-004`)
The backend architecture enforces hard compile-time and runtime guards:
- **No Mark Assignment:** AI actors cannot execute `AssignMarkCommand`.
- **No Evaluation Submission:** AI actors cannot execute `SubmitEvaluationCommand`.
- **No Case Assignment or Resolution:** AI actors cannot assign or resolve triage cases (`ResolveTriageCaseCommand`).
- **No Demo Control:** AI actors cannot call seed or reset endpoints (HTTP 403 Forbidden).
- **Deep Runtime Immutability:** AI advisory responses are frozen (`Object.freeze`) and cannot modify operational domain state.

### Human Decision Authority
The human moderator independently selects the resolution outcome (`ACTION_TAKEN`, `DISMISSED`, `ESCALATED`) and must provide a mandatory non-empty human rationale. AI output is purely advisory guidance.

---

# 5. QualityPulse Anomaly Detection Engine

QualityPulse implements deterministic statistical analytics across examination cohorts:

### Population Analyzed
All submitted evaluations belonging to the active evaluation cycle (`cycle-2026-demo`) linked to canonical rubric `RUBRIC-CS-101`.

### Evaluator-Level Statistics
For each evaluator $i$, QualityPulse computes:
1. **Evaluator Mean ($\mu_i$):** Average total marks awarded by examiner $i$.
2. **Cohort Baseline Mean ($\mu_{cohort}$):** Grand mean of marks across all calibrated examiners.
3. **Cohort Standard Deviation ($\sigma_{cohort}$):** Standard deviation across all cohort evaluations.
4. **Standardized Score ($z$-Score):**
   $$z_i = \frac{\mu_i - \mu_{cohort}}{\sigma_{cohort}}$$

### Detection Threshold
- In the canonical demo, `EXAM-002` has $\mu_{002} = 27.5$, while calibrated baseline has $\mu_{cohort} = 22.8$ with $\sigma = 1.80$.
- Standardized score $z = +2.61$.
- Any examiner with $|z| \ge 2.0$ is flagged as a statistical outlier (`LENIENCY_BIAS` or `STRICTNESS_BIAS`).

### Signal & Case Creation
When a signal is generated:
1. A `QualitySignal` entity is recorded with type `LENIENCY_BIAS`, severity `HIGH`, detector `DETECTOR-EXAM-DEV-V1`, and evaluation references.
2. A corresponding `TriageCase` (`tc-demo-001`) is opened in the EscalationHub for chief moderator review.

---

# 6. TrustLens / Audit Trail Verification

TrustLens provides complete, tamper-evident auditability:
- **Logged Consequential Operations:** `SEED_DEMO_SCENARIO`, `EVALUATION_CREATED`, `MARK_ASSIGNED`, `EVALUATION_SUBMITTED`, `TRIAGE_CASE_ASSIGNED`, `TRIAGE_CASE_RESOLVED`, `RESET_DEMO_SCENARIO`.
- **Attributes Recorded:** Unique event ID, ISO 8601 timestamp, actor ID, actor type (`EXAMINER`, `MODERATOR`, `ADMIN`, `SYSTEM`), entity type, entity ID, action, and JSON evidence payload.
- **Audit Immutability Across Reset:** Demo reset removes operational evaluation and moderation records but **strictly preserves** historical audit logs. Reset itself appends an immutable `RESET_DEMO_SCENARIO` / `DemoCohortReset` event.

---

# 7. Demo Reset & Recovery (Safe Reseeding)

- **Reset Scope:** Cleans up canonical demo records (`cycle-2026-demo`, `RUBRIC-CS-101`) in strict child-to-parent dependency order:
  `resolutions` $\to$ `triage_cases` $\to$ `quality_signals` $\to$ `evaluation_marks` & `questions` & `evaluations` $\to$ `rubrics`.
- **Non-Demo Protection:** Evaluations, rubrics, signals, and cases belonging to non-demo cycles (e.g. `cycle-2026-prod`) are completely untouched.
- **Idempotency:** Calling reset repeatedly safely returns HTTP 200 with status `"ALREADY_RESET"`.
- **Lifecycle Recovery (`SEED → RESET → SEED`):** Resets leave the database in a clean state, enabling fresh re-seeding with full logical equivalence and zero primary key collisions.

---

# 8. 10-Scene Live Demo Script (For Presenters)

### Scene 1 — The Examination Crisis (30s)
*“Welcome to OSM. In digital exam evaluation, examiners face fatigue and boards face public scandal when questions are missed or grading varies wildly. Today we demonstrate how OSM provides continuous quality assurance without compromising human academic authority.”*

### Scene 2 — The Evaluator Workspace (45s)
1. Navigate to **Evaluation Workspace**.
2. Select evaluation `eval-demo-010` (Examiner `EXAM-003`).
3. Point out Questions Q1 (8/10) and Q2 (7/10) are graded, but Q3 remains unmarked.

### Scene 3 — The Completeness Guard (45s)
1. Click **Submit Evaluation** without grading Q3.
2. Show the immediate server-side validation error: `HTTP 422 INCOMPLETE_EVALUATION`.
3. Emphasize: *“The backend prevents accidental un-evaluated submissions before they can ever reach the student.”*

### Scene 4 — Completing and Locking (45s)
1. Enter mark `9` for Question Q3. Save mark.
2. Click **Submit Evaluation**.
3. Point out status transition to `SUBMITTED` with total score 24/30.
4. Try to edit a mark: demonstrate that submitted evaluations are permanently locked (`INV-001`).

### Scene 5 — QualityPulse Anomaly Analytics (60s)
1. Switch to **QualityPulse** dashboard.
2. Select cohort `cycle-2026-demo`.
3. Show the statistical distribution: `EXAM-001` is calibrated at 20.8, but `EXAM-002` spikes at 27.5 ($z = +2.61$).
4. Emphasize: *“QualityPulse flags this leniency hotspot in real time, before results are declared.”*

### Scene 6 — EscalationHub Triage (45s)
1. Navigate to **EscalationHub**.
2. Open case `tc-demo-001` associated with the `EXAM-002` leniency signal.
3. Switch persona to `MOD-001` (Chief Moderator).
4. Click **Claim Case** to assign the case to the moderator.

### Scene 7 — Structured AI Advisory (60s)
1. Click **Request AI Advisory** inside the case view.
2. Inspect the returned advisory box:
   - Specific recommendation: *“Recommend sample remarking or moderation review for EXAM-002 cohort”*
   - Confidence score: `0.85`
   - Explicit flag: `requiredHumanReview: true`
   - Model provenance: `mock-deepseek-r1 v1.0.0`
3. Emphasize: *“AI assists by pinpointing evidence, but it has zero authority to change a grade or close a case.”*

### Scene 8 — Binding Human Resolution (45s)
1. Moderator selects outcome: `ACTION_TAKEN`.
2. Moderator enters binding rationale: *“Audited sample of 4 booklets; 2 booklets re-assigned for double evaluation.”*
3. Click **Resolve Case**. Case transitions to terminal `RESOLVED` state.
4. Note that resolved cases cannot be re-resolved (`INV-002`).

### Scene 9 — TrustLens Audit Trail (45s)
1. Switch to **TrustLens**.
2. Inspect the live chronological audit log.
3. Show the chain of events: Seed $\to$ Mark Assigned $\to$ Submitted $\to$ Anomaly Detected $\to$ Case Assigned $\to$ Case Resolved.
4. Highlight complete actor attribution and tamper-evident payload hashes.

### Scene 10 — Admin Demo Reset & Recovery (30s)
1. Switch persona to `ADMIN-001`.
2. Click **Reset Demo**.
3. Confirm operational records are wiped while audit history is preserved.
4. Click **Seed Demo**: show that the environment recovers cleanly and deterministically.

---

# 9. Hackathon Judge FAQ

### Q1: Why AI? What is its unique value proposition?
**Answer:** In high-stakes examinations, AI's highest-value role is semantic anomaly explanation and advisory triage. Rather than replacing examiners, AI accelerates moderator investigation by clustering outlier evidence and synthesizing rubric criteria discrepancies.

### Q2: Why not fully automate marking with LLMs?
**Answer:** Autonomous AI grading violates regulatory frameworks (including the DPDP Act), suffers from prompt injection and hallucination risks, and lacks legal accountability. Academic judgment must remain with certified human examiners.

### Q3: How does the system prevent AI from becoming authoritative?
**Answer:** Through strict domain boundaries and server-side RBAC. AI actors cannot call mutation commands (`AssignMark`, `SubmitEvaluation`, `ResolveTriageCase`). AI outputs are schema-validated, frozen in memory, and require explicit human moderator action to affect operational state.

### Q4: How are anomalies detected?
**Answer:** Deterministically via statistical standard score ($z$-score) algorithms across examination cohorts. Evaluator distributions with $|z| \ge 2.0$ generate quality signals and automated triage cases.

### Q5: What happens if the AI provider goes down or times out?
**Answer:** The system degrades gracefully to deterministic fallback recommendations with zero disruption to the marking workflow or database transactions.

### Q6: How is sensitive examination data protected?
**Answer:** By design, student PII is completely excluded from AI payloads. The system enforces server-side role-based authorization (Examiner, Moderator, Admin) on all endpoints.

### Q7: Can the demo environment be reset reliably between judging rounds?
**Answer:** Yes. The admin reset endpoint performs a scoped, transactional cleanup of canonical demo records in child-to-parent order and supports clean, idempotent re-seeding.

### Q8: What database and architecture does the platform use?
**Answer:** A modular TypeScript monolith with clean hexagonal architecture (Domain, Application, Infrastructure, Presentation), SQLite persistence with WAL mode, and Kysely query builder.

---

# 10. Implemented vs. Future Roadmap Scope

| Capability Domain | Implemented & Verified in Hackathon MVP | Future / Production Expansion |
| :--- | :--- | :--- |
| **Marking Workflow** | Interactive Evaluation Workspace, rubric criteria display, draft mark editing, completeness checks, submission locking | Handwriting recognition / Indic OCR integration, pen tablet stroke capture |
| **Quality Analytics** | QualityPulse cohort analytics, examiner mean, standard deviation, $z$-score leniency/strictness outlier detection | Multi-year longitudinal examiner drift modeling, cross-subject normalization |
| **Moderation** | EscalationHub, triage case lifecycle (`OPEN` $\to$ `IN_PROGRESS` $\to$ `RESOLVED`), mandatory human rationale, resolution persistence | Automated sample distribution algorithms, committee approval workflows |
| **AI Layer** | Non-authoritative advisory endpoint, context minimization (zero PII), structured schema validation, fallback degradation | Fine-tuned open-source Indic LLMs, multi-modal answer sheet visual analysis |
| **Audit & Governance** | TrustLens live audit event viewer, immutable audit log, reset preservation, actor attribution | Cryptographic Merkle tree verification, external blockchain timestamping |
| **Environment** | Deterministic seeding, child-to-parent reset, non-demo isolation, transactional rollback | Multi-tenant cloud hosting, distributed Redis queue dispatch |

---

# 11. Disclosed Technical Limitations

To uphold strict truth-in-demonstration standards, the following architectural choices are explicitly disclosed:
1. **Automated Browser E2E:** No headless browser test runner (Playwright/Cypress) is configured in the repository. Frontend components are verified via React source inspection, TypeScript typechecking, Vite production build, and HTTP API integration tests.
2. **Deterministic Demo Scenario:** The hackathon demo utilizes a canonical scenario (`cycle-2026-demo`, `RUBRIC-CS-101`, 12 evaluations) to guarantee 100% reproducible judge presentations.
3. **AI Adapter:** The demo uses a deterministic mock AI provider (`mock-deepseek-r1`) delivering predictable advisory responses without external internet latency or API key dependencies.
4. **Development Authentication:** Role simulation is achieved via fast HTTP request headers (`x-user-id`, `x-user-role`) rather than full OAuth/OIDC redirects.

---

# 12. Verification Evidence Summary

The entire codebase has been verified through automated regression suites:
- **Test Suites:** **31 / 31 passed (100%)**
- **Tests Passed:** **592 / 592 passed (100%)**
- **TypeScript Typecheck:** **0 errors** across all monorepo workspaces (`@osm/shared`, `@osm/api`, `@osm/web`)
- **Production Build:** **PASS** (Vite bundle built in 737ms)
- **Formatting & Diffs:** Clean (`git diff --check` passed)
