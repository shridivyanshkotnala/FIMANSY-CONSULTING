// models/ledger/receivableLedgerModel.js

import mongoose from "mongoose";

const receivableLedgerSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },

    invoiceId: {
      type: String, // zoho invoice_id
      required: true,
    },

    customerId: String,
    customerName: String,

    invoiceNumber: String,

    invoiceDate: Date,
    dueDate: Date,

    totalAmount: Number,
    paidAmount: Number,
    balanceAmount: Number,

    status: {
      type: String,
      enum: ["open", "partially_paid", "paid", "void", "draft"],
      index: true,
    },

    lastPaymentDate: Date,

    lastSyncedAt: Date,
  },
  { timestamps: true }
);

receivableLedgerSchema.index(
  { organizationId: 1, invoiceId: 1 },
  { unique: true }
);

export const ReceivableLedger = mongoose.model(
  "ReceivableLedger",
  receivableLedgerSchema
);
