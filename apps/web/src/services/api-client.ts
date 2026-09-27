/**
 * Type-safe API client for OSM Web Presentation layer.
 * Conforms to docs/contracts/06-api-contract.md.
 */

import type { HealthResponse, UserRole, ActorType, ApiErrorResponse } from "@osm/shared";

export interface AuthContext {
  role: UserRole;
  actorId: string;
  actorType: ActorType;
}

export class ApiError extends Error {
  statusCode: number;
  code?: string;
  details?: unknown;

  constructor(statusCode: number, message: string, code?: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = "/api/v1") {
    this.baseUrl = baseUrl;
  }

  private getHeaders(auth?: AuthContext): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (auth) {
      headers["x-user-role"] = auth.role;
      headers["x-actor-type"] = auth.actorType;
      headers["x-actor-id"] = auth.actorId;
    }
    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      let errorMsg = `HTTP Error ${response.status}`;
      let code: string | undefined;
      let details: unknown;
      try {
        const body = (await response.json()) as ApiErrorResponse;
        if (body.message) errorMsg = body.message;
        code = body.code;
        details = body.details;
      } catch {
        // Fallback to status text
      }
      throw new ApiError(response.status, errorMsg, code, details);
    }
    return response.json() as Promise<T>;
  }

  async getHealth(): Promise<HealthResponse> {
    const response = await fetch(`${this.baseUrl}/health`);
    if (!response.ok) {
      throw new Error(`Health check failed with status: ${response.status}`);
    }
    return response.json();
  }

  async get<T>(path: string, auth?: AuthContext): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: "GET",
      headers: this.getHeaders(auth),
    });
    return this.handleResponse<T>(response);
  }

  async post<T>(path: string, body?: unknown, auth?: AuthContext): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: this.getHeaders(auth),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return this.handleResponse<T>(response);
  }

  async patch<T>(path: string, body?: unknown, auth?: AuthContext): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: "PATCH",
      headers: this.getHeaders(auth),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return this.handleResponse<T>(response);
  }
}

export const apiClient = new ApiClient();
