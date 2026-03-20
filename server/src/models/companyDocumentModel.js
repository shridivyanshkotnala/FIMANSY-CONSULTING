import mongoose from "mongoose";

const companyDocumentSchema = new mongoose.Schema(
  {
    organization_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    document_type: {
      type: String,
      enum: ["loan", "equity", "other"],
      required: true,
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

companyDocumentSchema.index({ organization_id: 1, document_type: 1, createdAt: -1 });

export const CompanyDocument = mongoose.model("CompanyDocument", companyDocumentSchema);
