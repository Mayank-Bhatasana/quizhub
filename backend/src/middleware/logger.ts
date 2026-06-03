import type { Request, Response, NextFunction } from "express";

// ── ANSI colour helpers ──────────────────────────────────────────────────────

const reset = "\x1b[0m";

const statusColor = (code: number): string => {
  if (code >= 500) return `\x1b[31m${code}${reset}`; // red
  if (code >= 400) return `\x1b[33m${code}${reset}`; // yellow
  if (code >= 300) return `\x1b[36m${code}${reset}`; // cyan
  return `\x1b[32m${code}${reset}`; // green
};

const METHOD_COLORS: Record<string, string> = {
  GET: "\x1b[34m",     // blue
  POST: "\x1b[32m",    // green
  PUT: "\x1b[33m",     // yellow
  PATCH: "\x1b[35m",   // magenta
  DELETE: "\x1b[31m",  // red
  HEAD: "\x1b[36m",    // cyan
  OPTIONS: "\x1b[37m", // white
};

const methodColor = (method: string): string =>
  `${METHOD_COLORS[method] ?? "\x1b[37m"}${method.padEnd(7)}${reset}`;

// ── Middleware ───────────────────────────────────────────────────────────────

/**
 * Logs every completed HTTP request with:
 *   timestamp · requestId · method · path · status · elapsed time · IP
 *
 * Listens on the "finish" event so the status code is always final.
 */
export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const startedAt = process.hrtime.bigint();
  const requestId = (req as any).requestId ?? "-";

  res.on("finish", () => {
    const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const ip = req.ip ?? req.socket?.remoteAddress ?? "?";
    const ts = new Date().toISOString();

    console.log(
      `\x1b[90m${ts}\x1b[0m ` +           // dim timestamp
      `\x1b[90m[${requestId}]\x1b[0m ` +   // dim request ID
      `${methodColor(req.method)} ` +
      `${req.originalUrl.padEnd(40)} ` +
      `${statusColor(res.statusCode)} ` +
      `\x1b[90m${elapsedMs.toFixed(2)}ms  ${ip}\x1b[0m`,
    );
  });

  next();
};
