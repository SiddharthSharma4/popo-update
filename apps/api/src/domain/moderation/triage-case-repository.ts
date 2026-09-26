/**
 * Repository interface for TriageCase aggregate.
 * Conforms to docs/contracts/08-data-contract.md §20-21 and docs/contracts/02-architecture-contract.md §8.
 */

import type { TriageCase, TriageCaseStatus } from "./triage-case.js";

export interface ListTriageCasesFilter {
  status?: TriageCaseStatus;
  assigneeId?: string;
  evaluationId?: string;
}

export interface TriageCaseRepository {
  findById(id: string): Promise<TriageCase | null>;
  findByQualitySignalId(qualitySignalId: string): Promise<TriageCase | null>;
  findByEvaluationId(evaluationId: string): Promise<TriageCase[]>;
  list(filter?: ListTriageCasesFilter): Promise<TriageCase[]>;
  save(triageCase: TriageCase): Promise<void>;
  delete(id: string): Promise<void>;
}
