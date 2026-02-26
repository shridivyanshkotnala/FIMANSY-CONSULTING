// models/analytics/dsoMonthlyMetricModel.js

import mongoose from "mongoose";

const DSOMonthlyMetricSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },

    month: {
      type: String, // "2026-01"
      required: true,
      index: true,
    },

    year: Number,
    monthNumber: Number,

    // Core financial inputs
    endingAccountsReceivable: {
      type: Number,
      required: true,
    },

    creditSales: {
      type: Number,
      required: true,
    },

    daysInPeriod: {
      type: Number,
      required: true,
    },

    // Core DSO
    dso: {
      type: Number,
      required: true,
      index: true,
    },

    previousDso: Number,
    trend: {
      type: String,
      enum: ["up", "down", "flat"],
      default: "flat",
    },

    // Risk metrics
    atRiskRevenue: {
      type: Number,
      default: 0,
    },

    // Aging breakdown (future-proof)
    agingBuckets: {
      bucket_0_30: { type: Number, default: 0 },
      bucket_31_60: { type: Number, default: 0 },
      bucket_61_90: { type: Number, default: 0 },
      bucket_90_plus: { type: Number, default: 0 },
    },

    // Economic impact assumptions
    inflationRate: {
      type: Number,
      default: 0.06, // 6%
    },

    financingRate: {
      type: Number,
      default: 0.12, // 12%
    },

    inflationCost: {
      type: Number,
      default: 0,
    },

    interestCost: {
      type: Number,
      default: 0,
    },

    generatedAt: {
      type: Date,
      default: Date.now,
    },

  },
  { timestamps: true }
);

// Unique per org per month
DSOMonthlyMetricSchema.index(
  { organizationId: 1, month: 1 },
  { unique: true }
);

export const DSOMonthlyMetric = mongoose.model(
  "DSOMonthlyMetric",
  DSOMonthlyMetricSchema
);