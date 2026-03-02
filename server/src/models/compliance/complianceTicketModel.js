import mongoose from "mongoose";

const complianceTicketSchema = new mongoose.Schema(
{
  organization_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true,
  },

  obligation_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ComplianceObligation",
    required: true,
  },

  category_tag: {
    type: String,
    enum: ['gst','tds','income_tax','mca','payroll','other'],
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
      'initiated',
      'pending_docs',
      'in_progress',
      'filed',
      'approved',
      'overdue',
      'closed',
    ],
    default: 'initiated',
    index: true,
  },

  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },

  last_activity_at: {
    type: Date,
  },

  closed_at: {
    type: Date,
  },

  filing_metadata: {
    srn_number: String,
    acknowledgement_number: String,
    filing_fee: Number,
    late_fee: Number,
  }

},
{ timestamps: true }
);

complianceTicketSchema.index({ organization_id: 1, status: 1 });

export const ComplianceTicket =
  mongoose.model("ComplianceTicket", complianceTicketSchema);