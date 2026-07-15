import express, { type Application, type Request } from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import escrowRoutes from "./routes/escrowRoutes.js";
import squadRoutes from "./routes/squadRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import disputeRoutes from "./routes/disputeRoutes.js";
import userRoutes from "./routes/userRoutes.js";

/**
 * Express application factory.
 *
 * Kept separate from server.ts so it can be imported in tests without binding
 * a port.
 */
export function createApp(): Application {
  const app = express();

  const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  app.use(
    cors({
      origin: allowedOrigins.length ? allowedOrigins : true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true,
    }),
  );

  // Capture the raw body for the Safepay webhook so we can verify the
  // signature against the exact bytes Safepay signed. The raw string is
  // stashed on req.rawBody before JSON parsing happens.
  app.use(
    express.json({
      limit: "2mb",
      verify: (req: Request, _res, buf) => {
        if (req.url?.startsWith("/api/escrow/webhook")) {
          req.rawBody = buf.toString("utf8");
        }
      },
    }),
  );
  app.use(express.urlencoded({ extended: true }));

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok", uptime: process.uptime() });
  });

  // Feature routes
  app.use("/api/auth", authRoutes);
  app.use("/api/products", productRoutes);
  app.use("/api/escrow", escrowRoutes);
  app.use("/api/squads", squadRoutes);
  app.use("/api/orders", orderRoutes);
  app.use("/api/disputes", disputeRoutes);
  app.use("/api/users", userRoutes);

  return app;
}
