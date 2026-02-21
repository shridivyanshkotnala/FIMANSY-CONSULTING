// models/organizationModel.js
import mongoose from "mongoose";

const organizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    // optional branding later
    logo: String,

    // owner (creator of org)
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // accounting defaults
    baseCurrency: {
      type: String,
      default: "INR",
    },

    financialYearStart: {
      type: String, // "04-01" (April 1st India FY)
      default: "04-01",
    },

    status: {
      type: String,
      enum: ["active", "suspended"],
      default: "active",
    },
  },
  { timestamps: true }
);

export const Organization = mongoose.model("Organization", organizationSchema);
