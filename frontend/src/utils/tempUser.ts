export type TempUserAvatar = {
  emoji: string;
  bg: string;
};

export type TempUser = {
  id: string;
  name: string;
  avatar: TempUserAvatar;
  avatarUrl?: string;
  profileId?: string;
  participantId?: string;
};

const STORAGE_KEY = "quizhub.tempUser.v1";
export const TEMP_USER_CHANGED_EVENT = "quizhub.tempUser.changed";

function notifyTempUserChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(TEMP_USER_CHANGED_EVENT));
}

let cachedRaw: string | null | undefined = undefined;
let cachedUser: TempUser | null = null;

function readTempUserFromStorage(): TempUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === cachedRaw) return cachedUser;

    cachedRaw = raw;
    if (!raw) {
      cachedUser = null;
      return null;
    }

    cachedUser = JSON.parse(raw) as TempUser;
    return cachedUser;
  } catch {
    cachedRaw = null;
    cachedUser = null;
    return null;
  }
}

const emojiPool = ["🧠", "⚡", "🌟", "🎯", "🧩", "🚀", "🍀", "🔥"];
const bgPool = [
  "bg-brand-100",
  "bg-slate-200",
  "bg-emerald-100",
  "bg-amber-100",
  "bg-rose-100",
  "bg-indigo-100",
];
const avatarUrlPool = Array.from({ length: 15 }, (_, index) => {
  const id = index + 1;
  return `https://cciiiwclqnouqzbjqscs.supabase.co/storage/v1/object/public/defaults/${id}.png`;
});

function randomId() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function pick<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

export function createTempUser(name: string): TempUser {
  const safeName = name.trim().slice(0, 30) || "Guest";
  return {
    id: randomId(),
    name: safeName,
    avatar: { emoji: pick(emojiPool), bg: pick(bgPool) },
    avatarUrl: pick(avatarUrlPool),
  };
}

export function getTempUser(): TempUser | null {
  return readTempUserFromStorage();
}

export function setTempUser(user: TempUser) {
  const raw = JSON.stringify(user);
  localStorage.setItem(STORAGE_KEY, raw);
  cachedRaw = raw;
  cachedUser = user;
  notifyTempUserChanged();
}

export function updateTempUser(partial: Partial<TempUser>) {
  const current = getTempUser();
  if (!current) return;
  setTempUser({ ...current, ...partial });
}

export function clearTempUser() {
  localStorage.removeItem(STORAGE_KEY);
  cachedRaw = null;
  cachedUser = null;
  notifyTempUserChanged();
}
