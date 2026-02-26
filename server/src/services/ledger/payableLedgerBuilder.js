import { RawZohoBill } from "../../models/raw/rawZohoBillModel.js";
import { PayableLedger } from "../../models/ledger/payableLedgerModel.js";

export const rebuildPayableLedgerForOrg = async (organizationId) => {

  const bills = await RawZohoBill.find({}).lean();

  for (const bill of bills) {

    let normalizedStatus = "open";

    if (bill.status === "paid") normalizedStatus = "paid";
    else if (bill.status === "partially_paid")
      normalizedStatus = "partially_paid";

    await PayableLedger.updateOne(
      { organizationId, billId: bill.billId },
      {
        $set: {
          organizationId,
          billId: bill.billId,
          billNumber: bill.billNumber,
          vendorId: bill.vendorId,
          vendorName: bill.vendorName,
          billDate: bill.date,
          dueDate: bill.dueDate,
          totalAmount: bill.total,
          balanceAmount: bill.balance,
          status: normalizedStatus,
        },
      },
      { upsert: true }
    );
  }
};