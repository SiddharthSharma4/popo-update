/**
 * Kysely implementation of ResolutionRepository.
 * Conforms to:
 * - docs/contracts/08-data-contract.md §22-23
 * - docs/contracts/05-domain-contract.md §25-28
 * - docs/contracts/02-architecture-contract.md §8
 */

import type { KyselyDb, KyselyTx } from "../database/database.js";
import type { ResolutionsTable } from "../database/types.js";
import {
  Resolution,
  ResolutionOutcome,
  type ResolutionRepository,
} from "../../domain/moderation/index.js";

export class KyselyResolutionRepository implements ResolutionRepository {
  constructor(private readonly db: KyselyDb | KyselyTx) {}

  private toDomain(row: ResolutionsTable): Resolution {
    let evidenceReferences: string[] = [];
    if (row.evidence_references) {
      try {
        const parsed = JSON.parse(row.evidence_references);
        if (Array.isArray(parsed)) {
          evidenceReferences = parsed;
        }
      } catch {
        evidenceReferences = [];
      }
    }

    return Resolution.reconstitute({
      id: row.id,
      triageCaseId: row.triage_case_id,
      evaluationId: row.evaluation_id,
      outcome: row.outcome as ResolutionOutcome,
      reason: row.reason,
      moderatorId: row.moderator_id,
      notes: row.notes,
      evidenceReferences,
      createdAt: row.created_at,
    });
  }

  async findById(id: string): Promise<Resolution | null> {
    const row = await this.db
      .selectFrom("resolutions")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();

    if (!row) return null;
    return this.toDomain(row);
  }

  async findByTriageCaseId(triageCaseId: string): Promise<Resolution | null> {
    const row = await this.db
      .selectFrom("resolutions")
      .selectAll()
      .where("triage_case_id", "=", triageCaseId)
      .executeTakeFirst();

    if (!row) return null;
    return this.toDomain(row);
  }

  async findByEvaluationId(evaluationId: string): Promise<Resolution[]> {
    const rows = await this.db
      .selectFrom("resolutions")
      .selectAll()
      .where("evaluation_id", "=", evaluationId)
      .orderBy("created_at", "asc")
      .execute();

    return rows.map((r) => this.toDomain(r));
  }

  async save(resolution: Resolution): Promise<void> {
    const existing = await this.db
      .selectFrom("resolutions")
      .select("id")
      .where("id", "=", resolution.id)
      .executeTakeFirst();

    const evidenceJson =
      resolution.evidenceReferences.length > 0
        ? JSON.stringify(resolution.evidenceReferences)
        : null;

    if (existing) {
      // Resolutions are immutable historical records; if already exists, update non-key fields idempotently
      await this.db
        .updateTable("resolutions")
        .set({
          outcome: resolution.outcome,
          reason: resolution.reason,
          moderator_id: resolution.moderatorId,
          notes: resolution.notes,
          evidence_references: evidenceJson,
        })
        .where("id", "=", resolution.id)
        .execute();
    } else {
      await this.db
        .insertInto("resolutions")
        .values({
          id: resolution.id,
          triage_case_id: resolution.triageCaseId,
          evaluation_id: resolution.evaluationId,
          outcome: resolution.outcome,
          reason: resolution.reason,
          moderator_id: resolution.moderatorId,
          notes: resolution.notes,
          evidence_references: evidenceJson,
          created_at: resolution.createdAt,
        })
        .execute();
    }
  }

  async findAll(): Promise<Resolution[]> {
    const rows = await this.db
      .selectFrom("resolutions")
      .selectAll()
      .orderBy("created_at", "asc")
      .execute();

    return rows.map((r) => this.toDomain(r));
  }

  async delete(id: string): Promise<void> {
    await this.db.deleteFrom("resolutions").where("id", "=", id).execute();
  }
}
