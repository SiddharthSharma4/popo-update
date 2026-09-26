/**
 * Database client instantiation and transaction runner using Kysely and SQLite.
 * Uses native Node.js SQLite (node:sqlite) for zero external C++ dependencies.
 * Conforms to docs/contracts/08-data-contract.md §3, §25, §28.
 */

import { DatabaseSync } from "node:sqlite";
import { Kysely, Transaction } from "kysely";
import fs from "node:fs";
import path from "node:path";
import type { Database } from "./types.js";
import { NodeSqliteDialect } from "./dialect.js";
import { logger } from "../logging/logger.js";

export type KyselyDb = Kysely<Database>;
export type KyselyTx = Transaction<Database>;

export function createDatabase(databaseUrl: string): KyselyDb {
  if (databaseUrl !== ":memory:") {
    const dir = path.dirname(path.resolve(databaseUrl));
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const nativeDb = new DatabaseSync(databaseUrl);

  // Enable WAL mode for high concurrency and foreign keys for referential integrity
  if (databaseUrl !== ":memory:") {
    nativeDb.exec("PRAGMA journal_mode = WAL;");
  }
  nativeDb.exec("PRAGMA foreign_keys = ON;");

  logger.info("Database initialized with SQLite/WAL", { databaseUrl });

  return new Kysely<Database>({
    dialect: new NodeSqliteDialect(nativeDb),
  });
}
