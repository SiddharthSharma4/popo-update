/**
 * Kysely implementation of TriageCaseRepository.
 * Conforms to:
 * - docs/contracts/08-data-contract.md §20-21
 * - docs/contracts/05-domain-contract.md §22-24
 * - docs/contracts/02-architecture-contract.md §8
 */

import type { KyselyDb, KyselyTx } from "../database/database.js";
import type { TriageCasesTable } from "../database/types.js";
import {
  TriageCase,
  TriageCaseStatus,
  type TriageCaseRepository,
  type ListTriageCasesFilter,
} from "../../domain/moderation/index.js";

export class KyselyTriageCaseRepository implements TriageCaseRepository {
  constructor(private readonly db: KyselyDb | KyselyTx) {}

  private toDomain(row: TriageCasesTable): TriageCase {
    return TriageCase.reconstitute({
      id: row.id,
      caseNumber: row.case_number,
      evaluationId: row.evaluation_id,
      evaluationCycleId: row.evaluation_cycle_id,
      qualitySignalId: row.quality_signal_id,
      status: row.status as TriageCaseStatus,
      priority: row.priority,
      assigneeId: row.assignee_id,
      notes: row.notes,
      version: row.version,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }

  async findById(id: string): Promise<TriageCase | null> {
    const row = await this.db
      .selectFrom("triage_cases")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();

    if (!row) return null;
    return this.toDomain(row);
  }

  async findByQualitySignalId(qualitySignalId: string): Promise<TriageCase | null> {
    const row = await this.db
      .selectFrom("triage_cases")
      .selectAll()
      .where("quality_signal_id", "=", qualitySignalId)
      .executeTakeFirst();

    if (!row) return null;
    return this.toDomain(row);
  }

  async findByEvaluationId(evaluationId: string): Promise<TriageCase[]> {
    const rows = await this.db
      .selectFrom("triage_cases")
      .selectAll()
      .where("evaluation_id", "=", evaluationId)
      .orderBy("created_at", "asc")
      .execute();

    return rows.map((r) => this.toDomain(r));
  }

  async list(filter?: ListTriageCasesFilter): Promise<TriageCase[]> {
    let query = this.db.selectFrom("triage_cases").selectAll();

    if (filter?.status) {
      query = query.where("status", "=", filter.status);
    }
    if (filter?.assigneeId) {
      query = query.where("assignee_id", "=", filter.assigneeId);
    }
    if (filter?.evaluationId) {
      query = query.where("evaluation_id", "=", filter.evaluationId);
    }

    const rows = await query.orderBy("created_at", "desc").execute();
    return rows.map((r) => this.toDomain(r));
  }

  async save(triageCase: TriageCase): Promise<void> {
    const existing = await this.db
      .selectFrom("triage_cases")
      .select("id")
      .where("id", "=", triageCase.id)
      .executeTakeFirst();

    if (existing) {
      await this.db
        .updateTable("triage_cases")
        .set({
          status: triageCase.status,
          priority: triageCase.priority,
          assignee_id: triageCase.assigneeId,
          notes: triageCase.notes,
          version: triageCase.version,
          updated_at: triageCase.updatedAt,
        })
        .where("id", "=", triageCase.id)
        .execute();
    } else {
      await this.db
        .insertInto("triage_cases")
        .values({
          id: triageCase.id,
          case_number: triageCase.caseNumber,
          evaluation_id: triageCase.evaluationId,
          evaluation_cycle_id: triageCase.evaluationCycleId,
          quality_signal_id: triageCase.qualitySignalId,
          status: triageCase.status,
          priority: triageCase.priority,
          assignee_id: triageCase.assigneeId,
          notes: triageCase.notes,
          version: triageCase.version,
          created_at: triageCase.createdAt,
          updated_at: triageCase.updatedAt,
        })
        .execute();
    }
  }

  async delete(id: string): Promise<void> {
    await this.db.deleteFrom("triage_cases").where("id", "=", id).execute();
  }
}
