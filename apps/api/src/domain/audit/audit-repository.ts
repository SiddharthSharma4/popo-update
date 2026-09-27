/**
 * AuditRepository Domain Interface.
 * Defines the contract for persisting and querying immutable audit events.
 * Conforms to:
 * - docs/contracts/02-architecture-contract.md §37 (Audit module)
 * - docs/contracts/05-domain-contract.md §29, §31, INV-005 (Audit authority & immutability)
 * - docs/contracts/08-data-contract.md §24-27 (AuditEvent persistence & integrity)
 */

import type { AuditEvent } from "./audit-event.js";

export interface AuditQueryFilter {
  entityType?: string;
  entityId?: string;
  actorType?: string;
  actorId?: string;
  eventType?: string;
  action?: string;
}

export interface AuditQueryOptions {
  page?: number;
  pageSize?: number;
  limit?: number;
  offset?: number;
  sortOrder?: "asc" | "desc";
}

export interface AuditQueryResult {
  items: AuditEvent[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AuditRepository {
  record(event: AuditEvent): Promise<void>;
  findById(id: string): Promise<AuditEvent | null>;
  findByEntity(entityType: string, entityId: string): Promise<AuditEvent[]>;
  findAll(options?: { limit?: number; offset?: number }): Promise<AuditEvent[]>;
  query(filter?: AuditQueryFilter, options?: AuditQueryOptions): Promise<AuditQueryResult>;
}

