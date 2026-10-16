---
name: quizhub-overview
description: >-
  Architecture, repository layout, environment setup, run/migrate/seed commands,
  and the feature-to-file map for QuizHub (QuizHub — live quiz platform). Use
  when onboarding to the repo, running it locally, or finding where a feature
  lives.
---

# QuizHub — Overview & Setup

QuizHub is a real-time, room-based quiz platform. A host creates a session,
players join by QR/room code (no account required), everyone answers while a live
leaderboard updates over WebSockets, and the host reviews analytics afterward.
There is also a members-only curated **solo practice** library ("Quizzes by us").

## Stack

| Layer | Technology |
|-------|------------|
| Frontend (`frontend/`) | React 19 (React Compiler on), TypeScript, Vite 8, Tailwind CSS 4, TanStack Query 5, React Router 7 |
| Backend (`backend/`) | Node + Express 5 (ESM), TypeScript, Prisma 7 via `@prisma/adapter-pg` |
| Realtime | `ws` WebSocket server on the same HTTP server |
| DB | PostgreSQL |
| Extras | `qrcode.react` + `html5-qrcode` (QR), PrismJS (code highlighting in questions) |

There is **no root `package.json`** — `frontend/` and `backend/` are independent
packages. Use `npm` (lockfiles are npm).

## Runtime topology

- Backend: `http://localhost:3000` (honours `PORT`). Routes are mounted under `/api`.
- Frontend: `http://localhost:5173` (Vite, `--host` for LAN/phone testing).
- The frontend calls the backend via `VITE_API_BASE_URL` (default
  `http://localhost:3000`) with `credentials: "include"` — no Vite proxy.

## Environment

`backend/.env` is **gitignored** and every developer must create it. Minimum:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/quizhub"
# optional but recommended (auth token signing; falls back to "dev-change-me")
AUTH_SIGNING_SECRET="<openssl rand -base64 32>"
```

`backend/.viteenv` **is committed** and holds production values (hosted Neon DB,
`ALLOWED_ORIGINS`, etc.). Do not treat it as your local config, and don't put
secrets you care about in `.env` since it isn't tracked.

> **Critical gotcha — "Failed to create account" / any endpoint 500s:**
> If `DATABASE_URL` is undefined, the `pg` adapter falls back to libpq defaults
> (localhost, DB = your OS username) and Prisma throws
> `P1003: Database "<user>" does not exist`. The register route swallows this into
> `500 {"error":"Failed to create account"}`. Fix: create `backend/.env`. Restart
> the server after adding it (env is read at process start via `dotenv/config`).

Other relevant env: `ALLOWED_ORIGINS` (comma-separated, added to the CORS
allow-list), `NODE_ENV=production` (enables `Secure` cookies).

## Set up & run

```bash
# Backend
cd backend
npm install
# create .env (above)
npx prisma migrate deploy     # apply migrations (use `migrate dev` while authoring)
npx prisma db seed            # seed curated quizzes (also: npm run db:seed)
npm run dev                   # tsx watch → http://localhost:3000

# Frontend
cd frontend
npm install
npm run dev                   # vite → http://localhost:5173
```

Useful commands:

| Where | Command | Does |
|-------|---------|------|
| `backend/` | `npm run dev` | API with hot reload (`tsx watch`) |
| `backend/` | `npm run build` | `prisma generate` + `tsc` → `dist/` |
| `backend/` | `npm run db:seed` | Re-seed curated quizzes (idempotent) |
| `backend/` | `npx prisma migrate deploy` | Apply migrations |
| `frontend/` | `npm run dev` | Vite dev server |
| `frontend/` | `npm run build` | `tsc -b` type-check + production build |
| `frontend/` | `npm run lint` | ESLint |

`backend/` build/Prisma commands need `DATABASE_URL` in the environment
(`prisma.config.ts` resolves it via `env("DATABASE_URL")`).

## Repository layout

```
quizhub/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma            # models + enums
│   │   ├── migrations/              # SQL migrations (apply with migrate deploy)
│   │   └── seed.ts                  # curated "Quizzes by us" content
│   ├── prisma.config.ts             # Prisma config (schema, migrations, seed)
│   ├── openapi.json                 # OpenAPI spec served at /docs/ui
│   └── src/
│       ├── server.ts                # Express app + WebSocket server
│       ├── routes/                  # auth.routes.ts, room.routes.ts
│       ├── services/room.service.ts # answer saving, leaderboard, room cache
│       ├── sockets/roomSocket.ts    # WebSocket room pub/sub
│       ├── middleware/              # request id, logger, security, rate limit, errors
│       ├── utils/                   # auth, scoring, avatar
│       ├── lib/prisma.ts            # PrismaClient + pg adapter
│       └── generated/prisma/        # generated client (gitignored location)
└── frontend/
    └── src/
        ├── app/router.tsx           # routes + lazy pages
        ├── layouts/                 # RootLayout, DashboardLayout, ExamLayout
        ├── pages/                   # Home, About, Login, dashboard/*, exam/*
        ├── components/              # Markdown, layout, auth, dashboard, errors
        ├── query/                   # queryClient, queryKeys, queries (hooks)
        ├── services/                # api.ts (apiFetch), quizApi.ts
        ├── hooks/                   # useTempUser, useTheme
        ├── utils/                   # tempUser, theme, scoring, csv, prism-loader
        └── types/exam.ts            # question types + correctness helper
```

## Feature → file map

| Feature | Where |
|---------|-------|
| Live room lifecycle (create/join/start/end/kick) | `backend/src/routes/room.routes.ts`, `frontend/src/pages/dashboard/{CreateSession,SessionLobby}.tsx` |
| Live gameplay + leaderboard | `backend/src/server.ts` (WS), `frontend/src/pages/exam/{ShowTheExam,ShowExamLeaderBoard}.tsx`, `.../components/ExamPlayer.tsx` |
| Question types & validation | `backend/src/routes/room.routes.ts`, `frontend/src/pages/dashboard/CreateSession.tsx`, `frontend/src/types/exam.ts` |
| Speed-based scoring | `backend/src/utils/scoring.ts`, `frontend/src/utils/scoring.ts` |
| Question bank | `backend/src/routes/room.routes.ts` (`/profiles/:id/questions`, `/questions/:id`), `frontend/src/pages/dashboard/QuestionBank.tsx` |
| Session analytics | `backend/src/routes/room.routes.ts` (`/rooms/:code/analytics`), `frontend/src/pages/dashboard/SessionReport.tsx` |
| Curated solo practice ("Quizzes by us") | `backend/prisma/seed.ts`, `/api/curated-quizzes*` routes, `frontend/src/pages/dashboard/Practice.tsx`, `DashboardHome.tsx` |
| Auth (register/login/me/logout) + guests | `backend/src/routes/auth.routes.ts`, `frontend/src/pages/Login.tsx`, `frontend/src/services/quizApi.ts` |
| Dark mode | `frontend/src/utils/theme.ts`, `hooks/useTheme.ts`, `components/layout/ThemeToggle.tsx`, `index.css`, `index.html` |
| CSV export | `frontend/src/utils/csv.ts`, `pages/exam/ShowExamLeaderBoard.tsx` |
| API docs | `backend/openapi.json` → `http://localhost:3000/docs/ui` |

## Database model (short version)

`User 1—? Profile` · `Profile 1—* Question` (the question bank) ·
`Question 1—* QuestionOption` · `QuizRoom 1—* RoomQuestion` (the ordered question
set, with points) · `QuizRoom 1—* RoomParticipant` ·
`RoomQuestion + RoomParticipant → ParticipantAnswer` (unique per pair) ·
`CuratedQuiz 1—* CuratedQuizQuestion—1 Question` (curated practice sets).

See `backend-guide.md` for details and the migration/seed workflow.

## Verifying changes

1. `cd backend && DATABASE_URL=... npm run build`
2. `cd frontend && npm run build`
3. Manual/API smoke test against a running server. There are throwaway scripts used
   during development at `/tmp/opencode/*.mjs` (e.g. a full register→room→answer
   flow). Prefer writing a small `fetch`-based script over assuming.
