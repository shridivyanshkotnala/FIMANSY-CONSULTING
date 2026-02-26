import mongoose from "mongoose";

const RawZohoCreditSchema = new mongoose.Schema({
  connectionId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },

  zohoCreditNoteId: {
    type: String,
    required: true,
    index: true
  },

  lastModifiedTime: {
    type: String,
    index: true
  },

  payload: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },

  fetchedAt: {
    type: Date,
    default: Date.now
  },

  syncBatchId: {
    type: String
  }

}, { timestamps: true });

RawZohoCreditSchema.index(
  { connectionId: 1, zohoCreditNoteId: 1 },
  { unique: true }
);

export const RawZohoCredit = mongoose.model(
  "RawZohoCredit",
  RawZohoCreditSchema
);