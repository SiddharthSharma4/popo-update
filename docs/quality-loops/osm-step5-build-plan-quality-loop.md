# QualityLoop — Step 5 Build Plan (Revised)

> Revised using the AI-agent review supplied with this task. The original Step 5 plan is preserved in structure and strengthened at the implementation boundaries.

# STEP 5 — Build Plan & Quality Loop Master
## QualityLoop — End-to-End OSM Intelligence Ecosystem
### AI + Analytics for On-Screen Marking and Digital Evaluation

**Stage:** Step 5 — Implementation Planning, Build Execution & Quality Assurance  
**Status:** Master build-plan specification / agent instruction  
**Inputs:** Step 0 Problem Deconstruction + Step 1 Research & Validation + Step 2 Solution Ideation & Product Strategy + Step 3 PRD + Step 4 Architecture & Quality Loop Master  
**Output:** A dependency-ordered, test-gated, demo-ready implementation plan for the QualityLoop MVP  
**Primary principle:** Build the smallest technically credible vertical slice that closes the quality loop, then add bounded capabilities without breaking trust, determinism, or human authority.

---

# 0. PURPOSE OF THIS DOCUMENT

This document is the authoritative operating framework for **Step 5**.

The previous stages established:

```text
STEP 0
Problem
   ↓
STEP 1
Evidence / validation
   ↓
STEP 2
Product direction
   ↓
STEP 3
PRD
   ↓
STEP 4
Architecture + quality-loop engineering
   ↓
STEP 5
BUILD PLAN + IMPLEMENTATION + TESTING + DEMO HARDENING
```

Step 5 must determine **what to build first, what depends on what, how each increment is verified, and what must be true before moving forward**.

Step 5 is not permission to redesign the product.

The implementation must preserve the decisions already established in the PRD and architecture.

---

# 1. SOURCE-OF-TRUTH HIERARCHY

When a build decision is required, use this order:

1. **Step 3 PRD** — product behavior and scope.
2. **Step 4 Architecture** — system structure and technical boundaries.
3. **Step 2 Product Strategy** — product rationale and trade-offs.
4. **Step 1 Research & Validation** — evidence, constraints and known gaps.
5. **Step 0 Problem Deconstruction** — original problem framing.
6. Explicit implementation constraints.
7. Engineering judgment.
8. New assumptions only when unavoidable and clearly labeled.

If a conflict appears:

- identify it;
- do not silently rewrite an earlier decision;
- prefer the later product/architecture decision unless it violates a validated constraint;
- record the decision in an ADR or implementation note;
- update traceability where the decision changes implementation scope.

---

# 2. PRODUCT SOURCE OF TRUTH

QualityLoop is:

> **An end-to-end OSM intelligence ecosystem that augments digital evaluation with deterministic validation, statistical quality intelligence, carefully bounded AI assistance, smart moderation, explainable audit trails, calibration and revaluation-driven learning.**

The implementation must make this lifecycle real:

```text
EVALUATE
   ↓
VALIDATE
   ↓
ASSIST
   ↓
DETECT
   ↓
CORRELATE / DEDUPLICATE
   ↓
TRIAGE
   ↓
PRIORITIZE
   ↓
REVIEW
   ↓
RESOLVE
   ↓
AUDIT
   ↓
REVALUE
   ↓
LEARN
   ↓
HUMAN APPROVAL
   ↓
CALIBRATE
   ↓
NEXT CYCLE
```

The MVP does not need to implement every future capability at production depth.

It **does** need to demonstrate one coherent quality loop end-to-end.

---

# 3. BUILD MISSION

The build must prove that QualityLoop can:

1. receive evaluation activity;
2. represent an evaluation cycle;
3. validate deterministic evaluation problems;
4. generate evidence-bearing quality signals;
5. correlate and deduplicate signals;
6. create moderator-facing triage cases;
7. calculate transparent review priority;
8. let a human moderator investigate;
9. require a human resolution reason;
10. preserve the action in an audit trail;
11. represent revaluation outcomes;
12. generate learning/calibration candidates;
13. keep authoritative academic decisions human-controlled;
14. operate without real student PII;
15. continue functioning when AI is unavailable;
16. reproduce the critical demo deterministically.

---

# 4. NON-NEGOTIABLE BUILD CONTRACT

## 4.1 Human authority

Humans remain responsible for:

- final marks;
- moderation decisions;
- signal/case resolution;
- escalation;
- official rubric changes;
- institutional action.

No implementation may create an implicit autonomous academic decision path.

## 4.2 AI is advisory

AI may:

- summarize;
- highlight;
- compare;
- suggest;
- explain;
- surface patterns;
- provide contextual assistance.

AI may not:

- finalize marks;
- silently modify marks;
- declare an evaluator guilty;
- trigger punishment;
- automatically change official rubrics;
- override an evaluator;
- override a moderator;
- create an unreviewable decision.

## 4.3 Statistics are advisory

Statistical analytics may:

- identify unusual patterns;
- generate quality-risk signals;
- support transparent review prioritization.

They may not:

- determine intent;
- determine misconduct;
- automatically penalize anyone;
- be presented as ground truth.

## 4.4 Deterministic problems stay deterministic

Use rules for:

- missing marks;
- invalid marks;
- total mismatch;
- missing required fields;
- invalid state transitions;
- incomplete required answers.

Do not use an LLM for a problem that can be solved safely with a deterministic rule.

## 4.5 Synthetic-data first

The MVP must work with:

- synthetic evaluator activity;
- synthetic scripts/answers;
- synthetic marks;
- synthetic rubrics;
- synthetic exemplars;
- seeded anomalies;
- synthetic revaluation outcomes.

No real student PII is required.

## 4.6 Existing OSM is an integration boundary

MVP:

```text
Synthetic / Simulated OSM Events
            ↓
        QualityLoop
```

Future production direction:

```text
Existing University OSM
            ↓
     Integration Adapter
            ↓
        QualityLoop
```

Do not build a complete scanning platform, physical-script logistics system, university ERP replacement, or mature OSM replacement.

## 4.7 Simple architecture

Prefer the Step 4 architecture direction:

```text
One deployable application
+
Clear domain modules
+
Optional AI adapter
```

Do not introduce microservices, queues, multiple databases, Kubernetes, service meshes, warehouses, or other infrastructure merely to appear enterprise-grade.

---

# 5. MVP BUILD TARGET

The first complete vertical slice is:

```text
Seed evaluation data
      ↓
Evaluation event
      ↓
Deterministic validation
      ↓
Quality signal
      ↓
Correlation / deduplication
      ↓
Triage case
      ↓
Transparent priority
      ↓
Moderator review
      ↓
Human resolution + reason
      ↓
Audit event
      ↓
Revaluation outcome
      ↓
Learning insight
      ↓
Calibration candidate
```

This path is the **Build Spine**.

Every implementation decision should protect this spine.

---

# 6. MVP SCOPE

## 6.1 MUST HAVE

### Foundation
- application boot;
- database/persistence;
- configuration management;
- authentication;
- RBAC;
- health endpoint;
- structured logging.

### Evaluation
- evaluation cycle;
- questions;
- scripts;
- evaluators;
- question-level marks;
- evaluation events;
- evaluation state.

### Validation
- missing-mark detection;
- invalid-mark detection;
- total mismatch detection;
- incomplete required-field detection;
- validation evidence.

### Quality intelligence
- seeded statistical anomaly;
- evaluator deviation;
- minimum sample-size handling;
- detector/version/configuration provenance;
- evidence-bearing signals.

### Correlation and triage
- duplicate/similar signal grouping;
- TriageCase creation;
- priority;
- human-readable priority rationale.

### Moderation
- queue;
- case detail;
- evidence;
- affected entities;
- review action;
- resolve;
- dismiss;
- escalate;
- request calibration;
- required resolution reason.

### Audit
- immutable/append-oriented audit records;
- actor;
- action;
- target;
- reason;
- timestamp;
- correlation identifier.

### Quality loop
- revaluation record;
- original vs revised mark;
- mark delta;
- revaluation hotspot;
- learning insight;
- calibration candidate.

### Demo
- deterministic seeded dataset;
- reset capability;
- normal case;
- incomplete evaluation;
- statistical anomaly;
- legitimate false positive;
- moderation resolution;
- revaluation learning loop.

## 6.2 SHOULD HAVE

- evaluator-facing rubric/exemplar panel;
- limited assistive AI summary;
- controller-level QualityPulse dashboard;
- calibration acknowledgement;
- configurable quality thresholds;
- richer drill-downs;
- improved evidence visualization.

## 6.3 NICE TO HAVE

- polished visualizations;
- additional anomaly detectors;
- richer AI explanation;
- optional handwriting/OCR demonstration using clearly labeled non-production data;
- responsive/mobile-friendly web UI.

## 6.4 FUTURE

Do not let these threaten MVP completion:

- autonomous grading;
- production Indic handwriting OCR;
- real university OSM integration;
- real student PII;
- native mobile application;
- automated malpractice verdicts;
- automatic evaluator punishment;
- complete ERP integration;
- distributed production infrastructure.

---

# 7. DOMAIN BUILD ORDER

The implementation order follows the architecture:

```text
Phase 1   Foundation
   ↓
Phase 2   Evaluation Cycle + Events
   ↓
Phase 3   Deterministic Validation
   ↓
Phase 4   Quality Signals
   ↓
Phase 5   Correlation + Triage + Moderation
   ↓
Phase 6   Audit
   ↓
Phase 7   QualityPulse
   ↓
Phase 8   Calibration
   ↓
Phase 9   Revaluation + Learning
   ↓
Phase 10  Optional AI Assistance
   ↓
Phase 11  Demo Hardening
   ↓
Phase 12  Full Testing + Deployment
```

**Critical rule: do not build AI first.**

The deterministic and statistical core must work before AI is introduced.

---

# 8. PHASE 0 — REPOSITORY AND BUILD BASELINE

## Objective

Establish a clean implementation baseline before feature work.

## Tasks

- inspect the repository;
- identify existing application structure;
- identify current runtime/tooling;
- identify existing tests;
- identify existing database/persistence;
- identify existing authentication;
- identify existing UI routes/screens;
- identify build and run commands;
- establish local environment instructions;
- establish environment-variable conventions;
- verify no secrets are committed.

## Deliverables

```text
README / development instructions
Environment template
Working local boot
Baseline test command
Baseline lint/type/static-check command where applicable
```

## Gate

Do not start domain implementation until:

- application boots;
- baseline test command is known;
- local configuration is reproducible;
- repository contains no required real secrets;
- implementation assumptions are documented.

---

# 9. PHASE 1 — FOUNDATION

## Objective

Create the minimum technical foundation required by every later module.

## Build

### Authentication

Implement the minimum supported authentication flow.

### RBAC

At minimum support the conceptual roles:

```text
Evaluator
Moderator
Controller / COE
Administrator
```

Role boundaries must be enforced server-side/application-side, not only by hiding UI elements.

### Configuration

Support configuration for:

- environment;
- database;
- AI enabled/disabled;
- AI provider;
- thresholds;
- demo mode;
- logging level.

Do not hardcode environment-specific values.

### Health

Expose a lightweight health mechanism conceptually equivalent to:

```text
GET /health
```

Health should distinguish:

```text
Application healthy
Database unavailable
Optional AI unavailable
```

AI being unavailable must not make the deterministic core unusable.

### Logging

Implement:

- structured application logs;
- error logging;
- request/workflow correlation identifier.

## Tests

- authentication;
- role authorization;
- unauthorized access;
- configuration loading;
- health endpoint;
- startup;
- database connectivity.

## Gate 1 — Foundation

```text
[ ] Application boots
[ ] Database works
[ ] Authentication works
[ ] Roles work
[ ] Health check works
[ ] No secrets committed
[ ] Baseline tests pass
```

---

# 10. PHASE 2 — EVALUATION CYCLE + EVENTS

## Objective

Create the authoritative operational model for evaluation activity.

## Build domain entities

At minimum:

```text
EvaluationCycle
Examination / Subject context
Question
Rubric
Exemplar
Evaluator
Script
Answer
Mark
EvaluationEvent
```

## Cycle lifecycle

Use the architecture-defined states unless a concrete implementation need requires otherwise:

```text
DRAFT
  ↓
CONFIGURED
  ↓
ACTIVE
  ↓
PAUSED
  ↓
COMPLETED
  ↓
ANALYZED
```

## Event model

Represent events such as:

```text
SCRIPT_ASSIGNED
ANSWER_VIEWED
QUESTION_MARKED
TOTAL_UPDATED
SCRIPT_SUBMITTED
```

Events should be traceable to:

- cycle;
- script;
- question where applicable;
- evaluator;
- timestamp;
- correlation identifier.

## Source-of-truth rule

Authoritative marks must remain separate from:

- analytics;
- quality signals;
- AI suggestions;
- dashboard aggregates.

Derived intelligence must never overwrite authoritative academic data.

## Tests

- cycle creation;
- cycle state transitions;
- script assignment;
- mark entry;
- mark update;
- event creation;
- invalid event/state transition;
- role restrictions;
- duplicate-event handling where required.

## Gate 2 — Evaluation

```text
[ ] Cycle exists
[ ] Scripts exist
[ ] Questions exist
[ ] Marks exist
[ ] Events exist
[ ] Event relationships are traceable
[ ] Authoritative marks are protected
```

---

# 11. PHASE 3 — DETERMINISTIC VALIDATION ENGINE

## Objective

Detect obvious evaluation-quality problems before statistical or AI logic.

## Core rules

Implement at least:

```text
RULE-MISSING-MARK
RULE-INVALID-MARK-RANGE
RULE-TOTAL-MISMATCH
RULE-INCOMPLETE-REQUIRED-FIELDS
RULE-INVALID-EVALUATION-STATE
```

## Validation output

Conceptually:

```text
ValidationResult
 ├── passed
 ├── rule
 ├── severity
 ├── affected entity
 └── evidence
```

## Evidence requirements

Every failed rule must explain:

- what failed;
- where it failed;
- which rule detected it;
- observed value;
- expected/configured condition;
- affected script/question/evaluator where applicable.

## Important distinction

A deterministic validation result may become a `QualitySignal`, but it is not automatically a `TriageCase`.

The architecture distinction remains:

```text
Validation / Analytics
        ↓
QualitySignal
        ↓
Correlation / Deduplication
        ↓
TriageCase
```

## Tests

Unit-test every rule.

Include:

- normal valid evaluation;
- missing mark;
- invalid range;
- total mismatch;
- incomplete submission;
- invalid state;
- boundary values;
- duplicate execution;
- idempotent/repeat behavior where applicable.

## Gate 3 — Validation

```text
[ ] Deterministic checks work
[ ] Evidence is produced
[ ] Rules are independently testable
[ ] No LLM dependency exists
[ ] Corrections can be made safely
[ ] Validation results can become signals
```

---

# 12. PHASE 4 — QUALITY SIGNAL ENGINE

## Objective

Convert validation and statistical observations into a common evidence-bearing signal model.

## QualitySignal contract


### QualitySignal lifecycle

`QualitySignal` and `TriageCase` have different lifecycle responsibilities.

```text
QualitySignal
  GENERATED
      ↓
  CORRELATED / GROUPED
      ↓
  LINKED_TO_CASE
```

A `QualitySignal` is evidence-bearing intelligence. It must not use moderator workflow outcomes such as `RESOLVED`, `DISMISSED`, or `ESCALATED` as its primary lifecycle states.

```text
TriageCase
  OPEN
    ↓
  IN_REVIEW
    ├── RESOLVED
    ├── DISMISSED
    ├── ESCALATED
    └── NEEDS_MORE_DATA
```

A moderator resolves a `TriageCase`, not a raw `QualitySignal`.


At minimum:

```text
QualitySignal
 ├── id
 ├── cycleId
 ├── type
 ├── detectorName
 ├── detectorVersion
 ├── configurationVersion
 ├── source
 ├── severity
 ├── generatedAt
 ├── dataWindow
 ├── affectedEntity
 ├── evidence
 ├── baseline
 ├── statistical context where applicable
 ├── method
 ├── threshold
 ├── sampleSize
 └── status
```

## Initial detectors

Implement only a small, defensible set.

### Detector A — Evaluator deviation

Compare an evaluator against an explicitly defined peer/reference baseline.

The signal must state:

- evaluator;
- sample size;
- baseline;
- observed value;
- deviation;
- comparison window;
- threshold;
- detector version.

### Detector B — Score distribution anomaly

Detect a seeded unusual distribution.

### Detector C — Evaluator drift

Detect a seeded change in an evaluator's pattern over time.

### Detector D — Revaluation hotspot (deferred until revaluation exists)

This may be activated after the revaluation module exists.

## Minimum sample size

No unreliable anomaly should be generated when the sample is too small.

The UI should explicitly communicate:

```text
Insufficient evidence
```

rather than inventing confidence.

## False-positive design

At least one legitimate but statistically unusual evaluator pattern must be seeded.

Expected behavior:

```text
Unusual pattern
      ↓
Moderator investigates
      ↓
Legitimate variation
      ↓
Dismiss
      ↓
Reason
      ↓
Audit
```

## Gate 4 — Intelligence

```text
[ ] Statistical signal exists
[ ] Evidence is visible
[ ] Minimum sample size is respected
[ ] Detector/version/configuration provenance exists
[ ] False positive is supported
[ ] Signals do not make punitive decisions
```

---

# 13. PHASE 5 — CORRELATION, TRIAGE AND MODERATION

## Objective

Turn raw signals into a usable human workflow.

## 13.1 Correlation / deduplication

Multiple signals may describe the same underlying issue.

Example:

```text
QualitySignal ─┐
QualitySignal ─┼→ Correlation / Deduplication → TriageCase
QualitySignal ─┘
```

Correlation should consider relevant shared context such as:

- cycle;
- evaluator;
- question;
- affected scripts;
- time window;
- signal type.

Do not create unnecessary duplicate moderator work.

## 13.2 TriageCase

A TriageCase is the moderator-facing workflow object.

Conceptually:

```text
TriageCase
 ├── id
 ├── cycleId
 ├── priority
 ├── priorityRationale
 ├── status
 ├── signalIds[]
 ├── affectedEntities[]
 ├── assignedModerator
 └── createdAt
```

A moderator resolves a `TriageCase`, not a raw `QualitySignal`.

## 13.3 Priority

Priority must be transparent.

Do not expose an unexplained black-box score.

Prefer:

```text
Priority: High

Why:
- affects 42 scripts
- evaluator average is 18% above peer baseline
- sample size = 64
- deviation persisted across 3 sessions
```

AI may explain or summarize a priority already calculated by transparent rules/statistics, but it must not become the authoritative priority mechanism.

## 13.4 Moderator actions

Support:

```text
REVIEW
DISMISS
RESOLVE
ESCALATE
REQUEST_CALIBRATION
MARK_LEGITIMATE_VARIATION
```

A resolution reason is required.

## Tests

- signal grouping;
- duplicate prevention;
- priority calculation;
- priority rationale;
- queue filtering;
- moderator authorization;
- resolution;
- dismissal;
- escalation;
- required reason;
- reopening while preserving history;
- false-positive dismissal.

## Gate 5 — Moderation

```text
[ ] Queue works
[ ] Cases contain evidence
[ ] Priority is explainable
[ ] Moderator can investigate
[ ] Resolution requires reason
[ ] False positives can be dismissed
[ ] Unauthorized roles cannot resolve cases
```

---

# 14. PHASE 6 — AUDIT TRAIL

## Objective

Make important actions accountable and historically traceable.

## Audit events

At minimum support conceptual events such as:

```text
FLAG_CREATED
FLAG_VIEWED
FLAG_RESOLVED
FLAG_DISMISSED
FLAG_ESCALATED
CALIBRATION_REQUESTED
RUBRIC_UPDATED
REVALUATION_RECORDED
```

## Audit record

Capture:

```text
actor
role
action
target
reason
timestamp
correlationId
relevant context
```

## Historical truth

Past:

- evaluation activity;
- moderation decisions;
- audit events

must not be silently overwritten.

Corrections should create new state/events where appropriate.

## Tests

- audit creation;
- audit immutability/append behavior;
- actor attribution;
- timestamp;
- correlation chain;
- authorization;
- historical reconstruction.

## Gate 6 — Audit

```text
[ ] Moderator actions are auditable
[ ] Reasons are retained
[ ] Historical records are preserved
[ ] Correlation IDs connect workflow steps
[ ] Audit access is role-controlled
```

---

# 15. PHASE 7 — QUALITYPULSE

## Objective

Expose actionable quality visibility to moderators and Controllers of Examinations.

## Dashboard content

Show:

- scripts evaluated;
- evaluation progress;
- open quality signals;
- resolved signals;
- evaluator-level patterns;
- question-level patterns;
- emerging hotspots;
- triage queue;
- moderation status.

## Design rule

Avoid vanity dashboards.

Every important metric should lead to a decision or drill-down.

Example:

```text
Evaluator deviation
      ↓
Open affected cases
      ↓
Review evidence
```

rather than displaying a number with no action.

## Drill-down chain

The UI should support:

```text
Dashboard
   ↓
Quality Signal
   ↓
Evaluator / Question
   ↓
Affected Scripts / Events
   ↓
Evidence
   ↓
TriageCase
   ↓
Resolution
   ↓
Audit History
```

## Tests

- dashboard data correctness;
- filters;
- pagination;
- empty states;
- stale-data indication;
- drill-down integrity;
- role-based visibility.

## Gate 7 — QualityPulse

```text
[ ] Controller sees progress
[ ] Controller sees quality risk
[ ] Moderator can drill into evidence
[ ] Dashboard is actionable
[ ] No authoritative data is changed by dashboard actions
```

---

# 16. PHASE 8 — CALIBRATION

## Objective

Close the loop from observed disagreement to evaluator support.

## Build

Support:

- exemplar library;
- rubric references;
- calibration candidates;
- calibration sessions;
- evaluator acknowledgement;
- calibration outcomes.

## Learning distinction

The system may generate:

```text
Candidate exemplar update
Candidate calibration topic
Rubric clarification candidate
Question hotspot
```

It must not automatically make these official.

Official changes require authorized human action.

## Tests

- exemplar retrieval;
- candidate generation;
- calibration request;
- acknowledgement;
- authorization;
- audit;
- no automatic rubric mutation.

## Gate 8 — Calibration

```text
[ ] Calibration candidate exists
[ ] Exemplar/rubric context is visible
[ ] Human approval is required
[ ] Changes are auditable
```

---

# 17. PHASE 9 — REVALUATION + LEARNING LOOP

## Objective

Use revaluation outcomes as a source of institutional learning.

## Revaluation entity

Own:

```text
original mark
revised mark
mark delta
question/topic
reason/context where available
cycle
script
```

Revaluation is distinct from ordinary evaluation activity.

## Learning outputs

Identify:

- questions/topics with meaningful mark changes;
- recurring disagreement areas;
- revaluation hotspots;
- calibration candidates;
- rubric clarification candidates;
- exemplar candidates.

## Small-sample behavior

If evidence is insufficient:

```text
Insufficient evidence
```

Do not create a misleading learning conclusion.

## Quality loop

The implemented loop should now be:

```text
Evaluation
   ↓
Validation
   ↓
Quality Signal
   ↓
Triage
   ↓
Moderation
   ↓
Audit
   ↓
Revaluation
   ↓
Learning
   ↓
Calibration Candidate
   ↓
Next Cycle
```

## Gate 9 — Quality Loop

```text
[ ] Revaluation is represented separately
[ ] Original and revised marks are traceable
[ ] Learning insight exists
[ ] Calibration candidate exists
[ ] Human approval remains mandatory
[ ] Full loop is demonstrable
```

---

# 18. PHASE 10 — OPTIONAL AI ASSISTANCE

## Objective

Add bounded AI only after the deterministic/statistical core is stable.

## AI boundary

Implement an explicit adapter:

```text
AI Gateway
   ↓
Context Builder
   ↓
Provider
   ↓
Response Validator
   ↓
Human-visible Advisory Result
```

The domain must not depend directly on a specific provider.

## Appropriate MVP AI uses

Prefer:

- rubric-grounded answer summary;
- evidence-linked explanation;
- exemplar comparison assistance;
- natural-language quality-signal summary.

## AI output rules

Every AI result must be:

- labeled as AI-generated;
- advisory;
- grounded in supplied context;
- human-reviewable;
- ignorable by the evaluator/moderator.

## AI failure handling

Test:

1. provider unavailable;
2. timeout;
3. malformed output;
4. unsupported claim;
5. insufficient context;
6. empty response;
7. provider quota/error;
8. human ignores result.

The core product must continue without AI.

## AI must never mutate

- official marks;
- official rubric;
- moderator resolution;
- punitive action;
- authoritative priority.

## Gate 10 — AI

```text
[ ] Core product works with AI disabled
[ ] AI is isolated behind an adapter
[ ] AI output is labeled
[ ] Malformed output is safely handled
[ ] AI cannot mutate authoritative state
[ ] Human can ignore AI assistance
```

---

# 19. PHASE 11 — DEMO HARDENING

## Objective

Make the complete hackathon story reproducible.

## Required seeded scenarios

### Scenario 1 — Normal evaluation

Normal evaluator behavior.

### Scenario 2 — Unchecked answer

One or more questions lack marks.

Expected:

```text
Validation
→ Quality Signal
→ Evidence
```

### Scenario 3 — Marking anomaly

Evaluator is intentionally seeded as unusually lenient/strict.

Expected:

```text
Statistics
→ Signal
→ Evidence
→ Triage
```

### Scenario 4 — Evaluator drift

Evaluator behavior changes across a seeded time window.

### Scenario 5 — Calibration disagreement

Evaluator and reference/exemplar differ.

### Scenario 6 — Revaluation hotspot

Revaluation causes meaningful mark changes for a question/topic.

### Scenario 7 — Legitimate false positive

A statistically unusual pattern is legitimate and is dismissed by a moderator.

## Demo reset

Provide a deterministic reset/seed mechanism.

Expected:

```text
Clean reset
   ↓
Same seed
   ↓
Same dataset
   ↓
Same configuration
   ↓
Same core signals
```

If randomness is used for non-critical behavior, isolate it from the critical path.

## Demo path

The complete 5–7 minute story should be:

```text
1. Evaluator evaluates a script
2. System validates the evaluation
3. An issue is detected
4. Broader analytics reveal a pattern
5. Moderator receives a prioritized case
6. Moderator opens evidence
7. Moderator resolves with a reason
8. Audit trail records the action
9. Revaluation reveals a hotspot
10. Learning produces a calibration candidate
11. System shows how the next cycle can improve
```

## Gate 11 — Demo

```text
[ ] Clean reset works
[ ] Seed data loads
[ ] Critical path is deterministic
[ ] False-positive path works
[ ] AI failure does not break demo
[ ] 5–7 minute flow is reproducible
[ ] No fake production claims are made
```

---

# 20. PHASE 12 — FINAL SYSTEM VERIFICATION + RELEASE

## Objective

Validate the MVP as a complete system and make it easy to run.

---

# 21. TESTING STRATEGY

## 21.1 Unit tests

Test:

- validation rules;
- statistical calculations;
- state transitions;
- priority calculation;
- permission checks;
- correlation/deduplication;
- learning calculations;
- configuration/version handling.

## 21.2 Integration tests

At minimum:

```text
Event
 ↓
Validation
 ↓
Signal
 ↓
Persistence
 ↓
Triage
 ↓
Moderation
 ↓
Audit
```

Also test:

```text
Revaluation
 ↓
Learning
 ↓
Calibration Candidate
```

## 21.3 API tests

Test:

- authentication;
- authorization;
- validation;
- mutation behavior;
- error handling;
- conflict behavior;
- idempotency where required.

## 21.4 UI tests

Test critical flows:

- evaluator submission;
- unchecked-answer correction;
- moderator review;
- resolution;
- controller drill-down;
- calibration review;
- revaluation insight.

## 21.5 End-to-end test

One deterministic E2E test must reproduce the full seeded quality loop.

## 21.6 Role-boundary tests

Explicitly verify:

```text
Evaluator cannot resolve moderator signal.
Evaluator cannot alter official rubric.
Moderator cannot impersonate evaluator.
Unauthorized user cannot access audit.
AI cannot update official marks.
Statistical engine cannot trigger punishment.
```

## 21.7 AI boundary tests

Verify:

```text
AI unavailable
AI malformed output
AI unsupported claim
AI insufficient context
AI advisory display
AI cannot mutate marks
Human can ignore AI
```

## 21.8 Determinism test

Repeated seeded runs must produce:

```text
Same seed
+
Same dataset
+
Same configuration
=
Same core signals
```

---

# 22. ERROR HANDLING CONTRACT

Use clear categories:

| Situation | Expected behavior |
|---|---|
| Invalid user input | 400-class behavior |
| Unauthenticated | 401-style behavior |
| Unauthorized | 403-style behavior |
| Missing resource | 404-style behavior |
| Invalid/conflicting state | 409-style behavior |
| Internal failure | 500-style behavior |
| Optional AI failure | Core workflow continues |
| Insufficient statistical sample | No unreliable anomaly |
| Missing exemplar | Explicit empty state |
| Duplicate signals | Group/deduplicate |
| Stale data | Show stale status |
| Missing resolution reason | Block resolution |
| Small revaluation sample | Insufficient-evidence state |
| Conflicting moderator actions | Controlled escalation |
| Seed generation failure | Preserve existing dataset |

Do not leak internal stack traces, secrets, database details, or provider credentials to users.

---

# 23. OBSERVABILITY CONTRACT

Minimum MVP observability:

```text
Structured application logs
        +
Error logging
        +
Request correlation
        +
Basic health endpoint
        +
Core workflow metrics
```

Observe at least:

- evaluation event processing;
- validation failure;
- signal generation;
- triage creation;
- moderation resolution;
- AI failure;
- database failure;
- demo reset;
- seed generation.

## Correlation identifier

Trace:

```text
Request
 ↓
Evaluation command
 ↓
Evaluation event
 ↓
Quality signal
 ↓
Triage case
 ↓
Moderation
 ↓
Audit
```

A developer should be able to follow this chain using the correlation identifier.

---

# 24. SECURITY + PRIVACY BUILD CONTRACT

## MVP

Use:

```text
Synthetic IDs
Synthetic names
Synthetic scripts
Synthetic marks
No real student PII
```

If images/text are used, they must be:

- synthetic;
- public with appropriate use rights;
- or otherwise authorized.

## Secrets

Never commit:

- API keys;
- database passwords;
- JWT secrets;
- provider credentials.

Use environment/configuration mechanisms.

## Production direction

Future production implementation must consider:

- data minimization;
- authorization;
- retention controls;
- institutional access control;
- institutional approval;
- applicable data-protection requirements.

Do not claim regulatory approval that has not been established.

---

# 25. PERFORMANCE RULES

For the MVP, optimize for:

- fast page loads;
- responsive moderation queue;
- fast dashboard queries;
- predictable seeded demo;
- reasonable event processing.

Prefer straightforward techniques first:

- appropriate indexes;
- pagination;
- sensible aggregation;
- limited caching when needed.

Do not optimize for imaginary institutional scale before the MVP works.

---

# 26. CONFIGURATION + VERSIONING

Thresholds should be configurable where appropriate:

```text
Minimum sample size
Deviation threshold
Drift threshold
Priority threshold
```

Configuration must be versionable and auditable.

Do not silently change a threshold and invalidate historical interpretation.

Where practical, preserve versions for:

- rubrics;
- exemplars;
- quality rules;
- statistical configuration;
- detector implementations;
- AI prompt/configuration;
- demo datasets.

Every quality signal should retain enough provenance to explain which detector/configuration generated it.

---

# 27. DATA INTEGRITY RULES

The implementation must preserve these distinctions:

### Authoritative vs derived

```text
Authoritative
- official marks
- official rubric
- official moderation decision

Derived
- statistics
- quality signals
- priority
- dashboards
- AI assistance
- learning candidates
```

Derived data must never silently overwrite authoritative data.

### QualitySignal vs TriageCase

```text
QualitySignal
= evidence-bearing observation.

TriageCase
= moderator workflow.
```

### EvaluationEvent vs AuditEvent

```text
EvaluationEvent
= evaluation activity.

AuditEvent
= governed/accountability event.
```

### Evaluation vs Revaluation

```text
Evaluation Activity
= marking activity.

Revaluation
= original vs revised mark business record.
```

### Severity vs Priority

```text
Severity
= potential impact.

Priority
= review order.
```

---

# 28. IMPLEMENTATION TRACEABILITY MATRIX

Every major implementation component must trace to a product requirement.

| PRD capability | Build component | Verification |
|---|---|---|
| Evaluation cycle | Evaluation Cycle module | Cycle tests |
| Evaluation activity | Event/evaluation module | Event integration tests |
| Completeness | Validation Engine | Rule unit tests |
| Quality signals | Quality Intelligence | Detector tests |
| Evidence | Evidence model/UI | Evidence assertions |
| Prioritization | Priority + TriageCase | Priority tests |
| Moderation | Moderation module | Workflow E2E |
| Resolution reason | Moderation action validation | Negative tests |
| Audit | Audit subsystem | Audit tests |
| Dashboard | QualityPulse | UI/integration tests |
| Calibration | Calibration module | Calibration tests |
| Drift | Analytics engine | Seeded scenario |
| Revaluation | Revaluation module | Revaluation tests |
| Learning | Learning loop | E2E loop |
| AI | AI adapter | Boundary tests |
| Roles | Auth/RBAC | Authorization tests |
| Synthetic data | Seed/reset generator | Determinism tests |

No major component should exist without a product reason.

---

# 29. DEFINITION OF DONE FOR EACH FEATURE

A feature is not "done" merely because code exists.

For every feature, verify:

```text
Requirement understood
        ↓
Domain behavior implemented
        ↓
Authorization enforced
        ↓
Persistence correct
        ↓
Error behavior defined
        ↓
Tests written
        ↓
UI behavior complete where applicable
        ↓
Audit behavior complete where applicable
        ↓
Observability added where useful
        ↓
Documentation updated
        ↓
Acceptance criteria pass
```

A feature that breaks the quality-loop contract is not done.

---

# 30. FEATURE ACCEPTANCE TEMPLATE

For each implementation unit, record:

```text
Feature:
Purpose:
PRD requirement:
Architecture module:
Inputs:
Outputs:
Authoritative data affected:
Derived data produced:
Roles allowed:
Roles denied:
Failure behavior:
Audit requirement:
Test coverage:
Demo scenario:
Status:
```

Use this consistently during execution.

---

# 31. QUALITY GATES

## Gate A — Repository Ready

```text
[ ] Local boot works
[ ] Test command works
[ ] Configuration documented
[ ] Secrets excluded
```

## Gate B — Foundation Ready

```text
[ ] Database works
[ ] Authentication works
[ ] RBAC works
[ ] Health check works
```

## Gate C — Evaluation Ready

```text
[ ] Cycle
[ ] Scripts
[ ] Questions
[ ] Marks
[ ] Events
```

## Gate D — Validation Ready

```text
[ ] Deterministic rules
[ ] Evidence
[ ] Correction flow
```

## Gate E — Intelligence Ready

```text
[ ] Statistical detector
[ ] Minimum sample handling
[ ] Evidence
[ ] Seeded anomaly
```

## Gate F — Moderation Ready

```text
[ ] TriageCase
[ ] Queue
[ ] Priority
[ ] Review
[ ] Resolution
[ ] Reason
[ ] Audit
```

## Gate G — Quality Loop Ready

```text
[ ] Revaluation
[ ] Learning insight
[ ] Calibration candidate
```

## Gate H — AI Ready

```text
[ ] AI optional
[ ] AI isolated
[ ] AI advisory
[ ] Failure-safe
```

## Gate I — Demo Ready

```text
[ ] Seed reset
[ ] Deterministic signals
[ ] False positive
[ ] Full 5–7 minute path
```

## Gate J — Release Ready

```text
[ ] Unit tests pass
[ ] Integration tests pass
[ ] API tests pass
[ ] Critical UI tests pass
[ ] E2E quality-loop test passes
[ ] Role-boundary tests pass
[ ] AI-boundary tests pass
[ ] Health check passes
[ ] Deployment documented
```

---

# 32. BUILD-BLOCKING FAILURE CONDITIONS

Stop feature expansion and fix the foundation if any of these occur:

- authoritative marks can be modified by analytics;
- AI can change official marks;
- statistical signals can directly trigger punishment;
- moderator resolution can occur without a reason;
- audit history can be silently overwritten;
- a quality signal has no evidence;
- a detector produces anomalies with insufficient sample size;
- the critical workflow depends on AI availability;
- seeded demo results are non-deterministic;
- real student PII becomes necessary for MVP;
- duplicate signals create uncontrolled moderator noise;
- role boundaries are enforced only in the UI;
- a feature breaks the core quality loop.

---

# 33. ARCHITECTURE ANTI-PATTERNS TO PREVENT DURING BUILD

## 1. AI-first grading engine

```text
Answer
 ↓
LLM
 ↓
Final Mark
```

Not allowed.

## 2. Black-box anomaly score

```text
Risk = 0.97
```

with no evidence.

Not allowed.

## 3. Dashboard-only product

A dashboard without intervention and workflow does not close the loop.

## 4. Microservice zoo

Do not split the MVP into many services without a concrete reason.

## 5. AI dependency

The core product must work when AI is disabled.

## 6. Fake integration

Do not claim a real OSM integration when the MVP uses synthetic/mock events.

## 7. Automatic punishment

No AI/statistical output may directly trigger punitive action.

## 8. Conflicting sources of truth

Do not allow analytics or AI to become an alternate authority for official marks.

## 9. Feature-checklist architecture

Do not create isolated modules only to claim hackathon bullet coverage.

## 10. Production theater

Do not add infrastructure complexity solely to appear enterprise-grade.

---

# 34. DEMO STORY CONTRACT

The final demo should communicate:

1. **Problem** — large-scale digital evaluation needs earlier quality visibility.
2. **Intervention** — QualityLoop continuously validates and analyzes evaluation activity.
3. **AI/analytics role** — AI is bounded and analytics expose evidence-backed patterns.
4. **Human role** — humans review and decide.
5. **Workflow improvement** — issues are prioritized before they silently propagate.
6. **Learning loop** — moderation and revaluation produce future calibration insight.
7. **Scalability path** — the same intelligence layer can later sit beside an existing OSM platform.

The demo should not imply:

- production accuracy;
- autonomous grading;
- validated institutional deployment;
- guaranteed anomaly detection;
- real-world regulatory approval.

---

# 35. DEMO DATA CONTRACT

The seed generator should create a coherent world rather than isolated records.

At minimum:

```text
1 Evaluation Cycle
   ├── Questions
   ├── Rubric
   ├── Exemplars
   ├── Evaluators
   ├── Scripts
   │    ├── Answers
   │    └── Marks
   ├── Evaluation Events
   ├── Normal cases
   ├── Incomplete cases
   ├── Statistical anomaly
   ├── Drift scenario
   ├── Legitimate false positive
   ├── Moderation case
   ├── Audit history
   └── Revaluation outcomes
```

The generated relationships must be realistic enough that the dashboard, signal engine and moderation workflow tell the same story.

---

# 36. RESET CONTRACT

A demo reset must:

1. clear or isolate demo state;
2. recreate the known seed;
3. recreate configuration versions;
4. recreate deterministic anomalies;
5. recreate revaluation outcomes;
6. leave the system in a known state.

Expected invariant:

```text
reset()
+
same seed
=
same critical demo state
```

A failed seed operation must not destroy an already-valid dataset.

---

# 37. LOCAL DEVELOPER EXPERIENCE

A new developer should be able to understand:

```text
install dependencies
↓
configure environment
↓
start database
↓
run backend
↓
run frontend
↓
seed demo data
↓
open application
↓
run tests
```

The exact technology may be chosen according to the existing project/team constraints.

Do not lock technology merely because a particular stack is fashionable.

---

# 38. TECHNOLOGY DECISION RULE

For every major technology or dependency, evaluate:

| Criterion | Question |
|---|---|
| Product fit | Does it solve a real requirement? |
| Buildability | Can the team implement it safely? |
| Simplicity | Does it reduce or increase complexity? |
| Reliability | Is it stable enough for the demo? |
| Cost | Can the MVP avoid mandatory paid services? |
| Ecosystem | Is documentation/support adequate? |
| Future path | Can it evolve toward production? |

Document major decisions using ADRs.

---

# 39. ADR REQUIREMENT

Use:

```text
ADR-001
Title:
Context:
Problem:
Options considered:
Decision:
Why:
Trade-offs:
Rejected alternatives:
Consequences:
```

At minimum, record decisions covering:

- architecture style;
- database;
- frontend/backend boundary;
- event strategy;
- analytics strategy;
- AI adapter;
- authentication;
- deployment;
- real-time updates;
- audit strategy.

---

# 40. IMPLEMENTATION TASK BREAKDOWN RULE

When converting this plan into coding tasks:

### Task size

Prefer tasks that produce one testable outcome.

Good:

```text
Implement missing-mark validation rule and tests.
```

Avoid:

```text
Build validation system.
```

### Each task must identify

```text
Task ID
Phase
Goal
Dependencies
Files/modules expected to change
Acceptance criteria
Tests required
Demo impact
Risk
```

### Dependency order

Do not start a task whose required domain contract does not exist.

Example:

```text
Cannot build TriageCase UI
until
TriageCase domain/API contract exists.
```

---

# 41. RECOMMENDED IMPLEMENTATION TASK SEQUENCE

## Foundation

- B001 Repository baseline
- B002 Environment/configuration
- B003 Persistence baseline
- B004 Authentication
- B005 RBAC
- B006 Health endpoint
- B007 Logging/correlation

## Evaluation

- B010 EvaluationCycle model
- B011 Question/rubric/exemplar model
- B012 Evaluator model
- B013 Script/answer/mark model
- B014 EvaluationEvent model
- B015 Evaluation commands
- B016 Evaluation queries
- B017 Evaluation tests

## Validation

- B020 Validation contract
- B021 Missing-mark rule
- B022 Invalid-range rule
- B023 Total-mismatch rule
- B024 Required-field/state rules
- B025 Validation evidence
- B026 Validation integration

## Quality intelligence

- B030 QualitySignal model
- B031 Detector contract
- B032 Evaluator-deviation detector
- B033 Distribution detector
- B034 Drift detector
- B035 Minimum-sample handling
- B036 Detector provenance
- B037 Seeded anomaly scenarios

## Triage/moderation

- B040 Correlation/deduplication
- B041 TriageCase model
- B042 Priority calculation
- B043 Priority rationale
- B044 Moderator queue
- B045 Case detail/evidence
- B046 Resolution actions
- B047 Resolution reasons
- B048 False-positive flow

## Audit

- B050 Audit model
- B051 Audit writer
- B052 Audit viewer
- B053 Historical integrity tests

## QualityPulse

- B060 Dashboard summary
- B061 Quality signal views
- B062 Evaluator/question drill-down
- B063 Triage queue integration
- B064 Empty/stale states

## Calibration

- B070 Calibration candidate model
- B071 Exemplar flow
- B072 Calibration workflow
- B073 Human approval
- B074 Calibration audit

## Revaluation/learning

- B080 Revaluation model
- B081 Original/revised mark flow
- B082 Revaluation hotspot detector
- B083 Learning insight
- B084 Calibration candidate generation
- B085 Small-sample behavior

## AI

- B090 AI adapter interface
- B091 Context builder
- B092 Provider implementation
- B093 Response validation
- B094 Advisory UI
- B095 AI failure fallback
- B096 AI boundary tests

## Demo

- B100 Seed generator
- B101 Reset command
- B102 Normal scenario
- B103 Incomplete scenario
- B104 Anomaly scenario
- B105 Drift scenario
- B106 False-positive scenario
- B107 Revaluation scenario
- B108 Full E2E demo test
- B109 Demo runbook

## Release

- B110 Full test pass
- B111 Security/RBAC verification
- B112 Deployment configuration
- B113 Production-like smoke test
- B114 Final acceptance gate

The exact task breakdown may change when the repository is inspected, but the dependency logic must remain.

---

# 42. REQUIREMENT-TO-TEST TRACEABILITY

Every major requirement must have at least one verification mechanism.

| Requirement | Primary verification |
|---|---|
| Human authority | Role + mutation boundary tests |
| Deterministic validation | Unit + integration tests |
| Evidence | Signal/evidence assertions |
| Statistical intelligence | Seeded detector tests |
| Minimum sample | Edge-case tests |
| Triage | Integration + UI tests |
| Explainable priority | Priority rationale assertions |
| Human resolution | Moderation E2E |
| Required reason | Negative test |
| Auditability | Audit integration tests |
| Calibration | Calibration workflow test |
| Revaluation | Revaluation test |
| Learning | Full-loop E2E |
| AI optionality | AI-disabled E2E |
| AI safety | AI boundary tests |
| Synthetic data | Seed/reset determinism |
| RBAC | Authorization tests |
| OSM integration boundary | Adapter contract tests |
| Demo determinism | Repeated seeded runs |

---

# 43. FULL QUALITY-LOOP TEST CONTRACT

The architecture/build is not accepted until this scenario works:

```text
Seed normal data
       ↓
Seed incomplete evaluation
       ↓
Validation Engine catches it
       ↓
Seed anomaly
       ↓
Analytics detects it
       ↓
Signal gets evidence
       ↓
Signals are correlated/deduplicated
       ↓
TriageCase enters queue
       ↓
Priority is calculated with rationale
       ↓
Moderator reviews
       ↓
Moderator resolves with reason
       ↓
Audit event exists
       ↓
Revaluation hotspot is generated
       ↓
Learning insight appears
       ↓
Calibration candidate exists
       ↓
Next-cycle guidance can be demonstrated
```

---

# 44. FALSE-POSITIVE TEST CONTRACT

At least one legitimate false positive is mandatory.

```text
Unusual pattern
      ↓
Moderator investigates
      ↓
Legitimate variation
      ↓
Dismiss
      ↓
Reason
      ↓
Audit
```

This is not a cosmetic test.

It demonstrates that QualityLoop assists humans rather than automatically accusing people.

---

# 45. FAILURE-MODE TEST MATRIX

| Failure | Expected system behavior |
|---|---|
| AI unavailable | Core workflow continues |
| AI malformed response | Reject/contain response |
| AI unsupported claim | Do not treat as authoritative |
| Database unavailable | Clear failure state; no silent corruption |
| Duplicate event | Controlled/idempotent handling |
| Duplicate signal | Correlation/deduplication |
| Insufficient sample | No unreliable anomaly |
| Legitimate anomaly | Moderator can dismiss |
| Missing evidence | Signal cannot be considered complete |
| Missing resolution reason | Resolution blocked |
| Unauthorized action | Denied |
| Stale data | Stale state shown |
| Seed failure | Existing valid data preserved |
| Reopened case | History preserved |
| Small revaluation sample | Insufficient-evidence state |
| Conflicting moderator action | Controlled escalation |

---

# 46. SECURITY ACCEPTANCE GATE

Before release:

```text
[ ] No real student PII required
[ ] Secrets are externalized
[ ] RBAC enforced server/application side
[ ] Audit access controlled
[ ] Unauthorized mutation blocked
[ ] AI provider credentials protected
[ ] Internal stack traces not exposed
[ ] Sensitive configuration not exposed
[ ] Synthetic/public data rights are understood
```

---

# 47. PERFORMANCE ACCEPTANCE GATE

The MVP is acceptable when:

```text
[ ] Main pages load responsively
[ ] Moderator queue is usable
[ ] Dashboard queries are reasonable
[ ] Seed/reset is predictable
[ ] Event processing is reliable
[ ] No unnecessary distributed infrastructure is required
```

Exact production-scale performance targets are not implied by the prototype.

---

# 48. DEPLOYMENT PLAN

## Local

```text
Frontend
   ↓
Backend
   ↓
Database
   ↓
Optional AI provider
```

The local environment should be easy to reproduce.

## MVP deployment

Prefer the simplest deployment that supports:

- frontend;
- backend;
- database;
- optional AI adapter;
- environment configuration.

## Production evolution

Future direction may introduce:

- institutional identity;
- stronger security;
- OSM integration adapters;
- larger analytics workloads;
- validated AI;
- stronger operational observability.

Do not implement production infrastructure merely for the hackathon.

---

# 49. FUTURE OSM INTEGRATION CONTRACT

The MVP should expose a clean conceptual boundary:

```text
Existing OSM
     ↓
Integration Adapter
     ↓
Evaluation Events
     ↓
QualityLoop
```

The adapter should eventually translate external OSM events into the internal event contract.

Potential external events include:

```text
script assigned
answer viewed
question marked
total updated
script submitted
revaluation completed
```

The core domain must not depend directly on an external vendor's API model.

---

# 50. BUILD REVIEW CHECKLIST

Before accepting a phase, ask:

### Product

- Does this implementation solve a validated problem?
- Does it belong to the QualityLoop lifecycle?
- Is it required for the current MVP?

### Architecture

- Does it respect module boundaries?
- Does it preserve source-of-truth rules?
- Does it avoid unnecessary infrastructure?

### Trust

- Can humans override?
- Is evidence visible?
- Can false positives be dismissed?
- Is the action auditable?

### AI

- Is AI genuinely useful?
- Could deterministic rules/statistics do the job more safely?
- Does the core workflow work without AI?

### Data

- Is synthetic data sufficient?
- Are authoritative and derived data separated?
- Are relationships realistic?

### Demo

- Is the behavior deterministic?
- Can it be reproduced from a clean reset?
- Does it improve the story rather than add noise?

---

# 51. BUILD REVIEW: QUESTIONS THAT MUST BE ANSWERED

Before moving to the next stage, the implementation agent must answer:

1. What changed?
2. Which PRD requirement does it satisfy?
3. Which architecture component owns it?
4. What authoritative data does it touch?
5. What derived data does it create?
6. What roles can access it?
7. What can fail?
8. How does it fail safely?
9. How is it tested?
10. How is it observable?
11. How is it demonstrated?
12. What remains intentionally unimplemented?
13. Did any implementation decision change the product?
14. If yes, where is that decision documented?

---

# 52. CHANGE-CONTROL RULE

Implementation must not silently expand scope.

If a developer discovers a feature that appears useful but is not required:

```text
Do not automatically build it.
```

Instead classify it:

```text
MUST HAVE
SHOULD HAVE
NICE TO HAVE
FUTURE
REJECTED
```

If it changes an established product or architectural decision, record an explicit decision.

---

# 53. SCOPE-DRIFT RED FLAGS

Stop and reassess if implementation starts adding:

- autonomous grading;
- real OCR as a mandatory dependency;
- mobile application before web MVP;
- full OSM scanning;
- ERP integration;
- production identity integration;
- complex queues;
- microservices;
- multiple databases;
- black-box risk scores;
- automatic punitive workflows;
- real student PII;
- unvalidated AI accuracy claims.

---

# 54. QUALITYLOOP MVP DEFINITION OF DONE

The MVP is complete only when all of the following are true:

## Product

- [ ] QualityLoop feels like one product.
- [ ] The end-to-end lifecycle is visible.
- [ ] Primary users can perform their intended workflows.
- [ ] MVP scope remains coherent.

## Data

- [ ] Synthetic data supports the complete story.
- [ ] Authoritative marks are protected.
- [ ] Derived intelligence is distinguishable.
- [ ] Revaluation is separately represented.

## Validation

- [ ] Deterministic checks work.
- [ ] Evidence is visible.
- [ ] Invalid states are handled safely.

## Intelligence

- [ ] Statistical signals work.
- [ ] Minimum sample sizes are respected.
- [ ] Detector provenance exists.
- [ ] False positives are supported.

## Moderation

- [ ] Triage cases work.
- [ ] Priority is explainable.
- [ ] Human resolution works.
- [ ] Resolution reasons are required.

## Audit

- [ ] Important actions are traceable.
- [ ] Historical truth is preserved.

## Learning

- [ ] Revaluation produces meaningful derived insight.
- [ ] Calibration candidates can be generated.
- [ ] Official changes require human approval.

## AI

- [ ] AI is optional.
- [ ] AI is advisory.
- [ ] AI is isolated.
- [ ] AI failure is safe.
- [ ] AI cannot mutate authoritative state.

## Security


### Authorization hard rule

**UI visibility ≠ authorization.**

Hiding a moderator action from an evaluator is not an authorization control. Every governed API/application command must enforce the role boundary server-side.

For example, an evaluator must receive an authorization failure when attempting a moderator-only operation such as:

```text
POST /triage/cases/:id/resolve
```

even if the UI normally hides that action.


- [ ] RBAC works.
- [ ] Secrets are protected.
- [ ] No real PII is required.

## Testing

- [ ] Unit tests pass.
- [ ] Integration tests pass.
- [ ] API tests pass.
- [ ] Critical UI tests pass.
- [ ] E2E quality-loop test passes.
- [ ] Role-boundary tests pass.
- [ ] AI-boundary tests pass.
- [ ] Determinism tests pass.

## Demo

- [ ] Reset works.
- [ ] Seed works.
- [ ] Critical signals reproduce.
- [ ] False-positive scenario works.
- [ ] Complete 5–7 minute story works.

## Documentation

- [ ] Local setup documented.
- [ ] Environment configuration documented.
- [ ] Seed/reset documented.
- [ ] Demo runbook documented.
- [ ] ADRs documented.
- [ ] Known limitations documented.
- [ ] Future production path documented.

---

# 55. FINAL BUILD GATE

Before declaring Step 5 complete, the implementation agent must answer:

### Product

- Does this build implement the actual QualityLoop product rather than a generic OSM system?
- Is the core lifecycle visible?
- Did implementation avoid feature-checklist mentality?

### Quality loop

- Can evaluation activity become a quality signal?
- Can multiple signals become a TriageCase?
- Can a TriageCase become a human resolution?
- Can moderation become auditable learning?
- Can learning influence a future cycle?

### AI

- Is AI optional?
- Is AI bounded?
- Is AI explainable?
- Can the system operate with AI disabled?
- Can AI mutate authoritative state? **It must be no.**

### Analytics

- Are signals evidence-backed?
- Are minimum sample sizes respected?
- Can false positives be safely resolved?

### Trust

- Can humans override advisory signals?
- Can moderators dismiss?
- Are resolution reasons required?
- Are punitive actions impossible from signals alone?

### Data

- Does synthetic data fully support the MVP?
- Are authoritative and derived data separated?
- Can historical configuration be reconstructed?

### Integration

- Is the future OSM boundary explicit?
- Is the MVP honest about simulated/synthetic inputs?

### Buildability

- Can the system be run locally without excessive infrastructure?
- Are dependencies justified?
- Is deployment practical?

### Demo

- Can the 5–7 minute story run deterministically?
- Can the dataset be reset?
- Can every critical moment be reproduced?

---

# 56. FINAL IMPLEMENTATION PRINCIPLE

The build should make this statement demonstrably true:

> **QualityLoop does not replace human academic judgment. It turns digital evaluation activity into a continuous, explainable quality-control loop that helps humans detect, prioritize, review and learn from evaluation risks earlier.**

The implementation should therefore optimize for:

```text
Correctness
   >
Trust
   >
Buildability
   >
Demo Reliability
   >
Maintainability
   >
Scalability
   >
Architectural Sophistication
```

Do not optimize for impressive architecture diagrams or feature count.

A smaller implementation that closes the quality loop reliably is preferable to a larger implementation that cannot be completed or trusted.

---

# 57. FINAL INSTRUCTION FOR THE FUTURE CODING AGENT

When an AI coding/implementation agent receives this file:

1. Treat Step 3 PRD as the product source of truth.
2. Treat Step 4 Architecture as the system-structure source of truth.
3. Treat this file as the build sequencing, testing and quality-gate contract.
4. Do not redesign the product while implementing it.
5. Do not add features merely because they appear in the hackathon statement.
6. Do not make autonomous academic decisions.
7. Do not make AI a mandatory dependency.
8. Do not use an LLM for deterministic problems.
9. Do not allow analytics to overwrite authoritative marks.
10. Do not allow AI to overwrite authoritative marks.
11. Do not create punitive workflows from AI/statistical signals.
12. Do not require real student PII for the MVP.
13. Do not claim real OSM integration when using simulated data.
14. Do not introduce unnecessary distributed infrastructure.
15. Build in dependency order.
16. Do not move past a phase gate while its acceptance criteria fail.
17. Write tests as part of implementation, not after the entire product.
18. Preserve evidence and provenance for every quality signal.
19. Preserve auditability for governed human actions.
20. Keep the critical demo deterministic.
21. Keep false positives visible and safely resolvable.
22. Document significant architectural or product changes as decisions.
23. Keep MUST HAVE, SHOULD HAVE, NICE TO HAVE and FUTURE scope separate.
24. Prefer the simplest mechanism that safely solves each problem.
25. Finish the deterministic/statistical quality loop before investing in AI polish.

---

# 58. HANDOFF TO THE NEXT EXECUTION STAGE

Once this Step 5 plan is accepted, the coding workflow should proceed as:

```text
STEP 5 MASTER BUILD PLAN
        ↓
Repository inspection
        ↓
Implementation task board
        ↓
Phase 0 baseline
        ↓
Phase gates
        ↓
Vertical quality-loop implementation
        ↓
Test gates
        ↓
Demo hardening
        ↓
Release candidate
```

The next agent should not start by building screens or AI prompts in isolation.

It should start by establishing the repository baseline and then implement the **Build Spine**:

```text
Evaluation Event
      ↓
Validation
      ↓
Quality Signal
      ↓
Correlation / Deduplication
      ↓
TriageCase
      ↓
Priority
      ↓
Moderator Review
      ↓
Resolution
      ↓
Audit
      ↓
Revaluation
      ↓
Learning
      ↓
Calibration
```

That spine is the definition of the QualityLoop MVP.


---

# Revised Final Build Order

The implementation order is:

```text
0. Repository inspection
        ↓
1. Foundation
        ↓
2. Evaluation Cycle + Events
        ↓
3. Validation Engine
        ↓
4. Quality Signal Engine
        ↓
5. Correlation + Triage + Moderation + Audit
        ↓
6. QualityPulse / Read Models
        ↓
7. Calibration
        ↓
8. Revaluation + Learning
        ↓
9. Optional AI
        ↓
10. Demo Hardening
        ↓
11. Final System Verification
        ↓
12. Release / Deployment
```

Audit is cross-cutting and required with every governed state-changing workflow; it is not deferred until after moderation is operational.
