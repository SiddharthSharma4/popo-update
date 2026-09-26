/**
 * Repository interface for Rubric aggregate persistence.
 * Conforms to docs/contracts/05-domain-contract.md §13 and docs/contracts/08-data-contract.md §15-16.
 */

import type { Rubric } from "./rubric.js";

export interface RubricRepository {
  findByIdAndVersion(id: string, version: number): Promise<Rubric | null>;
  findLatestById(id: string): Promise<Rubric | null>;
  save(rubric: Rubric): Promise<void>;
}
