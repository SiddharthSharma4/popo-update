/**
 * Type-safe service for AI Advisory Requests in Web UI.
 * Conforms to docs/contracts/02-architecture-contract.md §25-30 and docs/contracts/06-api-contract.md §34-36.
 */

import type {
  GenerateAiAdvisoryRequest,
  AiRecommendationResponse,
} from "@osm/shared";
import { apiClient, type AuthContext } from "./api-client.ts";

export class AiServiceClient {
  async generateAdvisory(
    request: GenerateAiAdvisoryRequest,
    auth: AuthContext
  ): Promise<AiRecommendationResponse> {
    return apiClient.post<AiRecommendationResponse>("/ai/advisory", request, auth);
  }
}

export const aiServiceClient = new AiServiceClient();
