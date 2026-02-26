import mongoose from "mongoose";

const payableLedgerSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },

    connectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ZohoConnection",
      required: true,
    },

    billId: String,
    billNumber: String,

    vendorId: String,
    vendorName: String,

    billDate: Date,
    dueDate: Date,

    totalAmount: Number,
    balanceAmount: Number,

    status: String, // open, partially_paid, paid

  },
  { timestamps: true }
);

payableLedgerSchema.index(
  { organizationId: 1, billId: 1 },
  { unique: true }
);

export const PayableLedger = mongoose.model(
  "PayableLedger",
  payableLedgerSchema
);