/**
 * Evaluation Aggregate Root.
 * Represents an authoritative evaluation/marking instance for an examination script.
 * Conforms to docs/contracts/05-domain-contract.md §10, §38, §40.
 */

import {
  EvaluationLockedError,
  InvalidStateTransitionError,
  QuestionNotFoundError,
} from "../errors.js";
import { Mark, MarkProps } from "./mark.js";
import { Question, QuestionProps } from "./question.js";

export type EvaluationStatus = "DRAFT" | "IN_PROGRESS" | "SUBMITTED" | "FINALIZED";

export interface EvaluationProps {
  id: string;
  evaluationCycleId: string;
  scriptId: string;
  evaluatorId: string;
  rubricId: string;
  rubricVersion: number;
  status?: EvaluationStatus;
  questions: (Question | QuestionProps)[];
  marks?: (Mark | MarkProps)[] | Map<string, Mark>;
  version?: number;
  submittedAt?: string | null;
  finalizedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AssignMarkParams {
  questionId: string;
  awardedMarks: number;
  evaluatorId: string;
  comments?: string | null;
  isAnnotated?: boolean;
}

export class Evaluation {
  readonly id: string;
  readonly evaluationCycleId: string;
  readonly scriptId: string;
  readonly evaluatorId: string;
  readonly rubricId: string;
  readonly rubricVersion: number;
  private _status: EvaluationStatus;
  private _questions: Map<string, Question>;
  private _marks: Map<string, Mark>;
  private _version: number;
  private _persistedVersion: number;
  private _submittedAt: string | null;
  private _finalizedAt: string | null;
  readonly createdAt: string;
  private _updatedAt: string;

  private constructor(props: {
    id: string;
    evaluationCycleId: string;
    scriptId: string;
    evaluatorId: string;
    rubricId: string;
    rubricVersion: number;
    status: EvaluationStatus;
    questions: Map<string, Question>;
    marks: Map<string, Mark>;
    version: number;
    submittedAt: string | null;
    finalizedAt: string | null;
    createdAt: string;
    updatedAt: string;
  }) {
    this.id = props.id;
    this.evaluationCycleId = props.evaluationCycleId;
    this.scriptId = props.scriptId;
    this.evaluatorId = props.evaluatorId;
    this.rubricId = props.rubricId;
    this.rubricVersion = props.rubricVersion;
    this._status = props.status;
    this._questions = props.questions;
    this._marks = props.marks;
    this._version = props.version;
    this._persistedVersion = props.version;
    this._submittedAt = props.submittedAt;
    this._finalizedAt = props.finalizedAt;
    this.createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  /**
   * Factory method to create or reconstruct an Evaluation aggregate.
   */
  static create(props: EvaluationProps): Evaluation {
    if (!props.id || props.id.trim() === "") {
      throw new Error("Evaluation ID is required.");
    }
    if (!props.evaluationCycleId || props.evaluationCycleId.trim() === "") {
      throw new Error("EvaluationCycle ID is required.");
    }
    if (!props.scriptId || props.scriptId.trim() === "") {
      throw new Error("Script/Submission reference ID is required.");
    }
    if (!props.evaluatorId || props.evaluatorId.trim() === "") {
      throw new Error("Assigned evaluator ID is required.");
    }
    if (!props.rubricId || props.rubricId.trim() === "") {
      throw new Error("Rubric reference ID is required.");
    }
    if (!props.rubricVersion || props.rubricVersion < 1) {
      throw new Error("Valid rubric version (>= 1) is required.");
    }
    if (!props.questions || props.questions.length === 0) {
      throw new Error("Evaluation must contain at least one question.");
    }

    const questionMap = new Map<string, Question>();
    for (const q of props.questions) {
      const questionEntity = q instanceof Question ? q : Question.create(q);
      questionMap.set(questionEntity.id, questionEntity);
    }

    const markMap = new Map<string, Mark>();
    if (props.marks) {
      if (props.marks instanceof Map) {
        for (const [k, v] of props.marks.entries()) {
          markMap.set(k, v);
        }
      } else {
        for (const m of props.marks) {
          const markEntity = m instanceof Mark ? m : Mark.create(m);
          markMap.set(markEntity.questionId, markEntity);
        }
      }
    }

    const now = new Date().toISOString();

    return new Evaluation({
      id: props.id.trim(),
      evaluationCycleId: props.evaluationCycleId.trim(),
      scriptId: props.scriptId.trim(),
      evaluatorId: props.evaluatorId.trim(),
      rubricId: props.rubricId.trim(),
      rubricVersion: props.rubricVersion,
      status: props.status ?? "DRAFT",
      questions: questionMap,
      marks: markMap,
      version: props.version ?? 1,
      submittedAt: props.submittedAt ?? null,
      finalizedAt: props.finalizedAt ?? null,
      createdAt: props.createdAt ?? now,
      updatedAt: props.updatedAt ?? now,
    });
  }

  get status(): EvaluationStatus {
    return this._status;
  }

  get version(): number {
    return this._version;
  }

  get persistedVersion(): number {
    return this._persistedVersion;
  }

  /**
   * Synchronizes persisted version with in-memory version after successful DB write.
   */
  commitVersion(): void {
    this._persistedVersion = this._version;
  }

  get submittedAt(): string | null {
    return this._submittedAt;
  }

  get finalizedAt(): string | null {
    return this._finalizedAt;
  }

  get updatedAt(): string {
    return this._updatedAt;
  }

  get questions(): Question[] {
    return Array.from(this._questions.values()).sort((a, b) => a.orderIndex - b.orderIndex);
  }

  get marks(): Map<string, Mark> {
    return new Map(this._marks);
  }

  get totalScore(): number {
    let sum = 0;
    for (const mark of this._marks.values()) {
      sum += mark.awardedMarks;
    }
    return sum;
  }

  get maxPossibleScore(): number {
    let sum = 0;
    for (const question of this._questions.values()) {
      sum += question.maxMarks;
    }
    return sum;
  }

  getQuestion(questionId: string): Question | undefined {
    return this._questions.get(questionId);
  }

  getMark(questionId: string): Mark | undefined {
    return this._marks.get(questionId);
  }

  getAllMarks(): Mark[] {
    return Array.from(this._marks.values());
  }

  /**
   * Returns true if every question in the evaluation has an awarded mark.
   */
  isComplete(): boolean {
    return this.getMissingQuestionIds().length === 0;
  }

  /**
   * Returns an array of question IDs that have not yet been evaluated/marked.
   */
  getMissingQuestionIds(): string[] {
    const missing: string[] = [];
    for (const [id] of this._questions) {
      if (!this._marks.has(id)) {
        missing.push(id);
      }
    }
    return missing;
  }

  /**
   * Assigns or updates a mark for a specific question within this evaluation.
   * Enforces:
   * - Evaluation cannot be modified if SUBMITTED or FINALIZED
   * - Target question must belong to this evaluation
   * - Awarded mark cannot exceed question max marks (enforced via Mark VO)
   * - Evaluator attribution is recorded
   * - Updates status to IN_PROGRESS if currently DRAFT
   * - Increments optimistic concurrency version
   */
  assignMark(params: AssignMarkParams): Mark {
    if (this._status === "SUBMITTED" || this._status === "FINALIZED") {
      throw new EvaluationLockedError(this.id, this._status);
    }

    const question = this._questions.get(params.questionId);
    if (!question) {
      throw new QuestionNotFoundError(params.questionId, this.id);
    }

    const mark = Mark.create({
      questionId: params.questionId,
      awardedMarks: params.awardedMarks,
      maxMarks: question.maxMarks,
      evaluatorId: params.evaluatorId,
      comments: params.comments,
      isAnnotated: params.isAnnotated,
    });

    this._marks.set(params.questionId, mark);

    if (this._status === "DRAFT") {
      this._status = "IN_PROGRESS";
    }

    this._version += 1;
    this._updatedAt = new Date().toISOString();

    return mark;
  }

  /**
   * Submits the evaluation.
   * Enforces:
   * - Only DRAFT or IN_PROGRESS evaluations can be submitted
   * - Records submittedAt timestamp
   * - Increments optimistic concurrency version
   */
  submit(): void {
    if (this._status !== "DRAFT" && this._status !== "IN_PROGRESS") {
      throw new InvalidStateTransitionError("Evaluation", this._status, "SUBMITTED");
    }

    this._status = "SUBMITTED";
    this._submittedAt = new Date().toISOString();
    this._version += 1;
    this._updatedAt = new Date().toISOString();
  }

  /**
   * Finalizes the evaluation (e.g. after review or moderation).
   * Enforces:
   * - Only SUBMITTED evaluations can be finalized
   * - Records finalizedAt timestamp
   * - Increments optimistic concurrency version
   */
  finalize(): void {
    if (this._status !== "SUBMITTED") {
      throw new InvalidStateTransitionError("Evaluation", this._status, "FINALIZED");
    }

    this._status = "FINALIZED";
    this._finalizedAt = new Date().toISOString();
    this._version += 1;
    this._updatedAt = new Date().toISOString();
  }

  toJSON() {
    return {
      id: this.id,
      evaluationCycleId: this.evaluationCycleId,
      scriptId: this.scriptId,
      evaluatorId: this.evaluatorId,
      rubricId: this.rubricId,
      rubricVersion: this.rubricVersion,
      status: this._status,
      questions: this.questions.map((q) => q.toJSON()),
      marks: Array.from(this._marks.values()).map((m) => m.toJSON()),
      totalScore: this.totalScore,
      maxPossibleScore: this.maxPossibleScore,
      isComplete: this.isComplete(),
      version: this._version,
      submittedAt: this._submittedAt,
      finalizedAt: this._finalizedAt,
      createdAt: this.createdAt,
      updatedAt: this._updatedAt,
    };
  }
}
