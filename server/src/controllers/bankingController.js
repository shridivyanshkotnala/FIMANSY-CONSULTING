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
import { ZohoClient } from "../services/zohoClient.js";
import { VendorPaymentLedger } from "../models/ledger/vendorPaymentLedgerModel.js";

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
      { new: true }
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
        { upsert: true, new: true }
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