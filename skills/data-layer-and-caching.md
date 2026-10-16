---
name: quizhub-data-layer-caching
description: >-
  How QuizHub caches and moves data: TanStack Query keys/staleTime/mutations,
  the backend's in-memory caches (dirty rooms, WS subscribers, auth rate
  limiter), the WebSocket pub/sub protocol, and the localStorage caches (temp
  user, theme). Use when adding a query, mutation, cache invalidation, a
  WebSocket message, or debugging stale data.
---

# QuizHub — Data Layer & Caching

There are **four** distinct "caches" in this app. Know which one you're touching:

1. **Frontend server-state cache** — TanStack Query (`frontend/src/query/`).
2. **Backend in-memory caches** — module-level Maps/Sets in `room.service.ts`,
   `roomSocket.ts`, `auth.ts`.
3. **WebSocket push** — the live transport that keeps clients fresh.
4. **Client persistence** — `localStorage` (guest profile + theme).

---

## 1. Frontend server-state cache (TanStack Query)

**Client defaults** (`frontend/src/query/queryClient.ts`):

```ts
queries:   { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 }
mutations: { retry: 0 }
```

**All query keys live in one registry** — `frontend/src/query/queryKeys.ts`.
Never inline a key string; add it here so invalidation stays predictable.

| Key | Used by | Notable options |
|-----|---------|-----------------|
| `["greet"]` | `useGreeting` | default |
| `["auth-session"]` | `useAuthSession` | `retry: 0` — powers auth gating |
| `["guest-profile"]` | — | reserved |
| `["room", code, "details"]` | `useRoomDetails` | `staleTime: 0` |
| `["room", code, "participants"]` | `useGetAllParticipants` | `staleTime: 0` |
| `["room", code, "questions"]` | `useGetQuestions` | `retry: 0`, `refetchOnWindowFocus: false` |
| `["room", roomId, "scoreboard"]` | `useScoreboard` | supports `enabled` |
| `["room", code, "analytics"]` | `useRoomAnalytics` | `staleTime: 15_000`, `enabled` |
| `["analytics", profileId]` | `useAnalytics` | `staleTime: 30_000` |
| `["question-bank", profileId]` | `useQuestionBank` | `staleTime: 30_000` |
| `["curated-quizzes"]` | `useCuratedQuizzes` | `staleTime: 60_000` (public) |
| `["curated-quiz", slug]` | `useCuratedQuiz` | `retry: 0`, `enabled: Boolean(slug)` (auth) |

All hooks live in `frontend/src/query/queries.ts` and wrap the pure functions in
`frontend/src/services/quizApi.ts`.

### Patterns to follow

- **Read:** add a `getX()` in `quizApi.ts`, a key in `queryKeys.ts`, a `useX()`
  hook in `queries.ts`. Pick a `staleTime` that matches how volatile the data is
  (live room data → `0`; user content → `30_000`+; static content → `60_000`).
- **Write:** expose via `useMutation` in `queries.ts`; call
  `queryClient.invalidateQueries` from the page/component after success.
- **Auth cache:** the session lives under `["auth-session"]`. Logout clears it
  (`queryClient.setQueryData(queryKeys.authSession, null)` then invalidates) —
  see `frontend/src/components/layout/Header.tsx`. `RequireAuth` reads the same
  key to gate routes.
- **Live data** (leaderboard/participants) is pushed over WebSockets, not polled;
  queries are for the initial fetch and non-live reads.

---

## 2. Backend in-memory caches

These are process-local (reset on restart, not shared across instances). Do not
assume they survive horizontal scaling.

### `dirtyRooms` + 1s broadcast loop — `backend/src/services/room.service.ts`

To avoid recomputing the leaderboard on every answer, rooms are "marked dirty"
and flushed on a timer:

```ts
const dirtyRooms = new Set<string>();
export const markRoomDirty = (code) => dirtyRooms.add(code.toUpperCase());
setInterval(async () => { /* for each dirty code → broadcastLeaderboard(code) */ }, 1000);
```

- Trigger: `markRoomDirty(code)` — called from the WebSocket `submit_answer`
  handler in `server.ts`.
- Flush: `broadcastLeaderboard(code)` recomputes via `computeLeaderboard` and
  publishes `leaderboard_updated`.
- **Implication:** leaderboard updates are debounced to ≤1s; there is an inherent
  latency. Don't add per-answer synchronous broadcasts without considering this.

### Room "cache"/liveness — `getActiveRoom` / `checkAndExpireRoom`
`getActiveRoom(codeOrId, isId?)` loads a room and auto-expires a `LIVE` room whose
`endedAt` has passed (flips it to `ENDED` + broadcasts `room_ended`). Any code
that needs a room should go through this so expiry is consistent.

### WebSocket subscribers — `backend/src/sockets/roomSocket.ts`
`roomSubscribers: Map<roomCode, Set<WebSocket>>` is the pub/sub cache. Functions:
`subscribeToRoom`, `unsubscribeSocket`, `publishToRoom` (skips non-`OPEN`
sockets). Unsubscribing removes the socket from **all** rooms.

### Auth rate limiter — `backend/src/utils/auth.ts`
`authRateLimiter: Map<`${key}:${ip}`, {count, resetAt}>` — in-memory, per-IP.
`login` 20 / 10min, `register` 8 / 10min. Also a global IP limiter in
`middleware/rateLimiter.ts` (120 req/min).

---

## 3. WebSocket protocol

Endpoint: same origin as the API (`ws://localhost:3000`). One server socket per
client. Messages are JSON `{ type, ... }`.

**Client → server**

| `type` | Payload | Effect |
|--------|---------|--------|
| `subscribe` | `code` | Join a room's channel; server immediately sends the current `participants_updated`. |
| `unsubscribe` | `code`, `tempProfileId` | Leaves; removes the participant row; broadcasts updated participants; closes socket. |
| `submit_answer` | `code`, `participantId`, `roomQuestionId`, `selectedOptionId?`, `selectedOptionIds?`, `timeTakenSeconds?` | Saves the answer (only when room is `LIVE`) then `markRoomDirty(code)`. |

**Server → clients**

| `type` | Payload |
|--------|---------|
| `participants_updated` | `participants[]` |
| `leaderboard_updated` | `roomId`, `scoreboard[]`, `allCompleted` |
| `room_ended` | `room` summary |

Authoritative answer logic lives in `saveAnswer` (backend), not the client — the
client selection is validated against the question's real options.

---

## 4. Client persistence caches (`localStorage`)

### Temp/guest user — `frontend/src/utils/tempUser.ts`
- Key: `quizhub.tempUser.v1`. Shape: `{ id, name, avatar:{emoji,bg}, avatarUrl?, profileId?, participantId? }`.
- Reads are memoised (`cachedRaw`/`cachedUser`) and invalidated on `set`.
- Changes emit a custom event `quizhub.tempUser.changed`; consumed by
  `useTempUser()` (`useSyncExternalStore`), which also listens to the `storage`
  event for cross-tab sync.

### Theme — `frontend/src/utils/theme.ts`
- Key: `quizhub.theme` (`"light" | "dark"`). No value → follow OS
  `prefers-color-scheme`.
- `applyTheme` toggles the `.dark` class + `color-scheme` on `<html>`; changes
  emit `quizhub.theme.changed`, consumed by `useTheme()`.
- `index.html` has a tiny inline script that applies the class **before paint**
  (no-FOUC) and `main.tsx` calls `initTheme()` on boot.

---

## Adding a new cached query — checklist

1. `frontend/src/services/quizApi.ts` → `export async function getThing(): Promise<{thing: T}> { return apiFetch("/api/thing"); }`
2. `frontend/src/query/queryKeys.ts` → add `thing: ["thing"] as const` (use a
   function key when it takes params).
3. `frontend/src/query/queries.ts` → `useThing()` with a deliberate `staleTime`.
4. After mutations that change it, `queryClient.invalidateQueries({ queryKey: queryKeys.thing })`.
5. If it should update live during a session, prefer a WebSocket broadcast over polling — see `roomSocket.ts` / `room.service.ts`.
