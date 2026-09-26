# OSM — API Contract

**Document:** `docs/contracts/06-api-contract.md`
**Status:** AUTHORITATIVE
**Authority Level:** API behavior and surface contract
**Depends On:** `docs/contracts/01-product-contract.md`, `docs/contracts/02-architecture-contract.md`, `docs/planning/03-build-roadmap.md`, `docs/planning/04-task-board.md`, `docs/contracts/05-domain-contract.md`
**Consumed By:** Backend implementation, frontend integration, API tests, OpenAPI specification, AI coding agents, integration adapters
**Primary Purpose:** Define the canonical HTTP/API boundary of OSM without allowing the API layer to redefine domain authority.

---

# 1. Document Authority

This document is the authoritative contract for the OSM API boundary.

It defines:

* API resources
* endpoint behavior
* request semantics
* response semantics
* DTO boundaries
* authentication requirements
* authorization expectations
* validation behavior
* workflow commands
* concurrency behavior
* idempotency behavior
* error semantics
* audit expectations
* AI interaction boundaries
* integration boundaries
* API testing expectations

This document does **not** redefine:

* product requirements
* domain meaning
* aggregate ownership
* business authority
* authentication implementation
* database schema
* infrastructure architecture
* AI model selection

Those concerns belong to their respective contracts.

---

# 2. Contract Hierarchy

The project contracts form the following hierarchy:

```text
01-product-contract.md
        ↓
Product truth
        ↓
02-architecture-contract.md
        ↓
System boundaries
        ↓
03-build-roadmap.md
        ↓
Implementation phases
        ↓
04-task-board.md
        ↓
Execution state
        ↓
05-domain-contract.md
        ↓
Domain meaning and authority
        ↓
06-api-contract.md
        ↓
External application interface
        ↓
Implementation / OpenAPI / tests
```

The API must not invent domain semantics.

If an API requirement conflicts with the Domain Contract, implementation must stop and the contract conflict must be resolved before coding continues.

---

# 3. Core API Principle

The API is an **application boundary**, not the source of business truth.

The canonical flow is:

```text
HTTP Request
      ↓
Request Parsing
      ↓
Schema Validation
      ↓
Authentication
      ↓
Authorization
      ↓
Application Command / Query
      ↓
Domain Validation
      ↓
Domain Operation
      ↓
Persistence Transaction
      ↓
Audit / Required Side Effects
      ↓
Response DTO
      ↓
HTTP Response
```

The API must not bypass:

* authorization
* domain invariants
* workflow rules
* concurrency rules
* audit requirements
* AI authority boundaries

---

# 4. Fundamental Authority Model

OSM follows:

```text
Authoritative Data
        ↓
Deterministic Detection
        ↓
QualitySignal
        ↓
TriageCase
        ↓
Human Investigation
        ↓
Resolution
        ↓
Authoritative State Change
        ↓
AuditEvent
```

The API must preserve this distinction.

## 4.1 QualitySignal

A `QualitySignal` is a derived observation.

It is **not**:

* proof of misconduct
* a final decision
* a moderation resolution
* an authoritative correction

## 4.2 TriageCase

A `TriageCase` represents a review workflow.

It is **not**:

* proof that a problem occurred
* a final finding
* an automatic disciplinary action

## 4.3 Resolution

A `Resolution` represents an authorized human decision.

## 4.4 AuditEvent

An `AuditEvent` is a durable historical record of what actually happened.

---

# 5. API Versioning

All externally exposed OSM APIs use an explicit version prefix.

Canonical MVP prefix:

```text
/api/v1
```

Example:

```text
GET /api/v1/evaluations/{evaluationId}
```

Breaking API changes require a versioning decision.

Agents must not silently introduce breaking changes to `/api/v1`.

---

# 6. Resource Naming

Resource names use plural nouns.

Examples:

```text
/evaluations
/quality-signals
/triage-cases
/audit-events
/evaluation-cycles
/rubrics
/questions
```

Use kebab-case for multi-word resource names.

Correct:

```text
/quality-signals
/triage-cases
/audit-events
```

Avoid:

```text
/qualitySignals
/triageCases
/auditEvents
```

---

# 7. Resource IDs

All resource identifiers are treated as opaque identifiers.

Clients must not infer:

* database type
* database sequence
* storage location
* tenant information
* timestamp
* business meaning

from an ID.

Example:

```text
evaluationId = "eval_01H..."
```

The exact ID generation mechanism belongs to the persistence/architecture implementation.

The API contract only requires that IDs are:

* unique within their resource scope
* stable for the lifetime of the resource
* safe to transport through URLs
* treated as opaque by clients

---

# 8. Timestamp Convention

All API timestamps use ISO 8601 UTC.

Canonical representation:

```text
2026-09-26T10:30:00Z
```

API responses must use UTC timestamps.

Clients must not depend on server-local time.

---

# 9. Enum Convention

API enum values use uppercase `SNAKE_CASE`.

Examples:

```text
IN_PROGRESS
SUBMITTED
FINALIZED
REVIEWABLE
OPEN
UNDER_REVIEW
RESOLVED
```

Enum ordering has no semantic meaning.

Clients must not assume:

```text
OPEN < REVIEWABLE < RESOLVED
```

or any other ordering.

---

# 10. Nullability

A field is nullable only when the contract explicitly defines it as nullable.

These are different:

```json
{}
```

and:

```json
{
  "comment": null
}
```

Omitted fields and explicit `null` must not be treated as equivalent unless the field contract says so.

Unknown fields must be rejected for strict command/request DTOs unless an endpoint explicitly permits extensibility.

---

# 11. HTTP Methods

OSM uses HTTP methods according to their intended semantics.

| Method | Purpose                                          |
| ------ | ------------------------------------------------ |
| GET    | Retrieve resource/query                          |
| POST   | Create resource or execute explicit command      |
| PATCH  | Partially update mutable resource fields         |
| DELETE | Delete only where domain rules explicitly permit |

---

# 12. PATCH Semantics

PATCH requests use partial-update semantics.

Rules:

1. Omitted fields retain their existing values.
2. Explicit `null` has meaning only for nullable fields.
3. Unknown fields are rejected.
4. PATCH cannot perform consequential workflow transitions.
5. Consequential state transitions require explicit command endpoints.
6. Domain invariants are still enforced after applying the update.

Example:

```http
PATCH /api/v1/evaluations/{evaluationId}
```

may update editable marks.

It must not be used to perform:

```text
SUBMIT
FINALIZE
RESOLVE
ASSIGN
ESCALATE
```

Those require explicit commands.

---

# 13. Explicit Workflow Commands

Consequential workflow actions use explicit command endpoints.

Preferred:

```text
POST /evaluations/{id}/submit
POST /triage-cases/{id}/assign
POST /triage-cases/{id}/resolve
```

Avoid:

```text
PATCH /evaluations/{id}
{
  "status": "SUBMITTED"
}
```

Avoid:

```text
PATCH /triage-cases/{id}
{
  "status": "RESOLVED"
}
```

This ensures that domain actions remain explicit and auditable.

---

# 14. Authentication Boundary

Authentication is required for protected API resources.

The API must obtain the authenticated actor from the approved security mechanism.

The API must not trust client-supplied fields such as:

```json
{
  "userId": "admin"
}
```

to establish identity.

Authenticated identity comes from the security layer.

The exact credential/session/token mechanism is defined by the Security Contract and implementation architecture.

---

# 15. Authorization Boundary

Authorization is server-side.

The client may hide unauthorized controls for UX purposes, but this does not constitute authorization.

Every protected consequential operation must perform server-side authorization.

Examples:

```text
Evaluator
    → edit own permitted evaluation

Moderator
    → review permitted triage cases

Authorized reviewer
    → record permitted resolution

Administrator
    → perform explicitly authorized administrative actions
```

The API must not assume that a user is authorized merely because the endpoint is reachable.

---

# 16. Authorization Before Disclosure

Protected resources must not leak sensitive resource existence or protected details to unauthorized users.

Where appropriate, unauthorized access should be represented consistently according to the security contract.

The API must avoid returning sensitive resource fields before authorization succeeds.

---

# 17. API / Domain Separation

The API layer must not contain core domain logic.

Preferred:

```text
Controller
    ↓
Request DTO
    ↓
Application Command
    ↓
Domain
    ↓
Repository
```

Not:

```text
Controller
    ↓
ORM
    ↓
Database
```

Controllers should remain thin.

---

# 18. DTO Boundary

API DTOs are transport representations.

They are not domain entities.

Example:

```text
EvaluationResponse
```

is not the same conceptual object as:

```text
Evaluation
```

DTOs may:

* shape response data
* omit internal fields
* combine approved domain information
* represent transport-specific metadata

DTOs must not introduce new business meaning.

---

# 19. Domain Contract Dependency

All API DTOs and commands must map to concepts approved by:

```text
05-domain-contract.md
```

If an endpoint requires a concept that does not have an approved domain meaning:

```text
STOP
    ↓
Identify contract gap
    ↓
Resolve domain contract
    ↓
Update dependent API contract
    ↓
Resume implementation
```

The coding agent must not invent a new domain entity merely to satisfy an API implementation.

---

# 20. Canonical API Resource Inventory

The MVP API is organized around the following resources.

| Resource          | Purpose                           |
| ----------------- | --------------------------------- |
| EvaluationCycle   | Evaluation-cycle context          |
| Evaluation        | Authoritative evaluation instance |
| Question          | Evaluation question               |
| Rubric            | Marking criteria/version context  |
| QualitySignal     | Derived quality observation       |
| TriageCase        | Human review workflow             |
| Resolution        | Human decision                    |
| AuditEvent        | Durable historical record         |
| Evaluator         | Evaluator participation/reference |
| AI Recommendation | Non-authoritative AI assistance   |

Not every resource requires full CRUD.

Resource exposure must follow domain authority.

---

# 21. Canonical Endpoint Inventory

The following endpoints define the MVP API surface.

## 21.1 Authentication

```text
GET  /api/v1/auth/me
POST /api/v1/auth/login
POST /api/v1/auth/logout
```

These endpoints are exposed only if required by the selected authentication mechanism.

Authentication implementation is governed by the Security Contract.

---

## 21.2 Evaluation Cycles

```text
GET /api/v1/evaluation-cycles
GET /api/v1/evaluation-cycles/{cycleId}
```

Creation and mutation endpoints are only exposed where required by the product workflow.

---

## 21.3 Evaluations

```text
GET   /api/v1/evaluations
GET   /api/v1/evaluations/{evaluationId}
PATCH /api/v1/evaluations/{evaluationId}
POST  /api/v1/evaluations/{evaluationId}/submit
```

### Responsibilities

`GET`:

* retrieve permitted evaluation information

`PATCH`:

* update permitted mutable evaluation fields

`POST /submit`:

* validate submission eligibility
* transition evaluation into submitted state
* trigger required validation workflow
* produce required audit information
* return resulting evaluation state

---

# 22. Evaluation Update Contract

Evaluation updates must be limited to fields that are mutable in the current evaluation state.

Typical MVP update semantics may include:

```json
{
  "marks": [
    {
      "questionId": "question_123",
      "awarded": 8
    }
  ]
}
```

The exact DTO must remain aligned with the Domain Contract.

The API must validate:

```text
question exists
question belongs to evaluation context
mark is numeric
mark >= 0
mark <= applicable maximum
evaluator has permission
evaluation is editable
```

---

# 23. Evaluation Submission

Canonical endpoint:

```text
POST /api/v1/evaluations/{evaluationId}/submit
```

The submission command must:

1. authenticate actor
2. authorize evaluator
3. verify evaluation state
4. validate required evaluation data
5. execute domain transition
6. persist the transition transactionally
7. trigger required deterministic validation
8. generate required QualitySignals
9. record required audit information
10. return the resulting state

Submission must not directly produce a human resolution.

---

# 24. Validation Trigger

The API must expose a clear application boundary for deterministic validation.

For MVP, validation is initiated as part of evaluation submission unless the implementation contract explicitly defines a separate validation command.

Canonical conceptual flow:

```text
POST /evaluations/{id}/submit
        ↓
Evaluation submitted
        ↓
Deterministic validation
        ↓
QualitySignal generated where applicable
```

A separate public validation endpoint must not be introduced merely for architectural appearance.

If a separate endpoint is later required, it must be explicitly added to this contract.

---

# 25. Quality Signals

Canonical endpoints:

```text
GET /api/v1/quality-signals
GET /api/v1/quality-signals/{signalId}
```

QualitySignal creation is normally an application/detector responsibility.

Clients must not arbitrarily create authoritative QualitySignals through a generic CRUD endpoint.

A QualitySignal must contain sufficient context to understand:

```text
what was detected
why it was detected
which evaluation/context it relates to
which detector/rule produced it
detector version where applicable
severity
evidence/provenance references
```

---

# 26. QualitySignal Authority Boundary

The API must never represent:

```text
QualitySignal = confirmed finding
```

Instead:

```text
QualitySignal
    =
derived observation requiring interpretation
```

The API response must use language consistent with this distinction.

Avoid fields or messages that imply an unresolved signal is already a confirmed violation.

---

# 27. QualitySignal Provenance

A QualitySignal should be traceable to its source and detection mechanism.

Conceptually:

```text
SOURCE
  ↓
INPUT
  ↓
METHOD
  ↓
VERSION
  ↓
RESULT
  ↓
HUMAN INTERPRETATION
  ↓
DECISION
```

For deterministic detectors this should include enough information to reproduce or understand the detection.

For statistical detection it must include sufficient comparison/baseline context.

For AI assistance it must include the AI provenance required by the AI Contract.

---

# 28. Evidence Boundary

Evidence represents information used to support:

* a QualitySignal
* investigation
* a Resolution

Evidence may reference:

* evaluation data
* question/mark data
* deterministic detector output
* statistical context
* AI-generated analysis
* approved integration information

Evidence itself does not become authoritative merely because it is attached to a case.

---

# 29. Triage Cases

Canonical endpoints:

```text
GET  /api/v1/triage-cases
GET  /api/v1/triage-cases/{caseId}
POST /api/v1/triage-cases
POST /api/v1/triage-cases/{caseId}/assign
POST /api/v1/triage-cases/{caseId}/resolve
```

A TriageCase represents a human review workflow.

---

# 30. TriageCase Creation

A case created from a QualitySignal must preserve the relationship between the case and its source signal.

Canonical conceptual request:

```json
{
  "qualitySignalId": "signal_123"
}
```

The server must verify:

```text
signal exists
signal is accessible
signal is eligible for case creation
actor is authorized
```

The API must not allow arbitrary clients to manufacture a case representing an unsupported finding.

---

# 31. TriageCase Assignment

Canonical endpoint:

```text
POST /api/v1/triage-cases/{caseId}/assign
```

Conceptual request:

```json
{
  "assigneeId": "user_123"
}
```

The server must verify:

* case exists
* actor may assign the case
* target assignee is eligible
* current case state permits assignment
* assignment is persisted
* audit information is recorded

---

# 32. TriageCase State vs Resolution Outcome

These concepts must remain separate.

```text
TriageCase state
    =
workflow state

Resolution
    =
human decision/outcome
```

A case may move through workflow states such as:

```text
OPEN
ASSIGNED
UNDER_REVIEW
RESOLVED
```

The exact authoritative state vocabulary must remain aligned with the Domain Contract.

Resolution outcome vocabulary must not be independently invented by the API layer.

---

# 33. Case Resolution

Canonical endpoint:

```text
POST /api/v1/triage-cases/{caseId}/resolve
```

Conceptual request:

```json
{
  "outcome": "..."
  ,
  "reason": "...",
  "evidenceReferences": []
}
```

The exact allowed outcome vocabulary is defined by the Domain/Product Contracts.

The resolution operation must:

1. authenticate actor
2. authorize actor
3. verify current case state
4. validate required evidence/context
5. execute domain resolution
6. persist the resolution
7. record required audit information
8. return the resulting case/resolution state

AI must not directly execute this command.

---

# 34. AI API Boundary

AI functionality is assistive.

Canonical conceptual flow:

```text
Application
      ↓
AI Adapter
      ↓
AI Output
      ↓
Schema Validation
      ↓
Safety / Authority Validation
      ↓
Recommendation
      ↓
Human Interpretation
      ↓
Authorized Command
```

AI must not directly:

* assign authoritative marks
* resolve a moderation case
* confirm misconduct
* modify authoritative evaluation state
* bypass authorization
* create an audit event claiming a human decision occurred

---

# 35. AI Recommendations

AI outputs should be represented as recommendations or analysis.

Example conceptual response:

```json
{
  "recommendation": "...",
  "confidence": 0.82,
  "evidenceReferences": [],
  "model": {
    "provider": "...",
    "model": "...",
    "version": "..."
  }
}
```

The exact AI response schema belongs to the AI Contract and must not be expanded here without coordination.

AI output is non-authoritative unless explicitly transformed through an authorized human workflow.

---

# 36. AI Failure Behavior

If AI is unavailable:

```text
AI unavailable
      ↓
Core deterministic workflow continues
```

The system must not require AI for:

* evaluation
* deterministic validation
* QualitySignal persistence
* moderation workflow
* human resolution
* audit

AI failures should produce an explicit recoverable application state rather than silently altering domain meaning.

---

# 37. Audit Events

Canonical endpoints:

```text
GET /api/v1/audit-events
GET /api/v1/audit-events/{eventId}
```

Audit history is primarily system-generated.

Clients must not be allowed to freely manufacture authoritative historical events.

---

# 38. Audit Semantics

An audit event records what actually happened.

Incorrect:

```text
Client requested resolution
        ↓
Audit says "case resolved"
```

Correct:

```text
Request
   ↓
Authorization
   ↓
Domain operation
   ↓
Successful state change
   ↓
AuditEvent
```

Failed operations must not produce audit records claiming successful state transitions.

---

# 39. Audit Immutability

Audit events are historical records.

Therefore:

```text
AuditEvent
    =
append-oriented historical record
```

Audit events must not be casually edited or deleted.

Any exceptional retention/deletion behavior must be explicitly authorized by the relevant higher-level contract.

---

# 40. Domain Events vs Audit Events

These concepts are distinct.

### Domain Event

Represents something that happened in the domain.

Examples:

```text
EvaluationSubmitted
QualitySignalGenerated
TriageCaseAssigned
TriageCaseResolved
```

### AuditEvent

Represents the durable historical record required for traceability.

Therefore:

```text
Domain Event ≠ automatically identical to AuditEvent
```

An implementation may use domain events to trigger audit recording, but must preserve the semantic distinction.

Avoid recursive concepts such as:

```text
AuditEventRecorded
    ↓
AuditEvent
    ↓
AuditEventRecorded
```

unless explicitly required by the event contract.

---

# 41. Error Response Contract

All API errors use a consistent structured representation.

Canonical shape:

```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "The requested resource was not found.",
    "details": {},
    "requestId": "req_123"
  }
}
```

The exact field names may be refined in implementation, but the semantics must remain consistent.

---

# 42. HTTP Error Semantics

The following meanings are authoritative:

### 400 — Bad Request

Use for malformed or structurally invalid requests.

Examples:

```text
invalid JSON
malformed request syntax
invalid basic parameter structure
```

### 401 — Unauthorized

Use when authentication is missing or invalid.

### 403 — Forbidden

Use when the authenticated actor is not authorized.

### 404 — Not Found

Use when the requested resource does not exist or must be represented as unavailable according to the security contract.

### 409 — Conflict

Use when the request cannot be completed because of resource state or concurrency conflict.

Examples:

```text
stale version
already resolved case
invalid state transition due to concurrent update
duplicate operation conflict
```

### 422 — Unprocessable Entity

Use when the request is structurally valid but violates semantic/domain validation.

Examples:

```text
mark exceeds maximum
required evaluation information missing
invalid domain transition
invalid command semantics
```

### 429 — Too Many Requests

Use when applicable rate limits are exceeded.

### 500 — Internal Server Error

Use for unexpected server-side failures.

The API must not expose internal stack traces or sensitive implementation details.

---

# 43. Validation Error Shape

Semantic validation errors should identify affected fields where possible.

Example:

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "The request failed validation.",
    "details": {
      "marks[0].awarded": [
        "Awarded marks cannot exceed the maximum marks."
      ]
    },
    "requestId": "req_123"
  }
}
```

---

# 44. Pagination

Collection endpoints use explicit pagination.

Canonical conceptual parameters:

```text
?page=1&pageSize=20
```

Responses should provide enough metadata for the client to continue pagination.

Example:

```json
{
  "items": [],
  "page": 1,
  "pageSize": 20,
  "total": 100
}
```

The exact pagination mechanism must remain consistent across collection endpoints.

Clients must not assume that an unbounded collection is returned.

---

# 45. Filtering and Sorting

Filtering and sorting must only expose approved query capabilities.

Do not expose arbitrary database query expressions.

Example:

```text
GET /api/v1/triage-cases?status=OPEN
```

is acceptable if defined.

Avoid:

```text
?where=raw SQL expression
```

or equivalent unrestricted query mechanisms.

---

# 46. Concurrency Model

MVP uses optimistic concurrency for consequential mutable resources.

Resources participating in consequential mutations expose a version or equivalent concurrency token.

Conceptually:

```text
GET resource
    ↓
version = 7
    ↓
PATCH / command
expectedVersion = 7
    ↓
server checks current version
    ↓
if current != expected
    ↓
409 CONFLICT
```

The exact persistence implementation belongs to the architecture layer.

The API semantics remain:

```text
stale mutation
    →
409 CONFLICT
```

---

# 47. Idempotency Model

Idempotency is required for retry-sensitive commands where duplicate execution could produce duplicate consequences.

This particularly applies to operations such as:

```text
submit
resolve
assign
create case
```

where applicable.

Clients may send:

```http
Idempotency-Key: <opaque-key>
```

---

# 48. Idempotency Semantics

An idempotency key is scoped to:

```text
authenticated actor
+
HTTP operation/endpoint
+
idempotency key
```

For the same logical request:

```text
same key
+
same operation
+
same request semantics
        ↓
return original operation result
```

For the same key with incompatible request semantics:

```text
same key
+
different request
        ↓
409 CONFLICT
```

The implementation must not execute the same consequential operation twice merely because the client retried after a network failure.

Retention duration is an implementation/infrastructure concern unless a higher contract specifies otherwise.

---

# 49. Request ID

Every API request should have a request identifier.

Canonical header:

```http
X-Request-ID
```

If supplied by the client, the server must validate it according to the accepted format.

If absent, the server generates one.

The request ID should appear in:

* server logs
* error responses
* relevant audit context
* tracing information

where applicable.

---

# 50. Correlation ID

A correlation ID identifies a broader multi-step operation.

Canonical header:

```http
X-Correlation-ID
```

Conceptually:

```text
one HTTP request
    =
requestId

multi-step workflow
    =
correlationId
```

If the MVP does not require cross-request workflows, correlation IDs may be optional.

The project must not create unnecessary distributed tracing infrastructure solely to satisfy this document.

---

# 51. Transaction Boundary

Consequential commands should execute within an appropriate transaction boundary.

For example:

```text
Resolve Case
   ↓
validate
   ↓
change case state
   ↓
record resolution
   ↓
persist required audit information
   ↓
commit
```

The API must not return a successful consequential response before the required authoritative state change has been durably accepted.

---

# 52. Authorization and Validation Ordering

The canonical conceptual pipeline is:

```text
HTTP parsing
      ↓
Basic schema validation
      ↓
Authentication
      ↓
Authorization
      ↓
Application validation
      ↓
Domain validation
      ↓
Domain operation
      ↓
Persistence
      ↓
Audit
      ↓
Response
```

Basic request-shape validation may occur before authentication.

Protected resource disclosure and protected domain processing must remain subject to authentication and authorization.

---

# 53. DELETE Policy

Deletion is not a generic capability.

Authoritative resources such as:

```text
AuditEvent
Resolution
completed Evaluation history
```

must not be physically deleted unless explicitly authorized by a higher-level contract.

Where history must be preserved:

```text
archive/deactivate
```

is preferred over destructive deletion.

---

# 54. External OSM Integration Boundary

External OSM systems are integration boundaries.

The API must not leak external integration models directly into the internal domain.

Preferred:

```text
External OSM
      ↓
Integration Adapter
      ↓
Translation / Normalization
      ↓
Internal Domain
      ↓
Application API
```

Avoid:

```text
External OSM JSON
      ↓
Direct domain persistence
```

---

# 55. Synthetic OSM Adapter

The MVP may use a synthetic/mock OSM adapter.

Its purpose is to demonstrate:

```text
External source
      ↓
Integration boundary
      ↓
Normalized internal data
      ↓
OSM workflow
```

The synthetic adapter must remain replaceable.

It must not become the domain model.

---

# 56. External Data Authority

External OSM data does not automatically become authoritative merely because it enters the system.

The integration layer must identify:

```text
source
source identifier
source version/context where applicable
retrieval context where applicable
```

The domain must determine how imported information participates in the workflow.

---

# 57. API Boundary and AI Boundary

AI-generated information entering the API must be treated as derived/non-authoritative unless a human-authorized workflow explicitly transforms it into an authoritative decision.

The API must never allow:

```text
AI output
   ↓
direct authoritative mutation
```

without the required human/domain workflow.

---

# 58. API Security Rules

The API must:

* authenticate protected requests
* authorize protected operations
* validate all client input
* avoid trusting client-supplied identity
* avoid exposing internal stack traces
* avoid leaking secrets
* avoid logging sensitive credentials
* enforce domain constraints server-side
* validate resource ownership/permission
* protect consequential commands from replay/duplication where required

---

# 59. Sensitive Field Handling

Sensitive fields must not automatically appear in every DTO.

Each response must expose only fields required for its purpose.

Avoid:

```text
return entire database entity
```

Prefer:

```text
explicit response DTO
```

This reduces accidental information leakage.

---

# 60. API Response Principle

Responses should represent the resulting application/domain state.

For consequential commands:

```text
command
   ↓
successful domain operation
   ↓
resulting state
   ↓
response
```

Do not return:

```text
"success": true
```

without sufficient information for the client to understand the resulting state where that state matters.

---

# 61. Canonical DTO Inventory

The MVP should define explicit DTOs for:

```text
AuthMeResponse

EvaluationSummaryResponse
EvaluationResponse
EvaluationUpdateRequest
SubmitEvaluationRequest

QualitySignalSummaryResponse
QualitySignalResponse

CreateTriageCaseRequest
AssignTriageCaseRequest
ResolveTriageCaseRequest
TriageCaseResponse

ResolutionResponse

AuditEventResponse

ErrorResponse
ValidationErrorResponse

PaginationResponse
```

---

# 62. EvaluationResponse

Canonical conceptual shape:

```json
{
  "id": "evaluation_123",
  "evaluationCycleId": "cycle_123",
  "status": "IN_PROGRESS",
  "evaluator": {
    "id": "user_123",
    "displayName": "Evaluator"
  },
  "marks": [
    {
      "questionId": "question_1",
      "awarded": 8,
      "maximum": 10
    }
  ],
  "rubric": {
    "id": "rubric_1",
    "version": 3
  },
  "createdAt": "2026-09-26T10:00:00Z",
  "updatedAt": "2026-09-26T10:15:00Z"
}
```

This is a conceptual canonical shape.

The implementation must refine it only according to approved domain semantics.

---

# 63. EvaluationUpdateRequest

Conceptual shape:

```json
{
  "marks": [
    {
      "questionId": "question_1",
      "awarded": 8
    }
  ]
}
```

Rules:

* only mutable fields are accepted
* evaluator authorization is required
* marks are validated against applicable maximums
* immutable fields are rejected
* status changes are prohibited through PATCH

---

# 64. SubmitEvaluationRequest

If no additional submission data is required:

```json
{}
```

The actor is derived from authentication.

The client must not provide:

```json
{
  "submittedBy": "user_123"
}
```

to establish the submitting identity.

---

# 65. QualitySignalResponse

Conceptual shape:

```json
{
  "id": "signal_123",
  "evaluationId": "evaluation_123",
  "type": "EXAMPLE_SIGNAL",
  "severity": "MEDIUM",
  "status": "REVIEWABLE",
  "summary": "Derived observation.",
  "evidenceReferences": [],
  "detector": {
    "type": "DETERMINISTIC",
    "name": "example-detector",
    "version": "1.0.0"
  },
  "createdAt": "2026-09-26T10:20:00Z"
}
```

The exact signal types and severity vocabulary must come from the approved contracts.

---

# 66. CreateTriageCaseRequest

Conceptual shape:

```json
{
  "qualitySignalId": "signal_123"
}
```

The server derives or validates the relevant evaluation/context from the signal.

The client must not be allowed to fabricate unsupported relationships.

---

# 67. AssignTriageCaseRequest

Conceptual shape:

```json
{
  "assigneeId": "user_456"
}
```

The server determines whether:

```text
requesting actor
        ↓
may assign
        ↓
target user
```

---

# 68. ResolveTriageCaseRequest

Conceptual shape:

```json
{
  "outcome": "APPROVED_OUTCOME",
  "reason": "Human review reason.",
  "evidenceReferences": [
    "evidence_123"
  ]
}
```

The exact outcome vocabulary is owned by the Domain/Product Contract.

The API must not invent new resolution outcomes.

---

# 69. AuditEventResponse

Conceptual shape:

```json
{
  "id": "audit_123",
  "eventType": "TRIAGE_CASE_RESOLVED",
  "actor": {
    "type": "USER",
    "id": "user_456"
  },
  "resource": {
    "type": "TRIAGE_CASE",
    "id": "case_123"
  },
  "occurredAt": "2026-09-26T10:30:00Z",
  "correlationId": "corr_123",
  "metadata": {}
}
```

Audit representation must reflect actual completed operations.

---

# 70. Actor Representation

Actors may conceptually include:

```text
USER
SYSTEM
DETECTOR
AI
INTEGRATION
```

However:

```text
AI
```

must never be represented as the human actor responsible for a consequential human decision.

For example:

```text
Resolution.actor.type = AI
```

is prohibited for a human-authorized resolution.

AI may instead be recorded as:

```text
source
recommendation provider
analysis provider
```

where appropriate.

---

# 71. Query vs Command Boundary

Reads:

```text
GET
```

must not mutate authoritative state.

Commands:

```text
POST /.../{id}/submit
POST /.../{id}/resolve
POST /.../{id}/assign
```

may mutate authoritative state only through approved application/domain operations.

---

# 72. No Generic CRUD for Consequential Workflows

Avoid generic endpoints such as:

```text
PUT /triage-cases/{id}
PATCH /triage-cases/{id}
```

for:

```text
resolve
assign
escalate
close
```

when those actions have domain consequences.

Explicit commands provide:

* clearer semantics
* better authorization boundaries
* clearer audit events
* better concurrency handling
* better API documentation
* safer AI-agent implementation

---

# 73. No Direct ORM Exposure

Never expose ORM entities directly through the API.

Avoid:

```text
ORM entity → JSON
```

Use:

```text
Domain/Application result
      ↓
Response DTO
      ↓
JSON
```

This protects the API from accidental coupling to persistence structure.

---

# 74. No Client-Side Authority

The client must not be trusted to establish:

```text
actor identity
authorization
mark validity
case ownership
resolution authority
audit truth
```

All consequential decisions are server-controlled.

---

# 75. No AI Direct-Write Path

There must be no API route equivalent to:

```text
POST /ai/resolve-case
```

where AI directly changes authoritative case state.

Instead:

```text
AI recommendation
      ↓
Human review
      ↓
Authorized command
      ↓
Domain operation
```

---

# 76. OpenAPI Relationship

The OpenAPI specification is an implementation/documentation artifact derived from this contract.

The intended authority chain is:

```text
06-api-contract.md
        ↓
OpenAPI specification
        ↓
API implementation
        ↓
Contract tests
```

Not:

```text
Implementation
        ↓
Generated OpenAPI
        ↓
OpenAPI becomes authority
```

If the OpenAPI specification conflicts with this document, the contract conflict must be resolved rather than silently choosing whichever artifact is easier to implement.

---

# 77. OpenAPI Synchronization Rule

When an API endpoint changes:

```text
06-api-contract.md
        ↓
OpenAPI
        ↓
Implementation
        ↓
Tests
```

must remain synchronized.

No endpoint should be implemented solely because it exists in generated OpenAPI if it is not authorized by this contract.

---

# 78. Contract Testing

The API implementation must eventually have contract tests covering:

```text
authentication
authorization
request validation
response schema
workflow commands
state transitions
error semantics
concurrency
idempotency
audit behavior
AI authority boundary
integration boundary
```

At minimum, the MVP vertical slice must be covered.

---

# 79. MVP Vertical Slice

The first end-to-end API slice is:

```text
Authenticated Evaluator
        ↓
GET Evaluation
        ↓
PATCH Marks
        ↓
POST Submit
        ↓
Deterministic Validation
        ↓
QualitySignal
        ↓
Authenticated Moderator
        ↓
GET QualitySignal
        ↓
POST Create TriageCase
        ↓
POST Assign
        ↓
POST Resolve
        ↓
AuditEvent
```

This is the primary integration target before broadening the API.

---

# 80. Vertical Slice Success Criteria

The slice is successful when:

```text
1. evaluator authenticates
2. evaluator can access permitted evaluation
3. evaluator can modify permitted marks
4. evaluator can submit
5. deterministic validation executes
6. applicable QualitySignal is persisted
7. moderator can retrieve the signal
8. moderator can create/access the relevant case
9. case can be assigned
10. authorized reviewer can resolve
11. resulting state is persisted
12. required audit information exists
13. unauthorized operations are rejected
14. duplicate consequential requests do not duplicate state changes
15. stale concurrent mutations are rejected safely
```

---

# 81. API Invariants

The following invariants are mandatory:

```text
INV-API-001
Every protected operation requires authentication.

INV-API-002
Every consequential operation requires server-side authorization.

INV-API-003
Client-supplied identity cannot establish actor authority.

INV-API-004
QualitySignal is derived information, not a final decision.

INV-API-005
TriageCase is workflow state, not proof of misconduct.

INV-API-006
Resolution represents an authorized decision.

INV-API-007
AuditEvent represents actual completed activity.

INV-API-008
AI cannot directly perform authoritative human decisions.

INV-API-009
PATCH cannot perform consequential workflow transitions.

INV-API-010
Consequential workflows use explicit command endpoints.

INV-API-011
Domain rules cannot be bypassed by API handlers.

INV-API-012
ORM entities must not be exposed directly.

INV-API-013
Stale consequential mutations must produce a concurrency conflict.

INV-API-014
Retry-sensitive commands must have defined idempotency behavior.

INV-API-015
Authoritative history must not be casually deleted.

INV-API-016
External OSM models must not become internal domain models directly.

INV-API-017
AI failure must not make the deterministic core workflow unusable.

INV-API-018
API DTOs must not introduce unapproved domain semantics.
```

---

# 82. Forbidden API Patterns

The following patterns are prohibited:

```text
HTTP handler → ORM → database
```

```text
PATCH status = RESOLVED
```

```text
client-supplied userId determines authorization
```

```text
AI output → authoritative database mutation
```

```text
QualitySignal → automatically treated as confirmed misconduct
```

```text
generic CRUD endpoint for consequential workflow actions
```

```text
AuditEvent created before successful state transition
```

```text
unbounded collection responses
```

```text
raw SQL/query expressions exposed through public filters
```

```text
external OSM payload directly persisted as domain entity
```

```text
OpenAPI silently redefining contract behavior
```

---

# 83. Agent Execution Rules

An AI coding agent working on an API task must:

1. Read the relevant domain contract section.
2. Read the relevant task from `docs/planning/04-task-board.md`.
3. Inspect existing implementation before modifying it.
4. Reuse existing patterns where compatible.
5. Implement only the requested endpoint/behavior.
6. Preserve authorization boundaries.
7. Preserve domain invariants.
8. Add/update request and response DTOs where required.
9. Add/update validation.
10. Add/update tests.
11. Verify error behavior.
12. Verify concurrency/idempotency where applicable.
13. Verify audit behavior where applicable.
14. Update task status only after verification.
15. Stop after completing the assigned task.

The agent must not use an API task as justification for unrelated architectural refactoring.

---

# 84. Contract Conflict Rule

If the agent discovers:

```text
API requirement
        conflicts with
Domain Contract
```

the agent must not silently choose one.

It must identify:

```text
CONTRACT CONFLICT
```

and stop implementation at the affected boundary until the authoritative contracts are reconciled.

---

# 85. Existing-Code-First Rule

Before implementing an endpoint, the agent must inspect:

```text
existing routes
existing controllers
existing DTOs
existing application services
existing domain commands
existing repositories
existing validation
existing authentication
existing authorization
existing tests
existing OpenAPI
```

The agent must not create duplicate infrastructure when an approved implementation already exists.

---

# 86. API Change Workflow

Any API change follows:

```text
Requirement
    ↓
Contract impact analysis
    ↓
Domain impact check
    ↓
06-api-contract.md
    ↓
OpenAPI update
    ↓
Implementation
    ↓
Tests
    ↓
Integration verification
    ↓
Task Board update
```

For domain-affecting API changes:

```text
Domain Contract
```

must be updated first.

---

# 87. Backward Compatibility

Within `/api/v1`:

```text
existing endpoint meaning
existing required fields
existing response semantics
```

must not be broken casually.

Breaking changes require:

```text
contract review
+
versioning decision
```

Adding optional response fields is generally less disruptive than changing existing field meaning.

Changing the semantic meaning of an existing field is a breaking contract change even if the JSON shape remains identical.

---

# 88. API Observability

Relevant requests should be traceable through:

```text
requestId
correlationId where applicable
authenticated actor
endpoint
operation
result
latency
error code where applicable
```

Sensitive information must not be logged merely for observability.

Logs must not contain:

```text
passwords
authentication secrets
access tokens
unnecessary sensitive user data
```

---

# 89. API Definition of Done

An API task is not complete merely because the endpoint returns a successful response.

Definition of Done:

```text
Implementation exists
        +
Request schema verified
        +
Response schema verified
        +
Authentication verified
        +
Authorization verified
        +
Domain validation verified
        +
Error behavior verified
        +
Concurrency/idempotency verified where applicable
        +
Audit behavior verified where applicable
        +
Tests pass
        +
OpenAPI synchronized
        +
Task Board updated
        +
Traceability updated
```

---

# 90. Agent Stop Condition

After completing an API task:

```text
Implementation complete
        +
Required tests pass
        +
Required verification complete
        +
Contract synchronized
        +
OpenAPI synchronized
        +
Task status updated
        +
Traceability updated
        ↓
STOP
```

The agent must not automatically continue to another unrelated API task.

---

# 91. Contract Authority Summary

The following hierarchy must remain intact:

```text
PRODUCT
   ↓
ARCHITECTURE
   ↓
DOMAIN
   ↓
API
   ↓
OPENAPI
   ↓
IMPLEMENTATION
   ↓
TESTS
```

The API is authoritative for the **external interface**, but it is subordinate to the Product, Architecture, and Domain Contracts for meaning and authority.

---

# 92. Final Canonical OSM API Flow

The complete MVP API/domain relationship is:

```text
                         CLIENT
                           │
                           ▼
                    ┌─────────────┐
                    │ HTTP / API  │
                    └──────┬──────┘
                           │
                    Auth + Authz
                           │
                           ▼
                 ┌──────────────────┐
                 │ Application Layer│
                 └────────┬─────────┘
                          │
                          ▼
                 ┌──────────────────┐
                 │     DOMAIN       │
                 └────────┬─────────┘
                          │
             ┌────────────┼────────────┐
             ▼            ▼            ▼
        Evaluation   Validation   Integration
             │            │            │
             │            ▼            │
             │      QualitySignal      │
             │            │            │
             │            ▼            │
             │       TriageCase        │
             │            │            │
             │            ▼            │
             │       Resolution        │
             │            │            │
             └────────────┼────────────┘
                          ▼
                      AuditEvent
                          │
                          ▼
                    Response DTO
                          │
                          ▼
                        CLIENT
```

AI operates only as an assistive layer:

```text
                 ┌─────────────────┐
                 │   AI Adapter    │
                 └────────┬────────┘
                          │
                          ▼
                  AI Recommendation
                          │
                          ▼
                    Human Review
                          │
                          ▼
                 Authorized Command
                          │
                          ▼
                       DOMAIN
```

AI never becomes the authoritative workflow owner.

---

# 93. Final Non-Negotiable Rules

```text
1. API is not the domain.

2. Client input is never trusted as authority.

3. Authentication establishes identity.

4. Authorization establishes permission.

5. Domain rules establish valid state transitions.

6. PATCH cannot silently perform consequential commands.

7. Consequential actions use explicit command endpoints.

8. QualitySignal is derived observation.

9. TriageCase is human-review workflow.

10. Resolution is an authorized decision.

11. AuditEvent records what actually happened.

12. AI is assistive, not authoritative.

13. Deterministic workflow must work without AI.

14. External OSM data crosses an explicit integration boundary.

15. ORM models are never exposed directly as API contracts.

16. API DTOs cannot invent domain semantics.

17. Concurrency conflicts must be explicit.

18. Retry-sensitive commands must have defined idempotency semantics.

19. OpenAPI follows the API Contract; it does not silently redefine it.

20. A task is complete only after implementation, verification,
    contract synchronization, tests, and traceability are complete.
```

---

# 94. Document Completion Criteria

`06-api-contract.md` is considered complete for MVP when:

```text
✓ API authority hierarchy defined
✓ Resource inventory defined
✓ Endpoint inventory defined
✓ Request semantics defined
✓ Response semantics defined
✓ DTO boundary defined
✓ Authentication boundary defined
✓ Authorization boundary defined
✓ PATCH semantics defined
✓ ID conventions defined
✓ Timestamp conventions defined
✓ Enum conventions defined
✓ Error semantics defined
✓ Pagination semantics defined
✓ Concurrency semantics defined
✓ Idempotency semantics defined
✓ Request/correlation ID semantics defined
✓ QualitySignal boundary defined
✓ TriageCase boundary defined
✓ Resolution boundary defined
✓ Audit boundary defined
✓ AI boundary defined
✓ Integration boundary defined
✓ OpenAPI relationship defined
✓ Contract-testing expectations defined
✓ MVP vertical slice defined
✓ Agent execution rules defined
✓ Stop condition defined
```

**This document is the API execution authority.**

**It defines what the OSM API is allowed to expose and how that interface behaves.**

**It does not grant the API permission to redefine the domain.**
