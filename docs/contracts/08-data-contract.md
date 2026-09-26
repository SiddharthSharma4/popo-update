# 08 — Data Contract

**Project:** OSM — AI-Powered On-Screen Marking & Digital Evaluation System
**Document:** `docs/contracts/08-data-contract.md`
**Status:** Authoritative
**Version:** 1.0
**Last Updated:** 2026-09-26

---

# 1. Purpose

This document defines the authoritative persistence and data-management contract for OSM.

It specifies:

* persistence boundaries
* data ownership
* authoritative and derived data
* persistence models
* entity/value-object storage rules
* relationships
* identifiers
* versioning
* concurrency
* timestamps
* nullability
* transaction boundaries
* outbox persistence
* idempotency persistence
* audit persistence
* historical reproducibility
* retention and deletion rules
* persistence security
* ORM/database boundaries
* mapping requirements
* migration principles
* indexing principles
* integrity constraints
* testing requirements
* AI coding-agent implementation rules

This document defines **how approved domain concepts are persisted**.

It does not independently define new domain semantics.

---

# 2. Authority

The contract hierarchy is:

```text
05-domain-contract.md
        ↓
06-api-contract.md
        ↓
07-event-contract.md
        ↓
08-data-contract.md
        ↓
implementation
```

The Data Contract is subordinate to the Domain, API, and Event Contracts.

Therefore:

> The Data Contract must not invent domain concepts, state transitions, authorization rules, event meanings, or workflow semantics that are not established by the higher-level contracts.

If a persistence requirement conflicts with a higher-level contract, the higher-level contract wins.

If implementation requires a domain decision that is not defined by the higher-level contracts, the implementation must stop and the contract gap must be resolved.

An AI coding agent must not silently invent the missing semantics.

---

# 3. Core Persistence Principle

OSM persistence exists to preserve approved domain state and the operational information required to execute the system safely.

The canonical flow is:

```text
Domain Operation
        ↓
State Transition
        ↓
Persistence Transaction
        ├── Authoritative / approved state
        └── Required Outbox Event
                ↓
             COMMIT
                ↓
          Event Dispatcher
                ↓
             Consumer
```

The persistence layer must not become an alternative domain layer.

---

# 4. Data Authority Model

Every persisted concept must have an explicit authority classification.

OSM recognizes four primary categories:

```text
AUTHORITATIVE
DERIVED
ADVISORY
OPERATIONAL
```

---

## 4.1 Authoritative Data

Authoritative data represents approved domain state.

Examples include:

```text
Evaluation state
Awarded marks
Approved rubric references
Triage case state
Authorized resolution
Required historical records
```

Authoritative data may only be changed through approved application/domain operations.

Direct database mutation is prohibited as an application workflow.

---

## 4.2 Derived Data

Derived data is produced from authoritative data or approved detection/validation processes.

Examples:

```text
QualitySignal
detector output
derived indicators
analysis results
```

Derived data must not silently become authoritative.

In particular:

```text
QualitySignal
    ≠
Confirmed finding
```

and:

```text
Detection
    ≠
Decision
```

---

## 4.3 Advisory Data

Advisory data represents non-authoritative recommendations or analysis.

Examples:

```text
AIRecommendation
AI analysis
AI confidence
AI-generated suggestions
```

Advisory data must never directly mutate authoritative domain state.

The required conceptual flow is:

```text
AI
 ↓
Recommendation
 ↓
Human interpretation
 ↓
Authorized command
 ↓
Authoritative state change
```

---

## 4.4 Operational Data

Operational data supports execution of the system.

Examples include:

```text
OutboxEvent
IdempotencyRecord
retry state
delivery state
processing metadata
```

Operational state must not be interpreted as domain state unless explicitly defined by a higher-level contract.

For example:

```text
OutboxEvent = FAILED
```

does not imply:

```text
TriageCase = FAILED
```

---

# 5. Non-Negotiable Data Principles

The following invariants apply throughout OSM.

### DATA-001 — Domain authority

Persistence must reflect domain authority rather than define it.

### DATA-002 — No direct CRUD domain mutation

Application code must not bypass domain/application operations merely to modify database records.

### DATA-003 — AI non-authority

AI output must never directly become authoritative domain state.

### DATA-004 — Detection non-authority

A detection or quality signal must not automatically be interpreted as a confirmed finding unless the Domain Contract explicitly defines such a transition.

### DATA-005 — Transactional state/event persistence

Where an operation produces a required domain event, the relevant domain state and outbox record must be persisted atomically.

### DATA-006 — No silent last-write-wins

Concurrency-sensitive authoritative state must not be silently overwritten.

### DATA-007 — Historical reproducibility

Historical records must retain sufficient provenance/version information to prevent current configuration from silently rewriting historical interpretation.

### DATA-008 — Audit integrity

Audit history must not be treated as ordinary mutable application data.

### DATA-009 — Event delivery independence

Successful domain persistence must not require successful asynchronous event delivery.

### DATA-010 — Persistence abstraction

Domain code must not depend directly on ORM or database-specific implementation details.

### DATA-011 — Higher-contract authority

Missing domain semantics must not be invented in the Data Contract or persistence implementation.

---

# 6. Persistence Ownership

Each persisted concept must have a clear owning context.

Conceptual ownership:

```text
Evaluation
    → Evaluation domain

Question
    → Defined by Domain Contract

Mark / evaluation-question data
    → Defined by Domain Contract

Rubric
    → Defined by Domain Contract

RubricVersion
    → Defined by Domain Contract

QualitySignal
    → Detection / validation / intelligence boundary

TriageCase
    → Moderation workflow

Resolution
    → Moderation / resolution workflow

AuditEvent
    → Audit boundary

OutboxEvent
    → Infrastructure

IdempotencyRecord
    → Infrastructure
```

The exact ownership of any concept marked as domain-dependent must be inherited from `05-domain-contract.md`.

The Data Contract must not redefine that ownership.

---

# 7. Entity vs Value Object Rule

The Data Contract distinguishes between:

```text
Entity
Value Object
Operational Record
Event Record
```

An entity normally has:

* identity
* lifecycle
* controlled mutation
* persistence requirements

A value object normally has:

* semantic value
* no independent domain identity
* lifecycle controlled by its owning entity

An operational record exists to support infrastructure behavior.

An event record exists to preserve event delivery semantics.

The existence of a database table does not automatically imply the existence of a domain entity.

---

# 8. Canonical Persistence Concepts

The persistence model may contain the following concepts where required by the approved domain model:

```text
Evaluation
Question / evaluation-question representation
Mark / awarded-mark representation
EvaluationCycle
Rubric
RubricVersion
QualitySignal
Evidence / provenance representation
TriageCase
Resolution
AuditEvent
OutboxEvent
IdempotencyRecord
```

Only concepts required by the approved architecture should be persisted.

Do not create tables merely because a concept appears in documentation.

---

# 9. Canonical Entity Matrix

The following matrix establishes persistence classification.

| Concept           | Authority              |                                 Mutable | Historical Significance |              Versioning / Provenance |
| ----------------- | ---------------------- | --------------------------------------: | ----------------------: | -----------------------------------: |
| Evaluation        | Authoritative          |                                     Yes |                     Yes |                                  Yes |
| Question          | Domain-defined         |                          Domain-defined |          Domain-defined |                       Domain-defined |
| Mark              | Authoritative          | Yes before finalization where permitted |                     Yes |    Through owning evaluation/context |
| EvaluationCycle   | Authoritative          |                              Controlled |                     Yes |                   Yes where required |
| Rubric            | Authoritative          |                              Controlled |                     Yes |                            Versioned |
| RubricVersion     | Authoritative          |          Controlled/immutable after use |                     Yes |                                  Yes |
| QualitySignal     | Derived                |                              Controlled |                     Yes |         Detector/provenance required |
| Evidence          | Domain-defined         |                          Domain-defined |      Yes where retained | Provenance required where applicable |
| TriageCase        | Workflow-authoritative |                              Controlled |                     Yes |                                  Yes |
| Resolution        | Authoritative decision |            Append-oriented / controlled |                     Yes |                                  Yes |
| AuditEvent        | Historical             |                    No ordinary mutation |                     Yes |             Event/request provenance |
| OutboxEvent       | Operational            |                  Processing fields only |             Operational |                       Event identity |
| IdempotencyRecord | Operational            |                              Controlled |         Retention-based |                  Request fingerprint |

`Domain-defined` means the exact persistence representation must be taken from the higher-level Domain Contract.

---

# 10. Evaluation Persistence

An `Evaluation` represents an approved evaluation-domain object.

Persistence must preserve:

```text
evaluation identity
evaluation context
current lifecycle state
marks / evaluation data
applicable rubric reference
version/concurrency state
timestamps
required provenance
```

An evaluation must not contain AI-generated authoritative marks unless those marks have passed through the approved human/domain workflow.

---

# 11. Evaluation State

Evaluation state is authoritative domain state.

Persistence must not introduce additional evaluation states merely because they are convenient for implementation.

For example, an infrastructure state such as:

```text
PROCESSING
```

must not automatically become:

```text
Evaluation.status = PROCESSING
```

unless explicitly defined by the Domain Contract.

---

# 12. Evaluation Mutation

Mutable evaluation data must be changed through an approved application operation.

The persistence layer must not expose unrestricted methods equivalent to:

```text
updateAnyEvaluationField(...)
```

to application consumers.

The application layer must determine:

```text
what changed
whether the change is permitted
whether the state transition is valid
which event is required
whether audit is required
```

before persistence occurs.

---

# 13. Question Persistence

The exact ownership and representation of `Question` must be inherited from `05-domain-contract.md`.

The Data Contract must distinguish between:

```text
reusable assessment-definition data
```

and:

```text
evaluation-specific question data
```

where the domain model requires that distinction.

The persistence implementation must not independently decide whether:

```text
Question
```

or:

```text
EvaluationQuestion
```

is the authoritative concept.

If evaluation-specific snapshots are required for historical reproducibility, they must preserve the approved historical values.

---

# 14. Mark Persistence

A mark represents an awarded evaluation value associated with the approved evaluation/question model.

The persistence representation must follow the Domain Contract.

A mark must not automatically be modeled as an independent domain entity merely because it requires a database column or row.

Where the domain model treats marks as evaluation-scoped data, persistence may represent them as part of an evaluation-question structure or equivalent approved representation.

The persistence model must preserve:

```text
awarded value
maximum value where applicable
question/evaluation association
historical applicability
```

Validation of whether a mark is legally/domain-valid belongs to the domain/application layer.

---

# 15. Rubric Persistence

Rubrics are authoritative assessment-definition data.

A rubric must not be silently modified in a way that changes the interpretation of historical evaluations.

Where rubric versioning is defined by the Domain Contract:

```text
Rubric
   ↓
RubricVersion
   ↓
Evaluation reference
```

is the conceptual model.

A historical evaluation must retain the appropriate rubric/version reference required to reconstruct its interpretation.

---

# 16. Rubric Version Immutability

Once a rubric version has been used by an authoritative evaluation, its semantic content must not be silently rewritten.

A correction requiring different semantic content should create a new approved version rather than mutating the historical version in place.

This protects:

```text
historical reproducibility
auditability
evaluation integrity
```

---

# 17. QualitySignal Persistence

`QualitySignal` is derived data.

It may represent:

```text
detector output
validation finding
quality indicator
anomaly indication
review recommendation trigger
```

A QualitySignal is not itself proof of misconduct or an authoritative decision.

Persistence should preserve sufficient information to answer:

```text
What was detected?
For which evaluation?
By which detector/process?
Using which version?
When?
From which input/provenance?
With what confidence/severity where applicable?
```

---

# 18. QualitySignal Provenance

A persisted QualitySignal must preserve provenance sufficient for historical interpretation.

Where applicable this includes:

```text
evaluationVersion
detectorVersion
rule/configuration version
generation timestamp
source reference
signal type
confidence
evidence/provenance reference
```

Current detector configuration must not be used to reinterpret a historical signal silently.

---

# 19. Evidence and Provenance

Evidence is a domain-dependent concept.

The Data Contract must not independently decide whether Evidence is:

```text
embedded value data
```

or:

```text
independently persisted records
```

unless the Domain Contract already defines that representation.

Where evidence is persisted independently, each record must retain enough provenance to identify:

```text
source
related domain object
generation/acquisition context
timestamp
relevant version
```

Evidence must not be treated as an authoritative decision merely because it exists.

---

# 20. TriageCase Persistence

`TriageCase` is a workflow object.

It represents a review process around a detected or otherwise approved review trigger.

It is not itself proof of misconduct.

Persistence must preserve:

```text
case identity
case status
related evaluation/signal references
assignment state
review metadata
version/concurrency state
timestamps
resolution relationship where applicable
```

---

# 21. TriageCase Creation

The exact creation pathway must follow the Domain Contract.

Possible conceptual flows include:

```text
QualitySignal
      ↓
approved workflow
      ↓
TriageCase
```

or:

```text
QualitySignal
      ↓
human action
      ↓
TriageCase
```

The persistence layer must not decide which model applies.

The implementation must use the authoritative domain workflow.

---

# 22. Resolution Persistence

`Resolution` represents an authorized decision.

It is distinct from:

```text
QualitySignal
AI recommendation
AuditEvent
OutboxEvent
```

A Resolution must only be persisted through an authorized domain/application operation.

AI-generated recommendations must never directly create an authoritative Resolution.

---

# 23. Resolution History

A completed Resolution represents historical decision state.

The persistence layer must not silently overwrite historical resolution meaning.

If the Domain Contract permits correction, reversal, supersession, or another form of resolution change, the persistence representation must preserve the required history.

The Data Contract must not invent such transitions.

---

# 24. AuditEvent Persistence

`AuditEvent` is a durable historical record of consequential operations or state changes where auditing is required.

It is not:

```text
application log
OutboxEvent
retry record
request log
```

The distinction is mandatory.

```text
Domain Event ≠ AuditEvent
AuditEvent ≠ OutboxEvent
Application Log ≠ AuditEvent
```

---

# 25. AuditEvent Creation

An AuditEvent must represent what actually happened.

It must not merely record that a client requested an operation.

Conceptually:

```text
Request
   ↓
Authorization
   ↓
Domain Operation
   ↓
Actual State Change
   ↓
AuditEvent
```

not:

```text
Request
   ↓
"requested"
   ↓
AuditEvent
```

when the operation ultimately failed.

---

# 26. AuditEvent Scope

Not every domain event must automatically become an AuditEvent.

The rule is:

```text
Domain Event
      ↓
Does the applicable contract require auditing?
      ↓
Yes → AuditEvent
No  → no automatic audit record
```

Audit requirements must come from the applicable domain/event/audit rules.

The Data Contract must not independently expand the audit scope.

---

# 27. Audit Historical Integrity

Audit records must not be freely updated or deleted through normal application CRUD.

Where corrections are required, the correction itself must follow the approved audit/domain process.

Historical audit evidence must remain reconstructable.

---

# 28. OutboxEvent Persistence

An `OutboxEvent` is an operational persistence record representing a committed event that is awaiting or undergoing delivery.

Its purpose is to provide:

```text
reliable event publication
```

without requiring synchronous delivery to succeed with the domain transaction.

---

# 29. State + Outbox Atomicity

When a domain operation produces an event that must be published, the following must be committed atomically:

```text
Authoritative Domain State
        +
OutboxEvent
```

Conceptually:

```text
BEGIN TRANSACTION

persist domain state

persist outbox event

COMMIT
```

The system must not intentionally allow:

```text
state committed
+
required event record lost
```

or:

```text
event record committed
+
domain state absent
```

for the same transactional operation.

---

# 30. Outbox Delivery

After the transaction commits:

```text
OutboxEvent
    ↓
Dispatcher
    ↓
Event transport/consumer
```

Delivery is asynchronous where the architecture requires it.

The following are separate guarantees:

```text
Persistence guarantee
≠
Delivery guarantee
≠
Consumer processing guarantee
```

A delivery failure must not roll back an already committed domain transaction.

---

# 31. Outbox Operational State

An OutboxEvent may contain operational processing metadata such as:

```text
pending
processing
delivered
failed
retry information
attempt count
last attempt timestamp
```

These values are infrastructure state.

They must not be treated as domain event semantics.

The exact operational vocabulary must remain consistent with the Event/Technical implementation contract.

---

# 32. Event Identity

Each persisted event must have a stable event identity.

The same persisted event must retain the same:

```text
eventId
eventType
eventVersion
occurredAt
payload
```

across delivery retries.

A retry must not generate a new event identity for the same persisted event.

---

# 33. Event Versioning

`eventVersion` represents the event schema version defined by `07-event-contract.md`.

A breaking event-schema change requires a new version.

Consumers must not silently interpret an unsupported event version as a known version.

Unsupported versions must be:

```text
rejected
quarantined
or explicitly handled
```

according to the event-processing architecture.

---

# 34. Event Ordering

The persistence model must preserve the ordering information required by `07-event-contract.md`.

Events belonging to the same aggregate must contain sufficient causal information for consumers to preserve required domain ordering.

Global ordering across unrelated aggregates is not guaranteed unless explicitly required.

The Data Contract must not introduce a global ordering mechanism merely for convenience.

---

# 35. Causation and Correlation

Where defined by the Event Contract, persistence must retain:

```text
causationId
correlationId
```

with the same semantics.

Conceptually:

```text
correlationId
=
shared workflow/operation context

causationId
=
specific event or operation that caused the current event
```

These values are not substitutes for domain identity.

---

# 36. Actor and Producer Metadata

The event model distinguishes:

```text
producer
actor
```

`producer` identifies the logical application/bounded-context component that emitted the event.

`actor` identifies the actor whose action or automated activity caused the event.

They may differ.

Example:

```text
producer = validation
actor.type = DETECTOR
```

or:

```text
producer = moderation
actor.type = USER
actor.id = moderator_123
```

Persistence must preserve these semantics exactly as defined by `07-event-contract.md`.

---

# 37. IdempotencyRecord

An `IdempotencyRecord` stores sufficient information to prevent duplicate execution of supported idempotent commands.

It may contain:

```text
idempotency scope
idempotency key
actor/principal scope
operation/endpoint scope
request fingerprint
stored result reference
creation timestamp
expiration/retention metadata
```

---

# 38. Idempotency Uniqueness

Idempotency uniqueness must be scoped.

Conceptually:

```text
unique(
    idempotencyScope,
    idempotencyKey
)
```

The exact scope must correspond to the API contract.

A globally unique key must not be assumed unless explicitly required.

---

# 39. Idempotency Replay

For the same scoped idempotency key and logically identical request:

```text
first execution
      ↓
persist result
      ↓
retry
      ↓
return original logical result
```

A retry must not execute the consequential operation again.

If the same scoped key is reused with a materially different request:

```text
reject as conflict
```

according to the API contract.

---

# 40. Command Idempotency vs Event Idempotency

These are separate concerns.

### Command idempotency

Protects against:

```text
client
 ↓
command
 ↓
retry
```

### Event-consumer idempotency

Protects against:

```text
event
 ↓
consumer
 ↓
retry/duplicate delivery
```

`eventId` provides event identity.

It does not automatically make command execution idempotent.

---

# 41. Identifier Principles

Persisted identifiers must be:

```text
stable
unique within their defined scope
opaque to API consumers
independent of database implementation
```

Clients must not infer:

```text
database sequence
sharding strategy
table identity
creation order
```

from a resource identifier.

The exact identifier format must follow the technical implementation contract.

---

# 42. Server-Generated Identity

Where the domain/API contract requires server-generated identifiers:

```text
server/application
    ↓
generate identity
    ↓
persist entity
```

Clients must not invent identifiers unless the higher-level contract explicitly allows client-generated identity.

---

# 43. Versioning and Optimistic Concurrency

Mutable authoritative resources participating in consequential updates must support optimistic concurrency where required.

Conceptually:

```text
Stored version = 8
Client expected version = 7

        ↓

CONFLICT
```

The system must not silently apply last-write-wins behavior where concurrency protection is required.

---

# 44. Version Initial State

The initial version value must be defined consistently by the implementation.

The Data Contract requires:

```text
new versioned resource
    → deterministic initial version
```

and:

```text
successful concurrency-relevant mutation
    → version advances
```

The exact initial numeric value and database mechanism belong to the technical implementation contract unless already fixed elsewhere.

---

# 45. Atomic Version Update

Concurrency-sensitive persistence must ensure that a stale writer cannot successfully overwrite newer state.

Conceptually:

```text
UPDATE resource
SET version = nextVersion
WHERE id = resourceId
  AND version = expectedVersion
```

If the expected version no longer matches:

```text
no successful mutation
```

and the application returns the API-defined conflict.

The exact SQL/ORM mechanism is implementation-specific.

---

# 46. Timestamp Standard

At API and event boundaries:

```text
timestamps = ISO 8601 UTC
```

Example:

```text
2026-09-26T10:30:00Z
```

At the database boundary, implementations should prefer an appropriate native/timezone-aware temporal representation rather than storing timestamps as arbitrary strings.

Conversions must preserve the actual instant in time.

---

# 47. Timestamp Categories

Where applicable, distinguish:

```text
createdAt
updatedAt
occurredAt
submittedAt
resolvedAt
generatedAt
processedAt
```

These fields must not be used interchangeably.

An infrastructure processing timestamp must not replace a domain occurrence timestamp.

---

# 48. Nullability and Missing Values

Persistence semantics must distinguish:

```text
field omitted
field explicitly null
field empty
field zero
field false
```

where those states have different domain meanings.

Database nullability must follow the semantics established by the Domain/API Contract.

The Data Contract must not use:

```text
NULL
```

as a generic substitute for "unknown", "not applicable", or "not yet processed" unless the domain semantics explicitly permit it.

---

# 49. Required vs Optional Fields

A persisted field must be required when its domain meaning requires existence.

Optional persistence must not be introduced merely to simplify migration or ORM generation.

An optional field must have a defined semantic meaning.

Examples:

```text
null because not applicable
null because not yet generated
null because intentionally absent
```

must remain distinguishable where the domain requires the distinction.

---

# 50. Historical Reproducibility

OSM must preserve enough historical context to reconstruct the meaning of important past operations.

Historical interpretation must not silently depend on:

```text
current rubric
current detector version
current AI model
current configuration
current scoring rules
```

when those have changed since the original operation.

---

# 51. Historical Reference Strategy

Where interpretation depends on a versioned artifact, historical records must retain an approved reference such as:

```text
rubricVersion
detectorVersion
ruleVersion
configurationVersion
modelVersion
```

only where applicable and required by the higher-level contracts.

The Data Contract must not add version fields merely for appearance.

---

# 52. Immutable Historical Artifacts

Where a versioned artifact is required for reproducibility:

```text
historical version
    ↓
must remain semantically stable
```

after it becomes part of historical authoritative interpretation.

Correction should normally occur through a new approved version or explicit domain correction workflow, not silent mutation.

---

# 53. Derived Data Rebuildability

Where derived data is rebuildable from authoritative data and preserved provenance:

```text
authoritative state
+
versioned processing rules
+
source/provenance
        ↓
derived result
```

the derived result may be recomputed where the higher-level contracts permit it.

Recomputation must not silently modify authoritative historical decisions.

---

# 54. Deletion Policy

Deletion is not the default behavior for authoritative historical data.

The Data Contract must follow the Domain Contract and approved retention requirements.

The persistence layer must not introduce arbitrary deletion behavior.

---

# 55. Audit Deletion

`AuditEvent` must not be physically deleted through normal application CRUD.

Any deletion, archival, legal-retention action, or exceptional correction must follow the explicit governing contract.

---

# 56. Resolution Deletion

A historical Resolution must not be silently deleted to hide or rewrite an earlier decision.

If the Domain Contract permits correction, reversal, or supersession, the persistence implementation must preserve the required historical trail.

---

# 57. Soft Deletion

Soft deletion is not a universal OSM persistence rule.

A field such as:

```text
deletedAt
```

must only exist where soft deletion is explicitly required.

Do not add `deletedAt` to every table by default.

Soft deletion does not replace domain authorization or retention rules.

---

# 58. Retention

Retention periods are governed by the applicable product, security, legal, institutional, or higher-level contracts.

The Data Contract must not independently invent legal retention periods.

Where retention is undefined:

```text
do not guess
```

and do not silently introduce automatic deletion.

---

# 59. Database Constraints

Database constraints should enforce invariants that are stable and appropriate at the persistence boundary.

Examples include:

```text
primary keys
foreign keys
unique constraints
non-null constraints
valid referential relationships
scoped idempotency uniqueness
```

Database constraints must complement, not replace, domain validation.

---

# 60. Domain Validation vs Database Validation

The domain/application layer is responsible for semantic validation.

The database is responsible for persistence integrity.

Example:

```text
Database:
    evaluation_id exists

Domain:
    awarded marks are valid for the applicable question/rubric
```

The database must not become the primary location for domain workflow rules.

---

# 61. Referential Integrity

Foreign-key relationships should be enforced where appropriate and compatible with the domain lifecycle.

Examples may include:

```text
Evaluation → EvaluationCycle
Evaluation → RubricVersion
QualitySignal → Evaluation
TriageCase → QualitySignal
Resolution → TriageCase
```

The exact relationship must follow `05-domain-contract.md`.

Do not create foreign keys for relationships that are intentionally external or eventually consistent.

---

# 62. Cross-Context References

References across bounded contexts should remain explicit.

A persistence model must not create hidden coupling merely because two concepts happen to be stored in the same database.

For example:

```text
Moderation
    → references Evaluation identity
```

does not automatically mean:

```text
Moderation owns Evaluation data
```

Ownership remains defined by the domain contract.

---

# 63. ORM Boundary

ORM models are persistence representations.

They are not automatically:

```text
Domain entities
API DTOs
Event payloads
```

The intended architecture is:

```text
Database
    ↓
ORM/Persistence Model
    ↓
Mapper
    ↓
Domain/Application Model
    ↓
DTO/Event
```

---

# 64. Domain Must Not Depend on ORM

Domain code must not import:

```text
ORM decorators
ORM query builders
database clients
database transaction objects
```

unless explicitly permitted by the technical architecture.

The domain should operate on domain concepts rather than persistence mechanics.

---

# 65. API Must Not Expose ORM Models

API responses must use approved response DTOs.

Never return:

```text
ORM entity
database row
raw query result
```

directly from an API handler.

This prevents persistence implementation details from becoming public API contract.

---

# 66. Event Payloads Must Not Be ORM Serialization

Events must be constructed according to `07-event-contract.md`.

This is prohibited:

```text
database row
    ↓
JSON.stringify()
    ↓
event
```

Instead:

```text
Domain Event
    ↓
Approved Event Payload
    ↓
Outbox Record
```

---

# 67. Persistence Mapping

Explicit mapping should exist where domain and persistence representations differ.

Conceptually:

```text
PersistenceModel
      ↓
toDomain()
      ↓
DomainObject

DomainObject
      ↓
toPersistence()
      ↓
PersistenceModel
```

Mapping must preserve:

```text
identity
state
version
timestamps
references
nullability semantics
historical information
```

---

# 68. Transaction Boundary

A transaction should contain all changes that must succeed or fail together according to the domain/application operation.

Typical consequential operation:

```text
BEGIN
   ↓
load current state
   ↓
validate concurrency
   ↓
perform domain transition
   ↓
persist authoritative state
   ↓
persist audit record if required
   ↓
persist outbox event if required
   ↓
COMMIT
```

External network calls should not be treated as ordinary database transaction participants unless explicitly designed by the technical architecture.

---

# 69. Transaction Does Not Mean Global Consistency

OSM does not require every operation across every subsystem to be one global transaction.

The required model is:

```text
Strong consistency
    within required transactional boundaries

Eventual consistency
    across approved asynchronous workflows
```

Do not introduce distributed transactions merely to eliminate normal event-driven eventual consistency.

---

# 70. Outbox Transaction Rule

For any operation where a required domain event is emitted:

```text
domain state
+
outbox event
```

must be committed within the required transactional boundary.

The dispatcher runs after commit.

Conceptually:

```text
APPLICATION TRANSACTION
┌──────────────────────────────┐
│ Domain state                 │
│ Audit record if required     │
│ Outbox event                 │
└──────────────┬───────────────┘
               │
             COMMIT
               │
               ▼
        Outbox Dispatcher
               │
               ▼
          Event Consumer
```

---

# 71. Failure Before Commit

If persistence fails before commit:

```text
domain state
+
required outbox record
```

must not be considered successfully committed.

The application must return the appropriate failure according to the API contract.

No successful domain event should be published for a transaction that did not commit.

---

# 72. Failure After Commit

If the transaction commits successfully but event delivery fails:

```text
domain state = committed
outbox event = committed
delivery = failed
```

The system must preserve the outbox record for retry according to the event infrastructure contract.

The domain operation itself must not be rolled back merely because asynchronous delivery failed.

---

# 73. Consumer Failure

If an event consumer fails:

```text
event remains identifiable
consumer can retry
duplicate processing is prevented or made safe
```

Consumer processing state is operational state.

It must not silently modify the meaning of the original domain event.

---

# 74. Consistency Model

OSM should prefer strong consistency for:

```text
authoritative marks
evaluation state transitions
triage case state
resolution
required audit records
state + outbox persistence
```

OSM may use eventual consistency for:

```text
notifications
derived read models
asynchronous analysis
event consumers
non-authoritative projections
```

Strong consistency applies to the required transactional boundary, not the entire system globally.

---

# 75. AI-Generated Data Persistence

AI outputs may be persisted when required for:

```text
traceability
review
historical analysis
reproducibility
debugging
```

AI output must remain explicitly non-authoritative unless the higher-level domain contract defines a human-authorized transition.

Recommended conceptual representation:

```text
AI Output
    ↓
stored advisory result
    ↓
Human review
    ↓
Authorized command
```

---

# 76. AI Provenance

Where AI-generated information is persisted, preserve applicable provenance such as:

```text
model identifier/version
prompt/input reference where permitted
generation timestamp
configuration/version
request/correlation reference
recommendation identifier
```

Do not store sensitive data unnecessarily.

Only provenance required by the approved contract should be persisted.

---

# 77. Detector Provenance

Where detector-generated data is persisted, preserve applicable:

```text
detector identity
detector version
rule/configuration version
generation timestamp
source evaluation/version
signal identity
```

This supports reproducibility without making detector output authoritative.

---

# 78. Security and Data Minimization

Persistence must follow least-data principles.

Do not persist:

```text
secrets
passwords in plaintext
authentication tokens
unnecessary personal data
temporary data without purpose
```

Sensitive fields must be handled according to the Security Contract.

---

# 79. Authorization Data vs Application Data

Authorization metadata may be persisted where required, but the Data Contract must not independently define authorization policy.

For example:

```text
actorId
role reference
ownership reference
```

may support authorization.

The actual authorization rule belongs to the Security/API/Domain contracts.

---

# 80. Secrets

Secrets must never be stored as ordinary domain fields.

Examples:

```text
API keys
passwords
access tokens
private credentials
database passwords
```

must use the approved secret-management mechanism.

---

# 81. Standard Persistence Metadata

A persistence model may contain infrastructure metadata such as:

```text
created_at
updated_at
version
```

Additional metadata such as:

```text
deleted_at
processed_at
retry_count
outbox_status
```

must only exist where required by the specific persistence concept.

Do not add infrastructure columns universally.

---

# 82. Database Independence

The domain contract must not depend on:

```text
PostgreSQL-specific behavior
MySQL-specific behavior
MongoDB-specific behavior
ORM-specific behavior
```

unless the technical architecture explicitly selects and permits such behavior.

Database-specific optimizations belong to the technical implementation layer.

---

# 83. Indexing Principles

Indexes should support actual access patterns.

Likely categories include:

```text
primary-key lookups
foreign-key lookups
evaluation retrieval
triage-case retrieval
quality-signal retrieval
event dispatch
idempotency lookup
audit lookup
```

Indexes must not be created indiscriminately.

Every non-trivial index should have a known query or integrity purpose.

---

# 84. Unique Constraints

Unique constraints should enforce domain/persistence invariants where appropriate.

Examples:

```text
resource identity
scoped idempotency key
approved unique references
```

Do not create uniqueness constraints merely because a field "looks unique" unless the domain requires uniqueness.

---

# 85. Migration Principles

Database schema changes must be version-controlled.

Migrations must be:

```text
deterministic
reviewable
repeatable
ordered
environment-safe
```

Never manually modify production schema in a way that bypasses the migration history.

---

# 86. Migration Safety

Where possible, schema changes should follow:

```text
expand
   ↓
migrate
   ↓
switch
   ↓
contract
```

Breaking migrations must be coordinated with the application deployment strategy.

Do not silently delete or rename production data because a new ORM model no longer uses it.

---

# 87. Backward Compatibility

Persistence changes must preserve compatibility with existing authoritative data unless an explicit migration strategy has been approved.

An AI coding agent must not:

```text
drop tables
drop columns
rename persisted fields
rewrite historical records
```

merely to make new code compile.

---

# 88. Data Repair

Data repair must use controlled operations.

Direct database editing must not become a normal application workflow.

Where repair is required:

```text
identify affected data
        ↓
define authorized correction
        ↓
execute controlled operation
        ↓
preserve audit/history where required
        ↓
verify integrity
```

---

# 89. Cross-Entity Lifecycle

The following illustrates the overall business lifecycle:

```text
Evaluation Created
        ↓
Evaluation Updated
        ↓
Evaluation Submitted
        ↓
Validation
        ↓
QualitySignal Generated
        ↓
Human Review
        ↓
TriageCase
        ↓
Resolution
        ↓
Audit
```

**IMPORTANT:**

This is a **cross-entity lifecycle illustration**.

It is **not** a single persisted state machine.

It must not be implemented as:

```text
Evaluation.status =
    CREATED
    → UPDATED
    → VALIDATED
    → REVIEWED
    → RESOLVED
```

unless `05-domain-contract.md` explicitly defines those states.

---

# 90. Validation and QualitySignal

Validation may produce a QualitySignal according to the approved application/domain workflow.

The following concepts must remain distinct:

```text
Evaluation submission
Validation execution
QualitySignal generation
TriageCase creation
Resolution
```

The Data Contract must not collapse them into one database state.

---

# 91. Persistence of Validation

If validation execution has a persisted domain/operational representation, it must follow the approved architecture.

If validation is intentionally transient for the MVP:

```text
do not create a validation_runs table
```

merely for completeness.

Persistence should exist only where required by the approved workflow.

---

# 92. Read Models and Projections

Read models or projections may be introduced where justified by actual access requirements.

They are derived representations unless explicitly defined otherwise.

A projection must not become an alternative source of truth.

Conceptually:

```text
Authoritative State
        ↓
Domain Event
        ↓
Projection
        ↓
Read Model
```

---

# 93. Projection Rebuild

Where a projection is explicitly rebuildable, its source of truth must be identified.

A projection must not contain unique authoritative information unless the domain explicitly makes it authoritative.

---

# 94. Caching

Caching is not a substitute for persistence.

A cache must not become the authoritative source for:

```text
marks
evaluation state
resolution
audit history
```

unless explicitly defined by the architecture.

For MVP, do not introduce caching merely for architectural appearance.

---

# 95. Event Sourcing

OSM does not use event sourcing by default.

The standard persistence model is:

```text
current authoritative state
+
required historical/audit information
+
outbox events
```

Event sourcing must not be introduced merely because the project uses domain events.

---

# 96. CQRS

OSM does not require full CQRS by default.

Separate read models may be introduced only when justified by the actual application architecture.

Do not create separate write/read databases merely because domain events exist.

---

# 97. Distributed Infrastructure

The MVP must not introduce:

```text
Kafka
RabbitMQ
Redis
distributed databases
event-sourcing infrastructure
service mesh
distributed transactions
```

merely for architectural appearance.

Introduce additional infrastructure only when required by an approved higher-level contract or actual implementation need.

---

# 98. Data Access Pattern

The preferred application flow is:

```text
API / Application
       ↓
Application Service
       ↓
Repository / Query Interface
       ↓
Persistence Adapter
       ↓
ORM / Database
```

The reverse dependency is prohibited:

```text
ORM
 ↓
Domain
```

---

# 99. Repository Boundary

Repositories should expose domain/application-relevant operations rather than arbitrary database operations.

Prefer:

```text
evaluationRepository.findForUpdate(...)
evaluationRepository.save(...)
triageCaseRepository.findForUpdate(...)
resolutionRepository.save(...)
```

over:

```text
database.executeAnySQL(...)
```

inside application/domain code.

The exact interface belongs to the implementation architecture.

---

# 100. Query Boundary

Read queries may use optimized persistence representations where appropriate.

However:

```text
query optimization
```

must not alter domain semantics.

Raw database queries must be mapped into approved application/response representations.

---

# 101. No Hidden Persistence Side Effects

Persistence operations must not secretly perform unrelated domain actions.

For example:

```text
saveEvaluation()
```

must not silently:

```text
resolveTriageCase()
generateAIRecommendation()
sendNotification()
```

unless the application/domain contract explicitly defines that behavior.

Side effects should occur through explicit application/domain operations.

---

# 102. No Hidden Event Emission

Persistence repositories must not independently invent domain events.

Preferred flow:

```text
Application/Domain
    ↓
decides state transition
    ↓
creates approved event
    ↓
Persistence transaction
```

not:

```text
ORM save hook
    ↓
invent event
```

unless explicitly designed and contractually defined.

---

# 103. Database Triggers

Database triggers must not contain core domain workflow logic unless explicitly approved by the technical architecture.

The application/domain layer remains the primary location for business behavior.

---

# 104. Audit vs Logging

The following are distinct:

```text
AuditEvent
Application Log
Infrastructure Log
OutboxEvent
```

### AuditEvent

Durable business/history evidence.

### Application Log

Diagnostic information.

### Infrastructure Log

Operational diagnostics.

### OutboxEvent

Reliable event-delivery record.

One must not be substituted for another.

---

# 105. Logging Sensitive Data

Logs and audit records must not expose secrets or unnecessary sensitive data.

Avoid persisting:

```text
passwords
tokens
secret keys
full credentials
unnecessary raw personal information
```

---

# 106. Data Integrity Checks

The persistence implementation should verify:

```text
referential integrity
version correctness
required fields
unique constraints
valid state references
event/outbox consistency
idempotency consistency
```

The exact validation split must remain consistent with the Domain/API Contracts.

---

# 107. Startup / Runtime Integrity

Application startup may validate:

```text
required database schema
migration state
critical indexes
required constraints
```

but startup checks must not silently mutate production data outside the migration mechanism.

---

# 108. Seed Data

Seed data must be clearly distinguished from production-authoritative data.

Development/demo seeds must not be mistaken for real evaluation records.

Synthetic OSM data must remain isolated from real external OSM data.

---

# 109. Synthetic OSM Boundary

If the project uses synthetic OSM data for demonstration or MVP testing:

```text
Synthetic Data
      ↓
Internal Integration Boundary
      ↓
Application
```

Synthetic data must not be represented as externally authoritative OSM data.

The persistence model must preserve the source/context needed to distinguish synthetic data where required.

---

# 110. External Data Import

External data must enter the system through the approved integration boundary.

The persistence layer must not directly treat arbitrary external payloads as authoritative domain objects.

Conceptually:

```text
External Data
      ↓
Integration Adapter
      ↓
Validation / Mapping
      ↓
Application Command
      ↓
Domain
      ↓
Persistence
```

---

# 111. Data Normalization

External representations must be normalized before becoming internal authoritative state.

Do not allow external field naming or schema quirks to leak throughout the domain model.

---

# 112. API/Event/Data Alignment

The same domain concept must retain consistent identity and semantics across:

```text
Domain
API
Event
Persistence
```

For example:

```text
evaluationId
```

must refer to the same logical evaluation across all contracts.

Persistence-specific identifiers must not silently replace API/domain identity.

---

# 113. API DTO ≠ Persistence Model

An API field may be:

```text
renamed
combined
derived
omitted
```

relative to persistence where the API contract requires it.

The database schema must not dictate the public API shape.

---

# 114. Event Payload ≠ Persistence Model

An event payload must contain only the information required by the Event Contract.

Do not serialize entire database records into events.

This prevents:

```text
database schema
→
event schema coupling
```

---

# 115. Schema Evolution

Schema changes must preserve the meaning of historical records.

A new database column must not silently change the meaning of existing records.

Where interpretation changes:

```text
migration
+
versioning
+
explicit compatibility strategy
```

must be considered.

---

# 116. Data Contract and OpenAPI

`08-data-contract.md` does not replace `06-api-contract.md`.

API schemas are governed by the API Contract.

Persistence models must implement those semantics without exposing database structure.

---

# 117. Data Contract and Event Contract

`08-data-contract.md` does not replace `07-event-contract.md`.

Event envelope, event type, event version, causation, correlation, and event semantics are governed by `07-event-contract.md`.

The Data Contract defines how the required event/outbox representation is persisted.

---

# 118. Data Contract and Security Contract

Persistence security must remain consistent with the Security Contract.

The Data Contract does not independently define:

```text
authentication
authorization policy
credential issuance
session management
```

It only defines the persistence implications required by those contracts.

---

# 119. MVP Persistence Scope

The MVP should persist only what is required to implement the approved vertical slice.

Expected core persistence concepts include, where required:

```text
evaluation_cycles
evaluations
evaluation-specific question/mark representation
rubrics
rubric_versions
quality_signals
triage_cases
resolutions
audit_events
outbox_events
idempotency_records
```

Additional persistence should be introduced only when required by the approved contracts.

---

# 120. MVP Vertical Slice

The persistence flow should support:

```text
Authenticated Evaluator
        ↓
Retrieve Evaluation
        ↓
Update Marks
        ↓
Submit Evaluation
        ↓
Persist Evaluation State
        +
Persist Required Event/Outbox
        ↓
Deterministic Validation
        ↓
QualitySignal
        ↓
Moderator Review
        ↓
TriageCase
        ↓
Authorized Resolution
        ↓
Audit
```

The exact command/event boundaries are defined by:

```text
05-domain-contract.md
06-api-contract.md
07-event-contract.md
```

---

# 121. Deterministic-First Persistence

The MVP must not require AI-specific persistence infrastructure merely because AI is part of the product vision.

The initial persistence architecture should support:

```text
deterministic validation
quality signals
human review
authorized resolution
audit
```

AI persistence may be added where required by an approved workflow.

---

# 122. Event Registry Relationship

The Event Contract may contain events that are:

```text
registered
```

but not:

```text
currently active
```

Therefore:

```text
Registered Event
    ≠
Required Event Emission
```

An event should be persisted/emitted only when its workflow is activated by the current implementation and approved contracts.

---

# 123. Historical Data Rule

Historical data must not be silently rewritten merely because:

```text
new code
new schema
new rubric
new detector
new AI model
new configuration
```

has been introduced.

Any migration that changes historical meaning requires explicit approval and a defined migration strategy.

---

# 124. Persistence Lifecycle Illustration

The following illustrates the persistence relationship:

```text
                DOMAIN OPERATION
                       │
                       ▼
                STATE TRANSITION
                       │
             ┌─────────┴─────────┐
             │                   │
             ▼                   ▼
      AUTHORITATIVE STATE    DOMAIN EVENT
             │                   │
             │                   ▼
             │              OUTBOX RECORD
             │                   │
             └─────────┬─────────┘
                       │
                    COMMIT
                       │
                       ▼
                 DISPATCHER
                       │
                       ▼
                  CONSUMER
```

This is the canonical persistence model.

---

# 125. Reproducibility Principle

For any consequential historical result, OSM should be able to determine, where applicable:

```text
what data existed
what rubric/version applied
what detector/rule version ran
what AI model/version contributed
what human action occurred
what authorized decision was made
when the operation occurred
```

Only information actually required by the relevant contract should be persisted.

---

# 126. No Silent Historical Reinterpretation

The following pattern is prohibited:

```text
Historical Evaluation
        ↓
Current Rubric
        ↓
Current Detector
        ↓
Current AI Model
        ↓
Different historical interpretation
```

Historical interpretation must use the appropriate preserved versions/provenance.

---

# 127. Data Access Security

Persistence access must follow least privilege.

Application components should receive only the database permissions required for their role.

The application must not use unrestricted administrative database credentials during normal runtime.

---

# 128. Production Safety

Production data must not be reset, deleted, reseeded, or rewritten by ordinary development scripts.

Destructive operations must be explicit and environment-protected.

---

# 129. Backup and Recovery

Production backup/recovery requirements belong to the technical/operations contract.

However:

```text
authoritative data
audit history
required event/outbox records
```

must be included in any backup strategy required for system recovery.

---

# 130. Disaster Recovery Principle

Recovery must preserve the integrity relationship between:

```text
authoritative state
audit history
required outbox state
```

A restored system must not produce duplicate or contradictory authoritative operations merely because an infrastructure recovery occurred.

---

# 131. Persistence Testing

Persistence tests must verify at minimum:

```text
entity persistence
mapping correctness
foreign-key integrity
unique constraints
version conflicts
transaction rollback
state + outbox atomicity
idempotency behavior
audit persistence
historical version references
migration correctness
```

---

# 132. Transaction Tests

At least the following failure cases should be tested:

```text
state write succeeds
outbox write fails
        ↓
whole transaction rolls back
```

and:

```text
state + outbox commit succeeds
delivery later fails
        ↓
domain state remains committed
outbox remains retryable
```

---

# 133. Concurrency Tests

At minimum:

```text
Actor A reads version 7
Actor B reads version 7

Actor A writes
    ↓
version 8

Actor B writes using version 7
    ↓
409/conflict path
```

No silent last-write-wins behavior is permitted where concurrency protection is required.

---

# 134. Idempotency Tests

Test:

```text
same key
same request
    ↓
same logical result
```

and:

```text
same key
different request
    ↓
conflict
```

Also test retries after:

```text
network timeout
client retry
application restart
```

where applicable.

---

# 135. Event Persistence Tests

Verify:

```text
domain state + outbox
```

are committed together.

Verify:

```text
same persisted event
    ↓
same eventId on retry
```

Verify that event delivery failure does not roll back committed domain state.

---

# 136. Audit Tests

Verify that:

```text
successful consequential operation
    ↓
required audit record exists
```

and:

```text
failed operation
    ↓
must not be falsely represented as successful audit evidence
```

---

# 137. Historical Reproducibility Tests

Where historical versioning applies, test that:

```text
historical record
+
historical version reference
```

continues to resolve to the same semantic artifact after newer versions are introduced.

---

# 138. Data Invariants

The following invariants are mandatory.

### DATA-001

Authoritative domain state may only be changed through approved application/domain operations.

### DATA-002

AI output is not authoritative state.

### DATA-003

A QualitySignal is not automatically a confirmed finding.

### DATA-004

A TriageCase is a workflow object, not proof of misconduct.

### DATA-005

A Resolution represents an authorized decision.

### DATA-006

AuditEvent is distinct from OutboxEvent.

### DATA-007

Required domain state and its required outbox event are committed atomically.

### DATA-008

Event delivery failure does not invalidate already committed domain state.

### DATA-009

Concurrency-sensitive writes must not silently overwrite newer state.

### DATA-010

Historical interpretation must use the appropriate preserved version/provenance.

### DATA-011

ORM models are not domain entities.

### DATA-012

ORM models are not API DTOs.

### DATA-013

ORM models are not event payloads.

### DATA-014

Persistence must not invent domain semantics.

### DATA-015

Registered event types are not automatically active event types.

### DATA-016

Operational state must not be confused with domain state.

### DATA-017

Audit history must not be treated as ordinary mutable CRUD data.

### DATA-018

Idempotency of commands and idempotency of event consumers are separate concerns.

### DATA-019

External data must enter authoritative state through the approved integration/application boundary.

### DATA-020

Synthetic OSM data must not be represented as externally authoritative data.

---

# 139. Forbidden Persistence Patterns

The following are prohibited.

## 139.1 Direct database domain mutation

```text
Controller
   ↓
ORM.save()
```

when the operation bypasses application/domain rules.

---

## 139.2 ORM as domain model

```text
Domain Entity = ORM Entity
```

is prohibited where it creates persistence coupling.

---

## 139.3 ORM serialization as API

```text
ORM object
   ↓
JSON response
```

is prohibited.

---

## 139.4 ORM serialization as event

```text
ORM object
   ↓
JSON
   ↓
Event
```

is prohibited.

---

## 139.5 AI direct persistence

```text
AI
 ↓
Database
```

is prohibited for authoritative state.

---

## 139.6 QualitySignal as Resolution

```text
QualitySignal
 ↓
Resolution
```

without the required human/domain authorization is prohibited.

---

## 139.7 Last-write-wins authoritative mutation

```text
read old state
 ↓
write without concurrency check
```

is prohibited where optimistic concurrency is required.

---

## 139.8 Audit deletion through CRUD

```text
DELETE /audit-events/{id}
```

or equivalent direct deletion is prohibited unless explicitly authorized by a higher-level contract.

---

## 139.9 Event emission outside required persistence boundary

```text
save state
COMMIT

publish event
```

without a durable outbox/reliable event mechanism where the contract requires one is prohibited.

---

## 139.10 Hidden domain logic in database triggers

Core business workflow must not be hidden inside database triggers.

---

## 139.11 Global transaction overengineering

Do not introduce distributed transactions merely because multiple contexts exist.

---

## 139.12 Automatic soft deletion everywhere

Do not add `deletedAt` to every entity by default.

---

## 139.13 Automatic event creation for every field update

Do not emit domain events merely because an ORM row changed.

Events require domain significance defined by the Event Contract.

---

# 140. AI Coding-Agent Rules

An AI coding agent implementing this contract must follow these rules.

### Rule 1 — Read higher contracts first

Before modifying persistence, inspect:

```text
05-domain-contract.md
06-api-contract.md
07-event-contract.md
```

---

### Rule 2 — Do not invent domain semantics

If the database implementation requires a decision not defined by the contracts:

```text
STOP
```

and identify the contract gap.

---

### Rule 3 — Do not invent entities

A database table must not be created merely because a noun appears in documentation.

---

### Rule 4 — Do not expose ORM models

Use explicit mapping.

---

### Rule 5 — Preserve authority boundaries

Never turn:

```text
AI
QualitySignal
Evidence
AuditEvent
OutboxEvent
```

into authoritative decision state without an approved domain transition.

---

### Rule 6 — Preserve historical meaning

Never silently rewrite historical data to match current configuration.

---

### Rule 7 — Protect concurrency

Use the approved version/concurrency mechanism for consequential mutations.

---

### Rule 8 — Protect idempotency

Do not create duplicate consequential operations when the same idempotency key is retried.

---

### Rule 9 — Preserve state + outbox atomicity

If an operation emits a required domain event:

```text
state
+
outbox
```

must share the required transaction.

---

### Rule 10 — Do not overengineer MVP persistence

Do not introduce:

```text
Kafka
Redis
event sourcing
CQRS infrastructure
distributed transactions
multiple databases
```

without explicit architectural justification.

---

### Rule 11 — Do not change contracts through migrations

A migration must implement an approved contract change.

It must not be used to silently redefine the domain.

---

### Rule 12 — Preserve traceability

Consequential persistence changes should be traceable through:

```text
request
→ application operation
→ domain transition
→ persisted state
→ event/outbox
→ audit where required
```

---

# 141. Contract-Test Requirements

The implementation should contain tests proving:

```text
API
 ↓
Application
 ↓
Domain
 ↓
Persistence
```

preserves the approved contracts.

At minimum:

```text
Domain → persistence mapping
Persistence → domain mapping
API → persistence semantics
Domain event → outbox persistence
Concurrency → conflict behavior
Idempotency → replay behavior
Audit → historical integrity
Versioning → reproducibility
```

---

# 142. Traceability Matrix

| Requirement                    | Persistence Responsibility                         |
| ------------------------------ | -------------------------------------------------- |
| Authoritative evaluation state | Persist transactionally                            |
| Mark integrity                 | Preserve approved domain representation            |
| Evaluation concurrency         | Persist version/concurrency state                  |
| QualitySignal                  | Preserve derived result + provenance               |
| TriageCase                     | Preserve workflow state                            |
| Resolution                     | Preserve authorized decision/history               |
| Audit                          | Durable historical record                          |
| Domain Event                   | Persist required outbox record                     |
| Idempotency                    | Persist scoped key/fingerprint/result              |
| Historical reproducibility     | Preserve required versions                         |
| External integration           | Preserve approved source/context                   |
| AI recommendation              | Preserve advisory status/provenance where required |

---

# 143. Canonical Persistence Flow

For a consequential operation:

```text
HTTP / Integration / Internal Command
                  ↓
             Application
                  ↓
             Authorization
                  ↓
          Load current state
                  ↓
        Check concurrency/version
                  ↓
            Domain operation
                  ↓
          State transition
                  ↓
        ┌─────────┴─────────┐
        │                   │
        ▼                   ▼
  Authoritative State   Domain Event
        │                   │
        │                   ▼
        │              Outbox Record
        │                   │
        └─────────┬─────────┘
                  ↓
                COMMIT
                  ↓
           Response / Return
                  ↓
             Dispatcher
                  ↓
              Consumer
```

---

# 144. OSM Core Persistence Model

The intended OSM persistence philosophy is:

```text
                 ┌────────────────────┐
                 │  Authoritative     │
                 │  Domain State      │
                 └─────────┬──────────┘
                           │
                    Domain Operation
                           │
                           ▼
                 ┌────────────────────┐
                 │ State Transition   │
                 └─────────┬──────────┘
                           │
              ┌────────────┴────────────┐
              │                         │
              ▼                         ▼
       Persist State              Persist Event
              │                         │
              └────────────┬────────────┘
                           │
                         COMMIT
                           │
                           ▼
                    Event Dispatcher
                           │
                           ▼
                       Consumers
```

With the authority boundary:

```text
Detection
    ↓
QualitySignal
    ↓
Human Review
    ↓
Authorized Resolution
    ↓
Audit
```

and:

```text
AI
 ↓
Advisory Recommendation
 ↓
Human Interpretation
 ↓
Authorized Command
 ↓
Authoritative State
```

---

# 145. Final Contract Invariant

The entire Data Contract can be reduced to the following principle:

> **Persist authoritative domain state exactly as defined by the higher-level contracts, preserve the provenance and history required to interpret that state correctly, atomically persist required outbox events with consequential state changes, and never allow persistence infrastructure to become an alternative source of domain authority.**

Therefore:

```text
DOMAIN
  defines meaning
      ↓
APPLICATION
  defines operation
      ↓
PERSISTENCE
  preserves state
      ↓
OUTBOX
  preserves required event delivery
      ↓
AUDIT
  preserves consequential history
```

And always:

```text
AI ≠ Authority

Detection ≠ Decision

QualitySignal ≠ Resolution

Domain Event ≠ AuditEvent

AuditEvent ≠ OutboxEvent

Operational State ≠ Domain State

ORM Model ≠ Domain Model

Database Schema ≠ API Contract
```

These boundaries are mandatory for the OSM implementation.
