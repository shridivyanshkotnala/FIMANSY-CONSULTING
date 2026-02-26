import mongoose from "mongoose";

const rawZohoInvoiceSchema = new mongoose.Schema({
  connectionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ZohoConnection",
    index: true,
    required: true
  },

  invoiceId: {
    type: String,
    required: true
  },

  customerId: String,
  customerName: String,
  invoiceNumber: String,
  status: String,

  invoiceDate: Date,
  dueDate: Date,

  total: Number,
  balance: Number,

  lastModifiedTime: String,

  syncedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// prevents duplicates

rawZohoInvoiceSchema.index({ connectionId: 1, invoiceId: 1 }, { unique: true });


//Why Unique Compound Index Matters

// If sync runs twice accidentally:

// Instead of duplicating invoices → Mongo updates same row.

// This gives idempotency for free.

export const RawZohoInvoice = mongoose.model("RawZohoInvoice", rawZohoInvoiceSchema);