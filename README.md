# OSM — AI-Powered On-Screen Marking & Digital Evaluation Platform

**OSM** is a mission-critical digital examination evaluation platform engineered for universities and educational examination boards. It provides end-to-end intelligence across the marking lifecycle—combining high-throughput digital evaluation workflows, automated quality detectors (e.g., unchecked answer detection, marking anomaly alerts, examiner speed checks), smart moderation, and strict human-in-the-loop governance.

---

## 🏛️ Engineering Governance & AI Guidelines

This repository is governed by formal specifications and behavioral constraints designed for pair-programming and autonomous AI engineering agents.

* **Master Agent Rules:** [`AGENTS.md`](file:///c:/Users/siddh/Desktop/POPO%20-%20updrage/AGENTS.md) — The engineering constitution for all agents working in this repository.
* **AI Navigation & Context:** [`docs/AI-CONTEXT.md`](file:///c:/Users/siddh/Desktop/POPO%20-%20updrage/docs/AI-CONTEXT.md) — The primary orientation and document map for AI coding agents.
* **Documentation Architecture:** [`docs/README.md`](file:///c:/Users/siddh/Desktop/POPO%20-%20updrage/docs/README.md) — Structure and authority hierarchy of all project documents.

---

## 📚 Documentation Hierarchy

All project documentation resides in the [`docs/`](file:///c:/Users/siddh/Desktop/POPO%20-%20updrage/docs/) directory organized into the following structure:

```text
docs/
├── AI-CONTEXT.md          # Primary entry point & contract map for AI agents
├── README.md              # Documentation directory overview
│
├── contracts/             # Authoritative technical & behavioral specifications
│   ├── 00-project-context.md
│   ├── 01-product-contract.md
│   ├── 02-architecture-contract.md
│   ├── 05-domain-contract.md
│   ├── 06-api-contract.md
│   ├── 07-event-contract.md
│   ├── 08-data-contract.md
│   ├── 09-testing-contract.md
│   └── 10-demo-contract.md
│
├── planning/              # Implementation roadmap & task registry
│   ├── 03-build-roadmap.md
│   └── 04-task-board.md
│
├── research/              # Real-world problem validation & domain evidence
│   └── osm-step1-research-validation.md
│
├── ideation/              # Problem deconstruction & strategic direction selection
│   ├── osm-step0-problem-deconstruction.md
│   └── osm-step2-solution-ideation-master.md
│
└── quality-loops/         # Historical iterative quality loops (PRD, Arch, Build)
    ├── osm-step3-prd-quality-loop-master.md
    ├── osm-step4-architecture-quality-loop.md
    └── osm-step5-build-plan-quality-loop.md
```

---

## ⚡ Core Principles for Developers & AI Agents

1. **Read Before Building:** Always inspect [`AGENTS.md`](file:///c:/Users/siddh/Desktop/POPO%20-%20updrage/AGENTS.md) and [`docs/AI-CONTEXT.md`](file:///c:/Users/siddh/Desktop/POPO%20-%20updrage/docs/AI-CONTEXT.md) before writing or modifying code.
2. **Authoritative Contracts Govern:** The specifications in `docs/contracts/` represent the technical source of truth. Implementation code must conform to contracts; do not alter contracts to fit code.
3. **AI is Assistive, Not Final Authority:** In examination marking, AI models provide advisory recommendations only. Authoritative marks and academic decisions remain strictly under human examiner and moderator control.
4. **Deterministic & Auditable:** All marks, audit trails, and domain events must be persisted deterministically with optimistic concurrency and transactional consistency.
