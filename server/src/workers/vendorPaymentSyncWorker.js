import { RawZohoVendorPayment } from "../models/raw/rawZohoVendorPaymentModel.js";
import { ZohoConnection } from "../models/zohoConnectionModel.js";
import { ZohoClient } from "../services/zohoClient.js";
import { SyncJob } from "../models/scheduler/syncJobModel.js";
import { rebuildVendorPaymentLedger } from "../services/ledger/rebuildVendorPaymentLedger.js";

export const runVendorPaymentSync = async (job) => {
  console.log(`[PAYMENT SYNC] Starting for connection ${job.connectionId}`);

  const connection = await ZohoConnection.findById(job.connectionId);
  if (!connection) {
    throw new Error("Zoho connection not found");
  }

  const organizationId = connection.organizationId;
  const zohoClient = new ZohoClient({ connection });

  const rawCursor = job.cursor || null;

  // Reject null, epoch, or invalid dates — force full fetch
  const EPOCH = "1970-01-01";
  const isValidCursor =
    rawCursor &&
    !rawCursor.startsWith(EPOCH) &&
    !isNaN(Date.parse(rawCursor));

  const cursor = isValidCursor ? rawCursor : null;

  let latestCursor = cursor;

  try {
    // ---------------------------------------
    // STEP 1: FETCH VENDOR PAYMENTS (Incremental)
    // ---------------------------------------

    const params = cursor ? { last_modified_time: cursor } : {};

    const {
      records: payments,
      lastModified,
    } = await zohoClient.paginate(
      "/vendorpayments",
      params,
      "vendorpayments"
    );

    if (!payments.length) {
      console.log("[PAYMENT SYNC] No updated vendor payments");
    }

    // ---------------------------------------
    // STEP 2: UPSERT RAW PAYMENTS
    // ---------------------------------------

    for (const payment of payments) {
      const isDeleted = payment.is_deleted === true;

      await RawZohoVendorPayment.findOneAndUpdate(
        {
          organizationId,
          zohoPaymentId: payment.payment_id,
        },
        {
          organizationId,
          connectionId: connection._id,
          zohoPaymentId: payment.payment_id,
          paymentNumber: payment.payment_number,
          paymentDate: payment.date
            ? new Date(payment.date)
            : null,
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
        { upsert: true }
      );
    }

    // ---------------------------------------
    // STEP 3: UPDATE CURSOR SAFELY
    // ---------------------------------------

    if (lastModified) {
      latestCursor = lastModified;
    }

    await SyncJob.updateOne(
      { _id: job._id },
      {
        $set: {
          cursor: latestCursor,
          lastRunAt: new Date(),
          status: "idle",
          lastError: null,
        },
      }
    );

    // Rebuild vendor payment ledger so the UI can query it
    try {
      await rebuildVendorPaymentLedger(organizationId);
      console.log("[PAYMENT SYNC] Vendor payment ledger rebuilt successfully");
    } catch (ledgerErr) {
      console.error("[PAYMENT SYNC] Failed to rebuild vendor payment ledger:", ledgerErr.message);
    }

    console.log(
      `[PAYMENT SYNC] Completed successfully for org ${organizationId}`
    );

  } catch (error) {
    console.error("[PAYMENT SYNC] Failed:", error.message);

    // ❗ DO NOT overwrite cursor on failure
    await SyncJob.updateOne(
      { _id: job._id },
      {
        $set: {
          status: "failed",
          lastError: error.message,
        },
        $inc: { retryCount: 1 },
      }
    );

    throw error;
  }
};