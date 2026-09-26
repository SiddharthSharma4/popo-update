/**
 * Application-layer errors for OSM.
 * Conforms to docs/contracts/02-architecture-contract.md §8 and docs/contracts/06-api-contract.md §29.
 */

export abstract class ApplicationError extends Error {
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class EntityNotFoundError extends ApplicationError {
  readonly code = "ENTITY_NOT_FOUND";

  constructor(public readonly entity: string, public readonly id: string) {
    super(`${entity} with id '${id}' was not found.`);
  }
}

export class UnauthorizedActionError extends ApplicationError {
  readonly code = "UNAUTHORIZED_ACTION";

  constructor(public readonly action: string, message?: string) {
    super(message ?? `Unauthorized to perform action: ${action}.`);
  }
}

export class InvalidCommandError extends ApplicationError {
  readonly code = "INVALID_COMMAND";

  constructor(public readonly commandName: string, message: string) {
    super(`Invalid command '${commandName}': ${message}`);
  }
}
