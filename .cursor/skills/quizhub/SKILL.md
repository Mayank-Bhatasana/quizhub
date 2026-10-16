---
name: quizhub
description: >-
  Develop and extend QuizHub — a React 19 + Vite + Tailwind CSS 4 frontend and an
  Express 5 + Prisma + PostgreSQL backend with WebSocket-powered live quiz rooms.
  Use when working anywhere in this repository: features, API routes, database /
  Prisma changes, realtime rooms, auth, theming, or UI.
---

# QuizHub (agent skill)

QuizHub is a real-time, room-based quiz platform with a members-only curated
solo-practice library ("Quizzes by us"). It's a two-package repo — `frontend/`
(React 19, Vite 8, Tailwind 4, TanStack Query 5, React Router 7, React Compiler)
and `backend/` (Express 5 ESM, Prisma 7 via `@prisma/adapter-pg`, `ws`). There is
**no root `package.json`**; use `npm`.

> 📚 The full, current documentation lives in [`skills/`](../../../skills/README.md).
> Read that first — this file is just a pointer plus the essentials.

## Read next

- **Overview & setup** (architecture, env, migrate/seed, gotchas) → [`skills/quizhub-overview.md`](../../../skills/quizhub-overview.md)
- **Data layer & caching** (TanStack Query keys/staleTime, backend in-memory caches, WebSocket protocol, localStorage) → [`skills/data-layer-and-caching.md`](../../../skills/data-layer-and-caching.md)
- **Backend guide** (routes, auth, scoring, Prisma) → [`skills/backend-guide.md`](../../../skills/backend-guide.md)
- **Frontend guide** (routing, auth guard, dark mode, tokens) → [`skills/frontend-guide.md`](../../../skills/frontend-guide.md)
- **Design skill** (marketing/UI aesthetics) → [`skills/frontend-design.md`](../../../skills/frontend-design.md)

## Essentials

- **Run**: `cd backend && npm run dev` (API `:3000`); `cd frontend && npm run dev` (UI `:5173`).
- **Env**: the backend needs a gitignored `backend/.env` with `DATABASE_URL`.
  Without it, `pg` falls back to a database named after your OS user and every DB
  call fails with Prisma `P1003` (surfaced to users as a generic `500`).
- **Set up the DB**: `npx prisma migrate deploy && npx prisma db seed`.
- **Verify before finishing**: backend `npm run build`; frontend `npm run build`
  (runs `tsc -b`); `npm run lint`. The `react-refresh` errors in
  `frontend/src/app/router.tsx` are pre-existing.
- **Scoring is mirrored** in `backend/src/utils/scoring.ts` and
  `frontend/src/utils/scoring.ts` — change both together.
- **Multi-select correctness** = the selected set must *exactly* equal the correct
  set (no extras, no omissions).
- **Auth**: httpOnly `quiz_auth` cookie (HMAC token); the dashboard is
  guest-friendly, and only `dashboard/practice/:slug` sits behind `RequireAuth`.
- **Realtime**: answers are submitted over WebSockets; the leaderboard is recomputed
  on a ~1s dirty-room flush, not per answer.
