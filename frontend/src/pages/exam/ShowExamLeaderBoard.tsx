import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useRoomDetails, useScoreboard } from "../../query/queries";
import type { LeaderboardEntry } from "../../services/quizApi";

type MotionKind = "overtook" | "overtaken";

type TakeoverBanner = {
  climber: string;
  target: string;
};

const MAX_VISIBLE = 10;

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function codeFromParam(input: string | undefined) {
  return (input ?? "").trim().replace(/\s+/g, "").toUpperCase() || "DEMO";
}

function sortEntries(entries: LeaderboardEntry[]) {
  return [...entries].sort((a, b) => b.score - a.score || a.timeSeconds - b.timeSeconds);
}

function captureFlipRects(root: HTMLElement | null) {
  const map = new Map<string, DOMRect>();
  if (!root) return map;

  root.querySelectorAll("[data-flip-id]").forEach((node) => {
    const id = node.getAttribute("data-flip-id");
    if (id) map.set(id, node.getBoundingClientRect());
  });

  return map;
}

function playFlipAnimations(root: HTMLElement | null, firstRects: Map<string, DOMRect>) {
  if (!root || firstRects.size === 0) return;

  root.querySelectorAll("[data-flip-id]").forEach((node) => {
    const id = node.getAttribute("data-flip-id");
    if (!id) return;

    const first = firstRects.get(id);
    if (!first) return;

    const el = node as HTMLElement;
    const last = el.getBoundingClientRect();
    const dx = first.left - last.left;
    const dy = first.top - last.top;

    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;

    el.style.transform = `translate(${dx}px, ${dy}px)`;
    el.style.transition = "transform 0s";
    el.style.zIndex = "30";

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.transition = "transform 0.95s cubic-bezier(0.34, 1.12, 0.64, 1)";
        el.style.transform = "";

        const cleanup = () => {
          el.style.transition = "";
          el.style.zIndex = "";
          el.removeEventListener("transitionend", cleanup);
        };

        el.addEventListener("transitionend", cleanup);
      });
    });
  });
}



function CrownIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M2.5 19h19v2h-19v-2Zm2.2-2h14.6l1.2-8.4-4.1 3.1-3.3-5.8-3.3 5.8-4.1-3.1 1.2 8.4Zm4.8-10.2 2.1 3.7 3.4-2.6-1.4 4.9h-8.2l-1.4-4.9 3.4 2.6 2.1-3.7Z" />
    </svg>
  );
}

/** Small checkmark icon for "completed" indicator */
function CheckIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
      <path d="M2 5.5L4 7.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

type PodiumPlace = 1 | 2 | 3;

const podiumConfig: Record<
  PodiumPlace,
  {
    order: string;
    pedestal: string;
    ring: string;
    badge: string;
    badgeText: string;
    avatar: string;
    label: string;
    glow: string;
  }
> = {
  1: {
    order: "order-2",
    pedestal: "h-36 bg-linear-to-t from-amber-500 to-amber-300 shadow-[0_8px_32px_-8px_rgb(245_158_11/0.55)]",
    ring: "ring-4 ring-amber-300/80 ring-offset-2 ring-offset-white",
    badge: "bg-linear-to-r from-amber-400 to-yellow-300 text-amber-950",
    badgeText: "1st",
    avatar: "h-20 w-20 text-3xl",
    label: "Champion",
    glow: "bg-amber-400/25",
  },
  2: {
    order: "order-1",
    pedestal: "h-28 bg-linear-to-t from-slate-400 to-slate-300 shadow-[0_8px_24px_-8px_rgb(100_116_139/0.45)]",
    ring: "ring-4 ring-slate-300/80 ring-offset-2 ring-offset-white",
    badge: "bg-linear-to-r from-slate-400 to-slate-300 text-slate-900",
    badgeText: "2nd",
    avatar: "h-16 w-16 text-2xl",
    label: "Runner-up",
    glow: "bg-slate-400/20",
  },
  3: {
    order: "order-3",
    pedestal: "h-24 bg-linear-to-t from-orange-600 to-orange-400 shadow-[0_8px_24px_-8px_rgb(234_88_12/0.45)]",
    ring: "ring-4 ring-orange-300/70 ring-offset-2 ring-offset-white",
    badge: "bg-linear-to-r from-orange-500 to-orange-400 text-orange-950",
    badgeText: "3rd",
    avatar: "h-16 w-16 text-2xl",
    label: "Third place",
    glow: "bg-orange-400/20",
  },
};

function FlipShell({
  id,
  motion,
  className = "",
  children,
}: {
  id: string;
  motion?: MotionKind;
  className?: string;
  children: React.ReactNode;
}) {
  const motionClass =
    motion === "overtook"
      ? "leaderboard-overtook"
      : motion === "overtaken"
        ? "leaderboard-overtaken"
        : "";

  return (
    <div data-flip-id={id} className={`leaderboard-flip-item ${className}`}>
      <div className={motionClass}>{children}</div>
    </div>
  );
}

function CompletedBadge() {
  return (
    <span
      title="Completed"
      className="ml-1 inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[0.6rem] font-bold text-emerald-700"
    >
      <CheckIcon />
      Done
    </span>
  );
}

function PodiumSpot({
  place,
  entry,
  motion,
  isEnded,
}: {
  place: PodiumPlace;
  entry: LeaderboardEntry;
  motion?: MotionKind;
  isEnded: boolean;
}) {
  const config = podiumConfig[place];
  const hasCompleted = entry.answered >= entry.total;

  return (
    <FlipShell id={entry.id} motion={motion} className={`flex flex-1 flex-col items-center ${config.order}`}>
      <div className="relative mb-3 flex w-full flex-col items-center">
        {place === 1 ? (
          <div className="mb-1 flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <CrownIcon />
          </div>
        ) : (
          <div className="mb-1 h-8" aria-hidden />
        )}

        <div className={`absolute -inset-4 rounded-full blur-2xl ${config.glow}`} aria-hidden />

        <div
          className={`relative flex items-center justify-center rounded-full ${config.avatar} ${config.ring} ${entry.avatarBg}`}
        >
          <span aria-hidden>{entry.avatar}</span>
        </div>

        <span
          className={`absolute -bottom-2 rounded-full px-2.5 py-0.5 text-[0.65rem] font-extrabold tracking-wide uppercase ${config.badge}`}
        >
          {config.badgeText}
        </span>
      </div>

      <p className="mt-4 max-w-[7.5rem] truncate text-center text-sm font-bold text-ink">
        {entry.name}
        {isEnded && hasCompleted && <CompletedBadge />}
      </p>
      <p className="leaderboard-score mt-0.5 text-lg font-extrabold tracking-tight text-ink">
        {entry.score.toLocaleString()}
      </p>
      <p className="text-[0.65rem] font-medium text-muted">
        {entry.correct}/{entry.total} · {formatTime(entry.timeSeconds)}
      </p>

      <div className={`mt-4 w-full max-w-[8.5rem] rounded-t-2xl ${config.pedestal}`}>
        <p className="pt-3 text-center text-[0.6rem] font-bold tracking-[0.18em] text-white/90 uppercase">
          {config.label}
        </p>
      </div>
    </FlipShell>
  );
}

function LeaderboardRow({
  entry,
  rank,
  motion,
  isEnded,
}: {
  entry: LeaderboardEntry;
  rank: number;
  motion?: MotionKind;
  isEnded: boolean;
}) {
  const hasCompleted = entry.answered >= entry.total;

  return (
    <FlipShell id={entry.id} motion={motion}>
      <div className="flex items-center gap-3 rounded-2xl border border-line/80 bg-white px-4 py-3 shadow-sm sm:gap-4 sm:px-5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-sm font-extrabold text-muted">
          {rank}
        </span>

        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg ${entry.avatarBg}`}
          aria-hidden
        >
          {entry.avatar}
        </div>

        <div className="min-w-0 flex-1">
          <p className="flex items-center truncate text-sm font-bold text-ink gap-1">
            <span className="truncate">{entry.name}</span>
            {isEnded && hasCompleted && <CompletedBadge />}
            {isEnded && !hasCompleted && (
              <span className="ml-1 inline-flex items-center rounded-full bg-amber-50 px-1.5 py-0.5 text-[0.6rem] font-semibold text-amber-600 border border-amber-200">
                In progress
              </span>
            )}
          </p>
          <p className="text-xs text-muted">
            {entry.correct}/{entry.total} correct · {formatTime(entry.timeSeconds)}
          </p>
        </div>

        <div className="text-right">
          <p className="leaderboard-score text-base font-extrabold text-ink">{entry.score.toLocaleString()}</p>
          <p className="text-[0.65rem] font-semibold tracking-wide text-muted uppercase">pts</p>
        </div>
      </div>
    </FlipShell>
  );
}

function detectTakeover(prevList: LeaderboardEntry[], nextList: LeaderboardEntry[]) {
  const prevRanks = new Map<string, number>();
  prevList.forEach((item, index) => {
    prevRanks.set(item.id, index);
  });

  const maxLen = Math.min(nextList.length, MAX_VISIBLE);
  for (let nextIndex = 0; nextIndex < maxLen; nextIndex++) {
    const item = nextList[nextIndex]!;
    const prevIndex = prevRanks.get(item.id);
    if (prevIndex !== undefined && prevIndex > nextIndex) {
      const targetIndex = nextIndex + 1;
      if (targetIndex < maxLen) {
        const targetItem = nextList[targetIndex]!;
        const targetPrevIndex = prevRanks.get(targetItem.id);
        if (targetPrevIndex !== undefined && targetPrevIndex < prevIndex) {
          return {
            overtookId: item.id,
            overtakenId: targetItem.id,
            banner: { climber: item.name, target: targetItem.name }
          };
        }
      }
    }
  }
  return null;
}

export default function ShowExamLeaderBoard() {
  const params = useParams();
  const roomCode = codeFromParam(params.code);

  const [pool, setPool] = useState<LeaderboardEntry[]>([]);
  const poolRef = useRef<LeaderboardEntry[]>([]);
  useEffect(() => {
    poolRef.current = pool;
  }, [pool]);

  const [motion, setMotion] = useState<Record<string, MotionKind>>({});
  const [banner, setBanner] = useState<TakeoverBanner | null>(null);
  const [bannerTick, setBannerTick] = useState(0);
  const [allCompleted, setAllCompleted] = useState(false);

  const flipRootRef = useRef<HTMLDivElement>(null);
  const flipFirstRectsRef = useRef<Map<string, DOMRect>>(new Map());
  const skipFlipRef = useRef(true);

  const { data: roomDetails } = useRoomDetails(roomCode);
  const roomId = roomDetails?.room?.id;
  const isEnded = roomDetails?.room?.status === "ENDED";
  const { data: initialScoreboardData } = useScoreboard(roomId ?? "", Boolean(roomId));

  const [prevInitialData, setPrevInitialData] = useState<any>(null);
  if (initialScoreboardData !== prevInitialData) {
    setPrevInitialData(initialScoreboardData);
    if (initialScoreboardData?.scoreboard) {
      setPool(initialScoreboardData.scoreboard);
      // Check initial completion state
      const sc = initialScoreboardData.scoreboard as LeaderboardEntry[];
      if (sc.length > 0 && sc.every((e) => e.answered >= e.total)) {
        setAllCompleted(true);
      }
    }
  }

  const visibleEntries = sortEntries(pool).slice(0, MAX_VISIBLE);

  const topThree = visibleEntries.slice(0, 3);
  const rest = visibleEntries.slice(3);

  const first = topThree[0];
  const second = topThree[1];
  const third = topThree[2];

  // How many participants are still pending
  const pendingCount = pool.filter((e) => e.answered < e.total).length;
  const completedCount = pool.filter((e) => e.answered >= e.total).length;

  useLayoutEffect(() => {
    if (skipFlipRef.current) {
      skipFlipRef.current = false;
      return;
    }

    playFlipAnimations(flipRootRef.current, flipFirstRectsRef.current);
    flipFirstRectsRef.current = new Map();
  }, [visibleEntries]);

  // Connect to live leaderboard update stream via WebSocket
  useEffect(() => {
    if (!roomCode) return;

    const wsBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000")
      .replace(/^http:/, "ws:")
      .replace(/^https:/, "wss:");

    const socket = new WebSocket(wsBaseUrl);

    socket.onopen = () => {
      socket.send(
        JSON.stringify({
          type: "subscribe",
          code: roomCode,
        }),
      );
    };

    socket.onmessage = (event) => {
      let payload: any;
      try {
        payload = JSON.parse(event.data);
      } catch {
        return;
      }

      if (payload.type === "leaderboard_updated" && Array.isArray(payload.scoreboard)) {
        const nextScoreboard = payload.scoreboard as LeaderboardEntry[];

        // Capture current layout positions for FLIP animation
        flipFirstRectsRef.current = captureFlipRects(flipRootRef.current);

        const takeover = detectTakeover(poolRef.current, nextScoreboard);
        if (takeover) {
          setMotion({
            [takeover.overtookId]: "overtook",
            [takeover.overtakenId]: "overtaken",
          });
          setBanner(takeover.banner);
          setBannerTick((tick) => tick + 1);

          window.setTimeout(() => setMotion({}), 1100);
        }

        setPool(nextScoreboard);

        // Update allCompleted state from the broadcast
        if (typeof payload.allCompleted === "boolean") {
          setAllCompleted(payload.allCompleted);
        } else {
          const completed = nextScoreboard.length > 0 && nextScoreboard.every((e) => e.answered >= e.total);
          setAllCompleted(completed);
        }
      }

      if (payload.type === "room_ended") {
        // Room ended — force a re-query; state will update via roomDetails refetch
      }
    };

    return () => {
      socket.close();
    };
  }, [roomCode]);

  return (
    <div className="leaderboard-enter flex w-full flex-col gap-8 pb-6">
      <header className="text-center">
        {/* Show "Live rankings" only while the test is still running */}
        {!isEnded && (
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Live rankings
          </div>
        )}

        {/* Show "Test ended" badge when the room has ended */}
        {isEnded && !allCompleted && (
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
            <span aria-hidden>🏁</span>
            Test ended
          </div>
        )}

        {/* Show "All done" celebration when everyone has completed */}
        {allCompleted && (
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-4 py-1.5 text-xs font-bold text-emerald-800 shadow-sm">
            <span aria-hidden>🎉</span>
            Everyone has completed the test!
          </div>
        )}

        <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Leaderboard</h1>
        <p className="mt-2 text-sm text-muted">
          Room <span className="font-bold text-ink">{roomCode}</span> · General Knowledge Quiz
        </p>

        {/* Completion progress indicator */}
        {pool.length > 0 && !allCompleted && (
          <p className="mt-1 text-xs text-muted">
            <span className="font-semibold text-emerald-700">{completedCount}</span> of{" "}
            <span className="font-semibold text-ink">{pool.length}</span> participants completed
            {pendingCount > 0 && (
              <span className="ml-1 text-amber-600 font-semibold">· {pendingCount} still in progress</span>
            )}
          </p>
        )}

        {!pool.length && (
          <p className="mt-1 text-xs text-muted">Top {MAX_VISIBLE} shown · scores update in real time</p>
        )}
      </header>

      {/* Rank-change banner — only shown while live */}
      {!isEnded && (
        <div
          role="status"
          aria-live="polite"
          className="leaderboard-takeover-banner mx-auto flex max-w-lg items-center justify-center gap-2 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-800 shadow-sm"
        >
          <span className="text-base" aria-hidden>
            ⚡
          </span>
          {banner ? (
            <div key={bannerTick} className="leaderboard-banner-content flex min-w-0 items-center justify-center gap-2">
              <span className="truncate">{banner.climber}</span>
              <span className="shrink-0 text-brand-600">overtook</span>
              <span className="truncate">{banner.target}</span>
            </div>
          ) : (
            <span className="text-brand-700/80">Watching for rank changes…</span>
          )}
        </div>
      )}

      <div ref={flipRootRef} className="grid gap-8">
        {first ? (
          <section
            aria-label="Top players"
            className="rounded-3xl border border-line/80 bg-white/90 p-5 shadow-sm backdrop-blur-sm sm:p-8"
          >
            <div className="flex items-end justify-center gap-3 sm:gap-6">
              {second ? <PodiumSpot place={2} entry={second} motion={motion[second.id]} isEnded={isEnded} /> : null}
              <PodiumSpot place={1} entry={first} motion={motion[first.id]} isEnded={isEnded} />
              {third ? <PodiumSpot place={3} entry={third} motion={motion[third.id]} isEnded={isEnded} /> : null}
            </div>
          </section>
        ) : null}

        {rest.length > 0 ? (
          <section aria-label="Remaining rankings">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold tracking-wide text-ink uppercase">Everyone else</h2>
              <span className="rounded-full bg-surface-muted px-3 py-1 text-xs font-semibold text-muted">
                Ranks 4–{visibleEntries.length}
              </span>
            </div>

            <ol className="grid gap-2.5">
              {rest.map((entry, index) => (
                <li key={entry.id}>
                  <LeaderboardRow entry={entry} rank={index + 4} motion={motion[entry.id]} isEnded={isEnded} />
                </li>
              ))}
            </ol>
          </section>
        ) : null}
      </div>

      <footer className="flex flex-col items-center gap-3 border-t border-line pt-6 sm:flex-row sm:justify-center">
        {/* "Back to quiz" is intentionally removed */}
        <Link
          to="/dashboard"
          className="inline-flex rounded-full bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
        >
          Go to dashboard
        </Link>
      </footer>
    </div>
  );
}
