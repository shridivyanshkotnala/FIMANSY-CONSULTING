import mongoose from "mongoose";

const queryHubTicketSchema = new mongoose.Schema(
  {
    organization_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    query_number: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 180,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },
    status: {
      type: String,
      enum: ["open", "closed"],
      default: "open",
      index: true,
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    closed_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    closed_at: {
      type: Date,
      default: null,
      index: true,
    },
    last_activity_at: {
      type: Date,
      default: Date.now,
      index: true,
    },
    last_comment_at: {
      type: Date,
      default: null,
      index: true,
    },
    last_comment_by_role: {
      type: String,
      enum: ["client", "accountant"],
      default: null,
      index: true,
    },
    has_unread_client_update: {
      type: Boolean,
      default: false,
      index: true,
    },
    has_unread_accountant_update: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

queryHubTicketSchema.index({ organization_id: 1, status: 1, createdAt: -1 });
queryHubTicketSchema.index({ status: 1, createdAt: -1 });

export const QueryHubTicket = mongoose.model("QueryHubTicket", queryHubTicketSchema);
