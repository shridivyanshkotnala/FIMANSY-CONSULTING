import mongoose from "mongoose";

const complianceObligationSchema = new mongoose.Schema(
  {
    organization_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },

    // PRIMARY TAG (Category)
    category_tag: {
      type: String,
      enum: ['gst', 'tds', 'income_tax', 'mca', 'payroll', 'other'],
      required: true,
      index: true,
    },

    // SUBTAG (Form Name)
    subtag: {
      type: String,
      required: true, // e.g., GSTR-3B, ITR, Form 3CA
      trim: true,
      index: true,
    },

    form_description: {
      type: String,
      trim: true,
    },

    financial_year: {
      type: String,
      required: true,
      index: true,
    },

    due_date: {
      type: Date,
      required: true,
      index: true,
    },

    // Rule Layer
    is_recurring: {
      type: Boolean,
      default: false,
    },

    recurrence_type: {
      type: String,
      enum: ['monthly', 'quarterly', 'annual', 'one_time'],
      default: 'one_time',
    },

    recurrence_config: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    applicability_condition: {
      type: mongoose.Schema.Types.Mixed,
      default: {}, // For category 2 logic
    },

    // Execution Summary (Not Workflow)
    is_completed: {
      type: Boolean,
      default: false,
      index: true,
    },

    completed_at: {
      type: Date,
    },

    is_ignored: {
      type: Boolean,
      default: false,
      index: true,
    },

    parent_obligation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ComplianceObligation",
    },
    is_overdue: {
      type: Boolean,
      default: false,
      index: true
    }

  },
  { timestamps: true }
);

complianceObligationSchema.index({
  organization_id: 1,
  financial_year: 1,
  subtag: 1,
  due_date: 1
},
  { unique: true });

export const ComplianceObligation =
  mongoose.model("ComplianceObligation", complianceObligationSchema);