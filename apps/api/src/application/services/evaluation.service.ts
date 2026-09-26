/**
 * EvaluationApplicationService orchestrating evaluation commands and queries.
 * Conforms to docs/contracts/02-architecture-contract.md §8.
 */

import type { UnitOfWork } from "../common/unit-of-work.js";
import type { EvaluationRepository } from "../../domain/evaluation/evaluation-repository.js";
import {
  CreateEvaluationHandler,
  type CreateEvaluationCommand,
} from "../commands/create-evaluation.command.js";
import {
  AssignMarkHandler,
  type AssignMarkCommand,
} from "../commands/assign-mark.command.js";
import {
  SubmitEvaluationHandler,
  type SubmitEvaluationCommand,
} from "../commands/submit-evaluation.command.js";
import {
  GetEvaluationByIdHandler,
  type GetEvaluationByIdQuery,
} from "../queries/get-evaluation-by-id.query.js";
import {
  ListEvaluationsHandler,
  type ListEvaluationsQuery,
  type PaginatedEvaluationsDto,
} from "../queries/list-evaluations.query.js";
import {
  RunCompletenessCheckHandler,
  type RunCompletenessCheckQuery,
} from "../queries/run-completeness-check.query.js";
import {
  GetQualitySignalsByEvaluationHandler,
  type GetQualitySignalsByEvaluationQuery,
} from "../queries/get-quality-signals-by-evaluation.query.js";
import type { QualitySignalRepository } from "../../domain/quality-signal/quality-signal-repository.js";
import type { EvaluationDto } from "../dtos/evaluation.dto.js";
import type { CompletenessValidationResultDto, QualitySignalResponse } from "@osm/shared";

export class EvaluationApplicationService {
  private readonly createEvaluationHandler: CreateEvaluationHandler;
  private readonly assignMarkHandler: AssignMarkHandler;
  private readonly submitEvaluationHandler: SubmitEvaluationHandler;
  private readonly getEvaluationByIdHandler: GetEvaluationByIdHandler;
  private readonly listEvaluationsHandler: ListEvaluationsHandler;
  private readonly runCompletenessCheckHandler: RunCompletenessCheckHandler;
  private readonly getQualitySignalsHandler?: GetQualitySignalsByEvaluationHandler;

  constructor(
    private readonly uow: UnitOfWork,
    private readonly evaluationRepo: EvaluationRepository,
    private readonly qualitySignalRepo?: QualitySignalRepository
  ) {
    this.createEvaluationHandler = new CreateEvaluationHandler(this.uow);
    this.assignMarkHandler = new AssignMarkHandler(this.uow);
    this.submitEvaluationHandler = new SubmitEvaluationHandler(this.uow);
    this.getEvaluationByIdHandler = new GetEvaluationByIdHandler(this.evaluationRepo);
    this.listEvaluationsHandler = new ListEvaluationsHandler(this.evaluationRepo);
    this.runCompletenessCheckHandler = new RunCompletenessCheckHandler(this.evaluationRepo);
    if (this.qualitySignalRepo) {
      this.getQualitySignalsHandler = new GetQualitySignalsByEvaluationHandler(this.qualitySignalRepo);
    }
  }

  async createEvaluation(command: CreateEvaluationCommand): Promise<EvaluationDto> {
    return this.createEvaluationHandler.execute(command);
  }

  async assignMark(command: AssignMarkCommand): Promise<EvaluationDto> {
    return this.assignMarkHandler.execute(command);
  }

  async submitEvaluation(command: SubmitEvaluationCommand): Promise<EvaluationDto> {
    return this.submitEvaluationHandler.execute(command);
  }

  async getEvaluationById(id: string): Promise<EvaluationDto> {
    return this.getEvaluationByIdHandler.execute({ evaluationId: id });
  }

  async listEvaluations(query: ListEvaluationsQuery): Promise<PaginatedEvaluationsDto> {
    return this.listEvaluationsHandler.execute(query);
  }

  async runCompletenessCheck(evaluationId: string): Promise<CompletenessValidationResultDto> {
    return this.runCompletenessCheckHandler.execute({ evaluationId });
  }

  async getQualitySignals(evaluationId: string): Promise<QualitySignalResponse[]> {
    if (!this.getQualitySignalsHandler) {
      throw new Error("QualitySignalRepository not provided to EvaluationApplicationService.");
    }
    return this.getQualitySignalsHandler.execute({ evaluationId });
  }
}


