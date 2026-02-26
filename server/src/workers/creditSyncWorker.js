import { SyncJob } from "../models/scheduler/syncJobModel.js";
import { RawZohoCredit } from "../models/raw/rawZohoCreditModel.js";
import { ZohoConnection } from "../models/zohoConnectionModel.js";
import { fetchCreditNotesFromZoho } from "../services/zohoCreditService.js";
import { rebuildARLedger } from "../services/ledger/rebuildArLedger.js";

export const runCreditNoteSync = async (job) => {

  const connection = await ZohoConnection.findById(job.connectionId);
  if (!connection) throw new Error("Connection not found");

  const isFirstSync =
    !job.cursor ||
    job.cursor === "1970-01-01T00:00:00+00:00";

  const lastCursor = isFirstSync ? null : job.cursor;

  console.log(`[CREDIT SYNC] Starting with cursor: ${lastCursor}`);

  const { records, lastModified } = await fetchCreditNotesFromZoho({
    connection,
    lastModifiedTime: lastCursor
  });

  console.log(`[CREDIT SYNC] Fetched ${records.length} records`);

  for (const credit of records) {
    await RawZohoCredit.updateOne(
      {
        connectionId: connection._id,
        zohoCreditNoteId: credit.creditnote_id
      },
      {
        $set: {
          payload: credit,
          lastModifiedTime: credit.last_modified_time,
          fetchedAt: new Date(),
        }
      },
      { upsert: true }
    );
  }

  // advance cursor on SyncJob only after full success (same pattern as invoices/payments)
  if (lastModified) {
    await SyncJob.updateOne(
      { _id: job._id },
      { $set: { cursor: lastModified } }
    );
    console.log(`[CREDIT SYNC] cursor advanced → ${lastModified}`);
  } else {
    console.log("[CREDIT SYNC] no new updates");
  }

  try {
    await rebuildARLedger(connection.organizationId, connection._id);
    console.log('[CREDIT SYNC] AR ledger rebuilt after credits');
  } catch (err) {
    console.error('[CREDIT SYNC] failed to rebuild AR ledger after credits', err);
  }

  console.log(`[CREDIT SYNC] Completed`);
};