import { randomBytes } from "crypto";
import type { Request, Response, NextFunction } from "express";

/**
 * Attaches a unique X-Request-ID header to every request/response.
 * Useful for distributed tracing and log correlation.
 */
export const requestIdMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // Honour an upstream-provided ID (e.g. from a load balancer) or generate one
  const id =
    (req.headers["x-request-id"] as string) ||
    randomBytes(8).toString("hex");

  (req as any).requestId = id;
  res.setHeader("X-Request-ID", id);
  next();
};
