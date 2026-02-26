// models/zohoConnection.js
import mongoose from "mongoose";

const zohoConnectionSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      unique: true, // one Zoho per company
    },

    zohoOrgId: {
      type: String,
      required: true,
    },

    accessToken: {
      type: String,
      required: true,
    },

    refreshToken: {
      type: String,
      required: true,
    },

    tokenExpiry: {
      type: Date,
      required: true,
    },

    dataCenter: {
      type: String,
      enum: ["IN", "US", "EU", "AU"],
      default: "IN",
    },

    status: {
      type: String,
      enum: ["connected", "expired", "revoked"],
      default: "connected",
    },

    lastSyncedAt: Date,
    creditNotesCursor: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

export const ZohoConnection = mongoose.model("ZohoConnection", zohoConnectionSchema);
