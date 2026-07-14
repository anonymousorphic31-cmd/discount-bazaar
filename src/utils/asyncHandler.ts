import { type Request, type Response } from "express";

/**
 * Wraps an async controller so rejected promises hit the error boundary
 * instead of crashing the process. Keeps handlers readable.
 */
export function asyncHandler(
  fn: (req: Request, res: Response) => Promise<void>,
): (req: Request, res: Response) => Promise<void> {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      await fn(req, res);
    } catch (err) {
      console.error("[asyncHandler] unhandled:", err);
      res.status(500).json({ error: "Internal server error." });
    }
  };
}
