import { describe, it, expect } from "vitest";
import {
  Evaluation,
  Mark,
  Question,
  Rubric,
  InvalidMarkError,
  EvaluationLockedError,
  InvalidStateTransitionError,
  QuestionNotFoundError,
} from "../src/domain/index.js";

describe("Domain Model: Mark Value Object", () => {
  it("should create a valid Mark within bounds", () => {
    const mark = Mark.create({
      questionId: "q1",
      awardedMarks: 8,
      maxMarks: 10,
      evaluatorId: "evaluator-1",
      comments: "Good response",
    });

    expect(mark.questionId).toBe("q1");
    expect(mark.awardedMarks).toBe(8);
    expect(mark.maxMarks).toBe(10);
    expect(mark.evaluatorId).toBe("evaluator-1");
    expect(mark.comments).toBe("Good response");
    expect(mark.isAnnotated).toBe(false);
    expect(mark.assignedAt).toBeDefined();
  });

  it("should reject negative marks", () => {
    expect(() =>
      Mark.create({
        questionId: "q1",
        awardedMarks: -1,
        maxMarks: 10,
        evaluatorId: "evaluator-1",
      })
    ).toThrow(InvalidMarkError);
  });

  it("should reject marks exceeding maximum marks", () => {
    expect(() =>
      Mark.create({
        questionId: "q1",
        awardedMarks: 10.5,
        maxMarks: 10,
        evaluatorId: "evaluator-1",
      })
    ).toThrow(InvalidMarkError);
  });

  it("should reject NaN or non-numeric marks", () => {
    expect(() =>
      Mark.create({
        questionId: "q1",
        awardedMarks: NaN,
        maxMarks: 10,
        evaluatorId: "evaluator-1",
      })
    ).toThrow(InvalidMarkError);
  });

  it("should require evaluator attribution", () => {
    expect(() =>
      Mark.create({
        questionId: "q1",
        awardedMarks: 5,
        maxMarks: 10,
        evaluatorId: "",
      })
    ).toThrow(/evaluator identity is required/i);
  });

  it("should enforce value object equality", () => {
    const m1 = Mark.create({
      questionId: "q1",
      awardedMarks: 5,
      maxMarks: 10,
      evaluatorId: "evaluator-1",
      comments: "Ok",
    });
    const m2 = Mark.create({
      questionId: "q1",
      awardedMarks: 5,
      maxMarks: 10,
      evaluatorId: "evaluator-1",
      comments: "Ok",
    });
    const m3 = Mark.create({
      questionId: "q1",
      awardedMarks: 6,
      maxMarks: 10,
      evaluatorId: "evaluator-1",
      comments: "Ok",
    });

    expect(m1.equals(m2)).toBe(true);
    expect(m1.equals(m3)).toBe(false);
  });
});

describe("Domain Model: Question Entity", () => {
  it("should create a valid Question entity", () => {
    const question = Question.create({
      id: "q1",
      questionNumber: "1(a)",
      text: "Explain photosynthesis.",
      maxMarks: 10,
      orderIndex: 1,
    });

    expect(question.id).toBe("q1");
    expect(question.questionNumber).toBe("1(a)");
    expect(question.maxMarks).toBe(10);
    expect(question.orderIndex).toBe(1);
  });

  it("should reject Question with non-positive maxMarks", () => {
    expect(() =>
      Question.create({
        id: "q1",
        questionNumber: "1(a)",
        text: "Question",
        maxMarks: 0,
        orderIndex: 1,
      })
    ).toThrow(/positive number/);
  });
});

describe("Domain Model: Rubric Aggregate", () => {
  it("should compute totalMaxMarks across all criteria", () => {
    const rubric = new Rubric({
      id: "rubric-1",
      title: "Biology Exam Rubric",
      version: 1,
      criteria: [
        { id: "c1", title: "Conceptual Understanding", maxMarks: 15 },
        { id: "c2", title: "Diagram & Labeling", maxMarks: 10 },
      ],
    });

    expect(rubric.totalMaxMarks).toBe(25);
    expect(rubric.getCriterion("c1")?.title).toBe("Conceptual Understanding");
    expect(rubric.getCriterion("nonexistent")).toBeUndefined();
  });
});

describe("Domain Model: Evaluation Aggregate Root", () => {
  const createTestEvaluation = () => {
    return Evaluation.create({
      id: "eval-101",
      evaluationCycleId: "cycle-2026-term1",
      scriptId: "script-student-99",
      evaluatorId: "evaluator-prof-smith",
      rubricId: "rubric-1",
      rubricVersion: 1,
      questions: [
        {
          id: "q1",
          questionNumber: "1",
          text: "What is osmosis?",
          maxMarks: 10,
          orderIndex: 1,
        },
        {
          id: "q2",
          questionNumber: "2",
          text: "Draw plant cell.",
          maxMarks: 15,
          orderIndex: 2,
        },
      ],
    });
  };

  it("should initialize in DRAFT state with version 1", () => {
    const evalInstance = createTestEvaluation();

    expect(evalInstance.status).toBe("DRAFT");
    expect(evalInstance.version).toBe(1);
    expect(evalInstance.totalScore).toBe(0);
    expect(evalInstance.maxPossibleScore).toBe(25);
    expect(evalInstance.isComplete()).toBe(false);
    expect(evalInstance.getMissingQuestionIds()).toEqual(["q1", "q2"]);
  });

  it("should transition from DRAFT to IN_PROGRESS on first mark assignment and increment version", () => {
    const evalInstance = createTestEvaluation();

    const mark = evalInstance.assignMark({
      questionId: "q1",
      awardedMarks: 8,
      evaluatorId: "evaluator-prof-smith",
      comments: "Accurate explanation",
    });

    expect(mark.awardedMarks).toBe(8);
    expect(evalInstance.status).toBe("IN_PROGRESS");
    expect(evalInstance.version).toBe(2);
    expect(evalInstance.totalScore).toBe(8);
    expect(evalInstance.isComplete()).toBe(false);
    expect(evalInstance.getMissingQuestionIds()).toEqual(["q2"]);
  });

  it("should throw QuestionNotFoundError when assigning mark for non-existent question", () => {
    const evalInstance = createTestEvaluation();

    expect(() =>
      evalInstance.assignMark({
        questionId: "unknown-question",
        awardedMarks: 5,
        evaluatorId: "evaluator-prof-smith",
      })
    ).toThrow(QuestionNotFoundError);
  });

  it("should detect completeness when all questions receive marks", () => {
    const evalInstance = createTestEvaluation();

    evalInstance.assignMark({
      questionId: "q1",
      awardedMarks: 8,
      evaluatorId: "evaluator-prof-smith",
    });
    evalInstance.assignMark({
      questionId: "q2",
      awardedMarks: 12,
      evaluatorId: "evaluator-prof-smith",
    });

    expect(evalInstance.isComplete()).toBe(true);
    expect(evalInstance.getMissingQuestionIds()).toEqual([]);
    expect(evalInstance.totalScore).toBe(20);
    expect(evalInstance.version).toBe(3);
  });

  it("should submit evaluation and record submittedAt timestamp", () => {
    const evalInstance = createTestEvaluation();
    evalInstance.assignMark({
      questionId: "q1",
      awardedMarks: 8,
      evaluatorId: "evaluator-prof-smith",
    });

    evalInstance.submit();

    expect(evalInstance.status).toBe("SUBMITTED");
    expect(evalInstance.submittedAt).toBeDefined();
    expect(typeof evalInstance.submittedAt).toBe("string");
    expect(evalInstance.version).toBe(3);
  });

  it("should lock evaluation against mark modifications once SUBMITTED", () => {
    const evalInstance = createTestEvaluation();
    evalInstance.assignMark({
      questionId: "q1",
      awardedMarks: 8,
      evaluatorId: "evaluator-prof-smith",
    });
    evalInstance.submit();

    expect(() =>
      evalInstance.assignMark({
        questionId: "q2",
        awardedMarks: 10,
        evaluatorId: "evaluator-prof-smith",
      })
    ).toThrow(EvaluationLockedError);
  });

  it("should prevent invalid state transitions (cannot re-submit or directly finalize from DRAFT)", () => {
    const evalInstance = createTestEvaluation();

    // Cannot finalize directly from DRAFT
    expect(() => evalInstance.finalize()).toThrow(InvalidStateTransitionError);

    evalInstance.submit();

    // Cannot re-submit once SUBMITTED
    expect(() => evalInstance.submit()).toThrow(InvalidStateTransitionError);
  });

  it("should finalize evaluation from SUBMITTED status and lock further modifications", () => {
    const evalInstance = createTestEvaluation();
    evalInstance.assignMark({
      questionId: "q1",
      awardedMarks: 8,
      evaluatorId: "evaluator-prof-smith",
    });
    evalInstance.submit();

    evalInstance.finalize();

    expect(evalInstance.status).toBe("FINALIZED");
    expect(evalInstance.finalizedAt).toBeDefined();
    expect(evalInstance.version).toBe(4);

    // Locked when FINALIZED
    expect(() =>
      evalInstance.assignMark({
        questionId: "q1",
        awardedMarks: 9,
        evaluatorId: "evaluator-prof-smith",
      })
    ).toThrow(EvaluationLockedError);
  });
});
