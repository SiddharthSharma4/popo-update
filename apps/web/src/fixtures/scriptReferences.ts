/**
 * Canonical Script References Fixture Mapping.
 * Conforms to:
 * - docs/11-frontend-design-contract.md §6.1, Appendix A
 * - docs/12-frontend-redesign-build-plan.md FE-010
 */

export interface ScriptReferenceInfo {
  displayRef: string;
  candidateLabel: string;
  subject: string;
  moduleCode: string;
}

export const SCRIPT_REFERENCES: Record<string, ScriptReferenceInfo> = {
  "SCRIPT-DEMO-101": {
    displayRef: "OSM-2026-CS101-0101",
    candidateLabel: "Candidate #OSM-2026-CS101-0101",
    subject: "Computer Science: Systems & Algorithms",
    moduleCode: "CS-101",
  },
  "SCRIPT-DEMO-201": {
    displayRef: "OSM-2026-CS101-0201",
    candidateLabel: "Candidate #OSM-2026-CS101-0201",
    subject: "Computer Science: Systems & Algorithms",
    moduleCode: "CS-101",
  },
  "SCRIPT-DEMO-501": {
    displayRef: "OSM-2026-CS101-0501",
    candidateLabel: "Candidate #OSM-2026-CS101-0501",
    subject: "Computer Science: Systems & Algorithms",
    moduleCode: "CS-101",
  },
  "SCRIPT-DEMO-502": {
    displayRef: "OSM-2026-CS101-0502",
    candidateLabel: "Candidate #OSM-2026-CS101-0502",
    subject: "Computer Science: Systems & Algorithms",
    moduleCode: "CS-101",
  },
  "SCRIPT-DEMO-503": {
    displayRef: "OSM-2026-CS101-0503",
    candidateLabel: "Candidate #OSM-2026-CS101-0503",
    subject: "Computer Science: Systems & Algorithms",
    moduleCode: "CS-101",
  },
  "SCRIPT-DEMO-504": {
    displayRef: "OSM-2026-CS101-0504",
    candidateLabel: "Candidate #OSM-2026-CS101-0504",
    subject: "Computer Science: Systems & Algorithms",
    moduleCode: "CS-101",
  },
  "SCRIPT-DEMO-505": {
    displayRef: "OSM-2026-CS101-0505",
    candidateLabel: "Candidate #OSM-2026-CS101-0505",
    subject: "Computer Science: Systems & Algorithms",
    moduleCode: "CS-101",
  },
};

/**
 * Returns clean human-readable script metadata, falling back gracefully
 * to canonical formatting for unmapped scripts.
 */
export function getScriptReference(scriptId: string): ScriptReferenceInfo {
  if (SCRIPT_REFERENCES[scriptId]) {
    return SCRIPT_REFERENCES[scriptId];
  }

  // Fallback for dynamic / seed scripts
  const numPart = scriptId.replace(/^SCRIPT-(DEMO-)?/, "");
  return {
    displayRef: `OSM-2026-CS101-${numPart || scriptId}`,
    candidateLabel: `Candidate #OSM-2026-${numPart || scriptId}`,
    subject: "Computer Science: Systems & Algorithms",
    moduleCode: "CS-101",
  };
}

/* ==========================================================================
   RUBRIC CRITERIA FIXTURES (Design Contract §8)
   ========================================================================== */

export interface RubricLevel {
  name: string;
  minMarks: number;
  maxMarks: number;
  descriptor: string;
}

export interface RubricCriterion {
  id: string;
  title: string;
  maxMarks: number;
  levels: RubricLevel[];
}

export const RUBRIC_CRITERIA: Record<string, RubricCriterion> = {
  "crit-1": {
    id: "crit-1",
    title: "Core Algorithmic Correctness & Time Complexity",
    maxMarks: 40,
    levels: [
      {
        name: "Exemplary",
        minMarks: 36,
        maxMarks: 40,
        descriptor: "Correct rebalancing algorithm, all rotation edge cases handled, O(log n) proven with rigorous boundary analysis.",
      },
      {
        name: "Proficient",
        minMarks: 28,
        maxMarks: 35,
        descriptor: "Algorithm is sound and logically complete, with minor edge-case omission in balance factor update steps.",
      },
      {
        name: "Developing",
        minMarks: 15,
        maxMarks: 27,
        descriptor: "Partial rotation decomposition implemented, but significant logical gaps or incorrect pointer reassignment present.",
      },
      {
        name: "Beginning",
        minMarks: 1,
        maxMarks: 14,
        descriptor: "Fundamental conceptual errors in tree traversal, rotational mechanics, or balance invariants.",
      },
      {
        name: "Unattempted / No Marks",
        minMarks: 0,
        maxMarks: 0,
        descriptor: "No valid algorithmic response or attempt submitted.",
      },
    ],
  },
  "crit-2": {
    id: "crit-2",
    title: "Code Structure & Modularity (SOLID Principles)",
    maxMarks: 30,
    levels: [
      {
        name: "Exemplary",
        minMarks: 27,
        maxMarks: 30,
        descriptor: "Exemplary decoupling adhering to all SOLID principles. Clean interface segregation and robust abstractions.",
      },
      {
        name: "Proficient",
        minMarks: 21,
        maxMarks: 26,
        descriptor: "Most modular principles followed with minor interface leakage or minor coupling between service components.",
      },
      {
        name: "Developing",
        minMarks: 10,
        maxMarks: 20,
        descriptor: "Basic class structure present, but violates single-responsibility or open-closed design in multiple areas.",
      },
      {
        name: "Beginning",
        minMarks: 1,
        maxMarks: 9,
        descriptor: "Monolithic, tightly coupled implementation with poor cohesion and no interface abstraction.",
      },
      {
        name: "Unattempted / No Marks",
        minMarks: 0,
        maxMarks: 0,
        descriptor: "Not attempted, or response completely blank.",
      },
    ],
  },
  "crit-3": {
    id: "crit-3",
    title: "Error Handling & Defensive Boundary Validation",
    maxMarks: 30,
    levels: [
      {
        name: "Exemplary",
        minMarks: 27,
        maxMarks: 30,
        descriptor: "Comprehensive validation schema, typed exception hierarchy, transactional recovery, and atomic rollback guarantees.",
      },
      {
        name: "Proficient",
        minMarks: 21,
        maxMarks: 26,
        descriptor: "Good defensive boundary coverage with minor omissions in asynchronous or secondary failure modes.",
      },
      {
        name: "Developing",
        minMarks: 10,
        maxMarks: 20,
        descriptor: "Basic try-catch blocks present, but lacks structured exception types and does not ensure transaction rollback.",
      },
      {
        name: "Beginning",
        minMarks: 1,
        maxMarks: 9,
        descriptor: "Minimal or silent error suppression with negligible defensive validation.",
      },
      {
        name: "Unattempted / No Marks",
        minMarks: 0,
        maxMarks: 0,
        descriptor: "Not attempted, or response completely blank.",
      },
    ],
  },
};

export function getRubricCriterion(criteriaId?: string | null, maxMarks: number = 30): RubricCriterion {
  if (criteriaId && RUBRIC_CRITERIA[criteriaId]) {
    return RUBRIC_CRITERIA[criteriaId];
  }

  // Graceful fallback for unmapped criteria
  const p90 = Math.round(maxMarks * 0.9);
  const p70 = Math.round(maxMarks * 0.7);
  const p40 = Math.round(maxMarks * 0.4);

  return {
    id: criteriaId || "crit-general",
    title: "General Assessment Criteria",
    maxMarks,
    levels: [
      { name: "Exemplary", minMarks: p90, maxMarks, descriptor: "Comprehensive and exceptional mastery of question criteria." },
      { name: "Proficient", minMarks: p70, maxMarks: p90 - 1, descriptor: "Good competence with minor omissions or edge inaccuracies." },
      { name: "Developing", minMarks: p40, maxMarks: p70 - 1, descriptor: "Partial answer showing basic conceptual understanding with gaps." },
      { name: "Beginning", minMarks: 1, maxMarks: p40 - 1, descriptor: "Significant misunderstandings and inadequate coverage." },
      { name: "Unattempted / No Marks", minMarks: 0, maxMarks: 0, descriptor: "No valid attempt provided." },
    ],
  };
}

/* ==========================================================================
   CANDIDATE SCRIPT ANSWER FIXTURES (Design Contract §7.2)
   ========================================================================== */

export const SCRIPT_ANSWERS: Record<string, Record<string, string>> = {
  "SCRIPT-DEMO-101": {
    q1: `The candidate implements an AVL tree with left and right rotation methods.
The rotation logic handles left-left and left-right cases using standard
rotation decomposition. Edge cases for null pointers are handled but the
rotation for right-heavy trees has a minor inconsistency in the balance
factor update step.

Calculated balance factor:
BF = height(left) - height(right)
When BF < -1 and right child has BF <= 0: perform left_rotate(node).
Overall time complexity is guaranteed O(log n) because height is strictly bounded.`,
    q2: `[Response not submitted — examination paper answer section left blank by candidate.]`,
    q3: `The candidate demonstrates a try-catch pattern for database transactions
with rollback handling. Input validation uses a custom validator class with
schema-based constraints. Error propagation is structured with typed
exception hierarchy:

try {
  connection.beginTransaction();
  validator.validate(inputPayload);
  repository.persist(entity);
  connection.commit();
} catch (ValidationException ex) {
  connection.rollback();
  throw new BadRequestError("Validation failed", ex);
} catch (DatabaseException ex) {
  connection.rollback();
  logger.error("Transactional persistence failed", ex);
  throw new InternalServiceError("Commit failed", ex);
}`,
  },
  "SCRIPT-DEMO-201": {
    q1: `Complete AVL rebalancing implementation with clean recursive balance factor tracking.
All four rotation cases (LL, RR, LR, RL) correctly handled with pointer swaps.
Height updates occur in post-order traversal ensuring balanced invariants at all times.
Time complexity: O(log n) worst-case insertion and rebalancing.`,
    q2: `Clean single-responsibility interfaces and dependency inversion pattern implemented
using factory abstractions. Evaluation engine is decoupled from storage and notification layers.
All domain contracts strictly honored.`,
    q3: `Robust defensive input sanitation with custom validation errors and transactional
unit-of-work rollback. Database transactions are isolated and errors are cleanly propagated
up through structured domain error envelopes.`,
  },
  "SCRIPT-DEMO-501": {
    q1: `Algorithmic implementation incorporates self-balancing binary search tree rotation.
Node heights are maintained dynamically. Rotation functions correctly swap subtrees.
Minor potential edge case on duplicate key insertion, but balance invariant holds.`,
    q2: `Class hierarchy exhibits solid modular encapsulation. Repositories communicate
via interfaces. Unit testing mock boundaries are clearly defined.`,
    q3: `Exception handling surrounds all external I/O operations. Boundary validation
checks for null values, length constraints, and schema conformance prior to database writes.`,
  },
};

export function getScriptAnswers(scriptId: string): Record<string, string> {
  if (SCRIPT_ANSWERS[scriptId]) {
    return SCRIPT_ANSWERS[scriptId];
  }

  // Graceful fallback response
  return {
    q1: `Candidate response demonstrates algorithm design with algorithmic analysis. Rebalancing rotations and complexity proofs provided.`,
    q2: `Candidate response provides modular architecture design conforming to standard object-oriented design principles.`,
    q3: `Candidate response demonstrates defensive programming practices with exception handling and transactional recovery procedures.`,
  };
}

