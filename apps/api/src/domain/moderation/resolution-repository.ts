/**
 * Resolution Repository Interface.
 * Conforms to docs/contracts/08-data-contract.md §22-23 and docs/contracts/02-architecture-contract.md §8.
 */

import type { Resolution } from "./resolution.js";

export interface ResolutionRepository {
  save(resolution: Resolution): Promise<void>;
  findById(id: string): Promise<Resolution | null>;
  findByTriageCaseId(triageCaseId: string): Promise<Resolution | null>;
  findByEvaluationId(evaluationId: string): Promise<Resolution[]>;
  findAll(): Promise<Resolution[]>;
  delete(id: string): Promise<void>;
}
