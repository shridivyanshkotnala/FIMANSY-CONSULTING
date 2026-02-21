import mongoose from "mongoose";

const syncJobSchema = new mongoose.Schema(
  {
    // What pipeline this job runs
    jobType: {
      type: String,
      enum: ["sync_invoices", "sync_payments"],
      required: true,
      index: true,
    },

    // Which Zoho connection this belongs to
    connectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ZohoConnection",
      required: true,
      index: true,
    },

    // Incremental sync position (last_modified_time from Zoho)
    cursor: {
      type: String,
      default: "1970-01-01T00:00:00+00:00",
    },

    // Human readable job state
    status: {
      type: String,
      enum: ["idle", "running", "failed"],
      default: "idle",
      index: true,
    },

    // When scheduler should run it again
    nextRunAt: {
      type: Date,
      required: true,
      index: true,
    },

    // Locking mechanism (prevents duplicate workers)
    lockedAt: {
      type: Date,
      default: null,
      index: true,
    },

    lockOwner: {
      type: String,
      default: null,
    },

    // Retry tracking
    retryCount: {
      type: Number,
      default: 0,
    },

    // Debugging info
    lastError: {
      type: String,
      default: null,
    },

    lastRunAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);


syncJobSchema.index(
  { connectionId: 1, jobType: 1 },
  { unique: true }
);

//You must never have two invoice sync jobs for same connection.
//This ensures that per connection only single bot is responsible for syncing invoices, preventing race conditions

export const SyncJob = mongoose.model("SyncJob" , syncJobSchema);


