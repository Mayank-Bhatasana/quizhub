import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { createTempUser, getTempUser, setTempUser, updateTempUser } from "../../utils/tempUser";
import { useCreateGuest, useGetAllParticipants, useJoinRoom, useRoomDetails, useStartRoom } from "../../query/queries";

type LobbyParticipant = {
  id: string;
  name: string;
  avatarEmoji: string;
  avatarBg: string;
};

type LobbySocketEvent = {
  type?: string;
};

function codeFromParam(input: string | undefined) {
  return (input ?? "").trim().replace(/\s+/g, "").toUpperCase();
}

export default function SessionLobby() {
  const params = useParams();
  const navigate = useNavigate();
  const code = codeFromParam(params.code);
  const { mutateAsync: createGuestAsync, isPending: isCreatingGuest } = useCreateGuest();
  const { mutateAsync: joinRoomAsync, isPending: isJoiningRoom } = useJoinRoom();
  const { data: roomDetails } = useRoomDetails(code);
  const { mutateAsync: startRoomAsync, isPending: isStartingRoom } = useStartRoom();
  const {
    data: allParticipants,
    isLoading: isLoadingParticipants,
    isFetching: isFetchingParticipants,
    refetch: refetchParticipants,
  } = useGetAllParticipants(code);

  const tempUser = getTempUser();
  const myParticipant: LobbyParticipant = useMemo(() => {
    const name = tempUser?.name?.trim() || "Guest";
    const avatarEmoji = tempUser?.avatar?.emoji ?? "🧠";
    const avatarBg = tempUser?.avatar?.bg ?? "bg-slate-200";
    return { id: tempUser?.id ?? "me", name, avatarEmoji, avatarBg };
  }, [tempUser]);

  const [showEdit, setShowEdit] = useState(false);
  const [name, setName] = useState(myParticipant.name);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isConnecting = isCreatingGuest || isJoiningRoom;
  const participantCount = allParticipants?.participants?.length ?? 0;
  const tempProfileId = tempUser?.profileId;
  const isHost = Boolean(tempProfileId && roomDetails?.room.hostId === tempProfileId);
  const questionCount = roomDetails?.room.questionCount ?? 0;
  const totalSeconds = questionCount * 20;

  useEffect(() => {
    if (!code) return;

    const wsBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000")
      .replace(/^http:/, "ws:")
      .replace(/^https:/, "wss:");

    const socket = new WebSocket(wsBaseUrl);

    socket.onopen = () => {
      socket.send(
        JSON.stringify({
          type: "subscribe",
          code,
        }),
      );
    };

    socket.onmessage = (event) => {
      let payload: LobbySocketEvent;
      try {
        payload = JSON.parse(event.data as string) as LobbySocketEvent;
      } catch {
        return;
      }

      if (payload.type === "room_started") {
        navigate(`/room/${code}/join`, { replace: true });
      }
    };

    return () => {
      socket.close();
    };
  }, [code, navigate]);

  function copyCode() {
    navigator.clipboard?.writeText(code);
  }

  async function saveName() {
    const next = name.trim().slice(0, 30);
    if (!next) return;

    const existing = getTempUser();
    if (!existing) {
      setTempUser({
        id: myParticipant.id,
        name: next,
        avatar: { emoji: myParticipant.avatarEmoji, bg: myParticipant.avatarBg },
      });
    } else {
      updateTempUser({ name: next });
    }


    setShowEdit(false);

    if (!code || !tempProfileId) return;

    try {
      await joinRoomAsync({
        code,
        input: {
          profileId: tempProfileId,
          displayName: next,
        },
      });
      refetchParticipants();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update name";
      setError(message);
    }
  }

  useEffect(() => {
    if (!code) return;

    let cancelled = false;

    async function ensureGuestAndJoin() {
      setStatus("Connecting...");
      setError(null);

      let local = getTempUser();
      if (!local) {
        local = createTempUser(name);
        setTempUser(local);
      }

      try {
        const guest = await createGuestAsync({
          displayName: local.name,
          avatarUrl: local.avatarUrl ?? null,
        });
        if (cancelled) return;

        const profileId = guest.profile.id;
        const joined = await joinRoomAsync({
          code,
          input: {
            profileId,
            displayName: local.name,
          },
        });
        if (cancelled) return;

        updateTempUser({ profileId, participantId: joined.participant.id });
        setStatus("Connected");
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "Failed to join session";
        setError(message);
        setStatus(null);
      }
    }

    ensureGuestAndJoin();

    return () => {
      cancelled = true;
    };
  }, [code, name, createGuestAsync, joinRoomAsync]);

  async function handleStartQuiz() {
    if (!code || !tempProfileId) return;
    try {
      await startRoomAsync({ code, profileId: tempProfileId });
      refetchParticipants();
      navigate(`/room/${code}/join`, { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to start quiz";
      setError(message);
    }
  }

  // Refresh the list after two seconds
  useEffect(() => {
    if (!code) return;
    const timer = window.setTimeout(() => {
      refetchParticipants();
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [code, refetchParticipants]);

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

  return (
    <div className="grid gap-8">
      <section className="rounded-2xl border border-line bg-white p-7 shadow-sm md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-ink md:text-3xl">
              Lobby
            </h1>
            <p className="mt-2 text-sm text-muted">
              {error ? error : "Waiting for the host to start the quiz."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-line bg-surface-soft px-4 py-2 text-sm font-semibold text-ink">
              Code: <span className="font-extrabold">{code}</span>
            </span>
            <button
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
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-line bg-surface-soft p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Joined
            </p>
            <p className="mt-2 text-2xl font-extrabold text-ink">
              {isLoadingParticipants ? "..." : participantCount}
            </p>
          </div>
          <div className="rounded-2xl border border-line bg-surface-soft p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Total Time
            </p>
            <p className="mt-2 text-2xl font-extrabold text-ink">
              {Math.floor(totalSeconds / 60)}:
              {String(totalSeconds % 60).padStart(2, "0")}
            </p>
          </div>
          <div className="rounded-2xl border border-line bg-surface-soft p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Status
            </p>
            <p className="mt-2 text-2xl font-extrabold text-ink">
              {isConnecting ? "Connecting" : status ?? "Waiting"}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-white p-7 shadow-sm md:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-ink">Participants</h2>
            <p className="mt-1 text-sm text-muted">
              Showing demo list for now (real-time later).
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => refetchParticipants()}
              className="inline-flex rounded-full border border-line bg-white px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-surface-soft"
            >
              {isFetchingParticipants ? "Refreshing..." : "Refresh"}
            </button>
            {isHost ? (
              <button
                onClick={handleStartQuiz}
                disabled={isStartingRoom}
                className="inline-flex rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-brand-300"
              >
                {isStartingRoom ? "Starting..." : "Start quiz"}
              </button>
            ) : null}
            <button
              onClick={() => setShowEdit(true)}
              className="inline-flex rounded-full border border-line bg-white px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-surface-soft"
            >
              Change name
            </button>
          </div>
        </div>

        <div className="mt-3 text-xs font-semibold text-muted">
          {questionCount ? `Quiz length: ${totalSeconds}s (${questionCount} questions)` : "Quiz length: TBD"}
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {isFetchingParticipants ? (
            <div className="text-sm font-semibold text-muted">Refreshing...</div>
          ) : (
            (allParticipants?.participants ?? []).map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-4 rounded-2xl border border-line bg-white px-5 py-4"
              >
                {p.avatarUrl ? (
                  <img
                    src={p.avatarUrl}
                    alt={p.displayName}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-sm font-bold text-ink"
                    aria-hidden
                  >
                    {p.displayName.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-ink">{p.displayName}</p>
                  <p className="text-xs text-muted">
                    {p.id === myParticipant.id ? "You" : "Participant"}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {showEdit ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-line bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-ink">Edit your name</h3>
            <p className="mt-2 text-sm text-muted">
              This updates your local profile on this device.
            </p>

            <div className="mt-5">
              <label className="text-xs font-semibold text-muted" htmlFor="name">
                Display name
              </label>
              <input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-2 w-full rounded-xl border border-line bg-white px-4 py-3 text-sm font-semibold text-ink outline-none transition focus:border-brand-300 focus:ring-4 focus:ring-brand-100"
              />
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                onClick={() => setShowEdit(false)}
                className="rounded-xl border border-line bg-white px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-surface-soft"
              >
                Cancel
              </button>
              <button
                onClick={saveName}
                className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
