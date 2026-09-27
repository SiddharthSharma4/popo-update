/**
 * Evaluator Workspace UI Component.
 * Conforms to:
 * - docs/contracts/10-demo-contract.md §13-17 (Evaluation Opening, Mark Entry, Validation, Submission)
 * - docs/contracts/01-product-contract.md §13 (CompleteCheck Validation)
 * - docs/contracts/05-domain-contract.md §10-18 (Evaluation Aggregate & Mark Invariants)
 * - docs/contracts/06-api-contract.md §22-24 (HTTP Mark Assignment & Submission Endpoints)
 */

import React, { useState, useEffect, useCallback } from "react";
import type { EvaluationResponse, CompletenessValidationResultDto } from "@osm/shared";
import { ActorType } from "@osm/shared";
import { apiClient, type AuthContext, ApiError } from "../../services/api-client.ts";

interface EvaluationWorkspaceProps {
  auth: AuthContext;
}

export const EvaluationWorkspace: React.FC<EvaluationWorkspaceProps> = ({ auth }) => {
  const [evaluationId, setEvaluationId] = useState<string>("eval-demo-incomplete");
  const [evaluation, setEvaluation] = useState<EvaluationResponse | null>(null);
  const [completeness, setCompleteness] = useState<CompletenessValidationResultDto | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [savingMark, setSavingMark] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Local draft marks before sending to server
  const [localMarks, setLocalMarks] = useState<Record<string, { awardedMarks: number | ""; comments: string }>>({});

  const fetchEvaluation = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const data = await apiClient.get<EvaluationResponse>(`/evaluations/${id}`, auth);
      setEvaluation(data);

      // Populate local marks state
      const marksMap: Record<string, { awardedMarks: number | ""; comments: string }> = {};
      for (const q of data.questions) {
        const existingMark = data.marks.find((m) => m.questionId === q.id);
        marksMap[q.id] = {
          awardedMarks: existingMark !== undefined && existingMark.awardedMarks !== null ? existingMark.awardedMarks : "",
          comments: existingMark?.comments || "",
        };
      }
      setLocalMarks(marksMap);

      // Fetch completeness status
      try {
        const check = await apiClient.get<CompletenessValidationResultDto>(`/evaluations/${id}/completeness`, auth);
        setCompleteness(check);
      } catch {
        // Non-blocking if validation check fails
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(`Failed to load evaluation: ${err.message} (${err.code ?? err.statusCode})`);
      } else {
        setError(err instanceof Error ? err.message : "Error loading evaluation");
      }
      setEvaluation(null);
    } finally {
      setLoading(false);
    }
  }, [auth]);

  useEffect(() => {
    fetchEvaluation(evaluationId);
  }, [evaluationId, fetchEvaluation]);

  const handleMarkChange = (questionId: string, value: string) => {
    const num = value === "" ? "" : Number(value);
    setLocalMarks((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        awardedMarks: num,
      },
    }));
  };

  const handleCommentChange = (questionId: string, value: string) => {
    setLocalMarks((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        comments: value,
      },
    }));
  };

  const handleSaveMarks = async (questionId: string) => {
    if (!evaluation) return;
    const markData = localMarks[questionId];
    if (!markData || markData.awardedMarks === "") {
      setError("Please enter a valid numeric mark.");
      return;
    }

    setSavingMark(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const updated = await apiClient.patch<EvaluationResponse>(
        `/evaluations/${evaluation.id}`,
        {
          questionId,
          awardedMarks: Number(markData.awardedMarks),
          comments: markData.comments || "Scored in Evaluator Workspace",
          expectedVersion: evaluation.version,
        },
        auth
      );

      setEvaluation(updated);
      setSuccessMsg(`Mark saved for question ${questionId}. Evaluation updated to version ${updated.version}.`);

      // Re-run completeness validation
      const check = await apiClient.get<CompletenessValidationResultDto>(`/evaluations/${evaluation.id}/completeness`, auth);
      setCompleteness(check);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(`Mark assignment rejected: ${err.message} (${err.code ?? err.statusCode})`);
      } else {
        setError(err instanceof Error ? err.message : "Failed to assign mark");
      }
    } finally {
      setSavingMark(false);
    }
  };

  const handleRunCompletenessCheck = async () => {
    if (!evaluation) return;
    setError(null);
    try {
      const check = await apiClient.get<CompletenessValidationResultDto>(`/evaluations/${evaluation.id}/completeness`, auth);
      setCompleteness(check);
      if (check.isComplete) {
        setSuccessMsg("✓ CompleteCheck passed: All questions have valid marks.");
      } else {
        setError(`CompleteCheck Warning: ${check.unmarkedQuestions} question(s) are missing marks.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run completeness check");
    }
  };

  const handleSubmitEvaluation = async () => {
    if (!evaluation) return;
    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const submitted = await apiClient.post<EvaluationResponse>(
        `/evaluations/${evaluation.id}/submit`,
        { evaluatorId: evaluation.evaluatorId },
        auth
      );

      setEvaluation(submitted);
      setSuccessMsg(
        `✓ Evaluation submitted successfully! Status: ${submitted.status}. Total score: ${submitted.totalScore}/${submitted.maxPossibleScore}. Evaluation is now locked.`
      );

      // Refresh completeness
      const check = await apiClient.get<CompletenessValidationResultDto>(`/evaluations/${evaluation.id}/completeness`, auth);
      setCompleteness(check);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(`Submission error: ${err.message} (${err.code ?? err.statusCode})`);
      } else {
        setError(err instanceof Error ? err.message : "Failed to submit evaluation");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const isSubmitted = evaluation?.status === "SUBMITTED" || evaluation?.status === "FINALIZED";
  const isAiActor = (auth.role as string) === "AI" || auth.actorType === ActorType.AI;

  return (
    <div className="evaluation-workspace-container" id="osm-evaluation-workspace">
      {/* Top Header & Selector */}
      <div className="workspace-header-bar">
        <div className="selector-group">
          <label htmlFor="eval-id-input" className="workspace-label">Evaluation Script ID:</label>
          <div className="input-with-button">
            <input
              id="eval-id-input"
              type="text"
              className="workspace-input"
              value={evaluationId}
              onChange={(e) => setEvaluationId(e.target.value)}
              placeholder="e.g. eval-demo-incomplete"
            />
            <button
              id="btn-load-evaluation"
              className="btn-secondary"
              onClick={() => fetchEvaluation(evaluationId)}
              disabled={loading}
            >
              {loading ? "Loading..." : "Load Script"}
            </button>
          </div>
        </div>

        {/* Quick Select Buttons for Canonical Demo Scripts */}
        <div className="demo-shortcuts">
          <span className="shortcuts-label">Demo Scripts:</span>
          <button
            className={`badge-shortcut ${evaluationId === "eval-demo-incomplete" ? "active" : ""}`}
            onClick={() => setEvaluationId("eval-demo-incomplete")}
          >
            Incomplete (evaluator_1)
          </button>
          <button
            className={`badge-shortcut ${evaluationId === "eval-demo-peer-201" ? "active" : ""}`}
            onClick={() => setEvaluationId("eval-demo-peer-201")}
          >
            Peer Script 201
          </button>
          <button
            className={`badge-shortcut ${evaluationId === "eval-demo-lenient-501" ? "active" : ""}`}
            onClick={() => setEvaluationId("eval-demo-lenient-501")}
          >
            Lenient Script 501
          </button>
        </div>
      </div>

      {/* Role / AI Invariant Banner */}
      {isAiActor && (
        <div className="unauthorized-role-banner" id="banner-ai-evaluation-blocked">
          <span>🚫 AI Non-Authority Invariant (INV-003): AI actors cannot evaluate scripts or enter authoritative marks.</span>
        </div>
      )}

      {/* Error & Success Alerts */}
      {error && (
        <div className="alert-box alert-error" id="osm-workspace-error">
          <span>⚠️ {error}</span>
        </div>
      )}

      {successMsg && (
        <div className="alert-box alert-success" id="osm-workspace-success">
          <span>{successMsg}</span>
        </div>
      )}

      {loading && !evaluation ? (
        <div className="loading-card">
          <p>Loading evaluation script details...</p>
        </div>
      ) : evaluation ? (
        <div className="evaluation-card" id={`eval-card-${evaluation.id}`}>
          {/* Metadata Card */}
          <div className="eval-meta-header">
            <div className="meta-left">
              <div className="title-row">
                <h2 className="eval-title">{evaluation.scriptId}</h2>
                <span className={`status-pill ${isSubmitted ? "pill-resolved" : "pill-open"}`} id="eval-status-badge">
                  {isSubmitted ? "🔒 " + evaluation.status : "📝 " + evaluation.status}
                </span>
                <span className="version-pill" id="eval-version-badge">Version {evaluation.version}</span>
              </div>
              <p className="eval-subtext">
                Cycle: <code>{evaluation.evaluationCycleId}</code> | Evaluator: <code>{evaluation.evaluatorId}</code> | Rubric: <code>{evaluation.rubricId}:v{evaluation.rubricVersion}</code>
              </p>
            </div>

            <div className="score-summary-box">
              <span className="score-label">Total Score</span>
              <span className="score-val" id="eval-total-score">
                {evaluation.totalScore} <span className="score-max">/ {evaluation.maxPossibleScore}</span>
              </span>
            </div>
          </div>

          {/* Locked State Alert */}
          {isSubmitted && (
            <div className="locked-banner" id="eval-locked-banner">
              <span>🔒 <strong>Evaluation is Finalized & Locked:</strong> Submitted evaluations are immutable per domain invariant <code>INV-003</code> and <code>DATA-006</code>. Further mark modification is strictly prohibited.</span>
            </div>
          )}

          {/* CompleteCheck Validation Summary */}
          {completeness && (
            <div className={`completeness-panel ${completeness.isComplete ? "complete" : "incomplete"}`} id="completecheck-summary-panel">
              <div className="completeness-header">
                <strong>CompleteCheck Status:</strong>{" "}
                <span className={completeness.isComplete ? "text-success" : "text-warning"} id="completecheck-status-text">
                  {completeness.isComplete ? "✓ All Questions Marked" : `⚠️ ${completeness.unmarkedQuestions} Question(s) Unmarked`}
                </span>
              </div>

              {completeness.issues.length > 0 && (
                <ul className="completeness-issues-list" id="completecheck-issues-list">
                  {completeness.issues.map((issue, idx) => (
                    <li key={idx} className="issue-item">
                      <strong>[{issue.severity}]</strong> {issue.message} (Question ID: <code>{issue.questionId}</code>)
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Questions & Marking Grid */}
          <div className="questions-grid">
            <h3 className="section-title">Evaluation Questions & Criteria</h3>

            {evaluation.questions.map((q) => {
              const currentLocal = localMarks[q.id] || { awardedMarks: "", comments: "" };
              const existingMark = evaluation.marks.find((m) => m.questionId === q.id);
              const isMarked = existingMark !== undefined;

              return (
                <div key={q.id} className={`question-card ${isMarked ? "marked" : "unmarked"}`} id={`question-card-${q.id}`}>
                  <div className="question-header">
                    <div>
                      <span className="question-number-badge">{q.questionNumber}</span>
                      <span className="question-criteria-tag">Criteria: {q.rubricCriteriaId || "Default"}</span>
                    </div>
                    <span className="max-marks-pill">Max Marks: {q.maxMarks}</span>
                  </div>

                  <p className="question-text">{q.text}</p>

                  <div className="marking-controls">
                    <div className="input-col">
                      <label htmlFor={`mark-input-${q.id}`} className="field-label">Awarded Mark (0 – {q.maxMarks}):</label>
                      <input
                        id={`mark-input-${q.id}`}
                        type="number"
                        min="0"
                        max={q.maxMarks}
                        step="1"
                        className="mark-input"
                        value={currentLocal.awardedMarks}
                        onChange={(e) => handleMarkChange(q.id, e.target.value)}
                        disabled={isSubmitted || isAiActor}
                        placeholder={`0 - ${q.maxMarks}`}
                      />
                    </div>

                    <div className="input-col comment-col">
                      <label htmlFor={`comment-input-${q.id}`} className="field-label">Evaluator Annotation / Comments:</label>
                      <input
                        id={`comment-input-${q.id}`}
                        type="text"
                        className="comment-input"
                        value={currentLocal.comments}
                        onChange={(e) => handleCommentChange(q.id, e.target.value)}
                        disabled={isSubmitted || isAiActor}
                        placeholder="Rationale for awarded mark..."
                      />
                    </div>

                    {!isSubmitted && (
                      <button
                        id={`btn-save-mark-${q.id}`}
                        className="btn-secondary btn-save"
                        onClick={() => handleSaveMarks(q.id)}
                        disabled={savingMark || isAiActor}
                      >
                        {savingMark ? "Saving..." : "Save Mark"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Footer */}
          <div className="workspace-footer-actions">
            <button
              id="btn-validate-completecheck"
              className="btn-secondary"
              onClick={handleRunCompletenessCheck}
              disabled={loading || isAiActor}
            >
              🔍 Validate CompleteCheck
            </button>

            {!isSubmitted && (
              <button
                id="btn-submit-evaluation"
                className="btn-primary"
                onClick={handleSubmitEvaluation}
                disabled={submitting || isAiActor}
              >
                {submitting ? "Submitting..." : "Submit Evaluation ➔"}
              </button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};
