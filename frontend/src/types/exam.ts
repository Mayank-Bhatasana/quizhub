export type QuestionType = "SINGLE" | "MULTIPLE" | "TRUE_FALSE";

export type ExamOption = {
  id: string;
  text: string;
  isCorrect: boolean;
};

export type ExamQuestion = {
  id: string;
  roomQuestionId?: string;
  text: string;
  type: QuestionType;
  points: number;
  explanation?: string;
  options: ExamOption[];
};

export type QuestionAnswer = {
  selectedOptionId: string | null;
  selectedOptionIds?: string[];
  timeTakenSeconds?: number;
  revealedAt: number;
};

/** A question is only correct when the selected set exactly matches the correct set. */
export function isAnswerCorrect(
  question: ExamQuestion,
  answer: QuestionAnswer | undefined,
): boolean {
  if (!answer) return false;
  const correctIds = question.options.filter((option) => option.isCorrect).map((option) => option.id);
  const selectedIds = answer.selectedOptionIds?.length
    ? answer.selectedOptionIds
    : answer.selectedOptionId
      ? [answer.selectedOptionId]
      : [];
  if (selectedIds.length === 0) return false;
  return (
    selectedIds.length === correctIds.length &&
    selectedIds.every((id) => correctIds.includes(id))
  );
}

export type QuestionPhase = "answering" | "revealed";

export const QUESTION_TIME_SECONDS = 20;
