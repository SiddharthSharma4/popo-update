# OSM Frontend Design Contract

**Document:** `docs/11-frontend-design-contract.md`
**Status:** LOCKED — Authoritative UX/UI Specification
**Created From:** TASK-P11-DEMO-003 Audit Findings + Frontend Data Audit
**Applies To:** All frontend implementation work in `apps/web/`
**Backend Freeze:** `apps/api/`, `packages/shared/`, SQLite schema, API routes, DTOs, domain invariants — all FROZEN.

---

## PREAMBLE

This document is the single source of truth for the OSM frontend redesign. It replaces the current dark developer panel aesthetic with an institutional-grade examination evaluation interface.

Compliance required with: `docs/contracts/01-product-contract.md`, `docs/contracts/02-architecture-contract.md`, `docs/contracts/05-domain-contract.md`, `docs/contracts/06-api-contract.md`, `docs/contracts/09-testing-contract.md`, `docs/contracts/10-demo-contract.md`.

---

## SECTION 1 — DESIGN PRINCIPLES

### P1. Clarity First
Every screen element must have a clear, unambiguous purpose. When in doubt between two options, choose the clearer one.

### P2. Academic Trust
The interface must feel like a tool trusted by universities and examination boards. Visual language: precise, calm, professional. Never playful, experimental, or speculative.

### P3. Human Authority Is Supreme
AI is always advisory. Every AI output must be visibly labeled, explicitly non-binding, and require human acknowledgment. Visual weight of AI content must always be less than that of human decision controls.

### P4. Information Hierarchy
The most important information for the current task is always the most visually prominent. Secondary information accessible but does not compete for primary attention. Tertiary metadata is collapsible or de-emphasized.

### P5. Low Cognitive Load
Fewer clicks per task. Minimal scrolling during marking. Clear visual state (saved, pending, locked). Predictable navigation.

### P6. Accessibility
Operable by keyboard, readable by screen readers. Color alone never conveys meaning. Contrast meets WCAG 2.1 AA. Focus indicators always visible.

### P7. Consistency
The same status (SUBMITTED, OPEN, RESOLVED) always uses the same badge color, text, and icon across every component.

### P8. Auditability Visible
Traceability accessible without dominating workflows. Always clear: what happened, when, by whom.

### P9. Workflow Efficiency
Marking 30 questions should feel efficient. Save operations fast and confirmable. Keyboard navigation between questions supported. Current workflow position always visible.

### P10. Restrained AI Presentation
AI advisory panels never use bold primary colors, large type, or prominent placement. AI content must be visually subordinate to the human decision interface surrounding it.

---

## SECTION 2 — DESIGN TOKENS

### 2.1 Color System

Replace current dark crypto aesthetic (`#0b0f19`) with a professional light-dominant institutional palette.

**Core Backgrounds:**
- `--osm-bg-page: #F7F8FA` — Off-white page background
- `--osm-bg-surface: #FFFFFF` — Primary cards, panels
- `--osm-bg-elevated: #F0F2F5` — Raised panel, sidebar, headers
- `--osm-bg-recessed: #E8EBF0` — Input backgrounds, table rows

**Borders:**
- `--osm-border-subtle: #DDE1E7` — Card borders, dividers
- `--osm-border-strong: #B8BEC9` — Active input borders, table headers
- `--osm-border-focus: #2563EB` — Keyboard focus ring

**Brand / Primary Action:**
- `--osm-primary: #1E3A5F` — Deep navy
- `--osm-primary-hover: #16305A`
- `--osm-primary-text: #FFFFFF`
- `--osm-primary-subtle: #EFF4FB` — Hover/active tint

**Status Colors:**
- Success: `--osm-success: #1A7F5A`, `--osm-success-bg: #ECFDF5`, `--osm-success-border: #A7F3D0`
- Warning: `--osm-warning: #B45309`, `--osm-warning-bg: #FFFBEB`, `--osm-warning-border: #FDE68A`
- Danger: `--osm-danger: #B91C1C`, `--osm-danger-bg: #FEF2F2`, `--osm-danger-border: #FECACA`
- Info: `--osm-info: #1D4ED8`, `--osm-info-bg: #EFF6FF`, `--osm-info-border: #BFDBFE`
- AI Advisory (visually distinct, NOT authoritative): `--osm-ai-bg: #F5F3FF`, `--osm-ai-border: #DDD6FE`, `--osm-ai-text: #5B21B6`

**Text:**
- `--osm-text-primary: #111827`
- `--osm-text-secondary: #374151`
- `--osm-text-muted: #6B7280`
- `--osm-text-disabled: #9CA3AF`
- `--osm-text-inverse: #FFFFFF`

**Statistical (monospace for alignment):**
- `--osm-stat-color: #1E3A5F`
- `--osm-stat-positive: #1A7F5A`
- `--osm-stat-negative: #B91C1C`
- `--osm-stat-neutral: #374151`

### 2.2 Typography

Google Fonts: `Inter` (body) + `IBM Plex Sans` (headings) + `IBM Plex Mono` (statistics, IDs)

- `--osm-font-heading: 'IBM Plex Sans', 'Segoe UI', system-ui, sans-serif`
- `--osm-font-body: 'Inter', 'Segoe UI', system-ui, sans-serif`
- `--osm-font-mono: 'IBM Plex Mono', 'Fira Code', 'Courier New', monospace`

**Type Scale:**

| Token | Size | Weight | Use |
| :--- | :--- | :--- | :--- |
| `--osm-t-page-title` | 1.375rem (22px) | 700 | Main page heading |
| `--osm-t-section-title` | 1.125rem (18px) | 600 | Section headings |
| `--osm-t-card-title` | 1rem (16px) | 600 | Card headings |
| `--osm-t-body` | 0.9375rem (15px) | 400 | Body text |
| `--osm-t-body-sm` | 0.875rem (14px) | 400 | Secondary body |
| `--osm-t-label` | 0.8125rem (13px) | 500 | Form labels, table headers |
| `--osm-t-metadata` | 0.75rem (12px) | 400 | Timestamps, IDs |
| `--osm-t-stat` | 1.5rem (24px) | 700 | Large metric values |
| `--osm-t-stat-sm` | 1.125rem (18px) | 600 | Smaller metrics |

### 2.3 Spacing Scale (base 4px)

`--osm-sp-1: 4px` | `--osm-sp-2: 8px` | `--osm-sp-3: 12px` | `--osm-sp-4: 16px` | `--osm-sp-5: 20px` | `--osm-sp-6: 24px` | `--osm-sp-8: 32px` | `--osm-sp-10: 40px` | `--osm-sp-12: 48px` | `--osm-sp-16: 64px`

### 2.4 Border Radius

`--osm-radius-sm: 4px` | `--osm-radius-md: 8px` | `--osm-radius-lg: 12px` | `--osm-radius-xl: 16px` | `--osm-radius-pill: 9999px`

### 2.5 Shadows (restrained — never glow effects)

- `--osm-shadow-sm: 0 1px 2px 0 rgba(0,0,0,0.05)`
- `--osm-shadow-md: 0 1px 3px 0 rgba(0,0,0,0.10), 0 1px 2px -1px rgba(0,0,0,0.06)`
- `--osm-shadow-lg: 0 4px 6px -1px rgba(0,0,0,0.10), 0 2px 4px -2px rgba(0,0,0,0.06)`
- `--osm-shadow-modal: 0 20px 25px -5px rgba(0,0,0,0.10), 0 8px 10px -6px rgba(0,0,0,0.05)`

Never use colored glows (e.g., `0 0 16px rgba(99,102,241,0.4)`).

### 2.6 Motion

**Appropriate:** Page transitions (200ms ease-out opacity), toast entry (200ms slide-up 8px), modal open (200ms scale 0.96→1.0), skeleton shimmer (1.5s pulse), button active (100ms scale 0.98), tab indicator (150ms).

**Never animate:** Score/total changes, error/warning states, audit events, save/submit actions, background gradients.

**Reduced motion:** Disable all animations when `prefers-reduced-motion: reduce` is active.

---

## SECTION 3 — ACCESSIBILITY

### 3.1 Color Contrast
- Normal text (< 18px, non-bold): minimum 4.5:1
- Large text (>=18px or 14px bold): minimum 3:1
- Interactive element boundaries: minimum 3:1 against adjacent background
- Color alone must never convey meaning

### 3.2 Keyboard Navigation

All interactive elements reachable via Tab/Shift+Tab, operable via Enter/Space. Modal dialogs trap focus.

**Evaluation Workspace Shortcuts:**

| Key | Action |
| :--- | :--- |
| Alt + N | Next question |
| Alt + P | Previous question |
| Alt + S | Save current mark |
| Alt + Enter | Submit (only when CompleteCheck passes) |
| Esc | Close modal / cancel |

### 3.3 Visible Focus
- All interactive elements: `2px solid` outline using `--osm-border-focus` (#2563EB)
- Never remove with `outline: none` without a visible replacement

### 3.4 Semantic HTML
- One `<h1>` per logical page/view
- Heading hierarchy preserved (h1 → h2 → h3)
- Navigation: `<nav aria-label="...">`
- Main content: `<main id="osm-main-content">`
- Tables: `<th scope="col">` and `<caption>`

### 3.5 ARIA
- Status badges: `aria-label` with text equivalent
- Progress indicators: `role="progressbar"` + `aria-valuenow` + `aria-valuemax`
- Save confirmations: `aria-live="polite"`
- Errors: `aria-live="assertive"`
- Modals: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`

### 3.6 Minimum Interaction Targets
- All buttons/interactive areas: minimum 44×44px
- Navigation tab buttons: minimum 48px height
- Mark entry numeric inputs: minimum 80px wide × 40px tall

### 3.7 Disclaimer
Accessibility compliance must be verified through manual testing before claiming WCAG 2.1 AA compliance.

---

## SECTION 4 — APPLICATION SHELL

### 4.1 Desktop Layout (1280px+ primary target)

`
┌─────────────────────────────────────────────────────┐
│  HEADER (64px sticky)                               │
│  [Logo + Name]  [Role Indicator]  [System Status]   │
├──────────┬──────────────────────────────────────────┤
│ SIDEBAR  │  PAGE CONTENT AREA                       │
│ (240px)  │  [Page Title + Breadcrumb]               │
│          │  [Primary content]                       │
│ Role-    │                                          │
│ specific │                                          │
│ nav items│                                          │
│ ──────── │                                          │
│ [Cycle]  │                                          │
└──────────┴──────────────────────────────────────────┘
`

### 4.2 Header (64px, sticky)
- Left: OSM wordmark + "On-Screen Marking" label
- Right: Role indicator chip + Database status dot + API status dot
- MUST NEVER show "P0: Foundation Baseline", "P2", "P5", "P8" or phase labels

### 4.3 Sidebar (240px)
- Role-specific navigation (see Section 5)
- Active item: `--osm-primary-subtle` background + 3px left border in `--osm-primary`
- No nested flyout menus
- Bottom: Examination cycle context ("Spring 2026 Cycle")

### 4.4 Role Context Indicator
- Header chip: `[Examiner] Dr. Sarah Jenkins`
- Demo dropdown labeled "Demo Role Switcher" (not "DEMO ACTOR SIMULATOR")
- Chip colors: EXAMINER (info), MODERATOR (warning), ADMIN (primary)

### 4.5 System Status
- Compact dots in header: green = connected, red = disconnected
- Never show "CHECKING" as primary state text

### 4.6 Notification Area
- Toast notifications: bottom-right, stacked up to 3
- Auto-dismiss: 4s success, 8s warning, errors persist

### 4.7 Page Title Area
- `<h1>` with actual page title
- Optional breadcrumb below
- Never show raw IDs (e.g., `eval-demo-incomplete`) as the page title

### 4.8 Responsive Behavior

| Width | Behavior |
| :--- | :--- |
| 1280px+ | Full sidebar + content |
| 1024–1279px | Icon-only sidebar (48px), expands on hover |
| 768–1023px | Sidebar hidden, hamburger menu |
| Below 768px | Core workspace visible, analytics/audit deprioritized |

---

## SECTION 5 — ROLE-SPECIFIC INFORMATION ARCHITECTURE

### 5.1 EXAMINER Navigation (only)

`
[Icon] My Script Queue          -> /examiner/queue
[Icon] Evaluation Workspace     -> /examiner/evaluate/:evalId
`

Hidden from EXAMINER: Triage, QualityPulse, TrustLens, Admin Controls.
These routes return HTTP 403 for EXAMINER role.

### 5.2 MODERATOR Navigation

`
[Icon] Triage Queue             -> /moderator/triage
[Icon] Quality Signals          -> /moderator/signals
[Icon] QualityPulse Analytics   -> /moderator/analytics
[Icon] TrustLens Audit          -> /moderator/audit
`

Hidden from MODERATOR: Admin/Demo Controls; Evaluation Workspace (observe only).

### 5.3 ADMIN Navigation

`
[Icon] System Overview          -> /admin/overview
[Icon] QualityPulse Analytics   -> /admin/analytics
[Icon] TrustLens Audit          -> /admin/audit
[Icon] Triage Queue             -> /admin/triage
[Icon] Demo Controls            -> /admin/demo
`

### 5.4 Navigation State Rules
- Active route highlighted in sidebar
- Role switch + current page forbidden: redirect to role default page
- Never show raw 403 in main content; show role-boundary message instead

---

## SECTION 6 — EXAMINER EXPERIENCE

### 6.1 Evaluation Queue / Script Inbox

**Route:** `/examiner/queue`
**API:** `GET /api/v1/evaluations?evaluatorId={auth.actorId}`
**Title:** "My Scripts — Spring 2026 Cycle"

**Queue Table:**

| Column | Data Source | Format |
| :--- | :--- | :--- |
| Script Reference | `scriptId` | `OSM-2026-CS101-0101` |
| Status | `status` | Status badge |
| Questions Marked | `marks.length / questions.length` | `2 / 3` |
| Total Score | `totalScore / maxPossibleScore` | `50 / 100` |
| Last Updated | `updatedAt` | `2 hours ago` |
| Action | — | "Mark Script" or "View" |

Filters: Status, Search. Empty state: "No scripts are currently assigned to your queue."

### 6.2 Evaluation Workspace

**Route:** `/examiner/evaluate/:evalId`
**APIs:** GET evaluation, GET completeness, PATCH marks, POST submit

**Layout (split-pane):**

`
┌─────────────────────────────────────────────────────────────────┐
│  Header: [Paper #OSM-0101] [Status] [50/100 pts]                │
│  [Dr. Sarah Jenkins] [CS-101] [Spring 2026]                     │
├────────────────────────────┬────────────────────────────────────┤
│  SCRIPT VIEWER (55%)       │  MARKING PANEL (45%)               │
│  [< Q1  Q2  Q3 >]          │  [Question Navigator Q1 Q2 Q3]     │
│                            │  [Question prompt card]            │
│  Script content area       │  [Rubric Guidance — collapsed]     │
│  (scrollable, synced)      │  [Mark Entry: 0–40]                │
│                            │  [Examiner Notes]                  │
│                            │  [Save Mark] [✓ Saved]             │
│                            │  [< Prev] [Next >]                 │
├────────────────────────────┴────────────────────────────────────┤
│  COMPLETECHECK BAR: [Status + Issues] [Submit Evaluation ->]    │
└─────────────────────────────────────────────────────────────────┘
`

Both panes scroll independently. Marking panel is the primary interaction zone.

**Question Navigator:**
- Tab strip: Q1 (filled green = marked), Q2 (empty = unmarked), Q3
- Click or Alt+N/Alt+P to navigate
- Red circle if mark is out of range

---

## SECTION 7 — SCRIPT VIEWER

### 7.1 Two-Layer Architecture

**LAYER A — Demo Presentation Fixtures (Hackathon scope)**

Trigger: `scriptId` matches a canonical demo script (SCRIPT-DEMO-101, SCRIPT-DEMO-201, etc.)
Source: Static frontend lookup map: `scriptId → answer fixture`
Visual indicator: Info banner at top of viewer: "i Demonstration Mode — Anonymized Script Fixture"

Do NOT represent fixtures as: real student handwriting, OCR output, or authoritative examination documents.

**LAYER B — Production Future Layer (Out of scope for hackathon)**

Placeholder: "Script document retrieval is not configured for this environment."

### 7.2 Demo Script Fixture: SCRIPT-DEMO-101

`
Candidate #OSM-2026-CS101-0101
Module: CS-101 — Systems & Algorithms | Spring 2026
──────────────────────────────────────────────────────
Q1. Implement binary search tree rebalancing algorithm with O(log n) rotation.

The candidate implements an AVL tree with left and right rotation methods.
The rotation logic handles left-left and left-right cases using standard
rotation decomposition. Edge cases for null pointers are handled but the
rotation for right-heavy trees has a minor inconsistency in the balance
factor update step.
──────────────────────────────────────────────────────
Q2. Structure modular class architecture adhering to SOLID principles.

[Response not submitted — page appears blank.]
──────────────────────────────────────────────────────
Q3. Implement defensive boundary validation and transactional error recovery.

The candidate demonstrates a try-catch pattern for database transactions
with rollback handling. Input validation uses a custom validator class with
schema-based constraints. Error propagation is structured with typed
exception hierarchy.
`

Similar fixtures required for SCRIPT-DEMO-201 (evaluator_2) and SCRIPT-DEMO-501 (evaluator_lenient).

### 7.3 Script Viewer Interactions

- Synchronized: clicking Q2 in Navigator scrolls script viewer to Q2 section
- Highlight: active question section uses `--osm-primary-subtle` background
- No PDF viewer (out of scope for hackathon)

---

## SECTION 8 — RUBRIC EXPERIENCE

### 8.1 Rubric Guidance Card

Displayed in marking panel. Source: `QuestionDto.rubricCriteriaId` + static RUBRIC-CS-101 fixture.

`
Criterion 1: Core Algorithmic Correctness (Q1, /40)
  Full marks (36–40): Correct algorithm, all edge cases, O(log n) proven
  Good (28–35): Correct algorithm, minor edge case omission
  Partial (15–27): Partial algorithm, significant gaps
  Minimal (1–14): Fundamental conceptual errors
  No marks (0): No valid attempt

Criterion 2: Code Structure & Modularity (Q2, /30)
  Full marks (27–30): All SOLID principles, clean abstractions
  Good (21–26): Most principles followed, minor violations
  Partial (10–20): Some structure, significant gaps
  Minimal (1–9): Poor structure throughout
  No marks (0): Not attempted

Criterion 3: Error Handling & Defensive Design (Q3, /30)
  Full marks (27–30): Comprehensive validation, typed exceptions, rollback
  Good (21–26): Good coverage, minor omissions
  Partial (10–20): Basic error handling only
  Minimal (1–9): Minimal defensive code
  No marks (0): Not attempted
`

Initially collapsed: "Show Marking Guidance ▼". Background: `--osm-bg-elevated`.

### 8.2 AI Advisory Placement

AI advisory is NOT shown in the examiner's rubric panel. Appears ONLY in Moderator Triage Case Detail.

### 8.3 Visual Distinction

Marking Guidance: `--osm-bg-elevated` background, clipboard icon
AI Advisory (moderator only): `--osm-ai-bg` background, `--osm-ai-border`, robot icon

These must be visually clearly different from each other.

---

## SECTION 9 — MARK ENTRY UX

### 9.1 Mark Input
- `<input type="number" min="0" max={q.maxMarks} step="1">`
- Label: "Awarded Marks (0 – {maxMarks})"
- Size: minimum 80px wide × 44px tall
- Focus ring: `--osm-border-focus`, 2px solid

### 9.2 Save Strategy — Explicit Save Per Question (Alt+S)

Rationale: Backend requires explicit PATCH. Auto-save creates excessive calls and obscures concurrency conflicts.

**Save button state machine:**

| State | Button |
| :--- | :--- |
| Default | "Save Mark" (secondary) |
| Saving | "Saving..." + spinner, disabled |
| Success | "✓ Saved" (green, 2 seconds), then reverts |
| Error | "⚠ Failed — retry" (danger style) |
| Locked | Hidden; input disabled; value read-only |

### 9.3 Live Total Indicator
In workspace header: `Score: 50 / 100 pts`
- Updates from `EvaluationResponse.totalScore` after successful save
- Does NOT speculatively update from unsaved local values

### 9.4 Concurrency Conflict (HTTP 409)
Inline alert: "This script was updated by another session. Refreshing to the latest version."
Auto-reload after 2 seconds. Never silently discard.

### 9.5 Comments Field
- Label: "Examiner Notes (optional)"
- Max 500 characters with counter
- Placeholder: "Rationale for awarded mark, annotations, or observations"

### 9.6 API Payload — MUST NOT CHANGE

`PATCH /api/v1/evaluations/:evaluationId`

Required fields:
- `questionId` — string
- `awardedMarks` — number
- `comments` — string (optional)
- `expectedVersion` — number (REQUIRED for optimistic concurrency — must be sent with current `EvaluationResponse.version`)

---

## SECTION 10 — COMPLETECHECK UX

### 10.1 Persistent CompleteCheck Bar (sticky bottom of workspace)

API: `GET /api/v1/evaluations/:id/completeness`

| State | Color | Content |
| :--- | :--- | :--- |
| All marked | Green | ✓ All 3 questions marked — Ready for submission |
| Incomplete | Amber | ⚠ 1 of 3 questions unmarked — Q2 needs a mark |
| Loading | Gray | Skeleton shimmer |
| Submitted | Teal | 🔒 Evaluation submitted and locked |

### 10.2 Issue List (expanded when incomplete)

`
CompleteCheck Issues:
  ⚠ WARNING — Q2: No mark has been assigned for this question.
               → Click to jump to Q2
`

Clicking an issue navigates both the Question Navigator and Script Viewer to the affected question.

### 10.3 Submit Button
- Displayed in CompleteCheck bar (far right)
- Disabled when `isComplete: false`
- Enabled when `isComplete: true`
- HTTP 422 from backend: display issue list, keep button disabled

**Confirmation modal:** "You are about to submit Script #OSM-2026-CS101-0101 for Spring 2026. This action is irreversible. Total score: 50/100 pts. Confirm submission?"

Post-submission: workspace locked, all inputs disabled, status badge shows SUBMITTED.

---

## SECTION 11 — MODERATOR EXPERIENCE

### 11.1 Triage Queue

**Route:** `/moderator/triage`
**API:** `GET /api/v1/triage-cases`

Filters: Status (All/Open/Assigned/Resolved), Priority (All/Critical/High/Medium/Low), Assignee (All/Unassigned/My Cases)

**Triage Case List Item:**

`
┌──────────────────────────────────────────────────────────┐
│ [HIGH] TC-DEMO-001 — Evaluator Leniency Drift            │
│ Dr. Adrian Foster · Spring 2026 · 2 hours ago            │
│ OPEN · Unassigned                       [View Case ->]   │
└──────────────────────────────────────────────────────────┘
`

Case number as `TC-DEMO-001` (not raw UUID). Priority badge colored by severity.

### 11.2 Case Detail

**Route:** `/moderator/triage/:caseId`

Sections:
1. Case Identity: case number, status, priority, assignee, created date
2. Linked Signal: type, severity, detector name, detection timestamp
3. Statistical Evidence Card (see below)
4. Affected Evaluations: human-readable script references
5. Case History: audit log timeline
6. AI Advisory Panel (collapsed, manually triggered)
7. Human Resolution Panel (visible when OPEN or ASSIGNED)

**Statistical Evidence Card (STATISTICAL_ANOMALY):**

`
┌────────────────────────────────────────────────────────┐
│ 📊 Statistical Evidence                                │
│                                                        │
│ Evaluator Mean:  94.8%  ↑                              │
│ Peer Baseline:   71.6%                                 │
│ Deviation:      +23.2%  (HIGH — threshold: 15%)        │
│ Sample Size:     5 evaluations                         │
│ Peer Sample:     6 evaluations                         │
│                                                        │
│ Detector: evaluator-mean-deviation-detector v1.0.0     │
│ Type: STATISTICAL                                      │
└────────────────────────────────────────────────────────┘
`

Numbers in `--osm-font-mono`. Deviation colored by severity.

**Assign Case API:** `POST /api/v1/triage-cases/:caseId/assign`
Body: `{ "assigneeId": "moderator_1", "expectedVersion": 1 }`

**Resolve Case API:** `POST /api/v1/triage-cases/:caseId/resolve`
Body: `{ "outcome": "CONFIRMED_VALID", "reason": "Human-written justification (mandatory)", "notes": "", "expectedVersion": 2 }`

Resolution outcome options: `CONFIRMED_VALID / LEGITIMATE_VARIATION / CORRECTION_REQUIRED / ESCALATED / DISMISSED`

`reason` is mandatory (min 10 characters, enforced by backend validation).

---

## SECTION 12 — AI ADVISORY UX

### 12.1 Placement
AI advisory appears ONLY in the Moderator Triage Case Detail. Never in the Examiner marking workspace.

### 12.2 Trigger
Manual only: "Request AI Analysis" button (secondary, small). AI is NEVER pre-loaded.

### 12.3 Advisory Panel Appearance

`
┌──────────────────────────────────────────────────────────────────┐
│ 🤖  AI ADVISORY — NON-BINDING GUIDANCE                           │
│  AI Confidence: ███████░░░ 87%     Model: mock-v1.0.0           │
│  Assistance Type: SIGNAL_EXPLANATION                             │
│  Generated: [timestamp]                                          │
│                                                                  │
│  Recommendation:                                                 │
│  "The statistical deviation of 23.2 percentage points above the  │
│  cohort mean is significant. The pattern is consistent across    │
│  all 5 evaluated scripts, suggesting systematic rather than      │
│  random variation. Human moderator review of a sample of scripts │
│  marked by this evaluator is advised before any marking          │
│  adjustment is authorized."                                      │
│                                                                  │
│  ⚠ This analysis is advisory only. Human review is mandatory.   │
│    AI cannot assign marks, alter scores, or resolve cases.      │
└──────────────────────────────────────────────────────────────────┘
`

Background: `--osm-ai-bg`, border: `--osm-ai-border`.

### 12.4 Confidence Indicator
- Progress bar + percentage text (e.g., 87%)
- Never a pie chart or circular gauge
- Label: "AI Confidence" — never "Certainty" or "Accuracy"

### 12.5 What AI Must NEVER Do
- Pre-populate the resolution reason textarea
- Submit a case resolution or evaluation
- Assign marks to any question
- Be labeled "recommended action" or "suggested resolution"

### 12.6 Error State
"AI analysis is temporarily unavailable. Please proceed with manual review."
No fake advisory content ever displayed.

### 12.7 AI Advisory Request API
`POST /api/v1/ai/advisory`
Body: `{ "evaluationId": "eval-demo-lenient-501", "assistanceType": "SIGNAL_EXPLANATION", "qualitySignalId": "sig-demo-lenient-001", "triageCaseId": "tc-demo-001" }`
Only MODERATOR and ADMIN may call this endpoint.

---

## SECTION 13 — QUALITYPULSE ANALYTICS

**Routes:** `/moderator/analytics`, `/admin/analytics`
**API:** `GET /api/v1/analytics/quality-pulse`

### Information Hierarchy (top to bottom)

1. Cohort Health Summary — evaluations, mean score, active signals
2. Evaluator Deviation Table — sorted by deviation descending
3. Quality Signals Summary — counts by severity
4. Moderation Workload — open/assigned/resolved case counts
5. Question Performance — missing mark rates

### Cohort Health Card (from QualityPulseOverview)

`
Spring 2026 Cycle — Quality Overview
12 Evaluations · 4 Evaluators · Cohort Mean: 71.6%
Signals: 2 active (1 HIGH, 1 MEDIUM resolved)
Cases: 2 total (1 open, 1 resolved)
`

### Evaluator Deviation Table

| Evaluator | Scripts | Mean | Cohort | Deviation | Status | Signals |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Dr. Adrian Foster | 5 | 94.8% | 71.6% | +23.2% | CRITICAL_DEVIATION | 1 |
| evaluator_1 | 1 | — | 71.6% | — | INSUFFICIENT_DATA | 0 |
| Dr. Michael Chen | 2 | 69.4% | 71.6% | -2.2% | NORMAL | 0 |

Deviation colored: red (CRITICAL), amber (MODERATE), green (NORMAL). Row click expands details.

### SentinelFlag Trigger (ADMIN only)
"Run Anomaly Detection" button → `POST /api/v1/analytics/quality-pulse/trigger-sentinel`
Result toast: "Sentinel scan complete: 4 evaluators analyzed, 1 anomaly detected."

### Chart Rules
- Horizontal bar charts for comparisons (never 3D, never pie charts for distributions)
- All axes labeled with units. All data series labeled by color AND text.
- No decorative chart animations.

### Data Integrity Rule
All displayed statistical values must come from backend API responses. Frontend must NOT recalculate deviation percentages or means from raw evaluation data.

---

## SECTION 14 — TRUSTLENS AUDIT LEDGER

**Routes:** `/moderator/audit`, `/admin/audit`
**API:** `GET /api/v1/audit-events`

### Layout
Filterable timeline, newest first.
Filters: Entity Type (ALL/EVALUATION/TRIAGE_CASE/QUALITY_SIGNAL/RESOLUTION), Actor, Date range.

### Audit Timeline Item

`
┌─────────────────────────────────────────────────────────────────┐
│ [ASSIGN_MARK]  Evaluation — Script #OSM-2026-CS101-0101         │
│ Dr. Sarah Jenkins (Examiner) · 2026-09-27 at 14:32:05           │
│ Awarded 28 marks on Question Q1 (max: 40) · v1 → v2            │
│                                          [Expand technical ▼]   │
└─────────────────────────────────────────────────────────────────┘
`

Actor displayed as human-readable name. Summary sentence derived from `action + details` payload. Technical detail expandable.

### Action Badge Colors

| Pattern | Badge |
| :--- | :--- |
| ASSIGN_MARK, MARK_* | Info (blue) |
| SUBMIT_* | Success (green) |
| RESOLVE_* | Success (green) |
| ASSIGN_CASE, CREATE_CASE | Warning (amber) |
| SEED_*, RESET_* | Muted (gray) |
| FAIL_*, ERROR_* | Danger (red) |

### Actor Display Names (Demo Fixture)

| actorId | Display Name |
| :--- | :--- |
| evaluator_1 | Dr. Sarah Jenkins |
| evaluator_2 | Dr. Michael Chen |
| evaluator_3 | Dr. Priya Nair |
| evaluator_4 | Dr. James O'Brien |
| evaluator_lenient | Dr. Adrian Foster |
| moderator_1 | Prof. Marcus Vance |
| admin_1 | Examination Controller |
| SYSTEM | System Automated Action |

Raw `actorId` shown in expanded technical details. Display name is presentation-only (marked: `// DEMO FIXTURE — Not from backend`).

### Pagination
50 events per load. "Load more" button. Total count: "Showing 50 of 147 audit events."

---

## SECTION 15 — COMPONENT SYSTEM

| Component | Description | Key Props |
| :--- | :--- | :--- |
| Button | Primary/secondary/ghost/danger | variant, size, loading, disabled |
| Input | Text/number with label/error | label, error, helpText, disabled |
| Textarea | Multi-line with label/error | label, error, maxLength, rows |
| Select | Native select with label | label, options, error |
| Badge | Info/success/warning/danger/muted | variant, size |
| StatusBadge | Domain enum → badge | status: EvaluationStatus / TriageCaseStatus |
| Card | Surface with header/border | padding, elevated, flat |
| Table | Sortable data | columns, rows, loading, emptyState |
| Modal | Dialog with overlay | title, open, onClose, size, footer |
| Toast | Ephemeral notification | type, message, duration |
| Alert | Inline persistent message | type, title, message, dismissible |
| EmptyState | Empty list placeholder | icon, title, description, action |
| Skeleton | Loading placeholder | width, height, variant |
| Tooltip | Hover info | content, placement |
| Tabs | Horizontal navigation | items, activeItem, onChange |
| Progress | Linear progress bar | value, max, label |
| ConfidenceIndicator | AI confidence display | value (0–1), label |
| EvidenceCard | Statistical evidence | evaluatorMean, peerMean, deviation, sampleSize, severity |
| AuditTimelineItem | Single audit event | event: AuditEventResponse, actorDisplayName |
| ScriptViewerPanel | Script content | scriptId, activeQuestionIndex |
| RubricGuidanceCard | Collapsible guidance | criterionId, maxMarks, bands, collapsed |

**Composition rules:**
- All components use `--osm-*` design tokens, never hardcoded hex values
- No component manages its own network state; data passed via props
- All interactive components have unique `id` attributes

---

## SECTION 16 — PAGE / SURFACE INVENTORY

| Surface | Role | Purpose | Primary Action | Key Data | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Script Queue | EXAMINER | Browse assigned scripts | "Mark Script" | evaluationId, status, marks/total | P0 |
| Evaluation Workspace | EXAMINER | Mark script answers | Save Mark, Submit | questions, marks, completeness | P0 |
| Triage Queue | MODERATOR | Browse moderation cases | "View Case" | caseNumber, priority, status | P0 |
| Case Detail | MODERATOR | Investigate anomaly, resolve | Record Resolution | signal.evidence, resolution | P0 |
| QualityPulse Dashboard | MODERATOR/ADMIN | Monitor cohort quality | Trigger Sentinel | evaluatorMetrics, signals | P1 |
| TrustLens Audit | MODERATOR/ADMIN | Inspect system history | Filter/expand | auditEvents | P1 |
| Admin Overview | ADMIN | System health, seeding | Seed/Reset Demo | health, demo status | P1 |
| Quality Signals | MODERATOR/ADMIN | Browse active signals | Link to Case | signalType, evidence | P2 |

---

## SECTION 17 — STATE DESIGN

| State | Treatment |
| :--- | :--- |
| Loading | Skeleton placeholders; never blank white space |
| Empty | EmptyState component with context-appropriate message |
| Success | Content rendered; optional toast confirmation |
| Error | Alert component (inline) with retry action |
| Unauthorized | "This section requires [MODERATOR] role." |
| Locked | Read-only view, inputs disabled, lock icon + banner |
| Stale / Concurrency Conflict | Inline alert; auto-refresh after 2 seconds |
| Submitting | Button loading state, inputs disabled |
| Saved | Save button shows "✓ Saved" for 2 seconds |
| Unsaved | Amber dot next to save button |

**Evaluation Workspace States:**

| State | Condition | Visual |
| :--- | :--- | :--- |
| DRAFT | No marks | All question circles empty |
| IN_PROGRESS | Partial marks | CompleteCheck bar amber |
| READY | All marked | CompleteCheck bar green, Submit enabled |
| SUBMITTED | status=SUBMITTED | Locked banner, all inputs disabled |
| FINALIZED | status=FINALIZED | Locked banner, all inputs disabled |

---

## SECTION 18 — RESPONSIVE DESIGN

| Breakpoint | Width | Behavior |
| :--- | :--- | :--- |
| lg | 1280px+ | Full layout, sidebar visible — PRIMARY TARGET |
| md | 1024–1279px | Icon-only sidebar (48px), collapses on hover |
| sm | 768–1023px | Hamburger sidebar, single-column content |
| xs | <768px | Minimal nav; marking panel only; "View Script" tab |

**Evaluation Workspace Responsive:**
- 1280px+: Split pane (55%/45%)
- 1024–1279px: Collapsible panes, marking panel full width when script viewer collapsed
- 768–1023px: Tabs to switch "View Script" / "Mark Questions"
- Below 768px: Marking panel only, "View Script" button

Desktop/laptop is the primary platform. Mobile is graceful degradation, not design priority.

---

## SECTION 19 — VISUALIZATION RULES

**Charts:** Horizontal bar charts for comparisons, line charts for trends. Never 3D or pie charts for distributions. All axes labeled. All data series labeled by color AND text. No decorative animations.

**Severity Colors (consistent across ALL components):**

| Severity | Color | Use |
| :--- | :--- | :--- |
| CRITICAL | `--osm-danger` | Confirmed critical statistical deviation |
| HIGH | `--osm-warning` | Significant deviation |
| MEDIUM | Muted amber `#92400E` | Moderate deviation |
| LOW | `--osm-text-muted` | Minor variation, informational |
| INFO | `--osm-info` | System-generated informational signal |

**Anti-Misleading Rules:**
- Percentages always show sample size or denominator nearby
- Statistical thresholds must be visible when showing whether a signal exceeds them
- Do not use alarming red for deviations within normal range
- AI confidence never implies correctness

---

## SECTION 20 — DEMO NARRATIVE

### Act 1 — The Examiner's View (EXAMINER role / evaluator_1)

1. Open **Script Queue** → See Script #OSM-2026-CS101-0101 — DRAFT
2. Click **"Mark Script"** → Evaluation Workspace opens
3. See Q1 answer in Script Viewer (left pane)
4. See Rubric Guidance for Q1 (right pane, collapsed)
5. Enter mark 28/40 for Q1
6. Click **Save** → "✓ Saved" confirmation, score updates to 28/100
7. Advance to Q2 → Script Viewer shows blank answer for Q2
8. Skip Q2 (simulate missing mark scenario)
9. Enter mark 22/30 for Q3, Save → score: 50/100
10. CompleteCheck bar turns **amber**: "Q2 is unmarked"
11. Click Q2 issue → Navigator jumps to Q2, Script Viewer highlights Q2 section
12. Enter mark 0/30 for Q2, comment "Not attempted", Save
13. CompleteCheck bar turns **green** — all 3 questions marked
14. Click **"Submit Evaluation"** → Confirmation modal
15. Confirm → Evaluation locked at SUBMITTED

### Act 2 — The Anomaly (MODERATOR role / moderator_1)

16. Open **Triage Queue** → See TC-DEMO-001 — HIGH — OPEN
17. Click **"View Case"** → Case Detail opens
18. Statistical Evidence Card: Dr. Adrian Foster 94.8% vs peer 71.6% (+23.2%)
19. Click **"Assign to Moderator"** → status → ASSIGNED

### Act 3 — The AI Advisory

20. Click **"Request AI Analysis"**
21. Advisory panel appears with recommendation + 87% confidence
22. Disclaimer: "Human review mandatory — AI cannot alter marks or resolve cases"
23. Moderator reads analysis

### Act 4 — The Human Decision

24. Click **"Record Resolution"**
25. Select outcome: CONFIRMED_VALID
26. Type reason: "After reviewing scripts, scoring reflects consistent script quality. No corrective action required."
27. Submit → Case becomes RESOLVED

### Act 5 — The Audit Trail (ADMIN or MODERATOR role)

28. Open **TrustLens Audit Ledger**
29. See chronological timeline: mark assignments, submission, case assignment, AI advisory, resolution
30. Expand one entry → show technical details payload
31. Demonstration complete

### Demo Prerequisites

Before demo: Admin seeds canonical scenario (`POST /api/v1/demo/seed`).
If eval-demo-incomplete is already submitted: reset (`POST /api/v1/demo/reset`) then re-seed.
Admin Demo Control panel (ADMIN only) provides Seed + Reset buttons with status feedback.

---

## SECTION 21 — FRONTEND DATA BOUNDARIES

### REAL BACKEND DATA
Data from `/api/v1/` endpoints. Used as-is, without calculation.
Examples: evaluation status/scores/marks, signal evidence, triage case status, audit events, QualityPulse metrics.

### DEMO PRESENTATION DATA
Synthetic frontend fixtures. Marked in code: `// DEMO FIXTURE — Not from backend`
Examples:
- Student answer text in script viewer (keyed by scriptId)
- Actor display names (evaluator_1 → "Dr. Sarah Jenkins")
- Rubric mark band descriptors
- Script reference formatting (SCRIPT-DEMO-101 → OSM-2026-CS101-0101)
- Cycle label ("Spring 2026 Cycle" for cycle-2026-demo)

Demo fixtures must never appear to be live backend data. Script viewer demo mode banner distinguishes them.

### DERIVED UI DATA
Computed from real backend data by the frontend.
Examples: marks.length/questions.length progress, relative timestamps, combined score display, table sorting, question status from marks array, audit event human-readable sentences from action+details.

---

## SECTION 22 — API CONTRACT PRESERVATION

### Auth Headers (all requests)
- `x-user-role: EXAMINER | MODERATOR | ADMIN`
- `x-actor-type: USER | AI | SYSTEM`
- `x-actor-id: evaluator_1 | moderator_1 | admin_1`

### Mark Update (PATCH /api/v1/evaluations/:evaluationId)
Required: `questionId`, `awardedMarks`, `expectedVersion`
Optional: `comments`

`expectedVersion` MUST be populated from current `EvaluationResponse.version`.

### Evaluation Submit (POST /api/v1/evaluations/:evaluationId/submit)
Body: `{ "evaluatorId": "evaluator_1" }`

### Triage Case Assign (POST /api/v1/triage-cases/:caseId/assign)
Body: `{ "assigneeId": "moderator_1", "expectedVersion": 1 }`

### Triage Case Resolve (POST /api/v1/triage-cases/:caseId/resolve)
Required: `outcome`, `reason` (mandatory text), `expectedVersion`
Optional: `notes`, `evidenceReferences`

### AI Advisory (POST /api/v1/ai/advisory) — MODERATOR/ADMIN only
Body: `{ "evaluationId": "...", "assistanceType": "SIGNAL_EXPLANATION", "qualitySignalId": "...", "triageCaseId": "..." }`

### Demo Seed/Reset (ADMIN only)
- `POST /api/v1/demo/seed`
- `POST /api/v1/demo/reset`

---

## SECTION 23 — DESIGN ANTI-PATTERNS

| Anti-Pattern | Prohibited Behavior |
| :--- | :--- |
| Raw UUIDs as primary labels | Never show `eval-demo-incomplete` or `tc-demo-001` as main title |
| Phase labels | Never show "P0: Foundation Baseline", "P2:", "P5:", "P8:" |
| Raw JSON as primary UI | Never render a JSON blob as the default view of any entity |
| Colored glow shadows | No `box-shadow` with colored highlights |
| Excessive gradients | No multi-stop radial gradients on page body backgrounds |
| Excessive animations | No floating particles, pulsing effects, continuous background animations |
| Decorative dashboards | No metric cards showing data the user cannot act on |
| AI as authority | No "AI Recommendation: Submit" or "Suggested Outcome" implying AI decides |
| Hidden backend errors | Never silently swallow 403/409/422 |
| Technical jargon | Never show `UNKNOWN_COMMAND`, `CONCURRENCY_CONFLICT`, `ENTITY_NOT_FOUND` to users |
| Modal overload | No more than one modal active at any time |
| Excessive scrolling | Marking panel must not require scrolling to see save/submit for a single question |
| Duplicated components | One EvidenceCard component, not per-feature copies |
| "DEMO ACTOR SIMULATOR" | Do not use internal engineering labels in user-facing UI |

---

## SECTION 24 — REDESIGN PRIORITY

### P0 — Must fix before demo

1. Replace dark crypto aesthetic with institutional light palette
2. Replace phase labels with real navigation labels
3. Role-specific navigation (hide 403 routes from EXAMINER)
4. Script Queue for EXAMINER — assigned scripts list
5. Split-pane Evaluation Workspace — script viewer + marking panel
6. Demo script fixtures for SCRIPT-DEMO-101, SCRIPT-DEMO-201, SCRIPT-DEMO-501
7. Rubric guidance card for RUBRIC-CS-101 (crit-1, crit-2, crit-3)
8. CompleteCheck persistent bar with issue navigation and submit gate
9. AI Advisory panel with mandatory non-binding disclaimer
10. Triage Case Detail with Statistical Evidence Card
11. Resolution modal with mandatory reason field

### P1 — Important

12. Actor display names (evaluator_1 → Dr. Sarah Jenkins)
13. Human-readable script references
14. QualityPulse evaluator deviation table with color coding
15. TrustLens audit timeline with human-readable sentences
16. Keyboard shortcuts (Alt+N, Alt+P, Alt+S)
17. Toast notification system
18. Admin Demo Controls (Seed/Reset) with feedback
19. Pagination for audit events and evaluation list

### P2 — Polish

20. Question mark state circles in navigator
21. Evaluator deviation horizontal bar chart
22. Collapsible audit event technical details
23. Mobile responsive fallback
24. Accessibility pass (focus rings, ARIA labels)
25. Reduced motion support

---

## SECTION 25 — IMPLEMENTATION BOUNDARY

### SAFE FRONTEND CHANGES
All CSS, color tokens, typography, spacing, animations; React component structure; client-side routing; local React state; display name mappings; static demo script fixture data; static rubric mark band descriptors; chart rendering; toast notification logic; keyboard shortcut handling; responsive layout.

### CONTRACT-SENSITIVE CHANGES
HTTP request payloads (must match Section 22 schemas); `expectedVersion` (must always be populated); auth headers (must always be populated from AuthContext); error code interpretation; optimistic UI updates (must be reverted on backend failure); AI advisory panel (must never auto-submit or pre-populate resolution fields).

### FORBIDDEN BACKEND CHANGES

Zero modifications permitted to:
- `apps/api/` — Any file
- `packages/shared/` — Any DTO, enum, or shared type
- SQLite database schema or migrations
- API route URLs or HTTP methods
- Domain invariants or RBAC rules
- AI authority boundaries
- Examination marking authority rules
- `AGENTS.md`

---

## SECTION 26 — DESIGN QUALITY GATE

- [x] Examiner workflow coherent (Queue → Workspace → Save → CompleteCheck → Submit)
- [x] Student script presentation defined (demo fixtures, demo mode banner)
- [x] Role navigation defined (EXAMINER / MODERATOR / ADMIN separate nav)
- [x] AI authority boundary explicit (advisory only, manual trigger, non-binding, cannot auto-submit)
- [x] Marking workflow efficient (split pane, keyboard shortcuts, save indicator)
- [x] CompleteCheck integrated (persistent bar, issue navigation, submit gate)
- [x] Moderator workflow coherent (Queue → Case Detail → Evidence → AI Advisory → Resolution)
- [x] Analytics actionable (evaluator deviation, signal counts, workload metrics)
- [x] Audit experience understandable (human-readable sentences, actor names, expandable details)
- [x] Accessibility requirements exist (WCAG 2.1 AA target, keyboard nav, ARIA)
- [x] Responsive strategy exists (1280px primary, defined degradation)
- [x] Demo flow defined (5-act narrative, 31 steps)
- [x] Real vs demo data distinguished (three-layer classification, demo mode banner)
- [x] Backend contracts unchanged (API payloads in Section 22, frozen list in Section 25)
- [x] No unsupported functionality presented as real (production script viewer scoped out)
- [x] Design system reusable (tokens, component inventory in Section 15)
- [x] No unnecessary UI complexity (tabs over nested modals, clear hierarchy)

---

## APPENDIX A — CANONICAL DEMO DATA MAPPING

| Backend Identifier | Human-Readable Display |
| :--- | :--- |
| cycle-2026-demo | Spring 2026 Examination Cycle |
| RUBRIC-CS-101 | CS-101: Systems & Algorithms |
| SCRIPT-DEMO-101 | OSM-2026-CS101-0101 |
| eval-demo-incomplete | Script #0101 (Dr. Sarah Jenkins) |
| evaluator_1 | Dr. Sarah Jenkins |
| evaluator_2 | Dr. Michael Chen |
| evaluator_3 | Dr. Priya Nair |
| evaluator_4 | Dr. James O'Brien |
| evaluator_lenient | Dr. Adrian Foster |
| moderator_1 | Prof. Marcus Vance |
| admin_1 | Examination Controller |
| TC-DEMO-001 | Case #001 — Leniency Drift |
| sig-demo-lenient-001 | Signal: Severe Drift (+23.2%) |
| TC-DEMO-000 | Case #000 — Resolved (Historical) |

---

## APPENDIX B — ERROR MESSAGE MAPPING

| Backend Status / Code | User-Facing Message |
| :--- | :--- |
| 403 (EXAMINER on audit) | "This section is restricted to moderators and administrators." |
| 403 (AI on marks) | "AI cannot perform marking actions." |
| 404 ENTITY_NOT_FOUND | "Script or evaluation record not found. Please verify the reference." |
| 409 CONCURRENCY_CONFLICT | "This script was modified in another session. Refreshing to the latest version." |
| 422 INCOMPLETE_EVALUATION | "Submission blocked: one or more questions have not been marked. See CompleteCheck below." |
| 400 INVALID_COMMAND | "Invalid request — check your inputs and try again." |
| Network timeout | "Unable to reach the examination server. Check your connection and retry." |
| AI service unavailable | "AI analysis is temporarily unavailable. Please proceed with manual review." |

---

*End of OSM Frontend Design Contract v1.0*
