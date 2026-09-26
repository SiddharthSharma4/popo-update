# 09 — Testing Contract

**Project:** OSM — AI-Powered On-Screen Marking & Digital Evaluation System
**Document:** `docs/contracts/09-testing-contract.md`
**Status:** Authoritative
**Version:** 1.0
**Last Updated:** 2026-09-26

---

# 1. Purpose

This document defines the authoritative testing contract for OSM.

It specifies:

* testing responsibilities
* testing boundaries
* required test layers
* domain invariants
* API contract verification
* event contract verification
* persistence verification
* audit verification
* concurrency verification
* idempotency verification
* AI and detector boundary verification
* authorization verification
* workflow verification
* failure and recovery testing
* integration testing
* end-to-end testing
* regression requirements
* test data rules
* CI expectations
* implementation rules for AI coding agents

This document does not define new business behavior.

The behavior being tested must originate from the authoritative:

* Product/System Contract
* Architecture Contract
* Security Contract
* UX/Workflow Contract
* Domain Contract
* API Contract
* Event Contract
* Data Contract

The Testing Contract verifies that the implementation conforms to those contracts.

---

# 2. Testing Philosophy

OSM testing follows one fundamental principle:

> **Every authoritative behavior must be provable through deterministic, repeatable tests.**

Testing must not be limited to whether an API returns the expected HTTP status.

A meaningful OSM test may need to verify:

```text
Input
  ↓
Authentication
  ↓
Authorization
  ↓
Application operation
  ↓
Domain rules
  ↓
Authoritative state transition
  ↓
Persistence
  ↓
Audit
  ↓
Outbox event
  ↓
Event delivery
  ↓
Consumer behavior
```

The exact layers required depend on the behavior being tested.

---

# 3. Core Testing Model

OSM uses multiple complementary testing layers.

```text
                 ┌──────────────────────┐
                 │   End-to-End Tests   │
                 └──────────┬───────────┘
                            │
                 ┌──────────▼───────────┐
                 │ Workflow/API Tests  │
                 └──────────┬───────────┘
                            │
                 ┌──────────▼───────────┐
                 │ Integration Tests    │
                 └──────────┬───────────┘
                            │
                 ┌──────────▼───────────┐
                 │ Application Tests    │
                 └──────────┬───────────┘
                            │
                 ┌──────────▼───────────┐
                 │   Domain Tests       │
                 └──────────┬───────────┘
                            │
                 ┌──────────▼───────────┐
                 │   Unit Tests         │
                 └──────────────────────┘
```

No single testing layer is sufficient for the entire system.

---

# 4. Test Pyramid

OSM should prefer a test pyramid rather than relying primarily on end-to-end tests.

```text
                  /\
                 /  \
                / E2E\
               /------\
              /Workflow\
             /----------\
            / Integration \
           /--------------\
          / Application    \
         /------------------\
        /   Domain / Unit    \
       /______________________\
```

The expected distribution is:

```text
Many
  ↓
Domain / Unit Tests

Moderate
  ↓
Application / Integration Tests

Fewer
  ↓
API / Workflow Tests

Smallest necessary set
  ↓
End-to-End Tests
```

The exact numerical ratio is not mandated unless another contract explicitly defines it.

---

# 5. Testing Boundaries

Tests must respect architectural boundaries.

The following boundaries are mandatory:

```text
UI
 ↓
API
 ↓
Application
 ↓
Domain
 ↓
Persistence
```

Tests must not encourage implementations that bypass these boundaries.

For example:

```text
Frontend
   ❌
   ↓
Database
```

or:

```text
Controller
   ❌
   ↓
ORM mutation
```

must not become the implementation pattern merely to make a test pass.

---

# 6. Authoritative Test Source

When multiple documents describe the same behavior, tests must follow the higher-authority contract according to the project's contract hierarchy.

Testing must not silently invent behavior that is absent from the authoritative contracts.

For example, a test must not invent:

```text
Evaluation.status = VALIDATED
```

unless the Domain Contract defines that state.

Similarly, a test must not assume:

```text
Resolution can be edited
```

unless the applicable contract permits that behavior.

---

# 7. Contract-Driven Testing

Every externally meaningful requirement should map to one or more test scenarios.

The preferred relationship is:

```text
Contract Requirement
       ↓
Test Scenario
       ↓
Implementation
       ↓
Automated Test
```

For example:

```text
Requirement:
Only authorized moderators may resolve triage cases.

Tests:
✓ authorized moderator succeeds
✓ unauthenticated user rejected
✓ authenticated unauthorized user rejected
✓ invalid case state rejected
```

---

# 8. Test Categories

OSM recognizes the following primary test categories:

1. Unit tests
2. Domain tests
3. Application-service tests
4. Integration tests
5. API tests
6. Contract tests
7. Persistence tests
8. Event tests
9. Audit tests
10. Security/authorization tests
11. Concurrency tests
12. Idempotency tests
13. Failure/recovery tests
14. AI/detector boundary tests
15. Workflow tests
16. End-to-end tests
17. Regression tests
18. Smoke tests

Not every feature requires every category.

The required layers must be selected according to risk and architectural responsibility.

---

# 9. Unit Testing

Unit tests verify isolated deterministic behavior.

Examples include:

```text
mark range validation
score calculation
state transition rules
version comparison
permission decision
event envelope construction
input normalization
detector rule
domain invariant
```

Unit tests should be:

* deterministic
* fast
* isolated
* repeatable
* independent of external infrastructure where practical

---

# 10. Domain Testing

The Domain layer is one of the highest-priority testing areas.

Domain tests must verify:

```text
valid state transitions
invalid state transitions
invariants
business rules
authorization-relevant domain constraints
concurrency assumptions
immutable historical information
resolution rules
evaluation rules
quality-signal semantics
```

Example:

```text
Evaluation
    IN_PROGRESS
        ↓
    Submit
        ↓
    SUBMITTED
```

must be tested.

An invalid transition such as:

```text
FINALIZED
   ↓
Submit
```

must be rejected if prohibited by the Domain Contract.

---

# 11. Domain Invariant Testing

Every invariant defined by the Domain Contract must have corresponding test coverage.

Examples:

```text
Marks cannot exceed permitted limits.

A finalized authoritative result cannot be silently mutated.

An unauthorized actor cannot perform a protected transition.

A Resolution cannot be silently overwritten.

AI output cannot directly become an authoritative decision.

A QualitySignal is not itself a Resolution.
```

The exact invariant set must remain aligned with the Domain Contract.

---

# 12. Application-Service Testing

Application services orchestrate use cases.

Tests must verify that the application layer correctly coordinates:

```text
authentication context
authorization
domain operation
persistence
audit requirements
outbox requirements
idempotency
response mapping
```

Application tests should not duplicate every internal domain rule already covered by domain tests.

Instead they verify orchestration.

---

# 13. Authentication Testing

Protected operations must verify authentication behavior.

At minimum, test:

```text
Unauthenticated request
    ↓
Rejected
```

and:

```text
Authenticated request
    ↓
Authentication context established
```

Tests must also verify that authentication failure does not accidentally reach protected domain operations.

---

# 14. Authorization Testing

Authentication and authorization must be tested separately.

Example:

```text
Unauthenticated
      ↓
401 / contract-defined equivalent
```

while:

```text
Authenticated but unauthorized
      ↓
403 / contract-defined equivalent
```

The exact response semantics must follow the API/Security Contract.

Role-based access must be tested for every protected operation.

Example:

```text
Evaluator
   → evaluate

Moderator
   → triage / resolve

Administrator
   → administrative operations
```

The actual role capabilities must come from the Security and Domain Contracts.

---

# 15. Negative Authorization Tests

Every sensitive operation must have negative authorization tests.

For example:

```text
✓ authorized moderator can resolve
✓ evaluator cannot resolve
✓ unrelated user cannot resolve
✓ unauthenticated user cannot resolve
```

Testing only the successful authorization path is insufficient.

---

# 16. API Testing

API tests verify the public API contract.

They must cover:

```text
request validation
authentication
authorization
successful response
error response
status codes
response structure
field semantics
pagination where applicable
idempotency behavior
concurrency conflicts
resource-not-found behavior
```

API tests must not rely only on controller implementation details.

They should verify observable contract behavior.

---

# 17. API Contract Compatibility

API responses must remain compatible with the API Contract.

Tests should detect:

```text
missing required fields
unexpected semantic changes
wrong data types
incorrect status codes
incorrect error structure
incorrect null/omitted behavior
```

A breaking API change must require an intentional contract update.

Tests must not simply be modified to accept an accidental breaking change.

---

# 18. Command Testing

Commands and application operations must be tested independently from events.

The following distinction must remain explicit:

```text
Command:
"Submit this evaluation."

Event:
"Evaluation was submitted."
```

Tests must not treat the two as interchangeable.

---

# 19. Event Testing

Events must be tested according to `07-event-contract.md`.

Tests should verify:

```text
eventId
eventType
eventVersion
aggregateId
occurredAt
producer
actor
correlationId
causationId
payload
```

where required by the event contract.

---

# 20. Event Identity Testing

An event retry must preserve event identity.

For the same persisted event:

```text
eventId
eventType
eventVersion
occurredAt
payload
```

must remain stable according to the Event Contract.

A retry must not create a new logical event merely because delivery was attempted again.

---

# 21. Event Version Testing

Consumers must explicitly handle supported event versions.

Tests must verify that:

```text
supported version
    ↓
processed
```

and:

```text
unsupported version
    ↓
explicit handling
```

Unsupported versions must not be silently interpreted as the latest known version.

The exact quarantine/rejection behavior must follow the event infrastructure contract.

---

# 22. Event Ordering Testing

Where causal ordering is required within an aggregate, tests must verify the required ordering semantics.

For example:

```text
EvaluationCreated
      ↓
EvaluationSubmitted
      ↓
EvaluationFinalized
```

must not be processed in an order that violates the applicable domain/event contract.

Global ordering across unrelated aggregates is not assumed unless explicitly required.

---

# 23. Event Consumer Testing

Every meaningful event consumer must have tests covering:

```text
valid event
duplicate event
malformed event
unsupported version
temporary failure
permanent failure
retry
idempotent processing
```

Consumers must not assume exactly-once delivery unless explicitly guaranteed by the architecture.

The default expectation is:

```text
at-least-once delivery
+
idempotent consumer behavior
```

where applicable.

---

# 24. Event ≠ Audit Testing

Tests must preserve the distinction:

```text
Domain Event
    ≠
AuditEvent
    ≠
Application Log
    ≠
Outbox Record
```

A domain event must not automatically be treated as an audit record unless the applicable contract requires an audit record.

Likewise, an application log must not be accepted as a substitute for a required durable AuditEvent.

---

# 25. Outbox Testing

The outbox is a critical reliability boundary.

Tests must verify:

```text
authoritative state
        +
required outbox record
        ↓
same persistence transaction
```

The required invariant is:

```text
State committed
AND
required outbox record committed
```

or:

```text
Neither committed
```

for operations covered by the transactional outbox requirement.

---

# 26. Outbox Failure Testing

Test the following cases:

```text
Database transaction fails
Outbox insertion fails
Domain persistence fails
Event dispatcher unavailable
Consumer unavailable
Consumer returns temporary failure
Consumer permanently rejects event
Dispatcher restarts
Application restarts
```

The expected behavior must follow the Data and Event Contracts.

---

# 27. Delivery vs Persistence Testing

Tests must distinguish:

```text
Persistence guarantee
```

from:

```text
Delivery guarantee
```

Example:

```text
Domain state = committed
Outbox record = committed
Dispatcher = temporarily unavailable
```

This is not automatically a domain failure.

The outbox record should remain available for later delivery according to the implementation contract.

---

# 28. Domain State vs Event Processing State

Tests must not confuse infrastructure processing state with domain state.

For example:

```text
Outbox delivery FAILED
```

does not automatically mean:

```text
Evaluation FAILED
```

Similarly:

```text
Event processing pending
```

does not automatically mean:

```text
TriageCase pending
```

unless the Domain Contract explicitly defines that relationship.

---

# 29. Persistence Testing

Persistence tests verify the Data Contract.

They should cover:

```text
required records
relationships
constraints
nullability
unique constraints
foreign keys
version fields
timestamps
transaction behavior
audit persistence
outbox persistence
idempotency persistence
```

---

# 30. Persistence Mapping Testing

The persistence model must remain separate from the domain/API model.

Tests should verify:

```text
Database row
    ↓
Persistence model
    ↓
Mapper
    ↓
Domain/Application model
```

and:

```text
Domain/Application model
    ↓
Mapper
    ↓
Persistence model
    ↓
Database
```

ORM entities must not automatically become API DTOs.

---

# 31. Transaction Testing

Operations requiring atomic persistence must be tested as transactions.

For example:

```text
Update Evaluation
+
Create OutboxEvent
+
Create required AuditEvent
```

must either:

```text
ALL COMMIT
```

or:

```text
ALL ROLLBACK
```

according to the Data Contract.

Partial persistence must be treated as a defect where atomicity is required.

---

# 32. Optimistic Concurrency Testing

Optimistic concurrency is mandatory wherever required by the Data Contract.

Example:

```text
Stored version = 8
Request version = 8
```

Operation succeeds and produces:

```text
version = 9
```

A stale request:

```text
Stored version = 9
Request version = 8
```

must produce the contract-defined conflict behavior.

Tests must verify that stale writes cannot silently overwrite newer authoritative state.

---

# 33. Concurrent Request Testing

At least the important high-risk workflows should be tested under concurrent access.

Examples:

```text
Two moderators resolve the same case.

Two requests update the same evaluation.

The same submission request arrives concurrently.

Two consumers process the same event.
```

The system must produce a deterministic contract-compliant result.

---

# 34. Command Idempotency Testing

Command idempotency and event idempotency are separate concerns.

Tests must verify that a repeated command with the same valid idempotency key does not create duplicate consequential effects where idempotency is required.

Example:

```text
Request A
Idempotency-Key = X

Request A repeated
Idempotency-Key = X
```

must resolve to the same logical operation according to the API contract.

---

# 35. Idempotency Scope Testing

The Data Contract defines idempotency keys as scoped.

Tests must verify the intended uniqueness boundary.

Conceptually:

```text
(scope, idempotencyKey)
```

rather than assuming that an idempotency key must be globally unique across the entire system.

The exact scope must follow the API/Data Contract.

---

# 36. AI Boundary Testing

AI is an advisory/detection component unless another authoritative contract explicitly defines otherwise.

Tests must ensure:

```text
AI output
    ↓
Recommendation / Analysis / Signal
```

does not directly mutate authoritative state.

The prohibited pattern is:

```text
AI output
    ↓
Direct authoritative mutation
```

unless explicitly authorized by the higher-level contracts.

---

# 37. AI Recommendation Testing

AI recommendations must be treated as advisory information.

Tests should verify:

```text
AI recommendation generated
        ↓
stored as advisory information
        ↓
human/application workflow
        ↓
authorized command
        ↓
authoritative state
```

A recommendation must not automatically become:

```text
Resolution
Final evaluation result
Disciplinary decision
Authoritative mark
```

unless explicitly defined by an authoritative contract.

---

# 38. AI Failure Testing

AI integrations must be tested for:

```text
timeout
unavailable model
malformed output
invalid schema
low-confidence output
provider failure
partial response
unexpected response
duplicate response
```

The system must fail safely.

AI failure must not silently create an authoritative decision.

---

# 39. AI Determinism Boundary

AI outputs may not always be deterministic.

Therefore tests should distinguish:

```text
AI integration contract
```

from:

```text
AI semantic quality
```

Where exact AI output is not contractually deterministic, tests should validate:

```text
schema
required fields
allowed ranges
provenance
model/version information
error handling
authority boundary
```

rather than requiring an identical generated sentence.

---

# 40. Detector Testing

Deterministic detectors should be tested more strictly than probabilistic AI outputs.

Where a detector is deterministic:

```text
same input
+
same detector version
+
same configuration
```

should produce the same defined result.

Tests must capture detector version/configuration where required for reproducibility.

---

# 41. QualitySignal Testing

QualitySignal tests must verify that a signal remains a signal.

For example:

```text
QualitySignalGenerated
```

must not automatically imply:

```text
ResolutionCreated
```

or:

```text
EvaluationCorrected
```

unless another explicit workflow performs that transition.

Tests should also verify provenance such as:

```text
detector/model version
evaluation version
source
evidence
```

where required by the Data/Event Contracts.

---

# 42. Triage Workflow Testing

The triage workflow must be tested as a stateful workflow.

Conceptually:

```text
QualitySignal
     ↓
TriageCaseCreated
     ↓
Assignment
     ↓
Investigation
     ↓
Authorized Resolution
```

Tests must verify both valid and invalid transitions.

Examples:

```text
✓ valid assignment
✓ valid unassignment
✓ valid resolution

✗ unauthorized resolution
✗ resolution from invalid state
✗ invalid assignment
✗ duplicate consequential transition
```

The exact state machine must follow the Domain Contract.

---

# 43. Resolution Testing

A Resolution is an authoritative outcome where defined by the Domain Contract.

Tests must verify:

```text
authorization
valid case state
concurrency
persistence
audit requirement
event requirement
immutability/history rules
```

A Resolution must not be silently overwritten.

Any correction/reversal behavior must follow the Domain Contract rather than being invented by tests or implementation.

---

# 44. Audit Testing

Audit behavior must be tested independently from application logging.

Where an operation is contractually auditable, tests must verify:

```text
operation occurred
        ↓
required AuditEvent persisted
```

Audit tests should verify relevant fields such as:

```text
actor
operation
target
timestamp
correlation information
relevant change information
```

according to the Audit/Event/Data Contracts.

---

# 45. Audit Immutability Testing

Where audit records are contractually immutable, tests must verify:

```text
existing audit record
       ↓
cannot be silently modified
```

and:

```text
ordinary CRUD delete
       ↓
rejected
```

Retention/deletion behavior must follow explicit policy and must not be invented by the test suite.

---

# 46. Historical Reproducibility Testing

Historical evaluation interpretation must remain reproducible.

Tests must verify that historical records retain required references such as:

```text
rubric version
detector version
AI/model version where applicable
configuration/provenance where required
evaluation version
```

Changing the current configuration must not silently rewrite historical interpretation.

---

# 47. Versioned Rule Testing

For versioned rubrics, detectors, or models:

```text
Historical record
    ↓
uses historical version
```

and:

```text
New record
    ↓
uses current approved version
```

must be distinguishable.

Tests must verify that current configuration changes do not retroactively mutate historical records.

---

# 48. Data Validation Testing

Tests must cover semantic distinctions such as:

```text
null
omitted
empty
zero
false
```

according to the API and Domain contracts.

The Data Contract must not be interpreted as allowing all of these values interchangeably.

---

# 49. Timestamp Testing

At application/API/event boundaries, timestamps must follow the contract-defined UTC representation.

Tests should verify:

```text
timezone correctness
serialization correctness
parsing correctness
round-trip behavior
```

Database-native timestamp types may be used internally where specified by the Data Contract.

Tests must not depend on local machine timezone.

---

# 50. Test Clock Control

Time-dependent tests should use an injectable/fake clock where practical.

Tests must not depend on the actual wall-clock time for deterministic behavior.

For example:

```text
Fixed test time
    ↓
createdAt
occurredAt
updatedAt
```

must be reproducible.

---

# 51. External Integration Testing

External integrations must be tested through explicit adapters.

Tests must verify:

```text
external input
    ↓
adapter
    ↓
validated internal representation
    ↓
application command/workflow
```

External payloads must not directly mutate domain state.

---

# 52. External Failure Testing

For external systems, test:

```text
timeout
connection failure
authentication failure
invalid response
rate limit
temporary outage
permanent failure
duplicate delivery
malformed payload
```

The system must fail according to the integration contract without bypassing domain validation.

---

# 53. Notification Testing

Notifications, where implemented, are derived behavior unless another contract defines them as authoritative.

Tests must verify that:

```text
Domain Event
    ↓
Notification
```

does not mutate authoritative state merely because notification processing occurs.

A notification failure must not silently roll back an already committed authoritative transaction unless explicitly designed by the relevant contract.

---

# 54. Workflow Testing

Workflow tests verify complete business scenarios without necessarily requiring the full browser/UI stack.

Example:

```text
Create evaluation
      ↓
Update evaluation
      ↓
Submit evaluation
      ↓
Generate quality signal
      ↓
Create triage case
      ↓
Assign case
      ↓
Resolve case
      ↓
Audit + event
```

The exact workflow must follow the UX/Workflow and Domain Contracts.

---

# 55. End-to-End Testing

End-to-end tests verify critical user-visible workflows across the actual application boundary.

E2E tests may cover:

```text
login
evaluation workflow
submission
moderation workflow
triage workflow
resolution
audit visibility
```

Only critical workflows should require full E2E coverage.

E2E tests must not replace lower-level domain and integration tests.

---

# 56. E2E Test Principles

E2E tests must be:

* deterministic where practical
* isolated
* independently resettable
* resistant to unrelated UI changes
* focused on critical workflows

Tests should assert meaningful user-visible outcomes rather than implementation details such as CSS class names unless necessary.

---

# 57. Frontend Testing

Frontend tests should verify:

```text
rendering
user interaction
form validation
loading state
error state
authorization-aware UI
API integration
critical navigation
```

The frontend must not be treated as the authority for business rules.

For example:

```text
Button hidden
```

is not sufficient authorization enforcement.

Backend/domain authorization must still be tested independently.

---

# 58. UI Authorization Testing

Tests should verify both:

```text
UI behavior
```

and:

```text
server enforcement
```

For example:

```text
Evaluator UI
   → does not expose moderator resolution controls
```

and independently:

```text
Evaluator manually calls resolution API
   → rejected
```

Hiding a UI control is not a security boundary.

---

# 59. Regression Testing

Every fixed defect that represents meaningful behavior should receive a regression test where practical.

Preferred flow:

```text
Bug
 ↓
Root cause
 ↓
Fix
 ↓
Regression test
```

The regression test should fail against the old defective implementation and pass against the corrected implementation where practical.

---

# 60. Smoke Testing

After deployment/build, a minimal smoke suite should verify that the application is operational.

Typical smoke checks:

```text
application starts
health endpoint works
database connection works
authentication works
basic API works
critical frontend loads
critical workflow entry point works
```

Smoke tests are not a substitute for the complete test suite.

---

# 61. Test Data Principles

Test data must be:

* deterministic
* isolated
* minimal
* representative
* reproducible
* non-sensitive

Production personal data must not be copied into ordinary development/test environments unless explicitly authorized and protected by the applicable security/data policy.

---

# 62. Test Fixtures

Fixtures should represent meaningful domain states.

Examples:

```text
EvaluationInProgress
EvaluationSubmitted
QualitySignalOpen
TriageCaseAssigned
TriageCaseResolved
```

Fixtures must not bypass domain invariants merely to create convenient database records.

If invalid database state is required for a recovery test, that should be an explicit infrastructure-level test.

---

# 63. Test Factories

Test factories may be used to reduce setup duplication.

However:

```text
Factory convenience
    ≠
Domain validity bypass
```

Factories should produce valid domain objects by default.

Invalid states should be created intentionally and explicitly for negative tests.

---

# 64. Test Isolation

Tests must not depend on execution order.

A test should not require:

```text
Test A runs before Test B
```

unless the test is explicitly part of a controlled workflow suite.

Database state, external mocks, event queues, and temporary files should be reset or isolated appropriately.

---

# 65. Test Determinism

Tests must not rely on:

```text
random timing
real external services
machine-specific paths
local timezone
uncontrolled randomness
unstable AI responses
shared mutable state
```

unless the purpose of the test is specifically to exercise such conditions.

---

# 66. Property-Based Testing

Property-based testing may be used for highly rule-driven areas such as:

```text
mark validation
score calculations
range validation
state transitions
serialization
```

It is optional unless a higher-level contract requires it.

The goal is to test invariants across broad input ranges rather than only a few examples.

---

# 67. Boundary Testing

High-risk boundaries require explicit tests.

Examples:

```text
minimum valid mark
maximum valid mark
below minimum
above maximum

version = current
version = stale
version = future/invalid

authorized actor
unauthorized actor
missing actor

supported event version
unsupported event version
```

Boundary tests should be prioritized around domain invariants.

---

# 68. Error Testing

Errors must be tested as contractual behavior.

Tests should verify:

```text
correct error classification
correct HTTP/API response
stable error structure
no sensitive information leakage
correct domain behavior
no unintended persistence
```

An error response must not expose:

```text
passwords
tokens
secrets
internal credentials
unnecessary database details
sensitive model/provider information
```

according to the Security Contract.

---

# 69. Transaction Rollback Testing

Where an operation performs multiple writes, tests must deliberately force failures at intermediate points.

Example:

```text
Persist evaluation
       ↓
Persist audit
       ↓
Persist outbox
       ↓
failure
```

The test must verify the transaction outcome required by the Data Contract.

This is particularly important for:

```text
authoritative state + audit + outbox
```

operations.

---

# 70. Dispatcher Failure Testing

The event dispatcher must be tested for:

```text
restart
crash
temporary network failure
consumer failure
duplicate delivery
long-running retry
```

Tests must verify that committed outbox records are not silently lost.

---

# 71. Retry Testing

Retries must be tested for:

```text
same logical event
same eventId
controlled retry behavior
no duplicate logical effects
eventual success where possible
dead-letter/quarantine behavior where defined
```

Retry policy must not create infinite uncontrolled loops.

---

# 72. Dead-Letter / Quarantine Testing

If the implementation includes dead-letter or quarantine handling, tests must verify:

```text
permanently failing event
      ↓
retry policy exhausted
      ↓
dead-letter/quarantine
```

The exact mechanism is infrastructure-specific and must not be introduced merely for architectural appearance.

---

# 73. Security Testing

Security testing must include:

```text
authentication
authorization
input validation
injection resistance
secret handling
session/token behavior
sensitive data exposure
access isolation
audit integrity
```

The exact security requirements come from the Security Contract.

---

# 74. Role Isolation Testing

Tests must verify that data and actions are appropriately isolated between actors.

Examples:

```text
Evaluator A
   cannot access
Evaluation B
```

when the Security/Domain Contracts prohibit that access.

Likewise:

```text
Moderator
   cannot perform
Administrator-only operation
```

unless explicitly authorized.

---

# 75. Multi-Tenant / Scope Testing

If OSM defines organizational, institutional, or other scopes, tests must verify that scope boundaries are enforced.

Example:

```text
Scope A user
   ❌
Scope B evaluation
```

The exact scoping model must come from the authoritative Security/Domain/Data contracts.

If no such scope exists, tests must not invent one.

---

# 76. Performance Testing

Performance testing should focus on contractually important workflows.

Examples:

```text
evaluation retrieval
evaluation submission
triage queue retrieval
case resolution
event dispatch
audit retrieval
```

Performance tests must not justify architectural changes that violate the existing contracts.

For example, adding Kafka or Redis solely because a local test is slow is not a valid architectural decision.

---

# 77. Load Testing

Load tests may be introduced when deployment requirements justify them.

They should evaluate:

```text
throughput
latency
resource utilization
database behavior
concurrency
queue behavior
failure recovery
```

The tested workload should represent realistic OSM workflows.

---

# 78. AI Performance vs AI Correctness

AI systems require a distinction between:

```text
integration correctness
```

and:

```text
model quality
```

Automated tests can reliably verify:

```text
input schema
output schema
provider integration
version/provenance
failure handling
authority boundary
persistence
workflow integration
```

Model quality may require separate evaluation datasets and evaluation methodology.

The Testing Contract must not treat a single deterministic unit test as proof of general AI correctness.

---

# 79. AI Evaluation Data

If an AI evaluation dataset is used, it must have:

```text
known purpose
controlled version
documented provenance
appropriate privacy controls
repeatable evaluation procedure
```

The dataset must not silently become production data.

---

# 80. Detector / Model Reproducibility

Where historical reproducibility is required, tests should verify that relevant outputs can be associated with:

```text
model version
detector version
configuration
input/evaluation version
```

This prevents current AI configuration from being incorrectly applied to historical results.

---

# 81. Observability Testing

Observability is not a substitute for testing.

However, critical workflows should produce enough operational information to diagnose failures.

Where defined by the architecture, test:

```text
correlationId propagation
causationId propagation
request identifiers
event identifiers
structured error information
```

Sensitive information must not be logged.

---

# 82. Correlation Testing

For a workflow such as:

```text
API Request
    ↓
Command
    ↓
Domain Event
    ↓
Outbox
    ↓
Consumer
```

tests should verify that required correlation/provenance identifiers remain correctly associated.

This supports debugging and auditability without changing domain semantics.

---

# 83. Test Coverage

Coverage must be interpreted by risk, not merely percentage.

High-risk areas should have stronger coverage:

```text
authorization
domain invariants
state transitions
concurrency
idempotency
transaction boundaries
audit
outbox
event processing
AI authority boundaries
```

A high global coverage percentage does not compensate for missing tests in these areas.

---

# 84. Coverage Thresholds

A single universal percentage threshold is not mandated by this contract unless explicitly defined by project governance.

The project should prefer:

```text
critical-path coverage
+
domain invariant coverage
+
contract coverage
```

over optimizing for a single global percentage.

If CI later defines numerical thresholds, those thresholds become implementation/governance configuration and must not contradict this contract.

---

# 85. Mutation Testing

Mutation testing may be used for critical domain rules.

It is particularly useful for verifying whether tests actually detect changes to:

```text
authorization rules
mark calculations
state transitions
concurrency checks
idempotency checks
```

It is optional unless explicitly required by project governance.

---

# 86. Test Naming

Test names should describe observable behavior.

Prefer:

```text
rejects_resolution_when_case_is_already_resolved
```

over:

```text
testResolve2
```

Good test names communicate:

```text
given condition
→
when operation
→
expected result
```

---

# 87. Test Structure

Where practical, use:

```text
Arrange
Act
Assert
```

Example:

```text
Arrange:
case is OPEN
actor is authorized
version is current

Act:
resolve case

Assert:
resolution persisted
case transitioned
audit persisted
outbox persisted
```

---

# 88. Contract Traceability

Important requirements should be traceable to tests.

A useful conceptual mapping is:

```text
Contract Requirement
        ↓
Requirement ID
        ↓
Test Scenario
        ↓
Automated Test
```

The exact tooling is implementation-specific.

The principle is mandatory:

> A critical contractual requirement must not exist without a practical verification strategy.

---

# 89. Test Matrix

The following matrix defines the minimum conceptual coverage.

| Area                  | Unit | Domain | Integration | API |       E2E |
| --------------------- | ---: | -----: | ----------: | --: | --------: |
| Authentication        |    — |      — |           ✓ |   ✓ |         ✓ |
| Authorization         |    ✓ |      ✓ |           ✓ |   ✓ |         ✓ |
| Evaluation rules      |    ✓ |      ✓ |           ✓ |   ✓ |         ✓ |
| Evaluation submission |    — |      ✓ |           ✓ |   ✓ |         ✓ |
| QualitySignal         |    ✓ |      ✓ |           ✓ |   ✓ | selective |
| Triage workflow       |    ✓ |      ✓ |           ✓ |   ✓ |         ✓ |
| Resolution            |    ✓ |      ✓ |           ✓ |   ✓ |         ✓ |
| Audit                 |    — |      ✓ |           ✓ |   ✓ | selective |
| Outbox                |    — |      — |           ✓ |   ✓ | selective |
| Event consumer        |    ✓ |      — |           ✓ |   — | selective |
| Concurrency           |    — |      ✓ |           ✓ |   ✓ | selective |
| Idempotency           |    — |      ✓ |           ✓ |   ✓ | selective |
| AI adapter            |    ✓ |      — |           ✓ |   ✓ | selective |
| External integrations |    ✓ |      — |           ✓ |   ✓ | selective |

`—` means the layer is generally not the primary test location, not that the behavior can never be tested there.

---

# 90. Critical Workflow Test Matrix

At minimum, the following workflows should have explicit scenario coverage where those workflows are implemented:

```text
1. Authentication
2. Authorized evaluation access
3. Evaluation update
4. Evaluation submission
5. Validation
6. QualitySignal generation
7. TriageCase creation
8. TriageCase assignment
9. TriageCase unassignment
10. TriageCase resolution
11. Audit creation
12. Outbox creation
13. Event dispatch
14. Event retry
15. Duplicate event handling
16. Concurrent update
17. Stale-version conflict
18. Command idempotency
19. AI recommendation handling
20. External integration failure
```

The exact activated workflow set must follow the current implementation roadmap.

---

# 91. Test Environment Separation

Environments should remain distinct.

Conceptually:

```text
Development
     ≠
Test
     ≠
Production
```

Test infrastructure must not accidentally write to production resources.

Production credentials must not be embedded in test fixtures.

---

# 92. Database Test Isolation

Database tests should use an isolated database/schema/transaction strategy appropriate to the test framework.

Tests must not depend on manually prepared shared production-like data unless explicitly required for a controlled environment test.

---

# 93. Migration Testing

Database migrations must be tested.

At minimum:

```text
fresh database
    ↓
all migrations
    ↓
valid schema
```

and, where applicable:

```text
previous schema
    ↓
migration
    ↓
new schema
```

Migration tests must verify that required historical data remains valid.

---

# 94. Seed Data Testing

Development/demo seed data must not be confused with authoritative production configuration.

Seed scripts should be:

```text
repeatable
safe
deterministic
environment-specific
```

They must not silently bypass domain invariants.

---

# 95. Test Doubles

Mocks, stubs, fakes, and spies may be used where appropriate.

However:

```text
Mocked dependency
    ≠
Proof that real dependency works
```

Critical infrastructure integrations should therefore also have integration tests.

Avoid excessive mocking of the Domain layer.

---

# 96. External AI Mocking

AI providers should generally be mocked/stubbed in deterministic automated tests.

Separate integration tests may verify the real provider adapter where permitted.

This prevents:

```text
provider availability
or
model randomness
```

from making the core test suite unstable.

---

# 97. Event Test Doubles

Event dispatch can be tested using an in-memory/test transport.

However, at least integration-level tests must verify the actual serialization and persistence boundaries used by the production architecture.

---

# 98. API Test Isolation

API tests should verify the complete relevant application path.

They should not bypass the application layer by directly inserting the expected database result unless the purpose is specifically a persistence test.

---

# 99. E2E Data Isolation

Every E2E scenario should have controlled test data.

A failed E2E test must not corrupt later E2E scenarios.

Tests should support:

```text
setup
→ execute
→ assert
→ cleanup/reset
```

or an equivalent isolated environment strategy.

---

# 100. Failure Injection

Critical reliability behavior should be tested through controlled failure injection.

Possible failures include:

```text
database failure
outbox failure
dispatcher failure
consumer failure
AI timeout
external API timeout
authorization failure
concurrency conflict
```

Failure injection must remain controlled and deterministic.

---

# 101. Recovery Testing

For recoverable failures:

```text
failure
 ↓
system retains required state
 ↓
recovery
 ↓
retry
 ↓
successful continuation
```

must be tested where applicable.

The system must not lose authoritative state because a derived workflow temporarily failed.

---

# 102. Partial Failure Testing

OSM must explicitly test partial failure boundaries.

Example:

```text
Authoritative state
      ✓ committed

Outbox delivery
      ✗ failed
```

Expected architecture:

```text
State remains committed
Outbox remains available
Delivery retries
```

The exact retry mechanism follows the Event/Data Contracts.

---

# 103. Restart Testing

The system should be tested across process restarts for critical durable workflows.

Examples:

```text
application restart after transaction
dispatcher restart with pending event
consumer restart during processing
```

Durable state must remain consistent.

---

# 104. Duplicate Delivery Testing

At-least-once delivery may result in:

```text
Event X
Event X again
```

Consumer tests must verify that duplicate delivery does not create duplicate logical effects.

This does not mean every event consumer must be globally idempotent in an identical way; the required strategy depends on the consumer.

---

# 105. Security Regression Testing

Security defects should receive regression tests.

Examples:

```text
authorization bypass
scope bypass
sensitive-data exposure
audit tampering
unauthorized mutation
```

Once fixed, the behavior must remain protected by automated tests where practical.

---

# 106. Accessibility Testing

Where the frontend contract requires accessibility, tests should verify critical accessibility behavior.

Examples:

```text
keyboard navigation
form labels
focus behavior
error messaging
semantic controls
contrast where applicable
```

The exact accessibility requirements follow the UX Contract.

---

# 107. Browser Compatibility Testing

If multiple browsers are supported by the UX/technical contract, critical workflows should be tested across the supported browser set.

Do not add browser support requirements solely through the Testing Contract.

---

# 108. Mobile/Responsive Testing

If responsive behavior is part of the UX Contract, tests should verify the required layouts and interactions.

Again:

```text
Testing Contract
    verifies
UX Contract
```

It does not independently define new UX requirements.

---

# 109. Test Review Rules

A test should be reviewed for:

```text
Does it verify contract behavior?
Is it deterministic?
Does it test the correct layer?
Does it accidentally encode implementation details?
Does it cover negative behavior where necessary?
Does it introduce unsupported assumptions?
```

---

# 110. Avoiding False Confidence

The following are not sufficient proof of correctness:

```text
✓ application starts
✓ endpoint returns 200
✓ frontend renders
✓ AI returns a response
✓ database contains a row
```

Correctness requires verification of the relevant contractual behavior.

For example:

```text
200 OK
```

does not prove:

```text
authorization succeeded correctly
domain state is correct
audit exists
outbox exists
concurrency was enforced
```

---

# 111. Testing Anti-Patterns

The following patterns are prohibited or strongly discouraged:

```text
Testing implementation details instead of behavior
Skipping negative tests
Relying entirely on E2E tests
Mocking everything
Using production data as fixtures
Ignoring concurrency
Ignoring duplicate events
Treating logs as audit
Treating AI output as authoritative
Testing only happy paths
Silently changing contracts to make tests pass
```

---

# 112. Test-Driven Fixing of Defects

For important defects:

```text
Defect discovered
      ↓
Reproduce
      ↓
Add failing test
      ↓
Fix implementation
      ↓
Test passes
      ↓
Regression suite passes
```

This prevents regressions.

---

# 113. CI Testing

CI should execute the appropriate automated test layers before merging/deployment.

A conceptual pipeline is:

```text
Install
  ↓
Lint
  ↓
Type Check
  ↓
Unit Tests
  ↓
Domain Tests
  ↓
Application Tests
  ↓
Integration Tests
  ↓
API/Contract Tests
  ↓
Build
  ↓
Critical E2E
```

The exact pipeline implementation is defined by project tooling.

---

# 114. CI Failure Rules

A failing critical test must not be ignored merely because:

```text
the application still builds
```

or:

```text
the UI appears to work
```

A test may be quarantined only through an explicit documented process.

---

# 115. Flaky Test Policy

Flaky tests are defects in the test system unless there is a documented external reason.

A test that intermittently passes and fails must not simply be retried indefinitely until CI becomes green.

Preferred process:

```text
Flaky test
   ↓
Identify cause
   ↓
Stabilize test
   ↓
Restore normal CI enforcement
```

---

# 116. Test Quarantine

If temporary quarantine is unavoidable, record:

```text
test
reason
owner
date
expected resolution
```

Quarantine must not become a permanent substitute for fixing the test.

---

# 117. Build Verification

A successful test suite does not automatically prove a production build is valid.

CI should also verify:

```text
production build
environment configuration
database migrations
required assets
container/package creation
```

where applicable.

---

# 118. Deployment Smoke Tests

After deployment, a minimal smoke suite should verify:

```text
application reachable
health checks
authentication
critical API
database connectivity
critical workflow entry point
```

Deployment smoke tests must not replace CI tests.

---

# 119. Observability Verification

Where observability is contractually required, tests should verify:

```text
correlation identifiers
event identifiers
structured logs
error classification
```

Tests must also verify that sensitive values are not emitted.

---

# 120. Test Documentation

Complex tests should document:

```text
purpose
contract requirement
important assumptions
setup
expected behavior
```

Test documentation must explain **why** a test exists when the behavior is not obvious.

---

# 121. Test Naming and Organization

Tests should be organized around meaningful behavior.

Preferred conceptual structure:

```text
tests/
├── unit/
├── domain/
├── application/
├── integration/
├── api/
├── events/
├── persistence/
├── security/
├── workflows/
└── e2e/
```

The actual repository structure may differ if the chosen framework has a stronger convention.

The structure must remain understandable.

---

# 122. Domain-Test Priority

If implementation time is constrained, testing priority should generally favor:

```text
1. Domain invariants
2. Authorization
3. State transitions
4. Persistence atomicity
5. Concurrency
6. Idempotency
7. Events/outbox
8. Critical workflows
9. UI details
```

This ordering is about risk concentration, not a ranking of product importance.

---

# 123. Critical OSM Invariants

The following invariants are especially important to protect through automated tests.

### OSM-TEST-001

AI output must not silently become authoritative domain state.

### OSM-TEST-002

A QualitySignal must not be treated as a Resolution.

### OSM-TEST-003

Authentication must be distinct from authorization.

### OSM-TEST-004

Unauthorized actors must not perform protected operations.

### OSM-TEST-005

Authoritative state and required outbox records must be persisted atomically where required.

### OSM-TEST-006

Event delivery failure must not silently erase a committed outbox record.

### OSM-TEST-007

Duplicate event delivery must not create duplicate logical effects where idempotent processing is required.

### OSM-TEST-008

Stale writes must not silently overwrite newer authoritative state where optimistic concurrency applies.

### OSM-TEST-009

Audit records must not be treated as ordinary application logs.

### OSM-TEST-010

Historical interpretation must remain reproducible using the required historical versions/provenance.

### OSM-TEST-011

Domain events must not be confused with commands.

### OSM-TEST-012

Infrastructure processing state must not automatically be interpreted as domain state.

### OSM-TEST-013

Persistence models must not become API models merely through ORM serialization.

### OSM-TEST-014

A failed derived workflow must not silently corrupt authoritative state.

### OSM-TEST-015

Tests must not introduce business behavior that is absent from higher-level contracts.

---

# 124. Cross-Contract Testing

The nine contract layers form a chain:

```text
01 System / Product
        ↓
02 Architecture
        ↓
03 Security
        ↓
04 UX / Workflow
        ↓
05 Domain
        ↓
06 API
        ↓
07 Events
        ↓
08 Data
        ↓
09 Testing
```

Testing must verify consistency across these layers.

Examples:

```text
Domain transition
    ↔
API operation
    ↔
Event
    ↔
Persistence
    ↔
Workflow test
```

A test should expose contradictions rather than silently choosing one interpretation.

---

# 125. Cross-Contract Conflict Rule

If two contracts appear to disagree, implementation must not resolve the conflict by silently changing behavior.

The correct process is:

```text
Identify conflict
      ↓
Determine contract authority
      ↓
Resolve specification
      ↓
Update affected contracts
      ↓
Update tests
      ↓
Implement
```

Tests must not become the mechanism through which architectural ambiguity is hidden.

---

# 126. Test-to-Contract Traceability

For important workflows, maintain traceability such as:

```text
Domain requirement
      ↓
API behavior
      ↓
Event behavior
      ↓
Data behavior
      ↓
Test scenario
```

Example:

```text
Triage resolution
      ↓
Resolve command
      ↓
TriageCaseResolved
      ↓
Resolution + Audit + Outbox
      ↓
Resolution workflow test
```

This ensures the implementation remains contract-driven.

---

# 127. MVP Testing Scope

The MVP should test the workflows actually implemented.

The project should not introduce complex testing infrastructure merely for architectural appearance.

Do not introduce:

```text
distributed test infrastructure
large-scale load systems
event replay platforms
Kafka-specific test environments
complex service meshes
```

unless required by the implemented architecture or explicit contracts.

---

# 128. Test Infrastructure Principle

Testing infrastructure must remain proportionate to the system.

For an MVP/modular architecture, prefer:

```text
unit tests
domain tests
application tests
database integration tests
API tests
event/outbox tests
critical E2E
```

over prematurely creating a distributed test platform.

---

# 129. Test Environment Principle

The simplest reliable environment should be preferred.

For example:

```text
Application
+
Database
+
Test event transport
+
Mocked external providers
```

may be sufficient for MVP integration testing.

Do not introduce infrastructure merely because it appears more enterprise-grade.

---

# 130. AI Coding Agent Rules

An AI coding agent implementing OSM must follow these rules.

### Rule 1

Do not write implementation before identifying the applicable contract behavior.

### Rule 2

Do not modify tests merely to make incorrect implementation pass.

### Rule 3

Do not remove a failing test without determining why the requirement changed.

### Rule 4

Do not invent domain states.

### Rule 5

Do not invent events.

### Rule 6

Do not invent database entities.

### Rule 7

Do not turn AI output into authoritative state without explicit contractual authorization.

### Rule 8

Do not bypass application/domain layers to simplify tests.

### Rule 9

Do not treat logs as audit records.

### Rule 10

Do not treat event delivery as part of the same atomic transaction as domain state unless explicitly required.

### Rule 11

Do not silently introduce last-write-wins behavior where optimistic concurrency is required.

### Rule 12

Do not assume exactly-once event delivery.

### Rule 13

Do not assume duplicate event delivery is impossible.

### Rule 14

Do not copy production data into test fixtures without authorization.

### Rule 15

When a test exposes a contract ambiguity, stop and resolve the contract rather than guessing.

---

# 131. AI Agent Test Workflow

An AI coding agent should follow:

```text
Read relevant contracts
        ↓
Identify behavior
        ↓
Identify invariants
        ↓
Identify failure cases
        ↓
Write/update tests
        ↓
Implement
        ↓
Run focused tests
        ↓
Run related integration tests
        ↓
Run regression suite
        ↓
Report results
```

The agent must not assume:

```text
"Build succeeds"
=
"Feature is correct"
```

---

# 132. Feature Completion Rule

A feature is not considered complete merely because its implementation exists.

A feature is complete when:

```text
Implementation
    +
Required tests
    +
Contract compliance
    +
Regression safety
```

are satisfied.

---

# 133. Definition of Done

For a contractual feature, the minimum Definition of Done is:

```text
✓ behavior implemented
✓ domain rules tested
✓ authorization tested
✓ persistence tested where relevant
✓ API contract tested where relevant
✓ event contract tested where relevant
✓ audit tested where relevant
✓ concurrency tested where relevant
✓ idempotency tested where relevant
✓ failure behavior tested where relevant
✓ critical workflow tested
✓ regression suite passes
```

Not every item applies to every feature.

Applicability must be determined from the relevant contracts.

---

# 134. Test Failure Classification

Test failures should be classified rather than immediately patched.

Possible categories:

```text
Implementation defect
Test defect
Contract ambiguity
Contract contradiction
Environment defect
Dependency failure
Infrastructure failure
Flaky test
```

The classification determines the next action.

---

# 135. Contract Ambiguity During Testing

If a test cannot be written without choosing between multiple plausible interpretations:

```text
STOP
```

Do not guess.

Instead:

```text
identify ambiguity
→ resolve contract
→ update test
→ implement behavior
```

This is especially important for:

```text
state transitions
ownership
authorization
event semantics
audit requirements
persistence relationships
```

---

# 136. Testing and Documentation Consistency

If a contract changes, affected tests must be reviewed.

The expected chain is:

```text
Contract change
      ↓
Impact analysis
      ↓
Tests updated
      ↓
Implementation updated
      ↓
Regression suite
```

Tests must not silently preserve obsolete behavior after a deliberate contract change.

---

# 137. Test Reporting

CI/local test reporting should make it possible to identify:

```text
test suite
test name
failure reason
stack/context
environment
commit/build
```

For integration/event workflows, useful identifiers include:

```text
correlationId
eventId
aggregateId
```

where safe and available.

---

# 138. Final Testing Architecture

The complete OSM testing model is:

```text
                     CONTRACTS
                         │
                         ▼
                  Test Requirements
                         │
                         ▼
              ┌─────────────────────┐
              │     Unit Tests      │
              └──────────┬──────────┘
                         ▼
              ┌─────────────────────┐
              │   Domain Tests      │
              └──────────┬──────────┘
                         ▼
              ┌─────────────────────┐
              │ Application Tests   │
              └──────────┬──────────┘
                         ▼
              ┌─────────────────────┐
              │ Integration Tests   │
              └──────────┬──────────┘
                         ▼
              ┌─────────────────────┐
              │ API / Contract      │
              │ Tests                │
              └──────────┬──────────┘
                         ▼
              ┌─────────────────────┐
              │ Workflow Tests      │
              └──────────┬──────────┘
                         ▼
              ┌─────────────────────┐
              │ Critical E2E Tests  │
              └──────────┬──────────┘
                         ▼
                       CI/CD
```

Across every layer:

```text
Authentication
Authorization
Domain invariants
Concurrency
Idempotency
Persistence
Audit
Events
Outbox
AI boundary
Failure recovery
```

remain protected.

---

# 139. Canonical OSM Test Flow

The canonical test flow for an authoritative operation is:

```text
User / External Input
        ↓
Authentication
        ↓
Authorization
        ↓
Application Command
        ↓
Domain Operation
        ↓
Invariant Validation
        ↓
Authoritative State Transition
        ↓
┌──────────────────────────────┐
│ Transaction                  │
│                              │
│ Authoritative State          │
│ Required Audit               │
│ Required Outbox Event        │
└──────────────┬───────────────┘
               ↓
             COMMIT
               ↓
        Event Dispatcher
               ↓
          Event Consumer
               ↓
        Derived Workflow
```

Tests should verify the relevant parts of this chain rather than assuming that success at one layer proves success everywhere.

---

# 140. Canonical OSM AI Flow

The canonical AI flow is:

```text
Evaluation / Evidence
        ↓
AI / Detector
        ↓
Analysis / Recommendation / Signal
        ↓
QualitySignal or Advisory Context
        ↓
Human / Authorized Application Workflow
        ↓
Command
        ↓
Domain Decision
        ↓
Authoritative State
```

The prohibited shortcut is:

```text
AI
 ↓
Direct authoritative mutation
```

unless explicitly authorized by a higher-level contract.

---

# 141. Canonical OSM Reliability Flow

The canonical persistence/event reliability model is:

```text
Domain Operation
      ↓
State Change
      +
Outbox Event
      +
Required Audit
      ↓
Atomic Commit
      ↓
Committed Outbox
      ↓
Dispatcher
      ↓
Consumer
      ↓
Idempotent Processing
```

Failure after commit:

```text
Delivery failure
      ↓
Retry
      ↓
Same logical event
      ↓
Consumer idempotency
```

must not silently erase authoritative state.

---

# 142. Canonical OSM Concurrency Flow

```text
Read version N
      ↓
Modify
      ↓
Write where version = N
      ↓
Success?
   /       \
 yes        no
  ↓          ↓
N + 1     Conflict
```

Tests must ensure stale requests cannot silently overwrite newer authoritative state where optimistic concurrency applies.

---

# 143. Canonical OSM Audit Flow

```text
Consequential operation
        ↓
Authorized domain transition
        ↓
Required AuditEvent
        ↓
Durable persistence
```

The following is insufficient:

```text
console.log(...)
```

or:

```text
application logger
```

when a durable audit record is contractually required.

---

# 144. Canonical OSM Quality-Signal Flow

```text
Detector / AI / Validator
          ↓
QualitySignalGenerated
          ↓
Review Workflow
          ↓
TriageCase
          ↓
Human Investigation
          ↓
Authorized Resolution
```

The following must remain distinct:

```text
Signal
≠
Recommendation
≠
Resolution
≠
Audit
```

---

# 145. Testing Contract Invariants

The following final invariants are authoritative:

```text
TEST-001
Tests verify contracts; they do not redefine contracts.

TEST-002
AI output is not authoritative merely because a test accepts it.

TEST-003
A QualitySignal is not a final decision.

TEST-004
Authentication is not authorization.

TEST-005
UI restrictions are not sufficient security enforcement.

TEST-006
Required authoritative state and outbox persistence are atomic.

TEST-007
Event delivery is distinct from event persistence.

TEST-008
Duplicate event delivery must not create duplicate logical effects where idempotency is required.

TEST-009
Command idempotency and event idempotency are separate concerns.

TEST-010
Stale writes must not silently overwrite newer authoritative state where optimistic concurrency applies.

TEST-011
Audit records are not ordinary logs.

TEST-012
Domain events are not commands.

TEST-013
Infrastructure event-processing state is not automatically domain state.

TEST-014
Historical interpretation must remain reproducible where required.

TEST-015
Tests must not introduce unsupported business behavior.

TEST-016
Tests must remain deterministic unless nondeterminism is itself the behavior being tested.

TEST-017
Critical negative paths must be tested.

TEST-018
Contract ambiguity must be resolved rather than guessed.

TEST-019
A successful build is not proof of contractual correctness.

TEST-020
A feature is complete only when implementation and required verification are both complete.

```

---

# 146. Final Contract Principle

OSM testing exists to prove that the system remains:

```text
Correct
+
Secure
+
Auditable
+
Deterministic where required
+
Concurrency-safe
+
Idempotent where required
+
Historically reproducible
+
AI-boundary-safe
+
Contract-compliant
```

The central testing principle is:

```text
                 DETECTION
                     │
                     ▼
                  SIGNAL
                     │
                     ▼
                HUMAN / APP
                  REVIEW
                     │
                     ▼
                 COMMAND
                     │
                     ▼
             DOMAIN DECISION
                     │
                     ▼
          AUTHORITATIVE STATE
                     │
          ┌──────────┴──────────┐
          ▼                     ▼
        AUDIT                 OUTBOX
                                │
                                ▼
                              EVENT
                                │
                                ▼
                         DERIVED WORKFLOW
```

Therefore:

> **Tests must prove that OSM's implementation preserves the distinction between detection, decision, and audit, while maintaining the guarantees defined by the Domain, API, Event, Data, Security, and Workflow Contracts.**

---

# 147. Document Status

This document is **Authoritative**.

Implementation, test suites, CI pipelines, and AI coding agents must follow this contract.

When a requirement changes:

```text
Requirement
    ↓
Relevant contract
    ↓
Testing Contract
    ↓
Tests
    ↓
Implementation
```

must be updated consistently.

No implementation may silently weaken a contractual invariant merely to make a test pass.
