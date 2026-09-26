/**
 * Type-safe API client for OSM Web Presentation layer.
 * Conforms to docs/contracts/06-api-contract.md.
 */

import type { HealthResponse } from "@osm/shared";

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = "/api/v1") {
    this.baseUrl = baseUrl;
  }

  async getHealth(): Promise<HealthResponse> {
    const response = await fetch(`${this.baseUrl}/health`);
    if (!response.ok) {
      throw new Error(`Health check failed with status: ${response.status}`);
    }
    return response.json();
  }
}

export const apiClient = new ApiClient();
