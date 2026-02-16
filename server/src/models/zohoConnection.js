import mongoose from "mongoose";

const zohoConnectionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
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

    status: {
      type: String,
      enum: ["connected", "revoked"],
      default: "connected",
    },
  },
  {
    timestamps: true,
  }
);

export const ZohoConnection = mongoose.model("ZohoConnection", zohoConnectionSchema);