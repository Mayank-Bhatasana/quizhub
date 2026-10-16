import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { loginUser, registerUser } from "../services/quizApi";
import { createTempUser, getTempUser, setTempUser } from "../utils/tempUser";

type AuthMode = "login" | "signup";

const highlights = [
  "Host live quizzes in seconds",
  "Share a link — no app download",
  "Real-time leaderboards & analytics",
];

function QuizHubMark({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 448 512" fill="currentColor" aria-hidden>
      <path d="M64 32C28.7 32 0 60.7 0 96V416c0 35.3 28.7 64 64 64H384c35.3 0 64-28.7 64-64V96c0-35.3-28.7-64-64-64H64zm64 192c17.7 0 32 14.3 32 32v96c0 17.7-14.3 32-32 32s-32-14.3-32-32V256c0-17.7 14.3-32 32-32zm64-64c0-17.7 14.3-32 32-32s32 14.3 32 32V352c0 17.7-14.3 32-32 32s-32-14.3-32-32V160zM320 288c17.7 0 32 14.3 32 32v32c0 17.7-14.3 32-32 32s-32-14.3-32-32V320c0-17.7 14.3-32 32-32z" />
    </svg>
  );
}

function FieldIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-slate-400">
      {children}
    </span>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = (location.state as { from?: string } | null)?.from ?? "/dashboard";
  const [mode, setMode] = useState<AuthMode>("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const safeEmail = email.trim().toLowerCase();
    const safeUsername = username.trim();

    if (!safeEmail || !password) {
      setError("Email and password are required");
      return;
    }

    if (mode === "signup") {
      if (!safeUsername) {
        setError("Username is required");
        return;
      }
      if (password.length < 8) {
        setError("Password must be at least 8 characters");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match");
        return;
      }
    }

    setIsSubmitting(true);
    setError(null);
    setStatus(mode === "signup" ? "Creating account..." : "Signing in...");

    try {
      const response =
        mode === "signup"
          ? await registerUser({
              email: safeEmail,
              password,
              username: safeUsername,
            })
          : await loginUser({
              email: safeEmail,
              password,
            });

      const existing = getTempUser();
      const base = existing ?? createTempUser(response.profile.username ?? "User");
      const nextName = response.profile.username?.trim() || base.name;
      setTempUser({
        ...base,
        name: nextName,
        profileId: response.profile.id,
        avatarUrl: response.profile.avatarUrl ?? base.avatarUrl,
      });

      setStatus(mode === "signup" ? "Account created. Redirecting..." : "Logged in. Redirecting...");
      navigate(redirectTo, { replace: true });
      setIsSubmitting(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Authentication failed";
      setError(message);
      setStatus(null);
      setIsSubmitting(false);
    }
  }

  const inputClass =
    "w-full rounded-2xl border border-line/80 bg-white/90 py-3.5 pr-12 pl-12 text-sm font-medium text-ink shadow-sm outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:ring-4 focus:ring-brand-100";

  return (
    <section className="auth-shell relative overflow-hidden py-10 md:py-14 lg:py-16">
      <div
        className="auth-orb top-8 -left-24 size-72 bg-brand-400/30"
        style={{ animationDelay: "0s" }}
        aria-hidden
      />
      <div
        className="auth-orb right-0 bottom-0 size-80 bg-indigo-400/20"
        style={{ animationDelay: "-3s" }}
        aria-hidden
      />
      <div
        className="auth-orb top-1/3 left-1/2 size-56 -translate-x-1/2 bg-sky-300/25"
        style={{ animationDelay: "-5s" }}
        aria-hidden
      />

      <div className="relative mx-auto max-w-5xl px-4 sm:px-6">
        <div className="auth-card-enter overflow-hidden rounded-[1.75rem] border border-white/60 bg-white/70 shadow-[0_8px_40px_-12px_rgb(37_99_235/0.25)] backdrop-blur-xl md:grid md:grid-cols-[1.05fr_1fr]">
          {/* Brand panel */}
          <div className="relative overflow-hidden bg-linear-to-br from-brand-700 via-brand-600 to-indigo-700 px-8 py-10 text-white md:px-10 md:py-12">
            <div
              className="pointer-events-none absolute -top-24 -right-24 size-64 rounded-full bg-white/10"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -bottom-16 -left-16 size-48 rounded-full bg-brand-400/20"
              aria-hidden
            />

            <div className="relative">
              <Link
                to="/"
                className="inline-flex items-center gap-2.5 rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold text-white ring-1 ring-white/20 transition hover:bg-white/15"
              >
                <span className="flex size-8 items-center justify-center rounded-lg bg-white text-brand-700">
                  <QuizHubMark />
                </span>
                QuizHub
              </Link>

              <p className="mt-8 text-xs font-semibold tracking-[0.2em] text-brand-100 uppercase">
                {mode === "signup" ? "Get started" : "Welcome back"}
              </p>
              <h1 className="mt-3 text-3xl font-extrabold tracking-tight md:text-[2rem] md:leading-tight">
                {mode === "signup"
                  ? "Start engaging your audience today"
                  : "Pick up right where you left off"}
              </h1>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-brand-100/90">
                {mode === "signup"
                  ? "Create a free account to host sessions, track scores, and grow your quiz library."
                  : "Sign in to manage live rooms, review analytics, and launch your next quiz."}
              </p>

              <ul className="mt-8 space-y-3.5">
                {highlights.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-brand-50">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-white/20">
                      <svg className="size-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                        <path
                          fillRule="evenodd"
                          d="M16.704 5.29a1 1 0 0 1 0 1.42l-7.25 7.25a1 1 0 0 1-1.42 0l-3.25-3.25a1 1 0 1 1 1.42-1.42l2.54 2.54 6.54-6.54a1 1 0 0 1 1.42 0Z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </span>
                    {item}
                  </li>
                ))}
              </ul>

              <div className="mt-10 flex gap-6 border-t border-white/15 pt-8">
                <div>
                  <p className="text-2xl font-extrabold tracking-tight">10k+</p>
                  <p className="mt-0.5 text-xs text-brand-100">Quizzes hosted</p>
                </div>
                <div>
                  <p className="text-2xl font-extrabold tracking-tight">98%</p>
                  <p className="mt-0.5 text-xs text-brand-100">Would recommend</p>
                </div>
              </div>
            </div>
          </div>

          {/* Form panel */}
          <div className="relative bg-white/95 px-8 py-10 md:px-10 md:py-12">
            <div className="mb-8">
              <h2 className="text-xl font-bold tracking-tight text-ink">
                {mode === "signup" ? "Create your account" : "Sign in"}
              </h2>
              <p className="mt-1.5 text-sm text-muted">
                {mode === "signup"
                  ? "Already have an account?"
                  : "New to QuizHub?"}{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode(mode === "signup" ? "login" : "signup");
                    setError(null);
                    setStatus(null);
                  }}
                  className="font-semibold text-brand-600 underline-offset-2 hover:text-brand-700 hover:underline"
                >
                  {mode === "signup" ? "Sign in" : "Create one free"}
                </button>
              </p>
            </div>

            <div className="relative mb-7 grid grid-cols-2 rounded-2xl bg-surface-muted p-1">
              <div
                className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-xl bg-white shadow-md ring-1 ring-line/60 transition-transform duration-300 ease-out ${
                  mode === "signup" ? "translate-x-[calc(100%+4px)]" : "translate-x-1"
                }`}
                aria-hidden
              />
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError(null);
                }}
                className={`relative z-10 rounded-xl py-2.5 text-sm font-semibold transition-colors ${
                  mode === "login" ? "text-ink" : "text-muted hover:text-ink"
                }`}
              >
                Log in
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setError(null);
                }}
                className={`relative z-10 rounded-xl py-2.5 text-sm font-semibold transition-colors ${
                  mode === "signup" ? "text-ink" : "text-muted hover:text-ink"
                }`}
              >
                Sign up
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "signup" ? (
                <div className="auth-card-enter" style={{ animationDelay: "0.05s" }}>
                  <label className="mb-2 block text-xs font-semibold tracking-wide text-muted uppercase" htmlFor="username">
                    Username
                  </label>
                  <div className="relative">
                    <FieldIcon>
                      <svg className="size-[1.125rem]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                      </svg>
                    </FieldIcon>
                    <input
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className={inputClass}
                      placeholder="How should we call you?"
                      autoComplete="username"
                    />
                  </div>
                </div>
              ) : null}

              <div>
                <label className="mb-2 block text-xs font-semibold tracking-wide text-muted uppercase" htmlFor="email">
                  Email
                </label>
                <div className="relative">
                  <FieldIcon>
                    <svg className="size-[1.125rem]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                    </svg>
                  </FieldIcon>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                    placeholder="you@company.com"
                    autoComplete="email"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold tracking-wide text-muted uppercase" htmlFor="password">
                  Password
                </label>
                <div className="relative">
                  <FieldIcon>
                    <svg className="size-[1.125rem]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 0 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                    </svg>
                  </FieldIcon>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputClass}
                    placeholder={mode === "signup" ? "Min. 8 characters" : "Your password"}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute top-1/2 right-4 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition hover:text-brand-600"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <svg className="size-[1.125rem]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg className="size-[1.125rem]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {mode === "signup" ? (
                <div className="auth-card-enter" style={{ animationDelay: "0.1s" }}>
                  <label className="mb-2 block text-xs font-semibold tracking-wide text-muted uppercase" htmlFor="confirmPassword">
                    Confirm password
                  </label>
                  <div className="relative">
                    <FieldIcon>
                      <svg className="size-[1.125rem]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                      </svg>
                    </FieldIcon>
                    <input
                      id="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={inputClass}
                      placeholder="Repeat your password"
                      autoComplete="new-password"
                    />
                  </div>
                </div>
              ) : null}

              {error ? (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-2xl border border-red-200/80 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
                >
                  <svg className="mt-0.5 size-4 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {error}
                </div>
              ) : null}

              {status ? (
                <div className="flex items-start gap-2.5 rounded-2xl border border-emerald-200/80 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
                  <svg className="mt-0.5 size-4 shrink-0 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {status}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="group relative mt-2 w-full overflow-hidden rounded-2xl bg-linear-to-r from-brand-600 to-indigo-600 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 transition hover:shadow-xl hover:shadow-brand-600/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="auth-btn-shine pointer-events-none absolute inset-0" aria-hidden />
                <span className="relative">
                  {isSubmitting
                    ? mode === "signup"
                      ? "Creating account..."
                      : "Signing in..."
                    : mode === "signup"
                      ? "Create free account"
                      : "Sign in"}
                </span>
              </button>
            </form>

            <p className="mt-6 text-center text-xs leading-relaxed text-muted">
              By continuing, you agree to QuizHub&apos;s terms of service and privacy policy.
            </p>
          </div>
        </div>

        <p className="auth-card-enter mt-6 text-center text-sm text-muted" style={{ animationDelay: "0.15s" }}>
          <Link to="/" className="font-medium text-brand-600 transition hover:text-brand-700">
            ← Back to home
          </Link>
        </p>
      </div>
    </section>
  );
}
