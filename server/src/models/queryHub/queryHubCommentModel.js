import mongoose from "mongoose";

const queryHubCommentSchema = new mongoose.Schema(
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
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["client", "accountant"],
      required: true,
      index: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 8000,
    },
    attachments: [{ type: String }],
  },
  { timestamps: true }
);

queryHubCommentSchema.index({ ticket_id: 1, createdAt: 1 });

export const QueryHubComment = mongoose.model("QueryHubComment", queryHubCommentSchema);
