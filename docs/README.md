# OSM Project Documentation Architecture

Welcome to the documentation suite for the **AI-Powered On-Screen Marking & Digital Examination Evaluation Platform (OSM)**.

This directory is organized into strict authority tiers to ensure that humans and AI coding agents can quickly locate specifications, follow established invariants, and distinguish authoritative system contracts from supporting historical materials.

---

## Quick Navigation for AI Agents & Developers

* **AI Coding Agent Master Rules:** [`/AGENTS.md`](file:///c:/Users/siddh/Desktop/POPO%20-%20updrage/AGENTS.md)
* **AI Orientation & Document Map:** [`docs/AI-CONTEXT.md`](file:///c:/Users/siddh/Desktop/POPO%20-%20updrage/docs/AI-CONTEXT.md)
* **Project Overview & Foundation:** [`docs/contracts/00-project-context.md`](file:///c:/Users/siddh/Desktop/POPO%20-%20updrage/docs/contracts/00-project-context.md)

---

## Directory Organization

### 1. `docs/contracts/` — Authoritative Contracts
The canonical source of truth for all product, architecture, domain, and interface invariants. Implementation code must conform strictly to these contracts.

* [`00-project-context.md`](file:///c:/Users/siddh/Desktop/POPO%20-%20updrage/docs/contracts/00-project-context.md) — Project foundation, core philosophy, and problem context
* [`01-product-contract.md`](file:///c:/Users/siddh/Desktop/POPO%20-%20updrage/docs/contracts/01-product-contract.md) — Functional requirements, user roles, journeys, and MVP scope
* [`02-architecture-contract.md`](file:///c:/Users/siddh/Desktop/POPO%20-%20updrage/docs/contracts/02-architecture-contract.md) — System boundaries, layered architecture, module ownership, and invariants
* [`05-domain-contract.md`](file:///c:/Users/siddh/Desktop/POPO%20-%20updrage/docs/contracts/05-domain-contract.md) — Domain entities, aggregates, state machines, and business rules
* [`06-api-contract.md`](file:///c:/Users/siddh/Desktop/POPO%20-%20updrage/docs/contracts/06-api-contract.md) — RESTful API surface, request/response DTOs, and error models
* [`07-event-contract.md`](file:///c:/Users/siddh/Desktop/POPO%20-%20updrage/docs/contracts/07-event-contract.md) — Domain events, payload envelopes, outbox pattern, and idempotency
* [`08-data-contract.md`](file:///c:/Users/siddh/Desktop/POPO%20-%20updrage/docs/contracts/08-data-contract.md) — Persistence schemas, relational tables, transactions, and audit records
* [`09-testing-contract.md`](file:///c:/Users/siddh/Desktop/POPO%20-%20updrage/docs/contracts/09-testing-contract.md) — Test requirements, invariant assertions, and validation gates
* [`10-demo-contract.md`](file:///c:/Users/siddh/Desktop/POPO%20-%20updrage/docs/contracts/10-demo-contract.md) — Hackathon demonstration flows, truth-in-demo rules, and live validation

*(Note: In accordance with repository governance, missing numbered contracts such as `03-security-contract.md` and `04-ux-workflow-contract.md` are not fabricated. Their governing rules are incorporated directly within `AGENTS.md`, `01-product-contract.md`, and `02-architecture-contract.md`.)*

---

### 2. `docs/planning/` — Implementation Sequence & Tracking
Subordinate to authoritative contracts. Governs build order and task tracking without redefining system requirements.

* [`03-build-roadmap.md`](file:///c:/Users/siddh/Desktop/POPO%20-%20updrage/docs/planning/03-build-roadmap.md) — Phased implementation roadmap and phase exit criteria
* [`04-task-board.md`](file:///c:/Users/siddh/Desktop/POPO%20-%20updrage/docs/planning/04-task-board.md) — Active task board, implementation tracking, and task backlog

---

### 3. `docs/research/` — Research & Domain Evidence
Supporting empirical research validating real-world examination problems.

* [`osm-step1-research-validation.md`](file:///c:/Users/siddh/Desktop/POPO%20-%20updrage/docs/research/osm-step1-research-validation.md) — Analysis of CBSE 2026 digital evaluation issues, Indian university delays, Indic OCR constraints, and the DPDP Act

---

### 4. `docs/ideation/` — Problem Deconstruction & Strategy
Supporting problem space exploration and product direction selection.

* [`osm-step0-problem-deconstruction.md`](file:///c:/Users/siddh/Desktop/POPO%20-%20updrage/docs/ideation/osm-step0-problem-deconstruction.md) — Initial problem deconstruction and root cause identification
* [`osm-step2-solution-ideation-master.md`](file:///c:/Users/siddh/Desktop/POPO%20-%20updrage/docs/ideation/osm-step2-solution-ideation-master.md) — Solution directions evaluation and selection of Direction C (End-to-End OSM Intelligence)

---

### 5. `docs/quality-loops/` — Quality Loop History
Iterative refinement and quality loops for PRD, architecture, and build planning.

* [`osm-step3-prd-quality-loop-master.md`](file:///c:/Users/siddh/Desktop/POPO%20-%20updrage/docs/quality-loops/osm-step3-prd-quality-loop-master.md) — PRD quality loop and specification iterations
* [`osm-step4-architecture-quality-loop.md`](file:///c:/Users/siddh/Desktop/POPO%20-%20updrage/docs/quality-loops/osm-step4-architecture-quality-loop.md) — System architecture quality loop and trade-off analyses
* [`osm-step5-build-plan-quality-loop.md`](file:///c:/Users/siddh/Desktop/POPO%20-%20updrage/docs/quality-loops/osm-step5-build-plan-quality-loop.md) — Build plan quality loop and slicing strategy

---

## Authority & Governance

1. **Contracts govern behavior; code implements contracts.**
2. **AI recommendations are advisory; humans make authoritative academic decisions.**
3. **Planning tracks work; planning documents cannot override contracts.**
4. **Historical/ideation materials provide context; they do not supersede current contracts.**
