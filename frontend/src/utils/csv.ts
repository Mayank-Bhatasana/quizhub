import type { LeaderboardEntry } from "../services/quizApi";

function escapeCsv(value: string | number | null | undefined): string {
  const str = value == null ? "" : String(value);
  return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

/** Builds a CSV document from a room's leaderboard. */
export function scoreboardToCsv(roomCode: string, entries: LeaderboardEntry[]): string {
  const header = ["Rank", "Name", "Score", "Correct", "Total", "Answered", "Time (s)"];
  const rows = entries.map((entry, index) => [
    index + 1,
    entry.name,
    entry.score,
    entry.correct,
    entry.total,
    entry.answered,
    entry.timeSeconds,
  ]);
  const lines = [header, ...rows].map((row) => row.map(escapeCsv).join(","));
  return `# QuizHub results — room ${roomCode}\n${lines.join("\n")}\n`;
}

/** Triggers a browser download for the given CSV text. */
export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
