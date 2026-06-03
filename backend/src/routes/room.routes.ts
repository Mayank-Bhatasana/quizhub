import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import {
  getActiveRoom,
  computeLeaderboard,
  saveAnswer,
  markRoomDirty,
} from "../services/room.service.js";
import { publishToRoom } from "../sockets/roomSocket.js";
import { generateRoomCode } from "../utils/auth.js";

const router: Router = Router();

/**
 * POST /api/questions
 * Creates a question with options.
 */
router.post("/questions", async (req, res) => {
  const { createdById, text, explanation, options } = req.body ?? {};
  if (
    !createdById ||
    typeof text !== "string" ||
    !Array.isArray(options) ||
    options.length === 0
  ) {
    res.status(400).json({ error: "createdById, text, options are required" });
    return;
  }

  const normalizedOptions = options.map((option: any, index: number) => ({
    text: String(option.text ?? "").trim(),
    isCorrect: Boolean(option.isCorrect),
    sortOrder: Number.isInteger(option.sortOrder) ? option.sortOrder : index,
  }));

  if (normalizedOptions.some((option) => !option.text)) {
    res.status(400).json({ error: "option text is required" });
    return;
  }

  try {
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

    res.json({ question });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to create question" });
  }
});

/**
 * POST /api/rooms
 * Creates a room with ordered questions and points.
 */
router.post("/rooms", async (req, res) => {
  const { hostProfileId, questions } = req.body ?? {};
  if (!hostProfileId || !Array.isArray(questions) || questions.length === 0) {
    res.status(400).json({ error: "hostProfileId and questions are required" });
    return;
  }

  let code = generateRoomCode();
  let attempts = 0;
  while (attempts < 5) {
    const existing = await prisma.quizRoom.findUnique({ where: { code } });
    if (!existing) break;
    code = generateRoomCode();
    attempts += 1;
  }

  try {
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
            orderIndex: Number.isInteger(item.orderIndex) ? item.orderIndex : index,
            points: Number.isInteger(item.points) ? item.points : 1,
          })),
        },
      },
      include: { questions: true, participants: true },
    });

    res.json({ room });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to create room" });
  }
});

/**
 * POST /api/rooms/:code/join
 * Joins a room with a profile and display name.
 */
router.post("/rooms/:code/join", async (req, res) => {
  const { code } = req.params;
  const { profileId, displayName } = req.body ?? {};
  if (!profileId || typeof displayName !== "string" || !displayName.trim()) {
    res.status(400).json({ error: "profileId and displayName are required" });
    return;
  }

  const room = await getActiveRoom(code);
  if (!room) {
    res.status(404).json({ error: "Room not found" });
    return;
  }

  if (room.status !== "LOBBY") {
    res.status(409).json({ error: "Quiz has already started" });
    return;
  }

  try {
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

    // Broadcast updated participant list to all WS subscribers of this room
    const allParticipants = await prisma.roomParticipant.findMany({
      where: { roomId: room.id },
      orderBy: { joinedAt: "asc" },
      include: { profile: { select: { avatarUrl: true } } },
    });
    publishToRoom(room.code, {
      type: "participants_updated",
      participants: allParticipants.map((p) => ({
        id: p.id,
        profileId: p.profileId,
        displayName: p.displayName,
        isHost: p.isHost,
        joinedAt: p.joinedAt,
        avatarUrl: p.profile?.avatarUrl ?? null,
      })),
    });

    res.json({ roomId: room.id, participant });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to join room" });
  }
});

/**
 * GET /api/rooms/:code/participants
 * Returns all participants in a room.
 */
router.get("/rooms/:code/participants", async (req, res) => {
  const { code } = req.params;

  const room = await getActiveRoom(code);
  if (!room) {
    res.status(404).json({ error: "Room not found" });
    return;
  }

  try {
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

    res.json({ participants: payload });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to get participants" });
  }
});

/**
 * GET /api/rooms/:code
 * Returns room details and question count.
 */
router.get("/rooms/:code", async (req, res) => {
  const { code } = req.params;

  const room = await getActiveRoom(code);
  if (!room) {
    res.status(404).json({ error: "Room not found" });
    return;
  }

  try {
    const questionCount = await prisma.roomQuestion.count({
      where: { roomId: room.id },
    });

    res.json({
      room: {
        id: room.id,
        code: room.code,
        status: room.status,
        hostId: room.hostId,
        startedAt: room.startedAt,
        questionCount: questionCount,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to get room details" });
  }
});

/**
 * POST /api/rooms/:code/start
 * Starts the quiz for a room (host only).
 */
router.post("/rooms/:code/start", async (req, res) => {
  const { code } = req.params;
  const { profileId, durationSeconds } = req.body ?? {};

  if (!profileId) {
    res.status(400).json({ error: "profileId is required" });
    return;
  }

  const room = await prisma.quizRoom.findUnique({
    where: { code: code.toUpperCase() },
    include: { questions: true },
  });
  if (!room) {
    res.status(404).json({ error: "Room not found" });
    return;
  }

  if (room.hostId !== profileId) {
    res.status(403).json({ error: "Only the host can start the quiz" });
    return;
  }

  if (room.status !== "LOBBY") {
    res.status(400).json({ error: "Room is not in LOBBY status" });
    return;
  }

  try {
    const numQuestions = room.questions.length;
    const minDuration = numQuestions * 20;
    const defaultDuration = numQuestions * 20 * 2;

    let finalDuration = defaultDuration;
    if (typeof durationSeconds === "number" && durationSeconds > 0) {
      finalDuration = Math.max(minDuration, durationSeconds);
    }

    const startedAt = new Date();
    const endedAt = new Date(startedAt.getTime() + finalDuration * 1000);

    const updated = await prisma.quizRoom.update({
      where: { id: room.id },
      data: {
        status: "LIVE",
        startedAt,
        endedAt,
      },
    });

    publishToRoom(updated.code, {
      type: "room_started",
      room: {
        code: updated.code,
        status: updated.status,
        startedAt: updated.startedAt,
        endedAt: updated.endedAt,
      },
    });

    res.json({
      room: {
        id: updated.id,
        code: updated.code,
        status: updated.status,
        hostId: updated.hostId,
        startedAt: updated.startedAt,
        endedAt: updated.endedAt,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to start room" });
  }
});

/**
 * GET /api/room/:code/questions
 * Returns ordered room questions with options.
 */
router.get("/room/:code/questions", async (req, res) => {
  const { code } = req.params;

  const activeRoom = await getActiveRoom(code);
  if (!activeRoom) {
    res.status(404).json({ error: "Room not found" });
    return;
  }

  try {
    const room = await prisma.quizRoom.findUnique({
      where: { id: activeRoom.id },
      include: {
        questions: {
          orderBy: { orderIndex: "asc" },
          include: {
            question: {
              include: {
                options: {
                  orderBy: { sortOrder: "asc" },
                },
              },
            },
          },
        },
      },
    });

    if (!room) {
      res.status(404).json({ error: "Room not found" });
      return;
    }

    const questions = room.questions.map((roomQuestion) => ({
      id: roomQuestion.question.id,
      roomQuestionId: roomQuestion.id,
      text: roomQuestion.question.text,
      points: roomQuestion.points,
      explanation: roomQuestion.question.explanation ?? undefined,
      options: roomQuestion.question.options.map((option) => ({
        id: option.id,
        text: option.text,
        isCorrect: option.isCorrect,
      })),
    }));

    res.json({ questions });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to get questions" });
  }
});

/**
 * POST /api/rooms/:roomId/answer
 * Submits an answer for a room question.
 */
router.post("/rooms/:roomId/answer", async (req, res) => {
  const { roomId } = req.params;
  const { participantId, roomQuestionId, selectedOptionId, timeTakenSeconds } =
    req.body ?? {};

  if (!participantId || !roomQuestionId) {
    res.status(400).json({ error: "participantId and roomQuestionId are required" });
    return;
  }

  try {
    const room = await prisma.quizRoom.findUnique({
      where: { id: roomId },
    });
    if (!room) {
      res.status(404).json({ error: "Room not found" });
      return;
    }

    const answer = await saveAnswer({
      roomId,
      participantId,
      roomQuestionId,
      selectedOptionId,
      timeTakenSeconds,
    });

    markRoomDirty(room.code);
    res.json({ answer });
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Failed to submit answer" });
  }
});

/**
 * GET /api/rooms/:roomId/scoreboard
 * Returns total scores per participant for a room.
 */
router.get("/rooms/:roomId/scoreboard", async (req, res) => {
  const { roomId } = req.params;
  try {
    const scoreboard = await computeLeaderboard(roomId);
    res.json({ scoreboard });
  } catch (error: any) {
    console.error("Scoreboard fetch error:", error);
    res.status(500).json({ error: "Failed to load scoreboard" });
  }
});

/**
 * GET /api/analytics/:profileId
 * Returns aggregated quiz analytics for a given profile.
 */
router.get("/analytics/:profileId", async (req, res) => {
  const { profileId } = req.params;

  try {
    // All participation records for this profile (excluding hosted rooms)
    const participations = await prisma.roomParticipant.findMany({
      where: { profileId, isHost: false },
      include: {
        room: {
          select: {
            id: true,
            code: true,
            status: true,
            startedAt: true,
            endedAt: true,
          },
        },
        answers: {
          include: {
            roomQuestion: {
              select: { points: true },
            },
          },
        },
      },
      orderBy: { joinedAt: "desc" },
    });

    const totalSessions = participations.length;

    let totalAnswered = 0;
    let totalCorrect = 0;
    let totalTimeSec = 0;
    let totalScore = 0;
    let bestScore = 0;

    const recentSessions = await Promise.all(
      participations.slice(0, 10).map(async (p) => {
        const correct = p.answers.filter((a) => a.isCorrect).length;
        const answered = p.answers.length;
        const score = p.answers.reduce(
          (sum, a) => sum + (a.isCorrect ? a.roomQuestion.points * 100 : 0),
          0
        );
        const timeSec = p.answers.reduce(
          (sum, a) => sum + (a.timeTakenSeconds ?? 0),
          0
        );

        // Get total question count for this room
        const totalQs = await prisma.roomQuestion.count({
          where: { roomId: p.room.id },
        });

        // Get rank in this room
        const scoreboard = await prisma.roomParticipant.findMany({
          where: { roomId: p.room.id, isHost: false },
          include: {
            answers: {
              include: { roomQuestion: { select: { points: true } } },
            },
          },
        });

        const scores = scoreboard
          .map((sp) => ({
            profileId: sp.profileId,
            score: sp.answers.reduce(
              (sum, a) => sum + (a.isCorrect ? a.roomQuestion.points * 100 : 0),
              0
            ),
            time: sp.answers.reduce(
              (sum, a) => sum + (a.timeTakenSeconds ?? 0),
              0
            ),
          }))
          .sort((a, b) => b.score - a.score || a.time - b.time);

        const rank = scores.findIndex((s) => s.profileId === profileId) + 1;

        return {
          roomCode: p.room.code,
          roomId: p.room.id,
          status: p.room.status,
          playedAt: p.room.startedAt ?? p.joinedAt,
          correct,
          total: totalQs,
          answered,
          score,
          accuracy: totalQs > 0 ? Math.round((correct / totalQs) * 100) : 0,
          timeSec,
          rank,
          totalParticipants: scoreboard.length,
        };
      })
    );

    // Aggregate all participations (not just recent 10)
    for (const p of participations) {
      const correct = p.answers.filter((a) => a.isCorrect).length;
      const score = p.answers.reduce(
        (sum, a) => sum + (a.isCorrect ? a.roomQuestion.points * 100 : 0),
        0
      );
      const timeSec = p.answers.reduce(
        (sum, a) => sum + (a.timeTakenSeconds ?? 0),
        0
      );
      totalCorrect += correct;
      totalAnswered += p.answers.length;
      totalTimeSec += timeSec;
      totalScore += score;
      if (score > bestScore) bestScore = score;
    }

    const overallAccuracy =
      totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;
    const avgTimeSec =
      totalAnswered > 0 ? Math.round(totalTimeSec / totalAnswered) : 0;

    res.json({
      analytics: {
        totalSessions,
        totalCorrect,
        totalAnswered,
        overallAccuracy,
        bestScore,
        totalScore,
        avgTimeSec,
        recentSessions,
      },
    });
  } catch (error: any) {
    console.error("Analytics fetch error:", error);
    res.status(500).json({ error: "Failed to load analytics" });
  }
});

export default router;

