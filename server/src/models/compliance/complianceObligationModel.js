import mongoose from "mongoose";

const complianceObligationSchema = new mongoose.Schema(
  {
    organization_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    compliance_type: {
      type: String,
      enum: [
        'mca_annual',
        'mca_event',
        'income_tax',
        'advance_tax',
        'gst',
        'tds',
      ],
      required: true,
    },
    form_name: {
      type: String,
      required: true,
      trim: true,
    },
    form_description: {
      type: String,
      trim: true,
    },
    due_date: {
      type: Date,
      required: true,
      index: true,
    },
    filing_date: {
      type: Date,
    },
    status: {
      type: String,
      enum: [
        'not_started',
        'in_progress',
        'filed',
        'overdue',
        'not_applicable',
      ],
      default: 'not_started',
      index: true,
    },
    financial_year: {
      type: String,
      trim: true,
    },
    assessment_year: {
      type: String,
      trim: true,
    },
    trigger_event: {
      type: String,
      trim: true,
    },
    trigger_date: {
      type: Date,
    },
    filing_fee: {
      type: Number,
      default: 0,
      min: 0,
    },
    late_fee: {
      type: Number,
      default: 0,
      min: 0,
    },
    srn_number: {
      type: String,
      trim: true,
    },
    acknowledgement_number: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    documents: [{
      type: String, // Array of document URLs or references
      trim: true,
    }],
    priority: {
      type: Number,
      min: 1,
      max: 5,
      default: 5,
      index: true,
    },
    // Additional fields
    is_recurring: {
      type: Boolean,
      default: false,
    },
    parent_obligation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ComplianceObligation",
    },
    reminder_sent_at: [{
      type: Date,
    }],
    completed_at: {
      type: Date,
    },
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  }
);

// Compound indexes for common queries
complianceObligationSchema.index({ organization_id: 1, status: 1 });
complianceObligationSchema.index({ organization_id: 1, due_date: 1 });
complianceObligationSchema.index({ organization_id: 1, compliance_type: 1 });

export const ComplianceObligation = mongoose.model(
  "ComplianceObligation",
  complianceObligationSchema
);