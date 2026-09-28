import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import type { HealthResponse, QualityPulseOverview } from "@osm/shared";
import type { AuthContext } from "../../services/api-client.ts";
import { analyticsService } from "../../services/analytics-service.ts";
import { ROUTES } from "../../routes/types.ts";
import { Card, Badge, Button, Alert, Skeleton } from "../ui";

export interface AdminOverviewPageProps {
  health: HealthResponse | null;
  healthError: string | null;
  auth: AuthContext;
}

export const AdminOverviewPage: React.FC<AdminOverviewPageProps> = ({
  health,
  healthError,
  auth,
}) => {
  const [pulseData, setPulseData] = useState<QualityPulseOverview | null>(null);
  const [pulseLoading, setPulseLoading] = useState<boolean>(true);
  const [pulseError, setPulseError] = useState<string | null>(null);

  const fetchPulse = useCallback(async () => {
    setPulseLoading(true);
    setPulseError(null);
    try {
      const data = await analyticsService.getQualityPulse({ evaluationCycleId: "cycle-2026-demo", minSampleSize: 5, limit: 10 }, auth);
      setPulseData(data);
    } catch (err: unknown) {
      setPulseError(err instanceof Error ? err.message : "Failed to load active cohort telemetry.");
    } finally {
      setPulseLoading(false);
    }
  }, [auth]);

  useEffect(() => {
    fetchPulse();
  }, [fetchPulse]);

  const isHealthy = health && health.status === "ok";

  return (
    <div className="admin-overview-container" style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      {/* 1. Page Header & Live Status */}
      <section className="hero-card" id="osm-admin-hero">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
              <h1 className="hero-title" style={{ margin: 0 }}>System Overview & Institutional Governance</h1>
              <Badge variant="info">ADMIN</Badge>
            </div>
            <p className="hero-subtitle" style={{ margin: 0, maxWidth: "750px" }}>
              High-assurance digital examination evaluation infrastructure, real-time subsystem telemetry,
              and inviolable governance constraints governing examination workflows.
            </p>
          </div>

          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
            <Button
              variant="secondary"
              size="sm"
              onClick={fetchPulse}
              loading={pulseLoading}
              id="osm-admin-refresh-telemetry-btn"
            >
              🔄 Refresh Telemetry
            </Button>
            <Link to={ROUTES.ADMIN_DEMO}>
              <Button variant="primary" size="sm" id="osm-admin-goto-demo-btn">
                ⚡ Demo Controls
              </Button>
            </Link>
          </div>
        </div>

        <div className="badge-grid" style={{ marginTop: "1.25rem" }}>
          <span className="info-pill">
            Fastify API: <strong>{isHealthy ? "ONLINE (200 OK)" : "DEGRADED"}</strong>
          </span>
          <span className="info-pill">
            Database: <strong>{health?.database === "connected" ? "SQLite WAL (Connected)" : "Connecting..."}</strong>
          </span>
          <span className="info-pill">
            Architecture: <strong>Modular Monolith</strong>
          </span>
          <span className="info-pill">
            Outbox Bus: <strong>Transactional Outbox</strong>
          </span>
          <span className="info-pill">
            Audit Mode: <strong>Append-Only Ledger</strong>
          </span>
          <span className="info-pill">
            Active Role: <strong>{auth.role} ({auth.actorId})</strong>
          </span>
        </div>

        {healthError && (
          <div style={{ marginTop: "1rem" }}>
            <Alert
              type="danger"
              message={`Backend Health Warning: ${healthError}. Ensure the Fastify API server is running.`}
            />
          </div>
        )}
      </section>

      {/* 2. Active Cohort Live Telemetry */}
      <Card
        title="Active Cohort Telemetry"
        subtitle="Live aggregated metrics from the primary examination read-model"
        id="osm-admin-cohort-telemetry-card"
        padding="md"
      >
        {pulseLoading && !pulseData ? (
          <div className="osm-admin-grid-4">
            <Skeleton height="72px" />
            <Skeleton height="72px" />
            <Skeleton height="72px" />
            <Skeleton height="72px" />
          </div>
        ) : pulseError ? (
          <Alert
            type="warning"
            message={`Telemetry Read Note: ${pulseError}. You can initialize or reseed data from Demo Controls.`}
            action={
              <Button size="sm" variant="secondary" onClick={fetchPulse}>
                Retry
              </Button>
            }
          />
        ) : pulseData ? (
          <div>
            <div className="osm-admin-grid-4" style={{ marginBottom: "1rem" }}>
              <div className="osm-subsystem-card" id="telemetry-cycle-card">
                <span style={{ fontSize: "var(--osm-t-metadata)", color: "var(--osm-text-muted)", textTransform: "uppercase" }}>
                  Active Examination Cycle
                </span>
                <strong style={{ fontSize: "1.1rem", color: "var(--osm-text-primary)", fontFamily: "var(--osm-font-display)" }}>
                  {pulseData.evaluationCycleId || "cycle-2026-demo"}
                </strong>
                <span style={{ fontSize: "var(--osm-t-caption)", color: "var(--osm-text-secondary)" }}>
                  Computer Science (CS-101) Cohort
                </span>
              </div>

              <div className="osm-subsystem-card" id="telemetry-volume-card">
                <span style={{ fontSize: "var(--osm-t-metadata)", color: "var(--osm-text-muted)", textTransform: "uppercase" }}>
                  Scripts & Completion
                </span>
                <strong style={{ fontSize: "1.1rem", color: "var(--osm-text-primary)", fontFamily: "var(--osm-font-display)" }}>
                  {pulseData.progress.total} Booklets ({pulseData.progress.completionPercentage.toFixed(1)}%)
                </strong>
                <span style={{ fontSize: "var(--osm-t-caption)", color: "var(--osm-text-secondary)" }}>
                  Submitted: {pulseData.progress.submitted} / {pulseData.progress.total}
                </span>
              </div>

              <div className="osm-subsystem-card" id="telemetry-clean-card">
                <span style={{ fontSize: "var(--osm-t-metadata)", color: "var(--osm-text-muted)", textTransform: "uppercase" }}>
                  Clean Evaluation Rate
                </span>
                <strong style={{ fontSize: "1.1rem", color: "var(--osm-success)", fontFamily: "var(--osm-font-display)" }}>
                  {pulseData.health.healthIndex.toFixed(1)}%
                </strong>
                <span style={{ fontSize: "var(--osm-t-caption)", color: "var(--osm-text-muted)" }}>
                  Review-volume metric: % of scripts without active quality signals.
                </span>
              </div>

              <div className="osm-subsystem-card" id="telemetry-triage-card">
                <span style={{ fontSize: "var(--osm-t-metadata)", color: "var(--osm-text-muted)", textTransform: "uppercase" }}>
                  Open Moderation Triage
                </span>
                <strong style={{ fontSize: "1.1rem", color: pulseData.moderationOverview.openCases > 0 ? "var(--osm-warning)" : "var(--osm-text-primary)", fontFamily: "var(--osm-font-display)" }}>
                  {pulseData.moderationOverview.openCases} Pending {pulseData.moderationOverview.openCases === 1 ? "Case" : "Cases"}
                </strong>
                <span style={{ fontSize: "var(--osm-t-caption)", color: "var(--osm-text-secondary)" }}>
                  Active Signals: {pulseData.signalsOverview.openReviewable} flagged
                </span>
              </div>
            </div>

            <div style={{ fontSize: "var(--osm-t-caption)", color: "var(--osm-text-muted)", borderTop: "1px solid var(--osm-border-subtle)", paddingTop: "0.5rem" }}>
              💡 <em>Telemetry Semantics Notice:</em> Clean Evaluation Rate measures the proportion of completed evaluations unaffected by active quality signals. It must not be interpreted as a qualitative grading distribution score.
            </div>
          </div>
        ) : null}
      </Card>

      {/* 3. Subsystem Health Matrix */}
      <div>
        <div style={{ marginBottom: "0.75rem" }}>
          <h2 style={{ fontSize: "var(--osm-t-subheading)", margin: "0 0 0.25rem 0", color: "var(--osm-text-primary)" }}>
            Subsystem Health & Integrity Matrix
          </h2>
          <p style={{ fontSize: "var(--osm-t-metadata)", color: "var(--osm-text-secondary)", margin: 0 }}>
            Operational integrity monitoring for foundational execution engines and persistence stores.
          </p>
        </div>

        <div className="osm-admin-grid-3">
          {/* Card 1: Fastify REST API */}
          <div className="osm-subsystem-card" id="subsystem-card-fastify">
            <div className="osm-subsystem-header">
              <span className="osm-subsystem-name">
                🌐 Fastify HTTP Engine
              </span>
              <Badge variant={isHealthy ? "success" : "danger"}>
                {isHealthy ? "OPERATIONAL" : "DEGRADED"}
              </Badge>
            </div>
            <div className="osm-subsystem-meta">
              <div className="osm-subsystem-row">
                <span>Protocol / Prefix:</span>
                <strong>HTTP REST /api/v1</strong>
              </div>
              <div className="osm-subsystem-row">
                <span>Process Uptime:</span>
                <strong>{health?.uptimeSeconds ? `${health.uptimeSeconds}s` : "Online"}</strong>
              </div>
              <div className="osm-subsystem-row">
                <span>Spec & Validation:</span>
                <strong>TypeBox / RFC 7807</strong>
              </div>
            </div>
          </div>

          {/* Card 2: SQLite WAL Database */}
          <div className="osm-subsystem-card" id="subsystem-card-sqlite">
            <div className="osm-subsystem-header">
              <span className="osm-subsystem-name">
                💾 SQLite WAL Database
              </span>
              <Badge variant={health?.database === "connected" ? "success" : "warning"}>
                {health?.database === "connected" ? "CONNECTED" : "CONNECTING"}
              </Badge>
            </div>
            <div className="osm-subsystem-meta">
              <div className="osm-subsystem-row">
                <span>Engine / Mode:</span>
                <strong>node:sqlite / WAL</strong>
              </div>
              <div className="osm-subsystem-row">
                <span>Query Builder:</span>
                <strong>Kysely (Type-Safe)</strong>
              </div>
              <div className="osm-subsystem-row">
                <span>Integrity:</span>
                <strong>Foreign Keys & ACID</strong>
              </div>
            </div>
          </div>

          {/* Card 3: Transactional Outbox Engine */}
          <div className="osm-subsystem-card" id="subsystem-card-outbox">
            <div className="osm-subsystem-header">
              <span className="osm-subsystem-name">
                📨 Transactional Outbox
              </span>
              <Badge variant="success">ATOMIC</Badge>
            </div>
            <div className="osm-subsystem-meta">
              <div className="osm-subsystem-row">
                <span>Bus Pattern:</span>
                <strong>Transactional Outbox</strong>
              </div>
              <div className="osm-subsystem-row">
                <span>Delivery Guarantee:</span>
                <strong>At-least-once (Zero Loss)</strong>
              </div>
              <div className="osm-subsystem-row">
                <span>Dispatch Status:</span>
                <strong>Async Deduplicated</strong>
              </div>
            </div>
          </div>

          {/* Card 4: TrustLens Audit Subsystem */}
          <div className="osm-subsystem-card" id="subsystem-card-trustlens">
            <div className="osm-subsystem-header">
              <span className="osm-subsystem-name">
                🛡️ TrustLens Audit
              </span>
              <Badge variant="info">APPEND-ONLY</Badge>
            </div>
            <div className="osm-subsystem-meta">
              <div className="osm-subsystem-row">
                <span>Ledger Policy:</span>
                <strong>Application Append-Only</strong>
              </div>
              <div className="osm-subsystem-row">
                <span>Actor Attribution:</span>
                <strong>Strict (User + Role)</strong>
              </div>
              <div className="osm-subsystem-row">
                <span>Traceability:</span>
                <strong>Payload & Reason Hashes</strong>
              </div>
            </div>
          </div>

          {/* Card 5: CompleteCheck Validation Engine */}
          <div className="osm-subsystem-card" id="subsystem-card-completecheck">
            <div className="osm-subsystem-header">
              <span className="osm-subsystem-name">
                ✅ CompleteCheck Engine
              </span>
              <Badge variant="success">DETERMINISTIC</Badge>
            </div>
            <div className="osm-subsystem-meta">
              <div className="osm-subsystem-row">
                <span>Validation Phase:</span>
                <strong>Pre-Submission Core</strong>
              </div>
              <div className="osm-subsystem-row">
                <span>Check Types:</span>
                <strong>Unmarked, Math, Bounds</strong>
              </div>
              <div className="osm-subsystem-row">
                <span>Bypass Rule:</span>
                <strong>Hard Invariant (No Bypass)</strong>
              </div>
            </div>
          </div>

          {/* Card 6: SentinelFlag Statistical Engine */}
          <div className="osm-subsystem-card" id="subsystem-card-sentinelflag">
            <div className="osm-subsystem-header">
              <span className="osm-subsystem-name">
                📊 SentinelFlag Statistical
              </span>
              <Badge variant="info">ADVISORY</Badge>
            </div>
            <div className="osm-subsystem-meta">
              <div className="osm-subsystem-row">
                <span>Detector Type:</span>
                <strong>Cohort Anomaly Analytics</strong>
              </div>
              <div className="osm-subsystem-row">
                <span>Authority Model:</span>
                <strong>Signal ≠ Decision</strong>
              </div>
              <div className="osm-subsystem-row">
                <span>Execution Trigger:</span>
                <strong>Idempotent On-Demand</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Institutional Governance Policies */}
      <div>
        <div style={{ marginBottom: "0.75rem" }}>
          <h2 style={{ fontSize: "var(--osm-t-subheading)", margin: "0 0 0.25rem 0", color: "var(--osm-text-primary)" }}>
            Institutional Governance & Inviolable Policies
          </h2>
          <p style={{ fontSize: "var(--osm-t-metadata)", color: "var(--osm-text-secondary)", margin: 0 }}>
            System invariants actively enforced across all domain workflows, roles, and API boundaries.
          </p>
        </div>

        <div className="osm-admin-grid-2">
          <div className="osm-policy-card" id="policy-card-human-authority">
            <div className="osm-policy-header">
              <span className="osm-policy-rule-id">INV-001 / INV-002</span>
              <span className="osm-policy-title">Strict Human Authority Principle</span>
            </div>
            <p className="osm-policy-desc">
              Authoritative academic marking decisions remain the exclusive prerogative of human examiners and moderators.
              Neither AI models, statistical anomalies, nor automated validators are permitted to alter, override, or finalize student scores independently.
            </p>
          </div>

          <div className="osm-policy-card" id="policy-card-signal-separation">
            <div className="osm-policy-header">
              <span className="osm-policy-rule-id">INV-003 / INV-004</span>
              <span className="osm-policy-title">Signal vs Decision Separation</span>
            </div>
            <p className="osm-policy-desc">
              All statistical outlier detections (SentinelFlag) and semantic recommendations (CompleteCheck AI Advisory) are treated
              strictly as non-consequential quality signals. They trigger triage investigation but do not represent proof of error or malpractice.
            </p>
          </div>

          <div className="osm-policy-card" id="policy-card-audit-immutability">
            <div className="osm-policy-header">
              <span className="osm-policy-rule-id">INV-005</span>
              <span className="osm-policy-title">Transactional Audit Immutability</span>
            </div>
            <p className="osm-policy-desc">
              Every state transition, mark save, submission attempt, triage assignment, and moderation resolution produces an immutable audit record.
              Audit records cannot be modified or deleted through application endpoints, guaranteeing full forensic accountability.
            </p>
          </div>

          <div className="osm-policy-card" id="policy-card-candidate-anonymity">
            <div className="osm-policy-header">
              <span className="osm-policy-rule-id">SEC-001</span>
              <span className="osm-policy-title">Candidate Anonymity & PII Protection</span>
            </div>
            <p className="osm-policy-desc">
              Candidate identities are protected through double-blind evaluation tokens. No student names, roll numbers, or demographic identifiers
              are rendered in examiner marking panels or moderator triage screens, preventing bias during assessment.
            </p>
          </div>
        </div>
      </div>

      {/* 5. Administrative Action Portals */}
      <div>
        <div style={{ marginBottom: "0.75rem" }}>
          <h2 style={{ fontSize: "var(--osm-t-subheading)", margin: "0 0 0.25rem 0", color: "var(--osm-text-primary)" }}>
            Administrative Action Portals
          </h2>
          <p style={{ fontSize: "var(--osm-t-metadata)", color: "var(--osm-text-secondary)", margin: 0 }}>
            Direct access to orchestration, analytical inspection, forensic audit, and triage centers.
          </p>
        </div>

        <div className="osm-admin-grid-4">
          <Link to={ROUTES.ADMIN_DEMO} style={{ textDecoration: "none" }}>
            <div className="osm-act-card" id="portal-card-demo">
              <div className="osm-act-header">
                <span className="osm-act-num">ORCHESTRATION</span>
                <Badge variant="info">CONTROL</Badge>
              </div>
              <h3 className="osm-act-title">Demo Controls</h3>
              <p className="osm-act-desc">
                Seed or reset the canonical Spring 2026 examination cohort (12 evaluations, 4 evaluators, active triage cases).
              </p>
              <div className="osm-act-footer">
                <span style={{ fontSize: "var(--osm-t-metadata)", color: "var(--osm-primary)", fontWeight: 600 }}>
                  Manage Scenario →
                </span>
              </div>
            </div>
          </Link>

          <Link to={ROUTES.ADMIN_ANALYTICS} style={{ textDecoration: "none" }}>
            <div className="osm-act-card" id="portal-card-analytics">
              <div className="osm-act-header">
                <span className="osm-act-num">INTELLIGENCE</span>
                <Badge variant="info">PULSE</Badge>
              </div>
              <h3 className="osm-act-title">QualityPulse Analytics</h3>
              <p className="osm-act-desc">
                Inspect cohort-wide score distributions, examiner deviation metrics, and trigger SentinelFlag anomaly detection.
              </p>
              <div className="osm-act-footer">
                <span style={{ fontSize: "var(--osm-t-metadata)", color: "var(--osm-primary)", fontWeight: 600 }}>
                  Open Analytics →
                </span>
              </div>
            </div>
          </Link>

          <Link to={ROUTES.ADMIN_AUDIT} style={{ textDecoration: "none" }}>
            <div className="osm-act-card" id="portal-card-audit">
              <div className="osm-act-header">
                <span className="osm-act-num">FORENSICS</span>
                <Badge variant="muted">LEDGER</Badge>
              </div>
              <h3 className="osm-act-title">TrustLens Audit</h3>
              <p className="osm-act-desc">
                Examine chronological audit trails, state transition history, actor attribution, and transactional outbox event delivery.
              </p>
              <div className="osm-act-footer">
                <span style={{ fontSize: "var(--osm-t-metadata)", color: "var(--osm-primary)", fontWeight: 600 }}>
                  View Ledger →
                </span>
              </div>
            </div>
          </Link>

          <Link to={ROUTES.ADMIN_TRIAGE} style={{ textDecoration: "none" }}>
            <div className="osm-act-card" id="portal-card-triage">
              <div className="osm-act-header">
                <span className="osm-act-num">MODERATION</span>
                <Badge variant="warning">ESCALATION</Badge>
              </div>
              <h3 className="osm-act-title">Escalation Hub</h3>
              <p className="osm-act-desc">
                Review priority-flagged cases, inspect supporting statistical evidence, and execute binding human resolutions.
              </p>
              <div className="osm-act-footer">
                <span style={{ fontSize: "var(--osm-t-metadata)", color: "var(--osm-primary)", fontWeight: 600 }}>
                  Review Worklist →
                </span>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};
