import mongoose from "mongoose";

const complianceCommentSchema = new mongoose.Schema(
{
  ticket_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ComplianceTicket",
    required: true,
    index: true,
  },

  organization_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true,
  },

  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },

  role: {
    type: String,
    enum: ['user','accountant'],
    required: true,
  },

  message: {
    type: String,
  },

  attachments: [{
    type: String,
  }]

},
{ timestamps: true }
);

complianceCommentSchema.index({ ticket_id: 1, createdAt: 1 });
// (Optional) compound index for organization queries
complianceCommentSchema.index({ organization_id: 1, createdAt: 1 });

export const ComplianceComment = mongoose.model(
  "ComplianceComment",
  complianceCommentSchema
);