# DOMAIN CONTRACT

**Project:** AI-Powered On-Screen Marking & Digital Examination Evaluation Platform
**Document:** `docs/contracts/05-domain-contract.md`
**Purpose:** Authoritative domain model, domain semantics, invariants, ownership boundaries, and state rules
**Status:** Living Technical Contract
**Audience:** Developers, architects, QA, AI coding agents
**Depends On:**

* `docs/contracts/00-project-context.md`
* `docs/contracts/01-product-contract.md`
* `docs/contracts/02-architecture-contract.md`
* `docs/planning/03-build-roadmap.md`
* `docs/planning/04-task-board.md`

---

# 1. PURPOSE

This document defines the **domain meaning and behavioral invariants** of the OSM system.

It answers:

> **What does each important domain concept mean, who owns it, what authority does it have, and how may it change?**

This document is the authoritative source for:

* domain concepts
* entity responsibilities
* aggregate boundaries
* domain relationships
* authoritative vs derived concepts
* domain invariants
* state semantics
* actor semantics
* provenance requirements
* evidence semantics
* quality-signal semantics
* moderation semantics
* resolution semantics
* audit semantics
* domain-event boundaries
* AI authority boundaries

This document does **not** define:

* database table schemas
* ORM models
* API routes
* HTTP payloads
* UI implementation
* exact event payload schemas
* AI provider-specific implementation
* infrastructure deployment

Those belong to their respective contracts.

---

# 2. CORE DOMAIN PRINCIPLE

OSM exists to improve the quality, consistency, observability, and traceability of digital examination evaluation while preserving appropriate human authority over consequential academic decisions.

The core domain distinction is:

```text
DETECTION
    ≠
DECISION
    ≠
AUDIT
```

More explicitly:

```text
What happened
      ↓
What was detected
      ↓
What was investigated
      ↓
What a human decided
      ↓
What was recorded permanently
```

The domain must never collapse these into one generic concept.

The system must preserve:

```text
QualitySignal
      ≠
TriageCase
      ≠
Resolution
      ≠
AuditEvent
```

---

# 3. DOMAIN AUTHORITY MODEL

The domain is divided into four authority classes.

## 3.1 Authoritative operational state

These represent the current official state of the examination/evaluation workflow.

Examples:

```text
Evaluation
Mark
Rubric
Evaluator participation
TriageCase
Resolution
```

These may affect consequential workflow state only through authorized application operations.

---

## 3.2 Derived intelligence

These represent observations or analytical results derived from authoritative or external data.

Examples:

```text
QualitySignal
Statistical deviation
Risk indicator
Trend
Detector result
AI recommendation
```

Derived intelligence does **not** become authoritative merely because it exists.

---

## 3.3 Human decisions

Human decisions are represented through explicit domain actions such as:

```text
Resolution
```

A human decision may be informed by:

* authoritative evaluation data
* deterministic validation
* statistical analysis
* detector evidence
* AI assistance
* external evidence

But the supporting evidence does not itself become the decision.

---

## 3.4 Durable history

Historical records are represented through:

```text
AuditEvent
```

Audit history records important actions and state transitions.

Audit records are historical evidence.

They are not a replacement for current operational state.

---

# 4. CORE DOMAIN LIFECYCLE

The primary quality-review lifecycle is:

```text
Evaluation
    ↓
Deterministic Validation
    ↓
Statistical / Intelligence Analysis
    ↓
QualitySignal
    ↓
TriageCase
    ↓
Human Investigation
    ↓
Resolution
    ↓
AuditEvent
```

Not every evaluation produces a signal.

Not every signal produces a case.

Not every case produces a change to academic evaluation state.

Not every system action creates a moderation case.

The system must preserve these distinctions.

---

# 5. DOMAIN CONCEPT MAP

The core domain concepts are:

```text
EvaluationCycle
    │
    ├── Evaluation
    │      ├── Script / Submission Reference
    │      ├── Questions
    │      ├── Marks
    │      └── Rubric Context
    │
    ├── Evaluator Participation
    │
    └── Evaluation State


Evaluation
    │
    ├── Validation
    │
    └── Intelligence
            ↓
       QualitySignal
            ↓
       TriageCase
            ↓
       Resolution
            ↓
       AuditEvent
```

Supporting concepts include:

```text
Question
Mark
Rubric
Exemplar
Evaluator
Evidence
Provenance
Actor
Detector
Resolution
AuditEvent
```

Later-stage domain concepts may include:

```text
CalibrationInteraction
Revaluation
LearningInsight
```

These must not be implemented merely because they appear in this document. Their implementation remains governed by the Product Contract and Build Roadmap.

---

# 6. DOMAIN BOUNDARIES

The MVP uses logical domain boundaries within a modular monolith.

A domain boundary does not automatically imply:

* a microservice
* a separate repository
* a separate deployment
* a separate database
* a separate process

The primary logical ownership boundaries are:

```text
Evaluation
    ↓
Evaluation Domain

Validation
    ↓
Validation Domain

Quality Intelligence
    ↓
Intelligence Domain

Moderation
    ↓
Moderation Domain

Audit
    ↓
Audit Domain

Integration
    ↓
Integration Boundary
```

The exact module structure is defined by the Architecture Contract.

---

# 7. ENTITY VS VALUE OBJECT PRINCIPLE

Not every domain concept requires independent identity.

## 7.1 Entity

An entity has identity that remains meaningful across state changes.

Examples include:

```text
EvaluationCycle
Evaluation
Question
Rubric
Exemplar
Evaluator
QualitySignal
TriageCase
Resolution
AuditEvent
```

---

## 7.2 Value / descriptive object

A value represents information whose meaning is defined by its contents rather than an independent lifecycle.

Examples may include:

```text
MarkValue
Severity
ActorReference
EvidenceReference
Provenance
DetectorVersion
Reason
```

The exact implementation as classes, records, structs, or database types belongs to implementation contracts.

The agent must not create separate persistent entities merely because a concept is represented as an object in code.

---

# 8. AGGREGATE BOUNDARIES

The domain must maintain clear ownership boundaries.

## 8.1 Evaluation Aggregate

Conceptual responsibility:

```text
Evaluation
    ├── evaluation state
    ├── question-level evaluation context
    └── authoritative marks
```

The Evaluation aggregate owns rules governing the consistency of an evaluation and its marking state.

It does not own:

* detector implementation
* moderation workflow
* AI provider behavior
* audit storage

---

## 8.2 Quality Intelligence Boundary

Conceptual responsibility:

```text
Detector
    ↓
QualitySignal
    ↓
Provenance / Evidence references
```

The intelligence boundary produces derived observations.

It does not own:

* human moderation decisions
* authoritative marks
* final misconduct findings
* final academic decisions

---

## 8.3 Moderation Aggregate

Conceptual responsibility:

```text
TriageCase
    ├── linked QualitySignals
    ├── workflow state
    ├── assignment
    ├── investigation context
    └── Resolution
```

The moderation boundary owns investigation workflow and human decisions.

---

## 8.4 Audit Boundary

Conceptual responsibility:

```text
AuditEvent
```

The Audit boundary owns durable historical records.

It does not become the source of current operational truth.

---

# 9. EVALUATION CYCLE

## Definition

An `EvaluationCycle` represents a defined examination/evaluation period or organized evaluation process.

It provides context for evaluations.

Conceptually:

```text
EvaluationCycle
    ↓
Evaluations
```

An EvaluationCycle may define or reference:

* examination context
* subject/context
* applicable evaluation configuration
* participating evaluators
* evaluation period

Exact attributes are defined by the Data Contract.

---

# 10. EVALUATION

## Definition

An `Evaluation` represents an authorized evaluation/marking instance for a student's submitted work or examination script.

An Evaluation provides the authoritative context for:

```text
submission/script reference
evaluator participation
question-level evaluation
marks
rubric context
evaluation state
```

## 10.1 Submission representation

For the MVP, the student's submitted work may be represented through:

```text
external submission/script reference
```

or an evaluation-owned reference to the relevant submitted artifact.

A separate `Submission` aggregate is **not required by this contract** unless explicitly introduced by the Product Contract or a recorded architecture/domain decision.

The coding agent must not invent a full Submission domain merely because the evaluation references submitted work.

---

## 10.2 Evaluation authority

An Evaluation is authoritative for the operational evaluation state represented by the product.

However:

```text
QualitySignal
AI recommendation
Statistical observation
Dashboard result
```

must never silently overwrite authoritative evaluation state.

Any consequential modification must pass through an authorized application workflow.

---

# 11. QUESTION

A `Question` represents an evaluable item within an examination/evaluation context.

A Question may provide:

* question identity
* question context
* maximum applicable marks
* rubric context
* evaluation context

A Question does not itself represent an awarded mark.

The distinction is:

```text
Question
    ↓
Evaluation of Question
    ↓
Mark
```

---

# 12. MARK

A `Mark` represents an awarded score for a specific evaluation item.

## 12.1 Mark invariants

For an applicable maximum mark:

```text
0 <= awarded marks <= maximum applicable marks
```

A Mark must be attributable to:

```text
Evaluation
Question / evaluation item
Evaluator context
```

where applicable.

---

## 12.2 Mark authority

A Mark is authoritative operational data when it belongs to the applicable authoritative evaluation state.

AI-generated or statistical suggestions must not automatically become authoritative Marks.

If the system later supports AI mark recommendations, those recommendations must remain:

```text
non-authoritative
advisory
reviewable
overridable
auditable
```

until explicitly accepted through an authorized human workflow.

---

# 13. RUBRIC

A `Rubric` represents the criteria or marking guidance used to evaluate work.

An evaluation must be traceable to the applicable rubric context.

## 13.1 Rubric versioning

A completed evaluation must remain interpretable according to the rubric version applicable when that evaluation was performed.

Therefore:

```text
Current Rubric
    ≠
Historical Rubric Interpretation
```

Changing the current rubric must not silently rewrite the meaning of completed historical evaluations.

---

# 14. EXEMPLAR

An `Exemplar` represents an approved reference example used to support consistent evaluation, calibration, explanation, or review.

An Exemplar is reference material.

It is not itself:

* an authoritative mark
* a moderation decision
* a QualitySignal
* a Resolution

Use of exemplars must remain traceable where they materially influence a review or recommendation.

---

# 15. EVALUATOR

An `Evaluator` represents a participant authorized to perform evaluation work within the relevant evaluation context.

The domain may reference:

```text
evaluatorId
```

without owning authentication itself.

The distinction is:

```text
Identity / Authentication
        ↓
Authorization
        ↓
Evaluator Participation
        ↓
Evaluation
```

Authentication and authorization rules belong to the Security Contract.

The domain is responsible for enforcing domain-level requirements such as:

* evaluator participation
* evaluation ownership/assignment where applicable
* attribution of marking actions
* evaluator context required for analysis

---

# 16. EVIDENCE

## Definition

`Evidence` represents information referenced to support a QualitySignal, investigation, recommendation, or Resolution.

Evidence may reference:

```text
evaluation data
question/mark data
detector output
statistical context
historical comparison
AI analysis
external integration data
```

Evidence should identify its source or reference sufficiently for the relevant workflow to understand where it came from.

## 16.1 Evidence authority

Evidence does not become authoritative merely because it is attached to a case.

For example:

```text
AI explanation
    ≠
human finding
```

and:

```text
statistical deviation
    ≠
confirmed evaluation error
```

---

# 17. PROVENANCE

## Definition

`Provenance` describes how a derived observation or recommendation was produced.

At minimum, relevant provenance should identify:

```text
SOURCE
  ↓
INPUT CONTEXT
  ↓
METHOD
  ↓
VERSION
  ↓
RESULT
```

Where applicable, provenance should include:

* detector identity
* detector version
* model/provider identity
* model version
* generation timestamp
* relevant input/context reference
* analysis method
* confidence or uncertainty metadata where supported

Provenance must support reproducibility and explainability appropriate to the capability.

---

# 18. ACTOR MODEL

Important domain actions must be attributable to an actor.

Conceptual actor categories:

```text
USER
SYSTEM
DETECTOR
AI
INTEGRATION
```

The exact actor representation belongs to the Data/Event Contracts.

## 18.1 AI actor rule

AI may be represented as the source of:

```text
recommendation
summary
classification
analysis
derived observation
```

AI must not be represented as the human authority responsible for a consequential academic decision.

Therefore:

```text
AI-generated recommendation
        ↓
Human review
        ↓
Human Resolution
```

not:

```text
AI
 ↓
Final Resolution
```

---

# 19. QUALITY SIGNAL

## Definition

A `QualitySignal` represents:

> An evidence-bearing derived observation indicating that an evaluation-quality condition may deserve attention.

A QualitySignal may be generated by:

```text
Deterministic Detector
Statistical Detector
Approved AI-assisted intelligence process
```

subject to the AI Contract.

---

## 19.1 QualitySignal properties

A QualitySignal should contain or reference:

```text
signal type
subject
evaluation context
evidence
provenance
generated timestamp
severity/priority where applicable
status
```

The exact persistence representation belongs in the Data Contract.

---

## 19.2 QualitySignal is not a decision

This is a hard invariant:

```text
QualitySignal
    ≠
Finding
```

For example:

```text
High evaluator deviation
    ≠
Evaluator misconduct

Missing mark
    ≠
Confirmed marking error

Unusual score pattern
    ≠
Confirmed academic issue
```

A signal indicates something that may deserve review.

---

# 20. QUALITY SIGNAL LIFECYCLE

A QualitySignal may exist independently of a moderation case.

Conceptually:

```text
GENERATED
    ↓
REVIEWABLE
    │
    ├──────────────→ remains unlinked
    │
    ↓
LINKED_TO_CASE
    ↓
UNDER_INVESTIGATION
    ↓
RESOLVED
```

The exact status vocabulary must be finalized consistently with the Product Contract and implemented through the appropriate workflow contract.

The important invariant is:

> A QualitySignal does not require immediate creation of a TriageCase.

---

# 21. SIGNAL DEDUPLICATION

Repeated detector execution must not create uncontrolled duplicate representations of the same signal when the product semantics define the observations as equivalent.

The implementation should support an appropriate notion of:

```text
signal identity
detector identity
evaluation context
generation/version context
```

to distinguish:

```text
same observation repeated
```

from:

```text
new observation
```

Exact idempotency rules belong in the Event/Data Contracts.

---

# 22. TRIAGE CASE

## Definition

A `TriageCase` represents a human investigation workflow created to investigate one or more QualitySignals.

A TriageCase may:

* group related signals
* assign a priority
* assign a reviewer/moderator
* track workflow state
* collect investigation notes
* reference evidence
* record escalation
* contain or reference the resulting Resolution

---

# 23. QUALITY SIGNAL VS TRIAGE CASE

These must remain distinct.

```text
QualitySignal
    =
derived observation
```

```text
TriageCase
    =
human investigation workflow
```

Therefore:

```text
Signal exists
    ↓
Case may be created
```

but not:

```text
Signal exists
    ↓
Case automatically proves an issue
```

---

# 24. TRIAGE CASE LIFECYCLE

A conceptual workflow is:

```text
OPEN
  ↓
ASSIGNED
  ↓
UNDER_REVIEW
  ↓
RESOLVED
```

Additional states such as escalation may be introduced only when approved by the Product Contract or relevant workflow contract.

A case state represents **workflow state**, not the substantive truth of the underlying signal.

---

# 25. RESOLUTION

## Definition

A `Resolution` represents an authorized human action or decision taken during moderation/investigation.

A Resolution may represent outcomes such as:

```text
signal accepted/reviewed
signal dismissed
legitimate variation
correction required
escalation
calibration requested
```

The exact authoritative outcome vocabulary must be defined consistently with the Product Contract.

The domain contract must not independently create competing outcome enums.

---

# 26. RESOLUTION VS TRIAGE CASE STATE

This distinction is mandatory.

```text
TriageCase State
    =
Where the investigation is in its workflow
```

while:

```text
Resolution Outcome
    =
What the authorized human decided
```

Therefore these are different concepts.

Example:

```text
TriageCase:
UNDER_REVIEW

Resolution:
LEGITIMATE_VARIATION
```

The exact vocabulary belongs to the approved product/workflow specification.

---

# 27. RESOLUTION AUTHORITY

A Resolution must be attributable to an authorized human actor.

A Resolution must not be silently generated by:

```text
detector
statistical analysis
AI model
dashboard
background job
```

Those systems may provide evidence or recommendations.

They do not become the human decision-maker.

---

# 28. RESOLUTION REASON

A consequential Resolution should include an appropriate reason or rationale reference.

The reason should be sufficient for the relevant workflow to understand why the Resolution was recorded.

Where applicable, the Resolution may reference:

```text
QualitySignal
Evidence
Reviewer notes
AI recommendation
Detector result
Rubric context
```

The presence of supporting information does not make that information authoritative by itself.

---

# 29. AUDIT EVENT

## Definition

An `AuditEvent` represents a durable historical record of an important system or human action.

Examples include:

```text
Evaluation submitted
QualitySignal generated
TriageCase created
TriageCase assigned
Investigation action recorded
Resolution recorded
Signal dismissed
Case escalated
Calibration requested
Rubric updated
Learning insight accepted
```

Exact event names and payloads belong in:

```text
docs/contracts/07-event-contract.md
```

---

# 30. AUDIT EVENT VS DOMAIN EVENT

These concepts must not be assumed to be identical.

## Domain/Application Event

Represents:

> Something meaningful happened in the application/domain workflow.

Examples:

```text
EvaluationSubmitted
QualitySignalGenerated
TriageCaseCreated
ResolutionRecorded
```

## AuditEvent

Represents:

> A durable historical record required for traceability of an important action or state change.

Therefore:

```text
Domain Event
    ≠ necessarily
AuditEvent
```

A domain event may result in an audit record.

An audit record may also be generated by a consistent audit mechanism around an important action.

The exact relationship belongs in the Event Contract.

---

# 31. AUDIT AUTHORITY

Audit history must not depend on UI behavior.

Important actions must generate audit records through the approved application/domain mechanism.

The system must not rely on:

```text
frontend logging
browser state
console output
dashboard activity
```

as the authoritative audit trail.

---

# 32. AUTHORITATIVE VS DERIVED DOMAIN DATA

## 32.1 Authoritative

Examples:

```text
Evaluation state
Marks
Rubric
Exemplar
Evaluator participation
TriageCase workflow state
Human Resolution
```

---

## 32.2 Derived

Examples:

```text
QualitySignal
Evaluator averages
Deviation scores
Risk indicators
Trend calculations
Dashboard aggregates
AI recommendations
```

---

## 32.3 Audit

Examples:

```text
Actor
Action
Timestamp
Previous state reference
Resulting state reference
Reason
Relevant object reference
```

---

## 32.4 Demo data

Examples:

```text
Seeded anomaly
Synthetic evaluator
Synthetic evaluation
Synthetic script
Synthetic review scenario
```

Demo data must remain distinguishable from real operational data.

---

# 33. DETECTION HIERARCHY

Quality intelligence follows this conceptual hierarchy:

```text
DETERMINISTIC
    ↓
STATISTICAL
    ↓
AI ASSISTANCE
```

## Deterministic

Used for rules with clear expected behavior.

Examples:

```text
missing required evaluation item
invalid mark range
missing required field
incomplete evaluation
```

## Statistical

Used when comparison against an appropriate population or baseline is meaningful.

Examples:

```text
evaluator mean deviation
unusual score distribution
unexpected marking variance
```

## AI assistance

Used when interpretation, summarization, comparison, or contextual explanation benefits from AI.

AI must not replace deterministic validation where deterministic logic is sufficient.

---

# 34. STATISTICAL CONTEXT REQUIREMENT

A statistical signal must contain or reference enough context to make the statistical observation interpretable.

Relevant context may include:

```text
comparison population
baseline
sample size
evaluation/question context
time period
comparison method
detector version
result
```

The system must avoid presenting a statistical score without sufficient context to understand what was compared.

A statistical observation is not automatically a finding.

---

# 35. AI DOMAIN BOUNDARY

AI is assistive.

AI may provide:

```text
summary
comparison
explanation
recommendation
classification
contextual analysis
```

AI must not directly:

```text
assign authoritative marks
resolve moderation cases
declare misconduct
modify rubrics
bypass authorization
silently mutate authoritative domain state
```

The AI Contract defines the exact permitted AI behaviors.

---

# 36. AI OUTPUT SEMANTICS

Where AI produces a recommendation, the domain should conceptually treat the result as:

```text
Recommendation
    +
Evidence
    +
Confidence / uncertainty where available
    +
Provenance
    +
Human-review requirement
```

AI output must not be interpreted as an authoritative academic decision.

If an AI-generated suggestion concerns marks, it remains:

```text
advisory
reviewable
overridable
auditable
non-authoritative
```

until an authorized human workflow explicitly accepts it.

---

# 37. ACTOR AUTHORITY MATRIX

| Actor              |       May Observe | May Generate Signal |   May Investigate |      May Resolve | May Authoritative Modify Academic State |
| ------------------ | ----------------: | ------------------: | ----------------: | ---------------: | --------------------------------------: |
| Evaluator          |               Yes |     System-assisted |  Where authorized | Where authorized |                        Where authorized |
| Moderator/Reviewer |               Yes |    Where authorized |               Yes |              Yes |                        Where authorized |
| System             |               Yes |                 Yes | No human decision |               No |          Only through approved workflow |
| Detector           |               Yes |                 Yes |                No |               No |                                      No |
| AI                 | Context-dependent |           Assistive |                No |               No |                                      No |
| Integration        | Context-dependent |       Where defined |                No |               No |                                      No |

Exact role permissions belong in the Security Contract.

---

# 38. DOMAIN INVARIANTS

The following are hard domain invariants.

## INV-001 — Signal Is Not Decision

```text
QualitySignal ≠ Resolution
```

---

## INV-002 — Case Is Not Proof

```text
TriageCase ≠ confirmed issue
```

---

## INV-003 — AI Is Not Authority

```text
AI output ≠ authoritative academic decision
```

---

## INV-004 — Statistical Observation Is Not Finding

```text
statistical anomaly ≠ confirmed problem
```

---

## INV-005 — Audit Is Historical

```text
AuditEvent records history
```

It does not replace current operational state.

---

## INV-006 — Human Resolution Is Explicit

Consequential moderation decisions must pass through an authorized human workflow.

---

## INV-007 — Evidence Does Not Become Authority

Evidence attached to a signal or case does not automatically change authoritative state.

---

## INV-008 — Historical Evaluation Meaning Is Stable

Changing a current rubric must not silently rewrite the interpretation of a completed historical evaluation.

---

## INV-009 — Authoritative State Has One Owner

A major domain concept must have one authoritative owner.

Derived views must not become competing sources of truth.

---

## INV-010 — Demo Data Is Distinguishable

Synthetic/demo records must not silently masquerade as real institutional records.

---

# 39. DOMAIN RELATIONSHIPS

The conceptual relationships are:

```text
EvaluationCycle
    │
    └── 1..N Evaluations

Evaluation
    │
    ├── references Script / Submission
    ├── references Evaluator
    ├── contains evaluation context
    ├── contains Question-level evaluation
    └── contains authoritative Marks

Question
    │
    └── applicable Rubric context

Evaluation
    │
    └── produces data consumed by
            │
            ├── Validation
            └── Intelligence

Intelligence
    │
    └── produces QualitySignal

QualitySignal
    │
    └── may be linked to TriageCase

TriageCase
    │
    └── may produce Resolution

Resolution
    │
    └── produces/requires Audit history where applicable
```

---

# 40. DOMAIN OWNERSHIP MATRIX

| Concept                 | Primary Owner                       | Authority              |
| ----------------------- | ----------------------------------- | ---------------------- |
| EvaluationCycle         | Evaluation                          | Authoritative          |
| Evaluation              | Evaluation                          | Authoritative          |
| Question                | Evaluation / Examination Context    | Authoritative          |
| Mark                    | Evaluation                          | Authoritative          |
| Rubric                  | Evaluation / Configuration          | Authoritative          |
| Exemplar                | Evaluation / Calibration            | Authoritative          |
| Evaluator participation | Evaluation / Authorization boundary | Authoritative          |
| QualitySignal           | Quality Intelligence                | Derived                |
| Evidence reference      | Producing/consuming workflow        | Supporting             |
| Provenance              | Producing intelligence process      | Derived metadata       |
| TriageCase              | Moderation                          | Authoritative workflow |
| Resolution              | Moderation                          | Human-authoritative    |
| AuditEvent              | Audit                               | Durable history        |

No dashboard, analytics view, AI provider, or frontend component may become a competing owner of these concepts.

---

# 41. DOMAIN ERROR SEMANTICS

Domain operations should fail explicitly when invariants are violated.

Examples include:

```text
InvalidMarkValue
UnauthorizedEvaluationAction
InvalidEvaluationStateTransition
InvalidCaseStateTransition
InvalidResolution
MissingResolutionReason
InvalidRubricContext
InvalidSignalReference
DuplicateDomainAction
```

Exact error types and API representations belong to the API/Data Contracts.

The important rule is:

> Domain invariants must be enforced at the appropriate domain/application boundary and must not depend solely on frontend validation.

---

# 42. CONCURRENCY AND STATE INTEGRITY

The system must prevent conflicting updates from silently producing invalid domain state.

Particularly sensitive operations include:

```text
evaluation submission
mark finalization
case assignment
case resolution
resolution changes
rubric changes
```

Where concurrent actions are possible, the implementation must use an appropriate consistency mechanism.

Exact mechanisms belong to the Architecture/Data Contracts.

---

# 43. IDEMPOTENCY

Operations that may be retried must not unintentionally duplicate consequential domain effects.

Examples:

```text
QualitySignal generation
TriageCase creation
Audit recording
Evaluation submission
External integration processing
```

The exact idempotency mechanism belongs in the relevant API/Event/Data Contract.

The domain invariant is:

> A retry must not silently create an invalid duplicate business outcome.

---

# 44. DOMAIN EVENTS

The domain may emit meaningful events such as:

```text
EvaluationSubmitted
QualitySignalGenerated
TriageCaseCreated
TriageCaseAssigned
ResolutionRecorded
CalibrationRequested
```

Events should represent meaningful domain/application changes.

The project must not introduce event-driven complexity merely to make the architecture appear sophisticated.

Exact:

* event names
* payloads
* versioning
* delivery semantics
* retry behavior
* idempotency

belong in:

```text
docs/contracts/07-event-contract.md
```

---

# 45. SYNCHRONOUS VS ASYNCHRONOUS DOMAIN WORK

Domain operations should remain synchronous when:

* immediate consistency is required
* work is lightweight
* a response is required immediately

Analysis may be asynchronous when:

* computation is expensive
* AI generation may take time
* large analytical processing is required
* downstream work can proceed independently

The domain contract does not mandate queues or workers.

For the MVP:

> Do not introduce distributed processing solely for architectural appearance.

---

# 46. DOMAIN ACCESS RULES

The presentation layer must not directly mutate domain state.

Preferred:

```text
UI
 ↓
API
 ↓
Application Use Case
 ↓
Domain
 ↓
Repository / Infrastructure
```

Not:

```text
UI
 ↓
Database
```

or:

```text
UI
 ↓
AI Provider
```

The domain should remain independent from presentation concerns.

---

# 47. PERSISTENCE INDEPENDENCE

The domain model must not depend unnecessarily on:

```text
ORM-specific APIs
database-specific query behavior
HTTP request objects
UI state
AI provider SDKs
```

Preferred conceptual flow:

```text
Domain / Application
        ↓
Repository Interface
        ↓
Persistence Adapter
        ↓
Database
```

Exact persistence structures belong in:

```text
docs/contracts/08-data-contract.md
```

---

# 48. DOMAIN ANTI-PATTERNS

The following are prohibited unless explicitly approved.

## AP-DOM-001 — Generic Issue Object

Do not collapse:

```text
QualitySignal
TriageCase
Resolution
AuditEvent
```

into:

```text
Issue
```

---

## AP-DOM-002 — AI Decision Object

Do not create a domain object that treats AI output as an authoritative academic decision.

---

## AP-DOM-003 — God Aggregate

Do not create one aggregate containing:

```text
Evaluation
Signals
Moderation
AI
Audit
Analytics
```

---

## AP-DOM-004 — Dashboard Authority

Analytics must not become the source of truth for domain state.

---

## AP-DOM-005 — Hidden Resolution

Do not allow background processes to silently produce human-authoritative Resolution state.

---

## AP-DOM-006 — Rubric Mutation of History

Do not make historical evaluations change meaning merely because the current rubric changed.

---

## AP-DOM-007 — Evidence Equals Truth

Do not treat evidence existence as proof of the underlying allegation or issue.

---

## AP-DOM-008 — Statistical Score Equals Finding

Do not convert an anomaly score directly into a confirmed domain decision.

---

# 49. DOMAIN TRACEABILITY

Every significant domain concept should trace to the Product Contract and Architecture Contract.

Example:

```text
Product Requirement
        ↓
Evaluation Quality Detection
        ↓
QualitySignal
        ↓
Quality Intelligence
        ↓
Detector
        ↓
TriageCase
        ↓
Human Resolution
        ↓
AuditEvent
```

Operational mappings belong in:

```text
docs/13-traceability.md
```

---

# 50. IMPLEMENTATION BOUNDARY

The domain contract defines **meaning and invariants**, not implementation.

An AI coding agent must not infer:

```text
new entity
new aggregate
new persistence model
new event
new workflow
```

merely because doing so appears technically convenient.

Before introducing a new domain concept, the agent must determine whether:

1. the Product Contract requires it,
2. the Architecture Contract establishes it,
3. this Domain Contract already defines an equivalent concept,
4. an existing repository implementation already provides it,
5. a recorded decision authorizes it.

If none applies and the change is material:

```text
STOP
↓
Identify the ambiguity
↓
Create/propose a decision
↓
Update the appropriate contract
↓
Then implement
```

---

# 51. DOMAIN CONTRACT CHANGE CONTROL

Changes to any of the following require deliberate review:

```text
domain entity
aggregate boundary
domain ownership
authority classification
state transition
resolution semantics
AI authority boundary
audit semantics
historical interpretation
```

A coding task must not silently redefine these concepts.

If implementation reveals a contradiction:

```text
Do not silently reinterpret the contract.
Do not create a parallel domain model.
Do not patch around the contradiction.

Identify the conflict.
Record it.
Resolve it through the appropriate contract/decision process.
```

---

# 52. DOMAIN ACCEPTANCE GATE

Before implementation relying on this contract begins, verify:

## Core Model

* [ ] Evaluation is clearly defined
* [ ] Question is clearly defined
* [ ] Mark is clearly defined
* [ ] Rubric semantics are defined
* [ ] Evaluator participation is defined
* [ ] Submission/script representation is defined

## Intelligence

* [ ] QualitySignal is defined
* [ ] Evidence is defined
* [ ] Provenance is defined
* [ ] Deterministic detection is separated from statistical detection
* [ ] Statistical context requirements are defined
* [ ] AI remains assistive

## Moderation

* [ ] TriageCase is defined
* [ ] TriageCase state is distinguished from Resolution outcome
* [ ] Resolution is human-authoritative
* [ ] Resolution reason requirements are defined

## Audit

* [ ] AuditEvent is defined
* [ ] AuditEvent is distinguished from domain events
* [ ] Important actions are auditable
* [ ] Audit does not become operational source of truth

## Authority

* [ ] Authoritative data is separated from derived data
* [ ] AI cannot directly make consequential academic decisions
* [ ] Statistical observations cannot directly become findings
* [ ] Evidence cannot silently mutate authoritative state
* [ ] Historical evaluation meaning is preserved

## Architecture

* [ ] Aggregate boundaries are defined
* [ ] Domain ownership is defined
* [ ] Persistence implementation is deferred to Data Contract
* [ ] API implementation is deferred to API Contract
* [ ] Event implementation is deferred to Event Contract

---

# 53. AGENT QUICK REFERENCE

When implementing domain functionality, the coding agent should remember:

```text
Evaluation
    =
authoritative evaluation state

Mark
    =
authoritative awarded score

QualitySignal
    =
derived observation

Evidence
    =
supporting information

TriageCase
    =
investigation workflow

Resolution
    =
authorized human decision/action

AuditEvent
    =
durable historical record
```

And:

```text
Detector
    ↓
Signal
    ↓
Human Investigation
    ↓
Resolution
    ↓
Audit
```

Never:

```text
Detector
    ↓
Decision
```

Never:

```text
AI
    ↓
Authoritative Academic State
```

---

# 54. FINAL DOMAIN PRINCIPLES

The following principles are mandatory:

1. **Detection is not decision.**
2. **A signal is not proof.**
3. **A case is not a finding.**
4. **A resolution is an explicit authorized human action/decision.**
5. **AI is assistive, not authoritative.**
6. **Statistical observations require interpretable context.**
7. **Evidence supports investigation but does not become truth automatically.**
8. **Audit history is distinct from current operational state.**
9. **Historical evaluations must remain interpretable according to their applicable rubric context.**
10. **Each major domain concept has one authoritative owner.**
11. **Derived analytics must not become authoritative domain state.**
12. **Demo data must remain distinguishable from real operational data.**
13. **Domain boundaries must not be collapsed for implementation convenience.**
14. **Material domain changes require explicit contract/decision updates.**
15. **The simplest domain model that satisfies the approved product requirements should be preferred.**

---

# 55. DOMAIN MENTAL MODEL

The entire OSM domain can be understood as:

```text
                   AUTHORITATIVE
                        │
                        ▼
                  ┌───────────┐
                  │ Evaluation│
                  │   + Marks │
                  └─────┬─────┘
                        │
                        ▼
                 ┌──────────────┐
                 │  Detection   │
                 │ Rules / Stats│
                 └──────┬───────┘
                        │
                        ▼
                 ┌──────────────┐
                 │QualitySignal │
                 │   DERIVED    │
                 └──────┬───────┘
                        │
                   may trigger
                        │
                        ▼
                 ┌──────────────┐
                 │ TriageCase   │
                 │  WORKFLOW    │
                 └──────┬───────┘
                        │
                  human review
                        │
                        ▼
                 ┌──────────────┐
                 │ Resolution   │
                 │    HUMAN     │
                 └──────┬───────┘
                        │
                        ▼
                 ┌──────────────┐
                 │ AuditEvent   │
                 │   HISTORY    │
                 └──────────────┘


        ┌─────────────────────────────┐
        │        AI ASSISTANCE        │
        │                             │
        │ summarize                   │
        │ compare                     │
        │ explain                     │
        │ recommend                   │
        │                             │
        │ NEVER FINAL AUTHORITY       │
        └──────────────┬──────────────┘
                       │
                       ▼
                 Human Review
```

**This model is the central domain invariant of OSM.**
