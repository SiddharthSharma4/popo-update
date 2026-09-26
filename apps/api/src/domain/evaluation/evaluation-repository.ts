/**
 * Repository interface for Evaluation aggregate persistence.
 * Conforms to docs/contracts/05-domain-contract.md §8.1 and docs/contracts/08-data-contract.md §67-68.
 */

import type { Evaluation } from "./evaluation.js";

export interface FindEvaluationsFilter {
  evaluationCycleId?: string;
  evaluatorId?: string;
  status?: string;
  scriptId?: string;
}

export interface FindEvaluationsOptions {
  page: number;
  pageSize: number;
  filter?: FindEvaluationsFilter;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface EvaluationRepository {
  findById(id: string): Promise<Evaluation | null>;
  findByEvaluatorId(evaluatorId: string): Promise<Evaluation[]>;
  findPaginated(options: FindEvaluationsOptions): Promise<PaginatedResult<Evaluation>>;
  save(evaluation: Evaluation): Promise<void>;
  delete(id: string): Promise<void>;
}

