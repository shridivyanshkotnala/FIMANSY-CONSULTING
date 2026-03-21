


import { SyncJob } from "../models/scheduler/syncJobModel.js";
import { acquireJobLock, completeJob, failJob } from "./jobLockService.js";
import { runJobWorker } from "../workers/jobWorker.js";
import { INSTANCE_ID } from "../utils/instanceId.js";
import { ZohoConnection } from "../models/zohoConnectionModel.js";
import { initializeSyncJobs } from "./syncJobInitializer.js";

const LOOP_INTERVAL = 60 * 1000;
const JOB_FREQUENCY = 5 * 60 * 1000;
const LOCK_TIMEOUT = 10 * 60 * 1000;
const RECONCILE_EVERY_LOOPS = 5;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const JOB_STAGGER_MS = {
  sync_invoices: 0,
  sync_payments: 45 * 1000,
  sync_credits: 90 * 1000,
  generate_dso_metrics: 135 * 1000,
  sync_bank_feeds: 180 * 1000,
  sync_vendor_payments: 225 * 1000,
};

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

const normalizeRetryDelay = (ms, fallback) => {
  if (!Number.isFinite(ms) || ms <= 0) return fallback;
  const min = 60 * 1000;
  const max = 2 * 60 * 60 * 1000;
  return Math.min(max, Math.max(min, ms));
};

const reconcileSyncJobs = async () => {
  const connections = await ZohoConnection.find({ status: { $ne: "revoked" } });
  let totalUpserted = 0;

  for (const conn of connections) {
    const result = await initializeSyncJobs(conn);
    totalUpserted += result?.upsertedCount || 0;
  }

  return { connectionCount: connections.length, upsertedCount: totalUpserted };
};

export const startScheduler = async () => {
  console.log(`[SCHEDULER] Started instance ${INSTANCE_ID}`);
  let loopCount = 0;

  // On every startup, ensure all active connections have all required sync jobs.
  // This catches any new job types added after a connection was first created
  // (e.g. sync_credits added later) without needing to re-do OAuth.
  try {
    const seeded = await reconcileSyncJobs();
    console.log(`[SCHEDULER] Sync jobs reconciled on startup for ${seeded.connectionCount} connection(s), newly created jobs=${seeded.upsertedCount}`);
  } catch (err) {
    console.error("[SCHEDULER] Failed to seed sync jobs on startup:", err);
  }

  while (true) {
    try {
      loopCount += 1;

      if (loopCount % RECONCILE_EVERY_LOOPS === 0) {
        try {
          const reconciled = await reconcileSyncJobs();
          if (reconciled.upsertedCount > 0) {
            console.log(`[SCHEDULER] Self-heal created ${reconciled.upsertedCount} missing sync jobs`);
          }
        } catch (reconcileErr) {
          console.error("[SCHEDULER] Periodic job reconciliation failed", reconcileErr);
        }
      }

      const now = new Date();
      const lockExpiry = new Date(Date.now() - LOCK_TIMEOUT);

      // 1) fetch due jobs (also reclaim dead locks)
      const dueJobs = await SyncJob.find({
        jobType: { $ne: "sync_vendor_payments" },
        nextRunAt: { $lte: now },
        $or: [
          { status: { $ne: "running" } },
          { lockedAt: { $lt: lockExpiry } }
        ]
      }).sort({ nextRunAt: 1 }).limit(10);

      if (dueJobs.length === 0) {
        const [totalJobs, runningJobs, failedJobs] = await Promise.all([
          SyncJob.countDocuments({}),
          SyncJob.countDocuments({ status: "running" }),
          SyncJob.countDocuments({ status: "failed" }),
        ]);

        console.log(`[SCHEDULER] No due jobs. total=${totalJobs} running=${runningJobs} failed=${failedJobs} now=${now.toISOString()}`);
      }

      for (const job of dueJobs) {

        // 2) attempt lock
        const locked = await acquireJobLock(job._id, INSTANCE_ID);
        if (!locked) continue;

        console.log(`[SCHEDULER] Lock acquired for ${job.jobType}`);

        try {
          // 3) run worker
          await runJobWorker(job);

          const stagger = JOB_STAGGER_MS[job.jobType] ?? 0;
          const nextRunAt = new Date(Date.now() + JOB_FREQUENCY + stagger);

          await completeJob(job._id, INSTANCE_ID, nextRunAt);

          console.log(`[SCHEDULER] Completed ${job.jobType}`);

        } catch (err) {
          const fallbackDelay = getBackoffDelay(job.retryCount + 1);
          const retryDelay = normalizeRetryDelay(err?.retryAfterMs, fallbackDelay);
          const nextRunAt = new Date(Date.now() + retryDelay);

          console.error("REAL WORKER ERROR:", {
            jobType: job.jobType,
            connectionId: String(job.connectionId),
            retryCount: job.retryCount,
            retryDelayMs: retryDelay,
            message: err?.message,
            stack: err?.stack,
          });
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