import { BankTransactionLedger } from "../../models/ledger/bankTransactionLedgerModel.js";
import { RawZohoBankTransaction } from "../../models/raw/rawZohoBankTransactionModel.js";
import { BankReconQuery } from "../../models/bankReconQueryModel.js";
import mongoose from "mongoose";

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

const matchesTransactionSearch = (t, searchText) => {
  if (!searchText) return true;

  const searchNumber = Number(String(searchText).replace(/[₹,\s]/g, ""));
  if (Number.isFinite(searchNumber) && Number(t.amount) === searchNumber) {
    return true;
  }

  const fields = [
    t.description,
    t.referenceNumber,
    t.zohoDescription,
    t.category,
    t.zohoCategory,
    t.vendor,
    t.vendorName,
    t.vendor_name,
    t.customer,
    t.customerName,
    t.customer_name,
    t.accountName,
    t.offsetAccountName,
    t.fromAccount,
    t.toAccount,
    t.expenseAccount,
    t.paymentNumber,
    t.reconciliationStatus,
    t.type,
    t.amount,
  ]
    .filter((v) => v !== null && v !== undefined)
    .map((v) => String(v).toLowerCase());

  return fields.some((value) => value.includes(searchText));
};

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

  const skip = (page - 1) * limit;
  const hasSearch = Boolean(String(search || "").trim());
  const searchText = String(search || "").trim().toLowerCase();

  // -----------------------------
  // FETCH BASE TRANSACTIONS
  // -----------------------------
  let summary = {
    totalCredits: 0,
    totalDebits: 0,
    unreconciledCount: 0,
  };
  let transactions = [];
  let totalCount = 0;

  if (hasSearch) {
    transactions = await BankTransactionLedger.find(match)
      .sort({ transactionDate: -1 })
      .lean();
  } else {
    const [summaryAgg, pagedTransactions, count] = await Promise.all([
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

    summary = summaryAgg[0] || summary;
    transactions = pagedTransactions;
    totalCount = count;
  }

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
    acceptedByClient: Boolean(t.acceptedByClient),
    hasPendingBankReconQuery: false,
    zohoTransactionId: t.zohoTransactionId || null,
  }));

  const transactionObjectIds = transformedTransactions.map((t) => t._id);

  if (transactionObjectIds.length > 0) {
    const pendingQueryRows = await BankReconQuery.find({
      organizationId: new mongoose.Types.ObjectId(organizationId),
      transactionId: { $in: transactionObjectIds },
      status: true,
    })
      .select({ transactionId: 1 })
      .lean();

    const pendingTxnIds = new Set(
      pendingQueryRows.map((q) => String(q.transactionId))
    );

    for (const t of transformedTransactions) {
      t.hasPendingBankReconQuery = pendingTxnIds.has(String(t._id));
    }
  }

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

        // Zoho sometimes sends 'customer payment' on outgoing entries.
        // For debit-side UX, show business-meaningful categories only.
        if (t.type === "debit") {
          if (normalizedTxnType === "vendor payment") {
            normalizedCategory = "Vendor Payment";
          } else if (normalizedTxnType === "vendor advance") {
            normalizedCategory = "Vendor Advance";
          } else if (normalizedTxnType === "customer payment") {
            normalizedCategory = "Vendor Advance";
          }
        }

        t.zohoCategory = normalizedCategory;

        t.expenseAccount = pickFirst(
          payload.offset_account_name,
          payload.offset_account,
          payload.expense_account_name,
          payload.expense_account,
          payload.expense_account_id,
          payload.rule_details?.offset_account_name
        );

        t.vendor = pickFirst(
          payload.vendor_name,
          payload.payee_name,
          payload.payee,
          payload.vendor,
          payload.contact_name
        );

        t.customer = pickFirst(
          payload.customer_name,
          payload.customer,
          payload.contact_name
        );

        t.accountName = pickFirst(
          payload.account_name,
          payload.bank_account_name,
          payload.to_account_name,
          payload.deposit_to_account_name,
          payload.destination_account_name
        );

        t.offsetAccountName = pickFirst(
          payload.offset_account_name,
          payload.offset_account,
          payload.from_account_name,
          payload.source_account_name,
          payload.rule_details?.offset_account_name,
          payload.rule_details?.from_account_name
        );

        t.fromAccount = pickFirst(
          payload.from_account_name,
          payload.source_account_name,
          payload.paid_through_account_name,
          payload.paid_through,
          payload.from_account,
          payload.account_name,
          payload.bank_account_name,
          payload.rule_details?.from_account_name
        );

        t.toAccount = pickFirst(
          payload.to_account_name,
          payload.destination_account_name,
          payload.deposit_to_account_name,
          payload.deposit_to,
          payload.to_account,
          payload.offset_account_name,
          payload.offset_account,
          payload.rule_details?.to_account_name,
          payload.rule_details?.offset_account_name
        );

        t.paymentNumber = pickFirst(
          payload.payment_number,
          payload.refund_payment_number,
          payload.refund_against_payment_number,
          payload.payment?.payment_number
        );

        t.selectedPaymentAmount = extractAmount(
          payload.refund_payment_amount,
          payload.payment_amount,
          payload.amount_applied,
          payload.amount_to_refund,
          payload.payment?.amount
        );

        t.zohoDescription = pickFirst(
          payload.description,
          payload.memo,
          payload.narration,
          payload.notes
        );
      }
    }
  } catch (err) {
    // non-fatal enrichment error
    console.warn("Failed to enrich bank transactions with raw Zoho payloads", err);
  }

  if (hasSearch) {
    const filteredTransactions = transformedTransactions.filter((t) =>
      matchesTransactionSearch(t, searchText)
    );

    totalCount = filteredTransactions.length;
    transformedTransactions = filteredTransactions.slice(skip, skip + limit);

    summary = filteredTransactions.reduce(
      (acc, t) => {
        if (t.type === "credit") acc.totalCredits += Number(t.amount || 0);
        if (t.type === "debit") acc.totalDebits += Number(t.amount || 0);
        if (t.reconciliationStatus === "unreconciled") acc.unreconciledCount += 1;
        return acc;
      },
      {
        totalCredits: 0,
        totalDebits: 0,
        unreconciledCount: 0,
      }
    );
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