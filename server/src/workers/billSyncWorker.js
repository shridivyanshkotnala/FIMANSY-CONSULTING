import { SyncJob } from "../models/scheduler/syncJobModel.js";
import { ZohoConnection } from "../models/zohoConnectionModel.js";
import { RawZohoBill } from "../models/raw/rawZohoBillModel.js";
import { ZohoClient } from "../services/zohoClient.js";
import { mapZohoBill } from "../services/mappers/mapZohoBill.js";
import { rebuildPayableLedgerForOrg } from "../services/ledger/payableLedgerBuilder.js";

export const runBillSync = async (job) => {

  const connection = await ZohoConnection.findById(job.connectionId);
  if (!connection) throw new Error("Connection missing");

  const zoho = new ZohoClient({ connection });

  const params = job.cursor
    ? { last_modified_time: job.cursor }
    : {};

  const { records, lastModified } = await zoho.paginate(
    "/bills",
    params,
    "bills"
  );

  for (const bill of records) {
    const mapped = mapZohoBill(bill);

    await RawZohoBill.updateOne(
      { connectionId: connection._id, billId: mapped.billId },
      { $set: { ...mapped, connectionId: connection._id } },
      { upsert: true }
    );
  }

  if (lastModified) {
    await SyncJob.updateOne(
      { _id: job._id },
      { $set: { cursor: lastModified } }
    );
  }

  await rebuildPayableLedgerForOrg(connection.organizationId);
};