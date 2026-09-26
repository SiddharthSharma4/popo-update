/**
 * Mark Value Object representing an awarded score for an evaluation item.
 * Conforms to docs/contracts/05-domain-contract.md §12.
 */

import { InvalidMarkError } from "../errors.js";

export interface MarkProps {
  questionId: string;
  awardedMarks: number;
  maxMarks: number;
  evaluatorId: string;
  comments?: string | null;
  isAnnotated?: boolean;
  assignedAt?: string;
}

export class Mark {
  readonly questionId: string;
  readonly awardedMarks: number;
  readonly maxMarks: number;
  readonly evaluatorId: string;
  readonly comments: string | null;
  readonly isAnnotated: boolean;
  readonly assignedAt: string;

  private constructor(props: MarkProps) {
    this.questionId = props.questionId;
    this.awardedMarks = props.awardedMarks;
    this.maxMarks = props.maxMarks;
    this.evaluatorId = props.evaluatorId;
    this.comments = props.comments ?? null;
    this.isAnnotated = props.isAnnotated ?? false;
    this.assignedAt = props.assignedAt ?? new Date().toISOString();
  }

  /**
   * Factory method enforcing domain mark invariants:
   * 0 <= awardedMarks <= maxMarks
   * evaluatorId must be present
   */
  static create(props: MarkProps): Mark {
    if (typeof props.awardedMarks !== "number" || isNaN(props.awardedMarks)) {
      throw new InvalidMarkError(
        props.questionId,
        props.awardedMarks,
        props.maxMarks,
        `Awarded mark must be a valid numeric value for question ${props.questionId}.`
      );
    }

    if (props.awardedMarks < 0 || props.awardedMarks > props.maxMarks) {
      throw new InvalidMarkError(props.questionId, props.awardedMarks, props.maxMarks);
    }

    if (!props.evaluatorId || props.evaluatorId.trim() === "") {
      throw new Error(`Evaluator identity is required to attribute mark for question ${props.questionId}.`);
    }

    if (props.maxMarks <= 0) {
      throw new Error(`Maximum applicable marks for question ${props.questionId} must be greater than zero.`);
    }

    return new Mark({
      ...props,
      evaluatorId: props.evaluatorId.trim(),
    });
  }

  /**
   * Value equality check for value objects.
   */
  equals(other: Mark): boolean {
    if (!(other instanceof Mark)) return false;
    return (
      this.questionId === other.questionId &&
      this.awardedMarks === other.awardedMarks &&
      this.maxMarks === other.maxMarks &&
      this.evaluatorId === other.evaluatorId &&
      this.comments === other.comments &&
      this.isAnnotated === other.isAnnotated
    );
  }

  toJSON() {
    return {
      questionId: this.questionId,
      awardedMarks: this.awardedMarks,
      maxMarks: this.maxMarks,
      evaluatorId: this.evaluatorId,
      comments: this.comments,
      isAnnotated: this.isAnnotated,
      assignedAt: this.assignedAt,
    };
  }
}
