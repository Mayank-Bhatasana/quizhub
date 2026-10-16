import { useMutation, useQuery } from "@tanstack/react-query";
import { getGreet } from "../services/getGreet";
import {
  createGuest,
  createQuestion,
  createRoom,
  deleteQuestion,
  endRoom,
  getAuthMe,
  getAllTheParticipants,
  getAnalytics,
  getCuratedQuiz,
  getCuratedQuizzes,
  getQuestionBank,
  getQuestions,
  getRoomAnalytics,
  getRoomDetails,
  getScoreboard,
  joinRoom,
  kickParticipant,
  logoutUser,
  startRoom,
  updateQuestion,
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

export function useQuestionBank(profileId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.questionBank(profileId ?? ""),
    queryFn: () => getQuestionBank(profileId!),
    enabled: Boolean(profileId),
    staleTime: 30_000,
  });
}

export function useUpdateQuestion() {
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof updateQuestion>[1] }) =>
      updateQuestion(id, input),
  });
}

export function useDeleteQuestion() {
  return useMutation({
    mutationFn: (id: string) => deleteQuestion(id),
  });
}

export function useKickParticipant() {
  return useMutation({
    mutationFn: ({ code, input }: { code: string; input: { profileId: string; participantId: string } }) =>
      kickParticipant(code, input),
  });
}

export function useEndRoom() {
  return useMutation({
    mutationFn: ({ code, profileId }: { code: string; profileId: string }) =>
      endRoom(code, { profileId }),
  });
}

export function useRoomAnalytics(code: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.roomAnalytics(code),
    queryFn: () => getRoomAnalytics(code),
    enabled: Boolean(code) && enabled,
    staleTime: 15_000,
  });
}

export function useCuratedQuizzes() {
  return useQuery({
    queryKey: queryKeys.curatedQuizzes,
    queryFn: getCuratedQuizzes,
    staleTime: 60_000,
  });
}

export function useCuratedQuiz(slug: string | undefined) {
  return useQuery({
    queryKey: queryKeys.curatedQuiz(slug ?? ""),
    queryFn: () => getCuratedQuiz(slug!),
    enabled: Boolean(slug),
    retry: 0,
  });
}
