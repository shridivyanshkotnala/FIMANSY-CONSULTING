import { SyncJob } from "../models/scheduler/syncJobModel.js";
import { ZohoConnection } from "../models/zohoConnectionModel.js";
import { RawZohoPayment } from "../models/raw/rawZohoPaymentModel.js";
import { ZohoClient } from "../services/zohoClient.js";
import { mapZohoPayment } from "../services/mappers/mapZohoPayment.js";
import { rebuildReceivableLedgerForOrg } from "../services/ledger/receivableLedgerBuilder.js";
import { rebuildARLedger } from "../services/ledger/rebuildArLedger.js";

export const runPaymentSync = async (job) => {

  //common code for all sync workers - we fetch connection, create zoho Client, fetch updated records since last cursor, store safely, then advance cursor only after full success

  const connection = await ZohoConnection.findById(job.connectionId);
  if (!connection) throw new Error("Connection missing");

  const zoho = new ZohoClient({ connection });

  const cursorBefore = job.cursor;

  console.log(`[SYNC] Starting payment sync from cursor ${cursorBefore}`);

  // fetch all updated payments
  // const { records, lastModified } = await zoho.paginate(
  //   "/customerpayments",
  //   { last_modified_time: cursorBefore },
  //   "customerpayments"
  // );

  const isFirstSync =
    !job.cursor ||
    job.cursor === "1970-01-01T00:00:00+00:00";

  const params = isFirstSync
    ? {}
    : { last_modified_time: job.cursor };

  const { records, lastModified } = await zoho.paginate(
    "/customerpayments",
    params,
    "customerpayments"
  );

  console.log(`[SYNC] fetched ${records.length} payments`);

  // store safely
  for (const pay of records) {
    const mapped = mapZohoPayment(pay);

    await RawZohoPayment.updateOne(
      { connectionId: connection._id, paymentId: mapped.paymentId },
      { $set: { ...mapped, connectionId: connection._id } },
      { upsert: true }
    );
  }

  // advance cursor only after full success
  if (lastModified) {
    // Store the raw timestamp from Zoho — no conversion needed; Zoho's own format
    // is always valid to pass back on the next incremental sync.
    await SyncJob.updateOne(
      { _id: job._id },
      { $set: { cursor: lastModified } }
    );

    console.log(`[SYNC] payment cursor advanced → ${lastModified}`);
  } else {
    console.log("[SYNC] no new payment updates");
  }

  // payments affect balances — rebuild receivable ledger for this org
  try {
    await rebuildReceivableLedgerForOrg(connection.organizationId);
    console.log('[SYNC] receivable ledger rebuilt after payments');
  } catch (err) {
    console.error('[SYNC] failed to rebuild receivable ledger after payments', err);
  }

  try {
    await rebuildARLedger(connection.organizationId, connection._id);
    console.log('[SYNC] AR ledger rebuilt after payments');
  } catch (err) {
    console.error('[SYNC] failed to rebuild AR ledger after payments', err);
  }
};