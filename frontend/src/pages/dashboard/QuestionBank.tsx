import { useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useTempUser } from "../../hooks/useTempUser";
import { useDeleteQuestion, useQuestionBank, useUpdateQuestion } from "../../query/queries";
import { queryKeys } from "../../query/queryKeys";
import type { BankQuestion } from "../../services/quizApi";
import type { QuestionType } from "../../types/exam";
import Markdown from "../../components/Markdown";

const TYPE_LABELS: Record<QuestionType, string> = {
  SINGLE: "Single choice",
  MULTIPLE: "Multiple choice",
  TRUE_FALSE: "True / False",
};

type EditDraft = {
  text: string;
  explanation: string;
  type: QuestionType;
  options: { id: string; text: string; isCorrect: boolean }[];
};

function makeId() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function toDraft(question: BankQuestion): EditDraft {
  return {
    text: question.text,
    explanation: question.explanation ?? "",
    type: question.type,
    options: question.options.map((option) => ({
      id: option.id,
      text: option.text,
      isCorrect: option.isCorrect,
    })),
  };
}

function EditModal({
  question,
  onClose,
  onSaved,
}: {
  question: BankQuestion;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<EditDraft>(() => toDraft(question));
  const [error, setError] = useState<string | null>(null);
  const { mutateAsync: updateAsync, isPending } = useUpdateQuestion();

  function updateOption(optionId: string, patch: Partial<EditDraft["options"][number]>) {
    setDraft((prev) => ({
      ...prev,
      options: prev.options.map((o) => (o.id === optionId ? { ...o, ...patch } : o)),
    }));
  }

  function selectCorrect(optionId: string) {
    setDraft((prev) => ({
      ...prev,
      options:
        prev.type === "MULTIPLE"
          ? prev.options.map((o) => (o.id === optionId ? { ...o, isCorrect: !o.isCorrect } : o))
          : prev.options.map((o) => ({ ...o, isCorrect: o.id === optionId })),
    }));
  }

  function changeType(type: QuestionType) {
    setDraft((prev) => {
      if (type === "TRUE_FALSE") {
        return {
          ...prev,
          type,
          options: [
            { id: makeId(), text: "True", isCorrect: true },
            { id: makeId(), text: "False", isCorrect: false },
          ],
        };
      }
      const hasCorrect = prev.options.some((o) => o.isCorrect);
      return {
        ...prev,
        type,
        options: hasCorrect ? prev.options : prev.options.map((o, i) => ({ ...o, isCorrect: i === 0 })),
      };
    });
  }

  async function save() {
    setError(null);
    const options = draft.options
      .map((o) => ({ text: o.text.trim(), isCorrect: o.isCorrect }))
      .filter((o) => o.text);
    try {
      await updateAsync({
        id: question.id,
        input: {
          text: draft.text.trim(),
          explanation: draft.explanation.trim(),
          type: draft.type,
          options,
        },
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-line px-6 py-4">
          <h3 className="text-lg font-bold text-ink">Edit question</h3>
        </div>

        <div className="grid gap-4 overflow-y-auto p-6">
          <div className="flex flex-wrap gap-2">
            {(["SINGLE", "MULTIPLE", "TRUE_FALSE"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => changeType(t)}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                  draft.type === t
                    ? "border-brand-300 bg-brand-600 text-white"
                    : "border-line bg-white text-muted hover:bg-surface-soft"
                }`}
              >
                {TYPE_LABELS[t]}
              </button>
            ))}
          </div>

          <div>
            <label className="text-xs font-semibold text-muted">Question text</label>
            <textarea
              value={draft.text}
              onChange={(e) => setDraft((p) => ({ ...p, text: e.target.value }))}
              rows={3}
              className="mt-2 w-full rounded-xl border border-line bg-white px-4 py-3 text-sm font-semibold text-ink outline-none transition focus:border-brand-300 focus:ring-4 focus:ring-brand-100"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted">Explanation (optional)</label>
            <input
              value={draft.explanation}
              onChange={(e) => setDraft((p) => ({ ...p, explanation: e.target.value }))}
              className="mt-2 w-full rounded-xl border border-line bg-white px-4 py-3 text-sm font-semibold text-ink outline-none transition focus:border-brand-300 focus:ring-4 focus:ring-brand-100"
            />
          </div>

          <div className="grid gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Options {draft.type === "MULTIPLE" ? "· select all correct" : "· select the correct one"}
            </p>
            {draft.options.map((option, index) => (
              <div key={option.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-white p-3">
                <input
                  type={draft.type === "MULTIPLE" ? "checkbox" : "radio"}
                  name="bank-correct"
                  checked={option.isCorrect}
                  onChange={() => selectCorrect(option.id)}
                  className="cursor-pointer"
                />
                <span className="text-xs font-semibold text-muted">Option {index + 1}</span>
                <input
                  value={option.text}
                  disabled={draft.type === "TRUE_FALSE"}
                  onChange={(e) => updateOption(option.id, { text: e.target.value })}
                  className="min-w-[180px] flex-1 rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold text-ink outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-100 disabled:opacity-70"
                />
                {draft.type !== "TRUE_FALSE" && draft.options.length > 2 ? (
                  <button
                    type="button"
                    onClick={() =>
                      setDraft((p) => ({ ...p, options: p.options.filter((o) => o.id !== option.id) }))
                    }
                    className="text-xs font-semibold text-rose-600 hover:text-rose-700"
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            ))}
            {draft.type !== "TRUE_FALSE" ? (
              <button
                type="button"
                onClick={() =>
                  setDraft((p) => ({
                    ...p,
                    options: [...p.options, { id: makeId(), text: "", isCorrect: false }],
                  }))
                }
                className="justify-self-start rounded-full border border-dashed border-line bg-white px-4 py-2 text-xs font-semibold text-muted transition hover:border-brand-300 hover:text-brand-700"
              >
                + Add option
              </button>
            ) : null}
          </div>

          {error ? <p className="text-xs font-semibold text-rose-600">{error}</p> : null}
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-line px-6 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-line bg-white px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-surface-soft"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={isPending || !draft.text.trim()}
            className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-brand-300"
          >
            {isPending ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function QuestionBank() {
  const user = useTempUser();
  const profileId = user?.profileId;
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuestionBank(profileId);
  const { mutateAsync: deleteAsync } = useDeleteQuestion();

  const [editing, setEditing] = useState<BankQuestion | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const questions = data?.questions ?? [];

  function refresh() {
    if (!profileId) return;
    queryClient.invalidateQueries({ queryKey: queryKeys.questionBank(profileId) });
  }

  async function handleDelete(question: BankQuestion) {
    if (!window.confirm("Delete this question from your bank?")) return;
    setDeletingId(question.id);
    try {
      await deleteAsync(question.id);
      refresh();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="grid gap-8">
      <section className="rounded-2xl border border-line bg-white p-7 shadow-sm md:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-xl text-white">
              📚
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-ink">Question bank</h1>
              <p className="mt-1 text-sm text-muted">
                Every question you create is saved here and can be reused in any session.
              </p>
            </div>
          </div>
          <Link
            to="/dashboard/create"
            className="inline-flex rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            + New session
          </Link>
        </div>
      </section>

      {!profileId ? (
        <div className="rounded-2xl border border-dashed border-line bg-surface-soft p-12 text-center">
          <p className="text-sm text-muted">
            Create or join a session first to start building your question bank.
          </p>
        </div>
      ) : isLoading ? (
        <div className="grid gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-surface-muted" />
          ))}
        </div>
      ) : questions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-surface-soft p-12 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-2xl">
            🗂️
          </div>
          <h2 className="text-lg font-extrabold text-ink">No saved questions yet</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
            Questions you add while creating a session are saved here automatically.
          </p>
          <Link
            to="/dashboard/create"
            className="mt-6 inline-flex rounded-full bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            Create a session
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {questions.map((question) => (
            <article
              key={question.id}
              className="rounded-2xl border border-line bg-white p-6 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-700">
                      {TYPE_LABELS[question.type]}
                    </span>
                    <span className="text-xs text-muted">
                      {question.options.length} options ·{" "}
                      {question.options.filter((o) => o.isCorrect).length} correct
                    </span>
                  </div>
                  <div className="mt-2 text-sm font-semibold text-ink">
                    <Markdown content={question.text} />
                  </div>
                </div>
                <div className="flex flex-none gap-2">
                  <button
                    type="button"
                    onClick={() => setEditing(question)}
                    className="rounded-full border border-line bg-white px-4 py-2 text-xs font-semibold text-ink transition hover:bg-surface-soft"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(question)}
                    disabled={deletingId === question.id}
                    className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-100 disabled:opacity-50"
                  >
                    {deletingId === question.id ? "…" : "Delete"}
                  </button>
                </div>
              </div>

              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {question.options.map((option) => (
                  <li
                    key={option.id}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${
                      option.isCorrect
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border-line bg-surface-soft text-muted"
                    }`}
                  >
                    <span className="flex-none font-bold">{option.isCorrect ? "✓" : "•"}</span>
                    <span className="min-w-0 truncate font-semibold">{option.text}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      )}

      {editing ? (
        <EditModal
          question={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      ) : null}
    </div>
  );
}
