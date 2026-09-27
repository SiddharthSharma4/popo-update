import React from "react";
import type { TriageCaseResponse } from "@osm/shared";
import { TriageCaseStatus, SignalSeverity } from "@osm/shared";
import { getScriptReference } from "../../fixtures/scriptReferences.ts";
import { getActorDisplayName } from "../../services/actor-fixtures.ts";
import { StatusBadge, Input, Skeleton, EmptyState } from "../ui";

export interface TriageQueueProps {
  cases: TriageCaseResponse[];
  selectedCaseId: string | null;
  onSelectCase: (caseId: string) => void;
  loading: boolean;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  priorityFilter: string;
  onPriorityFilterChange: (priority: string) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onRefresh: () => void;
}

export const TriageQueue: React.FC<TriageQueueProps> = ({
  cases,
  selectedCaseId,
  onSelectCase,
  loading,
  statusFilter,
  onStatusFilterChange,
  priorityFilter,
  onPriorityFilterChange,
  searchQuery,
  onSearchQueryChange,
  onRefresh,
}) => {
  // Compute summary stats
  const totalCount = cases.length;
  const openCount = cases.filter((c) => c.status === TriageCaseStatus.OPEN).length;
  const assignedCount = cases.filter((c) => c.status === TriageCaseStatus.ASSIGNED).length;
  const resolvedCount = cases.filter((c) => c.status === TriageCaseStatus.RESOLVED).length;
  const highOrCriticalCount = cases.filter(
    (c) => c.priority === SignalSeverity.CRITICAL || c.priority === SignalSeverity.HIGH
  ).length;

  // Filter cases in-memory for immediate responsiveness
  const filteredCases = cases.filter((c) => {
    if (statusFilter !== "ALL" && c.status !== statusFilter) return false;
    if (priorityFilter !== "ALL" && c.priority !== priorityFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchNumber = c.caseNumber.toLowerCase().includes(q);
      const matchEval = c.evaluationId.toLowerCase().includes(q);
      const matchAssignee = c.assigneeId?.toLowerCase().includes(q);
      const scriptInfo = getScriptReference(c.evaluationId);
      const matchScriptRef = scriptInfo.displayRef.toLowerCase().includes(q);
      const matchCandidate = scriptInfo.candidateLabel.toLowerCase().includes(q);
      if (!matchNumber && !matchEval && !matchAssignee && !matchScriptRef && !matchCandidate) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="osm-triage-queue-card" id="osm-triage-queue">
      {/* Metric Counters Strip */}
      <div className="osm-triage-metrics" id="osm-queue-metrics">
        <div className="osm-triage-metric">
          <span className="osm-triage-metric__label">Total Cases</span>
          <span className="osm-triage-metric__val" id="metric-total-cases">{totalCount}</span>
        </div>
        <div className="osm-triage-metric">
          <span className="osm-triage-metric__label">Open</span>
          <span className="osm-triage-metric__val osm-triage-metric__val--warning" id="metric-open-cases">
            {openCount}
          </span>
        </div>
        <div className="osm-triage-metric">
          <span className="osm-triage-metric__label">Assigned</span>
          <span className="osm-triage-metric__val osm-triage-metric__val--info" id="metric-assigned-cases">
            {assignedCount}
          </span>
        </div>
        <div className="osm-triage-metric">
          <span className="osm-triage-metric__label">Resolved</span>
          <span className="osm-triage-metric__val osm-triage-metric__val--success" id="metric-resolved-cases">
            {resolvedCount}
          </span>
        </div>
        <div className="osm-triage-metric">
          <span className="osm-triage-metric__label">High Priority</span>
          <span className="osm-triage-metric__val osm-triage-metric__val--danger" id="metric-critical-cases">
            {highOrCriticalCount}
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="osm-triage-toolbar">
        <div className="osm-triage-search">
          <Input
            id="search-cases-input"
            placeholder="Search case, candidate, or reviewer..."
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
          />
        </div>

        <div className="osm-triage-filters-row">
          <div className="osm-triage-select-group">
            <label htmlFor="filter-case-status" className="osm-triage-label">Status:</label>
            <select
              id="filter-case-status"
              className="osm-queue-filter-select"
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value)}
            >
              <option value="ALL">All ({totalCount})</option>
              <option value={TriageCaseStatus.OPEN}>Open ({openCount})</option>
              <option value={TriageCaseStatus.ASSIGNED}>Assigned ({assignedCount})</option>
              <option value={TriageCaseStatus.RESOLVED}>Resolved ({resolvedCount})</option>
            </select>
          </div>

          <div className="osm-triage-select-group">
            <label htmlFor="filter-case-priority" className="osm-triage-label">Priority:</label>
            <select
              id="filter-case-priority"
              className="osm-queue-filter-select"
              value={priorityFilter}
              onChange={(e) => onPriorityFilterChange(e.target.value)}
            >
              <option value="ALL">All Priorities</option>
              <option value={SignalSeverity.CRITICAL}>Critical</option>
              <option value={SignalSeverity.HIGH}>High</option>
              <option value={SignalSeverity.MEDIUM}>Medium</option>
              <option value={SignalSeverity.LOW}>Low</option>
            </select>
          </div>

          <button
            type="button"
            id="btn-refresh-queue"
            className="osm-btn osm-btn--secondary osm-btn--sm"
            onClick={onRefresh}
            disabled={loading}
            title="Refresh queue"
          >
            {loading ? "..." : "↻"}
          </button>
        </div>
      </div>

      {/* Case Cards List */}
      <div className="osm-triage-list-viewport">
        {loading && cases.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", padding: "1rem" }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ padding: "1rem", border: "1px solid var(--osm-border-subtle)", borderRadius: "var(--osm-radius-md)" }}>
                <Skeleton variant="text" width="120px" height="18px" />
                <Skeleton variant="text" width="180px" height="14px" style={{ marginTop: "6px" }} />
              </div>
            ))}
          </div>
        ) : filteredCases.length === 0 ? (
          <div style={{ padding: "2rem 1rem" }}>
            <EmptyState
              icon="📋"
              title={
                searchQuery || statusFilter !== "ALL" || priorityFilter !== "ALL"
                  ? "No cases match filters"
                  : "No triage cases active"
              }
              description={
                searchQuery || statusFilter !== "ALL" || priorityFilter !== "ALL"
                  ? "Try clearing filters or search terms."
                  : "All quality signals have been evaluated or no signals have triggered investigation."
              }
            />
          </div>
        ) : (
          <div className="osm-triage-cards" role="list">
            {filteredCases.map((c) => {
              const isSelected = c.id === selectedCaseId;
              const scriptInfo = getScriptReference(c.evaluationId);

              return (
                <div
                  key={c.id}
                  id={`case-card-${c.id}`}
                  className={`osm-triage-card-item ${isSelected ? "osm-triage-card-item--selected" : ""}`}
                  onClick={() => onSelectCase(c.id)}
                  role="listitem"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      onSelectCase(c.id);
                    }
                  }}
                >
                  <div className="osm-triage-card-top">
                    <span className="osm-triage-case-number">{c.caseNumber}</span>
                    <div style={{ display: "flex", gap: "0.35rem" }}>
                      <StatusBadge status={c.priority} size="sm" showDot={false} />
                      <StatusBadge status={c.status} size="sm" />
                    </div>
                  </div>

                  <div className="osm-triage-card-script">
                    <span className="osm-triage-script-ref">{scriptInfo.displayRef}</span>
                    <span className="osm-triage-candidate-sub">{scriptInfo.candidateLabel}</span>
                  </div>

                  <div className="osm-triage-card-footer">
                    <span className="osm-triage-assignee">
                      {c.assigneeId ? `👤 ${getActorDisplayName(c.assigneeId)}` : "Unassigned"}
                    </span>
                    <span className="osm-triage-date">
                      {new Date(c.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
