/**
 * Completeness Validation Result in OSM domain.
 * Conforms to docs/contracts/01-product-contract.md §13, FR-003, and docs/contracts/02-architecture-contract.md §14.
 */

import type { ValidationIssue } from "./validation-issue.js";

export interface CompletenessResult {
  readonly evaluationId: string;
  readonly isComplete: boolean;
  readonly isValid: boolean;
  readonly totalQuestions: number;
  readonly markedQuestions: number;
  readonly unmarkedQuestions: number;
  readonly missingQuestionIds: string[];
  readonly issues: ValidationIssue[];
  readonly validatedAt: string;
}
