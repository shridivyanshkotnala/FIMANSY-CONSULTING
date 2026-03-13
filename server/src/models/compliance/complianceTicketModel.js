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

  ticket_number: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },

  compliance_category: {
    type: String,
    enum: ['gst', 'tds', 'income_tax', 'mca', 'payroll', 'other'],
    required: true,
    index: true,
  },

  compliance_subtype: {
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
  },

  last_comment_at: {
    type: Date,
    index: true,
  },

  last_comment_by_role: {
    type: String,
    enum: ['user', 'admin'],
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
          'initiated',
          'pending_docs',
          'in_progress',
          'filed',
          'approved',
          'overdue',
          'closed',
        ],
      },

      changed_by_role: {
        type: String,
        enum: ['user', 'admin'],
        required: true,
      },

      changed_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },

      at: {
        type: Date,
        default: Date.now,
        required: true,
      },

      note: {
        type: String,
      },
    },
  ],

},
{ timestamps: true }
);

complianceTicketSchema.index({ organization_id: 1, status: 1 });
complianceTicketSchema.index({ organization_id: 1, compliance_category: 1 });
complianceTicketSchema.index({ due_date: 1, status: 1 });

export const ComplianceTicket =
mongoose.model("ComplianceTicket", complianceTicketSchema);