import mongoose from "mongoose";

const financialReportSchema = new mongoose.Schema(
  {
    organization_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    report_type: {
      type: String,
      enum: ["profit_and_loss", "balance_sheet", "cashflow_statement", "other"],
      required: true,
      index: true,
    },
    custom_tags: {
      type: [String],
      default: [],
      validate: {
        validator: (values) => Array.isArray(values) && values.every((value) => typeof value === "string"),
        message: "custom_tags must be an array of strings",
      },
    },
    period_start: {
      type: Date,
      required: true,
      index: true,
    },
    period_end: {
      type: Date,
      required: true,
      index: true,
    },
    uploaded_at: {
      type: Date,
      default: Date.now,
      index: true,
    },
    uploaded_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    uploaded_by_role: {
      type: String,
      enum: ["user", "accountant", "admin"],
      required: true,
      index: true,
    },
    original_file_name: {
      type: String,
      required: true,
      trim: true,
    },
    display_file_name: {
      type: String,
      required: true,
      trim: true,
    },
    bucket: {
      type: String,
      required: true,
      trim: true,
    },
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    content_type: {
      type: String,
      required: true,
      trim: true,
    },
    file_size: {
      type: Number,
      min: 0,
      default: 0,
    },
    is_active: {
      type: Boolean,
      default: true,
      index: true,
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

financialReportSchema.index({ organization_id: 1, report_type: 1, period_end: -1, uploaded_at: -1 });
financialReportSchema.index({ organization_id: 1, custom_tags: 1 });

export const FinancialReport = mongoose.model("FinancialReport", financialReportSchema);
