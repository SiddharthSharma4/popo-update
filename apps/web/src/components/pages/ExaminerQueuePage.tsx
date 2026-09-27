import React from "react";
import { Link } from "react-router-dom";
import type { AuthContext } from "../../services/api-client.ts";
import { Card, Badge } from "../ui";

export interface ExaminerQueuePageProps {
  auth: AuthContext;
}

export const ExaminerQueuePage: React.FC<ExaminerQueuePageProps> = ({ auth }) => {
  return (
    <div className="examiner-queue-container" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <Card
        title="Script Evaluation Queue"
        subtitle={`Signed in as ${auth.actorId} (Examiner)`}
        action={<Badge variant="info">EXAMINER WORKSPACE</Badge>}
        padding="lg"
      >
        <p style={{ color: "var(--osm-text-secondary)", marginBottom: "1.5rem", lineHeight: "1.6" }}>
          Welcome to your examination script evaluation queue. Scripts assigned to your marking allocation are
          listed below. Open an evaluation to begin or resume marking student responses against the approved marking rubric.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1rem" }}>
          <Card
            elevated
            title="Script #0101 (OSM-2026-CS101-0101)"
            subtitle="CS-101: Systems & Algorithms · In Progress"
            padding="md"
            footer={
              <Link
                to="/examiner/evaluate/eval-demo-incomplete"
                className="osm-btn osm-btn--primary osm-btn--md"
                style={{ textDecoration: "none" }}
              >
                Open Evaluation Workspace →
              </Link>
            }
          >
            <div style={{ fontSize: "0.875rem", color: "var(--osm-text-secondary)", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <div><strong>Status:</strong> IN_PROGRESS (2 of 3 questions marked)</div>
              <div><strong>Evaluation ID:</strong> <code>eval-demo-incomplete</code></div>
              <div><strong>Completeness:</strong> 1 question missing marks (CompleteCheck active)</div>
            </div>
          </Card>
        </div>

        <div
          style={{
            marginTop: "1.5rem",
            padding: "0.75rem 1rem",
            borderRadius: "var(--osm-radius-md)",
            backgroundColor: "var(--osm-bg-elevated)",
            border: "1px solid var(--osm-border-subtle)",
            fontSize: "0.8125rem",
            color: "var(--osm-text-muted)",
          }}
        >
          ℹ️ <strong>Roadmap Note:</strong> The comprehensive multi-script table with status badges and filter controls will be implemented in <strong>FE-010</strong>.
        </div>
      </Card>
    </div>
  );
};
