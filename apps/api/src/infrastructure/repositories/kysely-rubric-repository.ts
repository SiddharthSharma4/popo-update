/**
 * Kysely implementation of RubricRepository.
 * Conforms to docs/contracts/08-data-contract.md §15-16 and docs/contracts/05-domain-contract.md §13.
 */

import type { KyselyDb, KyselyTx } from "../database/database.js";
import type { RubricsTable } from "../database/types.js";
import { Rubric, type RubricCriterionProps } from "../../domain/rubric/rubric.js";
import type { RubricRepository } from "../../domain/rubric/rubric-repository.js";

export class KyselyRubricRepository implements RubricRepository {
  constructor(private readonly db: KyselyDb | KyselyTx) {}

  private toDomain(row: RubricsTable): Rubric {
    const criteria = JSON.parse(row.criteria) as RubricCriterionProps[];
    return new Rubric({
      id: row.id,
      title: row.title,
      version: row.version,
      criteria,
      createdAt: row.created_at,
    });
  }

  async findByIdAndVersion(
    id: string,
    version: number,
    tx?: KyselyTx
  ): Promise<Rubric | null> {
    const row = await (tx ?? this.db)
      .selectFrom("rubrics")
      .selectAll()
      .where("id", "=", id)
      .where("version", "=", version)
      .executeTakeFirst();

    if (!row) return null;
    return this.toDomain(row);
  }

  async findLatestById(id: string, tx?: KyselyTx): Promise<Rubric | null> {
    const row = await (tx ?? this.db)
      .selectFrom("rubrics")
      .selectAll()
      .where("id", "=", id)
      .orderBy("version", "desc")
      .executeTakeFirst();

    if (!row) return null;
    return this.toDomain(row);
  }

  async save(rubric: Rubric, tx?: KyselyTx): Promise<void> {
    const executor = tx ?? this.db;

    const existing = await executor
      .selectFrom("rubrics")
      .select(["id", "version", "criteria", "title"])
      .where("id", "=", rubric.id)
      .where("version", "=", rubric.version)
      .executeTakeFirst();

    if (existing) {
      // Enforce Rubric Version Immutability (docs/contracts/08-data-contract.md §16)
      const existingCriteria = existing.criteria;
      const newCriteria = JSON.stringify(rubric.criteria);
      if (existingCriteria !== newCriteria || existing.title !== rubric.title) {
        throw new Error(
          `Cannot modify existing rubric version ${rubric.version} for rubric ${rubric.id}. Rubric versions are immutable once stored.`
        );
      }
      return;
    }

    await executor
      .insertInto("rubrics")
      .values({
        id: rubric.id,
        version: rubric.version,
        title: rubric.title,
        criteria: JSON.stringify(rubric.criteria),
        total_max_marks: rubric.totalMaxMarks,
        created_at: rubric.createdAt,
      })
      .execute();
  }

  async delete(id: string, version?: number, tx?: KyselyTx): Promise<void> {
    const executor = tx ?? this.db;
    let query = executor.deleteFrom("rubrics").where("id", "=", id);
    if (version !== undefined) {
      query = query.where("version", "=", version);
    }
    await query.execute();
  }
}
