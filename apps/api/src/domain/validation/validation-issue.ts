/**
 * Validation Issue representation in OSM domain.
 * Conforms to docs/contracts/01-product-contract.md §13 and docs/contracts/02-architecture-contract.md §14.
 */

export type ValidationSeverity = "ERROR" | "WARNING" | "INFO";

export interface ValidationIssue {
  readonly code: string;
  readonly severity: ValidationSeverity;
  readonly message: string;
  readonly questionId?: string;
  readonly evidence?: Record<string, unknown>;
}
