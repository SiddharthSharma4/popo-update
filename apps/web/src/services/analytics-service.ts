/**
 * Quality Analytics and QualityPulse API Service for Web Presentation Layer.
 * Conforms to:
 * - docs/contracts/06-api-contract.md §12, §21, §41-45
 * - docs/contracts/01-product-contract.md §15 (QualityPulse)
 * - docs/contracts/01-product-contract.md §16 (SentinelFlag)
 * - docs/contracts/02-architecture-contract.md §31, §61 (Read Model consumption)
 *
 * Invariants:
 * - Pure consumption of backend-derived analytics (INV-004).
 * - Zero domain/mark calculation performed in web presentation layer.
 */

import type {
  QualityPulseOverview,
  QualityHotspot,
  TriggerSentinelResponse,
  EvaluatorDeviationMetric,
  QualityAnalyticsSummary,
  GetQualityPulseQuery,
  GetEvaluatorAnalyticsQuery,
  GetQualityAnalyticsQuery,
} from "@osm/shared";
import { apiClient, type AuthContext } from "./api-client.ts";

export interface TriggerSentinelPayload {
  evaluationCycleId?: string;
  minSampleSize?: number;
  thresholdPercent?: number;
  criticalThresholdPercent?: number;
}

export const analyticsService = {
  /**
   * Retrieves the comprehensive real-time QualityPulse overview.
   * Consumes GET /api/v1/analytics/quality-pulse
   */
  async getQualityPulse(
    query?: GetQualityPulseQuery,
    auth?: AuthContext
  ): Promise<QualityPulseOverview> {
    const params = new URLSearchParams();
    if (query?.evaluationCycleId) params.set("evaluationCycleId", query.evaluationCycleId);
    if (query?.minSampleSize !== undefined) params.set("minSampleSize", String(query.minSampleSize));
    if (query?.limit !== undefined) params.set("limit", String(query.limit));

    const qs = params.toString();
    const path = `/analytics/quality-pulse${qs ? `?${qs}` : ""}`;
    return apiClient.get<QualityPulseOverview>(path, auth);
  },

  /**
   * Retrieves prioritized emerging hotspots with supporting evidence.
   * Consumes GET /api/v1/analytics/quality-pulse/hotspots
   */
  async getHotspots(
    query?: GetQualityPulseQuery,
    auth?: AuthContext
  ): Promise<QualityHotspot[]> {
    const params = new URLSearchParams();
    if (query?.evaluationCycleId) params.set("evaluationCycleId", query.evaluationCycleId);
    if (query?.minSampleSize !== undefined) params.set("minSampleSize", String(query.minSampleSize));
    if (query?.limit !== undefined) params.set("limit", String(query.limit));

    const qs = params.toString();
    const path = `/analytics/quality-pulse/hotspots${qs ? `?${qs}` : ""}`;
    return apiClient.get<QualityHotspot[]>(path, auth);
  },

  /**
   * Manually triggers SentinelFlag statistical anomaly detection across a cohort.
   * Consumes POST /api/v1/analytics/quality-pulse/trigger-sentinel
   */
  async triggerSentinel(
    payload?: TriggerSentinelPayload,
    auth?: AuthContext
  ): Promise<TriggerSentinelResponse> {
    return apiClient.post<TriggerSentinelResponse>(
      "/analytics/quality-pulse/trigger-sentinel",
      payload ?? {},
      auth
    );
  },

  /**
   * Retrieves cohort evaluator deviation metrics.
   * Consumes GET /api/v1/analytics/evaluators
   */
  async getEvaluatorMetrics(
    query?: GetEvaluatorAnalyticsQuery,
    auth?: AuthContext
  ): Promise<EvaluatorDeviationMetric[]> {
    const params = new URLSearchParams();
    if (query?.evaluationCycleId) params.set("evaluationCycleId", query.evaluationCycleId);
    if (query?.evaluatorId) params.set("evaluatorId", query.evaluatorId);
    if (query?.minSampleSize !== undefined) params.set("minSampleSize", String(query.minSampleSize));

    const qs = params.toString();
    const path = `/analytics/evaluators${qs ? `?${qs}` : ""}`;
    return apiClient.get<EvaluatorDeviationMetric[]>(path, auth);
  },

  /**
   * Retrieves aggregated quality analytics summary.
   * Consumes GET /api/v1/analytics/summary
   */
  async getQualitySummary(
    query?: GetQualityAnalyticsQuery,
    auth?: AuthContext
  ): Promise<QualityAnalyticsSummary> {
    const params = new URLSearchParams();
    if (query?.evaluationCycleId) params.set("evaluationCycleId", query.evaluationCycleId);
    if (query?.minSampleSize !== undefined) params.set("minSampleSize", String(query.minSampleSize));

    const qs = params.toString();
    const path = `/analytics/summary${qs ? `?${qs}` : ""}`;
    return apiClient.get<QualityAnalyticsSummary>(path, auth);
  },
};
