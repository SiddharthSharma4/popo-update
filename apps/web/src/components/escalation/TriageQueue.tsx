import React from "react";
import type { TriageCaseResponse } from "@osm/shared";
import { TriageCaseStatus, SignalSeverity } from "@osm/shared";

interface TriageQueueProps {
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
      if (!matchNumber && !matchEval && !matchAssignee) return false;
    }
    return true;
  });

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
    <div className="triage-queue-card" id="osm-triage-queue">
      {/* Metric Counters Bar */}
      <div className="metrics-strip" id="osm-queue-metrics">
        <div className="metric-item">
          <span className="metric-label">Total Cases</span>
          <span className="metric-value" id="metric-total-cases">{totalCount}</span>
        </div>
        <div className="metric-item">
          <span className="metric-label">Open</span>
          <span className="metric-value text-warning" id="metric-open-cases">{openCount}</span>
        </div>
        <div className="metric-item">
          <span className="metric-label">Assigned</span>
          <span className="metric-value text-cyan" id="metric-assigned-cases">{assignedCount}</span>
        </div>
        <div className="metric-item">
          <span className="metric-label">Resolved</span>
          <span className="metric-value text-success" id="metric-resolved-cases">{resolvedCount}</span>
        </div>
        <div className="metric-item">
          <span className="metric-label">High / Critical</span>
          <span className="metric-value text-error" id="metric-critical-cases">{highOrCriticalCount}</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="queue-filter-bar">
        <div className="filter-group">
          <label htmlFor="filter-case-status">Status:</label>
          <select
            id="filter-case-status"
            className="filter-select"
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
          >
            <option value="ALL">All Statuses</option>
            <option value={TriageCaseStatus.OPEN}>Open</option>
            <option value={TriageCaseStatus.ASSIGNED}>Assigned</option>
            <option value={TriageCaseStatus.RESOLVED}>Resolved</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="filter-case-priority">Priority:</label>
          <select
            id="filter-case-priority"
            className="filter-select"
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

        <div className="search-group">
          <input
            id="search-cases-input"
            type="text"
            className="search-input"
            placeholder="Search case #, eval ID, assignee..."
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
          />
        </div>

        <button
          id="btn-refresh-queue"
          className="btn-refresh"
          onClick={onRefresh}
          disabled={loading}
          title="Refresh queue"
        >
          {loading ? "Refreshing..." : "↻ Refresh"}
        </button>
      </div>

      {/* Case List Table / Cards */}
      <div className="queue-list-container">
        {loading && cases.length === 0 ? (
          <div className="loading-state" id="osm-queue-loading">
            <div className="spinner" />
            <p>Loading moderation triage cases...</p>
          </div>
        ) : filteredCases.length === 0 ? (
          <div className="empty-state" id="osm-queue-empty">
            <p className="empty-title">No Triage Cases Found</p>
            <p className="empty-subtitle">
              {cases.length === 0
                ? "No quality signals have triggered moderation cases yet."
                : "No cases match the selected filter criteria."}
            </p>
          </div>
        ) : (
          <div className="case-cards-list" role="list">
            {filteredCases.map((c) => {
              const isSelected = c.id === selectedCaseId;
              return (
                <div
                  key={c.id}
                  id={`case-card-${c.id}`}
                  className={`case-card-item ${isSelected ? "selected" : ""}`}
                  onClick={() => onSelectCase(c.id)}
                  role="listitem"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      onSelectCase(c.id);
                    }
                  }}
                >
                  <div className="case-card-header">
                    <span className="case-card-number">{c.caseNumber}</span>
                    <span className={`priority-badge ${getPriorityClass(c.priority)}`}>
                      {c.priority}
                    </span>
                  </div>

                  <div className="case-card-meta">
                    <span className={`status-pill ${getStatusClass(c.status)}`}>
                      {c.status}
                    </span>
                    <span className="version-tag">v{c.version}</span>
                    <span className="assignee-text">
                      {c.assigneeId ? `👤 ${c.assigneeId}` : "Unassigned"}
                    </span>
                  </div>

                  <div className="case-card-footer">
                    <span className="evaluation-id-preview" title={c.evaluationId}>
                      Eval: {c.evaluationId.slice(0, 8)}...
                    </span>
                    <span className="date-preview">
                      {new Date(c.createdAt).toLocaleDateString()}
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
