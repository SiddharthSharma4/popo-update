# OSM AI Context — Agent Navigation & Operating Guide

**Project:** OSM — AI-Powered On-Screen Marking & Digital Evaluation System  
**Document:** `docs/AI-CONTEXT.md`  
**Purpose:** Primary AI agent orientation, navigation map, and contract governance guide  
**Status:** Authoritative Navigation Layer  
**Target Audience:** AI coding agents, autonomous builders, and human developers  

---

# 1. START HERE

Welcome, AI Agent.

Before reading any other document or writing any code, **read this guide thoroughly alongside [`AGENTS.md`](file:///c:/Users/siddh/Desktop/POPO%20-%20updrage/AGENTS.md)**.

OSM is a high-stakes, mission-critical digital evaluation platform designed for university and board examinations. In this domain, evaluation accuracy, procedural fairness, deterministic mark recording, audit traceability, and examiner authority are absolute invariants.

### The Golden Rule for AI Agents:
> **READ BEFORE BUILDING.  
> UNDERSTAND THE CONTRACTS BEFORE MODIFYING CODE.  
> IMPLEMENT THE CONTRACTS.  
> DO NOT MODIFY CONTRACTS TO FIT IMPLEMENTATION CONVENIENCE.  
> IF CODE AND CONTRACT CONFLICT, SURFACE THE CONFLICT.  
> DO NOT INVENT REQUIREMENTS.  
> DO NOT FAKE IMPLEMENTATION.  
> DO NOT LET AI SILENTLY BECOME THE FINAL AUTHORITY OVER ACADEMIC DECISIONS.**

---

# 2. DOCUMENT MAP & AUTHORITY MATRIX

The documentation in this repository is structured into distinct tiers of authority:

| Document Path | Title & Purpose | Authority Level |
| :--- | :--- | :--- |
| [`AGENTS.md`](file:///c:/Users/siddh/Desktop/POPO%20-%20updrage/AGENTS.md) | Master AI Agent Instructions & Engineering Governance | **Constitutional / Behavioral** |
| [`docs/AI-CONTEXT.md`](file:///c:/Users/siddh/Desktop/POPO%20-%20updrage/docs/AI-CONTEXT.md) | Primary Agent Navigation & Context Entry Point | **Authoritative Navigation** |
| [`docs/contracts/00-project-context.md`](file:///c:/Users/siddh/Desktop/POPO%20-%20updrage/docs/contracts/00-project-context.md) | Stable project mental model, problem domain, actors & philosophies | **Authoritative (Foundation)** |
| [`docs/contracts/01-product-contract.md`](file:///c:/Users/siddh/Desktop/POPO%20-%20updrage/docs/contracts/01-product-contract.md) | Product scope, functional requirements, user journeys & MVP bounds | **Authoritative (Product)** |
| [`docs/contracts/02-architecture-contract.md`](file:///c:/Users/siddh/Desktop/POPO%20-%20updrage/docs/contracts/02-architecture-contract.md) | System structure, modular boundaries, ownership & architectural rules | **Authoritative (Architecture)** |
| [`docs/contracts/05-domain-contract.md`](file:///c:/Users/siddh/Desktop/POPO%20-%20updrage/docs/contracts/05-domain-contract.md) | Domain models, entities, state machines, invariants & aggregate rules | **Authoritative (Domain)** |
| [`docs/contracts/06-api-contract.md`](file:///c:/Users/siddh/Desktop/POPO%20-%20updrage/docs/contracts/06-api-contract.md) | HTTP/REST endpoints, request/response DTOs, validation & status codes | **Authoritative (API Boundary)** |
| [`docs/contracts/07-event-contract.md`](file:///c:/Users/siddh/Desktop/POPO%20-%20updrage/docs/contracts/07-event-contract.md) | Domain events, event envelope, outbox pattern, delivery & idempotency | **Authoritative (Event Semantics)** |
| [`docs/contracts/08-data-contract.md`](file:///c:/Users/siddh/Desktop/POPO%20-%20updrage/docs/contracts/08-data-contract.md) | Persistence schemas, relational tables, transactions & audit storage | **Authoritative (Persistence)** |
| [`docs/contracts/09-testing-contract.md`](file:///c:/Users/siddh/Desktop/POPO%20-%20updrage/docs/contracts/09-testing-contract.md) | Verification standards, invariant test matrices & acceptance gates | **Authoritative (Verification)** |
| [`docs/contracts/10-demo-contract.md`](file:///c:/Users/siddh/Desktop/POPO%20-%20updrage/docs/contracts/10-demo-contract.md) | Hackathon demonstration script, truth-in-demo rules & live verification | **Authoritative (Demonstration)** |
| [`docs/planning/03-build-roadmap.md`](file:///c:/Users/siddh/Desktop/POPO%20-%20updrage/docs/planning/03-build-roadmap.md) | Phased implementation sequence & stage exit gates | **Planning (Sequence)** |
| [`docs/planning/04-task-board.md`](file:///c:/Users/siddh/Desktop/POPO%20-%20updrage/docs/planning/04-task-board.md) | Granular task registry, status tracking & current backlog | **Planning (Task Execution)** |
| [`docs/research/osm-step1-research-validation.md`](file:///c:/Users/siddh/Desktop/POPO%20-%20updrage/docs/research/osm-step1-research-validation.md) | Real-world problem validation (CBSE 2026 OSM crisis, DPDP Act, OCR) | **Supporting (Research)** |
| [`docs/ideation/osm-step0-problem-deconstruction.md`](file:///c:/Users/siddh/Desktop/POPO%20-%20updrage/docs/ideation/osm-step0-problem-deconstruction.md) | Initial deconstruction of the hackathon problem statement | **Supporting (Ideation)** |
| [`docs/ideation/osm-step2-solution-ideation-master.md`](file:///c:/Users/siddh/Desktop/POPO%20-%20updrage/docs/ideation/osm-step2-solution-ideation-master.md) | Solution space analysis & Direction C selection rationale | **Supporting (Ideation)** |
| [`docs/quality-loops/osm-step3-prd-quality-loop-master.md`](file:///c:/Users/siddh/Desktop/POPO%20-%20updrage/docs/quality-loops/osm-step3-prd-quality-loop-master.md) | PRD quality loop and feature discovery history | **Supporting (Quality Loop)** |
| [`docs/quality-loops/osm-step4-architecture-quality-loop.md`](file:///c:/Users/siddh/Desktop/POPO%20-%20updrage/docs/quality-loops/osm-step4-architecture-quality-loop.md) | Architectural trade-offs, pipeline evaluation & review history | **Supporting (Quality Loop)** |
| [`docs/quality-loops/osm-step5-build-plan-quality-loop.md`](file:///c:/Users/siddh/Desktop/POPO%20-%20updrage/docs/quality-loops/osm-step5-build-plan-quality-loop.md) | Build plan quality loop, slicing iterations & risk analysis | **Supporting (Quality Loop)** |

---

# 3. CONTRACT GAPS & MISSING CONTRACT STATUS

During repository inspection and contract normalization, the following contract number sequence gaps were identified:

### 1. `03-security-contract.md`
* **Status:** Not currently present as an independent file in `docs/contracts/`.
* **Action:** No contract fabricated.
* **Governing Rules:** Security, credential protection, authorization, DPDP compliance, and role isolation are governed authoritatively by:
  - [`AGENTS.md`](file:///c:/Users/siddh/Desktop/POPO%20-%20updrage/AGENTS.md) §20 (*Security & Privacy*)
  - [`01-product-contract.md`](file:///c:/Users/siddh/Desktop/POPO%20-%20updrage/docs/contracts/01-product-contract.md) §10 (*Non-Functional Requirements & Security*)
  - [`02-architecture-contract.md`](file:///c:/Users/siddh/Desktop/POPO%20-%20updrage/docs/contracts/02-architecture-contract.md) §16 (*Security & Data Protection Boundaries*)

### 2. `04-ux-workflow-contract.md`
* **Status:** Not currently present as an independent file in `docs/contracts/`.
* **Action:** No contract fabricated.
* **Governing Rules:** User workflows, screen layouts, marking interface behavior, and moderation triage screens are governed authoritatively by:
  - [`01-product-contract.md`](file:///c:/Users/siddh/Desktop/POPO%20-%20updrage/docs/contracts/01-product-contract.md) §6 (*User Roles & Journeys*) & §7 (*Functional Requirements*)
  - [`10-demo-contract.md`](file:///c:/Users/siddh/Desktop/POPO%20-%20updrage/docs/contracts/10-demo-contract.md) §6 (*UI States & Walkthroughs*)

### Note on Numbering:
`03-build-roadmap.md` and `04-task-board.md` exist under `docs/planning/` rather than `docs/contracts/` because they govern implementation order and task tracking rather than system invariants. They do not override contracts.

---

# 4. SOURCE-OF-TRUTH HIERARCHY

When working on any task, agents must resolve questions using the following strict hierarchy:

```text
Level 1: Explicit Current User Instruction
   │   (Scoped task instruction; must not violate safety or approved architecture)
   ▼
Level 2: Approved Authoritative Contracts (docs/contracts/)
   │   (Product → Architecture → Domain → Data / Events / API → Testing → Demo)
   ▼
Level 3: Current Working Implementation
   │   (Inspect active code before changing or inventing components)
   ▼
Level 4: Task Plan & Roadmap (docs/planning/)
   │   (Determines build sequence and task status, cannot change requirements)
   ▼
Level 5: Supporting & Historical Materials (docs/research/, ideation/, quality-loops/)
   │   (Provides context and rationale; non-binding)
   ▼
Level 6: Agent Assumptions
       (Weakest source. NEVER convert an unverified assumption into an architectural decision)
```

---

# 5. CORE SYSTEM BOUNDARIES & ARCHITECTURAL INVARIANTS

### 1. AI Boundary (Human-in-the-Loop)
* AI models and automated detectors are **advisory and assistive only**.
* AI recommendations must **never** automatically alter authoritative marks, finalize student scores, declare malpractice, or resolve disputed evaluations.
* All AI outputs must be structured, schema-validated, explainable, and traceable.
* Human examiner decisions always override AI suggestions.
* The UI and audit logs must explicitly distinguish:
  - **What the system detected**
  - **What AI suggested**
  - **What the human decided**

### 2. UI Boundary
* The frontend/UI is **not the source of truth**.
* State displayed in UI must reflect authoritative backend domain/persistence state.
* Authorization and invariant validation must be strictly enforced on the backend server.

### 3. Backend & Persistence Boundary
* Authoritative state originates solely from the Domain model and Persistence layer.
* Financial, academic, and mark totals must be calculated deterministically on the server, not inferred or aggregated client-side.
* All state mutations must maintain strict transactional integrity, optimistic concurrency control, and audit trails.

### 4. Event Boundary
* Domain events represent immutable facts that have already occurred within the domain.
* Events are published via transactional outbox patterns to guarantee consistency.
* Events are application facts and are separate from diagnostic system audit logs.

### 5. Demo Boundary
* Demonstrations must prove **real system behavior**.
* Do not fake backend calculations or replace failing APIs with hardcoded mock responses in production paths.
* If a synthetic fallback is necessary for an external service during demo mode, it must be explicitly labeled `DEMO FALLBACK`.

---

# 6. AGENT READING RULES & TASK CONTEXT LOADING

Agents must **not** load every file into context indiscriminately. Load the smallest complete set required for the specific task:

| If you are working on: | Minimum Required Reading Set: |
| :--- | :--- |
| **Any Task (Orientation)** | `AGENTS.md` + `docs/AI-CONTEXT.md` + `docs/contracts/00-project-context.md` |
| **Product Behavior / Feature Scope** | `01-product-contract.md` + `docs/planning/04-task-board.md` |
| **System Architecture / Layers** | `02-architecture-contract.md` + `05-domain-contract.md` |
| **Domain Logic / Aggregate Rules** | `02-architecture-contract.md` + `05-domain-contract.md` + `08-data-contract.md` |
| **API Endpoints / DTOs** | `05-domain-contract.md` + `06-api-contract.md` + `08-data-contract.md` |
| **Events / Messaging / Outbox** | `05-domain-contract.md` + `07-event-contract.md` + `08-data-contract.md` |
| **Database / Persistence / Migrations** | `05-domain-contract.md` + `08-data-contract.md` |
| **AI / OCR / Quality Detector Logic** | `01-product-contract.md` + `02-architecture-contract.md` + `05-domain-contract.md` + `08-data-contract.md` |
| **Testing / Quality Verification** | `09-testing-contract.md` + relevant contract for the target component |
| **Demo Preparation / Polish** | `10-demo-contract.md` + `01-product-contract.md` + `docs/planning/04-task-board.md` |

---

# 7. IMPACT ANALYSIS PROTOCOL (BEFORE CODING)

Before writing any code or changing files, perform and document this impact check:

1. **Contracts Affected:** Which authoritative contracts govern this change?
2. **Existing Behavior:** Will this change alter or break any working behavior?
3. **Domain & State Rules:** Does this respect aggregate boundaries and state machine transitions?
4. **API & Contract Boundary:** Does this alter any request/response schema or status code?
5. **Persistence & Data Schema:** Does this require migration, table alterations, or outbox changes?
6. **Events & Listeners:** Are domain events emitted? Does it preserve envelope schemas?
7. **Verification & Tests:** What unit, integration, or contract tests must verify this change?
8. **Demo Fidelity:** Does this maintain genuine, demonstrable behavior?

---

# 8. CONTRACT CONFLICT ESCALATION

If during implementation you encounter a scenario where a requirement cannot be fulfilled without violating an authoritative contract:

**STOP IMMEDIATELY. DO NOT SILENTLY ALTER THE CONTRACT.**

Report the conflict using this format:

```text
==================================================
CONTRACT CONFLICT DETECTED
==================================================
Contract Reference: [Contract Name & Section]
Current Contract Rule: [Exact requirement or invariant]
Implementation Conflict: [Why current design or code conflicts]
Impact Analysis: [Consequences of altering vs preserving rule]
Proposed Resolution Options:
  Option A: [Safe resolution aligned with higher-level contract]
  Option B: [Alternative requiring explicit human approval]
==================================================
```

Await explicit user confirmation before proceeding with any material contract change.
