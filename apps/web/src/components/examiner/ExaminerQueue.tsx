import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import type { EvaluationResponse } from "@osm/shared";
import { EvaluationStatus } from "@osm/shared";
import type { AuthContext } from "../../services/api-client.ts";
import { evaluationService } from "../../services/evaluation-service.ts";
import { getScriptReference } from "../../fixtures/scriptReferences.ts";
import { getActorDisplayName } from "../../services/actor-fixtures.ts";
import { Card, StatusBadge, Button, Input, Skeleton, EmptyState, Alert } from "../ui";

export interface ExaminerQueueProps {
  auth: AuthContext;
}

export const ExaminerQueue: React.FC<ExaminerQueueProps> = ({ auth }) => {
  const [evaluations, setEvaluations] = useState<EvaluationResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const loadEvaluations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await evaluationService.listEvaluations(
        { evaluatorId: auth.actorId },
        auth
      );
      setEvaluations(response.items || []);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to retrieve assigned examination scripts from the examination server."
      );
    } finally {
      setLoading(false);
    }
  }, [auth]);

  useEffect(() => {
    loadEvaluations();
  }, [loadEvaluations]);

  // Client-side filtering
  const filteredEvaluations = useMemo(() => {
    return evaluations.filter((ev) => {
      const scriptInfo = getScriptReference(ev.scriptId);

      // Status filter
      if (statusFilter !== "ALL" && ev.status !== statusFilter) {
        return false;
      }

      // Search query (matches displayRef, candidateLabel, or subject)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesRef = scriptInfo.displayRef.toLowerCase().includes(query);
        const matchesCandidate = scriptInfo.candidateLabel.toLowerCase().includes(query);
        const matchesSubject = scriptInfo.subject.toLowerCase().includes(query);
        const matchesId = ev.id.toLowerCase().includes(query);
        return matchesRef || matchesCandidate || matchesSubject || matchesId;
      }

      return true;
    });
  }, [evaluations, statusFilter, searchQuery]);

  // Aggregate queue metrics
  const totalAssigned = evaluations.length;
  const inProgressCount = evaluations.filter((e) => e.status === EvaluationStatus.IN_PROGRESS).length;
  const submittedCount = evaluations.filter((e) => e.status === EvaluationStatus.SUBMITTED).length;

  const totalQuestions = evaluations.reduce((sum, e) => sum + (e.questions?.length || 0), 0);
  const totalMarkedQuestions = evaluations.reduce((sum, e) => sum + (e.marks?.length || 0), 0);
  const completionPercentage =
    totalQuestions > 0 ? Math.round((totalMarkedQuestions / totalQuestions) * 100) : 0;

  const formatRelativeTime = (isoString?: string) => {
    if (!isoString) return "—";
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="osm-queue-page" id="osm-examiner-queue">
      {/* Page Header */}
      <div className="osm-queue-header">
        <div>
          <h1 className="osm-queue-title">My Scripts — Spring 2026 Cycle</h1>
          <p className="osm-queue-subtitle">
            Examination marking allocation for <strong>{getActorDisplayName(auth.actorId)}</strong>.
            Review student responses against rubric descriptors, enter question marks, and verify completeness prior to submission.
          </p>
        </div>

        <div className="osm-queue-header__actions">
          <Button
            variant="secondary"
            size="sm"
            onClick={loadEvaluations}
            loading={loading}
            id="btn-refresh-queue"
          >
            ↻ Refresh Queue
          </Button>
        </div>
      </div>

      {/* Summary Metrics Strip */}
      <div className="osm-queue-metrics" id="osm-queue-metrics">
        <div className="osm-queue-metric-card">
          <span className="osm-queue-metric-card__label">Assigned Scripts</span>
          <span className="osm-queue-metric-card__value">{loading ? "..." : totalAssigned}</span>
          <span className="osm-queue-metric-card__sub">Spring 2026 allocation</span>
        </div>

        <div className="osm-queue-metric-card">
          <span className="osm-queue-metric-card__label">In Progress</span>
          <span className="osm-queue-metric-card__value osm-queue-metric-card__value--amber">
            {loading ? "..." : inProgressCount}
          </span>
          <span className="osm-queue-metric-card__sub">Awaiting mark completion</span>
        </div>

        <div className="osm-queue-metric-card">
          <span className="osm-queue-metric-card__label">Submitted & Locked</span>
          <span className="osm-queue-metric-card__value osm-queue-metric-card__value--green">
            {loading ? "..." : submittedCount}
          </span>
          <span className="osm-queue-metric-card__sub">CompleteCheck verified</span>
        </div>

        <div className="osm-queue-metric-card">
          <span className="osm-queue-metric-card__label">Marking Progress</span>
          <span className="osm-queue-metric-card__value">
            {loading ? "..." : `${completionPercentage}%`}
          </span>
          <span className="osm-queue-metric-card__sub">
            {totalMarkedQuestions} of {totalQuestions} questions marked
          </span>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div style={{ marginBottom: "1.5rem" }}>
          <Alert
            type="danger"
            title="Queue Synchronization Error"
            message={error}
            action={
              <Button variant="danger" size="sm" onClick={loadEvaluations}>
                Retry
              </Button>
            }
          />
        </div>
      )}

      {/* Main Table Card */}
      <Card padding="none">
        {/* Filter Toolbar */}
        <div className="osm-queue-toolbar" id="osm-queue-toolbar">
          <div className="osm-queue-toolbar__search">
            <Input
              id="input-search-queue"
              placeholder="Search by script reference, candidate, or module..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="osm-queue-search-input"
            />
          </div>

          <div className="osm-queue-toolbar__filters">
            <label htmlFor="select-status-filter" className="osm-queue-toolbar__filter-label">
              Status:
            </label>
            <select
              id="select-status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="osm-queue-filter-select"
            >
              <option value="ALL">All Statuses ({totalAssigned})</option>
              <option value={EvaluationStatus.IN_PROGRESS}>In Progress ({inProgressCount})</option>
              <option value={EvaluationStatus.SUBMITTED}>Submitted ({submittedCount})</option>
            </select>
          </div>
        </div>

        {/* Operational Table */}
        <div className="osm-queue-table-wrapper">
          <table className="osm-queue-table" id="table-examiner-queue">
            <thead>
              <tr>
                <th scope="col" style={{ width: "26%" }}>Script Reference</th>
                <th scope="col" style={{ width: "14%" }}>Status</th>
                <th scope="col" style={{ width: "16%" }}>Questions Marked</th>
                <th scope="col" style={{ width: "12%" }}>Total Score</th>
                <th scope="col" style={{ width: "16%" }}>Attention / State</th>
                <th scope="col" style={{ width: "16%" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                // 5 Skeleton Loading Rows
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`skeleton-${i}`}>
                    <td>
                      <Skeleton variant="text" width="140px" height="18px" />
                      <Skeleton variant="text" width="180px" height="12px" />
                    </td>
                    <td><Skeleton variant="rectangle" width="90px" height="24px" /></td>
                    <td><Skeleton variant="text" width="80px" height="16px" /></td>
                    <td><Skeleton variant="text" width="70px" height="16px" /></td>
                    <td><Skeleton variant="text" width="120px" height="14px" /></td>
                    <td><Skeleton variant="rectangle" width="100px" height="32px" /></td>
                  </tr>
                ))
              ) : filteredEvaluations.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: "3rem 1.5rem" }}>
                    <EmptyState
                      icon="📋"
                      title={
                        searchQuery || statusFilter !== "ALL"
                          ? "No scripts match your filter criteria"
                          : "No examination scripts assigned"
                      }
                      description={
                        searchQuery || statusFilter !== "ALL"
                          ? "Try clearing your search query or setting the status filter back to 'All Statuses'."
                          : "No scripts are currently assigned to your queue for this examination cycle. Contact your examination administrator if allocations are pending."
                      }
                      action={
                        searchQuery || statusFilter !== "ALL" ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setSearchQuery("");
                              setStatusFilter("ALL");
                            }}
                          >
                            Clear Filters
                          </Button>
                        ) : undefined
                      }
                    />
                  </td>
                </tr>
              ) : (
                filteredEvaluations.map((evaluation) => {
                  const scriptInfo = getScriptReference(evaluation.scriptId);
                  const questionsCount = evaluation.questions?.length || 0;
                  const marksCount = evaluation.marks?.length || 0;
                  const isSubmitted = evaluation.status === EvaluationStatus.SUBMITTED;
                  const isAllMarked = questionsCount > 0 && marksCount >= questionsCount;
                  const unmarkedCount = Math.max(0, questionsCount - marksCount);

                  return (
                    <tr key={evaluation.id} className="osm-queue-row" id={`row-${evaluation.id}`}>
                      {/* Script Reference */}
                      <td>
                        <div className="osm-queue-script-cell">
                          <span className="osm-queue-script-ref">{scriptInfo.displayRef}</span>
                          <span className="osm-queue-script-sub">
                            {scriptInfo.candidateLabel} · {scriptInfo.subject}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td>
                        <StatusBadge status={evaluation.status} />
                      </td>

                      {/* Questions Marked & Progress */}
                      <td>
                        <div className="osm-queue-progress-cell">
                          <span className="osm-queue-progress-text">
                            <strong>{marksCount}</strong> / {questionsCount}
                          </span>
                          <div className="osm-queue-progress-track">
                            <div
                              className="osm-queue-progress-bar"
                              style={{
                                width: `${questionsCount > 0 ? (marksCount / questionsCount) * 100 : 0}%`,
                                backgroundColor: isSubmitted
                                  ? "var(--osm-success)"
                                  : isAllMarked
                                  ? "var(--osm-info)"
                                  : "var(--osm-warning)",
                              }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Total Score */}
                      <td>
                        <span className="osm-queue-score">
                          {marksCount > 0 ? (
                            <>
                              <strong>{evaluation.totalScore}</strong> / {evaluation.maxPossibleScore} pts
                            </>
                          ) : (
                            <span style={{ color: "var(--osm-text-muted)" }}>— / {evaluation.maxPossibleScore}</span>
                          )}
                        </span>
                      </td>

                      {/* Attention / Quality State */}
                      <td>
                        {isSubmitted ? (
                          <span className="osm-queue-attention osm-queue-attention--submitted">
                            ✓ Submitted & Locked
                          </span>
                        ) : !isAllMarked ? (
                          <span className="osm-queue-attention osm-queue-attention--pending">
                            ⚠️ {unmarkedCount} question{unmarkedCount > 1 ? "s" : ""} pending mark
                          </span>
                        ) : (
                          <span className="osm-queue-attention osm-queue-attention--ready">
                            Ready for CompleteCheck
                          </span>
                        )}
                        <span className="osm-queue-updated-at">
                          Updated {formatRelativeTime(evaluation.updatedAt)}
                        </span>
                      </td>

                      {/* Action */}
                      <td>
                        <Link
                          to={`/examiner/evaluate/${evaluation.id}`}
                          className={`osm-btn osm-btn--sm ${
                            isSubmitted ? "osm-btn--secondary" : "osm-btn--primary"
                          }`}
                          id={`btn-open-eval-${evaluation.id}`}
                          style={{ textDecoration: "none", whiteSpace: "nowrap" }}
                        >
                          {isSubmitted ? "View Evaluation →" : "Mark Script →"}
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
