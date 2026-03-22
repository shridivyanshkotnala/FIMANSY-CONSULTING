import mongoose from "mongoose";

const queryHubDocumentSchema = new mongoose.Schema(
  {
    ticket_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "QueryHubTicket",
      required: true,
      index: true,
    },
    organization_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    uploaded_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    uploaded_by_role: {
      type: String,
      enum: ["client", "accountant"],
      required: true,
      index: true,
    },
    original_file_name: {
      type: String,
      required: true,
      trim: true,
    },
    display_file_name: {
      type: String,
      required: true,
      trim: true,
    },
    bucket: {
      type: String,
      required: true,
      trim: true,
    },
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    content_type: {
      type: String,
      required: true,
      trim: true,
    },
    file_size: {
      type: Number,
      default: 0,
      min: 0,
    },
    is_active: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

queryHubDocumentSchema.index({ ticket_id: 1, createdAt: -1 });

export const QueryHubDocument = mongoose.model("QueryHubDocument", queryHubDocumentSchema);
