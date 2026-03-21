import { RawZohoBankAccount } from "../models/raw/rawZohoBankAccountModel.js";
import { RawZohoBankTransaction } from "../models/raw/rawZohoBankTransactionModel.js";
import { BankTransactionLedger } from "../models/ledger/bankTransactionLedgerModel.js";
import { ZohoConnection } from "../models/zohoConnectionModel.js";
import { ZohoClient } from "../services/zohoClient.js";
import { SyncJob } from "../models/scheduler/syncJobModel.js";
import { rebuildBankLedger, rebuildBankLedgerIncremental } from "../services/banking/rebuildBankLedger.js";

const EPOCH_CURSOR = "1970-01-01T00:00:00+00:00";

const isValidDate = (value) => {
  const d = new Date(value);
  return !Number.isNaN(d.getTime());
};

const isCursorInFuture = (value) => {
  if (!isValidDate(value)) return false;
  const cursorTs = new Date(value).getTime();
  const nowTs = Date.now();
  // 5 minute tolerance for clock skew
  return cursorTs > nowTs + 5 * 60 * 1000;
};

const normalizeTransactionType = (txn = {}) => {
  const ZOHO_INFLOW_TYPES = new Set([
    "credit",
    "deposit",
    "refund",
    "interest",
    "interest_income",
    "other_income",
    "credit_card_refund",
    "owner_contribution",
    "owners_contribution",
    "revenue_adjustment",
    "opening_balance",
    "customer_payment",
    "customer payment",
  ]);

  const ZOHO_OUTFLOW_TYPES = new Set([
    "debit",
    "expense",
    "vendor_payment",
    "vendor payment",
    "vendor_advance",
    "vendor advance",
    "card_payment",
    "card payment",
    "bank_charges",
    "bank charges",
    "owner_drawings",
    "owner drawings",
    "tax_payment",
    "tax payment",
    "cash_withdrawal",
    "cash withdrawal",
  ]);

  const rawCandidates = [
    txn.transaction_type,
    txn.type,
    txn.transactionType,
    txn.transaction_type_formatted,
    txn.transaction_category,
    txn.entry_type,
  ]
    .map((v) => String(v || "").toLowerCase().trim())
    .filter(Boolean);

  const semanticInflow = rawCandidates.some((v) => ZOHO_INFLOW_TYPES.has(v));
  const semanticOutflow = rawCandidates.some((v) => ZOHO_OUTFLOW_TYPES.has(v));

  if (semanticInflow && !semanticOutflow) return "credit";
  if (semanticOutflow && !semanticInflow) return "debit";

  // Zoho's debit_or_credit / transaction_type values are accounting-side direction.
  // For cashflow UX we invert them to business inflow(outflow):
  // Zoho debit => money in (credit), Zoho credit => money out (debit).
  const debitOrCredit = String(txn.debit_or_credit || "").toLowerCase().trim();
  if (debitOrCredit === "credit" || debitOrCredit === "cr") return "debit";
  if (debitOrCredit === "debit" || debitOrCredit === "dr") return "credit";

  if (rawCandidates.some((v) => v === "credit" || v === "cr")) return "debit";
  if (rawCandidates.some((v) => v === "debit" || v === "dr")) return "credit";

  const debitAmount = Number(txn.debit_amount);
  const creditAmount = Number(txn.credit_amount);
  if (Number.isFinite(debitAmount) && debitAmount > 0 && (!Number.isFinite(creditAmount) || creditAmount === 0)) {
    return "debit";
  }
  if (Number.isFinite(creditAmount) && creditAmount > 0 && (!Number.isFinite(debitAmount) || debitAmount === 0)) {
    return "credit";
  }

  const amount = Number(txn.amount);
  if (Number.isFinite(amount) && amount < 0) return "debit";

  return "debit";
};

export const runBankFeedSync = async (job) => {
  console.log(`[BANK SYNC] Starting for connection ${job.connectionId}`);

  const connection = await ZohoConnection.findById(job.connectionId);
  if (!connection) throw new Error("Zoho connection not found");

  const organizationId = connection.organizationId;
  const zohoClient = new ZohoClient({ connection });

  // ----------------------------
  // SAFE META INITIALIZATION
  // ----------------------------
  const jobMeta = job.meta || {};

  const lastBankAccountSync =
    jobMeta.lastBankAccountSync ||
    EPOCH_CURSOR;

  const lastTransactionSync =
    jobMeta.lastTransactionSync || {};

  const touchedTransactionIds = new Set();
  let totalFetchedTransactions = 0;

  // ---------------------------------------
  // STEP 1: FETCH BANK ACCOUNTS (INCREMENTAL)
  // ---------------------------------------

  const {
    records: accountDelta,
    lastModified: accountLastModified,
  } = await zohoClient.paginate(
    "/bankaccounts",
    lastBankAccountSync
      ? { last_modified_time: lastBankAccountSync }
      : {},
    "bankaccounts"
  );

  if (!accountDelta.length) {
    console.log("[BANK SYNC] No updated accounts");
  }

  // UPSERT UPDATED ACCOUNTS
  for (const account of accountDelta) {
    const isDeleted = account.is_deleted === true;

    await RawZohoBankAccount.findOneAndUpdate(
      {
        organizationId,
        zohoBankAccountId: account.account_id,
      },
      {
        organizationId,
        connectionId: connection._id,
        zohoBankAccountId: account.account_id,
        accountName: account.account_name,
        accountType: account.account_type,
        currencyCode: account.currency_code,
        payload: account,
        lastModifiedTime: account.last_modified_time
          ? new Date(account.last_modified_time)
          : null,
        isDeleted,
        syncedAt: new Date(),
      },
      { upsert: true }
    );
  }

  // ---------------------------------------
  // STEP 2: FETCH ALL ACTIVE ACCOUNTS
  // (IMPORTANT: even if no delta)
  // ---------------------------------------

  const activeAccounts = await RawZohoBankAccount.find({
    organizationId,
    isDeleted: false,
  });

  for (const account of activeAccounts) {
    const accountId = account.zohoBankAccountId;

    const txnCursor =
      lastTransactionSync[accountId] ||
      EPOCH_CURSOR;

    const existingRawCount = await RawZohoBankTransaction.countDocuments({
      organizationId,
      zohoBankAccountId: accountId,
      isDeleted: false,
    });

    const shouldBootstrap = existingRawCount === 0;

    let effectiveCursor = txnCursor;
    if (isCursorInFuture(effectiveCursor)) {
      console.warn(`[BANK SYNC] Future cursor detected for ${accountId}: ${effectiveCursor}. Resetting to epoch.`);
      effectiveCursor = EPOCH_CURSOR;
    }

    let queryParams =
      shouldBootstrap || !effectiveCursor || effectiveCursor === EPOCH_CURSOR
        ? {}
        : { last_modified_time: effectiveCursor };

    let {
      records: transactions,
      lastModified: txnLastModified,
    } = await zohoClient.paginate(
      `/bankaccounts/${accountId}/transactions`,
      queryParams,
      "banktransactions"
    );

    // Fallback: if cursor-based call returned nothing but account also has no local raw,
    // force one full fetch to recover from stale/invalid cursors.
    if (!transactions.length && !shouldBootstrap && effectiveCursor !== EPOCH_CURSOR) {
      const hasAnyLocalRaw = await RawZohoBankTransaction.exists({
        organizationId,
        zohoBankAccountId: accountId,
      });

      if (!hasAnyLocalRaw) {
        console.warn(`[BANK SYNC] Empty incremental result and no local raw txns for ${accountId}. Retrying full fetch.`);
        const retry = await zohoClient.paginate(
          `/bankaccounts/${accountId}/transactions`,
          {},
          "banktransactions"
        );

        transactions = retry.records;
        txnLastModified = retry.lastModified;
        queryParams = {};
      }
    }

    totalFetchedTransactions += transactions.length;

    for (const txn of transactions) {
      const isDeleted = txn.is_deleted === true;

      const normalizedType = normalizeTransactionType(txn);

      // Debug — remove once confirmed correct in production
      console.log(
        `[BANK SYNC] txn ${txn.transaction_id} raw_type="${String(txn.transaction_type ?? txn.debit_or_credit ?? txn.type ?? "").toLowerCase()}" → normalizedType="${normalizedType}"`
      );

      await RawZohoBankTransaction.findOneAndUpdate(
        {
          organizationId,
          zohoTransactionId: txn.transaction_id,
        },
        {
          organizationId,
          connectionId: connection._id,
          zohoTransactionId: txn.transaction_id,
          zohoBankAccountId: accountId,
          transactionDate: txn.date
            ? new Date(txn.date)
            : null,
          amount: txn.amount,
          type: normalizedType,
          description:
            txn.description ||
            txn.payee_name ||
            txn.memo ||
            txn.narration ||
            txn.notes ||
            null,
          referenceNumber: txn.reference_number,
          payload: txn,
          lastModifiedTime: txn.last_modified_time
            ? new Date(txn.last_modified_time)
            : null,
          isDeleted,
          syncedAt: new Date(),
        },
        { upsert: true }
      );

      touchedTransactionIds.add(txn.transaction_id);
    }

    if (txnLastModified) {
      lastTransactionSync[accountId] = txnLastModified;
    } else if (shouldBootstrap && transactions.length === 0) {
      // Explicitly keep epoch for accounts with zero transactions so future runs can still bootstrap.
      lastTransactionSync[accountId] = EPOCH_CURSOR;
    }
  }

  if (totalFetchedTransactions === 0) {
    console.log(`[BANK SYNC] No transactions returned from Zoho across all active bank accounts for org ${organizationId}`);
  } else {
    console.log(`[BANK SYNC] Fetched ${totalFetchedTransactions} transaction row(s) across ${activeAccounts.length} active account(s)`);
  }

  // ---------------------------------------
  // STEP 3: SAVE CURSORS SAFELY
  // ---------------------------------------

  await SyncJob.updateOne(
    { _id: job._id },
    {
      $set: {
        meta: {
          lastBankAccountSync:
            accountLastModified || lastBankAccountSync,
          lastTransactionSync,
        },
      },
    }
  );

  // ---------------------------------------
  // STEP 4: REBUILD BANK LEDGER
  // ---------------------------------------

  try {
    const touchedIdsArray = [...touchedTransactionIds];

    if (touchedIdsArray.length > 0) {
      await rebuildBankLedgerIncremental(organizationId, touchedIdsArray);
      console.log(
        `[BANK SYNC] Bank ledger incrementally rebuilt for org ${organizationId} (${touchedIdsArray.length} txns)`
      );
    } else {
      // Recovery path: if local ledger is empty but raw has records, backfill full ledger.
      const [rawCount, ledgerCount] = await Promise.all([
        RawZohoBankTransaction.countDocuments({ organizationId, isDeleted: false }),
        BankTransactionLedger.countDocuments({ organizationId, isDeleted: false }),
      ]);

      if (rawCount > 0 && ledgerCount === 0) {
        console.warn(`[BANK SYNC] Ledger empty while raw has ${rawCount} rows. Running full rebuild.`);
        await rebuildBankLedger(organizationId);
      } else {
        console.log(`[BANK SYNC] Ledger rebuild skipped (no changed txns) for org ${organizationId}`);
      }
    }
  } catch (err) {
    console.error(`[BANK SYNC] Failed to rebuild bank ledger`, err);
  }

  console.log(
    `[BANK SYNC] Completed successfully for org ${organizationId}`
  );
};