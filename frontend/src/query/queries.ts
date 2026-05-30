import { useMutation, useQuery } from "@tanstack/react-query";
import { getGreet } from "../services/getGreet";
import {
  createGuest,
  createQuestion,
  createRoom,
  getAllTheParticipants,
  getRoomDetails,
  getScoreboard,
  joinRoom,
  startRoom,
} from "../services/quizApi";
import { queryKeys } from "./queryKeys";

export function useGreeting() {
  return useQuery({
    queryKey: queryKeys.greet,
    queryFn: getGreet,
  });
}

export function useCreateGuest() {
  return useMutation({
    mutationFn: (input: { displayName: string; avatarUrl?: string | null }) => createGuest(input),
  });
}

export function useCreateQuestion() {
  return useMutation({
    mutationFn: createQuestion,
  });
}

export function useCreateRoom() {
  return useMutation({
    mutationFn: createRoom,
  });
}

export function useJoinRoom() {
  return useMutation({
    mutationFn: ({ code, input }: { code: string; input: { profileId: string; displayName: string } }) =>
      joinRoom(code, input),
  });
}

export function useGetAllParticipants(code: string) {
  return useQuery({
    queryKey: queryKeys.roomParticipants(code),
    queryFn: () => getAllTheParticipants(code),
    enabled: Boolean(code),
  });
}

export function useRoomDetails(code: string) {
  return useQuery({
    queryKey: queryKeys.roomDetails(code),
    queryFn: () => getRoomDetails(code),
    enabled: Boolean(code),
  });
}

export function useStartRoom() {
  return useMutation({
    mutationFn: ({ code, profileId }: { code: string; profileId: string }) => startRoom(code, { profileId }),
  });
}

export function useScoreboard(roomId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.roomScoreboard(roomId),
    queryFn: () => getScoreboard(roomId),
    enabled,
  });
}
