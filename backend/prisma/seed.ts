import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

/**
 * Seeds the curated "Quizzes by us" content.
 *
 * Curated quizzes are owned by a single system profile (so their questions can
 * live in the shared `Question` table) and are grouped through
 * `CuratedQuizQuestion`, mirroring how rooms assemble `RoomQuestion` sets.
 *
 * Run with:  npx prisma db seed   (or)   npm run db:seed
 */

const SYSTEM_PROFILE_ID = "00000000-0000-0000-0000-0000000000f1";

type SeedOption = { text: string; isCorrect: boolean };
type SeedQuestion = {
  text: string;
  explanation?: string;
  type?: "SINGLE" | "MULTIPLE" | "TRUE_FALSE";
  points?: number;
  options: SeedOption[];
};
type SeedQuiz = {
  slug: string;
  title: string;
  description: string;
  emoji: string;
  sortOrder: number;
  questions: SeedQuestion[];
};

const CURATED_QUIZZES: SeedQuiz[] = [
  {
    slug: "general-knowledge-quick",
    title: "General Knowledge (Quick)",
    description: "A short set of questions to warm up.",
    emoji: "🧠",
    sortOrder: 0,
    questions: [
      {
        text: "Which planet is known as the **Red Planet**?",
        explanation: "Mars appears red because of iron oxide (rust) on its surface.",
        options: [
          { text: "Venus", isCorrect: false },
          { text: "Mars", isCorrect: true },
          { text: "Jupiter", isCorrect: false },
          { text: "Mercury", isCorrect: false },
        ],
      },
      {
        text: "How many continents are there on Earth?",
        explanation: "The seven continents are Africa, Antarctica, Asia, Europe, North America, Oceania, and South America.",
        options: [
          { text: "Five", isCorrect: false },
          { text: "Six", isCorrect: false },
          { text: "Seven", isCorrect: true },
          { text: "Eight", isCorrect: false },
        ],
      },
      {
        text: "The Great Wall of China is visible from space with the naked eye.",
        explanation: "This is a common myth — the wall is too thin to be seen from orbit without aid.",
        type: "TRUE_FALSE",
        options: [
          { text: "True", isCorrect: false },
          { text: "False", isCorrect: true },
        ],
      },
      {
        text: "Which of these are primary colours in the **RGB** colour model?",
        explanation: "RGB stands for Red, Green, and Blue — the additive primary colours of light.",
        type: "MULTIPLE",
        points: 2,
        options: [
          { text: "Red", isCorrect: true },
          { text: "Green", isCorrect: true },
          { text: "Blue", isCorrect: true },
          { text: "Yellow", isCorrect: false },
        ],
      },
      {
        text: "What is the largest ocean on Earth?",
        explanation: "The Pacific Ocean covers roughly a third of the planet's surface.",
        options: [
          { text: "Atlantic Ocean", isCorrect: false },
          { text: "Indian Ocean", isCorrect: false },
          { text: "Arctic Ocean", isCorrect: false },
          { text: "Pacific Ocean", isCorrect: true },
        ],
      },
    ],
  },
  {
    slug: "tech-trivia",
    title: "Tech Trivia",
    description: "Frontend, backend, and everything in between.",
    emoji: "💻",
    sortOrder: 1,
    questions: [
      {
        text: "What does the ```let``` keyword do in JavaScript?",
        explanation: "`let` declares a block-scoped variable that *can* be reassigned.",
        options: [
          { text: "Declares a block-scoped, reassignable variable", isCorrect: true },
          { text: "Declares a constant that cannot change", isCorrect: false },
          { text: "Creates a global variable only", isCorrect: false },
          { text: "Raises the variable to the top of the file", isCorrect: false },
        ],
      },
      {
        text: "Which HTTP status code means **Not Found**?",
        options: [
          { text: "200", isCorrect: false },
          { text: "301", isCorrect: false },
          { text: "404", isCorrect: true },
          { text: "500", isCorrect: false },
        ],
      },
      {
        text: "In SQL, the ```LIMIT``` clause restricts how many rows a query returns.",
        explanation: "`LIMIT` caps the number of rows returned by a query.",
        type: "TRUE_FALSE",
        options: [
          { text: "True", isCorrect: true },
          { text: "False", isCorrect: false },
        ],
      },
      {
        text: "Which of these are valid **CSS** length units?",
        explanation: "`px`, `rem`, and `vh` are all valid CSS units. `%%` is not.",
        type: "MULTIPLE",
        points: 2,
        options: [
          { text: "px", isCorrect: true },
          { text: "rem", isCorrect: true },
          { text: "vh", isCorrect: true },
          { text: "%%", isCorrect: false },
        ],
      },
      {
        text: "What is the time complexity of binary search on a sorted array?",
        explanation: "Binary search halves the search space each step, giving O(log n).",
        points: 2,
        options: [
          { text: "O(1)", isCorrect: false },
          { text: "O(log n)", isCorrect: true },
          { text: "O(n)", isCorrect: false },
          { text: "O(n²)", isCorrect: false },
        ],
      },
    ],
  },
  {
    slug: "sports-and-movies",
    title: "Sports & Movies",
    description: "Fun mix for casual sessions.",
    emoji: "🎬",
    sortOrder: 2,
    questions: [
      {
        text: "How many players are on a standard football (soccer) team on the pitch?",
        options: [
          { text: "9", isCorrect: false },
          { text: "10", isCorrect: false },
          { text: "11", isCorrect: true },
          { text: "12", isCorrect: false },
        ],
      },
      {
        text: "Which film features the quote **\"May the Force be with you\"**?",
        options: [
          { text: "Star Wars", isCorrect: true },
          { text: "Star Trek", isCorrect: false },
          { text: "The Matrix", isCorrect: false },
          { text: "Dune", isCorrect: false },
        ],
      },
      {
        text: "The Olympic Games are held every four years.",
        explanation: "The Summer and Winter Olympics each run on a four-year cycle.",
        type: "TRUE_FALSE",
        options: [
          { text: "True", isCorrect: true },
          { text: "False", isCorrect: false },
        ],
      },
      {
        text: "Which of these are real Olympic sports?",
        explanation: "Skateboarding, surfing, and climbing all debuted (or returned) at recent Games.",
        type: "MULTIPLE",
        points: 2,
        options: [
          { text: "Skateboarding", isCorrect: true },
          { text: "Surfing", isCorrect: true },
          { text: "Sport climbing", isCorrect: true },
          { text: "Chess boxing", isCorrect: false },
        ],
      },
      {
        text: "Which movie won the first-ever Academy Award for **Best Picture**?",
        explanation: "*Wings* (1927) won the first Best Picture award.",
        points: 2,
        options: [
          { text: "Wings", isCorrect: true },
          { text: "Gone with the Wind", isCorrect: false },
          { text: "Casablanca", isCorrect: false },
          { text: "The Jazz Singer", isCorrect: false },
        ],
      },
    ],
  },
];

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  try {
    await prisma.profile.upsert({
      where: { id: SYSTEM_PROFILE_ID },
      update: { username: "QuizHub" },
      create: {
        id: SYSTEM_PROFILE_ID,
        username: "QuizHub",
        isTemporary: false,
        role: "ADMIN",
      },
    });

    // Rebuild curated content from scratch so re-seeding is idempotent.
    await prisma.curatedQuiz.deleteMany({});
    await prisma.question.deleteMany({ where: { createdById: SYSTEM_PROFILE_ID } });

    for (const quiz of CURATED_QUIZZES) {
      await prisma.curatedQuiz.create({
        data: {
          slug: quiz.slug,
          title: quiz.title,
          description: quiz.description,
          emoji: quiz.emoji,
          sortOrder: quiz.sortOrder,
          questions: {
            create: quiz.questions.map((question, index) => ({
              orderIndex: index,
              points: question.points ?? 1,
              question: {
                create: {
                  createdById: SYSTEM_PROFILE_ID,
                  text: question.text,
                  explanation: question.explanation ?? null,
                  type: question.type ?? "SINGLE",
                  options: {
                    create: question.options.map((option, optionIndex) => ({
                      text: option.text,
                      isCorrect: option.isCorrect,
                      sortOrder: optionIndex,
                    })),
                  },
                },
              },
            })),
          },
        },
      });
      console.log(`✓ Seeded curated quiz: ${quiz.title}`);
    }

    console.log(`\n✓ Seeded ${CURATED_QUIZZES.length} curated quizzes.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
