# QuizWeb Frontend

This app uses React + Vite + TanStack Query (React Query) for frontend data fetching.
Backend endpoints live in `../backend` and are called through a small `apiFetch` helper.

## How data flows

1) UI calls a React Query hook (query or mutation)
2) Hook executes a function from `src/services/`
3) `apiFetch` builds the HTTP request and throws on errors
4) React Query handles caching, loading, error state, and retries

Key files:
- `src/main.tsx` sets up `QueryClientProvider`
- `src/query/queryClient.ts` configures global query defaults
- `src/query/queryKeys.ts` stores consistent cache keys
- `src/query/queries.ts` defines typed hooks used by pages
- `src/services/api.ts` wraps `fetch` (base URL + error handling)
- `src/services/quizApi.ts` is the backend API client

## React Query setup

`QueryClient` is created once and wrapped around the router in `src/main.tsx`:

```tsx
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./query/queryClient";

<QueryClientProvider client={queryClient}>
  <RouterProvider router={router} />
</QueryClientProvider>
```

Global defaults are defined in `src/query/queryClient.ts`:

- `staleTime: 30_000` keeps query data fresh for 30s
- `retry: 1` retries failed queries once
- `refetchOnWindowFocus: false` avoids surprise refetches
- `mutations.retry: 0` (fail fast on mutations)

## Query hooks

All hooks are centralized in `src/query/queries.ts`.
Use queries for GETs and mutations for POST/PUT/DELETE.

Example query (greeting):

```tsx
const { data, isLoading, isError } = useGreeting();
```

Example mutation (create guest):

```tsx
const createGuest = useCreateGuest();
const guest = await createGuest.mutateAsync("My Name");
```

## Pages using React Query

- `src/pages/showGreeting.tsx`
  - Uses `useGreeting()` for `/getGreet`
- `src/pages/dashboard/CreateSession.tsx`
  - Uses `useCreateGuest()`, `useCreateQuestion()`, `useCreateRoom()`
  - Sequential mutations create a guest, then questions, then a room
- `src/pages/dashboard/SessionLobby.tsx`
  - Uses `useCreateGuest()` and `useJoinRoom()`
  - Side effect to ensure guest exists and then join the room

## Backend integration

The frontend talks to the backend through `apiFetch`:

```ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";
```

- Set `VITE_API_BASE_URL` in `.env` if your backend runs elsewhere.
- Cookies are sent with `credentials: "include"` for guest sessions.
- Errors from the backend are surfaced as `Error` and used by React Query.

## Useful commands

```bash
pnpm dev
pnpm build
pnpm lint
```
