import path from "node:path";
import { createDatabase } from "../src/infrastructure/database/database.js";
import { KyselyUnitOfWork } from "../src/infrastructure/persistence/kysely-unit-of-work.js";
import { KyselyEvaluationRepository } from "../src/infrastructure/repositories/kysely-evaluation-repository.js";
import { KyselyRubricRepository } from "../src/infrastructure/repositories/kysely-rubric-repository.js";
import { KyselyQualitySignalRepository } from "../src/infrastructure/repositories/kysely-quality-signal-repository.js";
import { KyselyTriageCaseRepository } from "../src/infrastructure/repositories/kysely-triage-case-repository.js";
import { KyselyResolutionRepository } from "../src/infrastructure/repositories/kysely-resolution-repository.js";
import { DemoScenarioService } from "../src/application/demo/demo-scenario.service.js";

async function main() {
  const dbPath = path.resolve("./data/osm.db");
  console.log(`Connecting to database at: ${dbPath}`);

  const db = createDatabase(dbPath);
  const uow = new KyselyUnitOfWork(db);
  const evalRepo = new KyselyEvaluationRepository(db);
  const rubricRepo = new KyselyRubricRepository(db);
  const qualitySignalRepo = new KyselyQualitySignalRepository(db);
  const triageCaseRepo = new KyselyTriageCaseRepository(db);
  const resolutionRepo = new KyselyResolutionRepository(db);

  const demoService = new DemoScenarioService(
    uow,
    evalRepo,
    rubricRepo,
    qualitySignalRepo,
    triageCaseRepo,
    resolutionRepo
  );

  console.log("Executing canonical demo scenario reset...");
  const result = await demoService.resetCanonicalScenario({
    actorId: "admin_demo",
    userRole: "ADMIN",
    actorType: "USER",
  });

  console.log("Reset Result:", JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error("Reset failed:", err);
  process.exit(1);
});
