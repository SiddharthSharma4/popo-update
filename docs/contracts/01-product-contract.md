# PRODUCT CONTRACT

**Project:** QualityLoop
**Document:** `docs/contracts/01-product-contract.md`
**Purpose:** Authoritative product requirements and behavioral contract
**Status:** Approved Product Contract — MVP
**Audience:** Product owner, developers, designers, QA, AI coding agents
**Product Direction:** Direction C — End-to-End OSM Intelligence Ecosystem

---

# 1. DOCUMENT PURPOSE

This document defines **what QualityLoop must do**.

It is the authoritative product contract for:

* product scope
* product behavior
* user roles
* user journeys
* product modules
* functional requirements
* product invariants
* MVP boundaries
* acceptance criteria
* product-level non-functional requirements
* AI/human authority boundaries
* demo-critical behavior

This document does **not** define detailed technical implementation.

Technical implementation belongs in:

```text
docs/02-architecture-contract.md
docs/04-domain-contract.md
docs/05-api-contract.md
docs/06-event-contract.md
docs/07-data-contract.md
docs/08-ai-contract.md
docs/09-testing-contract.md
docs/10-demo-contract.md
docs/11-security-contract.md
```

---

# 2. PRODUCT IDENTITY

## 2.1 Product Name

**QualityLoop**

## 2.2 Product Definition

> **QualityLoop is an intelligent quality-control layer for digital examination evaluation that combines deterministic validation, statistical quality intelligence, assistive AI, smart moderation, calibration, auditability, and revaluation-driven learning around an OSM workflow.**

## 2.3 Product Category

Education Technology / Examination Technology / AI + Analytics for Digital Evaluation

## 2.4 Product Direction

The selected product direction is:

> **Direction C — End-to-End OSM Intelligence Ecosystem**

This defines the product vision.

It does **not** mean that every possible OSM capability must be implemented.

The MVP is a coherent vertical slice of this ecosystem.

---

# 3. CORE PRODUCT POSITIONING

QualityLoop is primarily an:

> **AI + analytics intelligence layer for digital evaluation.**

It is not intended to replace a mature OSM platform.

For the hackathon, QualityLoop may simulate the upstream OSM workflow and generate synthetic evaluation events.

The product does not attempt to replace:

* physical answer-script logistics
* scanning infrastructure
* institutional identity systems
* university ERP/SIS
* complete OSM infrastructure
* official result publication infrastructure

---

# 4. CORE PRODUCT PROBLEM

Large-scale digital evaluation creates large volumes of examiner activity and marking data.

Human experts remain responsible for academic judgment, but examination authorities need better mechanisms to identify:

* incomplete evaluation
* unusual marking patterns
* evaluator drift
* calibration disagreements
* emerging quality hotspots
* cases requiring moderation

The product therefore focuses on the gap between:

```text
DIGITAL EVALUATION
        ↓
QUALITY VALIDATION
        ↓
QUALITY SIGNALS
        ↓
PRIORITIZED REVIEW
        ↓
HUMAN RESOLUTION
        ↓
AUDIT
        ↓
LEARNING
        ↓
NEXT EVALUATION CYCLE
```

---

# 5. PRODUCT VISION

QualityLoop should make evaluation quality more:

* observable
* proactive
* explainable
* reviewable
* consistent
* auditable
* continuously improvable

The central product loop is:

```text
EVALUATE
    ↓
VALIDATE
    ↓
DETECT
    ↓
PRIORITIZE
    ↓
REVIEW
    ↓
EXPLAIN
    ↓
RESOLVE
    ↓
LEARN
    ↓
IMPROVE
```

---

# 6. CORE VALUE PROPOSITION

QualityLoop should help an examination authority answer:

1. Are scripts being evaluated completely?
2. Are unusual marking patterns emerging?
3. Which cases deserve moderator attention first?
4. Where are evaluators drifting from agreed exemplars/rubrics?
5. What evidence supports a quality signal?
6. What happened after a moderator reviewed a signal?
7. What did revaluation reveal?
8. How can that learning improve the next evaluation cycle?

---

# 7. PRODUCT PROMISE

QualityLoop promises to provide:

* earlier visibility into evaluation-quality issues
* evidence-backed quality signals
* prioritized moderation
* calibration support
* transparent audit trails
* useful analytical insights
* bounded AI assistance where appropriate
* a feedback loop from moderation/revaluation into future calibration

---

# 8. PRODUCT NON-PROMISES

QualityLoop does **not** promise:

* autonomous grading
* automatic modification of official marks
* perfect handwriting recognition
* automatic malpractice determination
* automatic evaluator punishment
* guaranteed detection of every evaluation error
* replacement of expert academic judgment
* institutionally validated accuracy without real-world validation
* regulatory approval
* production-scale institutional readiness merely because the prototype works

These boundaries are mandatory product principles.

---

# 9. CORE PRODUCT PRINCIPLES

## P-001 — Human Academic Authority

Humans remain responsible for consequential academic decisions.

## P-002 — Detection Is Not Proof

A detected pattern is a signal requiring appropriate interpretation.

```text
Detection ≠ Proof
```

## P-003 — Signal Is Not Decision

```text
Quality Signal ≠ Final Decision
```

## P-004 — AI Recommendation Is Not Human Decision

```text
AI Recommendation ≠ Human Decision
```

## P-005 — Analytics Are Not Ground Truth

```text
Analytics ≠ Ground Truth
```

## P-006 — Demo Data Is Not Real Data

```text
Demo Data ≠ Institutional Data
```

## P-007 — Prediction Is Not Confirmed Outcome

```text
Prediction ≠ Confirmed Outcome
```

## P-008 — Evidence Before Judgment

Important signals must expose meaningful supporting evidence.

## P-009 — Simplest Safe Mechanism

Use:

```text
Deterministic Rules
        ↓
Statistics
        ↓
AI
        ↓
Human Judgment
```

only where each layer provides genuine value.

Do not use an LLM where deterministic logic is sufficient.

## P-010 — One Product, Not Many Mini-Products

Every module must contribute to the same evaluation-quality lifecycle.

---

# 10. PRIMARY USERS

## 10.1 Evaluator / Examiner

Primary needs:

* efficient evaluation workflow
* completeness assistance
* rubric/exemplar guidance
* calibration support
* non-intrusive feedback
* ability to ignore or override assistance
* transparent explanation of AI assistance

Primary job:

> "Help me evaluate efficiently without making the academic decision for me."

---

## 10.2 Moderator / Chief Examiner

Primary needs:

* quality overview
* prioritized review queue
* evidence behind signals
* resolution workflow
* escalation
* calibration insight
* audit history

Primary job:

> "Show me the cases that deserve review and give me enough evidence to investigate them."

---

## 10.3 Controller of Examinations / Examination Authority

Primary needs:

* institution-level overview
* evaluation progress
* quality-risk visibility
* moderation status
* auditability
* cycle-level summaries
* revaluation insights

Primary job:

> "Show me whether the evaluation process is progressing safely and where quality risks are emerging."

---

## 10.4 System Administrator

Primary needs:

* user/role management
* evaluation-cycle configuration
* rubric/exemplar configuration
* threshold/configuration management
* system visibility
* controlled access

Primary job:

> "Configure and operate the evaluation cycle without compromising role boundaries."

---

## 10.5 Student

Student-facing functionality is **not part of the MVP**.

A future transparency/revaluation experience may consume the audit trail, but it must not be implemented as part of the MVP unless explicitly promoted.

---

# 11. CORE PRODUCT WORKFLOW

The authoritative product lifecycle is:

```text
1. CONFIGURE EVALUATION CYCLE
            ↓
2. RECEIVE EVALUATION ACTIVITY
            ↓
3. VALIDATE COMPLETENESS
            ↓
4. PROVIDE EVALUATION ASSISTANCE
            ↓
5. GENERATE QUALITY SIGNALS
            ↓
6. PRIORITIZE REVIEW
            ↓
7. MODERATOR INVESTIGATES
            ↓
8. HUMAN RESOLUTION
            ↓
9. AUDIT
            ↓
10. REVALUATION ANALYSIS
            ↓
11. LEARNING / CALIBRATION
            ↓
12. NEXT EVALUATION CYCLE
```

---

# 12. PRODUCT MODULES

QualityLoop consists conceptually of the following modules.

---

## 12.1 Evaluation Workspace

### Purpose

Provide evaluator-facing context for digital evaluation and quality assistance.

### MVP behavior

The workspace may simulate the underlying OSM evaluation experience.

It does not need to implement a complete production-grade OSM platform.

### Capabilities

* script/question context
* marking state
* completeness state
* rubric access
* exemplar access
* calibration prompts
* evaluation submission

---

# 13. CompleteCheck

## Purpose

Provide deterministic evaluation-completeness validation.

## Detectable conditions

Examples:

* question has no mark
* mark is outside configured range
* total does not equal question-level marks
* required evaluation field is missing
* submitted script is incomplete
* invalid evaluation state

## Product rule

If deterministic logic can reliably detect the issue, AI must not be required.

## Expected behavior

```text
Evaluation
    ↓
CompleteCheck
    ↓
Valid
    OR
Issue detected
    ↓
Evidence shown
    ↓
Evaluator resolves
```

---

# 14. Assistive AI Layer

## Purpose

Provide bounded assistance where contextual/semantic reasoning provides genuine value.

## Potential MVP capabilities

* rubric-grounded answer summary
* criterion/evidence highlighting
* natural-language evaluation summary
* exemplar comparison assistance

Exact enabled capabilities must be explicitly marked in the implementation task.

## AI requirements

AI-generated content must:

* be explicitly labeled
* remain advisory
* expose relevant evidence/context
* be reviewable
* be dismissible/ignorable where appropriate
* never silently modify authoritative marks

## AI may

* summarize
* highlight
* compare
* suggest
* explain
* prioritize
* surface patterns

## AI may not

* finalize official marks
* silently modify marks
* declare an evaluator guilty of malpractice
* trigger punishment
* automatically modify official rubrics
* override an evaluator
* override a moderator
* create an unreviewable decision

---

# 15. QualityPulse

## Purpose

Provide real-time or near-real-time visibility into evaluation quality.

## Required overview

QualityPulse should expose relevant information such as:

* evaluation progress
* scripts evaluated
* open quality signals
* high-priority signals
* resolved signals
* evaluator-level patterns
* question-level patterns
* emerging hotspots

## Product rule

QualityPulse should prioritize decisions over decoration.

Avoid vanity metrics that do not support an evaluation-quality decision.

## Drill-down principle

Important aggregate information should lead to supporting evidence.

```text
QUALITY RISK
     ↓
EVALUATOR GROUP
     ↓
EVALUATOR
     ↓
QUESTION
     ↓
SCRIPTS / EVENTS
     ↓
EVIDENCE
```

---

# 16. SentinelFlag

## Purpose

Generate statistical quality signals.

## Potential signals

* unusually high/low average marks
* deviation from peer group
* distribution shift
* evaluator drift
* question-level unusual patterns
* repeated correction patterns
* emerging quality hotspots

## Product rule

Every signal must contain understandable evidence.

A statistical signal means:

> "This pattern deserves attention."

It does not mean:

> "This evaluator is wrong."

---

# 17. EscalationHub

## Purpose

Provide the prioritized moderation queue.

## Capabilities

Moderators should be able to:

* view signals
* filter signals
* group signals
* prioritize signals
* inspect evidence
* resolve signals
* dismiss signals
* escalate signals
* request calibration
* record resolution reasons

## Queue item information

Where applicable, a queue item should show:

* signal type
* evaluator
* question/area
* affected volume
* evidence
* comparison baseline
* detection time
* current status
* priority rationale

A high-priority queue item must never imply guilt.

---

# 18. CalibrationCoach

## Purpose

Help evaluators remain aligned with approved rubrics and exemplars.

## Capabilities

* exemplar library
* rubric criteria
* reference examples
* periodic calibration prompts
* drift check-ins
* acknowledgement/dismissal

## Product principle

CalibrationCoach should feel like:

> **Support, not surveillance.**

It should not publicly rank or punish evaluators.

---

# 19. TrustLens

## Purpose

Provide transparency, evidence, and auditability.

TrustLens should help answer:

1. Why did this signal appear?
2. What evidence was used?
3. What comparison baseline was used?
4. Who reviewed it?
5. What decision was made?
6. Why was that decision made?
7. What happened afterward?

Potential capabilities:

* signal explanation
* evidence display
* resolution history
* actor information
* timestamps
* audit trail
* audit export where included in scope

---

# 20. RevaluationInsight

## Purpose

Turn revaluation outcomes into learning signals for future evaluation cycles.

## Capabilities

* analyze original vs revised marks
* identify question/topic hotspots
* identify recurring disagreement areas
* identify candidates for exemplar updates
* identify calibration opportunities

## Product boundary

RevaluationInsight may recommend updates.

It must not automatically modify an official rubric or authoritative academic policy.

Human approval is required.

---

# 21. ADMIN / CONFIGURATION

Authorized administrators should be able to configure:

* evaluation cycles
* roles
* rubric/criteria
* exemplars
* thresholds
* synthetic-data controls

Exact configuration permissions belong to the security/domain contracts.

---

# 22. END-TO-END USER FLOWS

## 22.1 Evaluator Flow

```text
Login
  ↓
Select Evaluation Cycle
  ↓
Open Script / Question
  ↓
Evaluate
  ↓
CompleteCheck
  ↓
Optional Rubric / Exemplar Assistance
  ↓
Submit
  ↓
Calibration Feedback if Applicable
```

---

## 22.2 Moderator Flow

```text
Login
  ↓
QualityPulse
  ↓
Open Prioritized Queue
  ↓
Select Signal
  ↓
Inspect Evidence
  ↓
Compare Context
  ↓
Resolve / Dismiss / Escalate
  ↓
Enter Reason
  ↓
Audit Entry Created
```

---

## 22.3 Controller Flow

```text
Login
  ↓
Institution Overview
  ↓
Cycle Progress
  ↓
Quality Signals
  ↓
Open Issues
  ↓
Moderation Status
  ↓
Revaluation Insights
  ↓
Cycle Summary
```

---

## 22.4 Learning Loop

```text
Evaluation
    ↓
Quality Signals
    ↓
Moderation
    ↓
Revaluation
    ↓
Mark-Change Analysis
    ↓
Hotspot Identification
    ↓
Exemplar / Calibration Recommendation
    ↓
Human Confirmation
    ↓
Next Evaluation Cycle
```

---

# 23. MVP BOUNDARY

The MVP must demonstrate one coherent end-to-end product.

## 23.1 MUST HAVE

The MVP must contain:

1. Synthetic/imported evaluation event source
2. Evaluation cycle
3. Basic evaluation state
4. Deterministic completeness validation
5. Quality signal generation
6. Evidence-backed anomaly detection
7. Moderator triage queue
8. Moderator resolution
9. Audit trail
10. QualityPulse dashboard
11. Basic calibration/exemplar workflow
12. Revaluation insight or simulated post-cycle learning
13. Role-based views
14. Reproducible seeded demo scenarios

---

# 24. SHOULD HAVE

If implementation capacity allows:

* AI-generated evidence-grounded summaries
* rubric-grounded semantic assistance
* evaluator drift visualization
* richer revaluation analysis
* configurable thresholds
* audit export

These must not destabilize the MUST_HAVE vertical slice.

---

# 25. NICE TO HAVE

Optional enhancements:

* embedding-based exemplar similarity
* richer natural-language summaries
* responsive mobile examiner interface
* advanced visual analytics
* optional OCR experiment

---

# 26. FUTURE

Explicitly outside the MVP:

* production OSM integrations
* institutional SSO
* real anonymized historical institutional data
* production-validated AI assistance
* multilingual handwriting assistance
* native mobile application
* institution-scale distributed processing
* student transparency layer
* advanced ML anomaly models

---

# 27. DO NOT BUILD

The following must not enter the MVP without an explicit product decision:

* autonomous grading
* automatic mark modification
* automatic malpractice verdicts
* automatic evaluator punishment
* real student PII
* complete scanning infrastructure
* physical answer-script logistics
* university ERP replacement
* black-box risk scores without explanation
* unsupported claims of accuracy
* unsupported claims of regulatory approval
* public/punitive evaluator ranking
* unrelated real-time chat/messaging
* unnecessary microservices
* features added merely to make the demo look more complex

---

# 28. OFFICIAL CHALLENGE TRACEABILITY

| Challenge Capability               | QualityLoop Treatment      |         MVP | Mechanism                 |
| ---------------------------------- | -------------------------- | ----------: | ------------------------- |
| AI-assisted answer evaluation      | Rubric/evidence assistance |      SHOULD | AI + human                |
| Unchecked-answer detection         | CompleteCheck              |        MUST | Deterministic             |
| Marking anomaly detection          | SentinelFlag               |        MUST | Statistics                |
| Examiner performance analytics     | QualityPulse               |        MUST | Analytics                 |
| Smart moderation                   | EscalationHub              |        MUST | Rules + analytics + human |
| Handwriting recognition assistance | OCR experiment             | FUTURE/NICE | AI/CV                     |
| AI-generated evaluation summaries  | Evidence-grounded summary  |      SHOULD | AI                        |
| Real-time evaluation dashboard     | QualityPulse               |        MUST | Analytics                 |
| Unusual scoring patterns           | SentinelFlag               |        MUST | Statistics + human        |
| Faster issue discovery             | Validation + early signals |        MUST | Workflow                  |
| Mobile examiner interface          | Responsive web first       |      FUTURE | Frontend                  |

The official challenge capability list is a coverage map, **not a requirement to build separate products for every capability**.

---

# 29. RULES vs STATISTICS vs AI vs HUMAN

| Capability               | Rules | Statistics |       AI      | Human |
| ------------------------ | :---: | :--------: | :-----------: | :---: |
| Missing mark             |   ✓   |            |               |   ✓   |
| Total mismatch           |   ✓   |            |               |   ✓   |
| Mark-range validation    |   ✓   |            |               |   ✓   |
| Evaluator deviation      |       |      ✓     |    Optional   |   ✓   |
| Evaluator drift          |       |      ✓     |    Optional   |   ✓   |
| Exemplar comparison      |       |            |       ✓       |   ✓   |
| Natural-language summary |       |            |       ✓       |   ✓   |
| Signal prioritization    |   ✓   |      ✓     |    Optional   |   ✓   |
| Signal resolution        |       |            |               |   ✓   |
| Final academic mark      |       |            | Advisory only |   ✓   |
| Rubric change            |       |            |               |   ✓   |
| Revaluation insight      |       |      ✓     |    Optional   |   ✓   |

## Golden Rule

> **Use the simplest mechanism that safely solves the problem.**

---

# 30. HUMAN-IN-THE-LOOP CONTRACT

## AI may

* summarize
* highlight
* compare
* suggest
* explain
* prioritize
* surface patterns

## AI may not

* finalize marks
* silently change marks
* declare malpractice
* punish an evaluator
* change official rubrics automatically
* override human decisions
* create unreviewable decisions

## Statistical systems may

* identify unusual patterns
* generate quality-risk signals
* prioritize review

## Statistical systems may not

* determine intent
* determine misconduct
* automatically penalize anyone
* be presented as ground truth

## Humans own

* final academic marks
* flag resolution
* escalation decisions
* moderation decisions
* official rubric changes
* institutional action

---

# 31. QUALITY SIGNAL CONTRACT

Every quality signal must answer:

1. What happened?
2. Why was it surfaced?
3. What evidence was used?
4. What baseline/comparison was used?
5. What can the reviewer do?
6. What happened after resolution?

Preferred terminology:

* Potential anomaly
* Unusual pattern
* Requires review
* Statistical deviation
* Quality signal

Avoid unsupported labels such as:

* Wrong evaluator
* Cheating detected
* Fraud detected
* AI determined the mark is wrong

unless an independent authoritative process establishes such a fact.

---

# 32. MODERATION RESOLUTION

A moderator may resolve a signal through an approved action such as:

* dismiss
* accept/reviewed
* escalate
* request calibration
* mark as legitimate variation

A resolution must require a reason.

The exact resolution-state model belongs in the domain contract.

---

# 33. AUDIT REQUIREMENTS

Material moderation actions must be traceable.

At minimum, the product should record:

```text
WHO
WHAT
WHEN
WHY
EVIDENCE AVAILABLE
RESULTING DECISION
```

Where applicable, the audit context should also identify:

* evaluation cycle
* evaluator
* script
* question
* signal
* previous state
* resulting state

The event/data contracts define the exact representation.

---

# 34. DATA STRATEGY

## MVP data

The MVP uses synthetic or explicitly permitted public data.

Required synthetic data may include:

* evaluator activity
* scripts/answers
* marks
* rubrics
* exemplars
* seeded anomalies
* simulated revaluation outcomes

## Real data

Real student/evaluator institutional data is **not required for the MVP**.

If real data is introduced later, appropriate:

* authorization
* anonymization
* retention
* access control
* institutional approval
* data-protection requirements

must be addressed.

---

# 35. DEMO DATA PRINCIPLE

All hackathon demo data must be:

* synthetic
* reproducible
* deterministic
* clearly labeled
* disposable/regenerable

The product must never imply that synthetic data represents real institutional results.

---

# 36. SEEDED DEMO SCENARIOS

The MVP must support reproducible scenarios.

## Scenario A — Normal Evaluator

Expected:

```text
No quality flag
```

---

## Scenario B — Unchecked Answer

Condition:

```text
Required answer has no mark.
```

Expected:

* CompleteCheck detects issue
* evidence is shown
* evaluator can correct it

---

## Scenario C — Marking Anomaly

Condition:

```text
Evaluator's marking pattern deviates from peer baseline.
```

Expected:

* statistical signal
* comparison evidence
* moderator review

---

## Scenario D — Evaluator Drift

Condition:

```text
Evaluator behavior changes over time.
```

Expected:

* trend signal
* calibration prompt

---

## Scenario E — Calibration Disagreement

Condition:

```text
Evaluator differs from reference exemplar.
```

Expected:

* exemplar comparison
* evidence shown
* evaluator retains final academic decision

---

## Scenario F — Revaluation Hotspot

Condition:

```text
A question repeatedly changes during revaluation.
```

Expected:

* hotspot identified
* learning recommendation generated

---

## Scenario G — Legitimate False Positive

Condition:

```text
Statistically unusual evaluator behavior is legitimate.
```

Expected:

* moderator dismisses signal
* reason recorded
* no punitive action

This scenario is mandatory because it demonstrates that the system understands the difference between anomaly detection and wrongdoing.

---

# 37. PRODUCT-LEVEL NON-FUNCTIONAL REQUIREMENTS

## NFR-001 — Reliability

The seeded demo must behave deterministically.

## NFR-002 — Explainability

Quality signals must expose human-readable evidence.

## NFR-003 — Responsiveness

At demo scale, dashboard and queue interactions should feel near-real-time.

## NFR-004 — Security

Role boundaries and sensitive configuration must be protected.

## NFR-005 — Privacy

The MVP must not require real student PII.

## NFR-006 — Auditability

Important moderation decisions must be traceable.

## NFR-007 — Maintainability

The product should preserve clear module boundaries.

## NFR-008 — Integration Readiness

The product should have a credible conceptual path to receiving evaluation events from an existing OSM platform.

## NFR-009 — Accessibility

Core information should be readable and usable without excessive visual complexity.

## NFR-010 — AI Transparency

AI-generated output must be visually distinguishable from authoritative institutional data.

---

# 38. SUCCESS METRICS

MVP metrics should measure actual prototype behavior rather than make unsupported real-world claims.

## Operational metrics

Examples:

* time from seeded anomaly to signal
* percentage of seeded anomalies surfaced
* percentage of signals with evidence
* percentage of resolved signals with reasons
* dashboard refresh latency
* calibration interaction completion
* revaluation hotspot detection on seeded data

## Product-quality metrics

Examples:

* false-positive rate on seeded legitimate cases
* explainability completeness
* role-boundary test pass rate
* deterministic demo repeatability
* audit completeness

## Future institutional metrics

Do not claim these are already achieved.

Potential future validation may examine:

* reduction in moderation effort
* earlier anomaly discovery
* evaluation consistency
* revaluation reduction
* calibration effectiveness
* false-positive rates on real institutional data

---

# 39. FEATURE REQUIREMENT IDs

Use stable identifiers.

Recommended product-level identifiers:

```text
PRD-001
PRD-002
PRD-003
...
```

Feature identifiers:

```text
F-001
F-002
F-003
...
```

Functional requirements:

```text
FR-001
FR-002
FR-003
...
```

Non-functional requirements:

```text
NFR-001
NFR-002
NFR-003
...
```

Acceptance criteria:

```text
AC-F001-01
AC-F001-02
...
```

These identifiers should be referenced by:

* architecture
* domain
* API
* data
* events
* tasks
* tests
* demo steps
* traceability records

---

# 40. CORE FUNCTIONAL REQUIREMENTS

## FR-001 — Evaluation Cycle

The system shall allow an authorized user to create or select an evaluation cycle.

## FR-002 — Evaluation Events

The system shall accept or generate evaluation activity events.

## FR-003 — Completeness Validation

The system shall identify deterministic evaluation-completeness problems.

## FR-004 — Quality Signals

The system shall calculate configured quality signals.

## FR-005 — Evidence

Every quality signal shall expose supporting evidence.

## FR-006 — Prioritization

The system shall present quality signals through a moderator-oriented review queue.

## FR-007 — Filtering

Moderators shall be able to filter signals by relevant dimensions such as:

* evaluator
* question
* signal type
* severity/priority
* evaluation cycle
* status

## FR-008 — Resolution

Authorized moderators shall be able to resolve a signal.

## FR-009 — Resolution Reason

Every resolution shall require a reason.

## FR-010 — Audit

The system shall record material moderation actions.

## FR-011 — Quality Dashboard

The system shall provide real-time or near-real-time evaluation-quality visibility at demo scale.

## FR-012 — Calibration

The system shall provide approved exemplar/rubric reference material.

## FR-013 — Drift

The system should support evaluator drift signals or calibration check-ins.

## FR-014 — Revaluation

The system should analyze simulated revaluation outcomes.

## FR-015 — Learning

The system should identify candidates for exemplar/calibration updates.

## FR-016 — AI Assistance

Where enabled, AI assistance shall be explicitly labeled and non-authoritative.

## FR-017 — Role Boundaries

Users shall only access capabilities permitted by their role.

## FR-018 — Synthetic Data

The system shall support deterministic demo-data generation.

---

# 41. FEATURE ACCEPTANCE TEMPLATE

Every major feature should be documented using:

```text
Feature ID:

Feature Name:

Problem:
Why does this feature exist?

Actor:
Who uses it?

Preconditions:
What must already be true?

Trigger:
What starts the workflow?

Main Flow:
What should happen?

Alternative Flows:
What other valid situations exist?

Failure Flows:
What can go wrong?

Authorization:
Who is allowed?

Data:
What information is created or changed?

Audit:
What must be recorded?

Acceptance Criteria:
What proves the feature works?

Out of Scope:
What must not be implemented?
```

---

# 42. TRACEABILITY

Every major requirement should follow:

```text
Official Problem
      ↓
Product Goal
      ↓
Capability
      ↓
Feature
      ↓
User Story
      ↓
Acceptance Criteria
      ↓
Implementation Task
      ↓
Technical Contract
      ↓
Code
      ↓
Test
      ↓
Demo Evidence
```

The operational mapping should be maintained in:

```text
docs/13-traceability.md
```

This document defines the product requirements; `13-traceability.md` connects them to implementation artifacts.

---

# 43. PRODUCT CHANGE CONTROL

Approved product behavior must not be silently changed during implementation.

A significant change must follow:

```text
Existing Requirement
        ↓
Proposed Change
        ↓
Reason
        ↓
Impact Analysis
        ↓
Human Decision
        ↓
Update Product Contract
        ↓
Update Dependent Contracts
        ↓
Update Tasks / Tests / Demo
```

Potentially affected documents include:

* architecture
* domain
* API
* events
* data
* AI
* security
* testing
* demo
* build plan
* traceability

---

# 44. SCOPE CONTROL FOR AI AGENTS

If an AI coding agent discovers a useful feature that is not in this contract:

```text
Do NOT implement automatically.
```

Instead:

```text
Identify opportunity
       ↓
Check current product scope
       ↓
Determine whether required
       ↓
If not required:
Create proposal / separate task
       ↓
Await approval
```

The agent must not convert an adjacent idea into product scope.

---

# 45. PRODUCT DECISION RULE

When product behavior is ambiguous, use:

```text
1. Official challenge requirements
2. Approved Product Contract
3. Explicit human product decision
4. Recorded product decisions / ADRs
5. Existing implementation only where it does not contradict the above
```

Do not resolve significant product ambiguity through guesswork.

For minor implementation details that do not alter product behavior, the implementation agent may choose a reasonable solution consistent with the architecture and existing conventions.

---

# 46. PRODUCT VS TECHNICAL AUTHORITY

This document answers:

> **WHAT should QualityLoop do?**

It does not answer:

> **HOW should the code implement it?**

Example:

### Product

> Moderators can resolve a quality signal with a reason.

### Domain

> What states and transitions represent signal resolution?

### API

> What endpoint/request/response represents resolution?

### Data

> How is the resolution persisted?

### Event

> What event represents the resolution?

### Architecture

> Which component handles it?

### Testing

> How is the behavior verified?

Each answer belongs to its appropriate contract.

---

# 47. AGENT PRODUCT-WORKFLOW RULE

When implementing a product task, an AI coding agent should:

1. Identify the relevant `PRD-*`, `F-*`, or `FR-*` requirement.
2. Identify the acceptance criteria.
3. Read the relevant domain contract.
4. Read the relevant technical contracts.
5. Inspect the existing repository before modifying it.
6. Implement only the approved behavior.
7. Preserve product invariants.
8. Handle expected failure paths.
9. Respect role boundaries.
10. Respect AI/human authority boundaries.
11. Add/update tests.
12. Verify acceptance criteria.
13. Update traceability where required.
14. Update project state where required.
15. Report exactly what changed and what was verified.
16. Stop.

---

# 48. PRODUCT ACCEPTANCE GATE

Before the product contract is considered implementation-ready:

## Product

* [x] Product direction is selected.
* [x] One coherent product story exists.
* [x] Primary users are defined.
* [x] Core problem is defined.
* [x] End-to-end lifecycle is defined.

## Scope

* [x] MUST_HAVE scope is defined.
* [x] SHOULD_HAVE scope is separated.
* [x] NICE_TO_HAVE scope is separated.
* [x] FUTURE scope is separated.
* [x] DO NOT BUILD boundaries are explicit.

## AI / Analytics

* [x] AI responsibilities are defined.
* [x] Rules responsibilities are defined.
* [x] Statistical responsibilities are defined.
* [x] Human authority is explicit.
* [x] Explainability is required.

## Trust

* [x] False-positive scenario exists.
* [x] Human override exists.
* [x] Resolution reasons are required.
* [x] Automatic punitive action is prohibited.

## Data

* [x] Synthetic MVP data strategy is defined.
* [x] Real PII is excluded from MVP.
* [x] Demo data is explicitly distinguishable from real data.

## Demo

* [x] Seeded scenarios are defined.
* [x] Core workflow is deterministic.
* [x] End-to-end demo story exists.

## Architecture Readiness

* [x] Product requirements are sufficiently precise for architecture.
* [x] Detailed technical implementation is not embedded here.
* [x] Technology stack is not locked by this document.

---

# 49. MVP DEMO STORY

The core 5–7 minute product story is:

```text
1. Explain evaluation-quality problem
          ↓
2. Start simulated evaluation cycle
          ↓
3. Evaluator evaluates scripts
          ↓
4. CompleteCheck catches incomplete evaluation
          ↓
5. QualityPulse shows quality state
          ↓
6. SentinelFlag detects unusual marking pattern
          ↓
7. EscalationHub prioritizes the case
          ↓
8. Moderator opens evidence
          ↓
9. Moderator resolves signal with reason
          ↓
10. TrustLens shows audit trail
          ↓
11. RevaluationInsight identifies hotspot
          ↓
12. CalibrationCoach closes the learning loop
```

The demo must make clear:

* what problem exists
* who experiences it
* what QualityLoop changes
* where deterministic rules are used
* where statistics are used
* where AI is used
* where humans remain responsible
* how the system can eventually integrate with real OSM infrastructure

---

# 50. PRODUCT SUCCESS MODEL

QualityLoop succeeds when the MVP demonstrates:

```text
REAL PROBLEM
      +
CLEAR USERS
      +
ONE COHERENT WORKFLOW
      +
MEANINGFUL QUALITY INTELLIGENCE
      +
USEFUL AI WHERE JUSTIFIED
      +
HUMAN AUTHORITY
      +
EXPLAINABLE SIGNALS
      +
AUDITABILITY
      +
REPRODUCIBLE DEMO
      +
CREDIBLE PRODUCTION PATH
```

The product should not be evaluated by feature count.

It should be evaluated by whether the integrated workflow convincingly demonstrates the intended problem-solving capability.

---

# 51. PRODUCT INVARIANTS

The following must remain true unless explicitly changed through a documented product decision:

### INV-001

AI cannot silently become the final academic authority.

### INV-002

Statistical anomalies cannot automatically become accusations.

### INV-003

Quality signals require evidence.

### INV-004

Moderator resolutions require reasons.

### INV-005

Material moderation actions are auditable.

### INV-006

Real student PII is not required for the MVP.

### INV-007

Synthetic demo data must be identifiable as synthetic.

### INV-008

Official rubrics cannot be automatically modified by AI.

### INV-009

Official marks cannot be silently modified by AI.

### INV-010

A legitimate false-positive case must be resolvable without punitive action.

### INV-011

The MVP must remain a coherent quality-control product rather than becoming a collection of unrelated AI features.

### INV-012

The system must retain a credible human-review path even when AI assistance is unavailable.

---

# 52. CURRENT PRODUCT STATUS

This section records stable product facts, not implementation progress.

## Product

**QualityLoop**

## Product Direction

**Direction C — End-to-End OSM Intelligence Ecosystem**

## Product Positioning

**AI + analytics intelligence layer around digital evaluation / OSM**

## MVP Data

Synthetic / reproducible demo data

## Human Authority

Required for consequential academic decisions

## Current Product Lifecycle

```text
Evaluation
   ↓
Validation
   ↓
Quality Signals
   ↓
Prioritization
   ↓
Moderation
   ↓
Audit
   ↓
Revaluation
   ↓
Calibration
   ↓
Next Cycle
```

Detailed implementation progress belongs in:

```text
docs/12-project-state.md
```

---

# 53. RELATIONSHIP TO OTHER PROJECT DOCUMENTS

| Document                      | Answers                                               |
| ----------------------------- | ----------------------------------------------------- |
| `AGENTS.md`                   | How must the coding agent behave?                     |
| `00-project-context.md`       | What project are we building?                         |
| `01-product-contract.md`      | What must QualityLoop do?                             |
| `02-architecture-contract.md` | How is the system structured?                         |
| `03-build-plan.md`            | What should be built and in what order?               |
| `04-domain-contract.md`       | What do the domain entities/states mean?              |
| `05-api-contract.md`          | How do components communicate?                        |
| `06-event-contract.md`        | What events exist?                                    |
| `07-data-contract.md`         | What data is authoritative and how is it represented? |
| `08-ai-contract.md`           | How may AI behave?                                    |
| `09-testing-contract.md`      | How do we prove it works?                             |
| `10-demo-contract.md`         | How do we demonstrate it?                             |
| `11-security-contract.md`     | What security rules apply?                            |
| `12-project-state.md`         | What is actually true right now?                      |
| `13-traceability.md`          | Why does each implementation artifact exist?          |
| `tasks/*`                     | What exactly should the agent do now?                 |
| `decisions/ADR-*`             | Why was an important decision made?                   |

---

# 54. FINAL PRODUCT CONTRACT PRINCIPLES

> **QualityLoop is an intelligence layer around OSM, not an OSM replacement.**

> **Build one integrated quality-control lifecycle, not disconnected AI features.**

> **Use deterministic rules when rules are sufficient.**

> **Use statistics for patterns and anomalies.**

> **Use AI for contextual/semantic assistance where it genuinely adds value.**

> **Keep humans responsible for consequential academic decisions.**

> **Every important quality signal must have evidence.**

> **A signal is not proof.**

> **An anomaly is not misconduct.**

> **An AI recommendation is not a human decision.**

> **A dashboard is valuable only when it helps someone make a better review decision.**

> **A demo must be deterministic and honest about simulated behavior.**

> **Real institutional data is not required to prove the MVP concept.**

> **No feature enters the MVP merely because it sounds impressive.**

> **Every significant feature must trace back to the problem and forward to acceptance criteria, implementation, tests, and demo evidence.**

---

# END OF PRODUCT CONTRACT
