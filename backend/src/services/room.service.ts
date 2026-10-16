import { prisma } from "../lib/prisma.js";
import { getAvatarForName } from "../utils/avatar.js";
import { computeAnswerPoints } from "../utils/scoring.js";
import { publishToRoom } from "../sockets/roomSocket.js";

export async function saveAnswer({
  roomId,
  participantId,
  roomQuestionId,
  selectedOptionId,
  selectedOptionIds,
  timeTakenSeconds,
}: {
  roomId: string;
  participantId: string;
  roomQuestionId: string;
  selectedOptionId?: string | null;
  selectedOptionIds?: string[] | null;
  timeTakenSeconds?: number | null;
}) {
  const roomQuestion = await prisma.roomQuestion.findUnique({
    where: { id: roomQuestionId },
  });
  if (!roomQuestion || roomQuestion.roomId !== roomId) {
    throw new Error("Room question not found");
  }

  // Normalise the submitted selection into a de-duplicated set of option ids.
  // Multi-select questions arrive as `selectedOptionIds`, single-choice (and
  // legacy clients) send a single `selectedOptionId`.
  const submitted = new Set<string>();
  if (Array.isArray(selectedOptionIds)) {
    for (const id of selectedOptionIds) {
      if (typeof id === "string" && id) submitted.add(id);
    }
  } else if (selectedOptionId) {
    submitted.add(selectedOptionId);
  }

  const options = await prisma.questionOption.findMany({
    where: { questionId: roomQuestion.questionId },
    select: { id: true, isCorrect: true },
  });
  const optionIds = new Set(options.map((option) => option.id));
  const correctIds = new Set(
    options.filter((option) => option.isCorrect).map((option) => option.id),
  );

  // Reject any option that doesn't belong to this question.
  for (const id of submitted) {
    if (!optionIds.has(id)) {
      throw new Error("Invalid selected option");
    }
  }

  // A question is only correct when the player selected *exactly* the set of
  // correct options — no missing picks and no extras.
  const isCorrect =
    submitted.size > 0 &&
    submitted.size === correctIds.size &&
    [...submitted].every((id) => correctIds.has(id));

  const selectedList = [...submitted];
  const normalisedTime =
    typeof timeTakenSeconds === "number" && Number.isInteger(timeTakenSeconds)
      ? timeTakenSeconds
      : null;

  const answer = await prisma.participantAnswer.upsert({
    where: {
      roomQuestionId_participantId: {
        roomQuestionId,
        participantId,
      },
    },
    update: {
      selectedOptionId: selectedList[0] ?? null,
      selectedOptionIds: selectedList,
      isCorrect,
      timeTakenSeconds: normalisedTime,
    },
    create: {
      roomId,
      roomQuestionId,
      participantId,
      selectedOptionId: selectedList[0] ?? null,
      selectedOptionIds: selectedList,
      isCorrect,
      timeTakenSeconds: normalisedTime,
    },
  });

  return answer;
}

export async function computeLeaderboard(roomId: string) {
  const participants = await prisma.roomParticipant.findMany({
    where: { roomId, isHost: false },
    include: {
      profile: true,
      answers: {
        include: {
          roomQuestion: true,
        },
      },
    },
  });

  const totalQuestions = await prisma.roomQuestion.count({
    where: { roomId },
  });

  const entries = participants.map((p) => {
    const correct = p.answers.filter((a) => a.isCorrect).length;
    const answered = p.answers.length;
    const score = p.answers.reduce(
      (sum, a) => sum + computeAnswerPoints(a.roomQuestion.points, a.isCorrect, a.timeTakenSeconds),
      0,
    );
    const timeSeconds = p.answers.reduce((sum, a) => sum + (a.timeTakenSeconds ?? 0), 0);
    const avatarInfo = getAvatarForName(p.profileId, p.displayName);

    return {
      id: p.profileId,
      name: p.displayName,
      avatar: avatarInfo.emoji,
      avatarBg: avatarInfo.bg,
      score,
      correct,
      total: totalQuestions,
      answered,
      timeSeconds,
    };
  });

  return entries.sort((a, b) => b.score - a.score || a.timeSeconds - b.timeSeconds);
}

const dirtyRooms = new Set<string>();

export const broadcastLeaderboard = async (roomCode: string) => {
  try {
    const room = await prisma.quizRoom.findUnique({
      where: { code: roomCode.toUpperCase() },
    });
    if (!room) return;

    const scoreboard = await computeLeaderboard(room.id);

    const allCompleted =
      scoreboard.length > 0 && scoreboard.every((e) => e.answered >= e.total);

    publishToRoom(roomCode, {
      type: "leaderboard_updated",
      roomId: room.id,
      scoreboard,
      allCompleted,
    });
  } catch (error) {
    console.error(`Error broadcasting leaderboard for room ${roomCode}:`, error);
  }
};

setInterval(async () => {
  if (dirtyRooms.size === 0) return;

  const codesToProcess = Array.from(dirtyRooms);
  dirtyRooms.clear();

  for (const code of codesToProcess) {
    await broadcastLeaderboard(code);
  }
}, 1000);

export const markRoomDirty = (roomCode: string) => {
  dirtyRooms.add(roomCode.trim().toUpperCase());
};

export async function checkAndExpireRoom(room: any) {
  if (room.status === "LIVE" && room.endedAt && new Date() > new Date(room.endedAt)) {
    const updated = await prisma.quizRoom.update({
      where: { id: room.id },
      data: { status: "ENDED" },
    });
    // Broadcast status change
    publishToRoom(updated.code, {
      type: "room_ended",
      room: {
        code: updated.code,
        status: updated.status,
        endedAt: updated.endedAt,
      },
    });
    return updated;
  }
  return room;
}

export async function getActiveRoom(codeOrId: string, isId = false) {
  const room = await prisma.quizRoom.findUnique({
    where: isId ? { id: codeOrId } : { code: codeOrId.toUpperCase() },
  });
  if (!room) return null;
  return checkAndExpireRoom(room);
}
