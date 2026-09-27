import React, { useState, useEffect } from "react";
import type { TriageCaseResponse, QualitySignalResponse, ResolutionResponse, AiRecommendationResponse } from "@osm/shared";
import { TriageCaseStatus, SignalSeverity, UserRole, AiAssistanceType } from "@osm/shared";
import type { AuthContext } from "../../services/api-client.ts";
import { aiServiceClient } from "../../services/ai-service.ts";

interface TriageCaseDetailProps {
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
  if (!triageCase) {
    return (
      <div className="case-detail-placeholder" id="osm-case-detail-empty">
        <div className="placeholder-content">
          <span className="placeholder-icon">📋</span>
          <h3>Select a Moderation Case</h3>
          <p>Choose a case from the queue to inspect signals, review evidence, and record resolutions.</p>
        </div>
      </div>
    );
  }

  const [aiAdvisory, setAiAdvisory] = useState<AiRecommendationResponse | null>(null);
  const [loadingAi, setLoadingAi] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    setAiAdvisory(null);
    setAiError(null);
  }, [triageCase?.id]);

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
    } catch (err: any) {
      setAiError(err.message || "Failed to generate AI advisory.");
    } finally {
      setLoadingAi(false);
    }
  };

  const isResolved = triageCase.status === TriageCaseStatus.RESOLVED;
  const isExaminer = auth.role === UserRole.EXAMINER;
  const persistedOutcome = resolution?.outcome || (signal?.evidence?.resolutionOutcome as string | undefined);
  const persistedDismissalReason = signal?.evidence?.dismissalReason as string | undefined;

  const getPriorityClass = (priority: string) => {
    switch (priority) {
      case SignalSeverity.CRITICAL:
        return "badge-critical";
      case SignalSeverity.HIGH:
        return "badge-high";
      case SignalSeverity.MEDIUM:
        return "badge-medium";
      case SignalSeverity.LOW:
        return "badge-low";
      default:
        return "badge-info";
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case TriageCaseStatus.OPEN:
        return "pill-open";
      case TriageCaseStatus.ASSIGNED:
        return "pill-assigned";
      case TriageCaseStatus.RESOLVED:
        return "pill-resolved";
      default:
        return "pill-default";
    }
  };

  return (
    <div className="case-detail-card" id={`osm-case-detail-${triageCase.id}`}>
      {/* Case Header */}
      <div className="case-detail-header">
        <div>
          <div className="detail-title-row">
            <h2 className="detail-case-number" id="detail-case-number">{triageCase.caseNumber}</h2>
            <span className={`status-pill ${getStatusClass(triageCase.status)}`} id="detail-case-status">
              {triageCase.status}
            </span>
            <span className={`priority-badge ${getPriorityClass(triageCase.priority)}`} id="detail-case-priority">
              {triageCase.priority}
            </span>
            <span className="version-pill" id="detail-case-version" title="Optimistic Concurrency Version">
              Version {triageCase.version}
            </span>
          </div>
          <p className="detail-eval-id">
            Evaluation ID: <code>{triageCase.evaluationId}</code> | Cycle: <code>{triageCase.evaluationCycleId}</code>
          </p>
        </div>

        <button
          className="btn-secondary btn-sm"
          id="btn-refresh-case-detail"
          onClick={onRefreshCase}
          disabled={loading}
          title="Refresh case details"
        >
          {loading ? "..." : "↻ Refresh"}
        </button>
      </div>

      {/* Case Meta Grid */}
      <div className="case-metadata-grid">
        <div className="meta-box">
          <span className="meta-label">Assignee</span>
          <span className="meta-val" id="detail-assignee-text">
            {triageCase.assigneeId ? `👤 ${triageCase.assigneeId}` : "Unassigned"}
          </span>
        </div>
        <div className="meta-box">
          <span className="meta-label">Created At</span>
          <span className="meta-val">{new Date(triageCase.createdAt).toLocaleString()}</span>
        </div>
        <div className="meta-box">
          <span className="meta-label">Last Updated</span>
          <span className="meta-val">{new Date(triageCase.updatedAt).toLocaleString()}</span>
        </div>
      </div>

      {/* Case Notes */}
      {triageCase.notes && (
        <div className="notes-box" id="detail-case-notes">
          <span className="notes-heading">Case Notes:</span>
          <p className="notes-text">{triageCase.notes}</p>
        </div>
      )}

      {/* Linked Quality Signal Evidence Card */}
      <div className="evidence-section" id="detail-quality-signal-section">
        <h3 className="section-title">
          <span>⚡ Linked QualitySignal Evidence</span>
          {signal && <span className="signal-severity-tag">{signal.severity}</span>}
        </h3>

        {signal ? (
          <div className="signal-evidence-card" id={`signal-card-${signal.id}`}>
            <div className="signal-type-row">
              <span className="signal-type-badge">{signal.signalType}</span>
              <span className="signal-provenance">
                Detector: <strong>{signal.detector.name}</strong> ({signal.detector.type} v{signal.detector.version})
              </span>
            </div>

            <p className="signal-summary-text" id="signal-summary">{signal.summary}</p>

            {/* Evidence Payload Metrics */}
            <div className="evidence-metrics-container" id="signal-evidence-metrics">
              <span className="metrics-header">// Structured Detector Evidence:</span>
              <div className="evidence-grid">
                {Object.entries(signal.evidence).map(([key, value]) => (
                  <div key={key} className="evidence-item">
                    <span className="evidence-key">{key}:</span>
                    <span className="evidence-val">
                      {typeof value === "object" ? JSON.stringify(value) : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="signal-loading-placeholder">
            <p>Signal ID: <code>{triageCase.qualitySignalId}</code> (loading signal details...)</p>
          </div>
        )}
      </div>

      {/* AI Advisory Assistance Section (Non-Authoritative) */}
      <div className="ai-advisory-section" id="detail-ai-advisory-section">
        <div className="section-title-row">
          <h3 className="section-title">🤖 AI Advisory Insight</h3>
          <span className="ai-advisory-badge">NON-AUTHORITATIVE</span>
        </div>

        {aiAdvisory ? (
          <div className="ai-advisory-card" id="ai-advisory-result">
            <div className="ai-advisory-header">
              <div className="ai-model-tag">
                <span className="ai-icon">✨</span>
                <strong>{aiAdvisory.model.model}</strong>
                <span className="ai-version">({aiAdvisory.model.provider} v{aiAdvisory.model.version})</span>
              </div>
              <div className="ai-confidence-pill" id="ai-confidence-pill">
                Confidence: {(aiAdvisory.confidence * 100).toFixed(0)}%
              </div>
            </div>

            <div className="ai-recommendation-content" id="ai-recommendation-text">
              <span className="ai-label">Advisory Analysis:</span>
              <p>{aiAdvisory.recommendation}</p>
            </div>

            {aiAdvisory.evidenceReferences && aiAdvisory.evidenceReferences.length > 0 && (
              <div className="ai-evidence-refs">
                <span className="ai-label">Evidence References:</span>
                <div className="evidence-tags-row">
                  {aiAdvisory.evidenceReferences.map((ref, idx) => (
                    <span key={idx} className="evidence-ref-tag">{ref}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="ai-disclaimer-box" id="ai-advisory-disclaimer">
              <span className="disclaimer-icon">⚠️</span>
              <p className="disclaimer-text">
                {aiAdvisory.disclaimer ||
                  "AI recommendation is strictly advisory (INV-003, INV-004). Final academic and moderation authority rests exclusively with the authorized human moderator."}
              </p>
            </div>
          </div>
        ) : (
          <div className="ai-advisory-prompt-box">
            <p className="prompt-text">
              Generate an on-demand, non-authoritative AI synthesis explaining the statistical anomaly, signal evidence, and relevant rubric context.
            </p>
            {aiError && (
              <div className="alert-banner alert-error" style={{ marginBottom: "1rem" }}>
                <span>⚠️ {aiError}</span>
              </div>
            )}
            <button
              id="btn-request-ai-advisory"
              className="btn-secondary"
              onClick={handleRequestAiAdvisory}
              disabled={loadingAi || isExaminer}
            >
              {loadingAi ? "Generating Advisory..." : "✨ Request AI Advisory"}
            </button>
          </div>
        )}
      </div>

      {/* Resolution Status / Action Boundary */}
      <div className="resolution-section" id="detail-resolution-section">
        <h3 className="section-title">⚖️ Human Resolution</h3>

        {isResolved ? (
          <div className="resolution-receipt-box" id="detail-resolution-receipt">
            <div className="receipt-header">
              <span className="resolved-check-badge">✓ CASE RESOLVED</span>
              {persistedOutcome && <span className="outcome-pill" id="receipt-outcome-pill">{persistedOutcome}</span>}
            </div>

            {resolution ? (
              <div className="receipt-body">
                <div className="receipt-row">
                  <span className="receipt-label">Outcome:</span>
                  <strong className="text-success" id="receipt-outcome">{resolution.outcome}</strong>
                </div>
                <div className="receipt-row">
                  <span className="receipt-label">Moderator:</span>
                  <span id="receipt-moderator">👤 {resolution.moderatorId}</span>
                </div>
                <div className="receipt-row">
                  <span className="receipt-label">Reason:</span>
                  <p className="receipt-reason" id="receipt-reason">{resolution.reason}</p>
                </div>
                {resolution.notes && (
                  <div className="receipt-row">
                    <span className="receipt-label">Notes:</span>
                    <p className="receipt-notes" id="receipt-notes">{resolution.notes}</p>
                  </div>
                )}
                {resolution.evidenceReferences && resolution.evidenceReferences.length > 0 && (
                  <div className="receipt-row">
                    <span className="receipt-label">Evidence Refs:</span>
                    <span className="receipt-refs">
                      {resolution.evidenceReferences.join(", ")}
                    </span>
                  </div>
                )}
                <div className="receipt-footer">
                  <span>Resolved on {new Date(resolution.createdAt).toLocaleString()}</span>
                  <span className="immutable-tag">Immutable State</span>
                </div>
              </div>
            ) : (
              <div className="receipt-body">
                {persistedOutcome && (
                  <div className="receipt-row">
                    <span className="receipt-label">Persisted Outcome:</span>
                    <strong className="text-success" id="receipt-outcome-persisted">{persistedOutcome}</strong>
                  </div>
                )}
                {persistedDismissalReason && (
                  <div className="receipt-row">
                    <span className="receipt-label">Dismissal Reason:</span>
                    <p className="receipt-reason" id="receipt-dismissal-persisted">{persistedDismissalReason}</p>
                  </div>
                )}
                <p className="terminal-state-text">
                  This case is in terminal state <code>RESOLVED</code>. Further resolution or reassignment is prohibited.
                </p>
                <div className="receipt-footer">
                  <span className="immutable-tag">Immutable State</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="pending-resolution-box">
            <p className="pending-text">
              This triage case requires an authorized human decision. Automated AI or statistical detectors
              cannot resolve moderation cases (<code>INV-003</code>, <code>INV-004</code>).
            </p>

            {isExaminer ? (
              <div className="unauthorized-role-banner" id="banner-examiner-readonly">
                <span>⚠️ Read-Only View: Current role is EXAMINER. Only MODERATOR or ADMIN can resolve cases.</span>
              </div>
            ) : (
              <div className="action-buttons-row">
                <button
                  id="btn-open-assign-modal"
                  className="btn-secondary"
                  onClick={onOpenAssignModal}
                >
                  {triageCase.assigneeId ? "Reassign Case" : "Assign Case"}
                </button>

                <button
                  id="btn-open-resolve-modal"
                  className="btn-primary"
                  onClick={onOpenResolveModal}
                >
                  Resolve Case ➔
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
