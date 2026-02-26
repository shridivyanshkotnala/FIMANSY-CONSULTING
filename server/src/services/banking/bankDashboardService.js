import { BankTransactionLedger } from "../../models/ledger/bankTransactionLedgerModel.js";
import { RawZohoBankTransaction } from "../../models/raw/rawZohoBankTransactionModel.js";
import mongoose from "mongoose";

/**
 * Get Banking Dashboard Summary + Transactions
 *
 * Supports:
 * - organization filter (required)
 * - bankAccountId filter (optional)
 * - date range filter (optional)
 * - reconciliation status filter (optional)
 * - search (optional)
 * - pagination
 */

export const getBankDashboard = async ({
  organizationId,
  bankAccountId = null,
  startDate = null,
  endDate = null,
  reconciliationStatus = null,
  search = null,
  page = 1,
  limit = 20,
}) => {

  if (!organizationId) {
    throw new Error("organizationId is required");
  }

  if (!mongoose.Types.ObjectId.isValid(organizationId)) {
    throw new Error("Invalid organizationId");
  }

  const match = {
    organizationId: new mongoose.Types.ObjectId(organizationId),
    isDeleted: false,
  };

  // -----------------------------
  // OPTIONAL FILTERS
  // -----------------------------

  if (bankAccountId) {
    match.zohoBankAccountId = bankAccountId;
  }

  if (reconciliationStatus) {
    match.reconciliationStatus = reconciliationStatus;
  }

  if (startDate || endDate) {
    match.transactionDate = {};
    if (startDate) match.transactionDate.$gte = new Date(startDate);
    if (endDate) match.transactionDate.$lte = new Date(endDate);
  }

  if (search) {
    match.description = { $regex: search, $options: "i" };
  }

  const skip = (page - 1) * limit;

  // -----------------------------
  // PARALLEL EXECUTION
  // -----------------------------

  const [summaryAgg, transactions, totalCount] = await Promise.all([

    BankTransactionLedger.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalCredits: {
            $sum: {
              $cond: [{ $eq: ["$type", "credit"] }, "$amount", 0]
            }
          },
          totalDebits: {
            $sum: {
              $cond: [{ $eq: ["$type", "debit"] }, "$amount", 0]
            }
          },
          unreconciledCount: {
            $sum: {
              $cond: [
                { $eq: ["$reconciliationStatus", "unreconciled"] },
                1,
                0
              ]
            }
          },
        }
      }
    ]),

    BankTransactionLedger.find(match)
      .sort({ transactionDate: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),

    BankTransactionLedger.countDocuments(match),
  ]);

  const summary = summaryAgg[0] || {
    totalCredits: 0,
    totalDebits: 0,
    unreconciledCount: 0,
  };

  // -----------------------------
  // UI-FRIENDLY TRANSFORMATION
  // -----------------------------

  const transformedTransactions = transactions.map((t) => ({
    _id: t._id,
    transactionDate: t.transactionDate,
    description: t.description,
    referenceNumber: t.referenceNumber,
    amount: t.amount,
    type: t.type,
    reconciliationStatus: t.reconciliationStatus,
    category: t.category || null,
    zohoTransactionId: t.zohoTransactionId || null,
  }));

  // Enrich with raw Zoho payload fields when available (expense account, vendor, customer, original description)
  try {
    const zohoIds = transformedTransactions
      .map((x) => x.zohoTransactionId)
      .filter(Boolean);

    if (zohoIds.length > 0) {
      const raws = await RawZohoBankTransaction.find({
        organizationId: new mongoose.Types.ObjectId(organizationId),
        zohoTransactionId: { $in: zohoIds },
      }).lean();

      const rawMap = new Map(raws.map((r) => [r.zohoTransactionId, r.payload || {}]));

      for (const t of transformedTransactions) {
        const payload = rawMap.get(t.zohoTransactionId) || {};

        t.expenseAccount =
          payload.expense_account_name ||
          payload.expense_account ||
          payload.account_name ||
          payload.account ||
          null;

        t.vendor = payload.vendor_name || payload.payee_name || payload.vendor || null;
        t.customer = payload.customer_name || payload.customer || null;
        t.zohoDescription = payload.description || payload.memo || payload.narration || null;
      }
    }
  } catch (err) {
    // non-fatal enrichment error
    console.warn("Failed to enrich bank transactions with raw Zoho payloads", err);
  }

  return {
    summary: {
      totalCredits: summary.totalCredits,
      totalDebits: summary.totalDebits,
      unreconciledCount: summary.unreconciledCount,
      netFlow: summary.totalCredits - summary.totalDebits,
    },

    transactions: transformedTransactions,

    pagination: {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
    }
  };
};