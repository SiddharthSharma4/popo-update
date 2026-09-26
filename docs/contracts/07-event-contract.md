# 07 — Event Contract

**Project:** OSM — AI-Powered On-Screen Marking & Digital Evaluation System
**Document:** `docs/contracts/07-event-contract.md`
**Status:** Authoritative
**Version:** 1.0
**Last Updated:** 2026-09-26

---

# 1. Purpose

This document defines the authoritative event model for OSM.

It specifies:

* what constitutes a domain event
* event ownership and producers
* event naming
* event envelope
* event identity
* actor semantics
* causation and correlation
* event versioning
* event persistence
* outbox requirements
* delivery semantics
* retry and failure behavior
* idempotency
* ordering expectations
* event consumers
* audit relationship
* AI-event boundaries
* external integration boundaries
* approved event vocabulary
* event activation rules
* event testing requirements
* implementation rules for AI coding agents

This document governs **internal domain events and approved event-driven application behavior**.

It does not replace:

* `01-product-contract.md`
* `02-system-architecture.md`
* `03-data-contract.md`
* `04-task-board.md`
* `05-domain-contract.md`
* `06-api-contract.md`
* `08-ai-contract.md`
* `09-audit-contract.md`
* `10-integration-contract.md`
* `11-security-contract.md`

When a conflict exists, the higher-level authoritative contract takes precedence according to the project contract hierarchy.

---

# 2. Contract Authority

The event contract defines how domain facts are represented and propagated.

It does not independently invent domain semantics.

The event model must derive its meaning from the approved domain model.

Therefore:

```text
Product Contract
        ↓
Architecture Contract
        ↓
Domain Contract
        ↓
Event Contract
        ↓
Application Implementation
```

The event contract may define:

* event structure
* event identity
* event metadata
* event transport behavior
* delivery semantics
* retry semantics
* consumer behavior

It must not independently introduce:

* new business concepts
* new authoritative decisions
* new workflow states
* new authority relationships
* new AI permissions
* new domain aggregates

If an event requires a domain concept that is not defined by the Domain Contract, the implementation must stop and resolve the contract gap rather than inventing a new meaning.

---

# 3. Core Event Philosophy

The OSM event model follows:

```text
Command
   ↓
Application Operation
   ↓
Domain Operation
   ↓
Authoritative State Change
   ↓
Domain Event
   ↓
Approved Consumer
```

A domain event represents something that **has happened**.

It does not represent:

* something that might happen
* something a client requested but failed
* an authorization attempt
* an AI suggestion
* an uncommitted database mutation
* an arbitrary log message

The fundamental distinction is:

```text
Command
    =
request to perform an operation

Event
    =
fact that an operation/state change occurred
```

---

# 4. Core OSM Separation

The event architecture must preserve the following boundaries:

```text
Detection
    ≠
Decision
    ≠
Audit
```

Specifically:

```text
Detector
   ↓
QualitySignal
```

does not mean:

```text
Confirmed issue
```

Likewise:

```text
TriageCaseResolved
```

represents an authorized workflow decision.

It does not mean:

```text
AI confirmed the original signal
```

And:

```text
AuditEvent
```

records what actually happened.

It is not itself the domain decision.

---

# 5. Event Definition

A domain event is an immutable representation of a meaningful fact that occurred within the OSM domain or approved application boundary.

Examples:

```text
EvaluationCreated
EvaluationUpdated
EvaluationSubmitted
EvaluationFinalized
QualitySignalGenerated
TriageCaseCreated
TriageCaseAssigned
TriageCaseUnassigned
TriageCaseResolved
```

Potential AI-related events may include:

```text
AIRecommendationGenerated
AIAnalysisCompleted
```

but these are non-authoritative and must only be activated where required by the AI Contract and roadmap.

---

# 6. Event Immutability

Once an event has been committed as a domain fact:

* its identity must not change
* its event type must not change
* its occurrence timestamp must not change
* its payload must not be rewritten
* its causal metadata must not be rewritten

Corrections must be represented through subsequent domain operations/events.

The system must not silently mutate historical events to reflect later state.

---

# 7. Event vs Command

Commands and events are different concepts.

### Command

```text
SubmitEvaluation
ResolveTriageCase
AssignTriageCase
```

A command means:

> Please attempt this operation.

### Event

```text
EvaluationSubmitted
TriageCaseResolved
TriageCaseAssigned
```

An event means:

> This operation successfully occurred and the corresponding domain fact exists.

Therefore:

```text
POST /evaluations/{id}/submit
```

does not itself constitute:

```text
EvaluationSubmitted
```

The event may only be emitted after the domain operation succeeds and the resulting state is durably committed.

---

# 8. Event vs Audit Event

A domain event and an audit event are related but not identical.

### Domain Event

Represents a meaningful domain fact:

```text
EvaluationSubmitted
TriageCaseResolved
QualitySignalGenerated
```

### Audit Event

Represents durable historical evidence of an important action or state transition.

Conceptually:

```text
Domain Operation
      ↓
State Change
      ↓
Domain Event
      ↓
Audit Recording
```

Not every internal technical event necessarily requires an audit event.

Conversely, an audit record must not be treated as a substitute for a domain event where downstream domain behavior requires the event.

---

# 9. Event vs Log

Application logs are not domain events.

This is not acceptable:

```text
logger.info("Evaluation updated")
```

as a substitute for:

```text
EvaluationUpdated
```

Logs are intended for operational diagnostics.

Domain events are structured domain facts with defined:

* identity
* meaning
* producer
* actor
* causation
* correlation
* version
* payload

---

# 10. Event Ownership

Every event must have a defined producer and domain meaning.

The producer is responsible for emitting the event only after the corresponding operation has actually succeeded.

Example:

```text
Evaluation
    ↓
EvaluationSubmitted
```

The Evaluation domain/application boundary is responsible for the semantic correctness of the event.

Consumers must not reinterpret the event into a different domain fact.

---

# 11. Producer vs Actor

`producer` and `actor` are intentionally different concepts.

### Producer

Identifies the logical application or bounded-context component that emitted the event.

Example:

```text
producer = evaluation
```

### Actor

Identifies the actor whose operation or automated activity caused the event.

Example:

```text
actor = USER:user_123
```

They may be different.

For example:

```text
producer
=
validation

actor
=
DETECTOR:EvaluatorDeviationDetector
```

or:

```text
producer
=
moderation

actor
=
USER:moderator_123
```

The implementation must not collapse these concepts into a single field.

---

# 12. Actor Model

Every persisted or transported domain event must have an `actor`.

Supported actor types are:

```text
USER
SYSTEM
DETECTOR
AI
INTEGRATION
```

Examples:

```text
USER
SYSTEM
DETECTOR
AI
INTEGRATION
```

The actor type identifies **who or what caused the event**, not necessarily who owns the surrounding application component.

For automated events:

```text
actor.type = DETECTOR
```

may identify the detector responsible for a signal.

For AI-generated advisory activity:

```text
actor.type = AI
```

may identify the AI subsystem.

AI actor identity does **not** grant authority to perform human decisions.

---

# 13. AI Actor Boundary

AI may appear as an event actor for:

* generated analysis
* generated recommendations
* advisory explanations
* classification assistance
* summarization

AI must not be represented as the authoritative human decision-maker for consequential workflow decisions.

The following is prohibited:

```text
actor.type = AI
        ↓
TriageCaseResolved
```

unless the higher-level contracts explicitly redefine the authority model.

Under the current OSM authority model, AI remains assistive.

The authoritative human decision must be represented by the appropriate authorized actor.

---

# 14. Event Envelope

Every event must use a common envelope.

Canonical conceptual structure:

```json
{
  "eventId": "evt_123",
  "eventType": "EvaluationSubmitted",
  "eventVersion": 1,
  "occurredAt": "2026-09-26T10:30:00Z",
  "producer": "evaluation",
  "actor": {
    "type": "USER",
    "id": "user_123"
  },
  "aggregate": {
    "type": "Evaluation",
    "id": "eval_123"
  },
  "correlationId": "corr_123",
  "causationId": "cmd_123",
  "payload": {}
}
```

The exact transport representation may differ, but the semantic fields must remain available.

---

# 15. Required Event Envelope Fields

The canonical envelope contains:

| Field           | Meaning                                                         |
| --------------- | --------------------------------------------------------------- |
| `eventId`       | Unique identity of this event                                   |
| `eventType`     | Stable event name                                               |
| `eventVersion`  | Schema version                                                  |
| `occurredAt`    | Time at which the domain fact occurred                          |
| `producer`      | Logical producer/bounded context                                |
| `actor`         | Actor responsible for causing the fact                          |
| `aggregate`     | Aggregate/resource to which the event belongs                   |
| `correlationId` | Identifier connecting related operations                        |
| `causationId`   | Identifier of the command/event that directly caused this event |
| `payload`       | Event-specific immutable data                                   |

Additional metadata may be introduced only where justified by an approved contract.

---

# 16. Event Identity

`eventId` uniquely identifies one event occurrence.

It must be:

* unique
* immutable
* opaque to clients
* independent of database implementation
* stable across delivery retries

A retry of the same persisted event must reuse the same:

```text
eventId
```

It must not generate a new event identity.

---

# 17. Event Type

`eventType` identifies the semantic event.

Examples:

```text
EvaluationCreated
EvaluationUpdated
EvaluationSubmitted
EvaluationFinalized
QualitySignalGenerated
TriageCaseCreated
TriageCaseAssigned
TriageCaseUnassigned
TriageCaseResolved
```

Event names must:

* use past-tense/domain-fact semantics
* represent something that happened
* remain stable
* not encode implementation details

Preferred:

```text
EvaluationSubmitted
```

Not:

```text
SubmitEvaluationEvent
```

because the latter describes an implementation mechanism rather than the resulting fact.

---

# 18. Event Version

`eventVersion` represents the schema version of the event payload/envelope contract.

Example:

```json
"eventVersion": 1
```

A non-breaking compatible change may remain on the same version where permitted by the contract.

A breaking schema change requires a new event version.

Example:

```text
EvaluationSubmitted v1
EvaluationSubmitted v2
```

Consumers must not silently interpret an unsupported version as a known version.

Unsupported versions must be:

* rejected,
* quarantined,
* or explicitly handled through an approved compatibility mechanism.

---

# 19. Occurrence Timestamp

`occurredAt` represents when the domain fact occurred.

All API/event timestamps use:

```text
ISO 8601 UTC
```

Canonical form:

```text
2026-09-26T10:30:00Z
```

Timestamps must not be used as the sole mechanism for determining event ordering.

Causal and aggregate-ordering information takes precedence.

---

# 20. Aggregate Identity

Events should identify the aggregate/resource whose state or behavior produced the event.

Example:

```json
"aggregate": {
  "type": "Evaluation",
  "id": "eval_123"
}
```

Aggregate IDs are opaque.

Consumers must not infer:

* database structure
* storage engine
* table names
* shard information
* internal numeric sequences

from an aggregate ID.

---

# 21. Correlation ID

`correlationId` connects events belonging to the same larger workflow or business operation.

Example:

```text
EvaluationSubmitted
        ↓
QualitySignalGenerated
        ↓
TriageCaseCreated
        ↓
TriageCaseResolved
```

These events may share a correlation identifier when they belong to the same logical workflow.

Correlation does not necessarily imply direct causation.

---

# 22. Causation ID

`causationId` identifies the immediate command or event that directly caused the current event.

Example:

```text
ResolveTriageCase command
        ↓
TriageCaseResolved event
```

Therefore:

```text
causationId = ResolveTriageCase command ID
```

For chained events:

```text
EvaluationSubmitted
        ↓
QualitySignalGenerated
```

the second event may use:

```text
causationId = EvaluationSubmitted.eventId
```

This allows consumers and audit systems to reconstruct causal chains.

---

# 23. Event Payload

The payload contains event-specific domain information.

Payloads should contain enough information for approved consumers to understand the event without requiring unnecessary internal implementation knowledge.

Payloads must not expose:

* database internals
* credentials
* secrets
* unnecessary personal data
* internal service topology
* unsupported domain concepts

Payloads must follow the relevant domain and security contracts.

---

# 24. Event Payload Authority

An event payload must describe the state/fact represented by the event.

It must not contain speculative claims.

For example:

```text
QualitySignalGenerated
```

may contain:

```text
detector
severity
evidence
provenance
comparison context
```

but must not transform:

```text
signal detected
```

into:

```text
misconduct confirmed
```

unless a later authorized human decision establishes that fact.

---

# 25. Event Immutability and Corrections

Events are append-only facts.

If an incorrect state was committed, the system must correct it through an approved domain operation.

Example:

```text
Incorrect resolution
        ↓
Authorized correction command
        ↓
New state transition
        ↓
New event
        ↓
Audit
```

The previous event must not simply be rewritten.

---

# 26. Event Generation Rule

A domain event may be emitted only after the corresponding domain operation succeeds.

The system must not emit:

```text
EvaluationSubmitted
```

if submission validation failed.

Likewise:

```text
TriageCaseResolved
```

must not be emitted if authorization or domain validation prevented resolution.

Therefore:

```text
Attempted operation
    ≠
Successful domain operation
```

---

# 27. Event Persistence Model

OSM uses the following conceptual model:

```text
Domain State Change
        +
Event / Outbox Record
        ↓
Atomic Commit
        ↓
Committed Domain State
        +
Dispatchable Event
```

The state transition and required event/outbox record must not be allowed to silently diverge.

The system must avoid:

```text
state committed
event lost
```

or:

```text
event committed
state rolled back
```

for the same domain operation.

---

# 28. Outbox Pattern

Where asynchronous delivery is required, the event must first be recorded durably as part of the same persistence transaction as the relevant domain state change.

Conceptually:

```text
BEGIN TRANSACTION

    update domain state

    insert event/outbox record

COMMIT
```

Only after successful commit may the event become eligible for dispatch.

This establishes:

```text
State + Outbox
    =
Atomic persistence boundary
```

---

# 29. Event Delivery Is Separate From Domain Persistence

The following are separate stages:

```text
1. Domain state persistence
2. Event/outbox persistence
3. Event delivery
4. Consumer processing
```

The first two must satisfy the required atomicity guarantee.

Delivery may fail after commit.

Therefore:

```text
Committed event
    ↓
delivery failure
```

is allowed.

The system must retry delivery without changing the original event identity.

---

# 30. Event Lifecycle

The conceptual event lifecycle is:

```text
CREATED
   ↓
PERSISTED
   ↓
DISPATCHABLE
   ↓
DELIVERED
   ↓
PROCESSED
```

Failure path:

```text
DISPATCHABLE
   ↓
DELIVERY_FAILED
   ↓
RETRY
   ↓
DELIVERED
```

Persistent failure may result in:

```text
DEAD_LETTER / QUARANTINED
```

if such infrastructure is enabled.

Event infrastructure state is not domain state.

For example:

```text
Event delivery failed
```

does not mean:

```text
TriageCase = FAILED
```

Likewise:

```text
Event waiting for dispatch
```

does not mean:

```text
Evaluation submission failed
```

unless the Domain Contract explicitly defines such a relationship.

---

# 31. Event Ordering

Global ordering across all OSM events is not guaranteed.

The important ordering boundary is the aggregate/domain workflow.

Events belonging to the same aggregate must carry sufficient causal/sequence information for consumers to preserve required domain ordering.

Example:

```text
EvaluationCreated
       ↓
EvaluationUpdated
       ↓
EvaluationSubmitted
```

must not be semantically processed as:

```text
EvaluationSubmitted
       ↓
EvaluationCreated
```

Consumers must not infer ordering solely from timestamps.

---

# 32. Event Delivery Semantics

The MVP should assume:

```text
at-least-once delivery
```

unless another higher-level contract explicitly requires stronger semantics.

Therefore consumers must be idempotent.

The system must assume an event may be delivered more than once.

Example:

```text
EvaluationSubmitted
    ↓
Consumer receives event
    ↓
processing succeeds
    ↓
network acknowledgement fails
    ↓
event delivered again
```

The second delivery must not create an incorrect duplicate domain effect.

---

# 33. Event Consumer Idempotency

Consumers must use `eventId` or an equivalent approved event identity mechanism to detect duplicate processing.

Conceptually:

```text
eventId = evt_123
```

If:

```text
evt_123
```

has already been successfully processed, receiving it again must not repeat the consequential side effect.

The exact persistence mechanism may vary.

The semantic requirement does not.

---

# 34. Command Idempotency vs Event Idempotency

These are separate concerns.

### Command idempotency

Protects against:

```text
client
 ↓
same command
 ↓
retry
```

Example:

```text
SubmitEvaluation
```

### Event idempotency

Protects against:

```text
same committed event
 ↓
delivered multiple times
```

Example:

```text
EvaluationSubmitted
```

`eventId` solves event identity.

It does not automatically make command execution idempotent.

The API Contract remains authoritative for command-level idempotency.

---

# 35. Retry Rules

Event delivery retries must:

* preserve `eventId`
* preserve `eventType`
* preserve `eventVersion`
* preserve `occurredAt`
* preserve payload
* preserve causal metadata

Retries must not create semantically new events.

A failed delivery may create operational retry metadata, but must not mutate the domain event itself.

---

# 36. Retry and Failure Handling

The system should use bounded retry behavior appropriate to the MVP infrastructure.

A failed consumer must not cause the original event to be rewritten.

Conceptually:

```text
Event
 ↓
Consumer
 ↓
Failure
 ↓
Retry
 ↓
Success
```

or:

```text
Event
 ↓
Consumer
 ↓
Repeated failure
 ↓
Quarantine / Dead Letter
```

if supported by the infrastructure contract.

Dead-lettering is an infrastructure concern and does not itself alter the domain meaning of the original event.

---

# 37. Event Registry

The following registry defines the approved event vocabulary.

**Important distinction:**

```text
REGISTERED EVENT
    ≠
ACTIVE EVENT
```

An event appearing in this registry means its semantic name is approved.

It does **not** require implementation or emission unless the corresponding workflow is activated by the current roadmap and higher-level contracts.

| Event                       | Producer                  | Aggregate           | Meaning                                                 | Authority                   |
| --------------------------- | ------------------------- | ------------------- | ------------------------------------------------------- | --------------------------- |
| `EvaluationCreated`         | Evaluation                | Evaluation          | An evaluation was created                               | Authoritative domain fact   |
| `EvaluationUpdated`         | Evaluation                | Evaluation          | A meaningful persisted evaluation modification occurred | Authoritative domain fact   |
| `EvaluationSubmitted`       | Evaluation                | Evaluation          | An evaluation was successfully submitted                | Authoritative domain fact   |
| `EvaluationFinalized`       | Evaluation                | Evaluation          | An evaluation entered its approved finalized state      | Authoritative domain fact   |
| `QualitySignalGenerated`    | Validation / Intelligence | QualitySignal       | A detector generated a quality signal                   | Derived fact                |
| `TriageCaseCreated`         | Moderation                | TriageCase          | A moderation case was created                           | Workflow fact               |
| `TriageCaseAssigned`        | Moderation                | TriageCase          | A moderation case was assigned                          | Workflow fact               |
| `TriageCaseUnassigned`      | Moderation                | TriageCase          | A moderation case assignment was removed                | Workflow fact               |
| `TriageCaseResolved`        | Moderation                | TriageCase          | An authorized case resolution occurred                  | Authoritative workflow fact |
| `AIRecommendationGenerated` | AI                        | AI analysis context | AI produced an advisory recommendation                  | Non-authoritative           |
| `AIAnalysisCompleted`       | AI                        | AI analysis context | An AI analysis operation completed                      | Non-authoritative           |

The exact active subset must follow the current Task Board and implementation scope.

---

# 38. `EvaluationCreated`

Represents successful creation of an Evaluation.

Conceptually:

```text
Create Evaluation
       ↓
Domain operation succeeds
       ↓
EvaluationCreated
```

The event must not be emitted merely because an HTTP request to create an evaluation was received.

The event payload should contain the minimum information required by approved consumers, such as:

```text
evaluationId
evaluationCycleId
relevant ownership/context identifiers
```

Exact fields are governed by the Domain and API Contracts.

---

# 39. `EvaluationUpdated`

`EvaluationUpdated` represents a **meaningful persisted modification** to an Evaluation that is relevant to an approved consumer.

It must not be emitted merely because:

* an ORM issued an update statement
* an internal object was mutated temporarily
* an unrelated persistence field changed
* an implementation detail changed

The event must not become an event for every trivial field mutation.

If multiple internal mutations form one meaningful domain operation, the implementation may emit one domain event representing the meaningful operation rather than one event per database mutation.

---

# 40. `EvaluationSubmitted`

Represents successful submission of an Evaluation.

Canonical flow:

```text
SubmitEvaluation
       ↓
Application validation
       ↓
Domain validation
       ↓
State transition
       ↓
Persist state + event/outbox
       ↓
Commit
       ↓
EvaluationSubmitted
```

The event must not be emitted when submission fails.

---

# 41. `EvaluationFinalized`

`EvaluationFinalized` represents entry into an approved finalized state.

It must only be emitted if finalization exists as an authoritative domain state transition.

It must not be introduced merely because:

* it is convenient for an API
* the implementation needs another status
* an AI agent assumes all workflows require finalization

Its activation is governed by the Domain Contract and Task Board.

---

# 42. `QualitySignalGenerated`

Represents successful generation of a QualitySignal by an approved deterministic/statistical/AI-assisted detector workflow.

Conceptual flow:

```text
Evaluation / Validation Input
          ↓
Detector
          ↓
QualitySignal
          ↓
QualitySignalGenerated
```

The event represents:

```text
a signal was generated
```

not:

```text
a problem was confirmed
```

The event should preserve sufficient provenance to explain:

* what generated the signal
* which detector/version was involved
* relevant evaluation context
* evidence references
* comparison population/baseline where applicable

The exact payload is governed by the Domain Contract.

---

# 43. Statistical Signal Context

A statistical QualitySignal must contain or reference sufficient context to interpret the result.

Relevant context may include:

```text
comparison population
baseline
sample size
evaluation context
rubric/question context
detector version
measurement
```

A raw anomaly score without meaningful comparison context must not be represented as authoritative evidence of misconduct.

---

# 44. QualitySignal Authority Boundary

A QualitySignal is derived information.

Therefore:

```text
QualitySignalGenerated
```

does not establish:

```text
misconduct
marking error
human fault
```

It only establishes that the approved detection workflow generated a signal.

The authoritative interpretation occurs through the approved review/moderation workflow.

---

# 45. `TriageCaseCreated`

Represents successful creation of a TriageCase.

The exact creation mechanism must follow `05-domain-contract.md`.

The system must not independently decide whether case creation is:

```text
automatic
```

or:

```text
explicitly initiated by a moderator
```

if that distinction is not already established by the higher-level contract.

Where a case is created from a QualitySignal, the event must preserve the relevant signal reference.

Conceptually:

```text
QualitySignal
      ↓
approved moderation workflow
      ↓
TriageCase
      ↓
TriageCaseCreated
```

The event actor must reflect the actual actor responsible for the creation:

```text
USER
SYSTEM
```

or another approved actor type.

It must never falsely attribute an automated case creation to a human moderator.

---

# 46. `TriageCaseAssigned`

Represents successful assignment of a TriageCase.

Conceptually:

```text
AssignTriageCase
       ↓
Authorization
       ↓
Domain operation
       ↓
State change
       ↓
TriageCaseAssigned
```

The event should identify:

```text
caseId
assignee
```

where required by the approved domain model.

---

# 47. `TriageCaseUnassigned`

Represents successful removal of an existing case assignment.

It must only be emitted after the assignment has actually been removed.

It must not be used as a substitute for:

```text
case resolution
```

or:

```text
case dismissal
```

unless those semantics are explicitly defined by the Domain Contract.

---

# 48. `TriageCaseResolved`

Represents a successfully authorized resolution of a TriageCase.

Conceptually:

```text
ResolveTriageCase
       ↓
Authorization
       ↓
Domain validation
       ↓
Resolution
       ↓
State transition
       ↓
Persist state + event/outbox
       ↓
Commit
       ↓
TriageCaseResolved
```

This event means:

```text
an authorized resolution occurred
```

It does not mean:

```text
the original QualitySignal was correct
```

unless the Resolution itself explicitly establishes that interpretation.

---

# 49. Resolution Authority

The authoritative decision remains the domain `Resolution`.

The event:

```text
TriageCaseResolved
```

is the event representation of that successful domain transition.

Therefore:

```text
AI recommendation
    ≠
Resolution

QualitySignal
    ≠
Resolution

AuditEvent
    ≠
Resolution
```

---

# 50. AI Events

AI-generated events are non-authoritative unless a higher-level contract explicitly defines otherwise.

Examples:

```text
AIRecommendationGenerated
AIAnalysisCompleted
```

These events may describe:

* AI analysis completion
* AI-generated recommendations
* AI explanations
* AI summaries
* AI classifications

They must not imply that an AI-generated recommendation became a human decision.

---

# 51. `AIRecommendationGenerated`

Represents successful generation of an advisory AI recommendation.

The payload should provide sufficient provenance to identify:

```text
model/provider
model version where applicable
request/context reference
recommendation
confidence or uncertainty where supported
generation metadata
```

The exact AI schema is governed by `08-ai-contract.md`.

The recommendation must remain non-authoritative.

---

# 52. `AIAnalysisCompleted`

Represents completion of an AI analysis operation.

Completion does not imply correctness.

It means:

```text
AI analysis completed
```

not:

```text
AI conclusion is authoritative
```

The event must not itself perform:

```text
Resolution
Case confirmation
Mark assignment
Authorization
```

---

# 53. AI-to-Domain Boundary

The canonical AI flow is:

```text
Application
      ↓
AI Adapter
      ↓
AI Analysis
      ↓
AI Output Validation
      ↓
Recommendation
      ↓
Human Review
      ↓
Authorized Command
      ↓
Domain State Change
      ↓
Domain Event
```

The prohibited flow is:

```text
AI
 ↓
direct database mutation
```

or:

```text
AI
 ↓
direct Resolution
```

or:

```text
AI
 ↓
direct authoritative marks
```

---

# 54. External Integration Boundary

External systems must not directly mutate OSM domain state.

Canonical flow:

```text
External Event
       ↓
Integration Adapter
       ↓
Validation / Normalization
       ↓
Application Command
       ↓
Domain Operation
       ↓
State Change
       ↓
Internal Domain Event
```

Not:

```text
External Event
       ↓
Direct ORM mutation
```

---

# 55. External Event Identity

An external event may have its own:

```text
externalEventId
```

This must not automatically replace OSM's:

```text
eventId
```

The integration boundary is responsible for translating external identity into the OSM event/application model.

The same external event must not produce duplicate consequential domain operations where idempotency is required.

---

# 56. Event Consumption Rules

Consumers must:

* validate event structure
* validate supported event version
* validate required fields
* verify event identity
* enforce consumer-specific authorization where relevant
* handle duplicate delivery safely
* preserve domain boundaries
* avoid mutating unrelated aggregates without an approved application operation

Consumers must not assume:

```text
event received = event was generated recently
```

because events may be delayed or retried.

---

# 57. Consumer Failure

A consumer failure must not mutate the original event.

The consumer may:

```text
retry
quarantine
dead-letter
alert
```

according to infrastructure rules.

A consumer must not modify:

```text
eventId
eventType
payload
occurredAt
causationId
```

to make processing succeed.

---

# 58. Event Consumer Side Effects

Consumers should produce side effects only when explicitly required.

Examples:

```text
TriageCaseCreated
      ↓
notification/read-model update
```

or:

```text
EvaluationSubmitted
      ↓
approved validation workflow
```

The consumer must not invent a new business interpretation of an event.

If a consumer requires a new domain transition, it should use the appropriate application command/domain operation.

---

# 59. Event-to-Command Chaining

Events may trigger approved application operations.

Example:

```text
EvaluationSubmitted
        ↓
Validation workflow
        ↓
QualitySignalGenerated
```

or:

```text
TriageCaseResolved
        ↓
Audit recording
```

However, event handlers must not bypass application/domain boundaries.

Preferred:

```text
Event
 ↓
Application Handler
 ↓
Command / Domain Operation
 ↓
State Change
 ↓
New Event
```

Not:

```text
Event
 ↓
ORM
 ↓
Direct database mutation
```

---

# 60. Event-to-API Relationship

An API request is not itself a domain event.

Canonical relationship:

```text
HTTP Request
      ↓
API Handler
      ↓
Application Command
      ↓
Domain Operation
      ↓
State Change
      ↓
Domain Event
      ↓
API Response
```

The response may represent the newly committed domain state.

The event is the durable representation of the domain fact.

---

# 61. API-to-Event Mapping

The following mappings are semantic examples:

| API/Application Operation  | Resulting Event                                                  |
| -------------------------- | ---------------------------------------------------------------- |
| Create Evaluation          | `EvaluationCreated`                                              |
| Update Evaluation          | `EvaluationUpdated` where the modification is domain-significant |
| Submit Evaluation          | `EvaluationSubmitted`                                            |
| Finalize Evaluation        | `EvaluationFinalized` where finalization is activated            |
| Generate QualitySignal     | `QualitySignalGenerated`                                         |
| Create TriageCase          | `TriageCaseCreated`                                              |
| Assign TriageCase          | `TriageCaseAssigned`                                             |
| Unassign TriageCase        | `TriageCaseUnassigned`                                           |
| Resolve TriageCase         | `TriageCaseResolved`                                             |
| Generate AI recommendation | `AIRecommendationGenerated` where activated                      |
| Complete AI analysis       | `AIAnalysisCompleted` where activated                            |

This mapping is semantic, not necessarily one-to-one.

One application operation may produce multiple approved events when explicitly required by the domain.

An event may also be produced through more than one approved application pathway if the domain semantics are the same.

---

# 62. Event Ordering and Causality Example

Example workflow:

```text
EvaluationSubmitted
        │
        └── causationId → SubmitEvaluation command
        │
        ▼
QualitySignalGenerated
        │
        └── causationId → EvaluationSubmitted event
        │
        ▼
TriageCaseCreated
        │
        └── causationId → approved case-creation operation/event
        │
        ▼
TriageCaseResolved
        │
        └── causationId → ResolveTriageCase command
```

All may share:

```text
correlationId
```

where they belong to the same business workflow.

---

# 63. Event Correlation Example

Example:

```json
{
  "eventId": "evt_300",
  "eventType": "TriageCaseResolved",
  "eventVersion": 1,
  "occurredAt": "2026-09-26T12:00:00Z",
  "producer": "moderation",
  "actor": {
    "type": "USER",
    "id": "moderator_123"
  },
  "aggregate": {
    "type": "TriageCase",
    "id": "case_123"
  },
  "correlationId": "corr_100",
  "causationId": "cmd_900",
  "payload": {}
}
```

This allows the system to answer:

```text
Which workflow did this belong to?
```

and:

```text
What immediately caused this event?
```

without embedding implementation-specific assumptions.

---

# 64. Event Registry Activation

An event is considered **active** only when all of the following are true:

1. its domain meaning is approved
2. its producer is implemented
3. its workflow is enabled by the roadmap
4. its payload contract is defined
5. its consumers are defined where applicable
6. its tests exist
7. its persistence/delivery behavior is implemented where required

Therefore:

```text
Registered
```

does not mean:

```text
Must emit immediately
```

This prevents AI coding agents from implementing unused event infrastructure merely because an event appears in this document.

---

# 65. Event Activation and Task Board

The Task Board controls implementation scope.

For example:

```text
P3 Validation
    ↓
QualitySignalGenerated

P4 Intelligence
    ↓
detector-related events

P5 Moderation
    ↓
TriageCaseCreated
TriageCaseAssigned
TriageCaseUnassigned
TriageCaseResolved

P6 Audit
    ↓
audit-related consumption/recording
```

The implementation must activate only the events required by the current milestone.

---

# 66. Audit Relationship

Domain events may be consumed by the audit subsystem where the Audit Contract requires durable recording.

Conceptually:

```text
Domain Event
      ↓
Audit Mapping
      ↓
AuditEvent
```

The audit record must describe what actually happened.

For example:

```text
TriageCaseResolved
```

must not be recorded as an audit event if the resolution transaction failed.

The event and audit system must not create historical claims unsupported by the committed domain state.

---

# 67. Audit Event Is Not an Authorization Mechanism

The presence of:

```text
AuditEvent
```

does not grant authority.

For example:

```text
AuditEvent:
  "case resolved"
```

cannot itself cause:

```text
another case to be resolved
```

Authorization must occur before the consequential domain operation.

---

# 68. Event Persistence and Audit Persistence

Where both domain event and audit record are required, their consistency requirements must follow the relevant contracts.

The implementation must not silently treat:

```text
audit persistence success
```

as proof that:

```text
domain operation succeeded
```

The domain state remains authoritative for the actual domain fact.

---

# 69. Event Security

Events must not expose unnecessary sensitive information.

The event payload must follow:

* Security Contract
* Data Contract
* API Contract
* AI Contract where applicable

Events must not contain:

```text
passwords
tokens
API keys
secrets
credentials
```

Personal information should be minimized to what approved consumers actually require.

---

# 70. Event Consumers and UI

The frontend UI is normally not treated as a direct domain-event consumer.

Preferred architecture:

```text
Domain Event
      ↓
Application/read model/notification mechanism
      ↓
API
      ↓
UI
```

If the architecture later explicitly introduces frontend event streaming, that must be defined by an appropriate contract.

The UI must not independently reinterpret domain events into authoritative state.

---

# 71. Event Infrastructure Should Be Minimal for MVP

The MVP should not introduce asynchronous infrastructure merely for architectural appearance.

Do not add:

```text
Kafka
RabbitMQ
NATS
Redis Streams
complex brokers
distributed event buses
```

unless explicitly required by the architecture or implementation roadmap.

A modular-monolith implementation may use:

```text
transactional outbox
+
background dispatcher
```

or an equivalent minimal mechanism.

The event contract defines the semantics, not an obligation to adopt a particular infrastructure product.

---

# 72. In-Process Events

For the MVP, domain events may initially be dispatched in-process where appropriate.

However:

```text
in-process dispatch
```

must not weaken the semantic guarantees of:

* event identity
* event meaning
* domain boundaries
* persistence consistency
* idempotency
* auditability

If an event must survive process failure, it must be durably persisted according to the outbox requirements.

---

# 73. Event Schema Evolution

Event schemas must evolve deliberately.

Compatible changes may include:

* adding optional metadata where allowed
* adding non-breaking optional fields
* improving documentation

Breaking changes include:

* changing field meaning
* changing field type incompatibly
* removing required fields
* changing event semantics
* changing authority meaning

Breaking changes require a new event version or another explicitly approved migration mechanism.

---

# 74. Event Naming Rules

Event names must:

* describe facts
* use past tense
* be domain meaningful
* avoid implementation terminology
* avoid HTTP terminology
* avoid database terminology

Good:

```text
EvaluationSubmitted
TriageCaseResolved
QualitySignalGenerated
```

Avoid:

```text
SubmitEvaluationEvent
EvaluationPostRequest
EvaluationRowUpdated
SaveEvaluationCompleted
```

---

# 75. Event Granularity

Events should represent meaningful domain facts.

Avoid event explosion.

Do not create an event for every:

```text
getter
setter
ORM update
internal calculation
temporary state mutation
```

Prefer:

```text
EvaluationUpdated
```

over dozens of implementation-level events when the domain does not require finer granularity.

However, do not combine genuinely different domain facts into one generic event merely to reduce event count.

The goal is:

```text
meaningful domain granularity
```

not:

```text
maximum event count
```

or:

```text
minimum event count
```

---

# 76. Forbidden Event Patterns

The following patterns are prohibited:

### 76.1 Event as command

```text
TriageCaseResolved
    ↓
"please resolve the case"
```

Events describe completed facts.

---

### 76.2 Event as authorization

```text
Event received
    ↓
therefore actor is authorized
```

Authorization must be independently established.

---

### 76.3 AI event as human decision

```text
AIRecommendationGenerated
    ↓
TriageCaseResolved
```

without an authorized human/domain transition is prohibited.

---

### 76.4 Direct ORM mutation from event handler

```text
Event
 ↓
ORM
 ↓
database mutation
```

without application/domain rules is prohibited.

---

### 76.5 New event identity on retry

```text
evt_123 fails
 ↓
retry
 ↓
evt_456
```

is prohibited.

The retry must reuse:

```text
evt_123
```

---

### 76.6 Silent event rewriting

```text
old event
 ↓
modify payload
 ↓
pretend historical event was different
```

is prohibited.

---

### 76.7 Treating detection as decision

```text
QualitySignalGenerated
 ↓
Confirmed misconduct
```

is prohibited unless a later authorized decision establishes that fact.

---

### 76.8 Treating delivery state as domain state

```text
event delivery failed
 ↓
EvaluationFailed
```

is prohibited unless explicitly defined by the domain.

---

# 77. Event Validation

Every event implementation must validate:

```text
eventId
eventType
eventVersion
occurredAt
producer
actor
aggregate
correlationId
causationId
payload
```

according to the applicable schema.

Invalid events must not silently enter the domain event processing path.

---

# 78. Contract Testing

Every active event should have tests covering at least:

### Schema

```text
required fields
field types
enum validity
version
```

### Semantics

```text
correct event meaning
correct producer
correct aggregate
correct actor
```

### Persistence

```text
state + event/outbox consistency
```

### Delivery

```text
retry behavior
duplicate delivery
failure behavior
```

### Security

```text
no secrets
no unauthorized sensitive data
```

### Authority

```text
AI cannot create unauthorized consequential decisions
```

---

# 79. Minimum Event Test Cases

For every active event, test:

```text
1. successful generation
2. correct event identity
3. correct event type
4. correct version
5. correct actor
6. correct producer
7. correct aggregate
8. correct causation
9. correct correlation
10. correct payload
11. persistence consistency
12. duplicate delivery
13. retry behavior
14. unsupported version handling
15. authorization boundary where applicable
```

---

# 80. Event Observability

Event processing should expose operationally useful metadata such as:

```text
eventId
eventType
eventVersion
correlationId
consumer
processing status
retry count
```

Operational logs must not expose secrets or unnecessary sensitive data.

Observability metadata must not change the domain meaning of an event.

---

# 81. Event Processing Metrics

Where observability is implemented, useful metrics include:

```text
events emitted
events delivered
events processed
processing failures
retry count
dead-letter/quarantine count
consumer latency
```

These are operational metrics.

They must not be interpreted as domain decisions.

---

# 82. Event Replay

Replay must be treated carefully.

Replaying an event may repeat consumer processing.

Therefore consumers must be designed with idempotency and replay safety in mind.

Replay must not automatically mean:

```text
re-execute original human decision
```

unless explicitly designed and authorized.

Historical domain events represent facts that occurred; replay is an infrastructure operation.

---

# 83. Historical Events

Historical events must remain interpretable.

When possible, consumers should use:

```text
eventType
eventVersion
occurredAt
payload
```

rather than assuming the current domain model will always exactly match the historical state.

Breaking event-schema changes must use explicit versioning.

---

# 84. Event Deletion

Committed domain events are historical records.

They must not be physically deleted merely because:

```text
a record changed
a consumer failed
a workflow was corrected
a UI no longer displays it
```

Retention/deletion requirements are governed by the applicable Data/Audit/Security contracts.

Where historical correction is required, append a new fact rather than rewriting the old fact.

---

# 85. Event Consistency Rules

The following invariants are mandatory:

```text
1. An event represents a completed domain fact.
2. A failed command must not produce its success event.
3. eventId is immutable.
4. eventId is stable across retries.
5. eventType is immutable.
6. eventVersion identifies event schema version.
7. actor identifies the cause of the event.
8. producer identifies the emitting application component.
9. causationId identifies the immediate cause.
10. correlationId links related workflow events.
11. domain state and required outbox records must be committed consistently.
12. event delivery may fail independently after commit.
13. consumers must tolerate duplicate delivery.
14. global event ordering is not guaranteed.
15. aggregate/workflow causal ordering must be preserved where required.
16. AI-generated recommendations are non-authoritative.
17. QualitySignal does not equal confirmation.
18. AuditEvent does not equal domain decision.
19. Event infrastructure state is not domain state.
20. Events must not bypass domain/application authority.
```

---

# 86. Canonical OSM Event Flow

The canonical OSM workflow is:

```text
Evaluation
     ↓
Deterministic Validation
     ↓
QualitySignalGenerated
     ↓
Human Review Workflow
     ↓
TriageCaseCreated
     ↓
TriageCaseAssigned
     ↓
Investigation
     ↓
Authorized Resolution
     ↓
TriageCaseResolved
     ↓
Audit Recording
```

The critical boundary is:

```text
Detection
     ↓
Signal
     ↓
Human Review
     ↓
Decision
     ↓
Audit
```

No stage may silently collapse these responsibilities.

---

# 87. Canonical AI-Assisted Flow

Where AI assistance is active:

```text
Evaluation / Signal / Case
          ↓
       AI Adapter
          ↓
     AI Analysis
          ↓
AIRecommendationGenerated
          ↓
      Human Review
          ↓
  Authorized Command
          ↓
   Domain State Change
          ↓
      Domain Event
          ↓
        Audit
```

AI may assist with:

```text
summarization
comparison
explanation
recommendation
classification assistance
```

AI must not directly become the authority for consequential human decisions.

---

# 88. Canonical Event Architecture

The complete conceptual architecture is:

```text
                         ┌───────────────────┐
                         │      API / UI     │
                         └─────────┬─────────┘
                                   │
                                Command
                                   │
                                   ▼
                         ┌───────────────────┐
                         │   Application     │
                         │ Auth + Validation │
                         └─────────┬─────────┘
                                   │
                                   ▼
                         ┌───────────────────┐
                         │      Domain       │
                         │     Operation     │
                         └─────────┬─────────┘
                                   │
                              State Change
                                   │
                     ┌─────────────┴─────────────┐
                     │                           │
                     ▼                           ▼
             Authoritative State          Event / Outbox
                     │                           │
                     └─────────────┬─────────────┘
                                   │
                                 COMMIT
                                   │
                                   ▼
                              Dispatcher
                                   │
                                   ▼
                              Consumers
                                   │
                  ┌────────────────┼────────────────┐
                  │                │                │
                  ▼                ▼                ▼
              Workflow          Audit          Notifications /
              Processing        Recording       Read Models
```

The key guarantee is:

```text
STATE + OUTBOX
      ↓
ATOMIC COMMIT
      ↓
DELIVERY
```

not:

```text
STATE
 ↓
maybe event
```

---

# 89. Agent-Critical Rules

AI coding agents implementing OSM must treat the following as non-negotiable:

```text
1. Do not emit an event for a failed domain operation.

2. Do not emit success events before the corresponding state
   transition is durably committed.

3. Do not create a new eventId when retrying an existing event.

4. Do not use an event as a command.

5. Do not use an event as an authorization mechanism.

6. Do not allow AI-generated events to become human decisions.

7. Do not treat QualitySignalGenerated as confirmation.

8. Do not treat AuditEvent as the domain decision itself.

9. Do not bypass application/domain logic from event handlers.

10. Do not directly mutate the database from an external event.

11. Do not invent new event semantics because an endpoint needs one.

12. Do not activate every registered event automatically.

13. Do not introduce event infrastructure merely for architectural appearance.

14. Do not silently change historical event payloads.

15. Do not assume global event ordering.

16. Do not assume event delivery occurs exactly once.

17. Do not assume command idempotency from eventId.

18. Do not expose secrets through event payloads.

19. Do not introduce new domain states through events without updating
    the Domain Contract.

20. If the implementation requires an event whose meaning is not
    defined by the approved contracts, stop and resolve the contract
    gap before coding.
```

---

# 90. Contract Hierarchy for Event Implementation

When implementing an event-driven workflow, the coding agent must reason in this order:

```text
01 Product Contract
        ↓
02 System Architecture
        ↓
05 Domain Contract
        ↓
06 API Contract
        ↓
07 Event Contract
        ↓
Task Board / Current Task
        ↓
Implementation
```

The Event Contract controls:

```text
event semantics
event structure
event identity
causation
correlation
persistence
delivery
retry
consumer behavior
```

The Domain Contract controls:

```text
what the domain fact actually means
```

The API Contract controls:

```text
how external/application clients invoke operations
```

The Task Board controls:

```text
what is currently in scope
```

---

# 91. Definition of Done for an Active Event

An event is not considered implementation-complete merely because a class/interface exists.

An active event is complete only when:

```text
✓ Domain meaning defined
✓ Producer defined
✓ Actor semantics defined
✓ Aggregate defined
✓ Envelope defined
✓ Payload defined
✓ Version defined
✓ Causation defined
✓ Correlation defined
✓ Persistence behavior implemented
✓ Outbox behavior implemented where required
✓ Retry behavior implemented
✓ Consumer idempotency implemented where required
✓ Authorization boundary verified
✓ Audit relationship verified where required
✓ Contract tests implemented
✓ Task Board scope satisfied
```

---

# 92. Final Event Model

The authoritative OSM event model can be summarized as:

```text
                    COMMAND
                       │
                       ▼
                DOMAIN OPERATION
                       │
                       ▼
               STATE TRANSITION
                       │
              ┌────────┴────────┐
              │                 │
              ▼                 ▼
       AUTHORITATIVE        DOMAIN EVENT
           STATE                 │
                                 ▼
                         EVENT / OUTBOX
                                 │
                               COMMIT
                                 │
                                 ▼
                             DISPATCH
                                 │
                     ┌───────────┼───────────┐
                     │           │           │
                     ▼           ▼           ▼
                  WORKFLOW     AUDIT      OTHER
                  CONSUMER     SYSTEM     APPROVED
```

With the fundamental OSM principles:

```text
EVENT
  ≠
COMMAND

EVENT
  ≠
AUDIT

QUALITY SIGNAL
  ≠
DECISION

AI RECOMMENDATION
  ≠
HUMAN DECISION

EVENT DELIVERY STATE
  ≠
DOMAIN STATE
```

And the central implementation guarantee:

```text
DOMAIN STATE
      +
EVENT / OUTBOX
      ↓
ATOMIC COMMIT
      ↓
EVENT DELIVERY
      ↓
IDEMPOTENT CONSUMPTION
```

This contract establishes the event layer as a **reliable representation of committed domain facts**, while preserving OSM's fundamental separation between detection, human decision-making, AI assistance, and audit history.
