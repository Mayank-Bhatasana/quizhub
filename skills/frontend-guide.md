---
name: quizhub-frontend-guide
description: >-
  Frontend conventions for QuizHub: routing/layouts, the auth guard and login
  redirect, dark mode + theming, Tailwind design tokens and reusable classes,
  the API client and TanStack Query usage, and the page inventory. Use when
  adding pages, components, styles, or wiring the UI to the API.
---

# QuizHub — Frontend Guide

React 19 (React Compiler enabled) + TypeScript + Vite 8 + Tailwind CSS 4 +
TanStack Query 5 + React Router 7. Pages are lazy-loaded per route.

## Routing — `frontend/src/app/router.tsx`

Three top-level layouts, each with children:

| Layout | Paths |
|--------|-------|
| `RootLayout` | `/` (Home), `/about`, `/login`, `*` (NotFound) |
| `ExamLayout` | `room/:code/join` (player), `room/:code/join/leaderboard` |
| `DashboardLayout` | `dashboard` (DashboardHome), `dashboard/session/:code` (SessionLobby), `dashboard/session/:code/report` (SessionReport), `dashboard/questions` (QuestionBank), `dashboard/analytics`, `dashboard/profile`, `dashboard/create` (CreateSession), `dashboard/practice/:slug` (**auth-gated**), `dashboard/*` (NotFound) |

- Add a page: create it under `src/pages/…`, `lazy(() => import(...))` it at the
  top of `router.tsx`, and add a route inside the right layout.
- **`DashboardLayout` is NOT auth-gated** — it auto-creates a client-side guest
  (`tempUser`) so anyone can join/host. Only routes wrapped in `<RequireAuth />`
  (currently `dashboard/practice/:slug`) require a logged-in account.

## Auth

- `RequireAuth` (`src/components/auth/RequireAuth.tsx`) reads `useAuthSession()`
  (query key `["auth-session"]`). If there's no `user.id`, it redirects to
  `/login` with `state.from = location.pathname`.
- `Login` (`src/pages/Login.tsx`) navigates to `location.state.from ?? "/dashboard"`
  after success. **Preserve this** so deep links (e.g. a practice URL) survive login.
- Session shape: `{ user: { id, email }, profile: { id, username, role, … } }`
  (`AuthSession` in `services/quizApi.ts`). On login the profile is also mirrored
  into the client `tempUser` (so header/avatar keep working).
- Logout lives in `components/layout/Header.tsx` — it calls the API, clears the
  local guest (`clearTempUser`), then nulls + invalidates the `auth-session` cache entry.

## Theming / dark mode

- Mechanism: a **`.dark` class on `<html>`**. `index.css` declares
  `@custom-variant dark (&:where(.dark, .dark *))` so `dark:` utilities apply, and
  remaps the semantic tokens (`.dark { --color-ink: …; --color-line: …; … }`).
- Logic: `src/utils/theme.ts` (persisted key `quizhub.theme`, OS-preference
  fallback, `applyTheme`/`toggleTheme`), hook `src/hooks/useTheme.ts`, UI
  `src/components/layout/ThemeToggle.tsx`.
- **No-FOUC**: `index.html` has an inline script that sets the class before paint;
  `main.tsx` calls `initTheme()` on boot. Keep both in sync if you change the key.
- `bg-white` is remapped in dark mode via explicit `.dark .bg-white` overrides —
  prefer the semantic tokens (`bg-surface-soft`, `border-line`, `text-ink`,
  `text-muted`) in new UI so you don't have to add more overrides.

## Design system (Tailwind v4, `index.css`)

Defined in `@theme` (no `tailwind.config.js`):

| Token | Use |
|-------|-----|
| `brand-50…900` | primary blue (`brand-600 = #2563eb`, hover `brand-700`) |
| `text-ink` / `--color-ink` | headings & primary text |
| `text-muted` | secondary text |
| `border-line` | default borders |
| `bg-surface-soft` / `bg-surface-muted` | subtle surfaces |

Reusable helper classes (in `index.css`): `product-frame` (card shell),
`quiz-question-enter` (entrance animation), `quiz-card-correct` / `quiz-card-wrong`
(reveal states), `exam-explanation-in`.

Conventions: rounded pills for CTAs (`rounded-full bg-brand-600 px-6 py-3 …`),
`rounded-2xl` cards, `border border-line bg-white` surfaces, `font-extrabold`
headings. For **marketing/landing** work also follow `skills/frontend-design.md`.

## API client & data

- `src/services/api.ts` → `apiFetch<T>(path, { method, body })`: prefixes
  `VITE_API_BASE_URL` (default `http://localhost:3000`), always
  `credentials: "include"`, JSON in/out, throws `Error(payload.error)` on non-2xx.
- Endpoint wrappers + shared types live in `src/services/quizApi.ts`.
- Query hooks + keys: `src/query/queries.ts` and `src/query/queryKeys.ts`.
  **See [`data-layer-and-caching.md`](data-layer-and-caching.md)** before adding
  queries/mutations or invalidations.

## Markdown & code questions

`src/components/Markdown.tsx` renders question/explanation markdown and highlights
code via PrismJS (`src/utils/prism-loader.ts`, lazily imported). Question and
option text are markdown — always render through `<Markdown content={…} />`, never
as raw text.

## Page inventory (what to edit for what)

| Goal | File |
|------|------|
| Landing / marketing | `pages/Home.tsx`, `components/layout/{Header,Footer}.tsx` |
| Login / signup | `pages/Login.tsx` |
| Join a live quiz (player) | `pages/exam/ShowTheExam.tsx`, `pages/exam/components/ExamPlayer.tsx` |
| Leaderboard / results | `pages/exam/ShowExamLeaderBoard.tsx` |
| Dashboard home ("Quizzes by us", join, demo room) | `pages/dashboard/DashboardHome.tsx` |
| Create a room / question editor | `pages/dashboard/CreateSession.tsx` |
| Lobby (host controls, kick, QR) | `pages/dashboard/SessionLobby.tsx` |
| Solo curated practice | `pages/dashboard/Practice.tsx` |
| Question bank | `pages/dashboard/QuestionBank.tsx` |
| Session analytics report | `pages/dashboard/SessionReport.tsx` |
| Profile | `pages/dashboard/Profile.tsx` |

## Verify

`npm run build` (types + production bundle) and `npm run lint`. The
`react-refresh/only-export-components` errors in `app/router.tsx` are
**pre-existing** (lazy component consts); don't chase them.
