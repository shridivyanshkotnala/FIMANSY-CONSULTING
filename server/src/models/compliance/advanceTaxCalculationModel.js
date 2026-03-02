import mongoose from "mongoose";

const advanceTaxCalculationSchema = new mongoose.Schema(
  {
    organization_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    financial_year: {
      type: String,
      required: true,
      trim: true,
    },
    quarter: {
      type: Number,
      required: true,
      min: 1,
      max: 4,
    },
    due_date: {
      type: Date,
      required: true,
    },
    estimated_annual_income: {
      type: Number,
      required: true,
      min: 0,
    },
    estimated_tax_liability: {
      type: Number,
      required: true,
      min: 0,
    },
    cumulative_percentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    tax_payable_this_quarter: {
      type: Number,
      required: true,
      min: 0,
    },
    tax_paid_till_date: {
      type: Number,
      default: 0,
      min: 0,
    },
    shortfall: {
      type: Number,
      default: 0,
      min: 0,
    },
    interest_234b: {
      type: Number,
      default: 0,
      min: 0,
    },
    interest_234c: {
      type: Number,
      default: 0,
      min: 0,
    },
    payment_status: {
      type: String,
      enum: [
        'not_started',
        'in_progress',
        'filed',
        'overdue',
        'not_applicable',
      ],
      default: 'not_started',
    },
    payment_date: {
      type: Date,
    },
    challan_number: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    // Additional fields
    bsr_code: {
      type: String,
      trim: true,
    },
    tax_type: {
      type: String,
      enum: ['corporate', 'individual', 'partnership'],
      default: 'corporate',
    },
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  }
);

// Ensure one record per quarter per financial year
advanceTaxCalculationSchema.index(
  { organization_id: 1, financial_year: 1, quarter: 1 },
  { unique: true }
);

export const AdvanceTaxCalculation = mongoose.model(
  "AdvanceTaxCalculation",
  advanceTaxCalculationSchema
);