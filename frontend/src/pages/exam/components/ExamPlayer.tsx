import type { ExamQuestion, QuestionPhase } from "../../../types/exam";
import { QUESTION_TIME_SECONDS } from "../../../types/exam";

const OPTION_LETTERS = ["A", "B", "C", "D"];

type ExamPlayerProps = {
  roomCode: string;
  question: ExamQuestion;
  questionNumber: number;
  totalQuestions: number;
  timeLeft: number;
  phase: QuestionPhase;
  selectedOptionId: string | null;
  onSelectOption: (optionId: string) => void;
  onPrev: () => void;
  onNext: () => void;
  canGoPrev: boolean;
  canGoNext: boolean;
  isComplete: boolean;
  earnedPoints: number;
  maxPoints: number;
  onComplete?: () => void;
};

function TimerRing({ timeLeft, phase }: { timeLeft: number; phase: QuestionPhase }) {
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const progress = timeLeft / QUESTION_TIME_SECONDS;
  const dashOffset = circumference * (1 - progress);

  const ringColor =
    phase === "revealed"
      ? "stroke-slate-300"
      : timeLeft <= 5
        ? "stroke-rose-500"
        : timeLeft <= 10
          ? "stroke-amber-500"
          : "stroke-emerald-500";

  const textColor =
    phase === "revealed"
      ? "text-muted"
      : timeLeft <= 5
        ? "text-rose-600"
        : timeLeft <= 10
          ? "text-amber-600"
          : "text-emerald-600";

  return (
    <div className="relative flex h-14 w-14 items-center justify-center" aria-hidden>
      <svg className="-rotate-90" width="56" height="56" viewBox="0 0 56 56">
        <circle
          cx="28"
          cy="28"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          className="text-slate-200"
        />
        <circle
          cx="28"
          cy="28"
          r={radius}
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={phase === "revealed" ? 0 : dashOffset}
          className={`transition-all duration-1000 ease-linear ${ringColor}`}
        />
      </svg>
      <span className={`absolute text-sm font-extrabold tabular-nums ${textColor}`}>
        {phase === "revealed" ? "—" : timeLeft}
      </span>
    </div>
  );
}

function OptionList({
  question,
  phase,
  selectedOptionId,
  onSelectOption,
}: {
  question: ExamQuestion;
  phase: QuestionPhase;
  selectedOptionId: string | null;
  onSelectOption: (optionId: string) => void;
}) {
  const isRevealed = phase === "revealed";
  const correctOptionId = question.options.find((o) => o.isCorrect)?.id;

  return (
    <ul className="mt-8 grid gap-3">
      {question.options.map((option, index) => {
        const isSelected = selectedOptionId === option.id;
        const isCorrect = option.isCorrect;
        const showCorrect = isRevealed && isCorrect;
        const showWrong = isRevealed && isSelected && !isCorrect;

        let stateClasses =
          "border-line bg-white hover:border-brand-300 hover:bg-brand-50/40 hover:shadow-sm";

        if (isRevealed) {
          if (showCorrect) {
            stateClasses =
              "border-emerald-400 bg-emerald-50 ring-2 ring-emerald-200 quiz-card-correct";
          } else if (showWrong) {
            stateClasses = "border-rose-400 bg-rose-50 ring-2 ring-rose-200 quiz-card-wrong";
          } else {
            stateClasses = "border-line bg-surface-soft opacity-60";
          }
        } else if (isSelected) {
          stateClasses = "border-brand-400 bg-brand-50 ring-2 ring-brand-100";
        }

        return (
          <li
            key={option.id}
            className="quiz-question-enter"
            style={{ animationDelay: `${index * 60}ms` }}
          >
            <button
              type="button"
              disabled={isRevealed}
              aria-pressed={isSelected}
              aria-disabled={isRevealed}
              onClick={() => onSelectOption(option.id)}
              className={`group flex w-full items-center gap-4 rounded-2xl border px-4 py-4 text-left transition disabled:cursor-default sm:px-5 sm:py-5 ${stateClasses}`}
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold transition ${showCorrect
                  ? "bg-emerald-500 text-white"
                  : showWrong
                    ? "bg-rose-500 text-white"
                    : isSelected
                      ? "bg-brand-600 text-white"
                      : "bg-surface-muted text-ink group-hover:bg-brand-100 group-hover:text-brand-700"
                  }`}
              >
                {OPTION_LETTERS[index]}
              </span>
              <span className="flex-1 text-sm font-semibold leading-snug text-ink sm:text-base">
                {option.text}
              </span>
              {showCorrect ? (
                <span className="quiz-check-pop flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                    <path
                      d="M3 8.5L6.5 12L13 4"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              ) : null}
              {showWrong ? (
                <span className="quiz-check-pop flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-500 text-white">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                    <path
                      d="M3 3L11 11M11 3L3 11"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
              ) : null}
            </button>
          </li>
        );
      })}
      {isRevealed && !selectedOptionId && correctOptionId ? (
        <p className="mt-1 text-center text-xs font-semibold text-amber-700">
          Time&apos;s up — the correct answer is highlighted.
        </p>
      ) : null}
    </ul>
  );
}

function ExplanationBlock({ explanation, visible }: { explanation?: string; visible: boolean }) {
  if (!explanation || !visible) return null;

  return (
    <div className="exam-explanation-in mt-6 rounded-2xl border border-brand-200 border-l-4 border-l-brand-500 bg-brand-50/70 px-5 py-4">
      <div className="flex items-start gap-3">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-base"
          aria-hidden
        >
          💡
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-brand-700">Explanation</p>
          <p className="mt-1 text-sm leading-relaxed text-ink">{explanation}</p>
        </div>
      </div>
    </div>
  );
}

function CompletionCard({
  earnedPoints,
  maxPoints,
  totalQuestions,
  onComplete,
}: {
  earnedPoints: number;
  maxPoints: number;
  totalQuestions: number;
  onComplete?: () => void;
}) {
  const percentage = maxPoints > 0 ? Math.round((earnedPoints / maxPoints) * 100) : 0;

  return (
    <div className="product-frame quiz-question-enter mx-auto w-full max-w-lg p-8 text-center sm:p-10">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-3xl">
        🎉
      </div>
      <h1 className="mt-6 text-2xl font-extrabold text-ink sm:text-3xl">Quiz complete!</h1>
      <p className="mt-2 text-sm text-muted">You finished all {totalQuestions} questions.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-line bg-surface-soft px-5 py-4">
          <p className="text-xs font-bold uppercase tracking-wide text-muted">Your score</p>
          <p className="mt-1 text-2xl font-extrabold text-brand-600">{earnedPoints}</p>
        </div>
        <div className="rounded-2xl border border-line bg-surface-soft px-5 py-4">
          <p className="text-xs font-bold uppercase tracking-wide text-muted">Accuracy</p>
          <p className="mt-1 text-2xl font-extrabold text-ink">{percentage}%</p>
        </div>
      </div>

      {onComplete ? (
        <button
          type="button"
          onClick={onComplete}
          className="mt-8 inline-flex rounded-full bg-brand-600 px-8 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
        >
          Done
        </button>
      ) : null}
    </div>
  );
}

function ExamFooter({
  canGoPrev,
  canGoNext,
  isLastQuestion,
  onPrev,
  onNext,
}: {
  canGoPrev: boolean;
  canGoNext: boolean;
  isLastQuestion: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <footer className="mt-auto flex items-center justify-between gap-4 pt-8">
      <button
        type="button"
        onClick={onPrev}
        disabled={!canGoPrev}
        className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-surface-soft disabled:cursor-not-allowed disabled:opacity-40"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
          <path
            d="M10 3L5 8L10 13"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Previous
      </button>

      <button
        type="button"
        onClick={onNext}
        disabled={!canGoNext}
        className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-brand-300"
      >
        {isLastQuestion ? "Finish" : "Next"}
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
  );
}

export default function ExamPlayer({
  roomCode,
  question,
  questionNumber,
  totalQuestions,
  timeLeft,
  phase,
  selectedOptionId,
  onSelectOption,
  onPrev,
  onNext,
  canGoPrev,
  canGoNext,
  isComplete,
  earnedPoints,
  maxPoints,
  onComplete,
}: ExamPlayerProps) {
  if (isComplete) {
    return (
      <CompletionCard
        earnedPoints={earnedPoints}
        maxPoints={maxPoints}
        totalQuestions={totalQuestions}
        onComplete={onComplete}
      />
    );
  }

  const progressPercent = (questionNumber / totalQuestions) * 100;
  const isLastQuestion = questionNumber === totalQuestions;

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-muted">Room code</p>
          <p className="mt-0.5 font-mono text-lg font-extrabold tracking-wider text-ink">{roomCode}</p>
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800">
            <span aria-hidden>★</span>
            {question.points} pts
          </span>
          <TimerRing timeLeft={timeLeft} phase={phase} />
        </div>
      </header>

      <div className="mt-5">
        <div className="flex items-center justify-between text-xs font-semibold text-muted">
          <span>
            Question {questionNumber} of {totalQuestions}
          </span>
          <span aria-live="polite" aria-atomic="true">
            {phase === "answering" ? `${timeLeft}s remaining` : "Answer locked"}
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-muted">
          <div
            className="h-full rounded-full bg-brand-500 transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <article key={question.id} className="product-frame mt-6 flex-1 p-6 sm:p-8 quiz-question-enter">
        <h2 className="text-xl font-extrabold leading-snug text-ink sm:text-2xl">{question.text}</h2>

        <OptionList
          question={question}
          phase={phase}
          selectedOptionId={selectedOptionId}
          onSelectOption={onSelectOption}
        />

        <ExplanationBlock explanation={question.explanation} visible={phase === "revealed"} />
      </article>

      <ExamFooter
        canGoPrev={canGoPrev}
        canGoNext={canGoNext}
        isLastQuestion={isLastQuestion}
        onPrev={onPrev}
        onNext={onNext}
      />
    </div>
  );
}
