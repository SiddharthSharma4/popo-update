/**
 * Query to retrieve an AuditEvent by its ID.
 * Conforms to docs/contracts/06-api-contract.md §37, §69.
 */

import type { AuditRepository } from "../../domain/audit/index.js";
import { EntityNotFoundError } from "../common/errors.js";
import { type AuditEventResponse, toAuditEventDto } from "../dtos/audit-event.dto.js";

export class GetAuditEventByIdHandler {
  constructor(private readonly auditRepo: AuditRepository) {}

  async execute(eventId: string): Promise<AuditEventResponse> {
    const event = await this.auditRepo.findById(eventId.trim());
    if (!event) {
      throw new EntityNotFoundError("AuditEvent", eventId);
    }
    return toAuditEventDto(event);
  }
}
