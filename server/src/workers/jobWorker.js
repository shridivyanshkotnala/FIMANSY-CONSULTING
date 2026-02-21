import { runInvoiceSync } from "./invoiceSyncWorker.js";
import { runPaymentSync } from "./paymentSyncWorker.js";


export const runJobWorker = async (job) => {
  console.log(`[WORKER] Starting ${job.jobType} for connection ${job.connectionId}`);

  switch (job.jobType) {

    case "sync_invoices":
      await runInvoiceSync(job);
      break;

    case "sync_payments":
      await runPaymentSync(job);
      break;
      
    default:
      console.warn(`[WORKER] Unknown job type: ${job.jobType}`);
      break;
  }

  console.log(`[WORKER] Completed ${job.jobType}`);
};