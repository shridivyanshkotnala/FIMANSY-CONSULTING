import mongoose from "mongoose";

const complianceDocumentSchema = new mongoose.Schema(
  {
    ticket_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ComplianceTicket",
      required: true,
      index: true,
    },
    organization_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    obligation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ComplianceObligation",
      default: null,
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
    stored_file_name: {
      type: String,
      required: true,
      trim: true,
    },

    document_kind: {
      type: String,
      enum: ["working_doc", "supporting_doc", "final_verified_return"],
      default: "working_doc",
      index: true,
    },

    is_final_verified: {
      type: Boolean,
      default: false,
      index: true,
    },
    final_verified_at: {
      type: Date,
      default: null,
    },
    final_verified_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    final_verified_comment_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ComplianceComment",
      default: null,
    },

    financial_year: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    compliance_obligation_name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    due_date: {
      type: Date,
      required: true,
      index: true,
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
    etag: {
      type: String,
      default: null,
      trim: true,
    },

    version_no: {
      type: Number,
      min: 1,
      default: 1,
    },
    exchange_round: {
      type: Number,
      min: 1,
      default: 1,
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

complianceDocumentSchema.index({ ticket_id: 1, createdAt: -1 });
complianceDocumentSchema.index({
  organization_id: 1,
  financial_year: 1,
  compliance_obligation_name: 1,
  is_final_verified: 1,
});

complianceDocumentSchema.index(
  { ticket_id: 1, is_final_verified: 1 },
  { unique: true, partialFilterExpression: { is_final_verified: true } }
);

export const ComplianceDocument = mongoose.model(
  "ComplianceDocument",
  complianceDocumentSchema
);
