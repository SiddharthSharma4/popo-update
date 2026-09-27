/**
 * TriageCase & Moderation API Service for Web Presentation Layer.
 * Conforms to:
 * - docs/contracts/06-api-contract.md §29-33, §66-67
 * - docs/contracts/01-product-contract.md §17 (EscalationHub)
 */

import type {
  TriageCaseResponse,
  ListTriageCasesQuery,
  AssignTriageCaseRequest,
  ResolveTriageCaseRequest,
  ResolveTriageCaseResponse,
  QualitySignalResponse,
  CreateTriageCaseRequest,
} from "@osm/shared";
import { apiClient, type AuthContext } from "./api-client.ts";

export const triageService = {
  async listTriageCases(
    query?: ListTriageCasesQuery,
    auth?: AuthContext
  ): Promise<TriageCaseResponse[]> {
    const params = new URLSearchParams();
    if (query?.status) params.set("status", query.status);
    if (query?.assigneeId) params.set("assigneeId", query.assigneeId);
    if (query?.evaluationId) params.set("evaluationId", query.evaluationId);

    const qs = params.toString();
    const path = `/triage-cases${qs ? `?${qs}` : ""}`;
    return apiClient.get<TriageCaseResponse[]>(path, auth);
  },

  async getTriageCase(caseId: string, auth?: AuthContext): Promise<TriageCaseResponse> {
    return apiClient.get<TriageCaseResponse>(`/triage-cases/${encodeURIComponent(caseId)}`, auth);
  },

  async assignTriageCase(
    caseId: string,
    request: AssignTriageCaseRequest,
    auth?: AuthContext
  ): Promise<TriageCaseResponse> {
    return apiClient.post<TriageCaseResponse>(
      `/triage-cases/${encodeURIComponent(caseId)}/assign`,
      request,
      auth
    );
  },

  async resolveTriageCase(
    caseId: string,
    request: ResolveTriageCaseRequest,
    auth?: AuthContext
  ): Promise<ResolveTriageCaseResponse> {
    return apiClient.post<ResolveTriageCaseResponse>(
      `/triage-cases/${encodeURIComponent(caseId)}/resolve`,
      request,
      auth
    );
  },

  async getQualitySignal(signalId: string, auth?: AuthContext): Promise<QualitySignalResponse> {
    return apiClient.get<QualitySignalResponse>(
      `/quality-signals/${encodeURIComponent(signalId)}`,
      auth
    );
  },

  async createTriageCase(
    request: CreateTriageCaseRequest,
    auth?: AuthContext
  ): Promise<TriageCaseResponse> {
    return apiClient.post<TriageCaseResponse>("/triage-cases", request, auth);
  },
};
