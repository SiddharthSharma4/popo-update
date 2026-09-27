/**
 * Command to create a TriageCase linked to a QualitySignal.
 * Conforms to:
 * - docs/contracts/06-api-contract.md §30 (TriageCase creation)
 * - docs/contracts/05-domain-contract.md §22-24 (TriageCase lifecycle & signal linkage)
 * - docs/contracts/07-event-contract.md §45 (TriageCaseCreated outbox event)
 * - docs/contracts/08-data-contract.md §20-21, §28-31 (Atomic Unit of Work)
 */

import { randomUUID } from "node:crypto";
import type { SignalSeverity } from "@osm/shared";
import type { UnitOfWork } from "../common/unit-of-work.js";
import {
  EntityNotFoundError,
  InvalidCommandError,
  UnauthorizedActionError,
} from "../common/errors.js";
import { TriageCase } from "../../domain/moderation/triage-case.js";
import { type TriageCaseResponse, toTriageCaseDto } from "../dtos/triage-case.dto.js";

export interface CreateTriageCaseCommand {
  id?: string;
  caseNumber?: string;
  qualitySignalId: string;
  priority?: SignalSeverity | string;
  notes?: string | null;
  actorId: string;
  actorType?: "USER" | "AI" | "SYSTEM";
  userRole?: "MODERATOR" | "ADMIN" | "EXAMINER";
}

export class CreateTriageCaseHandler {
  constructor(private readonly uow: UnitOfWork) {}

  async execute(command: CreateTriageCaseCommand): Promise<TriageCaseResponse> {
    if (!command.qualitySignalId?.trim()) {
      throw new InvalidCommandError("CreateTriageCase", "QualitySignal ID is required.");
    }
    if (!command.actorId?.trim()) {
      throw new InvalidCommandError("CreateTriageCase", "Actor ID is required.");
    }

    // AI cannot create a TriageCase (INV-003, INV-004)
    if (command.actorType === "AI") {
      throw new UnauthorizedActionError(
        "CREATE_TRIAGE_CASE",
        "AI cannot create or open triage cases."
      );
    }

    // Role check: Only MODERATOR or ADMIN can create a triage case
    if (command.userRole && command.userRole !== "MODERATOR" && command.userRole !== "ADMIN") {
      throw new UnauthorizedActionError(
        "CREATE_TRIAGE_CASE",
        `User with role '${command.userRole}' is not authorized to create triage cases. Required: MODERATOR or ADMIN.`
      );
    }

    return this.uow.execute(async (scope) => {
      // 1. Verify QualitySignal exists
      const signal = await scope.qualitySignals.findById(command.qualitySignalId);
      if (!signal) {
        throw new EntityNotFoundError("QualitySignal", command.qualitySignalId);
      }

      // 2. Verify Evaluation exists
      const evaluation = await scope.evaluations.findById(signal.evaluationId);
      if (!evaluation) {
        throw new EntityNotFoundError("Evaluation", signal.evaluationId);
      }

      // 3. Create TriageCase aggregate
      const triageCase = TriageCase.create({
        id: command.id,
        caseNumber: command.caseNumber,
        evaluationId: evaluation.id,
        evaluationCycleId: evaluation.evaluationCycleId,
        qualitySignalId: signal.id,
        priority: command.priority ?? signal.severity,
        notes: command.notes,
      });

      // 4. Atomically transition signal status to LINKED_TO_CASE
      signal.linkToCase(triageCase.id);

      // 5. Persist both aggregates atomically
      await scope.qualitySignals.save(signal);
      await scope.triageCases.save(triageCase);

      // 6. Record transactional OutboxEvent
      const eventId = randomUUID();
      await scope.outbox.record({
        id: eventId,
        eventType: "TriageCaseCreated",
        eventVersion: 1,
        aggregateType: "TriageCase",
        aggregateId: triageCase.id,
        producer: "moderation",
        actorType: command.actorType === "SYSTEM" ? "SYSTEM" : "USER",
        actorId: command.actorId,
        correlationId: eventId,
        payload: {
          caseId: triageCase.id,
          caseNumber: triageCase.caseNumber,
          qualitySignalId: triageCase.qualitySignalId,
          evaluationId: triageCase.evaluationId,
          evaluationCycleId: triageCase.evaluationCycleId,
          status: triageCase.status,
          priority: triageCase.priority,
          createdAt: triageCase.createdAt,
        },
      });

      // 7. Record atomic AuditEvent
      await scope.audit.record({
        eventType: "TriageCaseCreated",
        actorType: command.actorType === "SYSTEM" ? "SYSTEM" : "USER",
        actorId: command.actorId,
        entityType: "TriageCase",
        entityId: triageCase.id,
        action: "CREATE_TRIAGE_CASE",
        details: {
          caseId: triageCase.id,
          caseNumber: triageCase.caseNumber,
          qualitySignalId: triageCase.qualitySignalId,
          evaluationId: triageCase.evaluationId,
          evaluationCycleId: triageCase.evaluationCycleId,
          priority: triageCase.priority,
          status: triageCase.status,
        },
      });

      return toTriageCaseDto(triageCase);
    });
  }
}
