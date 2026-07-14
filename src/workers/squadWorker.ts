import { Queue, Worker, type Job } from "bullmq";
import Squad from "../models/Squad.js";
import { SquadStatus as SquadStatusEnum } from "../types/enums.js";

/* ------------------------------------------------------------------ */
/* Redis connection                                                   */
/* ------------------------------------------------------------------ */

const redisUrl = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";

/**
 * Queue used by the escrow webhook to schedule 24-hour squad resolution.
 *
 * We pass the Redis URL as a plain string so BullMQ creates its own
 * connections from its bundled ioredis — avoiding a version-mismatch with a
 * separately installed ioredis package.
 */
export const squadResolutionQueue = new Queue("squad-resolution", {
  connection: { url: redisUrl },
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5_000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});

/* ------------------------------------------------------------------ */
/* Worker processor                                                   */
/* ------------------------------------------------------------------ */

interface SquadResolutionJobData {
  squadId: string;
}

/**
 * When a squad's 24-hour lock elapses, this processor runs. If the squad
 * hasn't reached its target membership we flip it into the Voting phase so
 * buyers can decide to proceed at the current dynamic discount or opt out.
 *
 * If the squad already filled (Captured) or was resolved by an admin, we
 * treat the job as a no-op so a stale scheduled job can't undo a resolution.
 */
async function processSquadResolution(job: Job<SquadResolutionJobData>): Promise<void> {
  const { squadId } = job.data;
  console.info(`[squadWorker] processing squad ${squadId} (job ${job.id})`);

  const squad = await Squad.findById(squadId);
  if (!squad) {
    console.warn(`[squadWorker] squad ${squadId} not found — discarding job.`);
    return;
  }

  // Only Gathering squads are eligible for the Voting transition.
  if (squad.status !== SquadStatusEnum.Gathering) {
    console.info(
      `[squadWorker] squad ${squadId} status is ${squad.status} — no action.`,
    );
    return;
  }

  if (squad.currentMembers < squad.targetMembers) {
    squad.status = SquadStatusEnum.Voting;
    await squad.save();
    console.info(`[squadWorker] squad ${squadId} moved to Voting.`);
  } else {
    // Defensive: target was hit but status wasn't flipped (e.g. race with
    // webhook). Lock it in as Captured.
    squad.status = SquadStatusEnum.Captured;
    squad.capturedAt = squad.capturedAt ?? new Date();
    await squad.save();
    console.info(`[squadWorker] squad ${squadId} confirmed as Captured.`);
  }
}

/** BullMQ worker instance. Exported so server.ts can log its id on bootstrap. */
export const squadWorker = new Worker<SquadResolutionJobData>(
  "squad-resolution",
  processSquadResolution,
  {
    connection: { url: redisUrl },
    concurrency: 5,
  },
);

squadWorker.on("completed", (job) => {
  console.info(`[squadWorker] job ${job.id} completed.`);
});

squadWorker.on("failed", (job, err) => {
  console.error(`[squadWorker] job ${job?.id} failed: ${err.message}`);
});

/** Graceful shutdown for the worker — called from server.ts on SIGINT. */
export async function closeSquadWorker(): Promise<void> {
  await squadWorker.close();
  await squadResolutionQueue.close();
}
