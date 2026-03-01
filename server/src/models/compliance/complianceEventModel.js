import mongoose from "mongoose";

const complianceEventSchema = new mongoose.Schema(
  {
    organization_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    event_type: {
      type: String,
      required: true,
      trim: true,
    },
    event_date: {
      type: Date,
      required: true,
    },
    event_description: {
      type: String,
      trim: true,
    },
    required_form: {
      type: String,
      required: true,
      trim: true,
    },
    filing_deadline: {
      type: Date,
      required: true,
    },
    is_acknowledged: {
      type: Boolean,
      default: false,
    },
    related_obligation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ComplianceObligation",
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    // Additional fields
    acknowledged_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    acknowledged_at: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'missed'],
      default: 'pending',
    },
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at', // Note: updated_at won't be created as per schema
    },
  }
);

// Note: The schema only shows created_at, so we're keeping that
// but MongoDB will still add an _id field automatically

// Indexes for efficient querying
complianceEventSchema.index({ organization_id: 1, event_date: -1 });
complianceEventSchema.index({ organization_id: 1, filing_deadline: 1 });
complianceEventSchema.index({ organization_id: 1, status: 1 });

export const ComplianceEvent = mongoose.model(
  "ComplianceEvent",
  complianceEventSchema
);