/**
 * TrustLens & Audit Event Timeline UI Component.
 * Conforms to:
 * - docs/contracts/10-demo-contract.md §26-28 (Audit & Outbox Demonstration)
 * - docs/contracts/06-api-contract.md §37-40 (Audit Event Inspection & Authorization)
 * - docs/contracts/08-data-contract.md §28-31 (Immutable Audit Integrity)
 */

import React, { useState, useEffect, useCallback } from "react";
import type { AuditEventResponse, PaginatedAuditEventsResponse } from "@osm/shared";
import { UserRole } from "@osm/shared";
import { apiClient, type AuthContext, ApiError } from "../../services/api-client.ts";

interface TrustLensViewProps {
  auth: AuthContext;
}

export const TrustLensView: React.FC<TrustLensViewProps> = ({ auth }) => {
  const [events, setEvents] = useState<AuditEventResponse[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>("ALL");
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  const fetchAuditEvents = useCallback(async () => {
    // Only MODERATOR and ADMIN can inspect audit events (06-api §12)
    if (auth.role !== UserRole.MODERATOR && auth.role !== UserRole.ADMIN) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      let queryPath = "/audit-events?limit=50";
      if (entityTypeFilter !== "ALL") {
        queryPath += `&entityType=${encodeURIComponent(entityTypeFilter)}`;
      }

      const res = await apiClient.get<PaginatedAuditEventsResponse>(queryPath, auth);
      setEvents(res.items);
      setTotalCount(res.total);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(`Failed to fetch audit events: ${err.message} (${err.code ?? err.statusCode})`);
      } else {
        setError(err instanceof Error ? err.message : "Error fetching audit events");
      }
    } finally {
      setLoading(false);
    }
  }, [auth, entityTypeFilter]);

  useEffect(() => {
    fetchAuditEvents();
  }, [fetchAuditEvents]);

  const toggleExpand = (id: string) => {
    setExpandedEventId((prev) => (prev === id ? null : id));
  };

  const isUnauthorized = auth.role !== UserRole.MODERATOR && auth.role !== UserRole.ADMIN;

  if (isUnauthorized) {
    return (
      <div className="unauthorized-card" id="audit-unauthorized-banner">
        <h2>🔒 Restricted Supervisory Audit View</h2>
        <p>
          Audit inspection is strictly reserved for <strong>MODERATOR</strong> and <strong>ADMIN</strong> roles
          per contract <code>06-api-contract.md §12</code> and security requirements.
        </p>
        <p>
          Current active simulator role is <code>{auth.role}</code>. Switch to Moderator or Administrator using
          the Role Switcher in the top header to inspect the immutable audit trail.
        </p>
      </div>
    );
  }

  const getActionBadgeClass = (action: string) => {
    if (action.includes("CREATE")) return "badge-create";
    if (action.includes("ASSIGN")) return "badge-assign";
    if (action.includes("SUBMIT")) return "badge-submit";
    if (action.includes("RESOLVE")) return "badge-resolve";
    if (action.includes("SEED")) return "badge-seed";
    return "badge-default";
  };

  return (
    <div className="trustlens-container" id="osm-trustlens-view">
      {/* Header and Controls */}
      <div className="trustlens-header-bar">
        <div>
          <h2 className="view-title">TrustLens — Immutable Audit Trail</h2>
          <p className="view-subtitle">
            Cryptographically and transactionally coupled audit log proving unbroken consequential traceability.
            Every evaluation submission, mark assignment, and moderation resolution is permanently recorded.
          </p>
        </div>

        <div className="filter-controls">
          <label htmlFor="filter-entity-type" className="filter-label">Filter Entity:</label>
          <select
            id="filter-entity-type"
            className="filter-select"
            value={entityTypeFilter}
            onChange={(e) => setEntityTypeFilter(e.target.value)}
          >
            <option value="ALL">All Entities</option>
            <option value="Evaluation">Evaluation</option>
            <option value="TriageCase">TriageCase</option>
            <option value="Rubric">Rubric</option>
            <option value="Demonstration">Demonstration</option>
          </select>

          <button
            id="btn-refresh-audit"
            className="btn-secondary"
            onClick={fetchAuditEvents}
            disabled={loading}
          >
            {loading ? "..." : "↻ Refresh"}
          </button>
        </div>
      </div>

      {/* Architectural Guarantee Box */}
      <div className="guarantee-box">
        <span className="guarantee-tag">Transactional Outbox & Audit Invariant (INV-005)</span>
        <p className="guarantee-text">
          Audit events are written within the same atomic SQLite transaction as the domain state. If a command fails or
          is rejected, the audit log rolls back atomically with zero phantom event leakage.
        </p>
      </div>

      {error && (
        <div className="alert-box alert-error" id="audit-error-banner">
          <span>⚠️ {error}</span>
        </div>
      )}

      {/* Event Timeline Table */}
      {loading ? (
        <div className="loading-card">
          <p>Loading immutable audit records...</p>
        </div>
      ) : events.length === 0 ? (
        <div className="empty-audit-card">
          <p>No audit events recorded for current filter. Execute evaluation or moderation actions to see events appear.</p>
        </div>
      ) : (
        <div className="audit-table-wrapper">
          <div className="table-meta-bar">
            <span>Displaying <strong>{events.length}</strong> of <strong>{totalCount}</strong> recorded events</span>
          </div>

          <table className="audit-table" id="table-audit-events">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Action</th>
                <th>Entity</th>
                <th>Actor</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {events.map((evt) => {
                const isExpanded = expandedEventId === evt.id;

                return (
                  <React.Fragment key={evt.id}>
                    <tr className="audit-row" id={`audit-row-${evt.id}`}>
                      <td className="col-time">
                        <span className="time-primary">{new Date(evt.occurredAt).toLocaleTimeString()}</span>
                        <span className="time-secondary">{new Date(evt.occurredAt).toLocaleDateString()}</span>
                      </td>
                      <td className="col-action">
                        <span className={`action-badge ${getActionBadgeClass(evt.action)}`}>
                          {evt.action}
                        </span>
                      </td>
                      <td className="col-entity">
                        <span className="entity-type">{evt.entityType}</span>
                        <code className="entity-id" title={evt.entityId}>{evt.entityId}</code>
                      </td>
                      <td className="col-actor">
                        <span className="actor-type-pill">{evt.actorType}</span>
                        <span className="actor-id">{evt.actorId}</span>
                      </td>
                      <td className="col-inspect">
                        <button
                          className="btn-link"
                          id={`btn-expand-${evt.id}`}
                          onClick={() => toggleExpand(evt.id)}
                        >
                          {isExpanded ? "Hide Details ▲" : "View Payload ▼"}
                        </button>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr className="audit-detail-row" id={`audit-detail-${evt.id}`}>
                        <td colSpan={5}>
                          <div className="payload-inspect-box">
                            <div className="payload-header">
                              <span>Event ID: <code>{evt.id}</code></span>
                              <span>Type: <code>{evt.eventType}</code></span>
                            </div>
                            <pre className="payload-json">
                              {JSON.stringify(evt.details, null, 2)}
                            </pre>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
