/**
 * Command to resolve a TriageCase by an authorized human moderator.
 * Conforms to:
 * - docs/contracts/06-api-contract.md §32-33 (Case resolution endpoint & payload)
 * - docs/contracts/05-domain-contract.md §24-28 (TriageCase lifecycle, Resolution entity & authority)
 * - docs/contracts/07-event-contract.md §48 (TriageCaseResolved outbox event)
 * - docs/contracts/08-data-contract.md §22-23, §28-31 (Atomic Unit of Work & Concurrency)
 *
 * Invariants:
 * - Only human moderators or admins may resolve triage cases (INV-004).
 * - AI actors and automated systems are strictly prohibited (INV-003, INV-004).
 * - Resolving is terminal and atomically updates TriageCase, Resolution, QualitySignal, and OutboxEvent.
 */

import { randomUUID } from "node:crypto";
import type { UnitOfWork } from "../common/unit-of-work.js";
import {
  EntityNotFoundError,
  InvalidCommandError,
  UnauthorizedActionError,
} from "../common/errors.js";
import {
  ConcurrencyConflictError,
  InvalidStateTransitionError,
} from "../../domain/errors.js";
import {
  Resolution,
  ResolutionOutcome,
  TriageCaseStatus,
} from "../../domain/moderation/index.js";
import { type TriageCaseResponse, toTriageCaseDto } from "../dtos/triage-case.dto.js";
import { type ResolutionResponse, toResolutionDto } from "../dtos/resolution.dto.js";
import type { ResolveTriageCaseResponse } from "@osm/shared";

export interface ResolveTriageCaseCommand {
  caseId: string;
  outcome: ResolutionOutcome;
  reason: string;
  notes?: string | null;
  evidenceReferences?: string[];
  expectedVersion?: number;
  actorId: string;
  actorType?: "USER" | "AI" | "SYSTEM";
  userRole?: "MODERATOR" | "ADMIN" | "EXAMINER";
}

export class ResolveTriageCaseHandler {
  constructor(private readonly uow: UnitOfWork) {}

  async execute(command: ResolveTriageCaseCommand): Promise<ResolveTriageCaseResponse> {
    if (!command.caseId?.trim()) {
      throw new InvalidCommandError("ResolveTriageCase", "Case ID is required.");
    }
    if (!command.outcome || !Object.values(ResolutionOutcome).includes(command.outcome)) {
      throw new InvalidCommandError(
        "ResolveTriageCase",
        `Valid resolution outcome is required. Received: ${command.outcome}`
      );
    }
    if (!command.reason?.trim()) {
      throw new InvalidCommandError("ResolveTriageCase", "Resolution reason is required.");
    }
    if (!command.actorId?.trim()) {
      throw new InvalidCommandError("ResolveTriageCase", "Actor ID is required.");
    }

    // AI actors cannot resolve triage cases (INV-003, INV-004)
    if (command.actorType === "AI") {
      throw new UnauthorizedActionError(
        "RESOLVE_TRIAGE_CASE",
        "AI cannot resolve triage cases."
      );
    }

    // Automated system actors cannot resolve triage cases (must be human moderator)
    if (command.actorType === "SYSTEM") {
      throw new UnauthorizedActionError(
        "RESOLVE_TRIAGE_CASE",
        "Automated system cannot resolve triage cases. Human resolution is required."
      );
    }

    // Role check: Only MODERATOR or ADMIN can resolve a triage case
    if (command.userRole && command.userRole !== "MODERATOR" && command.userRole !== "ADMIN") {
      throw new UnauthorizedActionError(
        "RESOLVE_TRIAGE_CASE",
        `User with role '${command.userRole}' is not authorized to resolve triage cases. Required: MODERATOR or ADMIN.`
      );
    }

    return this.uow.execute(async (scope) => {
      // 1. Verify TriageCase exists
      const triageCase = await scope.triageCases.findById(command.caseId);
      if (!triageCase) {
        throw new EntityNotFoundError("TriageCase", command.caseId);
      }

      // 2. Lifecycle check: cannot resolve an already resolved case
      if (triageCase.status === TriageCaseStatus.RESOLVED) {
        throw new InvalidStateTransitionError(
          "TriageCase",
          triageCase.status,
          TriageCaseStatus.RESOLVED
        );
      }

      // 3. Concurrency check (optimistic locking)
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

      // 4. Domain mutation on TriageCase aggregate
      triageCase.resolve(command.outcome, command.reason, command.actorId);

      // 5. Construct and persist Resolution entity
      const resolution = Resolution.create({
        triageCaseId: triageCase.id,
        evaluationId: triageCase.evaluationId,
        outcome: command.outcome,
        reason: command.reason,
        moderatorId: command.actorId,
        notes: command.notes,
        evidenceReferences: command.evidenceReferences,
      });
      await scope.resolutions.save(resolution);

      // 6. Persist updated TriageCase aggregate
      await scope.triageCases.save(triageCase);

      // 7. Synchronize associated QualitySignal
      const signal = await scope.qualitySignals.findById(triageCase.qualitySignalId);
      if (signal) {
        if (command.outcome === ResolutionOutcome.DISMISSED) {
          signal.dismiss(command.reason);
        } else {
          signal.resolve(command.outcome);
        }
        await scope.qualitySignals.save(signal);
      }

      // 8. Record transactional OutboxEvent
      const eventId = randomUUID();
      await scope.outbox.record({
        id: eventId,
        eventType: "TriageCaseResolved",
        eventVersion: 1,
        aggregateType: "TriageCase",
        aggregateId: triageCase.id,
        producer: "moderation",
        actorType: "USER",
        actorId: command.actorId,
        correlationId: eventId,
        payload: {
          caseId: triageCase.id,
          resolutionId: resolution.id,
          evaluationId: triageCase.evaluationId,
          qualitySignalId: triageCase.qualitySignalId,
          outcome: resolution.outcome,
          reason: resolution.reason,
          moderatorId: resolution.moderatorId,
          status: triageCase.status,
          version: triageCase.version,
          resolvedAt: resolution.createdAt,
        },
      });

      // 9. Record atomic AuditEvent
      await scope.audit.record({
        eventType: "TriageCaseResolved",
        actorType: "USER",
        actorId: command.actorId,
        entityType: "TriageCase",
        entityId: triageCase.id,
        action: "RESOLVE_TRIAGE_CASE",
        details: {
          caseId: triageCase.id,
          resolutionId: resolution.id,
          evaluationId: triageCase.evaluationId,
          qualitySignalId: triageCase.qualitySignalId,
          outcome: resolution.outcome,
          reason: resolution.reason,
          moderatorId: resolution.moderatorId,
          status: triageCase.status,
          version: triageCase.version,
          resolvedAt: resolution.createdAt,
        },
      });

      return {
        triageCase: toTriageCaseDto(triageCase),
        resolution: toResolutionDto(resolution),
      };
    });
  }
}
