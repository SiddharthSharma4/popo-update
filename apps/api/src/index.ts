/**
 * OSM API application entry point.
 * Initializes configuration, persistence, migrations, and starts HTTP server.
 * Conforms to docs/contracts/02-architecture-contract.md.
 */

import { loadConfig } from "./config/index.js";
import { createDatabase } from "./infrastructure/database/database.js";
import { runMigrations } from "./infrastructure/database/migrator.js";
import { createServer } from "./presentation/server.js";
import { logger } from "./infrastructure/logging/logger.js";

async function main(): Promise<void> {
  try {
    const config = loadConfig();
    logger.info("Starting OSM API Server...", { env: config.NODE_ENV, port: config.PORT });

    // Initialize database and run migrations
    const db = createDatabase(config.DATABASE_URL);
    await runMigrations(db);

    // Create and start Fastify server
    const app = await createServer({ config, db });
    await app.listen({ port: config.PORT, host: config.HOST });

    logger.info(`OSM API listening at http://${config.HOST}:${config.PORT}/api/v1/health`);
  } catch (error) {
    logger.error("Failed to start OSM API Server", error);
    process.exit(1);
  }
}

// Start application if called directly
if (process.env.NODE_ENV !== "test") {
  main();
}
