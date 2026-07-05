<div align="center">

<img src="https://raw.githubusercontent.com/Mayank-Bhatasana/quizhub/228be8c88e023596b753f3031880bf46ad4fd815/frontend/src/assets/logo.svg" alt="QuizHub logo" width="90" />

# QuizHub

### Host live quizzes. Join with a QR scan. Battle it out on a real-time leaderboard.

![Top Language](https://img.shields.io/github/languages/top/mayank-bhatasana/quizhub?style=for-the-badge)
![Stars](https://img.shields.io/github/stars/mayank-bhatasana/quizhub?style=for-the-badge)
![Issues](https://img.shields.io/github/issues/mayank-bhatasana/quizhub?style=for-the-badge)
![Last Commit](https://img.shields.io/github/last-commit/mayank-bhatasana/quizhub?style=for-the-badge)

![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite_8-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Express](https://img.shields.io/badge/Express_5-000000?style=for-the-badge&logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma_7-2D3748?style=for-the-badge&logo=prisma&logoColor=white)

[**🚀 Live Demo**](https://quizhubs.pages.dev) · [🐛 Report a Bug](https://github.com/mayank-bhatasana/quizhub/issues) · [✨ Request a Feature](https://github.com/mayank-bhatasana/quizhub/issues)

<br/>

![QuizHub hero](https://raw.githubusercontent.com/Mayank-Bhatasana/quizhub/228be8c88e023596b753f3031880bf46ad4fd815/frontend/src/assets/logo.svg)

</div>

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

---

## 🎯 About the Project

**QuizHub** is a real-time quiz platform built for live, room-based play. A host creates a session, players join the lobby by scanning a QR code or entering a room code — no account required — and everyone answers together while a live leaderboard keeps score. When the dust settles, hosts get analytics on how the session went.

Under the hood it's a TypeScript monorepo: an **Express 5 + Prisma + PostgreSQL** API with **WebSocket-powered rooms**, and a **React 19 + Vite + Tailwind CSS 4** frontend with the React Compiler enabled.

---

## ✨ Features

- 🎮 **Live quiz rooms** — hosts spin up a session and players join a shared lobby, with gameplay synced in real time over WebSockets
- 📲 **Join via QR code** — every session gets a scannable QR code (plus a shareable room code), so players can hop in from their phones in seconds
- 👤 **Guest mode** — play instantly as a temporary user, with a gentle prompt to create a full account afterward
- 🏆 **Real-time leaderboard** — rankings update live as answers roll in
- 📊 **Session analytics** — hosts get a post-session breakdown of performance
- 📝 **Markdown questions with syntax highlighting** — powered by PrismJS, ideal for programming quizzes with code snippets
- 🔐 **Authentication & protected routes** — dashboard pages are gated behind auth
- 🛡️ **Hardened API** — rate limiting, security headers, request IDs, structured logging, and centralized error handling out of the box
- 📚 **Self-documenting API** — OpenAPI spec served through Swagger UI

<!-- TODO: Replace these illustration assets with real app screenshots when you have them -->

| 🔴 Live sessions | 🏆 Real-time leaderboard |
|---|---|
| ![Live sessions](frontend/src/assets/liveImg.png) | ![Leaderboard](frontend/src/assets/leaderBoardImg.png) |
| **📊 Analytics** | **🔗 Easy sharing** |
| ![Analytics](frontend/src/assets/analyticsImg.png) | ![Sharing](frontend/src/assets/shareImg.png) |

---

## 🎬 How a Live Session Works

1. **Create** — the host sets up a session from the dashboard
2. **Share** — a room code and QR code are generated for the session
3. **Join** — players scan the QR (or enter the code) and land in the lobby, as guests or logged-in users
4. **Play** — the host starts the quiz and questions go live to everyone over WebSockets
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
├── backend/                  # Express 5 + TypeScript API
│   ├── prisma/               # Prisma schema & migrations (PostgreSQL)
│   ├── openapi.json          # OpenAPI spec (served via Swagger UI)
│   └── src/
│       ├── controllers/      # Request handlers
│       ├── middleware/       # Logger, rate limiter, security headers, request ID, error handler
│       ├── routes/           # auth, room & user endpoints
│       ├── services/         # Business logic (rooms/sessions)
│       ├── sockets/          # WebSocket handling for live rooms
│       ├── utils/            # Auth & avatar helpers
│       └── server.ts         # App entry point
│
├── frontend/                 # React 19 + Vite + Tailwind CSS 4 SPA
│   ├── public/               # Static assets & Netlify _redirects
│   └── src/
│       ├── app/              # Router configuration
│       ├── components/       # Auth guard, layouts, error boundaries, Markdown renderer
│       ├── hooks/            # e.g. useTempUser (guest mode)
│       ├── layouts/          # Root, Dashboard & Exam layouts
│       ├── pages/            # Home, Login, Dashboard, Exam player, Leaderboard...
│       ├── query/            # TanStack Query client, keys & queries
│       ├── services/         # API clients
│       └── types/            # Shared TypeScript types
│
└── skills/                   # Design guidelines
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js 20+** (LTS recommended)
- **npm**
- **PostgreSQL** — a local instance or a hosted database (Neon, Supabase, Railway...)

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

Create a `backend/.env` file:

```env
ALLOWED_ORIGINS=https://DOMAIN/
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/quizhub"
JWT_SECRET=use openssl rand -base64 32
PORT=3000
```

Run the database migrations and start the dev server:

```bash
npx prisma migrate dev   # creates the schema
npm run dev              # starts the API with hot reload (tsx watch)
```

### 3. Set up the frontend

In a new terminal:

```bash
cd frontend
npm install
```


```bash
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

<!-- TODO: Edit to match your actual plans -->

- [ ] More question types (true/false, multi-select, image-based)
- [ ] Question bank import/export
- [ ] Automated test suite
- [ ] Docker Compose for one-command local setup
- [ ] Dark mode

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

Licensed under the **ISC License**. <!-- TODO: add a LICENSE file at the repo root to make this official -->

---

## 👤 Author

**Mayank Bhatasana**

- GitHub: [@mayank-bhatasana](https://github.com/mayank-bhatasana)
<!-- TODO: Add LinkedIn / portfolio / email if you'd like -->

---

<div align="center">

### ⭐ If QuizHub saved your trivia night, give it a star!

Made with ❤️ by Mayank Bhatasana

</div>
