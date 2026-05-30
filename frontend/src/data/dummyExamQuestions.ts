import type { ExamQuestion } from "../types/exam";

export const dummyExamQuestions: ExamQuestion[] = [
  {
    id: "q1",
    text: "Which planet is known as the Red Planet?",
    points: 100,
    explanation:
      "Mars appears red because iron oxide (rust) on its surface reflects sunlight in the red spectrum.",
    options: [
      { id: "q1-a", text: "Mars", isCorrect: true },
      { id: "q1-b", text: "Venus", isCorrect: false },
    ],
  },
  {
    id: "q2",
    text: "What is the chemical symbol for gold?",
    points: 250,
    options: [
      { id: "q2-a", text: "Go", isCorrect: false },
      { id: "q2-b", text: "Gd", isCorrect: false },
      { id: "q2-c", text: "Au", isCorrect: true },
      { id: "q2-d", text: "Ag", isCorrect: false },
    ],
  },
  {
    id: "q3",
    text: "Which programming paradigm does React primarily use for building UI?",
    points: 150,
    explanation:
      "React uses a declarative, component-based model. You describe what the UI should look like for a given state, and React handles updating the DOM.",
    options: [
      { id: "q3-a", text: "Component-based", isCorrect: true },
      { id: "q3-b", text: "Procedural", isCorrect: false },
      { id: "q3-c", text: "Logic programming", isCorrect: false },
    ],
  },
  {
    id: "q4",
    text: "In which year did the first iPhone launch?",
    points: 500,
    explanation:
      "Apple announced the original iPhone on January 9, 2007, and it went on sale in the United States on June 29, 2007.",
    options: [
      { id: "q4-a", text: "2005", isCorrect: false },
      { id: "q4-b", text: "2006", isCorrect: false },
      { id: "q4-c", text: "2007", isCorrect: true },
      { id: "q4-d", text: "2008", isCorrect: false },
    ],
  },
  {
    id: "q5",
    text: "Is water composed of hydrogen and oxygen?",
    points: 200,
    options: [
      { id: "q5-a", text: "Yes", isCorrect: true },
      { id: "q5-b", text: "No", isCorrect: false },
    ],
  },
];
