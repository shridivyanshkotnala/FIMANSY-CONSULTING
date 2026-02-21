import { SyncJob } from "../models/scheduler/syncJobModel.js";
import { ZohoConnection } from "../models/zohoConnectionModel.js";
import { RawZohoInvoice } from "../models/raw/rawZohoInvoiceModel.js";
import { ZohoClient } from "../services/zohoClient.js";
import { mapZohoInvoice } from "../services/mappers/mapZohoInvoice.js";
import { toZohoTime } from "../utils/zohoTime.js";

export const runInvoiceSync = async (job) => {

  const connection = await ZohoConnection.findById(job.connectionId);
  if (!connection) throw new Error("Connection missing");

  const zoho = new ZohoClient({ connection });

  const cursorBefore = job.cursor;

  console.log(`[SYNC] Starting invoice sync from cursor ${cursorBefore}`);

  // 1️⃣ fetch all pages - here we are fetching invoices modified after last sync cursor, so we only get new/updated invoices since last run
  // const { records, lastModified } = await zoho.paginate(
  //   "/invoices",
  //   { last_modified_time: cursorBefore },
  //   "invoices"
  // );

  const isFirstSync =
    !job.cursor ||
    job.cursor === "1970-01-01T00:00:00+00:00";

  const params = isFirstSync
    ? {}
    : { last_modified_time: job.cursor };

  const { records, lastModified } = await zoho.paginate(
    "/invoices",
    params,
    "invoices"
  );

  console.log(`[SYNC] fetched ${records.length} invoices`);

  // 2️⃣ store safely
  for (const inv of records) {
    const mapped = mapZohoInvoice(inv);

    await RawZohoInvoice.updateOne(
      { connectionId: connection._id, invoiceId: mapped.invoiceId },
      { $set: { ...mapped, connectionId: connection._id } },
      { upsert: true }
    );
  }

  // 3️⃣ update cursor ONLY AFTER FULL SUCCESS
  if (lastModified) {
    await SyncJob.updateOne(
      { _id: job._id },
      { $set: { cursor: toZohoTime(lastModified) } }
    );

    console.log(`[SYNC] cursor advanced → ${lastModified}`);
  } else {
    console.log("[SYNC] no new updates");
  }
};