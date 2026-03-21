import mongoose from "mongoose";

const bankReconQuerySchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BankTransactionLedger",
      required: true,
      index: true,
    },
    queryMessage: {
      type: String,
      required: true,
      trim: true,
    },
    transactionDetails: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      default: {},
    },
    // true => pending query, false => resolved by accountant
    status: {
      type: Boolean,
      default: true,
      index: true,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

bankReconQuerySchema.index({ organizationId: 1, transactionId: 1, status: 1 });

export const BankReconQuery = mongoose.model("bankReconQuery", bankReconQuerySchema);
