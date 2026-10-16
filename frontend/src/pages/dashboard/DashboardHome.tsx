import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { Html5Qrcode as Html5QrcodeType } from "html5-qrcode";
import AccountPrompt from "../../components/dashboard/AccountPrompt";
import { createTempUser, getTempUser, setTempUser, updateTempUser } from "../../utils/tempUser";
import {
  useAuthSession,
  useCreateGuest,
  useCreateQuestion,
  useCreateRoom,
  useCuratedQuizzes,
} from "../../query/queries";

// ── QR Scanner component (html5-qrcode, dynamically imported) ─────────────────
const SCANNER_ID = "qr-scanner-element";

function QrScannerView({
  onScan,
  onClose,
}: {
  onScan: (text: string) => void;
  onClose: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const scannerRef = useRef<Html5QrcodeType | null>(null);

  // Zoom capability states
  const [zoomSupported, setZoomSupported] = useState(false);
  const [minZoom, setMinZoom] = useState(1);
  const [maxZoom, setMaxZoom] = useState(1);
  const [currentZoom, setCurrentZoom] = useState(1);

  const handleZoomChange = async (val: number) => {
    setCurrentZoom(val);
    if (scannerRef.current && zoomSupported) {
      try {
        await scannerRef.current.applyVideoConstraints({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          advanced: [{ zoom: val } as any]
        });
      } catch (err) {
        console.error("Failed to apply zoom:", err);
      }
    }
  };

  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        // Dynamically import html5-qrcode — it's 3.4 MB so we only load it
        // when the user actually opens the camera scanner.
        const { Html5Qrcode } = await import("html5-qrcode");

        // Enumerate cameras — the only reliable cross-device approach.
        const devices = await Html5Qrcode.getCameras();
        if (cancelled) return;

        if (!devices || devices.length === 0) {
          setError("No camera found on this device.");
          return;
        }

        // Prefer a rear camera; fall back to last (rear is last on iOS/Android).
        const rear =
          devices.find((d) => /back|rear|environment/i.test(d.label)) ??
          devices[devices.length - 1];

        const scanner = new Html5Qrcode(SCANNER_ID);
        scannerRef.current = scanner;

        await scanner.start(
          rear.id,
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (text) => {
            scanner.stop().catch(() => {});
            onScan(text);
          },
          () => { /* frame errors — ignore */ },
        );

        if (!cancelled) {
          setReady(true);
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const capabilities = typeof (scanner as any).getRunningTrackCapabilities === "function"
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ? (scanner as any).getRunningTrackCapabilities()
              : null;
            if (capabilities && capabilities.zoom) {
              setZoomSupported(true);
              setMinZoom(Number(capabilities.zoom.min) || 1);
              setMaxZoom(Number(capabilities.zoom.max) || 1);
              setCurrentZoom(Number(capabilities.zoom.min) || 1);
            }
          } catch (e) {
            console.warn("Failed to get running track capabilities:", e);
          }
        }
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        setError(
          /permission|denied|notallowed/i.test(msg)
            ? "Camera permission denied. Please allow camera access in your browser settings."
            : /notfound|devicenotfound/i.test(msg)
            ? "No camera found on this device."
            : msg,
        );
      }
    }

    start();

    return () => {
      cancelled = true;
      scannerRef.current?.stop().catch(() => {});
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
        <span className="text-3xl">📷</span>
        <p className="text-sm font-semibold text-rose-600">{error}</p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-rose-600 px-5 py-2 text-xs font-bold text-white transition hover:bg-rose-700"
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="mt-6 flex flex-col items-center gap-4">
      <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border-2 border-brand-300 bg-black shadow-xl">
        {/* Corner brackets */}
        <div className="pointer-events-none absolute left-3 top-3 z-10 h-8 w-8 rounded-tl-lg border-l-4 border-t-4 border-brand-400" />
        <div className="pointer-events-none absolute right-3 top-3 z-10 h-8 w-8 rounded-tr-lg border-r-4 border-t-4 border-brand-400" />
        <div className="pointer-events-none absolute bottom-3 left-3 z-10 h-8 w-8 rounded-bl-lg border-b-4 border-l-4 border-brand-400" />
        <div className="pointer-events-none absolute bottom-3 right-3 z-10 h-8 w-8 rounded-br-lg border-b-4 border-r-4 border-brand-400" />
        {/* Sweep line — only shown once camera is live */}
        {ready && (
          <div
            className="pointer-events-none absolute inset-x-0 z-10 h-0.5 bg-brand-500 opacity-90 shadow-[0_0_8px_3px_rgba(99,102,241,0.7)]"
            style={{ animation: "scanLine 2s linear infinite" }}
          />
        )}
        {/* html5-qrcode mounts the video feed into this div */}
        <div id={SCANNER_ID} className="w-full" style={{ minHeight: "260px" }} />
      </div>

      {zoomSupported && (
        <div className="w-full max-w-sm px-4 py-3 bg-slate-900/90 text-white rounded-xl backdrop-blur-md border border-slate-700/50 shadow-lg flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs font-semibold tracking-wider text-slate-300 uppercase">
            <span>Camera Zoom</span>
            <span className="font-mono bg-brand-600/70 px-2 py-0.5 rounded text-white">{currentZoom.toFixed(1)}x</span>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 font-medium">{minZoom.toFixed(0)}x</span>
            <input
              type="range"
              min={minZoom}
              max={maxZoom}
              step={(maxZoom - minZoom) / 20 || 0.1}
              value={currentZoom}
              onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
              className="flex-1 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-500 focus:outline-none"
            />
            <span className="text-xs text-slate-400 font-medium">{maxZoom.toFixed(0)}x</span>
          </div>

          <div className="flex justify-center gap-2">
            {[1, 2, 4, 8].map((zoomVal) => {
              if (zoomVal >= minZoom && zoomVal <= maxZoom) {
                return (
                  <button
                    key={zoomVal}
                    type="button"
                    onClick={() => handleZoomChange(zoomVal)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all duration-200 ${
                      Math.abs(currentZoom - zoomVal) < 0.1
                        ? "bg-brand-600 text-white shadow-md shadow-brand-500/20 scale-105"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
                    }`}
                  >
                    {zoomVal}x
                  </button>
                );
              }
              return null;
            })}
          </div>
        </div>
      )}

      <p className="flex items-center gap-2 text-sm font-semibold text-brand-700">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-600" />
        </span>
        {ready ? "Scanning… point your camera at the QR code" : "Starting camera…"}
      </p>
    </div>
  );
}

function normalizeCode(input: string) {
  return input.trim().replace(/\s+/g, "").toUpperCase();
}

function randomCodeHint() {
  const samples = ["AB12", "QUIZ7", "MAY1", "LIVE9"];
  return samples[Math.floor(Math.random() * samples.length)]!;
}

export default function DashboardHome() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [showNameModal, setShowNameModal] = useState(false);
  const [name, setName] = useState("");

  const createGuestMutation = useCreateGuest();
  const createQuestionMutation = useCreateQuestion();
  const createRoomMutation = useCreateRoom();
  const [isDemoCreating, setIsDemoCreating] = useState(false);

  const { data: authSession } = useAuthSession();
  const isLoggedIn = Boolean(authSession?.user?.id);
  const { data: curatedData, isLoading: curatedLoading } = useCuratedQuizzes();
  const curatedQuizzes = curatedData?.quizzes ?? [];

  async function handleCreateDemoRoom() {
    setIsDemoCreating(true);
    let local = getTempUser();
    const displayName = local?.name || "Demo Host";
    if (!local) {
      local = createTempUser(displayName);
      setTempUser(local);
    }

    try {
      const guest = await createGuestMutation.mutateAsync({
        displayName,
        avatarUrl: local.avatarUrl ?? null,
      });
      const hostProfileId = guest.profile.id;

      const DEMO_QUESTIONS = [
        {
          text: "Analyze the following JavaScript snippet:\n\n```js\nfunction greet(user) {\n  return `Hello, **${user}**!`;\n}\n```\n\nWhat is the return type of the `greet` function?",
          explanation: "The `greet` function returns a template literal string. The markdown **bold syntax** (`**${user}**`) is used inside the string literal.",
          points: 1,
          options: [
            { text: "String", isCorrect: true },
            { text: "Object", isCorrect: false },
            { text: "undefined", isCorrect: false },
            { text: "Boolean", isCorrect: false },
          ],
        },
        {
          text: "Which of the following describes the difference between `let` and `const` in JavaScript?\n\n- `let` variables *can* be reassigned.\n- `const` variables **cannot** be reassigned.",
          explanation: "In JavaScript, `let` allows reassigning values, whereas `const` creates a **read-only** reference that *cannot* be reassigned. Inline code tags like `` `let` `` and `` `const` `` help format code keywords.",
          points: 1,
          options: [
            { text: "`let` allows reassignment; `const` does not.", isCorrect: true },
            { text: "`const` allows reassignment; `let` does not.", isCorrect: false },
            { text: "Both allow reassignment.", isCorrect: false },
            { text: "Neither allows reassignment.", isCorrect: false },
          ],
        },
        {
          text: "What does the following SQL query return?\n\n```sql\nSELECT name FROM users WHERE role = 'admin' LIMIT 1;\n```\n\nExplain the usage of the `LIMIT` clause.",
          explanation: "The `LIMIT` clause restricts the results. In this case, it returns *at most* **one** name from the `users` table where the `role` matches `'admin'.`",
          points: 2,
          options: [
            { text: "At most one admin user name", isCorrect: true },
            { text: "All admin user names", isCorrect: false },
            { text: "A count of admin users", isCorrect: false },
            { text: "An error query", isCorrect: false },
          ],
        },
      ];

      const results = await Promise.all(
        DEMO_QUESTIONS.map(async (q) => {
          const result = await createQuestionMutation.mutateAsync({
            createdById: hostProfileId,
            text: q.text,
            explanation: q.explanation,
            options: q.options,
          });
          const questionId = (result.question as { id: string }).id;
          return { questionId, points: q.points };
        })
      );
      const createdQuestions = results;

      const room = await createRoomMutation.mutateAsync({
        hostProfileId,
        questions: createdQuestions,
      });

      updateTempUser({ profileId: hostProfileId });
      navigate(`/dashboard/session/${room.room.code}`);
      setIsDemoCreating(false);
    } catch (err) {
      console.error("Failed to create demo room:", err);
      alert("Failed to create demo room: " + (err instanceof Error ? err.message : String(err)));
      setIsDemoCreating(false);
    }
  }

  const [codeHint] = useState(() => randomCodeHint());

  // ── QR Scanner state ──────────────────────────────────────────────────────
  const [showScanner, setShowScanner] = useState(false);
  const [fileScanning, setFileScanning] = useState(false);
  const [fileScanError, setFileScanError] = useState<string | null>(null);

  function handleScan(text: string) {
    let sessionCode = text.trim();
    const urlMatch = sessionCode.match(/\/dashboard\/session\/([A-Z0-9]+)/i);
    if (urlMatch && urlMatch[1]) {
      sessionCode = urlMatch[1].toUpperCase();
    } else {
      sessionCode = sessionCode.replace(/\s+/g, "").toUpperCase();
    }
    setShowScanner(false);
    navigate(`/dashboard/session/${sessionCode}`);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    setFileScanning(true);
    setFileScanError(null);
    
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const tempScanner = new Html5Qrcode("hidden-qr-reader");
      
      const decodedText = await tempScanner.scanFile(file, false);
      handleScan(decodedText);
    } catch (err) {
      console.error("Failed to scan QR from file:", err);
      setFileScanError(
        "Could not detect a QR code in this image. Please make sure the QR code is centered, well-lit, and in focus, then try again."
      );
    } finally {
      setFileScanning(false);
      // Reset input value to allow uploading the same file if needed
      e.target.value = "";
    }
  }

  function goToLobby() {
    const finalCode = normalizeCode(code);
    if (!finalCode) return;
    navigate(`/dashboard/session/${finalCode}`);
  }

  function handleJoin() {
    const finalCode = normalizeCode(code);
    if (!finalCode) return;

    const existing = getTempUser();
    if (!existing) {
      setShowNameModal(true);
      return;
    }
    goToLobby();
  }

  function handleCreateTempUser() {
    const user = createTempUser(name);
    setTempUser(user);
    setShowNameModal(false);
    goToLobby();
  }

  return (
    <div className="grid gap-10">
        <section className="rounded-2xl border border-line bg-white p-7 shadow-sm md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-ink md:text-3xl">
                Join a live quiz
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
                Enter the session code to join and wait in the lobby. You can
                change your display name anytime.
              </p>
            </div>

            <div className="flex w-full flex-col gap-3 sm:flex-row md:w-auto">
              <div className="w-full sm:w-64">
                <label className="sr-only" htmlFor="sessionCode">
                  Session code
                </label>
                <input
                id="sessionCode"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={`e.g. ${codeHint}`}
                className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm font-semibold text-ink outline-none transition focus:border-brand-300 focus:ring-4 focus:ring-brand-100"
              />
              <p className="mt-2 text-xs text-muted">
                Tip: codes are usually 4–6 characters.
              </p>
            </div>

            <button
              type="button"
              onClick={handleJoin}
              className="inline-flex items-center justify-center rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
            >
              Join lobby
            </button>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">
              Host a session instead?
            </span>
            <button
              type="button"
              onClick={() => navigate("/dashboard/create")}
              className="rounded-full border border-line bg-white px-4 py-2 text-xs font-semibold text-ink transition hover:bg-surface-soft"
            >
              Create a room
            </button>
            <button
              type="button"
              onClick={handleCreateDemoRoom}
              disabled={isDemoCreating}
              className="rounded-full bg-brand-100 hover:bg-brand-200 border border-brand-200 px-4 py-2 text-xs font-semibold text-brand-700 transition disabled:opacity-50"
            >
              {isDemoCreating ? "Creating Demo..." : "Create Demo Room (Fast Test)"}
            </button>
          </div>
        </section>

      {/* ── QR Code Scanner Section ── */}
      <section className="rounded-2xl border border-brand-200 bg-gradient-to-br from-indigo-50 via-brand-50 to-violet-50 p-7 shadow-sm md:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 flex-none items-center justify-center rounded-2xl bg-brand-600 text-2xl shadow-md">
              📷
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-ink">Scan QR Code to Join</h2>
              <p className="mt-1 text-sm text-muted">
                Ask the host to show their QR code. Point your camera at it, or upload/take a photo to join instantly.
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3">
            {!showScanner ? (
              <button
                type="button"
                id="start-qr-scanner-btn"
                onClick={() => setShowScanner(true)}
                className="flex-none inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-bold text-white shadow-md transition hover:bg-brand-700 hover:shadow-lg active:scale-95"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                  <path d="M3 3h7v7H3zm0 11h7v7H3zm11-11h7v7h-7zm3 3h1v1h-1zm-3 8h2v2h-2zm2 2h2v2h-2zm-2 2h2v2h-2zm4-4h2v2h-2zm0 4h2v2h-2zm-2-2h2v2h-2z"/>
                </svg>
                Live Camera
              </button>
            ) : (
              <button
                type="button"
                id="stop-qr-scanner-btn"
                onClick={() => setShowScanner(false)}
                className="flex-none inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600"
              >
                ✕ Close Camera
              </button>
            )}

            <label
              htmlFor="qr-file-input"
              className="flex-none inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-white px-6 py-3 text-sm font-bold text-ink shadow-sm transition hover:bg-surface-soft hover:shadow-md active:scale-95 cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
              </svg>
              Upload / Take Photo
            </label>
            <input
              type="file"
              id="qr-file-input"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </div>

        {/* Loading state for file scanning */}
        {fileScanning && (
          <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-6 text-center">
            <span className="relative flex h-10 w-10 items-center justify-center">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75" />
              <span className="relative inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-white font-bold text-xs">
                ⏳
              </span>
            </span>
            <p className="text-sm font-semibold text-brand-700 animate-pulse">Scanning image for QR code… Please wait.</p>
          </div>
        )}

        {/* Error state for file scanning */}
        {fileScanError && (
          <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
            <span className="text-3xl">⚠️</span>
            <p className="text-sm font-semibold text-rose-600">{fileScanError}</p>
            <button
              type="button"
              onClick={() => setFileScanError(null)}
              className="rounded-full bg-rose-600 px-5 py-2 text-xs font-bold text-white transition hover:bg-rose-700"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Mount/unmount the scanner — html5-qrcode starts/stops camera via useEffect */}
        {showScanner && (
          <QrScannerView
            onScan={handleScan}
            onClose={() => setShowScanner(false)}
          />
        )}
      </section>

      {/* Hidden element for html5-qrcode to scan uploaded images */}
      <div id="hidden-qr-reader" className="hidden" />

      <section className="rounded-2xl border border-line bg-surface-soft p-7 md:p-8">
        <div className="flex items-end justify-between gap-6">
          <div>
            <h2 className="text-xl font-extrabold text-ink">Quizzes by us</h2>
            <p className="mt-2 text-sm text-muted">
              {isLoggedIn
                ? "Curated quizzes from the QuizHub team — practice solo at your own pace."
                : "These are curated quizzes. Log in to start them."}
            </p>
          </div>
          {!isLoggedIn ? (
            <Link
              to="/login"
              className="hidden rounded-full bg-white px-5 py-2 text-sm font-semibold text-ink shadow-sm transition hover:bg-brand-50 md:inline-flex"
            >
              Log in to unlock
            </Link>
          ) : null}
        </div>

        {curatedLoading ? (
          <p className="mt-8 text-sm text-muted">Loading quizzes…</p>
        ) : curatedQuizzes.length === 0 ? (
          <p className="mt-8 text-sm text-muted">
            No curated quizzes yet — check back soon.
          </p>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {curatedQuizzes.map((q) => (
              <article
                key={q.slug}
                className="relative flex flex-col overflow-hidden rounded-2xl border border-line bg-white p-6 shadow-sm transition hover:border-brand-200 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span
                      className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-brand-50 text-2xl"
                      aria-hidden
                    >
                      {q.emoji ?? "🧩"}
                    </span>
                    <div>
                      <h3 className="font-bold text-ink">{q.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted">{q.description}</p>
                    </div>
                  </div>
                  <span className="rounded-full border border-line bg-surface-soft px-3 py-1 text-xs font-semibold text-ink">
                    {q.questionCount} Q
                  </span>
                </div>

                <div className="mt-6 flex items-center justify-between gap-3">
                  <p className="text-xs text-muted">{q.totalPoints} pts available</p>
                  {isLoggedIn ? (
                    <Link
                      to={`/dashboard/practice/${q.slug}`}
                      className="inline-flex rounded-full bg-brand-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-brand-700"
                    >
                      Practice
                    </Link>
                  ) : (
                    <Link
                      to="/login"
                      className="inline-flex rounded-full bg-brand-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-brand-700"
                    >
                      Login to start
                    </Link>
                  )}
                </div>

                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-brand-50 opacity-70" />
              </article>
            ))}
          </div>
        )}
      </section>

      <AccountPrompt />

      {showNameModal ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-line bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-ink">Choose a display name</h3>
            <p className="mt-2 text-sm text-muted">
              We’ll save it on this device so you can join faster next time.
            </p>

            <div className="mt-5">
              <label className="text-xs font-semibold text-muted" htmlFor="name">
                Display name
              </label>
              <input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Mayank"
                className="mt-2 w-full rounded-xl border border-line bg-white px-4 py-3 text-sm font-semibold text-ink outline-none transition focus:border-brand-300 focus:ring-4 focus:ring-brand-100"
              />
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowNameModal(false)}
                className="rounded-xl border border-line bg-white px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-surface-soft"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateTempUser}
                className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
              >
                Save and join
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
