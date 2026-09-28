import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { DemoSeedResponse, DemoResetResponse } from "@osm/shared";
import { UserRole, ActorType } from "@osm/shared";
import type { AuthContext } from "../../services/api-client.ts";
import { demoService } from "../../services/demo-service.ts";
import { ROUTES } from "../../routes/types.ts";
import { Card, Badge, Alert, Button, Modal } from "../ui";

export interface AdminDemoPageProps {
  auth: AuthContext;
  onAuthChange?: (newAuth: AuthContext) => void;
}

type OrchestrationResult =
  | { type: "SEED"; data: DemoSeedResponse }
  | { type: "RESET"; data: DemoResetResponse };

export const AdminDemoPage: React.FC<AdminDemoPageProps> = ({ auth, onAuthChange }) => {
  const navigate = useNavigate();
  const [isSeeding, setIsSeeding] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [showResetModal, setShowResetModal] = useState<boolean>(() => {
    try {
      return new URLSearchParams(window.location.search).get("modal") === "reset";
    } catch {
      return false;
    }
  });
  const [lastResult, setLastResult] = useState<OrchestrationResult | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "danger"; text: string } | null>(null);

  const handleSeedDemo = async () => {
    setIsSeeding(true);
    setFeedback(null);
    try {
      const res = await demoService.seedDemoCohort(auth);
      setLastResult({ type: "SEED", data: res });
      setFeedback({
        type: "success",
        text: `Demo Seeded Successfully (${res.status}): Cycle "${res.cycleId}", ${res.evaluationsCount} evaluations, ${res.signalsCount} signals, ${res.triageCasesCount} triage cases.`,
      });
    } catch (err: unknown) {
      setFeedback({
        type: "danger",
        text: err instanceof Error ? err.message : "Failed to seed demo scenario.",
      });
    } finally {
      setIsSeeding(false);
    }
  };

  const handleConfirmReset = async () => {
    setShowResetModal(false);
    setIsResetting(true);
    setFeedback(null);
    try {
      const res = await demoService.resetDemoCohort(auth);
      setLastResult({ type: "RESET", data: res });
      setFeedback({
        type: "success",
        text: `Demo Reset Successfully (${res.status}): Removed ${res.evaluationsRemoved} evaluations, ${res.signalsRemoved} signals, ${res.triageCasesRemoved} triage cases, ${res.resolutionsRemoved} resolutions.`,
      });
    } catch (err: unknown) {
      setFeedback({
        type: "danger",
        text: err instanceof Error ? err.message : "Failed to reset demo scenario.",
      });
    } finally {
      setIsResetting(false);
    }
  };

  const handleOpenAct1 = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onAuthChange) {
      onAuthChange({
        role: UserRole.EXAMINER,
        actorId: "evaluator_1",
        actorType: ActorType.USER,
      });
    }
    navigate("/examiner/evaluate/eval-demo-incomplete");
  };

  const handleOpenAct2 = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onAuthChange) {
      onAuthChange({
        role: UserRole.ADMIN,
        actorId: "admin_1",
        actorType: ActorType.USER,
      });
    }
    navigate(ROUTES.ADMIN_ANALYTICS);
  };

  const handleOpenAct3 = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onAuthChange) {
      onAuthChange({
        role: UserRole.MODERATOR,
        actorId: "moderator_1",
        actorType: ActorType.USER,
      });
    }
    navigate(ROUTES.ADMIN_TRIAGE);
  };

  const handleOpenAct4 = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onAuthChange) {
      onAuthChange({
        role: UserRole.ADMIN,
        actorId: "admin_1",
        actorType: ActorType.USER,
      });
    }
    navigate(ROUTES.ADMIN_AUDIT);
  };

  return (
    <div className="admin-demo-container" style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      {/* 1. Header Section */}
      <section className="hero-card" id="osm-admin-demo-hero">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
              <h1 className="hero-title" style={{ margin: 0 }}>Demo Controls & Scenario Orchestration</h1>
              <Badge variant="info">ADMIN</Badge>
            </div>
            <p className="hero-subtitle" style={{ margin: 0, maxWidth: "750px" }}>
              Deterministic multi-actor examination cycle orchestration and golden path demonstration environment.
              Seed canonical examination cohorts or return the platform to a pristine foundation baseline.
            </p>
          </div>

          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <Link to={ROUTES.ADMIN_OVERVIEW}>
              <Button variant="secondary" size="sm" id="osm-demo-back-overview-btn">
                ← System Overview
              </Button>
            </Link>
          </div>
        </div>

        <div className="badge-grid" style={{ marginTop: "1.25rem" }}>
          <span className="info-pill">
            Scenario: <strong>Computer Science: Systems & Algorithms (CS-101)</strong>
          </span>
          <span className="info-pill">
            Cycle ID: <strong>cycle-2026-demo</strong>
          </span>
          <span className="info-pill">
            Rubric ID: <strong>RUBRIC-CS-101</strong>
          </span>
          <span className="info-pill">
            Evaluations: <strong>12 Canonical Booklets (4 Evaluators)</strong>
          </span>
          <span className="info-pill">
            Audit Guarantee: <strong>Permanent Append-Only Continuity</strong>
          </span>
        </div>
      </section>

      {/* 2. Primary Orchestration Controls */}
      <Card
        title="Primary Orchestration Controls"
        subtitle="Manage deterministic test fixtures and canonical multi-actor evaluation cycles"
        id="osm-demo-primary-controls-card"
        padding="lg"
      >
        <p style={{ color: "var(--osm-text-secondary)", marginBottom: "1.25rem", lineHeight: "1.6", margin: 0 }}>
          Seeding provisions the canonical Spring 2026 cohort (12 evaluations across 4 evaluators, active statistical drift signals,
          and open moderation cases). Resetting purges all demo evaluation fixtures while appending an immutable audit record to preserve ledger continuity.
        </p>

        {feedback && (
          <div style={{ margin: "1.25rem 0" }}>
            <Alert
              type={feedback.type}
              message={feedback.text}
              dismissible
              onDismiss={() => setFeedback(null)}
            />
          </div>
        )}

        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginTop: "1.25rem" }}>
          <Button
            variant="primary"
            size="md"
            loading={isSeeding}
            disabled={isResetting}
            onClick={handleSeedDemo}
            id="osm-demo-seed-btn"
          >
            ⚡ Seed Deterministic Demo Cohort
          </Button>

          <Button
            variant="danger"
            size="md"
            loading={isResetting}
            disabled={isSeeding}
            onClick={() => setShowResetModal(true)}
            id="osm-demo-reset-trigger-btn"
          >
            🔄 Reset Demo Scenario
          </Button>
        </div>
      </Card>

      {/* 3. Last Orchestration Telemetry Panel */}
      {lastResult && (
        <Card
          title="Last Orchestration Telemetry"
          subtitle={`Telemetry report from most recent ${lastResult.type === "SEED" ? "Seeding" : "Reset"} operation`}
          id="osm-demo-telemetry-card"
          padding="md"
        >
          <div className="osm-admin-grid-4">
            <div className="osm-subsystem-card">
              <span style={{ fontSize: "var(--osm-t-metadata)", color: "var(--osm-text-muted)", textTransform: "uppercase" }}>
                Operation Status
              </span>
              <strong style={{ fontSize: "1.1rem", color: "var(--osm-text-primary)", fontFamily: "var(--osm-font-display)" }}>
                {lastResult.data.status}
              </strong>
              <span style={{ fontSize: "var(--osm-t-caption)", color: "var(--osm-text-secondary)" }}>
                Type: {lastResult.type}
              </span>
            </div>

            <div className="osm-subsystem-card">
              <span style={{ fontSize: "var(--osm-t-metadata)", color: "var(--osm-text-muted)", textTransform: "uppercase" }}>
                Target Cycle ID
              </span>
              <strong style={{ fontSize: "1.1rem", color: "var(--osm-text-primary)", fontFamily: "var(--osm-font-display)" }}>
                {lastResult.data.cycleId}
              </strong>
              <span style={{ fontSize: "var(--osm-t-caption)", color: "var(--osm-text-secondary)" }}>
                Rubric: {lastResult.data.rubricId}
              </span>
            </div>

            <div className="osm-subsystem-card">
              <span style={{ fontSize: "var(--osm-t-metadata)", color: "var(--osm-text-muted)", textTransform: "uppercase" }}>
                {lastResult.type === "SEED" ? "Evaluations Seeded" : "Evaluations Removed"}
              </span>
              <strong style={{ fontSize: "1.1rem", color: "var(--osm-text-primary)", fontFamily: "var(--osm-font-display)" }}>
                {lastResult.type === "SEED"
                  ? `${(lastResult.data as DemoSeedResponse).evaluationsCount} Scripts`
                  : `${(lastResult.data as DemoResetResponse).evaluationsRemoved} Scripts`}
              </strong>
              <span style={{ fontSize: "var(--osm-t-caption)", color: "var(--osm-text-secondary)" }}>
                {lastResult.type === "SEED"
                  ? `${(lastResult.data as DemoSeedResponse).signalsCount} Signals Generated`
                  : `${(lastResult.data as DemoResetResponse).signalsRemoved} Signals Removed`}
              </span>
            </div>

            <div className="osm-subsystem-card">
              <span style={{ fontSize: "var(--osm-t-metadata)", color: "var(--osm-text-muted)", textTransform: "uppercase" }}>
                Execution Timestamp
              </span>
              <strong style={{ fontSize: "1.1rem", color: "var(--osm-text-primary)", fontFamily: "var(--osm-font-display)" }}>
                {new Date(lastResult.type === "SEED" ? (lastResult.data as DemoSeedResponse).seededAt : (lastResult.data as DemoResetResponse).resetAt).toLocaleTimeString()}
              </strong>
              <span style={{ fontSize: "var(--osm-t-caption)", color: "var(--osm-text-secondary)" }}>
                {lastResult.type === "SEED"
                  ? `${(lastResult.data as DemoSeedResponse).triageCasesCount} Triage Cases`
                  : `${(lastResult.data as DemoResetResponse).resolutionsRemoved} Resolutions Removed`}
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* 4. Golden Path Multi-Actor Scenario Guide (Acts 1–4) */}
      <div>
        <div style={{ marginBottom: "0.75rem" }}>
          <h2 style={{ fontSize: "var(--osm-t-subheading)", margin: "0 0 0.25rem 0", color: "var(--osm-text-primary)" }}>
            Multi-Actor Demonstration Scenario Walkthrough (Acts 1–4)
          </h2>
          <p style={{ fontSize: "var(--osm-t-metadata)", color: "var(--osm-text-secondary)", margin: 0 }}>
            Conforms strictly to <code>docs/contracts/10-demo-contract.md §11</code>. Follow each act sequentially to prove end-to-end platform capabilities.
          </p>
        </div>

        <div className="osm-admin-grid-2">
          {/* Act 1 */}
          <div className="osm-act-card" id="act-card-1">
            <div className="osm-act-header">
              <span className="osm-act-num">ACT 1 OF 4</span>
              <Badge variant="info">EXAMINER WORKFLOW</Badge>
            </div>
            <h3 className="osm-act-title">Examiner Marking & CompleteCheck Validation</h3>
            <p className="osm-act-desc">
              Demonstrates an examiner completing an evaluation workspace. CompleteCheck enforces deterministic pre-submission rules:
              unmarked answers, out-of-bounds scores, and mathematical total mismatches actively block submission until corrected.
            </p>
            <div className="osm-act-footer">
              <span style={{ fontSize: "var(--osm-t-caption)", color: "var(--osm-text-muted)" }}>
                Target Persona: <strong>Dr. Sarah Jenkins (Examiner)</strong>
              </span>
              <Button size="sm" variant="secondary" id="osm-demo-act-1-link" onClick={handleOpenAct1} title="Switch to Dr. Sarah Jenkins and open evaluation workspace">
                Switch to Examiner & Open Script →
              </Button>
            </div>
          </div>

          {/* Act 2 */}
          <div className="osm-act-card" id="act-card-2">
            <div className="osm-act-header">
              <span className="osm-act-num">ACT 2 OF 4</span>
              <Badge variant="info">STATISTICAL INTELLIGENCE</Badge>
            </div>
            <h3 className="osm-act-title">SentinelFlag Anomaly Detection</h3>
            <p className="osm-act-desc">
              SentinelFlag analyzes cohort-wide marks and identifies evaluator drift (e.g. Dr. Adrian Foster deviating +23.2% above cohort baseline).
              Generates an advisory QualitySignal without modifying authoritative evaluation marks (Signal ≠ Decision).
            </p>
            <div className="osm-act-footer">
              <span style={{ fontSize: "var(--osm-t-caption)", color: "var(--osm-text-muted)" }}>
                Target Persona: <strong>Administrator / QA Lead</strong>
              </span>
              <Button size="sm" variant="secondary" id="osm-demo-act-2-link" onClick={handleOpenAct2} title="Switch to Admin and open QualityPulse analytics">
                Switch to Admin & Open QualityPulse →
              </Button>
            </div>
          </div>

          {/* Act 3 */}
          <div className="osm-act-card" id="act-card-3">
            <div className="osm-act-header">
              <span className="osm-act-num">ACT 3 OF 4</span>
              <Badge variant="warning">MODERATION TRIAGE</Badge>
            </div>
            <h3 className="osm-act-title">Triage Investigation & Non-Authoritative AI Advisory</h3>
            <p className="osm-act-desc">
              Chief Moderator investigates the priority-flagged case. AI provides structured, non-authoritative advisory context.
              The moderator assigns the case, records formal rationale, and executes an authoritative human resolution.
            </p>
            <div className="osm-act-footer">
              <span style={{ fontSize: "var(--osm-t-caption)", color: "var(--osm-text-muted)" }}>
                Target Persona: <strong>Prof. Marcus Vance (Chief Moderator)</strong>
              </span>
              <Button size="sm" variant="secondary" id="osm-demo-act-3-link" onClick={handleOpenAct3} title="Switch to Prof. Marcus Vance and open triage workspace">
                Switch to Moderator & Open Hub →
              </Button>
            </div>
          </div>

          {/* Act 4 */}
          <div className="osm-act-card" id="act-card-4">
            <div className="osm-act-header">
              <span className="osm-act-num">ACT 4 OF 4</span>
              <Badge variant="muted">FORENSIC VERIFICATION</Badge>
            </div>
            <h3 className="osm-act-title">TrustLens Audit Ledger & Outbox Verifiability</h3>
            <p className="osm-act-desc">
              Inspects the append-only audit trail and transactional outbox. Proves full chronological traceability:
              evaluator submission, anomaly detection, AI advisory generation, and human resolution with zero data loss.
            </p>
            <div className="osm-act-footer">
              <span style={{ fontSize: "var(--osm-t-caption)", color: "var(--osm-text-muted)" }}>
                Target Persona: <strong>Institutional Auditor (Admin)</strong>
              </span>
              <Button size="sm" variant="secondary" id="osm-demo-act-4-link" onClick={handleOpenAct4} title="Switch to Auditor and inspect TrustLens ledger">
                Switch to Auditor & Open TrustLens →
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Institutional Demonstration Boundary Notice */}
      <Alert
        type="info"
        title="Institutional Demonstration Boundary Notice"
        message="Demo headers (x-demo-user-id, x-demo-role) and the /api/v1/demo/* orchestration endpoints are strictly confined to local development, automated regression testing, and evaluation simulations. In production deployments, authentication is strictly mediated via enterprise identity providers (OIDC / SAML) with hardware MFA."
      />

      {/* 6. Institutional Reset Confirmation Modal */}
      <Modal
        open={showResetModal}
        onClose={() => setShowResetModal(false)}
        title="Confirm Institutional Demo Reset"
        description="High-impact administrative action requiring explicit authorization"
        size="md"
        id="osm-reset-confirm-modal"
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowResetModal(false)}
              id="osm-reset-modal-cancel-btn"
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={isResetting}
              onClick={handleConfirmReset}
              id="osm-reset-modal-confirm-btn"
            >
              Proceed with Reset
            </Button>
          </div>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <p style={{ margin: 0, color: "var(--osm-text-secondary)", lineHeight: "1.6" }}>
            You are about to reset the canonical demonstration scenario for cycle <code>cycle-2026-demo</code>.
          </p>

          <div style={{ backgroundColor: "var(--osm-danger-subtle)", border: "1px solid var(--osm-danger)", borderRadius: "var(--osm-radius-sm)", padding: "0.75rem 1rem" }}>
            <strong style={{ color: "var(--osm-danger)", display: "block", marginBottom: "0.25rem" }}>
              ⚠️ The following demo fixtures will be permanently purged:
            </strong>
            <ul style={{ margin: 0, paddingLeft: "1.25rem", color: "var(--osm-text-primary)", fontSize: "var(--osm-t-metadata)" }}>
              <li>12 canonical evaluation scripts & item-level marks</li>
              <li>Generated SentinelFlag quality signals & supporting evidence</li>
              <li>Open moderation triage cases & assignments</li>
              <li>Recorded moderator resolutions</li>
            </ul>
          </div>

          <div style={{ backgroundColor: "var(--osm-bg-elevated)", border: "1px solid var(--osm-border-subtle)", borderRadius: "var(--osm-radius-sm)", padding: "0.75rem 1rem" }}>
            <strong style={{ color: "var(--osm-text-primary)", display: "block", marginBottom: "0.25rem" }}>
              🛡️ The following data will be preserved:
            </strong>
            <ul style={{ margin: 0, paddingLeft: "1.25rem", color: "var(--osm-text-secondary)", fontSize: "var(--osm-t-metadata)" }}>
              <li>System configuration and database schema</li>
              <li>Append-only audit ledger (appends a permanent <code>RESET_DEMO_SCENARIO</code> event)</li>
            </ul>
          </div>
        </div>
      </Modal>
    </div>
  );
};
