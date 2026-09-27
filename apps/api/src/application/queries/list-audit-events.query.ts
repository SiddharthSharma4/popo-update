/**
 * Query to list AuditEvents with filtering, pagination, and deterministic ordering.
 * Conforms to docs/contracts/06-api-contract.md §37, §44, §69.
 */

import type {
  AuditRepository,
  AuditQueryFilter,
  AuditQueryOptions,
} from "../../domain/audit/index.js";
import type { PaginatedAuditEventsResponse } from "@osm/shared";
import { toAuditEventDto } from "../dtos/audit-event.dto.js";

export class ListAuditEventsHandler {
  constructor(private readonly auditRepo: AuditRepository) {}

  async execute(
    filter?: AuditQueryFilter,
    options?: AuditQueryOptions
  ): Promise<PaginatedAuditEventsResponse> {
    const result = await this.auditRepo.query(filter, options);
    return {
      items: result.items.map(toAuditEventDto),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    };
  }
}
