/**
 * HTTP presentation layer error mapper.
 * Translates domain, application, validation, and system errors into contract-compliant HTTP error responses.
 * Conforms to docs/contracts/06-api-contract.md §41, §42, §43.
 */

import { ZodError } from "zod";
import type { ApiErrorResponse } from "@osm/shared";
import {
  DomainError,
  InvalidMarkError,
  EvaluationLockedError,
  InvalidStateTransitionError,
  QuestionNotFoundError,
  RubricVersionMismatchError,
  ConcurrencyConflictError,
} from "../../domain/errors.js";
import {
  ApplicationError,
  EntityNotFoundError,
  UnauthorizedActionError,
  InvalidCommandError,
} from "../../application/common/errors.js";

export interface MappedErrorResult {
  statusCode: number;
  payload: ApiErrorResponse;
}

export function mapErrorToHttpResponse(
  error: unknown,
  isProduction: boolean = false
): MappedErrorResult {
  const timestamp = new Date().toISOString();

  // 1. Zod schema validation errors at presentation boundary -> 400 Bad Request
  if (error instanceof ZodError) {
    return {
      statusCode: 400,
      payload: {
        statusCode: 400,
        error: "ValidationError",
        code: "VALIDATION_FAILED",
        message: "The request payload failed schema validation.",
        details: error.flatten ? error.flatten() : error.issues,
        timestamp,
      },
    };
  }

  // 2. Resource Not Found errors -> 404 Not Found
  if (error instanceof EntityNotFoundError) {
    return {
      statusCode: 404,
      payload: {
        statusCode: 404,
        error: "EntityNotFoundError",
        code: error.code,
        message: error.message,
        details: { entity: error.entity, id: error.id },
        timestamp,
      },
    };
  }

  if (error instanceof QuestionNotFoundError) {
    return {
      statusCode: 404,
      payload: {
        statusCode: 404,
        error: "QuestionNotFoundError",
        code: error.code,
        message: error.message,
        details: { questionId: error.questionId, evaluationId: error.evaluationId },
        timestamp,
      },
    };
  }

  // 3. Authorization errors (e.g. AI actor, unauthorized evaluator) -> 403 Forbidden
  if (error instanceof UnauthorizedActionError) {
    return {
      statusCode: 403,
      payload: {
        statusCode: 403,
        error: "UnauthorizedActionError",
        code: error.code,
        message: error.message,
        details: { action: error.action },
        timestamp,
      },
    };
  }

  // 4. Invalid Command or Invalid Domain Marks -> 400 Bad Request
  if (error instanceof InvalidMarkError) {
    return {
      statusCode: 400,
      payload: {
        statusCode: 400,
        error: "InvalidMarkError",
        code: error.code,
        message: error.message,
        details: {
          questionId: error.questionId,
          awardedMarks: error.awardedMarks,
          maxMarks: error.maxMarks,
        },
        timestamp,
      },
    };
  }

  if (error instanceof InvalidCommandError) {
    return {
      statusCode: 400,
      payload: {
        statusCode: 400,
        error: "InvalidCommandError",
        code: error.code,
        message: error.message,
        details: { commandName: error.commandName },
        timestamp,
      },
    };
  }

  // 5. Concurrency, locked state, or invalid lifecycle transitions -> 409 Conflict
  if (error instanceof ConcurrencyConflictError) {
    return {
      statusCode: 409,
      payload: {
        statusCode: 409,
        error: "ConcurrencyConflictError",
        code: error.code,
        message: error.message,
        details: {
          entity: error.entity,
          id: error.id,
          expectedVersion: error.expectedVersion,
          actualVersion: error.actualVersion,
        },
        timestamp,
      },
    };
  }

  if (error instanceof EvaluationLockedError) {
    return {
      statusCode: 409,
      payload: {
        statusCode: 409,
        error: "EvaluationLockedError",
        code: error.code,
        message: error.message,
        details: {
          evaluationId: error.evaluationId,
          currentStatus: error.currentStatus,
        },
        timestamp,
      },
    };
  }

  if (error instanceof InvalidStateTransitionError) {
    return {
      statusCode: 409,
      payload: {
        statusCode: 409,
        error: "InvalidStateTransitionError",
        code: error.code,
        message: error.message,
        details: {
          entity: error.entity,
          fromStatus: error.fromStatus,
          toStatus: error.toStatus,
        },
        timestamp,
      },
    };
  }

  if (error instanceof RubricVersionMismatchError) {
    return {
      statusCode: 409,
      payload: {
        statusCode: 409,
        error: "RubricVersionMismatchError",
        code: error.code,
        message: error.message,
        details: {
          expectedVersion: error.expectedVersion,
          actualVersion: error.actualVersion,
        },
        timestamp,
      },
    };
  }

  // 6. Generic domain or application errors fallback
  if (error instanceof DomainError || error instanceof ApplicationError) {
    return {
      statusCode: 400,
      payload: {
        statusCode: 400,
        error: error.name,
        code: error.code,
        message: error.message,
        timestamp,
      },
    };
  }

  // 7. Fastify or generic HTTP errors (e.g. malformed JSON syntax)
  const candidate = error as { statusCode?: number; status?: number; name?: string; message?: string; code?: string };
  if (typeof candidate?.statusCode === "number" && candidate.statusCode >= 400 && candidate.statusCode < 500) {
    return {
      statusCode: candidate.statusCode,
      payload: {
        statusCode: candidate.statusCode,
        error: candidate.name || "BadRequest",
        code: candidate.code || "BAD_REQUEST",
        message: candidate.message || "Bad Request",
        timestamp,
      },
    };
  }

  // 8. Unexpected internal server errors -> 500
  const message = isProduction
    ? "An internal server error occurred"
    : error instanceof Error
    ? error.message
    : "Unknown internal server error";

  return {
    statusCode: 500,
    payload: {
      statusCode: 500,
      error: "InternalServerError",
      code: "INTERNAL_SERVER_ERROR",
      message,
      timestamp,
    },
  };
}
