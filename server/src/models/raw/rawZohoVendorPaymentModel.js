import mongoose from "mongoose";

const rawZohoVendorPaymentSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    connectionId: {
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
    },

    status: {
      type: String,
      trim: true,
      index: true,
      // Do NOT restrict enum here.
      // Raw layer must remain flexible to Zoho changes.
    },

    referenceNumber: {
      type: String,
      trim: true,
      index: true,
    },

    // 🔐 Immutable Zoho payload (never mutate)
    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },

    lastModifiedTime: {
      type: Date,
      index: true,
    },

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    syncedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, // createdAt + updatedAt
  }
);

//
// 🔐 Prevent duplicate payments per organization
//
rawZohoVendorPaymentSchema.index(
  { organizationId: 1, zohoPaymentId: 1 },
  { unique: true }
);

//
// ⚡ Useful compound indexes for sync & queries
//
rawZohoVendorPaymentSchema.index({
  organizationId: 1,
  connectionId: 1,
});

rawZohoVendorPaymentSchema.index({
  organizationId: 1,
  lastModifiedTime: 1,
});

export const RawZohoVendorPayment = mongoose.model(
  "RawZohoVendorPayment",
  rawZohoVendorPaymentSchema
);
