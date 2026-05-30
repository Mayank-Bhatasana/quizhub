export const queryKeys = {
  greet: ["greet"] as const,
  guestProfile: ["guest-profile"] as const,
  roomDetails: (code: string) => ["room", code, "details"] as const,
  roomParticipants: (code: string) => ["room", code, "participants"] as const,
  roomScoreboard: (roomId: string) => ["room", roomId, "scoreboard"] as const,
};
