import crypto from "crypto";
import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import { prisma } from "./lib/prisma.js";
import openapi from "../openapi.json" with { type: "json" };
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
const app = express();

const allowedOrigins = new Set([
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:4173",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "http://127.0.0.1:4173",
  "*",
]);


const isAllowedOrigin = (origin?: string) => {
  if (!origin) return true;
  if (allowedOrigins.has(origin)) return true;
  try {
    const url = new URL(origin);
    const isLocalhost = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    const isHttp = url.protocol === "http:" || url.protocol === "https:";
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
app.use(express.json());



const server = createServer(app);
const wss = new WebSocketServer({ server });
const roomSubscribers = new Map<string, Set<WebSocket>>();

const subscribeToRoom = (code: string, ws: WebSocket) => {
  const roomCode = code.trim().toUpperCase();
  if (!roomCode) return;

  let subscribers = roomSubscribers.get(roomCode);
  if (!subscribers) {
    subscribers = new Set<WebSocket>();
    roomSubscribers.set(roomCode, subscribers);
  }

  subscribers.add(ws);
};

const unsubscribeSocket = (ws: WebSocket) => {
  for (const [roomCode, subscribers] of roomSubscribers.entries()) {
    subscribers.delete(ws);
    if (subscribers.size === 0) {
      roomSubscribers.delete(roomCode);
    }
  }
};

const publishToRoom = (code: string, payload: unknown) => {
  const roomCode = code.trim().toUpperCase();
  if (!roomCode) return;

  const subscribers = roomSubscribers.get(roomCode);
  if (!subscribers || subscribers.size === 0) return;

  const message = JSON.stringify(payload);
  for (const socket of subscribers) {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(message);
    }
  }
};

wss.on("connection", (ws) => {
  ws.on("message", (raw) => {
    let payload: unknown;
    try {
      payload = JSON.parse(String(raw));
    } catch {
      return;
    }

    if (!payload || typeof payload !== "object") {
      return;
    }

    const message = payload as Record<string, unknown>;
    if (message.type !== "subscribe" || typeof message.code !== "string") {
      return;
    }

    subscribeToRoom(message.code, ws);
  });

  ws.on("close", () => {
    unsubscribeSocket(ws);
  });
});
app.get("/health", (req, res) => res.json({ status: "ok" }));

const GUEST_COOKIE_NAME = "quiz_guest";
const ROOM_CODE_LENGTH = 6;

const parseCookies = (cookieHeader?: string) => {
  if (!cookieHeader) return {} as Record<string, string>;
  return cookieHeader.split(";").reduce<Record<string, string>>((acc, part) => {
    const [key, ...rest] = part.trim().split("=");
    if (!key) return acc;
    acc[key] = decodeURIComponent(rest.join("="));
    return acc;
  }, {});
};

const generateGuestToken = () => crypto.randomBytes(32).toString("base64url");

const generateRoomCode = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < ROOM_CODE_LENGTH; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
};

const setGuestCookie = (res: express.Response, token: string) => {
  const isProd = process.env.NODE_ENV === "production";
  const cookie = `${GUEST_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax${isProd ? "; Secure" : ""
    }`;
  res.setHeader("Set-Cookie", cookie);
};

/**
 * GET /
 * Health check endpoint.
 */
app.get("/", (req, res) => {
  res.json({
    message: "Backend working!",
  });
});

/**
 * GET /docs
 * Returns the OpenAPI spec.
 */
app.get("/docs", (req, res) => {
  res.json(openapi);
});

/**
 * GET /docs/ui
 * Swagger UI for the OpenAPI spec.
 */
app.use("/docs/ui", swaggerUi.serve, swaggerUi.setup(openapi));

/**
 * POST /api/guest
 * Creates or restores a guest profile using an httpOnly cookie.
 * Body: { displayName: string }
 */
app.post("/api/guest", async (req, res) => {
  const cookies = parseCookies(req.headers.cookie);
  const existingToken = cookies[GUEST_COOKIE_NAME];

  if (existingToken) {
    const existingProfile = await prisma.profile.findUnique({
      where: { guestToken: existingToken },
    });
    if (existingProfile) {
      return res.json({ profile: existingProfile });
    }
  }

  const displayName =
    typeof req.body?.displayName === "string"
      ? req.body.displayName.trim()
      : "";
  const avatarUrl =
    typeof req.body?.avatarUrl === "string" && req.body.avatarUrl.trim()
      ? req.body.avatarUrl.trim()
      : null;
  if (!displayName) {
    return res.status(400).json({ error: "displayName is required" });
  }

  const guestToken = generateGuestToken();
  const profile = await prisma.profile.create({
    data: {
      username: displayName,
      isTemporary: true,
      guestToken,
      avatarUrl,
    },
  });

  setGuestCookie(res, guestToken);
  return res.json({ profile });
});

/**
 * POST /api/questions
 * Creates a question with options.
 * Body: { createdById: string, text: string, explanation?: string, options: { text: string, isCorrect?: boolean, sortOrder?: number }[] }
 */
app.post("/api/questions", async (req, res) => {
  const { createdById, text, explanation, options } = req.body ?? {};
  if (
    !createdById ||
    typeof text !== "string" ||
    !Array.isArray(options) ||
    options.length === 0
  ) {
    return res
      .status(400)
      .json({ error: "createdById, text, options are required" });
  }

  const normalizedOptions = options.map((option: any, index: number) => ({
    text: String(option.text ?? "").trim(),
    isCorrect: Boolean(option.isCorrect),
    sortOrder: Number.isInteger(option.sortOrder) ? option.sortOrder : index,
  }));

  if (normalizedOptions.some((option) => !option.text)) {
    return res.status(400).json({ error: "option text is required" });
  }

  const question = await prisma.question.create({
    data: {
      createdById,
      text: text.trim(),
      explanation: typeof explanation === "string" ? explanation : null,
      options: {
        create: normalizedOptions,
      },
    },
    include: { options: true },
  });

  return res.json({ question });
});

/**
 * POST /api/rooms
 * Creates a room with ordered questions and points.
 * Body: { hostProfileId: string, questions: { questionId: string, points?: number, orderIndex?: number }[] }
 */
app.post("/api/rooms", async (req, res) => {
  const { hostProfileId, questions } = req.body ?? {};
  if (!hostProfileId || !Array.isArray(questions) || questions.length === 0) {
    return res
      .status(400)
      .json({ error: "hostProfileId and questions are required" });
  }

  let code = generateRoomCode();
  let attempts = 0;
  while (attempts < 5) {
    const existing = await prisma.quizRoom.findUnique({ where: { code } });
    if (!existing) break;
    code = generateRoomCode();
    attempts += 1;
  }

  const room = await prisma.quizRoom.create({
    data: {
      hostId: hostProfileId,
      code,
      participants: {
        create: {
          profileId: hostProfileId,
          displayName: "Host",
          isHost: true,
        },
      },
      questions: {
        create: questions.map((item: any, index: number) => ({
          questionId: item.questionId,
          orderIndex: Number.isInteger(item.orderIndex)
            ? item.orderIndex
            : index,
          points: Number.isInteger(item.points) ? item.points : 1,
        })),
      },
    },
    include: { questions: true, participants: true },
  });

  return res.json({ room });
});

/**
 * POST /api/rooms/:code/join
 * Joins a room with a profile and display name.
 * Body: { profileId: string, displayName: string }
 */
app.post("/api/rooms/:code/join", async (req, res) => {
  const { code } = req.params;
  const { profileId, displayName } = req.body ?? {};
  if (!profileId || typeof displayName !== "string" || !displayName.trim()) {
    return res
      .status(400)
      .json({ error: "profileId and displayName are required" });
  }

  const room = await prisma.quizRoom.findUnique({ where: { code } });
  if (!room) {
    return res.status(404).json({ error: "Room not found" });
  }

  const participant = await prisma.roomParticipant.upsert({
    where: {
      roomId_profileId: {
        roomId: room.id,
        profileId,
      },
    },
    update: {
      displayName: displayName.trim(),
    },
    create: {
      roomId: room.id,
      profileId,
      displayName: displayName.trim(),
      isHost: false,
    },
  });

  return res.json({ roomId: room.id, participant });
});


/**
 * GET /api/rooms/:code/participants
 * Returns all participants in a room.
 */
app.get("/api/rooms/:code/participants", async (req, res) => {
  const { code } = req.params;

  const room = await prisma.quizRoom.findUnique({ where: { code } });
  if (!room) {
    return res.status(404).json({ error: "Room not found" });
  }

  const participants = await prisma.roomParticipant.findMany({
    where: { roomId: room.id },
    orderBy: { joinedAt: "asc" },
    include: {
      profile: {
        select: {
          avatarUrl: true,
        },
      },
    },
  });

  const payload = participants.map((participant) => ({
    id: participant.id,
    profileId: participant.profileId,
    displayName: participant.displayName,
    isHost: participant.isHost,
    joinedAt: participant.joinedAt,
    avatarUrl: participant.profile?.avatarUrl ?? null,
  }));

  return res.json({ participants: payload });
});

/**
 * GET /api/rooms/:code
 * Returns room details and question count.
 */
app.get("/api/rooms/:code", async (req, res) => {
  const { code } = req.params;

  const room = await prisma.quizRoom.findUnique({
    where: { code },
    include: {
      questions: true,
    },
  });

  if (!room) {
    return res.status(404).json({ error: "Room not found" });
  }

  return res.json({
    room: {
      id: room.id,
      code: room.code,
      status: room.status,
      hostId: room.hostId,
      startedAt: room.startedAt,
      questionCount: room.questions.length,
    },
  });
});

/**
 * POST /api/rooms/:code/start
 * Starts the quiz for a room (host only).
 * Body: { profileId: string }
 */
app.post("/api/rooms/:code/start", async (req, res) => {
  const { code } = req.params;
  const { profileId } = req.body ?? {};

  if (!profileId) {
    return res.status(400).json({ error: "profileId is required" });
  }

  const room = await prisma.quizRoom.findUnique({ where: { code } });
  if (!room) {
    return res.status(404).json({ error: "Room not found" });
  }

  if (room.hostId !== profileId) {
    return res.status(403).json({ error: "Only the host can start the quiz" });
  }

  if (room.status !== "LOBBY") {
    return res.status(400).json({ error: "Room is not in LOBBY status" });
  }

  const updated = await prisma.quizRoom.update({
    where: { id: room.id },
    data: {
      status: "LIVE",
      startedAt: new Date(),
    },
  });

  publishToRoom(updated.code, {
    type: "room_started",
    room: {
      code: updated.code,
      status: updated.status,
      startedAt: updated.startedAt,
    },
  });

  return res.json({
    room: {
      id: updated.id,
      code: updated.code,
      status: updated.status,
      hostId: updated.hostId,
      startedAt: updated.startedAt,
    },
  });
});
/**
 * POST /api/rooms/:roomId/answer
 * Submits an answer for a room question.
 * Body: { participantId: string, roomQuestionId: string, selectedOptionId?: string, timeTakenSeconds?: number }
 */
app.post("/api/rooms/:roomId/answer", async (req, res) => {
  const { roomId } = req.params;
  const { participantId, roomQuestionId, selectedOptionId, timeTakenSeconds } =
    req.body ?? {};

  if (!participantId || !roomQuestionId) {
    return res
      .status(400)
      .json({ error: "participantId and roomQuestionId are required" });
  }

  const roomQuestion = await prisma.roomQuestion.findUnique({
    where: { id: roomQuestionId },
  });
  if (!roomQuestion || roomQuestion.roomId !== roomId) {
    return res.status(404).json({ error: "Room question not found" });
  }

  let isCorrect = false;
  if (selectedOptionId) {
    const option = await prisma.questionOption.findFirst({
      where: {
        id: selectedOptionId,
        questionId: roomQuestion.questionId,
      },
    });
    if (!option) {
      return res.status(400).json({ error: "Invalid selected option" });
    }
    isCorrect = option.isCorrect;
  }

  const answer = await prisma.participantAnswer.upsert({
    where: {
      roomQuestionId_participantId: {
        roomQuestionId,
        participantId,
      },
    },
    update: {
      selectedOptionId: selectedOptionId ?? null,
      isCorrect,
      timeTakenSeconds: Number.isInteger(timeTakenSeconds)
        ? timeTakenSeconds
        : null,
    },
    create: {
      roomId,
      roomQuestionId,
      participantId,
      selectedOptionId: selectedOptionId ?? null,
      isCorrect,
      timeTakenSeconds: Number.isInteger(timeTakenSeconds)
        ? timeTakenSeconds
        : null,
    },
  });

  return res.json({ answer });
});

/**
 * GET /api/rooms/:roomId/scoreboard
 * Returns total scores per participant for a room.
 */
app.get("/api/rooms/:roomId/scoreboard", async (req, res) => {
  const { roomId } = req.params;
  const answers = await prisma.participantAnswer.findMany({
    where: { roomId },
    include: {
      roomQuestion: true,
      participant: true,
    },
  });

  const scores = new Map<
    string,
    { participantId: string; displayName: string; score: number }
  >();
  for (const answer of answers) {
    const participantId = answer.participantId;
    const entry = scores.get(participantId) ?? {
      participantId,
      displayName: answer.participant.displayName,
      score: 0,
    };

    if (answer.isCorrect) {
      entry.score += answer.roomQuestion.points;
    }

    scores.set(participantId, entry);
  }

  const scoreboard = Array.from(scores.values()).sort(
    (a, b) => b.score - a.score,
  );
  return res.json({ scoreboard });
});

server.listen(3000, () => {
  console.log("Server running on port 3000");
});
