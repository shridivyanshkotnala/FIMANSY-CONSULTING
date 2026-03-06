import mongoose from "mongoose";

const complianceObligationSchema = new mongoose.Schema(
  {
    organization_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    
    // ✅ NEW field names matching Template schema
    compliance_category: {  // was: category_tag
      type: String,
      enum: ['gst', 'tds', 'income_tax', 'payroll', 'mca'],
      required: true,
      index: true,
    },
    
    compliance_subtype: {  // was: subtag
      type: String,
      trim: true,
    },
    
    compliance_description: {  // was: description
      type: String,
      trim: true,
    },

    // Keep compliance_type for backward compatibility
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
    },
    
    form_name: {
      type: String,
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
    
    // Engine fields
    is_recurring: {
      type: Boolean,
      default: false,
    },
    
    recurrence_type: {
      type: String,
      enum: ['monthly', 'quarterly', 'annual', 'one_time'],
    },
    
    recurrence_config: {
      type: mongoose.Schema.Types.Mixed,
    },
    
    // Other fields
    assessment_year: String,
    trigger_event: String,
    trigger_date: Date,
    filing_fee: { type: Number, default: 0 },
    late_fee: { type: Number, default: 0 },
    srn_number: String,
    acknowledgement_number: String,
    notes: String,
    documents: [String],
    priority: { type: Number, min: 1, max: 5, default: 5 },
    parent_obligation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ComplianceObligation",
    },
    reminder_sent_at: [Date],
    completed_at: Date,
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  }
);

// Updated compound indexes with new field names
complianceObligationSchema.index({ organization_id: 1, status: 1 });
complianceObligationSchema.index({ organization_id: 1, due_date: 1 });
complianceObligationSchema.index({ organization_id: 1, compliance_type: 1 });
complianceObligationSchema.index({ organization_id: 1, compliance_category: 1 }); // Updated

export const ComplianceObligation = mongoose.model(
  "ComplianceObligation",
  complianceObligationSchema
);