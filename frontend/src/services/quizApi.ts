import type { ExamQuestion } from "../types/exam";
import { apiFetch } from "./api";

export type GuestProfile = {
  id: string;
  username: string | null;
  avatarUrl: string | null;
  role: string;
  totalPoints: number;
  isTemporary: boolean;
  guestToken: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AuthUser = {
  id: string;
  email: string;
};

export type AuthProfile = {
  id: string;
  username: string | null;
  avatarUrl: string | null;
  role: string;
  totalPoints: number;
  isTemporary: boolean;
};

export type AuthSession = {
  user: AuthUser;
  profile: AuthProfile;
};

export type ParticipantsProfile = {
  id: string;
  profileId: string;
  displayName: string;
  isHost: boolean;
  joinedAt: string;
  avatarUrl: string | null;
};

export type RoomDetails = {
  id: string;
  code: string;
  status: string;
  hostId: string;
  startedAt: string | null;
  questionCount: number;
};

export type RoomParticipant = {
  id: string;
  displayName: string;
  isHost: boolean;
};

export type RoomResponse = {
  id: string;
  code: string;
  status: string;
};

export async function createGuest(input: {
  displayName: string;
  avatarUrl?: string | null;
}) {
  return apiFetch<{ profile: GuestProfile }>("/api/guest", {
    method: "POST",
    body: input,
  });
}

export async function registerUser(input: {
  email: string;
  password: string;
  username: string;
  avatarUrl?: string | null;
}) {
  return apiFetch<AuthSession>("/api/auth/register", {
    method: "POST",
    body: input,
  });
}

export async function loginUser(input: {
  email: string;
  password: string;
}) {
  return apiFetch<AuthSession>("/api/auth/login", {
    method: "POST",
    body: input,
  });
}

export async function getAuthMe() {
  return apiFetch<AuthSession>("/api/auth/me", {
    method: "GET",
  });
}

export async function logoutUser() {
  return apiFetch<{ ok: boolean }>("/api/auth/logout", {
    method: "POST",
  });
}

export async function createQuestion(input: {
  createdById: string;
  text: string;
  explanation?: string;
  options: { text: string; isCorrect?: boolean; sortOrder?: number }[];
}) {
  return apiFetch<{ question: unknown }>("/api/questions", {
    method: "POST",
    body: input,
  });
}

export async function createRoom(input: {
  hostProfileId: string;
  questions: { questionId: string; points?: number; orderIndex?: number }[];
}) {
  return apiFetch<{ room: RoomResponse }>("/api/rooms", {
    method: "POST",
    body: input,
  });
}

export async function joinRoom(
  code: string,
  input: { profileId: string; displayName: string },
) {
  return apiFetch<{ roomId: string; participant: RoomParticipant }>(
    `/api/rooms/${code}/join`,
    {
      method: "POST",
      body: input,
    },
  );
}

export async function getAllTheParticipants(code: string) {
  return apiFetch<{ participants: ParticipantsProfile[] }>(
    `/api/rooms/${code}/participants`,
    {
      method: "GET",
    },
  );
}

export async function getQuestions(code: string) {
  return apiFetch<{ questions: ExamQuestion[] }>(
    `/api/room/${code}/questions`,
    {
      method: "GET",
    },
  );
}

export async function getRoomDetails(code: string) {
  return apiFetch<{ room: RoomDetails }>(`/api/rooms/${code}`, {
    method: "GET",
  });
}

export async function startRoom(code: string, input: { profileId: string; durationSeconds?: number }) {
  return apiFetch<{ room: RoomDetails }>(`/api/rooms/${code}/start`, {
    method: "POST",
    body: input,
  });
}

export async function submitAnswer(
  roomId: string,
  input: {
    participantId: string;
    roomQuestionId: string;
    selectedOptionId?: string;
    timeTakenSeconds?: number;
  },
) {
  return apiFetch<{ answer: unknown }>(`/api/rooms/${roomId}/answer`, {
    method: "POST",
    body: input,
  });
}

export type LeaderboardEntry = {
  id: string;
  name: string;
  avatar: string;
  avatarBg: string;
  score: number;
  correct: number;
  total: number;
  answered: number;
  timeSeconds: number;
};

export async function getScoreboard(roomId: string) {
  return apiFetch<{
    scoreboard: LeaderboardEntry[];
  }>(`/api/rooms/${roomId}/scoreboard`);
}

export type RecentSession = {
  roomCode: string;
  roomId: string;
  status: string;
  playedAt: string;
  correct: number;
  total: number;
  answered: number;
  score: number;
  accuracy: number;
  timeSec: number;
  rank: number;
  totalParticipants: number;
};

export type AnalyticsData = {
  totalSessions: number;
  totalCorrect: number;
  totalAnswered: number;
  overallAccuracy: number;
  bestScore: number;
  totalScore: number;
  avgTimeSec: number;
  recentSessions: RecentSession[];
};

export async function getAnalytics(profileId: string) {
  return apiFetch<{ analytics: AnalyticsData }>(`/api/analytics/${profileId}`);
}
