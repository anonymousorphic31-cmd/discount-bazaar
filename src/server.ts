import "dotenv/config";
import { createApp } from "./app.js";
import { connectDB, closeDB } from "./config/db.js";
import { closeSquadWorker, squadWorker, startFallbackSweep } from "./workers/squadWorker.js";
import { votingWorker } from "./workers/votingResolutionWorker.js";

/**
 * Fail fast if any security-critical secret is missing. The server must never
 * boot in a state where webhook signatures or JWTs cannot be verified — that
 * would silently downgrade security to trust-the-payload.
 */
function assertRequiredEnv(): void {
  const required = ["JWT_SECRET", "SAFEPAY_WEBHOOK_SECRET", "COURIER_WEBHOOK_SECRET"];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error(
      `[server] FATAL: missing required environment variables: ${missing.join(", ")}. ` +
        "Refusing to boot without these security secrets.",
    );
    process.exit(1);
  }
}

async function bootstrap(): Promise<void> {
  assertRequiredEnv();

  const port = Number(process.env.PORT ?? 4000);

  try {
    await connectDB();
    const app = createApp();

    const server = app.listen(port, () => {
      console.info(`[server] DiscountBazaar API listening on :${port}`);
    });

    // Start the periodic fallback sweep that catches squads whose BullMQ jobs
    // were dropped by a Redis restart.
    startFallbackSweep();

    const shutdown = async (signal: string): Promise<void> => {
      console.info(`\n[server] ${signal} received, shutting down...`);
      server.close(async () => {
        await closeSquadWorker();
        await closeDB();
        process.exit(0);
      });
    };

    console.info(`[server] squad-resolution worker online (id=${squadWorker.id}).`);
    console.info(`[server] voting-resolution worker online (id=${votingWorker.id}).`);

    process.on("SIGINT", () => void shutdown("SIGINT"));
    process.on("SIGTERM", () => void shutdown("SIGTERM"));
  } catch (err) {
    console.error("[server] bootstrap failed:", err);
    process.exit(1);
  }
}

void bootstrap();
