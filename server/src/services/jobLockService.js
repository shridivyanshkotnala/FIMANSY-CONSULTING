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
    { returnDocument: 'after' }
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

export const failJob = async (jobId, instanceId, errorMessage, nextRunAt, failureMeta = {}) => {
  const now = new Date();
  const update = {
    $set: {
      status: "failed",
      lastError: errorMessage,
      lockedAt: null,
      lockOwner: null,
      nextRunAt,
      lastFailureAt: now,
      lastFailureStatus: failureMeta.status ?? null,
      lastFailureCode: failureMeta.code ?? null,
    },
    $inc: {
      retryCount: 1,
      totalFailures: 1,
      consecutiveFailures: 1,
    },
  };

  if (failureMeta.deadLetter) {
    update.$set.deadLetter = true;
    update.$set.deadLetterAt = now;
    update.$set.deadLetterReason = failureMeta.reason || errorMessage;
  }

  await SyncJob.updateOne(
    { _id: jobId, lockOwner: instanceId },
    update
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
        nextRunAt,
        consecutiveFailures: 0,
        lastSuccessAt: new Date(),
      }
    }
  );
};


