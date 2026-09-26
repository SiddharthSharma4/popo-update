# BUILD ROADMAP

**Project:** OSM — AI-Powered On-Screen Marking & Digital Evaluation System
**Document:** `docs/planning/03-build-roadmap.md`
**Purpose:** Authoritative implementation sequence for the MVP
**Status:** Build Roadmap — MVP
**Audience:** Human developers, AI coding agents, reviewers, and hackathon evaluators

---

# 1. PURPOSE

This document defines the authoritative implementation sequence for building the OSM MVP.

It answers:

> **What should be built, in what order, and what must be true before the project can move to the next phase?**

This document does **not** replace:

* `AGENTS.md`
* `docs/contracts/00-project-context.md`
* `docs/contracts/01-product-contract.md`
* `docs/contracts/02-architecture-contract.md`
* domain contracts
* API contracts
* data contracts
* AI contracts
* testing contracts
* individual task specifications

The roadmap defines **implementation sequencing**, not every implementation detail.

---

# 2. AUTHORITY AND DOCUMENT HIERARCHY

## 2.1 Agent behavior authority

For how an AI coding agent behaves:

```text
1. Explicit user instruction
2. AGENTS.md
```

## 2.2 Product and technical authority

For what the system must do and how it must behave:

```text
3. Official problem statement / challenge requirements
4. docs/contracts/01-product-contract.md
5. docs/contracts/02-architecture-contract.md
6. docs/planning/03-build-roadmap.md
7. Relevant technical contracts
8. Individual task specifications
9. Existing implementation
10. Agent assumptions
```

If documents materially conflict:

* do not silently choose an interpretation;
* identify the conflict;
* preserve higher-authority requirements;
* request human clarification when the conflict affects architecture, security, data integrity, or product behavior.

---

# 3. CORE IMPLEMENTATION PHILOSOPHY

OSM must be built from the **deterministic, auditable core outward**.

The implementation sequence is:

```text
Foundation
    ↓
Domain Model
    ↓
Evaluation Workflow
    ↓
Deterministic Quality Detection
    ↓
Quality Signals
    ↓
Moderation Workflow
    ↓
Human Resolution
    ↓
Audit
    ↓
AI Assistance
    ↓
Analytics
    ↓
External OSM Integration
    ↓
Hardening
    ↓
Demo
```

The system must never be built as:

```text
UI
 ↓
AI
 ↓
AI decides everything
 ↓
Database
```

Instead:

```text
Authoritative domain state
        ↓
Deterministic processing
        ↓
Evidence
        ↓
QualitySignal
        ↓
Human workflow
        ↓
Resolution
        ↓
Audit
        ↓
Derived intelligence
```

---

# 4. MVP IMPLEMENTATION PRINCIPLES

The following principles govern every roadmap phase.

## 4.1 Deterministic core before AI

The critical workflow must function without depending on probabilistic AI behavior.

AI is introduced only after the underlying workflow is operational.

---

## 4.2 Human decision remains authoritative

AI and statistical detectors may provide:

* observations
* explanations
* suggestions
* classifications
* summaries
* prioritization

They must not independently become the final authority over consequential academic decisions.

---

## 4.3 Evidence before action

A system observation must be represented as evidence before it becomes a workflow item.

The conceptual chain is:

```text
Observation
    ↓
QualitySignal
    ↓
TriageCase
    ↓
Human Resolution
    ↓
AuditEvent
```

These concepts must not be collapsed into a generic `Issue` entity.

---

## 4.4 Existing OSM remains isolated

OSM-specific integration must pass through an integration boundary.

```text
OSM / Synthetic OSM
        ↓
Integration Adapter
        ↓
OSM Application Boundary
        ↓
OSM Domain
```

The domain must not become tightly coupled to a particular external OSM implementation.

---

## 4.5 Modular monolith first

The MVP is a modular monolith.

A module means:

> A logical bounded capability within the same deployable application.

A module is **not automatically**:

* a microservice;
* a separate process;
* a separate deployment;
* a separate repository;
* a separate database.

New infrastructure must be introduced only when an actual requirement justifies it.

---

## 4.6 Demo reliability must not fake capability

Synthetic/demo data may be used for reliable demonstration.

However:

```text
Demo data
≠
Production data
```

and:

```text
Mocked capability
≠
Claimed real capability
```

The demo must make the distinction clear.

---

## 4.7 Existing infrastructure before replacement

Before adding infrastructure, agents must inspect the repository.

Do not introduce:

* new databases;
* queues;
* caches;
* state-management systems;
* frameworks;
* AI providers;
* authentication systems;
* deployment infrastructure

merely because they are familiar or convenient.

---

# 5. GLOBAL DEPENDENCY GRAPH

The MVP follows this dependency structure:

```text
PHASE 0 — FOUNDATION
        ↓
PHASE 1 — DOMAIN FOUNDATION
        ↓
PHASE 2 — EVALUATION WORKFLOW
        ↓
PHASE 3 — DETERMINISTIC QUALITY DETECTION
        ↓
PHASE 4 — QUALITY SIGNAL PIPELINE
        ↓
PHASE 5 — MODERATION WORKFLOW
        ↓
PHASE 6 — AUDITABILITY
        ↓
PHASE 7 — AI ASSISTANCE
        ↓
PHASE 8 — ANALYTICS & INSIGHTS
        ↓
PHASE 9 — OSM INTEGRATION
        ↓
PHASE 10 — HARDENING
        ↓
PHASE 11 — HACKATHON DEMO
```

The critical vertical slice is:

```text
Evaluation
   ↓
Validation
   ↓
Detector
   ↓
QualitySignal
   ↓
TriageCase
   ↓
Human Resolution
   ↓
AuditEvent
```

This vertical slice must work before the project is considered functionally integrated.

---

# 6. PHASE 0 — FOUNDATION

## Objective

Establish the repository, documentation, application structure, development environment, and execution system required for controlled implementation.

---

## Scope

### P0-001 — Repository Foundation

Establish:

* repository structure;
* source directories;
* application entry points;
* configuration strategy;
* environment-variable strategy;
* development scripts;
* build scripts;
* test setup.

---

### P0-002 — Documentation Foundation

Ensure the core documentation hierarchy exists:

```text
AGENTS.md

docs/
├── 00-project-context.md
├── 01-product-contract.md
├── 02-architecture-contract.md
├── 03-build-roadmap.md
├── 04-domain-contract.md
├── 05-api-contract.md
├── 06-data-contract.md
├── 07-event-contract.md
├── 08-ai-contract.md
├── 09-testing-contract.md
├── 10-demo-contract.md
├── 11-security-contract.md
├── 12-project-state.md
└── 13-traceability.md
```

Only documents required by the approved implementation should be populated immediately.

---

### P0-003 — Development Tooling

Establish:

* package management;
* formatting;
* linting;
* type checking;
* unit-test execution;
* integration-test execution;
* build verification.

---

### P0-004 — Application Skeleton

Create the initial modular application structure without prematurely implementing business logic.

---

### P0-005 — Configuration and Secrets

Establish safe configuration handling.

Never hard-code:

* API keys;
* credentials;
* database secrets;
* AI provider keys;
* production secrets.

---

### P0-006 — Task Execution System

Establish the mechanism used to convert roadmap work into AI-executable tasks.

Every implementation task must eventually contain:

```text
Task ID
Objective
Product requirements
Architecture references
Dependencies
Preconditions
Allowed scope
Forbidden scope
Expected behavior
Acceptance criteria
Edge cases
Test requirements
Verification requirements
Definition of Done
```

---

## Phase 0 Exit Criteria

```text
✓ Repository builds
✓ Development environment works
✓ Tests can execute
✓ Lint/typecheck can execute
✓ Core documentation hierarchy exists
✓ Task specification format exists
✓ Project-state mechanism exists
✓ Traceability mechanism exists
✓ No unresolved foundation-level architecture blockers
```

---

# 7. PHASE 1 — DOMAIN FOUNDATION

## Objective

Implement the core domain model and boundaries required by all subsequent phases.

---

## Primary domain concepts

At minimum, establish the concepts defined by the product and architecture contracts.

Important conceptual entities include:

```text
User
Role
Course / Assessment Context
Question
Rubric
Evaluation
EvaluationItem
QualitySignal
TriageCase
Resolution
AuditEvent
```

Additional entities must be introduced only when required by an approved contract or task.

---

## Domain ownership

Core ownership should remain explicit.

```text
Evaluation
    → Evaluation

Completeness
    → Validation

Statistical Detection
    → Intelligence

AI Assistance
    → AI

QualitySignal
    → Quality Intelligence

TriageCase
    → Moderation

Resolution
    → Moderation

AuditEvent
    → Audit

Analytics
    → Analytics

External OSM Integration
    → Integration
```

---

## Phase 1 Exit Criteria

```text
✓ Core domain entities exist
✓ Ownership boundaries are explicit
✓ Domain invariants are enforced
✓ Domain logic is not hidden inside UI components
✓ Persistence boundaries are defined
✓ Domain tests exist for critical invariants
```

---

# 8. PHASE 2 — EVALUATION WORKFLOW

## Objective

Build the authoritative evaluation workflow before introducing intelligence.

---

## Core flow

```text
Exam / Assessment
        ↓
Question
        ↓
Student Answer
        ↓
Evaluation
        ↓
Evaluation Item
        ↓
Marks / Feedback
        ↓
Persisted Evaluation
```

---

## Required capabilities

The MVP must support the minimum workflow required to:

* represent an evaluation;
* associate it with an assessment;
* associate answers/questions;
* record evaluation results;
* validate evaluator permissions;
* persist authoritative evaluation state;
* retrieve evaluation state.

---

## Important constraint

The evaluation workflow must not depend on AI.

The system must remain operational if:

```text
AI provider unavailable
AI disabled
AI request fails
AI output invalid
```

---

## Phase 2 Exit Criteria

```text
✓ Evaluation can be created
✓ Evaluation can be retrieved
✓ Evaluation data is validated
✓ Authorization is enforced
✓ Evaluation state is persisted
✓ Invalid evaluation states are rejected
✓ Evaluation tests pass
```

---

# 9. PHASE 3 — DETERMINISTIC QUALITY DETECTION

## Objective

Introduce deterministic and statistical quality detection before AI.

---

## Initial detector strategy

Implement the smallest meaningful detector set first.

Potential detector categories include:

```text
Completeness
Evaluator deviation
Outlier detection
Missing evaluation data
Rubric mismatch
Suspicious consistency patterns
Workflow anomalies
```

Only detectors explicitly justified by the product contract should be implemented.

---

## Detector contract

A detector should conceptually behave as:

```text
Input
  ↓
Detector
  ↓
Evidence
  ↓
Detection Result
```

A detector must not directly resolve a moderation case.

---

## Important constraint

Detection is not adjudication.

```text
Detector:
"This pattern warrants attention."

NOT:

Detector:
"This person committed misconduct."
```

---

## Phase 3 Exit Criteria

```text
✓ At least one deterministic detector works end-to-end
✓ Detector inputs are validated
✓ Detector outputs are explainable
✓ Detector results are reproducible where applicable
✓ Detector cannot directly modify authoritative evaluation outcomes
✓ Detector tests cover normal and edge cases
```

---

# 10. PHASE 4 — QUALITY SIGNAL PIPELINE

## Objective

Convert detector observations into durable, evidence-bearing `QualitySignal` records.

---

## Core flow

```text
Detector
   ↓
Evidence
   ↓
QualitySignal
   ↓
Persisted Signal
```

---

## QualitySignal requirements

A signal should preserve enough information to answer:

```text
What happened?
Why was it detected?
What evidence supports it?
When was it detected?
Which entity does it concern?
Which detector produced it?
How confident/reliable is the signal?
What is its current lifecycle state?
```

---

## Important invariant

A `QualitySignal` is an observation.

It is not:

* a final decision;
* a misconduct finding;
* a disciplinary action;
* an automatic mark change.

---

## Idempotency

Repeated processing of the same input must not create uncontrolled duplicate signals.

Where appropriate:

```text
same source event
+
same detector
+
same detection version
=
idempotent processing
```

---

## Phase 4 Exit Criteria

```text
✓ QualitySignal persistence works
✓ Signal provenance exists
✓ Signal evidence is inspectable
✓ Duplicate generation is controlled
✓ Signals can be queried
✓ Signals do not directly become final decisions
```

---

# 11. PHASE 5 — MODERATION WORKFLOW

## Objective

Turn signals requiring human attention into an explicit review workflow.

---

## Core flow

```text
QualitySignal
      ↓
TriageCase
      ↓
Reviewer Investigation
      ↓
Resolution
```

---

## TriageCase

A `TriageCase` represents workflow.

It may contain:

* one or more signals;
* priority;
* status;
* assignment;
* reviewer;
* evidence references;
* comments;
* timestamps.

---

## Resolution

A `Resolution` represents a human action or decision.

Possible outcomes must be defined by the product/domain contract rather than invented by an agent.

---

## Critical invariant

The system must distinguish:

```text
Signal
≠
Case
≠
Resolution
```

---

## Concurrency

The system must protect against:

```text
Reviewer A resolves case
Reviewer B resolves same case
```

without appropriate concurrency control.

---

## Phase 5 Exit Criteria

```text
✓ Signals can create triage cases
✓ Cases can be assigned
✓ Reviewers can inspect evidence
✓ Human resolution is recorded
✓ Unauthorized users cannot perform restricted actions
✓ Concurrent resolution is handled safely
✓ Resolution does not rewrite historical evidence
```

---

# 12. PHASE 6 — AUDITABILITY

## Objective

Create a trustworthy historical record of consequential actions.

---

## Audit model

The audit layer should capture meaningful events such as:

```text
Evaluation created
Evaluation modified
Signal generated
Case created
Case assigned
Case resolved
Resolution changed where permitted
AI assistance requested
AI assistance accepted/rejected
Important configuration changes
```

Only meaningful events should be audited.

---

## Audit principles

Audit records should be:

```text
Append-oriented
Traceable
Timestamped
Actor-aware
Action-aware
Context-aware
```

Historical audit records must not be silently rewritten to hide previous actions.

---

## Phase 6 Exit Criteria

```text
✓ Important actions generate audit events
✓ Actor identity is recorded where applicable
✓ Event time is recorded
✓ Audit records can be inspected
✓ Historical actions remain traceable
✓ Audit is not the source of mutable business state
```

---

# 13. VERTICAL SLICE GATE

Before introducing AI or advanced analytics, the following complete path must work:

```text
Create Evaluation
      ↓
Run Validation
      ↓
Run Deterministic Detector
      ↓
Create QualitySignal
      ↓
Create TriageCase
      ↓
Human Reviews
      ↓
Resolution Recorded
      ↓
AuditEvent Recorded
```

This is the **MVP vertical-slice gate**.

The project should not proceed to major AI work until this path has been demonstrated and verified.

---

# 14. PHASE 7 — AI ASSISTANCE

## Objective

Introduce AI as an assistive intelligence layer on top of the already functioning deterministic workflow.

---

## AI architecture

```text
Application
     ↓
Context Builder
     ↓
AI Interface
     ↓
Provider Adapter
     ↓
Model Provider
     ↓
Validated AI Output
     ↓
Application
```

---

## Provider abstraction

The domain must depend on an application-level AI interface rather than a concrete provider SDK.

Conceptually:

```text
AI Service Interface
        ↓
Provider Adapter
        ↓
Provider
```

This allows provider replacement without rewriting domain logic.

---

## AI must not

AI must not independently:

```text
Assign authoritative marks
Resolve moderation cases
Declare misconduct
Modify rubrics
Change permissions
Bypass authorization
Write consequential state without approved workflow
Override human decisions
```

---

## AI output validation

AI output must be treated as untrusted external data.

Therefore:

```text
AI output
    ↓
Schema validation
    ↓
Domain validation
    ↓
Safety / policy checks
    ↓
Application use
```

Invalid AI output must be rejected or safely degraded.

---

## AI failure behavior

The system must define safe behavior for:

```text
Provider unavailable
Timeout
Rate limit
Malformed output
Unexpected response
Low confidence
Provider configuration missing
```

The core workflow must continue where possible without AI.

---

## Phase 7 Entry Gate

Required:

```text
✓ Vertical slice verified
✓ Deterministic detection works
✓ Moderation works
✓ Audit works
✓ AI contract exists
✓ AI output schema exists
✓ AI failure strategy exists
```

---

## Phase 7 Exit Criteria

```text
✓ AI assistance works
✓ Provider boundary exists
✓ AI output is validated
✓ AI failures degrade safely
✓ AI cannot bypass human authority
✓ AI interactions are auditable where required
✓ AI functionality has deterministic test/fallback paths
```

---

# 15. PHASE 8 — ANALYTICS & INSIGHTS

## Objective

Provide useful system-level insights derived from authoritative and derived project data.

---

## Analytics flow

```text
Authoritative Domain Data
        +
Quality Signals
        +
Triage / Resolution Data
        +
Audit Data
        ↓
Analytics
        ↓
Insights
```

---

## Important invariant

Analytics is derived.

Analytics must not silently become authoritative academic state.

For example:

```text
Analytics
   ↓
Insight
```

not:

```text
Analytics
   ↓
Automatically modify evaluation
```

unless explicitly defined by an approved product workflow.

---

## Potential capabilities

Depending on product requirements:

* evaluator quality trends;
* recurring evaluation patterns;
* signal frequency;
* moderation workload;
* resolution patterns;
* rubric/calibration insights;
* quality trends over time.

---

## Phase 8 Exit Criteria

```text
✓ Analytics uses valid source data
✓ Metrics are reproducible
✓ Derived data is distinguishable from authoritative state
✓ Analytics does not mutate academic state unexpectedly
✓ Important calculations have tests
```

---

# 16. PHASE 9 — OSM INTEGRATION

## Objective

Connect the quality intelligence system to the OSM evaluation environment without coupling the domain to external implementation details.

---

## Integration architecture

```text
External OSM
     ↓
OSM Adapter
     ↓
Integration Boundary
     ↓
Application
     ↓
Domain
```

---

## Synthetic adapter

A deterministic synthetic adapter may be used for:

* local development;
* tests;
* hackathon demonstration;
* environments without external OSM access.

It must be clearly distinguished from a production integration.

---

## Integration failure

The system must handle:

```text
Timeout
Authentication failure
Unavailable OSM
Invalid payload
Duplicate event
Partial response
External schema change
```

without corrupting internal authoritative state.

---

## Phase 9 Exit Criteria

```text
✓ Integration adapter exists
✓ External data is validated
✓ Internal domain remains decoupled
✓ Duplicate events are controlled
✓ Integration failures are handled
✓ Synthetic/demo adapter works
✓ Real integration does not require domain rewrites
```

---

# 17. PHASE 10 — HARDENING

## Objective

Make the MVP reliable enough for evaluation, demonstration, and controlled use.

---

## Areas

### Security

Verify:

* authentication;
* authorization;
* role boundaries;
* secret handling;
* input validation;
* sensitive-data exposure;
* API protection.

---

### Reliability

Verify:

* error handling;
* retries where justified;
* idempotency;
* concurrency;
* graceful degradation;
* database consistency.

---

### Performance

Measure actual bottlenecks before optimizing.

Do not introduce complexity without evidence.

---

### Observability

Where useful, establish:

* structured logging;
* error reporting;
* meaningful request/event identifiers;
* important workflow visibility.

---

### Data integrity

Verify:

```text
Authoritative state
        ↓
Valid transitions
        ↓
Auditability
```

---

## Phase 10 Exit Criteria

```text
✓ Critical security checks pass
✓ Critical workflow errors are handled
✓ Duplicate processing is controlled
✓ Concurrency risks are addressed
✓ Build is reproducible
✓ Tests pass
✓ No known critical blocker remains
```

---

# 18. PHASE 11 — HACKATHON DEMO

## Objective

Create a reliable, truthful, end-to-end demonstration of the project's core value.

---

# 19. DEMO GOLDEN PATH

The demo should preferably show one coherent story rather than many disconnected features.

Recommended flow:

```text
1. Assessment / evaluation exists
        ↓
2. Evaluation data enters OSM
        ↓
3. Deterministic quality detector runs
        ↓
4. QualitySignal is generated
        ↓
5. Signal becomes TriageCase
        ↓
6. Reviewer inspects evidence
        ↓
7. AI assistance provides supporting analysis
        ↓
8. Human makes the decision
        ↓
9. Resolution is recorded
        ↓
10. Audit trail is visible
        ↓
11. Analytics reflects the resulting data
```

The exact demo flow must follow the approved product contract.

---

# 20. DEMO RELIABILITY REQUIREMENTS

The demo must have:

```text
✓ Seeded data
✓ Deterministic scenario
✓ Predictable detector behavior
✓ Reset mechanism
✓ Controlled AI fallback
✓ Clear loading/error states
✓ No dependency on fragile external services where avoidable
✓ Clearly identifiable synthetic/demo data
```

---

# 21. DEMO RESET

The project should provide a safe way to return the demo environment to a known state.

Conceptually:

```text
Demo Reset
    ↓
Known database state
    ↓
Known evaluations
    ↓
Known signals
    ↓
Known moderation cases
    ↓
Known audit history
```

Reset functionality must not be exposed as an unrestricted production operation.

---

# 22. DEFINITION OF DONE

A roadmap phase is not complete merely because code exists.

A phase is complete only when:

```text
Implementation
      +
Tests
      +
Verification
      +
Acceptance Criteria
      +
Traceability
      +
Documentation Update
```

are satisfied.

---

# 23. TASK EXECUTION MODEL

The roadmap is decomposed into tasks.

The relationship is:

```text
ROADMAP PHASE
      ↓
EPIC / CAPABILITY
      ↓
TASK
      ↓
IMPLEMENTATION
      ↓
TEST
      ↓
VERIFICATION
      ↓
TRACEABILITY
      ↓
PROJECT STATE UPDATE
```

A coding agent should normally execute **one well-defined task at a time**.

---

# 24. TASK REQUIREMENTS

Every implementation task must identify:

## Identity

```text
Task ID
Phase
Capability
Status
Priority
```

Do not use ambiguous identifiers such as `P4` when `P4` could mean either phase or priority.

Use explicit terminology:

```text
PHASE-04
PRIORITY-1
TASK-INT-001
```

---

## Product references

Each task must reference the relevant product requirements.

Example:

```text
PR-QS-001
PR-MOD-002
```

---

## Architecture references

Each task must reference relevant architecture rules.

Example:

```text
ARCH-DOM-003
ARCH-INT-002
```

---

## Contract references

Where applicable:

```text
DOMAIN-001
API-003
DATA-004
EVENT-002
AI-001
SEC-003
TEST-002
```

---

## Dependencies

Every task must state:

```text
Depends On:
Blocks:
```

---

## Allowed scope

The task must explicitly state what the agent may modify.

---

## Forbidden scope

The task must explicitly state what the agent must not modify.

---

## Acceptance criteria

Acceptance criteria must be observable and testable.

Avoid:

```text
"Make the detector good."
```

Prefer:

```text
"Given the defined fixture, the detector produces the expected signal type."
```

---

## Verification evidence

The task must record:

```text
Commands executed
Tests executed
Build result
Typecheck result
Lint result
Relevant manual verification
Known limitations
```

---

# 25. TASK SCOPE CONTROL

An agent must not silently expand a task.

If implementation reveals work outside the task:

```text
STOP
 ↓
Identify missing dependency
 ↓
Document the dependency
 ↓
Create/propose a follow-up task
 ↓
Update dependency graph
 ↓
Continue only when authorized
```

Do not solve unrelated problems merely because they are visible.

---

# 26. NO HIDDEN WORK RULE

A task must not secretly implement future functionality.

For example, while implementing:

```text
TASK-INT-001 — Evaluator deviation detector
```

the agent must not silently add:

* AI explanations;
* analytics dashboards;
* moderation redesign;
* new authentication;
* new infrastructure;
* unrelated UI redesign.

Those belong to separate tasks.

---

# 27. VERIFICATION MODEL

Each completed task must be verified at the appropriate levels.

```text
Level 1 — Static
    ↓
Typecheck
Lint
Formatting

Level 2 — Unit
    ↓
Domain logic
Detectors
Utilities

Level 3 — Integration
    ↓
Database
API
Module interactions

Level 4 — Workflow
    ↓
End-to-end feature path

Level 5 — Demo
    ↓
Human-visible golden path
```

Not every task requires every level.

The task specification determines the required verification level.

---

# 28. TRACEABILITY

The project should maintain the following traceability chain:

```text
Problem Statement
        ↓
Product Requirement
        ↓
Architecture Requirement
        ↓
Roadmap Phase
        ↓
Task
        ↓
Implementation
        ↓
Test
        ↓
Verification Evidence
```

A critical feature should be traceable through this chain.

---

# 29. PROJECT STATE

`docs/12-project-state.md` is the authoritative document for current project execution state.

It should track:

```text
Current Phase
Current Task
Completed Phases
Completed Tasks
Blocked Tasks
Known Risks
Known Issues
Demo Readiness
Contract Changes
Architecture Changes
```

Individual tasks remain responsible for their own detailed implementation status.

---

# 30. ROADMAP CHANGE CONTROL

The roadmap is authoritative.

Changes to phase ordering, major dependencies, or MVP scope must not be made casually.

A change should identify:

```text
Change
Reason
Affected phases
Affected tasks
Affected contracts
Risks
Required migration
```

If the change materially affects architecture or product behavior, record the decision in the project decision/ADR system.

---

# 31. ARCHITECTURE CHANGE RULE

If implementation reveals that the architecture contract is insufficient:

```text
Do not silently redesign architecture.
```

Instead:

```text
Identify issue
    ↓
Document proposed change
    ↓
Assess affected contracts/tasks
    ↓
Obtain human approval
    ↓
Update architecture contract
    ↓
Update roadmap if necessary
    ↓
Continue implementation
```

---

# 32. AI-SPECIFIC ROADMAP INVARIANTS

The following constraints apply permanently.

## AI is assistive

```text
AI may:
✓ analyze
✓ summarize
✓ classify
✓ explain
✓ suggest
✓ prioritize
✓ surface patterns
```

Subject to approved product behavior.

---

## AI is not automatically authoritative

```text
AI must not independently:
✗ assign authoritative marks
✗ resolve moderation
✗ declare misconduct
✗ bypass authorization
✗ alter rubrics
✗ overwrite historical audit state
✗ bypass human-required decisions
```

---

# 33. DATA AUTHORITY INVARIANTS

The system must distinguish:

```text
AUTHORITATIVE DATA
```

from:

```text
DERIVED DATA
```

Examples:

```text
Evaluation
→ authoritative

QualitySignal
→ derived observation

TriageCase
→ workflow state

Resolution
→ human decision/action

Analytics
→ derived insight
```

Derived information must not silently become authoritative information.

---

# 34. EVENT AND AUDIT INVARIANTS

Events should be introduced when they provide meaningful value.

Do not add:

* queues;
* workers;
* event buses;
* asynchronous pipelines

only to make the architecture appear sophisticated.

Use synchronous processing where it is sufficient.

Introduce asynchronous processing only when justified by:

* workload;
* latency;
* reliability;
* isolation;
* external integration;
* explicit product requirements.

---

# 35. FAILURE-FIRST REQUIREMENTS

Each major workflow should define its behavior for failure.

At minimum consider:

```text
Invalid input
Unauthorized request
Missing data
Duplicate request
Duplicate event
Concurrent update
Database failure
External integration failure
AI provider failure
AI timeout
Malformed AI output
Configuration failure
```

The system should fail safely rather than silently corrupting state.

---

# 36. MVP PRIORITIZATION

Use explicit priority terminology.

```text
PRIORITY-0
Critical for core MVP operation

PRIORITY-1
High-value functionality required for a compelling MVP

PRIORITY-2
Enhancement that improves the product but is not required for the core demonstration

PRIORITY-3
Future functionality
```

Priority does not override roadmap dependencies.

A `PRIORITY-0` task that depends on a missing foundation must wait for that dependency.

---

# 37. BUILD STRATEGY

The preferred development strategy is:

```text
Build small
    ↓
Integrate immediately
    ↓
Test
    ↓
Verify
    ↓
Document
    ↓
Expand
```

Avoid:

```text
Build entire frontend
+
Build entire backend
+
Build entire AI
+
Integrate at the end
```

---

# 38. AGENT EXECUTION LOOP

When an AI coding agent receives a task:

```text
1. Read AGENTS.md
        ↓
2. Read project context
        ↓
3. Read current task
        ↓
4. Read referenced contracts
        ↓
5. Inspect existing repository
        ↓
6. Identify existing infrastructure
        ↓
7. Confirm task dependencies
        ↓
8. Implement only the approved scope
        ↓
9. Run required tests
        ↓
10. Run required verification
        ↓
11. Check architecture invariants
        ↓
12. Update task status
        ↓
13. Update traceability where required
        ↓
14. Report what changed
        ↓
15. Report verification evidence
        ↓
16. Report blockers
        ↓
17. STOP
```

---

# 39. AGENT STOP CONDITIONS

An agent should stop rather than guess when:

```text
Product requirement is ambiguous
Architecture is contradictory
Required contract is missing
Dependency is unavailable
Security boundary is unclear
Database migration is risky
External API behavior is unknown
Task requires out-of-scope architectural changes
```

The agent should document the blocker and request clarification.

---

# 40. ROADMAP COMPLETION CRITERIA

The MVP roadmap is complete when:

```text
✓ Core evaluation workflow works
✓ Deterministic quality detection works
✓ QualitySignal pipeline works
✓ Moderation workflow works
✓ Human resolution works
✓ Audit trail works
✓ AI assistance works within defined boundaries
✓ Analytics/insights work where required
✓ OSM integration boundary works
✓ Critical security requirements pass
✓ Critical tests pass
✓ Demo golden path works
✓ Demo can be reset
✓ Synthetic data is clearly identified
✓ Product claims match actual implementation
✓ Critical requirements are traceable
✓ No known critical blocker remains
```

---

# 41. FINAL MVP FLOW

The completed MVP should conceptually demonstrate:

```text
                 OSM
                  │
                  ▼
             Evaluation
                  │
                  ▼
          Deterministic Checks
                  │
                  ▼
          Quality Intelligence
                  │
                  ▼
            QualitySignal
                  │
                  ▼
             TriageCase
                  │
                  ▼
          Human Investigation
                  │
                  ├──────────────┐
                  │              │
                  ▼              ▼
             AI Assistance    Evidence
                  │              │
                  └──────┬───────┘
                         ▼
                     Resolution
                         │
                         ▼
                     AuditEvent
                         │
                         ▼
                     Analytics
                         │
                         ▼
                  Quality Insights
```

The core principle remains:

```text
DETECT
  ↓
EXPLAIN
  ↓
REVIEW
  ↓
DECIDE
  ↓
AUDIT
  ↓
LEARN
```

not:

```text
AI
 ↓
DECIDE
```

---

# 42. FINAL ROADMAP RULE

The roadmap defines **the order of construction**.

Tasks define **the exact work being performed**.

Contracts define **the rules that implementation must obey**.

Tests define **how correctness is demonstrated**.

Project state defines **where the project currently is**.

Therefore:

```text
CONTRACTS
   ↓
ROADMAP
   ↓
TASKS
   ↓
CODE
   ↓
TESTS
   ↓
VERIFICATION
   ↓
TRACEABILITY
   ↓
PROJECT STATE
```

No coding agent should bypass this chain for consequential implementation work.
