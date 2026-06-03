import { useEffect, useState, useRef, useCallback } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useTempUser } from "../../hooks/useTempUser";
import { createTempUser, getTempUser, setTempUser, updateTempUser } from "../../utils/tempUser";
import { useCreateGuest, useJoinRoom, useRoomDetails, useStartRoom } from "../../query/queries";

// ── Types ────────────────────────────────────────────────────────────────────

type WsParticipant = {
  id: string;
  profileId: string;
  displayName: string;
  isHost: boolean;
  joinedAt: string;
  avatarUrl: string | null;
};

type WsEvent =
  | { type: "participants_updated"; participants: WsParticipant[] }
  | { type: "room_started"; room: { code: string; status: string; startedAt: string; endedAt: string } }
  | { type: string };

function codeFromParam(input: string | undefined) {
  return (input ?? "").trim().replace(/\s+/g, "").toUpperCase();
}

// ── Participant card ──────────────────────────────────────────────────────────

function ParticipantCard({
  p,
  isMe,
  isNew,
}: {
  p: WsParticipant;
  isMe: boolean;
  isNew: boolean;
}) {
  const initials = p.displayName.slice(0, 1).toUpperCase();

  return (
    <div
      className={`
        relative flex items-center gap-3 rounded-2xl border bg-white px-4 py-3.5 shadow-sm
        transition-all duration-500
        ${isNew ? "animate-[lobbyEnter_0.4s_cubic-bezier(0.22,1,0.36,1)_both]" : ""}
        ${isMe ? "border-brand-300 ring-2 ring-brand-100" : "border-line"}
      `}
    >
      {/* Avatar */}
      {p.avatarUrl ? (
        <img
          src={p.avatarUrl}
          alt={p.displayName}
          className="size-9 rounded-full object-cover flex-none"
        />
      ) : (
        <div
          className="flex size-9 flex-none items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700"
          aria-hidden
        >
          {initials}
        </div>
      )}

      {/* Name + role */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink">
          {p.displayName}
        </p>
        <p className="text-xs text-muted">
          {isMe ? "You" : p.isHost ? "Host" : "Participant"}
        </p>
      </div>

      {/* Badges */}
      <div className="flex items-center gap-1.5 flex-none">
        {p.isHost && (
          <span className="rounded-full bg-amber-100 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-700">
            HOST
          </span>
        )}
        {isMe && (
          <span className="rounded-full bg-brand-100 border border-brand-200 px-2 py-0.5 text-[10px] font-bold text-brand-700">
            YOU
          </span>
        )}
        {/* Live pulse dot */}
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function SessionLobby() {
  const params = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const code = codeFromParam(params.code);

  const { mutateAsync: createGuestAsync, isPending: isCreatingGuest } = useCreateGuest();
  const { mutateAsync: joinRoomAsync, isPending: isJoiningRoom } = useJoinRoom();
  const { data: roomDetails } = useRoomDetails(code);
  const { mutateAsync: startRoomAsync, isPending: isStartingRoom } = useStartRoom();

  const tempUser = useTempUser();
  const myParticipant = {
    id: tempUser?.id ?? "me",
    name: tempUser?.name?.trim() || "Guest",
    avatarEmoji: tempUser?.avatar?.emoji ?? "🧠",
    avatarBg: tempUser?.avatar?.bg ?? "bg-slate-200",
  };

  // ── State ─────────────────────────────────────────────────────────────────
  const [showEdit, setShowEdit] = useState(false);
  const [name, setName] = useState(myParticipant.name);
  const [status, setStatus] = useState<"connecting" | "connected" | "error" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [customDuration, setCustomDuration] = useState<number | null>(null);

  // WS-driven participant list
  const [participants, setParticipants] = useState<WsParticipant[]>([]);
  // Track newly arrived IDs for the entry animation (cleared after 600ms)
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const prevIdsRef = useRef<Set<string>>(new Set());

  const navigatedRef = useRef(false);
  const isConnecting = isCreatingGuest || isJoiningRoom;

  const tempProfileId = tempUser?.profileId;
  const isHost = Boolean(tempProfileId && roomDetails?.room.hostId === tempProfileId);
  const roomStatus = roomDetails?.room.status;
  const questionCount = roomDetails?.room.questionCount ?? 0;
  const totalSeconds = questionCount * 20;
  const roomHostId = roomDetails?.room.hostId;

  // ── Navigation helper ─────────────────────────────────────────────────────
  const navigateAway = useCallback(
    (currentProfileId?: string) => {
      if (navigatedRef.current) return;
      if (!window.location.pathname.includes("/dashboard/session/")) return;
      navigatedRef.current = true;

      const pid = currentProfileId ?? getTempUser()?.profileId;
      const goHost = Boolean(pid && roomHostId === pid);
      const destination = goHost
        ? `/room/${code}/join/leaderboard`
        : `/room/${code}/join`;

      queryClient.setQueryData(["room", code, "details"], (old: any) => {
        if (!old) return old;
        return { ...old, room: { ...old.room, status: "LIVE" } };
      });

      navigate(destination, { replace: true, state: { fromLobby: true } });
    },
    [code, roomHostId, navigate, queryClient],
  );

  // ── Navigate when roomStatus flips to LIVE (e.g. via REST poll) ──────────
  useEffect(() => {
    if (!code || !roomStatus || roomStatus === "LOBBY" || navigatedRef.current) return;
    navigateAway();
  }, [roomStatus, code, navigateAway]);

  // ── WebSocket — subscribe & listen ────────────────────────────────────────
  useEffect(() => {
    if (!code) return;

    const wsBase = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000")
      .replace(/^http:/, "ws:")
      .replace(/^https:/, "wss:");

    const socket = new WebSocket(wsBase);
    let alive = true;

    socket.onopen = () => {
      if (!alive) return;
      socket.send(JSON.stringify({ type: "subscribe", code }));
    };

    socket.onmessage = (event) => {
      if (!alive) return;
      let msg: WsEvent;
      try {
        msg = JSON.parse(event.data as string) as WsEvent;
      } catch {
        return;
      }

      if (msg.type === "participants_updated") {
        const incoming = msg.participants;

        // Detect genuinely new IDs for the pop-in animation
        setNewIds((prev) => {
          const added = new Set<string>();
          incoming.forEach((p) => {
            if (!prevIdsRef.current.has(p.id)) added.add(p.id);
          });
          prevIdsRef.current = new Set(incoming.map((p) => p.id));
          // Clear the new-ids after animation duration
          if (added.size > 0) {
            setTimeout(() => setNewIds(new Set()), 600);
          }
          return added;
        });

        setParticipants(incoming);
      }

      if (msg.type === "room_started") {
        navigateAway();
      }
    };

    return () => {
      alive = false;
      socket.close();
    };
  }, [code, navigateAway]);

  // ── Ensure guest profile & join room ─────────────────────────────────────
  useEffect(() => {
    if (!code) return;
    if (roomStatus && roomStatus !== "LOBBY") return;

    let cancelled = false;

    async function ensureGuestAndJoin() {
      setStatus("connecting");
      setError(null);

      let local = getTempUser();
      if (!local) {
        local = createTempUser(name);
        setTempUser(local);
      }

      try {
        let profileId = local.profileId;
        if (!profileId) {
          const guest = await createGuestAsync({
            displayName: local.name,
            avatarUrl: local.avatarUrl ?? null,
          });
          if (cancelled) return;
          profileId = guest.profile.id;
          updateTempUser({ profileId });
        }

        const joined = await joinRoomAsync({
          code,
          input: { profileId, displayName: local.name },
        });
        if (cancelled) return;

        updateTempUser({ profileId, participantId: joined.participant.id });
        setStatus("connected");
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "Failed to join session";
        if (message.toLowerCase().includes("already started")) {
          navigateAway();
          return;
        }
        setError(message);
        setStatus("error");
      }
    }

    ensureGuestAndJoin();
    return () => { cancelled = true; };
  }, [code, roomStatus, name, createGuestAsync, joinRoomAsync, navigateAway]);

  // ── Edit name ─────────────────────────────────────────────────────────────
  async function saveName() {
    const next = name.trim().slice(0, 30);
    if (!next) return;

    const existing = getTempUser();
    if (!existing) {
      setTempUser({ id: myParticipant.id, name: next, avatar: { emoji: myParticipant.avatarEmoji, bg: myParticipant.avatarBg } });
    } else {
      updateTempUser({ name: next });
    }
    setShowEdit(false);

    if (!code || !tempProfileId) return;
    try {
      await joinRoomAsync({ code, input: { profileId: tempProfileId, displayName: next } });
      // The backend will push a fresh participants_updated over WS — no manual refetch needed
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update name");
    }
  }

  // ── Start quiz (host only) ────────────────────────────────────────────────
  async function handleStartQuiz() {
    if (!code || !tempProfileId) return;
    try {
      const durationSeconds = customDuration ?? questionCount * 20 * 2;
      await startRoomAsync({ code, profileId: tempProfileId, durationSeconds });
      if (!navigatedRef.current && window.location.pathname.includes("/dashboard/session/")) {
        navigatedRef.current = true;
        queryClient.setQueryData(["room", code, "details"], (old: any) => {
          if (!old) return old;
          return { ...old, room: { ...old.room, status: "LIVE" } };
        });
        navigate(`/room/${code}/join/leaderboard`, { replace: true, state: { fromLobby: true } });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start quiz");
    }
  }

  function copyCode() {
    navigator.clipboard?.writeText(code);
  }

  // ── Invalid code guard ────────────────────────────────────────────────────
  if (!code) {
    return (
      <div className="rounded-2xl border border-line bg-white p-8 shadow-sm">
        <h1 className="text-xl font-bold text-ink">Invalid session</h1>
        <p className="mt-2 text-sm text-muted">
          Missing session code. Go back and join with a valid code.
        </p>
        <Link
          to="/dashboard"
          className="mt-6 inline-flex rounded-full bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Back to dashboard
        </Link>
      </div>
    );
  }

  // ── Status label ─────────────────────────────────────────────────────────
  const statusLabel =
    isConnecting || status === "connecting"
      ? "Connecting…"
      : status === "connected"
      ? "Connected ✓"
      : status === "error"
      ? "Error"
      : "Waiting";

  const statusColor =
    status === "connected"
      ? "text-emerald-600"
      : status === "error"
      ? "text-rose-500"
      : "text-ink";

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="grid gap-8">

      {/* ── Top card ── */}
      <section className="rounded-2xl border border-line bg-white p-7 shadow-sm md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-ink md:text-3xl">Lobby</h1>
            {error ? (
              <p className="mt-2 text-sm font-semibold text-rose-500">{error}</p>
            ) : (
              <p className="mt-2 text-sm text-muted">
                Waiting for the host to start the quiz.
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-line bg-surface-soft px-4 py-2 text-sm font-semibold text-ink">
              Code: <span className="font-extrabold tracking-wider">{code}</span>
            </span>
            <button
              type="button"
              onClick={copyCode}
              className="rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:bg-surface-soft"
            >
              Copy
            </button>
            <Link
              to="/dashboard"
              className="rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
            >
              Leave
            </Link>
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-line bg-surface-soft p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Players joined</p>
            <p className="mt-2 text-2xl font-extrabold text-ink">
              {participants.length}
            </p>
          </div>
          <div className="rounded-2xl border border-line bg-surface-soft p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Total time</p>
            <p className="mt-2 text-2xl font-extrabold text-ink">
              {Math.floor(totalSeconds / 60)}:{String(totalSeconds % 60).padStart(2, "0")}
            </p>
          </div>
          <div className="rounded-2xl border border-line bg-surface-soft p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Status</p>
            <p className={`mt-2 text-2xl font-extrabold ${statusColor}`}>{statusLabel}</p>
          </div>
        </div>
      </section>

      {/* ── Participants card ── */}
      <section className="rounded-2xl border border-line bg-white p-7 shadow-sm md:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-ink">Participants</h2>
              {/* Live badge */}
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 uppercase tracking-wide">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </span>
                Live
              </span>
            </div>
            <p className="mt-1 text-sm text-muted">
              Updates instantly when someone joins or changes their name.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {isHost && (
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-start gap-1">
                  <label
                    className="text-[10px] font-bold uppercase tracking-wider text-muted"
                    htmlFor="durationInput"
                  >
                    Time limit (sec)
                  </label>
                  <input
                    id="durationInput"
                    type="number"
                    value={customDuration ?? questionCount * 20 * 2}
                    min={questionCount * 20}
                    onChange={(e) => setCustomDuration(Number(e.target.value))}
                    className="w-24 rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs font-semibold text-ink outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleStartQuiz}
                  disabled={isStartingRoom}
                  className="inline-flex rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-brand-300"
                >
                  {isStartingRoom ? "Starting…" : "Start quiz"}
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={() => setShowEdit(true)}
              className="inline-flex rounded-full border border-line bg-white px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-surface-soft"
            >
              Change name
            </button>
          </div>
        </div>

        {questionCount > 0 && (
          <p className="mt-3 text-xs font-semibold text-muted">
            Quiz length: {totalSeconds}s ({questionCount} questions)
          </p>
        )}

        {/* Grid of participant cards */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {participants.length === 0 ? (
            // Skeleton while first WS message hasn't arrived yet
            Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-2xl border border-line bg-surface-muted"
              />
            ))
          ) : (
            participants.map((p) => (
              <ParticipantCard
                key={p.id}
                p={p}
                isMe={p.profileId === tempProfileId}
                isNew={newIds.has(p.id)}
              />
            ))
          )}
        </div>
      </section>

      {/* ── Edit name modal ── */}
      {showEdit && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-line bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-ink">Edit your name</h3>
            <p className="mt-2 text-sm text-muted">
              Everyone in the lobby will see the update instantly.
            </p>

            <div className="mt-5">
              <label className="text-xs font-semibold text-muted" htmlFor="editName">
                Display name
              </label>
              <input
                id="editName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveName()}
                className="mt-2 w-full rounded-xl border border-line bg-white px-4 py-3 text-sm font-semibold text-ink outline-none transition focus:border-brand-300 focus:ring-4 focus:ring-brand-100"
                autoFocus
              />
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowEdit(false)}
                className="rounded-xl border border-line bg-white px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-surface-soft"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveName}
                className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
