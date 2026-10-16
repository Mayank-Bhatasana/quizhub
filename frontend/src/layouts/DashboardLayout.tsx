import { Link, NavLink, Outlet } from "react-router-dom";
import { useEffect } from "react";
import { useTempUser } from "../hooks/useTempUser";
import { getTempUser, setTempUser, createTempUser } from "../utils/tempUser";
import ThemeToggle from "../components/layout/ThemeToggle";

function AvatarChip() {
  const user = useTempUser();

  const initials =
    user?.name
      ?.trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "G";

  const bg = user?.avatar?.bg ?? "bg-slate-200";

  return (
    <Link
      to="/dashboard/profile"
      className="flex items-center gap-3 rounded-full border border-line bg-white px-3 py-2 transition hover:border-brand-200 hover:bg-surface-soft"
      aria-label="Open profile"
    >
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-ink ${bg}`}
        aria-hidden
      >
        {user?.avatar?.emoji ?? initials}
      </div>
      <div className="leading-tight">
        <p className="text-sm font-semibold text-ink">
          {user?.name?.trim() ? user.name : "Guest"}
        </p>
        <p className="text-xs text-muted">Profile</p>
      </div>
    </Link>
  );
}

export default function DashboardLayout() {
  useEffect(() => {
    const existing = getTempUser();
    if (!existing) {
      const randomGuestName = `Guest_${Math.floor(1000 + Math.random() * 9000)}`;
      setTempUser(createTempUser(randomGuestName));
    }
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-20 border-b border-line bg-white">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600">
              <span className="text-sm font-extrabold text-white">Q</span>
            </div>
            <span className="text-xl font-bold text-ink">QuizHub</span>
          </Link>

          <div className="hidden items-center gap-2 md:flex">
            <NavLink
              to="/dashboard"
              end
              className={({ isActive }) =>
                `rounded-full px-4 py-2 text-sm font-semibold transition ${isActive
                  ? "bg-brand-100 text-brand-700 dark:bg-brand-900/60 dark:text-brand-300"
                  : "text-muted hover:bg-surface-soft hover:text-ink"
                }`
              }
            >
              Join
            </NavLink>
            <NavLink
              to="/dashboard/analytics"
              className={({ isActive }) =>
                `rounded-full px-4 py-2 text-sm font-semibold transition ${isActive
                  ? "bg-brand-100 text-brand-700 dark:bg-brand-900/60 dark:text-brand-300"
                  : "text-muted hover:bg-surface-soft hover:text-ink"
                }`
              }
            >
              Analytics
            </NavLink>
            <NavLink
              to="/dashboard/questions"
              className={({ isActive }) =>
                `rounded-full px-4 py-2 text-sm font-semibold transition ${isActive
                  ? "bg-brand-100 text-brand-700 dark:bg-brand-900/60 dark:text-brand-300"
                  : "text-muted hover:bg-surface-soft hover:text-ink"
                }`
              }
            >
              Question bank
            </NavLink>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              to="/dashboard/create"
              className="hidden rounded-full border border-line bg-white px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-surface-soft sm:inline-flex"
            >
              Create test
            </Link>
            <Link
              to="/"
              className="hidden text-sm font-semibold text-muted hover:text-ink sm:inline"
            >
              Back to site
            </Link>
            <AvatarChip />
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}
