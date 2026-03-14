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
      ref: "Organization",
      required: true,
      index: true,
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["user", "accountant", "admin"],
      default: "user",
      index: true,
    },
    message: {
      type: String,
      default: "",
      trim: true,
    },
    attachments: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
  },
  { timestamps: true }
);

complianceCommentSchema.index({ ticket_id: 1, createdAt: 1 });

export const ComplianceComment = mongoose.model(
  "ComplianceComment",
  complianceCommentSchema
);
