# PROJECT CONTEXT

**Project:** AI-Powered On-Screen Marking & Digital Examination Evaluation Platform
**Document:** `docs/contracts/00-project-context.md`
**Purpose:** Persistent project context and shared mental model
**Status:** Living Document
**Audience:** Human contributors and AI coding agents

---

# 1. PURPOSE

This document provides the stable, high-level context required to understand the project.

It answers:

* What are we building?
* Why are we building it?
* What problem space does it address?
* What is the core product philosophy?
* Who are the major actors?
* What is the conceptual workflow?
* What important distinctions must the system preserve?
* Where should an agent look for detailed requirements?

This document is intentionally **not** the complete product specification.

Detailed product, architecture, domain, API, data, AI, security, testing, and demo decisions belong in their respective contract documents.

---

# 2. DOCUMENT BOUNDARY

This document describes **project context**, not implementation instructions.

It must not become a substitute for:

* the official problem statement
* the product contract
* the architecture contract
* the build roadmap
* the domain contract
* the API contract
* the event contract
* the data contract
* the AI contract
* the security contract
* the testing contract
* the demo contract
* the task board
* the current project state

If a detailed implementation decision is required, the agent must consult the appropriate authoritative document.

---

# 3. PROJECT IDENTITY

## Project Name

**AI-Powered On-Screen Marking & Digital Examination Evaluation Platform**

The final public-facing product name may be defined by the product documentation.

## Project Type

Hackathon software project focused on improving examination evaluation through digital workflows and intelligent assistance.

## Domain

Education Technology / Examination Technology / AI-Assisted Evaluation

## Development Stage

Hackathon MVP / prototype.

The project prioritizes:

1. Solving the stated problem
2. A coherent end-to-end workflow
3. Demonstrable functionality
4. Meaningful use of technology
5. Reliable implementation
6. Human oversight
7. Explainability
8. Traceability
9. Strong demo integrity

---

# 4. PROJECT MISSION

The project aims to improve examination evaluation by combining digital workflows, deterministic validation, analytics, and AI-assisted capabilities while preserving appropriate human control over consequential academic decisions.

The core philosophy is:

> **Use technology to make examination evaluation more efficient, observable, consistent, reviewable, and auditable without blindly replacing responsible human judgment.**

The product is not merely an automatic marking system.

It is an intelligent evaluation workflow.

---

# 5. PROBLEM SPACE

Examination evaluation can involve challenges such as:

* large volumes of answer sheets
* repetitive evaluation workflows
* manual effort
* difficulty identifying missed or incomplete evaluation
* potential inconsistencies
* limited visibility into evaluation patterns
* delayed detection of unusual cases
* fragmented review processes
* difficulty auditing important evaluation actions
* difficulty identifying cases that deserve additional review

These are contextual problem-space observations.

The **official hackathon problem statement remains authoritative** for the exact problem the project must solve.

This document must never be treated as a replacement for the official challenge statement.

---

# 6. CORE PRODUCT IDEA

The platform provides a digital evaluation workflow in which rules, analytics, and AI can assist users in identifying and understanding evaluation-related situations that may require attention.

Conceptually:

```text
Answer Sheet / Examination Data
            │
            ▼
    Digital Evaluation
            │
            ▼
    Rules / Analytics / AI
            │
            ▼
      Quality Signals
            │
            ▼
       Human Review
            │
            ▼
      Human Resolution
            │
            ▼
          Audit
            │
            ▼
      Insights / Reports
```

The exact implementation of each stage belongs to the relevant project contracts.

---

# 7. CORE PRODUCT PHILOSOPHY

The product should not be understood as:

> "AI automatically decides examination marks."

The intended philosophy is:

> **AI and analytics assist evaluation workflows while humans retain appropriate academic authority.**

This distinction must remain intact throughout product development.

---

# 8. HUMAN AUTHORITY

Consequential academic decisions should remain under appropriate human control.

The conceptual model is:

```text
System observes
      ↓
System detects / analyzes
      ↓
System may recommend
      ↓
Human reviews
      ↓
Human decides
      ↓
System records
```

AI recommendations are not automatically authoritative.

AI must not silently become the final academic decision-maker.

The exact authorization model is defined by the product, domain, and security contracts.

---

# 9. CORE DOMAIN DISTINCTIONS

The following concepts must not be treated as interchangeable.

## Observation

Something the system detected or received.

Example:

> An answer appears to have no recorded evaluation.

## Quality Signal

A structured indication that something may deserve attention.

Example:

> Potential unchecked-answer signal.

A signal is not automatically proof of an error or violation.

## Recommendation

An AI or analytical suggestion.

Example:

> The available evidence may justify additional review.

A recommendation is advisory unless the approved product contract explicitly defines otherwise.

## Human Resolution

The action or decision taken by an authorized human.

Example:

> Examiner reviews the case and confirms the evaluation.

## Audit Event

A traceable record of an important system or human action.

These concepts should remain distinct in the domain model.

---

# 10. QUALITY SIGNAL MENTAL MODEL

The project should conceptually follow:

```text
Detection / Observation
          ↓
     Quality Signal
          ↓
       Review
          ↓
   Human Resolution
          ↓
      Audit Event
```

A quality signal should provide sufficient context for a reviewer to understand why the item deserves attention.

Where applicable, signal provenance should include information such as:

* detector type
* detector/model version
* configuration version
* relevant data window
* evidence
* confidence/severity where meaningful
* generation time

The exact schema belongs to the domain/data/AI contracts.

---

# 11. HUMAN REVIEW MENTAL MODEL

A reviewer should be able to understand:

* what was detected
* why it was detected
* what evidence supports the signal
* what analytics contributed
* what AI recommended, if applicable
* what action is expected
* what the human ultimately decided

The purpose is to make review **evidence-based and traceable**, rather than requiring blind trust in an AI output.

---

# 12. AI ROLE

AI is a supporting capability within the platform.

Potential AI-assisted capabilities may include:

* semantic answer understanding
* evaluation assistance
* answer comparison
* summarization
* contextual recommendations
* anomaly interpretation
* review assistance
* handwriting-related assistance where supported
* natural-language insights

The exact AI capabilities included in the product are defined by the approved product and AI contracts.

Do not assume every possible AI capability belongs in the MVP.

---

# 13. AI AUTHORITY BOUNDARY

The project maintains the following principle:

```text
AI Recommendation
        ↓
      Review
        ↓
Human Decision
```

AI recommendations should be:

* advisory
* non-authoritative
* reviewable
* overridable
* traceable
* auditable

AI must not independently:

* silently alter authoritative academic decisions
* declare malpractice as a final determination
* override an authorized human decision
* turn an anomaly signal into a confirmed violation
* convert derived analytics into authoritative source data

Exact rules belong to the AI, domain, security, and product contracts.

---

# 14. AI OUTPUT MENTAL MODEL

When AI output is consumed by the application, it should conceptually resemble:

```json
{
  "recommendation": "",
  "evidence": [],
  "confidence": null,
  "confidenceSource": "",
  "flags": [],
  "requiresHumanReview": true
}
```

This is a **conceptual example**, not an API contract.

The actual schema must be defined in the AI/API contracts.

Avoid designing the generic system around an assumption that AI directly produces authoritative marks.

If mark suggestions are eventually included, they must remain explicitly:

```text
non-authoritative
advisory
reviewable
overridable
auditable
```

---

# 15. RULES vs ANALYTICS vs AI vs HUMAN

Use the appropriate mechanism for the problem.

## Deterministic Rules

Prefer deterministic logic when the requirement can be reliably expressed as a rule.

Examples:

* required-field validation
* format validation
* workflow constraints
* permission checks
* fixed business rules

## Statistics / Analytics

Use analytics for:

* distributions
* trends
* deviations
* outlier detection
* pattern analysis

An anomaly is a **signal for review**, not automatically proof of misconduct, evaluator wrongdoing, or error.

## AI / ML

Use AI when contextual, semantic, or learned reasoning provides meaningful value.

## Human Judgment

Use authorized human judgment for consequential academic decisions and cases requiring contextual review.

Conceptually:

```text
Rules
  +
Analytics
  +
AI
  ↓
Evidence / Signals / Assistance
  ↓
Human Review
  ↓
Human Decision
```

---

# 16. DATA TRUST MODEL

Not all system information has the same authority.

Conceptually:

```text
Authoritative Human Decision
            ↑
       Human Review
            ↑
AI / Analytics Recommendation
            ↑
System Detection / Signal
            ↑
Raw Input / Observation
```

This is a conceptual trust model.

The exact authoritative fields and state transitions are defined in the domain and data contracts.

---

# 17. DATA CATEGORIES

The project should distinguish at least conceptually between:

## Operational Data

Authoritative application data required to operate the examination workflow.

Examples may include:

* examinations
* questions
* answer sheets
* evaluations
* marks
* users

## Derived Data

Data calculated from operational data.

Examples:

* statistics
* trends
* distributions
* quality signals
* anomaly indicators
* analytics

Derived analytics must not silently become authoritative source data.

## AI-Generated Data

Outputs produced by AI systems.

Examples:

* recommendations
* classifications
* summaries
* explanations
* confidence information

## Audit Data

Historical records of important actions and decisions.

Audit records and historical evaluation evidence must not be deleted or rewritten merely to simplify implementation or testing.

## Demo / Seed Data

Artificial data used for development or demonstration.

Demo data must never be represented as real institutional data.

---

# 18. AUDITABILITY

Important system and human actions should remain traceable.

Where applicable, the system should be able to answer:

```text
WHO?
WHAT?
WHEN?
WHAT CHANGED?
WHY?
```

Potential auditable events include:

* evaluation submitted
* marks changed
* recommendation generated
* quality signal created
* signal reviewed
* human override
* moderation action
* evaluation finalized

The exact event model belongs to the event/domain contracts.

---

# 19. CORE USER MENTAL MODEL

The exact roles are defined in the product and security contracts.

Conceptually, the platform may involve actors such as:

* examiner
* reviewer
* moderator
* administrator
* academic authority

Do not create or assume additional roles unless the authoritative product/security documentation requires them.

---

# 20. EXAMINER WORKFLOW

The conceptual examiner experience is:

```text
Login
  ↓
Select Examination
  ↓
Open Answer Sheet
  ↓
Evaluate
  ↓
Receive Relevant Assistance / Signals
  ↓
Review
  ↓
Confirm / Modify
  ↓
Submit
  ↓
Audit
```

This is a mental model, not a UI specification.

The actual workflow belongs to the product and UI requirements.

---

# 21. REVIEW WORKFLOW

The review experience should enable an authorized user to understand:

```text
What happened?
      ↓
Why was it detected?
      ↓
What evidence exists?
      ↓
What did the system recommend?
      ↓
What decision did the human make?
      ↓
What was recorded?
```

The system should make important review decisions explainable through their underlying evidence.

---

# 22. EXPLAINABILITY

The goal is not to expose private or meaningless internal model reasoning.

The goal is to provide useful evidence.

Depending on the feature, useful evidence may include:

* relevant answer content
* comparison results
* triggered rules
* detected patterns
* supporting metrics
* confidence/severity information
* detector/model information
* relevant timestamps
* supporting records

Every important quality or risk signal should be explainable through its underlying evidence where feasible.

---

# 23. TECHNOLOGY PRINCIPLE

Technology should serve the problem.

The preferred reasoning path is:

```text
Problem
   ↓
Required capability
   ↓
Simplest reliable technology
   ↓
Implementation
```

Not:

```text
Technology
   ↓
Find a reason to use it
```

Avoid unnecessary:

* services
* frameworks
* dependencies
* abstractions
* infrastructure
* AI components
* distributed systems

unless they provide meaningful product or engineering value.

---

# 24. MVP PHILOSOPHY

The project is being built for a hackathon.

The MVP should prioritize a reliable vertical slice over a large collection of incomplete features.

Prefer:

```text
One complete workflow
        ↓
Reliable implementation
        ↓
Clear value
        ↓
Strong demonstration
```

over:

```text
Many features
        ↓
Partial implementation
        ↓
Fragile demo
```

The exact MVP scope belongs to the product contract.

---

# 25. HACKATHON CONSTRAINTS

The project operates under typical hackathon constraints:

### Time

Implementation must prioritize high-value functionality.

### Scope

Features must directly support the stated problem.

### Reliability

The core workflow must work reliably during demonstration.

### Technical credibility

The solution should be technically defensible rather than merely visually impressive.

### AI credibility

AI should provide meaningful value rather than existing only as a superficial feature.

### Demo credibility

The team must clearly distinguish:

* real functionality
* seeded data
* simulated behavior
* fallback behavior
* live AI processing

---

# 26. DEMO INTEGRITY

Demo behavior must remain technically honest.

If an external AI/API service is unavailable, a controlled fallback may be used where appropriate.

However:

> **Demo/fallback data must retain provenance and must never be presented as a live production result.**

For example:

```text
AI Analysis

Status: DEMO FALLBACK
Source: Seeded Scenario
```

Do not make a seeded result visually indistinguishable from a live result if doing so could mislead the audience.

---

# 27. ENVIRONMENT SEPARATION

The project should conceptually distinguish:

```text
development
test
demo
production
```

Do not:

* use production credentials in development
* use production data in demos
* load demo seed data into production
* mix test data with authoritative operational data

Exact environment configuration belongs to the infrastructure/security documentation.

---

# 28. PROJECT DEVELOPMENT MODEL

The project follows progressive refinement:

```text
Problem Statement
       ↓
Research
       ↓
Ideation
       ↓
Solution Refinement
       ↓
Product Definition
       ↓
Architecture
       ↓
Build Roadmap
       ↓
Task Breakdown
       ↓
Implementation
       ↓
Testing
       ↓
Demo
       ↓
Iteration
```

The purpose of this sequence is to reduce uncertainty before significant implementation.

---

# 29. DOCUMENTATION ARCHITECTURE

The project uses documentation contracts so that each document has a clear responsibility.

Recommended structure:

```text
docs/
├── 00-project-context.md
├── 01-product-contract.md
├── 02-architecture-contract.md
├── 03-build-roadmap.md
├── 04-task-board.md
├── 05-domain-contract.md
├── 06-api-contract.md
├── 07-event-contract.md
├── 08-data-contract.md
├── 09-testing-contract.md
├── 10-demo-contract.md
├── 11-security-contract.md
│
├── decisions/
├── phases/
└── state/
```

This structure is the project's documentation model.

If the repository adopts different names, those names should be standardized consistently rather than creating multiple competing versions.

---

# 30. DOCUMENT RESPONSIBILITIES

## `00-project-context.md`

Stable project mental model.

Answers:

> What is this project?

---

## `01-product-contract.md`

Approved product requirements.

Answers:

> What must the product do?

---

## `02-architecture-contract.md`

Approved technical architecture.

Answers:

> How is the system structured?

---

## `03-build-roadmap.md`

Ordered implementation roadmap.

Answers:

> What should be built, and in what sequence?

---

## `04-task-board.md`

Task-level execution tracking.

Answers:

> What work exists and what is its status?

---

## `05-domain-contract.md`

Domain concepts and invariants.

Answers:

> What do the important entities, states, and workflows mean?

---

## `06-api-contract.md`

API behavior and schemas.

Answers:

> How do system components communicate?

---

## `07-event-contract.md`

Events and event semantics.

Answers:

> What important events exist and what do they mean?

---

## `08-data-contract.md`

Data structures and data rules.

Answers:

> What data exists and how is it represented?

---

## `09-testing-contract.md`

Testing and verification rules.

Answers:

> How do we prove the implementation works?

---

## `10-demo-contract.md`

Demonstration requirements.

Answers:

> What must be reliably demonstrated and how?

---

## `11-security-contract.md`

Security and privacy requirements.

Answers:

> What must be protected and what security controls apply?

---

## `state/`

Current project state.

Answers:

> Where are we right now?

---

## `decisions/`

Important architectural/product decisions.

Answers:

> Why was this decision made?

---

## `phases/`

Phase-specific implementation context.

Answers:

> What matters during this development phase?

---

# 31. AGENT ORIENTATION MAP

Before modifying the repository, an AI coding agent should understand the following map.

```text
AGENTS.md
    ↓
Agent behavior and engineering rules

00-project-context.md
    ↓
Stable project mental model

01-product-contract.md
    ↓
Approved product requirements

02-architecture-contract.md
    ↓
Approved system architecture

03-build-roadmap.md
    ↓
Implementation sequence

04-task-board.md
    ↓
Task inventory and progress

state/current-state.md
    ↓
Current project state

Current Task
    ↓
Immediate work to perform

contracts
    ↓
Task-specific technical constraints

quality contracts
    ↓
Verification and demo requirements
```

The agent should **not automatically load every document for every task**.

---

# 32. MINIMUM AGENT CONTEXT

For normal implementation, the minimum conceptual context is:

```text
AGENTS.md
+
current task
+
docs/state/current-state.md
```

Then load only the relevant contracts.

Examples:

```text
Product behavior
→ 01-product-contract.md

Architecture
→ 02-architecture-contract.md

Domain behavior
→ 05-domain-contract.md

API
→ 06-api-contract.md

Events
→ 07-event-contract.md

Data
→ 08-data-contract.md

Testing
→ 09-testing-contract.md

Demo
→ 10-demo-contract.md

Security
→ 11-security-contract.md
```

This prevents unnecessary context consumption and reduces the chance of unrelated project information influencing a small task.

---

# 33. CURRENT PROJECT STATE

This section intentionally remains high-level.

Detailed execution state belongs in:

```text
docs/state/current-state.md
docs/planning/04-task-board.md
```

## Current Stage

Hackathon MVP development.

## Current Objective

Build a reliable, demonstrable implementation of the approved solution.

## Current Task

Defined by the active task document / task board.

## Blockers

Maintain active blockers in project state rather than accumulating them here.

## Known Limitations

Maintain material current limitations in project state.

---

# 34. PROJECT DECISION PRINCIPLE

When a new idea appears, evaluate it against:

```text
Does it solve the stated problem?
        ↓
Does it improve the core workflow?
        ↓
Is it required by the approved product scope?
        ↓
Is it feasible within the project constraints?
        ↓
Does it introduce unnecessary complexity?
```

An interesting idea is not automatically an MVP feature.

Ideas outside approved scope should become separate proposals or future tasks.

---

# 35. CONTEXT INTEGRITY

This document must describe the project's **approved high-level understanding**.

If an agent discovers that this document conflicts with an authoritative project contract:

1. identify the conflict
2. do not silently rewrite the context
3. determine which document governs the specific decision
4. follow the authoritative project/technical document
5. update project context only after the decision is clear

`AGENTS.md` governs **agent behavior**.

The project contracts govern **product and technical decisions**.

These are separate responsibilities.

---

# 36. SOURCE-OF-TRUTH MODEL

Use two related but distinct authority systems.

## Agent Behavior Authority

```text
Human instruction
      ↓
AGENTS.md
```

These define how the agent operates.

## Product / Technical Authority

```text
Official Problem Statement
        ↓
Product Contract
        ↓
Architecture Contract
        ↓
Relevant Technical Contract
        ↓
Current Task
        ↓
Implementation
```

The exact contract applicable to a task depends on what is being changed.

### Important rule

> **AGENTS.md governs agent behavior. It does not silently override an approved product, architecture, security, data, or other technical requirement.**

When requirements genuinely conflict, the agent must identify the conflict rather than inventing a resolution.

---

# 37. WHAT THIS DOCUMENT MUST NOT CONTAIN

Do not turn this document into:

* a complete PRD
* an API reference
* a database schema
* a component catalog
* a task tracker
* a detailed build guide
* a test case repository
* a prompt library
* a deployment manual
* a daily development diary
* a changelog

If information belongs in another contract, put it there.

---

# 38. UPDATE RULES

Update this document only when the stable project understanding changes.

Appropriate updates include:

* core mission change
* fundamental problem interpretation change
* major workflow change
* important terminology change
* major project constraint change
* major product philosophy change
* significant project-stage change

Do not update it for:

* every bug fix
* every component
* every API endpoint
* every task completion
* every dependency
* every UI adjustment

Those belong in the appropriate project documents.

---

# 39. PROJECT MENTAL MODEL

The complete project can be understood through this conceptual model:

```text
                 EXAMINATION
                      │
                      ▼
                ANSWER SHEETS
                      │
                      ▼
              DIGITAL EVALUATION
                      │
          ┌───────────┼───────────┐
          │           │           │
          ▼           ▼           ▼
        RULES     ANALYTICS       AI
          │           │           │
          └───────────┼───────────┘
                      ▼
                QUALITY SIGNAL
                      │
                      ▼
                 HUMAN REVIEW
                      │
                      ▼
                HUMAN RESOLUTION
                      │
                      ▼
                  AUDIT EVENT
                      │
                      ▼
               INSIGHTS / REPORTS
```

The fundamental product philosophy is:

> **Detect → Explain → Review → Decide → Audit**

---

# 40. ONE-SENTENCE PROJECT DEFINITION

> **An AI-assisted digital examination evaluation platform that helps identify, explain, and review evaluation-quality issues while keeping consequential academic decisions under appropriate human control and maintaining an auditable workflow.**

---

# 41. FINAL CONTEXT PRINCIPLES

Every contributor and AI agent should retain these principles:

> **Understand the problem before the feature.**

> **Understand the feature before the implementation.**

> **Use the appropriate contract for the decision being made.**

> **AI assists; humans retain appropriate academic authority.**

> **A signal is not automatically proof.**

> **An anomaly is not automatically misconduct.**

> **Derived analytics are not automatically authoritative data.**

> **Demo data is not real institutional data.**

> **Important actions should remain traceable.**

> **Prefer a reliable vertical slice over unnecessary feature breadth.**

> **Keep project context separate from detailed implementation contracts.**

---

# END OF PROJECT CONTEXT
