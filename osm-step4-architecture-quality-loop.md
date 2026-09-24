# STEP 4 — Architecture & Quality Loop Master
## QualityLoop — End-to-End OSM Intelligence Ecosystem
### AI + Analytics for On-Screen Marking and Digital Evaluation

**Stage:** Step 4 — Architecture, System Design & Quality-Loop Engineering  
**Status:** Master architecture specification / agent instruction  
**Inputs:** Step 0 Problem Deconstruction + Step 1 Research & Validation + Step 2 Solution Ideation & Product Strategy + Step 3 PRD  
**Output:** Architecture-ready implementation blueprint for the QualityLoop MVP  
**Primary architectural principle:** Preserve the product decisions while choosing the simplest technically credible architecture.

---

# 0. PURPOSE OF THIS DOCUMENT

This document is the authoritative operating framework for Step 4.

Step 0 defined the actual problem.

Step 1 validated the problem and researched the ecosystem.

Step 2 explored and selected the product direction.

Step 3 converted that direction into the QualityLoop PRD.

**Step 4 must now determine HOW the product is structured and implemented.**

The architecture must translate:

```text
Problem
   ↓
Validated evidence
   ↓
Product strategy
   ↓
PRD
   ↓
SYSTEM ARCHITECTURE
   ↓
QUALITY LOOP
   ↓
IMPLEMENTATION PLAN
```

The architecture is not allowed to silently redesign the product.

---

# 1. SOURCE-OF-TRUTH HIERARCHY

When making an architectural decision, use this order:

1. Step 3 PRD
2. Step 2 product strategy
3. Step 1 research
4. Step 0 problem deconstruction
5. Explicitly documented implementation constraints
6. Engineering judgment
7. New assumptions — only when unavoidable and clearly labeled

If two sources conflict:

- identify the conflict;
- prefer the later product-definition decision unless it violates an earlier validated constraint;
- do not silently reconcile the conflict;
- record the architectural decision.

---

# 2. PRODUCT SOURCE OF TRUTH

QualityLoop is:

> **An end-to-end OSM intelligence ecosystem that augments digital evaluation with deterministic validation, statistical quality intelligence, carefully bounded AI assistance, smart moderation, explainable audit trails, calibration and revaluation-driven learning.**

Core lifecycle:

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

The architecture must make this lifecycle visible in the system.

---

# 3. ARCHITECTURE MISSION

The architecture must answer:

1. What are the major system boundaries?
2. What belongs in the frontend?
3. What belongs in the backend?
4. What is the authoritative source of truth?
5. How do evaluation events enter the system?
6. How are deterministic checks executed?
7. How are statistical quality signals generated?
8. How are AI capabilities isolated?
9. How are signals prioritized?
10. How does a moderator investigate a signal?
11. How is resolution recorded?
12. How is the audit trail preserved?
13. How does revaluation feed the learning loop?
14. How are exemplars and calibration material updated?
15. How does the MVP operate without real student PII?
16. How can the architecture later integrate with an existing OSM platform?
17. How can the system fail safely?
18. How is the system tested?
19. How is the system observed?
20. How can the MVP remain simple enough to actually build?

---

# 4. NON-NEGOTIABLE PRODUCT BOUNDARIES

The architecture MUST preserve these decisions.

## 4.1 Human authority

Humans remain responsible for:

- final marks;
- moderation decisions;
- flag resolution;
- escalation;
- official rubric changes;
- institutional action.

The architecture must never create an implicit autonomous academic decision path.

---

## 4.2 AI is advisory

AI may:

- summarize;
- highlight;
- compare;
- suggest;
- explain;
- assist with prioritization rationale;
- surface patterns.

AI may assist humans around prioritization, but it must not become the authoritative source of
priority. Primary priority calculation must remain deterministic/rules- and
statistics-based, with a human-readable rationale.

AI may NOT:

- finalize marks;
- silently modify marks;
- declare an evaluator guilty;
- trigger punishment;
- automatically change official rubrics;
- override an evaluator;
- override a moderator;
- create an unreviewable decision.

---

## 4.3 Statistical intelligence is advisory

Statistics may:

- identify unusual patterns;
- generate quality-risk signals;
- prioritize review.

Statistics may NOT:

- determine intent;
- determine misconduct;
- automatically penalize anyone;
- be presented as ground truth.

---

## 4.4 Deterministic problems must use deterministic mechanisms

Examples:

```text
Missing mark
Total mismatch
Required field missing
Invalid mark range
Invalid evaluation state
```

These should NOT require an LLM.

Golden rule:

> **Use the simplest mechanism that safely solves the problem.**

---

## 4.5 Existing OSM is an integration boundary

QualityLoop should augment an existing OSM system.

For the MVP:

```text
Simulated OSM / Synthetic Event Source
             ↓
        QualityLoop
```

For production:

```text
Existing University OSM
             ↓
     Integration Adapter
             ↓
        QualityLoop
```

Do not build a full scanning platform, physical-script logistics system, university ERP replacement, or mature OSM replacement.

---

# 5. ARCHITECTURAL DESIGN PRINCIPLES

## P1 — Vertical slice over feature sprawl

The architecture must support one coherent end-to-end path before advanced features.

Minimum path:

```text
Evaluation Event
      ↓
Validation
      ↓
Quality Signal
      ↓
Correlation / Deduplication
      ↓
Triage Case
      ↓
Prioritization
      ↓
Moderator Review
      ↓
Resolution
      ↓
Audit
```

---

## P2 — Deterministic core

The critical workflow must continue even when AI is unavailable.

```text
Core System
 ├── Evaluation events
 ├── Validation
 ├── Analytics
 ├── Quality signals
 ├── Moderation
 ├── Audit
 └── Dashboard

Optional Layer
 └── AI assistance
```

AI must never be a single point of failure for the product.

---

## P3 — Explainability by construction

Every quality signal must carry evidence.

A signal without evidence is architecturally incomplete.

---

## P4 — Immutable historical truth

Past evaluation activity, moderation decisions and audit events must not be silently overwritten.

Corrections should create new state/events where appropriate.

---

## P5 — Traceability

A moderator should be able to move:

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
Resolution
   ↓
Audit History
```

---

## P6 — Synthetic-data first

The MVP must operate using:

- synthetic evaluator activity;
- synthetic scripts/answers;
- synthetic marks;
- synthetic rubrics;
- synthetic exemplars;
- seeded anomalies;
- synthetic revaluation outcomes.

No real student PII should be required.

---

## P7 — Demo determinism

Critical demo scenarios must be reproducible.

Avoid:

- random anomaly generation;
- unpredictable AI dependencies;
- external services on the critical path;
- live data dependencies;
- fragile background processes.

---

## P8 — Modular without premature microservices

Use strong internal module boundaries.

Do NOT create microservices merely because modules exist.

Preferred MVP shape:

```text
One deployable application
        +
Clear domain modules
        +
Optional external AI provider
```

A service should become separate only when there is a concrete reason.

---

## P9 — Production-aware, MVP-simple

The architecture must have a credible path toward:

- larger datasets;
- institutional OSM integration;
- institutional authentication;
- stronger security;
- validated AI;
- larger analytics workloads.

But production scalability must not make the hackathon MVP unnecessarily complex.

---

# 5.1 CRITICAL DOMAIN SEPARATIONS

The following distinctions are architectural contracts:

### QualitySignal vs TriageCase

```text
QualitySignal
= evidence-bearing observation produced by validation/analytics.

TriageCase
= moderator-facing workflow created by correlating/grouping one or more signals.
```

A moderator resolves a `TriageCase`, not a `QualitySignal`.

### EvaluationEvent vs AuditEvent

```text
EvaluationEvent
= something that happened in evaluation activity.

AuditEvent
= a traceable governed action/state change that must remain accountable.
```

They may be correlated but have different semantics.

### Revaluation vs Evaluation Activity

```text
Evaluation Activity
= owns marking activity and evaluation state.

Revaluation
= owns the business record of original vs revised marks and revaluation outcomes.
```

### Priority vs Severity

```text
Severity
= potential impact of a quality signal/case.

Priority
= review order for a triage case.
```

### AI vs authoritative prioritization

AI may explain or summarize an already-calculated priority, but authoritative
priority must come from transparent rules/statistics and remain subject to human
review.

---

# 6. ARCHITECTURE RED TEAM BEFORE DESIGN

Before proposing architecture, challenge the PRD.

Ask:

### Product coherence
- Does every module belong to the same lifecycle?
- Is the quality loop visible?
- Are any modules present only because of the hackathon feature list?

### AI integrity
- Can the system work without AI?
- Is AI being used where rules or statistics are safer?
- Is AI output clearly advisory?

### Trust
- Can humans override every advisory signal?
- Is evidence visible?
- Can a moderator dismiss a false positive?
- Is a reason required?

### Data
- Can the complete MVP run on synthetic data?
- Are relationships between scripts, questions, evaluators and marks realistic?

### Demo
- Can the entire quality loop be shown in 5–7 minutes?
- Are critical scenarios deterministic?

### Architecture
- Are there unnecessary services?
- Are there unnecessary queues?
- Are there unnecessary databases?
- Are there unnecessary external dependencies?

---

# 7. SYSTEM CONTEXT

The high-level architecture should be modeled as:

```text
                  ┌──────────────────────────┐
                  │ Existing / Simulated OSM │
                  └────────────┬─────────────┘
                               │
                         Evaluation Events
                               │
                               ▼
┌──────────────────────────────────────────────────────────┐
│                       QUALITYLOOP                         │
│                                                          │
│  Evaluation Context                                      │
│        ↓                                                 │
│  Validation ──→ AI Assistance                            │
│        ↓              │                                  │
│  Quality Intelligence │                                  │
│        ↓              │                                  │
│  Signal Generation ←──┘                                  │
│        ↓                                                 │
│  Prioritization                                          │
│        ↓                                                 │
│  Moderation                                              │
│        ↓                                                 │
│  Audit                                                   │
│        ↓                                                 │
│  Revaluation                                             │
│        ↓                                                 │
│  Learning / Calibration                                  │
│                                                          │
└──────────────────────────────────────────────────────────┘
             │                     │
             ▼                     ▼
       Evaluator UI          Moderator/COE UI
```

---

# 8. ARCHITECTURAL BOUNDARIES

Define the following logical boundaries.

## 8.1 Presentation boundary

Responsible for:

- evaluator interface;
- moderator interface;
- controller dashboard;
- admin configuration;
- evidence presentation;
- audit visualization.

Must NOT contain authoritative business decisions.

---

## 8.2 Application boundary

Responsible for:

- use cases;
- authorization checks;
- workflow orchestration;
- commands;
- queries;
- state transitions.

---

## 8.3 Domain boundary

Responsible for:

- evaluation cycle;
- evaluation state;
- quality signals;
- moderation;
- calibration;
- revaluation;
- learning loop;
- business rules.

This layer should be independent of UI details.

---

## 8.4 Intelligence boundary

Contains:

- deterministic validation;
- statistical analytics;
- optional AI assistance.

Each mechanism must remain distinguishable.

---

## 8.5 Persistence boundary

Responsible for:

- authoritative data storage;
- event history;
- audit history;
- configuration;
- generated/seeded data.

---

## 8.6 Integration boundary

Responsible for:

- simulated OSM input;
- future OSM adapters;
- optional AI provider;
- future institutional identity systems.

External integrations must not leak directly into core domain logic.

---

# 9. RECOMMENDED MVP ARCHITECTURE STYLE

Unless concrete evidence requires otherwise, prefer a:

> **Modular monolith with clear domain boundaries and adapter interfaces.**

Conceptually:

```text
Frontend
   │
   ▼
API / Application Layer
   │
   ├── Evaluation
   ├── Validation
   ├── Quality Intelligence
   ├── Moderation
   ├── Calibration
   ├── Revaluation
   ├── Audit
   └── Administration
   │
   ▼
Persistence Layer
   │
   ├── Operational data
   ├── Analytics-ready data
   └── Audit/event history
```

Optional:

```text
AI Adapter
   │
   └── External LLM provider
```

Do not split these into independent services unless justified.

---

# 10. DOMAIN MODULES

The architecture should map directly to the PRD modules.

## 10.1 Evaluation Cycle

Owns:

- examination;
- subject;
- questions;
- rubric;
- evaluator groups;
- moderation policy;
- cycle state.

Core states may include:

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

Do not invent additional lifecycle states without a need.

---

## 10.2 Evaluation Activity

Owns:

- script assignment;
- answer view;
- question marking;
- total update;
- submission.

This should be event-friendly because the quality layer depends on activity history.

Revaluation is a separate domain module. Evaluation Activity may emit or receive
events related to revaluation, but it does not own the revaluation business entity.

---

## 10.3 Validation Engine

Owns deterministic validation.

Examples:

```text
Missing mark
Invalid mark
Total mismatch
Incomplete required answer
Invalid state transition
Missing required field
```

Output:

```text
ValidationResult
 ├── passed
 ├── rule
 ├── severity
 ├── affected entity
 └── evidence
```

---

## 10.4 Quality Intelligence

Owns statistical signals.

Potential signals:

- evaluator deviation;
- score-distribution anomaly;
- evaluator drift;
- question-level anomaly;
- repeated correction pattern;
- revaluation hotspot.

This module must not decide guilt or misconduct.

---

## 10.5 Quality Signal Registry

All generated quality signals should use a common representation.

A `QualitySignal` is an observed/derived quality-risk signal. It is NOT itself a
moderation workflow item.

Conceptual structure:

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
 ├── detectedAt / generatedAt
 ├── dataWindow
 ├── affectedEntity
 ├── evidence
 ├── baseline
 ├── confidence / statistical context
 ├── method
 ├── threshold
 ├── sampleSize
 └── status
```

Historical signals must retain enough detector/configuration provenance to remain
interpretable under the rules and thresholds that generated them.

### 10.5.1 Triage Case

A `TriageCase` is the moderator-facing workflow object created after signal
correlation, deduplication and grouping.

Conceptual structure:

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

Multiple signals may belong to one triage case:

```text
QualitySignal ─┐
QualitySignal ─┼→ Correlation / Deduplication → TriageCase
QualitySignal ─┘
```

This prevents several detectors describing the same underlying issue from creating
separate moderator workflows.

---

## 10.6 Prioritization

Responsible for converting correlated quality signals into an actionable
`TriageCase` queue.

Priority must be explainable and must not be treated as an academic verdict.

Avoid:

```text
riskScore = 0.93
```

without context.

Prefer:

```text
Priority: High

Reason:
- affects 42 scripts
- evaluator average is 18% above peer baseline
- sample size = 64
- deviation persisted across 3 sessions
```

---

## 10.7 Moderation

Owns:

- review;
- dismiss;
- resolve;
- escalate;
- request calibration;
- resolution reason.

Every resolution must be attributable to a human role.

---

## 10.8 Audit

Owns immutable or append-only records of important actions.

Examples:

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

---

## 10.9 Calibration

Owns:

- exemplars;
- rubric references;
- calibration sessions;
- evaluator acknowledgement;
- calibration outcomes.

Calibration should support evaluators, not act as punitive surveillance.

---

## 10.10 Revaluation

Owns:

- original mark;
- revised mark;
- mark delta;
- question/topic;
- reason/context where available.

---

## 10.11 Learning Loop

Consumes validated moderation/revaluation outcomes.

Potential outputs:

```text
Candidate exemplar update
Candidate calibration topic
Question hotspot
Rubric clarification candidate
```

The architecture must distinguish:

```text
Recommendation
```

from:

```text
Official change
```

Official changes require authorized human action.

---

## 10.12 AI Assistance

AI must sit behind an explicit adapter/interface.

Conceptually:

```text
AI Gateway
   ↓
Prompt / Context Builder
   ↓
Provider
   ↓
Response Validator
   ↓
Human-visible Advisory Result
```

The domain must never directly depend on a specific LLM provider.

---

# 11. QUALITY LOOP ARCHITECTURE

The quality loop is the heart of QualityLoop.

```text
                 ┌──────────────────┐
                 │ Evaluation Event │
                 └────────┬─────────┘
                          ▼
                 ┌──────────────────┐
                 │ Validation Engine│
                 └────────┬─────────┘
                          │
                          ▼
                ┌────────────────────┐
                │ Quality Intelligence│
                └─────────┬──────────┘
                          │
                          ▼
                 ┌──────────────────┐
                 │ Quality Signal(s)│
                 └────────┬─────────┘
                          ▼
              ┌──────────────────────────┐
              │ Correlation / Dedup      │
              └────────────┬─────────────┘
                           ▼
                 ┌──────────────────┐
                 │ Triage Case      │
                 └────────┬─────────┘
                          ▼
                 ┌──────────────────┐
                 │ Prioritization   │
                 └────────┬─────────┘
                          ▼
                 ┌──────────────────┐
                 │ Moderator Review │
                 └────────┬─────────┘
                          ▼
                 ┌──────────────────┐
                 │ Resolution       │
                 └────────┬─────────┘
                          ▼
                 ┌──────────────────┐
                 │ Audit Record     │
                 └────────┬─────────┘
                          ▼
                 ┌──────────────────┐
                 │ Revaluation      │
                 └────────┬─────────┘
                          ▼
                 ┌──────────────────┐
                 │ Learning Insight │
                 └────────┬─────────┘
                          ▼
                 ┌──────────────────┐
                 │ Human Approval   │
                 └────────┬─────────┘
                          ▼
                 ┌──────────────────┐
                 │ Calibration      │
                 └────────┬─────────┘
                          ▼
                    NEXT CYCLE
```

The architecture should make this loop testable as one system.

---

# 12. EVENT MODEL

The MVP should use a clear event representation even if the implementation initially stores events in a normal database table.

Example:

```text
EvaluationEvent
 ├── id
 ├── cycleId
 ├── scriptId
 ├── evaluatorId
 ├── questionId
 ├── eventType
 ├── timestamp
 ├── payload
 └── source
```

Possible event types:

```text
SCRIPT_ASSIGNED
ANSWER_VIEWED
QUESTION_MARKED
MARK_UPDATED
TOTAL_UPDATED
SCRIPT_SUBMITTED
REVALUATION_COMPLETED
```

The event model should support:

- deterministic replay;
- seeded demo scenarios;
- analytics;
- audit investigation;
- future external OSM integration.

---

# 12.1 EVENT HISTORY IS NOT FULL EVENT SOURCING

The MVP uses events as an activity/history and integration model, not as mandatory
full event sourcing.

Authoritative operational records remain the source of truth for current academic
state. Events provide an append-oriented history, analytics input, integration
boundary and reproducible activity trail.

Therefore:

```text
Authoritative Operational State
          +
Append-oriented Evaluation/Event History
          +
Audit History
```

is preferred over:

```text
Events only
↓
Reconstruct every current state exclusively from events
```

Do not introduce full event sourcing merely because the system contains events.

---

# 13. COMMAND VS EVENT PRINCIPLE

Distinguish between:

### Command

An instruction/request:

```text
SubmitEvaluation
ResolveSignal
RequestCalibration
```

### Event

A fact that happened:

```text
EvaluationSubmitted
SignalResolved
CalibrationRequested
```

The architecture should not confuse user intent with historical facts.

---

# 14. DATA MODEL REQUIREMENTS

The exact database technology may be selected by the implementation agent, but the logical model must support at least:

```text
User
Role
Institution
EvaluationCycle
Subject
Question
Rubric
RubricCriterion
Exemplar
EvaluatorAssignment
Script
Answer
Mark
EvaluationEvent
ValidationResult
QualitySignal
SignalEvidence
TriageCase
Resolution
AuditEvent
CalibrationSession
Revaluation
LearningInsight
```

Relationships must support:

```text
Cycle
 ├── Questions
 ├── Rubric
 ├── Exemplars
 ├── Evaluators
 ├── Scripts
 │    └── Answers
 │         └── Marks
 ├── Evaluation Events
 ├── Quality Signals
 ├── Triage Cases
 │    └── Resolutions
 ├── Revaluation Records
 └── Learning Insights
```

Avoid storing the same authoritative fact in multiple places unless there is a deliberate projection/read-model reason.

---

# 15. SOURCE OF TRUTH RULES

Define authoritative ownership.

Example:

| Data | Authority |
|---|---|
| Official mark | Human evaluation record |
| Evaluation event | Event/activity record |
| Quality signal | Intelligence engine output |
| Triage case | Correlation/deduplication + moderation workflow |
| Triage status | Moderation workflow |
| Resolution | Human moderator action |
| Resolution reason | Human moderator action |
| Audit record | Audit subsystem |
| Rubric | Authorized configuration |
| Exemplar | Authorized calibration configuration |
| Revaluation result | Authorized revaluation record |
| Learning insight | Derived analytical output |

A derived analytics value must not overwrite the underlying academic record.

---

# 16. DATABASE / STORAGE STRATEGY

For MVP, prefer the smallest reliable storage model.

The architecture should generally use:

```text
Primary relational/document database
        +
Indexed event/activity records
        +
Audit records
```

Do not introduce a separate data warehouse, vector database, message broker or distributed event platform unless a concrete MVP requirement proves it necessary.

If a specialized datastore is proposed, the agent must document:

1. Why the primary database is insufficient.
2. What capability it provides.
3. What complexity it adds.
4. Whether the feature can be postponed.

---

# 17. ANALYTICS ARCHITECTURE

Analytics should consume evaluation activity and produce explainable signals.

Pipeline:

```text
Evaluation Events
       ↓
Normalization
       ↓
Feature Calculation
       ↓
Baseline Calculation
       ↓
Signal Detection
       ↓
Evidence Generation
       ↓
Quality Signal Storage
       ↓
Correlation / Deduplication
       ↓
Triage Case Creation
       ↓
Prioritization
```

Analytics should distinguish:

```text
Observed fact
Derived statistic
Interpretation
Human decision
```

Example:

```text
Observed:
Evaluator E evaluated 64 scripts.

Derived:
Average score = 78%.

Baseline:
Peer-group average = 66%.

Signal:
Evaluator is 12 percentage points above baseline.

Interpretation:
Potential unusual scoring pattern.

Human:
Moderator decides whether review is warranted.
```

---

# 18. STATISTICAL SIGNAL DESIGN

Every signal must define:

- input data;
- comparison group;
- minimum sample size;
- calculation;
- threshold;
- evidence;
- known limitations;
- action;
- false-positive behavior.

Do not create black-box anomaly scores for the MVP.

Prefer transparent signals such as:

```text
Deviation from peer mean
Score distribution shift
Temporal change
Question-level deviation
Repeated correction frequency
```

If a statistical method needs a minimum sample size, encode that requirement explicitly.

Example:

```text
if sample_size < minimum_sample:
    signal = NOT_ENOUGH_EVIDENCE
```

Do not manufacture a quality signal from insufficient evidence.

---

# 19. PRIORITIZATION ARCHITECTURE

Prioritization is not the same as anomaly detection.

```text
Detection:
"Something unusual was observed."

Prioritization:
"This item should be reviewed before these other items."
```

Priority may consider:

- severity;
- affected volume;
- persistence;
- evidence strength;
- recency;
- unresolved duration;
- affected question/cycle.

Every priority output must remain explainable.

---

# 20. EVIDENCE OBJECT

Every important signal should expose an evidence object.

Conceptually:

```text
Evidence
 ├── observedMetrics
 ├── baseline
 ├── sampleSize
 ├── period / dataWindow
 ├── affectedEntities
 ├── relatedEvents
 ├── calculation
 ├── method
 ├── threshold
 ├── detectorName
 ├── detectorVersion
 ├── configurationVersion
 └── limitations
```

For deterministic validation:

```text
Evidence
 ├── expected
 ├── actual
 ├── rule
 └── affectedField
```

For AI assistance:

```text
Evidence
 ├── inputContext
 ├── retrievedReferences
 ├── generatedOutput
 ├── model/provider metadata
 └── uncertainty/validation status
```

---

# 21. AI ARCHITECTURE

AI is an optional intelligence adapter, not the application core.

Recommended:

```text
Application
   │
   ▼
AI Assistance Interface
   │
   ├── Context Builder
   ├── Prompt Builder
   ├── Provider Adapter
   ├── Output Validator
   └── Safety / Labeling
```

Potential MVP AI tasks:

- rubric-grounded answer summary;
- criterion/evidence highlighting;
- natural-language explanation;
- exemplar comparison assistance.

AI should receive only the minimum context needed.

---

# 22. AI OUTPUT CONTRACT

AI responses should have a structured internal representation.

Example:

```text
AIAdvice
 ├── id
 ├── type
 ├── inputContext
 ├── output
 ├── evidenceReferences
 ├── provider
 ├── model
 ├── generatedAt
 ├── status
 └── disclaimer
```

Possible statuses:

```text
GENERATED
VALIDATED
REJECTED
EXPIRED
```

AI output should never directly update an authoritative mark.

---

# 23. AI FAILURE ARCHITECTURE

If AI fails:

```text
AI unavailable
     ↓
Core workflow continues
     ↓
AI panel shows unavailable state
```

If AI output is malformed:

```text
Provider
   ↓
Schema validation
   ↓
Invalid
   ↓
Reject output
   ↓
Do not expose unsafe result
```

If AI confidence/context is inadequate:

```text
Insufficient context
      ↓
No authoritative suggestion
      ↓
Human continues manually
```

---

# 24. AI COST / DEPENDENCY CONTROL

The MVP should not depend on paid AI access for core functionality.

Architecture should support:

```text
AI enabled
```

and:

```text
AI disabled
```

without breaking the product.

Seeded/mock AI responses may be used for deterministic demonstrations if clearly labeled as simulated.

---

# 25. TRIAGE AND MODERATION ARCHITECTURE

Quality signals are evidence-bearing observations. They are not themselves the
moderation workflow.

The moderation pipeline is:

```text
QualitySignal(s)
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
```

A `TriageCase` may contain one or many related quality signals.

Possible triage state model:

```text
OPEN
 ↓
IN_REVIEW
 ├── RESOLVED
 ├── DISMISSED
 ├── ESCALATED
 └── CALIBRATION_REQUESTED
```

Do not allow arbitrary state transitions.

Each transition should verify:

- authorized role;
- current state;
- required reason where applicable;
- audit event creation.

A signal may remain historically `DETECTED`/`OBSERVED` even after its triage case is
resolved or dismissed. The case lifecycle is therefore separate from signal
generation/history.

---

# 26. TRIAGE CASE AND RESOLUTION MODEL

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

Resolution
 ├── id
 ├── caseId
 ├── actorId
 ├── action
 ├── reason
 ├── notes
 └── timestamp
```

Resolution reason is mandatory for actions that close, dismiss, escalate or request
calibration.

The architecture must not model `QualitySignal` itself as the object that a
moderator resolves.

---

# 27. AUDIT ARCHITECTURE

Audit is a first-class system capability.

`EvaluationEvent` and `AuditEvent` are distinct concepts:

- `EvaluationEvent` records something that happened in evaluation activity, such as
  `QUESTION_MARKED`, `MARK_UPDATED`, or `SCRIPT_SUBMITTED`.
- `AuditEvent` records a traceable user/system action affecting governed state,
  such as `SIGNAL_RESOLVED`, `RUBRIC_UPDATED`, or `USER_ROLE_CHANGED`.

They may be correlated, but they must not collapse into one ambiguous event type.

Record:

- actor;
- role;
- action;
- entity;
- previous state where relevant;
- new state;
- timestamp;
- reason;
- correlation/request ID;
- relevant evidence reference.

Audit records should be append-oriented.

Avoid:

```text
UPDATE audit_record SET ...
```

when an immutable event/history model is more appropriate.

---

# 28. RBAC ARCHITECTURE

Minimum roles:

```text
EVALUATOR
MODERATOR
COE
ADMINISTRATOR
```

`COE` is the canonical role identifier; its display label is **COE of
Examinations**.

Potential permissions:

| Capability | Evaluator | Moderator | COE | Admin |
|---|---:|---:|---:|---:|
| Evaluate scripts | ✓ | Optional | No | No |
| View own assistance | ✓ | ✓ | ✓ | ✓ |
| View quality signals | Limited | ✓ | ✓ | ✓ |
| Resolve signals | No | ✓ | Controlled | Controlled |
| Escalate | No | ✓ | ✓ | Controlled |
| View institution dashboard | No | ✓ | ✓ | ✓ |
| Configure rubric | No | Controlled | Controlled | ✓ |
| Configure thresholds | No | Controlled | Controlled | ✓ |
| View audit | Limited | ✓ | ✓ | ✓ |
| Manage users | No | No | No | ✓ |

The exact permission matrix may be refined during implementation, but role boundaries must remain explicit.

---

# 29. AUTHENTICATION ARCHITECTURE

MVP:

- simple authenticated sessions/token mechanism appropriate to the chosen stack;
- seeded demo users;
- role-based authorization.

Production direction:

- institutional SSO;
- stronger identity assurance;
- centralized user lifecycle management.

Do not build institutional SSO for the hackathon unless explicitly required.

---

# 30. API ARCHITECTURE

The API should be organized around product capabilities rather than database tables.

Potential resource groups:

```text
/api/cycles
/api/evaluations
/api/events
/api/validation
/api/signals
/api/moderation
/api/dashboard
/api/calibration
/api/revaluation
/api/learning
/api/audit
/api/ai
/api/admin
```

The final API should not expose internal implementation details unnecessarily.

---

# 31. API RULES

Every mutation should:

1. authenticate;
2. authorize;
3. validate input;
4. validate state transition;
5. execute domain operation;
6. persist the result;
7. create required audit/event records;
8. return a clear result.

Do not allow frontend-only authorization.

---

# 32. IDEMPOTENCY

Important operations should be safe against accidental repetition where appropriate.

Examples:

```text
Process evaluation event
Generate signal
Resolve moderation item
Record revaluation
```

The architecture should define idempotency behavior before implementation.

---

# 33. CONCURRENCY

Consider cases such as:

```text
Two moderators open the same signal.
A signal is resolved while another user is reviewing it.
An evaluator updates a mark while analytics are running.
```

The MVP can use simple optimistic concurrency/version checks.

The important requirement is:

> Do not silently overwrite another user's authoritative action.

---

# 34. REAL-TIME / NEAR-REAL-TIME DESIGN

The PRD requires real-time or near-real-time quality visibility.

For MVP, do not assume a complex streaming architecture.

Possible approach:

```text
Evaluation event
      ↓
Persist
      ↓
Run validation / signal calculation
      ↓
Update read model
      ↓
Dashboard refresh
```

Dashboard update can initially use:

- short polling;
- request-triggered refresh;
- lightweight server push if already supported.

A message broker is not mandatory.

---

# 35. DASHBOARD ARCHITECTURE

QualityPulse should be decision-oriented.

Required high-level data:

```text
Evaluation progress
Scripts evaluated
Open signals
Priority signals
Resolved signals
Evaluator patterns
Question hotspots
Trend over time
```

Drill-down:

```text
Overview
   ↓
Evaluator group
   ↓
Evaluator
   ↓
Question
   ↓
Script/Event
   ↓
Evidence
```

Aggregates must link to supporting data.

---

# 35.1 QUERY AND READ-MODEL ARCHITECTURE

QualityPulse and other dashboards are aggregation-heavy consumers. The MVP should
avoid forcing the frontend to reconstruct analytics by querying many operational
tables independently.

Preferred MVP flow:

```text
Operational State + Evaluation Events
              ↓
Application Query Services
              ↓
Aggregated Dashboard Queries
              ↓
QualityPulse / COE Views
```

Precomputed read models may be introduced only when a measured query or workload
justifies them.

Future production evolution may become:

```text
Operational DB
      ↓
Analytics / Aggregation Pipeline
      ↓
Read Models
      ↓
Dashboards
```

No separate analytics warehouse is required for the MVP.

---

# 36. MODERATION QUEUE ARCHITECTURE

Every queue item should expose:

- signal type;
- evaluator;
- question/area;
- affected volume;
- evidence;
- comparison baseline;
- time detected;
- current status;
- priority rationale.

Actions:

```text
Review
Dismiss
Resolve
Escalate
Request calibration
```

High priority must never imply guilt.

---

# 37. CALIBRATION ARCHITECTURE

Calibration entities should support:

```text
Rubric
Criterion
Exemplar
CalibrationSession
EvaluatorResponse
CalibrationOutcome
```

Potential flow:

```text
Reference Exemplar
       ↓
Evaluator Review
       ↓
Comparison
       ↓
Difference
       ↓
Human Interpretation
       ↓
Calibration Feedback
```

Calibration should not silently change marks.

---

# 38. REVALUATION ARCHITECTURE

Minimum logical data:

```text
Revaluation
 ├── scriptId
 ├── questionId
 ├── originalMark
 ├── revisedMark
 ├── delta
 ├── topic
 ├── cycleId
 └── timestamp
```

Analytics can identify:

```text
Repeated mark changes
Question hotspots
Topic hotspots
Evaluator disagreement areas
```

Small samples must be labeled as insufficient evidence.

---

# 39. LEARNING LOOP ARCHITECTURE

The learning loop should be recommendation-driven.

```text
Revaluation
    ↓
Analysis
    ↓
Hotspot
    ↓
Learning Insight
    ↓
Candidate Exemplar / Calibration Update
    ↓
Human Approval
    ↓
Next Cycle
```

Never:

```text
Revaluation
    ↓
Automatic rubric modification
```

---

# 40. DATA FLOW — NORMAL EVALUATION

```text
Evaluator
   ↓
Evaluation UI
   ↓
Submit mark
   ↓
Evaluation API
   ↓
Validation
   ↓
Persist evaluation
   ↓
Create event
   ↓
Update analytics
   ↓
Dashboard
```

---

# 41. DATA FLOW — UNCHECKED ANSWER

```text
Evaluator submits
        ↓
Validation Engine
        ↓
Required answer has no mark
        ↓
ValidationResult
        ↓
Quality / correction notification
        ↓
Evaluator fixes issue
        ↓
Re-validation
        ↓
Clean submission
```

This path should be deterministic.

---

# 42. DATA FLOW — STATISTICAL ANOMALY

```text
Evaluation events
        ↓
Feature calculation
        ↓
Peer baseline
        ↓
Deviation calculation
        ↓
Minimum sample check
        ↓
Signal generation
        ↓
Evidence creation
        ↓
Priority
        ↓
Moderator queue
```

---

# 43. DATA FLOW — MODERATOR RESOLUTION

```text
Moderator
   ↓
Open signal
   ↓
Load evidence
   ↓
Inspect context
   ↓
Select action
   ↓
Enter reason
   ↓
Authorization
   ↓
State transition
   ↓
Audit event
   ↓
Dashboard update
```

---

# 44. DATA FLOW — REVALUATION LEARNING

```text
Revaluation records
        ↓
Mark-change analysis
        ↓
Question/topic aggregation
        ↓
Hotspot detection
        ↓
Learning insight
        ↓
Human review
        ↓
Calibration / exemplar candidate
        ↓
Next evaluation cycle
```

---

# 45. SEEDED DEMO ARCHITECTURE

The dataset must support at least:

### Scenario A
Normal evaluator.

### Scenario B
Unchecked answer.

### Scenario C
Marking anomaly.

### Scenario D
Evaluator drift.

### Scenario E
Calibration disagreement.

### Scenario F
Revaluation hotspot.

### Scenario G
Legitimate false positive.

Each scenario should have:

- known input;
- expected detection;
- expected evidence;
- expected UI state;
- expected human action;
- expected audit result.

---

# 46. SEED DATA DESIGN

Seed data should be deterministic.

Example entities:

```text
3–5 evaluators
20–100 scripts
Multiple questions
Multiple evaluator groups
Rubric criteria
Exemplars
Normal activity
One or more seeded anomalies
Revaluation records
```

The exact numbers should be chosen for demo clarity, not artificial scale claims.

---

# 47. DEMO RESET

The system should support a reliable reset path.

Conceptually:

```text
Reset Demo
   ↓
Clear mutable demo state
   ↓
Recreate deterministic dataset
   ↓
Recreate seeded scenarios
   ↓
Return to known baseline
```

This is important for hackathon reliability.

---

# 48. FRONTEND ARCHITECTURE

Frontend should be organized by user workflow.

Possible structure:

```text
App
├── Auth
├── Evaluator
│   ├── Cycle
│   ├── Evaluation
│   ├── Validation
│   └── Calibration
├── Moderator
│   ├── QualityPulse
│   ├── EscalationHub
│   ├── Evidence
│   └── Audit
├── COE
│   ├── Overview
│   ├── Trends
│   └── RevaluationInsight
└── Admin
    ├── Cycles
    ├── Rubrics
    ├── Exemplars
    └── Configuration
```

The frontend must not duplicate core business logic.

---

# 49. BACKEND ARCHITECTURE

Preferred conceptual layering:

```text
Routes / Controllers
        ↓
Application Services
        ↓
Domain Services / Rules
        ↓
Repositories
        ↓
Database
```

Cross-cutting:

```text
Authentication
Authorization
Validation
Logging
Error handling
Audit
```

Intelligence:

```text
Validation Engine
Analytics Engine
AI Adapter
```

---

# 50. MODULE DEPENDENCY RULE

Prefer:

```text
Presentation
      ↓
Application
      ↓
Domain
      ↓
Infrastructure
```

Avoid:

```text
Frontend
  ↓
Database
```

or:

```text
AI provider
  ↓
Database
```

without domain/application mediation.

---

# 51. ARCHITECTURAL DEPENDENCY GRAPH

A reasonable dependency direction is:

```text
UI
 ↓
Application
 ↓
Domain
 ↓
Interfaces
 ↓
Infrastructure
```

Infrastructure can implement interfaces.

The domain should not be tightly coupled to:

- a specific database;
- a specific LLM provider;
- a specific OSM vendor;
- a specific frontend framework.

---

# 52. OSM INTEGRATION ADAPTER

Future production integration should look like:

```text
External OSM
     ↓
OSM Adapter
     ↓
Normalized Evaluation Event
     ↓
QualityLoop Core
```

The adapter should translate external formats into the internal event model.

Do not allow vendor-specific fields to contaminate the entire application.

---

# 53. FUTURE OSM INTEGRATION CONTRACT

Define a conceptual contract for:

```text
receiveEvaluationEvent()
receiveEvaluationSnapshot()
receiveRevaluationEvent()
receiveRubric()
receiveExemplar()
```

The actual integration method may later be:

- REST API;
- webhook;
- file import;
- event stream;
- scheduled synchronization.

Do not assume a particular vendor provides any specific API until verified.

---

# 54. FILE IMPORT AS A FALLBACK

Because real OSM API availability is unknown, the architecture should permit:

```text
JSON/CSV synthetic import
        ↓
Normalizer
        ↓
Internal event model
```

This gives the MVP an integration-like demonstration without pretending to have a real OSM integration.

---

# 55. SECURITY ARCHITECTURE

MVP must still enforce:

- authentication;
- authorization;
- role separation;
- input validation;
- secure secrets handling;
- no PII;
- protected admin functions;
- safe error messages;
- audit logging.

Do not expose:

- database credentials;
- API keys;
- internal stack traces;
- sensitive configuration.

---

# 56. PRIVACY ARCHITECTURE

MVP:

```text
Synthetic IDs
Synthetic names
Synthetic scripts
Synthetic marks
No real student PII
```

If images/text are used, ensure they are:

- synthetic;
- public with appropriate use rights;
- or otherwise authorized.

Production direction requires:

- data minimization;
- authorization;
- retention controls;
- access control;
- institutional approval;
- applicable data-protection requirements.

---

# 57. SECRET MANAGEMENT

Never hardcode:

```text
API keys
Database passwords
JWT secrets
Provider credentials
```

Use environment/configuration mechanisms appropriate to the chosen deployment.

The repository must not contain real secrets.

---

# 58. OBSERVABILITY ARCHITECTURE

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

Important events to observe:

- evaluation event processing;
- validation failure;
- signal generation;
- moderation resolution;
- AI failure;
- database failure;
- demo reset.

---

# 59. CORRELATION ID

A request or workflow should be traceable.

Example:

```text
Request
 ↓
Evaluation command
 ↓
Event
 ↓
Signal
 ↓
Moderation
 ↓
Audit
```

A correlation identifier should allow developers to trace the chain.

---

# 60. HEALTH CHECK

The system should expose a lightweight health mechanism.

Conceptually:

```text
GET /health
```

It should distinguish at least:

```text
Application healthy
Database unavailable
Optional AI unavailable
```

AI unavailability should not make the core product appear unhealthy if AI is optional.

---

# 61. ERROR HANDLING

Errors should be categorized.

### User/input error

```text
400-class behavior
```

### Authentication/authorization error

```text
401 / 403 behavior
```

### Missing resource

```text
404 behavior
```

### Conflict/state error

```text
409-style behavior
```

### Internal failure

```text
500-style behavior
```

Do not leak internal implementation details.

---

# 62. EDGE-CASE ARCHITECTURE

The following behaviors are mandatory:

| Situation | Required behavior |
|---|---|
| Insufficient sample | No unreliable anomaly |
| Legitimately strict evaluator | Moderator can dismiss |
| Duplicate signals | Group/avoid unnecessary duplication |
| Missing exemplar | Explicit empty state |
| AI unavailable | Core workflow continues |
| AI uncertain | Show uncertainty or disable assistance |
| Stale data | Show stale status |
| Resolved flag reopened | Preserve history |
| No resolution reason | Block resolution |
| Small revaluation sample | Insufficient-evidence state |
| Conflicting moderator actions | Controlled escalation |
| Seed generation failure | Preserve existing dataset |

---

# 63. PERFORMANCE ARCHITECTURE

For MVP, optimize for:

- fast page loads;
- fast dashboard queries;
- responsive moderation queue;
- predictable seeded demo;
- reasonable event processing.

Do not optimize for imaginary institutional scale before the MVP works.

For every performance-sensitive query, consider:

- indexes;
- aggregation strategy;
- pagination;
- caching only when needed;
- precomputed read models only when justified.

---

# 64. SCALABILITY PATH

The architecture should evolve approximately like:

```text
MVP
Modular Monolith
      ↓
Higher data volume
      ↓
Background jobs where needed
      ↓
Read-model optimization
      ↓
External OSM integration
      ↓
Selective service extraction
      ↓
Institution-scale deployment
```

Do not jump directly to distributed architecture.

---

# 65. WHEN A SERVICE SHOULD BE SPLIT

Only consider extracting a service if at least one is true:

1. It has a genuinely different scaling profile.
2. It has an independent deployment lifecycle.
3. It has a strong security boundary.
4. It requires a specialized runtime.
5. It creates a measurable engineering benefit.

"Microservices are scalable" is not sufficient justification.

---

# 66. BACKGROUND JOBS

Potential background work:

- analytics recomputation;
- revaluation analysis;
- large dataset import;
- AI generation;
- report generation.

For MVP, synchronous processing is acceptable when data is small and predictable.

Use background jobs only when they materially improve reliability or responsiveness.

---

# 67. CACHING

Cache only derived/read-heavy information where useful.

Never use stale cache as the authoritative source for:

- official marks;
- moderation state;
- audit state;
- rubric state.

If caching is introduced, define:

- source of truth;
- invalidation;
- stale behavior.

---

# 68. REPORTING

Reports should be generated from authoritative/derived data with clear provenance.

Potential reports:

- cycle quality summary;
- moderation summary;
- anomaly summary;
- revaluation insight;
- audit export.

A report must distinguish:

```text
Observed
Derived
AI-generated
Human-resolved
```

---

# 69. TESTING ARCHITECTURE

Testing must mirror the product lifecycle.

## Unit tests

Test:

- validation rules;
- statistical calculations;
- state transitions;
- priority calculation;
- permission checks.

## Integration tests

Test:

```text
Event
 ↓
Validation
 ↓
Signal
 ↓
Persistence
 ↓
Moderation
 ↓
Audit
```

## API tests

Test:

- authentication;
- authorization;
- validation;
- mutation behavior;
- error handling.

## UI tests

Test critical user flows:

- evaluator submission;
- unchecked-answer correction;
- moderator review;
- resolution;
- controller drill-down.

## End-to-end demo test

One test should reproduce the full seeded quality loop.

---

# 70. QUALITY LOOP TEST CONTRACT

The architecture is not accepted until this scenario works:

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
Signal enters queue
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
```

---

# 71. TESTING FALSE POSITIVES

At least one seeded legitimate false positive must exist.

Expected:

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

This is essential to demonstrate that the system assists humans rather than automatically accusing people.

---

# 72. TESTING ROLE BOUNDARIES

Explicitly test:

```text
Evaluator cannot resolve moderator signal.
Evaluator cannot alter official rubric.
Moderator cannot impersonate evaluator.
Unauthorized user cannot access audit.
AI cannot update official marks.
Statistical engine cannot trigger punishment.
```

---

# 73. TESTING AI BOUNDARIES

Test:

1. AI unavailable.
2. AI returns malformed output.
3. AI returns unsupported claim.
4. AI receives insufficient context.
5. AI output is displayed as advisory.
6. AI cannot mutate official marks.
7. Human can ignore AI assistance.

---

# 74. TESTING DETERMINISM

Run the seeded demo multiple times.

Expected:

```text
Same seed
+
Same dataset
+
Same configuration
=
Same core signals
```

If randomness is required for non-critical behavior, isolate it.

---

# 75. ARCHITECTURE DECISION RECORDS

Every major architectural decision should be documented.

Format:

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

Minimum ADRs should cover:

- architecture style;
- database choice;
- frontend/backend boundary;
- event strategy;
- analytics strategy;
- AI adapter;
- authentication;
- deployment;
- real-time updates;
- audit strategy.

---

# 76. TECHNOLOGY SELECTION RULE

Do not select technology because it is fashionable.

For every major technology, evaluate:

| Criterion | Question |
|---|---|
| Product fit | Does it solve a real requirement? |
| Buildability | Can the team implement it? |
| Simplicity | Does it reduce or increase complexity? |
| Reliability | Is it stable enough for the demo? |
| Cost | Can it be used without mandatory paid services? |
| Ecosystem | Is documentation/support sufficient? |
| Future path | Can it evolve toward production? |

Use the existing team's strongest practical technologies where appropriate.

---

# 77. INFRASTRUCTURE CONSTRAINT

The MVP should avoid unnecessary infrastructure such as:

- Kubernetes;
- service meshes;
- complex event brokers;
- multi-region systems;
- distributed tracing platforms;
- dedicated data warehouses;
- multiple databases without clear need.

If any such component is proposed, the architecture agent must justify it explicitly.

---

# 78. DEPLOYMENT ARCHITECTURE

Prefer a simple deployment model:

```text
Frontend
   ↓
Backend
   ↓
Database
```

Optional:

```text
Backend
   ↓
AI Provider
```

The exact hosting provider may be selected later.

The system should be deployable without requiring a complex local environment.

---

# 79. LOCAL DEVELOPMENT ARCHITECTURE

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
```

Avoid architecture that requires multiple infrastructure services just to boot the application.

---

# 80. CONFIGURATION MANAGEMENT

Keep configuration separate from business logic.

Examples:

```text
Environment
Database URL
AI enabled/disabled
AI provider
Thresholds
Demo mode
Logging level
```

Do not hardcode environment-specific values.

---

# 81. THRESHOLD CONFIGURATION

Quality thresholds should be configurable where appropriate.

Examples:

```text
Minimum sample size
Deviation threshold
Drift threshold
Priority threshold
```

But configuration must be versionable and auditable.

Do not silently change a threshold and invalidate historical interpretation.

---

# 82. VERSIONING

Consider versioning for:

- rubrics;
- exemplars;
- quality rules;
- statistical configurations;
- detector implementations;
- AI prompt/configuration;
- demo datasets.

Quality signals must retain the detector/version/configuration provenance under
which they were generated.

Historical signals should remain interpretable using the configuration under which they were generated.

---

# 83. DATA PROVENANCE

Every derived output should be traceable to its source.

Example:

```text
QualitySignal
   ↓
Calculation
   ↓
Input metrics
   ↓
Evaluation events
```

AI output:

```text
AIAdvice
   ↓
Context
   ↓
Source records
```

Learning insight:

```text
LearningInsight
   ↓
Revaluation records
   ↓
Aggregation
```

---

# 84. QUALITY SIGNAL AND TRIAGE CASE LIFECYCLES

A quality signal records detection and evidence. It should not inherit the full
moderation workflow.

Example signal lifecycle:

```text
GENERATED
   ↓
RECORDED
   ↓
CORRELATED / GROUPED
```

The moderation lifecycle belongs to `TriageCase`:

```text
OPEN
   ↓
IN_REVIEW
   ├── RESOLVED
   ├── DISMISSED
   ├── ESCALATED
   └── CALIBRATION_REQUESTED
```

Historical signal generation and case state transitions must remain traceable.

---

# 85. DUPLICATE SIGNAL CONTROL

The same underlying issue may trigger multiple detectors.

Architecture should support grouping:

```text
Raw Signals
    ↓
Correlation / Deduplication
    ↓
Grouped Quality Issue
    ↓
Moderator Queue
```

Do not overwhelm moderators with ten alerts describing the same issue.

---

# 86. SIGNAL SEVERITY VS PRIORITY

Do not confuse:

```text
Severity
```

with:

```text
Priority
```

Severity describes potential impact.

Priority describes review order.

Example:

```text
Severity: Medium
Priority: High
Reason: affects 200 scripts and deadline is near
```

Both should remain explainable.

---

# 87. AI VS RULES VS STATISTICS ARCHITECTURAL MATRIX

| Capability | Rules | Statistics | AI | Human |
|---|---:|---:|---:|---:|
| Missing mark | ✓ | | | ✓ |
| Total mismatch | ✓ | | | ✓ |
| Invalid range | ✓ | | | ✓ |
| Marking anomaly | | ✓ | Optional | ✓ |
| Evaluator drift | | ✓ | Optional | ✓ |
| Answer summary | | | ✓ | ✓ |
| Exemplar comparison | | | ✓ | ✓ |
| Signal prioritization | ✓ | ✓ | Advisory explanation only | ✓ |
| Final mark | | | | ✓ |
| Flag resolution | | | | ✓ |
| Rubric change | | | | ✓ |

---

# 88. ARCHITECTURE FOR HONEST AI LABELING

The UI should distinguish:

```text
Official record
System-calculated metric
Statistical quality signal
AI-generated assistance
Human decision
```

Suggested labels:

```text
SYSTEM CHECK
QUALITY SIGNAL
AI ASSISTANCE
HUMAN DECISION
```

Never visually imply that AI-generated text is an official academic decision.

---

# 89. ACCESSIBILITY

Core workflows should be usable without:

- excessive animation;
- color-only meaning;
- dense visualizations;
- unreadable tables.

Every important status should have textual meaning.

Example:

```text
High Priority — Requires Review
```

not merely:

```text
[red dot]
```

---

# 90. MOBILE ARCHITECTURE

MVP:

> Responsive web application.

Do not build a separate native mobile application before the core web product is complete.

Future native mobile support should reuse the same backend/API/domain architecture.

---

# 91. HANDWRITING OCR ARCHITECTURE

OCR is NOT a core MVP dependency.

MVP may use:

```text
Digitized answer image
+
Synthetic extracted text
+
Manually authored scenarios
```

Optional experimental OCR must be isolated behind an adapter:

```text
OCR Interface
   ↓
Provider / Model
   ↓
Confidence
   ↓
Human correction
```

Never allow experimental OCR to silently become the authoritative answer text.

---

# 92. IMAGE / ANSWER STORAGE

If answer images are demonstrated:

- keep them synthetic/public/authorized;
- separate metadata from binary storage;
- avoid storing unnecessary copies;
- define access control;
- define lifecycle/cleanup.

Do not make large image storage a requirement if the MVP can demonstrate the concept with lightweight synthetic data.

---

# 93. OBSERVABILITY OF THE QUALITY LOOP

Track at least:

```text
events processed
validation failures
signals generated
signals suppressed/grouped
signals reviewed
signals resolved
signals dismissed
average review latency
audit events created
AI calls attempted
AI failures
```

These are operational metrics, not claims of institutional impact.

---

# 94. MVP SUCCESS CRITERIA

Architecture is successful if the MVP can demonstrate:

1. Evaluation cycle creation.
2. Synthetic evaluation events.
3. Deterministic completeness checking.
4. Statistical quality signals.
5. Evidence-backed signals.
6. Prioritized moderation.
7. Moderator resolution.
8. Required resolution reason.
9. Audit trail.
10. Quality dashboard.
11. Calibration/exemplar flow.
12. Revaluation insight.
13. Learning-loop output.
14. Role boundaries.
15. AI optionality.
16. Deterministic demo reset.

---

# 95. PRODUCT QUALITY METRICS

Architecture should make these measurable:

- time from seeded anomaly to flag;
- percentage of seeded anomalies surfaced;
- percentage of signals with evidence;
- percentage of resolved signals with reasons;
- dashboard refresh latency;
- calibration completion;
- revaluation hotspot detection on seeded data;
- false-positive rate on seeded legitimate cases;
- audit completeness;
- role-boundary test pass rate;
- demo repeatability.

Do not claim these metrics represent real institutional performance.

---

# 96. FUTURE INSTITUTIONAL METRICS

The architecture should eventually permit measuring:

- time-to-detect quality issue;
- moderation workload;
- time-to-result;
- correction/revaluation rate;
- inter-evaluator variance;
- revaluation mark-change frequency;
- calibration consistency.

These are future validation metrics.

---

# 97. FAILURE MODE MATRIX

| Failure | Detection | Safe behavior | Recovery |
|---|---|---|---|
| Database unavailable | Health/error | Fail safely | Retry/recover |
| AI unavailable | Adapter status | Core workflow continues | Retry/disable |
| Analytics fails | Job/error | Preserve events | Recompute |
| Duplicate event | Idempotency | Ignore duplicate | Audit |
| False anomaly | Moderator review | Dismiss | Record reason |
| Invalid AI output | Schema validation | Reject output | Retry/manual |
| Stale data | Timestamp | Show stale state | Refresh |
| Conflicting action | Version check | Prevent overwrite | Reload/escalate |
| Seed failure | Seed transaction | Preserve baseline | Retry/reset |

---

# 98. SECURITY RED TEAM

Before implementation, ask:

- Can an evaluator access another evaluator's restricted data?
- Can a moderator modify an official mark?
- Can an AI response modify database state?
- Can an unauthenticated user call internal APIs?
- Can a user bypass frontend role restrictions through direct API calls?
- Can audit records be modified?
- Are secrets exposed?
- Can synthetic data accidentally contain real PII?
- Are admin endpoints protected?
- Are error messages leaking internals?

---

# 99. DATA RED TEAM

Ask:

- What is the authoritative mark?
- Can derived analytics overwrite it?
- Can duplicate events distort statistics?
- Are minimum sample sizes enforced?
- Can old configuration be reconstructed?
- Can a moderator understand the evidence?
- Can a revaluation record be traced to the original mark?
- Can a learning insight be traced to its source records?

---

# 100. AI RED TEAM

Ask:

- Does the product still work if AI is turned off?
- Is every AI output labeled?
- Is context sufficient?
- Is generated content grounded?
- Can malformed output reach users?
- Can AI change authoritative state?
- Can AI create a false accusation?
- Is there a clear fallback?
- Is the AI actually solving a problem that rules/statistics cannot solve more safely?

---

# 101. ARCHITECTURE ANTI-PATTERNS

Do NOT build:

### 1. AI-first grading engine

```text
Answer
 ↓
LLM
 ↓
Final Mark
```

Not allowed.

### 2. Black-box anomaly score

```text
Risk = 0.97
```

with no evidence.

### 3. Dashboard-only product

A dashboard without intervention or workflow does not close the loop.

### 4. Microservice zoo

Ten services for a hackathon MVP is unnecessary complexity.

### 5. AI dependency

The entire product must not stop because an AI provider fails.

### 6. Fake integration

Do not claim a real OSM integration when using synthetic/mock data.

### 7. Automatic punishment

No AI/statistical output should directly trigger punitive action.

### 8. Data duplication

Do not create multiple conflicting sources of truth.

### 9. Feature checklist architecture

Do not create isolated modules solely to claim every hackathon bullet.

### 10. Production theater

Do not add Kubernetes, complex queues, distributed systems or elaborate observability merely to appear enterprise-grade.

---

# 102. ARCHITECTURE DELIVERABLES

The Step 4 agent must produce the following artifacts.

## A. Architecture Overview

Include:

- system context;
- architecture style;
- component diagram;
- major boundaries.

## B. Component Architecture

For every component:

- responsibility;
- inputs;
- outputs;
- dependencies;
- failure behavior.

## C. Data Architecture

Include:

- ER/data model;
- relationships;
- source-of-truth rules;
- indexes;
- event model;
- audit model.

## D. API Architecture

Include:

- endpoint groups;
- request/response contracts;
- authentication;
- authorization;
- error model;
- idempotency.

## E. Intelligence Architecture

Separate:

- deterministic rules;
- statistical analytics;
- AI;
- human decisions.

## F. Quality Loop Architecture

Show:

```text
Evaluate
→ Validate
→ Detect
→ Prioritize
→ Review
→ Resolve
→ Audit
→ Revalue
→ Learn
→ Calibrate
```

## G. Security Architecture

Include:

- authentication;
- RBAC;
- authorization;
- secrets;
- privacy;
- audit.

## H. Testing Architecture

Include:

- unit;
- integration;
- API;
- UI;
- E2E;
- deterministic demo tests;
- AI boundary tests.

## I. Deployment Architecture

Include:

- local;
- MVP;
- production evolution.

## J. Architecture Decision Records

Record major choices and rejected alternatives.

## K. Implementation Handoff

Convert architecture into:

- implementation phases;
- dependency order;
- module ownership;
- database implementation sequence;
- API implementation sequence;
- frontend sequence;
- test gates.

---

# 103. REQUIRED ARCHITECTURE DOCUMENT STRUCTURE

The future architecture output should use this order:

```text
1. Executive Architecture Summary
2. Architecture Goals
3. Architecture Constraints
4. Architecture Principles
5. System Context
6. Container / Component Architecture
7. Module Boundaries
8. Quality Loop Architecture
9. Data Architecture
10. Event Architecture
11. API Architecture
12. Authentication & RBAC
13. Deterministic Validation Architecture
14. Statistical Intelligence Architecture
15. AI Architecture
16. Moderation Architecture
17. Calibration Architecture
18. Revaluation / Learning Architecture
19. Audit Architecture
20. Frontend Architecture
21. Backend Architecture
22. Integration Architecture
23. Security & Privacy
24. Error Handling
25. Observability
26. Performance
27. Scalability
28. Deployment
29. Testing
30. Seeded Demo Architecture
31. Failure Modes
32. ADRs
33. Requirement Traceability
34. Implementation Phases
35. Architecture Acceptance Gate
```

---

# 104. REQUIREMENT TRACEABILITY

Every architectural component must trace to a PRD requirement.

Example:

| PRD requirement | Architecture component |
|---|---|
| FR-001 Cycle | Evaluation Cycle module |
| FR-002 Events | Event ingestion/module |
| FR-003 Completeness | Validation Engine |
| FR-004 Signals | Quality Intelligence |
| FR-005 Evidence | Evidence model |
| FR-006 Prioritization | Prioritization + TriageCase |
| FR-008 Resolution | Moderation module |
| FR-009 Reason | Moderation action validation |
| FR-010 Audit | Audit subsystem |
| FR-011 Dashboard | QualityPulse |
| FR-012 Calibration | Calibration module |
| FR-013 Drift | Analytics engine |
| FR-014 Revaluation | Revaluation module |
| FR-015 Learning | Learning loop |
| FR-016 AI | AI adapter |
| FR-017 Roles | Auth/RBAC |
| FR-018 Synthetic data | Seed/data generator |

No major component should exist without a product reason.

---

# 105. ARCHITECTURE SIMPLIFICATION TEST

For every component ask:

> Can this be removed without breaking an MVP requirement?

If yes:

- consider removing it;
- or move it to future scope.

For every external dependency ask:

> Can this capability be implemented internally for the MVP with less risk?

If yes, prefer the simpler option unless there is a strong reason not to.

---

# 106. ARCHITECTURE COMPLEXITY BUDGET

The architecture must optimize for:

```text
Correctness
>
Trust
>
Buildability
>
Demo reliability
>
Maintainability
>
Scalability
>
Architectural sophistication
```

Do not optimize for impressive diagrams.

A simple architecture that closes the quality loop is preferable to a complex architecture that cannot be completed.

---

# 107. IMPLEMENTATION ORDER

The architecture should naturally support this implementation sequence:

```text
Phase 1
Foundation
    ↓
Phase 2
Evaluation Cycle + Events
    ↓
Phase 3
Validation Engine
    ↓
Phase 4
Quality Signals
    ↓
Phase 5
Moderation + Evidence
    ↓
Phase 6
Audit
    ↓
Phase 7
QualityPulse
    ↓
Phase 8
Calibration
    ↓
Phase 9
Revaluation + Learning
    ↓
Phase 10
Optional AI Assistance
    ↓
Phase 11
Demo Hardening
    ↓
Phase 12
Testing + Deployment
```

Do not build AI first.

---

# 108. ARCHITECTURE GATES BETWEEN PHASES

## Gate 1 — Foundation

Must have:

- application boots;
- database works;
- authentication works;
- roles work.

## Gate 2 — Evaluation

Must have:

- cycle;
- scripts;
- questions;
- marks;
- events.

## Gate 3 — Validation

Must have:

- deterministic completeness checks;
- evidence;
- correction flow.

## Gate 4 — Intelligence

Must have:

- seeded statistical anomaly;
- evidence;
- minimum sample handling.

## Gate 5 — Moderation

Must have:

- queue;
- review;
- resolution;
- reason;
- audit.

## Gate 6 — Quality Loop

Must have:

- revaluation;
- learning insight;
- calibration candidate.

## Gate 7 — AI

AI may only be added after the deterministic/statistical core works.

## Gate 8 — Demo

Full 5–7 minute flow works from a clean reset.

---

# 109. DEFINITION OF DONE FOR ARCHITECTURE

Step 4 is complete only when:

- [ ] System boundaries are explicit.
- [ ] Architecture style is justified.
- [ ] Component responsibilities are explicit.
- [ ] Data model is defined.
- [ ] Event model is defined.
- [ ] API boundaries are defined.
- [ ] RBAC is defined.
- [ ] Validation architecture is defined.
- [ ] Analytics architecture is defined.
- [ ] AI boundary is defined.
- [ ] QualitySignal is separated from TriageCase.
- [ ] Correlation/deduplication is defined.
- [ ] Moderation workflow resolves TriageCase objects.
- [ ] Audit model is defined.
- [ ] Calibration loop is defined.
- [ ] Revaluation loop is defined.
- [ ] Learning loop is defined.
- [ ] Error behavior is defined.
- [ ] Security/privacy boundaries are defined.
- [ ] Testing architecture is defined.
- [ ] Demo architecture is deterministic.
- [ ] Deployment path is practical.
- [ ] Future OSM integration boundary exists.
- [ ] No unnecessary infrastructure is required.
- [ ] Every major architecture decision has a reason.
- [ ] Every major component traces to the PRD.
- [ ] Architecture does not violate human authority.
- [ ] Architecture does not require real student PII.
- [ ] Architecture does not depend on AI availability.

---

# 110. FINAL ARCHITECTURE GATE

Before moving to implementation, the architecture agent must answer:

### Product
- Does this architecture implement the actual QualityLoop product rather than a generic OSM system?

### Quality loop
- Can evaluation activity become a quality signal?
- Can multiple signals be correlated into a TriageCase?
- Can a TriageCase become a human resolution?
- Can moderation become auditable learning?
- Can learning influence the next cycle?

### AI
- Is AI optional?
- Is AI bounded?
- Is AI explainable?
- Can the system operate without it?

### Analytics
- Are signals evidence-backed?
- Are minimum sample sizes respected?
- Are false positives safely handled?

### Trust
- Can humans override?
- Can moderators dismiss?
- Are resolution reasons required?
- Are punitive actions impossible from signals alone?

### Data
- Does synthetic data fully support the MVP?
- Are authoritative and derived data separated?

### Integration
- Can a future OSM platform connect through an adapter?
- Is the MVP honest about being simulated?

### Buildability
- Can the team actually build this?
- Are there unnecessary services?
- Are there unnecessary infrastructure dependencies?
- Is the deployment simple?

### Demo
- Can the 5–7 minute story run deterministically?
- Can the dataset be reset?
- Can every critical moment be reproduced?

---

# 111. FINAL ARCHITECTURAL PRINCIPLE

The architecture should make this statement true:

> **QualityLoop does not replace human academic judgment. It turns digital evaluation activity into a continuous, explainable quality-control loop that helps humans detect, prioritize, review and learn from evaluation risks earlier.**

The architecture must therefore optimize for:

```text
Human Authority
      +
Deterministic Validation
      +
Transparent Analytics
      +
Bounded AI Assistance
      +
Signal Correlation
      +
Triage + Smart Moderation
      +
Auditability
      +
Revaluation Learning
      ↓
CONTINUOUS QUALITY LOOP
```

---

# 112. FINAL INSTRUCTION FOR THE FUTURE ARCHITECTURE AGENT

When an AI architecture/coding agent receives this file:

1. Treat Step 3 PRD as the product source of truth.
2. Treat this file as the architecture operating contract.
3. Do not redesign the product while designing the architecture.
4. Do not add features merely because they appear in the hackathon statement.
5. Do not make autonomous academic decisions.
6. Do not make AI a mandatory dependency.
7. Do not use an LLM for deterministic problems.
8. Do not create black-box quality scores without evidence.
9. Do not use real student PII for convenience.
10. Do not claim a real OSM integration when using a simulation.
11. Do not introduce infrastructure merely for architectural appearance.
12. Prefer a modular monolith unless a stronger reason exists.
13. Keep external providers behind adapters/interfaces.
14. Preserve source-of-truth boundaries.
15. Make auditability part of the architecture, not an afterthought.
16. Make seeded demo scenarios deterministic.
17. Test false positives and legitimate unusual behavior.
18. Test AI failure and AI unavailability.
19. Test role boundaries at the API/domain level.
20. Keep QualitySignal, TriageCase, Resolution, EvaluationEvent and AuditEvent
    semantically distinct.
21. Make the complete quality loop executable end-to-end.
22. Record major architectural decisions and rejected alternatives.
23. Trace architecture components back to PRD requirements.
24. Separate MVP architecture from production evolution.
25. Escalate ambiguity instead of silently inventing requirements.
26. Prefer the smallest architecture that credibly demonstrates the QualityLoop hypothesis.

---

# 113. STEP 4 OBJECTIVE

The final objective is NOT:

> Build the most sophisticated architecture possible.

It is:

> **Design the smallest technically credible architecture that can demonstrate the QualityLoop quality loop today while preserving a believable path toward integration with real OSM infrastructure tomorrow.**

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

**Step 4 is complete when this loop is architecturally coherent, testable, explainable, secure, deterministic for the MVP, and practical to implement.**
