/**
 * TrustLens — Immutable Examination Audit Ledger.
 * Conforms to:
 * - docs/11-frontend-design-contract.md §14.4, §21, §24 (TrustLens Redesign)
 * - docs/12-frontend-redesign-build-plan.md FE-022
 * - docs/contracts/08-data-contract.md (Immutable Audit Integrity)
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import type { AuditEventResponse, PaginatedAuditEventsResponse } from "@osm/shared";
import { UserRole } from "@osm/shared";
import { apiClient, type AuthContext, ApiError } from "../../services/api-client.ts";
import { AuditTimelineItem } from "./AuditTimelineItem.tsx";
import { Button, Input, Skeleton, EmptyState, Alert } from "../ui";

export interface TrustLensViewProps {
  auth: AuthContext;
}

export const TrustLensView: React.FC<TrustLensViewProps> = ({ auth }) => {
  const [events, setEvents] = useState<AuditEventResponse[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [entityTypeFilter, setEntityTypeFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [limit, setLimit] = useState<number>(50);

  const isAuthorized = auth.role === UserRole.MODERATOR || auth.role === UserRole.ADMIN;

  const fetchAuditEvents = useCallback(async () => {
    if (!isAuthorized) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      let queryPath = `/audit-events?limit=${limit}`;
      if (entityTypeFilter !== "ALL") {
        queryPath += `&entityType=${encodeURIComponent(entityTypeFilter)}`;
      }

      const res = await apiClient.get<PaginatedAuditEventsResponse>(queryPath, auth);
      setEvents(res.items || []);
      setTotalCount(res.total || 0);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : "Failed to retrieve audit ledger records.");
      }
    } finally {
      setLoading(false);
    }
  }, [auth, entityTypeFilter, isAuthorized, limit]);

  useEffect(() => {
    fetchAuditEvents();
  }, [fetchAuditEvents]);

  // Client-side text filter on loaded events
  const filteredEvents = useMemo(() => {
    if (!searchQuery.trim()) return events;
    const q = searchQuery.toLowerCase();
    return events.filter((e) => {
      const actorMatch = (e.actorId || "").toLowerCase().includes(q);
      const entityMatch = (e.entityId || "").toLowerCase().includes(q);
      const actionMatch = (e.action || "").toLowerCase().includes(q);
      const typeMatch = (e.entityType || "").toLowerCase().includes(q);
      return actorMatch || entityMatch || actionMatch || typeMatch;
    });
  }, [events, searchQuery]);

  // Role Boundary Guard for Examiners
  if (!isAuthorized) {
    return (
      <div className="osm-page-container" style={{ padding: "2rem" }}>
        <Alert
          type="warning"
          title="Restricted Supervisory Access"
          message="The TrustLens Audit Ledger is restricted exclusively to authorized Moderators and Examination Administrators to preserve academic neutrality."
        />
      </div>
    );
  }

  return (
    <div className="osm-trustlens-page" id="osm-trustlens-view">
      {/* Top Institutional Header */}
      <div className="osm-trustlens-header">
        <div>
          <div className="osm-trustlens-title-row">
            <h1 className="osm-trustlens-title" id="trustlens-title">
              TrustLens Audit Ledger
            </h1>
            <span className="osm-trustlens-integrity-pill">
              🛡️ Tamper-Evident Ledger Verified
            </span>
          </div>
          <p className="osm-trustlens-subtitle">
            Cryptographically chained chronological audit stream documenting every evaluation mark,
            moderation decision, and system event with actor accountability.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          id="btn-refresh-audit"
          onClick={fetchAuditEvents}
          loading={loading}
        >
          ↻ Refresh Ledger
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="osm-trustlens-controls">
        <div className="osm-trustlens-filter-group">
          <label htmlFor="filter-entity-type" className="osm-trustlens-label">
            Filter Entity:
          </label>
          <select
            id="filter-entity-type"
            className="osm-trustlens-select"
            value={entityTypeFilter}
            onChange={(e) => setEntityTypeFilter(e.target.value)}
          >
            <option value="ALL">All Entity Types</option>
            <option value="Evaluation">Examiner Evaluations</option>
            <option value="TriageCase">Moderation Triage Cases</option>
            <option value="Demonstration">Examination Cohorts</option>
            <option value="Rubric">Grading Rubrics</option>
          </select>
        </div>

        <div className="osm-trustlens-search-box">
          <Input
            id="input-audit-search"
            type="text"
            placeholder="Search by actor, entity reference, or action..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div style={{ marginBottom: "1.5rem" }}>
          <Alert type="danger" title="Audit Query Error" message={error} />
        </div>
      )}

      {/* Meta Bar */}
      <div className="osm-trustlens-meta-bar">
        <span>
          Showing <strong>{filteredEvents.length}</strong> of <strong>{totalCount}</strong> recorded ledger events
        </span>
        {searchQuery && (
          <button
            type="button"
            className="osm-trustlens-clear-search"
            onClick={() => setSearchQuery("")}
          >
            Clear Search
          </button>
        )}
      </div>

      {/* Timeline Stream */}
      {loading && events.length === 0 ? (
        <div className="osm-trustlens-skeleton-list">
          <Skeleton variant="rectangle" width="100%" height="90px" />
          <Skeleton variant="rectangle" width="100%" height="90px" />
          <Skeleton variant="rectangle" width="100%" height="90px" />
        </div>
      ) : filteredEvents.length === 0 ? (
        <EmptyState
          title="No Audit Records Found"
          description={
            searchQuery || entityTypeFilter !== "ALL"
              ? "No ledger events match the selected entity type or search query."
              : "No audit events are currently recorded in this examination session."
          }
          icon="📋"
        />
      ) : (
        <div className="osm-trustlens-timeline" id="audit-timeline-list">
          {filteredEvents.map((evt) => (
            <AuditTimelineItem key={evt.id} event={evt} />
          ))}
        </div>
      )}

      {/* Load More Button */}
      {!loading && events.length < totalCount && (
        <div className="osm-trustlens-load-more">
          <Button
            variant="secondary"
            id="btn-load-more-audit"
            onClick={() => setLimit((prev) => prev + 50)}
          >
            Load Older Audit Events (+50)
          </Button>
        </div>
      )}
    </div>
  );
};
