import React, { useState } from "react";
import type { AuditEventResponse } from "@osm/shared";
import { getAuditActionMeta, formatAuditEventSummary } from "../../fixtures/auditActionLabels.ts";
import { getActorDisplayName } from "../../services/actor-fixtures.ts";
import { getScriptReference } from "../../fixtures/scriptReferences.ts";

export interface AuditTimelineItemProps {
  event: AuditEventResponse;
}

export const AuditTimelineItem: React.FC<AuditTimelineItemProps> = ({ event }) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const actionMeta = getAuditActionMeta(event.action);
  const summarySentence = formatAuditEventSummary(event);
  const actorName = getActorDisplayName(event.actorId || event.actor?.id || "System");

  const formatTimestamp = (iso: string) => {
    try {
      const d = new Date(iso);
      return {
        date: d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }),
        time: d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      };
    } catch {
      return { date: "—", time: iso };
    }
  };

  const ts = formatTimestamp(event.occurredAt);

  // Compute friendly entity label
  let entityLabel = event.entityId;
  if (event.entityType === "Evaluation") {
    const scriptInfo = getScriptReference(event.entityId);
    entityLabel = scriptInfo.displayRef;
  }

  return (
    <div className="osm-audit-timeline-item" id={`audit-item-${event.id}`}>
      {/* Top Header Row */}
      <div className="osm-audit-item-header">
        <div className="osm-audit-time-col">
          <span className="osm-audit-time-primary">{ts.time}</span>
          <span className="osm-audit-time-secondary">{ts.date}</span>
        </div>

        <div className="osm-audit-action-chip-row">
          <span className={`osm-audit-badge osm-audit-badge--${actionMeta.badgeVariant}`}>
            <span className="osm-audit-badge-icon">{actionMeta.icon}</span>
            <span>{actionMeta.label}</span>
          </span>

          <span className="osm-audit-entity-tag" title={`Entity ID: ${event.entityId}`}>
            <span className="osm-audit-entity-type">{event.entityType}:</span>
            <strong className="osm-mono">{entityLabel}</strong>
          </span>
        </div>

        <div className="osm-audit-actor-chip" title={`Actor ID: ${event.actorId}`}>
          <span className="osm-audit-actor-role">👤 {event.actorType}</span>
          <span className="osm-audit-actor-name">{actorName}</span>
        </div>
      </div>

      {/* Human-Readable Event Summary */}
      <p className="osm-audit-item-summary" id={`audit-summary-${event.id}`}>
        {summarySentence}
      </p>

      {/* Expandable Technical Details Button */}
      <div className="osm-audit-footer-row">
        <button
          type="button"
          className="osm-audit-expand-btn"
          id={`btn-expand-audit-${event.id}`}
          onClick={() => setIsExpanded((prev) => !prev)}
        >
          {isExpanded ? "▲ Hide Technical Details" : "▼ Inspect Technical Payload"}
        </button>
      </div>

      {/* Collapsible Technical Details Payload Drawer */}
      {isExpanded && (
        <div className="osm-audit-payload-drawer" id={`audit-payload-${event.id}`}>
          <div className="osm-audit-payload-meta">
            <span>Audit Event ID: <code>{event.id}</code></span>
            <span>Domain Event: <code>{event.eventType}</code></span>
          </div>
          <pre className="osm-audit-payload-code">
            {JSON.stringify(event.details, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};
