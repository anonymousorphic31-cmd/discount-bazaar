import { type NextFunction, type Request, type Response } from "express";
import jwt from "jsonwebtoken";
import { type AuthPayload } from "../types/express.js";

/**
 * Verifies the JWT carried in `Authorization: Bearer <token>`.
 *
 * On success attaches `req.user = { userId, role }` and calls next().
 * On failure responds 401 (missing/malformed) or 403 (invalid/expired token).
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or malformed Authorization header." });
    return;
  }

  const token = header.slice("Bearer ".length).trim();
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error("[auth] JWT_SECRET is not configured.");
    res.status(500).json({ error: "Server auth configuration error." });
    return;
  }

  try {
    const decoded = jwt.verify(token, secret) as AuthPayload;
    if (!decoded.userId || !decoded.role) {
      res.status(403).json({ error: "Invalid token payload." });
      return;
    }
    req.user = decoded;
    next();
  } catch {
    res.status(403).json({ error: "Invalid or expired token." });
  }
}

/**
 * Role guard — place after `requireAuth` on a route chain.
 *
 *   router.post("/", requireAuth, requireRole("Admin"), handler);
 */
export function requireRole(...roles: AuthPayload["role"][]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required." });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: "Insufficient permissions." });
      return;
    }
    next();
  };
}
