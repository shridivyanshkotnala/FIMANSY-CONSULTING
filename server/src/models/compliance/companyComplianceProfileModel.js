import mongoose from "mongoose";

const companyComplianceProfileSchema = new mongoose.Schema(
  {
    organization_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    company_type: {
      type: String,
      enum: [
        'private_limited',
        'opc',
        'llp',
        'public_limited',
        'partnership',
        'proprietorship',
      ],
      required: true,
    },
    cin: {
      type: String,
      trim: true,
      sparse: true, // Allows null/undefined while maintaining uniqueness
      index: true,
    },
    llpin: {
      type: String,
      trim: true,
      sparse: true,
    },
    date_of_incorporation: {
      type: Date,
    },
    financial_year_end: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
      default: 3, // March (31st) - India FY end
    },
    registered_office_address: {
      type: String,
      trim: true,
    },
    authorized_capital: {
      type: Number,
      default: 0,
      min: 0,
    },
    paid_up_capital: {
      type: Number,
      default: 0,
      min: 0,
    },
    mca_status: {
      type: String,
      enum: ['active', 'strike_off', 'under_process', 'dissolved'],
      default: 'active',
    },
    last_mca_check_at: {
      type: Date,
    },
    // Additional fields that might be useful
    gstin: {
      type: String,
      trim: true,
      sparse: true,
    },
    pan: {
      type: String,
      trim: true,
      sparse: true,
    },
    tan: {
      type: String,
      trim: true,
      sparse: true,
    },
    is_audit_applicable: {
      type: Boolean,
      default: false,
    },
    last_audit_date: {
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

// Compound index for organization queries
companyComplianceProfileSchema.index({ organization_id: 1, company_type: 1 });

export const CompanyComplianceProfile = mongoose.model(
  "CompanyComplianceProfile",
  companyComplianceProfileSchema
);