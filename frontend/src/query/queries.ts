import { useMutation, useQuery } from "@tanstack/react-query";
import { getGreet } from "../services/getGreet";
import {
  createGuest,
  createQuestion,
  createRoom,
  getAuthMe,
  getAllTheParticipants,
  getAnalytics,
  getQuestions,
  getRoomDetails,
  getScoreboard,
  joinRoom,
  logoutUser,
  startRoom,
} from "../services/quizApi";
import { queryKeys } from "./queryKeys";

export function useGreeting() {
  return useQuery({
    queryKey: queryKeys.greet,
    queryFn: getGreet,
  });
}

export function useAuthSession() {
  return useQuery({
    queryKey: queryKeys.authSession,
    queryFn: getAuthMe,
    retry: 0,
  });
}

export function useLogout() {
  return useMutation({
    mutationFn: logoutUser,
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
    staleTime: 0,
  });
}

export function useGetQuestions(code: string) {
  return useQuery({
    queryKey: queryKeys.roomQuestions(code),
    queryFn: () => getQuestions(code),
    enabled: Boolean(code),
    retry: 0,
    refetchOnWindowFocus: false,
  });
}

export function useRoomDetails(code: string) {
  return useQuery({
    queryKey: queryKeys.roomDetails(code),
    queryFn: () => getRoomDetails(code),
    enabled: Boolean(code),
    staleTime: 0,
  });
}

export function useStartRoom() {
  return useMutation({
    mutationFn: ({ code, profileId, durationSeconds }: { code: string; profileId: string; durationSeconds?: number }) =>
      startRoom(code, { profileId, durationSeconds }),
  });
}

export function useScoreboard(roomId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.roomScoreboard(roomId),
    queryFn: () => getScoreboard(roomId),
    enabled,
  });
}

export function useAnalytics(profileId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.profileAnalytics(profileId ?? ""),
    queryFn: () => getAnalytics(profileId!),
    enabled: Boolean(profileId),
    staleTime: 30_000,
  });
}
