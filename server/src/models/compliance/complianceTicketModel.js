import mongoose from "mongoose";

const complianceTicketSchema = new mongoose.Schema(
  {
    // Unique human-readable ticket number: AC-TKT-00001, AC-TKT-00002, …
    ticket_number: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },

    // true when ticket was created manually by an accountant (not by the compliance engine)
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
      // optional for manually-created tickets that have no backing obligation
      required: false,
    },

    category_tag: {
      type: String,
      enum: ['gst', 'tds', 'income_tax', 'mca', 'payroll', 'other'],
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
    },

    last_comment_at: { type: Date, index: true },
    last_comment_by_role: { type: String, enum: ['user', 'admin'] },

    has_unread_client_update: {
      type: Boolean,
      default: false,
      index: true
    }
    ,
    // Detailed status history for the ticket. Stored as an array so we can
    // present an exact timeline of status transitions on the frontend.
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
        changed_by_role: { type: String },
        changed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        at: { type: Date },
        note: { type: String }
      }
    ],

  },
  { timestamps: true }
);

complianceTicketSchema.index({ organization_id: 1, status: 1 });

export const ComplianceTicket =
  mongoose.model("ComplianceTicket", complianceTicketSchema);