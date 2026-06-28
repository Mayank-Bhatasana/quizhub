import { useEffect, useState, useRef, useCallback } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import logo from "../../assets/logo.svg";
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
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  // ── Escape key listener for QR full screen modal ──────────────────────────
  useEffect(() => {
    if (!isQrModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsQrModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isQrModalOpen]);

  // WS-driven participant list
  const [participants, setParticipants] = useState<WsParticipant[]>([]);

  //NOTE: Track newly arrived IDs for the entry animation (cleared after 600ms)
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const prevIdsRef = useRef<Set<string>>(new Set());
  const socketRef = useRef<WebSocket | null>(null);

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
    socketRef.current = socket;

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
        const incoming = (msg as { type: "participants_updated"; participants: WsParticipant[] }).participants;

        // Detect genuinely new IDs for the pop-in animation
        const added = new Set<string>();
        incoming.forEach((p: WsParticipant) => {
          if (!prevIdsRef.current.has(p.id)) added.add(p.id);
        });
        prevIdsRef.current = new Set(incoming.map((p: WsParticipant) => p.id));
        setNewIds(added);
        // Clear the new-ids after animation duration
        if (added.size > 0) {
          setTimeout(() => setNewIds(new Set()), 600);
        }

        setParticipants(incoming);
      }

      if (msg.type === "room_started") {
        navigateAway();
      }
    };

    return () => {
      alive = false;
      socketRef.current = null;
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

  // ── QR join URL ───────────────────────────────────────────────────────────
  const joinUrl = `${window.location.origin}/dashboard/session/${code}`;

  function copyJoinLink() {
    navigator.clipboard?.writeText(joinUrl).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  }

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
                {isHost ? "Share the QR code or session code for players to join." : "Waiting for the host to start the quiz."}
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
              Copy Code
            </button>
            <Link
              to="/dashboard"
              onClick={() => {
                const ws = socketRef.current;
                if (ws && ws.readyState === WebSocket.OPEN) {
                  ws.send(JSON.stringify({ type: "unsubscribe", code, tempProfileId }));
                }
              }}
              className="rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
            >
              Leave
            </Link>
          </div>
        </div>

        {/* Host QR Code Panel */}
        {isHost && (
          <div className="mt-8 flex flex-col gap-6 rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 to-indigo-50 p-6 sm:flex-row sm:items-center">
            {/* QR Code container */}
            <div className="flex flex-col items-center gap-3 flex-none">
              <div className="rounded-2xl border-2 border-brand-200 bg-white p-4 shadow-md">
                <QRCodeSVG
                  value={joinUrl}
                  size={160}
                  bgColor="#ffffff"
                  fgColor="#1e1b4b"
                  level="H"
                  imageSettings={{
                    src: logo,
                    height: 36,
                    width: 36,
                    excavate: true,
                  }}
                />
              </div>
              <button
                type="button"
                onClick={() => setIsQrModalOpen(true)}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-brand-200 bg-brand-50 hover:bg-brand-100 px-4 py-2.5 text-xs font-bold text-brand-700 transition duration-200 active:scale-95 cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="size-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75v4.5m0-4.5h-4.5m4.5 0L15 9m5.25 11.25v-4.5m0 4.5h-4.5m4.5 0L15 15" />
                </svg>
                Full Screen
              </button>
            </div>

            {/* Info + copy */}
            <div className="flex flex-1 flex-col gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-brand-600">🎯 Join this session</p>
                <p className="mt-1 text-lg font-extrabold text-ink">Players can scan the QR code with their phone camera to jump straight into the lobby.</p>
                <p className="mt-2 text-sm text-muted">Or share the direct link below:</p>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-brand-200 bg-white/70 px-4 py-3 backdrop-blur-sm">
                <span className="flex-1 truncate text-xs font-mono font-semibold text-ink">{joinUrl}</span>
                <button
                  type="button"
                  onClick={copyJoinLink}
                  className="flex-none rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-brand-700 active:scale-95 cursor-pointer"
                >
                  {linkCopied ? "Copied ✓" : "Copy Link"}
                </button>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                Lobby is live — players can join right now
              </div>
            </div>
          </div>
        )}

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

      {/* ── QR Code Full Screen Modal ── */}
      {isQrModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-modal-fade-in cursor-pointer"
          onClick={() => setIsQrModalOpen(false)}
        >
          <div
            className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-line bg-white p-8 shadow-2xl animate-modal-scale-up flex flex-col items-center gap-6 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              type="button"
              onClick={() => setIsQrModalOpen(false)}
              className="absolute right-5 top-5 rounded-full p-2 text-muted hover:bg-surface-soft hover:text-ink transition active:scale-90 cursor-pointer"
              aria-label="Close modal"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="size-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="text-center mt-2">
              <h3 className="text-2xl font-black text-ink">Scan QR Code to Join</h3>
              <p className="mt-2 text-sm text-muted">
                Point your camera at the screen to jump into this lobby instantly.
              </p>
            </div>

            {/* Giant QR Code */}
            <div className="rounded-3xl border-4 border-brand-200 bg-white p-6 shadow-xl max-w-full">
              <QRCodeSVG
                value={joinUrl}
                size={280}
                bgColor="#ffffff"
                fgColor="#1e1b4b"
                level="H"
                imageSettings={{
                  src: logo,
                  height: 54,
                  width: 54,
                  excavate: true,
                }}
              />
            </div>

            {/* Code / Link Information */}
            <div className="w-full flex flex-col gap-3 text-center bg-slate-50 border border-slate-100 p-5 rounded-2xl">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Session Code</p>
                <p className="text-4xl font-black tracking-widest text-brand-600 mt-1 select-all">{code}</p>
              </div>

              <div className="border-t border-slate-200/60 pt-3 flex flex-col items-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Join Link</p>
                <div className="mt-1 flex items-center gap-2 max-w-full">
                  <span className="truncate text-xs font-mono font-semibold text-ink select-all">{joinUrl}</span>
                  <button
                    type="button"
                    onClick={copyJoinLink}
                    className="flex-none rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-brand-700 active:scale-95 cursor-pointer"
                  >
                    {linkCopied ? "Copied ✓" : "Copy Link"}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsQrModalOpen(false)}
              className="w-full py-3.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-sm font-bold text-white shadow-lg shadow-brand-500/20 transition duration-200 active:scale-[0.98] cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
