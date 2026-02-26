// import { RawZohoBankTransaction } from "../../models/raw/rawZohoBankTransactionModel.js";
// import { BankTransactionLedger } from "../../models/ledger/bankTransactionLedgerModel.js";

// export const rebuildBankLedger = async (organizationId) => {
//   console.log(`[BANK LEDGER] Rebuild started for ${organizationId}`);

//   // Fetch all raw transactions (including deleted)
//   const rawTransactions = await RawZohoBankTransaction.find({
//     organizationId,
//   });

//   for (const raw of rawTransactions) {
//     const txn = raw.payload;

//     const existingLedger = await BankTransactionLedger.findOne({
//       organizationId,
//       zohoTransactionId: raw.zohoTransactionId,
//     });

//     // ---------------------------------------
//     // BASE NORMALIZED FIELDS
//     // ---------------------------------------

//     const normalized = {
//       organizationId,
//       zohoTransactionId: raw.zohoTransactionId,
//       zohoBankAccountId: raw.zohoBankAccountId,
//       transactionDate: raw.transactionDate,
//       amount: raw.amount,
//       type: raw.type,
//       description: raw.description,
//       referenceNumber: raw.referenceNumber,
//       isDeleted: raw.isDeleted || false,
//       lastSyncedAt: new Date(),
//     };

//     // ---------------------------------------
//     // PRESERVE RECONCILIATION STATE
//     // ---------------------------------------

//     if (existingLedger) {
//       await BankTransactionLedger.updateOne(
//         { _id: existingLedger._id },
//         {
//           $set: {
//             ...normalized,
//             reconciliationStatus: existingLedger.reconciliationStatus,
//             matchedEntityType: existingLedger.matchedEntityType,
//             matchedEntityId: existingLedger.matchedEntityId,
//           },
//         }
//       );
//     } else {
//       await BankTransactionLedger.create({
//         ...normalized,
//         reconciliationStatus: "unreconciled",
//         matchedEntityType: null,
//         matchedEntityId: null,
//       });
//     }
//   }

//   console.log(`[BANK LEDGER] Rebuild completed`);
// };



import { RawZohoBankTransaction } from "../../models/raw/rawZohoBankTransactionModel.js";
import { BankTransactionLedger } from "../../models/ledger/bankTransactionLedgerModel.js";

export const rebuildBankLedger = async (organizationId) => {
  console.log(`[BANK LEDGER] Rebuild started for ${organizationId}`);

  const rawTransactions = await RawZohoBankTransaction.find({
    organizationId,
  });

  for (const raw of rawTransactions) {
    // Skip records without a date — BankTransactionLedger requires transactionDate
    if (!raw.transactionDate) {
      console.warn(`[BANK LEDGER] Skipping txn ${raw.zohoTransactionId} — missing transactionDate`);
      continue;
    }

    const txn = raw.payload || {};

    // ---------------------------------------
    // 1️⃣ BASE NORMALIZATION
    // ---------------------------------------

    const normalized = {
      organizationId,
      zohoTransactionId: raw.zohoTransactionId,
      zohoBankAccountId: raw.zohoBankAccountId,
      transactionDate: raw.transactionDate,
      amount: raw.amount,
      type: raw.type,
      description:
        raw.description ||
        txn.payee_name ||
        txn.memo ||
        txn.narration ||
        txn.notes ||
        null,
      referenceNumber: raw.referenceNumber,
      isDeleted: raw.isDeleted || false,
      lastSyncedAt: new Date(),
    };

    // ---------------------------------------
    // 2️⃣ DETERMINE RECONCILIATION FROM ZOHO
    // ---------------------------------------

    let reconciliationStatus = "unreconciled";
    let matchedEntityType = null;
    let matchedEntityId = null;

    const isReconciled =
      txn.is_reconciled === true ||
      txn.reconciled === true ||
      (Array.isArray(txn.matched_transactions) &&
        txn.matched_transactions.length > 0);

    if (isReconciled) {
      reconciliationStatus = "matched";

      // If Zoho gives structured matched transactions
      if (Array.isArray(txn.matched_transactions) && txn.matched_transactions.length > 0) {
        const firstMatch = txn.matched_transactions[0];

        if (firstMatch.invoice_id) {
          matchedEntityType = "invoice";
          matchedEntityId = firstMatch.invoice_id;
        } else if (firstMatch.bill_id) {
          matchedEntityType = "bill";
          matchedEntityId = firstMatch.bill_id;
        } else {
          matchedEntityType = "manual";
        }
      }

      // Fallback direct mapping
      if (txn.invoice_id) {
        matchedEntityType = "invoice";
        matchedEntityId = txn.invoice_id;
      }

      if (txn.bill_id) {
        matchedEntityType = "bill";
        matchedEntityId = txn.bill_id;
      }
    }

    // ---------------------------------------
    // 3️⃣ UPSERT LEDGER (ZOHO OVERRIDES LOCAL)
    // ---------------------------------------

    await BankTransactionLedger.findOneAndUpdate(
      {
        organizationId,
        zohoTransactionId: raw.zohoTransactionId,
      },
      {
        ...normalized,
        reconciliationStatus,
        matchedEntityType,
        matchedEntityId,
      },
      { upsert: true }
    );
  }

  console.log(`[BANK LEDGER] Rebuild completed`);
};