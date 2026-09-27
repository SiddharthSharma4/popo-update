/**
 * Database migration runner.
 * Conforms to docs/contracts/08-data-contract.md §37.
 */

import type { KyselyDb } from "./database.js";
import * as migration001 from "./migrations/001_foundation.js";
import * as migration002 from "./migrations/002_authoritative_domain.js";
import * as migration003 from "./migrations/003_quality_signals.js";
import * as migration004 from "./migrations/004_triage_cases.js";
import * as migration005 from "./migrations/005_resolutions.js";
import { logger } from "../logging/logger.js";

export async function runMigrations(db: KyselyDb): Promise<void> {
  logger.info("Executing database migrations...");
  try {
    // Run migrations sequentially
    await migration001.up(db);
    await migration002.up(db);
    await migration003.up(db);
    await migration004.up(db);
    await migration005.up(db);
    logger.info("Database migrations completed successfully.");
  } catch (error) {
    logger.error("Failed to run database migrations", error);
    throw error;
  }
}
