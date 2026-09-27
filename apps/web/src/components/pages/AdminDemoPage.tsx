import React, { useState } from "react";
import type { AuthContext } from "../../services/api-client.ts";
import { demoService } from "../../services/demo-service.ts";
import { Card, Alert, Button } from "../ui";

export interface AdminDemoPageProps {
  auth: AuthContext;
}

export const AdminDemoPage: React.FC<AdminDemoPageProps> = ({ auth }) => {
  const [isSeeding, setIsSeeding] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "danger"; text: string } | null>(null);

  const handleSeedDemo = async () => {
    setIsSeeding(true);
    setFeedback(null);
    try {
      const res = await demoService.seedDemoCohort(auth);
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

  const handleResetDemo = async () => {
    if (!window.confirm("Are you sure you want to reset the canonical demo scenario? All canonical demo evaluations, signals, triage cases, and resolutions will be removed.")) {
      return;
    }
    setIsResetting(true);
    setFeedback(null);
    try {
      const res = await demoService.resetDemoCohort(auth);
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

  return (
    <div className="admin-demo-container" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <Card
        title="Admin Demo Controls & Orchestration"
        subtitle="Deterministic multi-actor examination cycle orchestration (Golden Path Demo)"
        padding="lg"
      >
        <p style={{ color: "var(--osm-text-secondary)", marginBottom: "1.5rem", lineHeight: "1.6" }}>
          Use these administrative controls to orchestrate the deterministic examination demonstration dataset.
          Seeding provisions the canonical Spring 2026 examination cohort (12 evaluations, 4 evaluators, active drift signals,
          and triage cases). Resetting purges all demo fixtures to return the database to a clean foundation baseline.
        </p>

        {feedback && (
          <div style={{ marginBottom: "1.5rem" }}>
            <Alert
              type={feedback.type}
              message={feedback.text}
              dismissible
              onDismiss={() => setFeedback(null)}
            />
          </div>
        )}

        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <Button
            variant="primary"
            size="md"
            loading={isSeeding}
            disabled={isResetting}
            onClick={handleSeedDemo}
          >
            ⚡ Seed Deterministic Demo Cohort
          </Button>

          <Button
            variant="danger"
            size="md"
            loading={isResetting}
            disabled={isSeeding}
            onClick={handleResetDemo}
          >
            🔄 Reset Demo Scenario
          </Button>
        </div>
      </Card>
    </div>
  );
};
