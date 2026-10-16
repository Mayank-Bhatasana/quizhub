---
name: quizhub-skills-index
description: >-
  Entry point for AI agents and new contributors working on QuizHub. Lists the
  project skills, what each one covers, and the fastest path to being productive
  in this repository.
---

# QuizHub — Skills & Docs Index

This folder documents how QuizHub actually works **right now**, so an agent (or a
new human) can make correct changes without re-deriving the architecture. Read
these before editing — several behaviours are non-obvious (auth cookies, the
in-memory caches, the WebSocket protocol, the Prisma env contract).

## Which doc to read

| Doc | Read it when you need to… |
|-----|---------------------------|
| [`quizhub-overview.md`](quizhub-overview.md) | Onboard: run the app, understand the layout, env setup, gotchas, feature→file map. **Start here.** |
| [`data-layer-and-caching.md`](data-layer-and-caching.md) | Touch data fetching/caching: TanStack Query keys & `staleTime`, mutations & invalidation, backend in-memory caches, the WebSocket pub/sub, localStorage caches. |
| [`backend-guide.md`](backend-guide.md) | Change the API: routes, auth, scoring, question types, Prisma schema/migrations/seed, WebSocket server, middleware. |
| [`frontend-guide.md`](frontend-guide.md) | Change the UI: routing, layouts, auth guard, dark mode, design tokens, API client, page inventory. |
| [`frontend-design.md`](frontend-design.md) | Design new marketing/UI surfaces with high aesthetic quality (pre-existing design skill). |

## 60-second quick start

```bash
# 1. Backend deps + env + DB
cd backend
npm install
# create backend/.env  (see quizhub-overview.md → Environment)
npx prisma migrate deploy     # create the schema
npx prisma db seed            # load curated "Quizzes by us"
npm run dev                   # API on http://localhost:3000

# 2. Frontend (new terminal)
cd frontend
npm install
npm run dev                   # UI on http://localhost:5173
```

## Ground rules when editing

- **Match existing patterns** — routes live in `backend/src/routes/*.routes.ts`,
  queries in `frontend/src/query/queries.ts`, pages in `frontend/src/pages/`.
- **Every DB query on the backend needs a working `DATABASE_URL`.** If it is
  missing, `pg` silently falls back to a local database named after your OS user
  and every query fails with Prisma `P1003`. See `quizhub-overview.md`.
- **Verify before you finish:** `backend: npm run build`, `frontend: npm run
  build` (runs `tsc -b` + `vite build`). Pre-existing `react-refresh` lint errors
  in `frontend/src/app/router.tsx` are expected.
- **Scoring has two mirrors** — `backend/src/utils/scoring.ts` and
  `frontend/src/utils/scoring.ts`. Change both together.

> 📎 A short Cursor-flavoured entry point lives at
> [`.cursor/skills/quizhub/SKILL.md`](../.cursor/skills/quizhub/SKILL.md) and
> points back to these docs.
