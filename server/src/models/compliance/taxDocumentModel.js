import mongoose from "mongoose";

const taxDocumentSchema = new mongoose.Schema(
  {
    organization_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    document_type: {
      type: String,
      required: true,
      trim: true,
    },
    assessment_year: {
      type: String,
      required: true,
      trim: true,
    },
    file_name: {
      type: String,
      required: true,
      trim: true,
    },
    file_url: {
      type: String,
      required: true,
      trim: true,
    },
    file_size: {
      type: Number,
      min: 0,
    },
    filing_date: {
      type: Date,
    },
    acknowledgement_number: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    // Additional fields
    file_type: {
      type: String,
      enum: ['pdf', 'image', 'excel', 'other'],
      default: 'pdf',
    },
    uploaded_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    is_verified: {
      type: Boolean,
      default: false,
    },
    verified_at: {
      type: Date,
    },
    related_obligation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ComplianceObligation",
    },
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  }
);

// Index for searching documents
taxDocumentSchema.index({ organization_id: 1, assessment_year: 1 });
taxDocumentSchema.index({ organization_id: 1, document_type: 1 });

export const TaxDocument = mongoose.model("TaxDocument", taxDocumentSchema);