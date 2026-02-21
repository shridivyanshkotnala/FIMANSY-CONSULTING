import { SyncJob } from "../models/scheduler/syncJobModel.js";

const LOCK_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

export const acquireJobLock = async (jobId, instanceId) => {
  const now = new Date();
  const lockExpiry = new Date(now.getTime() - LOCK_TIMEOUT_MS);

  const job = await SyncJob.findOneAndUpdate(
    {
      _id: jobId,
      $or: [
        { status: { $ne: "running" } },
        { lockedAt: { $lt: lockExpiry } } // expired lock
      ]
    },
    {
      $set: {
        status: "running",
        lockedAt: now,
        lockOwner: instanceId,
        lastRunAt: now,
        lastError: null
      }
    },
    { new: true }
  );

  return !!job; // true if lock acquired
};


export const releaseJobLock = async (jobId, instanceId) => {
  await SyncJob.updateOne(
    { _id: jobId, lockOwner: instanceId },
    {
      $set: {
        status: "idle",
        lockedAt: null,
        lockOwner: null
      }
    }
  );

};


//Retry handler 

export const failJob = async (jobId, instanceId, errorMessage, nextRunAt) => {
  await SyncJob.updateOne(
    { _id: jobId, lockOwner: instanceId },
    {
      $set: {
        status: "failed",
        lastError: errorMessage,
        lockedAt: null,
        lockOwner: null,
        nextRunAt
      },
      $inc: { retryCount: 1 }
    }
  );
};



export const completeJob = async (jobId, instanceId, nextRunAt) => {
  await SyncJob.updateOne(
    { _id: jobId, lockOwner: instanceId },
    {
      $set: {
        status: "idle",
        lockedAt: null,
        lockOwner: null,
        retryCount: 0,
        nextRunAt
      }
    }
  );
};


