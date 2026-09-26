/**
 * Question Entity representing an evaluable item within an assessment context.
 * Conforms to docs/contracts/05-domain-contract.md §11.
 */

export interface QuestionProps {
  id: string;
  questionNumber: string;
  text: string;
  maxMarks: number;
  rubricCriteriaId?: string | null;
  orderIndex: number;
}

export class Question {
  readonly id: string;
  readonly questionNumber: string;
  readonly text: string;
  readonly maxMarks: number;
  readonly rubricCriteriaId: string | null;
  readonly orderIndex: number;

  private constructor(props: QuestionProps) {
    this.id = props.id;
    this.questionNumber = props.questionNumber;
    this.text = props.text;
    this.maxMarks = props.maxMarks;
    this.rubricCriteriaId = props.rubricCriteriaId ?? null;
    this.orderIndex = props.orderIndex;
  }

  static create(props: QuestionProps): Question {
    if (!props.id || props.id.trim() === "") {
      throw new Error("Question ID must be specified.");
    }

    if (!props.questionNumber || props.questionNumber.trim() === "") {
      throw new Error(`Question number must be specified for question ${props.id}.`);
    }

    if (typeof props.maxMarks !== "number" || props.maxMarks <= 0) {
      throw new Error(`Maximum marks for question ${props.id} must be a positive number.`);
    }

    return new Question({
      ...props,
      id: props.id.trim(),
      questionNumber: props.questionNumber.trim(),
      text: props.text?.trim() ?? "",
    });
  }

  toJSON() {
    return {
      id: this.id,
      questionNumber: this.questionNumber,
      text: this.text,
      maxMarks: this.maxMarks,
      rubricCriteriaId: this.rubricCriteriaId,
      orderIndex: this.orderIndex,
    };
  }
}
