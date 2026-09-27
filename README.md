# OSM — AI-Powered On-Screen Marking & Digital Evaluation Platform

**OSM** is a mission-critical digital examination evaluation platform engineered for universities and educational boards. It delivers end-to-end intelligence across the marking lifecycle—combining high-throughput digital evaluation workflows, automated quality anomaly detectors, human-in-the-loop escalation moderation, and strict tamper-evident audit trails.

---

## 🎯 The Problem

State examination boards and major universities process millions of handwritten answer sheets across short 30-day windows. Existing on-screen marking systems face severe systemic challenges:
- **Unchecked Answers & Missing Marks:** Evaluators accidentally skip pages or questions due to fatigue, leading to post-result litigation, court mandates, and public embarrassment.
- **Examiner Variance & Leniency/Strictness Outliers:** Evaluators grade with differing standards without real-time detection for examination controllers.
- **Risks of Autonomous AI Replacement:** Uncontrolled AI scoring leads to hallucinations, legal non-compliance under data privacy regulations (e.g. DPDP Act), and public mistrust.
- **Lack of Verifiable Audits:** Traditional systems lack append-only, tamper-evident audit trails that prove who graded, modified, or approved each mark.

---

## 💡 Core Capabilities (Verified & Implemented)

- **Interactive Evaluator Workspace:** Structured question-by-question scoring with rubric criteria display, live draft saving, and real-time total score calculation.
- **Deterministic Completeness Validation:** Server-side `CompleteCheckService` preventing premature submission of evaluations containing un-evaluated questions (`HTTP 422`).
- **Post-Submission Immutability:** Once submitted, evaluation records are locked against further modification (`HTTP 409 EVALUATION_LOCKED`, `INV-001`).
- **QualityPulse Anomaly Analytics:** Real-time statistical cohort-level outlier detection ($z$-score algorithms) flagging examiner leniency/strictness bias ($|z| \ge 2.0$).
- **EscalationHub Moderation Workflow:** Triage case management where chief moderators inspect anomaly evidence and issue binding academic determinations.
- **Non-Authoritative AI Advisory:** Structured advisory assistance (`POST /api/v1/ai/advisory`) offering evidence pointers and confidence scores with mandatory human review.
- **TrustLens Audit Trail:** Append-only, tamper-evident chronological audit logging recording all consequential operational and administrative actions.
- **Deterministic Demo Scenario & Recovery:** Admin-controlled seeding (`POST /api/v1/demo/seed`) and transactional, child-to-parent demo reset (`POST /api/v1/demo/reset`) with full non-demo data protection.

---

## 🏛️ AI Non-Authority Philosophy

> **AI is advisory and assistive. It does not independently assign final marks, submit evaluations, resolve moderation cases, seed demo data, or reset demo data.**

In OSM, all authoritative academic decisions remain strictly under human examiner and moderator control:
1. **Context Minimization:** AI receives strictly sanitized, anonymized statistical summaries with zero student PII (`02-architecture §28`).
2. **Schema-Validated Responses:** AI outputs are validated against strict JSON schemas and frozen in runtime memory (`Object.freeze`).
3. **Hard Role Boundaries:** Server-side authorization explicitly blocks AI actor roles from executing any mutation commands (`INV-003`, `INV-004`).
4. **Graceful Fallback:** If the AI provider fails, times out, or produces invalid output, the system seamlessly falls back to deterministic rule-based recommendations.

---

## 🏗️ System Architecture

OSM is built as a clean, modular TypeScript monorepo adhering to Hexagonal / Clean Architecture principles:

```text
apps/web (React 19, Vanilla CSS, Vite)
       │
       ▼ [HTTP / REST]
apps/api (Fastify 5, Node.js, TypeScript)
  ├── presentation/   (Routes, DTOs, Error Envelopes, Server-Side RBAC)
  ├── application/    (Commands, Queries, Services, Context Builder, UnitOfWork)
  ├── domain/         (Aggregates: Evaluation, Rubric, TriageCase, QualitySignal, Resolution)
  └── infrastructure/ (Kysely Query Builder, SQLite/WAL, Outbox Dispatcher, Adapters)
       │
       ▼
packages/shared (Domain Enums, DTO Types, Validation Schemas)
```

---

## 🚀 Quickstart & Setup

### Prerequisites
- Node.js >= 20.x
- npm >= 10.x

### Installation & Execution
```bash
# 1. Install dependencies
npm install

# 2. Run API server (port 3000)
npm run dev:api

# 3. Run Web application (port 5173) in a separate terminal
npm run dev:web
```

Open `http://localhost:5173` in your browser. Use the header persona switcher to toggle between **Examiner** (`EXAM-003`), **Moderator** (`MOD-001`), and **Administrator** (`ADMIN-001`).

---

## 🎬 Hackathon Demo Walkthrough

The complete 12-step live demo story, 10-scene presentation script, canonical personas, and judge FAQ are documented in:
👉 **[`docs/demo/HACKATHON-DEMO-GUIDE.md`](docs/demo/HACKATHON-DEMO-GUIDE.md)**

---

## 🧪 Verification & Test Status

The codebase is backed by comprehensive automated test suites and architectural invariant checks:

```text
Test Suites:                 31 / 31 passed (100%)
Tests:                       592 / 592 passed (100%)
TypeScript Compilation:      PASS (0 errors across @osm/shared, @osm/api, @osm/web)
Production Bundle Build:     PASS (Vite build in 737ms)
Formatting & Whitespace:     PASS (git diff --check clean)
API / Integration Testing:   PASS (Fastify integration suites cover 100% of routes)
UI Source-Level Audit:       PASS (Inspected against domain contracts)
Browser E2E Automation:      NOT CONFIGURED (No Playwright/Cypress runner in devDependencies)
```

---

## 📚 Documentation Directory

- [`docs/demo/HACKATHON-DEMO-GUIDE.md`](docs/demo/HACKATHON-DEMO-GUIDE.md) — Master Hackathon Demo Guide & Presentation Script
- [`AGENTS.md`](AGENTS.md) — AI Agent Constitution & Engineering Governance
- [`docs/AI-CONTEXT.md`](docs/AI-CONTEXT.md) — Document Map and Navigation for AI Engineers
- [`docs/contracts/`](docs/contracts/) — Authoritative Technical & Behavioral Specifications
- [`docs/planning/04-task-board.md`](docs/planning/04-task-board.md) — Active Implementation Task Board
- [`docs/12-project-state.md`](docs/12-project-state.md) — Project State & Execution Log
- [`docs/13-traceability.md`](docs/13-traceability.md) — Verification & Requirements Traceability Matrix
