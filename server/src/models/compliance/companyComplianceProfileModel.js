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
    obligations_generated: {
      type: Boolean,
      default: false,
    },
    directors: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Director"
  }],
  director_count: {
    type: Number,
    default: 0  // Always starts at 0
  },
    cin: {
      type: String,
      trim: true,
      sparse: true,
      default: null,
      index: true,
    },
    llpin: {
      type: String,
      trim: true,
      sparse: true,
      default: null,
    },
    date_of_incorporation: {
      type: Date,
      default: null,
    },
    financial_year_end: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
      default: 3, // March (India FY end)
    },
    registered_office_address: {
      type: String,
      trim: true,
      default: null,
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
      default: null,
    },
    gstin: {
      type: String,
      trim: true,
      sparse: true,
      default: null,
    },
    pan: {
      type: String,
      trim: true,
      sparse: true,
      default: null,
    },
    tan: {
      type: String,
      trim: true,
      sparse: true,
      default: null,
    },
    is_audit_applicable: {
      type: Boolean,
      default: false,
    },
    last_audit_date: {
      type: Date,
      default: null,
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