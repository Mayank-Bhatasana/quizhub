---
name: quizhub-backend-guide
description: >-
  Backend conventions for QuizHub: Express route files, cookie auth and
  requireAuth, validation, speed-based scoring, Prisma schema + migration + seed
  workflow, middleware order, and the WebSocket server. Use when adding or
  changing API endpoints, the database, auth, or server-side game logic.
---

# QuizHub — Backend Guide

Entry point: `backend/src/server.ts` (Express 5, ESM). Data access via
`backend/src/lib/prisma.ts`. All routes are mounted under `/api`.

## Adding an endpoint

1. Pick the file: auth/user stuff → `src/routes/auth.routes.ts`; everything
   quiz-related (questions, rooms, bank, analytics, curated) →
   `src/routes/room.routes.ts`.
2. `const router: Router = Router();` already exists — add `router.<verb>(...)`.
3. Return JSON; mirror the existing error shape `{ error: "..." }`.
4. Wrap DB work in `try/catch` and return a `500` with a short message (log the
   real error server-side, never leak it).
5. Document the path in `backend/openapi.json` (served at `/docs/ui`).

### Existing endpoints (all relative to `/api`)

Auth: `POST /auth/register`, `POST /auth/login`, `GET /auth/me`, `POST /auth/logout`, `POST /guest`.

Questions / bank: `POST /questions`, `GET /profiles/:profileId/questions`, `PATCH /questions/:id`, `DELETE /questions/:id` (soft delete).

Rooms: `POST /rooms`, `POST /rooms/:code/join`, `GET /rooms/:code/participants`, `GET /rooms/:code`, `POST /rooms/:code/start`, `GET /room/:code/questions`, `POST /rooms/:roomId/answer`, `GET /rooms/:roomId/scoreboard`, `POST /rooms/:code/kick`, `POST /rooms/:code/end`, `GET /rooms/:code/analytics`.

Curated practice: `GET /curated-quizzes` (public), `GET /curated-quizzes/:slug` (**requires auth**).

Analytics: `GET /analytics/:profileId`.

Utility (root, not `/api`): `GET /health`, `GET /`, `GET /docs` (spec), `/docs/ui` (Swagger).

## Auth & sessions — `src/utils/auth.ts`

- **Token**: HMAC-SHA256 over a base64url JSON payload (`userId`, `profileId`,
  `email`, `exp`), stored in the httpOnly cookie **`quiz_auth`** (7-day TTL,
  `SameSite=Lax`, `Secure` only when `NODE_ENV=production`). Secret:
  `AUTH_SIGNING_SECRET` (falls back to `"dev-change-me"`).
- **Passwords**: custom `scrypt` format `scrypt$<salt>$<digest>` via
  `hashPassword` / `verifyPassword`. No external auth library.
- **Guests**: `POST /guest` issues a `quiz_guest` cookie tied to a `Profile.guestToken`.
- **Middleware**: `requireAuth` verifies the cookie and sets
  `req.user = { userId, profileId, email }` (typed by `AuthenticatedRequest`).
  Use it to protect a route: `router.get(path, requireAuth, async (req: AuthenticatedRequest, res) => ...)`.
- **Rate limiting**: `checkAuthRateLimit(req, "login"|"register", max)` — in-memory,
  per-IP. Don't bypass it on new auth endpoints.

## Question types & validation — `src/routes/room.routes.ts`

`QuestionType = "SINGLE" | "MULTIPLE" | "TRUE_FALSE"`. `normalizeQuestionType()`
defaults unknown values to `SINGLE`. `validateQuestionInput()` enforces:

- at least one option, every option has text;
- `TRUE_FALSE` → **exactly 2** options;
- `MULTIPLE` → **≥1** correct;
- `SINGLE` / `TRUE_FALSE` → **exactly 1** correct.

Correctness is computed from the stored options, not the request. For
**multi-select, a response is correct only if the selected set *exactly* equals
the correct set** (no extras, no omissions) — see `saveAnswer` in
`src/services/room.service.ts`.

## Scoring — `src/utils/scoring.ts`

`computeAnswerPoints(points, isCorrect, timeTakenSeconds?)`:

- incorrect → `0`;
- correct → `points * 100` (the `BASE_POINT_MULTIPLIER`), scaled linearly from
  **1.0× (instant) down to 0.5× at `SPEED_WINDOW_SECONDS = 30s`**, then floored at 0.5×.

The frontend mirrors this in `frontend/src/utils/scoring.ts` for instant UI —
**change both files together.** The leaderboard sorts by score desc, then fastest
total time asc.

## Prisma workflow

- Client: `prisma.config.ts` supplies `DATABASE_URL` via `env("DATABASE_URL")`;
  `schema.prisma` has **no** `url` in `datasource` and generates the client to
  `backend/src/generated/prisma` (gitignored). `lib/prisma.ts` wraps it with
  `PrismaPg`.
- **Schema change**: edit `prisma/schema.prisma`, then create a migration
  (`npx prisma migrate dev --name <name>`, or add a SQL folder under
  `prisma/migrations/<timestamp>_<name>/` by hand and `npx prisma migrate deploy`),
  then `npx prisma generate`.
- **Seed**: `prisma/seed.ts` (run via `npx prisma db seed` / `npm run db:seed`;
  configured under `migrations.seed` in `prisma.config.ts`). It is **idempotent**:
  it upserts a system profile (`QuizHub`) and wipes/recreates all `CuratedQuiz`
  rows and that profile's questions. If you change curated content, edit
  `CURATED_QUIZZES` there and re-seed.
- Models: `User`, `Profile`, `Question`, `QuestionOption`, `QuizRoom`,
  `RoomQuestion`, `RoomParticipant`, `ParticipantAnswer`, `CuratedQuiz`,
  `CuratedQuizQuestion`. `CuratedQuizQuestion` mirrors `RoomQuestion`
  (order + points join to a `Question`).
- Answers use `upsert` keyed on `(roomQuestionId, participantId)` — **last write
  wins; this is intentional**, don't "fix" it.

## WebSocket server — `src/server.ts` + `src/sockets/roomSocket.ts`

Created on the same HTTP server (`WebSocketServer({ server })`). Message types and
the pub/sub cache are documented in
[`data-layer-and-caching.md`](data-layer-and-caching.md). Key rule: DB access for
answer submission goes through `saveAnswer` + `markRoomDirty`; don't write ad-hoc
broadcasts.

## Middleware order — `src/middleware/`

Applied in this order in `server.ts` (order matters):

1. `requestIdMiddleware` → `X-Request-ID`
2. `requestLogger` (coloured access log)
3. `securityHeaders` (CSP-ish header hardening)
4. CORS (allow-list: localhost origins + `ALLOWED_ORIGINS`)
5. `express.json({ limit: "1mb" })`
6. `rateLimiter(60_000, 120)` — global
7. routes (`/api`)
8. `notFoundHandler`, then `errorHandler` (4-arg, must be last)

Add new global middleware **before routes**; add error-shaping only in
`errorHandler`.
