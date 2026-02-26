import mongoose from "mongoose";

const ARLedgerSchema = new mongoose.Schema(
    {
        organizationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
            index: true,
        },

        connectionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ZohoConnection",
            required: true,
            index: true,
        },

        zohoInvoiceId: {
            type: String,
            required: true,
            index: true,
        },

        customerId: String,
        customerName: String,

        invoiceDate: {
            type: Date,
            required: true,
            index: true,
        },

        dueDate: {
            type: Date,
            required: true,
            index: true,
        },

        originalAmount: {
            type: Number,
            required: true,
        },

        totalPaid: {
            type: Number,
            default: 0,
        },

        totalCreditApplied: {
            type: Number,
            default: 0,
        },

        currentBalance: {
            type: Number,
            required: true,
            index: true,
        },

        status: {
            type: String,
            enum: ["open", "partial", "paid", "overdue"],
            index: true,
        },

        agingDays: {
            type: Number,
            default: 0,
            index: true,
        },

        currencyCode: String,
        exchangeRate: Number,

        lastSyncedAt: Date,

        isDeleted: {
            type: Boolean,
            default: false,
            index: true,
        },

        baseCurrencyAmount: {
            type: Number,
            required: true,
        }
    },
    { timestamps: true }
);

ARLedgerSchema.index(
    { organizationId: 1, zohoInvoiceId: 1 },
    { unique: true }
);

export const ARLedger = mongoose.model("ARLedger", ARLedgerSchema);