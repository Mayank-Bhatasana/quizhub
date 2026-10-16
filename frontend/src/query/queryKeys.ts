export const queryKeys = {
  greet: ["greet"] as const,
  authSession: ["auth-session"] as const,
  guestProfile: ["guest-profile"] as const,
  roomDetails: (code: string) => ["room", code, "details"] as const,
  roomParticipants: (code: string) => ["room", code, "participants"] as const,
  roomQuestions: (code: string) => ["room", code, "questions"] as const,
  roomScoreboard: (roomId: string) => ["room", roomId, "scoreboard"] as const,
  roomAnalytics: (code: string) => ["room", code, "analytics"] as const,
  profileAnalytics: (profileId: string) => ["analytics", profileId] as const,
  questionBank: (profileId: string) => ["question-bank", profileId] as const,
  curatedQuizzes: ["curated-quizzes"] as const,
  curatedQuiz: (slug: string) => ["curated-quiz", slug] as const,
};
