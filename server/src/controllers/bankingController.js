// import { getBankDashboard } from "../services/banking/bankDashboardService.js";

// export const getBankDashboardController = async (req, res, next) => {
//   try {
//     const organizationId = req.headers["x-organization-id"];

//     if (!organizationId) {
//       return res.status(400).json({
//         success: false,
//         message: "Organization ID missing",
//       });
//     }

//     const {
//       bankAccountId,
//       startDate,
//       endDate,
//       page = 1,
//       limit = 20,
//     } = req.query;

//     const result = await getBankDashboard({
//       organizationId,
//       bankAccountId,
//       startDate,
//       endDate,
//       page: Number(page),
//       limit: Number(limit),
//     });

//     return res.status(200).json({
//       success: true,
//       data: result,
//     });

//   } catch (error) {
//     next(error);
//   }
// };


import mongoose from "mongoose";
import { getBankDashboard } from "../services/banking/bankDashboardService.js";
import { BankTransactionLedger } from "../models/ledger/bankTransactionLedgerModel.js";
import { rebuildVendorPaymentLedger } from "../services/ledger/rebuildVendorPaymentLedger.js";
import { ZohoConnection } from "../models/zohoConnectionModel.js";
import { SyncJob } from "../models/scheduler/syncJobModel.js";
import { RawZohoVendorPayment } from "../models/raw/rawZohoVendorPaymentModel.js";
import { RawZohoBankTransaction } from "../models/raw/rawZohoBankTransactionModel.js";
import { ZohoClient } from "../services/zohoClient.js";
import { VendorPaymentLedger } from "../models/ledger/vendorPaymentLedgerModel.js";
import { BankReconQuery } from "../models/bankReconQueryModel.js";

const pickFirst = (...values) => {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) return trimmed;
      continue;
    }
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "object" && value) return value;
  }
  return null;
};

const extractAmount = (...values) => {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;
    const num = Number(value);
    if (Number.isFinite(num)) return num;
  }
  return null;
};

export const getBankDashboardController = async (req, res, next) => {
  try {
    const organizationId = req.headers["x-organization-id"];

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: "Organization ID missing",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(organizationId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Organization ID",
      });
    }

    const {
      bankAccountId,
      startDate,
      endDate,
      status,          // reconciliationStatus
      transactionType,
      search,
      page = 1,
      limit = 20,
    } = req.query;

    // -----------------------------
    // SAFE PAGINATION
    // -----------------------------
    const parsedPage = Math.max(1, parseInt(page, 10) || 1);

    // prevent someone from asking 100000 records
    const parsedLimit = Math.min(
      100,
      Math.max(1, parseInt(limit, 10) || 20)
    );

    const result = await getBankDashboard({
      organizationId,
      bankAccountId,
      startDate,
      endDate,
      reconciliationStatus: status,
      transactionType,
      search,
      page: parsedPage,
      limit: parsedLimit,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });

  } catch (error) {
    next(error);
  }
};



export const updateTransactionCategoryController = async (req, res, next) => {
  try {
    const organizationId = req.headers["x-organization-id"];
    const { id } = req.params;
    const { category } = req.body;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: "Organization ID missing",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction ID",
      });
    }

    if (!category) {
      return res.status(400).json({
        success: false,
        message: "Category is required",
      });
    }

    const updated = await BankTransactionLedger.findOneAndUpdate(
      {
        _id: id,
        organizationId,
      },
      {
        $set: { category },
      },
      { returnDocument: 'after' }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: updated,
    });

  } catch (error) {
    next(error);
  }
};

export const acceptTransactionController = async (req, res, next) => {
  try {
    const organizationId = req.headers["x-organization-id"];
    const { id } = req.params;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: "Organization ID missing",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction ID",
      });
    }

    const updated = await BankTransactionLedger.findOneAndUpdate(
      {
        _id: id,
        organizationId,
      },
      {
        $set: { acceptedByClient: true },
      },
      { returnDocument: "after" }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const reportTransactionIssueController = async (req, res, next) => {
  try {
    const organizationId = req.headers["x-organization-id"];
    const { id } = req.params;
    const { message } = req.body;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: "Organization ID missing",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction ID",
      });
    }

    if (!message || !String(message).trim()) {
      return res.status(400).json({
        success: false,
        message: "Issue message is required",
      });
    }

    const transaction = await BankTransactionLedger.findOne({
      _id: id,
      organizationId,
      isDeleted: false,
    }).lean();

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    const runningAgg = await BankTransactionLedger.aggregate([
      {
        $match: {
          organizationId: new mongoose.Types.ObjectId(organizationId),
          isDeleted: false,
          transactionDate: { $lte: transaction.transactionDate },
        },
      },
      {
        $group: {
          _id: null,
          runningBalance: {
            $sum: {
              $cond: [
                { $eq: ["$type", "credit"] },
                "$amount",
                { $multiply: ["$amount", -1] },
              ],
            },
          },
        },
      },
    ]);

    const runningBalance = runningAgg[0]?.runningBalance ?? null;

    const raw = transaction.zohoTransactionId
      ? await RawZohoBankTransaction.findOne({
          organizationId,
          zohoTransactionId: transaction.zohoTransactionId,
        }).lean()
      : null;
    const payload = raw?.payload || {};

    const categoryCandidate = pickFirst(
      payload.category_name,
      payload.transaction_type_formatted,
      payload.transaction_type_name,
      payload.category,
      payload.transaction_category,
      payload.transaction_type,
      payload.expense_type,
      payload.payment_type,
      payload.entry_type
    );

    let normalizedCategory =
      typeof categoryCandidate === "string" && !["debit", "credit"].includes(categoryCandidate.toLowerCase())
        ? categoryCandidate
        : null;

    const normalizedTxnType = String(
      pickFirst(payload.transaction_type, payload.transaction_type_formatted, payload.transaction_category) || ""
    )
      .toLowerCase()
      .replace(/[_-]+/g, " ")
      .trim();

    if (transaction.type === "debit") {
      if (normalizedTxnType === "vendor payment") {
        normalizedCategory = "Vendor Payment";
      } else if (normalizedTxnType === "vendor advance") {
        normalizedCategory = "Vendor Advance";
      } else if (normalizedTxnType === "customer payment") {
        normalizedCategory = "Vendor Advance";
      }
    }

    const queryDoc = await BankReconQuery.create({
      organizationId,
      transactionId: transaction._id,
      queryMessage: String(message).trim(),
      transactionDetails: {
        transactionId: transaction._id,
        zohoTransactionId: transaction.zohoTransactionId,
        transactionDate: transaction.transactionDate,
        description: transaction.description,
        referenceNumber: transaction.referenceNumber,
        amount: transaction.amount,
        runningBalance,
        type: transaction.type,
        reconciliationStatus: transaction.reconciliationStatus,
        category: transaction.category,
        zohoCategory: normalizedCategory,
        expenseAccount: pickFirst(
          payload.offset_account_name,
          payload.offset_account,
          payload.expense_account_name,
          payload.expense_account,
          payload.expense_account_id,
          payload.rule_details?.offset_account_name
        ),
        vendor: pickFirst(
          payload.vendor_name,
          payload.payee_name,
          payload.payee,
          payload.vendor,
          payload.contact_name
        ),
        customer: pickFirst(
          payload.customer_name,
          payload.customer,
          payload.contact_name
        ),
        accountName: pickFirst(
          payload.account_name,
          payload.bank_account_name,
          payload.to_account_name,
          payload.deposit_to_account_name,
          payload.destination_account_name
        ),
        offsetAccountName: pickFirst(
          payload.offset_account_name,
          payload.offset_account,
          payload.from_account_name,
          payload.source_account_name,
          payload.rule_details?.offset_account_name,
          payload.rule_details?.from_account_name
        ),
        fromAccount: pickFirst(
          payload.from_account_name,
          payload.source_account_name,
          payload.paid_through_account_name,
          payload.paid_through,
          payload.from_account,
          payload.account_name,
          payload.bank_account_name,
          payload.rule_details?.from_account_name
        ),
        toAccount: pickFirst(
          payload.to_account_name,
          payload.destination_account_name,
          payload.deposit_to_account_name,
          payload.deposit_to,
          payload.to_account,
          payload.offset_account_name,
          payload.offset_account,
          payload.rule_details?.to_account_name,
          payload.rule_details?.offset_account_name
        ),
        paymentNumber: pickFirst(
          payload.payment_number,
          payload.refund_payment_number,
          payload.refund_against_payment_number,
          payload.payment?.payment_number
        ),
        selectedPaymentAmount: extractAmount(
          payload.refund_payment_amount,
          payload.payment_amount,
          payload.amount_applied,
          payload.amount_to_refund,
          payload.payment?.amount
        ),
        zohoDescription: pickFirst(
          payload.description,
          payload.memo,
          payload.narration,
          payload.notes
        ),
      },
      status: true,
    });

    return res.status(201).json({
      success: true,
      message: "Issue reported successfully",
      data: queryDoc,
    });
  } catch (error) {
    next(error);
  }
};

export const resolveBankReconQueryController = async (req, res, next) => {
  try {
    const organizationId = req.headers["x-organization-id"];
    const { queryId } = req.params;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: "Organization ID missing",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(queryId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid query ID",
      });
    }

    const updated = await BankReconQuery.findOneAndUpdate(
      {
        _id: queryId,
        organizationId,
      },
      {
        $set: {
          status: false,
          resolvedAt: new Date(),
          resolvedBy: req.user?._id || null,
        },
      },
      { returnDocument: "after" }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Bank reconciliation query not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Query resolved",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const forceVendorPaymentSyncController = async (req, res, next) => {
  try {
    const organizationId = req.headers["x-organization-id"];

    if (!organizationId) {
      return res.status(400).json({ success: false, message: "Organization ID missing" });
    }

    if (!mongoose.Types.ObjectId.isValid(organizationId)) {
      return res.status(400).json({ success: false, message: "Invalid Organization ID" });
    }

    // 1. Find Zoho connection for this org
    const connection = await ZohoConnection.findOne({
      organizationId,
      status: "connected",
    });

    if (!connection) {
      return res.status(400).json({
        success: false,
        message: "No active Zoho connection found for this organization",
      });
    }

    const zohoClient = new ZohoClient({ connection });

    // 2. Fetch ALL vendor payments from Zoho (full refresh — no cursor)
    console.log(`[FORCE SYNC] Fetching vendor payments for org ${organizationId}`);

    const { records: payments } = await zohoClient.paginate(
      "/vendorpayments",
      {},
      "vendorpayments"
    );

    console.log(`[FORCE SYNC] Fetched ${payments.length} vendor payments from Zoho`);

    // 3. Upsert into raw collection
    for (const payment of payments) {
      const isDeleted = payment.is_deleted === true;

      await RawZohoVendorPayment.findOneAndUpdate(
        { organizationId, zohoPaymentId: payment.payment_id },
        {
          organizationId,
          connectionId: connection._id,
          zohoPaymentId: payment.payment_id,
          paymentNumber: payment.payment_number,
          paymentDate: payment.date ? new Date(payment.date) : null,
          vendorId: payment.vendor_id,
          vendorName: payment.vendor_name,
          amount: payment.amount,
          status: payment.status,
          referenceNumber: payment.reference_number,
          payload: payment,
          lastModifiedTime: payment.last_modified_time
            ? new Date(payment.last_modified_time)
            : null,
          isDeleted,
          syncedAt: new Date(),
        },
        { upsert: true, returnDocument: 'after' }
      );
    }

    // 4. Advance the scheduler cursor so it stays in sync
    if (payments.length > 0) {
      const last = payments[payments.length - 1];
      if (last?.last_modified_time) {
        await SyncJob.updateOne(
          { connectionId: connection._id, jobType: "sync_vendor_payments" },
          { $set: { cursor: last.last_modified_time, lastRunAt: new Date() } }
        );
      }
    }

    // 5. Rebuild the ledger from raw data
    await rebuildVendorPaymentLedger(organizationId);

    const ledgerCount = await VendorPaymentLedger.countDocuments({ organizationId });

    console.log(`[FORCE SYNC] Ledger rebuilt — ${ledgerCount} payment(s) available`);

    return res.status(200).json({
      success: true,
      message: `Synced ${payments.length} payments from Zoho, ledger has ${ledgerCount} records`,
      fetched: payments.length,
      ledgerCount,
    });

  } catch (error) {
    console.error("[FORCE SYNC] Error:", error.message);
    next(error);
  }
};