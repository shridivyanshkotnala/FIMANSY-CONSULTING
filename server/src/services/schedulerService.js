


import { SyncJob } from "../models/scheduler/syncJobModel.js";
import { acquireJobLock, completeJob, failJob } from "./jobLockService.js";
import { runJobWorker } from "../workers/jobWorker.js";
import { INSTANCE_ID } from "../utils/instanceId.js";
import { ZohoConnection } from "../models/zohoConnectionModel.js";
import { initializeSyncJobs } from "./syncJobInitializer.js";

const LOOP_INTERVAL = 60 * 1000;
const JOB_FREQUENCY = 5 * 60 * 1000;
const LOCK_TIMEOUT = 10 * 60 * 1000;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/**
 * Controlled retry delays
 * Prevents both hammering and infinite delays
 */
function getBackoffDelay(retryCount) {
  if (retryCount <= 1) return 60 * 1000;         // 1 min
  if (retryCount === 2) return 5 * 60 * 1000;    // 5 min
  if (retryCount === 3) return 15 * 60 * 1000;   // 15 min
  return 60 * 60 * 1000;                         // 60 min max
}

export const startScheduler = async () => {
  console.log(`[SCHEDULER] Started instance ${INSTANCE_ID}`);

  // On every startup, ensure all active connections have all required sync jobs.
  // This catches any new job types added after a connection was first created
  // (e.g. sync_credits added later) without needing to re-do OAuth.
  try {
    const connections = await ZohoConnection.find({ status: "connected" });
    for (const conn of connections) {
      await initializeSyncJobs(conn);
    }
    console.log(`[SCHEDULER] Sync jobs seeded for ${connections.length} connection(s)`);
  } catch (err) {
    console.error("[SCHEDULER] Failed to seed sync jobs on startup:", err);
  }

  while (true) {
    try {
      const now = new Date();
      const lockExpiry = new Date(Date.now() - LOCK_TIMEOUT);

      // 1) fetch due jobs (also reclaim dead locks)
      const dueJobs = await SyncJob.find({
        nextRunAt: { $lte: now },
        $or: [
          { status: { $ne: "running" } },
          { lockedAt: { $lt: lockExpiry } }
        ]
      }).limit(10);

      for (const job of dueJobs) {

        // 2) attempt lock
        const locked = await acquireJobLock(job._id, INSTANCE_ID);
        if (!locked) continue;

        console.log(`[SCHEDULER] Lock acquired for ${job.jobType}`);

        try {
          // 3) run worker
          await runJobWorker(job);

          const nextRunAt = new Date(Date.now() + JOB_FREQUENCY);

          await completeJob(job._id, INSTANCE_ID, nextRunAt);

          console.log(`[SCHEDULER] Completed ${job.jobType}`);

        } catch (err) {

          const retryDelay = getBackoffDelay(job.retryCount + 1);
          const nextRunAt = new Date(Date.now() + retryDelay);

          console.error("REAL WORKER ERROR:", err);
          await failJob(job._id, INSTANCE_ID, err.stack || err.message, nextRunAt);

          console.log(`[SCHEDULER] Failed ${job.jobType} → retry in ${retryDelay / 60000} min`);
        }
      }

      console.log(`[SCHEDULER] heartbeat ${new Date().toISOString()}`);

    } catch (err) {
      console.error("[SCHEDULER ERROR]", err);
    }

    await sleep(LOOP_INTERVAL);
  }
};