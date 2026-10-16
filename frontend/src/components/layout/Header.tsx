import { Link } from "react-router-dom";
import { HashLink } from "react-router-hash-link"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getAuthMe, logoutUser } from "../../services/quizApi";
import { queryKeys } from "../../query/queryKeys";
import { clearTempUser } from "../../utils/tempUser";
import ThemeToggle from "./ThemeToggle";

export default function Header() {
  const queryClient = useQueryClient();
  const { data: authSession } = useQuery({
    queryKey: queryKeys.authSession,
    queryFn: getAuthMe,
    retry: 0,
  });
  const { mutateAsync: logoutAsync, isPending: isLoggingOut } = useMutation({
    mutationFn: logoutUser,
  });

  async function handleLogout() {
    try {
      await logoutAsync();
    } catch (err) {
      console.error("Logout failed:", err);
    }
    clearTempUser();
    queryClient.setQueryData(queryKeys.authSession, null);
    queryClient.invalidateQueries({ queryKey: queryKeys.authSession });
  }

  const isLoggedIn = Boolean(authSession?.user?.id);
  const displayName = authSession?.profile?.username?.trim() || authSession?.user?.email;

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-white">
      <div className="border-b border-line bg-surface-soft">
        <div className="mx-auto flex h-10 max-w-6xl items-center justify-between gap-2 px-4 text-sm sm:px-6">
          <ThemeToggle className="h-7 w-7" />
          <div className="flex items-center gap-2">
            <span className="text-muted">Taking a quiz?</span>
            <Link
              to="/dashboard"
              className="font-semibold text-brand-600 hover:text-brand-700"
            >
              Join as participant →
            </Link>
          </div>
        </div>
      </div>

      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <HashLink to="/#" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600">
            <svg
              className="h-4 w-4 text-white"
              viewBox="0 0 448 512"
              fill="currentColor"
              aria-hidden
            >
              <path d="M64 32C28.7 32 0 60.7 0 96V416c0 35.3 28.7 64 64 64H384c35.3 0 64-28.7 64-64V96c0-35.3-28.7-64-64-64H64zm64 192c17.7 0 32 14.3 32 32v96c0 17.7-14.3 32-32 32s-32-14.3-32-32V256c0-17.7 14.3-32 32-32zm64-64c0-17.7 14.3-32 32-32s32 14.3 32 32V352c0 17.7-14.3 32-32 32s-32-14.3-32-32V160zM320 288c17.7 0 32 14.3 32 32v32c0 17.7-14.3 32-32 32s-32-14.3-32-32V320c0-17.7 14.3-32 32-32z" />
            </svg>
          </div>
          <span className="text-xl font-bold text-ink">QuizHub</span>
        </HashLink>

        <div className="hidden items-center gap-8 md:flex">
          <HashLink
            to="/#features"
            className="text-sm font-medium text-muted hover:text-ink"
          >
            Features
          </HashLink>
          <HashLink
            to="/#how-it-works"
            className="text-sm font-medium text-muted hover:text-ink"
          >
            How it works
          </HashLink>
          <HashLink
            to="/#pricing"
            className="text-sm font-medium text-muted hover:text-ink"
          >
            Pricing
          </HashLink>
          <Link
            to="/about"
            className="text-sm font-medium text-muted hover:text-ink"
          >
            About Us
          </Link>
        </div>

        {isLoggedIn ? (
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted sm:inline">
              Logged in as <span className="font-semibold text-ink">{displayName}</span>
            </span>
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="rounded-full border border-line bg-white px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-surface-soft disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoggingOut ? "Logging out..." : "Logout"}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="hidden text-sm font-semibold text-muted hover:text-ink sm:inline"
            >
              Log in
            </Link>
            <Link
              to="/login"
              className="rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
            >
              Sign up free
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
}
