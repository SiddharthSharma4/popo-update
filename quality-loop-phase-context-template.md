# QualityLoop — Phase XX Context

> This file records **actual repository state** after Phase XX. It is a handoff artifact for the next coding-agent session. Do not write intended work as completed work.

## 1. Phase Identity
- Phase:
- Name:
- Phase status: `NOT_STARTED | IN_PROGRESS | BLOCKED | COMPLETE | DEFERRED`
- Completion date:
- Context version:
- Previous context:
- Next phase:
- Active approved context: YES/NO

## 2. Objective

## 3. Scope Completed

| Task ID | Work item | Status | Evidence |
|---|---|---|---|
| PXX-001 | | | |

## 4. Scope Not Completed

| Task ID | Work item | Status | Reason | Target phase |
|---|---|---|---|---|
| | | DEFERRED/BLOCKED | | |

## 5. Repository State

### Relevant directories

```text
```

### Current branch / commit

```text
```

### Build/test commands

```text
```

### Repository Reality Check

| Area | Planned | Actual | Status |
|---|---|---|---|
| Auth | | | |
| Database | | | |
| API | | | |
| UI | | | |
| Tests | | | |
| Configuration | | | |

### Discrepancies

- None / ...

## 6. Files Created

## 7. Files Modified

## 8. Files Deleted

## 9. Database / Schema Changes

### Schema change
- None / ...

### Migration

```text
Migration added:
Migration tested:
Migration reversible:
Seed updated:
Existing-data impact:
Rollback considerations:
```

## 10. API / Contract Changes

### Endpoints

```text
New:
Modified:
Removed:
```

### Request / response changes

```text
```

### Authorization

```text
```

### Contract compatibility

```text
Backward compatibility:
Frontend consumers:
Contract tests:
```

## 11. Domain Model Changes

## 12. Architecture Decisions

## 13. Invariants Preserved

- Authoritative marks remain authoritative.
- Derived intelligence does not overwrite authoritative state.
- QualitySignal and TriageCase remain separate.
- Event-aware does not become full event sourcing.
- UI visibility does not imply authorization.
- AI remains bounded/advisory.
- Add phase-specific invariants here.

## 14. New Invariants

## 15. Configuration / Environment

## 16. Dependencies

## 17. Tests Added

| Test | Type | Task ID | Purpose |
|---|---|---|---|
| | | | |

## 18. Tests Executed

```text
```

## 19. Test Results

```text
Overall:
Unit:
Integration:
API:
UI/E2E:
Regression:
Determinism:
Security/Authorization:
Audit:
Migration/Seed:
```

## 20. Known Limitations

## 21. Technical Debt

## 22. Deferred Decisions

## 23. Integration Points for Next Phase

## 24. Next Phase Preconditions

- [ ] Previous phase gate is PASS
- [ ] Required migrations are applied
- [ ] Required contracts exist
- [ ] Required tests pass
- [ ] Required seed/fixture state exists
- [ ] Required authorization boundaries exist
- [ ] Required audit behavior exists where applicable
- [ ] Other:

## 25. Do Not Change Rules

List constraints the next agent must preserve.

```text
```

## 26. Important Implementation Notes

## 27. Deterministic Demo / Seed State

```text
Development/test fixtures:
Canonical demo dataset:
Seed command:
Reset command:
Determinism result:
```

## 28. Security / Authorization State

```text
Roles:
Server-side enforcement:
UI-only restrictions:
Authorization tests:
Known gaps:
```

## 29. Audit State

```text
Governed actions covered:
Audit event fields:
Atomicity/transaction behavior:
Audit tests:
Known gaps:
```

## 30. Handoff Summary

### Current system truth

### Next agent must start with

### Next agent must NOT do

### Recommended first task

## 31. Phase Gate Result

```text
Status: PASS / BLOCKED / FAILED

Gate evidence:
- 
```

A phase is `COMPLETE` only when this result is `PASS`.

## 32. Context Diff

### Before Phase

### Changes Made

### After Phase

## 33. Open Risks / Blockers

| Issue | Impact | Blocking? | Next action | Target phase |
|---|---|---|---|---|
| | | | | |

## 34. Source-of-Truth Impact

### Authoritative data affected

### Derived data affected

### No source-of-truth change

## 35. Repository Reality Check — Final

| Area | Expected after phase | Actual after phase | Verified? |
|---|---|---|---|
| Auth | | | |
| Database | | | |
| API | | | |
| UI | | | |
| Tests | | | |

## 36. Migration Safety

```text
Applicable: YES/NO
Migration:
Applied:
Tested:
Reversible:
Seed compatibility:
Existing-data compatibility:
Rollback:
```

## 37. API Contract Compatibility

```text
Applicable: YES/NO
New endpoints:
Modified endpoints:
Removed endpoints:
Request schema:
Response schema:
Authorization:
Backward compatibility:
Consumers updated:
Contract tests:
```

## 38. Next Phase Task Inputs

### Required task IDs

- PXX-001

### Blocked tasks

- None / ...

### Recommended first task

- PXX-001

### Shared contracts to consume

- ...

### Integration points

- ...

## 39. Exact Commands

### Install

```text
```

### Development

```text
```

### Test

```text
```

### Lint

```text
```

### Typecheck

```text
```

### Seed

```text
```

### Reset

```text
```

### Build

```text
```

### Migration

```text
```

### Deploy

```text
```

### Smoke test

```text
```

## 40. Final Handoff Statement

```text
Phase:
Phase status:
Gate:
Repository verified:
Tests verified:
Known blockers:
Next phase:
Recommended first task:
```

**STOP RULE:** After generating this context, do not begin the next phase unless explicitly instructed.
