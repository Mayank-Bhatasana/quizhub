import type { Request, Response, NextFunction } from "express";

/**
 * Adds a sensible set of security-hardening HTTP headers without
 * requiring an external package like helmet.
 *
 * Headers applied:
 *  - X-Content-Type-Options: nosniff          → prevents MIME sniffing
 *  - X-Frame-Options: DENY                    → blocks clickjacking
 *  - X-XSS-Protection: 1; mode=block          → legacy XSS filter
 *  - Referrer-Policy: strict-origin-when-cross-origin
 *  - Permissions-Policy                       → disables unused browser APIs
 *  - Cross-Origin-Opener-Policy: same-origin
 *  - Cross-Origin-Resource-Policy: same-site
 *  - X-Powered-By removed                     → hides Express fingerprint
 */
export const securityHeaders = (
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  res.removeHeader("X-Powered-By");

  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=(), payment=()",
  );
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin"); // allow API responses to cross origins

  next();
};
