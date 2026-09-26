# STEP 3 — Product Requirements Document (PRD) Master
## End-to-End OSM Intelligence Ecosystem
### AI + Analytics for On-Screen Marking and Digital Evaluation

**Working product name:** QualityLoop  
**Selected product direction:** Direction C — End-to-End OSM Intelligence Ecosystem  
**Stage:** Step 3 — Product Definition & PRD  
**Status:** Master PRD specification  
**Input:** Step 0 Problem Deconstruction + Step 1 Research & Validation + Step 2 Solution Ideation & Product Strategy  
**Next stage:** Step 4 — Architecture  
**Primary principle:** Define WHAT the product must do; do not prematurely lock HOW it will be implemented.

---

# 0. PRD OPERATING INSTRUCTIONS

This document is the authoritative product-definition framework for Step 3.

It must be treated as the bridge between the selected product direction and architecture/build planning.

## 0.1 Product decision already made

The selected direction is:

> **Direction C — End-to-End OSM Intelligence Ecosystem**

This is the **product vision**, not permission to build every possible OSM feature.

The MVP must be a coherent vertical slice of that ecosystem.

## 0.2 Composition principle

The product should combine the strongest, evidence-compatible capabilities from the ideation space:

- Evaluation workflow support
- Answer/mark validation
- AI-assisted evaluation support where justified
- Statistical quality intelligence
- Smart moderation
- Real-time quality visibility
- Auditability and explainability
- Calibration
- Revaluation-driven learning

These are components of one lifecycle, not separate mini-products.

## 0.3 Critical product boundary

QualityLoop is primarily an **AI + analytics intelligence layer for digital evaluation**.

It may simulate an upstream OSM system for the hackathon.

It does not need to replace mature infrastructure for:

- physical answer-script logistics
- scanning infrastructure
- identity systems
- university ERP/SIS
- full OSM infrastructure
- result publication infrastructure

## 0.4 Evidence discipline

The PRD must distinguish:

- Research-backed fact
- Product requirement
- Product assumption
- Prototype behavior
- Simulated behavior
- Future production capability

Never turn a prototype assumption into a claim of real-world validation.

---

# 1. PRODUCT EXECUTIVE SUMMARY

## 1.1 Product proposition

QualityLoop is a digital-evaluation intelligence ecosystem that sits alongside an existing OSM workflow and helps examiners and examination authorities evaluate more consistently, detect quality risks earlier, prioritize moderation, explain decisions, and learn from revaluation outcomes.

## 1.2 Core value proposition

> **Evaluate → Validate → Detect → Prioritize → Review → Explain → Learn → Improve**

The product should move examination quality assurance from a primarily retrospective process toward a more continuous, evidence-backed workflow.

## 1.3 Problem statement

Large-scale digital evaluation creates large volumes of examiner activity and marks. Humans remain responsible for academic judgment, but examination authorities need better mechanisms to identify:

- incomplete evaluation
- unusual marking patterns
- evaluator drift
- calibration disagreements
- emerging quality hotspots
- cases requiring moderation

before problems propagate into result processing or revaluation.

## 1.4 Product promise

QualityLoop should help an institution answer:

1. Are scripts being evaluated completely?
2. Are there unusual marking patterns requiring human review?
3. Which cases deserve moderator attention first?
4. Where are evaluators drifting from agreed exemplars/rubrics?
5. What evidence supports a quality flag?
6. What happened after a moderator reviewed the flag?
7. What did revaluation reveal?
8. How can that learning improve the next evaluation cycle?

## 1.5 Non-promise

QualityLoop does **not** promise:

- autonomous grading
- perfect handwriting recognition
- automatic malpractice determination
- automatic evaluator punishment
- guaranteed detection of every error
- replacement of expert academic judgment
- real-world institutional accuracy without validation

---

# 2. RESEARCH FOUNDATION

Step 1 established the following relevant product facts:

1. OSM infrastructure already exists commercially.
2. Existing systems are strong in workflow, digitization, security, allocation, audit and throughput monitoring.
3. The research did not find documented widespread shipped AI-assisted subjective marking or AI-based quality intelligence in the identified Indian OSM vendor landscape.
4. Quality visibility appears less developed than throughput visibility.
5. Human examiner inconsistency is a longstanding issue.
6. AI grading is promising but not sufficiently reliable to replace human judgment.
7. Indic handwriting recognition remains technically difficult.
8. Real examination data is privacy-sensitive and not assumed available.
9. Trust, auditability and explainability are important.
10. A hackathon prototype should therefore use synthetic/public data and human-in-the-loop design.

**Product consequence:**

> Build an intelligence and quality layer around OSM rather than pretending to reinvent OSM itself.

---

# 3. PRODUCT VISION

## 3.1 Vision

Create a scalable digital evaluation ecosystem in which every stage of evaluation produces useful quality signals, human reviewers receive prioritized evidence rather than raw alerts, and outcomes from moderation and revaluation improve future evaluation.

## 3.2 Target lifecycle

```text
EXISTING / SIMULATED OSM
        ↓
EVALUATION WORKFLOW
        ↓
ANSWER + MARK VALIDATION
        ↓
AI / ANALYTICS ASSISTANCE
        ↓
QUALITY SIGNALS
        ↓
SMART PRIORITIZATION
        ↓
MODERATOR REVIEW
        ↓
EXPLAINABLE RESOLUTION + AUDIT
        ↓
REVALUATION INSIGHT
        ↓
CALIBRATION / EXEMPLAR UPDATE
        ↓
NEXT EVALUATION CYCLE
```

## 3.3 Product identity

QualityLoop should feel like:

> **An intelligent quality-control layer for digital examination evaluation.**

It should not feel like:

> “A dashboard containing many unrelated AI features.”

---

# 4. USERS AND STAKEHOLDERS

## 4.1 Primary users

### A. Evaluator / Examiner

Needs:

- clear evaluation workflow
- completeness assistance
- rubric/exemplar guidance
- non-intrusive calibration support
- ability to ignore or override assistance
- transparent explanation of any AI suggestion

### B. Moderator / Chief Examiner

Needs:

- real-time quality visibility
- prioritized review queue
- evidence behind every flag
- ability to resolve, dismiss or escalate
- calibration insight
- audit history

### C. Controller of Examinations / Examination Authority

Needs:

- institution-level quality overview
- evaluation progress and risk visibility
- moderation status
- auditability
- cycle-level summaries
- revaluation insights

### D. System Administrator

Needs:

- user/role management
- cycle configuration
- rubric/exemplar configuration
- system health visibility
- controlled access

## 4.2 Secondary stakeholder

### Student

For MVP:

- no direct student-facing application is required.

Future:

- transparent, privacy-preserving result/revaluation status and evidence layer may consume the same audit trail.

---

# 5. JOBS-TO-BE-DONE

## Evaluator

> “Help me evaluate efficiently without making the academic decision for me.”

## Moderator

> “Show me the cases most likely to deserve review and give me enough evidence to investigate them.”

## Controller

> “Show me whether the evaluation process is progressing safely and where quality risks are emerging.”

## Administrator

> “Configure and operate the evaluation cycle without compromising role boundaries.”

## Institution

> “Create a defensible, auditable and continuously improving digital evaluation process.”

---

# 6. END-TO-END PRODUCT WORKFLOW

## Stage 1 — Configure evaluation cycle

Inputs:

- examination
- subject
- questions
- rubric/criteria
- evaluator groups
- moderation policy
- reference exemplars

Output:

- active evaluation cycle

## Stage 2 — Receive evaluation activity

MVP:

- synthetic OSM events

Production concept:

- events from an existing OSM platform

Examples:

- script assigned
- answer viewed
- question marked
- total updated
- script submitted
- revaluation completed

## Stage 3 — Validate evaluation

Deterministic checks identify:

- missing marks
- incomplete questions
- total mismatch
- required fields not completed
- inconsistent state transitions

## Stage 4 — Assist evaluation

Where appropriate:

- rubric reminders
- exemplar references
- answer summaries
- evidence-linked assistance

AI remains advisory.

## Stage 5 — Generate quality signals

Analytics may identify:

- evaluator deviation
- unusual score distributions
- drift
- question-level anomalies
- repeated correction patterns
- emerging revaluation hotspots

## Stage 6 — Prioritize review

The system groups and prioritizes signals using transparent evidence.

The output is:

> “Requires review”

not:

> “Evaluator is wrong.”

## Stage 7 — Moderator investigates

Moderator sees:

- issue type
- evidence
- comparison group
- affected scripts/questions
- historical context
- relevant exemplar/rubric
- previous resolutions

## Stage 8 — Moderator resolves

Allowed actions:

- dismiss
- accept/reviewed
- escalate
- request calibration
- mark as legitimate variation

A reason is required.

## Stage 9 — Audit

Record:

- who acted
- what was reviewed
- evidence available
- decision
- reason
- timestamp
- related cycle/script/evaluator

## Stage 10 — Revaluation analysis

After a cycle:

- identify questions/topics with meaningful mark changes
- compare original vs revised marks
- identify recurring disagreement areas

## Stage 11 — Learning loop

Potential actions:

- update exemplar library
- add calibration material
- revise rubric guidance
- identify areas for evaluator discussion

The system must not automatically alter an official rubric without authorized human action.

---

# 7. PRODUCT MODULES

## 7.1 Evaluation Workspace

Purpose:

Provide the evaluator-facing context in which quality assistance can appear.

MVP may simulate the underlying OSM evaluation event rather than implementing a full production-grade OSM viewer.

Capabilities:

- script/question context
- marking state
- completeness state
- rubric/exemplar access
- calibration prompts

## 7.2 CompleteCheck

Deterministic evaluation completeness validation.

Examples:

- question has no mark
- mark outside configured range
- total does not equal question-level marks
- submitted script has incomplete required fields

## 7.3 Assistive AI Layer

Optional, carefully bounded assistance.

Potential capabilities:

- rubric-grounded answer summary
- criterion/evidence highlighting
- natural-language evaluation summary
- exemplar comparison assistance

Rules:

- no authoritative AI score
- no hidden recommendation
- evaluator can ignore assistance
- generated content is labeled
- evidence/context is shown
- human remains final authority

## 7.4 QualityPulse

Real-time quality dashboard.

Should show:

- scripts evaluated
- evaluation progress
- open quality signals
- resolved signals
- evaluator-level patterns
- question-level patterns
- emerging hotspots

Avoid vanity metrics.

## 7.5 SentinelFlag

Statistical quality-signal engine.

Potential signals:

- unusually high/low average marks
- deviation from peer group
- distribution shift
- sudden evaluator drift
- question-level unusual patterns

Every signal must include evidence.

## 7.6 EscalationHub

Prioritized moderation queue.

Capabilities:

- filter
- group
- prioritize
- inspect
- resolve
- escalate
- record reason

## 7.7 CalibrationCoach

Evaluator calibration layer.

Capabilities:

- exemplar library
- rubric criteria
- periodic reference examples
- drift check-in
- acknowledgement/dismissal

It should feel like support, not surveillance.

## 7.8 TrustLens

Evidence and audit layer.

Capabilities:

- why a signal appeared
- evidence used
- who reviewed it
- resolution history
- audit export

## 7.9 RevaluationInsight

Post-cycle learning module.

Capabilities:

- mark-change analysis
- question/topic hotspots
- recurring disagreement patterns
- exemplar update suggestions

## 7.10 Admin / Configuration

Capabilities:

- cycle management
- role management
- rubric/exemplar configuration
- threshold configuration
- synthetic-data controls

---

# 8. MVP PRODUCT BOUNDARY

## 8.1 MUST HAVE

The first complete vertical slice must contain:

1. Synthetic/imported evaluation event source
2. Evaluation cycle
3. Basic evaluation state
4. Deterministic completeness validation
5. Quality signal generation
6. Evidence-backed anomaly detection
7. Moderator triage queue
8. Moderator resolution
9. Audit trail
10. Real-time quality dashboard
11. Basic calibration/exemplar workflow
12. Revaluation insight or simulated post-cycle learning
13. Role-based views
14. Seeded demo scenarios

## 8.2 SHOULD HAVE

- Assistive AI-generated summary
- rubric-grounded semantic assistance
- evaluator drift visualization
- richer revaluation analysis
- configurable thresholds
- audit export

## 8.3 NICE TO HAVE

- embedding-based exemplar similarity
- richer natural-language summaries
- responsive mobile examiner interface
- advanced visual analytics
- optional OCR experiment

## 8.4 FUTURE

- production OSM integrations
- institution SSO
- real anonymized historical data
- validated AI assistance
- multi-language handwriting assistance
- native mobile application
- institution-scale distributed processing
- student transparency layer
- advanced ML anomaly models

---

# 9. OFFICIAL CHALLENGE TRACEABILITY

| Challenge capability | Product treatment | MVP status | Mechanism |
|---|---|---|---|
| AI-assisted answer evaluation | Rubric/evidence assistance | Should | AI + human |
| Unchecked-answer detection | CompleteCheck | Must | Deterministic |
| Marking anomaly detection | SentinelFlag | Must | Statistics |
| Examiner performance analytics | QualityPulse | Must | Analytics |
| Smart moderation | EscalationHub | Must | Rules + analytics + human |
| Handwriting recognition assistance | Optional OCR prototype | Future/Nice | AI/CV |
| AI-generated evaluation summaries | Evidence-grounded summary | Should | AI |
| Real-time evaluation dashboard | QualityPulse | Must | Analytics |
| Malpractice/unusual scoring patterns | Unusual-pattern signals only | Must | Statistics + human review |
| Faster result processing | Earlier issue discovery + validation | Must | Workflow |
| Mobile examiner interface | Responsive web first | Future | Frontend |

**Important:** The product does not need to implement every listed feature in the MVP. The official list is a capability space, not a demand to create eleven disconnected products.

---

# 10. AI VS RULES VS STATISTICS VS HUMAN

| Capability | Rules | Statistics | AI | Human |
|---|---:|---:|---:|---:|
| Missing answer mark | ✓ | | | ✓ |
| Total mismatch | ✓ | | | ✓ |
| Mark range validation | ✓ | | | ✓ |
| Evaluator deviation | | ✓ | Optional | ✓ |
| Evaluator drift | | ✓ | Optional | ✓ |
| Exemplar comparison | | | ✓ | ✓ |
| Natural-language summary | | | ✓ | ✓ |
| Flag prioritization | ✓ | ✓ | Optional | ✓ |
| Flag resolution | | | | ✓ |
| Final academic mark | | | Optional assistance only | ✓ |
| Rubric change | | | | ✓ |
| Revaluation insight | | ✓ | Optional summary | ✓ |

## Golden rule

> Use the simplest mechanism that safely solves the problem.

Do not use an LLM where a deterministic rule is sufficient.

---

# 11. HUMAN-IN-THE-LOOP CONTRACT

## AI MAY

- summarize
- highlight
- compare
- suggest
- explain
- prioritize
- surface patterns

## AI MAY NOT

- finalize marks
- silently modify marks
- declare an evaluator guilty of malpractice
- trigger punishment
- automatically change official rubrics
- override an evaluator or moderator
- create an unreviewable decision

## Statistical system MAY

- identify unusual patterns
- generate quality-risk signals
- prioritize review

## Statistical system MAY NOT

- determine intent
- determine misconduct
- automatically penalize anyone
- be presented as ground truth

## Human authority

Humans own:

- final marks
- flag resolution
- escalation decisions
- moderation
- official rubric changes
- institutional action

---

# 12. TRUST, SAFETY AND EXPLAINABILITY

Every signal should answer:

1. What happened?
2. Why did the system surface it?
3. What evidence was used?
4. What comparison baseline was used?
5. What can the reviewer do?
6. What happens after resolution?

Preferred language:

- Potential anomaly
- Unusual pattern
- Requires review
- Statistical deviation
- Quality signal

Avoid:

- Wrong evaluator
- Cheating detected
- Fraud detected
- AI has determined the mark is wrong

unless a separate authoritative process establishes that fact.

---

# 13. DATA STRATEGY

## 13.1 MVP data

Use:

- generated evaluator activity
- generated scripts/answers
- generated marks
- generated rubrics
- generated exemplars
- seeded anomalies
- synthetic revaluation outcomes

## 13.2 Public data

Optional:

- public essay datasets
- public rubric examples
- public academic OCR datasets

Every external dataset must be labeled accurately.

## 13.3 Real data

Not required for MVP.

If used later:

- anonymization
- authorization
- retention controls
- access control
- institutional approval
- applicable data-protection requirements

must be addressed.

---

# 14. SEEDED DEMO SCENARIOS

The demo dataset must support reproducible scenarios.

### Scenario A — Normal evaluator

No quality flag.

### Scenario B — Unchecked answer

One required answer is missing a mark.

Expected:

- deterministic flag
- visible evidence
- evaluator can correct it

### Scenario C — Marking anomaly

Evaluator's pattern deviates from peer baseline.

Expected:

- statistical signal
- evidence comparison
- moderator review

### Scenario D — Evaluator drift

Evaluator behavior changes over time.

Expected:

- trend signal
- calibration prompt

### Scenario E — Calibration disagreement

Evaluator differs from reference exemplar.

Expected:

- exemplar comparison
- evaluator retains final decision

### Scenario F — Revaluation hotspot

A question repeatedly changes during revaluation.

Expected:

- hotspot identified
- learning recommendation

### Scenario G — Legitimate false positive

A statistically unusual evaluator is actually legitimate.

Expected:

- moderator dismisses
- reason recorded
- no punitive action

---

# 15. DEMO-FIRST PRODUCT STORY

## 5–7 minute story

```text
1. Explain the evaluation problem
        ↓
2. Start a simulated evaluation cycle
        ↓
3. Evaluator marks scripts
        ↓
4. System catches an incomplete evaluation
        ↓
5. QualityPulse shows live quality state
        ↓
6. SentinelFlag detects unusual marking behavior
        ↓
7. EscalationHub prioritizes the case
        ↓
8. Moderator opens evidence
        ↓
9. Moderator resolves the flag with a reason
        ↓
10. TrustLens shows the audit trail
        ↓
11. RevaluationInsight identifies a hotspot
        ↓
12. CalibrationCoach updates the learning loop
```

## Judge should understand

Within minutes:

- what problem exists
- who experiences it
- what QualityLoop changes
- where AI is used
- where analytics are used
- where deterministic checks are used
- where humans remain responsible
- how the product scales

---

# 16. PRIMARY USER FLOWS

## Flow A — Evaluator

```text
Login
↓
Select evaluation cycle
↓
Open script/question
↓
Evaluate
↓
Completeness check
↓
Optional rubric/exemplar assistance
↓
Submit
↓
Calibration feedback if applicable
```

## Flow B — Moderator

```text
Login
↓
QualityPulse
↓
Open prioritized queue
↓
Select flag
↓
Inspect evidence
↓
Compare context
↓
Resolve / escalate / dismiss
↓
Enter reason
↓
Audit entry created
```

## Flow C — Controller

```text
Login
↓
Institution overview
↓
Cycle progress
↓
Quality signals
↓
Open issues
↓
Moderation status
↓
Revaluation insights
↓
Cycle summary
```

## Flow D — Learning loop

```text
Evaluation
↓
Moderation
↓
Revaluation
↓
Mark-change analysis
↓
Hotspot identified
↓
Exemplar/rubric guidance update
↓
Next cycle calibration
```

---

# 17. FUNCTIONAL REQUIREMENTS

## FR-001 — Evaluation Cycle

The system shall allow an authorized user to create/select an evaluation cycle.

## FR-002 — Evaluation Events

The system shall accept or generate evaluation activity events.

## FR-003 — Completeness Validation

The system shall identify deterministic evaluation-completeness problems.

## FR-004 — Quality Signals

The system shall calculate configured quality signals.

## FR-005 — Evidence

Every quality signal shall expose the evidence supporting it.

## FR-006 — Prioritization

The system shall present quality signals in a moderator-oriented review queue.

## FR-007 — Filtering

Moderators shall filter signals by relevant dimensions such as evaluator, question, severity/type and cycle.

## FR-008 — Resolution

Authorized moderators shall resolve a signal.

## FR-009 — Resolution Reason

A resolution shall require a reason.

## FR-010 — Audit

The system shall record material moderation actions.

## FR-011 — Dashboard

The system shall provide real-time or near-real-time evaluation quality visibility.

## FR-012 — Calibration

The system shall provide exemplar/rubric reference material.

## FR-013 — Drift

The system should support evaluator drift signals or check-ins.

## FR-014 — Revaluation

The system should analyze simulated revaluation outcomes.

## FR-015 — Learning

The system should identify candidates for exemplar/calibration updates.

## FR-016 — AI Assistance

Where enabled, AI assistance shall be explicitly labeled and non-authoritative.

## FR-017 — Role Boundaries

Users shall only access functions permitted by their role.

## FR-018 — Synthetic Data

The system shall support deterministic demo-data generation.

---

# 18. NON-FUNCTIONAL REQUIREMENTS

## NFR-001 — Reliability

The seeded demo must behave deterministically.

## NFR-002 — Explainability

Quality signals must provide human-readable evidence.

## NFR-003 — Performance

At demo scale, dashboard and queue interactions should feel near-real-time.

## NFR-004 — Security

Role boundaries and sensitive configuration must be protected.

## NFR-005 — Privacy

MVP must not require real student PII.

## NFR-006 — Auditability

Important decisions must be traceable.

## NFR-007 — Maintainability

The product should have clear module boundaries.

## NFR-008 — Scalability

The product must have a credible integration path with existing OSM platforms.

## NFR-009 — Accessibility

Core information should be readable and usable without excessive visual complexity.

## NFR-010 — AI transparency

AI-generated output must be distinguishable from authoritative institutional data.

---

# 19. DASHBOARD REQUIREMENTS

QualityPulse should prioritize decisions over decoration.

## Required overview

- Evaluation progress
- Scripts evaluated
- Open quality signals
- Critical/review-priority signals
- Resolved signals
- Evaluator distribution
- Question-level hotspots
- Trend over time

## Required drill-down

Every important aggregate should lead to supporting evidence.

Example:

```text
Quality Risk ↑
     ↓
Evaluator Group
     ↓
Evaluator
     ↓
Question
     ↓
Scripts / Events
     ↓
Evidence
```

---

# 20. MODERATION QUEUE REQUIREMENTS

Each queue item should show:

- signal type
- evaluator
- question/area
- affected volume
- evidence
- comparison baseline
- time detected
- current status
- priority rationale

Actions:

- Review
- Dismiss
- Resolve
- Escalate
- Request calibration

No queue item should imply guilt merely because it has high priority.

---

# 21. EXPLAINABILITY REQUIREMENTS

For statistical anomaly:

```text
Potential anomaly
Why surfaced:
Evaluator average = X
Peer-group average = Y
Deviation = Z
Sample size = N
Observed period = T
Related questions = ...
```

For completeness issue:

```text
Incomplete evaluation
Question = Q7
Expected mark = required
Recorded mark = missing
Action = review before submission
```

For calibration:

```text
Reference criterion:
...
Evaluator response:
...
Difference:
...
Action:
Review exemplar / continue
```

---

# 22. SUCCESS METRICS

Metrics must measure product behavior, not invent unsupported claims.

## MVP operational metrics

- time from seeded anomaly occurrence to flag
- percentage of seeded anomalies surfaced
- percentage of flags with evidence
- percentage of resolved flags with reasons
- dashboard refresh latency
- calibration interaction completion
- revaluation hotspot identification accuracy on seeded data

## Product-quality metrics

- false-positive rate on seeded legitimate cases
- explainability completeness
- role-boundary test pass rate
- deterministic demo repeatability
- audit completeness

## Institutional metrics for future validation

Do not claim these are already improved.

Potential future measures:

- time-to-detect quality issue
- moderation workload
- time-to-result
- correction/revaluation rate
- inter-evaluator variance
- revaluation mark-change frequency
- evaluator calibration consistency

---

# 23. IMPACT FRAMEWORK

## Transparency

Mechanisms:

- evidence-backed flags
- audit trail
- visible resolutions
- traceable actions

## Consistency

Mechanisms:

- calibration
- exemplars
- drift visibility
- quality signals

## Speed

Mechanisms:

- early detection
- automated completeness checks
- prioritized moderation
- reduced downstream discovery

## Quality

Mechanisms:

- validation
- anomaly detection
- moderation
- revaluation feedback

## Scalability

Mechanisms:

- integration layer
- configurable rules
- reusable analytics
- role-based workflows
- cycle-based processing

---

# 24. DIFFERENTIATION

QualityLoop should differentiate through the **combination and closed loop**:

```text
Evaluation
+
Quality Intelligence
+
Smart Moderation
+
Explainability
+
Calibration
+
Revaluation Learning
```

The product should not claim that digital evaluation itself is novel.

The differentiation story is:

> Existing OSM infrastructure digitizes evaluation; QualityLoop adds an intelligence and quality-control layer that continuously turns evaluation activity into evidence, review priorities and learning.

This claim must remain bounded by the Step 1 research evidence.

---

# 25. HANDWRITING OCR DECISION

Handwriting recognition is deliberately not a core MVP dependency.

## MVP

Use:

- digitized answer images
- simulated extracted text where needed
- manually authored text scenarios

## Optional demo

A clearly labeled OCR experiment may be added if reliable.

## Future

- multilingual handwriting recognition
- subject-specific recognition
- confidence-aware extraction
- human correction workflow

Never present experimental OCR as production-ready.

---

# 26. MOBILE DECISION

## MVP

Responsive web interface.

## Future

Native mobile examiner interface if user research validates the need.

Do not split the hackathon team into separate web and mobile implementations unless the core web product is already complete.

---

# 27. PRIVACY AND DATA GOVERNANCE

## MVP rules

- no real student PII
- no real evaluator employment data
- no sensitive institutional data
- synthetic IDs
- synthetic names where needed
- seeded scenarios
- no external exposure of private data

## Production direction

Would require:

- institutional authorization
- access controls
- data minimization
- retention policies
- auditability
- legal/privacy review
- applicable DPDP requirements
- secure integration with institutional systems

---

# 28. ERROR AND EDGE-CASE BEHAVIOR

| Situation | Expected behavior |
|---|---|
| Insufficient statistical sample | Do not generate unreliable anomaly |
| Legitimately strict evaluator | Show signal if warranted; moderator can dismiss |
| Duplicate signals | Group related signals |
| Missing exemplar | Explicit empty state |
| AI unavailable | Core deterministic/analytics workflow continues |
| AI output uncertain | Show uncertainty/disable assistance |
| Data stream stale | Show stale status |
| Flag already resolved | Preserve history; prevent accidental overwrite |
| Moderator gives no reason | Block resolution |
| Revaluation sample too small | Show insufficient evidence |
| Conflicting moderator decisions | Escalate for authorized review |
| Synthetic data generation fails | Preserve existing dataset and show error |

---

# 29. FAILURE MODES AND MITIGATION

## AI hallucination

Mitigation:

- constrained prompts
- evidence grounding
- visible source context
- human review
- optional feature, not critical path

## False anomaly

Mitigation:

- sufficient sample requirement
- transparent baseline
- moderator resolution
- no automatic punishment

## Demo randomness

Mitigation:

- seeded dataset
- fixed scenarios
- deterministic rules
- controlled AI use

## Feature bloat

Mitigation:

- MUST/SHOULD/FUTURE boundary
- vertical-slice development
- no feature added solely for challenge checklist coverage

## Trust failure

Mitigation:

- human authority
- evidence
- audit
- dismiss/override controls
- careful language

## Data unavailability

Mitigation:

- synthetic generator
- public datasets only where appropriate

## Overclaiming

Mitigation:

- explicit prototype/future labels
- no unsupported accuracy or impact claims

---

# 30. ASSUMPTION REGISTER

| Assumption | Status | Validation path |
|---|---|---|
| Existing OSM can provide evaluation events | Assumption | Institutional integration discovery |
| Quality signals can improve review prioritization | Product hypothesis | Controlled evaluation |
| Synthetic data can demonstrate the workflow | High confidence for demo | Demo validation |
| Statistical signals are understandable to moderators | Hypothesis | User testing |
| Exemplar calibration is acceptable | Hypothesis | Evaluator interviews |
| AI assistance is institutionally acceptable | Unresolved | Policy review |
| Revaluation data can support learning | Unresolved | Institutional data study |
| Production integration is feasible | Plausible | API/vendor discovery |

---

# 31. DEPENDENCIES

## Required for MVP

- synthetic evaluation data
- cycle configuration
- rubric/exemplar definitions
- quality-signal logic
- dashboard
- moderation workflow
- audit storage
- seeded demo scenarios

## Optional

- LLM service
- embedding service
- public essay dataset
- OCR service

## External production dependencies

- OSM vendor APIs/events
- university identity provider
- institutional database
- privacy/security approval

---

# 32. MVP VS PRODUCTION

| Area | Hackathon MVP | Production direction |
|---|---|---|
| OSM | Simulated/upstream mock | Existing institutional OSM |
| Data | Synthetic | Authorized real anonymized data |
| AI | Optional assistive features | Validated institution-specific assistance |
| Analytics | Transparent statistical signals | Validated statistical/ML models |
| Scale | Demo dataset | Institutional scale |
| Auth | Prototype RBAC | Institutional SSO |
| Audit | Application audit | Formal institutional audit |
| OCR | Not required | Optional validated capability |
| Mobile | Responsive web | Native app if justified |
| Revaluation | Simulated | Real cycle history |
| Learning | Demo feedback loop | Multi-cycle institutional learning |

---

# 33. REQUIREMENT TRACEABILITY MATRIX

| Problem | Product response | Requirement |
|---|---|---|
| Incomplete evaluation | CompleteCheck | FR-003 |
| Late quality discovery | SentinelFlag | FR-004 |
| Too many raw signals | EscalationHub | FR-006 |
| Lack of visibility | QualityPulse | FR-011 |
| Marking inconsistency | CalibrationCoach | FR-012/FR-013 |
| Weak accountability | TrustLens | FR-010 |
| Revaluation disputes | RevaluationInsight | FR-014 |
| Weak learning loop | Exemplar update | FR-015 |
| AI trust risk | Human-in-loop | §11 |
| Privacy risk | Synthetic data | §13/§27 |
| Existing OSM maturity | Integration-layer approach | §24/§32 |

---

# 34. PRODUCT DECISIONS

## Decision 1

**Direction C is the product vision.**

## Decision 2

The MVP is a focused vertical slice, not the full ecosystem.

## Decision 3

Quality intelligence is the core differentiation.

## Decision 4

Deterministic checks must handle deterministic problems.

## Decision 5

Statistics should handle pattern detection.

## Decision 6

AI is assistive and optional, not authoritative.

## Decision 7

Human academic authority is preserved.

## Decision 8

Auditability is a first-class product capability.

## Decision 9

Synthetic data is the default MVP data source.

## Decision 10

Existing OSM infrastructure is augmented rather than unnecessarily replaced.

## Decision 11

Handwriting OCR is not a core dependency.

## Decision 12

Responsive web is preferred to a separate native mobile app for MVP.

---

# 35. EXPLICITLY OUT OF SCOPE

The following must not silently enter MVP:

- autonomous grading
- automatic mark modification
- automatic malpractice verdicts
- automatic evaluator punishment
- real student PII
- full scanning platform
- full physical-script logistics
- complete university ERP replacement
- mandatory Indic OCR
- native mobile app before web MVP
- unnecessary microservices
- black-box risk scores with no explanation
- unsupported claims of accuracy
- unsupported claims of regulatory approval

---

# 36. PRD RED-TEAM REVIEW

Before Step 4, challenge the PRD with these questions.

## Product coherence

- Does the system feel like one product?
- Can every major module be explained through the same lifecycle?
- Is the quality-control loop obvious?

## Problem alignment

- Does each MVP feature solve a validated problem?
- Are any features present only because they sound impressive?

## AI integrity

- Is AI genuinely useful?
- Could the product still work if AI were unavailable?
- Is AI being asked to do something deterministic rules/statistics could do better?

## Trust

- Can a human override every advisory signal?
- Is evidence visible?
- Can the system avoid punitive misuse?

## Demo

- Can the core story be demonstrated in 5–7 minutes?
- Is every critical moment deterministic?
- Is there a visible “before → intervention → after” story?

## Scope

- Can the MVP actually be completed?
- Are future capabilities clearly separated?

## Scalability

- Could the prototype realistically sit beside a real OSM platform?
- Are integration assumptions explicit?

## Data

- Does the product work without real student data?
- Are synthetic scenarios realistic enough to demonstrate the concept?

## Differentiation

- Is the differentiation based on a real gap rather than marketing language?

---

# 37. PRD ACCEPTANCE GATE

Do not proceed to architecture until all are true.

### Product

- [ ] Direction C is explicitly the product vision
- [ ] One coherent product story exists
- [ ] Primary users are defined
- [ ] Core problem is defined
- [ ] End-to-end lifecycle is defined

### Scope

- [ ] MUST HAVE is frozen
- [ ] SHOULD HAVE is separated
- [ ] Future scope is documented
- [ ] No autonomous grading dependency exists
- [ ] No real PII dependency exists

### AI / Analytics

- [ ] AI responsibilities are explicit
- [ ] Rules responsibilities are explicit
- [ ] Statistical responsibilities are explicit
- [ ] Human authority is explicit
- [ ] Explainability is required

### UX

- [ ] Evaluator flow exists
- [ ] Moderator flow exists
- [ ] Controller flow exists
- [ ] Audit flow exists
- [ ] Learning-loop flow exists

### Demo

- [ ] Seeded scenarios exist
- [ ] 5–7 minute demo path exists
- [ ] Critical demo path is deterministic

### Trust

- [ ] False positives are handled
- [ ] Human override exists
- [ ] Resolution reasons are required
- [ ] No automatic punitive action exists

### Data

- [ ] Synthetic data strategy exists
- [ ] Public data use is caveated
- [ ] Real-data assumptions are documented

### Challenge alignment

- [ ] Official challenge capabilities are mapped
- [ ] Expected outcomes are mapped
- [ ] No feature checklist mentality is used

### Architecture readiness

- [ ] Product requirements are sufficiently precise for architecture
- [ ] Architecture decisions are NOT prematurely embedded here
- [ ] Technology stack is NOT locked here

---

# 38. FINAL PRODUCT DEFINITION

The final PRD definition is:

> **QualityLoop is an end-to-end OSM intelligence ecosystem that augments digital evaluation with deterministic validation, statistical quality intelligence, carefully bounded AI assistance, smart moderation, explainable audit trails, calibration and revaluation-driven learning. It helps evaluators work consistently, helps moderators discover and prioritize quality risks earlier, and helps institutions build a transparent continuous-improvement loop — while preserving human authority over academic decisions.**

The product's core loop is:

```text
EVALUATE
   ↓
VALIDATE
   ↓
ASSIST
   ↓
DETECT
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
CALIBRATE
   ↓
NEXT CYCLE
```

---

# 39. HANDOFF TO STEP 4

Step 4 — Architecture may now determine:

- system boundaries
- application architecture
- modules/services
- frontend/backend responsibilities
- data model
- event model
- API boundaries
- AI integration boundaries
- analytics implementation
- authentication/RBAC
- deployment model
- observability
- security architecture
- testing architecture

Step 4 must preserve the product decisions in this PRD.

Architecture may simplify implementation, but must not silently change:

- human authority
- MVP scope
- AI boundaries
- trust model
- data strategy
- challenge alignment
- core lifecycle

---

# 40. FINAL INSTRUCTION FOR FUTURE AGENTIC STEPS

When an AI coding/research/architecture agent receives this PRD, it must:

1. Treat this document as the product source of truth.
2. Never add a feature merely because it appears in the official challenge list.
3. Never turn an optional capability into a mandatory dependency without explicit approval.
4. Never introduce autonomous academic decision-making.
5. Never use real student PII for convenience.
6. Never hide statistical/AI reasoning behind unexplained scores.
7. Never confuse a prototype simulation with a production integration.
8. Preserve the end-to-end lifecycle.
9. Prefer the smallest implementation that demonstrates the product hypothesis.
10. Escalate ambiguity instead of inventing requirements.

**Step 3 objective complete:** the selected Direction C has now been converted into a coherent, bounded, testable product definition ready for architectural design.
