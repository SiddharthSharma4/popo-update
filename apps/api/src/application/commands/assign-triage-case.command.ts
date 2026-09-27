/**
 * Command to assign a TriageCase to a reviewer/moderator.
 * Conforms to:
 * - docs/contracts/06-api-contract.md §31 (TriageCase assignment)
 * - docs/contracts/05-domain-contract.md §22-24 (TriageCase lifecycle)
 * - docs/contracts/07-event-contract.md §46 (TriageCaseAssigned outbox event)
 * - docs/contracts/08-data-contract.md §20-21, §28-31 (Atomic Unit of Work & Concurrency)
 */

import { randomUUID } from "node:crypto";
import type { UnitOfWork } from "../common/unit-of-work.js";
import {
  EntityNotFoundError,
  InvalidCommandError,
  UnauthorizedActionError,
} from "../common/errors.js";
import { ConcurrencyConflictError } from "../../domain/errors.js";
import { type TriageCaseResponse, toTriageCaseDto } from "../dtos/triage-case.dto.js";

export interface AssignTriageCaseCommand {
  caseId: string;
  assigneeId: string;
  expectedVersion?: number;
  actorId: string;
  actorType?: "USER" | "AI" | "SYSTEM";
  userRole?: "MODERATOR" | "ADMIN" | "EXAMINER";
}

export class AssignTriageCaseHandler {
  constructor(private readonly uow: UnitOfWork) {}

  async execute(command: AssignTriageCaseCommand): Promise<TriageCaseResponse> {
    if (!command.caseId?.trim()) {
      throw new InvalidCommandError("AssignTriageCase", "Case ID is required.");
    }
    if (!command.assigneeId?.trim()) {
      throw new InvalidCommandError("AssignTriageCase", "Assignee ID is required.");
    }
    if (!command.actorId?.trim()) {
      throw new InvalidCommandError("AssignTriageCase", "Actor ID is required.");
    }

    // AI cannot assign a TriageCase (INV-003, INV-004)
    if (command.actorType === "AI") {
      throw new UnauthorizedActionError(
        "ASSIGN_TRIAGE_CASE",
        "AI cannot assign triage cases."
      );
    }

    // Role check: Only MODERATOR or ADMIN can assign a triage case
    if (command.userRole && command.userRole !== "MODERATOR" && command.userRole !== "ADMIN") {
      throw new UnauthorizedActionError(
        "ASSIGN_TRIAGE_CASE",
        `User with role '${command.userRole}' is not authorized to assign triage cases. Required: MODERATOR or ADMIN.`
      );
    }

    return this.uow.execute(async (scope) => {
      // 1. Verify TriageCase exists
      const triageCase = await scope.triageCases.findById(command.caseId);
      if (!triageCase) {
        throw new EntityNotFoundError("TriageCase", command.caseId);
      }

      // 2. Concurrency check (optimistic locking)
      if (
        command.expectedVersion !== undefined &&
        triageCase.version !== command.expectedVersion
      ) {
        throw new ConcurrencyConflictError(
          "TriageCase",
          triageCase.id,
          command.expectedVersion,
          triageCase.version
        );
      }

      // 3. Domain mutation & state transition
      triageCase.assign(command.assigneeId, command.actorId);

      // 4. Persist updated aggregate
      await scope.triageCases.save(triageCase);

      // 5. Record transactional OutboxEvent
      const eventId = randomUUID();
      await scope.outbox.record({
        id: eventId,
        eventType: "TriageCaseAssigned",
        eventVersion: 1,
        aggregateType: "TriageCase",
        aggregateId: triageCase.id,
        producer: "moderation",
        actorType: command.actorType === "SYSTEM" ? "SYSTEM" : "USER",
        actorId: command.actorId,
        correlationId: eventId,
        payload: {
          caseId: triageCase.id,
          assigneeId: triageCase.assigneeId,
          status: triageCase.status,
          version: triageCase.version,
          assignedAt: triageCase.updatedAt,
        },
      });

      // 6. Record atomic AuditEvent
      await scope.audit.record({
        eventType: "TriageCaseAssigned",
        actorType: command.actorType === "SYSTEM" ? "SYSTEM" : "USER",
        actorId: command.actorId,
        entityType: "TriageCase",
        entityId: triageCase.id,
        action: "ASSIGN_TRIAGE_CASE",
        details: {
          caseId: triageCase.id,
          assigneeId: triageCase.assigneeId,
          version: triageCase.version,
          assignedAt: triageCase.updatedAt,
        },
      });

      return toTriageCaseDto(triageCase);
    });
  }
}
