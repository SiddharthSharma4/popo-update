# 10 — Demo Contract

**Project:** OSM — AI-Powered On-Screen Marking & Digital Evaluation System
**Document:** `docs/contracts/10-demo-contract.md`
**Status:** Authoritative
**Version:** 1.0
**Last Updated:** 2026-09-26

---

# 1. Purpose

This document defines the authoritative contract for demonstrating OSM.

The Demo Contract specifies:

* what the OSM demonstration must prove
* which workflows must be demonstrated
* which actors must be represented
* which UI states must be visible
* which API/application/domain/data/event behaviors must occur
* how AI-assisted functionality must be demonstrated
* how authoritative decisions must be distinguished from AI recommendations
* how persistence, audit, outbox, events, concurrency, and idempotency are demonstrated
* which demo data may be synthetic
* which behaviors must be real
* which shortcuts are prohibited
* how demo readiness is evaluated
* what constitutes a successful end-to-end demonstration

This document does **not** redefine domain rules, API contracts, event contracts, data models, or testing requirements.

Those remain governed by:

```text
05-domain-contract.md
06-api-contract.md
07-event-contract.md
08-data-contract.md
09-testing-contract.md
```

The Demo Contract defines how those contracts are **proven visibly and operationally**.

---

# 2. Demo Philosophy

The OSM demo must demonstrate the system as a controlled digital evaluation platform.

It must not reduce OSM to:

```text
Upload Answer
      ↓
AI
      ↓
Marks
```

The intended demonstration is:

```text
User
  ↓
Authentication
  ↓
Authorization
  ↓
Application Operation
  ↓
Domain Rules
  ↓
Authoritative State
  ↓
Event / Audit / Outbox
  ↓
Derived Workflow
  ↓
Human Review
  ↓
Authorized Resolution
```

AI participates as an advisory/detection capability:

```text
AI / Detector
      ↓
Signal / Recommendation
      ↓
Human/Application Review
      ↓
Authorized Command
      ↓
Authoritative Decision
```

AI must not be presented as the authoritative decision-maker.

---

# 3. Demo Authority

The Demo Contract is authoritative only for demonstration behavior.

It must not override:

```text
Product requirements
Architecture rules
Security rules
Domain invariants
API contracts
Event contracts
Data contracts
Testing contracts
```

If a conflict exists, the more foundational contract governs.

The demo must adapt to the contracts rather than modifying the contracts merely to make the demo easier.

---

# 4. Demo Objectives

The OSM demonstration must prove five categories of capability.

## 4.1 Product capability

The demo must show that users can perform the intended OSM workflows.

## 4.2 Domain correctness

The demo must show that authoritative decisions are controlled by domain/application rules.

## 4.3 AI boundary

The demo must show that AI/detection produces advisory or derived information rather than silently changing authoritative state.

## 4.4 Architectural correctness

The demo must visibly or observably demonstrate:

```text
API
→ Application
→ Domain
→ Persistence
→ Event
→ Audit
```

where applicable.

## 4.5 Reliability

The demo must demonstrate important guarantees such as:

```text
Authorization
Concurrency
Idempotency
Persistence consistency
Event delivery behavior
Auditability
```

where these are part of the implemented scope.

---

# 5. Demo Success Definition

A successful OSM demo is not defined by:

```text
UI loads successfully
```

alone.

A successful demo demonstrates that:

```text
User action
    ↓
Correct authorization
    ↓
Correct application operation
    ↓
Correct domain behavior
    ↓
Correct persisted state
    ↓
Correct event/audit behavior
    ↓
Correct resulting UI state
```

For workflows involving AI:

```text
AI / Detector
    ↓
Recommendation / Signal
    ↓
Human review
    ↓
Authorized command
    ↓
Authoritative state change
```

must remain visible and understandable.

---

# 6. Demo Environment

The demonstration environment should be deterministic and reproducible.

The preferred environment is:

```text
OSM Frontend
      ↓
OSM API
      ↓
Application / Domain
      ↓
Database
      ↓
Outbox / Event Infrastructure
      ↓
AI / Detector Adapter
```

The exact technologies are governed by the architecture and implementation contracts.

The demo environment must not depend on undocumented local configuration.

---

# 7. Demo Modes

OSM may support multiple demo modes.

## 7.1 Full Demo

Uses the complete implemented stack:

```text
Frontend
API
Application
Domain
Database
Outbox
Event processing
AI/detector integration
```

This is the preferred demonstration mode.

## 7.2 Controlled Demo

Uses deterministic adapters for external or AI-dependent components.

For example:

```text
AI Adapter
    ↓
Deterministic Demo Provider
```

This is acceptable when the purpose is to demonstrate OSM workflow behavior rather than live model performance.

## 7.3 Development Demo

Used internally during development.

It may expose additional diagnostics, debug information, or development tooling.

It must not be presented as equivalent to the production demonstration.

---

# 8. Synthetic Demo Data

Demo data may be synthetic.

Synthetic data is preferred for:

* student identities
* evaluator identities
* moderator identities
* evaluation records
* question data
* answer content
* marks
* rubrics
* quality signals
* triage cases
* resolutions
* audit records

The demo must clearly distinguish:

```text
Synthetic demo data
```

from:

```text
Real production data
```

No real personal or sensitive examination data should be required for the standard demonstration.

---

# 9. Demo Personas

The standard demonstration should use at least the following logical personas where supported by the implementation.

```text
Evaluator
Moderator
Administrator
```

AI/detector components are system actors rather than human personas.

Example:

```text
Evaluator
    evaluator.demo

Moderator
    moderator.demo

Administrator
    admin.demo

Detector
    deterministic-demo-detector
```

The exact identity format is implementation-specific.

---

# 10. Persona Isolation

The demo must prove authorization boundaries.

For example:

```text
Evaluator
    ↓
Evaluation workflow
```

while:

```text
Moderator
    ↓
Quality signals
    ↓
Triage
    ↓
Resolution
```

and:

```text
Administrator
    ↓
Administrative capabilities
```

The demo must not use a single unrestricted account to simulate every role unless the purpose is specifically to demonstrate an administrative/debug mode.

---

# 11. Standard Demo Scenario

The canonical OSM demonstration should follow this high-level story:

```text
1. Login
2. Evaluator opens evaluation
3. Evaluator reviews answers
4. Evaluator enters/updates marks
5. Evaluation is validated
6. Evaluation is submitted
7. Quality signal is generated where applicable
8. Moderator views signal
9. Triage case is created/opened
10. Moderator investigates
11. AI recommendation is displayed where applicable
12. Moderator makes an authorized decision
13. Resolution is recorded
14. Audit trail is visible
15. Domain event/outbox behavior is demonstrated
16. Final state is verified
```

Only steps supported by the implemented contracts should be shown as active functionality.

---

# 12. Demo Scenario A — Authentication

The demo begins with authentication.

Expected flow:

```text
Login Screen
     ↓
Credentials
     ↓
Authentication
     ↓
Authenticated Session
     ↓
Role-aware Application
```

The demo should establish that authentication is separate from authorization.

The system must not treat:

```text
authenticated
```

as equivalent to:

```text
authorized for every operation
```

---

# 13. Demo Scenario B — Evaluator Dashboard

After evaluator login, the demo should show the evaluator's permitted workspace.

The dashboard should provide access only to capabilities supported by the evaluator role.

The demo should establish:

```text
Evaluator
    ↓
Authorized evaluation work
```

and not:

```text
Evaluator
    ↓
All system capabilities
```

---

# 14. Demo Scenario C — Open Evaluation

The evaluator opens a valid evaluation.

The demonstration should make relevant context visible, such as:

```text
Evaluation
Student / candidate context
Assessment context
Question(s)
Answer(s)
Rubric/version
Current marks
Current evaluation status
```

The exact fields are governed by the Domain/API/UI contracts.

---

# 15. Demo Scenario D — Modify Evaluation

The evaluator performs a legitimate evaluation operation.

Example:

```text
Question
    ↓
Review answer
    ↓
Enter mark
    ↓
Save
```

The demo should prove that the change passes through the intended application/domain path.

The UI must not directly mutate authoritative state outside the defined API/application boundary.

---

# 16. Demo Scenario E — Validation

Before submission, applicable deterministic validation rules must execute.

Conceptually:

```text
Evaluation
    ↓
Validation
    ├── valid
    └── issue detected
```

Examples may include:

```text
Invalid mark range
Incomplete evaluation
Inconsistent total
Invalid rubric reference
Invalid state transition
```

Only validations actually defined by the applicable contracts should be demonstrated.

The demo must not invent business rules merely for visual effect.

---

# 17. Demo Scenario F — Evaluation Submission

When the evaluator submits an eligible evaluation:

```text
SubmitEvaluation
        ↓
Authorization
        ↓
Domain validation
        ↓
State transition
        ↓
Persistence
        ↓
Required event/outbox behavior
```

The resulting UI must reflect the authoritative persisted state.

The demo must not simulate successful submission by changing only frontend state.

---

# 18. Demo Scenario G — Quality Signal

Where the applicable workflow produces a quality signal:

```text
Evaluation
    ↓
Validation / Detector
    ↓
QualitySignal
```

The signal must be presented as:

```text
Potential issue
```

or:

```text
Derived finding
```

rather than automatically as:

```text
Confirmed violation
```

The exact terminology must follow the domain contract.

---

# 19. Demo Scenario H — AI Recommendation

Where AI functionality is implemented, the demo may show:

```text
AI Input
    ↓
AI Adapter
    ↓
AI Analysis
    ↓
Recommendation
```

The UI must clearly communicate that AI output is advisory where required.

Example conceptual presentation:

```text
AI Recommendation

Potential discrepancy detected.

Reason:
[advisory explanation]

Confidence:
[model output where applicable]

Status:
ADVISORY

No authoritative decision has been made.
```

The exact wording should follow the product/UI contract.

---

# 20. AI Demo Rule

The following behavior is prohibited:

```text
AI
 ↓
Automatic authoritative state mutation
```

unless a higher-level contract explicitly defines and authorizes such behavior.

The standard OSM demonstration must instead show:

```text
AI
 ↓
Recommendation / Signal
 ↓
Human interpretation
 ↓
Authorized command
 ↓
Domain state change
```

---

# 21. Demo Scenario I — Moderator Queue

The moderator logs in and views the review workflow.

The demo should show relevant:

```text
Quality Signals
Triage Cases
Statuses
Assignments
Evaluation context
```

only according to the implemented contracts.

The moderator should not receive evaluator-only operations unless explicitly authorized.

---

# 22. Demo Scenario J — Triage Case

The moderator opens a triage case.

The demo should show the relationship between:

```text
QualitySignal
        ↓
TriageCase
        ↓
Evaluation
        ↓
Evidence / supporting context
```

where applicable.

The signal must remain distinguishable from the eventual resolution.

---

# 23. Demo Scenario K — Investigation

The moderator reviews the available information.

The investigation may include:

```text
Original evaluation
Marks
Rubric/version
Quality signal
Evidence
AI recommendation
Relevant history
Audit information
```

Only information authorized for the moderator should be exposed.

---

# 24. Demo Scenario L — Resolution

Resolution is the authoritative workflow boundary.

The intended flow is:

```text
Moderator
    ↓
Review
    ↓
Authorized command
    ↓
Domain validation
    ↓
Resolution
    ↓
Authoritative state change
```

The demo must clearly distinguish:

```text
Signal
```

from:

```text
Recommendation
```

from:

```text
Resolution
```

These must not be collapsed into one concept.

---

# 25. Resolution Must Be Real

A demo must not merely display:

```text
"Resolved successfully"
```

while leaving the underlying state unchanged.

After resolution:

```text
Database state
    ↓
Audit state
    ↓
Event/outbox state
    ↓
API response
    ↓
UI
```

must be consistent with the actual implementation.

---

# 26. Audit Demonstration

The demo should demonstrate the audit trail for consequential operations where the contracts require auditing.

The audit view should make it possible to establish:

```text
Who
What
When
Which object
Which operation
Relevant context
```

The exact audit schema is governed by:

```text
07-event-contract.md
08-data-contract.md
```

Audit records must not be presented as ordinary application logs.

---

# 27. Event Demonstration

Where events are part of the demonstrated workflow, the demo should show:

```text
Domain operation
      ↓
Domain event
      ↓
Outbox
      ↓
Dispatcher
      ↓
Consumer
```

The event should retain its contractual identity and metadata.

The demo should not replace the event architecture with:

```text
Frontend callback
```

or:

```text
Direct database polling
```

merely to make the demonstration easier.

---

# 28. Outbox Demonstration

The preferred architecture is:

```text
Authoritative state
        +
Outbox event record
        ↓
     COMMIT
        ↓
    Dispatcher
```

The demo should be capable of proving, where practical, that the authoritative state and required outbox record are created consistently.

The demonstration does not require exposing database internals to ordinary users.

A developer/admin diagnostic view may be used where appropriate.

---

# 29. Delivery Failure Demonstration

If event delivery is included in the demo, an optional controlled failure scenario should demonstrate:

```text
Domain state
    ↓
COMMIT SUCCESS
    ↓
Outbox exists
    ↓
Delivery failure
    ↓
Retry
    ↓
Successful delivery
```

The demo must not imply:

```text
delivery failure = domain transaction failure
```

unless the applicable contract explicitly defines such behavior.

---

# 30. Idempotency Demonstration

Where command idempotency is implemented, the demo may submit the same logical command more than once using the same idempotency key.

Expected conceptual result:

```text
Request 1
    ↓
Operation executes

Request 2
    ↓
Same idempotency scope/key
    ↓
No duplicate consequential effect
```

The demonstration must distinguish this from event-consumer idempotency.

---

# 31. Event Consumer Idempotency

Where event consumers are implemented, the demo/test environment may intentionally deliver the same event more than once.

Expected result:

```text
Event
Event again
Event again
     ↓
One logical consumer effect
```

The consumer must not create duplicate domain effects merely because delivery was repeated.

---

# 32. Concurrency Demonstration

Where optimistic concurrency is part of the implemented scope, the demo should optionally show:

```text
User A reads version N
User B reads version N

User A updates
    ↓
version N → N+1

User B updates using version N
    ↓
CONFLICT
```

The system must not silently overwrite the newer state.

The exact conflict response follows the API contract.

---

# 33. Authorization Demonstration

At least one negative authorization scenario should be demonstrated.

Example:

```text
Evaluator
    ↓
Attempts moderator-only operation
    ↓
Denied
```

The demonstration should establish that authorization is enforced by the application/security layer rather than merely hidden in the UI.

A hidden button is not sufficient evidence of authorization.

---

# 34. Invalid State Demonstration

At least one invalid state transition should be demonstrated where supported.

Example:

```text
Finalized Evaluation
        ↓
Attempt unauthorized/invalid modification
        ↓
Rejected
```

The exact state transition must come from the Domain Contract.

The demo must not invent invalid transitions.

---

# 35. Error Handling

Errors should be demonstrated as controlled application outcomes.

The UI should not expose:

```text
Raw database errors
Stack traces
Secrets
Internal credentials
Unfiltered infrastructure details
```

Development diagnostics may exist outside the user-facing demo.

---

# 36. Loading and Empty States

The demo must not only show successful populated states.

Where applicable, the application should demonstrate:

```text
Loading
Empty
Error
Unauthorized
Forbidden
Not found
Conflict
Success
```

The exact states depend on the implemented UI/API contracts.

---

# 37. Demo Data Determinism

The preferred demo dataset should be deterministic.

A resettable demo dataset is strongly recommended:

```text
demo:reset
```

or an equivalent supported mechanism.

Resetting the environment should restore the canonical scenario.

Example:

```text
RESET
  ↓
Seed users
  ↓
Seed assessment
  ↓
Seed evaluations
  ↓
Seed rubric versions
  ↓
Seed signals/cases where appropriate
  ↓
Ready for demo
```

The exact reset mechanism is implementation-specific.

---

# 38. Demo Seed Data

The demo dataset should contain enough data to demonstrate the core workflow without unnecessary complexity.

Recommended logical dataset:

```text
1 Administrator
1 Evaluator
1 Moderator

1 Assessment
1 or more Questions
1 Rubric
1 Rubric Version

1 In-progress Evaluation
1 Submitted Evaluation

1 Quality Signal
1 Triage Case

1 Resolved Case
Associated Audit/Event data
```

Additional records may be included if needed to demonstrate list views, pagination, filtering, or history.

---

# 39. Demo Seed Data Must Respect Contracts

Seed data must not bypass domain rules merely because it is convenient.

If a persisted state can only be reached through a valid domain transition, the preferred seed strategy should either:

```text
create the state through supported application/domain mechanisms
```

or explicitly document that the record is fixture data.

The demo must not establish false architecture by directly inserting impossible production states.

---

# 40. Demo Fixtures vs Production Data

Demo fixtures must be clearly separable from production data.

Recommended mechanisms include:

```text
environment-specific database
```

or:

```text
explicit demo namespace/tenant
```

where supported.

The demo must never accidentally modify production data.

---

# 41. Demo Reset Safety

Reset functionality must be restricted to an appropriate environment.

The following must not be available through an ordinary production user interface:

```text
DELETE ALL DATA
RESET DATABASE
SEED DEMO DATA
```

unless explicitly authorized by the architecture/security contract.

---

# 42. Observability During Demo

The system should provide enough observability to diagnose failures.

Useful development observability includes:

```text
Request ID
Correlation ID
Event ID
Aggregate ID
Application operation
Persistence result
Outbox status
Consumer result
```

Sensitive information must not be exposed.

---

# 43. Correlation Demonstration

Where correlation IDs are implemented, the demo should be able to trace:

```text
User Action
   ↓
API Request
   ↓
Application Operation
   ↓
Domain Event
   ↓
Outbox
   ↓
Consumer
```

using the relevant correlation/provenance identifiers.

This is particularly useful when demonstrating an end-to-end workflow.

---

# 44. Demo Traceability

Each major demo action should be traceable to the contracts.

Example:

```text
"Submit Evaluation"

→ UX / Workflow Contract
→ Domain Contract
→ API Contract
→ Event Contract
→ Data Contract
→ Testing Contract
→ Demo Contract
```

The demo must not introduce behavior that exists only because it looks good during presentation.

---

# 45. Contract-to-Demo Matrix

The implementation should maintain a conceptual mapping such as:

| Demonstrated Capability | Primary Contract     |
| ----------------------- | -------------------- |
| Login                   | Security / API / UX  |
| Role-based access       | Security             |
| Evaluation workflow     | Domain / UX          |
| Evaluation submission   | Domain / API         |
| Validation              | Domain / Testing     |
| Quality signal          | Domain / Event       |
| AI recommendation       | AI/Domain/Event      |
| Triage                  | Domain / UX          |
| Resolution              | Domain / API / Event |
| Audit                   | Data / Event         |
| Outbox                  | Data / Event         |
| Event delivery          | Event                |
| Concurrency             | Data / Testing       |
| Idempotency             | API / Event / Data   |
| Error behavior          | API / Testing        |
| End-to-end workflow     | Testing / Demo       |

This matrix is illustrative and must be aligned with the final contract set.

---

# 46. Demo Evidence

A successful demonstration should produce observable evidence.

Evidence may include:

```text
UI state
API response
Database state
Event record
Outbox record
Audit record
Application logs
Test result
```

Evidence must correspond to actual system behavior.

Screenshots alone are not sufficient evidence for backend guarantees.

---

# 47. No Fake Success

The demo must not use hardcoded UI states such as:

```text
status = "RESOLVED"
```

without an actual authoritative state transition.

Similarly, it must not hardcode:

```text
AI recommendation
event success
audit entry
```

in the frontend when those values are supposed to originate from the backend/system.

Demo-only deterministic adapters are allowed when explicitly identified as adapters.

Fake architecture is not allowed.

---

# 48. No Hidden Manual Database Manipulation

During a standard demonstration, operators must not manually edit database rows to produce the desired result.

For example, the following is not a valid substitute for the actual workflow:

```text
Open database
    ↓
UPDATE triage_cases
    ↓
status = RESOLVED
```

The intended flow is:

```text
Moderator
    ↓
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

Manual database inspection is acceptable for verification.

Manual database mutation is not an acceptable demonstration of application functionality.

---

# 49. No AI Result Fabrication

If AI is demonstrated, the result must originate from:

```text
actual AI integration
```

or:

```text
explicit deterministic AI/demo adapter
```

It must not be falsely presented as a live model result when it is actually hardcoded.

The UI should identify demo/deterministic behavior where necessary.

---

# 50. AI Demonstration Transparency

A deterministic or mocked AI provider may be used when:

* external model access is unavailable
* cost must be controlled
* repeatability is required
* network access is unreliable
* the purpose is workflow demonstration

In that case:

```text
Demo AI Provider
```

must remain an adapter behind the same conceptual boundary as the real AI provider.

The application must not be architecturally coupled to the demo fixture.

---

# 51. Demo Failure Recovery

If a demo operation fails unexpectedly, the environment should be recoverable.

Preferred recovery:

```text
Reset demo
    ↓
Seed canonical data
    ↓
Repeat scenario
```

The operator should not need to manually repair database state.

---

# 52. Demo Readiness Levels

OSM may use the following readiness levels.

## Level 0 — Not Ready

Major application flow is unavailable.

## Level 1 — UI Demonstrable

Screens exist and navigation works, but important backend behavior may be incomplete.

This level must not be presented as a complete OSM demonstration.

## Level 2 — Functional

Core workflows work through the actual API/application/backend.

## Level 3 — Contract Demonstrable

Core workflows additionally demonstrate:

```text
Domain correctness
Persistence
Events
Audit
Authorization
Error handling
```

where applicable.

## Level 4 — End-to-End Demonstrable

The complete supported workflow works across:

```text
Frontend
API
Application
Domain
Database
Outbox
Events
AI/detector adapters
Human review
Resolution
Audit
```

and relevant tests pass.

---

# 53. Minimum Demo Acceptance Criteria

The standard OSM demo is considered ready only when the implemented scope can demonstrate, at minimum:

```text
[ ] Authentication works
[ ] Role-aware access works
[ ] Evaluator workflow works
[ ] Evaluation state persists
[ ] Submission works
[ ] Deterministic validation works where implemented
[ ] Quality signal workflow works where implemented
[ ] Moderator workflow works
[ ] Triage workflow works where implemented
[ ] AI remains advisory
[ ] Authorized resolution works where implemented
[ ] Audit behavior works where required
[ ] Event/outbox behavior works where required
[ ] Invalid operations are rejected
[ ] Authorization boundaries are enforced
[ ] Concurrency behavior is correct where required
[ ] Idempotency behavior is correct where required
[ ] Demo data can be reset
[ ] No fake success states are used
[ ] No production data is required
```

A checkbox should only be marked complete when the corresponding behavior is actually verified.

---

# 54. Standard Demo Sequence

The preferred presentation sequence is:

```text
1. Introduce OSM
2. Explain actors
3. Login as Evaluator
4. Open evaluation
5. Demonstrate evaluation workflow
6. Save/update evaluation data
7. Submit evaluation
8. Show validation/signal where applicable
9. Login as Moderator
10. Open review queue
11. Open quality signal
12. Open triage case
13. Show evidence/context
14. Show AI recommendation if implemented
15. Explain that recommendation is advisory
16. Perform authorized resolution
17. Show resulting authoritative state
18. Show audit evidence
19. Show event/outbox evidence where appropriate
20. Demonstrate one failure/authorization/concurrency case
21. Summarize architecture
```

The exact order may be adjusted to match the final UX contract.

---

# 55. Recommended Architecture Explanation During Demo

The presenter should be able to explain the system using the following simplified model:

```text
                    OSM
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
    Evaluation     Quality      Triage
                    Signal       Case
        │            │            │
        └────────────┼────────────┘
                     ▼
              Domain Workflow
                     │
          ┌──────────┼──────────┐
          ▼          ▼          ▼
       Database     Audit      Events
                                │
                                ▼
                           Consumers
```

And for AI:

```text
AI / Detector
      ↓
Advisory output
      ↓
Human/Application review
      ↓
Authorized command
      ↓
Authoritative state
```

---

# 56. Architecture Must Be Demonstrable

The demo should not merely claim:

```text
"We have an event-driven architecture."
```

Where practical, it should demonstrate evidence of:

```text
Domain operation
    ↓
Persisted state
    ↓
Outbox event
    ↓
Event processing
```

Likewise:

```text
AI recommendation
```

should be visibly distinguishable from:

```text
authoritative resolution
```

---

# 57. Demo Documentation

The repository should contain enough information for another developer to reproduce the demonstration.

At minimum, documentation should explain:

```text
How to start the application
How to configure the demo environment
How to seed demo data
How to reset demo data
Demo credentials/identities
Demo scenario
How to run tests
How to inspect relevant events/audit
How to use deterministic adapters
```

Secrets must never be committed.

---

# 58. Demo Credentials

If demo credentials are required, they must be:

```text
development/demo-only
```

and must not be reused as production credentials.

Example conceptual identities:

```text
evaluator.demo
moderator.demo
admin.demo
```

Actual passwords/secrets must follow the project's secret-management policy.

Never commit real credentials to the repository.

---

# 59. Demo Configuration

Demo configuration should be explicit.

For example:

```text
DEMO_MODE=true
AI_PROVIDER=deterministic
DATABASE=demo
```

The exact configuration mechanism is implementation-specific.

Demo configuration must not silently alter production behavior.

---

# 60. Demo Boundary

The demo must distinguish between:

```text
implemented product capability
```

and:

```text
future capability
```

Future functionality must not be presented as implemented functionality.

If a screen or capability is a prototype/mock, it should be clearly identified as such.

---

# 61. Future AI Capabilities

Potential future AI functionality may be shown conceptually, but must not be presented as operational unless implemented and tested.

Examples:

```text
advanced answer comparison
semantic rubric analysis
cross-evaluation anomaly detection
automated feedback generation
```

These must remain clearly separated from currently supported functionality.

---

# 62. Demo Security Rules

The demo must not expose:

```text
Passwords
API keys
Access tokens
Database credentials
Secret keys
Private student information
Internal infrastructure secrets
```

Logs/screenshots used for presentations must be sanitized.

---

# 63. Demo Privacy Rules

Synthetic data is preferred.

If non-synthetic data is ever used:

```text
authorization
privacy
data minimization
retention
access control
```

must follow the applicable security/data contracts.

The standard demo should not require real student examination data.

---

# 64. Demo Performance

The demo should feel responsive enough to demonstrate the workflow.

However, artificial delays must not be introduced merely to make asynchronous architecture visually apparent.

If an asynchronous operation is used:

```text
actual asynchronous state
```

should be represented honestly.

A loading indicator may be used to represent real processing.

---

# 65. Demo Observability View

A development-only diagnostic view may expose:

```text
Request
   ↓
Correlation ID
   ↓
Command
   ↓
Aggregate
   ↓
State transition
   ↓
Event
   ↓
Outbox
   ↓
Consumer
```

This is especially valuable for evaluating whether the implementation actually follows the architecture.

Such diagnostics must not bypass authorization.

---

# 66. Demo Test Relationship

The Demo Contract does not replace automated tests.

The relationship is:

```text
Automated Tests
      ↓
Verify behavior continuously

Demo
      ↓
Proves representative end-to-end behavior visibly
```

A feature should not be considered reliable merely because it works once during a live demonstration.

---

# 67. Demo vs End-to-End Tests

A successful E2E test may establish:

```text
login
→ evaluation
→ submission
→ signal
→ triage
→ resolution
```

The live demo should use the same underlying application behavior wherever practical.

The demo must not have a separate fake implementation.

---

# 68. Demo Regression Rule

If a previously demonstrated critical workflow breaks, the demo status must be considered degraded until:

```text
implementation fixed
      ↓
relevant tests pass
      ↓
demo scenario revalidated
```

The demo should not be "fixed" by changing only presentation behavior.

---

# 69. Demo Evidence Matrix

A recommended final verification matrix is:

| Capability        | UI Evidence       | API Evidence            | State Evidence           | Event/Audit Evidence          | Test Evidence     |
| ----------------- | ----------------- | ----------------------- | ------------------------ | ----------------------------- | ----------------- |
| Authentication    | Login succeeds    | Auth response           | Session/auth state       | N/A                           | Auth tests        |
| Authorization     | Allowed/denied UI | Correct status          | No unauthorized mutation | Audit where applicable        | Security tests    |
| Evaluation        | Evaluation screen | Evaluation API          | Evaluation persisted     | Relevant event                | Domain/API tests  |
| Submission        | Submitted state   | Submit response         | State transition         | Event/outbox                  | Workflow tests    |
| Quality Signal    | Signal visible    | Signal API              | Signal persisted         | Signal event where applicable | Signal tests      |
| Triage            | Case visible      | Triage API              | Case state               | Triage event/audit            | Triage tests      |
| AI recommendation | Advisory output   | AI/application response | No unauthorized mutation | Relevant provenance           | AI boundary tests |
| Resolution        | Resolved state    | Resolution response     | Resolution persisted     | Audit/event                   | Resolution tests  |
| Concurrency       | Conflict visible  | Conflict response       | Newer state preserved    | N/A                           | Concurrency tests |
| Idempotency       | Stable result     | Stable response         | No duplicate effect      | No duplicate event effect     | Idempotency tests |

Not every column is required for every feature.

---

# 70. Demo Anti-Patterns

The following are prohibited or strongly discouraged.

## 70.1 Frontend-only simulation

```text
Click button
 ↓
Change React state
 ↓
Show success
```

without backend state change.

---

## 70.2 AI pretending to be authoritative

```text
AI says wrong
 ↓
OSM automatically changes marks
```

without an authorized domain workflow.

---

## 70.3 Database shortcut

```text
Manual SQL
 ↓
Create final state
```

instead of using the application workflow.

---

## 70.4 Hardcoded success

```text
if demo:
    return "success"
```

to bypass real business logic.

---

## 70.5 Fake event architecture

```text
Frontend
 ↓
directly update "event log"
```

while claiming to demonstrate the real event/outbox pipeline.

---

## 70.6 Fake audit

```text
console.log("Case resolved")
```

presented as audit evidence.

---

## 70.7 Unrestricted demo account

Using one superuser to bypass actual authorization boundaries.

---

## 70.8 Hidden manual intervention

Changing records behind the scenes during the presentation without disclosing that the application workflow was not actually executed.

---

# 71. Demo Invariants

The following invariants apply to the demonstration.

### DEMO-001 — No fake authoritative state

The displayed authoritative state must originate from the actual application state.

### DEMO-002 — AI is advisory

AI output must not silently become an authoritative decision.

### DEMO-003 — UI is not the source of truth

UI state must reflect application/backend state.

### DEMO-004 — Domain rules remain authoritative

The demo must exercise actual domain/application rules.

### DEMO-005 — Authorization is real

Role restrictions must be enforced server-side according to the security/API architecture.

### DEMO-006 — Audit is durable

Where audit is required, demonstration evidence must come from the actual audit mechanism.

### DEMO-007 — Events are real

Where events are demonstrated, they must originate from the actual event architecture or an explicitly identified deterministic adapter.

### DEMO-008 — Outbox semantics are preserved

The demo must not bypass the required state/outbox persistence model.

### DEMO-009 — Demo data is isolated

Demo data must not accidentally affect production data.

### DEMO-010 — Reset is reproducible

The canonical demo scenario must be reproducible.

### DEMO-011 — No hidden state mutation

Manual database mutation must not substitute for application behavior.

### DEMO-012 — Demo behavior must be testable

Critical demonstrated behavior must have corresponding automated verification where required by the Testing Contract.

### DEMO-013 — Future functionality is labeled

Unimplemented capabilities must not be presented as implemented.

### DEMO-014 — Evidence must reflect reality

Screenshots, logs, UI labels, and presenter claims must correspond to actual system behavior.

### DEMO-015 — Contract hierarchy is preserved

The demo must not modify higher-level contracts merely to create a convenient presentation.

---

# 72. Canonical Demo Story

The canonical OSM story is:

```text
                    EVALUATOR
                        │
                        ▼
                  Open Evaluation
                        │
                        ▼
                 Review Answers
                        │
                        ▼
                   Enter Marks
                        │
                        ▼
                    Submit
                        │
                        ▼
                Deterministic
                  Validation
                        │
              ┌─────────┴─────────┐
              │                   │
            Valid              Signal
              │                   │
              │                   ▼
              │             QualitySignal
              │                   │
              │                   ▼
              │              Moderator
              │                   │
              │                   ▼
              │              TriageCase
              │                   │
              │                   ▼
              │              Investigation
              │                   │
              │             AI Recommendation
              │                   │
              │                   ▼
              │            Human Interpretation
              │                   │
              │                   ▼
              │          Authorized Resolution
              │                   │
              │                   ▼
              │              Audit / Event
              │
              ▼
          Final State
```

The central distinction remains:

```text
Detection
   ≠
Decision
   ≠
Audit
```

and:

```text
AI
   ≠
Authority
```

---

# 73. Presenter Narrative

The presenter should be able to explain OSM in the following sequence:

```text
"OSM is a digital evaluation and review platform."

"An evaluator performs the evaluation through the application."

"Validation and detection can identify potential issues."

"Those signals are not automatically treated as authoritative decisions."

"A moderator reviews the relevant information."

"AI may provide advisory analysis."

"The authorized workflow determines the authoritative outcome."

"The resulting state is persisted according to the data contract."

"Required audit records are created."

"Domain events are persisted and dispatched according to the event/outbox contract."

"The entire workflow is covered by automated tests."
```

This narrative should be adapted to the actual implemented feature set.

---

# 74. Demo Completion Checklist

Before an official OSM demonstration, verify:

## Environment

```text
[ ] Application starts successfully
[ ] Database is available
[ ] Required services are available
[ ] Demo configuration is loaded
[ ] Demo data is seeded
[ ] Demo reset works
```

## Authentication

```text
[ ] Evaluator login works
[ ] Moderator login works
[ ] Administrator login works where implemented
```

## Evaluation

```text
[ ] Evaluation opens
[ ] Questions/answers load
[ ] Marks can be modified where allowed
[ ] Validation works
[ ] Submission works
```

## Signals

```text
[ ] Quality signal appears where applicable
[ ] Signal source is identifiable
[ ] Signal is not presented as authoritative decision
```

## AI

```text
[ ] AI adapter works where implemented
[ ] AI output is clearly advisory
[ ] No unauthorized authoritative mutation occurs
[ ] Demo provider is clearly identified when deterministic
```

## Moderation

```text
[ ] Moderator queue works
[ ] Triage case opens
[ ] Investigation data is visible
[ ] Authorized resolution works
```

## Persistence

```text
[ ] Authoritative state persists
[ ] Version/concurrency behavior works where required
[ ] Audit behavior works where required
[ ] Outbox behavior works where required
```

## Events

```text
[ ] Event envelope is correct
[ ] Event identity is stable
[ ] Event is persisted according to contract
[ ] Consumer behavior works where implemented
[ ] Duplicate delivery is handled where required
```

## Security

```text
[ ] Unauthorized operation is rejected
[ ] Sensitive data is not exposed
[ ] Demo credentials are safe
```

## Testing

```text
[ ] Relevant automated tests pass
[ ] Integration tests pass where applicable
[ ] E2E workflow passes where applicable
[ ] No critical regression is known
```

---

# 75. Official Demo Acceptance

The OSM demonstration may be declared successful when:

```text
The core implemented workflow can be executed
from an authorized user action through the actual
application/domain/persistence path and produces the
expected authoritative state, with required events,
audit behavior, and AI boundaries preserved.
```

The demonstration must not depend on:

```text
manual database mutation
hardcoded success states
fake AI claims
hidden application bypasses
production secrets
undocumented infrastructure
```

---

# 76. Final Architecture Demonstrated by OSM

The complete demonstrated architecture is:

```text
                         USER
                          │
                          ▼
                   ┌─────────────┐
                   │     UI      │
                   └──────┬──────┘
                          │
                          ▼
                   ┌─────────────┐
                   │     API     │
                   └──────┬──────┘
                          │
                 Authentication
                 Authorization
                          │
                          ▼
                ┌──────────────────┐
                │   Application    │
                │    Command       │
                └────────┬─────────┘
                         │
                         ▼
                ┌──────────────────┐
                │      Domain      │
                │                  │
                │ Rules / State    │
                └────────┬─────────┘
                         │
                         ▼
                ┌──────────────────┐
                │   Persistence    │
                │                  │
                │ State + Outbox   │
                │ Audit            │
                └────────┬─────────┘
                         │
                       COMMIT
                         │
                         ▼
                     OUTBOX
                         │
                         ▼
                    DISPATCHER
                         │
                         ▼
                      EVENTS
                         │
             ┌───────────┼───────────┐
             ▼           ▼           ▼
          Workflow    Notification  External
          Consumers                 Adapters


                  AI / DETECTOR
                       │
                       ▼
               Signal / Advisory
                       │
                       ▼
                Human Review
                       │
                       ▼
              Authorized Command
                       │
                       ▼
              Authoritative State
```

---

# 77. OSM Demo Golden Rule

The single most important rule for the demonstration is:

```text
DEMO WHAT THE SYSTEM ACTUALLY DOES.
DO NOT DEMO WHAT THE SYSTEM ONLY APPEARS TO DO.
```

Therefore:

```text
UI success
    must correspond to
backend success

backend success
    must correspond to
domain-valid state

domain state
    must correspond to
required persistence

required persistence
    must correspond to
required events/audit

AI output
    must remain within
its contractual authority boundary
```

The OSM demonstration is therefore not merely a presentation layer.

It is a **visible proof of the contracts that govern the system**.

---

# 78. Contract Completion Rule

`10-demo-contract.md` is considered complete when:

```text
01 Product/System Contract
        ↓
02 Architecture Contract
        ↓
03 Security Contract
        ↓
04 UX/Workflow Contract
        ↓
05 Domain Contract
        ↓
06 API Contract
        ↓
07 Event Contract
        ↓
08 Data Contract
        ↓
09 Testing Contract
        ↓
10 Demo Contract
```

can be traced into a coherent executable demonstration.

The demo must provide evidence that the implemented OSM system respects the preceding contracts.

---

# 79. Final OSM Principle

OSM should be demonstrated as:

```text
A controlled digital evaluation system
where authoritative decisions are governed by
application and domain rules,
AI and detection provide advisory/derived signals,
human workflows provide authorized interpretation,
persistence preserves authoritative state,
events propagate domain facts,
audit preserves consequential history,
and automated tests verify the complete system.
```

The demo must make these boundaries visible.

```text
DETECTION ≠ DECISION ≠ AUDIT

AI ≠ AUTHORITY

COMMAND ≠ EVENT

EVENT ≠ AUDIT

STATE ≠ DELIVERY

UI ≠ SOURCE OF TRUTH

DEMO ≠ FAKE IMPLEMENTATION
```

These distinctions are mandatory architectural boundaries for the OSM demonstration.
