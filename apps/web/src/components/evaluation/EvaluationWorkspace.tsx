import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import type {
  EvaluationResponse,
  CompletenessValidationResultDto,
  QuestionDto,
} from "@osm/shared";
import { EvaluationStatus } from "@osm/shared";
import { evaluationService } from "../../services/evaluation-service.ts";
import { type AuthContext, ApiError } from "../../services/api-client.ts";
import {
  getScriptReference,
  getScriptAnswers,
  getRubricCriterion,
} from "../../fixtures/scriptReferences.ts";
import { getActorDisplayName } from "../../services/actor-fixtures.ts";
import {
  Card,
  StatusBadge,
  Button,
  Input,
  Textarea,
  Modal,
  Alert,
  Skeleton,
} from "../ui";

export interface EvaluationWorkspaceProps {
  auth: AuthContext;
}

export const EvaluationWorkspace: React.FC<EvaluationWorkspaceProps> = ({ auth }) => {
  const { evaluationId, evalId } = useParams<{ evaluationId?: string; evalId?: string }>();
  const activeId = evaluationId || evalId;

  // Data states
  const [evaluation, setEvaluation] = useState<EvaluationResponse | null>(null);
  const [completeness, setCompleteness] = useState<CompletenessValidationResultDto | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Active question navigation
  const [activeQuestionId, setActiveQuestionId] = useState<string>("");

  // Local draft marks: questionId -> { awardedMarks, comments }
  const [localMarks, setLocalMarks] = useState<
    Record<string, { awardedMarks: number | ""; comments: string }>
  >({});

  // Per-question save states: "idle" | "saving" | "saved" | "error"
  const [saveStatus, setSaveStatus] = useState<Record<string, "idle" | "saving" | "saved" | "error">>({});
  const [saveErrors, setSaveErrors] = useState<Record<string, string>>({});

  // UI view states
  const [zoomPercent, setZoomPercent] = useState<number>(100);
  const [isRubricOpen, setIsRubricOpen] = useState<boolean>(true);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [conflictNotice, setConflictNotice] = useState<string | null>(null);

  // Load evaluation details and completeness validation
  const loadEvaluation = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);
      setConflictNotice(null);

      try {
        const evalData = await evaluationService.getEvaluation(id, auth);
        setEvaluation(evalData);

        // Populate local draft marks
        const marksMap: Record<string, { awardedMarks: number | ""; comments: string }> = {};
        for (const q of evalData.questions) {
          const existingMark = evalData.marks.find((m) => m.questionId === q.id);
          marksMap[q.id] = {
            awardedMarks: existingMark !== undefined && existingMark.awardedMarks !== null ? existingMark.awardedMarks : "",
            comments: existingMark?.comments || "",
          };
        }
        setLocalMarks(marksMap);

        // Set active question: prioritize first unmarked question, else first question
        if (evalData.questions.length > 0) {
          const firstUnmarked = evalData.questions.find(
            (q) => !evalData.marks.some((m) => m.questionId === q.id)
          );
          setActiveQuestionId(firstUnmarked ? firstUnmarked.id : evalData.questions[0].id);
        }

        // Fetch completeness
        try {
          const compData = await evaluationService.getCompleteness(id, auth);
          setCompleteness(compData);
        } catch {
          // Non-blocking if completeness check fails
        }
      } catch (err: unknown) {
        if (err instanceof ApiError) {
          if (err.statusCode === 404) {
            setError(`Examination evaluation "${id}" could not be found. It may belong to another cycle or has not been provisioned.`);
          } else {
            setError(`Failed to retrieve examination script: ${err.message}`);
          }
        } else {
          setError(err instanceof Error ? err.message : "Error retrieving examination script from server.");
        }
        setEvaluation(null);
      } finally {
        setLoading(false);
      }
    },
    [auth]
  );

  useEffect(() => {
    if (activeId) {
      loadEvaluation(activeId);
    } else {
      setLoading(false);
      setError("No evaluation identifier was provided in the route.");
    }
  }, [activeId, loadEvaluation]);

  // Active question derived object
  const activeQuestion: QuestionDto | undefined = useMemo(() => {
    if (!evaluation || !activeQuestionId) return undefined;
    return evaluation.questions.find((q) => q.id === activeQuestionId) || evaluation.questions[0];
  }, [evaluation, activeQuestionId]);

  const activeQuestionIndex = useMemo(() => {
    if (!evaluation || !activeQuestion) return 0;
    return evaluation.questions.findIndex((q) => q.id === activeQuestion.id);
  }, [evaluation, activeQuestion]);

  // Derived metadata
  const scriptInfo = useMemo(() => {
    return evaluation ? getScriptReference(evaluation.scriptId) : null;
  }, [evaluation]);

  const scriptAnswers = useMemo(() => {
    return evaluation ? getScriptAnswers(evaluation.scriptId) : {};
  }, [evaluation]);

  const isSubmitted =
    evaluation?.status === EvaluationStatus.SUBMITTED ||
    (evaluation?.status as string) === "FINALIZED";

  // Mark changes
  const handleMarkChange = (qId: string, value: string, maxMarks: number) => {
    const num = value === "" ? "" : Number(value);
    setLocalMarks((prev) => ({
      ...prev,
      [qId]: {
        ...prev[qId],
        awardedMarks: num,
      },
    }));

    // Clear inline error if valid
    if (num !== "" && (num < 0 || num > maxMarks)) {
      setSaveErrors((prev) => ({
        ...prev,
        [qId]: `Mark must be between 0 and ${maxMarks} points.`,
      }));
    } else {
      setSaveErrors((prev) => {
        const copy = { ...prev };
        delete copy[qId];
        return copy;
      });
    }
  };

  const handleCommentsChange = (qId: string, comments: string) => {
    setLocalMarks((prev) => ({
      ...prev,
      [qId]: {
        ...prev[qId],
        comments,
      },
    }));
  };

  // Explicit Save Mark for active question
  const handleSaveMark = async (q: QuestionDto) => {
    if (!evaluation) return;
    const current = localMarks[q.id];
    if (!current || current.awardedMarks === "") {
      setSaveErrors((prev) => ({
        ...prev,
        [q.id]: "Please enter an awarded numeric mark before saving.",
      }));
      return;
    }

    const markVal = Number(current.awardedMarks);
    if (isNaN(markVal) || markVal < 0 || markVal > q.maxMarks) {
      setSaveErrors((prev) => ({
        ...prev,
        [q.id]: `Mark must be between 0 and ${q.maxMarks} points.`,
      }));
      return;
    }

    setSaveStatus((prev) => ({ ...prev, [q.id]: "saving" }));
    setSaveErrors((prev) => {
      const copy = { ...prev };
      delete copy[q.id];
      return copy;
    });

    try {
      const updated = await evaluationService.assignMark(
        evaluation.id,
        {
          questionId: q.id,
          awardedMarks: markVal,
          evaluatorId: auth.actorId,
          comments: current.comments || "Scored against official rubric criteria",
          expectedVersion: evaluation.version,
        },
        auth
      );

      setEvaluation(updated);
      setSaveStatus((prev) => ({ ...prev, [q.id]: "saved" }));

      // Refresh completeness
      const comp = await evaluationService.getCompleteness(evaluation.id, auth);
      setCompleteness(comp);

      // Revert saved pill to idle after 2.5s
      setTimeout(() => {
        setSaveStatus((prev) => ({ ...prev, [q.id]: "idle" }));
      }, 2500);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.statusCode === 409) {
        setConflictNotice(
          "Concurrency Conflict: This examination script was modified in another session. Reloading the latest version."
        );
        setTimeout(() => {
          loadEvaluation(evaluation.id);
        }, 1800);
      } else {
        const msg = err instanceof Error ? err.message : "Failed to record mark on the examination server.";
        setSaveErrors((prev) => ({ ...prev, [q.id]: msg }));
        setSaveStatus((prev) => ({ ...prev, [q.id]: "error" }));
      }
    }
  };

  // Submit Evaluation
  const handleSubmitEvaluation = async () => {
    if (!evaluation) return;
    setSubmitting(true);
    try {
      const submitted = await evaluationService.submitEvaluation(
        evaluation.id,
        { evaluatorId: evaluation.evaluatorId },
        auth
      );

      setEvaluation(submitted);
      setIsSubmitModalOpen(false);

      // Refresh completeness
      const comp = await evaluationService.getCompleteness(evaluation.id, auth);
      setCompleteness(comp);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to submit evaluation.";
      alert(`Submission Error: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Zoom controls
  const handleZoom = (delta: number) => {
    setZoomPercent((prev) => Math.min(150, Math.max(70, prev + delta)));
  };

  // Jump to next or previous question
  const handleNavigateQuestion = (direction: "next" | "prev") => {
    if (!evaluation || !activeQuestion) return;
    const currentIdx = evaluation.questions.findIndex((q) => q.id === activeQuestion.id);
    if (direction === "next" && currentIdx < evaluation.questions.length - 1) {
      const nextId = evaluation.questions[currentIdx + 1].id;
      setActiveQuestionId(nextId);
      scrollToScriptQuestion(nextId);
    } else if (direction === "prev" && currentIdx > 0) {
      const prevId = evaluation.questions[currentIdx - 1].id;
      setActiveQuestionId(prevId);
      scrollToScriptQuestion(prevId);
    }
  };

  const scrollToScriptQuestion = (qId: string) => {
    const el = document.getElementById(`script-section-${qId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Format timestamps
  const formatDateTime = (isoString?: string | null) => {
    if (!isoString) return "—";
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  // --------------------------------------------------------------------------
  // Loading State
  // --------------------------------------------------------------------------
  if (loading && !evaluation) {
    return (
      <div className="osm-workspace-loading" id="osm-workspace-loading">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <div>
            <Skeleton variant="text" width="280px" height="28px" />
            <Skeleton variant="text" width="420px" height="16px" style={{ marginTop: "8px" }} />
          </div>
          <Skeleton variant="rectangle" width="160px" height="38px" />
        </div>

        <div className="osm-workspace-split">
          <div className="osm-workspace-pane-left">
            <Card padding="md">
              <Skeleton variant="rectangle" width="100%" height="560px" />
            </Card>
          </div>
          <div className="osm-workspace-pane-right">
            <Card padding="md">
              <Skeleton variant="rectangle" width="100%" height="60px" style={{ marginBottom: "16px" }} />
              <Skeleton variant="rectangle" width="100%" height="180px" style={{ marginBottom: "16px" }} />
              <Skeleton variant="rectangle" width="100%" height="160px" />
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // Error or Not Found State
  // --------------------------------------------------------------------------
  if (error || !evaluation || !scriptInfo) {
    return (
      <div className="osm-workspace-error-container" id="osm-workspace-error-view">
        <Link to="/examiner/queue" className="osm-btn osm-btn--secondary osm-btn--sm" style={{ marginBottom: "1.5rem", textDecoration: "none" }}>
          ← Back to Script Queue
        </Link>
        <Alert
          type="danger"
          title="Examination Script Unavailable"
          message={error || "The requested examination script could not be loaded."}
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => activeId && loadEvaluation(activeId)}
            >
              Retry Connection
            </Button>
          }
        />
      </div>
    );
  }

  const activeRubric = activeQuestion
    ? getRubricCriterion(activeQuestion.rubricCriteriaId, activeQuestion.maxMarks)
    : null;

  return (
    <div className="osm-workspace-container" id="osm-evaluation-workspace">
      {/* ====================================================================
          TOP WORKSPACE HEADER (Institutional Academic Breadcrumb & Metadata)
          ==================================================================== */}
      <header className="osm-workspace-header" id="osm-workspace-header">
        <div className="osm-workspace-header__left">
          <Link
            to="/examiner/queue"
            className="osm-workspace-back-link"
            id="link-back-to-queue"
          >
            ← Back to Script Queue
          </Link>
          <div className="osm-workspace-title-row">
            <h1 className="osm-workspace-script-ref" id="workspace-script-ref">
              {scriptInfo.displayRef}
            </h1>
            <span className="osm-workspace-candidate-pill" id="workspace-candidate-label">
              {scriptInfo.candidateLabel}
            </span>
            <StatusBadge status={evaluation.status} />
            <span className="osm-workspace-version-chip" title="Optimistic Concurrency Ledger Version">
              v{evaluation.version}
            </span>
          </div>
          <p className="osm-workspace-meta-line">
            Subject: <strong>{scriptInfo.subject}</strong> ({scriptInfo.moduleCode}) · Cycle: <strong>Spring 2026</strong> · Examiner: <strong>{getActorDisplayName(evaluation.evaluatorId)}</strong>
          </p>
        </div>

        <div className="osm-workspace-header__right">
          {/* Live Total Score Indicator */}
          <div className="osm-workspace-score-box" id="workspace-score-box">
            <span className="osm-workspace-score-label">Official Score</span>
            <span className="osm-workspace-score-value" id="workspace-score-value">
              <strong>{evaluation.totalScore}</strong> / {evaluation.maxPossibleScore} pts
            </span>
            <span className="osm-workspace-score-pct">
              {evaluation.maxPossibleScore > 0
                ? `${Math.round((evaluation.totalScore / evaluation.maxPossibleScore) * 100)}%`
                : "0%"}
            </span>
          </div>
        </div>
      </header>

      {/* Concurrency Conflict Banner */}
      {conflictNotice && (
        <div style={{ marginBottom: "1rem" }}>
          <Alert type="warning" title="Synchronization Notice" message={conflictNotice} />
        </div>
      )}

      {/* ====================================================================
          MAIN SPLIT-PANE WORKSPACE (Left 55% Script / Right 45% Marking)
          ==================================================================== */}
      <div className="osm-workspace-split">
        {/* ------------------------------------------------------------------
            LEFT PANE (55%): STUDENT SCRIPT & ANSWER VIEWER
            ------------------------------------------------------------------ */}
        <section
          className="osm-workspace-pane-left"
          id="pane-student-script"
          aria-label="Student Examination Script Viewer"
        >
          <div className="osm-script-viewer-card">
            {/* Viewer Controls Toolbar */}
            <div className="osm-script-toolbar">
              <div className="osm-script-toolbar__left">
                <span className="osm-script-toolbar__tag">
                  ℹ️ Demonstration Mode — Anonymized Script Fixture
                </span>
              </div>

              <div className="osm-script-toolbar__controls">
                <div className="osm-script-zoom-group">
                  <button
                    type="button"
                    className="osm-script-zoom-btn"
                    onClick={() => handleZoom(-10)}
                    disabled={zoomPercent <= 70}
                    title="Zoom Out"
                    aria-label="Zoom out answer sheet"
                  >
                    −
                  </button>
                  <span className="osm-script-zoom-label">{zoomPercent}%</span>
                  <button
                    type="button"
                    className="osm-script-zoom-btn"
                    onClick={() => handleZoom(10)}
                    disabled={zoomPercent >= 150}
                    title="Zoom In"
                    aria-label="Zoom in answer sheet"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    className="osm-script-zoom-reset"
                    onClick={() => setZoomPercent(100)}
                    title="Reset Zoom to 100%"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>

            {/* Answer Sheet Paper Document */}
            <div className="osm-script-paper-viewport">
              <div
                className="osm-script-paper"
                style={{ transform: `scale(${zoomPercent / 100})`, transformOrigin: "top center" }}
              >
                {/* Paper Header */}
                <div className="osm-paper-header">
                  <div className="osm-paper-header__top">
                    <div>
                      <span className="osm-paper-exam-board">DEPARTMENT OF COMPUTING & SYSTEMS</span>
                      <h2 className="osm-paper-title">{scriptInfo.subject}</h2>
                    </div>
                    <div className="osm-paper-id-box">
                      <span className="osm-paper-barcode">||| | |||| | ||| |||| |</span>
                      <span className="osm-paper-ref-text">{scriptInfo.displayRef}</span>
                    </div>
                  </div>
                  <div className="osm-paper-meta-row">
                    <span><strong>Module Code:</strong> {scriptInfo.moduleCode}</span>
                    <span><strong>Session:</strong> Spring 2026 Examination</span>
                    <span><strong>Candidate:</strong> {scriptInfo.candidateLabel}</span>
                  </div>
                </div>

                {/* Question Response Sections */}
                <div className="osm-paper-body">
                  {evaluation.questions.map((q) => {
                    const isActive = q.id === activeQuestionId;
                    const answerText = scriptAnswers[q.id] || "[No candidate response submitted for this question.]";

                    return (
                      <article
                        key={q.id}
                        id={`script-section-${q.id}`}
                        onClick={() => setActiveQuestionId(q.id)}
                        className={`osm-script-section ${isActive ? "osm-script-section--active" : ""}`}
                        title="Click to select this question for marking"
                      >
                        <div className="osm-script-section__header">
                          <span className="osm-script-section__qnumber">
                            Question {q.questionNumber}
                          </span>
                          <span className="osm-script-section__max">
                            [{q.maxMarks} marks]
                          </span>
                          {isActive && (
                            <span className="osm-script-section__active-pill">
                              Active Question
                            </span>
                          )}
                        </div>

                        <div className="osm-script-section__prompt">
                          <strong>Question Prompt:</strong> {q.text}
                        </div>

                        <div className="osm-script-section__answer-box">
                          <span className="osm-script-section__answer-label">
                            Candidate's Submitted Response:
                          </span>
                          <pre className="osm-script-section__answer-text">
                            {answerText}
                          </pre>
                        </div>
                      </article>
                    );
                  })}
                </div>

                {/* Paper Footer */}
                <div className="osm-paper-footer">
                  <span>*** END OF EXAMINATION SCRIPT ***</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------
            RIGHT PANE (45%): EXAMINER MARKING & RUBRIC WORKSPACE
            ------------------------------------------------------------------ */}
        <section
          className="osm-workspace-pane-right"
          id="pane-examiner-marking"
          aria-label="Examiner Marking Workspace"
        >
          {/* Question Navigator Tab Strip */}
          <nav className="osm-qnavigator-strip" aria-label="Question Navigation">
            {evaluation.questions.map((q, idx) => {
              const isActive = q.id === activeQuestionId;
              const existingMark = evaluation.marks.find((m) => m.questionId === q.id);
              const isMarked = existingMark !== undefined;

              return (
                <button
                  key={q.id}
                  type="button"
                  id={`btn-nav-q-${q.id}`}
                  onClick={() => {
                    setActiveQuestionId(q.id);
                    scrollToScriptQuestion(q.id);
                  }}
                  className={`osm-qnavigator-tab ${isActive ? "osm-qnavigator-tab--active" : ""} ${
                    isMarked ? "osm-qnavigator-tab--marked" : "osm-qnavigator-tab--unmarked"
                  }`}
                  aria-current={isActive ? "true" : undefined}
                >
                  <div className="osm-qnavigator-tab__top">
                    <span className="osm-qnavigator-tab__number">Q{idx + 1}</span>
                    <span className={`osm-qnavigator-tab__indicator ${isMarked ? "osm-qnavigator-tab__indicator--done" : "osm-qnavigator-tab__indicator--pending"}`}>
                      {isMarked ? "✓" : "●"}
                    </span>
                  </div>
                  <span className="osm-qnavigator-tab__score">
                    {isMarked ? `${existingMark.awardedMarks} / ${q.maxMarks}` : `— / ${q.maxMarks}`}
                  </span>
                </button>
              );
            })}
          </nav>

          {/* Active Question Evaluation Card */}
          {activeQuestion ? (
            <div className="osm-marking-card" id={`marking-card-${activeQuestion.id}`}>
              {/* Question Header & Prompt */}
              <div className="osm-marking-qheader">
                <div className="osm-marking-qtitle-row">
                  <span className="osm-marking-qbadge">
                    Question {activeQuestion.questionNumber}
                  </span>
                  <span className="osm-marking-max-pill">
                    Maximum: {activeQuestion.maxMarks} Marks
                  </span>
                </div>
                <p className="osm-marking-qprompt">{activeQuestion.text}</p>
              </div>

              {/* Rubric Guidance Accordion */}
              {activeRubric && (
                <div className="osm-rubric-accordion" id="rubric-guidance-accordion">
                  <button
                    type="button"
                    className="osm-rubric-toggle-btn"
                    onClick={() => setIsRubricOpen(!isRubricOpen)}
                    aria-expanded={isRubricOpen}
                  >
                    <span>
                      📋 <strong>Marking Rubric:</strong> {activeRubric.title}
                    </span>
                    <span className="osm-rubric-chevron">{isRubricOpen ? "▲ Hide" : "▼ Show Guidance"}</span>
                  </button>

                  {isRubricOpen && (
                    <div className="osm-rubric-body">
                      <div className="osm-rubric-levels-list">
                        {activeRubric.levels.map((level, lIdx) => (
                          <div key={lIdx} className="osm-rubric-level-item">
                            <div className="osm-rubric-level-top">
                              <span className="osm-rubric-level-name">{level.name}</span>
                              <span className="osm-rubric-level-range">
                                {level.minMarks === level.maxMarks
                                  ? `${level.minMarks} pts`
                                  : `${level.minMarks} – ${level.maxMarks} pts`}
                              </span>
                            </div>
                            <p className="osm-rubric-level-desc">{level.descriptor}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* --------------------------------------------------------------
                  MARK ENTRY & ANNOTATION (Active Mode) or FINAL RECEIPT (Locked)
                  -------------------------------------------------------------- */}
              {isSubmitted ? (
                /* Authoritative Read-Only Summary Mode */
                <div className="osm-submitted-receipt" id="osm-submitted-receipt">
                  <div className="osm-submitted-receipt__badge">
                    🔒 Formal Evaluation Locked
                  </div>
                  <p className="osm-submitted-receipt__sub">
                    This examination evaluation was submitted by <strong>{getActorDisplayName(evaluation.evaluatorId)}</strong> on {formatDateTime(evaluation.submittedAt)}. Marks are permanently recorded and immutable.
                  </p>

                  <div className="osm-submitted-receipt__table-wrapper">
                    <table className="osm-submitted-receipt__table">
                      <thead>
                        <tr>
                          <th>Question</th>
                          <th>Awarded Mark</th>
                          <th>Maximum</th>
                          <th>Score %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {evaluation.questions.map((q) => {
                          const m = evaluation.marks.find((mark) => mark.questionId === q.id);
                          const pts = m?.awardedMarks ?? 0;
                          return (
                            <tr key={q.id}>
                              <td>
                                <strong>Question {q.questionNumber}</strong>
                              </td>
                              <td className="osm-mono">
                                <strong>{pts}</strong>
                              </td>
                              <td className="osm-mono">{q.maxMarks}</td>
                              <td className="osm-mono">
                                {q.maxMarks > 0 ? `${Math.round((pts / q.maxMarks) * 100)}%` : "0%"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {evaluation.marks.some((m) => m.comments) && (
                    <div className="osm-submitted-receipt__notes">
                      <span className="osm-submitted-receipt__notes-label">Examiner Notes on Record:</span>
                      {evaluation.marks.map(
                        (m) =>
                          m.comments && (
                            <div key={m.questionId} className="osm-submitted-receipt__note-item">
                              <strong>Q{evaluation.questions.find((q) => q.id === m.questionId)?.questionNumber}:</strong> {m.comments}
                            </div>
                          )
                      )}
                    </div>
                  )}
                </div>
              ) : (
                /* Editable Mark Entry Form */
                <form
                  className="osm-marking-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSaveMark(activeQuestion);
                  }}
                >
                  <div className="osm-marking-form__row">
                    <div className="osm-marking-form__input-col">
                      <label
                        htmlFor={`input-mark-${activeQuestion.id}`}
                        className="osm-marking-label"
                      >
                        Awarded Marks (0 – {activeQuestion.maxMarks}) <span className="osm-req">*</span>
                      </label>
                      <div className="osm-marking-input-wrapper">
                        <Input
                          id={`input-mark-${activeQuestion.id}`}
                          type="number"
                          min={0}
                          max={activeQuestion.maxMarks}
                          step={1}
                          className="osm-marking-num-input"
                          value={localMarks[activeQuestion.id]?.awardedMarks ?? ""}
                          onChange={(e) =>
                            handleMarkChange(activeQuestion.id, e.target.value, activeQuestion.maxMarks)
                          }
                          placeholder={`0 – ${activeQuestion.maxMarks}`}
                        />
                        <span className="osm-marking-max-suffix">/ {activeQuestion.maxMarks}</span>
                      </div>
                    </div>

                    <div className="osm-marking-form__save-col">
                      <label className="osm-marking-label">&nbsp;</label>
                      <Button
                        type="submit"
                        variant={saveStatus[activeQuestion.id] === "saved" ? "primary" : "secondary"}
                        loading={saveStatus[activeQuestion.id] === "saving"}
                        id={`btn-save-mark-${activeQuestion.id}`}
                        className="osm-btn-save-mark"
                      >
                        {saveStatus[activeQuestion.id] === "saved"
                          ? "✓ Mark Saved"
                          : saveStatus[activeQuestion.id] === "error"
                          ? "⚠️ Retry Save"
                          : "Save Mark"}
                      </Button>
                    </div>
                  </div>

                  {/* Inline Validation / Error Message */}
                  {saveErrors[activeQuestion.id] && (
                    <div className="osm-marking-error-msg" id="marking-error-msg">
                      ⚠️ {saveErrors[activeQuestion.id]}
                    </div>
                  )}

                  {/* Examiner Annotation / Notes Field */}
                  <div className="osm-marking-form__notes-col">
                    <div className="osm-marking-notes-header">
                      <label
                        htmlFor={`textarea-comment-${activeQuestion.id}`}
                        className="osm-marking-label"
                      >
                        Examiner Notes & Justification (optional)
                      </label>
                      <span className="osm-marking-char-count">
                        {(localMarks[activeQuestion.id]?.comments || "").length} / 500
                      </span>
                    </div>
                    <Textarea
                      id={`textarea-comment-${activeQuestion.id}`}
                      rows={3}
                      maxLength={500}
                      className="osm-marking-textarea"
                      placeholder="Add examiner observations, rubric notes, or marking rationale..."
                      value={localMarks[activeQuestion.id]?.comments ?? ""}
                      onChange={(e) => handleCommentsChange(activeQuestion.id, e.target.value)}
                    />
                  </div>

                  {/* Stepper Navigation Buttons */}
                  <div className="osm-marking-stepper">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => handleNavigateQuestion("prev")}
                      disabled={activeQuestionIndex <= 0}
                      id="btn-prev-question"
                    >
                      ← Previous Question
                    </Button>
                    <span className="osm-marking-stepper-label">
                      Question {activeQuestionIndex + 1} of {evaluation.questions.length}
                    </span>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => handleNavigateQuestion("next")}
                      disabled={activeQuestionIndex >= evaluation.questions.length - 1}
                      id="btn-next-question"
                    >
                      Next Question →
                    </Button>
                  </div>
                </form>
              )}
            </div>
          ) : null}
        </section>
      </div>

      {/* ====================================================================
          PERSISTENT COMPLETECHECK BAR (Sticky Bottom of Workspace)
          ==================================================================== */}
      <footer className="osm-completecheck-bar" id="osm-completecheck-bar">
        <div className="osm-completecheck-bar__left">
          {isSubmitted ? (
            <div className="osm-completecheck-status osm-completecheck-status--submitted">
              <span className="osm-completecheck-icon">✓</span>
              <div>
                <strong>Evaluation Submitted & Locked</strong>
                <span className="osm-completecheck-sub">
                  Official Record finalized. All {evaluation.questions.length} questions scored ({evaluation.totalScore}/{evaluation.maxPossibleScore} pts).
                </span>
              </div>
            </div>
          ) : completeness?.isComplete ? (
            <div className="osm-completecheck-status osm-completecheck-status--ready">
              <span className="osm-completecheck-icon">✓</span>
              <div>
                <strong>CompleteCheck Passed — Ready for Submission</strong>
                <span className="osm-completecheck-sub">
                  All {evaluation.questions.length} questions have valid marks. Verified score: {evaluation.totalScore} / {evaluation.maxPossibleScore} pts.
                </span>
              </div>
            </div>
          ) : (
            <div className="osm-completecheck-status osm-completecheck-status--incomplete">
              <span className="osm-completecheck-icon">⚠️</span>
              <div>
                <strong>
                  {completeness?.unmarkedQuestions ?? 1} Question(s) Awaiting Marks
                </strong>
                <span className="osm-completecheck-sub">
                  Deterministic completeness check: all questions must receive a valid mark prior to final submission.
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="osm-completecheck-bar__right">
          {!isSubmitted && (
            <Button
              variant="primary"
              size="md"
              disabled={!completeness?.isComplete}
              onClick={() => setIsSubmitModalOpen(true)}
              id="btn-validate-submit"
            >
              Validate & Submit Evaluation ➔
            </Button>
          )}
        </div>
      </footer>

      {/* ====================================================================
          SUBMISSION CONFIRMATION MODAL
          ==================================================================== */}
      <Modal
        open={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        title="Confirm Final Examination Submission"
        size="md"
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", width: "100%" }}>
            <Button
              variant="secondary"
              onClick={() => setIsSubmitModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={submitting}
              onClick={handleSubmitEvaluation}
              id="btn-confirm-submit-modal"
            >
              Confirm & Lock Evaluation 🔒
            </Button>
          </div>
        }
      >
        <div className="osm-submit-modal-content">
          <p style={{ color: "var(--osm-text-primary)", marginBottom: "1rem", lineHeight: 1.6 }}>
            You are about to submit the completed evaluation for <strong>{scriptInfo.displayRef}</strong> ({scriptInfo.candidateLabel}).
          </p>

          <div
            style={{
              padding: "1rem",
              backgroundColor: "var(--osm-bg-elevated)",
              border: "1px solid var(--osm-border-subtle)",
              borderRadius: "var(--osm-radius-md)",
              marginBottom: "1rem",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
              <span style={{ color: "var(--osm-text-muted)", fontSize: "0.875rem" }}>Total Awarded Score:</span>
              <strong style={{ fontFamily: "var(--osm-font-mono)", fontSize: "1.125rem", color: "var(--osm-text-primary)" }}>
                {evaluation.totalScore} / {evaluation.maxPossibleScore} pts
              </strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--osm-text-muted)", fontSize: "0.875rem" }}>Questions Evaluated:</span>
              <span style={{ fontFamily: "var(--osm-font-mono)", fontSize: "0.875rem", color: "var(--osm-success)" }}>
                {evaluation.marks.length} of {evaluation.questions.length} (100% Complete)
              </span>
            </div>
          </div>

          <Alert
            type="warning"
            title="Irreversible Action"
            message="Once submitted, the evaluation is permanently locked and cryptographically registered in the audit ledger. Marks cannot be altered except through an authorized moderation appeal."
          />
        </div>
      </Modal>
    </div>
  );
};
