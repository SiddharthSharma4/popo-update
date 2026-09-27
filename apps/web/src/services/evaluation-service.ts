/**
 * Evaluation Service for OSM Web.
 * Conforms to:
 * - docs/contracts/06-api-contract.md §21-24, §44-45
 * - docs/11-frontend-design-contract.md §6
 * - docs/12-frontend-redesign-build-plan.md FE-010
 */

import type {
  EvaluationResponse,
  PaginatedEvaluationsResponse,
  ListEvaluationsQuery,
  CompletenessValidationResultDto,
  AssignMarkRequest,
  SubmitEvaluationRequest,
} from "@osm/shared";
import { apiClient, type AuthContext } from "./api-client.ts";

export class EvaluationService {
  /**
   * Lists evaluations assigned to the examiner with optional filtering and pagination.
   * Calls GET /api/v1/evaluations
   */
  async listEvaluations(
    query?: Partial<ListEvaluationsQuery>,
    auth?: AuthContext
  ): Promise<PaginatedEvaluationsResponse> {
    const params = new URLSearchParams();
    if (query?.evaluatorId) params.set("evaluatorId", query.evaluatorId);
    if (query?.status) params.set("status", query.status);
    if (query?.scriptId) params.set("scriptId", query.scriptId);
    if (query?.evaluationCycleId) params.set("evaluationCycleId", query.evaluationCycleId);
    if (query?.page) params.set("page", String(query.page));
    if (query?.pageSize) params.set("pageSize", String(query.pageSize));

    const qs = params.toString();
    const endpoint = `/evaluations${qs ? `?${qs}` : ""}`;
    return apiClient.get<PaginatedEvaluationsResponse>(endpoint, auth);
  }

  /**
   * Retrieves single evaluation by ID.
   * Calls GET /api/v1/evaluations/:id
   */
  async getEvaluation(id: string, auth?: AuthContext): Promise<EvaluationResponse> {
    return apiClient.get<EvaluationResponse>(`/evaluations/${id}`, auth);
  }

  /**
   * Runs or fetches CompleteCheck completeness validation.
   * Calls GET /api/v1/evaluations/:id/completeness
   */
  async getCompleteness(
    id: string,
    auth?: AuthContext
  ): Promise<CompletenessValidationResultDto> {
    return apiClient.get<CompletenessValidationResultDto>(
      `/evaluations/${id}/completeness`,
      auth
    );
  }

  /**
   * Assigns or updates a question mark.
   * Calls PATCH /api/v1/evaluations/:id
   */
  async assignMark(
    id: string,
    body: AssignMarkRequest,
    auth?: AuthContext
  ): Promise<EvaluationResponse> {
    return apiClient.patch<EvaluationResponse>(`/evaluations/${id}`, body, auth);
  }

  /**
   * Submits finalized evaluation with CompleteCheck enforcement.
   * Calls POST /api/v1/evaluations/:id/submit
   */
  async submitEvaluation(
    id: string,
    body: SubmitEvaluationRequest,
    auth?: AuthContext
  ): Promise<EvaluationResponse> {
    return apiClient.post<EvaluationResponse>(`/evaluations/${id}/submit`, body, auth);
  }
}

export const evaluationService = new EvaluationService();
