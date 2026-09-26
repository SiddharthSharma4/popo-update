# TASK BOARD

**Project:** OSM — AI-Powered On-Screen Marking & Digital Evaluation System
**Document:** `docs/planning/04-task-board.md`
**Purpose:** Authoritative implementation task registry and execution board for the MVP
**Status:** Active — MVP Execution
**Depends On:**

* `AGENTS.md`
* `docs/contracts/00-project-context.md`
* `docs/contracts/01-product-contract.md`
* `docs/contracts/02-architecture-contract.md`
* `docs/planning/03-build-roadmap.md`

---

# 1. PURPOSE

This document converts the authoritative Build Roadmap into a concrete, trackable set of implementation tasks.

The Build Roadmap defines:

> **What must be built and in what order.**

This Task Board defines:

> **What the coding agent is currently expected to implement, what remains, what is blocked, and what has been verified.**

This document is therefore the bridge between:

```text
PROJECT INTENT
      ↓
PRODUCT CONTRACT
      ↓
ARCHITECTURE CONTRACT
      ↓
BUILD ROADMAP
      ↓
TASK BOARD
      ↓
IMPLEMENTATION
      ↓
VERIFICATION
      ↓
PROJECT STATE
```

The Task Board does not replace the Product Contract, Architecture Contract, or Build Roadmap.

---

# 2. AUTHORITY

The Task Board is authoritative only for:

* task existence
* task identity
* task ordering
* task dependencies
* task status
* task ownership
* execution readiness
* task-level scope
* verification state

It must not redefine:

* product requirements
* architecture
* domain semantics
* security policy
* AI authority boundaries
* database contracts
* API contracts

If a task conflicts with an authoritative contract, the conflict must be surfaced rather than silently resolved.

---

# 3. DOCUMENT HIERARCHY

The project uses the following hierarchy:

```text
AGENTS.md
    ↓
Project Context
    ↓
Product Contract
    ↓
Architecture Contract
    ↓
Build Roadmap
    ↓
Task Board
    ↓
Individual Task Specification
    ↓
Code
    ↓
Tests
    ↓
Verification
```

The meaning of each layer is:

| Document                      | Primary Question                                           |
| ----------------------------- | ---------------------------------------------------------- |
| `AGENTS.md`                   | How must the coding agent behave?                          |
| `00-project-context.md`       | What is this project?                                      |
| `01-product-contract.md`      | What must the product do?                                  |
| `02-architecture-contract.md` | What architecture must be preserved?                       |
| `03-build-roadmap.md`         | In what order should the system be built?                  |
| `04-task-board.md`            | What implementation work exists and what is happening now? |
| Task specification            | What exactly must be implemented for this task?            |

---

# 4. CORE EXECUTION PRINCIPLE

The project must be built through **small, verifiable, dependency-aware tasks**.

The preferred execution loop is:

```text
SELECT TASK
    ↓
LOAD TASK CONTEXT
    ↓
VERIFY DEPENDENCIES
    ↓
INSPECT EXISTING CODE
    ↓
IMPLEMENT
    ↓
TEST
    ↓
VERIFY ACCEPTANCE CRITERIA
    ↓
VERIFY ARCHITECTURAL INVARIANTS
    ↓
UPDATE TASK STATUS
    ↓
UPDATE TRACEABILITY
    ↓
UPDATE PROJECT STATE
    ↓
STOP
```

A coding agent must not treat implementation as complete merely because code compiles.

A task is complete only when its acceptance criteria and verification requirements are satisfied.

---

# 5. TASK LIFECYCLE

Every task follows this lifecycle:

```text
BACKLOG
   ↓
READY
   ↓
IN PROGRESS
   ↓
IMPLEMENTED
   ↓
VERIFYING
   ↓
DONE
```

Alternative states:

```text
BLOCKED
CANCELLED
DEFERRED
```

## Status Definitions

### BACKLOG

Task is defined but not currently executable.

Typical reasons:

* dependency incomplete
* later roadmap phase
* contract not finalized
* not yet prioritized

### READY

All required dependencies and contracts are available.

The task can be assigned to a coding agent.

### IN PROGRESS

An agent is actively implementing the task.

### IMPLEMENTED

Implementation exists, but required verification is not yet complete.

### VERIFYING

Implementation is complete and the agent is actively running:

* tests
* type checks
* lint
* build
* acceptance verification
* architecture checks

### DONE

All required verification has passed and task traceability has been updated.

### BLOCKED

Task cannot proceed because of an unresolved dependency, ambiguity, environment issue, or external blocker.

### DEFERRED

Task is intentionally postponed without being considered failed.

### CANCELLED

Task is no longer required.

---

# 6. TASK IDENTIFICATION

Every task must have a globally unique ID.

Format:

```text
TASK-{PHASE}-{DOMAIN}-{NUMBER}
```

Examples:

```text
TASK-P0-FOUND-001
TASK-P1-AUTH-001
TASK-P2-EVAL-001
TASK-P3-VAL-001
TASK-P4-INTEL-001
TASK-P5-MOD-001
TASK-P6-AUDIT-001
TASK-P7-AI-001
TASK-P8-ANALYTICS-001
TASK-P9-INTEGRATION-001
TASK-P10-HARDEN-001
TASK-P11-DEMO-001
```

The phase identifier must correspond to the Build Roadmap.

---

# 7. TASK PRIORITY

Task priority and roadmap phase are separate concepts.

Use:

```text
CRITICAL
HIGH
NORMAL
ENHANCEMENT
FUTURE
```

Do not use `P0`, `P1`, `P2`, etc. for priority because those identifiers are reserved for roadmap phases.

---

# 8. TASK CATEGORIES

Tasks should use one primary category:

```text
FOUNDATION
DOMAIN
API
DATABASE
EVALUATION
VALIDATION
INTELLIGENCE
MODERATION
AUDIT
AI
ANALYTICS
INTEGRATION
SECURITY
TESTING
UI
UX
DEMO
HARDENING
DOCUMENTATION
INFRASTRUCTURE
```

A task may reference multiple areas but should have one primary category.

---

# 9. TASK SIZE

Tasks should normally be small enough for one focused implementation cycle.

Recommended task sizes:

### SMALL

Approximately one focused implementation unit.

Examples:

* create one validator
* add one repository method
* implement one API endpoint
* add one domain value object

### MEDIUM

Several closely related implementation units.

Examples:

* one complete moderation workflow
* one detector plus persistence
* one dashboard workflow

### LARGE

Cross-module work or substantial integration.

Large tasks should normally be decomposed before implementation.

### RULE

If an agent cannot clearly describe:

```text
what it will change
what it will not change
how it will verify success
```

the task is probably too large or underspecified.

---

# 10. TASK RECORD

Every task registered on this board must contain at least:

```text
Task ID
Title
Phase
Category
Priority
Status
Dependencies
Objective
Product references
Architecture references
Scope
Acceptance criteria
Verification requirements
```

The complete implementation specification may live in an individual task file.

---

# 11. MASTER TASK TABLE

The following table is the authoritative high-level task registry.

| ID                      | Phase | Category       | Priority | Status  | Depends On              | Objective                                                  |
| ----------------------- | ----- | -------------- | -------- | ------- | ----------------------- | ---------------------------------------------------------- |
| TASK-P0-FOUND-001       | P0    | FOUNDATION     | CRITICAL | BACKLOG | —                       | Establish repository and development foundation            |
| TASK-P0-FOUND-002       | P0    | DOCUMENTATION  | CRITICAL | BACKLOG | TASK-P0-FOUND-001       | Establish project documentation and traceability structure |
| TASK-P0-FOUND-003       | P0    | TESTING        | HIGH     | BACKLOG | TASK-P0-FOUND-001       | Establish baseline testing and verification infrastructure |
| TASK-P0-FOUND-004       | P0    | INFRASTRUCTURE | HIGH     | BACKLOG | TASK-P0-FOUND-001       | Establish local development and environment configuration  |
| TASK-P0-FOUND-005       | P0    | DEMO           | HIGH     | BACKLOG | TASK-P0-FOUND-002       | Establish deterministic demo/reset foundation              |
| TASK-P1-DOMAIN-001      | P1    | DOMAIN         | CRITICAL | BACKLOG | P0 complete             | Establish core domain model                                |
| TASK-P1-DOMAIN-002      | P1    | DATABASE       | CRITICAL | BACKLOG | TASK-P1-DOMAIN-001      | Establish authoritative persistence model                  |
| TASK-P1-DOMAIN-003      | P1    | API            | HIGH     | BACKLOG | TASK-P1-DOMAIN-001      | Establish application/service boundaries                   |
| TASK-P2-EVAL-001        | P2    | EVALUATION     | CRITICAL | BACKLOG | P1 complete             | Implement evaluation workflow                              |
| TASK-P2-EVAL-002        | P2    | API            | HIGH     | BACKLOG | TASK-P2-EVAL-001        | Expose evaluation operations                               |
| TASK-P2-EVAL-003        | P2    | TESTING        | HIGH     | BACKLOG | TASK-P2-EVAL-001        | Verify evaluation lifecycle                                |
| TASK-P3-VAL-001         | P3    | VALIDATION     | CRITICAL | BACKLOG | P2 complete             | Implement deterministic completeness validation            |
| TASK-P3-VAL-002         | P3    | VALIDATION     | CRITICAL | BACKLOG | TASK-P3-VAL-001         | Generate first QualitySignal                               |
| TASK-P3-VAL-003         | P3    | TESTING        | HIGH     | BACKLOG | TASK-P3-VAL-002         | Verify deterministic signal generation                     |
| TASK-P4-INTEL-001       | P4    | INTELLIGENCE   | CRITICAL | BACKLOG | P3 complete             | Implement first statistical quality detector               |
| TASK-P4-INTEL-002       | P4    | INTELLIGENCE   | HIGH     | BACKLOG | TASK-P4-INTEL-001       | Establish detector framework                               |
| TASK-P4-INTEL-003       | P4    | TESTING        | HIGH     | BACKLOG | TASK-P4-INTEL-002       | Verify detector behavior                                   |
| TASK-P5-MOD-001         | P5    | MODERATION     | CRITICAL | BACKLOG | P3 complete             | Implement TriageCase workflow                              |
| TASK-P5-MOD-002         | P5    | MODERATION     | CRITICAL | BACKLOG | TASK-P5-MOD-001         | Implement human Resolution workflow                        |
| TASK-P5-MOD-003         | P5    | UI             | HIGH     | BACKLOG | TASK-P5-MOD-002         | Implement moderator review experience                      |
| TASK-P5-MOD-004         | P5    | TESTING        | HIGH     | BACKLOG | TASK-P5-MOD-002         | Verify moderation lifecycle                                |
| TASK-P6-AUDIT-001       | P6    | AUDIT          | CRITICAL | BACKLOG | P5 complete             | Implement immutable audit event recording                  |
| TASK-P6-AUDIT-002       | P6    | AUDIT          | HIGH     | BACKLOG | TASK-P6-AUDIT-001       | Implement audit inspection                                 |
| TASK-P6-AUDIT-003       | P6    | TESTING        | HIGH     | BACKLOG | TASK-P6-AUDIT-002       | Verify audit integrity                                     |
| TASK-P7-AI-001          | P7    | AI             | CRITICAL | BACKLOG | P3-P6 complete          | Establish AI provider abstraction                          |
| TASK-P7-AI-002          | P7    | AI             | HIGH     | BACKLOG | TASK-P7-AI-001          | Implement AI context builder                               |
| TASK-P7-AI-003          | P7    | AI             | HIGH     | BACKLOG | TASK-P7-AI-002          | Implement validated AI output handling                     |
| TASK-P7-AI-004          | P7    | AI             | HIGH     | BACKLOG | TASK-P7-AI-003          | Implement deterministic fallback behavior                  |
| TASK-P7-AI-005          | P7    | TESTING        | CRITICAL | BACKLOG | TASK-P7-AI-004          | Verify AI authority boundaries                             |
| TASK-P8-ANALYTICS-001   | P8    | ANALYTICS      | HIGH     | BACKLOG | P6 complete             | Implement quality analytics                                |
| TASK-P8-ANALYTICS-002   | P8    | ANALYTICS      | HIGH     | BACKLOG | TASK-P8-ANALYTICS-001   | Implement QualityPulse                                     |
| TASK-P8-ANALYTICS-003   | P8    | UI             | HIGH     | BACKLOG | TASK-P8-ANALYTICS-002   | Implement analytics presentation                           |
| TASK-P9-INTEGRATION-001 | P9    | INTEGRATION    | CRITICAL | BACKLOG | P2-P8 complete          | Establish OSM integration boundary                         |
| TASK-P9-INTEGRATION-002 | P9    | INTEGRATION    | HIGH     | BACKLOG | TASK-P9-INTEGRATION-001 | Implement synthetic OSM adapter                            |
| TASK-P9-INTEGRATION-003 | P9    | INTEGRATION    | HIGH     | BACKLOG | TASK-P9-INTEGRATION-002 | Verify integration contract                                |
| TASK-P10-HARDEN-001     | P10   | SECURITY       | CRITICAL | BACKLOG | P9 complete             | Harden authorization and validation                        |
| TASK-P10-HARDEN-002     | P10   | SECURITY       | CRITICAL | BACKLOG | TASK-P10-HARDEN-001     | Verify consequential action boundaries                     |
| TASK-P10-HARDEN-003     | P10   | TESTING        | CRITICAL | BACKLOG | TASK-P10-HARDEN-002     | Execute full regression suite                              |
| TASK-P10-HARDEN-004     | P10   | PERFORMANCE    | HIGH     | BACKLOG | TASK-P10-HARDEN-003     | Verify MVP performance and reliability                     |
| TASK-P11-DEMO-001       | P11   | DEMO           | CRITICAL | BACKLOG | P10 complete            | Build deterministic end-to-end demo scenario               |
| TASK-P11-DEMO-002       | P11   | DEMO           | CRITICAL | BACKLOG | TASK-P11-DEMO-001       | Implement demo reset and recovery                          |
| TASK-P11-DEMO-003       | P11   | DEMO           | CRITICAL | BACKLOG | TASK-P11-DEMO-002       | Execute full demo verification                             |
| TASK-P11-DEMO-004       | P11   | DOCUMENTATION  | HIGH     | BACKLOG | TASK-P11-DEMO-003       | Finalize hackathon-facing documentation                    |

> The task IDs above establish the initial execution structure. Detailed implementation tasks may be decomposed from these tasks as required.

---

# 12. TASK DEPENDENCY RULES

A task may enter `READY` only when:

1. All required dependencies are complete.
2. Required contracts exist.
3. Required infrastructure exists.
4. Required acceptance criteria are understandable.
5. No unresolved architectural conflict blocks implementation.

Dependency example:

```text
TASK-P3-VAL-001
        ↓
TASK-P3-VAL-002
        ↓
TASK-P5-MOD-001
        ↓
TASK-P5-MOD-002
        ↓
TASK-P6-AUDIT-001
```

An agent must not bypass a dependency merely because implementation appears convenient.

If bypassing a dependency appears necessary:

```text
STOP
↓
Document the dependency conflict
↓
Determine whether the roadmap or architecture must change
↓
Create/update an ADR if required
↓
Obtain human approval when the change is material
```

---

# 13. VERTICAL SLICE GATE

The first complete vertical slice is the primary MVP development gate.

The preferred slice is:

```text
Evaluation
    ↓
Deterministic Validation
    ↓
QualitySignal
    ↓
TriageCase
    ↓
Human Resolution
    ↓
AuditEvent
```

The vertical slice is considered complete only when:

* an evaluation can be represented
* validation can execute
* a QualitySignal can be generated
* a TriageCase can be created
* a human can review the case
* a Resolution can be recorded
* an AuditEvent can be persisted
* the workflow can be demonstrated end-to-end
* the critical path has automated verification
* the system can recover from expected failure cases

AI is not required to declare the vertical slice complete.

---

# 14. TASK READINESS CHECK

Before moving a task from `BACKLOG` to `READY`, verify:

```text
[ ] Task has a unique ID
[ ] Task has a clear objective
[ ] Task belongs to a roadmap phase
[ ] Dependencies are identified
[ ] Product references are identified
[ ] Architecture references are identified
[ ] Required technical contracts are available
[ ] Allowed scope is defined
[ ] Forbidden scope is defined
[ ] Acceptance criteria are testable
[ ] Verification requirements are defined
[ ] No unresolved architectural ambiguity blocks execution
```

---

# 15. TASK EXECUTION RULES

When an AI coding agent receives a task, it must:

### Step 1 — Read authority

Read:

```text
AGENTS.md
```

and the documents relevant to the task.

### Step 2 — Read task

Read the complete task specification.

### Step 3 — Check dependencies

Confirm that required predecessor tasks are actually complete.

Do not trust status labels blindly.

Inspect the repository when necessary.

### Step 4 — Inspect existing implementation

Before creating new code:

* inspect relevant modules
* inspect existing patterns
* inspect schemas
* inspect services
* inspect tests
* reuse existing infrastructure where appropriate

### Step 5 — Confirm scope

Identify:

```text
Allowed
Forbidden
```

before implementation.

### Step 6 — Implement

Implement only the requested task.

### Step 7 — Test

Run the task's required tests.

### Step 8 — Verify

Check:

* acceptance criteria
* architectural invariants
* security boundaries
* domain invariants
* integration behavior

### Step 9 — Update state

Update:

* task status
* project state
* traceability
* relevant documentation

### Step 10 — Stop

Do not automatically begin unrelated tasks.

---

# 16. FORBIDDEN TASK BEHAVIOR

An agent must not:

* silently expand task scope
* rewrite unrelated modules
* replace architecture without approval
* introduce new infrastructure without requirement
* introduce microservices merely for appearance
* introduce queues merely for appearance
* replace deterministic logic with AI unnecessarily
* modify authoritative data through analytics
* allow AI to bypass human authority
* mark a task complete without verification
* claim tests passed without running them
* claim an integration works without testing it
* silently change contracts
* delete working functionality to simplify implementation
* modify unrelated code because it appears "cleaner"

---

# 17. SCOPE ESCALATION

If an implementation reveals work outside the current task:

```text
Current Task
     ↓
New Requirement Discovered
     ↓
Is it required for current acceptance criteria?
     │
 ┌───┴────┐
YES       NO
 │         │
Implement  STOP
           ↓
       Record follow-up
           ↓
       Create new task
```

Do not silently absorb unrelated future work.

---

# 18. TASK ACCEPTANCE CRITERIA

Acceptance criteria must describe observable behavior.

Weak:

```text
Implement detector.
```

Strong:

```text
Given an evaluation with missing required answer content,
when completeness validation runs,
then a QualitySignal is created with:

- correct evaluation reference
- correct signal type
- deterministic source
- evidence reference
- severity according to the contract
- timestamp
- traceable detector identifier
```

Acceptance criteria should be:

* specific
* observable
* testable
* tied to product behavior

---

# 19. VERIFICATION REQUIREMENTS

Each implementation task should define the required verification level.

Possible checks:

```text
UNIT TEST
INTEGRATION TEST
API TEST
DATABASE TEST
AUTHORIZATION TEST
AI CONTRACT TEST
END-TO-END TEST
TYPE CHECK
LINT
BUILD
MANUAL VERIFICATION
DEMO VERIFICATION
```

Not every task requires every check.

The task specification must state which checks apply.

---

# 20. DEFINITION OF DONE

A task may be marked `DONE` only when:

```text
[ ] Implementation complete
[ ] Acceptance criteria satisfied
[ ] Required tests pass
[ ] Required type/lint/build checks pass
[ ] Relevant architecture invariants verified
[ ] Security implications verified
[ ] No unintended scope changes remain
[ ] Documentation updated if required
[ ] Traceability updated
[ ] Project state updated
[ ] No known blocker remains
```

A task must not be marked done because:

```text
"The code looks correct."
```

---

# 21. TRACEABILITY

Every meaningful task should be traceable to at least one authoritative requirement or roadmap item.

Preferred chain:

```text
PRODUCT REQUIREMENT
        ↓
ARCHITECTURE RULE
        ↓
ROADMAP ITEM
        ↓
TASK
        ↓
IMPLEMENTATION
        ↓
TEST
        ↓
VERIFICATION EVIDENCE
```

Example:

```text
PR-QS-001
    ↓
ARCH-DOM-QS-001
    ↓
ROADMAP-P3
    ↓
TASK-P3-VAL-002
    ↓
QualitySignal implementation
    ↓
QualitySignal tests
    ↓
Verification result
```

If a task cannot be connected to project intent, reconsider whether the task belongs in the MVP.

---

# 22. PROJECT STATE UPDATES

When a task reaches `DONE`, update:

```text
docs/12-project-state.md
```

with:

* current phase
* completed task
* active task
* newly unblocked tasks
* blockers
* known risks
* test status
* demo status

Do not maintain conflicting project-status information in multiple documents.

---

# 23. TASK BOARD MAINTENANCE

The Task Board should be updated when:

* a task is created
* a task is decomposed
* a dependency changes
* a task becomes ready
* a task starts
* a task becomes blocked
* a task completes
* a task is cancelled
* roadmap scope changes
* a major architecture decision changes execution order

The board should remain concise.

Detailed implementation reasoning belongs in task specifications or ADRs.

---

# 24. TASK DECOMPOSITION

A roadmap item should be decomposed when:

* it spans multiple bounded capabilities
* it requires multiple independent acceptance criteria
* it changes several architectural layers
* it cannot be verified as one coherent unit
* it would require a large autonomous coding session
* different parts have different dependencies
* different parts could be completed independently

Example:

```text
ROADMAP:
Implement moderation workflow

DECOMPOSE:

TASK-P5-MOD-001
Create TriageCase

TASK-P5-MOD-002
Create Resolution

TASK-P5-MOD-003
Implement moderator authorization

TASK-P5-MOD-004
Implement moderation API

TASK-P5-MOD-005
Implement moderation UI

TASK-P5-MOD-006
Test complete moderation lifecycle
```

---

# 25. TASK FILE STANDARD

The Task Board should contain the high-level registry.

Detailed tasks should use individual task files when the implementation becomes substantial.

Recommended structure:

```text
docs/tasks/
├── README.md
├── P0/
├── P1/
├── P2/
├── P3/
├── P4/
├── P5/
├── P6/
├── P7/
├── P8/
├── P9/
├── P10/
└── P11/
```

Example:

```text
docs/tasks/P3/
└── TASK-P3-VAL-002-quality-signal.md
```

---

# 26. INDIVIDUAL TASK TEMPLATE

Every substantial task specification should contain:

```md
# TASK-{ID}

## Status

READY

## Objective

...

## Why This Task Exists

...

## Roadmap Reference

...

## Product References

...

## Architecture References

...

## Contract References

...

## Dependencies

...

## Preconditions

...

## Allowed Scope

...

## Forbidden Scope

...

## Expected Behavior

...

## Acceptance Criteria

- [ ] ...
- [ ] ...
- [ ] ...

## Edge Cases

- ...
- ...

## Implementation Guidance

...

## Testing Requirements

### Unit Tests

...

### Integration Tests

...

### Other Verification

...

## Definition of Done

- [ ] ...

## Traceability

...

## Verification Evidence

...

## Notes

...
```

The template is guidance.

It must not override the authoritative contracts.

---

# 27. AI-SPECIFIC TASK RULES

Tasks involving AI must additionally specify:

```text
AI capability
AI input/context
AI output schema
Validation
Fallback behavior
Provider boundary
Authority boundary
Failure behavior
Observability
Testing requirements
```

AI must remain subordinate to the application domain.

The preferred flow is:

```text
Application
    ↓
Context Builder
    ↓
AI Interface
    ↓
Provider Adapter
    ↓
Model
    ↓
Validated Output
    ↓
Application
```

AI output must not silently become authoritative domain state.

---

# 28. AI AUTHORITY INVARIANT

No task may authorize AI to:

* directly assign authoritative marks
* directly modify authoritative evaluation state
* resolve a moderation case
* declare misconduct
* modify a rubric
* bypass authorization
* bypass human review
* write consequential state outside the approved application workflow

If a future requirement appears to require such behavior, it must trigger an architecture/product review rather than being implemented silently.

---

# 29. DETERMINISTIC-FIRST RULE

Whenever a requirement can be implemented reliably through deterministic logic, deterministic logic should be preferred before introducing AI.

Preferred sequence:

```text
Deterministic Rule
      ↓
Statistical Detection
      ↓
AI Assistance
```

AI should be introduced when it provides meaningful additional value rather than merely because AI is available.

---

# 30. DEMO-FIRST RELIABILITY RULE

The critical demo path must remain reliable even when external AI providers or external integrations fail.

Therefore tasks affecting the demo must define:

```text
Normal Path
Fallback Path
Reset Path
Recovery Path
```

Synthetic/demo data must be clearly distinguishable from authoritative production data.

The demo must never falsely represent mocked behavior as real external capability.

---

# 31. CONCURRENCY AND IDEMPOTENCY

Tasks that modify consequential state must consider:

* duplicate requests
* repeated signal generation
* concurrent moderation actions
* stale state
* conflicting resolutions
* retry behavior
* idempotency

Where applicable, acceptance criteria must explicitly test these cases.

---

# 32. SECURITY TASK REQUIREMENTS

Security-sensitive tasks must explicitly consider:

```text
Authentication
Authorization
Role boundaries
Object-level access
Input validation
Sensitive data exposure
Auditability
AI boundary enforcement
External integration trust
```

A task must not weaken an existing security boundary merely to simplify implementation.

---

# 33. CURRENT EXECUTION

This section records the current execution pointer.

```text
Current Phase:
P0 — Foundation

Current Task:
NONE

Current Task Status:
NOT STARTED

Next Ready Task:
TASK-P0-FOUND-001

Vertical Slice:
NOT STARTED

AI Layer:
NOT STARTED

Integration:
NOT STARTED

Hardening:
NOT STARTED

Demo:
NOT STARTED
```

This section must be updated as execution progresses.

---

# 34. CURRENT BLOCKERS

```text
None currently recorded.
```

If blockers exist, record:

```text
Blocker ID:
Task:
Description:
Impact:
Required Decision:
Owner:
Status:
```

---

# 35. CURRENT RISKS

Track only meaningful execution risks.

Example categories:

```text
ARCHITECTURE
DEPENDENCY
SECURITY
DATA
AI
INTEGRATION
PERFORMANCE
DEMO
SCOPE
```

Each risk should include:

```text
Risk:
Affected Task:
Impact:
Mitigation:
Status:
```

---

# 36. PHASE GATES

A phase is not considered complete merely because all code for the phase exists.

Each phase must pass:

```text
Implementation
    ↓
Tests
    ↓
Acceptance
    ↓
Architecture Verification
    ↓
Regression
    ↓
Phase Gate
```

## Phase Gate Requirements

Before advancing to the next major phase:

```text
[ ] Required tasks complete
[ ] Required tests pass
[ ] No critical blocker
[ ] No unresolved architecture violation
[ ] Product behavior verified
[ ] Traceability updated
[ ] Project state updated
```

---

# 37. MVP COMPLETION GATE

The MVP is considered implementation-complete only when the required roadmap phases and critical acceptance criteria are complete.

At minimum, the system should demonstrate:

```text
1. Evaluation exists
        ↓
2. Quality validation runs
        ↓
3. QualitySignal is generated
        ↓
4. TriageCase is created
        ↓
5. Human reviews the case
        ↓
6. Resolution is recorded
        ↓
7. AuditEvent is recorded
        ↓
8. AI assistance can operate within its authority boundary
        ↓
9. Analytics can consume resulting data
        ↓
10. OSM integration boundary can be demonstrated
        ↓
11. Failure/recovery behavior works
        ↓
12. Full demo can be repeated deterministically
```

---

# 38. HACKATHON FREEZE RULE

When the project enters hackathon demo freeze:

```text
NO NEW MAJOR ARCHITECTURE
NO NEW CORE DOMAIN
NO LARGE REFACTOR
NO UNVERIFIED AI DEPENDENCY
NO UNNECESSARY INFRASTRUCTURE
```

Priority shifts to:

```text
Reliability
Correctness
Demo stability
Verification
Bug fixing
UX clarity
Documentation
Presentation readiness
```

New ideas discovered during the freeze should normally become future tasks unless they are necessary to fix a critical issue.

---

# 39. AGENT STOP CONDITION

An agent must stop after completing the assigned task when:

```text
Implementation complete
        +
Required verification complete
        +
Task status updated
        +
Traceability updated
        +
Project state updated
```

The agent should not automatically continue to the next unrelated task.

---

# 40. CHANGE CONTROL

Changes to the Task Board are allowed when:

* a task is decomposed
* a dependency is discovered
* a task is blocked
* a task becomes unnecessary
* a roadmap item changes
* a product requirement changes
* an architectural decision changes execution

Material changes to product or architecture must update the appropriate authoritative document first.

The Task Board must reflect those changes rather than silently redefining them.

---

# 41. FINAL OPERATING MODEL

The project should ultimately operate as:

```text
                 PRODUCT INTENT
                      │
                      ▼
              PRODUCT CONTRACT
                      │
                      ▼
            ARCHITECTURE CONTRACT
                      │
                      ▼
                BUILD ROADMAP
                      │
                      ▼
                 TASK BOARD
                      │
             ┌────────┴────────┐
             ▼                 ▼
          READY TASK       BLOCKED TASK
             │
             ▼
       TASK SPECIFICATION
             │
             ▼
          AI AGENT
             │
             ▼
        EXISTING CODE
             │
             ▼
        IMPLEMENTATION
             │
             ▼
            TEST
             │
             ▼
         VERIFICATION
             │
             ▼
        TRACEABILITY
             │
             ▼
        PROJECT STATE
             │
             ▼
            DONE
             │
             ▼
       NEXT READY TASK
```

This loop continues until the MVP completion gate is satisfied.

---

# 42. NON-NEGOTIABLE PRINCIPLES

The following principles apply to every task:

1. **Product contracts define product behavior.**
2. **Architecture contracts define architectural boundaries.**
3. **The roadmap defines implementation order.**
4. **The Task Board defines execution state.**
5. **Tasks must be independently understandable.**
6. **Tasks must have explicit scope.**
7. **Dependencies must be respected.**
8. **Existing code must be inspected before modification.**
9. **Deterministic logic is preferred where sufficient.**
10. **AI is assistive, not authoritative.**
11. **Human decisions remain authoritative where required.**
12. **Consequential actions must be auditable.**
13. **Authoritative data must remain distinguishable from derived data.**
14. **Demo reliability must not create false product claims.**
15. **No task is complete without verification.**
16. **No unrelated work should be silently introduced.**
17. **Material architecture changes require explicit review.**
18. **Traceability must be maintained.**
19. **Project state must remain accurate.**
20. **When uncertain, stop and surface the ambiguity rather than inventing a requirement.**

---

# 43. SUCCESS CRITERION FOR THIS DOCUMENT

This Task Board is successful when a coding agent can answer all of the following without guessing:

```text
What am I building?
        ↓
Why am I building it?
        ↓
Which roadmap phase does it belong to?
        ↓
What requirements does it satisfy?
        ↓
What architecture rules apply?
        ↓
What dependencies must already exist?
        ↓
What am I allowed to change?
        ↓
What am I forbidden from changing?
        ↓
What does success look like?
        ↓
How will I test it?
        ↓
How will I prove it works?
        ↓
What must I update after completion?
        ↓
When should I stop?
```

If an agent cannot answer these questions from the task and its referenced contracts, the task is not sufficiently specified for autonomous implementation.
