/**
 * Kysely implementation of IdempotencyRepository.
 * Conforms to:
 * - docs/contracts/08-data-contract.md §37-40 (IdempotencyRecord, Scoped Uniqueness, Replay)
 * - docs/contracts/08-data-contract.md §119:L2690 (idempotency_records persistence)
 * - docs/contracts/06-api-contract.md §54-56 (External OSM Integration Boundary)
 *
 * Invariants:
 * - Primary key on `key` guarantees atomic concurrency protection via database constraint.
 * - Replay behavior returns cached logical response when request_hash matches.
 * - Conflicting request on identical key is detected via request_hash mismatch.
 */

import type { KyselyDb, KyselyTx } from "../database/database.js";
import type {
  IdempotencyRecord,
  IdempotencyRepository,
} from "../../application/common/unit-of-work.js";

export class KyselyIdempotencyRepository implements IdempotencyRepository {
  constructor(private readonly db: KyselyDb | KyselyTx) {}

  async findByKey(key: string): Promise<IdempotencyRecord | null> {
    const row = await this.db
      .selectFrom("idempotency_records")
      .selectAll()
      .where("key", "=", key)
      .executeTakeFirst();

    if (!row) {
      return null;
    }

    return {
      key: row.key,
      requestHash: row.request_hash,
      responseStatus: row.response_status,
      responseBody: row.response_body,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
    };
  }

  async save(record: IdempotencyRecord): Promise<void> {
    await this.db
      .insertInto("idempotency_records")
      .values({
        key: record.key,
        request_hash: record.requestHash,
        response_status: record.responseStatus,
        response_body: record.responseBody,
        created_at: record.createdAt,
        expires_at: record.expiresAt,
      })
      .execute();
  }
}
