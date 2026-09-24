# QualityLoop — Step 5 Operational Chunked Build Master

> **AUTHORITATIVE EXECUTION DOCUMENT.** This document is the operational build contract for implementing QualityLoop in bounded phases. The historical/revised Step 5 documents remain reference material; they are not a second execution plan.

# QualityLoop — Step 5 Chunked Build & Phase Handoff Protocol

## Purpose

This document extends the Step 5 master build plan into a **multi-chunk implementation workflow**.

The project must be built in controlled phases/chunks. Each phase is treated as a self-contained implementation increment with:

1. a clearly bounded scope;
2. explicit inputs and dependencies;
3. implementation tasks;
4. tests and validation;
5. a phase gate;
6. a deterministic completion record;
7. a generated **Phase Context / Handoff file**.

The next phase must begin from the previous phase's context file rather than relying on conversation history.

This prevents architectural drift, repeated work, hidden assumptions, broken dependencies, and context loss between coding-agent sessions.

---

## Operational Build Contract

This master is designed for repeated AI coding-agent sessions.

The agent must:

1. inspect the repository before changing it;
2. read the current phase context;
3. execute only the assigned phase;
4. preserve authoritative-state boundaries;
5. test every implemented contract;
6. verify the phase gate;
7. generate a factual Phase Context;
8. stop.

The agent must not:

- infer missing work from future phases;
- skip a failed gate;
- silently redesign architecture;
- treat derived analytics as authoritative;
- allow AI to mutate authoritative state;
- claim integration that does not exist;
- replace deterministic logic with an LLM;
- start the next phase without explicit instruction.


# 1. Core Chunking Principle

```text
MASTER BUILD PLAN
        ↓
PHASE 0
        ↓
Phase 0 Context
        ↓
PHASE 1
        ↓
Phase 1 Context
        ↓
PHASE 2
        ↓
Phase 2 Context
        ↓
...
        ↓
PHASE N
        ↓
Final Build Context
```

Every phase produces two outputs:

```text
A. Working repository changes
B. Phase Context / Handoff document
```

The context document is a **build artifact**, not optional documentation.

---

# 2. Phase Isolation Contract

Each phase must satisfy:

```text
INPUT
  ↓
Inspect previous context
  ↓
Inspect repository
  ↓
Implement only this phase
  ↓
Run phase tests
  ↓
Run regression tests
  ↓
Verify architectural invariants
  ↓
Record actual repository state
  ↓
Generate phase context
  ↓
PASS / BLOCKED
```

A coding agent must not silently continue into the next phase.

If the phase gate fails:

```text
PHASE FAILED
    ↓
Fix within current phase
    ↓
Re-run gate
    ↓
Generate context only after stable result
```

---

# 3. Source-of-Truth Hierarchy for Chunked Execution

At the start of every phase, use this hierarchy:

```text
1. CURRENT REPOSITORY REALITY
2. CURRENT / PREVIOUS PHASE CONTEXT
3. THIS CHUNKED STEP 5 MASTER
4. STEP 4 ARCHITECTURE
5. STEP 3 PRD
6. EARLIER PROJECT DOCUMENTS
```

The repository is the immediate implementation truth because a human may have legitimately changed it after the previous context was written.

However:

> If repository reality conflicts with a core architectural invariant, the agent must STOP, report the discrepancy, and obtain human direction. It must not silently redesign the architecture.

For every material discrepancy:

1. identify the planned state;
2. identify the actual state;
3. identify the impact;
4. record the discrepancy in the Phase Context;
5. determine whether the phase can safely continue;
6. escalate to human review when a core invariant, authoritative-state rule, security boundary, or data contract is affected.

---

# 4. Mandatory Phase Context File

After every completed phase, create:

```text
docs/build-context/
    quality-loop-phase-00-context.md
    quality-loop-phase-01-context.md
    quality-loop-phase-02-context.md
    ...
    quality-loop-phase-12-context.md
```

Use this exact naming convention.

Do not overwrite a completed phase context except through an explicitly documented correction.

If a phase is rerun, create a revision:

```text
quality-loop-phase-05-context-v2.md
```

The latest approved context must identify itself as the active context.

---

# 5. Phase Context Contract

Every completed or blocked phase MUST produce a Phase Context file. It is a build artifact and must describe **actual repository state**, not intended state.

The canonical context schema is:

```text
# Phase X Context

## 1. Phase Identity
## 2. Phase Objective
## 3. Scope Completed
## 4. Scope Not Completed
## 5. Repository State
## 6. Files Created
## 7. Files Modified
## 8. Files Deleted
## 9. Database / Schema Changes
## 10. API / Contract Changes
## 11. Domain Model Changes
## 12. Architecture Decisions
## 13. Invariants Preserved
## 14. New Invariants Introduced
## 15. Configuration / Environment Changes
## 16. Dependencies
## 17. Tests Added
## 18. Tests Executed
## 19. Test Results
## 20. Known Limitations
## 21. Technical Debt
## 22. Deferred Decisions
## 23. Integration Points for Next Phase
## 24. Next Phase Preconditions
## 25. Do Not Change Rules
## 26. Important Implementation Notes
## 27. Deterministic Demo / Seed State
## 28. Security / Authorization State
## 29. Audit State
## 30. Handoff Summary
## 31. Phase Gate Result
## 32. Context Diff
## 33. Open Risks / Blockers
## 34. Source-of-Truth Impact
## 35. Repository Reality Check
## 36. Migration Safety
## 37. API Contract Compatibility
## 38. Next Phase Task Inputs
## 39. Exact Commands
```

### Required status vocabulary

Do not mix phase status with work-item status.

**Phase status:**

```text
NOT_STARTED
IN_PROGRESS
BLOCKED
COMPLETE
DEFERRED
```

**Work-item status:**

```text
PLANNED
IMPLEMENTED
TESTED
VERIFIED
DEFERRED
BLOCKED
```

### Phase Gate Result

Every context must explicitly state:

```text
Status: PASS / BLOCKED / FAILED

Gate evidence:
- ...
```

### Context Diff

Every context must show:

```text
BEFORE
  What was true at phase start.

CHANGED
  What this phase actually changed.

AFTER
  What is true now, verified against the repository.
```

### Open Risks / Blockers

Record each known issue with:

```text
Issue
Impact
Blocking? YES/NO
Owner/next action
Target phase
```

### Source-of-Truth Impact

Explicitly classify:

```text
Authoritative data affected:
Derived data affected:
No source-of-truth change:
```

Core QualityLoop rule:

```text
AUTHORITATIVE
- official marks
- official rubric/policy
- governed human moderation decisions

DERIVED
- validation results
- QualitySignals
- statistics
- priority recommendations
- dashboards/read models
- AI outputs
- LearningInsights
- calibration candidates
```

### Repository Reality Check

The context must include a compact planned-vs-actual table:

| Area | Planned | Actual | Status |
|---|---|---|---|
| Auth | ... | ... | ... |
| Database | ... | ... | ... |
| API | ... | ... | ... |
| UI | ... | ... | ... |
| Tests | ... | ... | ... |

### Migration Safety

For database-changing phases record:

```text
Schema change:
Migration added:
Migration tested:
Migration reversible:
Seed updated:
Existing-data impact:
Rollback considerations:
```

### API Contract Compatibility

For API-changing phases record:

```text
New endpoints:
Modified endpoints:
Removed endpoints:
Request schema changes:
Response schema changes:
Authorization:
Backward compatibility:
Frontend consumers:
Contract tests:
```

### Next Phase Task Inputs

The context must identify:

```text
Required next-phase task IDs:
Blocked next-phase tasks:
Recommended first task:
Shared contracts to consume:
Integration points:
```

### Exact Commands

Record the exact commands actually used for:

```text
Install:
Dev:
Test:
Lint:
Typecheck:
Seed:
Reset:
Build:
Migration:
Deploy:
Smoke test:
```

# 6. Phase Context Must Be Generated From Reality

The coding agent must not write:

```text
Implemented:
X
Y
Z
```

unless X, Y, and Z actually exist and were verified.

The context must distinguish:

```text
PLANNED
IMPLEMENTED
TESTED
VERIFIED
DEFERRED
BLOCKED
```

A useful status format is:

| Item | Status | Evidence |
|---|---|---|
| Domain model | IMPLEMENTED | file/module + test |
| API endpoint | IMPLEMENTED | route + integration test |
| UI screen | IMPLEMENTED | route/component + E2E test |
| Audit behavior | VERIFIED | audit integration test |
| AI adapter | DEFERRED | Phase 9 |
| External OSM integration | NOT IMPLEMENTED | future boundary |

---

# 7. Phase Execution Packet

Every coding-agent phase must receive a bounded execution packet.

The packet must contain:

```text
PHASE ID
PHASE NAME
OBJECTIVE
INPUT CONTEXT FILE
MASTER PLAN SECTIONS
TASK IDS
DEPENDENCIES
IN-SCOPE
OUT-OF-SCOPE
REQUIRED TESTS
PHASE GATE
EXPECTED CONTEXT OUTPUT
```

The agent must not infer missing scope from the next phase.

---

# 8. Phase Distribution

# 8.1 Canonical Phase Map

This is the **only authoritative phase numbering** in the project:

| Phase | Name | Primary output |
|---:|---|---|
| 0 | Repository Inspection & Build Baseline | Reality/context baseline |
| 1 | Foundation & Shared Contracts | Stable shared foundation |
| 2 | Evaluation Cycle + Evaluation Events | Authoritative evaluation domain |
| 3 | Deterministic Validation Engine | Explainable validation |
| 4 | Quality Signal Engine | Evidence-backed signals |
| 5 | Correlation + Triage + Moderation + Audit | Human quality workflow |
| 6 | QualityPulse + Query / Read Models | Operational visibility |
| 7 | Calibration Domain | Human calibration workflow |
| 8 | Revaluation + Learning Loop | Closed learning loop |
| 9 | Optional AI Assistance | Bounded AI assistance |
| 10 | Demo Hardening | Deterministic canonical demo |
| 11 | Final System Verification | Cross-phase verification |
| 12 | Release / Deployment | Reproducible release |

**No other document may redefine Phase 0–12 numbering.**

Historical Step 5 documents may contain older phase numbering. They are reference-only and must not be used to interpret a `quality-loop-phase-XX-context.md` file.


## PHASE 0 — Repository Inspection & Build Baseline

### Execution Metadata

- **Task IDs:** `P00-001..P00-008`
- **Phase dependency:** `None`
- **Parallel-safe work:** Repository inventory, command discovery, and architecture mapping can be inspected in parallel; findings merge into one baseline.
- **Integration point:** All parallel work must converge before the phase gate.

### Objective

Understand the real repository before modifying it.

### Scope

- repository inventory;
- runtime/framework detection;
- package/dependency inventory;
- database detection;
- current routes/pages;
- current tests;
- existing domain models;
- existing authentication/authorization;
- existing configuration;
- existing seed/demo data;
- build and test commands;
- architecture-to-repository mapping;
- identify existing reusable code;
- identify conflicts with Step 3/4/5.

### Must NOT do

- do not redesign architecture;
- do not create unnecessary modules;
- do not implement product features merely because they are planned.

### Exit Gate

The agent can answer:

```text
What exists?
What is missing?
What can be reused?
What must be changed?
What must not be changed?
How will Phase 1 build on this repository?
```

### Context Output

`quality-loop-phase-00-context.md`

---

# PHASE 1 — Foundation & Shared Contracts

### Objective

Establish the stable foundation required by every later phase.

### Scope

- project configuration;
- shared types;
- identifiers;
- timestamps;
- error model;
- validation primitives;
- role model;
- authorization primitives;
- repository/service conventions;
- persistence conventions;
- migration/seed conventions;
- deterministic seed/reset contract (infrastructure contract only; canonical demo reset is Phase 10);
- test infrastructure;
- audit infrastructure contract;
- observability/logging baseline.

### Important Rule

Audit infrastructure may be introduced here, but audit behavior for a governed action is only complete when that action is implemented.

### Exit Gate

Foundation builds, tests pass, the deterministic seed/reset contract is defined, and shared conventions are documented. The canonical demo reset is not required until Phase 10.

### Context Output

`quality-loop-phase-01-context.md`

---

# PHASE 2 — Evaluation Cycle + Evaluation Events

### Objective

Implement the evaluation activity domain without full event sourcing.

### Scope

- evaluation cycle;
- evaluator;
- script;
- answer;
- mark;
- evaluation event;
- evaluation event provenance;
- cycle status;
- deterministic development/test fixtures (not the final hackathon demo dataset);
- evaluation APIs/services;
- evaluation tests.

### Architectural rule

This is event-aware, not event-sourced.

```text
Authoritative evaluation state
        +
EvaluationEvent records
```

Events must not become an alternate source of truth for official marks.

### Exit Gate

A deterministic evaluation cycle can be created, evaluated, queried, and traced. Development fixtures are reproducible; the canonical end-to-end demo dataset remains a Phase 10 responsibility.

### Context Output

`quality-loop-phase-02-context.md`

---

# PHASE 3 — Deterministic Validation Engine

### Objective

Implement deterministic validation before statistical intelligence.

### Scope

- validation contract;
- rule registry;
- validation result;
- severity;
- validation provenance;
- rule version;
- configuration version;
- deterministic rule execution;
- validation APIs/services;
- false-positive-safe rules;
- validation tests.

### Exit Gate

Known invalid conditions are detected deterministically, valid cases remain valid, and every result is explainable.

### Context Output

`quality-loop-phase-03-context.md`

---

# PHASE 4 — Quality Signal Engine

### Objective

Convert validated/statistical observations into evidence-bearing `QualitySignal` records.

### Scope

- QualitySignal model;
- detector contract;
- detector registry;
- detector versioning;
- configuration versioning;
- evaluator deviation;
- score distribution anomaly;
- evaluator drift;
- sample-size safeguards;
- evidence contract;
- baseline representation;
- data window;
- limitations;
- signal provenance;
- deterministic signal generation.

### QualitySignal lifecycle

```text
GENERATED
    ↓
CORRELATED / GROUPED
    ↓
LINKED_TO_CASE
```

Do not use moderator workflow states such as `RESOLVED` on a raw signal.

### Exit Gate

Every signal is reproducible, evidence-bearing, versioned, and explainable.

### Context Output

`quality-loop-phase-04-context.md`

---

# PHASE 5 — Correlation + Triage + Moderation + Audit

### Objective

Turn signals into governed human-review workflows.

### Scope

- correlation;
- deduplication;
- grouping;
- TriageCase;
- case priority;
- severity/priority separation;
- moderator queue;
- case detail;
- review;
- dismiss;
- resolve;
- escalate;
- needs-more-data;
- request calibration;
- server-side role enforcement;
- audit records for every governed action.

### TriageCase lifecycle

```text
OPEN
 ↓
IN_REVIEW
 ├── RESOLVED
 ├── DISMISSED
 ├── ESCALATED
 └── NEEDS_MORE_DATA
```

### Audit requirement

Every governed state-changing action must emit its audit record as part of the same implementation increment.

### Priority ownership

```text
Signal evidence
    ↓
Rules / statistics
    ↓
Priority
    ↓
Optional AI explanation
    ↓
Human moderator decision
```

AI must not be the authoritative priority calculator.

### Exit Gate

A complete signal-to-human-resolution workflow works with audit coverage and role-boundary enforcement.

### Context Output

`quality-loop-phase-05-context.md`

---

# PHASE 6 — QualityPulse + Query / Read Models

### Objective

Build the operational intelligence dashboard without coupling the frontend to persistence tables.

### Scope

- dashboard query services;
- moderator queue query;
- quality analytics query;
- cycle overview;
- signal trends;
- case trends;
- evaluator quality views;
- filters;
- pagination;
- drill-down;
- dashboard API;
- frontend views;
- query performance baseline.

### Architecture

```text
Operational domain data
        ↓
Query / Read Model
        ↓
QualityPulse API
        ↓
Frontend
```

A separate database is not required for the MVP.

### Exit Gate

Dashboard values match authoritative/derived data and frontend code does not reconstruct domain joins from raw persistence tables.

### Context Output

`quality-loop-phase-06-context.md`

---

# PHASE 7 — Calibration Domain

### Objective

Implement human-guided calibration as a separate domain workflow.

### Scope

- rubric reference;
- exemplar;
- CalibrationCandidate;
- CalibrationSession;
- evaluator response;
- calibration outcome;
- session lifecycle;
- acknowledgement;
- calibration APIs;
- calibration UI;
- audit.

### Domain relationship

Phase 7 establishes the calibration destination/workflow. It may use manually seeded or test `CalibrationCandidate` records.

```text
CalibrationCandidate
      ↓
Human approval
      ↓
CalibrationSession
      ↓
EvaluatorResponse
      ↓
CalibrationOutcome
```

Phase 8 later supplies the learning-derived producer:

```text
Revaluation
      ↓
LearningInsight
      ↓
CalibrationCandidate
```

This avoids a circular implementation dependency: Phase 7 builds the calibration infrastructure; Phase 8 connects revaluation-derived learning to it.

### Exit Gate

A calibration session can be created, completed, acknowledged, audited, and linked to the relevant cycle/rubric/exemplar context.

### Context Output

`quality-loop-phase-07-context.md`

---

# PHASE 8 — Revaluation + Learning Loop

### Objective

Implement post-evaluation revaluation and learning without silently changing authoritative marks.

### Scope

- revaluation request;
- revaluation record;
- affected answer/script;
- reason;
- old/new value;
- reviewer;
- timestamp;
- revaluation outcome;
- learning insight;
- hotspot detection;
- learning aggregation;
- linkage to calibration candidates.

### Dependency rule

Revaluation hotspot detection belongs here, after revaluation exists.

### Learning flow

```text
Revaluation
    ↓
Learning Insight
    ↓
Calibration Candidate
    ↓
Human Approval
    ↓
Calibration
    ↓
Next Cycle
```

### Exit Gate

Revaluation is separately represented from original evaluation, fully auditable, and capable of generating learning insights.

### Context Output

`quality-loop-phase-08-context.md`

---

# PHASE 9 — Optional AI Assistance

### Objective

Add bounded AI only after deterministic workflows are stable.

### Scope

- AI adapter;
- provider abstraction;
- prompt/version metadata;
- explanation;
- summarization;
- evidence-grounded assistance;
- confidence/uncertainty;
- AI invocation logging;
- fallback behavior;
- AI boundary tests.

### AI MUST NOT

- assign authoritative marks;
- mutate official marks;
- determine authoritative priority;
- resolve a TriageCase;
- dismiss a case;
- change rubric definitions;
- change institutional policy;
- bypass authorization;
- become the source of truth.

### Exit Gate

AI can assist without changing authoritative state and deterministic behavior remains available when AI is unavailable.

### Context Output

`quality-loop-phase-09-context.md`

---

# PHASE 10 — Demo Hardening

### Objective

Make the entire QualityLoop loop deterministic and demonstrable.

### Scope

- canonical synthetic dataset;
- seed/reset;
- demo scenarios;
- false-positive scenario;
- known anomaly scenario;
- known resolution scenario;
- dashboard narrative;
- role-specific demo;
- audit walkthrough;
- revaluation-to-learning scenario;
- calibration scenario;
- optional AI scenario.

### Canonical demo story

```text
Evaluation
   ↓
Validation
   ↓
QualitySignal
   ↓
Correlation
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
Learning Insight
   ↓
Calibration Candidate
   ↓
Human Approval
   ↓
Next Cycle
```

### Exit Gate

The same seed produces the same core demo state and results.

### Context Output

`quality-loop-phase-10-context.md`

---

# PHASE 11 — Final System Verification

### Objective

Perform complete cross-phase verification before release.

### Scope

- unit test suite;
- integration tests;
- API tests;
- UI tests;
- E2E quality-loop test;
- role-boundary tests;
- authorization tests;
- audit completeness;
- determinism tests;
- false-positive tests;
- AI-boundary tests;
- migration/seed tests;
- regression tests;
- build verification;
- dependency/security checks available in the repository.

### Required E2E

At minimum:

```text
Evaluation
 → Validation
 → QualitySignal
 → Correlation
 → TriageCase
 → Priority
 → Moderator Review
 → Resolution
 → Audit
 → Revaluation
 → Learning
 → Calibration
```

### Exit Gate

All required gates pass. No known blocking defect remains.

### Context Output

`quality-loop-phase-11-context.md`

---

# PHASE 12 — Release / Deployment

### Objective

Package the verified system for reproducible deployment.

### Scope

- production configuration;
- environment documentation;
- migration procedure;
- seed/reset procedure;
- deployment procedure;
- rollback procedure;
- health checks;
- observability;
- release checklist;
- final architecture snapshot;
- final build context.

### Exit Gate

A clean environment can reproduce the documented deployment and the smoke test passes.

### Context Output

`quality-loop-phase-12-context.md`

---

# 8.5 Cross-Phase Dependency and Parallelization Rules

### Sequential dependency

A phase may not be marked `COMPLETE` while an earlier blocking phase remains `BLOCKED`.

### Explicit parallelization

Parallel work is allowed only when this master explicitly identifies it as parallel-safe or a human explicitly authorizes it.

An AI agent must not invent parallelization across phases.

Every parallel branch must have:

```text
Shared contract
Branch scope
Integration point
Contract tests
Merge verification
```

### No phase skipping

A later phase may not be declared complete because an earlier phase is incomplete.

Exception:

```text
Human explicitly authorizes documented parallelization
+
Dependencies are satisfied
+
No authoritative-state/security/audit invariant is bypassed
```

### No cross-phase scope leakage

If implementation discovers work belonging to a later phase:

```text
Do not silently implement it.
Record it as DEFERRED.
Add it to the next-phase task inputs.
```

# 9. Phase Boundary Rules

A phase may only be marked COMPLETE when:

```text
[ ] Scope implemented
[ ] Scope not-completed items documented
[ ] Tests added
[ ] Tests executed
[ ] Regression tests executed
[ ] Repository inspected after implementation
[ ] Architecture invariants verified
[ ] Security/authorization verified
[ ] Audit requirement verified where applicable
[ ] Determinism verified where applicable
[ ] No hidden TODOs for in-scope requirements
[ ] Known limitations documented
[ ] Next-phase prerequisites documented
[ ] Phase Context generated
[ ] Phase Gate Result explicitly recorded as PASS / BLOCKED / FAILED
[ ] Context Diff recorded
[ ] Open Risks / Blockers recorded
[ ] Source-of-Truth Impact recorded
[ ] Repository Reality Check recorded
[ ] Migration Safety recorded when schema changed
[ ] API Contract Compatibility recorded when API changed
[ ] Next Phase Task Inputs recorded
[ ] Exact commands recorded
```

A phase is **COMPLETE only when the gate is PASS**. A BLOCKED or FAILED phase must not be represented as complete merely because some implementation exists.

---

# 10. What the Next Coding Agent Must Read

At the start of Phase N:

```text
READ:
1. Previous Phase Context
2. Step 5 Master
3. Relevant Step 3/4 sections
4. Current repository
5. Current tests
```

Then produce an execution report:

```text
Previous context understood: YES/NO
Repository state understood: YES/NO
Dependencies satisfied: YES/NO
Scope understood: YES/NO
Phase gate from previous phase: PASS/BLOCKED/FAILED
Repository/context discrepancies: ...
Planned files/modules: ...
Planned tests: ...
Planned migrations: ...
Planned API contract changes: ...
```

Only after this inspection should implementation begin.

If the previous context says `COMPLETE` but repository reality contradicts it, stop and reconcile the discrepancy before implementing the new phase.

---

# 11. Context Continuity Rules

The next agent must never assume:

```text
"I remember what the previous agent did."
```

Instead it must establish:

```text
Previous Context
      ↓
Repository verification
      ↓
Current truth
```

If the context says a feature exists but the repository does not contain it, the repository is the immediate implementation truth and the discrepancy must be recorded.

If the repository contains an undocumented architectural change, do not silently normalize it. Record it as an architecture drift item.

---

# 12. Phase Context Example Template

Every phase context should follow this structure:

```markdown
# QualityLoop — Phase XX Context

## 1. Phase Identity

- Phase:
- Name:
- Status:
- Completion date:
- Context version:
- Previous context:
- Next phase:

## 2. Objective

What this phase was responsible for.

## 3. Scope Completed

- ...

## 4. Scope Not Completed

- ...

## 5. Repository State

### Relevant directories

```text
...
```

### Build/test commands

```text
...
```

## 6. Files Created

- ...

## 7. Files Modified

- ...

## 8. Files Deleted

- ...

## 9. Database / Schema Changes

- ...

## 10. API / Contract Changes

- ...

## 11. Domain Model Changes

- ...

## 12. Architecture Decisions

- Decision:
- Reason:
- Alternatives rejected:
- Impact:

## 13. Invariants Preserved

- ...

## 14. New Invariants

- ...

## 15. Configuration / Environment

- ...

## 16. Dependencies

- Completed dependencies:
- External dependencies:
- Deferred dependencies:

## 17. Tests Added

- ...

## 18. Tests Executed

```text
command
result
```

## 19. Test Results

- Passed:
- Failed:
- Skipped:
- Known flaky:

## 20. Known Limitations

- ...

## 21. Technical Debt

- ...

## 22. Deferred Decisions

- ...

## 23. Integration Points for Next Phase

- ...

## 24. Next Phase Preconditions

- ...

## 25. Do Not Change Rules

- ...

## 26. Important Implementation Notes

- ...

## 27. Deterministic Demo / Seed State

- Seed:
- Reset behavior:
- Canonical scenario:

## 28. Security / Authorization State

- Roles:
- Server-side enforcement:
- Tested boundaries:

## 29. Audit State

- Audited actions:
- Audit gaps:
- Audit viewer/API state:

## 30. Handoff Summary

### Current system truth

...

### Next agent must start with

...

### Next agent must NOT do

...

### Recommended first task

...
```

---

# 13. Context Quality Gate

A Phase Context file is invalid if it:

- describes planned work as completed;
- omits failed tests;
- omits known limitations;
- omits changed files;
- omits schema/API changes;
- omits architectural decisions;
- omits authorization changes;
- omits audit status where applicable;
- claims determinism without testing;
- contains unresolved contradictions with the repository;
- gives no actionable next-phase prerequisites.

---

# 14. Context Diff Requirement

At the end of every phase, the agent should produce a compact change summary:

```text
BEFORE PHASE
    ↓
WHAT CHANGED
    ↓
AFTER PHASE
```

For example:

```text
BEFORE
No QualitySignal domain.

AFTER
QualitySignal exists with:
- detectorVersion
- configurationVersion
- evidence
- baseline
- sampleSize
- provenance

Tests:
12 unit
4 integration
1 deterministic replay
```

This summary belongs in the phase context.

---

# 15. No Cross-Phase Scope Leakage

A phase may discover future requirements, but must not implement them merely because they are visible.

Example:

Phase 4 discovers that revaluation hotspot detection will eventually be useful.

Correct:

```text
Document dependency.
Defer to Phase 8.
```

Incorrect:

```text
Implement partial revaluation during Phase 4.
```

This keeps each chunk reviewable and prevents hidden coupling.

---

# 16. Emergency / Correction Protocol

If a later phase discovers a defect in an earlier phase:

```text
Later phase detects defect
        ↓
Create defect record
        ↓
Determine whether it blocks current phase
        ↓
If non-blocking:
  continue + document
        ↓
If blocking:
  return to owning phase
        ↓
fix
        ↓
rerun owning phase gate
        ↓
update owning context
        ↓
update dependent context if necessary
```

Never patch around a foundational defect merely to make the current phase pass.

---

# 17. Phase Status Vocabulary

Use only these statuses:

```text
NOT_STARTED
IN_PROGRESS
BLOCKED
IMPLEMENTED
VERIFIED
COMPLETE
DEFERRED
```

`COMPLETE` means the phase gate passed and the context file was generated.

---

# 18. Recommended Repository Structure

Where practical:

```text
docs/
  architecture/
  product/
  build/
  build-context/
    quality-loop-phase-00-context.md
    quality-loop-phase-01-context.md
    quality-loop-phase-02-context.md
    quality-loop-phase-03-context.md
    quality-loop-phase-04-context.md
    quality-loop-phase-05-context.md
    quality-loop-phase-06-context.md
    quality-loop-phase-07-context.md
    quality-loop-phase-08-context.md
    quality-loop-phase-09-context.md
    quality-loop-phase-10-context.md
    quality-loop-phase-11-context.md
    quality-loop-phase-12-context.md
```

The exact repository location may be adapted after Phase 0 inspection.

---

# 19. Human Review Points

Human review is required at these boundaries:

### Review Gate A
After Phase 0:

```text
Repository ↔ Architecture mapping
```

### Review Gate B
After Phase 5:

```text
Signal → Case → Human moderation → Audit
```

### Review Gate C
After Phase 8:

```text
Revaluation → Learning → Calibration
```

### Review Gate D
After Phase 9:

```text
AI boundaries
```

### Review Gate E
After Phase 11:

```text
Full system verification
```

### Review Gate F
After Phase 12:

```text
Release readiness
```

These are checkpoints for human approval, not permission for the coding agent to make product-policy decisions.

---

# 20. Final Chunked Build Contract

The entire project is considered correctly built only when:

```text
Every phase has:
  ✓ bounded scope
  ✓ explicit dependencies
  ✓ implementation
  ✓ tests
  ✓ phase gate
  ✓ context file

AND

Every context file:
  ✓ describes actual repository state
  ✓ records decisions
  ✓ records limitations
  ✓ records tests
  ✓ records security state
  ✓ records audit state
  ✓ records next-phase prerequisites

AND

The final system:
  ✓ preserves authoritative state
  ✓ preserves human authority
  ✓ keeps QualitySignal separate from TriageCase
  ✓ keeps events separate from source-of-truth state
  ✓ uses query/read models for dashboard access
  ✓ keeps deterministic logic authoritative where required
  ✓ keeps AI bounded and optional
  ✓ remains auditable
  ✓ remains reproducible
  ✓ remains testable
  ✓ preserves the full QualityLoop
```

---

# 21. Operating Rule for Future Coding Sessions

When starting a new coding session, use this exact pattern:

```text
1. Identify current phase.
2. Read previous Phase Context.
3. Inspect repository.
4. Compare context with repository reality.
5. Report discrepancies.
6. Read only the relevant Step 5 sections.
7. Execute only current-phase tasks.
8. Run required tests.
9. Run regression tests.
10. Verify phase gate.
11. Generate current Phase Context.
12. Stop.
```

**Do not begin the next phase in the same session unless explicitly instructed.**

This is the primary mechanism that prevents context loss between chunks.


---


---

# Historical Document Rule

The following are reference/source documents only:

- Original Step 5 build plan
- Revised Step 5 build plan
- Step 4 Architecture
- Step 3 PRD
- Step 2 / Step 1 / Step 0 documents

They may contain older task IDs or phase groupings. They must not override the canonical Phase 0–12 map or the contracts in this document.

If a historical document conflicts with this operational master, use the source-of-truth hierarchy in Section 3 and record the discrepancy.
