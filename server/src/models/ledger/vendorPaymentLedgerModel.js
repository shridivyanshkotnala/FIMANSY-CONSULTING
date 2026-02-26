import mongoose from "mongoose";

const vendorPaymentLedgerSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    zohoPaymentId: {
      type: String,
      required: true,
    },

    paymentNumber: {
      type: String,
      trim: true,
      index: true,
    },

    paymentDate: {
      type: Date,
      required: true,
      index: true,
    },

    vendorId: {
      type: String,
      index: true,
    },

    vendorName: {
      type: String,
      trim: true,
      index: true,
    },

    amount: {
      type: Number,
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: [
        "pending",
        "processing",
        "completed",
        "failed",
        "cancelled"
      ],
      index: true,
    },

    utrNumber: {
      type: String,
      trim: true,
      index: true,
    },

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    lastSyncedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, // createdAt + updatedAt
  }
);

//
// 🔐 Prevent duplicate ledger rows
//
vendorPaymentLedgerSchema.index(
  { organizationId: 1, zohoPaymentId: 1 },
  { unique: true }
);

//
// ⚡ Optimized indexes for UI queries
//
vendorPaymentLedgerSchema.index({
  organizationId: 1,
  status: 1,
  paymentDate: -1,
});

vendorPaymentLedgerSchema.index({
  organizationId: 1,
  vendorName: 1,
});

export const VendorPaymentLedger = mongoose.model(
  "VendorPaymentLedger",
  vendorPaymentLedgerSchema
);