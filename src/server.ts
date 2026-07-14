import "dotenv/config";
import { createApp } from "./app.js";
import { connectDB, closeDB } from "./config/db.js";
import { closeSquadWorker, squadWorker } from "./workers/squadWorker.js";

async function bootstrap(): Promise<void> {
  const port = Number(process.env.PORT ?? 4000);

  try {
    await connectDB();
    const app = createApp();

    const server = app.listen(port, () => {
      console.info(`[server] DiscountBazaar API listening on :${port}`);
    });

    const shutdown = async (signal: string): Promise<void> => {
      console.info(`\n[server] ${signal} received, shutting down...`);
      server.close(async () => {
        await closeSquadWorker();
        await closeDB();
        process.exit(0);
      });
    };

    console.info(`[server] squad-resolution worker online (id=${squadWorker.id}).`);

    process.on("SIGINT", () => void shutdown("SIGINT"));
    process.on("SIGTERM", () => void shutdown("SIGTERM"));
  } catch (err) {
    console.error("[server] bootstrap failed:", err);
    process.exit(1);
  }
}

void bootstrap();
