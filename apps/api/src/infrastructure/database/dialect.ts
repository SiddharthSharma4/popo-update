/**
 * Node.js Native SQLite Dialect for Kysely.
 * Provides zero-native-dependency SQLite integration using Node 22.5+/24+ node:sqlite.
 * Conforms to docs/contracts/08-data-contract.md §3.
 */

import {
  type Dialect,
  type Driver,
  type DatabaseConnection,
  CompiledQuery,
  type QueryResult,
  SqliteAdapter,
  SqliteIntrospector,
  SqliteQueryCompiler,
  type Kysely,
} from "kysely";
import type { DatabaseSync } from "node:sqlite";

export class NodeSqliteConnection implements DatabaseConnection {
  constructor(private db: DatabaseSync) {}

  async executeQuery<R>(compiledQuery: CompiledQuery): Promise<QueryResult<R>> {
    const { sql, parameters } = compiledQuery;
    const stmt = this.db.prepare(sql);
    const upper = sql.trim().toUpperCase();

    if (upper.startsWith("SELECT") || upper.startsWith("PRAGMA") || upper.includes("RETURNING")) {
      const rows = stmt.all(...(parameters as any[])) as R[];
      return { rows };
    } else {
      const result = stmt.run(...(parameters as any[]));
      return {
        rows: [],
        numAffectedRows: BigInt(result.changes),
        insertId: BigInt(result.lastInsertRowid),
      };
    }
  }

  async *streamQuery<R>(compiledQuery: CompiledQuery): AsyncIterableIterator<QueryResult<R>> {
    yield await this.executeQuery<R>(compiledQuery);
  }
}

export class NodeSqliteDriver implements Driver {
  private connection: DatabaseConnection;

  constructor(private db: DatabaseSync) {
    this.connection = new NodeSqliteConnection(db);
  }

  async init(): Promise<void> {}

  async acquireConnection(): Promise<DatabaseConnection> {
    return this.connection;
  }

  async beginTransaction(conn: DatabaseConnection): Promise<void> {
    await conn.executeQuery(CompiledQuery.raw("BEGIN"));
  }

  async commitTransaction(conn: DatabaseConnection): Promise<void> {
    await conn.executeQuery(CompiledQuery.raw("COMMIT"));
  }

  async rollbackTransaction(conn: DatabaseConnection): Promise<void> {
    await conn.executeQuery(CompiledQuery.raw("ROLLBACK"));
  }

  async releaseConnection(): Promise<void> {}

  async destroy(): Promise<void> {
    this.db.close();
  }
}

export class NodeSqliteDialect implements Dialect {
  constructor(private db: DatabaseSync) {}

  createDriver(): Driver {
    return new NodeSqliteDriver(this.db);
  }

  createQueryCompiler(): SqliteQueryCompiler {
    return new SqliteQueryCompiler();
  }

  createAdapter(): SqliteAdapter {
    return new SqliteAdapter();
  }

  createIntrospector(db: Kysely<unknown>): SqliteIntrospector {
    return new SqliteIntrospector(db);
  }
}
