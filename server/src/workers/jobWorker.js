import { runInvoiceSync } from "./invoiceSyncWorker.js";
import { runPaymentSync } from "./paymentSyncWorker.js";
import { runCreditNoteSync } from "./creditSyncWorker.js";
import { runDSOMetricsWorker } from "./dsoMetricsWorker.js";
import { runBankFeedSync } from "./bankFeedSyncWorker.js";
import { runVendorPaymentSync } from "./vendorPaymentSyncWorker.js";

export const runJobWorker = async (job) => {
  console.log(`[WORKER] Starting ${job.jobType} for connection ${job.connectionId}`);

  switch (job.jobType) {

    case "sync_invoices":
      await runInvoiceSync(job);
      break;

    case "sync_payments":
      await runPaymentSync(job);
      break;

    case "sync_credits":
      await runCreditNoteSync(job);
      break;

    case "generate_dso_metrics":
      await runDSOMetricsWorker(job);
      break;

    case "sync_bank_feeds":
      await runBankFeedSync(job);
      break;

    case "sync_vendor_payments":
      await runVendorPaymentSync(job);
      break;

    default:
      console.warn(`[WORKER] Unknown job type: ${job.jobType}`);
      break;
  }

  console.log(`[WORKER] Completed ${job.jobType}`);
};