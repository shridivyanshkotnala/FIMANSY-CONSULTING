import mongoose from "mongoose";

const complianceTicketSchema = new mongoose.Schema(
  {
    ticket_number: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },

    is_manual: {
      type: Boolean,
      default: false,
      index: true,
    },

    organization_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    obligation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ComplianceObligation",
      required: false,
    },

    // New naming
    compliance_category: {
      type: String,
      enum: ["gst", "tds", "income_tax", "mca", "payroll", "other"],
      required: false,
      index: true,
    },

    compliance_subtype: {
      type: String,
      required: false,
      index: true,
    },

    // Backward-compatible naming still used in some accountant APIs
    category_tag: {
      type: String,
      enum: ["gst", "tds", "income_tax", "mca", "payroll", "other"],
      required: true,
      index: true,
    },

    subtag: {
      type: String,
      required: true,
      index: true,
    },

    financial_year: {
      type: String,
      required: true,
    },

    due_date: {
      type: Date,
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: [
        "initiated",
        "pending_docs",
        "in_progress",
        "filed",
        "approved",
        "overdue",
        "closed",
      ],
      default: "initiated",
      index: true,
    },

    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    last_activity_at: {
      type: Date,
      index: true,
    },

    closed_at: {
      type: Date,
    },

    filing_metadata: {
      srn_number: String,
      acknowledgement_number: String,
      filing_fee: Number,
      late_fee: Number,
      notes: String,
    },

    last_comment_at: { type: Date, index: true },
    last_comment_by_role: {
      type: String,
      enum: ["user", "admin", "accountant"],
      index: true,
    },

    has_unread_client_update: {
      type: Boolean,
      default: false,
      index: true,
    },

    status_history: [
      {
        status: {
          type: String,
          enum: [
            "initiated",
            "pending_docs",
            "in_progress",
            "filed",
            "approved",
            "overdue",
            "closed",
          ],
        },
        changed_by_role: {
          type: String,
          enum: ["user", "admin", "accountant"],
        },
        changed_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        at: { type: Date, default: Date.now },
        note: { type: String },
      },
    ],
  },
  { timestamps: true }
);

complianceTicketSchema.index({ organization_id: 1, status: 1 });
complianceTicketSchema.index({ organization_id: 1, category_tag: 1 });
complianceTicketSchema.index({ organization_id: 1, compliance_category: 1 });

export const ComplianceTicket = mongoose.model("ComplianceTicket", complianceTicketSchema);