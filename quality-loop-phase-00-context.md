# QualityLoop — Phase 00 Context

> Records **actual repository state** after Phase 00. Handoff artifact for the next coding-agent session.

## 1. Phase Identity
- Phase: 0
- Name: Repository Inspection & Build Baseline
- Phase status: `COMPLETE` (conditional on human Review Gate A; see §31)
- Completion date: 2026-09-24
- Context version: v1
- Previous context: none (first phase)
- Next phase: Phase 1 — Foundation & Shared Contracts
- Active approved context: YES (pending Review Gate A sign-off)

## 2. Objective
Understand the real repository before modifying it. Answer: what exists, what is missing, what can be reused, what must change, what must not change, and how Phase 1 builds on this.

## 3. Scope Completed

| Task ID | Work item | Status | Evidence |
|---|---|---|---|
| P00-001 | Repository inventory | VERIFIED | `ls` of `/mnt/user-data/uploads`, `/mnt/user-data/outputs`, `/home/claude`: no project files |
| P00-002 | Runtime/framework detection | VERIFIED | No `package.json`, `pyproject.toml`, or equivalent found |
| P00-003 | Package/dependency inventory | VERIFIED | None exists |
| P00-004 | Database detection | VERIFIED | No DB config, migrations, or ORM; no `psql`/`sqlite3` binary in the environment |
| P00-005 | Routes/pages, tests, domain models, auth, config, seed data | VERIFIED | None exist |
| P00-006 | Build/test command discovery | VERIFIED | No project commands exist; only toolchain versions recorded (§39) |
| P00-007 | Architecture-to-repository mapping | VERIFIED | See §5 table: all Step 4 components are unbuilt |
| P00-008 | Conflict check vs Step 3/4/5 | VERIFIED | No conflicts (nothing to conflict with); document-level notes in §33 |

## 4. Scope Not Completed

| Task ID | Work item | Status | Reason | Target phase |
|---|---|---|---|---|
| — | Repository creation / scaffolding | DEFERRED | Phase 0 must not create modules or redesign; needs stack decision | Phase 1 |
| — | Technology stack selection + ADRs | DEFERRED | Requires human decision at Review Gate A | Phase 1 |

## 5. Repository State

### Relevant directories
```text
/mnt/user-data/uploads/   empty
/mnt/user-data/outputs/   docs/build-context/quality-loop-phase-00-context.md (this file only)
/home/claude/             tool caches only (.cache, .config, .local, .npm, .npm-global)
```

### Current branch / commit
```text
No git repository. No branch, no commit.
```

### Build/test commands
```text
None exist yet.
```

### Repository Reality Check

| Area | Planned | Actual | Status |
|---|---|---|---|
| Auth | Seeded users + RBAC (EVALUATOR/MODERATOR/COE/ADMINISTRATOR) | Nothing | NOT_STARTED |
| Database | Single relational DB, migrations, deterministic seed | Nothing | NOT_STARTED |
| API | Capability-grouped API (`/api/cycles`, `/api/signals`, …) | Nothing | NOT_STARTED |
| UI | Evaluator / Moderator / COE / Admin views | Nothing | NOT_STARTED |
| Tests | Unit, integration, API, UI, E2E quality-loop | Nothing | NOT_STARTED |
| Configuration | Env-based config, AI on/off flag | Nothing | NOT_STARTED |

### Discrepancies
- None. The repository is greenfield.
- Document note: Step 4 §107 lists a different phase order (Audit as Phase 6, QualityPulse as 7, etc.). Per Step 5 §8.1, the Step 5 canonical Phase 0–12 map is the only authoritative numbering; Step 4's is reference-only.
- Document note: Step 5 §5 lists phase statuses `NOT_STARTED | IN_PROGRESS | BLOCKED | COMPLETE | DEFERRED`, while §17 adds `IMPLEMENTED | VERIFIED`. This context uses the §5/template vocabulary for phase status and `IMPLEMENTED/VERIFIED` only for work items. Human should confirm.
- Document note: Step 4 §25 names the case state `CALIBRATION_REQUESTED`; Step 5 Phase 5 names it `NEEDS_MORE_DATA` plus a separate "request calibration" action. To be reconciled in Phase 5 (recorded in §22).

## 6. Files Created
- `docs/build-context/quality-loop-phase-00-context.md`

## 7. Files Modified
- None

## 8. Files Deleted
- None

## 9. Database / Schema Changes
### Schema change
- None

### Migration
```text
Migration added: N/A
Migration tested: N/A
Migration reversible: N/A
Seed updated: N/A
Existing-data impact: None (no data)
Rollback considerations: N/A
```

## 10. API / Contract Changes
```text
New: none
Modified: none
Removed: none
Authorization: N/A
Backward compatibility: N/A
Frontend consumers: none
Contract tests: none
```

## 11. Domain Model Changes
- None. Planned logical entities (Step 4 §14) remain unimplemented.

## 12. Architecture Decisions
- Decision: No architecture decisions made in Phase 0.
- Reason: Phase 0 must not redesign or select technology.
- Impact: Stack, database, and frontend/backend boundary are open items for Phase 1 ADRs (Step 4 §75) after human input.

## 13. Invariants Preserved
- Authoritative marks remain authoritative (no code exists to violate this).
- Derived intelligence does not overwrite authoritative state.
- QualitySignal and TriageCase remain separate.
- Event-aware does not become full event sourcing.
- UI visibility does not imply authorization.
- AI remains bounded/advisory.

## 14. New Invariants
- None.

## 15. Configuration / Environment
- Toolchain available in the build environment: Node v22.22.2, npm 10.9.7, Python 3.12.3, git 2.43.0.
- No `psql` or `sqlite3` CLI detected (an embedded DB driver via npm/pip would still be possible).
- Network egress allowlist includes npm, PyPI, GitHub, and Yarn registries.

## 16. Dependencies
- Completed dependencies: none required for Phase 0.
- External dependencies: none.
- Deferred dependencies: stack choice (human decision).

## 17. Tests Added
None.

## 18. Tests Executed
```text
None (no test infrastructure exists).
```

## 19. Test Results
```text
Overall: N/A
Unit / Integration / API / UI-E2E / Regression: N/A
Determinism / Security-Authorization / Audit / Migration-Seed: N/A
```

## 20. Known Limitations
- The build environment's filesystem resets between tasks; the user must keep the repository somewhere persistent (e.g., GitHub) for later phases.
- Phase 0 verified the sandbox only. If a repository exists on the user's machine or GitHub, it was not visible here.

## 21. Technical Debt
- None.

## 22. Deferred Decisions
- Technology stack (frontend, backend, database, test runner).
- Repository location/hosting and how it persists across sessions.
- Reconcile case-state naming: `CALIBRATION_REQUESTED` (Step 4) vs `NEEDS_MORE_DATA` + request-calibration action (Step 5) — Phase 5.
- Confirm phase-status vocabulary (§5 vs §17 of Step 5).

## 23. Integration Points for Next Phase
- Phase 1 starts from an empty repository and creates the foundation (config, shared types, IDs, timestamps, error model, roles/authorization primitives, persistence/migration/seed conventions, test infrastructure, audit infrastructure contract, logging baseline).

## 24. Next Phase Preconditions
- [x] Previous phase gate is PASS
- [ ] Human resolves Review Gate A (repo location + stack direction)
- [ ] Required migrations are applied (N/A)
- [ ] Required contracts exist (none required)
- [ ] Other: repository initialized in a persistent location

## 25. Do Not Change Rules
```text
Canonical phase map (Step 5 §8.1) is the only phase numbering.
Preserve human authority; AI advisory only; deterministic logic authoritative where required.
Modular monolith; no microservices, brokers, or extra databases without ADR.
Synthetic data only; no real student PII.
Do not begin Phase 1 without explicit instruction.
```

## 26. Important Implementation Notes
- Greenfield: Phase 1 is free to choose the stack, but must record ADRs and keep the domain independent of DB, LLM provider, OSM vendor, and frontend framework (Step 4 §51).
- Step 4 favors one deployable app, a relational DB, and the ability to run with zero paid services.

## 27. Deterministic Demo / Seed State
```text
Development/test fixtures: none
Canonical demo dataset: none (Phase 10)
Seed command: none
Reset command: none
Determinism result: N/A
```

## 28. Security / Authorization State
```text
Roles: none implemented
Server-side enforcement: none
UI-only restrictions: none
Authorization tests: none
Known gaps: everything (Phase 1 onward)
```

## 29. Audit State
```text
Governed actions covered: none
Audit event fields: none
Atomicity/transaction behavior: N/A
Audit tests: none
Known gaps: audit infrastructure contract due in Phase 1
```

## 30. Handoff Summary

### Current system truth
No repository, code, database, tests, or configuration exist. Only planning documents (Steps 0–5 + template) exist, outside any repo.

### Next agent must start with
Human confirmation of Review Gate A items, then initialize the repository and read this context.

### Next agent must NOT do
Start Phase 1 unprompted; pick a stack silently; implement any Phase 2+ domain work.

### Recommended first task
Phase 1 task: repository initialization + ADR for stack selection.

## 31. Phase Gate Result

```text
Status: PASS

Gate evidence:
- What exists? Nothing (verified by directory listing and git search).
- What is missing? Everything in Step 4 architecture.
- What can be reused? Nothing; only the planning documents.
- What must be changed? N/A.
- What must not change? See §25.
- How will Phase 1 build on this repository? It creates the repository and foundation from scratch, after Review Gate A.
```

Review Gate A (Repository ↔ Architecture mapping) requires human sign-off before Phase 1.

## 32. Context Diff

### Before Phase
No context, no repository.

### Changes Made
Inspected the environment; created this context file. No code changes.

### After Phase
Baseline recorded: greenfield, toolchain known, open decisions listed.

## 33. Open Risks / Blockers

| Issue | Impact | Blocking? | Next action | Target phase |
|---|---|---|---|---|
| Stack not chosen | Phase 1 cannot scaffold | YES (for Phase 1 start) | Human picks stack at Review Gate A | Phase 1 |
| Repo persistence unclear (sandbox resets) | Later phases could lose work | YES (for Phase 1 start) | Human provides repo/remote or accepts downloads per phase | Phase 1 |
| Case-state naming mismatch (Step 4 vs Step 5) | Ambiguity in Phase 5 | NO | Reconcile before Phase 5 | Phase 5 |
| Status-vocabulary inconsistency in Step 5 | Minor confusion | NO | Human confirms | Phase 1 |

## 34. Source-of-Truth Impact

### Authoritative data affected
None.

### Derived data affected
None.

### No source-of-truth change
Confirmed.

## 35. Repository Reality Check — Final

| Area | Expected after phase | Actual after phase | Verified? |
|---|---|---|---|
| Auth | None | None | Yes |
| Database | None | None | Yes |
| API | None | None | Yes |
| UI | None | None | Yes |
| Tests | None | None | Yes |

## 36. Migration Safety
```text
Applicable: NO
```

## 37. API Contract Compatibility
```text
Applicable: NO
```

## 38. Next Phase Task Inputs

### Required task IDs
- Phase 1 tasks (IDs to be defined in the Phase 1 execution packet)

### Blocked tasks
- All Phase 1 scaffolding tasks, until stack and repo location are decided.

### Recommended first task
- Stack-selection ADR + repository init.

### Shared contracts to consume
- None yet.

### Integration points
- None yet.

## 39. Exact Commands

### Install
```text
None (no project). Toolchain check only.
```

### Development / Test / Lint / Typecheck / Seed / Reset / Build / Migration / Deploy / Smoke test
```text
None exist.
```

### Commands actually run in Phase 0
```text
ls -la /mnt/user-data/uploads /home/claude /mnt/user-data/outputs
find / -maxdepth 4 -name ".git" -not -path "/proc/*"
node -v; npm -v; python3 --version; git --version; which psql sqlite3
```

## 40. Final Handoff Statement

```text
Phase: 0
Phase status: COMPLETE (pending Review Gate A)
Gate: PASS
Repository verified: YES (greenfield)
Tests verified: N/A
Known blockers: stack decision; repo persistence
Next phase: 1 — Foundation & Shared Contracts
Recommended first task: stack-selection ADR + repo init
```

**STOP RULE:** Do not begin Phase 1 unless explicitly instructed.
