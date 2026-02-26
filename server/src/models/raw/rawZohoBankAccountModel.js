import mongoose from "mongoose";

const rawZohoBankAccountSchema = new mongoose.Schema(
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

        zohoBankAccountId: {
            type: String,
            required: true,
        },

        accountName: {
            type: String,
            trim: true,
        },

        accountType: {
            type: String,
            trim: true, // bank | credit_card | etc (keep flexible)
        },

        currencyCode: {
            type: String,
            uppercase: true,
        },

        // Full Zoho payload (never mutate this)
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

// 🔐 Prevent duplicate accounts per org
rawZohoBankAccountSchema.index(
    { organizationId: 1, zohoBankAccountId: 1 },
    { unique: true }
);

// ⚡ Helpful query index
rawZohoBankAccountSchema.index({
    organizationId: 1,
    connectionId: 1,
});

export const RawZohoBankAccount = mongoose.model(
    "RawZohoBankAccount",
    rawZohoBankAccountSchema
);