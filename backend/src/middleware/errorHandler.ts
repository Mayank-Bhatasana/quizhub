import type { Request, Response, NextFunction } from "express";

// ── AppError ─────────────────────────────────────────────────────────────────

/**
 * Throw this anywhere in route handlers / services.
 * The global errorHandler will convert it to the correct HTTP response.
 *
 * @example
 *   throw new AppError(404, "Room not found", "ROOM_NOT_FOUND");
 */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "AppError";
    // Maintains correct prototype chain for instanceof checks
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

// ── 404 handler ──────────────────────────────────────────────────────────────

/**
 * Catch-all for routes that were not matched.
 * Must be registered AFTER all other routes.
 */
export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    error: "Not Found",
    message: `Cannot ${req.method} ${req.originalUrl}`,
    requestId: (req as any).requestId,
  });
};

// ── Global error handler ──────────────────────────────────────────────────────

/**
 * Centralised Express error handler.
 * Must be registered with FOUR parameters so Express recognises it as an
 * error-handling middleware.
 *
 * Handles:
 *  - AppError instances              → structured JSON with correct status
 *  - CORS rejections                 → 403
 *  - JSON body-parse failures        → 400
 *  - Prisma unique-constraint errors → 409
 *  - Everything else                 → 500 (detail hidden in production)
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  const requestId = (req as any).requestId ?? "-";
  const isProd = process.env.NODE_ENV === "production";

  // -- Known operational errors --
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
      ...(err.code && { code: err.code }),
      requestId,
    });
    return;
  }

  // -- CORS rejection --
  if (err.message === "Not allowed by CORS") {
    res.status(403).json({ error: "CORS: origin not allowed", requestId });
    return;
  }

  // -- Body-parse failure (express.json) --
  if ((err as any).type === "entity.parse.failed") {
    res.status(400).json({ error: "Invalid JSON body", requestId });
    return;
  }

  // -- Prisma unique-constraint violation --
  if ((err as any).code === "P2002") {
    res.status(409).json({
      error: "A record with that value already exists",
      requestId,
    });
    return;
  }

  // -- Unexpected error: log and return generic 500 --
  console.error(
    `\x1b[31m[ERROR]\x1b[0m [${requestId}] ${req.method} ${req.originalUrl}`,
    err,
  );

  res.status(500).json({
    error: "Internal server error",
    requestId,
    ...(!isProd && { detail: err.message }),
  });
};
