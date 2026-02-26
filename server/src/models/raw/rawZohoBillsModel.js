import mongoose from "mongoose";

const rawZohoBillSchema = new mongoose.Schema(
  {
    connectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ZohoConnection",
      required: true,
    },

    billId: { type: String, required: true },
    billNumber: String,

    vendorId: String,
    vendorName: String,

    status: String,
    date: Date,
    dueDate: Date,

    total: Number,
    balance: Number,

    raw: mongoose.Schema.Types.Mixed, // full Zoho payload
  },
  { timestamps: true }
);

rawZohoBillSchema.index({ connectionId: 1, billId: 1 }, { unique: true });

export const RawZohoBill = mongoose.model(
  "RawZohoBill",
  rawZohoBillSchema
);