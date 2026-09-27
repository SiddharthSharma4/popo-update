import React from "react";
import type { HealthResponse } from "@osm/shared";

export interface AdminOverviewPageProps {
  health: HealthResponse | null;
  healthError: string | null;
}

export const AdminOverviewPage: React.FC<AdminOverviewPageProps> = ({ health, healthError }) => {
  return (
    <div>
      <section className="hero-card" id="osm-hero-section">
        <h1 className="hero-title">OSM Intelligent Quality & Evaluation Foundation</h1>
        <p className="hero-subtitle">
          Mission-critical on-screen marking platform engineered for high-throughput examination workflows,
          deterministic validation, statistical anomaly detection, and human-in-the-loop governance.
        </p>
        <div className="badge-grid">
          <span className="info-pill">Architecture: Modular Monolith</span>
          <span className="info-pill">Persistence: SQLite (WAL Mode) + Kysely</span>
          <span className="info-pill">Outbox: Transactional Outbox Pattern</span>
          <span className="info-pill">HTTP API: Fastify /api/v1</span>
          <span className="info-pill">Governance: Strict Human Authority</span>
        </div>

        {health && (
          <div className="health-panel" id="osm-live-health-panel">
            <div>// Live Backend Verification</div>
            <div>Status: {health.status}</div>
            <div>Database: {health.database}</div>
            <div>Uptime: {health.uptimeSeconds}s</div>
            <div>Timestamp: {health.timestamp}</div>
          </div>
        )}

        {healthError && (
          <div className="health-panel" style={{ color: "#ef4444" }} id="osm-health-error-panel">
            <div>Backend Connection Note: {healthError}</div>
            <div>(Backend server can be started with npm run dev:api)</div>
          </div>
        )}
      </section>

      <div className="cards-grid">
        <div className="feature-card" id="card-completecheck">
          <div className="feature-title">
            <span>CompleteCheck</span>
            <span className="brand-badge">Phase 3</span>
          </div>
          <p className="feature-desc">
            Deterministic completeness validator detecting unchecked answers, missing question marks,
            out-of-range scores, and mathematical total mismatches prior to submission.
          </p>
          <div className="card-footer">
            <span>Target: Domain Validation</span>
            <span>Rule: Deterministic Core</span>
          </div>
        </div>

        <div className="feature-card" id="card-sentinelflag">
          <div className="feature-title">
            <span>SentinelFlag</span>
            <span className="brand-badge">Phase 4</span>
          </div>
          <p className="feature-desc">
            Statistical intelligence generating evidence-backed QualitySignals for evaluator drift, scoring
            outliers, and evaluation velocity anomalies without altering authoritative marks.
          </p>
          <div className="card-footer">
            <span>Target: Statistical Detectors</span>
            <span>Rule: Signal ≠ Decision</span>
          </div>
        </div>

        <div className="feature-card" id="card-escalationhub">
          <div className="feature-title">
            <span>EscalationHub</span>
            <span className="brand-badge">Phase 5</span>
          </div>
          <p className="feature-desc">
            Prioritized moderation triage queue connecting flagged signals to human reviewers for
            formal investigation, reason recording, and authorized Resolution.
          </p>
          <div className="card-footer">
            <span>Target: Moderation Workflow</span>
            <span>Rule: Human Resolution Only</span>
          </div>
        </div>

        <div className="feature-card" id="card-trustlens">
          <div className="feature-title">
            <span>TrustLens & Outbox</span>
            <span className="brand-badge">Phase 6</span>
          </div>
          <p className="feature-desc">
            Immutable audit records and transactional outbox events guaranteeing zero-data-loss consistency
            across state transitions, evaluator actions, and moderation decisions.
          </p>
          <div className="card-footer">
            <span>Target: Audit & Persistence</span>
            <span>Rule: Immutable History</span>
          </div>
        </div>
      </div>
    </div>
  );
};
