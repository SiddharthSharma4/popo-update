/**
 * Application Layer Exports for OSM.
 * Conforms to docs/contracts/02-architecture-contract.md §8.
 */

// Common & Unit of Work
export * from "./common/errors.js";
export * from "./common/unit-of-work.js";

// DTOs
export * from "./dtos/evaluation.dto.js";
export * from "./dtos/rubric.dto.js";
export * from "./dtos/quality-signal.dto.js";
export * from "./dtos/triage-case.dto.js";
export * from "./dtos/resolution.dto.js";
export * from "./dtos/audit-event.dto.js";

// Commands
export * from "./commands/create-evaluation.command.js";
export * from "./commands/assign-mark.command.js";
export * from "./commands/submit-evaluation.command.js";
export * from "./commands/create-rubric.command.js";
export * from "./commands/create-triage-case.command.js";
export * from "./commands/assign-triage-case.command.js";
export * from "./commands/resolve-triage-case.command.js";
export * from "./commands/ingest-osm-evaluation.command.js";

// Queries
export * from "./queries/get-evaluation-by-id.query.js";
export * from "./queries/get-rubric-by-id.query.js";
export * from "./queries/list-evaluations.query.js";
export * from "./queries/run-completeness-check.query.js";
export * from "./queries/get-quality-signals-by-evaluation.query.js";
export * from "./queries/get-triage-case-by-id.query.js";
export * from "./queries/list-triage-cases.query.js";
export * from "./queries/get-audit-event-by-id.query.js";
export * from "./queries/list-audit-events.query.js";



// Application Services
export * from "./services/evaluation.service.js";

// AI Subsystem
export * from "./ai/index.js";

// Analytics Subsystem
export * from "./analytics/index.js";

// Integration Subsystem
export * from "./integration/index.js";
