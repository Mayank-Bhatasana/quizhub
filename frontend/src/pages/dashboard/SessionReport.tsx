import { Link, useParams } from "react-router-dom";
import { useRoomAnalytics } from "../../query/queries";
import { downloadCsv, scoreboardToCsv } from "../../utils/csv";
import type { RoomQuestionStat } from "../../services/quizApi";

function codeFromParam(input: string | undefined) {
  return (input ?? "").trim().replace(/\s+/g, "").toUpperCase();
}

function formatTime(sec: number) {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function StatCard({
  label,
  value,
  sub,
  icon,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: string;
  accent: string;
}) {
  return (
    <div className="relative overflow-hidden flex flex-col gap-3 rounded-2xl border border-line bg-white p-5 shadow-sm">
      <div className={`flex h-9 w-9 items-center justify-center rounded-xl text-lg ${accent}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
        <p className="mt-0.5 text-2xl font-extrabold leading-none text-ink">{value}</p>
        {sub ? <p className="mt-1 text-xs text-muted">{sub}</p> : null}
      </div>
    </div>
  );
}

function accuracyColor(accuracy: number) {
  if (accuracy >= 75) return "bg-emerald-500";
  if (accuracy >= 50) return "bg-amber-500";
  return "bg-rose-500";
}

function QuestionBreakdown({ stat, total }: { stat: RoomQuestionStat; total: number }) {
  const maxCount = Math.max(...stat.optionCounts.map((o) => o.count), 1);

  return (
    <article className="rounded-2xl border border-line bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-muted">
            Question {stat.index + 1} · {stat.points} pts
          </p>
          <p className="mt-1 line-clamp-3 text-sm font-semibold text-ink">{stat.text}</p>
        </div>
        <div className="flex-none text-right">
          <p className="text-2xl font-extrabold text-ink">{stat.accuracy}%</p>
          <p className="text-xs text-muted">
            {stat.correctCount}/{stat.answered} correct
          </p>
        </div>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-muted">
        <div
          className={`h-full rounded-full ${accuracyColor(stat.accuracy)}`}
          style={{ width: `${stat.accuracy}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-muted">
        Average response time {formatTime(stat.avgTimeSeconds)} ·{" "}
        {stat.answered} of {total} answered
      </p>

      <ul className="mt-4 grid gap-2">
        {stat.optionCounts.map((option) => {
          const pct = stat.answered ? Math.round((option.count / stat.answered) * 100) : 0;
          return (
            <li key={option.id} className="flex items-center gap-3">
              <span
                className={`w-5 flex-none text-center text-xs font-bold ${
                  option.isCorrect ? "text-emerald-600" : "text-muted"
                }`}
                aria-hidden
              >
                {option.isCorrect ? "✓" : "•"}
              </span>
              <span className="w-full max-w-[45%] flex-none truncate text-xs font-semibold text-ink">
                {option.text}
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-muted">
                <div
                  className={`h-full rounded-full ${option.isCorrect ? "bg-emerald-400" : "bg-slate-400"}`}
                  style={{ width: `${(option.count / maxCount) * 100}%` }}
                />
              </div>
              <span className="w-16 flex-none text-right text-xs font-semibold text-muted">
                {option.count} · {pct}%
              </span>
            </li>
          );
        })}
      </ul>
    </article>
  );
}

export default function SessionReport() {
  const params = useParams();
  const code = codeFromParam(params.code);
  const { data, isLoading, isError } = useRoomAnalytics(code, Boolean(code));
  const analytics = data?.analytics;

  if (!code) {
    return (
      <div className="rounded-2xl border border-line bg-white p-8 shadow-sm">
        <p className="text-sm text-muted">Missing session code.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-surface-muted" />
          ))}
        </div>
        <div className="h-48 animate-pulse rounded-2xl bg-surface-muted" />
      </div>
    );
  }

  if (isError || !analytics) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center">
        <p className="text-sm font-semibold text-rose-600">
          Could not load the session report. Check the room code and try again.
        </p>
        <Link
          to="/dashboard"
          className="mt-4 inline-flex rounded-full bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
        >
          Back to dashboard
        </Link>
      </div>
    );
  }

  const restarting = analytics.status === "LIVE" || analytics.status === "LOBBY";

  return (
    <div className="grid gap-8">
      <section className="rounded-2xl border border-line bg-white p-7 shadow-sm md:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-xl text-white">
              📊
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-ink">Session report</h1>
              <p className="mt-1 text-sm text-muted">
                Room <span className="font-bold text-ink">{analytics.roomCode}</span> ·{" "}
                {analytics.status === "ENDED" ? "Ended" : restarting ? "In progress" : analytics.status}
                {analytics.startedAt
                  ? ` · ${new Date(analytics.startedAt).toLocaleString()}`
                  : ""}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {restarting ? (
              <Link
                to={`/dashboard/session/${code}`}
                className="inline-flex rounded-full border border-line bg-white px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-surface-soft"
              >
                Back to lobby
              </Link>
            ) : null}
            <button
              type="button"
              onClick={() =>
                downloadCsv(
                  `quizhub-${code}-results.csv`,
                  scoreboardToCsv(code, analytics.scoreboard),
                )
              }
              disabled={analytics.scoreboard.length === 0}
              className="inline-flex rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-brand-300"
            >
              Download CSV
            </button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Participants"
          value={analytics.totalParticipants}
          sub="joined the session"
          icon="👥"
          accent="bg-brand-100"
        />
        <StatCard
          label="Completed"
          value={`${analytics.completed}/${analytics.totalParticipants}`}
          sub="answered all questions"
          icon="✅"
          accent="bg-emerald-100"
        />
        <StatCard
          label="Average score"
          value={analytics.avgScore.toLocaleString()}
          sub="points per player"
          icon="⚡"
          accent="bg-indigo-100"
        />
        <StatCard
          label="Top score"
          value={analytics.topScore.toLocaleString()}
          sub="best result"
          icon="🏆"
          accent="bg-amber-100"
        />
      </div>

      <div>
        <h2 className="mb-4 text-base font-extrabold text-ink">
          Per-question breakdown
        </h2>
        {analytics.questionStats.length === 0 ? (
          <p className="text-sm text-muted">No questions in this session.</p>
        ) : (
          <div className="grid gap-4">
            {analytics.questionStats.map((stat) => (
              <QuestionBreakdown
                key={stat.roomQuestionId}
                stat={stat}
                total={analytics.totalParticipants}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
