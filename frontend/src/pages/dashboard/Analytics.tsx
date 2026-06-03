import { Link } from "react-router-dom";
import { useTempUser } from "../../hooks/useTempUser";
import { useAnalytics } from "../../query/queries";
import AccountPrompt from "../../components/dashboard/AccountPrompt";
import type { RecentSession } from "../../services/quizApi";

// ── Tiny helpers ─────────────────────────────────────────────────────────────

function formatTime(sec: number) {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function relativeDate(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]!);
}

// ── Accuracy arc (SVG donut) ──────────────────────────────────────────────────

function AccuracyArc({ pct }: { pct: number }) {
  const r = 48;
  const circ = 2 * Math.PI * r;
  const filled = (pct / 100) * circ;
  const color =
    pct >= 75 ? "#22c55e" : pct >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <svg viewBox="0 0 120 120" className="w-28 h-28" aria-hidden>
      <circle cx="60" cy="60" r={r} fill="none" stroke="#e2e8f0" strokeWidth="10" />
      <circle
        cx="60"
        cy="60"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="10"
        strokeDasharray={`${filled} ${circ - filled}`}
        strokeDashoffset={circ / 4}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 1s cubic-bezier(0.22,1,0.36,1)" }}
      />
      <text x="60" y="55" textAnchor="middle" fontSize="20" fontWeight="800" fill="#0f172a">
        {pct}%
      </text>
      <text x="60" y="73" textAnchor="middle" fontSize="11" fill="#64748b" fontWeight="600">
        accuracy
      </text>
    </svg>
  );
}

// ── Mini bar chart ────────────────────────────────────────────────────────────

function SessionBars({ sessions }: { sessions: RecentSession[] }) {
  const reversed = [...sessions].reverse().slice(-8);
  const maxScore = Math.max(...reversed.map((s) => s.score), 1);

  return (
    <div className="flex items-end gap-1.5 h-16 w-full">
      {reversed.map((s, i) => {
        const pct = Math.max((s.score / maxScore) * 100, 4);
        const color =
          s.accuracy >= 75
            ? "bg-emerald-400"
            : s.accuracy >= 50
            ? "bg-amber-400"
            : "bg-rose-400";
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
            <div
              className={`w-full rounded-t-md ${color} transition-all duration-700`}
              style={{ height: `${pct}%` }}
            />
            {/* tooltip */}
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-10">
              <div className="rounded-lg bg-ink text-white text-xs px-2 py-1.5 whitespace-nowrap shadow-lg">
                <div className="font-bold">{s.score.toLocaleString()} pts</div>
                <div className="opacity-75">{s.accuracy}% acc</div>
              </div>
              <div className="w-2 h-2 bg-ink rotate-45 -mt-1" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

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
    <div className="relative overflow-hidden rounded-2xl border border-line bg-white p-5 shadow-sm flex flex-col gap-3">
      <div className={`flex h-9 w-9 items-center justify-center rounded-xl text-lg ${accent}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
        <p className="mt-0.5 text-2xl font-extrabold text-ink leading-none">{value}</p>
        {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-transparent to-brand-50/30" />
    </div>
  );
}

// ── Session row ───────────────────────────────────────────────────────────────

function SessionRow({ s }: { s: RecentSession }) {
  const accuracyColor =
    s.accuracy >= 75
      ? "text-emerald-600 bg-emerald-50 border-emerald-200"
      : s.accuracy >= 50
      ? "text-amber-600 bg-amber-50 border-amber-200"
      : "text-rose-600 bg-rose-50 border-rose-200";

  const rankBadge =
    s.rank === 1
      ? "🥇"
      : s.rank === 2
      ? "🥈"
      : s.rank === 3
      ? "🥉"
      : null;

  return (
    <div className="flex items-center gap-4 rounded-xl border border-line bg-white p-4 transition hover:border-brand-200 hover:shadow-sm">
      {/* Room code */}
      <div className="flex-none">
        <span className="inline-flex items-center rounded-lg bg-brand-50 border border-brand-200 px-3 py-1.5 text-sm font-bold text-brand-700 tracking-wide font-mono">
          {s.roomCode}
        </span>
      </div>

      {/* Score + correct */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-base font-extrabold text-ink">{s.score.toLocaleString()} pts</span>
          {rankBadge && <span className="text-base">{rankBadge}</span>}
          {!rankBadge && s.totalParticipants > 1 && (
            <span className="text-xs font-semibold text-muted">
              {ordinal(s.rank)} of {s.totalParticipants}
            </span>
          )}
        </div>
        <div className="mt-1 flex items-center gap-3 text-xs text-muted">
          <span>{s.correct}/{s.total} correct</span>
          {s.timeSec > 0 && <span>· {formatTime(s.timeSec)} total</span>}
          <span>· {relativeDate(s.playedAt)}</span>
        </div>
      </div>

      {/* Accuracy badge */}
      <div className="flex-none">
        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${accuracyColor}`}>
          {s.accuracy}%
        </span>
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-surface-soft p-12 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-2xl">
        🎯
      </div>
      <h2 className="text-lg font-extrabold text-ink">No sessions yet</h2>
      <p className="mt-2 text-sm text-muted max-w-xs mx-auto">
        Join a live quiz session to start tracking your scores, accuracy, and rankings here.
      </p>
      <Link
        to="/dashboard"
        className="mt-6 inline-flex rounded-full bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
      >
        Join a session
      </Link>
    </div>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-xl bg-surface-muted ${className ?? ""}`} />
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid gap-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <Skeleton className="h-48" />
      <div className="grid gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DashboardAnalytics() {
  const user = useTempUser();
  const profileId = user?.profileId;
  const { data, isLoading, isError } = useAnalytics(profileId);
  const analytics = data?.analytics;

  // No profile yet
  if (!profileId) {
    return (
      <div className="grid gap-8">
        <div className="rounded-2xl border border-line bg-white p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-xl">📊</div>
            <h1 className="text-2xl font-extrabold text-ink">Analytics</h1>
          </div>
          <p className="text-sm text-muted max-w-md">
            Join a quiz session to start tracking your performance. Your stats will appear here after your first session.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/dashboard"
              className="inline-flex rounded-full bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
            >
              Join a session
            </Link>
          </div>
        </div>
        <AccountPrompt variant="card" />
      </div>
    );
  }

  if (isLoading) return <LoadingSkeleton />;

  if (isError || !analytics) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center">
        <p className="text-sm font-semibold text-rose-600">Failed to load analytics. Please refresh.</p>
      </div>
    );
  }

  const hasData = analytics.totalSessions > 0;

  return (
    <div className="grid gap-8">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-xl text-white shadow-sm">
              📊
            </div>
            <h1 className="text-2xl font-extrabold text-ink">Your Analytics</h1>
          </div>
          <p className="mt-1 text-sm text-muted">
            {hasData
              ? `${analytics.totalSessions} session${analytics.totalSessions !== 1 ? "s" : ""} tracked · all time`
              : "Join your first session to start collecting stats"}
          </p>
        </div>
        <Link
          to="/dashboard"
          className="inline-flex rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 shadow-sm"
        >
          + Join session
        </Link>
      </div>

      {!hasData ? (
        <EmptyState />
      ) : (
        <>
          {/* ── Stat cards ── */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Sessions played"
              value={analytics.totalSessions}
              sub="total sessions joined"
              icon="🎮"
              accent="bg-brand-100"
            />
            <StatCard
              label="Best score"
              value={analytics.bestScore.toLocaleString()}
              sub="points in a single session"
              icon="🏆"
              accent="bg-amber-100"
            />
            <StatCard
              label="Correct answers"
              value={analytics.totalCorrect}
              sub={`of ${analytics.totalAnswered} answered`}
              icon="✅"
              accent="bg-emerald-100"
            />
            <StatCard
              label="Avg response time"
              value={formatTime(analytics.avgTimeSec)}
              sub="per question"
              icon="⚡"
              accent="bg-indigo-100"
            />
          </div>

          {/* ── Accuracy + trend row ── */}
          <div className="grid gap-6 md:grid-cols-2">

            {/* Accuracy donut */}
            <div className="rounded-2xl border border-line bg-white p-6 shadow-sm flex items-center gap-6">
              <AccuracyArc pct={analytics.overallAccuracy} />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Overall accuracy</p>
                <p className="mt-2 text-4xl font-extrabold text-ink leading-none">
                  {analytics.overallAccuracy}%
                </p>
                <p className="mt-2 text-sm text-muted">
                  {analytics.totalCorrect} correct out of {analytics.totalAnswered} answers
                </p>
                <div className="mt-3 flex gap-2 flex-wrap">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                    analytics.overallAccuracy >= 75
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : analytics.overallAccuracy >= 50
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-rose-50 text-rose-700 border-rose-200"
                  }`}>
                    {analytics.overallAccuracy >= 75
                      ? "🔥 On fire"
                      : analytics.overallAccuracy >= 50
                      ? "👍 Solid"
                      : "📚 Keep practising"}
                  </span>
                </div>
              </div>
            </div>

            {/* Score trend bars */}
            <div className="rounded-2xl border border-line bg-white p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-1">Score trend</p>
              <p className="text-sm text-muted mb-4">Last {Math.min(analytics.recentSessions.length, 8)} sessions</p>
              {analytics.recentSessions.length > 0 ? (
                <>
                  <SessionBars sessions={analytics.recentSessions} />
                  <div className="mt-3 flex gap-4 text-xs text-muted">
                    <span className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-emerald-400" />≥75% acc</span>
                    <span className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-amber-400" />50–74%</span>
                    <span className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-rose-400" />&lt;50%</span>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted">No sessions yet.</p>
              )}
            </div>
          </div>

          {/* ── Total score highlight ── */}
          <div className="relative overflow-hidden rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 via-white to-brand-50 p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">All-time score</p>
                <p className="mt-1 text-5xl font-extrabold text-brand-700 leading-none tracking-tight">
                  {analytics.totalScore.toLocaleString()}
                  <span className="ml-2 text-lg font-semibold text-brand-400">pts</span>
                </p>
                <p className="mt-2 text-sm text-muted">
                  Across {analytics.totalSessions} session{analytics.totalSessions !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="text-7xl select-none opacity-20 font-extrabold text-brand-600 hidden sm:block">
                🏅
              </div>
            </div>
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand-400/5 via-transparent to-transparent" />
          </div>

          {/* ── Recent sessions ── */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-extrabold text-ink">Recent sessions</h2>
              <span className="text-xs text-muted">Last {analytics.recentSessions.length}</span>
            </div>

            {analytics.recentSessions.length === 0 ? (
              <p className="text-sm text-muted">No sessions yet.</p>
            ) : (
              <div className="grid gap-3">
                {analytics.recentSessions.map((s) => (
                  <SessionRow key={s.roomId + s.playedAt} s={s} />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <AccountPrompt variant="card" />
    </div>
  );
}
