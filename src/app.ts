import express, { type Application } from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import productRoutes from "./routes/productRoutes.js";

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

  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok", uptime: process.uptime() });
  });

  // Feature routes
  app.use("/api/auth", authRoutes);
  app.use("/api/products", productRoutes);

  return app;
}
