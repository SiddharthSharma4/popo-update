/**
 * Type-safe service for Demo Scenario Operations in Web UI.
 * Conforms to docs/contracts/10-demo-contract.md §11, §37-41.
 */

import type { DemoSeedResponse, DemoResetResponse } from "@osm/shared";
import { apiClient, type AuthContext } from "./api-client.ts";

export class DemoService {
  async seedDemoCohort(auth: AuthContext): Promise<DemoSeedResponse> {
    return apiClient.post<DemoSeedResponse>("/demo/seed", {}, auth);
  }

  async resetDemoCohort(auth: AuthContext): Promise<DemoResetResponse> {
    return apiClient.post<DemoResetResponse>("/demo/reset", {}, auth);
  }
}

export const demoService = new DemoService();

