/**
 * Command to create a Rubric definition.
 * Conforms to docs/contracts/05-domain-contract.md §13 and docs/contracts/08-data-contract.md §15-16.
 */

import { Rubric } from "../../domain/rubric/rubric.js";
import type { UnitOfWork } from "../common/unit-of-work.js";
import { InvalidCommandError } from "../common/errors.js";
import { type RubricDto, toRubricDto } from "../dtos/rubric.dto.js";

export interface CreateRubricCommand {
  id: string;
  title: string;
  version: number;
  criteria: {
    id: string;
    title: string;
    maxMarks: number;
    description?: string;
    levels?: { title: string; marks: number; description: string }[];
  }[];
}

export class CreateRubricHandler {
  constructor(private readonly uow: UnitOfWork) {}

  async execute(command: CreateRubricCommand): Promise<RubricDto> {
    if (!command.id?.trim()) {
      throw new InvalidCommandError("CreateRubric", "Rubric ID is required.");
    }
    if (!command.title?.trim()) {
      throw new InvalidCommandError("CreateRubric", "Rubric title is required.");
    }
    if (command.version < 1) {
      throw new InvalidCommandError("CreateRubric", "Rubric version must be >= 1.");
    }

    return this.uow.execute(async (scope) => {
      const rubric = new Rubric({
        id: command.id,
        title: command.title,
        version: command.version,
        criteria: command.criteria,
      });

      await scope.rubrics.save(rubric);

      await scope.audit.record({
        eventType: "RubricCreated",
        actorType: "USER",
        actorId: "system-admin",
        entityType: "Rubric",
        entityId: `${rubric.id}:v${rubric.version}`,
        action: "CREATE_RUBRIC",
        details: {
          title: rubric.title,
          version: rubric.version,
          totalMaxMarks: rubric.totalMaxMarks,
        },
      });

      return toRubricDto(rubric);
    });
  }
}
