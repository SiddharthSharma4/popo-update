/**
 * Query to list evaluations with pagination and filtering.
 * Conforms to docs/contracts/06-api-contract.md §21.3, §44, §45.
 */

import type { EvaluationRepository } from "../../domain/evaluation/evaluation-repository.js";
import { type EvaluationDto, toEvaluationDto } from "../dtos/evaluation.dto.js";

export interface ListEvaluationsQuery {
  page?: number;
  pageSize?: number;
  evaluationCycleId?: string;
  evaluatorId?: string;
  status?: string;
  scriptId?: string;
}

export interface PaginatedEvaluationsDto {
  items: EvaluationDto[];
  page: number;
  pageSize: number;
  total: number;
}

export class ListEvaluationsHandler {
  constructor(private readonly evaluationRepo: EvaluationRepository) {}

  async execute(query: ListEvaluationsQuery): Promise<PaginatedEvaluationsDto> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const pageSize =
      query.pageSize && query.pageSize > 0 ? Math.min(query.pageSize, 100) : 20;

    const result = await this.evaluationRepo.findPaginated({
      page,
      pageSize,
      filter: {
        evaluationCycleId: query.evaluationCycleId,
        evaluatorId: query.evaluatorId,
        status: query.status,
        scriptId: query.scriptId,
      },
    });

    return {
      items: result.items.map((e) => toEvaluationDto(e)),
      page: result.page,
      pageSize: result.pageSize,
      total: result.total,
    };
  }
}
