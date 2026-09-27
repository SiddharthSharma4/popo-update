/**
 * Application command and handler to ingest external OSM evaluation data.
 * Conforms to:
 * - docs/contracts/02-architecture-contract.md §50 (External OSM Integration)
 * - docs/contracts/05-domain-contract.md §18, §38 (Actor model, INV-003, INV-004)
 * - docs/contracts/06-api-contract.md §54-56 (Integration boundary, authority)
 * - docs/contracts/08-data-contract.md §37-40, §108-111 (Idempotency, Normalization)
 * - docs/contracts/09-testing-contract.md §51-52 (External integration & failure testing)
 *
 * Invariants:
 * - Anti-corruption boundary: external payloads normalized into domain entities.
 * - Idempotency guaranteed: identical requests return cached replay; conflicting requests throw 409.
 * - Concurrency protected: SQLite primary key on idempotency_records prevents duplicate evaluation creation.
 * - Mark immutability: once submitted, evaluations cannot be mutated.
 * - AI non-authority: AI actors strictly rejected with 403 Forbidden.
 */

import { randomUUID } from "node:crypto";
import {
  type ExternalOsmEvaluation,
  type ExternalOsmBatchImport,
  type ExternalOsmIngestResult,
  type ExternalOsmBatchResult,
  UserRole,
  ActorType,
} from "@osm/shared";
import type { UnitOfWork, IdempotencyRepository } from "../common/unit-of-work.js";
import {
  EntityNotFoundError,
  UnauthorizedActionError,
} from "../common/errors.js";
import { ConcurrencyConflictError } from "../../domain/errors.js";
import { Evaluation } from "../../domain/evaluation/evaluation.js";
import { SubmissionCompletenessValidator } from "../../domain/validation/submission-completeness-validator.js";
import { CompletenessSignalGenerator } from "../../domain/quality-signal/completeness-signal-generator.js";
import { OsmDataNormalizer } from "../integration/osm-data-normalizer.js";
import type {
  OsmIntegrationPort,
  IntegrationActorContext,
} from "../integration/osm-integration.port.js";

export class IngestOsmEvaluationHandler {
  private readonly normalizer: OsmDataNormalizer;
  private readonly completenessValidator: SubmissionCompletenessValidator;
  private readonly completenessSignalGenerator: CompletenessSignalGenerator;

  constructor(
    private readonly uow: UnitOfWork,
    private readonly idempotencyRepo?: IdempotencyRepository,
    normalizer?: OsmDataNormalizer,
    completenessValidator?: SubmissionCompletenessValidator,
    completenessSignalGenerator?: CompletenessSignalGenerator
  ) {
    this.normalizer = normalizer ?? new OsmDataNormalizer();
    this.completenessValidator =
      completenessValidator ?? new SubmissionCompletenessValidator();
    this.completenessSignalGenerator =
      completenessSignalGenerator ?? new CompletenessSignalGenerator();
  }

  async execute(
    rawPayload: ExternalOsmEvaluation,
    actor: IntegrationActorContext
  ): Promise<ExternalOsmIngestResult> {
    // 1. Role & Actor Authorization Enforcement (06-api §12, 05-domain §38, INV-003)
    if (actor.actorType === ActorType.AI || actor.role === "AI") {
      throw new UnauthorizedActionError(
        "INGEST_OSM_EVALUATION",
        "AI actors are strictly prohibited from ingesting or submitting evaluations."
      );
    }

    if (
      actor.role !== UserRole.MODERATOR &&
      actor.role !== UserRole.ADMIN &&
      actor.actorType !== ActorType.INTEGRATION &&
      actor.actorType !== ActorType.SYSTEM
    ) {
      throw new UnauthorizedActionError(
        "INGEST_OSM_EVALUATION",
        "Examiners and unauthorized roles are not permitted to ingest external evaluation data. Required: MODERATOR or ADMIN."
      );
    }

    // 2. Validate, sanitize, and normalize external payload (Anti-Corruption Layer)
    const sanitized = this.normalizer.validateAndSanitize(rawPayload);
    const fingerprint = this.normalizer.computeFingerprint(sanitized);

    // 3. Determine scoped idempotency key (08-data §38: unique(idempotencyScope, idempotencyKey))
    const scopedKey =
      sanitized.idempotencyKey ||
      `${sanitized.sourceSystem}:${sanitized.externalEvaluationId}`;
    const storageKey = `OSM_INGESTION:${scopedKey}`;

    // 4. Pre-transaction Idempotency Check (fast replay path)
    if (this.idempotencyRepo) {
      const existing = await this.idempotencyRepo.findByKey(storageKey);
      if (existing) {
        if (existing.requestHash === fingerprint) {
          const cached = JSON.parse(existing.responseBody) as ExternalOsmIngestResult;
          return {
            ...cached,
            status: "IDEMPOTENT_REPLAY",
            message: "Idempotent replay: evaluation already ingested.",
          };
        } else {
          throw new ConcurrencyConflictError(
            "IdempotencyRecord",
            scopedKey,
            1,
            0
          );
        }
      }
    }

    // 5. Transactional Ingestion Execution
    return this.uow.execute(async (scope) => {
      // Re-check idempotency within transaction to guard against concurrent race
      const inTxExisting = await scope.idempotency.findByKey(storageKey);
      if (inTxExisting) {
        if (inTxExisting.requestHash === fingerprint) {
          const cached = JSON.parse(inTxExisting.responseBody) as ExternalOsmIngestResult;
          return {
            ...cached,
            status: "IDEMPOTENT_REPLAY",
            message: "Idempotent replay: evaluation already ingested.",
          };
        } else {
          throw new ConcurrencyConflictError(
            "IdempotencyRecord",
            scopedKey,
            1,
            0
          );
        }
      }

      // Verify referenced Rubric exists
      const rubric = await scope.rubrics.findByIdAndVersion(
        sanitized.rubricId,
        sanitized.rubricVersion
      );
      if (!rubric) {
        throw new EntityNotFoundError(
          "Rubric",
          `${sanitized.rubricId} (v${sanitized.rubricVersion})`
        );
      }

      // Normalize questions from payload or derive from rubric criteria
      const questions = this.normalizer.normalizeQuestions(
        sanitized.questions,
        rubric
      );

      // Validate and match awarded marks
      const normalizedMarks = this.normalizer.normalizeMarks(
        sanitized.marks,
        questions
      );

      // Instantiate Evaluation aggregate root
      const evaluationId = randomUUID();
      const evaluation = Evaluation.create({
        id: evaluationId,
        evaluationCycleId: sanitized.evaluationCycleId,
        scriptId: sanitized.scriptId,
        evaluatorId: sanitized.evaluatorId,
        rubricId: sanitized.rubricId,
        rubricVersion: sanitized.rubricVersion,
        questions,
      });

      // Assign marks
      for (const m of normalizedMarks) {
        evaluation.assignMark({
          questionId: m.questionId,
          awardedMarks: m.awardedMarks,
          evaluatorId: sanitized.evaluatorId,
          comments: m.comments,
          isAnnotated: m.isAnnotated,
        });
      }

      // Persist initial evaluation aggregate (and questions/marks)
      await scope.evaluations.save(evaluation);

      // Handle optional auto-submission
      if (sanitized.autoSubmit) {
        const completeness = this.completenessValidator.validate(evaluation);
        evaluation.submit();

        // Update evaluation to SUBMITTED state
        await scope.evaluations.save(evaluation);

        // Emit QualitySignal if incomplete
        const signal = this.completenessSignalGenerator.generate(
          evaluation,
          completeness
        );
        if (signal) {
          await scope.qualitySignals.save(signal);

          await scope.outbox.record({
            eventType: "QualitySignalGenerated",
            eventVersion: 1,
            aggregateType: "QualitySignal",
            aggregateId: signal.id,
            producer: "completeness-detector",
            actorType: "SYSTEM",
            actorId: "system",
            payload: {
              signalId: signal.id,
              evaluationId: evaluation.id,
              signalType: signal.signalType,
              severity: signal.severity,
              evidence: signal.evidence,
            },
          });
        }

        // Outbox event for evaluation submission
        await scope.outbox.record({
          eventType: "EvaluationSubmitted",
          eventVersion: 1,
          aggregateType: "Evaluation",
          aggregateId: evaluation.id,
          producer: "integration",
          actorType: "INTEGRATION",
          actorId: actor.actorId,
          payload: {
            evaluationId: evaluation.id,
            totalScore: evaluation.totalScore,
            isComplete: evaluation.isComplete(),
            missingQuestionIds: completeness.missingQuestionIds,
          },
        });
      }

      // Outbox event for evaluation creation
      await scope.outbox.record({
        eventType: "EvaluationCreated",
        eventVersion: 1,
        aggregateType: "Evaluation",
        aggregateId: evaluation.id,
        producer: "integration",
        actorType: "INTEGRATION",
        actorId: actor.actorId,
        payload: {
          evaluationId: evaluation.id,
          sourceSystem: sanitized.sourceSystem,
          externalEvaluationId: sanitized.externalEvaluationId,
          evaluationCycleId: evaluation.evaluationCycleId,
          scriptId: evaluation.scriptId,
          evaluatorId: evaluation.evaluatorId,
          rubricId: evaluation.rubricId,
          rubricVersion: evaluation.rubricVersion,
          questionCount: evaluation.questions.length,
          maxPossibleScore: evaluation.maxPossibleScore,
        },
      });

      // Immutable Audit Log entry
      await scope.audit.record({
        eventType: "OsmEvaluationIngested",
        actorType: "INTEGRATION",
        actorId: actor.actorId,
        entityType: "Evaluation",
        entityId: evaluation.id,
        action: "INGEST_OSM_EVALUATION",
        details: {
          sourceSystem: sanitized.sourceSystem,
          externalEvaluationId: sanitized.externalEvaluationId,
          scriptId: sanitized.scriptId,
          evaluatorId: sanitized.evaluatorId,
          evaluationCycleId: sanitized.evaluationCycleId,
          totalScore: evaluation.totalScore,
          isSubmitted: evaluation.status === "SUBMITTED",
          questionCount: evaluation.questions.length,
          marksCount: normalizedMarks.length,
        },
      });

      const responseResult: ExternalOsmIngestResult = {
        externalEvaluationId: sanitized.externalEvaluationId,
        evaluationId: evaluation.id,
        status: "CREATED",
        message: "Evaluation successfully ingested from external OSM.",
        totalScore: evaluation.totalScore,
        isSubmitted: evaluation.status === "SUBMITTED",
      };

      // Atomic Idempotency Record persistence
      try {
        await scope.idempotency.save({
          key: storageKey,
          requestHash: fingerprint,
          responseStatus: 201,
          responseBody: JSON.stringify(responseResult),
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        });
      } catch (err: unknown) {
        // Concurrency handling: catch SQLite UNIQUE constraint failure
        const errorMessage = (err as Error)?.message || "";
        if (
          errorMessage.includes("UNIQUE constraint failed") ||
          errorMessage.includes("constraint")
        ) {
          const concurrentWinner = await scope.idempotency.findByKey(storageKey);
          if (concurrentWinner) {
            if (concurrentWinner.requestHash === fingerprint) {
              const cached = JSON.parse(
                concurrentWinner.responseBody
              ) as ExternalOsmIngestResult;
              return {
                ...cached,
                status: "IDEMPOTENT_REPLAY",
                message: "Idempotent replay: evaluation already ingested concurrently.",
              };
            } else {
              throw new ConcurrencyConflictError(
                "IdempotencyRecord",
                scopedKey,
                1,
                0
              );
            }
          }
        }
        throw err;
      }

      return responseResult;
    });
  }
}

export class IngestOsmBatchHandler {
  constructor(private readonly singleHandler: IngestOsmEvaluationHandler) {}

  async execute(
    batchPayload: ExternalOsmBatchImport,
    actor: IntegrationActorContext
  ): Promise<ExternalOsmBatchResult> {
    const results: ExternalOsmIngestResult[] = [];
    let createdCount = 0;
    let replayedCount = 0;
    let failedCount = 0;

    for (const item of batchPayload.evaluations) {
      try {
        const itemResult = await this.singleHandler.execute(item, actor);
        results.push(itemResult);

        if (itemResult.status === "CREATED") {
          createdCount++;
        } else if (itemResult.status === "IDEMPOTENT_REPLAY") {
          replayedCount++;
        }
      } catch (err: unknown) {
        failedCount++;
        const errorMessage = (err as Error)?.message || "Unknown error";
        results.push({
          externalEvaluationId: item.externalEvaluationId,
          evaluationId: "",
          status: "FAILED",
          message: `Ingestion failed: ${errorMessage}`,
          totalScore: 0,
          isSubmitted: false,
          error: errorMessage,
        });
      }
    }

    return {
      batchId: batchPayload.batchId,
      sourceSystem: batchPayload.sourceSystem,
      totalCount: batchPayload.evaluations.length,
      createdCount,
      replayedCount,
      failedCount,
      results,
    };
  }
}

export class OsmIntegrationAdapter implements OsmIntegrationPort {
  private readonly singleHandler: IngestOsmEvaluationHandler;
  private readonly batchHandler: IngestOsmBatchHandler;

  constructor(
    uow: UnitOfWork,
    idempotencyRepo?: IdempotencyRepository,
    normalizer?: OsmDataNormalizer
  ) {
    this.singleHandler = new IngestOsmEvaluationHandler(
      uow,
      idempotencyRepo,
      normalizer
    );
    this.batchHandler = new IngestOsmBatchHandler(this.singleHandler);
  }

  async ingestEvaluation(
    payload: ExternalOsmEvaluation,
    actor: IntegrationActorContext
  ): Promise<ExternalOsmIngestResult> {
    return this.singleHandler.execute(payload, actor);
  }

  async ingestBatch(
    payload: ExternalOsmBatchImport,
    actor: IntegrationActorContext
  ): Promise<ExternalOsmBatchResult> {
    return this.batchHandler.execute(payload, actor);
  }
}
