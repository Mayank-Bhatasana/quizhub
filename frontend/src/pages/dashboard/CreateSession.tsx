import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  useCreateGuest,
  useCreateQuestion,
  useCreateRoom,
  useQuestionBank,
} from "../../query/queries";
import { createTempUser, getTempUser, setTempUser, updateTempUser } from "../../utils/tempUser";
import Markdown from "../../components/Markdown";
import type { BankQuestion } from "../../services/quizApi";
import type { QuestionType } from "../../types/exam";

type QuestionDraft = {
  id: string;
  text: string;
  explanation: string;
  type: QuestionType;
  points: number;
  options: { id: string; text: string; isCorrect: boolean }[];
};

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  SINGLE: "Single choice",
  MULTIPLE: "Multiple choice",
  TRUE_FALSE: "True / False",
};

function makeId() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function createQuestionDraft(type: QuestionType = "SINGLE"): QuestionDraft {
  return {
    id: makeId(),
    text: "",
    explanation: "",
    type,
    points: 1,
    options:
      type === "TRUE_FALSE"
        ? [
          { id: makeId(), text: "True", isCorrect: true },
          { id: makeId(), text: "False", isCorrect: false },
        ]
        : [
          { id: makeId(), text: "", isCorrect: true },
          { id: makeId(), text: "", isCorrect: false },
          { id: makeId(), text: "", isCorrect: false },
          { id: makeId(), text: "", isCorrect: false },
        ],
  };
}

export default function CreateSession() {
  const navigate = useNavigate();
  const createGuestMutation = useCreateGuest();
  const createQuestionMutation = useCreateQuestion();
  const createRoomMutation = useCreateRoom();
  const bank = useQuestionBank(getTempUser()?.profileId);
  const [name, setName] = useState(() => getTempUser()?.name ?? "");
  const [questions, setQuestions] = useState<QuestionDraft[]>(() => [createQuestionDraft()]);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showBank, setShowBank] = useState(false);

  const hasValidQuestions = questions.every((q) => {
    const filled = q.options.filter((o) => o.text.trim());
    if (!q.text.trim() || filled.length < 2) return false;
    if (q.type === "TRUE_FALSE" && filled.length !== 2) return false;
    const correct = filled.filter((o) => o.isCorrect).length;
    return q.type === "MULTIPLE" ? correct >= 1 : correct === 1;
  });

  function updateQuestion(questionId: string, patch: Partial<QuestionDraft>) {
    setQuestions((prev) => prev.map((q) => (q.id === questionId ? { ...q, ...patch } : q)));
  }

  function updateOption(questionId: string, optionId: string, patch: Partial<QuestionDraft["options"][number]>) {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === questionId
          ? { ...q, options: q.options.map((o) => (o.id === optionId ? { ...o, ...patch } : o)) }
          : q,
      ),
    );
  }

  function selectCorrectOption(questionId: string, optionId: string) {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== questionId) return q;
        if (q.type === "MULTIPLE") {
          return {
            ...q,
            options: q.options.map((o) =>
              o.id === optionId ? { ...o, isCorrect: !o.isCorrect } : o,
            ),
          };
        }
        return {
          ...q,
          options: q.options.map((o) => ({ ...o, isCorrect: o.id === optionId })),
        };
      }),
    );
  }

  function changeQuestionType(questionId: string, type: QuestionType) {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== questionId) return q;
        if (type === "TRUE_FALSE") {
          return {
            ...q,
            type,
            options: [
              { id: makeId(), text: "True", isCorrect: true },
              { id: makeId(), text: "False", isCorrect: false },
            ],
          };
        }
        const hasCorrect = q.options.some((o) => o.isCorrect);
        return {
          ...q,
          type,
          options: hasCorrect
            ? q.options
            : q.options.map((o, i) => ({ ...o, isCorrect: i === 0 })),
        };
      }),
    );
  }

  function addOption(questionId: string) {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === questionId
          ? { ...q, options: [...q.options, { id: makeId(), text: "", isCorrect: false }] }
          : q,
      ),
    );
  }

  function removeOption(questionId: string, optionId: string) {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === questionId
          ? { ...q, options: q.options.filter((o) => o.id !== optionId) }
          : q,
      ),
    );
  }

  function addQuestion() {
    setQuestions((prev) => [...prev, createQuestionDraft()]);
  }

  function removeQuestion(questionId: string) {
    setQuestions((prev) => prev.filter((q) => q.id !== questionId));
  }

  function importFromBank(bankQuestion: BankQuestion) {
    setQuestions((prev) => [
      ...prev,
      {
        id: makeId(),
        text: bankQuestion.text,
        explanation: bankQuestion.explanation ?? "",
        type: bankQuestion.type,
        points: 1,
        options: bankQuestion.options.map((option) => ({
          id: makeId(),
          text: option.text,
          isCorrect: option.isCorrect,
        })),
      },
    ]);
  }

  // Tab key indent handler for textareas and inputs (inserts 4 spaces)
  const handleKeyDownIndent = (
    e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>,
    questionId: string,
    field: "text" | "explanation"
  ) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const el = e.currentTarget;
      const start = el.selectionStart ?? 0;
      const end = el.selectionEnd ?? 0;
      const val = el.value;
      const spaces = "    ";
      const newVal = val.substring(0, start) + spaces + val.substring(end);
      
      updateQuestion(questionId, { [field]: newVal });
      
      // Restore cursor position
      setTimeout(() => {
        el.selectionStart = el.selectionEnd = start + spaces.length;
      }, 0);
    }
  };

  const handleOptionKeyDownIndent = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    questionId: string,
    optionId: string
  ) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const el = e.currentTarget;
      const start = el.selectionStart ?? 0;
      const end = el.selectionEnd ?? 0;
      const val = el.value;
      const spaces = "    ";
      const newVal = val.substring(0, start) + spaces + val.substring(end);
      
      updateOption(questionId, optionId, { text: newVal });
      
      // Restore cursor position
      setTimeout(() => {
        el.selectionStart = el.selectionEnd = start + spaces.length;
      }, 0);
    }
  };

  const isCreating =
    createGuestMutation.isPending ||
    createQuestionMutation.isPending ||
    createRoomMutation.isPending;

  async function handleCreate() {
    setError(null);
    setStatus("Creating room...");

    const displayName = name.trim() || "Host";
    let local = getTempUser();
    if (!local) {
      local = createTempUser(displayName);
      setTempUser(local);
    } else if (local.name !== displayName) {
      updateTempUser({ name: displayName });
    }

    try {
      const guest = await createGuestMutation.mutateAsync({
        displayName,
        avatarUrl: getTempUser()?.avatarUrl ?? null,
      });
      const hostProfileId = guest.profile.id;

      const createdQuestions = await Promise.all(
        questions.map(async (q) => {
          const trimmedOptions = q.options
            .map((o) => ({ text: o.text.trim(), isCorrect: o.isCorrect }))
            .filter((o) => o.text);

          const result = await createQuestionMutation.mutateAsync({
            createdById: hostProfileId,
            text: q.text.trim(),
            explanation: q.explanation.trim() || undefined,
            type: q.type,
            options: trimmedOptions,
          });

          const questionId = (result.question as { id: string }).id;
          return { questionId, points: q.points };
        })
      );

      const room = await createRoomMutation.mutateAsync({
        hostProfileId,
        questions: createdQuestions,
      });

      updateTempUser({ profileId: hostProfileId });
      setStatus("Room created. Redirecting...");
      console.log(room.room);

      navigate(`/dashboard/session/${room.room.code}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create room";
      setError(message);
      setStatus(null);
    }
  }

  return (
    <div className="grid gap-8">
      <section className="rounded-2xl border border-line bg-white p-7 shadow-sm md:p-8">
        <h1 className="text-2xl font-extrabold text-ink md:text-3xl">Create a live quiz</h1>
        <p className="mt-2 text-sm text-muted">
          Add your questions and start a live room. You can share the code after it is created.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-[minmax(0,1fr)_220px]">
          <div>
            <label className="text-xs font-semibold text-muted" htmlFor="hostName">
              Host display name
            </label>
            <input
              id="hostName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="mt-2 w-full rounded-xl border border-line bg-white px-4 py-3 text-sm font-semibold text-ink outline-none transition focus:border-brand-300 focus:ring-4 focus:ring-brand-100"
            />
          </div>

          <div className="rounded-2xl border border-line bg-surface-soft p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Status</p>
            <p className="mt-2 text-sm font-semibold text-ink">{status ?? "Ready"}</p>
            {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-white p-7 shadow-sm md:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-ink">Questions</h2>
            <p className="mt-1 text-sm text-muted">
              Single choice, multiple choice, or true/false. At least 2 options per question.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowBank(true)}
              className="inline-flex rounded-full border border-brand-200 bg-brand-50 px-5 py-2.5 text-sm font-semibold text-brand-700 transition hover:bg-brand-100"
            >
              Import from bank
            </button>
            <button
              onClick={addQuestion}
              className="inline-flex rounded-full border border-line bg-white px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-surface-soft"
            >
              Add question
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-6">
          {questions.toReversed().map((q, index) => (
            <div key={q.id} className="rounded-2xl border border-line bg-surface-soft p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-sm font-bold text-ink">Question {questions.length - index}</h3>
                {questions.length > 1 ? (
                  <button
                    onClick={() => removeQuestion(q.id)}
                    className="text-xs font-semibold text-rose-600 hover:text-rose-700"
                  >
                    Remove
                  </button>
                ) : null}
              </div>

              <div className="mt-4 grid gap-4">
                <div className="flex flex-wrap gap-2">
                  {(["SINGLE", "MULTIPLE", "TRUE_FALSE"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => changeQuestionType(q.id, t)}
                      className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                        q.type === t
                          ? "border-brand-300 bg-brand-600 text-white"
                          : "border-line bg-white text-muted hover:bg-surface-soft"
                      }`}
                    >
                      {QUESTION_TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted">Question text</label>
                  <textarea
                    value={q.text}
                    onChange={(e) => updateQuestion(q.id, { text: e.target.value })}
                    onKeyDown={(e) => handleKeyDownIndent(e, q.id, "text")}
                    placeholder="Type your question (Markdown supported, e.g. **bold**, `code`, ```code block```)"
                    className="mt-2 w-full rounded-xl border border-line bg-white px-4 py-3 text-sm font-semibold text-ink outline-none transition focus:border-brand-300 focus:ring-4 focus:ring-brand-100"
                    rows={3}
                  />
                  {q.text.trim() && (
                    <div className="mt-2 rounded-xl border border-dashed border-brand-200 bg-brand-50/30 p-4 min-w-0">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-brand-600 mb-2">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75" />
                          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-500" />
                        </span>
                        Live Preview
                      </div>
                      <Markdown content={q.text} className="text-sm text-ink leading-relaxed" />
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted">Explanation (optional)</label>
                  <input
                    value={q.explanation}
                    onChange={(e) => updateQuestion(q.id, { explanation: e.target.value })}
                    onKeyDown={(e) => handleKeyDownIndent(e, q.id, "explanation")}
                    placeholder="Explain the correct answer (Markdown supported)"
                    className="mt-2 w-full rounded-xl border border-line bg-white px-4 py-3 text-sm font-semibold text-ink outline-none transition focus:border-brand-300 focus:ring-4 focus:ring-brand-100"
                  />
                  {q.explanation.trim() && (
                    <div className="mt-2 rounded-xl border border-dashed border-emerald-200 bg-emerald-50/20 p-4 min-w-0">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600 mb-2">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        </span>
                        Explanation Preview
                      </div>
                      <Markdown content={q.explanation} className="text-sm text-ink leading-relaxed" />
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted">Points</label>
                  <input
                    type="number"
                    min={1}
                    value={q.points}
                    onChange={(e) => updateQuestion(q.id, { points: Number(e.target.value) || 1 })}
                    className="mt-2 w-full max-w-[140px] rounded-xl border border-line bg-white px-4 py-3 text-sm font-semibold text-ink outline-none transition focus:border-brand-300 focus:ring-4 focus:ring-brand-100"
                  />
                </div>

                <div className="grid gap-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    Options {q.type === "MULTIPLE" ? "· select all correct" : "· select the correct one"}
                  </p>
                  {q.options.map((option, optionIndex) => (
                    <div
                      key={option.id}
                      className="flex flex-col gap-2 rounded-xl border border-line bg-white p-4"
                    >
                      <label className="flex flex-wrap items-center gap-3 cursor-pointer">
                        <input
                          type={q.type === "MULTIPLE" ? "checkbox" : "radio"}
                          name={`correct-${q.id}`}
                          checked={option.isCorrect}
                          onChange={() => selectCorrectOption(q.id, option.id)}
                          className="cursor-pointer"
                        />
                        <span className="text-xs font-semibold text-muted">Option {optionIndex + 1}</span>
                        <textarea
                          value={option.text}
                          disabled={q.type === "TRUE_FALSE"}
                          onChange={(e) => updateOption(q.id, option.id, { text: e.target.value })}
                          onKeyDown={(e) => handleOptionKeyDownIndent(e, q.id, option.id)}
                          placeholder="Answer option (Markdown supported)"
                          className="min-w-[200px] flex-1 rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold text-ink outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-100 resize-y disabled:opacity-70"
                          rows={1}
                        />
                        {q.type !== "TRUE_FALSE" && q.options.length > 2 ? (
                          <button
                            type="button"
                            onClick={() => removeOption(q.id, option.id)}
                            className="text-xs font-semibold text-rose-600 hover:text-rose-700"
                          >
                            Remove
                          </button>
                        ) : null}
                      </label>
                      {option.text.trim() && (/[*`_]/.test(option.text)) && (
                        <div className="pl-7 text-xs flex items-center gap-2 text-muted border-t border-slate-50 pt-2">
                          <span className="font-bold text-[9px] uppercase tracking-wider text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded">Preview:</span>
                          <Markdown content={option.text} className="inline-block text-ink font-semibold" />
                        </div>
                      )}
                    </div>
                  ))}
                  {q.type !== "TRUE_FALSE" ? (
                    <button
                      type="button"
                      onClick={() => addOption(q.id)}
                      className="justify-self-start rounded-full border border-dashed border-line bg-white px-4 py-2 text-xs font-semibold text-muted transition hover:border-brand-300 hover:text-brand-700"
                    >
                      + Add option
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            onClick={handleCreate}
            disabled={!hasValidQuestions || isCreating}
            className="rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-brand-300"
          >
            {isCreating ? "Creating..." : "Create room"}
          </button>
        </div>
      </section>

      {showBank ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
          onClick={() => setShowBank(false)}
        >
          <div
            className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-line px-6 py-4">
              <div>
                <h3 className="text-lg font-bold text-ink">Question bank</h3>
                <p className="text-xs text-muted">Add a saved question to this session.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowBank(false)}
                className="rounded-full p-2 text-muted transition hover:bg-surface-soft hover:text-ink"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="grid gap-3 overflow-y-auto p-6">
              {bank.isLoading ? (
                <p className="text-sm text-muted">Loading…</p>
              ) : (bank.data?.questions ?? []).length === 0 ? (
                <div className="rounded-xl border border-dashed border-line bg-surface-soft p-8 text-center">
                  <p className="text-sm text-muted">
                    No saved questions yet. Questions you create are saved to your bank
                    automatically.
                  </p>
                </div>
              ) : (
                bank.data!.questions.map((bankQuestion) => (
                  <div
                    key={bankQuestion.id}
                    className="flex items-start gap-3 rounded-xl border border-line bg-surface-soft p-4"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-700">
                          {QUESTION_TYPE_LABELS[bankQuestion.type]}
                        </span>
                        <span className="text-xs text-muted">
                          {bankQuestion.options.length} options
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm font-semibold text-ink">
                        {bankQuestion.text}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => importFromBank(bankQuestion)}
                      className="flex-none rounded-full bg-brand-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-brand-700"
                    >
                      Add
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
