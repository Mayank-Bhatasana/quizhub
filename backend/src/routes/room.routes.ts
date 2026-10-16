import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import {
  getActiveRoom,
  computeLeaderboard,
  saveAnswer,
  markRoomDirty,
} from "../services/room.service.js";
import { publishToRoom } from "../sockets/roomSocket.js";
import { generateRoomCode, requireAuth } from "../utils/auth.js";
import type { AuthenticatedRequest } from "../utils/auth.js";
import { computeAnswerPoints } from "../utils/scoring.js";

const router: Router = Router();

type QuestionTypeName = "SINGLE" | "MULTIPLE" | "TRUE_FALSE";

const QUESTION_TYPES: QuestionTypeName[] = ["SINGLE", "MULTIPLE", "TRUE_FALSE"];

function normalizeQuestionType(value: unknown): QuestionTypeName {
  return QUESTION_TYPES.includes(value as QuestionTypeName)
    ? (value as QuestionTypeName)
    : "SINGLE";
}

function normalizeOptions(options: any[]) {
  return options.map((option, index) => ({
    text: String(option?.text ?? "").trim(),
    isCorrect: Boolean(option?.isCorrect),
    sortOrder: Number.isInteger(option?.sortOrder) ? option.sortOrder : index,
  }));
}

/** Returns an error message when the question payload is invalid, else null. */
function validateQuestionInput(
  type: QuestionTypeName,
  options: { text: string; isCorrect: boolean }[],
): string | null {
  if (options.length === 0) return "options are required";
  if (options.some((option) => !option.text)) return "option text is required";

  const correctCount = options.filter((option) => option.isCorrect).length;

  if (type === "TRUE_FALSE" && options.length !== 2) {
    return "true/false questions need exactly 2 options";
  }
  if (type === "MULTIPLE" && correctCount < 1) {
    return "at least one correct option is required";
  }
  if (type !== "MULTIPLE" && correctCount !== 1) {
    return "exactly one correct option is required";
  }
  return null;
}

/** Serialises a room's participant list for WebSocket broadcasts. */
async function fetchParticipantPayload(roomId: string) {
  const participants = await prisma.roomParticipant.findMany({
    where: { roomId },
    orderBy: { joinedAt: "asc" },
    include: { profile: { select: { avatarUrl: true } } },
  });
  return participants.map((p) => ({
    id: p.id,
    profileId: p.profileId,
    displayName: p.displayName,
    isHost: p.isHost,
    joinedAt: p.joinedAt,
    avatarUrl: p.profile?.avatarUrl ?? null,
  }));
}

/**
 * POST /api/questions
 * Creates a question with options.
 */
router.post("/questions", async (req, res) => {
  const { createdById, text, explanation, options, type } = req.body ?? {};
  if (
    !createdById ||
    typeof text !== "string" ||
    !Array.isArray(options) ||
    options.length === 0
  ) {
    res.status(400).json({ error: "createdById, text, options are required" });
    return;
  }

  const normalizedOptions = normalizeOptions(options);
  const questionType = normalizeQuestionType(type);

  const validationError = validateQuestionInput(questionType, normalizedOptions);
  if (validationError) {
    res.status(400).json({ error: validationError });
    return;
  }

  try {
    const question = await prisma.question.create({
      data: {
        createdById,
        text: text.trim(),
        explanation: typeof explanation === "string" ? explanation : null,
        type: questionType,
        options: {
          create: normalizedOptions,
        },
      },
      include: { options: { orderBy: { sortOrder: "asc" } } },
    });

    res.json({ question });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to create question" });
  }
});

/**
 * GET /api/profiles/:profileId/questions
 * Returns the question bank owned by a profile (saved questions).
 */
router.get("/profiles/:profileId/questions", async (req, res) => {
  const { profileId } = req.params;
  const includeInactive = req.query.includeInactive === "true";

  try {
    const questions = await prisma.question.findMany({
      where: {
        createdById: profileId,
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: { createdAt: "desc" },
      include: { options: { orderBy: { sortOrder: "asc" } } },
    });
    res.json({ questions });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to load question bank" });
  }
});

/**
 * PATCH /api/questions/:id
 * Updates a saved question's text, explanation, type and options.
 */
router.patch("/questions/:id", async (req, res) => {
  const { id } = req.params;
  const { text, explanation, type, options } = req.body ?? {};

  const existing = await prisma.question.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ error: "Question not found" });
    return;
  }

  const nextText = typeof text === "string" ? text.trim() : existing.text;
  const nextType = type === undefined ? existing.type : normalizeQuestionType(type);
  const nextExplanation =
    explanation === undefined
      ? existing.explanation
      : typeof explanation === "string" && explanation.trim()
        ? explanation
        : null;

  if (!nextText) {
    res.status(400).json({ error: "Question text is required" });
    return;
  }

  const hasNewOptions = Array.isArray(options) && options.length > 0;
  const normalizedOptions = hasNewOptions ? normalizeOptions(options) : [];

  if (hasNewOptions) {
    const validationError = validateQuestionInput(nextType, normalizedOptions);
    if (validationError) {
      res.status(400).json({ error: validationError });
      return;
    }
  }

  try {
    const question = await prisma.$transaction(async (tx) => {
      if (hasNewOptions) {
        // Replace the option set. Existing answers keep their `isCorrect` flag,
        // so historical scores remain valid.
        await tx.questionOption.deleteMany({ where: { questionId: id } });
        await tx.questionOption.createMany({
          data: normalizedOptions.map((option) => ({ ...option, questionId: id })),
        });
      }

      return tx.question.update({
        where: { id },
        data: {
          text: nextText,
          explanation: nextExplanation,
          type: nextType,
        },
        include: { options: { orderBy: { sortOrder: "asc" } } },
      });
    });

    res.json({ question });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to update question" });
  }
});

/**
 * DELETE /api/questions/:id
 * Soft-deletes a saved question by marking it inactive.
 */
router.delete("/questions/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.question.update({
      where: { id },
      data: { isActive: false },
    });
    res.json({ ok: true });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to delete question" });
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
      type: roomQuestion.question.type,
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
  const {
    participantId,
    roomQuestionId,
    selectedOptionId,
    selectedOptionIds,
    timeTakenSeconds,
  } = req.body ?? {};

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
      selectedOptionIds,
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
          (sum, a) => sum + (a.isCorrect ? computeAnswerPoints(a.roomQuestion.points, a.isCorrect, a.timeTakenSeconds) : 0),
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
              (sum, a) => sum + (a.isCorrect ? computeAnswerPoints(a.roomQuestion.points, a.isCorrect, a.timeTakenSeconds) : 0),
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
        (sum, a) => sum + (a.isCorrect ? computeAnswerPoints(a.roomQuestion.points, a.isCorrect, a.timeTakenSeconds) : 0),
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

/**
 * POST /api/rooms/:code/kick
 * Host-only: removes a participant from the room.
 */
router.post("/rooms/:code/kick", async (req, res) => {
  const { code } = req.params;
  const { profileId, participantId } = req.body ?? {};

  if (!profileId || !participantId) {
    res.status(400).json({ error: "profileId and participantId are required" });
    return;
  }

  const room = await prisma.quizRoom.findUnique({
    where: { code: code.toUpperCase() },
  });
  if (!room) {
    res.status(404).json({ error: "Room not found" });
    return;
  }
  if (room.hostId !== profileId) {
    res.status(403).json({ error: "Only the host can remove participants" });
    return;
  }

  const participant = await prisma.roomParticipant.findUnique({
    where: { id: participantId },
  });
  if (!participant || participant.roomId !== room.id) {
    res.status(404).json({ error: "Participant not found" });
    return;
  }
  if (participant.isHost) {
    res.status(400).json({ error: "The host cannot be removed" });
    return;
  }

  try {
    await prisma.roomParticipant.delete({ where: { id: participantId } });

    const participants = await fetchParticipantPayload(room.id);
    publishToRoom(room.code, { type: "participants_updated", participants });
    publishToRoom(room.code, {
      type: "participant_kicked",
      participantId,
      profileId: participant.profileId,
    });
    markRoomDirty(room.code);

    res.json({ ok: true, participants });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to remove participant" });
  }
});

/**
 * POST /api/rooms/:code/end
 * Host-only: ends the quiz immediately and broadcasts the status change.
 */
router.post("/rooms/:code/end", async (req, res) => {
  const { code } = req.params;
  const { profileId } = req.body ?? {};

  if (!profileId) {
    res.status(400).json({ error: "profileId is required" });
    return;
  }

  const room = await prisma.quizRoom.findUnique({
    where: { code: code.toUpperCase() },
  });
  if (!room) {
    res.status(404).json({ error: "Room not found" });
    return;
  }
  if (room.hostId !== profileId) {
    res.status(403).json({ error: "Only the host can end the quiz" });
    return;
  }

  if (room.status === "ENDED") {
    res.json({
      room: {
        id: room.id,
        code: room.code,
        status: room.status,
        hostId: room.hostId,
        startedAt: room.startedAt,
        endedAt: room.endedAt,
      },
    });
    return;
  }

  try {
    const updated = await prisma.quizRoom.update({
      where: { id: room.id },
      data: { status: "ENDED", endedAt: new Date() },
    });

    publishToRoom(updated.code, {
      type: "room_ended",
      room: {
        code: updated.code,
        status: updated.status,
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
    res.status(500).json({ error: "Failed to end the quiz" });
  }
});

/**
 * GET /api/rooms/:code/analytics
 * Host-facing per-question breakdown for a session: difficulty, option
 * distribution, average response time and overall score summary.
 */
router.get("/rooms/:code/analytics", async (req, res) => {
  const { code } = req.params;

  const room = await prisma.quizRoom.findUnique({
    where: { code: code.toUpperCase() },
    include: {
      questions: {
        orderBy: { orderIndex: "asc" },
        include: {
          question: { include: { options: { orderBy: { sortOrder: "asc" } } } },
          answers: true,
        },
      },
      participants: { where: { isHost: false } },
    },
  });

  if (!room) {
    res.status(404).json({ error: "Room not found" });
    return;
  }

  try {
    const questionStats = room.questions.map((roomQuestion, index) => {
      const answers = roomQuestion.answers;
      const answered = answers.length;
      const correctCount = answers.filter((answer) => answer.isCorrect).length;
      const avgTimeSeconds = answered
        ? Math.round(
            answers.reduce((sum, answer) => sum + (answer.timeTakenSeconds ?? 0), 0) /
              answered,
          )
        : 0;

      const optionCounts = roomQuestion.question.options.map((option) => ({
        id: option.id,
        text: option.text,
        isCorrect: option.isCorrect,
        count: answers.filter(
          (answer) =>
            answer.selectedOptionId === option.id ||
            answer.selectedOptionIds.includes(option.id),
        ).length,
      }));

      return {
        roomQuestionId: roomQuestion.id,
        index,
        text: roomQuestion.question.text,
        type: roomQuestion.question.type,
        points: roomQuestion.points,
        answered,
        correctCount,
        accuracy: answered ? Math.round((correctCount / answered) * 100) : 0,
        avgTimeSeconds,
        optionCounts,
      };
    });

    const scoreboard = await computeLeaderboard(room.id);
    const scores = scoreboard.map((entry) => entry.score);
    const avgScore = scores.length
      ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
      : 0;
    const topScore = scores.length ? Math.max(...scores) : 0;

    res.json({
      analytics: {
        roomCode: room.code,
        status: room.status,
        startedAt: room.startedAt,
        endedAt: room.endedAt,
        totalParticipants: room.participants.length,
        completed: scoreboard.filter((entry) => entry.answered >= entry.total).length,
        avgScore,
        topScore,
        questionCount: room.questions.length,
        questionStats,
        scoreboard,
      },
    });
  } catch (error: any) {
    console.error("Room analytics error:", error);
    res.status(500).json({ error: "Failed to load session analytics" });
  }
});

/**
 * GET /api/curated-quizzes
 * Public list of the platform's curated "Quizzes by us" (no questions/answers).
 */
router.get("/curated-quizzes", async (_req, res) => {
  try {
    const quizzes = await prisma.curatedQuiz.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      include: { questions: { select: { points: true } } },
    });

    res.json({
      quizzes: quizzes.map((quiz) => ({
        id: quiz.id,
        slug: quiz.slug,
        title: quiz.title,
        description: quiz.description,
        emoji: quiz.emoji,
        questionCount: quiz.questions.length,
        totalPoints: quiz.questions.reduce((sum, item) => sum + item.points, 0),
      })),
    });
  } catch (error: any) {
    console.error("Curated quizzes error:", error);
    res.status(500).json({ error: "Failed to load curated quizzes" });
  }
});

/**
 * GET /api/curated-quizzes/:slug
 * Full curated quiz with questions, options and answers. Requires auth so that
 * the curated library stays a members-only practice mode.
 */
router.get("/curated-quizzes/:slug", requireAuth, async (req: AuthenticatedRequest, res) => {
  const slug = typeof req.params.slug === "string" ? req.params.slug : "";

  try {
    const quiz = await prisma.curatedQuiz.findUnique({
      where: { slug },
      include: {
        questions: {
          orderBy: { orderIndex: "asc" },
          include: {
            question: { include: { options: { orderBy: { sortOrder: "asc" } } } },
          },
        },
      },
    });

    if (!quiz || !quiz.isActive) {
      res.status(404).json({ error: "Quiz not found" });
      return;
    }

    res.json({
      quiz: {
        id: quiz.id,
        slug: quiz.slug,
        title: quiz.title,
        description: quiz.description,
        emoji: quiz.emoji,
        questions: quiz.questions.map((item) => ({
          id: item.question.id,
          text: item.question.text,
          type: item.question.type,
          points: item.points,
          explanation: item.question.explanation ?? undefined,
          options: item.question.options.map((option) => ({
            id: option.id,
            text: option.text,
            isCorrect: option.isCorrect,
          })),
        })),
      },
    });
  } catch (error: any) {
    console.error("Curated quiz error:", error);
    res.status(500).json({ error: "Failed to load curated quiz" });
  }
});

export default router;

