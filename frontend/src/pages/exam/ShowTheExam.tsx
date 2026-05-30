import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { dummyExamQuestions } from "../../data/dummyExamQuestions";
import ExamPlayer from "./components/ExamPlayer";
import type { QuestionAnswer, QuestionPhase } from "../../types/exam";
import { QUESTION_TIME_SECONDS } from "../../types/exam";

function codeFromParam(input: string | undefined) {
  return (input ?? "").trim().replace(/\s+/g, "").toUpperCase() || "DEMO";
}

export default function ShowTheExam() {
  const params = useParams();
  const roomCode = codeFromParam(params.code);
  const questions = dummyExamQuestions;
  const totalQuestions = questions.length;
  const maxPoints = useMemo(
    () => questions.reduce((sum, q) => sum + q.points, 0),
    [questions],
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, QuestionAnswer>>({});
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME_SECONDS);
  const [isComplete, setIsComplete] = useState(false);

  const currentQuestion = questions[currentIndex];
  const currentQuestionId = currentQuestion?.id;
  const currentAnswer = currentQuestionId ? answers[currentQuestionId] : undefined;
  const phase: QuestionPhase = currentAnswer ? "revealed" : "answering";
  const selectedOptionId = currentAnswer?.selectedOptionId ?? null;

  const earnedPoints = useMemo(() => {
    return questions.reduce((sum, question) => {
      const answer = answers[question.id];
      if (!answer?.selectedOptionId) return sum;
      const selected = question.options.find((o) => o.id === answer.selectedOptionId);
      return selected?.isCorrect ? sum + question.points : sum;
    }, 0);
  }, [answers, questions]);

  const revealQuestion = useCallback(
    (questionId: string, selectedOptionId: string | null) => {
      setAnswers((prev) => {
        if (prev[questionId]) return prev;
        return {
          ...prev,
          [questionId]: { selectedOptionId, revealedAt: Date.now() },
        };
      });
    },
    [],
  );

  const selectOption = useCallback(
    (optionId: string) => {
      if (!currentQuestionId || answers[currentQuestionId]) return;
      revealQuestion(currentQuestionId, optionId);
    },
    [answers, currentQuestionId, revealQuestion],
  );

  useEffect(() => {
    if (isComplete || phase === "revealed") return;

    const timer = window.setTimeout(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (currentQuestionId) {
            revealQuestion(currentQuestionId, null);
          }
          return 0;
        }

        return prev - 1;
      });
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [timeLeft, phase, isComplete, currentQuestionId, revealQuestion]);

  const goToQuestion = useCallback(
    (nextIndex: number) => {
      const nextQuestion = questions[nextIndex];
      if (!nextQuestion) return;

      setCurrentIndex(nextIndex);
      setTimeLeft(answers[nextQuestion.id] ? 0 : QUESTION_TIME_SECONDS);
    },
    [answers, questions],
  );

  function goPrev() {
    if (currentIndex <= 0) return;
    goToQuestion(currentIndex - 1);
  }

  function goNext() {
    if (!currentQuestionId || !answers[currentQuestionId]) return;

    if (currentIndex >= totalQuestions - 1) {
      setIsComplete(true);
      return;
    }

    goToQuestion(currentIndex + 1);
  }

  function handleComplete() {
    //TODO: complete this 

  }

  if (!currentQuestion) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm font-semibold text-muted">No questions available.</p>
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
      canGoNext={Boolean(currentQuestionId && answers[currentQuestionId]) && !isComplete}
      isComplete={isComplete}
      earnedPoints={earnedPoints}
      maxPoints={maxPoints}
      onComplete={handleComplete}
    />
  );
}
