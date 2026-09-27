import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import type {
  TriageCaseResponse,
  QualitySignalResponse,
  ResolutionResponse,
  AiRecommendationResponse,
} from "@osm/shared";
import { TriageCaseStatus, UserRole, AiAssistanceType } from "@osm/shared";
import type { AuthContext } from "../../services/api-client.ts";
import { aiServiceClient } from "../../services/ai-service.ts";
import { getScriptReference } from "../../fixtures/scriptReferences.ts";
import { getActorDisplayName } from "../../services/actor-fixtures.ts";
import { StatusBadge, Button, Alert, Skeleton } from "../ui";

export interface TriageCaseDetailProps {
  triageCase: TriageCaseResponse | null;
  signal: QualitySignalResponse | null;
  resolution: ResolutionResponse | null;
  loading: boolean;
  auth: AuthContext;
  onOpenAssignModal: () => void;
  onOpenResolveModal: () => void;
  onRefreshCase: () => void;
}

export const TriageCaseDetail: React.FC<TriageCaseDetailProps> = ({
  triageCase,
  signal,
  resolution,
  loading,
  auth,
  onOpenAssignModal,
  onOpenResolveModal,
  onRefreshCase,
}) => {
  const [aiAdvisory, setAiAdvisory] = useState<AiRecommendationResponse | null>(null);
  const [loadingAi, setLoadingAi] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    setAiAdvisory(null);
    setAiError(null);
  }, [triageCase?.id]);

  if (!triageCase) {
    return (
      <div className="osm-case-detail-placeholder" id="osm-case-detail-empty">
        <span style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>📋</span>
        <h3 style={{ margin: "0 0 0.5rem 0", color: "var(--osm-text-primary)" }}>
          Select a Moderation Case
        </h3>
        <p style={{ margin: 0, color: "var(--osm-text-muted)", maxWidth: "380px", textAlign: "center" }}>
          Choose a case from the queue to inspect quality signals, evaluate comparative statistical evidence, and record authoritative resolutions.
        </p>
      </div>
    );
  }

  const handleRequestAiAdvisory = async () => {
    if (!triageCase) return;
    setLoadingAi(true);
    setAiError(null);
    try {
      const res = await aiServiceClient.generateAdvisory(
        {
          evaluationId: triageCase.evaluationId,
          triageCaseId: triageCase.id,
          qualitySignalId: triageCase.qualitySignalId,
          assistanceType: AiAssistanceType.SIGNAL_EXPLANATION,
        },
        auth
      );
      setAiAdvisory(res);
    } catch (err: unknown) {
      setAiError(err instanceof Error ? err.message : "Failed to generate AI advisory.");
    } finally {
      setLoadingAi(false);
    }
  };

  const isResolved = triageCase.status === TriageCaseStatus.RESOLVED;
  const isExaminer = auth.role === UserRole.EXAMINER;
  const scriptInfo = getScriptReference(triageCase.evaluationId);
  const persistedOutcome =
    resolution?.outcome || (signal?.evidence?.resolutionOutcome as string | undefined);
  const persistedDismissalReason = signal?.evidence?.dismissalReason as string | undefined;

  const formatDateTime = (isoString?: string | null) => {
    if (!isoString) return "—";
    try {
      return new Date(isoString).toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  // Structured statistical evidence extraction
  const evidence = signal?.evidence as Record<string, unknown> | undefined;
  const hasDeviationMetrics = Boolean(
    evidence &&
    typeof evidence.evaluatorMean === "number" &&
    typeof evidence.peerMean === "number"
  );
  const missingQuestionIds = Array.isArray(evidence?.missingQuestionIds)
    ? (evidence!.missingQuestionIds as string[])
    : null;

  return (
    <div className="osm-case-detail-card" id={`osm-case-detail-${triageCase.id}`}>
      {/* Case Header */}
      <div className="osm-case-detail-header">
        <div>
          <div className="osm-case-detail-title-row">
            <h2 className="osm-case-detail-number" id="detail-case-number">
              {triageCase.caseNumber}
            </h2>
            <StatusBadge status={triageCase.priority} size="md" showDot={false} />
            <StatusBadge status={triageCase.status} size="md" />
            <span className="osm-case-version-chip">v{triageCase.version}</span>
          </div>
          <div className="osm-case-script-banner">
            <span>
              Affected Script: <strong>{scriptInfo.displayRef}</strong> ({scriptInfo.candidateLabel})
            </span>
            <Link
              to={`/examiner/evaluate/${triageCase.evaluationId}`}
              className="osm-case-script-link"
              id="link-inspect-evaluation"
            >
              Inspect Script & Marks →
            </Link>
          </div>
        </div>

        <Button
          variant="secondary"
          size="sm"
          id="btn-refresh-case-detail"
          onClick={onRefreshCase}
          loading={loading}
          title="Refresh case details"
        >
          ↻ Refresh
        </Button>
      </div>

      {/* Case Metadata Grid */}
      <div className="osm-case-meta-grid">
        <div className="osm-case-meta-box">
          <span className="osm-case-meta-label">Assigned Reviewer</span>
          <span className="osm-case-meta-val" id="detail-assignee-text">
            {triageCase.assigneeId ? `👤 ${getActorDisplayName(triageCase.assigneeId)}` : "Unassigned"}
          </span>
        </div>
        <div className="osm-case-meta-box">
          <span className="osm-case-meta-label">Created At</span>
          <span className="osm-case-meta-val">{formatDateTime(triageCase.createdAt)}</span>
        </div>
        <div className="osm-case-meta-box">
          <span className="osm-case-meta-label">Last Updated</span>
          <span className="osm-case-meta-val">{formatDateTime(triageCase.updatedAt)}</span>
        </div>
        <div className="osm-case-meta-box">
          <span className="osm-case-meta-label">Examination Cycle</span>
          <span className="osm-case-meta-val">Spring 2026 Examination</span>
        </div>
      </div>

      {/* Case Notes (if present) */}
      {triageCase.notes && (
        <div className="osm-case-notes-box" id="detail-case-notes">
          <span className="osm-case-notes-heading">Case Notes on File:</span>
          <p className="osm-case-notes-text">{triageCase.notes}</p>
        </div>
      )}

      {/* ====================================================================
          STRUCTURED EVIDENCE CARD (Replaces raw JSON dumps)
          ==================================================================== */}
      <div className="osm-evidence-section" id="detail-quality-signal-section">
        <h3 className="osm-evidence-section-title">
          <span>⚡ Quality Signal Evidence</span>
          {signal && <StatusBadge status={signal.severity} size="sm" showDot={false} />}
        </h3>

        {signal ? (
          <div className="osm-evidence-card" id={`signal-card-${signal.id}`}>
            <div className="osm-evidence-card__header">
              <span className="osm-evidence-type-badge">{signal.signalType}</span>
              <span className="osm-evidence-detector-tag">
                Detector: <strong>{signal.detector.name}</strong> ({signal.detector.type.toLowerCase()} v{signal.detector.version})
              </span>
            </div>

            <p className="osm-evidence-summary" id="signal-summary">
              {signal.summary}
            </p>

            {/* Visual Statistical Comparison Bar (if deviation metrics exist) */}
            {hasDeviationMetrics && evidence && (
              <div className="osm-evidence-comparison-box">
                <span className="osm-evidence-comp-title">
                  Evaluator Scoring Deviation Analysis
                </span>

                <div className="osm-evidence-bars-grid">
                  {/* Evaluator Mean */}
                  <div className="osm-evidence-bar-row">
                    <span className="osm-evidence-bar-label">
                      Evaluator Mean ({getActorDisplayName(String(evidence.evaluatorId))}):
                    </span>
                    <div className="osm-evidence-bar-track">
                      <div
                        className="osm-evidence-bar-fill osm-evidence-bar-fill--evaluator"
                        style={{ width: `${Math.min(100, Number(evidence.evaluatorMean))}%` }}
                      />
                    </div>
                    <strong className="osm-evidence-bar-val osm-mono">
                      {Number(evidence.evaluatorMean).toFixed(1)}%
                    </strong>
                  </div>

                  {/* Peer Cohort Baseline */}
                  <div className="osm-evidence-bar-row">
                    <span className="osm-evidence-bar-label">Peer Cohort Baseline:</span>
                    <div className="osm-evidence-bar-track">
                      <div
                        className="osm-evidence-bar-fill osm-evidence-bar-fill--peer"
                        style={{ width: `${Math.min(100, Number(evidence.peerMean))}%` }}
                      />
                    </div>
                    <strong className="osm-evidence-bar-val osm-mono">
                      {Number(evidence.peerMean).toFixed(1)}%
                    </strong>
                  </div>
                </div>

                <div className="osm-evidence-stats-footer">
                  <span className="osm-evidence-delta-pill">
                    Deviation: <strong>+{Number(evidence.deviation).toFixed(1)}%</strong> above peer baseline
                  </span>
                  <span className="osm-evidence-samples">
                    Sample: N = {String(evidence.sampleSize || 5)} scripts (Cohort N = {String(evidence.peerSampleSize || 6)})
                  </span>
                </div>
              </div>
            )}

            {/* Missing Questions Evidence (if completeness partial) */}
            {missingQuestionIds && missingQuestionIds.length > 0 && (
              <div className="osm-evidence-missing-box">
                <span className="osm-evidence-comp-title">Unmarked Question Details:</span>
                <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                  {missingQuestionIds.map((qId: string) => (
                    <span key={qId} className="osm-evidence-missing-chip">
                      ⚠️ Question ID: <code>{qId}</code> (Missing mark at ingest)
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="osm-evidence-loading">
            <Skeleton variant="rectangle" width="100%" height="120px" />
          </div>
        )}
      </div>

      {/* ====================================================================
          DEDICATED AI ADVISORY CARD (Non-Authoritative)
          ==================================================================== */}
      <div className="osm-ai-advisory-container" id="detail-ai-advisory-section">
        <div className="osm-ai-advisory-header-row">
          <h3 className="osm-ai-advisory-title">
            <span>🤖 AI Advisory Synthesis</span>
            <span className="osm-ai-advisory-badge">NON-AUTHORITATIVE ADVISORY</span>
          </h3>
        </div>

        {aiAdvisory ? (
          <div className="osm-ai-advisory-card" id="ai-advisory-result">
            <div className="osm-ai-advisory-top">
              <div className="osm-ai-model-tag">
                <span className="osm-ai-sparkle">✨</span>
                <strong>{aiAdvisory.model.model}</strong>
                <span className="osm-ai-version">({aiAdvisory.model.provider} v{aiAdvisory.model.version})</span>
              </div>
              <div className="osm-ai-confidence-pill" id="ai-confidence-pill">
                Confidence: {(aiAdvisory.confidence * 100).toFixed(0)}%
              </div>
            </div>

            <div className="osm-ai-advisory-content" id="ai-recommendation-text">
              <span className="osm-ai-label">Advisory Analysis:</span>
              <p className="osm-ai-text">{aiAdvisory.recommendation}</p>
            </div>

            {aiAdvisory.evidenceReferences && aiAdvisory.evidenceReferences.length > 0 && (
              <div className="osm-ai-evidence-refs">
                <span className="osm-ai-label">Evidence References:</span>
                <div className="osm-ai-tags-row">
                  {aiAdvisory.evidenceReferences.map((ref, idx) => (
                    <span key={idx} className="osm-ai-ref-tag">{ref}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="osm-ai-disclaimer" id="ai-advisory-disclaimer">
              <span className="osm-ai-disclaimer-icon">ℹ️</span>
              <p className="osm-ai-disclaimer-text">
                {aiAdvisory.disclaimer ||
                  "AI recommendation is non-authoritative and advisory. Final academic and moderation authority rests exclusively with the authorized human moderator."}
              </p>
            </div>
          </div>
        ) : (
          <div className="osm-ai-prompt-box">
            <p className="osm-ai-prompt-text">
              Generate an on-demand, non-authoritative AI synthesis explaining the statistical anomaly, signal evidence, and relevant rubric context.
            </p>
            {aiError && (
              <div style={{ marginBottom: "1rem" }}>
                <Alert type="danger" message={aiError} />
              </div>
            )}
            <Button
              variant="secondary"
              size="sm"
              id="btn-request-ai-advisory"
              onClick={handleRequestAiAdvisory}
              loading={loadingAi}
              disabled={isExaminer}
            >
              ✨ Request AI Advisory
            </Button>
          </div>
        )}
      </div>

      {/* ====================================================================
          AUTHORITATIVE HUMAN RESOLUTION SECTION
          ==================================================================== */}
      <div className="osm-resolution-container" id="detail-resolution-section">
        <h3 className="osm-resolution-title">⚖️ Authoritative Human Resolution</h3>

        {isResolved ? (
          /* Resolution Receipt (Locked) */
          <div className="osm-resolution-receipt" id="detail-resolution-receipt">
            <div className="osm-resolution-receipt__top">
              <span className="osm-resolution-resolved-badge">✓ CASE FORMALLY RESOLVED</span>
              {persistedOutcome && (
                <StatusBadge status={persistedOutcome} size="md" showDot={false} />
              )}
            </div>

            <div className="osm-resolution-receipt__body">
              <div className="osm-resolution-receipt__row">
                <span className="osm-resolution-receipt__label">Outcome:</span>
                <strong className="osm-resolution-receipt__val osm-resolution-receipt__val--success" id="receipt-outcome">
                  {resolution?.outcome || persistedOutcome}
                </strong>
              </div>

              <div className="osm-resolution-receipt__row">
                <span className="osm-resolution-receipt__label">Authorized Moderator:</span>
                <span className="osm-resolution-receipt__val" id="receipt-moderator">
                  👤 {getActorDisplayName(resolution?.moderatorId || triageCase.assigneeId || "moderator_1")}
                </span>
              </div>

              <div className="osm-resolution-receipt__row">
                <span className="osm-resolution-receipt__label">Substantive Rationale:</span>
                <p className="osm-resolution-receipt__reason" id="receipt-reason">
                  {resolution?.reason || persistedDismissalReason || "Verified compliant with examination marking criteria."}
                </p>
              </div>

              {resolution?.notes && (
                <div className="osm-resolution-receipt__row">
                  <span className="osm-resolution-receipt__label">Internal Notes:</span>
                  <p className="osm-resolution-receipt__notes" id="receipt-notes">{resolution.notes}</p>
                </div>
              )}

              <div className="osm-resolution-receipt__footer">
                <span>
                  Resolved on {formatDateTime(resolution?.createdAt || triageCase.updatedAt)}
                </span>
                <span className="osm-resolution-lock-tag">🔒 Permanent Ledger Record</span>
              </div>
            </div>
          </div>
        ) : (
          /* Pending Resolution Action Boundary */
          <div className="osm-resolution-pending-box">
            <p className="osm-resolution-pending-text">
              This triage case requires an authorized human decision. Automated AI or statistical detectors cannot resolve moderation cases.
            </p>

            {isExaminer ? (
              <Alert
                type="warning"
                title="Read-Only Access"
                message="Your active persona is Examiner. Case resolution requires Moderator or Administrator supervisory authorization."
              />
            ) : (
              <div className="osm-resolution-action-row">
                <Button
                  variant="secondary"
                  size="md"
                  id="btn-open-assign-modal"
                  onClick={onOpenAssignModal}
                >
                  {triageCase.assigneeId ? "Reassign Reviewer" : "Assign Reviewer"}
                </Button>

                <Button
                  variant="primary"
                  size="md"
                  id="btn-open-resolve-modal"
                  onClick={onOpenResolveModal}
                >
                  Resolve Case ➔
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
