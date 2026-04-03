import mongoose from "mongoose";

const zohoOauthSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
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
    organizations: {
      type: [
        {
          organization_id: { type: String, required: true },
          name: { type: String, default: null },
          is_default_org: { type: Boolean, default: false },
        },
      ],
      default: [],
    },
    consumed: {
      type: Boolean,
      default: false,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 },
    },
  },
  { timestamps: true }
);

export const ZohoOauthSession = mongoose.model("ZohoOauthSession", zohoOauthSessionSchema);
