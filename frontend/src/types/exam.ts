export type ExamOption = {
  id: string;
  text: string;
  isCorrect: boolean;
};

export type ExamQuestion = {
  id: string;
  text: string;
  points: number;
  explanation?: string;
  options: ExamOption[];
};

export type QuestionAnswer = {
  selectedOptionId: string | null;
  revealedAt: number;
};

export type QuestionPhase = "answering" | "revealed";

export const QUESTION_TIME_SECONDS = 20;
