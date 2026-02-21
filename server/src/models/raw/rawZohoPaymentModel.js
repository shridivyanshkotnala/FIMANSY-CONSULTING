import mongoose from "mongoose";

const rawZohoPaymentSchema = new mongoose.Schema({
  connectionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ZohoConnection",
    required: true,
    index: true
  },

  paymentId: {
    type: String,
    required: true
  },

  customerId: String,

  amount: Number,
  paymentDate: Date,

  invoices: [
    {
      invoiceId: String,
      amountApplied: Number
    }
  ],

  lastModifiedTime: String,

  syncedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// prevents duplicates
rawZohoPaymentSchema.index({ connectionId: 1, paymentId: 1 }, { unique: true });

export const RawZohoPayment = mongoose.model("RawZohoPayment", rawZohoPaymentSchema);