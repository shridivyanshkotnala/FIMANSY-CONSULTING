import { VendorPaymentLedger } from "../../models/ledger/vendorPaymentLedgerModel.js";

export const getPaymentTimeline = async ({
  organizationId,
  status = null,
  search = null,
  startDate = null,
  endDate = null,
  page = 1,
  limit = 20,
}) => {

  if (!organizationId) {
    throw new Error("organizationId is required");
  }

  const match = {
    organizationId,
    isDeleted: false,
  };

  // ---------------------------
  // Status Filter
  // ---------------------------
  if (status && status !== "all") {
    match.status = status;
  }

  // ---------------------------
  // Date Range Filter
  // ---------------------------
  if (startDate || endDate) {
    match.paymentDate = {};
    if (startDate) match.paymentDate.$gte = new Date(startDate);
    if (endDate) match.paymentDate.$lte = new Date(endDate);
  }

  // ---------------------------
  // Search Filter
  // ---------------------------
  if (search) {
    match.$or = [
      { paymentNumber: { $regex: search, $options: "i" } },
      { vendorName: { $regex: search, $options: "i" } },
      { utrNumber: { $regex: search, $options: "i" } },
    ];
  }

  const skip = (page - 1) * limit;

  const [payments, totalCount] = await Promise.all([

    VendorPaymentLedger.find(match)
      .sort({ paymentDate: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),

    VendorPaymentLedger.countDocuments(match),

  ]);

  return {
    payments,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
    },
  };
};