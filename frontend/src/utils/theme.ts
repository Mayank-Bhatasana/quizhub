export type Theme = "light" | "dark";

const STORAGE_KEY = "quizhub.theme";
export const THEME_CHANGED_EVENT = "quizhub.theme.changed";

export function getStoredTheme(): Theme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

/** Resolves the active theme, falling back to the OS preference. */
export function getResolvedTheme(): Theme {
  const stored = getStoredTheme();
  if (stored) return stored;
  if (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-color-scheme: dark)").matches
  ) {
    return "dark";
  }
  return "light";
}

export function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

export function setTheme(theme: Theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // ignore storage errors (e.g. private mode)
  }
  applyTheme(theme);
  window.dispatchEvent(new Event(THEME_CHANGED_EVENT));
}

export function toggleTheme() {
  setTheme(getResolvedTheme() === "dark" ? "light" : "dark");
}

/** Applies the persisted / OS theme. Called once on app start. */
export function initTheme() {
  applyTheme(getResolvedTheme());
}
