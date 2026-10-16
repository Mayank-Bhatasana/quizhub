<div align="center">

<img src="https://raw.githubusercontent.com/Mayank-Bhatasana/quizhub/228be8c88e023596b753f3031880bf46ad4fd815/frontend/src/assets/logo.svg" alt="QuizHub logo" width="90" />

# QuizHub

### Host live quizzes. Join with a QR scan. Battle it out on a real-time leaderboard.

[![Stars](https://img.shields.io/github/stars/mayank-bhatasana/quizhub?style=for-the-badge)](https://github.com/mayank-bhatasana/quizhub/stargazers)
[![Issues](https://img.shields.io/github/issues/mayank-bhatasana/quizhub?style=for-the-badge)](https://github.com/mayank-bhatasana/quizhub/issues)
[![Last Commit](https://img.shields.io/github/last-commit/mayank-bhatasana/quizhub?style=for-the-badge)](https://github.com/mayank-bhatasana/quizhub/commits)

![React](https://img.shields.io/badge/React_19-20232A?style=flat-square&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite_8-646CFF?style=flat-square&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Express](https://img.shields.io/badge/Express_5-000000?style=flat-square&logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma_7-2D3748?style=flat-square&logo=prisma&logoColor=white)

[**🚀 Live Demo**](https://quizhubs.pages.dev) · [🐛 Report a Bug](https://github.com/mayank-bhatasana/quizhub/issues) · [✨ Request a Feature](https://github.com/mayank-bhatasana/quizhub/issues)

</div>

<br/>

---

## 📌 Table of Contents

- [About the Project](#-about-the-project)
- [Features](#-features)
- [How a Live Session Works](#-how-a-live-session-works)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [API Documentation](#-api-documentation)
- [Available Scripts](#-available-scripts)
- [Deployment](#-deployment)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [License](#-license)
- [Author](#-author)
- [Developer & AI Docs](skills/README.md)

> 🤖 **Building on QuizHub (human or AI)?** Start with the project docs in
> [`skills/`](skills/README.md) — architecture, the data/caching layer, backend
> and frontend conventions, and local setup.

---

## 🎯 About the Project

**QuizHub** is a real-time quiz platform built for live, room-based play. A host creates a session, players join the lobby by scanning a QR code or entering a room code — no account required — and everyone answers together while a live leaderboard keeps score. When the dust settles, hosts get analytics on how the session went. Alongside live play, a curated **"Quizzes by us"** library lets members practice hand-picked quizzes solo.

Under the hood it's a TypeScript monorepo: an **Express 5 + Prisma + PostgreSQL** API with **WebSocket-powered rooms**, and a **React 19 + Vite + Tailwind CSS 4** frontend with the React Compiler enabled.

---

## ✨ Features

| | |
|---|---|
| 🎮 **Live quiz rooms** | Hosts spin up a session and players join a shared lobby, with gameplay synced in real time over WebSockets |
| 📲 **Join via QR code** | Every session gets a scannable QR code (plus a shareable room code), so players can hop in from their phones in seconds |
| 👤 **Guest mode** | Play instantly as a temporary user, with a gentle prompt to create a full account afterward |
| 🏆 **Real-time leaderboard** | Rankings update live as answers roll in |
| ❓ **Multiple question types** | Single choice, multiple choice, and true/false |
| ⚡ **Speed-based scoring** | Answer faster to earn more points (correct answers are worth 50–100% of the question's value) |
| 🗂️ **Question bank** | Every question you create is saved and can be edited, deleted, and reused in future sessions |
| 🎛️ **Host controls** | Remove players and end a session on the fly, broadcast to everyone instantly |
| 📊 **Session reports** | Per-question difficulty, answer distribution, average response time, and a results summary for hosts |
| 🧩 **Curated practice quizzes** | The *Quizzes by us* library lets signed-in players practice hand-picked quizzes solo, with instant feedback and explanations |
| 🧑‍🎓 **Player analytics** | Track your own scores, accuracy, and ranking over time |
| 📤 **CSV export** | Download a session's results for spreadsheets or grading |
| 📝 **Markdown + syntax highlighting** | Powered by PrismJS, ideal for programming quizzes with code snippets |
| 🌙 **Dark mode** | Light and dark themes with OS preference detection |
| 🔐 **Accounts & cookie auth** | Sign-up/login with secure httpOnly session cookies; every player starts as a guest and can upgrade to a full account |
| 🛡️ **Hardened API** | Rate limiting, security headers, request IDs, structured logging, and centralized error handling |
| 📚 **Self-documenting API** | OpenAPI spec served through Swagger UI |

<br/>

<div align="center">

| 🔴 Live sessions | 🏆 Real-time leaderboard |
|:---:|:---:|
| ![Live sessions](frontend/src/assets/liveImg.png) | ![Leaderboard](frontend/src/assets/leaderBoardImg.png) |
| **📊 Analytics** | **🔗 Easy sharing** |
| ![Analytics](frontend/src/assets/analyticsImg.png) | ![Sharing](frontend/src/assets/shareImg.png) |

</div>

---

## 🎬 How a Live Session Works

```
Create ──▶ Share ──▶ Join ──▶ Play ──▶ Compete ──▶ Review
```

1. **Create** — the host sets up a session from the dashboard
2. **Share** — a room code and QR code are generated for the session
3. **Join** — players scan the QR (or enter the code) and land in the lobby
4. **Play** — the host starts the quiz and questions go live over WebSockets
5. **Compete** — the leaderboard updates in real time as answers come in
6. **Review** — the host checks the analytics to see how everyone did

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19 (React Compiler enabled), TypeScript, Vite 8, Tailwind CSS 4, TanStack Query 5, React Router 7 |
| **Backend** | Node.js, Express 5, TypeScript |
| **Real-time** | WebSockets (`ws`) with dedicated room sockets |
| **Database** | PostgreSQL with Prisma ORM 7 (`@prisma/adapter-pg`) |
| **API Docs** | OpenAPI 3 + Swagger UI |
| **Extras** | QR generation & scanning (`qrcode.react`, `html5-qrcode`), PrismJS code highlighting |

---

## 📂 Project Structure

```
quizhub/
├── backend/                        # Express 5 + TypeScript API
│   ├── prisma/
│   │   ├── schema.prisma           # Models & enums
│   │   ├── migrations/             # SQL migrations
│   │   └── seed.ts                 # Curated "Quizzes by us" content
│   ├── prisma.config.ts            # Prisma config (schema, migrations, seed)
│   ├── openapi.json                # OpenAPI spec (served via Swagger UI)
│   └── src/
│       ├── routes/                 # Auth & room/quiz endpoints
│       ├── services/               # Business logic (answers, leaderboard, room cache)
│       ├── sockets/                # WebSocket room pub/sub
│       ├── middleware/             # Request ID, logger, security headers, rate limiter, error handler
│       ├── utils/                  # Auth & cookies, scoring, avatars
│       ├── lib/prisma.ts           # PrismaClient + pg adapter
│       └── server.ts               # App entry point (HTTP + WebSocket)
│
├── frontend/                       # React 19 + Vite + Tailwind CSS 4 SPA
│   ├── public/                     # Static assets & SPA _redirects
│   └── src/
│       ├── app/                    # Router configuration
│       ├── layouts/                # Root, Dashboard & Exam layouts
│       ├── pages/                  # Home, Login, Dashboard, Exam, Practice...
│       ├── components/             # Auth guard, header/footer, Markdown, theme toggle
│       ├── query/                  # TanStack Query client, keys & hooks
│       ├── services/               # API client (apiFetch) & endpoint wrappers
│       ├── hooks/                  # useTempUser, useTheme
│       ├── utils/                  # Temp user, theme, scoring, CSV
│       └── types/                  # Shared TypeScript types
│
└── skills/                         # AI/agent skills & project docs (see skills/README.md)
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js 20.19+** (or **22.12+**) — required by Vite 8
- **npm**
- **PostgreSQL** — a local instance or a hosted database (Neon, Supabase, Railway…)

### 1. Clone the repository

```bash
git clone https://github.com/mayank-bhatasana/quizhub.git
cd quizhub
```

### 2. Set up the backend

```bash
cd backend
npm install
```

Create a `backend/.env` file (this file is gitignored):

```env
# Required — without this, every database query fails
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/quizhub"

# Optional
# Signs session cookies — generate one with: openssl rand -base64 32
AUTH_SIGNING_SECRET=
# Extra CORS origins, comma-separated
ALLOWED_ORIGINS=
PORT=3000
```

Run the database migrations, seed the curated content, and start the dev server:

```bash
npx prisma migrate dev   # creates the schema
npx prisma db seed       # loads the curated "Quizzes by us" content
npm run dev              # starts the API with hot reload (tsx watch)
```

### 3. Set up the frontend

In a new terminal:

```bash
cd frontend
npm install
npm run dev              # Vite dev server → http://localhost:5173
```

You're live — open **http://localhost:5173** and create your first session 🎉

---

## 📖 API Documentation

The backend ships with an OpenAPI spec (`backend/openapi.json`) rendered through **Swagger UI**. With the backend running, browse the interactive docs at:

```
http://localhost:3000/docs/ui
```

---

## 🧰 Available Scripts

**Backend** (`/backend`)

| Command | Description |
|---|---|
| `npm run dev` | Start the API in watch mode with `tsx` |
| `npm run build` | Generate the Prisma client and compile TypeScript to `dist/` |
| `npm start` | Run the compiled production build |
| `npm run db:seed` | Re-seed the curated "Quizzes by us" content (idempotent) |

**Frontend** (`/frontend`)

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite dev server (`--host` for LAN access — handy for testing QR joins on your phone) |
| `npm run build` | Type-check and create a production build |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Lint the codebase with ESLint |

---

## ☁️ Deployment

- **Frontend** — SPA-ready for **CloudFlare**
- **Backend** — build with `npm run build`, run with `npm start` on your host of choice e.g.: **Render**

---

## 🗺️ Roadmap

- [x] More question types (true/false, multi-select)
- [x] Question bank (save, edit, and reuse questions)
- [x] Dark mode
- [x] Host live controls (kick players, end a session)
- [x] Session reports & CSV export
- [x] Curated practice quizzes ("Quizzes by us")
- [ ] Image-based questions
- [ ] Question bank import/export (CSV / JSON)
- [ ] Automated test suite
- [ ] Docker Compose for one-command local setup

See the [open issues](https://github.com/mayank-bhatasana/quizhub/issues) for a full list of proposed features and known bugs.

---

## 🤝 Contributing

Contributions are what make the open-source community amazing — any you make are **greatly appreciated**!

1. **Fork** the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. **Commit** your changes (`git commit -m 'Add some AmazingFeature'`)
4. **Push** to the branch (`git push origin feature/AmazingFeature`)
5. Open a **Pull Request**

---

## 📄 License

Licensed under the **ISC License**.

---

## 👤 Author

**Mayank Bhatasana** — [@mayank-bhatasana](https://github.com/mayank-bhatasana)

---

<div align="center">

⭐ **If QuizHub saved your trivia night, give it a star!**

Made with ❤️ by Mayank Bhatasana

</div>
