import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ExamPlayer from "./components/ExamPlayer";
import type { QuestionAnswer, QuestionPhase } from "../../types/exam";
import { QUESTION_TIME_SECONDS } from "../../types/exam";
import { useGetAllParticipants, useGetQuestions, useRoomDetails } from "../../query/queries";
import { getTempUser } from "../../utils/tempUser";
import { submitAnswer } from "../../services/quizApi";

function codeFromParam(input: string | undefined) {
  return (input ?? "").trim().replace(/\s+/g, "").toUpperCase() || "DEMO";
}

/** Persist answers to localStorage so they survive a page refresh */
function saveAnswersToStorage(roomCode: string, answers: Record<string, QuestionAnswer>) {
  try {
    localStorage.setItem(`exam_answers_${roomCode}`, JSON.stringify(answers));
  } catch {
    // ignore quota errors
  }
}

function loadAnswersFromStorage(roomCode: string): Record<string, QuestionAnswer> {
  try {
    const raw = localStorage.getItem(`exam_answers_${roomCode}`);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return {};
}

function clearAnswersFromStorage(roomCode: string) {
  try {
    localStorage.removeItem(`exam_answers_${roomCode}`);
  } catch {
    // ignore
  }
}

export default function ShowTheExam() {
  const params = useParams();
  const navigate = useNavigate();
  const roomCode = codeFromParam(params.code);
  const tempUser = getTempUser();
  const tempProfileId = tempUser?.profileId;

  const { data: roomDetails, isLoading: isLoadingRoomDetails, isFetching: isFetchingRoomDetails } = useRoomDetails(roomCode);
  const { data: participantsData, isLoading: isLoadingParticipants, isFetching: isFetchingParticipants } = useGetAllParticipants(roomCode);
  const {
    data,
    isLoading: isLoadingQuestions,
    isError: isQuestionsError,
    error: questionError,
  } = useGetQuestions(roomCode);

  const [currentIndex, setCurrentIndex] = useState(0);
  // Initialize answers from localStorage so a refresh restores progress
  const [answers, setAnswers] = useState<Record<string, QuestionAnswer>>(() => loadAnswersFromStorage(roomCode));
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME_SECONDS);
  const [isCompleteState, setIsCompleteState] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const navigatedRef = useRef(false);

  // Keep a ref to the latest answers so event handlers (beforeunload) can access them without stale closure
  const answersRef = useRef(answers);
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  const isComplete = isCompleteState || roomDetails?.room?.status === "ENDED";

  const questions = data?.questions ?? [];
  const myParticipant = (participantsData?.participants ?? []).find(
    (participant) => participant.profileId === tempProfileId,
  );

  // Keep refs for things needed in beforeunload handler
  const questionsRef = useRef(questions);
  useEffect(() => {
    questionsRef.current = questions;
  }, [questions]);

  const myParticipantRef = useRef(myParticipant);
  useEffect(() => {
    myParticipantRef.current = myParticipant;
  }, [myParticipant]);

  const roomDetailsRef = useRef(roomDetails);
  useEffect(() => {
    roomDetailsRef.current = roomDetails;
  }, [roomDetails]);

  useEffect(() => {
    if (!roomDetails?.room || navigatedRef.current) return;
    if (isLoadingQuestions || isLoadingRoomDetails || isLoadingParticipants) return;
    if (!window.location.pathname.endsWith("/join")) return;

    if (isFetchingRoomDetails || isFetchingParticipants) return;

    if (roomDetails.room.status === "LOBBY") {
      navigatedRef.current = true;
      navigate(`/dashboard/session/${roomCode}`, { replace: true });
      return;
    }

    if (myParticipant?.isHost || !myParticipant) {
      navigatedRef.current = true;
      navigate(`/room/${roomCode}/join/leaderboard`, { replace: true });
    }
  }, [
    roomDetails?.room,
    isLoadingQuestions,
    isLoadingRoomDetails,
    isLoadingParticipants,
    isFetchingRoomDetails,
    isFetchingParticipants,
    myParticipant,
    navigate,
    roomCode,
  ]);

  function handleComplete() {
    clearAnswersFromStorage(roomCode);
    navigate(`/room/${roomCode}/join/leaderboard`);
  }

  const totalQuestions = questions.length;
  const maxPoints = questions.reduce((sum, q) => sum + q.points * 100, 0);

  const currentQuestion = questions[currentIndex];
  const currentQuestionId = currentQuestion?.id;
  const currentAnswer = currentQuestionId
    ? answers[currentQuestionId]
    : undefined;
  const phase: QuestionPhase = currentAnswer ? "revealed" : "answering";
  const selectedOptionId = currentAnswer?.selectedOptionId ?? null;

  const earnedPoints = questions.reduce((sum, question) => {
    const answer = answers[question.id];
    if (!answer?.selectedOptionId) return sum;
    const selected = question.options.find(
      (o) => o.id === answer.selectedOptionId,
    );
    return selected?.isCorrect ? sum + question.points * 100 : sum;
  }, 0);

  useEffect(() => {
    if (!roomCode) return;

    const wsBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000")
      .replace(/^http:/, "ws:")
      .replace(/^https:/, "wss:");

    const ws = new WebSocket(wsBaseUrl);

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: "subscribe",
          code: roomCode,
        }),
      );
    };

    socketRef.current = ws;

    return () => {
      ws.close();
      socketRef.current = null;
    };
  }, [roomCode]);

  const submitAnswerToWs = useCallback(
    (roomQuestionId: string, selectedOptionIdArg: string | null, elapsedSeconds: number) => {
      const socket = socketRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        console.warn("WebSocket not connected. Trying REST fallback.");
        const rd = roomDetailsRef.current;
        const mp = myParticipantRef.current;
        if (rd?.room.id && mp?.id) {
          submitAnswer(rd.room.id, {
            participantId: mp.id,
            roomQuestionId,
            selectedOptionId: selectedOptionIdArg ?? undefined,
            timeTakenSeconds: elapsedSeconds,
          }).catch(err => console.error("REST submitAnswer fallback error:", err));
        }
        return;
      }

      const mp = myParticipantRef.current;
      if (mp?.id) {
        socket.send(
          JSON.stringify({
            type: "submit_answer",
            code: roomCode,
            participantId: mp.id,
            roomQuestionId,
            selectedOptionId: selectedOptionIdArg,
            timeTakenSeconds: elapsedSeconds,
          })
        );
      }
    },
    [roomCode]
  );

  function revealQuestion(questionId: string, roomQuestionId: string, selectedOptionIdArg: string | null) {
    setAnswers((prev) => {
      if (prev[questionId]) return prev;

      const elapsedSeconds = QUESTION_TIME_SECONDS - timeLeft;
      submitAnswerToWs(roomQuestionId, selectedOptionIdArg, elapsedSeconds);

      const next = {
        ...prev,
        [questionId]: { selectedOptionId: selectedOptionIdArg, revealedAt: Date.now() },
      };

      // Persist to localStorage after every answer
      saveAnswersToStorage(roomCode, next);
      return next;
    });
  }

  function selectOption(optionId: string) {
    if (!currentQuestionId || !currentQuestion || answers[currentQuestionId]) return;
    revealQuestion(currentQuestionId, currentQuestion.roomQuestionId || currentQuestion.id, optionId);
  }

  function goToQuestion(nextIndex: number) {
    const nextQuestion = questions[nextIndex];
    if (!nextQuestion) return;

    setCurrentIndex(nextIndex);
    setTimeLeft(answers[nextQuestion.id] ? 0 : QUESTION_TIME_SECONDS);
  }

  useEffect(() => {
    if (isComplete || phase === "revealed") return;

    const timer = window.setTimeout(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (currentQuestionId && currentQuestion) {
            revealQuestion(currentQuestionId, currentQuestion.roomQuestionId || currentQuestion.id, null);
          }
          return 0;
        }

        return prev - 1;
      });
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [timeLeft, phase, isComplete, currentQuestionId, currentQuestion, answers, questions]);

  /**
   * Auto-submit all unanswered questions when the user closes/refreshes the page.
   * We use sendBeacon (fire-and-forget) for reliability on page unload.
   */
  useEffect(() => {
    if (!questions.length) return;

    const handleBeforeUnload = () => {
      const currentAnswers = answersRef.current;
      const currentQuestions = questionsRef.current;
      const rd = roomDetailsRef.current;
      const mp = myParticipantRef.current;

      if (!rd?.room.id || !mp?.id) return;

      const apiBase = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

      for (const question of currentQuestions) {
        if (!currentAnswers[question.id]) {
          // Submit a null answer for the skipped question via sendBeacon
          const body = JSON.stringify({
            participantId: mp.id,
            roomQuestionId: question.roomQuestionId || question.id,
            selectedOptionId: null,
            timeTakenSeconds: QUESTION_TIME_SECONDS,
          });

          const blob = new Blob([body], { type: "application/json" });
          navigator.sendBeacon(`${apiBase}/api/rooms/${rd.room.id}/answer`, blob);
        }
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [questions.length]);

  /**
   * On mount: if there are stored answers and some questions are still unanswered,
   * re-submit any stored answers that may not have reached the server
   * (in case the socket disconnected before transmission).
   */
  useEffect(() => {
    if (!questions.length || !myParticipant?.id || !roomDetails?.room?.id) return;

    const storedAnswers = loadAnswersFromStorage(roomCode);
    if (!Object.keys(storedAnswers).length) return;

    // Re-submit stored answers via REST to make sure they're in the DB
    const apiBase = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";
    for (const question of questions) {
      const stored = storedAnswers[question.id];
      if (stored) {
        submitAnswer(roomDetails.room.id, {
          participantId: myParticipant.id,
          roomQuestionId: question.roomQuestionId || question.id,
          selectedOptionId: stored.selectedOptionId ?? undefined,
          timeTakenSeconds: stored.revealedAt
            ? Math.round((stored.revealedAt - (stored.revealedAt - QUESTION_TIME_SECONDS * 1000)) / 1000)
            : QUESTION_TIME_SECONDS,
        }).catch(() => {
          // silently ignore — answer may already exist (upsert)
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions.length, myParticipant?.id, roomDetails?.room?.id]);

  function goPrev() {
    if (currentIndex <= 0) return;
    goToQuestion(currentIndex - 1);
  }

  function goNext() {
    if (!currentQuestionId || !answers[currentQuestionId]) return;

    if (currentIndex >= totalQuestions - 1) {
      setIsCompleteState(true);
      return;
    }

    goToQuestion(currentIndex + 1);
  }

  if (isLoadingQuestions || isLoadingRoomDetails || isLoadingParticipants) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm font-semibold text-muted">Loading questions…</p>
      </div>
    );
  }

  if (isQuestionsError || !data?.questions) {
    console.error("Error loading questions:", questionError);
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm font-semibold text-muted">
          There was an error loading questions.
        </p>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm font-semibold text-muted">
          No questions available.
        </p>
      </div>
    );
  }

  return (
    <ExamPlayer
      roomCode={roomCode}
      question={currentQuestion}
      questionNumber={currentIndex + 1}
      totalQuestions={totalQuestions}
      timeLeft={timeLeft}
      phase={phase}
      selectedOptionId={selectedOptionId}
      onSelectOption={selectOption}
      onPrev={goPrev}
      onNext={goNext}
      canGoPrev={currentIndex > 0 && !isComplete}
      canGoNext={
        Boolean(currentQuestionId && answers[currentQuestionId]) && !isComplete
      }
      isComplete={isComplete}
      earnedPoints={earnedPoints}
      maxPoints={maxPoints}
      onComplete={handleComplete}
    />
  );
}
