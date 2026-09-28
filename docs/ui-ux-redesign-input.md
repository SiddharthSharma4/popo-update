# EvalOS UI/UX Forensic Critique & Redesign Input

**Project:** EvalOS — AI Evaluation Intelligence & QA Layer for On-Screen Marking  
**Document Status:** Complete Forensic UI/UX Design Audit & Input Specification  
**Scope:** Design tokens, components, layouts, mental models, usability, and domain ergonomics  
**Date:** September 2026  

---

## A. Existing Strengths

1. **Robust Institutional Foundation:**
   - The interface avoids childish or generic consumer styles, utilizing a restrained academic aesthetic (deep slate navy `#0B132B`, warm ivory paper `#FCFBF7`, and institutional status indicators).
2. **Deterministic CompleteCheck Bar:**
   - The sticky footer in `EvaluationWorkspace` provides immediate, unambiguous feedback regarding whether all questions have been marked and explicitly communicates when the script is ready for submission.
3. **Strict Domain Language Alignment:**
   - Terminology consistently maintains the distinction between "Observation/Signal" and "Authoritative Decision" in several key screens (e.g., QualityPulse formulas explicitly state: *"Highlights operational supervisory review volume; does not represent academic grading accuracy"*).
4. **Rich Two-Pane Evaluation Canvas:**
   - The 55% script preview (digitized answer booklet) and 45% rubric scoring dock provide examiners with concurrent visibility into candidate answers and grading criteria without modal jumping.
5. **Real-time Analytical Telemetry:**
   - QualityPulse metrics (throughput, clean evaluation rate, evaluator deviations, and hotspots) are computed in real time from active database records rather than relying on fake static dashboard numbers.

---

## B. Existing Weaknesses

1. **Extreme Copy Incoherence Across Views:**
   - The admin pages (`AdminDemoPage`, `AdminOverviewPage`) describe a "Spring 2026 Mathematics" examination with a "Math 2026 Rubric" and "Dr. Smith", while the actual database seed, rubric criteria, questions, and candidate answers are 100% Computer Science (`CS-101`, AVL Trees, SOLID architecture).
2. **Hidden and Dangerous Unsaved State:**
   - Typing marks into the score inputs updates local React state only. If an examiner navigates to another question or exits to the queue without clicking the modest "Save Mark" button, their work is silently lost without dirty-state warnings or browser unload guards.
3. **Actor Identity Desynchronization:**
   - The header persona switcher (`auth.actorId`) operates independently from the evaluation currently open in the workspace. An examiner can be logged in as "Dr. Sarah Jenkins" while viewing a script assigned to "Dr. Michael Chen", leading to confusing 403 Forbidden errors when attempting to record marks.
4. **Broken Script References in Triage View:**
   - `TriageCaseDetail.tsx:84` passes `evaluationId` (`eval-demo-lenient-501`) into `getScriptReference()` instead of `scriptId` (`SCRIPT-DEMO-501`), resulting in garbled barcode fallbacks like `OSM-2026-CS101-eval-demo-lenient-501`.
5. **Ephemeral AI Advisory Visibility:**
   - When a moderator requests an AI advisory, the response is rendered inside a transient modal state. If the page is refreshed or the moderator navigates away, the AI advisory vanishes permanently with zero database or audit trail retention.

---

## C. Functional UX Problems

1. **No Auto-Save / No Dirty Indicator:**
   - Modern examination systems require either continuous debounced auto-save or an unmistakable "Unsaved Draft" visual alert. Currently, examiners must manually find and click "Save Mark" for each individual question.
2. **No Bulk / Step-by-Step Guidance:**
   - Navigating between questions requires manual clicking on paper sections or using small bottom stepper buttons. There is no auto-advance to the next unmarked question upon saving a mark.
3. **Completeness Asymmetry:**
   - The frontend disables the submit button if `!completeness.isComplete`, but the backend allows submission and generates a `COMPLETENESS_PARTIAL` signal. This prevents examiners from intentionally submitting a partially completed script with an explanatory note when a candidate leaves answers blank.
4. **Disjointed Demo Orchestration:**
   - In `AdminDemoPage`, clicking "Open Incomplete Script" in Act 1 links to the workspace but does not automatically set the role switcher to the assigned examiner (`evaluator_1`), causing the user to land on the evaluation in an invalid actor state if they were previously in Admin mode.

---

## D. Information Architecture Problems

1. **Incoherent Navigation Mental Model:**
   - The top navigation bar currently mixes global institutional tools (System Overview, Demo Controls) with actor-specific operational queues (Script Queue, Escalation Hub, TrustLens).
   - A clear hierarchy must separate:
     - **EXAMINER:** Queue → Workspace → CompleteCheck → Lock
     - **MODERATOR:** Triage Queue → Case Investigation → Evidence Inspection → AI Advisory → Resolution
     - **SUPERVISOR / ADMIN:** QualityPulse Analytics → Sentinel Anomaly Detection → TrustLens Audit Ledger → Orchestration
2. **Disconnected Evidence Context in Triage:**
   - When viewing a triage case for an evaluator deviation anomaly, the moderator sees statistical charts ($\Delta\%$, $\sigma$) but cannot easily open the actual examination scripts evaluated by that examiner side-by-side to review their grading rationale.

---

## E. Visual Hierarchy Problems

1. **Competing Call-to-Actions in Evaluation Workspace:**
   - The "Save Mark" button, "Next Question" button, and bottom "Validate & Submit" button fight for attention with similar visual weighting.
2. **Dense Unformatted Text in Candidate Answers:**
   - Candidate responses in the left pane are rendered inside `<pre>` blocks with monospace font and basic styling, which looks like a debug console rather than an authentic scanned or digitized examination answer paper.
3. **Telemetry Card Crowding:**
   - The 4-column metric grid in `CohortHealthCard` attempts to display throughput, clean evaluation rate, signals breakdown, and moderation cases simultaneously, causing information overload on screens narrower than 1440px.

---

## F. Cross-Page Consistency Problems

1. **Persona and Academic Title Inconsistencies:**
   - In `actor-fixtures.ts`, `evaluator_1` is "Dr. Sarah Jenkins". In `AdminDemoPage`, Act 1 calls her "Dr. Smith", while Act 3 calls her "Sarah Jenkins (Chief Moderator)".
2. **Table Design Inconsistencies:**
   - The Examiner Queue table, Triage Queue table, Evaluator Deviation table, and TrustLens Audit Ledger all use slightly different padding, header alignments, chip styles, and row hover treatments.
3. **Modal Dialog Discrepancies:**
   - The Submit Confirmation modal, Case Assignment modal, and Case Resolution modal use inconsistent footer button placements and differing confirmation paradigms.

---

## G. Interaction Problems

1. **Abrupt Screen Jumps:**
   - Clicking a question in the right pane scrolls the left pane via `scrollIntoView`, but this can be disorienting when the paper has long code answers.
2. **Lack of Keyboard Navigation:**
   - Examiners grade hundreds of scripts a day and rely on rapid numeric keypad entry. Currently, there are no keyboard shortcuts (e.g., `Enter` to save and advance, `Alt+N` for next question, `Alt+P` for previous question).
3. **No Undo / Version History:**
   - If an examiner edits a mark from 35 to 20, the previous score is overwritten immediately in the database. While the audit ledger records the change, the workspace UI provides no visual history of prior marks.

---

## H. State Feedback Problems

1. **Silent Save Failure Risk:**
   - If a network error or session timeout occurs when saving a mark, the error message is rendered in small red text below the input that can easily be missed.
2. **Unclear Concurrency Conflict Resolution:**
   - When a 409 conflict occurs, the banner states: *"Concurrency Conflict... Reloading latest version in 1.8s"*. The automatic reload discards the examiner's current edits without allowing them to review or merge changes.
3. **Lack of Dynamic Metric Invalidation:**
   - After an examiner submits a script, navigating to QualityPulse often shows cached telemetry until the user manually triggers a browser refresh.

---

## I. Trust & Explainability Problems

1. **Misleading Statistical Terminology:**
   - In `EvaluatorDeviationTable`, a high deviation is labeled with a red badge: `"High Deviation Signal (Δ ≥ 25%)"`. Red badges subconsciously imply examiner misconduct or grading error, violating the core principle that **statistical variance is an observational signal, not proof of error**.
   - *Recommendation:* Replace inflammatory red danger styling with neutral analytical slate or indigo badges labeled *"Cohort Variance Signal — Requires Supervisory Sampling"*.
2. **AI Advisory Transparency:**
   - The AI advisory output displays a text recommendation and confidence percentage, but does not visually cite the exact rubric bullet points or lines of student text that generated the recommendation.
3. **Audit Ledger Verifiability:**
   - TrustLens displays chronological events, but does not expose cryptographic checksums or sequence hashes that prove the ledger has not been modified.

---

## J. Accessibility Problems

1. **Sub-optimal Contrast on Muted Text:**
   - Several secondary captions use `--osm-text-muted` (`#64748B`) against dark slate backgrounds (`#1E293B`), failing WCAG AA 4.5:1 contrast requirements.
2. **Screen Reader Blind Spots:**
   - The interactive digitized answer paper sections are `<article>` elements with click handlers but lack `role="button"`, `tabIndex={0}`, and `aria-label` tags, making them inaccessible to keyboard and screen-reader users.
3. **Color-Only State Communication:**
   - In some tables, status indicators rely solely on colored circular dots without accompanying text or distinct shapes.

---

## K. Recommended Design-System Direction

1. **Design Tokens & Palette Consolidation:**
   - **Primary Academic Navy:** `#0F172A` (Slate 900)
   - **Supervisory Indigo:** `#4338CA` (Indigo 700) for analytical and intelligence features
   - **Warm Institutional Canvas:** `#F8FAFC` (Slate 50) for workspace background
   - **Authentic Paper Texture:** `#FFFFFF` with `#E2E8F0` border and subtle shadow for the answer booklet
   - **Signal Semantic Tokens:**
     - Observational Variance: Muted Violet (`#6D28D9`)
     - Completeness Flag: Warm Amber (`#D97706`)
     - Confirmed Valid: Forest Emerald (`#059669`)
     - Academic Decision / Resolution: Deep Cobalt (`#1D4ED8`)
2. **Typography System:**
   - Headings & Document Titles: Premium serif or clean humanist sans-serif (`Inter`, `Plus Jakarta Sans`, or `Cinzel` for academic board headers).
   - Numerical Scores & Barcodes: High-legibility tabular monospace (`JetBrains Mono` or `Fira Code`).

---

## L. Recommended Component Consolidation

1. **Consolidate Header & Persona Switcher:**
   - Combine the current cluttered top bar into a unified **EvalOS Institutional Bar** with role switcher, active session persona card, database health ping, and role-scoped navigation tabs.
2. **Unified Data Table Component:**
   - Replace 4 disparate table implementations (`ExaminerQueue`, `TriageQueue`, `EvaluatorDeviationTable`, `TrustLensView`) with a single reusable, accessible `OsmDataTable` supporting sorting, filtering, and empty states.
3. **Unified CompleteCheck & Submit Dock:**
   - Make the CompleteCheck dock an integrated drawer at the bottom of the workspace with clear status stages: `Incomplete (N remaining)` → `Verified & Complete` → `Submitted & Immutable`.

---

## M. Recommended Page-by-Page Improvements

### 1. Examiner Evaluation Workspace (`/examiner/evaluate/:id`)
- Add **Auto-Save with Debounce** (or clear "Unsaved Changes" indicator).
- Add **Keyboard Stepper:** `Ctrl+Enter` to save & jump to next question.
- Fix **Candidate Paper Display:** Render realistic examination paper margins, candidate barcode strip, rubric references, and clear student handwriting/OCR typography.
- Synchronize **Actor State:** If user opens a script assigned to another evaluator, display a prominent read-only banner: *"Viewing in Read-Only Mode (Assigned to Dr. Michael Chen)"*.

### 2. Triage & Escalation Hub (`/moderator/triage`)
- Fix the **Script Reference Bug** in `TriageCaseDetail.tsx:84` to pass `scriptId` instead of `evaluationId`.
- Add **Side-by-Side Evaluation Inspection:** Allow moderators to open the flagged evaluation directly in a split panel without leaving the triage context.
- **Persist AI Advisory:** Save generated AI advisories to the database and link them directly into the audit ledger so they remain inspectable.

### 3. QualityPulse Analytics (`/analytics` / `/admin/analytics`)
- Clarify **Telemetry Formulas:** Ensure all variance chips clearly state "Cohort Variance Signal" rather than "Defect" or "Error".
- Add **Drill-down Filter:** Clicking a deviant evaluator in the table should immediately filter the Triage queue to scripts marked by that evaluator.

### 4. Admin Demonstration & Orchestration Page (`/admin/demo`)
- Completely rewrite the **Act Descriptions & Persona Labels** to match the real Computer Science `RUBRIC-CS-101` cohort and real actor identities (`Dr. Sarah Jenkins`, `Dr. Adrian Foster`, `Prof. Marcus Vance`).
- Add **"Switch to Persona" Action Buttons** in each Act card so admins can transition between Examiner, Moderator, and QA Lead seamlessly with one click.

### 5. TrustLens Audit Ledger (`/moderator/audit`)
- Add **Audit Event Filter for AI & Sentinel:** Ensure backend records `GENERATE_AI_ADVISORY` and `TRIGGER_SENTINEL` events, and display them in the audit timeline.
- Add **Audit Export / Verification Checksum:** Provide a "Verify Ledger Integrity" button that validates chronological sequencing and record hashes.
