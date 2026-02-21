import { SyncJob } from "../models/scheduler/syncJobModel.js";

const FIVE_MINUTES = 5 * 60 * 1000;

/**
 * Ensures required sync pipelines exist for a Zoho connection
 * Safe to call multiple times
 */
export const initializeSyncJobs = async (connection) => {
  const baseNextRun = new Date(Date.now() + 10 * 1000); 
  // small delay so OAuth response finishes first

  //In future we can add more jobs here like sync customers, sync items etc. For now we are only adding invoices and payments sync jobs as they are critical for our use case. We can also make this dynamic by having a separate collection for job types and their configurations, but for now we will keep it simple and hardcoded.
  
  const jobs = [
    { jobType: "sync_invoices" },
    { jobType: "sync_payments" },
  ];

  for (const job of jobs) {
    await SyncJob.findOneAndUpdate(
      {
        connectionId: connection._id,
        jobType: job.jobType,
      },
      {
        $setOnInsert: {
          connectionId: connection._id,
          jobType: job.jobType,
          cursor: "1970-01-01T00:00:00+00:00",
          status: "idle",
          retryCount: 0,
          nextRunAt: baseNextRun,
        },
      },
      { upsert: true, new: true }
    );
  }
};
