import "express";

/**
 * Fields attached to Express's Request after JWT verification.
 */
export interface AuthPayload {
  userId: string;
  role: "Buyer" | "Supplier" | "Admin";
}

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthPayload;
  }
}

export {};
