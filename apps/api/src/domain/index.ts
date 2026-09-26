/**
 * OSM Core Domain Model Exports.
 * Conforms to docs/contracts/05-domain-contract.md.
 */

// Domain Errors
export * from "./errors.js";

// Evaluation Aggregate, Entities, Value Objects, and Repositories
export * from "./evaluation/evaluation.js";
export * from "./evaluation/mark.js";
export * from "./evaluation/question.js";
export * from "./evaluation/evaluation-repository.js";

// Rubric Aggregate, Entities, and Repositories
export * from "./rubric/rubric.js";
export * from "./rubric/rubric-repository.js";

// Validation Module & Completeness Check
export * from "./validation/index.js";

// QualitySignal Aggregate, Repository, and Generators
export * from "./quality-signal/index.js";

// Moderation & TriageCase Aggregate and Repository (TASK-P5-MOD-001)
export * from "./moderation/index.js";

