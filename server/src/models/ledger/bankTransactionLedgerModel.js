import mongoose from "mongoose";

const bankTransactionLedgerSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    zohoTransactionId: {
      type: String,
      required: true,
    },

    zohoBankAccountId: {
      type: String,
      required: true,
      index: true,
    },

    transactionDate: {
      type: Date,
      required: true,
      index: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    type: {
      type: String,
      enum: ["debit", "credit"],
      required: true,
      index: true,
    },

    description: {
      type: String,
      trim: true,
      index: true,
    },

    referenceNumber: {
      type: String,
      trim: true,
    },

    reconciliationStatus: {
      type: String,
      enum: ["unreconciled", "matched", "manual", "ignored"],
      default: "unreconciled",
      index: true,
    },

    matchedEntityType: {
      type: String,
      enum: ["invoice", "bill", "manual", null],
      default: null,
    },
    matchedEntityId: {
      type: String,
      default: null
    },

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    zohoReconciliationData: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    category: {
      type: String,
      default: null,
      index: true,
    },

    lastSyncedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, // adds createdAt + updatedAt
  }
);

// ------------------------------------
// 🔐 Prevent duplicate ledger entries
// ------------------------------------
bankTransactionLedgerSchema.index(
  { organizationId: 1, zohoTransactionId: 1 },
  { unique: true }
);

// ------------------------------------
// ⚡ Optimized Query Indexes
// ------------------------------------

// Dashboard summary
bankTransactionLedgerSchema.index({
  organizationId: 1,
  type: 1,
  reconciliationStatus: 1,
});

// Transaction listing
bankTransactionLedgerSchema.index({
  organizationId: 1,
  zohoBankAccountId: 1,
  transactionDate: -1,
});

// Search-friendly
bankTransactionLedgerSchema.index({
  organizationId: 1,
  description: 1,
});


bankTransactionLedgerSchema.index({
  organizationId: 1,
  isDeleted: 1,
  type: 1,
  reconciliationStatus: 1
});

export const BankTransactionLedger = mongoose.model(
  "BankTransactionLedger",
  bankTransactionLedgerSchema
);