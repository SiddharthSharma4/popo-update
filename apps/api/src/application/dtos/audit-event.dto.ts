/**
 * AuditEvent DTO conversion helper.
 * Conforms to docs/contracts/06-api-contract.md §37-40, §69.
 */

import type { AuditEventResponse } from "@osm/shared";
import type { AuditEvent } from "../../domain/audit/index.js";

export type { AuditEventResponse };

export function toAuditEventDto(event: AuditEvent): AuditEventResponse {
  return {
    id: event.id,
    eventType: event.eventType,
    actor: {
      type: event.actorType,
      id: event.actorId,
    },
    resource: {
      type: event.entityType,
      id: event.entityId,
    },
    action: event.action,
    details: event.details as Record<string, unknown>,
    occurredAt: event.occurredAt,
    actorType: event.actorType,
    actorId: event.actorId,
    entityType: event.entityType,
    entityId: event.entityId,
  };
}
