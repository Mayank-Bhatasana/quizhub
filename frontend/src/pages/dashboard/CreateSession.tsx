import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCreateGuest, useCreateQuestion, useCreateRoom } from "../../query/queries";
import { createTempUser, getTempUser, setTempUser, updateTempUser } from "../../utils/tempUser";

type QuestionDraft = {
  id: string;
  text: string;
  explanation: string;
  points: number;
  options: { id: string; text: string; isCorrect: boolean }[];
};

function makeId() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function createQuestionDraft(): QuestionDraft {
  return {
    id: makeId(),
    text: "",
    explanation: "",
    points: 1,
    options: [
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
  const [name, setName] = useState(() => getTempUser()?.name ?? "");
  const [questions, setQuestions] = useState<QuestionDraft[]>(() => [createQuestionDraft()]);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hasValidQuestions = useMemo(() => {
    return questions.every((q) =>
      q.text.trim() && q.options.filter((o) => o.text.trim()).length >= 2 && q.options.some((o) => o.isCorrect),
    );
  }, [questions]);

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

  function setCorrectOption(questionId: string, optionId: string) {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === questionId
          ? {
            ...q,
            options: q.options.map((o) => ({ ...o, isCorrect: o.id === optionId })),
          }
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

      const createdQuestions = [] as { questionId: string; points: number }[];
      for (const q of questions) {
        const trimmedOptions = q.options
          .map((o) => ({ text: o.text.trim(), isCorrect: o.isCorrect }))
          .filter((o) => o.text);

        const result = await createQuestionMutation.mutateAsync({
          createdById: hostProfileId,
          text: q.text.trim(),
          explanation: q.explanation.trim() || undefined,
          options: trimmedOptions,
        });

        const questionId = (result.question as { id: string }).id;
        createdQuestions.push({ questionId, points: q.points });
      }

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
            <p className="mt-1 text-sm text-muted">At least 2 options per question, one correct.</p>
          </div>
          <button
            onClick={addQuestion}
            className="inline-flex rounded-full border border-line bg-white px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-surface-soft"
          >
            Add question
          </button>
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
                <div>
                  <label className="text-xs font-semibold text-muted">Question text</label>
                  <input
                    value={q.text}
                    onChange={(e) => updateQuestion(q.id, { text: e.target.value })}
                    placeholder="Type your question"
                    className="mt-2 w-full rounded-xl border border-line bg-white px-4 py-3 text-sm font-semibold text-ink outline-none transition focus:border-brand-300 focus:ring-4 focus:ring-brand-100"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted">Explanation (optional)</label>
                  <input
                    value={q.explanation}
                    onChange={(e) => updateQuestion(q.id, { explanation: e.target.value })}
                    placeholder="Explain the correct answer"
                    className="mt-2 w-full rounded-xl border border-line bg-white px-4 py-3 text-sm font-semibold text-ink outline-none transition focus:border-brand-300 focus:ring-4 focus:ring-brand-100"
                  />
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
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">Options</p>
                  {q.options.map((option, optionIndex) => (
                    <label
                      key={option.id}
                      className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-white px-4 py-3"
                    >
                      <input
                        type="radio"
                        name={`correct-${q.id}`}
                        checked={option.isCorrect}
                        onChange={() => setCorrectOption(q.id, option.id)}
                      />
                      <span className="text-xs font-semibold text-muted">Option {optionIndex + 1}</span>
                      <input
                        value={option.text}
                        onChange={(e) => updateOption(q.id, option.id, { text: e.target.value })}
                        placeholder="Answer option"
                        className="min-w-[200px] flex-1 rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold text-ink outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
                      />
                    </label>
                  ))}
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
    </div>
  );
}
