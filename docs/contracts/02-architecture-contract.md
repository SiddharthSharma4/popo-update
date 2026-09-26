# ARCHITECTURE CONTRACT

**Project:** OSM — AI-Powered On-Screen Marking & Digital Evaluation System
**Document:** `docs/contracts/02-architecture-contract.md`
**Purpose:** Authoritative system architecture and structural boundaries
**Status:** Approved Architecture Contract — MVP
**Audience:** Developers, AI coding agents, reviewers, QA, architects
**Depends On:** `docs/contracts/00-project-context.md`, `docs/contracts/01-product-contract.md`

---

# 1. PURPOSE

This document defines the **structural architecture of OSM**.

It establishes:

* system boundaries
* architectural layers
* module boundaries
* module ownership
* dependency direction
* domain/application boundaries
* quality-intelligence boundaries
* AI boundaries
* human-decision boundaries
* persistence boundaries
* integration boundaries
* audit boundaries
* scalability direction
* architectural invariants
* architecture-change rules

This document defines **how the system is organized**.

It does not replace:

* `01-product-contract.md` — what the product must do
* `03-build-plan.md` — what is built and in what order
* `04-domain-contract.md` — domain entities and state rules
* `05-api-contract.md` — API interfaces
* `06-data-contract.md` — persistence/data rules
* `07-event-contract.md` — event definitions
* `08-ai-contract.md` — AI behavior and AI-specific rules
* `09-testing-contract.md` — verification requirements
* `10-demo-contract.md` — hackathon demonstration requirements
* `11-security-contract.md` — security/privacy requirements
* `12-project-state.md` — current implementation state
* `13-traceability.md` — requirement-to-implementation traceability

---

# 2. ARCHITECTURAL AUTHORITY

This document is the authoritative source for **system structure**.

When implementation questions concern:

* module boundaries
* dependency direction
* ownership
* system layers
* integration boundaries
* AI architectural boundaries
* persistence boundaries
* architectural invariants

this document takes precedence over implementation convenience.

However, this document does **not** redefine product requirements.

The product hierarchy is:

```text
01-product-contract.md
        ↓
02-architecture-contract.md
        ↓
03-build-plan.md
        ↓
technical contracts
        ↓
implementation
```

If a product requirement cannot be satisfied by the current architecture, the architecture must be changed deliberately rather than silently violating the Product Contract.

---

# 3. ARCHITECTURAL OBJECTIVE

OSM is architected as:

> **A modular digital evaluation platform with an intelligence and quality-control layer that assists evaluators, moderators, and institutional controllers while preserving human authority over consequential academic decisions.**

The architecture must support the following conceptual lifecycle:

```text
Evaluation Activity
        ↓
Validation
        ↓
Quality Analysis
        ↓
Quality Signals
        ↓
Prioritization
        ↓
Human Review
        ↓
Resolution
        ↓
Audit
        ↓
Learning
        ↓
Improved Future Evaluation
```

The architecture must preserve the distinction between:

```text
OBSERVATION
    ↓
SIGNAL
    ↓
WORKFLOW
    ↓
HUMAN DECISION
    ↓
AUDIT
```

These concepts must not be collapsed into one generic abstraction.

---

# 4. CORE ARCHITECTURAL PRINCIPLES

## ARCH-001 — Product Before Technology

Technology exists to satisfy the Product Contract.

Technology choices must not redefine the product.

---

## ARCH-002 — Modular Monolith for MVP

The MVP uses a **modular monolith** unless a documented architectural decision establishes a real need for distribution.

A modular monolith means:

```text
One deployable application
        +
Clearly separated logical modules
        +
Explicit dependency boundaries
        +
Shared infrastructure where appropriate
```

A module is **not automatically**:

* a microservice
* a separate repository
* a separate deployment
* a separate database
* a separate process

---

## ARCH-003 — Clear Module Ownership

Every authoritative domain capability must have an owning module.

Other modules may consume the capability through approved interfaces, but must not silently mutate another module's authoritative state.

---

## ARCH-004 — Explicit Dependency Direction

Preferred logical dependency direction:

```text
Presentation
     ↓
Application
     ↓
Domain
     ↓
Infrastructure
```

Infrastructure implementations may implement interfaces required by application/domain layers.

Core domain logic must not become dependent on presentation or vendor-specific infrastructure.

---

## ARCH-005 — Human Authority

AI and statistical systems are assistive.

They must not automatically become the final authority for consequential academic decisions.

---

## ARCH-006 — Deterministic Before Statistical Before AI

When a problem can be reliably solved deterministically, use deterministic logic.

When a pattern requires statistical analysis, use statistical detection.

Use AI where semantic/contextual assistance provides meaningful value.

Conceptually:

```text
Deterministic Rules
        ↓
Statistical Detection
        ↓
AI Assistance
        ↓
Human Interpretation / Decision
```

This is an architectural preference, not a requirement to execute every stage for every workflow.

---

## ARCH-007 — Explainable Intelligence

Quality intelligence must retain sufficient evidence and provenance to explain:

* what was detected
* why it was detected
* which detector produced it
* which configuration/version was used where relevant
* what evidence supported the signal

---

## ARCH-008 — Immutable Audit History

Important actions must generate durable audit records.

Audit history must not depend on UI state.

---

## ARCH-009 — Existing Infrastructure First

Before creating a new subsystem, determine whether the required capability already exists.

Existing infrastructure should be reused or extended where appropriate.

---

## ARCH-010 — No Hidden Coupling

A module must not depend on undocumented side effects of another module.

---

## ARCH-011 — Demo Reliability

The critical MVP demonstration path must not depend on unpredictable external AI behavior.

External providers may enhance the demonstration, but deterministic fallback behavior must exist where required.

---

## ARCH-012 — Replaceable External Dependencies

External systems and AI providers must be isolated behind interfaces/adapters where replacement is reasonably expected.

---

# 5. SYSTEM CONTEXT

At the highest level:

```text
                    OSM PLATFORM
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
   Evaluation       Intelligence      Governance
     Workflow           Layer            Layer
        │                │                │
        │                ▼                │
        │         Quality Signals         │
        │                │                │
        └────────────────┼────────────────┘
                         ▼
                  Human Workflows
                         │
                         ▼
                    Audit / Trust
                         │
                         ▼
                   Learning Loop
```

External/simulated systems:

```text
Existing OSM / External System
             ↓
      Integration Adapter
             ↓
       OSM Application
```

The MVP may use a synthetic upstream environment.

---

# 6. ARCHITECTURAL LAYERS

The logical architecture consists of:

```text
┌───────────────────────────────────────────┐
│ PRESENTATION                              │
│ Dashboards / Workspaces / Moderation UI  │
├───────────────────────────────────────────┤
│ APPLICATION                               │
│ Use Cases / Commands / Queries / Workflow│
├───────────────────────────────────────────┤
│ DOMAIN                                    │
│ Evaluation / Signals / Cases / Resolution│
├───────────────────────────────────────────┤
│ INTELLIGENCE                              │
│ Rules / Statistics / AI Assistance        │
├───────────────────────────────────────────┤
│ INFRASTRUCTURE                            │
│ Database / Providers / External Adapters  │
├───────────────────────────────────────────┤
│ AUDIT / OBSERVABILITY                     │
│ Audit / Events / Logs / Monitoring        │
└───────────────────────────────────────────┘
```

These are logical layers.

They do not require separate deployments.

---

# 7. PRESENTATION LAYER

## Responsibility

The presentation layer exposes product workflows to users.

Primary experiences include:

* Evaluation Workspace
* QualityPulse
* EscalationHub
* CalibrationCoach
* TrustLens
* RevaluationInsight
* Administration

The presentation layer may:

* display domain state
* collect user input
* invoke application use cases
* display recommendations
* display evidence
* display audit information

The presentation layer must not:

* contain authoritative business rules
* directly manipulate persistence
* directly call arbitrary AI providers
* bypass authorization
* make academic decisions

---

# 8. APPLICATION LAYER

The Application Layer coordinates product use cases.

Representative use cases include:

```text
CreateEvaluationCycle
SubmitEvaluation
RunCompletenessCheck
GenerateQualitySignals
CreateTriageCase
ResolveTriageCase
RequestCalibration
GenerateQualitySummary
AnalyzeRevaluation
CreateLearningRecommendation
```

Application services coordinate:

```text
Domain
+
Repositories
+
External adapters
+
AI interfaces
+
Events
```

The application layer must not become a dumping ground for domain rules that belong in the Domain Layer.

---

# 9. DOMAIN LAYER

The Domain Layer represents authoritative product concepts.

Representative concepts include:

```text
EvaluationCycle
Evaluation
Script
Question
Mark
Rubric
Exemplar
Evaluator
QualitySignal
TriageCase
Resolution
CalibrationInteraction
Revaluation
LearningInsight
AuditEvent
```

Exact entity definitions, relationships, and state transitions belong in:

```text
docs/04-domain-contract.md
```

---

# 10. MODULE DEFINITION

For this project:

> **A module is a logical bounded capability within the same deployable application.**

A module may contain:

```text
Domain logic
Application services
Interfaces
Infrastructure adapters
Queries
Commands
Tests
```

A module is not automatically a:

```text
Microservice
Repository
Deployment
Database
Process
```

The initial implementation should favor logical boundaries inside one application.

---

# 11. CORE MODULE MAP

```text
                           OSM
                            │
       ┌────────────────────┼────────────────────┐
       │                    │                    │
       ▼                    ▼                    ▼
  Evaluation          Intelligence          Governance
       │                    │                    │
       ▼                    ▼                    ▼
  Validation          Detectors              Moderation
                            │                    │
                            ▼                    │
                      QualitySignal             │
                            │                    │
                            └───────┬────────────┘
                                    ▼
                                Resolution
                                    │
                                    ▼
                                Audit
                                    │
                                    ▼
                              Learning /
                              Revaluation
```

---

# 12. MODULE OWNERSHIP MATRIX

| Capability            | Owning Module  | Primary Responsibility                |
| --------------------- | -------------- | ------------------------------------- |
| Evaluation            | Evaluation     | Evaluation lifecycle and state        |
| Completeness          | Validation     | Deterministic validation              |
| Statistical Detection | Intelligence   | Pattern/anomaly detection             |
| AI Assistance         | AI             | Semantic/contextual assistance        |
| QualitySignal         | Intelligence   | Evidence-bearing quality observations |
| TriageCase            | Moderation     | Investigation workflow                |
| Resolution            | Moderation     | Human resolution                      |
| AuditEvent            | Audit          | Durable historical record             |
| QualityPulse          | Analytics      | Quality/operational views             |
| CalibrationCoach      | Calibration    | Evaluator alignment                   |
| TrustLens             | Trust          | Transparency and evidence views       |
| RevaluationInsight    | Revaluation    | Revaluation analysis and learning     |
| Integration           | Integration    | External system adapters              |
| Configuration         | Administration | Controlled configuration              |
| Identity/Access       | Identity       | Authentication and authorization      |

### Ownership Rule

The owning module is the authoritative owner of the corresponding capability.

Other modules must not silently become secondary owners.

---

# 13. EVALUATION MODULE

## Responsibility

Own the evaluation workflow and authoritative evaluation state.

Responsibilities include:

* evaluation cycles
* scripts
* questions
* evaluator context
* marks
* submission state
* evaluation status

It must not own:

* statistical detection algorithms
* AI provider logic
* moderation workflow
* audit history

---

# 14. VALIDATION / COMPLETECHECK MODULE

## Responsibility

Perform deterministic evaluation validation.

Conceptual flow:

```text
Evaluation
    ↓
Validation Rules
    ↓
Validation Results
    ↓
Issue
    ↓
Evaluator Action
```

Potential validators:

```text
MissingMarkValidator
RangeValidator
TotalMismatchValidator
RequiredFieldValidator
SubmissionCompletenessValidator
```

Validation rules must be:

* deterministic
* testable
* explainable
* independently executable

---

# 15. INTELLIGENCE MODULE

The Intelligence Module contains quality-detection capabilities.

It includes three distinct mechanisms:

```text
Deterministic Rules
        │
        ▼
Statistical Detection
        │
        ▼
AI Assistance where appropriate
        │
        ▼
QualitySignal
```

These mechanisms must remain distinguishable in architecture and provenance.

---

# 16. RULE ENGINE

The Rule Engine handles deterministic conditions.

Examples:

```text
missing mark
invalid mark range
total mismatch
required field missing
invalid evaluation state
```

Rules should not require AI.

Rules should be independently testable.

---

# 17. STATISTICAL DETECTION ENGINE

The Statistical Detection Engine identifies unusual evaluation patterns.

Representative detectors:

```text
EvaluatorMeanDeviationDetector
DistributionShiftDetector
EvaluatorDriftDetector
QuestionHotspotDetector
RepeatedCorrectionDetector
```

Statistical detection produces evidence for a:

```text
QualitySignal
```

It does not produce a final academic or misconduct decision.

---

# 18. DETECTOR PROVENANCE

A persisted quality signal generated by an analytical detector should retain, where applicable:

```text
detector
detectorVersion
configurationVersion
dataWindow
generatedAt
evidence
baseline
```

Example:

```text
Detector:
UnusualScoringPattern

Detector Version:
1.0

Configuration:
config-v3

Data Window:
Evaluation Cycle X

Evidence:
Evaluator mean
Peer mean
Deviation
Sample size
```

This allows signals to be interpreted and, where practical, reproduced.

---

# 19. QUALITY SIGNAL

A `QualitySignal` represents:

> An evidence-bearing observation produced by an approved detection mechanism.

A QualitySignal is:

```text
Observation + Evidence + Provenance
```

It is **not**:

```text
A final judgment
A misconduct finding
A moderation resolution
An audit record
```

---

# 20. QUALITY SIGNAL FLOW

The canonical flow is:

```text
Evaluation Data
      ↓
Detector
      ↓
Detector Result
      ↓
QualitySignal
      ↓
Evidence / Provenance
      ↓
Prioritization
      ↓
TriageCase
      ↓
Human Review
      ↓
Resolution
      ↓
AuditEvent
```

This flow is an architectural invariant.

---

# 21. MODERATION MODULE

The Moderation Module owns:

```text
TriageCase
Resolution
```

A TriageCase represents:

> A human investigation workflow around one or more quality signals.

It may:

* group signals
* assign priority
* assign reviewers
* track status
* collect notes
* track escalation
* record resolution

The moderation module must not modify unrelated authoritative evaluation state without an explicit approved workflow.

---

# 22. TRIAGE CASE

The canonical relationship is:

```text
QualitySignal(s)
       ↓
TriageCase
       ↓
Moderator
       ↓
Evidence Review
       ↓
Resolution
```

A TriageCase is a workflow object.

It is not itself proof that a signal is correct.

---

# 23. RESOLUTION

A Resolution represents a human action/decision.

Examples:

```text
Dismissed
Reviewed / Accepted
Escalated
Calibration Requested
Legitimate Variation
```

Resolution must preserve an appropriate reason and actor where required.

A resolution must be auditable.

---

# 24. PRIORITIZATION

Prioritization may use:

* signal type
* severity
* affected volume
* recency
* configured thresholds
* statistical evidence
* workflow configuration

The architecture must preserve:

```text
Priority ≠ Truth
```

High priority means:

> Review this earlier.

It does not mean:

> The underlying allegation is proven.

---

# 25. AI MODULE

AI is an **assistive subsystem**.

Potential responsibilities include:

* semantic comparison
* answer summarization
* rubric-grounded assistance
* exemplar comparison
* contextual explanation
* natural-language insight generation

The Domain Layer must not directly depend on a specific AI provider.

Preferred structure:

```text
Application
     ↓
AI Assistance Interface
     ↓
AI Provider Adapter
     ↓
Model Provider
```

---

# 26. AI AUTHORITY BOUNDARY

AI must not directly:

* assign authoritative marks
* resolve moderation cases
* declare misconduct
* modify official rubrics
* approve policy changes
* bypass human approval
* write consequential academic state without an approved workflow

AI outputs should enter the system as:

```text
Recommendation
Suggestion
Explanation
Evidence Candidate
Summary
Learning Insight Candidate
```

rather than automatically becoming authoritative state.

---

# 27. AI PROVIDER ABSTRACTION

The application must depend on an abstraction rather than a vendor SDK.

Avoid:

```text
Domain → AI Vendor SDK
```

Prefer:

```text
Application
    ↓
AI Interface
    ↓
Provider Adapter
    ↓
AI Provider
```

This supports:

* provider replacement
* testing with mocks
* deterministic demo behavior
* provider fallback
* provider-specific configuration isolation

Detailed AI behavior belongs in:

```text
docs/08-ai-contract.md
```

---

# 28. AI CONTEXT BOUNDARY

AI should receive only approved context.

Conceptual flow:

```text
Application
     ↓
Context Builder
     ↓
Approved Context
     ↓
AI Interface
     ↓
Provider
```

The context builder must not indiscriminately expose unrelated data.

---

# 29. AI OUTPUT VALIDATION

AI output must pass through validation before becoming application-level output.

```text
Model Output
     ↓
Schema Validation
     ↓
Authority / Policy Validation
     ↓
Evidence Validation
     ↓
Application Output
```

Invalid or malformed AI output must not silently become authoritative state.

---

# 30. AI FAILURE ARCHITECTURE

If AI is unavailable:

```text
AI unavailable
      ↓
Fallback
      ↓
Deterministic / manual workflow
      ↓
Human continues
```

The core quality workflow must remain usable.

For example:

```text
AI explanation unavailable
        ↓
Show rubric + evidence
        ↓
Moderator continues manually
```

---

# 31. QUALITYPULSE MODULE

QualityPulse provides aggregated quality and operational views.

Potential inputs:

```text
Evaluation
QualitySignal
TriageCase
Resolution
Calibration
Revaluation
```

QualityPulse should consume derived/query-oriented information where appropriate.

It must not become the authoritative owner of underlying evaluation state.

---

# 32. ESCALATIONHUB MODULE

EscalationHub represents moderator workflow.

Canonical flow:

```text
QualitySignal
      ↓
TriageCase
      ↓
Prioritization
      ↓
Moderator Queue
      ↓
Evidence Inspection
      ↓
Resolution
      ↓
Audit
```

The queue is a workflow representation.

It is not the authoritative source of evaluation data.

---

# 33. CALIBRATION MODULE

CalibrationCoach supports evaluator alignment with approved:

* rubrics
* exemplars
* evaluation guidance

Conceptual flow:

```text
Rubric
   +
Exemplar
   +
Evaluation Context
   ↓
Calibration Interaction
   ↓
Evaluator Feedback
   ↓
Optional Quality Signal
```

Calibration must not silently modify authoritative rubrics or marks.

---

# 34. TRUST MODULE

TrustLens provides transparency into:

* quality signals
* evidence
* detector provenance
* triage cases
* moderator actions
* resolutions
* audit history
* AI assistance where applicable

TrustLens must read from authoritative sources.

It must not manufacture explanations that contradict recorded evidence.

---

# 35. REVALUATION MODULE

RevaluationInsight analyzes revaluation outcomes.

Conceptual flow:

```text
Original Evaluation
        +
Revaluation
        ↓
Comparison
        ↓
Pattern Analysis
        ↓
LearningInsight
        ↓
Human Review
        ↓
Approved Calibration / Exemplar Change
```

A LearningInsight is a recommendation/input to learning workflows.

It is not automatically a policy change.

---

# 36. LEARNING LOOP

The architecture supports:

```text
Evaluation
    ↓
Quality Signal
    ↓
Moderation
    ↓
Revaluation
    ↓
Learning Insight
    ↓
Human Approval
    ↓
Calibration / Exemplar Improvement
    ↓
Future Evaluation
```

The learning loop must not silently alter consequential academic policy.

---

# 37. AUDIT MODULE

Audit is a cross-cutting architectural capability.

Conceptually:

```text
Evaluation ─────┐
Moderation ─────┤
Calibration ────┤
Revaluation ────┤
AI Workflows ───┤
                ▼
           Audit Service
                │
                ▼
           Audit Store
```

Important actions must be recorded independently of UI behavior.

---

# 38. DOMAIN EVENTS VS AUDIT EVENTS

These concepts must remain distinct.

### Domain/Application Event

Represents:

> Something happened that another component may react to.

### Audit Event

Represents:

> A durable historical record of an important action.

They may be related, but they are not interchangeable.

---

# 39. EVENT-DRIVEN ARCHITECTURE

Events should be introduced when they provide meaningful decoupling.

Conceptual examples:

```text
EvaluationSubmitted
        ↓
CompletenessCheckRequested
        ↓
QualityAnalysisTriggered
        ↓
QualitySignalGenerated
        ↓
TriageCaseCreated
        ↓
ResolutionRecorded
```

The MVP should not introduce queues or distributed event infrastructure merely for architectural appearance.

Exact event definitions belong in:

```text
docs/contracts/07-event-contract.md
```

---

# 40. SYNCHRONOUS VS ASYNCHRONOUS PROCESSING

Use synchronous execution when:

* the operation is lightweight
* immediate response is useful
* consistency is important
* processing time is bounded

Use asynchronous execution when:

* processing is expensive
* AI analysis may take significant time
* large analytical operations are involved
* downstream work can be decoupled meaningfully

The MVP should prefer the simpler implementation unless asynchronous processing provides clear value.

---

# 41. DATA OWNERSHIP

Each major domain concept must have one authoritative owner.

```text
Evaluation
    → Evaluation Module

QualitySignal
    → Intelligence Module

TriageCase
    → Moderation Module

Resolution
    → Moderation Module

AuditEvent
    → Audit Module

LearningInsight
    → Revaluation / Learning Module
```

Analytics/read models are derived consumers.

---

# 42. AUTHORITATIVE VS DERIVED DATA

The architecture must distinguish:

## Authoritative data

Examples:

```text
Evaluation state
Marks
Rubric
Exemplar
Moderator Resolution
```

## Derived data

Examples:

```text
Evaluator averages
Deviation scores
Trend calculations
Dashboard aggregates
Risk indicators
```

## Audit data

Examples:

```text
Actor
Action
Timestamp
Relevant previous state
Resulting state
Reason
```

## Demo data

Examples:

```text
Synthetic evaluators
Synthetic scripts
Seeded anomalies
Simulated revaluation outcomes
```

These categories must not be silently mixed.

---

# 43. PERSISTENCE BOUNDARY

Business logic must not depend directly on database implementation details.

Preferred:

```text
Application / Domain
        ↓
Repository Interface
        ↓
Persistence Adapter
        ↓
Database
```

The persistence implementation may use an ORM/database driver, but core business rules should not become coupled to it unnecessarily.

Detailed data rules belong in:

```text
docs/06-data-contract.md
```

---

# 44. API BOUNDARY

External clients interact through application APIs.

Preferred:

```text
Client
  ↓
API
  ↓
Application Use Case
  ↓
Domain
```

Avoid:

```text
Client → Database
```

or:

```text
Client → AI Provider
```

API details belong in:

```text
docs/05-api-contract.md
```

---

# 45. IDENTITY AND AUTHORIZATION BOUNDARY

Protected requests follow:

```text
Request
   ↓
Authentication
   ↓
Authorization
   ↓
Application Use Case
   ↓
Domain
```

Frontend restrictions are not sufficient authorization.

Identity/access ownership belongs to the Identity module.

Detailed security requirements belong in:

```text
docs/11-security-contract.md
```

---

# 46. ROLE-AWARE ARCHITECTURE

Representative roles:

```text
Evaluator
Moderator
Controller
Administrator
```

Conceptual capability mapping:

```text
Evaluator
 ├── Evaluation Workspace
 └── CalibrationCoach

Moderator
 ├── QualityPulse
 ├── EscalationHub
 ├── TrustLens
 └── Calibration

Controller
 ├── QualityPulse
 ├── TrustLens
 └── RevaluationInsight

Administrator
 ├── Configuration
 ├── User / Role Management
 └── Evaluation Cycle Management
```

Exact permissions belong in the Security Contract.

---

# 47. FRONTEND ARCHITECTURE

Frontend organization should reflect product capabilities.

Conceptual structure:

```text
app/
├── evaluation/
├── quality/
│   ├── quality-pulse/
│   └── escalation-hub/
├── calibration/
├── trust/
├── revaluation/
└── administration/
```

Actual framework structure may differ.

The architectural requirement is meaningful capability boundaries, not a specific folder structure.

---

# 48. BACKEND ARCHITECTURE

Conceptual structure:

```text
backend/
├── evaluation/
├── validation/
├── intelligence/
├── moderation/
├── calibration/
├── revaluation/
├── audit/
├── identity/
├── integration/
└── shared/
```

A module may internally contain:

```text
domain/
application/
interfaces/
infrastructure/
```

only where those subdivisions provide useful clarity.

Do not create empty architectural layers merely to satisfy a template.

---

# 49. SHARED CODE RULE

Shared code must contain genuinely shared concepts.

Good candidates:

```text
Identifiers
Error primitives
Validation primitives
Time utilities
Observability primitives
Authentication primitives
```

Avoid turning:

```text
shared/
utils/
helpers/
common/
```

into an unrestricted dumping ground.

---

# 50. EXTERNAL OSM INTEGRATION

Future upstream integration follows:

```text
Existing OSM
     ↓
Integration Interface
     ↓
OSM Adapter
     ↓
Application Boundary
     ↓
OSM Domain
```

The core domain must not depend on a particular upstream OSM implementation.

---

# 51. SYNTHETIC OSM ADAPTER

For the MVP, a synthetic adapter may provide:

```text
Evaluation cycles
Scripts
Evaluators
Marks
Revaluation results
Evaluation events
```

This adapter must behave through the same conceptual integration boundary that a future real integration would use.

---

# 52. EXTERNAL INTEGRATION PRINCIPLE

External systems must be isolated behind adapters where appropriate.

Avoid:

```text
Domain → External OSM API
```

Prefer:

```text
Domain/Application
       ↓
Integration Interface
       ↓
External Adapter
       ↓
External System
```

---

# 53. CONFIGURATION BOUNDARY

Configuration may include:

* quality thresholds
* signal priorities
* evaluation-cycle settings
* calibration settings
* detector configuration
* exemplar selection

Consequential configuration should be:

```text
Authorized
Auditable
Versionable where required
```

Thresholds should not be scattered through unrelated application code.

---

# 54. THRESHOLD ARCHITECTURE

Prefer:

```text
Detector
   ↓
Configuration Provider
   ↓
Threshold Configuration
```

Where reproducibility matters, the resulting signal should identify the configuration version used.

---

# 55. DEMO ARCHITECTURE

The MVP demonstration should follow a deterministic scenario.

Conceptual flow:

```text
Seed Data
   ↓
Evaluation Events
   ↓
Detectors
   ↓
Expected Quality Signals
   ↓
Moderator Workflow
   ↓
Resolution
   ↓
Audit
   ↓
Learning Insight
```

Critical demo behavior must not depend on an unpredictable external model response.

---

# 56. DEMO / REAL DATA SEPARATION

The system must clearly distinguish:

```text
Real / Institutional Data
```

from:

```text
Synthetic / Demo Data
```

Mocked AI output must not silently appear to be real provider output.

Where applicable, the UI should indicate:

```text
Live AI
```

versus:

```text
Demo / Simulated AI
```

---

# 57. OBSERVABILITY

The architecture should support visibility into:

* request failures
* detector execution
* AI failures
* quality-signal generation
* moderation transitions
* audit failures
* integration failures
* major workflow failures

For MVP scale, structured logging and basic error reporting may be sufficient.

---

# 58. ERROR BOUNDARIES

Representative error categories:

```text
Validation Error
Authorization Error
Not Found
Conflict
External Provider Failure
AI Failure
Persistence Failure
Internal Error
```

User-facing errors should be understandable.

Internal implementation details must not be unnecessarily exposed.

---

# 59. IDEMPOTENCY

Operations that may be retried must be considered for idempotency.

Examples:

```text
Evaluation submission
Signal generation
Audit event creation
Revaluation analysis
External event ingestion
```

Exact idempotency rules belong in the relevant technical contracts.

---

# 60. CONCURRENCY

The architecture must account for consequential concurrent operations.

Examples:

```text
Two moderators resolving the same case
Evaluator submitting while validation runs
Configuration changing while detector executes
Revaluation being processed twice
```

Consequential state must not be silently overwritten.

Exact consistency rules belong in:

```text
docs/04-domain-contract.md
docs/06-data-contract.md
```

---

# 61. READ MODELS

Dashboards may use specialized read models.

Example:

```text
Operational Domain State
        ↓
Projection / Aggregation
        ↓
QualityPulse Read Model
        ↓
Dashboard
```

Read models may optimize for querying.

They must not become authoritative replacements for domain state.

---

# 62. TRANSACTION BOUNDARIES

Transactions should correspond to coherent business operations.

Examples:

```text
Submit Evaluation
Resolve Triage Case
Record Calibration Interaction
Approve Learning Insight
```

Avoid unnecessarily large cross-platform transactions.

---

# 63. EVENTUAL CONSISTENCY

Derived views may update asynchronously.

Example:

```text
Evaluation Submitted
        ↓
Event
        ↓
Analytics Projection
        ↓
QualityPulse Updated
```

If the update is asynchronous, the UI should represent meaningful processing state where necessary.

---

# 64. SCALABILITY DIRECTION

The architecture should provide a credible evolution path:

```text
MVP Modular Monolith
        ↓
Stronger Module Boundaries
        ↓
Selective Async Processing
        ↓
Selective Service Extraction
        ↓
Institution-Scale Deployment
```

The MVP is not required to implement the final production architecture.

Service extraction should occur only when justified by:

* scaling requirements
* ownership boundaries
* deployment independence
* reliability requirements
* workload characteristics

---

# 65. PERFORMANCE PRINCIPLES

The MVP is designed for demo-scale operation.

Prefer:

* efficient queries
* pagination
* bounded AI requests
* appropriate indexing
* derived dashboard views where useful
* asynchronous processing when genuinely needed

Do not prematurely introduce:

```text
Kubernetes
Service Mesh
Kafka
Multi-region infrastructure
Distributed caching
Microservice fleet
```

unless a real requirement justifies them.

---

# 66. TESTABILITY ARCHITECTURE

Important layers should be independently testable.

```text
Domain Logic
    ↓
Unit Tests

Application Use Case
    ↓
Integration Tests

API
    ↓
API Tests

Complete Workflow
    ↓
End-to-End Tests
```

AI providers must be mockable.

Statistical detectors must support deterministic fixtures.

Demo scenarios must be reproducible.

---

# 67. ARCHITECTURAL ANTI-PATTERNS

The following are prohibited unless explicitly justified.

## AP-001 — God Service

One service owns most product behavior.

## AP-002 — God Controller

Controllers contain significant business logic.

## AP-003 — God Model

One model represents evaluation, intelligence, moderation, AI, and audit simultaneously.

## AP-004 — Generic Flag Object

Do not collapse:

```text
QualitySignal
TriageCase
Resolution
AuditEvent
```

into one generic object.

## AP-005 — AI Everywhere

Do not use AI for deterministic problems.

## AP-006 — Frontend Authority

Do not allow frontend state to become authoritative academic state.

## AP-007 — Database-as-API

Clients must not directly depend on database structure.

## AP-008 — Hidden AI Mutation

AI output must not silently mutate authoritative state.

## AP-009 — Dashboard as Source of Truth

Analytics are derived views.

## AP-010 — Microservice Theater

Do not introduce distributed infrastructure merely for architectural appearance.

## AP-011 — Duplicate Infrastructure

Do not create parallel implementations of existing capabilities without justification.

---

# 68. ARCHITECTURAL INVARIANTS

The following are mandatory.

### INV-ARCH-001

AI cannot directly become the final academic authority.

### INV-ARCH-002

A statistical signal cannot automatically become a misconduct finding.

### INV-ARCH-003

`QualitySignal` and `TriageCase` remain distinct concepts.

### INV-ARCH-004

`Resolution` represents a human action/decision where the workflow requires human authority.

### INV-ARCH-005

Important consequential actions remain auditable.

### INV-ARCH-006

Derived analytics cannot silently become authoritative source data.

### INV-ARCH-007

Detector-generated signals retain sufficient provenance to explain their origin.

### INV-ARCH-008

The core evaluation-quality workflow remains usable if AI is unavailable.

### INV-ARCH-009

External providers are isolated through replaceable interfaces/adapters where appropriate.

### INV-ARCH-010

The MVP does not require real student PII.

### INV-ARCH-011

Demo data remains distinguishable from real institutional data.

### INV-ARCH-012

Protected operations cannot bypass authorization.

### INV-ARCH-013

Frontend controls are never treated as sufficient authorization.

### INV-ARCH-014

New infrastructure does not duplicate existing infrastructure without justification.

### INV-ARCH-015

The MVP remains a modular monolith unless an approved architecture decision states otherwise.

### INV-ARCH-016

A module does not silently become the authoritative owner of another module's state.

### INV-ARCH-017

AI provider-specific implementation does not leak into the core domain.

### INV-ARCH-018

Architecture changes that materially affect system boundaries require an explicit architectural decision.

---

# 69. ARCHITECTURAL CHANGE CONTROL

Material architectural changes follow:

```text
Proposed Change
      ↓
Affected Modules
      ↓
Dependency Impact
      ↓
Data Impact
      ↓
Security Impact
      ↓
Testing Impact
      ↓
Decision
      ↓
ADR
      ↓
Architecture Contract Update
      ↓
Build Plan Update if required
```

Examples of material changes:

* changing module ownership
* introducing a new major subsystem
* introducing a microservice
* changing persistence architecture
* changing AI provider architecture
* changing integration boundaries
* changing authority boundaries
* changing event architecture

Minor implementation choices do not require an ADR.

---

# 70. ARCHITECTURAL DECISION RECORDS

Material decisions are stored in:

```text
docs/decisions/
```

Naming:

```text
ADR-001-<decision>.md
ADR-002-<decision>.md
...
```

Examples:

```text
ADR-001-modular-monolith.md
ADR-002-ai-provider-abstraction.md
ADR-003-statistical-detector-design.md
ADR-004-audit-strategy.md
```

An ADR should record:

```text
Context
Problem
Decision
Alternatives
Consequences
Status
```

---

# 71. PRODUCT-TO-ARCHITECTURE TRACEABILITY

Every major architectural capability should trace to a product requirement.

Conceptual example:

```text
Product Requirement
        ↓
Quality Detection
        ↓
Intelligence Module
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

Detailed traceability belongs in:

```text
docs/13-traceability.md
```

---

# 72. ARCHITECTURE-TO-BUILD-PLAN RELATIONSHIP

The Architecture Contract defines:

```text
What structures must exist.
```

The Build Plan defines:

```text
When and in what sequence they are implemented.
```

Therefore:

```text
Architecture Contract
        ↓
Implementation constraints
        ↓
Build Plan
        ↓
Tasks
```

The Build Plan must not silently introduce an architectural structure that contradicts this document.

If the Build Plan requires a structural change, the architecture must be updated first.

---

# 73. TECHNICAL CONTRACT MAP

The architecture is supported by the following technical contracts:

```text
04-domain-contract.md
        ↓
Entities + State + Domain Rules

05-api-contract.md
        ↓
External Interfaces

06-data-contract.md
        ↓
Persistence + Data Rules

07-event-contract.md
        ↓
Events + Event Payloads

08-ai-contract.md
        ↓
AI Behavior + AI Boundaries

09-testing-contract.md
        ↓
Verification Rules

10-demo-contract.md
        ↓
Hackathon Demonstration

11-security-contract.md
        ↓
Security + Privacy + Authorization

12-project-state.md
        ↓
Current Implementation Reality

13-traceability.md
        ↓
Requirement → Architecture → Task → Code → Test
```

These contracts should remain specialized rather than duplicating the entire architecture.

---

# 74. ARCHITECTURAL CONTEXT SELECTION

Implementation agents should use this document when a task affects:

* module boundaries
* dependencies
* data ownership
* system integration
* AI boundaries
* persistence boundaries
* event boundaries
* architecture invariants

Agents should consult only the additional technical contracts relevant to the task.

The architecture contract is not intended to be copied into every task context in full.

---

# 75. ARCHITECTURE ACCEPTANCE GATE

Before implementation begins, the architecture must satisfy:

## System Structure

* [x] Modular monolith defined
* [x] Module definition established
* [x] Major modules identified
* [x] Module ownership established
* [x] Dependency direction established

## Quality Intelligence

* [x] Deterministic rules separated from statistics
* [x] Statistics separated from AI
* [x] AI separated from human authority
* [x] Detector provenance defined

## Moderation

* [x] QualitySignal defined
* [x] TriageCase defined
* [x] Resolution defined
* [x] AuditEvent defined

## Data

* [x] Authoritative data distinguished from derived data
* [x] Demo data distinguished from real data
* [x] Persistence boundary defined
* [x] Read-model principle defined

## AI

* [x] Provider abstraction defined
* [x] AI authority boundary defined
* [x] AI output validation defined
* [x] AI failure fallback defined
* [x] Context boundary defined

## Integration

* [x] External OSM integration boundary defined
* [x] Synthetic adapter supported
* [x] External providers isolated

## Scalability

* [x] MVP scaling strategy defined
* [x] No premature microservices required
* [x] Service extraction direction defined

## Architecture Governance

* [x] Architectural invariants defined
* [x] Architecture change control defined
* [x] ADR mechanism defined
* [x] Contract map defined

---

# 76. FINAL ARCHITECTURAL MODEL

The intended MVP architecture is:

```text
                         OSM
                          │
              ┌───────────┴───────────┐
              │                       │
         PRESENTATION                API
              │                       │
              └───────────┬───────────┘
                          ↓
                   APPLICATION
                      LAYER
                          │
          ┌───────────────┼────────────────┐
          │               │                │
          ▼               ▼                ▼
     EVALUATION       MODERATION      REVALUATION
          │               │                │
          ▼               │                ▼
      VALIDATION           │          LEARNING
          │               │                │
          └───────┐       │       ┌────────┘
                  ▼       ▼       ▼
              INTELLIGENCE
                  │
        ┌─────────┼─────────┐
        ▼         ▼         ▼
      RULES   STATISTICS     AI
        │         │         │
        └─────────┼─────────┘
                  ▼
            QUALITY SIGNAL
                  │
                  ▼
             TRIAGE CASE
                  │
                  ▼
           HUMAN RESOLUTION
                  │
                  ▼
              AUDIT EVENT
                  │
          ┌───────┴────────┐
          ▼                ▼
       TRUST            ANALYTICS
          │                │
          └───────┬────────┘
                  ▼
             LEARNING LOOP
                  │
                  ▼
           FUTURE EVALUATION
```

---

# 77. FINAL ARCHITECTURAL COMMANDMENTS

> **OSM is a digital evaluation platform with an intelligence and quality-control layer; it is not merely an AI marking engine.**

> **The MVP is a modular monolith.**

> **A module is a logical bounded capability, not automatically a microservice.**

> **Product requirements define what must be achieved; architecture defines the structural means.**

> **Evaluation state, QualitySignal, TriageCase, Resolution, and AuditEvent are distinct concepts.**

> **Deterministic problems should be solved deterministically.**

> **Statistics identify patterns; they do not establish guilt.**

> **AI assists; humans retain consequential academic authority.**

> **Every important quality signal should have evidence and provenance.**

> **Priority is not truth.**

> **Derived analytics are not authoritative domain state.**

> **AI providers must remain replaceable.**

> **AI failure must not destroy the core workflow.**

> **External OSM systems must be isolated behind integration boundaries.**

> **Demo data and real institutional data must remain distinguishable.**

> **Do not introduce distributed infrastructure merely for architectural appearance.**

> **Do not recreate infrastructure that already exists.**

> **Material architectural changes require explicit architectural decisions.**

> **The architecture must make correct behavior easy and unsafe architectural behavior difficult.**

---

# END OF ARCHITECTURE CONTRACT
