import React, { useEffect, useState } from "react";
import type { HealthResponse } from "@osm/shared";
import { UserRole, ActorType } from "@osm/shared";
import { apiClient, type AuthContext } from "./services/api-client.ts";
import { demoService } from "./services/demo-service.ts";
import { RoleSwitcher } from "./components/common/RoleSwitcher.tsx";
import { EscalationHub } from "./components/escalation/EscalationHub.tsx";
import { QualityPulseDashboard } from "./components/analytics/QualityPulseDashboard.tsx";
import { EvaluationWorkspace } from "./components/evaluation/EvaluationWorkspace.tsx";
import { TrustLensView } from "./components/audit/TrustLensView.tsx";

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSeeding, setIsSeeding] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [seedFeedback, setSeedFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Demo actor context (DEVELOPMENT / DEMO actor simulator only; server strictly enforces authorization)
  const [auth, setAuth] = useState<AuthContext>({
    role: UserRole.MODERATOR,
    actorId: "moderator_1",
    actorType: ActorType.USER,
  });

  useEffect(() => {
    let isMounted = true;
    const checkHealth = async () => {
      try {
        const data = await apiClient.getHealth();
        if (isMounted) {
          setHealth(data);
          setHealthError(null);
        }
      } catch (err) {
        if (isMounted) {
          setHealthError(err instanceof Error ? err.message : "API offline");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleSeedDemo = async () => {
    setIsSeeding(true);
    setSeedFeedback(null);
    try {
      const res = await demoService.seedDemoCohort(auth);
      setSeedFeedback({
        type: "success",
        text: `Demo Seeded Successfully (${res.status}): Cycle "${res.cycleId}", ${res.evaluationsCount} evaluations, ${res.signalsCount} signals, ${res.triageCasesCount} triage cases.`,
      });
    } catch (err: any) {
      setSeedFeedback({
        type: "error",
        text: err.message || "Failed to seed demo scenario.",
      });
    } finally {
      setIsSeeding(false);
    }
  };

  const handleResetDemo = async () => {
    if (!window.confirm("Are you sure you want to reset the canonical demo scenario? All canonical demo evaluations, signals, triage cases, and resolutions will be removed.")) {
      return;
    }
    setIsResetting(true);
    setSeedFeedback(null);
    try {
      const res = await demoService.resetDemoCohort(auth);
      setSeedFeedback({
        type: "success",
        text: `Demo Reset Successfully (${res.status}): Removed ${res.evaluationsRemoved} evaluations, ${res.signalsRemoved} signals, ${res.triageCasesRemoved} triage cases, ${res.resolutionsRemoved} resolutions.`,
      });
    } catch (err: any) {
      setSeedFeedback({
        type: "error",
        text: err.message || "Failed to reset demo scenario.",
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <>
      <header className="app-header" id="osm-app-header">
        <div className="brand-wrapper">
          <div className="brand-logo" id="osm-logo">OSM</div>
          <span className="brand-title">On-Screen Marking & Digital Evaluation</span>
          <span className="brand-badge" id="osm-environment-badge">
            {health?.environment.toUpperCase() || "DEV"}
          </span>
        </div>

        {/* Demo Actor Simulator Switcher */}
        <RoleSwitcher auth={auth} onAuthChange={setAuth} />

        <div className="header-status" id="osm-header-status">
          <div className="status-indicator">
            <span
              className={`status-dot ${health?.database === "connected" ? "online" : "offline"}`}
              id="osm-db-status-dot"
            />
            <span id="osm-db-status-text">
              DB: {health?.database ? health.database.toUpperCase() : "CHECKING"}
            </span>
          </div>

          <div className="status-indicator">
            <span
              className={`status-dot ${health?.status === "ok" ? "online" : "offline"}`}
              id="osm-api-status-dot"
            />
            <span id="osm-api-status-text">
              API: {loading ? "CONNECTING..." : health?.status ? "ONLINE" : "OFFLINE"}
            </span>
          </div>
        </div>
      </header>

      {/* Admin Demo Seeder Bar - Restricted to ADMIN Role */}
      {auth.role === UserRole.ADMIN && (
        <div className="admin-demo-toolbar" id="admin-demo-toolbar">
          <div className="admin-toolbar-inner">
            <div className="admin-toolbar-info">
              <span className="admin-badge">ADMIN CONTROL</span>
              <span className="admin-toolbar-label">Deterministic Demo Orchestration (Golden Path)</span>
            </div>
            <div className="admin-toolbar-actions">
              <button
                id="btn-admin-seed-demo"
                className="btn-seed-demo"
                onClick={handleSeedDemo}
                disabled={isSeeding || isResetting}
              >
                {isSeeding ? "⚡ Seeding Canonical Scenario..." : "⚡ Seed Deterministic Demo Scenario"}
              </button>
              <button
                id="btn-admin-reset-demo"
                className="btn-reset-demo"
                onClick={handleResetDemo}
                disabled={isSeeding || isResetting}
              >
                {isResetting ? "🔄 Resetting Demo Scenario..." : "🔄 Reset Demo Scenario"}
              </button>
            </div>
          </div>
          {seedFeedback && (
            <div
              className={`seed-feedback-banner ${seedFeedback.type === "success" ? "feedback-success" : "feedback-error"}`}
              id="seed-feedback-banner"
            >
              <span>{seedFeedback.type === "success" ? "✓" : "⚠️"} {seedFeedback.text}</span>
              <button
                className="feedback-dismiss"
                id="btn-dismiss-seed-feedback"
                onClick={() => setSeedFeedback(null)}
              >
                ✕
              </button>
            </div>
          )}
        </div>
      )}

      <main className="app-container" id="osm-main-container">
        <nav className="nav-tabs" id="osm-nav-tabs">
          <button
            id="tab-overview"
            className={`tab-btn ${activeTab === "overview" ? "active" : ""}`}
            onClick={() => setActiveTab("overview")}
          >
            P0: Foundation Baseline
          </button>
          <button
            id="tab-workspace"
            className={`tab-btn ${activeTab === "workspace" ? "active" : ""}`}
            onClick={() => setActiveTab("workspace")}
          >
            Evaluation Workspace (P2)
          </button>
          <button
            id="tab-escalation"
            className={`tab-btn ${activeTab === "escalation" ? "active" : ""}`}
            onClick={() => setActiveTab("escalation")}
          >
            EscalationHub / Triage (P5)
          </button>
          <button
            id="tab-pulse"
            className={`tab-btn ${activeTab === "pulse" ? "active" : ""}`}
            onClick={() => setActiveTab("pulse")}
          >
            QualityPulse Analytics (P8)
          </button>
          <button
            id="tab-audit"
            className={`tab-btn ${activeTab === "audit" ? "active" : ""}`}
            onClick={() => setActiveTab("audit")}
          >
            TrustLens & Audit (P6)
          </button>
        </nav>

        {activeTab === "overview" && (
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
        )}

        {/* Phase 2: Evaluation Workspace */}
        {activeTab === "workspace" && <EvaluationWorkspace auth={auth} />}

        {/* Phase 5: EscalationHub Moderation Experience */}
        {activeTab === "escalation" && <EscalationHub auth={auth} />}

        {/* Phase 8: QualityPulse Analytics Dashboard */}
        {activeTab === "pulse" && <QualityPulseDashboard auth={auth} />}

        {/* Phase 6: TrustLens & Audit Ledger */}
        {activeTab === "audit" && <TrustLensView auth={auth} />}

        {activeTab !== "overview" &&
          activeTab !== "workspace" &&
          activeTab !== "escalation" &&
          activeTab !== "pulse" &&
          activeTab !== "audit" && (
            <div className="hero-card" id="osm-placeholder-view">
              <h2 className="hero-title">{activeTab.toUpperCase()} Module</h2>
              <p className="hero-subtitle">
                This module belongs to a subsequent roadmap phase according to docs/planning/03-build-roadmap.md.
              </p>
            </div>
          )}
      </main>
    </>
  );
};
