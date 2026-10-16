import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useCuratedQuiz } from "../../query/queries";
import { ExplanationBlock, OptionList } from "../exam/components/ExamPlayer";
import Markdown from "../../components/Markdown";
import type { ExamQuestion, QuestionPhase } from "../../types/exam";
import { isAnswerCorrect } from "../../types/exam";
import { computeAnswerPoints } from "../../utils/scoring";

type AnswerRecord = { questionId: string; correct: boolean; points: number };

function CenteredMessage({
  emoji,
  title,
  children,
}: {
  emoji: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="product-frame mx-auto w-full max-w-lg p-8 text-center sm:p-10">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-3xl">
        {emoji}
      </div>
      <h1 className="mt-6 text-2xl font-extrabold text-ink">{title}</h1>
      <div className="mt-3 text-sm text-muted">{children}</div>
    </div>
  );
}

export default function Practice() {
  const { slug } = useParams<{ slug: string }>();
  const { data, isLoading, isError, error } = useCuratedQuiz(slug);
  const quiz = data?.quiz;

  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<QuestionPhase>("answering");
  const [singleSelection, setSingleSelection] = useState<string | null>(null);
  const [multiSelection, setMultiSelection] = useState<string[]>([]);
  const [lockedIds, setLockedIds] = useState<string[]>([]);
  const [records, setRecords] = useState<AnswerRecord[]>([]);

  if (isLoading) {
    return (
      <CenteredMessage emoji="⏳" title="Loading quiz…">
        Fetching the questions.
      </CenteredMessage>
    );
  }

  if (isError || !quiz) {
    return (
      <CenteredMessage emoji="🔒" title="Can't open this quiz">
        <p>
          {error instanceof Error && error.message
            ? error.message
            : "This quiz isn't available right now."}
        </p>
        <Link
          to="/dashboard"
          className="mt-6 inline-flex rounded-full bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
        >
          Back to dashboard
        </Link>
      </CenteredMessage>
    );
  }

  const total = quiz.questions.length;
  const question: ExamQuestion | undefined = quiz.questions[index];
  const isMultiple = question?.type === "MULTIPLE";
  const maxPoints = quiz.questions.reduce((sum, q) => sum + q.points * 100, 0);
  const earnedPoints = records.reduce((sum, record) => sum + record.points, 0);
  const correctCount = records.filter((record) => record.correct).length;

  function reset() {
    setIndex(0);
    setPhase("answering");
    setSingleSelection(null);
    setMultiSelection([]);
    setLockedIds([]);
    setRecords([]);
    setFinished(false);
  }

  function lockAnswer(selectedIds: string[]) {
    if (!question) return;
    const correct = isAnswerCorrect(question, {
      selectedOptionId: selectedIds[0] ?? null,
      selectedOptionIds: selectedIds,
      revealedAt: Date.now(),
    });
    setRecords((prev) => [
      ...prev,
      { questionId: question.id, correct, points: computeAnswerPoints(question.points, correct) },
    ]);
    setLockedIds(selectedIds);
    setPhase("revealed");
  }

  function handleSelectOption(optionId: string) {
    if (!question || phase === "revealed") return;
    if (isMultiple) {
      setMultiSelection((prev) =>
        prev.includes(optionId) ? prev.filter((id) => id !== optionId) : [...prev, optionId],
      );
      return;
    }
    setSingleSelection(optionId);
    lockAnswer([optionId]);
  }

  function handleNext() {
    if (index + 1 >= total) {
      setFinished(true);
      return;
    }
    setIndex((prev) => prev + 1);
    setPhase("answering");
    setSingleSelection(null);
    setMultiSelection([]);
    setLockedIds([]);
  }

  // ── Intro screen ────────────────────────────────────────────────────────────
  if (!started) {
    return (
      <div className="product-frame quiz-question-enter mx-auto w-full max-w-lg p-8 text-center sm:p-10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-3xl">
          {quiz.emoji ?? "🧩"}
        </div>
        <p className="mt-5 text-xs font-bold uppercase tracking-widest text-brand-600">
          Practice mode
        </p>
        <h1 className="mt-2 text-2xl font-extrabold text-ink sm:text-3xl">{quiz.title}</h1>
        <p className="mt-2 text-sm text-muted">{quiz.description}</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-line bg-surface-soft px-5 py-4">
            <p className="text-xs font-bold uppercase tracking-wide text-muted">Questions</p>
            <p className="mt-1 text-2xl font-extrabold text-ink">{total}</p>
          </div>
          <div className="rounded-2xl border border-line bg-surface-soft px-5 py-4">
            <p className="text-xs font-bold uppercase tracking-wide text-muted">Max score</p>
            <p className="mt-1 text-2xl font-extrabold text-brand-600">{maxPoints}</p>
          </div>
        </div>

        <p className="mt-6 text-xs text-muted">
          You&apos;ll see the correct answer and an explanation after each question.
        </p>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center rounded-full border border-line bg-white px-6 py-2.5 text-sm font-semibold text-ink transition hover:bg-surface-soft"
          >
            Not now
          </Link>
          <button
            type="button"
            onClick={() => setStarted(true)}
            className="inline-flex items-center justify-center rounded-full bg-brand-600 px-8 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            Start practicing
          </button>
        </div>
      </div>
    );
  }

  // ── Results screen ──────────────────────────────────────────────────────────
  if (finished) {
    const percentage = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    return (
      <div className="product-frame quiz-question-enter mx-auto w-full max-w-lg p-8 text-center sm:p-10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-3xl">
          🎉
        </div>
        <h1 className="mt-6 text-2xl font-extrabold text-ink sm:text-3xl">Practice complete!</h1>
        <p className="mt-2 text-sm text-muted">
          You finished all {total} questions of {quiz.title}.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-line bg-surface-soft px-5 py-4">
            <p className="text-xs font-bold uppercase tracking-wide text-muted">Score</p>
            <p className="mt-1 text-2xl font-extrabold text-brand-600">{earnedPoints}</p>
          </div>
          <div className="rounded-2xl border border-line bg-surface-soft px-5 py-4">
            <p className="text-xs font-bold uppercase tracking-wide text-muted">Correct</p>
            <p className="mt-1 text-2xl font-extrabold text-ink">
              {correctCount}/{total}
            </p>
          </div>
          <div className="rounded-2xl border border-line bg-surface-soft px-5 py-4">
            <p className="text-xs font-bold uppercase tracking-wide text-muted">Accuracy</p>
            <p className="mt-1 text-2xl font-extrabold text-ink">{percentage}%</p>
          </div>
        </div>

        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center rounded-full border border-line bg-white px-6 py-3 text-sm font-semibold text-ink transition hover:bg-surface-soft"
          >
            Back to dashboard
          </Link>
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center justify-center rounded-full bg-brand-600 px-8 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            Practice again
          </button>
        </div>
      </div>
    );
  }

  if (!question) {
    return (
      <CenteredMessage emoji="🤔" title="No questions yet">
        This quiz doesn&apos;t have any questions.
      </CenteredMessage>
    );
  }

  // ── Question screen ─────────────────────────────────────────────────────────
  const selectedIds =
    phase === "revealed"
      ? lockedIds
      : isMultiple
        ? multiSelection
        : singleSelection
          ? [singleSelection]
          : [];

  const progressPercent = ((index + 1) / total) * 100;
  const isLast = index + 1 === total;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            to="/dashboard"
            className="text-xs font-bold uppercase tracking-widest text-muted transition hover:text-brand-600"
          >
            ← {quiz.emoji ?? ""} {quiz.title}
          </Link>
          <p className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/40 px-3 py-1 text-xs font-bold text-amber-800 dark:text-amber-300">
            <span aria-hidden>★</span>
            {question.points} pts
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold uppercase tracking-wide text-muted">Score</p>
          <p className="text-lg font-extrabold text-brand-600">{earnedPoints}</p>
        </div>
      </header>

      <div className="mt-5">
        <div className="flex items-center justify-between text-xs font-semibold text-muted">
          <span>
            Question {index + 1} of {total}
          </span>
          <span aria-live="polite" aria-atomic="true">
            {phase === "revealed"
              ? records[records.length - 1]?.correct
                ? "Correct! ✅"
                : "Not quite ❌"
              : "Choose your answer"}
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-muted">
          <div
            className="h-full rounded-full bg-brand-500 transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <article
        key={question.id}
        className="product-frame quiz-question-enter mt-6 flex flex-1 flex-col gap-5 p-6 sm:p-8"
      >
        <Markdown
          content={question.text}
          className="text-xl font-extrabold leading-snug text-ink sm:text-2xl"
        />

        <OptionList
          question={question}
          phase={phase}
          selectedIds={selectedIds}
          isMultiple={Boolean(isMultiple)}
          onSelectOption={handleSelectOption}
        />

        {isMultiple && phase === "answering" ? (
          <button
            type="button"
            onClick={() => lockAnswer(multiSelection)}
            disabled={multiSelection.length === 0}
            className="w-full rounded-2xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-brand-300"
          >
            Lock in answer
            {multiSelection.length > 0 ? ` (${multiSelection.length} selected)` : ""}
          </button>
        ) : null}

        <ExplanationBlock explanation={question.explanation} visible={phase === "revealed"} />
      </article>

      <footer className="mt-auto flex items-center justify-end pt-8">
        <button
          type="button"
          onClick={handleNext}
          disabled={phase !== "revealed"}
          className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-brand-300"
        >
          {isLast ? "See results" : "Next question"}
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path
              d="M6 3L11 8L6 13"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </footer>
    </div>
  );
}
