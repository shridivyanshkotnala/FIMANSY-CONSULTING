import mongoose from "mongoose";

const rawZohoBankTransactionSchema = new mongoose.Schema(
    {
        organizationId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            index: true,
        },

        connectionId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            index: true,
        },

        zohoTransactionId: {
            type: String,
            required: true,
        },

        zohoBankAccountId: {
            type: String,
            required: true,
            index: true,
        },

        transactionDate: {
            type: Date,
            index: true,
        },

        amount: {
            type: Number,
            required: true,
        },

        type: {
            type: String,
            enum: ["debit", "credit"],
            required: true,
            index: true,
        },

        description: {
            type: String,
            trim: true,
        },

        referenceNumber: {
            type: String,
            trim: true,
        },

        // Full Zoho payload (never mutate)
        payload: {
            type: mongoose.Schema.Types.Mixed,
            required: true,
        },

        lastModifiedTime: {
            type: Date,
            index: true,
        },

        isDeleted: {
            type: Boolean,
            default: false,
            index: true,
        },

        syncedAt: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: true }
);

// 🔐 Prevent duplicate transactions
rawZohoBankTransactionSchema.index(
    { organizationId: 1, zohoTransactionId: 1 },
    { unique: true }
);

// ⚡ Query performance indexes
rawZohoBankTransactionSchema.index({
    organizationId: 1,
    zohoBankAccountId: 1,
    transactionDate: -1,
});

rawZohoBankTransactionSchema.index({
    organizationId: 1,
    type: 1,
});

export const RawZohoBankTransaction = mongoose.model(
    "RawZohoBankTransaction",
    rawZohoBankTransactionSchema
);