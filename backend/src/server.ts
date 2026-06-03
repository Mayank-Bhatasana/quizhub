import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import openapi from "../openapi.json" with { type: "json" };

import { subscribeToRoom, unsubscribeSocket } from "./sockets/roomSocket.js";
import { getActiveRoom, saveAnswer, markRoomDirty } from "./services/room.service.js";
import authRoutes from "./routes/auth.routes.js";
import roomRoutes from "./routes/room.routes.js";

import {
  requestIdMiddleware,
  requestLogger,
  securityHeaders,
  rateLimiter,
  notFoundHandler,
  errorHandler,
} from "./middleware/index.js";

const app = express();

// ── 1. Trust proxy (needed for correct req.ip behind reverse proxies) ────────
app.set("trust proxy", 1);

// ── 2. Early middleware (applied before everything) ──────────────────────────
app.use(requestIdMiddleware);   // unique X-Request-ID on every request
app.use(requestLogger);         // colorised request / response log
app.use(securityHeaders);       // harden HTTP headers

// ── 3. CORS ──────────────────────────────────────────────────────────────────
const allowedOrigins = new Set([
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:4173",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "http://127.0.0.1:4173",
]);

const isAllowedOrigin = (origin?: string) => {
  if (!origin) return true;
  if (allowedOrigins.has(origin)) return true;
  try {
    const url = new URL(origin);
    const isLocalhost =
      url.hostname === "localhost" || url.hostname === "127.0.0.1";
    const isHttp =
      url.protocol === "http:" || url.protocol === "https:";
    return isLocalhost && isHttp;
  } catch {
    return false;
  }
};

app.use(
  cors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);

// ── 4. Body parsing ───────────────────────────────────────────────────────────
app.use(express.json({ limit: "1mb" }));

// ── 5. General rate limiter (120 req / min per IP) ───────────────────────────
app.use(rateLimiter(60_000, 120));

// ── 6. Routes ─────────────────────────────────────────────────────────────────
app.use("/api", authRoutes);
app.use("/api", roomRoutes);

// ── 7. Utility endpoints ──────────────────────────────────────────────────────
app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.get("/", (_req, res) => res.json({ message: "Backend working!" }));

// ── 8. Docs ───────────────────────────────────────────────────────────────────
app.get("/docs", (_req, res) => res.json(openapi));
app.use("/docs/ui", swaggerUi.serve, swaggerUi.setup(openapi));

// ── 9. 404 catch-all (must be after all routes) ───────────────────────────────
app.use(notFoundHandler);

// ── 10. Global error handler (must be last, 4 params) ─────────────────────────
app.use(errorHandler);

// ── WebSocket Server ──────────────────────────────────────────────────────────
const server = createServer(app);
const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  ws.on("message", async (raw) => {
    let payload: any;
    try {
      payload = JSON.parse(String(raw));
    } catch {
      return;
    }

    if (!payload || typeof payload !== "object") return;

    if (payload.type === "subscribe" && typeof payload.code === "string") {
      subscribeToRoom(payload.code, ws);
    } else if (payload.type === "submit_answer") {
      const {
        code,
        participantId,
        roomQuestionId,
        selectedOptionId,
        timeTakenSeconds,
      } = payload;

      if (!code || !participantId || !roomQuestionId) return;

      try {
        const room = await getActiveRoom(code);
        if (!room || room.status !== "LIVE") return;

        await saveAnswer({
          roomId: room.id,
          participantId,
          roomQuestionId,
          selectedOptionId,
          timeTakenSeconds,
        });

        markRoomDirty(code);
      } catch (err) {
        console.error("WS submit_answer error:", err);
      }
    }
  });

  ws.on("close", () => unsubscribeSocket(ws));
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = Number(process.env.PORT ?? 3000);
server.listen(PORT, () => {
  console.log(`\x1b[32m✓\x1b[0m Server running on \x1b[36mhttp://localhost:${PORT}\x1b[0m`);
  console.log(`\x1b[32m✓\x1b[0m Swagger UI at  \x1b[36mhttp://localhost:${PORT}/docs/ui\x1b[0m`);
});
