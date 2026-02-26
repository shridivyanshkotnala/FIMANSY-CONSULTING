import { RawZohoVendorPayment } from "../../models/raw/rawZohoVendorPaymentModel.js";
import { VendorPaymentLedger } from "../../models/ledger/vendorPaymentLedgerModel.js";

//
// 🧠 Normalize Zoho status → internal status
//
const normalizeStatus = (zohoStatus) => {
  if (!zohoStatus) return "pending";

  const status = zohoStatus.toLowerCase();

  if (status.includes("void") || status.includes("cancel"))
    return "cancelled";

  if (status.includes("fail"))
    return "failed";

  if (status.includes("process"))
    return "processing";

  if (status.includes("paid") || status.includes("completed"))
    return "completed";

  return "pending";
};

//
// 🧠 Extract UTR safely from payload
//
const extractUTR = (payload) => {
  return (
    payload?.bank_reference_number ||
    payload?.reference_number ||
    payload?.utr_number ||
    null
  );
};

export const rebuildVendorPaymentLedger = async (organizationId) => {
  if (!organizationId) {
    throw new Error("organizationId is required");
  }

  console.log(`[PAYMENT LEDGER] Rebuild started for ${organizationId}`);

  const rawPayments = await RawZohoVendorPayment.find({
    organizationId,
  }).lean();

  if (!rawPayments.length) {
    console.log("[PAYMENT LEDGER] No raw payments found");
    return;
  }

  const bulkOps = rawPayments.map((raw) => {
    const normalizedStatus = normalizeStatus(raw.status);
    const utrNumber = extractUTR(raw.payload);

    return {
      updateOne: {
        filter: {
          organizationId,
          zohoPaymentId: raw.zohoPaymentId,
        },
        update: {
          $set: {
            organizationId,
            zohoPaymentId: raw.zohoPaymentId,
            paymentNumber: raw.paymentNumber,
            paymentDate: raw.paymentDate,
            vendorId: raw.vendorId,
            vendorName: raw.vendorName,
            amount: raw.amount,
            status: normalizedStatus,
            utrNumber,
            isDeleted: raw.isDeleted || false,
            lastSyncedAt: new Date(),
          },
        },
        upsert: true,
      },
    };
  });

  if (bulkOps.length) {
    await VendorPaymentLedger.bulkWrite(bulkOps);
  }

  console.log(
    `[PAYMENT LEDGER] Rebuild completed (${bulkOps.length} records processed)`
  );
};