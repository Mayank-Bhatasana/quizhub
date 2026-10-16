import { useSyncExternalStore } from "react";
import { getResolvedTheme, THEME_CHANGED_EVENT, type Theme } from "../utils/theme";

function subscribe(onStoreChange: () => void) {
  window.addEventListener(THEME_CHANGED_EVENT, onStoreChange);

  const media = window.matchMedia?.("(prefers-color-scheme: dark)");
  media?.addEventListener("change", onStoreChange);

  return () => {
    window.removeEventListener(THEME_CHANGED_EVENT, onStoreChange);
    media?.removeEventListener("change", onStoreChange);
  };
}

export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, getResolvedTheme, () => "light");
}
