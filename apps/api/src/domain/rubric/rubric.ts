/**
 * Rubric aggregate model representing marking criteria and performance levels.
 * Conforms to docs/contracts/05-domain-contract.md §13.
 */

export interface RubricLevelProps {
  title: string;
  marks: number;
  description: string;
}

export class RubricLevel {
  readonly title: string;
  readonly marks: number;
  readonly description: string;

  constructor(props: RubricLevelProps) {
    this.title = props.title;
    this.marks = props.marks;
    this.description = props.description;
  }
}

export interface RubricCriterionProps {
  id: string;
  title: string;
  maxMarks: number;
  description?: string;
  levels?: RubricLevelProps[];
}

export class RubricCriterion {
  readonly id: string;
  readonly title: string;
  readonly maxMarks: number;
  readonly description: string;
  readonly levels: RubricLevel[];

  constructor(props: RubricCriterionProps) {
    this.id = props.id;
    this.title = props.title;
    this.maxMarks = props.maxMarks;
    this.description = props.description ?? "";
    this.levels = (props.levels ?? []).map((l) => new RubricLevel(l));
  }
}

export interface RubricProps {
  id: string;
  title: string;
  version: number;
  criteria: RubricCriterionProps[];
  createdAt?: string;
}

export class Rubric {
  readonly id: string;
  readonly title: string;
  readonly version: number;
  readonly criteria: RubricCriterion[];
  readonly createdAt: string;

  constructor(props: RubricProps) {
    if (!props.id || props.id.trim() === "") {
      throw new Error("Rubric ID must be provided.");
    }
    if (props.version < 1) {
      throw new Error("Rubric version must be a positive integer.");
    }

    this.id = props.id.trim();
    this.title = props.title;
    this.version = props.version;
    this.criteria = props.criteria.map((c) => new RubricCriterion(c));
    this.createdAt = props.createdAt ?? new Date().toISOString();
  }

  get totalMaxMarks(): number {
    return this.criteria.reduce((sum, c) => sum + c.maxMarks, 0);
  }

  getCriterion(id: string): RubricCriterion | undefined {
    return this.criteria.find((c) => c.id === id);
  }

  toJSON() {
    return {
      id: this.id,
      title: this.title,
      version: this.version,
      criteria: this.criteria,
      totalMaxMarks: this.totalMaxMarks,
      createdAt: this.createdAt,
    };
  }
}
