export const queryKeys = {
  greet: ["greet"] as const,
  authSession: ["auth-session"] as const,
  guestProfile: ["guest-profile"] as const,
  roomDetails: (code: string) => ["room", code, "details"] as const,
  roomParticipants: (code: string) => ["room", code, "participants"] as const,
  roomQuestions: (code: string) => ["room", code, "questions"] as const,
  roomScoreboard: (roomId: string) => ["room", roomId, "scoreboard"] as const,
  profileAnalytics: (profileId: string) => ["analytics", profileId] as const,
};
