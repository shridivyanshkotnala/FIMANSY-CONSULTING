import mongoose from "mongoose";

const directorSchema = new mongoose.Schema(
  {
    organization_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    profile_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CompanyComplianceProfile",
      required: true,
      index: true,
    },
    
    din: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    designation: {
      type: String,
      trim: true,
    },
    date_of_appointment: {
      type: Date,
    },
    date_of_cessation: {
      type: Date,
    },
    dsc_expiry_date: {
      type: Date,
    },
    dsc_holder_name: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    // Additional fields
    pan: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    din_status: {
      type: String,
      enum: ['active', 'disqualified', 'resigned'],
      default: 'active',
    },
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  }
);

// Ensure DIN is unique per organization
directorSchema.index({ organization_id: 1, din: 1 }, { unique: true });

export const Director = mongoose.model("Director", directorSchema);