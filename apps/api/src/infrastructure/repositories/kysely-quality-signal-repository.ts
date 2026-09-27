/**
 * Kysely implementation of QualitySignalRepository.
 * Conforms to:
 * - docs/contracts/08-data-contract.md §17-18
 * - docs/contracts/05-domain-contract.md §19-21
 * - docs/contracts/02-architecture-contract.md §8
 *
 * Implements deduplication and idempotency on (evaluation_id, evaluation_version, detector_name, signal_type).
 */

import type { KyselyDb, KyselyTx } from "../database/database.js";
import type { QualitySignalsTable } from "../database/types.js";
import {
  QualitySignal,
  SignalSeverity,
  QualitySignalStatus,
  type QualitySignalRepository,
} from "../../domain/quality-signal/index.js";

export class KyselyQualitySignalRepository implements QualitySignalRepository {
  constructor(private readonly db: KyselyDb | KyselyTx) {}

  private toDomain(row: QualitySignalsTable): QualitySignal {
    return QualitySignal.reconstitute({
      id: row.id,
      evaluationId: row.evaluation_id,
      evaluationVersion: row.evaluation_version,
      signalType: row.signal_type,
      severity: row.severity as SignalSeverity,
      status: row.status as QualitySignalStatus,
      summary: row.summary,
      evidence: JSON.parse(row.evidence),
      detector: {
        type: row.detector_type as "DETERMINISTIC" | "STATISTICAL" | "AI",
        name: row.detector_name,
        version: row.detector_version,
      },
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }

  async findById(id: string): Promise<QualitySignal | null> {
    const row = await this.db
      .selectFrom("quality_signals")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();

    if (!row) return null;
    return this.toDomain(row);
  }

  async findByEvaluationId(evaluationId: string): Promise<QualitySignal[]> {
    const rows = await this.db
      .selectFrom("quality_signals")
      .selectAll()
      .where("evaluation_id", "=", evaluationId)
      .orderBy("created_at", "asc")
      .execute();

    return rows.map((r) => this.toDomain(r));
  }

  async findReviewable(): Promise<QualitySignal[]> {
    const rows = await this.db
      .selectFrom("quality_signals")
      .selectAll()
      .where("status", "=", QualitySignalStatus.REVIEWABLE)
      .orderBy("created_at", "asc")
      .execute();

    return rows.map((r) => this.toDomain(r));
  }

  async findAll(): Promise<QualitySignal[]> {
    const rows = await this.db
      .selectFrom("quality_signals")
      .selectAll()
      .orderBy("created_at", "asc")
      .execute();

    return rows.map((r) => this.toDomain(r));
  }

  async findByEvaluationAndType(
    evaluationId: string,
    version: number,
    detectorName: string,
    signalType: string
  ): Promise<QualitySignal | null> {
    const row = await this.db
      .selectFrom("quality_signals")
      .selectAll()
      .where("evaluation_id", "=", evaluationId)
      .where("evaluation_version", "=", version)
      .where("detector_name", "=", detectorName)
      .where("signal_type", "=", signalType)
      .executeTakeFirst();

    if (!row) return null;
    return this.toDomain(row);
  }

  async save(signal: QualitySignal): Promise<void> {
    // Deduplication / idempotency check: check by id or by (evaluation_id, evaluation_version, detector_name, signal_type)
    const existing = await this.db
      .selectFrom("quality_signals")
      .selectAll()
      .where((eb) =>
        eb.or([
          eb("id", "=", signal.id),
          eb.and([
            eb("evaluation_id", "=", signal.evaluationId),
            eb("evaluation_version", "=", signal.evaluationVersion),
            eb("detector_name", "=", signal.detector.name),
            eb("signal_type", "=", signal.signalType),
          ]),
        ])
      )
      .executeTakeFirst();

    if (existing) {
      await this.db
        .updateTable("quality_signals")
        .set({
          evaluation_version: signal.evaluationVersion,
          signal_type: signal.signalType,
          severity: signal.severity,
          status: signal.status,
          summary: signal.summary,
          evidence: JSON.stringify(signal.evidence),
          detector_type: signal.detector.type,
          detector_name: signal.detector.name,
          detector_version: signal.detector.version,
          updated_at: signal.updatedAt,
        })
        .where("id", "=", existing.id)
        .execute();
    } else {
      await this.db
        .insertInto("quality_signals")
        .values({
          id: signal.id,
          evaluation_id: signal.evaluationId,
          evaluation_version: signal.evaluationVersion,
          signal_type: signal.signalType,
          severity: signal.severity,
          status: signal.status,
          summary: signal.summary,
          evidence: JSON.stringify(signal.evidence),
          detector_type: signal.detector.type,
          detector_name: signal.detector.name,
          detector_version: signal.detector.version,
          created_at: signal.createdAt,
          updated_at: signal.updatedAt,
        })
        .execute();
    }
  }

  async delete(id: string): Promise<void> {
    await this.db.deleteFrom("quality_signals").where("id", "=", id).execute();
  }
}
