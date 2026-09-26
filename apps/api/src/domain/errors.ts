/**
 * Domain-specific errors for OSM.
 * Conforms to docs/contracts/05-domain-contract.md and docs/contracts/02-architecture-contract.md §9.
 */

export abstract class DomainError extends Error {
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class InvalidMarkError extends DomainError {
  readonly code = "INVALID_MARK";

  constructor(
    public readonly questionId: string,
    public readonly awardedMarks: number,
    public readonly maxMarks: number,
    message?: string
  ) {
    super(
      message ??
        `Invalid mark ${awardedMarks} for question ${questionId}. Must be between 0 and maximum permitted marks (${maxMarks}).`
    );
  }
}

export class EvaluationLockedError extends DomainError {
  readonly code = "EVALUATION_LOCKED";

  constructor(public readonly evaluationId: string, public readonly currentStatus: string) {
    super(
      `Cannot modify evaluation ${evaluationId} in status '${currentStatus}'. Evaluation is locked once submitted or finalized.`
    );
  }
}

export class InvalidStateTransitionError extends DomainError {
  readonly code = "INVALID_STATE_TRANSITION";

  constructor(
    public readonly entity: string,
    public readonly fromStatus: string,
    public readonly toStatus: string
  ) {
    super(`Invalid state transition for ${entity} from '${fromStatus}' to '${toStatus}'.`);
  }
}

export class QuestionNotFoundError extends DomainError {
  readonly code = "QUESTION_NOT_FOUND";

  constructor(public readonly questionId: string, public readonly evaluationId: string) {
    super(`Question ${questionId} does not exist in evaluation ${evaluationId}.`);
  }
}

export class RubricVersionMismatchError extends DomainError {
  readonly code = "RUBRIC_VERSION_MISMATCH";

  constructor(public readonly expectedVersion: number, public readonly actualVersion: number) {
    super(
      `Rubric version mismatch. Expected immutable version ${expectedVersion}, but received ${actualVersion}.`
    );
  }
}

export class ConcurrencyConflictError extends DomainError {
  readonly code = "CONCURRENCY_CONFLICT";

  constructor(
    public readonly entity: string,
    public readonly id: string,
    public readonly expectedVersion: number,
    public readonly actualVersion?: number
  ) {
    super(
      `Concurrency conflict on ${entity} ${id}. Expected version ${expectedVersion}, but resource was modified concurrently.`
    );
  }
}

export class InvalidArgumentError extends DomainError {
  readonly code = "INVALID_ARGUMENT";

  constructor(message: string) {
    super(message);
  }
}

