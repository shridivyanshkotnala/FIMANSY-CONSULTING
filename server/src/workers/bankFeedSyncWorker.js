import { RawZohoBankAccount } from "../models/raw/rawZohoBankAccountModel.js";
import { RawZohoBankTransaction } from "../models/raw/rawZohoBankTransactionModel.js";
import { ZohoConnection } from "../models/zohoConnectionModel.js";
import { ZohoClient } from "../services/zohoClient.js";
import { SyncJob } from "../models/scheduler/syncJobModel.js";
import { rebuildBankLedger } from "../services/banking/rebuildBankLedger.js";

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
    "1970-01-01T00:00:00+00:00";

  const lastTransactionSync =
    jobMeta.lastTransactionSync || {};

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
      "1970-01-01T00:00:00+00:00";

    const {
      records: transactions,
      lastModified: txnLastModified,
    } = await zohoClient.paginate(
      `/bankaccounts/${accountId}/transactions`,
      txnCursor
        ? { last_modified_time: txnCursor }
        : {},
      "banktransactions"
    );

    if (!transactions.length) {
      console.log(
        `[BANK SYNC] No new transactions for ${accountId}`
      );
    }

    // Zoho uses semantic type names — these are the known credit-side types
    const ZOHO_CREDIT_TYPES = new Set([
      "credit",
      "deposit",
      "refund",
      "interest",
      "other_income",
      "credit_card_refund",
      "owner_contribution",
      "revenue_adjustment",
      "opening_balance",
      "transfer_fund",   // can be either; treat as credit (money arriving)
    ]);

    for (const txn of transactions) {
      const isDeleted = txn.is_deleted === true;

      // Resolve whichever key Zoho uses and normalise to "credit" | "debit"
      const txnTypeRaw = String(
        txn.transaction_type ?? txn.type ?? txn.transactionType ?? ""
      ).toLowerCase().trim();

      const normalizedType = ZOHO_CREDIT_TYPES.has(txnTypeRaw) ? "credit" : "debit";

      // Debug — remove once confirmed correct in production
      console.log(
        `[BANK SYNC] txn ${txn.transaction_id} raw_type="${txnTypeRaw}" → normalizedType="${normalizedType}"`
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
    }

    if (txnLastModified) {
      lastTransactionSync[accountId] = txnLastModified;
    }
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
    await rebuildBankLedger(organizationId);
    console.log(`[BANK SYNC] Bank ledger rebuilt for org ${organizationId}`);
  } catch (err) {
    console.error(`[BANK SYNC] Failed to rebuild bank ledger`, err);
  }

  console.log(
    `[BANK SYNC] Completed successfully for org ${organizationId}`
  );
};