import { SyncJob } from "../models/scheduler/syncJobModel.js";
import { acquireJobLock, completeJob, failJob } from "./jobLockService.js";
import { runJobWorker } from "../workers/jobWorker.js";
import { INSTANCE_ID } from "../utils/instanceId.js";
import { ZohoConnection } from "../models/zohoConnectionModel.js";
import { initializeSyncJobs } from "./syncJobInitializer.js";

const DEFAULT_LOOP_INTERVAL = Number(process.env.SCHEDULER_LOOP_INTERVAL_MS || 60 * 1000);
const BANK_LOOP_INTERVAL = Number(process.env.SCHEDULER_BANK_LOOP_INTERVAL_MS || 30 * 1000);

const DEFAULT_JOB_FREQUENCY = Number(process.env.SCHEDULER_JOB_FREQUENCY_MS || 5 * 60 * 1000);
const BANK_JOB_FREQUENCY = Number(process.env.SCHEDULER_BANK_JOB_FREQUENCY_MS || 2 * 60 * 1000);

const LOCK_TIMEOUT = 10 * 60 * 1000;

const BANK_JOB_TYPES = ["sync_bank_feeds"];

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

const getJobFrequency = (jobType) => {
  if (jobType === "sync_bank_feeds") return BANK_JOB_FREQUENCY;
  return DEFAULT_JOB_FREQUENCY;
};

const runSchedulerLoop = async ({ laneName, loopInterval, includeJobTypes = null, excludeJobTypes = null }) => {
  console.log(`[SCHEDULER:${laneName}] Loop started on instance ${INSTANCE_ID}`);

  while (true) {
    try {
      const now = new Date();
      const lockExpiry = new Date(Date.now() - LOCK_TIMEOUT);

      const query = {
        nextRunAt: { $lte: now },
        $or: [
          { status: { $ne: "running" } },
          { lockedAt: { $lt: lockExpiry } }
        ]
      };

      if (Array.isArray(includeJobTypes) && includeJobTypes.length > 0) {
        query.jobType = { $in: includeJobTypes };
      }

      if (Array.isArray(excludeJobTypes) && excludeJobTypes.length > 0) {
        query.jobType = {
          ...(query.jobType || {}),
          $nin: excludeJobTypes,
        };
      }

      // Fetch due jobs for this lane only
      const dueJobs = await SyncJob.find(query)
        .sort({ nextRunAt: 1 })
        .limit(10);

      for (const job of dueJobs) {
        const locked = await acquireJobLock(job._id, INSTANCE_ID);
        if (!locked) continue;

        console.log(`[SCHEDULER:${laneName}] Lock acquired for ${job.jobType}`);

        try {
          await runJobWorker(job);

          const nextRunAt = new Date(Date.now() + getJobFrequency(job.jobType));
          await completeJob(job._id, INSTANCE_ID, nextRunAt);

          console.log(`[SCHEDULER:${laneName}] Completed ${job.jobType}`);
        } catch (err) {
          const retryDelay = getBackoffDelay(job.retryCount + 1);
          const nextRunAt = new Date(Date.now() + retryDelay);

          console.error(`[SCHEDULER:${laneName}] REAL WORKER ERROR:`, err);
          await failJob(job._id, INSTANCE_ID, err.stack || err.message, nextRunAt);

          console.log(`[SCHEDULER:${laneName}] Failed ${job.jobType} → retry in ${retryDelay / 60000} min`);
        }
      }

      console.log(`[SCHEDULER:${laneName}] heartbeat ${new Date().toISOString()}`);
    } catch (err) {
      console.error(`[SCHEDULER:${laneName} ERROR]`, err);
    }

    await sleep(loopInterval);
  }
};

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

  // Phase 2: split lanes so bank feed updates are not blocked by heavier jobs.
  // Optional deployment modes:
  // - SCHEDULER_MODE=bank-only -> only bank lane
  // - SCHEDULER_MODE=core-only -> only non-bank lane
  // - default (or split) -> both lanes in same process
  const mode = String(process.env.SCHEDULER_MODE || "split").toLowerCase();

  if (mode === "bank-only") {
    void runSchedulerLoop({
      laneName: "BANK",
      loopInterval: BANK_LOOP_INTERVAL,
      includeJobTypes: BANK_JOB_TYPES,
    });
    return;
  }

  if (mode === "core-only") {
    void runSchedulerLoop({
      laneName: "CORE",
      loopInterval: DEFAULT_LOOP_INTERVAL,
      excludeJobTypes: BANK_JOB_TYPES,
    });
    return;
  }

  // Default split mode: both lanes active.
  void runSchedulerLoop({
    laneName: "BANK",
    loopInterval: BANK_LOOP_INTERVAL,
    includeJobTypes: BANK_JOB_TYPES,
  });

  void runSchedulerLoop({
    laneName: "CORE",
    loopInterval: DEFAULT_LOOP_INTERVAL,
    excludeJobTypes: BANK_JOB_TYPES,
  });
};