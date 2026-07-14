import jwt from "jsonwebtoken";
import { type AuthPayload } from "../types/express.js";

/**
 * Signs a JWT carrying the user's id and role.
 */
export function signToken(payload: AuthPayload): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not configured.");
  }
  const expiresIn = process.env.JWT_EXPIRES_IN ?? "7d";
  return jwt.sign(payload, secret, { expiresIn: expiresIn as unknown as jwt.SignOptions["expiresIn"] });
}

/**
 * Generates a 6-digit numeric OTP and its expiry timestamp.
 */
export function generateOtp(): { code: string; expiresAt: Date } {
  const code = Math.floor(100_000 + Math.random() * 900_000).toString();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
  return { code, expiresAt };
}
