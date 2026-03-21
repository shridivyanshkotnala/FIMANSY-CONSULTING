import mongoose from "mongoose";

const syncJobSchema = new mongoose.Schema(
  {
    // What pipeline this job runs
    jobType: {
      type: String,
      enum: [
        "sync_invoices",
        "sync_payments",
        "sync_credits",
        "generate_dso_metrics",
        "sync_bank_feeds" ,// ✅ added
        "sync_vendor_payments"
      ],
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

    // Generic single cursor (used by invoice/payment jobs)
    cursor: {
      type: String,
      default: "1970-01-01T00:00:00+00:00",
    },

    // ✅ NEW: Meta object for complex job cursors (bank feeds etc)
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {
        lastBankAccountSync: "1970-01-01T00:00:00+00:00",
        lastTransactionSync: {}, // { bankAccountId: lastModifiedTime }
      },
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

    // Dead-letter support: permanently pause a repeatedly failing job
    deadLetter: {
      type: Boolean,
      default: false,
      index: true,
    },

    deadLetterAt: {
      type: Date,
      default: null,
    },

    deadLetterReason: {
      type: String,
      default: null,
    },

    // Failure metrics (phase-2 observability)
    totalFailures: {
      type: Number,
      default: 0,
    },

    consecutiveFailures: {
      type: Number,
      default: 0,
    },

    lastFailureAt: {
      type: Date,
      default: null,
    },

    lastFailureStatus: {
      type: Number,
      default: null,
    },

    lastFailureCode: {
      type: String,
      default: null,
    },

    lastSuccessAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// 🔐 Ensure one job per connection per type
syncJobSchema.index(
  { connectionId: 1, jobType: 1 },
  { unique: true }
);

export const SyncJob = mongoose.model("SyncJob", syncJobSchema);